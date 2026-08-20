import { collectionDefinitions, type CollectionDefinition, type CollectionKey } from "@/site/config";
import { contentEntries } from "./generated/content-index";

type Answer = {
  question: string;
  answer: string;
};

type Definition = {
  term: string;
  definition: string;
};

type PricingStat = {
  stat: string;
  source: string;
  sourceUrl?: string;
};

type ProsCons = {
  subject: string;
  pros: string[];
  cons: string[];
};

type ExpertQuote = {
  quote: string;
  personName: string;
  jobTitle?: string;
  organization?: string;
  sourceUrl?: string;
  sourceLabel?: string;
};

export type Source = {
  id: string;
  claim: string;
  url: string;
  publisher: string;
  publishedAt?: string;
  accessedAt?: string;
  primary: boolean;
  softened: boolean;
};

type RelevantLaw = {
  name: string;
  summary: string;
  url?: string;
};

type Competitor = {
  name: string;
  slug: string;
  pricing?: string;
  weakness?: string;
  pros?: string[];
  cons?: string[];
};

type Tool = {
  name: string;
  summary: string;
  pros: string[];
  cons: string[];
  pricing?: string;
  verdict?: string;
};

type Tier = {
  name: string;
  price?: string;
  description?: string;
  features: string[];
};

type HiddenCost = {
  label: string;
  detail: string;
};

type ContentEntryData = {
  title: string;
  description: string;
  seoTitle: string;
  metaDescription: string;
  publishedAt: string;
  updatedAt: string;
  buyerStage: "bofu" | "mofu" | "tofu";
  body?: string;
  collection: CollectionKey;
  id: string;
  readingMinutes: number;
  routePath: string;
  slug: string;
  ogImage?: string;
  tags: string[];
  targetPersona: string[];
  schema?: string;
  bluf?: string;
  faqs: Array<{ q: string; a: string }>;
  answers: Answer[];
  definitions: Definition[];
  pricingStats: PricingStat[];
  proscons: ProsCons[];
  expertQuotes: ExpertQuote[];
  relatedPages: string[];
  competitor?: Competitor;
  relevantLaws: RelevantLaw[];
  keyFacts: string[];
  tools: Tool[];
  tiers: Tier[];
  hiddenCosts: HiddenCost[];
  sources: Source[];
  tableData?: unknown;
  state?: string;
  stateCode?: string;
  abortionLawStatus?: string;
  dataProtectionLevel?: string;
  subpoenaRisk?: string;
  freePreviewSections?: number;
};

export type ContentEntry = ContentEntryData & {
  definition: CollectionDefinition;
};

const typedEntries = contentEntries as unknown as ContentEntryData[];

export const allEntries: ContentEntry[] = typedEntries.map((entry) => ({
  ...entry,
  definition: collectionDefinitions[entry.collection],
}));

export function getEntriesByCollection(collection: CollectionKey): ContentEntry[] {
  return allEntries.filter((entry) => entry.collection === collection);
}

export function getEntryByCollectionSlug(collection: CollectionKey, slug: string): ContentEntry | null {
  return allEntries.find((entry) => entry.collection === collection && entry.slug === slug) ?? null;
}

function normalizeContentPath(pathname: string): string {
  if (!pathname || pathname === "/") {
    return "/";
  }

  return pathname.replace(/\/+$/, "") || "/";
}

export function getEntryByPath(pathname: string): ContentEntry | null {
  const normalizedPathname = normalizeContentPath(pathname);

  return allEntries.find((entry) => normalizeContentPath(entry.routePath) === normalizedPathname) ?? null;
}

export function resolveRelatedEntries(entry: ContentEntry): ContentEntry[] {
  return entry.relatedPages
    .map((path) => getEntryByPath(path))
    .filter((relatedEntry): relatedEntry is ContentEntry => relatedEntry !== null);
}

export function getHubEntries(collections: CollectionKey[]): ContentEntry[] {
  return allEntries.filter((entry) => collections.includes(entry.collection));
}

const bodyLoaders = import.meta.glob("./generated/bodies/*.ts");

export async function loadEntryBody(id: string): Promise<string> {
  // ids are collection/slug; sanitizeId mirrors the generator: replace non-safe chars with _, / with __
  const sanitized = id.replace(/[^a-zA-Z0-9\-_/]/g, "_").replace(/\//g, "__");
  const key = `./generated/bodies/${sanitized}.ts`;
  const loader = bodyLoaders[key];

  if (!loader) {
    return "";
  }

  const mod = await loader() as { default: string };
  return mod.default ?? "";
}

export function searchEntries(entries: ContentEntry[], query: string): ContentEntry[] {
  const normalizedQuery = query
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9\s]+/g, " ")
    .replace(/\s+/g, " ");

  if (!normalizedQuery) {
    return entries;
  }

  return entries.filter((entry) => {
    const haystack = [
      entry.title,
      entry.description,
      entry.bluf ?? "",
      entry.tags.join(" "),
      entry.state ?? "",
    ]
      .join(" ")
      .toLowerCase();
    const normalizedHaystack = haystack.replace(/[^a-z0-9\s]+/g, " ").replace(/\s+/g, " ");

    return normalizedHaystack.includes(normalizedQuery);
  });
}
