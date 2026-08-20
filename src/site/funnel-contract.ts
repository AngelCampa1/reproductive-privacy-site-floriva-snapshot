import type { CollectionKey } from "@/site/config";

export type BuyerStage = "tofu" | "mofu" | "bofu";

export type FunnelCollectionContract = {
  allowedStages: readonly BuyerStage[];
  collection: CollectionKey;
  hubPath: string;
  primaryNextStep: string;
  primaryStage: BuyerStage;
  routeBase: string;
};

export const funnelCollectionContracts = [
  {
    allowedStages: ["bofu"],
    collection: "alternatives",
    hubPath: "/compare",
    primaryNextStep: "Compare pricing, privacy features, switcher guide",
    primaryStage: "bofu",
    routeBase: "/compare/alternatives",
  },
  {
    allowedStages: ["mofu", "bofu"],
    collection: "comparisons",
    hubPath: "/compare",
    primaryNextStep: "Ranking method, pricing, privacy features",
    primaryStage: "mofu",
    routeBase: "/compare/versus",
  },
  {
    allowedStages: ["mofu", "bofu"],
    collection: "pricing-breakdowns",
    hubPath: "/compare/pricing",
    primaryNextStep: "Ranking method, pricing hub, privacy features",
    primaryStage: "mofu",
    routeBase: "/compare/pricing",
  },
  {
    allowedStages: ["mofu"],
    collection: "listicles",
    hubPath: "/resources/best",
    primaryNextStep: "Ranking method, comparison hub, privacy features",
    primaryStage: "mofu",
    routeBase: "/resources/best",
  },
  {
    allowedStages: ["tofu", "mofu"],
    collection: "guides",
    hubPath: "/resources/guides",
    primaryNextStep: "Private tracker list, legal safety guide, free privacy guide",
    primaryStage: "tofu",
    routeBase: "/resources/guides",
  },
  {
    allowedStages: ["mofu"],
    collection: "privacy-in-practice",
    hubPath: "/resources/privacy-in-practice",
    primaryNextStep: "Audit checklist, data minimization, tracker check",
    primaryStage: "mofu",
    routeBase: "/resources/privacy-in-practice",
  },
  {
    allowedStages: ["tofu"],
    collection: "symptom-guides",
    hubPath: "/resources/health",
    primaryNextStep: "Visit prep, health resources, data minimization",
    primaryStage: "tofu",
    routeBase: "/resources/symptom-guides",
  },
  {
    allowedStages: ["tofu", "mofu"],
    collection: "condition-guides",
    hubPath: "/resources/health",
    primaryNextStep: "Visit prep, health resources, data minimization",
    primaryStage: "tofu",
    routeBase: "/resources/condition-guides",
  },
  {
    allowedStages: ["tofu", "mofu"],
    collection: "hormone-guides",
    hubPath: "/resources/health",
    primaryNextStep: "Visit prep, health resources, data minimization",
    primaryStage: "tofu",
    routeBase: "/resources/hormone-guides",
  },
  {
    allowedStages: ["tofu"],
    collection: "life-stage-guides",
    hubPath: "/resources/health",
    primaryNextStep: "Visit prep, health resources, data minimization",
    primaryStage: "tofu",
    routeBase: "/resources/life-stage-guides",
  },
  {
    allowedStages: ["tofu", "mofu"],
    collection: "wellness-guides",
    hubPath: "/resources/health",
    primaryNextStep: "Visit prep, health resources, data minimization",
    primaryStage: "tofu",
    routeBase: "/resources/wellness-guides",
  },
  {
    allowedStages: ["tofu"],
    collection: "reproductive-privacy-state-pages",
    hubPath: "/period-tracker-privacy",
    primaryNextStep: "Private tracker list, legal guide, privacy guide",
    primaryStage: "tofu",
    routeBase: "/period-tracker-privacy",
  },
  {
    allowedStages: ["tofu", "mofu", "bofu"],
    collection: "lead-magnets",
    hubPath: "/free",
    primaryNextStep: "App setup, health resources, data minimization",
    primaryStage: "tofu",
    routeBase: "/free",
  },
  {
    allowedStages: ["tofu", "mofu"],
    collection: "questionnaires",
    hubPath: "/tools/quiz",
    primaryNextStep: "App setup, health resources, data minimization",
    primaryStage: "mofu",
    routeBase: "/tools/quiz",
  },
  {
    allowedStages: ["bofu"],
    collection: "app-guides",
    hubPath: "/app-guides",
    primaryNextStep: "Privacy features, pricing, switcher guide",
    primaryStage: "bofu",
    routeBase: "/app-guides",
  },
] as const satisfies readonly FunnelCollectionContract[];

export const funnelCollectionContractsByCollection = Object.fromEntries(
  funnelCollectionContracts.map((contract) => [contract.collection, contract]),
) as unknown as Record<CollectionKey, FunnelCollectionContract>;
