import { type ContentPageMeta, contentPageMetaByPath } from "./content-manifest";
import { collectionDefinitions } from "./config";
import { isNoindexRoute } from "./index-policy";
import { florivaKnowledge } from "./knowledge";
import { pillarHubDefinitionsByPath } from "./pillar-hubs";
import { siteSeo } from "./seo";

export type ResolvedPageMeta = {
  canonicalPath: string;
  description: string;
  noIndex: boolean;
  ogImage: string;
  status: 200 | 404;
  title: string;
  contentEntry?: ContentPageMeta;
  pageType: "home" | "hub" | "static" | "content" | "notFound";
};

type MetaSource = {
  description: string;
  title: string;
  ogImage?: string;
};

const hubPageMetaByPath: Record<string, MetaSource> = {
  "/compare": {
    description: pillarHubDefinitionsByPath["/compare"].description,
    title: pillarHubDefinitionsByPath["/compare"].title,
  },
  "/compare/alternatives": {
    description: "Switching pages for users abandoning Flo, Clue, Premom, and the rest.",
    title: "Private alternatives to mainstream period trackers",
  },
  "/compare/versus": {
    description:
      "Direct privacy and pricing comparisons between the apps people search head-to-head.",
    title: "Period tracker privacy comparisons",
  },
  "/compare/pricing": {
    description:
      "How much each tracker really costs when privacy and cloud storage are part of the bill.",
    title: "Period tracker pricing breakdowns",
  },
  "/resources": {
    description:
      "Guides, rankings, and free resources for people researching reproductive-data privacy.",
    title: "Floriva privacy resources",
  },
  "/resources/best": {
    description: "Ranked lists focused on private, low-surveillance alternatives.",
    title: "Best private period tracker lists",
  },
  "/resources/guides": {
    description: pillarHubDefinitionsByPath["/resources/guides"].description,
    title: pillarHubDefinitionsByPath["/resources/guides"].title,
  },
  "/resources/health": {
    description: pillarHubDefinitionsByPath["/resources/health"].description,
    title: pillarHubDefinitionsByPath["/resources/health"].title,
  },
  "/resources/symptom-guides": {
    description: collectionDefinitions["symptom-guides"].description,
    title: collectionDefinitions["symptom-guides"].label,
  },
  "/resources/condition-guides": {
    description: collectionDefinitions["condition-guides"].description,
    title: collectionDefinitions["condition-guides"].label,
  },
  "/resources/hormone-guides": {
    description: collectionDefinitions["hormone-guides"].description,
    title: collectionDefinitions["hormone-guides"].label,
  },
  "/resources/life-stage-guides": {
    description: collectionDefinitions["life-stage-guides"].description,
    title: collectionDefinitions["life-stage-guides"].label,
  },
  "/resources/privacy-in-practice": {
    description: collectionDefinitions["privacy-in-practice"].description,
    title: collectionDefinitions["privacy-in-practice"].label,
  },
  "/resources/wellness-guides": {
    description: collectionDefinitions["wellness-guides"].description,
    title: collectionDefinitions["wellness-guides"].label,
  },
  "/app-guides": {
    description: collectionDefinitions["app-guides"].description,
    title: collectionDefinitions["app-guides"].label,
  },
  "/free": {
    description:
      "Free privacy guides, switcher scorecards, and state risk bundles from Floriva.",
    title: "Free Floriva privacy resources",
  },
  "/period-tracker-privacy": {
    description:
      "All state pages on abortion law context, data protection, and subpoena exposure.",
    title: "Period tracker privacy by state",
  },
  "/tools/quiz": {
    description: collectionDefinitions.questionnaires.description,
    title: collectionDefinitions.questionnaires.label,
  },
};

const homePageMeta: MetaSource = {
  description: siteSeo.metaDescription,
  title: siteSeo.homeTitle,
};

const staticPageMetaByPath: Record<string, MetaSource> = {
  "/": homePageMeta,
  "/get": florivaKnowledge.staticPages.get,
  "/privacy": florivaKnowledge.staticPages.privacy,
  "/privacy-features": florivaKnowledge.staticPages["privacy-features"],
  "/support": florivaKnowledge.staticPages.support,
  "/terms": florivaKnowledge.staticPages.terms,
};

const contentRouteBases = Object.values(collectionDefinitions).map(
  (definition) => definition.routeBase,
);

export function normalizePathname(pathname: string): string {
  if (!pathname || pathname === "/") {
    return "/";
  }

  return pathname.replace(/\/+$/, "") || "/";
}

export function buildDocumentTitle(title: string): string {
  return title;
}

export function buildCanonicalUrl(pathname: string): string {
  return new URL(normalizePathname(pathname), `https://${siteSeo.domain}`).toString();
}

export function buildOgImageUrl(pathOrUrl: string | undefined): string {
  const resolved = pathOrUrl ?? siteSeo.defaultOgImagePath;

  if (/^https?:\/\//i.test(resolved)) {
    return resolved;
  }

  return new URL(resolved, `https://${siteSeo.domain}`).toString();
}

function isContentRouteCandidate(pathname: string): boolean {
  return contentRouteBases.some(
    (routeBase) => pathname.startsWith(`${routeBase}/`) || pathname === routeBase,
  );
}

export function resolvePageMeta(pathname: string): ResolvedPageMeta {
  const normalizedPathname = normalizePathname(pathname);
  const contentMeta = Object.prototype.hasOwnProperty.call(
    contentPageMetaByPath,
    normalizedPathname,
  )
    ? contentPageMetaByPath[normalizedPathname as keyof typeof contentPageMetaByPath]
    : undefined;
  const hubMeta = hubPageMetaByPath[normalizedPathname];
  const staticMeta = staticPageMetaByPath[normalizedPathname];

  if (contentMeta) {
    return {
      canonicalPath: normalizedPathname,
      contentEntry: contentMeta,
      description: contentMeta.metaDescription,
      noIndex: isNoindexRoute(normalizedPathname),
      ogImage: buildOgImageUrl((contentMeta as ContentPageMeta).ogImage ?? siteSeo.defaultOgImagePath),
      pageType: "content",
      status: 200,
      title: contentMeta.seoTitle,
    };
  }

  if (hubMeta) {
    return {
      canonicalPath: normalizedPathname,
      description: hubMeta.description,
      noIndex: isNoindexRoute(normalizedPathname),
      ogImage: buildOgImageUrl(hubMeta.ogImage ?? siteSeo.defaultOgImagePath),
      pageType: "hub",
      status: 200,
      title: hubMeta.title,
    };
  }

  if (staticMeta) {
    return {
      canonicalPath: normalizedPathname,
      description: staticMeta.description,
      noIndex: isNoindexRoute(normalizedPathname),
      ogImage: buildOgImageUrl(staticMeta.ogImage ?? siteSeo.defaultOgImagePath),
      pageType: normalizedPathname === "/" ? "home" : "static",
      status: 200,
      title: staticMeta.title,
    };
  }

  if (isContentRouteCandidate(normalizedPathname)) {
    return {
      canonicalPath: normalizedPathname,
      description: "Floriva page not found.",
      noIndex: true,
      ogImage: buildOgImageUrl(siteSeo.defaultOgImagePath),
      pageType: "notFound",
      status: 404,
      title: "Page not found",
    };
  }

  return {
    canonicalPath: normalizedPathname,
    description: "Floriva page not found.",
    noIndex: true,
    ogImage: buildOgImageUrl(siteSeo.defaultOgImagePath),
    pageType: "notFound",
    status: 404,
    title: "Page not found",
  };
}
