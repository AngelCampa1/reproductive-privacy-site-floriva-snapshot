import { act } from "react";
import { createRoot } from "react-dom/client";
import { MemoryRouter } from "react-router-dom";
import { afterEach, describe, expect, it, vi } from "vitest";

// vi.mock calls are hoisted — they run before module imports.
// This file is separate so this mock does NOT affect home-page.test.tsx.

// FAQ JSON-LD false arm: buildFaqPageJsonLd returns null -> faqBlock falsy -> returns blocks as-is.
vi.mock("@/site/structured-data", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/site/structured-data")>();
  return { ...actual, buildFaqPageJsonLd: () => null };
});

// Import AFTER the mock is registered (hoisting ensures the mock wins at module eval time).
import { HomePage } from "@/pages/home-page";

(globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT: boolean }).IS_REACT_ACT_ENVIRONMENT =
  true;

function setupBrowserMocks() {
  window.matchMedia = vi.fn().mockReturnValue({
    addEventListener: vi.fn(),
    matches: true,
    removeEventListener: vi.fn(),
  });
  globalThis.IntersectionObserver = vi.fn().mockImplementation(() => ({
    disconnect: vi.fn(),
    observe: vi.fn(),
    unobserve: vi.fn(),
  }));
}

describe("HomePage fallback branches", () => {
  afterEach(() => {
    vi.restoreAllMocks();
    document.body.innerHTML = "";
  });

  it("renders with a null faqBlock", async () => {
    setupBrowserMocks();
    const host = document.createElement("div");
    document.body.append(host);
    const root = createRoot(host);

    await act(async () => {
      root.render(
        <MemoryRouter>
          <HomePage />
        </MemoryRouter>,
      );
    });

    // Page still renders end to end (buildFaqPageJsonLd() === null doesn't throw
    // and the FAQ list still renders from live knowledge data).
    expect(document.querySelector("h1")).not.toBeNull();
    expect(document.querySelectorAll(".faq-item").length).toBeGreaterThan(0);
  });
});
