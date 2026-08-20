/**
 * The site's non-content routes, split out as a leaf module.
 *
 * These tables used to live in `route-inventory.ts`, which imports the whole
 * generated content corpus. Breadcrumbs need the table but must not pull that
 * corpus into the main bundle, so the data lives here and `route-inventory.ts`
 * re-exports it.
 *
 * Every path listed here is a real route in `router.tsx`. That is the property
 * breadcrumbs rely on: an intermediate URL segment is only a legitimate crumb
 * if it appears below. Content pages are always leaves and never intermediate,
 * so this table is sufficient to validate a trail without loading content.
 *
 * The rows themselves live in `site-routes.json` because `scripts/check-links.mjs`
 * needs the same table and cannot import TypeScript. It used to keep its own
 * hand-typed copy with nothing asserting the two agreed, which meant the
 * link audit could validate against a route list the site did not actually have.
 */

import siteRouteData from "@/site/site-routes.json";

export type SiteRouteKind = "static" | "hub";

export type StaticSiteRoute = {
  path: string;
  label: string;
  kind: SiteRouteKind;
};

export const staticSiteRoutes: readonly StaticSiteRoute[] = siteRouteData.static.map((route) => ({
  ...route,
  kind: "static",
}));

export const hubSiteRoutes: readonly StaticSiteRoute[] = siteRouteData.hubs.map((route) => ({
  ...route,
  kind: "hub",
}));

const navigableRouteLabels = new Map<string, string>(
  [...staticSiteRoutes, ...hubSiteRoutes].map((route) => [route.path, route.label]),
);

/** True when `path` is a static page or hub a reader can actually navigate to. */
export function isNavigableSiteRoute(path: string): boolean {
  return navigableRouteLabels.has(path);
}

/**
 * The editorial label for a static page or hub, or `undefined` if the path is
 * not one. Prefer this over title-casing the URL segment: it is the difference
 * between "Best" and "Ranked lists", and between "Period Tracker Privacy" and
 * "Privacy by state".
 */
export function getSiteRouteLabel(path: string): string | undefined {
  return navigableRouteLabels.get(path);
}
