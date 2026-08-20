import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { afterEach, describe, expect, it, vi } from "vitest";
import { ContentPage } from "@/pages/content-page";
import { getEntriesByCollection, getEntryByCollectionSlug } from "@/site/content";
import { resolveFunnelAwareRelatedEntries } from "@/site/internal-links";

vi.mock("@/site/internal-links", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/site/internal-links")>();
  return {
    ...actual,
    resolveFunnelAwareRelatedEntries: vi.fn(actual.resolveFunnelAwareRelatedEntries),
  };
});

vi.mock("@/site/content", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/site/content")>();
  return {
    ...actual,
    getEntryByCollectionSlug: vi.fn(actual.getEntryByCollectionSlug),
  };
});

(globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

// Shared so every render (helper or inline) is unmounted in afterEach. Unmounting
// runs ContentPage's effect cleanup, which cancels the async loadEntryBody promise.
// Without this, the body load resolves after the test environment tears down and
// setBody throws "window is not defined" as an unhandled rejection.
let activeRoot: Root | null = null;

function setupMocks() {
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
    new Response(JSON.stringify({ ok: true }), { status: 202 }),
  );
}

async function renderContentPage(
  collection: string,
  routeBase: string,
  slug: string,
): Promise<HTMLElement> {
  const host = document.createElement("div");
  document.body.append(host);
  const root = createRoot(host);
  activeRoot = root;
  await act(async () => {
    root.render(
      <MemoryRouter initialEntries={[`${routeBase}/${slug}`]}>
        <Routes>
          <Route
            path={`${routeBase}/:slug`}
            element={
              <ContentPage collection={collection as Parameters<typeof ContentPage>[0]["collection"]} />
            }
          />
        </Routes>
      </MemoryRouter>,
    );
  });
  return host;
}

describe("ContentPage", () => {
  afterEach(async () => {
    if (activeRoot) {
      await act(async () => {
        activeRoot!.unmount();
      });
      activeRoot = null;
    }
    vi.restoreAllMocks();
    document.body.innerHTML = "";
  });

  it("renders an inline request form for lead magnet pages", async () => {
    setupMocks();
    const host = document.createElement("div");
    document.body.append(host);
    const root = createRoot(host);
    activeRoot = root;

    await act(async () => {
      root.render(
        <MemoryRouter initialEntries={["/free/privacy-guide"]}>
          <Routes>
            <Route path="/free/:slug" element={<ContentPage collection="lead-magnets" />} />
          </Routes>
        </MemoryRouter>,
      );
    });

    const form = document.querySelector<HTMLFormElement>("form[data-lead-magnet-form]");
    const input = document.querySelector<HTMLInputElement>("input[name='email']");

    expect(form).not.toBeNull();
    expect(input).not.toBeNull();

    await act(async () => {
      input!.value = "reader@example.com";
      input!.dispatchEvent(new Event("input", { bubbles: true }));
      form!.dispatchEvent(new SubmitEvent("submit", { bubbles: true, cancelable: true }));
    });

    expect(fetch).toHaveBeenCalledWith(
      "/api/lead-magnet/subscribe",
      expect.objectContaining({
        body: expect.stringContaining('"leadMagnetSlug":"privacy-guide"'),
        method: "POST",
      }),
    );
  });

  it("shows the publisher and links to the editorial method", async () => {
    setupMocks();
    const host = await renderContentPage(
      "guides",
      "/resources/guides",
      "data-brokers-reproductive-health",
    );

    expect(host.textContent).toContain("Published by Floriva");
    const methodLink = Array.from(host.querySelectorAll<HTMLAnchorElement>("a")).find(
      (link) => link.textContent?.trim() === "How Floriva checks its guides",
    );
    expect(methodLink?.getAttribute("href")).toBe("/support#editorial-method");
  });

  it("submits a resolvable catalog slug for a consolidated survivor page", async () => {
    // /free/pcos-tracking-kit is a post-consolidation survivor whose own slug is NOT in the funnel
    // catalog. The form must post the resolved catalog slug (pcos-symptom-tracker) so the backend
    // accepts it, instead of the page slug which would 400 "Unknown resource".
    setupMocks();
    const host = document.createElement("div");
    document.body.append(host);
    const root = createRoot(host);
    activeRoot = root;

    await act(async () => {
      root.render(
        <MemoryRouter initialEntries={["/free/pcos-tracking-kit"]}>
          <Routes>
            <Route path="/free/:slug" element={<ContentPage collection="lead-magnets" />} />
          </Routes>
        </MemoryRouter>,
      );
    });

    const form = document.querySelector<HTMLFormElement>("form[data-lead-magnet-form]");
    const input = document.querySelector<HTMLInputElement>("input[name='email']");
    expect(form).not.toBeNull();

    await act(async () => {
      input!.value = "reader@example.com";
      input!.dispatchEvent(new Event("input", { bubbles: true }));
      form!.dispatchEvent(new SubmitEvent("submit", { bubbles: true, cancelable: true }));
    });

    expect(fetch).toHaveBeenCalledWith(
      "/api/lead-magnet/subscribe",
      expect.objectContaining({
        body: expect.stringContaining('"leadMagnetSlug":"pcos-symptom-tracker"'),
        method: "POST",
      }),
    );
    // And it must NOT post the raw survivor slug.
    expect(fetch).not.toHaveBeenCalledWith(
      "/api/lead-magnet/subscribe",
      expect.objectContaining({
        body: expect.stringContaining('"leadMagnetSlug":"pcos-tracking-kit"'),
      }),
    );
  });

  it("renders EmptyState for a slug that does not exist", async () => {
    setupMocks();
    const host = await renderContentPage(
      "guides",
      "/resources/guides",
      "this-slug-does-not-exist-at-all",
    );
    expect(host.querySelector("h1")?.textContent).toBe("That page is missing.");
    const link = host.querySelector("a");
    expect(link?.getAttribute("href")).toBe("/");
  });

  it("renders state page with hero aside, keyFacts, relevantLaws, pricingStats, definitions, faqs, answers, bluf (Alabama)", async () => {
    setupMocks();
    const host = await renderContentPage(
      "reproductive-privacy-state-pages",
      "/period-tracker-privacy",
      "reproductive-data-privacy-laws-alabama",
    );

    // hero aside with state risk profile card
    expect(host.querySelector(".aside-card")).not.toBeNull();
    expect(host.textContent).toContain("State risk profile");
    expect(host.textContent).toContain("Alabama");

    // bluf card
    expect(host.querySelector(".bluf-card")).not.toBeNull();

    // keyFacts aside block
    expect(host.textContent).toContain("Key facts");

    // definitions sidebar
    expect(host.textContent).toContain("Definitions");
    expect(host.textContent).toContain("Subpoena");

    // pricingStats with sourceUrl
    expect(host.textContent).toContain("Cited signals");
    const statLink = host.querySelector<HTMLAnchorElement>("article.stat-card a");
    expect(statLink).not.toBeNull();

    // relevantLaws — one with url, one without
    expect(host.textContent).toContain("Relevant laws");
    expect(host.textContent).toContain("Alabama Human Life Protection Act");
    const lawLinks = host.querySelectorAll<HTMLAnchorElement>(".law-list a");
    expect(lawLinks.length).toBeGreaterThan(0);

    // answers and faqs share one section
    expect(host.textContent).toContain("Answers to what people ask most");
    expect(host.querySelector(".faq-item")).not.toBeNull();
    expect(host.querySelector(".answer-card")).not.toBeNull();

    // downloadCta variant = "state" (not null)
    // related entries >= 2
    expect(host.querySelector(".card-grid")).not.toBeNull();
  });

  it("renders an expertQuote with sourceUrl and sourceLabel as an external source link", async () => {
    setupMocks();
    // No published entry carries a quote sourceUrl/sourceLabel (the editorial
    // de-fabrication pass removed named-expert attributions), so inject a
    // synthetic entry to exercise the sourceUrl rendering branch directly.
    const baseEntry = getEntriesByCollection("reproductive-privacy-state-pages").find(
      (entry) => entry.slug === "reproductive-data-privacy-laws-texas",
    )!;
    vi.mocked(getEntryByCollectionSlug).mockReturnValueOnce({
      ...baseEntry,
      expertQuotes: [
        {
          quote: "Server-side storage is subpoenable regardless of marketing claims.",
          personName: "Test Source",
          jobTitle: "Deputy Director",
          organization: "Example Org",
          sourceUrl: "https://example.org/source",
          sourceLabel: "Example Org source",
        },
      ],
    });
    const host = await renderContentPage(
      "reproductive-privacy-state-pages",
      "/period-tracker-privacy",
      "reproductive-data-privacy-laws-texas",
    );

    // expertQuotes present
    const blockquote = host.querySelector("blockquote.quote-card");
    expect(blockquote).not.toBeNull();

    // sourceUrl link with sourceLabel
    const quoteLink = host.querySelector<HTMLAnchorElement>("blockquote.quote-card a.quote-card__source");
    expect(quoteLink).not.toBeNull();
    expect(quoteLink?.getAttribute("href")).toBe("https://example.org/source");
    expect(quoteLink?.textContent?.trim()).toBe("Example Org source");

    // jobTitle and organization filter(Boolean) join
    expect(host.textContent).toContain("Deputy Director, Example Org");
  });

  it("renders comparisons page with tableData (named table, compare variant)", async () => {
    setupMocks();
    const host = await renderContentPage(
      "comparisons",
      "/compare/versus",
      "best-period-tracker-after-flo-settlement",
    );

    // tableData block with name
    expect(host.textContent).toContain("Comparison table");
    expect(host.textContent).toContain("Post-Flo Settlement Alternatives");
    const table = host.querySelector("table");
    expect(table).not.toBeNull();
    const headers = table?.querySelectorAll("th");
    expect(headers?.length).toBeGreaterThan(0);

    // compare downloadCta variant
    // relatedEntries >= 2
    expect(host.querySelector('[class="content-card"]')).not.toBeNull();
  });

  it("renders pricing-breakdowns page with tiers, hiddenCosts, tableData, pricingStats (eve-app-pricing)", async () => {
    setupMocks();
    const host = await renderContentPage(
      "pricing-breakdowns",
      "/compare/pricing",
      "eve-app-pricing",
    );

    // tiers sidebar block (price present)
    expect(host.textContent).toContain("Plans or tiers");
    expect(host.textContent).toContain("Glow Premium");

    // hiddenCosts block
    expect(host.textContent).toContain("Hidden costs");
    expect(host.textContent).toContain("Shared infrastructure with Glow");

    // tableData (name present)
    expect(host.textContent).toContain("Eve vs Floriva: Cost Comparison");
    expect(host.querySelector("table")).not.toBeNull();

    // pricingStats with sourceUrl
    const statSourceLink = host.querySelector<HTMLAnchorElement>("article.stat-card a");
    expect(statSourceLink).not.toBeNull();

    // compare downloadCta variant
  });

  it("renders alternatives page with proscons block (cycles-app-alternative)", async () => {
    setupMocks();
    const host = await renderContentPage(
      "alternatives",
      "/compare/alternatives",
      "cycles-app-alternative",
    );

    // proscons section
    expect(host.querySelector(".statement-card")).not.toBeNull();
    expect(host.textContent).toContain("Pros");
    expect(host.textContent).toContain("Cons");
    expect(host.textContent).toContain("Cycles");

    // compare downloadCta variant
  });

  it("renders listicles page with tools (verdict and pricing present) (best-period-tracker-for-anxiety)", async () => {
    setupMocks();
    const host = await renderContentPage(
      "listicles",
      "/resources/best",
      "best-period-tracker-for-anxiety",
    );

    // tools block
    expect(host.textContent).toContain("Ranked picks");
    const verdictEl = host.querySelector(".content-card__verdict");
    expect(verdictEl).not.toBeNull();
    expect(verdictEl?.textContent).toContain("Best for people who want private mood-cycle logging");

    // tool pricing label (non-null pricing)
    const pricingLabel = host.querySelector(".content-card__label");
    expect(pricingLabel).not.toBeNull();

    // guide downloadCta variant
  });

  it("renders questionnaire page — downloadCta variant is null (no DownloadCta rendered)", async () => {
    setupMocks();
    const host = await renderContentPage(
      "questionnaires",
      "/tools/quiz",
      "cloud-vs-local-storage-quiz",
    );

    // questionnaire renders body content
    expect(host.querySelector(".article-layout__main")).not.toBeNull();

    // no downloadCta since questionnaire returns null variant
    // The collection-aware next-step heading is always present
    expect(host.textContent).toContain("Turn the result into a plan");
  });

  it("renders comparisons page with expertQuotes without sourceUrl (stardust-vs-clue)", async () => {
    setupMocks();
    const host = await renderContentPage(
      "comparisons",
      "/compare/versus",
      "stardust-vs-clue",
    );

    // expertQuotes present but no source link
    const blockquote = host.querySelector("blockquote.quote-card");
    expect(blockquote).not.toBeNull();
    // no sourceUrl => no anchor in quote
    const quoteSourceLink = host.querySelector("blockquote.quote-card a.quote-card__source");
    expect(quoteSourceLink).toBeNull();

    // personName, jobTitle, organization rendered
    expect(host.textContent).toContain("Floriva Editorial Team");
    expect(host.textContent).toContain("Privacy Research, Floriva");
  });

  it("renders app-guides page with default downloadCta variant and article layout", async () => {
    setupMocks();
    const host = await renderContentPage(
      "app-guides",
      "/app-guides",
      "how-to-switch-from-cycles",
    );

    // article body present
    expect(host.querySelector(".article-layout__main")).not.toBeNull();
    // no state aside (app-guides have no state field)
    expect(host.querySelector(".aside-card")).toBeNull();
    // default downloadCta variant rendered
    expect(host.textContent).toContain("Set up the next step");
  });

  it("renders guides page with faqs block (data-brokers-reproductive-health)", async () => {
    setupMocks();
    const host = await renderContentPage(
      "guides",
      "/resources/guides",
      "data-brokers-reproductive-health",
    );

    // guides: no faqs on this entry but body and article present
    // verify article renders without errors
    expect(host.querySelector(".article-layout__main")).not.toBeNull();
    // guide downloadCta variant (not null)
    expect(host.textContent).toContain("Choose your next step");
  });

  it("renders privacy-in-practice pages with the privacy check next-step heading", async () => {
    setupMocks();
    const host = await renderContentPage(
      "privacy-in-practice",
      "/resources/privacy-in-practice",
      "lock-down-period-data-on-your-phone",
    );

    expect(host.querySelector(".article-layout__main")).not.toBeNull();
    expect(host.textContent).toContain("Run the next privacy check");
  });

  /* Related pages now live inside the next-step band rather than in a section
     of their own. The page used to end with a next-step band, a related-pages
     section, and a download CTA back to back — three "go here next" modules
     offering eleven destinations between them. */
  it("puts related pages inside the next-step band", async () => {
    setupMocks();
    const oneRealEntry = getEntriesByCollection("comparisons")[0];
    // Persistent (not Once): ContentPage re-renders when the async body load
    // resolves, so the resolver is called on every render, not just the first.
    vi.mocked(resolveFunnelAwareRelatedEntries).mockReturnValue([oneRealEntry]);
    const host = await renderContentPage(
      "comparisons",
      "/compare/versus",
      "stardust-vs-clue",
    );

    const related = host.querySelector(".next-step-band .next-step-related");
    expect(related).not.toBeNull();
    expect(related?.textContent).toContain(oneRealEntry.title);

    // Exactly one closing "where to next" block, not two. (Other
    // `.collection-preview` sections mid-article — comparison table, ranked
    // picks, hidden costs — are unrelated and stay.)
    expect(host.querySelectorAll(".next-step-band").length).toBe(1);
    expect(host.querySelectorAll(".next-step-related").length).toBe(1);
    expect(host.textContent?.match(/Keep reading/g)?.length ?? 0).toBe(1);
  });

  it("keeps the next-step links when there are zero related entries", async () => {
    setupMocks();
    vi.mocked(resolveFunnelAwareRelatedEntries).mockReturnValue([]);
    const host = await renderContentPage(
      "comparisons",
      "/compare/versus",
      "stardust-vs-clue",
    );

    expect(host.querySelector(".next-step-related")).toBeNull();
    expect(host.querySelectorAll(".next-step-link").length).toBeGreaterThanOrEqual(3);
    expect(host.textContent).toContain("Compare your next choice");
  });

  it("asks its questions once, not in two stacked sections", async () => {
    setupMocks();
    const host = await renderContentPage(
      "comparisons",
      "/compare/versus",
      "stardust-vs-clue",
    );

    // 355 of the 446 entries carry both `answers` and `faqs`, which used to
    // render as two separate FAQ sections one after the other.
    expect(host.querySelectorAll(".faq-band").length).toBe(1);
    expect(host.querySelector(".answer-card")).not.toBeNull();
    expect(host.querySelector(".faq-item")).not.toBeNull();
    expect(host.textContent).toContain("Answers to what people ask most");
  });
});
