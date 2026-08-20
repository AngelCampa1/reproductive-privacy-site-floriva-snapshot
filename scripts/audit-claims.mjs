#!/usr/bin/env node
/**
 * audit-claims.mjs
 *
 * Walks every MDX file in content/ and flags falsifiable claims that lack a
 * citation — either an inline markdown link to an HTTPS source on the same
 * sentence, or a frontmatter `sources[]` entry whose `claim` field overlaps.
 *
 * Output:
 *   scripts/claims-audit-report.json — machine-readable findings
 *   scripts/claims-audit-report.csv  — human-readable findings
 *
 * Risk tiering:
 *   HIGH  — files in reproductive-privacy-state-pages, comparisons, or guides
 *           AND claim is numeric or legal
 *   MED   — medical/hormonal claim anywhere
 *   LOW   — everything else
 *
 * This is a heuristic auditor. False positives are expected — the goal is to
 * surface every claim-shaped string a human or sub-agent should look at.
 *
 * Filling in the heuristics is W2 of the source-verification campaign. This
 * file is intentionally a scaffold so later agents have a known landing site.
 */

import { promises as fs } from "node:fs";
import path from "node:path";
import matter from "gray-matter";

const rootDir = process.cwd();
const contentDir = path.join(rootDir, "content");
const jsonOut = path.join(rootDir, "scripts", "claims-audit-report.json");
const csvOut = path.join(rootDir, "scripts", "claims-audit-report.csv");

const HIGH_RISK_COLLECTIONS = new Set([
  "reproductive-privacy-state-pages",
  "comparisons",
  "guides",
  "alternatives",
]);

const MED_RISK_COLLECTIONS = new Set([
  "condition-guides",
  "hormone-guides",
  "symptom-guides",
  "wellness-guides",
  "life-stage-guides",
]);

const CLAIM_PATTERNS = [
  { name: "dollar", regex: /\$\d+(?:[.,]\d+)?\s?(?:[MBK]|million|billion|thousand)?/gi, kind: "numeric" },
  { name: "percent", regex: /\b\d+(?:\.\d+)?\s?%/g, kind: "numeric" },
  { name: "states-count", regex: /\b\d+\s+states?\b/gi, kind: "legal" },
  { name: "ftc", regex: /\bFTC\b/g, kind: "legal" },
  { name: "case-citation", regex: /\b[A-Z][a-zA-Z]+\s+v\.\s+[A-Z][a-zA-Z]+/g, kind: "legal" },
  { name: "bill-number", regex: /\b(?:SB|HB|HR|AB|S\.|H\.R\.)\s?\d{1,5}\b/g, kind: "legal" },
  { name: "named-case", regex: /\b(?:Dobbs|Roe v\. Wade|Purl v\. HHS|Frasco)\b/g, kind: "legal" },
  { name: "as-of-date", regex: /\bas of\s+(?:January|February|March|April|May|June|July|August|September|October|November|December)?\s?\d{4}\b/gi, kind: "dated" },
  { name: "since-date", regex: /\bsince\s+\d{4}\b/gi, kind: "dated" },
];

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

function getCollection(filePath) {
  const relativePath = path.relative(contentDir, filePath);
  const [collection] = relativePath.split(path.sep);
  return collection;
}

function riskTier(collection, kind) {
  if (HIGH_RISK_COLLECTIONS.has(collection) && (kind === "numeric" || kind === "legal" || kind === "dated")) {
    return "HIGH";
  }
  if (MED_RISK_COLLECTIONS.has(collection)) {
    return "MED";
  }
  return "LOW";
}

function hasInlineSourceOnLine(line) {
  // Look for [...](http...) on the same line.
  return /\[[^\]]+\]\(https?:\/\/[^\)]+\)/.test(line);
}

function hasFrontmatterSourceFor(claimText, frontmatterSources) {
  if (!frontmatterSources || frontmatterSources.length === 0) return false;
  const claimLower = claimText.toLowerCase();
  for (const source of frontmatterSources) {
    if (!source || typeof source !== "object") continue;
    const claimField = (source.claim ?? "").toString().toLowerCase();
    if (!claimField) continue;
    // Lexical overlap: shared 4+ char tokens
    const claimTokens = new Set(claimLower.match(/[a-z0-9.$]{4,}/g) ?? []);
    const sourceTokens = new Set(claimField.match(/[a-z0-9.$]{4,}/g) ?? []);
    let shared = 0;
    for (const token of claimTokens) {
      if (sourceTokens.has(token)) shared += 1;
    }
    if (shared >= 2) return true;
  }
  return false;
}

function auditEntry(filePath, rawSource) {
  const { content, data } = matter(rawSource);
  const collection = getCollection(filePath);
  const lines = content.split("\n");
  const findings = [];

  for (let lineIndex = 0; lineIndex < lines.length; lineIndex += 1) {
    const line = lines[lineIndex];
    if (!line || line.startsWith("#")) continue;

    for (const pattern of CLAIM_PATTERNS) {
      pattern.regex.lastIndex = 0;
      let match;
      while ((match = pattern.regex.exec(line)) !== null) {
        const claimText = match[0];
        const inline = hasInlineSourceOnLine(line);
        const frontmatter = hasFrontmatterSourceFor(claimText, data.sources);
        if (inline || frontmatter) continue;
        findings.push({
          file: path.relative(rootDir, filePath).replace(/\\/g, "/"),
          line: lineIndex + 1,
          column: match.index + 1,
          pattern: pattern.name,
          claimText,
          riskTier: riskTier(collection, pattern.kind),
          hasInlineSource: false,
          hasFrontmatterSource: false,
          collection,
        });
      }
    }
  }

  return findings;
}

function toCsvRow(values) {
  return values
    .map((value) => {
      const stringValue = value === undefined || value === null ? "" : String(value);
      if (/[",\n]/.test(stringValue)) {
        return `"${stringValue.replace(/"/g, '""')}"`;
      }
      return stringValue;
    })
    .join(",");
}

async function main() {
  const files = await walkFiles(contentDir);
  const allFindings = [];

  for (const filePath of files) {
    const rawSource = await fs.readFile(filePath, "utf8");
    if (!rawSource.trim()) continue;
    try {
      const findings = auditEntry(filePath, rawSource);
      allFindings.push(...findings);
    } catch (error) {
      console.warn(`Skipping ${filePath}: ${error.message}`);
    }
  }

  const byRisk = { HIGH: 0, MED: 0, LOW: 0 };
  for (const finding of allFindings) byRisk[finding.riskTier] += 1;

  const report = {
    generatedAt: new Date().toISOString(),
    totalFiles: files.length,
    totalFindings: allFindings.length,
    byRisk,
    findings: allFindings,
  };

  await fs.writeFile(jsonOut, JSON.stringify(report, null, 2), "utf8");

  const csvRows = [
    toCsvRow(["file", "line", "column", "pattern", "claimText", "riskTier", "collection"]),
    ...allFindings.map((finding) =>
      toCsvRow([
        finding.file,
        finding.line,
        finding.column,
        finding.pattern,
        finding.claimText,
        finding.riskTier,
        finding.collection,
      ]),
    ),
  ];
  await fs.writeFile(csvOut, csvRows.join("\n"), "utf8");

  console.log(
    `audit-claims: scanned ${files.length} files, ${allFindings.length} unsourced claim-shaped findings ` +
      `(HIGH=${byRisk.HIGH}, MED=${byRisk.MED}, LOW=${byRisk.LOW})`,
  );
  console.log(`  json: ${path.relative(rootDir, jsonOut)}`);
  console.log(`  csv:  ${path.relative(rootDir, csvOut)}`);
}

await main();
