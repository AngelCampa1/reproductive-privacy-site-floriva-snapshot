import { act } from "react";
import { createRoot } from "react-dom/client";
import { MemoryRouter } from "react-router-dom";
import { afterEach, describe, expect, it, vi } from "vitest";
import { HomePage } from "@/pages/home-page";
import { florivaKnowledge } from "@/site/knowledge";

(globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

const homepageKnowledge = florivaKnowledge.marketing.homepage;

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

describe("HomePage", () => {
  afterEach(() => {
    vi.restoreAllMocks();
    document.body.innerHTML = "";
  });

  it("renders the app-showcase hero, journey, bento, privacy, CTA, and FAQ sections", async () => {
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

    // Hero: h1 built from tagline + the single italic accent word.
    const h1 = document.querySelector("h1");
    expect(h1?.textContent).toBe(homepageKnowledge.tagline);
    expect(h1?.querySelector("em")?.textContent).toBe(homepageKnowledge.heroEmphasisWord);
    expect(document.body.textContent).toContain(homepageKnowledge.subheadline);
    expect(document.body.textContent).toContain(homepageKnowledge.heroTrustSignal);

    // The homepage sells the app only: it must not link into the SEO
    // compare/resources/state-page funnel (guided-entry cards, switch band).
    expect(document.querySelectorAll("a.guided-entry-card")).toHaveLength(0);
    expect(document.querySelector("a.button-link--primary")).toBeNull();
    expect(document.querySelector('a[href="/compare"]')).toBeNull();
    expect(document.querySelector('a[href="/period-tracker-privacy"]')).toBeNull();
    expect(document.querySelector('a[href="/resources"]')).toBeNull();

    // Journey: intro heading plus all 4 step headings/bodies.
    expect(document.body.textContent).toContain("What using Floriva feels like");
    for (const step of homepageKnowledge.journey) {
      expect(document.body.textContent).toContain(step.heading);
      expect(document.body.textContent).toContain(step.body);
    }

    // Bento: all 8 feature cells render, including the stat cell.
    for (const cell of homepageKnowledge.bento) {
      expect(document.body.textContent, cell.title).toContain(cell.title);
    }
    expect(document.querySelector(".bento-cell__stat-value")?.textContent).toBe(
      homepageKnowledge.bento.find((cell) => cell.stat)?.stat?.value,
    );

    // Privacy section: heading with the italic accent word, and both paragraphs.
    // No outbound link here either (dropped along with the SEO funnel links).
    expect(document.body.textContent).toContain(homepageKnowledge.privacy.eyebrow);
    for (const paragraph of homepageKnowledge.privacy.paragraphs) {
      expect(document.body.textContent).toContain(paragraph);
    }

    // Store CTA band: no Floriva price figures, QR block, and store buttons.
    expect(document.body.textContent).not.toMatch(/\$\d/);
    expect(
      document.querySelector<HTMLImageElement>('img[src="/qr/get-floriva.svg"]')?.getAttribute("alt"),
    ).toBe("QR code that opens Floriva's app store page");
    expect(document.querySelectorAll(".store-buttons").length).toBeGreaterThanOrEqual(2);

    // FAQ: every knowledge FAQ renders as an accordion item.
    const faqSummaries = Array.from(document.querySelectorAll(".faq-item summary")).map(
      (node) => node.textContent,
    );
    for (const faq of homepageKnowledge.faqs) {
      expect(faqSummaries).toContain(faq.q);
    }
  });
});
