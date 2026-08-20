import { buildCrumbs } from "@/components/breadcrumbs-utils";
import type { ContentPageMeta } from "./content-manifest";
import { buildCanonicalUrl, buildOgImageUrl, type ResolvedPageMeta } from "./page-meta";
import { siteSeo } from "./seo";
import { storeTargets } from "./store-targets";

type JsonLdValue =
  | string
  | number
  | boolean
  | null
  | JsonLdObject
  | JsonLdValue[];

type JsonLdObject = { [key: string]: JsonLdValue };

const SITE_URL = `https://${siteSeo.domain}`;

export function buildWebSiteJsonLd(): JsonLdObject {
  return {
    "@context": "https://schema.org",
    "@type": "WebSite",
    "@id": `${SITE_URL}/#website`,
    name: siteSeo.name,
    url: `${SITE_URL}/`,
    description: siteSeo.metaDescription,
    inLanguage: "en",
    publisher: { "@id": `${SITE_URL}/#organization` },
  };
}

export function buildOrganizationJsonLd(): JsonLdObject {
  return {
    "@context": "https://schema.org",
    "@type": "Organization",
    "@id": `${SITE_URL}/#organization`,
    name: siteSeo.organization.legalName,
    url: `${SITE_URL}/`,
    logo: `${SITE_URL}/logo-mark.png`,
    sameAs: [...siteSeo.organization.sameAs],
  };
}

/**
 * The app entity itself. Floriva's category SERPs are dominated by app-store
 * listings, and nothing previously tied floriva.app to its own two listings.
 *
 * Deliberately omitted, because the repo holds no verifiable source for them:
 * `aggregateRating`, `ratingValue`, `ratingCount`, `reviewCount`, `review`,
 * download/install counts, `softwareVersion`, `fileSize`, and `offers`.
 * `staticPages.get` documents only that Floriva is a paid app with in-app plan
 * selection — no price, no currency — so `offers` stays out rather than being
 * guessed. Without `offers` or a rating this will not produce a rich result; it
 * exists for entity disambiguation. Adding a real price later is the honest unlock.
 */
export function buildMobileApplicationJsonLd(): JsonLdObject {
  // Read the store listings directly rather than through organization.sameAs:
  // that coupling would turn any future org profile (LinkedIn, Wikidata) into
  // an identity claim about the app.
  const storeUrls = Object.values(storeTargets)
    .map((target) => target.href)
    .filter((href): href is string => Boolean(href));

  return {
    "@context": "https://schema.org",
    "@type": "MobileApplication",
    "@id": `${SITE_URL}/#app`,
    name: siteSeo.name,
    description: siteSeo.metaDescription,
    url: `${SITE_URL}/get`,
    applicationCategory: "HealthApplication",
    operatingSystem: ["iOS", "Android"],
    image: `${SITE_URL}/logo-mark.png`,
    inLanguage: "en",
    // Documented in staticPages.get: "Floriva is a paid app."
    isAccessibleForFree: false,
    sameAs: storeUrls,
    publisher: { "@id": `${SITE_URL}/#organization` },
  };
}

/**
 * Mirrors the visible breadcrumb exactly by sharing `buildCrumbs`.
 *
 * This used to re-implement the URL-splitting independently, so the two could
 * disagree — and did: both emitted a `/tools` crumb for a path that is not a
 * route, one as a dead link and one as a `ListItem.item` URL.
 */
export function buildBreadcrumbJsonLd(pathname: string, overrides?: Record<string, string>): JsonLdObject | null {
  const crumbs = buildCrumbs(pathname, overrides ?? {});

  if (crumbs.length === 0) {
    return null;
  }

  return {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: crumbs.map((crumb, index) => ({
      "@type": "ListItem",
      position: index + 1,
      name: crumb.label,
      item: crumb.to === "/" ? `${SITE_URL}/` : buildCanonicalUrl(crumb.to),
    })),
  };
}

export function buildArticleJsonLd(entry: ContentPageMeta): JsonLdObject {
  const url = buildCanonicalUrl(entry.routePath);

  return {
    "@context": "https://schema.org",
    "@type": "Article",
    mainEntityOfPage: { "@type": "WebPage", "@id": url },
    headline: entry.title,
    description: entry.description,
    image: buildOgImageUrl(entry.ogImage),
    datePublished: entry.publishedAt,
    dateModified: entry.updatedAt,
    inLanguage: "en",
    author: { "@type": "Organization", name: siteSeo.name, url: `${SITE_URL}/` },
    publisher: { "@id": `${SITE_URL}/#organization` },
    publishingPrinciples: `${SITE_URL}/support#editorial-method`,
  };
}

export function buildFaqPageJsonLd(
  faqs: readonly { q: string; a: string }[],
): JsonLdObject | null {
  if (!faqs || faqs.length === 0) {
    return null;
  }

  return {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: faqs.map((faq) => ({
      "@type": "Question",
      name: faq.q,
      acceptedAnswer: { "@type": "Answer", text: faq.a },
    })),
  };
}

export function buildPageJsonLd(pageMeta: ResolvedPageMeta): JsonLdObject[] {
  const blocks: JsonLdObject[] = [];

  if (pageMeta.pageType === "home") {
    blocks.push(buildWebSiteJsonLd(), buildOrganizationJsonLd(), buildMobileApplicationJsonLd());
  } else if (pageMeta.canonicalPath === "/get") {
    // Organization travels with the app block so the publisher @id resolves
    // inside this document rather than dangling.
    blocks.push(buildOrganizationJsonLd(), buildMobileApplicationJsonLd());
  }

  const breadcrumbOverrides = pageMeta.contentEntry
    ? { [pageMeta.canonicalPath]: pageMeta.contentEntry.title }
    : undefined;
  const breadcrumb = buildBreadcrumbJsonLd(pageMeta.canonicalPath, breadcrumbOverrides);

  if (breadcrumb) {
    blocks.push(breadcrumb);
  }

  if (pageMeta.pageType === "content" && pageMeta.contentEntry) {
    // Article.publisher is an @id reference, so the Organization node has to be
    // in the same document or the reference dangles. It previously did on every
    // content page, because the edge middleware strips the prerendered JSON-LD
    // and re-emits only what buildPageJsonLd returns.
    blocks.push(buildOrganizationJsonLd(), buildArticleJsonLd(pageMeta.contentEntry));

    const faqBlock = buildFaqPageJsonLd(pageMeta.contentEntry.faqs);

    if (faqBlock) {
      blocks.push(faqBlock);
    }
  }

  return blocks;
}

export function serializeJsonLd(data: JsonLdObject | JsonLdObject[]): string {
  return JSON.stringify(data).replace(/</g, "\\u003c");
}
