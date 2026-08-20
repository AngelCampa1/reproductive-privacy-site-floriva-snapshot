import { parseInternalSend } from "./internal-send";
import { sendViaEmailService } from "./send-email";
import { runSequenceSweep, type SequenceEmailSender } from "./sequence-runner";

export interface WorkerEnv {
  EMAIL: SendEmail;
  EMAIL_FROM: string;
  EMAIL_REPLY_TO?: string;
  INTERNAL_SEND_SECRET: string;
  LEAD_MAGNET_DB: D1Database;
  SITE_ORIGIN: string;
}

function jsonResponse(body: unknown, status: number): Response {
  return new Response(JSON.stringify(body), {
    headers: { "Content-Type": "application/json" },
    status,
  });
}

// Length-safe, constant-time-ish string comparison so the shared secret can't be
// probed byte-by-byte via response timing.
function secretsMatch(provided: string | null, expected: string): boolean {
  if (!expected || provided === null) {
    return false;
  }

  const a = new TextEncoder().encode(provided);
  const b = new TextEncoder().encode(expected);

  if (a.length !== b.length) {
    return false;
  }

  let diff = 0;

  for (let i = 0; i < a.length; i += 1) {
    diff |= a[i] ^ b[i];
  }

  return diff === 0;
}

// Wraps the EMAIL send binding with the Worker-owned envelope fields, so both the
// immediate route and the scheduled sweep send through one code path.
function makeEmailSender(env: WorkerEnv): SequenceEmailSender {
  return (message) =>
    sendViaEmailService(env.EMAIL, {
      ...message,
      from: env.EMAIL_FROM,
      replyTo: env.EMAIL_REPLY_TO,
    });
}

export default {
  async fetch(request: Request, env: WorkerEnv): Promise<Response> {
    const url = new URL(request.url);

    if (request.method !== "POST" || url.pathname !== "/internal/send") {
      return jsonResponse({ error: "not_found", ok: false }, 404);
    }

    if (!secretsMatch(request.headers.get("X-Internal-Auth"), env.INTERNAL_SEND_SECRET)) {
      return jsonResponse({ error: "unauthorized", ok: false, status: 401 }, 401);
    }

    const raw = await request.json().catch(() => null);
    const payload = parseInternalSend(raw);

    if (!payload) {
      return jsonResponse({ error: "invalid_payload", ok: false, status: 400 }, 400);
    }

    const result = await sendViaEmailService(env.EMAIL, {
      ...payload,
      from: env.EMAIL_FROM,
      replyTo: env.EMAIL_REPLY_TO,
    });

    return result.ok
      ? jsonResponse({ ok: true }, 200)
      : jsonResponse({ error: result.error, ok: false, status: result.status }, result.status);
  },

  async scheduled(_event: ScheduledController, env: WorkerEnv): Promise<void> {
    await runSequenceSweep({
      db: env.LEAD_MAGNET_DB,
      emailSend: makeEmailSender(env),
      siteOrigin: env.SITE_ORIGIN,
    });
  },
};
