# Funnel next-step system

Use this with `docs/seo-400/ADDING-SEO-PAGE.md` before adding, moving, or deleting public content routes.

The checked source of truth for this table is `src/site/funnel-contract.ts`. Update that file, this table, and `src/site/funnel-contract.test.ts` together when a collection, route base, hub, stage policy, or primary next step changes.

## Route and funnel map

| Collection | URL base | Hub | Usual stage | Primary next step |
| --- | --- | --- | --- | --- |
| `alternatives` | `/compare/alternatives` | `/compare` | BOFU | Compare pricing, privacy features, switcher guide |
| `comparisons` | `/compare/versus` | `/compare` | MOFU | Ranking method, pricing, privacy features |
| `pricing-breakdowns` | `/compare/pricing` | `/compare/pricing` | MOFU | Ranking method, pricing hub, privacy features |
| `listicles` | `/resources/best` | `/resources/best` | MOFU | Ranking method, comparison hub, privacy features |
| `guides` | `/resources/guides` | `/resources/guides` | TOFU | Private tracker list, legal safety guide, free privacy guide |
| `privacy-in-practice` | `/resources/privacy-in-practice` | `/resources/privacy-in-practice` | MOFU | Audit checklist, data minimization, tracker check |
| `symptom-guides` | `/resources/symptom-guides` | `/resources/health` | TOFU | Visit prep, health resources, data minimization |
| `condition-guides` | `/resources/condition-guides` | `/resources/health` | TOFU | Visit prep, health resources, data minimization |
| `hormone-guides` | `/resources/hormone-guides` | `/resources/health` | TOFU | Visit prep, health resources, data minimization |
| `life-stage-guides` | `/resources/life-stage-guides` | `/resources/health` | TOFU | Visit prep, health resources, data minimization |
| `wellness-guides` | `/resources/wellness-guides` | `/resources/health` | TOFU | Visit prep, health resources, data minimization |
| `reproductive-privacy-state-pages` | `/period-tracker-privacy` | `/period-tracker-privacy` | TOFU | Private tracker list, legal guide, privacy guide |
| `lead-magnets` | `/free` | `/free` | TOFU | App setup, health resources, data minimization |
| `questionnaires` | `/tools/quiz` | `/tools/quiz` | MOFU | App setup, health resources, data minimization |
| `app-guides` | `/app-guides` | `/app-guides` | BOFU | Privacy features, pricing, switcher guide |

`Usual stage` is the default stage for new pages, not the only allowed value. Use `src/site/funnel-contract.ts` for allowed stage exceptions, such as TOFU health tools inside `lead-magnets` or MOFU action checklists inside `privacy-in-practice`.

## Required link contract

Every authored content page must have:

- `buyerStage`
- `targetPersona`
- `tags`
- at least three `relatedPages`
- no self-link in `relatedPages`
- only route-resolvable internal `relatedPages`

The generator and `resolveFunnelAwareRelatedEntries()` may supplement sparse links at runtime, but authored frontmatter must still be complete. This keeps the funnel intentional and prevents fallbacks from hiding weak pages.

Every next-step link produced by `buildContentNextStepLinks()` and `buildHubNextStepLinks()` must resolve through `getValidRoutePaths()`. Lead-magnet email `ctaPath` values must also resolve through the same route inventory.

## Ordinary new page flow

Use this for routine pages that are not part of a tracked 400-page campaign:

1. Pick the collection from the route and funnel map above.
2. Add the `.mdx` file under the matching `content/<collection>/` folder.
3. Add the required funnel fields and at least three valid `relatedPages`.
4. If the page replaces or moves an older URL, update `docs/seo-400/redirects.md` and `functions/_middleware.ts`.
5. If the page is net new and no redirect exists, record that in `docs/seo-400/redirects.md`.
6. Update `src/site/pillar-hubs.ts` only when hub membership or hub sections change.
7. Run:

```bash
pnpm generate:content
pnpm verify:product-alignment
pnpm test -- src/site/internal-links.test.ts src/site/route-inventory.test.ts src/site/lead-magnets.test.ts
```

## Tracked campaign page flow

Use this when adding to the SEO400 campaign or any future counted campaign:

1. Follow the ordinary new page flow.
2. Add the route to the campaign backlog, currently `docs/seo-400/topic-backlog.csv`.
3. Add the public route to the counted path list, currently `docs/seo-400/net-new-paths.txt`.
4. Keep `docs/seo-400/LEDGER.md` current with the batch, verification commands, and release status.
5. Run:

```bash
pnpm verify:seo400-content
pnpm verify:seo400-backlog -- --min 400
pnpm verify:seo400-browser -- --origin http://localhost:4173 --paths docs/seo-400/net-new-paths.txt
pnpm verify:seo-funnel-browser -- --origin http://localhost:4173
```

For release closeout, repeat the browser check against production with `FLORIVA_PROD_URL` and export the production URL list with `pnpm export:seo400:prod-urls`.

The focused funnel browser verifier samples the home page, core hubs, one representative route from every public content collection in the map above, one configured lead-magnet form, and one legacy redirect. It checks hydrated canonicals, JSON-LD, next-step links, the lead-magnet form, store buttons, asset load failures, console/page errors, and mobile overflow.

If any URL moved, run redirect verification locally where middleware is available and in production after deploy:

```bash
pnpm build
pnpm preview:pages
pnpm verify:redirects:local
pnpm verify:redirects:prod
```

The redirect verifier reads `functions/_middleware.ts`, checks any real rows in `docs/seo-400/redirects.md`, and probes GET, HEAD, and query-string preservation.

## Full-funnel verification aliases

Use Vite preview for hydrated content and browser checks:

```bash
pnpm build
pnpm preview
pnpm verify:funnel:local
```

Use Cloudflare Pages preview when the check needs edge middleware or Functions, such as local redirects, `/api/health`, store redirects, or lead-magnet API rejection paths:

```bash
pnpm build
pnpm preview:pages
pnpm verify:redirects:local
pnpm verify:lead-magnet:prod-smoke -- --origin http://localhost:8788
```

After deploy, run:

```bash
pnpm verify:funnel:prod
pnpm export:seo400:prod-urls -- --origin https://floriva.app --out artifacts/floriva-seo400-prod-urls.txt
```

Full signed-link lead-magnet proof still needs a real delivery email. Until inbox/provider access is automated, copy the signed download and unsubscribe URLs from the QA email into `LEAD_MAGNET_E2E_DOWNLOAD_URL` and `LEAD_MAGNET_E2E_UNSUBSCRIBE_URL`, then run `pnpm verify:lead-magnet:prod-full`.

## Source and claim gates

Before release, run the durable source and claim checks:

```bash
pnpm audit:claims
pnpm verify:sources
```

`verify:sources` checks source URL availability, not semantic truth. Any DRIFT, PAYWALLED, MISSING, TIMEOUT, or ERROR result needs human review before treating affected claims as current.
