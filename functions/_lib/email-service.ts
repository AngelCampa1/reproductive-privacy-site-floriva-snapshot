// Pages-side client for the floriva-email Worker. The Worker owns the Cloudflare
// Email Service `EMAIL` send binding (a Workers-only feature), so Pages Functions
// reach it over a service binding rather than sending directly.

export type EmailServicePayload = {
  headers?: Record<string, string>;
  html: string;
  subject: string;
  tags?: Array<{ name: string; value: string }>;
  text: string;
  to: string;
};

export type EmailServiceResult = {
  body: unknown;
  ok: boolean;
  status: number;
};

// The host is ignored for service bindings — the Worker routes on the pathname.
const INTERNAL_SEND_URL = "https://email-worker/internal/send";

export async function sendLeadMagnetEmail(
  binding: Fetcher,
  secret: string,
  payload: EmailServicePayload,
): Promise<EmailServiceResult> {
  let response: Response;

  try {
    response = await binding.fetch(INTERNAL_SEND_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Internal-Auth": secret,
      },
      body: JSON.stringify(payload),
    });
  } catch (error) {
    return { body: { error: String((error as Error)?.message ?? error) }, ok: false, status: 0 };
  }

  const contentType = response.headers.get("content-type") ?? "";
  const body = contentType.includes("application/json")
    ? await response.json().catch(() => null)
    : await response.text().catch(() => null);

  return { body, ok: response.ok, status: response.status };
}
