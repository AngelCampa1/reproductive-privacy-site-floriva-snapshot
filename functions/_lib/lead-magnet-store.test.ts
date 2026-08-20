import { describe, expect, it } from "vitest";
import { getLeadMagnetResource, SEQUENCE_OFFSETS_DAYS } from "../../src/site/lead-magnets";
import {
  cancelLeadMagnetSequenceJobs,
  claimLeadMagnetResourceRequest,
  enrollLeadMagnetSequence,
  recordLeadMagnetEvent,
  releaseLeadMagnetResourceRequest,
  upsertLeadMagnetLead,
} from "./lead-magnet-store";

type StatementCall = {
  binds: unknown[];
  sql: string;
};

function createFakeD1() {
  const calls: StatementCall[] = [];
  const firstResults = new Map<string, unknown>();

  return {
    calls,
    db: {
      prepare(sql: string) {
        return {
          bind(...binds: unknown[]) {
            calls.push({ binds, sql });

            return {
              async first() {
                return firstResults.get(sql) ?? null;
              },
              async run() {
                return { meta: { changes: 1 } };
              },
            };
          },
        };
      },
      async batch(statements: Array<{ run: () => Promise<{ meta: { changes: number } }> }>) {
        const results = [];

        for (const statement of statements) {
          results.push(await statement.run());
        }

        return results;
      },
    } as unknown as D1Database,
    firstResults,
  };
}

describe("lead magnet lead storage", () => {
  it("inserts new leads into D1 with consent and source metadata", async () => {
    const { calls, db } = createFakeD1();
    const resource = getLeadMagnetResource("privacy-guide")!;

    const lead = await upsertLeadMagnetLead({
      db,
      email: "user@example.com",
      emailHash: "hash-1",
      resource,
      sourcePath: "/resources/guides/period-tracker-hipaa",
    });

    const insert = calls.find((call) => call.sql.includes("INSERT INTO lead_magnet_leads"));

    expect(lead.email).toBe("user@example.com");
    expect(insert?.binds[1]).toBe("user@example.com");
    expect(insert?.binds[2]).toBe("hash-1");
    expect(insert?.binds[3]).toBe("privacy-guide");
    expect(insert?.binds[5]).toBe("/resources/guides/period-tracker-hipaa");
  });

  it("preserves unsubscribed status for existing leads without resubscribe consent", async () => {
    const { calls, db, firstResults } = createFakeD1();
    const resource = getLeadMagnetResource("state-risk-scorecard")!;
    const selectSql = "SELECT id, email, status, unsubscribe_token FROM lead_magnet_leads WHERE email_hash = ?";

    firstResults.set(selectSql, {
      email: "old@example.com",
      id: "lead-existing",
      status: "unsubscribed",
      unsubscribe_token: "token-existing",
    });

    const lead = await upsertLeadMagnetLead({
      db,
      email: "new@example.com",
      emailHash: "hash-existing",
      resource,
      sourcePath: "/",
    });

    const update = calls.find((call) => call.sql.includes("UPDATE lead_magnet_leads"));

    expect(lead).toEqual({
      email: "new@example.com",
      id: "lead-existing",
      isNewLead: false,
      status: "unsubscribed",
      unsubscribe_token: "token-existing",
    });
    expect(update?.sql).not.toContain("status = 'active'");
    expect(update?.binds.slice(0, 4)).toEqual(["new@example.com", "state-risk-scorecard", "/", expect.any(String)]);
    expect(update?.binds[4]).toBe("lead-existing");
  });

  it("records D1 events with JSON metadata", async () => {
    const { calls, db } = createFakeD1();

    await recordLeadMagnetEvent({
      db,
      eventType: "resource_sent",
      leadId: "lead-1",
      metadata: { slug: "privacy-guide" },
    });

    const insert = calls.find((call) => call.sql.includes("INSERT INTO lead_magnet_events"));

    expect(insert?.binds[1]).toBe("lead-1");
    expect(insert?.binds[2]).toBe("resource_sent");
    expect(insert?.binds[3]).toBe(JSON.stringify({ slug: "privacy-guide" }));
  });

  it("records a unique lead and resource claim", async () => {
    const { calls, db } = createFakeD1();
    const resource = getLeadMagnetResource("privacy-guide")!;

    await expect(
      claimLeadMagnetResourceRequest({
        db,
        leadId: "lead-1",
        resource,
        sourcePath: "/privacy",
      }),
    ).resolves.toBe(true);

    const insert = calls.find((call) => call.sql.includes("INSERT OR IGNORE INTO lead_magnet_resource_requests"));

    expect(insert?.binds[1]).toBe("lead-1");
    expect(insert?.binds[2]).toBe("privacy-guide");
    expect(insert?.binds[3]).toBe("/privacy");
  });

  it("releases a lead and resource claim for retry after delivery failure", async () => {
    const { calls, db } = createFakeD1();
    const resource = getLeadMagnetResource("privacy-guide")!;

    await releaseLeadMagnetResourceRequest({
      db,
      leadId: "lead-1",
      resource,
    });

    const deletion = calls.find((call) => call.sql.includes("DELETE FROM lead_magnet_resource_requests"));

    expect(deletion?.binds).toEqual(["lead-1", "privacy-guide"]);
  });

  it("materializes one nurture job per step with scheduled due dates and idempotency keys", async () => {
    const { calls, db } = createFakeD1();
    const resource = getLeadMagnetResource("privacy-guide")!;
    const now = new Date("2026-07-13T09:30:00.000Z");

    const enrolled = await enrollLeadMagnetSequence({ db, leadId: "lead-1", now, resource });

    const inserts = calls.filter((call) =>
      call.sql.includes("INSERT OR IGNORE INTO lead_magnet_sequence_jobs"),
    );

    expect(enrolled).toBe(resource.sequence.length);
    expect(inserts).toHaveLength(resource.sequence.length);

    // binds: id, lead_id, slug, step, due_at, idempotency_key, created_at, updated_at
    const steps = inserts.map((call) => call.binds[3]);
    expect(steps).toEqual(resource.sequence.map((email) => email.step));

    for (const call of inserts) {
      const step = call.binds[3] as number;
      const dueAt = call.binds[4] as string;
      const expectedDay = new Date(now);
      expectedDay.setUTCDate(expectedDay.getUTCDate() + SEQUENCE_OFFSETS_DAYS[step as 2]);
      expectedDay.setUTCHours(15, 0, 0, 0);

      expect(dueAt).toBe(expectedDay.toISOString());
      expect(dueAt.endsWith("T15:00:00.000Z")).toBe(true);
      expect(call.binds[5]).toBe(`lead-1:privacy-guide:${step}`);
    }
  });

  it("cancels outstanding nurture jobs for a lead", async () => {
    const { calls, db } = createFakeD1();

    await cancelLeadMagnetSequenceJobs({ db, leadId: "lead-1" });

    const update = calls.find((call) => call.sql.includes("UPDATE lead_magnet_sequence_jobs"));

    expect(update?.sql).toContain("status = 'cancelled'");
    expect(update?.sql).toContain("status IN ('pending', 'processing')");
    expect(update?.binds[1]).toBe("lead-1");
  });
});
