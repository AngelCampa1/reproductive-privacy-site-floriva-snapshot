import { describe, expect, it } from "vitest";
import {
  isLeadMagnetSubmissionRateLimited,
  recordLeadMagnetSubmissionAttempt,
} from "./lead-magnet-abuse";

type StatementCall = {
  binds: unknown[];
  sql: string;
};

function createFakeD1(counts: { client?: number; email?: number } = {}) {
  const calls: StatementCall[] = [];

  return {
    calls,
    db: {
      prepare(sql: string) {
        return {
          bind(...binds: unknown[]) {
            calls.push({ binds, sql });

            return {
              async first() {
                if (sql.includes("email_hash")) {
                  return { count: counts.email ?? 0 };
                }

                if (sql.includes("client_key")) {
                  return { count: counts.client ?? 0 };
                }

                return null;
              },
              async run() {
                return { meta: { changes: 1 } };
              },
            };
          },
        };
      },
    } as unknown as D1Database,
  };
}

describe("lead magnet abuse controls", () => {
  it("rate limits repeat submissions by email hash", async () => {
    const { db } = createFakeD1({ email: 3 });

    await expect(
      isLeadMagnetSubmissionRateLimited({
        db,
        emailHash: "hash-repeat",
        request: new Request("https://floriva.app/api/lead-magnet/subscribe"),
      }),
    ).resolves.toBe(true);
  });

  it("rate limits repeat submissions by Cloudflare client IP", async () => {
    const { calls, db } = createFakeD1({ client: 30 });

    await expect(
      isLeadMagnetSubmissionRateLimited({
        db,
        emailHash: "hash-new",
        request: new Request("https://floriva.app/api/lead-magnet/subscribe", {
          headers: { "cf-connecting-ip": "203.0.113.10" },
        }),
      }),
    ).resolves.toBe(true);

    const clientLookup = calls.find((call) => call.sql.includes("client_key"));

    expect(clientLookup?.binds[0]).toBe("203.0.113.10");
  });

  it("records hashed email and client key without storing raw email", async () => {
    const { calls, db } = createFakeD1();

    await recordLeadMagnetSubmissionAttempt({
      db,
      emailHash: "hash-only",
      request: new Request("https://floriva.app/api/lead-magnet/subscribe", {
        headers: { "x-forwarded-for": "198.51.100.20, 198.51.100.21" },
      }),
    });

    const insert = calls.find((call) => call.sql.includes("INSERT INTO lead_magnet_submission_attempts"));

    expect(insert?.binds[1]).toBe("hash-only");
    expect(insert?.binds[2]).toBe("198.51.100.20");
    expect(insert?.binds).not.toContain("person@example.com");
  });
});
