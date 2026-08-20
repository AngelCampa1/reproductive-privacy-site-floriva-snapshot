#!/usr/bin/env node
import { promises as fs } from "node:fs";
import { chromium } from "playwright";

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
  const origin = String(rawOrigin || process.env.FLORIVA_PROD_URL || "http://localhost:4173").replace(/\/+$/, "");
  if (!/^https?:\/\//.test(origin)) {
    throw new Error(`Invalid origin: ${origin}`);
  }
  return origin;
}

function normalizePathname(value) {
  const trimmed = String(value ?? "").trim();
  if (!trimmed || trimmed.startsWith("#")) return "";
  if (/^https?:\/\//.test(trimmed)) {
    return new URL(trimmed).pathname.replace(/\/+$/, "") || "/";
  }
  return `/${trimmed.replace(/^\/+/, "").replace(/\/+$/, "")}` || "/";
}

async function readRoutes(pathsFile) {
  const source = await fs.readFile(pathsFile, "utf8");
  return source.split(/\r?\n/).map(normalizePathname).filter(Boolean);
}

const origin = normalizeOrigin(readArg("--origin"));
const pathsFile = readArg("--paths", "docs/seo-400/net-new-paths.txt");
const maxFailures = Number(readArg("--max-failures", "20"));
const mobile = hasFlag("--mobile");
const routes = await readRoutes(pathsFile);

const browser = await chromium.launch({ headless: true });
const page = await browser.newPage({
  viewport: mobile ? { width: 390, height: 844 } : { width: 1280, height: 900 },
});

const failures = [];
let checked = 0;

for (const route of routes) {
  const response = await page.goto(`${origin}${route}`, {
    waitUntil: "domcontentloaded",
    timeout: 20000,
  });
  await page.waitForFunction(
    () => {
      const h1 = document.querySelector("h1")?.textContent?.trim() || "";
      const body = document.body?.innerText || "";
      return h1.length > 0 && body.length >= 800;
    },
    { timeout: 20000 },
  );
  const status = response ? response.status() : 0;
  const data = await page.evaluate(() => {
    const h1 = document.querySelector("h1")?.textContent?.trim() || "";
    const body = document.body?.innerText || "";
    const links = [...document.querySelectorAll("a[href]")].map((anchor) =>
      anchor.getAttribute("href"),
    );
    return {
      title: document.title,
      h1,
      bodyLength: body.length,
      hasFloriva: body.includes("Floriva"),
      linkCount: links.length,
      has404: /404|not found/i.test(`${h1} ${document.title}`),
    };
  });

  checked += 1;
  if (
    status < 200 ||
    status >= 400 ||
    !data.h1 ||
    data.bodyLength < 800 ||
    !data.hasFloriva ||
    data.has404 ||
    data.linkCount < 5
  ) {
    failures.push({ route, status, ...data });
    if (failures.length >= maxFailures) break;
  }

  if (checked % 50 === 0) {
    console.log(`verify-seo400-browser: checked ${checked}/${routes.length}`);
  }
}

await browser.close();

console.log(
  JSON.stringify(
    {
      origin,
      pathsFile,
      viewport: mobile ? "mobile" : "desktop",
      checked,
      routeCount: routes.length,
      failureCount: failures.length,
      failures,
    },
    null,
    2,
  ),
);

if (failures.length > 0 || checked !== routes.length) {
  process.exit(1);
}
