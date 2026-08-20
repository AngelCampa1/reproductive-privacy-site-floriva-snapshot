# Lead-Magnet Consolidation Map (SEO recovery)

Date: 2026-07-06
Owner decision: **consolidate** the `/free/` lead-magnet collection (not noindex).

## Why

The June 20, 2026 Google impressions cliff was an algorithmic content-quality / spam
demotion (unconfirmed June 19 anti-spam update) landing on a young YMYL domain with a large
programmatic footprint. The `/free/` lead magnets are **348 of 872 indexed URLs (40%)**,
heavily templated, and earn ~1 search click per 2.5 months combined — the clearest
"scaled content abuse" signal on the domain. See
`docs/seo-400/JUN21-SEO-INVESTIGATION-PLAN.md` and the recovery plan for full evidence.

Goal: consolidate **348 → ~43 richer survivor pages**, dropping the indexed footprint from
872 to ~567, while keeping every asset live for the conversion funnel (popups, exit-intent,
inline forms, internal CTAs — none of which depend on Google indexing).

## Mechanics (reuse existing systems — do not invent new ones)

- Collection→URL map: `scripts/build-content-data.mjs` `routeMap` (`lead-magnets` → `/free`).
- Retire a slug: delete `content/lead-magnets/<slug>.mdx`, then add
  `"/free/<old-slug>": "/free/<survivor-slug>"` to `legacyExactRedirects` in
  `functions/_middleware.ts` (301). Add a middleware test case in `functions/_middleware.test.ts`.
- Survivor pages keep the richest merged value: combine `answers`, `faqs`, `definitions`,
  `sources` (dedupe), `relatedPages`. Preserve every real citation.
- Rebuild: `pnpm build` regenerates `content-data.ts`, `content-manifest.ts`, and
  `sitemap.xml` (fewer URLs automatically). Note: build re-dirties ~450 generated files with
  CRLF only — `git checkout` those, commit only real changes.
- Every survivor's user-facing copy MUST pass, in order: `humanizer` → `third-grade-copy` →
  zero-lies claim check against `docs/research/` → context-fit. (Repo policy.)
- Fix internal links: after each batch run `pnpm verify:funnel:prod` style link/orphan checks
  so no `relatedPages`/CTA points at a retired slug.

## Consolidation targets (family → survivors)

Counts are current members; survivor slugs are proposed. The keyword grouping mis-sorted a
few items (e.g. some `*-during-period` pain logs landed under birth-control, some appt-prep
under pms) — correct these to the right survivor during execution.

| # | Family (members) | Proposed survivors (~) | Notes |
|---|---|---|---|
| 1 | away-from-home (27) | `period-away-from-home-kit` (travel/events/work), `period-at-college-dorm-kit` | Lowest medical risk — good first batch. |
| 2 | birth-control (~15 true) | `birth-control-side-effect-bleeding-tracker`, `birth-control-switch-refill-planner`, `emergency-contraception-timing-log` | Move mis-sorted pain items out. |
| 3 | first-period-teen (15) | `first-period-starter-kit`, `teen-period-parent-toolkit` | |
| 4 | pms-symptoms-mood (64) | `premenstrual-symptom-tracker`, `pmdd-tracking-treatment-kit`, `period-sleep-insomnia-log`, `uti-urinary-symptom-tracker` | Biggest family; PMDD set is genuinely distinct. |
| 5 | pain-cramps (34) | `period-cramp-pain-diary`, `endometriosis-pain-tracker`, `menstrual-migraine-log`, `vulvar-pain-symptom-log` | |
| 6 | bleeding-clots (27) | `heavy-period-clot-tracker`, `abnormal-breakthrough-bleeding-log`, `period-blood-stain-removal-guide` | |
| 7 | discharge-mucus (9) | `vaginal-discharge-odor-checklist`, `yeast-bv-symptom-prep` | |
| 8 | conditions cyst/endo/fibroid/adeno/pcos (28) | one rich hub each: `adenomyosis-*`, `endometriosis-*`, `fibroid-*`, `ovarian-cyst-*`, `pcos-*` tracker | Real condition search intent — keep 5 strong pages. |
| 9 | medical-appt-prep (28) | `reproductive-health-visit-prep`, `biopsy-pap-mammogram-result-notes`, `thyroid-hormone-lab-organizer` | |
| 10 | perimenopause-lifestage (6) | `perimenopause-symptom-tracker` | |
| 11 | fertility-ovulation (18) | `ovulation-fertility-awareness-chart`, `cycle-length-next-period-calculator`, `late-missed-period-context-log` | |
| 12 | products-leaks-stains (18) | `period-leak-product-kit`, `period-stain-removal-guide` | |
| 13 | privacy-data (22) | keep ~6 on-brand: `period-app-privacy-audit-kit`, `delete-period-data-guide`, `state-risk-scorecard`, `post-dobbs-digital-safety-kit`, `period-tracker-privacy-comparison-matrix`, `switch-period-trackers-guide` | Most valuable/on-brand — consolidate rest into these. |
| 14 | diet-exercise-wellness (4) | `cycle-syncing-food-workout-planner` | |

Target survivors: ~43. Retired (301'd) pages: ~305.

## Progress

- [x] **Batch 1 — away-from-home (2026-07-06):** 28 members → 2 survivors
  (`period-away-from-home-kit`, `period-at-college-dorm-kit`). 28 files deleted, 28 301s added
  to `legacyExactRedirects` + 4 middleware tests (26/26 pass), 11 inbound `relatedPages`
  files repointed, 0 orphan refs. Sitemap 872 → 846. Copy: humanizer-clean (0 AI tells),
  reading grade FK 4.7 / 5.4 — better than the ~FK 6.4 site baseline. **Source-level only, not
  yet committed or deployed.** Two longest merged sentences flagged for optional later tightening.
- [x] **Batches 2–14 (2026-07-06):** 320 members → 32 survivors (worker sub-agents, commit
  3032152). 301s added for every retired slug; 4 middleware tests over verified pairs.
- [x] **Post-consolidation reconciliation (2026-07-06, commits 9797278 + d32806f):**
  - Restored `privacy-guide` (batch-2 over-retired a rich, cited privacy page carrying the
    FTC-2021-order vs 2025-settlement accuracy content; content-page + content tests hard-depend
    on it). Dropped its 301.
  - Repointed 12 survivors' `relatedPages` off hub roots (`/pricing`, `/resources/guides`,
    `/period-tracker-privacy`, …) to real content entries.
  - Repointed retired `/free/` slugs in `internal-links.ts`, `marketing-links.ts`, and 21 funnel
    `ctaPath`s in `lead-magnet-email-data.ts` to survivor routes.
  - SEO400 ledger: `net-new-paths.txt` /free/* → 35 live survivors; `topic-backlog.csv` 327
    retired rows → `consolidated-2026-07-06`, 34 survivor rows added, 1179 internalLinks
    repointed; decoupled the live net-new floor (`--min-net-new`, default 100) from the 400
    total-row floor.
  - **Final state: 35 live lead magnets, sitemap 559 routes (was 872, −36%).** All gates green:
    `pnpm test` 217/217, `verify:seo`, `verify:prerendered-content` (107), `verify:seo400-content`
    (107), `verify:seo400-backlog` (434), `check:links` (0 broken / 0 orphans), `verify:sources`
    (315 pass / 0 error), `verify:lead-magnets` R2 (all PDFs present).
  - **Committed at source level, NOT yet deployed.** Remaining: owner Phase-0 manual-action check
    in GSC, then `wrangler pages deploy dist` + sitemap resubmit.
  - Follow-up (queued): add structured `sources:` frontmatter to `privacy-guide` and
    `post-dobbs-digital-safety-kit-hub` (currently inline citations only) for E-E-A-T.

## Batched rollout

**Note:** batches serialize on `functions/_middleware.ts` (+ its test) — do them one at a time,
review each before the next. Execute one family per batch. Per batch: design survivor(s) → write/merge content (copy skills)
→ delete members → add redirects + middleware tests → `pnpm build` → confirm sitemap URL count
drops by the expected amount → link/orphan check. Deploy the whole consolidation together at the
end (or in a few large deploys), then resubmit `sitemap.xml` in GSC and monitor recovery.

Full member lists per family: regenerate from `content/lead-magnets/` or see session notes.
