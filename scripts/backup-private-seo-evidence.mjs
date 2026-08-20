#!/usr/bin/env node

import { createCipheriv, createDecipheriv, createHash, randomBytes, randomUUID } from "node:crypto";
import { existsSync, lstatSync, mkdirSync, readFileSync, readdirSync, realpathSync, renameSync, rmSync, writeFileSync } from "node:fs";
import { mkdtemp } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { GetObjectCommand, HeadBucketCommand, HeadObjectCommand, PutObjectCommand, S3Client } from "@aws-sdk/client-s3";

const HASH_PATTERN = /^[a-f0-9]{64}$/;
const ISO_PATTERN = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d+)?Z$/;
const MAX_BRIDGE_OBJECT_BYTES = 128 * 1024 * 1024;
const WINDOWS_DEVICE_PATTERN = /^(?:con|prn|aux|nul|conin\$|conout\$|clock\$|com(?:[1-9¹²³])|lpt(?:[1-9¹²³]))(?:\..*)?$/i;

function sha256(value) {
  return createHash("sha256").update(value).digest("hex");
}

function canonicalJson(value) {
  if (Array.isArray(value)) return `[${value.map(canonicalJson).join(",")}]`;
  if (value && typeof value === "object") return `{${Object.keys(value).sort().map((key) => `${JSON.stringify(key)}:${canonicalJson(value[key])}`).join(",")}}`;
  return JSON.stringify(value);
}

function walkFiles(root, relative = "", aliases = new Set()) {
  const files = [];
  for (const entry of readdirSync(path.join(root, relative), { withFileTypes: true }).sort((a, b) => a.name.localeCompare(b.name))) {
    const child = safeArchivePath(path.posix.join(relative.replaceAll("\\", "/"), entry.name));
    const alias = child.toLowerCase();
    if (aliases.has(alias)) throw new Error(`case-insensitive path collision: ${child}`);
    aliases.add(alias);
    const absolute = assertNoFollowComponents(root, child, "archive walk path");
    const metadata = lstatSync(absolute);
    if (entry.isSymbolicLink() || metadata.isSymbolicLink()) throw new Error(`symlink or reparse point is forbidden: ${child}`);
    if (entry.isDirectory()) files.push(...walkFiles(root, child, aliases));
    else if (entry.isFile()) files.push(child);
    else throw new Error(`non-regular file is forbidden: ${child}`);
  }
  return files;
}

export function safeArchivePath(value) {
  if (typeof value !== "string" || !value || value.includes("\0") || /^[a-z]:/i.test(value) || value.startsWith("\\\\") || value.startsWith("//")) {
    throw new Error(`unsafe archive path: ${value}`);
  }
  const replaced = value.replaceAll("\\", "/");
  const normalized = path.posix.normalize(replaced);
  if (normalized !== replaced || normalized.startsWith("../") || normalized.startsWith("/") || normalized === "..") throw new Error(`unsafe archive path: ${value}`);
  for (const segment of normalized.split("/")) {
    if (!segment || segment.includes(":") || /[ .]$/.test(segment) || WINDOWS_DEVICE_PATTERN.test(segment)) throw new Error(`non-portable archive path: ${value}`);
  }
  return normalized;
}

function containedPath(root, relativePath) {
  const rootPath = path.resolve(root);
  const destination = path.resolve(rootPath, ...safeArchivePath(relativePath).split("/"));
  if (!destination.toLowerCase().startsWith(`${rootPath}${path.sep}`.toLowerCase())) throw new Error(`unsafe contained path: ${relativePath}`);
  return destination;
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
    const real = realpathSync.native(cursor);
    if (path.resolve(real).toLowerCase() !== path.resolve(cursor).toLowerCase()) {
      throw new Error(`${label} ancestor resolves through a reparse point: ${cursor}`);
    }
  }
  return absolute;
}

function assertNoFollowComponents(root, relativePath, label = "path") {
  const portable = safeArchivePath(relativePath);
  const rootPath = assertNoFollowExistingAncestors(root, `${label} root`);
  if (!existsSync(rootPath) || lstatSync(rootPath).isSymbolicLink()) throw new Error(`${label} root is missing or reparse-backed`);
  const rootReal = realpathSync.native(rootPath);
  let cursor = rootPath;
  for (const segment of portable.split("/")) {
    cursor = path.join(cursor, segment);
    if (!existsSync(cursor)) throw new Error(`${label} component is missing: ${portable}`);
    if (lstatSync(cursor).isSymbolicLink()) throw new Error(`${label} symlink/junction/reparse component is forbidden: ${portable}`);
    const real = realpathSync.native(cursor);
    if (real !== rootReal && !real.toLowerCase().startsWith(`${rootReal}${path.sep}`.toLowerCase())) throw new Error(`${label} reparse traversal is forbidden: ${portable}`);
  }
  return cursor;
}

function readSafeBytes(targetPath, label = "file") {
  const absolute = assertNoFollowExistingAncestors(targetPath, label);
  if (!existsSync(absolute)) throw new Error(`${label} is missing`);
  const metadata = lstatSync(absolute);
  if (!metadata.isFile() || metadata.isSymbolicLink()) throw new Error(`${label} must be a regular non-reparse file`);
  return readFileSync(absolute);
}

function readSafeJson(targetPath, label = "JSON file") {
  return JSON.parse(readSafeBytes(targetPath, label).toString("utf8"));
}

function decodeCanonicalBase64(value, expectedBytes, label) {
  if (typeof value !== "string" || !/^(?:[A-Za-z0-9+/]{4})*(?:[A-Za-z0-9+/]{2}==|[A-Za-z0-9+/]{3}=)?$/.test(value)) throw new Error(`${label} must be canonical base64`);
  const bytes = Buffer.from(value, "base64");
  if (bytes.byteLength !== expectedBytes || bytes.toString("base64") !== value) throw new Error(`${label} must encode exactly ${expectedBytes} bytes`);
  return bytes;
}

export function parseBackupKey(value) {
  return decodeCanonicalBase64(value, 32, "FLORIVA_PRIVATE_BACKUP_KEY");
}

function addFile(files, archivePath, bytes) {
  const normalized = safeArchivePath(archivePath);
  if (files.some((entry) => entry.path.toLowerCase() === normalized.toLowerCase())) throw new Error(`duplicate or case-colliding archive path: ${normalized}`);
  files.push({ path: normalized, sha256: sha256(bytes), byteLength: bytes.byteLength, base64: bytes.toString("base64") });
}

function archiveInventorySha256(files) {
  return sha256(canonicalJson(files.map(({ path: filePath, sha256: fileSha, byteLength }) => ({ path: filePath, sha256: fileSha, byteLength })).sort((a, b) => a.path.localeCompare(b.path))));
}

async function packArchive({ rollbackDirectory, rawInventoryPath, priorBindingPath, resolveRawObject }) {
  if (!existsSync(path.join(rollbackDirectory, "descriptor.json"))) throw new Error("rollback descriptor.json is required");
  if (!existsSync(path.join(rollbackDirectory, "verifier", "verify-rollback.mjs"))) throw new Error("pinned standalone rollback verifier is required");
  const files = [];
  for (const relativePath of walkFiles(rollbackDirectory)) {
    addFile(files, path.posix.join("rollback", relativePath.replaceAll("\\", "/")), readFileSync(path.join(rollbackDirectory, relativePath)));
  }
  const inventoryBytes = readFileSync(assertNoFollowComponents(path.dirname(rawInventoryPath), path.basename(rawInventoryPath), "raw inventory"));
  addFile(files, "raw-evidence-inventory.json", inventoryBytes);
  const priorBindingBytes = readFileSync(assertNoFollowComponents(path.dirname(priorBindingPath), path.basename(priorBindingPath), "prior binding"));
  addFile(files, "prior-deployment.json", priorBindingBytes);
  const inventory = JSON.parse(inventoryBytes.toString("utf8"));
  if (!Array.isArray(inventory.records)) throw new Error("raw inventory records are required");
  await Promise.all(
    inventory.records.map(async (record) => {
      if (!/^raw-[a-z0-9-]+$/i.test(record.rawEvidenceId ?? "") || !record.opaqueLocator || !HASH_PATTERN.test(record.sha256 ?? "")) {
        throw new Error("raw inventory record is incomplete");
      }
      const rawPath = await resolveRawObject(record.opaqueLocator, record);
      if (!rawPath || !existsSync(rawPath)) throw new Error(`raw object is unavailable: ${record.rawEvidenceId}`);
      const bytes = readFileSync(rawPath);
      if (sha256(bytes) !== record.sha256 || bytes.byteLength !== record.byteLength) {
        throw new Error(`raw object hash drift: ${record.rawEvidenceId}`);
      }
      addFile(files, `raw/${encodeURIComponent(record.rawEvidenceId)}`, bytes);
    }),
  );
  files.sort((a, b) => a.path.localeCompare(b.path));
  const archiveBytes = Buffer.from(JSON.stringify({ schemaVersion: 2, files }), "utf8");
  return {
    archiveBytes,
    trustedBindings: {
      descriptorSha256: sha256(readFileSync(path.join(rollbackDirectory, "descriptor.json"))),
      verifierSha256: sha256(readFileSync(path.join(rollbackDirectory, "verifier", "verify-rollback.mjs"))),
      rawInventorySha256: sha256(inventoryBytes),
      priorBindingSha256: sha256(priorBindingBytes),
      archiveInventorySha256: archiveInventorySha256(files),
    },
  };
}

const TRUSTED_BINDING_NAMES = ["descriptorSha256", "verifierSha256", "rawInventorySha256", "priorBindingSha256", "archiveInventorySha256"];

export function validateTrustedRestoreAnchors(value) {
  const errors = [];
  if (value?.schemaVersion !== 1 || value?.reviewState !== "reviewed-local-inputs") errors.push("trusted restore anchors must be reviewed local inputs schema 1");
  for (const name of TRUSTED_BINDING_NAMES) if (!HASH_PATTERN.test(value?.[name] ?? "")) errors.push(`trusted restore anchor ${name} is required`);
  return { valid: errors.length === 0, errors };
}

function trustedBindingSubset(value) {
  return Object.fromEntries(TRUSTED_BINDING_NAMES.map((name) => [name, value?.[name]]));
}

function assertReviewedTrustAnchors(actualBindings, reviewedAnchors) {
  const validation = validateTrustedRestoreAnchors(reviewedAnchors);
  if (!validation.valid) throw new Error(`reviewed local trust anchors are invalid: ${validation.errors.join("; ")}`);
  if (canonicalJson(actualBindings) !== canonicalJson(trustedBindingSubset(reviewedAnchors))) {
    throw new Error("archive or receipt does not match independently reviewed local trust anchors");
  }
}

export async function deriveTrustedRestoreAnchors(options) {
  const { trustedBindings } = await packArchive(options);
  return { schemaVersion: 1, reviewState: "reviewed-local-inputs", ...trustedBindings };
}

function encryptArchive(archiveBytes, key) {
  if (!Buffer.isBuffer(key) || key.byteLength !== 32) throw new Error("FLORIVA_PRIVATE_BACKUP_KEY must decode to exactly 32 bytes");
  const nonce = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", key, nonce);
  const ciphertext = Buffer.concat([cipher.update(archiveBytes), cipher.final()]);
  const tag = cipher.getAuthTag();
  return { ciphertext, nonce, tag };
}

function decryptArchive(ciphertext, key, nonce, tag) {
  if (!Buffer.isBuffer(key) || key.byteLength !== 32) throw new Error("backup key must be exactly 32 bytes");
  const decipher = createDecipheriv("aes-256-gcm", key, nonce);
  decipher.setAuthTag(tag);
  return Buffer.concat([decipher.update(ciphertext), decipher.final()]);
}

function writeArchive(archiveBytes, restoreRoot) {
  const archive = JSON.parse(archiveBytes.toString("utf8"));
  if (archive.schemaVersion !== 2 || !Array.isArray(archive.files)) throw new Error("unsupported backup archive");
  assertNoFollowExistingAncestors(path.dirname(path.resolve(restoreRoot)), "restore root parent");
  if (existsSync(restoreRoot) && readdirSync(restoreRoot).length > 0) throw new Error("restore root must be clean");
  mkdirSync(restoreRoot, { recursive: true });
  assertNoFollowExistingAncestors(restoreRoot, "restore root");
  const aliases = new Set();
  for (const entry of archive.files) {
    const relativePath = safeArchivePath(entry.path);
    const alias = relativePath.toLowerCase();
    if (aliases.has(alias)) throw new Error(`duplicate or case-colliding archive path: ${relativePath}`);
    aliases.add(alias);
    if (!Number.isSafeInteger(entry.byteLength) || entry.byteLength < 0 || !HASH_PATTERN.test(entry.sha256 ?? "")) throw new Error(`archive metadata is invalid: ${relativePath}`);
    const bytes = Buffer.from(entry.base64, "base64");
    if (bytes.toString("base64") !== entry.base64) throw new Error(`archive file is not canonical base64: ${relativePath}`);
    if (bytes.byteLength !== entry.byteLength || sha256(bytes) !== entry.sha256) {
      throw new Error(`archive file hash drift: ${relativePath}`);
    }
    const destination = containedPath(restoreRoot, relativePath);
    assertNoFollowExistingAncestors(path.dirname(destination), "archive destination parent");
    mkdirSync(path.dirname(destination), { recursive: true });
    assertNoFollowExistingAncestors(path.dirname(destination), "archive destination parent");
    writeFileSync(destination, bytes, { flag: "wx" });
  }
  return archive;
}

function validateRestoredArchive(archive, restoreRoot, trustedBindings) {
  const errors = [];
  if (archiveInventorySha256(archive.files) !== trustedBindings?.archiveInventorySha256) errors.push("archive inventory is not bound by reviewed local trust anchors");
  for (const entry of archive.files) {
    const restoredPath = assertNoFollowComponents(restoreRoot, entry.path, "restored archive path");
    if (!existsSync(restoredPath)) errors.push(`restored file is missing: ${entry.path}`);
    else {
      const bytes = readFileSync(restoredPath);
      if (sha256(bytes) !== entry.sha256 || bytes.byteLength !== entry.byteLength) errors.push(`restored file hash drift: ${entry.path}`);
    }
  }
  const inventoryPath = path.join(restoreRoot, "raw-evidence-inventory.json");
  if (!existsSync(inventoryPath)) errors.push("restored raw inventory is missing");
  else {
    const inventoryBytes = readFileSync(inventoryPath);
    if (sha256(inventoryBytes) !== trustedBindings?.rawInventorySha256) errors.push("restored raw inventory is not bound by the trusted receipt");
    const inventory = JSON.parse(inventoryBytes.toString("utf8"));
    const expectedRawPaths = new Set((inventory.records ?? []).map((record) => `raw/${encodeURIComponent(record.rawEvidenceId)}`));
    const actualRawPaths = new Set(archive.files.filter((entry) => entry.path.startsWith("raw/")).map((entry) => entry.path));
    if (expectedRawPaths.size !== actualRawPaths.size || [...expectedRawPaths].some((entry) => !actualRawPaths.has(entry))) errors.push("archive raw objects do not exactly match the raw inventory");
    for (const record of inventory.records ?? []) {
      const rawPath = path.join(restoreRoot, "raw", encodeURIComponent(record.rawEvidenceId));
      if (!existsSync(rawPath)) errors.push(`restored raw object is missing: ${record.rawEvidenceId}`);
      else {
        const bytes = readFileSync(rawPath);
        if (sha256(bytes) !== record.sha256 || bytes.byteLength !== record.byteLength) {
          errors.push(`restored raw object hash drift: ${record.rawEvidenceId}`);
        }
      }
    }
  }
  const descriptorPath = path.join(restoreRoot, "rollback", "descriptor.json");
  const verifierPath = path.join(restoreRoot, "rollback", "verifier", "verify-rollback.mjs");
  const priorBindingPath = path.join(restoreRoot, "prior-deployment.json");
  if (!existsSync(descriptorPath)) errors.push("restored rollback descriptor is missing");
  if (!existsSync(verifierPath)) errors.push("restored pinned verifier is missing");
  if (!existsSync(priorBindingPath) || sha256(readFileSync(priorBindingPath)) !== trustedBindings?.priorBindingSha256) errors.push("restored prior binding is not bound by the trusted receipt");
  if (existsSync(descriptorPath) && existsSync(verifierPath)) {
    if (lstatSync(descriptorPath).isSymbolicLink() || lstatSync(verifierPath).isSymbolicLink()) errors.push("restored descriptor/verifier may not be symlinks or reparses");
    else {
      if (sha256(readFileSync(descriptorPath)) !== trustedBindings?.descriptorSha256) errors.push("restored descriptor is not bound by the trusted receipt");
      if (sha256(readFileSync(verifierPath)) !== trustedBindings?.verifierSha256) errors.push("restored verifier is not bound by the trusted receipt");
      const verification = spawnSync(process.execPath, [verifierPath, "--verify-descriptor", descriptorPath], {
        cwd: path.join(restoreRoot, "rollback"),
        encoding: "utf8",
        shell: false,
        maxBuffer: 1024 * 1024 * 10,
      });
      if (verification.status !== 0) errors.push(`restored pinned verifier failed: ${verification.stderr || verification.stdout}`);
      try {
        const descriptor = JSON.parse(readFileSync(descriptorPath, "utf8"));
        const allowed = new Set(["rollback/descriptor.json", "rollback/verifier/verify-rollback.mjs", "raw-evidence-inventory.json", "prior-deployment.json"]);
        for (const entry of descriptor.fileManifest ?? []) allowed.add(`rollback/${entry.path}`);
        for (const input of Object.values(descriptor.provenanceInputs ?? {})) if (input?.path) allowed.add(`rollback/${safeArchivePath(input.path)}`);
        for (const record of JSON.parse(readFileSync(inventoryPath, "utf8")).records ?? []) allowed.add(`raw/${encodeURIComponent(record.rawEvidenceId)}`);
        const actual = new Set(archive.files.map((entry) => entry.path));
        if (allowed.size !== actual.size || [...allowed].some((entry) => !actual.has(entry))) errors.push("archive contains missing or unmanifested files");
      } catch (error) {
        errors.push(`archive closure could not be evaluated: ${error.message}`);
      }
    }
  }
  return { valid: errors.length === 0, errors, validatedFileCount: archive.files.length };
}

export function validateBackupReceipt(receipt, options = {}) {
  const errors = [];
  if (receipt?.schemaVersion !== 2) errors.push("backup receipt schemaVersion must be 2");
  if (receipt?.provider !== "cloudflare-r2") errors.push("backup provider must be cloudflare-r2");
  if (!/^[A-Za-z0-9][A-Za-z0-9._-]{1,127}$/.test(receipt?.bucket ?? "")) errors.push("backup bucket is invalid");
  if (!/^[a-f0-9]{64}$/.test(receipt?.objectId ?? "")) errors.push("opaque object ID must be 256-bit lowercase hex");
  if (!HASH_PATTERN.test(receipt?.ciphertextSha256 ?? "")) errors.push("ciphertext SHA-256 is required");
  if (!Number.isSafeInteger(receipt?.ciphertextByteLength) || receipt.ciphertextByteLength < 1) errors.push("ciphertext byte length is required");
  if (receipt?.encryption?.algorithm !== "AES-256-GCM" || receipt?.encryption?.version !== 1) errors.push("encryption must be AES-256-GCM version 1");
  try { decodeCanonicalBase64(receipt?.encryption?.nonceBase64, 12, "AES-GCM nonce"); } catch (error) { errors.push(error.message); }
  try { decodeCanonicalBase64(receipt?.encryption?.tagBase64, 16, "AES-GCM tag"); } catch (error) { errors.push(error.message); }
  if (!receipt?.keyId || typeof receipt.keyId !== "string") errors.push("non-secret key ID is required");
  if (!receipt?.wranglerVersion || !ISO_PATTERN.test(receipt?.preparedAt ?? "")) errors.push("Wrangler version and receipt preparation time are required");
  if (options.allowPending !== true && (receipt?.publicationOrder !== "remote-verified-before-canonical-receipt" || receipt?.remoteState !== "verified-clean-restore" || !ISO_PATTERN.test(receipt?.uploadedAt ?? ""))) errors.push("success receipt may only publish after remote clean restore verification");
  for (const name of TRUSTED_BINDING_NAMES) {
    if (!HASH_PATTERN.test(receipt?.trustedBindings?.[name] ?? "")) errors.push(`trusted ${name} is required`);
  }
  if (!HASH_PATTERN.test(receipt?.supersedes?.previousReceiptSha256 ?? "") || !/^(?:[a-f0-9]{32}|[a-f0-9]{64})$/.test(receipt?.supersedes?.previousObjectId ?? "") || receipt?.supersedes?.previousObjectPreserved !== true) errors.push("exact preserved prior receipt/object supersession binding is required");
  if (options.allowPending !== true && (receipt?.supersedes?.previousObjectVerification?.objectId !== receipt?.supersedes?.previousObjectId || !HASH_PATTERN.test(receipt?.supersedes?.previousObjectVerification?.ciphertextSha256 ?? "") || !Number.isSafeInteger(receipt?.supersedes?.previousObjectVerification?.ciphertextByteLength) || receipt?.supersedes?.previousObjectVerification?.unchanged !== true)) errors.push("success receipt must prove the prior object remained byte-identical");
  if (options.requireCleanRestore) {
    if (receipt?.cleanRestore?.valid !== true || !HASH_PATTERN.test(receipt?.cleanRestore?.archiveSha256 ?? "") || !Number.isSafeInteger(receipt?.cleanRestore?.validatedFileCount) || receipt.cleanRestore.validatedFileCount < 0 || !ISO_PATTERN.test(receipt?.cleanRestore?.validatedAt ?? "") || receipt?.cleanRestore?.verificationSource !== "remote-object-clean-restore" || receipt?.cleanRestore?.remoteVerifiedAt !== receipt?.cleanRestore?.validatedAt) {
      errors.push("complete clean restore receipt is required");
    }
  }
  return { valid: errors.length === 0, errors };
}

export async function restoreAndValidateBackup({ objectStore, objectId, key, receipt, restoreRoot, trustedRestoreAnchors, allowPendingReceipt = false }) {
  assertNoFollowExistingAncestors(path.dirname(path.resolve(restoreRoot)), "restore root parent");
  const receiptValidation = validateBackupReceipt(receipt, { allowPending: allowPendingReceipt });
  if (!receiptValidation.valid) throw new Error(`invalid backup receipt: ${receiptValidation.errors.join("; ")}`);
  assertReviewedTrustAnchors(receipt.trustedBindings, trustedRestoreAnchors);
  if (objectId !== receipt.objectId) throw new Error("requested object ID does not match receipt");
  const ciphertext = await objectStore.get(objectId);
  if (sha256(ciphertext) !== receipt.ciphertextSha256 || ciphertext.byteLength !== receipt.ciphertextByteLength) {
    throw new Error("downloaded ciphertext hash drift");
  }
  const archiveBytes = decryptArchive(
    ciphertext,
    key,
    decodeCanonicalBase64(receipt.encryption.nonceBase64, 12, "AES-GCM nonce"),
    decodeCanonicalBase64(receipt.encryption.tagBase64, 16, "AES-GCM tag"),
  );
  if (existsSync(restoreRoot)) throw new Error("restore target must not already exist");
  const temporaryRoot = `${path.resolve(restoreRoot)}.${randomUUID()}.tmp`;
  let archive;
  let validation;
  try {
    archive = writeArchive(archiveBytes, temporaryRoot);
    validation = validateRestoredArchive(archive, temporaryRoot, trustedBindingSubset(trustedRestoreAnchors));
    if (!validation.valid) throw new Error(`clean restore validation failed: ${validation.errors.join("; ")}`);
    renameSync(temporaryRoot, path.resolve(restoreRoot));
    assertNoFollowExistingAncestors(path.resolve(restoreRoot), "restore root after rename");
  } catch (error) {
    rmSync(temporaryRoot, { recursive: true, force: true });
    throw error;
  }
  return { ...validation, archiveSha256: sha256(archiveBytes) };
}

export function createBackupOperationBinding({ receiptBase, candidateReceipt }) {
  const supersedesChain = receiptBase?.supersedes && {
    previousReceiptSha256: receiptBase.supersedes.previousReceiptSha256,
    previousObjectId: receiptBase.supersedes.previousObjectId,
    previousObjectPreserved: receiptBase.supersedes.previousObjectPreserved,
  };
  return Object.fromEntries(Object.entries({
    bucket: receiptBase?.bucket,
    keyId: receiptBase?.keyId,
    objectId: receiptBase?.objectId,
    supersedes: supersedesChain,
    publicationOrder: receiptBase?.publicationOrder,
    toolVersion: receiptBase?.wranglerVersion,
    trustedBindings: receiptBase?.trustedBindings,
    receiptBaseSha256: sha256(Buffer.from(canonicalJson(receiptBase))),
    candidateReceiptSha256: sha256(Buffer.from(canonicalJson(candidateReceipt))),
  }).filter(([, value]) => value !== undefined));
}

export function reconcileRemoteVerifiedReceipt({ candidateReceipt, remoteRestored, previousObjectVerification, existingFinalReceipt = null, now = new Date().toISOString() }) {
  if (remoteRestored?.valid !== true || !HASH_PATTERN.test(remoteRestored?.archiveSha256 ?? "") || !Number.isSafeInteger(remoteRestored?.validatedFileCount)) throw new Error("fresh remote restore result is incomplete");
  if (previousObjectVerification?.unchanged !== true || previousObjectVerification?.objectId !== candidateReceipt?.supersedes?.previousObjectId || !HASH_PATTERN.test(previousObjectVerification?.ciphertextSha256 ?? "") || !Number.isSafeInteger(previousObjectVerification?.ciphertextByteLength)) throw new Error("fresh prior-object verification is incomplete");
  const remoteVerifiedAt = existingFinalReceipt?.cleanRestore?.remoteVerifiedAt ?? now;
  const verifiedPrior = { ...previousObjectVerification, verifiedAt: existingFinalReceipt?.supersedes?.previousObjectVerification?.verifiedAt ?? remoteVerifiedAt };
  const expected = {
    ...candidateReceipt,
    supersedes: { ...candidateReceipt.supersedes, previousObjectVerification: verifiedPrior },
    remoteState: "verified-clean-restore",
    uploadedAt: existingFinalReceipt?.uploadedAt ?? now,
    cleanRestore: {
      valid: true,
      validatedFileCount: remoteRestored.validatedFileCount,
      archiveSha256: remoteRestored.archiveSha256,
      verificationSource: "remote-object-clean-restore",
      remoteVerifiedAt,
      validatedAt: remoteVerifiedAt,
    },
  };
  if (existingFinalReceipt && canonicalJson(existingFinalReceipt) !== canonicalJson(expected)) throw new Error("resumed final receipt drifted from the fresh remote restore or prior-object proof");
  return expected;
}

export async function backupPrivateEvidence(options) {
  const {
    rollbackDirectory,
    rawInventoryPath,
    priorBindingPath,
    resolveRawObject,
    objectStore,
    bucket,
    key,
    keyId,
    objectId,
    wranglerVersion,
    restoreTestRoot,
    persistReceiptBeforeUpload,
    supersedes,
    trustedRestoreAnchors,
    persistReplacementState = async () => {},
    persistPreparedOperation = async () => {},
    resumePreparedOperation = null,
    getReplacementState = async () => "planned",
    getReplacementJournal = async () => null,
  } = options;
  if (!Buffer.isBuffer(key) || key.byteLength !== 32) throw new Error("FLORIVA_PRIVATE_BACKUP_KEY must decode to exactly 32 bytes");
  if (!bucket || !keyId || !/^[a-f0-9]{64}$/.test(objectId ?? "")) throw new Error("bucket, key ID, and 256-bit opaque object ID are required");
  if (typeof persistReceiptBeforeUpload !== "function") throw new Error("an atomic canonical receipt publisher is required after remote verification");
  if (objectStore?.capabilities?.conditionalCreate !== true || typeof objectStore.putIfAbsent !== "function") throw new Error("object store must provide provider-enforced conditional create semantics");
  if (!HASH_PATTERN.test(supersedes?.previousReceiptSha256 ?? "") || !/^(?:[a-f0-9]{32}|[a-f0-9]{64})$/.test(supersedes?.previousObjectId ?? "") || supersedes?.previousObjectPreserved !== true) throw new Error("exact preserved prior receipt/object supersession binding is required");
  if (supersedes.previousObjectId === objectId) throw new Error("replacement object ID must differ from the preserved prior object ID");
  const { archiveBytes, trustedBindings } = await packArchive({ rollbackDirectory, rawInventoryPath, priorBindingPath, resolveRawObject });
  assertReviewedTrustAnchors(trustedBindings, trustedRestoreAnchors);
  const previousObjectAtStart = await objectStore.get(supersedes.previousObjectId);
  if (!Buffer.isBuffer(previousObjectAtStart)) throw new Error("preserved prior object could not be read before replacement");
  const previousObjectSha256 = sha256(previousObjectAtStart);
  const previousObjectByteLength = previousObjectAtStart.byteLength;
  if (supersedes.previousCiphertextSha256 && supersedes.previousCiphertextSha256 !== previousObjectSha256) throw new Error("preserved prior object does not match the schema-1 receipt hash");
  if (Number.isSafeInteger(supersedes.previousCiphertextByteLength) && supersedes.previousCiphertextByteLength !== previousObjectByteLength) throw new Error("preserved prior object does not match the schema-1 receipt length");
  const previousObjectVerification = {
    objectId: supersedes.previousObjectId,
    ciphertextSha256: previousObjectSha256,
    ciphertextByteLength: previousObjectByteLength,
    verificationBasis: supersedes.previousCiphertextSha256 ? "schema-1-receipt-bound-bytes" : "operation-start-observed-bytes",
    requiredPostcondition: "byte-identical-after-replacement",
  };
  const effectiveSupersedes = { ...supersedes, previousObjectVerification };
  const encrypted = resumePreparedOperation ?? encryptArchive(archiveBytes, key);
  const ciphertext = encrypted.ciphertext;
  const nonce = encrypted.nonce ?? decodeCanonicalBase64(encrypted.receiptBase?.encryption?.nonceBase64, 12, "AES-GCM nonce");
  const tag = encrypted.tag ?? decodeCanonicalBase64(encrypted.receiptBase?.encryption?.tagBase64, 16, "AES-GCM tag");
  const generatedReceiptBase = {
    schemaVersion: 2,
    provider: "cloudflare-r2",
    bucket,
    objectId,
    ciphertextSha256: sha256(ciphertext),
    ciphertextByteLength: ciphertext.byteLength,
    encryption: {
      algorithm: "AES-256-GCM",
      version: 1,
      nonceBase64: nonce.toString("base64"),
      tagBase64: tag.toString("base64"),
    },
    keyId,
    wranglerVersion,
    preparedAt: new Date().toISOString(),
    publicationOrder: "remote-verified-before-canonical-receipt",
    remoteState: "pending-remote-verification",
    supersedes: effectiveSupersedes,
    trustedBindings,
  };
  const receiptBase = encrypted.receiptBase ?? generatedReceiptBase;
  if (receiptBase.bucket !== bucket || receiptBase.keyId !== keyId || receiptBase.wranglerVersion !== wranglerVersion || receiptBase.objectId !== objectId || receiptBase.publicationOrder !== "remote-verified-before-canonical-receipt" || receiptBase.ciphertextSha256 !== sha256(ciphertext) || receiptBase.ciphertextByteLength !== ciphertext.byteLength || canonicalJson(receiptBase.supersedes) !== canonicalJson(effectiveSupersedes) || canonicalJson(receiptBase.trustedBindings) !== canonicalJson(trustedBindings)) throw new Error("resumed prepared operation drifted from the planned object or reviewed inputs");
  const localCiphertextStore = { async get(requestedId) { if (requestedId !== objectId) throw new Error("unexpected local object ID"); return ciphertext; } };
  const remoteRestoreRoot = `${restoreTestRoot}.remote`;
  try {
    const restored = await restoreAndValidateBackup({ objectStore: localCiphertextStore, objectId, key, receipt: receiptBase, restoreRoot: restoreTestRoot, trustedRestoreAnchors, allowPendingReceipt: true });
    const candidateReceipt = encrypted.candidateReceipt ?? {
      ...receiptBase,
      localPreflightRestore: {
        valid: restored.valid,
        validatedFileCount: restored.validatedFileCount,
        archiveSha256: restored.archiveSha256,
        validatedAt: new Date().toISOString(),
      },
    };
    const operationBinding = createBackupOperationBinding({ receiptBase, candidateReceipt });
    if (resumePreparedOperation && canonicalJson(resumePreparedOperation.operationBinding) !== canonicalJson(operationBinding)) throw new Error("resumed prepared operation binding drifted from the exact receipt inputs");
    if (!resumePreparedOperation) await persistPreparedOperation({ ciphertext, receiptBase, candidateReceipt, operationBinding });
  const stateRank = { planned: 0, prepared: 1, "upload-intent": 2, "upload-uncertain": 2, "remote-present": 3, "remote-verified": 4, canonicalized: 5 };
  const ensureState = async (state, details = {}) => {
    const journal = await getReplacementJournal();
    if (journal && journal.replacement?.state !== "planned") {
      const validation = validateBackupReplacementState(journal, { expectedOperationBinding: operationBinding });
      if (!validation.valid) throw new Error(`replacement state journal drifted: ${validation.errors.join("; ")}`);
    }
    const current = await getReplacementState();
    if ((stateRank[current] ?? -1) >= stateRank[state]) return;
    await persistReplacementState({ state, objectId, operationBinding, ...details });
  };
  await ensureState("prepared", { ciphertextSha256: receiptBase.ciphertextSha256, ciphertextByteLength: ciphertext.byteLength, receiptBase, candidateReceipt });
  let downloaded;
  if (await objectStore.exists(objectId)) {
    downloaded = await objectStore.get(objectId);
    if (!Buffer.isBuffer(downloaded) || !downloaded.equals(ciphertext)) {
      await persistReplacementState({ state: "conflict", objectId, reason: "remote-object-differs-from-prepared-ciphertext" });
      throw new Error("existing remote object differs from the prepared ciphertext; refusing overwrite");
    }
    await ensureState("upload-intent", { reconciliation: "existing-object-read-before-write" });
  } else {
    await ensureState("upload-intent");
    try {
      await objectStore.putIfAbsent(objectId, ciphertext);
    } catch (error) {
      try {
        downloaded = await objectStore.get(objectId);
        if (!Buffer.isBuffer(downloaded) || !downloaded.equals(ciphertext)) {
          await persistReplacementState({ state: "conflict", objectId, reason: "ambiguous-upload-resolved-to-different-bytes" });
          throw new Error("ambiguous upload resolved to different remote bytes; refusing overwrite");
        }
      } catch (readError) {
        await persistReplacementState({ state: "upload-uncertain", objectId, reason: error.message });
        throw new Error(`conditional upload outcome is uncertain and remote equality could not be proven: ${readError.message}`);
      }
    }
    downloaded ??= await objectStore.get(objectId);
  }
  if (!Buffer.isBuffer(downloaded) || !downloaded.equals(ciphertext)) throw new Error("uploaded backup failed immediate byte verification");
  await ensureState("remote-present", { ciphertextSha256: sha256(downloaded) });
  const existingJournal = await getReplacementJournal();
  const pendingRemoteReceipt = { ...candidateReceipt, remoteState: "pending-remote-verification" };
  const remoteRestored = await restoreAndValidateBackup({ objectStore, objectId, key, receipt: pendingRemoteReceipt, restoreRoot: remoteRestoreRoot, trustedRestoreAnchors, allowPendingReceipt: true });
  const previousObjectAfter = await objectStore.get(supersedes.previousObjectId);
  if (!Buffer.isBuffer(previousObjectAfter) || !previousObjectAfter.equals(previousObjectAtStart)) throw new Error("preserved prior object changed during replacement");
  const remoteReceipt = reconcileRemoteVerifiedReceipt({
    candidateReceipt,
    remoteRestored,
    previousObjectVerification: { ...previousObjectVerification, unchanged: true },
    existingFinalReceipt: existingJournal?.replacement?.finalReceipt ?? null,
  });
  const finalValidation = validateBackupReceipt(remoteReceipt, { requireCleanRestore: true });
  if (!finalValidation.valid) throw new Error(`refusing canonical publication of invalid remote restore receipt: ${finalValidation.errors.join("; ")}`);
  if (canonicalJson(createBackupOperationBinding({ receiptBase, candidateReceipt })) !== canonicalJson(operationBinding)) throw new Error("final operation binding drifted immediately before publication");
  await ensureState("remote-verified", { finalReceipt: remoteReceipt, finalReceiptSha256: sha256(Buffer.from(`${JSON.stringify(remoteReceipt, null, 2)}\n`)) });
  await persistReceiptBeforeUpload(remoteReceipt);
  await ensureState("canonicalized", { finalReceiptSha256: sha256(Buffer.from(`${JSON.stringify(remoteReceipt, null, 2)}\n`)) });
  return remoteReceipt;
  } finally {
    rmSync(path.resolve(restoreTestRoot), { recursive: true, force: true });
    rmSync(path.resolve(remoteRestoreRoot), { recursive: true, force: true });
  }
}

export async function revalidateCanonicalizedBackup(options) {
  const {
    rollbackDirectory, rawInventoryPath, priorBindingPath, resolveRawObject,
    objectStore, bucket, key, keyId, objectId, wranglerVersion, receipt,
    expectedSupersedes, trustedRestoreAnchors, restoreTestRoot,
  } = options;
  if (!Buffer.isBuffer(key) || key.byteLength !== 32) throw new Error("FLORIVA_PRIVATE_BACKUP_KEY must decode to exactly 32 bytes");
  const validation = validateBackupReceipt(receipt, { requireCleanRestore: true });
  if (!validation.valid) throw new Error(`canonical backup receipt is invalid: ${validation.errors.join("; ")}`);
  if (!expectedSupersedes || expectedSupersedes.previousObjectId === objectId) throw new Error("canonical rerun requires a journal-bound prior object distinct from the replacement");
  const { trustedBindings } = await packArchive({ rollbackDirectory, rawInventoryPath, priorBindingPath, resolveRawObject });
  assertReviewedTrustAnchors(trustedBindings, trustedRestoreAnchors);
  assertCanonicalContext(receipt, {
    bucket, keyId, objectId, wranglerVersion, trustedBindings,
    supersedes: { previousReceiptSha256: expectedSupersedes.previousReceiptSha256, previousObjectId: expectedSupersedes.previousObjectId, previousObjectPreserved: expectedSupersedes.previousObjectPreserved },
    previousObjectVerification: expectedSupersedes.previousObjectVerification,
  });
  const priorVerification = receipt.supersedes?.previousObjectVerification;
  if (!priorVerification || priorVerification.objectId !== receipt.supersedes.previousObjectId || !HASH_PATTERN.test(priorVerification.ciphertextSha256 ?? "") || !Number.isSafeInteger(priorVerification.ciphertextByteLength)) throw new Error("canonical receipt lacks defensible prior-object preservation proof");
  const priorBefore = await objectStore.get(priorVerification.objectId);
  if (sha256(priorBefore) !== priorVerification.ciphertextSha256 || priorBefore.byteLength !== priorVerification.ciphertextByteLength) throw new Error("preserved prior object drifted before canonical rerun verification");
  const remoteRestoreRoot = `${restoreTestRoot}.remote`;
  try {
    const restored = await restoreAndValidateBackup({ objectStore, objectId, key, receipt, restoreRoot: remoteRestoreRoot, trustedRestoreAnchors });
    if (restored.archiveSha256 !== receipt.cleanRestore.archiveSha256 || restored.validatedFileCount !== receipt.cleanRestore.validatedFileCount) throw new Error("canonical clean restore receipt drifted from the fresh remote restore result");
    const priorAfter = await objectStore.get(priorVerification.objectId);
    if (!priorAfter.equals(priorBefore)) throw new Error("preserved prior object changed during canonical rerun verification");
    return restored;
  } finally {
    rmSync(path.resolve(restoreTestRoot), { recursive: true, force: true });
    rmSync(path.resolve(remoteRestoreRoot), { recursive: true, force: true });
  }
}

function runWrangler(args, options = {}) {
  const wranglerCli = path.join(process.cwd(), "node_modules", "wrangler", "bin", "wrangler.js");
  if (!existsSync(wranglerCli)) throw new Error("Wrangler JavaScript entrypoint is unavailable");
  const result = spawnSync(process.execPath, [wranglerCli, ...args], {
    cwd: options.cwd,
    encoding: options.encoding ?? "utf8",
    shell: false,
    maxBuffer: 1024 * 1024 * 100,
  });
  if (result.status !== 0) throw new Error(`Wrangler command failed with exit ${result.status}`);
  return result.stdout;
}

export class WranglerR2ObjectStore {
  constructor(bucket) {
    this.bucket = bucket;
    this.capabilities = { conditionalCreate: false };
  }
  async verifyBucket() {
    const output = runWrangler(["r2", "bucket", "list"]);
    if (!output.includes(`name:           ${this.bucket}`) && !output.includes(`"name":"${this.bucket}"`)) {
      throw new Error(`private R2 bucket ${this.bucket} does not exist`);
    }
  }
  async exists(objectId) {
    const temporaryRoot = await mkdtemp(path.join(os.tmpdir(), "floriva-r2-exists-"));
    const destination = path.join(temporaryRoot, "object.bin");
    const wranglerCli = path.join(process.cwd(), "node_modules", "wrangler", "bin", "wrangler.js");
    const result = spawnSync(process.execPath, [wranglerCli, "r2", "object", "get", `${this.bucket}/${objectId}`, "--file", destination, "--remote"], {
      encoding: "utf8", shell: false, maxBuffer: 1024 * 1024 * 10,
    });
    rmSync(temporaryRoot, { recursive: true, force: true });
    if (result.status === 0) return true;
    const output = `${result.stdout ?? ""}${result.stderr ?? ""}`;
    if (isMissingR2ObjectOutput(output)) return false;
    throw new Error("failed to check private R2 object existence");
  }
  async put(objectId, bytes) {
    const temporaryRoot = await mkdtemp(path.join(os.tmpdir(), "floriva-r2-put-"));
    const source = path.join(temporaryRoot, "ciphertext.bin");
    writeFileSync(source, bytes);
    try {
      runWrangler(["r2", "object", "put", `${this.bucket}/${objectId}`, "--file", source, "--remote"]);
    } finally {
      rmSync(temporaryRoot, { recursive: true, force: true });
    }
  }
  async putIfAbsent(objectId, bytes) {
    void objectId;
    void bytes;
    throw new Error("Wrangler R2 object put has no provider-enforced conditional create and is blocked fail-closed");
  }
  async get(objectId) {
    const temporaryRoot = await mkdtemp(path.join(os.tmpdir(), "floriva-r2-get-"));
    const destination = path.join(temporaryRoot, "ciphertext.bin");
    try {
      runWrangler(["r2", "object", "get", `${this.bucket}/${objectId}`, "--file", destination, "--remote"]);
      return readFileSync(destination);
    } finally {
      rmSync(temporaryRoot, { recursive: true, force: true });
    }
  }
}

function isS3Missing(error) {
  return error?.$metadata?.httpStatusCode === 404 || ["NotFound", "NoSuchKey"].includes(error?.name);
}

function isS3PreconditionFailure(error) {
  return error?.$metadata?.httpStatusCode === 412 || ["PreconditionFailed", "ConditionalRequestConflict"].includes(error?.name);
}

async function s3BodyToBuffer(body) {
  if (!body) throw new Error("S3 object body is missing");
  if (Buffer.isBuffer(body)) return body;
  if (typeof body.transformToByteArray === "function") return Buffer.from(await body.transformToByteArray());
  const chunks = [];
  for await (const chunk of body) chunks.push(Buffer.from(chunk));
  return Buffer.concat(chunks);
}

export class ConditionalR2S3ObjectStore {
  constructor(bucket, options = {}) {
    this.bucket = bucket;
    this.capabilities = { conditionalCreate: true };
    this.client = options.client ?? new S3Client({
      region: "auto",
      endpoint: options.endpoint,
      credentials: { accessKeyId: options.accessKeyId, secretAccessKey: options.secretAccessKey },
    });
  }
  async verifyBucket() {
    await this.client.send(new HeadBucketCommand({ Bucket: this.bucket }));
  }
  async exists(objectId) {
    try {
      await this.client.send(new HeadObjectCommand({ Bucket: this.bucket, Key: objectId }));
      return true;
    } catch (error) {
      if (isS3Missing(error)) return false;
      throw error;
    }
  }
  async putIfAbsent(objectId, bytes) {
    try {
      return await this.client.send(new PutObjectCommand({ Bucket: this.bucket, Key: objectId, Body: bytes, IfNoneMatch: "*" }));
    } catch (error) {
      if (isS3PreconditionFailure(error)) {
        const conflict = new Error("conditional R2 create was refused because the key already exists");
        conflict.code = "PRECONDITION_FAILED";
        throw conflict;
      }
      throw error;
    }
  }
  async get(objectId) {
    const response = await this.client.send(new GetObjectCommand({ Bucket: this.bucket, Key: objectId }));
    return s3BodyToBuffer(response.Body);
  }
}

export function validateR2S3Endpoint(value) {
  let endpoint;
  try { endpoint = new URL(value); } catch { throw new Error("Cloudflare R2 S3 endpoint must be a valid HTTPS URL"); }
  if (endpoint.protocol !== "https:") throw new Error("Cloudflare R2 S3 endpoint must use HTTPS");
  if (!/^[a-f0-9]{32}(?:\.(?:eu|fedramp))?\.r2\.cloudflarestorage\.com$/.test(endpoint.hostname) || endpoint.port || endpoint.pathname !== "/" || endpoint.search || endpoint.hash || endpoint.username || endpoint.password) {
    throw new Error("Cloudflare R2 S3 endpoint must use the exact account-level HTTPS hostname shape");
  }
  return endpoint.origin;
}

function validateBridgeBucketName(value) {
  if (typeof value !== "string" || !/^[a-z0-9][a-z0-9.-]{1,61}[a-z0-9]$/.test(value) || value.includes("..")) {
    throw new Error("local R2 bridge bucket name is invalid");
  }
  return value;
}

function validateBridgeBearerSecret(value) {
  if (typeof value !== "string" || !/^[A-Za-z0-9_-]{43,128}$/.test(value)) {
    throw new Error("local R2 bridge bearer secret must be a fresh base64url runtime secret of at least 32 bytes");
  }
  return value;
}

function validateBridgeReadableObjectId(value) {
  if (typeof value !== "string" || !/^(?:[a-f0-9]{32}|[a-f0-9]{64})$/.test(value)) {
    throw new Error("local R2 bridge readable object ID must be exactly 32 or 64 lowercase hexadecimal characters");
  }
  return value;
}

function validateBridgeReplacementObjectId(value) {
  if (typeof value !== "string" || !HASH_PATTERN.test(value)) {
    throw new Error("local R2 bridge replacement object ID must be exactly 64 lowercase hexadecimal characters");
  }
  return value;
}

export function validateLocalR2BridgeEndpoint(value) {
  let endpoint;
  try { endpoint = new URL(value); } catch { throw new Error("local R2 bridge endpoint must be a valid loopback URL"); }
  if (
    endpoint.protocol !== "http:" ||
    !["127.0.0.1", "[::1]"].includes(endpoint.hostname) ||
    !endpoint.port ||
    endpoint.pathname !== "/" ||
    endpoint.search ||
    endpoint.hash ||
    endpoint.username ||
    endpoint.password
  ) {
    throw new Error("local R2 bridge endpoint must be exact HTTP loopback origin with an explicit port");
  }
  return endpoint.origin;
}

function localR2BridgeRuntimeRoot(repoRoot) {
  return path.join(
    path.resolve(repoRoot),
    ".floriva-private",
    "seo-ai-seo-recovery",
    "2026-07-22",
    "r2-bridge-runtime",
  );
}

export function createLocalR2BridgeRuntimeSecretFile(repoRoot = process.cwd()) {
  const runtimeRoot = localR2BridgeRuntimeRoot(repoRoot);
  assertNoFollowExistingAncestors(runtimeRoot, "local R2 bridge runtime root");
  mkdirSync(runtimeRoot, { recursive: true });
  assertNoFollowExistingAncestors(runtimeRoot, "local R2 bridge runtime root after mkdir");
  if (lstatSync(runtimeRoot).isSymbolicLink()) throw new Error("local R2 bridge runtime root is reparse-backed");
  const bearerSecret = randomBytes(32).toString("base64url");
  validateBridgeBearerSecret(bearerSecret);
  const envFilePath = path.join(runtimeRoot, `bridge-${randomBytes(16).toString("hex")}.env`);
  assertNoFollowExistingAncestors(envFilePath, "local R2 bridge runtime env file");
  writeFileSync(envFilePath, `BRIDGE_BEARER_SECRET=${bearerSecret}\n`, {
    encoding: "utf8",
    flag: "wx",
    mode: 0o600,
  });
  const metadata = lstatSync(envFilePath);
  if (!metadata.isFile() || metadata.isSymbolicLink()) {
    rmSync(envFilePath, { force: true });
    throw new Error("local R2 bridge runtime env file is not a regular file");
  }
  return {
    bearerSecret,
    envFilePath,
    wranglerEnvArgs: ["--env-file", envFilePath],
  };
}

export function removeLocalR2BridgeRuntimeSecretFile(repoRoot, envFilePath) {
  const runtimeRoot = localR2BridgeRuntimeRoot(repoRoot);
  const absolute = path.resolve(envFilePath);
  if (
    path.dirname(absolute).toLowerCase() !== path.resolve(runtimeRoot).toLowerCase() ||
    !/^bridge-[a-f0-9]{32}\.env$/.test(path.basename(absolute))
  ) {
    throw new Error("refusing to remove a non-task-private local R2 bridge runtime env file");
  }
  assertNoFollowExistingAncestors(absolute, "local R2 bridge runtime env file cleanup");
  if (!existsSync(absolute)) return;
  const metadata = lstatSync(absolute);
  if (!metadata.isFile() || metadata.isSymbolicLink()) {
    throw new Error("refusing to remove a reparse-backed local R2 bridge runtime env file");
  }
  rmSync(absolute, { force: true });
}

function bridgeResponseError(response, operation) {
  const error = new Error(`local R2 bridge ${operation} failed closed with HTTP ${response.status}`);
  error.code = response.status === 401 ? "BRIDGE_AUTH_FAILED" : "BRIDGE_REQUEST_FAILED";
  return error;
}

export class LocalR2BridgeObjectStore {
  constructor(bucket, options = {}) {
    this.bucket = validateBridgeBucketName(bucket);
    this.endpoint = validateLocalR2BridgeEndpoint(options.endpoint);
    this.bearerSecret = validateBridgeBearerSecret(options.bearerSecret);
    this.fetchImpl = options.fetchImpl ?? globalThis.fetch;
    if (typeof this.fetchImpl !== "function") throw new Error("local R2 bridge fetch implementation is unavailable");
    this.capabilities = { conditionalCreate: true };
  }

  requestHeaders(objectId = null) {
    const headers = new Headers({
      authorization: `Bearer ${this.bearerSecret}`,
      "x-floriva-r2-bucket": this.bucket,
    });
    if (objectId !== null) {
      headers.set("x-floriva-object-id", validateBridgeReadableObjectId(objectId));
    }
    return headers;
  }

  validateBindingHeaders(response, objectId = null) {
    if (response.headers.get("x-floriva-r2-bucket") !== this.bucket) {
      throw new Error("local R2 bridge response bucket binding failed");
    }
    if (objectId !== null && response.headers.get("x-floriva-object-id") !== objectId) {
      throw new Error("local R2 bridge response object binding failed");
    }
  }

  async verifyBucket() {
    const response = await this.fetchImpl(`${this.endpoint}/v1/bucket`, {
      method: "HEAD",
      headers: this.requestHeaders(),
      redirect: "error",
    });
    if (!response.ok) throw bridgeResponseError(response, "bucket verification");
    this.validateBindingHeaders(response);
  }

  async exists(objectId) {
    const id = validateBridgeReadableObjectId(objectId);
    const response = await this.fetchImpl(`${this.endpoint}/v1/objects/${id}`, {
      method: "HEAD",
      headers: this.requestHeaders(id),
      redirect: "error",
    });
    if (response.status === 404) {
      this.validateBindingHeaders(response, id);
      return false;
    }
    if (!response.ok) throw bridgeResponseError(response, "head");
    this.validateBindingHeaders(response, id);
    const byteLength = Number(response.headers.get("x-floriva-byte-length"));
    const checksum = response.headers.get("x-floriva-sha256");
    if (
      !Number.isSafeInteger(byteLength) ||
      byteLength < 1 ||
      byteLength > MAX_BRIDGE_OBJECT_BYTES ||
      !HASH_PATTERN.test(checksum ?? "")
    ) {
      throw new Error("local R2 bridge head response lacks bounded length/checksum integrity");
    }
    return true;
  }

  async putIfAbsent(objectId, bytes) {
    const id = validateBridgeReplacementObjectId(objectId);
    if (Number.isSafeInteger(bytes?.byteLength) && bytes.byteLength > MAX_BRIDGE_OBJECT_BYTES) {
      throw new Error("local R2 bridge refuses an object larger than 128 MiB");
    }
    const body = Buffer.from(bytes);
    if (body.length < 1) throw new Error("local R2 bridge refuses an empty object");
    if (body.length > MAX_BRIDGE_OBJECT_BYTES) throw new Error("local R2 bridge refuses an object larger than 128 MiB");
    const checksum = sha256(body);
    const headers = this.requestHeaders(id);
    headers.set("content-type", "application/octet-stream");
    headers.set("content-length", String(body.length));
    headers.set("x-floriva-byte-length", String(body.length));
    headers.set("x-floriva-sha256", checksum);
    headers.set("if-none-match", "*");
    const response = await this.fetchImpl(`${this.endpoint}/v1/objects/${id}`, {
      method: "PUT",
      headers,
      body,
      redirect: "error",
    });
    if (response.status === 412) {
      this.validateBindingHeaders(response, id);
      const conflict = new Error("conditional R2 create was refused because the key already exists");
      conflict.code = "PRECONDITION_FAILED";
      throw conflict;
    }
    if (!response.ok) throw bridgeResponseError(response, "conditional put");
    this.validateBindingHeaders(response, id);
    if (
      response.headers.get("x-floriva-sha256") !== checksum ||
      response.headers.get("x-floriva-byte-length") !== String(body.length)
    ) {
      throw new Error("local R2 bridge conditional put verification drifted from requested bytes");
    }
  }

  async get(objectId) {
    const id = validateBridgeReadableObjectId(objectId);
    const response = await this.fetchImpl(`${this.endpoint}/v1/objects/${id}`, {
      method: "GET",
      headers: this.requestHeaders(id),
      redirect: "error",
    });
    if (!response.ok) throw bridgeResponseError(response, "get");
    this.validateBindingHeaders(response, id);
    const expectedLength = Number(response.headers.get("x-floriva-byte-length"));
    const contentLength = Number(response.headers.get("content-length"));
    const expectedChecksum = response.headers.get("x-floriva-sha256");
    if (
      !Number.isSafeInteger(expectedLength) ||
      expectedLength < 1 ||
      expectedLength > MAX_BRIDGE_OBJECT_BYTES ||
      contentLength > MAX_BRIDGE_OBJECT_BYTES ||
      contentLength !== expectedLength ||
      !HASH_PATTERN.test(expectedChecksum ?? "")
    ) {
      throw new Error("local R2 bridge read response lacks bounded length/checksum integrity");
    }
    const bytes = Buffer.from(await response.arrayBuffer());
    if (bytes.length !== expectedLength) throw new Error("local R2 bridge read length integrity check failed");
    if (sha256(bytes) !== expectedChecksum) throw new Error("local R2 bridge read SHA-256 checksum integrity check failed");
    return bytes;
  }
}

export function createConditionalR2ObjectStore(bucket, env = process.env, options = {}) {
  const selector = env.FLORIVA_PRIVATE_BACKUP_OBJECT_STORE;
  if (!selector) {
    throw new Error("FLORIVA_PRIVATE_BACKUP_OBJECT_STORE explicit selector is required");
  }
  if (selector === "local-r2-bridge") {
    const endpoint = env.R2_LOCAL_BRIDGE_ENDPOINT;
    const bearerSecret = env.R2_LOCAL_BRIDGE_BEARER_SECRET;
    if (!endpoint || !bearerSecret) {
      throw new Error("R2_LOCAL_BRIDGE_ENDPOINT and R2_LOCAL_BRIDGE_BEARER_SECRET are required for the local R2 bridge");
    }
    return new LocalR2BridgeObjectStore(bucket, {
      endpoint,
      bearerSecret,
      fetchImpl: options.fetchImpl,
    });
  }
  if (selector !== "s3") {
    throw new Error(`unsupported FLORIVA_PRIVATE_BACKUP_OBJECT_STORE selector: ${selector}`);
  }
  const endpoint = env.R2_S3_ENDPOINT;
  const accessKeyId = env.R2_ACCESS_KEY_ID;
  const secretAccessKey = env.R2_SECRET_ACCESS_KEY;
  if (!endpoint || !accessKeyId || !secretAccessKey) throw new Error("R2_S3_ENDPOINT, R2_ACCESS_KEY_ID, and R2_SECRET_ACCESS_KEY are required for provider-enforced conditional create");
  return new ConditionalR2S3ObjectStore(bucket, { endpoint: validateR2S3Endpoint(endpoint), accessKeyId, secretAccessKey, ...options });
}

export function isMissingR2ObjectOutput(output) {
  return /not found|object does not exist|specified key does not exist|404/i.test(String(output));
}

function atomicWriteJson(targetPath, value) {
  const absolute = path.resolve(targetPath);
  const parent = path.dirname(absolute);
  assertNoFollowExistingAncestors(parent, "atomic JSON parent");
  mkdirSync(parent, { recursive: true });
  assertNoFollowExistingAncestors(parent, "atomic JSON parent after mkdir");
  if (existsSync(absolute)) readSafeBytes(absolute, "existing atomic JSON target");
  const temporaryPath = path.join(parent, `.${path.basename(absolute)}.${randomUUID()}.tmp`);
  assertNoFollowExistingAncestors(temporaryPath, "atomic JSON temporary path");
  writeFileSync(temporaryPath, `${JSON.stringify(value, null, 2)}\n`, { flag: "wx" });
  try {
    const temporaryMetadata = lstatSync(temporaryPath);
    if (!temporaryMetadata.isFile() || temporaryMetadata.isSymbolicLink()) throw new Error("atomic JSON temporary path became a reparse point");
    assertNoFollowExistingAncestors(parent, "atomic JSON parent before rename");
    renameSync(temporaryPath, absolute);
    readSafeBytes(absolute, "atomic JSON target after rename");
  } catch (error) {
    rmSync(temporaryPath, { force: true });
    throw error;
  }
}

function assertCanonicalContext(receipt, context) {
  if (!context) throw new Error("exact current canonical receipt context is required for schema-2 recovery or rerun");
  const fields = ["bucket", "keyId", "objectId", "wranglerVersion"];
  for (const field of fields) if (receipt?.[field] !== context?.[field]) throw new Error(`canonical receipt current ${field} drifted`);
  if (receipt?.publicationOrder !== "remote-verified-before-canonical-receipt") throw new Error("canonical receipt publication order drifted");
  if (canonicalJson(receipt?.trustedBindings) !== canonicalJson(context?.trustedBindings)) throw new Error("canonical receipt current trusted anchors drifted");
  if (canonicalJson(receipt?.supersedes && { previousReceiptSha256: receipt.supersedes.previousReceiptSha256, previousObjectId: receipt.supersedes.previousObjectId, previousObjectPreserved: receipt.supersedes.previousObjectPreserved }) !== canonicalJson(context?.supersedes)) throw new Error("canonical receipt supersedes chain drifted");
  if (context.previousObjectVerification) {
    const actual = receipt?.supersedes?.previousObjectVerification;
    const expected = context.previousObjectVerification;
    if (actual?.objectId !== expected.objectId || actual?.ciphertextSha256 !== expected.ciphertextSha256 || actual?.ciphertextByteLength !== expected.ciphertextByteLength || actual?.unchanged !== true) throw new Error("canonical receipt prior-object preservation proof drifted from the replacement journal");
  }
}

export function prepareReceiptSupersession({ receiptPath, supersessionPath, replacementObjectId, now = new Date().toISOString(), expectedCanonicalContext, expectedReplacementContext }) {
  if (!/^[a-f0-9]{64}$/.test(replacementObjectId ?? "")) throw new Error("a non-null 256-bit planned replacement object ID is required");
  assertNoFollowExistingAncestors(receiptPath, "canonical receipt path");
  assertNoFollowExistingAncestors(supersessionPath, "replacement journal path");
  if (!existsSync(receiptPath)) {
    if (existsSync(supersessionPath)) return readSafeJson(supersessionPath, "replacement journal");
    return null;
  }
  const previousBytes = readSafeBytes(receiptPath, "canonical receipt");
  const previousReceipt = JSON.parse(previousBytes.toString("utf8"));
  if (existsSync(supersessionPath)) {
    const existing = readSafeJson(supersessionPath, "replacement journal");
    if (previousReceipt.schemaVersion === 2) {
      const journalValidation = validateBackupReplacementState(existing);
      if (!journalValidation.valid) throw new Error(`schema-2 canonical receipt replacement journal is invalid: ${journalValidation.errors.join("; ")}`);
      assertCanonicalContext(previousReceipt, expectedCanonicalContext);
      const exactReceiptMatch = existing.replacement?.plannedObjectId === previousReceipt.objectId && existing.replacement?.finalReceiptSha256 === sha256(previousBytes) && canonicalJson(existing.replacement?.finalReceipt) === canonicalJson(previousReceipt);
      if (!exactReceiptMatch || !["remote-verified", "canonicalized"].includes(existing.replacement?.state)) throw new Error("schema-2 canonical receipt does not exactly match the remote-verified replacement journal");
      if (existing.replacement.state === "remote-verified") {
        return { ...existing, canonicalReceiptNeedsRecovery: true, recoveredCanonicalCrashWindow: true };
      }
      return { ...existing, alreadyCanonicalized: true };
    }
    if (previousReceipt.schemaVersion !== 1 || existing.previousReceiptSha256 !== sha256(previousBytes) || existing.previousReceipt?.objectId !== previousReceipt.objectId || existing.previousObjectPreservation?.preserved !== true) throw new Error("tracked supersession record does not exactly preserve the canonical old receipt");
    if (existing.replacement?.plannedObjectId && existing.replacement.plannedObjectId !== replacementObjectId) throw new Error("existing planned replacement object ID is authoritative for retries");
    if (expectedReplacementContext && (previousReceipt.bucket !== expectedReplacementContext.bucket || existing.previousReceipt?.bucket !== expectedReplacementContext.bucket)) throw new Error("planned replacement bucket does not exactly match the schema-1 canonical receipt");
    const plannedContext = expectedReplacementContext && { bucket: expectedReplacementContext.bucket, keyId: expectedReplacementContext.keyId, toolVersion: expectedReplacementContext.toolVersion };
    if (existing.plannedContext && plannedContext && canonicalJson(existing.plannedContext) !== canonicalJson(plannedContext)) throw new Error("planned replacement context drifted");
    if ((!existing.previousReceiptBytesBase64 || !existing.plannedContext || !existing.previousObjectPreservation?.ciphertextSha256) && existing.replacement?.state === "planned") {
      const migrated = {
        ...existing,
        previousReceiptBytesBase64: previousBytes.toString("base64"),
        ...(plannedContext ? { plannedContext } : {}),
        previousObjectPreservation: {
          ...existing.previousObjectPreservation,
          ...(HASH_PATTERN.test(previousReceipt.ciphertextSha256 ?? "") ? { ciphertextSha256: previousReceipt.ciphertextSha256 } : {}),
          ...(Number.isSafeInteger(previousReceipt.ciphertextByteLength) ? { ciphertextByteLength: previousReceipt.ciphertextByteLength } : {}),
        },
      };
      atomicWriteJson(supersessionPath, migrated);
      return migrated;
    }
    return existing;
  }
  if (previousReceipt.schemaVersion !== 1 || previousReceipt.provider !== "cloudflare-r2" || !previousReceipt.objectId) throw new Error("only the expected schema-1 Cloudflare R2 receipt may be superseded");
  const record = {
    schemaVersion: 2,
    supersessionType: "immutable-r2-receipt-supersession",
    createdAt: now,
    previousReceiptSha256: sha256(previousBytes),
    previousReceiptBytesBase64: previousBytes.toString("base64"),
    previousReceipt,
    ...(expectedReplacementContext ? { plannedContext: { bucket: expectedReplacementContext.bucket, keyId: expectedReplacementContext.keyId, toolVersion: expectedReplacementContext.toolVersion } } : {}),
    previousObjectPreservation: { objectId: previousReceipt.objectId, preserved: true, deletionAuthorized: false, ...(HASH_PATTERN.test(previousReceipt.ciphertextSha256 ?? "") ? { ciphertextSha256: previousReceipt.ciphertextSha256 } : {}), ...(Number.isSafeInteger(previousReceipt.ciphertextByteLength) ? { ciphertextByteLength: previousReceipt.ciphertextByteLength } : {}) },
    replacement: { plannedObjectId: replacementObjectId, state: "planned", canonicalReceiptWrittenOnlyAfterRemoteVerification: true, remoteValidationRequired: true },
  };
  atomicWriteJson(supersessionPath, record);
  return record;
}

export function validateBackupReplacementState(value, options = {}) {
  const errors = [];
  const states = ["planned", "prepared", "upload-intent", "upload-uncertain", "remote-present", "remote-verified", "canonicalized", "conflict"];
  if (value?.schemaVersion !== 2 || value?.supersessionType !== "immutable-r2-receipt-supersession") errors.push("replacement state journal schema is invalid");
  if (!HASH_PATTERN.test(value?.previousReceiptSha256 ?? "") || value?.previousObjectPreservation?.preserved !== true || value?.previousObjectPreservation?.deletionAuthorized !== false) errors.push("previous receipt/object preservation is invalid");
  if (!value?.previousReceipt?.objectId || value?.previousObjectPreservation?.objectId !== value.previousReceipt.objectId) errors.push("preserved prior object ID does not exactly match the prior receipt");
  if (HASH_PATTERN.test(value?.previousReceipt?.ciphertextSha256 ?? "") && value?.previousObjectPreservation?.ciphertextSha256 !== value.previousReceipt.ciphertextSha256) errors.push("preserved prior object hash does not exactly match the prior receipt");
  if (Number.isSafeInteger(value?.previousReceipt?.ciphertextByteLength) && value?.previousObjectPreservation?.ciphertextByteLength !== value.previousReceipt.ciphertextByteLength) errors.push("preserved prior object length does not exactly match the prior receipt");
  if (!["planned", "conflict"].includes(value?.replacement?.state) && !value?.previousReceiptBytesBase64) errors.push("exact previous canonical receipt bytes are required after planned migration");
  if (value?.previousReceiptBytesBase64) {
    const previousBytes = Buffer.from(value.previousReceiptBytesBase64, "base64");
    if (previousBytes.toString("base64") !== value.previousReceiptBytesBase64 || sha256(previousBytes) !== value.previousReceiptSha256 || canonicalJson(JSON.parse(previousBytes.toString("utf8"))) !== canonicalJson(value.previousReceipt)) errors.push("previous canonical receipt bytes are not exactly preserved");
  }
  if (!/^[a-f0-9]{64}$/.test(value?.replacement?.plannedObjectId ?? "") || !states.includes(value?.replacement?.state)) errors.push("planned replacement state is invalid");
  if (value?.replacement?.plannedObjectId === value?.previousObjectPreservation?.objectId) errors.push("replacement object ID must differ from the preserved prior object ID");
  if (!["planned", "conflict"].includes(value?.replacement?.state)) {
    const binding = value?.replacement?.operationBinding;
    if (!binding || binding.objectId !== value.replacement.plannedObjectId || !binding.bucket || !binding.keyId || !binding.toolVersion || binding.publicationOrder !== "remote-verified-before-canonical-receipt" || !HASH_PATTERN.test(binding.receiptBaseSha256 ?? "") || !HASH_PATTERN.test(binding.candidateReceiptSha256 ?? "") || !HASH_PATTERN.test(binding?.supersedes?.previousReceiptSha256 ?? "") || !binding?.supersedes?.previousObjectId || binding?.supersedes?.previousObjectPreserved !== true || TRUSTED_BINDING_NAMES.some((name) => !HASH_PATTERN.test(binding?.trustedBindings?.[name] ?? ""))) errors.push("replacement operation binding is invalid");
    if (binding && (binding.supersedes.previousReceiptSha256 !== value.previousReceiptSha256 || binding.supersedes.previousObjectId !== value.previousObjectPreservation.objectId || binding.supersedes.previousObjectPreserved !== true)) errors.push("replacement operation binding drifted from the journal prior-object chain");
    if (value?.replacement?.receiptBase && sha256(Buffer.from(canonicalJson(value.replacement.receiptBase))) !== binding?.receiptBaseSha256) errors.push("replacement receipt base drifted from its operation binding");
    if (value?.replacement?.candidateReceipt && sha256(Buffer.from(canonicalJson(value.replacement.candidateReceipt))) !== binding?.candidateReceiptSha256) errors.push("replacement candidate receipt drifted from its operation binding");
  }
  if (options.expectedOperationBinding && canonicalJson(value?.replacement?.operationBinding) !== canonicalJson(options.expectedOperationBinding)) errors.push("replacement operation binding drifted from current inputs");
  if (["remote-verified", "canonicalized"].includes(value?.replacement?.state)) {
    const finalReceipt = value?.replacement?.finalReceipt;
    const finalBytes = Buffer.from(`${JSON.stringify(finalReceipt, null, 2)}\n`);
    if (!finalReceipt || value?.replacement?.finalReceiptSha256 !== sha256(finalBytes)) errors.push("remote-verified final receipt bytes/hash are not exact");
    else {
      const finalValidation = validateBackupReceipt(finalReceipt, { requireCleanRestore: true });
      if (!finalValidation.valid) errors.push(`remote-verified final receipt is invalid: ${finalValidation.errors.join("; ")}`);
      const binding = value.replacement.operationBinding;
      if (binding && (finalReceipt.bucket !== binding.bucket || finalReceipt.keyId !== binding.keyId || finalReceipt.objectId !== binding.objectId || finalReceipt.wranglerVersion !== binding.toolVersion || finalReceipt.publicationOrder !== binding.publicationOrder || canonicalJson(finalReceipt.trustedBindings) !== canonicalJson(binding.trustedBindings))) errors.push("remote-verified final receipt drifted from the operation binding");
      if (value.replacement.candidateReceipt) {
        for (const [key, candidateValue] of Object.entries(value.replacement.candidateReceipt)) {
          if (key === "remoteState") continue;
          if (key === "supersedes") {
            const core = (entry) => ({ previousReceiptSha256: entry?.previousReceiptSha256, previousObjectId: entry?.previousObjectId, previousObjectPreserved: entry?.previousObjectPreserved });
            if (canonicalJson(core(finalReceipt.supersedes)) !== canonicalJson(core(candidateValue))) errors.push("remote-verified final receipt drifted from candidate supersedes chain");
          } else if (canonicalJson(finalReceipt[key]) !== canonicalJson(candidateValue)) errors.push(`remote-verified final receipt drifted from candidate field ${key}`);
        }
      }
    }
  }
  if (options.canonicalReceipt && sha256(Buffer.from(`${JSON.stringify(options.canonicalReceipt)}\n`)) !== value.previousReceiptSha256 && canonicalJson(options.canonicalReceipt) !== canonicalJson(value.previousReceipt)) errors.push("canonical old receipt drifted during replacement");
  return { valid: errors.length === 0, errors };
}

export function transitionBackupReplacementState(supersessionPath, nextState, details = {}) {
  const journal = readSafeJson(supersessionPath, "replacement state journal");
  const allowed = {
    planned: ["planned", "prepared", "conflict"],
    prepared: ["prepared", "upload-intent", "conflict"],
    "upload-intent": ["upload-intent", "upload-uncertain", "remote-present", "conflict"],
    "upload-uncertain": ["upload-uncertain", "upload-intent", "remote-present", "conflict"],
    "remote-present": ["remote-present", "remote-verified", "conflict"],
    "remote-verified": ["remote-verified", "canonicalized", "conflict"],
    canonicalized: ["canonicalized"],
    conflict: ["conflict"],
  };
  if (!allowed[journal.replacement?.state]?.includes(nextState)) throw new Error(`non-monotonic replacement state transition: ${journal.replacement?.state} -> ${nextState}`);
  if (details.plannedObjectId && details.plannedObjectId !== journal.replacement?.plannedObjectId) throw new Error("replacement planned object ID is immutable");
  if (journal.replacement?.operationBinding && details.operationBinding && canonicalJson(journal.replacement.operationBinding) !== canonicalJson(details.operationBinding)) throw new Error("replacement operation binding is immutable");
  const replacement = { ...journal.replacement, ...details, state: nextState, updatedAt: new Date().toISOString() };
  if (["remote-present", "remote-verified", "canonicalized"].includes(nextState)) {
    delete replacement.reason;
  }
  const updated = { ...journal, replacement };
  const validation = validateBackupReplacementState(updated, details.operationBinding ? { expectedOperationBinding: details.operationBinding } : {});
  if (!validation.valid) throw new Error(`invalid replacement state journal: ${validation.errors.join("; ")}`);
  atomicWriteJson(supersessionPath, updated);
  return updated;
}

export function persistPreparedBackupOperation(directory, objectId, prepared) {
  if (!/^[a-f0-9]{64}$/.test(objectId ?? "")) throw new Error("prepared backup object ID is invalid");
  assertNoFollowExistingAncestors(path.dirname(path.resolve(directory)), "prepared operation parent");
  mkdirSync(directory, { recursive: true });
  assertNoFollowExistingAncestors(directory, "prepared operation directory");
  const payloadPath = path.join(directory, `${objectId}.prepared.json`);
  const metadata = {
    schemaVersion: 2,
    objectId,
    ciphertextSha256: sha256(prepared.ciphertext),
    ciphertextByteLength: prepared.ciphertext.byteLength,
    ciphertextBase64: prepared.ciphertext.toString("base64"),
    receiptBase: prepared.receiptBase,
    candidateReceipt: prepared.candidateReceipt,
    operationBinding: prepared.operationBinding ?? createBackupOperationBinding(prepared),
  };
  if (existsSync(payloadPath)) {
    const existing = loadPreparedBackupOperation(directory, objectId);
    if (!existing.ciphertext.equals(prepared.ciphertext) || canonicalJson(existing.receiptBase) !== canonicalJson(prepared.receiptBase) || canonicalJson(existing.candidateReceipt) !== canonicalJson(prepared.candidateReceipt) || canonicalJson(existing.operationBinding) !== canonicalJson(metadata.operationBinding)) throw new Error("prepared backup retry material drifted");
    return metadata;
  }
  atomicWriteJson(payloadPath, metadata);
  return metadata;
}

export function loadPreparedBackupOperation(directory, objectId) {
  const payloadPath = assertNoFollowComponents(directory, `${objectId}.prepared.json`, "prepared operation payload");
  const metadata = JSON.parse(readFileSync(payloadPath, "utf8"));
  const ciphertext = Buffer.from(metadata.ciphertextBase64 ?? "", "base64");
  const expectedBinding = createBackupOperationBinding({ receiptBase: metadata.receiptBase, candidateReceipt: metadata.candidateReceipt });
  if (metadata.schemaVersion !== 2 || metadata.objectId !== objectId || metadata.ciphertextBase64 !== ciphertext.toString("base64") || metadata.ciphertextSha256 !== sha256(ciphertext) || metadata.ciphertextByteLength !== ciphertext.byteLength || metadata.receiptBase?.objectId !== objectId || canonicalJson(metadata.operationBinding) !== canonicalJson(expectedBinding)) throw new Error("prepared backup operation is corrupt or does not match the exact planned operation");
  return { ciphertext, receiptBase: metadata.receiptBase, candidateReceipt: metadata.candidateReceipt, operationBinding: metadata.operationBinding };
}

function parseArgs(argv) {
  const values = {};
  for (let index = 0; index < argv.length; index += 1) {
    if (!argv[index].startsWith("--")) continue;
    const key = argv[index].slice(2);
    if (argv[index + 1]?.startsWith("--") || argv[index + 1] === undefined) values[key] = true;
    else {
      values[key] = argv[index + 1];
      index += 1;
    }
  }
  return values;
}

function resolveInventoryLocator(inventoryPath, opaqueLocator) {
  if (!String(opaqueLocator).startsWith("file:")) throw new Error("unsupported private raw-object locator");
  const locator = String(opaqueLocator).slice(5);
  if (path.isAbsolute(locator) || /^[a-z]:/i.test(locator) || locator.startsWith("\\\\")) throw new Error("private raw-object locator must be relative");
  const portable = safeArchivePath(locator);
  if (!portable.startsWith("raw/")) throw new Error("private raw-object locator must remain under the raw directory");
  const resolved = assertNoFollowComponents(path.dirname(inventoryPath), portable, "private raw-object locator");
  return resolved;
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  if (!args.rollback || !args["raw-inventory"] || !args.receipt || !args["restore-test"]) {
    throw new Error("--rollback, --raw-inventory, --receipt, and --restore-test are required");
  }
  const repoRoot = process.cwd();
  assertNoFollowExistingAncestors(repoRoot, "repository root");
  const taskPrivateRoot = path.join(repoRoot, ".floriva-private", "seo-ai-seo-recovery", "2026-07-22");
  const rollbackPath = path.resolve(args.rollback);
  const inventoryPath = path.resolve(args["raw-inventory"]);
  const receiptPath = path.resolve(args.receipt);
  const supersessionPath = path.join(repoRoot, "artifacts", "seo-ai-seo-recovery", "2026-07-22", "prechange", "private-backup-supersession.json");
  const rollbackRelative = path.relative(taskPrivateRoot, rollbackPath).replaceAll("\\", "/");
  if (!/^rollback(?:-v\d+)?$/.test(rollbackRelative)) throw new Error("rollback path is outside the bounded Task 1 private root");
  if (inventoryPath !== path.join(taskPrivateRoot, "raw-evidence-inventory.json")) throw new Error("raw inventory path is outside the bounded Task 1 private root");
  if (receiptPath !== path.join(repoRoot, "artifacts", "seo-ai-seo-recovery", "2026-07-22", "prechange", "private-backup-receipt.json")) throw new Error("receipt path is outside the bounded Task 1 tracked root");
  if (!existsSync(rollbackPath) || lstatSync(rollbackPath).isSymbolicLink()) throw new Error("rollback root is missing or reparse-backed");
  assertNoFollowExistingAncestors(rollbackPath, "rollback root");
  assertNoFollowExistingAncestors(inventoryPath, "raw inventory");
  assertNoFollowExistingAncestors(receiptPath, "canonical receipt");
  const bucket = process.env.FLORIVA_PRIVATE_BACKUP_BUCKET;
  const keyValue = process.env.FLORIVA_PRIVATE_BACKUP_KEY;
  const keyId = process.env.FLORIVA_PRIVATE_BACKUP_KEY_ID;
  if (!bucket || !keyValue || !keyId) {
    throw new Error("FLORIVA_PRIVATE_BACKUP_BUCKET, FLORIVA_PRIVATE_BACKUP_KEY, and FLORIVA_PRIVATE_BACKUP_KEY_ID are required");
  }
  const key = parseBackupKey(keyValue);
  const objectStore = createConditionalR2ObjectStore(bucket);
  await objectStore.verifyBucket();
  const existingSupersession = existsSync(supersessionPath) ? readSafeJson(supersessionPath, "replacement journal") : null;
  const objectId = existingSupersession?.replacement?.plannedObjectId ?? randomBytes(32).toString("hex");
  const wranglerVersion = runWrangler(["--version"]).trim();
  const priorBindingPath = path.join(repoRoot, "artifacts", "seo-ai-seo-recovery", "2026-07-22", "prechange", "prior-deployment.json");
  const trustedAnchorsPath = path.join(repoRoot, "artifacts", "seo-ai-seo-recovery", "2026-07-22", "prechange", "trusted-restore-anchors.json");
  const trustedRestoreAnchors = readSafeJson(trustedAnchorsPath, "trusted restore anchors");
  const currentAnchors = await deriveTrustedRestoreAnchors({ rollbackDirectory: rollbackPath, rawInventoryPath: inventoryPath, priorBindingPath, resolveRawObject: async (locator) => resolveInventoryLocator(inventoryPath, locator) });
  assertReviewedTrustAnchors(trustedBindingSubset(currentAnchors), trustedRestoreAnchors);
  const currentReceipt = existsSync(receiptPath) ? readSafeJson(receiptPath, "canonical receipt") : null;
  const expectedCanonicalContext = currentReceipt?.schemaVersion === 2 ? {
    bucket, keyId, objectId, wranglerVersion,
    trustedBindings: trustedBindingSubset(currentAnchors),
    supersedes: {
      previousReceiptSha256: existingSupersession?.previousReceiptSha256,
      previousObjectId: existingSupersession?.previousObjectPreservation?.objectId,
      previousObjectPreserved: existingSupersession?.previousObjectPreservation?.preserved,
    },
    previousObjectVerification: {
      objectId: existingSupersession?.previousObjectPreservation?.objectId,
      ciphertextSha256: existingSupersession?.previousObjectPreservation?.ciphertextSha256,
      ciphertextByteLength: existingSupersession?.previousObjectPreservation?.ciphertextByteLength,
    },
  } : undefined;
  const supersession = prepareReceiptSupersession({ receiptPath, supersessionPath, replacementObjectId: objectId, expectedCanonicalContext, expectedReplacementContext: { bucket, keyId, toolVersion: wranglerVersion } });
  const preparedDirectory = path.join(taskPrivateRoot, "prepared-backup-operations");
  const preparedPayloadPath = path.join(preparedDirectory, `${objectId}.prepared.json`);
  const legacyPreparedCiphertextPath = path.join(preparedDirectory, `${objectId}.bin`);
  const legacyPreparedMetadataPath = path.join(preparedDirectory, `${objectId}.json`);
  if (existsSync(legacyPreparedCiphertextPath) || existsSync(legacyPreparedMetadataPath)) throw new Error("legacy partial prepared backup state is not resumable; explicit local recovery is required");
  const resumePreparedOperation = existsSync(preparedPayloadPath) ? loadPreparedBackupOperation(preparedDirectory, objectId) : null;
  const restoreRoot = await mkdtemp(path.join(os.tmpdir(), "floriva-clean-restore-"));
  rmSync(restoreRoot, { recursive: true, force: true });
  try {
    if (supersession.alreadyCanonicalized || supersession.canonicalReceiptNeedsRecovery) {
      await revalidateCanonicalizedBackup({
        rollbackDirectory: rollbackPath, rawInventoryPath: inventoryPath, priorBindingPath,
        resolveRawObject: async (locator) => resolveInventoryLocator(inventoryPath, locator),
        objectStore, bucket, key, keyId, objectId, wranglerVersion,
        receipt: currentReceipt,
        expectedSupersedes: {
          previousReceiptSha256: supersession.previousReceiptSha256,
          previousObjectId: supersession.previousObjectPreservation.objectId,
          previousObjectPreserved: supersession.previousObjectPreservation.preserved,
          previousObjectVerification: {
            objectId: supersession.previousObjectPreservation.objectId,
            ciphertextSha256: supersession.previousObjectPreservation.ciphertextSha256,
            ciphertextByteLength: supersession.previousObjectPreservation.ciphertextByteLength,
          },
        },
        trustedRestoreAnchors, restoreTestRoot: restoreRoot,
      });
      if (supersession.canonicalReceiptNeedsRecovery) transitionBackupReplacementState(supersessionPath, "canonicalized", { finalReceiptSha256: sha256(readSafeBytes(receiptPath, "canonical receipt")) });
      process.stdout.write(`${JSON.stringify({ ok: true, objectId, alreadyCanonicalized: true, remoteRevalidated: true })}\n`);
      return;
    }
    const receipt = await backupPrivateEvidence({
      rollbackDirectory: rollbackPath,
      rawInventoryPath: inventoryPath,
      priorBindingPath,
      resolveRawObject: async (locator) => resolveInventoryLocator(inventoryPath, locator),
      objectStore,
      bucket,
      key,
      keyId,
      objectId,
      supersedes: {
        previousReceiptSha256: supersession.previousReceiptSha256,
        previousObjectId: supersession.previousObjectPreservation.objectId,
        previousObjectPreserved: supersession.previousObjectPreservation.preserved,
        ...(supersession.previousObjectPreservation.ciphertextSha256 ? { previousCiphertextSha256: supersession.previousObjectPreservation.ciphertextSha256 } : {}),
        ...(Number.isSafeInteger(supersession.previousObjectPreservation.ciphertextByteLength) ? { previousCiphertextByteLength: supersession.previousObjectPreservation.ciphertextByteLength } : {}),
      },
      wranglerVersion,
      restoreTestRoot: restoreRoot,
      trustedRestoreAnchors,
      persistReplacementState: async ({ state, ...details }) => { transitionBackupReplacementState(supersessionPath, state, details); },
      getReplacementState: async () => readSafeJson(supersessionPath, "replacement journal").replacement.state,
      getReplacementJournal: async () => readSafeJson(supersessionPath, "replacement journal"),
      persistPreparedOperation: async (prepared) => { persistPreparedBackupOperation(preparedDirectory, objectId, prepared); },
      resumePreparedOperation,
      persistReceiptBeforeUpload: async (receipt) => {
        atomicWriteJson(receiptPath, receipt);
      },
    });
    process.stdout.write(`${JSON.stringify({ ok: true, objectId, ciphertextSha256: receipt.ciphertextSha256 })}\n`);
  } finally {
    rmSync(restoreRoot, { recursive: true, force: true });
    rmSync(`${restoreRoot}.remote`, { recursive: true, force: true });
  }
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  main().catch((error) => {
    process.stderr.write(`${error.message}\n`);
    process.exitCode = 1;
  });
}
