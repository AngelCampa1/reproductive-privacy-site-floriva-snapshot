import { allEntries, type ContentEntry } from "@/site/content";
import { collectionDefinitions } from "@/site/config";
import { contentEntries as fullContentEntries } from "@/site/generated/content-data";
import {
  buildContentNextStepLinks,
  buildHubNextStepLinks,
  buildResourcesMegamenuGroups,
  resolveFunnelAwareRelatedEntries,
} from "@/site/internal-links";
import hubCollectionData from "@/site/hub-collections.json";
import { hubGuideLinks } from "@/site/marketing-links";
import { pillarHubDefinitions, pillarHubDefinitionsByPath } from "@/site/pillar-hubs";
import { hubSiteRoutes, isNavigableSiteRoute, staticSiteRoutes } from "@/site/site-routes";

export type SiteRoute = {
  path: string;
  label: string;
  kind: "static" | "hub" | ContentEntry["collection"];
};

export type InternalLinkHit = {
  from: string;
  to: string;
  source: string;
};

export type InternalLinkGraph = {
  brokenLinks: InternalLinkHit[];
  inboundByRoute: Map<string, InternalLinkHit[]>;
  orphans: SiteRoute[];
  routes: SiteRoute[];
};

/* The route tables live in `site-routes.ts` so breadcrumbs can validate a trail
   without importing the generated content corpus. Re-exported here to keep this
   module's public surface unchanged. */
export { hubSiteRoutes, staticSiteRoutes } from "@/site/site-routes";

/* Lives in JSON, not in this file, because `scripts/check-links.mjs` needs the
   same mapping and cannot import TypeScript. It used to carry a hand-typed
   duplicate with nothing asserting the two agreed, so the link audit could
   silently crawl a different site than the one that ships. */
const HUB_COLLECTIONS = hubCollectionData as Record<string, readonly ContentEntry["collection"][]>;

/* JSON gives us `string[]`, so the `satisfies` check this table used to carry is
   gone. Re-establish it at load: every value has to name a real collection. */
const knownCollections = new Set<string>(Object.keys(collectionDefinitions));
for (const [hubPath, collections] of Object.entries(HUB_COLLECTIONS)) {
  /* A hub can only aggregate entries if a reader can reach it. Without this a
     mapping keyed on a path that is not in the router would quietly contribute
     inbound links to the orphan check for a page nobody can open. */
  if (!isNavigableSiteRoute(hubPath)) {
    throw new Error(`site/hub-collections.json keys "${hubPath}", which is not a route in site-routes.json`);
  }

  for (const collection of collections) {
    if (!knownCollections.has(collection)) {
      throw new Error(`${hubPath} maps unknown collection "${collection}" in site/hub-collections.json`);
    }
  }
}

for (const hub of pillarHubDefinitions) {
  if (!HUB_COLLECTIONS[hub.path]) {
    throw new Error(`Missing hub collection mapping for ${hub.path}`);
  }
}

const configuredCollectionRouteBases = new Set(
  Object.values(collectionDefinitions).map((definition) => definition.routeBase),
);

for (const routeBase of configuredCollectionRouteBases) {
  if (!HUB_COLLECTIONS[routeBase]) {
    throw new Error(`Missing hub collection mapping for ${routeBase}`);
  }
}

/* The reverse of the guard above, which only ran one way. A hub could be listed
   in HUB_COLLECTIONS and never get a pillar definition — that is how `/resources`
   ended up aggregating 9 collections and 273 entries into a single flat grid
   about 44 screens tall. A hub that merges more than one collection has to say
   how those collections are grouped. */
for (const [path, collections] of Object.entries(HUB_COLLECTIONS)) {
  if (collections.length > 1 && !pillarHubDefinitionsByPath[path]) {
    throw new Error(
      `${path} maps ${collections.length} collections but has no pillar definition in pillar-hubs.ts. ` +
        "Without one it renders every entry in one ungrouped grid.",
    );
  }
}

const GLOBAL_NAV_LINKS = [
  "/compare",
  "/resources",
  "/period-tracker-privacy",
  "/privacy-features",
  "/get",
  "/privacy",
  "/support",
  "/terms",
];

export function normalizeSitePath(pathname: string): string {
  if (!pathname || pathname === "/") {
    return "/";
  }

  const withoutHashOrQuery = pathname.split("#")[0].split("?")[0];
  return withoutHashOrQuery.replace(/\/+$/, "") || "/";
}

export function getAllSiteRoutes(): SiteRoute[] {
  const contentRoutes = allEntries.map((entry) => ({
    path: normalizeSitePath(entry.routePath),
    label: entry.title,
    kind: entry.collection,
  }));

  return [...staticSiteRoutes, ...hubSiteRoutes, ...contentRoutes];
}

export function getValidRoutePaths(): Set<string> {
  return new Set(getAllSiteRoutes().map((route) => route.path));
}

function addLink(
  links: InternalLinkHit[],
  from: string,
  to: string,
  source: string,
): void {
  links.push({
    from: normalizeSitePath(from),
    source,
    to: normalizeSitePath(to),
  });
}

const fullBodyById = new Map(
  (fullContentEntries as unknown as Array<{ id: string; body: string }>).map((e) => [e.id, e.body]),
);

function addMarkdownLinks(links: InternalLinkHit[], entry: ContentEntry): void {
  const bodyText = fullBodyById.get(entry.id) ?? "";
  for (const match of bodyText.matchAll(/\]\((\/[^)\s]+)\)/g)) {
    addLink(links, entry.routePath, match[1], "content:body");
  }
}

export function collectInternalLinkHits(): InternalLinkHit[] {
  const links: InternalLinkHit[] = [];

  for (const href of GLOBAL_NAV_LINKS) {
    addLink(links, "/", href, "global:navigation");
  }

  /* No "home:marketing-cta" edges. The homepage renders no funnel links by
     design (see the note in marketing-links.ts), and this graph is only useful
     if it refuses to claim links the site does not have. */

  for (const group of buildResourcesMegamenuGroups()) {
    for (const link of group.links) {
      addLink(links, "/", link.href, "global:resources-megamenu");
    }
  }

  for (const [hubPath, collections] of Object.entries(HUB_COLLECTIONS)) {
    const collectionSet = new Set<ContentEntry["collection"]>(collections);

    const pillarHub = pillarHubDefinitionsByPath[hubPath];
    for (const entry of allEntries.filter((candidate) => collectionSet.has(candidate.collection))) {
      addLink(links, hubPath, entry.routePath, "hub:collection-card");
    }

    if (pillarHub) {
      for (const section of pillarHub.sections) {
        for (const entry of allEntries.filter((candidate) => section.collections.includes(candidate.collection))) {
          addLink(links, hubPath, entry.routePath, "hub:pillar-section");
        }
      }
    }

    for (const link of buildHubNextStepLinks(collections, hubPath)) {
      addLink(links, hubPath, link.href, "hub:next-step");
    }

    for (const link of hubGuideLinks[hubPath] ?? []) {
      if (normalizeSitePath(link.href) === normalizeSitePath(hubPath)) continue;
      addLink(links, hubPath, link.href, "hub:guide");
    }
  }

  for (const entry of allEntries) {
    for (const related of resolveFunnelAwareRelatedEntries(entry)) {
      addLink(links, entry.routePath, related.routePath, "content:related");
    }
    for (const link of buildContentNextStepLinks(entry)) {
      addLink(links, entry.routePath, link.href, "content:next-step");
    }
    addMarkdownLinks(links, entry);
  }

  return links;
}

export function buildInternalLinkGraph(): InternalLinkGraph {
  const routes = getAllSiteRoutes();
  const validRoutes = new Set(routes.map((route) => route.path));
  const inboundByRoute = new Map(routes.map((route) => [route.path, [] as InternalLinkHit[]]));
  const brokenLinks: InternalLinkHit[] = [];

  for (const link of collectInternalLinkHits()) {
    if (!validRoutes.has(link.to)) {
      brokenLinks.push(link);
      continue;
    }

    if (link.from !== link.to) {
      inboundByRoute.get(link.to)?.push(link);
    }
  }

  const orphans = routes.filter((route) => route.path !== "/" && (inboundByRoute.get(route.path)?.length ?? 0) === 0);

  return {
    brokenLinks,
    inboundByRoute,
    orphans,
    routes,
  };
}
