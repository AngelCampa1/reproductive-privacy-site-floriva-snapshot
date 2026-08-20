# Security and privacy architecture

This site markets and researches a reproductive-health product, so its own privacy
posture is not a footnote: it is the thing the product argument rests on. This
document consolidates what was otherwise scattered across `ARCHITECTURE.md`,
`DECISIONS.md`, and `docs/qa/`: what data this website collects, what it deliberately
does not, and three findings that are still open (a false data-retention promise, an
unresolved third-party analytics beacon, and a Sentry scrubbing guarantee that only
holds on one of two surfaces, all three are cited in [Open findings](#open-findings)). Every
claim below cites the file it comes from. Where two documents in this tree disagreed
with each other, that disagreement is stated rather than smoothed over.

**Scope.** This document covers `floriva-web` (the marketing and research site in
this repository), not the Floriva mobile app, which is a separate, private repository.
The boundary between them is addressed directly in
[its own section](#the-boundary-with-the-mobile-app) below, because it is the question
a privacy-conscious reader asks first. Within this repository, this document covers the
site's own code and infrastructure; editorial claims about third-party products or law
inside `content/` are audited separately, by `scripts/audit-claims.mjs` and
`scripts/verify-sources.mjs`. See [portfolio/TESTING.md](TESTING.md).

---

## What this site says it collects

The site's own machine-readable knowledge base states the collection scope in one
sentence:

> "The floriva.app website is primarily an informational and content site. We do not
> run product analytics, advertising SDKs, tracking pixels, social-media trackers,
> session replay, or third-party feedback widgets on the site. The only personal
> information we collect through the website is what you choose to give us when you
> request a free resource (a "lead magnet"): the email address you submit, which
> resource you requested, and the site page you requested it from."
>
> Source: [`src/site/knowledge/index.ts:455`](../src/site/knowledge/index.ts)

Read alone, that sentence is narrow. The same document does not stop there: a few
lines later, under "Information collected automatically," it discloses the thing an
earlier version of this section wrongly said was missing:

> "When you submit the resource form, our hosting provider (Cloudflare) processes your
> IP address and a one-way (SHA-256) hash of your email so we can rate-limit abuse and
> spam. The IP-derived value and email hash are stored only for that anti-abuse
> purpose."
>
> Source: [`src/site/knowledge/index.ts:460`](../src/site/knowledge/index.ts)

**Correction: an earlier draft of this document said the public policy "does not
mention" IP collection. That was wrong.** IP processing is disclosed, in the paragraph
quoted above. The real finding is worse than an omission, and it is one paragraph
later, in "Data retention":

> "Anti-abuse records (including the email hash and IP-derived value) are short-lived
> and used only for rate-limiting."
>
> Source: [`src/site/knowledge/index.ts:495`](../src/site/knowledge/index.ts)

> [!WARNING]
> **That retention sentence is false, not just optimistic.**
> [`functions/_lib/lead-magnet-abuse.ts`](../functions/_lib/lead-magnet-abuse.ts) writes
> every submission attempt to `lead_magnet_submission_attempts`, schema in
> [`migrations/0008_public_form_abuse_hardening.sql`](../migrations/0008_public_form_abuse_hardening.sql),
> and only ever *reads* that table with a 10-minute lookback (`WINDOW_MS`) to decide
> whether to rate-limit the current request. Nothing deletes from it. A repository-wide
> search for `submission_attempts` across `functions/`, `worker/`, `scripts/`, and
> `migrations/` turns up exactly those two `SELECT COUNT` checks, the one `INSERT`, and
> the table/index definitions: no `DELETE`, no `UPDATE`, no TTL column, no expiry job.
> A repo-wide search for `DELETE FROM` finds exactly two statements, and neither touches
> this table: a resource-request cleanup in
> [`functions/_lib/lead-magnet-store.ts`](../functions/_lib/lead-magnet-store.ts), and a
> one-time duplicate-row collapse for an unrelated table in
> [`migrations/0011_revive_lead_magnet_sequence_jobs.sql`](../migrations/0011_revive_lead_magnet_sequence_jobs.sql).
> [`worker/wrangler.toml`](../worker/wrangler.toml)'s `[triggers]` cron
> (`*/15 * * * *`) is the only scheduled job in this tree, and it drives the nurture-email
> sweep in `worker/src/index.ts`'s `scheduled()` handler, which never references
> `submission_attempts` either. "Short-lived" describes the 10-minute window the
> rate-limit *logic* looks back over, not how long the row itself persists. A row
> written on this site's first day is still in the database today, and a reader relying
> on the policy's own words would reasonably, and wrongly, conclude otherwise.

The second nuance is in the word choice. The policy places "IP-derived value" in
parallel with "email hash," which invites a reader to assume the same one-way
transformation was applied to both. It was not.
[`functions/_lib/lead-magnet-abuse.ts`](../functions/_lib/lead-magnet-abuse.ts)'s
`clientKey()` reads `cf-connecting-ip`, falling back to the first hop of
`x-forwarded-for`, and returns it unchanged; `recordLeadMagnetSubmissionAttempt` writes
that string directly into the `client_key` column defined in
[`migrations/0008_public_form_abuse_hardening.sql`](../migrations/0008_public_form_abuse_hardening.sql).
There is no hashing, salting, or truncation step anywhere in that path. "IP-derived" is
technically true of any value computed from an IP, including the IP itself unmodified,
but sitting next to a genuinely hashed email, it reads as if the same protection covers
both. The table stores the visitor's raw IP address in plain text, and, per the
retention finding above, indefinitely.

Separately from the retention question, the live code backs the narrow half of the
original claim about what gets collected. `functions/api/lead-magnet/subscribe.ts` is
the only write path that accepts visitor-submitted data, and it writes to D1's
`lead_magnet_leads` table. Conceptually, that table's purpose is the three things the
narrow sentence above names: the email address, the lead-magnet slug requested, and the
source page path. Literally, the table has 11 columns. See
[`migrations/0001_lead_magnet_subscriptions.sql`](../migrations/0001_lead_magnet_subscriptions.sql):
`id`, `email`, `email_hash`, `status`, first/last pairs for the slug and source path
(`first_lead_magnet_slug`, `last_lead_magnet_slug`, `first_source_path`,
`last_source_path`), `unsubscribe_token`, `created_at`, and `updated_at`. The extra
columns are deduplication bookkeeping and operational metadata, not additional
categories of personal information, but "exactly three things" undercounts what the
schema actually stores, and a reader checking this document against the migration
should not have to reconcile the difference alone.

The email hash used for rate-limiting (`createEmailHash` in
[`functions/_lib/lead-magnet-subscription.ts`](../functions/_lib/lead-magnet-subscription.ts))
is a plain, unsalted SHA-256 of the lowercased address. It is a lookup key for
deduplication and abuse limits, not a confidentiality measure. The same table's
`lead_magnet_leads` row stores the address in plain text regardless, because the email
Worker has to read it to send the resource. Nothing in this tree claims otherwise; it
is stated here because a document like this one is exactly where that distinction
belongs.

## What was deliberately removed, and why

**PostHog.** [`functions/ph/[[path]].ts`](../functions/ph/) answers every request
under `/ph/*` with `404 POSTHOG_ENDPOINT_RETIRED` unconditionally: there is no proxy,
no forwarding, no discard-and-200. [Decision 7 in
`DECISIONS.md`](DECISIONS.md#7-posthog-was-retired-and-ph-fails-closed) records why:
"broad client-side autocapture on \[a reproductive-health privacy property] is a
contradiction of the product's argument," so the alternative considered and rejected
was keeping PostHog with autocapture disabled, not just removing the SDK. The 404 is
deliberate: a stale client that still calls the old endpoint fails loudly rather than
believing it is being recorded. The consequence, stated plainly in the same decision:
there is no product analytics on this site at all, so funnel questions are answered
from Search Console and server logs, or not answered.

**Third-party email transport.** [Decision 8 in
`DECISIONS.md`](DECISIONS.md#8-email-moved-from-resend-to-a-cloudflare-worker) records
the move off a third-party sequencer (with Resend as transport) to a same-account
Cloudflare Worker (`floriva-email`) sending through the Cloudflare `EMAIL` binding.
Subscriber addresses stop transiting a third party. The migration history in this tree
corroborates the "before" state directly:
[`migrations/0011_revive_lead_magnet_sequence_jobs.sql`](../migrations/0011_revive_lead_magnet_sequence_jobs.sql)
is titled "revive the dormant `lead_magnet_sequence_jobs` table for the in-app nurture
drip (previously handled by the external Sequencer service)."

## Sentry: what is scrubbed, and on which surface

Two separate Sentry integrations exist, and they are not identical.

**Edge (`functions/_lib/sentry.ts`).** `scrubSentryEvent` deletes `query_string`
outright and strips the search portion of `request.url` before an event leaves the
edge, run as `beforeSend` inside `runWithEdgeSentry`. This is not a documentation
claim. [`functions/_lib/sentry.test.ts`](../functions/_lib/sentry.test.ts) asserts it
directly: a URL carrying `?slug=guide&sig=secret-signature` (a real signed-download
query string) becomes `https://floriva.app/api/lead-magnet/download` with no query
string in the captured event, and a separate test asserts the edge request *context*
Sentry receives never contains the string `sig=secret-signature`. `annotateSentry` sets
`pathname` on the Sentry context, never the full URL. Sentry is optional by
construction here too: `runWithEdgeSentry` calls `context.next()` directly and skips
the wrapper entirely when `SENTRY_DSN` is unset, so a missing DSN is a configuration
state, not an error path.

**Client (`src/site/sentry.ts`).** `Sentry.init` sets `sendDefaultPii: false`,
`replaysSessionSampleRate: 0`, and `replaysOnErrorSampleRate: 0`. No session replay
recording exists on the client at all, at either sample rate. There is **no
client-side `beforeSend` or query-string scrub** in this file. The README's line that
"query strings [are] scrubbed before they reach Sentry" is true of the edge surface,
demonstrated by a test; it is not demonstrated for the browser surface, and this
document is the place to say so rather than let the README's phrasing read as
covering both.

## The unresolved finding: Cloudflare Browser Insights

[`docs/qa/prod-e2e-bug-report-2026-05-06.md`](../docs/qa/prod-e2e-bug-report-2026-05-06.md)
recorded, on 2026-05-06, that a production page load fetched
`static.cloudflareinsights.com/beacon.min.js` and posted to `/cdn-cgi/rum`: Cloudflare
Browser Insights (RUM), which collects real-user page-performance beacons from
visitors. No code in `src/`, `functions/`, or `worker/` references `cloudflareinsights`,
`cdn-cgi/rum`, Browser Insights, or Cloudflare Web Analytics; it is a per-zone
Cloudflare dashboard setting, not application code, so nothing in this repository can
turn it on or off.

> [!IMPORTANT]
> **This finding is open, not fixed.** The same file's 2026-08-13 resolution note is
> explicit: "Current state: unresolved and unverified. No evidence exists in this
> repository that the dashboard setting was subsequently disabled, and this snapshot
> has no way to observe the live zone. Do not read this note as a fix." Repeating that
> here rather than letting it stay three files deep: the "no product analytics" claim
> in this document and the README is about shipped application code, and that claim
> holds under the code audit above, but Browser Insights is a platform-level beacon
> that the codebase cannot see or control, and as of the last observation in this tree,
> it had fired at least once in production.

## Lead-magnet delivery hardening

The one endpoint that accepts public writes (`/api/lead-magnet/subscribe`) layers five
independent checks, each verifiable in `functions/_lib/`:

| Control | Mechanism | Source |
|---|---|---|
| Same-origin enforcement | `isSameOriginWrite` rejects any POST whose origin doesn't match | [`functions/_lib/bindings.ts`](../functions/_lib/bindings.ts) |
| Bot honeypot | A hidden field that, if filled, returns a fake `202` success and writes nothing | [`functions/_lib/lead-magnet-subscription.ts`](../functions/_lib/lead-magnet-subscription.ts) |
| CAPTCHA | Cloudflare Turnstile, verified server-side before any D1 write | [`functions/_lib/turnstile.ts`](../functions/_lib/turnstile.ts) |
| Rate limiting | 3 attempts per email hash, 30 per IP, in any rolling 10-minute window | [`functions/_lib/lead-magnet-abuse.ts`](../functions/_lib/lead-magnet-abuse.ts) |
| Signed, expiring download links | HMAC-SHA256 over the payload, 7-day TTL, constant-time comparison on verify | [`functions/_lib/lead-magnet-download.ts`](../functions/_lib/lead-magnet-download.ts) |

Every rejection path (honeypot hit, failed Turnstile, rate limit, duplicate
subscription) is designed to be indistinguishable from success at the HTTP layer;
this is the "neutral 202s everywhere" line in the README's decision table, and it holds
across all four paths checked here, not just the one the README names. The unsubscribe
endpoint uses a dedicated per-lead token
(`migrations/0001_lead_magnet_subscriptions.sql`, `unsubscribe_token`), not the
download-signing secret, so revoking one does not touch the other.

## D1 data inventory: what is live, and what is dormant schema

`portfolio/METRICS.md` counts 12 D1 tables across 15 migrations. Grepping every
non-test file in `functions/`, `worker/`, and `scripts/` for each table name shows a
split this document is the first place to state directly:

**Live, read or written by a real endpoint today:** `lead_magnet_leads`,
`lead_magnet_events`, `lead_magnet_sequence_jobs`, `lead_magnet_resource_requests`,
`lead_magnet_submission_attempts`. These back the lead-magnet subscribe, download, and
unsubscribe flow and the email Worker's nurture drip.

**Dormant, defined in a migration, zero references in application code:** `signups`,
`referrals`, `survey_responses`, `pricing_clicks`, `feedback`, `ai_sdr_handoffs`,
`lead_magnet_downloads`. The `signups` table's own migration history is the clearest
evidence this is a predecessor schema rather than a hidden collection path: its later
migrations (`0003`, `0005`, `0006`) add nurture-day and unsubscribe columns matching
the external-sequencer era Decision 8 replaced, and
`0011_revive_lead_magnet_sequence_jobs.sql` documents the cutover explicitly. No table
in this second group is written to by anything a visitor can trigger on the live site.
If a D1 export of this database were produced today, these seven tables would be
present and empty of new rows, not deleted. A schema is not data, but a reader
auditing "what does this database actually hold" should not have to work that out from
migration filenames.

## The boundary with the mobile app

The Floriva mobile app is a separate, private repository, referenced but not included
here (see the README's pointer). Nothing in this tree shares a backend, a database, or
an authentication system with it. The one endpoint that touches the app at all is
[`functions/api/store/[target].ts`](../functions/api/store/), which issues a `302` to
the App Store or Google Play listing with `Cache-Control: no-store`. It reads the
request's `User-Agent` only to pick iOS versus Android, stores nothing, and forwards
nothing to the app.

The site's content repeatedly makes claims about the app's own architecture: local-
first storage, no sync, an optional encrypted backup file. This document does not
re-verify those claims; that check already happened and is recorded in
[`docs/goal-portfolio-public/LEDGER.md`](../docs/goal-portfolio-public/LEDGER.md#cycle-5-2026-08-14-sync-claim-correction-sweep),
which found and corrected roughly 100 instances of a false "sync" claim across the
content corpus after checking the app repository directly for any `fetch`, `XHR`,
`WebSocket`, `axios`, or `sendBeacon` call. That correction is content work, not a
statement about this site's own architecture, which is why it lives in the ledger and
is only cited here.

## Open findings

Three independent findings are open, not stylistic gaps, but places where a claim
this site or its policy makes does not hold up against the code:

> [!WARNING]
> 1. **The public policy's data-retention promise is false.** It says anti-abuse
>    records (raw IP address plus email hash) are "short-lived." Nothing in this
>    codebase deletes or expires them. See [above](#what-this-site-says-it-collects).
> 2. **The Cloudflare Browser Insights (RUM) finding is open, not fixed.** A
>    platform-level beacon fired in production on 2026-05-06 and nothing in this
>    repository can confirm whether it still does. See
>    [above](#the-unresolved-finding-cloudflare-browser-insights).
> 3. **The README's Sentry-scrubbing claim holds for one surface, not both.** The edge
>    strips query strings before an event leaves; the client has no equivalent
>    `beforeSend` scrub, only disabled session replay and default-PII sending. See
>    [above](#sentry-what-is-scrubbed-and-on-which-surface).

None of the three is fixed by anything in this repository. All three, like every claim
in this document, are accurate as of one read of the tree: there is no CI re-verifying
them on a schedule.
