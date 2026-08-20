#!/usr/bin/env node
/**
 * Does the mobile layout gate actually fail on broken output?
 *
 * This exists because the gate it tests replaced an earlier check that could
 * not fail: `documentElement.scrollWidth` never exceeds the viewport on this
 * site, since `.app-shell` is `overflow: clip`. The replacement then repeated
 * the mistake in a subtler form — every overflowing element resolved to a
 * clipping ancestor and was filed as a non-failing warning, so four injected,
 * genuinely page-breaking defects produced exactly one error between them.
 *
 * A gate nobody has tried to break is a gate nobody should trust. This injects
 * real defects into a real page and asserts each one produces an ERROR.
 *
 * Usage: node scripts/verify-mobile-gate-selftest.mjs [--origin http://localhost:4173]
 */
import { chromium } from "playwright";

import { POPUP_STORAGE_KEYS, VIEWPORT, buildProbeConfig } from "./lib/mobile-audit-config.mjs";
import { mobileAuditProbe } from "./lib/mobile-audit-probe.mjs";

const originIndex = process.argv.indexOf("--origin");
const origin = originIndex > -1 ? process.argv[originIndex + 1] : "http://localhost:4173";
const route = "/resources/guides/is-flo-safe-to-use";

/**
 * Each defect is something that visibly breaks a phone layout. The injected
 * markup deliberately sits inside `.app-shell`, because that is the clipping
 * ancestor that used to launder every one of these into a warning.
 */
const defects = [
  {
    name: "block 900px wide in a 390px viewport",
    inject: () => {
      const el = document.createElement("div");
      el.style.cssText = "width:900px;height:40px;background:#eee";
      el.textContent = "overflowing block";
      document.querySelector("main").prepend(el);
    },
  },
  {
    name: "table with no horizontal scroll wrapper",
    inject: () => {
      const el = document.createElement("table");
      el.style.cssText = "width:900px";
      el.innerHTML = "<tbody><tr><td>alpha</td><td>beta</td></tr></tbody>";
      document.querySelector("main").prepend(el);
    },
  },
  {
    name: "nowrap flex row of CTAs",
    inject: () => {
      const el = document.createElement("div");
      el.style.cssText = "display:flex;white-space:nowrap;gap:8px";
      el.innerHTML = "<span>Download the app today</span><span>Read the privacy guide now</span>";
      document.querySelector("main").prepend(el);
    },
  },
  {
    name: "copy running into both screen edges",
    inject: () => {
      const el = document.createElement("p");
      el.style.cssText = "margin:0;padding:0;width:100vw";
      el.textContent = "This copy runs into the bezel on both sides with no gutter at all.";
      document.querySelector("main").prepend(el);
    },
  },
  {
    name: "unbreakable 60-character token",
    inject: () => {
      const el = document.createElement("p");
      el.style.cssText = "width:200px;overflow:hidden";
      el.textContent = "A".repeat(60);
      document.querySelector("main").prepend(el);
    },
  },
];

const browser = await chromium.launch({ headless: true });
const context = await browser.newContext({
  viewport: { width: VIEWPORT.width, height: VIEWPORT.height },
  deviceScaleFactor: VIEWPORT.deviceScaleFactor,
  isMobile: true,
  hasTouch: true,
  reducedMotion: "reduce",
});
await context.addInitScript((keys) => {
  try {
    localStorage.setItem(keys.dismissedUntil, String(Date.now() + 86_400_000));
    sessionStorage.setItem(keys.sessionShown, "1");
  } catch {
    /* storage unavailable — the popup simply may appear */
  }
}, POPUP_STORAGE_KEYS);

const page = await context.newPage();
const config = buildProbeConfig();
const errorsOf = (probe) => probe.findings.filter((finding) => finding.severity === "error");

const missed = [];
let baselineErrors = null;

for (const defect of defects) {
  await page.goto(origin + route, { waitUntil: "networkidle", timeout: 60_000 });
  await page.waitForTimeout(400);

  const before = errorsOf(await page.evaluate(mobileAuditProbe, config));
  await page.evaluate(defect.inject);
  const after = errorsOf(await page.evaluate(mobileAuditProbe, config));

  // The unmodified page must be clean, or "+N errors" means nothing.
  if (baselineErrors === null) baselineErrors = before.length;

  const gained = after.length - before.length;
  const rules = [...new Set(after.slice(before.length).map((finding) => finding.rule))];

  if (gained > 0) {
    console.log(`  detected  ${defect.name} (+${gained}: ${rules.join(", ") || "unnamed"})`);
  } else {
    missed.push(defect.name);
    console.error(`  MISSED    ${defect.name}`);
  }
}

await browser.close();

const problems = [];
if (baselineErrors !== 0) {
  problems.push(
    `the unmodified page already reports ${baselineErrors} error(s) — ` +
      `the self-test cannot attribute anything to its injections`,
  );
}
if (missed.length > 0) {
  problems.push(`${missed.length} injected defect(s) did not fail the gate: ${missed.join("; ")}`);
}

if (problems.length > 0) {
  console.error("\nverify-mobile-gate-selftest: the gate has a hole.");
  for (const problem of problems) console.error(`- ${problem}`);
  process.exit(1);
}

console.log(`\nverify-mobile-gate-selftest: all ${defects.length} injected defects fail the gate.`);
