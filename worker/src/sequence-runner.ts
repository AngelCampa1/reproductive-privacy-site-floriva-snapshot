import { buildLeadMagnetSequenceEmail } from "../../functions/_lib/lead-magnet-email";
import {
  claimSequenceJob,
  countLeadNurtureSends,
  getSequenceJobLead,
  markSequenceJobCancelled,
  markSequenceJobFailed,
  markSequenceJobSent,
  recordLeadMagnetEvent,
  requeueStaleSequenceJobs,
  rescheduleSequenceJob,
  selectDueSequenceJobs,
  type SequenceJobRow,
} from "../../functions/_lib/lead-magnet-store";
import {
  getLeadMagnetResource,
  getLeadMagnetSequenceEmail,
  type LeadMagnetSequenceStep,
  NURTURE_EMAIL_CAP_PER_LEAD,
} from "../../src/site/lead-magnets";
import type { SendResult } from "./send-email";

export type SequenceEmailSender = (message: {
  headers?: Record<string, string>;
  html: string;
  subject: string;
  text: string;
  to: string;
}) => Promise<SendResult>;

export type SequenceSweepSummary = {
  cancelled: number;
  failed: number;
  processed: number;
  retried: number;
  sent: number;
  skipped: number;
};

const MAX_ATTEMPTS = 4;
const BATCH_LIMIT = 50;

// Exponential backoff: 30m, 60m, 120m for attempts 1..3.
function backoffDueAt(now: Date, retryCount: number): string {
  const delayMs = 30 * 60 * 1000 * 2 ** (retryCount - 1);

  return new Date(now.getTime() + delayMs).toISOString();
}

function unsubscribeUrlFor(siteOrigin: string, token: string): string {
  const url = new URL("/api/lead-magnet/unsubscribe", siteOrigin);
  url.searchParams.set("t", token);

  return url.toString();
}

export async function runSequenceSweep({
  db,
  emailSend,
  limit = BATCH_LIMIT,
  now = new Date(),
  siteOrigin,
}: {
  db: D1Database;
  emailSend: SequenceEmailSender;
  limit?: number;
  now?: Date;
  siteOrigin: string;
}): Promise<SequenceSweepSummary> {
  await requeueStaleSequenceJobs({ db, now });

  const jobs = await selectDueSequenceJobs({ db, limit, now });
  const summary: SequenceSweepSummary = {
    cancelled: 0,
    failed: 0,
    processed: jobs.length,
    retried: 0,
    sent: 0,
    skipped: 0,
  };

  for (const job of jobs) {
    // Atomic claim — if another sweep already took this row, skip it.
    if (!(await claimSequenceJob({ db, id: job.id, now }))) {
      summary.skipped += 1;
      continue;
    }

    try {
      await processClaimedJob({ db, emailSend, job, now, siteOrigin, summary });
    } catch (error) {
      // Never let one job's failure abort the batch or strand the row in
      // 'processing'. Treat an unexpected throw as a transient failure and let
      // the bounded retry/backoff path resolve it.
      await recoverFromJobError({ db, error, job, now, summary });
    }
  }

  return summary;
}

// Send (or terminally resolve) a single already-claimed job. Throwing here is
// caught by the caller, which reschedules or fails the row.
async function processClaimedJob({
  db,
  emailSend,
  job,
  now,
  siteOrigin,
  summary,
}: {
  db: D1Database;
  emailSend: SequenceEmailSender;
  job: SequenceJobRow;
  now: Date;
  siteOrigin: string;
  summary: SequenceSweepSummary;
}): Promise<void> {
  const lead = await getSequenceJobLead({ db, leadId: job.lead_id });

  if (!lead || lead.status !== "active") {
    await markSequenceJobCancelled({ db, id: job.id, now });
    await recordLeadMagnetEvent({
      db,
      eventType: "sequence_cancelled",
      leadId: job.lead_id,
      metadata: {
        reason: lead ? lead.status : "missing_lead",
        slug: job.lead_magnet_slug,
        step: job.sequence_step,
      },
    });
    summary.cancelled += 1;

    return;
  }

  // Global per-lead cap: once a lead has received (or has in flight) a full
  // sequence's worth of nurture email across all their resources, cancel further
  // steps instead of stacking overlapping drips. Earliest-due steps win because
  // the sweep processes due jobs in due_at order.
  const priorSends = await countLeadNurtureSends({ db, excludeJobId: job.id, leadId: job.lead_id });

  if (priorSends >= NURTURE_EMAIL_CAP_PER_LEAD) {
    await markSequenceJobCancelled({ db, id: job.id, now });
    await recordLeadMagnetEvent({
      db,
      eventType: "sequence_cancelled",
      leadId: job.lead_id,
      metadata: {
        cap: NURTURE_EMAIL_CAP_PER_LEAD,
        reason: "lead_cap_reached",
        slug: job.lead_magnet_slug,
        step: job.sequence_step,
      },
    });
    summary.cancelled += 1;

    return;
  }

  const resource = getLeadMagnetResource(job.lead_magnet_slug);

  if (!resource) {
    await markSequenceJobFailed({ db, id: job.id, now, retryCount: job.retry_count });
    await recordLeadMagnetEvent({
      db,
      eventType: "sequence_step_failed",
      leadId: job.lead_id,
      metadata: { error: "unknown_resource", slug: job.lead_magnet_slug, step: job.sequence_step },
    });
    summary.failed += 1;

    return;
  }

  const email = getLeadMagnetSequenceEmail(resource, job.sequence_step as LeadMagnetSequenceStep);
  const built = buildLeadMagnetSequenceEmail({
    email,
    resource,
    siteOrigin,
    unsubscribeUrl: unsubscribeUrlFor(siteOrigin, lead.unsubscribe_token),
  });

  const result = await emailSend({ to: lead.email, ...built });

  if (result.ok) {
    await markSequenceJobSent({
      db,
      id: job.id,
      now,
      responseJson: JSON.stringify({ ok: true }),
    });
    await recordLeadMagnetEvent({
      db,
      eventType: "sequence_step_sent",
      leadId: job.lead_id,
      metadata: { slug: job.lead_magnet_slug, step: job.sequence_step },
    });
    summary.sent += 1;

    return;
  }

  await scheduleRetryOrFail({
    db,
    error: result.error,
    job,
    now,
    summary,
  });
}

// Shared retry/backoff resolution for a claimed job that could not be delivered —
// used both for a returned send failure and for an unexpected thrown error.
async function scheduleRetryOrFail({
  db,
  error,
  job,
  now,
  summary,
}: {
  db: D1Database;
  error: string;
  job: SequenceJobRow;
  now: Date;
  summary: SequenceSweepSummary;
}): Promise<void> {
  const retryCount = job.retry_count + 1;

  if (retryCount >= MAX_ATTEMPTS) {
    await markSequenceJobFailed({ db, id: job.id, now, retryCount });
    await recordLeadMagnetEvent({
      db,
      eventType: "sequence_step_failed",
      leadId: job.lead_id,
      metadata: { error, retryCount, slug: job.lead_magnet_slug, step: job.sequence_step },
    });
    summary.failed += 1;

    return;
  }

  const dueAt = backoffDueAt(now, retryCount);
  await rescheduleSequenceJob({ db, dueAt, id: job.id, now, retryCount });
  await recordLeadMagnetEvent({
    db,
    eventType: "sequence_step_retry",
    leadId: job.lead_id,
    metadata: { error, nextDueAt: dueAt, retryCount, slug: job.lead_magnet_slug, step: job.sequence_step },
  });
  summary.retried += 1;
}

// Last-resort recovery when processClaimedJob throws. Resolves the row through the
// bounded retry path so it is never stranded in 'processing'; if even that write
// fails, count it and move on so the batch survives.
async function recoverFromJobError({
  db,
  error,
  job,
  now,
  summary,
}: {
  db: D1Database;
  error: unknown;
  job: SequenceJobRow;
  now: Date;
  summary: SequenceSweepSummary;
}): Promise<void> {
  const message = String((error as Error)?.message ?? error);

  try {
    await scheduleRetryOrFail({ db, error: message, job, now, summary });
  } catch {
    summary.failed += 1;
  }
}
