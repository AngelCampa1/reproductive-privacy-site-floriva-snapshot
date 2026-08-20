import { describe, expect, it } from "vitest";
import { collectionDefinitions } from "@/site/config";
import {
  buildCanonicalUrl,
  buildDocumentTitle,
  buildOgImageUrl,
  normalizePathname,
  resolvePageMeta,
} from "@/site/page-meta";
import { siteSeo } from "@/site/seo";

describe("normalizePathname", () => {
  it("preserves root", () => {
    expect(normalizePathname("/")).toBe("/");
  });

  it("strips trailing slashes", () => {
    expect(normalizePathname("/compare/alternatives/")).toBe("/compare/alternatives");
  });

  it("collapses multiple trailing slashes", () => {
    expect(normalizePathname("/resources///")).toBe("/resources");
  });
});

describe("buildDocumentTitle", () => {
  it("keeps page titles unsuffixed so SERP titles stay concise", () => {
    expect(buildDocumentTitle("Best Private Period Trackers")).toBe(
      "Best Private Period Trackers",
    );
  });

  it("does not double-append when title already starts with Floriva", () => {
    expect(buildDocumentTitle(siteSeo.homeTitle)).toBe(siteSeo.homeTitle);
  });
});

describe("buildCanonicalUrl", () => {
  it("produces absolute https URL for root", () => {
    expect(buildCanonicalUrl("/")).toBe("https://floriva.app/");
  });

  it("normalizes trailing slash", () => {
    expect(buildCanonicalUrl("/compare/alternatives/")).toBe(
      "https://floriva.app/compare/alternatives",
    );
  });
});

describe("buildOgImageUrl", () => {
  it("returns default when undefined", () => {
    expect(buildOgImageUrl(undefined)).toBe(`https://floriva.app${siteSeo.defaultOgImagePath}`);
  });

  it("passes through absolute URLs", () => {
    expect(buildOgImageUrl("https://example.com/og.png")).toBe("https://example.com/og.png");
  });

  it("resolves relative paths against the site domain", () => {
    expect(buildOgImageUrl("/og/lead-magnets/test.png")).toBe(
      "https://floriva.app/og/lead-magnets/test.png",
    );
  });
});

describe("resolvePageMeta", () => {
  it("returns home metadata for root", () => {
    const meta = resolvePageMeta("/");
    expect(meta.pageType).toBe("home");
    expect(meta.status).toBe(200);
    expect(meta.noIndex).toBe(false);
    expect(meta.title).toBe(siteSeo.homeTitle);
    expect(meta.ogImage).toMatch(/^https:\/\/floriva\.app\//);
  });

  it("returns hub metadata for /compare", () => {
    const meta = resolvePageMeta("/compare");
    expect(meta.pageType).toBe("hub");
    expect(meta.status).toBe(200);
  });

  it("returns hub metadata for /free", () => {
    const meta = resolvePageMeta("/free");
    expect(meta.pageType).toBe("hub");
  });

  it("returns content metadata with ogImage and contentEntry for known content route", () => {
    const meta = resolvePageMeta("/compare/alternatives/flo-app-alternative");
    expect(meta.pageType).toBe("content");
    expect(meta.contentEntry).toBeDefined();
    expect(meta.contentEntry?.faqs).toBeDefined();
    expect(meta.ogImage).toMatch(/^https:\/\/floriva\.app\/og\//);
    expect(meta.noIndex).toBe(false);
  });

  it("returns notFound with 404 for unknown content route", () => {
    const meta = resolvePageMeta("/compare/alternatives/this-does-not-exist");
    expect(meta.pageType).toBe("notFound");
    expect(meta.status).toBe(404);
    expect(meta.noIndex).toBe(true);
  });

  it("returns content-aware 404 metadata for every collection route base", () => {
    for (const definition of Object.values(collectionDefinitions)) {
      const meta = resolvePageMeta(`${definition.routeBase}/this-does-not-exist`);

      expect(meta.pageType).toBe("notFound");
      expect(meta.status).toBe(404);
      expect(meta.noIndex).toBe(true);
    }
  });

  it("normalizes trailing slashes before resolving", () => {
    const meta = resolvePageMeta("/compare/");
    expect(meta.pageType).toBe("hub");
    expect(meta.canonicalPath).toBe("/compare");
  });
});
