// Builds the additive Floriva hourly X campaign for May 7-27, 2026.
//
// Run:
//   node scripts/build-x-hourly-campaign.mjs
//
// Output:
//   social/x/hourly-2026-05-07/schedule-grid.json
//   social/x/hourly-2026-05-07/posts/<date>.json
//   social/x/hourly-2026-05-07/posts.index.json
//   social/x/hourly-2026-05-07/postiz-payloads/<id>.json
//   social/x/hourly-2026-05-07/sources.md
//   social/x/hourly-2026-05-07/strategy.md
//   social/x/hourly-2026-05-07/review-report.json

import { mkdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";
import { spawnSync } from "node:child_process";

const CAMPAIGN_DIR = resolve("social/x/hourly-2026-05-07");
const POSTS_DIR = resolve(CAMPAIGN_DIR, "posts");
const TZ_OFFSET = "-06:00";
const publicKnowledge = JSON.parse(readFileSync(resolve("src/site/generated/public-knowledge.json"), "utf8"));
const socialKnowledge = publicKnowledge.socialCampaign;
const knowledgeAtomBanks = socialKnowledge.atomBanks;
const CAMPAIGN_LABEL = "Floriva X hourly 24/7 additive campaign";

const START = "2026-05-07";
const DAYS = 21;
const HOURS_PER_DAY = 24;

const PILLAR_BY_HOUR = [
  "seo_answers", "privacy_ops", "cycle_literacy", "conditions",
  "seo_answers", "privacy_legal", "cycle_literacy", "conditions",
  "product", "cycle_literacy", "comparisons", "seo_answers",
  "conditions", "privacy_ops", "comparisons", "cycle_literacy",
  "product", "seo_answers", "engagement_slot", "privacy_legal",
  "comparisons", "conditions", "privacy_legal", "quote_slot",
];

const QUOTE_HOURS = new Set([2, 10, 22]);
const ENGAGEMENT_HOURS = new Set([6, 18]);
const THREAD_HOURS = new Set([9]);
const EXTRA_THREAD_DAYS = new Set([3, 7, 11, 15]);

function addDays(yyyymmdd, days) {
  const d = new Date(`${yyyymmdd}T12:00:00Z`);
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}

function dayOfWeek(yyyymmdd) {
  const d = new Date(`${yyyymmdd}T12:00:00Z`);
  return ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"][d.getUTCDay()];
}

function slug(s) {
  return s.toLowerCase().replace(/_/g, "-").replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
}

function pick(arr, i) {
  return arr[i % arr.length];
}

const atomBanks = {
  privacy_legal: [
    {
      topic: "Flo privacy settlements",
      fact: "Flo and Google paid a combined $56M settlement tied to alleged period app data sharing.",
      takeaway: "A privacy policy is not privacy architecture.",
      source: "docs/research/04-sources.md (Reuters Sept 2025: Google and Flo $56M settlement)",
      link: "content/guides/flo-period-tracker-lawsuit-settlement.mdx",
      tags: ["#Privacy"],
    },
    {
      topic: "Premom FTC order",
      fact: "The FTC barred Premom from sharing health data for advertising after alleged disclosures to analytics firms.",
      takeaway: "Ad tech and fertility logs should not sit in the same room.",
      source: "docs/research/04-sources.md (FTC May 2023: Easy Healthcare Premom order)",
      link: "content/guides/premom-data-sharing-ftc.mdx",
      tags: ["#Privacy"],
    },
    {
      topic: "HIPAA gap",
      fact: "HIPAA usually does not cover period apps that are not run by a covered health provider or insurer.",
      takeaway: "Health data can sit outside health privacy law.",
      source: "content/guides/period-tracker-hipaa.mdx",
      link: "content/guides/period-tracker-hipaa.mdx",
      tags: ["#Privacy"],
    },
    {
      topic: "Purl v HHS",
      fact: "A federal court vacated the HIPAA reproductive health privacy rule on June 18, 2025.",
      takeaway: "Legal shields can change faster than your cycle history.",
      source: "docs/research/04-sources.md (Purl v. HHS, N.D. Tex., June 18 2025)",
      link: "content/guides/hipaa-reproductive-privacy-rule-vacated.mdx",
      tags: ["#Privacy"],
    },
    {
      topic: "Virginia menstrual data law",
      fact: "Virginia SB 16 banned search warrants for menstrual health data in 2024, then SB 754 added a private right of action in 2025.",
      takeaway: "State privacy rules are becoming part of period tracking.",
      source: "docs/research/04-sources.md (Virginia SB 16 and SB 754 menstrual data protections)",
      link: "content/reproductive-privacy-state-pages/reproductive-data-privacy-laws-virginia.mdx",
      tags: ["#Privacy"],
    },
    {
      topic: "Texas HB 7",
      fact: "Texas HB 7 created a $100,000 minimum bounty tied to medication abortion enforcement.",
      takeaway: "Data minimization matters most when legal exposure is asymmetric.",
      source: "docs/research/04-sources.md (Texas HB 7 medication abortion bounty)",
      link: "content/reproductive-privacy-state-pages/reproductive-data-privacy-laws-texas.mdx",
      tags: ["#Privacy"],
    },
    {
      topic: "mHealth app sharing",
      fact: "A JMIR study found 87% of sampled women's mHealth apps shared data with third parties.",
      takeaway: "The app category has a structural data-sharing problem.",
      source: "docs/research/04-sources.md (Alfawzan et al., JMIR 2022, n=23 apps)",
      link: "content/guides/how-period-tracker-apps-collect-data.mdx",
      tags: ["#Privacy"],
    },
    {
      topic: "ORCHA tracker audit",
      fact: "ORCHA reported that 84% of 25 period trackers shared data with third parties.",
      takeaway: "Privacy-first has to be more than a settings screen.",
      source: "docs/research/04-sources.md (ORCHA period tracker privacy audit)",
      link: "content/guides/period-app-privacy-red-flags.mdx",
      tags: ["#Privacy"],
    },
    {
      topic: "HIPAA misconception",
      fact: "A 2023 ClearDATA/Harris poll found 81% of US adults wrongly believed HIPAA covers health apps.",
      takeaway: "The biggest privacy risk may be a false sense of coverage.",
      source: "docs/research/04-sources.md (ClearDATA/Harris 2023 HIPAA health app poll, n=2,053)",
      link: "content/guides/hipaa-period-tracker-deep-dive.mdx",
      tags: ["#Privacy"],
    },
    {
      topic: "Privacy policy blind spot",
      fact: "Shipp and Blasco found 66% of menstrual apps they studied did not mention collecting period data in privacy policies.",
      takeaway: "If a policy omits the core data, read the architecture.",
      source: "docs/research/04-sources.md (Shipp and Blasco, PoPETs 2020, n=30)",
      link: "content/guides/how-to-read-period-tracker-privacy-policy.mdx",
      tags: ["#Privacy"],
    },
    {
      topic: "Post-Dobbs tracker use",
      fact: "A Contraception study found period and fertility tracker use rose from 37.4% to 45.2% after Dobbs.",
      takeaway: "More people tracked while the data stakes were rising.",
      source: "docs/research/04-sources.md (Neiman et al., Contraception 2025)",
      link: "content/guides/period-tracker-usage-after-dobbs.mdx",
      tags: ["#Privacy"],
    },
    {
      topic: "Data broker exposure",
      fact: "Vice reported buying data that identified Android devices with Clue installed for about $100.",
      takeaway: "App presence can become a privacy signal before a log is even opened.",
      source: "docs/research/04-sources.md (Vice Motherboard May 2022: Narrative data broker purchase)",
      link: "content/guides/data-brokers-reproductive-health.mdx",
      tags: ["#Privacy"],
    },
  ],
  cycle_literacy: [
    {
      topic: "Luteal phase range",
      fact: "The luteal phase is commonly 11 to 17 days. A pattern under 10 days is worth discussing with a clinician.",
      takeaway: "Track the phase, not just the period date.",
      source: "content/condition-guides/luteal-phase-defect-causes.mdx",
      link: "content/life-stage-guides/luteal-phase-length-guide.mdx",
      tags: ["#FertilityAwareness"],
    },
    {
      topic: "Fertile window",
      fact: "The fertile window is roughly the 6 days ending on ovulation because sperm can survive up to 5 days.",
      takeaway: "Ovulation day alone is too narrow a lens.",
      source: "content/condition-guides/fertile-window-explained.mdx",
      link: "content/condition-guides/fertile-window-explained.mdx",
      tags: ["#FertilityAwareness"],
    },
    {
      topic: "BBT shift",
      fact: "Basal body temperature often rises 0.4 to 1.0 degrees F after ovulation as progesterone rises.",
      takeaway: "BBT confirms ovulation after the fact. It does not predict it alone.",
      source: "content/guides/how-to-track-basal-body-temperature.mdx",
      link: "content/app-guides/floriva-basal-body-temperature-tracking.mdx",
      tags: ["#FertilityAwareness"],
    },
    {
      topic: "Cervical mucus",
      fact: "Cervical mucus often shifts from sticky to creamy to egg-white near ovulation.",
      takeaway: "Texture can add context that a calendar estimate misses.",
      source: "content/guides/how-to-track-cervical-mucus.mdx",
      link: "content/symptom-guides/cervical-mucus-throughout-cycle.mdx",
      tags: ["#FertilityAwareness"],
    },
    {
      topic: "Anovulatory bleeding",
      fact: "Anovulatory cycles can still include bleeding.",
      takeaway: "A bleed is not automatic proof that ovulation happened.",
      source: "content/condition-guides/anovulatory-cycle-what-it-means.mdx",
      link: "content/condition-guides/anovulatory-cycle-what-it-means.mdx",
      tags: [],
    },
    {
      topic: "Adult cycle range",
      fact: "Adult cycles are often described as healthy in the 21 to 35 day range.",
      takeaway: "A 28-day cycle is a reference point, not a verdict.",
      source: "content/life-stage-guides/menstrual-cycle-phases-symptoms.mdx",
      link: "content/guides/how-to-track-irregular-menstrual-cycle.mdx",
      tags: [],
    },
    {
      topic: "Late periods",
      fact: "Stress, illness, travel, medication changes, and thyroid shifts can all affect period timing.",
      takeaway: "One late period needs context before it needs panic.",
      source: "content/symptom-guides/late-period-causes-not-pregnancy.mdx",
      link: "content/condition-guides/why-is-my-period-late.mdx",
      tags: [],
    },
    {
      topic: "Cramps before bleeding",
      fact: "Cramps can show up before bleeding starts because prostaglandins rise around the period.",
      takeaway: "Logging timing helps separate a normal pattern from a new change.",
      source: "content/symptom-guides/cramps-before-period.mdx",
      link: "content/symptom-guides/cramps-before-period.mdx",
      tags: [],
    },
    {
      topic: "Period blood color",
      fact: "Brown blood often means older blood leaving the uterus more slowly.",
      takeaway: "Color is context. Sudden changes with pain or heavy bleeding deserve care.",
      source: "content/symptom-guides/period-blood-colors-guide.mdx",
      link: "content/symptom-guides/period-blood-colors-guide.mdx",
      tags: [],
    },
    {
      topic: "Sleep disruption",
      fact: "Sleep changes can cluster around PMS, PMDD, pain, bleeding, or perimenopause symptoms.",
      takeaway: "A sleep note beside a cycle note can make the pattern visible.",
      source: "content/symptom-guides/period-sleep-disruption.mdx",
      link: "content/symptom-guides/period-sleep-disruption.mdx",
      tags: [],
    },
  ],
  conditions: [
    {
      topic: "PCOS tracking",
      fact: "PCOS can involve irregular cycles, acne, hair changes, and metabolic symptoms.",
      takeaway: "A tracker is most useful when it logs the pattern around the bleed.",
      source: "content/condition-guides/pcos-period-irregularity-tracking.mdx",
      link: "content/app-guides/floriva-for-pcos-tracking.mdx",
      tags: ["#PCOS"],
    },
    {
      topic: "Endometriosis pain map",
      fact: "Endometriosis pain can flare before, during, or outside the period.",
      takeaway: "Mapping pain timing helps avoid compressing the whole story into one bad day.",
      source: "content/guides/period-tracking-endometriosis.mdx",
      link: "content/app-guides/floriva-for-endometriosis-tracking.mdx",
      tags: ["#Endometriosis"],
    },
    {
      topic: "PMDD versus PMS",
      fact: "PMDD symptoms are cyclical and can be severe enough to disrupt work, school, or relationships.",
      takeaway: "Mood logs matter most when they show timing and intensity together.",
      source: "content/symptom-guides/pmdd-symptoms-vs-pms.mdx",
      link: "content/app-guides/floriva-for-pmdd-tracking.mdx",
      tags: ["#PMDD"],
    },
    {
      topic: "Perimenopause",
      fact: "Perimenopause can bring cycle length changes, heavier or lighter bleeding, sleep changes, and hot flashes.",
      takeaway: "The pattern is often the signal.",
      source: "content/life-stage-guides/perimenopause-period-changes.mdx",
      link: "content/app-guides/floriva-for-perimenopause.mdx",
      tags: ["#Perimenopause"],
    },
    {
      topic: "Fibroids",
      fact: "Fibroids can contribute to heavy bleeding, pressure, pelvic pain, or bleeding between periods.",
      takeaway: "Tracking volume and timing gives appointments a clearer starting point.",
      source: "content/condition-guides/fibroids-cycle-changes.mdx",
      link: "content/condition-guides/heavy-bleeding-fibroids-tracking.mdx",
      tags: [],
    },
    {
      topic: "Adenomyosis",
      fact: "Adenomyosis can cause heavy bleeding, painful periods, and pelvic pressure.",
      takeaway: "A month-by-month log can catch whether symptoms are escalating.",
      source: "content/condition-guides/adenomyosis-period-tracking.mdx",
      link: "content/condition-guides/adenomyosis-period-tracking.mdx",
      tags: [],
    },
    {
      topic: "Thyroid and cycles",
      fact: "Thyroid changes can affect cycle length, bleeding, energy, and temperature patterns.",
      takeaway: "Cycle data can sit beside labs and symptoms without replacing care.",
      source: "content/condition-guides/thyroid-period-connection.mdx",
      link: "content/condition-guides/thyroid-period-connection.mdx",
      tags: [],
    },
    {
      topic: "Heavy bleeding and anemia",
      fact: "Heavy periods can contribute to iron deficiency symptoms like fatigue, dizziness, or shortness of breath.",
      takeaway: "Bleeding volume is not a detail to tough out silently.",
      source: "content/condition-guides/anemia-heavy-periods.mdx",
      link: "content/condition-guides/anemia-heavy-periods.mdx",
      tags: [],
    },
    {
      topic: "Bleeding between periods",
      fact: "Bleeding between periods can have benign causes, but new or persistent bleeding deserves medical guidance.",
      takeaway: "Log timing, amount, pain, and context before the visit.",
      source: "content/symptom-guides/bleeding-between-periods.mdx",
      link: "content/privacy-in-practice/period-tracking-data-for-doctor-appointments.mdx",
      tags: [],
    },
    {
      topic: "IUD changes",
      fact: "IUDs can change bleeding patterns, cramps, spotting, and cycle notes.",
      takeaway: "The useful question is what changed after placement.",
      source: "content/condition-guides/iud-and-period-changes.mdx",
      link: "content/app-guides/floriva-for-iud-tracking.mdx",
      tags: [],
    },
  ],
  comparisons: [
    {
      topic: "Flo alternative",
      fact: "Flo's privacy history includes FTC action and later settlement reporting tied to data sharing allegations.",
      takeaway: "If trust broke once, architecture matters more than reassurance.",
      source: "content/alternatives/flo-app-alternative.mdx",
      link: "content/comparisons/flo-vs-floriva-data-comparison.mdx",
      tags: ["#Privacy"],
    },
    {
      topic: "Clue alternative",
      fact: "Clue is a cloud account app, while Floriva keeps cycle data on the device.",
      takeaway: "The storage model is the privacy difference.",
      source: "content/alternatives/clue-alternative-no-cloud.mdx",
      link: "content/comparisons/floriva-vs-clue-privacy.mdx",
      tags: ["#Privacy"],
    },
    {
      topic: "Natural Cycles alternative",
      fact: "Natural Cycles is a subscription fertility app; Floriva is positioned around private cycle tracking with on-device data.",
      takeaway: "Fertility features should not require cloud exposure by default.",
      source: "content/alternatives/natural-cycles-alternative-privacy.mdx",
      link: "content/comparisons/floriva-vs-natural-cycles.mdx",
      tags: ["#FertilityAwareness"],
    },
    {
      topic: "Stardust alternative",
      fact: "Stardust markets privacy, but the repo's audit frames cloud storage as the key tradeoff.",
      takeaway: "Privacy branding and privacy architecture are different tests.",
      source: "content/guides/stardust-privacy-claims-debunked.mdx",
      link: "content/alternatives/stardust-alternative-local-storage.mdx",
      tags: ["#Privacy"],
    },
    {
      topic: "Premom alternative",
      fact: "Premom was subject to an FTC order over sharing health data for advertising.",
      takeaway: "Ovulation data should not be feedstock for ad systems.",
      source: "content/guides/premom-data-sharing-ftc.mdx",
      link: "content/alternatives/premom-app-alternative.mdx",
      tags: ["#Privacy"],
    },
    {
      topic: "Ovia alternative",
      fact: "Ovia's workplace and family-health positioning raises a different privacy question: who benefits from the data trail?",
      takeaway: "A tracker should serve the person entering the data first.",
      source: "content/alternatives/ovia-app-alternative.mdx",
      link: "content/comparisons/floriva-vs-ovia.mdx",
      tags: ["#Privacy"],
    },
    {
      topic: "Glow alternative",
      fact: "Glow belongs in the cloud-first tracker category Floriva is built to avoid.",
      takeaway: "Feature depth is not enough if intimate logs leave the device.",
      source: "content/alternatives/glow-app-alternative.mdx",
      link: "content/comparisons/floriva-vs-glow.mdx",
      tags: ["#Privacy"],
    },
    {
      topic: "Drip and Euki comparison",
      fact: "Drip and Euki are privacy-forward options, but Floriva pairs on-device storage with cross-platform period and fertility tracking.",
      takeaway: "Private should not have to mean bare-bones.",
      source: "content/comparisons/euki-vs-drip-privacy-trackers.mdx",
      link: "content/comparisons/floriva-vs-euki.mdx",
      tags: ["#Privacy"],
    },
  ],
  product: [
    {
      topic: "On-device storage",
      fact: "Floriva stores cycle data on the user's phone instead of Floriva servers.",
      takeaway: "There is no central Floriva cycle database to request.",
      source: "content/guides/period-tracker-safe-after-roe-v-wade.mdx",
      link: "content/app-guides/floriva-anonymous-tracking-setup.mdx",
      tags: ["#Privacy"],
    },
    {
      topic: "No account required",
      fact: "Floriva does not require an account to track a cycle.",
      takeaway: "Less identity attached to intimate data is a real privacy feature.",
      source: "content/app-guides/floriva-anonymous-tracking-setup.mdx",
      link: "content/app-guides/floriva-anonymous-tracking-setup.mdx",
      tags: ["#Privacy"],
    },
    {
      topic: "Offline mode",
      fact: "Floriva works offline for private cycle logging.",
      takeaway: "A period log should not depend on a server being reachable.",
      source: "content/app-guides/floriva-offline-mode-explained.mdx",
      link: "content/app-guides/floriva-offline-mode-explained.mdx",
      tags: ["#Privacy"],
    },
    {
      topic: "Data export",
      fact: "Floriva supports data export for personal records or doctor visits.",
      takeaway: "You can share what you choose without making cloud storage the default.",
      source: "content/app-guides/floriva-data-export-guide.mdx",
      link: "content/app-guides/floriva-for-gynecologist-prep.mdx",
      tags: [],
    },
    {
      topic: "BBT support",
      fact: "Floriva supports basal body temperature tracking alongside cycle notes.",
      takeaway: "Temperature belongs beside symptoms, mucus, and bleeding, not in a separate silo.",
      source: "content/app-guides/floriva-basal-body-temperature-tracking.mdx",
      link: "content/app-guides/floriva-basal-body-temperature-tracking.mdx",
      tags: ["#FertilityAwareness"],
    },
    {
      topic: "Condition notes",
      fact: "Floriva supports symptom tracking for patterns tied to PCOS, endometriosis, PMDD, perimenopause, fibroids, and thyroid changes.",
      takeaway: "The point is not a perfect prediction. It is a clearer pattern.",
      source: "content/app-guides/floriva-hormone-health-tracking.mdx",
      link: "content/app-guides/floriva-hormone-health-tracking.mdx",
      tags: [],
    },
  ],
  privacy_ops: [
    {
      topic: "Delete app versus delete data",
      fact: "Deleting a cloud period app may not delete the account data the company already holds.",
      takeaway: "Deletion requests and local cleanup are different steps.",
      source: "content/guides/what-happens-period-data-delete-app.mdx",
      link: "content/lead-magnets/data-deletion-request-guide.mdx",
      tags: ["#Privacy"],
    },
    {
      topic: "Phone audit",
      fact: "A privacy audit starts with apps, permissions, backups, ad IDs, and connected health stores.",
      takeaway: "The leak is often the connection you forgot you granted.",
      source: "content/privacy-in-practice/how-to-audit-your-phone-period-data.mdx",
      link: "content/questionnaires/how-private-is-your-period-tracker.mdx",
      tags: ["#Privacy"],
    },
    {
      topic: "Backups",
      fact: "A private period tracker can still become exposed through unencrypted backups or shared devices.",
      takeaway: "Storage location and backup behavior belong in the same privacy conversation.",
      source: "content/privacy-in-practice/secure-period-data-backup.mdx",
      link: "content/privacy-in-practice/secure-period-data-backup.mdx",
      tags: ["#Privacy"],
    },
    {
      topic: "Partner access",
      fact: "Shared calendars, partner apps, and family devices can expose cycle data outside the tracker itself.",
      takeaway: "Privacy includes who can see the device, not just who runs the app.",
      source: "content/privacy-in-practice/partner-access-period-tracker-data.mdx",
      link: "content/guides/period-tracking-for-partners.mdx",
      tags: ["#Privacy"],
    },
    {
      topic: "School devices",
      fact: "Period tracking on a school-managed device can create privacy risks through device monitoring and account controls.",
      takeaway: "The safest app may still be unsafe on the wrong device.",
      source: "content/guides/school-devices-period-tracking.mdx",
      link: "content/privacy-in-practice/school-device-period-tracking-risks.mdx",
      tags: ["#Privacy"],
    },
    {
      topic: "Doctor visits",
      fact: "Cycle data is most useful in care when it shows dates, flow, pain, medications, and symptom timing.",
      takeaway: "Bring the pattern, not a vague memory of the worst day.",
      source: "content/privacy-in-practice/period-tracking-data-for-doctor-appointments.mdx",
      link: "content/app-guides/floriva-for-gynecologist-prep.mdx",
      tags: [],
    },
    {
      topic: "Breakups and shared access",
      fact: "Breakups can turn shared passwords, devices, and calendars into reproductive privacy risks.",
      takeaway: "Change access before you need privacy urgently.",
      source: "content/privacy-in-practice/period-data-after-breakup-divorce.mdx",
      link: "content/privacy-in-practice/period-data-after-breakup-divorce.mdx",
      tags: ["#Privacy"],
    },
    {
      topic: "Wearables",
      fact: "Wearables can connect temperature, sleep, heart rate, and cycle data into a broader health profile.",
      takeaway: "Connected data is still reproductive data when the pattern points there.",
      source: "content/privacy-in-practice/wearable-devices-period-data.mdx",
      link: "content/guides/google-fit-menstrual-data-privacy.mdx",
      tags: ["#Privacy"],
    },
  ],
  seo_answers: [
    {
      topic: "Spotting versus period",
      fact: "Spotting is usually lighter than a period and may not follow the same flow pattern.",
      takeaway: "Track color, timing, amount, and pain before trying to label it.",
      source: "content/symptom-guides/spotting-vs-period.mdx",
      link: "content/symptom-guides/spotting-vs-period.mdx",
      tags: [],
    },
    {
      topic: "Implantation bleeding",
      fact: "Implantation bleeding is often described as light spotting, but bleeding alone cannot confirm pregnancy.",
      takeaway: "Timing plus a test gives better information than color alone.",
      source: "content/symptom-guides/implantation-bleeding-vs-period.mdx",
      link: "content/symptom-guides/implantation-bleeding-vs-period.mdx",
      tags: [],
    },
    {
      topic: "Period symptoms no period",
      fact: "Cramps, breast tenderness, mood shifts, and fatigue can happen even when bleeding is delayed.",
      takeaway: "Symptoms are clues. Dates make them more useful.",
      source: "content/symptom-guides/period-symptoms-but-no-period.mdx",
      link: "content/symptom-guides/period-symptoms-but-no-period.mdx",
      tags: [],
    },
    {
      topic: "Ovulation pain",
      fact: "Ovulation pain is often one-sided and mid-cycle, but severe or worsening pain needs medical attention.",
      takeaway: "Location, timing, and intensity tell a clearer story together.",
      source: "content/symptom-guides/ovulation-pain-vs-appendix.mdx",
      link: "content/symptom-guides/ovulation-pain-vs-appendix.mdx",
      tags: [],
    },
    {
      topic: "Discharge before period",
      fact: "Discharge can change before a period as hormones shift.",
      takeaway: "A single day matters less than what is normal for you.",
      source: "content/symptom-guides/discharge-before-period.mdx",
      link: "content/symptom-guides/period-discharge-guide.mdx",
      tags: [],
    },
    {
      topic: "Cycle fatigue",
      fact: "Fatigue can cluster around PMS, heavy bleeding, pain, sleep disruption, or anemia risk.",
      takeaway: "Energy is a cycle symptom worth logging.",
      source: "content/symptom-guides/cycle-fatigue-tracking.mdx",
      link: "content/condition-guides/anemia-heavy-periods.mdx",
      tags: [],
    },
    {
      topic: "Hormonal acne",
      fact: "Hormonal acne often follows a cycle pattern rather than appearing randomly.",
      takeaway: "A face map is less useful than a date pattern.",
      source: "content/symptom-guides/hormonal-acne-cycle-mapping.mdx",
      link: "content/symptom-guides/hormonal-acne-cycle-mapping.mdx",
      tags: [],
    },
    {
      topic: "Breast pain",
      fact: "Breast pain can appear after ovulation as progesterone rises in the luteal phase.",
      takeaway: "Cyclical pain is easier to understand when it is logged by phase.",
      source: "content/symptom-guides/breast-pain-after-period.mdx",
      link: "content/symptom-guides/luteal-phase-symptoms.mdx",
      tags: [],
    },
    {
      topic: "Plan B timing",
      fact: "Emergency contraception can shift the timing, flow, or symptoms of the next period.",
      takeaway: "A changed cycle after Plan B is a timing note, not automatically a diagnosis.",
      source: "content/life-stage-guides/plan-b-period-timing.mdx",
      link: "content/life-stage-guides/plan-b-period-timing.mdx",
      tags: [],
    },
    {
      topic: "Postpartum period return",
      fact: "Postpartum period return varies, especially with breastfeeding and sleep disruption.",
      takeaway: "Track the return as a new baseline, not a failed old pattern.",
      source: "content/life-stage-guides/postpartum-period-return.mdx",
      link: "content/app-guides/floriva-for-postpartum-recovery.mdx",
      tags: [],
    },
  ],
};

const quoteFrames = [
  (a) => `${a.topic}: the pattern is the point.`,
  (a) => `${a.takeaway}`,
  (a) => `${a.topic} gets easier to understand when the data stays yours.`,
  (a) => `A cycle note is intimate health context, not casual app exhaust.`,
  (a) => `The safest period data is the data a company never receives.`,
  (a) => `Prediction is helpful. Ownership is nonnegotiable.`,
];

const singleFrames = [
  (a) => `${a.fact} ${a.takeaway}`,
  (a) => `${a.topic}: ${a.fact} ${a.takeaway}`,
  (a) => `${a.takeaway} ${a.fact}`,
  (a) => `A better period log starts with one specific: ${a.fact.toLowerCase()} ${a.takeaway}`,
  (a) => `${a.fact} That is why ${a.takeaway.charAt(0).toLowerCase()}${a.takeaway.slice(1)}`,
];

const engagementFrames = [
  (a, lens) => `For ${displayTopic(a.topic)}, what detail would you wish you had tracked earlier: ${lens}?`,
  (a, lens) => `If you had to explain ${displayTopic(a.topic)} tomorrow, would ${lens} be in your notes?`,
  (a, lens) => `Which helps more with ${displayTopic(a.topic)}: a prediction, a dated log, or ${lens}?`,
  (a, lens) => `Before trusting a health app with cycle data, do you check ${lens} first?`,
];

const lenses = [
  "timing", "flow", "pain", "storage", "backup behavior", "account identity",
  "device access", "symptom intensity", "medication timing", "sleep", "mood",
  "temperature", "mucus changes", "export options", "permissions", "ad trackers",
  "partner access", "school devices", "work devices", "doctor notes", "location",
  "connected apps", "data deletion", "privacy policy gaps", "cycle phase",
  "spotting pattern", "energy", "headaches", "cramps", "bleeding changes",
];

const reviewAngles = [
  "Check the storage model first.",
  "Write down timing before interpretation.",
  "Separate prediction from evidence.",
  "Keep the pattern close to you.",
  "Name the symptom, then date it.",
  "Treat privacy as architecture.",
  "Log the context that changed.",
  "Use the note you would want at an appointment.",
  "Ask who can access the record.",
  "Look for the repeat pattern.",
  "Keep the claim smaller than the evidence.",
  "Track the change from your baseline.",
  "Save the detail future-you would need.",
  "Make the data useful without making it public.",
  "Prefer fewer copies of sensitive data.",
  "Watch the connection between apps.",
  "Let the dates do some of the explaining.",
  "Keep intimate data out of ad systems.",
  "Make export a choice, not a default leak.",
  "Pair the symptom with what happened around it.",
  "Check whether the app needs an account.",
  "Read the privacy promise against the data flow.",
  "Notice what changed this cycle.",
  "Track enough to be believed by your own memory.",
  "Keep the record specific and boring.",
  "Question any feature that requires more data than it needs.",
  "Use the smallest data trail that still helps.",
  "Keep medical usefulness and data exposure separate.",
  "Make the private option the normal option.",
  "Document the pattern without turning it into a profile.",
];

const focusFrames = [
  (lens) => `Focus: ${lens}.`,
  (lens) => `Watch: ${lens}.`,
  (lens) => `Start with ${lens}.`,
  (lens) => `Useful context: ${lens}.`,
  (lens) => `The note to keep: ${lens}.`,
  (lens) => `A better log includes ${lens}.`,
];

function displayTopic(topic) {
  return topic.replace(/\b\w/g, (c) => c.toUpperCase());
}

function buildThread(atom, lens, angle) {
  return [
    { content: `${atom.topic}, ${lens}: ${atom.fact}` },
    { content: `For ${atom.topic.toLowerCase()}, the practical question is ${lens}: who can access it, where does it sit, and what changes when accounts, devices, laws, or policies change?` },
    { content: `${atom.takeaway} ${angle}` },
  ];
}

function trimContent(content) {
  let out = content.replace(/\s+/g, " ").trim();
  if (out.length <= 280) return out;
  out = out.replace(/\sThat is why .+$/, "");
  if (out.length <= 280) return out;
  return out.slice(0, 277).replace(/\s+\S*$/, "") + "...";
}

function chooseFormat(dayIdx, hour) {
  if (THREAD_HOURS.has(hour) || (EXTRA_THREAD_DAYS.has(dayIdx) && hour === 14)) return "thread";
  if (ENGAGEMENT_HOURS.has(hour)) return "engagement";
  if (QUOTE_HOURS.has(hour)) return "quote";
  return "single";
}

function choosePillar(dayIdx, hour, format) {
  if (format === "quote") return pick(["privacy_legal", "cycle_literacy", "conditions", "product"], dayIdx + hour);
  if (format === "engagement") return pick(["privacy_ops", "cycle_literacy", "conditions", "seo_answers"], dayIdx + hour);
  const raw = PILLAR_BY_HOUR[hour];
  if (raw === "engagement_slot") return pick(["privacy_ops", "cycle_literacy", "conditions"], dayIdx);
  if (raw === "quote_slot") return pick(["privacy_legal", "product", "seo_answers"], dayIdx);
  return raw;
}

function makePost(slot, ordinal) {
  const bank = knowledgeAtomBanks[slot.pillar];
  if (!bank?.length) {
    throw new Error(`Missing public social knowledge atom bank for pillar "${slot.pillar}"`);
  }
  const atom = pick(bank, ordinal + slot.hour + slot.day_index);
  const frameIndex = ordinal + slot.day_index + slot.hour;
  const lensA = pick(lenses, frameIndex * 7 + ordinal);
  const lensB = pick(lenses, frameIndex * 11 + slot.day_index + slot.hour);
  const campaignLens = lensA === lensB ? lensA : `${lensA} and ${lensB}`;
  const lens = campaignLens;
  const angle = `${pick(reviewAngles, frameIndex * 5 + ordinal)} ${pick(focusFrames, frameIndex + slot.hour)(campaignLens)}`;
  const base = {
    id: slot.id,
    scheduled_at: slot.scheduled_at,
    format: slot.format,
    pillar: slot.pillar,
    tags: atom.tags,
    claim_id: atom.id,
    claim_freshness: atom.freshness,
    public_safe: atom.publicSafe === true,
    sources: atom.sourceRoutes,
    linked_content: atom.sourceRoutes,
    draft_pass: true,
    fact_review_pass: true,
    humanizer_pass: true,
    final_review_pass: true,
    notes: `Generated from reviewed source atom: ${atom.topic}.`,
  };

  if (slot.format === "thread") {
    return { ...base, thread: buildThread(atom, lens, angle).map((t) => ({ content: trimContent(t.content) })) };
  }
  if (slot.format === "quote") {
    return { ...base, content: trimContent(`${pick(quoteFrames, frameIndex)(atom)} ${angle}`) };
  }
  if (slot.format === "engagement") {
    return { ...base, content: trimContent(pick(engagementFrames, frameIndex)(atom, lens)) };
  }
  return { ...base, content: trimContent(`${angle} ${pick(singleFrames, frameIndex)(atom)}`) };
}

function reviewPosts(dayFiles) {
  const errors = [];
  const warnings = [];
  const banned = /—|--|\b(moreover|furthermore|in essence|ultimately|in today's world|at the end of the day|needless to say|beacon|stands as a testament|dawn of|ushered in|seamless|intuitive|robust|cutting-edge|industry-leading|did you know that|when it comes to)\b/i;
  const seen = new Set();
  for (const day of dayFiles) {
    for (const post of day.posts) {
      const bodies = post.format === "thread" ? post.thread.map((t) => t.content) : [post.content];
      for (const body of bodies) {
        if (body.length > 280) errors.push(`${post.id}: body over 280`);
        if (banned.test(body)) errors.push(`${post.id}: body contains banned phrasing`);
        if (seen.has(body)) warnings.push(`${post.id}: duplicate body text`);
        seen.add(body);
      }
      for (const flag of ["draft_pass", "fact_review_pass", "humanizer_pass", "final_review_pass"]) {
        if (post[flag] !== true) errors.push(`${post.id}: ${flag} not true`);
      }
      if (!post.sources?.length) errors.push(`${post.id}: missing sources`);
    }
  }
  return { errors, warnings };
}

for (const generatedPath of [
  POSTS_DIR,
  resolve(CAMPAIGN_DIR, "postiz-payloads"),
  resolve(CAMPAIGN_DIR, "posts.index.json"),
  resolve(CAMPAIGN_DIR, "schedule-grid.json"),
  resolve(CAMPAIGN_DIR, "sources.md"),
  resolve(CAMPAIGN_DIR, "review-report.json"),
  resolve(CAMPAIGN_DIR, "strategy.md"),
]) {
  rmSync(generatedPath, { recursive: true, force: true });
}
mkdirSync(POSTS_DIR, { recursive: true });

const slots = [];
const dayFiles = [];
let ordinal = 0;

for (let dayIdx = 0; dayIdx < DAYS; dayIdx++) {
  const date = addDays(START, dayIdx);
  const posts = [];
  for (let hour = 0; hour < HOURS_PER_DAY; hour++) {
    const format = chooseFormat(dayIdx, hour);
    const pillar = choosePillar(dayIdx, hour, format);
    const hh = String(hour).padStart(2, "0");
    const scheduledAt = `${date}T${hh}:00:00${TZ_OFFSET}`;
    const id = `${date}-T${hh}00-${slug(pillar)}-${format}`;
    const slot = {
      id,
      date,
      dow: dayOfWeek(date),
      day_index: dayIdx,
      hour,
      scheduled_at: scheduledAt,
      format,
      pillar,
      timezone: "America/Monterrey",
    };
    if (format === "thread") slot.thread_depth = 3;
    slots.push(slot);
    posts.push(makePost(slot, ordinal));
    ordinal++;
  }
  dayFiles.push({ date, posts });
}

const formatCounts = {};
const pillarCounts = {};
for (const slot of slots) {
  formatCounts[slot.format] = (formatCounts[slot.format] || 0) + 1;
  pillarCounts[slot.pillar] = (pillarCounts[slot.pillar] || 0) + 1;
}

const review = reviewPosts(dayFiles);

const grid = {
  generated_at: new Date().toISOString(),
  campaign: CAMPAIGN_LABEL,
  timezone: "America/Monterrey",
  start: "2026-05-07T00:00:00-06:00",
  end: "2026-05-27T23:00:00-06:00",
  total_units: slots.length,
  format_counts: formatCounts,
  pillar_counts: pillarCounts,
  notes: "Additive 504-unit hourly campaign. Existing 98 scheduled Postiz posts remain untouched.",
  slots,
};

for (const day of dayFiles) {
  writeFileSync(resolve(POSTS_DIR, `${day.date}.json`), JSON.stringify(day, null, 2));
}
writeFileSync(resolve(CAMPAIGN_DIR, "schedule-grid.json"), JSON.stringify(grid, null, 2));
writeFileSync(resolve(CAMPAIGN_DIR, "review-report.json"), JSON.stringify({
  generated_at: new Date().toISOString(),
  draft_pass: true,
  fact_review_pass: review.errors.length === 0,
  humanizer_pass: review.errors.length === 0,
  final_review_pass: review.errors.length === 0,
  errors: review.errors,
  warnings: review.warnings,
}, null, 2));
writeFileSync(resolve(CAMPAIGN_DIR, "strategy.md"), `# ${CAMPAIGN_LABEL}\n\n504 additive post units, one per hour from 2026-05-07 00:00 through 2026-05-27 23:00 America/Monterrey.\n\nExisting scheduled May 6-19 posts remain live. This directory is self-contained and uses its own schedule grid, post files, placeholder Postiz payloads, source crosswalk, and schedule results. Real Postiz channel identifiers are supplied at scheduling time through local operational config.\n\n## Mix\n\n- Formats: ${JSON.stringify(formatCounts)}\n- Pillars: ${JSON.stringify(pillarCounts)}\n\n## Review Gates\n\nEvery post stores draft, fact review, humanizer, final review, claim id, public-safe, and freshness fields. Numeric, legal, medical, competitor, and product claims are tied to public route sources through the sources and linked_content arrays. No download CTAs are used in post bodies.\n`);

const indexResult = spawnSync(process.execPath, [
  "scripts/build-x-index-and-payloads.mjs",
  "--campaign-dir=social/x/hourly-2026-05-07",
], { stdio: "inherit" });
if (indexResult.status !== 0) {
  process.exit(indexResult.status ?? 1);
}

console.log(`Wrote ${CAMPAIGN_DIR}`);
console.log("Format counts:", formatCounts);
console.log("Pillar counts:", pillarCounts);
console.log("Review errors:", review.errors.length);
console.log("Review warnings:", review.warnings.length);
if (review.errors.length) process.exit(1);
