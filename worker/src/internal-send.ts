// Request contract for the Pages -> Worker service-binding call. The Worker owns
// `from`/`replyTo`, so the caller only supplies the recipient and built message.

export type InternalSendPayload = {
  headers?: Record<string, string>;
  html: string;
  subject: string;
  text: string;
  to: string;
};

function isStringRecord(value: unknown): value is Record<string, string> {
  return (
    typeof value === "object" &&
    value !== null &&
    !Array.isArray(value) &&
    Object.values(value).every((entry) => typeof entry === "string")
  );
}

export function parseInternalSend(raw: unknown): InternalSendPayload | null {
  if (typeof raw !== "object" || raw === null) {
    return null;
  }

  const value = raw as Record<string, unknown>;
  const { headers, html, subject, text, to } = value;

  if (
    typeof to !== "string" ||
    typeof subject !== "string" ||
    typeof html !== "string" ||
    typeof text !== "string" ||
    to.trim() === "" ||
    subject.trim() === ""
  ) {
    return null;
  }

  // Reject a recipient carrying a line break — a header-injection attempt has no
  // place reaching the MIME builder.
  if (/[\r\n]/.test(to)) {
    return null;
  }

  if (headers !== undefined && !isStringRecord(headers)) {
    return null;
  }

  return { headers: headers as Record<string, string> | undefined, html, subject, text, to };
}
