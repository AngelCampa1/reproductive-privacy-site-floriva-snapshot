# Adding an SEO page

Use this checklist before adding or moving any public content page. Pair it with `docs/funnel-next-steps.md` for the collection-to-stage map, authored link contract, and ordinary-vs-campaign page flows.

1. Choose an existing collection first. Use `src/site/config.ts` and `scripts/build-content-data.mjs` as the route map. Do not invent a new URL base in one file only.
2. Add the `.mdx` file under the matching `content/<collection>/` folder.
3. Include the required funnel fields: `buyerStage`, `targetPersona`, `tags`, and at least three valid `relatedPages`. Do not self-link.
4. Keep collection payloads intact. State pages keep law/risk metadata. Listicles keep `tools`. Pricing pages keep pricing fields and tables.
5. If the page replaces, renames, or moves an old URL, add the old and new path to `docs/seo-400/redirects.md` and implement the redirect in `functions/_middleware.ts`.
6. If the page is truly net new, record that decision in `docs/seo-400/redirects.md`.
7. Update `src/site/pillar-hubs.ts` only when the page needs a new hub or changes hub membership.
8. For ordinary new pages, do not update `topic-backlog.csv` or `net-new-paths.txt` unless the page belongs to a tracked campaign.
9. For tracked campaign pages, update both `docs/seo-400/topic-backlog.csv` and `docs/seo-400/net-new-paths.txt`.
10. Run `pnpm generate:content`.
11. Run `pnpm verify:seo400-content`, `pnpm verify:seo400-backlog -- --min 400`, `pnpm verify:product-alignment`, `pnpm audit:claims`, and `pnpm verify:sources`.
12. If any route moved or redirect rows changed, run `pnpm verify:redirects`.
13. For release work, run the local desktop and mobile browser checks before production checks: `pnpm verify:seo400:local`, `pnpm verify:seo400:local:mobile`, `pnpm verify:seo-funnel-browser:local`, and `pnpm verify:seo-funnel-browser:local:mobile`.

If you add a new collection, update `src/site/config.ts`, `scripts/build-content-data.mjs`, hub routing, route metadata, and redirect handling in the same change.
