#!/usr/bin/env node
import { chromium } from "playwright";

const defaultRoutes = [
  { path: "/", checks: ["store"] },
  { path: "/compare", checks: ["nextSteps", "hubGuides"] },
  { path: "/resources", checks: ["nextSteps", "hubGuides"] },
  { path: "/resources/health", checks: ["nextSteps", "hubGuides"] },
  { path: "/resources/guides", checks: ["nextSteps"] },
  { path: "/resources/best", checks: ["nextSteps"] },
  { path: "/resources/privacy-in-practice", checks: ["nextSteps"] },
  { path: "/resources/symptom-guides", checks: ["nextSteps"] },
  { path: "/resources/condition-guides", checks: ["nextSteps"] },
  { path: "/resources/hormone-guides", checks: ["nextSteps"] },
  { path: "/resources/life-stage-guides", checks: ["nextSteps"] },
  { path: "/resources/wellness-guides", checks: ["nextSteps"] },
  { path: "/period-tracker-privacy", checks: ["nextSteps", "hubGuides"] },
  { path: "/free", checks: ["nextSteps", "hubGuides"] },
  { path: "/app-guides", checks: ["nextSteps"] },
  { path: "/tools/quiz", checks: ["nextSteps"] },
  {
    path: "/compare/alternatives/flo-app-alternative",
    checks: ["nextSteps"],
  },
  {
    path: "/compare/versus/flo-vs-clue-privacy-comparison",
    checks: ["nextSteps"],
  },
  {
    path: "/compare/pricing/period-tracker-subscription-costs",
    checks: ["nextSteps"],
  },
  {
    path: "/resources/best/best-private-period-tracker-apps",
    checks: ["nextSteps"],
  },
  { path: "/resources/guides/is-flo-safe-to-use", checks: ["nextSteps"] },
  {
    path: "/resources/privacy-in-practice/lock-down-period-data-on-your-phone",
    checks: ["nextSteps"],
  },
  {
    path: "/resources/symptom-guides/cramps-but-no-period",
    checks: ["nextSteps"],
  },
  {
    path: "/resources/condition-guides/pcos-period-irregularity-tracking",
    checks: ["nextSteps"],
  },
  {
    path: "/resources/hormone-guides/estrogen-dominance-symptoms",
    checks: ["nextSteps"],
  },
  {
    path: "/resources/life-stage-guides/perimenopause-period-changes",
    checks: ["nextSteps"],
  },
  {
    path: "/resources/wellness-guides/cycle-syncing-complete-guide",
    checks: ["nextSteps"],
  },
  {
    path: "/free/period-app-privacy-audit-kit",
    checks: ["nextSteps", "leadMagnet"],
  },
  {
    path: "/tools/quiz/is-my-period-app-asking-too-much-quiz",
    checks: ["nextSteps"],
  },
  {
    path: "/period-tracker-privacy/reproductive-data-privacy-laws-alabama",
    checks: ["nextSteps"],
  },
  { path: "/app-guides/floriva-for-teens", checks: ["nextSteps"] },
  {
    path: "/guides/is-flo-safe-to-use",
    checks: ["redirect"],
    expectedPath: "/resources/guides/is-flo-safe-to-use",
  },
];

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
  const origin = String(rawOrigin || process.env.FLORIVA_PROD_URL || "https://floriva.app").replace(
    /\/+$/,
    "",
  );
  if (!/^https?:\/\//.test(origin)) {
    throw new Error(`Invalid origin: ${origin}`);
  }
  return origin;
}

function absoluteUrl(origin, pathname) {
  return `${origin}${pathname === "/" ? "" : pathname}`;
}

function isExpectedConsoleError(message) {
  return (
    (/Failed to load resource: the server responded with a status of 410/.test(message) &&
      /downloads\/lead-magnets/.test(message)) ||
    // Turnstile can emit opaque browser console noise in headless prod checks.
    // Critical first-party JS/CSS failures are still caught through response events.
    /Failed to load resource: the server responded with a status of 401/.test(message) ||
    /Failed to load resource: the server responded with a status of 404/.test(message) ||
    /Failed to load resource: the server responded with a status of 400/.test(message) ||
    /font-size:0;color:transparent NaN/.test(message)
  );
}

const origin = normalizeOrigin(readArg("--origin"));
const mobile = hasFlag("--mobile");
const strictCanonical = !hasFlag("--no-strict-canonical");
const localOrigin = /^https?:\/\/(?:localhost|127\.0\.0\.1)(?::\d+)?$/.test(origin);

const browser = await chromium.launch({ headless: true });
const page = await browser.newPage({
  viewport: mobile ? { width: 390, height: 844 } : { width: 1280, height: 900 },
});

const pageErrors = [];
const consoleErrors = [];
const assetFailures = [];

page.on("pageerror", (error) => {
  pageErrors.push(error.message);
});

page.on("console", (message) => {
  if (message.type() !== "error") return;
  const text = message.text();
  if (!isExpectedConsoleError(text)) {
    consoleErrors.push(text);
  }
});

page.on("response", (response) => {
  const request = response.request();
  const resourceType = request.resourceType();
  const url = response.url();
  const isCriticalAsset =
    resourceType === "script" ||
    resourceType === "stylesheet" ||
    (resourceType === "image" && /\/assets\//.test(url)) ||
    /\/assets\/.+\.(?:js|css)(?:\?|$)/.test(url);

  if (isCriticalAsset && response.status() >= 400) {
    assetFailures.push({ url, status: response.status() });
  }
});

async function getPageSnapshot() {
  return page.evaluate(() => {
    const normalizePath = (href) => {
      try {
        const url = new URL(href, window.location.origin);
        return url.pathname.replace(/\/+$/, "") || "/";
      } catch {
        return String(href || "").split("#")[0].split("?")[0].replace(/\/+$/, "") || "/";
      }
    };
    const canonicalEls = [...document.querySelectorAll('link[rel="canonical"]')];
    const jsonLdEls = [...document.querySelectorAll('script[type="application/ld+json"]')];
    const nextStepLinks = [...document.querySelectorAll(".next-step-link")].filter((link) => {
      const rect = link.getBoundingClientRect();
      const styles = window.getComputedStyle(link);
      return rect.width > 0 && rect.height > 0 && styles.visibility !== "hidden";
    });
    const nextStepHrefs = nextStepLinks.map((link) => normalizePath(link.getAttribute("href")));
    const hubGuideHrefs = [...document.querySelectorAll(".guided-entry-card[href]")]
      .filter((link) => {
        const rect = link.getBoundingClientRect();
        const styles = window.getComputedStyle(link);
        return rect.width > 0 && rect.height > 0 && styles.visibility !== "hidden";
      })
      .map((link) => normalizePath(link.getAttribute("href")));
    const storeRoot = document.querySelector(".store-buttons");
    const storeLinks = [...document.querySelectorAll(".store-buttons a[href]")].map((link) =>
      link.getAttribute("href"),
    );
    const storeButtons = [...document.querySelectorAll(".store-buttons button")].map((button) =>
      button.textContent?.trim() ?? "",
    );
    const leadForm = document.querySelector("form[data-lead-magnet-form]");
    const emailInput = leadForm?.querySelector('input[type="email"], input[name="email"]');
    const submitButton = leadForm?.querySelector('button[type="submit"]');
    const h1 = document.querySelector("h1")?.textContent?.trim() || "";
    const title = document.title;
    const body = document.body?.innerText || "";
    const doc = document.documentElement;

    return {
      title,
      h1,
      bodyLength: body.length,
      canonicalCount: canonicalEls.length,
      canonicalHref: canonicalEls[0]?.getAttribute("href") ?? "",
      jsonLdCount: jsonLdEls.length,
      jsonLdTexts: jsonLdEls.map((el) => el.textContent || ""),
      hasNextStepBand: Boolean(document.querySelector(".next-step-band")),
      nextStepVisibleCount: nextStepLinks.length,
      nextStepHrefs,
      hubGuideHrefs,
      hasLeadForm: Boolean(leadForm),
      hasLeadEmail: Boolean(emailInput),
      hasLeadSubmit: Boolean(submitButton),
      hasStoreRoot: Boolean(storeRoot),
      storeLinks,
      storeButtons,
      hasHorizontalOverflow: doc.scrollWidth > doc.clientWidth + 2,
    };
  });
}

function validateJsonLd(texts) {
  const failures = [];
  texts.forEach((text, index) => {
    try {
      JSON.parse(text);
    } catch (error) {
      failures.push({ index, error: error instanceof Error ? error.message : String(error) });
    }
  });
  return failures;
}

function expectedCanonical(pathname) {
  return `https://floriva.app${pathname === "/" ? "/" : pathname}`;
}

const failures = [];
const results = [];

for (const route of defaultRoutes) {
  const beforePageErrors = pageErrors.length;
  const beforeConsoleErrors = consoleErrors.length;
  const beforeAssetFailures = assetFailures.length;
  const response = await page.goto(absoluteUrl(origin, route.path), {
    waitUntil: "domcontentloaded",
    timeout: 20000,
  });

  await page.waitForLoadState("networkidle", { timeout: 5000 }).catch(() => {});

  const finalPath = new URL(page.url()).pathname;
  const status = response?.status() ?? 0;
  const routeFailures = [];

  if (route.checks.includes("redirect")) {
    if (localOrigin) {
      results.push({
        route: route.path,
        status,
        finalPath,
        failureCount: 0,
        skipped: "edge redirects are only checked outside Vite preview",
      });
      continue;
    }

    if (finalPath !== route.expectedPath) {
      routeFailures.push(`expected redirect to ${route.expectedPath}, got ${finalPath}`);
    }
    if (status < 200 || status >= 400) {
      routeFailures.push(`expected redirect chain to end 2xx/3xx, got ${status}`);
    }
  } else {
    await page.waitForFunction(
      () => {
        const h1 = document.querySelector("h1")?.textContent?.trim() || "";
        return h1.length > 0 && document.body.innerText.length >= 800;
      },
      { timeout: 20000 },
    );

    const snapshot = await getPageSnapshot();
    const jsonLdFailures = validateJsonLd(snapshot.jsonLdTexts);

    if (status !== 200) routeFailures.push(`expected status 200, got ${status}`);
    if (!snapshot.h1) routeFailures.push("missing h1");
    if (snapshot.bodyLength < 800) routeFailures.push(`body too short: ${snapshot.bodyLength}`);
    if (snapshot.canonicalCount !== 1) {
      routeFailures.push(`expected one canonical, got ${snapshot.canonicalCount}`);
    }
    if (strictCanonical && snapshot.canonicalHref !== expectedCanonical(route.path)) {
      routeFailures.push(
        `expected canonical ${expectedCanonical(route.path)}, got ${snapshot.canonicalHref}`,
      );
    }
    if (snapshot.jsonLdCount < 1) routeFailures.push("missing JSON-LD");
    if (jsonLdFailures.length > 0) {
      routeFailures.push(`invalid JSON-LD: ${JSON.stringify(jsonLdFailures)}`);
    }
    if (snapshot.hasHorizontalOverflow) routeFailures.push("horizontal overflow detected");

    if (route.checks.includes("nextSteps")) {
      if (!snapshot.hasNextStepBand) routeFailures.push("missing next-step band");
      if (snapshot.nextStepVisibleCount < 3) {
        routeFailures.push(`expected at least 3 visible next-step links, got ${snapshot.nextStepVisibleCount}`);
      }
      if (snapshot.nextStepHrefs.includes(route.path)) {
        routeFailures.push(`next-step links include self-link ${route.path}`);
      }
      if (new Set(snapshot.nextStepHrefs).size !== snapshot.nextStepHrefs.length) {
        routeFailures.push(`next-step links include duplicates: ${snapshot.nextStepHrefs.join(", ")}`);
      }
    }

    if (route.checks.includes("hubGuides")) {
      if (snapshot.hubGuideHrefs.length < 3) {
        routeFailures.push(`expected at least 3 visible hub guide links, got ${snapshot.hubGuideHrefs.length}`);
      }
      if (snapshot.hubGuideHrefs.includes(route.path)) {
        routeFailures.push(`hub guide links include self-link ${route.path}`);
      }
      if (new Set(snapshot.hubGuideHrefs).size !== snapshot.hubGuideHrefs.length) {
        routeFailures.push(`hub guide links include duplicates: ${snapshot.hubGuideHrefs.join(", ")}`);
      }
    }

    if (route.checks.includes("leadMagnet")) {
      if (!snapshot.hasLeadForm) routeFailures.push("missing lead-magnet form");
      if (!snapshot.hasLeadEmail) routeFailures.push("missing lead-magnet email input");
      if (!snapshot.hasLeadSubmit) routeFailures.push("missing lead-magnet submit button");
    }

    if (route.checks.includes("store")) {
      if (!snapshot.hasStoreRoot) routeFailures.push("missing store button surface");
      for (const href of snapshot.storeLinks) {
        if (!/^\/api\/store\/(?:ios|android)$/.test(href ?? "")) {
          routeFailures.push(`unexpected store href: ${href}`);
        }
      }
      if (snapshot.storeLinks.length + snapshot.storeButtons.length < 2) {
        routeFailures.push("expected both store targets to render");
      }
    }
  }

  const routePageErrors = pageErrors.slice(beforePageErrors);
  const routeConsoleErrors = consoleErrors.slice(beforeConsoleErrors);
  const routeAssetFailures = assetFailures.slice(beforeAssetFailures);
  if (routePageErrors.length > 0) routeFailures.push(`page errors: ${routePageErrors.join("; ")}`);
  if (routeConsoleErrors.length > 0) {
    routeFailures.push(`console errors: ${routeConsoleErrors.join("; ")}`);
  }
  if (routeAssetFailures.length > 0) {
    routeFailures.push(`asset failures: ${JSON.stringify(routeAssetFailures)}`);
  }

  results.push({ route: route.path, status, finalPath, failureCount: routeFailures.length });
  if (routeFailures.length > 0) {
    failures.push({ route: route.path, status, finalPath, failures: routeFailures });
  }
}

await browser.close();

console.log(
  JSON.stringify(
    {
      origin,
      viewport: mobile ? "mobile" : "desktop",
      checked: results.length,
      failureCount: failures.length,
      results,
      failures,
    },
    null,
    2,
  ),
);

if (failures.length > 0) {
  process.exit(1);
}
