import type { EdgeData, EdgeEnv } from "../../_lib/bindings";
import { errorResponse, methodNotAllowed } from "../../_lib/http";
import { verifySignedLeadMagnetDownloadUrl } from "../../_lib/lead-magnet-download";
import { recordLeadMagnetEvent } from "../../_lib/lead-magnet-store";
import { annotateSentry, captureHandledException } from "../../_lib/sentry";

function contentDisposition(filename: string): string {
  return `attachment; filename="${filename.replace(/[^a-zA-Z0-9._-]/g, "_")}"`;
}

async function isKnownActiveLead(db: D1Database, leadId: string): Promise<boolean> {
  const lead = await db
    .prepare("SELECT id, status FROM lead_magnet_leads WHERE id = ?")
    .bind(leadId)
    .first<{ id: string; status: string }>();

  return lead?.status === "active";
}

export const onRequest: PagesFunction<EdgeEnv, string, EdgeData> = async (context) => {
  if (context.request.method !== "GET") {
    return methodNotAllowed(["GET"]);
  }

  annotateSentry(context, "lead-magnet.download");

  try {
    const bucket = context.env.LEAD_MAGNET_BUCKET;
    const secret = context.env.LEAD_MAGNET_DOWNLOAD_SIGNING_SECRET?.trim();

    if (!bucket || !secret) {
      return errorResponse(
        503,
        "LEAD_MAGNET_DOWNLOAD_NOT_CONFIGURED",
        "Lead magnet downloads are not configured.",
      );
    }

    const verified = await verifySignedLeadMagnetDownloadUrl(new URL(context.request.url), secret);

    if (!verified.ok) {
      return errorResponse(403, "INVALID_LEAD_MAGNET_DOWNLOAD_LINK", "That download link is expired or invalid.");
    }

    if (verified.leadId) {
      if (!context.env.LEAD_MAGNET_DB) {
        return errorResponse(403, "INVALID_LEAD_MAGNET_DOWNLOAD_LINK", "That download link is expired or invalid.");
      }

      const leadIsActive = await isKnownActiveLead(context.env.LEAD_MAGNET_DB, verified.leadId);

      if (!leadIsActive) {
        return errorResponse(403, "INVALID_LEAD_MAGNET_DOWNLOAD_LINK", "That download link is expired or invalid.");
      }
    }

    const object = await bucket.get(verified.resource.r2Key);

    if (!object) {
      return errorResponse(404, "LEAD_MAGNET_RESOURCE_NOT_FOUND", "That lead magnet resource was not found.");
    }

    if (verified.leadId && context.env.LEAD_MAGNET_DB) {
      context.waitUntil(recordLeadMagnetEvent({
        db: context.env.LEAD_MAGNET_DB,
        eventType: "resource_downloaded",
        leadId: verified.leadId,
        metadata: { slug: verified.resource.slug },
      }).catch((error) => captureHandledException(context, "lead-magnet.download-event", error)));
    }

    return new Response(object.body, {
      headers: {
        "Cache-Control": "private, max-age=300",
        "Content-Disposition": contentDisposition(verified.resource.downloadFileName),
        "Content-Type": object.httpMetadata?.contentType ?? "application/pdf",
        "X-Content-Type-Options": "nosniff",
      },
    });
  } catch (error) {
    captureHandledException(context, "lead-magnet.download", error);
    return errorResponse(500, "LEAD_MAGNET_DOWNLOAD_FAILED", "Lead magnet download failed.");
  }
};
