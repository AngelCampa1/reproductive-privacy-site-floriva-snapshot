# AI-Search and Production Proof Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Publish Floriva's sanitized public knowledge safely, cross-validate every machine-readable URL, preserve repeatable search/answer-engine evidence, and prove the complete SEO recovery on the exact production deployment.

**Architecture:** Deterministic build scripts create `llms.txt` and a versioned public knowledge JSON from approved evidence records. One validator runs in filesystem mode before release and HTTP mode after release; separate local and production evidence namespaces preserve GSC, broken-page, agentic-browsing, bot-equivalence, and answer-engine observations. The release runner gates one immutable `dist/`, deploys those exact bytes without rebuilding, and proves the new live release marker and asset hashes. The pre-change deployment is bound once by AI Task 1, with a provider-current plus complete asset/semantic fallback for the legacy unmarked release, and consumed unchanged by rendering proof. A final validator derives every acceptance status from command exits, artifact hashes, reviewer verdicts, and production responses instead of trusting handwritten status fields.

**Tech Stack:** Node.js ESM, Vitest, Vite/Cloudflare Pages, `public/_headers`, Playwright, repository SEO/funnel verifiers, Google Search Console, external crawl/Lighthouse evidence, and observed Google AI Overview/ChatGPT Search/Perplexity results.

## Global Constraints

- Preserve exactly 559 indexable HTML pages; `robots.txt`, `sitemap.xml`, `llms.txt`, and `public-knowledge.json` are machine artifacts outside that count.
- `/public-knowledge.json` must be crawlable and return 200 JSON with `X-Robots-Tag: noindex`; do not disallow it in robots or put it in the HTML sitemap.
- Every HTML URL in machine artifacts must be an allowed, canonical `https://floriva.app/...` page in the 559-URL sitemap and return 200.
- Public knowledge must be deterministic and sanitized. No secrets, internal paths, localhost URLs, draft markers, operational identifiers, private notes, or unsupported claims may appear.
- Public artifacts must never expose a Git SHA, branch, filesystem path, deployment identifier, or other operational fingerprint. Use a public schema version plus a deterministic digest of the sanitized approved content; use `SOURCE_DATE_EPOCH` only for a public date when the schema requires one, never wall-clock build time.
- Derive the supported crawler user agents from the explicit allowed groups in the built `robots.txt` (including `OAI-SearchBot` and `PerplexityBot`) and serve semantically equivalent public content to each crawler and an ordinary browser on all 559 sitemap routes.
- Answer-engine citations, rankings, indexing, and impressions are observations, not release pass/fail guarantees.
- A `false-positive`, `unreproducible`, or `insufficiently-specified` closure requires a finding-specific rationale, existing evidence paths with verified SHA-256 values, and approval from a named non-implementing adversarial reviewer whose durable review artifact cites that finding. An aggregate closure additionally requires the complete raw rerun/export and every available subcheck.
- External evidence must be reproducible and privacy-safe: record tool/provider version, retrieval method, request parameters, locale, authentication state (never credentials), UTC capture time, response/export SHA-256, and redaction log. Store raw and redacted artifacts separately; public/repository evidence may contain only the redacted copy and its hash. An ignored private inventory maps opaque `rawEvidenceId` values to local locators and hashes; tracked evidence never contains a raw locator.
- Do not deploy until all local rendering, content, source, machine-surface, and funnel gates pass and independent reviewers have no actionable findings.
- Every production visual change receives a non-implementing real-browser/screenshot adversary.
- Only the orchestrator stages or commits. Each stage block uses reviewed exact paths or a generated newline-delimited manifest of exact paths (no directory, wildcard, `git add .`, or broad pathspec); implementation and review agents never stage or commit.
- Release tooling and product/content changes are committed before the authoritative mutating local proof. Local proof, deployment, and production artifacts remain exact allowlisted uncommitted evidence until final closeout, so generating proof never changes the release commit it attests.

---

## File Structure

### New files

- `scripts/lib/machine-surfaces.mjs` — sitemap, llms, JSON, robots, canonical, and sanitization helpers.
- `scripts/verify-machine-readable-surfaces.mjs` — `--dist` and `--origin` gate.
- `scripts/machine-surfaces.test.ts` — deterministic artifact and exact failure tests.
- `scripts/verify-bot-equivalence.mjs` — normalized semantic comparison by user agent.
- `scripts/verify-external-seo-evidence.mjs` — evidence schema/disposition gate.
- `scripts/external-seo-evidence.test.ts` — GSC/crawl/agentic/answer-engine/proof tests.
- `scripts/run-seo-ai-recovery.mjs` — tested composed local/production runner with one owned preview lifecycle and proof capture.
- `scripts/verify-seo-ai-proof-manifest.mjs` — derives acceptance status from evidence and rejects unproven declarations.
- `scripts/compare-seo-ai-evidence-parameters.mjs` — fails when pre-change/post-change observation parameters drift.
- `scripts/deploy-verified-dist.mjs` — deploys a recorded immutable `dist/` without rebuilding and captures Cloudflare output.
- `scripts/verify-release-environment.mjs` — frozen-lockfile, runtime, dependency, browser, and platform-safe spawn preflight.
- `.floriva-private/seo-ai-seo-recovery/2026-07-22/raw-evidence-inventory.json` — ignored private `{ rawEvidenceId, opaqueLocator, sha256, byteLength }` inventory.
- `.floriva-private/seo-ai-seo-recovery/2026-07-22/rollback/` — ignored complete prior deploy bytes, descriptor, and pinned verifier; never the only durable copy.
- `artifacts/seo-ai-seo-recovery/2026-07-22/prechange/prior-deployment.json` — canonical redacted current-production binding created once by AI Task 1.
- `artifacts/seo-ai-seo-recovery/2026-07-22/{prechange,production/final}/private-backup-receipt.json` — tracked hash/provenance receipts for encrypted private R2 archives and clean-checkout restore tests.
- `artifacts/seo-ai-seo-recovery/2026-07-22/external/prechange/*.json` — immutable redacted pre-change exports.
- `artifacts/seo-ai-seo-recovery/2026-07-22/local/*.json` — local gates and preview proof only.
- `artifacts/seo-ai-seo-recovery/2026-07-22/production/technical/*.json` — deployment-bound technical/live proof only.
- `artifacts/seo-ai-seo-recovery/2026-07-22/production/final/*.json` — external observations and final closeout only.
- `artifacts/seo-ai-seo-recovery/2026-07-22/{local,production}/reviews/{seo,ai-seo,source-truth,code-quality,security-privacy,visual}.json` — six durable review verdicts, indexed and hashed by `review-index.json`.
- `artifacts/seo-ai-seo-recovery/2026-07-22/production/final/proof-manifest.json` — commit/deployment/gate/proof index.

### Modified files

- `src/site/knowledge/index.ts`, `src/site/knowledge/knowledge.test.ts` — truthful schema/version metadata and approved public fields.
- `scripts/build-public-knowledge.mjs` — deterministic generated and public copies.
- `scripts/build-llms-txt.mjs`, `scripts/generated-surfaces.test.ts` — discovery line and cross-artifact consistency.
- `public/_headers`, `public/robots.txt` — crawlable noindex JSON behavior.
- `.gitignore` — excludes `.floriva-private/seo-ai-seo-recovery/`.
- `package.json` — local and production machine/bot/external/proof gates.
- `docs/seo-400/INDEX-STATUS-LEDGER.md` — dated post-release GSC observation, not a rewritten historical snapshot.

## Fixed Answer-Engine Query Set

Use exactly: `private period tracker`; `best private period tracker`; `period tracker that doesn't sell data`; `safe period tracker after Roe v. Wade`; `school device period tracking privacy`.

For each available provider—Google AI Overviews, ChatGPT Search, and Perplexity—record provider/version, exact query, `en-US`/United States locale, authentication state (for example, `signed-out`; never a user identifier or credential), retrieval method, UTC timestamp, redacted full result or screenshot path/hash, cited URLs, and whether Floriva appears. Each record cites a privacy review/redaction log and the SHA-256 of the raw capture held outside tracked artifacts. An unavailable provider is recorded as unavailable with reason; it is never converted into a pass.

### Task 1: Freeze Reproducible External SEO Evidence

**Files:**
- Create: `scripts/verify-external-seo-evidence.mjs`
- Create: `scripts/external-seo-evidence.test.ts`
- Create: `scripts/prepare-pages-rollback.mjs`
- Create: `scripts/prepare-pages-rollback.test.ts`
- Create: `scripts/backup-private-seo-evidence.mjs`
- Create: `scripts/backup-private-seo-evidence.test.ts`
- Create: `artifacts/seo-ai-seo-recovery/2026-07-22/prechange/prior-deployment.json`
- Create: `artifacts/seo-ai-seo-recovery/2026-07-22/prechange/private-backup-receipt.json`
- Create: `artifacts/seo-ai-seo-recovery/2026-07-22/external/prechange/gsc-baseline.json`
- Create: `artifacts/seo-ai-seo-recovery/2026-07-22/external/prechange/broken-page-crawl.json`
- Create: `artifacts/seo-ai-seo-recovery/2026-07-22/external/prechange/agentic-browsing.json`
- Create: `artifacts/seo-ai-seo-recovery/2026-07-22/external/prechange/answer-engine-observations.json`
- Create: `artifacts/seo-ai-seo-recovery/2026-07-22/external/prechange/redaction-log.json`
- Create: `artifacts/seo-ai-seo-recovery/2026-07-22/external/prechange/sidecars/<provider>/<capture-id>.json` and redacted screenshot files
- Create: `artifacts/seo-ai-seo-recovery/2026-07-22/external/prechange/staging-paths.txt`
- Create: `.floriva-private/seo-ai-seo-recovery/2026-07-22/raw-evidence-inventory.json` (ignored)
- Create atomically: `.floriva-private/seo-ai-seo-recovery/2026-07-22/rollback/descriptor.json` plus complete prior static/precompiled-Functions bytes and pinned verifier bundle (ignored)
- Modify: `.gitignore`
- Modify: `package.json`

**Interfaces:**
- Produces: `validateExternalEvidence(bundle): { valid: boolean; errors: string[] }`, one canonical redacted current-production deployment binding, a durable private-backup receipt, and immutable redacted pre-change evidence consumed by Rendering Task 1 and AI Tasks 6-8. Every validator in this plan returns that same object contract; no validator sometimes returns a bare boolean.

- [ ] **Step 1: Add failing rollback-preparation and atomicity tests**

Test `prepare-pages-rollback.mjs` with provider fixtures for a downloadable deployment, a reconstruction-only deployment, a release-marker deployment, and a currently live legacy deployment without a release marker. Require exact live deployment/commit identification, complete static plus precompiled Functions/routes/config bytes, all addressable hashes, 559 semantics, true 404, provider/source hashes, pinned verifier/Wrangler, and atomic same-volume descriptor rename. The legacy fixture must bind the provider-marked current deployment only after its deployment URL and production origin match on the emitted immutable-asset manifest and normalized semantics for all 559 routes. Assert zero matches, multiple non-provider-current matches, unavailable material, or hash drift blocks deployment and leaves no descriptor. Add backup/restore fixtures that encrypt the complete rollback bundle plus raw-evidence inventory, upload to a private object-store adapter, restore into a clean temporary checkout, and revalidate every hash without reading the original local directory. Also assert the exact package-manager and Node engine declarations.

- [ ] **Step 2: Implement and run rollback preparation before release changes**

Set `packageManager: "pnpm@10.33.0"`, `engines.node: ">=22.17.1 <23"`, and add `prepare:pages-rollback` plus `backup:private-seo-evidence` to `package.json`. The preparer queries Cloudflare for the production alias's provider-marked current deployment/commit. It writes the one canonical redacted binding to `prechange/prior-deployment.json`; Rendering Task 1 must consume this file and may not rediscover production. Prefer a live release marker. For a legacy deployment with no marker, require the provider-current deployment URL and production origin to match on the complete emitted immutable-asset manifest and normalized raw-HTML semantics for all 559 routes. Historical byte-identical candidates do not replace the provider-current identity; record them as diagnostics and reject ambiguity about which provider row is current. When complete deployment bytes are downloadable, store and hash them. Otherwise reconstruct the exact prior commit with `git archive` into a temporary directory—never a branch or worktree—install with the recorded frozen lock/runtime, build static output, precompile Functions into deploy-ready `_worker.js` plus routes/config with pinned Wrangler, and store the complete deploy directory under the ignored private rollback root. Also copy a pinned standalone verifier bundle and record its hash plus `wranglerVersion`.

Run: `pnpm prepare:pages-rollback -- --origin $env:FLORIVA_PROD_URL --binding-out artifacts/seo-ai-seo-recovery/2026-07-22/prechange/prior-deployment.json --out .floriva-private/seo-ai-seo-recovery/2026-07-22/rollback/descriptor.json`

The atomic descriptor contains prior commit, deployment ID/URL/time, acquisition method, provider response hashes, source/lock/tool hashes, complete file manifest with public/non-addressable classification, verifier bundle hash, Wrangler version, and verified 559/404 results. The tracked binding contains only redacted provider/deployment identity, command/output hashes, binding method, immutable URL proof hash, production-origin proof hash, and the same deployment ID/commit; it contains no private locator.

After external raw evidence is captured, `backup-private-seo-evidence.mjs` creates an AES-256-GCM authenticated encrypted archive of the complete rollback directory, raw-evidence inventory, and every inventory-referenced raw object. Require `FLORIVA_PRIVATE_BACKUP_BUCKET`, base64 `FLORIVA_PRIVATE_BACKUP_KEY`, and non-secret `FLORIVA_PRIVATE_BACKUP_KEY_ID`; use the lock-resolved Wrangler R2 object upload/download commands with `--remote`, and store the ciphertext under an opaque random object ID. The script refuses a wrong key length, missing Cloudflare authentication, a nonexistent bucket, or a reused object ID. It writes only `prechange/private-backup-receipt.json` to Git. The receipt records provider `cloudflare-r2`, bucket, opaque object ID, ciphertext SHA-256/byte length, AES-GCM version/nonce/tag, non-secret key ID, Wrangler version, upload time, and clean-checkout restore/revalidation result/hash; it never contains the key or a raw-object locator. The restore test downloads into a fresh temporary checkout and validates the descriptor, deploy bytes, verifier bundle, raw inventory, and every referenced raw-object hash without using the original `.floriva-private` tree. Missing backup configuration, upload failure, restore failure, or hash drift blocks every later deploy. If complete static/precompiled Functions material or the durable private backup cannot be acquired, live-verified, restored, and revalidated, stop: no later deploy command may run.

- [ ] **Step 3: Write failing evidence-schema tests**

```ts
expect(validateGsc({ property: "sc-domain:floriva.app" }).errors).toContain("startDate is required");
expect(validateAnswerRows(rows)).toEqual({ valid: true, errors: [] });
expect(validateAggregateDisposition({ status: "unreproducible", rerunArtifact: null }).valid).toBe(false);
expect(validateFindingDisposition({ status: "false-positive", evidence: [], adversarialReview: null }).valid).toBe(false);
expect(validateExternalEvidence(bundleWithoutRedactionMetadata).valid).toBe(false);
expect(validatePrivateRawInventory({ records: [{ rawEvidenceId: "raw-gsc-001", opaqueLocator: "vault:7f3a", sha256: missingHash }] }).valid).toBe(false);
```

- [ ] **Step 4: Run tests and confirm the validator is absent**

Run: `pnpm vitest run scripts/prepare-pages-rollback.test.ts scripts/external-seo-evidence.test.ts`

Expected: FAIL because the rollback preparer and evidence module do not exist.

- [ ] **Step 5: Implement exact evidence schemas**

```js
export const requiredGscKeys = [
  "property", "searchType", "startDate", "endDate", "timezone",
  "countryFilter", "deviceFilter", "dimensions", "partialDayPolicy", "rows",
];

export function validateAggregateDisposition(value) {
  const errors = [];
  if (!["unreproducible", "insufficiently-specified"].includes(value.status)) {
    errors.push("aggregate status must describe an evidence limitation");
  }
  if (!value.rawEvidenceId || !value.rawRerunSha256 || !existingHashMatches(value.redactedRerunArtifact, value.redactedRerunSha256) || !value.subchecks) {
    errors.push("complete rerun/export evidence is required");
  }
  if (!value.findingId || !value.rationale || !value.adversarialReview?.reviewerId || value.adversarialReview?.nonImplementing !== true || value.adversarialReview?.approved !== true) {
    errors.push("finding-specific rationale and named non-implementing adversarial approval are required");
  }
  return { valid: errors.length === 0, errors };
}

export function validateFindingDisposition(value) {
  const errors = [];
  if (["false-positive", "unreproducible", "insufficiently-specified"].includes(value.status)) {
    if (!value.findingId) errors.push("findingId is required");
    if (!value.evidence?.every(({ path, sha256 }) => exists(path) && hash(path) === sha256)) errors.push("existing hashed closure evidence is required");
    if (!value.rationale) errors.push("finding-specific rationale is required");
    if (!value.adversarialReview?.reviewerId || value.adversarialReview?.nonImplementing !== true || value.adversarialReview?.approved !== true) errors.push("named non-implementing adversarial approval is required");
  }
  return { valid: errors.length === 0, errors };
}
```

- [ ] **Step 6: Capture the exact pre-change evidence**

Re-export GSC for `sc-domain:floriva.app`, search type `web`, all countries/devices, preserving exact date ranges and partial-day handling. Repeat/export the external broken-page crawl and agentic-browsing audit. Observe the fixed answer-engine set with the declared locale/auth state. Every tracked metadata record includes `provider`, `providerVersion`, `retrievalMethod`, exact request parameters, UTC `capturedAt`, opaque `rawEvidenceId`, and `sidecars: [{ path, sha256, mediaType }]`. Each provider response and each screenshot has its own staged redacted sidecar/file; metadata hashes those children, while no artifact stores its own hash. The ignored private inventory contains `{ rawEvidenceId, opaqueLocator, sha256, byteLength, verifiedAt }`; the validator resolves each opaque locator, requires the raw object to exist, and recomputes its hash/length. Raw exports containing account, query-history, cookie, token, or user data remain outside Git; no tracked file contains their locator.

Expected: GSC rows reconcile to the audit metrics or explicitly document the new retrieval date; the crawl retains exact broken URLs when reproducible; the agentic export retains every subcheck or an evidence-backed aggregate limitation.

Run `pnpm backup:private-seo-evidence -- --rollback .floriva-private/seo-ai-seo-recovery/2026-07-22/rollback --raw-inventory .floriva-private/seo-ai-seo-recovery/2026-07-22/raw-evidence-inventory.json --receipt artifacts/seo-ai-seo-recovery/2026-07-22/prechange/private-backup-receipt.json --restore-test`. This is mandatory, uses the configured private object-store target and backup key, and must complete its clean-checkout restore/revalidation before Step 7.

- [ ] **Step 7: Validate and commit immutable evidence**

```powershell
# Orchestrator only, after reviewing each exact path.
pnpm vitest run scripts/prepare-pages-rollback.test.ts scripts/backup-private-seo-evidence.test.ts scripts/external-seo-evidence.test.ts
node scripts/verify-external-seo-evidence.mjs --phase prechange --root artifacts/seo-ai-seo-recovery/2026-07-22/external --private-inventory .floriva-private/seo-ai-seo-recovery/2026-07-22/raw-evidence-inventory.json --backup-receipt artifacts/seo-ai-seo-recovery/2026-07-22/prechange/private-backup-receipt.json --require-clean-restore --write-staging-paths artifacts/seo-ai-seo-recovery/2026-07-22/external/prechange/staging-paths.txt
git add scripts/verify-external-seo-evidence.mjs scripts/external-seo-evidence.test.ts scripts/prepare-pages-rollback.mjs scripts/prepare-pages-rollback.test.ts scripts/backup-private-seo-evidence.mjs scripts/backup-private-seo-evidence.test.ts artifacts/seo-ai-seo-recovery/2026-07-22/prechange/prior-deployment.json artifacts/seo-ai-seo-recovery/2026-07-22/prechange/private-backup-receipt.json .gitignore package.json
git add --pathspec-from-file=artifacts/seo-ai-seo-recovery/2026-07-22/external/prechange/staging-paths.txt
git commit -m "test(seo): preserve external recovery evidence"
```

### Task 2: Publish Deterministic Public Knowledge Safely

**Files:**
- Read: `src/site/generated/approved-public-fact-evidence.json`
- Read: `artifacts/seo-ai-seo-recovery/2026-07-22/content-remediation-manifest.json`
- Modify: `src/site/knowledge/index.ts`
- Modify: `src/site/knowledge/knowledge.test.ts`
- Modify: `scripts/build-public-knowledge.mjs`
- Modify: `scripts/build-llms-txt.mjs`
- Modify: `scripts/generated-surfaces.test.ts`
- Create: `public/public-knowledge.json` (generated)
- Modify: `public/_headers`, `public/robots.txt`

**Interfaces:**
- Consumes: only the content plan's `src/site/generated/approved-public-fact-evidence.json` for factual evidence, the validated `content-remediation-manifest.json` that names/hashes it and proves zero unresolved content failures, plus existing public knowledge entries projected to non-factual route metadata.
- Produces: schema-versioned JSON at both `src/site/generated/public-knowledge.json` and `public/public-knowledge.json`; discovery line in `llms.txt`.

- [ ] **Step 1: Write failing deterministic-publication tests**

```ts
expect(publicArtifact).toEqual(generatedArtifact);
expect(publicArtifact.schemaVersion).toBe("1.0");
expect(publicArtifact.contentDigest).toMatch(/^sha256:[a-f0-9]{64}$/);
expect(JSON.stringify(publicArtifact)).not.toMatch(/\b[0-9a-f]{40}\b|deploymentId|gitSha|sourceRevision/);
expect(publicArtifact.facts.every((fact) => fact.evidenceRefs.length > 0)).toBe(true);
expect(approvedFactEvidence.schemaVersion).toBe(1);
expect(approvedFactEvidence.baselineHash).toMatch(/^[a-f0-9]{64}$/);
expect(approvedFactEvidence.ledgerManifestHash).toMatch(/^[a-f0-9]{64}$/);
expect(() => buildPublicFacts(approvedFactEvidenceWithWrongTopLevelHash)).toThrow(/top-level evidence hash/);
expect(() => buildPublicFacts(approvedFactEvidenceWithStaleFact)).toThrow(/invalid approved fact record/);
expect(() => loadAndValidateApprovedFactEvidence(evidence, failedContentProof)).toThrow(/content remediation proof/);
expect(() => assertNoClaimShapedLeaves([{ id: "x", summary: "A factual claim" }])).toThrow(/claim-shaped pages leaf/);
expect(llms).toContain("Public knowledge: https://floriva.app/public-knowledge.json");
expect(sitemap).not.toContain("public-knowledge.json");
expect(headers).toContain("X-Robots-Tag: noindex");
```

- [ ] **Step 2: Run tests and verify the public artifact is missing**

Run: `pnpm vitest run src/site/knowledge/knowledge.test.ts scripts/generated-surfaces.test.ts`

Expected: FAIL on missing public JSON/discovery/header behavior.

- [ ] **Step 3: Implement one deterministic serializer**

```js
const approvedFactEvidence = await loadAndValidateApprovedFactEvidence(
  "src/site/generated/approved-public-fact-evidence.json",
  "artifacts/seo-ai-seo-recovery/2026-07-22/content-remediation-manifest.json",
);
const facts = approvedFactEvidence.facts.map((fact) => ({
  id: fact.factId,
  statement: fact.publicText,
  value: fact.publicValue,
  canonicalPage: fact.canonicalPage,
  evidenceRefs: fact.sourceEvidence.map(({ sourceId }) => sourceId),
}));
const pages = toPublicKnowledgeArtifact().entries.map(({ id, sourceRoutes }) => ({
  id,
  routes: sourceRoutes,
}));
assertNoClaimShapedLeaves(pages);
const publicPayload = { facts, pages };
const contentDigest = `sha256:${createHash("sha256")
  .update(stableStringify(publicPayload))
  .digest("hex")}`;
const artifact = buildPublicKnowledge({
  schemaVersion: "1.0",
  contentDigest,
  ...publicPayload,
});
const serialized = `${JSON.stringify(artifact, null, 2)}\n`;
await Promise.all([generatedPath, publicPath].map((file) => fs.writeFile(file, serialized, "utf8")));
```

`loadAndValidateApprovedFactEvidence` first validates the generated content proof manifest, its success counts, and its recorded approved-fact file hash. It then accepts exactly fact schema version 1; verifies the declared top-level hashes; rejects zero/example hashes; and validates every exact fact field. This generated file is the sole fact/evidence contract. `pages` contains only public IDs and canonical route membership: no `botUse`, sales/help routing value, title, summary, description, detail, bullet, or other internal or claim-shaped leaf is allowed. A recursive test fails if internal routing metadata or any claim-shaped leaf enters `pages`; all factual prose must instead appear in `facts` with an approved `factId`.

Convert approved HTML references to canonical absolute URLs without changing non-URL values. Every factual record must map to evidence approved by the content/source-truth workstream; fail generation for a missing, unresolved, stale, or private evidence reference. Reuse the current sanitizer; expose only the documented public schema (`schemaVersion`, `contentDigest`, `facts`, and `pages`) and never internal knowledge fields or Git/deployment metadata.

- [ ] **Step 4: Add crawlable noindex response policy**

```text
/public-knowledge.json
  Content-Type: application/json; charset=utf-8
  X-Robots-Tag: noindex
```

Keep `robots.txt` free of a disallow for the artifact and retain explicit OAI/Perplexity allows.

- [ ] **Step 5: Generate, test, review, and commit**

```powershell
pnpm generate:knowledge
pnpm build
pnpm vitest run src/site/knowledge/knowledge.test.ts scripts/generated-surfaces.test.ts
# Orchestrator only, after reviewing each exact path.
git add src/site/knowledge/index.ts src/site/knowledge/knowledge.test.ts scripts/build-public-knowledge.mjs scripts/build-llms-txt.mjs scripts/generated-surfaces.test.ts src/site/generated/public-knowledge.json public/public-knowledge.json public/llms.txt public/_headers public/robots.txt
git commit -m "feat(ai-seo): publish sanitized public knowledge"
```

### Task 3: Cross-Validate Machine-Readable Surfaces

**Files:**
- Create: `scripts/lib/machine-surfaces.mjs`
- Create: `scripts/verify-machine-readable-surfaces.mjs`
- Create: `scripts/machine-surfaces.test.ts`
- Modify: `package.json`

**Interfaces:**
- Produces: `verify:machine-surfaces -- --dist dist` and `verify:machine-surfaces -- --origin $env:FLORIVA_PROD_URL`.

- [ ] **Step 1: Write failing parser and exact-error tests**

```ts
expect(validateHtmlUrl("https://floriva.app/a", sitemap)).toEqual({ valid: true, errors: [] });
expect(validateHtmlUrl("http://localhost/a", sitemap).errors).toContain("non-production URL");
expect(validateArtifactHeaders({ xRobotsTag: null }).errors).toContain("missing X-Robots-Tag: noindex");
```

- [ ] **Step 2: Run tests and confirm missing validator**

Run: `pnpm vitest run scripts/machine-surfaces.test.ts`

Expected: FAIL on missing exports.

- [ ] **Step 3: Implement filesystem and HTTP adapters**

```js
export async function loadSurface(mode) {
  if (mode.dist) return loadDistSurface(resolve(mode.dist));
  if (mode.origin) return fetchOriginSurface(new URL(mode.origin));
  throw new Error("Provide exactly one of --dist or --origin");
}
```

Validate exactly 559 sitemap HTML URLs; all Floriva HTML URLs in llms/public knowledge are HTTPS canonical members and 200; JSON content/schema/sanitization; artifact absence from sitemap; no robots block; required bot allows; and exact offending field/URL errors. All exported validators return `{ valid, errors }`, and the CLI exits non-zero when `valid` is false.

- [ ] **Step 4: Run local validation**

Run:

```powershell
pnpm build
node scripts/verify-machine-readable-surfaces.mjs --dist dist
```

Expected: `htmlPages=559 publicKnowledge=valid llmsUrls=valid robots=valid`.

- [ ] **Step 5: Commit the gate**

```powershell
# Orchestrator only, after reviewing each exact path.
git add scripts/lib/machine-surfaces.mjs scripts/verify-machine-readable-surfaces.mjs scripts/machine-surfaces.test.ts package.json
git commit -m "test(ai-seo): validate machine-readable surfaces"
```

### Task 4: Prove Bot/User Semantic Equivalence

**Files:**
- Create: `scripts/verify-bot-equivalence.mjs`
- Modify: `scripts/machine-surfaces.test.ts`, `package.json`

**Interfaces:**
- Produces: normalized semantic comparison for every URL in the built or live sitemap using an ordinary browser user agent plus every explicitly allowed crawler group parsed from the corresponding built or live `robots.txt`. The output records 559 routes, the derived user-agent set, status, canonical, visible semantics, and normalized JSON-LD hashes.

- [ ] **Step 1: Write failing normalization tests**

```ts
expect(semanticHash(htmlWithNonceA)).toBe(semanticHash(htmlWithNonceB));
expect(semanticHash("<main>A</main>")).not.toBe(semanticHash("<main>B</main>"));
expect(parseAllowedCrawlerUserAgents(robots)).toEqual([
  "GPTBot", "ChatGPT-User", "OAI-SearchBot", "ClaudeBot", "Claude-Web",
  "anthropic-ai", "PerplexityBot", "Google-Extended", "CCBot",
  "Amazonbot", "Applebot-Extended",
]);
expect(assertEveryNamedAllowedGroupTested(robots, proofRows).valid).toBe(true);
expect(validateBotEquivalence({ sitemapUrlCount: 558, rows: [] }).valid).toBe(false);
```

- [ ] **Step 2: Implement deterministic semantic hashing**

Parse every sitemap URL and every named user-agent group with an effective `Allow` from the paired `robots.txt`; never maintain a separate hand-authored runtime crawler list. The test fixture freezes the currently expected named groups above so silently dropping a robots group fails. Parse and normalize every `application/ld+json` block before stripping other scripts/styles, comments, nonce values, timestamps, analytics identifiers, and insignificant whitespace. Compare status, canonical, visible text, heading order, link destinations, JSON-LD graph node types/IDs/properties, and a sorted normalized JSON-LD hash. A hash match alone is insufficient if parsing failed or semantic fields differ.

- [ ] **Step 3: Run against an owned ephemeral dist preview**

Run: `node scripts/verify-bot-equivalence.mjs --dist dist --namespace local --out artifacts/seo-ai-seo-recovery/2026-07-22/local/bot-equivalence.json`

`--dist` starts one ephemeral static preview on an OS-assigned port, polls readiness, runs the complete matrix, and terminates only its own child in `finally`. It refuses an already occupied supplied port. `--origin` remains available only when the caller explicitly owns that origin.

Expected: `routes=559`; every route has equal ordinary-browser/every-named-allowed-group semantics and returns the same status/canonical; the output contains no omitted sitemap route, omitted named allowed group, or unparsed JSON-LD block.

- [ ] **Step 4: Review and commit**

```powershell
pnpm vitest run scripts/machine-surfaces.test.ts
# Orchestrator only, after reviewing each exact path.
git add scripts/verify-bot-equivalence.mjs scripts/machine-surfaces.test.ts package.json
git commit -m "test(ai-seo): prevent crawler content divergence"
```

### Task 5: Commit Release Tooling, Then Produce One Stable Local Proof

**Files:**
- Modify: `package.json`, `pnpm-lock.yaml`
- Create: `scripts/run-seo-ai-recovery.mjs`
- Create: `scripts/run-seo-ai-recovery.test.ts`
- Create: `scripts/verify-release-environment.mjs`
- Create: `scripts/release-environment.test.ts`
- Create: `scripts/lib/review-artifacts.mjs`
- Create: `scripts/review-artifacts.test.ts`
- Create: `scripts/deploy-verified-dist.mjs`
- Create: `scripts/deploy-verified-dist.test.ts`
- Create: `scripts/build-pages-deploy-input.mjs`
- Create: `scripts/build-pages-deploy-input.test.ts`
- Create: `scripts/compare-seo-ai-evidence-parameters.mjs`
- Create: `scripts/verify-seo-ai-proof-manifest.mjs`
- Create: `scripts/verify-pages-project-state.mjs`
- Create: `scripts/verify-pages-project-state.test.ts`
- Create after the release commit: `artifacts/seo-ai-seo-recovery/2026-07-22/local/proof-manifest.json`
- Create after the release commit: `artifacts/seo-ai-seo-recovery/2026-07-22/local/reviews/{seo,ai-seo,source-truth,code-quality,security-privacy,visual}.json`
- Create after the release commit: `artifacts/seo-ai-seo-recovery/2026-07-22/local/reviews/review-index.json`
- Create after the release commit: `artifacts/seo-ai-seo-recovery/2026-07-22/local/staging-paths.txt` (generated exact evidence paths)

**Interfaces:**
- Produces: `verify:seo-ai-recovery:local`, `verify:seo-ai-recovery:prod:technical`, `verify:seo-ai-recovery:prod`, `verify:prerendered-content:prod`, `verify:release-environment`, and namespaced proof manifests.
- `--preflight-existing` is read-only: it validates already generated evidence and exits without rewriting timestamps, manifests, hashes, screenshots, or staging paths.

- [ ] **Step 1: Add failing mode, environment, and review-contract tests**

Assert the local mode builds the static site exactly once, compiles Pages Functions exactly once into the deploy directory before hashing, owns exactly one preview, invokes lint, typecheck, full tests, deploy readiness, claims, copy review, sources, links, SEO400 backlog/content, all-559 prerender semantics, bundle, machine surfaces, hydration, rendering, CLS, Lighthouse, screenshot capture, full-sitemap bot equivalence, and the existing full funnel coverage; and kills only its owned preview PID in `finally`. Assert `production-technical` excludes external-evidence comparison, reviewer closeout, and final manifest generation. Assert `production-final` validates existing technical proof, external evidence, durable reviews, and the comparator, then derives and validates the final manifest without rebuilding or rewriting technical artifacts.

Reuse and extend the shared `resolvePnpmInvocation()` and owned-process tests from Rendering Task 1; do not introduce a second launcher. On Windows it searches `PATH` for candidate `pnpm.cmd` shims, resolves the adjacent `node_modules/pnpm/bin/pnpm.cjs`, verifies that entry reports the exact `packageManager` version, and returns `{ executable: process.execPath, prefixArgs: [resolvedPnpmCjs] }`; it never passes a `.cmd` file directly to Node's `spawn`/`spawnSync`. On POSIX it may use a directly executable pnpm path after the same version check. Every child uses executable-plus-argument arrays with `shell: false`. Include a live Windows fixture proving `spawnSync(process.execPath, [resolvedPnpmCjs, "--version"], { shell: false })` exits 0, plus failures for no matching JS entry, version drift, an orphan owned preview, a changed lockfile, install not run with `--frozen-lockfile`, Node/pnpm versions outside the declared range, missing dependency resolution, missing Playwright browser executable, an implementing reviewer, a missing review evidence hash, or a review artifact whose hash differs from `review-index.json`.

Add visual-review fixture tests for exactly 377 manifest cells: 376, 378, duplicate keys, missing screenshot, hash mismatch, missing state coverage, or absent live spot-check category all fail.

Add Pages-project state fixtures proving the pre-push mode parses live `wrangler pages project list --json`, selects exactly `floriva-web`, and passes only when Git-provider integration is absent. The post-push mode repeats that provider check, queries production deployments, fetches the live release marker/content digest, and requires the deployment ID, release commit, origin, and digest to equal `production/deployment.json`. Missing/duplicate project rows, provider integration becoming enabled, deployment drift, or marker drift fail.

Assert `package.json.packageManager === "pnpm@10.33.0"` and `package.json.engines.node === ">=22.17.1 <23"`; the environment verifier fails on any runtime or Corepack-resolved pnpm version mismatch.

In `external-seo-evidence.test.ts`, add comparator failures for unequal window length, partial end day, insufficient complete-day lag, different timezone, zero/negative or undeclared advancement, and start/end dates that do not both advance by the declared number of days; add a passing equal-length, fully complete, aligned advanced-window case.

- [ ] **Step 2: Implement the portable modes without narrowing old gates**

```json
{
  "packageManager": "pnpm@10.33.0",
  "engines": { "node": ">=22.17.1 <23" },
  "scripts": {
    "prepare:pages-rollback": "node scripts/prepare-pages-rollback.mjs",
    "verify:release-environment": "node scripts/verify-release-environment.mjs",
    "verify:seo-ai-recovery:local": "node scripts/run-seo-ai-recovery.mjs --local",
    "verify:seo-ai-recovery:prod:technical": "node scripts/run-seo-ai-recovery.mjs --production-technical",
    "verify:seo-ai-recovery:prod": "node scripts/run-seo-ai-recovery.mjs --production-final",
    "verify:prerendered-content:prod": "node scripts/verify-prerendered-content.mjs --all-sitemap --min 559",
    "deploy:verified-dist": "node scripts/deploy-verified-dist.mjs --dist dist --manifest artifacts/seo-ai-seo-recovery/2026-07-22/local/dist-manifest.json --out artifacts/seo-ai-seo-recovery/2026-07-22/production/deployment.json"
  }
}
```

`verify-release-environment.mjs` verifies the checked-in package-manager declaration and Node range, runs/records `pnpm install --frozen-lockfile`, asserts `pnpm-lock.yaml` is unchanged afterward, resolves every direct dependency used by the release gates, and checks Playwright's configured Chromium executable exists and launches. The runner imports the tested `resolvePnpmInvocation()` contract from `scripts/lib/process-launcher.mjs`. On Windows it launches the version-matched pnpm JavaScript entry through `process.execPath`; it never passes `pnpm.cmd` directly to `spawn`, and it never invokes pnpm through a shell string.

`build-pages-deploy-input.mjs` runs the lock-resolved Wrangler exactly once as `wrangler pages functions build functions --outfile dist/_worker.js --output-routes-path .floriva-build/pages-functions-routes.json --build-metadata-path .floriva-build/pages-functions-metadata.json`. The reviewed checked-in `dist/_routes.json` is authoritative; Wrangler's generated routes are discovery evidence, not an equality oracle. Validate that every generated Function-owned include is covered by an authoritative include and that no concrete Function/API/health/PostHog/lead-magnet/download route is excluded. An authoritative exclusion is safe only when it names an existing addressable static asset and has no matching concrete Function-owned route; the root middleware/document-fallback `functions/[[path]].ts` catch-all is explicitly ignored for this exclusion test because those static exclusions are its intended bypass. Preserve deliberate static-asset exclusions even when Wrangler's catch-all output omits them. Record the Wrangler version plus authoritative-routes, generated-routes, worker, and build-metadata hashes at `local/pages-functions-build.json`. Fail if Functions exist but no worker bundle is produced, a concrete Function-owned route is not covered or is excluded, an exclusion is unsafe/stale, or any input under `functions/` changes after compilation. Fixtures include the current root catch-all plus logo/favicon exclusions and a rejected exclusion that collides with `/api/health`. Tests prove the later deploy command uses `--no-bundle`, so upload performs no hidden second compilation.

`run-seo-ai-recovery.mjs --local` runs the complete pre-preview gate list, builds the static site once, invokes `build-pages-deploy-input.mjs` once, hashes every deploy input under `dist/` (including `_worker.js` and `_routes.json`) into `local/dist-manifest.json`, and writes `local/release-record.json` containing the stable private release commit and public `contentDigest`. It starts exactly one preview child on an OS-assigned port and passes that origin to `node scripts/run-rendering-proof.mjs --namespace local --origin <preview-origin> --out artifacts/seo-ai-seo-recovery/2026-07-22/local/visual`, full-sitemap bot equivalence, and `node scripts/run-local-funnel.mjs --origin <preview-origin> --no-build`. The origin mode never creates or stops another server. The rendering runner writes only to the explicit visual output directory and reports hydration, rendering/accessibility, three-cold-run CLS, Lighthouse, and screenshot subcommands individually.

`--production-technical` and `--production-final` require CLI `--origin <https-url>` and `--deployment <path>`; package scripts contain no platform-specific environment interpolation. Technical mode writes only beneath `production/technical/` and runs live machine surfaces, all-559 raw HTML, `run-rendering-proof.mjs --namespace production --origin <origin> --out artifacts/seo-ai-seo-recovery/2026-07-22/production/technical/visual`, all-559/every-robots-group bot equivalence, full production funnel coverage, exact public-asset live comparison, non-addressable upload provenance, and edge HTML/404 proof. It does not read or require Task 8 external, comparator, reviewer, or final-manifest artifacts. Final mode first validates the existing technical manifest read-only, then validates production external evidence, parameter comparison, and review index/artifacts, derives `production/final/proof-manifest.json`, and immediately validates its hashes/predicates.

All modes record executable, argument vector, namespace, origin, UTC start/end, exit, duration, stdout/stderr hashes, artifact path/hash, and parsed counts. Any non-zero child, missing output, hash mismatch, route-count mismatch, or absent rendering subgate fails. Each mutating mode writes a reviewed `staging-paths.txt` containing one exact repository-relative evidence path per line, including itself, and rejects directories, wildcards, namespace escapes, and missing files.

- [ ] **Step 3: Implement the durable review artifact contract**

Each category file contains `{ schemaVersion, category, reviewerId, reviewerRole, nonImplementing: true, releaseCommit, origin, deploymentId, scope, evidence: [{ path, sha256 }], findings: [{ findingId, severity, status, rationale, evidence: [{ path, sha256 }] }], verdict, reviewedAt }`. `verdict` is `approved-no-actionable-findings` only when every finding is fixed or has an allowed evidence-backed closure. The sibling `review-index.json` records each exact category path and SHA-256; review files never contain a self-hash. Validators require exactly six categories—SEO, AI-SEO, source truth, code quality, security/privacy, and visual—existing hash-matching evidence, a named reviewer distinct from implementers, and the same release/deployment/origin as the proof being reviewed.

- [ ] **Step 4: Commit all tooling and release code before generating authoritative proof**

Run focused tests, then have the orchestrator stage only exact reviewed tooling/code paths. Integrate and commit every remaining product/content change from the other recovery plans. Record the resulting clean `HEAD` as `releaseCommit`; do not commit proof artifacts afterward until Task 8 final closeout.

```powershell
pnpm vitest run scripts/run-seo-ai-recovery.test.ts scripts/release-environment.test.ts scripts/review-artifacts.test.ts scripts/build-pages-deploy-input.test.ts scripts/deploy-verified-dist.test.ts scripts/verify-pages-project-state.test.ts scripts/external-seo-evidence.test.ts
# Orchestrator only, after reviewing every exact path.
git add package.json pnpm-lock.yaml scripts/run-seo-ai-recovery.mjs scripts/run-seo-ai-recovery.test.ts scripts/verify-release-environment.mjs scripts/release-environment.test.ts scripts/lib/review-artifacts.mjs scripts/review-artifacts.test.ts scripts/build-pages-deploy-input.mjs scripts/build-pages-deploy-input.test.ts scripts/deploy-verified-dist.mjs scripts/deploy-verified-dist.test.ts scripts/compare-seo-ai-evidence-parameters.mjs scripts/verify-seo-ai-proof-manifest.mjs scripts/verify-pages-project-state.mjs scripts/verify-pages-project-state.test.ts scripts/external-seo-evidence.test.ts
git commit -m "test(seo): add recovery release proof tooling"
```

- [ ] **Step 5: Run the one authoritative mutating local proof against the stable commit**

```powershell
pnpm verify:release-environment
$releaseCommit = git rev-parse HEAD
pnpm verify:seo-ai-recovery:local -- --release-commit $releaseCommit
```

Expected: every command exits 0; 559 HTML routes; 1,010 baseline rows reconciled; zero unresolved final claims; every CLS run at most 0.10. The only dirty/untracked paths after the run are exact files enumerated by `local/staging-paths.txt`; source, tooling, lockfile, and `dist/` inputs have not changed after hashing. The proof artifacts remain uncommitted through deployment so the recorded release commit stays stable and no manifest hashes itself through a later evidence commit.

- [ ] **Step 6: Dispatch and persist independent local adversaries**

Use separate SEO/spec, AI-SEO, source-truth, code-quality, security/privacy, and real-browser visual reviewers. Store all six artifacts plus hashed index under `local/reviews/`. After reviews, run `node scripts/run-seo-ai-recovery.mjs --refresh-staging-paths --namespace local`, then `node scripts/run-seo-ai-recovery.mjs --local --preflight-existing --release-commit $releaseCommit --allow-dirty-from artifacts/seo-ai-seo-recovery/2026-07-22/local/staging-paths.txt`. The refreshed exact manifest must include every review file and `review-index.json`; the second command is read-only. If a reviewer finds an actionable issue, fix and commit the code, invalidate the old proof namespace, and generate one new authoritative proof/review set.

### Task 6: Deploy the Exact Verified Pages Commit

**Files:**
- Create: `artifacts/seo-ai-seo-recovery/2026-07-22/production/deployment.json`
- Create: `artifacts/seo-ai-seo-recovery/2026-07-22/production/uploaded-file-manifest.json`
- Read/revalidate: `.floriva-private/seo-ai-seo-recovery/2026-07-22/rollback/descriptor.json` and its prepared prior deploy bytes (ignored)
- Read/revalidate: `artifacts/seo-ai-seo-recovery/2026-07-22/prechange/private-backup-receipt.json`; restore its encrypted private archive into a disposable clean-checkout path and validate it independently of the original local copy

**Interfaces:**
- Produces: an operational record of the exact release Git SHA, allowed evidence-only dirty state, immutable complete dist/upload manifest, public content-digest marker, prior verified deployment/artifact, `releaseBaseCommit`, inclusive ordered commit list, Cloudflare deployment ID/URL, production origin, and UTC timestamp.

- [ ] **Step 1: Read-only preflight the stable proof and prepared rollback material**

```powershell
$releaseCommit = git rev-parse HEAD
node scripts/run-seo-ai-recovery.mjs --local --preflight-existing --release-commit $releaseCommit --allow-dirty-from artifacts/seo-ai-seo-recovery/2026-07-22/local/staging-paths.txt
```

The preflight performs no repository or provider writes. It recomputes all evidence/dist hashes and requires every status path to equal the local staging manifest. It revalidates Task 1's atomically prepared local rollback descriptor, complete deploy bytes, pinned verifier bundle, live deployment identity, provider/source hashes, and Wrangler version. It also downloads the encrypted archive named by the tracked private-backup receipt into an OS temporary directory, decrypts it with the configured key, and repeats the complete validation without reading the original `.floriva-private` tree; cleanup is guaranteed in `finally`. Task 6 never obtains or reconstructs rollback material from source. If either local or independently restored material is absent, stale, non-atomic, hash-invalid, no longer names the current pre-release deployment, or differs from the receipt, block deployment. Record `releaseBaseCommit` separately and `releaseCommitsInclusive` as the ordered exact output of `git rev-list --reverse releaseBaseCommit..releaseCommit`.

- [ ] **Step 2: Deploy Pages only**

Run: `pnpm deploy:verified-dist`

`deploy-verified-dist.mjs` re-runs the read-only preflight, re-hashes every file, rejects added/missing/changed bytes, and invokes only `wrangler pages deploy dist --project-name floriva-web --branch master --commit-hash <releaseCommit> --no-bundle`; it never builds, generates, or recompiles Functions. `uploaded-file-manifest.json` classifies every input as `public-asset`, `worker`, `routes`, or `config`, with relative path, SHA-256, and byte length, and exactly reconciles to uploader input.

- [ ] **Step 3: Verify production points to the deployed commit**

Poll both origins and fetch/hash every `public-asset`. Bind worker/routes/config hashes to authoritative Cloudflare upload/deployment provenance when exposed. If Cloudflare exposes no live digest, record only uploader-input hash plus deployment ID and prove behavior through 559 edge semantics and a true nonexistent-path 404; never claim live byte equality for non-addressable inputs. Require live public `contentDigest` equality.

- [ ] **Step 4: Keep deployment evidence uncommitted and exact**

Append each production evidence path to the generated production staging manifest. Validate status against the union of local and production exact manifests. Do not commit: `releaseCommit` must remain the same code commit proven locally and deployed byte-for-byte.

- [ ] **Step 5: Use the recorded rollback path if a production gate fails**

The emergency production restore must not depend on release-authored scripts. First redeploy the preserved previously verified artifact directly with the preexisting Wrangler CLI, even if repository scripts have already been reverted:

```powershell
# Orchestrator only; run only after a failed production release and review the exact recorded range.
$deployment = Get-Content -Raw artifacts/seo-ai-seo-recovery/2026-07-22/production/deployment.json | ConvertFrom-Json
$restoreRoot = Join-Path $env:TEMP ("floriva-seo-rollback-" + [guid]::NewGuid().ToString("N"))
node scripts/backup-private-seo-evidence.mjs --restore --receipt artifacts/seo-ai-seo-recovery/2026-07-22/prechange/private-backup-receipt.json --out $restoreRoot --verify-clean-checkout
$priorDist = Join-Path $restoreRoot $deployment.previousVerifiedArtifact.relativeDistPath
pnpm.cmd exec wrangler pages deployment create $priorDist --project-name floriva-web --branch master --commit-hash $deployment.releaseBaseCommit --no-bundle
```

`prepare-pages-rollback.test.ts`, `backup-private-seo-evidence.test.ts`, and `deploy-verified-dist.test.ts` assert this exact restore-and-deploy vector, including prior commit hash and `--no-bundle`, and reject any build/bundle command or fallback to the original local path. Validate with the restored pinned verifier bundle, delete the disposable restore directory, then reverse `releaseCommitsInclusive` and revert every exact SHA. Record rollback deployment ID and reproof hash.

### Task 7: Run Complete Production Technical and Visual Proof

**Files:**
- Create: `artifacts/seo-ai-seo-recovery/2026-07-22/production/technical/machine-surfaces.json`
- Create: `artifacts/seo-ai-seo-recovery/2026-07-22/production/technical/bot-equivalence.json`
- Create: `artifacts/seo-ai-seo-recovery/2026-07-22/production/technical/visual/manifest.json`

**Interfaces:**
- Produces: production evidence consumed by the final manifest.

- [ ] **Step 1: Verify the technical command plan without running production gates**

Run: `pnpm vitest run scripts/run-seo-ai-recovery.test.ts -t "expands the complete production funnel gate"`. Do not invoke the legacy shell-composed alias as the acceptance record because its `%FLORIVA_PROD_URL%` interpolation is Windows-specific.

Expected: the tested production command plan includes canonical, redirect, sitemap, schema, internal-link, SEO400, product-alignment, source, desktop/mobile browser, lead-magnet, and production-export entries, and every origin-aware entry receives the exact CLI origin.

- [ ] **Step 2: Run the composed production technical gate exactly once**

```powershell
pnpm verify:seo-ai-recovery:prod:technical -- --origin $env:FLORIVA_PROD_URL --deployment artifacts/seo-ai-seo-recovery/2026-07-22/production/deployment.json
```

Expected: the technical runner exits 0 without reading Task 8 artifacts; every route/profile passes CLS <=0.10; all 377 screenshots are hashed; every public asset matches live; non-addressable runtime inputs have provider provenance or are labeled uploader-input hashes only; and edge HTML/404 behavior passes.

- [ ] **Step 3: Inspect generated technical evidence read-only**

Do not rerun child commands individually. Machine surfaces, raw HTML, rendering, hydration, CLS, Lighthouse, bot equivalence, funnel, upload provenance, and 404 checks are implementation details of the one tested composed invocation. Parse the resulting technical manifest read-only and require every expected child record once.

- [ ] **Step 4: Run a non-implementing production visual adversary**

The production visual manifest defines exactly 377 unique matrix cells. `production/reviews/visual.json` must contain exactly one record for each manifest cell: `{ route, template, viewport, state, screenshotPath, screenshotSha256, verdict, rationale }`, with screenshot hash equality and no extra/missing/duplicate key. It also records live spot checks covering every template, viewport, first-frame/hydrated, no-JS, zoom, reduced-motion, overflow, focus, contrast, pill, image, and editorial state. The validator requires all 377 cell verdicts and all live spot checks approved by the named non-implementing reviewer before hashing the artifact into `review-index.json`.

### Task 8: Repeat External Observations and Close the Proof Manifest

**Files:**
- Create: `artifacts/seo-ai-seo-recovery/2026-07-22/production/final/external/gsc-baseline.json`
- Create: `artifacts/seo-ai-seo-recovery/2026-07-22/production/final/external/broken-page-crawl.json`
- Create: `artifacts/seo-ai-seo-recovery/2026-07-22/production/final/external/agentic-browsing.json`
- Create: `artifacts/seo-ai-seo-recovery/2026-07-22/production/final/external/answer-engine-observations.json`
- Create: `artifacts/seo-ai-seo-recovery/2026-07-22/production/final/external/redaction-log.json`
- Create: `artifacts/seo-ai-seo-recovery/2026-07-22/production/final/external/sidecars/<provider>/<capture-id>.json` and redacted screenshot files
- Create: `artifacts/seo-ai-seo-recovery/2026-07-22/production/reviews/{seo,ai-seo,source-truth,code-quality,security-privacy,visual}.json`
- Create: `artifacts/seo-ai-seo-recovery/2026-07-22/production/reviews/review-index.json`
- Create: `artifacts/seo-ai-seo-recovery/2026-07-22/production/staging-paths.txt` (generated exact artifact paths)
- Create: `artifacts/seo-ai-seo-recovery/2026-07-22/production/final/proof-manifest.json`
- Create: `artifacts/seo-ai-seo-recovery/2026-07-22/production/final/private-backup-receipt.json`
- Modify: `docs/seo-400/INDEX-STATUS-LEDGER.md`

**Interfaces:**
- Produces: the final evidence map for all 18 specification acceptance criteria.

- [ ] **Step 1: Repeat the exact external evidence methods**

Use the same GSC property/search type/filters/dimensions/partial-day policy, repeat the broken-page and agentic audits with full exports, and observe the fixed query/provider/locale/auth set.

After the production raw exports are present, rerun `backup-private-seo-evidence.mjs` over the rollback bundle and complete updated raw-evidence inventory. Write a new tracked `production/final/private-backup-receipt.json`, then require a clean-checkout restore/revalidation that does not read either original local private directory. The final gate blocks if any pre-change or production raw object is absent or hash-invalid in the restored archive.

Before comparing outcomes, run `node scripts/compare-seo-ai-evidence-parameters.mjs --before artifacts/seo-ai-seo-recovery/2026-07-22/external/prechange --after artifacts/seo-ai-seo-recovery/2026-07-22/production/final/external`. The comparator requires identical provider/tool versions where available, retrieval method, property, search type, filters, dimensions, query/provider set, locale, authentication state, crawler settings, and redaction rules. For date windows it additionally requires equal complete-day length, the same timezone and partial-day exclusion, end dates at least the declared complete-day lag behind capture time, aligned start/end advancement by the declared `advancementDays`, and `advancementDays > 0`. It enumerates every allowed date change; partial windows, unequal lengths, undeclared advancement, or unexplained parameter drift exit non-zero.

Expected: external artifacts are reproducible, privacy-reviewed, and comparable. Ranking/indexing/citation changes are labeled observations, not completion proof.

- [ ] **Step 2: Reconcile every external finding honestly**

Reproducible technical findings are fixed and rerun. Every `false-positive`, `unreproducible`, or `insufficiently-specified` finding contains a finding-specific rationale, existing hash-verified evidence, and a durable approval from a named non-implementing reviewer. Undecomposable aggregates additionally require the private inventory's existing/hash-matching raw object, tracked redacted export, redaction log, and every available subcheck; they are not silently marked fixed.

- [ ] **Step 3: Define the derived production proof contract**

```js
const deployment = JSON.parse(await fs.readFile(deploymentPath, "utf8"));
const commandProof = await parseCommandManifest(productionRunnerManifest);
const evidenceIndex = await hashAndParseArtifacts(commandProof.artifacts);
const reviewers = await parseReviewerVerdicts(reviewArtifactPaths);
const proof = {
  schemaVersion: "1.0",
  origin: productionOrigin,
  release: { // operational evidence only; this file is never web-served
    gitSha: deployment.releaseCommit,
    deploymentId: deployment.deploymentId,
    deploymentUrl: deployment.deploymentUrl,
    deployedAt: deployment.deployedAt,
    distManifestSha256: deployment.distManifestSha256,
    publicContentDigest: deployment.publicContentDigest,
    previousVerifiedDeployment: deployment.previousVerifiedDeployment,
  },
  commands: commandProof.commands.map(({ command, args, origin, startedAt, endedAt, exitCode, stdoutSha256, stderrSha256, artifacts }) => ({
    command, args, origin, startedAt, endedAt, exitCode, stdoutSha256, stderrSha256, artifacts,
  })),
  counts: deriveCounts(evidenceIndex),
  reviewers,
  acceptanceCriteria: acceptanceRequirements.map(({ id, predicates }) => ({
    id,
    ...deriveAcceptanceResult({ predicates, commandProof, evidenceIndex, reviewers, deployment }),
  })),
  externalOutcomes: {
    rankingRecovery: "observational",
    citationRecovery: "observational",
  },
};
```

Implement and test this derivation with the Task 5 tooling, but do not write the final instance until Step 5 after all external and reviewer artifacts exist. `deriveCounts` must parse authoritative outputs rather than copy manually supplied numbers: sitemap/prerender/bot routes, claim baseline/reconciled/unresolved totals, source failures, hydration errors, CLS profile/run/max values, Lighthouse budget results, broken-page counts, and screenshot counts. `deriveAcceptanceResult` marks an item `proven` only when every declared predicate maps to a zero-exit command, existing same-origin artifact, matching SHA-256, expected parsed count/threshold, current deployment marker, and required approved reviewer verdict. Otherwise it emits `failed` with exact predicate errors; callers cannot supply `status`.

The final file must contain all 18 acceptance IDs; exact production origin; operational/private release SHA; deployment ID/URL/time; prior verified deployment; dist and public marker hashes; every command/argument/exit/output hash; derived counts; and named reviewer verdicts with evidence hashes. Each `proven` entry points to authoritative current-state evidence under the production namespace. `verify-seo-ai-proof-manifest.mjs` recomputes hashes and predicates, rejects supplied/handwritten acceptance statuses, placeholders, missing paths, local-namespace evidence, mismatched origins/releases, unapproved required reviews, and any non-zero command, then exits non-zero on any failure.

- [ ] **Step 4: Run final adversarial completion audit**

Fresh named non-implementing agents independently review SEO, AI-SEO, source truth, code quality, security/privacy, and production visuals. Persist all six schema-valid artifacts at `production/reviews/{seo,ai-seo,source-truth,code-quality,security-privacy,visual}.json`, then generate `production/reviews/review-index.json` with each file's SHA-256. The orchestrator inspects every cited artifact before the final gate; a missing category, hash mismatch, release/deployment mismatch, or actionable verdict blocks closeout.

- [ ] **Step 5: Commit final observations and proof**

```powershell
node scripts/backup-private-seo-evidence.mjs --rollback .floriva-private/seo-ai-seo-recovery/2026-07-22/rollback --raw-inventory .floriva-private/seo-ai-seo-recovery/2026-07-22/raw-evidence-inventory.json --receipt artifacts/seo-ai-seo-recovery/2026-07-22/production/final/private-backup-receipt.json --restore-test
node scripts/verify-external-seo-evidence.mjs --phase production --root artifacts/seo-ai-seo-recovery/2026-07-22/production/final/external --private-inventory .floriva-private/seo-ai-seo-recovery/2026-07-22/raw-evidence-inventory.json --backup-receipt artifacts/seo-ai-seo-recovery/2026-07-22/production/final/private-backup-receipt.json --require-clean-restore --append-staging-paths artifacts/seo-ai-seo-recovery/2026-07-22/production/staging-paths.txt
node scripts/compare-seo-ai-evidence-parameters.mjs --before artifacts/seo-ai-seo-recovery/2026-07-22/external/prechange --after artifacts/seo-ai-seo-recovery/2026-07-22/production/final/external
pnpm verify:seo-ai-recovery:prod -- --origin $env:FLORIVA_PROD_URL --deployment artifacts/seo-ai-seo-recovery/2026-07-22/production/deployment.json
node scripts/verify-seo-ai-proof-manifest.mjs --manifest artifacts/seo-ai-seo-recovery/2026-07-22/production/final/proof-manifest.json
# Orchestrator only. Inspect production/staging-paths.txt before staging.
git add docs/seo-400/INDEX-STATUS-LEDGER.md
git add --pathspec-from-file=artifacts/seo-ai-seo-recovery/2026-07-22/local/staging-paths.txt
git add --pathspec-from-file=artifacts/seo-ai-seo-recovery/2026-07-22/production/staging-paths.txt
git commit -m "docs(seo): close recovery production proof"
```

Expected: the manifest proves every controllable acceptance criterion and clearly separates still-developing external search outcomes.

- [ ] **Step 6: Use the finishing-a-development-branch skill**

Only after the completion audit is proven, use the skill's verification guidance while preserving the user-approved direct-`master` workflow; do not create another worktree or feature branch.

- [ ] **Step 7: Publish the reviewed direct-main handoff**

```powershell
node scripts/verify-pages-project-state.mjs --project floriva-web --expect-git-provider none --phase pre-push
git push origin master
node scripts/verify-pages-project-state.mjs --project floriva-web --expect-git-provider none --phase post-push --origin $env:FLORIVA_PROD_URL --deployment artifacts/seo-ai-seo-recovery/2026-07-22/production/deployment.json
git fetch origin
git rev-list --left-right --count master...origin/master
```

Expected: the immediately pre-push live query proves this Pages project still has no Git provider, so the push cannot knowingly trigger an automatic deployment. The immediately post-push query proves the provider remains absent and production still serves the exact deployment ID/release commit/content digest already proven in `production/deployment.json`; then the parity command prints two zero counts (`0 0`). If provider state is enabled before push, stop without pushing. If provider/deployment state changes in the race after push, do not accept closeout: rerun production proof for the actual live deployment or execute the tested rollback path. A local-only final proof commit is not complete and must not be reported as a cross-computer handoff.
