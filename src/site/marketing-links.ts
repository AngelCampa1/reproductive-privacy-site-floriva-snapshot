import { florivaKnowledge } from "@/site/knowledge";

export type MarketingLink = {
  eyebrow: string;
  title: string;
  body: string;
  href: string;
};

/*
 * There is deliberately no `homepageMarketingLinks` table here.
 *
 * One used to exist: five paths that `route-inventory.ts` counted as homepage
 * links. `home-page.tsx` rendered none of them and never imported `Link`, so
 * those five edges were fiction, and the `orphans === []` check leaned on them.
 *
 * The absence is the intent, not an oversight. Commit 8131cfc ("de-SEO'd
 * landing page") removed the funnel links from the homepage on user feedback:
 * the landing page sells the app, and the SEO corpus is reached through the nav.
 * `home-page.test.tsx` asserts the homepage renders no `/compare`,
 * `/period-tracker-privacy`, or `/resources` link. Do not add them back here to
 * satisfy the link graph; add them to the nav instead, where they already are.
 */

/**
 * The "Choose your path" cards at the top of each hub.
 *
 * Every hub must be listed here. Hubs that were missing used to fall back to a
 * synthesized card whose body was one hardcoded sentence — "Use this path if it
 * matches the question that brought you here." — repeated across all three
 * cards, on 12 of the 18 hubs. Those cards also reused the same three links the
 * hub already shows in its footer band, so the top and bottom of the page were
 * identical.
 *
 * Rules for adding a hub: three cards, three different destinations, none of
 * them the hub itself, and a body that says what the reader will find there.
 * `hub-guide-links.test.ts` enforces the shape.
 */
export const hubGuideLinks: Record<string, readonly MarketingLink[]> = {
  "/compare": florivaKnowledge.hubs.find((hub) => hub.path === "/compare")?.guideLinks ?? [],

  "/compare/alternatives": [
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
    {
      eyebrow: "Shortlists",
      title: "Skip to a ranked shortlist",
      body: "Ranked lists group apps by need, like offline use or no account.",
      href: "/resources/best",
    },
  ],

  "/compare/versus": [
    {
      eyebrow: "Leaving an app",
      title: "Find a new app to switch to",
      body: "These pages start from the tracker you want to leave.",
      href: "/compare/alternatives",
    },
    {
      eyebrow: "Our method",
      title: "See how we rank trackers",
      body: "We rank by where your data lives. Policy promises count last.",
      href: "/resources/guides/how-we-rank-period-trackers",
    },
    {
      eyebrow: "Shortlists",
      title: "Skip to a ranked shortlist",
      body: "Ranked lists group apps by need, like offline use or no account.",
      href: "/resources/best",
    },
  ],

  "/compare/pricing": [
    {
      eyebrow: "Two apps",
      title: "Compare two trackers side by side",
      body: "Pick this when price is only part of what you are weighing.",
      href: "/compare/versus",
    },
    {
      eyebrow: "Free apps",
      title: "See which free trackers keep your data",
      body: "A free app still has to make money somewhere. These lists say how.",
      href: "/resources/best",
    },
    {
      eyebrow: "What we build",
      title: "Read how Floriva handles your data",
      body: "Your cycle data stays on your phone. No account, no cloud copy.",
      href: "/privacy-features",
    },
  ],

  "/resources/best": [
    {
      eyebrow: "Our method",
      title: "See how we rank trackers",
      body: "Read this first if you want to judge the lists for yourself.",
      href: "/resources/guides/how-we-rank-period-trackers",
    },
    {
      eyebrow: "Leaving an app",
      title: "Find a new app to switch to",
      body: "These pages start from the tracker you want to leave.",
      href: "/compare/alternatives",
    },
    {
      eyebrow: "What we build",
      title: "Read how Floriva handles your data",
      body: "Your cycle data stays on your phone. No account, no cloud copy.",
      href: "/privacy-features",
    },
  ],

  "/resources/symptom-guides": [
    {
      eyebrow: "Named conditions",
      title: "Read guides for a specific condition",
      body: "Use these when a doctor has named something, like PCOS or endometriosis.",
      href: "/resources/condition-guides",
    },
    {
      eyebrow: "All health guides",
      title: "Browse every health tracking guide",
      body: "The full set, including conditions, hormones, and life changes.",
      href: "/resources/health",
    },
    {
      eyebrow: "Take it with you",
      title: "Print a log for your next visit",
      body: "Free trackers and worksheets you can fill in and bring to an appointment.",
      href: "/free",
    },
  ],

  "/resources/condition-guides": [
    {
      eyebrow: "Symptoms first",
      title: "Start from what you are feeling",
      body: "Use these when you have a symptom but not a diagnosis yet.",
      href: "/resources/symptom-guides",
    },
    {
      eyebrow: "All health guides",
      title: "Browse every health tracking guide",
      body: "The full set, including symptoms, hormones, and life changes.",
      href: "/resources/health",
    },
    {
      eyebrow: "Take it with you",
      title: "Print a log for your next visit",
      body: "Free trackers and worksheets you can fill in and bring to an appointment.",
      href: "/free",
    },
  ],

  "/resources/hormone-guides": [
    {
      eyebrow: "Daily habits",
      title: "Read the food, sleep, and exercise guides",
      body: "What the evidence says about changing habits across your cycle.",
      href: "/resources/wellness-guides",
    },
    {
      eyebrow: "Symptoms first",
      title: "Start from what you are feeling",
      body: "Use these when a symptom brought you here, not a lab result.",
      href: "/resources/symptom-guides",
    },
    {
      eyebrow: "All health guides",
      title: "Browse every health tracking guide",
      body: "The full set, including symptoms, conditions, and life changes.",
      href: "/resources/health",
    },
  ],

  "/resources/wellness-guides": [
    {
      eyebrow: "Hormones",
      title: "Read what drives the changes",
      body: "Guides on estrogen, progesterone, and cortisol across the cycle.",
      href: "/resources/hormone-guides",
    },
    {
      eyebrow: "All health guides",
      title: "Browse every health tracking guide",
      body: "The full set, including symptoms, conditions, and life changes.",
      href: "/resources/health",
    },
    {
      eyebrow: "Take it with you",
      title: "Print a planner or log",
      body: "Free worksheets you can fill in and keep on paper.",
      href: "/free",
    },
  ],

  "/resources/life-stage-guides": [
    {
      eyebrow: "Named conditions",
      title: "Read guides for a specific condition",
      body: "Use these when a doctor has named something, like PCOS or endometriosis.",
      href: "/resources/condition-guides",
    },
    {
      eyebrow: "All health guides",
      title: "Browse every health tracking guide",
      body: "The full set, including symptoms, conditions, and daily habits.",
      href: "/resources/health",
    },
    {
      eyebrow: "Take it with you",
      title: "Print a log to bring with you",
      body: "Free trackers and worksheets you can fill in on paper.",
      href: "/free",
    },
  ],

  "/resources/privacy-in-practice": [
    {
      eyebrow: "The background",
      title: "Read why the law leaves gaps",
      body: "Guides on subpoenas, HIPAA, data brokers, and where app data actually goes.",
      href: "/resources/guides",
    },
    {
      eyebrow: "Do it today",
      title: "Download a checklist or script",
      body: "Free templates for deleting old data and asking a company what it holds.",
      href: "/free",
    },
    {
      eyebrow: "Switching",
      title: "Compare trackers that store less",
      body: "Once you know the risk, compare apps by where they keep your data.",
      href: "/compare",
    },
  ],

  "/resources/guides": [
    {
      eyebrow: "In practice",
      title: "Turn the research into steps",
      body: "Guides for school devices, insurance, backups, and shared phones.",
      href: "/resources/privacy-in-practice",
    },
    {
      eyebrow: "Where you live",
      title: "Check your state",
      body: "Each state page covers local law. It says what that means for cloud data.",
      href: "/period-tracker-privacy",
    },
    {
      eyebrow: "Switching",
      title: "Compare trackers that store less",
      body: "Once you know the risk, compare apps by where they keep your data.",
      href: "/compare",
    },
  ],

  "/resources/health": [
    {
      eyebrow: "Symptoms",
      title: "Start from what you are feeling",
      body: "Guides for fatigue, cramps, acne, migraine, bloating, and sleep changes.",
      href: "/resources/symptom-guides",
    },
    {
      eyebrow: "Named conditions",
      title: "Read guides for a specific condition",
      body: "PCOS, endometriosis, PMDD, thyroid, fibroids, and other recurring concerns.",
      href: "/resources/condition-guides",
    },
    {
      eyebrow: "Hormones",
      title: "Read what drives the changes",
      body: "Guides on estrogen, progesterone, and cortisol across the cycle.",
      href: "/resources/hormone-guides",
    },
  ],

  "/app-guides": [
    {
      eyebrow: "Get started",
      title: "Download Floriva",
      body: "No account to make. Your cycle data stays on your phone.",
      href: "/get",
    },
    {
      eyebrow: "What it does",
      title: "See what Floriva keeps private",
      body: "A plain list of what the app keeps on your phone.",
      href: "/privacy-features",
    },
    {
      eyebrow: "Coming from another app",
      title: "Leave your old tracker cleanly",
      body: "Free templates for exporting your data and deleting the old account.",
      href: "/free",
    },
  ],

  "/tools/quiz": [
    {
      eyebrow: "Shortlists",
      title: "Skip to a ranked shortlist",
      body: "Ranked lists group apps by need, like offline use or no account.",
      href: "/resources/best",
    },
    {
      eyebrow: "Where you live",
      title: "Check your state",
      body: "Each state page covers local law. It says what that means for cloud data.",
      href: "/period-tracker-privacy",
    },
    {
      eyebrow: "Switching",
      title: "Compare trackers that store less",
      body: "Compare apps by where they keep your data, not by what they promise.",
      href: "/compare",
    },
  ],

  "/resources": [
    {
      eyebrow: "The background",
      title: "Understand the risk first",
      body: "Guides on subpoenas, HIPAA gaps, data brokers, and where app data goes.",
      href: "/resources/guides",
    },
    {
      eyebrow: "Shortlists",
      title: "Skip to a ranked shortlist",
      body: "Ranked lists group apps by need, like offline use or no account.",
      href: "/resources/best",
    },
    {
      eyebrow: "Health tracking",
      title: "Find guides for symptoms and conditions",
      body: "Use these when a clearer private record is what you actually need.",
      href: "/resources/health",
    },
  ],

  "/period-tracker-privacy": [
    {
      eyebrow: "State risk",
      title: "Check what changes where you live",
      body: "Search your state. See how local law affects cloud data.",
      href: "/period-tracker-privacy/reproductive-data-privacy-laws-alabama",
    },
    {
      eyebrow: "The background",
      title: "See why state law is only part of it",
      body: "Read the subpoena and HIPAA guides before you compare apps.",
      href: "/resources/guides",
    },
    {
      eyebrow: "Switching",
      title: "Move from risk to a safer choice",
      body: "Compare trackers once you know what your state exposes.",
      href: "/compare",
    },
  ],

  "/free": [
    {
      eyebrow: "Checklist",
      title: "Download a privacy checklist",
      body: "A practical step you can take before you switch anything.",
      href: "/free/privacy-guide",
    },
    {
      eyebrow: "State scorecard",
      title: "Save the state risk guide",
      body: "Use this when local law is the reason you are rethinking your tracker.",
      href: "/free/post-dobbs-digital-safety-kit-hub",
    },
    {
      eyebrow: "Deletion",
      title: "Leave an old app cleanly",
      body: "Export and deletion templates. Use them before you leave a cloud tracker.",
      href: "/free/delete-period-data-guide",
    },
  ],
};
