import { describe, expect, it } from "vitest";
import { onRequest } from "./[[path]]";

describe("/ph/*", () => {
  it("documents the retired PostHog proxy behavior", async () => {
    const response = await onRequest({} as Parameters<typeof onRequest>[0]);
    const payload = await response.json();

    expect(response.status).toBe(404);
    expect(payload).toEqual({
      ok: false,
      error: {
        code: "POSTHOG_ENDPOINT_RETIRED",
        message: "This analytics endpoint has been retired.",
      },
    });
  });
});
