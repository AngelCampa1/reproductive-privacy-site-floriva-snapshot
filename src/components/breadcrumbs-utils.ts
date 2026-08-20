import { getSiteRouteLabel, isNavigableSiteRoute } from "@/site/site-routes";

type Crumb = {
  label: string;
  to: string;
};

function humanize(segment: string): string {
  return segment.replace(/-/g, " ").replace(/\b\w/g, (character) => character.toUpperCase());
}

/**
 * Builds the breadcrumb trail for a path.
 *
 * Every intermediate crumb is checked against the route table before it is
 * emitted. The trail used to be pure string-splitting, which invented crumbs
 * for URL segments that are not routes: `/tools/quiz/:slug` produced a link to
 * `/tools`, which is not in `router.tsx` and rendered the 404 page — on all 13
 * quiz pages, and inside their BreadcrumbList JSON-LD.
 *
 * Labels come from the route table too, so a crumb reads "Ranked lists" and
 * "Privacy by state" rather than the title-cased slug ("Best", "Period Tracker
 * Privacy"). `overrides` still wins, and is how a content page supplies its own
 * title for the leaf.
 */
export function buildCrumbs(pathname: string, overrides: Record<string, string> = {}): Crumb[] {
  const segments = pathname.split("/").filter(Boolean);

  if (segments.length === 0) {
    return [];
  }

  const crumbs: Crumb[] = [{ label: "Home", to: "/" }];

  segments.forEach((segment, index) => {
    const to = `/${segments.slice(0, index + 1).join("/")}`;
    const isLeaf = index === segments.length - 1;
    const override = overrides[to];

    // Intermediate crumbs must be real destinations. The leaf is always kept:
    // it is the current page, it is not a link, and for content pages it is not
    // in the route table anyway.
    if (!isLeaf && !override && !isNavigableSiteRoute(to)) {
      return;
    }

    crumbs.push({ label: override ?? getSiteRouteLabel(to) ?? humanize(segment), to });
  });

  return crumbs;
}
