import type { EdgeData, EdgeEnv } from "../../_lib/bindings";
import { errorResponse, json, methodNotAllowed } from "../../_lib/http";
import { cancelLeadMagnetSequenceJobs, recordLeadMagnetEvent } from "../../_lib/lead-magnet-store";
import { annotateSentry, captureHandledException } from "../../_lib/sentry";

function html(body: string, init: ResponseInit = {}): Response {
  const headers = new Headers(init.headers);
  headers.set("Cache-Control", "no-store");
  headers.set("Content-Type", "text/html; charset=utf-8");
  headers.set("X-Content-Type-Options", "nosniff");

  return new Response(body, { ...init, headers });
}

function unsubscribeConfirmation(token: string): Response {
  return html(`<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>Confirm unsubscribe | Floriva</title>
    <style>
      body { margin: 0; background: #f8f4ea; color: #3f332b; font-family: Manrope, Segoe UI, Arial, sans-serif; }
      main { min-height: 100vh; display: grid; place-items: center; padding: 24px; }
      section { max-width: 560px; border: 1px solid #d9d0bf; border-radius: 16px; background: #fffaf0; padding: 32px; }
      button { border: 0; border-radius: 999px; background: #496f50; color: #fff; cursor: pointer; font: inherit; font-weight: 700; padding: 12px 18px; }
      p { line-height: 1.65; }
      a { color: #496f50; font-weight: 700; }
    </style>
  </head>
  <body>
    <main>
      <section>
        <p style="letter-spacing:.08em;text-transform:uppercase;color:#5f7f63;font-weight:700;font-size:12px;">Floriva</p>
        <h1>Confirm unsubscribe</h1>
        <p>Confirm that you want to stop Floriva lead magnet emails for this address.</p>
        <form method="post" action="/api/lead-magnet/unsubscribe?t=${token}">
          <button type="submit">Unsubscribe</button>
        </form>
        <p><a href="/">Return to Floriva</a></p>
      </section>
    </main>
  </body>
</html>`);
}

export const onRequest: PagesFunction<EdgeEnv, string, EdgeData> = async (context) => {
  if (context.request.method !== "GET" && context.request.method !== "POST") {
    return methodNotAllowed(["GET", "POST"]);
  }

  annotateSentry(context, "lead-magnet.unsubscribe");

  try {
    const db = context.env.LEAD_MAGNET_DB;
    const token = new URL(context.request.url).searchParams.get("t")?.trim();

    if (!db) {
      return errorResponse(503, "LEAD_MAGNET_DELIVERY_NOT_CONFIGURED", "Resource delivery is not configured.");
    }

    if (!token) {
      return errorResponse(400, "INVALID_UNSUBSCRIBE_TOKEN", "Missing unsubscribe token.");
    }

    const lead = await db
      .prepare("SELECT id, email FROM lead_magnet_leads WHERE unsubscribe_token = ?")
      .bind(token)
      .first<{ id: string; email: string }>();

    if (!lead) {
      return errorResponse(404, "UNSUBSCRIBE_TOKEN_NOT_FOUND", "That unsubscribe link is no longer valid.");
    }

    if (context.request.method === "GET") {
      return unsubscribeConfirmation(encodeURIComponent(token));
    }

    const nowDate = new Date();
    const now = nowDate.toISOString();
    await db
      .prepare("UPDATE lead_magnet_leads SET status = 'unsubscribed', updated_at = ? WHERE id = ?")
      .bind(now, lead.id)
      .run();

    const cancelled = await cancelLeadMagnetSequenceJobs({ db, leadId: lead.id, now: nowDate });

    if (cancelled > 0) {
      await recordLeadMagnetEvent({
        db,
        eventType: "sequence_cancelled",
        leadId: lead.id,
        metadata: { cancelled, reason: "unsubscribed" },
      });
    }

    await db
      .prepare("INSERT INTO lead_magnet_events (id, lead_id, event_type, metadata_json, created_at) VALUES (?, ?, 'unsubscribed', '{}', ?)")
      .bind(crypto.randomUUID(), lead.id, now)
      .run();

    return json({ ok: true, message: "You are unsubscribed from Floriva emails." });
  } catch (error) {
    captureHandledException(context, "lead-magnet.unsubscribe", error);
    return errorResponse(500, "LEAD_MAGNET_UNSUBSCRIBE_FAILED", "Unsubscribe failed.");
  }
};
