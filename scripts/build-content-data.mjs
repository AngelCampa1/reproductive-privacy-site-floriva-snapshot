import { promises as fs } from "node:fs";
import path from "node:path";
import matter from "gray-matter";
import { z } from "zod";

const rootDir = process.cwd();
const contentDir = path.join(rootDir, "content");
const outputFile = path.join(rootDir, "src", "site", "generated", "content-data.ts");
const indexFile = path.join(rootDir, "src", "site", "generated", "content-index.ts");
const bodiesDir = path.join(rootDir, "src", "site", "generated", "bodies");
const manifestFile = path.join(rootDir, "src", "site", "content-manifest.ts");

function sanitizeId(id) {
  // ids are collection/slug — replace any chars not safe for filenames with _
  return id.replace(/[^a-zA-Z0-9\-_/]/g, "_").replace(/\//g, "__");
}

const routeMap = {
  "app-guides": "/app-guides",
  alternatives: "/compare/alternatives",
  "condition-guides": "/resources/condition-guides",
  comparisons: "/compare/versus",
  guides: "/resources/guides",
  "hormone-guides": "/resources/hormone-guides",
  "lead-magnets": "/free",
  "life-stage-guides": "/resources/life-stage-guides",
  listicles: "/resources/best",
  "pricing-breakdowns": "/compare/pricing",
  "privacy-in-practice": "/resources/privacy-in-practice",
  "reproductive-privacy-state-pages": "/period-tracker-privacy",
  "symptom-guides": "/resources/symptom-guides",
  "wellness-guides": "/resources/wellness-guides",
  questionnaires: "/tools/quiz",
};

const faqSchema = z.object({
  q: z.string(),
  a: z.string(),
});

const answerSchema = z
  .union([
    z.object({ q: z.string(), a: z.string() }),
    z.object({ question: z.string(), answer: z.string() }),
  ])
  .transform((value) => ({
    question: "question" in value ? value.question : value.q,
    answer: "answer" in value ? value.answer : value.a,
  }));

const definitionSchema = z.object({
  term: z.string(),
  definition: z.string(),
});

const pricingStatSchema = z.object({
  stat: z.string(),
  source: z.string(),
  sourceUrl: z.string().optional(),
});

const prosConsSchema = z.object({
  subject: z.string(),
  pros: z.array(z.string()).default([]),
  cons: z.array(z.string()).default([]),
});

const expertQuoteSchema = z.object({
  quote: z.string(),
  personName: z.string(),
  jobTitle: z.string().optional(),
  organization: z.string().optional(),
  sourceUrl: z.string().url().optional(),
  sourceLabel: z.string().optional(),
});

const sourceSchema = z.object({
  id: z.string(),
  claim: z.string(),
  url: z.string().url(),
  publisher: z.string(),
  publishedAt: z.string().optional(),
  accessedAt: z.string().optional(),
  primary: z.boolean().default(true),
  softened: z.boolean().default(false),
});

const relevantLawSchema = z.object({
  name: z.string(),
  summary: z.string(),
  url: z.string().optional(),
});

const competitorSchema = z.object({
  name: z.string(),
  slug: z.string(),
  pricing: z.string().optional(),
  weakness: z.string().optional(),
  pros: z.array(z.string()).optional(),
  cons: z.array(z.string()).optional(),
});

const toolSchema = z.object({
  name: z.string(),
  summary: z.string(),
  pros: z.array(z.string()).default([]),
  cons: z.array(z.string()).default([]),
  pricing: z.string().optional(),
  verdict: z.string().optional(),
});

const tierSchema = z.object({
  name: z.string(),
  price: z.string().optional(),
  description: z.string().optional(),
  features: z.array(z.string()).default([]),
});

const hiddenCostSchema = z.object({
  label: z.string(),
  detail: z.string(),
});

const normalizedHiddenCostsSchema = z
  .array(z.union([z.string(), hiddenCostSchema]))
  .transform((items) =>
    items.map((item, index) =>
      typeof item === "string"
        ? { detail: item, label: `Hidden cost ${index + 1}` }
        : item,
    ),
  );

const commonSchema = z
  .object({
    title: z.string(),
    description: z.string(),
    ogImage: z.string().optional(),
    tags: z.array(z.string()).default([]),
    publishedAt: z.string(),
    updatedAt: z.string(),
    buyerStage: z.enum(["bofu", "mofu", "tofu"]),
    targetPersona: z.array(z.string()).default([]),
    schema: z.string().optional(),
    bluf: z.string().optional(),
    faqs: z.array(faqSchema).default([]),
    answers: z.array(answerSchema).default([]),
    definitions: z.array(definitionSchema).default([]),
    pricingStats: z.array(pricingStatSchema).default([]),
    proscons: z.array(prosConsSchema).default([]),
    expertQuotes: z.array(expertQuoteSchema).default([]),
    relatedPages: z.array(z.string()).default([]),
    competitor: competitorSchema.optional(),
    relevantLaws: z.array(relevantLawSchema).default([]),
    keyFacts: z.array(z.string()).default([]),
    tools: z.array(toolSchema).default([]),
    tiers: z.array(tierSchema).default([]),
    hiddenCosts: normalizedHiddenCostsSchema.default([]),
    sources: z.array(sourceSchema).default([]),
    tableData: z.unknown().optional(),
    state: z.string().optional(),
    stateCode: z.string().optional(),
    abortionLawStatus: z.string().optional(),
    dataProtectionLevel: z.string().optional(),
    subpoenaRisk: z.string().optional(),
    freePreviewSections: z.number().optional(),
  })
  .passthrough();

const mojibakeMap = [
  ["Ã¢â‚¬â€", "-"],
  ["Ã¢â‚¬â€œ", "-"],
  ["Ã¢â‚¬â„¢", "'"],
  ["Ã¢â‚¬Ëœ", "'"],
  ['Ã¢â‚¬Å“', '"'],
  ['Ã¢â‚¬\x9d', '"'],
  ["Ã¢â‚¬Â¦", "..."],
  ["Ã¢â€ â€™", "->"],
  ["Ã¢â€°Â ", "!="],
  ["Ãƒâ€”", "x"],
  ["Ã‚", ""],
  ["Ã©", "e"],
  ["Ã¨", "e"],
  ["Ã¡", "a"],
  ["Ã³", "o"],
  ["Ã±", "n"],
  ["Î±", "alpha"],
  ["Î²", "beta"],
  ["â‰¤", "<="],
  ["â‰¥", ">="],
  ["â€”", "-"],
  ["â€“", "-"],
  ["â€˜", "'"],
  ["â€™", "'"],
  ["â€œ", '"'],
  ["â€�", '"'],
  ["â€¦", "..."],
  ["â†’", "->"],
  ["Â", ""],
  ["â€”", "-"],
  ["â€“", "-"],
  ["â€˜", "'"],
  ["â€™", "'"],
  ["â€œ", '"'],
  ["â€�", '"'],
  ["â€¦", "..."],
  ["â†’", "->"],
  ["Â", ""],
];

function normalizeString(value) {
  return mojibakeMap
    .reduce((current, [needle, replacement]) => current.split(needle).join(replacement), value)
    .replace(/\r\n?/g, "\n")
    .replace(/\s+,/g, ",");
}

function truncateAtWord(value, maxLength, options = {}) {
  if (!value) {
    return value;
  }

  const ensureTerminalPunctuation = options.ensureTerminalPunctuation ?? false;
  const normalized = value.trim();

  if (normalized.length <= maxLength) {
    return !ensureTerminalPunctuation || /[.!?)]$/.test(normalized)
      ? normalized
      : `${normalized.slice(0, maxLength - 1).replace(/[,:;-]\s*$/, "").trim()}.`;
  }

  const terminalReserve = ensureTerminalPunctuation ? 3 : 0;
  const trimmed = normalized.slice(0, maxLength - terminalReserve);
  const lastSpace = trimmed.lastIndexOf(" ");
  const candidate = lastSpace > 40 ? trimmed.slice(0, lastSpace) : trimmed;
  const cleanCandidate = candidate.replace(/[,:;-]\s*$/, "").trim();

  return ensureTerminalPunctuation
    ? `${cleanCandidate.replace(/[.!?)]*$/, "")}...`
    : cleanCandidate;
}

function sanitizeValue(value) {
  if (typeof value === "string") {
    return normalizeString(value);
  }

  if (Array.isArray(value)) {
    return value.map((item) => sanitizeValue(item));
  }

  if (value && typeof value === "object") {
    return Object.fromEntries(
      Object.entries(value).map(([key, nestedValue]) => [key, sanitizeValue(nestedValue)]),
    );
  }

  return value;
}

function getRouteBase(collection) {
  const routeBase = routeMap[collection];

  if (!routeBase) {
    throw new Error(`Unable to resolve route for collection "${collection}"`);
  }

  return routeBase;
}

function getReadingMinutes(body) {
  const wordCount = body.trim().split(/\s+/).filter(Boolean).length;
  return Math.max(1, Math.ceil(wordCount / 220));
}

async function walkFiles(dir) {
  const entries = await fs.readdir(dir, { withFileTypes: true });
  const files = [];

  for (const entry of entries) {
    const absolutePath = path.join(dir, entry.name);

    if (entry.isDirectory()) {
      files.push(...(await walkFiles(absolutePath)));
      continue;
    }

    if (entry.isFile()) {
      files.push(absolutePath);
    }
  }

  return files;
}

function toCollectionKey(filePath) {
  const relativePath = path.relative(contentDir, filePath);
  const [collection] = relativePath.split(path.sep);

  if (!collection) {
    throw new Error(`Unable to resolve collection for ${filePath}`);
  }

  return collection;
}

function toSlug(filePath) {
  return path.basename(filePath, ".mdx");
}

function parseEntry(filePath, rawSource) {
  const normalizedSource = normalizeString(rawSource);
  const collection = toCollectionKey(filePath);
  const slug = toSlug(filePath);
  const routeBase = getRouteBase(collection);
  const { content, data } = matter(normalizedSource);
  const normalizedData = sanitizeValue(data);
  const frontmatter = commonSchema.parse(normalizedData);
  const body = normalizeString(content.trim());

  return {
    ...frontmatter,
    description: frontmatter.description.trim(),
    metaDescription: truncateAtWord(frontmatter.description, 160, { ensureTerminalPunctuation: true }),
    ogImage: undefined,
    seoTitle: truncateAtWord(frontmatter.title, 60),
    title: frontmatter.title.trim(),
    body,
    collection,
    id: `${collection}/${slug}`,
    readingMinutes: getReadingMinutes(content),
    routePath: `${routeBase}/${slug}`,
    slug,
  };
}

async function main() {
  const files = (await walkFiles(contentDir)).filter((filePath) => filePath.endsWith(".mdx"));
  const entries = [];

  for (const filePath of files) {
    const slug = toSlug(filePath);

    if (!slug || slug.startsWith(".")) {
      continue;
    }

    const source = await fs.readFile(filePath, "utf8");

    if (!source.trim()) {
      continue;
    }

    entries.push(parseEntry(filePath, source));
  }

  entries.sort((left, right) => right.updatedAt.localeCompare(left.updatedAt));

  const output = `/* This file is generated by scripts/build-content-data.mjs. Do not edit manually. */\nexport const contentEntries = ${JSON.stringify(entries, null, 2)} as const;\n`;
  const contentPageMetaByPath = Object.fromEntries(
    entries.map((entry) => [
      entry.routePath,
      {
        collection: entry.collection,
        description: entry.description,
        faqs: entry.faqs,
        metaDescription: entry.metaDescription,
        ogImage: entry.ogImage,
        publishedAt: entry.publishedAt,
        routePath: entry.routePath,
        seoTitle: entry.seoTitle,
        slug: entry.slug,
        title: entry.title,
        updatedAt: entry.updatedAt,
      },
    ]),
  );
  const manifestOutput =
    `/* This file is generated by scripts/build-content-data.mjs. Do not edit manually. */\n` +
    `export type CollectionKey =\n` +
    `  | "app-guides"\n` +
    `  | "alternatives"\n` +
    `  | "condition-guides"\n` +
    `  | "comparisons"\n` +
    `  | "guides"\n` +
    `  | "hormone-guides"\n` +
    `  | "lead-magnets"\n` +
    `  | "life-stage-guides"\n` +
    `  | "listicles"\n` +
    `  | "pricing-breakdowns"\n` +
    `  | "privacy-in-practice"\n` +
    `  | "questionnaires"\n` +
    `  | "reproductive-privacy-state-pages"\n` +
    `  | "symptom-guides"\n` +
    `  | "wellness-guides";\n\n` +
    `export type ContentPageFaq = { q: string; a: string };\n\n` +
    `export type ContentPageMeta = {\n` +
    `  collection: CollectionKey;\n` +
    `  description: string;\n` +
    `  faqs: ContentPageFaq[];\n` +
    `  metaDescription: string;\n` +
    `  ogImage?: string;\n` +
    `  publishedAt: string;\n` +
    `  routePath: string;\n` +
    `  seoTitle: string;\n` +
    `  slug: string;\n` +
    `  title: string;\n` +
    `  updatedAt: string;\n` +
    `};\n\n` +
    `export const contentPageMetaByPath = ${JSON.stringify(contentPageMetaByPath, null, 2)} as const satisfies Record<string, ContentPageMeta>;\n`;

  // Build body-less index entries
  const indexEntries = entries.map((entry) => {
    const { body: _body, ...rest } = entry;
    return rest;
  });
  const indexOutput = `/* This file is generated by scripts/build-content-data.mjs. Do not edit manually. */\nexport const contentEntries = ${JSON.stringify(indexEntries, null, 2)} as const;\n`;

  // Build per-entry body modules
  await fs.mkdir(bodiesDir, { recursive: true });
  // Clear stale files
  const existingBodyFiles = await fs.readdir(bodiesDir).catch(() => []);
  const nextBodyFilenames = new Set(entries.map((entry) => `${sanitizeId(entry.id)}.ts`));
  for (const file of existingBodyFiles) {
    if (!nextBodyFilenames.has(file)) {
      await fs.unlink(path.join(bodiesDir, file));
    }
  }
  for (const entry of entries) {
    const bodyFile = path.join(bodiesDir, `${sanitizeId(entry.id)}.ts`);
    const bodyOutput = `/* This file is generated by scripts/build-content-data.mjs. Do not edit manually. */\nexport default ${JSON.stringify(entry.body)};\n`;
    await fs.writeFile(bodyFile, bodyOutput, "utf8");
  }

  await fs.mkdir(path.dirname(outputFile), { recursive: true });
  await fs.writeFile(outputFile, output, "utf8");
  await fs.writeFile(indexFile, indexOutput, "utf8");
  await fs.writeFile(manifestFile, manifestOutput, "utf8");
}

await main();
