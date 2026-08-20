# Engineering log

A dated account of what actually happened between the first commit and the snapshot
cut, built only from evidence already committed in this tree: QA reports, the SEO
ledger, the evidence capture, and the portfolio-restructuring ledger. Nothing here is
reconstructed from the private repository's commit history; where a date or count is
not backed by a file in this tree, it is left out rather than approximated.

Two ledgers already carry the batch-by-batch detail for the two largest efforts named
below and are not repeated here: [`docs/seo-400/LEDGER.md`](../docs/seo-400/LEDGER.md)
(2,968 lines, the full SEO-400 rollout) and
[`docs/goal-portfolio-public/LEDGER.md`](../docs/goal-portfolio-public/LEDGER.md) (the
portfolio-restructuring passes). This page is the summary that points into both.

---

## 2026-04-21: Initial launch

The site's first commit. `portfolio/METRICS.md` reports development "since 2026-04-21"
and this repository's own `git log` on the un-squashed history is not available here.
See the note on commit counts in [the README](../README.md#by-the-numbers). Everything
that follows is measured against this start date.

## 2026-05-06: Production E2E pass finds and fixes a legal-claim conflation

A full production pass (home, navigation, content pages, lead-magnet form, store
redirects, the retired PostHog endpoint, sitemap/redirect behaviour, canonical/robots
metadata, mobile viewport, and keyboard skip-link) is recorded in
[`docs/qa/prod-e2e-bug-report-2026-05-06.md`](../docs/qa/prod-e2e-bug-report-2026-05-06.md).

**F1 (P1, fixed).** `/free/privacy-guide` stated the FTC's 2021 enforcement action
against Flo Health "settled for $59.5M in 2025," conflating a 2021 consent order with a
separate 2025 class-action settlement over the same underlying conduct. Fixed in
`content/lead-magnets/privacy-guide.mdx`, regenerated, and covered by a new regression
assertion in `src/site/content.test.ts` so the two cannot be conflated again. Redeployed
and reverified against production the same day.

**Report-only findings**, still open as of this tree: Cloudflare Browser Insights (RUM)
was observed on the production zone even though no application code references it,
resolved as a platform/dashboard setting outside the codebase, see the 2026-08-13
resolution note in the same report; the Android store redirect returned
`503 STORE_TARGET_UNCONFIGURED`, its expected pre-launch state; Sentry reported
`enabled: false` in `/api/health` at the time; and lead-magnet inbox delivery could not
be verified end-to-end because the QA environment had no inbox access.

`pnpm check:links` passed at 472 valid routes and 4,807 internal links, 0 broken, 0
orphaned: the pre-SEO-400 route count.

## 2026-06-20: Impressions cliff

Google Search Console impressions dropped roughly 95% on this date, coinciding with an
unconfirmed June 19 anti-spam update and the confirmed late-June 2026 spam update. This
is the event that drives every entry below through 2026-07-31. Source:
[`docs/seo-400/PUBLISHING-FREEZE.md`](../docs/seo-400/PUBLISHING-FREEZE.md).

## 2026-06-30 to 2026-07-01: The SEO-400 content rollout

Branch `feat/seo-400-icp-library`. Goal: 400 net-new content pages across the existing
collections, gated by keyword research, source review, and the full verification
suite before each batch shipped. The batch-by-batch record (DFS keyword checks,
per-batch source and copy review, named reviewer verdicts, and gate results) is in
[`docs/seo-400/LEDGER.md`](../docs/seo-400/LEDGER.md).

Every item on the rollout's own gate checklist is marked complete: backlog validation,
four content batches, `pnpm verify:seo400-content`, `pnpm verify:product-alignment`,
`audit-claims.mjs` review, `verify-sources.mjs` review, `pnpm typecheck`, `pnpm test`,
`pnpm lint`, `pnpm build`, `pnpm verify:prerendered-content` at both the 400-route and
872-route (full-sitemap) thresholds, `pnpm check:links`, and production browser checks
for all 400 net-new pages on desktop and mobile. The final production URL export
against the live sitemap is recorded as complete on 2026-07-01.

This rollout is also the reason the June 20 cliff got worse before it got better: 400
templated pages shipped in the middle of a content-quality demotion, which is the
subject of the next four entries.

## 2026-07-06: Lead-magnet consolidation decision

`docs/seo-400/LEAD-MAGNET-CONSOLIDATION.md` records the diagnosis: the `/free/`
lead-magnet collection was 348 of 872 indexed URLs (40% of the site) at the time,
heavily templated, and earning roughly one search click every two and a half months
combined, read as the clearest scaled-content signal on the domain. The decision was
to consolidate rather than noindex, keeping every asset live for the conversion funnel
(popups, exit-intent, inline forms) while cutting the indexed footprint. `content/lead-magnets/`
holds 35 files in this tree today; the consolidation plan's own target figure was an
intermediate estimate, and the ledger is the source of record for how that number
moved as batches executed.

## 2026-07-18: Publishing freeze and the authority-outreach plan

`docs/seo-400/PUBLISHING-FREEZE.md` halts new programmatic/templated pages while the
suppression is investigated; no pages are deleted or pruned. The same day,
[`docs/seo-400/INDEX-STATUS-LEDGER.md`](../docs/seo-400/INDEX-STATUS-LEDGER.md) snapshots
Google's URL-inspection verdict for all 559 production URLs (62.6% indexed, 30.2%
crawled-not-indexed), and
[`docs/seo-400/AUTHORITY-OUTREACH.md`](../docs/seo-400/AUTHORITY-OUTREACH.md) lists
outreach targets against a starting position of one backlink, one referring domain,
supporting 559 pages.

## 2026-07-22: Design and execution plans for the AI-search and rendering recovery work

Four dated plans in [`docs/superpowers/plans/`](../docs/superpowers/plans/) decompose
the recovery effort: AI-search and production proof, content evidence and metadata
recovery, route-equivalent rendering and visual quality, and an execution index tying
them together. `portfolio/AI-ASSISTED-DEVELOPMENT.md` cites these as the
design-before-code workflow this repository used for its largest content initiatives.

## 2026-07-31: Diagnosis corrected, and 94 pages retired

Re-measured with live Search Console, DataForSEO, and SERP data, the "site-level
suppression" theory in the July 18 freeze note is corrected in the same file: the
brand query ranked #1, and the real constraint was authority: two backlinks, two
referring domains, zero non-brand keywords in the top 20. There was no penalty to wait
out.

The same day, per the append-only note at the top of
[`docs/seo-400/LEDGER.md`](../docs/seo-400/LEDGER.md#2026-07-31-consolidation-stage-1):
93 `privacy-in-practice` pages were merged into 5 consolidated pages, and one duplicate
listicle was merged into `/resources/best/best-period-tracker-apps-2026`: 94 pages
retired and 301'd in total. Live routes dropped from 559 to 470; the sitemap dropped
from 533 to 444. These are the route counts the README and `portfolio/METRICS.md`
report today.

## 2026-08-07: Metrics, coverage, and the architecture write-ups

`portfolio/METRICS.md`, the four raw-run files in
[`docs/evidence/`](../docs/evidence/), and the mobile-layout audit are all dated this
day: a full `pnpm build`, `pnpm test:coverage` (60 files, 429 passed, 2 skipped of 431),
and `pnpm verify:mobile-layout:fast` (0 errors, 0 warnings, 1,682 allowlisted, 56
informational across 20 routes). `portfolio/ARCHITECTURE.md`, `portfolio/TESTING.md`,
`portfolio/DECISIONS.md`, and `portfolio/AI-ASSISTED-DEVELOPMENT.md` were written
against this same measured state.

## 2026-08-13 to 2026-08-14: Portfolio restructuring and a corpus-wide accuracy sweep

Recorded in full in
[`docs/goal-portfolio-public/LEDGER.md`](../docs/goal-portfolio-public/LEDGER.md).
Two things in that pass are engineering corrections rather than formatting:

- **The sync claim.** Dozens of content pages stated or implied Floriva has "optional
  encrypted sync" or "cross-device sync." Checked against the app repository (read-only):
  no `fetch`, `XHR`, `WebSocket`, `axios`, or `sendBeacon` call exists anywhere in the app
  source. Floriva has a manual encrypted backup file, not sync. Roughly 100 occurrences
  across about 65 files were rewritten to describe the backup correctly, including two
  head-to-head comparison verdicts and a competitor round-up that had named the false
  sync claim as Floriva's deciding advantage.
- **The device-backup asymmetry.** A guide page claimed Android's Google backup
  "includes local app data," which was backward: Android excludes Floriva's database
  from device backup by explicit configuration, while iOS carries no equivalent
  exclusion, so a standard iCloud backup can include it. Corrected, and the asymmetry is
  now stated rather than smoothed over.

The 2026-05-06 Cloudflare Browser Insights finding (see above) was also revisited on
2026-08-13 and left explicitly unresolved, restated rather than marked fixed, because
nothing in this repository can observe or change a Cloudflare zone dashboard setting.

## 2026-08-14: Snapshot cut

This repository's own `git log` shows one commit at this point, whose subject line
names it the Floriva Web portfolio snapshot. The private working repository's history,
everything narrated above, does not travel with it; see the snapshot note at the top of
the [README](../README.md).

## 2026-08-18: Portfolio-standard pass: index, this log, screenshots, and `SECURITY.md`

Recorded in
[`docs/goal-portfolio-public/LEDGER.md`](../docs/goal-portfolio-public/LEDGER.md#cycle-6-2026-08-18-portfolio-index-engineering-log-image-relocation-and-a-commit-count-correction),
Cycles 6 and 7. This entry exists because a log that stopped at the prior date without
accounting for its own authorship would be silently wrong about when the tree it
describes stopped changing: this file, `portfolio/README.md`, and `portfolio/SECURITY.md`
were all written on this date.

**Cycle 6.** `portfolio/README.md` (the document index) and this file were added, the
first files of their kind in this repository. House-style fixes followed: three
untagged code fences given a `text` tag, a heading-level jump in `portfolio/METRICS.md`
fixed, the README's status blockquote converted to `> [!IMPORTANT]` and its snapshot
disclosure to `> [!NOTE]`, and a `## Contents` list added. The 11 screenshots the README
references moved from `docs/assets/{desktop,mobile}/` to
`portfolio/screenshots/{desktop,mobile}/`, checked first against the private source
repository for stronger captures: none existed; all 17 files there matched this tree's
copies by checksum. A stale commit count, "145 of 278," was corrected to 283 total
commits and 148 Claude-co-authored, in five places across the README and
`portfolio/AI-ASSISTED-DEVELOPMENT.md`.

**Cycle 7.** `portfolio/SECURITY.md` was added, consolidating what Cycle 6 had correctly
flagged as scattered rather than absent: the site's collection statement checked against
the live code, the Sentry scrubbing split by surface, the Cloudflare Browser Insights
finding restated as unresolved, and a live-vs-dormant inventory of all 12 D1 tables. Two
README headings were renamed to the standard's required text: `## The numbers` to
`## By the numbers`, `## If you have 60 seconds` to `## If you read one thing`, with
every internal anchor re-checked afterward.

---

## What this log is not

Not a substitute for [`docs/seo-400/LEDGER.md`](../docs/seo-400/LEDGER.md), which
records individual batches, named reviewer verdicts, and gate output at a level of
detail this page deliberately summarizes rather than repeats. Not a claim that every
engineering decision in this repository's history is represented, only the ones with
a dated file behind them. `portfolio/DECISIONS.md` is the place for the fourteen
decisions that would be expensive to reverse; this page is the place for when things
happened.
