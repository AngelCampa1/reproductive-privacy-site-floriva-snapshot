import { EmailMessage } from "cloudflare:email";

export type SendableEmail = {
  from: string;
  headers?: Record<string, string>;
  html: string;
  replyTo?: string;
  subject: string;
  text: string;
  to: string;
};

export type SendResult = { ok: true } | { error: string; ok: false; status: number };

// "Floriva <angel.campa@floriva.app>" -> "angel.campa@floriva.app".
// The SMTP envelope address must be the bare, DKIM-signed address; the display
// name only belongs in the MIME `From:` header.
export function extractAddr(value: string): string {
  const match = value.match(/<([^>]+)>/);

  return (match ? match[1] : value).trim();
}

function toBase64(value: string): string {
  const bytes = new TextEncoder().encode(value);
  let binary = "";

  for (const byte of bytes) {
    binary += String.fromCharCode(byte);
  }

  return btoa(binary);
}

// Wrap base64 payloads at 76 chars per RFC 2045.
function wrapBase64(value: string): string {
  return value.replace(/.{1,76}/g, "$&\r\n").trimEnd();
}

// Strip CR/LF from a header value to prevent RFC 5322 header injection. Email
// addresses are ASCII, so line breaks are simply removed rather than encoded.
function sanitizeHeaderLine(value: string): string {
  return value.replace(/[\r\n]/g, " ");
}

// RFC 2047 encode a header value only when it contains non-ASCII (e.g. curly quotes).
function encodeHeaderValue(value: string): string {
  const sanitized = sanitizeHeaderLine(value);

  // eslint-disable-next-line no-control-regex
  if (/^[\x00-\x7F]*$/.test(sanitized)) {
    return sanitized;
  }

  return `=?UTF-8?B?${toBase64(sanitized)}?=`;
}

export function buildMimeMessage(input: SendableEmail): string {
  const boundary = `b_${crypto.randomUUID().replace(/-/g, "")}`;
  const lines: string[] = [
    `From: ${sanitizeHeaderLine(input.from)}`,
    `To: ${sanitizeHeaderLine(input.to)}`,
  ];

  if (input.replyTo) {
    lines.push(`Reply-To: ${sanitizeHeaderLine(input.replyTo)}`);
  }

  lines.push(
    `Subject: ${encodeHeaderValue(input.subject)}`,
    "MIME-Version: 1.0",
    `Date: ${new Date().toUTCString()}`,
    `Message-ID: <${crypto.randomUUID()}@${extractAddr(input.from).split("@")[1] ?? "floriva.app"}>`,
  );

  for (const [name, value] of Object.entries(input.headers ?? {})) {
    lines.push(`${name}: ${value.replace(/[\r\n]/g, " ")}`);
  }

  lines.push(
    `Content-Type: multipart/alternative; boundary="${boundary}"`,
    "",
    `--${boundary}`,
    'Content-Type: text/plain; charset="utf-8"',
    "Content-Transfer-Encoding: base64",
    "",
    wrapBase64(toBase64(input.text)),
    `--${boundary}`,
    'Content-Type: text/html; charset="utf-8"',
    "Content-Transfer-Encoding: base64",
    "",
    wrapBase64(toBase64(input.html)),
    `--${boundary}--`,
    "",
  );

  return lines.join("\r\n");
}

// Single choke point for outbound email — used by both the immediate delivery
// route and the scheduled nurture sweep.
export async function sendViaEmailService(
  binding: SendEmail,
  input: SendableEmail,
): Promise<SendResult> {
  try {
    const message = new EmailMessage(
      extractAddr(sanitizeHeaderLine(input.from)),
      extractAddr(sanitizeHeaderLine(input.to)),
      buildMimeMessage(input),
    );

    await binding.send(message);

    return { ok: true };
  } catch (error) {
    return { error: String((error as Error)?.message ?? error), ok: false, status: 502 };
  }
}
