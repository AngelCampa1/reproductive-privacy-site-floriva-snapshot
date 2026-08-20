import type {
  ClarityCard,
  CompetitorCard,
  FaqItem,
} from "../config";
import type { StoreTargetKey } from "../store-targets";
import {
  leadMagnetResources,
  type LeadMagnetResource,
} from "./lead-magnet-email-data";

export type KnowledgeDomain =
  | "marketing"
  | "app"
  | "emails"
  | "contact"
  | "privacy"
  | "pricing"
  | "support"
  | "competitors"
  | "rules";

export type KnowledgeBotUse = "sales" | "help" | "both";

export type KnowledgeAction =
  | {
      kind: "route";
      label: string;
      target: string;
    }
  | {
      kind: "store";
      label: string;
      target: StoreTargetKey;
    }
  | {
      kind: "email";
      label: string;
      target: "public-support";
    };

export type PublicKnowledgeEntry = {
  audience: readonly string[];
  botUse: KnowledgeBotUse;
  details: readonly string[];
  domain: KnowledgeDomain;
  id: string;
  publicSafe: true;
  sourceRoutes: readonly string[];
  suggestedActions: readonly KnowledgeAction[];
  summary: string;
  title: string;
  topics: readonly string[];
};

export type StaticKnowledgeSection = {
  body?: string;
  bullets?: readonly string[];
  heading?: string;
  id?: string;
  link?: {
    href: string;
    label: string;
  };
};

export type StaticKnowledgePage = {
  description: string;
  sections: readonly StaticKnowledgeSection[];
  title: string;
};

export type HubKnowledge = {
  path: string;
  title: string;
  description: string;
  sections?: readonly {
    title: string;
    description: string;
    collections: readonly string[];
  }[];
  guideLinks?: readonly {
    eyebrow: string;
    title: string;
    body: string;
    href: string;
  }[];
};

export type DownloadCtaKnowledge = {
  eyebrow: string;
  headline: string;
  body: string;
  leadMagnetSlug: string;
  leadMagnetLabel: string;
};

export type LeadMagnetUiKnowledge = {
  form: {
    closeLabel: string;
    emailLabel: string;
    errorMessage: string;
    honeypotLabel: string;
    inlineDescription: string;
    inlineEyebrow: string;
    inlineHeadingTemplate: string;
    placeholder: string;
    popupEyebrow: string;
    submitLabel: string;
    submittingLabel: string;
    successBody: string;
    successHeading: string;
  };
  popupExcludedPathPrefixes: readonly string[];
  popupStorageKeys: {
    dismissedUntil: string;
    sessionShown: string;
    submittedUntil: string;
  };
};

export type EmailShellKnowledge = {
  brandAlt: string;
  brandLabel: string;
  delivery: {
    body: string;
    buttonLabel: string;
    linkFallback: string;
    previewTemplate: string;
    subjectTemplate: string;
  };
  footer: {
    reasonTemplate: string;
    privacyLine: string;
    unsubscribeLabel: string;
  };
};

export type AppCapabilityKnowledge = {
  coreStorage: {
    status: "local-first";
    publicLine: string;
  };
  sync: {
    status: "optional-e2ee-ciphertext";
    publicLine: string;
  };
  imports: {
    status: "check-current-onboarding";
    publicLine: string;
  };
  storeAvailability: {
    status: "configured-store-redirects";
    publicLine: string;
  };
};

export type PdfBoilerplateKnowledge = {
  author: string;
  brandEyebrow: string;
  disclaimer: string;
  aboutHeading: string;
  aboutBody: string;
  learnMoreLabel: string;
  learnMorePath: string;
};

export type SocialClaimAtom = {
  id: string;
  pillar: string;
  topic: string;
  fact: string;
  takeaway: string;
  source: string;
  sourceRoutes: readonly string[];
  tags: readonly string[];
  freshness: string;
  publicSafe: true;
};

export type StateRiskTierKnowledge = {
  key: "banned" | "restricted" | "legal-access" | "protected" | "other";
  label: string;
  description: string;
};

/** Copy for one JourneyStep on the homepage app-showcase. */
export type JourneyStepCopy = {
  eyebrow: string;
  heading: string;
  body: string;
};

/** Copy for one BentoCell on the homepage secondary-features grid. Mirrors
 * BentoCellSize/BentoCellTone from src/components/bento-grid.tsx without
 * importing the component module into the data layer. */
export type BentoItemCopy = {
  size: "sm" | "md" | "wide" | "tall";
  tone: "paper" | "berry-soft" | "moss-soft" | "canvas-deep";
  eyebrow: string;
  title: string;
  body?: string;
  stat?: { value: string; label: string };
};

const homepage = {
  badges: ["Private cycle logs", "No readable central cycle database", "No account needed for core tracking"],
  competitors: [
    {
      slug: "flo",
      name: "Flo Health",
      pricing: "Free / Premium subscription",
      weakness:
        "FTC action and 2025 settlement tied to sharing reproductive-health data with advertising and analytics infrastructure.",
    },
    {
      slug: "clue",
      name: "Clue",
      pricing: "Free / Clue Plus subscription",
      weakness:
        "Cloud-backed model means the company still holds the data, even when privacy copy sounds strong.",
    },
    {
      slug: "natural-cycles",
      name: "Natural Cycles",
      pricing: "Subscription required",
      weakness:
        "Premium pricing with a cloud-first storage model and no structural privacy differentiator.",
    },
    {
      slug: "stardust",
      name: "Stardust",
      pricing: "Free / subscription",
      weakness:
        "Marketing-heavy privacy language without the same technical certainty as strict local-only storage.",
    },
  ] satisfies readonly CompetitorCard[],
  faqs: [
    {
      q: "Is cycle data really safer on-device than in the cloud?",
      a: "On-device storage removes the server that can be breached, subpoenaed, or sold access to. Cloud-first trackers can state strong privacy intent and still ship data through ad and analytics SDKs. That gap is exactly what the Flo FTC action documented.",
    },
    {
      q: "Why focus so much on Flo and Clue specifically?",
      a: "They are two of the apps many switchers compare first. The product story starts where the trust broke: documented SDK-layer sharing for Flo, and a cloud-backed architecture for Clue that keeps the data on a company server no matter how the policy reads.",
    },
    {
      q: "Does HIPAA protect my period tracking data?",
      a: "No. Consumer period trackers are not federally covered health apps under HIPAA. That is why architecture matters more than reassuring policy copy. The state pages translate that gap into the reproductive-data risk that actually applies where you live.",
    },
  ] satisfies readonly FaqItem[],
  heroHighlights: [
    "Trust-first, not feature-first",
    "State-by-state privacy context",
    "On-device by default",
  ],
  heroTrustSignal: "No account needed. Works offline.",
  positioning:
    "Floriva is a private, on-device period tracker for people leaving Flo, Clue, and other cloud-backed apps. Cycle records stay on your device, and Floriva cannot read them, even with encrypted sync on.",
  problemCards: [
    {
      eyebrow: "The problem",
      title: "Cloud-backed trackers keep your reproductive history somewhere else.",
      body: "When period data lives on company servers, it can become part of a breach, an ad or analytics pipeline, a data-broker trail, or a legal request.",
    },
    {
      eyebrow: "The product",
      title: "Floriva gives you cycle tracking without sending the logs to Floriva.",
      body: "Track periods, symptoms, fertility signs, notes, patterns, and appointment prep while keeping reproductive-health records local to your device.",
    },
    {
      eyebrow: "The method",
      title: "Privacy comes from architecture, not a promise to behave.",
      body: "On-device storage, no ad-SDK business model, no account required for core use, and no central reproductive-health database reduce what can be sold, breached, or requested.",
    },
  ],
  productHighlights: [
    {
      eyebrow: "Track",
      title: "Cycles, symptoms, notes, and fertility signs",
      body: "Floriva is still a period tracker first: daily logs, recurring patterns, cycle history, and private notes for the health details you actually need to remember.",
    },
    {
      eyebrow: "Review",
      title: "Patterns you can use without a cloud profile",
      body: "Keep a clearer record for PCOS, endometriosis, PMDD, perimenopause, postpartum changes, fertility awareness, or doctor appointments without turning that record into company-held data.",
    },
    {
      eyebrow: "Switch",
      title: "A safer path away from mainstream trackers",
      body: "Use Floriva's comparisons and guides to leave Flo, Clue, and other cloud-backed apps with a better understanding of what changes and what still deserves caution.",
    },
  ] satisfies readonly ClarityCard[],
  audiencePaths: [
    {
      eyebrow: "Switching trackers",
      title: "Leaving Flo, Clue, or another app",
      body: "See what changes when your cycle stops living on someone else's server.",
      href: "/compare",
      linkLabel: "Compare private trackers",
    },
    {
      eyebrow: "Worried about the law",
      title: "Checking your state's privacy risk",
      body: "See how abortion law and privacy rules affect period apps where you live.",
      href: "/period-tracker-privacy",
      linkLabel: "See privacy by state",
    },
    {
      eyebrow: "Tracking a condition",
      title: "Managing PCOS, PMDD, or endometriosis",
      body: "Keep clear records for appointments without adding to a company profile.",
      href: "/resources",
      linkLabel: "Read tracking guides",
    },
  ] satisfies readonly ClarityCard[],
  subheadline:
    "Log your period, symptoms, and moods in one simple app. Your cycle history lives on your phone, not a company database.",
  tagline: "Track your cycle without the cloud.",
  /** Word inside `tagline` to render as the single Newsreader italic accent in the hero H1. */
  heroEmphasisWord: "cloud",
  journey: [
    {
      eyebrow: "Log",
      heading: "Track the day in a few taps.",
      body: "Log flow, mood, energy, and symptoms as they happen. Skip anything you don't want to track.",
    },
    {
      eyebrow: "See ahead",
      heading: "Know what's coming, with honest odds.",
      body: 'Floriva estimates your next period and fertile window from your own logs. Each estimate says how sure it is, like "Medium confidence."',
    },
    {
      eyebrow: "Understand",
      heading: "Watch your patterns add up.",
      body: "See your cycle history over time. Get extra support if you track PCOS, PMDD, or endometriosis.",
    },
    {
      eyebrow: "Private by default",
      heading: "Lock it down, or clear it out.",
      body: "Turn on Face ID or a fingerprint lock. Delete everything, any time.",
    },
  ] satisfies readonly JourneyStepCopy[],
  bento: [
    {
      size: "wide",
      tone: "berry-soft",
      eyebrow: "Switching in",
      title: "Bring your old records with you",
      body: "Import your history from Flo or Clue, so you're not starting from zero.",
    },
    {
      size: "sm",
      tone: "paper",
      eyebrow: "Backups",
      title: "Your backup, your key",
      body: "Turn on encrypted backup and set your own passphrase. Restore it whenever you need to.",
    },
    {
      size: "sm",
      tone: "moss-soft",
      eyebrow: "App lock",
      title: "Face ID, or your thumb",
      body: "Lock the app with Face ID or a fingerprint. Your cycle stays behind one more door.",
    },
    {
      size: "tall",
      tone: "canvas-deep",
      eyebrow: "Available in",
      title: "English, Spanish, Japanese, and more",
      stat: { value: "8", label: "languages supported" },
    },
    {
      size: "sm",
      tone: "paper",
      eyebrow: "Reminders",
      title: "A quiet nudge",
      body: "Turn on gentle local reminders for logging, your period, or birth control.",
    },
    {
      size: "md",
      tone: "berry-soft",
      eyebrow: "Condition-aware",
      title: "Built for PCOS, PMDD, and endo",
      body: "Get insights made for the conditions you already track.",
    },
    {
      size: "sm",
      tone: "paper",
      eyebrow: "Offline",
      title: "Works with zero bars",
      body: "Floriva works fully offline. Log anywhere, even with no signal.",
    },
    {
      size: "sm",
      tone: "moss-soft",
      eyebrow: "Delete anytime",
      title: "Gone means gone",
      body: "Delete everything on your phone whenever you want. No support ticket needed.",
    },
  ] satisfies readonly BentoItemCopy[],
  privacy: {
    eyebrow: "How it works",
    heading: "Privacy is the architecture, not a promise",
    headingEmphasisWord: "architecture",
    paragraphs: [
      "Your period, mood, and symptom logs stay on your phone. You don't need an account to start. And there's no big shared database that holds everyone's cycle history.",
      "Turn on backup only if you want it. It's locked with a passphrase only you know. Even that copy stays private.",
    ],
  },
  storeCta: {
    heading: "Get Floriva on your phone",
    body: "Download for iPhone or Android to get started.",
    qrCaption: "Scan to get Floriva",
  },
} as const;

const staticPages = {
  get: {
    title: "Get Floriva",
    description: "Download Floriva for iPhone or Android. No account needed, and it works offline.",
    sections: [
      {
        heading: "Is Floriva free?",
        body: "No. Floriva is a paid app. It does not run ads or sell your data. You pick a plan inside the app.",
      },
      {
        heading: "Why there is no permanent free tier",
        body:
          "A free period tracker still needs a business model. Floriva charges directly so there is no pressure to build ad targeting, analytics pipelines, or a central reproductive-health database.",
        link: {
          href: "/compare/pricing",
          label: "Compare pricing with Flo, Clue, and Natural Cycles",
        },
      },
    ],
  },
  privacy: {
    title: "Floriva Privacy Policy",
    description:
      "How the Floriva website handles the limited information it collects, and what the Floriva app is designed to keep on your device.",
    sections: [
      {
        body:
          "Effective date: May 28, 2026. This policy explains how Floriva handles personal information on the Floriva website at floriva.app. The Floriva mobile app is described separately below. Because period, fertility, and reproductive-health information is among the most sensitive personal data there is, we have tried to describe our actual practices plainly rather than make broad promises.",
      },
      {
        heading: "Who we are",
        body:
          "Floriva is a privacy-focused period and reproductive-health product operated by Angel Campa. For any privacy question, or to exercise your rights, contact us at privacy@floriva.app. References to \"Floriva,\" \"we,\" or \"us\" mean that operator.",
      },
      {
        heading: "What the website collects",
        body:
          "The floriva.app website is primarily an informational and content site. We do not run product analytics, advertising SDKs, tracking pixels, social-media trackers, session replay, or third-party feedback widgets on the site. The only personal information we collect through the website is what you choose to give us when you request a free resource (a \"lead magnet\"): the email address you submit, which resource you requested, and the site page you requested it from.",
      },
      {
        heading: "Information collected automatically",
        bullets: [
          "When you submit the resource form, our hosting provider (Cloudflare) processes your IP address and a one-way (SHA-256) hash of your email so we can rate-limit abuse and spam. The IP-derived value and email hash are stored only for that anti-abuse purpose.",
          "We record email-delivery events for the resource you requested (for example, that a delivery was sent, duplicated, suppressed, or failed) so we can operate the delivery reliably and respond to your requests.",
          "If error monitoring is enabled, our error-monitoring provider may receive limited technical diagnostics about website errors. It is configured without session replay and without sending personal information by default. It does not receive reproductive-health information.",
          "Cloudflare, as our hosting and network provider, processes standard server and security logs (such as IP address and request metadata) to serve and protect the site.",
        ],
      },
      {
        heading: "What we do NOT collect on the website",
        body:
          "The website does not collect cycle history, period dates, symptoms, moods, fertility or TTC (trying-to-conceive) observations, birth-control details, pregnancy status, or any other in-app reproductive-health logs. We do not ask for your name, phone number, payment details, or precise geolocation on the website, and we do not use geofencing.",
      },
      {
        heading: "Why we use it and our legal bases (GDPR)",
        bullets: [
          "To send the free resource you asked for and prevent duplicate or abusive requests: this is necessary to perform the service you requested, and our legitimate interest in operating the site securely (GDPR Art. 6(1)(b) and 6(1)(f)).",
          "If you are added to a follow-up email sequence about Floriva, we rely on your consent or, where permitted, our legitimate interest, and every email includes an unsubscribe link (GDPR Art. 6(1)(a)/(f); PECR/ePrivacy where applicable).",
          "Email addresses you submit are not health data, but we treat reproductive-health interest contextually with care. We do not collect special-category health data through the website (GDPR Art. 9).",
        ],
      },
      {
        heading: "Third parties and sub-processors",
        bullets: [
          "Cloudflare - website hosting (Cloudflare Pages), serverless functions, the database that stores resource-request records (Cloudflare D1), file storage for the resources themselves (Cloudflare R2), the Turnstile anti-bot check on forms, and email delivery (Cloudflare Email Service) for the resource-delivery and follow-up emails to the address you submit.",
          "Error-monitoring provider - error and performance monitoring for the website (no session replay; personal-information sending disabled by default).",
          "We do not sell your personal information, and we do not share it with advertisers or data brokers.",
        ],
      },
      {
        heading: "International transfers",
        body:
          "Our providers (including Cloudflare, plus our error-monitoring provider) may process data on infrastructure located in the United States and other countries. Where personal data of individuals in the EU/UK is transferred outside those regions, we rely on appropriate safeguards such as the EU Standard Contractual Clauses and the UK Addendum, as offered by those providers.",
      },
      {
        heading: "Data retention",
        body:
          "We keep resource-request records (email address, requested resource, source page, and delivery events) for as long as needed to deliver the resource, prevent duplicate requests, manage your subscription status, and respond to privacy or deletion requests. Anti-abuse records (including the email hash and IP-derived value) are short-lived and used only for rate-limiting. If you unsubscribe or ask us to delete your record, we will do so subject to limited legal-retention needs.",
      },
      {
        heading: "Security",
        body:
          "Resource downloads are delivered through expiring, signed links, and forms are protected by an anti-bot check (Cloudflare Turnstile) and rate-limiting. The website is served over HTTPS. No method of transmission or storage is completely secure, and we cannot guarantee absolute security.",
      },
      {
        heading: "Your privacy rights",
        bullets: [
          "GDPR / UK GDPR: you may request access, correction, deletion, restriction, portability, and objection, and you may withdraw consent at any time. You can lodge a complaint with your supervisory authority.",
          "California (CCPA/CPRA): you may request to know, access, delete, and correct your personal information, and to opt out of sale or sharing. We do not sell or share personal information as those terms are defined.",
          "Washington My Health My Data Act, Nevada SB370, and similar consumer-health-data laws: to the extent any information we hold is treated as consumer health data, you may request to know what is collected and shared, access it, withdraw consent, and request deletion. We do not sell consumer health data and do not use geofencing around health facilities.",
          "To exercise any right, email privacy@floriva.app, ideally from the address you used. We will verify and respond within the timeframe the applicable law requires.",
        ],
      },
      {
        heading: "Children",
        body:
          "The Floriva website is not directed to children under 13 (or under the minimum age in your jurisdiction), and we do not knowingly collect their personal information through the website. If you believe a child has provided information, contact privacy@floriva.app and we will delete it.",
      },
      {
        heading: "Cookies and tracking",
        body:
          "The website does not use advertising or analytics cookies or cross-site tracking. Cloudflare may set strictly necessary cookies or tokens for security and bot mitigation (for example, Turnstile). The follow-up email service may use standard email open/click measurement; unsubscribe links are included in those emails.",
      },
      {
        heading: "The Floriva mobile app",
        body:
          "The Floriva app is a separate product reached through the current configured store links. It is designed so that cycle history, period dates, symptoms, moods, fertility/TTC observations, notes, and birth-control details remain local-first, with no account required for core tracking and no readable central cycle database. Optional encrypted sync sends only ciphertext Floriva cannot read. The app's full in-app privacy disclosures govern your use of the app.",
      },
      {
        heading: "Changes to this policy",
        body:
          "We may update this policy as the website or our providers change. We will update the effective date above and, for material changes, provide a more prominent notice where appropriate.",
      },
      {
        heading: "Contact",
        body:
          "Questions, requests, or complaints: privacy@floriva.app.",
        link: {
          href: "/privacy-features",
          label: "How on-device architecture actually works ->",
        },
      },
    ],
  },
  "privacy-features": {
    title: "Floriva Privacy Features",
    description:
      "How local-first cycle tracking removes privacy risks that policies alone cannot fix.",
    sections: [
      {
        body:
          "Most period trackers ask you to trust a privacy policy. Floriva reduces what you have to trust by keeping cycle history on the device where you record it.",
      },
      {
        heading: "What on-device architecture buys you",
        bullets: [
          "No readable central cycle database for the company to hand over under subpoena.",
          "Nothing to leak in a central breach.",
          "No room for advertising SDKs to slurp up reproductive data.",
        ],
      },
      {
        heading: "What it costs",
        body:
          "You give up some cloud convenience. That tradeoff is intentional: moving between devices should never quietly create a readable central copy that can be taken.",
        link: {
          href: "/period-tracker-privacy",
          label: "See how legal risk changes by state",
        },
      },
    ],
  },
  support: {
    title: "Floriva Support",
    description: "How to reach us about billing, bugs, and privacy questions.",
    sections: [
      {
        body:
          "Email support for anything - billing, bugs, privacy questions, or feedback.",
      },
      {
        heading: "What helps us respond faster",
        body:
          "For bugs: your device, app version, and the steps that reproduced it. For privacy questions: a link to the page or claim you're asking about.",
      },
      {
        id: "editorial-method",
        heading: "How we check our guides",
        body:
          "We check facts before we publish. When a guide links to a source, we keep that link on the page. We fix old facts when a source or product changes.",
      },
    ],
  },
  terms: {
    title: "Floriva Terms of Service",
    description: "The terms that apply when you use Floriva.",
    sections: [
      {
        body:
          "By using Floriva, you agree that the pages on floriva.app are informational, that nothing here creates a medical relationship, and that you are responsible for the health decisions you make based on what you read.",
      },
      {
        heading: "No warranty",
        body: "Floriva is provided as-is, without warranty of any kind.",
      },
    ],
  },
} as const satisfies Record<string, StaticKnowledgePage>;

const navigation = {
  nav: [
    { label: "Compare", href: "/compare" },
    { label: "Resources", href: "/resources" },
    { label: "By State", href: "/period-tracker-privacy" },
    { label: "Privacy Features", href: "/privacy-features" },
  ],
  footerGroups: [
    {
      heading: "Product",
      links: [
        { label: "Get the app", href: "/get" },
        { label: "Privacy features", href: "/privacy-features" },
        { label: "Privacy policy", href: "/privacy" },
        { label: "Support", href: "/support" },
      ],
    },
    {
      heading: "Switch",
      links: [
        { label: "Flo alternative", href: "/compare/alternatives/flo-app-alternative" },
        { label: "All alternatives", href: "/compare/alternatives" },
        { label: "Flo vs Clue", href: "/compare/versus/flo-vs-clue-privacy-comparison" },
        { label: "All versus comparisons", href: "/compare/versus" },
        { label: "Pricing breakdowns", href: "/compare/pricing" },
      ],
    },
    {
      heading: "Learn",
      links: [
        { label: "Zero-knowledge period tracker", href: "/resources/guides/what-is-zero-knowledge-period-tracker" },
        { label: "Best private tracker apps", href: "/resources/best/best-private-period-tracker-apps" },
        { label: "Privacy guides", href: "/resources/guides" },
        { label: "Ranked lists", href: "/resources/best" },
        { label: "Privacy by state", href: "/period-tracker-privacy" },
        { label: "Free downloads", href: "/free" },
        { label: "Free privacy guide", href: "/free/privacy-guide" },
      ],
    },
  ],
  legalLinks: [
    { label: "Support", href: "/support" },
    { label: "Privacy", href: "/privacy" },
    { label: "Terms", href: "/terms" },
  ],
} as const;

const ctas = {
  download: {
    default: {
      eyebrow: "Switch when you're ready",
      headline: "Move your cycle tracking to a place Floriva cannot read.",
      body: "Floriva keeps core cycle history on your device. There is no required account for core tracking and no readable central reproductive-health record sitting on someone else's server.",
      leadMagnetSlug: "period-app-privacy-audit-checklist",
      leadMagnetLabel: "Prefer to read first? The privacy audit checklist is free.",
    },
    state: {
      eyebrow: "Switch when you're ready",
      headline: "State law won't fix your tracker. Your tracker will.",
      body: "Floriva stores core cycle data locally. There is no readable central cycle database to leak, sell, or produce from Floriva systems. Your state's privacy laws become a smaller part of the threat model.",
      leadMagnetSlug: "period-app-privacy-audit-checklist",
      leadMagnetLabel: "Prefer to read first? The privacy audit checklist is free.",
    },
    compare: {
      eyebrow: "After the comparison",
      headline: "The clearest difference is where the data lives.",
      body: "Floriva is period tracking where the company cannot see your cycle history. Core records stay on your device, and optional sync is end-to-end encrypted. Compare the options, then switch when the storage model matters more than another promise.",
      leadMagnetSlug: "flo-to-floriva-switcher-guide",
      leadMagnetLabel: "Want it on paper first? The Flo-to-Floriva switcher guide is free.",
    },
    guide: {
      eyebrow: "From reading to doing",
      headline: "Reading about privacy is useful. Changing the tracker is what reduces risk.",
      body: "Floriva is built for people who finished the research and decided cloud-stored cycle data was not worth the convenience.",
      leadMagnetSlug: "period-app-privacy-audit-checklist",
      leadMagnetLabel: "Prefer to read first? The privacy audit checklist is free.",
    },
    "lead-magnet": {
      eyebrow: "From the checklist to the app",
      headline: "The checklist tells you what to look for. Floriva is what to use.",
      body: "Same logic, applied to a tracker you can keep. Local-first storage, no account for core tracking, optional encrypted sync.",
      leadMagnetSlug: "period-app-privacy-audit-checklist",
      leadMagnetLabel: "Browse all free downloads.",
    },
    static: {
      eyebrow: "Try Floriva",
      headline: "Private period tracking that lives on your phone.",
      body: "No account for core tracking. No readable cloud cycle database. Cycle history starts on your device.",
      leadMagnetSlug: "period-app-privacy-audit-checklist",
      leadMagnetLabel: "Prefer to read first? The privacy audit checklist is free.",
    },
  } satisfies Record<string, DownloadCtaKnowledge>,
} as const;

const hubs = [
  {
    path: "/compare",
    title: "Compare period trackers",
    description:
      "Alternatives, versus pages, pricing breakdowns, and ranked decision pages for people actively leaving mainstream period trackers.",
    guideLinks: [
      {
        eyebrow: "Leaving an app",
        title: "Find a new app to switch to",
        body: "These pages start from the tracker you want to leave.",
        href: "/compare/alternatives",
      },
      {
        eyebrow: "Two apps",
        title: "Compare two trackers side by side",
        body: "Pick this when you are down to two apps.",
        href: "/compare/versus",
      },
      {
        eyebrow: "Cost",
        title: "See what a tracker really costs",
        body: "What each app charges. And what a free tier asks for instead.",
        href: "/compare/pricing",
      },
    ],
  },
  {
    path: "/resources/guides",
    title: "Floriva privacy guides",
    description:
      "Privacy research, legal safety, data architecture, and privacy-in-practice guidance for reproductive health data.",
  },
  {
    path: "/resources/health",
    title: "Health tracking resources",
    description:
      "Health tracking guides for symptoms, conditions, hormones, wellness, and life-stage changes.",
  },
  {
    path: "/period-tracker-privacy",
    title: "Period tracker privacy by state",
    description: "All state pages on abortion law context, data protection, and subpoena exposure.",
  },
  {
    path: "/free",
    title: "Free downloads",
    description: "Free downloadable templates, privacy guides, and state risk resources from Floriva.",
  },
  {
    path: "/tools/quiz",
    title: "Quizzes & self-checks",
    description:
      "Decision tools and self-assessments to find the right tracker, evaluate privacy risk, and identify your tracking needs.",
  },
  {
    path: "/app-guides",
    title: "App Guides",
    description: "Setup guides and feature walkthroughs for Floriva.",
  },
] as const satisfies readonly HubKnowledge[];

const emailShell = {
  brandAlt: "Floriva",
  brandLabel: "Floriva",
  delivery: {
    body:
      "Here is the PDF you asked for. It is built to be useful even if you never use Floriva - clear steps, no inflated claims, no privacy theater.",
    buttonLabel: "Download the PDF",
    linkFallback: "If the button does not work, paste this link into your browser:",
    previewTemplate: "Your {leadMagnetTitle} download link is inside.",
    subjectTemplate: "Your {leadMagnetTitle} is ready",
  },
  footer: {
    reasonTemplate: "You're getting this because you downloaded \"{leadMagnetTitle}\" at floriva.app.",
    privacyLine: "Floriva keeps your reproductive health data on your device.",
    unsubscribeLabel: "Unsubscribe",
  },
} as const satisfies EmailShellKnowledge;

const pdfBoilerplate = {
  author: "Floriva",
  brandEyebrow: "FLORIVA PRIVACY RESOURCE",
  disclaimer:
    "Keep this PDF somewhere private. It is a practical resource, not legal or medical advice.",
  aboutHeading: "About Floriva",
  aboutBody:
    "Floriva is built for people who want period tracking without handing reproductive-health data to a cloud-backed account system. The product story starts with architecture: sensitive cycle data should not become a server-side record in the first place.",
  learnMoreLabel: "Learn more at floriva.app/privacy-features",
  learnMorePath: "/privacy-features",
} as const satisfies PdfBoilerplateKnowledge;

const stateRiskTiers = [
  {
    key: "banned",
    label: "Abortion banned or near-banned",
    description:
      "Reproductive-data subpoena risk is highest in these states - architecture matters most here.",
  },
  {
    key: "restricted",
    label: "Abortion restricted",
    description: "Access is legal but narrow; law enforcement requests for reproductive data are plausible.",
  },
  {
    key: "legal-access",
    label: "Legal access, limited shield laws",
    description:
      "Abortion is legal or partially protected, but data-protection statutes vary - cloud-stored cycle data is still exposed.",
  },
  {
    key: "protected",
    label: "Protected access",
    description: "Strong shield laws and privacy protections - the smallest exposure, but not zero.",
  },
  {
    key: "other",
    label: "Other",
    description:
      "Legal protections are stronger, but local-first storage still reduces breach, broker, and account-risk exposure.",
  },
] as const satisfies readonly StateRiskTierKnowledge[];

const socialCampaign = {
  labels: {
    campaignName: "Floriva X hourly 24/7 additive campaign",
    crosswalkTitle: "Floriva X Campaign - Source Crosswalk",
    crosswalkDescription:
      "Each post id maps to the citation strings used in its `sources` array. Use this to audit research-backing across the campaign.",
  },
  pillarOrder: [
    "privacy_legal",
    "cycle_literacy",
    "conditions",
    "comparisons",
    "product",
    "privacy_ops",
    "seo_answers",
  ],
  atomBanks: {
    privacy_legal: [
      {
        id: "social-privacy-legal-hipaa-gap",
        pillar: "privacy_legal",
        topic: "HIPAA gap",
        fact: "HIPAA usually does not cover period apps that are not run by a covered health provider or insurer.",
        takeaway: "Health data can sit outside health privacy law.",
        source: "content/guides/period-tracker-hipaa.mdx",
        sourceRoutes: ["/resources/guides/period-tracker-hipaa"],
        tags: ["#Privacy"],
        freshness: "Source route should be reviewed when HIPAA or federal reproductive-health privacy rules change.",
        publicSafe: true,
      },
      {
        id: "social-privacy-legal-premom-ftc",
        pillar: "privacy_legal",
        topic: "Premom FTC order",
        fact: "The FTC barred Premom from sharing health data for advertising after alleged disclosures to analytics firms.",
        takeaway: "Ad tech and fertility logs should not sit in the same room.",
        source: "docs/research/04-sources.md (FTC May 2023: Easy Healthcare Premom order)",
        sourceRoutes: ["/resources/guides/premom-data-sharing-ftc"],
        tags: ["#Privacy"],
        freshness: "FTC order wording should be rechecked before new legal commentary.",
        publicSafe: true,
      },
    ],
    cycle_literacy: [
      {
        id: "social-cycle-luteal-range",
        pillar: "cycle_literacy",
        topic: "Luteal phase range",
        fact: "The luteal phase is commonly 11 to 17 days. A pattern under 10 days is worth discussing with a clinician.",
        takeaway: "Track the phase, not just the period date.",
        source: "content/life-stage-guides/luteal-phase-length-guide.mdx",
        sourceRoutes: ["/resources/life-stage-guides/luteal-phase-length-guide"],
        tags: ["#FertilityAwareness"],
        freshness: "Health education copy should be reviewed with source content updates.",
        publicSafe: true,
      },
      {
        id: "social-cycle-adult-range",
        pillar: "cycle_literacy",
        topic: "Adult cycle range",
        fact: "Adult cycles are often described as healthy in the 21 to 35 day range.",
        takeaway: "A 28-day cycle is a reference point, not a verdict.",
        source: "content/guides/how-to-track-irregular-menstrual-cycle.mdx",
        sourceRoutes: ["/resources/guides/how-to-track-irregular-menstrual-cycle"],
        tags: [],
        freshness: "Health education copy should be reviewed with source content updates.",
        publicSafe: true,
      },
    ],
    conditions: [
      {
        id: "social-conditions-pcos",
        pillar: "conditions",
        topic: "PCOS tracking",
        fact: "PCOS can involve irregular cycles, acne, hair changes, and metabolic symptoms.",
        takeaway: "A tracker is most useful when it logs the pattern around the bleed.",
        source: "content/condition-guides/pcos-period-irregularity-tracking.mdx",
        sourceRoutes: ["/resources/condition-guides/pcos-period-irregularity-tracking"],
        tags: ["#PCOS"],
        freshness: "Health education copy should be reviewed with source content updates.",
        publicSafe: true,
      },
      {
        id: "social-conditions-pmdd",
        pillar: "conditions",
        topic: "PMDD versus PMS",
        fact: "PMDD symptoms are cyclical and can be severe enough to disrupt work, school, or relationships.",
        takeaway: "Mood logs matter most when they show timing and intensity together.",
        source: "content/symptom-guides/pmdd-symptoms-vs-pms.mdx",
        sourceRoutes: ["/resources/symptom-guides/pmdd-symptoms-vs-pms"],
        tags: ["#PMDD"],
        freshness: "Health education copy should be reviewed with source content updates.",
        publicSafe: true,
      },
    ],
    comparisons: [
      {
        id: "social-comparisons-flo",
        pillar: "comparisons",
        topic: "Flo alternative",
        fact: "Flo's privacy history includes FTC action and later settlement reporting tied to data sharing allegations.",
        takeaway: "If trust broke once, architecture matters more than reassurance.",
        source: "content/alternatives/flo-app-alternative.mdx",
        sourceRoutes: ["/compare/alternatives/flo-app-alternative"],
        tags: ["#Privacy"],
        freshness: "Competitor legal-history copy should be rechecked before settlement updates.",
        publicSafe: true,
      },
      {
        id: "social-comparisons-clue",
        pillar: "comparisons",
        topic: "Clue alternative",
        fact: "Clue is a cloud account app, while Floriva keeps cycle data on the device.",
        takeaway: "The storage model is the privacy difference.",
        source: "content/alternatives/clue-alternative-no-cloud.mdx",
        sourceRoutes: ["/compare/alternatives/clue-alternative-no-cloud"],
        tags: ["#Privacy"],
        freshness: "Competitor architecture copy should be reviewed when source pages change.",
        publicSafe: true,
      },
    ],
    product: [
      {
        id: "social-product-on-device",
        pillar: "product",
        topic: "On-device storage",
        fact: "Floriva keeps core cycle data on the user's phone instead of a readable central database.",
        takeaway: "There is no readable central Floriva cycle database to request.",
        source: "content/app-guides/floriva-anonymous-tracking-setup.mdx",
        sourceRoutes: ["/app-guides/floriva-anonymous-tracking-setup"],
        tags: ["#Privacy"],
        freshness: "Product architecture copy should be reviewed when app storage behavior changes.",
        publicSafe: true,
      },
      {
        id: "social-product-no-account",
        pillar: "product",
        topic: "No account required",
        fact: "Floriva does not require an account to track a cycle.",
        takeaway: "Less identity attached to intimate data is a real privacy feature.",
        source: "content/app-guides/floriva-anonymous-tracking-setup.mdx",
        sourceRoutes: ["/app-guides/floriva-anonymous-tracking-setup"],
        tags: ["#Privacy"],
        freshness: "Product account copy should be reviewed when onboarding changes.",
        publicSafe: true,
      },
    ],
    privacy_ops: [
      {
        id: "social-privacy-ops-deletion",
        pillar: "privacy_ops",
        topic: "Delete app versus delete data",
        fact: "Deleting a cloud period app may not delete the account data the company already holds.",
        takeaway: "Deletion requests and local cleanup are different steps.",
        source: "content/guides/what-happens-period-data-delete-app.mdx",
        sourceRoutes: ["/resources/guides/what-happens-period-data-delete-app"],
        tags: ["#Privacy"],
        freshness: "Privacy operations copy should be reviewed when source content changes.",
        publicSafe: true,
      },
      {
        id: "social-privacy-ops-backups",
        pillar: "privacy_ops",
        topic: "Backups",
        fact: "A private period tracker can still become exposed through unencrypted backups or shared devices.",
        takeaway: "Storage location and backup behavior belong in the same privacy conversation.",
        source: "content/privacy-in-practice/lock-down-period-data-on-your-phone.mdx",
        sourceRoutes: ["/resources/privacy-in-practice/lock-down-period-data-on-your-phone"],
        tags: ["#Privacy"],
        freshness: "Privacy operations copy should be reviewed when source content changes.",
        publicSafe: true,
      },
    ],
    seo_answers: [
      {
        id: "social-seo-spotting",
        pillar: "seo_answers",
        topic: "Spotting versus period",
        fact: "Spotting is usually lighter than a period and may not follow the same flow pattern.",
        takeaway: "Track color, timing, amount, and pain before trying to label it.",
        source: "content/symptom-guides/spotting-vs-period.mdx",
        sourceRoutes: ["/resources/symptom-guides/spotting-vs-period"],
        tags: [],
        freshness: "Health education copy should be reviewed with source content updates.",
        publicSafe: true,
      },
      {
        id: "social-seo-plan-b",
        pillar: "seo_answers",
        topic: "Plan B timing",
        fact: "Emergency contraception can shift the timing, flow, or symptoms of the next period.",
        takeaway: "A changed cycle after Plan B is a timing note, not automatically a diagnosis.",
        source: "content/life-stage-guides/plan-b-period-timing.mdx",
        sourceRoutes: ["/resources/life-stage-guides/plan-b-period-timing"],
        tags: [],
        freshness: "Health education copy should be reviewed with source content updates.",
        publicSafe: true,
      },
    ],
  },
} as const;

function sectionDetails(sections: readonly StaticKnowledgeSection[]) {
  return sections.flatMap((section) => [
    ...(section.body ? [section.body] : []),
    ...(section.bullets ?? []),
  ]);
}

// Canonical public store listings. These are the only URLs Google can use to tie
// floriva.app to the two app-store entities that already rank for brand queries,
// so they feed both `seo.organization.sameAs` and `storePresentation`.
// `src/site/store-targets.ts` reads them from here — do not add a third copy.
const storeListingUrls = {
  ios: "https://apps.apple.com/us/app/floriva-private-period-tracker/id6762630858",
  android: "https://play.google.com/store/apps/details?id=app.floriva",
} as const;

export const florivaKnowledge = {
  app: {
    capabilities: {
      coreStorage: {
        status: "local-first",
        publicLine:
          "Core cycle records stay on the user's device. Floriva has no readable central cycle database.",
      },
      sync: {
        status: "optional-e2ee-ciphertext",
        publicLine:
          "Encrypted cross-device sync is optional. Only end-to-end encrypted ciphertext leaves the device, and Floriva cannot read it.",
      },
      imports: {
        status: "check-current-onboarding",
        publicLine:
          "Import support can change. Public copy should tell users to check Floriva onboarding for current import options.",
      },
      storeAvailability: {
        status: "configured-store-redirects",
        publicLine:
          "Store links are configured through the public store redirect system for iOS and Android.",
      },
    } satisfies AppCapabilityKnowledge,
    helpManual: [
      "Set up Floriva by installing the app, choosing local-first tracking, and logging only the cycle details you want to keep.",
      "Use daily logging for period flow, symptoms, moods, fertility signs, medications, birth-control context, notes, and appointment preparation.",
      "Review cycle history and patterns on the device. Floriva is designed so this review does not require a company-held cloud profile.",
      "Encrypted cross-device sync is optional. If enabled, synced records are end-to-end encrypted before leaving the device.",
      "Check Floriva onboarding for current import options before promising support for a specific app export or file format.",
      "Delete records locally where supported, clear app storage, or uninstall the app to remove local app data from the device.",
      "Use exports or backups cautiously: once data leaves the device, the storage location you choose determines the privacy risk.",
      "For billing, bugs, privacy questions, app setup, data deletion, exports, backups, and troubleshooting, contact public support.",
    ],
  },
  brand: {
    domain: "floriva.app",
    name: "Floriva",
  },
  contact: {
    publicEmail: "angel.campa@floriva.app",
    actions: [
      {
        kind: "email",
        label: "Contact Floriva support",
        target: "public-support",
      },
    ] satisfies readonly KnowledgeAction[],
  },
  emails: {
    shell: emailShell,
    leadMagnets: leadMagnetResources,
  },
  ctas,
  hubs,
  leadMagnetUi: {
    form: {
      closeLabel: "Close",
      emailLabel: "Email address",
      errorMessage: "Something went wrong. Please try again in a moment.",
      honeypotLabel: "Company",
      inlineDescription: "Enter your email and Floriva will send the PDF to your inbox.",
      inlineEyebrow: "Free download",
      inlineHeadingTemplate: "Get {title}",
      placeholder: "you@example.com",
      popupEyebrow: "Free privacy resource",
      submitLabel: "Send me the PDF",
      submittingLabel: "Sending...",
      successBody: "We sent the PDF to your inbox.",
      successHeading: "Check your inbox.",
    },
    popupExcludedPathPrefixes: ["/free", "/privacy", "/support", "/terms"],
    popupStorageKeys: {
      dismissedUntil: "floriva-lead-magnet-dismissed-until",
      sessionShown: "floriva-lead-magnet-session-shown",
      submittedUntil: "floriva-lead-magnet-submitted-until",
    },
  } satisfies LeadMagnetUiKnowledge,
  marketing: {
    homepage,
    llms: {
      collectionLabels: {
        alternatives: "Alternatives",
        "app-guides": "App Guides",
        comparisons: "Head-to-Head Comparisons",
        "condition-guides": "Condition Guides",
        guides: "Guides",
        "hormone-guides": "Hormone Guides",
        "lead-magnets": "Free Resources",
        "life-stage-guides": "Life Stage Guides",
        listicles: "Ranked Lists",
        "pricing-breakdowns": "Pricing Breakdowns",
        "privacy-in-practice": "Privacy in Practice",
        questionnaires: "Quizzes & self-checks",
        "reproductive-privacy-state-pages": "Privacy by State",
        "symptom-guides": "Symptom Guides",
        "wellness-guides": "Wellness Guides",
      },
      corePositioningHeading: "Core positioning",
      corePositioningBullets: [
        "Local-first architecture - core cycle data is stored on the user's device, not in a readable Floriva server database.",
        "Public claims cite documented privacy failures and source routes rather than unsupported marketing copy.",
        "Content pages preserve structured payloads such as relevantLaws, keyFacts, tiers, hiddenCosts, and faqs for E-E-A-T signal.",
      ],
      hubsHeading: "Hubs",
      userIntentSummary:
        "The site is organized around three user intents: compare trackers, understand the legal and technical framing, and map reproductive-data risk by state.",
      hubLinks: [
        {
          label: "Compare",
          href: "/compare",
          description:
            "Alternatives, versus pages, and pricing breakdowns for people actively switching trackers.",
        },
        {
          label: "Resources",
          href: "/resources",
          description: "Guides on architecture, HIPAA gaps, subpoenas, and practical privacy.",
        },
        {
          label: "Free downloads",
          href: "/free",
          description: "Free resources: data deletion requests, subpoena response, state scorecards.",
        },
        {
          label: "Period tracker privacy by state",
          href: "/period-tracker-privacy",
          description: "State-by-state reproductive-data risk profiles.",
        },
      ],
    },
    llmsHeader:
      "Floriva is a privacy-first period tracker and research property for people comparing cloud-first period apps, reproductive-data privacy risks, and local-first alternatives.",
  },
  navigation,
  pdfBoilerplate,
  rules: {
    botBoundaries: [
      "Do not invent metrics, testimonials, user counts, legal risk statistics, or medical claims.",
      "Do not provide legal, medical, or emergency advice. Give informational context and suggest contacting a qualified professional when needed.",
      "When a claim is research-backed or legal-contextual, cite the relevant public page or source route instead of presenting it as unsupported fact.",
      "Do not state a specific count of abortion-ban states unless freshly verified and cited.",
      "Do not expose non-public configuration names, test-only values, credentials, operational notes, strategy, or roadmap details.",
    ],
  },
  seo: {
    domain: "floriva.app",
    name: "Floriva",
    homeTitle: "Floriva - Private, on-device period tracker",
    metaDescription:
      "Floriva is a private period tracker. Your data stays on your phone, and Floriva cannot read it. There is no sync, so no cycle data is transmitted at all.",
    defaultOgImagePath: "/og/default.png",
    organization: {
      legalName: "Floriva",
      // Intentionally empty. The app-store URLs belong on the MobileApplication
      // node, not here: `sameAs` is an identity assertion, and an app listing
      // identifies the *app*, not the company. Claiming both would tell Google
      // the organization and the app are the same entity. The org-level
      // equivalent is the Apple/Google *developer* page — add those here only
      // once the real developer URLs are known. Do not guess them.
      sameAs: [] as string[],
    },
  },
  socialCampaign,
  stateRiskTiers,
  staticPages,
  storePresentation: {
    ios: {
      label: "Download on the App Store",
      description: "Private cycle tracking for iOS.",
      url: storeListingUrls.ios,
    },
    android: {
      label: "Get it on Google Play",
      description: "Private cycle tracking for Android.",
      url: storeListingUrls.android,
    },
  },
} as const;

export const knowledgeEntries = [
  {
    id: "marketing-positioning-local-first",
    domain: "marketing",
    title: "Floriva positioning",
    summary: homepage.tagline,
    details: [
      homepage.subheadline,
      "Floriva leads with documented privacy failures of cloud-first competitors before product polish claims.",
      florivaKnowledge.app.capabilities.coreStorage.publicLine,
      florivaKnowledge.app.capabilities.sync.publicLine,
    ],
    topics: ["positioning", "local-first", "period tracking", "privacy"],
    audience: ["switchers", "privacy researchers", "state-risk readers"],
    sourceRoutes: ["/", "/privacy-features", "/compare"],
    botUse: "both",
    suggestedActions: [
      { kind: "route", label: "Compare private trackers", target: "/compare" },
      { kind: "route", label: "See privacy features", target: "/privacy-features" },
      { kind: "store", label: "Open iOS store listing", target: "ios" },
      { kind: "store", label: "Open Android store listing", target: "android" },
    ],
    publicSafe: true,
  },
  {
    id: "competitor-trust-gap",
    domain: "competitors",
    title: "Competitor trust gap",
    summary: "Floriva compares against Flo, Clue, Natural Cycles, and Stardust through documented trust and architecture gaps.",
    details: homepage.competitors.map(
      (competitor) => `${competitor.name}: ${competitor.weakness}`,
    ),
    topics: ["competitors", "switching", "Flo", "Clue", "cloud storage"],
    audience: ["switchers", "comparison shoppers"],
    sourceRoutes: ["/", "/compare", "/compare/versus"],
    botUse: "sales",
    suggestedActions: [
      { kind: "route", label: "Browse comparisons", target: "/compare/versus" },
      { kind: "route", label: "Read alternatives", target: "/compare/alternatives" },
    ],
    publicSafe: true,
  },
  {
    id: "pricing-direct-payment",
    domain: "pricing",
    title: "Floriva pricing",
    summary: staticPages.get.description,
    details: sectionDetails(staticPages.get.sections),
    topics: ["pricing", "subscription", "lifetime", "business model"],
    audience: ["buyers", "switchers"],
    sourceRoutes: ["/get", "/compare/pricing"],
    botUse: "sales",
    suggestedActions: [
      { kind: "route", label: "Get the app", target: "/get" },
      { kind: "route", label: "Compare pricing", target: "/compare/pricing" },
    ],
    publicSafe: true,
  },
  {
    id: "privacy-policy-local-data",
    domain: "privacy",
    title: "Privacy policy and local data",
    summary: staticPages.privacy.description,
    details: sectionDetails(staticPages.privacy.sections),
    topics: ["privacy policy", "health data", "diagnostics", "deletion"],
    audience: ["privacy researchers", "users", "support"],
    sourceRoutes: ["/privacy", "/privacy-features"],
    botUse: "help",
    suggestedActions: [
      { kind: "route", label: "Read privacy policy", target: "/privacy" },
      { kind: "email", label: "Ask a privacy question", target: "public-support" },
    ],
    publicSafe: true,
  },
  {
    id: "app-help-manual",
    domain: "app",
    title: "Floriva app help manual",
    summary: "Floriva support guidance covers setup, logging, privacy settings, export, deletion, backups, troubleshooting, billing, and support.",
    details: florivaKnowledge.app.helpManual,
    topics: ["setup", "logging", "exports", "backups", "deletion", "billing", "support"],
    audience: ["users", "support"],
    sourceRoutes: ["/support", "/app-guides"],
    botUse: "help",
    suggestedActions: [
      { kind: "route", label: "Open app guides", target: "/app-guides" },
      { kind: "route", label: "Contact support", target: "/support" },
    ],
    publicSafe: true,
  },
  {
    id: "lead-magnet-email-sequences",
    domain: "emails",
    title: "Lead magnet delivery sequences",
    summary: "Each promoted free resource has a public-safe seven-email follow-up sequence with a subject, preview, opening, and CTA.",
    details: leadMagnetResources.map(
      (resource) => `${resource.title}: ${resource.description}`,
    ),
    topics: ["lead magnets", "email", "free resources"],
    audience: ["downloaders", "switchers", "privacy researchers"],
    sourceRoutes: ["/free"],
    botUse: "sales",
    suggestedActions: [
      { kind: "route", label: "Browse free resources", target: "/free" },
    ],
    publicSafe: true,
  },
  {
    id: "public-bot-boundaries",
    domain: "rules",
    title: "Public bot boundaries",
    summary: "Floriva bots should stay public-safe, cited, and informational.",
    details: florivaKnowledge.rules.botBoundaries.filter(
      (boundary) => !boundary.includes("non-public configuration names"),
    ),
    topics: ["bot safety", "public claims", "legal boundary", "medical boundary"],
    audience: ["bots", "support", "sales"],
    sourceRoutes: ["/privacy", "/support", "/terms"],
    botUse: "both",
    suggestedActions: [
      { kind: "route", label: "Read terms", target: "/terms" },
      { kind: "route", label: "Contact support", target: "/support" },
    ],
    publicSafe: true,
  },
] as const satisfies readonly PublicKnowledgeEntry[];

export type PublicKnowledgeArtifact = ReturnType<typeof toPublicKnowledgeArtifact>;

function toPublicLeadMagnetUi(leadMagnetUi: typeof florivaKnowledge.leadMagnetUi) {
  return {
    form: leadMagnetUi.form,
    popupExcludedPathPrefixes: leadMagnetUi.popupExcludedPathPrefixes,
  };
}

function toPublicSocialCampaign(social: typeof florivaKnowledge.socialCampaign) {
  return {
    pillarOrder: social.pillarOrder,
    atomBanks: Object.fromEntries(
      Object.entries(social.atomBanks).map(([pillar, atoms]) => [
        pillar,
        atoms.map((atom) => ({
          id: atom.id,
          pillar: atom.pillar,
          topic: atom.topic,
          fact: atom.fact,
          takeaway: atom.takeaway,
          sourceRoutes: atom.sourceRoutes,
          tags: atom.tags,
          freshness: atom.freshness,
          publicSafe: atom.publicSafe,
        })),
      ]),
    ),
  };
}

function toPublicRules(rules: typeof florivaKnowledge.rules) {
  return {
    botBoundaries: rules.botBoundaries.filter(
      (boundary) => !boundary.includes("non-public configuration names"),
    ),
  };
}

export function toPublicKnowledgeArtifact() {
  return {
    app: florivaKnowledge.app,
    brand: florivaKnowledge.brand,
    contact: florivaKnowledge.contact,
    emails: {
      shell: florivaKnowledge.emails.shell,
      leadMagnets: florivaKnowledge.emails.leadMagnets.map((resource: LeadMagnetResource) => ({
        description: resource.description,
        routePath: resource.routePath,
        sequence: resource.sequence,
        slug: resource.slug,
        title: resource.title,
      })),
    },
    entries: knowledgeEntries,
    ctas: florivaKnowledge.ctas,
    hubs: florivaKnowledge.hubs,
    leadMagnetUi: toPublicLeadMagnetUi(florivaKnowledge.leadMagnetUi),
    marketing: florivaKnowledge.marketing,
    navigation: florivaKnowledge.navigation,
    pdfBoilerplate: florivaKnowledge.pdfBoilerplate,
    rules: toPublicRules(florivaKnowledge.rules),
    seo: florivaKnowledge.seo,
    socialCampaign: toPublicSocialCampaign(florivaKnowledge.socialCampaign),
    stateRiskTiers: florivaKnowledge.stateRiskTiers,
    staticPages: florivaKnowledge.staticPages,
    storePresentation: florivaKnowledge.storePresentation,
  };
}
