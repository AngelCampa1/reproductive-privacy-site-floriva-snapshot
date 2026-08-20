#!/usr/bin/env node
import { promises as fs } from "node:fs";
import path from "node:path";

const args = process.argv.slice(2);
const expectedProdOrigin = "https://floriva.app";
const publicKnowledgePath = path.join(process.cwd(), "src", "site", "generated", "public-knowledge.json");
const homeTitle = JSON.parse(await fs.readFile(publicKnowledgePath, "utf8")).seo.homeTitle;
const noindexRoutePaths = new Set(
  JSON.parse(
    await fs.readFile(path.join(process.cwd(), "src", "site", "index-policy.json"), "utf8"),
  ).noindexRoutePaths,
);

function readArg(name, fallback = null) {
  const index = args.indexOf(name);
  if (index === -1) return fallback;
  return args[index + 1] ?? fallback;
}

function hasFlag(name) {
  return args.includes(name);
}

function normalizeOrigin(value) {
  const origin = (value || process.env.FLORIVA_PROD_URL || "https://floriva.app").replace(/\/+$/, "");
  if (!/^https?:\/\//.test(origin)) {
    throw new Error(`Invalid origin: ${origin}`);
  }
  return origin;
}

function normalizePathname(value) {
  if (!value) return "";
  const trimmed = value.trim();
  if (!trimmed || trimmed.startsWith("#")) return "";
  if (/^https?:\/\//.test(trimmed)) {
    return new URL(trimmed).pathname.replace(/\/+$/, "") || "/";
  }
  return `/${trimmed.replace(/^\/+/, "").replace(/\/+$/, "")}` || "/";
}

function extractSitemapUrls(xml) {
  return [...xml.matchAll(/<loc>(.*?)<\/loc>/g)].map((match) => match[1].trim());
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

function textFromHtml(html) {
  return decodeHtml(
    String(html ?? "")
      .replace(/<script[\s\S]*?<\/script>/gi, " ")
      .replace(/<style[\s\S]*?<\/style>/gi, " ")
      .replace(/<[^>]+>/g, " ")
      .replace(/\s+/g, " ")
      .trim(),
  );
}

async function readRequestedPaths(pathsFile) {
  if (!pathsFile) return null;
  const source = await fs.readFile(pathsFile, "utf8");
  const paths = source
    .split(/\r?\n/)
    .filter((line) => line.trim() && !line.trim().startsWith("#"))
    .map(normalizePathname)
    .filter(Boolean)
    // Never submit a noindexed route for indexing. These paths stay in
    // net-new-paths.txt because they are still live pages that the browser
    // verifiers must keep exercising — they are just not index candidates.
    .filter((pathname) => !noindexRoutePaths.has(pathname));
  return new Set(paths);
}

async function loadContentEntries() {
  const contentDataPath = path.join("src", "site", "generated", "content-data.ts");
  const source = await fs.readFile(contentDataPath, "utf8");
  const start = source.indexOf("[");
  const end = source.lastIndexOf("]");
  if (start === -1 || end === -1 || end <= start) return new Map();
  const entries = JSON.parse(source.slice(start, end + 1));
  return new Map(entries.map((entry) => [normalizePathname(entry.routePath), entry]));
}

async function verifyLivePage(url, expectedOrigin, entriesByPath) {
  const parsed = new URL(url);
  const pathname = normalizePathname(parsed.pathname);
  const expectedCanonical = new URL(pathname, expectedOrigin).toString();
  const entry = entriesByPath.get(pathname);
  const response = await fetch(url, {
    headers: { Accept: "text/html,*/*" },
    redirect: "follow",
  });

  if (!response.ok) {
    throw new Error(`${url}: HTTP ${response.status}`);
  }

  const contentType = response.headers.get("content-type") || "";
  if (!contentType.toLowerCase().includes("text/html")) {
    throw new Error(`${url}: expected HTML content-type, found "${contentType || "(missing)"}"`);
  }

  const html = await response.text();
  const canonical = extractTagValue(
    html,
    /<link\s+rel=["']canonical["']\s+href=["']([^"']+)["']\s*\/?>/i,
  );
  const title = extractTagValue(html, /<title>([\s\S]*?)<\/title>/i);
  const htmlText = textFromHtml(html);

  if (canonical !== expectedCanonical) {
    throw new Error(`${url}: canonical mismatch, expected "${expectedCanonical}", found "${canonical || "(missing)"}"`);
  }

  if (!title || title === homeTitle) {
    throw new Error(`${url}: missing or homepage-like title "${title || "(missing)"}"`);
  }

  if (entry) {
    const h1Pattern = new RegExp(`<h1[^>]*>\\s*${escapeRegExp(entry.title)}\\s*<\\/h1>`, "i");
    if (!h1Pattern.test(html)) {
      throw new Error(`${url}: missing expected h1 "${entry.title}"`);
    }

    const marker = entry.description || entry.title;
    if (marker && !htmlText.includes(marker)) {
      throw new Error(`${url}: missing generated content marker "${marker}"`);
    }
  }
}

const origin = normalizeOrigin(readArg("--origin"));
const pathsFile = readArg("--paths");
const outFile = readArg("--out", path.join("artifacts", "floriva-prod-urls.txt"));
const allowNonProd = hasFlag("--allow-non-prod");
const skipPageChecks = hasFlag("--skip-page-checks");
const requestedPaths = await readRequestedPaths(pathsFile);
const entriesByPath = await loadContentEntries();

if (!allowNonProd && origin !== expectedProdOrigin) {
  throw new Error(`Refusing to export indexer URLs from non-production origin ${origin}. Use --allow-non-prod only for tests.`);
}

const sitemapResponse = await fetch(`${origin}/sitemap.xml`, {
  headers: { Accept: "application/xml,text/xml,*/*" },
  redirect: "follow",
});

if (!sitemapResponse.ok) {
  throw new Error(`Failed to fetch ${origin}/sitemap.xml: HTTP ${sitemapResponse.status}`);
}

const sitemapXml = await sitemapResponse.text();
const sitemapUrls = extractSitemapUrls(sitemapXml);
const wrongOriginUrls = sitemapUrls.filter((url) => new URL(url).origin !== origin);
if (wrongOriginUrls.length > 0 && !allowNonProd) {
  throw new Error(
    `Sitemap has ${wrongOriginUrls.length} URL(s) outside ${origin}:\n${wrongOriginUrls.slice(0, 25).join("\n")}`,
  );
}

const sitemapPathMap = new Map(
  sitemapUrls.map((url) => {
    const parsed = new URL(url);
    return [normalizePathname(parsed.pathname), url];
  }),
);

let outputUrls;
if (requestedPaths) {
  const missing = [...requestedPaths].filter((pathname) => !sitemapPathMap.has(pathname));
  if (missing.length > 0) {
    throw new Error(
      `Production sitemap is missing ${missing.length} requested paths:\n${missing.slice(0, 25).join("\n")}`,
    );
  }
  outputUrls = [...requestedPaths].map((pathname) => sitemapPathMap.get(pathname)).sort();
} else {
  outputUrls = [...sitemapUrls].sort();
}

if (!skipPageChecks) {
  for (const url of outputUrls) {
    await verifyLivePage(url, origin, entriesByPath);
  }
}

await fs.mkdir(path.dirname(outFile), { recursive: true });
await fs.writeFile(outFile, `${outputUrls.join("\n")}\n`, "utf8");

console.log(`export-prod-indexer-urls: verified and wrote ${outputUrls.length} URLs to ${outFile}`);
