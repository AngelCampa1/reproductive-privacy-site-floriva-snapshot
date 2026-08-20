import { useEffect } from "react";
import { isNoindexRoute, robotsDirective } from "@/site/index-policy";
import {
  buildCanonicalUrl,
  buildDocumentTitle,
  buildOgImageUrl,
  normalizePathname,
} from "@/site/page-meta";
import { siteSeo } from "@/site/seo";

type MetaProps = {
  article?: boolean;
  canonicalPath?: string;
  description: string;
  noIndex?: boolean;
  ogImage?: string;
  title: string;
};

function upsertMeta(
  attribute: "name" | "property",
  key: string,
  content: string,
): void {
  let element = document.head.querySelector(
    `meta[${attribute}="${key}"]`,
  ) as HTMLMetaElement | null;

  if (!element) {
    element = document.createElement("meta");
    element.setAttribute(attribute, key);
    document.head.append(element);
  }

  element.content = content;
}

function upsertLink(rel: string, href: string): void {
  let element = document.head.querySelector(`link[rel="${rel}"]`) as HTMLLinkElement | null;

  if (!element) {
    element = document.createElement("link");
    element.rel = rel;
    document.head.append(element);
  }

  element.href = href;
}

export function Meta({
  article = false,
  canonicalPath,
  description,
  noIndex = false,
  ogImage,
  title,
}: MetaProps): null {
  useEffect(() => {
    const pathname =
      canonicalPath ?? (typeof window !== "undefined" ? window.location.pathname : "/");
    // Without the index-policy lookup the client would hydrate over the edge's
    // `noindex` header and put `index, follow` back on the page. Normalized the
    // same way resolvePageMeta does, so a trailing slash cannot miss the lookup.
    const normalizedPathname = normalizePathname(pathname);
    const robots = robotsDirective(
      normalizedPathname,
      noIndex || isNoindexRoute(normalizedPathname),
    );
    const canonicalUrl = buildCanonicalUrl(pathname);
    const documentTitle = buildDocumentTitle(title);
    const ogImageUrl = buildOgImageUrl(ogImage);

    document.title = documentTitle;

    upsertMeta("name", "description", description);
    upsertMeta("name", "robots", robots);
    upsertMeta("property", "og:title", documentTitle);
    upsertMeta("property", "og:description", description);
    upsertMeta("property", "og:site_name", siteSeo.name);
    upsertMeta("property", "og:type", article ? "article" : "website");
    upsertMeta("property", "og:url", canonicalUrl);
    upsertMeta("property", "og:image", ogImageUrl);
    upsertMeta("property", "og:image:width", "1200");
    upsertMeta("property", "og:image:height", "630");
    upsertMeta("property", "og:image:type", "image/png");
    upsertMeta("name", "twitter:card", "summary_large_image");
    upsertMeta("name", "twitter:title", documentTitle);
    upsertMeta("name", "twitter:description", description);
    upsertMeta("name", "twitter:image", ogImageUrl);
    upsertLink("canonical", canonicalUrl);
  }, [article, canonicalPath, description, noIndex, ogImage, title]);

  return null;
}
