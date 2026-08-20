import { execFileSync } from "node:child_process";
import { existsSync, mkdirSync, readdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { allEntries } from "../src/site/content";
import { collectionDefinitions } from "../src/site/config";
import { buildDocumentTitle, resolvePageMeta } from "../src/site/page-meta";
import { siteSeo } from "../src/site/seo";

const rootDir = path.resolve(__dirname, "..");

const forbiddenPublicArtifactPatterns = [
  /PostHog/i,
  /Sentry/i,
  /FLORIVA_/i,
  /VITE_/i,
  /process\.env/i,
  /import\.meta\.env/i,
  /\.env/i,
  /\bDSN\b/i,
  /API[_-]?KEY/i,
  /\bTOKEN\b/i,
  /\bPASSWORD\b/i,
  /\bSECRET\b/i,
  /PRIVATE[_-]?KEY/i,
  /QA credential/i,
  /prod test/i,
  /internal strategy/i,
  /unpublished roadmap/i,
  /private ops/i,
  /floriva-lead-magnet/i,
  /operational note/i,
  /popupStorageKeys/i,
  /docs\/research/i,
  /content\//i,
  /\.mdx/i,
  /campaignName/i,
  /crosswalk/i,
  /X hourly/i,
  /functions\//i,
  /workers\//i,
  /scripts\//i,
];

const mojibakeMarkers = [
  "Ã¢â‚¬â€",
  "Ã¢â‚¬â€œ",
  "Ã¢â‚¬â„¢",
  "Ã¢â‚¬Å“",
  "Ã¢â‚¬ï¿½",
  "Ã‚",
  "â€”",
  "â€“",
  "â€™",
  "â€œ",
  "â€�",
];

const visibleMojibakeMarkers = ["â€”", "â€“", "â€™", "â€œ", "â€", "Ã", "Â"];

// These tests drive the real scripts/prerender-html.mjs against the real dist/,
// and the fixture template below deliberately omits everything Vite injects —
// including <script type="module">. Every route the prerender touches during a
// test run is therefore rewritten as inert, non-hydrating static HTML.
//
// Restoring dist/index.html alone was not enough: the "keeps every sitemap route
// linked" case prerenders the whole sitemap, so a test run left a built dist with
// 558 script-less routes and a healthy-looking home page until the next real
// build. Snapshot and restore every route the prerender can write.
//
// (That case used to request "all routes" by passing PRERENDER_ROUTES="", which
// prerender-html.mjs read as falsy and silently expanded to the full sitemap.
// Empty is now a hard error there; this file asks for all routes by leaving the
// variable unset, via allRoutesEnv().)
function allRoutesEnv(): NodeJS.ProcessEnv {
  const env = { ...process.env };
  delete env.PRERENDER_ROUTES;
  return env;
}

function snapshotRouteOutputs(): Map<string, string | null> {
  const snapshot = new Map<string, string | null>();

  // Must be the prerender route set, not the sitemap: noindexed routes are still
  // written to dist/, so snapshotting only sitemap routes would leave their
  // fixture output behind after the restore.
  for (const route of loadPrerenderRoutes()) {
    const file = generatedRoutePath(route);
    snapshot.set(file, existsSync(file) ? readFileSync(file, "utf8") : null);
  }

  return snapshot;
}

// Restore every file, then report. A single throw mid-loop — EPERM/EBUSY is
// realistic on Windows when a preview server or virus scanner holds a handle —
// would otherwise abandon every remaining route as script-less fixture output,
// and, throwing from a `finally`, would replace the real test failure with a
// filesystem error.
function restoreRouteOutputs(snapshot: Map<string, string | null>) {
  const failures: string[] = [];

  for (const [file, previousContents] of snapshot) {
    try {
      const exists = existsSync(file);

      if (previousContents === null) {
        if (exists) {
          rmSync(file, { force: true, recursive: true });
        }
        continue;
      }

      if (exists && readFileSync(file, "utf8") === previousContents) {
        continue;
      }

      mkdirSync(path.dirname(file), { recursive: true });
      writeFileSync(file, previousContents, "utf8");
    } catch (error) {
      failures.push(`${file}: ${(error as Error).message}`);
    }
  }

  return failures;
}

function withFixtureIndex(run: () => void) {
  const distIndexPath = path.join(rootDir, "dist", "index.html");
  const snapshot = snapshotRouteOutputs();

  mkdirSync(path.join(rootDir, "dist"), { recursive: true });
  writeFileSync(
    distIndexPath,
    '<!doctype html><html lang="en"><head><title>Floriva</title></head><body><div id="root"></div></body></html>',
    "utf8",
  );

  let ranCleanly = false;
  try {
    run();
    ranCleanly = true;
  } finally {
    const failures = restoreRouteOutputs(snapshot);

    // Only surface restore failures when the test itself passed, so a genuine
    // assertion failure is never masked by cleanup noise.
    if (failures.length > 0 && ranCleanly) {
      throw new Error(
        `dist/ was left with prerender fixture output — ${failures.length} file(s) could not be restored:\n` +
          failures.slice(0, 10).join("\n"),
      );
    }
  }
}

function listFilesRecursive(directory: string): string[] {
  const files: string[] = [];
  for (const entry of readdirSync(directory, { withFileTypes: true })) {
    const fullPath = path.join(directory, entry.name);
    if (entry.isDirectory()) {
      files.push(...listFilesRecursive(fullPath));
    } else {
      files.push(fullPath);
    }
  }
  return files;
}

function loadSitemapRoutes(): string[] {
  const sitemap = readFileSync(path.join(rootDir, "public", "sitemap.xml"), "utf8");
  return [...sitemap.matchAll(/<loc>https:\/\/floriva\.app([^<]*)<\/loc>/g)].map(
    (match) => match[1] || "/",
  );
}

function loadNoindexRoutes(): string[] {
  const policy = readFileSync(path.join(rootDir, "src", "site", "index-policy.json"), "utf8");
  return JSON.parse(policy).noindexRoutePaths as string[];
}

// Mirrors loadPrerenderRoutes() in scripts/prerender-html.mjs. Noindexed routes
// leave the sitemap but stay live, linked, and prerendered — so link-resolution
// checks must still know about them or every inbound link to one reads as broken.
function loadPrerenderRoutes(): string[] {
  return [...new Set([...loadSitemapRoutes(), ...loadNoindexRoutes()])];
}

// Mirrors writeRoute() in scripts/prerender-html.mjs: content routes are written
// extensionless, everything else gets an index.html. NOTE these two consult
// different generated files — this reads content-index.ts (via allEntries),
// prerender-html.mjs reads content-data.ts. If those ever disagree about which
// routes are content routes, the snapshot would capture dist/x/index.html while
// the prerender writes dist/x, and fixture output would survive the restore.
// The "content route classification agrees" test below is what keeps them honest.
function generatedRoutePath(route: string): string {
  if (route === "/") {
    return path.join(rootDir, "dist", "index.html");
  }

  const relativeSegments = route.slice(1).split("/");
  return allEntries.some((entry) => entry.routePath === route)
    ? path.join(rootDir, "dist", ...relativeSegments)
    : path.join(rootDir, "dist", ...relativeSegments, "index.html");
}

function normalizeInternalHref(href: string): string {
  const pathname = href.split(/[?#]/, 1)[0].replace(/\/+$/, "");
  return pathname || "/";
}

describe("generated content surfaces", () => {
  it("generates llms.txt sections for every non-empty content collection", () => {
    execFileSync("node", ["scripts/build-llms-txt.mjs"], { cwd: rootDir, stdio: "pipe" });
    const llms = readFileSync(path.join(rootDir, "public", "llms.txt"), "utf8");
    const nonEmptyCollections = Object.values(collectionDefinitions)
      .filter((definition) => allEntries.some((entry) => entry.collection === definition.key))
      .map((definition) => definition.label);

    for (const label of nonEmptyCollections) {
      expect(llms).toContain(`## ${label}`);
    }
  });

  it("does not emit common mojibake markers in llms.txt", () => {
    execFileSync("node", ["scripts/build-llms-txt.mjs"], { cwd: rootDir, stdio: "pipe" });
    const llms = readFileSync(path.join(rootDir, "public", "llms.txt"), "utf8");
    const foundMarkers = mojibakeMarkers.filter((marker) => llms.includes(marker));

    expect(foundMarkers).toEqual([]);
  });

  it("keeps llms.txt compact with bounded representative links", () => {
    execFileSync("node", ["scripts/build-llms-txt.mjs"], { cwd: rootDir, stdio: "pipe" });
    const llms = readFileSync(path.join(rootDir, "public", "llms.txt"), "utf8");
    const collectionLabels = Object.values(collectionDefinitions)
      .filter((definition) => allEntries.some((entry) => entry.collection === definition.key))
      .map((definition) => definition.label);

    expect(Buffer.byteLength(llms, "utf8")).toBeLessThanOrEqual(25 * 1024);
    expect(llms).toContain("https://floriva.app/sitemap.xml");

    for (const label of collectionLabels) {
      const start = llms.indexOf(`## ${label}`);
      const remaining = llms.slice(start + `## ${label}`.length);
      const nextHeading = remaining.search(/\n## /);
      const sectionBody = nextHeading === -1 ? remaining : remaining.slice(0, nextHeading);
      const links = sectionBody.match(/^- \[[^\]]+]\(https:\/\/floriva\.app\/[^)]+\)/gm) ?? [];

      expect(start).toBeGreaterThanOrEqual(0);
      expect(links.length).toBeGreaterThan(0);
      expect(links.length).toBeLessThanOrEqual(3);
    }
  });

  it("keeps generated public artifacts free of internal implementation terms", () => {
    const checkedFiles = [
      path.join("src", "site", "generated", "public-knowledge.json"),
      path.join("public", "public-knowledge.json"),
      path.join("public", "llms.txt"),
    ];

    const findings = checkedFiles.flatMap((file) => {
      const source = readFileSync(path.join(rootDir, file), "utf8");
      return forbiddenPublicArtifactPatterns
        .filter((pattern) => pattern.test(source))
        .map((pattern) => `${file}: ${pattern.source}`);
    });

    expect(findings).toEqual([]);
  });

  it("keeps the prerendered JSON-LD in step with the edge/SPA builder", async () => {
    // Production strips the prerendered JSON-LD and re-emits buildPageJsonLd()'s
    // output, so drift means preview and every verify-* script validate a
    // document Google never receives. These two builders silently diverged once
    // already (inline publisher vs @id reference); this is the gate for it.
    const { buildPageJsonLd } = await import("@/site/structured-data");
    const { resolvePageMeta } = await import("@/site/page-meta");

    const routes = ["/", "/get", "/compare/alternatives/flo-app-alternative"];

    for (const route of routes) {
      const file = generatedRoutePath(route);
      if (!existsSync(file)) continue;

      const html = readFileSync(file, "utf8");
      const prerendered = [
        ...html.matchAll(/<script type="application\/ld\+json"[^>]*>([\s\S]*?)<\/script>/g),
      ].flatMap((match) => {
        const parsed = JSON.parse(match[1].replaceAll("\\u003c", "<"));
        return Array.isArray(parsed) ? parsed : [parsed];
      });

      const expected = buildPageJsonLd(resolvePageMeta(route));

      expect(
        prerendered.map((block) => block["@type"]).sort(),
        `${route} JSON-LD @type set differs from the shared builder`,
      ).toEqual(expected.map((block) => block["@type"]).sort());

      // Every @id reference must resolve inside the same document.
      const ids = new Set(prerendered.map((block) => block["@id"]).filter(Boolean));
      const dangling = prerendered.flatMap((block) =>
        Object.entries(block)
          .filter(
            ([, value]) =>
              value &&
              typeof value === "object" &&
              !Array.isArray(value) &&
              Object.keys(value as object).length === 1 &&
              "@id" in (value as object),
          )
          .map(([key, value]) => `${route} ${block["@type"]}.${key} -> ${(value as { "@id": string })["@id"]}`)
          .filter((entry) => !ids.has(entry.split(" -> ")[1])),
      );

      expect(dangling).toEqual([]);
    }
  });

  it("gives every Functions-excluded asset an explicit www redirect", () => {
    // Paths in _routes.json "exclude" bypass functions/_middleware.ts, so they never
    // get its single-hop www->apex redirect and would serve 200 on both hosts.
    const excluded = JSON.parse(
      readFileSync(path.join(rootDir, "public", "_routes.json"), "utf8"),
    ).exclude as string[];

    // Parse real rules instead of substring-matching the file. A substring test
    // passes on a commented-out rule, a www->www self-redirect, a 302, or a path
    // that only appears as some other rule's destination.
    const rules = readFileSync(path.join(rootDir, "public", "_redirects"), "utf8")
      .split(/\r?\n/)
      .map((line) => line.trim())
      .filter((line) => line && !line.startsWith("#"))
      .map((line) => line.split(/\s+/))
      .filter((parts) => parts.length >= 2)
      .map(([from, to, status]) => ({ from, to, status: status ?? "302" }));

    const broken = excluded.filter((pathname) => {
      const rule = rules.find((candidate) => candidate.from === `https://www.floriva.app${pathname}`);
      return (
        !rule || rule.to !== `https://floriva.app${pathname}` || rule.status !== "301"
      );
    });

    expect(broken).toEqual([]);
  });

  it("keeps the noindex tier out of the sitemap but still live and prerendered", () => {
    const noindex = loadNoindexRoutes();
    const sitemapRoutes = new Set(loadSitemapRoutes());
    const prerenderRoutes = new Set(loadPrerenderRoutes());

    expect(noindex.length).toBeGreaterThan(0);

    for (const route of noindex) {
      // Withdrawn from the index request...
      expect(sitemapRoutes.has(route)).toBe(false);
      // ...but still a real, prerendered page.
      expect(prerenderRoutes.has(route)).toBe(true);
      expect(existsSync(generatedRoutePath(route))).toBe(true);
    }
  });

  it("serves noindex in prerendered HTML for the tier and only for the tier", () => {
    // Runs the prerenderer rather than reading whatever is left in dist/. Without
    // this, reverting prerender-html.mjs to a hardcoded "index, follow" would
    // still pass against a stale build, and a fresh clone with no dist/ would
    // pass vacuously.
    withFixtureIndex(() => {
      execFileSync("node", ["scripts/prerender-html.mjs"], {
        cwd: rootDir,
        env: allRoutesEnv(),
        stdio: "pipe",
      });

      const noindex = new Set(loadNoindexRoutes());
      const routes = loadPrerenderRoutes();
      const mismatches: string[] = [];

      for (const route of routes) {
        const html = readFileSync(generatedRoutePath(route), "utf8");
        const matches = [
          ...html.matchAll(/<meta\s+name=["']robots["']\s+content=["']([^"']*)["']/gi),
        ];

        // Exactly one robots meta, or the directive is ambiguous.
        expect(matches, `${route} should carry exactly one robots meta`).toHaveLength(1);

        const robots = matches[0][1];
        const expected = noindex.has(route) ? "noindex, follow" : "index, follow";
        if (robots !== expected) {
          mismatches.push(`${route}: robots="${robots}" expected="${expected}"`);
        }
      }

      expect(mismatches).toEqual([]);
      // Guards against the whole assertion going vacuous on an emptied policy.
      expect(routes.length).toBe(470);
      expect(noindex.size).toBeGreaterThan(0);
    });
    // Drives a full 470-route prerender, well past the 5s default.
  }, 120_000);

  it("serves the public knowledge artifact from public/ so AI crawlers get 200", () => {
    // The build-time copy under src/site/generated is not served by Cloudflare Pages.
    // Without the public/ copy, /public-knowledge.json 404s for OAI-SearchBot and PerplexityBot.
    const generated = readFileSync(
      path.join(rootDir, "src", "site", "generated", "public-knowledge.json"),
      "utf8",
    );
    const served = readFileSync(path.join(rootDir, "public", "public-knowledge.json"), "utf8");

    expect(served).toEqual(generated);
    expect(() => JSON.parse(served)).not.toThrow();

    // Equality alone is self-fulfilling: `pretest` regenerates both from the same
    // string, so deleting the public/ write would still pass while the committed
    // copy silently rots. Assert the emitter itself still writes both paths.
    const emitter = readFileSync(path.join(rootDir, "scripts", "build-public-knowledge.mjs"), "utf8");
    expect(emitter).toMatch(/publicOutputPath/);
    expect(emitter).toMatch(/"public",\s*"public-knowledge\.json"/);
    expect(emitter).toMatch(/writeFile\(\s*publicOutputPath/);
  });

  it("makes the public knowledge artifact discoverable by AI crawlers, not by Google Search", () => {
    const sitemap = readFileSync(path.join(rootDir, "public", "sitemap.xml"), "utf8");
    expect(sitemap).not.toContain("public-knowledge.json");

    // Discoverable: nothing else on the site links to it, so llms.txt is the
    // only route by which a crawler learns it exists.
    const llms = readFileSync(path.join(rootDir, "public", "llms.txt"), "utf8");
    expect(llms).toContain("/public-knowledge.json");

    // Scoped to Googlebot only. A blanket `noindex` would tell OAI-SearchBot and
    // PerplexityBot - the intended readers - to ignore it.
    const headers = readFileSync(path.join(rootDir, "public", "_headers"), "utf8");
    const block = headers
      .split(/\n(?=\S)/)
      .find((entry) => entry.trimStart().startsWith("/public-knowledge.json"));
    expect(block).toBeDefined();
    expect(block).toContain("X-Robots-Tag: googlebot: noindex");
  });

  it("keeps noindexed routes out of the llms.txt discovery surface", () => {
    const llms = readFileSync(path.join(rootDir, "public", "llms.txt"), "utf8");
    const leaked = loadNoindexRoutes().filter((route) => llms.includes(`${route})`));
    expect(leaked).toEqual([]);
  });

  it("keeps generated public artifacts free of visible mojibake", () => {
    const checkedFiles = [
      path.join("src", "site", "generated", "public-knowledge.json"),
      path.join("public", "public-knowledge.json"),
      path.join("public", "llms.txt"),
    ];

    const findings = checkedFiles.flatMap((file) => {
      const source = readFileSync(path.join(rootDir, file), "utf8");
      return visibleMojibakeMarkers
        .filter((marker) => source.includes(marker))
        .map((marker) => `${file}: ${marker}`);
    });

    expect(findings).toEqual([]);
  });

  /* Two X-campaign guards lived here and have been removed. Both read a
     `social/` tree of generated campaign payloads that this repository no
     longer carries. One asserted that post source references stayed on public
     routes; the other scanned the same tree for operational identifiers. With
     the directory gone the first throws on a missing path and the second passes
     over an empty file list, which is the worse outcome of the two: a guard
     reporting green while checking nothing. The identifiers they watched for
     are now caught at their origin instead, since Postiz integration ids are
     read from the environment rather than committed. */

  it("loads lead magnet PDF boilerplate from the public knowledge artifact", () => {
    const output = execFileSync(
      "python",
      [
        "-c",
        [
          "import importlib.util, json, pathlib, sys",
          "sys.dont_write_bytecode = True",
          "root = pathlib.Path.cwd()",
          "spec = importlib.util.spec_from_file_location('pdfgen', root / 'scripts' / 'generate-lead-magnet-pdfs.py')",
          "module = importlib.util.module_from_spec(spec)",
          "spec.loader.exec_module(module)",
          "artifact = json.loads((root / 'src' / 'site' / 'generated' / 'public-knowledge.json').read_text(encoding='utf-8'))",
          "assert module.load_pdf_boilerplate() == artifact['pdfBoilerplate']",
          "print(module.load_pdf_boilerplate()['aboutHeading'])",
        ].join("; "),
      ],
      { cwd: rootDir, encoding: "utf8" },
    );

    expect(output.trim()).toBe("About Floriva");
  });

  it("does not keep mojibake markers in SEO-critical source surfaces", () => {
    const checkedFiles = [
      "index.html",
      path.join("src", "site", "seo.ts"),
      path.join("src", "site", "page-meta.ts"),
      path.join("src", "site", "config.ts"),
      path.join("src", "site", "generated", "content-data.ts"),
    ];
    const findings = checkedFiles.flatMap((file) => {
      const source = readFileSync(path.join(rootDir, file), "utf8");
      return mojibakeMarkers
        .filter((marker) => source.includes(marker))
        .map((marker) => `${file}: ${marker}`);
    });

    expect(findings).toEqual([]);
  });

  it("validates object-held internal href values used by navigation menus", () => {
    const source = readFileSync(path.join(rootDir, "scripts", "check-links.mjs"), "utf8");

    expect(source).toContain(String.raw`\bhref:\s*["'](\/[^"']*)["']`);
  });

  it("classifies content routes identically in content-index and content-data", () => {
    // generatedRoutePath() (content-index, via allEntries) and writeRoute() in
    // prerender-html.mjs (content-data) independently decide extensionless vs
    // index.html. Drift is silent and would defeat the dist/ snapshot-restore,
    // so assert the two sources agree rather than assuming they do.
    const contentData = readFileSync(
      path.join(rootDir, "src", "site", "generated", "content-data.ts"),
      "utf8",
    );
    // content-data.ts is generated as JSON-shaped object literals, so keys are
    // quoted. Anchoring on the quote keeps this from silently matching nothing.
    const dataRoutePaths = new Set(
      [...contentData.matchAll(/"routePath":\s*"([^"]+)"/g)].map((match) => match[1]!),
    );
    const indexRoutePaths = new Set(allEntries.map((entry) => entry.routePath));

    expect(dataRoutePaths.size).toBe(446);
    expect([...indexRoutePaths].filter((route) => !dataRoutePaths.has(route))).toEqual([]);
    expect([...dataRoutePaths].filter((route) => !indexRoutePaths.has(route))).toEqual([]);
  });

  it("prerenders representative routes with body content inside the root", () => {
    withFixtureIndex(() => {
      execFileSync("node", ["scripts/prerender-html.mjs"], {
        cwd: rootDir,
        env: {
          ...process.env,
          PRERENDER_ROUTES: "/resources/guides/is-flo-safe-to-use",
        },
        stdio: "pipe",
      });

      const html = readFileSync(
        path.join(rootDir, "dist", "resources", "guides", "is-flo-safe-to-use"),
        "utf8",
      );

      expect(html).toContain('<div id="root">');
      expect(html).toContain("<h1>");
      expect(html).toContain("Is Flo Safe");
      expect(html).toContain("<a ");
      expect(html).toContain("/resources/guides/period-tracker-safe-after-roe-v-wade");
      expect(html).not.toContain("data-seo-jsonld-prerender");
    });
  });

  it("preserves semantic Markdown in prerendered raw HTML without adding another h1", () => {
    withFixtureIndex(() => {
      execFileSync("node", ["scripts/prerender-html.mjs"], {
        cwd: rootDir,
        env: {
          ...process.env,
          PRERENDER_ROUTES: [
            "/free/abnormal-bleeding-log",
            "/free/cycle-syncing-food-workout-planner",
            "/free/delete-period-data-guide",
            "/free/reproductive-visit-prep-kit",
            "/resources/guides/eu-vs-us-period-data-privacy",
            "/support",
          ].join(","),
        },
        stdio: "pipe",
      });

      const bleedingLog = readFileSync(generatedRoutePath("/free/abnormal-bleeding-log"), "utf8");
      const planner = readFileSync(generatedRoutePath("/free/cycle-syncing-food-workout-planner"), "utf8");
      const deleteGuide = readFileSync(generatedRoutePath("/free/delete-period-data-guide"), "utf8");
      const visitPrep = readFileSync(generatedRoutePath("/free/reproductive-visit-prep-kit"), "utf8");
      const privacyGuide = readFileSync(generatedRoutePath("/resources/guides/eu-vs-us-period-data-privacy"), "utf8");
      const support = readFileSync(generatedRoutePath("/support"), "utf8");

      expect(bleedingLog).toContain(
        '<h2 id="fast-summary-for-your-visit">Fast summary for your visit</h2>',
      );
      expect(bleedingLog).toContain("<table>");
      expect(bleedingLog).toContain("<thead>");
      expect(bleedingLog).toContain("<th>Field</th>");
      expect(bleedingLog).toContain("<ul");
      expect(bleedingLog).toContain('<a href="/resources/privacy-in-practice/protect-your-symptom-and-condition-data">');
      expect(planner).toContain("<strong>Well-supported:</strong>");
      expect(deleteGuide).toContain("<ol");
      expect(deleteGuide).toContain("<code>2026-07-01-app-name-deletion-request.txt</code>");
      expect(visitPrep).toContain('href="#general-visit-prep"');
      expect(visitPrep).toContain('<h2 id="general-visit-prep">');
      expect(privacyGuide).toContain("<em>after</em>");
      expect(bleedingLog.match(/<h1>/g)).toHaveLength(1);
      expect(bleedingLog).toContain("Published by Floriva");
      expect(bleedingLog).toContain('href="/support#editorial-method"');
      expect(support).toContain('id="editorial-method"');
      expect(support).toContain("How we check our guides");
      expect(bleedingLog).toContain(
        '"publishingPrinciples":"https://floriva.app/support#editorial-method"',
      );
    });
  });

  it("prerenders the homepage with crawlable funnel links", () => {
    withFixtureIndex(() => {
      execFileSync("node", ["scripts/prerender-html.mjs"], {
        cwd: rootDir,
        env: {
          ...process.env,
          PRERENDER_ROUTES: "/",
        },
        stdio: "pipe",
      });

      const html = readFileSync(path.join(rootDir, "dist", "index.html"), "utf8");

      expect(html).toContain("/compare");
      expect(html).toContain("/resources");
      expect(html).toContain("/period-tracker-privacy");
      expect(html).not.toContain('href="/"');
    });
  });

  it("prerenders pillar hubs with crawlable attached content links", () => {
    withFixtureIndex(() => {
      execFileSync("node", ["scripts/prerender-html.mjs"], {
        cwd: rootDir,
        env: {
          ...process.env,
          PRERENDER_ROUTES: "/resources/health",
        },
        stdio: "pipe",
      });

      const html = readFileSync(path.join(rootDir, "dist", "resources", "health", "index.html"), "utf8");

      expect(html).toContain("Health tracking resources");
      expect(html).toContain("/resources/symptom-guides/");
      expect(html).toContain("/resources/condition-guides/");
      expect(html).not.toContain(siteSeo.homeTitle);
    });
  });

  it("keeps every sitemap route linked in raw HTML and every raw internal link resolvable", () => {
    withFixtureIndex(() => {
      execFileSync("node", ["scripts/prerender-html.mjs"], {
        cwd: rootDir,
        // Unset, not empty: this case wants every sitemap route. An empty
        // PRERENDER_ROUTES is now a hard error rather than a silent "all".
        env: allRoutesEnv(),
        stdio: "pipe",
      });

      const routes = loadPrerenderRoutes();
      expect(routes).toHaveLength(470);
      // The live route inventory is unchanged; only the index request shrank.
      expect(loadSitemapRoutes()).toHaveLength(470 - loadNoindexRoutes().length);
      const routeSet = new Set(routes.map(normalizeInternalHref));
      const inboundCounts = new Map(routes.map((route) => [normalizeInternalHref(route), 0]));
      const unresolved: string[] = [];

      for (const route of routes) {
        const normalizedRoute = normalizeInternalHref(route);
        const html = readFileSync(generatedRoutePath(route), "utf8");
        const hrefs = [...html.matchAll(/<a\b[^>]*\bhref="(\/[^"]*)"/g)].map((match) =>
          normalizeInternalHref(match[1]),
        );

        for (const href of new Set(hrefs)) {
          if (!routeSet.has(href)) {
            unresolved.push(`${route} -> ${href}`);
            continue;
          }
          if (href === normalizedRoute) {
            continue;
          }
          inboundCounts.set(href, (inboundCounts.get(href) ?? 0) + 1);
        }
      }

      const orphans = [...inboundCounts.entries()]
        .filter(([route, inbound]) => route !== "/" && inbound === 0)
        .map(([route]) => route);

      expect(unresolved).toEqual([]);
      expect(orphans).toEqual([]);
    });
  }, 15_000);

  it("keeps the two perimenopause pages on distinct search intents", () => {
    const featureGuide = allEntries.find(
      (entry) => entry.routePath === "/resources/best/best-period-tracker-perimenopause",
    );
    const rankedComparison = allEntries.find(
      (entry) => entry.routePath === "/resources/best/best-period-tracker-for-perimenopause",
    );

    expect(featureGuide?.title).toBe("What a Perimenopause Tracker Should Do");
    expect(featureGuide?.category).toBe("Period Tracker Features");
    expect(featureGuide?.answers[0]?.question).toBe(
      "What features should a perimenopause tracker have?",
    );
    expect(rankedComparison?.title).toContain("Best Period Tracker Apps");
    expect(rankedComparison?.answers[0]?.question).toContain("best period tracker");
    expect(featureGuide?.title).not.toBe(rankedComparison?.title);
  });

  it("resolves representative Open Graph images to existing public image assets", () => {
    execFileSync("node", ["scripts/generate-og-images.mjs"], { cwd: rootDir, stdio: "pipe" });

    const missingOgImages = [
      "/",
      "/resources/guides/is-flo-safe-to-use",
      "/compare/versus/euki-vs-drip-privacy-trackers",
    ]
      .map((pathname) => new URL(resolvePageMeta(pathname).ogImage).pathname)
      .filter((ogPath) => !existsSync(path.join(rootDir, "public", ogPath)));

    expect(missingOgImages).toEqual([]);
  });

  it("uses a crawler-friendly raster image for the default Open Graph surface", () => {
    const homeOgPath = new URL(resolvePageMeta("/").ogImage).pathname;

    expect(homeOgPath).toBe("/og/default.png");
    expect(existsSync(path.join(rootDir, "public", homeOgPath))).toBe(true);
  });

  it("keeps the generated entry chunk from preloading the full content corpus", () => {
    const html = readFileSync(path.join(rootDir, "dist", "index.html"), "utf8");

    expect(html).not.toContain("modulepreload");
    expect(html).not.toMatch(/content-[^"']+\.js/);
  });

  it("keeps generated SEO titles and descriptions within SERP-oriented limits", () => {
    const overlongTitles = allEntries
      .map((entry) => [entry.routePath, buildDocumentTitle(entry.seoTitle)] as const)
      .filter(([, title]) => title.length > 60);
    const overlongDescriptions = allEntries
      .map((entry) => [entry.routePath, entry.metaDescription] as const)
      .filter(([, description]) => description.length > 160);

    expect(overlongTitles).toEqual([]);
    expect(overlongDescriptions).toEqual([]);
  });

  it("keeps generated SEO descriptions from ending mid-sentence", () => {
    const incompleteDescriptions = allEntries
      .map((entry) => [entry.routePath, entry.metaDescription] as const)
      .filter(([, description]) => !/[.!?)]$/.test(description));

    expect(incompleteDescriptions).toEqual([]);
  });

  it("preserves full content titles and descriptions for on-page rendering", () => {
    const adenomyosis = allEntries.find(
      (entry) => entry.routePath === "/resources/wellness-guides/adenomyosis-diet-food-guide",
    );

    expect(adenomyosis?.title).toBe("Adenomyosis Diet: Foods That Help and Foods That Make It Worse");
    expect(adenomyosis?.seoTitle.length).toBeLessThanOrEqual(60);
    expect(adenomyosis?.description).not.toContain("...");
  });

  it("keeps Floriva first on comparison and listicle winner surfaces", () => {
    const comparisonLikeEntries = allEntries.filter((entry) =>
      ["comparisons", "listicles"].includes(entry.collection),
    );
    const toolOrderViolations = comparisonLikeEntries
      .filter((entry) => entry.tools.some((tool) => tool.name.toLowerCase() === "floriva"))
      .filter((entry) => entry.tools[0]?.name.toLowerCase() !== "floriva")
      .map((entry) => entry.routePath);
    const tableOrderViolations = comparisonLikeEntries
      .filter((entry) => {
        if (!entry.tableData || typeof entry.tableData !== "object" || Array.isArray(entry.tableData)) {
          return false;
        }
        const table = entry.tableData as { columns?: unknown; rows?: unknown };
        const columns = table.columns;
        if (Array.isArray(columns) && columns.includes("Floriva") && columns[1] !== "Floriva") {
          return true;
        }
        const rows = table.rows;
        if (!Array.isArray(rows) || !rows.some((row) => Array.isArray(row) && row[0] === "Floriva")) {
          return false;
        }
        const firstRow = rows[0];
        return !Array.isArray(firstRow) || firstRow[0] !== "Floriva";
      })
      .map((entry) => entry.routePath);
    const prosConsOrderViolations = comparisonLikeEntries
      .filter((entry) => entry.proscons.some((item) => item.subject.toLowerCase().includes("floriva")))
      .filter((entry) => !entry.proscons[0]?.subject.toLowerCase().includes("floriva"))
      .map((entry) => entry.routePath);
    const competitorBestHeadingViolations = comparisonLikeEntries
      .filter((entry) =>
        /^#{2,3}\s+(?:Clue|Flo|Natural Cycles|Kindara|Read Your Body|MyFlo|Cycles|FitrWoman|Wild\.AI|Apple Health)\b.*\bBest\b/im.test(
          entry.body,
        ),
      )
      .map((entry) => entry.routePath);

    expect(toolOrderViolations).toEqual([]);
    expect(tableOrderViolations).toEqual([]);
    expect(prosConsOrderViolations).toEqual([]);
    expect(competitorBestHeadingViolations).toEqual([]);
  });
});
