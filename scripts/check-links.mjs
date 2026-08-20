import { promises as fs } from "node:fs";
import path from "node:path";

const rootDir = process.cwd();
const contentDataPath = path.join(rootDir, "src", "site", "generated", "content-data.ts");
const srcDir = path.join(rootDir, "src");
const publicDir = path.join(rootDir, "public");
const reportPath = path.join(rootDir, "scripts", "link-audit-report.json");

/* These three tables used to be hand-typed here, duplicating `site-routes.ts`
   and `route-inventory.ts` with nothing asserting the copies agreed. A route
   added to the site but forgotten here would make this audit validate links
   against a site that does not exist. Both sides now read the same JSON. */
async function readJson(...segments) {
  return JSON.parse(await fs.readFile(path.join(rootDir, ...segments), "utf8"));
}

const siteRouteData = await readJson("src", "site", "site-routes.json");
const hubCollections = await readJson("src", "site", "hub-collections.json");

const staticRoutes = new Set([...siteRouteData.static, ...siteRouteData.hubs].map((route) => route.path));

/* Every navigable route except the homepage, which is the link source here. */
const globalRouteLinks = [...staticRoutes].filter((route) => route !== "/");

const staticAssets = new Set([
  "/sitemap.xml",
  "/robots.txt",
  "/llms.txt",
  // Sanitized knowledge artifact for AI crawlers, emitted to public/ by
  // scripts/build-public-knowledge.mjs and linked from llms.txt.
  "/public-knowledge.json",
  "/favicon.svg",
  "/icons.svg",
  "/logo.svg",
  "/logo-dark.svg",
  "/logo-light.svg",
  "/404.html",
]);

function normalizePath(p) {
  if (!p) return p;
  let out = p.split("#")[0].split("?")[0];
  if (out.length > 1 && out.endsWith("/")) out = out.replace(/\/+$/, "");
  return out || "/";
}

async function loadContentEntries() {
  const source = await fs.readFile(contentDataPath, "utf8");
  const start = source.indexOf("[");
  const end = source.lastIndexOf("]");
  return JSON.parse(source.slice(start, end + 1));
}

async function walk(dir, exts) {
  const out = [];
  const entries = await fs.readdir(dir, { withFileTypes: true });
  for (const e of entries) {
    const p = path.join(dir, e.name);
    if (e.isDirectory()) {
      out.push(...(await walk(p, exts)));
    } else if (!exts || exts.some((ext) => p.endsWith(ext))) {
      out.push(p);
    }
  }
  return out;
}

function rel(p) {
  return path.relative(rootDir, p).replaceAll("\\", "/");
}

async function main() {
  const entries = await loadContentEntries();
  const validRoutes = new Set(staticRoutes);
  for (const e of entries) validRoutes.add(normalizePath(e.routePath));

  const internalHits = [];
  const externalHits = [];

  function addInternal(link, source) {
    internalHits.push({ link: normalizePath(link), raw: link, source });
  }
  function addExternal(link, source) {
    // self-links go through the internal check instead
    if (/^https?:\/\/(www\.)?floriva\.app(\/|$)/.test(link)) {
      const m = link.match(/^https?:\/\/(?:www\.)?floriva\.app(\/[^\s]*)?$/);
      addInternal(m && m[1] ? m[1] : "/", source);
      return;
    }
    if (!/^https?:\/\//.test(link)) {
      return;
    }
    externalHits.push({ link, source });
  }

  // 1. content entries
  for (const link of globalRouteLinks) {
    addInternal(link, "global:navigation");
  }
  for (const [hubPath, collections] of Object.entries(hubCollections)) {
    for (const e of entries) {
      if (collections.includes(e.collection)) {
        addInternal(e.routePath, `hub:${hubPath}`);
      }
    }
  }

  for (const e of entries) {
    const src = `content/${e.collection}/${e.slug}.mdx`;
    for (const rp of e.relatedPages || []) {
      addInternal(rp, `${src}:relatedPages`);
    }
    // markdown links in body
    const body = e.body || "";
    for (const m of body.matchAll(/\]\((\/[^)\s]+)\)/g)) {
      addInternal(m[1], `${src}:body`);
    }
    for (const m of body.matchAll(/\]\((https?:\/\/[^)\s]+)\)/g)) {
      addExternal(m[1], `${src}:body`);
    }
    // bare URLs in body (markdown autolinks etc)
    for (const m of body.matchAll(/<(https?:\/\/[^>\s]+)>/g)) {
      addExternal(m[1], `${src}:body`);
    }
    for (const stat of e.pricingStats || []) {
      if (stat.sourceUrl) addExternal(stat.sourceUrl, `${src}:pricingStats`);
    }
    for (const law of e.relevantLaws || []) {
      if (law.url) addExternal(law.url, `${src}:relevantLaws`);
    }
  }

  // 2. src/**/*.{ts,tsx}
  const srcFiles = await walk(srcDir, [".ts", ".tsx"]);
  for (const f of srcFiles) {
    const content = await fs.readFile(f, "utf8");
    for (const m of content.matchAll(/\bto=["'](\/[^"']*)["']/g)) {
      addInternal(m[1], rel(f));
    }
    for (const m of content.matchAll(/\bhref=["'](\/[^"']*)["']/g)) {
      addInternal(m[1], rel(f));
    }
    for (const m of content.matchAll(/\bhref=["'](https?:\/\/[^"']+)["']/g)) {
      addExternal(m[1], rel(f));
    }
    for (const m of content.matchAll(/\bhref:\s*["'](\/[^"']*)["']/g)) {
      addInternal(m[1], rel(f));
    }
    for (const m of content.matchAll(/\bhref:\s*["'](https?:\/\/[^"']+)["']/g)) {
      addExternal(m[1], rel(f));
    }
  }

  // 3. sitemap.xml
  const sitemap = await fs.readFile(path.join(publicDir, "sitemap.xml"), "utf8");
  for (const m of sitemap.matchAll(/<loc>https:\/\/floriva\.app([^<]*)<\/loc>/g)) {
    addInternal(m[1] || "/", "public/sitemap.xml");
  }

  // 4. llms.txt
  try {
    const llms = await fs.readFile(path.join(publicDir, "llms.txt"), "utf8");
    for (const m of llms.matchAll(/https:\/\/floriva\.app(\/[^\s)]*)/g)) {
      addInternal(m[1], "public/llms.txt");
    }
    for (const m of llms.matchAll(/(https?:\/\/(?!floriva\.app)[^\s)]+)/g)) {
      addExternal(m[1], "public/llms.txt");
    }
  } catch {}

  // Validate internal
  const brokenInternal = [];
  const inboundByRoute = new Map([...validRoutes].map((route) => [route, []]));
  for (const hit of internalHits) {
    const p = hit.link;
    // strip trailing punctuation that can bleed in from prose
    const cleaned = p.replace(/[),.;:!?]+$/, "");
    if (validRoutes.has(cleaned)) {
      const normalizedSource = normalizePath(hit.source.startsWith("/") ? hit.source : "");
      const isIndexOnlySource = hit.source === "public/sitemap.xml" || hit.source === "public/llms.txt";
      if (!isIndexOnlySource && normalizedSource !== cleaned) {
        inboundByRoute.get(cleaned)?.push(hit.source);
      }
      continue;
    }
    if (staticAssets.has(cleaned)) continue;
    if (cleaned.startsWith("/og/") || cleaned.startsWith("/api/")) continue;
    brokenInternal.push({ ...hit, link: cleaned });
  }

  const orphanRoutes = [...validRoutes]
    .filter((route) => route !== "/" && (inboundByRoute.get(route)?.length ?? 0) === 0)
    .sort();

  // Dedup external
  const externalMap = new Map();
  for (const hit of externalHits) {
    const cleaned = hit.link.replace(/[),.;:!?]+$/, "");
    if (!externalMap.has(cleaned)) externalMap.set(cleaned, []);
    externalMap.get(cleaned).push(hit.source);
  }

  // Check external with HEAD/GET
  const checkExternal = process.argv.includes("--external");
  const brokenExternal = [];
  if (checkExternal) {
    const urls = [...externalMap.keys()];
    console.log(`Checking ${urls.length} unique external URLs...`);
    const concurrency = 8;
    let idx = 0;
    async function worker() {
      while (idx < urls.length) {
        const i = idx++;
        const url = urls[i];
        try {
          const ctrl = new AbortController();
          const t = setTimeout(() => ctrl.abort(), 12000);
          let res = await fetch(url, {
            method: "HEAD",
            redirect: "follow",
            signal: ctrl.signal,
            headers: { "User-Agent": "FlorivaLinkAudit/1.0" },
          });
          if (res.status === 405 || res.status === 403 || res.status === 400) {
            res = await fetch(url, {
              method: "GET",
              redirect: "follow",
              signal: ctrl.signal,
              headers: { "User-Agent": "FlorivaLinkAudit/1.0" },
            });
          }
          clearTimeout(t);
          if (!res.ok) {
            const likelyBotProtected = res.status === 401 || res.status === 403;
            brokenExternal.push({
              url,
              status: res.status,
              sources: externalMap.get(url),
              warn: likelyBotProtected,
            });
          }
        } catch (err) {
          brokenExternal.push({ url, status: 0, error: String(err.message || err), sources: externalMap.get(url) });
        }
      }
    }
    await Promise.all(Array.from({ length: concurrency }, () => worker()));
  }

  const report = {
    summary: {
      validRoutes: validRoutes.size,
      internalLinksChecked: internalHits.length,
      brokenInternal: brokenInternal.length,
      orphanRoutes: orphanRoutes.length,
      externalUnique: externalMap.size,
      brokenExternal: brokenExternal.length,
      externalChecked: checkExternal,
    },
    brokenInternal,
    orphanRoutes,
    brokenExternal,
  };

  await fs.writeFile(reportPath, JSON.stringify(report, null, 2) + "\n", "utf8");

  console.log("=== Floriva Link Audit ===");
  console.log(`Valid routes: ${validRoutes.size}`);
  console.log(`Internal links checked: ${internalHits.length}`);
  console.log(`External links unique: ${externalMap.size}`);
  console.log(`Broken internal: ${brokenInternal.length}`);
  console.log(`Orphan routes: ${orphanRoutes.length}`);
  if (checkExternal) {
    const hard = brokenExternal.filter((b) => !b.warn).length;
    const warn = brokenExternal.filter((b) => b.warn).length;
    console.log(`Broken external: ${hard} hard, ${warn} warnings (401/403)`);
  } else {
    console.log(`Broken external: skipped; pass --external`);
  }

  if (brokenInternal.length) {
    console.log("\n--- Broken internal ---");
    const byLink = new Map();
    for (const b of brokenInternal) {
      if (!byLink.has(b.link)) byLink.set(b.link, []);
      byLink.get(b.link).push(b.source);
    }
    for (const [link, sources] of [...byLink.entries()].sort()) {
      console.log(`  ${link}`);
      for (const s of sources) console.log(`      <- ${s}`);
    }
  }

  if (orphanRoutes.length) {
    console.log("\n--- Orphan routes ---");
    for (const route of orphanRoutes) {
      console.log(`  ${route}`);
    }
  }

  const hardFails = brokenExternal.filter((b) => !b.warn);
  const warns = brokenExternal.filter((b) => b.warn);

  if (hardFails.length) {
    console.log("\n--- Broken external (hard fail) ---");
    for (const b of hardFails.sort((a, b) => a.url.localeCompare(b.url))) {
      console.log(`  [${b.status || "ERR"}] ${b.url}${b.error ? ` (${b.error})` : ""}`);
      for (const s of b.sources) console.log(`      <- ${s}`);
    }
  }

  if (warns.length) {
    console.log("\n--- External warnings (401/403, likely bot-protected) ---");
    for (const b of warns.sort((a, b) => a.url.localeCompare(b.url))) {
      console.log(`  [${b.status}] ${b.url}`);
    }
  }

  if (brokenInternal.length || orphanRoutes.length) process.exit(1);
}

main().catch((err) => {
  console.error(err);
  process.exit(2);
});
