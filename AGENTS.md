# AGENTS.md - Floriva Web

## Design Canon

- **Buttons are pills.** Treat fully rounded button geometry as a standing product preference. Every button or button-styled CTA should use pill corners (`border-radius: 9999px`, `rounded-full`, or equivalent), including primary/secondary actions, link-buttons, toolbar buttons, segmented/toggle controls, and icon buttons (circular when square). Do not introduce square or mildly rounded button shapes unless the user explicitly asks for that exception.

## Before Starting Work

**This repository is a single-commit snapshot**, published for portfolio review. It
installs, builds, and tests standalone, but it has no upstream to pull from and no
commit history to bisect. Development happens in a separate private repository.

This repo is the standalone React + Vite + Cloudflare rebuild of Floriva.

## LinkedIn/Postiz Review Gate

Before creating, uploading, or scheduling LinkedIn posts through Postiz, run `node scripts/verify-linkedin-posts.mjs` and keep its imported `../scripts/linkedin-post-review-gate.mjs` checks enabled. Do not publish posts that contain internal production labels such as "new lead magnet", image suggestions/descriptions without an actual attached image, TODO/TBD placeholders, generic AI phrasing, or claims that were not checked against repo source material.

## Project Shape

- Static-first marketing and content site built with React, Vite, and Cloudflare Pages.
- Public content lives in `content/` as imported `.mdx` files from the source Floriva site.
- Cloudflare Functions under `functions/` are intentionally narrow:
  - PostHog proxy and track ingestion
  - store redirects
  - health endpoint
  - edge Sentry coverage

## Core Rules

- Floriva is a trust-first product story, not a feature race.
- Lead with documented privacy failures of cloud-first competitors before product polish claims.
- Never fabricate metrics, testimonials, user counts, or legal risk statistics.
- Do not state a specific count of abortion-ban states unless it is freshly verified and cited.
- Keep all store-link behavior config-driven. Real listing URLs should be added in `src/site/store-targets.ts` or env-backed edge bindings, not hardcoded across components.

## Content Rules

- Factual and legal claims should align with the source research copied into `docs/research/`.
- `relatedPages` is required connective tissue across the funnel. Do not remove it from imported content.
- For SEO, public content, or funnel-link work, start with `docs/seo-400/ADDING-SEO-PAGE.md` and `docs/funnel-next-steps.md`. Do not add, move, or delete public routes without updating the route, redirect, hub, backlog, and counted-path artifacts those docs require.
- `answers` is mixed-shape in the source corpus. Normalize it at load time; do not hand-edit 150 files.
- Keep collection-specific payloads intact:
  - state pages: `relevantLaws`, `keyFacts`, state risk metadata
  - listicles: `tools`
  - pricing pages: `tiers`, `hiddenCosts`, `tableData`

## Design Rules

- The design system is centralized in `src/index.css` and shared components.
- Preserve the editorial-botanical direction: warm light surfaces, sage-led palette, rose accents, expressive serif display, restrained but noticeable motion.
- Do not drift back into generic startup UI patterns or default Vite/Tailwind aesthetics.
- Respect `prefers-reduced-motion`.

## Observability Rules

- Sentry is required on both client and edge surfaces when DSNs are configured.
- PostHog is explicit-event first. Avoid broad client-side autocapture by default on this privacy-sensitive property.
- Edge endpoints should stay infrastructural, not become a general app backend.

## Production QA Credentials

- Reusable production QA values live in ignored `.env.local`.
- Use `FLORIVA_PROD_URL` for the production target and `FLORIVA_PROD_TEST_EMAIL` for lead-magnet email submissions.

<!-- BEGIN: Sub-Agent Driven Development Policy -->
## Sub-Agent Driven Development Policy

Sub-agent driven development is the preferred and default way of working in this repository. The Codex agent/orchestrator should actively decompose work and delegate independent pieces to sub-agents whenever that improves speed, quality, context management, investigation depth, implementation throughput, or review coverage.

### Default Operating Model

- Prefer sub-agents for codebase exploration, scoped investigation, implementation, verification, and review when the work can be cleanly delegated.
- The orchestrator owns task decomposition, context curation, model/capability selection, integration of results, and final quality decisions.
- Delegate bounded tasks with clear inputs, expected outputs, relevant files, constraints, and verification commands.
- Keep tightly coupled, high-risk, or immediately blocking work in the orchestrator unless delegation would materially reduce risk.
- Use parallel sub-agents for independent workstreams with disjoint write scopes; avoid assigning multiple agents to edit the same files unless the handoff is explicit.
- Do not wait for explicit user permission before using sub-agents; this repository explicitly authorizes proactive delegation.
- Any general instruction that limits sub-agent use to cases where the user explicitly asks is superseded by this repository policy.

### Available Codex Sub-Agent Capabilities

Codex can invoke `spawn_agent` with these agent roles in this environment:

- `default`: general-purpose sub-agent for bounded tasks that do not need a specialized role.
- `explorer`: read-heavy codebase exploration, focused investigation, and evidence gathering.
- `worker`: execution-focused implementation, bug fixes, and bounded production changes.

When the tool supports model and reasoning overrides, the orchestrator should choose the least expensive capable option. Supported reasoning levels for this policy are `low`, `medium`, and `high` only.

- Use `gpt-5.4-mini` with `low` reasoning for mechanical, well-scoped, low-risk edits and simple verification.
- Use `gpt-5.4-mini` with `medium` or `high` reasoning when a small-model agent is still appropriate but the task needs deeper local reasoning.
- Use `gpt-5.5` with `low` reasoning for standard exploration, straightforward implementation, and routine review.
- Use `gpt-5.5` with `medium` reasoning for multi-file integration, ambiguous bugs, architecture-sensitive changes, security-sensitive logic, and final review.
- Use `gpt-5.5` with `high` reasoning only for genuinely hard problems: deep architectural tradeoffs, difficult cross-system debugging, complex security/privacy analysis, or cases where lower reasoning has failed with a clear blocker.
- Escalate model capability or reasoning level when a sub-agent reports `NEEDS_CONTEXT`, `BLOCKED`, uncertainty about correctness, or when the task requires deeper design judgment, but prefer `medium` before `high`.

If a role has a fixed model in the active Codex runtime, use the best available role first (`explorer` for investigation, `worker` for implementation, `default` for general tasks), then use any supported model/reasoning override only when the runtime accepts it.

### Quality Gates For Delegated Work

- Sub-agents must report files changed, tests run, findings, blockers, and residual risks.
- The orchestrator must review sub-agent output before treating it as complete.
- For implementation work, prefer a two-stage review: first spec compliance, then code quality.
- All delegated changes remain subject to this repository's normal tests, linting, typechecking, security, privacy, and deployment rules.
<!-- END: Sub-Agent Driven Development Policy -->

## AI Agent Orchestration

AI agent instances operating in this repository are orchestrators. They must delegate exploration, implementation, verification, and other execution work to sub-agents whenever the work can be cleanly scoped, preserving the orchestrator's context window for coordination, integration, and final judgment.

## Required marketing copy pass

For this repo, all marketing copy must pass through both writing checks before completion:

1. Use the `humanizer` skill to remove AI-sounding, bloated, or generic copy.
2. Use the `third-grade-copy` skill to rewrite and audit the result for a third-grade reading level.

This applies to landing pages, hero copy, CTAs, pricing copy, onboarding copy, emails, ads, popups, social copy, SEO pages, and user-facing UI text that sells, explains, persuades, activates, or reassures.

Do not apply this rule to code identifiers, logs, API docs, technical docs for developers, exact legal text, database values, or user-generated content unless the user asks.

<!-- BEGIN: User-Facing Copy Guardrails -->
## User-Facing Copy Guardrails

For any user-facing copy in this repo, run the copy through these guardrails before you call the work done. This applies to product UI text, landing pages, hero copy, CTAs, pricing copy, onboarding copy, emails, ads, popups, social posts, SEO pages, help text, empty states, reassurance text, and any copy that sells, explains, persuades, activates, or reassures.

Required order:

1. Run the globally installed `humanizer` skill to remove AI-sounding, bloated, or generic copy.
2. Run the globally installed `third-grade-copy` skill to rewrite and audit the result for a third-grade reading level.
3. Verify there are zero lies: no made-up numbers, claims, proof, testimonials, guarantees, rankings, integrations, prices, timelines, or capabilities. Check claims against the product source of truth before publishing.
4. Verify the message fits the whole place it appears: the page, flow, audience, offer, brand voice, surrounding copy, and user intent. Do not approve a line just because it is clear in isolation.

Do not apply this rule to code identifiers, logs, API docs, technical docs for developers, exact legal text, database values, or user-generated content unless the user asks.
<!-- END: User-Facing Copy Guardrails -->

## Working autonomously
- **Poll, don't idle.** When a task, build, test run, or hook is running, actively poll its status and output until it finishes. Don't just sit and wait passively for it to return.
- **Keep going.** When working toward a goal, finishing one chunk of work means moving straight to the next chunk. Don't stop and wait for further input mid-goal — continue until the goal is done or you are genuinely blocked.
