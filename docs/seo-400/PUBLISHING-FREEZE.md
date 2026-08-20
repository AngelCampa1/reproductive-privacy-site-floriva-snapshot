# Programmatic publishing freeze

Date: 2026-07-18
Status: ACTIVE, but see the diagnosis correction below before acting on the "Why" section.

> ## ⚠️ Diagnosis corrected 2026-07-31, read this first
>
> **The "site-level algorithmic suppression" theory below is wrong.** Measured with live GSC, DataForSEO, and SERP data on 2026-07-31:
>
> - **No penalty exists.** Brand query "floriva period tracker" returns floriva.app at **#1**, the Apple App Store listing at **#3**, Google Play at **#4**. A suppressed site does not rank #1 on its own brand.
> - **Zero non-brand keywords in the top 20.** 25 ranked keywords, positions **22 to 54**.
> - **2 backlinks, 2 referring domains** (1 nofollow).
> - Pre-drop query positions (Jun 1 to 19) were mostly **50 to 99**, the "lost rankings" were deep-page impressions from a new-site discovery boost, not earned rankings.
>
> What actually happened: a ~4-month-old domain got a new-site boost that surfaced 559 templated pages at positions 50 to 99. The June 20 update removed the boost. What remains is the site's true unassisted position: no authority, so no rankings.
>
> **Consequences for this document:**
> - Point 4 under "Recovery strategy" (*"expect the suppression to lift at a future spam/core update"*) is **wrong and should not be waited on**. There is nothing to lift.
> - The freeze itself is still sensible, publishing more templated pages into SERPs the site cannot compete in has no upside, but the *stated reason* is not the real one.
> - Point 1 (**authority**) is the correct and only binding lever. `AUTHORITY-OUTREACH.md` still logs **0 links earned, 0 targets contacted**. That, not the algorithm, is why nothing has recovered.
> - Target SERPs do not surface this page type at all. For "period app that doesn't sell data" and "best private period tracker apps", page 1 is Reddit, BBC, Consumer Reports, PCMag, Mozilla Foundation, allaboutcookies.org, app-store listings, and competitor app *homepages*. No small programmatic comparison site appears at any position.
>
> "Lifting the freeze" should therefore not be gated on impression recovery from an algorithm reassessment that is not coming. Gate it on earned referring domains instead.

## Rule

Do not publish new programmatic/templated SEO pages (SEO400 backlog, topic-backlog.csv expansions, new lead-magnet fan-outs, new state/app-guide/listicle batches) while this freeze is active. Editing, strengthening, and differentiating existing pages is encouraged and is the active recovery strategy. No pages get deleted or pruned (owner decision, 2026-07-18).

## Why

- Impressions collapsed ~95% on 2026-06-20, matching the June 19 unconfirmed Google update ("spam-side") and the confirmed June 2026 spam update (rolled out June 24 to 26).
- Diagnosis (2026-07-18): site-level algorithmic suppression. Not technical (Googlebot crawls succeed, pages stay indexed but are withheld from SERPs), not a manual action (GSC shows "No issues detected").
- The site's profile matches what those updates demote: majority templated programmatic pages, 1 total backlink (nofollow), ~3-month-old domain, YMYL niche. Publishing 400 net-new programmatic pages on July 1 (mid-demotion) fed that classification, most sit at "Crawled/Discovered - currently not indexed."

## Recovery strategy (approved plan)

1. Authority first: earn real referring domains (privacy-press pitches from `docs/research/`, Privacy Guides, directories, store listings). First milestone: 10 to 20 referring domains.
2. Strengthen not-indexed pages in place using `INDEX-STATUS-LEDGER.md` (being generated from the 2026-07-18 GSC URL-inspection snapshot; lands in this directory) with unique substance, template differentiation, interlinking, and named-author E-E-A-T.
3. Brand target: "private period tracker" / "on-device period tracker" / "period tracker that doesn't sell data", not the "floriva" pharma-trademark SERP.
4. Expect the suppression to lift at a future spam/core update reassessment (weeks to months). No code or infra change moves the needle before then.

## Lifting the freeze

Lift when GSC shows sustained impression recovery across page families (not a one-day spike), ideally after a confirmed Google update. Record the lift date and evidence here.
