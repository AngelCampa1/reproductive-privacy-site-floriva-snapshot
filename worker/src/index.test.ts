import { beforeEach, describe, expect, it, vi } from "vitest";

const { runSequenceSweep, sendViaEmailService } = vi.hoisted(() => ({
  runSequenceSweep: vi.fn(async () => ({
    cancelled: 0,
    failed: 0,
    processed: 0,
    retried: 0,
    sent: 0,
    skipped: 0,
  })),
  sendViaEmailService: vi.fn(async () => ({ ok: true }) as { ok: true }),
}));

vi.mock("./send-email", () => ({ sendViaEmailService }));
vi.mock("./sequence-runner", () => ({ runSequenceSweep }));

import worker, { type WorkerEnv } from "./index";

const env = {
  EMAIL: { send: vi.fn() },
  EMAIL_FROM: "Floriva <angel.campa@floriva.app>",
  EMAIL_REPLY_TO: "angel.campa@floriva.app",
  INTERNAL_SEND_SECRET: "internal-secret",
  LEAD_MAGNET_DB: {},
  SITE_ORIGIN: "https://floriva.app",
} as unknown as WorkerEnv;

function sendRequest(body: unknown, headers: Record<string, string> = {}, method = "POST", path = "/internal/send") {
  return new Request(`https://email-worker${path}`, {
    body: body === undefined ? undefined : JSON.stringify(body),
    headers: { "Content-Type": "application/json", ...headers },
    method,
  });
}

const validBody = { html: "<p>hi</p>", subject: "Your download", text: "hi", to: "user@example.com" };

describe("floriva-email worker fetch()", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("sends a valid, authorized request", async () => {
    const response = await worker.fetch(
      sendRequest(validBody, { "X-Internal-Auth": "internal-secret" }),
      env,
    );

    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ ok: true });
    expect(sendViaEmailService).toHaveBeenCalledOnce();
  });

  it("rejects a wrong internal-auth secret with 401", async () => {
    const response = await worker.fetch(
      sendRequest(validBody, { "X-Internal-Auth": "wrong" }),
      env,
    );

    expect(response.status).toBe(401);
    expect(sendViaEmailService).not.toHaveBeenCalled();
  });

  it("rejects a missing internal-auth header with 401", async () => {
    const response = await worker.fetch(sendRequest(validBody), env);

    expect(response.status).toBe(401);
    expect(sendViaEmailService).not.toHaveBeenCalled();
  });

  it("fails closed when the configured secret is empty", async () => {
    const emptySecretEnv = { ...env, INTERNAL_SEND_SECRET: "" } as unknown as WorkerEnv;

    const response = await worker.fetch(
      sendRequest(validBody, { "X-Internal-Auth": "" }),
      emptySecretEnv,
    );

    expect(response.status).toBe(401);
    expect(sendViaEmailService).not.toHaveBeenCalled();
  });

  it("rejects a malformed payload with 400", async () => {
    const response = await worker.fetch(
      sendRequest({ subject: "no recipient" }, { "X-Internal-Auth": "internal-secret" }),
      env,
    );

    expect(response.status).toBe(400);
    expect(sendViaEmailService).not.toHaveBeenCalled();
  });

  it("returns 404 for other routes", async () => {
    const response = await worker.fetch(
      sendRequest(undefined, { "X-Internal-Auth": "internal-secret" }, "GET", "/"),
      env,
    );

    expect(response.status).toBe(404);
  });

  it("surfaces a send failure status", async () => {
    sendViaEmailService.mockResolvedValueOnce({ error: "boom", ok: false, status: 502 } as never);

    const response = await worker.fetch(
      sendRequest(validBody, { "X-Internal-Auth": "internal-secret" }),
      env,
    );

    expect(response.status).toBe(502);
  });
});

describe("floriva-email worker scheduled()", () => {
  it("runs the sequence sweep", async () => {
    await worker.scheduled({} as ScheduledController, env);
    expect(runSequenceSweep).toHaveBeenCalledOnce();
  });
});
