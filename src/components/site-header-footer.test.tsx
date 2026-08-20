import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { MemoryRouter } from "react-router-dom";
import { afterEach, describe, expect, it, vi } from "vitest";
import { SiteFooter } from "@/components/site-footer";
import { SiteHeader } from "@/components/site-header";
import { florivaKnowledge } from "@/site/knowledge";

(globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

async function renderHeaderAndFooter() {
  window.matchMedia = vi.fn().mockReturnValue({
    addEventListener: vi.fn(),
    matches: true,
    removeEventListener: vi.fn(),
  });

  const host = document.createElement("div");
  document.body.append(host);
  const root = createRoot(host);

  await act(async () => {
    root.render(
      <MemoryRouter>
        <SiteHeader />
        <SiteFooter />
      </MemoryRouter>,
    );
  });

  await act(async () => {
    await Promise.resolve();
  });

  return root;
}

describe("SiteHeader and SiteFooter", () => {
  const roots: Root[] = [];

  afterEach(async () => {
    vi.restoreAllMocks();
    await act(async () => {
      roots.splice(0).forEach((root) => root.unmount());
    });
    document.body.innerHTML = "";
  });

  it("renders canonical navigation and footer copy from public knowledge", async () => {
    const root = await renderHeaderAndFooter();
    roots.push(root);

    expect(document.querySelector(".brandmark__tag")?.textContent).toBe(
      florivaKnowledge.marketing.homepage.heroTrustSignal,
    );

    for (const item of florivaKnowledge.navigation.nav) {
      if (item.href === "/resources") {
        expect(document.querySelector(".site-nav__menu summary")?.textContent).toBe(item.label);
      } else {
        const navLink = Array.from(document.querySelectorAll<HTMLAnchorElement>(".site-nav > a")).find(
          (link) => link.getAttribute("href") === item.href,
        );
        expect(navLink?.textContent, item.href).toContain(item.label);
      }
    }

    const headerCta = document.querySelector<HTMLAnchorElement>(".site-header__cta");
    expect(headerCta?.getAttribute("href")).toBe("/get");
    expect(headerCta?.textContent).toBe("Get the app");

    expect(document.querySelector(".site-footer__intro")?.textContent).toContain(
      florivaKnowledge.marketing.homepage.tagline,
    );

    for (const group of florivaKnowledge.navigation.footerGroups) {
      expect(document.body.textContent, group.heading).toContain(group.heading);
      for (const link of group.links) {
        const footerLink = Array.from(document.querySelectorAll<HTMLAnchorElement>(".site-footer a")).find(
          (anchor) => anchor.getAttribute("href") === link.href,
        );
        expect(footerLink?.textContent, link.href).toContain(link.label);
      }
    }
  });

  it("keeps the mega-menu out of the page heading outline", async () => {
    const root = await renderHeaderAndFooter();
    roots.push(root);

    // The panel is in the DOM of every page. Any heading in here lands in that
    // page's outline above its own <h1>, so the panel must contribute none.
    const panel = document.querySelector(".resources-megamenu");
    expect(panel).not.toBeNull();
    expect(panel?.querySelectorAll("h1, h2, h3, h4, h5, h6").length).toBe(0);

    // Group names still need to reach assistive tech, just not as headings.
    const groups = document.querySelectorAll(".resources-megamenu__group");
    expect(groups.length).toBeGreaterThan(0);
    for (const group of groups) {
      const heading = group.querySelector(".resources-megamenu__group-heading");
      expect(heading?.textContent?.trim()).toBeTruthy();
      expect(group.querySelector("ul")?.getAttribute("aria-labelledby")).toBe(heading?.id);
    }
  });

  it("exposes the mega-menu disclosure state on the summary", async () => {
    const root = await renderHeaderAndFooter();
    roots.push(root);

    const details = document.querySelector<HTMLDetailsElement>(".site-nav__menu");
    const summary = details?.querySelector("summary");
    expect(summary?.getAttribute("aria-expanded")).toBe("false");
    expect(summary?.getAttribute("aria-controls")).toBe(document.querySelector(".resources-megamenu")?.id);

    await act(async () => {
      details!.open = true;
      details!.dispatchEvent(new Event("toggle"));
    });

    expect(summary?.getAttribute("aria-expanded")).toBe("true");
  });

  it("keeps mega-menu groups balanced and non-duplicating", async () => {
    const root = await renderHeaderAndFooter();
    roots.push(root);

    const hrefs = Array.from(
      document.querySelectorAll<HTMLAnchorElement>(".resources-megamenu__links a"),
    ).map((link) => link.getAttribute("href"));

    expect(hrefs.length).toBeGreaterThan(0);
    expect(new Set(hrefs).size, "a destination is listed twice in the panel").toBe(hrefs.length);

    // A group costs a heading and a full grid column. Three of the old five
    // groups held exactly one link, which is what left a hole on row three and
    // pushed the panel past the viewport. A group that thin belongs in another
    // column, or in the top-level nav.
    const groups = Array.from(document.querySelectorAll(".resources-megamenu__group"));
    for (const group of groups) {
      const label = group.querySelector(".resources-megamenu__group-heading")?.textContent;
      expect(group.querySelectorAll("a").length, `group "${label}" is too thin to be its own column`)
        .toBeGreaterThanOrEqual(3);
    }

    // A whole group existing only to repeat a top-level nav destination was the
    // "By State" case. A hub may still lead its own column (e.g. /compare).
    const topLevelHrefs = new Set<string>(florivaKnowledge.navigation.nav.map((item) => item.href));
    for (const group of groups) {
      const groupHrefs = Array.from(group.querySelectorAll("a")).map((a) => a.getAttribute("href") ?? "");
      const label = group.querySelector(".resources-megamenu__group-heading")?.textContent;
      expect(
        groupHrefs.every((href) => topLevelHrefs.has(href)),
        `group "${label}" only repeats top-level nav items`,
      ).toBe(false);
    }
  });
});
