# Decisions

One file, not an `adr/` directory. Fourteen decisions in the order they were made,
each with the same five fields: what was decided, what forced it, what else was on
the table, what it cost, and where to read the code.

A decision earns a place here only if reversing it would be expensive. Choices that
are cheap to undo (a library version, a file layout) are not decisions, they are
preferences, and they live in the code.

---

## 1. No meta-framework. The prerenderer is a Node script.

**Context.** The site is 470 routes of mostly-static editorial content that must be
crawlable and readable without JavaScript. That is the exact job Next.js and Astro
exist to do.

**Alternatives.** Next.js on Cloudflare (via `@cloudflare/next-on-pages`), Astro,
or Vite plus an authored prerender step.

**Decision.** Vite plus an authored prerender step. `scripts/prerender-html.mjs`
reads the already-built `dist/index.html`, swaps the per-route `<head>` and JSON-LD,
replaces `<div id="root">` with statically rendered markup, and writes one file per
route.

**Consequence.** The build has no framework upgrade treadmill and no adapter layer
between the app and Cloudflare's runtime, but every capability a framework would
have given away is now built and tested directly: route discovery, head injection,
sitemap generation, static nav emission, and the check that the output actually
hydrates. That last one is decision 9's subject, and it exists because the absence of
a framework let a real bug ship.

**Code.** [`scripts/prerender-html.mjs`](../scripts/prerender-html.mjs) ·
[`vite.config.ts`](../vite.config.ts)

---

## 2. Markdown is rendered by walking an mdast, not by `react-dom/server`.

**Context.** Prerendering needs HTML strings for 446 content documents at build time.
The obvious move is to render the same React components the client uses.

**Alternatives.** `renderToStaticMarkup` on the real component tree, or an
independent markdown→HTML path.

**Decision.** An independent path: `unified` + `remark-parse` + `remark-gfm` produce
an mdast, and a `switch` over node types emits HTML strings, including its own
heading-slug and anchor logic, its own link-safety filter, and its own table
rendering.

**Consequence.** This is the sharpest trade-off in the repo. It removed React from the
build entirely, which is why `vite build` finishes in under two seconds. It also
created two renderers for one corpus, so a change to article styling has to be made
twice or the prerendered HTML and the hydrated DOM disagree. The code carries explicit
comments warning that its JSON-LD must mirror `src/site/structured-data.ts`, which is
the same drift risk stated out loud.

**Code.** [`scripts/prerender-html.mjs`](../scripts/prerender-html.mjs)
(`renderMarkdownNode`) · [`src/site/structured-data.ts`](../src/site/structured-data.ts)

---

## 3. Content is MDX in the repo, compiled to Zod-validated TypeScript.

**Context.** 446 documents with heterogeneous shapes: state pages carry
`relevantLaws` and risk metadata, listicles carry `tools`, pricing pages carry `tiers`
and `hiddenCosts`. Several fields are mixed-shape across the corpus because they were
imported from an older site.

**Alternatives.** A headless CMS, a database, or files in the repo.

**Decision.** Files in the repo. `scripts/build-content-data.mjs` parses frontmatter
with `gray-matter`, validates it with Zod, and emits `src/site/generated/` as
TypeScript. Malformed frontmatter fails the build rather than rendering a broken page.

**Consequence.** Content changes are reviewable diffs and the type system knows the
shape of every collection. The cost is a 141,323-line generated tree that is committed
so a fresh clone typechecks, which in turn required `.gitattributes` to mark it
`linguist-generated`, or the repository reads as 77% machine-written TypeScript.
Normalization happens at load time; the 446 source files are not hand-edited to fit a
uniform schema.

**Code.** [`scripts/build-content-data.mjs`](../scripts/build-content-data.mjs) ·
[`src/site/knowledge/index.ts`](../src/site/knowledge/index.ts) ·
[`.gitattributes`](../.gitattributes)

---

## 4. Authored CSS with a token layer. No Tailwind, no component library.

**Context.** The design language, *Bone & Berry*, is the mobile app's, ported to
web. The app is the source of truth, and the two must not drift.

**Alternatives.** Tailwind with a custom theme, a component library (shadcn, Radix,
MUI), or plain CSS with custom properties.

**Decision.** Plain CSS. `src/styles/tokens.css` mirrors the app repo's
`theme/tokens.ts`: one bone canvas, one berry accent, one moss secondary, one
hairline rule colour, three self-hosted font families. Fifteen stylesheets, 3,565
lines, no preprocessor.

**Consequence.** The web tokens can be diffed against the app tokens by eye, which is
the whole point; a Tailwind theme object would not have been comparable. The cost is
that there is no utility escape hatch, so every new surface needs real CSS written for
it, and component-level consistency is enforced by review rather than by a library's
API.

**Code.** [`src/styles/tokens.css`](../src/styles/tokens.css) ·
[`src/styles/`](../src/styles/)

---

## 5. Cloudflare D1 is the only datastore.

**Context.** The site captures lead-magnet subscriptions and drives an email
sequence. That needs persistence.

**Alternatives.** Neon Postgres (already in use elsewhere in the portfolio),
Cloudflare D1, or KV.

**Decision.** D1, `floriva-db`, 12 tables across 15 migrations. Neon is explicitly not
used by this site.

**Consequence.** Everything (Pages, Functions, the email Worker, the database, the
R2 bucket holding the downloadable files) lives inside one Cloudflare account with
one deploy story and no cross-cloud latency. The cost is D1's constraints: no
Postgres extensions, smaller practical row limits, and migrations that must be applied
to the remote database as an explicit deploy step (`pnpm migrate:remote`).

**Code.** [`migrations/`](../migrations/) · [`worker/wrangler.toml`](../worker/wrangler.toml)

---

## 6. Edge endpoints stay infrastructural.

**Context.** Cloudflare Pages Functions can host arbitrary backend logic. Once a
marketing site has a database binding, the temptation is to keep adding routes.

**Alternatives.** Let `functions/` grow into the product backend, or hold a line.

**Decision.** Hold a line. `functions/` contains nine route handlers and eleven shared
modules, and its scope is fixed: middleware, health, store redirects, and the
lead-magnet endpoints. Anything that is a product concern belongs in the product's own
backend.

**Consequence.** The edge surface stays small enough to test exhaustively: every one
of the nine handlers and eleven shared modules has a colocated `.test.ts`. The cost is
that the rule has to be re-argued every time a feature would be easier to build here
than properly.

**Code.** [`functions/`](../functions/) · [`CLAUDE.md`](../CLAUDE.md)

---

## 7. PostHog was retired, and `/ph/*` fails closed.

**Context.** This is a reproductive-health privacy property. Broad client-side
autocapture on it is a contradiction of the product's argument.

**Alternatives.** Keep PostHog with autocapture disabled, keep it for explicit events
only, or remove it.

**Decision.** Remove it. `/ph/*` now returns `POSTHOG_ENDPOINT_RETIRED` with HTTP 404
rather than 200-and-discard.

**Consequence.** There is no product analytics on this site at all, so questions about
funnel behaviour are answered from Search Console and server logs or not at all. The
404 is the deliberate part: a stale client that still holds the old endpoint fails
loudly instead of silently believing it is being recorded.

**Code.** [`functions/`](../functions/) · [`README.md`](../README.md)

---

## 8. Email moved from Resend to a Cloudflare Worker.

**Context.** Lead-magnet delivery and the follow-up sequence originally ran through a
third-party sequencer with Resend as the transport.

**Alternatives.** Keep the third-party sequencer, or move send and scheduling onto
Cloudflare.

**Decision.** Move. A separate `floriva-email` Worker owns sending via the Cloudflare
`EMAIL` binding, and the drip runs off a cron trigger against
`lead_magnet_sequence_jobs` in D1.

**Consequence.** Subscriber email addresses stop transiting a third party, which
matters more here than it would on a normal marketing site, and the whole delivery
path becomes inspectable in one repo. The cost is that retry, backoff, and
idempotency are now this codebase's problem:
`migrations/0007_retry_lead_magnet_sequence_jobs.sql` is that cost showing up.

**Code.** [`worker/src/sequence-runner.ts`](../worker/src/sequence-runner.ts) ·
[`docs/lead-magnet-delivery.md`](../docs/lead-magnet-delivery.md)

---

## 9. The prerenderer has a verifier that checks its output actually hydrates.

**Context.** A `dist/` once shipped where content routes had complete markup and a
correct `<head>`, and no `<script type="module">`. The pages rendered and never
hydrated. The test suite was green throughout.

**Alternatives.** Treat it as a one-off, add a snapshot test, or gate the build.

**Decision.** Gate the build. `scripts/verify-prerender-bundle.mjs` runs as the last
step of `pnpm build` and refuses to pass unless every prerendered document carries an
entry-bundle `<script>` whose `src` resolves to a real file in `dist`, and every
sitemap and noindex route resolves to a document that was actually swept.

**Consequence.** The class of bug that shipped cannot ship again, and the exempt-list
is empty by construction (`new Set([])`). The interesting part is the root cause: a
test set `PRERENDER_ROUTES=""`, the script's truthiness check read empty-string as
"unset", and it prerendered every route from a script-less fixture template. The
script now treats set-but-empty as an error, because no caller can sensibly mean
"prerender nothing".

**Code.** [`scripts/verify-prerender-bundle.mjs`](../scripts/verify-prerender-bundle.mjs) ·
[`scripts/prerender-html.mjs`](../scripts/prerender-html.mjs)

---

## 10. The mobile layout gate has a self-test that injects real defects.

**Context.** `.app-shell` is `overflow: clip`. That means
`document.documentElement.scrollWidth` can essentially never exceed the viewport for
in-shell content, so a horizontal-overflow check built on it passes on every page
regardless of what the layout does. Two successive attempts at the check had this
flaw: the second more subtly, filing every overflowing element as a non-failing
warning because it resolved to a clipping ancestor.

**Alternatives.** Trust the gate, or test the gate.

**Decision.** Test the gate. `scripts/verify-mobile-gate-selftest.mjs` loads a real
page, injects five synthetic defects one at a time (a 900px block in a 390px
viewport, an unwrapped wide table, a `nowrap` CTA row, a `100vw` text block, an
unbreakable 60-character token) and asserts each one produces at least one *error*,
not a warning. It also requires the un-injected baseline to be clean.

**Consequence.** The gate's own failure mode is now covered, and the self-test imports
the same config object the gate does, because a self-test running against a different
config proves nothing. The cost is a second browser run to maintain. The comment in
the source states the principle better than this paragraph does: a gate nobody has
tried to break is a gate nobody should trust.

**Code.** [`scripts/verify-mobile-gate-selftest.mjs`](../scripts/verify-mobile-gate-selftest.mjs) ·
[`scripts/lib/mobile-audit-config.mjs`](../scripts/lib/mobile-audit-config.mjs) ·
[`src/styles/base.css`](../src/styles/base.css)

---

## 11. The redirect verifier parses its table out of the implementation source.

**Context.** 451 exact redirects and 6 prefix redirects live as object literals in
`functions/_middleware.ts`. A verifier needs to know what to expect.

**Alternatives.** Duplicate the table in the test, import the module, or read the
source.

**Decision.** Read the source. `scripts/verify-redirects.mjs` reads
`functions/_middleware.ts` as text and extracts both objects by regex, then checks
every rule against a live origin: GET and HEAD must both return 301, `Location` must
match exactly, and a request carrying a query string must arrive with it intact. It
separately parses the human-authored ledger in `docs/seo-400/redirects.md` and asserts
parity in both directions.

**Consequence.** The verifier cannot drift from the implementation, which is the
failure mode a duplicated table guarantees eventually. Importing the module would have
been cleaner, but the objects are not exported and the middleware pulls in Workers
globals that do not exist in Node. Regex-scraping source is the ugly option that
actually holds; it is brittle to reformatting, and the ledger parity check is the
second net under it.

**Code.** [`scripts/verify-redirects.mjs`](../scripts/verify-redirects.mjs) ·
[`functions/_middleware.ts`](../functions/_middleware.ts)

---

## 12. Editorial claims are frozen against AST locators pinned to a commit.

**Context.** The corpus makes numeric, legal, and dated claims (dollar figures, FTC
actions, case citations, bill numbers). On this subject matter an uncited claim is not
a style problem.

**Alternatives.** Manual review, a linter that fails on uncited claims, or a frozen
baseline that fails on *silent change*.

**Decision.** The third. `scripts/audit-claims.mjs` finds claims by nine regex
patterns and tiers them HIGH/MED/LOW by collection. `scripts/freeze-claims-baseline.mjs`
froze 1,010 findings across 307 files: 641 HIGH, 98 MED, 271 LOW, each with an
mdast locator such as `body:root.children[14].sentence[1]`, a pattern id, and a
SHA-256 of the source file, all anchored to one commit. `scripts/claim-remediation.test.ts`
re-resolves every locator on each run, falling back to `git show <sha>:<file>` when
the working-tree file has legitimately moved on.

**Consequence.** A content edit that silently changes what a cited sentence asserts
fails a test. Publishing the 641 HIGH count is deliberate: it is a real backlog, and
a repository claiming zero uncited claims across 446 documents would be less credible
than one that counts them. The cost is real: the baseline is pinned to a SHA, so any
history rewrite forces re-anchoring all 1,010 locators to the new commit.

**Code.** [`scripts/freeze-claims-baseline.mjs`](../scripts/freeze-claims-baseline.mjs) ·
[`scripts/claim-remediation.test.ts`](../scripts/claim-remediation.test.ts) ·
[`scripts/audit-claims.mjs`](../scripts/audit-claims.mjs)

---

## 13. 94 inert pages were consolidated into 5, after the diagnosis was corrected twice.

**Context.** Organic performance dropped in June 2026. The first diagnosis was
algorithmic suppression. The second was a backlink deficit. Both were wrong, and both
were disproved with data rather than argued away: a competitor ranks sixth on ten
nofollow domains, which a backlink-deficit theory cannot explain.

**Alternatives.** Publish more, chase links, or cut.

**Decision.** Cut. The real cause was that the corpus targeted machine-shaped query
phrasings and cannibalised itself on the human ones. 94 pages that had never earned an
impression were merged into 5 that target how people actually search, and 26 further
`/free/` routes were moved to a `noindex, follow` tier, still live and linked for
readers, withdrawn from the sitemap.

**Consequence.** The sitemap shrank and the internal link graph stopped competing with
itself. **No ranking improvement is claimed.** The consolidation is the decision; the
outcome is unmeasured, and `docs/seo-400/PUBLISHING-FREEZE.md` opens by correcting the
earlier diagnosis with the measurements that disproved it. The merge also silently
deleted safety warnings from several pages, which is recorded in the same directory:
consolidating content is a content-safety operation, not just an SEO one.

**Code.** [`src/site/index-policy.json`](../src/site/index-policy.json) ·
[`docs/seo-400/`](../docs/seo-400/)

---

## 14. The homepage carries no links into the content corpus.

**Context.** 446 documents want internal links, and the homepage is the strongest
source of them. Every SEO instinct says to link down from it.

**Alternatives.** Link the corpus from the homepage, or keep the homepage as a product
page.

**Decision.** Keep it as a product page. The homepage sells the app. The corpus is
reached through `/resources` and the megamenu.

**Consequence.** The link graph is measurably weaker than it could be, and this is an
owner decision that overrides the SEO argument, recorded here so it does not get
"fixed" by someone reading decision 13 and reasoning from first principles.

**Code.** [`src/pages/home-page.tsx`](../src/pages/home-page.tsx) ·
[`src/site/internal-links.ts`](../src/site/internal-links.ts)
