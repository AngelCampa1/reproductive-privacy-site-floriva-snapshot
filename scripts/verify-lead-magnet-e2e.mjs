#!/usr/bin/env node
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
  const origin = String(rawOrigin || process.env.FLORIVA_PROD_URL || "https://floriva.app").replace(/\/+$/, "");
  if (!/^https?:\/\//.test(origin)) {
    throw new Error(`Invalid origin: ${origin}`);
  }
  return origin;
}

function absoluteUrl(origin, pathname) {
  if (/^https?:\/\//i.test(pathname)) return pathname;
  return `${origin}${pathname.startsWith("/") ? pathname : `/${pathname}`}`;
}

function assert(condition, message) {
  if (!condition) {
    throw new Error(message);
  }
}

async function expectFetch({ body, headers, label, method = "GET", origin, path, status }) {
  const response = await fetch(absoluteUrl(origin, path), {
    body,
    headers,
    method,
    redirect: "manual",
  });
  const text = await response.text();

  assert(response.status === status, `${label}: expected ${status}, got ${response.status}: ${text.slice(0, 240)}`);

  return { response, text };
}

async function verifyPublicSmoke(origin, slug) {
  const route = `/free/${slug}`;

  await expectFetch({
    label: "lead magnet page",
    origin,
    path: route,
    status: 200,
  });
  await expectFetch({
    label: "api health",
    origin,
    path: "/api/health",
    status: 200,
  });
  await expectFetch({
    label: "legacy static download",
    origin,
    path: `/downloads/lead-magnets/${slug}.pdf`,
    status: 410,
  });
  await expectFetch({
    label: "unsigned download",
    origin,
    path: `/api/lead-magnet/download?slug=${encodeURIComponent(slug)}`,
    status: 403,
  });
  await expectFetch({
    label: "missing unsubscribe token",
    origin,
    path: "/api/lead-magnet/unsubscribe",
    status: 400,
  });
  await expectFetch({
    body: JSON.stringify({
      email: "prod-smoke@example.invalid",
      honeypot: "",
      leadMagnetSlug: slug,
      sourcePath: route,
      turnstileToken: "invalid-smoke-token",
    }),
    headers: {
      "Content-Type": "application/json",
      Origin: "https://example.invalid",
    },
    label: "cross-origin subscribe rejection",
    method: "POST",
    origin,
    path: "/api/lead-magnet/subscribe",
    status: 403,
  });

  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage({ viewport: { width: 390, height: 844 } });

  try {
    const response = await page.goto(absoluteUrl(origin, route), {
      waitUntil: "domcontentloaded",
      timeout: 20000,
    });
    assert(response?.status() === 200, `browser page: expected 200, got ${response?.status() ?? 0}`);
    await page.waitForSelector("[data-lead-magnet-form]", { timeout: 20000 });
    await page.waitForSelector('input[type="email"]', { timeout: 20000 });

    const submitText = await page.locator('[data-lead-magnet-form] button[type="submit"]').innerText();
    assert(submitText.trim().length > 0, "browser page: submit button has no label");
  } finally {
    await browser.close();
  }

  console.log(`verify-lead-magnet-e2e: public smoke passed for ${origin}${route}`);
}

async function verifySignedLinks(origin) {
  const downloadUrl = process.env.LEAD_MAGNET_E2E_DOWNLOAD_URL;
  const unsubscribeUrl = process.env.LEAD_MAGNET_E2E_UNSUBSCRIBE_URL;

  if (!downloadUrl || !unsubscribeUrl) {
    throw new Error(
      "Signed-link mode requires LEAD_MAGNET_E2E_DOWNLOAD_URL and LEAD_MAGNET_E2E_UNSUBSCRIBE_URL from a real test delivery email.",
    );
  }

  const downloadResponse = await fetch(absoluteUrl(origin, downloadUrl), {
    redirect: "manual",
  });
  const downloadBytes = Buffer.from(await downloadResponse.arrayBuffer());
  const downloadType = downloadResponse.headers.get("content-type") ?? "";
  const disposition = downloadResponse.headers.get("content-disposition") ?? "";

  assert(downloadResponse.status === 200, `download: expected 200, got ${downloadResponse.status}`);
  assert(downloadType.includes("application/pdf"), `download: expected PDF content type, got ${downloadType}`);
  assert(disposition.includes("attachment"), `download: expected attachment disposition, got ${disposition}`);
  assert(downloadBytes.subarray(0, 5).toString("utf8") === "%PDF-", "download: body is not a PDF");
  assert(downloadBytes.length > 50_000, `download: PDF is unexpectedly small (${downloadBytes.length} bytes)`);

  const unsubscribeGet = await fetch(absoluteUrl(origin, unsubscribeUrl), {
    redirect: "manual",
  });
  const unsubscribeHtml = await unsubscribeGet.text();

  assert(unsubscribeGet.status === 200, `unsubscribe GET: expected 200, got ${unsubscribeGet.status}`);
  assert(/confirm unsubscribe/i.test(unsubscribeHtml), "unsubscribe GET: missing confirmation copy");

  const unsubscribePost = await fetch(absoluteUrl(origin, unsubscribeUrl), {
    method: "POST",
    redirect: "manual",
  });
  const unsubscribeBody = await unsubscribePost.text();

  assert(unsubscribePost.status === 200, `unsubscribe POST: expected 200, got ${unsubscribePost.status}`);
  assert(/unsubscribed/i.test(unsubscribeBody), "unsubscribe POST: missing unsubscribed confirmation");

  const retryResponse = await fetch(absoluteUrl(origin, downloadUrl), {
    redirect: "manual",
  });

  assert(retryResponse.status === 403, `download after unsubscribe: expected 403, got ${retryResponse.status}`);
  console.log("verify-lead-magnet-e2e: signed download and unsubscribe proof passed");
}

const origin = normalizeOrigin(readArg("--origin"));
// Default to a live survivor page. The pre-consolidation catalog slug (period-app-privacy-audit-checklist)
// now 301s to /free/period-app-privacy-audit-kit, so it would fail the 200 page-load smoke below.
const slug = readArg("--slug", "pcos-tracking-kit");
const publicSmoke = hasFlag("--public-smoke");
const signedLinks = hasFlag("--signed-links") || hasFlag("--full-prod");

if (!publicSmoke && !signedLinks) {
  throw new Error("Choose --public-smoke or --signed-links.");
}

if (publicSmoke) {
  await verifyPublicSmoke(origin, slug);
}

if (signedLinks) {
  await verifySignedLinks(origin);
}
