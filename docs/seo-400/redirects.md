# SEO-400 redirect ledger

This ledger records whether SEO-400 pages are net new or need redirects.

| Old path | New path | Status | Reason |
| --- | --- | --- | --- |
| none | `docs/seo-400/net-new-paths.txt` | net-new | The rollout path list is treated as newly added public inventory unless a row is added below. |
| `/compare/alternatives/clue-app-alternative` | `/compare/alternatives/clue-alternative-no-cloud` | configured | Legacy guessed alternative slug now maps to the canonical privacy-led Clue alternative. |
| `/compare/alternatives/flo-alternative-privacy-first` | `/compare/alternatives/flo-app-alternative` | configured | Legacy Flo alternative slug now maps to the canonical app alternative. |
| `/compare/alternatives/natural-cycles-alternative` | `/compare/alternatives/natural-cycles-alternative-privacy` | configured | Legacy Natural Cycles slug now maps to the privacy-specific canonical alternative. |
| `/compare/alternatives/stardust-app-alternative` | `/compare/alternatives/stardust-alternative-local-storage` | configured | Legacy Stardust alternative slug now maps to the local-storage canonical alternative. |
| `/compare/pricing/clue-app-pricing` | `/compare/pricing/clue-plus-pricing-vs-privacy-cost` | configured | Legacy pricing slug now maps to the canonical Clue Plus pricing page. |
| `/compare/pricing/flo-health-pricing` | `/compare/pricing/flo-premium-pricing-worth-privacy-risk` | configured | Legacy pricing slug now maps to the canonical Flo Premium pricing page. |
| `/compare/pricing/natural-cycles-pricing` | `/compare/pricing/natural-cycles-pricing-review` | configured | Legacy pricing slug now maps to the canonical Natural Cycles review. |
| `/compare/versus/euki-vs-drip` | `/compare/versus/euki-vs-drip-privacy-trackers` | configured | Legacy comparison slug now maps to the privacy-trackers comparison. |
| `/compare/versus/flo-vs-clue` | `/compare/versus/flo-vs-clue-privacy-comparison` | configured | Legacy versus slug now maps to the canonical privacy comparison. |
| `/compare/versus/natural-cycles-vs-clue` | `/compare/versus/natural-cycles-vs-clue-data-privacy` | configured | Legacy versus slug now maps to the canonical data-privacy comparison. |
| `/resources/guides/switching-from-flo-privacy-guide` | `/resources/guides/switching-from-flo-complete-guide` | configured | Legacy guide slug now maps to the complete switching guide. |
| `/alternatives` | `/compare/alternatives` | configured | Legacy collection root now maps to the current compare alternatives route base. |
| `/comparisons` | `/compare/versus` | configured | Legacy collection root now maps to the current versus route base. |
| `/guides` | `/resources/guides` | configured | Legacy collection root now maps to the current resources guide route base. |
| `/listicles` | `/resources/best` | configured | Legacy collection root now maps to the current ranked-list route base. |
| `/pricing-breakdowns` | `/compare/pricing` | configured | Legacy collection root now maps to the current pricing route base. |
| `/reproductive-privacy-state-pages` | `/period-tracker-privacy` | configured | Legacy collection root now maps to the current state privacy route base. |

When a page is renamed, moved, or replaces an older guessed route, add a row here and add the matching 301 in `functions/_middleware.ts`.

## Lead-magnet consolidation (2026-07-06)

The `/free` collection was consolidated from 348 narrow single-topic pages down to 35 kits.
Every retired slug 301s to the surviving kit that now covers its topic. These redirects are
configured in `legacyExactRedirects` in `functions/_middleware.ts`.

| Old path | New path | Status | Reason |
| --- | --- | --- | --- |
| `/free/7-day-pcos-meal-planning-worksheet` | `/free/pcos-tracking-kit` | configured | Lead-magnet consolidation (2026-07-06): single-topic page folded into the surviving kit. |
| `/free/abnormal-bleeding-diary-doctor-visit` | `/free/abnormal-bleeding-log` | configured | Lead-magnet consolidation (2026-07-06): single-topic page folded into the surviving kit. |
| `/free/abnormal-mammogram-result-notes` | `/free/biopsy-result-visit-notes` | configured | Lead-magnet consolidation (2026-07-06): single-topic page folded into the surviving kit. |
| `/free/abnormal-pap-result-question-list` | `/free/reproductive-visit-prep-kit` | configured | Lead-magnet consolidation (2026-07-06): single-topic page folded into the surviving kit. |
| `/free/acne-before-period-skin-log` | `/free/premenstrual-symptom-tracker` | configured | Lead-magnet consolidation (2026-07-06): single-topic page folded into the surviving kit. |
| `/free/adenomyosis-belly-pressure-tracker` | `/free/adenomyosis-tracking-kit` | configured | Lead-magnet consolidation (2026-07-06): single-topic page folded into the surviving kit. |
| `/free/adenomyosis-bleeding-and-clot-log` | `/free/adenomyosis-tracking-kit` | configured | Lead-magnet consolidation (2026-07-06): single-topic page folded into the surviving kit. |
| `/free/adenomyosis-pain-flare-log` | `/free/adenomyosis-tracking-kit` | configured | Lead-magnet consolidation (2026-07-06): single-topic page folded into the surviving kit. |
| `/free/adenomyosis-symptom-checklist-no-diagnosis` | `/free/adenomyosis-tracking-kit` | configured | Lead-magnet consolidation (2026-07-06): single-topic page folded into the surviving kit. |
| `/free/adenomyosis-treatment-decision-question-list` | `/free/adenomyosis-tracking-kit` | configured | Lead-magnet consolidation (2026-07-06): single-topic page folded into the surviving kit. |
| `/free/adenomyosis-ultrasound-mri-question-list` | `/free/adenomyosis-tracking-kit` | configured | Lead-magnet consolidation (2026-07-06): single-topic page folded into the surviving kit. |
| `/free/adenomyosis-vs-endometriosis-fibroids-checklist` | `/free/adenomyosis-tracking-kit` | configured | Lead-magnet consolidation (2026-07-06): single-topic page folded into the surviving kit. |
| `/free/adhd-worse-before-period-notes` | `/free/premenstrual-symptom-tracker` | configured | Lead-magnet consolidation (2026-07-06): single-topic page folded into the surviving kit. |
| `/free/anger-before-period-notes` | `/free/premenstrual-symptom-tracker` | configured | Lead-magnet consolidation (2026-07-06): single-topic page folded into the surviving kit. |
| `/free/antibiotics-birth-control-question-list` | `/free/birth-control-tracking-kit` | configured | Lead-magnet consolidation (2026-07-06): single-topic page folded into the surviving kit. |
| `/free/antibiotics-cycle-notes-list` | `/free/reproductive-visit-prep-kit` | configured | Lead-magnet consolidation (2026-07-06): single-topic page folded into the surviving kit. |
| `/free/anxiety-before-period-cycle-log` | `/free/premenstrual-symptom-tracker` | configured | Lead-magnet consolidation (2026-07-06): single-topic page folded into the surviving kit. |
| `/free/bbt-disruption-log` | `/free/ovulation-fertility-awareness-kit` | configured | Lead-magnet consolidation (2026-07-06): single-topic page folded into the surviving kit. |
| `/free/before-period-mood-doctor-message-script` | `/free/premenstrual-symptom-tracker` | configured | Lead-magnet consolidation (2026-07-06): single-topic page folded into the surviving kit. |
| `/free/birth-control-illness-dose-note-sheet` | `/free/birth-control-tracking-kit` | configured | Lead-magnet consolidation (2026-07-06): single-topic page folded into the surviving kit. |
| `/free/birth-control-medicine-interaction-checklist` | `/free/birth-control-tracking-kit` | configured | Lead-magnet consolidation (2026-07-06): single-topic page folded into the surviving kit. |
| `/free/birth-control-patch-bleeding-log` | `/free/birth-control-tracking-kit` | configured | Lead-magnet consolidation (2026-07-06): single-topic page folded into the surviving kit. |
| `/free/birth-control-patch-change-notes` | `/free/birth-control-tracking-kit` | configured | Lead-magnet consolidation (2026-07-06): single-topic page folded into the surviving kit. |
| `/free/birth-control-patch-side-effect-question-list` | `/free/birth-control-tracking-kit` | configured | Lead-magnet consolidation (2026-07-06): single-topic page folded into the surviving kit. |
| `/free/birth-control-pharmacy-refill-privacy-card` | `/free/birth-control-tracking-kit` | configured | Lead-magnet consolidation (2026-07-06): single-topic page folded into the surviving kit. |
| `/free/birth-control-pill-pack-notes` | `/free/birth-control-tracking-kit` | configured | Lead-magnet consolidation (2026-07-06): single-topic page folded into the surviving kit. |
| `/free/birth-control-pill-reminder-privacy-card` | `/free/birth-control-tracking-kit` | configured | Lead-magnet consolidation (2026-07-06): single-topic page folded into the surviving kit. |
| `/free/birth-control-refill-gap-planner` | `/free/birth-control-tracking-kit` | configured | Lead-magnet consolidation (2026-07-06): single-topic page folded into the surviving kit. |
| `/free/birth-control-ring-bleeding-log` | `/free/birth-control-tracking-kit` | configured | Lead-magnet consolidation (2026-07-06): single-topic page folded into the surviving kit. |
| `/free/birth-control-side-effect-tracker` | `/free/birth-control-tracking-kit` | configured | Lead-magnet consolidation (2026-07-06): single-topic page folded into the surviving kit. |
| `/free/birth-control-supplement-disclosure-card` | `/free/birth-control-tracking-kit` | configured | Lead-magnet consolidation (2026-07-06): single-topic page folded into the surviving kit. |
| `/free/birth-control-switch-checklist` | `/free/birth-control-tracking-kit` | configured | Lead-magnet consolidation (2026-07-06): single-topic page folded into the surviving kit. |
| `/free/birth-control-time-zone-travel-question-list` | `/free/birth-control-tracking-kit` | configured | Lead-magnet consolidation (2026-07-06): single-topic page folded into the surviving kit. |
| `/free/birth-control-vomiting-diarrhea-question-list` | `/free/birth-control-tracking-kit` | configured | Lead-magnet consolidation (2026-07-06): single-topic page folded into the surviving kit. |
| `/free/bladder-pain-before-period-tracker` | `/free/period-pain-cramp-diary` | configured | Lead-magnet consolidation (2026-07-06): single-topic page folded into the surviving kit. |
| `/free/bleeding-after-plan-b-notes` | `/free/emergency-contraception-log` | configured | Lead-magnet consolidation (2026-07-06): single-topic page folded into the surviving kit. |
| `/free/bleeding-after-sex-before-period-tracker` | `/free/abnormal-bleeding-log` | configured | Lead-magnet consolidation (2026-07-06): single-topic page folded into the surviving kit. |
| `/free/bleeding-after-sex-on-birth-control-notes` | `/free/abnormal-bleeding-log` | configured | Lead-magnet consolidation (2026-07-06): single-topic page folded into the surviving kit. |
| `/free/bleeding-after-sex-tracker` | `/free/abnormal-bleeding-log` | configured | Lead-magnet consolidation (2026-07-06): single-topic page folded into the surviving kit. |
| `/free/body-aches-before-period-log` | `/free/premenstrual-symptom-tracker` | configured | Lead-magnet consolidation (2026-07-06): single-topic page folded into the surviving kit. |
| `/free/brain-fog-before-period-tracker` | `/free/premenstrual-symptom-tracker` | configured | Lead-magnet consolidation (2026-07-06): single-topic page folded into the surviving kit. |
| `/free/breakthrough-bleeding-log` | `/free/abnormal-bleeding-log` | configured | Lead-magnet consolidation (2026-07-06): single-topic page folded into the surviving kit. |
| `/free/breast-biopsy-result-notes` | `/free/biopsy-result-visit-notes` | configured | Lead-magnet consolidation (2026-07-06): single-topic page folded into the surviving kit. |
| `/free/breast-cyst-symptom-question-list` | `/free/biopsy-result-visit-notes` | configured | Lead-magnet consolidation (2026-07-06): single-topic page folded into the surviving kit. |
| `/free/breast-lump-cycle-note-sheet` | `/free/biopsy-result-visit-notes` | configured | Lead-magnet consolidation (2026-07-06): single-topic page folded into the surviving kit. |
| `/free/breast-pain-after-period-notes` | `/free/period-pain-cramp-diary` | configured | Lead-magnet consolidation (2026-07-06): single-topic page folded into the surviving kit. |
| `/free/breast-tenderness-before-period-tracker` | `/free/premenstrual-symptom-tracker` | configured | Lead-magnet consolidation (2026-07-06): single-topic page folded into the surviving kit. |
| `/free/breast-ultrasound-result-questions` | `/free/biopsy-result-visit-notes` | configured | Lead-magnet consolidation (2026-07-06): single-topic page folded into the surviving kit. |
| `/free/brown-discharge-after-sex-notes` | `/free/vaginal-discharge-odor-checklist` | configured | Lead-magnet consolidation (2026-07-06): single-topic page folded into the surviving kit. |
| `/free/bv-symptom-visit-prep-checklist` | `/free/vaginal-discharge-odor-checklist` | configured | Lead-magnet consolidation (2026-07-06): single-topic page folded into the surviving kit. |
| `/free/campus-period-product-refill-plan` | `/free/period-at-college-dorm-kit` | configured | Lead-magnet consolidation (2026-07-06): single-topic page folded into the surviving kit. |
| `/free/cant-focus-before-period-work-sheet` | `/free/premenstrual-symptom-tracker` | configured | Lead-magnet consolidation (2026-07-06): single-topic page folded into the surviving kit. |
| `/free/cant-sleep-before-period-notes` | `/free/period-sleep-log` | configured | Lead-magnet consolidation (2026-07-06): single-topic page folded into the surviving kit. |
| `/free/cbc-heavy-period-question-list` | `/free/heavy-period-clot-tracker` | configured | Lead-magnet consolidation (2026-07-06): single-topic page folded into the surviving kit. |
| `/free/cervical-biopsy-result-notes` | `/free/biopsy-result-visit-notes` | configured | Lead-magnet consolidation (2026-07-06): single-topic page folded into the surviving kit. |
| `/free/cervical-mucus-tracking-chart` | `/free/vaginal-discharge-odor-checklist` | configured | Lead-magnet consolidation (2026-07-06): single-topic page folded into the surviving kit. |
| `/free/chills-before-period-tracker` | `/free/premenstrual-symptom-tracker` | configured | Lead-magnet consolidation (2026-07-06): single-topic page folded into the surviving kit. |
| `/free/clinic-phone-call-period-script` | `/free/reproductive-visit-prep-kit` | configured | Lead-magnet consolidation (2026-07-06): single-topic page folded into the surviving kit. |
| `/free/clue-data-export-review-worksheet` | `/free/delete-period-data-guide` | configured | Lead-magnet consolidation (2026-07-06): single-topic page folded into the surviving kit. |
| `/free/college-move-in-period-health-checklist` | `/free/period-at-college-dorm-kit` | configured | Lead-magnet consolidation (2026-07-06): single-topic page folded into the surviving kit. |
| `/free/college-period-packing-list` | `/free/period-at-college-dorm-kit` | configured | Lead-magnet consolidation (2026-07-06): single-topic page folded into the surviving kit. |
| `/free/colposcopy-question-checklist` | `/free/biopsy-result-visit-notes` | configured | Lead-magnet consolidation (2026-07-06): single-topic page folded into the surviving kit. |
| `/free/colposcopy-recovery-note-sheet` | `/free/biopsy-result-visit-notes` | configured | Lead-magnet consolidation (2026-07-06): single-topic page folded into the surviving kit. |
| `/free/constipation-before-period-tracker` | `/free/premenstrual-symptom-tracker` | configured | Lead-magnet consolidation (2026-07-06): single-topic page folded into the surviving kit. |
| `/free/cramps-but-no-period-visit-notes` | `/free/period-pain-cramp-diary` | configured | Lead-magnet consolidation (2026-07-06): single-topic page folded into the surviving kit. |
| `/free/crying-before-period-tracker` | `/free/premenstrual-symptom-tracker` | configured | Lead-magnet consolidation (2026-07-06): single-topic page folded into the surviving kit. |
| `/free/cycle-day-counting-chart` | `/free/cycle-length-calculator-kit` | configured | Lead-magnet consolidation (2026-07-06): single-topic page folded into the surviving kit. |
| `/free/cycle-focus-visit-summary` | `/free/reproductive-visit-prep-kit` | configured | Lead-magnet consolidation (2026-07-06): single-topic page folded into the surviving kit. |
| `/free/cycle-length-calculator-worksheet` | `/free/cycle-length-calculator-kit` | configured | Lead-magnet consolidation (2026-07-06): single-topic page folded into the surviving kit. |
| `/free/cycle-mood-support-person-note` | `/free/premenstrual-symptom-tracker` | configured | Lead-magnet consolidation (2026-07-06): single-topic page folded into the surviving kit. |
| `/free/cycle-syncing-planner` | `/free/cycle-syncing-food-workout-planner` | configured | Lead-magnet consolidation (2026-07-06): single-topic page folded into the surviving kit. |
| `/free/cycle-tracking-starter-kit-teens` | `/free/first-period-starter-kit` | configured | Lead-magnet consolidation (2026-07-06): single-topic page folded into the surviving kit. |
| `/free/cycle-tracking-starter-template` | `/free/first-period-starter-kit` | configured | Lead-magnet consolidation (2026-07-06): single-topic page folded into the surviving kit. |
| `/free/data-deletion-request-guide` | `/free/delete-period-data-guide` | configured | Lead-magnet consolidation (2026-07-06): single-topic page folded into the surviving kit. |
| `/free/depo-shot-bleeding-calendar` | `/free/birth-control-tracking-kit` | configured | Lead-magnet consolidation (2026-07-06): single-topic page folded into the surviving kit. |
| `/free/depressed-before-period-note-sheet` | `/free/premenstrual-symptom-tracker` | configured | Lead-magnet consolidation (2026-07-06): single-topic page folded into the surviving kit. |
| `/free/diarrhea-before-period-tracker` | `/free/premenstrual-symptom-tracker` | configured | Lead-magnet consolidation (2026-07-06): single-topic page folded into the surviving kit. |
| `/free/dizziness-during-period-notes` | `/free/premenstrual-symptom-tracker` | configured | Lead-magnet consolidation (2026-07-06): single-topic page folded into the surviving kit. |
| `/free/doctor-appointment-notes-template-periods` | `/free/reproductive-visit-prep-kit` | configured | Lead-magnet consolidation (2026-07-06): single-topic page folded into the surviving kit. |
| `/free/dorm-laundry-period-stain-plan` | `/free/period-at-college-dorm-kit` | configured | Lead-magnet consolidation (2026-07-06): single-topic page folded into the surviving kit. |
| `/free/dorm-period-kit-checklist` | `/free/period-at-college-dorm-kit` | configured | Lead-magnet consolidation (2026-07-06): single-topic page folded into the surviving kit. |
| `/free/early-late-period-timing-log` | `/free/cycle-length-calculator-kit` | configured | Lead-magnet consolidation (2026-07-06): single-topic page folded into the surviving kit. |
| `/free/ella-period-timing-notes` | `/free/emergency-contraception-log` | configured | Lead-magnet consolidation (2026-07-06): single-topic page folded into the surviving kit. |
| `/free/emergency-contraception-cycle-follow-up-log` | `/free/emergency-contraception-log` | configured | Lead-magnet consolidation (2026-07-06): single-topic page folded into the surviving kit. |
| `/free/emergency-contraception-pharmacist-question-list` | `/free/emergency-contraception-log` | configured | Lead-magnet consolidation (2026-07-06): single-topic page folded into the surviving kit. |
| `/free/employer-wellness-app-privacy-audit` | `/free/period-app-privacy-audit-kit` | configured | Lead-magnet consolidation (2026-07-06): single-topic page folded into the surviving kit. |
| `/free/endometriosis-appointment-prep-checklist` | `/free/endometriosis-tracking-kit` | configured | Lead-magnet consolidation (2026-07-06): single-topic page folded into the surviving kit. |
| `/free/endometriosis-bowel-bladder-symptom-log` | `/free/endometriosis-tracking-kit` | configured | Lead-magnet consolidation (2026-07-06): single-topic page folded into the surviving kit. |
| `/free/endometriosis-diet-symptom-trigger-log` | `/free/endometriosis-tracking-kit` | configured | Lead-magnet consolidation (2026-07-06): single-topic page folded into the surviving kit. |
| `/free/endometriosis-laparoscopy-recovery-log` | `/free/endometriosis-tracking-kit` | configured | Lead-magnet consolidation (2026-07-06): single-topic page folded into the surviving kit. |
| `/free/endometriosis-pain-diary` | `/free/endometriosis-tracking-kit` | configured | Lead-magnet consolidation (2026-07-06): single-topic page folded into the surviving kit. |
| `/free/endometriosis-pain-relief-trial-log` | `/free/endometriosis-tracking-kit` | configured | Lead-magnet consolidation (2026-07-06): single-topic page folded into the surviving kit. |
| `/free/endometriosis-symptom-checklist-no-quiz` | `/free/endometriosis-tracking-kit` | configured | Lead-magnet consolidation (2026-07-06): single-topic page folded into the surviving kit. |
| `/free/endometriosis-ultrasound-question-list` | `/free/endometriosis-tracking-kit` | configured | Lead-magnet consolidation (2026-07-06): single-topic page folded into the surviving kit. |
| `/free/exercise-during-period-symptom-log` | `/free/cycle-syncing-food-workout-planner` | configured | Lead-magnet consolidation (2026-07-06): single-topic page folded into the surviving kit. |
| `/free/exercise-weight-change-period-log` | `/free/cycle-syncing-food-workout-planner` | configured | Lead-magnet consolidation (2026-07-06): single-topic page folded into the surviving kit. |
| `/free/fatigue-before-period-tracker` | `/free/premenstrual-symptom-tracker` | configured | Lead-magnet consolidation (2026-07-06): single-topic page folded into the surviving kit. |
| `/free/ferritin-result-question-card` | `/free/thyroid-hormone-lab-organizer` | configured | Lead-magnet consolidation (2026-07-06): single-topic page folded into the surviving kit. |
| `/free/fertility-awareness-chart-review-checklist` | `/free/ovulation-fertility-awareness-kit` | configured | Lead-magnet consolidation (2026-07-06): single-topic page folded into the surviving kit. |
| `/free/fertility-awareness-method-chart` | `/free/ovulation-fertility-awareness-kit` | configured | Lead-magnet consolidation (2026-07-06): single-topic page folded into the surviving kit. |
| `/free/fever-and-period-symptom-notes` | `/free/premenstrual-symptom-tracker` | configured | Lead-magnet consolidation (2026-07-06): single-topic page folded into the surviving kit. |
| `/free/fibroid-appointment-prep-checklist` | `/free/fibroid-tracking-kit` | configured | Lead-magnet consolidation (2026-07-06): single-topic page folded into the surviving kit. |
| `/free/fibroid-bleeding-and-clot-log` | `/free/fibroid-tracking-kit` | configured | Lead-magnet consolidation (2026-07-06): single-topic page folded into the surviving kit. |
| `/free/fibroid-pressure-bladder-bowel-log` | `/free/fibroid-tracking-kit` | configured | Lead-magnet consolidation (2026-07-06): single-topic page folded into the surviving kit. |
| `/free/fibroid-symptom-checklist-no-diagnosis` | `/free/fibroid-tracking-kit` | configured | Lead-magnet consolidation (2026-07-06): single-topic page folded into the surviving kit. |
| `/free/fibroid-treatment-decision-question-list` | `/free/fibroid-tracking-kit` | configured | Lead-magnet consolidation (2026-07-06): single-topic page folded into the surviving kit. |
| `/free/fibroid-ultrasound-question-list` | `/free/fibroid-tracking-kit` | configured | Lead-magnet consolidation (2026-07-06): single-topic page folded into the surviving kit. |
| `/free/field-trip-period-pack-checklist` | `/free/period-away-from-home-kit` | configured | Lead-magnet consolidation (2026-07-06): single-topic page folded into the surviving kit. |
| `/free/first-period-app-setup-privacy-card` | `/free/first-period-starter-kit` | configured | Lead-magnet consolidation (2026-07-06): single-topic page folded into the surviving kit. |
| `/free/first-period-calculator-reality-check` | `/free/cycle-length-calculator-kit` | configured | Lead-magnet consolidation (2026-07-06): single-topic page folded into the surviving kit. |
| `/free/first-period-doctor-question-list` | `/free/reproductive-visit-prep-kit` | configured | Lead-magnet consolidation (2026-07-06): single-topic page folded into the surviving kit. |
| `/free/first-period-emergency-bag-plan` | `/free/first-period-starter-kit` | configured | Lead-magnet consolidation (2026-07-06): single-topic page folded into the surviving kit. |
| `/free/first-period-parent-conversation-script` | `/free/first-period-starter-kit` | configured | Lead-magnet consolidation (2026-07-06): single-topic page folded into the surviving kit. |
| `/free/first-period-school-kit-checklist` | `/free/first-period-starter-kit` | configured | Lead-magnet consolidation (2026-07-06): single-topic page folded into the surviving kit. |
| `/free/first-period-signs-notes` | `/free/first-period-starter-kit` | configured | Lead-magnet consolidation (2026-07-06): single-topic page folded into the surviving kit. |
| `/free/first-period-tracking-starter-sheet` | `/free/first-period-starter-kit` | configured | Lead-magnet consolidation (2026-07-06): single-topic page folded into the surviving kit. |
| `/free/flo-data-deletion-receipt-checklist` | `/free/delete-period-data-guide` | configured | Lead-magnet consolidation (2026-07-06): single-topic page folded into the surviving kit. |
| `/free/flo-to-floriva-switcher-guide` | `/free/delete-period-data-guide` | configured | Lead-magnet consolidation (2026-07-06): single-topic page folded into the surviving kit. |
| `/free/florida-georgia-scorecard-bundle` | `/free/post-dobbs-digital-safety-kit-hub` | configured | Lead-magnet consolidation (2026-07-06): single-topic page folded into the surviving kit. |
| `/free/flu-like-symptoms-before-period-log` | `/free/premenstrual-symptom-tracker` | configured | Lead-magnet consolidation (2026-07-06): single-topic page folded into the surviving kit. |
| `/free/food-and-cycle-symptom-diary` | `/free/cycle-syncing-food-workout-planner` | configured | Lead-magnet consolidation (2026-07-06): single-topic page folded into the surviving kit. |
| `/free/food-cravings-before-period-notes` | `/free/premenstrual-symptom-tracker` | configured | Lead-magnet consolidation (2026-07-06): single-topic page folded into the surviving kit. |
| `/free/forgetful-before-period-memory-log` | `/free/premenstrual-symptom-tracker` | configured | Lead-magnet consolidation (2026-07-06): single-topic page folded into the surviving kit. |
| `/free/gym-period-kit-checklist` | `/free/period-away-from-home-kit` | configured | Lead-magnet consolidation (2026-07-06): single-topic page folded into the surviving kit. |
| `/free/heating-pad-period-cramp-notes` | `/free/period-pain-cramp-diary` | configured | Lead-magnet consolidation (2026-07-06): single-topic page folded into the surviving kit. |
| `/free/heavy-flow-product-change-clot-tracker` | `/free/heavy-period-clot-tracker` | configured | Lead-magnet consolidation (2026-07-06): single-topic page folded into the surviving kit. |
| `/free/heavy-period-iron-test-question-list` | `/free/heavy-period-clot-tracker` | configured | Lead-magnet consolidation (2026-07-06): single-topic page folded into the surviving kit. |
| `/free/heavy-period-visit-prep-checklist` | `/free/heavy-period-clot-tracker` | configured | Lead-magnet consolidation (2026-07-06): single-topic page folded into the surviving kit. |
| `/free/hip-pain-during-period-log` | `/free/period-pain-cramp-diary` | configured | Lead-magnet consolidation (2026-07-06): single-topic page folded into the surviving kit. |
| `/free/hormone-health-monthly-log` | `/free/thyroid-hormone-lab-organizer` | configured | Lead-magnet consolidation (2026-07-06): single-topic page folded into the surviving kit. |
| `/free/hot-flash-night-sweat-log` | `/free/period-sleep-log` | configured | Lead-magnet consolidation (2026-07-06): single-topic page folded into the surviving kit. |
| `/free/hotel-period-cleanup-checklist` | `/free/period-away-from-home-kit` | configured | Lead-magnet consolidation (2026-07-06): single-topic page folded into the surviving kit. |
| `/free/hpv-positive-pap-follow-up-notes` | `/free/biopsy-result-visit-notes` | configured | Lead-magnet consolidation (2026-07-06): single-topic page folded into the surviving kit. |
| `/free/hrt-discussion-question-list` | `/free/thyroid-hormone-lab-organizer` | configured | Lead-magnet consolidation (2026-07-06): single-topic page folded into the surviving kit. |
| `/free/hungry-before-period-log` | `/free/premenstrual-symptom-tracker` | configured | Lead-magnet consolidation (2026-07-06): single-topic page folded into the surviving kit. |
| `/free/illness-late-period-notes` | `/free/late-missed-period-log` | configured | Lead-magnet consolidation (2026-07-06): single-topic page folded into the surviving kit. |
| `/free/insomnia-before-period-sleep-log` | `/free/period-sleep-log` | configured | Lead-magnet consolidation (2026-07-06): single-topic page folded into the surviving kit. |
| `/free/iud-appointment-question-checklist` | `/free/reproductive-visit-prep-kit` | configured | Lead-magnet consolidation (2026-07-06): single-topic page folded into the surviving kit. |
| `/free/iud-bleeding-and-cramp-log` | `/free/period-pain-cramp-diary` | configured | Lead-magnet consolidation (2026-07-06): single-topic page folded into the surviving kit. |
| `/free/jelly-like-period-clot-notes` | `/free/heavy-period-clot-tracker` | configured | Lead-magnet consolidation (2026-07-06): single-topic page folded into the surviving kit. |
| `/free/labia-swelling-visit-notes` | `/free/vulvar-symptom-log` | configured | Lead-magnet consolidation (2026-07-06): single-topic page folded into the surviving kit. |
| `/free/large-period-clot-visit-summary` | `/free/heavy-period-clot-tracker` | configured | Lead-magnet consolidation (2026-07-06): single-topic page folded into the surviving kit. |
| `/free/late-period-after-plan-b-test-questions` | `/free/emergency-contraception-log` | configured | Lead-magnet consolidation (2026-07-06): single-topic page folded into the surviving kit. |
| `/free/late-period-context-log` | `/free/late-missed-period-log` | configured | Lead-magnet consolidation (2026-07-06): single-topic page folded into the surviving kit. |
| `/free/leg-pain-during-period-notes` | `/free/period-pain-cramp-diary` | configured | Lead-magnet consolidation (2026-07-06): single-topic page folded into the surviving kit. |
| `/free/lh-test-strip-tracker` | `/free/ovulation-fertility-awareness-kit` | configured | Lead-magnet consolidation (2026-07-06): single-topic page folded into the surviving kit. |
| `/free/light-period-tracker` | `/free/abnormal-bleeding-log` | configured | Lead-magnet consolidation (2026-07-06): single-topic page folded into the surviving kit. |
| `/free/long-period-bleeding-log` | `/free/heavy-period-clot-tracker` | configured | Lead-magnet consolidation (2026-07-06): single-topic page folded into the surviving kit. |
| `/free/long-shift-period-break-plan` | `/free/period-away-from-home-kit` | configured | Lead-magnet consolidation (2026-07-06): single-topic page folded into the surviving kit. |
| `/free/lower-back-pain-during-period-log` | `/free/period-pain-cramp-diary` | configured | Lead-magnet consolidation (2026-07-06): single-topic page folded into the surviving kit. |
| `/free/luteal-phase-date-notes` | `/free/cycle-length-calculator-kit` | configured | Lead-magnet consolidation (2026-07-06): single-topic page folded into the surviving kit. |
| `/free/mammogram-anxiety-visit-card` | `/free/premenstrual-symptom-tracker` | configured | Lead-magnet consolidation (2026-07-06): single-topic page folded into the surviving kit. |
| `/free/mammogram-result-question-list` | `/free/biopsy-result-visit-notes` | configured | Lead-magnet consolidation (2026-07-06): single-topic page folded into the surviving kit. |
| `/free/medication-and-cycle-notes-list` | `/free/reproductive-visit-prep-kit` | configured | Lead-magnet consolidation (2026-07-06): single-topic page folded into the surviving kit. |
| `/free/menstrual-cup-leak-log` | `/free/period-leak-and-product-kit` | configured | Lead-magnet consolidation (2026-07-06): single-topic page folded into the surviving kit. |
| `/free/menstrual-cup-pain-notes` | `/free/period-pain-cramp-diary` | configured | Lead-magnet consolidation (2026-07-06): single-topic page folded into the surviving kit. |
| `/free/menstrual-cycle-calendar-template` | `/free/cycle-length-calculator-kit` | configured | Lead-magnet consolidation (2026-07-06): single-topic page folded into the surviving kit. |
| `/free/menstrual-disc-leak-notes` | `/free/period-leak-and-product-kit` | configured | Lead-magnet consolidation (2026-07-06): single-topic page folded into the surviving kit. |
| `/free/menstrual-migraine-appointment-prep-checklist` | `/free/menstrual-migraine-log` | configured | Lead-magnet consolidation (2026-07-06): single-topic page folded into the surviving kit. |
| `/free/menstrual-migraine-cycle-log` | `/free/menstrual-migraine-log` | configured | Lead-magnet consolidation (2026-07-06): single-topic page folded into the surviving kit. |
| `/free/migraine-aura-cycle-notes` | `/free/menstrual-migraine-log` | configured | Lead-magnet consolidation (2026-07-06): single-topic page folded into the surviving kit. |
| `/free/migraine-before-period-tracker` | `/free/menstrual-migraine-log` | configured | Lead-magnet consolidation (2026-07-06): single-topic page folded into the surviving kit. |
| `/free/migraine-medication-response-log` | `/free/menstrual-migraine-log` | configured | Lead-magnet consolidation (2026-07-06): single-topic page folded into the surviving kit. |
| `/free/migraine-trigger-and-cycle-comparison-log` | `/free/menstrual-migraine-log` | configured | Lead-magnet consolidation (2026-07-06): single-topic page folded into the surviving kit. |
| `/free/missed-birth-control-pill-question-list` | `/free/birth-control-tracking-kit` | configured | Lead-magnet consolidation (2026-07-06): single-topic page folded into the surviving kit. |
| `/free/mood-swings-before-period-log` | `/free/premenstrual-symptom-tracker` | configured | Lead-magnet consolidation (2026-07-06): single-topic page folded into the surviving kit. |
| `/free/morning-after-pill-side-effect-notes` | `/free/emergency-contraception-log` | configured | Lead-magnet consolidation (2026-07-06): single-topic page folded into the surviving kit. |
| `/free/myomectomy-recovery-log` | `/free/fibroid-tracking-kit` | configured | Lead-magnet consolidation (2026-07-06): single-topic page folded into the surviving kit. |
| `/free/nausea-before-period-tracker` | `/free/premenstrual-symptom-tracker` | configured | Lead-magnet consolidation (2026-07-06): single-topic page folded into the surviving kit. |
| `/free/negative-pregnancy-test-late-period-questions` | `/free/late-missed-period-log` | configured | Lead-magnet consolidation (2026-07-06): single-topic page folded into the surviving kit. |
| `/free/next-period-date-estimate-worksheet` | `/free/cycle-length-calculator-kit` | configured | Lead-magnet consolidation (2026-07-06): single-topic page folded into the surviving kit. |
| `/free/night-sweats-before-period-notes` | `/free/period-sleep-log` | configured | Lead-magnet consolidation (2026-07-06): single-topic page folded into the surviving kit. |
| `/free/nipple-discharge-cycle-notes` | `/free/vaginal-discharge-odor-checklist` | configured | Lead-magnet consolidation (2026-07-06): single-topic page folded into the surviving kit. |
| `/free/nuvaring-bleeding-question-list` | `/free/birth-control-tracking-kit` | configured | Lead-magnet consolidation (2026-07-06): single-topic page folded into the surviving kit. |
| `/free/old-period-app-cleanup-plan` | `/free/delete-period-data-guide` | configured | Lead-magnet consolidation (2026-07-06): single-topic page folded into the surviving kit. |
| `/free/one-day-period-notes` | `/free/abnormal-bleeding-log` | configured | Lead-magnet consolidation (2026-07-06): single-topic page folded into the surviving kit. |
| `/free/ovarian-cyst-pain-log` | `/free/ovarian-cyst-tracking-kit` | configured | Lead-magnet consolidation (2026-07-06): single-topic page folded into the surviving kit. |
| `/free/ovarian-cyst-period-change-tracker` | `/free/ovarian-cyst-tracking-kit` | configured | Lead-magnet consolidation (2026-07-06): single-topic page folded into the surviving kit. |
| `/free/ovarian-cyst-rupture-urgent-care-notes` | `/free/ovarian-cyst-tracking-kit` | configured | Lead-magnet consolidation (2026-07-06): single-topic page folded into the surviving kit. |
| `/free/ovarian-cyst-surgery-recovery-log` | `/free/ovarian-cyst-tracking-kit` | configured | Lead-magnet consolidation (2026-07-06): single-topic page folded into the surviving kit. |
| `/free/ovarian-cyst-symptom-checklist-no-diagnosis` | `/free/ovarian-cyst-tracking-kit` | configured | Lead-magnet consolidation (2026-07-06): single-topic page folded into the surviving kit. |
| `/free/ovarian-cyst-treatment-decision-question-list` | `/free/ovarian-cyst-tracking-kit` | configured | Lead-magnet consolidation (2026-07-06): single-topic page folded into the surviving kit. |
| `/free/ovarian-cyst-ultrasound-question-list` | `/free/ovarian-cyst-tracking-kit` | configured | Lead-magnet consolidation (2026-07-06): single-topic page folded into the surviving kit. |
| `/free/overnight-period-leak-log` | `/free/period-leak-and-product-kit` | configured | Lead-magnet consolidation (2026-07-06): single-topic page folded into the surviving kit. |
| `/free/ovulation-calculator-question-list` | `/free/reproductive-visit-prep-kit` | configured | Lead-magnet consolidation (2026-07-06): single-topic page folded into the surviving kit. |
| `/free/ovulation-symptoms-tracker` | `/free/ovulation-fertility-awareness-kit` | configured | Lead-magnet consolidation (2026-07-06): single-topic page folded into the surviving kit. |
| `/free/pad-chafing-period-notes` | `/free/period-leak-and-product-kit` | configured | Lead-magnet consolidation (2026-07-06): single-topic page folded into the surviving kit. |
| `/free/pad-leak-and-shift-log` | `/free/period-leak-and-product-kit` | configured | Lead-magnet consolidation (2026-07-06): single-topic page folded into the surviving kit. |
| `/free/pad-rash-symptom-log` | `/free/period-leak-and-product-kit` | configured | Lead-magnet consolidation (2026-07-06): single-topic page folded into the surviving kit. |
| `/free/pain-after-sex-pelvic-pain-log` | `/free/period-pain-cramp-diary` | configured | Lead-magnet consolidation (2026-07-06): single-topic page folded into the surviving kit. |
| `/free/pain-down-leg-during-period-map` | `/free/period-pain-cramp-diary` | configured | Lead-magnet consolidation (2026-07-06): single-topic page folded into the surviving kit. |
| `/free/pain-during-sex-symptom-notes` | `/free/period-pain-cramp-diary` | configured | Lead-magnet consolidation (2026-07-06): single-topic page folded into the surviving kit. |
| `/free/painful-bowel-movements-during-period-notes` | `/free/period-pain-cramp-diary` | configured | Lead-magnet consolidation (2026-07-06): single-topic page folded into the surviving kit. |
| `/free/panic-feelings-before-period-notes` | `/free/premenstrual-symptom-tracker` | configured | Lead-magnet consolidation (2026-07-06): single-topic page folded into the surviving kit. |
| `/free/pap-smear-anxiety-visit-card` | `/free/premenstrual-symptom-tracker` | configured | Lead-magnet consolidation (2026-07-06): single-topic page folded into the surviving kit. |
| `/free/pap-smear-result-terms-card` | `/free/biopsy-result-visit-notes` | configured | Lead-magnet consolidation (2026-07-06): single-topic page folded into the surviving kit. |
| `/free/paper-fertility-chart-to-app-checklist` | `/free/ovulation-fertility-awareness-kit` | configured | Lead-magnet consolidation (2026-07-06): single-topic page folded into the surviving kit. |
| `/free/parent-teen-period-app-boundary-script` | `/free/first-period-starter-kit` | configured | Lead-magnet consolidation (2026-07-06): single-topic page folded into the surviving kit. |
| `/free/pcos-acne-hair-growth-photo-log` | `/free/pcos-tracking-kit` | configured | Lead-magnet consolidation (2026-07-06): single-topic page folded into the surviving kit. |
| `/free/pcos-doctor-appointment-question-list` | `/free/pcos-tracking-kit` | configured | Lead-magnet consolidation (2026-07-06): single-topic page folded into the surviving kit. |
| `/free/pcos-lab-results-tracker` | `/free/pcos-tracking-kit` | configured | Lead-magnet consolidation (2026-07-06): single-topic page folded into the surviving kit. |
| `/free/pcos-meal-planner-template` | `/free/pcos-tracking-kit` | configured | Lead-magnet consolidation (2026-07-06): single-topic page folded into the surviving kit. |
| `/free/pcos-meal-prep-grocery-list` | `/free/pcos-tracking-kit` | configured | Lead-magnet consolidation (2026-07-06): single-topic page folded into the surviving kit. |
| `/free/pcos-medication-supplement-change-log` | `/free/pcos-tracking-kit` | configured | Lead-magnet consolidation (2026-07-06): single-topic page folded into the surviving kit. |
| `/free/pcos-symptom-tracker` | `/free/pcos-tracking-kit` | configured | Lead-magnet consolidation (2026-07-06): single-topic page folded into the surviving kit. |
| `/free/perimenopause-appointment-prep-checklist` | `/free/reproductive-visit-prep-kit` | configured | Lead-magnet consolidation (2026-07-06): single-topic page folded into the surviving kit. |
| `/free/perimenopause-bleeding-pattern-log` | `/free/perimenopause-symptom-tracker` | configured | Lead-magnet consolidation (2026-07-06): single-topic page folded into the surviving kit. |
| `/free/perimenopause-migraine-pattern-tracker` | `/free/menstrual-migraine-log` | configured | Lead-magnet consolidation (2026-07-06): single-topic page folded into the surviving kit. |
| `/free/perimenopause-sleep-disruption-tracker` | `/free/period-sleep-log` | configured | Lead-magnet consolidation (2026-07-06): single-topic page folded into the surviving kit. |
| `/free/perimenopause-symptom-priority-sorter` | `/free/perimenopause-symptom-tracker` | configured | Lead-magnet consolidation (2026-07-06): single-topic page folded into the surviving kit. |
| `/free/perimenopause-symptoms-checklist` | `/free/perimenopause-symptom-tracker` | configured | Lead-magnet consolidation (2026-07-06): single-topic page folded into the surviving kit. |
| `/free/period-anxiety-visit-summary` | `/free/premenstrual-symptom-tracker` | configured | Lead-magnet consolidation (2026-07-06): single-topic page folded into the surviving kit. |
| `/free/period-app-data-map-worksheet` | `/free/period-app-privacy-audit-kit` | configured | Lead-magnet consolidation (2026-07-06): single-topic page folded into the surviving kit. |
| `/free/period-app-deletion-follow-up-email-templates` | `/free/delete-period-data-guide` | configured | Lead-magnet consolidation (2026-07-06): single-topic page folded into the surviving kit. |
| `/free/period-app-privacy-audit-checklist` | `/free/period-app-privacy-audit-kit` | configured | Lead-magnet consolidation (2026-07-06): single-topic page folded into the surviving kit. |
| `/free/period-app-privacy-policy-worksheet` | `/free/period-app-privacy-audit-kit` | configured | Lead-magnet consolidation (2026-07-06): single-topic page folded into the surviving kit. |
| `/free/period-at-beach-checklist` | `/free/period-away-from-home-kit` | configured | Lead-magnet consolidation (2026-07-06): single-topic page folded into the surviving kit. |
| `/free/period-at-camp-checklist` | `/free/period-away-from-home-kit` | configured | Lead-magnet consolidation (2026-07-06): single-topic page folded into the surviving kit. |
| `/free/period-at-conference-kit` | `/free/period-away-from-home-kit` | configured | Lead-magnet consolidation (2026-07-06): single-topic page folded into the surviving kit. |
| `/free/period-at-music-festival-notes` | `/free/period-away-from-home-kit` | configured | Lead-magnet consolidation (2026-07-06): single-topic page folded into the surviving kit. |
| `/free/period-at-school-dance-checklist` | `/free/period-away-from-home-kit` | configured | Lead-magnet consolidation (2026-07-06): single-topic page folded into the surviving kit. |
| `/free/period-at-water-park-notes` | `/free/period-away-from-home-kit` | configured | Lead-magnet consolidation (2026-07-06): single-topic page folded into the surviving kit. |
| `/free/period-at-work-meeting-exit-plan` | `/free/period-away-from-home-kit` | configured | Lead-magnet consolidation (2026-07-06): single-topic page folded into the surviving kit. |
| `/free/period-back-pain-tracker` | `/free/period-pain-cramp-diary` | configured | Lead-magnet consolidation (2026-07-06): single-topic page folded into the surviving kit. |
| `/free/period-blood-clot-log` | `/free/heavy-period-clot-tracker` | configured | Lead-magnet consolidation (2026-07-06): single-topic page folded into the surviving kit. |
| `/free/period-blood-on-mattress-notes` | `/free/period-blood-stain-removal-guide` | configured | Lead-magnet consolidation (2026-07-06): single-topic page folded into the surviving kit. |
| `/free/period-blood-on-sheets-laundry-guide` | `/free/period-blood-stain-removal-guide` | configured | Lead-magnet consolidation (2026-07-06): single-topic page folded into the surviving kit. |
| `/free/period-blood-stain-removal-checklist` | `/free/period-blood-stain-removal-guide` | configured | Lead-magnet consolidation (2026-07-06): single-topic page folded into the surviving kit. |
| `/free/period-brain-fog-notes` | `/free/premenstrual-symptom-tracker` | configured | Lead-magnet consolidation (2026-07-06): single-topic page folded into the surviving kit. |
| `/free/period-calculator-planning-sheet` | `/free/cycle-length-calculator-kit` | configured | Lead-magnet consolidation (2026-07-06): single-topic page folded into the surviving kit. |
| `/free/period-calendar-privacy-checklist` | `/free/period-app-privacy-audit-kit` | configured | Lead-magnet consolidation (2026-07-06): single-topic page folded into the surviving kit. |
| `/free/period-clot-and-anemia-question-list` | `/free/heavy-period-clot-tracker` | configured | Lead-magnet consolidation (2026-07-06): single-topic page folded into the surviving kit. |
| `/free/period-clot-photo-privacy-checklist` | `/free/heavy-period-clot-tracker` | configured | Lead-magnet consolidation (2026-07-06): single-topic page folded into the surviving kit. |
| `/free/period-clot-vs-miscarriage-question-list` | `/free/heavy-period-clot-tracker` | configured | Lead-magnet consolidation (2026-07-06): single-topic page folded into the surviving kit. |
| `/free/period-constipation-log` | `/free/premenstrual-symptom-tracker` | configured | Lead-magnet consolidation (2026-07-06): single-topic page folded into the surviving kit. |
| `/free/period-cramp-night-log` | `/free/period-pain-cramp-diary` | configured | Lead-magnet consolidation (2026-07-06): single-topic page folded into the surviving kit. |
| `/free/period-cramp-relief-evidence-checklist` | `/free/period-pain-cramp-diary` | configured | Lead-magnet consolidation (2026-07-06): single-topic page folded into the surviving kit. |
| `/free/period-cramps-after-workout-log` | `/free/period-pain-cramp-diary` | configured | Lead-magnet consolidation (2026-07-06): single-topic page folded into the surviving kit. |
| `/free/period-cramps-at-work-log` | `/free/period-pain-cramp-diary` | configured | Lead-magnet consolidation (2026-07-06): single-topic page folded into the surviving kit. |
| `/free/period-cravings-tracker` | `/free/premenstrual-symptom-tracker` | configured | Lead-magnet consolidation (2026-07-06): single-topic page folded into the surviving kit. |
| `/free/period-data-broker-opt-out-starter` | `/free/delete-period-data-guide` | configured | Lead-magnet consolidation (2026-07-06): single-topic page folded into the surviving kit. |
| `/free/period-data-digital-will` | `/free/delete-period-data-guide` | configured | Lead-magnet consolidation (2026-07-06): single-topic page folded into the surviving kit. |
| `/free/period-diarrhea-symptom-log` | `/free/premenstrual-symptom-tracker` | configured | Lead-magnet consolidation (2026-07-06): single-topic page folded into the surviving kit. |
| `/free/period-during-exams-school-plan` | `/free/period-away-from-home-kit` | configured | Lead-magnet consolidation (2026-07-06): single-topic page folded into the surviving kit. |
| `/free/period-emergency-kit-checklist` | `/free/period-leak-and-product-kit` | configured | Lead-magnet consolidation (2026-07-06): single-topic page folded into the surviving kit. |
| `/free/period-fatigue-bloodwork-visit-summary` | `/free/premenstrual-symptom-tracker` | configured | Lead-magnet consolidation (2026-07-06): single-topic page folded into the surviving kit. |
| `/free/period-flu-symptom-tracker` | `/free/premenstrual-symptom-tracker` | configured | Lead-magnet consolidation (2026-07-06): single-topic page folded into the surviving kit. |
| `/free/period-gas-and-bloating-log` | `/free/premenstrual-symptom-tracker` | configured | Lead-magnet consolidation (2026-07-06): single-topic page folded into the surviving kit. |
| `/free/period-kit-for-school-checklist` | `/free/period-leak-and-product-kit` | configured | Lead-magnet consolidation (2026-07-06): single-topic page folded into the surviving kit. |
| `/free/period-leak-at-school-plan` | `/free/period-leak-and-product-kit` | configured | Lead-magnet consolidation (2026-07-06): single-topic page folded into the surviving kit. |
| `/free/period-leak-at-work-plan` | `/free/period-leak-and-product-kit` | configured | Lead-magnet consolidation (2026-07-06): single-topic page folded into the surviving kit. |
| `/free/period-leak-cleanup-plan` | `/free/period-leak-and-product-kit` | configured | Lead-magnet consolidation (2026-07-06): single-topic page folded into the surviving kit. |
| `/free/period-on-a-plane-notes` | `/free/period-away-from-home-kit` | configured | Lead-magnet consolidation (2026-07-06): single-topic page folded into the surviving kit. |
| `/free/period-on-date-night-notes` | `/free/period-away-from-home-kit` | configured | Lead-magnet consolidation (2026-07-06): single-topic page folded into the surviving kit. |
| `/free/period-on-road-trip-planner` | `/free/period-away-from-home-kit` | configured | Lead-magnet consolidation (2026-07-06): single-topic page folded into the surviving kit. |
| `/free/period-on-vacation-notes` | `/free/period-away-from-home-kit` | configured | Lead-magnet consolidation (2026-07-06): single-topic page folded into the surviving kit. |
| `/free/period-on-wedding-day-plan` | `/free/period-away-from-home-kit` | configured | Lead-magnet consolidation (2026-07-06): single-topic page folded into the surviving kit. |
| `/free/period-pain-diary-template` | `/free/period-pain-cramp-diary` | configured | Lead-magnet consolidation (2026-07-06): single-topic page folded into the surviving kit. |
| `/free/period-pain-location-visit-summary` | `/free/period-pain-cramp-diary` | configured | Lead-magnet consolidation (2026-07-06): single-topic page folded into the surviving kit. |
| `/free/period-pain-medicine-question-list` | `/free/period-pain-cramp-diary` | configured | Lead-magnet consolidation (2026-07-06): single-topic page folded into the surviving kit. |
| `/free/period-pain-position-notes` | `/free/period-pain-cramp-diary` | configured | Lead-magnet consolidation (2026-07-06): single-topic page folded into the surviving kit. |
| `/free/period-poops-tracker` | `/free/premenstrual-symptom-tracker` | configured | Lead-magnet consolidation (2026-07-06): single-topic page folded into the surviving kit. |
| `/free/period-product-backup-layer-planner` | `/free/period-leak-and-product-kit` | configured | Lead-magnet consolidation (2026-07-06): single-topic page folded into the surviving kit. |
| `/free/period-product-change-visit-summary` | `/free/reproductive-visit-prep-kit` | configured | Lead-magnet consolidation (2026-07-06): single-topic page folded into the surviving kit. |
| `/free/period-product-irritation-log` | `/free/period-leak-and-product-kit` | configured | Lead-magnet consolidation (2026-07-06): single-topic page folded into the surviving kit. |
| `/free/period-product-leak-comparison-sheet` | `/free/period-leak-and-product-kit` | configured | Lead-magnet consolidation (2026-07-06): single-topic page folded into the surviving kit. |
| `/free/period-product-refill-plan` | `/free/period-leak-and-product-kit` | configured | Lead-magnet consolidation (2026-07-06): single-topic page folded into the surviving kit. |
| `/free/period-sick-day-message-template` | `/free/premenstrual-symptom-tracker` | configured | Lead-magnet consolidation (2026-07-06): single-topic page folded into the surviving kit. |
| `/free/period-sleep-disruption-visit-prep` | `/free/period-sleep-log` | configured | Lead-magnet consolidation (2026-07-06): single-topic page folded into the surviving kit. |
| `/free/period-starts-and-stops-log` | `/free/abnormal-bleeding-log` | configured | Lead-magnet consolidation (2026-07-06): single-topic page folded into the surviving kit. |
| `/free/period-symptom-tracker-printable` | `/free/personal-cycle-health-record` | configured | Lead-magnet consolidation (2026-07-06): single-topic page folded into the surviving kit. |
| `/free/period-tracker-privacy-comparison-matrix` | `/free/period-app-privacy-audit-kit` | configured | Lead-magnet consolidation (2026-07-06): single-topic page folded into the surviving kit. |
| `/free/period-travel-checklist` | `/free/period-away-from-home-kit` | configured | Lead-magnet consolidation (2026-07-06): single-topic page folded into the surviving kit. |
| `/free/period-underwear-leak-notes` | `/free/period-leak-and-product-kit` | configured | Lead-magnet consolidation (2026-07-06): single-topic page folded into the surviving kit. |
| `/free/period-uniform-backup-plan` | `/free/period-away-from-home-kit` | configured | Lead-magnet consolidation (2026-07-06): single-topic page folded into the surviving kit. |
| `/free/period-wont-stop-visit-prep` | `/free/reproductive-visit-prep-kit` | configured | Lead-magnet consolidation (2026-07-06): single-topic page folded into the surviving kit. |
| `/free/period-workout-intensity-planner` | `/free/cycle-syncing-food-workout-planner` | configured | Lead-magnet consolidation (2026-07-06): single-topic page folded into the surviving kit. |
| `/free/personal-cycle-health-record-template` | `/free/personal-cycle-health-record` | configured | Lead-magnet consolidation (2026-07-06): single-topic page folded into the surviving kit. |
| `/free/pharmacy-reproductive-health-privacy-checklist` | `/free/period-app-privacy-audit-kit` | configured | Lead-magnet consolidation (2026-07-06): single-topic page folded into the surviving kit. |
| `/free/plan-b-cycle-timeline-two-months` | `/free/emergency-contraception-log` | configured | Lead-magnet consolidation (2026-07-06): single-topic page folded into the surviving kit. |
| `/free/pmdd-appointment-prep-checklist` | `/free/pmdd-tracking-kit` | configured | Lead-magnet consolidation (2026-07-06): single-topic page folded into the surviving kit. |
| `/free/pmdd-drsp-daily-log` | `/free/pmdd-tracking-kit` | configured | Lead-magnet consolidation (2026-07-06): single-topic page folded into the surviving kit. |
| `/free/pmdd-relationship-communication-script` | `/free/pmdd-tracking-kit` | configured | Lead-magnet consolidation (2026-07-06): single-topic page folded into the surviving kit. |
| `/free/pmdd-safety-plan-template` | `/free/pmdd-tracking-kit` | configured | Lead-magnet consolidation (2026-07-06): single-topic page folded into the surviving kit. |
| `/free/pmdd-treatment-response-tracker` | `/free/pmdd-tracking-kit` | configured | Lead-magnet consolidation (2026-07-06): single-topic page folded into the surviving kit. |
| `/free/pmdd-two-cycle-symptom-tracker` | `/free/pmdd-tracking-kit` | configured | Lead-magnet consolidation (2026-07-06): single-topic page folded into the surviving kit. |
| `/free/pmdd-work-school-planning-sheet` | `/free/pmdd-tracking-kit` | configured | Lead-magnet consolidation (2026-07-06): single-topic page folded into the surviving kit. |
| `/free/post-dobbs-digital-safety-kit` | `/free/post-dobbs-digital-safety-kit-hub` | configured | Lead-magnet consolidation (2026-07-06): single-topic page folded into the surviving kit. |
| `/free/postpartum-period-return-tracker` | `/free/perimenopause-symptom-tracker` | configured | Lead-magnet consolidation (2026-07-06): single-topic page folded into the surviving kit. |
| `/free/printable-bbt-chart-one-cycle` | `/free/ovulation-fertility-awareness-kit` | configured | Lead-magnet consolidation (2026-07-06): single-topic page folded into the surviving kit. |
| `/free/public-bathroom-period-product-change-plan` | `/free/period-leak-and-product-kit` | configured | Lead-magnet consolidation (2026-07-06): single-topic page folded into the surviving kit. |
| `/free/rectal-pain-during-period-notes` | `/free/period-pain-cramp-diary` | configured | Lead-magnet consolidation (2026-07-06): single-topic page folded into the surviving kit. |
| `/free/recurrent-uti-appointment-prep-checklist` | `/free/uti-urinary-symptom-tracker` | configured | Lead-magnet consolidation (2026-07-06): single-topic page folded into the surviving kit. |
| `/free/recurrent-yeast-infection-appointment-prep` | `/free/vaginal-discharge-odor-checklist` | configured | Lead-magnet consolidation (2026-07-06): single-topic page folded into the surviving kit. |
| `/free/reproductive-health-insurance-paper-trail-map` | `/free/reproductive-visit-prep-kit` | configured | Lead-magnet consolidation (2026-07-06): single-topic page folded into the surviving kit. |
| `/free/roommate-period-boundary-script` | `/free/period-at-college-dorm-kit` | configured | Lead-magnet consolidation (2026-07-06): single-topic page folded into the surviving kit. |
| `/free/running-on-period-notes` | `/free/period-away-from-home-kit` | configured | Lead-magnet consolidation (2026-07-06): single-topic page folded into the surviving kit. |
| `/free/school-nurse-period-visit-card` | `/free/reproductive-visit-prep-kit` | configured | Lead-magnet consolidation (2026-07-06): single-topic page folded into the surviving kit. |
| `/free/severe-period-cramp-visit-summary` | `/free/period-pain-cramp-diary` | configured | Lead-magnet consolidation (2026-07-06): single-topic page folded into the surviving kit. |
| `/free/shared-bathroom-period-plan` | `/free/period-at-college-dorm-kit` | configured | Lead-magnet consolidation (2026-07-06): single-topic page folded into the surviving kit. |
| `/free/sleep-and-period-symptom-summary` | `/free/period-sleep-log` | configured | Lead-magnet consolidation (2026-07-06): single-topic page folded into the surviving kit. |
| `/free/sleep-diary-period-template` | `/free/period-sleep-log` | configured | Lead-magnet consolidation (2026-07-06): single-topic page folded into the surviving kit. |
| `/free/sports-practice-period-plan` | `/free/period-away-from-home-kit` | configured | Lead-magnet consolidation (2026-07-06): single-topic page folded into the surviving kit. |
| `/free/spotting-after-sex-log` | `/free/abnormal-bleeding-log` | configured | Lead-magnet consolidation (2026-07-06): single-topic page folded into the surviving kit. |
| `/free/spotting-instead-of-period-notes` | `/free/abnormal-bleeding-log` | configured | Lead-magnet consolidation (2026-07-06): single-topic page folded into the surviving kit. |
| `/free/st-johns-wort-birth-control-question-card` | `/free/birth-control-tracking-kit` | configured | Lead-magnet consolidation (2026-07-06): single-topic page folded into the surviving kit. |
| `/free/state-risk-scorecard` | `/free/post-dobbs-digital-safety-kit-hub` | configured | Lead-magnet consolidation (2026-07-06): single-topic page folded into the surviving kit. |
| `/free/stopping-birth-control-cycle-return-tracker` | `/free/birth-control-tracking-kit` | configured | Lead-magnet consolidation (2026-07-06): single-topic page folded into the surviving kit. |
| `/free/stress-missed-period-notes` | `/free/late-missed-period-log` | configured | Lead-magnet consolidation (2026-07-06): single-topic page folded into the surviving kit. |
| `/free/subpoena-response-template` | `/free/post-dobbs-digital-safety-kit-hub` | configured | Lead-magnet consolidation (2026-07-06): single-topic page folded into the surviving kit. |
| `/free/support-person-period-pain-note` | `/free/period-pain-cramp-diary` | configured | Lead-magnet consolidation (2026-07-06): single-topic page folded into the surviving kit. |
| `/free/swimming-on-period-plan` | `/free/period-away-from-home-kit` | configured | Lead-magnet consolidation (2026-07-06): single-topic page folded into the surviving kit. |
| `/free/switch-period-trackers-without-losing-history` | `/free/delete-period-data-guide` | configured | Lead-magnet consolidation (2026-07-06): single-topic page folded into the surviving kit. |
| `/free/tampon-leak-log` | `/free/period-leak-and-product-kit` | configured | Lead-magnet consolidation (2026-07-06): single-topic page folded into the surviving kit. |
| `/free/tampon-pain-visit-notes` | `/free/period-pain-cramp-diary` | configured | Lead-magnet consolidation (2026-07-06): single-topic page folded into the surviving kit. |
| `/free/teen-period-cramp-school-plan` | `/free/period-pain-cramp-diary` | configured | Lead-magnet consolidation (2026-07-06): single-topic page folded into the surviving kit. |
| `/free/teen-period-symptoms-doctor-visit-sheet` | `/free/reproductive-visit-prep-kit` | configured | Lead-magnet consolidation (2026-07-06): single-topic page folded into the surviving kit. |
| `/free/teen-period-tracker-setup-card` | `/free/first-period-starter-kit` | configured | Lead-magnet consolidation (2026-07-06): single-topic page folded into the surviving kit. |
| `/free/telehealth-period-visit-script` | `/free/reproductive-visit-prep-kit` | configured | Lead-magnet consolidation (2026-07-06): single-topic page folded into the surviving kit. |
| `/free/texas-louisiana-scorecard-bundle` | `/free/post-dobbs-digital-safety-kit-hub` | configured | Lead-magnet consolidation (2026-07-06): single-topic page folded into the surviving kit. |
| `/free/thyroid-heavy-period-visit-summary` | `/free/heavy-period-clot-tracker` | configured | Lead-magnet consolidation (2026-07-06): single-topic page folded into the surviving kit. |
| `/free/thyroid-irregular-period-question-list` | `/free/thyroid-hormone-lab-organizer` | configured | Lead-magnet consolidation (2026-07-06): single-topic page folded into the surviving kit. |
| `/free/thyroid-lab-result-organizer` | `/free/thyroid-hormone-lab-organizer` | configured | Lead-magnet consolidation (2026-07-06): single-topic page folded into the surviving kit. |
| `/free/thyroid-period-change-notes` | `/free/thyroid-hormone-lab-organizer` | configured | Lead-magnet consolidation (2026-07-06): single-topic page folded into the surviving kit. |
| `/free/tired-during-period-energy-log` | `/free/premenstrual-symptom-tracker` | configured | Lead-magnet consolidation (2026-07-06): single-topic page folded into the surviving kit. |
| `/free/tissue-like-period-clot-notes` | `/free/heavy-period-clot-tracker` | configured | Lead-magnet consolidation (2026-07-06): single-topic page folded into the surviving kit. |
| `/free/travel-late-period-timeline` | `/free/late-missed-period-log` | configured | Lead-magnet consolidation (2026-07-06): single-topic page folded into the surviving kit. |
| `/free/tween-period-quiz-reality-check` | `/free/first-period-starter-kit` | configured | Lead-magnet consolidation (2026-07-06): single-topic page folded into the surviving kit. |
| `/free/urinary-urgency-cycle-log` | `/free/uti-urinary-symptom-tracker` | configured | Lead-magnet consolidation (2026-07-06): single-topic page folded into the surviving kit. |
| `/free/uti-after-sex-visit-prep-checklist` | `/free/uti-urinary-symptom-tracker` | configured | Lead-magnet consolidation (2026-07-06): single-topic page folded into the surviving kit. |
| `/free/uti-during-period-symptom-log` | `/free/uti-urinary-symptom-tracker` | configured | Lead-magnet consolidation (2026-07-06): single-topic page folded into the surviving kit. |
| `/free/uti-symptom-tracker-no-diagnosis` | `/free/uti-urinary-symptom-tracker` | configured | Lead-magnet consolidation (2026-07-06): single-topic page folded into the surviving kit. |
| `/free/uti-vs-yeast-symptom-notes` | `/free/vaginal-discharge-odor-checklist` | configured | Lead-magnet consolidation (2026-07-06): single-topic page folded into the surviving kit. |
| `/free/vaginal-discharge-before-period-tracker` | `/free/vaginal-discharge-odor-checklist` | configured | Lead-magnet consolidation (2026-07-06): single-topic page folded into the surviving kit. |
| `/free/vaginal-discharge-color-odor-checklist` | `/free/vaginal-discharge-odor-checklist` | configured | Lead-magnet consolidation (2026-07-06): single-topic page folded into the surviving kit. |
| `/free/vaginal-discharge-vs-cervical-mucus-checklist` | `/free/vaginal-discharge-odor-checklist` | configured | Lead-magnet consolidation (2026-07-06): single-topic page folded into the surviving kit. |
| `/free/vaginal-dryness-before-period-notes` | `/free/premenstrual-symptom-tracker` | configured | Lead-magnet consolidation (2026-07-06): single-topic page folded into the surviving kit. |
| `/free/vaginal-itching-before-period-tracker` | `/free/premenstrual-symptom-tracker` | configured | Lead-magnet consolidation (2026-07-06): single-topic page folded into the surviving kit. |
| `/free/vaginal-odor-after-period-log` | `/free/vaginal-discharge-odor-checklist` | configured | Lead-magnet consolidation (2026-07-06): single-topic page folded into the surviving kit. |
| `/free/vulvar-burning-symptom-notes` | `/free/vulvar-symptom-log` | configured | Lead-magnet consolidation (2026-07-06): single-topic page folded into the surviving kit. |
| `/free/vulvar-irritation-product-exposure-log` | `/free/vulvar-symptom-log` | configured | Lead-magnet consolidation (2026-07-06): single-topic page folded into the surviving kit. |
| `/free/vulvar-itching-symptom-log` | `/free/vulvar-symptom-log` | configured | Lead-magnet consolidation (2026-07-06): single-topic page folded into the surviving kit. |
| `/free/vulvar-rash-skin-change-notes` | `/free/vulvar-symptom-log` | configured | Lead-magnet consolidation (2026-07-06): single-topic page folded into the surviving kit. |
| `/free/withdrawal-bleeding-birth-control-notes` | `/free/emergency-contraception-log` | configured | Lead-magnet consolidation (2026-07-06): single-topic page folded into the surviving kit. |
| `/free/work-school-before-period-impact-log` | `/free/premenstrual-symptom-tracker` | configured | Lead-magnet consolidation (2026-07-06): single-topic page folded into the surviving kit. |
| `/free/yeast-infection-symptom-log-no-diagnosis` | `/free/vaginal-discharge-odor-checklist` | configured | Lead-magnet consolidation (2026-07-06): single-topic page folded into the surviving kit. |


## Corpus consolidation (2026-07-31)

The `/resources/privacy-in-practice` collection was consolidated from 93 narrow single-topic
checklists down to 5 guides, and one duplicate ranked list was merged. The retired pages targeted
machine-query phrasings and cannibalized each other on the human-typed queries they shared.
Every retired slug 301s to the surviving guide that now covers its topic. These redirects are
configured in `legacyExactRedirects` in `functions/_middleware.ts`.

| Old path | New path | Status | Reason |
| --- | --- | --- | --- |
| `/resources/privacy-in-practice/android-private-space-period-app-checklist` | `/resources/privacy-in-practice/lock-down-period-data-on-your-phone` | configured | Corpus consolidation (2026-07-31): device-hardening how-to folded into the surviving guide. |
| `/resources/privacy-in-practice/anonymous-period-tracking-guide` | `/resources/privacy-in-practice/lock-down-period-data-on-your-phone` | configured | Corpus consolidation (2026-07-31): device-hardening how-to folded into the surviving guide. |
| `/resources/privacy-in-practice/app-store-privacy-label-period-apps` | `/resources/privacy-in-practice/lock-down-period-data-on-your-phone` | configured | Corpus consolidation (2026-07-31): device-hardening how-to folded into the surviving guide. |
| `/resources/privacy-in-practice/audit-period-data-on-android` | `/resources/privacy-in-practice/lock-down-period-data-on-your-phone` | configured | Corpus consolidation (2026-07-31): device-hardening how-to folded into the surviving guide. |
| `/resources/privacy-in-practice/audit-period-data-on-iphone` | `/resources/privacy-in-practice/lock-down-period-data-on-your-phone` | configured | Corpus consolidation (2026-07-31): device-hardening how-to folded into the surviving guide. |
| `/resources/privacy-in-practice/check-period-app-for-trackers` | `/resources/privacy-in-practice/lock-down-period-data-on-your-phone` | configured | Corpus consolidation (2026-07-31): device-hardening how-to folded into the surviving guide. |
| `/resources/privacy-in-practice/digital-vs-paper-period-tracking-privacy` | `/resources/privacy-in-practice/lock-down-period-data-on-your-phone` | configured | Corpus consolidation (2026-07-31): device-hardening how-to folded into the surviving guide. |
| `/resources/privacy-in-practice/fitness-app-period-data-privacy-checklist` | `/resources/privacy-in-practice/lock-down-period-data-on-your-phone` | configured | Corpus consolidation (2026-07-31): device-hardening how-to folded into the surviving guide. |
| `/resources/privacy-in-practice/google-calendar-period-privacy-checklist` | `/resources/privacy-in-practice/lock-down-period-data-on-your-phone` | configured | Corpus consolidation (2026-07-31): device-hardening how-to folded into the surviving guide. |
| `/resources/privacy-in-practice/google-photos-locked-folder-period-screenshots` | `/resources/privacy-in-practice/lock-down-period-data-on-your-phone` | configured | Corpus consolidation (2026-07-31): device-hardening how-to folded into the surviving guide. |
| `/resources/privacy-in-practice/how-to-audit-your-phone-period-data` | `/resources/privacy-in-practice/lock-down-period-data-on-your-phone` | configured | Corpus consolidation (2026-07-31): device-hardening how-to folded into the surviving guide. |
| `/resources/privacy-in-practice/iphone-hide-period-app-privacy-checklist` | `/resources/privacy-in-practice/lock-down-period-data-on-your-phone` | configured | Corpus consolidation (2026-07-31): device-hardening how-to folded into the surviving guide. |
| `/resources/privacy-in-practice/partner-sync-privacy-checklist` | `/resources/privacy-in-practice/lock-down-period-data-on-your-phone` | configured | Corpus consolidation (2026-07-31): device-hardening how-to folded into the surviving guide. |
| `/resources/privacy-in-practice/period-app-location-permission-audit` | `/resources/privacy-in-practice/lock-down-period-data-on-your-phone` | configured | Corpus consolidation (2026-07-31): device-hardening how-to folded into the surviving guide. |
| `/resources/privacy-in-practice/period-app-notification-privacy` | `/resources/privacy-in-practice/lock-down-period-data-on-your-phone` | configured | Corpus consolidation (2026-07-31): device-hardening how-to folded into the surviving guide. |
| `/resources/privacy-in-practice/period-leak-photo-location-privacy-checklist` | `/resources/privacy-in-practice/lock-down-period-data-on-your-phone` | configured | Corpus consolidation (2026-07-31): device-hardening how-to folded into the surviving guide. |
| `/resources/privacy-in-practice/period-photo-hidden-album-privacy-checklist` | `/resources/privacy-in-practice/lock-down-period-data-on-your-phone` | configured | Corpus consolidation (2026-07-31): device-hardening how-to folded into the surviving guide. |
| `/resources/privacy-in-practice/period-tracking-on-shared-phone` | `/resources/privacy-in-practice/lock-down-period-data-on-your-phone` | configured | Corpus consolidation (2026-07-31): device-hardening how-to folded into the surviving guide. |
| `/resources/privacy-in-practice/printable-health-template-privacy-checklist` | `/resources/privacy-in-practice/lock-down-period-data-on-your-phone` | configured | Corpus consolidation (2026-07-31): device-hardening how-to folded into the surviving guide. |
| `/resources/privacy-in-practice/samsung-secure-folder-period-app-checklist` | `/resources/privacy-in-practice/lock-down-period-data-on-your-phone` | configured | Corpus consolidation (2026-07-31): device-hardening how-to folded into the surviving guide. |
| `/resources/privacy-in-practice/secure-period-data-backup` | `/resources/privacy-in-practice/lock-down-period-data-on-your-phone` | configured | Corpus consolidation (2026-07-31): device-hardening how-to folded into the surviving guide. |
| `/resources/privacy-in-practice/shared-apple-id-period-privacy-checklist` | `/resources/privacy-in-practice/lock-down-period-data-on-your-phone` | configured | Corpus consolidation (2026-07-31): device-hardening how-to folded into the surviving guide. |
| `/resources/privacy-in-practice/teen-period-app-notification-privacy-check` | `/resources/privacy-in-practice/lock-down-period-data-on-your-phone` | configured | Corpus consolidation (2026-07-31): device-hardening how-to folded into the surviving guide. |
| `/resources/privacy-in-practice/turn-off-period-data-apple-health` | `/resources/privacy-in-practice/lock-down-period-data-on-your-phone` | configured | Corpus consolidation (2026-07-31): device-hardening how-to folded into the surviving guide. |
| `/resources/privacy-in-practice/turn-off-period-data-health-connect` | `/resources/privacy-in-practice/lock-down-period-data-on-your-phone` | configured | Corpus consolidation (2026-07-31): device-hardening how-to folded into the surviving guide. |
| `/resources/privacy-in-practice/verify-on-device-storage-claims` | `/resources/privacy-in-practice/lock-down-period-data-on-your-phone` | configured | Corpus consolidation (2026-07-31): device-hardening how-to folded into the surviving guide. |
| `/resources/privacy-in-practice/vpn-period-tracker-setup` | `/resources/privacy-in-practice/lock-down-period-data-on-your-phone` | configured | Corpus consolidation (2026-07-31): device-hardening how-to folded into the surviving guide. |
| `/resources/privacy-in-practice/can-employer-see-period-tracker-data` | `/resources/privacy-in-practice/who-can-legally-get-your-period-data` | configured | Corpus consolidation (2026-07-31): legal-access page folded into the surviving guide. |
| `/resources/privacy-in-practice/data-broker-exposure-check` | `/resources/privacy-in-practice/who-can-legally-get-your-period-data` | configured | Corpus consolidation (2026-07-31): legal-access page folded into the surviving guide. |
| `/resources/privacy-in-practice/insurance-period-data-risks` | `/resources/privacy-in-practice/who-can-legally-get-your-period-data` | configured | Corpus consolidation (2026-07-31): legal-access page folded into the surviving guide. |
| `/resources/privacy-in-practice/period-app-data-criminal-investigation-risk` | `/resources/privacy-in-practice/who-can-legally-get-your-period-data` | configured | Corpus consolidation (2026-07-31): legal-access page folded into the surviving guide. |
| `/resources/privacy-in-practice/period-data-after-breakup-divorce` | `/resources/privacy-in-practice/who-can-legally-get-your-period-data` | configured | Corpus consolidation (2026-07-31): legal-access page folded into the surviving guide. |
| `/resources/privacy-in-practice/period-data-custody-divorce` | `/resources/privacy-in-practice/who-can-legally-get-your-period-data` | configured | Corpus consolidation (2026-07-31): legal-access page folded into the surviving guide. |
| `/resources/privacy-in-practice/period-data-in-stalking-cases` | `/resources/privacy-in-practice/who-can-legally-get-your-period-data` | configured | Corpus consolidation (2026-07-31): legal-access page folded into the surviving guide. |
| `/resources/privacy-in-practice/period-tracker-data-fertility-clinic` | `/resources/privacy-in-practice/who-can-legally-get-your-period-data` | configured | Corpus consolidation (2026-07-31): legal-access page folded into the surviving guide. |
| `/resources/privacy-in-practice/period-tracker-data-insurance-discrimination` | `/resources/privacy-in-practice/who-can-legally-get-your-period-data` | configured | Corpus consolidation (2026-07-31): legal-access page folded into the surviving guide. |
| `/resources/privacy-in-practice/period-tracking-abroad-different-laws` | `/resources/privacy-in-practice/who-can-legally-get-your-period-data` | configured | Corpus consolidation (2026-07-31): legal-access page folded into the surviving guide. |
| `/resources/privacy-in-practice/period-tracking-and-domestic-violence-safety` | `/resources/privacy-in-practice/who-can-legally-get-your-period-data` | configured | Corpus consolidation (2026-07-31): legal-access page folded into the surviving guide. |
| `/resources/privacy-in-practice/period-tracking-workplace-accommodation` | `/resources/privacy-in-practice/who-can-legally-get-your-period-data` | configured | Corpus consolidation (2026-07-31): legal-access page folded into the surviving guide. |
| `/resources/privacy-in-practice/travel-period-data-privacy-checklist` | `/resources/privacy-in-practice/who-can-legally-get-your-period-data` | configured | Corpus consolidation (2026-07-31): legal-access page folded into the surviving guide. |
| `/resources/privacy-in-practice/what-subpoenas-actually-request` | `/resources/privacy-in-practice/who-can-legally-get-your-period-data` | configured | Corpus consolidation (2026-07-31): legal-access page folded into the surviving guide. |
| `/resources/privacy-in-practice/after-visit-summary-period-data-checklist` | `/resources/privacy-in-practice/your-medical-records-and-period-data` | configured | Corpus consolidation (2026-07-31): medical-records privacy page folded into the surviving guide. |
| `/resources/privacy-in-practice/breast-imaging-result-privacy-checklist` | `/resources/privacy-in-practice/your-medical-records-and-period-data` | configured | Corpus consolidation (2026-07-31): medical-records privacy page folded into the surviving guide. |
| `/resources/privacy-in-practice/fertility-data-privacy-handoff-sheet` | `/resources/privacy-in-practice/your-medical-records-and-period-data` | configured | Corpus consolidation (2026-07-31): medical-records privacy page folded into the surviving guide. |
| `/resources/privacy-in-practice/hpv-result-data-privacy-checklist` | `/resources/privacy-in-practice/your-medical-records-and-period-data` | configured | Corpus consolidation (2026-07-31): medical-records privacy page folded into the surviving guide. |
| `/resources/privacy-in-practice/insurance-eob-reproductive-health-privacy-checklist` | `/resources/privacy-in-practice/your-medical-records-and-period-data` | configured | Corpus consolidation (2026-07-31): medical-records privacy page folded into the surviving guide. |
| `/resources/privacy-in-practice/lab-results-period-data-privacy-checklist` | `/resources/privacy-in-practice/your-medical-records-and-period-data` | configured | Corpus consolidation (2026-07-31): medical-records privacy page folded into the surviving guide. |
| `/resources/privacy-in-practice/mychart-proxy-access-period-privacy-checklist` | `/resources/privacy-in-practice/your-medical-records-and-period-data` | configured | Corpus consolidation (2026-07-31): medical-records privacy page folded into the surviving guide. |
| `/resources/privacy-in-practice/pap-smear-result-privacy-checklist` | `/resources/privacy-in-practice/your-medical-records-and-period-data` | configured | Corpus consolidation (2026-07-31): medical-records privacy page folded into the surviving guide. |
| `/resources/privacy-in-practice/patient-portal-period-data-privacy-checklist` | `/resources/privacy-in-practice/your-medical-records-and-period-data` | configured | Corpus consolidation (2026-07-31): medical-records privacy page folded into the surviving guide. |
| `/resources/privacy-in-practice/pcos-symptom-documentation-insurance` | `/resources/privacy-in-practice/your-medical-records-and-period-data` | configured | Corpus consolidation (2026-07-31): medical-records privacy page folded into the surviving guide. |
| `/resources/privacy-in-practice/period-data-for-endometriosis-diagnosis` | `/resources/privacy-in-practice/your-medical-records-and-period-data` | configured | Corpus consolidation (2026-07-31): medical-records privacy page folded into the surviving guide. |
| `/resources/privacy-in-practice/period-tracking-data-for-doctor-appointments` | `/resources/privacy-in-practice/your-medical-records-and-period-data` | configured | Corpus consolidation (2026-07-31): medical-records privacy page folded into the surviving guide. |
| `/resources/privacy-in-practice/teen-patient-portal-period-privacy-checklist` | `/resources/privacy-in-practice/your-medical-records-and-period-data` | configured | Corpus consolidation (2026-07-31): medical-records privacy page folded into the surviving guide. |
| `/resources/privacy-in-practice/telehealth-period-tracking-data-risks` | `/resources/privacy-in-practice/your-medical-records-and-period-data` | configured | Corpus consolidation (2026-07-31): medical-records privacy page folded into the surviving guide. |
| `/resources/privacy-in-practice/thyroid-iron-lab-privacy-checklist` | `/resources/privacy-in-practice/your-medical-records-and-period-data` | configured | Corpus consolidation (2026-07-31): medical-records privacy page folded into the surviving guide. |
| `/resources/privacy-in-practice/campus-period-data-privacy-checklist` | `/resources/privacy-in-practice/period-tracking-privacy-for-teens-and-students` | configured | Corpus consolidation (2026-07-31): teen and school privacy page folded into the surviving guide. |
| `/resources/privacy-in-practice/first-period-data-privacy-checklist` | `/resources/privacy-in-practice/period-tracking-privacy-for-teens-and-students` | configured | Corpus consolidation (2026-07-31): teen and school privacy page folded into the surviving guide. |
| `/resources/privacy-in-practice/period-tracker-privacy-audit-parents` | `/resources/privacy-in-practice/period-tracking-privacy-for-teens-and-students` | configured | Corpus consolidation (2026-07-31): teen and school privacy page folded into the surviving guide. |
| `/resources/privacy-in-practice/school-device-period-tracking-risks` | `/resources/privacy-in-practice/period-tracking-privacy-for-teens-and-students` | configured | Corpus consolidation (2026-07-31): teen and school privacy page folded into the surviving guide. |
| `/resources/privacy-in-practice/school-health-apps-period-tracking-teens` | `/resources/privacy-in-practice/period-tracking-privacy-for-teens-and-students` | configured | Corpus consolidation (2026-07-31): teen and school privacy page folded into the surviving guide. |
| `/resources/privacy-in-practice/school-phone-period-tracking-privacy-checklist` | `/resources/privacy-in-practice/period-tracking-privacy-for-teens-and-students` | configured | Corpus consolidation (2026-07-31): teen and school privacy page folded into the surviving guide. |
| `/resources/privacy-in-practice/teen-period-app-privacy-checklist` | `/resources/privacy-in-practice/period-tracking-privacy-for-teens-and-students` | configured | Corpus consolidation (2026-07-31): teen and school privacy page folded into the surviving guide. |
| `/resources/privacy-in-practice/adenomyosis-data-privacy-checklist` | `/resources/privacy-in-practice/protect-your-symptom-and-condition-data` | configured | Corpus consolidation (2026-07-31): condition and symptom privacy checklist folded into the surviving guide. |
| `/resources/privacy-in-practice/birth-control-data-privacy-checklist` | `/resources/privacy-in-practice/protect-your-symptom-and-condition-data` | configured | Corpus consolidation (2026-07-31): condition and symptom privacy checklist folded into the surviving guide. |
| `/resources/privacy-in-practice/cycle-prediction-data-privacy-checklist` | `/resources/privacy-in-practice/protect-your-symptom-and-condition-data` | configured | Corpus consolidation (2026-07-31): condition and symptom privacy checklist folded into the surviving guide. |
| `/resources/privacy-in-practice/digestive-cycle-data-privacy-checklist` | `/resources/privacy-in-practice/protect-your-symptom-and-condition-data` | configured | Corpus consolidation (2026-07-31): condition and symptom privacy checklist folded into the surviving guide. |
| `/resources/privacy-in-practice/emergency-contraception-data-privacy-checklist` | `/resources/privacy-in-practice/protect-your-symptom-and-condition-data` | configured | Corpus consolidation (2026-07-31): condition and symptom privacy checklist folded into the surviving guide. |
| `/resources/privacy-in-practice/endometriosis-data-privacy-checklist` | `/resources/privacy-in-practice/protect-your-symptom-and-condition-data` | configured | Corpus consolidation (2026-07-31): condition and symptom privacy checklist folded into the surviving guide. |
| `/resources/privacy-in-practice/fibroid-data-privacy-checklist` | `/resources/privacy-in-practice/protect-your-symptom-and-condition-data` | configured | Corpus consolidation (2026-07-31): condition and symptom privacy checklist folded into the surviving guide. |
| `/resources/privacy-in-practice/focus-mood-cycle-data-privacy-checklist` | `/resources/privacy-in-practice/protect-your-symptom-and-condition-data` | configured | Corpus consolidation (2026-07-31): condition and symptom privacy checklist folded into the surviving guide. |
| `/resources/privacy-in-practice/late-period-data-privacy-checklist` | `/resources/privacy-in-practice/protect-your-symptom-and-condition-data` | configured | Corpus consolidation (2026-07-31): condition and symptom privacy checklist folded into the surviving guide. |
| `/resources/privacy-in-practice/menstrual-migraine-data-privacy-checklist` | `/resources/privacy-in-practice/protect-your-symptom-and-condition-data` | configured | Corpus consolidation (2026-07-31): condition and symptom privacy checklist folded into the surviving guide. |
| `/resources/privacy-in-practice/ovarian-cyst-data-privacy-checklist` | `/resources/privacy-in-practice/protect-your-symptom-and-condition-data` | configured | Corpus consolidation (2026-07-31): condition and symptom privacy checklist folded into the surviving guide. |
| `/resources/privacy-in-practice/pcos-data-sharing-privacy-checklist` | `/resources/privacy-in-practice/protect-your-symptom-and-condition-data` | configured | Corpus consolidation (2026-07-31): condition and symptom privacy checklist folded into the surviving guide. |
| `/resources/privacy-in-practice/perimenopause-data-privacy-checklist` | `/resources/privacy-in-practice/protect-your-symptom-and-condition-data` | configured | Corpus consolidation (2026-07-31): condition and symptom privacy checklist folded into the surviving guide. |
| `/resources/privacy-in-practice/period-anxiety-data-privacy-checklist` | `/resources/privacy-in-practice/protect-your-symptom-and-condition-data` | configured | Corpus consolidation (2026-07-31): condition and symptom privacy checklist folded into the surviving guide. |
| `/resources/privacy-in-practice/period-clot-data-privacy-checklist` | `/resources/privacy-in-practice/protect-your-symptom-and-condition-data` | configured | Corpus consolidation (2026-07-31): condition and symptom privacy checklist folded into the surviving guide. |
| `/resources/privacy-in-practice/period-cramp-data-privacy-checklist` | `/resources/privacy-in-practice/protect-your-symptom-and-condition-data` | configured | Corpus consolidation (2026-07-31): condition and symptom privacy checklist folded into the surviving guide. |
| `/resources/privacy-in-practice/period-flow-change-data-privacy-checklist` | `/resources/privacy-in-practice/protect-your-symptom-and-condition-data` | configured | Corpus consolidation (2026-07-31): condition and symptom privacy checklist folded into the surviving guide. |
| `/resources/privacy-in-practice/period-flu-data-privacy-checklist` | `/resources/privacy-in-practice/protect-your-symptom-and-condition-data` | configured | Corpus consolidation (2026-07-31): condition and symptom privacy checklist folded into the surviving guide. |
| `/resources/privacy-in-practice/period-pain-location-data-privacy-checklist` | `/resources/privacy-in-practice/protect-your-symptom-and-condition-data` | configured | Corpus consolidation (2026-07-31): condition and symptom privacy checklist folded into the surviving guide. |
| `/resources/privacy-in-practice/period-product-symptom-data-privacy-checklist` | `/resources/privacy-in-practice/protect-your-symptom-and-condition-data` | configured | Corpus consolidation (2026-07-31): condition and symptom privacy checklist folded into the surviving guide. |
| `/resources/privacy-in-practice/pmdd-data-privacy-checklist` | `/resources/privacy-in-practice/protect-your-symptom-and-condition-data` | configured | Corpus consolidation (2026-07-31): condition and symptom privacy checklist folded into the surviving guide. |
| `/resources/privacy-in-practice/pms-body-data-privacy-checklist` | `/resources/privacy-in-practice/protect-your-symptom-and-condition-data` | configured | Corpus consolidation (2026-07-31): condition and symptom privacy checklist folded into the surviving guide. |
| `/resources/privacy-in-practice/reusable-period-product-data-privacy-checklist` | `/resources/privacy-in-practice/protect-your-symptom-and-condition-data` | configured | Corpus consolidation (2026-07-31): condition and symptom privacy checklist folded into the surviving guide. |
| `/resources/privacy-in-practice/sex-pain-and-bleeding-data-privacy-checklist` | `/resources/privacy-in-practice/protect-your-symptom-and-condition-data` | configured | Corpus consolidation (2026-07-31): condition and symptom privacy checklist folded into the surviving guide. |
| `/resources/privacy-in-practice/sleep-cycle-data-privacy-checklist` | `/resources/privacy-in-practice/protect-your-symptom-and-condition-data` | configured | Corpus consolidation (2026-07-31): condition and symptom privacy checklist folded into the surviving guide. |
| `/resources/privacy-in-practice/special-event-period-data-privacy-checklist` | `/resources/privacy-in-practice/protect-your-symptom-and-condition-data` | configured | Corpus consolidation (2026-07-31): condition and symptom privacy checklist folded into the surviving guide. |
| `/resources/privacy-in-practice/uti-and-bladder-data-privacy-checklist` | `/resources/privacy-in-practice/protect-your-symptom-and-condition-data` | configured | Corpus consolidation (2026-07-31): condition and symptom privacy checklist folded into the surviving guide. |
| `/resources/privacy-in-practice/vaginal-discharge-data-privacy-checklist` | `/resources/privacy-in-practice/protect-your-symptom-and-condition-data` | configured | Corpus consolidation (2026-07-31): condition and symptom privacy checklist folded into the surviving guide. |
| `/resources/privacy-in-practice/vulvar-symptom-data-privacy-checklist` | `/resources/privacy-in-practice/protect-your-symptom-and-condition-data` | configured | Corpus consolidation (2026-07-31): condition and symptom privacy checklist folded into the surviving guide. |
| `/resources/privacy-in-practice/wearable-devices-period-data` | `/resources/privacy-in-practice/protect-your-symptom-and-condition-data` | configured | Corpus consolidation (2026-07-31): condition and symptom privacy checklist folded into the surviving guide. |
| `/resources/best/best-period-tracker-apps-2026-irregular-cycles` | `/resources/best/best-period-tracker-apps-2026` | configured | Corpus consolidation (2026-07-31): duplicate ranked list merged into the canonical 2026 list. |
