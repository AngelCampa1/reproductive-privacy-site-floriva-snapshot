import { getLeadMagnetResource, type LeadMagnetResource } from "../../src/site/lead-magnets";

const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export class InvalidLeadMagnetSubscriptionError extends Error {}

export type LeadMagnetSubscription = {
  email: string;
  honeypot: string;
  resource: LeadMagnetResource;
  sourcePath: string;
  turnstileToken: string;
};

function asRecord(value: unknown): Record<string, unknown> {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    throw new InvalidLeadMagnetSubscriptionError("Subscription payload must be a JSON object.");
  }

  return value as Record<string, unknown>;
}

function normalizeEmail(value: unknown): string {
  if (typeof value !== "string") {
    throw new InvalidLeadMagnetSubscriptionError("Email is required.");
  }

  const email = value.trim().toLowerCase();

  if (!emailPattern.test(email) || email.length > 254) {
    throw new InvalidLeadMagnetSubscriptionError("Enter a valid email address.");
  }

  return email;
}

function normalizeSourcePath(value: unknown): string {
  if (typeof value !== "string" || !value.startsWith("/") || value.includes("://")) {
    return "/";
  }

  return value.slice(0, 240);
}

export async function createEmailHash(email: string): Promise<string> {
  const normalized = email.trim().toLowerCase();
  const bytes = new TextEncoder().encode(normalized);
  const digest = await crypto.subtle.digest("SHA-256", bytes);

  return Array.from(new Uint8Array(digest))
    .map((byte) => byte.toString(16).padStart(2, "0"))
    .join("");
}

export async function parseLeadMagnetSubscription(value: unknown): Promise<LeadMagnetSubscription> {
  const record = asRecord(value);
  const email = normalizeEmail(record.email);
  const leadMagnetSlug = typeof record.leadMagnetSlug === "string" ? record.leadMagnetSlug.trim() : "";
  const resource = getLeadMagnetResource(leadMagnetSlug);

  if (!resource) {
    throw new InvalidLeadMagnetSubscriptionError("Unknown resource.");
  }

  return {
    email,
    honeypot: typeof record.honeypot === "string" ? record.honeypot.trim() : "",
    resource,
    sourcePath: normalizeSourcePath(record.sourcePath),
    turnstileToken: typeof record.turnstileToken === "string" ? record.turnstileToken.trim() : "",
  };
}

export async function parseLeadMagnetSubscriptionRequest(request: Request): Promise<LeadMagnetSubscription> {
  const raw = await request.json().catch(() => {
    throw new InvalidLeadMagnetSubscriptionError("Request body must be valid JSON.");
  });

  return parseLeadMagnetSubscription(raw);
}
