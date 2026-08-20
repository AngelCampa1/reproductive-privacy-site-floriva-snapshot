#!/usr/bin/env node
import { promises as fs } from "node:fs";

function readArg(name, fallback = null) {
  const index = process.argv.indexOf(name);
  if (index === -1) return fallback;
  return process.argv[index + 1] ?? fallback;
}

function normalizeOrigin(value) {
  const rawOrigin = value === "%FLORIVA_PROD_URL%" ? "" : value;
  const origin = String(rawOrigin || process.env.FLORIVA_PROD_URL || "https://floriva.app").replace(/\/+$/, "");
  if (!/^https?:\/\//.test(origin)) {
    throw new Error(`Invalid origin: ${origin}`);
  }
  return origin;
}

function parseRedirectObject(source, objectName) {
  const match = source.match(new RegExp(`const\\s+${objectName}[^=]*=\\s*\\{([\\s\\S]*?)\\};`));
  if (!match) {
    throw new Error(`Could not find ${objectName} in functions/_middleware.ts`);
  }

  return [...match[1].matchAll(/"([^"]+)":\s*"([^"]+)"/g)].map((entry) => ({
    from: entry[1],
    to: entry[2],
    source: objectName,
  }));
}

function normalizePathname(value) {
  const trimmed = String(value ?? "").trim().replace(/^`|`$/g, "");
  if (!trimmed || trimmed === "none" || trimmed.startsWith("#")) return "";
  if (/^https?:\/\//i.test(trimmed)) {
    return new URL(trimmed).pathname.replace(/\/+$/, "") || "/";
  }
  if (!trimmed.startsWith("/")) return "";
  return trimmed === "/" ? "/" : trimmed.replace(/\/+$/, "");
}

function parseRedirectLedger(source) {
  const rows = [];

  for (const line of source.split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed.startsWith("|") || trimmed.includes("---")) continue;

    const cells = trimmed
      .split("|")
      .slice(1, -1)
      .map((cell) => cell.trim());

    if (cells.length < 4 || /^old path$/i.test(cells[0])) continue;

    const from = normalizePathname(cells[0]);
    const to = normalizePathname(cells[1]);

    if (from && to) {
      rows.push({ from, to });
    }
  }

  return rows;
}

function absoluteUrl(origin, pathname, query = "") {
  return `${origin}${pathname}${query}`;
}

async function fetchRedirect(origin, from, method = "GET", query = "") {
  return fetch(absoluteUrl(origin, from, query), {
    headers: { Accept: "text/html" },
    method,
    redirect: "manual",
  });
}

async function verifyRedirect(origin, check) {
  const errors = [];

  for (const method of ["GET", "HEAD"]) {
    const response = await fetchRedirect(origin, check.from, method);
    const location = response.headers.get("location") ?? "";
    const expected = absoluteUrl(origin, check.to);

    if (response.status !== 301) {
      errors.push(`${check.from}: ${method} expected 301, got ${response.status}`);
    }

    if (location !== expected) {
      errors.push(`${check.from}: ${method} location expected ${expected}, got ${location || "(missing)"}`);
    }
  }

  const queryResponse = await fetchRedirect(origin, check.from, "GET", "?utm_source=redirect-check");
  const queryLocation = queryResponse.headers.get("location") ?? "";
  const queryExpected = absoluteUrl(origin, check.to, "?utm_source=redirect-check");

  if (queryResponse.status !== 301) {
    errors.push(`${check.from}: query expected 301, got ${queryResponse.status}`);
  }

  if (queryLocation !== queryExpected) {
    errors.push(`${check.from}: query location expected ${queryExpected}, got ${queryLocation || "(missing)"}`);
  }

  return errors;
}

async function loadSitemapPaths() {
  const sitemap = await fs.readFile("public/sitemap.xml", "utf8");
  return [...sitemap.matchAll(/<loc>https:\/\/floriva\.app([^<]*)<\/loc>/g)].map(
    (match) => match[1] || "/",
  );
}

function buildBaseSampleChecks(baseRedirects, sitemapPaths) {
  const checks = [];

  for (const redirect of baseRedirects) {
    checks.push(redirect);

    const sampleTarget = sitemapPaths.find(
      (pathname) => pathname !== redirect.to && pathname.startsWith(`${redirect.to}/`),
    );

    if (sampleTarget) {
      checks.push({
        from: `${redirect.from}${sampleTarget.slice(redirect.to.length)}`,
        to: sampleTarget,
        source: `${redirect.source}:sample`,
      });
    }
  }

  return checks;
}

const origin = normalizeOrigin(readArg("--origin"));
const middlewareSource = await fs.readFile("functions/_middleware.ts", "utf8");
const ledgerSource = await fs.readFile("docs/seo-400/redirects.md", "utf8");
const sitemapPaths = await loadSitemapPaths();

const exactRedirects = parseRedirectObject(middlewareSource, "legacyExactRedirects");
const baseRedirects = parseRedirectObject(middlewareSource, "legacyRouteBaseRedirects");
const ledgerRedirects = parseRedirectLedger(ledgerSource);
const redirectByFrom = new Map([...exactRedirects, ...baseRedirects].map((redirect) => [redirect.from, redirect.to]));
const ledgerByFrom = new Map(ledgerRedirects.map((redirect) => [redirect.from, redirect.to]));
const errors = [];

for (const row of ledgerRedirects) {
  const configuredTo = redirectByFrom.get(row.from);
  if (configuredTo !== row.to) {
    errors.push(
      `docs/seo-400/redirects.md: ${row.from} -> ${row.to} is not configured in functions/_middleware.ts`,
    );
  }
}

for (const redirect of [...exactRedirects, ...baseRedirects]) {
  const documentedTo = ledgerByFrom.get(redirect.from);
  if (documentedTo !== redirect.to) {
    errors.push(
      `functions/_middleware.ts: ${redirect.from} -> ${redirect.to} is not documented in docs/seo-400/redirects.md`,
    );
  }
}

const checks = [
  { from: "/sitemap-0.xml", to: "/sitemap.xml", source: "sitemap" },
  ...exactRedirects,
  ...buildBaseSampleChecks(baseRedirects, sitemapPaths),
];

for (const check of checks) {
  const checkErrors = await verifyRedirect(origin, check);
  errors.push(...checkErrors.map((error) => `${check.source}: ${error}`));
}

if (errors.length > 0) {
  console.error(`verify-redirects: ${errors.length} error(s)`);
  for (const error of errors) {
    console.error(`- ${error}`);
  }
  process.exit(1);
}

console.log(`verify-redirects: checked ${checks.length} redirect case(s) against ${origin}`);
