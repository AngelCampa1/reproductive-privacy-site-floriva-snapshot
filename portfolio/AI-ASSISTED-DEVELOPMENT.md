# AI-assisted development

This site was built with AI agents doing most of the typing. In the private working
repository, 148 of the 283 commits carry a Claude co-author trailer; the rest are hand
commits, rebases, and merges. (This repository is a squashed snapshot, so those trailers
are not visible here.) That is a stated method rather than a disclaimer. The interesting
content of this page is **what had to be built because agents were used.**

Read [`portfolio/TESTING.md`](TESTING.md) first if you only read one. The verification tier
described there is the real artifact of this way of working.

---

## The instruction files are source code

[`CLAUDE.md`](../CLAUDE.md) and [`AGENTS.md`](../AGENTS.md) are checked in and
reviewed like anything else. They encode the constraints that are expensive to
rediscover:

- **Design canon.** "Buttons are pills": `border-radius: 9999px`, including icon
  buttons and segmented controls. Stated as a standing preference because a fresh agent
  reaching for a default component library will produce 8px corners every single time.
- **Content invariants.** `relatedPages` is required connective tissue and must not be
  removed from imported content. `answers` is mixed-shape in the source corpus and must
  be normalised at load time. *Do not hand-edit 150 files.* Collection payloads
  (`relevantLaws`, `tools`, `tiers`, `hiddenCosts`) must stay intact.
- **Factual rules.** Never fabricate metrics, testimonials, user counts, or legal-risk
  statistics. Do not state a specific count of abortion-ban states unless it is freshly
  verified and cited.
- **Scope rules.** Edge endpoints stay infrastructural. Store links stay config-driven.
  PostHog stays explicit-event-first.

Each of those lines exists because something went the other way once. The file is a
changelog of corrections that would otherwise have to be re-learned every session.

## The workflow

Design → spec → plan → implement, with the spec and plan committed before the code.
Five of those documents are in [`docs/superpowers/`](../docs/superpowers/): a design spec for
the SEO recovery work, plus four execution plans that decompose it.

Work is decomposed and delegated to sub-agents with disjoint write scopes. The
orchestrator owns task decomposition, integration, and the final quality decision;
sub-agents own bounded investigation and implementation and report back files changed,
tests run, findings, blockers, and residual risks. Implementation work gets a two-stage
review: spec compliance first, then code quality.

---

## What went wrong, and what it produced

This is the part worth reading. Four failures, all of the same species: **plausible
output that passes.** An agent optimises for the check in front of it, so a check that
is easy to satisfy and hard to fail is worse than no check at all: it converts
"untested" into "verified," silently.

### 1. The prerendered pages that never hydrated

A `dist/` shipped where content routes had complete markup and a correct `<head>` and
no entry bundle. The pages rendered as static HTML and never became an app. The test
suite was green.

The root cause was a test setting `PRERENDER_ROUTES=""`. The script's truthiness check
read empty-string as "unset" and prerendered every route from a script-less fixture
template, and the test restored only `dist/index.html`, leaving the rest inert while
the suite reported success.

**Produced:** `scripts/verify-prerender-bundle.mjs`, which runs as the last step of
every build. It also produced a rule in the prerenderer: set-but-empty is now an error,
because no caller can sensibly mean "prerender nothing."

### 2. The mobile gate that could not fail, twice

`.app-shell` is `overflow: clip`, so `documentElement.scrollWidth` can essentially
never exceed the viewport. The first check was built on it and passed on everything.
The second attempt repeated the mistake more subtly: every overflowing element resolved
to a clipping ancestor and was filed as a non-failing warning, so four injected,
genuinely page-breaking defects produced exactly one error between them.

**Produced:** `scripts/verify-mobile-gate-selftest.mjs`, which injects five real
defects into a real page and requires each one to produce an error. And a rule: the
self-test imports the gate's config object rather than restating the thresholds,
because hand-building them twice had already produced a silent mismatch.

### 3. The consolidation that deleted safety warnings

Merging 94 low-value pages into 5 was a correct decision, executed by an agent, and it
silently dropped safety warnings from several of the merged pages. The SEO gates all
passed: nothing they check knows what a safety warning is.

**Produced:** a correction commit restoring the warnings, and the lesson that a content
operation is a content-safety operation. It is also why the editorial gates are
baseline-based rather than presence-based: `test:claims` fails when a frozen claim
*silently changes*, which is the class of defect a rules linter cannot see.

### 4. The review gate for AI phrasing

`scripts/linkedin-post-review-gate.mjs` refuses to publish copy containing internal
production labels ("new lead magnet", "content pillar", "CTA type"), image descriptions
with no attached image, `TODO`/`TBD` placeholders, or generic AI phrasing: "seamless",
"robust", "game-changing", "cutting-edge", "leverage", "delve", "tapestry", "in
today's", "it is important to note".

It exists because every one of those reached a draft. The gate is a regex list, which
is a blunt instrument, and it is a blunt instrument aimed at a real and repeating
failure.

---

## The general shape

Agents are fast at producing code and fast at producing *the appearance of
verification*. Those two capabilities are not equally trustworthy, and the gap between
them is where every defect above lived.

The response was not to write more tests. It was to make the gates harder to satisfy
falsely:

| Weak form | What is here instead |
|---|---|
| A test asserting the redirect table matches a copy of itself | The verifier parses the table out of `functions/_middleware.ts` and checks 457 live 301s |
| A layout check that reports PASS | A self-test that injects five defects and requires five errors |
| A linter that flags uncited claims | 1,010 mdast locators frozen to a commit, re-resolved on every run |
| A build that succeeds | A build that fails unless every one of 470 documents carries a resolvable entry bundle |
| "Coverage is 90.2%" | 90.2% lines, and the function figure published twice (raw and adjusted) with the reason the raw one is wrong |

The pattern: a gate should be able to tell you it is broken. Three of the four failures
above were gates that could not.

Every decision in [`portfolio/DECISIONS.md`](DECISIONS.md) was made by a person; agents
executed and argued them. And the four gates above catch what they were built to catch:
the four species of failure documented on this page, not every possible defect. None of
them runs on push. There is no CI, so this verification is a local, by-hand process
before deploy, not a continuous one.
