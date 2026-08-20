# Index Status Ledger: 2026-07-18

Snapshot of Google Search Console URL-inspection verdicts for every URL in the production sitemap.

- **Snapshot date:** 2026-07-18
- **Source:** `artifacts/sitemap-urls-2026-07-18.txt` (559 URLs)
- **Raw data:** `artifacts/index-status-ledger-2026-07-18.csv` (`url,verdict,coverage,last_crawl`)
- **Property:** `sc-domain:floriva.app`
- **Purpose:** This ledger is the baseline for the strengthen-in-place recovery plan. **No pages get deleted.** Every not-indexed URL below is a strengthen/interlink/consolidate-signal candidate, not a prune candidate.

## Summary

| Verdict | Count | Share |
|---|---:|---:|
| INDEXED (Submitted and indexed) | 350 | 62.6% |
| CRAWLED_NOT_INDEXED | 169 | 30.2% |
| DISCOVERED_NOT_INDEXED | 29 | 5.2% |
| REDIRECT (Page with redirect) | 4 | 0.7% |
| OTHER (unknown to Google / noindex / 403) | 7 | 1.3% |
| **Total** | **559** | 100% |

## Live re-verification of the REDIRECT / OTHER verdicts (2026-07-18)

The 4 REDIRECT and the noindex/403 OTHER verdicts were re-checked against live production the same day. **None of them reproduce: every one is a stale GSC record, not a current defect:**

| URL | GSC verdict | Live check (2026-07-18) |
|---|---|---|
| `/period-tracker-privacy/reproductive-data-privacy-laws-colorado` | Page with redirect | 200, no redirect |
| `/period-tracker-privacy/reproductive-data-privacy-laws-missouri` | Page with redirect | 200, no redirect |
| `/period-tracker-privacy/reproductive-data-privacy-laws-oklahoma` | Page with redirect | 200, no redirect |
| `/resources/guides/can-police-access-period-tracker-data` | Page with redirect | 200, no redirect |
| `/resources/privacy-in-practice/teen-period-app-privacy-checklist` | noindex | serves `index, follow` |
| `/compare/alternatives/rebuild-period-history-after-switching-apps` | 403 (blocked) | 200 for both default and Googlebot user agents |

All six were last crawled 2026-04-05, before the fixes that resolved them. Google simply has not recrawled since the June suppression cut crawl frequency. **Do not open technical remediation work off these rows.** The recrawl itself is the fix, and it follows recovery rather than causing it.

## Per-family breakdown

Family = leading path segment(s). Hub/landing pages are grouped under "Site core".

| Family | Total | Indexed | Not indexed | Indexed % | Not-indexed detail |
|---|---:|---:|---:|---:|---|
| /resources/privacy-in-practice | 98 | 85 | 13 | 87% | 12 crawled-not-indexed, 1 noindex |
| /resources/guides | 67 | 27 | 40 | 40% | 39 crawled-not-indexed, 1 redirect |
| /period-tracker-privacy (state laws) | 52 | 16 | 36 | 31% | 33 crawled-not-indexed, 3 redirects |
| /resources/best | 44 | 42 | 2 | 95% | 1 crawled-, 1 discovered-not-indexed |
| /resources/symptom-guides | 42 | 26 | 16 | 62% | 16 crawled-not-indexed |
| /compare/versus | 36 | 34 | 2 | 94% | 2 crawled-not-indexed |
| /free (lead magnets) | 36 | 5 | 31 | 14% | 26 discovered-not-indexed, 5 unknown to Google |
| /app-guides | 31 | 20 | 11 | 65% | 11 crawled-not-indexed |
| /compare/alternatives | 30 | 25 | 5 | 83% | 4 crawled-not-indexed, 1 blocked (403) |
| /resources/condition-guides | 25 | 11 | 14 | 44% | 14 crawled-not-indexed |
| /resources/hormone-guides | 21 | 15 | 6 | 71% | 6 crawled-not-indexed |
| /resources/wellness-guides | 21 | 8 | 13 | 38% | 12 crawled-, 1 discovered-not-indexed |
| /resources/life-stage-guides | 17 | 8 | 9 | 47% | 9 crawled-not-indexed |
| /compare/pricing | 16 | 14 | 2 | 88% | 2 crawled-not-indexed |
| /tools/quiz | 14 | 6 | 8 | 43% | 8 crawled-not-indexed |
| Site core (/, /compare, /resources, /resources/health, /pricing, /privacy, /privacy-features, /support, /terms) | 9 | 8 | 1 | 89% | /terms discovered-not-indexed |

Family totals include each family's hub/landing page (e.g. `/resources/guides` itself counts in the /resources/guides row); the standalone hubs `/`, `/compare`, and `/resources` are grouped under "Site core". Rows sum to 559.

### Reading the table

- **Strongest families:** /resources/best (95%), /compare/versus (94%), /compare/pricing (88%), /resources/privacy-in-practice (87%), /compare/alternatives (83%).
- **Weakest families:** /free (14%, most lead-magnet pages post-consolidation are still Discovered-not-indexed or unknown to Google; they were only recently created/reconnected), /period-tracker-privacy state pages (31%), /resources/wellness-guides (38%), /resources/guides (40%).
- Most crawled-not-indexed last-crawl dates cluster in early May 2026, right before/around the June 19 spam-update demotion window. Google has crawled these and declined to index them; these are the primary strengthen-in-place targets.

## CRAWLED_NOT_INDEXED: 169 URLs (grouped by family)

Google fetched these pages and chose not to index them. Strengthen content, internal links, and uniqueness signals.

### /app-guides (11)

- https://floriva.app/app-guides/floriva-cycle-syncing-setup (last crawl 2026-06-09)
- https://floriva.app/app-guides/floriva-data-deletion-guide (2026-05-22)
- https://floriva.app/app-guides/floriva-data-export-guide (2026-05-10)
- https://floriva.app/app-guides/floriva-features-endometriosis (2026-05-14)
- https://floriva.app/app-guides/floriva-for-gynecologist-prep (2026-05-24)
- https://floriva.app/app-guides/floriva-for-iud-tracking (2026-05-24)
- https://floriva.app/app-guides/floriva-for-postpartum-recovery (2026-05-08)
- https://floriva.app/app-guides/floriva-for-teens (2026-06-15)
- https://floriva.app/app-guides/floriva-vs-health-apps-insurer-data (2026-05-07)
- https://floriva.app/app-guides/how-to-switch-from-cycles (2026-05-08)
- https://floriva.app/app-guides/how-to-switch-from-maya (2026-05-23)

### /compare/alternatives (4)

- https://floriva.app/compare/alternatives/glow-app-alternative (2026-05-22)
- https://floriva.app/compare/alternatives/natural-cycles-alternative-privacy (2026-05-22)
- https://floriva.app/compare/alternatives/natural-cycles-cancel-delete-data (2026-07-04)
- https://floriva.app/compare/alternatives/what-data-does-flo-have-on-you (2026-05-10)

### /compare/pricing (2)

- https://floriva.app/compare/pricing/flo-premium-pricing-worth-privacy-risk (2026-06-22)
- https://floriva.app/compare/pricing/kindara-app-pricing (2026-05-10)

### /compare/versus (2)

- https://floriva.app/compare/versus/clue-vs-flo-vs-glow (2026-03-31)
- https://floriva.app/compare/versus/flo-vs-floriva-data-comparison (2026-05-10)

### /period-tracker-privacy: state law pages (33)

- https://floriva.app/period-tracker-privacy/reproductive-data-privacy-laws-alabama (2026-05-08)
- https://floriva.app/period-tracker-privacy/reproductive-data-privacy-laws-alaska (2026-05-06)
- https://floriva.app/period-tracker-privacy/reproductive-data-privacy-laws-arkansas (2026-06-07)
- https://floriva.app/period-tracker-privacy/reproductive-data-privacy-laws-connecticut (2026-05-06)
- https://floriva.app/period-tracker-privacy/reproductive-data-privacy-laws-delaware (2026-05-04)
- https://floriva.app/period-tracker-privacy/reproductive-data-privacy-laws-district-of-columbia (2026-05-08)
- https://floriva.app/period-tracker-privacy/reproductive-data-privacy-laws-georgia (2026-05-07)
- https://floriva.app/period-tracker-privacy/reproductive-data-privacy-laws-hawaii (2026-05-08)
- https://floriva.app/period-tracker-privacy/reproductive-data-privacy-laws-idaho (2026-05-06)
- https://floriva.app/period-tracker-privacy/reproductive-data-privacy-laws-illinois (2026-05-23)
- https://floriva.app/period-tracker-privacy/reproductive-data-privacy-laws-indiana (2026-05-05)
- https://floriva.app/period-tracker-privacy/reproductive-data-privacy-laws-iowa (2026-05-08)
- https://floriva.app/period-tracker-privacy/reproductive-data-privacy-laws-kansas (2026-05-25)
- https://floriva.app/period-tracker-privacy/reproductive-data-privacy-laws-kentucky (2026-05-06)
- https://floriva.app/period-tracker-privacy/reproductive-data-privacy-laws-louisiana (2026-05-10)
- https://floriva.app/period-tracker-privacy/reproductive-data-privacy-laws-michigan (2026-05-31)
- https://floriva.app/period-tracker-privacy/reproductive-data-privacy-laws-minnesota (2026-05-10)
- https://floriva.app/period-tracker-privacy/reproductive-data-privacy-laws-montana (2026-05-04)
- https://floriva.app/period-tracker-privacy/reproductive-data-privacy-laws-nebraska (2026-05-08)
- https://floriva.app/period-tracker-privacy/reproductive-data-privacy-laws-nevada (2026-05-06)
- https://floriva.app/period-tracker-privacy/reproductive-data-privacy-laws-new-hampshire (2026-05-12)
- https://floriva.app/period-tracker-privacy/reproductive-data-privacy-laws-new-jersey (2026-05-08)
- https://floriva.app/period-tracker-privacy/reproductive-data-privacy-laws-oregon (2026-05-08)
- https://floriva.app/period-tracker-privacy/reproductive-data-privacy-laws-pennsylvania (2026-06-08)
- https://floriva.app/period-tracker-privacy/reproductive-data-privacy-laws-rhode-island (2026-05-07)
- https://floriva.app/period-tracker-privacy/reproductive-data-privacy-laws-south-carolina (2026-05-08)
- https://floriva.app/period-tracker-privacy/reproductive-data-privacy-laws-south-dakota (2026-05-06)
- https://floriva.app/period-tracker-privacy/reproductive-data-privacy-laws-tennessee (2026-05-13)
- https://floriva.app/period-tracker-privacy/reproductive-data-privacy-laws-virginia (2026-05-10)
- https://floriva.app/period-tracker-privacy/reproductive-data-privacy-laws-washington (2026-05-12)
- https://floriva.app/period-tracker-privacy/reproductive-data-privacy-laws-west-virginia (2026-05-06)
- https://floriva.app/period-tracker-privacy/reproductive-data-privacy-laws-wisconsin (2026-05-08)
- https://floriva.app/period-tracker-privacy/reproductive-data-privacy-laws-wyoming (2026-05-10)

### /resources/best (1)

- https://floriva.app/resources/best/best-period-tracker-no-account (2026-05-30)

### /resources/condition-guides (14)

- https://floriva.app/resources/condition-guides/anemia-heavy-periods (2026-07-04)
- https://floriva.app/resources/condition-guides/anovulatory-cycle-what-it-means (2026-06-12)
- https://floriva.app/resources/condition-guides/endometriosis-fertility-treatment (2026-06-03)
- https://floriva.app/resources/condition-guides/endometriosis-hrt-menopause (2026-05-10)
- https://floriva.app/resources/condition-guides/endometriosis-stage-3-what-to-track (2026-05-07)
- https://floriva.app/resources/condition-guides/fibroids-cycle-changes (2026-05-10)
- https://floriva.app/resources/condition-guides/irregular-periods-causes (2026-05-23)
- https://floriva.app/resources/condition-guides/iud-and-period-changes (2026-05-07)
- https://floriva.app/resources/condition-guides/luteal-phase-defect-causes (2026-05-07)
- https://floriva.app/resources/condition-guides/menorrhagia-heavy-periods-guide (2026-05-07)
- https://floriva.app/resources/condition-guides/pmdd-treatment-options (2026-05-06)
- https://floriva.app/resources/condition-guides/thyroid-period-connection (2026-05-22)
- https://floriva.app/resources/condition-guides/uterine-pain-guide (2026-05-06)
- https://floriva.app/resources/condition-guides/vaginal-pain-during-period (2026-06-09)

### /resources/guides (39)

- https://floriva.app/resources/guides/cycle-syncing-science-explained (2026-05-06)
- https://floriva.app/resources/guides/delete-flo-account-keep-data (2026-06-01)
- https://floriva.app/resources/guides/end-to-end-encryption-period-tracker (2026-05-09)
- https://floriva.app/resources/guides/eu-vs-us-period-data-privacy (2026-05-22)
- https://floriva.app/resources/guides/femtech-data-monetization (2026-05-08)
- https://floriva.app/resources/guides/fertility-awareness-method-complete-guide (2026-07-04)
- https://floriva.app/resources/guides/foia-your-own-health-data (2026-07-04)
- https://floriva.app/resources/guides/hipaa-period-tracker-deep-dive (2026-07-04)
- https://floriva.app/resources/guides/how-period-apps-use-machine-learning (2026-05-22)
- https://floriva.app/resources/guides/how-period-tracker-apps-collect-data (2026-05-18)
- https://floriva.app/resources/guides/how-sdks-leak-period-data (2026-07-04)
- https://floriva.app/resources/guides/how-to-audit-period-app-privacy (2026-06-20)
- https://floriva.app/resources/guides/how-to-read-period-tracker-privacy-policy (2026-05-04)
- https://floriva.app/resources/guides/how-to-switch-from-flo (2026-05-06)
- https://floriva.app/resources/guides/how-to-track-basal-body-temperature (2026-05-10)
- https://floriva.app/resources/guides/how-to-track-cervical-mucus (2026-07-06)
- https://floriva.app/resources/guides/how-we-rank-period-trackers (2026-05-09)
- https://floriva.app/resources/guides/insurance-reproductive-data (2026-05-22)
- https://floriva.app/resources/guides/is-flo-safe-to-use (2026-05-31)
- https://floriva.app/resources/guides/on-device-storage-period-tracker (2026-05-10)
- https://floriva.app/resources/guides/ovulation-test-how-to-use (2026-05-10)
- https://floriva.app/resources/guides/period-app-account-security (2026-05-08)
- https://floriva.app/resources/guides/period-app-privacy-architecture-guide (2026-05-11)
- https://floriva.app/resources/guides/period-data-divorce-proceedings (2026-07-04)
- https://floriva.app/resources/guides/period-tracker-data-minimization-guide (2026-05-07)
- https://floriva.app/resources/guides/period-tracker-hipaa (2026-05-29)
- https://floriva.app/resources/guides/period-tracker-safe-after-roe-v-wade (2026-07-05)
- https://floriva.app/resources/guides/period-tracker-usage-after-dobbs (2026-05-13)
- https://floriva.app/resources/guides/period-tracking-legal-safety-guide (2026-05-07)
- https://floriva.app/resources/guides/period-tracking-without-cloud (2026-07-02)
- https://floriva.app/resources/guides/pmdd-period-tracking-guide (2026-06-17)
- https://floriva.app/resources/guides/premom-data-sharing-ftc (2026-05-08)
- https://floriva.app/resources/guides/reproductive-data-prosecutions-after-dobbs (2026-05-11)
- https://floriva.app/resources/guides/school-devices-period-tracking (2026-05-06)
- https://floriva.app/resources/guides/stardust-privacy-claims-debunked (2026-05-06)
- https://floriva.app/resources/guides/state-health-privacy-laws-after-hipaa (2026-05-13)
- https://floriva.app/resources/guides/switching-from-cloud-period-trackers (2026-07-04)
- https://floriva.app/resources/guides/switching-from-flo-complete-guide (2026-05-07)
- https://floriva.app/resources/guides/tracking-irregular-cycle-data-analysis (2026-05-22)

### /resources/hormone-guides (6)

- https://floriva.app/resources/hormone-guides/cortisol-and-menstrual-cycle (2026-05-08)
- https://floriva.app/resources/hormone-guides/estrogen-and-mood-cycle (2026-06-23)
- https://floriva.app/resources/hormone-guides/high-progesterone-symptoms (2026-06-21)
- https://floriva.app/resources/hormone-guides/hormone-testing-timing-guide (2026-05-06)
- https://floriva.app/resources/hormone-guides/how-to-test-hormones-at-home (2026-05-22)
- https://floriva.app/resources/hormone-guides/testosterone-in-women-cycle (2026-05-14)

### /resources/life-stage-guides (9)

- https://floriva.app/resources/life-stage-guides/birth-control-period-changes (2026-05-07)
- https://floriva.app/resources/life-stage-guides/breastfeeding-and-periods (2026-05-10)
- https://floriva.app/resources/life-stage-guides/luteal-phase-length-guide (2026-05-07)
- https://floriva.app/resources/life-stage-guides/menstrual-cycle-phases-symptoms (2026-05-08)
- https://floriva.app/resources/life-stage-guides/perimenopause-hormone-changes-tracking (2026-05-24)
- https://floriva.app/resources/life-stage-guides/period-tracking-after-miscarriage (2026-07-03)
- https://floriva.app/resources/life-stage-guides/plan-b-period-timing (2026-05-07)
- https://floriva.app/resources/life-stage-guides/postpartum-period-return (2026-07-04)
- https://floriva.app/resources/life-stage-guides/signs-your-period-is-coming (2026-05-24)

### /resources/privacy-in-practice (12)

- https://floriva.app/resources/privacy-in-practice/anonymous-period-tracking-guide (2026-05-23)
- https://floriva.app/resources/privacy-in-practice/data-broker-exposure-check (2026-05-06)
- https://floriva.app/resources/privacy-in-practice/partner-access-period-tracker-data (2026-06-20)
- https://floriva.app/resources/privacy-in-practice/period-app-data-criminal-investigation-risk (2026-05-07)
- https://floriva.app/resources/privacy-in-practice/period-data-after-breakup-divorce (2026-05-08)
- https://floriva.app/resources/privacy-in-practice/period-data-for-endometriosis-diagnosis (2026-05-24)
- https://floriva.app/resources/privacy-in-practice/period-data-in-stalking-cases (2026-05-08)
- https://floriva.app/resources/privacy-in-practice/period-tracker-data-fertility-clinic (2026-05-22)
- https://floriva.app/resources/privacy-in-practice/period-tracking-and-domestic-violence-safety (2026-05-07)
- https://floriva.app/resources/privacy-in-practice/period-tracking-workplace-accommodation (2026-05-07)
- https://floriva.app/resources/privacy-in-practice/secure-period-data-backup (2026-07-18)
- https://floriva.app/resources/privacy-in-practice/what-subpoenas-actually-request (2026-07-04)

### /resources/symptom-guides (16)

- https://floriva.app/resources/symptom-guides/basal-body-temperature-during-cycle (2026-05-06)
- https://floriva.app/resources/symptom-guides/bleeding-after-sex-no-pain (2026-06-12)
- https://floriva.app/resources/symptom-guides/bleeding-between-periods (2026-05-25)
- https://floriva.app/resources/symptom-guides/breast-pain-after-period (2026-05-06)
- https://floriva.app/resources/symptom-guides/cervical-mucus-throughout-cycle (2026-05-07)
- https://floriva.app/resources/symptom-guides/cramps-but-no-period (2026-07-04)
- https://floriva.app/resources/symptom-guides/cycle-fatigue-tracking (2026-05-06)
- https://floriva.app/resources/symptom-guides/how-long-does-ovulation-last (2026-05-08)
- https://floriva.app/resources/symptom-guides/maximum-days-period-can-be-late (2026-05-22)
- https://floriva.app/resources/symptom-guides/ovulation-symptoms-discharge (2026-05-07)
- https://floriva.app/resources/symptom-guides/period-bloating-patterns (2026-05-10)
- https://floriva.app/resources/symptom-guides/period-blood-colors-guide (2026-06-21)
- https://floriva.app/resources/symptom-guides/pmdd-symptoms-vs-pms (2026-05-07)
- https://floriva.app/resources/symptom-guides/shorter-menstrual-cycle-meaning (2026-06-23)
- https://floriva.app/resources/symptom-guides/spotting-a-week-after-period (2026-05-22)
- https://floriva.app/resources/symptom-guides/spotting-before-period (2026-05-08)

### /resources/wellness-guides (12)

- https://floriva.app/resources/wellness-guides/adenomyosis-diet-food-guide (2026-05-07)
- https://floriva.app/resources/wellness-guides/anti-inflammatory-diet-for-periods (2026-05-06)
- https://floriva.app/resources/wellness-guides/cycle-syncing-food-chart (2026-06-06)
- https://floriva.app/resources/wellness-guides/endometriosis-diet-guide (2026-05-08)
- https://floriva.app/resources/wellness-guides/fertility-diet-plan (2026-07-04)
- https://floriva.app/resources/wellness-guides/heat-therapy-period-cramps (2026-05-07)
- https://floriva.app/resources/wellness-guides/how-to-regulate-your-period-naturally (2026-05-22)
- https://floriva.app/resources/wellness-guides/how-to-stop-period-pain-at-home (2026-05-07)
- https://floriva.app/resources/wellness-guides/magnesium-for-menstrual-health (2026-05-07)
- https://floriva.app/resources/wellness-guides/natural-remedies-period-cramps (2026-07-04)
- https://floriva.app/resources/wellness-guides/pcos-diet-plan-for-periods (2026-05-06)
- https://floriva.app/resources/wellness-guides/stress-cycle-length-connection (2026-07-04)

### /tools/quiz (8)

- https://floriva.app/tools/quiz/cloud-vs-local-storage-quiz (2026-07-04)
- https://floriva.app/tools/quiz/cycle-tracking-method-finder (2026-05-06)
- https://floriva.app/tools/quiz/how-private-is-your-period-tracker (2026-05-08)
- https://floriva.app/tools/quiz/is-your-teen-ready-for-period-tracker (2026-05-22)
- https://floriva.app/tools/quiz/is-your-tracker-safe-in-your-state (2026-07-04)
- https://floriva.app/tools/quiz/period-tracking-beginner-guide-quiz (2026-06-12)
- https://floriva.app/tools/quiz/should-you-switch-period-trackers (2026-07-04)
- https://floriva.app/tools/quiz/which-period-tracker-is-right-for-you (2026-06-16)

## DISCOVERED_NOT_INDEXED: 29 URLs (grouped by family)

Google knows these URLs exist (sitemap/links) but has never crawled them. Mostly the rebuilt `/free/` lead-magnet pages from the July consolidation, expected lag, but internal linking should accelerate crawl.

### /free (26)

- https://floriva.app/free/abnormal-bleeding-log
- https://floriva.app/free/biopsy-result-visit-notes
- https://floriva.app/free/birth-control-tracking-kit
- https://floriva.app/free/cycle-syncing-food-workout-planner
- https://floriva.app/free/delete-period-data-guide
- https://floriva.app/free/emergency-contraception-log
- https://floriva.app/free/endometriosis-tracking-kit
- https://floriva.app/free/fibroid-tracking-kit
- https://floriva.app/free/heavy-period-clot-tracker
- https://floriva.app/free/late-missed-period-log
- https://floriva.app/free/ovarian-cyst-tracking-kit
- https://floriva.app/free/ovulation-fertility-awareness-kit
- https://floriva.app/free/pcos-tracking-kit
- https://floriva.app/free/period-app-privacy-audit-kit
- https://floriva.app/free/period-at-college-dorm-kit
- https://floriva.app/free/period-away-from-home-kit
- https://floriva.app/free/period-blood-stain-removal-guide
- https://floriva.app/free/period-leak-and-product-kit
- https://floriva.app/free/period-pain-cramp-diary
- https://floriva.app/free/period-sleep-log
- https://floriva.app/free/personal-cycle-health-record
- https://floriva.app/free/pmdd-tracking-kit
- https://floriva.app/free/reproductive-visit-prep-kit
- https://floriva.app/free/thyroid-hormone-lab-organizer
- https://floriva.app/free/uti-urinary-symptom-tracker
- https://floriva.app/free/vaginal-discharge-odor-checklist

### /resources/best (1)

- https://floriva.app/resources/best/best-period-apps-after-roe

### /resources/wellness-guides (1)

- https://floriva.app/resources/wellness-guides/exercise-during-period

### Site core (1)

- https://floriva.app/terms

## REDIRECT: 4 URLs

These sitemap URLs currently resolve as "Page with redirect" in GSC (all last crawled 2026-04-05). Verify the sitemap should point at the final URL instead.

- https://floriva.app/period-tracker-privacy/reproductive-data-privacy-laws-colorado
- https://floriva.app/period-tracker-privacy/reproductive-data-privacy-laws-missouri
- https://floriva.app/period-tracker-privacy/reproductive-data-privacy-laws-oklahoma
- https://floriva.app/resources/guides/can-police-access-period-tracker-data

## OTHER: 7 URLs

| URL | Coverage | Last crawl |
|---|---|---|
| https://floriva.app/free/adenomyosis-tracking-kit | URL is unknown to Google | Never |
| https://floriva.app/free/first-period-starter-kit | URL is unknown to Google | Never |
| https://floriva.app/free/menstrual-migraine-log | URL is unknown to Google | Never |
| https://floriva.app/free/post-dobbs-digital-safety-kit-hub | URL is unknown to Google | Never |
| https://floriva.app/free/vulvar-symptom-log | URL is unknown to Google | Never |
| https://floriva.app/resources/privacy-in-practice/teen-period-app-privacy-checklist | Excluded by 'noindex' tag | 2026-07-01 |
| https://floriva.app/compare/alternatives/rebuild-period-history-after-switching-apps | Blocked due to access forbidden (403) | 2026-07-10 |

Follow-ups worth confirming (not part of this snapshot's scope):

- The `noindex` on `/resources/privacy-in-practice/teen-period-app-privacy-checklist`: intentional or leftover?
- The 403 on `/compare/alternatives/rebuild-period-history-after-switching-apps`: likely a bot-challenge/edge rule blocking Googlebot.
- The five "unknown to Google" `/free/` URLs are in the sitemap but Google has not registered them yet.

## Notes

- Inspection ran 2026-07-18 via GSC URL Inspection API in 112 batches; 1 transient HTTP 500 (on `/resources/wellness-guides/anti-inflammatory-diet-for-periods`) succeeded on retry. 0 URLs failed after retries.
- This ledger is the baseline for the strengthen-in-place recovery plan (see `docs/seo-400/PLAN.md` and the June 2026 drop diagnosis). No pages get deleted; recovery work = strengthen thin/duplicative pages, deepen internal linking, and rebuild E-E-A-T signals, then re-run this snapshot to measure movement.
