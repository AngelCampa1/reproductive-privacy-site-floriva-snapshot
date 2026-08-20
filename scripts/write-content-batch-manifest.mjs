#!/usr/bin/env node

import { createHash } from "node:crypto";
import { execFile } from "node:child_process";
import { promises as fs } from "node:fs";
import path from "node:path";
import { promisify } from "node:util";
import { pathToFileURL } from "node:url";
import { ensureRepositoryOutputPath, normalizeRepositoryPath, resolveRepositoryPath } from "./lib/claim-identity.mjs";
import { publishImmutableFiles } from "./freeze-claims-baseline.mjs";

const execFileAsync = promisify(execFile);

function sha256(value) {
  return createHash("sha256").update(value).digest("hex");
}

async function classifyRules(rootDir, values) {
  const rules = [];
  for (const value of values) {
    const normalized = normalizeRepositoryPath(value);
    const requestedPrefix = String(value).replace(/\\/g, "/").endsWith("/");
    const resolved = await resolveRepositoryPath(rootDir, normalized, { allowMissing: true });
    let isPrefix = requestedPrefix;
    try {
      const stat = await fs.lstat(resolved.absolutePath);
      if (stat.isSymbolicLink()) throw new Error(`Repository path crosses a symbolic link or junction: ${normalized}`);
      isPrefix = stat.isDirectory();
    } catch (error) {
      if (error.code !== "ENOENT") throw error;
    }
    rules.push({ path: normalized, isPrefix });
  }
  return rules;
}

function matchesRule(changedPath, rule) {
  return changedPath === rule.path || (rule.isPrefix && changedPath.startsWith(`${rule.path}/`));
}

export async function validateChangedPaths({ rootDir, changedPaths, allow, deny = [] }) {
  if (!Array.isArray(changedPaths) || changedPaths.length === 0) throw new Error("Refusing to write a content batch manifest for an empty diff");
  if (!Array.isArray(allow) || allow.length === 0) throw new Error("At least one --allow path is required");
  if (!Array.isArray(deny)) throw new Error("deny must be an array");
  const allowRules = await classifyRules(rootDir, allow);
  const denyRules = await classifyRules(rootDir, deny);
  const normalizedPaths = [...new Set(changedPaths.map(normalizeRepositoryPath))].sort();

  for (const changedPath of normalizedPaths) {
    if (!allowRules.some((rule) => matchesRule(changedPath, rule))) throw new Error(`Changed path is outside the allowlist: ${changedPath}`);
    if (denyRules.some((rule) => matchesRule(changedPath, rule))) throw new Error(`Changed path is inside the denylist: ${changedPath}`);
    let resolved;
    try {
      resolved = await resolveRepositoryPath(rootDir, changedPath);
    } catch (error) {
      if (error.code === "ENOENT") throw new Error(`Changed path is missing and cannot be hashed: ${changedPath}`);
      throw error;
    }
    const stat = await fs.lstat(resolved.absolutePath);
    if (!stat.isFile()) throw new Error(`Changed path is not a regular file: ${changedPath}`);
  }
  return normalizedPaths;
}

export async function verifyManifestEntries({ rootDir, entries }) {
  if (!Array.isArray(entries)) throw new Error("Manifest entries must be an array");
  const seen = new Set();
  for (const [index, entry] of entries.entries()) {
    if (!entry || typeof entry !== "object" || Array.isArray(entry)) throw new Error(`Manifest entry ${index} must be an object`);
    const repoPath = normalizeRepositoryPath(entry.path);
    if (seen.has(repoPath)) throw new Error(`Duplicate manifest path: ${repoPath}`);
    seen.add(repoPath);
    if (!/^[a-f0-9]{64}$/.test(entry.sha256)) throw new Error(`Manifest entry has invalid SHA-256: ${repoPath}`);
    let resolved;
    try {
      resolved = await resolveRepositoryPath(rootDir, repoPath);
    } catch (error) {
      if (error.code === "ENOENT") throw new Error(`Manifest path is missing: ${repoPath}`);
      throw error;
    }
    const stat = await fs.lstat(resolved.absolutePath);
    if (!stat.isFile()) throw new Error(`Manifest path is not a regular file: ${repoPath}`);
    const actualHash = sha256(await fs.readFile(resolved.absolutePath));
    if (actualHash !== entry.sha256) {
      throw new Error(`Manifest hash mismatch for ${repoPath}: expected ${entry.sha256}, received ${actualHash}`);
    }
  }
}

export function parsePorcelainZ(output) {
  const fields = output.split("\0");
  const paths = [];
  for (let index = 0; index < fields.length; index += 1) {
    const field = fields[index];
    if (!field) continue;
    if (field.length < 4 || field[2] !== " ") throw new Error(`Unexpected git status record: ${JSON.stringify(field)}`);
    const status = field.slice(0, 2);
    const changedPath = field.slice(3);
    if (status.includes("R") || status.includes("C")) {
      const originalPath = fields[index + 1];
      if (!originalPath) throw new Error(`Incomplete renamed/copied git status record: ${JSON.stringify(field)}`);
      index += 1;
      throw new Error(`Renamed/copied paths are not supported in content batch manifests: ${originalPath} -> ${changedPath}`);
    }
    paths.push(changedPath);
  }
  return paths;
}

async function git(rootDir, args) {
  const { stdout } = await execFileAsync("git", args, { cwd: rootDir, encoding: "buffer", maxBuffer: 16 * 1024 * 1024, windowsHide: true });
  return stdout;
}

async function refuseExistingOutput(rootDir, outPath) {
  const resolved = await ensureRepositoryOutputPath(rootDir, outPath);
  try {
    await fs.lstat(resolved.absolutePath);
    throw new Error(`Refusing to overwrite existing content batch manifest: ${resolved.repositoryPath}`);
  } catch (error) {
    if (error.code !== "ENOENT") throw error;
  }
  return resolved;
}

export async function writeContentBatchManifest({ rootDir, task, allow, deny = [], outPath, beforePublish }) {
  if (!/^\d+$/.test(String(task)) || Number(task) < 1) throw new Error("--task must be a positive integer");
  const output = await refuseExistingOutput(rootDir, outPath);
  const statusBytes = await git(rootDir, ["status", "--porcelain=v1", "-z", "--untracked-files=all"]);
  const changedPaths = parsePorcelainZ(statusBytes.toString("utf8"));
  const validatedPaths = await validateChangedPaths({ rootDir, changedPaths, allow, deny });
  const entries = [];
  for (const repoPath of validatedPaths) {
    const resolved = await resolveRepositoryPath(rootDir, repoPath);
    entries.push({ path: repoPath, sha256: sha256(await fs.readFile(resolved.absolutePath)) });
  }
  await verifyManifestEntries({ rootDir, entries });
  const head = (await git(rootDir, ["rev-parse", "--verify", "HEAD"])).toString("utf8").trim();
  if (!/^(?:[a-f0-9]{40}|[a-f0-9]{64})$/.test(head)) throw new Error(`Git returned an invalid HEAD object ID: ${head}`);
  const manifest = { task: Number(task), head, paths: entries };
  await publishImmutableFiles({
    rootDir,
    files: [{ path: output.repositoryPath, data: JSON.stringify(manifest, null, 2) + "\n" }],
    beforePublish,
  });
  return manifest;
}

function splitList(value) {
  return value ? value.split(",").map((item) => item.trim()).filter(Boolean) : [];
}

function parseArgs(argv) {
  const options = {};
  for (let index = 0; index < argv.length; index += 1) {
    const key = argv[index];
    if (!key.startsWith("--") || index + 1 >= argv.length) throw new Error(`Invalid argument: ${key}`);
    options[key.slice(2)] = argv[index + 1];
    index += 1;
  }
  for (const key of ["task", "allow", "out"]) {
    if (!options[key]) throw new Error(`Missing required --${key}`);
  }
  return options;
}

async function main() {
  const rootDir = process.cwd();
  const options = parseArgs(process.argv.slice(2));
  const manifest = await writeContentBatchManifest({
    rootDir,
    task: options.task,
    allow: splitList(options.allow),
    deny: splitList(options.deny),
    outPath: options.out,
  });
  console.log(`content batch manifest written: task ${manifest.task}, ${manifest.paths.length} path(s)`);
}

if (process.argv[1] && pathToFileURL(path.resolve(process.argv[1])).href === import.meta.url) {
  main().catch((error) => {
    console.error(error.message);
    process.exitCode = 1;
  });
}
