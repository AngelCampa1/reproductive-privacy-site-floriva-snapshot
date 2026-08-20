import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { MemoryRouter, Route, Routes, useNavigate } from "react-router-dom";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

// Isolate SiteShell layout behavior from its children's internals.
vi.mock("@/components/site-header", () => ({
  SiteHeader: () => <header data-testid="site-header" />,
}));
vi.mock("@/components/site-footer", () => ({
  SiteFooter: () => <footer data-testid="site-footer" />,
}));
vi.mock("@/components/exit-intent-lead-magnet", () => ({
  ExitIntentLeadMagnet: () => null,
}));

import { SiteShell } from "@/components/site-shell";

(globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

function GoToB() {
  const navigate = useNavigate();
  return (
    <button type="button" onClick={() => navigate("/b")}>
      go
    </button>
  );
}

async function renderShell(initialPath = "/a") {
  const host = document.createElement("div");
  document.body.append(host);
  const root = createRoot(host);
  await act(async () => {
    root.render(
      <MemoryRouter initialEntries={[initialPath]}>
        <Routes>
          <Route element={<SiteShell />}>
            <Route
              path="/a"
              element={
                <div>
                  <span>Page A</span>
                  <GoToB />
                </div>
              }
            />
            <Route path="/b" element={<span>Page B</span>} />
          </Route>
        </Routes>
      </MemoryRouter>,
    );
  });
  return root;
}

describe("SiteShell", () => {
  const roots: Root[] = [];
  let scrollTo: ReturnType<typeof vi.fn>;
  let focusSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    scrollTo = vi.fn();
    window.scrollTo = scrollTo as unknown as typeof window.scrollTo;
    focusSpy = vi.spyOn(HTMLElement.prototype, "focus");
  });

  afterEach(() => {
    act(() => {
      roots.splice(0).forEach((root) => root.unmount());
    });
    vi.restoreAllMocks();
    document.body.innerHTML = "";
  });

  it("renders the skip link, focusable main, header, and footer", async () => {
    roots.push(await renderShell());

    const skip = document.querySelector<HTMLAnchorElement>("a.skip-link");
    expect(skip?.getAttribute("href")).toBe("#main-content");

    const main = document.querySelector<HTMLElement>("main#main-content");
    expect(main).not.toBeNull();
    expect(main?.getAttribute("tabindex")).toBe("-1");
    expect(main?.textContent).toContain("Page A");

    expect(document.querySelector('[data-testid="site-header"]')).not.toBeNull();
    expect(document.querySelector('[data-testid="site-footer"]')).not.toBeNull();
  });

  it("scrolls to top on first mount without stealing focus", async () => {
    roots.push(await renderShell());

    expect(scrollTo).toHaveBeenCalledWith(0, 0);
    // First mount must not move focus (only subsequent navigations should).
    expect(focusSpy).not.toHaveBeenCalled();
  });

  it("moves focus to main and scrolls on a subsequent navigation", async () => {
    roots.push(await renderShell());
    scrollTo.mockClear();

    const button = document.querySelector<HTMLButtonElement>("button");
    await act(async () => {
      button?.click();
    });

    expect(document.querySelector("main#main-content")?.textContent).toContain("Page B");
    expect(scrollTo).toHaveBeenCalledWith(0, 0);
    expect(focusSpy).toHaveBeenCalledWith({ preventScroll: true });
  });
});
