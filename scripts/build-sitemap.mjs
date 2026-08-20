import { promises as fs } from "node:fs";
import path from "node:path";

const rootDir = process.cwd();
const publicDir = path.join(rootDir, "public");
const generatedPath = path.join(rootDir, "src", "site", "generated", "content-data.ts");
const baseUrl = "https://floriva.app";

const staticRoutes = [
  { loc: "/", lastmod: null },
  { loc: "/compare", lastmod: null },
  { loc: "/compare/alternatives", lastmod: null },
  { loc: "/compare/versus", lastmod: null },
  { loc: "/compare/pricing", lastmod: null },
  { loc: "/free", lastmod: null },
  { loc: "/resources", lastmod: null },
  { loc: "/resources/best", lastmod: null },
  { loc: "/resources/condition-guides", lastmod: null },
  { loc: "/resources/guides", lastmod: null },
  { loc: "/resources/health", lastmod: null },
  { loc: "/resources/hormone-guides", lastmod: null },
  { loc: "/resources/life-stage-guides", lastmod: null },
  { loc: "/resources/privacy-in-practice", lastmod: null },
  { loc: "/resources/symptom-guides", lastmod: null },
  { loc: "/resources/wellness-guides", lastmod: null },
  { loc: "/app-guides", lastmod: null },
  { loc: "/period-tracker-privacy", lastmod: null },
  { loc: "/tools/quiz", lastmod: null },
  { loc: "/get", lastmod: null },
  { loc: "/privacy", lastmod: null },
  { loc: "/privacy-features", lastmod: null },
  { loc: "/support", lastmod: null },
  { loc: "/terms", lastmod: null },
];

async function loadContentEntries() {
  const source = await fs.readFile(generatedPath, "utf8");
  const arrayStart = source.indexOf("[");
  const arrayEnd = source.lastIndexOf("]");

  if (arrayStart === -1 || arrayEnd === -1) {
    throw new Error("Could not locate content entries array in generated file.");
  }

  const json = source.slice(arrayStart, arrayEnd + 1);
  return JSON.parse(json);
}

function isoDate(value) {
  if (!value || typeof value !== "string") {
    return null;
  }
  const trimmed = value.trim();
  if (/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) {
    return trimmed;
  }
  const parsed = new Date(trimmed);
  if (Number.isNaN(parsed.getTime())) {
    return null;
  }
  return parsed.toISOString().slice(0, 10);
}

function latest(dates) {
  const valid = dates.filter(Boolean).sort();
  return valid.length > 0 ? valid[valid.length - 1] : null;
}

function toSitemapUrl({ loc, lastmod }) {
  const lastmodTag = lastmod ? `<lastmod>${lastmod}</lastmod>` : "";
  return `<url><loc>${baseUrl}${loc}</loc>${lastmodTag}</url>`;
}

const contentEntries = await loadContentEntries();

const contentRoutes = contentEntries.map((entry) => ({
  loc: entry.routePath,
  lastmod: isoDate(entry.updatedAt) ?? isoDate(entry.publishedAt),
}));

const hubLastmodByPath = new Map();
for (const entry of contentEntries) {
  const lastmod = isoDate(entry.updatedAt) ?? isoDate(entry.publishedAt);
  if (!lastmod) continue;
  const segments = entry.routePath.split("/").filter(Boolean);
  for (let i = 1; i < segments.length; i += 1) {
    const hubPath = `/${segments.slice(0, i).join("/")}`;
    const prior = hubLastmodByPath.get(hubPath) ?? null;
    hubLastmodByPath.set(hubPath, latest([prior, lastmod]));
  }
}

const siteLastmod = latest(contentRoutes.map((r) => r.lastmod));
const resolvedStaticRoutes = staticRoutes.map((route) => {
  if (route.loc === "/") {
    return { ...route, lastmod: siteLastmod };
  }
  const lastmod = hubLastmodByPath.get(route.loc) ?? null;
  return { ...route, lastmod };
});

// Noindexed routes stay live and linked but are withdrawn from the index request.
// See src/site/index-policy.ts for scope and rationale.
const noindexRoutePaths = new Set(
  JSON.parse(await fs.readFile(path.join(rootDir, "src", "site", "index-policy.json"), "utf8"))
    .noindexRoutePaths,
);
const allRoutes = [...resolvedStaticRoutes, ...contentRoutes].filter(
  (route) => !noindexRoutePaths.has(route.loc),
);
const sitemap = `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${allRoutes
  .map(toSitemapUrl)
  .join("\n")}\n</urlset>\n`;

await fs.mkdir(publicDir, { recursive: true });
await fs.writeFile(path.join(publicDir, "sitemap.xml"), sitemap, "utf8");
