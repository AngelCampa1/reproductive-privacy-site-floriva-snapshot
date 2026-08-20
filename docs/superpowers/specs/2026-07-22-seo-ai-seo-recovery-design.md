# Floriva SEO and AI-SEO Recovery Design

**Date:** 2026-07-22
**Status:** Approved for implementation planning
**Branch:** `master` (direct-main workflow approved by the user)
**Workspace:** `<repo-root>`

## 1. Purpose

Restore the technical and editorial signals that search engines and answer engines need to crawl, render, understand, trust, and cite Floriva. This is a recovery effort for the existing site, not a route-expansion campaign or a speculative attempt to manipulate AI answers.

The work addresses the issues found in the July 22 technical SEO, on-page content, AI-search, production, and visual audits. It preserves the site's current public URL inventory while correcting the mismatch between static HTML and the hydrated React experience, strengthening evidence quality, removing page-intent collisions, and making the approved public knowledge corpus reliably machine-readable.

Search recovery is an external outcome and cannot be guaranteed on a release date. Completion therefore means that every in-scope defect is fixed, independently reviewed, deployed, and proven on production, with post-release Search Console measurements recorded for ongoing observation.

## 2. Current Evidence and Problem Statement

### Search performance

- Google Search Console property `sc-domain:floriva.app` showed 2 clicks, 190 impressions, 1.05% CTR, and average position 28.3 for the most recent 28-day web-search audit window across all countries and devices.
- The corresponding 90-day web-search window showed 55 clicks, 13,762 impressions, 0.40% CTR, and average position 16.8.
- The initial audit notes did not retain exact start/end dates or partial-day handling. Before implementation changes, freeze a reproducible GSC baseline artifact containing the exact API/query payload, property, search type, dates, timezone, filters, dimensions, and partial-day policy. Later comparisons must reuse those parameters with only the dates advanced deliberately.
- Visibility dropped sharply around 2026-06-20 and had not materially recovered by the audit date.
- The latest complete index ledger records 350 indexed URLs, 169 crawled but not indexed, 29 discovered but not indexed, 4 redirects, and 7 other states across all 559 inspected URLs.
- The sitemap is valid and contains 559 URLs with no reported sitemap errors.
- Authority remains weak: the backlink audit found one referring domain and one nofollow backlink. Off-site outreach is not authorized by this specification.

### Static rendering and layout stability

- Production HTML contains a short authored `.prerendered-page` fallback beneath `#root`.
- `src/main.tsx` uses `createRoot`, so the browser discards that fallback and renders a much larger React page.
- Repeated production Lighthouse runs measured homepage CLS near 0.729. The footer accounted for most of the reported shift.
- Raw content-page HTML flattens body content into paragraphs and omits visible FAQ, source, update-date, heading, and table semantics that appear after JavaScript loads.
- Existing prerender tests prove that some text and links exist, but do not prove route-equivalent HTML or safe hydration.
- The external crawler reported two broken pages without preserving their URLs in the audit summary. A repeat crawl or raw export must identify the URLs when reproducible and drive fixes or evidence-backed false-positive dispositions. If the aggregate cannot be reproduced or decomposed, preserve the complete rerun/export and close it as unreproducible or insufficiently specified only after adversarial review.

### Accessibility and asset findings

- Several muted-text combinations narrowly or materially fail WCAG AA contrast, including brand tag, hero trust text, bento stat labels, and footer metadata/legal text.
- Store badge links have accessible names that do not match their visible labels.
- `/logo-mark.png` is a 1024 x 1024, 66.9 KB source rendered at approximately 48 x 48.
- Lighthouse also reported an image sizing warning, unused JavaScript, and render-blocking CSS. These require measured remediation, with the hydration mismatch treated as the primary layout defect.

### Content quality and cannibalization

- Two pairs of pages currently collide on H1 or generated SEO title:
  - `best-period-tracker-for-perimenopause.mdx` and `best-period-tracker-perimenopause.mdx`
  - `school-devices-period-tracking.mdx` and `school-device-period-tracking-risks.mdx`
- The content generator blindly truncates titles to 60 characters, which can manufacture collisions even when source titles differ.
- Of 535 content MDX files, 422 have no `sources` frontmatter.
- The claim audit reported 1,010 claim-shaped findings without source metadata: 641 high risk, 98 medium risk, and 271 low risk.
- The affected corpus includes medical, legal, state-law, pricing, enforcement, privacy, and competitor claims. URL availability alone does not prove that a citation supports a claim.

### AI-search and machine-readable surfaces

- Crawler policy is healthy: `OAI-SearchBot`, `PerplexityBot`, and other declared agents are allowed, and production requests with bot user agents return 200.
- `public/llms.txt` is substantial and links to the Floriva content corpus.
- A sanitized public knowledge artifact is generated at `src/site/generated/public-knowledge.json`, but production currently returns 404 for `/public-knowledge.json`.
- No Floriva citation was observed in the audited AI Overview or answer-engine checks for the priority query. This is an observation, not a promise that the release can directly control citations.
- The external agentic-browsing audit scored 0.69. Its failing checks were not preserved in the summary. Re-run the audit, identify and fix reproducible failures, or preserve the complete export and close an undecomposable aggregate as unreproducible or insufficiently specified only after adversarial review.

### Existing strengths to preserve

- All 559 routes pass the existing production SEO health check.
- The internal-link audit checked 6,434 links with no broken internal links or orphans.
- Canonicals, redirects, sitemap entries, metadata, Article/Breadcrumb/FAQ/Organization/WebSite schema, and crawler access are generally healthy.
- Product-alignment and SEO-400 gates pass.
- The active publishing freeze explicitly favors strengthening existing pages over creating or pruning URLs.

## 3. Scope

### In scope

1. Replace authored fallback HTML with route-equivalent React output that can be hydrated without replacing the root tree.
2. Preserve visible semantic content without JavaScript, including headings, tables, dates, sources, FAQs, primary actions, and related links where the route supplies them.
3. Add automated hydration, no-JavaScript semantic, canonical, structured-data, and CLS regression gates.
4. Fix the confirmed contrast, accessible-name, responsive-image, and oversized-logo findings.
5. Investigate measured unused JavaScript and render-blocking CSS and fix the actionable portion without compromising route correctness or maintainability.
6. Differentiate both collision pairs by intent, H1, purpose-written SEO title, description, and supporting content while keeping all four URLs.
7. Support explicit SEO titles in the content pipeline and fail generation when final public titles collide.
8. Define and enforce risk-tier source requirements, then remediate every affected claim in the existing corpus through a valid supporting source, qualified wording, or removal.
9. Publish the sanitized public knowledge artifact at `/public-knowledge.json`.
10. Verify that every URL exposed through `llms.txt` and the public knowledge artifact is canonical, allowed, successful, and consistent with the sitemap.
11. Add honest organization/editorial-methodology provenance without inventing people, credentials, profiles, review claims, or dates.
12. Re-run the broken-page and agentic-browsing audits with complete exports; identify and fix reproducible defects, or record an adversarially approved unreproducible/insufficiently-specified disposition when an original aggregate cannot be decomposed.
13. Deploy the approved implementation and repeat technical, semantic, AI-crawler, accessibility, and adversarial visual checks against production.

### Out of scope

- New programmatic SEO pages or a larger sitemap.
- Deleting, pruning, consolidating, or redirecting existing public URLs without a separate decision that updates every required route artifact.
- Buying links, directory submissions, outreach, partnership messaging, or any other external action.
- Fabricated author profiles, medical reviewers, legal reviewers, testimonials, metrics, rankings, or credentials.
- Speculative answer-engine files or schema that do not truthfully describe current Floriva data.
- Changes to `<shared-skill-source-repo>` from this repository session.
- A guarantee of rankings, impressions, indexing, AI citations, or recovery timing.

## 4. Non-Negotiable Invariants

- The indexable HTML page inventory remains 559 unless a separately approved route-change workflow updates the route inventory, redirects, sitemap, hubs, backlog, and counted-path artifacts. Machine artifacts such as `robots.txt`, `sitemap.xml`, `llms.txt`, and `public-knowledge.json` are excluded from that page count and from the HTML sitemap.
- The publishing freeze remains in force: strengthen existing pages; do not add a new programmatic cluster.
- Existing canonical URLs remain canonical and return their intended status codes.
- `relatedPages` remains present and valid across imported content.
- Collection-specific payloads remain intact: state metadata and laws, listicle tools, and pricing tables/cost structures.
- Mixed-shape `answers` data is normalized at load time rather than manually rewritten across the corpus.
- Store targets remain configuration-driven.
- All button-styled controls remain pills.
- Motion respects `prefers-reduced-motion`.
- Medical and legal material remains informational and does not imply diagnosis, treatment, or legal advice.
- No factual claim is strengthened merely to improve search presentation.
- Any user-facing copy change passes `humanizer`, then `third-grade-copy`, then a no-lies and whole-page-context review.
- Public knowledge output remains sanitized and contains no internal implementation details, operational identifiers, secrets, private source notes, or unapproved claims.

## 5. Rendering Architecture

### Shared route model

Create one typed route definition used by both the browser router and the build-time renderer. The definition owns route matching, route component selection, route data lookup, metadata lookup, and not-found behavior. Browser and prerender code must not maintain separate route inventories or separate approximations of page bodies.

Browser-only behavior may remain client-side, but it must begin from deterministic markup. Analytics, exit intent, and other effect-driven enhancements must not change the initial document structure or reserve no space for elements that later move content.

### Build-time React rendering

The build creates route HTML by rendering the same shell and page components used in the browser with the build-time location and route data. Server/build imports may resolve route modules eagerly while the client continues to split code, but both paths must render the same initial element tree.

Each HTML file receives:

- the complete route body inside `#root`;
- the canonical, title, description, robots policy, Open Graph, and Twitter metadata derived from the same route record;
- route-appropriate JSON-LD from the same structured-data builders used by the app;
- deterministic placeholders for components that require browser APIs;
- explicit image dimensions or aspect-ratio reservation for above-the-fold media.

The renderer must preserve React/MDX semantics. Markdown headings remain headings, lists remain lists, tables remain tables, FAQ questions and answers remain visible, source links remain links, and update dates remain machine- and human-readable.

Automated build validation runs against all 559 generated HTML outputs, not only samples. It applies common assertions to every page and field-dependent assertions to every distinct route/template shape, including listicle `tools`, pricing `tiers`/`hiddenCosts`/`tableData`, state-law payloads, questionnaires, lead magnets, comparisons, alternatives, app guides, privacy-in-practice pages, and the symptom, condition, hormone, life-stage, wellness, guide, and hub collections. The implementation plan pins at least one stable visual/browser route for every distinct rendering template or collection payload.

### Hydration

The client uses `hydrateRoot` when prerendered Floriva markup is present. It may use `createRoot` only for an explicitly supported empty-root development or error fallback. Development and test instrumentation must fail on hydration mismatch warnings for representative routes.

The initial server and client trees must agree on:

- route and content data;
- locale and formatted dates;
- ordering and keys;
- responsive markup;
- reduced-motion-safe initial state;
- browser-only placeholders.

The design intentionally avoids keeping a second authored HTML representation. If a component cannot render at build time, it receives a stable shell with reserved geometry and upgrades after hydration without displacing surrounding content.

### Failure behavior

- An unknown route emits the canonical not-found experience and appropriate status behavior.
- A render failure stops the build with the route path and component context; it never silently substitutes the old minimal fallback.
- Missing required route data, metadata, or content semantics fail their validation gate before deployment.

## 6. Technical SEO, Performance, and Accessibility Remediation

### Layout stability

The root acceptance target is CLS at or below 0.10 on both mobile and desktop for the homepage and every pinned distinct rendering template. Each route/profile combination receives three cold-cache runs using the same recorded Lighthouse/Playwright device profile, network/CPU throttling, browser version, locale, and reduced-motion setting. Every run must pass; a median-only pass is insufficient. The test must observe navigation through hydration, fonts, responsive images, and delayed enhancements. Third-party requests are blocked or held constant and the choice is recorded.

Above-the-fold media needs correct intrinsic dimensions, responsive source metadata, and reserved aspect ratio on every measured template.

### Contrast and accessible names

Update centralized color tokens or the narrowest shared rules so all normal text reaches WCAG AA contrast. The solution must preserve the editorial-botanical palette across light surfaces and not make the visual hierarchy flat.

Store badge links must expose an accessible name containing the visible label in the same order. Link purpose, focus behavior, keyboard operation, and target handling must remain clear.

### Images and bundles

Produce an appropriately sized logo asset or responsive asset set and reference it without degrading high-density rendering. The implementation must prove that the oversized transfer is eliminated and that no 404 or visual regression is introduced.

Inspect the specific Lighthouse unused-JavaScript and render-blocking-CSS evidence. Remove avoidable eager imports and unnecessary critical-path CSS when it is safe. The audited homepage's estimated unused JavaScript must fall from approximately 50 KB to at most 10 KB, and render-blocking CSS estimated savings must fall from approximately 9.5 KB to at most 2 KB under the pinned audit profile. If a tool attribution is demonstrably wrong, only the user may approve an exception after the implementation records the request waterfall, coverage trace, before/after transfer sizes, and why the code or CSS is required. Do not create brittle route duplication solely to chase a synthetic score. Bundle changes require size evidence before and after, and no tested route may increase initial compressed JavaScript transfer above its frozen baseline.

### Baseline and budgets

- Build must prerender exactly 559 intended routes.
- No new console errors, hydration warnings, broken requests, or accessibility violations are permitted on the representative matrix.
- Mobile and desktop Lighthouse accessibility must reach 100 on the audited homepage and representative content route unless an independently documented tool false-positive is reproduced and approved.
- Performance must improve from the audited production baseline, CLS must meet the hard budget, and no audited asset or sizing defect may remain unresolved.

## 7. Content Differentiation and Metadata Integrity

### Perimenopause pair

Keep both URLs but assign different jobs. One page should answer the broad comparison/list intent for choosing among period trackers during perimenopause. The other should address a narrower decision context that is genuinely supported by its content, such as which tracking capabilities matter when cycles become less predictable. Final intent must be evident in query target, H1, SEO title, description, introduction, comparison criteria, and related links.

### School-device pair

Keep both URLs but separate practical behavior from risk explanation. One page should be an action guide for safer tracking on school-managed devices. The other should explain the privacy and administrative risks of recording period data on a managed device. Each page must link to the other when useful without repeating the same answer.

### Metadata pipeline

Add an optional purpose-written SEO-title field to the validated frontmatter model. The generator uses it before deriving a title from the H1. Length enforcement may shorten only at a word boundary and must not collapse distinct pages into the same final title.

Generation fails when normalized public SEO titles collide. The error reports every conflicting source file and final title. Tests cover exact duplicates, case/whitespace normalization, collisions caused by truncation, valid explicit titles, and length limits.

Content differentiation is evaluated on meaning, not only string uniqueness. An adversarial reviewer must be able to state each page's distinct search intent and expected reader outcome without relying on the URL slug.

## 8. Source and Claim Remediation

### Risk tiers

Every claim-shaped finding receives one of these treatments:

1. **High risk:** medical, legal, state-law, regulatory/enforcement, safety, privacy incident, competitor data practice, or current pricing/capability claims. Require a direct, claim-relevant primary or authoritative source, an accurate qualifier, and a checked-as-of date where the fact can change.
2. **Medium risk:** comparative recommendations, technical privacy explanations, product behavior outside Floriva's own verified source of truth, prevalence/context statements, and consequential advice. Require authoritative support or rewrite as clearly bounded editorial guidance.
3. **Low risk:** stable definitions, non-consequential context, and ordinary explanatory statements. Cite when factual and non-obvious; otherwise rewrite or remove language that the audit cannot reliably distinguish from an unsupported assertion.

No page passes merely because a `sources` list exists. Each cited URL must be reachable, reputable for the topic, and semantically support the nearby claim. Every high- and medium-risk claim must render an unambiguous inline citation marker or source identifier that maps it to the supporting item in the visible source list. Low-risk factual claims may use the same inline mechanism or an immediately adjacent source link when the mapping remains unambiguous. Secondary sources are acceptable only when a primary source is unavailable and the limitation is recorded. Search snippets and generated summaries are not evidence.

### Corpus workflow

Before changing the scanner or content, freeze the July 22 claim-audit baseline as a committed proof artifact containing the scanner version/configuration and all 1,010 original rows. Each row stores the complete rendered claim sentence or structured field value, an AST/field locator, surrounding-context hash, original source-file hash, and scanner/configuration hash. Its immutable baseline ID is derived from the source path, normalized complete claim, structured field identity, and original source hash rather than mutable line/column coordinates. Post-edit locations and hashes are stored separately. Create a durable claim-remediation ledger keyed by that ID. It records risk tier, original and final claim hashes, rendered selector or field, disposition, citation, supporting source locator and snapshot hash, source type/authority, verification date, and independent reviewer approval. Scanner deduplication or rule changes may not erase a baseline row; duplicate parents must exist, be equivalent, approved, and acyclic, while duplicates and false positives require explicit evidence-backed review. The ledger is a work artifact and must not expose private notes publicly.

Reconcile all 1,010 baseline rows to one of: sourced, qualified, removed, duplicate-with-parent-ID, or documented false positive. Remediate all existing high- and medium-risk findings. Low-risk findings must be sourced, rewritten so they are no longer factual claims requiring support, removed, or explicitly closed as a reviewed false positive. The final scanner must also report zero unresolved findings, so newly introduced or moved claims cannot escape the frozen reconciliation. A page with no claim requiring evidence may legitimately have no `sources` frontmatter, but every page containing a factual health, legal, privacy, pricing, enforcement, or competitor claim must expose relevant sources in its rendered source section.

State-law content must prefer current official statutes, attorney-general pages, legislative sources, or court/government material. Medical content must prefer current public-health bodies, professional clinical guidance, or primary peer-reviewed research appropriate to the statement. Pricing and product claims must prefer current official product/vendor material and carry a checked date. Competitor enforcement claims must prefer the regulator, court, or settlement record.

### Copy quality

Source-backed changes must remain readable and calm. Public-copy implementation is blocked until both writing skills are verified available. `third-grade-copy` is absent from the current skill inventory, so the implementation must sync/install it through the approved skill installation workflow sourced from `<shared-skill-source-repo>` without editing that repository. Run edited public copy through `humanizer`, then `third-grade-copy`, then verify every resulting claim against the selected source and the full page context. Preserve proof of that order for every content batch.

## 9. AI-Search and Public Knowledge Surfaces

### Public knowledge artifact

Copy or generate the sanitized knowledge artifact into the public build at `/public-knowledge.json`. The public file must be deterministic and validated against the existing sanitizer tests. It should expose only approved organization, product, policy, and content facts already present in public source material.

The artifact must use canonical absolute HTML-page URLs, carry a public schema/version marker and deterministic content digest, and avoid implying an unsupported standard. It must not expose internal Git SHAs, deployment IDs, account identifiers, or operational notes. If it carries a generation date, derive that value deterministically from approved source-controlled public content metadata rather than wall-clock build time. Keep exact commit/deployment provenance only in the private proof manifest. Every factual machine record maps to an approved public page and the same claim-evidence gate used for HTML content. Link discovery can be documented in `llms.txt` and other truthful machine-readable surfaces; no hidden or search-engine-specific cloaking is allowed. `/public-knowledge.json` is a crawlable machine artifact excluded from the HTML sitemap and 559-page inventory, and it does not require an HTML canonical tag. Its response carries `X-Robots-Tag: noindex` so it is retrievable by allowed agents without being treated as an indexable search-result page; `robots.txt` must not disallow it.

### Cross-surface validation

Add one validator that checks the generated and deployed surfaces together:

- every HTML-page URL in `llms.txt` is an allowed canonical URL;
- every referenced HTML content URL exists in the sitemap and returns 200;
- the public knowledge artifact returns 200 with the expected content type and schema;
- the public knowledge artifact remains crawlable, is absent from the HTML sitemap, returns `X-Robots-Tag: noindex`, and is not blocked by `robots.txt`;
- URLs in public knowledge resolve to canonical, indexable production pages;
- no internal-only term, operational identifier, localhost URL, draft marker, or private note leaks;
- crawler policy continues to allow the explicitly supported search and answer-engine bots.

Repeat a fixed observational answer-engine query set before implementation and after deployment: `private period tracker`, `best private period tracker`, `period tracker that doesn't sell data`, `safe period tracker after Roe v. Wade`, and `school device period tracking privacy`. Check Google AI Overviews, ChatGPT Search, and Perplexity where accessible. Record provider, exact query, locale (`en-US`/United States), authentication state, date/time, result text or screenshot, and Floriva citation presence. These observations do not block release because citation selection is external, but they make the AI-search audit repeatable.

The validator must report exact offending URLs and fields. It runs locally against build output and in production mode against `FLORIVA_PROD_URL`.

### Provenance

Keep Organization as the author where that is the truthful current model. Add a plain-language editorial and sourcing methodology describing how Floriva selects, dates, reviews, and corrects sources. Add `sameAs` or named reviewers only when the profile or person is verified and authorized. Do not imply medical or legal review that did not occur.

## 10. Adversarial Sub-Agent Delivery Model

Implementation is sub-agent driven and evidence based.

For each bounded work package:

1. A fresh implementer sub-agent receives the approved spec section, exact write scope, constraints, and required tests.
2. The orchestrator independently inspects the diff and reruns the relevant gate.
3. A separate adversarial spec-compliance reviewer attempts to disprove that the result satisfies the approved behavior.
4. After spec compliance is clean, a separate code-quality or content-evidence reviewer looks for maintainability, truthfulness, accessibility, privacy, and regression risks.
5. Findings return to the implementer or a new corrective agent. Review repeats until the reviewer reports no actionable defect and the orchestrator confirms the evidence.

Agents must report files changed, tests run, findings, blockers, and residual risk. Agent conclusions are evidence, not acceptance. The orchestrator owns integration and final judgment.

Likely packages, kept separate where file ownership permits, are:

- shared routing, static rendering, and hydration;
- prerender/semantic/CLS regression harnesses;
- visual accessibility, image, and critical-path performance fixes;
- title pipeline and the two cannibalization pairs;
- source policy, ledger, claim remediation batches, and copy checks;
- public knowledge publication and machine-readable validators;
- final production verification and evidence capture.

No two agents edit the same files concurrently unless an explicit handoff establishes ownership.

## 11. Mandatory Adversarial Visual QA

Anything that can change rendering requires a visual adversarial review performed by an agent that did not implement the change. The reviewer must use a real browser and inspect screenshots, not rely only on DOM assertions or Lighthouse summaries.

### Viewport matrix

- Mobile: 360 x 800 and 390 x 844.
- Tablet: 768 x 1024.
- Desktop: 1440 x 900.
- Wide desktop: 1920 x 1080 where layout behavior differs.
- At least one 200% browser-zoom pass.
- Reduced-motion mode.
- JavaScript disabled for semantic-content inspection.
- Cold load and hydrated state.

### Route matrix

- Homepage.
- One pillar hub.
- One browser route for every distinct page template or collection-specific payload, pinned by exact URL in the implementation plan. This includes an ordinary guide with headings/lists/FAQ/sources/related links, listicle tools, a table-heavy comparison, pricing, state law, questionnaire, lead magnet, alternatives, app guides, privacy-in-practice, and symptom/condition/hormone/life-stage/wellness content.
- Each of the four differentiated collision pages.
- 404/not-found route.

### Adversarial checks

- Compare the first rendered frame with the settled hydrated frame for displacement, missing elements, flash, or geometry changes.
- Check overflow, clipping, stacking, focus visibility, sticky behavior, responsive navigation, store buttons, device artwork, footer, and long headings.
- Verify text contrast against the actual computed background in every state.
- Confirm that images preserve aspect ratio and do not push content when decoded.
- Confirm all button-like controls are pills and keyboard reachable.
- Confirm motion stops or simplifies under reduced motion.
- Inspect screenshots for editorial-botanical consistency rather than generic component drift.

The reviewer stores before/after screenshots and a route-by-viewport result manifest in a non-secret proof location designated by the implementation plan. Any visual finding must be fixed and re-reviewed by the adversarial agent.

## 12. Automated and Production Verification

### Local gates

The implementation plan must identify the exact command for each gate, including:

- clean install or dependency validation;
- content and knowledge generation;
- typecheck, lint, unit/integration tests, and production build;
- exact 559-route inventory and prerender count;
- all-559 raw-HTML semantic validation with collection-specific payload assertions;
- canonical, redirect, sitemap, robots, schema, and internal-link checks;
- duplicate final-title validator;
- claim/source ledger validator;
- no-JavaScript semantic HTML checks;
- hydration-warning and initial-tree-equivalence checks;
- public knowledge and `llms.txt` cross-surface validation;
- frozen 1,010-row claim-baseline reconciliation and a zero-unresolved final claim scan;
- broken-page recrawl and agentic-browsing audit with exact finding dispositions;
- responsive browser tests, accessibility scan, and CLS budget;
- marketing copy guardrails for changed public copy.

The known baseline sequence is `pnpm build` followed by `pnpm test`. A bare `pnpm test` in a fresh checkout currently fails one generated-surface test because it expects `dist/index.html`; this is a harness precondition, not an accepted final state. The implementation should either encode the prerequisite in the script or make the test create/locate its fixture so the standard test command is self-contained.

### Production gates

After deployment, run the repository's production SEO health, SEO surface, and composed funnel verification against `FLORIVA_PROD_URL`, plus the new machine-readable and browser gates. Verify:

- all representative routes return expected status, canonical, metadata, and schema;
- sitemap still has exactly 559 intended URLs;
- `/public-knowledge.json` returns 200 and passes sanitization/schema validation;
- `llms.txt` links are production-valid;
- supported crawler user agents receive the same public content and are not blocked;
- a normalized semantic-content hash (excluding nonces, timestamps, analytics identifiers, and equivalent nondeterministic attributes) matches between each supported bot user agent and a normal browser user agent, preventing cloaking without requiring byte-identical transport;
- raw HTML exposes the intended semantic page before JavaScript;
- hydration emits no mismatch warnings;
- homepage and every pinned distinct rendering template have CLS at or below 0.10 on every required mobile and desktop run;
- accessibility and visual matrices pass with production screenshots;
- lead-magnet and store-target funnel behavior remains intact.
- the fixed answer-engine query set is repeated and recorded as non-blocking observational evidence.

Record the deployment identifier, commit, timestamp, command outputs, and proof artifact paths. Search Console measurements are captured as a post-deploy baseline; indexing and visibility trends are monitored separately and are not misreported as immediate release proof.

## 13. Risks and Fallbacks

- **Static/client divergence:** Sharing route and content definitions reduces the risk. Hydration-warning tests and raw-versus-hydrated DOM comparisons block release.
- **Build size or time increase:** Eager imports belong only in the build renderer. Client splitting and bundle budgets must remain independently tested.
- **Browser-only component failure during build:** Use deterministic reserved shells and progressive enhancement, never a route-wide minimal fallback.
- **Content remediation volume:** Partition the ledger into disjoint batches and require evidence review for each batch. Do not weaken the risk threshold to finish faster.
- **Citation drift:** Store verification dates and source types, prefer primary sources, and make time-sensitive claims easy to re-audit.
- **Copy becoming inaccurate during simplification:** Recheck claims after both writing skills, not only before them.
- **Visual palette regression from contrast fixes:** Adjust shared tokens deliberately and validate the full route/viewport matrix.
- **Ranking volatility:** Preserve URLs and internal links, deploy one coherent recovery release, document the before/after state, and avoid interpreting short-term volatility as proof of success or failure.
- **Rollback:** Keep reviewable, bounded commits directly on `master`. Before deployment, record the last verified deployment and the exact digest of the locally gated `dist` bytes. Deploy those bytes without rebuilding. If any blocking production verification fails, immediately redeploy the recorded last verified artifact or revert the defective release commit on `master`, then rerun the production gate while retaining the failed-release evidence for correction. Do not create a worktree or release branch for this effort.

## 14. Acceptance Criteria

The work is complete only when all of the following are true:

1. The reviewed `master` release contains no unapproved HTML-page additions, removals, redirects, or canonical changes; the intended HTML sitemap count remains 559. Non-page machine artifacts remain outside that count.
2. All 559 raw HTML outputs pass common semantic assertions and the applicable collection/template assertions. Pinned browser routes for every distinct template render the same meaningful page structure that the browser hydrates, including route-specific headings, tables, dates, FAQs, sources, related links, actions, and collection payloads where applicable.
3. Client startup hydrates prerendered markup and produces no mismatch warning in automated or manual browser checks.
4. Homepage and every pinned distinct rendering template have CLS at or below 0.10 in all three cold-cache runs under every required mobile and desktop production profile.
5. The audited contrast, accessible-name, image-sizing, and oversized-logo issues are absent in local and production evidence.
6. Under the pinned audit profile, estimated unused homepage JavaScript is at most 10 KB, render-blocking CSS estimated savings are at most 2 KB, and no tested route increases initial compressed JavaScript transfer above baseline, unless the user explicitly approves a trace-backed tool exception.
7. The four collision pages remain live and have independently defensible intent, H1, SEO title, description, introduction, supporting content, and related-link roles.
8. The generator supports validated explicit SEO titles and fails on normalized final-title collisions, including truncation-induced collisions.
9. The frozen 1,010-row July 22 baseline reconciles every stable claim ID to an approved disposition, the final scanner has zero unresolved findings, and every consequential claim maps unambiguously to its rendered supporting source. Claim-to-source relevance has passed adversarial review.
10. No invented source, person, credential, review claim, metric, price, date, profile, or product capability appears in changed public content.
11. All changed public copy has documented `humanizer` then `third-grade-copy` review and passes no-lies/full-context checks.
12. `/public-knowledge.json` is live, crawlable, sanitized, schema-valid, consistent with approved public facts, excluded from the HTML sitemap/page inventory, marked with `X-Robots-Tag: noindex`, and not disallowed by `robots.txt`.
13. Every Floriva HTML-page URL in `llms.txt` and public knowledge is canonical, allowed, in the intended HTML inventory, and successful in local and production validation. Machine artifacts are validated separately and are not inserted into the HTML sitemap.
14. Existing robots, schema, metadata, internal-link, product-alignment, SEO-400, funnel, and content-shape gates continue to pass.
15. Independent adversarial SEO, AI-SEO, code-quality, content-evidence, and visual reviewers report no unresolved actionable findings, and the orchestrator has independently verified their evidence.
16. The production deployment is tied to an exact commit and deployment identifier, with raw HTML, browser, screenshot, Lighthouse, crawler, and command proof stored for handoff.
17. The broken-page and agentic-browsing audits are rerun with complete exports. Exact findings are identified and fixed when reproducible; if the original aggregate finding cannot be reproduced or decomposed, it is explicitly closed as unreproducible or insufficiently specified only after the rerun evidence passes adversarial review.
18. Search Console pre/post measurements use preserved, comparable query parameters, and the fixed answer-engine query set is repeated as observational evidence without claiming that ranking, indexing, or citation recovery is already complete.

## 15. Decision Record

The approved approach is recovery-first: preserve the URL estate, replace the split static/client representation with shared route-equivalent rendering, improve trustworthy evidence at corpus scale, and expose only truthful machine-readable knowledge. It rejects both a quick metadata-only patch, which would leave the rendering and trust defects intact, and a broad platform rewrite, which would add unnecessary release risk during a search-visibility decline.
