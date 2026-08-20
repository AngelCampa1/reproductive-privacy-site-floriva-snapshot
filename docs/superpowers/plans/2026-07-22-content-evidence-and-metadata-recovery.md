# Content Evidence and Metadata Recovery Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Reconcile Floriva's immutable 1,010-row unsupported-claim baseline, render unambiguous claim-to-source citations, separate four cannibalizing pages, enforce unique public SEO titles, and publish an honest editorial methodology with auditable copy-review proof.

**Architecture:** Keep MDX as the public-content source of truth, add a deterministic claim identity and ledger layer beside it, and make the content generator reject metadata or citation states that cannot be safely published. Body claims use same-page source anchors, structured frontmatter uses field-path citation mappings, and every remediation batch owns disjoint content and ledger files before one orchestrator regenerates shared outputs.

**Tech Stack:** Node.js ESM, TypeScript 6, React 19, React Markdown, Zod 4, Vitest 3, MDX/gray-matter, PowerShell, Superpowers subagent-driven development.

## Global Constraints

- The indexable HTML page inventory remains exactly 559; do not add, remove, redirect, consolidate, or change the canonical of any HTML page.
- The publishing freeze remains in force: strengthen existing pages and do not add a new programmatic content cluster.
- Preserve every `relatedPages` array and every collection-specific payload: state metadata and laws, listicle tools, and pricing tiers, hidden costs, and table data.
- Continue normalizing mixed-shape `answers` at load time; do not hand-normalize the corpus.
- Every high- and medium-risk claim must render an unambiguous inline citation marker or source identifier mapped to a visible source-list item.
- Every one of the 1,010 July 22 baseline rows must end as `sourced`, `qualified`, `removed`, `duplicate`, or `false-positive`; the final scanner must report zero unresolved live findings.
- A reachable URL proves availability only. A separate adversarial evidence review must approve semantic claim support.
- Prefer current official statutes, government material, regulators, courts, public-health bodies, professional clinical guidance, primary research, and official vendor pages according to the approved risk policy.
- Do not invent a person, credential, reviewer, review claim, source, metric, price, date, profile, product capability, or search outcome.
- Keep Organization as the truthful author. Leave `sameAs` empty unless a profile is independently verified and authorized.
- All changed public copy is blocked until it passes `humanizer`, then `third-grade-copy`, then no-lies and whole-page-context review, with that order recorded.
- Do not edit `<shared-skill-source-repo>`; use it only as the approved source for synchronizing the global `third-grade-copy` skill.
- Use one implementation agent at a time in the shared `master` checkout. Do not regenerate shared files during the content batches; regenerate once after all disjoint MDX and ledger batches are integrated. Read-only adversarial reviews may run in parallel after a batch diff is complete.
- Work directly on `master`. Implementer and reviewer agents must never run `git add`, `git commit`, `git checkout`, or create a branch/worktree. After every reviewed task, the orchestrator validates the task's machine-readable batch manifest, stages only the exact paths listed there, and creates the checkpoint commit.
- Freeze the public-copy diff base SHA once before the first public-copy edit. Every copy-review run and final changed-path comparison must use that immutable SHA, never a moving branch name such as `origin/master`.
- All button-styled controls remain pills, motion respects `prefers-reduced-motion`, and medical/legal content stays informational.
- Each task uses a fresh implementer and separate adversarial spec-compliance and quality/evidence reviewers. The orchestrator independently inspects every diff and reruns each authoritative gate.

---

## File Structure

### New files

- `scripts/lib/claim-identity.mjs` — canonical claim normalization and stable baseline IDs.
- `scripts/lib/claim-ledger.mjs` — ledger schemas, loaders, and cross-file reconciliation helpers.
- `scripts/freeze-claims-baseline.mjs` — one-way conversion of the July 22 scanner output into an immutable committed baseline.
- `scripts/verify-claim-remediation.mjs` — blocking baseline, ledger, live-scan, citation, and copy-proof gate.
- `scripts/build-approved-fact-evidence.mjs` — generates the ledger-backed fact/evidence contract consumed by AI public-knowledge generation.
- `scripts/verify-copy-review.mjs` — verifies ordered copy-review evidence for every changed public-copy file.
- `scripts/verify-claim-review-coverage.mjs` — proves per-task/per-partition review manifests cover every frozen row and required stage exactly once.
- `scripts/verify-copy-skill-session.mjs` — verifies fresh-agent dispatch, agent-authored skill-use reports, deterministic gates, and independent reviewer verdicts.
- `scripts/run-content-evidence-gates.mjs` — runs the fixed Task 15 command suite and records exit codes plus stdout/stderr hashes.
- `scripts/generate-content-remediation-manifest.mjs` — derives the final proof manifest from verified repository artifacts.
- `scripts/verify-content-remediation-manifest.mjs` — independently recomputes and validates the final proof manifest.
- `scripts/claim-remediation.test.ts` — stable-ID, scanner, ledger, and reconciliation tests.
- `scripts/content-metadata.test.ts` — explicit-title, truncation, normalization, and collision tests.
- `scripts/copy-review.test.ts` — ordered copy-review proof tests.
- `scripts/write-content-batch-manifest.mjs` — validates task ownership, hashes exact changed paths, and writes the only staging allowlist the orchestrator may use.
- `scripts/verify-content-intent.mjs` — all-route title uniqueness plus collision-page intent and similarity proof.
- `scripts/content-intent.test.ts` — four-route intent-contract and similarity regression tests.
- `src/components/source-citations.tsx` — reusable visible citation markers for structured fields.
- `src/components/source-citations.test.tsx` — citation marker accessibility and mapping tests.
- `docs/seo-400/recovery-2026-07-22/claims-baseline.json` — immutable 1,010-row baseline plus scanner/config hashes.
- `docs/seo-400/recovery-2026-07-22/claims-baseline.csv` — human-readable immutable baseline.
- `docs/seo-400/recovery-2026-07-22/claim-ledger/manifest.json` — expected baseline totals and ledger partitions.
- `docs/seo-400/recovery-2026-07-22/claim-ledger/*.json` — one ledger partition per content collection.
- `docs/seo-400/recovery-2026-07-22/source-snapshots/<collection>/manifest.json` — canonical locator, checked date, authority class, content hash, and immutable snapshot path for evidence used by that collection's ledger rows.
- `docs/seo-400/recovery-2026-07-22/source-snapshots/<collection>/<sha256>.*` — immutable fetched source bytes or a deterministic metadata/quoted-support record where redistribution is not allowed.
- `docs/seo-400/recovery-2026-07-22/copy-review-ledger/manifest.json` — expected copy-review files and schema version.
- `docs/seo-400/recovery-2026-07-22/copy-review-ledger/<collection>/<slug>.json` — one ordered skill/truth/context proof record per changed public-copy file, enabling disjoint agent ownership.
- `docs/seo-400/recovery-2026-07-22/claim-review-manifests/<collection>/task-<N>.json` — exact owned baseline IDs and four required review stages for one batch's slice of a partition.
- `artifacts/seo-ai-seo-recovery/2026-07-22/claim-reviews/<collection>/<baselineId>/<stage>.json` — immutable per-row review evidence for `disposition`, `text-and-render`, `source-or-removal`, and `independent-approval`.
- `artifacts/seo-ai-seo-recovery/2026-07-22/copy-review/<collection>/<slug>/<stage>.json` — immutable input/output/tool/reviewer evidence for each copy-review stage.
- `artifacts/seo-ai-seo-recovery/2026-07-22/copy-skill-dispatches/<agentId>.json` — orchestrator-authored canonical agent/task/path assignment.
- `artifacts/seo-ai-seo-recovery/2026-07-22/copy-skill-agent-reports/<agentId>.json` — agent-authored catalog visibility, skill reads/hashes, decisions, and input/output chain report.
- `artifacts/seo-ai-seo-recovery/2026-07-22/copy-skill-review-verdicts/<agentId>.json` — distinct reviewer verification of dispatch, report, files, skill hashes, and deterministic gates.
- `artifacts/seo-ai-seo-recovery/2026-07-22/final-content-reviews/*.json` — durable named full-scope reviewer verdicts.
- `artifacts/seo-ai-seo-recovery/2026-07-22/content-batches/task-<N>.json` — exact path/hash staging allowlist written after the task diff is reviewed.
- `artifacts/seo-ai-seo-recovery/2026-07-22/content-remediation-manifest.json` — final batch/reviewer proof index.

### Modified source and tests

- `scripts/audit-claims.mjs:1-207` — deterministic library-backed scanner with body and structured-field coverage.
- `scripts/build-content-data.mjs:20-380` — explicit `seoTitle`, `claimCitations`, collision rejection, and generated types.
- `scripts/generated-surfaces.test.ts:339-374` — final-title uniqueness and generated-surface assertions.
- `scripts/verify-sources.mjs:1-235` — deterministic machine report option used by the remediation proof.
- `src/site/content.ts:35-120` — `ClaimCitation`, source, and structured content types.
- `src/components/article-body.tsx:10-42` — same-document `#source-*` behavior.
- `src/components/article-body.test.tsx:1-86` — citation-anchor behavior.
- `src/components/sources.tsx:1-60` — stable source anchors and methodology link.
- `src/pages/content-page.tsx:162-463` — field-path citation rendering.
- `src/pages/content-page.test.tsx:1-480` — structured citations and source linkage.
- `src/site/knowledge/index.ts:56-65,417-635` — anchored editorial-methodology copy on `/support`.
- `src/pages/static-pages.tsx:49-72` — stable IDs for methodology sections.
- `src/site/structured-data.ts:79-98` — truthful `publishingPrinciples` URL.
- `src/site/structured-data.test.ts:1-110` — Organization author and publishing-principles assertions.
- `package.json:6-48` — `verify:claims` and `verify:copy-review` commands.
- The four collision MDX files assigned only to Task 7 and all remaining claim-bearing MDX files assigned in Tasks 8-14.

### Generated files changed only in Task 15

- `src/site/generated/content-data.ts`
- `src/site/generated/content-index.ts`
- `src/site/content-manifest.ts`
- `src/site/generated/bodies/*.ts`
- `public/sitemap.xml`
- `public/llms.txt`
- `src/site/generated/approved-public-fact-evidence.json`

---

### Task 1: Freeze the Immutable July 22 Claim Baseline

**Files:**
- Create: `scripts/lib/claim-identity.mjs`
- Create: `scripts/freeze-claims-baseline.mjs`
- Create: `scripts/write-content-batch-manifest.mjs`
- Create: `scripts/claim-remediation.test.ts`
- Create: `docs/seo-400/recovery-2026-07-22/claims-baseline.json`
- Create: `docs/seo-400/recovery-2026-07-22/claims-baseline.csv`
- Create: `docs/seo-400/recovery-2026-07-22/copy-review-ledger/manifest.json` with the pre-edit `HEAD` as immutable `frozenBaseSha`.
- Modify: `package.json:17-20`

**Interfaces:**
- Consumes: current `scripts/audit-claims.mjs` output with exactly 1,010 findings.
- Produces: `normalizeClaimText(value: string): string`, `createBaselineId(finding: BaselineClaimIdentity): string`, and immutable baseline rows keyed by a frozen baseline ID that never depends on a post-edit location.

- [ ] **Step 1: Write failing stable-ID and baseline-count tests**

```ts
import { describe, expect, it } from "vitest";
import { createBaselineId, normalizeClaimText } from "./lib/claim-identity.mjs";

describe("claim identity", () => {
  it("uses the full frozen claim, AST/field locator, and original source hash for baseline identity", () => {
    expect(normalizeClaimText("  FTC   Action ")).toBe("ftc action");
    const sourceFileHash = "a".repeat(64);
    const first = createBaselineId({ file: "content/guides/a.mdx", baselineLocator: "body:root.children[0].sentence[0]", patternId: "ftc", sourceFileHash, claimText: "The FTC acted in 2021." });
    const repeated = createBaselineId({ file: "content/guides/a.mdx", baselineLocator: "body:root.children[0].sentence[0]", patternId: "ftc", sourceFileHash, claimText: "the  ftc acted in 2021." });
    const otherSentence = createBaselineId({ file: "content/guides/a.mdx", baselineLocator: "body:root.children[1].sentence[0]", patternId: "ftc", sourceFileHash, claimText: "The FTC acted in 2021." });
    const otherFrozenFile = createBaselineId({ file: "content/guides/a.mdx", baselineLocator: "body:root.children[0].sentence[0]", patternId: "ftc", sourceFileHash: "b".repeat(64), claimText: "The FTC acted in 2021." });
    expect(first).toBe(repeated);
    expect(first).not.toBe(otherSentence);
    expect(first).not.toBe(otherFrozenFile);
  });

  it("keeps patternId in identity so all 1,010 frozen rule findings remain distinct", () => {
    const identity = { file: "content/guides/a.mdx", baselineLocator: "body:root.children[0].sentence[0]", sourceFileHash: "a".repeat(64), claimText: "The FTC acted in 2021." };
    expect(createBaselineId({ ...identity, patternId: "ftc" })).not.toBe(createBaselineId({ ...identity, patternId: "year" }));
  });
});
```

- [ ] **Step 2: Run the test and verify the helper is absent**

Run: `pnpm vitest run scripts/claim-remediation.test.ts`

Expected: FAIL because `scripts/lib/claim-identity.mjs` does not exist.

- [ ] **Step 3: Implement canonical identity and a write-once freezer**

```js
// scripts/lib/claim-identity.mjs
import { createHash } from "node:crypto";

export function normalizeClaimText(value) {
  return String(value).normalize("NFKC").trim().replace(/\s+/g, " ").toLowerCase();
}

export function createBaselineId({ file, baselineLocator, patternId, sourceFileHash, claimText }) {
  if (!/^[a-f0-9]{64}$/.test(sourceFileHash)) throw new Error("sourceFileHash must be a SHA-256");
  const identity = [file.replace(/\\/g, "/"), baselineLocator, patternId, sourceFileHash, normalizeClaimText(claimText)].join("\n");
  return `claim-${createHash("sha256").update(identity).digest("hex").slice(0, 20)}`;
}
```

`freeze-claims-baseline.mjs` must refuse to overwrite an existing baseline and must re-read each MDX source to expand the scanner's regex token into the complete containing sentence or structured-field value. It rejects rows whose `originalText` is only the matched token. Every immutable JSON row contains `baselineId`, `file`, `patternId`, `riskTier`, `originalText`, `normalizedTextHash`, `baselineLocator`, `baselineContextHash`, `sourceFileHash`, and `scannerConfigHash`. `baselineLocator` is an AST sentence path such as `body:root.children[3].sentence[1]` or an exact field path such as `frontmatter.faqs[0].a`; line/column may be diagnostic metadata but is not the locator contract. `baselineContextHash` hashes the containing heading plus preceding/current/following block, `sourceFileHash` hashes the complete original frozen MDX bytes, and `scannerConfigHash` hashes the scanner implementation plus ordered rule configuration. `createBaselineId` includes both `sourceFileHash` and `patternId`: the July 22 contract freezes 1,010 scanner-rule findings, so two rules hitting the same proposition remain separately reconcilable rows rather than silently reducing the immutable total. The ledger later records a separate mutable `postEditLocator`; edits never rewrite a baseline ID or baseline locator. Sort by file/baselineLocator/patternId and assert these exact totals before writing: total 1,010; HIGH 641; MED 98; LOW 271; files 535.

`write-content-batch-manifest.mjs` reads `git status --porcelain=v1 -z`, expands each comma-separated `--allow` entry as either one exact file or one directory prefix, and supports comma-separated exact path/prefix exclusions through `--deny`. It rejects every changed path outside the allowlist or inside a denylist, rejects an empty diff, and writes sorted `{ path, sha256 }` entries plus task number and current `HEAD`. It never stages or commits. Unit-test rejection of out-of-scope, denied, missing, and hash-mismatched paths before using it for Task 1.

- [ ] **Step 4: Generate and verify the immutable artifacts**

Run:

```powershell
pnpm audit:claims
$baseSha = git rev-parse HEAD
node scripts/freeze-claims-baseline.mjs `
  --input scripts/claims-audit-report.json `
  --json docs/seo-400/recovery-2026-07-22/claims-baseline.json `
  --csv docs/seo-400/recovery-2026-07-22/claims-baseline.csv `
  --copy-base $baseSha `
  --copy-manifest docs/seo-400/recovery-2026-07-22/copy-review-ledger/manifest.json
pnpm vitest run scripts/claim-remediation.test.ts
```

Expected: the freezer prints `baseline frozen: 1010 (HIGH=641 MED=98 LOW=271)` and the test passes.

- [ ] **Step 5: Hand the exact baseline diff to the orchestrator for a checkpoint**

```powershell
node scripts/write-content-batch-manifest.mjs --task 1 --allow scripts/lib/claim-identity.mjs,scripts/freeze-claims-baseline.mjs,scripts/write-content-batch-manifest.mjs,scripts/claim-remediation.test.ts,package.json,docs/seo-400/recovery-2026-07-22/claims-baseline.json,docs/seo-400/recovery-2026-07-22/claims-baseline.csv,docs/seo-400/recovery-2026-07-22/copy-review-ledger/manifest.json --out artifacts/seo-ai-seo-recovery/2026-07-22/content-batches/task-1.json
$batch = Get-Content -Raw artifacts/seo-ai-seo-recovery/2026-07-22/content-batches/task-1.json | ConvertFrom-Json
git add -- @($batch.paths.path) artifacts/seo-ai-seo-recovery/2026-07-22/content-batches/task-1.json
git commit -m "test(seo): freeze unsupported claim baseline"
```

The implementer stops before these commands. The orchestrator verifies every listed SHA-256 against the working tree and runs the exact staging/commit commands.

### Task 2: Build the Risk Policy, Live Scanner, and Partitioned Ledger

**Files:**
- Create: `scripts/lib/claim-ledger.mjs`
- Create: `scripts/verify-claim-remediation.mjs`
- Create: `scripts/verify-claim-review-coverage.mjs`
- Create: `docs/seo-400/recovery-2026-07-22/claim-ledger/manifest.json`
- Create: fifteen collection ledger JSON files under `docs/seo-400/recovery-2026-07-22/claim-ledger/`
- Create: source-snapshot schema fixtures under `docs/seo-400/recovery-2026-07-22/source-snapshots/fixtures/`; later content tasks own disjoint collection directories.
- Modify: `scripts/audit-claims.mjs:1-207`
- Modify: `scripts/verify-sources.mjs:1-235`
- Extend: `scripts/claim-remediation.test.ts`
- Modify: `package.json:17-20`

**Interfaces:**
- Consumes: immutable `ClaimBaselineRow[]` from Task 1 and MDX parsed by `gray-matter`.
- Produces: `scanContent(options): Promise<ClaimFinding[]>`, `loadLedger(rootDir): Promise<LedgerRow[]>`, and the disposition union `sourced | qualified | removed | duplicate | false-positive`.

- [ ] **Step 1: Add failing scanner, identity, citation-decoy, duplicate-graph, and ledger-total tests**

```ts
import { expect, it } from "vitest";
import { reconcileBaseline, scanSource, validateDuplicateGraph } from "./lib/claim-ledger.mjs";

const fixtureMdx = `---
title: "Test"
description: "FTC action affected 3 states"
publishedAt: "2026-07-22"
updatedAt: "2026-07-22"
buyerStage: "tofu"
faqs:
  - q: "What happened?"
    a: "The FTC acted in 2021"
answers:
  - q: "How many?"
    a: "3 states"
tools:
  - name: "Example"
    pricing: "$12"
tableData:
  rows:
    - ["Example", "$12"]
---
# FTC action in 2021

The FTC acted in 2021 and affected 3 states. [Unrelated source](#source-decoy)

| Vendor | Price |
| --- | --- |
| Example | $12 |

The rule applies in 4 states.
`;

it("emits each claim candidate independently of citation presence", async () => {
  const findings = await scanSource("content/symptom-guides/test.mdx", fixtureMdx);
  expect(findings.map((item) => item.baselineLocator)).toEqual(expect.arrayContaining([
    "body:root.children[0].sentence[0]",
    "body:root.children[1].sentence[0]",
    "body:root.children[1].sentence[1]",
    "body:root.children[2].table.rows[1].cells[1]",
    "body:root.children[3].sentence[0]",
    "frontmatter.description",
    "frontmatter.faqs[0].a",
    "frontmatter.answers[0].a",
    "frontmatter.tools[0].pricing",
    "frontmatter.tableData.rows[0][1]",
  ]));
  expect(findings.filter((item) => item.baselineLocator === "body:root.children[1].sentence[0]")).toHaveLength(1);
  expect(findings.find((item) => item.baselineLocator === "body:root.children[1].sentence[0]")?.claimText)
    .toBe("The FTC acted in 2021");
  expect(findings.some((item) => item.claimText.includes("Unrelated source"))).toBe(false);
});

it("requires exactly one ledger row for every frozen baseline ID", async () => {
  const baselineRows = [{ baselineId: "claim-aaaaaaaaaaaaaaaaaaaa" }];
  const ledgerRows = [{ baselineId: "claim-aaaaaaaaaaaaaaaaaaaa" }];
  const result = reconcileBaseline(baselineRows, ledgerRows);
  expect(result.missingIds).toEqual([]);
  expect(result.duplicateIds).toEqual([]);
  expect(result.total).toBe(1);
});

it("rejects missing, unapproved, non-equivalent, self, and cyclic duplicate parents", () => {
  expect(() => validateDuplicateGraph([
    { baselineId: "claim-aaaaaaaaaaaaaaaaaaaa", disposition: "duplicate", parentId: "claim-bbbbbbbbbbbbbbbbbbbb", duplicateEquivalenceHash: "eq-1", reviewerStatus: "approved" },
    { baselineId: "claim-bbbbbbbbbbbbbbbbbbbb", disposition: "duplicate", parentId: "claim-aaaaaaaaaaaaaaaaaaaa", duplicateEquivalenceHash: "eq-1", reviewerStatus: "approved" },
  ])).toThrow(/cycle/);
});
```

Add separate assertions for a claim with no citation, a claim followed by a decoy citation, two candidate rules in one sentence, a candidate in a heading, a candidate in a Markdown table cell, and a legal-rule sentence. The expected finding set must be identical whether `sources` and `claimCitations` are absent, empty, valid, or decoys; discovery cannot consult citation state.

Add table-driven ledger-schema tests proving that LOW `sourced` rows without evidence fail, LOW factual `qualified` rows without evidence fail, non-factual qualified editorial framing may omit source evidence only with approved review, and `false-positive` fails for each missing rationale, absent artifact, artifact hash mismatch, unnamed reviewer, implementer-as-reviewer, and non-approved verdict.

Add review-coverage fixtures that fail for a missing baseline ID, duplicate task ownership, a missing stage, a sampled subset, a nonexistent approval path, a correct-looking but byte-mismatched hash, a reviewer equal to the implementer, and a manifest collection/task that disagrees with its path. The green fixture must cover every fixture baseline ID and all four stages exactly once.

- [ ] **Step 2: Run the tests and verify the new scanner interface is absent**

Run: `pnpm vitest run scripts/claim-remediation.test.ts`

Expected: FAIL on missing `scanSource`, `reconcileBaseline`, and ledger files.

- [ ] **Step 3: Implement the ledger schema and broaden the live scanner**

```js
import { createHash } from "node:crypto";
import { existsSync, readFileSync } from "node:fs";

export const FINAL_DISPOSITIONS = new Set(["sourced", "qualified", "removed", "duplicate", "false-positive"]);

const sha256File = (path) => createHash("sha256").update(readFileSync(path)).digest("hex");

export function validateLedgerRow(row, { artifactExists = existsSync, artifactHash = sha256File } = {}) {
  const verifyEvidenceRef = (path, hash, label) => {
    if (!path || !/^[a-f0-9]{64}$/.test(hash) || !artifactExists(path) || artifactHash(path) !== hash) throw new Error(`${label} evidence mismatch for ${row.baselineId}`);
  };
  if (!/^claim-[a-f0-9]{20}$/.test(row.baselineId)) throw new Error(`invalid baseline id: ${row.baselineId}`);
  if (row.disposition === null && row.reviewerStatus !== "pending") throw new Error(`invalid pending row for ${row.baselineId}`);
  if (row.disposition !== null && !FINAL_DISPOSITIONS.has(row.disposition)) throw new Error(`invalid disposition for ${row.baselineId}`);
  if (row.disposition === "sourced" && row.sourceEvidence.length === 0) throw new Error(`missing sourced support for ${row.baselineId}`);
  if (row.disposition === "qualified" && row.isFactual && row.sourceEvidence.length === 0) throw new Error(`missing qualified factual support for ${row.baselineId}`);
  if (row.disposition === "false-positive" && (!row.falsePositiveRationale?.trim() || !/^[a-f0-9]{64}$/.test(row.falsePositiveEvidenceHash) || !artifactExists(row.falsePositiveEvidenceArtifact) || artifactHash(row.falsePositiveEvidenceArtifact) !== row.falsePositiveEvidenceHash)) throw new Error(`incomplete false-positive evidence for ${row.baselineId}`);
  for (const evidence of row.sourceEvidence ?? []) {
    const approval = evidence.supportReviewerApproval;
    if (!approval?.reviewerId || approval.reviewerId === row.implementerId || approval.verdict !== "approved") throw new Error(`source needs named independent approval for ${row.baselineId}`);
    verifyEvidenceRef(approval.reviewEvidencePath, approval.reviewEvidenceHash, "source approval");
  }
  if (row.disposition === "false-positive" && (!row.falsePositiveApproval?.reviewerId || row.falsePositiveApproval.reviewerId === row.implementerId || row.falsePositiveApproval.verdict !== "approved")) throw new Error(`false-positive needs named independent approval for ${row.baselineId}`);
  if (row.disposition === "false-positive") verifyEvidenceRef(row.falsePositiveApproval.reviewEvidencePath, row.falsePositiveApproval.reviewEvidenceHash, "false-positive approval");
  if (row.disposition === "duplicate" && (!row.parentId || !row.duplicateEquivalenceHash)) throw new Error(`incomplete duplicate proof for ${row.baselineId}`);
  if (!["pending", "approved", "rejected"].includes(row.reviewerStatus)) throw new Error(`invalid reviewerStatus for ${row.baselineId}`);
  if (row.reviewerStatus === "approved") verifyEvidenceRef(row.reviewEvidencePath, row.reviewEvidenceHash, "row approval");
  return row;
}
```

Each row must contain `baselineId`, `file`, `baselineLocator`, `postEditLocator`, `riskTier`, `isFactual`, `originalText`, `finalText`, `finalTextHash`, `renderedTarget`, `disposition`, `sourceEvidence`, `verifiedAt`, `implementerId`, `reviewerStatus`, `reviewerId`, `reviewedAt`, `reviewEvidencePath`, and `reviewEvidenceHash`, with optional `parentId` and `duplicateEquivalenceHash`. `postEditLocator` is a current AST sentence path, structured field path, or `null` for removed text; it never replaces `baselineLocator`. `renderedTarget` is an exact CSS selector for body content or an exact generated field path for structured data. `finalText` must equal the complete rendered sentence/value at `postEditLocator`, and `finalTextHash` is its normalized SHA-256. Every `sourceEvidence` item contains `sourceId`, `authorityClass`, canonical `sourceLocator`, immutable `snapshotPath`, `snapshotHash`, `publishedAt` when known, `verifiedAt`, exact `supportedText`, and `supportReviewerApproval` with reviewer ID, date, verdict, `reviewEvidencePath`, and `reviewEvidenceHash`. Every approval path must exist inside the committed recovery/artifact roots and its file bytes must recompute to the recorded SHA-256; a hash string without a path never passes. Every `sourced` row requires source evidence at every risk tier; every factual `qualified` row requires exact support at every risk tier. A `false-positive` row additionally requires `falsePositiveRationale`, an existing immutable `falsePositiveEvidenceArtifact` whose bytes match `falsePositiveEvidenceHash`, and `falsePositiveApproval` naming a reviewer distinct from `implementerId`, with approved verdict, review date, `reviewEvidencePath`, and recomputed `reviewEvidenceHash`.

Risk rules are blocking: HIGH legal, enforcement, privacy, safety, medical, exact-number, price, and product-behavior claims require a current official/primary source or current professional clinical guidance appropriate to the claim; MED factual claims require an authoritative primary source where available, otherwise a named high-quality secondary source with documented primary-source search; LOW factual claims still require evidence, while genuinely non-factual editorial framing may be `false-positive` only with its independent proof package. `qualified` does not waive sourcing: every surviving factual statement at every risk tier must have source evidence that supports the exact qualified final text. Source verification must record authority class, currency rationale, publication/update date when available, live verification date, and immutable local snapshot/hash. A reachable URL alone is insufficient.

Duplicate dispositions are graph-validated across all partitions. The parent must exist in the frozen baseline, be approved, resolve to a non-duplicate terminal disposition, and have the same normalized proposition/equivalence hash. Self-parenting, missing parents, chains ending in rejected/pending rows, mismatched equivalence, and cycles all fail. Initial rows use `disposition: null` with `reviewerStatus: "pending"`; the final verifier rejects every remaining null disposition.

Every content batch writes one manifest per partition slice at `docs/seo-400/recovery-2026-07-22/claim-review-manifests/<collection>/task-<N>.json`. Its schema is `{ schemaVersion: 1, task, collection, ownedBaselineIds, rows }`; `rows` has exactly one entry per sorted owned ID, and every entry contains the same `baselineId`, `implementerId`, and exactly four ordered stages: `disposition`, `text-and-render`, `source-or-removal`, `independent-approval`. Each stage contains `reviewerId`, `verdict`, `reviewEvidencePath`, and `reviewEvidenceHash`. The evidence file lives at `artifacts/seo-ai-seo-recovery/2026-07-22/claim-reviews/<collection>/<baselineId>/<stage>.json`, names the implementer and reviewer, records inputs/outputs and referenced ledger/source/copy hashes, and must hash to the manifest value. The independent reviewer must differ from the implementer; no stage may be pending or sampled. Task 7 writes only its 2 owned listicle rows; Tasks 8-14 write their exact owned slices, including zero-row exclusion proof where a Task 7 path belongs to the same partition.

`verify-claim-review-coverage.mjs` loads the frozen baseline, every task/partition review manifest, every stage artifact, and all ledger rows. It recomputes each stage SHA-256, verifies exact path conventions and reviewer independence, rejects duplicate ownership, and requires the union of `ownedBaselineIds` to equal the exact 1,010 frozen `baselineId` set. It also verifies every ledger row's `reviewEvidencePath`, every source approval evidence path, and every disposition-specific approval path points to an existing hash-matching durable artifact. Scoped mode accepts `--task` and `--collection`; final mode has no exclusions.

The scanner parses frontmatter and Markdown/MDX AST nodes and inspects all public-rendered headings, paragraphs, list items, block quotes, table cells, FAQs, answers, descriptions, facts, laws, tools, prices, tiers, hidden costs, and table payloads. It emits candidate findings before citation parsing and stores the complete containing sentence/field value as `claimText`, never only the regex match. A citation may satisfy evidence later but may never suppress candidate discovery. A sourced claim needs a valid rendered citation; a qualified/removed claim must differ or disappear as recorded; and a false positive must match the same frozen baseline proposition and have approved review evidence. The audit CLI accepts repeatable `--exclude-path` using the same exact-path semantics as the verifier and reports excluded frozen-row counts separately.

Add `--collection`, `--no-report`, and `--json-out` to `verify-sources.mjs`. Scoped content tasks use `--collection NAME --no-report --fail-on-error`, so a batch neither scans unrelated unfinished collections nor overwrites the shared dated report.

Implement `verify-claim-remediation.mjs` with `--collection`, comma-separated `--paths`, and repeatable `--exclude-path`. It must load the frozen baseline, ledger partitions, current AST scan, source snapshots, and rendered output; verify exact final text/hash and rendered selector/field, validate source authority/currency/support approval, validate the duplicate graph, verify cited IDs against the page's visible source list, and reject pending/rejected rows. It prints `baseline=N reconciled=N unresolved=0 reviewerRejected=0 sourceRejected=0 duplicateInvalid=0`. Any non-zero unresolved, pending, rejected, broken-citation, stale/missing snapshot, unsupported qualified claim, or duplicate-graph count exits 1.

Add these package scripts:

```json
{
  "audit:claims": "node scripts/audit-claims.mjs",
  "verify:claims": "node scripts/verify-claim-remediation.mjs",
  "verify:claim-reviews": "node scripts/verify-claim-review-coverage.mjs"
}
```

- [ ] **Step 4: Generate empty pending ledger partitions from the frozen baseline**

Run: `node scripts/audit-claims.mjs --initialize-ledger docs/seo-400/recovery-2026-07-22/claim-ledger`

Expected: fifteen deterministic collection files and `ledger initialized: 1010 pending rows`; no MDX file changes.

- [ ] **Step 5: Run the focused tests**

Run: `pnpm vitest run scripts/claim-remediation.test.ts`

Expected: PASS for stable IDs, structured-field discovery, partition counts, and immutable reconciliation.

Run: `pnpm verify:claims`

Expected: FAIL with `pending=1010`; this proves the repository gate blocks incomplete remediation while its unit tests remain green.

- [ ] **Step 6: Return the reviewed scaffold diff for orchestrator-only exact staging**

```powershell
node scripts/write-content-batch-manifest.mjs --task 2 --allow scripts/audit-claims.mjs,scripts/lib/claim-ledger.mjs,scripts/verify-claim-remediation.mjs,scripts/verify-claim-review-coverage.mjs,scripts/verify-sources.mjs,scripts/claim-remediation.test.ts,package.json,docs/seo-400/recovery-2026-07-22/claim-ledger,docs/seo-400/recovery-2026-07-22/source-snapshots/fixtures --out artifacts/seo-ai-seo-recovery/2026-07-22/content-batches/task-2.json
$batch = Get-Content -Raw artifacts/seo-ai-seo-recovery/2026-07-22/content-batches/task-2.json | ConvertFrom-Json
git add -- @($batch.paths.path) artifacts/seo-ai-seo-recovery/2026-07-22/content-batches/task-2.json
git commit -m "feat(seo): add claim remediation ledger"
```

### Task 3: Render Body and Structured-Field Citations

**Files:**
- Create: `src/components/source-citations.tsx`
- Create: `src/components/source-citations.test.tsx`
- Modify: `scripts/build-content-data.mjs:20-180,311-355`
- Modify: `src/site/content.ts:35-120`
- Modify: `src/components/article-body.tsx:10-42`
- Modify: `src/components/article-body.test.tsx:1-86`
- Modify: `src/components/sources.tsx:1-60`
- Modify: `src/pages/content-page.tsx:162-463`
- Modify: `src/pages/content-page.test.tsx:1-480`

**Interfaces:**
- Consumes: `sources[]` and optional frontmatter `claimCitations[]`.
- Produces: `ClaimCitation { field: string; sourceIds: string[] }`, `SourceCitations({ field, citations, sources })`, and stable anchors `#source-${source.id}`.

- [ ] **Step 1: Write failing component and schema tests**

```tsx
import { JSDOM } from "jsdom";
import { renderToStaticMarkup } from "react-dom/server";
import { expect, it } from "vitest";
import { SourceCitations, validateClaimCitations } from "./source-citations";

const sources = [{
  id: "ftc-flo-2021",
  claim: "The FTC announced its Flo Health action in 2021.",
  url: "https://www.ftc.gov/news-events/news/press-releases/2021/01/developer-popular-womens-fertility-tracking-app-settles-ftc-allegations-it-misled-consumers-about",
  publisher: "FTC",
  accessedAt: "2026-07-22",
  primary: true,
  softened: false,
}];

it("maps a structured field to visible same-page source anchors", () => {
  const html = renderToStaticMarkup(<SourceCitations field="faqs[0].a" citations={[{ field: "faqs[0].a", sourceIds: ["ftc-flo-2021"] }]} sources={sources} />);
  const link = new JSDOM(html).window.document.querySelector("a");
  expect(link?.textContent).toBe("FTC source");
  expect(link?.getAttribute("href")).toBe("#source-ftc-flo-2021");
  expect(link?.hasAttribute("target")).toBe(false);
});

it("rejects a citation ID missing from the page source list", () => {
  expect(() => validateClaimCitations([{ field: "bluf", sourceIds: ["missing"] }], sources)).toThrow(/missing/);
});
```

- [ ] **Step 2: Run focused tests and verify failure**

Run: `pnpm vitest run src/components/source-citations.test.tsx src/components/article-body.test.tsx src/pages/content-page.test.tsx`

Expected: FAIL because `SourceCitations` and `claimCitations` do not exist and hash links currently receive external-link behavior.

- [ ] **Step 3: Add the exact frontmatter and runtime types**

```ts
export type ClaimCitation = {
  field: string;
  sourceIds: string[];
};

export type Source = {
  id: string;
  claim: string;
  url: string;
  publisher: string;
  publishedAt?: string;
  accessedAt?: string;
  primary: boolean;
  softened: boolean;
};
```

Add a Zod schema requiring a non-empty field, at least one source ID, unique field entries, unique IDs within each entry, and source IDs present in that page's `sources[]`.

- [ ] **Step 4: Implement same-document body citations and structured citation markers**

```tsx
import type { ClaimCitation, Source } from "@/site/content";

type SourceCitationsProps = {
  field: string;
  citations: ClaimCitation[];
  sources: Source[];
};

if (href.startsWith("#source-")) {
  return <a className="citation-link" href={href}>{children}</a>;
}

export function SourceCitations({ field, citations, sources }: SourceCitationsProps) {
  const sourceById = new Map(sources.map((source) => [source.id, source]));
  const ids = citations.find((citation) => citation.field === field)?.sourceIds ?? [];
  if (ids.length === 0) return null;
  return <span className="field-citations" aria-label="Sources">{ids.map((id) => {
    const source = sourceById.get(id)!;
    return <a key={id} className="citation-link" href={`#source-${id}`}>{source.publisher} source</a>;
  })}</span>;
}
```

Call `SourceCitations` next to `description`, `bluf`, key facts, definitions, tool fields, table cells, tiers, hidden costs, answers, FAQs, and state/law fields. Keep direct official links for `pricingStats`, `relevantLaws`, and `expertQuotes`.

- [ ] **Step 5: Run component and content tests**

Run: `pnpm vitest run src/components/source-citations.test.tsx src/components/article-body.test.tsx src/pages/content-page.test.tsx`

Expected: PASS; every rendered citation target has a matching visible source-list element and no hash citation opens a new tab.

- [ ] **Step 6: Return citation infrastructure for orchestrator-only exact staging**

```powershell
node scripts/write-content-batch-manifest.mjs --task 3 --allow scripts/build-content-data.mjs,src/site/content.ts,src/components/source-citations.tsx,src/components/source-citations.test.tsx,src/components/article-body.tsx,src/components/article-body.test.tsx,src/components/sources.tsx,src/pages/content-page.tsx,src/pages/content-page.test.tsx --out artifacts/seo-ai-seo-recovery/2026-07-22/content-batches/task-3.json
$batch = Get-Content -Raw artifacts/seo-ai-seo-recovery/2026-07-22/content-batches/task-3.json | ConvertFrom-Json
git add -- @($batch.paths.path) artifacts/seo-ai-seo-recovery/2026-07-22/content-batches/task-3.json
git commit -m "feat(content): render claim source mappings"
```

### Task 4: Add Purpose-Written SEO Title Resolution and Collision Primitives

**Files:**
- Create: `scripts/lib/content-metadata.mjs`
- Create: `scripts/content-metadata.test.ts`
- Modify: `scripts/build-content-data.mjs:134-160,218-246,311-380`
- Modify: `scripts/generated-surfaces.test.ts:339-374`

**Interfaces:**
- Consumes: optional MDX `seoTitle` and required `title`.
- Produces: `normalizePublicTitle(title: string): string`, `resolveSeoTitle({ title, seoTitle }): string`, `assertUniquePublicTitles(entries): void`, and generator `--check` mode that performs every parse/title/citation check without writing generated files.

- [ ] **Step 1: Write failing title-resolution tests**

```ts
import { expect, it } from "vitest";
import { assertUniquePublicTitles, resolveSeoTitle } from "./lib/content-metadata.mjs";

it("prefers a valid explicit SEO title", () => {
  expect(resolveSeoTitle({ title: "A long page heading", seoTitle: "Focused search title" })).toBe("Focused search title");
});

it("reports every case and whitespace normalized collision", () => {
  expect(() => assertUniquePublicTitles([
    { sourceFile: "content/a.mdx", seoTitle: "Private Period Tracker" },
    { sourceFile: "content/b.mdx", seoTitle: " private   period tracker " },
  ])).toThrow(/content\/a\.mdx[\s\S]*content\/b\.mdx/);
});

it("rejects an explicit title longer than 60 characters", () => {
  expect(() => resolveSeoTitle({ title: "Short", seoTitle: "x".repeat(61) })).toThrow(/60/);
});
```

- [ ] **Step 2: Run the tests and verify failure**

Run: `pnpm vitest run scripts/content-metadata.test.ts scripts/generated-surfaces.test.ts`

Expected: FAIL because the helper module and explicit field do not exist.

- [ ] **Step 3: Implement title resolution and pre-write collision checks**

```js
export function normalizePublicTitle(title) {
  return title.normalize("NFKC").trim().replace(/\s+/g, " ").toLowerCase();
}

export function truncateAtWord(value, maxLength) {
  const normalized = value.trim();
  if (normalized.length <= maxLength) return normalized;
  const clipped = normalized.slice(0, maxLength + 1);
  const boundary = clipped.lastIndexOf(" ");
  return (boundary > 0 ? clipped.slice(0, boundary) : normalized.slice(0, maxLength)).trim();
}

export function resolveSeoTitle({ title, seoTitle }) {
  if (seoTitle !== undefined) {
    const explicit = seoTitle.trim();
    if (!explicit || explicit.length > 60) throw new Error("Explicit seoTitle must contain 1-60 characters");
    return explicit;
  }
  return truncateAtWord(title.trim(), 60);
}
```

Implement and export `assertUniquePublicTitles(entries)` as a fixture-tested helper, but do not wire it into repository generation in this task because the two known collision pairs would leave `master` red between commits. Its error must list the normalized title, final public title, route, and source file for every collision.

- [ ] **Step 4: Run metadata and generated-surface tests**

Run: `pnpm vitest run scripts/content-metadata.test.ts scripts/generated-surfaces.test.ts`

Expected: PASS for explicit-title resolution, length enforcement, fixture-based collision reporting, and existing generated-surface behavior. Task 7 atomically activates the repository-wide collision call while fixing the two known pairs.

- [ ] **Step 5: Return the green helper diff for orchestrator-only exact staging**

```powershell
node scripts/write-content-batch-manifest.mjs --task 4 --allow scripts/lib/content-metadata.mjs,scripts/content-metadata.test.ts,scripts/build-content-data.mjs,scripts/generated-surfaces.test.ts --out artifacts/seo-ai-seo-recovery/2026-07-22/content-batches/task-4.json
$batch = Get-Content -Raw artifacts/seo-ai-seo-recovery/2026-07-22/content-batches/task-4.json | ConvertFrom-Json
git add -- @($batch.paths.path) artifacts/seo-ai-seo-recovery/2026-07-22/content-batches/task-4.json
git commit -m "feat(seo): add final-title collision validator"
```

### Task 5: Make Copy-Review Order a Blocking Gate

**Files:**
- Create: `scripts/verify-copy-review.mjs`
- Create: `scripts/verify-copy-skill-session.mjs`
- Create: `scripts/copy-review.test.ts`
- Consume: immutable `docs/seo-400/recovery-2026-07-22/copy-review-ledger/manifest.json` created before public-copy edits in Task 1.
- Create: fixture records under `docs/seo-400/recovery-2026-07-22/copy-review-ledger/fixtures/`
- Create: immutable fixture run artifacts under `artifacts/seo-ai-seo-recovery/2026-07-22/copy-review/fixtures/`
- Modify: `package.json:17-20`

**Interfaces:**
- Consumes: changed public-copy paths and ordered review records.
- Produces: `collectChangedPublicCopy(frozenBaseSha: string): string[]` and `verify:copy-review`, which fail unless each changed public-copy file has immutable `humanizer`, `third-grade-copy`, `no-lies`, and `full-context` run artifacts in that order. The CLI accepts `--base`, `--paths`, and `--collection`; every command defaults to the SHA frozen by Task 1 and rejects a different base.

- [ ] **Step 1: Verify both required skills and their approved source**

Before any filesystem check, the orchestrator spawns a fresh candidate implementation agent/session and records its canonical collaboration agent/task ID plus exact assigned paths in `artifacts/seo-ai-seo-recovery/2026-07-22/copy-skill-dispatches/<agentId>.json`. Where the fresh session exposes a runtime-advertised catalog, the agent must report both exact names `humanizer` and `third-grade-copy`; absence blocks that agent. Because the current collaboration runtime does not export raw catalog/event JSONL, do not claim cryptographic runtime proof. The agent must read both complete `SKILL.md` files itself before editing and later write the required agent-authored report. A path inferred from memory or a parent-agent report does not count. Every implementation agent that touches public copy repeats this gate.

Run:

```powershell
Test-Path <user-home>\.codex\skills\humanizer\SKILL.md
Test-Path <user-home>\.codex\skills\third-grade-copy\SKILL.md
Get-FileHash <user-home>\.codex\skills\third-grade-copy\SKILL.md
Get-FileHash <shared-skill-source-repo>\packages\third-grade-copy-skill\skill\third-grade-copy\SKILL.md
```

Expected: the fresh agent's advertised catalog exposes both exact skill names and both paths exist. If the two third-grade hashes differ, use the globally installed `skill-installer` workflow to sync from the shared skill source, then spawn yet another fresh agent/session and rerun both the catalog and hash checks. Confirm `git -C <shared-skill-source-repo> status --short` is unchanged. Installed files and matching hashes are necessary but never substitute for fresh-session catalog exposure.

After the agent applies both skills to real task text, it writes its required report and a distinct non-implementing reviewer verifies it:

```powershell
node scripts/verify-copy-skill-session.mjs --dispatch artifacts/seo-ai-seo-recovery/2026-07-22/copy-skill-dispatches/$agentId.json --report artifacts/seo-ai-seo-recovery/2026-07-22/copy-skill-agent-reports/$agentId.json --verdict artifacts/seo-ai-seo-recovery/2026-07-22/copy-skill-review-verdicts/$agentId.json
```

The agent report contains canonical `agentId`/`taskId`, catalog visibility result, both skill paths and SHA-256 values, complete-read timestamps, assigned input paths/hashes, ordered humanizer and third-grade decisions with before/after hashes, deterministic third-grade scanner output path/hash, other repo-gate outputs, final output paths/hashes, and completion time. The independent verdict names a reviewer distinct from the agent, recomputes every report/file/skill/gate hash, confirms decisions are in required order and outputs chain to final files, and records `reviewEvidencePath` plus SHA-256. This is explicitly agent-authored plus independently reviewed evidence, not cryptographic runtime attestation. A manually dropped report fails without the matching orchestrator dispatch, exact assigned paths, deterministic gate artifacts, and distinct hash-verifying reviewer verdict.

- [ ] **Step 2: Write failing ordered-proof tests**

```ts
import { expect, it } from "vitest";
import { validateCopyReview } from "./verify-copy-review.mjs";

const changedFiles = ["content/guides/school-devices-period-tracking.mdx"];
const recordsWithoutThirdGrade = [{ path: changedFiles[0], reviews: [
  { stage: "humanizer", status: "approved", runArtifact: "artifacts/run-humanizer.json", runArtifactHash: "a".repeat(64) },
]}];
const outOfOrderRecords = [{ path: changedFiles[0], reviews: [
  { stage: "third-grade-copy", status: "approved", runArtifact: "artifacts/run-third-grade.json", runArtifactHash: "b".repeat(64) },
  { stage: "humanizer", status: "approved", runArtifact: "artifacts/run-humanizer.json", runArtifactHash: "a".repeat(64) },
]}];

it("rejects missing or out-of-order copy reviews", () => {
  expect(() => validateCopyReview(recordsWithoutThirdGrade, changedFiles)).toThrow(/third-grade-copy/);
  expect(() => validateCopyReview(outOfOrderRecords, changedFiles)).toThrow(/review order/);
});

it("accepts the required four-stage sequence", () => {
  expect(validateCopyReview([{
    path: "content/guides/school-devices-period-tracking.mdx",
    frozenBaseSha: "1".repeat(40),
    baseTextHash: "2".repeat(64),
    finalTextHash: "3".repeat(64),
    reviews: [
      { stage: "humanizer", status: "approved", runArtifact: "artifacts/humanizer.json", runArtifactHash: "a".repeat(64) },
      { stage: "third-grade-copy", status: "approved", runArtifact: "artifacts/third-grade.json", runArtifactHash: "b".repeat(64) },
      { stage: "no-lies", status: "approved", runArtifact: "artifacts/no-lies.json", runArtifactHash: "c".repeat(64) },
      { stage: "full-context", status: "approved", runArtifact: "artifacts/full-context.json", runArtifactHash: "d".repeat(64) },
    ],
  }], ["content/guides/school-devices-period-tracking.mdx"])).toEqual({ checked: 1, failures: [] });
});
```

- [ ] **Step 3: Run the test and verify failure**

Run: `pnpm vitest run scripts/copy-review.test.ts`

Expected: FAIL because the verifier does not exist.

- [ ] **Step 4: Implement the exact proof schema and command**

```json
{
  "schemaVersion": 1,
  "path": "content/guides/school-devices-period-tracking.mdx",
  "frozenBaseSha": "0000000000000000000000000000000000000000",
  "baseTextHash": "0000000000000000000000000000000000000000000000000000000000000000",
  "finalTextHash": "0000000000000000000000000000000000000000000000000000000000000000",
  "reviews": []
}
```

The all-zero values above are schema examples only. The writer rejects all-zero hashes and requires the concrete repository/file hashes before it writes a record.

Implement the validator around this fixed sequence:

```js
export const REQUIRED_COPY_STAGES = ["humanizer", "third-grade-copy", "no-lies", "full-context"];

export function validateCopyReview(records, changedFiles) {
  const byPath = new Map(records.map((record) => [record.path, record]));
  const failures = [];
  for (const file of changedFiles) {
    const reviews = byPath.get(file)?.reviews ?? [];
    for (const [index, stage] of REQUIRED_COPY_STAGES.entries()) {
      const review = reviews[index];
      if (review?.stage !== stage || review.status !== "approved" || !review.runArtifact || !/^[a-f0-9]{64}$/.test(review.runArtifactHash)) {
        failures.push(`${file}: review order ${index + 1} requires an approved immutable ${stage} run artifact`);
      }
    }
  }
  if (failures.length > 0) throw new Error(failures.join("\n"));
  return { checked: changedFiles.length, failures };
}
```

Add this package script:

```json
{
  "verify:copy-review": "node scripts/verify-copy-review.mjs"
}
```

Task 1 already froze the pre-edit SHA in `copy-review-ledger/manifest.json`; this task verifies that SHA exists, is an ancestor of `HEAD`, and still matches the Task 1 batch manifest. Each later content task creates exactly one record at `copy-review-ledger/<collection>/<slug>.json` for each exact changed path. Each shard contains `copySkillAgentId`, dispatch/report/verdict paths and recomputed hashes. The four stage artifacts live at `artifacts/seo-ai-seo-recovery/2026-07-22/copy-review/<collection>/<slug>/<stage>.json` and contain `schemaVersion`, `path`, `stage`, `skillOrPolicyHash`, `inputTextHash`, `outputTextHash`, `startedAt`, `completedAt`, `reviewerId`, `status`, `reviewEvidencePath`, and `reviewEvidenceHash`. Every evidence path must exist and recompute to its SHA-256. A stage artifact is write-once: an existing path/hash mismatch is fatal. Stage N's input hash must equal stage N-1's output hash; the first two stages must match the agent report's ordered decisions; the final artifact output hash must equal the shard's `finalTextHash` and current file hash. The verifier loads shards recursively, rejects duplicate `path` ownership, verifies dispatch/report/verdict triples and deterministic scanner/gate artifacts, and compares changed public-copy paths against the immutable base SHA. It must fail until every changed public-copy path is covered.

- [ ] **Step 5: Run the focused tests**

Run: `pnpm vitest run scripts/copy-review.test.ts`

Expected: PASS for verifier unit tests; fixtures prove missing, out-of-order, mutable/overwritten, broken hash-chain, wrong-base-SHA, and stale-final-file reviews fail with an exact file/stage list.

Agent-proof fixtures must additionally prove that a hand-authored report without a dispatch, wrong agent/task ID, path outside the assignment, missing skill read/hash, absent deterministic scanner output, an invocation input/output mismatch, same-agent reviewer, reviewer hash mismatch, and a shard pointing to another agent all fail. The green fixture has an orchestrator dispatch, agent-authored report, deterministic gate artifacts, and distinct independently hash-verified verdict chained through all four stages to the final file hash.

- [ ] **Step 6: Verify the frozen base and return the reviewed gate for orchestrator-only staging**

```powershell
pnpm vitest run scripts/copy-review.test.ts
node scripts/write-content-batch-manifest.mjs --task 5 --allow scripts/verify-copy-review.mjs,scripts/verify-copy-skill-session.mjs,scripts/copy-review.test.ts,docs/seo-400/recovery-2026-07-22/copy-review-ledger,artifacts/seo-ai-seo-recovery/2026-07-22/copy-review/fixtures,artifacts/seo-ai-seo-recovery/2026-07-22/copy-skill-dispatches/fixtures,artifacts/seo-ai-seo-recovery/2026-07-22/copy-skill-agent-reports/fixtures,artifacts/seo-ai-seo-recovery/2026-07-22/copy-skill-review-verdicts/fixtures,package.json --out artifacts/seo-ai-seo-recovery/2026-07-22/content-batches/task-5.json
$batch = Get-Content -Raw artifacts/seo-ai-seo-recovery/2026-07-22/content-batches/task-5.json | ConvertFrom-Json
git add -- @($batch.paths.path) artifacts/seo-ai-seo-recovery/2026-07-22/content-batches/task-5.json
git commit -m "test(copy): require ordered public copy review"
```

### Task 6: Add Honest Editorial Methodology and Structured Provenance

**Files:**
- Modify: `src/site/knowledge/index.ts:56-65,569-635`
- Modify: `src/pages/static-pages.tsx:49-72`
- Modify: `src/components/sources.tsx:10-58`
- Modify: `src/site/structured-data.ts:79-98`
- Modify: `src/site/structured-data.test.ts:1-110`
- Create: `docs/seo-400/recovery-2026-07-22/copy-review-ledger/methodology/src-site-knowledge-index.json`
- Create: `docs/seo-400/recovery-2026-07-22/copy-review-ledger/methodology/src-pages-static-pages.json`
- Create: `docs/seo-400/recovery-2026-07-22/copy-review-ledger/methodology/src-components-sources.json`
- Create: four immutable stage artifacts for each of those three exact paths under matching `artifacts/seo-ai-seo-recovery/2026-07-22/copy-review/methodology/<path-slug>/` directories.

**Interfaces:**
- Consumes: existing `/support` route and Organization author.
- Produces: `https://floriva.app/support#editorial-methodology` as a visible methodology anchor and Article `publishingPrinciples` value.

- [ ] **Step 1: Write failing methodology and structured-data tests**

```ts
import { expect, it } from "vitest";
import type { ContentPageMeta } from "./content-manifest";
import { buildArticleJsonLd } from "./structured-data";

const contentMeta = {
  collection: "guides",
  description: "A sourced guide.",
  faqs: [],
  metaDescription: "A sourced guide.",
  publishedAt: "2026-07-22",
  routePath: "/resources/guides/sourced-guide",
  seoTitle: "Sourced guide",
  slug: "sourced-guide",
  title: "Sourced guide",
  updatedAt: "2026-07-22",
} satisfies ContentPageMeta;

it("links Article provenance to the existing support-page methodology", () => {
  const article = buildArticleJsonLd(contentMeta);
  expect(article.author).toEqual({ "@type": "Organization", name: "Floriva", url: "https://floriva.app/" });
  expect(article.publishingPrinciples).toBe("https://floriva.app/support#editorial-methodology");
});
```

Add a page test asserting that `#editorial-methodology` exists and the Sources component links to `/support#editorial-methodology`.

- [ ] **Step 2: Run focused tests and verify failure**

Run: `pnpm vitest run src/site/structured-data.test.ts src/pages/content-page.test.tsx`

Expected: FAIL because `publishingPrinciples` and the methodology anchor are absent.

- [ ] **Step 3: Add the exact truthful methodology copy**

```ts
{
  id: "editorial-methodology",
  heading: "How Floriva checks its guides",
  body: "Floriva starts with official and primary sources when they are available. We show when a source was checked, link claims to the source that supports them, and update or remove a claim when the evidence changes. Health and legal guides are general information. They are not medical care or legal advice. Floriva does not claim a doctor or lawyer reviewed a page unless that review really happened and is named.",
}
```

Add optional `id` to `StaticKnowledgeSection`, render it on the `<section>`, add the Sources link, and set Article `publishingPrinciples` without adding a person or `sameAs` value.

- [ ] **Step 4: Run the required public-copy sequence and record evidence**

Use a fresh implementation agent/session whose advertised catalog passed Task 5. Run `humanizer` on the methodology and Sources/static-surface copy, then `third-grade-copy`, then compare every factual statement to repo truth, then review the whole `/support` and article-source context. Write exactly three shards—one each for `src/site/knowledge/index.ts`, `src/pages/static-pages.tsx`, and `src/components/sources.tsx`—and four immutable stage artifacts per shard. A single route-level shard is invalid because changed-path coverage is file-exact.

- [ ] **Step 5: Run focused and copy-proof gates**

Run:

```powershell
pnpm vitest run src/site/structured-data.test.ts src/pages/content-page.test.tsx src/site/knowledge/knowledge.test.ts
pnpm verify:copy-review -- --paths src/site/knowledge/index.ts,src/pages/static-pages.tsx,src/components/sources.tsx
```

Expected: PASS with Organization author unchanged, methodology anchor present, and exactly three changed public-copy paths mapped one-to-one to three shards and twelve immutable stage artifacts.

- [ ] **Step 6: Return methodology and immutable copy proof for orchestrator-only staging**

```powershell
node scripts/write-content-batch-manifest.mjs --task 6 --allow src/site/knowledge/index.ts,src/pages/static-pages.tsx,src/components/sources.tsx,src/site/structured-data.ts,src/site/structured-data.test.ts,docs/seo-400/recovery-2026-07-22/copy-review-ledger/methodology/src-site-knowledge-index.json,docs/seo-400/recovery-2026-07-22/copy-review-ledger/methodology/src-pages-static-pages.json,docs/seo-400/recovery-2026-07-22/copy-review-ledger/methodology/src-components-sources.json,artifacts/seo-ai-seo-recovery/2026-07-22/copy-review/methodology/src-site-knowledge-index,artifacts/seo-ai-seo-recovery/2026-07-22/copy-review/methodology/src-pages-static-pages,artifacts/seo-ai-seo-recovery/2026-07-22/copy-review/methodology/src-components-sources --out artifacts/seo-ai-seo-recovery/2026-07-22/content-batches/task-6.json
$batch = Get-Content -Raw artifacts/seo-ai-seo-recovery/2026-07-22/content-batches/task-6.json | ConvertFrom-Json
git add -- @($batch.paths.path) artifacts/seo-ai-seo-recovery/2026-07-22/content-batches/task-6.json
git commit -m "feat(content): publish editorial methodology"
```

### Task 7: Differentiate Both Cannibalization Pairs

**Files:**
- Modify: `content/listicles/best-period-tracker-for-perimenopause.mdx`
- Modify: `content/listicles/best-period-tracker-perimenopause.mdx`
- Modify: `content/guides/school-devices-period-tracking.mdx`
- Modify: `content/privacy-in-practice/school-device-period-tracking-risks.mdx`
- Modify: `scripts/build-content-data.mjs`
- Modify: `scripts/generated-surfaces.test.ts`
- Create: `scripts/verify-content-intent.mjs`
- Create: `scripts/content-intent.test.ts`
- Create: `artifacts/seo-ai-seo-recovery/2026-07-22/collision-intent-baseline.json` before editing any collision page.
- Modify: corresponding collection ledger JSON files
- Create: `docs/seo-400/recovery-2026-07-22/copy-review-ledger/listicles/best-period-tracker-for-perimenopause.json`
- Create: `docs/seo-400/recovery-2026-07-22/copy-review-ledger/listicles/best-period-tracker-perimenopause.json`
- Create: `docs/seo-400/recovery-2026-07-22/copy-review-ledger/guides/school-devices-period-tracking.json`
- Create: `docs/seo-400/recovery-2026-07-22/copy-review-ledger/privacy-in-practice/school-device-period-tracking-risks.json`

**Interfaces:**
- Consumes: `seoTitle` and `claimCitations` from Tasks 3-4.
- Produces: four unique page intents, H1s, SEO titles, descriptions, introductions, supporting sections, reciprocal related links, all-559 source-title validation, and machine-readable pairwise similarity proof. Task 7 owns all four collision files permanently; Tasks 9, 11, and 13 must exclude them.

- [ ] **Step 1: Add failing intent assertions**

```ts
import { expect, it } from "vitest";
import { allEntries } from "../src/site/content";

it("gives each previously colliding route a distinct reader job", () => {
  const byRoute = new Map(allEntries.map((entry) => [entry.routePath, entry]));
  expect(byRoute.get("/resources/best/best-period-tracker-for-perimenopause")?.title)
    .toBe("Best Period Trackers for Perimenopause: Apps Compared");
  expect(byRoute.get("/resources/best/best-period-tracker-perimenopause")?.title)
    .toBe("What a Perimenopause Period Tracker Needs to Handle");
  expect(byRoute.get("/resources/guides/school-devices-period-tracking")?.title)
    .toBe("Safer Period Tracking Around School-Managed Devices");
  expect(byRoute.get("/resources/privacy-in-practice/school-device-period-tracking-risks")?.title)
    .toBe("What Schools Can See When You Track Your Period");
});
```

Add an `INTENT_CONTRACTS` fixture in `scripts/content-intent.test.ts` for the four exact routes. Each contract records its one-sentence reader job, required topic markers, forbidden markers borrowed from its sibling's job, and the exact H1/SEO title. Test that H1, SEO title, description, and first two rendered body paragraphs are pairwise distinct; that required/forbidden markers pass; that normalized first-two-paragraph token Jaccard similarity is at most `0.55`; and that normalized whole-body 5-word-shingle Jaccard similarity is at most `0.35` for each formerly colliding pair. Also assert each pair's similarity falls by at least `0.20` from a pre-edit measurement recorded by Step 2.

- [ ] **Step 2: Run the red intent test and freeze the pre-edit similarity baseline before page edits**

Run:

```powershell
pnpm vitest run scripts/content-metadata.test.ts scripts/content-intent.test.ts scripts/generated-surfaces.test.ts
```

Expected: FAIL in `content-intent.test.ts` with the four old H1 values and both original duplicate final titles.

Implement only the read-only parsing, similarity calculation, and write-once baseline mode of `scripts/verify-content-intent.mjs`; do not edit the four MDX files yet. Then run:

```powershell
node scripts/verify-content-intent.mjs --write-baseline artifacts/seo-ai-seo-recovery/2026-07-22/collision-intent-baseline.json
pnpm vitest run scripts/content-intent.test.ts
```

Expected: the writer prints `baselinePairs=2`, refuses overwrite on a second invocation, and records both pairwise intro/body scores plus exact source-file hashes. The test still FAILS on the intended new H1/intent expectations, proving the baseline was captured without making the green edit.

Before editing the pages, wire `assertUniquePublicTitles(entries)` into `build-content-data.mjs` after parsing and before every write. The same failing run must list both collision pairs and must leave generated files unchanged.

- [ ] **Step 3: Rewrite the two perimenopause pages around separate outcomes**

Use these exact metadata values:

```yaml
title: "Best Period Trackers for Perimenopause: Apps Compared"
seoTitle: "Best Period Trackers for Perimenopause Compared"
```

for the broad ranked buyer comparison, and:

```yaml
title: "What a Perimenopause Period Tracker Needs to Handle"
seoTitle: "Period Tracker Features for Perimenopause"
```

for the capability-first irregular-cycle decision guide. Preserve tool payloads and add reciprocal `relatedPages` links.

- [ ] **Step 4: Rewrite the school-device pages around action versus risk**

Use these exact metadata values:

```yaml
title: "Safer Period Tracking Around School-Managed Devices"
seoTitle: "Safer Period Tracking on School Devices"
```

for the practical checklist, and:

```yaml
title: "What Schools Can See When You Track Your Period"
seoTitle: "School Device Period-Tracking Privacy Risks"
```

for the monitoring/legal-risk explainer. Preserve both URLs and add reciprocal `relatedPages` links.

- [ ] **Step 5: Source every changed factual claim and reconcile the four pages' baseline rows**

Body citations use this real pattern:

```md
The FTC announced its action against Flo Health in 2021. [FTC source](#source-ftc-flo-2021-2026-07-22)
```

Use current primary sources for perimenopause duration/clinical guidance, FTC history, vendor prices/features, FERPA/CIPA, and monitoring capabilities. Qualify or remove claims a source does not directly support.

- [ ] **Step 6: Run the four-stage copy review and adversarial intent review**

The fresh Task 7 implementation agent must first pass the advertised-catalog gate in its own session. It then runs `humanizer`, then `third-grade-copy`, then no-lies, then full-context review on all four files, writing four immutable stage artifacts and one per-file ledger shard for each exact path. A separate reviewer must record one sentence for each page's search intent and reader outcome without using its slug, then attempt to match each anonymized introduction to the four intent contracts. Approval requires four correct matches, all required/forbidden markers passing, and both similarity ceilings plus the `0.20` improvement from the frozen pre-edit score.

- [ ] **Step 7: Run the focused gates**

Run:

```powershell
node scripts/build-content-data.mjs --check
pnpm vitest run scripts/content-metadata.test.ts scripts/content-intent.test.ts scripts/generated-surfaces.test.ts
node scripts/verify-content-intent.mjs --baseline artifacts/seo-ai-seo-recovery/2026-07-22/collision-intent-baseline.json --json-out artifacts/seo-ai-seo-recovery/2026-07-22/collision-intent-proof.json
pnpm verify:copy-review -- --paths content/listicles/best-period-tracker-for-perimenopause.mdx,content/listicles/best-period-tracker-perimenopause.mdx,content/guides/school-devices-period-tracking.mdx,content/privacy-in-practice/school-device-period-tracking-risks.mdx
node scripts/verify-claim-remediation.mjs --paths content/listicles/best-period-tracker-for-perimenopause.mdx,content/listicles/best-period-tracker-perimenopause.mdx,content/guides/school-devices-period-tracking.mdx,content/privacy-in-practice/school-device-period-tracking-risks.mdx
```

Expected: PASS; `build-content-data.mjs --check` prints `entries=559 uniqueTitles=559`, all four routes remain, the intent proof contains two passing pair comparisons, and the scoped claim gate prints `baseline=2 reconciled=2 unresolved=0`. The three collision files with no July 22 baseline row still receive a clean live scan and copy-review proof.

- [ ] **Step 8: Return the collision batch for orchestrator-only exact staging**

```powershell
node scripts/write-content-batch-manifest.mjs --task 7 --allow content/listicles/best-period-tracker-for-perimenopause.mdx,content/listicles/best-period-tracker-perimenopause.mdx,content/guides/school-devices-period-tracking.mdx,content/privacy-in-practice/school-device-period-tracking-risks.mdx,scripts/build-content-data.mjs,scripts/generated-surfaces.test.ts,scripts/verify-content-intent.mjs,scripts/content-intent.test.ts,docs/seo-400/recovery-2026-07-22/claim-ledger/listicles.json,docs/seo-400/recovery-2026-07-22/claim-ledger/guides.json,docs/seo-400/recovery-2026-07-22/claim-ledger/privacy-in-practice.json,docs/seo-400/recovery-2026-07-22/claim-review-manifests/listicles/task-7.json,docs/seo-400/recovery-2026-07-22/claim-review-manifests/guides/task-7.json,docs/seo-400/recovery-2026-07-22/claim-review-manifests/privacy-in-practice/task-7.json,artifacts/seo-ai-seo-recovery/2026-07-22/claim-reviews/listicles,docs/seo-400/recovery-2026-07-22/copy-review-ledger/listicles/best-period-tracker-for-perimenopause.json,docs/seo-400/recovery-2026-07-22/copy-review-ledger/listicles/best-period-tracker-perimenopause.json,docs/seo-400/recovery-2026-07-22/copy-review-ledger/guides/school-devices-period-tracking.json,docs/seo-400/recovery-2026-07-22/copy-review-ledger/privacy-in-practice/school-device-period-tracking-risks.json,artifacts/seo-ai-seo-recovery/2026-07-22/copy-review/listicles/best-period-tracker-for-perimenopause,artifacts/seo-ai-seo-recovery/2026-07-22/copy-review/listicles/best-period-tracker-perimenopause,artifacts/seo-ai-seo-recovery/2026-07-22/copy-review/guides/school-devices-period-tracking,artifacts/seo-ai-seo-recovery/2026-07-22/copy-review/privacy-in-practice/school-device-period-tracking-risks,artifacts/seo-ai-seo-recovery/2026-07-22/copy-skill-dispatches,artifacts/seo-ai-seo-recovery/2026-07-22/copy-skill-agent-reports,artifacts/seo-ai-seo-recovery/2026-07-22/copy-skill-review-verdicts,artifacts/seo-ai-seo-recovery/2026-07-22/collision-intent-baseline.json,artifacts/seo-ai-seo-recovery/2026-07-22/collision-intent-proof.json --out artifacts/seo-ai-seo-recovery/2026-07-22/content-batches/task-7.json
$batch = Get-Content -Raw artifacts/seo-ai-seo-recovery/2026-07-22/content-batches/task-7.json | ConvertFrom-Json
git add -- @($batch.paths.path) artifacts/seo-ai-seo-recovery/2026-07-22/content-batches/task-7.json
git commit -m "fix(seo): separate overlapping content intent"
```

#### Required protocol for Tasks 8-14

Every content implementer first passes the fresh-session advertised-catalog gate from Task 5, receives an explicit path allowlist, and writes only its assigned MDX files, matching claim-ledger partition, matching per-file copy-review shards/artifacts, and matching per-collection source-snapshot directory. Agents never stage or commit. For each baseline row, the implementer records the exact final sentence/value, normalized final hash, current AST/field locator, rendered CSS selector or generated field path, every source locator/snapshot/hash/date, and the semantic review approval. Reviewers reject a row when the exact final wording is broader than the cited support, when an official/current source was reasonably available but not used without rationale, or when any factual wording survives under `qualified` without evidence.

After spec, evidence, and copy review are clean, the orchestrator runs `pnpm verify:claim-reviews -- --task N` plus the task's listed scoped gates. The task review gate must report every owned row, exactly four stages per row, zero missing/duplicate IDs, and zero evidence hash mismatches before staging. The orchestrator then calls `write-content-batch-manifest.mjs` with only the task's allowed prefixes/exact files, inspects every manifest path and SHA-256, and stages only `@($batch.paths.path)` plus that task manifest. A path owned by Task 7 is forbidden in Tasks 9, 11, and 13. No task stages an entire shared recovery root.

### Task 8: Reconcile the 174 State-Page Findings

**Files:**
- Modify: `content/reproductive-privacy-state-pages/*.mdx`
- Modify: `docs/seo-400/recovery-2026-07-22/claim-ledger/reproductive-privacy-state-pages.json`
- Create: per-file records under `docs/seo-400/recovery-2026-07-22/copy-review-ledger/reproductive-privacy-state-pages/`

**Interfaces:**
- Consumes: scanner, citation renderer, ledger, and copy gate from Tasks 2-5.
- Produces: 174 approved dispositions with current official legal support and zero unresolved live findings in this collection.

- [ ] **Step 1: Run the scoped scanner and save the exact red inventory**

Run: `node scripts/audit-claims.mjs --collection reproductive-privacy-state-pages --format summary`

Expected: `174 baseline rows` and a non-zero unresolved count.

- [ ] **Step 2: Remediate claims using official state or federal legal material**

For each row, verify the nearby statement against a statute, legislature, AG, court, or government page; then source, qualify, remove, deduplicate, or document a genuine false positive. Preserve `relevantLaws`, state risk metadata, and every URL.

- [ ] **Step 3: Run ordered copy review and adversarial legal-evidence review**

Record the four copy stages for every edited MDX file. A separate evidence reviewer must reject any source that is merely reachable, stale, secondary when a primary source exists, or semantically unrelated.

- [ ] **Step 4: Run scoped gates**

Run:

```powershell
node scripts/verify-claim-remediation.mjs --collection reproductive-privacy-state-pages
pnpm verify:copy-review -- --collection reproductive-privacy-state-pages
pnpm verify:sources -- --collection reproductive-privacy-state-pages --no-report --fail-on-error
```

Expected: `baseline=174 reconciled=174 unresolved=0 reviewerRejected=0` and no unreachable required source.

- [ ] **Step 5: Return the state batch for orchestrator-only exact staging**

```powershell
node scripts/write-content-batch-manifest.mjs --task 8 --allow content/reproductive-privacy-state-pages,docs/seo-400/recovery-2026-07-22/claim-ledger/reproductive-privacy-state-pages.json,docs/seo-400/recovery-2026-07-22/claim-review-manifests/reproductive-privacy-state-pages/task-8.json,docs/seo-400/recovery-2026-07-22/copy-review-ledger/reproductive-privacy-state-pages,docs/seo-400/recovery-2026-07-22/source-snapshots/reproductive-privacy-state-pages,artifacts/seo-ai-seo-recovery/2026-07-22/claim-reviews/reproductive-privacy-state-pages,artifacts/seo-ai-seo-recovery/2026-07-22/copy-review/reproductive-privacy-state-pages,artifacts/seo-ai-seo-recovery/2026-07-22/copy-skill-dispatches,artifacts/seo-ai-seo-recovery/2026-07-22/copy-skill-agent-reports,artifacts/seo-ai-seo-recovery/2026-07-22/copy-skill-review-verdicts --out artifacts/seo-ai-seo-recovery/2026-07-22/content-batches/task-8.json
$batch = Get-Content -Raw artifacts/seo-ai-seo-recovery/2026-07-22/content-batches/task-8.json | ConvertFrom-Json
git add -- @($batch.paths.path) artifacts/seo-ai-seo-recovery/2026-07-22/content-batches/task-8.json
git commit -m "fix(content): source state privacy claims"
```

### Task 9: Reconcile the Remaining 286 Guide Findings

**Files:**
- Modify: `content/guides/*.mdx` except `content/guides/school-devices-period-tracking.mdx`, which Task 7 owns and which has zero frozen baseline rows.
- Modify: `docs/seo-400/recovery-2026-07-22/claim-ledger/guides.json`
- Create: per-file records under `docs/seo-400/recovery-2026-07-22/copy-review-ledger/guides/`

**Interfaces:**
- Consumes: the same gates as Task 8.
- Produces: 286 approved guide dispositions and zero unresolved guide findings.

- [ ] **Step 1: Confirm the scoped red inventory**

Run: `node scripts/audit-claims.mjs --collection guides --format summary`

Expected: `286 baseline rows` with unresolved findings.

- [ ] **Step 2: Split write ownership alphabetically and remediate all guide claims**

Use three fresh agents sequentially with disjoint filename ranges `a-h`, `i-p`, and `q-z`, with `school-devices-period-tracking.mdx` explicitly excluded from the `q-z` allowlist. Each agent owns only its MDX files, matching per-file copy shards/artifacts, source snapshots, and a matching temporary ledger fragment. After each range passes review, the orchestrator records its exact reviewed-path/hash fragment without staging, then dispatches the next disjoint implementer. After all three ranges, the orchestrator merges fragments into `guides.json`, checks all 286 stable IDs exactly once, proves the excluded Task 7 path did not change, writes the one Task 9 manifest, and stages/commits only that final reviewed manifest.

- [ ] **Step 3: Run ordered copy and independent evidence review per range**

Health claims prefer public-health, professional clinical, or primary research sources. Legal/privacy/enforcement claims prefer the official authority. Vendor behavior and prices require official current product material plus a verification date.

- [ ] **Step 4: Run scoped gates**

Run:

```powershell
node scripts/verify-claim-remediation.mjs --collection guides
pnpm verify:copy-review -- --collection guides --exclude-path content/guides/school-devices-period-tracking.mdx
pnpm verify:sources -- --collection guides --no-report --fail-on-error
```

Expected: `baseline=286 reconciled=286 unresolved=0 reviewerRejected=0`.

- [ ] **Step 5: Return the guide batch for orchestrator-only exact staging**

```powershell
node scripts/write-content-batch-manifest.mjs --task 9 --allow content/guides,docs/seo-400/recovery-2026-07-22/claim-ledger/guides.json,docs/seo-400/recovery-2026-07-22/claim-review-manifests/guides/task-9.json,docs/seo-400/recovery-2026-07-22/copy-review-ledger/guides,docs/seo-400/recovery-2026-07-22/source-snapshots/guides,artifacts/seo-ai-seo-recovery/2026-07-22/claim-reviews/guides,artifacts/seo-ai-seo-recovery/2026-07-22/copy-review/guides,artifacts/seo-ai-seo-recovery/2026-07-22/copy-skill-dispatches,artifacts/seo-ai-seo-recovery/2026-07-22/copy-skill-agent-reports,artifacts/seo-ai-seo-recovery/2026-07-22/copy-skill-review-verdicts --deny content/guides/school-devices-period-tracking.mdx,docs/seo-400/recovery-2026-07-22/copy-review-ledger/guides/school-devices-period-tracking.json,artifacts/seo-ai-seo-recovery/2026-07-22/copy-review/guides/school-devices-period-tracking --out artifacts/seo-ai-seo-recovery/2026-07-22/content-batches/task-9.json
$batch = Get-Content -Raw artifacts/seo-ai-seo-recovery/2026-07-22/content-batches/task-9.json | ConvertFrom-Json
git add -- @($batch.paths.path) artifacts/seo-ai-seo-recovery/2026-07-22/content-batches/task-9.json
git commit -m "fix(content): source privacy guide claims"
```

### Task 10: Reconcile 181 High-Risk Comparison and Alternative Findings

**Files:**
- Modify: `content/comparisons/*.mdx`
- Modify: `content/alternatives/*.mdx`
- Modify: matching two ledger JSON files
- Create: per-file records under the `copy-review-ledger/comparisons/` and `copy-review-ledger/alternatives/` directories

**Interfaces:**
- Consumes: official vendor, regulator, court, and settlement evidence.
- Produces: 115 comparison and 66 alternative dispositions with zero unresolved findings.

- [ ] **Step 1: Confirm both scoped inventories**

Run: `node scripts/audit-claims.mjs --collection comparisons,alternatives --format summary`

Expected: `181 baseline rows`.

- [ ] **Step 2: Remediate with separate directory owners**

One implementer owns comparisons and one owns alternatives. Preserve Floriva-first ordering where the existing product-alignment gate requires it, but remove or qualify any superiority, pricing, capability, privacy, or enforcement statement the evidence does not prove.

- [ ] **Step 3: Run ordered copy review and a separate commercial-claims evidence review**

The reviewer must check each current vendor claim against an official current page and each enforcement statement against the regulator, court, or settlement record.

- [ ] **Step 4: Run scoped gates**

Run:

```powershell
node scripts/verify-claim-remediation.mjs --collection comparisons,alternatives
pnpm verify:copy-review -- --collection comparisons,alternatives
pnpm verify:product-alignment
pnpm verify:sources -- --collection comparisons,alternatives --no-report --fail-on-error
```

Expected: `baseline=181 reconciled=181 unresolved=0 reviewerRejected=0` and product alignment passes.

- [ ] **Step 5: Return the commercial comparison batch for orchestrator-only exact staging**

```powershell
node scripts/write-content-batch-manifest.mjs --task 10 --allow content/comparisons,content/alternatives,docs/seo-400/recovery-2026-07-22/claim-ledger/comparisons.json,docs/seo-400/recovery-2026-07-22/claim-ledger/alternatives.json,docs/seo-400/recovery-2026-07-22/claim-review-manifests/comparisons/task-10.json,docs/seo-400/recovery-2026-07-22/claim-review-manifests/alternatives/task-10.json,docs/seo-400/recovery-2026-07-22/copy-review-ledger/comparisons,docs/seo-400/recovery-2026-07-22/copy-review-ledger/alternatives,docs/seo-400/recovery-2026-07-22/source-snapshots/comparisons,docs/seo-400/recovery-2026-07-22/source-snapshots/alternatives,artifacts/seo-ai-seo-recovery/2026-07-22/claim-reviews/comparisons,artifacts/seo-ai-seo-recovery/2026-07-22/claim-reviews/alternatives,artifacts/seo-ai-seo-recovery/2026-07-22/copy-review/comparisons,artifacts/seo-ai-seo-recovery/2026-07-22/copy-review/alternatives,artifacts/seo-ai-seo-recovery/2026-07-22/copy-skill-dispatches,artifacts/seo-ai-seo-recovery/2026-07-22/copy-skill-agent-reports,artifacts/seo-ai-seo-recovery/2026-07-22/copy-skill-review-verdicts --out artifacts/seo-ai-seo-recovery/2026-07-22/content-batches/task-10.json
$batch = Get-Content -Raw artifacts/seo-ai-seo-recovery/2026-07-22/content-batches/task-10.json | ConvertFrom-Json
git add -- @($batch.paths.path) artifacts/seo-ai-seo-recovery/2026-07-22/content-batches/task-10.json
git commit -m "fix(content): verify comparison claims"
```

### Task 11: Reconcile the Remaining 100 Listicle and Pricing Findings

**Files:**
- Modify: `content/listicles/*.mdx` except the two perimenopause collision files owned by Task 7.
- Modify: `content/pricing-breakdowns/*.mdx`
- Modify: matching two ledger JSON files
- Create: per-file records under the `copy-review-ledger/listicles/` and `copy-review-ledger/pricing-breakdowns/` directories

**Interfaces:**
- Consumes: current official product and pricing pages with checked dates.
- Produces: 50 remaining listicle and 50 pricing dispositions with zero unresolved findings. Task 7 already reconciles the other 2 listicle baseline rows, so Tasks 7 and 11 total the frozen 52-row listicle partition exactly once.

- [ ] **Step 1: Confirm the scoped inventory**

Run: `node scripts/audit-claims.mjs --collection listicles,pricing-breakdowns --exclude-path content/listicles/best-period-tracker-for-perimenopause.mdx --exclude-path content/listicles/best-period-tracker-perimenopause.mdx --format summary`

Expected: `100 owned baseline rows`; the command may also report `2 excludedTask7Rows` and must fail if the partition arithmetic is not `50 + 2 = 52` for listicles and `50` for pricing.

- [ ] **Step 2: Remediate both directories without weakening ranking language beyond evidence**

Keep listicle tools and pricing tiers/hidden costs/table data intact. Explicitly exclude `content/listicles/best-period-tracker-for-perimenopause.mdx` and `content/listicles/best-period-tracker-perimenopause.mdx` from every agent allowlist. Replace stale exact prices with current cited prices and checked dates, or use honest non-specific wording when regional/current pricing cannot be proven.

- [ ] **Step 3: Run ordered copy and adversarial recommendation review**

The reviewer must distinguish sourced product facts from Floriva's clearly labeled editorial recommendation and reject fabricated precision.

- [ ] **Step 4: Run scoped gates**

Run:

```powershell
node scripts/verify-claim-remediation.mjs --collection listicles,pricing-breakdowns --exclude-path content/listicles/best-period-tracker-for-perimenopause.mdx --exclude-path content/listicles/best-period-tracker-perimenopause.mdx
pnpm verify:copy-review -- --collection listicles,pricing-breakdowns --exclude-path content/listicles/best-period-tracker-for-perimenopause.mdx --exclude-path content/listicles/best-period-tracker-perimenopause.mdx
pnpm verify:product-alignment
pnpm verify:sources -- --collection listicles,pricing-breakdowns --no-report --fail-on-error
```

Expected: `baseline=100 reconciled=100 unresolved=0 reviewerRejected=0`, with both excluded files unchanged from Task 7.

- [ ] **Step 5: Return the recommendation/pricing batch for orchestrator-only exact staging**

```powershell
node scripts/write-content-batch-manifest.mjs --task 11 --allow content/listicles,content/pricing-breakdowns,docs/seo-400/recovery-2026-07-22/claim-ledger/listicles.json,docs/seo-400/recovery-2026-07-22/claim-ledger/pricing-breakdowns.json,docs/seo-400/recovery-2026-07-22/claim-review-manifests/listicles/task-11.json,docs/seo-400/recovery-2026-07-22/claim-review-manifests/pricing-breakdowns/task-11.json,docs/seo-400/recovery-2026-07-22/copy-review-ledger/listicles,docs/seo-400/recovery-2026-07-22/copy-review-ledger/pricing-breakdowns,docs/seo-400/recovery-2026-07-22/source-snapshots/listicles,docs/seo-400/recovery-2026-07-22/source-snapshots/pricing-breakdowns,artifacts/seo-ai-seo-recovery/2026-07-22/claim-reviews/listicles,artifacts/seo-ai-seo-recovery/2026-07-22/claim-reviews/pricing-breakdowns,artifacts/seo-ai-seo-recovery/2026-07-22/copy-review/listicles,artifacts/seo-ai-seo-recovery/2026-07-22/copy-review/pricing-breakdowns,artifacts/seo-ai-seo-recovery/2026-07-22/copy-skill-dispatches,artifacts/seo-ai-seo-recovery/2026-07-22/copy-skill-agent-reports,artifacts/seo-ai-seo-recovery/2026-07-22/copy-skill-review-verdicts --deny content/listicles/best-period-tracker-for-perimenopause.mdx,content/listicles/best-period-tracker-perimenopause.mdx,docs/seo-400/recovery-2026-07-22/copy-review-ledger/listicles/best-period-tracker-for-perimenopause.json,docs/seo-400/recovery-2026-07-22/copy-review-ledger/listicles/best-period-tracker-perimenopause.json,artifacts/seo-ai-seo-recovery/2026-07-22/copy-review/listicles/best-period-tracker-for-perimenopause,artifacts/seo-ai-seo-recovery/2026-07-22/copy-review/listicles/best-period-tracker-perimenopause --out artifacts/seo-ai-seo-recovery/2026-07-22/content-batches/task-11.json
$batch = Get-Content -Raw artifacts/seo-ai-seo-recovery/2026-07-22/content-batches/task-11.json | ConvertFrom-Json
git add -- @($batch.paths.path) artifacts/seo-ai-seo-recovery/2026-07-22/content-batches/task-11.json
git commit -m "fix(content): verify ranking and pricing claims"
```

### Task 12: Reconcile 98 Medium-Risk Health Findings

**Files:**
- Modify: `content/condition-guides/*.mdx`
- Modify: `content/hormone-guides/*.mdx`
- Modify: `content/life-stage-guides/*.mdx`
- Modify: `content/symptom-guides/*.mdx`
- Modify: `content/wellness-guides/*.mdx`
- Modify: matching five ledger JSON files
- Create: per-file records under the five matching health collection directories in `copy-review-ledger/`

**Interfaces:**
- Consumes: current authoritative medical evidence.
- Produces: 17 condition, 5 hormone, 7 life-stage, 39 symptom, and 30 wellness dispositions with zero unresolved findings.

- [ ] **Step 1: Confirm the five-collection inventory**

Run: `node scripts/audit-claims.mjs --collection condition-guides,hormone-guides,life-stage-guides,symptom-guides,wellness-guides --format summary`

Expected: `98 baseline rows`.

- [ ] **Step 2: Remediate using disjoint collection ownership**

Prefer government public-health sources, professional clinical guidance, and primary peer-reviewed work appropriate to the statement. Preserve informational disclaimers and remove diagnosis, treatment, or certainty language that the source does not support.

- [ ] **Step 3: Run ordered copy review and independent medical-evidence review**

The evidence reviewer checks scope, population, certainty, publication currency, and whether advice stays informational. The reviewer does not claim clinician credentials.

- [ ] **Step 4: Run scoped gates**

Run:

```powershell
node scripts/verify-claim-remediation.mjs --collection condition-guides,hormone-guides,life-stage-guides,symptom-guides,wellness-guides
pnpm verify:copy-review -- --collection condition-guides,hormone-guides,life-stage-guides,symptom-guides,wellness-guides
pnpm verify:sources -- --collection condition-guides,hormone-guides,life-stage-guides,symptom-guides,wellness-guides --no-report --fail-on-error
```

Expected: `baseline=98 reconciled=98 unresolved=0 reviewerRejected=0`.

- [ ] **Step 5: Return the health batch for orchestrator-only exact staging**

```powershell
node scripts/write-content-batch-manifest.mjs --task 12 --allow content/condition-guides,content/hormone-guides,content/life-stage-guides,content/symptom-guides,content/wellness-guides,docs/seo-400/recovery-2026-07-22/claim-ledger/condition-guides.json,docs/seo-400/recovery-2026-07-22/claim-ledger/hormone-guides.json,docs/seo-400/recovery-2026-07-22/claim-ledger/life-stage-guides.json,docs/seo-400/recovery-2026-07-22/claim-ledger/symptom-guides.json,docs/seo-400/recovery-2026-07-22/claim-ledger/wellness-guides.json,docs/seo-400/recovery-2026-07-22/claim-review-manifests/condition-guides/task-12.json,docs/seo-400/recovery-2026-07-22/claim-review-manifests/hormone-guides/task-12.json,docs/seo-400/recovery-2026-07-22/claim-review-manifests/life-stage-guides/task-12.json,docs/seo-400/recovery-2026-07-22/claim-review-manifests/symptom-guides/task-12.json,docs/seo-400/recovery-2026-07-22/claim-review-manifests/wellness-guides/task-12.json,docs/seo-400/recovery-2026-07-22/copy-review-ledger/condition-guides,docs/seo-400/recovery-2026-07-22/copy-review-ledger/hormone-guides,docs/seo-400/recovery-2026-07-22/copy-review-ledger/life-stage-guides,docs/seo-400/recovery-2026-07-22/copy-review-ledger/symptom-guides,docs/seo-400/recovery-2026-07-22/copy-review-ledger/wellness-guides,docs/seo-400/recovery-2026-07-22/source-snapshots/condition-guides,docs/seo-400/recovery-2026-07-22/source-snapshots/hormone-guides,docs/seo-400/recovery-2026-07-22/source-snapshots/life-stage-guides,docs/seo-400/recovery-2026-07-22/source-snapshots/symptom-guides,docs/seo-400/recovery-2026-07-22/source-snapshots/wellness-guides,artifacts/seo-ai-seo-recovery/2026-07-22/claim-reviews/condition-guides,artifacts/seo-ai-seo-recovery/2026-07-22/claim-reviews/hormone-guides,artifacts/seo-ai-seo-recovery/2026-07-22/claim-reviews/life-stage-guides,artifacts/seo-ai-seo-recovery/2026-07-22/claim-reviews/symptom-guides,artifacts/seo-ai-seo-recovery/2026-07-22/claim-reviews/wellness-guides,artifacts/seo-ai-seo-recovery/2026-07-22/copy-review/condition-guides,artifacts/seo-ai-seo-recovery/2026-07-22/copy-review/hormone-guides,artifacts/seo-ai-seo-recovery/2026-07-22/copy-review/life-stage-guides,artifacts/seo-ai-seo-recovery/2026-07-22/copy-review/symptom-guides,artifacts/seo-ai-seo-recovery/2026-07-22/copy-review/wellness-guides,artifacts/seo-ai-seo-recovery/2026-07-22/copy-skill-dispatches,artifacts/seo-ai-seo-recovery/2026-07-22/copy-skill-agent-reports,artifacts/seo-ai-seo-recovery/2026-07-22/copy-skill-review-verdicts --out artifacts/seo-ai-seo-recovery/2026-07-22/content-batches/task-12.json
$batch = Get-Content -Raw artifacts/seo-ai-seo-recovery/2026-07-22/content-batches/task-12.json | ConvertFrom-Json
git add -- @($batch.paths.path) artifacts/seo-ai-seo-recovery/2026-07-22/content-batches/task-12.json
git commit -m "fix(content): source health guidance claims"
```

### Task 13: Reconcile the Remaining 89 Privacy-in-Practice Findings

**Files:**
- Modify: `content/privacy-in-practice/*.mdx` except `content/privacy-in-practice/school-device-period-tracking-risks.mdx`, which Task 7 owns and which has zero frozen baseline rows.
- Modify: `docs/seo-400/recovery-2026-07-22/claim-ledger/privacy-in-practice.json`
- Create: per-file records under `docs/seo-400/recovery-2026-07-22/copy-review-ledger/privacy-in-practice/`

**Interfaces:**
- Consumes: official platform, regulator, privacy, and technical documentation.
- Produces: 89 approved dispositions and zero unresolved findings.

- [ ] **Step 1: Confirm the scoped inventory**

Run: `node scripts/audit-claims.mjs --collection privacy-in-practice --format summary`

Expected: `89 baseline rows`.

- [ ] **Step 2: Remediate practical privacy claims**

Separate demonstrated technical behavior from cautious risk guidance. Explicitly exclude `content/privacy-in-practice/school-device-period-tracking-risks.mdx` from the agent allowlist. Do not present a VPN, device setting, browser mode, or local-storage choice as absolute protection.

- [ ] **Step 3: Run ordered copy and adversarial privacy review**

The reviewer checks technical accuracy, threat-model bounds, legal qualifiers, and that every changed recommendation fits the full page.

- [ ] **Step 4: Run scoped gates**

Run:

```powershell
node scripts/verify-claim-remediation.mjs --collection privacy-in-practice
pnpm verify:copy-review -- --collection privacy-in-practice --exclude-path content/privacy-in-practice/school-device-period-tracking-risks.mdx
pnpm verify:sources -- --collection privacy-in-practice --no-report --fail-on-error
```

Expected: `baseline=89 reconciled=89 unresolved=0 reviewerRejected=0`.

- [ ] **Step 5: Return the privacy batch for orchestrator-only exact staging**

```powershell
node scripts/write-content-batch-manifest.mjs --task 13 --allow content/privacy-in-practice,docs/seo-400/recovery-2026-07-22/claim-ledger/privacy-in-practice.json,docs/seo-400/recovery-2026-07-22/claim-review-manifests/privacy-in-practice/task-13.json,docs/seo-400/recovery-2026-07-22/copy-review-ledger/privacy-in-practice,docs/seo-400/recovery-2026-07-22/source-snapshots/privacy-in-practice,artifacts/seo-ai-seo-recovery/2026-07-22/claim-reviews/privacy-in-practice,artifacts/seo-ai-seo-recovery/2026-07-22/copy-review/privacy-in-practice,artifacts/seo-ai-seo-recovery/2026-07-22/copy-skill-dispatches,artifacts/seo-ai-seo-recovery/2026-07-22/copy-skill-agent-reports,artifacts/seo-ai-seo-recovery/2026-07-22/copy-skill-review-verdicts --deny content/privacy-in-practice/school-device-period-tracking-risks.mdx,docs/seo-400/recovery-2026-07-22/copy-review-ledger/privacy-in-practice/school-device-period-tracking-risks.json,artifacts/seo-ai-seo-recovery/2026-07-22/copy-review/privacy-in-practice/school-device-period-tracking-risks --out artifacts/seo-ai-seo-recovery/2026-07-22/content-batches/task-13.json
$batch = Get-Content -Raw artifacts/seo-ai-seo-recovery/2026-07-22/content-batches/task-13.json | ConvertFrom-Json
git add -- @($batch.paths.path) artifacts/seo-ai-seo-recovery/2026-07-22/content-batches/task-13.json
git commit -m "fix(content): source practical privacy claims"
```

### Task 14: Reconcile the Final 80 Lead-Magnet, App-Guide, and Questionnaire Findings

**Files:**
- Modify: `content/lead-magnets/*.mdx`
- Modify: `content/app-guides/*.mdx`
- Modify: `content/questionnaires/*.mdx`
- Modify: matching three ledger JSON files
- Create: per-file records under the `copy-review-ledger/lead-magnets/`, `copy-review-ledger/app-guides/`, and `copy-review-ledger/questionnaires/` directories

**Interfaces:**
- Consumes: existing lead-magnet payloads and the same evidence gates.
- Produces: 46 lead-magnet, 26 app-guide, and 8 questionnaire dispositions with zero unresolved findings.

- [ ] **Step 1: Confirm the scoped inventory**

Run: `node scripts/audit-claims.mjs --collection lead-magnets,app-guides,questionnaires --format summary`

Expected: `80 baseline rows`.

- [ ] **Step 2: Remediate all three directories with disjoint owners**

Preserve lead-magnet delivery fields, questionnaire behavior, related pages, and verified Floriva capability boundaries. Product behavior must match the current repo source of truth; health statements require authoritative evidence.

- [ ] **Step 3: Run ordered copy, funnel-context, and evidence reviews**

The independent reviewer checks that simplified copy remains true in the landing page, form, download, and app-guide context.

- [ ] **Step 4: Run scoped gates**

Run:

```powershell
node scripts/verify-claim-remediation.mjs --collection lead-magnets,app-guides,questionnaires
pnpm verify:copy-review -- --collection lead-magnets,app-guides,questionnaires
pnpm verify:product-alignment
pnpm verify:sources -- --collection lead-magnets,app-guides,questionnaires --no-report --fail-on-error
```

Expected: `baseline=80 reconciled=80 unresolved=0 reviewerRejected=0`.

- [ ] **Step 5: Return the final content batch for orchestrator-only exact staging**

```powershell
node scripts/write-content-batch-manifest.mjs --task 14 --allow content/lead-magnets,content/app-guides,content/questionnaires,docs/seo-400/recovery-2026-07-22/claim-ledger/lead-magnets.json,docs/seo-400/recovery-2026-07-22/claim-ledger/app-guides.json,docs/seo-400/recovery-2026-07-22/claim-ledger/questionnaires.json,docs/seo-400/recovery-2026-07-22/claim-review-manifests/lead-magnets/task-14.json,docs/seo-400/recovery-2026-07-22/claim-review-manifests/app-guides/task-14.json,docs/seo-400/recovery-2026-07-22/claim-review-manifests/questionnaires/task-14.json,docs/seo-400/recovery-2026-07-22/copy-review-ledger/lead-magnets,docs/seo-400/recovery-2026-07-22/copy-review-ledger/app-guides,docs/seo-400/recovery-2026-07-22/copy-review-ledger/questionnaires,docs/seo-400/recovery-2026-07-22/source-snapshots/lead-magnets,docs/seo-400/recovery-2026-07-22/source-snapshots/app-guides,docs/seo-400/recovery-2026-07-22/source-snapshots/questionnaires,artifacts/seo-ai-seo-recovery/2026-07-22/claim-reviews/lead-magnets,artifacts/seo-ai-seo-recovery/2026-07-22/claim-reviews/app-guides,artifacts/seo-ai-seo-recovery/2026-07-22/claim-reviews/questionnaires,artifacts/seo-ai-seo-recovery/2026-07-22/copy-review/lead-magnets,artifacts/seo-ai-seo-recovery/2026-07-22/copy-review/app-guides,artifacts/seo-ai-seo-recovery/2026-07-22/copy-review/questionnaires,artifacts/seo-ai-seo-recovery/2026-07-22/copy-skill-dispatches,artifacts/seo-ai-seo-recovery/2026-07-22/copy-skill-agent-reports,artifacts/seo-ai-seo-recovery/2026-07-22/copy-skill-review-verdicts --out artifacts/seo-ai-seo-recovery/2026-07-22/content-batches/task-14.json
$batch = Get-Content -Raw artifacts/seo-ai-seo-recovery/2026-07-22/content-batches/task-14.json | ConvertFrom-Json
git add -- @($batch.paths.path) artifacts/seo-ai-seo-recovery/2026-07-22/content-batches/task-14.json
git commit -m "fix(content): verify tool and app guide claims"
```

### Task 15: Block on Full Reconciliation and Regenerate Shared Content Once

**Files:**
- Modify: `scripts/verify-claim-remediation.mjs`
- Extend: `scripts/claim-remediation.test.ts`
- Modify: `scripts/verify-sources.mjs:1-235`
- Modify: `package.json:17-48`
- Regenerate: `src/site/generated/content-data.ts`
- Regenerate: `src/site/generated/content-index.ts`
- Regenerate: `src/site/content-manifest.ts`
- Regenerate: `src/site/generated/bodies/*.ts`
- Regenerate: `public/sitemap.xml`
- Regenerate: `public/llms.txt`
- Create: `artifacts/seo-ai-seo-recovery/2026-07-22/content-remediation-manifest.json`
- Create: `scripts/build-approved-fact-evidence.mjs`
- Create: `scripts/run-content-evidence-gates.mjs`
- Create: `scripts/generate-content-remediation-manifest.mjs`
- Create: `scripts/verify-content-remediation-manifest.mjs`
- Create: `scripts/content-remediation-manifest.test.ts`
- Generate: `src/site/generated/approved-public-fact-evidence.json`
- Create: `artifacts/seo-ai-seo-recovery/2026-07-22/content-gate-results.json` plus hashed stdout/stderr files.
- Create: three durable exhaustive verdicts and coverage files under `artifacts/seo-ai-seo-recovery/2026-07-22/final-content-reviews/`.

**Interfaces:**
- Consumes: all fifteen ledger partitions, all edited MDX, ordered copy proof, and the frozen baseline.
- Produces: one blocking repository result with exact baseline/live/citation/source/reviewer/copy counts.

- [ ] **Step 1: Add failing end-to-end reconciliation tests**

```ts
import path from "node:path";
import { fileURLToPath } from "node:url";
import { expect, it } from "vitest";
import { assertCleanSummary, verifyClaimRemediation } from "./verify-claim-remediation.mjs";

const rootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

it("proves the frozen and live claim sets are fully closed", async () => {
  const result = await verifyClaimRemediation(rootDir);
  expect(result).toMatchObject({
    baselineTotal: 1010,
    reconciledBaseline: 1010,
    unresolvedBaseline: 0,
    unresolvedLive: 0,
    rejectedReviews: 0,
    sourceRejected: 0,
    duplicateInvalid: 0,
    missingCitationTargets: 0,
    copyReviewFailures: 0,
    claimReviewCovered: 1010,
    claimReviewMissing: 0,
    claimReviewDuplicate: 0,
  });
  expect(() => assertCleanSummary({ ...result, reconciledBaseline: 1009 })).toThrow(/reconciledBaseline=1009/);
  expect(() => assertCleanSummary({ ...result, baselineTotal: 1009, reconciledBaseline: 1009 })).toThrow(/baselineTotal=1009/);
});
```

- [ ] **Step 2: Run the test before final integration**

Run: `pnpm vitest run scripts/claim-remediation.test.ts`

Expected: FAIL with exact unresolved IDs, missing citation targets, rejected reviews, or incomplete copy proof if any batch is incomplete.

Add `content-remediation-manifest.test.ts` fixtures that reject hand-entered counts, a non-zero/missing command exit, stdout/stderr hash drift, any missing Task 1-15 batch manifest, a changed batch hash, missing claim/source/copy approval paths, an approval hash that does not match file bytes, sampled reviewer coverage, an unnamed/same-as-implementer reviewer, and a generated manifest changed after derivation.

- [ ] **Step 3: Implement the final verifier and deterministic source report mode**

```js
export function buildRemediationSummary({ baseline, approvedById, missingBaselineIds, liveFindings, rejectedRows, brokenCitationTargets, copyFailures }) {
  return {
    baselineTotal: baseline.length,
    reconciledBaseline: baseline.filter((row) => approvedById.has(row.baselineId)).length,
    unresolvedBaseline: missingBaselineIds.length,
    unresolvedLive: liveFindings.length,
    rejectedReviews: rejectedRows.length,
    missingCitationTargets: brokenCitationTargets.length,
    copyReviewFailures: copyFailures.length,
  };
}

export function assertCleanSummary(summary) {
  if (summary.baselineTotal !== 1010) throw new Error(`baselineTotal=${summary.baselineTotal}; expected 1010`);
  if (summary.reconciledBaseline !== summary.baselineTotal) throw new Error(`reconciledBaseline=${summary.reconciledBaseline}; expected ${summary.baselineTotal}`);
  const failures = Object.entries(summary).filter(([key, value]) => !["baselineTotal", "reconciledBaseline"].includes(key) && value !== 0);
  if (failures.length > 0) throw new Error(failures.map(([key, value]) => `${key}=${value}`).join(" "));
  return summary;
}
```

Add `--json-out` to `verify-sources.mjs` so the proof manifest can reference a stable machine report as well as the dated Markdown report.

Implement `scripts/build-approved-fact-evidence.mjs` after the final verifier. It reads only approved live `sourced` and factual `qualified` ledger rows, groups rows that render the same normalized public proposition on the same canonical page, and writes `src/site/generated/approved-public-fact-evidence.json` with this exact schema:

```json
{
  "schemaVersion": 1,
  "baselineHash": "0000000000000000000000000000000000000000000000000000000000000000",
  "ledgerManifestHash": "0000000000000000000000000000000000000000000000000000000000000000",
  "facts": [
    {
      "factId": "fact-00000000000000000000",
      "publicText": "The exact approved rendered sentence or value.",
      "publicValue": null,
      "publicTextHash": "0000000000000000000000000000000000000000000000000000000000000000",
      "canonicalPage": "https://floriva.app/resources/guides/example",
      "renderedTarget": "main article p[data-claim-id='claim-00000000000000000000']",
      "baselineIds": ["claim-00000000000000000000"],
      "sourceEvidence": [{ "sourceId": "official-example", "snapshotHash": "0000000000000000000000000000000000000000000000000000000000000000" }],
      "reviewerApproval": { "reviewerId": "independent-evidence-reviewer", "reviewedAt": "2026-07-22", "evidenceHash": "0000000000000000000000000000000000000000000000000000000000000000" }
    }
  ]
}
```

The all-zero/example IDs are schema examples and are rejected in generated output. `factId` is the stable SHA-256 prefix of canonical page, rendered target, and public text hash. Every fact requires non-empty `baselineIds`, and each ID must resolve to an approved live factual row whose `finalTextHash`, canonical page, rendered target, source evidence IDs/hashes, and named non-implementing reviewer approval exactly match the fact. The generator rejects removed, duplicate, false-positive, pending, rejected, citation-only, or hash-divergent rows. Add tests for grouping multiple baseline IDs, stable IDs, stale text, wrong canonical page, missing source evidence, reviewer/implementer equality, and all-zero/example values. This file is the sole content-plan contract consumed by the AI public-knowledge generator; that consumer must verify both top-level hashes before use.

- [ ] **Step 4: Regenerate shared outputs once and prove the 559-route invariant**

Run:

```powershell
pnpm generate:content
node scripts/build-approved-fact-evidence.mjs --out src/site/generated/approved-public-fact-evidence.json
node scripts/build-content-data.mjs --check
pnpm vitest run scripts/content-metadata.test.ts scripts/content-intent.test.ts scripts/generated-surfaces.test.ts
node scripts/verify-content-intent.mjs --require-entry-count 559 --json-out artifacts/seo-ai-seo-recovery/2026-07-22/final-content-intent-proof.json
node scripts/build-sitemap.mjs
node scripts/build-llms-txt.mjs
$urlCount = (Select-String -Path public/sitemap.xml -Pattern '<url>' -AllMatches).Matches.Count
if ($urlCount -ne 559) { throw "Expected 559 sitemap URLs; found $urlCount" }
```

Expected: generation succeeds; the approved fact/evidence index contains only ledger-backed approved facts and passes its schema/hash tests; the built generated corpus contains exactly 559 entries and 559 normalized-unique final SEO titles; both collision pairs satisfy their intent/similarity contracts; and PowerShell exits successfully with 559 sitemap URLs.

- [ ] **Step 5: Run all content/evidence gates**

Run:

```powershell
node scripts/run-content-evidence-gates.mjs --out artifacts/seo-ai-seo-recovery/2026-07-22/content-gate-results.json
```

The runner executes this immutable ordered command list: `pnpm verify:claims`; `pnpm verify:claim-reviews`; `pnpm verify:copy-review`; `pnpm verify:sources -- --fail-on-error --json-out artifacts/seo-ai-seo-recovery/2026-07-22/source-verification.json`; `pnpm verify:product-alignment`; `pnpm verify:seo400-backlog -- --min 400`; `pnpm verify:seo400-content`; `pnpm check:links`; `pnpm typecheck`; `pnpm lint`; `pnpm build`; `pnpm test`. It runs every command even after a failure, writes immutable stdout/stderr files, and records exact argv, start/end timestamps, exit code, and recomputed stdout/stderr SHA-256. Expected: all exits are zero; claim review coverage prints `baseline=1010 owned=1010 staged=4040 missing=0 duplicate=0 evidenceHashMismatch=0`; `verify:claims` prints all-zero failure counts; generated surfaces prove 559 unique titles; build prerenders 559 routes.

- [ ] **Step 6: Implement and fixture-test manifest generation and independent validation**

```powershell
pnpm vitest run scripts/content-remediation-manifest.test.ts
```

The generator derives, never accepts as CLI counts: baseline/risk/disposition/live totals; exact 1,010-row/four-stage review coverage; every claim/source/copy approval path and recomputed hash; copy dispatch/report/verdict hashes; source snapshots; approved fact index hash; 559 route/title facts; all command exits/output hashes; named final reviewer verdicts; and SHA-256 for each Task 1-15 batch manifest. The independent validator recomputes the entire graph from disk and rejects manual count edits, missing paths, hash drift, or non-zero gates.

- [ ] **Step 7: Dispatch final adversarial reviewers**

Dispatch three named reviewers, all distinct from implementers, and persist their verdicts: `final-content-reviews/baseline-ledger-verdict.json`, `semantic-source-verdict.json`, and `public-surface-verdict.json`. Each verdict has `schemaVersion`, `reviewerId`, `reviewerTaskId`, `implementerIds`, `scope`, `coveragePath`, `coverageHash`, `evidence[]` path/hash pairs, `verdict`, `findings`, `reviewedAt`, and `reviewEvidencePath`/`reviewEvidenceHash` for the reviewer's durable work report. Baseline coverage lists all 1,010 IDs; semantic coverage lists all 1,010 IDs with their source/removal stage (no sampling); public-surface coverage lists all 559 canonical routes and every changed public-copy path. The validator recomputes coverage hashes, requires empty findings and approved verdicts, and rejects sampled/count-only coverage or missing evidence. Fix findings and rerun full affected coverage.

- [ ] **Step 8: Return final generated outputs and proof for orchestrator-only exact staging**

```powershell
node scripts/write-content-batch-manifest.mjs --task 15 --allow scripts/verify-claim-remediation.mjs,scripts/verify-claim-review-coverage.mjs,scripts/build-approved-fact-evidence.mjs,scripts/run-content-evidence-gates.mjs,scripts/generate-content-remediation-manifest.mjs,scripts/verify-content-remediation-manifest.mjs,scripts/content-remediation-manifest.test.ts,scripts/claim-remediation.test.ts,scripts/verify-sources.mjs,package.json,src/site/generated,src/site/content-manifest.ts,public/sitemap.xml,public/llms.txt,artifacts/seo-ai-seo-recovery/2026-07-22/content-gate-results.json,artifacts/seo-ai-seo-recovery/2026-07-22/content-gate-output,artifacts/seo-ai-seo-recovery/2026-07-22/source-verification.json,artifacts/seo-ai-seo-recovery/2026-07-22/final-content-intent-proof.json,artifacts/seo-ai-seo-recovery/2026-07-22/final-content-reviews --out artifacts/seo-ai-seo-recovery/2026-07-22/content-batches/task-15.json
node scripts/generate-content-remediation-manifest.mjs --batches artifacts/seo-ai-seo-recovery/2026-07-22/content-batches --gates artifacts/seo-ai-seo-recovery/2026-07-22/content-gate-results.json --reviews artifacts/seo-ai-seo-recovery/2026-07-22/final-content-reviews --out artifacts/seo-ai-seo-recovery/2026-07-22/content-remediation-manifest.json
node scripts/verify-content-remediation-manifest.mjs artifacts/seo-ai-seo-recovery/2026-07-22/content-remediation-manifest.json
pnpm vitest run scripts/content-remediation-manifest.test.ts
node scripts/write-content-batch-manifest.mjs --task 15 --allow scripts/verify-claim-remediation.mjs,scripts/verify-claim-review-coverage.mjs,scripts/build-approved-fact-evidence.mjs,scripts/run-content-evidence-gates.mjs,scripts/generate-content-remediation-manifest.mjs,scripts/verify-content-remediation-manifest.mjs,scripts/content-remediation-manifest.test.ts,scripts/claim-remediation.test.ts,scripts/verify-sources.mjs,package.json,src/site/generated,src/site/content-manifest.ts,public/sitemap.xml,public/llms.txt,artifacts/seo-ai-seo-recovery/2026-07-22/content-batches/task-15.json,artifacts/seo-ai-seo-recovery/2026-07-22/content-remediation-manifest.json,artifacts/seo-ai-seo-recovery/2026-07-22/content-gate-results.json,artifacts/seo-ai-seo-recovery/2026-07-22/content-gate-output,artifacts/seo-ai-seo-recovery/2026-07-22/source-verification.json,artifacts/seo-ai-seo-recovery/2026-07-22/final-content-intent-proof.json,artifacts/seo-ai-seo-recovery/2026-07-22/final-content-reviews --out artifacts/seo-ai-seo-recovery/2026-07-22/content-batches/task-15-stage.json
$batch = Get-Content -Raw artifacts/seo-ai-seo-recovery/2026-07-22/content-batches/task-15-stage.json | ConvertFrom-Json
git add -- @($batch.paths.path) artifacts/seo-ai-seo-recovery/2026-07-22/content-batches/task-15-stage.json
git commit -m "test(seo): prove content evidence recovery"
```

`task-15.json` is the Task 15 input batch whose hash is embedded with Tasks 1-14 in the generated proof. `task-15-stage.json` is only the final staging transport; excluding its self-referential hash avoids an impossible manifest cycle while preserving exact-path staging.

---

## Execution Handoff

Plan complete and saved to `docs/superpowers/plans/2026-07-22-content-evidence-and-metadata-recovery.md`. Two execution options:

1. **Subagent-Driven (recommended)** — dispatch a fresh subagent per task and perform spec-compliance then quality/evidence review between tasks.
2. **Inline Execution** — use `superpowers:executing-plans` in this session with checkpointed batches.

The repository policy and approved design select option 1. The orchestrator should begin with Task 1 after the sibling technical-rendering and machine-readable plans have declared their file ownership, so no agents edit `scripts/generated-surfaces.test.ts`, `src/pages/content-page.tsx`, `src/site/knowledge/index.ts`, or generated content concurrently.
