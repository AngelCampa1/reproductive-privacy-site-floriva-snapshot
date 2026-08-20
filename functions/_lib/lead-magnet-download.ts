import {
  getLeadMagnetResource,
  type LeadMagnetResource,
} from "../../src/site/lead-magnets";

const DEFAULT_TTL_MS = 7 * 24 * 60 * 60 * 1000;

type SignedUrlInput = {
  leadId?: string;
  now?: Date;
  origin: string;
  resource: LeadMagnetResource;
  secret: string;
  ttlMs?: number;
};

type VerifyResult =
  | { ok: true; leadId?: string; resource: LeadMagnetResource }
  | { ok: false; reason: "expired" | "invalid_signature" | "missing" | "unknown_resource" };

function base64Url(bytes: ArrayBuffer): string {
  const binary = String.fromCharCode(...new Uint8Array(bytes));

  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/g, "");
}

function constantTimeEqual(left: string, right: string): boolean {
  let diff = left.length ^ right.length;
  const maxLength = Math.max(left.length, right.length);

  for (let index = 0; index < maxLength; index += 1) {
    diff |= (left.charCodeAt(index) || 0) ^ (right.charCodeAt(index) || 0);
  }

  return diff === 0;
}

async function signPayload(payload: string, secret: string): Promise<string> {
  if (!secret.trim()) {
    throw new Error("Lead magnet download signing secret is required.");
  }

  const encoder = new TextEncoder();
  const key = await crypto.subtle.importKey(
    "raw",
    encoder.encode(secret),
    { hash: "SHA-256", name: "HMAC" },
    false,
    ["sign"],
  );
  const signature = await crypto.subtle.sign("HMAC", key, encoder.encode(payload));

  return base64Url(signature);
}

function signaturePayload(slug: string, expiresAt: string, leadId = ""): string {
  return leadId ? `${slug}.${expiresAt}.${leadId}` : `${slug}.${expiresAt}`;
}

export async function createSignedLeadMagnetDownloadUrl({
  now = new Date(),
  leadId,
  origin,
  resource,
  secret,
  ttlMs = DEFAULT_TTL_MS,
}: SignedUrlInput): Promise<string> {
  const expiresAt = String(now.getTime() + ttlMs);
  const normalizedLeadId = leadId?.trim() ?? "";
  const signature = await signPayload(signaturePayload(resource.slug, expiresAt, normalizedLeadId), secret);
  const url = new URL("/api/lead-magnet/download", origin);

  url.searchParams.set("slug", resource.slug);
  url.searchParams.set("exp", expiresAt);
  url.searchParams.set("sig", signature);
  if (normalizedLeadId) {
    url.searchParams.set("lead", normalizedLeadId);
  }

  return url.toString();
}

export async function verifySignedLeadMagnetDownloadUrl(
  url: URL,
  secret: string,
  now = new Date(),
): Promise<VerifyResult> {
  const slug = url.searchParams.get("slug")?.trim() ?? "";
  const expiresAt = url.searchParams.get("exp")?.trim() ?? "";
  const leadId = url.searchParams.get("lead")?.trim() ?? "";
  const signature = url.searchParams.get("sig")?.trim() ?? "";

  if (!slug || !expiresAt || !signature) {
    return { ok: false, reason: "missing" };
  }

  const resource = getLeadMagnetResource(slug);

  if (!resource) {
    return { ok: false, reason: "unknown_resource" };
  }

  const expiresAtMs = Number(expiresAt);

  if (!Number.isFinite(expiresAtMs) || expiresAtMs <= now.getTime()) {
    return { ok: false, reason: "expired" };
  }

  const expectedSignature = await signPayload(signaturePayload(resource.slug, expiresAt, leadId), secret);

  if (!constantTimeEqual(signature, expectedSignature)) {
    return { ok: false, reason: "invalid_signature" };
  }

  return { ok: true, leadId: leadId || undefined, resource };
}
