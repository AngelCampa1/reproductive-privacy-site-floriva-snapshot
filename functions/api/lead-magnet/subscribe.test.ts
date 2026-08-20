import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { onRequest } from "./subscribe";

vi.mock("../../_lib/email-service", () => ({
  sendLeadMagnetEmail: vi.fn(async () => ({ body: { ok: true }, ok: true, status: 200 })),
}));

import { sendLeadMagnetEmail } from "../../_lib/email-service";

type StatementCall = {
  binds: unknown[];
  sql: string;
};

function createFakeD1({ existingLead }: { existingLead?: unknown } = {}) {
  const calls: StatementCall[] = [];
  const resourceRequests = new Set<string>();
  let recentAttemptCount = 0;

  function makeStatement(sql: string, binds: unknown[]) {
    calls.push({ binds, sql });

    return {
      async first() {
        if (sql.includes("SELECT id, email, status, unsubscribe_token")) {
          return existingLead ?? null;
        }

        if (sql.includes("SELECT COUNT(*) AS count FROM lead_magnet_submission_attempts")) {
          return { count: recentAttemptCount };
        }

        return null;
      },
      async run() {
        if (sql.includes("INSERT OR IGNORE INTO lead_magnet_resource_requests")) {
          const key = `${binds[1]}:${binds[2]}`;

          if (resourceRequests.has(key)) {
            return { meta: { changes: 0 } };
          }

          resourceRequests.add(key);
          return { meta: { changes: 1 } };
        }

        if (sql.includes("DELETE FROM lead_magnet_resource_requests")) {
          resourceRequests.delete(`${binds[0]}:${binds[1]}`);
          return { meta: { changes: 1 } };
        }

        return { meta: { changes: 1 } };
      },
    };
  }

  return {
    calls,
    setRecentAttemptCount(count: number) {
      recentAttemptCount = count;
    },
    db: {
      prepare(sql: string) {
        return {
          bind(...binds: unknown[]) {
            return makeStatement(sql, binds);
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
  };
}

function createContext(db: D1Database): Parameters<typeof onRequest>[0] {
  return {
    data: { requestId: "request-1" },
    env: {
      ASSETS: { fetch: async () => new Response(null) } as unknown as Fetcher,
      EMAIL_WORKER: { fetch: async () => Response.json({ ok: true }) } as unknown as Fetcher,
      INTERNAL_SEND_SECRET: "internal-secret",
      LEAD_MAGNET_BUCKET: {
        head: async () => ({ key: "lead-magnets/privacy-guide.pdf" }),
      } as unknown as R2Bucket,
      LEAD_MAGNET_DB: db,
      LEAD_MAGNET_DOWNLOAD_SIGNING_SECRET: "secret",
      TURNSTILE_SECRET_KEY: "turnstile-secret",
    },
    functionPath: "/api/lead-magnet/subscribe",
    next: (() => Promise.resolve(new Response(null))) as Parameters<typeof onRequest>[0]["next"],
    params: {},
    passThroughOnException: () => {},
    request: new Request("https://floriva.app/api/lead-magnet/subscribe", {
      body: JSON.stringify({
        email: "user@example.com",
        leadMagnetSlug: "privacy-guide",
        sourcePath: "/privacy",
        turnstileToken: "turnstile-token",
      }),
      headers: {
        "Content-Type": "application/json",
        Origin: "https://floriva.app",
      },
      method: "POST",
    }),
    waitUntil: (promise) => {
      void promise;
    },
  };
}

describe("lead magnet subscribe endpoint", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.stubGlobal("fetch", vi.fn(async () => Response.json({ success: true })));
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("sends the delivery email and enrolls the lead in the nurture sequence", async () => {
    const { calls, db } = createFakeD1();

    const response = await onRequest(createContext(db));
    const enrolled = calls.find((call) => call.binds[2] === "sequence_enrolled");
    const jobInsert = calls.find((call) =>
      call.sql.includes("INSERT OR IGNORE INTO lead_magnet_sequence_jobs"),
    );

    expect(response.status).toBe(202);
    expect(await response.json()).toMatchObject({ ok: true });
    expect(sendLeadMagnetEmail).toHaveBeenCalledOnce();
    expect(enrolled).toBeDefined();
    expect(jobInsert).toBeDefined();
  });

  it("rejects missing Turnstile tokens before touching D1 or the email service", async () => {
    const { calls, db } = createFakeD1();
    const context = createContext(db);
    context.request = new Request("https://floriva.app/api/lead-magnet/subscribe", {
      body: JSON.stringify({
        email: "user@example.com",
        leadMagnetSlug: "privacy-guide",
        sourcePath: "/privacy",
      }),
      headers: {
        "Content-Type": "application/json",
        Origin: "https://floriva.app",
      },
      method: "POST",
    });

    const response = await onRequest(context);

    expect(response.status).toBe(403);
    expect(sendLeadMagnetEmail).not.toHaveBeenCalled();
    expect(calls).toHaveLength(0);
  });

  it("rejects configured preview submissions when Turnstile secret is missing", async () => {
    const { db } = createFakeD1();
    const context = createContext(db);
    delete context.env.TURNSTILE_SECRET_KEY;
    context.request = new Request("https://floriva-web.pages.dev/api/lead-magnet/subscribe", {
      body: JSON.stringify({
        email: "user@example.com",
        leadMagnetSlug: "privacy-guide",
        sourcePath: "/privacy",
        turnstileToken: "unverified-token",
      }),
      headers: {
        "Content-Type": "application/json",
        Origin: "https://floriva-web.pages.dev",
      },
      method: "POST",
    });

    const response = await onRequest(context);

    expect(response.status).toBe(403);
    expect(sendLeadMagnetEmail).not.toHaveBeenCalled();
  });

  it("returns neutral success for honeypot submissions before Turnstile or D1", async () => {
    const { calls, db } = createFakeD1();
    const context = createContext(db);
    context.request = new Request("https://floriva.app/api/lead-magnet/subscribe", {
      body: JSON.stringify({
        email: "user@example.com",
        honeypot: "bot value",
        leadMagnetSlug: "privacy-guide",
        sourcePath: "/privacy",
      }),
      headers: {
        "Content-Type": "application/json",
        Origin: "https://floriva.app",
      },
      method: "POST",
    });

    const response = await onRequest(context);

    expect(response.status).toBe(202);
    expect(globalThis.fetch).not.toHaveBeenCalled();
    expect(sendLeadMagnetEmail).not.toHaveBeenCalled();
    expect(calls).toHaveLength(0);
  });

  it("rate limits repeated submissions for the same email identity", async () => {
    const fake = createFakeD1();
    fake.setRecentAttemptCount(3);

    const response = await onRequest(createContext(fake.db));

    expect(response.status).toBe(429);
    expect(sendLeadMagnetEmail).not.toHaveBeenCalled();
  });

  it("returns neutral success without duplicate delivery for an existing lead and resource", async () => {
    const { db } = createFakeD1({
      existingLead: {
        email: "user@example.com",
        id: "lead-existing",
        status: "active",
        unsubscribe_token: "token-existing",
      },
    });

    await onRequest(createContext(db));
    const response = await onRequest(createContext(db));

    expect(response.status).toBe(202);
    expect(sendLeadMagnetEmail).toHaveBeenCalledTimes(1);
  });

  it("releases the resource claim when delivery fails so a retry can send", async () => {
    const { db } = createFakeD1({
      existingLead: {
        email: "user@example.com",
        id: "lead-existing",
        status: "active",
        unsubscribe_token: "token-existing",
      },
    });

    vi.mocked(sendLeadMagnetEmail)
      .mockResolvedValueOnce({ body: { message: "temporarily unavailable" }, ok: false, status: 502 })
      .mockResolvedValueOnce({ body: { ok: true }, ok: true, status: 200 });

    const failed = await onRequest(createContext(db));
    const retry = await onRequest(createContext(db));

    expect(failed.status).toBe(502);
    expect(retry.status).toBe(202);
    expect(sendLeadMagnetEmail).toHaveBeenCalledTimes(2);
  });

  it("returns neutral success without emailing an unsubscribed lead", async () => {
    const { calls, db } = createFakeD1({
      existingLead: {
        email: "user@example.com",
        id: "lead-existing",
        status: "unsubscribed",
        unsubscribe_token: "token-existing",
      },
    });

    const response = await onRequest(createContext(db));

    expect(response.status).toBe(202);
    expect(sendLeadMagnetEmail).not.toHaveBeenCalled();
    expect(calls.map((call) => call.sql).join("\n")).not.toContain("sequence_jobs");
  });
});
