import { SEQUENCE_OFFSETS_DAYS, type LeadMagnetResource } from "../../src/site/lead-magnets";

export type LeadMagnetLead = {
  email: string;
  id: string;
  status: "active" | "unsubscribed";
  unsubscribe_token: string;
};

// The hour of day (UTC) sequence emails are scheduled for, so nothing lands in
// the middle of the night. ~15:00 UTC is mid-morning across US time zones.
const SEQUENCE_SEND_HOUR_UTC = 15;

export type SequenceJobRow = {
  id: string;
  lead_id: string;
  lead_magnet_slug: string;
  retry_count: number;
  sequence_step: number;
};

export type LeadMagnetLeadResult = LeadMagnetLead & {
  isNewLead: boolean;
};

export async function upsertLeadMagnetLead({
  db,
  email,
  emailHash,
  resubscribeConsent = false,
  resource,
  sourcePath,
}: {
  db: D1Database;
  email: string;
  emailHash: string;
  resubscribeConsent?: boolean;
  resource: LeadMagnetResource;
  sourcePath: string;
}): Promise<LeadMagnetLeadResult> {
  const now = new Date().toISOString();
  const existing = await db
    .prepare("SELECT id, email, status, unsubscribe_token FROM lead_magnet_leads WHERE email_hash = ?")
    .bind(emailHash)
    .first<LeadMagnetLead>();

  if (existing) {
    const statusSql = resubscribeConsent ? ", status = 'active'" : "";
    await db
      .prepare(
        `UPDATE lead_magnet_leads
         SET email = ?${statusSql}, last_lead_magnet_slug = ?, last_source_path = ?, updated_at = ?
         WHERE id = ?`,
      )
      .bind(email, resource.slug, sourcePath, now, existing.id)
      .run();

    return { ...existing, email, isNewLead: false, status: resubscribeConsent ? "active" : existing.status };
  }

  const lead = {
    email,
    id: crypto.randomUUID(),
    status: "active" as const,
    unsubscribe_token: crypto.randomUUID(),
  };

  await db
    .prepare(
      `INSERT INTO lead_magnet_leads (
        id, email, email_hash, status, first_lead_magnet_slug, last_lead_magnet_slug,
        first_source_path, last_source_path, unsubscribe_token, created_at, updated_at
      ) VALUES (?, ?, ?, 'active', ?, ?, ?, ?, ?, ?, ?)`,
    )
    .bind(
      lead.id,
      email,
      emailHash,
      resource.slug,
      resource.slug,
      sourcePath,
      sourcePath,
      lead.unsubscribe_token,
      now,
      now,
    )
    .run();

  return { ...lead, isNewLead: true };
}

export async function claimLeadMagnetResourceRequest({
  db,
  leadId,
  resource,
  sourcePath,
}: {
  db: D1Database;
  leadId: string;
  resource: LeadMagnetResource;
  sourcePath: string;
}): Promise<boolean> {
  const result = await db
    .prepare(
      `INSERT OR IGNORE INTO lead_magnet_resource_requests (
        id, lead_id, lead_magnet_slug, source_path, created_at
      ) VALUES (?, ?, ?, ?, ?)`,
    )
    .bind(crypto.randomUUID(), leadId, resource.slug, sourcePath, new Date().toISOString())
    .run();

  return result.meta.changes > 0;
}

export async function releaseLeadMagnetResourceRequest({
  db,
  leadId,
  resource,
}: {
  db: D1Database;
  leadId: string;
  resource: LeadMagnetResource;
}): Promise<void> {
  await db
    .prepare("DELETE FROM lead_magnet_resource_requests WHERE lead_id = ? AND lead_magnet_slug = ?")
    .bind(leadId, resource.slug)
    .run();
}

export async function recordLeadMagnetEvent({
  db,
  eventType,
  leadId,
  metadata = {},
}: {
  db: D1Database;
  eventType: string;
  leadId: string;
  metadata?: Record<string, unknown>;
}): Promise<void> {
  await db
    .prepare(
      `INSERT INTO lead_magnet_events (id, lead_id, event_type, metadata_json, created_at)
       VALUES (?, ?, ?, ?, ?)`,
    )
    .bind(crypto.randomUUID(), leadId, eventType, JSON.stringify(metadata), new Date().toISOString())
    .run();
}

function sequenceDueAt(now: Date, offsetDays: number): string {
  const due = new Date(now);
  due.setUTCDate(due.getUTCDate() + offsetDays);
  due.setUTCHours(SEQUENCE_SEND_HOUR_UTC, 0, 0, 0);

  return due.toISOString();
}

// Materialize one nurture job per follow-up step (2-8) at enroll time. The unique
// index on (lead_id, lead_magnet_slug, sequence_step) makes INSERT OR IGNORE
// idempotent, so a re-subscribe or retried enroll never creates duplicate sends.
export async function enrollLeadMagnetSequence({
  db,
  leadId,
  now = new Date(),
  resource,
}: {
  db: D1Database;
  leadId: string;
  now?: Date;
  resource: LeadMagnetResource;
}): Promise<number> {
  const timestamp = now.toISOString();
  const statements = resource.sequence.map((email) => {
    const offset = SEQUENCE_OFFSETS_DAYS[email.step];

    return db
      .prepare(
        `INSERT OR IGNORE INTO lead_magnet_sequence_jobs (
          id, lead_id, lead_magnet_slug, sequence_step, status, due_at,
          retry_count, idempotency_key, created_at, updated_at
        ) VALUES (?, ?, ?, ?, 'pending', ?, 0, ?, ?, ?)`,
      )
      .bind(
        crypto.randomUUID(),
        leadId,
        resource.slug,
        email.step,
        sequenceDueAt(now, offset),
        `${leadId}:${resource.slug}:${email.step}`,
        timestamp,
        timestamp,
      );
  });

  if (statements.length === 0) {
    return 0;
  }

  const results = await db.batch(statements);

  return results.reduce((total, result) => total + (result.meta?.changes ?? 0), 0);
}

// Cancel every outstanding nurture job for a lead (used on unsubscribe).
export async function cancelLeadMagnetSequenceJobs({
  db,
  leadId,
  now = new Date(),
}: {
  db: D1Database;
  leadId: string;
  now?: Date;
}): Promise<number> {
  const result = await db
    .prepare(
      `UPDATE lead_magnet_sequence_jobs
       SET status = 'cancelled', updated_at = ?
       WHERE lead_id = ? AND status IN ('pending', 'processing')`,
    )
    .bind(now.toISOString(), leadId)
    .run();

  return result.meta.changes;
}

// Reset jobs that were claimed ('processing') but never resolved — a crash between
// claim and send would otherwise strand them. The next sweep re-claims them.
export async function requeueStaleSequenceJobs({
  db,
  now = new Date(),
  staleMs = 10 * 60 * 1000,
}: {
  db: D1Database;
  now?: Date;
  staleMs?: number;
}): Promise<number> {
  const threshold = new Date(now.getTime() - staleMs).toISOString();
  const result = await db
    .prepare(
      `UPDATE lead_magnet_sequence_jobs
       SET status = 'pending', updated_at = ?
       WHERE status = 'processing' AND updated_at < ?`,
    )
    .bind(now.toISOString(), threshold)
    .run();

  return result.meta.changes;
}

export async function selectDueSequenceJobs({
  db,
  now = new Date(),
  limit = 50,
}: {
  db: D1Database;
  now?: Date;
  limit?: number;
}): Promise<SequenceJobRow[]> {
  const result = await db
    .prepare(
      `SELECT id, lead_id, lead_magnet_slug, sequence_step, retry_count
       FROM lead_magnet_sequence_jobs
       WHERE status = 'pending' AND due_at <= ?
       ORDER BY due_at ASC
       LIMIT ?`,
    )
    .bind(now.toISOString(), limit)
    .all<SequenceJobRow>();

  return result.results ?? [];
}

// Nurture emails already delivered ('sent') or in flight ('processing') for a
// lead, across every resource. 'processing' is counted (excluding the row being
// evaluated) so two overlapping sweeps respect the same global per-lead cap.
export async function countLeadNurtureSends({
  db,
  excludeJobId,
  leadId,
}: {
  db: D1Database;
  excludeJobId: string;
  leadId: string;
}): Promise<number> {
  const row = await db
    .prepare(
      `SELECT COUNT(*) AS n
       FROM lead_magnet_sequence_jobs
       WHERE lead_id = ? AND status IN ('sent', 'processing') AND id != ?`,
    )
    .bind(leadId, excludeJobId)
    .first<{ n: number }>();

  return row?.n ?? 0;
}

// Atomic claim: only one sweep can transition a row out of 'pending', so
// overlapping cron runs can never double-send the same step.
export async function claimSequenceJob({
  db,
  id,
  now = new Date(),
}: {
  db: D1Database;
  id: string;
  now?: Date;
}): Promise<boolean> {
  const result = await db
    .prepare(
      `UPDATE lead_magnet_sequence_jobs
       SET status = 'processing', updated_at = ?
       WHERE id = ? AND status = 'pending'`,
    )
    .bind(now.toISOString(), id)
    .run();

  return result.meta.changes > 0;
}

export async function markSequenceJobSent({
  db,
  id,
  now = new Date(),
  responseJson,
}: {
  db: D1Database;
  id: string;
  now?: Date;
  responseJson: string;
}): Promise<void> {
  const timestamp = now.toISOString();
  // Guard on 'processing' so a sweep whose row was stale-requeued and re-claimed
  // by a later sweep can't still stamp it 'sent' (defense against double-send).
  await db
    .prepare(
      `UPDATE lead_magnet_sequence_jobs
       SET status = 'sent', sent_at = ?, resend_response_json = ?, updated_at = ?
       WHERE id = ? AND status = 'processing'`,
    )
    .bind(timestamp, responseJson, timestamp, id)
    .run();
}

export async function markSequenceJobCancelled({
  db,
  id,
  now = new Date(),
}: {
  db: D1Database;
  id: string;
  now?: Date;
}): Promise<void> {
  await db
    .prepare(
      "UPDATE lead_magnet_sequence_jobs SET status = 'cancelled', updated_at = ? WHERE id = ? AND status = 'processing'",
    )
    .bind(now.toISOString(), id)
    .run();
}

export async function rescheduleSequenceJob({
  db,
  dueAt,
  id,
  now = new Date(),
  retryCount,
}: {
  db: D1Database;
  dueAt: string;
  id: string;
  now?: Date;
  retryCount: number;
}): Promise<void> {
  await db
    .prepare(
      `UPDATE lead_magnet_sequence_jobs
       SET status = 'pending', due_at = ?, retry_count = ?, updated_at = ?
       WHERE id = ? AND status = 'processing'`,
    )
    .bind(dueAt, retryCount, now.toISOString(), id)
    .run();
}

export async function markSequenceJobFailed({
  db,
  id,
  now = new Date(),
  retryCount,
}: {
  db: D1Database;
  id: string;
  now?: Date;
  retryCount: number;
}): Promise<void> {
  await db
    .prepare(
      `UPDATE lead_magnet_sequence_jobs
       SET status = 'failed', retry_count = ?, updated_at = ?
       WHERE id = ? AND status = 'processing'`,
    )
    .bind(retryCount, now.toISOString(), id)
    .run();
}

export async function getSequenceJobLead({
  db,
  leadId,
}: {
  db: D1Database;
  leadId: string;
}): Promise<LeadMagnetLead | null> {
  return db
    .prepare("SELECT id, email, status, unsubscribe_token FROM lead_magnet_leads WHERE id = ?")
    .bind(leadId)
    .first<LeadMagnetLead>();
}
