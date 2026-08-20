# SEO400 plan review

## Batch 0 review status

The first planning pass is useful, but the topic backlog is not approved for drafting yet. The sub-agent topic slates exposed several issues that must be fixed during backlog normalization.

## Findings to fix before drafting

1. Invalid collections
   - Some proposed rows used `tool`, which is not a valid Floriva collection.
   - Convert those rows to `questionnaires`, `lead-magnets`, `privacy-in-practice`, or another existing collection before they enter `topic-backlog.csv`.

2. Internal links need route validation
   - Several proposed links point to future pages or guessed routes.
   - `relatedPages` may include planned pages only after those planned routes are also in the backlog.
   - No content file should be drafted until its links pass `pnpm verify:seo400-backlog -- --min 400`.

3. Competitor facts must be refreshed at draft time
   - Pricing, plan names, cancellation flows, export features, app availability, app-store labels, and privacy-policy language can change.
   - Any row marked `[VERIFY price]`, `[VERIFY policy]`, `[VERIFY feature]`, `[VERIFY legal]`, or `[VERIFY app availability]` must be checked against current primary sources before drafting.

4. Legal and state-law claims must stay narrow
   - Do not state a current count of abortion-ban states unless freshly verified and cited.
   - Avoid absolute subpoena claims. Use architecture-specific language such as "reduces the data a company can hand over" when source-backed.

5. Medical content must stay educational
   - Symptom, condition, hormone, fertility, pregnancy, and perimenopause pages must not diagnose or promise outcomes.
   - Use clinical sources for tracking guidance and include clinician escalation language for urgent, severe, or persistent symptoms.

6. Lead magnets need implementation checks
   - New downloadable resources may require matching metadata in `src/site/knowledge/lead-magnet-email-data.ts`, R2 object setup, email copy, and lead-magnet verification.
   - If a page can give away the value directly in HTML, prefer that unless a downloadable artifact is necessary.
   - `pnpm verify:lead-magnets` validates configured PDF resources in production storage, so every new configured download expands the deploy gate.
   - If a resource is mainly a checklist, worksheet, calculator, or template, default to an HTML-native page first; add PDF delivery only when the artifact needs offline use or email capture.

## Approval rule

A topic is ready for drafting only when:

- It has a valid collection and public path.
- It does not collide with existing content.
- It has at least 3 valid internal links.
- It names the free value asset clearly.
- It lists source needs for any factual, medical, legal, pricing, or competitor claim.
- It has a planned review owner for humanizer, third-grade copy, no-lies, and internal links.
