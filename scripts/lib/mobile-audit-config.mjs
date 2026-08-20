/**
 * Thresholds and documented exceptions for the mobile layout audit.
 *
 * Every allowlist entry carries the reason it exists so the list stays
 * re-litigable instead of becoming a place defects go to hide. Allowlisted
 * hits are still counted and reported — they just don't fail the run.
 */

export const VIEWPORT = {
  width: 390,
  height: 844,
  deviceScaleFactor: 2,
};

/** WCAG 2.5.5 AAA target size. */
export const TAP_TARGET_MIN = 44;

/**
 * WCAG 2.5.8 AA: a target under 44px passes if it is at least 24x24 and no
 * other target comes within 24px of it. Implemented rather than hand-waved,
 * because the breadcrumbs on this site depend on exactly that exception.
 */
export const TAP_TARGET_AA_MIN = 24;
export const TAP_TARGET_AA_SPACING = 24;

/**
 * Minimum breathing room between text and the viewport edge. `.shell` gives
 * 1.15rem (18.4px) on mobile; anything under this means a section cancelled it.
 */
export const EDGE_GUTTER_MIN = 8;

/** Below this is unreadable on a phone; between the two is a warning. */
export const FONT_SIZE_ERROR = 12;
export const FONT_SIZE_WARN = 14;

/** Share of the 844px viewport a single piece of fixed/sticky chrome may eat. */
export const FIXED_COVERAGE_WARN = 0.2;
export const FIXED_COVERAGE_ERROR = 0.33;

export const POPUP_STORAGE_KEYS = {
  dismissedUntil: "floriva-lead-magnet-dismissed-until",
  sessionShown: "floriva-lead-magnet-session-shown",
  submittedUntil: "floriva-lead-magnet-submitted-until",
};

/** Prefixes where the exit-intent popup never fires (knowledge/index.ts). */
export const POPUP_EXCLUDED_PREFIXES = ["/free", "/privacy", "/support", "/terms"];

/**
 * Interactive elements exempt from the 44px rule, each with its justification.
 * Matched with `Element.matches()`, so these are plain CSS selectors.
 */
export const TAP_TARGET_ALLOWLIST = [
  {
    selector: ".breadcrumbs__item a",
    reason:
      "Deliberately min-height:24px (src/styles/article.css). Owner decision: breadcrumbs are secondary nav and meet WCAG 2.5.8 AA, not 2.5.5 AAA.",
    decidedOn: "cycle-15",
  },
  {
    selector: ".article-prose a",
    reason: "Inline links inside a block of prose — explicitly exempt under WCAG 2.5.8.",
    decidedOn: "wcag-2.5.8",
  },
  {
    selector: ".sources-list__link",
    reason: "Inline citation links in a reference list — exempt under WCAG 2.5.8.",
    decidedOn: "wcag-2.5.8",
  },
  {
    selector: ".lead-magnet-modal__honeypot input",
    reason: "Spam honeypot — must NOT be a reachable target.",
    decidedOn: "by-design",
  },
  {
    selector: ".skip-link",
    reason: "Offscreen until focused; audited separately in the `focus` capture state.",
    decidedOn: "by-design",
  },
];

/**
 * Small-by-intent typographic labels. These still get counted, but a 12-14px
 * eyebrow or table header is an editorial choice, not a defect.
 */
export const SMALL_TEXT_ALLOWLIST = [
  ".section-eyebrow",
  ".breadcrumbs",
  ".breadcrumbs__item",
  ".breadcrumbs ol",
  ".comparison-table th",
  ".article-prose th",
  ".info-chip",
  ".footer-heading",
  ".content-card__label",
  ".store-button__eyebrow",
  // The live store CTA's eyebrow; only renders when the availability API says
  // the listings are live, so it never appears under `vite preview`.
  ".store-pill__eyebrow",
  ".bento-cell__eyebrow",
  ".journey-step__eyebrow",
  ".state-tier__chip",
  ".article-hero__meta span",
  ".article-toc li",
  // NOT `.site-footer__meta` — that container also holds the footer tagline,
  // a full sentence of running prose, and blanket-exempting the container hid
  // it. Only the legal link row is an intentional label tier.
  ".site-footer__legal",
  ".content-card__meta",
  ".resources-megamenu__group-heading",
  ".sources-list__index",
  ".journey-step__index",
  ".bento-cell__stat-label",
  ".on-device-diagram__cloud-label",
  ".quote-card footer",
  ".home-store-cta__qr-caption",
  ".sources-list__meta",
  ".meta-list",
  "figcaption",
  "small",
  "sup",
  "sub",
];

/**
 * The single source of truth for what the in-page probe is told.
 *
 * Both the gate and its self-test evaluate the same probe, and they MUST pass
 * identical thresholds — a self-test running against a different config proves
 * nothing about the gate. (Hand-building this twice already produced a silent
 * mismatch: `fixedWarn` vs `fixedCoverageWarn`, and the tap allowlist passed as
 * objects instead of selectors.)
 */
export function buildProbeConfig(overrides = {}) {
  return {
    tapMin: TAP_TARGET_MIN,
    tapAaMin: TAP_TARGET_AA_MIN,
    tapAaSpacing: TAP_TARGET_AA_SPACING,
    tapAllowlist: TAP_TARGET_ALLOWLIST,
    edgeGutterMin: EDGE_GUTTER_MIN,
    fontError: FONT_SIZE_ERROR,
    fontWarn: FONT_SIZE_WARN,
    smallTextAllowlist: SMALL_TEXT_ALLOWLIST,
    fixedCoverageWarn: FIXED_COVERAGE_WARN,
    fixedCoverageError: FIXED_COVERAGE_ERROR,
    expectDialog: false,
    ...overrides,
  };
}

/**
 * Console/network noise that is expected against a local static preview:
 * Turnstile cannot validate a localhost origin, and `vite preview` serves no
 * Cloudflare Functions, so /api/* is legitimately absent.
 */
export function isExpectedConsoleError(message) {
  return (
    /challenges\.cloudflare\.com/.test(message) ||
    /turnstile/i.test(message) ||
    /\/api\/(?:health|lead-magnet)/.test(message) ||
    /Failed to load resource: the server responded with a status of 40[0145]/.test(message) ||
    /font-size:0;color:transparent NaN/.test(message)
  );
}
