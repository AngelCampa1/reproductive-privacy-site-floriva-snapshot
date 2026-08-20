# SEO and AI-SEO Recovery Execution Index

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Coordinate the approved Floriva SEO and AI-SEO recovery as three independently testable implementation plans followed by one adversarial integration, deployment, and production-proof sequence.

**Architecture:** Rendering, content evidence, and machine-readable/production proof have separate file ownership and review gates. Because the user requires one shared `master` checkout with no worktrees, implementation agents run serially; only read-only investigation/review may run in parallel. The streams integrate through named generated artifacts, package scripts, and the final 559-route production build.

**Tech Stack:** React 19, React Router 7, Vite 8, TypeScript 6, Node.js ESM, Vitest, Playwright, Cloudflare Pages/Functions, MDX-derived generated content, Google Search Console, Lighthouse, and repository verification scripts.

## Global Constraints

- Preserve exactly 559 indexable HTML pages; machine artifacts are excluded from the HTML sitemap and page count.
- Keep the publishing freeze in force: no new programmatic page cluster, pruning, consolidation, or unapproved redirect.
- Keep all existing canonical routes and `relatedPages` contracts unless the approved route workflow is separately invoked.
- Keep state, listicle, pricing, questionnaire, and other collection-specific payloads intact.
- Normalize mixed-shape `answers` at load time; do not hand-edit the corpus to normalize shapes.
- Keep store targets configuration-driven and every button-styled control pill-shaped.
- Respect `prefers-reduced-motion` and render meaningful content without JavaScript.
- Do not invent claims, citations, profiles, credentials, reviewers, metrics, prices, dates, or capabilities.
- For every changed public-copy batch, run `humanizer`, then `third-grade-copy`, then no-lies and whole-page-context review; preserve proof of that order.
- `third-grade-copy` was verified with 105 package evaluations and 22 scanner candidates, then installed into `<user-home>/.codex/skills/third-grade-copy` on 2026-07-22; verify it is visible before the first copy task.
- Use a fresh implementer per task, then a separate spec-compliance reviewer, then a separate code-quality/content-evidence reviewer. Visual changes require a non-implementing adversarial browser reviewer using screenshots.
- Agent reports are evidence only. The orchestrator inspects every diff and reruns every authoritative gate before acceptance.
- Work directly in `<repo-root>` on `master`; the user explicitly rejected additional worktrees for this effort.
- Sub-agents edit only disjoint assigned files and never stage or commit. The orchestrator alone validates, stages exact reviewed path manifests, and creates bounded commits on `master`.

---

## Plan Set and Ownership

1. `docs/superpowers/plans/2026-07-22-route-equivalent-rendering-and-visual-quality.md`
   - Owns the shared route tree, build-time React rendering, hydration, deterministic first render, all-559 semantic validation, browser/CLS/accessibility harness, contrast, image sizing, and bundle budgets.
2. `docs/superpowers/plans/2026-07-22-content-evidence-and-metadata-recovery.md`
   - Owns SEO-title integrity, the four collision pages, the immutable 1,010-row claim baseline, citation interfaces, claim remediation batches, editorial methodology, and copy-review proof.
3. `docs/superpowers/plans/2026-07-22-ai-search-and-production-proof.md`
   - Owns public knowledge publication, `llms.txt` cross-validation, GSC/crawl/agentic/answer-engine evidence, composed release gates, deployment, rollback, and production proof.

Only one implementer may edit the shared checkout at a time. No two implementers may edit `package.json`, `scripts/generated-surfaces.test.ts`, `scripts/prerender-html.mjs`, `src/site/knowledge/index.ts`, or generated content concurrently. The execution waves below define the serial handoff order; adversarial reviewers remain read-only and may run in parallel after a bounded diff is ready.

## Cross-Plan Interfaces

| Producer | Interface | Consumer |
|---|---|---|
| Content plan | `claimCitations: ClaimCitation[]`, stable source IDs, resolved content entries | Rendering plan's all-559 semantic assertions |
| Content plan | Frozen baseline and reconciled claim ledger under `docs/seo-400/recovery-2026-07-22/` | AI/production plan's proof manifest |
| Content plan | `src/site/generated/approved-public-fact-evidence.json` with approved public text/page/source hashes | AI Task 2 public-knowledge generator |
| Rendering plan | `renderRoute(pathname): Promise<RenderedRoute>` and `data-floriva-prerendered="true"` root contract | AI/production raw-HTML and bot-equivalence gates |
| Rendering plan | `scripts/seo-visual-route-matrix.json` and browser proof manifest schema | AI/production local and production orchestration |
| AI/production plan | `verify:machine-surfaces`, proof manifest, production origin conventions | Final rendering/content production acceptance |
| All plans | Exact commit IDs and reviewer verdicts | Final completion audit |

## Acceptance-Criteria Coverage Map

| Spec criterion | Implemented and proved by |
|---|---|
| 1. Preserve 559 HTML pages and canonical routes | Rendering Tasks 2 and 5; AI Tasks 3 and 7; Waves 3-5 |
| 2. Complete meaningful raw HTML for every route shape | Rendering Tasks 3 and 5; Wave 3 |
| 3. Hydration without mismatch | Rendering Tasks 2-4 and 8; AI Task 7 |
| 4. CLS <=0.10 for every pinned template/run | Rendering Tasks 1 and 8-9; AI Task 7 |
| 5. Contrast, names, image sizing, and logo | Rendering Tasks 7-9; production visual adversary |
| 6. Unused JS/CSS budgets without regression | Rendering Tasks 1 and 6; Wave 3 |
| 7. Four distinct collision pages | Content Task 7; Content Task 15 |
| 8. Explicit SEO titles and collision rejection | Content Task 4; Content Task 15 |
| 9. Reconcile all 1,010 claims and live scan | Content Tasks 1-3 and 8-15 |
| 10. No invented public facts or identities | Content Tasks 5-14; content-evidence adversaries |
| 11. Humanizer then third-grade-copy proof | Content Tasks 5-15 |
| 12. Live sanitized public knowledge JSON | AI Tasks 2-3 and 7 |
| 13. Canonical machine-readable URL graph | AI Tasks 3-4 and 7 |
| 14. Preserve every existing repository gate | Wave 3; AI Tasks 5 and 7 |
| 15. Independent adversarial review | Every task review gate; Waves 3-5 |
| 16. Exact production deployment/proof | AI Tasks 6-8; Wave 4 |
| 17. Broken-page and agentic audit dispositions | AI Tasks 1 and 8 |
| 18. Comparable GSC and answer-engine observations | AI Tasks 1 and 8 |

**Execution mode:** Subagent-Driven. The user explicitly required sub-agent-driven work, so no additional execution-mode choice is needed after these plans pass review.

## Execution Waves

### Wave -1: Commit the approved plan set and prove a clean direct-main bootstrap

- [ ] **Step 1: Inspect remote state, then commit only the approved planning documents**

```powershell
git fetch origin
git status --short --branch
git add -- docs/superpowers/specs/2026-07-22-seo-ai-seo-recovery-design.md docs/superpowers/plans/2026-07-22-seo-ai-seo-recovery-execution-index.md docs/superpowers/plans/2026-07-22-content-evidence-and-metadata-recovery.md docs/superpowers/plans/2026-07-22-route-equivalent-rendering-and-visual-quality.md docs/superpowers/plans/2026-07-22-ai-search-and-production-proof.md
git diff --cached --name-only
git diff --cached --check
git commit -m "docs: add SEO recovery implementation plans"
git pull --ff-only
git status --porcelain
```

Expected: the staged-name output contains exactly the five approved documents, the commit succeeds directly on `master`, the remote check/pull reports no unresolved divergence, and final porcelain is empty. If `origin/master` advanced or diverged, stop before Task 1 and integrate that remote state on `master` without creating a worktree; do not allowlist dirty plan files as release evidence.

### Wave 0: Preserve pre-change evidence

- [ ] **Step 1: Run Task 1 from all three plans before implementation**

Run Content Task 1 first to freeze all 1,010 claim rows. Run AI/production Task 1 second to identify and atomically preserve the current live deployment/rollback artifact and freeze GSC, broken-page, agentic-browsing, and answer-engine observations. Run Rendering Task 1 third so its pinned current-production CLS/Lighthouse/visual baseline consumes that exact deployment binding while separately recording local-dist diagnostics. Shared harness files are integrated serially by the orchestrator.

Expected: immutable artifacts exist under `artifacts/seo-ai-seo-recovery/2026-07-22/prechange/`, the claim baseline contains exactly 1,010 rows, the HTML inventory contains exactly 559 routes, the canonical AI-owned current-production binding is consumed unchanged by the pinned production visual/performance baseline, and an atomically verified private rollback/raw-evidence archive has both a tracked receipt and a successful clean-checkout restore/revalidation before any release upload.

- [ ] **Step 2: Integrate each baseline through its owning Task 1 handoff**

Content Task 1, Rendering Task 1, and AI/production Task 1 each define their own exact-file staging manifest or literal exact-file list. After each task's implementer and two reviewers finish, the orchestrator alone inspects those exact paths and hashes, stages them, compares `git diff --cached --name-only` to the approved set, runs `git diff --cached --check`, and commits that task before dispatching the next implementer. There is no aggregate Wave 0 commit and no `changed-paths.txt` contract.

Expected: three bounded baseline commits contain only their owning evidence/harness files and no public-copy remediation.

### Wave 1: Establish shared contracts

- [ ] **Step 1: Execute Content Tasks 2-4 in order**

Expected: stable claim IDs, immutable baseline reconciliation, `ClaimCitation` validation, explicit `seoTitle` support, and collision failures are independently green before content edits.

- [ ] **Step 2: Execute Rendering Tasks 2-5 in order**

Expected: the browser and build renderer consume one route tree; content bodies are present on the first server and client render; hydration mismatch tests fail on any divergence.

- [ ] **Step 3: Run cross-contract tests**

```powershell
pnpm generate:content
pnpm typecheck
pnpm vitest run scripts/content-metadata.test.ts src/rendering/hydration.test.tsx src/pages/content-page.test.tsx src/components/article-body.test.tsx src/site/structured-data.test.ts
```

Expected: all named suites pass and generated content exposes the citation and initial-body contracts required by rendering.

### Wave 2: Remediate independent surfaces with serial implementers

- [ ] **Step 1: Execute Content Tasks 5-15 serially**

Dispatch one fresh implementer at a time. Each implementer owns only the assigned MDX paths and matching per-file ledger/review shards. The four collision files are excluded from later collection batches after Content Task 7 owns them. Implementers do not touch another batch's shards, regenerate shared outputs, stage, or commit; the orchestrator validates, reviews, stages, and commits each completed batch before dispatching the next implementer. Independent read-only adversaries may review a completed batch in parallel.

Expected: every batch passes copy order, source relevance, stable-ledger reconciliation, spec review, and content-evidence review before integration.

- [ ] **Step 2: Execute Rendering Tasks 6-8 serially against the stable route contracts**

Expected: contrast, accessible names, responsive logo assets, image geometry, lightweight imports, deferred Sentry, CSS critical-path handling, and per-route transfer budgets pass focused tests.

- [ ] **Step 3: Execute AI/production Tasks 2-4 serially after Content Task 15 has produced the approved fact/evidence index and released knowledge-file ownership**

Expected: `/public-knowledge.json` is deterministic, crawlable, absent from the sitemap, marked `X-Robots-Tag: noindex`, and cross-valid with `llms.txt` and all 559 HTML routes.

### Wave 3: Integrate once and freeze exhaustive local proof

- [ ] **Step 1: Regenerate shared artifacts once after all source changes are reviewed**

```powershell
pnpm generate:content
pnpm generate:knowledge
pnpm build
```

Expected: generation succeeds without title collisions, the build prerenders exactly 559 HTML routes, and no unrelated generated churn remains.

- [ ] **Step 2: Execute Rendering Task 9 and AI/production Task 5 in their declared order**

```powershell
pnpm verify:seo-ai-recovery:local
```

Expected: one orchestrator owns the preview lifecycle, polls readiness, runs lint/typecheck/tests, claims, sources, all-559 raw HTML, hydration, machine surfaces, bot equivalence, bundle/transfer budgets, three-run Lighthouse, rendering, CLS, screenshots, and the local funnel gate, then terminates preview. Every command exits 0; the proof manifest records command exits and artifact hashes; the claim ledger reconciles all 1,010 baseline IDs and final live findings are zero; every CLS run for every pinned template is at most 0.10.

- [ ] **Step 3: Run independent final local adversaries**

Dispatch separate agents for SEO/spec compliance, AI-SEO/machine surfaces, content/source truth, code quality, security/privacy, and visual browser review. Give each the approved spec, full diff, exact local origin, and proof paths.

Expected: each reviewer reports no actionable finding. Any finding returns to a fresh corrective implementer and the affected reviewer reruns until clean.

- [ ] **Step 4: Freeze the reviewed release candidate on `master`**

```powershell
git status --short
git rev-parse HEAD
```

Expected: every source/tooling change is already present in its bounded task commit. Only the explicitly enumerated local proof artifacts allowed by the AI/production release lifecycle may remain uncommitted; no source, configuration, dependency, or generated public file is dirty. The recorded release commit does not change between final local proof and deployment.

### Wave 4: Deploy and prove production

- [ ] **Step 1: Execute AI/production Task 6 once, after all Wave 3 local reviewers approve**

Expected: the exact release commit and Cloudflare deployment identifier are captured before live claims are made.

- [ ] **Step 2: Run every production gate from all three plans**

```powershell
pnpm verify:seo-ai-recovery:prod:technical -- --origin $env:FLORIVA_PROD_URL --deployment artifacts/seo-ai-seo-recovery/2026-07-22/production/deployment.json
```

Expected: the technical production orchestrator parses rather than self-attests every gate result, verifies origin/deployment/release/digest/timestamps/counts, and exits 0 only when the deployed bytes match the locally gated artifact, all 559 intended HTML routes remain valid, and every required route/profile screenshot, Lighthouse, hydration, bot, and CLS run passes. It writes the evidence that the later production visual and specialist reviewers must approve; it does not pre-approve their verdicts.

- [ ] **Step 3: Repeat observational external measurements**

Repeat the exact pre-change GSC parameters, broken-page crawl, agentic-browsing audit, and fixed answer-engine query set. These measurements are recorded as observations and do not manufacture an immediate ranking/indexing/citation success claim.

Expected: complete post-change exports exist, and every reproducible technical defect is either fixed or has an evidence-backed, adversarially approved disposition.

- [ ] **Step 4: Run the production visual adversary**

A non-implementing agent opens every pinned route at the required viewport/state matrix, inspects screenshots visually, compares first frame to hydrated state, and attacks overflow, contrast, focus, motion, pill geometry, image stability, and content visibility.

Expected: no actionable visual finding remains; the proof manifest links every screenshot to route, viewport, state, commit, deployment, and timestamp.

- [ ] **Step 5: Run the remaining production specialist adversaries**

Dispatch separate non-implementing reviewers for SEO/spec compliance, AI-SEO/machine surfaces, content/source truth, code quality, and security/privacy. Together with the visual reviewer, these are the six hashed categories required by the AI/production plan; any actionable finding returns to a fresh corrective implementer and then the same category reruns.

Expected: every required reviewer artifact names the reviewer and scope, binds to the release/deployment and evidence hashes, contains no unresolved actionable finding, and passes schema validation.

### Wave 5: Completion audit and direct-main handoff

- [ ] **Step 1: Run the final production closeout gate after post-change observations and reviewer artifacts exist**

```powershell
pnpm verify:seo-ai-recovery:prod -- --origin $env:FLORIVA_PROD_URL --deployment artifacts/seo-ai-seo-recovery/2026-07-22/production/deployment.json
```

Expected: the final runner adds cross-phase comparability and the derived 18-criterion proof-manifest validation to the already-passing technical production gate.

- [ ] **Step 2: Reconcile the approved specification requirement by requirement**

For each of the 18 acceptance criteria in `docs/superpowers/specs/2026-07-22-seo-ai-seo-recovery-design.md`, record the exact file, command output, production response, screenshot, reviewer verdict, or artifact that proves it.

Expected: no criterion is supported only by intent, a narrow test, or an agent summary.

- [ ] **Step 3: Close out the verified `master` release without branching**

Confirm `master` contains only the reviewed commits, the tree has no unexplained changes, the exact commit and deployment remain live, and all rollback coordinates are recorded. Immediately before `git push origin master`, run the tested live Pages-project state verifier and block unless `floriva-web` still has no Git provider. Immediately after push, rerun provider state and require production to still serve the exact deployment ID/release commit/content digest in `production/deployment.json`; if it drifted, rerun proof or roll back rather than accepting closeout. Fetch and require `git rev-list --left-right --count master...origin/master` to print two zero counts (`0 0`). Do not create a branch or worktree.

Expected: the user receives the exact local-and-remote `master` state, commit and deployment identifiers, proof paths, remaining external observations, and an honest complete/partial/blocked verdict.
