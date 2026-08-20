import { describe, expect, it, vi } from "vitest";

// `cloudflare:email` is aliased to a test stub in vitest.config.ts.
import { buildMimeMessage, extractAddr, sendViaEmailService } from "./send-email";

const sendMock = vi.fn();

const base = {
  from: "Floriva <angel.campa@floriva.app>",
  headers: { "List-Unsubscribe": "<https://floriva.app/u>", "List-Unsubscribe-Post": "List-Unsubscribe=One-Click" },
  html: "<p>Your “checklist” is ready</p>",
  replyTo: "angel.campa@floriva.app",
  subject: "Your “checklist” is ready",
  text: "Your checklist is ready",
  to: "user@example.com",
};

function decodePart(raw: string, marker: string): string {
  const section = raw.split(marker)[1];
  const body = section.split(/--/)[0];
  const base64 = body.split("\r\n").filter((line) => /^[A-Za-z0-9+/=]+$/.test(line)).join("");

  return new TextDecoder().decode(Uint8Array.from(atob(base64), (c) => c.charCodeAt(0)));
}

describe("extractAddr", () => {
  it("pulls the bare address out of a display-name form", () => {
    expect(extractAddr("Floriva <angel.campa@floriva.app>")).toBe("angel.campa@floriva.app");
    expect(extractAddr("angel.campa@floriva.app")).toBe("angel.campa@floriva.app");
  });
});

describe("buildMimeMessage", () => {
  it("produces a multipart/alternative message with both parts and unsubscribe headers", () => {
    const raw = buildMimeMessage(base);

    expect(raw).toContain("Content-Type: multipart/alternative;");
    expect(raw).toContain('Content-Type: text/plain; charset="utf-8"');
    expect(raw).toContain('Content-Type: text/html; charset="utf-8"');
    expect(raw).toContain("List-Unsubscribe: <https://floriva.app/u>");
    expect(raw).toContain("List-Unsubscribe-Post: List-Unsubscribe=One-Click");
    expect(raw).toContain("From: Floriva <angel.campa@floriva.app>");
    expect(raw).toContain("Reply-To: angel.campa@floriva.app");
  });

  it("RFC 2047-encodes a subject with non-ASCII characters", () => {
    const raw = buildMimeMessage(base);
    expect(raw).toMatch(/Subject: =\?UTF-8\?B\?[A-Za-z0-9+/=]+\?=/);
  });

  it("strips CR/LF from address headers so a recipient can't inject headers", () => {
    const raw = buildMimeMessage({
      ...base,
      to: "user@example.com\r\nBcc: evil@example.com",
    });

    // The injected header must be flattened onto the To line, never its own header.
    const headerLines = raw.split("\r\n");
    expect(headerLines.some((line) => line.startsWith("Bcc:"))).toBe(false);
    expect(headerLines.some((line) => line.startsWith("To: user@example.com"))).toBe(true);
  });

  it("round-trips the html and text bodies through base64", () => {
    const raw = buildMimeMessage(base);
    expect(decodePart(raw, 'text/html; charset="utf-8"\r\nContent-Transfer-Encoding: base64\r\n\r\n')).toContain(
      "Your “checklist” is ready",
    );
    expect(decodePart(raw, 'text/plain; charset="utf-8"\r\nContent-Transfer-Encoding: base64\r\n\r\n')).toContain(
      "Your checklist is ready",
    );
  });
});

describe("sendViaEmailService", () => {
  it("sends once with a bare envelope-from address", async () => {
    sendMock.mockResolvedValueOnce(undefined);
    const binding = { send: sendMock } as unknown as SendEmail;

    const result = await sendViaEmailService(binding, base);

    expect(result).toEqual({ ok: true });
    expect(sendMock).toHaveBeenCalledOnce();
    const message = sendMock.mock.calls[0][0] as { from: string; to: string; raw: string };
    expect(message.from).toBe("angel.campa@floriva.app");
    expect(message.to).toBe("user@example.com");
    expect(message.raw).toContain("multipart/alternative");
  });

  it("returns a 502 failure when the binding throws", async () => {
    sendMock.mockRejectedValueOnce(new Error("rejected by DKIM"));
    const binding = { send: sendMock } as unknown as SendEmail;

    const result = await sendViaEmailService(binding, base);

    expect(result).toEqual({ error: "rejected by DKIM", ok: false, status: 502 });
  });
});
