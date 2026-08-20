import { readFileSync } from "node:fs";
import path from "node:path";

const noindexRoutePaths = JSON.parse(
  readFileSync(path.join(process.cwd(), "src", "site", "index-policy.json"), "utf8"),
).noindexRoutePaths;

const defaultOrigin = "https://floriva.app";
// 470 live routes minus the noindex tier, which is withdrawn from the sitemap
// while staying live. Kept derived so the two never drift.
const defaultExpectedMin = 470 - noindexRoutePaths.length;
const defaultSeo400Path = "artifacts/floriva-seo400-prod-urls.txt";
const seo400PathsFile = "docs/seo-400/net-new-paths.txt";

const args = process.argv.slice(2);

function readArg(name, fallback) {
  const index = args.indexOf(name);
  if (index === -1) return fallback;
  return args[index + 1] ?? fallback;
}

const origin = readArg("--origin", process.env.FLORIVA_PROD_URL ?? defaultOrigin).replace(/\/+$/, "");
const expectedMin = Number(readArg("--min", String(defaultExpectedMin)));
const seo400Path = readArg("--seo400-urls", defaultSeo400Path);

const routeSamples = [
  "/",
  "/compare",
  "/resources",
  "/resources/guides",
  "/resources/best",
  "/resources/privacy-in-practice",
  "/resources/condition-guides",
  "/resources/hormone-guides",
  "/resources/life-stage-guides",
  "/resources/wellness-guides",
  "/period-tracker-privacy",
  "/free",
  "/app-guides",
  "/tools/quiz",
  "/resources/guides/is-flo-safe-to-use",
  "/resources/privacy-in-practice/lock-down-period-data-on-your-phone",
  "/free/first-period-starter-kit",
  "/compare/alternatives/flo-app-alternative",
  "/compare/versus/flo-vs-clue-privacy-comparison",
  "/period-tracker-privacy/reproductive-data-privacy-laws-florida",
];

const canonicalHostRedirectSamples = [
  "/",
  "/sitemap.xml",
  "/robots.txt",
  "/llms.txt",
  "/resources/guides/is-flo-safe-to-use?utm_source=seo-health",
];

const staticSeoAssets = [
  { pathname: "/robots.txt", contentType: "text/plain" },
  { pathname: "/llms.txt", contentType: "text/plain" },
];

function absoluteUrl(pathname) {
  return new URL(pathname, `${origin}/`).toString();
}

function canonicalHostUrl(pathname) {
  const url = new URL(absoluteUrl(pathname));
  url.hostname = `www.${url.hostname}`;
  return url.toString();
}

function extract(html, pattern) {
  return html.match(pattern)?.[1]?.trim() ?? "";
}

function getAttribute(tag, name) {
  const match = tag.match(new RegExp(`\\s${name}=["']([^"']*)["']`, "i"));
  return match?.[1]?.trim() ?? "";
}

function findTagAttribute(html, tagName, requiredAttribute, requiredValue, targetAttribute) {
  const tags = html.match(new RegExp(`<${tagName}\\b[^>]*>`, "gi")) ?? [];

  for (const tag of tags) {
    if (getAttribute(tag, requiredAttribute).toLowerCase() === requiredValue.toLowerCase()) {
      return getAttribute(tag, targetAttribute);
    }
  }

  return "";
}

function textWithoutTags(value) {
  return value.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
}

function parseSitemapUrls(xml) {
  return [...xml.matchAll(/<loc>(.*?)<\/loc>/g)].map((match) => match[1]);
}

async function fetchText(url, options = {}) {
  const response = await fetch(url, {
    redirect: "follow",
    ...options,
  });
  const body = await response.text();
  return { body, response };
}

async function verifyCanonicalHostRedirects(errors) {
  for (const pathname of canonicalHostRedirectSamples) {
    const sourceUrl = canonicalHostUrl(pathname);
    const expectedLocation = absoluteUrl(pathname);
    const response = await fetch(sourceUrl, { redirect: "manual" });
    const location = response.headers.get("location") ?? "";

    if (response.status !== 301) {
      errors.push(`${sourceUrl} expected 301 canonical host redirect, got ${response.status}`);
      continue;
    }

    if (location !== expectedLocation) {
      errors.push(`${sourceUrl} expected Location ${expectedLocation}, got ${location || "(missing)"}`);
    }
  }
}

async function verifySitemap(errors) {
  const { body, response } = await fetchText(absoluteUrl("/sitemap.xml"));
  const contentType = response.headers.get("content-type") ?? "";
  const xRobots = response.headers.get("x-robots-tag") ?? "";

  if (response.status !== 200) {
    errors.push(`/sitemap.xml expected 200, got ${response.status}`);
  }
  if (!contentType.includes("xml")) {
    errors.push(`/sitemap.xml expected XML content type, got ${contentType || "(missing)"}`);
  }
  if (xRobots.toLowerCase().includes("noindex")) {
    errors.push(`/sitemap.xml returned X-Robots-Tag noindex`);
  }

  const urls = parseSitemapUrls(body);
  if (urls.length < expectedMin) {
    errors.push(`/sitemap.xml expected at least ${expectedMin} URLs, got ${urls.length}`);
  }

  for (const url of urls) {
    if (!url.startsWith(`${origin}/`) && url !== `${origin}/`) {
      errors.push(`/sitemap.xml contains non-origin URL ${url}`);
      break;
    }
  }

  return urls;
}

async function verifyStaticSeoAssets(errors) {
  for (const asset of staticSeoAssets) {
    const { body, response } = await fetchText(absoluteUrl(asset.pathname));
    const contentType = response.headers.get("content-type") ?? "";
    const xRobots = response.headers.get("x-robots-tag") ?? "";

    if (response.status !== 200) {
      errors.push(`${asset.pathname} expected 200, got ${response.status}`);
    }
    if (!contentType.includes(asset.contentType)) {
      errors.push(`${asset.pathname} expected ${asset.contentType} content type, got ${contentType || "(missing)"}`);
    }
    if (xRobots.toLowerCase().includes("noindex")) {
      errors.push(`${asset.pathname} returned X-Robots-Tag noindex`);
    }
    if (!body.trim()) {
      errors.push(`${asset.pathname} returned an empty body`);
    }
  }
}

async function verifySeo400Urls(sitemapUrls, errors) {
  const fsPromises = await import("node:fs/promises");
  const file = await fsPromises.readFile(seo400Path, "utf8");
  const exportedUrls = file
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);
  // The exporter drops noindexed routes, so the expected count must too.
  const expectedPathCount = (await fsPromises.readFile(seo400PathsFile, "utf8"))
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter((line) => line && !line.startsWith("#"))
    .filter((line) => !noindexRoutePaths.includes(line)).length;
  const sitemapSet = new Set(sitemapUrls);
  const missing = exportedUrls.filter((url) => !sitemapSet.has(url));

  if (exportedUrls.length !== expectedPathCount) {
    errors.push(`${seo400Path} expected ${expectedPathCount} URLs (from ${seo400PathsFile}), got ${exportedUrls.length}`);
  }
  if (missing.length > 0) {
    errors.push(`${seo400Path} has ${missing.length} URL(s) missing from live sitemap; first: ${missing[0]}`);
  }

  return exportedUrls.length;
}

async function verifyRoute(pathname, errors) {
  const expectedCanonical = absoluteUrl(pathname);
  const { body, response } = await fetchText(expectedCanonical);
  const contentType = response.headers.get("content-type") ?? "";
  const xRobots = response.headers.get("x-robots-tag") ?? "";

  if (response.status !== 200) {
    errors.push(`${pathname} expected 200, got ${response.status}`);
  }
  if (!contentType.includes("text/html")) {
    errors.push(`${pathname} expected HTML content type, got ${contentType || "(missing)"}`);
  }
  if (xRobots.toLowerCase().includes("noindex")) {
    errors.push(`${pathname} returned X-Robots-Tag noindex`);
  }

  const canonical = findTagAttribute(body, "link", "rel", "canonical", "href");
  const robots = findTagAttribute(body, "meta", "name", "robots", "content");
  const title = extract(body, /<title>([\s\S]*?)<\/title>/i);
  const h1 = textWithoutTags(extract(body, /<h1[^>]*>([\s\S]*?)<\/h1>/i));
  const jsonLdCount = [...body.matchAll(/<script[^>]+type=["']application\/ld\+json["'][^>]*>/gi)].length;

  if (canonical !== expectedCanonical) {
    errors.push(`${pathname} canonical expected ${expectedCanonical}, got ${canonical || "(missing)"}`);
  }
  if (robots !== "index, follow") {
    errors.push(`${pathname} robots expected "index, follow", got ${robots || "(missing)"}`);
  }
  if (!title || title === "Floriva") {
    errors.push(`${pathname} has weak or missing title`);
  }
  if (!h1) {
    errors.push(`${pathname} missing H1`);
  }
  if (jsonLdCount < 1) {
    errors.push(`${pathname} missing JSON-LD`);
  }
}

const errors = [];
await verifyCanonicalHostRedirects(errors);
const sitemapUrls = await verifySitemap(errors);
await verifyStaticSeoAssets(errors);
const seo400Count = await verifySeo400Urls(sitemapUrls, errors);

for (const route of routeSamples) {
  await verifyRoute(route, errors);
}

if (errors.length > 0) {
  console.error(`verify-production-seo-health: ${errors.length} error(s)`);
  for (const error of errors) {
    console.error(`- ${error}`);
  }
  process.exit(1);
}

console.log(
  `verify-production-seo-health: ${origin} healthy (${sitemapUrls.length} sitemap URLs, ${seo400Count} SEO400 URLs, ${routeSamples.length} sampled routes)`,
);
