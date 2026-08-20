# Route-Equivalent Rendering and Visual Quality Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Render the same complete Floriva React route before and after hydration, enforce semantic HTML across all 559 pages, remove the measured CLS/accessibility/image defects, and prove every visual change in a real browser.

**Architecture:** One shared React route tree serves BrowserRouter and MemoryRouter. A Vite SSR entry renders complete route HTML at build time, `hydrateRoot` attaches only after the matching content body is loaded, and shared route-head builders provide metadata and JSON-LD. Exhaustive artifact checks cover all routes; a pinned template matrix drives hydration, CLS, accessibility, bundle, and adversarial screenshot proof.

**Tech Stack:** React 19, React Router 7, Vite 8 SSR middleware, TypeScript 6, React DOM server/client, Vitest/JSDOM, Playwright, axe-core, Lighthouse, Sharp, Node.js ESM, Cloudflare Pages.

## Global Constraints

- Preserve exactly 559 indexable HTML routes and every existing canonical path.
- Do not add, remove, prune, consolidate, or redirect a public route.
- The build and browser must consume one route definition; no authored fallback representation may remain.
- Raw HTML must expose meaningful headings, lists, tables, dates, FAQs, sources, related links, actions, and collection payloads where supplied.
- Every pinned route/profile receives three cold-cache CLS runs; every run must be at most 0.10.
- Mobile and desktop accessibility must score 100 on the pinned homepage and content route unless the user approves a reproduced tool false positive.
- Keep buttons pill-shaped, store targets configuration-driven, and motion reduced when requested.
- Keep the 1024px logo source for schema/PDF consumers; web UI may use derived responsive assets.
- Keep Sentry available when configured, without eager common-bundle loading.
- Do not hide content from no-JavaScript users or ship CSS asynchronously in a way that causes FOUC/CLS.
- Every task receives a fresh implementer, separate spec reviewer, and separate quality reviewer. Anything visual also receives a non-implementing screenshot reviewer.
- Task agents never stage or commit. After both review gates pass, only the orchestrator stages the task's exact file manifest and commits on `master`; broad directory adds and `git add -A` are forbidden.

---

## File Structure

### New files

- `src/routes.tsx`: canonical `RouteObject[]` and route element factories shared by browser/server.
- `src/entry-server.tsx`: `renderRoute(pathname)` Vite-SSR entry returning root HTML and resolved head.
- `src/site/route-head.ts`: single route metadata/JSON-LD resolver.
- `src/site/seo-urls.ts`: lightweight canonical and image URL helpers.
- `src/site/resources-megamenu.ts`: header-safe resource navigation without content-manifest imports.
- `src/components/app-error-boundary.tsx`: local boundary with deferred Sentry reporting.
- `src/rendering/hydration.test.tsx`: server/client initial-tree equivalence tests.
- `scripts/seo-visual-route-matrix.json`: exact 29-route/template and route-by-profile coverage.
- `scripts/rendering-proof-lib.mjs`: typed matrix expansion, controlled preview/production origin handling, artifact namespaces, hashing, and browser-profile setup shared by every proof command.
- `scripts/verify-hydration-browser.mjs`: console/page/request/hydration failure gate.
- `scripts/verify-bundle-budgets.mjs`: per-route initial transfer baseline and regression gate.
- `scripts/verify-lighthouse-budgets.mjs`: pinned-profile unused-JS, render-blocking CSS, accessibility, and performance gate.
- `scripts/verify-rendering-browser.mjs`: Playwright accessibility/layout/geometry gate.
- `scripts/verify-cls.mjs`: three-run cold-load CLS gate.
- `scripts/capture-seo-visual-proof.mjs`: deterministic pre-hydration/hydrated screenshot, diff, contact-sheet, and manifest writer; it exists before any baseline is captured.
- `scripts/run-rendering-proof.mjs`: starts/stops local preview safely and runs every browser gate, or targets an existing production origin.
- `scripts/stage-rendering-artifacts.mjs`: writes, verifies, prints, and stages hashed exact-file artifact manifests without directory pathspecs.
- `scripts/rendering-verifiers.test.ts`: matrix, bundle, CLS, and manifest unit tests.
- `public/logo-mark-96.png` and `public/logo-mark-144.png`: responsive web assets.

### Modified files

- `src/router.tsx`: compatibility export built from shared routes, then removed if unused.
- `src/pages/lazy-pages.tsx`: shared lazy components/fallbacks or deletion after route migration.
- `src/app.tsx`, `src/main.tsx`, `src/pages/content-page.tsx`: shared route tree and initial-body hydration contract.
- `scripts/prerender-html.mjs`: Vite SSR renderer and shared head injection.
- `src/site/page-meta.ts`, `src/site/structured-data.ts`, page components, `functions/_middleware.ts`, `functions/_middleware.test.ts`: shared head authority on static, client, and edge responses.
- `public/404.html`: route-equivalent not-found document generated by the same renderer rather than a generic SPA shell.
- `src/components/reveal.tsx`, `index.html`, `src/styles/base.css`: deterministic no-JS/reduced-motion rendering.
- `scripts/verify-prerendered-content.mjs`, `scripts/generated-surfaces.test.ts`: all-559 semantic assertions.
- `src/styles/tokens.css`, `src/components/store-buttons.tsx`, associated tests: contrast and accessible names.
- `src/components/site-header.tsx`, `src/components/site-footer.tsx`, `src/components/device-frame.tsx`, `src/styles/device-frame.css`, styles/assets tests: responsive images and reserved geometry.
- `src/site/internal-links.ts`, `src/site/sentry.ts`, `package.json`, `pnpm-lock.yaml`: lightweight imports, deferred telemetry, new gates/dependencies.

## Pinned Route and Visual Matrix

`scripts/seo-visual-route-matrix.json` implements this interface; every verifier imports the same loader and rejects duplicate route IDs, paths, profile IDs, or visual-cell IDs:

```ts
type RouteCase = {
  id: string;
  path: string;
  branch: "home" | "hub" | "content" | "static" | "not-found";
  template: string;
  collision: boolean;
  profiles: string[];
};

type VisualProfile = {
  id: string;
  width: number;
  height: number;
  javaScript: boolean;
  phase: "pre-hydration" | "hydrated" | "no-js";
  reducedMotion: boolean;
  zoomPercent: 100 | 200;
  coldCache: boolean;
};

type RouteMatrix = {
  version: 1;
  routes: RouteCase[];
  profiles: VisualProfile[];
};

type VisualCell = RouteCase & { profile: VisualProfile; cellId: string };
```

The 13 profiles are complete objects, not ID-only labels. `rendering-verifiers.test.ts` deep-compares the parsed array against this literal value and asserts that every route's `profiles` array equals these 13 IDs in this order:

```ts
const EXACT_PROFILES: VisualProfile[] = [
  { id: "mobile-360-pre", width: 360, height: 800, javaScript: true, phase: "pre-hydration", reducedMotion: false, zoomPercent: 100, coldCache: true },
  { id: "mobile-360-hydrated", width: 360, height: 800, javaScript: true, phase: "hydrated", reducedMotion: false, zoomPercent: 100, coldCache: true },
  { id: "mobile-390-pre", width: 390, height: 844, javaScript: true, phase: "pre-hydration", reducedMotion: false, zoomPercent: 100, coldCache: true },
  { id: "mobile-390-hydrated", width: 390, height: 844, javaScript: true, phase: "hydrated", reducedMotion: false, zoomPercent: 100, coldCache: true },
  { id: "tablet-768-pre", width: 768, height: 1024, javaScript: true, phase: "pre-hydration", reducedMotion: false, zoomPercent: 100, coldCache: true },
  { id: "tablet-768-hydrated", width: 768, height: 1024, javaScript: true, phase: "hydrated", reducedMotion: false, zoomPercent: 100, coldCache: true },
  { id: "desktop-1440-pre", width: 1440, height: 900, javaScript: true, phase: "pre-hydration", reducedMotion: false, zoomPercent: 100, coldCache: true },
  { id: "desktop-1440-hydrated", width: 1440, height: 900, javaScript: true, phase: "hydrated", reducedMotion: false, zoomPercent: 100, coldCache: true },
  { id: "wide-1920-pre", width: 1920, height: 1080, javaScript: true, phase: "pre-hydration", reducedMotion: false, zoomPercent: 100, coldCache: true },
  { id: "wide-1920-hydrated", width: 1920, height: 1080, javaScript: true, phase: "hydrated", reducedMotion: false, zoomPercent: 100, coldCache: true },
  { id: "desktop-200-zoom", width: 1440, height: 900, javaScript: true, phase: "hydrated", reducedMotion: false, zoomPercent: 200, coldCache: true },
  { id: "mobile-390-reduced-motion", width: 390, height: 844, javaScript: true, phase: "hydrated", reducedMotion: true, zoomPercent: 100, coldCache: true },
  { id: "mobile-390-no-js", width: 390, height: 844, javaScript: false, phase: "no-js", reducedMotion: false, zoomPercent: 100, coldCache: true },
];
```

The file contains exactly these 29 unique paths. The table maps every distinct branch/template required by the approved spec, every `HubPage` rendering branch and CTA variant, all five changed static routes, the not-found branch, and the four collision pages named explicitly in rows 17-20:

| # | Path | Branch/template | Collision |
|---:|---|---|---|
| 1 | `/` | home | no |
| 2 | `/resources/health` | pillar hub | no |
| 3 | `/resources/guides/period-tracker-hipaa` | ordinary guide | no |
| 4 | `/resources/best/best-apps-to-track-pcos-symptoms` | listicle/tools | no |
| 5 | `/compare/versus/best-period-tracker-after-flo-settlement` | comparison/table | no |
| 6 | `/compare/pricing/eve-app-pricing` | pricing | no |
| 7 | `/period-tracker-privacy/reproductive-data-privacy-laws-california` | state law | no |
| 8 | `/tools/quiz/pmdd-quiz-no-email` | questionnaire | no |
| 9 | `/free/abnormal-bleeding-log` | lead magnet | no |
| 10 | `/compare/alternatives/flo-app-alternative` | alternative | no |
| 11 | `/app-guides/floriva-for-gynecologist-prep` | app guide | no |
| 12 | `/resources/symptom-guides/cramps-but-no-period` | symptom guide | no |
| 13 | `/resources/condition-guides/adenomyosis-period-tracking` | condition guide | no |
| 14 | `/resources/hormone-guides/cortisol-menstrual-cycle` | hormone guide | no |
| 15 | `/resources/life-stage-guides/birth-control-implant-bleeding-log` | life-stage guide | no |
| 16 | `/resources/wellness-guides/exercise-by-cycle-phase` | wellness guide | no |
| 17 | `/resources/best/best-period-tracker-for-perimenopause` | listicle collision A | yes |
| 18 | `/resources/best/best-period-tracker-perimenopause` | listicle collision B | yes |
| 19 | `/resources/guides/school-devices-period-tracking` | school-device collision A | yes |
| 20 | `/resources/privacy-in-practice/school-device-period-tracking-risks` | privacy-in-practice/collision B | yes |
| 21 | `/get` | static get-app | no |
| 22 | `/privacy` | static privacy | no |
| 23 | `/privacy-features` | static privacy features | no |
| 24 | `/support` | static support | no |
| 25 | `/terms` | static terms | no |
| 26 | `/seo-recovery-not-found-check` | not-found | no |
| 27 | `/period-tracker-privacy` | state-only hub/state CTA | no |
| 28 | `/compare/alternatives` | generic hub/compare CTA | no |
| 29 | `/free` | pillar hub/lead-magnet CTA | no |

Each route lists these exact 12 JavaScript-enabled profile IDs, producing `29 x 12 = 348` visual cells: `mobile-360-pre`, `mobile-360-hydrated`, `mobile-390-pre`, `mobile-390-hydrated`, `tablet-768-pre`, `tablet-768-hydrated`, `desktop-1440-pre`, `desktop-1440-hydrated`, `wide-1920-pre`, `wide-1920-hydrated`, `desktop-200-zoom`, and `mobile-390-reduced-motion`. A thirteenth `mobile-390-no-js` profile is semantic-only and produces 29 no-JavaScript screenshots, for 377 screenshot cells total. Pre-hydration capture holds the application module request, waits for CSS and `document.fonts.ready`, captures, then releases the module and waits for the hydration marker. The 200% profile uses a headed Chromium persistent context, sends browser zoom keyboard commands from a reset 100% state, and fails unless the measured CSS viewport changes from 1440 to `720 +/- 2` CSS pixels; CSS `zoom`, page-scale emulation, and screenshot resizing do not satisfy it.

Every JavaScript-enabled profile receives three fresh-context cold-cache CLS runs with the performance observer installed before navigation. Screenshot runs pin the Playwright Chromium revision, locale `en-US`, timezone `America/Chicago`, light color scheme, device scale factor 1, repository-hosted font files, third-party blocking policy, exit-intent suppression, and animations. Pixel diffs use a checked-in `0.1%` changed-pixel threshold plus a `2/255` per-channel tolerance; exceeding either creates a diff and fails. No-JavaScript cells verify semantics and geometry but do not claim hydration or CLS coverage.

### Task 1: Bind Current Production and Freeze Production Plus Local-Dist Baselines

**Files:**
- Create: `scripts/seo-visual-route-matrix.json`
- Create: `scripts/lib/process-launcher.mjs`
- Create: `scripts/rendering-proof-lib.mjs`
- Create: `scripts/capture-seo-visual-proof.mjs`
- Create: `scripts/verify-cls.mjs`
- Create: `scripts/verify-lighthouse-budgets.mjs`
- Create: `scripts/run-rendering-proof.mjs`
- Create: `scripts/verify-bundle-budgets.mjs`
- Create: `scripts/compare-live-static-bytes.mjs`
- Create: `scripts/stage-rendering-artifacts.mjs`
- Create: `scripts/rendering-verifiers.test.ts`
- Read/validate without rewriting: `artifacts/seo-ai-seo-recovery/2026-07-22/prechange/prior-deployment.json` created by AI Task 1
- Create: `artifacts/seo-ai-seo-recovery/2026-07-22/prechange/local-dist/rendering-baseline.json`
- Create: `artifacts/seo-ai-seo-recovery/2026-07-22/prechange/local-dist/file-manifest.json`
- Create: `artifacts/seo-ai-seo-recovery/2026-07-22/prechange/local-dist/semantic-summary.json`
- Create: `artifacts/seo-ai-seo-recovery/2026-07-22/prechange/production/static-byte-comparison.json`
- Create: `artifacts/seo-ai-seo-recovery/2026-07-22/prechange/production/transfer-baseline.json`
- Create: `artifacts/seo-ai-seo-recovery/2026-07-22/prechange/production/visual/cls/summary.json`
- Create: `artifacts/seo-ai-seo-recovery/2026-07-22/prechange/production/visual/lighthouse/summary.json`
- Create: `artifacts/seo-ai-seo-recovery/2026-07-22/prechange/production/visual/manifest.json`
- Create: `artifacts/seo-ai-seo-recovery/2026-07-22/prechange/staging-manifest.tsv`
- Modify: `package.json`, `pnpm-lock.yaml`

**Interfaces:**
- Consumes: the immutable current-production deployment binding created by AI Task 1.
- Produces: `resolvePnpmInvocation()`, `startOwnedVitePreview()`, `stopOwnedProcess()`, `loadRouteMatrix(file?: string): RouteMatrix`, `expandVisualCells(matrix: RouteMatrix): VisualCell[]`, `withProofOrigin({ dist?, origin?, namespace, out }, callback)`, `runClsGate(options)`, `runLighthouseGate(options)`, baseline-capable `run-rendering-proof.mjs`, `stage-rendering-artifacts.mjs`, authoritative production CLS/Lighthouse/visual/transfer baselines, and separately labeled local-dist semantic/bundle diagnostics consumed by Tasks 6-9 and the AI release runner.

- [ ] **Step 1: Write failing matrix, namespace, and capture-harness tests**

```ts
expect(matrix.routes).toHaveLength(29);
expect(new Set(matrix.routes.map((route) => route.path)).size).toBe(29);
expect(matrix.routes.filter((route) => route.collision).map((route) => route.path)).toEqual([
  "/resources/best/best-period-tracker-for-perimenopause",
  "/resources/best/best-period-tracker-perimenopause",
  "/resources/guides/school-devices-period-tracking",
  "/resources/privacy-in-practice/school-device-period-tracking-risks",
]);
expect(matrix.routes.filter((route) => route.branch === "static").map((route) => route.path)).toEqual([
  "/get", "/privacy", "/privacy-features", "/support", "/terms",
]);
expect(new Set(matrix.routes.map((route) => route.template)).size).toBeGreaterThanOrEqual(18);
expect(matrix.profiles).toEqual(EXACT_PROFILES);
expect(matrix.routes.every((route) => JSON.stringify(route.profiles) === JSON.stringify(EXACT_PROFILES.map(({ id }) => id)))).toBe(true);
expect(expandVisualCells(matrix)).toHaveLength(377);
expect(resolveArtifactRoot("prechange")).toContain("/prechange/");
expect(resolveArtifactRoot("local")).toContain("/local/");
expect(resolveArtifactRoot("production")).toContain("/production/");
expect(baseline.htmlRouteCount).toBe(559);
expect(baseline.assets.commonJs.gzip).toBeGreaterThan(0);
expect(priorDeployment).toMatchObject({ schemaVersion: 1, role: "prechange-current-production", projectName: "floriva-web" });
expect(priorDeployment.deploymentId).toBeTruthy();
expect(priorDeployment.deploymentUrl).toMatch(/^https:\/\//);
expect(productionVisual.cells).toHaveLength(377);
expect(productionVisual.deploymentId).toBe(priorDeployment.deploymentId);
expect(staticComparison.status).toMatch(/^(equal|different|unavailable)$/);
```

- [ ] **Step 2: Run the focused test and verify missing files fail**

Run: `pnpm vitest run scripts/rendering-verifiers.test.ts`

Expected: FAIL because the exact matrix, namespace resolver, capture harness, and baseline loader do not exist.

- [ ] **Step 3: Implement the exact matrix and controlled-origin library**

```js
export function loadRouteMatrix(file = "scripts/seo-visual-route-matrix.json") {
  const parsed = JSON.parse(readFileSync(file, "utf8"));
  if (parsed.version !== 1 || parsed.routes.length !== 29 || parsed.profiles.length !== 13) {
    throw new Error("Invalid SEO visual route matrix");
  }
  return parsed;
}

export function resolveArtifactRoot(namespace) {
  if (!new Set(["prechange", "local", "production"]).has(namespace)) throw new Error(`Invalid namespace: ${namespace}`);
  return `artifacts/seo-ai-seo-recovery/2026-07-22/${namespace}`;
}
```

`scripts/lib/process-launcher.mjs` is implemented and tested in Task 1 before any runner needs it. `resolvePnpmInvocation()` uses the version-matched JavaScript entry contract later reused by the AI plan. Preview ownership does not spawn `pnpm`, a `.cmd` shim, or a shell: `startOwnedVitePreview()` resolves the lock-installed Vite JavaScript CLI and launches `process.execPath` with `[viteCli, "preview", "--host", "127.0.0.1", "--port", "0"]` and `shell: false`. It records an unforgeable owner token plus exact PID, reads Vite's actual loopback URL, and polls `/`. `stopOwnedProcess()` may terminate only that recorded PID (or its recorded process group if the platform creates one), waits for exit, and has Windows/POSIX tests proving no orphan server remains after success, child failure, signal, or timeout; it never searches/kills by process name or port.

`withProofOrigin` requires `namespace` and an exact output root already inside `artifacts/seo-ai-seo-recovery/2026-07-22/<namespace>/`. It accepts exactly one of `--dist` or `--origin`. `--dist dist --namespace local` uses `startOwnedVitePreview()`, invokes the callback, and calls `stopOwnedProcess()` in `finally`. `--origin <http-or-https> --namespace local|production` uses an already-running origin and never creates, owns, or terminates a process; local HTTP origins are valid so the composed AI runner can own the sole preview. Task 1 alone may use `--origin <current-production-origin> --namespace prechange --deployment prechange/prior-deployment.json`; this requires HTTPS and exact deployment binding. Reject namespace/output/deployment mismatches and never auto-append `visual` or another directory to `--out`.

Add `verify:bundle-budgets`, but make its CLI reject missing mode/paths rather than guess. Every invocation supplies exactly one of `--dist <path>` or `--origin <url>`, plus `--baseline <file>` for comparisons and `--out <file>`; `--write-baseline <file>` is the only baseline-writing mode. Add an unambiguous convenience command `verify:bundle-budgets:local` with the complete `--dist dist --baseline artifacts/seo-ai-seo-recovery/2026-07-22/prechange/local-dist/rendering-baseline.json --out artifacts/seo-ai-seo-recovery/2026-07-22/local/rendering-metrics.json` arguments. Record raw/gzip/Brotli HTML, CSS, and JavaScript, initial-request membership per route, total `dist` bytes/file count, and asset cache headers. Label these local-build byte deltas `diagnostic-local-dist`; they are never cited as the audited production before/after result unless the byte-equivalence record is `equal`.

- [ ] **Step 4: Implement the baseline capture harness before using it**

First run `pnpm add -D lighthouse@12.8.2 playwright@1.61.1` so the browser controller and the Node-22.17-compatible Lighthouse version are exact in `package.json`/`pnpm-lock.yaml`. `capture-seo-visual-proof.mjs` imports `withProofOrigin`, expands all 377 cells, and writes `{ namespace, origin, route, template, viewport, phase, zoomPercent, reducedMotion, commit, timestamp, path, sha256 }`. It captures pre-hydration by holding the application module request until after the screenshot, then releases it and captures the hydrated state. It waits for repository-hosted fonts, blocks the same third-party hosts in every run, uses Sharp to generate per-route contact sheets, and refuses to write a `prechange` manifest if that directory already contains one. Add `capture:seo-visual-proof` to `package.json`.

Implement `verify-cls.mjs` and `verify-lighthouse-budgets.mjs` now, before product code changes. Each raw result records Playwright `1.61.1`, `browser.version()`, Chromium executable SHA-256/revision, locale `en-US`, timezone `America/Chicago`, light color scheme, reduced-motion value, device scale factor 1, viewport, cache state, and exact throttling. CLS uses three fresh cold contexts for every JavaScript-enabled cell. Its fixed stop condition is: response received; `DOMContentLoaded`; repository fonts ready; every initially present image decoded or explicitly failed; zero in-flight same-origin requests for 1,000 ms; two animation frames; then observer drain. It has a 15-second hard failure timeout, never a success sleep. Lighthouse runs `/` and the ordinary guide three times each in mobile `{ rttMs: 150, throughputKbps: 1638.4, cpuSlowdownMultiplier: 4 }` and desktop `{ rttMs: 40, throughputKbps: 10240, cpuSlowdownMultiplier: 1 }`, with locale `en-US`, no-preference motion, and raw LHR JSON retained. Pre-change failures are recorded rather than used to stop baseline capture; summaries still compute route/profile medians and worst runs for later regression comparisons.

Create `run-rendering-proof.mjs` in baseline-capable form now. `--origin <current-production-origin> --namespace prechange --deployment .../prechange/prior-deployment.json --baseline-mode record --out .../prechange/production/visual` passes that existing production origin to CLS, Lighthouse, and screenshot functions in sequence and never starts or terminates a process. The subgates use identical matrix/browser/throttling/settle settings later used for local and final production proof. Task 8 extends this same runner with hydration, axe/rendering, comparison, and review enforcement; it does not replace the lifecycle.

Before capture, read and validate the canonical `prechange/prior-deployment.json` created by AI Task 1. Require `{ schemaVersion: 1, role: "prechange-current-production", projectName, productionOrigin, deploymentId, deploymentUrl, deploymentCommit, deployedAt, capturedAt, bindingMethod, discoveryCommand, discoveryStdoutSha256, immutableUrlProofSha256, productionOriginProofSha256 }`, recompute every referenced tracked proof hash, and require the configured origin to match exactly. For legacy deployments, accept AI Task 1's provider-current plus complete immutable-asset/all-559-semantic binding; do not require a release marker that the current deployment never emitted. Rendering code may validate this record but may not query deployment lists, select another candidate, or rewrite it.

`compare-live-static-bytes.mjs` hashes the local `dist` file manifest and every URL-addressable current-production counterpart, plus normalized raw HTML semantics for all 559 routes. It writes `status: "equal"` only if every comparable byte and normalized route semantic hash matches; otherwise it writes `different` with exact mismatches, or `unavailable` with retrieval errors. Local bundle/semantic artifacts remain under `prechange/local-dist` regardless. Production transfer measurements, CLS, Lighthouse, and screenshots remain authoritative under `prechange/production`.

`stage-rendering-artifacts.mjs` accepts a TSV containing one `sha256<TAB>repository-relative-file` per line, rejects directories, globs, duplicates, missing files, paths outside the named namespace, and hash mismatches, and stages each validated path as a separate `git add -- <exact-file>` argument only when invoked with `--stage`. Writer mode requires one or more literal `--include` files or `--include-root` directories; it never sweeps the whole namespace implicitly. This prevents Rendering Task 1 from re-owning AI Task 1's already committed `prior-deployment.json` or private-backup receipt. The writer excludes its own `--out` file from hashing, so the manifest is staged separately by its exact path. `--print` shows every path/hash; `--verify-staged` compares the manifest's artifact paths to staged paths under the named artifact roots and fails on missing or extra artifact paths. The orchestrator separately compares the complete cached name set, including literal source files, to the task's approved file list before committing.

- [ ] **Step 5: Run the harness to capture immutable pre-change proof**

Run:

```powershell
node scripts/rendering-proof-lib.mjs verify-deployment-binding --origin $env:FLORIVA_PROD_URL --deployment artifacts/seo-ai-seo-recovery/2026-07-22/prechange/prior-deployment.json
pnpm build
node scripts/verify-bundle-budgets.mjs --dist dist --write-baseline artifacts/seo-ai-seo-recovery/2026-07-22/prechange/local-dist/rendering-baseline.json
node scripts/compare-live-static-bytes.mjs --dist dist --origin $env:FLORIVA_PROD_URL --deployment artifacts/seo-ai-seo-recovery/2026-07-22/prechange/prior-deployment.json --local-manifest artifacts/seo-ai-seo-recovery/2026-07-22/prechange/local-dist/file-manifest.json --semantic-out artifacts/seo-ai-seo-recovery/2026-07-22/prechange/local-dist/semantic-summary.json --out artifacts/seo-ai-seo-recovery/2026-07-22/prechange/production/static-byte-comparison.json
node scripts/verify-bundle-budgets.mjs --origin $env:FLORIVA_PROD_URL --write-baseline artifacts/seo-ai-seo-recovery/2026-07-22/prechange/production/transfer-baseline.json
node scripts/run-rendering-proof.mjs --origin $env:FLORIVA_PROD_URL --namespace prechange --deployment artifacts/seo-ai-seo-recovery/2026-07-22/prechange/prior-deployment.json --baseline-mode record --out artifacts/seo-ai-seo-recovery/2026-07-22/prechange/production/visual
node scripts/stage-rendering-artifacts.mjs write --namespace prechange --include-root artifacts/seo-ai-seo-recovery/2026-07-22/prechange/local-dist --include-root artifacts/seo-ai-seo-recovery/2026-07-22/prechange/production --out artifacts/seo-ai-seo-recovery/2026-07-22/prechange/staging-manifest.tsv
```

Expected: the AI Task 1 `prior-deployment.json` already binds the current production origin to one immutable Cloudflare deployment ID/URL. The separately labeled local-dist artifact records 559 routes and the observed common JS (~3,400,665 raw/~778,726 gzip), metadata chunk (~849,322 raw/~189,514 gzip), content-page chunk (~170,895 raw/~49,921 gzip), and CSS (~44,801 raw/~8,406 gzip), with actual filenames rather than hard-coded names. The static comparison explicitly says `equal`, `different`, or `unavailable`; only `equal` permits later prose to equate local bytes with the production baseline. Current-production raw CLS contains 1,044 runs and a median per route/profile; Lighthouse contains 12 raw LHRs and mobile/desktop medians; production transfer evidence is retained. The current-production visual manifest has exactly 377 unique cells, paths, hashes, origin, and matching deployment ID. All evidence is under `prechange`; the TSV lists every generated file and SHA-256, never a directory.

- [ ] **Step 6: Hand the immutable baseline to the orchestrator**

Only the orchestrator runs this exact task-owned stage/commit manifest:

```powershell
Get-Content artifacts/seo-ai-seo-recovery/2026-07-22/prechange/staging-manifest.tsv
node scripts/stage-rendering-artifacts.mjs verify --namespace prechange --manifest artifacts/seo-ai-seo-recovery/2026-07-22/prechange/staging-manifest.tsv --print
git add -- scripts/seo-visual-route-matrix.json scripts/lib/process-launcher.mjs scripts/rendering-proof-lib.mjs scripts/capture-seo-visual-proof.mjs scripts/verify-cls.mjs scripts/verify-lighthouse-budgets.mjs scripts/run-rendering-proof.mjs scripts/verify-bundle-budgets.mjs scripts/compare-live-static-bytes.mjs scripts/stage-rendering-artifacts.mjs scripts/rendering-verifiers.test.ts package.json pnpm-lock.yaml artifacts/seo-ai-seo-recovery/2026-07-22/prechange/staging-manifest.tsv
node scripts/stage-rendering-artifacts.mjs verify --namespace prechange --manifest artifacts/seo-ai-seo-recovery/2026-07-22/prechange/staging-manifest.tsv --stage --verify-staged
git diff --cached --name-only
git commit -m "test(rendering): freeze SEO visual baselines"
```

### Task 2: Create One Shared Route Tree and Initial Content Contract

**Files:**
- Create: `src/routes.tsx`
- Modify: `src/router.tsx`
- Modify: `src/app.tsx`
- Modify: `src/pages/content-page.tsx`
- Modify: `src/pages/content-page.test.tsx`

**Interfaces:**
- Produces: `createFlorivaRoutes(options?: { initialContent?: InitialContent }): RouteObject[]` and `InitialContent = { entryId: string; markdown: string } | null`.
- Consumes: existing lazy page components and collection definitions.

- [ ] **Step 1: Write failing initial-content and route-inventory tests**

```tsx
const routes = createFlorivaRoutes({ initialContent: { entryId: entry.id, markdown: "## Server body" } });
expect(flattenPaths(routes)).toContain("resources/guides/:slug");
render(<MemoryRouter initialEntries={[entry.routePath]}><App routes={routes} /></MemoryRouter>);
expect(screen.getByRole("heading", { level: 2, name: "Server body" })).toBeTruthy();
```

- [ ] **Step 2: Run tests and verify the new interface is absent**

Run: `pnpm vitest run src/pages/content-page.test.tsx src/site/route-inventory.test.ts`

Expected: FAIL on missing `createFlorivaRoutes`/`InitialContent`.

- [ ] **Step 3: Implement shared route objects and deterministic initial body**

```tsx
export type InitialContent = { entryId: string; markdown: string } | null;

export function createFlorivaRoutes({ initialContent = null } = {}) {
  return [{
    path: "/",
    element: <SiteShell />,
    children: buildChildRoutes(initialContent),
  } satisfies RouteObject];
}
```

`ContentPage` initializes body state from `initialContent` only when the entry IDs match; navigation to another entry still uses `loadEntryBody(entry.id)`.

- [ ] **Step 4: Prove route count and focused behavior**

Run: `pnpm vitest run src/pages/content-page.test.tsx src/site/route-inventory.test.ts src/site/internal-links.test.ts`

Expected: PASS; route inventory and internal links are unchanged.

- [ ] **Step 5: Hand the shared contract to the orchestrator**

Only the orchestrator runs this exact task-owned stage/commit manifest:

```powershell
git add -- src/routes.tsx src/router.tsx src/app.tsx src/pages/content-page.tsx src/pages/content-page.test.tsx
git commit -m "refactor(rendering): share route tree and initial content"
```

### Task 3: Render Complete React Routes and Hydrate Matching Markup

**Files:**
- Create: `src/entry-server.tsx`
- Create: `src/site/route-head.ts`
- Create: `src/site/seo-urls.ts`
- Create: `src/rendering/hydration.test.tsx`
- Create: `public/404.html`
- Modify: `src/main.tsx`
- Modify: `scripts/prerender-html.mjs`
- Modify: `scripts/generated-surfaces.test.ts`

**Interfaces:**
- Produces: `renderRoute(pathname: string): Promise<{ appHtml: string; head: ResolvedRouteHead; status: 200 | 404 }>`; route-equivalent `dist/404.html`; and root markers `data-floriva-prerendered="true"` plus `data-floriva-hydrated="true"` after successful hydration.
- Produces the minimal compile-safe `ResolvedRouteHead` contract and `resolveRouteHead(pathname: string): ResolvedRouteHead` used by `entry-server`; Task 4 expands and centralizes its serialization without introducing the symbol later.

- [ ] **Step 1: Write failing server-render and hydration tests**

```tsx
const rendered = await renderRoute("/resources/guides/period-tracker-hipaa");
expect(rendered.appHtml).toContain("app-shell");
expect(rendered.appHtml).toContain("article-body");
expect(rendered.appHtml).not.toContain("prerendered-page");
expect(recoverableErrors).toEqual([]);
const missing = await renderRoute("/seo-recovery-not-found-check");
expect(missing.status).toBe(404);
expect(missing.appHtml).toContain("Page not found");
expect(missing.head.robots).toContain("noindex");
```

- [ ] **Step 2: Verify the old fallback fails the new expectations**

Run: `pnpm vitest run src/rendering/hydration.test.tsx scripts/generated-surfaces.test.ts`

Expected: FAIL because no server entry exists and the root is replaced.

- [ ] **Step 3: Implement Vite SSR route rendering**

First create the minimal shared head contract from the existing page-meta helpers so this task compiles independently:

```ts
export type ResolvedRouteHead = {
  status: 200 | 404;
  title: string;
  description: string;
  canonical: string;
  robots: "index, follow" | "noindex, nofollow";
  jsonLd: Record<string, unknown>[];
};

export function resolveRouteHead(pathname: string): ResolvedRouteHead {
  const meta = resolvePageMeta(pathname);
  return {
    status: meta.status,
    title: buildDocumentTitle(meta.title),
    description: meta.description,
    canonical: buildCanonicalUrl(meta.canonicalPath),
    robots: meta.noIndex ? "noindex, nofollow" : "index, follow",
    jsonLd: buildPageJsonLd(meta),
  };
}
```

Then implement route rendering:

```tsx
export async function renderRoute(pathname: string): Promise<RenderedRoute> {
  const initialContent = await resolveInitialContent(pathname);
  const stream = await renderToReadableStream(
    <MemoryRouter initialEntries={[pathname]}>
      <App routes={createFlorivaRoutes({ initialContent })} />
    </MemoryRouter>,
  );
  await stream.allReady;
  const head = resolveRouteHead(pathname);
  return { appHtml: await new Response(stream).text(), head, status: head.status };
}
```

`prerender-html.mjs` creates one Vite middleware server, calls `ssrLoadModule("/src/entry-server.tsx")`, injects the complete app, and always closes Vite in `finally`. After the 559 indexable routes, it renders `/seo-recovery-not-found-check` through the same route tree and writes that complete document to `dist/404.html`; `public/404.html` is the checked-in source fixture refreshed by the generator. It never copies `index.html` as the 404 body.

- [ ] **Step 4: Implement explicit hydration behavior**

```tsx
const root = document.getElementById("root");
const prerendered = root?.dataset.florivaPrerendered === "true";
const node = <StrictMode><BrowserRouter><App routes={routes} /></BrowserRouter></StrictMode>;
if (prerendered) {
  hydrateRoot(root!, node, { onRecoverableError: reportHydrationError });
} else {
  createRoot(root!).render(node);
}
```

Load the current content body before the first client tree is created. After the first successful committed effect, set `root.dataset.florivaHydrated = "true"`; browser verifiers use that marker instead of sleeps. On import failure, leave static markup readable, report the error, and do not clear the root. The same flow hydrates `404.html` without changing its not-found heading or noindex metadata.

- [ ] **Step 5: Build and prove route-equivalent output**

Run:

```powershell
pnpm build
pnpm vitest run src/rendering/hydration.test.tsx scripts/generated-surfaces.test.ts
```

Expected: 559 indexable routes plus one route-equivalent `404.html` render; tests pass with zero recoverable hydration errors and the 404 remains the not-found tree before and after hydration.

- [ ] **Step 6: Run two-stage adversarial review and hand off**

After spec and code-quality reviewers are clean, only the orchestrator runs this exact task-owned stage/commit manifest:

```powershell
git add -- src/entry-server.tsx src/site/route-head.ts src/site/seo-urls.ts src/main.tsx src/rendering/hydration.test.tsx public/404.html scripts/prerender-html.mjs scripts/generated-surfaces.test.ts
git commit -m "fix(rendering): hydrate route-equivalent HTML"
```

### Task 4: Centralize Head Metadata and Deterministic First Render

**Files:**
- Modify: `src/site/route-head.ts`
- Modify: `src/site/seo-urls.ts`
- Modify: `src/site/page-meta.ts`
- Modify: `src/site/structured-data.ts`
- Modify: `src/pages/home-page.tsx`, `src/pages/hub-page.tsx`, `src/pages/content-page.tsx`
- Modify: `src/components/reveal.tsx`, `index.html`, `src/styles/base.css`
- Modify: `functions/_middleware.ts`, `functions/_middleware.test.ts`
- Test: `src/site/page-meta.test.ts`, `src/site/structured-data.test.ts`, `src/rendering/hydration.test.tsx`

**Interfaces:**
- Produces: `resolveRouteHead(pathname): ResolvedRouteHead` containing `status`, title, description, canonical, robots, social metadata, and JSON-LD blocks; `serializeRouteHead(head: ResolvedRouteHead): string` consumed unchanged by the prerenderer and edge middleware.

- [ ] **Step 1: Add failing shared-head and reduced-motion tests**

```ts
expect(resolveRouteHead("/").jsonLd.map((block) => block["@type"])).toEqual(
  expect.arrayContaining(["WebSite", "Organization", "FAQPage"]),
);
expect(resolveRouteHead("/missing").robots).toContain("noindex");
expect(resolveRouteHead("/missing").status).toBe(404);
```

The hydration test sets `matchMedia(reduce)` differently between server/client and still expects zero mismatch. `functions/_middleware.test.ts` supplies the generated 404 document to the middleware and asserts raw status `404`, `Content-Type: text/html`, the not-found H1, canonical unknown path, `noindex, nofollow`, one serialized JSON-LD group, complete `#root` markup, and the prerender marker; a known route still returns 200 with its own canonical metadata.

- [ ] **Step 2: Run tests and confirm duplicated behavior fails**

Run: `pnpm vitest run src/site/page-meta.test.ts src/site/structured-data.test.ts src/rendering/hydration.test.tsx`

Expected: FAIL on missing shared resolver, duplicated middleware head assembly, incomplete 404 handling, and non-deterministic Reveal state.

- [ ] **Step 3: Implement shared head and deterministic reveal**

```tsx
const [visible] = useState(true);
```

Server markup and the first hydrated tree keep every `.reveal` element visible; JavaScript must not add a class that hides already-painted content before or during hydration. Remove the `.js .reveal:not(.reveal--visible)` hiding rule. Optional reveal motion may apply only to elements inserted after the initial hydration marker (for example, a later client navigation), with reserved geometry, and remains disabled unless the automated pre-hydration-versus-hydrated pixel diff stays within `0.1%`/`2 of 255` on every cell. If that proof cannot pass, retain visible content and remove the motion enhancement. Reduced motion always forces visible content and no transition. Render dates through one UTC date-only helper and `<time dateTime={entry.updatedAt}>`.

- [ ] **Step 4: Remove local head construction from prerender script**

`scripts/prerender-html.mjs` receives `ResolvedRouteHead` and serializes it. It must not retain `hubMeta`, `buildJsonLd`, or separate canonical/title logic.

`functions/_middleware.ts` imports `resolveRouteHead` and `serializeRouteHead` and deletes its local `buildSeoHeadPayload`, `buildDocumentTitle`, `buildCanonicalUrl`, `buildPageJsonLd`, and `siteSeo` assembly. It rewrites stale head tags once, appends exactly the shared serialized payload, preserves the route-equivalent `404.html` body, and sets the HTTP status from `ResolvedRouteHead.status`. For an unknown document request, `resolveDocumentResponse` fetches `/404.html`, not `/index.html`; known client routes continue to fetch their prerendered path or index shell as applicable.

- [ ] **Step 5: Run focused tests, build, review, and hand off**

```powershell
pnpm vitest run src/site/page-meta.test.ts src/site/structured-data.test.ts src/rendering/hydration.test.tsx functions/_middleware.test.ts
pnpm build
```

After review, only the orchestrator runs this exact task-owned stage/commit manifest:

```powershell
git add -- src/site/route-head.ts src/site/seo-urls.ts src/site/page-meta.ts src/site/structured-data.ts src/pages/home-page.tsx src/pages/hub-page.tsx src/pages/content-page.tsx src/components/reveal.tsx index.html src/styles/base.css scripts/prerender-html.mjs functions/_middleware.ts functions/_middleware.test.ts public/404.html src/site/page-meta.test.ts src/site/structured-data.test.ts src/rendering/hydration.test.tsx
git commit -m "refactor(seo): centralize route head rendering"
```

Expected: all focused tests pass; raw unknown paths return the route-equivalent 404 document with status 404/noindex before and after hydration; homepage FAQ schema remains; static, SSR, and edge head strings are byte-equivalent after whitespace normalization.

### Task 5: Enforce Complete Semantics Across All 559 Outputs

**Files:**
- Modify: `scripts/verify-prerendered-content.mjs`
- Modify: `scripts/generated-surfaces.test.ts`
- Modify: `package.json`

**Interfaces:**
- Produces: `verify:prerendered-content:all` for `dist` and `verify:prerendered-content:prod -- --origin $env:FLORIVA_PROD_URL` for live raw HTML, both with per-route common and field-dependent failures.
- Consumes: generated content data and the 559-URL sitemap.

- [ ] **Step 1: Write failing semantic assertions**

```ts
expect(errorsFor(entry, html)).toEqual([]);
// assertions include app shell/header/main/footer, one H1, canonical/head/schema,
// markdown headings/lists/GFM tables, <time>, FAQ, sources, related links,
// tools, tiers, hiddenCosts, answers, keyFacts, relevantLaws, and tableData.
```

- [ ] **Step 2: Run against the old verifier and confirm coverage failure**

Run: `pnpm verify:prerendered-content -- --all-sitemap --min 559`

Expected: FAIL until the route-equivalent build and new field assertions exist.

- [ ] **Step 3: Implement exhaustive validators**

Use common assertions on every sitemap entry and conditional assertions driven by each content entry's non-empty fields. Support a filesystem adapter for `dist` and an HTTP adapter selected by `--origin`; both use the same assertion functions. Validate same-origin assets exist or return 200; reject `.prerendered-page`, empty Suspense output, missing root marker, and metadata/JSON-LD divergence.

Add these package commands:

```json
{
  "verify:prerendered-content:all": "node scripts/verify-prerendered-content.mjs --all-sitemap --min 559",
  "verify:prerendered-content:prod": "node scripts/verify-prerendered-content.mjs --all-sitemap --min 559"
}
```

- [ ] **Step 4: Make the standard test command self-contained**

Change the generated-surface test that reads `dist/index.html` to create its build fixture in setup or invoke the minimal build helper. A fresh `pnpm test` must not require a manual prior build.

- [ ] **Step 5: Prove exhaustive coverage and hand off**

```powershell
pnpm build
pnpm verify:prerendered-content:all
pnpm test
```

Only the orchestrator runs this exact task-owned stage/commit manifest:

```powershell
git add -- scripts/verify-prerendered-content.mjs scripts/generated-surfaces.test.ts package.json
git commit -m "test(seo): verify semantics across every route"
```

Expected: exactly 559 routes checked; 277 baseline tests plus new tests pass from a fresh checkout state.

### Task 6: Remove Common-Bundle Content and Telemetry Weight

**Files:**
- Create: `src/site/resources-megamenu.ts`
- Create: `src/components/app-error-boundary.tsx`
- Create: `scripts/inline-critical-css.mjs`
- Modify: `scripts/verify-lighthouse-budgets.mjs`
- Modify: `src/site/internal-links.ts`, `src/components/site-header.tsx`, `src/app.tsx`, `src/main.tsx`, `src/site/sentry.ts`, `src/site/page-meta.ts`
- Modify: `scripts/verify-bundle-budgets.mjs`, `scripts/rendering-verifiers.test.ts`
- Create: `artifacts/seo-ai-seo-recovery/2026-07-22/local/performance-staging-manifest.tsv`

**Interfaces:**
- Produces: lightweight header/SEO imports, `reportCaughtError(error)`, route-critical CSS extraction, per-route transfer budgets, raw Lighthouse result files, and `verify:lighthouse-budgets`.

- [ ] **Step 1: Write failing import-boundary and transfer tests**

```ts
expect(traceImports("src/components/site-header.tsx")).not.toContain("content-manifest");
expect(traceImports("src/main.tsx")).not.toContain("@sentry/react");
expect(result.routes["/"].initialGzip).toBeLessThanOrEqual(baseline.routes["/"].initialGzip);
expect(result.html.maxBrotli).toBeLessThanOrEqual(baseline.html.maxBrotli * 1.1);
expect(result.css.repeatTransferBytes).toBe(0);
expect(result.dist.totalBytes).toBeLessThanOrEqual(baseline.dist.totalBytes * 1.1);
expect(parseLighthouseRuns(rawRuns).every((run) => run.accessibility === 1)).toBe(true);
```

- [ ] **Step 2: Run tests and prove current eager imports fail**

Run: `pnpm vitest run scripts/rendering-verifiers.test.ts`

Expected: FAIL on content-manifest and Sentry reachability.

- [ ] **Step 3: Split lightweight helpers and defer Sentry**

```ts
export async function reportCaughtError(error: unknown) {
  const { captureException } = await import("@sentry/react");
  captureException(error);
}
```

Use a local React error boundary; initialize Sentry through an idle/dynamic import after hydration and on caught errors. Move megamenu constants/building out of `internal-links.ts`; keep a compatibility re-export.

- [ ] **Step 4: Extract route-critical CSS and measure the complete transfer path**

Run `pnpm add -D critters` only; Lighthouse and pinned Playwright were installed in Task 1 and must not be re-resolved. `scripts/inline-critical-css.mjs` processes every generated HTML document with `Critters({ path: "dist", publicPath: "/", preload: "media", pruneSource: false, compress: true })`, leaves a `<noscript>` stylesheet fallback, and fails if a document loses its original stylesheet URL. Keeping the shared source CSS intact prevents one route from pruning rules needed by another. The build runs it only after route-equivalent prerendering. This is accepted only when pre-hydration/hydrated screenshot diffs and all CLS cells prove no FOUC or geometry change; if that proof fails, the implementer restores a synchronous stylesheet and keeps the measured render-blocking delta as residual evidence rather than masking it with an unproved async-link trick.

`verify-bundle-budgets.mjs` measures raw/gzip/Brotli HTML for all 559 pages (min/median/p95/max), raw/gzip/Brotli CSS and JS, initial request transfer by pinned route, first-load CSS transfer, repeat-navigation CSS transfer/cache disposition, and total `dist` bytes/file count. Local repeat requests must transfer zero CSS bytes from Chromium's disk cache and generated immutable assets must advertise the configured long-lived cache header; production additionally records `Age`, `ETag`, and `CF-Cache-Status` when present without inventing a pass condition for headers Cloudflare omits.

`verify-lighthouse-budgets.mjs` retains Task 1's pinned runtime and adds enforcement mode. It accepts exactly one of `--dist` or `--origin`, plus `--namespace local|production`, `--baseline artifacts/seo-ai-seo-recovery/2026-07-22/prechange/production/visual/lighthouse/summary.json`, and an exact `--out`. It audits `/` and `/resources/guides/period-tracker-hipaa` three times each in the same pinned mobile/desktop profiles (12 raw LHR JSON files per namespace) and stores raw LHRs plus an aggregate JSON below the supplied output root. Every individual run must have accessibility `1.0`, unused JavaScript potential savings at most `10 KiB`, render-blocking potential savings at most `2 KiB`, no failed audits in `color-contrast`, `image-size-responsive`, or `uses-responsive-images`, and LCP at most `2.5 s` mobile/`2.0 s` desktop. The parser reports median and worst-run LCP/unused-JS/render-blocking values and fails if local or production regresses more than 10% against the audited current-production median even while under an absolute ceiling. A threshold exception requires user-approved trace evidence and cannot be encoded silently.

- [ ] **Step 5: Build, measure, review, and hand off**

```powershell
pnpm build
pnpm verify:bundle-budgets -- --dist dist --baseline artifacts/seo-ai-seo-recovery/2026-07-22/prechange/local-dist/rendering-baseline.json --out artifacts/seo-ai-seo-recovery/2026-07-22/local/rendering-metrics.json
pnpm verify:lighthouse-budgets -- --dist dist --namespace local --baseline artifacts/seo-ai-seo-recovery/2026-07-22/prechange/production/visual/lighthouse/summary.json --out artifacts/seo-ai-seo-recovery/2026-07-22/local/visual/lighthouse
node scripts/stage-rendering-artifacts.mjs write --namespace local --include artifacts/seo-ai-seo-recovery/2026-07-22/local/rendering-metrics.json --include-root artifacts/seo-ai-seo-recovery/2026-07-22/local/visual/lighthouse --out artifacts/seo-ai-seo-recovery/2026-07-22/local/performance-staging-manifest.tsv
pnpm vitest run scripts/rendering-verifiers.test.ts
```

After review, only the orchestrator runs this exact task-owned stage/commit manifest:

```powershell
Get-Content artifacts/seo-ai-seo-recovery/2026-07-22/local/performance-staging-manifest.tsv
node scripts/stage-rendering-artifacts.mjs verify --namespace local --manifest artifacts/seo-ai-seo-recovery/2026-07-22/local/performance-staging-manifest.tsv --print
git add -- src/site/resources-megamenu.ts src/components/app-error-boundary.tsx src/site/internal-links.ts src/components/site-header.tsx src/app.tsx src/main.tsx src/site/sentry.ts src/site/page-meta.ts scripts/inline-critical-css.mjs scripts/verify-bundle-budgets.mjs scripts/verify-lighthouse-budgets.mjs scripts/rendering-verifiers.test.ts scripts/prerender-html.mjs package.json pnpm-lock.yaml artifacts/seo-ai-seo-recovery/2026-07-22/local/performance-staging-manifest.tsv
node scripts/stage-rendering-artifacts.mjs verify --namespace local --manifest artifacts/seo-ai-seo-recovery/2026-07-22/local/performance-staging-manifest.tsv --stage --verify-staged
git diff --cached --name-only
git commit -m "perf(web): reduce SEO critical path"
```

### Task 7: Fix Contrast, Accessible Names, and Image Geometry

**Files:**
- Modify: `src/styles/tokens.css`, `src/components/store-buttons.tsx`, `src/components/store-buttons.test.tsx`
- Create: `public/logo-mark-96.png`, `public/logo-mark-144.png`
- Modify: `src/components/site-header.tsx`, `src/components/site-footer.tsx`, `src/components/device-frame.tsx`, `src/styles/device-frame.css`, `public/_routes.json`
- Test: `src/components/site-header-footer.test.tsx`, `src/components/device-frame.test.tsx`, `scripts/generated-surfaces.test.ts`

**Interfaces:**
- Produces: WCAG-AA `--ink-mute: #69594E`, visible-label accessible names, and stable image dimensions.

- [ ] **Step 1: Write failing contrast, name, and asset tests**

```ts
expect(contrast("#69594E", "#E8D2CB")).toBeGreaterThanOrEqual(4.5);
expect(appStoreLink.textContent).toContain("Download on the App Store");
expect(appStoreLink.getAttribute("aria-label")).toBeNull();
```

Assert the new PNGs are 96x96/144x144 and every referenced device source exists.

- [ ] **Step 2: Run focused tests and observe failure**

Run: `pnpm vitest run src/components/store-buttons.test.tsx src/components/device-frame.test.tsx src/components/site-header-footer.test.tsx scripts/generated-surfaces.test.ts`

Expected: FAIL on old token/name/missing assets.

- [ ] **Step 3: Implement accessible styles and labels**

Set `--ink-mute: #69594E`; remove overriding store-link `aria-label` values so the visible two-line label is the computed name. Preserve pill geometry and focus styling.

- [ ] **Step 4: Generate responsive assets and reserve geometry**

Generate PNGs from the 1024px source with Sharp. The header uses `src="/logo-mark-96.png" srcSet="/logo-mark-96.png 96w, /logo-mark-144.png 144w" sizes="44px" width="44" height="44"`; the footer uses the same `src`/`srcSet` with `sizes="48px" width="48" height="48"`. Width descriptors and `sizes` let the browser choose the 144px source for high-density display without an invalid density claim. Organization schema remains on `/logo-mark.png`. Add `aspect-ratio: 1206 / 2622` to `.device-frame__picture` in `src/styles/device-frame.css`.

- [ ] **Step 5: Test, visually review, and hand off**

```powershell
pnpm vitest run src/components/store-buttons.test.tsx src/components/device-frame.test.tsx src/components/site-header-footer.test.tsx scripts/generated-surfaces.test.ts
```

After the independent visual reviewer passes, only the orchestrator runs this exact task-owned stage/commit manifest:

```powershell
git add -- src/styles/tokens.css src/styles/device-frame.css src/components/store-buttons.tsx src/components/store-buttons.test.tsx src/components/site-header.tsx src/components/site-footer.tsx src/components/device-frame.tsx src/components/site-header-footer.test.tsx src/components/device-frame.test.tsx public/logo-mark-96.png public/logo-mark-144.png public/_routes.json scripts/generated-surfaces.test.ts
git commit -m "fix(a11y): correct contrast names and image sizing"
```

Expected: focused tests pass and a separate visual agent approves real screenshots.

### Task 8: Build Hydration, CLS, Accessibility, and Screenshot Gates

**Files:**
- Create: `scripts/verify-hydration-browser.mjs`, `scripts/verify-rendering-browser.mjs`
- Modify: `scripts/run-rendering-proof.mjs`
- Modify: `scripts/verify-cls.mjs`, `scripts/verify-lighthouse-budgets.mjs`
- Modify: `scripts/rendering-proof-lib.mjs`, `scripts/capture-seo-visual-proof.mjs`
- Modify: `scripts/rendering-verifiers.test.ts`, `package.json`, `pnpm-lock.yaml`
- Create: `artifacts/seo-ai-seo-recovery/2026-07-22/local/visual/manifest.json`
- Create: `artifacts/seo-ai-seo-recovery/2026-07-22/local/visual/review-verdicts.json`
- Create: `artifacts/seo-ai-seo-recovery/2026-07-22/local/visual/staging-manifest.tsv`

**Interfaces:**
- Produces: `verify:hydration`, `verify:rendering`, `verify:cls`, `verify:rendering-proof`; machine-readable 377-cell visual manifest; pre/hydrated diffs; current-production-prechange/local contact sheets; and per-cell adversarial verdicts.

- [ ] **Step 1: Add failing browser-harness unit tests**

```ts
expect(parseClsRuns([{ value: 0.09 }, { value: 0.11 }])).toMatchObject({ pass: false });
expect(validateProofManifest(manifest, matrix).missing).toEqual([]);
expect(validateProofManifest(manifest, matrix).cells).toHaveLength(377);
expect(validateReviewVerdicts(verdicts, manifest).pending).toEqual([]);
expect(validateReviewVerdicts(verdicts, manifest).missing).toEqual([]);
```

- [ ] **Step 2: Install exact test dependencies**

Run: `pnpm add -D @axe-core/playwright`

Expected: `package.json` and `pnpm-lock.yaml` contain the exact `@axe-core/playwright` dependency; Task 1's exact Lighthouse and Playwright versions remain unchanged.

`run-rendering-proof.mjs` requires an explicit namespace and an exact output root; it never appends the namespace or `visual` itself. `--dist dist --namespace local --out .../local/visual` uses Task 1's direct-Vite `startOwnedVitePreview()` helper, parses its actual loopback origin, polls `/` until it returns HTML, passes that same origin to imported verifier functions, and calls `stopOwnedProcess()` in `finally`, including on signals and verifier exceptions. It never launches pnpm or a `.cmd` shim. `--origin <url> --namespace local|production --out .../<namespace>/visual` performs the same gates against an already-running origin and never starts, owns, or terminates a process; local HTTP is allowed for the composed AI runner's one-preview lifecycle, while production requires HTTPS. It rejects `--dist` with production, namespace/output mismatches, missing explicit namespace, and fixed-port assumptions.

- [ ] **Step 3: Implement cold-load instrumentation**

```js
await page.addInitScript(() => {
  window.__florivaLayoutShifts = [];
  new PerformanceObserver((list) => {
    for (const entry of list.getEntries()) if (!entry.hadRecentInput) window.__florivaLayoutShifts.push(entry.value);
  }).observe({ type: "layout-shift", buffered: true });
});
```

Each of the 348 JavaScript-enabled route/profile cells uses three fresh contexts for CLS, the exact pinned settings in the matrix section, an observer installed before navigation, and a cold browser cache/service-worker reset. Fail console hydration prefixes, page errors, failed same-origin requests, axe violations, overflow, hidden focus, non-pill buttons, image geometry changes, or any individual CLS run above 0.10. The 404 cell additionally asserts raw HTTP status 404, visible not-found H1/body, canonical requested path, noindex meta, intact server root before JavaScript release, `data-floriva-hydrated=true` afterward, and unchanged H1/body after hydration.

- [ ] **Step 4: Capture required screenshots**

Capture all 377 exact matrix cells. Pre-hydration screenshots release their held module only after the image is hashed; hydrated screenshots wait for the root marker, fonts, two animation frames, image decode, and network quiet. Reduced-motion asserts the media query and zero active animations. The no-JavaScript context disables JavaScript at launch. The zoom profile performs real browser zoom and records measured inner/outer width. Generate: (1) a pre-hydration-versus-hydrated diff for each JavaScript viewport pair, failing over `0.1%` changed pixels or `2/255` per channel after masking only timestamps explicitly named in the matrix; (2) a prechange-versus-local diff retained as informational evidence; and (3) per-route contact sheets with prechange, local pre-hydration, local hydrated, and diff panels. The command fails when a cell, hash, font, timing marker, diff, or contact sheet is missing.

Every prechange, local, and final-production visual run writes the same schema:

```ts
type VisualProofManifest = {
  schemaVersion: 1;
  namespace: "prechange" | "local" | "production";
  phase: "current-production-baseline" | "local-candidate" | "production-technical";
  origin: string;
  deploymentId: string | null;
  routeMatrixSha256: string;
  browser: { playwrightVersion: string; chromiumVersion: string; executableSha256: string };
  counts: { routes: 29; profiles: 13; cells: 377; screenshots: 377 };
  cells: Array<{
    cellId: string;
    route: string;
    profileId: string;
    screenshotPath: string;
    screenshotSha256: string;
    diffPath: string | null;
    diffSha256: string | null;
    contactSheetPath: string;
    contactSheetSha256: string;
    rawStatus: number;
    canonical: string;
    automatedVerdict: "pass" | "baseline-observation";
  }>;
};
```

The validator deep-matches all 377 expected `cellId` values to the matrix, rejects duplicates/missing/extra cells, recomputes every evidence hash, and for production requires `deploymentId`/`origin` to equal `production/deployment.json`. The AI production visual reviewer consumes this manifest and writes one verdict covering every cell ID (or explicit per-cell failures); its review index stores the manifest path and SHA-256 rather than trusting screenshot filenames.

- [ ] **Step 5: Run the local browser gate**

Run:

```powershell
node scripts/run-rendering-proof.mjs --dist dist --namespace local --baseline artifacts/seo-ai-seo-recovery/2026-07-22/prechange/production/visual --out artifacts/seo-ai-seo-recovery/2026-07-22/local/visual
```

Expected: automated hydration/rendering/axe/CLS/Lighthouse/bundle checks pass; 377 screenshots, all paired diffs/contact sheets, raw results, and a 377-entry `review-verdicts.json` template with status `pending` are written only below `local/visual`; every recorded CLS run is at most 0.10.

- [ ] **Step 6: Dispatch the mandatory adversarial visual review**

A non-implementing agent must open the rendered images themselves (not filenames), inspect every per-route contact sheet and every cell that has a nonzero diff, and spot-check the live local page in each distinct template. It attacks first-frame/hydrated displacement, overflow, clipping, focus, computed contrast, navigation, store links, device art, long headings, font fallback, cache-dependent flashes, reduced motion, real 200% zoom, pill geometry, and editorial-botanical consistency. For each of the 377 cell IDs it records `{ cellId, verdict: "pass" | "fail", reviewer, reviewedAt, evidencePath, note }`; empty reviewer/note-on-failure, missing cells, or `pending` is invalid. Any failure returns to a fresh implementer; recapture and repeat this same reviewer category until all verdicts pass.

- [ ] **Step 7: Validate adversarial verdicts, then hand the exact manifest to the orchestrator**

Run:

```powershell
node scripts/run-rendering-proof.mjs --dist dist --namespace local --baseline artifacts/seo-ai-seo-recovery/2026-07-22/prechange/production/visual --out artifacts/seo-ai-seo-recovery/2026-07-22/local/visual --verify-existing --require-adversarial-review
node scripts/stage-rendering-artifacts.mjs write --namespace local --include-root artifacts/seo-ai-seo-recovery/2026-07-22/local/visual --out artifacts/seo-ai-seo-recovery/2026-07-22/local/visual/staging-manifest.tsv
```

Expected: exit 0 only when the manifest, screenshot hashes, diffs, contact sheets, automated results, and all 377 adversarial verdicts are present and passing.

Only the orchestrator runs:

```powershell
Get-Content artifacts/seo-ai-seo-recovery/2026-07-22/local/visual/staging-manifest.tsv
node scripts/stage-rendering-artifacts.mjs verify --namespace local --manifest artifacts/seo-ai-seo-recovery/2026-07-22/local/visual/staging-manifest.tsv --print
git add -- scripts/rendering-proof-lib.mjs scripts/verify-hydration-browser.mjs scripts/verify-rendering-browser.mjs scripts/verify-cls.mjs scripts/verify-lighthouse-budgets.mjs scripts/capture-seo-visual-proof.mjs scripts/run-rendering-proof.mjs scripts/rendering-verifiers.test.ts package.json pnpm-lock.yaml artifacts/seo-ai-seo-recovery/2026-07-22/local/visual/staging-manifest.tsv
node scripts/stage-rendering-artifacts.mjs verify --namespace local --manifest artifacts/seo-ai-seo-recovery/2026-07-22/local/visual/staging-manifest.tsv --stage --verify-staged
git diff --cached --name-only
git commit -m "test(web): enforce adversarial visual quality"
```

### Task 9: Integrate Rendering Gates and Obtain Final Review

**Files:**
- Modify: `package.json`
- Create: `scripts/run-local-funnel.mjs`
- Create: `scripts/run-local-funnel.test.ts`
- Create: `artifacts/seo-ai-seo-recovery/2026-07-22/local/rendering-proof-manifest.json`

**Interfaces:**
- Produces: complete local rendering proof consumed by the execution index, plus the exact `--origin ... --namespace production` contract the production plan runs after deployment.

- [ ] **Step 1: Add every rendering gate to composed local/full verification**

Replace the shell-only local funnel composition with `scripts/run-local-funnel.mjs`. With `--dist dist`, it may build when `--build` is supplied, then uses Task 1's shared direct-Vite `startOwnedVitePreview()`/`stopOwnedProcess()` helpers, discovers/polls the actual origin, and passes that origin explicitly to every browser gate. With `--origin <url>`, it never starts or stops a server; this is the mode consumed by the later AI composed runner. It runs all-559 semantics, hydration, rendering, CLS, the fully specified `verify:bundle-budgets:local` command, and every existing product/content/link/funnel gate without narrowing them. `verify:funnel:local:full` invokes `node scripts/run-local-funnel.mjs --dist dist --build`. No composed command invokes bare `verify:bundle-budgets`, assumes port 4173, runs a browser gate after its owned preview exits, or launches a `.cmd` file. Tests require one owner, OS-assigned port propagation to every origin-aware child, and cleanup with no orphan Vite server on success, child failure, and signal.

- [ ] **Step 2: Run the complete local sequence**

```powershell
pnpm lint
pnpm typecheck
pnpm test
pnpm build
pnpm verify:prerendered-content:all
pnpm verify:bundle-budgets:local
node scripts/run-rendering-proof.mjs --dist dist --namespace local --baseline artifacts/seo-ai-seo-recovery/2026-07-22/prechange/production/visual --out artifacts/seo-ai-seo-recovery/2026-07-22/local/visual --verify-existing --require-adversarial-review
node scripts/run-local-funnel.mjs --dist dist --no-build
```

Expected: every command exits 0; build reports exactly 559 prerendered routes.

- [ ] **Step 3: Write the exact proof manifest**

Record commit, commands, exit codes, route count, semantic coverage, all individual CLS runs, all raw LHR paths and aggregate accessibility/LCP/unused-JS/render-blocking values, HTML gzip/Brotli distribution, CSS first/repeat transfer and cache evidence, total deploy bytes, diagnostic local-dist asset/bundle deltas, screenshot/diff/contact-sheet paths and hashes, and all per-cell reviewer verdicts. Store this only at `local/rendering-proof-manifest.json`; do not create or populate final-production artifacts before a deployment exists. The later production comparator uses `prechange/production/transfer-baseline.json` and `prechange/production/visual`, never the local-dist diagnostic, for audited before/after claims. It may cite local-dist byte deltas as production-equivalent only when `prechange/production/static-byte-comparison.json.status` is `equal`.

The production plan must later run the already-implemented external-origin mode exactly as follows, producing a separate namespace and applying the same parser/budgets rather than copying local results:

```powershell
node scripts/run-rendering-proof.mjs --origin $env:FLORIVA_PROD_URL --namespace production --deployment artifacts/seo-ai-seo-recovery/2026-07-22/production/deployment.json --baseline artifacts/seo-ai-seo-recovery/2026-07-22/prechange/production/visual --out artifacts/seo-ai-seo-recovery/2026-07-22/production/technical/visual
```

Expected after deployment: raw production HTML/status/head/hydration, three-run CLS, three-run mobile/desktop raw LHRs, accessibility/LCP/unused-JS/render-blocking budgets, CSS first/repeat/cache headers, total transferred bytes, screenshots, diffs, contact sheets, and independent per-cell visual verdicts all exist only under `production`. `production/technical/visual/manifest.json` is schema-valid, bound to the new deployment ID/origin, contains exactly 377 hash-valid cells, and is directly consumable by the AI plan's production visual-review validator.

- [ ] **Step 4: Run independent spec, quality, SEO, and visual adversaries**

Each agent receives the approved spec and full diff. Any finding returns to a fresh corrective implementer and the same review category repeats.

- [ ] **Step 5: Hand the reviewed integration manifest to the orchestrator**

Only the orchestrator runs:

```powershell
git add -- scripts/run-local-funnel.mjs scripts/run-local-funnel.test.ts package.json artifacts/seo-ai-seo-recovery/2026-07-22/local/rendering-proof-manifest.json
git commit -m "test(seo): prove route rendering recovery"
```
