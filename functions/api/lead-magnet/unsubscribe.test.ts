import { describe, expect, it } from "vitest";
import { onRequest } from "./unsubscribe";

type StatementCall = {
  binds: unknown[];
  sql: string;
};

function createContext(url: string, firstResult: unknown, method = "GET"): Parameters<typeof onRequest>[0] {
  const calls: StatementCall[] = [];

  return {
    data: { requestId: "test-request" },
    env: {
      LEAD_MAGNET_DB: {
        prepare(sql: string) {
          return {
            bind(...binds: unknown[]) {
              calls.push({ binds, sql });

              return {
                async first() {
                  return firstResult;
                },
                async run() {
                  return { meta: { changes: 1 } };
                },
              };
            },
          };
        },
      },
    },
    functionPath: "/api/lead-magnet/unsubscribe",
    next: (() => Promise.resolve(new Response(null))) as Parameters<typeof onRequest>[0]["next"],
    params: {},
    passThroughOnException: () => {},
    request: new Request(url, { method }),
    waitUntil: () => {},
    calls,
  } as unknown as Parameters<typeof onRequest>[0] & { calls: StatementCall[] };
}

describe("lead magnet unsubscribe endpoint", () => {
  it("renders GET confirmation without mutating D1", async () => {
    const context = createContext("https://floriva.app/api/lead-magnet/unsubscribe?t=token-1", {
      id: "lead-1",
    });

    const response = await onRequest(context);
    const calls = (context as typeof context & { calls: StatementCall[] }).calls;

    expect(response.status).toBe(200);
    const body = await response.text();
    expect(body).toContain("Confirm unsubscribe");
    expect(body).not.toContain("You are unsubscribed.");
    expect(calls).toHaveLength(1);
    expect(calls[0].sql).toContain("SELECT id, email FROM lead_magnet_leads");
  });

  it("marks the local lead unsubscribed and cancels its pending sequence jobs on POST", async () => {
    const context = createContext("https://floriva.app/api/lead-magnet/unsubscribe?t=token-1", {
      email: "lead@example.com",
      id: "lead-1",
    }, "POST");
    const response = await onRequest(context);
    const calls = (context as typeof context & { calls: StatementCall[] }).calls;
    const leadUpdate = calls.find((call) => call.sql.includes("UPDATE lead_magnet_leads"));
    const jobCancel = calls.find(
      (call) =>
        call.sql.includes("UPDATE lead_magnet_sequence_jobs") && call.sql.includes("'cancelled'"),
    );
    const cancelledEvent = calls.find((call) => call.binds[2] === "sequence_cancelled");

    expect(response.status).toBe(200);
    expect(leadUpdate?.binds[1]).toBe("lead-1");
    expect(jobCancel).toBeDefined();
    expect(jobCancel?.binds[1]).toBe("lead-1");
    expect(cancelledEvent).toBeDefined();
  });
});
