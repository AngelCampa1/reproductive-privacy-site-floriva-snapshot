#!/usr/bin/env node

import { createHash, randomUUID } from "node:crypto";
import {
  cpSync,
  existsSync,
  lstatSync,
  mkdirSync,
  readFileSync,
  realpathSync,
  readdirSync,
  renameSync,
  rmSync,
  statSync,
  writeFileSync,
} from "node:fs";
import { mkdtemp } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { spawn, spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import net from "node:net";

// Every LIVE route, which is no longer the same as every sitemap route: the
// index-policy tier is prerendered and served but withdrawn from the sitemap.
// The descriptor binds route proof rows to route material bidirectionally, so
// the rollback tool must verify all 470 - not just the 444 the sitemap lists.
const TOTAL_LIVE_ROUTES = 470;
const NOINDEX_ROUTE_PATHS = JSON.parse(
  readFileSync(path.join(process.cwd(), "src", "site", "index-policy.json"), "utf8"),
).noindexRoutePaths;

const HASH_PATTERN = /^[a-f0-9]{64}$/;
const FULL_COMMIT_PATTERN = /^[a-f0-9]{40}$/;
const REQUIRED_INTERNAL_FILES = ["_worker.js", "_routes.json", "_worker-config.json"];
const NON_ADDRESSABLE_CONFIG_FILES = [...REQUIRED_INTERNAL_FILES, "_headers", "_redirects"];
const WINDOWS_DEVICE_PATTERN = /^(?:con|prn|aux|nul|conin\$|conout\$|clock\$|com(?:[1-9¹²³])|lpt(?:[1-9¹²³]))(?:\..*)?$/i;

function sha256(value) {
  return createHash("sha256").update(value).digest("hex");
}

function sha256File(filePath) {
  return sha256(readFileSync(filePath));
}

function canonicalJson(value) {
  if (Array.isArray(value)) return `[${value.map(canonicalJson).join(",")}]`;
  if (value && typeof value === "object") {
    return `{${Object.keys(value)
      .sort()
      .map((key) => `${JSON.stringify(key)}:${canonicalJson(value[key])}`)
      .join(",")}}`;
  }
  return JSON.stringify(value);
}

function commandOutputHash(stdout, stderr) {
  return sha256(canonicalJson({ stdout: stdout ?? "", stderr: stderr ?? "" }));
}

function run(command, args, options = {}) {
  const commandPath = path.resolve(command);
  const cwd = path.resolve(options.cwd ?? process.cwd());
  const result = spawnSync(command, args, {
    cwd,
    env: options.env ?? process.env,
    encoding: "utf8",
    shell: false,
    maxBuffer: 1024 * 1024 * 50,
  });
  if (result.status !== 0) {
    const safeMessage = `${command} ${args.join(" ")} failed with exit ${result.status}`;
    throw new Error(`${safeMessage}\n${result.stderr || result.stdout}`);
  }
  return {
    commandPath,
    args: [...args],
    cwd,
    exitStatus: result.status,
    stdout: result.stdout,
    stderr: result.stderr,
    invocationSha256: sha256(canonicalJson({ commandPath, args, cwd })),
    outputSha256: commandOutputHash(result.stdout, result.stderr),
  };
}

function resolveExecutable(command) {
  if (path.isAbsolute(command) && existsSync(command)) return realpathSync.native(command);
  const result = spawnSync("where.exe", [command], { encoding: "utf8", shell: false });
  const candidate = result.status === 0 ? result.stdout.split(/\r?\n/).find((line) => line.trim())?.trim() : null;
  if (!candidate || !existsSync(candidate)) throw new Error(`executable is unavailable: ${command}`);
  return realpathSync.native(candidate);
}

export function validatePortableRelativePath(value) {
  if (typeof value !== "string" || value.length === 0 || value.includes("\0")) throw new Error("path is required");
  if (/^[a-z]:/i.test(value) || value.startsWith("/") || value.startsWith("\\\\") || value.startsWith("//")) {
    throw new Error(`absolute path is forbidden: ${value}`);
  }
  const normalized = value.replaceAll("\\", "/");
  if (normalized !== path.posix.normalize(normalized) || normalized === ".." || normalized.startsWith("../")) {
    throw new Error(`path traversal is forbidden: ${value}`);
  }
  for (const segment of normalized.split("/")) {
    if (!segment || segment === "." || segment === "..") throw new Error(`invalid path segment: ${value}`);
    if (segment.includes(":")) throw new Error(`NTFS alternate data stream is forbidden: ${value}`);
    if (/[ .]$/.test(segment)) throw new Error(`Windows trailing dot/space alias is forbidden: ${value}`);
    if (WINDOWS_DEVICE_PATTERN.test(segment)) throw new Error(`Windows device name is forbidden: ${value}`);
  }
  return normalized;
}

function assertContained(root, candidate, label = "path") {
  const resolvedRoot = path.resolve(root);
  const resolved = path.resolve(candidate);
  if (resolved === resolvedRoot || !resolved.toLowerCase().startsWith(`${resolvedRoot}${path.sep}`.toLowerCase())) {
    throw new Error(`${label} escapes its allowed root`);
  }
  return resolved;
}

function assertNoFollowComponents(root, relativePath, label = "path") {
  const portable = validatePortableRelativePath(relativePath);
  const rootPath = assertNoFollowExistingAncestors(root, `${label} root`);
  if (!existsSync(rootPath) || lstatSync(rootPath).isSymbolicLink()) throw new Error(`${label} root is missing or reparse-backed`);
  const rootReal = realpathSync.native(rootPath);
  let cursor = rootPath;
  for (const segment of portable.split("/")) {
    cursor = path.join(cursor, segment);
    if (!existsSync(cursor)) throw new Error(`${label} component is missing: ${portable}`);
    const metadata = lstatSync(cursor);
    if (metadata.isSymbolicLink()) throw new Error(`${label} symlink/junction/reparse component is forbidden: ${portable}`);
    const real = realpathSync.native(cursor);
    if (real !== rootReal && !real.toLowerCase().startsWith(`${rootReal}${path.sep}`.toLowerCase())) throw new Error(`${label} reparse traversal is forbidden: ${portable}`);
  }
  return cursor;
}

export function assertNoFollowExistingAncestors(targetPath, label = "path") {
  const absolute = path.resolve(targetPath);
  const parsed = path.parse(absolute);
  let cursor = parsed.root;
  for (const segment of absolute.slice(parsed.root.length).split(path.sep).filter(Boolean)) {
    cursor = path.join(cursor, segment);
    if (!existsSync(cursor)) break;
    const metadata = lstatSync(cursor);
    if (metadata.isSymbolicLink()) throw new Error(`${label} ancestor is a symlink/junction/reparse point: ${cursor}`);
    if (path.resolve(realpathSync.native(cursor)).toLowerCase() !== path.resolve(cursor).toLowerCase()) throw new Error(`${label} ancestor resolves through a reparse point: ${cursor}`);
  }
  return absolute;
}

const REQUIRED_COMMAND_PURPOSES = [
  "git-archive-prior-commit",
  "tar-extract-prior-source",
  "pnpm-frozen-install",
  "pnpm-build",
  "wrangler-pages-functions-build",
  "pnpm-version",
  "wrangler-version",
  "tar-version",
  "git-version",
  "pages-preview-after-full-route-exercise",
];

function hasContiguousArgs(args, expected) {
  if (!Array.isArray(args)) return false;
  return expected.every((value, index) => args[index] === value);
}

function walkFiles(root, relative = "", seenAliases = new Set()) {
  const directory = path.join(root, relative);
  const entries = readdirSync(directory, { withFileTypes: true }).sort((a, b) => a.name.localeCompare(b.name));
  const files = [];
  for (const entry of entries) {
    const child = path.posix.join(relative.replaceAll("\\", "/"), entry.name);
    const portable = validatePortableRelativePath(child);
    const alias = portable.toLowerCase();
    if (seenAliases.has(alias)) throw new Error(`case-insensitive path collision: ${portable}`);
    seenAliases.add(alias);
    const absolute = assertContained(root, path.join(root, ...portable.split("/")), "walk path");
    const metadata = lstatSync(absolute);
    if (entry.isSymbolicLink() || metadata.isSymbolicLink()) throw new Error(`symlink or reparse point is forbidden: ${portable}`);
    if (entry.isDirectory()) files.push(...walkFiles(root, portable, seenAliases));
    else if (entry.isFile()) files.push(portable);
    else throw new Error(`non-regular file is forbidden: ${portable}`);
  }
  return files;
}

function classifyFile(relativePath) {
  const normalized = relativePath.replaceAll("\\", "/");
  if (NON_ADDRESSABLE_CONFIG_FILES.includes(normalized) || normalized.startsWith("_worker.js/")) {
    return "non-addressable";
  }
  if (normalized === "index.html" || normalized.endsWith("/index.html") || path.posix.extname(normalized) === "") return "route-public";
  if (normalized.startsWith("assets/") || /(?:^|[.-])[a-f0-9]{8,}(?:[.-]|$)/i.test(path.basename(normalized))) {
    return "immutable-public";
  }
  return "public";
}

function buildManifest(directory, prefix = "deploy") {
  return walkFiles(directory).map((relativePath) => {
    const absolutePath = path.join(directory, relativePath);
    const bytes = readFileSync(absolutePath);
    return {
      path: path.posix.join(prefix, relativePath.replaceAll("\\", "/")),
      sha256: sha256(bytes),
      byteLength: bytes.byteLength,
      classification: classifyFile(relativePath),
    };
  });
}

function routeMaterialPathToRoute(relativePath) {
  const normalized = relativePath.replaceAll("\\", "/");
  if (normalized === "index.html") return "/";
  if (normalized.endsWith("/index.html")) return `/${normalized.slice(0, -"/index.html".length)}`;
  return `/${normalized}`;
}

function decodeCloudflareEmail(encoded) {
  if (!/^[a-f0-9]+$/i.test(encoded) || encoded.length < 4 || encoded.length % 2 !== 0) return null;
  const key = Number.parseInt(encoded.slice(0, 2), 16);
  let decoded = "";
  for (let index = 2; index < encoded.length; index += 2) {
    decoded += String.fromCharCode(Number.parseInt(encoded.slice(index, index + 2), 16) ^ key);
  }
  return decoded;
}

export function normalizeHtmlSemantics(value) {
  return String(value)
    .replace(/<a\b[^>]*\bdata-cfemail=("([a-f0-9]+)"|'([a-f0-9]+)')[^>]*>[\s\S]*?<\/a>/gi, (match, _quoted, doubleQuoted, singleQuoted) =>
      decodeCloudflareEmail(doubleQuoted ?? singleQuoted) ?? match,
    )
    .replace(/<script\b[^>]*\bsrc=("[^"]*\/cdn-cgi\/scripts\/[^"/]*\/cloudflare-static\/email-decode\.min\.js"|'[^']*\/cdn-cgi\/scripts\/[^'/]*\/cloudflare-static\/email-decode\.min\.js')[^>]*><\/script>/gi, "")
    .replace(/\s+nonce=("[^"]*"|'[^']*')/gi, "")
    .replace(/\s+/g, " ")
    .replace(/>\s+</g, "><")
    .trim();
}

function responseBytes(response) {
  if (Buffer.isBuffer(response?.body)) return response.body;
  if (typeof response?.body === "string") return Buffer.from(response.body);
  throw new Error("response body must be bytes or text");
}

function assertResponse(response, label) {
  if (!response || typeof response.status !== "number") {
    throw new Error(`${label} returned an invalid response`);
  }
  responseBytes(response);
}

export function normalizeCanonicalRoutes(routes, origin, expectedRouteCount) {
  if (!Array.isArray(routes)) throw new Error("routes must be an array");
  const canonicalOrigin = new URL(origin).origin;
  const seen = new Set();
  const normalized = routes.map((route) => {
    const raw = String(route);
    const parsed = new URL(raw, canonicalOrigin);
    if (parsed.origin !== canonicalOrigin || parsed.search || parsed.hash) throw new Error(`noncanonical sitemap route: ${raw}`);
    if (raw.startsWith("http") && parsed.href !== `${canonicalOrigin}${parsed.pathname}`) throw new Error(`noncanonical sitemap URL: ${raw}`);
    const pathname = parsed.pathname;
    if (!pathname.startsWith("/") || pathname.includes("//")) throw new Error(`noncanonical sitemap path: ${raw}`);
    if (seen.has(pathname)) throw new Error(`duplicate sitemap route: ${pathname}`);
    seen.add(pathname);
    return pathname;
  });
  if (normalized.length !== expectedRouteCount) throw new Error(`expected ${expectedRouteCount} routes; found ${normalized.length}`);
  return normalized;
}

export function selectProviderCurrentDeployment(deployments, providerCurrentId) {
  const matches = deployments.filter((deployment) => deployment.id === providerCurrentId);
  if (matches.length !== 1) {
    throw new Error(`expected exactly one provider-current deployment; found ${matches.length}`);
  }
  const current = matches[0];
  if (String(current.environment).toLowerCase() !== "production") {
    throw new Error("provider-current deployment is not production");
  }
  if (!FULL_COMMIT_PATTERN.test(current.commit ?? "")) {
    throw new Error("provider-current deployment does not identify a full commit");
  }
  if (!current.url || !current.createdAt) {
    throw new Error("provider-current deployment is missing URL or timestamp");
  }
  return current;
}

function ensureCompleteMaterial(deployDirectory) {
  if (!existsSync(deployDirectory) || !statSync(deployDirectory).isDirectory()) {
    throw new Error("deployment material is unavailable");
  }
  for (const relativePath of REQUIRED_INTERNAL_FILES) {
    if (!existsSync(path.join(deployDirectory, relativePath))) {
      throw new Error(`deployment material is incomplete: ${relativePath} is missing`);
    }
  }
  if (!walkFiles(deployDirectory).some((file) => !REQUIRED_INTERNAL_FILES.includes(file))) {
    throw new Error("deployment material contains no static bytes");
  }
}

async function verifyLiveBinding({ current, origin, previewOrigin, routes, expectedRouteCount, releaseMarker, fetcher, deployDirectory }) {
  const canonicalRoutes = normalizeCanonicalRoutes(routes, origin, expectedRouteCount);
  const routeRows = [];
  for (const pathname of canonicalRoutes) {
    const deploymentResponse = await fetcher(new URL(pathname, current.url).href);
    const originResponse = await fetcher(new URL(pathname, origin).href);
    const previewResponse = previewOrigin ? await fetcher(new URL(pathname, previewOrigin).href) : null;
    assertResponse(deploymentResponse, `deployment ${pathname}`);
    assertResponse(originResponse, `origin ${pathname}`);
    if (previewResponse) assertResponse(previewResponse, `rollback preview ${pathname}`);
    if (deploymentResponse.status !== 200 || originResponse.status !== 200 || (previewResponse && previewResponse.status !== 200)) {
      throw new Error(`route status drift at ${pathname}: ${deploymentResponse.status}/${originResponse.status}/${previewResponse?.status ?? "not-run"}`);
    }
    const deploymentSemanticHash = sha256(normalizeHtmlSemantics(responseBytes(deploymentResponse).toString("utf8")));
    const originSemanticHash = sha256(normalizeHtmlSemantics(responseBytes(originResponse).toString("utf8")));
    const previewSemanticHash = previewResponse
      ? sha256(normalizeHtmlSemantics(responseBytes(previewResponse).toString("utf8")))
      : null;
    if (deploymentSemanticHash !== originSemanticHash || (previewSemanticHash && previewSemanticHash !== originSemanticHash)) {
      throw new Error(`semantic drift at ${pathname}`);
    }
    routeRows.push({ path: pathname, status: 200, semanticHash: originSemanticHash, previewSemanticHash });
  }

  const allFiles = walkFiles(deployDirectory);
  const routeMaterialFiles = allFiles.filter((relativePath) => classifyFile(relativePath) === "route-public");
  if (routeMaterialFiles.length !== expectedRouteCount) throw new Error(`expected ${expectedRouteCount} route material files; found ${routeMaterialFiles.length}`);
  const publicFiles = allFiles.filter((relativePath) => ["public", "immutable-public"].includes(classifyFile(relativePath)));
  if (publicFiles.length === 0) throw new Error("public file manifest is empty");
  const publicRows = [];
  for (const relativePath of publicFiles) {
    const urlPath = `/${relativePath.replaceAll("\\", "/")}`;
    const deploymentResponse = await fetcher(new URL(urlPath, current.url).href);
    const originResponse = await fetcher(new URL(urlPath, origin).href);
    assertResponse(deploymentResponse, `deployment ${urlPath}`);
    assertResponse(originResponse, `origin ${urlPath}`);
    const localHash = sha256File(path.join(deployDirectory, relativePath));
    const deploymentHash = sha256(responseBytes(deploymentResponse));
    const originHash = sha256(responseBytes(originResponse));
    if (deploymentResponse.status !== 200 || originResponse.status !== 200 || deploymentHash !== originHash || localHash !== originHash) {
      throw new Error(`public file drift at ${urlPath}`);
    }
    publicRows.push({
      path: urlPath,
      status: 200,
      sha256: originHash,
      byteLength: responseBytes(originResponse).byteLength,
      classification: classifyFile(relativePath),
      provenance: ["rollback-local", "provider-current-deployment", "production-origin"],
    });
  }

  const missingPath = `/__floriva_missing_${randomUUID()}__`;
  const deploymentMissing = await fetcher(new URL(missingPath, current.url).href);
  const originMissing = await fetcher(new URL(missingPath, origin).href);
  const previewMissing = previewOrigin ? await fetcher(new URL(missingPath, previewOrigin).href) : null;
  assertResponse(deploymentMissing, "deployment 404 probe");
  assertResponse(originMissing, "origin 404 probe");
  if (previewMissing) assertResponse(previewMissing, "rollback preview 404 probe");
  if (deploymentMissing.status !== 404 || originMissing.status !== 404 || (previewMissing && previewMissing.status !== 404)) {
    throw new Error(`true 404 check failed: ${deploymentMissing.status}/${originMissing.status}/${previewMissing?.status ?? "not-run"}`);
  }

  const markerMatches =
    releaseMarker?.deploymentId === current.id && releaseMarker?.commit === current.commit;
  const previewExercise = {
    routes: routeRows.map((row) => ({
      path: row.path,
      status: 200,
      semanticHash: row.previewSemanticHash,
    })),
    notFound: {
      pathHash: sha256(missingPath),
      status: previewMissing?.status ?? null,
    },
  };
  return {
    bindingMethod: markerMatches ? "release-marker" : "provider-current-legacy-proof",
    routes: { checked: canonicalRoutes.length, unique: seenRouteCount(routeRows), canonical: true, sha256: sha256(canonicalJson(routeRows)), rows: routeRows },
    publicFiles: { checked: publicRows.length, complete: true, sha256: sha256(canonicalJson(publicRows)), rows: publicRows },
    routeMaterial: {
      checked: routeMaterialFiles.length,
      sha256: sha256(canonicalJson(routeMaterialFiles.map((relativePath) => ({ path: relativePath, sha256: sha256File(path.join(deployDirectory, relativePath)) })))),
    },
    immutableAssets: {
      checked: publicRows.filter((row) => row.classification === "immutable-public").length,
      sha256: sha256(canonicalJson(publicRows.filter((row) => row.classification === "immutable-public"))),
    },
    preview: {
      pagesCompatible: Boolean(previewOrigin),
      originHash: previewOrigin ? sha256(previewOrigin) : null,
      exercise: {
        ...previewExercise,
        sha256: sha256(canonicalJson(previewExercise)),
      },
    },
    notFound: { pathHash: sha256(missingPath), status: 404, previewStatus: previewMissing?.status ?? null },
  };
}

function seenRouteCount(rows) {
  return new Set(rows.map((row) => row.path)).size;
}

function atomicWriteJson(targetPath, value) {
  mkdirSync(path.dirname(targetPath), { recursive: true });
  const temporaryPath = path.join(path.dirname(targetPath), `.${path.basename(targetPath)}.${randomUUID()}.tmp`);
  writeFileSync(temporaryPath, `${JSON.stringify(value, null, 2)}\n`, { flag: "wx" });
  try {
    renameSync(temporaryPath, targetPath);
  } catch (error) {
    rmSync(temporaryPath, { force: true });
    throw error;
  }
}

export function validateRollbackDescriptor(descriptor, descriptorDirectory) {
  const errors = [];
  if (!descriptor || typeof descriptor !== "object") return { valid: false, errors: ["descriptor is required"] };
  if (descriptor.schemaVersion !== 3) errors.push("rollback descriptor schemaVersion must be 3");
  if (!FULL_COMMIT_PATTERN.test(descriptor.priorCommit ?? "")) errors.push("priorCommit must be a full commit");
  if (!descriptor.deployment?.id || !descriptor.deployment?.url || !descriptor.deployment?.createdAt) {
    errors.push("complete deployment identity is required");
  }
  if (!Array.isArray(descriptor.fileManifest) || descriptor.fileManifest.length === 0) {
    errors.push("fileManifest is required");
  } else {
    const aliases = new Set();
    for (const entry of descriptor.fileManifest) {
      try {
        const portable = validatePortableRelativePath(entry.path ?? "");
        const alias = portable.toLowerCase();
        if (aliases.has(alias)) throw new Error(`case-insensitive manifest collision: ${portable}`);
        aliases.add(alias);
        const absolutePath = assertNoFollowComponents(descriptorDirectory, portable, "manifest path");
        if (!existsSync(absolutePath)) errors.push(`manifest file is missing: ${entry.path}`);
        else if (lstatSync(absolutePath).isSymbolicLink()) errors.push(`manifest symlink/reparse is forbidden: ${entry.path}`);
        else if (sha256File(absolutePath) !== entry.sha256) errors.push(`manifest hash drift: ${entry.path}`);
        else if (statSync(absolutePath).size !== entry.byteLength) errors.push(`manifest length drift: ${entry.path}`);
        if (portable.startsWith("deploy/") && classifyFile(portable.slice("deploy/".length)) !== entry.classification) errors.push(`manifest classification drift: ${entry.path}`);
        if (!HASH_PATTERN.test(entry.sha256 ?? "")) errors.push(`invalid manifest hash: ${entry.path}`);
        if (!Number.isSafeInteger(entry.byteLength) || entry.byteLength < 0) errors.push(`invalid manifest length: ${entry.path}`);
        if (!["public", "immutable-public", "route-public", "non-addressable"].includes(entry.classification)) errors.push(`invalid manifest classification: ${entry.path}`);
      } catch (error) {
        errors.push(error.message);
      }
    }
  }
  if (!descriptor.verifierBundle?.path || !HASH_PATTERN.test(descriptor.verifierBundle?.sha256 ?? "")) {
    errors.push("pinned verifier bundle is required");
  } else {
    try {
      const portable = validatePortableRelativePath(descriptor.verifierBundle.path);
      const verifierPath = assertNoFollowComponents(descriptorDirectory, portable, "verifier path");
      if (!existsSync(verifierPath) || lstatSync(verifierPath).isSymbolicLink() || sha256File(verifierPath) !== descriptor.verifierBundle.sha256) errors.push("verifier bundle hash drift");
    } catch (error) {
      errors.push(error.message);
    }
  }
  try {
    const deployDirectory = assertNoFollowComponents(descriptorDirectory, "deploy", "deploy directory");
    const actualManifest = buildManifest(deployDirectory).sort((a, b) => a.path.localeCompare(b.path));
    const expectedManifest = [...(descriptor.fileManifest ?? [])].sort((a, b) => a.path.localeCompare(b.path));
    if (canonicalJson(actualManifest) !== canonicalJson(expectedManifest)) errors.push("deploy tree does not exactly match the file manifest");
  } catch (error) {
    errors.push(error.message);
  }
  const routeRows = descriptor.verification?.routes?.rows;
  if (
    descriptor.verification?.routes?.checked !== descriptor.expectedRouteCount ||
    descriptor.verification?.routes?.unique !== descriptor.expectedRouteCount ||
    descriptor.verification?.routes?.canonical !== true ||
    !Array.isArray(routeRows) || routeRows.length !== descriptor.expectedRouteCount
  ) errors.push("route verification count/uniqueness/canonical drift");
  else {
    const uniqueRoutes = new Set();
    for (const row of routeRows) {
      if (typeof row.path !== "string" || !row.path.startsWith("/") || row.path.includes("?") || row.path.includes("#") || uniqueRoutes.has(row.path) || row.status !== 200 || !HASH_PATTERN.test(row.semanticHash ?? "") || row.previewSemanticHash !== row.semanticHash) errors.push(`invalid route proof row: ${row.path}`);
      uniqueRoutes.add(row.path);
    }
    const manifestRoutes = new Set((descriptor.fileManifest ?? [])
      .filter((entry) => entry.classification === "route-public")
      .map((entry) => routeMaterialPathToRoute(entry.path.replace(/^deploy\//, ""))));
    if (manifestRoutes.size !== uniqueRoutes.size || [...manifestRoutes].some((route) => !uniqueRoutes.has(route))) errors.push("route proof rows are not bidirectionally bound to route material");
    if (sha256(canonicalJson(routeRows)) !== descriptor.verification?.routes?.sha256) errors.push("route proof hash drift");
  }
  const publicRows = descriptor.verification?.publicFiles?.rows;
  if (descriptor.verification?.publicFiles?.complete !== true || descriptor.verification?.publicFiles?.checked < 1 || !Array.isArray(publicRows) || publicRows.length !== descriptor.verification?.publicFiles?.checked) errors.push("complete public-file proof is required");
  else {
    const uniquePublic = new Set();
    for (const row of publicRows) {
      if (typeof row.path !== "string" || !row.path.startsWith("/") || uniquePublic.has(row.path) || row.status !== 200 || !HASH_PATTERN.test(row.sha256 ?? "") || !Number.isSafeInteger(row.byteLength) || row.byteLength < 0) errors.push(`invalid public-file proof row: ${row.path}`);
      uniquePublic.add(row.path);
    }
    const manifestPublic = new Map((descriptor.fileManifest ?? [])
      .filter((entry) => ["public", "immutable-public"].includes(entry.classification))
      .map((entry) => [`/${entry.path.replace(/^deploy\//, "")}`, entry]));
    if (manifestPublic.size !== uniquePublic.size) errors.push("public proof rows do not cover the public manifest");
    for (const row of publicRows) {
      const entry = manifestPublic.get(row.path);
      if (!entry || entry.sha256 !== row.sha256 || entry.byteLength !== row.byteLength || entry.classification !== row.classification) errors.push(`public proof row is not bound to its manifest entry: ${row.path}`);
    }
    if (sha256(canonicalJson(publicRows)) !== descriptor.verification?.publicFiles?.sha256) errors.push("public proof hash drift");
  }
  const manifestClassCounts = Object.fromEntries(["public", "immutable-public", "route-public", "non-addressable"].map((name) => [name, (descriptor.fileManifest ?? []).filter((entry) => entry.classification === name).length]));
  if (descriptor.verification?.publicFiles?.checked !== manifestClassCounts.public + manifestClassCounts["immutable-public"]) errors.push("public-file proof does not cover the complete manifest");
  if (descriptor.verification?.routeMaterial?.checked !== descriptor.expectedRouteCount) errors.push("route material manifest drift");
  if (descriptor.verification?.routeMaterial?.checked !== manifestClassCounts["route-public"]) errors.push("route material proof does not cover the complete manifest");
  if (descriptor.verification?.preview?.pagesCompatible !== true) errors.push("Pages-compatible rollback preview proof is required");
  if (descriptor.verification?.notFound?.status !== 404) errors.push("true 404 verification is required");
  if (descriptor.verification?.notFound?.previewStatus !== 404) errors.push("rollback preview true 404 verification is required");
  const previewExercise = descriptor.verification?.preview?.exercise;
  if (!Array.isArray(previewExercise?.routes) || previewExercise.routes.length !== descriptor.expectedRouteCount) {
    errors.push("complete deterministic preview route exercise is required");
  } else {
    for (const [index, row] of previewExercise.routes.entries()) {
      const routeRow = routeRows?.[index];
      if (
        row.path !== routeRow?.path ||
        row.status !== 200 ||
        !HASH_PATTERN.test(row.semanticHash ?? "") ||
        row.semanticHash !== routeRow?.previewSemanticHash
      ) errors.push(`preview exercise row is not bound to route proof: ${row.path}`);
    }
  }
  if (
    previewExercise?.notFound?.status !== 404 ||
    previewExercise?.notFound?.pathHash !== descriptor.verification?.notFound?.pathHash
  ) errors.push("deterministic preview true-404 exercise is required");
  if (previewExercise) {
    const exercisePayload = { routes: previewExercise.routes, notFound: previewExercise.notFound };
    if (sha256(canonicalJson(exercisePayload)) !== previewExercise.sha256) errors.push("preview exercise hash drift");
  }
  for (const name of ["providerProject", "providerDeployments", "source", "lock", "tool", "commandOutput"] ) {
    if (!HASH_PATTERN.test(descriptor.hashes?.[name] ?? "")) errors.push(`${name} hash is required`);
  }
  for (const name of ["nodeVersion", "pnpmVersion", "tarVersion", "gitVersion", "wranglerVersion"]) {
    if (!descriptor.toolchain?.[name]) errors.push(`${name} provenance is required`);
  }
  if (descriptor.toolchain?.nodeVersion !== "v22.17.1") errors.push("Node runtime must be exactly v22.17.1");
  if (descriptor.toolchain?.pnpmVersion !== "10.33.0") errors.push("pnpm runtime must be exactly 10.33.0");
  if (descriptor.toolchain?.wranglerVersion !== "4.84.1") errors.push("Wrangler runtime must be exactly 4.84.1");
  for (const name of ["nodeExecutableSha256", "pnpmCliSha256", "wranglerCliSha256", "gitExecutableSha256", "tarExecutableSha256"]) {
    if (!HASH_PATTERN.test(descriptor.toolchain?.[name] ?? "")) errors.push(`${name} is required`);
  }
  if (!Array.isArray(descriptor.commandProvenance) || descriptor.commandProvenance.length !== REQUIRED_COMMAND_PURPOSES.length) errors.push("exact complete command provenance is required");
  else {
    for (const [index, record] of descriptor.commandProvenance.entries()) {
      if (!path.isAbsolute(record.commandPath ?? "") || !Array.isArray(record.args) || !path.isAbsolute(record.cwd ?? "") || ![0, "running-at-proof-completion"].includes(record.exitStatus)) errors.push(`command provenance ${index} is incomplete`);
      if (record.invocationSha256 !== sha256(canonicalJson({ commandPath: record.commandPath, args: record.args, cwd: record.cwd }))) errors.push(`command provenance ${index} invocation hash drift`);
      if (record.outputSha256 !== commandOutputHash(record.stdout, record.stderr)) errors.push(`command provenance ${index} output hash drift`);
    }
    if (descriptor.hashes?.commandOutput !== sha256(canonicalJson(descriptor.commandProvenance))) errors.push("commandOutput hash does not bind complete command provenance");
    if (canonicalJson(descriptor.commandProvenance.map((record) => record.purpose)) !== canonicalJson(REQUIRED_COMMAND_PURPOSES)) errors.push("command provenance purpose/order drift");
    const [gitArchive, tarExtract, frozenInstall, build, functionsBuild, , , , , preview] = descriptor.commandProvenance;
    if (!hasContiguousArgs(gitArchive.args, ["archive", "--format=tar", "-o"]) || gitArchive.args.at(-1) !== descriptor.priorCommit) errors.push("git archive command does not bind the exact prior commit");
    if (!hasContiguousArgs(tarExtract.args, ["-xf"]) || !tarExtract.args.includes("-C")) errors.push("tar extract command semantics drift");
    if (canonicalJson(frozenInstall.args.slice(1)) !== canonicalJson(["install", "--frozen-lockfile", "--ignore-scripts"])) errors.push("frozen install command semantics drift");
    if (canonicalJson(build.args.slice(1)) !== canonicalJson(["build"])) errors.push("build command semantics drift");
    if (canonicalJson(functionsBuild.args.slice(1, 6)) !== canonicalJson(["pages", "functions", "build", "functions", "--outdir"])) errors.push("Pages Functions build command semantics drift");
    if (preview.commandPath !== process.execPath || canonicalJson(preview.args.slice(1, 4)) !== canonicalJson(["pages", "dev", preview.args[3]])) errors.push("real Pages preview command semantics drift");
    if (gitArchive.exitStatus !== 0 || tarExtract.exitStatus !== 0 || frozenInstall.exitStatus !== 0 || build.exitStatus !== 0 || functionsBuild.exitStatus !== 0 || preview.exitStatus !== "running-at-proof-completion") errors.push("command exit-status contract drift");
    if (tarExtract.args[1] !== gitArchive.args[3] || frozenInstall.cwd !== tarExtract.args[3] || build.cwd !== frozenInstall.cwd || functionsBuild.cwd !== frozenInstall.cwd) errors.push("archive/extract/install/build working-directory contract drift");
    for (const record of descriptor.commandProvenance.slice(5, 9)) if (record.cwd !== gitArchive.cwd || record.exitStatus !== 0) errors.push(`${record.purpose} working directory or exit status drift`);
    if (preview.cwd !== gitArchive.cwd || !path.isAbsolute(preview.args[3] ?? "")) errors.push("Pages preview working directory/deploy path drift");
    if (preview.previewExerciseSha256 !== previewExercise?.sha256) errors.push("preview command is not bound to the deterministic route exercise");
    const exactPurpose = (purpose) => descriptor.commandProvenance.filter((record) => record.purpose === purpose);
    for (const purpose of ["pnpm-version", "wrangler-version", "tar-version", "git-version", "pages-preview-after-full-route-exercise"]) {
      if (exactPurpose(purpose).length !== 1) errors.push(`exactly one ${purpose} command record is required`);
    }
    try {
      if (process.version !== descriptor.toolchain?.nodeVersion || sha256File(process.execPath) !== descriptor.toolchain?.nodeExecutableSha256) errors.push("Node version/executable hash does not recompute from the runtime");
      const pnpm = exactPurpose("pnpm-version")[0];
      if (!pnpm || pnpm.commandPath !== process.execPath || !existsSync(pnpm.args?.[0]) || sha256File(pnpm.args[0]) !== descriptor.toolchain?.pnpmCliSha256 || pnpm.stdout.trim() !== descriptor.toolchain?.pnpmVersion) errors.push("pnpm version/CLI hash does not recompute from command provenance");
      const wrangler = exactPurpose("wrangler-version")[0];
      if (!wrangler || wrangler.commandPath !== process.execPath || !existsSync(wrangler.args?.[0]) || sha256File(wrangler.args[0]) !== descriptor.toolchain?.wranglerCliSha256 || wrangler.stdout.trim() !== descriptor.toolchain?.wranglerVersion) errors.push("Wrangler version/CLI hash does not recompute from command provenance");
      const tar = exactPurpose("tar-version")[0];
      if (!tar || !existsSync(tar.commandPath) || sha256File(tar.commandPath) !== descriptor.toolchain?.tarExecutableSha256 || tar.stdout.split(/\r?\n/, 1)[0] !== descriptor.toolchain?.tarVersion) errors.push("tar version/executable hash does not recompute from command provenance");
      const git = exactPurpose("git-version")[0];
      if (!git || !existsSync(git.commandPath) || sha256File(git.commandPath) !== descriptor.toolchain?.gitExecutableSha256 || git.stdout.trim() !== descriptor.toolchain?.gitVersion) errors.push("Git version/executable hash does not recompute from command provenance");
    } catch (error) {
      errors.push(`runtime provenance could not be recomputed: ${error.message}`);
    }
    try {
      const sourceInput = descriptor.provenanceInputs?.sourceArchive;
      const lockInput = descriptor.provenanceInputs?.lockfile;
      for (const [label, input, expectedHash] of [["source archive", sourceInput, descriptor.hashes?.source], ["lockfile", lockInput, descriptor.hashes?.lock]]) {
        const inputPath = assertNoFollowComponents(descriptorDirectory, input?.path ?? "", label);
        if (sha256File(inputPath) !== input?.sha256 || input.sha256 !== expectedHash) errors.push(`${label} hash does not independently recompute`);
      }
      if (sha256File(assertNoFollowComponents(descriptorDirectory, descriptor.verifierBundle.path, "tool source")) !== descriptor.hashes?.tool) errors.push("tool source hash does not independently recompute");
    } catch (error) { errors.push(`source/lock/tool provenance could not be recomputed: ${error.message}`); }
  }
  return { valid: errors.length === 0, errors };
}

export async function prepareRollbackBundle(options) {
  const {
    provider,
    acquire,
    descriptorPath,
    bindingPath,
    verifierPath,
    origin,
    routes,
    expectedRouteCount = TOTAL_LIVE_ROUTES,
    wranglerVersion,
    sourceHashes,
    toolchain,
    commandProvenance = [],
    previewCommandRecord = null,
    releaseMarker = null,
    fetcher,
    previewOrigin,
    sourceArchivePath = verifierPath,
    lockfilePath = verifierPath,
    projectName = "floriva-web",
  } = options;
  const finalDirectory = path.dirname(path.resolve(descriptorPath));
  assertNoFollowExistingAncestors(path.dirname(finalDirectory), "rollback publish parent");
  assertNoFollowExistingAncestors(path.dirname(path.resolve(bindingPath)), "binding publish parent");
  assertNoFollowExistingAncestors(verifierPath, "verifier source");
  assertNoFollowExistingAncestors(sourceArchivePath, "source archive provenance");
  assertNoFollowExistingAncestors(lockfilePath, "lockfile provenance");
  if (path.basename(descriptorPath).toLowerCase() !== "descriptor.json") throw new Error("rollback descriptor must be named descriptor.json");
  if (existsSync(finalDirectory)) throw new Error("rollback bundle already exists; refusing to overwrite immutable evidence");
  if (existsSync(bindingPath)) throw new Error("tracked deployment binding already exists; refusing to overwrite immutable evidence");
  const project = await provider.getProject();
  const deploymentList = await provider.listDeployments();
  const current = selectProviderCurrentDeployment(deploymentList.deployments, project.latestDeploymentId);
  const acquired = await acquire(current);
  ensureCompleteMaterial(acquired.deployDirectory);

  const temporaryDirectory = path.join(path.dirname(finalDirectory), `.${path.basename(finalDirectory)}.${randomUUID()}.tmp`);
  const temporaryDescriptorPath = path.join(temporaryDirectory, "descriptor.json");
  const temporaryDeployDirectory = path.join(temporaryDirectory, "deploy");
    const temporaryVerifierPath = path.join(temporaryDirectory, "verifier", "verify-rollback.mjs");
    const temporarySourceArchivePath = path.join(temporaryDirectory, "provenance", "source.tar");
    const temporaryLockfilePath = path.join(temporaryDirectory, "provenance", "pnpm-lock.yaml");
  mkdirSync(temporaryDirectory, { recursive: false });
  let published = false;

  try {
    cpSync(acquired.deployDirectory, temporaryDeployDirectory, { recursive: true, errorOnExist: true });
    mkdirSync(path.dirname(temporaryVerifierPath), { recursive: true });
    cpSync(verifierPath, temporaryVerifierPath, { errorOnExist: true });
    mkdirSync(path.dirname(temporarySourceArchivePath), { recursive: true });
    cpSync(sourceArchivePath, temporarySourceArchivePath, { errorOnExist: true });
    cpSync(lockfilePath, temporaryLockfilePath, { errorOnExist: true });
    const verification = await verifyLiveBinding({
      current,
      origin,
      routes,
      expectedRouteCount,
      releaseMarker,
      fetcher,
      deployDirectory: temporaryDeployDirectory,
      previewOrigin,
    });
    if (previewCommandRecord) await new Promise((resolve) => setTimeout(resolve, 250));
    const completeCommandProvenance = commandProvenance.map((record) => ({ ...record }));
    if (previewCommandRecord) completeCommandProvenance.push(previewCommandRecord());
    const previewRecord = completeCommandProvenance.find((record) => record.purpose === "pages-preview-after-full-route-exercise");
    if (previewRecord) previewRecord.previewExerciseSha256 = verification.preview.exercise.sha256;
    const completeCommandOutputSha256 = sha256(canonicalJson(completeCommandProvenance));
    const fileManifest = buildManifest(temporaryDeployDirectory);
    const descriptor = {
      schemaVersion: 3,
      priorCommit: current.commit,
      deployment: { id: current.id, url: current.url, createdAt: current.createdAt },
      acquisitionMethod: acquired.acquisitionMethod,
      bindingMethod: verification.bindingMethod,
      expectedRouteCount,
      hashes: {
        providerProject: project.rawSha256,
        providerDeployments: deploymentList.rawSha256,
        source: sha256File(temporarySourceArchivePath),
        lock: sha256File(temporaryLockfilePath),
        tool: sha256File(temporaryVerifierPath),
        commandOutput: completeCommandOutputSha256,
      },
      fileManifest,
      verifierBundle: {
        path: "verifier/verify-rollback.mjs",
        sha256: sha256File(temporaryVerifierPath),
        command: ["node", "verifier/verify-rollback.mjs", "--verify-descriptor", "descriptor.json"],
      },
      provenanceInputs: {
        sourceArchive: { path: "provenance/source.tar", sha256: sha256File(temporarySourceArchivePath) },
        lockfile: { path: "provenance/pnpm-lock.yaml", sha256: sha256File(temporaryLockfilePath) },
      },
      wranglerVersion,
      toolchain,
      commandProvenance: completeCommandProvenance,
      verification,
      historicalSameCommitDeploymentIds: deploymentList.deployments
        .filter((deployment) => deployment.commit === current.commit && deployment.id !== current.id)
        .map((deployment) => deployment.id),
      createdAt: new Date().toISOString(),
    };
    writeFileSync(temporaryDescriptorPath, `${JSON.stringify(descriptor, null, 2)}\n`, { flag: "wx" });
    const validation = validateRollbackDescriptor(descriptor, temporaryDirectory);
    if (!validation.valid) throw new Error(`rollback descriptor failed self-validation: ${validation.errors.join("; ")}`);

    const binding = {
      schemaVersion: 1,
      role: "prechange-current-production",
      projectName,
      productionOrigin: origin,
      deploymentId: current.id,
      deploymentUrl: current.url,
      deploymentCommit: current.commit,
      deployedAt: current.createdAt,
      capturedAt: new Date().toISOString(),
      bindingMethod: verification.bindingMethod,
      discoveryCommand: `Cloudflare Pages API current deployment lookup for ${projectName}`,
      discoveryStdoutSha256: sha256(canonicalJson({ providerProjectResponseSha256: project.rawSha256, providerDeploymentsResponseSha256: deploymentList.rawSha256 })),
      immutableUrlProofSha256: verification.immutableAssets.sha256,
      productionOriginProofSha256: verification.routes.sha256,
    };
    renameSync(temporaryDirectory, finalDirectory);
    published = true;
    atomicWriteJson(bindingPath, binding);
    return { descriptor, binding };
  } catch (error) {
    if (existsSync(temporaryDirectory)) rmSync(temporaryDirectory, { recursive: true, force: true });
    if (published && existsSync(finalDirectory)) rmSync(finalDirectory, { recursive: true, force: true });
    throw error;
  }
}

function parseTomlValue(source, key) {
  const match = source.match(new RegExp(`^${key}\\s*=\\s*"([^"]+)"`, "m"));
  return match?.[1] ?? null;
}

async function cloudflareAuthToken() {
  if (process.env.CLOUDFLARE_API_TOKEN) return process.env.CLOUDFLARE_API_TOKEN;
  const configPath = path.join(process.env.APPDATA ?? "", "xdg.config", ".wrangler", "config", "default.toml");
  if (!existsSync(configPath)) throw new Error("Cloudflare authentication is unavailable");
  const token = parseTomlValue(readFileSync(configPath, "utf8"), "oauth_token");
  if (!token) throw new Error("Cloudflare authentication is unavailable");
  return token;
}

async function cfRequest(token, pathname) {
  const response = await fetch(`https://api.cloudflare.com/client/v4${pathname}`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  const text = await response.text();
  if (!response.ok) throw new Error(`Cloudflare API ${pathname} failed with ${response.status}`);
  const parsed = JSON.parse(text);
  if (!parsed.success) throw new Error(`Cloudflare API ${pathname} did not succeed`);
  return { result: parsed.result, rawSha256: sha256(text) };
}

export function cloudflareDeploymentListPath(accountId, projectName) {
  return `/accounts/${encodeURIComponent(accountId)}/pages/projects/${encodeURIComponent(projectName)}/deployments?per_page=25`;
}

async function createCloudflareProvider(projectName) {
  const token = await cloudflareAuthToken();
  const accounts = await cfRequest(token, "/accounts?per_page=50");
  const matches = [];
  for (const account of accounts.result) {
    const response = await fetch(
      `https://api.cloudflare.com/client/v4/accounts/${encodeURIComponent(account.id)}/pages/projects/${encodeURIComponent(projectName)}`,
      { headers: { Authorization: `Bearer ${token}` } },
    );
    if (response.status === 404) continue;
    const text = await response.text();
    if (!response.ok) throw new Error(`Cloudflare project lookup failed with ${response.status}`);
    const parsed = JSON.parse(text);
    if (!parsed.success || !parsed.result) throw new Error("Cloudflare project lookup returned an invalid payload");
    matches.push({ accountId: account.id, project: parsed.result, projectRawSha256: sha256(text) });
  }
  const matched = selectSingleCloudflareProject(matches, projectName);
  const list = await cfRequest(token, cloudflareDeploymentListPath(matched.accountId, projectName));
  const deployments = list.result.map((deployment) => ({
    id: deployment.id,
    url: deployment.url,
    createdAt: deployment.created_on,
    environment: deployment.environment,
    commit: deployment.deployment_trigger?.metadata?.commit_hash,
    branch: deployment.deployment_trigger?.metadata?.branch,
  }));
  return {
    async getProject() {
      return { latestDeploymentId: matched.project.latest_deployment.id, rawSha256: matched.projectRawSha256 };
    },
    async listDeployments() {
      return { deployments, rawSha256: list.rawSha256 };
    },
  };
}

export function selectSingleCloudflareProject(matches, projectName) {
  if (!Array.isArray(matches) || matches.length !== 1) throw new Error(`expected exactly one Cloudflare Pages project ${projectName}; found ${matches?.length ?? 0}`);
  return matches[0];
}

function copyDirectoryContents(source, destination) {
  mkdirSync(destination, { recursive: true });
  for (const entry of readdirSync(source)) cpSync(path.join(source, entry), path.join(destination, entry), { recursive: true });
}

export function composeCachedStaticWithCompiledFunctions(staticDirectory, compiledDirectory, outputDirectory) {
  if (!existsSync(staticDirectory) || !existsSync(compiledDirectory)) throw new Error("static cache and compiled Functions are required");
  if (existsSync(outputDirectory)) throw new Error("composed deployment output already exists");
  mkdirSync(outputDirectory, { recursive: true });
  for (const entry of readdirSync(staticDirectory)) {
    if (REQUIRED_INTERNAL_FILES.includes(entry)) continue;
    cpSync(path.join(staticDirectory, entry), path.join(outputDirectory, entry), { recursive: true });
  }
  for (const internalFile of REQUIRED_INTERNAL_FILES) {
    const source = path.join(compiledDirectory, internalFile);
    if (!existsSync(source)) throw new Error(`compiled Functions material is missing ${internalFile}`);
    cpSync(source, path.join(outputDirectory, internalFile), { recursive: true });
  }
  return outputDirectory;
}

async function reconstructDeployment(current, descriptorPath) {
  const temporaryRoot = await mkdtemp(path.join(os.tmpdir(), "floriva-pages-rollback-"));
  const archivePath = path.join(temporaryRoot, "source.tar");
  const sourceRoot = path.join(temporaryRoot, "source");
  const deployDirectory = path.join(temporaryRoot, "deploy");
  mkdirSync(sourceRoot, { recursive: true });
  const commandResults = [];
  commandResults.push({ ...run(resolveExecutable("git.exe"), ["archive", "--format=tar", "-o", archivePath, current.commit]), purpose: "git-archive-prior-commit" });
  commandResults.push({ ...run(resolveExecutable("tar.exe"), ["-xf", archivePath, "-C", sourceRoot]), purpose: "tar-extract-prior-source" });
  walkFiles(sourceRoot);
  commandResults.push({ ...runPnpm(["install", "--frozen-lockfile", "--ignore-scripts"], { cwd: sourceRoot }), purpose: "pnpm-frozen-install" });
  commandResults.push({ ...runPnpm(["build"], { cwd: sourceRoot }), purpose: "pnpm-build" });
  copyDirectoryContents(path.join(sourceRoot, "dist"), deployDirectory);
  commandResults.push({ ...runWrangler(
    [
      "pages",
      "functions",
      "build",
      "functions",
      "--outdir",
      path.join(deployDirectory, "_worker.js"),
      "--output-config-path",
      path.join(deployDirectory, "_worker-config.json"),
      "--output-routes-path",
      path.join(deployDirectory, "_routes.json"),
      "--build-output-directory",
      path.join(sourceRoot, "dist"),
      "--project-directory",
      sourceRoot,
    ],
    { cwd: sourceRoot },
  ), purpose: "wrangler-pages-functions-build" });
  return {
    deployDirectory,
    acquisitionMethod: "reconstructed",
    temporaryRoot,
    descriptorPath,
    commandProvenance: commandResults,
  };
}

function resolvePnpmCli() {
  const candidates = [
    path.join(process.env.APPDATA ?? "", "npm", "node_modules", "pnpm", "bin", "pnpm.cjs"),
    path.join(path.dirname(process.execPath), "node_modules", "corepack", "dist", "pnpm.js"),
  ];
  const found = candidates.find((candidate) => candidate && existsSync(candidate));
  if (!found) throw new Error("pnpm JavaScript entrypoint is unavailable");
  return found;
}

function resolveWranglerCli(cwd = process.cwd()) {
  const direct = path.join(cwd, "node_modules", "wrangler", "bin", "wrangler.js");
  if (!existsSync(direct)) throw new Error(`Wrangler JavaScript entrypoint is unavailable in ${cwd}`);
  return direct;
}

function runPnpm(args, options = {}) {
  return run(process.execPath, [resolvePnpmCli(), ...args], options);
}

function runWrangler(args, options = {}) {
  return run(process.execPath, [resolveWranglerCli(options.cwd), ...args], options);
}

async function fetchBytes(url) {
  const response = await fetch(url, { redirect: "manual", headers: { "user-agent": "floriva-rollback-verifier/1" } });
  return { status: response.status, body: Buffer.from(await response.arrayBuffer()) };
}

function parseArgs(argv) {
  const values = {};
  for (let index = 0; index < argv.length; index += 1) {
    const key = argv[index];
    if (!key.startsWith("--")) continue;
    values[key.slice(2)] = argv[index + 1];
    index += 1;
  }
  return values;
}

async function tryReleaseMarker(origin, deploymentUrl) {
  const markerPath = "/.well-known/floriva-release.json";
  const [originResponse, deploymentResponse] = await Promise.all([
    fetchBytes(new URL(markerPath, origin).href),
    fetchBytes(new URL(markerPath, deploymentUrl).href),
  ]);
  if (originResponse.status !== 200 || deploymentResponse.status !== 200 || !responseBytes(originResponse).equals(responseBytes(deploymentResponse))) return null;
  try {
    return JSON.parse(responseBytes(originResponse).toString("utf8"));
  } catch {
    return null;
  }
}

async function freeLocalPort() {
  return new Promise((resolve, reject) => {
    const server = net.createServer();
    server.once("error", reject);
    server.listen(0, "127.0.0.1", () => {
      const address = server.address();
      const port = typeof address === "object" && address ? address.port : null;
      server.close((error) => (error ? reject(error) : resolve(port)));
    });
  });
}

async function startPagesPreview(deployDirectory) {
  const port = await freeLocalPort();
  const args = [
    resolveWranglerCli(),
    "pages", "dev", deployDirectory,
    "--compatibility-date", "2026-04-21",
    "--ip", "127.0.0.1",
    "--port", String(port),
    "--local-protocol", "http",
  ];
  const cwd = path.resolve(process.cwd());
  const child = spawn(process.execPath, args, { cwd, stdio: ["ignore", "pipe", "pipe"], shell: false });
  let stdout = "";
  let stderr = "";
  child.stdout.on("data", (chunk) => { stdout += chunk.toString(); });
  child.stderr.on("data", (chunk) => { stderr += chunk.toString(); });
  const origin = `http://127.0.0.1:${port}`;
  const deadline = Date.now() + 30_000;
  while (Date.now() < deadline) {
    if (child.exitCode !== null) throw new Error(`Pages preview exited before readiness: ${(stderr || stdout).slice(-1000)}`);
    try {
      await fetchBytes(`${origin}/`);
      return {
        origin,
        commandRecord() {
          const record = {
            purpose: "pages-preview-after-full-route-exercise",
            commandPath: path.resolve(process.execPath),
            args: [...args],
            cwd,
            exitStatus: "running-at-proof-completion",
            stdout,
            stderr,
          };
          return {
            ...record,
            invocationSha256: sha256(canonicalJson({ commandPath: record.commandPath, args: record.args, cwd: record.cwd })),
            outputSha256: commandOutputHash(record.stdout, record.stderr),
          };
        },
        async stop() {
          child.kill("SIGTERM");
          await new Promise((resolve) => setTimeout(resolve, 250));
          if (child.exitCode === null) child.kill("SIGKILL");
        },
      };
    } catch {
      await new Promise((resolve) => setTimeout(resolve, 100));
    }
  }
  child.kill("SIGKILL");
  throw new Error(`Pages preview did not become ready: ${(stderr || stdout).slice(-1000)}`);
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  if (args["verify-descriptor"]) {
    const descriptorPath = path.resolve(args["verify-descriptor"]);
    if (!existsSync(descriptorPath) || lstatSync(descriptorPath).isSymbolicLink()) throw new Error("descriptor.json is required and must be a regular file");
    const descriptor = JSON.parse(readFileSync(descriptorPath, "utf8"));
    const validation = validateRollbackDescriptor(descriptor, path.dirname(descriptorPath));
    if (!validation.valid) throw new Error(`rollback descriptor validation failed: ${validation.errors.join("; ")}`);
    process.stdout.write(`${JSON.stringify({ valid: true, descriptorSha256: sha256File(descriptorPath), files: descriptor.fileManifest.length })}\n`);
    return;
  }
  if (!args.origin || !args["binding-out"] || !args.out) {
    throw new Error("--origin, --binding-out, and --out are required");
  }
  const provider = await createCloudflareProvider(args.project ?? "floriva-web");
  const project = await provider.getProject();
  const deploymentList = await provider.listDeployments();
  const current = selectProviderCurrentDeployment(deploymentList.deployments, project.latestDeploymentId);
  const sitemapResponse = await fetchBytes(new URL("/sitemap.xml", args.origin).href);
  if (sitemapResponse.status !== 200) throw new Error(`production sitemap returned ${sitemapResponse.status}`);
  const sitemapRoutes = [...responseBytes(sitemapResponse).toString("utf8").matchAll(/<loc>([^<]+)<\/loc>/g)].map((match) => match[1]);
  // The noindex tier is live and prerendered but absent from the sitemap, so it
  // must be added back or the bundle would omit 26 real pages from its proof.
  const routes = [...new Set([...sitemapRoutes, ...NOINDEX_ROUTE_PATHS.map((pathname) => new URL(pathname, args.origin).href)])];
  normalizeCanonicalRoutes(routes, args.origin, TOTAL_LIVE_ROUTES);
  const releaseMarker = await tryReleaseMarker(args.origin, current.url);
  const acquired = await reconstructDeployment(current, args.out);
  const retainedStaticDirectory = path.resolve("dist");
  if (existsSync(path.join(retainedStaticDirectory, "index.html"))) {
    const composedDirectory = path.join(acquired.temporaryRoot, "composed-deploy");
    composeCachedStaticWithCompiledFunctions(retainedStaticDirectory, acquired.deployDirectory, composedDirectory);
    acquired.deployDirectory = composedDirectory;
    acquired.acquisitionMethod = "verified-retained-static+reconstructed-functions";
  }
  const scriptPath = fileURLToPath(import.meta.url);
  const sourceArchive = path.join(acquired.temporaryRoot, "source.tar");
  let preview = null;
  try {
    preview = await startPagesPreview(acquired.deployDirectory);
    const pnpmResult = runPnpm(["--version"]);
    pnpmResult.purpose = "pnpm-version";
    const wranglerResult = runWrangler(["--version"]);
    wranglerResult.purpose = "wrangler-version";
    const tarExecutable = resolveExecutable("tar.exe");
    const gitExecutable = resolveExecutable("git.exe");
    const tarResult = run(tarExecutable, ["--version"]);
    tarResult.purpose = "tar-version";
    const gitResult = run(gitExecutable, ["--version"]);
    gitResult.purpose = "git-version";
    const result = await prepareRollbackBundle({
      provider,
      acquire: async () => acquired,
      descriptorPath: path.resolve(args.out),
      bindingPath: path.resolve(args["binding-out"]),
      verifierPath: scriptPath,
      origin: args.origin,
      routes,
      expectedRouteCount: TOTAL_LIVE_ROUTES,
      wranglerVersion: wranglerResult.stdout.trim(),
      toolchain: {
        nodeVersion: process.version,
        nodeExecutableSha256: sha256File(process.execPath),
        pnpmVersion: pnpmResult.stdout.trim(),
        pnpmCliSha256: sha256File(resolvePnpmCli()),
        tarVersion: tarResult.stdout.split(/\r?\n/, 1)[0],
        tarExecutableSha256: sha256File(tarExecutable),
        gitVersion: gitResult.stdout.trim(),
        gitExecutableSha256: sha256File(gitExecutable),
        wranglerVersion: wranglerResult.stdout.trim(),
        wranglerCliSha256: sha256File(resolveWranglerCli()),
      },
      sourceHashes: {
        source: sha256File(sourceArchive),
        lock: sha256File(path.join(acquired.temporaryRoot, "source", "pnpm-lock.yaml")),
        tool: sha256File(scriptPath),
        commandOutput: null,
      },
      commandProvenance: [...acquired.commandProvenance, pnpmResult, wranglerResult, tarResult, gitResult],
      previewCommandRecord: () => preview.commandRecord(),
      releaseMarker,
      fetcher: fetchBytes,
      previewOrigin: preview.origin,
      sourceArchivePath: sourceArchive,
      lockfilePath: path.join(acquired.temporaryRoot, "source", "pnpm-lock.yaml"),
      projectName: args.project ?? "floriva-web",
    });
    process.stdout.write(`${formatPreparationCompletion(result)}\n`);
  } finally {
    if (preview) await preview.stop();
    rmSync(acquired.temporaryRoot, { recursive: true, force: true });
  }
}

export function formatPreparationCompletion(result) {
  return JSON.stringify({ ok: true, deploymentId: result.binding.deploymentId, commit: result.binding.deploymentCommit, bindingMethod: result.binding.bindingMethod });
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  main().catch((error) => {
    process.stderr.write(`${error.message}\n`);
    process.exitCode = 1;
  });
}
