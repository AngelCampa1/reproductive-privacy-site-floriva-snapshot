import { createHash } from "node:crypto";
import { promises as fs } from "node:fs";
import path from "node:path";

export function normalizeClaimText(value) {
  return String(value).normalize("NFKC").trim().replace(/\s+/g, " ").toLowerCase();
}

export function createBaselineId({ file, baselineLocator, patternId, sourceFileHash, claimText }) {
  if (!/^[a-f0-9]{64}$/.test(sourceFileHash)) throw new Error("sourceFileHash must be a SHA-256");
  const identity = [normalizeRepositoryPath(file), baselineLocator, patternId, sourceFileHash, normalizeClaimText(claimText)].join("\n");
  return `claim-${createHash("sha256").update(identity).digest("hex").slice(0, 20)}`;
}

export function normalizeRepositoryPath(value) {
  const raw = String(value ?? "");
  if (
    !raw ||
    raw.includes("\0") ||
    /^[A-Za-z]:/.test(raw) ||
    /^(?:\\\\|\/\/)/.test(raw) ||
    /^[\\/]/.test(raw)
  ) {
    throw new Error(`Invalid repository path: ${value}`);
  }
  const normalized = raw.replace(/\\/g, "/").replace(/^\.\//, "").replace(/\/$/, "");
  const segments = normalized.split("/");
  if (!normalized || segments.some((segment) => !segment || segment === "." || segment === ".." || segment.includes(":"))) {
    throw new Error(`Invalid repository path: ${value}`);
  }
  return normalized;
}

function assertContained(rootPath, candidatePath, label) {
  const relative = path.relative(rootPath, candidatePath);
  if (relative === "" || (!relative.startsWith(`..${path.sep}`) && relative !== ".." && !path.isAbsolute(relative))) return;
  throw new Error(`${label} escapes the repository: ${candidatePath}`);
}

async function rejectLinkComponents(rootPath, repositoryPath, { allowMissing }) {
  let current = rootPath;
  for (const segment of repositoryPath.split("/")) {
    current = path.join(current, segment);
    let stat;
    try {
      stat = await fs.lstat(current);
    } catch (error) {
      if (error.code === "ENOENT" && allowMissing) return;
      throw error;
    }
    if (stat.isSymbolicLink()) {
      throw new Error(`Repository path crosses a symbolic link or junction: ${repositoryPath}`);
    }
  }
}

export async function resolveRepositoryPath(rootDir, value, { allowMissing = false } = {}) {
  const repositoryPath = normalizeRepositoryPath(value);
  const rootPath = await fs.realpath(path.resolve(rootDir));
  const absolutePath = path.resolve(rootPath, ...repositoryPath.split("/"));
  assertContained(rootPath, absolutePath, "Repository path");
  await rejectLinkComponents(rootPath, repositoryPath, { allowMissing });

  if (!allowMissing) {
    const realPath = await fs.realpath(absolutePath);
    assertContained(rootPath, realPath, "Resolved repository path");
  }
  return { rootPath, repositoryPath, absolutePath };
}

export async function ensureRepositoryOutputPath(rootDir, value) {
  const resolved = await resolveRepositoryPath(rootDir, value, { allowMissing: true });
  const directorySegments = resolved.repositoryPath.split("/").slice(0, -1);
  let current = resolved.rootPath;
  for (const segment of directorySegments) {
    current = path.join(current, segment);
    try {
      await fs.mkdir(current);
    } catch (error) {
      if (error.code !== "EEXIST") throw error;
    }
    const stat = await fs.lstat(current);
    if (stat.isSymbolicLink()) {
      throw new Error(`Repository output crosses a symbolic link or junction: ${resolved.repositoryPath}`);
    }
    if (!stat.isDirectory()) throw new Error(`Repository output parent is not a directory: ${resolved.repositoryPath}`);
    const realPath = await fs.realpath(current);
    assertContained(resolved.rootPath, realPath, "Repository output parent");
  }
  await rejectLinkComponents(resolved.rootPath, resolved.repositoryPath, { allowMissing: true });
  return resolved;
}
