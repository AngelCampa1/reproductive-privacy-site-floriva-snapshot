import type { EdgeData, EdgeEnv } from "./_lib/bindings";
import { runWithEdgeSentry } from "./_lib/sentry";
import { robotsDirective } from "../src/site/index-policy";
import { buildCanonicalUrl, buildDocumentTitle, resolvePageMeta } from "../src/site/page-meta";
import { siteSeo } from "../src/site/seo";
import { buildPageJsonLd, serializeJsonLd } from "../src/site/structured-data";

const legacyExactRedirects: Record<string, string> = {
  "/compare/alternatives/clue-app-alternative": "/compare/alternatives/clue-alternative-no-cloud",
  "/compare/alternatives/flo-alternative-privacy-first": "/compare/alternatives/flo-app-alternative",
  "/compare/alternatives/natural-cycles-alternative": "/compare/alternatives/natural-cycles-alternative-privacy",
  "/compare/alternatives/stardust-app-alternative": "/compare/alternatives/stardust-alternative-local-storage",
  "/compare/pricing/clue-app-pricing": "/compare/pricing/clue-plus-pricing-vs-privacy-cost",
  "/compare/pricing/flo-health-pricing": "/compare/pricing/flo-premium-pricing-worth-privacy-risk",
  "/compare/pricing/natural-cycles-pricing": "/compare/pricing/natural-cycles-pricing-review",
  "/compare/versus/euki-vs-drip": "/compare/versus/euki-vs-drip-privacy-trackers",
  "/compare/versus/flo-vs-clue": "/compare/versus/flo-vs-clue-privacy-comparison",
  "/compare/versus/natural-cycles-vs-clue": "/compare/versus/natural-cycles-vs-clue-data-privacy",
  "/free/7-day-pcos-meal-planning-worksheet": "/free/pcos-tracking-kit",
  "/free/abnormal-bleeding-diary-doctor-visit": "/free/abnormal-bleeding-log",
  "/free/abnormal-mammogram-result-notes": "/free/biopsy-result-visit-notes",
  "/free/abnormal-pap-result-question-list": "/free/reproductive-visit-prep-kit",
  "/free/acne-before-period-skin-log": "/free/premenstrual-symptom-tracker",
  "/free/adenomyosis-belly-pressure-tracker": "/free/adenomyosis-tracking-kit",
  "/free/adenomyosis-bleeding-and-clot-log": "/free/adenomyosis-tracking-kit",
  "/free/adenomyosis-pain-flare-log": "/free/adenomyosis-tracking-kit",
  "/free/adenomyosis-symptom-checklist-no-diagnosis": "/free/adenomyosis-tracking-kit",
  "/free/adenomyosis-treatment-decision-question-list": "/free/adenomyosis-tracking-kit",
  "/free/adenomyosis-ultrasound-mri-question-list": "/free/adenomyosis-tracking-kit",
  "/free/adenomyosis-vs-endometriosis-fibroids-checklist": "/free/adenomyosis-tracking-kit",
  "/free/adhd-worse-before-period-notes": "/free/premenstrual-symptom-tracker",
  "/free/anger-before-period-notes": "/free/premenstrual-symptom-tracker",
  "/free/antibiotics-birth-control-question-list": "/free/birth-control-tracking-kit",
  "/free/antibiotics-cycle-notes-list": "/free/reproductive-visit-prep-kit",
  "/free/anxiety-before-period-cycle-log": "/free/premenstrual-symptom-tracker",
  "/free/bbt-disruption-log": "/free/ovulation-fertility-awareness-kit",
  "/free/before-period-mood-doctor-message-script": "/free/premenstrual-symptom-tracker",
  "/free/birth-control-illness-dose-note-sheet": "/free/birth-control-tracking-kit",
  "/free/birth-control-medicine-interaction-checklist": "/free/birth-control-tracking-kit",
  "/free/birth-control-patch-bleeding-log": "/free/birth-control-tracking-kit",
  "/free/birth-control-patch-change-notes": "/free/birth-control-tracking-kit",
  "/free/birth-control-patch-side-effect-question-list": "/free/birth-control-tracking-kit",
  "/free/birth-control-pharmacy-refill-privacy-card": "/free/birth-control-tracking-kit",
  "/free/birth-control-pill-pack-notes": "/free/birth-control-tracking-kit",
  "/free/birth-control-pill-reminder-privacy-card": "/free/birth-control-tracking-kit",
  "/free/birth-control-refill-gap-planner": "/free/birth-control-tracking-kit",
  "/free/birth-control-ring-bleeding-log": "/free/birth-control-tracking-kit",
  "/free/birth-control-side-effect-tracker": "/free/birth-control-tracking-kit",
  "/free/birth-control-supplement-disclosure-card": "/free/birth-control-tracking-kit",
  "/free/birth-control-switch-checklist": "/free/birth-control-tracking-kit",
  "/free/birth-control-time-zone-travel-question-list": "/free/birth-control-tracking-kit",
  "/free/birth-control-vomiting-diarrhea-question-list": "/free/birth-control-tracking-kit",
  "/free/bladder-pain-before-period-tracker": "/free/period-pain-cramp-diary",
  "/free/bleeding-after-plan-b-notes": "/free/emergency-contraception-log",
  "/free/bleeding-after-sex-before-period-tracker": "/free/abnormal-bleeding-log",
  "/free/bleeding-after-sex-on-birth-control-notes": "/free/abnormal-bleeding-log",
  "/free/bleeding-after-sex-tracker": "/free/abnormal-bleeding-log",
  "/free/body-aches-before-period-log": "/free/premenstrual-symptom-tracker",
  "/free/brain-fog-before-period-tracker": "/free/premenstrual-symptom-tracker",
  "/free/breakthrough-bleeding-log": "/free/abnormal-bleeding-log",
  "/free/breast-biopsy-result-notes": "/free/biopsy-result-visit-notes",
  "/free/breast-cyst-symptom-question-list": "/free/biopsy-result-visit-notes",
  "/free/breast-lump-cycle-note-sheet": "/free/biopsy-result-visit-notes",
  "/free/breast-pain-after-period-notes": "/free/period-pain-cramp-diary",
  "/free/breast-tenderness-before-period-tracker": "/free/premenstrual-symptom-tracker",
  "/free/breast-ultrasound-result-questions": "/free/biopsy-result-visit-notes",
  "/free/brown-discharge-after-sex-notes": "/free/vaginal-discharge-odor-checklist",
  "/free/bv-symptom-visit-prep-checklist": "/free/vaginal-discharge-odor-checklist",
  "/free/campus-period-product-refill-plan": "/free/period-at-college-dorm-kit",
  "/free/cant-focus-before-period-work-sheet": "/free/premenstrual-symptom-tracker",
  "/free/cant-sleep-before-period-notes": "/free/period-sleep-log",
  "/free/cbc-heavy-period-question-list": "/free/heavy-period-clot-tracker",
  "/free/cervical-biopsy-result-notes": "/free/biopsy-result-visit-notes",
  "/free/cervical-mucus-tracking-chart": "/free/vaginal-discharge-odor-checklist",
  "/free/chills-before-period-tracker": "/free/premenstrual-symptom-tracker",
  "/free/clinic-phone-call-period-script": "/free/reproductive-visit-prep-kit",
  "/free/clue-data-export-review-worksheet": "/free/delete-period-data-guide",
  "/free/college-move-in-period-health-checklist": "/free/period-at-college-dorm-kit",
  "/free/college-period-packing-list": "/free/period-at-college-dorm-kit",
  "/free/colposcopy-question-checklist": "/free/biopsy-result-visit-notes",
  "/free/colposcopy-recovery-note-sheet": "/free/biopsy-result-visit-notes",
  "/free/constipation-before-period-tracker": "/free/premenstrual-symptom-tracker",
  "/free/cramps-but-no-period-visit-notes": "/free/period-pain-cramp-diary",
  "/free/crying-before-period-tracker": "/free/premenstrual-symptom-tracker",
  "/free/cycle-day-counting-chart": "/free/cycle-length-calculator-kit",
  "/free/cycle-focus-visit-summary": "/free/reproductive-visit-prep-kit",
  "/free/cycle-length-calculator-worksheet": "/free/cycle-length-calculator-kit",
  "/free/cycle-mood-support-person-note": "/free/premenstrual-symptom-tracker",
  "/free/cycle-syncing-planner": "/free/cycle-syncing-food-workout-planner",
  "/free/cycle-tracking-starter-kit-teens": "/free/first-period-starter-kit",
  "/free/cycle-tracking-starter-template": "/free/first-period-starter-kit",
  "/free/data-deletion-request-guide": "/free/delete-period-data-guide",
  "/free/depo-shot-bleeding-calendar": "/free/birth-control-tracking-kit",
  "/free/depressed-before-period-note-sheet": "/free/premenstrual-symptom-tracker",
  "/free/diarrhea-before-period-tracker": "/free/premenstrual-symptom-tracker",
  "/free/dizziness-during-period-notes": "/free/premenstrual-symptom-tracker",
  "/free/doctor-appointment-notes-template-periods": "/free/reproductive-visit-prep-kit",
  "/free/dorm-laundry-period-stain-plan": "/free/period-at-college-dorm-kit",
  "/free/dorm-period-kit-checklist": "/free/period-at-college-dorm-kit",
  "/free/early-late-period-timing-log": "/free/cycle-length-calculator-kit",
  "/free/ella-period-timing-notes": "/free/emergency-contraception-log",
  "/free/emergency-contraception-cycle-follow-up-log": "/free/emergency-contraception-log",
  "/free/emergency-contraception-pharmacist-question-list": "/free/emergency-contraception-log",
  "/free/employer-wellness-app-privacy-audit": "/free/period-app-privacy-audit-kit",
  "/free/endometriosis-appointment-prep-checklist": "/free/endometriosis-tracking-kit",
  "/free/endometriosis-bowel-bladder-symptom-log": "/free/endometriosis-tracking-kit",
  "/free/endometriosis-diet-symptom-trigger-log": "/free/endometriosis-tracking-kit",
  "/free/endometriosis-laparoscopy-recovery-log": "/free/endometriosis-tracking-kit",
  "/free/endometriosis-pain-diary": "/free/endometriosis-tracking-kit",
  "/free/endometriosis-pain-relief-trial-log": "/free/endometriosis-tracking-kit",
  "/free/endometriosis-symptom-checklist-no-quiz": "/free/endometriosis-tracking-kit",
  "/free/endometriosis-ultrasound-question-list": "/free/endometriosis-tracking-kit",
  "/free/exercise-during-period-symptom-log": "/free/cycle-syncing-food-workout-planner",
  "/free/exercise-weight-change-period-log": "/free/cycle-syncing-food-workout-planner",
  "/free/fatigue-before-period-tracker": "/free/premenstrual-symptom-tracker",
  "/free/ferritin-result-question-card": "/free/thyroid-hormone-lab-organizer",
  "/free/fertility-awareness-chart-review-checklist": "/free/ovulation-fertility-awareness-kit",
  "/free/fertility-awareness-method-chart": "/free/ovulation-fertility-awareness-kit",
  "/free/fever-and-period-symptom-notes": "/free/premenstrual-symptom-tracker",
  "/free/fibroid-appointment-prep-checklist": "/free/fibroid-tracking-kit",
  "/free/fibroid-bleeding-and-clot-log": "/free/fibroid-tracking-kit",
  "/free/fibroid-pressure-bladder-bowel-log": "/free/fibroid-tracking-kit",
  "/free/fibroid-symptom-checklist-no-diagnosis": "/free/fibroid-tracking-kit",
  "/free/fibroid-treatment-decision-question-list": "/free/fibroid-tracking-kit",
  "/free/fibroid-ultrasound-question-list": "/free/fibroid-tracking-kit",
  "/free/field-trip-period-pack-checklist": "/free/period-away-from-home-kit",
  "/free/first-period-app-setup-privacy-card": "/free/first-period-starter-kit",
  "/free/first-period-calculator-reality-check": "/free/cycle-length-calculator-kit",
  "/free/first-period-doctor-question-list": "/free/reproductive-visit-prep-kit",
  "/free/first-period-emergency-bag-plan": "/free/first-period-starter-kit",
  "/free/first-period-parent-conversation-script": "/free/first-period-starter-kit",
  "/free/first-period-school-kit-checklist": "/free/first-period-starter-kit",
  "/free/first-period-signs-notes": "/free/first-period-starter-kit",
  "/free/first-period-tracking-starter-sheet": "/free/first-period-starter-kit",
  "/free/flo-data-deletion-receipt-checklist": "/free/delete-period-data-guide",
  "/free/flo-to-floriva-switcher-guide": "/free/delete-period-data-guide",
  "/free/florida-georgia-scorecard-bundle": "/free/post-dobbs-digital-safety-kit-hub",
  "/free/flu-like-symptoms-before-period-log": "/free/premenstrual-symptom-tracker",
  "/free/food-and-cycle-symptom-diary": "/free/cycle-syncing-food-workout-planner",
  "/free/food-cravings-before-period-notes": "/free/premenstrual-symptom-tracker",
  "/free/forgetful-before-period-memory-log": "/free/premenstrual-symptom-tracker",
  "/free/gym-period-kit-checklist": "/free/period-away-from-home-kit",
  "/free/heating-pad-period-cramp-notes": "/free/period-pain-cramp-diary",
  "/free/heavy-flow-product-change-clot-tracker": "/free/heavy-period-clot-tracker",
  "/free/heavy-period-iron-test-question-list": "/free/heavy-period-clot-tracker",
  "/free/heavy-period-visit-prep-checklist": "/free/heavy-period-clot-tracker",
  "/free/hip-pain-during-period-log": "/free/period-pain-cramp-diary",
  "/free/hormone-health-monthly-log": "/free/thyroid-hormone-lab-organizer",
  "/free/hot-flash-night-sweat-log": "/free/period-sleep-log",
  "/free/hotel-period-cleanup-checklist": "/free/period-away-from-home-kit",
  "/free/hpv-positive-pap-follow-up-notes": "/free/biopsy-result-visit-notes",
  "/free/hrt-discussion-question-list": "/free/thyroid-hormone-lab-organizer",
  "/free/hungry-before-period-log": "/free/premenstrual-symptom-tracker",
  "/free/illness-late-period-notes": "/free/late-missed-period-log",
  "/free/insomnia-before-period-sleep-log": "/free/period-sleep-log",
  "/free/iud-appointment-question-checklist": "/free/reproductive-visit-prep-kit",
  "/free/iud-bleeding-and-cramp-log": "/free/period-pain-cramp-diary",
  "/free/jelly-like-period-clot-notes": "/free/heavy-period-clot-tracker",
  "/free/labia-swelling-visit-notes": "/free/vulvar-symptom-log",
  "/free/large-period-clot-visit-summary": "/free/heavy-period-clot-tracker",
  "/free/late-period-after-plan-b-test-questions": "/free/emergency-contraception-log",
  "/free/late-period-context-log": "/free/late-missed-period-log",
  "/free/leg-pain-during-period-notes": "/free/period-pain-cramp-diary",
  "/free/lh-test-strip-tracker": "/free/ovulation-fertility-awareness-kit",
  "/free/light-period-tracker": "/free/abnormal-bleeding-log",
  "/free/long-period-bleeding-log": "/free/heavy-period-clot-tracker",
  "/free/long-shift-period-break-plan": "/free/period-away-from-home-kit",
  "/free/lower-back-pain-during-period-log": "/free/period-pain-cramp-diary",
  "/free/luteal-phase-date-notes": "/free/cycle-length-calculator-kit",
  "/free/mammogram-anxiety-visit-card": "/free/premenstrual-symptom-tracker",
  "/free/mammogram-result-question-list": "/free/biopsy-result-visit-notes",
  "/free/medication-and-cycle-notes-list": "/free/reproductive-visit-prep-kit",
  "/free/menstrual-cup-leak-log": "/free/period-leak-and-product-kit",
  "/free/menstrual-cup-pain-notes": "/free/period-pain-cramp-diary",
  "/free/menstrual-cycle-calendar-template": "/free/cycle-length-calculator-kit",
  "/free/menstrual-disc-leak-notes": "/free/period-leak-and-product-kit",
  "/free/menstrual-migraine-appointment-prep-checklist": "/free/menstrual-migraine-log",
  "/free/menstrual-migraine-cycle-log": "/free/menstrual-migraine-log",
  "/free/migraine-aura-cycle-notes": "/free/menstrual-migraine-log",
  "/free/migraine-before-period-tracker": "/free/menstrual-migraine-log",
  "/free/migraine-medication-response-log": "/free/menstrual-migraine-log",
  "/free/migraine-trigger-and-cycle-comparison-log": "/free/menstrual-migraine-log",
  "/free/missed-birth-control-pill-question-list": "/free/birth-control-tracking-kit",
  "/free/mood-swings-before-period-log": "/free/premenstrual-symptom-tracker",
  "/free/morning-after-pill-side-effect-notes": "/free/emergency-contraception-log",
  "/free/myomectomy-recovery-log": "/free/fibroid-tracking-kit",
  "/free/nausea-before-period-tracker": "/free/premenstrual-symptom-tracker",
  "/free/negative-pregnancy-test-late-period-questions": "/free/late-missed-period-log",
  "/free/next-period-date-estimate-worksheet": "/free/cycle-length-calculator-kit",
  "/free/night-sweats-before-period-notes": "/free/period-sleep-log",
  "/free/nipple-discharge-cycle-notes": "/free/vaginal-discharge-odor-checklist",
  "/free/nuvaring-bleeding-question-list": "/free/birth-control-tracking-kit",
  "/free/old-period-app-cleanup-plan": "/free/delete-period-data-guide",
  "/free/one-day-period-notes": "/free/abnormal-bleeding-log",
  "/free/ovarian-cyst-pain-log": "/free/ovarian-cyst-tracking-kit",
  "/free/ovarian-cyst-period-change-tracker": "/free/ovarian-cyst-tracking-kit",
  "/free/ovarian-cyst-rupture-urgent-care-notes": "/free/ovarian-cyst-tracking-kit",
  "/free/ovarian-cyst-surgery-recovery-log": "/free/ovarian-cyst-tracking-kit",
  "/free/ovarian-cyst-symptom-checklist-no-diagnosis": "/free/ovarian-cyst-tracking-kit",
  "/free/ovarian-cyst-treatment-decision-question-list": "/free/ovarian-cyst-tracking-kit",
  "/free/ovarian-cyst-ultrasound-question-list": "/free/ovarian-cyst-tracking-kit",
  "/free/overnight-period-leak-log": "/free/period-leak-and-product-kit",
  "/free/ovulation-calculator-question-list": "/free/reproductive-visit-prep-kit",
  "/free/ovulation-symptoms-tracker": "/free/ovulation-fertility-awareness-kit",
  "/free/pad-chafing-period-notes": "/free/period-leak-and-product-kit",
  "/free/pad-leak-and-shift-log": "/free/period-leak-and-product-kit",
  "/free/pad-rash-symptom-log": "/free/period-leak-and-product-kit",
  "/free/pain-after-sex-pelvic-pain-log": "/free/period-pain-cramp-diary",
  "/free/pain-down-leg-during-period-map": "/free/period-pain-cramp-diary",
  "/free/pain-during-sex-symptom-notes": "/free/period-pain-cramp-diary",
  "/free/painful-bowel-movements-during-period-notes": "/free/period-pain-cramp-diary",
  "/free/panic-feelings-before-period-notes": "/free/premenstrual-symptom-tracker",
  "/free/pap-smear-anxiety-visit-card": "/free/premenstrual-symptom-tracker",
  "/free/pap-smear-result-terms-card": "/free/biopsy-result-visit-notes",
  "/free/paper-fertility-chart-to-app-checklist": "/free/ovulation-fertility-awareness-kit",
  "/free/parent-teen-period-app-boundary-script": "/free/first-period-starter-kit",
  "/free/pcos-acne-hair-growth-photo-log": "/free/pcos-tracking-kit",
  "/free/pcos-doctor-appointment-question-list": "/free/pcos-tracking-kit",
  "/free/pcos-lab-results-tracker": "/free/pcos-tracking-kit",
  "/free/pcos-meal-planner-template": "/free/pcos-tracking-kit",
  "/free/pcos-meal-prep-grocery-list": "/free/pcos-tracking-kit",
  "/free/pcos-medication-supplement-change-log": "/free/pcos-tracking-kit",
  "/free/pcos-symptom-tracker": "/free/pcos-tracking-kit",
  "/free/perimenopause-appointment-prep-checklist": "/free/reproductive-visit-prep-kit",
  "/free/perimenopause-bleeding-pattern-log": "/free/perimenopause-symptom-tracker",
  "/free/perimenopause-migraine-pattern-tracker": "/free/menstrual-migraine-log",
  "/free/perimenopause-sleep-disruption-tracker": "/free/period-sleep-log",
  "/free/perimenopause-symptom-priority-sorter": "/free/perimenopause-symptom-tracker",
  "/free/perimenopause-symptoms-checklist": "/free/perimenopause-symptom-tracker",
  "/free/period-anxiety-visit-summary": "/free/premenstrual-symptom-tracker",
  "/free/period-app-data-map-worksheet": "/free/period-app-privacy-audit-kit",
  "/free/period-app-deletion-follow-up-email-templates": "/free/delete-period-data-guide",
  "/free/period-app-privacy-audit-checklist": "/free/period-app-privacy-audit-kit",
  "/free/period-app-privacy-policy-worksheet": "/free/period-app-privacy-audit-kit",
  "/free/period-at-beach-checklist": "/free/period-away-from-home-kit",
  "/free/period-at-camp-checklist": "/free/period-away-from-home-kit",
  "/free/period-at-conference-kit": "/free/period-away-from-home-kit",
  "/free/period-at-music-festival-notes": "/free/period-away-from-home-kit",
  "/free/period-at-school-dance-checklist": "/free/period-away-from-home-kit",
  "/free/period-at-water-park-notes": "/free/period-away-from-home-kit",
  "/free/period-at-work-meeting-exit-plan": "/free/period-away-from-home-kit",
  "/free/period-back-pain-tracker": "/free/period-pain-cramp-diary",
  "/free/period-blood-clot-log": "/free/heavy-period-clot-tracker",
  "/free/period-blood-on-mattress-notes": "/free/period-blood-stain-removal-guide",
  "/free/period-blood-on-sheets-laundry-guide": "/free/period-blood-stain-removal-guide",
  "/free/period-blood-stain-removal-checklist": "/free/period-blood-stain-removal-guide",
  "/free/period-brain-fog-notes": "/free/premenstrual-symptom-tracker",
  "/free/period-calculator-planning-sheet": "/free/cycle-length-calculator-kit",
  "/free/period-calendar-privacy-checklist": "/free/period-app-privacy-audit-kit",
  "/free/period-clot-and-anemia-question-list": "/free/heavy-period-clot-tracker",
  "/free/period-clot-photo-privacy-checklist": "/free/heavy-period-clot-tracker",
  "/free/period-clot-vs-miscarriage-question-list": "/free/heavy-period-clot-tracker",
  "/free/period-constipation-log": "/free/premenstrual-symptom-tracker",
  "/free/period-cramp-night-log": "/free/period-pain-cramp-diary",
  "/free/period-cramp-relief-evidence-checklist": "/free/period-pain-cramp-diary",
  "/free/period-cramps-after-workout-log": "/free/period-pain-cramp-diary",
  "/free/period-cramps-at-work-log": "/free/period-pain-cramp-diary",
  "/free/period-cravings-tracker": "/free/premenstrual-symptom-tracker",
  "/free/period-data-broker-opt-out-starter": "/free/delete-period-data-guide",
  "/free/period-data-digital-will": "/free/delete-period-data-guide",
  "/free/period-diarrhea-symptom-log": "/free/premenstrual-symptom-tracker",
  "/free/period-during-exams-school-plan": "/free/period-away-from-home-kit",
  "/free/period-emergency-kit-checklist": "/free/period-leak-and-product-kit",
  "/free/period-fatigue-bloodwork-visit-summary": "/free/premenstrual-symptom-tracker",
  "/free/period-flu-symptom-tracker": "/free/premenstrual-symptom-tracker",
  "/free/period-gas-and-bloating-log": "/free/premenstrual-symptom-tracker",
  "/free/period-kit-for-school-checklist": "/free/period-leak-and-product-kit",
  "/free/period-leak-at-school-plan": "/free/period-leak-and-product-kit",
  "/free/period-leak-at-work-plan": "/free/period-leak-and-product-kit",
  "/free/period-leak-cleanup-plan": "/free/period-leak-and-product-kit",
  "/free/period-on-a-plane-notes": "/free/period-away-from-home-kit",
  "/free/period-on-date-night-notes": "/free/period-away-from-home-kit",
  "/free/period-on-road-trip-planner": "/free/period-away-from-home-kit",
  "/free/period-on-vacation-notes": "/free/period-away-from-home-kit",
  "/free/period-on-wedding-day-plan": "/free/period-away-from-home-kit",
  "/free/period-pain-diary-template": "/free/period-pain-cramp-diary",
  "/free/period-pain-location-visit-summary": "/free/period-pain-cramp-diary",
  "/free/period-pain-medicine-question-list": "/free/period-pain-cramp-diary",
  "/free/period-pain-position-notes": "/free/period-pain-cramp-diary",
  "/free/period-poops-tracker": "/free/premenstrual-symptom-tracker",
  "/free/period-product-backup-layer-planner": "/free/period-leak-and-product-kit",
  "/free/period-product-change-visit-summary": "/free/reproductive-visit-prep-kit",
  "/free/period-product-irritation-log": "/free/period-leak-and-product-kit",
  "/free/period-product-leak-comparison-sheet": "/free/period-leak-and-product-kit",
  "/free/period-product-refill-plan": "/free/period-leak-and-product-kit",
  "/free/period-sick-day-message-template": "/free/premenstrual-symptom-tracker",
  "/free/period-sleep-disruption-visit-prep": "/free/period-sleep-log",
  "/free/period-starts-and-stops-log": "/free/abnormal-bleeding-log",
  "/free/period-symptom-tracker-printable": "/free/personal-cycle-health-record",
  "/free/period-tracker-privacy-comparison-matrix": "/free/period-app-privacy-audit-kit",
  "/free/period-travel-checklist": "/free/period-away-from-home-kit",
  "/free/period-underwear-leak-notes": "/free/period-leak-and-product-kit",
  "/free/period-uniform-backup-plan": "/free/period-away-from-home-kit",
  "/free/period-wont-stop-visit-prep": "/free/reproductive-visit-prep-kit",
  "/free/period-workout-intensity-planner": "/free/cycle-syncing-food-workout-planner",
  "/free/personal-cycle-health-record-template": "/free/personal-cycle-health-record",
  "/free/pharmacy-reproductive-health-privacy-checklist": "/free/period-app-privacy-audit-kit",
  "/free/plan-b-cycle-timeline-two-months": "/free/emergency-contraception-log",
  "/free/pmdd-appointment-prep-checklist": "/free/pmdd-tracking-kit",
  "/free/pmdd-drsp-daily-log": "/free/pmdd-tracking-kit",
  "/free/pmdd-relationship-communication-script": "/free/pmdd-tracking-kit",
  "/free/pmdd-safety-plan-template": "/free/pmdd-tracking-kit",
  "/free/pmdd-treatment-response-tracker": "/free/pmdd-tracking-kit",
  "/free/pmdd-two-cycle-symptom-tracker": "/free/pmdd-tracking-kit",
  "/free/pmdd-work-school-planning-sheet": "/free/pmdd-tracking-kit",
  "/free/post-dobbs-digital-safety-kit": "/free/post-dobbs-digital-safety-kit-hub",
  "/free/postpartum-period-return-tracker": "/free/perimenopause-symptom-tracker",
  "/free/printable-bbt-chart-one-cycle": "/free/ovulation-fertility-awareness-kit",
  "/free/public-bathroom-period-product-change-plan": "/free/period-leak-and-product-kit",
  "/free/rectal-pain-during-period-notes": "/free/period-pain-cramp-diary",
  "/free/recurrent-uti-appointment-prep-checklist": "/free/uti-urinary-symptom-tracker",
  "/free/recurrent-yeast-infection-appointment-prep": "/free/vaginal-discharge-odor-checklist",
  "/free/reproductive-health-insurance-paper-trail-map": "/free/reproductive-visit-prep-kit",
  "/free/roommate-period-boundary-script": "/free/period-at-college-dorm-kit",
  "/free/running-on-period-notes": "/free/period-away-from-home-kit",
  "/free/school-nurse-period-visit-card": "/free/reproductive-visit-prep-kit",
  "/free/severe-period-cramp-visit-summary": "/free/period-pain-cramp-diary",
  "/free/shared-bathroom-period-plan": "/free/period-at-college-dorm-kit",
  "/free/sleep-and-period-symptom-summary": "/free/period-sleep-log",
  "/free/sleep-diary-period-template": "/free/period-sleep-log",
  "/free/sports-practice-period-plan": "/free/period-away-from-home-kit",
  "/free/spotting-after-sex-log": "/free/abnormal-bleeding-log",
  "/free/spotting-instead-of-period-notes": "/free/abnormal-bleeding-log",
  "/free/st-johns-wort-birth-control-question-card": "/free/birth-control-tracking-kit",
  "/free/state-risk-scorecard": "/free/post-dobbs-digital-safety-kit-hub",
  "/free/stopping-birth-control-cycle-return-tracker": "/free/birth-control-tracking-kit",
  "/free/stress-missed-period-notes": "/free/late-missed-period-log",
  "/free/subpoena-response-template": "/free/post-dobbs-digital-safety-kit-hub",
  "/free/support-person-period-pain-note": "/free/period-pain-cramp-diary",
  "/free/swimming-on-period-plan": "/free/period-away-from-home-kit",
  "/free/switch-period-trackers-without-losing-history": "/free/delete-period-data-guide",
  "/free/tampon-leak-log": "/free/period-leak-and-product-kit",
  "/free/tampon-pain-visit-notes": "/free/period-pain-cramp-diary",
  "/free/teen-period-cramp-school-plan": "/free/period-pain-cramp-diary",
  "/free/teen-period-symptoms-doctor-visit-sheet": "/free/reproductive-visit-prep-kit",
  "/free/teen-period-tracker-setup-card": "/free/first-period-starter-kit",
  "/free/telehealth-period-visit-script": "/free/reproductive-visit-prep-kit",
  "/free/texas-louisiana-scorecard-bundle": "/free/post-dobbs-digital-safety-kit-hub",
  "/free/thyroid-heavy-period-visit-summary": "/free/heavy-period-clot-tracker",
  "/free/thyroid-irregular-period-question-list": "/free/thyroid-hormone-lab-organizer",
  "/free/thyroid-lab-result-organizer": "/free/thyroid-hormone-lab-organizer",
  "/free/thyroid-period-change-notes": "/free/thyroid-hormone-lab-organizer",
  "/free/tired-during-period-energy-log": "/free/premenstrual-symptom-tracker",
  "/free/tissue-like-period-clot-notes": "/free/heavy-period-clot-tracker",
  "/free/travel-late-period-timeline": "/free/late-missed-period-log",
  "/free/tween-period-quiz-reality-check": "/free/first-period-starter-kit",
  "/free/urinary-urgency-cycle-log": "/free/uti-urinary-symptom-tracker",
  "/free/uti-after-sex-visit-prep-checklist": "/free/uti-urinary-symptom-tracker",
  "/free/uti-during-period-symptom-log": "/free/uti-urinary-symptom-tracker",
  "/free/uti-symptom-tracker-no-diagnosis": "/free/uti-urinary-symptom-tracker",
  "/free/uti-vs-yeast-symptom-notes": "/free/vaginal-discharge-odor-checklist",
  "/free/vaginal-discharge-before-period-tracker": "/free/vaginal-discharge-odor-checklist",
  "/free/vaginal-discharge-color-odor-checklist": "/free/vaginal-discharge-odor-checklist",
  "/free/vaginal-discharge-vs-cervical-mucus-checklist": "/free/vaginal-discharge-odor-checklist",
  "/free/vaginal-dryness-before-period-notes": "/free/premenstrual-symptom-tracker",
  "/free/vaginal-itching-before-period-tracker": "/free/premenstrual-symptom-tracker",
  "/free/vaginal-odor-after-period-log": "/free/vaginal-discharge-odor-checklist",
  "/free/vulvar-burning-symptom-notes": "/free/vulvar-symptom-log",
  "/free/vulvar-irritation-product-exposure-log": "/free/vulvar-symptom-log",
  "/free/vulvar-itching-symptom-log": "/free/vulvar-symptom-log",
  "/free/vulvar-rash-skin-change-notes": "/free/vulvar-symptom-log",
  "/free/withdrawal-bleeding-birth-control-notes": "/free/emergency-contraception-log",
  "/free/work-school-before-period-impact-log": "/free/premenstrual-symptom-tracker",
  "/free/yeast-infection-symptom-log-no-diagnosis": "/free/vaginal-discharge-odor-checklist",
  "/resources/best/best-period-tracker-apps-2026-irregular-cycles": "/resources/best/best-period-tracker-apps-2026",
  "/resources/guides/switching-from-flo-privacy-guide": "/resources/guides/switching-from-flo-complete-guide",
  "/resources/privacy-in-practice/adenomyosis-data-privacy-checklist": "/resources/privacy-in-practice/protect-your-symptom-and-condition-data",
  "/resources/privacy-in-practice/after-visit-summary-period-data-checklist": "/resources/privacy-in-practice/your-medical-records-and-period-data",
  "/resources/privacy-in-practice/android-private-space-period-app-checklist": "/resources/privacy-in-practice/lock-down-period-data-on-your-phone",
  "/resources/privacy-in-practice/anonymous-period-tracking-guide": "/resources/privacy-in-practice/lock-down-period-data-on-your-phone",
  "/resources/privacy-in-practice/app-store-privacy-label-period-apps": "/resources/privacy-in-practice/lock-down-period-data-on-your-phone",
  "/resources/privacy-in-practice/audit-period-data-on-android": "/resources/privacy-in-practice/lock-down-period-data-on-your-phone",
  "/resources/privacy-in-practice/audit-period-data-on-iphone": "/resources/privacy-in-practice/lock-down-period-data-on-your-phone",
  "/resources/privacy-in-practice/birth-control-data-privacy-checklist": "/resources/privacy-in-practice/protect-your-symptom-and-condition-data",
  "/resources/privacy-in-practice/breast-imaging-result-privacy-checklist": "/resources/privacy-in-practice/your-medical-records-and-period-data",
  "/resources/privacy-in-practice/campus-period-data-privacy-checklist": "/resources/privacy-in-practice/period-tracking-privacy-for-teens-and-students",
  "/resources/privacy-in-practice/can-employer-see-period-tracker-data": "/resources/privacy-in-practice/who-can-legally-get-your-period-data",
  "/resources/privacy-in-practice/check-period-app-for-trackers": "/resources/privacy-in-practice/lock-down-period-data-on-your-phone",
  "/resources/privacy-in-practice/cycle-prediction-data-privacy-checklist": "/resources/privacy-in-practice/protect-your-symptom-and-condition-data",
  "/resources/privacy-in-practice/data-broker-exposure-check": "/resources/privacy-in-practice/who-can-legally-get-your-period-data",
  "/resources/privacy-in-practice/digestive-cycle-data-privacy-checklist": "/resources/privacy-in-practice/protect-your-symptom-and-condition-data",
  "/resources/privacy-in-practice/digital-vs-paper-period-tracking-privacy": "/resources/privacy-in-practice/lock-down-period-data-on-your-phone",
  "/resources/privacy-in-practice/emergency-contraception-data-privacy-checklist": "/resources/privacy-in-practice/protect-your-symptom-and-condition-data",
  "/resources/privacy-in-practice/endometriosis-data-privacy-checklist": "/resources/privacy-in-practice/protect-your-symptom-and-condition-data",
  "/resources/privacy-in-practice/fertility-data-privacy-handoff-sheet": "/resources/privacy-in-practice/your-medical-records-and-period-data",
  "/resources/privacy-in-practice/fibroid-data-privacy-checklist": "/resources/privacy-in-practice/protect-your-symptom-and-condition-data",
  "/resources/privacy-in-practice/first-period-data-privacy-checklist": "/resources/privacy-in-practice/period-tracking-privacy-for-teens-and-students",
  "/resources/privacy-in-practice/fitness-app-period-data-privacy-checklist": "/resources/privacy-in-practice/lock-down-period-data-on-your-phone",
  "/resources/privacy-in-practice/focus-mood-cycle-data-privacy-checklist": "/resources/privacy-in-practice/protect-your-symptom-and-condition-data",
  "/resources/privacy-in-practice/google-calendar-period-privacy-checklist": "/resources/privacy-in-practice/lock-down-period-data-on-your-phone",
  "/resources/privacy-in-practice/google-photos-locked-folder-period-screenshots": "/resources/privacy-in-practice/lock-down-period-data-on-your-phone",
  "/resources/privacy-in-practice/how-to-audit-your-phone-period-data": "/resources/privacy-in-practice/lock-down-period-data-on-your-phone",
  "/resources/privacy-in-practice/hpv-result-data-privacy-checklist": "/resources/privacy-in-practice/your-medical-records-and-period-data",
  "/resources/privacy-in-practice/insurance-eob-reproductive-health-privacy-checklist": "/resources/privacy-in-practice/your-medical-records-and-period-data",
  "/resources/privacy-in-practice/insurance-period-data-risks": "/resources/privacy-in-practice/who-can-legally-get-your-period-data",
  "/resources/privacy-in-practice/iphone-hide-period-app-privacy-checklist": "/resources/privacy-in-practice/lock-down-period-data-on-your-phone",
  "/resources/privacy-in-practice/lab-results-period-data-privacy-checklist": "/resources/privacy-in-practice/your-medical-records-and-period-data",
  "/resources/privacy-in-practice/late-period-data-privacy-checklist": "/resources/privacy-in-practice/protect-your-symptom-and-condition-data",
  "/resources/privacy-in-practice/menstrual-migraine-data-privacy-checklist": "/resources/privacy-in-practice/protect-your-symptom-and-condition-data",
  "/resources/privacy-in-practice/mychart-proxy-access-period-privacy-checklist": "/resources/privacy-in-practice/your-medical-records-and-period-data",
  "/resources/privacy-in-practice/ovarian-cyst-data-privacy-checklist": "/resources/privacy-in-practice/protect-your-symptom-and-condition-data",
  "/resources/privacy-in-practice/pap-smear-result-privacy-checklist": "/resources/privacy-in-practice/your-medical-records-and-period-data",
  "/resources/privacy-in-practice/partner-sync-privacy-checklist": "/resources/privacy-in-practice/lock-down-period-data-on-your-phone",
  "/resources/privacy-in-practice/patient-portal-period-data-privacy-checklist": "/resources/privacy-in-practice/your-medical-records-and-period-data",
  "/resources/privacy-in-practice/pcos-data-sharing-privacy-checklist": "/resources/privacy-in-practice/protect-your-symptom-and-condition-data",
  "/resources/privacy-in-practice/pcos-symptom-documentation-insurance": "/resources/privacy-in-practice/your-medical-records-and-period-data",
  "/resources/privacy-in-practice/perimenopause-data-privacy-checklist": "/resources/privacy-in-practice/protect-your-symptom-and-condition-data",
  "/resources/privacy-in-practice/period-anxiety-data-privacy-checklist": "/resources/privacy-in-practice/protect-your-symptom-and-condition-data",
  "/resources/privacy-in-practice/period-app-data-criminal-investigation-risk": "/resources/privacy-in-practice/who-can-legally-get-your-period-data",
  "/resources/privacy-in-practice/period-app-location-permission-audit": "/resources/privacy-in-practice/lock-down-period-data-on-your-phone",
  "/resources/privacy-in-practice/period-app-notification-privacy": "/resources/privacy-in-practice/lock-down-period-data-on-your-phone",
  "/resources/privacy-in-practice/period-clot-data-privacy-checklist": "/resources/privacy-in-practice/protect-your-symptom-and-condition-data",
  "/resources/privacy-in-practice/period-cramp-data-privacy-checklist": "/resources/privacy-in-practice/protect-your-symptom-and-condition-data",
  "/resources/privacy-in-practice/period-data-after-breakup-divorce": "/resources/privacy-in-practice/who-can-legally-get-your-period-data",
  "/resources/privacy-in-practice/period-data-custody-divorce": "/resources/privacy-in-practice/who-can-legally-get-your-period-data",
  "/resources/privacy-in-practice/period-data-for-endometriosis-diagnosis": "/resources/privacy-in-practice/your-medical-records-and-period-data",
  "/resources/privacy-in-practice/period-data-in-stalking-cases": "/resources/privacy-in-practice/who-can-legally-get-your-period-data",
  "/resources/privacy-in-practice/period-flow-change-data-privacy-checklist": "/resources/privacy-in-practice/protect-your-symptom-and-condition-data",
  "/resources/privacy-in-practice/period-flu-data-privacy-checklist": "/resources/privacy-in-practice/protect-your-symptom-and-condition-data",
  "/resources/privacy-in-practice/period-leak-photo-location-privacy-checklist": "/resources/privacy-in-practice/lock-down-period-data-on-your-phone",
  "/resources/privacy-in-practice/period-pain-location-data-privacy-checklist": "/resources/privacy-in-practice/protect-your-symptom-and-condition-data",
  "/resources/privacy-in-practice/period-photo-hidden-album-privacy-checklist": "/resources/privacy-in-practice/lock-down-period-data-on-your-phone",
  "/resources/privacy-in-practice/period-product-symptom-data-privacy-checklist": "/resources/privacy-in-practice/protect-your-symptom-and-condition-data",
  "/resources/privacy-in-practice/period-tracker-data-fertility-clinic": "/resources/privacy-in-practice/who-can-legally-get-your-period-data",
  "/resources/privacy-in-practice/period-tracker-data-insurance-discrimination": "/resources/privacy-in-practice/who-can-legally-get-your-period-data",
  "/resources/privacy-in-practice/period-tracker-privacy-audit-parents": "/resources/privacy-in-practice/period-tracking-privacy-for-teens-and-students",
  "/resources/privacy-in-practice/period-tracking-abroad-different-laws": "/resources/privacy-in-practice/who-can-legally-get-your-period-data",
  "/resources/privacy-in-practice/period-tracking-and-domestic-violence-safety": "/resources/privacy-in-practice/who-can-legally-get-your-period-data",
  "/resources/privacy-in-practice/period-tracking-data-for-doctor-appointments": "/resources/privacy-in-practice/your-medical-records-and-period-data",
  "/resources/privacy-in-practice/period-tracking-on-shared-phone": "/resources/privacy-in-practice/lock-down-period-data-on-your-phone",
  "/resources/privacy-in-practice/period-tracking-workplace-accommodation": "/resources/privacy-in-practice/who-can-legally-get-your-period-data",
  "/resources/privacy-in-practice/pmdd-data-privacy-checklist": "/resources/privacy-in-practice/protect-your-symptom-and-condition-data",
  "/resources/privacy-in-practice/pms-body-data-privacy-checklist": "/resources/privacy-in-practice/protect-your-symptom-and-condition-data",
  "/resources/privacy-in-practice/printable-health-template-privacy-checklist": "/resources/privacy-in-practice/lock-down-period-data-on-your-phone",
  "/resources/privacy-in-practice/reusable-period-product-data-privacy-checklist": "/resources/privacy-in-practice/protect-your-symptom-and-condition-data",
  "/resources/privacy-in-practice/samsung-secure-folder-period-app-checklist": "/resources/privacy-in-practice/lock-down-period-data-on-your-phone",
  "/resources/privacy-in-practice/school-device-period-tracking-risks": "/resources/privacy-in-practice/period-tracking-privacy-for-teens-and-students",
  "/resources/privacy-in-practice/school-health-apps-period-tracking-teens": "/resources/privacy-in-practice/period-tracking-privacy-for-teens-and-students",
  "/resources/privacy-in-practice/school-phone-period-tracking-privacy-checklist": "/resources/privacy-in-practice/period-tracking-privacy-for-teens-and-students",
  "/resources/privacy-in-practice/secure-period-data-backup": "/resources/privacy-in-practice/lock-down-period-data-on-your-phone",
  "/resources/privacy-in-practice/sex-pain-and-bleeding-data-privacy-checklist": "/resources/privacy-in-practice/protect-your-symptom-and-condition-data",
  "/resources/privacy-in-practice/shared-apple-id-period-privacy-checklist": "/resources/privacy-in-practice/lock-down-period-data-on-your-phone",
  "/resources/privacy-in-practice/sleep-cycle-data-privacy-checklist": "/resources/privacy-in-practice/protect-your-symptom-and-condition-data",
  "/resources/privacy-in-practice/special-event-period-data-privacy-checklist": "/resources/privacy-in-practice/protect-your-symptom-and-condition-data",
  "/resources/privacy-in-practice/teen-patient-portal-period-privacy-checklist": "/resources/privacy-in-practice/your-medical-records-and-period-data",
  "/resources/privacy-in-practice/teen-period-app-notification-privacy-check": "/resources/privacy-in-practice/lock-down-period-data-on-your-phone",
  "/resources/privacy-in-practice/teen-period-app-privacy-checklist": "/resources/privacy-in-practice/period-tracking-privacy-for-teens-and-students",
  "/resources/privacy-in-practice/telehealth-period-tracking-data-risks": "/resources/privacy-in-practice/your-medical-records-and-period-data",
  "/resources/privacy-in-practice/thyroid-iron-lab-privacy-checklist": "/resources/privacy-in-practice/your-medical-records-and-period-data",
  "/resources/privacy-in-practice/travel-period-data-privacy-checklist": "/resources/privacy-in-practice/who-can-legally-get-your-period-data",
  "/resources/privacy-in-practice/turn-off-period-data-apple-health": "/resources/privacy-in-practice/lock-down-period-data-on-your-phone",
  "/resources/privacy-in-practice/turn-off-period-data-health-connect": "/resources/privacy-in-practice/lock-down-period-data-on-your-phone",
  "/resources/privacy-in-practice/uti-and-bladder-data-privacy-checklist": "/resources/privacy-in-practice/protect-your-symptom-and-condition-data",
  "/resources/privacy-in-practice/vaginal-discharge-data-privacy-checklist": "/resources/privacy-in-practice/protect-your-symptom-and-condition-data",
  "/resources/privacy-in-practice/verify-on-device-storage-claims": "/resources/privacy-in-practice/lock-down-period-data-on-your-phone",
  "/resources/privacy-in-practice/vpn-period-tracker-setup": "/resources/privacy-in-practice/lock-down-period-data-on-your-phone",
  "/resources/privacy-in-practice/vulvar-symptom-data-privacy-checklist": "/resources/privacy-in-practice/protect-your-symptom-and-condition-data",
  "/resources/privacy-in-practice/wearable-devices-period-data": "/resources/privacy-in-practice/protect-your-symptom-and-condition-data",
  "/resources/privacy-in-practice/what-subpoenas-actually-request": "/resources/privacy-in-practice/who-can-legally-get-your-period-data",
};

const legacyRouteBaseRedirects: Record<string, string> = {
  "/alternatives": "/compare/alternatives",
  "/comparisons": "/compare/versus",
  "/guides": "/resources/guides",
  "/listicles": "/resources/best",
  "/pricing-breakdowns": "/compare/pricing",
  "/reproductive-privacy-state-pages": "/period-tracker-privacy",
};

const canonicalHostname = "floriva.app";
const wwwHostname = "www.floriva.app";

function isDocumentRequest(request: Request): boolean {
  if (request.method !== "GET" && request.method !== "HEAD") {
    return false;
  }

  const pathname = new URL(request.url).pathname;
  const lastSegment = pathname.split("/").filter(Boolean).at(-1) ?? "";

  if (lastSegment.includes(".")) {
    return false;
  }

  const accept = request.headers.get("accept") ?? "";

  return (
    accept === "" ||
    accept.includes("*/*") ||
    accept.includes("text/html") ||
    accept.includes("application/xhtml+xml")
  );
}

function hasAssetLikePath(pathname: string): boolean {
  const lastSegment = pathname.split("/").filter(Boolean).at(-1) ?? "";

  return lastSegment.includes(".");
}

function isFunctionOwnedDocumentRequest(request: Request): boolean {
  const pathname = new URL(request.url).pathname;

  return pathname.startsWith("/api/") || pathname.startsWith("/downloads/");
}

function isFunctionOwnedPath(pathname: string): boolean {
  return pathname.startsWith("/api/") || pathname.startsWith("/downloads/") || pathname.startsWith("/ph/");
}

function buildRedirect(requestUrl: URL, pathname: string): Response {
  const redirectUrl = new URL(requestUrl);
  redirectUrl.pathname = pathname;

  return Response.redirect(redirectUrl.toString(), 301);
}

function buildCanonicalHostRedirect(requestUrl: URL, pathname = requestUrl.pathname): Response {
  const redirectUrl = new URL(requestUrl);
  redirectUrl.protocol = "https:";
  redirectUrl.hostname = canonicalHostname;
  redirectUrl.pathname = pathname;

  return Response.redirect(redirectUrl.toString(), 301);
}

function normalizeRedirectPathname(pathname: string): string {
  return pathname === "/" ? "/" : pathname.replace(/\/+$/, "") || "/";
}

// A prefix rule can land on a path that is itself an exact-redirect key - e.g.
// /listicles/<slug> rewrites to /resources/best/<slug>, which the consolidation
// then redirects again. Returning after one pass made the browser walk that as
// two 301s, which leaks link equity and costs a round trip. Resolving to a
// fixed point collapses it to a single redirect. The bound stops a cyclic rule
// from hanging the edge; at the cap we return the best path found so far, which
// is still a valid (if unfinished) redirect rather than a 500.
const MAX_LEGACY_REDIRECT_HOPS = 4;

function resolveLegacyRedirectPath(pathname: string): string | null {
  let current = pathname;
  let resolved: string | null = null;

  for (let hop = 0; hop < MAX_LEGACY_REDIRECT_HOPS; hop += 1) {
    const next = resolveLegacyRedirectPathOnce(current);

    if (next === null || next === current) {
      break;
    }

    resolved = next;
    current = next;
  }

  return resolved;
}

function resolveLegacyRedirectPathOnce(pathname: string): string | null {
  const exactRedirect = legacyExactRedirects[pathname];

  if (exactRedirect) {
    return exactRedirect;
  }

  for (const [legacyBase, canonicalBase] of Object.entries(legacyRouteBaseRedirects)) {
    if (pathname === legacyBase || pathname.startsWith(`${legacyBase}/`)) {
      return `${canonicalBase}${pathname.slice(legacyBase.length)}`;
    }
  }

  return null;
}

function resolveCanonicalPathnameRedirect(requestUrl: URL): string | null {
  if (requestUrl.pathname === "/sitemap-0.xml") {
    return "/sitemap.xml";
  }

  if (hasAssetLikePath(requestUrl.pathname) || isFunctionOwnedPath(requestUrl.pathname)) {
    return null;
  }

  const normalizedPathname = normalizeRedirectPathname(requestUrl.pathname);
  const legacyRedirectPath = resolveLegacyRedirectPath(normalizedPathname);

  if (legacyRedirectPath) {
    return legacyRedirectPath;
  }

  if (normalizedPathname !== requestUrl.pathname) {
    return normalizedPathname;
  }

  return null;
}

export function resolveRequestRedirect(request: Request): Response | null {
  if (request.method !== "GET" && request.method !== "HEAD") {
    return null;
  }

  const requestUrl = new URL(request.url);
  const canonicalPathnameRedirect = resolveCanonicalPathnameRedirect(requestUrl);

  if (requestUrl.hostname === wwwHostname) {
    return buildCanonicalHostRedirect(
      requestUrl,
      canonicalPathnameRedirect ?? requestUrl.pathname,
    );
  }

  if (canonicalPathnameRedirect) {
    return buildRedirect(requestUrl, canonicalPathnameRedirect);
  }

  return null;
}

export function shouldServeSpaShell(pathname: string): boolean {
  return !hasAssetLikePath(pathname) && !isFunctionOwnedPath(pathname);
}

export function shouldTransformDocumentResponse(
  request: Request,
  response: Response,
): boolean {
  if (!isDocumentRequest(request) || isFunctionOwnedDocumentRequest(request)) {
    return false;
  }

  const contentType = response.headers.get("content-type") ?? "";

  return contentType.includes("text/html") || contentType.includes("application/octet-stream");
}

function removeElement(element: Element): void {
  element.remove();
}

function buildSeoHeadPayload(pageMeta: ReturnType<typeof resolvePageMeta>, documentTitle: string, canonicalUrl: string): string {
  const ogImageUrl = pageMeta.ogImage;
  const robots = robotsDirective(pageMeta.canonicalPath, pageMeta.noIndex);
  const ogType = pageMeta.pageType === "content" ? "article" : "website";
  const jsonLdBlocks = buildPageJsonLd(pageMeta);
  const jsonLdPayload =
    jsonLdBlocks.length > 0
      ? `<script type="application/ld+json" data-seo-jsonld-edge>${serializeJsonLd(jsonLdBlocks)}</script>`
      : "";

  return [
    `<meta name="description" content="${escapeHtmlAttribute(pageMeta.description)}">`,
    `<meta name="robots" content="${robots}">`,
    `<meta property="og:title" content="${escapeHtmlAttribute(documentTitle)}">`,
    `<meta property="og:description" content="${escapeHtmlAttribute(pageMeta.description)}">`,
    `<meta property="og:site_name" content="${escapeHtmlAttribute(siteSeo.name)}">`,
    `<meta property="og:type" content="${ogType}">`,
    `<meta property="og:url" content="${escapeHtmlAttribute(canonicalUrl)}">`,
    `<meta property="og:image" content="${escapeHtmlAttribute(ogImageUrl)}">`,
    `<meta property="og:image:width" content="1200">`,
    `<meta property="og:image:height" content="630">`,
    `<meta property="og:image:type" content="image/png">`,
    `<meta name="twitter:card" content="summary_large_image">`,
    `<meta name="twitter:title" content="${escapeHtmlAttribute(documentTitle)}">`,
    `<meta name="twitter:description" content="${escapeHtmlAttribute(pageMeta.description)}">`,
    `<meta name="twitter:image" content="${escapeHtmlAttribute(ogImageUrl)}">`,
    `<link rel="canonical" href="${escapeHtmlAttribute(canonicalUrl)}">`,
    jsonLdPayload,
  ]
    .filter(Boolean)
    .join("");
}

function escapeHtmlAttribute(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/"/g, "&quot;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

export function htmlDocumentHeaders(headers: Headers): Headers {
  const nextHeaders = new Headers(headers);
  nextHeaders.set("Content-Type", "text/html; charset=utf-8");

  return nextHeaders;
}

function transformDocument(response: Response, request: Request): Response {
  if (!shouldTransformDocumentResponse(request, response)) {
    return response;
  }

  const pageMeta = resolvePageMeta(new URL(request.url).pathname);
  const documentTitle = buildDocumentTitle(pageMeta.title);
  const canonicalUrl = buildCanonicalUrl(pageMeta.canonicalPath);
  const seoHeadPayload = buildSeoHeadPayload(pageMeta, documentTitle, canonicalUrl);
  const rewritten = new HTMLRewriter()
    .on("title", {
      element(element) {
        element.setInnerContent(documentTitle, { html: false });
      },
    })
    .on('meta[name="description"]', {
      element: removeElement,
    })
    .on('meta[name="robots"]', {
      element: removeElement,
    })
    .on('meta[property="og:title"]', {
      element: removeElement,
    })
    .on('meta[property="og:description"]', {
      element: removeElement,
    })
    .on('meta[property="og:site_name"]', {
      element: removeElement,
    })
    .on('meta[property="og:type"]', {
      element: removeElement,
    })
    .on('meta[property="og:url"]', {
      element: removeElement,
    })
    .on('meta[property="og:image"]', {
      element: removeElement,
    })
    .on('meta[property="og:image:width"]', {
      element: removeElement,
    })
    .on('meta[property="og:image:height"]', {
      element: removeElement,
    })
    .on('meta[property="og:image:type"]', {
      element: removeElement,
    })
    .on('meta[name="twitter:card"]', {
      element: removeElement,
    })
    .on('meta[name="twitter:title"]', {
      element: removeElement,
    })
    .on('meta[name="twitter:description"]', {
      element: removeElement,
    })
    .on('meta[name="twitter:image"]', {
      element: removeElement,
    })
    .on('link[rel="canonical"]', {
      element: removeElement,
    })
    .on('script[type="application/ld+json"]', {
      element: removeElement,
    })
    .on("head", {
      element(element) {
        element.append(seoHeadPayload, { html: true });
      },
    })
    .transform(response);

  const headers = htmlDocumentHeaders(rewritten.headers);

  if (pageMeta.status === 404) {
    return new Response(rewritten.body, {
      headers,
      status: 404,
      statusText: rewritten.statusText,
    });
  }

  return new Response(rewritten.body, {
    headers,
    status: rewritten.status,
    statusText: rewritten.statusText,
  });
}

function rejectAssetFallback(response: Response, request: Request): Response {
  const pathname = new URL(request.url).pathname;
  const contentType = response.headers.get("content-type") ?? "";

  if (hasAssetLikePath(pathname) && response.status === 200 && contentType.includes("text/html")) {
    return new Response("Not found", {
      headers: {
        "Content-Type": "text/plain; charset=utf-8",
      },
      status: 404,
    });
  }

  return response;
}

export async function resolveDocumentResponse(
  initialResponse: Response,
  context: EventContext<EdgeEnv, string, EdgeData>,
): Promise<Response> {
  const pathname = new URL(context.request.url).pathname;

  if (!isDocumentRequest(context.request) || !shouldServeSpaShell(pathname)) {
    return initialResponse;
  }

  const location = initialResponse.headers.get("Location");
  const assetDirectoryRedirect =
    initialResponse.status === 308 &&
    Boolean(location) &&
    new URL(location!, context.request.url).pathname === `${normalizeRedirectPathname(pathname)}/`;

  if (initialResponse.status !== 404 && !assetDirectoryRedirect) {
    return initialResponse;
  }

  const pageMeta = resolvePageMeta(pathname);
  const assets = context.env.ASSETS;

  if (!assets) {
    return initialResponse;
  }

  const assetPath = assetDirectoryRedirect
    ? `${normalizeRedirectPathname(pathname)}/index.html`
    : "/index.html";

  // Pages serves 404.html for unknown document requests. For client-routed paths,
  // fetch the SPA shell directly from static assets so React can render the route.
  const shellRequest = new Request(new URL(assetPath, context.request.url), {
    headers: context.request.headers,
    method: "GET",
  });
  const shellResponse = await assets.fetch(shellRequest);

  return new Response(shellResponse.body, {
    headers: shellResponse.headers,
    status: pageMeta.status,
    statusText: shellResponse.statusText,
  });
}

export const handleSeoRequest: PagesFunction<EdgeEnv, string, EdgeData> = async (
  context,
) => {
  const redirectResponse = resolveRequestRedirect(context.request);

  if (redirectResponse) {
    return redirectResponse;
  }

  return runWithEdgeSentry(context, async (response) => {
    const resolvedResponse = await resolveDocumentResponse(response, context);
    const assetSafeResponse = rejectAssetFallback(resolvedResponse, context.request);
    return transformDocument(assetSafeResponse, context.request);
  });
};

export const onRequest: PagesFunction<EdgeEnv, string, EdgeData> = async (context) => {
  const redirectResponse = resolveRequestRedirect(context.request);

  if (redirectResponse) {
    return redirectResponse;
  }

  return context.next();
};
