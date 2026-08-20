import { describe, expect, it } from "vitest";
import { onRequest } from "./health";
import type { EdgeData, EdgeEnv } from "../_lib/bindings";

function buildContext(env: EdgeEnv): EventContext<EdgeEnv, string, EdgeData> {
  return {
    request: new Request("https://floriva.app/api/health"),
    env,
    params: {},
    waitUntil() {},
    passThroughOnException() {},
    next: async () => new Response(null, { status: 404 }),
    data: { requestId: "test-request" },
    functionPath: "/api/health",
  } as unknown as EventContext<EdgeEnv, string, EdgeData>;
}

describe("/api/health", () => {
  it("reports both store redirects as available when store URLs are valid", async () => {
    const response = await onRequest(
      buildContext({
        STORE_URL_IOS: "https://apps.apple.com/app/floriva",
        STORE_URL_ANDROID: "https://play.google.com/store/apps/details?id=app.floriva",
      }),
    );
    const payload = (await response.json()) as {
      integrations: {
        storeRedirects: Record<string, boolean>;
        storeRedirectErrors: Record<string, string>;
      };
    };

    expect(response.status).toBe(200);
    expect(payload.integrations.storeRedirects).toEqual({
      ios: true,
      android: true,
    });
    expect(payload.integrations.storeRedirectErrors).toEqual({});
  });

  it("reports store redirect availability per target without failing on malformed URLs", async () => {
    const response = await onRequest(
      buildContext({
        STORE_URL_IOS: "https://apps.apple.com/app/floriva",
        STORE_URL_ANDROID: "not a url",
      }),
    );
    const payload = (await response.json()) as {
      integrations: {
        storeRedirects: Record<string, boolean>;
        storeRedirectErrors: Record<string, string>;
      };
    };

    expect(response.status).toBe(200);
    expect(payload.integrations.storeRedirects).toEqual({
      ios: true,
      android: false,
    });
    expect(payload.integrations.storeRedirectErrors).toEqual({
      android: expect.stringContaining("Invalid URL"),
    });
  });
});
