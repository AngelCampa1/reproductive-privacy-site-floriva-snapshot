#!/usr/bin/env node
import { promises as fs } from "node:fs";
import path from "node:path";

const args = process.argv.slice(2);

function readArg(name, fallback = null) {
  const index = args.indexOf(name);
  if (index === -1) return fallback;
  return args[index + 1] ?? fallback;
}

function hasFlag(name) {
  return args.includes(name);
}

const backlogFile = readArg("--backlog", path.join("docs", "seo-400", "topic-backlog.csv"));
const netNewPathsFile = readArg("--net-new-paths", path.join("docs", "seo-400", "net-new-paths.txt"));
const minRows = Number(readArg("--min", "0"));
const allowWarnings = hasFlag("--allow-warnings");
const allowExtraPaths = hasFlag("--allow-extra-paths");

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

const requiredColumns = [
  "pillar",
  "title",
  "slug",
  "collection",
  "buyerStage",
  "targetPersona",
  "targetKeyword",
  "format",
  "valueAsset",
  "requiredSources",
  "internalLinks",
  "status",
];

function normalizePathname(value) {
  if (!value) return "";
  const trimmed = value.trim();
  if (!trimmed || trimmed.startsWith("#")) return "";
  if (/^https?:\/\//.test(trimmed)) {
    return new URL(trimmed).pathname.replace(/\/+$/, "") || "/";
  }
  return `/${trimmed.replace(/^\/+/, "").replace(/\/+$/, "")}` || "/";
}

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

function parseBacklog(source) {
  const lines = source
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter((line) => line && !line.startsWith("#"));

  if (lines.length === 0) {
    return { headers: requiredColumns, rows: [] };
  }

  const delimiter = lines[0].includes("|") ? "|" : ",";
  const headers = parseDelimitedLine(lines[0], delimiter);
  const rows = lines.slice(1).map((line, index) => {
    const values = parseDelimitedLine(line, delimiter);
    return {
      line: index + 2,
      values: Object.fromEntries(headers.map((header, cellIndex) => [header, values[cellIndex] ?? ""])),
    };
  });

  return { headers, rows };
}

async function listFiles(dir) {
  const entries = await fs.readdir(dir, { withFileTypes: true });
  const files = await Promise.all(
    entries.map(async (entry) => {
      const fullPath = path.join(dir, entry.name);
      if (entry.isDirectory()) return listFiles(fullPath);
      return fullPath;
    }),
  );
  return files.flat();
}

async function existingPublicPaths() {
  const files = await listFiles("content");
  const publicPaths = new Set();

  for (const file of files) {
    if (!file.endsWith(".mdx")) continue;
    const parsed = path.parse(file);
    const collection = path.basename(parsed.dir);
    const routeBase = collectionRoutes[collection];
    if (!routeBase) continue;
    publicPaths.add(normalizePathname(`${routeBase}/${parsed.name}`));
  }

  return publicPaths;
}

async function readNetNewPaths() {
  try {
    const source = await fs.readFile(netNewPathsFile, "utf8");
    return new Set(
      source
        .split(/\r?\n/)
        .map(normalizePathname)
        .filter(Boolean),
    );
  } catch (error) {
    if (error.code === "ENOENT") return new Set();
    throw error;
  }
}

function pathForRow(row) {
  const routeBase = collectionRoutes[row.collection];
  if (!routeBase || !row.slug) return "";
  return normalizePathname(`${routeBase}/${row.slug}`);
}

const source = await fs.readFile(backlogFile, "utf8");
const { headers, rows } = parseBacklog(source);
const existingPaths = await existingPublicPaths();
const netNewPaths = await readNetNewPaths();
const errors = [];
const warnings = [];

for (const column of requiredColumns) {
  if (!headers.includes(column)) {
    errors.push(`Missing required column: ${column}`);
  }
}

if (rows.length < minRows) {
  errors.push(`Expected at least ${minRows} backlog rows, found ${rows.length}`);
}

const plannedPaths = new Map();
for (const { line, values } of rows) {
  const rowLabel = `line ${line}`;
  const pathName = pathForRow(values);

  for (const column of ["title", "slug", "collection", "buyerStage", "targetPersona", "targetKeyword", "format", "valueAsset", "requiredSources", "internalLinks"]) {
    if (!values[column]) errors.push(`${rowLabel}: missing ${column}`);
  }

  if (!collectionRoutes[values.collection]) {
    errors.push(`${rowLabel}: invalid collection "${values.collection}"`);
  }

  if (!["tofu", "mofu", "bofu"].includes(values.buyerStage)) {
    errors.push(`${rowLabel}: invalid buyerStage "${values.buyerStage}"`);
  }

  if (values.slug && !/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(values.slug)) {
    errors.push(`${rowLabel}: slug must be lowercase kebab-case: ${values.slug}`);
  }

  if (pathName) {
    const status = values.status || "";
    const rowIsDrafted = status.startsWith("drafted");

    if (rowIsDrafted && !netNewPaths.has(pathName)) {
      errors.push(`${rowLabel}: drafted row must appear in ${netNewPathsFile}: ${pathName}`);
    }

    if (existingPaths.has(pathName) && !rowIsDrafted) {
      errors.push(`${rowLabel}: planned path already exists: ${pathName}`);
    }

    const priorLine = plannedPaths.get(pathName);
    if (priorLine) {
      errors.push(`${rowLabel}: duplicate planned path also appears on line ${priorLine}: ${pathName}`);
    } else {
      plannedPaths.set(pathName, line);
    }
  }
}

const knownPaths = new Set([...existingPaths, ...plannedPaths.keys()]);
for (const pathname of netNewPaths) {
  if (!plannedPaths.has(pathname)) {
    const message = `${netNewPathsFile}: net-new path is not present in backlog: ${pathname}`;
    if (allowExtraPaths) {
      warnings.push(message);
    } else {
      errors.push(message);
    }
  }
}

for (const { line, values } of rows) {
  const status = values.status || "";
  const rowIsDrafted = status.startsWith("drafted");
  const links = (values.internalLinks || "")
    .split(";")
    .map(normalizePathname)
    .filter(Boolean);

  if (links.length < 3) {
    errors.push(`line ${line}: expected at least 3 internalLinks separated by semicolons`);
  }

  for (const link of links) {
    if (!knownPaths.has(link)) {
      const message = `line ${line}: internal link does not exist in current or planned routes: ${link}`;
      if (rowIsDrafted && !allowWarnings) {
        errors.push(message);
      } else {
        warnings.push(message);
      }
    }
  }
}

if (warnings.length > 0) {
  console.warn(`verify-seo400-backlog: ${warnings.length} warning(s)`);
  for (const warning of warnings.slice(0, 50)) console.warn(`- ${warning}`);
  if (warnings.length > 50) console.warn(`- ...${warnings.length - 50} more`);
}

if (errors.length > 0) {
  console.error(`verify-seo400-backlog: ${errors.length} error(s)`);
  for (const error of errors.slice(0, 50)) console.error(`- ${error}`);
  if (errors.length > 50) console.error(`- ...${errors.length - 50} more`);
  process.exit(1);
}

console.log(`verify-seo400-backlog: ${rows.length} planned rows checked`);
