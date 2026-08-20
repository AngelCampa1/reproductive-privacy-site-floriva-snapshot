/**
 * The in-page measurement probe for the mobile layout audit.
 *
 * IMPORTANT: `mobileAuditProbe` is serialized and shipped into the browser by
 * Playwright, so it must be CLOSURE-FREE. It may not reference anything from
 * this module's scope. Every threshold, allowlist, and flag arrives through
 * the single `cfg` argument, and every helper is declared inside the function.
 */

export function mobileAuditProbe(cfg) {
  const W = window.innerWidth;
  const H = window.innerHeight;
  const findings = [];
  const EPS = 1;

  const add = (rule, severity, extra) => {
    findings.push(Object.assign({ rule, severity }, extra));
  };

  /** Build a short, human-readable, greppable selector chain. */
  const describe = (el) => {
    const part = (node) => {
      let s = node.tagName.toLowerCase();
      if (node.id) s += `#${node.id}`;
      const cls = (node.getAttribute("class") || "")
        .trim()
        .split(/\s+/)
        .filter(Boolean)
        .slice(0, 2);
      if (cls.length) s += `.${cls.join(".")}`;
      return s;
    };
    const chain = [];
    let node = el;
    let depth = 0;
    while (node && node.nodeType === 1 && depth < 4) {
      chain.unshift(part(node));
      node = node.parentElement;
      depth += 1;
    }
    return chain.join(" > ");
  };

  const rectOf = (el) => {
    const r = el.getBoundingClientRect();
    return {
      x: Math.round(r.left + window.scrollX),
      y: Math.round(r.top + window.scrollY),
      w: Math.round(r.width),
      h: Math.round(r.height),
    };
  };

  /**
   * A closed <details> still lays its subtree out, so the collapsed megamenu
   * would otherwise contribute hundreds of phantom findings to every page.
   * The user cannot see or reach any of it — the open state is audited
   * separately in the `megamenu-open` capture.
   */
  const inCollapsedDetails = (el) => {
    let node = el.parentElement;
    while (node) {
      if (node.tagName === "DETAILS" && !node.open && !el.closest("summary")) return true;
      node = node.parentElement;
    }
    return false;
  };

  const isRendered = (el, style) => {
    if (style.display === "none" || style.visibility === "hidden") return false;
    if (Number(style.opacity) === 0) return false;
    if (inCollapsedDetails(el)) return false;
    const r = el.getBoundingClientRect();
    return r.width > 0 && r.height > 0;
  };

  const matchesAny = (el, selectors) => {
    for (const sel of selectors) {
      try {
        if (el.matches(sel)) return sel;
      } catch {
        /* malformed selector in config — ignore rather than kill the run */
      }
    }
    return null;
  };

  /* Same idea, but self-or-ancestor. The small-text allowlist is written in
     terms of CONTAINERS (`.breadcrumbs`, `.site-footer__meta`), while the
     element that owns a text node is usually a descendant of those — so
     `matches()` silently never fired for half the list and its entries leaked
     into the warn pile as if they had never been allowlisted. */
  const withinAny = (el, selectors) => {
    for (const sel of selectors) {
      try {
        if (el.closest(sel)) return sel;
      } catch {
        /* malformed selector in config — ignore rather than kill the run */
      }
    }
    return null;
  };

  const all = Array.prototype.slice.call(document.querySelectorAll("body *"));
  const styles = new Map();
  const styleOf = (el) => {
    let s = styles.get(el);
    if (!s) {
      s = window.getComputedStyle(el);
      styles.set(el, s);
    }
    return s;
  };

  /* ------------------------------------------------------------------ *
   * A1 — document overflow (metric only)
   *
   * `.app-shell { overflow: clip }` means this can essentially never fire
   * for in-shell content. Kept because if it DOES fire, something escaped
   * the shell — which is worth knowing.
   * ------------------------------------------------------------------ */
  const docScrollWidth = Math.max(
    document.documentElement.scrollWidth,
    document.body.scrollWidth,
  );
  if (docScrollWidth > W + EPS) {
    add("document-overflow-x", "error", {
      selector: "documentElement",
      detail: `document scrollWidth ${docScrollWidth} > viewport ${W}`,
      overflowBy: docScrollWidth - W,
    });
  }

  /* ------------------------------------------------------------------ *
   * A2 — per-element horizontal overflow (the PRIMARY assertion)
   * ------------------------------------------------------------------ */
  const scrollableAncestor = (el) => {
    let node = el.parentElement;
    while (node && node !== document.documentElement) {
      const s = styleOf(node);
      const ox = s.overflowX;
      if (ox === "auto" || ox === "scroll") {
        const r = node.getBoundingClientRect();
        // Only counts as legitimate containment if the scroller itself fits.
        if (r.right <= W + EPS && r.left >= -EPS) {
          return { el: node, kind: "scroll" };
        }
      }
      if (ox === "hidden" || ox === "clip") {
        return { el: node, kind: "clip" };
      }
      node = node.parentElement;
    }
    return null;
  };

  const offenders = [];
  for (const el of all) {
    const s = styleOf(el);
    if (!isRendered(el, s)) continue;
    // Spam honeypots are parked offscreen (left: -9999px) on purpose.
    if (el.closest(".lead-magnet-modal__honeypot")) continue;
    const r = el.getBoundingClientRect();
    if (r.right <= W + EPS && r.left >= -EPS) continue;
    offenders.push({ el, r });
  }

  // Deduplicate to the deepest offender: one 812px table would otherwise emit
  // a finding for the table, thead, tbody, every row and every cell.
  const deepest = offenders.filter(
    (o) => !offenders.some((other) => other.el !== o.el && o.el.contains(other.el)),
  );

  for (const { el, r } of deepest) {
    const anc = scrollableAncestor(el);
    const overflowBy = Math.round(Math.max(r.right - W, -r.left));
    const base = {
      selector: describe(el),
      rect: rectOf(el),
      overflowBy,
      sample: (el.innerText || el.textContent || "").trim().slice(0, 80),
    };

    if (anc && anc.kind === "scroll") {
      // Intentional horizontal scroller (.comparison-table, prose tables).
      add("contained-overflow", "info", {
        ...base,
        scrollableAncestor: describe(anc.el),
      });
    } else if (anc && anc.kind === "clip") {
      /* ERROR, not warn. `.app-shell` is `overflow: clip`, so if this were a
         warning every overflowing element on the site would land here and the
         gate could never fail — the exact hole that made the old
         documentElement.scrollWidth check useless.

         Clipped is also the WORSE outcome: overflow past a scrollable
         container can at least be scrolled to, while clipped content is
         unreachable. The headline defect this harness was built to find —
         article prose rendering 610px wide in a 390px viewport and being cut
         off mid-word — is precisely this case. */
      add("clipped-content", "error", {
        ...base,
        clippingAncestor: describe(anc.el),
      });
    } else {
      add("element-overflow-x", "error", base);
    }
  }

  /* ------------------------------------------------------------------ *
   * A3 — scroller sanity
   * ------------------------------------------------------------------ */
  const scrollers = [];
  for (const el of all) {
    const s = styleOf(el);
    if (!isRendered(el, s)) continue;
    const ox = s.overflowX;
    if (ox !== "auto" && ox !== "scroll") continue;
    const r = el.getBoundingClientRect();
    scrollers.push(el);

    if (r.width > W + EPS) {
      add("scroller-wider-than-viewport", "error", {
        selector: describe(el),
        rect: rectOf(el),
        detail: `scroll container is ${Math.round(r.width)}px wide in a ${W}px viewport`,
      });
    }
    if (el.scrollWidth > el.clientWidth + EPS) {
      add("scroller-scrolls", "info", {
        selector: describe(el),
        rect: rectOf(el),
        detail: `content ${el.scrollWidth}px in ${el.clientWidth}px container`,
        scrollWidth: el.scrollWidth,
        clientWidth: el.clientWidth,
        overflowBy: el.scrollWidth - el.clientWidth,
      });
    }
  }

  // A scroller inside a scroller is untouchable on a phone — a swipe can't
  // choose which one it drives. Only counts when BOTH actually overflow
  // horizontally: `overflow: auto` for vertical scrolling also computes
  // `overflow-x: auto`, and that nesting is harmless.
  const scrollsX = (el) => el.scrollWidth > el.clientWidth + EPS;
  for (const el of scrollers) {
    if (!scrollsX(el)) continue;
    for (const other of scrollers) {
      if (other !== el && other.contains(el) && scrollsX(other)) {
        add("nested-horizontal-scroller", "error", {
          selector: describe(el),
          rect: rectOf(el),
          detail: `nested inside scroller ${describe(other)} — ambiguous on touch`,
        });
        break;
      }
    }
  }

  /* ------------------------------------------------------------------ *
   * A4 — media
   * ------------------------------------------------------------------ */
  for (const el of document.querySelectorAll("img, svg, video, iframe")) {
    const s = styleOf(el);
    if (!isRendered(el, s)) continue;
    const r = el.getBoundingClientRect();
    const tag = el.tagName.toLowerCase();

    if (r.right > W + EPS || r.left < -EPS) {
      add("media-overflow", "error", {
        selector: describe(el),
        rect: rectOf(el),
        overflowBy: Math.round(Math.max(r.right - W, -r.left)),
        naturalWidth: el.naturalWidth || null,
      });
    }
    if (tag === "img") {
      if (el.complete && el.naturalWidth === 0) {
        add("image-broken", "error", {
          selector: describe(el),
          rect: rectOf(el),
          detail: `failed to load: ${el.currentSrc || el.src}`,
        });
      }
      if (!el.hasAttribute("alt")) {
        add("image-missing-alt", "warn", { selector: describe(el), rect: rectOf(el) });
      }
    }
  }

  /* ------------------------------------------------------------------ *
   * A5 — tap targets
   * ------------------------------------------------------------------ */
  const TAP_SELECTOR =
    'a[href], button, summary, input:not([type="hidden"]), select, textarea,' +
    '[role="button"], [role="link"], [tabindex]:not([tabindex="-1"])';

  const candidates = [];
  for (const el of document.querySelectorAll(TAP_SELECTOR)) {
    const s = styleOf(el);
    if (!isRendered(el, s)) continue;
    // Markdown task lists render `- [ ]` as disabled checkboxes. They are
    // decoration, not controls — nobody can tap them by design.
    if (el.disabled) continue;
    // For a link that wraps across lines, the union bounding box overstates
    // height and would hide a real failure. Measure the largest line box.
    const rects = Array.prototype.slice.call(el.getClientRects());
    let best = el.getBoundingClientRect();
    if (rects.length > 1) {
      best = rects.reduce((a, b) => (b.width * b.height > a.width * a.height ? b : a), rects[0]);
    }
    candidates.push({ el, r: best });
  }

  for (const { el, r } of candidates) {
    if (r.width >= cfg.tapMin && r.height >= cfg.tapMin) continue;

    const allow = cfg.tapAllowlist.find((entry) => {
      try {
        return el.matches(entry.selector);
      } catch {
        return false;
      }
    });

    // WCAG 2.5.8 AA spacing exception: >=24px and >=24px clear of neighbours.
    let spacedOk = false;
    if (r.width >= cfg.tapAaMin && r.height >= cfg.tapAaMin) {
      let nearest = Infinity;
      for (const other of candidates) {
        if (other.el === el) continue;
        const o = other.r;
        const dx = Math.max(0, Math.max(r.left - o.right, o.left - r.right));
        const dy = Math.max(0, Math.max(r.top - o.bottom, o.top - r.bottom));
        if (dx === 0 && dy === 0) {
          nearest = 0;
          break;
        }
        nearest = Math.min(nearest, Math.hypot(dx, dy));
      }
      spacedOk = nearest >= cfg.tapAaSpacing;
    }

    const payload = {
      selector: describe(el),
      rect: rectOf(el),
      size: `${Math.round(r.width)}x${Math.round(r.height)}`,
      label: (el.innerText || el.getAttribute("aria-label") || "").trim().slice(0, 50),
    };

    if (allow) {
      add("tap-target-too-small", "allowlisted", {
        ...payload,
        allowedBy: allow.selector,
        reason: allow.reason,
      });
    } else if (spacedOk) {
      add("tap-target-too-small", "allowlisted", {
        ...payload,
        allowedBy: "wcag-2.5.8-spacing-exception",
        reason: ">=24x24 with >=24px clear space on all sides",
      });
    } else {
      add("tap-target-too-small", "error", payload);
    }
  }

  /* ------------------------------------------------------------------ *
   * A6 — text legibility and clipping
   * ------------------------------------------------------------------ */
  const sizeHistogram = {};
  for (const el of all) {
    const s = styleOf(el);
    if (!isRendered(el, s)) continue;

    let ownText = "";
    for (const node of el.childNodes) {
      if (node.nodeType === 3) ownText += node.nodeValue;
    }
    ownText = ownText.trim();
    if (!ownText) continue;

    const fs = parseFloat(s.fontSize);
    const key = String(Math.round(fs));
    sizeHistogram[key] = (sizeHistogram[key] || 0) + 1;

    const payload = {
      selector: describe(el),
      rect: rectOf(el),
      fontSize: Math.round(fs * 100) / 100,
      sample: ownText.slice(0, 60),
    };

    if (fs < cfg.fontError) {
      add("text-too-small", "error", payload);
    } else if (fs < cfg.fontWarn) {
      const allowed = withinAny(el, cfg.smallTextAllowlist);
      add("text-too-small", allowed ? "allowlisted" : "warn",
        allowed ? { ...payload, allowedBy: allowed } : payload);
    }

    /* Text with no breathing room against the screen edge. Not overflow — the
       box is inside the viewport — so the overflow rules stay silent while
       every line of copy runs into the bezel. This is what a `padding`
       shorthand with a `0` inline value does to a `.shell` section. */
    const tr = el.getBoundingClientRect();
    const edgeAncestor = scrollableAncestor(el);
    const edgeExempt =
      // Cells inside a horizontal scroller are meant to sit past the edge.
      // Only a REAL scroller exempts: `kind: "clip"` matches `.app-shell`,
      // which wraps the whole page, so accepting it here exempted every
      // element on the site and this rule could never fire.
      (edgeAncestor !== null && edgeAncestor.kind === "scroll") ||
      // Honeypots are parked offscreen on purpose.
      Boolean(el.closest(".lead-magnet-modal__honeypot"));
    if (
      !edgeExempt &&
      tr.width > 0 &&
      (tr.left < cfg.edgeGutterMin || tr.right > W - cfg.edgeGutterMin)
    ) {
      add("text-touches-viewport-edge", "error", {
        ...payload,
        detail: `text spans ${Math.round(tr.left)}..${Math.round(tr.right)} in a ${W}px viewport (needs >=${cfg.edgeGutterMin}px of gutter)`,
      });
    }

    // Display type clipping its own descenders — a live risk here because
    // .page-hero h1 runs line-height 0.96. Only counts when something
    // actually hides the overflow; a tight line-height that merely spills
    // outside the content box is visible on screen and harmless.
    const clipsOwnOverflow =
      s.overflowY === "hidden" || s.overflowY === "clip" || s.overflow === "hidden";
    if (fs >= 20 && clipsOwnOverflow && el.scrollHeight > el.clientHeight + EPS) {
      add("text-clipped", "warn", {
        ...payload,
        detail: `scrollHeight ${el.scrollHeight} > clientHeight ${el.clientHeight}`,
      });
    }

    /* An unbreakable token wider than its own box. The box itself still fits
       the viewport, so the overflow rules above never see it — the text just
       spills out of, or is cut off by, its container. This is the defect class
       `longest-token` route selection exists to hunt, and nothing else detects
       it: `text-clipped` only measures the vertical axis. */
    if (
      el.scrollWidth > el.clientWidth + EPS &&
      // Honeypots are collapsed to ~1px on purpose, so their label text
      // "overflows" by design.
      !el.closest(".lead-magnet-modal__honeypot") &&
      // A container narrower than a few characters cannot meaningfully hold
      // text; that is a hidden/collapsed element, not a wrapping defect.
      el.clientWidth > 24 &&
      (edgeAncestor === null || edgeAncestor.kind !== "scroll")
    ) {
      add("text-overflows-own-box", "error", {
        ...payload,
        detail:
          `scrollWidth ${el.scrollWidth} > clientWidth ${el.clientWidth} — ` +
          `an unbreakable token is wider than its container`,
      });
    }
  }

  /* ------------------------------------------------------------------ *
   * A8 — fixed / sticky chrome
   * ------------------------------------------------------------------ */
  let fixedCoverage = 0;
  let stickyHeaderHeight = null;
  let stickyHeaderBottom = null;

  for (const el of all) {
    const s = styleOf(el);
    if (!isRendered(el, s)) continue;
    const pos = s.position;
    if (pos !== "fixed" && pos !== "sticky") continue;

    // A full-viewport modal overlay is correct, not a coverage defect.
    if (el.closest('[role="dialog"], [aria-modal="true"]')) continue;

    const r = el.getBoundingClientRect();
    const ratio = r.height / H;
    fixedCoverage += Math.max(0, Math.min(ratio, 1));

    if (el.classList.contains("site-header")) {
      stickyHeaderHeight = Math.round(r.height * 10) / 10;
      stickyHeaderBottom = Math.round(r.bottom * 10) / 10;
    }

    if (ratio > cfg.fixedCoverageError) {
      add("fixed-chrome-coverage", "error", {
        selector: describe(el),
        rect: rectOf(el),
        detail: `${Math.round(ratio * 100)}% of the ${H}px viewport`,
        coverageRatio: Math.round(ratio * 1000) / 1000,
      });
    } else if (ratio > cfg.fixedCoverageWarn) {
      add("fixed-chrome-coverage", "warn", {
        selector: describe(el),
        rect: rectOf(el),
        detail: `${Math.round(ratio * 100)}% of the ${H}px viewport`,
        coverageRatio: Math.round(ratio * 1000) / 1000,
      });
    }

    if (pos === "fixed" && (r.left < -EPS || r.right > W + EPS)) {
      add("fixed-offscreen", "error", {
        selector: describe(el),
        rect: rectOf(el),
        detail: `horizontally outside the viewport (left ${Math.round(r.left)}, right ${Math.round(r.right)})`,
      });
    }
  }

  /* ------------------------------------------------------------------ *
   * A9 — structural contract
   * ------------------------------------------------------------------ */
  const h1s = document.querySelectorAll("h1");
  if (h1s.length !== 1) {
    add("h1-count", h1s.length === 0 ? "error" : "warn", {
      selector: "h1",
      detail: `expected exactly 1 h1, found ${h1s.length}`,
    });
  }
  for (const [sel, label] of [
    ["header.site-header", "site header"],
    ["main#main-content", "main landmark"],
    ["footer", "footer"],
    [".skip-link", "skip link"],
  ]) {
    if (!document.querySelector(sel)) {
      add("chrome-missing", "error", { selector: sel, detail: `${label} not found` });
    }
  }

  /* ------------------------------------------------------------------ *
   * A12 — popup leakage
   *
   * Suppression relies on storage-key literals defined in
   * src/site/knowledge/index.ts. If those are ever renamed, suppression
   * silently stops working and every screenshot quietly gets a modal in it.
   * Verify it; don't trust it.
   * ------------------------------------------------------------------ */
  if (!cfg.expectDialog) {
    const leaked = document.querySelector('.lead-magnet-modal, [role="dialog"]');
    if (leaked) {
      add("popup-leaked-into-capture", "error", {
        selector: describe(leaked),
        detail: "exit-intent modal present on a capture that should be suppressed",
      });
    }
  }

  /* ------------------------------------------------------------------ *
   * A14 — reveal animation state
   * ------------------------------------------------------------------ */
  const stuck = document.querySelectorAll(".reveal:not(.reveal--visible)");
  if (stuck.length) {
    add("reveal-stuck", "warn", {
      selector: ".reveal:not(.reveal--visible)",
      detail: `${stuck.length} reveal wrapper(s) never became visible under reducedMotion:reduce`,
      count: stuck.length,
    });
  }

  return {
    findings,
    metrics: {
      viewportWidth: W,
      viewportHeight: H,
      docScrollWidth,
      fullPageHeight: document.documentElement.scrollHeight,
      stickyHeaderHeight,
      stickyHeaderBottom,
      fixedCoverageRatio: Math.round(fixedCoverage * 1000) / 1000,
      interactiveCount: candidates.length,
      scrollerCount: scrollers.length,
      revealStuck: stuck.length,
      fontSizeHistogram: sizeHistogram,
    },
  };
}
