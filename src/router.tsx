import { createBrowserRouter } from "react-router-dom";
import { SiteShell } from "@/components/site-shell";
import { contentElement, homeElement, hubElement, staticPage } from "@/pages/lazy-pages";
import { type CollectionKey, collectionDefinitions } from "@/site/config";
import { pillarHubDefinitionsByPath } from "@/site/pillar-hubs";

const freeHub = pillarHubDefinitionsByPath["/free"];
const stateHub = pillarHubDefinitionsByPath["/period-tracker-privacy"];
const quizHub = pillarHubDefinitionsByPath["/tools/quiz"];

const resourceCollections: CollectionKey[] = [
  "guides",
  "listicles",
  "lead-magnets",
  "symptom-guides",
  "condition-guides",
  "hormone-guides",
  "life-stage-guides",
  "privacy-in-practice",
  "wellness-guides",
];

const collectionHubCopy: Partial<Record<CollectionKey, { description: string; title: string }>> = {
  "app-guides": {
    description: collectionDefinitions["app-guides"].description,
    title: collectionDefinitions["app-guides"].label,
  },
  "condition-guides": {
    description: collectionDefinitions["condition-guides"].description,
    title: collectionDefinitions["condition-guides"].label,
  },
  "hormone-guides": {
    description: collectionDefinitions["hormone-guides"].description,
    title: collectionDefinitions["hormone-guides"].label,
  },
  "life-stage-guides": {
    description: collectionDefinitions["life-stage-guides"].description,
    title: collectionDefinitions["life-stage-guides"].label,
  },
  "privacy-in-practice": {
    description: collectionDefinitions["privacy-in-practice"].description,
    title: collectionDefinitions["privacy-in-practice"].label,
  },
  "symptom-guides": {
    description: collectionDefinitions["symptom-guides"].description,
    title: collectionDefinitions["symptom-guides"].label,
  },
  "wellness-guides": {
    description: collectionDefinitions["wellness-guides"].description,
    title: collectionDefinitions["wellness-guides"].label,
  },
};

function routePath(routeBase: string): string {
  return routeBase.replace(/^\//, "");
}

function contentRoutes(collection: CollectionKey) {
  const definition = collectionDefinitions[collection];
  const copy = collectionHubCopy[collection] ?? {
    description: definition.description,
    title: definition.label,
  };

  return [
    {
      path: routePath(definition.routeBase),
      element: hubElement([collection], copy.description, copy.title),
    },
    {
      path: `${routePath(definition.routeBase)}/:slug`,
      element: contentElement(collection),
    },
  ];
}

export const router = createBrowserRouter([
  {
    path: "/",
    element: <SiteShell />,
    children: [
      { index: true, element: homeElement() },
      {
        path: "compare",
        element: hubElement(pillarHubDefinitionsByPath["/compare"].collections, pillarHubDefinitionsByPath["/compare"].description, pillarHubDefinitionsByPath["/compare"].title),
      },
      {
        path: "compare/alternatives",
        element: hubElement(["alternatives"], "Switching pages for users abandoning Flo, Clue, Premom, and the rest.", "Private alternatives to mainstream period trackers"),
      },
      { path: "compare/alternatives/:slug", element: contentElement("alternatives") },
      {
        path: "compare/versus",
        element: hubElement(["comparisons"], "Direct privacy and pricing comparisons between the apps people search head-to-head.", "Period tracker privacy comparisons"),
      },
      { path: "compare/versus/:slug", element: contentElement("comparisons") },
      {
        path: "compare/pricing",
        element: hubElement(["pricing-breakdowns"], "How much each tracker really costs when privacy and cloud storage are part of the bill.", "Period tracker pricing breakdowns"),
      },
      { path: "compare/pricing/:slug", element: contentElement("pricing-breakdowns") },
      {
        path: "resources",
        element: hubElement(resourceCollections, "Guides, rankings, and free resources for people researching reproductive-data privacy.", "Floriva privacy resources"),
      },
      {
        path: "resources/best",
        element: hubElement(["listicles"], "Ranked lists focused on private, low-surveillance alternatives.", "Best private period tracker lists"),
      },
      { path: "resources/best/:slug", element: contentElement("listicles") },
      {
        path: "resources/guides",
        element: hubElement(pillarHubDefinitionsByPath["/resources/guides"].collections, pillarHubDefinitionsByPath["/resources/guides"].description, pillarHubDefinitionsByPath["/resources/guides"].title),
      },
      { path: "resources/guides/:slug", element: contentElement("guides") },
      {
        path: "resources/health",
        element: hubElement(pillarHubDefinitionsByPath["/resources/health"].collections, pillarHubDefinitionsByPath["/resources/health"].description, pillarHubDefinitionsByPath["/resources/health"].title),
      },
      ...contentRoutes("symptom-guides"),
      ...contentRoutes("condition-guides"),
      ...contentRoutes("hormone-guides"),
      ...contentRoutes("life-stage-guides"),
      ...contentRoutes("privacy-in-practice"),
      ...contentRoutes("wellness-guides"),
      ...contentRoutes("app-guides"),
      {
        path: "period-tracker-privacy",
        element: hubElement(stateHub.collections, stateHub.description, stateHub.title),
      },
      {
        path: "period-tracker-privacy/:slug",
        element: contentElement("reproductive-privacy-state-pages"),
      },
      {
        path: "free",
        element: hubElement(freeHub.collections, freeHub.description, freeHub.title),
      },
      { path: "free/:slug", element: contentElement("lead-magnets") },
      {
        path: "tools/quiz",
        element: hubElement(quizHub.collections, quizHub.description, quizHub.title),
      },
      { path: "tools/quiz/:slug", element: contentElement("questionnaires") },
      { path: "get", element: staticPage("GetAppPage") },
      { path: "privacy", element: staticPage("PrivacyPage") },
      { path: "privacy-features", element: staticPage("PrivacyFeaturesPage") },
      { path: "support", element: staticPage("SupportPage") },
      { path: "terms", element: staticPage("TermsPage") },
      { path: "*", element: staticPage("NotFoundPage") },
    ],
  },
]);
