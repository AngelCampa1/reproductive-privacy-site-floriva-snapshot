export type LeadMagnetSequenceStep = 2 | 3 | 4 | 5 | 6 | 7 | 8;

export type LeadMagnetSequenceEmail = {
  body?: string;
  bullets?: readonly string[];
  ctaLabel: string;
  ctaPath: string;
  opening: string;
  postscript?: string;
  preview: string;
  step: LeadMagnetSequenceStep;
  subject: string;
};

export type LeadMagnetResource = {
  description: string;
  downloadFileName: string;
  r2Key: string;
  routePath: string;
  sequence: readonly LeadMagnetSequenceEmail[];
  slug: string;
  title: string;
};

// Nurture cadence: whole-day offsets from signup for each follow-up step.
// Step 1 is the immediate delivery email (day 0); steps 2-8 are scheduled below.
// Changing these only affects new enrollments — already-scheduled jobs keep their due dates.
export const SEQUENCE_OFFSETS_DAYS: Record<LeadMagnetSequenceStep, number> = {
  2: 1,
  3: 3,
  4: 6,
  5: 10,
  6: 15,
  7: 20,
  8: 25,
};

// Global per-lead ceiling on nurture emails, across every resource a lead
// requests. Enrollment is per (lead, resource), so a lead who grabs several
// magnets would otherwise stack multiple 7-step drips; the drip runner enforces
// this cap at send time (earliest-due steps win, the rest are cancelled). Default
// is one full sequence's worth, so no lead ever receives more nurture email than a
// single-magnet subscriber. Excludes the immediate day-0 delivery email.
export const NURTURE_EMAIL_CAP_PER_LEAD = 7;

function resource(input: {
  description: string;
  sequence: readonly LeadMagnetSequenceEmail[];
  slug: string;
  title: string;
}): LeadMagnetResource {
  return {
    description: input.description,
    downloadFileName: `${input.slug}.pdf`,
    r2Key: `lead-magnets/${input.slug}.pdf`,
    routePath: `/free/${input.slug}`,
    sequence: input.sequence,
    slug: input.slug,
    title: input.title,
  };
}

export const leadMagnetResources = [
  resource({
    slug: "period-app-privacy-audit-checklist",
    title: "Period App Privacy Audit Checklist",
    description:
      "A step-by-step checklist for evaluating any period tracker's privacy practices.",
    sequence: [
      {
        step: 2,
        subject: "Audit your tracker in 90 seconds",
        preview: "Open one settings screen and you're already halfway through the audit.",
        opening:
          "If you only do one thing with the checklist, do this: open your current period tracker's settings and find where it says cycle data is stored.",
        body: "The answer is usually buried under names like \"data sharing,\" \"analytics partners,\" or \"sync.\" If you can't find a clear claim about local vs cloud storage, that absence is the signal.",
        ctaLabel: "Open the checklist",
        ctaPath: "/free/period-app-privacy-audit-kit",
        postscript: "If your app makes you log into an account just to track cycles, that's question 1 already answered.",
      },
      {
        step: 3,
        subject: "What the FTC actually said about Flo",
        preview: "Sensitive cycle events moved through advertising SDKs while the policy promised privacy.",
        opening:
          "The FTC's 2021 settlement with Flo is the case that put privacy-policy gaps on the record.",
        body: "Flo had a public privacy policy. It also shipped third-party SDKs that received pregnancy and cycle events. The audit's SDK questions exist because that gap is structural, not unique.",
        bullets: [
          "Policy promises and SDK behavior are independently verifiable.",
          "Embedded SDKs can transmit health events without the user seeing them.",
          "Cloud storage means a company has the records to share, lose, or be compelled to produce.",
        ],
        ctaLabel: "Read the FTC case context",
        ctaPath: "/resources/guides/period-app-privacy-architecture-guide",
      },
      {
        step: 4,
        subject: "Pick one app and finish the matrix",
        preview: "Stop reading reviews. Run the audit on one specific app this week.",
        opening:
          "The checklist becomes a decision tool only when you finish it for a real app you're considering.",
        body: "Pick the tracker you would install if you switched today. Answer storage, account, SDK, deletion, and law-enforcement-policy questions. The blanks are signals about how the company writes.",
        ctaLabel: "Compare trackers ranked by privacy",
        ctaPath: "/compare/versus/period-trackers-ranked-by-privacy",
      },
      {
        step: 5,
        subject: "Why local-first changes the audit answers",
        preview: "Architecture decides what data exists for a company to leak.",
        opening:
          "Floriva starts from a structural premise: sensitive cycle data should not become a server record at all.",
        body: "Local-first storage shrinks the audit. There is no readable central cycle database to breach, no advertising SDK that handles cycle events, no readable central cycle database for core tracking.",
        ctaLabel: "See local-first storage explained",
        ctaPath: "/resources/guides/on-device-storage-period-tracker",
        postscript: "This is also why several of the audit questions don't apply to Floriva - by design, not omission.",
      },
      {
        step: 6,
        subject: "The honest trade-off in privacy-first tracking",
        preview: "Less readable cloud data. A much smaller risk surface.",
        opening:
          "A privacy audit can feel tedious because every app uses careful language and most policies are long.",
        body: "Floriva's trade-off is visible: core tracking stays local, and optional sync is end-to-end encrypted. Floriva does not create a readable central reproductive-health record.",
        ctaLabel: "Read about cloud-free tracking",
        ctaPath: "/resources/guides/period-tracking-without-cloud",
      },
      {
        step: 7,
        subject: "The deeper version of this audit",
        preview: "Same lens, more architecture detail - for when the checklist isn't enough.",
        opening:
          "If the checklist was useful, the architecture guide is the next step in the same direction.",
        body: "It walks through why structural choices like on-device storage, no broad autocapture, and minimal account requirements outperform privacy claims that depend on policy promises alone.",
        ctaLabel: "Read the architecture guide",
        ctaPath: "/resources/guides/how-to-audit-period-app-privacy",
      },
      {
        step: 8,
        subject: "Keep the checklist. Pick smaller exposure.",
        preview: "The PDF stays useful even if you never try Floriva.",
        opening:
          "Use the checklist when you're comparing apps or revisiting the tracker already on your phone.",
        body: "If you want a tracker built around the constraints in the audit - local-first, no broad client-side autocapture, no ad-SDK business model - Floriva exists for exactly that.",
        ctaLabel: "See Floriva privacy features",
        ctaPath: "/privacy-features",
      },
    ],
  }),
  resource({
    slug: "data-deletion-request-guide",
    title: "Data Deletion Request Guide for Period Apps",
    description:
      "Export and deletion request steps for Flo, Clue, Natural Cycles, and Glow.",
    sequence: [
      {
        step: 2,
        subject: "Export before you delete",
        preview: "Your cycle history shouldn't disappear with the account.",
        opening:
          "Before you send the deletion request, request an export and save the file somewhere private.",
        body: "Most period apps separate export from deletion intentionally. If you delete first, the historical record is the company's to (maybe) recover. If you export first, the record is yours.",
        ctaLabel: "Open the deletion guide",
        ctaPath: "/free/delete-period-data-guide",
        postscript: "JSON or CSV is fine. PDF screenshots also work for short histories.",
      },
      {
        step: 3,
        subject: "Deletion is not always deletion",
        preview: "Backups, analytics records, and de-identified datasets often survive the request.",
        opening:
          "Regulators have repeatedly focused on the gap between what users thought they deleted and what companies actually retained.",
        body: "Account deletion typically clears the user-facing record. It rarely clears every backup, every analytics aggregate, or every de-identified dataset shared with partners. The guide's wording exists to make that distinction explicit in your request.",
        bullets: [
          "Ask for deletion of derived and aggregated data, not just account records.",
          "Request written confirmation including a deletion date.",
          "Ask which third parties received data, and request downstream deletion.",
        ],
        ctaLabel: "Read the privacy red-flags guide",
        ctaPath: "/resources/guides/period-app-privacy-red-flags",
      },
      {
        step: 4,
        subject: "Send it this week",
        preview: "The template works. The hard part is just sending it.",
        opening:
          "Pick one app. Use the template. Send the email.",
        body: "Save the response somewhere private and treat the confirmation as part of your records. The point of the guide is to create a paper trail, not to optimize wording.",
        ctaLabel: "Compare privacy-first trackers",
        ctaPath: "/resources/best/best-private-period-tracker-apps",
      },
      {
        step: 5,
        subject: "Why architecture beats deletion requests",
        preview: "The safest deletion is less readable cycle data created on company servers in the first place.",
        opening:
          "Deletion requests work, but they are remediation. Local-first architecture is prevention.",
        body: "Floriva keeps the cycle record on your device. Uninstalling the app or wiping the device deletes the data - no request, no email, no waiting period.",
        ctaLabel: "See on-device storage",
        ctaPath: "/resources/guides/on-device-storage-period-tracker",
      },
      {
        step: 6,
        subject: "What deletion can't reach",
        preview: "Even good deletion responses have known limits.",
        opening:
          "It's worth saying clearly: even fully honored deletion requests usually have limits.",
        body: "Aggregate analytics, machine-learning training sets, and partner integrations don't always have a clean reverse path. That's not a reason to skip the request - it's a reason to choose architecture that doesn't create those records to begin with.",
        ctaLabel: "Read what happens to deleted data",
        ctaPath: "/resources/guides/what-happens-period-data-delete-app",
      },
      {
        step: 7,
        subject: "If you're switching from Flo specifically",
        preview: "The export-and-switch path has a dedicated guide.",
        opening:
          "If Flo is the app you're deleting, the switcher guide turns this email sequence into one continuous workflow.",
        body: "Export, request deletion, set up local-first tracking, then keep only what you need. Same idea as the deletion template, with Flo-specific paths called out.",
        ctaLabel: "Read the Flo switcher guide",
        ctaPath: "/resources/guides/switching-from-flo-complete-guide",
      },
      {
        step: 8,
        subject: "Send the request. Keep the export.",
        preview: "One request, one saved file, one quieter trail.",
        opening:
          "The deletion guide stays useful as long as you have any cycle data sitting in apps you no longer use.",
        body: "If you want a tracker that creates less cleanup later, Floriva is built around a local-first constraint: core cycle records stay on your device, with optional encrypted sync and non-cycle records handled separately.",
        ctaLabel: "See Floriva privacy features",
        ctaPath: "/privacy-features",
      },
    ],
  }),
  resource({
    slug: "flo-to-floriva-switcher-guide",
    title: "Flo to Floriva Switcher Guide",
    description:
      "How to export your Flo data, request deletion, and switch to local-first tracking.",
    sequence: [
      {
        step: 2,
        subject: "Find the Flo export path first",
        preview: "Step one of the switch is the smallest one: find the right settings screen.",
        opening:
          "Before you delete anything, locate Flo's data export option and confirm you can produce a file.",
        body: "The deletion request is safer once your own copy of cycle history exists outside Flo. The switcher guide opens with this step for a reason.",
        ctaLabel: "Open the switcher guide",
        ctaPath: "/free/delete-period-data-guide",
      },
      {
        step: 3,
        subject: "What the FTC found Flo doing",
        preview: "Health events moved to advertising and analytics SDKs despite the policy.",
        opening:
          "Flo's documented privacy failure is the reason the switch is worth the time.",
        body: "The FTC's settlement described sensitive cycle and pregnancy events being shared with third-party SDKs while the privacy policy implied otherwise. The switch is not paranoia - it's a response to a documented and settled case.",
        ctaLabel: "Read the privacy red flags",
        ctaPath: "/resources/guides/period-app-privacy-red-flags",
      },
      {
        step: 4,
        subject: "Switch in this order, not any other",
        preview: "Export, then delete, then install - sequence matters more than speed.",
        opening:
          "The switcher guide orders the steps deliberately so you don't lose history before the deletion request goes out.",
        bullets: [
          "Export first - keep your own copy.",
          "Request deletion second - get written confirmation.",
          "Install Floriva third - start fresh with local-first tracking.",
        ],
        ctaLabel: "Compare Flo and Floriva",
        ctaPath: "/compare/versus/flo-vs-floriva-data-comparison",
      },
      {
        step: 5,
        subject: "What \"local-first\" actually changes",
        preview: "It changes the legal and breach posture entirely.",
        opening:
          "When the cycle record stays on your device, several entire categories of risk shrink at once.",
        body: "There is no readable central cycle database that can be breached, no advertising SDK handling cycle events, no readable central cycle database sitting in a vendor system.",
        ctaLabel: "See local-first storage explained",
        ctaPath: "/resources/guides/on-device-storage-period-tracker",
      },
      {
        step: 6,
        subject: "What you give up by switching",
        preview: "Honest about the trade-off: fewer cloud conveniences.",
        opening:
          "Flo has more cloud-backed features. Leaving can feel like giving up convenience.",
        body: "What you trade is multi-device cloud sync. What you gain is not creating a central reproductive-health record on someone else's servers. For many people that's the right trade - but the trade is real, and worth naming.",
        ctaLabel: "Read about cloud-free tracking",
        ctaPath: "/resources/guides/period-tracking-without-cloud",
      },
      {
        step: 7,
        subject: "The complete Flo switching guide",
        preview: "Same plan, with screenshots and timing.",
        opening:
          "If the PDF was useful, the long-form Flo switching guide goes deeper without changing the approach.",
        body: "It walks each step with the same trust-first logic: documented failures first, architectural alternatives second, marketing language last.",
        ctaLabel: "Read the full switching guide",
        ctaPath: "/resources/guides/switching-from-flo-complete-guide",
      },
      {
        step: 8,
        subject: "Done switching? One last cleanup.",
        preview: "Confirm deletion landed. Then forget about Flo.",
        opening:
          "Once Floriva is set up, the last switcher step is confirming Flo's deletion response actually arrived in writing.",
        body: "Save it with your export. That single email is what closes out the switch - everything else from here is just tracking your cycle in a smaller risk surface.",
        ctaLabel: "See Floriva privacy features",
        ctaPath: "/privacy-features",
      },
    ],
  }),
  resource({
    slug: "florida-georgia-scorecard-bundle",
    title: "Florida + Georgia Period Tracker Risk Scorecard",
    description:
      "State-specific period tracker risk analysis for Florida and Georgia.",
    sequence: [
      {
        step: 2,
        subject: "One column to fill in tonight",
        preview: "Mark whether your tracker stores cycle history on a company server.",
        opening:
          "The most useful single field on the scorecard is the storage column for your current tracker.",
        body: "If the answer is \"company servers\" or \"unclear,\" you've found the row that matters most for Florida and Georgia readers.",
        ctaLabel: "Open the scorecard",
        ctaPath: "/free/post-dobbs-digital-safety-kit-hub",
      },
      {
        step: 3,
        subject: "Why state lines change the math",
        preview: "Cloud-first trackers create company-held records - that's what state-level risk leans on.",
        opening:
          "State law and app architecture are different things, but they meet at one point: who holds the data.",
        body: "A company can only produce records it has. State pages exist to make that point concrete: in jurisdictions with active reproductive-health enforcement, the size of company-held records is a variable users actually control.",
        ctaLabel: "Read the Florida privacy law page",
        ctaPath: "/period-tracker-privacy/reproductive-data-privacy-laws-florida",
      },
      {
        step: 4,
        subject: "Florida or Georgia: pick yours and decide",
        preview: "Each state's page narrows the choice.",
        opening:
          "Open the state page that applies to you and use it as the lens for the scorecard's storage and SDK columns.",
        body: "The scorecard turns from analysis into a decision when you narrow it to one state and one tracker on your phone right now.",
        ctaLabel: "See the Georgia privacy law page",
        ctaPath: "/period-tracker-privacy/reproductive-data-privacy-laws-georgia",
      },
      {
        step: 5,
        subject: "What Floriva's architecture means in your state",
        preview: "Local-first means there is less readable company-side data.",
        opening:
          "Floriva's storage decision matters more in jurisdictions with active reproductive-health enforcement.",
        body: "Core cycle records that live on your device are not readable company database rows. That is not a legal opinion. It is a plain description of where the records sit.",
        ctaLabel: "See on-device storage",
        ctaPath: "/resources/guides/on-device-storage-period-tracker",
      },
      {
        step: 6,
        subject: "Where the scorecard stops being useful",
        preview: "State law shifts. Static scorecards are a starting point, not legal advice.",
        opening:
          "State laws and privacy statutes change, and the scorecard isn't legal advice.",
        body: "It's a fast way to compare apps against a stable lens - storage, account, SDK, deletion - and to do that comparison before any specific legal question is urgent.",
        ctaLabel: "Read the post-Roe tracker safety guide",
        ctaPath: "/resources/guides/period-tracker-safe-after-roe-v-wade",
      },
      {
        step: 7,
        subject: "Browse all 50 state pages",
        preview: "If you've moved or you live near a border, the bundle stays useful.",
        opening:
          "If you want the same lens for any other state, the full state index uses the same risk model the scorecard does.",
        ctaLabel: "Browse all state pages",
        ctaPath: "/period-tracker-privacy",
      },
      {
        step: 8,
        subject: "Keep the scorecard handy",
        preview: "Re-run it whenever you switch trackers or move.",
        opening:
          "The scorecard is built to be re-used: one cycle of audit, one decision, one quieter trail.",
        body: "If you want a tracker that defaults to keeping cycle data off vendor servers entirely, Floriva is built for that constraint from day one.",
        ctaLabel: "See Floriva privacy features",
        ctaPath: "/privacy-features",
      },
    ],
  }),
  resource({
    slug: "post-dobbs-digital-safety-kit",
    title: "Post-Dobbs Digital Safety Kit",
    description:
      "A practical privacy checklist for reproductive health decisions and digital trails.",
    sequence: [
      {
        step: 2,
        subject: "Pick one trail. Reduce it today.",
        preview: "Search history, location, messages, or period data - choose one.",
        opening:
          "Digital safety advice gets overwhelming when every trail feels equally urgent. The kit's first move is to pick one.",
        body: "Search history, location sharing, message backups, period-app storage. Reduce one of those today. The rest can wait.",
        ctaLabel: "Open the safety kit",
        ctaPath: "/free/post-dobbs-digital-safety-kit-hub",
      },
      {
        step: 3,
        subject: "Why ordinary digital records changed weight",
        preview: "Records that already existed became more sensitive in reproductive-health contexts.",
        opening:
          "After the Dobbs decision, privacy advocates flagged a specific concern: ordinary digital records can become more sensitive when the legal context shifts.",
        body: "Search history, location pings, period app data, and message metadata didn't change. The downstream consequences of having those records did. The kit is organized around that shift.",
        ctaLabel: "Read the post-Roe tracker guide",
        ctaPath: "/resources/guides/period-tracker-safe-after-roe-v-wade",
      },
      {
        step: 4,
        subject: "From checklist to weekly habit",
        preview: "Do one section. Then schedule the next.",
        opening:
          "The kit works best as a weekly cadence rather than a one-time read.",
        bullets: [
          "Week 1: the trail you use most often.",
          "Week 2: the trail you understand least.",
          "Week 3: the trail with the longest historical record.",
        ],
        ctaLabel: "Read the legal safety guide",
        ctaPath: "/resources/guides/period-tracking-legal-safety-guide",
      },
      {
        step: 5,
        subject: "Where Floriva fits in the kit",
        preview: "Period tracking is one section of a larger privacy posture.",
        opening:
          "Floriva covers exactly one section of the safety kit: period and fertility tracking.",
        body: "It does not replace search-engine choice, messaging-app choice, or account hygiene. It does mean the period-tracking section can be answered with on-device storage rather than another cloud account.",
        ctaLabel: "See on-device storage",
        ctaPath: "/resources/guides/on-device-storage-period-tracker",
      },
      {
        step: 6,
        subject: "What the kit can't promise",
        preview: "Every trail has trade-offs. None of them disappear entirely.",
        opening:
          "Privacy reductions are usually trade-offs, not eliminations.",
        body: "Local-first period tracking gives up cloud sync. Privacy-respecting search gives up some personalization. Encrypted messaging gives up some interoperability. The kit names those costs because hidden costs become resentment later.",
        ctaLabel: "Read about cloud-free tracking",
        ctaPath: "/resources/guides/period-tracking-without-cloud",
      },
      {
        step: 7,
        subject: "The deeper post-Roe tracker guide",
        preview: "Same direction as the kit, more depth on the period-tracking section.",
        opening:
          "If the kit's period-tracker section was the most relevant for you, the post-Roe guide expands it.",
        ctaLabel: "Read the post-Roe guide",
        ctaPath: "/resources/guides/period-tracker-safe-after-roe-v-wade",
      },
      {
        step: 8,
        subject: "Keep the kit. Reduce one trail per quarter.",
        preview: "Sustainable beats comprehensive.",
        opening:
          "The safety kit is designed for re-use rather than a one-time triage.",
        body: "If period tracking is one of the trails you want to reduce, Floriva is built around the constraint: sensitive cycle data stays on your device by default.",
        ctaLabel: "See Floriva privacy features",
        ctaPath: "/privacy-features",
      },
    ],
  }),
  resource({
    slug: "privacy-guide",
    title: "Period Tracker Privacy Guide",
    description:
      "How to evaluate period apps for real privacy, not just policy promises.",
    sequence: [
      {
        step: 2,
        subject: "Find the storage claim, not the privacy promise",
        preview: "One word in any policy tells you most of what you need.",
        opening:
          "The privacy guide's core move: ignore the word \"privacy\" and find the storage claim.",
        body: "Local device, encrypted cloud, or company server. That single answer changes the rest of the analysis more than any other sentence in the policy.",
        ctaLabel: "Open the privacy guide",
        ctaPath: "/free/privacy-guide",
      },
      {
        step: 3,
        subject: "Flo and Premom - the same gap",
        preview: "Both showed how privacy claims and SDK behavior diverge.",
        opening:
          "Flo's FTC settlement and Premom's data-sharing case illustrate the same structural gap.",
        body: "Reassuring privacy language coexisting with sensitive health data flowing through third-party systems. The guide is built around that pattern because it isn't unique.",
        ctaLabel: "Read the architecture guide",
        ctaPath: "/resources/guides/period-app-privacy-architecture-guide",
      },
      {
        step: 4,
        subject: "Read it next to a real policy",
        preview: "The guide turns useful when paired with one tracker's privacy page.",
        opening:
          "Open one tracker's privacy policy and read the guide alongside it.",
        body: "Highlight what the company says about storage, sharing, and legal requests. The guide's questions exist so you don't have to draft them yourself.",
        ctaLabel: "Compare privacy-first trackers",
        ctaPath: "/resources/best/best-private-period-tracker-apps",
      },
      {
        step: 5,
        subject: "Why architecture wins over wording",
        preview: "Words can change in a policy update. Architecture can't, silently.",
        opening:
          "Floriva's privacy posture isn't a policy decision - it's an architectural one.",
        body: "On-device storage means the company holds less. No broad client-side autocapture means events aren't streaming to analytics by default. These are not promises; they're product constraints.",
        ctaLabel: "See on-device storage",
        ctaPath: "/resources/guides/on-device-storage-period-tracker",
      },
      {
        step: 6,
        subject: "The reassurance that should make you uneasy",
        preview: "Privacy language often sounds calmest right where the architecture is weakest.",
        opening:
          "Privacy claims often sound the most reassuring exactly where the underlying architecture still depends on cloud records.",
        body: "If a tracker leans heavily on words like \"trusted,\" \"secure,\" or \"private,\" check whether those words are paired with storage and SDK specifics. If they aren't, the reassurance is doing the work the architecture isn't.",
        ctaLabel: "Read about cloud-free tracking",
        ctaPath: "/resources/guides/period-tracking-without-cloud",
      },
      {
        step: 7,
        subject: "The architectural guide goes deeper",
        preview: "Same lens, more detail on what \"private\" should mean technically.",
        opening:
          "If the privacy guide helped, the architecture guide is the longer version of the same argument.",
        ctaLabel: "Read the architecture guide",
        ctaPath: "/resources/guides/period-app-privacy-architecture-guide",
      },
      {
        step: 8,
        subject: "Use the guide whenever \"privacy\" appears",
        preview: "It's a checklist for reading any tracker's privacy claim.",
        opening:
          "Keep the guide as a baseline whenever an app claims privacy without explaining storage, SDKs, and account requirements.",
        body: "Floriva is built to score well on every question in the guide - not because the questions were easy, but because the architecture made most of them not-applicable.",
        ctaLabel: "See Floriva privacy features",
        ctaPath: "/privacy-features",
      },
    ],
  }),
  resource({
    slug: "state-risk-scorecard",
    title: "Period Tracker Risk Scorecard by State",
    description:
      "How US states compare on abortion law, data privacy, shield laws, and subpoena exposure.",
    sequence: [
      {
        step: 2,
        subject: "Start with your state's row",
        preview: "Your state is the only row that matters tonight.",
        opening:
          "Open the scorecard, find your state, and note whether your current tracker creates company-held cycle records.",
        body: "Two answers and you've already extracted the most useful comparison the scorecard can give you.",
        ctaLabel: "Open the state scorecard",
        ctaPath: "/free/post-dobbs-digital-safety-kit-hub",
      },
      {
        step: 3,
        subject: "What \"company-held\" means under legal process",
        preview: "Records a company holds are records that can be requested.",
        opening:
          "The legal relevance of period data depends partly on whether a company has records that can be requested at all.",
        body: "That's why the scorecard weighs storage architecture alongside state law. Reducing the size of company-held reproductive-health records is one of the few variables a user can control directly.",
        ctaLabel: "Read the legal safety guide",
        ctaPath: "/resources/guides/period-tracking-legal-safety-guide",
      },
      {
        step: 4,
        subject: "Choose with the scorecard, not despite it",
        preview: "Filter trackers by storage first, then by features.",
        opening:
          "Use the scorecard to filter rather than to rank.",
        bullets: [
          "Drop any tracker that fails your storage non-negotiable.",
          "Drop any tracker without a clear deletion process.",
          "Compare what's left on the features that actually matter to you.",
        ],
        ctaLabel: "Compare privacy-first trackers",
        ctaPath: "/resources/best/best-private-period-tracker-apps",
      },
      {
        step: 5,
        subject: "Where local-first lands on the scorecard",
        preview: "Floriva's row is short by design.",
        opening:
          "Floriva's row on the scorecard is intentionally narrow.",
        body: "When the cycle record stays on your device, the columns about server storage, account databases, and third-party SDK exposure either shrink or stop applying.",
        ctaLabel: "See on-device storage",
        ctaPath: "/resources/guides/on-device-storage-period-tracker",
      },
      {
        step: 6,
        subject: "What the scorecard isn't",
        preview: "It's a planning tool, not legal advice.",
        opening:
          "State-by-state risk shifts over time, and a static scorecard shouldn't be treated as legal advice.",
        body: "It's a planning tool: a way to make defensive choices before any specific legal question is urgent, with a clear lens that doesn't change every news cycle.",
        ctaLabel: "Read the post-Roe tracker guide",
        ctaPath: "/resources/guides/period-tracker-safe-after-roe-v-wade",
      },
      {
        step: 7,
        subject: "Drill into your state's full page",
        preview: "Each state has a long-form page using the same risk model.",
        opening:
          "Each state in the scorecard has a long-form page that goes deeper using the same risk model.",
        ctaLabel: "Browse all state pages",
        ctaPath: "/period-tracker-privacy",
      },
      {
        step: 8,
        subject: "Keep the scorecard. Re-run it after any move.",
        preview: "It's a living tool, not a one-time read.",
        opening:
          "The scorecard is meant to be re-used whenever your state, your tracker, or your situation changes.",
        body: "If you want a tracker built to score well across every state row by default, Floriva is designed around the storage column most other trackers struggle with.",
        ctaLabel: "See Floriva privacy features",
        ctaPath: "/privacy-features",
      },
    ],
  }),
  resource({
    slug: "subpoena-response-template",
    title: "If You Get Subpoenaed: Template + Checklist",
    description:
      "First-hour steps, escalation guidance, and data minimization prompts.",
    sequence: [
      {
        step: 2,
        subject: "Identify your one phone call",
        preview: "Before the document arrives, decide who you call first.",
        opening:
          "The most useful preparation is the one most people skip: knowing who you would contact before any legal document arrives.",
        body: "Save the template somewhere private and write down a name and number. That's the first checklist item for a reason.",
        ctaLabel: "Open the subpoena template",
        ctaPath: "/free/post-dobbs-digital-safety-kit-hub",
      },
      {
        step: 3,
        subject: "Why minimization matters before the request",
        preview: "A company can only be compelled to produce records it has.",
        opening:
          "The legal logic the template is built around is simple: a company can only produce records it has.",
        body: "That's why the data-minimization prompts come before the response steps. Reducing what exists is the most effective response - and it has to happen before anything is requested.",
        ctaLabel: "Read what police can access",
        ctaPath: "/resources/guides/can-police-access-period-tracker-data",
      },
      {
        step: 4,
        subject: "Fast action vs safe action",
        preview: "Pressure to respond quickly is not the same as pressure to respond well.",
        opening:
          "A subpoena creates pressure to act quickly. Fast action is not the same as safe action.",
        body: "The template separates first-hour steps (preserve documents, contact counsel) from longer-term cleanup so you don't conflate them under stress.",
        ctaLabel: "Read the legal safety guide",
        ctaPath: "/resources/guides/period-tracking-legal-safety-guide",
      },
      {
        step: 5,
        subject: "Where local-first storage lands legally",
        preview: "Records on your device aren't records in a vendor's database.",
        opening:
          "Floriva's local-first design is the architectural version of the template's data-minimization prompts.",
        body: "If cycle records live on your device, they aren't sitting in a vendor database waiting to be produced. This is not legal advice - it's a description of where the data physically lives.",
        ctaLabel: "See on-device storage",
        ctaPath: "/resources/guides/on-device-storage-period-tracker",
      },
      {
        step: 6,
        subject: "What this template can't do",
        preview: "It's preparation. It's not a substitute for counsel.",
        opening:
          "The template is preparation, not a substitute for legal advice.",
        body: "Its job is to make the first hour calmer and the data-minimization choices already-made before any document arrives. The legal response itself still needs a lawyer.",
        ctaLabel: "Read about subpoenas in practice",
        ctaPath: "/resources/privacy-in-practice/who-can-legally-get-your-period-data",
      },
      {
        step: 7,
        subject: "What subpoenas actually request",
        preview: "Pattern of requests is more useful than worst-case examples.",
        opening:
          "If you want a deeper look at the kinds of requests that actually appear in reproductive-health contexts, the in-practice guide breaks down patterns.",
        ctaLabel: "Read what subpoenas actually request",
        ctaPath: "/resources/privacy-in-practice/who-can-legally-get-your-period-data",
      },
      {
        step: 8,
        subject: "Keep the template. Shrink the data first.",
        preview: "Preparation now is cheaper than triage later.",
        opening:
          "Save the template and use it as preparation rather than a worst-case planning document.",
        body: "If you want a tracker that defaults to keeping reproductive-health records out of vendor systems entirely, Floriva is built for that constraint.",
        ctaLabel: "See Floriva privacy features",
        ctaPath: "/privacy-features",
      },
    ],
  }),
  resource({
    slug: "texas-louisiana-scorecard-bundle",
    title: "Texas + Louisiana Period Tracker Risk Scorecard",
    description:
      "State-specific period tracker risk analysis for Texas and Louisiana.",
    sequence: [
      {
        step: 2,
        subject: "Two columns to fill in tonight",
        preview: "Account requirement, and storage location. That's the start.",
        opening:
          "For Texas and Louisiana readers, two scorecard columns matter most: whether your tracker requires an account, and whether cycle history sits on company servers.",
        body: "Both can be answered without touching the app's privacy policy - usually from settings alone.",
        ctaLabel: "Open the state scorecard",
        ctaPath: "/free/post-dobbs-digital-safety-kit-hub",
      },
      {
        step: 3,
        subject: "Why high-risk states change the question",
        preview: "Architecture choices have weight that varies by jurisdiction.",
        opening:
          "Server-backed reproductive-health records create a company-side access point that local-first tracking is designed to avoid.",
        body: "In jurisdictions with active reproductive-health enforcement, that architectural difference moves from privacy preference to risk variable.",
        ctaLabel: "Read the Texas privacy law page",
        ctaPath: "/period-tracker-privacy/reproductive-data-privacy-laws-texas",
      },
      {
        step: 4,
        subject: "Don't let features distract from storage",
        preview: "Pretty UI doesn't change where the data lives.",
        opening:
          "Feature comparisons can distract from the basic question of who holds the data.",
        body: "Use the scorecard to drop anything that fails the storage column first. Then compare the remaining trackers on features.",
        ctaLabel: "Compare privacy-first trackers",
        ctaPath: "/resources/best/best-private-period-tracker-apps",
      },
      {
        step: 5,
        subject: "What Floriva's row looks like in Texas",
        preview: "Local-first means most state-specific risks shrink at once.",
        opening:
          "Floriva's row on the scorecard stays narrow regardless of which state you open it from.",
        body: "When the record lives on your device, the columns about server storage, account databases, and SDK exposure either shrink or stop applying.",
        ctaLabel: "See on-device storage",
        ctaPath: "/resources/guides/on-device-storage-period-tracker",
      },
      {
        step: 6,
        subject: "The trade-off in high-risk states",
        preview: "Less cloud convenience. Less company-held data.",
        opening:
          "The trade-off in high-risk jurisdictions is the same as everywhere - just more visible.",
        body: "Cloud sync vs not creating a central reproductive-health record on a company's servers. The scorecard is built so that trade is something you choose, not something that happens to you.",
        ctaLabel: "Read about cloud-free tracking",
        ctaPath: "/resources/guides/period-tracking-without-cloud",
      },
      {
        step: 7,
        subject: "Read the Louisiana page next",
        preview: "Same model, state-specific facts.",
        opening:
          "If you live near the Louisiana border or split time between the two states, both long-form pages use the same risk model.",
        ctaLabel: "Read the Louisiana privacy law page",
        ctaPath: "/period-tracker-privacy/reproductive-data-privacy-laws-louisiana",
      },
      {
        step: 8,
        subject: "Keep the scorecard. Choose the smaller record.",
        preview: "The PDF stays useful as long as state-level risk is in play.",
        opening:
          "The scorecard becomes more useful, not less, as state-level enforcement situations evolve.",
        body: "If you want a tracker built for the storage column most state pages emphasize, Floriva is designed around exactly that constraint.",
        ctaLabel: "See Floriva privacy features",
        ctaPath: "/privacy-features",
      },
    ],
  }),
  resource({
    slug: "cycle-tracking-starter-template",
    title: "Cycle Tracking Starter Template",
    description:
      "A paper-compatible tracking template for people leaving cloud-backed apps.",
    sequence: [
      {
        step: 2,
        subject: "Print one page. Track one cycle.",
        preview: "The simplest version of the template is the one that gets used.",
        opening:
          "Print or save a single cycle page and fill in only the fields you actually use.",
        body: "A useful tracking system is one you maintain without oversharing. Most people who switch from cloud-backed apps end up using fewer fields, not more.",
        ctaLabel: "Open the starter template",
        ctaPath: "/free/first-period-starter-kit",
      },
      {
        step: 3,
        subject: "Overcollection is where it goes wrong",
        preview: "Most privacy failures start with too many fields, not too few.",
        opening:
          "Many app-side privacy failures begin with overcollection: more fields, more sync, more analytics, more records than the user needed.",
        body: "Paper or local-first templates push back on that pattern at the source. The simplest tracker is also the one with the smallest leak surface.",
        ctaLabel: "Read about period app red flags",
        ctaPath: "/resources/guides/period-app-privacy-red-flags",
      },
      {
        step: 4,
        subject: "Pick three fields, not thirty",
        preview: "Date, flow, one symptom. That's a usable tracking habit.",
        opening:
          "The template works best when you pick a small number of fields and stay consistent.",
        bullets: [
          "Date and cycle day.",
          "Flow level.",
          "One symptom you actually want to remember.",
        ],
        ctaLabel: "Read about tracking without an app",
        ctaPath: "/resources/guides/how-to-track-period-without-app",
      },
      {
        step: 5,
        subject: "When you outgrow paper",
        preview: "Local-first apps are the next step, not cloud-first ones.",
        opening:
          "Paper tracking is a great starting place. When it stops being enough, the next step doesn't have to be a cloud-first app.",
        body: "Floriva is the local-first version of the same idea: small set of fields by default, no broad client-side autocapture, no account-required record.",
        ctaLabel: "See on-device storage",
        ctaPath: "/resources/guides/on-device-storage-period-tracker",
      },
      {
        step: 6,
        subject: "Paper has limits too",
        preview: "It loses easily, and it doesn't predict cycles.",
        opening:
          "Paper-compatible tracking can feel less polished than an app, and that simplicity has real limits.",
        body: "Paper loses, smudges, and doesn't predict cycles. Local-first apps preserve the privacy posture and add prediction without sending data anywhere.",
        ctaLabel: "Read about cloud-free tracking",
        ctaPath: "/resources/guides/period-tracking-without-cloud",
      },
      {
        step: 7,
        subject: "Tracking without an app, in depth",
        preview: "If paper is your endpoint, the long guide makes it sustainable.",
        opening:
          "If paper is the system you want to keep, the long-form guide on tracking without an app makes it easier to maintain.",
        ctaLabel: "Read tracking-without-an-app guide",
        ctaPath: "/resources/guides/how-to-track-period-without-app",
      },
      {
        step: 8,
        subject: "Keep the template. Stay deliberate.",
        preview: "Track only what you'd be comfortable keeping locally.",
        opening:
          "Use the template as long as it's useful, even if you eventually move to a local-first app.",
        body: "Floriva is built around the same constraint: only collect what's worth keeping, and keep it on the device that already belongs to you.",
        ctaLabel: "See Floriva privacy features",
        ctaPath: "/privacy-features",
      },
    ],
  }),
  resource({
    slug: "pcos-symptom-tracker",
    title: "PCOS Symptom Tracker",
    description:
      "A structured tracking sheet for PCOS symptoms to bring to gynecologist appointments.",
    sequence: [
      {
        step: 2,
        subject: "Two columns reveal the most",
        preview: "Cycle length and acne flare timing - start there.",
        opening:
          "Start the PCOS tracker with two columns: cycle length and acne flare timing.",
        body: "They require no equipment and tend to surface the clearest pattern first. Add other columns once you have a baseline.",
        ctaLabel: "Open the PCOS tracker",
        ctaPath: "/free/pcos-tracking-kit",
      },
      {
        step: 3,
        subject: "PCOS is a sensitive health category",
        preview: "Condition-level data has financial value to ad-supported apps.",
        opening:
          "Health apps with ad-supported business models have financial incentives to retain condition-level data.",
        body: "PCOS status can reach advertising networks through analytics SDK integrations - the same pathway the FTC documented in the Flo case. The tracker is designed for paper or local-first use because of that.",
        ctaLabel: "Read about PCOS tracking",
        ctaPath: "/resources/condition-guides/pcos-period-irregularity-tracking",
      },
      {
        step: 4,
        subject: "Track 2 to 3 cycles, then bring it in",
        preview: "Pattern beats single-cycle data when you talk to a clinician.",
        opening:
          "PCOS evaluation depends on patterns rather than single-cycle data.",
        body: "Use the tracker for two to three cycles before your appointment. Bring the printed sheet rather than a phone screen - it's faster to reference and harder to lose.",
        ctaLabel: "Read about PCOS treatment options",
        ctaPath: "/resources/condition-guides/pcos-period-irregularity-tracking",
      },
      {
        step: 5,
        subject: "Why local-first fits PCOS specifically",
        preview: "PCOS data shouldn't sit on someone else's server.",
        opening:
          "PCOS tracking benefits especially from local-first storage because the data is both long-running and clinically sensitive.",
        body: "Floriva keeps cycle and symptom history on your device, which means a multi-year PCOS pattern doesn't accumulate on a vendor's servers in parallel.",
        ctaLabel: "See on-device storage",
        ctaPath: "/resources/guides/on-device-storage-period-tracker",
      },
      {
        step: 6,
        subject: "PCOS varies - so does the tracker",
        preview: "Generic PCOS descriptions don't match individual patterns.",
        opening:
          "PCOS symptoms vary significantly between people.",
        body: "Tracking your specific pattern is more useful than mapping yourself onto a generic description. The tracker leaves room for the symptoms that matter to you, even if they aren't on the standard list.",
        ctaLabel: "Read about PCOS symptom variation",
        ctaPath: "/resources/condition-guides/pcos-period-irregularity-tracking",
      },
      {
        step: 7,
        subject: "More PCOS resources",
        preview: "Condition guides expand the same lens.",
        opening:
          "If the tracker helped, the condition guide on PCOS irregularity expands the same lens with more clinical context.",
        ctaLabel: "Read the PCOS irregularity guide",
        ctaPath: "/resources/condition-guides/pcos-period-irregularity-tracking",
      },
      {
        step: 8,
        subject: "Keep the tracker. Skip the data trail.",
        preview: "Long-running PCOS data deserves a small leak surface.",
        opening:
          "PCOS tracking is one of the cases where the privacy stakes are highest, because the data accumulates over years.",
        body: "Floriva is built so that long-running condition data stays on your device by default, not in a vendor's analytics pipeline.",
        ctaLabel: "See Floriva privacy features",
        ctaPath: "/privacy-features",
      },
    ],
  }),
  resource({
    slug: "cycle-syncing-planner",
    title: "Cycle Syncing Planner",
    description:
      "A monthly planner that maps cycle phases to work, exercise, and nutrition adjustments.",
    sequence: [
      {
        step: 2,
        subject: "Map last three cycles before you plan",
        preview: "Calculate your average luteal phase length first.",
        opening:
          "Before filling out the planner, identify your last three cycle lengths and calculate your average luteal phase length.",
        body: "Phase-based planning depends on knowing your phase boundaries, not the textbook ones. The first calculation is the one most people skip.",
        ctaLabel: "Open the planner",
        ctaPath: "/free/cycle-syncing-food-workout-planner",
      },
      {
        step: 3,
        subject: "Why \"AI\" cycle apps need cloud",
        preview: "Personalization features usually mean cloud sync.",
        opening:
          "Apps that incorporate AI or personalization typically require cloud sync.",
        body: "That means your cycle and behavioral pattern data lives on their servers and can be combined with other signals for advertising targeting. The planner is paper-compatible because the cloud version of the same idea has those costs.",
        ctaLabel: "Read about cloud-free tracking",
        ctaPath: "/resources/guides/period-tracking-without-cloud",
      },
      {
        step: 4,
        subject: "One full cycle before you evaluate",
        preview: "Cycle syncing is an attention practice, not an instant fix.",
        opening:
          "Use the planner for one full cycle before deciding whether phase-aligned adjustments are worth your time.",
        body: "The value of cycle syncing is the attention, not the rigidity of the protocol. Track gently, then evaluate honestly.",
        ctaLabel: "Read the cycle syncing guide",
        ctaPath: "/resources/wellness-guides/cycle-syncing-complete-guide",
      },
      {
        step: 5,
        subject: "Sync planning without the data trail",
        preview: "Floriva keeps the planner's data on your device.",
        opening:
          "Floriva's local-first design means a cycle-syncing pattern can live entirely on your device, not in a vendor's behavioral profile.",
        body: "You get prediction and phase boundaries without exporting your weekly habits to a third party.",
        ctaLabel: "See on-device storage",
        ctaPath: "/resources/guides/on-device-storage-period-tracker",
      },
      {
        step: 6,
        subject: "Cycle syncing isn't universal",
        preview: "Effects vary by person; the planner is a probe, not a prescription.",
        opening:
          "Cycle syncing benefits vary significantly between individuals.",
        body: "The planner is a probe - a way to find out whether phase-aligned adjustments matter for you specifically. If they don't, that's a useful finding too.",
        ctaLabel: "Read the full cycle syncing guide",
        ctaPath: "/resources/wellness-guides/cycle-syncing-complete-guide",
      },
      {
        step: 7,
        subject: "Long-form cycle syncing guide",
        preview: "Same lens, more depth on each phase.",
        opening:
          "If the planner was useful, the long-form cycle syncing guide expands the same approach with more depth on each phase.",
        ctaLabel: "Read the cycle syncing guide",
        ctaPath: "/resources/wellness-guides/cycle-syncing-complete-guide",
      },
      {
        step: 8,
        subject: "Keep the planner. Skip the profile.",
        preview: "Phase-based planning without behavioral data leaving your phone.",
        opening:
          "Cycle-based planning works on paper or in a local-first app - it doesn't require building a behavioral profile on someone else's servers.",
        body: "Floriva is built so the data the planner generates stays on the device that produced it.",
        ctaLabel: "See Floriva privacy features",
        ctaPath: "/privacy-features",
      },
    ],
  }),
  resource({
    slug: "endometriosis-pain-diary",
    title: "Endometriosis Pain Diary",
    description:
      "A structured pain log for building a documented symptom history for diagnosis and surgical prep.",
    sequence: [
      {
        step: 2,
        subject: "One pain entry today",
        preview: "Cycle day, location, severity, what you took. That's enough.",
        opening:
          "Log one pain episode today: cycle day, location, severity 1 to 10, and what you took for it.",
        body: "The diary becomes useful at scale, but the habit starts with one row. The hardest part is the first entry.",
        ctaLabel: "Open the pain diary",
        ctaPath: "/free/endometriosis-tracking-kit",
      },
      {
        step: 3,
        subject: "Why endometriosis data is sensitive insurance data",
        preview: "Detailed symptom logs in the cloud have appeared in benefits disputes.",
        opening:
          "Endometriosis is a condition insurers have used to assess risk.",
        body: "Detailed symptom logs stored in cloud apps could be requested or accessed in a benefits dispute. Paper and local-first logs reduce readable company-side records. Device access, backups, exports, and shared copies are separate risks.",
        ctaLabel: "Read about endometriosis diagnosis",
        ctaPath: "/resources/condition-guides/intense-period-pain-vs-endometriosis",
      },
      {
        step: 4,
        subject: "Two cycles before the appointment",
        preview: "Cycle-correlated pain documentation moves diagnoses forward.",
        opening:
          "Log each pain episode for at least two cycles before sharing with your gynecologist or specialist.",
        body: "Cycle-correlated pain documentation is often what moves an endometriosis diagnosis forward after years of vague reporting. Pattern beats severity in the conversation.",
        ctaLabel: "Read intense pain vs endometriosis guide",
        ctaPath: "/resources/condition-guides/intense-period-pain-vs-endometriosis",
      },
      {
        step: 5,
        subject: "Why local-first fits chronic pain data",
        preview: "Multi-year symptom records deserve a small leak surface.",
        opening:
          "Endometriosis tracking accumulates years of detailed symptom data.",
        body: "Floriva's local-first design means that record stays on your device. Bring the data to your appointment; don't ship it to a vendor's analytics pipeline in parallel.",
        ctaLabel: "See on-device storage",
        ctaPath: "/resources/guides/on-device-storage-period-tracker",
      },
      {
        step: 6,
        subject: "Pain diaries feel tedious",
        preview: "They are. The diagnostic value is also real.",
        opening:
          "Pain diaries feel tedious because they are.",
        body: "The diagnostic value is also real, especially after years of vague reporting. The diary's structure is built so that even sparse logging beats no logging.",
        ctaLabel: "Read the chronic pain tracking guide",
        ctaPath: "/resources/condition-guides/intense-period-pain-vs-endometriosis",
      },
      {
        step: 7,
        subject: "More on endometriosis diagnosis",
        preview: "The condition guide pairs with the diary directly.",
        opening:
          "The condition guide on intense period pain vs endometriosis pairs with the diary directly.",
        ctaLabel: "Read the condition guide",
        ctaPath: "/resources/condition-guides/intense-period-pain-vs-endometriosis",
      },
      {
        step: 8,
        subject: "Keep the diary. Keep it private.",
        preview: "Years of symptom data deserve a small leak surface.",
        opening:
          "Use the diary as long as the symptom record is useful - that's typically years.",
        body: "Floriva is built so that record stays with you, on your device, not on someone else's servers.",
        ctaLabel: "See Floriva privacy features",
        ctaPath: "/privacy-features",
      },
    ],
  }),
  resource({
    slug: "fertility-awareness-method-chart",
    title: "Fertility Awareness Method Charting Sheet",
    description:
      "A BBT, cervical mucus, and cervical position chart for one full cycle of FAM tracking.",
    sequence: [
      {
        step: 2,
        subject: "One week of BBT, same time daily",
        preview: "Establish your follicular baseline before anything else.",
        opening:
          "Take your basal body temperature at the same time every morning for a week to establish a follicular baseline.",
        body: "FAM accuracy depends on consistent timing more than equipment. The chart is built around that timing assumption.",
        ctaLabel: "Open the FAM chart",
        ctaPath: "/free/ovulation-fertility-awareness-kit",
      },
      {
        step: 3,
        subject: "FAM data is among the most sensitive a person logs",
        preview: "Conception intentions and fertile-window timing in one record.",
        opening:
          "FAM tracking data - conception intentions, fertile window timing, and cycle length - is among the most sensitive data a person can record.",
        body: "It should not live on someone else's server where it could be subpoenaed or breached. The chart is paper or local-first by design.",
        ctaLabel: "Read about reproductive privacy laws",
        ctaPath: "/period-tracker-privacy",
      },
      {
        step: 4,
        subject: "Three cycles before fertility decisions",
        preview: "FAM is a learned method, not an installed feature.",
        opening:
          "Use the chart for at least three cycles before making fertility decisions based on the pattern.",
        body: "FAM is a learned method, not an installed feature. The chart is the discipline tool - pair it with a course or with Taking Charge of Your Fertility for the method itself.",
        ctaLabel: "Read the FAM guide",
        ctaPath: "/resources/guides/fertility-awareness-method-complete-guide",
      },
      {
        step: 5,
        subject: "FAM data on your device, not in the cloud",
        preview: "Floriva is built for exactly this kind of sensitive record.",
        opening:
          "Floriva's local-first design fits FAM data better than any cloud-backed alternative.",
        body: "Conception timing and fertile windows shouldn't be vendor records. They can be useful to you and invisible to anyone else.",
        ctaLabel: "See on-device storage",
        ctaPath: "/resources/guides/on-device-storage-period-tracker",
      },
      {
        step: 6,
        subject: "FAM requires daily practice",
        preview: "There's no autocapture for cervical mucus.",
        opening:
          "FAM requires consistent daily practice - the chart is the discipline tool, not a substitute for learning the method.",
        body: "Cycle-tracking apps that simulate FAM with calendar math don't actually replicate the method. The chart, the course, and the practice are the method.",
        ctaLabel: "Read the FAM complete guide",
        ctaPath: "/resources/guides/fertility-awareness-method-complete-guide",
      },
      {
        step: 7,
        subject: "More FAM resources",
        preview: "The long-form guide stays close to the method.",
        opening:
          "The long-form FAM guide expands the chart with the method context required to use it well.",
        ctaLabel: "Read the FAM complete guide",
        ctaPath: "/resources/guides/fertility-awareness-method-complete-guide",
      },
      {
        step: 8,
        subject: "Keep the chart. Keep it on paper or your device.",
        preview: "FAM data has no business being a vendor record.",
        opening:
          "Use the chart as long as you're practicing FAM - typically years.",
        body: "Floriva is built so the most sensitive parts of cycle data stay with you. FAM data is the clearest example of why that constraint matters.",
        ctaLabel: "See Floriva privacy features",
        ctaPath: "/privacy-features",
      },
    ],
  }),
  resource({
    slug: "hormone-health-monthly-log",
    title: "Hormone Health Monthly Log",
    description:
      "Track sleep, energy, mood, and symptoms by cycle phase across 3 months to identify hormonal patterns.",
    sequence: [
      {
        step: 2,
        subject: "Today's sleep + cycle phase",
        preview: "That's the entire practice in its smallest form.",
        opening:
          "Rate your sleep quality for today and note which cycle phase you're in. That's the practice in its simplest form.",
        body: "The log is designed so a sparse three months still beats a perfect first week followed by abandonment.",
        ctaLabel: "Open the hormone log",
        ctaPath: "/free/thyroid-hormone-lab-organizer",
      },
      {
        step: 3,
        subject: "Mood and energy logs are behavioral health data",
        preview: "Apps share this kind of data with analytics platforms by default.",
        opening:
          "Monthly mood and energy logs are behavioral health data.",
        body: "Apps that share this data with analytics platforms create a detailed psychological profile from cycle data - the FTC's Flo action showed how this kind of behavioral information moves through advertising infrastructure.",
        ctaLabel: "Read the privacy red flags",
        ctaPath: "/resources/guides/period-app-privacy-red-flags",
      },
      {
        step: 4,
        subject: "Two cycles before drawing conclusions",
        preview: "Hormone signal vs noise needs more than a few weeks.",
        opening:
          "Complete one month of logs before drawing any conclusions.",
        body: "Hormone patterns require at least two to three cycles to distinguish signal from noise. The log's structure assumes you'll go back and re-read older months.",
        ctaLabel: "Read about low progesterone",
        ctaPath: "/resources/hormone-guides/low-progesterone-symptoms",
      },
      {
        step: 5,
        subject: "Hormone data on your device",
        preview: "Behavioral logs deserve the smallest leak surface possible.",
        opening:
          "Floriva is built so that mood, energy, and symptom logs stay on the device that produced them.",
        body: "There's no advertising-grade behavioral profile being assembled in parallel - and no vendor record to be subpoenaed or breached.",
        ctaLabel: "See on-device storage",
        ctaPath: "/resources/guides/on-device-storage-period-tracker",
      },
      {
        step: 6,
        subject: "Symptoms overlap. Logging is what separates signal from coincidence.",
        preview: "Hormone imbalance symptoms are notoriously non-specific.",
        opening:
          "Hormone imbalance symptoms overlap significantly.",
        body: "Consistent logging is what separates a recognizable pattern from coincidence. The log is sparse on purpose so the consistency is achievable.",
        ctaLabel: "Read the hormone guide",
        ctaPath: "/resources/hormone-guides/low-progesterone-symptoms",
      },
      {
        step: 7,
        subject: "More hormone health resources",
        preview: "Same lens, more clinical context.",
        opening:
          "If the log was useful, the hormone guide on low progesterone goes deeper without changing the lens.",
        ctaLabel: "Read the hormone guide",
        ctaPath: "/resources/hormone-guides/low-progesterone-symptoms",
      },
      {
        step: 8,
        subject: "Keep the log. Keep the profile off-server.",
        preview: "Multi-month behavioral data deserves the smallest leak surface possible.",
        opening:
          "Use the log as long as the patterns are useful to you.",
        body: "Floriva is built so a multi-month behavioral pattern stays on your device, not in a vendor's behavioral analytics pipeline.",
        ctaLabel: "See Floriva privacy features",
        ctaPath: "/privacy-features",
      },
    ],
  }),
  resource({
    slug: "period-tracker-privacy-comparison-matrix",
    title: "Period Tracker Privacy Comparison Matrix",
    description:
      "A 12-app, 15-criteria privacy scorecard covering data location, third-party SDKs, FTC history, encryption, and jurisdiction.",
    sequence: [
      {
        step: 2,
        subject: "Pick one criterion. Rank three apps.",
        preview: "Don't read the whole matrix. Use the one column that matters to you.",
        opening:
          "Pick one criterion that matters most to you and rank your three candidate apps by that single factor before considering anything else.",
        body: "Most readers can drop more than half the matrix once their non-negotiable column is filled in.",
        ctaLabel: "Open the comparison matrix",
        ctaPath: "/free/period-app-privacy-audit-kit",
      },
      {
        step: 3,
        subject: "Why architectural facts beat self-reported claims",
        preview: "The FTC's Flo action revealed how often privacy claims are unenforced.",
        opening:
          "Most period trackers self-report privacy claims that the FTC's Flo action revealed to be unenforced.",
        body: "The matrix prefers architectural facts - where data lives, what SDKs ship - over marketing language. Those facts are independently verifiable; the marketing isn't.",
        ctaLabel: "Read the privacy red flags guide",
        ctaPath: "/resources/guides/period-app-privacy-red-flags",
      },
      {
        step: 4,
        subject: "Open your current app's settings tonight",
        preview: "The data-sharing screen will tell you more than any policy.",
        opening:
          "Open your current app's settings and look for a \"data sharing\" or \"analytics partners\" section.",
        body: "What you find there often tells you more than the privacy policy does. The matrix's columns map directly to what's typically buried in those screens.",
        ctaLabel: "Compare privacy-first trackers",
        ctaPath: "/resources/best/best-private-period-tracker-apps",
      },
      {
        step: 5,
        subject: "Where Floriva sits on the matrix",
        preview: "Local-first means several columns simply don't apply.",
        opening:
          "Floriva's row on the matrix is intentionally short.",
        body: "When cycle data stays on the device, the columns about server location, third-party SDKs, and encrypted-cloud key management either shrink or stop applying.",
        ctaLabel: "See on-device storage",
        ctaPath: "/resources/guides/on-device-storage-period-tracker",
      },
      {
        step: 6,
        subject: "Privacy comparisons feel abstract until they aren't",
        preview: "The matrix turns policy language into a concrete shortlist.",
        opening:
          "Privacy comparisons feel abstract until you map them to actual decisions.",
        body: "The matrix exists to translate policy language into a concrete app shortlist - usually a much smaller one than people expect.",
        ctaLabel: "Read the architecture guide",
        ctaPath: "/resources/guides/period-app-privacy-architecture-guide",
      },
      {
        step: 7,
        subject: "The privacy-first tracker shortlist",
        preview: "Same matrix, narrower starting set.",
        opening:
          "If you'd rather start with a pre-filtered shortlist, the privacy-first tracker comparison page uses the same matrix lens.",
        ctaLabel: "Read the privacy-first list",
        ctaPath: "/resources/best/best-private-period-tracker-apps",
      },
      {
        step: 8,
        subject: "Keep the matrix. Re-run it as apps change.",
        preview: "App updates and acquisitions can change the matrix entries.",
        opening:
          "App acquisitions, policy changes, and SDK updates can shift matrix rows quickly.",
        body: "Floriva is built so its row on the matrix stays narrow regardless of when you re-check it: by architecture, not by promise.",
        ctaLabel: "See Floriva privacy features",
        ctaPath: "/privacy-features",
      },
    ],
  }),
  resource({
    slug: "cycle-tracking-starter-kit-teens",
    title: "Cycle Tracking Starter Kit for Teens",
    description:
      "A parent and teen co-guide for private period tracking, including COPPA context, school device risks, and conversation starters.",
    sequence: [
      {
        step: 2,
        subject: "Ask which tracker their friends use",
        preview: "That one question opens the conversation the kit is designed for.",
        opening:
          "Ask your teen which period app their friends use, then check that app's privacy policy together.",
        body: "That one conversation often surfaces the issue the kit is built around: teens install whichever tracker is most popular at school, not the one with the cleanest privacy posture.",
        ctaLabel: "Open the teen kit",
        ctaPath: "/free/first-period-starter-kit",
      },
      {
        step: 3,
        subject: "School devices, ad SDKs, and COPPA",
        preview: "Teen-targeted apps frequently rely on ad-SDK monetization.",
        opening:
          "Teen-targeted apps frequently rely on ad-SDK monetization with COPPA exposure.",
        body: "School devices add MDM visibility into browsing and app installs that most families don't realize exists. The kit covers both because they tend to overlap on the same phone.",
        ctaLabel: "Read about school devices",
        ctaPath: "/resources/guides/school-devices-period-tracking",
      },
      {
        step: 4,
        subject: "Read it together once",
        preview: "The joint review is the part that builds privacy literacy.",
        opening:
          "Read the kit together with your teen before they install any app.",
        body: "The joint review is the part that builds privacy literacy - not the kit itself. The conversation starters are written for that joint reading session.",
        ctaLabel: "Read the best teen tracker list",
        ctaPath: "/resources/best/best-period-tracker-for-teens",
      },
      {
        step: 5,
        subject: "Why on-device matters more for teens",
        preview: "Teen accounts get reused, transferred, and audited.",
        opening:
          "Teen accounts move between devices, get reused, and sometimes get audited by adults.",
        body: "Local-first storage keeps cycle data tied to the device the teen actually uses, instead of a vendor account that might outlive the phone, the relationship, or the school year.",
        ctaLabel: "See on-device storage",
        ctaPath: "/resources/guides/on-device-storage-period-tracker",
      },
      {
        step: 6,
        subject: "Don't make it a fight",
        preview: "The kit is non-judgmental on purpose.",
        opening:
          "The kit is written non-judgmentally on purpose.",
        body: "Teens who feel scolded reinstall the original app the next week. The conversation starters are built around redirecting choice, not banning apps.",
        ctaLabel: "Read about teen tracker safety",
        ctaPath: "/resources/best/best-period-tracker-for-teens",
      },
      {
        step: 7,
        subject: "Best teen period trackers",
        preview: "Same lens, narrower set of recommended apps.",
        opening:
          "If you want a pre-filtered list of teen-appropriate trackers, the best-for-teens page uses the same lens as the kit.",
        ctaLabel: "Read the teen tracker list",
        ctaPath: "/resources/best/best-period-tracker-for-teens",
      },
      {
        step: 8,
        subject: "Keep the kit. Re-read it next year.",
        preview: "Teen tracking decisions change every school year.",
        opening:
          "Tracker decisions tend to change every school year - friends switch, devices change, and apps get acquired.",
        body: "Floriva is built so the same answer holds across all of those changes: cycle data on the device, not on someone else's servers.",
        ctaLabel: "See Floriva privacy features",
        ctaPath: "/privacy-features",
      },
    ],
  }),
  resource({
    slug: "postpartum-period-return-tracker",
    title: "Postpartum Period Return Tracker",
    description:
      "A printable log for tracking lochia, first postpartum period, breastfeeding impact, and timing red flags for provider follow-up.",
    sequence: [
      {
        step: 2,
        subject: "One line is enough today",
        preview: "Today's flow level and color. That's the whole habit.",
        opening:
          "Note today's flow level and color in one line. That's enough to start a usable record without committing to anything more.",
        body: "The tracker is designed so a sparse log is still clinically useful - postpartum patterns matter more than the precision of any single day.",
        ctaLabel: "Open the postpartum tracker",
        ctaPath: "/free/perimenopause-symptom-tracker",
      },
      {
        step: 3,
        subject: "Postpartum data is a sensitive category on its own",
        preview: "It has appeared in custody and benefits proceedings.",
        opening:
          "Postpartum data is among the most sensitive reproductive health data a person logs.",
        body: "Cloud-stored postpartum patterns combined with location data create a record that has appeared in custody and benefits proceedings. The tracker is paper or local-first because of that.",
        ctaLabel: "Read about subpoenas and period data",
        ctaPath: "/resources/privacy-in-practice/who-can-legally-get-your-period-data",
      },
      {
        step: 4,
        subject: "Tell the difference: lochia vs period",
        preview: "Color and flow are the two most diagnostic signals.",
        opening:
          "Distinguish lochia from period bleeding using the color and flow guide in the tracker.",
        bullets: [
          "Heavy bleeding past 6 weeks postpartum is a flag.",
          "Foul odor is a flag.",
          "Fever with bleeding is a flag.",
        ],
        ctaLabel: "Read the postpartum guide",
        ctaPath: "/resources/life-stage-guides/postpartum-period-return",
      },
      {
        step: 5,
        subject: "Postpartum data on your device",
        preview: "Local-first fits postpartum tracking better than any cloud option.",
        opening:
          "Floriva is built so postpartum tracking stays on your device, not in a vendor's analytics pipeline.",
        body: "The clinical value is between you and your provider. There's no third party that needs the data to be useful.",
        ctaLabel: "See on-device storage",
        ctaPath: "/resources/guides/on-device-storage-period-tracker",
      },
      {
        step: 6,
        subject: "Postpartum bleeding feels chaotic",
        preview: "Evidence-based timelines exist by feeding method.",
        opening:
          "Postpartum bleeding feels chaotic and individual, but evidence-based timelines exist by feeding method.",
        body: "The tracker translates those into something you can compare against your own pattern, without making you the only person tracking it from scratch.",
        ctaLabel: "Read the postpartum return guide",
        ctaPath: "/resources/life-stage-guides/postpartum-period-return",
      },
      {
        step: 7,
        subject: "More on postpartum cycle return",
        preview: "Same lens, more depth on each feeding scenario.",
        opening:
          "If the tracker was useful, the long-form postpartum guide expands the same lens with more depth on each feeding scenario.",
        ctaLabel: "Read the postpartum guide",
        ctaPath: "/resources/life-stage-guides/postpartum-period-return",
      },
      {
        step: 8,
        subject: "Keep the tracker. Keep the data close.",
        preview: "The most sensitive months deserve the smallest leak surface.",
        opening:
          "Use the tracker through the months you actually need it, then archive it somewhere private.",
        body: "Floriva is built around the constraint that the most sensitive cycle data - including postpartum patterns - should stay on the device that produced it.",
        ctaLabel: "See Floriva privacy features",
        ctaPath: "/privacy-features",
      },
    ],
  }),
  resource({
    slug: "employer-wellness-app-privacy-audit",
    title: "Employer Wellness App Privacy Audit Checklist",
    description:
      "A 20-item checklist for evaluating workplace health apps including Ovia, Castlight, and Virgin Pulse.",
    sequence: [
      {
        step: 2,
        subject: "Search the policy for one word",
        preview: "Find \"aggregate\" or \"employer\" - that's where the data flow lives.",
        opening:
          "Open your wellness app's privacy notice and search for the words \"aggregate\" or \"employer.\"",
        body: "That section describes the actual data flow employees care about - usually in language much more granular than the marketing materials suggest.",
        ctaLabel: "Open the wellness audit",
        ctaPath: "/free/period-app-privacy-audit-kit",
      },
      {
        step: 3,
        subject: "Aggregate doesn't always mean anonymous",
        preview: "Small workgroups can be re-identified from \"aggregate\" reports.",
        opening:
          "Ovia for employers, Castlight, and Virgin Pulse share aggregate reproductive-health data with employer HR teams.",
        body: "The aggregation thresholds are often low enough that small workgroups can be re-identified. The audit's questions exist because that's the gap most employees don't realize is there.",
        ctaLabel: "Read about insurance period data risks",
        ctaPath: "/resources/privacy-in-practice/who-can-legally-get-your-period-data",
      },
      {
        step: 4,
        subject: "Run the checklist before you enroll",
        preview: "Once the data is in, getting it out is harder than not opting in.",
        opening:
          "Run the checklist against your employer's wellness platform before enrolling.",
        body: "Compare the data flows your employer can see against the wellness incentive on offer. For most employees, the financial incentive does not offset the data exposure.",
        ctaLabel: "Read the privacy red flags",
        ctaPath: "/resources/guides/period-app-privacy-red-flags",
      },
      {
        step: 5,
        subject: "Why a separate, local-first tracker matters here",
        preview: "Personal cycle tracking shouldn't share infrastructure with the wellness app.",
        opening:
          "If you've already enrolled in an employer wellness app, a separate local-first tracker is the cleanest way to keep personal cycle data out of that pipeline.",
        body: "Floriva is built for that role: cycle data on your device, not connected to any employer or insurer system.",
        ctaLabel: "See on-device storage",
        ctaPath: "/resources/guides/on-device-storage-period-tracker",
      },
      {
        step: 6,
        subject: "HR pitches wellness apps as benefits",
        preview: "The data architecture is more granular than the pitch suggests.",
        opening:
          "HR pitches wellness apps as health benefits, but the data architecture often routes reproductive and behavioral data through aggregate reports that are more granular than employees expect.",
        body: "The audit isn't anti-wellness. It's pro-informed-consent. Knowing what the data flow actually is changes whether the trade is worth it for you.",
        ctaLabel: "Read about insurance risks",
        ctaPath: "/resources/privacy-in-practice/who-can-legally-get-your-period-data",
      },
      {
        step: 7,
        subject: "Insurance period data - the deeper read",
        preview: "Same lens applied to the insurance side of the same data.",
        opening:
          "If the wellness audit was useful, the insurance period-data piece extends the same lens to the insurer side.",
        ctaLabel: "Read the insurance piece",
        ctaPath: "/resources/privacy-in-practice/who-can-legally-get-your-period-data",
      },
      {
        step: 8,
        subject: "Keep the audit. Keep cycle data separate.",
        preview: "Personal tracking shouldn't share infrastructure with employer wellness.",
        opening:
          "Use the audit before any wellness platform - and keep personal cycle tracking on a separate, local-first app.",
        body: "Floriva is built so core cycle records stay local-first instead of flowing through an employer or insurer pipeline. That separation is the whole point.",
        ctaLabel: "See Floriva privacy features",
        ctaPath: "/privacy-features",
      },
    ],
  }),
  resource({
    slug: "period-data-digital-will",
    title: "Period Data Digital Will Template",
    description:
      "A fill-in template for documenting where your reproductive health data lives and how to access or delete it across devices.",
    sequence: [
      {
        step: 2,
        subject: "List three apps. That's the inventory.",
        preview: "Three apps that hold any cycle, fertility, or reproductive health data.",
        opening:
          "List the three apps on your phone right now that hold any cycle, fertility, or reproductive health data. That's your starting inventory.",
        body: "Most readers underestimate the count. The template is designed so the inventory section forces honesty before the access plan.",
        ctaLabel: "Open the digital will template",
        ctaPath: "/free/delete-period-data-guide",
      },
      {
        step: 3,
        subject: "Data outlives device access",
        preview: "Lost phones don't delete cloud records.",
        opening:
          "Reproductive health data on lost or unrecoverable devices often persists indefinitely on company servers.",
        body: "Without a deletion plan, that data continues to accumulate jurisdictional and breach exposure long after the device is gone. The template exists to make the cleanup portable.",
        ctaLabel: "Read the deletion guide",
        ctaPath: "/free/delete-period-data-guide",
      },
      {
        step: 4,
        subject: "Designate one trusted person",
        preview: "Pick someone, store the template somewhere they can reach.",
        opening:
          "Designate one trusted person and store the completed template somewhere they can access if you lose phone access.",
        body: "Don't store it in the cloud where it could be breached alongside the data it describes. Print it, save it offline, or use a local note app.",
        ctaLabel: "Read about secure backup",
        ctaPath: "/resources/privacy-in-practice/lock-down-period-data-on-your-phone",
      },
      {
        step: 5,
        subject: "Local-first reduces what the will needs to cover",
        preview: "Less server data means a shorter inventory.",
        opening:
          "Floriva's local-first design shrinks what a digital will needs to cover.",
        body: "If cycle data lives on your device, the inventory section is mostly already done - the data, the access plan, and the deletion path are all on the same physical phone.",
        ctaLabel: "See on-device storage",
        ctaPath: "/resources/guides/on-device-storage-period-tracker",
      },
      {
        step: 6,
        subject: "Digital wills feel premature",
        preview: "Until they aren't. Make the inventory portable while it's still abstract.",
        opening:
          "Digital wills feel premature until they aren't.",
        body: "The template is built so the inventory becomes portable before it becomes a problem. That's the same logic that drives every other privacy decision in the kit.",
        ctaLabel: "Read about secure backup",
        ctaPath: "/resources/privacy-in-practice/lock-down-period-data-on-your-phone",
      },
      {
        step: 7,
        subject: "Pair this with the deletion guide",
        preview: "Inventory + deletion plan in one workflow.",
        opening:
          "Pair the digital will with the deletion guide for one continuous workflow: inventory the data, then plan the deletion path for each entry.",
        ctaLabel: "Read the deletion guide",
        ctaPath: "/free/delete-period-data-guide",
      },
      {
        step: 8,
        subject: "Keep the template. Shrink the inventory.",
        preview: "The shortest digital will is the one that doesn't need many entries.",
        opening:
          "Keep the template handy and re-run it whenever you install a new app or change devices.",
        body: "Floriva is built so the inventory stays short by default - most reproductive-health data simply isn't on someone else's server to inventory.",
        ctaLabel: "See Floriva privacy features",
        ctaPath: "/privacy-features",
      },
    ],
  }),
] as const satisfies readonly LeadMagnetResource[];

const leadMagnetBySlug: ReadonlyMap<string, LeadMagnetResource> = new Map(
  leadMagnetResources.map((resource) => [resource.slug, resource]),
);

export function getLeadMagnetResource(slug: string): LeadMagnetResource | null {
  return leadMagnetBySlug.get(slug) ?? null;
}

export function getLeadMagnetSequenceEmail(
  resource: LeadMagnetResource,
  step: LeadMagnetSequenceStep,
): LeadMagnetSequenceEmail {
  return resource.sequence.find((email) => email.step === step)!;
}

export function selectLeadMagnetForPath(pathname: string): LeadMagnetResource {
  const normalized = pathname.toLowerCase();
  const segments = normalized.split(/[/?#]/).flatMap((part) => part.split("-")).filter(Boolean);

  if (normalized.includes("subpoena")) {
    return leadMagnetBySlug.get("subpoena-response-template")!;
  }

  if (normalized.includes("delete") || normalized.includes("deletion") || normalized.includes("export")) {
    return leadMagnetBySlug.get("data-deletion-request-guide")!;
  }

  if (normalized.includes("texas") || normalized.includes("louisiana")) {
    return leadMagnetBySlug.get("texas-louisiana-scorecard-bundle")!;
  }

  if (normalized.includes("florida") || normalized.includes("georgia")) {
    return leadMagnetBySlug.get("florida-georgia-scorecard-bundle")!;
  }

  if (segments.includes("flo")) {
    return leadMagnetBySlug.get("flo-to-floriva-switcher-guide")!;
  }

  if (normalized.includes("pcos")) {
    return leadMagnetBySlug.get("pcos-symptom-tracker")!;
  }

  if (normalized.includes("endometriosis") || normalized.includes("intense-period-pain")) {
    return leadMagnetBySlug.get("endometriosis-pain-diary")!;
  }

  if (normalized.includes("fertility") || normalized.includes("bbt") || normalized.includes("ovulation")) {
    return leadMagnetBySlug.get("fertility-awareness-method-chart")!;
  }

  if (
    normalized.includes("teen") ||
    normalized.includes("tween") ||
    normalized.includes("school") ||
    normalized.includes("first-period") ||
    normalized.includes("college") ||
    normalized.includes("dorm")
  ) {
    return leadMagnetBySlug.get("cycle-tracking-starter-kit-teens")!;
  }

  if (normalized.includes("postpartum") || normalized.includes("breastfeeding")) {
    return leadMagnetBySlug.get("postpartum-period-return-tracker")!;
  }

  if (normalized.includes("perimenopause") || normalized.includes("hormone")) {
    return leadMagnetBySlug.get("hormone-health-monthly-log")!;
  }

  if (normalized.includes("cycle-syncing")) {
    return leadMagnetBySlug.get("cycle-syncing-planner")!;
  }

  if (normalized.includes("/period-tracker-privacy")) {
    return leadMagnetBySlug.get("state-risk-scorecard")!;
  }

  if (normalized.includes("paper") || normalized.includes("offline") || normalized.includes("without-app")) {
    return leadMagnetBySlug.get("cycle-tracking-starter-template")!;
  }

  if (normalized.includes("dobbs") || normalized.includes("roe")) {
    return leadMagnetBySlug.get("post-dobbs-digital-safety-kit")!;
  }

  if (
    normalized.includes("pmdd") ||
    normalized.includes("premenstrual") ||
    segments.includes("pms") ||
    normalized.includes("migraine")
  ) {
    return leadMagnetBySlug.get("hormone-health-monthly-log")!;
  }

  if (
    normalized.includes("adenomyosis") ||
    normalized.includes("cramp") ||
    normalized.includes("period-pain")
  ) {
    return leadMagnetBySlug.get("endometriosis-pain-diary")!;
  }

  // Clinical / generic symptom-tracking pages with no dedicated resource fall back to the reusable
  // cycle-tracking template (a real, deliverable PDF) instead of the privacy checklist. Match on
  // path segments to avoid substring false-positives (e.g. "uti" inside "solution").
  if (
    [
      "bleeding", "clot", "fibroid", "cyst", "ovarian", "uti", "urinary", "discharge", "odor",
      "vulvar", "biopsy", "visit", "birth", "contraception", "missed", "calculator", "sleep",
      "stain", "leak", "away", "record",
    ].some((token) => segments.includes(token))
  ) {
    return leadMagnetBySlug.get("cycle-tracking-starter-template")!;
  }

  return leadMagnetBySlug.get("period-app-privacy-audit-checklist")!;
}
