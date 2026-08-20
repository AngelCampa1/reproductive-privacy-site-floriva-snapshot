import indexPolicy from "./index-policy.json";

/**
 * Routes that stay live, linked, and reachable but stop asking Google to index them.
 *
 * This is deliberately NOT a deletion. Every path here still renders, still serves
 * its lead magnet, and still appears in on-site navigation — it is simply dropped
 * from the sitemap and served `noindex, follow` — see robotsDirective below.
 *
 * Current scope (Tier 1) is the `/free/*` lead-magnet landers that Google discovered
 * and declined to even crawl (`DISCOVERED_NOT_INDEXED` in
 * `artifacts/index-status-ledger-2026-07-18.csv`). They are template-identical gated
 * download pages whose job is conversion, not ranking.
 *
 * Broadening this list is a one-file change. Before adding the `CRAWLED_NOT_INDEXED`
 * families, note that `docs/seo-400/INDEX-STATUS-LEDGER.md` explicitly calls those
 * "strengthen candidates, not prune candidates" — noindexing a page Google already
 * declined forfeits its recovery upside for no measured gain.
 */
export const noindexRoutePaths: ReadonlySet<string> = new Set(indexPolicy.noindexRoutePaths);

export function isNoindexRoute(pathname: string): boolean {
  return noindexRoutePaths.has(pathname);
}

/**
 * Single source for the robots directive, shared by the SPA (`src/site/meta.tsx`),
 * the edge (`functions/_middleware.ts`), and mirrored in `scripts/prerender-html.mjs`.
 *
 * Policy-tier pages get `noindex, follow` — not `nofollow`. They stay live and
 * linked and carry real outbound links (~30 each), so following them still
 * matters; only the index request is withdrawn. `nofollow` is reserved for 404s,
 * where there is nothing worth following.
 */
export function robotsDirective(pathname: string, noIndex: boolean): string {
  if (!noIndex) {
    return "index, follow";
  }

  return isNoindexRoute(pathname) ? "noindex, follow" : "noindex, nofollow";
}
