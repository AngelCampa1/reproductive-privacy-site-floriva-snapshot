import { beforeEach, describe, expect, it, vi } from "vitest";
import { runSequenceSweep } from "./sequence-runner";

type StatementCall = { binds: unknown[]; sql: string };

type LeadRow = { email: string; id: string; status: string; unsubscribe_token: string } | null;

function activeLead(): LeadRow {
  return { email: "user@example.com", id: "lead-1", status: "active", unsubscribe_token: "tok-1" };
}

function dueJob(overrides: Partial<Record<string, unknown>> = {}) {
  return {
    id: "job-1",
    lead_id: "lead-1",
    lead_magnet_slug: "privacy-guide",
    retry_count: 0,
    sequence_step: 2,
    ...overrides,
  };
}

function createRunnerD1({
  claimChanges = 1,
  dueJobs = [] as ReturnType<typeof dueJob>[],
  lead = activeLead(),
  nurtureSends = 0,
}: {
  claimChanges?: number;
  dueJobs?: ReturnType<typeof dueJob>[];
  lead?: LeadRow;
  nurtureSends?: number;
} = {}) {
  const calls: StatementCall[] = [];

  return {
    calls,
    db: {
      prepare(sql: string) {
        return {
          bind(...binds: unknown[]) {
            calls.push({ binds, sql });

            return {
              async all() {
                if (sql.includes("FROM lead_magnet_sequence_jobs") && sql.includes("status = 'pending' AND due_at")) {
                  return { results: dueJobs };
                }

                return { results: [] };
              },
              async first() {
                if (sql.includes("FROM lead_magnet_leads WHERE id = ?")) {
                  return lead;
                }

                if (sql.includes("COUNT(*) AS n") && sql.includes("status IN ('sent', 'processing')")) {
                  return { n: nurtureSends };
                }

                return null;
              },
              async run() {
                if (sql.includes("SET status = 'processing'") && sql.includes("id = ?")) {
                  return { meta: { changes: claimChanges } };
                }

                return { meta: { changes: 1 } };
              },
            };
          },
        };
      },
    } as unknown as D1Database,
  };
}

function eventTypes(calls: StatementCall[]): unknown[] {
  return calls
    .filter((call) => call.sql.includes("INSERT INTO lead_magnet_events"))
    .map((call) => call.binds[2]);
}

describe("runSequenceSweep", () => {
  let emailSend: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    emailSend = vi.fn(async () => ({ ok: true }));
  });

  it("requeues stale processing jobs before selecting", async () => {
    const { calls, db } = createRunnerD1();

    await runSequenceSweep({ db, emailSend, siteOrigin: "https://floriva.app" });

    const requeue = calls.find(
      (call) => call.sql.includes("SET status = 'pending'") && call.sql.includes("status = 'processing'"),
    );
    expect(requeue).toBeDefined();
  });

  it("sends a due job for an active lead and marks it sent", async () => {
    const { calls, db } = createRunnerD1({ dueJobs: [dueJob()] });

    const summary = await runSequenceSweep({ db, emailSend, siteOrigin: "https://floriva.app" });

    expect(summary.sent).toBe(1);
    expect(emailSend).toHaveBeenCalledOnce();
    expect(emailSend.mock.calls[0][0]).toMatchObject({ to: "user@example.com" });
    expect(calls.some((call) => call.sql.includes("SET status = 'sent'"))).toBe(true);
    expect(eventTypes(calls)).toContain("sequence_step_sent");
  });

  it("skips a job it cannot claim without sending", async () => {
    const { db } = createRunnerD1({ claimChanges: 0, dueJobs: [dueJob()] });

    const summary = await runSequenceSweep({ db, emailSend, siteOrigin: "https://floriva.app" });

    expect(summary.skipped).toBe(1);
    expect(summary.sent).toBe(0);
    expect(emailSend).not.toHaveBeenCalled();
  });

  it("cancels the job when the lead unsubscribed between select and send", async () => {
    const { calls, db } = createRunnerD1({
      dueJobs: [dueJob()],
      lead: { email: "user@example.com", id: "lead-1", status: "unsubscribed", unsubscribe_token: "tok-1" },
    });

    const summary = await runSequenceSweep({ db, emailSend, siteOrigin: "https://floriva.app" });

    expect(summary.cancelled).toBe(1);
    expect(emailSend).not.toHaveBeenCalled();
    expect(calls.some((call) => call.sql.includes("SET status = 'cancelled'"))).toBe(true);
    expect(eventTypes(calls)).toContain("sequence_cancelled");
  });

  it("reschedules with backoff on a transient send failure", async () => {
    emailSend.mockResolvedValueOnce({ error: "temporary", ok: false, status: 502 });
    const { calls, db } = createRunnerD1({ dueJobs: [dueJob({ retry_count: 0 })] });

    const summary = await runSequenceSweep({ db, emailSend, siteOrigin: "https://floriva.app" });

    expect(summary.retried).toBe(1);
    const reschedule = calls.find(
      (call) => call.sql.includes("SET status = 'pending'") && call.sql.includes("due_at = ?"),
    );
    expect(reschedule).toBeDefined();
    expect(reschedule?.binds[1]).toBe(1); // retry_count incremented to 1
    expect(eventTypes(calls)).toContain("sequence_step_retry");
  });

  it("cancels a due job once the lead hits the global nurture cap", async () => {
    const { calls, db } = createRunnerD1({ dueJobs: [dueJob()], nurtureSends: 7 });

    const summary = await runSequenceSweep({ db, emailSend, siteOrigin: "https://floriva.app" });

    expect(summary.cancelled).toBe(1);
    expect(summary.sent).toBe(0);
    expect(emailSend).not.toHaveBeenCalled();
    expect(calls.some((call) => call.sql.includes("SET status = 'cancelled'"))).toBe(true);
    expect(eventTypes(calls)).toContain("sequence_cancelled");
    const capEvent = calls.find(
      (call) => call.sql.includes("INSERT INTO lead_magnet_events") && String(call.binds[3]).includes("lead_cap_reached"),
    );
    expect(capEvent).toBeDefined();
  });

  it("still sends when the lead is below the nurture cap", async () => {
    const { db } = createRunnerD1({ dueJobs: [dueJob()], nurtureSends: 6 });

    const summary = await runSequenceSweep({ db, emailSend, siteOrigin: "https://floriva.app" });

    expect(summary.sent).toBe(1);
    expect(emailSend).toHaveBeenCalledOnce();
  });

  it("recovers a job whose processing throws, rescheduling it instead of stranding it", async () => {
    emailSend.mockRejectedValueOnce(new Error("isolate evicted mid-send"));
    const { calls, db } = createRunnerD1({ dueJobs: [dueJob({ retry_count: 0 })] });

    const summary = await runSequenceSweep({ db, emailSend, siteOrigin: "https://floriva.app" });

    expect(summary.retried).toBe(1);
    const reschedule = calls.find(
      (call) => call.sql.includes("SET status = 'pending'") && call.sql.includes("due_at = ?"),
    );
    expect(reschedule).toBeDefined();
    expect(eventTypes(calls)).toContain("sequence_step_retry");
  });

  it("continues the batch when one job throws", async () => {
    emailSend.mockRejectedValueOnce(new Error("boom"));
    const { db } = createRunnerD1({
      dueJobs: [dueJob({ id: "job-1" }), dueJob({ id: "job-2" })],
    });

    const summary = await runSequenceSweep({ db, emailSend, siteOrigin: "https://floriva.app" });

    expect(summary.processed).toBe(2);
    expect(summary.retried).toBe(1);
    expect(summary.sent).toBe(1);
  });

  it("marks the job failed once attempts are exhausted", async () => {
    emailSend.mockResolvedValueOnce({ error: "still failing", ok: false, status: 502 });
    const { calls, db } = createRunnerD1({ dueJobs: [dueJob({ retry_count: 3 })] });

    const summary = await runSequenceSweep({ db, emailSend, siteOrigin: "https://floriva.app" });

    expect(summary.failed).toBe(1);
    expect(calls.some((call) => call.sql.includes("SET status = 'failed'"))).toBe(true);
    expect(eventTypes(calls)).toContain("sequence_step_failed");
  });
});
