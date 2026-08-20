#!/usr/bin/env node
import { promises as fs } from "node:fs";
import path from "node:path";

const args = process.argv.slice(2);
const rootDir = process.cwd();
const distDir = path.join(rootDir, "dist");
const contentDataPath = path.join(rootDir, "src", "site", "generated", "content-data.ts");
const sitemapPath = path.join(rootDir, "public", "sitemap.xml");
const publicKnowledgePath = path.join(rootDir, "src", "site", "generated", "public-knowledge.json");
const baseUrl = "https://floriva.app";
const homeTitle = JSON.parse(await fs.readFile(publicKnowledgePath, "utf8")).seo.homeTitle;

function readArg(name, fallback = null) {
  const index = args.indexOf(name);
  if (index === -1) return fallback;
  return args[index + 1] ?? fallback;
}

function hasFlag(name) {
  return args.includes(name);
}

function normalizePathname(value) {
  if (!value) return "";
  const trimmed = value.trim();
  if (!trimmed || trimmed.startsWith("#")) return "";
  if (/^https?:\/\//i.test(trimmed)) {
    return new URL(trimmed).pathname.replace(/\/+$/, "") || "/";
  }
  return `/${trimmed.replace(/^\/+/, "").replace(/\/+$/, "")}` || "/";
}

function decodeHtml(value) {
  return String(value ?? "")
    .replaceAll("&quot;", '"')
    .replaceAll("&#39;", "'")
    .replaceAll("&amp;", "&")
    .replaceAll("&lt;", "<")
    .replaceAll("&gt;", ">");
}

function escapeRegExp(value) {
  return String(value).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function extractTagValue(html, pattern) {
  const match = html.match(pattern);
  return match ? decodeHtml(match[1].trim()) : "";
}

function stripMarkdown(markdown) {
  return String(markdown ?? "")
    .replace(/```[\s\S]*?```/g, " ")
    .replace(/^\s*\|?\s*:?-{3,}:?\s*(?:\|\s*:?-{3,}:?\s*)+\|?\s*$/gm, " ")
    .replace(/^\s*\d+\.\s+/gm, "")
    .replace(/!\[[^\]]*]\([^)]*\)/g, " ")
    .replace(/\[([^\]]+)]\(([^)]+)\)/g, "$1")
    .replace(/[#>*_`|[\]-]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function textFromHtml(html) {
  return decodeHtml(
    String(html ?? "")
      .replace(/<script[\s\S]*?<\/script>/gi, " ")
      .replace(/<style[\s\S]*?<\/style>/gi, " ")
      .replace(/<pre[\s\S]*?<\/pre>/gi, " ")
      .replace(/<[^>]+>/g, " ")
      .replace(/\s+/g, " ")
      .trim(),
  );
}

function normalizeComparableText(value) {
  return String(value ?? "")
    .toLocaleLowerCase("en-US")
    .replace(/[^\p{L}\p{N}]+/gu, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function bodySamples(markdown) {
  const bodyText = stripMarkdown(markdown);
  const sentences = bodyText
    .split(/(?<=[.!?])\s+/)
    .map((sentence) => sentence.trim())
    .filter((sentence) => sentence.length >= 80);

  if (sentences.length === 0) {
    return bodyText.length >= 80 ? [bodyText.slice(0, 120)] : [];
  }

  const indexes = [0, Math.floor(sentences.length / 2), sentences.length - 1];
  return [...new Set(indexes)].map((index) => sentences[index].slice(0, 140));
}

async function loadContentEntries() {
  const source = await fs.readFile(contentDataPath, "utf8");
  const start = source.indexOf("[");
  const end = source.lastIndexOf("]");
  if (start === -1 || end === -1 || end <= start) {
    throw new Error(`Could not parse content data from ${contentDataPath}`);
  }
  return JSON.parse(source.slice(start, end + 1));
}

async function loadPathFile(pathFile) {
  const source = await fs.readFile(pathFile, "utf8");
  return source.split(/\r?\n/).map(normalizePathname).filter(Boolean);
}

async function loadSitemapRoutes() {
  const sitemap = await fs.readFile(sitemapPath, "utf8");
  return [...sitemap.matchAll(/<loc>https:\/\/floriva\.app([^<]*)<\/loc>/g)].map(
    (match) => normalizePathname(match[1] || "/"),
  );
}

async function findHtmlFile(pathname) {
  if (pathname === "/") return path.join(distDir, "index.html");

  const clean = pathname.slice(1);
  const candidates = [
    path.join(distDir, ...clean.split("/")),
    path.join(distDir, ...clean.split("/"), "index.html"),
  ];

  for (const candidate of candidates) {
    try {
      const stat = await fs.stat(candidate);
      if (stat.isFile()) return candidate;
    } catch (error) {
      if (error.code !== "ENOENT") throw error;
    }
  }

  return candidates[0];
}

// Structured data must never describe content that is absent from the served
// HTML. Shipping FAQPage markup whose Q&A only existed in the React tree is the
// defect this gate exists to prevent from recurring.
function verifyJsonLdVisibility(html, htmlText) {
  const errors = [];
  const blocks = [...html.matchAll(/<script[^>]*type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi)];

  for (const [, raw] of blocks) {
    let parsed;
    try {
      parsed = JSON.parse(raw);
    } catch {
      errors.push("unparseable JSON-LD block");
      continue;
    }

    for (const node of Array.isArray(parsed) ? parsed : [parsed]) {
      if (node?.["@type"] !== "FAQPage") continue;
      for (const question of node.mainEntity ?? []) {
        const name = String(question?.name ?? "").trim();
        const answer = String(question?.acceptedAnswer?.text ?? "").trim();
        if (name && !htmlText.includes(normalizeComparableText(name))) {
          errors.push(`FAQ question in JSON-LD is not visible in HTML: "${name.slice(0, 70)}"`);
        }
        if (answer && !htmlText.includes(normalizeComparableText(answer))) {
          errors.push(`FAQ answer in JSON-LD is not visible in HTML: "${answer.slice(0, 70)}"`);
        }
      }
    }
  }

  return errors;
}

// Minimum crawlable body size per template. The June 2026 visibility loss hit
// the commercial templates hardest because their structured payloads never
// reached the served HTML; these floors stop that regressing silently.
const minWordsByCollection = {
  alternatives: 400,
  comparisons: 400,
  listicles: 600,
  "pricing-breakdowns": 500,
  "reproductive-privacy-state-pages": 500,
};
const defaultMinWords = 250;

// Non-empty payloads must each produce at least one visible element.
const payloadProbes = [
  ["tools", /id="ranked-picks"/],
  ["tiers", /id="plans-and-tiers"/],
  ["hiddenCosts", /id="hidden-costs"/],
  ["keyFacts", /id="key-facts"/],
  ["relevantLaws", /id="relevant-laws"/],
  ["tableData", /id="comparison-table"/],
  ["faqs", /id="faq"/],
  ["answers", /id="straight-answers"/],
];

function verifyPayloadRendering(entry, html, wordCount) {
  const errors = [];
  const minWords = minWordsByCollection[entry.collection] ?? defaultMinWords;

  if (wordCount < minWords) {
    errors.push(`prerendered body too thin for ${entry.collection}: ${wordCount} words (minimum ${minWords})`);
  }

  for (const [field, probe] of payloadProbes) {
    const value = entry[field];
    const populated = Array.isArray(value) ? value.length > 0 : Boolean(value);
    if (populated && !probe.test(html)) {
      errors.push(`entry has non-empty "${field}" but it is not rendered into prerendered HTML`);
    }
  }

  return errors;
}

function verifyRoute({ pathname, entry, htmlFile, html }) {
  const errors = [];
  const expectedTitle = entry.seoTitle || entry.title;
  const expectedCanonical = new URL(pathname, baseUrl).toString();
  const title = extractTagValue(html, /<title>([\s\S]*?)<\/title>/i);
  const canonical = extractTagValue(
    html,
    /<link\s+rel=["']canonical["']\s+href=["']([^"']+)["']\s*\/?>/i,
  );
  const h1Pattern = new RegExp(`<h1[^>]*>\\s*${escapeRegExp(entry.title)}\\s*<\\/h1>`, "i");
  const jsonLdCount = (html.match(/type=["']application\/ld\+json["']/gi) ?? []).length;
  const htmlText = normalizeComparableText(textFromHtml(html));
  const missingBodySamples = bodySamples(entry.body).filter(
    (sample) => !htmlText.includes(normalizeComparableText(sample)),
  );

  if (title !== expectedTitle) {
    errors.push(`title mismatch: expected "${expectedTitle}", found "${title || "(missing)"}"`);
  }

  if (canonical !== expectedCanonical) {
    errors.push(`canonical mismatch: expected "${expectedCanonical}", found "${canonical || "(missing)"}"`);
  }

  if (!h1Pattern.test(html)) {
    errors.push(`missing prerendered h1 for "${entry.title}"`);
  }

  if (jsonLdCount < 1) {
    errors.push("missing JSON-LD script");
  }

  if (missingBodySamples.length > 0) {
    errors.push(`missing prerendered body coverage for ${missingBodySamples.length} sampled passage(s)`);
  }

  if (title === homeTitle) {
    errors.push("route appears to have homepage title metadata");
  }

  errors.push(...verifyJsonLdVisibility(html, htmlText));
  errors.push(...verifyPayloadRendering(entry, html, textFromHtml(html).split(/\s+/).filter(Boolean).length));

  return errors.map((error) => `${pathname} (${path.relative(rootDir, htmlFile)}): ${error}`);
}

function verifyStaticRoute({ pathname, htmlFile, html }) {
  const errors = [];
  const expectedCanonical = new URL(pathname, baseUrl).toString();
  const title = extractTagValue(html, /<title>([\s\S]*?)<\/title>/i);
  const canonical = extractTagValue(
    html,
    /<link\s+rel=["']canonical["']\s+href=["']([^"']+)["']\s*\/?>/i,
  );

  if (!title) {
    errors.push("missing title");
  }

  if (canonical !== expectedCanonical) {
    errors.push(`canonical mismatch: expected "${expectedCanonical}", found "${canonical || "(missing)"}"`);
  }

  if (title === homeTitle && pathname !== "/") {
    errors.push("static route appears to have homepage title metadata");
  }

  return errors.map((error) => `${pathname} (${path.relative(rootDir, htmlFile)}): ${error}`);
}

const pathFile = readArg("--paths", path.join("docs", "seo-400", "net-new-paths.txt"));
const minRoutes = Number(readArg("--min", "0"));
const entries = await loadContentEntries();
const entriesByPath = new Map(entries.map((entry) => [normalizePathname(entry.routePath), entry]));
const routePaths = hasFlag("--all-sitemap") ? await loadSitemapRoutes() : await loadPathFile(pathFile);
const uniqueRoutePaths = [...new Set(routePaths)];
const errors = [];

if (uniqueRoutePaths.length < minRoutes) {
  errors.push(`Expected at least ${minRoutes} content routes, found ${uniqueRoutePaths.length}`);
}

for (const pathname of uniqueRoutePaths) {
  const entry = entriesByPath.get(pathname);
  if (!entry && !hasFlag("--all-sitemap")) {
    errors.push(`${pathname}: route is not present in generated content data`);
    continue;
  }

  const htmlFile = await findHtmlFile(pathname);
  let html = "";

  try {
    html = await fs.readFile(htmlFile, "utf8");
  } catch (error) {
    errors.push(`${pathname}: missing prerendered file ${path.relative(rootDir, htmlFile)}`);
    continue;
  }

  if (entry) {
    errors.push(...verifyRoute({ pathname, entry, htmlFile, html }));
  } else {
    errors.push(...verifyStaticRoute({ pathname, htmlFile, html }));
  }
}

if (errors.length > 0) {
  console.error(`verify-prerendered-content: ${errors.length} error(s)`);
  for (const error of errors.slice(0, 50)) console.error(`- ${error}`);
  if (errors.length > 50) console.error(`- ...${errors.length - 50} more`);
  process.exit(1);
}

console.log(`verify-prerendered-content: ${uniqueRoutePaths.length} prerendered content route(s) checked`);
