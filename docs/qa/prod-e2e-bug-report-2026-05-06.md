# Floriva Production E2E Bug Report - 2026-05-06

Production target: `https://floriva.app`

Test email: `FLORIVA_PROD_TEST_EMAIL` from ignored `.env.local`

## Scope

- Website-only production pass for home, navigation, representative static pages, representative hub/content pages, 404, lead-magnet form, store redirects, retired PostHog endpoint, sitemap/redirect behavior, canonical/robots/meta behavior, mobile viewport, and keyboard skip link.
- Browser automation used the local Playwright CLI wrapper via a CRLF-normalizing shell shim because the installed wrapper file contains Windows line endings.
- HTTP checks used `curl.exe` plus the repo's production SEO verifier.

## Findings

### F1 - Fixed - Lead-magnet privacy guide conflated the Flo FTC order with the 2025 class action

Severity: P1 content accuracy

URL: `https://floriva.app/free/privacy-guide`

Viewport: Desktop and mobile browser snapshots

Repro steps:

1. Open `https://floriva.app/free/privacy-guide`.
2. Read the FAQ answer for "Can law enforcement access my Flo or Clue data".
3. Read the "What the Flo FTC Case Revealed" section.

Expected:

- The page should match repo research: the FTC action/consent order was in 2021 and did not produce the $59.5M settlement; the $59.5M figure belongs to the separate 2025 class-action settlement over the same conduct.

Actual:

- The FAQ said the FTC enforcement action was "settled for $59.5M in 2025".
- The body said "In 2024-2025, the FTC settled with Flo Health for $59.5 million".

Evidence:

- Playwright snapshot on 2026-05-06 showed the incorrect production text.
- Source research in `docs/research/2 april/Period tracking apps and the erosion of reproductive data privacy.md` documents the FTC complaint announced January 13, 2021, the consent order finalized June 22, 2021, and the separate 2025 class-action settlement sequence.

Fix:

- Corrected `content/lead-magnets/privacy-guide.mdx`.
- Regenerated `src/site/generated/content-data.ts`.
- Added a regression assertion in `src/site/content.test.ts` so the FTC order and 2025 class action are not conflated again.

Retest:

- Local targeted test passed: `pnpm test src/site/content.test.ts`.
- Deployed via `pnpm run deploy` on 2026-05-06.
- Production Playwright snapshot for `https://floriva.app/free/privacy-guide?deploy-ret=20260506` showed the corrected body text: "In 2021, the FTC finalized a consent order against Flo Health..." and the corrected FAQ text: "The FTC's 2021 enforcement action documented...; a separate class action..."
- Production retest status: pass.

## Report-Only Observations

### O1 - Cloudflare Browser Insights/RUM is injected in production

Severity: P2 privacy/observability review

URL: `https://floriva.app/`

Evidence:

- Playwright network log showed `GET https://static.cloudflareinsights.com/beacon.min.js/...` and `POST https://floriva.app/cdn-cgi/rum?`.
- No repo source references `cdn-cgi`, `browser insights`, `rum`, or Cloudflare Web Analytics configuration.

Status:

- Treated as platform configuration, not repo-owned code. This should be reviewed in Cloudflare settings because Floriva is a privacy-sensitive site and the privacy page says the website does not use broad analytics.

Resolution note - 2026-08-13:

- Restating the finding plainly, because it sits next to the README's "no product analytics" claim and a reader is entitled to see how the two fit together. On 2026-05-06 a production page load fetched `static.cloudflareinsights.com/beacon.min.js` and posted to `/cdn-cgi/rum`. That is Cloudflare Browser Insights (RUM), and it collects real-user page-performance beacons from visitors.
- Scope of the contradiction: the README's "no product analytics" claim is about shipped application code, and that claim holds. A repo-wide search finds no reference to `cloudflareinsights`, `cdn-cgi/rum`, Browser Insights, or Cloudflare Web Analytics outside this bug report; there is no analytics SDK in `src/`, `functions/`, or `worker/`; and `functions/ph/[[path]].ts` returns 404 `POSTHOG_ENDPOINT_RETIRED` unconditionally. Browser Insights is injected by the Cloudflare edge when it is enabled as a per-zone dashboard setting, so nothing in this repository turns it on and nothing in this repository can turn it off.
- Current state: unresolved and unverified. No evidence exists in this repository that the dashboard setting was subsequently disabled, and this snapshot has no way to observe the live zone. Do not read this note as a fix. The finding stands as recorded on 2026-05-06, and confirming or changing the setting is a Cloudflare dashboard action outside the codebase.

### O2 - Android store redirect is intentionally unconfigured

Severity: Expected configuration state

URL: `https://floriva.app/api/store/android`

Evidence:

- HTTP response was `503 STORE_TARGET_UNCONFIGURED`.
- `/api/health` reported `"storeRedirects":{"ios":true,"android":false}`.
- The UI showed Google Play as "Coming soon".

Status:

- No repo fix made.

### O3 - Sentry is disabled in production health output

Severity: P2 observability configuration

URL: `https://floriva.app/api/health`

Evidence:

- `/api/health` returned `"sentry":{"enabled":false,"environment":null,"release":null}`.

Status:

- Report-only unless DSN/release secrets are provided.

### O4 - Lead-magnet email arrival cannot be verified from this environment

Severity: Manual verification pending

URL: `https://floriva.app/free/privacy-guide`

Evidence:

- Submitted `FLORIVA_PROD_TEST_EMAIL` from the production page.
- Browser showed "Check your inbox."
- Network log showed `POST https://floriva.app/api/lead-magnet/subscribe => [202]`.

Status:

- Website-side submission passed. Inbox delivery and signed download link remain pending because this environment has no inbox access.

## Passing Checks

- `pnpm verify:seo`: production SEO surface verified for `https://floriva.app`.
- `pnpm check:links`: 472 valid routes, 4,807 internal links checked, 0 broken internal links, 0 orphan routes.
- `/api/health`: 200 OK.
- `/api/store/ios`: 302 to the App Store listing.
- `/ph/test`: 404 `POSTHOG_ENDPOINT_RETIRED`.
- Cross-origin lead-magnet POST: 403 `CROSS_ORIGIN_WRITE_BLOCKED`.
- `/resources/guides/`: 301 to `/resources/guides`.
- `/sitemap-0.xml`: 301 to `/sitemap.xml`.
- Keyboard skip link: Tab then Enter navigated to `#main-content`.
- Browser console: home and lead-magnet page had no warnings/errors; 404 page logged the expected document 404 resource message.

## Fresh Context Continuation Check

Run date: 2026-05-06 UTC.

Additional Playwright CLI coverage:

- Viewports: desktop 1440x1000, tablet 834x1112, mobile 390x844.
- Rechecked core pages, hub pages, 404 route, representative comparison/alternative/pricing/guide/listicle/lead-magnet/state/questionnaire/app-guide/symptom/condition/hormone/life-stage/wellness/privacy-in-practice pages.
- Lead-magnet form: required email validation passed, invalid email validation passed, `FLORIVA_PROD_TEST_EMAIL` submission returned 202 and showed the "Check your inbox" success state.
- Edge/API checks: `/api/health` 200, `/api/store/ios` 302 to the App Store listing, `/api/store/android` 503 intentionally unconfigured, `/ph/test` 404 retired endpoint, cross-origin lead-magnet write 403.
- Redirect checks: `/resources/guides/` 301 to `/resources/guides`, `/sitemap-0.xml` 301 to `/sitemap.xml`.
- Keyboard/reduced-motion checks: skip link focused first and navigated to `#main-content`; `prefers-reduced-motion: reduce` was honored by browser media state.
- iOS App Store listing: reached `https://apps.apple.com/us/app/floriva-private-period-tracker/id6762630858`.

## Final Deployment Retest

- Deploy command: `pnpm run deploy`.
- Pages deployment: `https://9b8aed31.floriva-web.pages.dev`.
- Lead-magnet sequence Worker version: `1f2ce3f9-ab66-4d64-aa2c-e735afbd802d`.
- Post-deploy `pnpm verify:seo`: passed for `https://floriva.app`.
- Post-deploy `/api/health`: 200 OK, iOS store redirect live, Android store redirect intentionally false, Sentry still disabled.
- Post-deploy `/api/store/ios`: 302 to the App Store listing.
- Post-deploy corrected-content browser retest: passed.
