import { mkdtemp as mkdtempRaw, mkdir, readFile, realpath, stat, writeFile } from "node:fs/promises";
import { createHash } from "node:crypto";
import { existsSync, readFileSync, realpathSync } from "node:fs";
import { execFileSync } from "node:child_process";
import { tmpdir } from "node:os";
import path from "node:path";
import { pathToFileURL } from "node:url";
import { describe, expect, it } from "vitest";

import {
  cloudflareDeploymentListPath,
  composeCachedStaticWithCompiledFunctions,
  formatPreparationCompletion,
  normalizeHtmlSemantics,
  normalizeCanonicalRoutes,
  prepareRollbackBundle,
  selectProviderCurrentDeployment,
  selectSingleCloudflareProject,
  validatePortableRelativePath,
  validateRollbackDescriptor,
} from "./prepare-pages-rollback.mjs";

const sha = "a".repeat(64);
// macOS os.tmpdir() resolves under /var -> /private/var (a symlink). The rollback
// script deliberately rejects symlinked path ancestors, so canonicalize temp roots.
async function mkdtemp(dir: string): Promise<string> {
  return realpath(await mkdtempRaw(dir));
}
function canonicalJson(value: unknown): string {
  if (Array.isArray(value)) return `[${value.map(canonicalJson).join(",")}]`;
  if (value && typeof value === "object") return `{${Object.keys(value).sort().map((key) => `${JSON.stringify(key)}:${canonicalJson((value as Record<string, unknown>)[key])}`).join(",")}}`;
  return JSON.stringify(value);
}
const fileHash = (filePath: string) => createHash("sha256").update(readFileSync(filePath)).digest("hex");
// Resolve the local toolchain to hash as build provenance. The Windows/CI path
// is kept byte-for-byte (where.exe + .exe + the APPDATA pnpm install); other
// platforms resolve the same tools via `which` so the suite runs on macOS/Linux.
const isWindows = process.platform === "win32";
const resolveTool = (name: string) => {
  const finder = isWindows ? "where.exe" : "which";
  const query = isWindows ? `${name}.exe` : name;
  return execFileSync(finder, [query], { encoding: "utf8" }).split(/\r?\n/).map((line) => line.trim()).find(Boolean) as string;
};
const pnpmCli = isWindows
  ? path.join(process.env.APPDATA ?? "", "npm", "node_modules", "pnpm", "bin", "pnpm.cjs")
  : realpathSync(resolveTool("pnpm"));
const wranglerCli = path.join(process.cwd(), "node_modules", "wrangler", "bin", "wrangler.js");
const gitExecutable = resolveTool("git");
const tarExecutable = resolveTool("tar");
const gitVersion = execFileSync(gitExecutable, ["--version"], { encoding: "utf8" }).trim();
const tarVersion = execFileSync(tarExecutable, ["--version"], { encoding: "utf8" }).split(/\r?\n/)[0];
const toolchain = {
  nodeVersion: process.version,
  pnpmVersion: "10.33.0",
  tarVersion,
  wranglerVersion: "4.84.1",
  gitVersion,
  nodeExecutableSha256: fileHash(process.execPath),
  pnpmCliSha256: fileHash(pnpmCli),
  wranglerCliSha256: fileHash(wranglerCli),
  gitExecutableSha256: fileHash(gitExecutable),
  tarExecutableSha256: fileHash(tarExecutable),
};
function commandRecord(purpose: string, commandPath: string, args: string[], stdout: string, exitStatus: number | string = 0) {
  const commandBase = { commandPath, args, cwd: process.cwd() };
  return {
    purpose, ...commandBase, exitStatus, stdout, stderr: "",
    invocationSha256: createHash("sha256").update(canonicalJson(commandBase)).digest("hex"),
    outputSha256: createHash("sha256").update(canonicalJson({ stdout, stderr: "" })).digest("hex"),
  };
}
// Every live route, sitemap-listed or not. The descriptor binds route proof rows
// to route material bidirectionally, so the rollback bundle must cover all of
// them - the noindex tier included.
const fixtureRouteCount = 470;
const fixtureRoutes = ["/", ...Array.from({ length: fixtureRouteCount - 1 }, (_, i) => `/route-${i + 2}`)];
// Wrangler access logs are asynchronous transport output. The canonical proof is
// the fetch-result exercise ledger, so even a delayed final 404 log cannot make
// a complete exercise look incomplete (or an incomplete exercise look complete).
const fixturePreviewOutput = "Pages preview ready\n";
const commandProvenance = [
  commandRecord("git-archive-prior-commit", gitExecutable, ["archive", "--format=tar", "-o", path.join(process.cwd(), "source.tar"), "1".repeat(40)], ""),
  commandRecord("tar-extract-prior-source", tarExecutable, ["-xf", path.join(process.cwd(), "source.tar"), "-C", process.cwd()], ""),
  commandRecord("pnpm-frozen-install", process.execPath, [pnpmCli, "install", "--frozen-lockfile", "--ignore-scripts"], ""),
  commandRecord("pnpm-build", process.execPath, [pnpmCli, "build"], ""),
  commandRecord("wrangler-pages-functions-build", process.execPath, [wranglerCli, "pages", "functions", "build", "functions", "--outdir", "worker.js"], ""),
  commandRecord("pnpm-version", process.execPath, [pnpmCli, "--version"], "10.33.0\n"),
  commandRecord("wrangler-version", process.execPath, [wranglerCli, "--version"], "4.84.1\n"),
  commandRecord("tar-version", tarExecutable, ["--version"], `${tarVersion}\n`),
  commandRecord("git-version", gitExecutable, ["--version"], `${gitVersion}\n`),
  commandRecord("pages-preview-after-full-route-exercise", process.execPath, [wranglerCli, "pages", "dev", path.join(process.cwd(), "fixture")], fixturePreviewOutput, "running-at-proof-completion"),
];
const sourceHashes = { source: sha, lock: "c".repeat(64), tool: "d".repeat(64), commandOutput: "e".repeat(64) };

// The rollback descriptor pins the exact release runtime: validateRollbackDescriptor
// requires the *running* Node to be v22.17.1 (see prepare-pages-rollback.mjs:540,572),
// so the full-bundle integration tests only pass on the pinned release runner. Gate
// them on that precondition instead of failing on newer local/dev Node versions.
const PINNED_NODE_VERSION = "v22.17.1";
const isPinnedNodeRuntime = process.version === PINNED_NODE_VERSION;
// The pinned standalone verifier lives in the gitignored .floriva-private evidence
// tree, which is absent from ordinary checkouts (the suite already excludes it).
const pinnedVerifierPath = path.join(process.cwd(), ".floriva-private", "seo-ai-seo-recovery", "2026-07-22", "rollback-v7", "verifier", "verify-rollback.mjs");
const hasPinnedVerifier = existsSync(pinnedVerifierPath);

function fixtureFetcher(url: string, options: { drift?: boolean } = {}) {
  const parsed = new URL(url);
  const isMissing = parsed.pathname.includes("__floriva_missing_");
  const isProd = parsed.origin === "https://prod.example";
  const body = parsed.pathname === "/assets/app.1234abcd.js"
    ? "console.log('ok')"
    : parsed.pathname === "/index.html"
      ? "<html><body>home</body></html>"
      : options.drift && isProd
        ? "production"
        : options.drift
          ? "deployment"
          : `<html><body>${parsed.pathname}</body></html>`;
  return { status: isMissing ? 404 : 200, body };
}

async function fixtureMaterial(root: string, routeCount = fixtureRouteCount) {
  const deploy = path.join(root, "deploy");
  await mkdir(path.join(deploy, "assets"), { recursive: true });
  await writeFile(path.join(deploy, "index.html"), "<html><body>home</body></html>");
  for (let index = 2; index <= routeCount; index += 1) await writeFile(path.join(deploy, `route-${index}`), `<html>${index}</html>`);
  await writeFile(path.join(deploy, "assets", "app.1234abcd.js"), "console.log('ok')");
  await writeFile(path.join(deploy, "_worker.js"), "export default { fetch() {} }");
  await writeFile(path.join(deploy, "_routes.json"), '{"version":1,"include":["/*"],"exclude":[]}');
  await writeFile(path.join(deploy, "_worker-config.json"), '{"compatibility_date":"2026-04-21"}');
  const verifier = path.join(root, "verifier.mjs");
  await writeFile(verifier, "export const pinned = true;\n");
  return { deploy, verifier };
}

function providerFixture(overrides: Record<string, unknown> = {}) {
  const current = {
    id: "dep-current",
    url: "https://dep-current.example.pages.dev",
    environment: "production",
    commit: "1".repeat(40),
    createdAt: "2026-07-22T12:00:00.000Z",
    ...overrides,
  };
  return {
    current,
    provider: {
      async getProject() {
        return { latestDeploymentId: current.id, rawSha256: sha };
      },
      async listDeployments() {
        return {
          deployments: [
            current,
            { ...current, id: "dep-historical", url: "https://old.example.pages.dev" },
          ],
          rawSha256: "b".repeat(64),
        };
      },
    },
  };
}

describe("selectProviderCurrentDeployment", () => {
  it("normalizes Cloudflare email protection back to the original semantic address", () => {
    const plain = '<p>Email privacy@flo.health now.</p>';
    const protectedHtml = '<p>Email <a href="/cdn-cgi/l/email-protection" class="__cf_email__" data-cfemail="7b0b09120d1a18023b1d171455131e1a170f13">[email&#160;protected]</a> now.</p><script data-cfasync="false" src="/cdn-cgi/scripts/5c5dd728/cloudflare-static/email-decode.min.js"></script>';
    expect(normalizeHtmlSemantics(protectedHtml)).toBe(normalizeHtmlSemantics(plain));
  });

  it("uses Cloudflare Pages' supported deployment page size", () => {
    expect(cloudflareDeploymentListPath("account", "project")).toContain("per_page=25");
  });

  it("binds only the provider-marked current row even when a historical commit is identical", () => {
    const { current } = providerFixture();
    expect(
      selectProviderCurrentDeployment(
        [current, { ...current, id: "same-commit", url: "https://same.example.pages.dev" }],
        current.id,
      ).id,
    ).toBe(current.id);
  });

  it("rejects zero or multiple rows matching the provider current id", () => {
    const { current } = providerFixture();
    expect(() => selectProviderCurrentDeployment([], current.id)).toThrow(/exactly one provider-current/);
    expect(() => selectProviderCurrentDeployment([current, current], current.id)).toThrow(
      /exactly one provider-current/,
    );
  });

  it("rejects duplicate Cloudflare project matches and noncanonical sitemap routes", () => {
    expect(() => selectSingleCloudflareProject([], "floriva-web")).toThrow(/exactly one/);
    expect(() => selectSingleCloudflareProject([{}, {}], "floriva-web")).toThrow(/found 2/);
    expect(() => normalizeCanonicalRoutes(["/a", "/a"], "https://floriva.app", 2)).toThrow(/duplicate/);
    expect(() => normalizeCanonicalRoutes(["https://other.example/a"], "https://floriva.app", 1)).toThrow(/noncanonical/);
  });

  it("rejects traversal, ADS, device names, and Windows aliases", () => {
    for (const invalid of ["../escape", "C:/escape", "file.txt:stream", "CON", "CONIN$", "CONOUT$", "CLOCK$", "COM¹", "COM²", "COM³", "LPT¹", "LPT²", "LPT³", "name. "]) {
      expect(() => validatePortableRelativePath(invalid)).toThrow();
    }
  });
});

describe("prepareRollbackBundle", () => {
  it("combines retained exact static bytes with reconstructed precompiled Functions", async () => {
    const root = await mkdtemp(path.join(tmpdir(), "floriva-composed-"));
    const built = await fixtureMaterial(path.join(root, "built"));
    const cached = path.join(root, "cached-dist");
    await mkdir(path.join(cached, "assets"), { recursive: true });
    await writeFile(path.join(cached, "index.html"), "exact deployed html");
    await writeFile(path.join(cached, "assets", "app.livehash.js"), "exact deployed js");
    const output = path.join(root, "combined");
    composeCachedStaticWithCompiledFunctions(cached, built.deploy, output);
    expect(await readFile(path.join(output, "index.html"), "utf8")).toBe("exact deployed html");
    expect(await readFile(path.join(output, "_worker.js"), "utf8")).toContain("export default");
    expect(await readFile(path.join(output, "_routes.json"), "utf8")).toContain('"version":1');
  });

  it.skipIf(!isPinnedNodeRuntime).each(["downloaded", "reconstructed"])(
    "writes a complete, hash-valid %s rollback descriptor by same-volume rename",
    async (acquisitionMethod) => {
      const root = await mkdtemp(path.join(tmpdir(), "floriva-rollback-"));
      const { deploy, verifier } = await fixtureMaterial(root);
      const descriptorPath = path.join(root, "rollback", "descriptor.json");
      const bindingPath = path.join(root, "prior-deployment.json");
      const { provider } = providerFixture();
      const routes = fixtureRoutes;
      const result = await prepareRollbackBundle({
        provider,
        acquire: async () => ({ deployDirectory: deploy, acquisitionMethod }),
        descriptorPath,
        bindingPath,
        verifierPath: verifier,
        origin: "https://prod.example",
        routes,
        wranglerVersion: "4.84.1",
        sourceHashes,
        toolchain,
        commandProvenance,
        previewOrigin: "http://127.0.0.1:8788",
        fetcher: async (url: string) => fixtureFetcher(url),
      });

      expect(result.descriptor.verification.routes.checked).toBe(fixtureRouteCount);
      expect(result.descriptor.verification.notFound.status).toBe(404);
      expect(result.descriptor.verification.notFound.previewStatus).toBe(404);
      expect(result.descriptor.verification.preview.exercise.routes).toHaveLength(fixtureRouteCount);
      expect(result.descriptor.commandProvenance.at(-1).stdout).not.toContain("__floriva_missing_");
      expect(result.descriptor.commandProvenance.at(-1).previewExerciseSha256).toBe(
        result.descriptor.verification.preview.exercise.sha256,
      );
      expect(result.descriptor.verification.publicFiles.complete).toBe(true);
      expect(result.descriptor.fileManifest.some((entry: { path: string }) => entry.path === "deploy/_worker.js")).toBe(true);
      expect(result.descriptor.fileManifest.every((entry: { sha256: string }) => entry.sha256.length === 64)).toBe(true);
      expect(validateRollbackDescriptor(result.descriptor, path.dirname(descriptorPath))).toEqual({ valid: true, errors: [] });
      for (const mutate of [
        (value: any) => { value.commandProvenance.splice(3, 1); },
        (value: any) => { value.commandProvenance[0].args[0] = "status"; },
        (value: any) => { value.commandProvenance.at(-1).args = ["fake-preview"]; },
        (value: any) => { value.verification.routes.rows.pop(); },
        (value: any) => { value.verification.routes.rows[0].previewSemanticHash = "f".repeat(64); },
        (value: any) => { value.verification.preview.exercise.routes.pop(); },
        (value: any) => { value.verification.preview.exercise.notFound.status = 200; },
        (value: any) => { value.commandProvenance.at(-1).previewExerciseSha256 = "f".repeat(64); },
      ]) {
        const mutated = structuredClone(result.descriptor);
        mutate(mutated);
        expect(validateRollbackDescriptor(mutated, path.dirname(descriptorPath)).valid).toBe(false);
      }
      const commandTamper = structuredClone(result.descriptor);
      commandTamper.commandProvenance[0].stdout = "tampered";
      expect(validateRollbackDescriptor(commandTamper, path.dirname(descriptorPath)).errors.join(" ")).toMatch(/output hash drift/);
      const executableTamper = structuredClone(result.descriptor);
      executableTamper.toolchain.gitExecutableSha256 = "a".repeat(64);
      expect(validateRollbackDescriptor(executableTamper, path.dirname(descriptorPath)).errors.join(" ")).toMatch(/Git version\/executable hash/);
      const classificationTamper = structuredClone(result.descriptor);
      classificationTamper.fileManifest[0].classification = "public";
      expect(validateRollbackDescriptor(classificationTamper, path.dirname(descriptorPath)).errors.join(" ")).toMatch(/classification drift|exactly match/);
      if (acquisitionMethod === "downloaded") {
        await writeFile(path.join(path.dirname(descriptorPath), "deploy", "unmanifested.txt"), "not in manifest");
        expect(validateRollbackDescriptor(result.descriptor, path.dirname(descriptorPath)).errors.join(" ")).toMatch(/does not exactly match/);
      }
      expect(JSON.parse(await readFile(bindingPath, "utf8"))).not.toHaveProperty("privateLocator");
      expect(JSON.parse(await readFile(bindingPath, "utf8"))).toMatchObject({
        schemaVersion: 1,
        role: "prechange-current-production",
        projectName: "floriva-web",
        productionOrigin: "https://prod.example",
        deploymentId: "dep-current",
      });
      expect(Object.keys(JSON.parse(await readFile(bindingPath, "utf8")))).toEqual([
        "schemaVersion",
        "role",
        "projectName",
        "productionOrigin",
        "deploymentId",
        "deploymentUrl",
        "deploymentCommit",
        "deployedAt",
        "capturedAt",
        "bindingMethod",
        "discoveryCommand",
        "discoveryStdoutSha256",
        "immutableUrlProofSha256",
        "productionOriginProofSha256",
      ]);
      expect((await stat(descriptorPath)).isFile()).toBe(true);
      await expect(stat(`${descriptorPath}.tmp`)).rejects.toThrow();
    },
    /* Each variant materialises a full fixture deployment and hashes every file
       in it. The downloaded variant measured 59.8s against the previous 60s
       budget on a developer machine, so the margin was under a second and the
       reconstructed variant already exceeded it. Use the same 180s budget as
       the global default rather than a limit that fails on any slower host. */
    180_000,
  );

  it.skipIf(!isPinnedNodeRuntime)("prefers a matching live release marker over legacy route comparison", async () => {
    const root = await mkdtemp(path.join(tmpdir(), "floriva-marker-"));
    const { deploy, verifier } = await fixtureMaterial(root, 1);
    const { current, provider } = providerFixture();
    const result = await prepareRollbackBundle({
      provider,
      acquire: async () => ({ deployDirectory: deploy, acquisitionMethod: "reconstructed" }),
      descriptorPath: path.join(root, "rollback", "descriptor.json"),
      bindingPath: path.join(root, "binding.json"),
      verifierPath: verifier,
      origin: "https://prod.example",
      routes: ["/"],
      expectedRouteCount: 1,
      wranglerVersion: "4.84.1",
      toolchain,
      commandProvenance,
      previewOrigin: "http://127.0.0.1:8788",
      releaseMarker: { deploymentId: current.id, commit: current.commit },
      sourceHashes: { source: sha, lock: sha, tool: sha, commandOutput: sha },
      fetcher: async (url: string) => fixtureFetcher(url),
    });
    expect(result.descriptor.bindingMethod).toBe("release-marker");
  });

  it("leaves no descriptor when legacy route semantics drift or material is incomplete", async () => {
    const root = await mkdtemp(path.join(tmpdir(), "floriva-blocked-"));
    const { deploy, verifier } = await fixtureMaterial(root, 1);
    const { provider } = providerFixture();
    const descriptorPath = path.join(root, "rollback", "descriptor.json");
    await expect(
      prepareRollbackBundle({
        provider,
        acquire: async () => ({ deployDirectory: deploy, acquisitionMethod: "reconstructed" }),
        descriptorPath,
        bindingPath: path.join(root, "binding.json"),
        verifierPath: verifier,
        origin: "https://prod.example",
        routes: ["/"],
        expectedRouteCount: 1,
          wranglerVersion: "4.84.1",
        sourceHashes: { source: sha, lock: sha, tool: sha, commandOutput: sha },
        toolchain,
        commandProvenance,
        previewOrigin: "http://127.0.0.1:8788",
        fetcher: async (url: string) => fixtureFetcher(url, { drift: true }),
      }),
    ).rejects.toThrow(/semantic drift/);
    await expect(stat(descriptorPath)).rejects.toThrow();
  });

  it("preserves pre-existing evidence instead of deleting it on a refused run", async () => {
    const root = await mkdtemp(path.join(tmpdir(), "floriva-preserve-"));
    const { deploy, verifier } = await fixtureMaterial(root, 1);
    const bindingPath = path.join(root, "binding.json");
    await writeFile(bindingPath, "existing-binding");
    const { provider } = providerFixture();
    await expect(prepareRollbackBundle({
      provider,
      acquire: async () => ({ deployDirectory: deploy, acquisitionMethod: "downloaded" }),
      descriptorPath: path.join(root, "rollback", "descriptor.json"),
      bindingPath,
      verifierPath: verifier,
      origin: "https://prod.example",
      routes: ["/"],
      expectedRouteCount: 1,
      wranglerVersion: "4.84.1",
      sourceHashes: { source: sha, lock: sha, tool: sha, commandOutput: sha },
      toolchain,
      commandProvenance,
      previewOrigin: "http://127.0.0.1:8788",
      fetcher: async (url: string) => fixtureFetcher(url),
    })).rejects.toThrow(/binding already exists/);
    expect(await readFile(bindingPath, "utf8")).toBe("existing-binding");
  });
});

describe("runtime declarations", () => {
  it("pins the required package manager and Node engine", async () => {
    const pkg = JSON.parse(await readFile(path.join(process.cwd(), "package.json"), "utf8"));
    expect(pkg.packageManager).toBe("pnpm@10.33.0");
    expect(pkg.engines?.node).toBe(">=22.17.1 <23");
  });

  it.skipIf(!hasPinnedVerifier)("formats default preparer completion from the flat deployment binding", async () => {
    const result = { binding: { deploymentId: "dep-123", deploymentCommit: "abc123", bindingMethod: "provider-current-exact-id" } };
    expect(JSON.parse(formatPreparationCompletion(result))).toEqual({ ok: true, deploymentId: "dep-123", commit: "abc123", bindingMethod: "provider-current-exact-id" });
    const pinnedPath = path.join(process.cwd(), ".floriva-private", "seo-ai-seo-recovery", "2026-07-22", "rollback-v7", "verifier", "verify-rollback.mjs");
    const pinned = await import(`${pathToFileURL(pinnedPath).href}?completion-regression=${Date.now()}`);
    expect(JSON.parse(pinned.formatPreparationCompletion(result))).toEqual({ ok: true, deploymentId: "dep-123", commit: "abc123", bindingMethod: "provider-current-exact-id" });
  });
});
