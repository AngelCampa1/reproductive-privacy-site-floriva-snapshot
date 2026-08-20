#!/usr/bin/env node

import { createHash } from "node:crypto";
import { existsSync, lstatSync, readFileSync, realpathSync, rmSync, writeFileSync } from "node:fs";
import { mkdtemp } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import {
  parseBackupKey,
  deriveTrustedRestoreAnchors,
  restoreAndValidateBackup,
  validateBackupReceipt,
  validateTrustedRestoreAnchors,
  WranglerR2ObjectStore,
} from "./backup-private-seo-evidence.mjs";

const HASH_PATTERN = /^[a-f0-9]{64}$/;
const ISO_PATTERN = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d+)?Z$/;
const WINDOWS_DEVICE_PATTERN = /^(?:con|prn|aux|nul|conin\$|conout\$|clock\$|com(?:[1-9¹²³])|lpt(?:[1-9¹²³]))(?:\..*)?$/i;

export const requiredGscKeys = [
  "property",
  "searchType",
  "startDate",
  "endDate",
  "timezone",
  "countryFilter",
  "deviceFilter",
  "dimensions",
  "partialDayPolicy",
  "dataState",
  "sort",
  "rows",
];

const FIXED_QUERIES = [
  "private period tracker",
  "best private period tracker",
  "period tracker that doesn't sell data",
  "safe period tracker after Roe v. Wade",
  "school device period tracking privacy",
];

function lineIndent(line) {
  return line.match(/^\s*/)?.[0].length ?? 0;
}

function indentedScope(lines, startIndex) {
  const parentIndent = lineIndent(lines[startIndex] ?? "");
  let endIndex = lines.length;
  for (let index = startIndex + 1; index < lines.length; index += 1) {
    if (lines[index].trim() && lineIndent(lines[index]) <= parentIndent) {
      endIndex = index;
      break;
    }
  }
  return lines.slice(startIndex, endIndex);
}

function uniqueHttpsUrls(lines) {
  const urls = [];
  for (const line of lines) {
    const match = line.match(/^\s*- \/url: (https:\/\/\S+)\s*$/);
    if (!match || urls.includes(match[1])) continue;
    urls.push(match[1]);
  }
  return urls;
}

function containsNonHttpsUrl(lines) {
  return lines.some((line) => /^\s*- \/url:\s+\S+\s*$/.test(line) && !/^\s*- \/url: https:\/\/\S+\s*$/.test(line));
}

function directListControls(lines, listIndex) {
  const listScope = indentedScope(lines, listIndex);
  const itemIndent = lineIndent(lines[listIndex]) + 2;
  const itemIndexes = listScope
    .map((line, index) => (/- listitem(?:\s|$)/.test(line) && lineIndent(line) === itemIndent ? listIndex + index : -1))
    .filter((index) => index >= 0);
  const controls = itemIndexes.map((index) => {
    const scope = indentedScope(lines, index);
    const urls = uniqueHttpsUrls(scope);
    return { urls, hasNonHttpsUrl: containsNonHttpsUrl(scope) };
  });
  return { controls, citedUrls: controls.flatMap((control) => control.urls) };
}

export function parseRound3GoogleDomSnapshot(text, options = {}) {
  const lines = String(text).split(/\r?\n/);
  const query = options.query;
  const mode = options.mode;
  const errors = [];
  if (!query || !["drawer-dialog", "aio-carousel"].includes(mode)) errors.push("round-3 DOM parser requires an exact query and surface mode");
  if (!lines.some((line) => line.includes(`combobox "Search"`) && line.includes(`: ${query} ${query}`))) errors.push("exact query is missing from the search control");
  const signInIndex = lines.findIndex((line) => /- link "Sign in"/.test(line));
  if (signInIndex < 0 || !indentedScope(lines, signInIndex).some((line) => /https:\/\/accounts\.google\.com\/ServiceLogin/.test(line) && /hl%3Den%26gl%3Dus%26pws%3D0/.test(line))) errors.push("logged-out gl=us request evidence is missing");
  const aioIndex = lines.findIndex((line) => /- heading "AI Overview"/.test(line));
  if (aioIndex < 0) errors.push("AI Overview heading bound is missing");
  if (!lines.some((line) => /- button "Unknown - Can't determine location"/.test(line))) errors.push("visibly unknown location evidence is missing");

  let citedUrls = [];
  let controlCounts = null;
  if (mode === "drawer-dialog") {
    const headingIndent = lineIndent(lines[aioIndex] ?? "");
    const showMoreIndexes = lines
      .map((line, index) => (index > aioIndex && /- button "Show more AI Overview"/.test(line) ? index : -1))
      .filter((index) => index >= 0);
    const showMoreIndex = showMoreIndexes[0] ?? -1;
    if (showMoreIndexes.length !== 1 || lineIndent(lines[showMoreIndex] ?? "") >= headingIndent) errors.push("unique AI Overview terminal bound is missing");
    const dialogs = lines
      .map((line, index) => (index > aioIndex && index < showMoreIndex && /- dialog(?:\s|$)/.test(line) && lineIndent(line) === headingIndent ? index : -1))
      .filter((index) => index >= 0);
    if (dialogs.length !== 1) errors.push("exactly one source drawer dialog bound is required");
    else {
      const dialogScope = indentedScope(lines, dialogs[0]);
      if (!dialogScope.some((line) => /- button "Close"/.test(line))) errors.push("source drawer Close control is missing");
      const lists = dialogScope
        .map((line, index) => (/- list(?:\s|$)/.test(line) ? dialogs[0] + index : -1))
        .filter((index) => index >= 0)
        .map((index) => directListControls(lines, index))
        .filter((candidate) => candidate.controls.length > 0);
      if (lists.length !== 1) errors.push("source drawer requires exactly one direct-control list");
      else {
        const [list] = lists;
        if (list.controls.some((control) => control.hasNonHttpsUrl)) errors.push("source drawer contains a non-HTTPS URL control");
        if (list.controls.some((control) => control.urls.length > 1)) errors.push("source drawer control contains multiple URLs");
        citedUrls = [...new Set(list.citedUrls)];
        controlCounts = {
          total: list.controls.length,
          urlBearing: list.controls.filter((control) => control.urls.length === 1).length,
          urlLess: list.controls.filter((control) => control.urls.length === 0).length,
        };
      }
    }
  } else if (aioIndex >= 0) {
    const askIndex = lines.findIndex((line, index) => index > aioIndex && /- textbox "Ask anything"/.test(line));
    if (askIndex < 0) errors.push("AI Overview Ask-anything terminal bound is missing");
    else {
      const corroboration = lines.slice(aioIndex, askIndex).map((line) => line.match(/button "View (\d+) corroboration links"/)).filter(Boolean);
      const expectedControls = corroboration.length === 1 ? Number(corroboration[0][1]) + 1 : null;
      if (!Number.isSafeInteger(expectedControls)) errors.push("unique AIO corroboration-count bound is missing");
      const candidates = [];
      for (let index = aioIndex + 1; index < askIndex; index += 1) {
        if (!/- list(?:\s|$)/.test(lines[index])) continue;
        const candidate = directListControls(lines, index);
        if (
          candidate.controls.length > 0 &&
          candidate.controls.every((control) => !control.hasNonHttpsUrl && control.urls.length === 1)
        ) candidates.push(candidate);
      }
      const maxUnique = Math.max(0, ...candidates.map((candidate) => new Set(candidate.citedUrls).size));
      const winners = candidates.filter((candidate) => new Set(candidate.citedUrls).size === maxUnique && candidate.controls.length === expectedControls);
      if (maxUnique === 0 || winners.length !== 1) errors.push("a unique corroboration-bound maximum-coverage AIO source list is required");
      else {
        citedUrls = [...new Set(winners[0].citedUrls)];
        controlCounts = { total: winners[0].controls.length, urlBearing: winners[0].controls.length, urlLess: 0 };
      }
    }
  }
  if (citedUrls.length === 0) errors.push("source URL list is empty");
  if (Array.isArray(options.expectedCitedUrls) && canonicalJson(citedUrls) !== canonicalJson(options.expectedCitedUrls)) errors.push("DOM-derived source URLs do not match the expected evidence row");
  return { valid: errors.length === 0, errors, citedUrls, controlCounts };
}
const EXACT_GSC_EXPORT = {
  property: "sc-domain:floriva.app",
  searchType: "web",
  startDate: "2026-06-24",
  endDate: "2026-07-21",
  timezone: "America/Chicago",
  countryFilter: "all",
  deviceFilter: "all",
  dimensions: ["date", "query", "page", "country", "device"],
  partialDayPolicy: "exclude-current-partial-day",
  dataState: "final",
  sort: "impressions-desc",
};

function sha256(value) {
  return createHash("sha256").update(value).digest("hex");
}

function result(errors) {
  return { valid: errors.length === 0, errors };
}

function hashMatches(filePath, expectedHash) {
  return existsSync(filePath) && !lstatSync(filePath).isSymbolicLink() && HASH_PATTERN.test(expectedHash ?? "") && sha256(readFileSync(filePath)) === expectedHash;
}

function canonicalJson(value) {
  if (Array.isArray(value)) return `[${value.map(canonicalJson).join(",")}]`;
  if (value && typeof value === "object") return `{${Object.keys(value).sort().map((key) => `${JSON.stringify(key)}:${canonicalJson(value[key])}`).join(",")}}`;
  return JSON.stringify(value);
}

export function validatePortableEvidencePath(value) {
  if (typeof value !== "string" || !value || value.includes("\0") || /^[a-z]:/i.test(value) || value.startsWith("/") || value.startsWith("\\\\") || value.startsWith("//")) throw new Error(`unsafe evidence path: ${value}`);
  const replaced = value.replaceAll("\\", "/");
  const normalized = path.posix.normalize(replaced);
  if (normalized !== replaced || normalized === ".." || normalized.startsWith("../")) throw new Error(`unsafe evidence path: ${value}`);
  for (const segment of normalized.split("/")) {
    if (!segment || segment.includes(":") || /[ .]$/.test(segment) || WINDOWS_DEVICE_PATTERN.test(segment)) throw new Error(`non-portable evidence path: ${value}`);
  }
  return normalized;
}

function resolveWithin(root, relative, label = "evidence path") {
  const portable = validatePortableEvidencePath(relative);
  const rootPath = assertNoFollowExistingAncestors(root, `${label} root`);
  const resolved = path.resolve(rootPath, ...portable.split("/"));
  if (!resolved.toLowerCase().startsWith(`${rootPath}${path.sep}`.toLowerCase())) throw new Error(`${label} escapes its allowed root`);
  if (!existsSync(rootPath) || lstatSync(rootPath).isSymbolicLink()) throw new Error(`${label} root is missing or reparse-backed`);
  const rootReal = realpathSync.native(rootPath);
  let cursor = rootPath;
  for (const segment of portable.split("/")) {
    cursor = path.join(cursor, segment);
    if (!existsSync(cursor)) throw new Error(`${label} component is missing: ${portable}`);
    if (lstatSync(cursor).isSymbolicLink()) throw new Error(`${label} symlink/junction/reparse component is forbidden: ${portable}`);
    const real = realpathSync.native(cursor);
    if (real !== rootReal && !real.toLowerCase().startsWith(`${rootReal}${path.sep}`.toLowerCase())) throw new Error(`${label} reparse traversal is forbidden: ${portable}`);
  }
  return resolved;
}

export function assertNoFollowExistingAncestors(targetPath, label = "path") {
  const absolute = path.resolve(targetPath);
  const parsed = path.parse(absolute);
  let cursor = parsed.root;
  for (const segment of absolute.slice(parsed.root.length).split(path.sep).filter(Boolean)) {
    cursor = path.join(cursor, segment);
    if (!existsSync(cursor)) break;
    const metadata = lstatSync(cursor);
    if (metadata.isSymbolicLink()) throw new Error(`${label} ancestor is a symlink/junction/reparse point: ${cursor}`);
    if (path.resolve(realpathSync.native(cursor)).toLowerCase() !== path.resolve(cursor).toLowerCase()) throw new Error(`${label} ancestor resolves through a reparse point: ${cursor}`);
  }
  return absolute;
}

export function validateGsc(value) {
  const errors = [];
  for (const key of requiredGscKeys) {
    if (value?.[key] === undefined || value?.[key] === null || value?.[key] === "") errors.push(`${key} is required`);
  }
  for (const [key, expected] of Object.entries(EXACT_GSC_EXPORT)) {
    if (value?.[key] !== undefined && canonicalJson(value[key]) !== canonicalJson(expected)) errors.push(`${key} does not match the exact GSC contract`);
  }
  if (value?.rows !== undefined && !Array.isArray(value.rows)) errors.push("rows must be an array");
  return result(errors);
}

export function validatePublishedGscReconciliation(document, pageSidecar, sentinelSidecar, rawAggregate) {
  const errors = [];
  const [page, sentinel] = document?.records ?? [];
  const sharedRequest = { ...EXACT_GSC_EXPORT, searchType: "WEB" };
  const exactPage = { ...sharedRequest, startRow: 0, rowLimit: 50 };
  const exactSentinel = { ...sharedRequest, startRow: 50, rowLimit: 50 };
  if (canonicalJson(page?.requestParameters) !== canonicalJson(exactPage) || canonicalJson(pageSidecar?.request) !== canonicalJson(exactPage)) errors.push("GSC first-page request contract drift");
  if (canonicalJson(sentinel?.requestParameters) !== canonicalJson(exactSentinel) || canonicalJson(sentinelSidecar?.request) !== canonicalJson(exactSentinel)) errors.push("GSC sentinel request contract drift");
  const published = document?.export?.rows?.[0];
  const sidecarAggregate = pageSidecar?.redactedSummary;
  for (const key of ["rowCount", "clicks", "impressions", "ctrPercent", "weightedAveragePosition"]) {
    if (published?.[key] !== sidecarAggregate?.[key] || (rawAggregate && published?.[key] !== rawAggregate?.[key])) errors.push(`GSC published ${key} does not reconcile bidirectionally`);
  }
  if (sentinelSidecar?.redactedSummary?.startRow !== 50 || sentinelSidecar?.redactedSummary?.returnedRowCount !== 0 || sentinelSidecar?.redactedSummary?.noMoreRows !== true) errors.push("GSC sentinel aggregate drift");
  return result(errors);
}

export function validateAnswerLimitationReconciliation(raw, rows, sidecarsByProvider) {
  const errors = [];
  for (const provider of ["ChatGPT Search", "Perplexity"]) {
    const rawProvider = raw?.providers?.find((item) => item.provider === provider);
    const tracked = rows.filter((record) => record.provider === provider);
    const sidecar = sidecarsByProvider?.[provider];
    if (!rawProvider || canonicalJson(rawProvider.queries) !== canonicalJson(FIXED_QUERIES)) errors.push(`${provider} raw limitation query contract drift`);
    if (canonicalJson(tracked.map((record) => record.query)) !== canonicalJson(FIXED_QUERIES) || tracked.some((record) => record.observationStatus !== rawProvider?.status || record.limitationReason !== rawProvider?.reasonCode || record.locale !== raw?.locale || record.country !== raw?.country || record.authenticationState !== raw?.authenticationState)) errors.push(`${provider} tracked limitation authentication/request-state drift`);
    if (!sidecar || sidecar.locale !== raw?.locale || sidecar.country !== raw?.country || sidecar.authenticationState !== raw?.authenticationState || sidecar.redactedSummary?.provider !== provider || sidecar.redactedSummary?.status !== rawProvider?.status || sidecar.redactedSummary?.reasonCode !== rawProvider?.reasonCode || sidecar.redactedSummary?.queryCount !== FIXED_QUERIES.length) errors.push(`${provider} sidecar limitation authentication/request-state drift`);
  }
  return result(errors);
}

function validateMetadataRecord(value, prefix = "record") {
  const errors = [];
  for (const key of ["provider", "providerVersion", "retrievalMethod", "capturedAt", "rawEvidenceId", "sidecars"]) {
    if (value?.[key] === undefined || value?.[key] === null || value?.[key] === "") errors.push(`${prefix}.${key} is required`);
  }
  if (!ISO_PATTERN.test(value?.capturedAt ?? "")) errors.push(`${prefix}.capturedAt must be UTC ISO-8601`);
  if (!/^raw-[a-z0-9-]+$/i.test(value?.rawEvidenceId ?? "")) errors.push(`${prefix}.rawEvidenceId is invalid`);
  if (!Array.isArray(value?.sidecars) || value.sidecars.length === 0) errors.push(`${prefix}.sidecars must not be empty`);
  return errors;
}

export function validateAnswerRows(rows, options = {}) {
  const errors = [];
  if (!Array.isArray(rows) || rows.length === 0) return result(["answer rows are required"]);
  rows.forEach((row, index) => {
    errors.push(...validateMetadataRecord(row, `rows[${index}]`));
    for (const key of ["query", "locale", "country", "authenticationState"]) {
      if (row?.[key] === undefined || row?.[key] === null || row?.[key] === "") errors.push(`rows[${index}].${key} is required`);
    }
    if (row.locale !== "en-US" || row.country !== "US") errors.push(`rows[${index}] must declare en-US/US`);
    if (row.observationStatus === "not-observed") {
      if (row.florivaCited !== null) errors.push(`rows[${index}].florivaCited must be null when not observed`);
      if (!row.limitationReason) errors.push(`rows[${index}].limitationReason is required when not observed`);
    } else if (typeof row.florivaCited !== "boolean") errors.push(`rows[${index}].florivaCited must be boolean`);
    if (row.provider === "Google AI Overviews" && row.observationStatus === "observed") {
      if (row.aiOverviewPresent !== true || row.visualReview?.approved !== true || !row.visualReview?.reviewerId || row.visualReview?.reviewerRole !== "independent-non-implementing-visual-adversary") errors.push(`rows[${index}] observed Google AI Overview requires named independent visual approval`);
      if (!Array.isArray(row.citedUrls) || row.citedUrls.length === 0 || row.citedUrls.some((url) => {
        try { return new URL(url).protocol !== "https:"; } catch { return true; }
      })) errors.push(`rows[${index}] observed Google AI Overview requires explicit HTTPS citedUrls`);
      if (row.citationCoverage !== "complete-expanded-source-controls" || row.hiddenCitationsReviewed !== true || row.florivaCited !== false) errors.push(`rows[${index}] must bind the complete expanded Google source controls before concluding citation absence`);
      const contextChildren = (row.redactedVisualChildren ?? []).filter((child) => child.role === "query-session-context" || child.role === "full-page-context");
      if (contextChildren.length !== 1) errors.push(`rows[${index}] requires exactly one tracked query/session context screenshot child`);
      const sourceReview = row.sourceVisualReview;
      const completeSourceSet = sourceReview?.status === "complete" && sourceReview?.approved === true && sourceReview?.continuousCoverage === true;
      const honestLimitation = sourceReview?.status === "incomplete-recapture-required" && sourceReview?.approved === false && sourceReview?.requiresRecapture === true;
      if (sourceReview?.reviewerRole !== "independent-non-implementing-visual-adversary" || (!completeSourceSet && !honestLimitation)) errors.push(`rows[${index}] requires an independent complete or recapture-required source-set disposition`);
      const round3Evidence = typeof row.rawEvidenceId === "string" && row.rawEvidenceId.startsWith("raw-aio-round3-");
      if (round3Evidence && (
        sourceReview?.reviewerId !== "security_review_ai_task1_final" ||
        sourceReview?.reviewerName !== "Codex Independent Visual Adversary" ||
        sourceReview?.reviewerRole !== "independent-non-implementing-visual-adversary" ||
        sourceReview?.nonImplementing !== true
      )) errors.push(`rows[${index}] requires the named independent round-3 source-set reviewer`);
      if (row.requestGeoEvidence !== "gl=us-request-parameter-only" || row.observedLocation !== "unknown" || row.locationEvidence !== "not-visually-established") errors.push(`rows[${index}] must distinguish the gl=us request from the visibly unknown location`);
      if (!Array.isArray(row.redactedVisualChildren) || row.redactedVisualChildren.length === 0) errors.push(`rows[${index}] requires tracked redacted screenshot children`);
      for (const [childIndex, child] of (row.redactedVisualChildren ?? []).entries()) {
        let childPath = null;
        try { childPath = resolveWithin(options.root ?? process.cwd(), child.path ?? "", "Google visual child"); } catch (error) { errors.push(`rows[${index}].redactedVisualChildren[${childIndex}] ${error.message}`); }
        if (!child.role || child.mediaType !== "image/png" || !childPath || !hashMatches(childPath, child.sha256)) errors.push(`rows[${index}].redactedVisualChildren[${childIndex}] must be a hash-bound tracked PNG`);
      }
      if (row.query === "period tracker that doesn't sell data") {
        const roles = new Set((row.redactedVisualChildren ?? []).map((child) => child.role));
        if (!roles.has("full-page-context") || !roles.has("expanded-overview-detail")) errors.push(`rows[${index}] requires the reviewed context and detail pair`);
      }
    }
  });
  if (options.requireFixedSet) {
    const providers = ["Google AI Overviews", "ChatGPT Search", "Perplexity"];
    const expected = new Set(providers.flatMap((provider) => FIXED_QUERIES.map((query) => `${provider}\0${query}`)));
    const actual = new Set(rows.map((row) => `${row.provider}\0${row.query}`));
    if (rows.length !== expected.size || actual.size !== expected.size || [...expected].some((key) => !actual.has(key))) errors.push("answer rows must contain the exact 3-provider by 5-query fixed set without duplicates");
  }
  return result(errors);
}

export function validateAggregateDisposition(value, options = {}) {
  const errors = [];
  const root = options.root ?? process.cwd();
  if (!["unreproducible", "insufficiently-specified"].includes(value?.status)) {
    errors.push("aggregate status must describe an evidence limitation");
  }
  const artifact = value?.redactedRerunArtifact ?? value?.rerunArtifact;
  let artifactPath = null;
  try { artifactPath = artifact ? resolveWithin(root, artifact, "aggregate artifact") : null; } catch (error) { errors.push(error.message); }
  if (
    !value?.rawEvidenceId ||
    !HASH_PATTERN.test(value?.rawRerunSha256 ?? "") ||
    !artifactPath ||
    !hashMatches(artifactPath, value?.redactedRerunSha256) ||
    !value?.subchecks
  ) {
    errors.push("complete rerun/export evidence is required");
  }
  if (
    !value?.findingId ||
    !value?.rationale ||
    !value?.adversarialReview?.reviewerId ||
    value?.adversarialReview?.nonImplementing !== true ||
    value?.adversarialReview?.approved !== true
  ) {
    errors.push("finding-specific rationale and named non-implementing adversarial approval are required");
  }
  if (
    value?.approvalScope !== "historical-baseline-insufficiently-specified-only" ||
    canonicalJson(value?.doesNotApprove) !== canonicalJson(["score-0.69-correctness", "product-quality"]) ||
    value?.adversarialReview?.reviewerId !== "codex-independent-agentic-disposition-2026-07-22-v1" ||
    value?.adversarialReview?.reviewerName !== "Codex Independent Agentic Aggregate Adversary"
  ) errors.push("aggregate approval must use the exact baseline-only independent reviewer contract");
  return result(errors);
}

export function validateFindingDisposition(value, options = {}) {
  const errors = [];
  const root = options.root ?? process.cwd();
  if (["false-positive", "unreproducible", "insufficiently-specified"].includes(value?.status)) {
    if (!value.findingId) errors.push("findingId is required");
    if (
      !Array.isArray(value.evidence) ||
      value.evidence.length === 0 ||
      !value.evidence.every(({ path: evidencePath, sha256: expectedHash }) => {
        try { return hashMatches(resolveWithin(root, evidencePath ?? "", "finding evidence"), expectedHash); } catch { return false; }
      })
    ) {
      errors.push("existing hashed closure evidence is required");
    }
    if (!value.rationale) errors.push("finding-specific rationale is required");
    if (
      !value.adversarialReview?.reviewerId ||
      value.adversarialReview?.nonImplementing !== true ||
      value.adversarialReview?.approved !== true
    ) {
      errors.push("named non-implementing adversarial approval is required");
    }
  }
  return result(errors);
}

export async function validatePrivateRawInventory(value, options = {}) {
  const errors = [];
  if (!Array.isArray(value?.records) || value.records.length === 0) return result(["private raw inventory records are required"]);
  const seen = new Set();
  for (const [index, record] of value.records.entries()) {
    const prefix = `records[${index}]`;
    if (!record.rawEvidenceId || seen.has(record.rawEvidenceId)) errors.push(`${prefix}.rawEvidenceId must be unique`);
    seen.add(record.rawEvidenceId);
    if (!record.opaqueLocator) errors.push(`${prefix}.opaqueLocator is required`);
    if (!HASH_PATTERN.test(record.sha256 ?? "")) errors.push(`${prefix}.sha256 is required`);
    if (!Number.isSafeInteger(record.byteLength) || record.byteLength < 0) errors.push(`${prefix}.byteLength is required`);
    if (!ISO_PATTERN.test(record.verifiedAt ?? "")) errors.push(`${prefix}.verifiedAt must be UTC ISO-8601`);
    if (record.opaqueLocator && options.resolveOpaqueLocator) {
      try {
        const rawPath = await options.resolveOpaqueLocator(record.opaqueLocator, record);
        if (!rawPath || !existsSync(rawPath)) errors.push(`${prefix} raw object does not exist`);
        else {
          const bytes = readFileSync(rawPath);
          if (sha256(bytes) !== record.sha256) errors.push(`${prefix} raw object hash mismatch`);
          if (bytes.byteLength !== record.byteLength) errors.push(`${prefix} raw object length mismatch`);
        }
      } catch {
        errors.push(`${prefix} raw object could not be resolved`);
      }
    }
  }
  if (options.referencedRawEvidenceIds) {
    const referenced = new Set(options.referencedRawEvidenceIds);
    for (const id of referenced) if (!seen.has(id)) errors.push(`tracked raw evidence is missing from inventory: ${id}`);
    for (const record of value.records) {
      if (referenced.has(record.rawEvidenceId)) continue;
      const disposition = record.disposition;
      if (disposition?.status !== "superseded" || !disposition.reason || !Array.isArray(disposition.supersededBy) || disposition.supersededBy.length === 0 || disposition.supersededBy.some((id) => !referenced.has(id))) {
        errors.push(`unreferenced raw evidence requires an exact superseded disposition: ${record.rawEvidenceId}`);
      }
    }
  }
  return result(errors);
}

export function validateExternalEvidence(bundle, options = {}) {
  const errors = [];
  const root = options.root ?? process.cwd();
  if (!bundle?.redaction?.logPath || !HASH_PATTERN.test(bundle?.redaction?.logSha256 ?? "")) {
    errors.push("complete redaction metadata is required");
  } else {
    try {
      if (!hashMatches(resolveWithin(root, bundle.redaction.logPath, "redaction log"), bundle.redaction.logSha256)) errors.push("redaction log hash mismatch");
    } catch (error) { errors.push(error.message); }
  }
  if (!Array.isArray(bundle?.records) || bundle.records.length === 0) errors.push("external evidence records are required");
  for (const [index, record] of (bundle?.records ?? []).entries()) {
    errors.push(...validateMetadataRecord(record, `records[${index}]`));
    if (Object.hasOwn(record, "sha256") || Object.hasOwn(record, "selfHash")) {
      errors.push(`records[${index}] must not store its own hash`);
    }
    if (record.requestParameters === undefined) errors.push(`records[${index}].requestParameters is required`);
    for (const [sidecarIndex, sidecar] of (record.sidecars ?? []).entries()) {
      const prefix = `records[${index}].sidecars[${sidecarIndex}]`;
      if (!sidecar.path || !HASH_PATTERN.test(sidecar.sha256 ?? "") || !sidecar.mediaType) {
        errors.push(`${prefix} is incomplete`);
        continue;
      }
      try {
        if (!hashMatches(resolveWithin(root, sidecar.path, "sidecar"), sidecar.sha256)) errors.push(`${prefix} sidecar hash mismatch`);
      } catch (error) { errors.push(`${prefix} ${error.message}`); }
    }
    if (record.disposition) errors.push(...validateFindingDisposition(record.disposition, { root }).errors);
    if (record.aggregateDisposition) errors.push(...validateAggregateDisposition(record.aggregateDisposition, { root }).errors);
  }
  if (Array.isArray(bundle?.aggregates)) {
    for (const [index, aggregate] of bundle.aggregates.entries()) {
      const aggregateResult = validateAggregateDisposition(aggregate, { root });
      errors.push(...aggregateResult.errors.map((error) => `aggregates[${index}]: ${error}`));
    }
  }
  return result(errors);
}

export async function validateRawToRedactedClosure(records, inventory, options = {}) {
  const errors = [];
  const phaseRoot = options.phaseRoot;
  const byId = new Map((inventory?.records ?? []).map((record) => [record.rawEvidenceId, record]));
  for (const [index, record] of records.entries()) {
    const raw = byId.get(record.rawEvidenceId);
    if (!raw) {
      errors.push(`records[${index}] raw evidence is not inventoried`);
      continue;
    }
    if (record.rawEvidenceSha256 !== raw.sha256) errors.push(`records[${index}] raw evidence hash does not match private inventory`);
    if (!HASH_PATTERN.test(record.redactedSummarySha256 ?? "")) errors.push(`records[${index}].redactedSummarySha256 is required`);
    let foundClosure = false;
    for (const sidecar of record.sidecars ?? []) {
      if (sidecar.mediaType !== "application/json") continue;
      try {
        const sidecarPath = resolveWithin(phaseRoot, sidecar.path, "closure sidecar");
        const document = JSON.parse(readFileSync(sidecarPath, "utf8"));
        if (
          document?.provenance?.rawEvidenceId === record.rawEvidenceId &&
          document?.provenance?.rawSha256 === raw.sha256 &&
          document?.redactedSummary !== undefined &&
          sha256(canonicalJson(document.redactedSummary)) === record.redactedSummarySha256
        ) foundClosure = true;
      } catch {
        // The ordinary sidecar validator reports malformed or missing children.
      }
    }
    if (!foundClosure) errors.push(`records[${index}] has no raw-to-redacted semantic/hash closure sidecar`);
  }
  return result(errors);
}

export async function validateKnownRawSemantics(records, inventory, options = {}) {
  const errors = [];
  const byId = new Map((inventory?.records ?? []).map((record) => [record.rawEvidenceId, record]));
  const recordById = new Map(records.map((record) => [record.rawEvidenceId, record]));
  const rawBytes = async (id) => {
    const item = byId.get(id);
    if (!item) throw new Error(`missing raw inventory ${id}`);
    return readFileSync(await options.resolveOpaqueLocator(item.opaqueLocator, item));
  };
  const summary = (id) => {
    const record = recordById.get(id);
    const jsonSidecar = record?.sidecars?.find((sidecar) => sidecar.mediaType === "application/json");
    if (!jsonSidecar) throw new Error(`missing semantic sidecar ${id}`);
    return JSON.parse(readFileSync(resolveWithin(options.phaseRoot, jsonSidecar.path), "utf8"));
  };
  try {
    const text = (await rawBytes("raw-gsc-001")).toString("utf8");
    const rows = text.split(/\r?\n/).filter((line) => /^\d{4}-\d{2}-\d{2}\s+\|/.test(line)).map((line) => line.split("|").map((cell) => cell.trim()));
    if (rows.length !== 50 || rows.some((row) => row.length !== 9)) throw new Error("GSC raw export must contain exactly 50 complete rows");
    const clicks = rows.reduce((sum, row) => sum + Number(row[5]), 0);
    const impressions = rows.reduce((sum, row) => sum + Number(row[6]), 0);
    const weightedAveragePosition = impressions ? rows.reduce((sum, row) => sum + Number(row[8]) * Number(row[6]), 0) / impressions : 0;
    const s = summary("raw-gsc-001").redactedSummary;
    if (s.rowCount !== rows.length || s.clicks !== clicks || s.impressions !== impressions || Math.abs(s.ctrPercent - (impressions ? (clicks / impressions) * 100 : 0)) > 1e-6 || Math.abs(s.weightedAveragePosition - weightedAveragePosition) > 1e-6) throw new Error("GSC redacted summary does not reconcile to raw rows");
    const page2 = (await rawBytes("raw-gsc-page-2-001")).toString("utf8");
    if (!/No search analytics data found/.test(page2) || summary("raw-gsc-page-2-001").redactedSummary.noMoreRows !== true) throw new Error("GSC page-2 sentinel does not close the export");
  } catch (error) { errors.push(error.message); }
  try {
    const limitation = JSON.parse((await rawBytes("raw-answer-access-001")).toString("utf8"));
    const sidecarsByProvider = {};
    for (const provider of ["ChatGPT Search", "Perplexity"]) {
      const rawProvider = limitation.providers?.find((item) => item.provider === provider);
      const tracked = records.filter((record) => record.provider === provider);
      if (!rawProvider || canonicalJson(rawProvider.queries) !== canonicalJson(FIXED_QUERIES)) throw new Error(`${provider} raw limitation must bind the exact five queries in order`);
      if (canonicalJson(tracked.map((record) => record.query)) !== canonicalJson(FIXED_QUERIES) || tracked.some((record) => record.observationStatus !== rawProvider.status || record.limitationReason !== rawProvider.reasonCode || record.locale !== limitation.locale || record.country !== limitation.country || record.authenticationState !== limitation.authenticationState)) throw new Error(`${provider} tracked limitation authentication/request/status fields do not semantically match raw evidence`);
      const providerSidecarPath = tracked[0]?.sidecars?.find((item) => item.mediaType === "application/json")?.path;
      const sidecar = providerSidecarPath ? JSON.parse(readFileSync(resolveWithin(options.phaseRoot, providerSidecarPath), "utf8")) : null;
      sidecarsByProvider[provider] = sidecar;
      if (!sidecar || sidecar.locale !== limitation.locale || sidecar.country !== limitation.country || sidecar.authenticationState !== limitation.authenticationState || sidecar.redactedSummary?.provider !== provider || sidecar.redactedSummary?.status !== rawProvider.status || sidecar.redactedSummary?.reasonCode !== rawProvider.reasonCode || sidecar.redactedSummary?.queryCount !== FIXED_QUERIES.length) throw new Error(`${provider} limitation sidecar authentication/request state does not match raw evidence`);
    }
    const limitationValidation = validateAnswerLimitationReconciliation(limitation, records, sidecarsByProvider);
    if (!limitationValidation.valid) throw new Error(limitationValidation.errors.join("; "));
  } catch (error) { errors.push(error.message); }
  try {
    const crawl = JSON.parse((await rawBytes("raw-crawl-001")).toString("utf8"));
    const counts = crawl.rows.reduce((all, row) => ({ ...all, [row.status]: (all[row.status] ?? 0) + 1 }), {});
    const s = summary("raw-crawl-001").redactedSummary;
    if (crawl.rows.length !== s.completed || crawl.requested !== s.requested || canonicalJson(counts) !== canonicalJson(s.statusCounts) || crawl.rows.filter((row) => row.status !== 200).length !== s.brokenUrlCount) throw new Error("crawl redacted summary does not reconcile to raw rows");
  } catch (error) { errors.push(error.message); }
  try {
    const agentic = JSON.parse((await rawBytes("raw-agentic-001")).toString("utf8"));
    const counts = agentic.rows.reduce((all, row) => ({ ...all, [row.status]: (all[row.status] ?? 0) + 1 }), {});
    const s = summary("raw-agentic-001").redactedSummary;
    if (agentic.rows.length !== s.probeCount || canonicalJson(counts) !== canonicalJson(s.statusCounts)) throw new Error("agentic redacted summary does not reconcile to raw rows");
  } catch (error) { errors.push(error.message); }
  try {
    const citationEvidence = JSON.parse((await rawBytes("raw-aio-citations-001")).toString("utf8"));
    const citationByQuery = new Map(citationEvidence.records.map((record) => [record.query, record]));
    for (const [index, query] of FIXED_QUERIES.entries()) {
      const tracked = records.find((record) => record.provider === "Google AI Overviews" && record.query === query);
      if (tracked?.rawEvidenceId?.startsWith("raw-aio-round3-")) {
        const round3Dom = {
          "private period tracker": { rawEvidenceId: "raw-aio-round3-private-dom", mode: "drawer-dialog" },
          "best private period tracker": { rawEvidenceId: "raw-aio-round3-best-dom", mode: "drawer-dialog" },
          "period tracker that doesn't sell data": { rawEvidenceId: "raw-aio-round3-doesnt-sell-dom", mode: "aio-carousel" },
          "safe period tracker after Roe v. Wade": { rawEvidenceId: "raw-aio-round3-safe-dom", mode: "drawer-dialog" },
        }[query];
        if (!round3Dom || !(tracked.supportingRawEvidenceIds ?? []).includes(round3Dom.rawEvidenceId)) throw new Error(`Google round-3 DOM evidence is not bound: ${query}`);
        const domResult = parseRound3GoogleDomSnapshot((await rawBytes(round3Dom.rawEvidenceId)).toString("utf8"), { query, mode: round3Dom.mode, expectedCitedUrls: tracked.citedUrls });
        if (!domResult.valid) throw new Error(`Google round-3 DOM snapshot is invalid: ${query}: ${domResult.errors.join("; ")}`);
        if (canonicalJson(domResult.citedUrls) !== canonicalJson(tracked.citedUrls)) throw new Error(`Google round-3 DOM cited URL semantic mismatch: ${query}`);
        const controls = tracked.sourceControls;
        const uniqueUrls = new Set(tracked.citedUrls ?? []);
        const duplicateOverage = controls?.duplicateOccurrences > 0 ? controls.duplicateOccurrences - 1 : 0;
        if (
          domResult.controlCounts?.total !== controls?.total ||
          domResult.controlCounts?.urlBearing !== controls?.urlBearing ||
          domResult.controlCounts?.urlLess !== (controls?.urlLessControls?.length ?? 0) ||
          controls?.uniqueUrls !== uniqueUrls.size ||
          controls?.urlBearing !== (tracked.citedUrls ?? []).length + duplicateOverage ||
          controls?.total !== controls?.urlBearing + (controls?.urlLessControls?.length ?? 0)
        ) throw new Error(`Google round-3 source-control counts do not reconcile: ${query}`);
        const sidecarPath = tracked.sidecars?.find((item) => item.mediaType === "application/json")?.path;
        const sidecar = sidecarPath ? JSON.parse(readFileSync(resolveWithin(options.phaseRoot, sidecarPath), "utf8")) : null;
        if (
          sidecar?.redactedSummary?.citedUrlsSha256 !== sha256(canonicalJson(tracked.citedUrls)) ||
          sidecar?.redactedSummary?.sourceControlCount !== controls.total ||
          sidecar?.redactedSummary?.urlBearingControlCount !== controls.urlBearing ||
          sidecar?.redactedSummary?.uniqueCitedUrlCount !== controls.uniqueUrls ||
          sidecar?.sourceDomEvidence?.rawEvidenceId !== round3Dom.rawEvidenceId ||
          sidecar?.sourceDomEvidence?.sha256 !== byId.get(round3Dom.rawEvidenceId)?.sha256 ||
          sidecar?.sourceDomEvidence?.parserMode !== round3Dom.mode
        ) throw new Error(`Google round-3 source-control sidecar does not reconcile: ${query}`);
        continue;
      }
      const evidence = citationByQuery.get(query);
      if (!evidence || !tracked || canonicalJson(evidence.citedUrls) !== canonicalJson(tracked.citedUrls)) throw new Error(`Google cited URL semantic mismatch: ${query}`);
      const domBytes = await rawBytes(`raw-aio-dom-00${index + 1}`);
      if (sha256(domBytes) !== evidence.domSnapshot.sha256) throw new Error(`Google DOM snapshot hash mismatch: ${query}`);
      const lines = domBytes.toString("utf8").split(/\r?\n/);
      const start = lines.findIndex((line) => /heading "AI Overview"/.test(line));
      const end = lines.findIndex((line, lineIndex) => lineIndex > start && /textbox "Ask anything"/.test(line));
      if (start < 0 || end < 0) throw new Error(`Google DOM snapshot bounds are missing: ${query}`);
      const parsed = [];
      for (const line of lines.slice(start, end + 1)) {
        const match = line.match(/^\s*- \/url: (https:\/\/\S+)\s*$/);
        if (!match) continue;
        const host = new URL(match[1]).hostname;
        if (["accounts.google.com", "support.google.com", "policies.google.com"].includes(host) || parsed.includes(match[1])) continue;
        parsed.push(match[1]);
      }
      if (canonicalJson(parsed) !== canonicalJson(evidence.citedUrls)) throw new Error(`Google cited URLs do not recompute from the bounded DOM snapshot: ${query}`);
    }
  } catch (error) { errors.push(error.message); }
  try {
    const pngSignature = Buffer.from("89504e470d0a1a0a", "hex");
    const googleRecords = records.filter((record) => record.provider === "Google AI Overviews" && record.observationStatus === "observed");
    for (const record of googleRecords) {
      const id = record.rawEvidenceId;
      const bytes = await rawBytes(id);
      const sidecar = summary(id);
      if (!bytes.subarray(0, 8).equals(pngSignature) || sidecar.visualReview?.approved !== true || sidecar.visualReview?.reviewerRole !== "independent-non-implementing-visual-adversary" || sidecar.redactedSummary?.florivaCited !== false) throw new Error(`Google AIO raw/visual closure failed: ${id}`);
    }
    const referencedGoogleImages = new Set(googleRecords.flatMap((record) => record.supportingRawEvidenceIds ?? []));
    for (const id of [...referencedGoogleImages].filter((id) => (id.startsWith("raw-aio-round3-") && !id.endsWith("-dom")) || id === "raw-aio-context-003" || id.startsWith("raw-aio-sources-") || id.startsWith("raw-aio-drawer-"))) {
      if (!(await rawBytes(id)).subarray(0, 8).equals(pngSignature)) throw new Error(`Google supporting raw PNG is invalid: ${id}`);
    }
  } catch (error) { errors.push(error.message); }
  return result(errors);
}

function parseArgs(argv) {
  const values = {};
  for (let index = 0; index < argv.length; index += 1) {
    if (!argv[index].startsWith("--")) continue;
    const key = argv[index].slice(2);
    if (argv[index + 1]?.startsWith("--") || argv[index + 1] === undefined) values[key] = true;
    else {
      values[key] = argv[index + 1];
      index += 1;
    }
  }
  return values;
}

function resolveOpaqueFile(inventoryPath, locator) {
  if (!String(locator).startsWith("file:")) throw new Error("unsupported locator");
  const value = String(locator).slice(5);
  const portable = validatePortableEvidencePath(value);
  if (!portable.startsWith("raw/")) throw new Error("private raw locator must remain under the raw directory");
  const resolved = resolveWithin(path.dirname(inventoryPath), portable, "private raw locator");
  if (!existsSync(resolved) || lstatSync(resolved).isSymbolicLink()) throw new Error("private raw locator is missing or reparse-backed");
  return resolved;
}

function flattenRecords(document, sourcePath) {
  const rows = Array.isArray(document.records) ? document.records : Array.isArray(document.rows) ? document.rows : [document];
  return rows.map((row) => ({ ...row, metadataSourcePath: sourcePath }));
}

function aggregateDispositions(document) {
  if (!document?.originalExternalAggregate) return [];
  return [document.originalExternalAggregate.aggregateDisposition ?? document.originalExternalAggregate];
}

export const TASK1_FIXED_STAGING_PATHS = Object.freeze([
  ".gitignore",
  "package.json",
  "scripts/prepare-pages-rollback.mjs",
  "scripts/prepare-pages-rollback.test.ts",
  "scripts/backup-private-seo-evidence.mjs",
  "scripts/backup-private-seo-evidence.test.ts",
  "scripts/verify-external-seo-evidence.mjs",
  "scripts/external-seo-evidence.test.ts",
  "worker/src/private-backup-r2-bridge.mjs",
  "worker/src/private-backup-r2-bridge.d.mts",
  "worker/test/private-backup-r2-bridge.test.ts",
  "worker/wrangler.r2-private-backup-bridge.toml",
  "artifacts/seo-ai-seo-recovery/2026-07-22/prechange/prior-deployment.json",
  "artifacts/seo-ai-seo-recovery/2026-07-22/prechange/private-backup-receipt.json",
  "artifacts/seo-ai-seo-recovery/2026-07-22/prechange/private-backup-supersession.json",
  "artifacts/seo-ai-seo-recovery/2026-07-22/prechange/trusted-restore-anchors.json",
]);

export function assertExactStagingManifest(actualPaths, expectedPaths) {
  const actual = actualPaths.map((entry) => validatePortableEvidencePath(entry));
  const expected = expectedPaths.map((entry) => validatePortableEvidencePath(entry));
  if (new Set(actual).size !== actual.length) throw new Error("staging manifest contains duplicate paths");
  if (new Set(expected).size !== expected.length) throw new Error("expected staging manifest contains duplicate paths");
  const actualSet = new Set(actual);
  const expectedSet = new Set(expected);
  const missing = expected.filter((entry) => !actualSet.has(entry));
  const extra = actual.filter((entry) => !expectedSet.has(entry));
  if (missing.length || extra.length) {
    throw new Error(`staging manifest is not exact; missing=[${missing.join(",")}]; extra=[${extra.join(",")}]`);
  }
  if (canonicalJson(actual) !== canonicalJson([...actual].sort())) throw new Error("staging manifest must be sorted");
  return actual;
}

function boundedStagingPaths(repoRoot, phaseRoot, stagingOutput, sidecarPaths) {
  const phaseRelative = path.relative(repoRoot, phaseRoot).replaceAll("\\", "/");
  const external = [
    "gsc-baseline.json",
    "broken-page-crawl.json",
    "agentic-browsing.json",
    "answer-engine-observations.json",
    "redaction-log.json",
  ].map((name) => path.posix.join(phaseRelative, name));
  const outputRelative = path.relative(repoRoot, stagingOutput).replaceAll("\\", "/");
  const candidates = [...TASK1_FIXED_STAGING_PATHS, ...external, ...sidecarPaths, outputRelative];
  const normalized = [...new Set(candidates.map((entry) => validatePortableEvidencePath(entry)))].sort();
  const allowedPrefixes = ["scripts/", "worker/", "artifacts/seo-ai-seo-recovery/2026-07-22/"];
  for (const entry of normalized) {
    if (![".gitignore", "package.json"].includes(entry) && !allowedPrefixes.some((prefix) => entry.startsWith(prefix))) throw new Error(`staging path is outside Task 1 scope: ${entry}`);
    const absolute = resolveWithin(repoRoot, entry, "staging path");
    if (absolute !== path.resolve(stagingOutput) && (!existsSync(absolute) || lstatSync(absolute).isSymbolicLink())) throw new Error(`staging path is missing or reparse-backed: ${entry}`);
  }
  return normalized;
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  for (const required of ["phase", "root", "private-inventory", "backup-receipt", "write-staging-paths"]) {
    if (!args[required]) throw new Error(`--${required} is required`);
  }
  const repoRoot = process.cwd();
  assertNoFollowExistingAncestors(repoRoot, "repository root");
  const expectedExternalRoot = path.join(repoRoot, "artifacts", "seo-ai-seo-recovery", "2026-07-22", "external");
  if (args.phase !== "prechange" || path.resolve(args.root) !== expectedExternalRoot) throw new Error("validator is bounded to the 2026-07-22 prechange evidence root");
  const phaseRoot = resolveWithin(expectedExternalRoot, "prechange", "prechange evidence root");
  const metadataNames = [
    "gsc-baseline.json",
    "broken-page-crawl.json",
    "agentic-browsing.json",
    "answer-engine-observations.json",
  ];
  const records = [];
  const aggregates = [];
  const sidecarStagingPaths = [];
  for (const name of metadataNames) {
    const metadataPath = resolveWithin(phaseRoot, name, "metadata path");
    if (!existsSync(metadataPath)) throw new Error(`${name} is missing`);
    const document = JSON.parse(readFileSync(metadataPath, "utf8"));
    records.push(...flattenRecords(document, name));
    aggregates.push(...aggregateDispositions(document));
    if (name === "gsc-baseline.json") {
      const gscValidation = validateGsc(document.export ?? document);
      if (!gscValidation.valid) throw new Error(`GSC validation failed: ${gscValidation.errors.join("; ")}`);
      const [page, sentinel] = document.records ?? [];
      const sharedRequest = { ...EXACT_GSC_EXPORT, searchType: "WEB" };
      const exactPage = { ...sharedRequest, startRow: 0, rowLimit: 50 };
      const exactSentinel = { ...sharedRequest, startRow: 50, rowLimit: 50 };
      if (document.records?.length !== 2 || canonicalJson(page?.requestParameters) !== canonicalJson(exactPage) || canonicalJson(sentinel?.requestParameters) !== canonicalJson(exactSentinel)) throw new Error("GSC request records do not match the exact paginated export contract");
      const pageSidecar = JSON.parse(readFileSync(resolveWithin(phaseRoot, page.sidecars[0].path, "GSC page sidecar"), "utf8"));
      const sentinelSidecar = JSON.parse(readFileSync(resolveWithin(phaseRoot, sentinel.sidecars[0].path, "GSC sentinel sidecar"), "utf8"));
      const gscReconciliation = validatePublishedGscReconciliation(document, pageSidecar, sentinelSidecar);
      if (!gscReconciliation.valid) throw new Error(gscReconciliation.errors.join("; "));
    }
    if (name === "answer-engine-observations.json") {
      const answerValidation = validateAnswerRows(document.rows ?? document.records, { requireFixedSet: true, root: phaseRoot });
      if (!answerValidation.valid) throw new Error(`answer observation validation failed: ${answerValidation.errors.join("; ")}`);
    }
  }
  const redactionPath = resolveWithin(phaseRoot, "redaction-log.json", "redaction log");
  if (!existsSync(redactionPath)) throw new Error("redaction-log.json is missing");
  const bundle = {
    phase: args.phase,
    records,
    aggregates,
    redaction: { logPath: "redaction-log.json", logSha256: sha256(readFileSync(redactionPath)) },
  };
  const externalValidation = validateExternalEvidence(bundle, { root: phaseRoot });
  if (!externalValidation.valid) throw new Error(`external evidence validation failed: ${externalValidation.errors.join("; ")}`);

  const inventoryPath = path.resolve(args["private-inventory"]);
  const expectedInventory = path.join(repoRoot, ".floriva-private", "seo-ai-seo-recovery", "2026-07-22", "raw-evidence-inventory.json");
  if (inventoryPath !== expectedInventory) throw new Error("private inventory path is outside the bounded Task 1 root");
  assertNoFollowExistingAncestors(inventoryPath, "private inventory");
  const inventory = JSON.parse(readFileSync(inventoryPath, "utf8"));
  const referencedRawEvidenceIds = new Set([
    ...records.flatMap((record) => [record.rawEvidenceId, ...(record.supportingRawEvidenceIds ?? [])]),
    ...aggregates.map((aggregate) => aggregate.rawEvidenceId),
  ]);
  const inventoryValidation = await validatePrivateRawInventory(inventory, {
    resolveOpaqueLocator: async (locator) => resolveOpaqueFile(inventoryPath, locator),
    referencedRawEvidenceIds,
  });
  if (!inventoryValidation.valid) throw new Error(`private inventory validation failed: ${inventoryValidation.errors.join("; ")}`);
  const closureValidation = await validateRawToRedactedClosure(records, inventory, { phaseRoot });
  if (!closureValidation.valid) throw new Error(`raw-to-redacted closure failed: ${closureValidation.errors.join("; ")}`);
  const semanticValidation = await validateKnownRawSemantics(records, inventory, {
    phaseRoot,
    resolveOpaqueLocator: async (locator) => resolveOpaqueFile(inventoryPath, locator),
  });
  if (!semanticValidation.valid) throw new Error(`raw semantic reconciliation failed: ${semanticValidation.errors.join("; ")}`);
  const inventoryById = new Map(inventory.records.map((record) => [record.rawEvidenceId, record]));
  for (const [index, aggregate] of aggregates.entries()) {
    const raw = inventoryById.get(aggregate.rawEvidenceId);
    if (!raw || raw.sha256 !== aggregate.rawRerunSha256) throw new Error(`aggregate ${index} raw rerun hash is not closed by the private inventory`);
  }
  for (const record of records) for (const sidecar of record.sidecars ?? []) {
    resolveWithin(phaseRoot, sidecar.path, "sidecar staging path");
    sidecarStagingPaths.push(path.relative(process.cwd(), resolveWithin(phaseRoot, sidecar.path)).replaceAll("\\", "/"));
  }
  for (const record of records) for (const child of record.redactedVisualChildren ?? []) {
    sidecarStagingPaths.push(path.relative(process.cwd(), resolveWithin(phaseRoot, child.path, "visual child staging path")).replaceAll("\\", "/"));
  }

  const receiptPath = path.resolve(args["backup-receipt"]);
  const expectedReceipt = path.join(repoRoot, "artifacts", "seo-ai-seo-recovery", "2026-07-22", "prechange", "private-backup-receipt.json");
  if (receiptPath !== expectedReceipt) throw new Error("backup receipt path is outside the bounded Task 1 root");
  assertNoFollowExistingAncestors(receiptPath, "backup receipt");
  const trustedAnchorsPath = path.join(repoRoot, "artifacts", "seo-ai-seo-recovery", "2026-07-22", "prechange", "trusted-restore-anchors.json");
  const trustedRestoreAnchors = JSON.parse(readFileSync(resolveWithin(repoRoot, path.relative(repoRoot, trustedAnchorsPath).replaceAll("\\", "/"), "trusted restore anchors"), "utf8"));
  const anchorValidation = validateTrustedRestoreAnchors(trustedRestoreAnchors);
  if (!anchorValidation.valid) throw new Error(`reviewed local restore anchors are invalid: ${anchorValidation.errors.join("; ")}`);
  const rollbackDirectory = path.join(repoRoot, ".floriva-private", "seo-ai-seo-recovery", "2026-07-22", trustedRestoreAnchors.rollbackDirectory);
  const recomputedAnchors = await deriveTrustedRestoreAnchors({
    rollbackDirectory,
    rawInventoryPath: inventoryPath,
    priorBindingPath: path.join(repoRoot, "artifacts", "seo-ai-seo-recovery", "2026-07-22", "prechange", "prior-deployment.json"),
    resolveRawObject: async (locator) => resolveOpaqueFile(inventoryPath, locator),
  });
  if (canonicalJson(recomputedAnchors) !== canonicalJson(Object.fromEntries(Object.entries(trustedRestoreAnchors).filter(([key]) => key !== "rollbackDirectory")))) throw new Error("reviewed local restore anchors drifted from canonical local inputs");
  const stagingOutput = path.resolve(args["write-staging-paths"]);
  if (stagingOutput !== path.join(phaseRoot, "staging-paths.txt")) throw new Error("staging manifest must be the phase staging-paths.txt");
  assertNoFollowExistingAncestors(path.dirname(stagingOutput), "staging manifest parent");
  const normalizedPaths = boundedStagingPaths(repoRoot, phaseRoot, stagingOutput, sidecarStagingPaths);
  // This is a bounded candidate manifest, not release approval. Writing it here
  // makes the locally reviewed set auditable even while the durable receipt gate
  // intentionally remains closed.
  writeFileSync(stagingOutput, `${normalizedPaths.join("\n")}\n`, { flag: "w" });
  assertExactStagingManifest(readFileSync(stagingOutput, "utf8").trim().split(/\r?\n/), normalizedPaths);
  const receipt = JSON.parse(readFileSync(receiptPath, "utf8"));
  const receiptValidation = validateBackupReceipt(receipt, { requireCleanRestore: Boolean(args["require-clean-restore"]) });
  if (!receiptValidation.valid) throw new Error(`durable backup receipt is invalid: ${receiptValidation.errors.join("; ")}`);
  if (sha256(readFileSync(inventoryPath)) !== receipt.trustedBindings.rawInventorySha256) throw new Error("tracked private inventory is not bound by the durable receipt");
  const priorBindingPath = path.join(repoRoot, "artifacts", "seo-ai-seo-recovery", "2026-07-22", "prechange", "prior-deployment.json");
  if (sha256(readFileSync(priorBindingPath)) !== receipt.trustedBindings.priorBindingSha256) throw new Error("tracked prior deployment binding is not bound by the durable receipt");
  const supersessionPath = path.join(repoRoot, "artifacts", "seo-ai-seo-recovery", "2026-07-22", "prechange", "private-backup-supersession.json");
  const supersession = JSON.parse(readFileSync(assertNoFollowExistingAncestors(supersessionPath, "backup supersession journal"), "utf8"));
  if (supersession.previousObjectPreservation?.preserved !== true || supersession.previousObjectPreservation?.deletionAuthorized !== false || supersession.previousReceipt?.objectId !== supersession.previousObjectPreservation?.objectId) throw new Error("prior immutable R2 receipt/object preservation record is invalid");
  if (receipt.supersedes.previousReceiptSha256 !== supersession.previousReceiptSha256 || receipt.supersedes.previousObjectId !== supersession.previousObjectPreservation.objectId || receipt.supersedes.previousObjectPreserved !== true) throw new Error("replacement receipt is not atomically bound to the preserved old receipt/object");
  if (args["require-clean-restore"]) {
    const bucket = process.env.FLORIVA_PRIVATE_BACKUP_BUCKET;
    const keyId = process.env.FLORIVA_PRIVATE_BACKUP_KEY_ID;
    const keyValue = process.env.FLORIVA_PRIVATE_BACKUP_KEY;
    if (bucket !== receipt.bucket || keyId !== receipt.keyId || !keyValue) throw new Error("configured backup bucket/key ID/key do not match the receipt");
    const objectStore = new WranglerR2ObjectStore(bucket);
    await objectStore.verifyBucket();
    const parent = await mkdtemp(path.join(os.tmpdir(), "floriva-independent-restore-"));
    const restoreRoot = path.join(parent, "restored");
    try {
      const restored = await restoreAndValidateBackup({ objectStore, objectId: receipt.objectId, key: parseBackupKey(keyValue), receipt, restoreRoot, trustedRestoreAnchors });
      if (restored.archiveSha256 !== receipt.cleanRestore.archiveSha256) throw new Error("independent clean restore archive hash drift");
    } finally {
      rmSync(parent, { recursive: true, force: true });
    }
  }

  process.stdout.write(`${JSON.stringify({ valid: true, records: records.length, rawRecords: inventory.records.length, stagingPaths: normalizedPaths.length })}\n`);
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  main().catch((error) => {
    process.stderr.write(`${error.message}\n`);
    process.exitCode = 1;
  });
}
