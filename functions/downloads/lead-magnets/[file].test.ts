import { describe, expect, it } from "vitest";
import { onRequest } from "./[file]";

function createContext(method = "GET"): Parameters<typeof onRequest>[0] {
  return {
    data: { requestId: "test-request" },
    env: {},
    functionPath: "/downloads/lead-magnets/[file]",
    next: (() => Promise.resolve(new Response(null))) as Parameters<typeof onRequest>[0]["next"],
    params: { file: "privacy-guide.pdf" },
    passThroughOnException: () => {},
    request: new Request("https://floriva.app/downloads/lead-magnets/privacy-guide.pdf", { method }),
    waitUntil: () => {},
  } as unknown as Parameters<typeof onRequest>[0];
}

describe("legacy lead magnet static downloads", () => {
  it("blocks direct PDF access", async () => {
    const response = await onRequest(createContext());
    const body = await response.json();

    expect(response.status).toBe(410);
    expect(body).toEqual({
      error: {
        code: "LEAD_MAGNET_STATIC_DOWNLOAD_REMOVED",
        message: "Lead magnet downloads are delivered through signed email links.",
      },
      ok: false,
    });
  });
});
