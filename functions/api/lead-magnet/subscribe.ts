import type { EdgeData, EdgeEnv } from "../../_lib/bindings";
import { getRequestOrigin, isSameOriginWrite } from "../../_lib/bindings";
import { errorResponse, json, methodNotAllowed, options, sameOriginRequired } from "../../_lib/http";
import {
  isLeadMagnetSubmissionRateLimited,
  recordLeadMagnetSubmissionAttempt,
} from "../../_lib/lead-magnet-abuse";
import { createSignedLeadMagnetDownloadUrl } from "../../_lib/lead-magnet-download";
import { buildLeadMagnetDeliveryEmail } from "../../_lib/lead-magnet-email";
import { sendLeadMagnetEmail } from "../../_lib/email-service";
import {
  createEmailHash,
  InvalidLeadMagnetSubscriptionError,
  parseLeadMagnetSubscriptionRequest,
} from "../../_lib/lead-magnet-subscription";
import {
  claimLeadMagnetResourceRequest,
  enrollLeadMagnetSequence,
  recordLeadMagnetEvent,
  releaseLeadMagnetResourceRequest,
  upsertLeadMagnetLead,
} from "../../_lib/lead-magnet-store";
import { annotateSentry, captureHandledException } from "../../_lib/sentry";
import { verifyTurnstile } from "../../_lib/turnstile";

export const onRequest: PagesFunction<EdgeEnv, string, EdgeData> = async (context) => {
  if (context.request.method === "OPTIONS") {
    return options(["POST"]);
  }

  if (context.request.method !== "POST") {
    return methodNotAllowed(["POST"]);
  }

  if (!isSameOriginWrite(context.request)) {
    return sameOriginRequired();
  }

  annotateSentry(context, "lead-magnet.subscribe");

  try {
    const subscription = await parseLeadMagnetSubscriptionRequest(context.request);

    if (subscription.honeypot) {
      return json({ ok: true, requestId: context.data.requestId ?? null }, { status: 202 });
    }

    const turnstile = await verifyTurnstile({
      env: context.env,
      request: context.request,
      token: subscription.turnstileToken,
    });

    if (!turnstile.ok) {
      return errorResponse(
        403,
        "LEAD_MAGNET_VERIFICATION_FAILED",
        "Verification failed. Please refresh and try again.",
      );
    }

    const db = context.env.LEAD_MAGNET_DB;
    const bucket = context.env.LEAD_MAGNET_BUCKET;
    const emailWorker = context.env.EMAIL_WORKER;
    const internalSecret = context.env.INTERNAL_SEND_SECRET?.trim();
    const signingSecret = context.env.LEAD_MAGNET_DOWNLOAD_SIGNING_SECRET?.trim();

    if (!db || !bucket || !emailWorker || !internalSecret || !signingSecret) {
      return errorResponse(
        503,
        "LEAD_MAGNET_DELIVERY_NOT_CONFIGURED",
        "Resource delivery is not configured.",
      );
    }

    const origin = getRequestOrigin(context.request);
    const emailHash = await createEmailHash(subscription.email);

    if (await isLeadMagnetSubmissionRateLimited({ db, emailHash, request: context.request })) {
      return errorResponse(
        429,
        "LEAD_MAGNET_RATE_LIMITED",
        "Too many resource requests. Please try again later.",
      );
    }

    await recordLeadMagnetSubmissionAttempt({ db, emailHash, request: context.request });

    const object = await bucket.head(subscription.resource.r2Key);

    if (!object) {
      return errorResponse(
        503,
        "LEAD_MAGNET_RESOURCE_NOT_CONFIGURED",
        "That lead magnet resource is not configured.",
      );
    }

    const lead = await upsertLeadMagnetLead({
      db,
      email: subscription.email,
      emailHash,
      resource: subscription.resource,
      sourcePath: subscription.sourcePath,
    });

    if (lead.status === "unsubscribed") {
      await recordLeadMagnetEvent({
        db,
        eventType: "resource_request_suppressed",
        leadId: lead.id,
        metadata: { reason: "unsubscribed", slug: subscription.resource.slug },
      });

      return json({ ok: true, requestId: context.data.requestId ?? null }, { status: 202 });
    }

    const isNewResourceRequest = await claimLeadMagnetResourceRequest({
      db,
      leadId: lead.id,
      resource: subscription.resource,
      sourcePath: subscription.sourcePath,
    });

    if (!isNewResourceRequest) {
      await recordLeadMagnetEvent({
        db,
        eventType: "resource_request_duplicate",
        leadId: lead.id,
        metadata: { slug: subscription.resource.slug },
      });

      return json({ ok: true, requestId: context.data.requestId ?? null }, { status: 202 });
    }

    const unsubscribeUrl = new URL("/api/lead-magnet/unsubscribe", origin);
    unsubscribeUrl.searchParams.set("t", lead.unsubscribe_token);
    const downloadUrl = await createSignedLeadMagnetDownloadUrl({
      leadId: lead.id,
      origin,
      resource: subscription.resource,
      secret: signingSecret,
    });
    const email = buildLeadMagnetDeliveryEmail({
      downloadUrl,
      leadMagnetTitle: subscription.resource.title,
      siteOrigin: origin,
      unsubscribeUrl: unsubscribeUrl.toString(),
    });
    const result = await sendLeadMagnetEmail(emailWorker, internalSecret, {
      ...email,
      tags: [
        { name: "category", value: "lead_magnet_delivery" },
        { name: "lead_magnet", value: subscription.resource.slug },
      ],
      to: subscription.email,
    });

    if (!result.ok) {
      await releaseLeadMagnetResourceRequest({
        db,
        leadId: lead.id,
        resource: subscription.resource,
      });

      await recordLeadMagnetEvent({
        db,
        eventType: "delivery_failed",
        leadId: lead.id,
        metadata: { emailBody: result.body, emailStatus: result.status, slug: subscription.resource.slug },
      });

      return errorResponse(502, "EMAIL_DELIVERY_FAILED", "The email service rejected the delivery email.");
    }

    await recordLeadMagnetEvent({
      db,
      eventType: "resource_sent",
      leadId: lead.id,
      metadata: { emailBody: result.body, emailStatus: result.status, slug: subscription.resource.slug },
    });

    try {
      await enrollLeadMagnetSequence({ db, leadId: lead.id, resource: subscription.resource });
      await recordLeadMagnetEvent({
        db,
        eventType: "sequence_enrolled",
        leadId: lead.id,
        metadata: { slug: subscription.resource.slug, steps: subscription.resource.sequence.length },
      });
    } catch (error) {
      captureHandledException(context, "lead-magnet.sequence-enroll", error);
    }

    return json({ ok: true, requestId: context.data.requestId ?? null }, { status: 202 });
  } catch (error) {
    if (error instanceof InvalidLeadMagnetSubscriptionError) {
      return errorResponse(400, "INVALID_LEAD_MAGNET_SUBSCRIPTION", error.message);
    }

    captureHandledException(context, "lead-magnet.subscribe", error);
    return errorResponse(500, "LEAD_MAGNET_SUBSCRIBE_FAILED", "Resource request failed.");
  }
};
