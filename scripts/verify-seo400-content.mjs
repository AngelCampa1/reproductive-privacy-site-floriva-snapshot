#!/usr/bin/env node
import { promises as fs } from "node:fs";
import path from "node:path";
import matter from "gray-matter";

const args = process.argv.slice(2);

function readArg(name, fallback = null) {
  const index = args.indexOf(name);
  if (index === -1) return fallback;
  return args[index + 1] ?? fallback;
}

const backlogFile = readArg("--backlog", path.join("docs", "seo-400", "topic-backlog.csv"));
const netNewPathsFile = readArg("--paths", path.join("docs", "seo-400", "net-new-paths.txt"));
const minRows = Number(readArg("--min", "400"));
// Live net-new pages are a separate count from total ledger rows: the 2026-07-06
// scaled-content-abuse recovery intentionally consolidated ~314 lead-magnet pages
// (retired rows kept as `consolidated-*` history), so the live net-new set is far
// below the historical 400 backlog rows. Guard the live floor separately.
//
// Lowered 100 -> 45 on 2026-07-31. The corpus consolidation retired 66 more net-new
// pages (93 privacy-in-practice checklists folded into 5 guides), taking the live set
// from 107 to 46. Those pages targeted machine-query phrasings and cannibalized each
// other on the human queries they shared, so retiring them was the point of the change,
// not a regression. The floor still guards against silently losing the surviving set.
const minNetNew = Number(readArg("--min-net-new", "45"));

const collectionRoutes = {
  alternatives: "/compare/alternatives",
  "app-guides": "/app-guides",
  comparisons: "/compare/versus",
  "condition-guides": "/resources/condition-guides",
  guides: "/resources/guides",
  "hormone-guides": "/resources/hormone-guides",
  "lead-magnets": "/free",
  "life-stage-guides": "/resources/life-stage-guides",
  listicles: "/resources/best",
  "pricing-breakdowns": "/compare/pricing",
  "privacy-in-practice": "/resources/privacy-in-practice",
  questionnaires: "/tools/quiz",
  "reproductive-privacy-state-pages": "/period-tracker-privacy",
  "symptom-guides": "/resources/symptom-guides",
  "wellness-guides": "/resources/wellness-guides",
};

const collectionAllowedStages = {
  alternatives: ["bofu"],
  "app-guides": ["bofu"],
  comparisons: ["mofu", "bofu"],
  "condition-guides": ["tofu", "mofu"],
  guides: ["tofu", "mofu"],
  "hormone-guides": ["tofu", "mofu"],
  "lead-magnets": ["tofu", "mofu", "bofu"],
  "life-stage-guides": ["tofu"],
  listicles: ["mofu"],
  "pricing-breakdowns": ["mofu", "bofu"],
  "privacy-in-practice": ["mofu"],
  questionnaires: ["tofu", "mofu"],
  "reproductive-privacy-state-pages": ["tofu"],
  "symptom-guides": ["tofu"],
  "wellness-guides": ["tofu", "mofu"],
};

function parseDelimitedLine(line, delimiter) {
  const cells = [];
  let current = "";
  let quoted = false;

  for (let index = 0; index < line.length; index += 1) {
    const char = line[index];
    const next = line[index + 1];

    if (char === '"' && next === '"') {
      current += '"';
      index += 1;
      continue;
    }

    if (char === '"') {
      quoted = !quoted;
      continue;
    }

    if (char === delimiter && !quoted) {
      cells.push(current.trim());
      current = "";
      continue;
    }

    current += char;
  }

  cells.push(current.trim());
  return cells;
}

function normalizePathname(value) {
  const trimmed = String(value ?? "").trim();
  if (!trimmed || trimmed.startsWith("#")) return "";
  if (/^https?:\/\//.test(trimmed)) {
    return new URL(trimmed).pathname.replace(/\/+$/, "") || "/";
  }
  return `/${trimmed.replace(/^\/+/, "").replace(/\/+$/, "")}` || "/";
}

function parseBacklog(source) {
  const lines = source
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter((line) => line && !line.startsWith("#"));
  const delimiter = lines[0]?.includes("|") ? "|" : ",";
  const headers = parseDelimitedLine(lines[0] ?? "", delimiter);

  return lines.slice(1).map((line, index) => {
    const values = parseDelimitedLine(line, delimiter);
    return {
      line: index + 2,
      values: Object.fromEntries(headers.map((header, cellIndex) => [header, values[cellIndex] ?? ""])),
    };
  });
}

function routeFor(row) {
  const routeBase = collectionRoutes[row.collection];
  if (!routeBase || !row.slug) return "";
  return normalizePathname(`${routeBase}/${row.slug}`);
}

async function listFiles(dir) {
  const entries = await fs.readdir(dir, { withFileTypes: true });
  const files = await Promise.all(
    entries.map(async (entry) => {
      const fullPath = path.join(dir, entry.name);
      if (entry.isDirectory()) return listFiles(fullPath);
      return entry.name.endsWith(".mdx") ? [fullPath] : [];
    }),
  );
  return files.flat();
}

function asStringArray(value) {
  return Array.isArray(value) ? value.filter((item) => typeof item === "string").map(normalizePathname).filter(Boolean) : [];
}

function asNonEmptyStringArray(value) {
  return Array.isArray(value) ? value.filter((item) => typeof item === "string" && item.trim()) : [];
}

function hasRequiredSources(value) {
  const text = String(value ?? "").trim();
  return Boolean(text) && !/^n\/?a$/i.test(text) && !/^none$/i.test(text);
}

function hasFrontmatterSources(value) {
  if (!Array.isArray(value)) return false;
  return value.some((source) => {
    if (typeof source === "string") return Boolean(source.trim());
    if (!source || typeof source !== "object") return false;
    return Boolean(String(source.url ?? source.claim ?? source.publisher ?? source.id ?? "").trim());
  });
}

const [backlogSource, netNewSource, mdxFiles] = await Promise.all([
  fs.readFile(backlogFile, "utf8"),
  fs.readFile(netNewPathsFile, "utf8"),
  listFiles("content"),
]);

const netNewPaths = new Set(netNewSource.split(/\r?\n/).map(normalizePathname).filter(Boolean));
const entriesByPath = new Map();

for (const file of mdxFiles) {
  const relative = path.relative("content", file);
  const collection = relative.split(path.sep)[0];
  const slug = path.basename(file, ".mdx");
  const routeBase = collectionRoutes[collection];
  if (!routeBase) continue;
  const routePath = normalizePathname(`${routeBase}/${slug}`);
  const parsed = matter(await fs.readFile(file, "utf8"));
  entriesByPath.set(routePath, {
    file,
    data: parsed.data,
  });
}

const rows = parseBacklog(backlogSource);
const draftedRows = rows.filter(({ values }) => values.status.startsWith("drafted"));
const draftedPaths = new Set(draftedRows.map(({ values }) => routeFor(values)).filter(Boolean));
const errors = [];

if (rows.length < minRows) {
  errors.push(`Expected at least ${minRows} backlog rows, found ${rows.length}`);
}

if (netNewPaths.size < minNetNew) {
  errors.push(`Expected at least ${minNetNew} net-new paths, found ${netNewPaths.size}`);
}

for (const { line, values } of draftedRows) {
  const routePath = routeFor(values);
  const entry = entriesByPath.get(routePath);

  if (!entry) {
    errors.push(`line ${line}: drafted row has no matching MDX entry: ${routePath}`);
    continue;
  }

  if (!netNewPaths.has(routePath)) {
    errors.push(`line ${line}: drafted row missing from ${netNewPathsFile}: ${routePath}`);
  }

  const tags = asNonEmptyStringArray(entry.data.tags);
  if (tags.length === 0) {
    errors.push(`${entry.file}: expected non-empty tags frontmatter`);
  }

  const targetPersona = asNonEmptyStringArray(entry.data.targetPersona);
  if (targetPersona.length === 0) {
    errors.push(`${entry.file}: expected non-empty targetPersona frontmatter`);
  }

  if (entry.data.buyerStage !== values.buyerStage) {
    errors.push(`${entry.file}: buyerStage "${entry.data.buyerStage}" does not match backlog line ${line} "${values.buyerStage}"`);
  }

  const allowedStages = collectionAllowedStages[values.collection] ?? [];
  if (!allowedStages.includes(entry.data.buyerStage)) {
    errors.push(`${entry.file}: buyerStage "${entry.data.buyerStage}" is not allowed for collection "${values.collection}"`);
  }

  if (hasRequiredSources(values.requiredSources) && !hasFrontmatterSources(entry.data.sources)) {
    errors.push(`${entry.file}: backlog line ${line} requires sources but MDX has no non-empty sources frontmatter`);
  }

  const relatedPages = asStringArray(entry.data.relatedPages);
  if (relatedPages.length < 3) {
    errors.push(`${entry.file}: expected at least 3 relatedPages, found ${relatedPages.length}`);
  }

  if (relatedPages.includes(routePath)) {
    errors.push(`${entry.file}: relatedPages must not self-link: ${routePath}`);
  }

  for (const relatedPath of relatedPages) {
    if (!entriesByPath.has(relatedPath) && !relatedPath.startsWith("/privacy") && !relatedPath.startsWith("/support") && !relatedPath.startsWith("/terms") && !relatedPath.startsWith("/get")) {
      errors.push(`${entry.file}: relatedPage does not resolve to content route: ${relatedPath}`);
    }
  }
}

for (const netNewPath of netNewPaths) {
  if (!draftedPaths.has(netNewPath)) {
    errors.push(`${netNewPathsFile}: net-new path has no drafted backlog row: ${netNewPath}`);
  }

  if (!entriesByPath.has(netNewPath)) {
    errors.push(`${netNewPathsFile}: net-new path has no matching MDX entry: ${netNewPath}`);
  }
}

if (errors.length > 0) {
  console.error(`verify-seo400-content: ${errors.length} error(s)`);
  for (const error of errors.slice(0, 80)) console.error(`- ${error}`);
  if (errors.length > 80) console.error(`- ...${errors.length - 80} more`);
  process.exit(1);
}

console.log(`verify-seo400-content: ${draftedRows.length} drafted rows checked against MDX`);
