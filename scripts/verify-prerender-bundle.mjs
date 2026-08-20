#!/usr/bin/env node
// Every prerendered document must ship the Vite entry bundle.
//
// A dist was once observed where content-route HTML had complete markup and a
// correct <head> but no <script type="module">, so the pages never hydrated.
//
// It was not the build. `scripts/generated-surfaces.test.ts` drives the real
// prerender against the real dist/ using a fixture template that omits
// everything Vite injects, and one case passed PRERENDER_ROUTES="" — falsy, so
// prerender-html.mjs fell through to all 559 sitemap routes and rewrote them
// from the script-less fixture. The test then restored only dist/index.html.
// A green `pnpm test` therefore left a dist whose home page looked fine and
// whose other 558 routes were inert. That test now restores every route it can
// write, but the same shape of accident is easy to reintroduce, so this gate
// makes the failure mode impossible to ship rather than merely fixed once.
//
// Note on file shapes: prerender-html.mjs writes content routes as EXTENSIONLESS
// files (dist/free/<slug>), not dist/free/<slug>/index.html. A glob over
// dist/**/*.html therefore misses most of the 559 routes. This walks every file in
// dist and sniffs for an HTML document instead.
import { promises as fs } from "node:fs";
import path from "node:path";

const rootDir = process.cwd();
const distDir = path.join(rootDir, "dist");
const sitemapPath = path.join(rootDir, "public", "sitemap.xml");

// Non-route HTML documents that are allowed to ship without the entry bundle.
// Verified empty as of this writing: every HTML document dist emits is a
// prerendered route (559 documents; the sitemap lists fewer, since the
// index-policy tier is prerendered but withdrawn from it). Add a path here only
// with a comment explaining why the document must not hydrate.
//
// Exempting a document does not weaken the route coverage check below — that
// works off the sitemap and the swept-document set, not off a document count.
const bundleExemptDocuments = new Set([]);

const assetExtensions = new Set([
  ".avif", ".css", ".gif", ".ico", ".jpeg", ".jpg", ".js", ".json", ".map",
  ".mp4", ".pdf", ".png", ".svg", ".txt", ".webmanifest", ".webp", ".woff",
  ".woff2", ".xml",
]);

async function walk(dir) {
  const found = [];
  for (const entry of await fs.readdir(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) found.push(...(await walk(full)));
    else if (entry.isFile()) found.push(full);
  }
  return found;
}

async function isHtmlDocument(file) {
  if (assetExtensions.has(path.extname(file).toLowerCase())) return false;

  const handle = await fs.open(file, "r");
  try {
    const buffer = Buffer.alloc(512);
    const { bytesRead } = await handle.read(buffer, 0, 512, 0);
    return /<!doctype\s+html|<html[\s>]/i.test(buffer.subarray(0, bytesRead).toString("utf8"));
  } finally {
    await handle.close();
  }
}

// Must mirror loadPrerenderRoutes() in prerender-html.mjs. Checking only sitemap
// routes would leave the index-policy tier unverified: those routes are
// prerendered but deliberately absent from the sitemap, so a failed write would
// slip through this gate and ship as missing pages.
async function loadPrerenderRoutes() {
  const sitemap = await fs.readFile(sitemapPath, "utf8");
  const sitemapRoutes = [...sitemap.matchAll(/<loc>https:\/\/floriva\.app([^<]*)<\/loc>/g)].map(
    (match) => match[1] || "/",
  );
  const { noindexRoutePaths } = JSON.parse(
    await fs.readFile(path.join(rootDir, "src", "site", "index-policy.json"), "utf8"),
  );

  return [...new Set([...sitemapRoutes, ...noindexRoutePaths])];
}

// Mirrors writeRoute() in prerender-html.mjs: content routes are extensionless,
// hubs get an index.html.
async function resolveRouteFile(pathname) {
  if (pathname === "/") return path.join(distDir, "index.html");
  const segments = pathname.replace(/^\/+/, "").replace(/\/+$/, "").split("/");
  for (const candidate of [path.join(distDir, ...segments), path.join(distDir, ...segments, "index.html")]) {
    try {
      if ((await fs.stat(candidate)).isFile()) return candidate;
    } catch (error) {
      if (error.code !== "ENOENT" && error.code !== "ENOTDIR") throw error;
    }
  }
  return null;
}

const errors = [];

let files;
try {
  files = await walk(distDir);
} catch (error) {
  console.error(`verify-prerender-bundle: cannot read ${path.relative(rootDir, distDir)} (${error.code ?? error.message})`);
  process.exit(1);
}

const documents = [];
for (const file of files) {
  if (await isHtmlDocument(file)) documents.push(file);
}

const documentPaths = new Set(documents);
let checked = 0;
for (const file of documents) {
  const relative = path.relative(distDir, file).split(path.sep).join("/");
  if (bundleExemptDocuments.has(relative)) continue;
  checked += 1;

  const html = await fs.readFile(file, "utf8");

  // Two independent checks rather than one ordered pattern: Vite currently
  // emits `type` before `src`, but nothing guarantees that attribute order, and
  // this gate is the last step of `build` — an order flip would fail all 559
  // documents at once and block every deploy for no real defect.
  const scriptTags = html.match(/<script\b[^>]*>/gi) ?? [];
  const entryTag = scriptTags.find(
    (tag) => /\btype=["']module["']/i.test(tag) && /\bsrc=["'][^"']+["']/i.test(tag),
  );

  if (!entryTag) {
    errors.push(`${relative}: no <script type="module" src> — page ships as inert static HTML`);
    continue;
  }

  const src = entryTag.match(/\bsrc=["']([^"']+)["']/i)[1];
  if (!src.startsWith("/")) {
    errors.push(`${relative}: entry bundle src is not root-relative ("${src}")`);
    continue;
  }

  const assetPath = path.join(distDir, ...src.replace(/^\/+/, "").split("/"));
  try {
    if (!(await fs.stat(assetPath)).isFile()) throw new Error("not a file");
  } catch {
    errors.push(`${relative}: entry bundle "${src}" does not exist in dist`);
  }
}

// A prerender run that dies partway leaves earlier routes correct and later
// routes missing entirely, which a per-file sweep alone would not notice.
//
// Asserting every route resolves to a file AND that the file was one of the
// documents actually swept is strictly stronger than comparing counts: a count
// comparison lets N extra HTML documents mask N route files that exist but
// failed the doctype sniff, and it also makes the exempt list unusable (any
// exemption would push the total under the route count and fail the build).
const routes = await loadPrerenderRoutes();
const missingRoutes = [];
const unsweptRoutes = [];
for (const route of routes) {
  const file = await resolveRouteFile(route);
  if (file === null) missingRoutes.push(route);
  else if (!documentPaths.has(file)) unsweptRoutes.push(route);
}
if (missingRoutes.length > 0) {
  errors.push(`${missingRoutes.length} route(s) have no prerendered file: ${missingRoutes.slice(0, 10).join(", ")}`);
}
if (unsweptRoutes.length > 0) {
  errors.push(
    `${unsweptRoutes.length} sitemap route(s) exist on disk but were not recognised as HTML documents ` +
      `(the doctype sniff missed them): ${unsweptRoutes.slice(0, 10).join(", ")}`,
  );
}

if (errors.length > 0) {
  console.error(`verify-prerender-bundle: ${errors.length} error(s) across ${checked} document(s)`);
  for (const error of errors.slice(0, 50)) console.error(`- ${error}`);
  if (errors.length > 50) console.error(`- ...${errors.length - 50} more`);
  process.exit(1);
}

console.log(`verify-prerender-bundle: ${checked} prerendered document(s) carry the entry bundle`);
