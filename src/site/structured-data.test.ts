import { describe, expect, it } from "vitest";
import {
  buildArticleJsonLd,
  buildBreadcrumbJsonLd,
  buildFaqPageJsonLd,
  buildMobileApplicationJsonLd,
  buildOrganizationJsonLd,
  buildPageJsonLd,
  buildWebSiteJsonLd,
  serializeJsonLd,
} from "@/site/structured-data";
import { resolvePageMeta } from "@/site/page-meta";

describe("buildWebSiteJsonLd", () => {
  it("returns a WebSite block with stable @id", () => {
    const block = buildWebSiteJsonLd();
    expect(block["@type"]).toBe("WebSite");
    expect(block["@id"]).toBe("https://floriva.app/#website");
    expect(block.url).toBe("https://floriva.app/");
  });
});

describe("buildOrganizationJsonLd", () => {
  it("returns Organization with stable @id", () => {
    const block = buildOrganizationJsonLd();
    expect(block["@type"]).toBe("Organization");
    expect(block["@id"]).toBe("https://floriva.app/#organization");
    expect(block.logo).toBe("https://floriva.app/logo-mark.png");
  });
});

describe("buildBreadcrumbJsonLd", () => {
  it("returns null for root", () => {
    expect(buildBreadcrumbJsonLd("/")).toBeNull();
  });

  it("includes Home + each segment in order", () => {
    const block = buildBreadcrumbJsonLd("/compare/alternatives/flo-app-alternative");
    expect(block).not.toBeNull();
    const items = block!.itemListElement as Array<{
      position: number;
      name: string;
      item: string;
    }>;
    expect(items.length).toBe(4);
    expect(items[0]).toMatchObject({ position: 1, name: "Home" });
    expect(items[3]).toMatchObject({ position: 4 });
    expect(items[3].item).toBe("https://floriva.app/compare/alternatives/flo-app-alternative");
  });
});

describe("buildArticleJsonLd", () => {
  it("uses content entry metadata", () => {
    const block = buildArticleJsonLd({
      collection: "guides",
      description: "Desc",
      faqs: [],
      metaDescription: "Desc",
      ogImage: "/og/guides/test.png",
      publishedAt: "2026-01-01",
      routePath: "/resources/guides/test",
      seoTitle: "Test",
      slug: "test",
      title: "Test",
      updatedAt: "2026-02-01",
    });

    expect(block["@type"]).toBe("Article");
    expect(block.datePublished).toBe("2026-01-01");
    expect(block.dateModified).toBe("2026-02-01");
    expect(block.image).toBe("https://floriva.app/og/guides/test.png");
    expect(block.publishingPrinciples).toBe(
      "https://floriva.app/support#editorial-method",
    );
    expect((block.mainEntityOfPage as { "@id": string })["@id"]).toBe(
      "https://floriva.app/resources/guides/test",
    );
  });
});

describe("buildFaqPageJsonLd", () => {
  it("returns null for empty faqs", () => {
    expect(buildFaqPageJsonLd([])).toBeNull();
  });

  it("emits Question/Answer pairs", () => {
    const block = buildFaqPageJsonLd([{ q: "What?", a: "This." }]);
    expect(block).not.toBeNull();
    const entities = block!.mainEntity as Array<{
      name: string;
      acceptedAnswer: { text: string };
    }>;
    expect(entities[0].name).toBe("What?");
    expect(entities[0].acceptedAnswer.text).toBe("This.");
  });
});

describe("buildMobileApplicationJsonLd", () => {
  it("links the site to both real store listings via sameAs", () => {
    const block = buildMobileApplicationJsonLd();
    expect(block["@type"]).toBe("MobileApplication");
    expect(block.sameAs).toContain(
      "https://apps.apple.com/us/app/floriva-private-period-tracker/id6762630858",
    );
    expect(block.sameAs).toContain("https://play.google.com/store/apps/details?id=app.floriva");
  });

  it("never fabricates ratings, reviews, prices, or install counts", () => {
    // Guard against a future "just add an aggregateRating so it gets a rich result"
    // edit. Every one of these needs a verifiable source we do not have.
    // Recursive on purpose: a top-level-key check would miss `offers.price` or a
    // rating nested inside another node.
    const forbidden = new Set([
      "aggregateRating",
      "ratingValue",
      "ratingCount",
      "reviewCount",
      "review",
      "offers",
      "price",
      "priceCurrency",
      "interactionStatistic",
      "downloadUrl",
      "softwareVersion",
      "fileSize",
    ]);

    function findForbidden(value: unknown, path = ""): string[] {
      if (Array.isArray(value)) {
        return value.flatMap((item) => findForbidden(item, path));
      }
      if (value && typeof value === "object") {
        return Object.entries(value as Record<string, unknown>).flatMap(([key, child]) => [
          ...(forbidden.has(key) ? [`${path}.${key}`] : []),
          ...findForbidden(child, `${path}.${key}`),
        ]);
      }
      return [];
    }

    // Cover every page that emits the app entity, not just the builder in isolation.
    expect(findForbidden(buildMobileApplicationJsonLd())).toEqual([]);
    expect(findForbidden(buildPageJsonLd(resolvePageMeta("/")))).toEqual([]);
    expect(findForbidden(buildPageJsonLd(resolvePageMeta("/get")))).toEqual([]);
  });
});

describe("buildPageJsonLd", () => {
  it("emits WebSite + Organization + MobileApplication for home", () => {
    const blocks = buildPageJsonLd(resolvePageMeta("/"));
    const types = blocks.map((block) => block["@type"]);
    expect(types).toContain("WebSite");
    expect(types).toContain("Organization");
    expect(types).toContain("MobileApplication");
  });

  it("emits the app entity on /get with a resolvable publisher reference", () => {
    const blocks = buildPageJsonLd(resolvePageMeta("/get"));
    const types = blocks.map((block) => block["@type"]);
    expect(types).toContain("MobileApplication");

    const app = blocks.find((block) => block["@type"] === "MobileApplication");
    const publisherId = (app?.publisher as { "@id": string })["@id"];
    const ids = blocks.map((block) => block["@id"]);
    expect(ids).toContain(publisherId);
  });

  it("emits Breadcrumb + Article + FAQPage for a content route", () => {
    const meta = resolvePageMeta("/compare/alternatives/flo-app-alternative");
    const blocks = buildPageJsonLd(meta);
    const types = blocks.map((block) => block["@type"]);
    expect(types).toContain("BreadcrumbList");
    expect(types).toContain("Article");
  });

  it("emits Breadcrumb for hub pages", () => {
    const blocks = buildPageJsonLd(resolvePageMeta("/compare"));
    const types = blocks.map((block) => block["@type"]);
    expect(types).toContain("BreadcrumbList");
  });
});

describe("serializeJsonLd", () => {
  it("escapes < to prevent </script> injection", () => {
    const json = serializeJsonLd({ "@type": "X", text: "</script>" });
    expect(json).not.toContain("</script>");
    expect(json).toContain("\\u003c/script>");
  });
});
