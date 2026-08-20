#!/usr/bin/env node

import { createHash, randomUUID } from "node:crypto";
import { execFile } from "node:child_process";
import { promises as fs } from "node:fs";
import path from "node:path";
import { promisify } from "node:util";
import { pathToFileURL } from "node:url";
import matter from "gray-matter";
import remarkGfm from "remark-gfm";
import remarkParse from "remark-parse";
import { unified } from "unified";
import {
  createBaselineId,
  ensureRepositoryOutputPath,
  normalizeClaimText,
  resolveRepositoryPath,
} from "./lib/claim-identity.mjs";

const execFileAsync = promisify(execFile);
const EXPECTED_TOTALS = Object.freeze({
  totalFindings: 1010,
  byRisk: Object.freeze({ HIGH: 641, MED: 98, LOW: 271 }),
  totalFiles: 535,
});
const RISK_TIERS = Object.freeze(["HIGH", "MED", "LOW"]);
const SENTENCE_CONTAINER_TYPES = new Set(["paragraph", "heading", "code", "html", "definition"]);

function sha256(value) {
  return createHash("sha256").update(value).digest("hex");
}

function splitLinesWithOffsets(source) {
  const lines = [];
  let start = 0;
  for (let index = 0; index <= source.length; index += 1) {
    if (index === source.length || source[index] === "\n") {
      const contentEnd = index > start && source[index - 1] === "\r" ? index - 1 : index;
      lines.push({ start, end: contentEnd, text: source.slice(start, contentEnd) });
      start = index + 1;
    }
  }
  return lines;
}

function protectLegalAbbreviations(value) {
  return value
    .replace(/\b(?:H\.R\.|S\.|SB\.?|HB\.?|HR\.?|AB\.?)\s*(?=\d{1,5}\b)/gi, (match) => match.replace(/\./g, "\uE000"))
    .replace(/\bv\.(?=\s+[A-Z])/g, "v\uE000");
}

function trimSegment(source, start, end) {
  while (start < end && /\s/.test(source[start])) start += 1;
  while (end > start && /\s/.test(source[end - 1])) end -= 1;
  if (/[.!?]$/.test(source.slice(start, end))) {
    const closer = source.slice(end).match(/^(?:\*{1,3}|_{1,3}|~~|`+)/)?.[0];
    if (closer) end += closer.length;
  }
  return { start, end, text: source.slice(start, end) };
}

function forceClaimAwareBoundaries(protectedText, start, end) {
  const boundaries = [];
  const candidate = /[.!?](?:\*{1,3}|_{1,3}|~~|`+)?(?=\s+(?:(?:\d+(?:[.,]\d+)?(?:\s*%)?)|(?:\$\s*\d)|(?:(?:[*_]{1,3}|~~|`+)\S)|(?:(?:[-+*]|\d+[.)])\s+)))/gu;
  candidate.lastIndex = start;
  let match;
  while ((match = candidate.exec(protectedText)) !== null && match.index < end) {
    const boundary = match.index + match[0].length;
    if (boundary > start && boundary < end) boundaries.push(boundary);
  }
  return boundaries;
}

function sentenceSegments(text) {
  const protectedText = protectLegalAbbreviations(text);
  const initial = [...new Intl.Segmenter("en", { granularity: "sentence" }).segment(protectedText)]
    .map(({ index, segment }) => ({ start: index, end: index + segment.length }));
  const spans = [];
  for (const segment of initial.length > 0 ? initial : [{ start: 0, end: text.length }]) {
    let cursor = segment.start;
    for (const boundary of forceClaimAwareBoundaries(protectedText, segment.start, segment.end)) {
      spans.push(trimSegment(text, cursor, boundary));
      cursor = boundary;
    }
    spans.push(trimSegment(text, cursor, segment.end));
  }

  const normalized = [];
  for (const span of spans) {
    if (!span.text || /^(?:\*{1,3}|_{1,3}|~~|`+)$/.test(span.text)) continue;
    const previous = normalized.at(-1);
    if (previous && span.start < previous.end) {
      if (span.end <= previous.end) continue;
      span.start = previous.end;
      while (span.start < span.end && /\s/.test(text[span.start])) span.start += 1;
      span.text = text.slice(span.start, span.end);
    }
    if (span.text) normalized.push(span);
  }
  return normalized.length > 0 ? normalized : [trimSegment(text, 0, text.length)];
}

function nodeOffsets(node) {
  const start = node?.position?.start?.offset;
  const end = node?.position?.end?.offset;
  return Number.isInteger(start) && Number.isInteger(end) ? { start, end } : null;
}

function nodeContainsOffset(node, offset) {
  const offsets = nodeOffsets(node);
  return offsets && offset >= offsets.start && offset < offsets.end;
}

function traceAstNode(root, offset) {
  const lineage = [{ node: root, indices: [] }];
  let current = root;
  let indices = [];
  while (Array.isArray(current.children)) {
    const childIndex = current.children.findIndex((child) => nodeContainsOffset(child, offset));
    if (childIndex < 0) break;
    current = current.children[childIndex];
    indices = [...indices, childIndex];
    lineage.push({ node: current, indices });
  }
  return lineage;
}

function locatorFromIndices(indices) {
  return `body:root${indices.map((index) => `.children[${index}]`).join("")}`;
}

function sourceForNode(content, node) {
  const offsets = nodeOffsets(node);
  if (!offsets) throw new Error(`Markdown AST node ${node?.type ?? "unknown"} has no source offsets`);
  return content.slice(offsets.start, offsets.end);
}

function locateFinding({ content, tree, lines, finding }) {
  const lineIndex = Number(finding.line) - 1;
  const columnIndex = Number(finding.column) - 1;
  if (!Number.isInteger(lineIndex) || lineIndex < 0 || lineIndex >= lines.length) {
    throw new Error(`Invalid scanner line for ${finding.file}: ${finding.line}`);
  }
  if (!Number.isInteger(columnIndex) || columnIndex < 0 || columnIndex >= lines[lineIndex].text.length) {
    throw new Error(`Invalid scanner column for ${finding.file}:${finding.line}: ${finding.column}`);
  }

  const absoluteOffset = lines[lineIndex].start + columnIndex;
  if (content.slice(absoluteOffset, absoluteOffset + String(finding.claimText).length) !== finding.claimText) {
    throw new Error(`Scanner location does not match claimText for ${finding.file}:${finding.line}:${finding.column}`);
  }
  const lineage = traceAstNode(tree, absoluteOffset);
  if (lineage.length < 2) throw new Error(`Could not locate ${finding.file}:${finding.line}:${finding.column} in the Markdown AST`);
  const topLevelIndex = lineage[1].indices[0];

  const tableCellIndex = lineage.findLastIndex(({ node }) => node.type === "tableCell");
  if (tableCellIndex >= 0) {
    const cell = lineage[tableCellIndex];
    const cellText = sourceForNode(content, cell.node).trim();
    const cellValue = cellText.replace(/^\|\s*/, "").replace(/\s*\|$/, "").trim();
    if (normalizeClaimText(cellValue) === normalizeClaimText(finding.claimText)) {
      const row = lineage.slice(0, tableCellIndex).findLast(({ node }) => node.type === "tableRow");
      if (!row) throw new Error(`Could not locate table row for ${finding.file}:${finding.line}:${finding.column}`);
      return {
        topLevelIndex,
        originalText: sourceForNode(content, row.node).trim(),
        baselineLocator: locatorFromIndices(row.indices),
      };
    }
    return { topLevelIndex, originalText: cellValue, baselineLocator: locatorFromIndices(cell.indices) };
  }

  const container = lineage.findLast(({ node }) => SENTENCE_CONTAINER_TYPES.has(node.type)) ?? lineage[1];
  const offsets = nodeOffsets(container.node);
  const containerText = sourceForNode(content, container.node);
  const relativeOffset = absoluteOffset - offsets.start;
  const segments = sentenceSegments(containerText);
  const sentenceIndex = segments.findIndex((segment) => relativeOffset >= segment.start && relativeOffset < segment.end);
  if (sentenceIndex < 0) throw new Error(`Could not expand ${finding.file}:${finding.line}:${finding.column} to a Markdown AST sentence`);
  return {
    topLevelIndex,
    originalText: segments[sentenceIndex].text,
    baselineLocator: `${locatorFromIndices(container.indices)}.sentence[${sentenceIndex}]`,
  };
}

function contextForTopLevelNode(content, tree, topLevelIndex) {
  let heading = "";
  for (let index = topLevelIndex; index >= 0; index -= 1) {
    if (tree.children[index]?.type === "heading") {
      heading = sourceForNode(content, tree.children[index]).trim();
      break;
    }
  }
  const blockText = (index) => tree.children[index] ? sourceForNode(content, tree.children[index]).trim() : "";
  return JSON.stringify({
    heading,
    preceding: blockText(topLevelIndex - 1),
    current: blockText(topLevelIndex),
    following: blockText(topLevelIndex + 1),
  });
}

export function extractScannerPatternIds(scannerSource) {
  const configuration = String(scannerSource).match(/const\s+CLAIM_PATTERNS\s*=\s*\[([\s\S]*?)\n\];/)?.[1];
  if (!configuration) throw new Error("Could not read ordered CLAIM_PATTERNS from the scanner implementation");
  const patternIds = [...configuration.matchAll(/\bname:\s*["']([^"']+)["']/g)].map((match) => match[1]);
  if (patternIds.length === 0 || new Set(patternIds).size !== patternIds.length) {
    throw new Error("Scanner CLAIM_PATTERNS must contain unique named rules");
  }
  return new Set(patternIds);
}

export function assertBaselineTotals(report, allowedPatternIds) {
  if (!report || typeof report !== "object" || Array.isArray(report)) throw new Error("Claims report must be an object");
  if (!Array.isArray(report.findings)) throw new Error("Claims report findings must be an array");
  if (!(allowedPatternIds instanceof Set) || allowedPatternIds.size === 0) throw new Error("Allowed scanner patterns must be a non-empty Set");
  if (!report.byRisk || typeof report.byRisk !== "object" || Array.isArray(report.byRisk)) throw new Error("Claims report metadata byRisk must be an object");
  const unknownMetadataTiers = Object.keys(report.byRisk).filter((tier) => !RISK_TIERS.includes(tier));
  if (unknownMetadataTiers.length > 0) throw new Error(`Claims report metadata has unknown risk tier: ${unknownMetadataTiers[0]}`);

  const byRisk = { HIGH: 0, MED: 0, LOW: 0 };
  report.findings.forEach((finding, index) => {
    if (!finding || typeof finding !== "object" || Array.isArray(finding)) throw new Error(`Finding ${index} must be an object`);
    if (!RISK_TIERS.includes(finding.riskTier)) throw new Error(`Finding ${index} has unknown risk tier: ${finding.riskTier}`);
    if (!allowedPatternIds.has(finding.pattern)) throw new Error(`Finding ${index} has unknown claim pattern: ${finding.pattern}`);
    byRisk[finding.riskTier] += 1;
  });
  const totalFindings = report.findings.length;

  if (report.totalFindings !== totalFindings) {
    throw new Error(`Claims report metadata totalFindings=${report.totalFindings} does not match derived total ${totalFindings}`);
  }
  for (const tier of RISK_TIERS) {
    if (report.byRisk?.[tier] !== byRisk[tier]) {
      throw new Error(`Claims report metadata byRisk.${tier}=${report.byRisk?.[tier]} does not match derived ${byRisk[tier]}`);
    }
  }
  if (totalFindings !== EXPECTED_TOTALS.totalFindings) throw new Error(`Expected 1010 findings, received ${totalFindings}`);
  for (const tier of RISK_TIERS) {
    if (byRisk[tier] !== EXPECTED_TOTALS.byRisk[tier]) throw new Error(`Expected ${tier}=${EXPECTED_TOTALS.byRisk[tier]}, received ${byRisk[tier]}`);
  }
  if (report.totalFiles !== EXPECTED_TOTALS.totalFiles) throw new Error(`Expected 535 scanned files, received ${report.totalFiles}`);
  return { totalFindings, byRisk, totalFiles: report.totalFiles };
}

export async function createBaselineRows({ rootDir, findings, scannerSource }) {
  if (!Array.isArray(findings)) throw new Error("findings must be an array");
  const scannerConfigHash = sha256(scannerSource);
  const parser = unified().use(remarkParse).use(remarkGfm);
  const fileCache = new Map();
  const rows = [];

  for (const [findingIndex, finding] of findings.entries()) {
    if (!finding || typeof finding !== "object" || Array.isArray(finding)) throw new Error(`Finding ${findingIndex} must be an object`);
    if (typeof finding.claimText !== "string" || !finding.claimText) throw new Error(`Finding ${findingIndex} must have claimText`);
    const resolved = await resolveRepositoryPath(rootDir, finding.file);
    const file = resolved.repositoryPath;
    let cached = fileCache.get(file);
    if (!cached) {
      const sourceBytes = await fs.readFile(resolved.absolutePath);
      const rawSource = sourceBytes.toString("utf8");
      const { content } = matter(rawSource);
      cached = {
        sourceFileHash: sha256(sourceBytes),
        content,
        lines: splitLinesWithOffsets(content),
        tree: parser.parse(content),
      };
      fileCache.set(file, cached);
    }

    const located = locateFinding({ content: cached.content, tree: cached.tree, lines: cached.lines, finding });
    if (normalizeClaimText(located.originalText) === normalizeClaimText(finding.claimText)) {
      throw new Error(`Refusing baseline row for ${file}:${finding.line}: originalText is only the matched token`);
    }
    const row = {
      file,
      patternId: String(finding.pattern),
      riskTier: finding.riskTier,
      originalText: located.originalText,
      normalizedTextHash: sha256(normalizeClaimText(located.originalText)),
      baselineLocator: located.baselineLocator,
      baselineContextHash: sha256(contextForTopLevelNode(cached.content, cached.tree, located.topLevelIndex)),
      sourceFileHash: cached.sourceFileHash,
      scannerConfigHash,
      line: finding.line,
      column: finding.column,
    };
    rows.push(row);
  }

  const locatorGroups = new Map();
  for (const row of rows) {
    const key = `${row.file}\n${row.baselineLocator}\n${row.patternId}`;
    const group = locatorGroups.get(key) ?? [];
    group.push(row);
    locatorGroups.set(key, group);
  }
  for (const group of locatorGroups.values()) {
    if (group.length < 2) continue;
    group.sort((left, right) => left.line - right.line || left.column - right.column);
    group.forEach((row, occurrence) => {
      row.baselineLocator = `${row.baselineLocator}.occurrence[${occurrence}]`;
    });
  }
  for (const row of rows) {
    row.baselineId = createBaselineId({
      file: row.file,
      baselineLocator: row.baselineLocator,
      patternId: row.patternId,
      sourceFileHash: row.sourceFileHash,
      claimText: row.originalText,
    });
  }

  rows.sort((left, right) =>
    left.file.localeCompare(right.file) ||
    left.baselineLocator.localeCompare(right.baselineLocator) ||
    left.patternId.localeCompare(right.patternId),
  );
  const ids = new Set(rows.map((row) => row.baselineId));
  if (ids.size !== rows.length) throw new Error(`Baseline identity collision: ${rows.length - ids.size} duplicate ID(s)`);
  return rows;
}

function toCsvRow(values) {
  return values.map((value) => {
    const text = value === undefined || value === null ? "" : String(value);
    return /[",\r\n]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
  }).join(",");
}

function rowsToCsv(rows) {
  const fields = [
    "baselineId", "file", "patternId", "riskTier", "originalText", "normalizedTextHash",
    "baselineLocator", "baselineContextHash", "sourceFileHash", "scannerConfigHash", "line", "column",
  ];
  return [toCsvRow(fields), ...rows.map((row) => toCsvRow(fields.map((field) => row[field])))].join("\n") + "\n";
}

async function pathExists(absolutePath) {
  try {
    await fs.lstat(absolutePath);
    return true;
  } catch (error) {
    if (error.code === "ENOENT") return false;
    throw error;
  }
}

async function preflightImmutableOutputs(rootDir, paths) {
  const resolved = [];
  for (const outputPath of paths) {
    const item = await ensureRepositoryOutputPath(rootDir, outputPath);
    if (await pathExists(item.absolutePath)) throw new Error(`Refusing to overwrite existing immutable output: ${item.repositoryPath}`);
    resolved.push(item);
  }
  return resolved;
}

async function removeCreatedFile(record, fileSystem = fs) {
  try {
    const stat = await fileSystem.lstat(record.absolutePath);
    if (stat.dev === record.stat.dev && stat.ino === record.stat.ino) await fileSystem.unlink(record.absolutePath);
  } catch (error) {
    if (error.code !== "ENOENT") throw error;
  }
}

async function cleanupTemporaryFile(record, fileSystem) {
  if (record.handle) {
    try {
      await record.handle.close();
    } catch (error) {
      if (error.code !== "ERR_INVALID_STATE" && error.code !== "EBADF") throw error;
    } finally {
      record.handle = null;
    }
  }
  try {
    await fileSystem.unlink(record.temporaryPath);
  } catch (error) {
    if (error.code !== "ENOENT") throw error;
  }
}

export async function publishImmutableFiles({ rootDir, files, beforePublish, fileSystem = fs }) {
  if (!Array.isArray(files) || files.length === 0) throw new Error("At least one immutable output is required");
  const normalized = [];
  const seen = new Set();
  for (const [index, file] of files.entries()) {
    if (!file || typeof file !== "object" || Array.isArray(file) || !(typeof file.data === "string" || Buffer.isBuffer(file.data))) {
      throw new Error(`Immutable output ${index} must provide a path and string or Buffer data`);
    }
    const resolved = await ensureRepositoryOutputPath(rootDir, file.path);
    if (seen.has(resolved.repositoryPath)) throw new Error(`Duplicate immutable output path: ${resolved.repositoryPath}`);
    seen.add(resolved.repositoryPath);
    normalized.push({ ...resolved, data: file.data });
  }
  await preflightImmutableOutputs(rootDir, normalized.map((item) => item.repositoryPath));

  const prepared = [];
  const created = [];
  const temporaryFiles = [];
  try {
    for (const item of normalized) {
      const temporaryPath = path.join(path.dirname(item.absolutePath), `.${path.basename(item.absolutePath)}.${process.pid}.${randomUUID()}.tmp`);
      const handle = await fileSystem.open(temporaryPath, "wx", 0o600);
      const temporaryFile = { temporaryPath, handle };
      temporaryFiles.push(temporaryFile);
      try {
        await handle.writeFile(item.data);
        await handle.sync();
      } finally {
        await handle.close();
        temporaryFile.handle = null;
      }
      prepared.push({ ...item, temporaryPath, stat: await fileSystem.lstat(temporaryPath) });
    }

    for (const [index, item] of prepared.entries()) {
      await beforePublish?.({ index, path: item.repositoryPath, absolutePath: item.absolutePath });
      await ensureRepositoryOutputPath(rootDir, item.repositoryPath);
      try {
        await fileSystem.link(item.temporaryPath, item.absolutePath);
      } catch (error) {
        if (error.code === "EEXIST") throw new Error(`Refusing to overwrite existing immutable output: ${item.repositoryPath}`);
        throw error;
      }
      created.push({ absolutePath: item.absolutePath, stat: item.stat });
      await fileSystem.unlink(item.temporaryPath);
    }
  } catch (error) {
    for (const record of created.reverse()) await removeCreatedFile(record, fileSystem);
    throw error;
  } finally {
    for (const record of temporaryFiles) await cleanupTemporaryFile(record, fileSystem);
  }
}

async function currentHead(rootDir) {
  const { stdout } = await execFileAsync("git", ["rev-parse", "--verify", "HEAD"], { cwd: rootDir, encoding: "utf8", windowsHide: true });
  return stdout.trim();
}

async function countMdxFiles(directoryPath) {
  let total = 0;
  const entries = await fs.readdir(directoryPath, { withFileTypes: true });
  for (const entry of entries) {
    const absolutePath = path.join(directoryPath, entry.name);
    if (entry.isSymbolicLink()) throw new Error(`Content tree contains a symbolic link or junction: ${absolutePath}`);
    if (entry.isDirectory()) total += await countMdxFiles(absolutePath);
    else if (entry.isFile() && entry.name.endsWith(".mdx")) total += 1;
  }
  return total;
}

export async function freezeClaimsBaseline({ rootDir, inputPath, jsonPath, csvPath, copyBase, copyManifestPath, scannerPath, beforePublish }) {
  for (const candidate of [inputPath, jsonPath, csvPath, copyManifestPath, scannerPath]) {
    await resolveRepositoryPath(rootDir, candidate, { allowMissing: true });
  }
  await preflightImmutableOutputs(rootDir, [jsonPath, csvPath, copyManifestPath]);
  if (!/^(?:[a-f0-9]{40}|[a-f0-9]{64})$/.test(copyBase)) throw new Error("--copy-base must be a full Git object ID");
  const head = await currentHead(rootDir);
  if (copyBase !== head) throw new Error(`--copy-base must equal current repository HEAD ${head}`);

  const [input, scanner, contentDirectory] = await Promise.all([
    resolveRepositoryPath(rootDir, inputPath),
    resolveRepositoryPath(rootDir, scannerPath),
    resolveRepositoryPath(rootDir, "content"),
  ]);
  const [reportText, scannerSource, scannedFiles] = await Promise.all([
    fs.readFile(input.absolutePath, "utf8"),
    fs.readFile(scanner.absolutePath, "utf8"),
    countMdxFiles(contentDirectory.absolutePath),
  ]);
  let report;
  try {
    report = JSON.parse(reportText);
  } catch (error) {
    throw new Error(`Claims report is not valid JSON: ${error.message}`);
  }
  const allowedPatternIds = extractScannerPatternIds(scannerSource);
  const totals = assertBaselineTotals(report, allowedPatternIds);
  if (scannedFiles !== totals.totalFiles) {
    throw new Error(`Claims report metadata totalFiles=${totals.totalFiles} does not match ${scannedFiles} MDX files on disk`);
  }
  const rows = await createBaselineRows({ rootDir, findings: report.findings, scannerSource });
  if (rows.length !== totals.totalFindings) throw new Error(`Expected ${totals.totalFindings} baseline rows, received ${rows.length}`);

  const jsonText = JSON.stringify(rows, null, 2) + "\n";
  const csvText = rowsToCsv(rows);
  const jsonOutput = await resolveRepositoryPath(rootDir, jsonPath, { allowMissing: true });
  const csvOutput = await resolveRepositoryPath(rootDir, csvPath, { allowMissing: true });
  const manifest = {
    schemaVersion: 1,
    frozenBaseSha: copyBase,
    baseline: {
      json: { path: jsonOutput.repositoryPath, sha256: sha256(jsonText) },
      csv: { path: csvOutput.repositoryPath, sha256: sha256(csvText) },
      rows: totals.totalFindings,
      byRisk: totals.byRisk,
      scannedFiles: totals.totalFiles,
      scannerConfigHash: rows[0]?.scannerConfigHash ?? sha256(scannerSource),
    },
  };
  await publishImmutableFiles({
    rootDir,
    files: [
      { path: jsonPath, data: jsonText },
      { path: csvPath, data: csvText },
      { path: copyManifestPath, data: JSON.stringify(manifest, null, 2) + "\n" },
    ],
    beforePublish,
  });
  return { rows, manifest, totals };
}

function parseArgs(argv) {
  const options = {};
  for (let index = 0; index < argv.length; index += 1) {
    const key = argv[index];
    if (!key.startsWith("--") || index + 1 >= argv.length) throw new Error(`Invalid argument: ${key}`);
    options[key.slice(2)] = argv[index + 1];
    index += 1;
  }
  for (const key of ["input", "json", "csv", "copy-base", "copy-manifest"]) {
    if (!options[key]) throw new Error(`Missing required --${key}`);
  }
  return options;
}

async function main() {
  const rootDir = process.cwd();
  const options = parseArgs(process.argv.slice(2));
  const result = await freezeClaimsBaseline({
    rootDir,
    inputPath: options.input,
    jsonPath: options.json,
    csvPath: options.csv,
    copyBase: options["copy-base"],
    copyManifestPath: options["copy-manifest"],
    scannerPath: "scripts/audit-claims.mjs",
  });
  console.log(`baseline frozen: ${result.totals.totalFindings} (HIGH=${result.totals.byRisk.HIGH} MED=${result.totals.byRisk.MED} LOW=${result.totals.byRisk.LOW})`);
}

if (process.argv[1] && pathToFileURL(path.resolve(process.argv[1])).href === import.meta.url) {
  main().catch((error) => {
    console.error(error.message);
    process.exitCode = 1;
  });
}
