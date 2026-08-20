import type { StoreTargetKey } from "./store-targets";
import { florivaKnowledge } from "./knowledge";

export type NavItem = {
  label: string;
  href: string;
};

export type LinkGroup = {
  heading: string;
  links: readonly NavItem[];
};

export type FaqItem = {
  q: string;
  a: string;
};

export type CompetitorCard = {
  slug: string;
  name: string;
  weakness: string;
  pricing: string;
};

export type ClarityCard = {
  eyebrow: string;
  title: string;
  body: string;
  href?: string;
  linkLabel?: string;
};

export type CollectionKey =
  | "alternatives"
  | "app-guides"
  | "comparisons"
  | "condition-guides"
  | "guides"
  | "hormone-guides"
  | "lead-magnets"
  | "life-stage-guides"
  | "listicles"
  | "pricing-breakdowns"
  | "privacy-in-practice"
  | "reproductive-privacy-state-pages"
  | "questionnaires"
  | "symptom-guides"
  | "wellness-guides";

export type CollectionDefinition = {
  key: CollectionKey;
  label: string;
  shortLabel: string;
  description: string;
  routeBase: string;
  audienceLabel: string;
};

export const collectionDefinitions: Record<CollectionKey, CollectionDefinition> = {
  alternatives: {
    key: "alternatives",
    label: "Alternatives",
    shortLabel: "Alternatives",
    description: "Switching guides for people leaving cloud-first period trackers.",
    routeBase: "/compare/alternatives",
    audienceLabel: "BOFU",
  },
  comparisons: {
    key: "comparisons",
    label: "Head-to-Head Comparisons",
    shortLabel: "Versus",
    description: "Direct privacy and pricing comparisons between popular trackers.",
    routeBase: "/compare/versus",
    audienceLabel: "MOFU",
  },
  "pricing-breakdowns": {
    key: "pricing-breakdowns",
    label: "Pricing Breakdowns",
    shortLabel: "Pricing",
    description: "What you actually pay when the app's business model is not your data.",
    routeBase: "/compare/pricing",
    audienceLabel: "MOFU",
  },
  listicles: {
    key: "listicles",
    label: "Ranked Lists",
    shortLabel: "Best of",
    description: "Curated rankings for people narrowing their options.",
    routeBase: "/resources/best",
    audienceLabel: "MOFU",
  },
  guides: {
    key: "guides",
    label: "Guides",
    shortLabel: "Guides",
    description: "Long-form explainers on subpoenas, HIPAA gaps, and on-device architecture.",
    routeBase: "/resources/guides",
    audienceLabel: "TOFU",
  },
  "reproductive-privacy-state-pages": {
    key: "reproductive-privacy-state-pages",
    label: "Privacy by State",
    shortLabel: "By state",
    description: "State-by-state legal context for reproductive data risk.",
    routeBase: "/period-tracker-privacy",
    audienceLabel: "TOFU",
  },
  "lead-magnets": {
    key: "lead-magnets",
    label: "Free Resources",
    shortLabel: "Free",
    description: "Free privacy guides, templates, and scorecards.",
    routeBase: "/free",
    audienceLabel: "TOFU",
  },
  "symptom-guides": {
    key: "symptom-guides",
    label: "Symptom Guides",
    shortLabel: "Symptoms",
    description: "Plain-language guides to menstrual and reproductive symptoms.",
    routeBase: "/resources/symptom-guides",
    audienceLabel: "TOFU",
  },
  "condition-guides": {
    key: "condition-guides",
    label: "Condition Guides",
    shortLabel: "Conditions",
    description: "Tracking and privacy context for specific reproductive health conditions.",
    routeBase: "/resources/condition-guides",
    audienceLabel: "TOFU",
  },
  "life-stage-guides": {
    key: "life-stage-guides",
    label: "Life Stage Guides",
    shortLabel: "Life stages",
    description: "Cycle and privacy context across reproductive life stages.",
    routeBase: "/resources/life-stage-guides",
    audienceLabel: "TOFU",
  },
  questionnaires: {
    key: "questionnaires",
    label: "Quizzes & self-checks",
    shortLabel: "Quizzes",
    description: "Decision tools and self-assessments to find the right tracker, evaluate privacy risk, and identify your tracking needs.",
    routeBase: "/tools/quiz",
    audienceLabel: "MOFU",
  },
  "privacy-in-practice": {
    key: "privacy-in-practice",
    label: "Privacy in Practice",
    shortLabel: "Privacy",
    description: "Actionable privacy guidance for specific real-world situations.",
    routeBase: "/resources/privacy-in-practice",
    audienceLabel: "MOFU",
  },
  "app-guides": {
    key: "app-guides",
    label: "App Guides",
    shortLabel: "App guides",
    description: "Setup guides and feature walkthroughs for Floriva.",
    routeBase: "/app-guides",
    audienceLabel: "BOFU",
  },
  "hormone-guides": {
    key: "hormone-guides",
    label: "Hormone Guides",
    shortLabel: "Hormones",
    description: "Evidence-based guides to reproductive hormones, cycle phases, and hormone imbalance patterns.",
    routeBase: "/resources/hormone-guides",
    audienceLabel: "TOFU",
  },
  "wellness-guides": {
    key: "wellness-guides",
    label: "Wellness Guides",
    shortLabel: "Wellness",
    description: "Cycle syncing, nutrition, cramp relief, and period wellness guides grounded in evidence.",
    routeBase: "/resources/wellness-guides",
    audienceLabel: "TOFU",
  },
};

export const siteConfig = {
  name: "Floriva",
  domain: "floriva.app",
  metaDescription: florivaKnowledge.marketing.homepage.positioning,
  tagline: florivaKnowledge.marketing.homepage.tagline,
  subheadline: florivaKnowledge.marketing.homepage.subheadline,
  contactEmail: florivaKnowledge.contact.publicEmail,
  badges: florivaKnowledge.marketing.homepage.badges,
  heroTrustSignal: florivaKnowledge.marketing.homepage.heroTrustSignal,
  heroHighlights: florivaKnowledge.marketing.homepage.heroHighlights,
  primaryStoreTarget: "ios" as StoreTargetKey,
  nav: florivaKnowledge.navigation.nav satisfies readonly NavItem[],
  footerGroups: florivaKnowledge.navigation.footerGroups satisfies readonly LinkGroup[],
  legalLinks: florivaKnowledge.navigation.legalLinks satisfies readonly NavItem[],
  homepageFaqs: florivaKnowledge.marketing.homepage.faqs,
  competitors: florivaKnowledge.marketing.homepage.competitors,
  problemCards: florivaKnowledge.marketing.homepage.problemCards,
  productHighlights: florivaKnowledge.marketing.homepage.productHighlights,
  audiencePaths: florivaKnowledge.marketing.homepage.audiencePaths,
  staticPages: florivaKnowledge.staticPages,
};
