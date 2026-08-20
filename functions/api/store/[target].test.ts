import { describe, expect, it } from "vitest";
import { onRequest } from "./[target]";
import type { EdgeData, EdgeEnv } from "../../_lib/bindings";

function buildContext(
  target: "ios" | "android" | "auto",
  env: EdgeEnv,
  url = `https://floriva.app/api/store/${target}`,
  headers: Record<string, string> = {},
): EventContext<EdgeEnv, "target", EdgeData> {
  return {
    request: new Request(url, { headers }),
    env,
    params: { target },
    waitUntil() {},
    passThroughOnException() {},
    next: async () => new Response(null, { status: 404 }),
    data: { requestId: "test-request" },
    functionPath: "/api/store/[target]",
  } as unknown as EventContext<EdgeEnv, "target", EdgeData>;
}

describe("/api/store/[target]", () => {
  it("redirects Android requests to the configured Play Store listing", async () => {
    const response = await onRequest(
      buildContext(
        "android",
        {
          STORE_URL_ANDROID: "https://play.google.com/store/apps/details?id=app.floriva",
        },
        "https://floriva.app/api/store/android?utm_source=home&ignored=value",
      ),
    );

    expect(response.status).toBe(302);
    expect(response.headers.get("Location")).toBe(
      "https://play.google.com/store/apps/details?id=app.floriva&utm_source=home",
    );
  });

  it("routes auto requests from Android user agents to the Play Store", async () => {
    const response = await onRequest(
      buildContext(
        "auto",
        {
          STORE_URL_ANDROID: "https://play.google.com/store/apps/details?id=app.floriva",
          STORE_URL_IOS: "https://apps.apple.com/us/app/id6762630858",
        },
        "https://floriva.app/api/store/auto",
        { "user-agent": "Mozilla/5.0 (Linux; Android 15; Pixel 9) AppleWebKit/537.36" },
      ),
    );

    expect(response.status).toBe(302);
    expect(response.headers.get("Location")).toBe(
      "https://play.google.com/store/apps/details?id=app.floriva",
    );
  });

  it("routes auto requests without an Android user agent to the App Store", async () => {
    const response = await onRequest(
      buildContext(
        "auto",
        {
          STORE_URL_ANDROID: "https://play.google.com/store/apps/details?id=app.floriva",
          STORE_URL_IOS: "https://apps.apple.com/us/app/id6762630858",
        },
        "https://floriva.app/api/store/auto",
        { "user-agent": "Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X)" },
      ),
    );

    expect(response.status).toBe(302);
    expect(response.headers.get("Location")).toBe(
      "https://apps.apple.com/us/app/id6762630858",
    );
  });

  it("keeps returning 503 when a target has no configured destination", async () => {
    const response = await onRequest(buildContext("android", {}));

    expect(response.status).toBe(503);
  });
});
