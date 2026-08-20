import { describe, expect, it, vi } from "vitest";
import { sendLeadMagnetEmail } from "./email-service";

const payload = {
  headers: { "List-Unsubscribe": "<https://floriva.app/u>" },
  html: "<p>hi</p>",
  subject: "Your download",
  text: "hi",
  to: "user@example.com",
};

describe("sendLeadMagnetEmail", () => {
  it("posts the payload to the Worker with the internal auth header", async () => {
    const fetch = vi.fn(async () => Response.json({ ok: true }));
    const binding = { fetch } as unknown as Fetcher;

    const result = await sendLeadMagnetEmail(binding, "internal-secret", payload);

    expect(result).toEqual({ body: { ok: true }, ok: true, status: 200 });
    expect(fetch).toHaveBeenCalledOnce();

    const [url, init] = fetch.mock.calls[0] as unknown as [string, RequestInit];
    expect(url).toBe("https://email-worker/internal/send");
    expect(init.method).toBe("POST");
    expect((init.headers as Record<string, string>)["X-Internal-Auth"]).toBe("internal-secret");
    expect(JSON.parse(init.body as string)).toEqual(payload);
  });

  it("reports a non-ok worker response as a failure", async () => {
    const fetch = vi.fn(async () => Response.json({ error: "boom", ok: false }, { status: 502 }));
    const binding = { fetch } as unknown as Fetcher;

    const result = await sendLeadMagnetEmail(binding, "secret", payload);

    expect(result.ok).toBe(false);
    expect(result.status).toBe(502);
  });

  it("returns a failure when the service binding throws", async () => {
    const binding = {
      fetch: vi.fn(async () => {
        throw new Error("no route");
      }),
    } as unknown as Fetcher;

    const result = await sendLeadMagnetEmail(binding, "secret", payload);

    expect(result.ok).toBe(false);
    expect(result.status).toBe(0);
  });
});
