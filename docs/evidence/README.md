# Evidence

Raw output from real runs. Nothing here is edited except for stripping ANSI colour
codes and replacing the absolute working directory with `<repo>` in the ten pnpm banner
lines that echoed it, and nothing quoted anywhere else in this repository's
documentation comes from outside this directory or
[`portfolio/METRICS.md`](../../portfolio/METRICS.md).

All four files were captured on **2026-08-07** on Windows 11, Node 22.17.1,
pnpm 10.33.0.

| File | What it is | Reproduce |
|---|---|---|
| [`build-output.txt`](build-output.txt) | Full `pnpm build`. Ends with `Prerendered 470 HTML routes` and `verify-prerender-bundle: 470 prerendered document(s) carry the entry bundle` | `pnpm build` |
| [`test-output.txt`](test-output.txt) | `pnpm test:coverage` (60 files, 429 passed / 2 skipped of 431, 162.93s) followed by `pnpm test:scripts` (3 cases, 0 fail), with the v8 per-file coverage table | `pnpm test:coverage && pnpm test:scripts` |
| [`coverage-summary.json`](coverage-summary.json) | The v8 `json-summary` report the metrics script reads | `pnpm test:coverage` |
| [`mobile-layout-audit-2026-08-07.md`](mobile-layout-audit-2026-08-07.md) | The mobile gate's report. `PASS — 0 errors, 0 warnings, 1682 allowlisted, 56 informational` across 20 routes and 29 captures at 390×844 @2x | `pnpm verify:mobile-layout:fast` |
| [`mobile-layout-audit-2026-08-07.json`](mobile-layout-audit-2026-08-07.json) | The same run, machine-readable | as above |

## What was trimmed, and what was not

The mobile audit's JSON is the only file that is not byte-for-byte what the tool
emitted. The original is 899 KB because it records all 1,682 allowlisted findings
individually, each with a CSS selector, a bounding rect, and the reason it was allowed.
The committed copy keeps every route's full metrics block and replaces the per-finding
array with counts by severity. The `_note` field in the file says so.

Everything else, including 480 lines of Vite asset listing in the build output, and
the chunk-size warning it ends with, is intact. The warning is expected: the content
bundle is lazy-loaded, and truncating output to hide a warning would defeat the purpose
of publishing it.

No Lighthouse score is included: a score from a local `vite preview` is not the
production score (no CDN, no compression negotiation, no real network), and
publishing one as if it described the deployed site would misrepresent it. There are
no CI logs, because these gates run locally; see
[`../../portfolio/TESTING.md`](../../portfolio/TESTING.md).

## Screenshots

17 files were captured in this run, 0.84 MB total, largest 83 KB. Not here: the 11 the
README and this evidence set reference live in
[`../../portfolio/screenshots/`](../../portfolio/screenshots/), curated proof rather
than raw capture output. The other 6 (full-page captures of routes the README does
not feature) stay in [`../assets/`](../assets/) as working evidence.

- **Desktop**: 1440×900, `deviceScaleFactor: 2`, light theme only (there is no dark
  theme; `tokens.css` declares `color-scheme: light`). Seven routes plus two
  element-scoped captures.
- **Mobile**: pulled directly from the `verify:mobile-layout:fast` run above, so the
  images are the exact frames the gate assessed. 390×844 @2x. Eight captures across
  five interaction states: `loaded`, `megamenu-open`, `modal-open`, `details-open`,
  and `focus`.

Both sets were captured under the same hardening the gate uses: `prefers-reduced-motion:
reduce`, the exit-intent popup suppressed through its real storage keys, Turnstile
stubbed at its real 300×65 footprint rather than left to 401 against localhost, and
Sentry requests aborted. No DOM was faked: a blank band in any of these images would
be a real bug.
