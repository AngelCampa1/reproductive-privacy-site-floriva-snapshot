#!/usr/bin/env node
/**
 * verify-sources.mjs
 *
 * Discovers URLs referenced by:
 *   1. docs/research/04-sources.md
 *   2. frontmatter sources[].url in every MDX file under content/
 *   3. frontmatter relevantLaws[].url, pricingStats[].sourceUrl, and expertQuotes[].sourceUrl
 *
 * Then fetches each unique URL and writes a dated markdown report under docs/research/.
 * This is a source availability gate, not a semantic fact checker. A PASS means
 * the cited source URL is reachable. DRIFT/PAYWALLED/MISSING/TIMEOUT/ERROR rows
 * need human review before claims depending on them should be treated as current.
 */

import { promises as fs } from "node:fs";
import path from "node:path";
import matter from "gray-matter";

const rootDir = process.cwd();
const contentDir = path.join(rootDir, "content");
const sourcesLibrary = path.join(rootDir, "docs", "research", "04-sources.md");
const URL_REGEX = /https?:\/\/[^\s)\"<>]+/g;
const args = process.argv.slice(2);

function readArg(name, fallback = null) {
  const index = args.indexOf(name);
  if (index === -1) return fallback;
  return args[index + 1] ?? fallback;
}

function hasFlag(name) {
  return args.includes(name);
}

const timeoutMs = Number(readArg("--timeout-ms", "12000"));
const concurrency = Math.max(1, Number(readArg("--concurrency", "8")));
const failOnError = hasFlag("--fail-on-error");

async function walkFiles(dir) {
  const entries = await fs.readdir(dir, { withFileTypes: true });
  const files = [];
  for (const entry of entries) {
    const absolutePath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      files.push(...(await walkFiles(absolutePath)));
    } else if (entry.isFile() && entry.name.endsWith(".mdx")) {
      files.push(absolutePath);
    }
  }
  return files;
}

function* iterateFrontmatterUrls(data) {
  if (!data || typeof data !== "object") return;

  const sources = Array.isArray(data.sources) ? data.sources : [];
  for (const source of sources) {
    if (source && typeof source === "object" && typeof source.url === "string") {
      yield {
        url: source.url,
        claim: source.claim ?? null,
        kind: "frontmatter.sources",
      };
    }
  }

  const relevantLaws = Array.isArray(data.relevantLaws) ? data.relevantLaws : [];
  for (const law of relevantLaws) {
    if (law && typeof law === "object" && typeof law.url === "string") {
      yield { url: law.url, claim: law.name ?? null, kind: "frontmatter.relevantLaws" };
    }
  }

  const pricingStats = Array.isArray(data.pricingStats) ? data.pricingStats : [];
  for (const stat of pricingStats) {
    if (stat && typeof stat === "object" && typeof stat.sourceUrl === "string") {
      yield {
        url: stat.sourceUrl,
        claim: stat.stat ?? null,
        kind: "frontmatter.pricingStats",
      };
    }
  }

  const expertQuotes = Array.isArray(data.expertQuotes) ? data.expertQuotes : [];
  for (const quote of expertQuotes) {
    if (quote && typeof quote === "object" && typeof quote.sourceUrl === "string") {
      yield {
        url: quote.sourceUrl,
        claim: quote.quote ?? null,
        kind: "frontmatter.expertQuotes",
      };
    }
  }
}

async function discoverUrls() {
  const all = [];

  const libraryText = await fs.readFile(sourcesLibrary, "utf8");
  const libraryUrls = libraryText.match(URL_REGEX) ?? [];
  for (const url of new Set(libraryUrls)) {
    all.push({ url, kind: "library", source: "docs/research/04-sources.md" });
  }

  const files = await walkFiles(contentDir);
  for (const filePath of files) {
    const rawSource = await fs.readFile(filePath, "utf8");
    if (!rawSource.trim()) continue;
    let parsed;
    try {
      parsed = matter(rawSource);
    } catch {
      continue;
    }
    for (const ref of iterateFrontmatterUrls(parsed.data)) {
      all.push({
        ...ref,
        source: path.relative(rootDir, filePath).replace(/\\/g, "/"),
      });
    }
  }

  return all;
}

function classifyStatus(status, finalUrl) {
  if (status >= 200 && status < 400) return "PASS";
  if ([401, 402, 403, 451].includes(status)) return "PAYWALLED";
  if (status === 404 || status === 410) return "MISSING";
  if (status >= 300 && status < 400) return "DRIFT";
  if (status >= 500) return "ERROR";
  if (finalUrl) return "DRIFT";
  return "ERROR";
}

async function fetchWithTimeout(url) {
  if (!/^https?:\/\//i.test(url)) {
    return {
      url,
      finalUrl: "",
      statusCode: "",
      verdict: "INTERNAL",
      error: "",
    };
  }

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const response = await fetch(url, {
      method: "GET",
      redirect: "follow",
      signal: controller.signal,
      headers: {
        "user-agent": "FlorivaSourceVerifier/1.0 (+https://floriva.app)",
        accept: "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
      },
    });
    const finalUrl = response.url && response.url !== url ? response.url : "";
    return {
      url,
      finalUrl,
      statusCode: response.status,
      verdict: classifyStatus(response.status, finalUrl),
      error: "",
    };
  } catch (error) {
    return {
      url,
      finalUrl: "",
      statusCode: "",
      verdict: error?.name === "AbortError" ? "TIMEOUT" : "ERROR",
      error: error?.message ?? String(error),
    };
  } finally {
    clearTimeout(timeout);
  }
}

async function mapConcurrent(items, mapper, limit) {
  const results = new Array(items.length);
  let nextIndex = 0;

  async function worker() {
    while (nextIndex < items.length) {
      const current = nextIndex;
      nextIndex += 1;
      results[current] = await mapper(items[current], current);
    }
  }

  await Promise.all(Array.from({ length: Math.min(limit, items.length) }, worker));
  return results;
}

function countByVerdict(results) {
  return results.reduce((counts, result) => {
    counts[result.verdict] = (counts[result.verdict] ?? 0) + 1;
    return counts;
  }, {});
}

function markdownEscape(value) {
  return String(value ?? "").replace(/\|/g, "\\|").replace(/\r?\n/g, " ");
}

async function main() {
  const refs = await discoverUrls();
  const byUrl = new Map();
  for (const ref of refs) {
    if (!byUrl.has(ref.url)) byUrl.set(ref.url, []);
    byUrl.get(ref.url).push(ref);
  }

  console.log(`verify-sources: discovered ${byUrl.size} unique URLs across ${refs.length} references.`);

  const sortedUrls = [...byUrl.keys()].sort();
  const results = await mapConcurrent(sortedUrls, fetchWithTimeout, concurrency);
  const counts = countByVerdict(results);

  const stamp = new Date().toISOString().slice(0, 10);
  const reportPath = path.join(rootDir, "docs", "research", `04-sources-verification-${stamp}.md`);
  const lines = [
    `# Source verification (${stamp})`,
    "",
    `Total unique URLs discovered: ${byUrl.size}`,
    `Total references across the codebase: ${refs.length}`,
    `Timeout: ${timeoutMs}ms`,
    `Concurrency: ${concurrency}`,
    "",
    "## Verdict summary",
    "",
    "| Verdict | Count |",
    "| --- | ---: |",
    ...["PASS", "INTERNAL", "DRIFT", "PAYWALLED", "MISSING", "TIMEOUT", "ERROR"].map(
      (verdict) => `| ${verdict} | ${counts[verdict] ?? 0} |`,
    ),
    "",
    "## Non-passing URLs",
    "",
  ];

  for (const result of results.filter((item) => !["PASS", "INTERNAL"].includes(item.verdict))) {
    const occurrences = byUrl.get(result.url);
    lines.push(`### ${result.verdict}: ${result.url}`);
    lines.push("");
    lines.push(`- Status: ${result.statusCode || "n/a"}`);
    if (result.finalUrl) lines.push(`- Final URL: ${result.finalUrl}`);
    if (result.error) lines.push(`- Error: ${result.error}`);
    lines.push("- References:");
    for (const occ of occurrences) {
      const claim = occ.claim ? ` - "${String(occ.claim).slice(0, 160)}"` : "";
      lines.push(`  - ${occ.source} (${occ.kind})${claim}`);
    }
    lines.push("");
  }

  lines.push("## All URLs");
  lines.push("");
  lines.push("| Verdict | HTTP | URL | Final URL | References |");
  lines.push("| --- | ---: | --- | --- | ---: |");
  for (const result of results) {
    const occurrences = byUrl.get(result.url);
    lines.push(
      `| ${result.verdict} | ${result.statusCode || ""} | ${markdownEscape(result.url)} | ${markdownEscape(result.finalUrl)} | ${occurrences.length} |`,
    );
  }

  await fs.writeFile(reportPath, lines.join("\n"), "utf8");

  const failingCount = results.filter((item) => ["MISSING", "TIMEOUT", "ERROR"].includes(item.verdict)).length;
  const reviewCount = results.filter((item) => !["PASS", "INTERNAL"].includes(item.verdict)).length;
  console.log(`  wrote ${path.relative(rootDir, reportPath)}`);
  console.log(
    `verify-sources: PASS=${counts.PASS ?? 0}, review=${reviewCount}, ` +
      `missing/timeouts/errors=${failingCount}`,
  );

  if (failOnError && failingCount > 0) {
    process.exit(1);
  }
}

await main();
