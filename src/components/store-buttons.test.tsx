import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, describe, expect, it, vi } from "vitest";
import { StoreButtons } from "@/components/store-buttons";
import type { StoreRedirectAvailability } from "@/site/store-targets";

const storeAvailability = vi.hoisted(() => ({
  current: { ios: true, android: true } as StoreRedirectAvailability,
}));

vi.mock("@/site/store-targets", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/site/store-targets")>();

  return {
    ...actual,
    getStoreRedirectAvailability: vi.fn(async () => storeAvailability.current),
  };
});

(globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

async function renderStoreButtons() {
  const host = document.createElement("div");
  document.body.append(host);
  const root = createRoot(host);

  await act(async () => {
    root.render(<StoreButtons />);
  });

  await act(async () => {
    await Promise.resolve();
  });

  return { host, root };
}

describe("StoreButtons", () => {
  const roots: Root[] = [];

  afterEach(async () => {
    await act(async () => {
      roots.splice(0).forEach((root) => root.unmount());
    });
    document.body.innerHTML = "";
    storeAvailability.current = { ios: true, android: true };
  });

  it("renders the brand store pills when both stores are live, Apple first", async () => {
    const { root } = await renderStoreButtons();
    roots.push(root);

    const container = document.querySelector(".store-buttons");
    const iosPill = document.querySelector<HTMLAnchorElement>('a[href="/api/store/ios"]');
    const androidPill = document.querySelector<HTMLAnchorElement>('a[href="/api/store/android"]');

    expect(container).not.toBeNull();
    expect(iosPill).not.toBeNull();
    expect(androidPill).not.toBeNull();
    expect(iosPill?.classList.contains("store-pill")).toBe(true);
    expect(iosPill?.classList.contains("store-pill--ios")).toBe(true);
    expect(androidPill?.classList.contains("store-pill")).toBe(true);
    expect(androidPill?.classList.contains("store-pill--android")).toBe(true);

    // Apple's guidelines: the App Store link appears first when both store
    // links are shown together.
    const links = Array.from(container?.querySelectorAll("a") ?? []);
    expect(links[0]).toBe(iosPill);
    expect(links[1]).toBe(androidPill);

    // Two-line label: tracked-caps eyebrow + the store name, per pill.
    expect(iosPill?.querySelector(".store-pill__eyebrow")?.textContent).toBe("Download on the");
    expect(iosPill?.querySelector(".store-pill__store")?.textContent).toBe("App Store");
    expect(androidPill?.querySelector(".store-pill__eyebrow")?.textContent).toBe("Get it on");
    expect(androidPill?.querySelector(".store-pill__store")?.textContent).toBe("Google Play");

    // Each pill carries its own glyph (Apple mark / Google Play triangle),
    // not official badge artwork — no <img> badges remain.
    expect(iosPill?.querySelector("svg.store-pill__icon")).not.toBeNull();
    expect(androidPill?.querySelector("svg.store-pill__icon")).not.toBeNull();
    expect(document.querySelector(".store-badge")).toBeNull();
    expect(document.querySelector('img[src^="/badges/"]')).toBeNull();

    expect(document.body.textContent).not.toContain("Coming soon");
  });

  it("keeps the muted pill fallback when the Play redirect is unavailable", async () => {
    storeAvailability.current = { ios: true, android: false };

    const { root } = await renderStoreButtons();
    roots.push(root);

    expect(document.querySelector<HTMLAnchorElement>('a[href="/api/store/ios"]')).not.toBeNull();
    expect(document.querySelector<HTMLAnchorElement>('a[href="/api/store/android"]')).toBeNull();
    expect(document.querySelector(".store-pill--android")).toBeNull();
    expect(document.querySelector(".store-button--muted")).not.toBeNull();
    expect(document.body.textContent).toContain("Coming soon");
  });
});
