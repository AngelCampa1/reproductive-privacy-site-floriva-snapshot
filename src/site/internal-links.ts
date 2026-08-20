import { allEntries, getEntryByPath, type ContentEntry } from "@/site/content";
import type { NavItem } from "@/site/config";
import { pillarHubDefinitions } from "@/site/pillar-hubs";

export type MegamenuGroup = {
  heading: string;
  links: NavItem[];
};

const HUB_LINKS = {
  appGuides: { label: "App guides", href: "/app-guides" },
  compare: { label: "Compare period trackers", href: "/compare" },
  conditionGuides: { label: "All condition guides", href: "/resources/condition-guides" },
  guides: { label: "Privacy guides", href: "/resources/guides" },
  health: { label: "Health tracking resources", href: "/resources/health" },
  hormoneGuides: { label: "All hormone guides", href: "/resources/hormone-guides" },
  leadMagnets: { label: "Free tools and templates", href: "/free" },
  lifeStageGuides: { label: "All life stage guides", href: "/resources/life-stage-guides" },
  listicles: { label: "All ranked lists", href: "/resources/best" },
  privacyInPractice: { label: "All privacy in practice", href: "/resources/privacy-in-practice" },
  questionnaires: { label: "Quizzes & self-checks", href: "/tools/quiz" },
  resources: { label: "All resources", href: "/resources" },
  symptomGuides: { label: "All symptom guides", href: "/resources/symptom-guides" },
  wellnessGuides: { label: "All wellness guides", href: "/resources/wellness-guides" },
} satisfies Record<string, NavItem>;

const STRATEGIC_CONTENT_PATHS = [
  "/resources/guides/how-we-rank-period-trackers",
  "/resources/guides/period-app-privacy-architecture-guide",
  "/resources/guides/what-is-zero-knowledge-period-tracker",
  "/resources/guides/on-device-storage-period-tracker",
  "/resources/best/best-private-period-tracker-apps",
  "/free/privacy-guide",
  "/free/period-app-privacy-audit-kit",
];

const HEALTH_COLLECTIONS = new Set<ContentEntry["collection"]>([
  "condition-guides",
  "hormone-guides",
  "life-stage-guides",
  "symptom-guides",
  "wellness-guides",
]);

function byTitle(left: ContentEntry, right: ContentEntry): number {
  return left.title.localeCompare(right.title);
}

/**
 * Three balanced columns, no nested section tier.
 *
 * The previous shape had five groups, three of which held a single link while
 * still paying for a heading, a description paragraph, and a subheading — the
 * chrome outweighed the content, the 2-column grid left a hole on row three,
 * and the panel scrolled at 900px. "By State" is deliberately absent: it is
 * already a top-level nav item pointing at the same href, and `/period-tracker-privacy`
 * stays in the link graph through GLOBAL_NAV_LINKS in route-inventory.ts.
 */
export function buildResourcesMegamenuGroups(): MegamenuGroup[] {
  return [
    {
      heading: "Compare",
      links: [
        HUB_LINKS.compare,
        { label: "All alternatives", href: "/compare/alternatives" },
        { label: "All versus comparisons", href: "/compare/versus" },
        { label: "All pricing breakdowns", href: "/compare/pricing" },
        HUB_LINKS.listicles,
      ],
    },
    {
      heading: "Learn",
      links: [
        HUB_LINKS.resources,
        HUB_LINKS.guides,
        HUB_LINKS.health,
        HUB_LINKS.symptomGuides,
        HUB_LINKS.conditionGuides,
        HUB_LINKS.hormoneGuides,
        HUB_LINKS.wellnessGuides,
        HUB_LINKS.lifeStageGuides,
        HUB_LINKS.privacyInPractice,
      ],
    },
    {
      heading: "Tools",
      links: [HUB_LINKS.leadMagnets, HUB_LINKS.questionnaires, HUB_LINKS.appGuides],
    },
  ];
}

export function getPillarHubPathsForEntry(entry: ContentEntry): string[] {
  return pillarHubDefinitions
    .filter((hub) => hub.collections.includes(entry.collection))
    .map((hub) => hub.path);
}

function entriesFromPaths(paths: string[]): ContentEntry[] {
  return paths
    .map((path) => getEntryByPath(path))
    .filter((entry): entry is ContentEntry => entry !== null);
}

function competitorsMentioned(entry: ContentEntry): string[] {
  const haystack = `${entry.title} ${entry.description} ${entry.tags.join(" ")}`.toLowerCase();
  return ["flo", "clue", "stardust", "natural-cycles", "premom", "glow", "euki", "drip", "ovia", "spot-on"]
    .filter((name) => haystack.includes(name));
}

function stageFallbackPaths(entry: ContentEntry): string[] {
  if (entry.collection === "reproductive-privacy-state-pages" || entry.buyerStage === "tofu") {
    return [
      "/resources/guides/period-tracking-legal-safety-guide",
      "/resources/guides/can-police-access-period-tracker-data",
      "/resources/guides/on-device-storage-period-tracker",
      "/resources/best/best-private-period-tracker-apps",
      "/free/privacy-guide",
    ];
  }

  if (entry.buyerStage === "mofu") {
    return [
      "/resources/guides/how-we-rank-period-trackers",
      "/compare/alternatives/flo-app-alternative",
      "/compare/pricing/period-tracker-subscription-costs",
      "/resources/guides/period-app-privacy-architecture-guide",
      "/resources/best/best-privacy-first-period-trackers",
    ];
  }

  return [
    "/resources/guides/period-app-privacy-architecture-guide",
    "/resources/guides/on-device-storage-period-tracker",
    "/resources/best/best-private-period-tracker-apps",
    "/free/delete-period-data-guide",
  ];
}

function competitorFallbacks(entry: ContentEntry): ContentEntry[] {
  const competitors = competitorsMentioned(entry);

  if (competitors.length === 0) {
    return [];
  }

  return allEntries
    .filter((candidate) => {
      if (candidate.routePath === entry.routePath) return false;
      if (!["alternatives", "comparisons", "pricing-breakdowns", "guides", "listicles"].includes(candidate.collection)) {
        return false;
      }
      const haystack = `${candidate.title} ${candidate.description} ${candidate.tags.join(" ")}`.toLowerCase();
      return competitors.some((competitor) => haystack.includes(competitor));
    })
    .sort((left, right) => {
      const stageRank = { bofu: 0, mofu: 1, tofu: 2 } satisfies Record<ContentEntry["buyerStage"], number>;
      return stageRank[left.buyerStage] - stageRank[right.buyerStage] || byTitle(left, right);
    });
}

function sameThemeFallbacks(entry: ContentEntry): ContentEntry[] {
  const tags = new Set(entry.tags.map((tag) => tag.toLowerCase()));

  return allEntries
    .filter((candidate) => {
      if (candidate.routePath === entry.routePath) return false;
      if (candidate.collection !== entry.collection && candidate.buyerStage !== entry.buyerStage) return false;
      return candidate.tags.some((tag) => tags.has(tag.toLowerCase()));
    })
    .sort(byTitle);
}

function addUnique(target: ContentEntry[], candidates: ContentEntry[], currentPath: string, max: number): void {
  for (const candidate of candidates) {
    if (target.length >= max) return;
    if (candidate.routePath === currentPath) continue;
    if (target.some((entry) => entry.routePath === candidate.routePath)) continue;
    target.push(candidate);
  }
}

function normalizeNavPath(pathname: string): string {
  if (!pathname || pathname === "/") return "/";
  return pathname.split("#")[0].split("?")[0].replace(/\/+$/, "") || "/";
}

function nextStepsForEntry(entry: ContentEntry, links: NavItem[], fallbacks: NavItem[] = []): NavItem[] {
  const currentPath = normalizeNavPath(entry.routePath);
  const nextSteps: NavItem[] = [];

  for (const link of [...links, ...fallbacks]) {
    if (normalizeNavPath(link.href) === currentPath) continue;
    if (nextSteps.some((existing) => normalizeNavPath(existing.href) === normalizeNavPath(link.href))) continue;
    nextSteps.push(link);
    if (nextSteps.length >= 3) return nextSteps;
  }

  return nextSteps;
}

/**
 * `maximum` stays at 6 on purpose. 37 entries author more than that and get
 * truncated, which is fine: these cards now sit inside the merged "Where to
 * next" block alongside the funnel links, and the point of merging was to stop
 * the page ending in eleven competing destinations.
 *
 * The fallback cascade below is currently unreachable — every one of the 446
 * entries authors at least 3 `relatedPages` and all of them resolve, an
 * invariant `internal-links.test.ts` enforces. It is kept as the safety net for
 * the case where a target is deleted out from under an entry, not because it
 * runs today.
 */
export function resolveFunnelAwareRelatedEntries(entry: ContentEntry, minimum = 3, maximum = 6): ContentEntry[] {
  const related: ContentEntry[] = [];

  addUnique(related, entriesFromPaths(entry.relatedPages), entry.routePath, maximum);

  if (related.length < minimum) {
    addUnique(related, competitorFallbacks(entry), entry.routePath, maximum);
  }

  if (related.length < minimum) {
    addUnique(related, entriesFromPaths(stageFallbackPaths(entry)), entry.routePath, maximum);
  }

  if (related.length < minimum) {
    addUnique(related, entriesFromPaths(STRATEGIC_CONTENT_PATHS), entry.routePath, maximum);
  }

  if (related.length < minimum) {
    addUnique(related, sameThemeFallbacks(entry), entry.routePath, maximum);
  }

  if (related.length < minimum) {
    addUnique(related, allEntries.filter((candidate) => candidate.routePath !== entry.routePath).sort(byTitle), entry.routePath, maximum);
  }

  return related;
}

export function buildContentNextStepLinks(entry: ContentEntry): NavItem[] {
  if (entry.collection === "lead-magnets" || entry.collection === "questionnaires") {
    const healthIntent = [
      entry.title,
      entry.description,
      ...entry.tags,
      ...entry.targetPersona,
    ].join(" ").toLowerCase();
    const isPrivacyOrSwitching = /privacy|delete|deletion|export|subpoena|state|scorecard|audit|app|tracker|cloud|data broker|switch|flo|clue|stardust|natural cycles|premom|glow/.test(healthIntent);
    const isHealthPrep = /doctor|visit|clinic|gynecologist|symptom|pain|bleeding|pmdd|pcos|thyroid|lab|telehealth|school|work|travel|endometriosis|fertility|postpartum|perimenopause|hormone/.test(healthIntent);

    if (isHealthPrep && !isPrivacyOrSwitching) {
      return nextStepsForEntry(entry, [
        { label: "Prepare for a visit with Floriva", href: "/app-guides/floriva-for-gynecologist-prep" },
        { label: "Browse health tracking guides", href: "/resources/health" },
        { label: "Check privacy before you save notes", href: "/resources/guides/period-tracker-data-minimization-guide" },
      ]);
    }

    return nextStepsForEntry(entry, [
      { label: "Audit your current app", href: "/free/period-app-privacy-audit-kit" },
      { label: "Read privacy guides", href: "/resources/guides" },
      { label: "Compare private trackers", href: "/resources/best/best-private-period-tracker-apps" },
      { label: "Read privacy red flags", href: "/resources/guides/period-app-privacy-red-flags" },
    ]);
  }

  if (HEALTH_COLLECTIONS.has(entry.collection)) {
    return nextStepsForEntry(entry, [
      { label: "Prepare for a visit with Floriva", href: "/app-guides/floriva-for-gynecologist-prep" },
      { label: "Browse health tracking guides", href: "/resources/health" },
      { label: "Keep notes private", href: "/resources/guides/period-tracker-data-minimization-guide" },
    ], [
      { label: "Compare private tracker options", href: "/resources/best/best-private-period-tracker-apps" },
      { label: "Download the privacy guide", href: "/free/privacy-guide" },
    ]);
  }

  if (entry.collection === "reproductive-privacy-state-pages" || entry.buyerStage === "tofu") {
    return nextStepsForEntry(entry, [
      { label: "Compare private tracker options", href: "/resources/best/best-private-period-tracker-apps" },
      { label: "Read the legal safety guide", href: "/resources/guides/period-tracking-legal-safety-guide" },
      { label: "Download the privacy guide", href: "/free/privacy-guide" },
    ], [
      { label: "Read about police access risks", href: "/resources/guides/can-police-access-period-tracker-data" },
      { label: "Learn on-device storage", href: "/resources/guides/on-device-storage-period-tracker" },
    ]);
  }

  if (entry.collection === "privacy-in-practice") {
    return nextStepsForEntry(entry, [
      { label: "Audit your current app", href: "/free/period-app-privacy-audit-kit" },
      { label: "Reduce the data you save", href: "/resources/guides/period-tracker-data-minimization-guide" },
      { label: "Lock down your phone", href: "/resources/privacy-in-practice/lock-down-period-data-on-your-phone" },
    ], [
      { label: "See who can ask for your data", href: "/resources/privacy-in-practice/who-can-legally-get-your-period-data" },
      { label: "Get your data out", href: "/resources/privacy-in-practice/period-tracker-data-portability-export" },
    ]);
  }

  if (entry.collection === "app-guides") {
    return nextStepsForEntry(entry, [
      { label: "See Floriva privacy features", href: "/privacy-features" },
      { label: "Compare pricing", href: "/compare/pricing" },
      { label: "Browse free tools", href: "/free" },
    ], [
      { label: "Get the switcher guide", href: "/free/delete-period-data-guide" },
      { label: "Browse health tracking guides", href: "/resources/health" },
    ]);
  }

  if (entry.buyerStage === "mofu") {
    return nextStepsForEntry(entry, [
      { label: "Review the ranking method", href: "/resources/guides/how-we-rank-period-trackers" },
      { label: "Compare pricing models", href: "/compare/pricing" },
      { label: "See Floriva privacy features", href: "/privacy-features" },
    ]);
  }

  return nextStepsForEntry(entry, [
    { label: "See Floriva privacy features", href: "/privacy-features" },
    { label: "Compare pricing", href: "/compare/pricing" },
    { label: "Get the switcher guide", href: "/free/delete-period-data-guide" },
  ]);
}

function uniqueNonSelfLinks(links: NavItem[], currentPath: string, minimum = 3): NavItem[] {
  const normalizedCurrent = normalizeNavPath(currentPath);
  const nextLinks: NavItem[] = [];

  for (const link of links) {
    const normalizedHref = normalizeNavPath(link.href);
    if (normalizedHref === normalizedCurrent) continue;
    if (nextLinks.some((existing) => normalizeNavPath(existing.href) === normalizedHref)) continue;
    nextLinks.push(link);
    if (nextLinks.length >= minimum) return nextLinks;
  }

  return nextLinks;
}

export function buildHubNextStepLinks(collections: readonly ContentEntry["collection"][], currentPath = ""): NavItem[] {
  const hubFallbacks = [
    { label: "Compare period trackers", href: "/compare" },
    { label: "Read privacy guides", href: "/resources/guides" },
    { label: "Check privacy by state", href: "/period-tracker-privacy" },
    { label: "Browse health tracking resources", href: "/resources/health" },
    { label: "Use free tools and templates", href: "/free" },
    { label: "See Floriva privacy features", href: "/privacy-features" },
  ];

  if (collections.includes("alternatives") || collections.includes("comparisons") || collections.includes("pricing-breakdowns")) {
    return uniqueNonSelfLinks([
      { label: "Read how we rank trackers", href: "/resources/guides/how-we-rank-period-trackers" },
      { label: "Browse private ranked lists", href: "/resources/best" },
      { label: "See Floriva privacy features", href: "/privacy-features" },
      ...hubFallbacks,
    ], currentPath);
  }

  if (collections.includes("reproductive-privacy-state-pages")) {
    return uniqueNonSelfLinks([
      { label: "Read the legal safety guide", href: "/resources/guides/period-tracking-legal-safety-guide" },
      { label: "Compare private tracker apps", href: "/resources/best/best-private-period-tracker-apps" },
      { label: "Download the state risk scorecard", href: "/free/post-dobbs-digital-safety-kit-hub" },
      ...hubFallbacks,
    ], currentPath);
  }

  if (collections.includes("lead-magnets")) {
    return uniqueNonSelfLinks([
      { label: "Browse free tools and templates", href: "/free" },
      { label: "Read privacy guides", href: "/resources/guides" },
      { label: "Browse health tracking resources", href: "/resources/health" },
      { label: "Compare private tracker apps", href: "/resources/best/best-private-period-tracker-apps" },
      ...hubFallbacks,
    ], currentPath);
  }

  return uniqueNonSelfLinks([
    { label: "Compare period trackers", href: "/compare" },
    { label: "Check privacy by state", href: "/period-tracker-privacy" },
    { label: "Use free tools and templates", href: "/free" },
    ...hubFallbacks,
  ], currentPath);
}
