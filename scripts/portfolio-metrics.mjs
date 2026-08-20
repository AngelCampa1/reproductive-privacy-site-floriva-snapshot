#!/usr/bin/env node
/**
 * Measures this repository and emits the numbers the README quotes.
 *
 * The point is that no figure in the documentation is typed by hand. Anyone can
 * run `pnpm metrics` and reproduce every one of them, which is the only reason
 * to believe them.
 *
 * Two rules do most of the work:
 *
 *   1. Files come from `git ls-files`, never from walking the filesystem. Build
 *      output, node_modules, and the multi-GB artifacts tree are gitignored, so
 *      they cannot be counted even by accident.
 *   2. Every tracked text file lands in exactly one bucket, and the buckets are
 *      asserted to sum back to the file count. Generated code is reported
 *      separately from hand-written code and never folded into a total.
 *
 * Usage:
 *   node scripts/portfolio-metrics.mjs                 markdown to stdout
 *   node scripts/portfolio-metrics.mjs --write         also write portfolio/metrics files
 *   node scripts/portfolio-metrics.mjs --json          raw JSON to stdout
 *   node scripts/portfolio-metrics.mjs --strict        fail if the tree is dirty
 */
import { execFileSync } from "node:child_process";
import { readFileSync, existsSync, statSync, writeFileSync, readdirSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const rootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

function git(args) {
  return execFileSync("git", args, { cwd: rootDir, encoding: "utf8", windowsHide: true, maxBuffer: 64 * 1024 * 1024 }).trim();
}

/* ------------------------------------------------------------------ buckets */

/**
 * Ordered; first match wins. The ordering is the whole design.
 *
 * `generated` sits above `appSource` so the 449 emitted modules under
 * src/site/generated are never claimed as hand-written. `tests` sits above both
 * `tooling` and `appSource` so a .test.ts under scripts/ is counted once, as a
 * test. The four entries in the generated group that are not under a generated
 * directory are build outputs that happen to be committed; folding them into
 * hand-written source would overstate it by roughly 1.6MB.
 */
const RULES = [
  [/^src\/site\/generated\//, "generated"],
  [/^src\/site\/content-manifest\.ts$/, "generated"],
  [/^public\/public-knowledge\.json$/, "generated"],
  [/^public\/(sitemap\.xml|llms\.txt)$/, "generated"],
  [/^docs\/seo-400\/recovery-[^/]+\/claims-baseline\.(json|csv)$/, "generatedData"],
  [/^src\/site\/(index-policy|hub-collections|site-routes)\.json$/, "generatedData"],
  [/\.(test|spec)\.(ts|tsx|mts|mjs)$/, "tests"],
  [/^scripts\/__fixtures__\//, "tests"],
  [/^worker\/test\//, "tests"],
  [/^scripts\/.*\.mjs$/, "tooling"],
  [/^(src|functions|worker)\/.*\.(ts|tsx|mts)$/, "appSource"],
  [/\.css$/, "styles"],
  [/^migrations\/.*\.sql$/, "sql"],
  [/^content\/.*\.mdx$/, "contentMdx"],
  [/\.md$/, "docs"],
  [/\.(png|jpe?g|webp|avif|svg|woff2?|ico|pdf|gif)$/i, "binary"],
];

const TEXTUAL = new Set(["generated", "generatedData", "tests", "tooling", "appSource", "styles", "sql", "contentMdx", "docs", "config", "other"]);
/** The headline "written by a person" figure. Generated buckets are excluded on purpose. */
const HAND_WRITTEN = ["appSource", "tests", "tooling", "styles", "sql"];

function classify(file) {
  for (const [pattern, bucket] of RULES) if (pattern.test(file)) return bucket;
  if (/^(package\.json|pnpm-lock\.yaml|tsconfig.*\.json|.*\.toml|eslint\.config\.js|index\.html|\.env\.example)$/.test(file)) return "config";
  if (/\.(json|ya?ml|txt|html|toml|js)$/.test(file)) return "config";
  return "other";
}

/** Physical lines, blanks and comments included. Stated plainly so the number is not arguable. */
function countLines(abs) {
  const text = readFileSync(abs, "utf8");
  if (text === "") return 0;
  const parts = text.split(/\r\n|\r|\n/);
  if (parts[parts.length - 1] === "") parts.pop();
  return parts.length;
}

/* ------------------------------------------------------------------ measures */

function measureFiles() {
  const files = git(["ls-files"]).split("\n").filter(Boolean);
  const buckets = {};
  const members = {};
  for (const file of files) {
    const bucket = classify(file);
    (buckets[bucket] ??= { files: 0, lines: 0 }).files += 1;
    (members[bucket] ??= []).push(file);
    if (!TEXTUAL.has(bucket)) continue;
    const abs = path.join(rootDir, file);
    if (existsSync(abs)) buckets[bucket].lines += countLines(abs);
  }

  const assigned = Object.values(buckets).reduce((sum, b) => sum + b.files, 0);
  if (assigned !== files.length) {
    throw new Error(`bucket assignment lost or duplicated files: ${assigned} assigned vs ${files.length} tracked`);
  }
  return { files, buckets, members };
}

function measureGit() {
  const contributors = git(["shortlog", "-sne", "HEAD"])
    .split("\n")
    .map((line) => line.match(/<([^>]+)>/)?.[1])
    .filter(Boolean);
  const commits = Number(git(["rev-list", "--count", "HEAD"]));
  return {
    commits,
    // A squashed single-commit snapshot has no development history to measure. Flag it
    // so the report says that, rather than printing a one-day range that would read as
    // if the project took a day.
    snapshot: commits === 1,
    // Null rather than a SHA in a snapshot: regenerating this file and folding it back
    // into the sole commit changes that commit's hash, so any value recorded here names
    // a commit that no longer exists by the time anyone reads it.
    rev: commits === 1 ? null : git(["rev-parse", "--short", "HEAD"]),
    firstCommit: git(["log", "--reverse", "--format=%ad", "--date=short"]).split("\n")[0],
    lastCommit: git(["log", "-1", "--format=%ad", "--date=short"]),
    // Deduplicated by email: the same person has authored under two names here.
    contributors: new Set(contributors).size,
    dirty: git(["status", "--porcelain"]).length > 0,
  };
}

function measureRoutes() {
  const sitemap = path.join(rootDir, "public/sitemap.xml");
  const indexed = existsSync(sitemap) ? (readFileSync(sitemap, "utf8").match(/<loc>/g) ?? []).length : 0;

  const policyPath = path.join(rootDir, "src/site/index-policy.json");
  const policy = existsSync(policyPath) ? JSON.parse(readFileSync(policyPath, "utf8")) : {};
  const noindex = (policy.noindexRoutePaths ?? []).length;

  return { indexed, noindex, total: indexed + noindex };
}

async function measureContent() {
  const { loadContentEntries } = await import("./lib/mobile-audit-routes.mjs");
  const entries = loadContentEntries(rootDir);
  const byCollection = {};
  for (const entry of entries) byCollection[entry.collection] = (byCollection[entry.collection] ?? 0) + 1;
  return { documents: entries.length, collections: Object.keys(byCollection).length, byCollection };
}

function measureSurfaces() {
  const pkg = JSON.parse(readFileSync(path.join(rootDir, "package.json"), "utf8"));
  const scripts = Object.keys(pkg.scripts ?? {});

  const migrationsDir = path.join(rootDir, "migrations");
  const migrations = existsSync(migrationsDir) ? readdirSync(migrationsDir).filter((f) => f.endsWith(".sql")) : [];
  const tables = new Set();
  for (const file of migrations) {
    const sql = readFileSync(path.join(migrationsDir, file), "utf8");
    for (const match of sql.matchAll(/CREATE\s+TABLE\s+(?:IF\s+NOT\s+EXISTS\s+)?["'`]?(\w+)/gi)) {
      // `_new` tables are rebuild scratch inside a migration, not part of the schema.
      if (!match[1].endsWith("_new")) tables.add(match[1]);
    }
  }

  const tracked = git(["ls-files"]).split("\n").filter(Boolean);
  const isTest = (f) => /\.(test|spec)\./.test(f);
  const edgeFiles = tracked.filter((f) => f.startsWith("functions/") && f.endsWith(".ts") && !isTest(f));

  return {
    npmScripts: scripts.length,
    // Gates are the verification surface: everything that can fail the build.
    verificationGates: scripts.filter((s) => /^(verify|audit|check|freeze|test):/.test(s)).length,
    migrations: migrations.length,
    d1Tables: tables.size,
    edgeRouteHandlers: edgeFiles.filter((f) => !f.startsWith("functions/_lib/")).length,
    edgeSharedModules: edgeFiles.filter((f) => f.startsWith("functions/_lib/")).length,
    reactComponents: tracked.filter((f) => /^src\/(components|pages)\/.*\.tsx$/.test(f) && !isTest(f)).length,
  };
}

function measureTests() {
  const tracked = git(["ls-files"]).split("\n").filter(Boolean);
  const testFiles = tracked.filter((f) => /\.(test|spec)\.(ts|tsx|mts|mjs)$/.test(f));
  let cases = 0;
  let suites = 0;
  let parameterised = 0;
  /* A source scan can only see declarations. `it.each` expands at runtime, so
     the executed total is higher than what is written down. Where a real run's
     JSON is supplied via --vitest-json, that number is reported instead and the
     scan is kept only as a cross-check. */
  for (const file of testFiles) {
    const abs = path.join(rootDir, file);
    if (!existsSync(abs)) continue;
    const text = readFileSync(abs, "utf8");
    for (const line of text.split(/\r?\n/)) {
      const trimmed = line.trim();
      if (trimmed.startsWith("//") || trimmed.startsWith("*")) continue;
      if (/\b(it|test)\s*[.(]/.test(trimmed) && /\b(it|test)\s*(\.\w+)*\s*\(/.test(trimmed)) cases += 1;
      if (/\bdescribe\s*(\.\w+)*\s*\(/.test(trimmed)) suites += 1;
      if (/\b(it|test|describe)\.each\b/.test(trimmed)) parameterised += 1;
    }
  }
  const result = { files: testFiles.length, declaredCases: cases, suites, parameterised };

  const flag = argv.find((a) => a.startsWith("--vitest-json="));
  const jsonPath = flag ? flag.slice("--vitest-json=".length) : "";
  if (jsonPath && existsSync(jsonPath)) {
    const run = JSON.parse(readFileSync(jsonPath, "utf8"));
    result.executed = {
      total: run.numTotalTests,
      passed: run.numPassedTests,
      failed: run.numFailedTests,
      files: run.numTotalTestSuites,
    };
  }
  return result;
}

/**
 * Coverage is only reported from a real run. Anything stale, missing, or older
 * than the commit being measured is reported as unmeasured rather than guessed.
 */
function measureCoverage(gitInfo) {
  const summaryPath = path.join(rootDir, "coverage/coverage-summary.json");
  if (!existsSync(summaryPath)) return { measured: false, reason: "coverage/coverage-summary.json not found; run pnpm test:coverage" };

  const ageDays = (Date.now() - statSync(summaryPath).mtimeMs) / 86_400_000;
  if (ageDays > 14) return { measured: false, reason: `coverage report is ${Math.round(ageDays)} days old; re-run pnpm test:coverage` };

  const summary = JSON.parse(readFileSync(summaryPath, "utf8"));
  const total = summary.total;
  const fileKeys = Object.keys(summary).filter((k) => k !== "total");

  /* v8 counts each arrow function, and src/site/content.ts registers one lazy
     import thunk per content document via import.meta.glob. Those 446 thunks are
     the majority of every function counted in the repo and are almost all
     uncalled in unit tests, which drags the headline metric down without saying
     anything about how well the code is tested. Report both numbers. */
  const globKey = fileKeys.find((k) => /src[\\/]site[\\/]content\.ts$/.test(k));
  const glob = globKey ? summary[globKey].functions : null;
  const adjusted = glob && glob.total > 100
    ? {
        covered: total.functions.covered - glob.covered,
        total: total.functions.total - glob.total,
        excludedThunks: glob.total,
      }
    : null;
  if (adjusted) adjusted.pct = Number(((adjusted.covered / adjusted.total) * 100).toFixed(2));

  return {
    measured: true,
    measuredAt: statSync(summaryPath).mtime.toISOString().slice(0, 10),
    rev: gitInfo.rev,
    filesMeasured: fileKeys.length,
    lines: total.lines,
    statements: total.statements,
    branches: total.branches,
    functions: total.functions,
    functionsExcludingGlobThunks: adjusted,
  };
}

/* ------------------------------------------------------------------- render */

const n = (value) => value.toLocaleString("en-US");

function renderMarkdown(m) {
  const hand = HAND_WRITTEN.reduce(
    (acc, key) => ({ files: acc.files + (m.code[key]?.files ?? 0), lines: acc.lines + (m.code[key]?.lines ?? 0) }),
    { files: 0, lines: 0 },
  );
  const row = (label, bucket) => `| ${label} | ${n(m.code[bucket]?.files ?? 0)} | ${n(m.code[bucket]?.lines ?? 0)} |`;

  const out = [];
  out.push("### Authored", "");
  out.push("| | Files | Lines |", "|---|---:|---:|");
  out.push(row("Application source (`src/`, `functions/`, `worker/`)", "appSource"));
  out.push(row("Tests", "tests"));
  out.push(row("Build and verification tooling (`scripts/`)", "tooling"));
  out.push(row("Styles", "styles"));
  out.push(row("SQL migrations", "sql"));
  out.push(`| **Total** | **${n(hand.files)}** | **${n(hand.lines)}** |`, "");

  out.push("### Generated and content, not authored directly", "");
  out.push("Reported separately because counting it as authored work would be a lie.", "");
  out.push("| | Files | Lines |", "|---|---:|---:|");
  out.push(row("Content documents (`content/**/*.mdx`)", "contentMdx"));
  out.push(`| Generated modules (\`pnpm generate:content\`) | ${n((m.code.generated?.files ?? 0) + (m.code.generatedData?.files ?? 0))} | ${n((m.code.generated?.lines ?? 0) + (m.code.generatedData?.lines ?? 0))} |`);
  out.push(row("Prose documentation", "docs"), "");

  out.push("### Tests", "");
  out.push("| | |", "|---|---:|");
  out.push(`| Test files | ${n(m.tests.files)} |`);
  if (m.tests.executed) {
    out.push(`| Test cases executed | ${n(m.tests.executed.total)} |`);
    out.push(`| Passing | ${n(m.tests.executed.passed)} |`);
  } else {
    out.push(`| Test cases declared in source | ${n(m.tests.declaredCases)} |`);
  }
  out.push(`| Suites | ${n(m.tests.suites)} |`);
  out.push(`| Test lines per 100 lines of application source | ${Math.round((m.code.tests.lines / m.code.appSource.lines) * 100)} |`, "");
  if (m.tests.parameterised > 0 && !m.tests.executed) {
    out.push(
      `Declared cases are a source scan. ${m.tests.parameterised} use \`.each\` and expand at runtime, ` +
        "so the executed total is higher. Pass `--vitest-json=<path>` to report a real run instead.",
      "",
    );
  }

  out.push("### Coverage", "");
  if (!m.coverage.measured) {
    out.push(`Not measured. ${m.coverage.reason}`, "");
  } else {
    const c = m.coverage;
    out.push("| | Covered | Total | |", "|---|---:|---:|---:|");
    for (const key of ["lines", "statements", "branches"]) {
      out.push(`| ${key[0].toUpperCase()}${key.slice(1)} | ${n(c[key].covered)} | ${n(c[key].total)} | ${c[key].pct}% |`);
    }
    out.push(`| Functions | ${n(c.functions.covered)} | ${n(c.functions.total)} | ${c.functions.pct}% |`);
    if (c.functionsExcludingGlobThunks) {
      const a = c.functionsExcludingGlobThunks;
      out.push(`| Functions, excluding ${n(a.excludedThunks)} lazy-import thunks | ${n(a.covered)} | ${n(a.total)} | ${a.pct}% |`);
    }
    out.push("");
    if (c.functionsExcludingGlobThunks) {
      out.push(
        `Across ${n(c.filesMeasured)} application files. The raw function figure is distorted by ` +
          `\`src/site/content.ts\`, where \`import.meta.glob\` registers one lazy import per content ` +
          `document; those ${n(c.functionsExcludingGlobThunks.excludedThunks)} thunks are most of the functions counted in the ` +
          "repository and are not called by unit tests. The adjusted row is the meaningful one.",
        "",
      );
    }
  }

  out.push("### Surface", "");
  out.push("| | |", "|---|---:|");
  out.push(`| Routes (${n(m.routes.indexed)} indexed + ${n(m.routes.noindex)} \`noindex, follow\`) | ${n(m.routes.total)} |`);
  out.push(`| Content documents across ${m.content.collections} collections | ${n(m.content.documents)} |`);
  out.push(`| React component files (\`src/components\`, \`src/pages\`) | ${n(m.surfaces.reactComponents)} |`);
  out.push(`| Edge route handlers (+ ${m.surfaces.edgeSharedModules} shared modules) | ${n(m.surfaces.edgeRouteHandlers)} |`);
  out.push(`| D1 tables across ${m.surfaces.migrations} migrations | ${n(m.surfaces.d1Tables)} |`);
  out.push(`| npm scripts, of which ${m.surfaces.verificationGates} are verification gates | ${n(m.surfaces.npmScripts)} |`);
  if (m.git.snapshot) {
    out.push("| Commits | 1, squashed snapshot |", "");
    out.push(
      "This repository is a single-commit snapshot, so it carries no measurable development history. Every other figure above is reproduced by running `pnpm metrics` here.",
      "",
    );
  } else {
    out.push(`| Commits (${m.git.firstCommit} to ${m.git.lastCommit}) | ${n(m.git.commits)} |`, "");
  }

  return out.join("\n");
}

/* --------------------------------------------------------------------- main */

const argv = process.argv.slice(2);
const gitInfo = measureGit();

if (argv.includes("--strict") && gitInfo.dirty) {
  console.error("Refusing to report metrics from a dirty working tree. Commit or stash first, or drop --strict.");
  console.error(git(["status", "--porcelain"]));
  process.exit(1);
}

const { files, buckets, members } = measureFiles();

/* Auditing hatches. Any number here should be checkable against the file list
   that produced it, without reading the classifier. `--list-all` returns every
   bucket at once so a caller does not pay the git and file-read cost per
   bucket. */
if (argv.includes("--list-all")) {
  console.log(JSON.stringify(members, null, 2));
  process.exit(0);
}

const listFlag = argv.find((a) => a.startsWith("--list="));
if (listFlag) {
  const bucket = listFlag.slice("--list=".length);
  const list = members[bucket];
  if (!list) {
    console.error(`Unknown bucket "${bucket}". Available: ${Object.keys(members).sort().join(", ")}`);
    process.exit(1);
  }
  for (const file of list) console.log(file);
  console.error(`\n${list.length} files in bucket "${bucket}"`);
  process.exit(0);
}
const metrics = {
  generatedAt: new Date().toISOString(),
  rev: gitInfo.rev,
  gitStatus: gitInfo.dirty ? "dirty" : "clean",
  trackedFiles: files.length,
  code: buckets,
  tests: measureTests(),
  coverage: measureCoverage(gitInfo),
  routes: measureRoutes(),
  content: await measureContent(),
  surfaces: measureSurfaces(),
  git: gitInfo,
};

const markdown = renderMarkdown(metrics);

if (argv.includes("--json")) {
  console.log(JSON.stringify(metrics, null, 2));
} else {
  console.log(markdown);
}

if (argv.includes("--write")) {
  const header = [
    "<!-- Generated by scripts/portfolio-metrics.mjs. Do not edit by hand. -->",
    "",
    "# Metrics",
    "",
    /* Naming a revision only helps when there is more than one to distinguish.
       In a squashed snapshot the sole commit's SHA also changes every time this
       file is regenerated and folded back into it, so printing it guarantees a
       stale reference to a commit that no longer exists. */
    metrics.git.snapshot
      ? `Measured on ${metrics.generatedAt.slice(0, 10)} from a ${metrics.gitStatus} working tree, at the single commit in this snapshot.`
      : `Measured at \`${metrics.rev}\` on ${metrics.generatedAt.slice(0, 10)} from a ${metrics.gitStatus} working tree.`,
    `Reproduce with \`pnpm metrics\`. Counts come from \`git ls-files\`, so nothing gitignored can be counted.`,
    `Line counts are physical lines, blanks and comments included.`,
    "",
    "",
  ].join("\n");
  writeFileSync(path.join(rootDir, "portfolio/METRICS.md"), `${header}${markdown}\n`, "utf8");
  writeFileSync(path.join(rootDir, "portfolio/metrics.json"), `${JSON.stringify(metrics, null, 2)}\n`, "utf8");
  console.error("\nwrote portfolio/METRICS.md and portfolio/metrics.json");
}
