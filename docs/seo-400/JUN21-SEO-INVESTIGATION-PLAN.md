# June 21 SEO Investigation Plan

Date: 2026-07-03

## Objective

Investigate the report that Floriva SEO stopped working on 2026-06-21, identify the failure mode from current repo and production evidence, and define the repair plan needed for end-to-end recovery.

## Current Evidence

- `git pull` on `master` is up to date.
- `git log --all --since="2026-06-18" --until="2026-06-30 23:59:59"` shows no commits. The current repo does not contain a code or content change that landed on 2026-06-21.
- Cloudflare Pages deployment list shows production deployments before July 1 were on older June commits; the visible deployment list does not show a production deployment on June 21.
- Old production deployment URLs from the June window expose 472 sitemap URLs. Current production exposes 872 sitemap URLs.
- GSC MCP can read the Floriva property. `sc-domain:floriva.app` is accessible as `siteOwner`, and the submitted sitemap `https://floriva.app/sitemap.xml` is valid with 872 indexed URLs and 0 sitemap errors.
- GSC Search Analytics confirms the reported drop. Impressions fell from 108 on 2026-06-19 to 8 on 2026-06-20 and 11 on 2026-06-21, then stayed in single digits or low teens through the end of June.
- The GSC drop is broad across many long-tail pages and queries, not isolated to one query or one route family.
- GSC Search Analytics contains historical `www` page rows from the affected period, including `https://www.floriva.app/resources/guides/is-flo-safe-to-use`, `https://www.floriva.app/resources/guides/does-flo-sell-your-data`, and five other visible `www` URLs.
- Live `https://floriva.app/sitemap.xml` returns 200 XML with 872 URLs.
- Live representative routes return 200 HTML with self-canonical URLs, `index, follow`, H1s, and JSON-LD.
- Live `https://www.floriva.app/...` requests were serving 200 instead of redirecting to the canonical apex host. GSC data included `https://www.floriva.app/resources/guides/is-flo-safe-to-use`, so Google has seen duplicate host variants.
- Public web search currently returns indexed Floriva pages, including recently published SEO400 pages.
- `artifacts/floriva-seo400-prod-urls.txt` contains 400 URLs, and all 400 are present in the live sitemap.

## Verification And Closeout Gates

```powershell
git pull
pnpm verify:seo
pnpm verify:seo400-backlog -- --min 400
pnpm verify:seo400-content
pnpm test -- functions/_middleware.test.ts
node --check scripts\verify-production-seo-health.mjs
pnpm lint
pnpm build
pnpm verify:prerendered-content -- --all-sitemap --min 872
$env:FLORIVA_PROD_URL='https://floriva.app'; pnpm verify:funnel:prod
pnpm export:seo400:prod-urls -- --origin https://floriva.app --out artifacts\floriva-seo400-prod-urls.txt
pnpm verify:prod-seo-health -- --origin https://floriva.app --min 872
pnpm exec wrangler pages deploy dist --project-name floriva-web --branch master
```

Results:

- Fresh build passed and prerendered 872 routes.
- `verify:prerendered-content` checked 872 sitemap routes.
- Middleware tests passed with 22 redirect and SEO middleware cases.
- Cloudflare Pages production deploy must be completed from the same committed `master` revision after local verification.
- After deploy, live `www.floriva.app` probes must return 301 to `https://floriva.app` for:
  - `/`
  - `/resources/guides/is-flo-safe-to-use?utm_source=seo-health`
  - `/sitemap.xml`
  - `/robots.txt`
  - `/llms.txt`
- `verify-production-seo-health` must pass against production with 872 sitemap URLs, 400 SEO400 URLs, and 20 sampled routes.
- `verify:funnel:prod` must pass:
  - live SEO surface
  - canonical `www` to apex host checks
  - 24 production redirect cases
  - 872 valid routes
  - 11,989 internal links
  - 0 broken internal links
  - 0 orphan routes
  - 400 SEO400 routes on desktop
  - 400 SEO400 routes on mobile
  - 32 representative funnel/browser routes on desktop
  - 32 representative funnel/browser routes on mobile
  - lead-magnet public smoke
- Production URL export must verify and write 400 URLs.
- GSC sitemap resubmission succeeded for `https://floriva.app/sitemap.xml` at 2026-07-03 21:17 UTC and is pending Google processing.
- Follow-up GSC check after resubmission showed:
  - sitemap status processed
  - last submitted 2026-07-03 21:17 UTC
  - last downloaded 2026-07-03 21:17 UTC
  - 0 sitemap errors and 0 warnings
  - Search Analytics through 2026-07-03 still shows low impressions; this is expected because the final production fix and GSC resubmission happened late on 2026-07-03.

## Working Diagnosis

The current production site is not technically blocked from crawling or indexing. The report that SEO stopped on 2026-06-21 is not explained by a repo commit or visible production deploy on that date.

The most likely explanations are:

1. Google began sharply reducing Floriva impressions around 2026-06-20/21.
2. The site exposed duplicate canonical host variants because `www.floriva.app` did not 301 to `floriva.app`.
3. A stale production state before the July 1 SEO400 rollout likely compounded the recovery problem. The pre-rollout production sitemap had 472 URLs; current production has 872.
4. A deploy-process fragility where generated SEO surfaces could drift if `pnpm build` or Cloudflare Functions deployment is bypassed.

The host split was an actionable repo defect. It may not be the only cause of the June drop, but it was a canonicalization problem visible in both live HTTP behavior and GSC page data. The fix must be deployed and verified on production before this incident is considered closed.

## Repair Plan

### Phase 1: Lock Current Recovery State

- Keep `artifacts/floriva-seo400-prod-urls.txt` as the source-backed indexer handoff for the 400 net-new URLs.
- Resubmit or request indexing for the 400 URLs from that file using the preferred indexer workflow.
- Re-submit `https://floriva.app/sitemap.xml` in GSC after the canonical-host redirect is live. Completed through the GSC MCP at 2026-07-03 21:17 UTC.

### Phase 2: Add Regression Protection

- Added `pnpm verify:prod-seo-health`, a dedicated production SEO health script that:
  - verifies `www.floriva.app` redirects to `https://floriva.app`
  - fetches production `/sitemap.xml`
  - asserts the URL count is at least the expected threshold
  - checks the submitted SEO400 URL file is fully present in the live sitemap
  - samples key route families for 200 status, canonical, H1, JSON-LD, and `index, follow`
  - fails on `X-Robots-Tag: noindex` for `https://floriva.app`
- `verify:funnel:prod` now runs `verify:prod-seo-health` immediately after `verify:seo`, so the normal production funnel gate fails on:
  - missing or low-count production sitemap output
  - SEO400 URL artifact entries missing from the live sitemap
  - broken canonical `www` to apex redirects
  - sampled route noindex, canonical, H1, JSON-LD, title, or content-type drift
  - static SEO asset availability for `/robots.txt` and `/llms.txt`
- Open decision: whether to also add this check to `verify:deploy-readiness`. That command can run before production deploy, so it should only include live-production checks if the team wants deploy readiness to assert the already-live site too.

### Phase 3: Deploy Canonical Host Repair

- Add edge middleware redirect coverage for `https://www.floriva.app/*` to `https://floriva.app/*`.
- Preserve path and query string during redirect.
- Cover static SEO assets such as `/sitemap.xml`, `/robots.txt`, and `/llms.txt`, not only HTML document routes.
- Keep those static SEO assets inside the Pages Functions route set in `_routes.json` where possible, and add `_redirects` fallbacks for Cloudflare static asset responses that bypass middleware.
- Verify locally with middleware tests.
- Deploy to Cloudflare Pages production.
- Verify live with direct `curl.exe -I` probes and `pnpm verify:prod-seo-health`.

### Phase 4: Monitor Recovery

- Re-submit or refresh `https://floriva.app/sitemap.xml` in GSC after the production redirect is live. Completed at 2026-07-03 21:17 UTC.
- Track GSC daily impressions for the same broad page families from 2026-07-04 onward. Use the GSC property `sc-domain:floriva.app` and compare against these checkpoints:
  - 2026-06-01 to 2026-06-19: pre-drop baseline
  - 2026-06-20 to 2026-07-03: drop and pre-repair window
  - 2026-07-04 onward: post-repair crawl/recovery window
- Re-run the production guard daily until recovery is visible:

```powershell
pnpm verify:prod-seo-health -- --origin https://floriva.app --min 872
```

- In GSC, watch for:
  - `www` page rows receiving no new impressions after 2026-07-03
  - apex pages regaining impressions beyond the single-digit daily baseline
  - sitemap remaining processed with 0 errors and 0 warnings
- Next useful GSC checkpoint: 2026-07-06 or later, because GSC Search Analytics needs enough post-fix days to distinguish recrawl recovery from same-day reporting lag.
- Do not expect immediate ranking recovery; Google needs to recrawl and consolidate host signals.

## Not Yet Proven

- Whether a Search Console indexing/coverage state changed on that date.
- Whether Google's loss of visibility was caused primarily by the host split, stale pre-rollout production, an algorithmic/query-demand change, or a combination.
