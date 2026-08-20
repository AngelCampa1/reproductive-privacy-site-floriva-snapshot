# Floriva SEO400 plan

## Goal

Create 400 net-new public SEO resources for Floriva's ICP and adjacent search intent. The library must be useful enough to stand alone, source-backed, internally linked, reviewed by customer-facing copy gates, verified locally, deployed, verified in production, and exported as a plain text file of actual production URLs.

## Current state

- Existing MDX corpus: 448 files in `content/`.
- Public content routes are generated from folder names by `scripts/build-content-data.mjs`.
- Sitemap and `llms.txt` are generated during `pnpm build`.
- Existing verification covers content schema, route integrity, sitemap coverage, canonicals, JSON-LD, prerendered HTML, link graph, and generated-surface leakage.
- Gaps before this rollout: no dedicated net-new URL artifact generator, no rollout-specific review ledger, and no hard editorial tracker for 400 pieces.

## Content principles

- Do not make thin keyword variants.
- Each page must provide a concrete free asset: checklist, worksheet, field guide, comparison table, script, decision tree, template, or practical procedure.
- Lead with documented privacy failures and real health-data risks where relevant.
- Soft-plug Floriva only where the next step naturally fits.
- Do not invent metrics, user counts, legal risk stats, testimonials, rankings, prices, or product capabilities.
- Do not state a count of abortion-ban states unless freshly verified and cited.
- Treat competitor pricing, lawsuits, settlements, app-store details, and state law as stale until freshly checked.
- Medical content must stay educational, avoid diagnosis/treatment claims, and point users to clinicians for urgent or personal medical decisions.

## Pillars and allocation

| Pillar | Count | Primary collections | Purpose |
| --- | ---: | --- | --- |
| Practical privacy and legal safety | 100 | `privacy-in-practice`, `guides`, `lead-magnets`, `questionnaires` | Help users reduce reproductive-data exposure in real life. |
| Health tracking and clinical prep | 100 | `symptom-guides`, `condition-guides`, `hormone-guides`, `wellness-guides`, `life-stage-guides` | Help users track useful patterns and prepare for care. |
| Comparisons, switching, and app audits | 100 | `alternatives`, `comparisons`, `pricing-breakdowns`, `listicles`, `app-guides` | Capture high-intent users leaving cloud-first trackers. |
| Free tools, templates, and self-checks | 100 | `lead-magnets`, `questionnaires`, `guides`, `privacy-in-practice` | Give away high-value assets that would normally be paid products. |

## Per-piece requirements

Every content piece needs:

- Unique slug and title.
- Existing collection unless a plan review approves a new collection.
- `title`, `description`, `publishedAt`, `updatedAt`, `buyerStage`, `targetPersona`, `tags`, and `relatedPages`.
- At least 3 valid `relatedPages`, with one hub or adjacent guide and one conversion-adjacent page where relevant.
- One concrete value asset in the body.
- Clear BLUF or direct-answer opening where helpful.
- FAQ or answer blocks for AI-search extractability when natural.
- Frontmatter `sources` for legal, competitor, pricing, medical, numeric, or dated claims.
- No copied source text beyond short compliant excerpts.

## Review gates

Each batch must pass these review loops before it counts:

1. Editorial value review: no thin pages, no duplicate intent, value asset is real.
2. Source and no-lies review: claims match cited sources; stale-risk claims are softened or removed.
3. Internal-link review: `relatedPages` are live and funnel-aware.
4. Humanizer review: remove AI-sounding prose, generic sales language, bloated claims, em dashes, and formulaic conclusions.
5. Third-grade copy review: user-facing copy is plain, specific, and easy to read without becoming childish.
6. Technical review: content generation, tests, build, links, sitemap, and SEO verification pass.

## Local verification

Minimum local gate before deploy:

```powershell
pnpm generate:content
pnpm generate:knowledge
pnpm verify:seo400-backlog -- --min 400
pnpm verify:seo400-content
pnpm verify:product-alignment
node scripts/audit-claims.mjs
node scripts/verify-sources.mjs
pnpm typecheck
pnpm test
pnpm lint
pnpm build
pnpm check:links
pnpm verify:seo
pnpm verify:redirects
```

For browser E2E, run preview and sample new pages across desktop and mobile:

```powershell
pnpm preview
$env:SEO_VERIFY_ORIGIN = "http://localhost:4173"
pnpm verify:seo
pnpm verify:seo400:local
pnpm verify:seo400:local:mobile
pnpm verify:seo-funnel-browser:local
pnpm verify:seo-funnel-browser:local:mobile
```

## Production verification

After deploy:

```powershell
$prod = $env:FLORIVA_PROD_URL
if (-not $prod) { $prod = "https://floriva.app" }
$env:FLORIVA_PROD_URL = $prod
$env:SEO_VERIFY_ORIGIN = $prod
pnpm verify:seo
pnpm verify:redirects
pnpm check:links
pnpm verify:seo400:prod
pnpm verify:seo400:prod:mobile
pnpm verify:seo-funnel-browser:prod
pnpm verify:seo-funnel-browser:prod:mobile
pnpm export:seo400:prod-urls -- --origin $prod --out artifacts/floriva-seo400-prod-urls.txt
```

The final `.txt` must contain actual URLs found in the production sitemap, not locally guessed routes.

## Batch plan

- Batch 0: planning, tooling, route inventory, content ledger, and topic brief review.
- Pilot batch: 3-5 HTML-native pages to prove schema, copy gates, internal-link validation, and local generation before scaling.
- Batches 1-4: 100 content pieces each, one pillar per batch.
- After each batch: generate content, run source/copy/link review, fix findings, run local technical gates.
- After all four batches: full local E2E, deploy, production E2E, export final indexer URL file, close ledger.

## Lead magnet rule

Use `lead-magnets` for resource pages, but do not make every resource a PDF download by default. HTML-native checklists, worksheets, calculators, and scripts count when the value is complete on the page. Add downloadable PDF/email/R2 delivery only when offline use, email capture, or a designed artifact is materially better than the page itself.
