import { collectionDefinitions, type CollectionKey } from "./config";

export type PillarHubSection = {
  title: string;
  description: string;
  collections: CollectionKey[];
  /**
   * The hub that owns this section's full list. When set, the section renders
   * as a short preview with a "See all" link instead of every card it matches.
   *
   * This is what keeps a pillar hub a landing page. Without it `/resources`
   * rendered all 273 of its entries in one grid roughly 44 screens tall, and
   * `/compare` did the same with 121.
   */
  seeAllHref?: string;
};

export type PillarHubDefinition = {
  path: string;
  title: string;
  description: string;
  sections: PillarHubSection[];
  collections: CollectionKey[];
};

/*
 * There is deliberately no `guideLinks` here. It used to exist on three hubs,
 * but `hub-page.tsx` reads `hubGuideLinks[path]` first and that table now
 * covers all 18 hubs, so every card authored here was unreachable. Nine of them
 * sat unread through the copy pass and kept the old sentence-with-a-period
 * heading voice the rest of the site moved off. "Choose your path" copy lives
 * in `marketing-links.ts` only. Adding the field back re-splits it in two.
 */

function collectionsFromSections(sections: PillarHubSection[]): CollectionKey[] {
  return [...new Set(sections.flatMap((section) => section.collections))];
}

function pillarHub(definition: Omit<PillarHubDefinition, "collections">): PillarHubDefinition {
  return {
    ...definition,
    collections: collectionsFromSections(definition.sections),
  };
}

export const pillarHubDefinitions = [
  pillarHub({
    path: "/compare",
    title: "Compare period trackers",
    description:
      "Switch pages, side-by-side comparisons, prices, and ranked lists. For people leaving a big-name tracker.",
    sections: [
      {
        title: "Alternatives",
        description: collectionDefinitions.alternatives.description,
        collections: ["alternatives"],
        seeAllHref: "/compare/alternatives",
      },
      {
        title: "Versus comparisons",
        description: collectionDefinitions.comparisons.description,
        collections: ["comparisons"],
        seeAllHref: "/compare/versus",
      },
      {
        title: "Pricing breakdowns",
        description: collectionDefinitions["pricing-breakdowns"].description,
        collections: ["pricing-breakdowns"],
        seeAllHref: "/compare/pricing",
      },
      {
        title: "Ranked decision pages",
        description: collectionDefinitions.listicles.description,
        collections: ["listicles"],
        seeAllHref: "/resources/best",
      },
    ],
  }),
  /* `/resources` is the site's largest hub — 9 collections, 273 entries. It had
     no pillar definition, so it fell through to the flat-grid branch and
     rendered every one of them in a single unsorted list. Every section here
     previews a few entries and hands off to the hub that owns the full set. */
  pillarHub({
    path: "/resources",
    title: "Floriva privacy resources",
    description: "Every guide, list, and download. Grouped by what you came to find.",
    sections: [
      {
        title: "Privacy guides",
        description: "How period apps handle your data. What the law leaves out.",
        collections: ["guides", "privacy-in-practice"],
        seeAllHref: "/resources/guides",
      },
      {
        title: "Ranked lists",
        description: "Apps ranked by where they keep your data, for a specific need.",
        collections: ["listicles"],
        seeAllHref: "/resources/best",
      },
      {
        // Section titles read back inside "See all N {title}", so they need to
        // work as plural nouns.
        title: "Health guides",
        description: "Guides for symptoms, conditions, hormones, and life changes.",
        collections: [
          "symptom-guides",
          "condition-guides",
          "hormone-guides",
          "wellness-guides",
          "life-stage-guides",
        ],
        seeAllHref: "/resources/health",
      },
      {
        title: "Free downloads",
        description: "Worksheets, checklists, and scripts you can fill in and keep.",
        collections: ["lead-magnets"],
        seeAllHref: "/free",
      },
    ],
  }),
  pillarHub({
    path: "/resources/guides",
    title: "Floriva privacy guides",
    description: "Research on privacy and the law. Plus steps you can take yourself.",
    sections: [
      {
        title: "Privacy research",
        description: collectionDefinitions.guides.description,
        collections: ["guides"],
      },
      {
        title: "Privacy in practice",
        description: collectionDefinitions["privacy-in-practice"].description,
        collections: ["privacy-in-practice"],
      },
    ],
  }),
  pillarHub({
    path: "/resources/health",
    title: "Health tracking resources",
    description:
      "Health tracking guides for symptoms, conditions, hormones, wellness, and life-stage changes.",
    sections: [
      {
        title: "Symptom guides",
        description: collectionDefinitions["symptom-guides"].description,
        collections: ["symptom-guides"],
        seeAllHref: "/resources/symptom-guides",
      },
      {
        title: "Condition guides",
        description: collectionDefinitions["condition-guides"].description,
        collections: ["condition-guides"],
        seeAllHref: "/resources/condition-guides",
      },
      {
        title: "Hormone guides",
        description: collectionDefinitions["hormone-guides"].description,
        collections: ["hormone-guides"],
        seeAllHref: "/resources/hormone-guides",
      },
      {
        title: "Wellness guides",
        description: collectionDefinitions["wellness-guides"].description,
        collections: ["wellness-guides"],
        seeAllHref: "/resources/wellness-guides",
      },
      {
        title: "Life stage guides",
        description: collectionDefinitions["life-stage-guides"].description,
        collections: ["life-stage-guides"],
        seeAllHref: "/resources/life-stage-guides",
      },
    ],
  }),
  pillarHub({
    path: "/period-tracker-privacy",
    title: "Period tracker privacy by state",
    description: "All state pages on abortion law context, data protection, and subpoena exposure.",
    sections: [
      {
        title: "State privacy pages",
        description: collectionDefinitions["reproductive-privacy-state-pages"].description,
        collections: ["reproductive-privacy-state-pages"],
      },
    ],
  }),
  pillarHub({
    path: "/free",
    title: "Free tools and templates",
    description: "Free HTML worksheets, scripts, checklists, cards, and downloadable resources from Floriva.",
    sections: [
      {
        title: "Tools and templates",
        description: collectionDefinitions["lead-magnets"].description,
        collections: ["lead-magnets"],
      },
    ],
  }),
  pillarHub({
    path: "/tools/quiz",
    title: "Quizzes & self-checks",
    description: collectionDefinitions.questionnaires.description,
    sections: [
      {
        title: "Decision tools",
        description: collectionDefinitions.questionnaires.description,
        collections: ["questionnaires"],
      },
    ],
  }),
  pillarHub({
    path: "/app-guides",
    title: "App Guides",
    description: collectionDefinitions["app-guides"].description,
    sections: [
      {
        title: "Floriva setup and migration",
        description: collectionDefinitions["app-guides"].description,
        collections: ["app-guides"],
      },
    ],
  }),
] satisfies PillarHubDefinition[];

export const pillarHubDefinitionsByPath = Object.fromEntries(
  pillarHubDefinitions.map((hub) => [hub.path, hub]),
) as Record<string, PillarHubDefinition>;
