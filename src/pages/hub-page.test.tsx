import { act } from "react";
import { createRoot } from "react-dom/client";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { afterEach, describe, expect, it, vi } from "vitest";
import { HubPage } from "@/pages/hub-page";
import { getHubEntries } from "@/site/content";

(globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

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
  vi.spyOn(globalThis, "fetch").mockResolvedValue(
    new Response(JSON.stringify({ integrations: { storeRedirects: { ios: false, android: false } } }), { status: 200 }),
  );
}

describe("HubPage", () => {
  afterEach(() => {
    vi.restoreAllMocks();
    document.body.innerHTML = "";
  });

  it("renders guided starting points before the compare grid", async () => {
    setupBrowserMocks();
    const host = document.createElement("div");
    document.body.append(host);
    const root = createRoot(host);

    await act(async () => {
      root.render(
        <MemoryRouter initialEntries={["/compare"]}>
          <Routes>
            <Route
              path="/compare"
              element={
                <HubPage
                  collections={["alternatives", "comparisons", "pricing-breakdowns"]}
                  description="Alternatives, versus pages, and pricing breakdowns for people actively leaving mainstream period trackers."
                  title="Compare period trackers"
                />
              }
            />
          </Routes>
        </MemoryRouter>,
      );
    });

    const guide = document.querySelector(".hub-guide");

    expect(guide?.textContent).toContain("Choose your path");
    expect(guide?.textContent).toContain("Find a new app to switch to");
    expect(
      Array.from(guide?.querySelectorAll<HTMLAnchorElement>("a") ?? []).map((link) => link.getAttribute("href")),
    ).toEqual(expect.arrayContaining(["/compare/alternatives", "/compare/versus", "/compare/pricing"]));
  });

  it("renders pillar hubs as grouped sections with attached resources", async () => {
    setupBrowserMocks();
    const host = document.createElement("div");
    document.body.append(host);
    const root = createRoot(host);

    await act(async () => {
      root.render(
        <MemoryRouter initialEntries={["/resources/health"]}>
          <Routes>
            <Route
              path="/resources/health"
              element={
                <HubPage
                  collections={["symptom-guides", "condition-guides", "hormone-guides", "wellness-guides", "life-stage-guides"]}
                  description="Health tracking guides for symptoms, conditions, hormones, wellness, and life-stage changes."
                  title="Health tracking resources"
                />
              }
            />
          </Routes>
        </MemoryRouter>,
      );
    });

    const sections = Array.from(document.querySelectorAll(".pillar-section"));

    expect(sections.length).toBeGreaterThanOrEqual(5);
    expect(document.body.textContent).toContain("Symptom Guides");
    expect(document.body.textContent).toContain("Condition Guides");
    expect(document.body.textContent).toContain("Hormone Guides");
    expect(document.querySelector<HTMLAnchorElement>('a[href^="/resources/symptom-guides/"]')).not.toBeNull();
    expect(document.querySelector<HTMLAnchorElement>('a[href^="/resources/condition-guides/"]')).not.toBeNull();
  });

  it("renders state-tier sections for a state-only hub", async () => {
    setupBrowserMocks();
    const host = document.createElement("div");
    document.body.append(host);
    const root = createRoot(host);

    await act(async () => {
      root.render(
        <MemoryRouter initialEntries={["/period-tracker-privacy"]}>
          <Routes>
            <Route
              path="/period-tracker-privacy"
              element={
                <HubPage
                  collections={["reproductive-privacy-state-pages"]}
                  description="State-by-state legal context for reproductive data risk."
                  title="Period tracker privacy by state"
                />
              }
            />
          </Routes>
        </MemoryRouter>,
      );
    });

    const stateTiers = document.querySelectorAll(".state-tier");
    expect(stateTiers.length).toBeGreaterThan(0);

    const stateCards = document.querySelectorAll(".content-card--state");
    expect(stateCards.length).toBeGreaterThan(0);

    // stateCardTitle uses entry.state ?? entry.title
    const stateEntries = getHubEntries(["reproductive-privacy-state-pages"]);
    expect(stateEntries.length).toBeGreaterThan(0);

    // heading should indicate state-only mode
    expect(document.body.textContent).toContain("Check what changes where you live");
  });

  it("renders a non-pillar hub as a card grid with its own authored guide cards", async () => {
    setupBrowserMocks();
    const host = document.createElement("div");
    document.body.append(host);
    const root = createRoot(host);

    await act(async () => {
      root.render(
        <MemoryRouter initialEntries={["/resources/best"]}>
          <Routes>
            <Route
              path="/resources/best"
              element={
                <HubPage
                  collections={["listicles"]}
                  description="Curated rankings for people narrowing their options."
                  title="Best private period trackers"
                />
              }
            />
          </Routes>
        </MemoryRouter>,
      );
    });

    // Default else grid branch (not stateOnly, no pillarHub)
    const grid = document.querySelector(".shell.card-grid");
    expect(grid).not.toBeNull();
    expect(grid?.querySelectorAll(".content-card").length).toBeGreaterThan(0);

    /* This used to assert the opposite: that a hub with no authored cards fell
       through to synthesizing three from `nextStepLinks`, each carrying the same
       hardcoded body sentence. That fallback shipped boilerplate on 12 of the 18
       hubs and duplicated the page's own footer band, so it is gone. A hub now
       renders the cards written for it in `marketing-links.ts`. */
    const guidedCards = Array.from(document.querySelectorAll(".guided-entry-card"));
    expect(guidedCards.length).toBe(3);

    const cardLinks = guidedCards.map((el) => el.getAttribute("href"));
    expect(new Set(cardLinks).size).toBe(cardLinks.length);
    expect(cardLinks).not.toContain("/resources/best");

    const bodies = guidedCards.map((el) => el.querySelectorAll("p")[1]?.textContent);
    expect(new Set(bodies).size, "guide cards share a body").toBe(bodies.length);
  });

  it("renders with lead-magnet download variant", async () => {
    setupBrowserMocks();
    const host = document.createElement("div");
    document.body.append(host);
    const root = createRoot(host);

    await act(async () => {
      root.render(
        <MemoryRouter initialEntries={["/resources/best"]}>
          <Routes>
            <Route
              path="/resources/best"
              element={
                <HubPage
                  collections={["lead-magnets"]}
                  description="Free privacy guides, templates, and scorecards."
                  title="Free resources"
                />
              }
            />
          </Routes>
        </MemoryRouter>,
      );
    });

    // The DownloadCta with variant="lead-magnet" should render; page should contain free resource entries
    const chips = document.querySelectorAll(".info-chip");
    const chipTexts = Array.from(chips).map((c) => c.textContent ?? "");
    expect(chipTexts.some((t) => t.includes("Free Resources"))).toBe(true);
  });

  it("updates matching-pages chip when search input changes", async () => {
    setupBrowserMocks();
    const host = document.createElement("div");
    document.body.append(host);
    const root = createRoot(host);

    await act(async () => {
      root.render(
        <MemoryRouter initialEntries={["/resources/best"]}>
          <Routes>
            <Route
              path="/resources/best"
              element={
                <HubPage
                  collections={["listicles"]}
                  description="Curated rankings for people narrowing their options."
                  title="Best private period trackers"
                />
              }
            />
          </Routes>
        </MemoryRouter>,
      );
    });

    const input = document.querySelector<HTMLInputElement>('input[name="query"]');
    expect(input).not.toBeNull();

    const chipBefore = document.querySelector(".info-chip--soft");
    const countBefore = chipBefore?.textContent ?? "";

    await act(async () => {
      // React reads event.currentTarget.value; we need to set it on the input
      // and dispatch a synthetic change event via Object.defineProperty
      const nativeInputValueSetter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, "value")?.set;
      nativeInputValueSetter?.call(input!, "zzznomatch");
      const event = new Event("input", { bubbles: true });
      input!.dispatchEvent(event);

      // Also fire the React synthetic change event
      const changeEvent = new Event("change", { bubbles: true });
      Object.defineProperty(changeEvent, "currentTarget", { value: input, writable: false });
      input!.dispatchEvent(changeEvent);
    });

    const chipAfter = document.querySelector(".info-chip--soft");
    const countAfter = chipAfter?.textContent ?? "";

    // After typing a non-matching query, count should drop to "0 matching pages"
    // (startTransition batches but in test act() it flushes synchronously)
    expect(countAfter).not.toBe(countBefore);
    expect(countAfter).toContain("0 matching pages");
  });
});
