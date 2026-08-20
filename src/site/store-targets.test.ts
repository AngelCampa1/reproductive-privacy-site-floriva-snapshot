import { describe, expect, it, vi } from "vitest";
import {
  defaultStoreRedirectAvailability,
  getStoreRedirectAvailability,
  getStoreRedirectHref,
  getStoreTarget,
  hasLiveStoreTargets,
  storeTargets,
} from "@/site/store-targets";

describe("store targets", () => {
  it("resolves known targets", () => {
    expect(getStoreTarget("ios")).toEqual(storeTargets.ios);
    expect(getStoreTarget("android")).toEqual(storeTargets.android);
    expect(storeTargets.android.href).toBe(
      "https://play.google.com/store/apps/details?id=app.floriva",
    );
  });

  it("rejects unknown targets", () => {
    expect(getStoreTarget("web")).toBeNull();
  });

  it("builds store redirect paths for the edge endpoint", () => {
    expect(getStoreRedirectHref("ios")).toBe("/api/store/ios");
    expect(getStoreRedirectHref("android")).toBe("/api/store/android");
  });

  it("starts with no live links until the real store URLs are provided", () => {
    expect(hasLiveStoreTargets()).toBe(false);
  });

  it("uses health payloads to expose live edge redirects", async () => {
    const fetcher = async () =>
      new Response(
        JSON.stringify({
          integrations: {
            storeRedirects: {
              ios: true,
              android: true,
            },
          },
        }),
      );

    await expect(getStoreRedirectAvailability(fetcher as typeof fetch)).resolves.toEqual({
      ios: true,
      android: true,
    });
  });

  it("falls back safely when the health payload is missing", async () => {
    const fetcher = async () => new Response(JSON.stringify({ ok: true }));

    await expect(getStoreRedirectAvailability(fetcher as typeof fetch)).resolves.toEqual(
      defaultStoreRedirectAvailability,
    );
  });

  it("does not poll the edge health endpoint during plain Vite dev", async () => {
    const fetcher = vi.fn();
    const originalFetch = globalThis.fetch;

    vi.stubGlobal("fetch", fetcher);

    try {
      await expect(getStoreRedirectAvailability()).resolves.toEqual(defaultStoreRedirectAvailability);
      expect(fetcher).not.toHaveBeenCalled();
    } finally {
      vi.stubGlobal("fetch", originalFetch);
    }
  });
});
