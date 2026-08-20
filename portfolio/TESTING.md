# Testing

Three runners, two categories, one honest gap.

The two categories matter more than the runners. **Unit tests** ask whether a function
behaves. **Gates** ask whether the deployed artifact is correct, and most of the
interesting work in this repository is in the second category, because most of the
failure modes here are not "this function returned the wrong number." They are "the
page rendered but never hydrated," "the redirect table drifted from the ledger," and
"the layout check has been passing for weeks without being able to fail."

Every number on this page comes from the runs captured in
[`docs/evidence/`](../docs/evidence/), not from memory.

---

## Runners

| Runner | Scope | Command |
|---|---|---|
| **Vitest 3.2** + jsdom | Unit and integration: components, pages, edge handlers, Worker, build-script logic | `pnpm test` |
| **`node:test`** | One script suite written against Node's runner, excluded from the Vitest glob | `pnpm test:scripts` |
| **Playwright 1.61**, driven by `.mjs` scripts | Browser gates: mobile layout, SEO funnel, prerendered content | `pnpm verify:*` |

`scripts/**/*.test.mjs` is excluded from Vitest deliberately: Vitest's default glob
matches `*.test.mjs`, then fails at import because `node:test` needs a real file-scheme
URL that the transform pipeline does not hand it. The exclusion and its reason are
recorded in [`vitest.config.ts`](../vitest.config.ts).

---

## Last run

```text
Test Files  60 passed (60)
     Tests  429 passed | 2 skipped (431)
  Duration  162.93s
```

Both skips are declared, not silent. One is the runtime-declaration case that only
applies under a pinned Node build; the other is the frozen-claims row walk, which reads
frozen sources out of a specific commit and therefore cannot run in this squashed
snapshot. It prints that reason when it skips.

Plus the `node:test` suite: `# pass 3 # fail 0`. Full output:
[`docs/evidence/test-output.txt`](../docs/evidence/test-output.txt).

61 test files hold 9,659 lines against 12,185 lines of application source: 79 lines of
test per 100 lines of source. 60 of the 61 run under Vitest; the remaining one is
`scripts/verify-linkedin-posts.test.mjs`, which runs under `node:test`.

---

## Coverage

Measured with v8 on 2026-08-07. Raw report:
[`docs/evidence/coverage-summary.json`](../docs/evidence/coverage-summary.json).

| Area | Files | Lines covered | Lines | Branches |
|---|---:|---|---:|---:|
| `src/lib/` | 1 | 8 / 8 | 100% | 100% |
| Site logic (`src/site/`) | 20 | 4,632 / 4,786 | 96.8% | 88.3% |
| Email Worker (`worker/src/`) | 4 | 329 / 348 | 94.5% | 89.7% |
| Pages (`src/pages/`) | 4 | 897 / 1,002 | 89.5% | 80.4% |
| Edge (`functions/`) | 20 | 1,811 / 2,128 | 85.1% | 72.0% |
| Components (`src/components/`) | 20 | 959 / 1,139 | 84.2% | 79.0% |
| **Total** | **71** | **8,636 / 9,574** | **90.2%** | **80.7%** |

The two files not in the table are `src/app.tsx` and `src/router.tsx`, both at **0%**.
They are composition shells (provider nesting and route registration) exercised by
the browser gates and by nothing in the unit suite. They are counted in the
denominator rather than excluded, because excluding the files you did not test is how
a coverage number stops meaning anything.

### The function-coverage number is 35.28% and that figure is misleading

`src/site/content.ts` uses `import.meta.glob` to register one lazy import per content
document. That registers **454 thunks**, which are most of the functions counted
anywhere in the repository, and unit tests never call them. The content they load is
imported directly in tests.

| | Covered | Total | |
|---|---:|---:|---:|
| Functions, as v8 reports it | 259 | 734 | **35.28%** |
| Functions, excluding the 454 glob thunks | 238 | 280 | **85.0%** |

Both rows are published. The first is what the tool says; the second is what it means.

### What coverage does *not* include, and why

`vitest.config.ts` scopes coverage to `src/**`, `functions/**`, and `worker/src/**`,
and excludes `src/site/generated/**`.

Vitest 3.2 defaults to `all: true` with no `include`, which pulls the 458 generated
modules (141,323 lines, one file of 5.23 MB) plus all 53 scripts into instrumentation.
That turns a 90-second run into tens of minutes or an OOM, and produces a percentage
describing a corpus nobody wrote. Scoping it was a prerequisite for the number above
being meaningful at all.

**`scripts/` is not in the coverage denominator.** 16,444 lines of build and
verification tooling are tested by 13 of the 61 test files, but measured by whether
the gates they implement catch real defects (see the self-test below), not by line
coverage. Publishing a coverage percentage for a directory whose job is to fail the
build would be measuring the wrong thing.

---

## Gates

41 of the 66 npm scripts are verification gates. They fall into five groups.

### Build-output gates, run automatically as part of `pnpm build`

| Gate | Asserts |
|---|---|
| `verify:prerender-bundle` | Every one of the 470 prerendered documents carries a `<script type="module">` whose `src` resolves to a real file in `dist`, and every sitemap and noindex route was actually swept as a document |
| `verify:prerendered-content` | Prerendered bodies contain the content they claim to |

### Browser gates, Playwright against a running preview

| Gate | Asserts |
|---|---|
| `verify:mobile-layout` | 21 probe rules at 390×844 across the full route set (20 archetypes plus content routes scored on three orthogonal axes), covering overflow, tap targets, text size, fixed chrome, and reveal state, plus 19 driver rules for megamenu geometry, modal behaviour, and skip-link focus |
| `verify:mobile-layout:fast` | The same rules across 20 archetype routes, viewport-only. 1 to 3 minutes instead of 10 to 20 |
| `verify:mobile-gate-selftest` | **That the mobile gate can fail.** See below |
| `verify:seo-funnel-browser` | Funnel paths render and link correctly, desktop and mobile |
| `verify:seo400-browser` | The net-new route set renders, desktop and mobile |

### Live-origin gates, HTTP against production or a local Pages preview

| Gate | Asserts |
|---|---|
| `verify:redirects` | All 457 redirect rules: GET and HEAD both 301, exact `Location`, query string preserved, plus parity in both directions between the implementation and the ledger |
| `verify:seo` / `verify:prod-seo-health` | Sitemap, robots, canonical, and index-policy consistency |
| `check:links` | Internal link graph; `--external` also resolves outbound links |
| `verify:lead-magnet:prod-smoke` | Public resource page, health endpoint, rejection of static downloads, unsigned links, missing unsubscribe tokens, and cross-origin writes |

### Content and editorial gates

| Gate | Asserts |
|---|---|
| `audit:claims` | Nine regex patterns over every MDX file; flags numeric, legal, and dated claims with no inline link and no matching frontmatter source. Tiered HIGH / MED / LOW by collection |
| `test:claims` | Re-resolves all 1,010 frozen mdast locators and asserts each cited sentence still says what it said |
| `verify:sources` | Fetches every source URL (8 concurrent) and classifies PASS / PAYWALLED / MISSING / DRIFT / ERROR / TIMEOUT. Writes a dated report to `docs/research/` |
| `verify:product-alignment` | Marketing copy matches the product's actual capabilities |

`audit:claims` is heuristic: nine regexes over prose, and false positives are expected,
the script says so. The frozen baseline is what turns it from a noisy linter into a
useful gate: it does not fail on the presence of a claim, it fails when a frozen claim
silently changes.

### Deploy-readiness gates

`verify:deploy-readiness` chains product alignment, R2 resource existence, D1
lead-magnet schema, and Cloudflare deploy configuration. `pnpm deploy` runs it before
touching anything.

---

## The self-test, which is the point of this page

`.app-shell` is `overflow: clip`. That means `document.documentElement.scrollWidth`
can essentially never exceed the viewport for in-shell content, so any
horizontal-overflow check built on it passes on every page regardless of what the
layout actually does.

Two successive versions of the mobile gate had this flaw. The second was worse than
the first because it was subtler: every overflowing element resolved to a clipping
ancestor and got filed as a non-failing *warning*, so four injected, genuinely
page-breaking defects produced exactly one error between them. The gate reported PASS
and had been reporting PASS for weeks.

`scripts/verify-mobile-gate-selftest.mjs` loads a real page and injects five synthetic
defects, one at a time, inside `.app-shell`:

1. a 900px-wide block in a 390px viewport
2. a table with no horizontal-scroll wrapper
3. a `nowrap` flex row of CTAs
4. copy spanning `width: 100vw` with no gutter
5. an unbreakable 60-character token

For each, it diffs the probe's **error** count before and after, and fails if any
defect adds zero errors. It also fails if the un-injected baseline is not clean. It
imports the same config object the gate imports, because a self-test running against
its own copy of the thresholds proves nothing about the gate, a mistake the repo has
already made once, producing a silent `fixedWarn` / `fixedCoverageWarn` mismatch.

The comment in the source says it better than this section does:

> A gate nobody has tried to break is a gate nobody should trust.

---

## Allowlists are counted, not hidden

The mobile gate's last run reported **PASS, 0 errors, 0 warnings, 1,682 allowlisted,
56 informational** across 20 routes and 29 captures.

That 1,682 is real and it is published. Findings become `allowlisted` (counted in the
totals, listed in the report, but not failing) only when they match a named selector
with a written reason:

- `.breadcrumbs__item a` at 24px: owner decision, recorded with the cycle it was made in
- `.article-prose a` and `.sources-list__link`: inline prose and citation links, under the WCAG 2.5.8 spacing exception rather than the 2.5.5 AAA 44px target
- `.lead-magnet-modal__honeypot input`: must *not* be reachable
- `.skip-link`: offscreen until focused, audited separately in the `focus` capture state

The small-text allowlist covers editorial labels (eyebrows, breadcrumbs, table
headers) and carries an explicit carve-out: `.site-footer__legal` is allowlisted,
`.site-footer__meta` deliberately is not, because that container also holds running
prose.

The gate checks against WCAG 2.5.5 (AAA, 44px) and 2.5.8 (AA, 24px plus 24px
clearance). It is not a WCAG conformance claim and this repository does not make one.

---

## The one honest gap

**There is no CI.** No `.github/workflows`, no pipeline of any kind. All 41 gates run
locally, by hand, before deploy. Everything on this page is reproducible by anyone who
clones the repo and runs the commands, and nothing on this page runs automatically on
push. It is the single largest weakness in the engineering setup here, and every claim
in this document is true as of one run rather than continuously true.

---

## Reproducing all of it

```bash
pnpm install --frozen-lockfile
pnpm typecheck && pnpm lint
pnpm test:coverage
pnpm test:scripts
pnpm build
```

Then, with `pnpm preview` running on port 4173:

```bash
pnpm verify:mobile-gate-selftest && pnpm verify:mobile-layout:fast
```

Live-origin gates need a deployed target and are listed under
`verify:funnel:prod` in [`package.json`](../package.json).
