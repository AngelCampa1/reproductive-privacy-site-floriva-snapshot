#!/usr/bin/env node
/**
 * Mobile layout audit — captures every page archetype plus scored worst-case
 * content instances at a real phone viewport, measures them, and writes a
 * triageable report alongside the screenshots.
 *
 * Why per-element measurement rather than document scrollWidth: `.app-shell`
 * is `overflow: clip` (src/styles/base.css), so `documentElement.scrollWidth`
 * can essentially never exceed the viewport for in-shell content. Any check
 * built on it passes silently regardless of what the layout actually does.
 *
 *   node scripts/verify-mobile-layout-browser.mjs --origin http://localhost:4173
 */
import { chromium } from "playwright";
import { mkdirSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

import {
  POPUP_STORAGE_KEYS,
  TAP_TARGET_MIN,
  VIEWPORT,
  buildProbeConfig,
  isExpectedConsoleError,
} from "./lib/mobile-audit-config.mjs";
import { mobileAuditProbe } from "./lib/mobile-audit-probe.mjs";
import { buildRouteList, slugForPath } from "./lib/mobile-audit-routes.mjs";

const REPO_ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");

/* ---------------------------------------------------------------- CLI --- */

function readArg(name, fallback = null) {
  const index = process.argv.indexOf(name);
  if (index === -1) return fallback;
  return process.argv[index + 1] ?? fallback;
}

function hasFlag(name) {
  return process.argv.includes(name);
}

function normalizeOrigin(value) {
  const rawOrigin = value === "%FLORIVA_PROD_URL%" ? "" : value;
  const origin = String(rawOrigin || process.env.FLORIVA_PROD_URL || "http://localhost:4173").replace(
    /\/+$/,
    "",
  );
  if (!/^https?:\/\//.test(origin)) throw new Error(`Invalid origin: ${origin}`);
  return origin;
}

const origin = normalizeOrigin(readArg("--origin"));
const archetypesOnly = hasFlag("--archetypes-only");
const noFullPage = hasFlag("--no-fullpage");
const noScreenshots = hasFlag("--no-screenshots");
const warnAsError = hasFlag("--warn-as-error");
const printRoutesOnly = hasFlag("--print-routes");
const maxRoutes = Number(readArg("--max-routes", "0")) || 0;
const viewportWidth = Number(readArg("--width", String(VIEWPORT.width)));
const states = String(readArg("--states", "loaded,megamenu-open,details-open,modal-open,focus"))
  .split(",")
  .map((s) => s.trim())
  .filter(Boolean);

const PROBE_CONFIG = buildProbeConfig();

/* ------------------------------------------------------------- routes --- */

let routes = buildRouteList(REPO_ROOT, { archetypesOnly });
if (maxRoutes > 0) routes = routes.slice(0, maxRoutes);

if (printRoutesOnly) {
  for (const route of routes) {
    console.log(`${route.path}\t${route.archetype}\t${route.selectedBecause.join(",")}`);
  }
  console.log(`\n${routes.length} routes`);
  process.exit(0);
}

const runId = new Date().toISOString().replace(/[:.]/g, "-").replace(/-\d{3}Z$/, "Z");
const outDir = join(REPO_ROOT, "artifacts", "mobile-visual-audit", runId);
mkdirSync(join(outDir, "shots", "loaded"), { recursive: true });
for (const state of ["megamenu-open", "details-open", "modal-open", "focus"]) {
  if (states.includes(state)) mkdirSync(join(outDir, "shots", state), { recursive: true });
}

/* ------------------------------------------------------------ browser --- */

const browser = await chromium.launch({ headless: true });

const contextOptions = {
  viewport: { width: viewportWidth, height: VIEWPORT.height },
  deviceScaleFactor: VIEWPORT.deviceScaleFactor,
  isMobile: true,
  hasTouch: true,
  // Reveal wrappers initialise to visible under reduced motion (reveal.tsx)
  // AND base.css forces .reveal { opacity: 1 }. So this makes every section
  // render at first paint through the site's own supported code path — no
  // injected stylesheet, no faked DOM. Blank bands in a screenshot are then
  // real bugs rather than the known capture artifact.
  reducedMotion: "reduce",
  colorScheme: "light",
  userAgent:
    "Mozilla/5.0 (iPhone; CPU iPhone OS 17_5 like Mac OS X) AppleWebKit/605.1.15 " +
    "(KHTML, like Gecko) Version/17.5 Mobile/15E148 Safari/604.1",
};

const SUPPRESS_POPUP = ({ keys, farFuture }) => {
  try {
    localStorage.setItem(keys.dismissedUntil, String(farFuture));
    localStorage.setItem(keys.submittedUntil, String(farFuture));
    sessionStorage.setItem(keys.sessionShown, "true");
  } catch {
    /* storage unavailable — the A12 assertion will catch the consequence */
  }
};

/**
 * Stub Turnstile rather than letting it 401 against localhost. The stub
 * reproduces the real 300x65 widget footprint, so the geometry assertions
 * test what production actually renders.
 */
async function installRoutes(context) {
  await context.route("**challenges.cloudflare.com/**", (route) =>
    route.fulfill({
      status: 200,
      contentType: "application/javascript",
      body: `window.turnstile={render:function(c){var el=typeof c==='string'?document.querySelector(c):c;
        if(el){el.innerHTML='<div data-audit-turnstile style="width:300px;height:65px;background:#eee"></div>';}
        return 'audit-stub';},remove:function(){},reset:function(){}};
        if(window.onloadTurnstileCallback){window.onloadTurnstileCallback();}`,
    }),
  );
  await context.route("**sentry.io/**", (route) => route.abort());
}

async function newAuditContext({ suppressPopup = true } = {}) {
  const context = await browser.newContext(contextOptions);
  if (suppressPopup) {
    await context.addInitScript(SUPPRESS_POPUP, {
      keys: POPUP_STORAGE_KEYS,
      farFuture: Date.now() + 365 * 24 * 60 * 60 * 1000,
    });
  }
  await installRoutes(context);
  return context;
}

/* ------------------------------------------------------------ capture --- */

const results = [];
const runtimeIssues = [];

function attachRuntimeListeners(page, ctx) {
  page.on("pageerror", (error) => {
    runtimeIssues.push({ ...ctx, rule: "runtime-error", severity: "error", detail: error.message });
  });
  page.on("console", (message) => {
    if (message.type() !== "error") return;
    const text = message.text();
    if (!isExpectedConsoleError(text)) {
      runtimeIssues.push({ ...ctx, rule: "console-error", severity: "warn", detail: text });
    }
  });
  page.on("response", (response) => {
    const type = response.request().resourceType();
    const url = response.url();
    const critical = type === "script" || type === "stylesheet" || /\/assets\/.+\.(?:js|css)/.test(url);
    if (critical && response.status() >= 400) {
      runtimeIssues.push({
        ...ctx,
        rule: "asset-failure",
        severity: "error",
        detail: `${response.status()} ${url}`,
      });
    }
  });
}

/** Scroll the page end-to-end so lazy images load, then return to the top. */
async function scrollPass(page) {
  await page.evaluate(async () => {
    const step = Math.round(window.innerHeight * 0.9);
    const height = document.documentElement.scrollHeight;
    for (let y = 0; y < height; y += step) {
      window.scrollTo(0, y);
      await new Promise((r) => requestAnimationFrame(() => r()));
    }
    window.scrollTo(0, 0);
    await new Promise((r) => requestAnimationFrame(() => r()));
  });
}

async function settle(page) {
  await page.waitForLoadState("networkidle", { timeout: 6000 }).catch(() => {});
  await scrollPass(page);
  await page.evaluate(() => document.fonts.ready).catch(() => {});
  await page.waitForTimeout(150);
}

async function capture(page, state, slug, { fullPage = false } = {}) {
  if (noScreenshots) return {};
  const shots = {};
  const foldPath = join(outDir, "shots", state, `${slug}.fold.png`);
  await page.screenshot({ path: foldPath });
  shots.fold = `shots/${state}/${slug}.fold.png`;
  if (fullPage && !noFullPage) {
    const fullPath = join(outDir, "shots", state, `${slug}.full.jpg`);
    await page.screenshot({ path: fullPath, fullPage: true, type: "jpeg", quality: 80 });
    shots.full = `shots/${state}/${slug}.full.jpg`;
  }
  return shots;
}

function record(route, state, status, probe, shots, extraFindings = []) {
  const findings = probe.findings.concat(extraFindings);
  // Give every finding a hint of where to look in a 9000px screenshot.
  for (const f of findings) {
    if (f.rect && probe.metrics.fullPageHeight) {
      f.shotHint = { yPct: Math.round((f.rect.y / probe.metrics.fullPageHeight) * 1000) / 10 };
    }
  }
  results.push({
    route: route.path,
    state,
    status,
    archetype: route.archetype,
    selectedBecause: route.selectedBecause,
    shots,
    metrics: probe.metrics,
    findings,
  });
}

/* ------------------------------------------------- state: loaded pages --- */

const SHORT_PAGES = new Set(["/get", "/privacy-features", "/this-route-does-not-exist"]);

const context = await newAuditContext();
const page = await context.newPage();

console.log(`Auditing ${routes.length} routes at ${viewportWidth}x${VIEWPORT.height} @${VIEWPORT.deviceScaleFactor}x against ${origin}`);

for (const [index, route] of routes.entries()) {
  const url = `${origin}${route.path === "/" ? "" : route.path}`;
  const slug = slugForPath(route.path);
  attachRuntimeListeners(page, { route: route.path, state: "loaded" });

  let status = 0;
  try {
    const response = await page.goto(url, { waitUntil: "domcontentloaded", timeout: 30000 });
    status = response ? response.status() : 0;

    // Content routes are extensionless files in dist/. `vite preview` cannot
    // infer a MIME type for those and sends an empty Content-Type; Cloudflare
    // Pages serves them as text/html (verified against production). So an
    // empty value is a preview-server artifact, while a WRONG value would
    // make the browser download the page instead of rendering it.
    /* The document's own status was captured but never asserted. It matters
       here more than usual: under `vite preview`'s SPA fallback a route whose
       prerendered file has vanished still renders client-side and looks fine,
       so only the status reveals it. */
    const expectedStatus = route.expectedStatus ?? 200;
    // `vite preview` SPA-falls-back to 200 for unknown paths while Cloudflare
    // Pages serves a real 404, so only enforce a 404 expectation against an
    // origin that can actually produce one.
    const statusEnforceable = expectedStatus === 200 || status !== 200;
    if (status !== expectedStatus && statusEnforceable) {
      runtimeIssues.push({
        route: route.path,
        state: "loaded",
        rule: "bad-status",
        severity: "error",
        detail: `document responded ${status || "with no response"} — expected ${expectedStatus}`,
      });
    }

    const contentType = response?.headers()["content-type"] ?? "";
    if (contentType && !contentType.startsWith("text/html")) {
      runtimeIssues.push({
        route: route.path,
        state: "loaded",
        rule: "content-type",
        severity: "error",
        detail: `expected text/html, got "${contentType}" — browser may download instead of render`,
      });
    } else if (!contentType) {
      runtimeIssues.push({
        route: route.path,
        state: "loaded",
        rule: "content-type-absent",
        severity: "info",
        detail: "no Content-Type header (expected under `vite preview` for extensionless routes)",
      });
    }

    const minChars = SHORT_PAGES.has(route.path) ? 120 : 800;
    await page
      .waitForFunction(
        (n) => {
          const h1 = document.querySelector("h1");
          return Boolean(h1 && h1.textContent.trim()) && document.body.innerText.length >= n;
        },
        minChars,
        { timeout: 15000 },
      )
      .catch(() => {
        runtimeIssues.push({
          route: route.path,
          state: "loaded",
          rule: "content-never-rendered",
          severity: "error",
          detail: `no h1 or <${minChars} chars of text after 15s`,
        });
      });

    await settle(page);
    const probe = await page.evaluate(mobileAuditProbe, PROBE_CONFIG);
    const shots = await capture(page, "loaded", slug, { fullPage: true });
    record(route, "loaded", status, probe, shots);
  } catch (error) {
    runtimeIssues.push({
      route: route.path,
      state: "loaded",
      rule: "navigation-failed",
      severity: "error",
      detail: error.message,
    });
  }

  page.removeAllListeners("pageerror");
  page.removeAllListeners("console");
  page.removeAllListeners("response");
  if ((index + 1) % 10 === 0) console.log(`  ${index + 1}/${routes.length}`);
}

/* --------------------------------------------- state: megamenu-open ----- */

if (states.includes("megamenu-open")) {
  console.log("Capturing megamenu-open ...");
  const megamenuRoutes = [
    { path: "/", archetype: "home", selectedBecause: ["chrome-state"] },
    { path: "/period-tracker-privacy", archetype: "hub-state-tier", selectedBecause: ["chrome-state"] },
    {
      path: "/resources/guides/is-flo-safe-to-use",
      archetype: "content-article",
      selectedBecause: ["chrome-state"],
    },
  ];

  for (const route of megamenuRoutes) {
    const slug = slugForPath(route.path);
    try {
      await page.goto(`${origin}${route.path === "/" ? "" : route.path}`, {
        waitUntil: "domcontentloaded",
      });
      await settle(page);
      await page.click(".site-nav__menu > summary");
      await page.waitForSelector(".resources-megamenu", { state: "visible", timeout: 5000 });
      await page.waitForTimeout(250);

      const geometry = await page.evaluate(() => {
        const panel = document.querySelector(".resources-megamenu");
        const header = document.querySelector(".site-header");
        if (!panel || !header) return null;
        const p = panel.getBoundingClientRect();
        const h = header.getBoundingClientRect();
        return {
          panel: { top: p.top, bottom: p.bottom, left: p.left, right: p.right, height: p.height },
          headerBottom: h.bottom,
          viewportH: window.innerHeight,
          viewportW: window.innerWidth,
          linkCount: panel.querySelectorAll("a").length,
        };
      });

      const extra = [];
      if (geometry) {
        const gap = Math.round(geometry.panel.top - geometry.headerBottom);
        if (Math.abs(gap) > 4) {
          extra.push({
            rule: "megamenu-detached-from-header",
            severity: "error",
            selector: ".resources-megamenu",
            detail:
              `panel top ${Math.round(geometry.panel.top)}px vs header bottom ` +
              `${Math.round(geometry.headerBottom)}px — ${gap > 0 ? "floating below" : "overlapping"} by ${Math.abs(gap)}px. ` +
              `The panel must derive its position from the header (absolute + top:100%), not restate the header's height.`,
            gap,
          });
        }
        if (geometry.panel.bottom > geometry.viewportH + 1) {
          extra.push({
            rule: "megamenu-tail-offscreen",
            severity: "error",
            selector: ".resources-megamenu",
            detail:
              `panel bottom ${Math.round(geometry.panel.bottom)}px exceeds viewport ${geometry.viewportH}px. ` +
              `The panel caps itself with max-height + overflow:auto, so exceeding the viewport means that cap ` +
              `stopped applying — its tail would then be unreachable rather than internally scrollable.`,
          });
        }
        if (geometry.panel.left < -1 || geometry.panel.right > geometry.viewportW + 1) {
          extra.push({
            rule: "megamenu-horizontally-clipped",
            severity: "error",
            selector: ".resources-megamenu",
            detail: `panel spans ${Math.round(geometry.panel.left)}..${Math.round(geometry.panel.right)} in a ${geometry.viewportW}px viewport`,
          });
        }
      }

      const probe = await page.evaluate(mobileAuditProbe, PROBE_CONFIG);
      const shots = await capture(page, "megamenu-open", slug);
      record(route, "megamenu-open", 200, probe, shots, extra);

      // Escape must close it and return focus.
      await page.keyboard.press("Escape");
      const closed = await page.evaluate(
        () => !document.querySelector(".site-nav__menu")?.hasAttribute("open"),
      );
      if (!closed) {
        runtimeIssues.push({
          route: route.path,
          state: "megamenu-open",
          rule: "megamenu-escape-broken",
          severity: "error",
          detail: "Escape did not close the megamenu",
        });
      }
    } catch (error) {
      runtimeIssues.push({
        route: route.path,
        state: "megamenu-open",
        rule: "capture-failed",
        severity: "error",
        detail: error.message,
      });
    }
  }
}

/* ---------------------------------------------- state: details-open ----- */

/* The probe skips anything inside a closed <details>, because a collapsed
   element still lays out its subtree and would otherwise contribute hundreds
   of findings for content nobody can see. That exemption is not specific to
   the megamenu: the FAQ accordions are <details> too, so their answers are
   skipped in every other state. This opens them and audits what is revealed. */
if (states.includes("details-open")) {
  console.log("Capturing details-open ...");
  const faqRoutes = [
    { path: "/", archetype: "home", selectedBecause: ["faq-state"] },
    {
      path: "/resources/guides/is-flo-safe-to-use",
      archetype: "content-article",
      selectedBecause: ["faq-state"],
    },
    {
      path: "/compare/versus/flo-vs-clue-privacy-comparison",
      archetype: "content-comparison",
      selectedBecause: ["faq-state"],
    },
  ];

  for (const route of faqRoutes) {
    const slug = slugForPath(route.path);
    try {
      await page.goto(`${origin}${route.path === "/" ? "" : route.path}`, {
        waitUntil: "domcontentloaded",
      });
      await settle(page);

      const opened = await page.evaluate(() => {
        const items = Array.from(document.querySelectorAll("details.faq-item"));
        for (const item of items) item.open = true;
        return items.length;
      });

      if (opened === 0) {
        // Not a soft skip: these routes are chosen because they carry FAQs.
        runtimeIssues.push({
          route: route.path,
          state: "details-open",
          rule: "faq-missing",
          severity: "error",
          detail:
            "no details.faq-item found on a route selected for FAQ auditing — " +
            "either the FAQ block regressed or this route should be dropped from faqRoutes",
        });
        continue;
      }

      await page.waitForTimeout(250);
      const probe = await page.evaluate(mobileAuditProbe, PROBE_CONFIG);
      const shots = await capture(page, "details-open", slug);
      record(route, "details-open", 200, probe, shots);
    } catch (error) {
      runtimeIssues.push({
        route: route.path,
        state: "details-open",
        rule: "capture-failed",
        severity: "error",
        detail: error.message,
      });
    }
  }
}

await context.close();

/* ------------------------------------------------ state: modal-open ----- */

if (states.includes("modal-open")) {
  console.log("Capturing modal-open (10s eligibility timer per route) ...");
  const modalRoutes = [
    {
      path: "/resources/guides/is-flo-safe-to-use",
      archetype: "content-article",
      selectedBecause: ["modal-state"],
    },
    {
      path: "/compare/versus/flo-vs-clue-privacy-comparison",
      archetype: "content-comparison",
      selectedBecause: ["modal-state"],
    },
  ];

  for (const route of modalRoutes) {
    const slug = slugForPath(route.path);
    // A fresh context per route: the popup calls markSessionShown(), so a
    // shared context would suppress every route after the first and report a
    // false "modal never fired".
    const modalContext = await newAuditContext({ suppressPopup: false });
    const modalPage = await modalContext.newPage();
    try {
      await modalPage.goto(`${origin}${route.path}`, { waitUntil: "domcontentloaded" });
      await modalPage.waitForTimeout(10_400); // exit-intent-lead-magnet.tsx sets eligible at 10s
      await modalPage.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
      await modalPage.waitForSelector(".lead-magnet-modal", { state: "visible", timeout: 6000 });
      await modalPage.waitForTimeout(300);

      const modalGeometry = await modalPage.evaluate(() => {
        const panel = document.querySelector(".lead-magnet-modal__panel");
        const close = document.querySelector(".lead-magnet-modal__close");
        const submit = document.querySelector(".lead-magnet-modal__form button[type='submit']") ||
          document.querySelector(".lead-magnet-modal__form button");
        const turnstile = document.querySelector(".lead-magnet-modal__turnstile");
        const box = (el) => {
          if (!el) return null;
          const r = el.getBoundingClientRect();
          return {
            top: r.top, bottom: r.bottom, left: r.left, right: r.right,
            width: r.width, height: r.height,
          };
        };
        return {
          panel: box(panel),
          panelScrollHeight: panel ? panel.scrollHeight : null,
          panelClientHeight: panel ? panel.clientHeight : null,
          close: box(close),
          submit: box(submit),
          turnstile: box(turnstile),
          turnstileInner: box(turnstile?.firstElementChild),
          viewportH: window.innerHeight,
          viewportW: window.innerWidth,
          activeElement: document.activeElement?.tagName?.toLowerCase() ?? null,
        };
      });

      const extra = [];
      const g = modalGeometry;
      if (g?.panel) {
        if (g.panelScrollHeight > g.panelClientHeight + 1) {
          extra.push({
            rule: "modal-panel-scrolls",
            severity: "warn",
            selector: ".lead-magnet-modal__panel",
            detail: `panel content ${g.panelScrollHeight}px in a ${g.panelClientHeight}px box — needs internal scrolling at ${g.viewportW}x${g.viewportH}`,
          });
        }
        if (g.submit && g.submit.bottom > g.viewportH + 1) {
          extra.push({
            rule: "modal-cta-below-fold",
            severity: "error",
            selector: ".lead-magnet-modal__form button",
            detail: `submit button bottom ${Math.round(g.submit.bottom)}px is below the ${g.viewportH}px viewport on first paint`,
          });
        }
        if (g.close && (g.close.width < TAP_TARGET_MIN || g.close.height < TAP_TARGET_MIN)) {
          extra.push({
            rule: "modal-close-too-small",
            severity: "error",
            selector: ".lead-magnet-modal__close",
            detail: `${Math.round(g.close.width)}x${Math.round(g.close.height)} — below the ${TAP_TARGET_MIN}px minimum`,
          });
        }
        const widget = g.turnstileInner ?? g.turnstile;
        if (widget && g.panel && widget.width > g.panel.width) {
          extra.push({
            rule: "modal-turnstile-overflow",
            severity: "error",
            selector: ".lead-magnet-modal__turnstile",
            detail: `widget ${Math.round(widget.width)}px wider than the ${Math.round(g.panel.width)}px panel`,
          });
        }
        if (g.activeElement === "input") {
          extra.push({
            rule: "modal-autofocuses-input",
            severity: "warn",
            selector: ".lead-magnet-modal__form input",
            detail:
              "modal focuses the email field on open, which raises the software keyboard immediately over a near-full-height panel",
          });
        }
      }

      const probe = await modalPage.evaluate(mobileAuditProbe, { ...PROBE_CONFIG, expectDialog: true });
      const shots = noScreenshots
        ? {}
        : await (async () => {
            const p = join(outDir, "shots", "modal-open", `${slug}.fold.png`);
            await modalPage.screenshot({ path: p });
            return { fold: `shots/modal-open/${slug}.fold.png` };
          })();
      record(route, "modal-open", 200, probe, shots, extra);
    } catch (error) {
      /* ERROR, not warn. These routes are chosen precisely because the popup
         DOES fire on them, so a failure here means either the modal broke or
         its trigger did — and as a warning it silently deleted all five modal
         geometry assertions while the run still reported PASS. If a route
         legitimately stops showing the popup, remove it from `modalRoutes`
         rather than letting the gate shrug. */
      runtimeIssues.push({
        route: route.path,
        state: "modal-open",
        rule: "capture-failed",
        severity: "error",
        detail:
          `${error.message} — the lead-capture modal did not open on a route selected for it. ` +
          `Either the modal/trigger regressed, or this route no longer qualifies and should be dropped from modalRoutes.`,
      });
    }
    await modalContext.close();
  }
}

/* ----------------------------------------------------- state: focus ----- */

if (states.includes("focus")) {
  const focusContext = await newAuditContext();
  const focusPage = await focusContext.newPage();
  try {
    await focusPage.goto(origin, { waitUntil: "domcontentloaded" });
    await focusPage.waitForTimeout(400);
    await focusPage.keyboard.press("Tab");
    const skip = await focusPage.evaluate(() => {
      const el = document.activeElement;
      if (!el) return null;
      const r = el.getBoundingClientRect();
      return {
        isSkipLink: el.classList.contains("skip-link"),
        width: r.width, height: r.height, top: r.top, left: r.left, right: r.right,
        viewportW: window.innerWidth,
      };
    });
    const extra = [];
    if (!skip?.isSkipLink) {
      extra.push({
        rule: "skip-link-not-first",
        severity: "error",
        selector: ".skip-link",
        detail: "first Tab did not land on the skip link",
      });
    } else {
      if (skip.width < TAP_TARGET_MIN || skip.height < TAP_TARGET_MIN) {
        extra.push({
          rule: "skip-link-too-small",
          severity: "error",
          selector: ".skip-link",
          detail: `${Math.round(skip.width)}x${Math.round(skip.height)}`,
        });
      }
      if (skip.left < -1 || skip.right > skip.viewportW + 1) {
        extra.push({
          rule: "skip-link-offscreen",
          severity: "error",
          selector: ".skip-link",
          detail: `spans ${Math.round(skip.left)}..${Math.round(skip.right)} in ${skip.viewportW}px`,
        });
      }
    }
    if (!noScreenshots) {
      await focusPage.screenshot({ path: join(outDir, "shots", "focus", "_root.fold.png") });
    }
    results.push({
      route: "/",
      state: "focus",
      status: 200,
      archetype: "skip-link",
      selectedBecause: ["chrome-state"],
      shots: noScreenshots ? {} : { fold: "shots/focus/_root.fold.png" },
      metrics: {},
      findings: extra,
    });
  } catch (error) {
    runtimeIssues.push({
      route: "/",
      state: "focus",
      rule: "capture-failed",
      severity: "error",
      detail: error.message,
    });
  }
  await focusContext.close();
}

await browser.close();

/* ------------------------------------------------------------- report --- */

for (const issue of runtimeIssues) {
  const target = results.find((r) => r.route === issue.route && r.state === issue.state);
  if (target) target.findings.push(issue);
  else
    results.push({
      route: issue.route,
      state: issue.state,
      status: 0,
      archetype: "n/a",
      selectedBecause: [],
      shots: {},
      metrics: {},
      findings: [issue],
    });
}

const allFindings = results.flatMap((r) =>
  r.findings.map((f) => ({ ...f, route: r.route, state: r.state, shots: r.shots })),
);

const totals = { error: 0, warn: 0, info: 0, allowlisted: 0 };
for (const f of allFindings) totals[f.severity] = (totals[f.severity] || 0) + 1;

const byRule = {};
for (const f of allFindings) {
  if (!byRule[f.rule]) byRule[f.rule] = { error: 0, warn: 0, info: 0, allowlisted: 0, routes: [] };
  byRule[f.rule][f.severity] = (byRule[f.rule][f.severity] || 0) + 1;
  if (!byRule[f.rule].routes.includes(f.route)) byRule[f.rule].routes.push(f.route);
}

const report = {
  schemaVersion: 1,
  runId,
  origin,
  viewport: { width: viewportWidth, height: VIEWPORT.height, deviceScaleFactor: VIEWPORT.deviceScaleFactor },
  reducedMotion: "reduce",
  routeCount: routes.length,
  captureCount: results.length,
  totals,
  byRule,
  byRoute: results,
};

writeFileSync(join(outDir, "report.json"), JSON.stringify(report, null, 2));
writeFileSync(
  join(outDir, "routes.json"),
  JSON.stringify(routes, null, 2),
);

/* markdown summary — the file a human actually opens */
const errors = allFindings.filter((f) => f.severity === "error");
const warns = allFindings.filter((f) => f.severity === "warn");
const failed = warnAsError ? errors.length + warns.length > 0 : errors.length > 0;

const lines = [];
lines.push(`# Mobile layout audit — ${viewportWidth}x${VIEWPORT.height} @${VIEWPORT.deviceScaleFactor}x`);
lines.push("");
lines.push(`${origin} · ${routes.length} routes · ${results.length} captures · run \`${runId}\``);
lines.push("");
lines.push(
  `**${failed ? "FAIL" : "PASS"}** — ${totals.error} errors, ${totals.warn} warnings, ` +
    `${totals.allowlisted} allowlisted, ${totals.info} informational`,
);
lines.push("");

lines.push("## Errors by rule");
lines.push("");
lines.push("| rule | errors | routes affected |");
lines.push("| --- | ---: | ---: |");
for (const [rule, data] of Object.entries(byRule).sort((a, b) => b[1].error - a[1].error)) {
  if (!data.error) continue;
  lines.push(`| \`${rule}\` | ${data.error} | ${data.routes.length} |`);
}
lines.push("");

lines.push("## Warnings by rule");
lines.push("");
lines.push("| rule | warnings | routes affected |");
lines.push("| --- | ---: | ---: |");
for (const [rule, data] of Object.entries(byRule).sort((a, b) => b[1].warn - a[1].warn)) {
  if (!data.warn) continue;
  lines.push(`| \`${rule}\` | ${data.warn} | ${data.routes.length} |`);
}
lines.push("");

lines.push("## Every error");
lines.push("");
for (const f of errors.slice(0, 200)) {
  const where = f.shotHint ? ` @${f.shotHint.yPct}%` : "";
  lines.push(
    `- \`${f.rule}\` · **${f.route}** (${f.state})${where}\n` +
      `  - \`${f.selector ?? "-"}\` ${f.size ? `· ${f.size}` : ""} ${f.overflowBy ? `· +${f.overflowBy}px` : ""}\n` +
      `  - ${f.detail ?? f.sample ?? ""}`,
  );
}
if (errors.length > 200) lines.push(`- …and ${errors.length - 200} more (see report.json)`);
lines.push("");

const headerHeights = results
  .map((r) => r.metrics?.stickyHeaderHeight)
  .filter((v) => typeof v === "number");
if (headerHeights.length) {
  const max = Math.max(...headerHeights);
  const min = Math.min(...headerHeights);
  lines.push("## Metrics watchlist");
  lines.push("");
  lines.push(
    `- sticky header height: ${min}–${max}px ` +
      `(${Math.round((max / VIEWPORT.height) * 100)}% of viewport).`,
  );
  const maxCoverage = Math.max(
    ...results.map((r) => r.metrics?.fixedCoverageRatio ?? 0),
  );
  lines.push(`- max fixed/sticky chrome coverage: ${Math.round(maxCoverage * 100)}% of viewport`);
  lines.push("");
}

lines.push("## Allowlisted (counted, not failing)");
lines.push("");
for (const [rule, data] of Object.entries(byRule)) {
  if (data.allowlisted) lines.push(`- \`${rule}\`: ${data.allowlisted}`);
}
lines.push("");

writeFileSync(join(outDir, "report.md"), lines.join("\n"));

const rel = `artifacts/mobile-visual-audit/${runId}`;
console.log("");
console.log(lines.slice(0, 40).join("\n"));
console.log("");
console.log(
  `MOBILE-AUDIT result=${failed ? "fail" : "pass"} errors=${totals.error} warns=${totals.warn} report=${rel}/report.md`,
);

process.exit(failed ? 1 : 0);
