import { mkdtemp as mkdtempRaw, mkdir, readFile, realpath, symlink, writeFile } from "node:fs/promises";
import { existsSync } from "node:fs";
import { createHash } from "node:crypto";
import { tmpdir } from "node:os";
import path from "node:path";
import { describe, expect, it, vi } from "vitest";

import {
  backupPrivateEvidence,
  deriveTrustedRestoreAnchors,
  isMissingR2ObjectOutput,
  safeArchivePath,
  restoreAndValidateBackup,
  revalidateCanonicalizedBackup,
  prepareReceiptSupersession,
  validateBackupReplacementState,
  ConditionalR2S3ObjectStore,
  createConditionalR2ObjectStore,
  loadPreparedBackupOperation,
  persistPreparedBackupOperation,
  transitionBackupReplacementState,
  validateBackupReceipt,
  validateR2S3Endpoint,
  createBackupOperationBinding,
  reconcileRemoteVerifiedReceipt,
  LocalR2BridgeObjectStore,
  validateLocalR2BridgeEndpoint,
  createLocalR2BridgeRuntimeSecretFile,
  removeLocalR2BridgeRuntimeSecretFile,
} from "./backup-private-seo-evidence.mjs";

// macOS os.tmpdir() resolves under /var, which is a symlink to /private/var.
// The backup script deliberately rejects symlinked path ancestors, so
// canonicalize every temp root here. Symlinks created *inside* a test tree
// (the junction-rejection cases) are still detected, preserving that coverage.
async function mkdtemp(dir: string): Promise<string> {
  return realpath(await mkdtempRaw(dir));
}

const supersedes = { previousReceiptSha256: "b".repeat(64), previousObjectId: "c".repeat(64), previousObjectPreserved: true };
const CURRENT_PREPARED_CIPHERTEXT_BYTES = 88_919_517;
const MAX_BRIDGE_OBJECT_BYTES = 128 * 1024 * 1024;

function canonicalRecoveryFixture(objectId: string, state: "upload-uncertain" | "remote-verified" | "canonicalized") {
  const previousReceipt = { schemaVersion: 1, provider: "cloudflare-r2", bucket: "private-bucket", objectId: "c".repeat(64), ciphertextSha256: "f".repeat(64), ciphertextByteLength: 3 };
  const previousBytes = Buffer.from(`${JSON.stringify(previousReceipt, null, 2)}\n`);
  const previousReceiptSha256 = createHash("sha256").update(previousBytes).digest("hex");
  const trustedBindings = Object.fromEntries(["descriptorSha256", "verifierSha256", "rawInventorySha256", "priorBindingSha256", "archiveInventorySha256"].map((name) => [name, "a".repeat(64)]));
  const supersession = {
    previousReceiptSha256, previousObjectId: previousReceipt.objectId, previousObjectPreserved: true,
    previousObjectVerification: { objectId: previousReceipt.objectId, ciphertextSha256: previousReceipt.ciphertextSha256, ciphertextByteLength: previousReceipt.ciphertextByteLength, verificationBasis: "schema-1-receipt-bound-bytes", requiredPostcondition: "byte-identical-after-replacement" },
  };
  const receiptBase = {
    schemaVersion: 2, provider: "cloudflare-r2", bucket: "private-bucket", objectId,
    ciphertextSha256: "e".repeat(64), ciphertextByteLength: 4,
    encryption: { algorithm: "AES-256-GCM", version: 1, nonceBase64: Buffer.alloc(12).toString("base64"), tagBase64: Buffer.alloc(16).toString("base64") },
    keyId: "key-2026", wranglerVersion: "4.84.1", preparedAt: "2026-07-22T12:00:00.000Z",
    publicationOrder: "remote-verified-before-canonical-receipt", remoteState: "pending-remote-verification",
    trustedBindings, supersedes: supersession,
  };
  const candidateReceipt = { ...receiptBase, localPreflightRestore: { valid: true, archiveSha256: "d".repeat(64), validatedFileCount: 1, validatedAt: "2026-07-22T12:01:00.000Z" } };
  const remoteVerifiedAt = "2026-07-22T12:02:00.000Z";
  const receipt = {
    ...candidateReceipt, remoteState: "verified-clean-restore", uploadedAt: "2026-07-22T12:01:30.000Z",
    supersedes: { ...supersession, previousObjectVerification: { ...supersession.previousObjectVerification, unchanged: true, verifiedAt: remoteVerifiedAt } },
    cleanRestore: { valid: true, archiveSha256: "d".repeat(64), validatedFileCount: 1, verificationSource: "remote-object-clean-restore", remoteVerifiedAt, validatedAt: remoteVerifiedAt },
  };
  const receiptBytes = Buffer.from(`${JSON.stringify(receipt, null, 2)}\n`);
  const operationBinding = createBackupOperationBinding({ receiptBase, candidateReceipt });
  const journal = {
    schemaVersion: 2, supersessionType: "immutable-r2-receipt-supersession", previousReceiptSha256,
    previousReceiptBytesBase64: previousBytes.toString("base64"), previousReceipt,
    previousObjectPreservation: { objectId: previousReceipt.objectId, ciphertextSha256: previousReceipt.ciphertextSha256, ciphertextByteLength: previousReceipt.ciphertextByteLength, preserved: true, deletionAuthorized: false },
    replacement: { plannedObjectId: objectId, state, operationBinding, receiptBase, candidateReceipt, finalReceipt: receipt, finalReceiptSha256: createHash("sha256").update(receiptBytes).digest("hex") },
  };
  const expectedCanonicalContext = { bucket: receipt.bucket, keyId: receipt.keyId, objectId, wranglerVersion: receipt.wranglerVersion, trustedBindings, supersedes: { previousReceiptSha256, previousObjectId: previousReceipt.objectId, previousObjectPreserved: true }, previousObjectVerification: { objectId: previousReceipt.objectId, ciphertextSha256: previousReceipt.ciphertextSha256, ciphertextByteLength: previousReceipt.ciphertextByteLength } };
  return { receipt, receiptBytes, journal, expectedCanonicalContext };
}

class MemoryObjectStore {
  objects = new Map<string, Buffer>();
  events: string[] = [];
  getCalls = 0;
  capabilities = { conditionalCreate: true };
  async exists(key: string) {
    return this.objects.has(key);
  }
  async put(key: string, value: Buffer) {
    this.events.push("put");
    this.objects.set(key, Buffer.from(value));
  }
  async putIfAbsent(key: string, value: Buffer) {
    if (this.objects.has(key)) throw new Error("already exists");
    await this.put(key, value);
  }
  async get(key: string) {
    this.getCalls += 1;
    const value = this.objects.get(key);
    if (!value) throw new Error("missing object");
    return Buffer.from(value);
  }
}

async function writeSemanticRollbackFixture(rollback: string) {
  const payloadPath = path.join(rollback, "deploy", "payload.txt");
  await writeFile(payloadPath, "rollback bytes");
  const crypto = await import("node:crypto");
  const payload = await readFile(payloadPath);
  const descriptor = {
    schemaVersion: 3,
    fileManifest: [{
      path: "deploy/payload.txt",
      sha256: crypto.createHash("sha256").update(payload).digest("hex"),
      byteLength: payload.byteLength,
      classification: "public",
    }],
  };
  await writeFile(path.join(rollback, "descriptor.json"), JSON.stringify(descriptor));
  await writeFile(
    path.join(rollback, "verifier", "verify-rollback.mjs"),
    "import {createHash} from 'node:crypto';import {readFileSync,statSync} from 'node:fs';import path from 'node:path';const i=process.argv.indexOf('--verify-descriptor');if(i<0)process.exit(2);const p=path.resolve(process.argv[i+1]);const d=JSON.parse(readFileSync(p,'utf8'));if(d.schemaVersion!==3||!Array.isArray(d.fileManifest)||d.fileManifest.length<1)process.exit(3);for(const e of d.fileManifest){const f=path.resolve(path.dirname(p),e.path);const b=readFileSync(f);if(createHash('sha256').update(b).digest('hex')!==e.sha256||statSync(f).size!==e.byteLength)process.exit(4)}\n",
  );
}

it("encrypts rollback and raw evidence then restores and revalidates without original paths", async () => {
  const root = await mkdtemp(path.join(tmpdir(), "floriva-backup-"));
  const rollback = path.join(root, "rollback");
  const raw = path.join(root, "raw", "gsc.json");
  await mkdir(rollback, { recursive: true });
  await mkdir(path.join(rollback, "deploy"), { recursive: true });
  await mkdir(path.join(rollback, "verifier"), { recursive: true });
  await mkdir(path.dirname(raw), { recursive: true });
  await writeSemanticRollbackFixture(rollback);
  await writeFile(raw, '{"private":true}');
  const priorBinding = path.join(root, "prior-deployment.json");
  await writeFile(priorBinding, '{"deployment":"fixture"}');
  const crypto = await import("node:crypto");
  const rawHash = crypto.createHash("sha256").update(await readFile(raw)).digest("hex");
  const inventory = path.join(root, "raw-evidence-inventory.json");
  await writeFile(
    inventory,
    JSON.stringify({
      schemaVersion: 1,
      records: [
        {
          rawEvidenceId: "raw-gsc-001",
          opaqueLocator: "vault:7f3a",
          sha256: rawHash,
          byteLength: (await readFile(raw)).byteLength,
          verifiedAt: "2026-07-22T12:00:00.000Z",
        },
      ],
    }),
  );
  const store = new MemoryObjectStore();
  store.objects.set(supersedes.previousObjectId, Buffer.from("preserved-old-object"));
  const key = Buffer.alloc(32, 7);
  let preparedOperation: any;
  const trustedRestoreAnchors = await deriveTrustedRestoreAnchors({
    rollbackDirectory: rollback,
    rawInventoryPath: inventory,
    priorBindingPath: priorBinding,
    resolveRawObject: async () => raw,
  });
  const receipt = await backupPrivateEvidence({
    rollbackDirectory: rollback,
    rawInventoryPath: inventory,
    priorBindingPath: priorBinding,
    resolveRawObject: async () => raw,
    objectStore: store,
    bucket: "private-bucket",
    key,
    keyId: "backup-key-2026-07",
    objectId: "1".repeat(64),
    wranglerVersion: "4.84.1",
    restoreTestRoot: path.join(root, "clean-checkout"),
    persistReceiptBeforeUpload: async () => { store.events.push("receipt"); },
    persistPreparedOperation: async (value) => { preparedOperation = value; },
    supersedes,
    trustedRestoreAnchors,
  });

  expect(receipt.provider).toBe("cloudflare-r2");
  expect(store.events.slice(0, 2)).toEqual(["put", "receipt"]);
  expect(receipt).not.toHaveProperty("key");
  expect(JSON.stringify(receipt)).not.toContain("vault:7f3a");
  expect(receipt.cleanRestore.verificationSource).toBe("remote-object-clean-restore");
  expect(receipt.cleanRestore.remoteVerifiedAt).toBe(receipt.cleanRestore.validatedAt);
  expect(receipt.supersedes.previousObjectVerification).toMatchObject({
    objectId: supersedes.previousObjectId,
    unchanged: true,
    verificationBasis: "operation-start-observed-bytes",
  });
  expect(existsSync(path.join(root, "clean-checkout"))).toBe(false);
  expect(existsSync(path.join(root, "clean-checkout.remote"))).toBe(false);
  await mkdir(path.join(root, "gone"));
  const restored = await restoreAndValidateBackup({
    objectStore: store,
    objectId: receipt.objectId,
    key,
    receipt,
    restoreRoot: path.join(root, "second-clean-checkout"),
    trustedRestoreAnchors,
  });
  expect(restored.valid).toBe(true);
  expect(restored.validatedFileCount).toBeGreaterThanOrEqual(3);
  const canonicalRetryRoot = path.join(root, "canonical-rerun");
  const canonicalRetry = await revalidateCanonicalizedBackup({
    rollbackDirectory: rollback, rawInventoryPath: inventory, priorBindingPath: priorBinding,
    resolveRawObject: async () => raw, objectStore: store, bucket: "private-bucket", key,
    keyId: "backup-key-2026-07", objectId: receipt.objectId, wranglerVersion: "4.84.1",
    receipt, expectedSupersedes: supersedes, trustedRestoreAnchors, restoreTestRoot: canonicalRetryRoot,
  });
  expect(canonicalRetry.valid).toBe(true);
  expect(existsSync(canonicalRetryRoot)).toBe(false);
  expect(existsSync(`${canonicalRetryRoot}.remote`)).toBe(false);
  const callsBeforeSelfSupersession = store.getCalls;
  await expect(revalidateCanonicalizedBackup({
    rollbackDirectory: rollback, rawInventoryPath: inventory, priorBindingPath: priorBinding,
    resolveRawObject: async () => raw, objectStore: store, bucket: "private-bucket", key,
    keyId: "backup-key-2026-07", objectId: receipt.objectId, wranglerVersion: "4.84.1", receipt,
    expectedSupersedes: { ...supersedes, previousObjectId: receipt.objectId }, trustedRestoreAnchors,
    restoreTestRoot: path.join(root, "self-supersession"),
  })).rejects.toThrow(/prior object distinct/);
  expect(store.getCalls).toBe(callsBeforeSelfSupersession);
  const tamperedCanonicalReceipt = structuredClone(receipt);
  tamperedCanonicalReceipt.cleanRestore.archiveSha256 = "9".repeat(64);
  await expect(revalidateCanonicalizedBackup({
    rollbackDirectory: rollback, rawInventoryPath: inventory, priorBindingPath: priorBinding,
    resolveRawObject: async () => raw, objectStore: store, bucket: "private-bucket", key,
    keyId: "backup-key-2026-07", objectId: receipt.objectId, wranglerVersion: "4.84.1",
    receipt: tamperedCanonicalReceipt, expectedSupersedes: supersedes, trustedRestoreAnchors,
    restoreTestRoot: path.join(root, "tampered-canonical-rerun"),
  })).rejects.toThrow(/fresh remote|clean restore|drift/);
  const tamperedCanonicalCount = structuredClone(receipt);
  tamperedCanonicalCount.cleanRestore.validatedFileCount += 1;
  await expect(revalidateCanonicalizedBackup({
    rollbackDirectory: rollback, rawInventoryPath: inventory, priorBindingPath: priorBinding,
    resolveRawObject: async () => raw, objectStore: store, bucket: "private-bucket", key,
    keyId: "backup-key-2026-07", objectId: receipt.objectId, wranglerVersion: "4.84.1",
    receipt: tamperedCanonicalCount, expectedSupersedes: supersedes, trustedRestoreAnchors,
    restoreTestRoot: path.join(root, "tampered-canonical-count-rerun"),
  })).rejects.toThrow(/fresh remote|clean restore|drift/);
  const putsBeforeResume = store.events.filter((event) => event === "put").length;
  const resumed = await backupPrivateEvidence({
    rollbackDirectory: rollback, rawInventoryPath: inventory, priorBindingPath: priorBinding,
    resolveRawObject: async () => raw, objectStore: store, bucket: "private-bucket", key, keyId: "backup-key-2026-07",
    objectId: receipt.objectId, wranglerVersion: "4.84.1", restoreTestRoot: path.join(root, "exact-resume"),
    persistReceiptBeforeUpload: async () => {}, supersedes, trustedRestoreAnchors, resumePreparedOperation: preparedOperation,
  });
  expect(resumed.ciphertextSha256).toBe(receipt.ciphertextSha256);
  expect(store.events.filter((event) => event === "put")).toHaveLength(putsBeforeResume);
  const failingStore = new MemoryObjectStore();
  failingStore.objects.set(supersedes.previousObjectId, Buffer.from("preserved-old-object"));
  const originalPut = failingStore.putIfAbsent.bind(failingStore);
  failingStore.putIfAbsent = async (id: string, bytes: Buffer) => {
    await originalPut(id, bytes);
    failingStore.objects.set(supersedes.previousObjectId, Buffer.from("mutated-old-object"));
  };
  const failedRoot = path.join(root, "failed-cleanup");
  await expect(backupPrivateEvidence({
    rollbackDirectory: rollback, rawInventoryPath: inventory, priorBindingPath: priorBinding,
    resolveRawObject: async () => raw, objectStore: failingStore, bucket: "private-bucket", key, keyId: "backup-key-2026-07",
    objectId: receipt.objectId, wranglerVersion: "4.84.1", restoreTestRoot: failedRoot,
    persistReceiptBeforeUpload: async () => {}, supersedes, trustedRestoreAnchors, resumePreparedOperation: preparedOperation,
  })).rejects.toThrow(/prior object changed/);
  expect(existsSync(failedRoot)).toBe(false);
  expect(existsSync(`${failedRoot}.remote`)).toBe(false);
  await expect(backupPrivateEvidence({
    rollbackDirectory: rollback, rawInventoryPath: inventory, priorBindingPath: priorBinding,
    resolveRawObject: async () => raw, objectStore: store, bucket: "private-bucket", key, keyId: "backup-key-2026-07",
    objectId: receipt.objectId, wranglerVersion: "4.84.1", restoreTestRoot: path.join(root, "reuse-different"),
    persistReceiptBeforeUpload: async () => {}, supersedes, trustedRestoreAnchors,
  })).rejects.toThrow(/differs from the prepared ciphertext/);
  const tampered = structuredClone(receipt);
  tampered.trustedBindings.descriptorSha256 = "a".repeat(64);
  const callsBefore = store.getCalls;
  await expect(restoreAndValidateBackup({ objectStore: store, objectId: receipt.objectId, key, receipt: tampered, restoreRoot: path.join(root, "tampered-clean-checkout"), trustedRestoreAnchors })).rejects.toThrow(/reviewed local trust anchors/);
  expect(store.getCalls).toBe(callsBefore);
});

it("rejects a counterfeit descriptor and process-exit verifier against reviewed local anchors", async () => {
  const root = await mkdtemp(path.join(tmpdir(), "floriva-counterfeit-"));
  const rollback = path.join(root, "rollback");
  const raw = path.join(root, "raw.json");
  const inventory = path.join(root, "inventory.json");
  const prior = path.join(root, "prior.json");
  await mkdir(path.join(rollback, "deploy"), { recursive: true });
  await mkdir(path.join(rollback, "verifier"), { recursive: true });
  await writeSemanticRollbackFixture(rollback);
  await writeFile(raw, "raw");
  const crypto = await import("node:crypto");
  await writeFile(inventory, JSON.stringify({ records: [{ rawEvidenceId: "raw-gsc-001", opaqueLocator: "vault:x", sha256: crypto.createHash("sha256").update("raw").digest("hex"), byteLength: 3 }] }));
  await writeFile(prior, JSON.stringify({ schemaVersion: 1, role: "prechange-current-production" }));
  const trustedRestoreAnchors = await deriveTrustedRestoreAnchors({ rollbackDirectory: rollback, rawInventoryPath: inventory, priorBindingPath: prior, resolveRawObject: async () => raw });
  await writeFile(path.join(rollback, "descriptor.json"), "{}\n");
  await writeFile(path.join(rollback, "verifier", "verify-rollback.mjs"), "process.exit(0)\n");
  const store = new MemoryObjectStore();
  await expect(backupPrivateEvidence({
    rollbackDirectory: rollback, rawInventoryPath: inventory, priorBindingPath: prior,
    resolveRawObject: async () => raw, objectStore: store, bucket: "private", key: Buffer.alloc(32), keyId: "key",
    objectId: "9".repeat(64), wranglerVersion: "4.84.1", restoreTestRoot: path.join(root, "restore"),
    persistReceiptBeforeUpload: async () => {}, supersedes, trustedRestoreAnchors,
  })).rejects.toThrow(/reviewed local trust anchors/);
  expect(store.events).not.toContain("put");
});

it("rejects rollback files that are absent from the descriptor manifest before upload", async () => {
  const root = await mkdtemp(path.join(tmpdir(), "floriva-backup-extra-file-"));
  const rollback = path.join(root, "rollback");
  await mkdir(path.join(rollback, "deploy"), { recursive: true });
  await mkdir(path.join(rollback, "verifier"), { recursive: true });
  await writeFile(path.join(rollback, "descriptor.json"), JSON.stringify({ fileManifest: [] }));
  await writeFile(path.join(rollback, "verifier", "verify-rollback.mjs"), "process.exit(0)\n");
  await writeFile(path.join(rollback, "unmanifested.txt"), "extra");
  const inventory = path.join(root, "inventory.json");
  await writeFile(inventory, JSON.stringify({ records: [] }));
  const prior = path.join(root, "prior.json");
  await writeFile(prior, "{}");
  const store = new MemoryObjectStore();
  store.objects.set(supersedes.previousObjectId, Buffer.from("preserved-old-object"));
  const trustedRestoreAnchors = await deriveTrustedRestoreAnchors({ rollbackDirectory: rollback, rawInventoryPath: inventory, priorBindingPath: prior, resolveRawObject: async () => "" });
  await expect(backupPrivateEvidence({ rollbackDirectory: rollback, rawInventoryPath: inventory, priorBindingPath: prior, resolveRawObject: async () => "", objectStore: store, bucket: "private", key: Buffer.alloc(32), keyId: "key", objectId: "d".repeat(64), wranglerVersion: "4.84.1", restoreTestRoot: path.join(root, "restore"), persistReceiptBeforeUpload: async () => {}, supersedes, trustedRestoreAnchors })).rejects.toThrow(/unmanifested/);
  expect(store.events).not.toContain("put");
});

it("preserves the old receipt and object identity before canonical supersession", async () => {
  const root = await mkdtemp(path.join(tmpdir(), "floriva-receipt-supersession-"));
  const receiptPath = path.join(root, "receipt.json");
  const supersessionPath = path.join(root, "supersession.json");
  const old = { schemaVersion: 1, provider: "cloudflare-r2", objectId: "f".repeat(64) };
  await writeFile(receiptPath, `${JSON.stringify(old)}\n`);
  const record = prepareReceiptSupersession({ receiptPath, supersessionPath, replacementObjectId: "e".repeat(64), now: "2026-07-22T22:00:00.000Z" });
  expect(record.previousReceipt).toEqual(old);
  expect(record.previousObjectPreservation).toEqual({ objectId: old.objectId, preserved: true, deletionAuthorized: false });
  expect(JSON.parse(await readFile(supersessionPath, "utf8")).previousReceipt).toEqual(old);
  expect(JSON.parse(await readFile(receiptPath, "utf8"))).toEqual(old);
  expect(record.replacement).toMatchObject({ plannedObjectId: "e".repeat(64), state: "planned" });
  expect(validateBackupReplacementState(record, { canonicalReceipt: old }).valid).toBe(true);
  expect(() => prepareReceiptSupersession({ receiptPath, supersessionPath, replacementObjectId: null as unknown as string })).toThrow(/planned replacement object ID/);
});

it("rejects a restore root nested below a parent junction before reading the object", async () => {
  const root = await mkdtemp(path.join(tmpdir(), "floriva-restore-junction-"));
  const outside = await mkdtemp(path.join(tmpdir(), "floriva-restore-outside-"));
  const link = path.join(root, "linked");
  await symlink(outside, link, "junction");
  const store = new MemoryObjectStore();
  await expect(restoreAndValidateBackup({
    objectStore: store,
    objectId: "1".repeat(64),
    key: Buffer.alloc(32),
    receipt: {},
    restoreRoot: path.join(link, "restore"),
    trustedRestoreAnchors: { schemaVersion: 1 },
  })).rejects.toThrow(/ancestor|junction|reparse/);
  expect(store.getCalls).toBe(0);
});

it("refuses wrong key length", async () => {
  const store = new MemoryObjectStore();
  const reused = "2".repeat(64);
  store.objects.set(reused, Buffer.from("existing"));
  await expect(
    backupPrivateEvidence({
      rollbackDirectory: ".",
      rawInventoryPath: "inventory.json",
      resolveRawObject: async () => "raw",
      objectStore: store,
      bucket: "private",
      key: Buffer.alloc(31),
      keyId: "key-id",
      objectId: "3".repeat(64),
      wranglerVersion: "4.84.1",
      restoreTestRoot: "restore",
      persistReceiptBeforeUpload: async () => {},
      supersedes,
    }),
  ).rejects.toThrow(/32 bytes/);
});

it("recognizes Wrangler's remote missing-key response", () => {
  expect(isMissingR2ObjectOutput("The specified key does not exist.")).toBe(true);
});

it("uses only provider-enforced If-None-Match conditional S3 puts", async () => {
  const calls: any[] = [];
  const client = { async send(command: any) { calls.push(command); return {}; } };
  const store = new ConditionalR2S3ObjectStore("bucket", { client });
  await store.putIfAbsent("a".repeat(64), Buffer.from("ciphertext"));
  expect(calls).toHaveLength(1);
  expect(calls[0]).toBeInstanceOf((await import("@aws-sdk/client-s3")).PutObjectCommand);
  expect(calls[0].input).toMatchObject({ Bucket: "bucket", Key: "a".repeat(64), IfNoneMatch: "*" });
});

it("persists exact ciphertext, nonce, tag, candidate receipt, and object ID for retries", async () => {
  const root = await mkdtemp(path.join(tmpdir(), "floriva-prepared-operation-"));
  const objectId = "8".repeat(64);
  const prepared = {
    ciphertext: Buffer.from("encrypted"),
    receiptBase: { objectId, encryption: { nonceBase64: "AAAAAAAAAAAAAAAA", tagBase64: "AAAAAAAAAAAAAAAAAAAAAA==" } },
    candidateReceipt: { objectId, cleanRestore: { valid: true, archiveSha256: "a".repeat(64) } },
  };
  persistPreparedBackupOperation(root, objectId, prepared);
  const loaded = loadPreparedBackupOperation(root, objectId);
  expect(loaded.ciphertext).toEqual(prepared.ciphertext);
  expect(loaded.receiptBase).toEqual(prepared.receiptBase);
  expect(loaded.candidateReceipt).toEqual(prepared.candidateReceipt);
  expect(existsSync(path.join(root, `${objectId}.prepared.json`))).toBe(true);
  expect(existsSync(path.join(root, `${objectId}.bin`))).toBe(false);
  expect(() => persistPreparedBackupOperation(root, objectId, { ...prepared, ciphertext: Buffer.from("different") })).toThrow(/drifted/);
});

it("rejects tracked-state writes through a parent junction", async () => {
  const root = await mkdtemp(path.join(tmpdir(), "floriva-state-junction-"));
  const outside = await mkdtemp(path.join(tmpdir(), "floriva-state-outside-"));
  const linked = path.join(root, "tracked");
  await symlink(outside, linked, "junction");
  const receiptPath = path.join(linked, "receipt.json");
  await writeFile(path.join(outside, "receipt.json"), JSON.stringify({ schemaVersion: 1, provider: "cloudflare-r2", objectId: "f".repeat(64) }));
  expect(() => prepareReceiptSupersession({ receiptPath, supersessionPath: path.join(linked, "journal.json"), replacementObjectId: "e".repeat(64) })).toThrow(/junction|reparse/);
  expect(() => persistPreparedBackupOperation(linked, "e".repeat(64), { ciphertext: Buffer.from("x"), receiptBase: {}, candidateReceipt: {} })).toThrow(/junction|reparse/);
});

it("supports monotonic crash recovery from every partial replacement state", async () => {
  const root = await mkdtemp(path.join(tmpdir(), "floriva-state-recovery-"));
  const journalPath = path.join(root, "journal.json");
  const previousReceipt = { schemaVersion: 1, objectId: supersedes.previousObjectId };
  const previousReceiptBytes = Buffer.from(`${JSON.stringify(previousReceipt)}\n`);
  const exactSupersedes = { ...supersedes, previousReceiptSha256: createHash("sha256").update(previousReceiptBytes).digest("hex") };
  const journal = {
    schemaVersion: 2,
    supersessionType: "immutable-r2-receipt-supersession",
    previousReceiptSha256: exactSupersedes.previousReceiptSha256,
    previousReceiptBytesBase64: previousReceiptBytes.toString("base64"),
    previousReceipt,
    previousObjectPreservation: { objectId: supersedes.previousObjectId, preserved: true, deletionAuthorized: false },
    replacement: { plannedObjectId: "d".repeat(64), state: "planned" },
  };
  await writeFile(journalPath, JSON.stringify(journal));
  const operationBinding = {
    bucket: "private", keyId: "key", objectId: "d".repeat(64), supersedes: exactSupersedes,
    publicationOrder: "remote-verified-before-canonical-receipt", toolVersion: "4.84.1",
    trustedBindings: Object.fromEntries(["descriptorSha256", "verifierSha256", "rawInventorySha256", "priorBindingSha256", "archiveInventorySha256"].map((name) => [name, "a".repeat(64)])),
    receiptBaseSha256: "d".repeat(64), candidateReceiptSha256: "e".repeat(64),
  };
  const finalReceipt = {
    schemaVersion: 2, provider: "cloudflare-r2", bucket: operationBinding.bucket, objectId: operationBinding.objectId,
    ciphertextSha256: "f".repeat(64), ciphertextByteLength: 1,
    encryption: { algorithm: "AES-256-GCM", version: 1, nonceBase64: Buffer.alloc(12).toString("base64"), tagBase64: Buffer.alloc(16).toString("base64") },
    keyId: operationBinding.keyId, wranglerVersion: operationBinding.toolVersion, preparedAt: "2026-07-22T12:00:00.000Z",
    publicationOrder: operationBinding.publicationOrder, remoteState: "verified-clean-restore", uploadedAt: "2026-07-22T12:01:00.000Z",
    trustedBindings: operationBinding.trustedBindings,
    supersedes: { ...exactSupersedes, previousObjectVerification: { objectId: supersedes.previousObjectId, ciphertextSha256: "a".repeat(64), ciphertextByteLength: 1, unchanged: true } },
    cleanRestore: { valid: true, archiveSha256: "a".repeat(64), validatedFileCount: 1, validatedAt: "2026-07-22T12:02:00.000Z", remoteVerifiedAt: "2026-07-22T12:02:00.000Z", verificationSource: "remote-object-clean-restore" },
  };
  const crypto = await import("node:crypto");
  for (const state of ["prepared", "upload-intent", "upload-uncertain", "remote-present", "remote-verified", "canonicalized"]) {
    const details = state === "remote-verified"
      ? { operationBinding, finalReceipt, finalReceiptSha256: crypto.createHash("sha256").update(`${JSON.stringify(finalReceipt, null, 2)}\n`).digest("hex") }
      : state === "upload-uncertain"
        ? { operationBinding, reason: "temporary conditional upload uncertainty" }
        : { operationBinding };
    const updated = transitionBackupReplacementState(journalPath, state, details);
    expect(updated.replacement.state).toBe(state);
    if (state === "upload-uncertain") expect(updated.replacement.reason).toBe("temporary conditional upload uncertainty");
    if (["remote-present", "remote-verified", "canonicalized"].includes(state)) expect(updated.replacement).not.toHaveProperty("reason");
  }
  const canonicalWithStaleReason = JSON.parse(await readFile(journalPath, "utf8"));
  canonicalWithStaleReason.replacement.reason = "stale resumed failure";
  await writeFile(journalPath, JSON.stringify(canonicalWithStaleReason));
  const resumedCanonical = transitionBackupReplacementState(journalPath, "canonicalized");
  expect(resumedCanonical.replacement.state).toBe("canonicalized");
  expect(resumedCanonical.replacement).not.toHaveProperty("reason");
  expect(() => transitionBackupReplacementState(journalPath, "prepared")).toThrow(/non-monotonic/);

  const conflictPath = path.join(root, "conflict.json");
  await writeFile(conflictPath, JSON.stringify(journal));
  const conflict = transitionBackupReplacementState(conflictPath, "conflict", { reason: "remote bytes differ" });
  expect(conflict.replacement.reason).toBe("remote bytes differ");
});

it("resumes upload-uncertain from the exact prepared key and ciphertext without regeneration", async () => {
  const root = await mkdtemp(path.join(tmpdir(), "floriva-upload-uncertain-resume-"));
  const receiptPath = path.join(root, "receipt.json");
  const journalPath = path.join(root, "journal.json");
  const preparedDirectory = path.join(root, "prepared");
  const objectId = "d".repeat(64);
  const differentObjectId = "e".repeat(64);
  const fixture = canonicalRecoveryFixture(objectId, "upload-uncertain");
  const ciphertext = Buffer.from("exact-persisted-ciphertext");
  const receiptBase = {
    ...fixture.journal.replacement.receiptBase,
    ciphertextSha256: createHash("sha256").update(ciphertext).digest("hex"),
    ciphertextByteLength: ciphertext.byteLength,
  };
  const candidateReceipt = {
    ...fixture.journal.replacement.candidateReceipt,
    ...receiptBase,
  };
  const operationBinding = createBackupOperationBinding({ receiptBase, candidateReceipt });
  const journal = {
    ...fixture.journal,
    replacement: {
      plannedObjectId: objectId,
      state: "upload-uncertain",
      operationBinding,
      receiptBase,
      candidateReceipt,
    },
  };
  await writeFile(receiptPath, Buffer.from(journal.previousReceiptBytesBase64, "base64"));
  await writeFile(journalPath, JSON.stringify(journal));
  persistPreparedBackupOperation(preparedDirectory, objectId, {
    ciphertext,
    receiptBase,
    candidateReceipt,
    operationBinding,
  });

  const resumedJournal = prepareReceiptSupersession({
    receiptPath,
    supersessionPath: journalPath,
    replacementObjectId: objectId,
  });
  const resumedPrepared = loadPreparedBackupOperation(preparedDirectory, objectId);
  expect(resumedJournal.replacement.state).toBe("upload-uncertain");
  expect(resumedJournal.replacement.plannedObjectId).toBe(objectId);
  expect(resumedPrepared.ciphertext).toEqual(ciphertext);
  expect(resumedPrepared.operationBinding.objectId).toBe(objectId);
  expect(() => prepareReceiptSupersession({
    receiptPath,
    supersessionPath: journalPath,
    replacementObjectId: differentObjectId,
  })).toThrow(/planned|object|drift|replacement/i);
  expect(() => persistPreparedBackupOperation(preparedDirectory, objectId, {
    ciphertext: Buffer.from("regenerated-ciphertext"),
    receiptBase,
    candidateReceipt,
    operationBinding,
  })).toThrow(/prepared|retry|drift/i);
});

it("treats a finalized schema-2 canonical receipt as an idempotent rerun", async () => {
  const root = await mkdtemp(path.join(tmpdir(), "floriva-finalized-retry-"));
  const receiptPath = path.join(root, "receipt.json");
  const journalPath = path.join(root, "journal.json");
  const objectId = "d".repeat(64);
  const { receiptBytes, journal, expectedCanonicalContext } = canonicalRecoveryFixture(objectId, "canonicalized");
  await writeFile(receiptPath, receiptBytes);
  await writeFile(journalPath, JSON.stringify(journal));
  expect(prepareReceiptSupersession({ receiptPath, supersessionPath: journalPath, replacementObjectId: objectId, expectedCanonicalContext }).alreadyCanonicalized).toBe(true);
});

it("canonicalizes only the exact schema-2 receipt crash window at remote-verified", async () => {
  const root = await mkdtemp(path.join(tmpdir(), "floriva-canonical-crash-window-"));
  const receiptPath = path.join(root, "receipt.json");
  const journalPath = path.join(root, "journal.json");
  const objectId = "d".repeat(64);
  const { receipt, receiptBytes, journal, expectedCanonicalContext } = canonicalRecoveryFixture(objectId, "remote-verified");
  await writeFile(receiptPath, receiptBytes);
  await writeFile(journalPath, JSON.stringify(journal));
  const recovered = prepareReceiptSupersession({
    receiptPath, supersessionPath: journalPath, replacementObjectId: objectId,
    expectedCanonicalContext,
  });
  expect(recovered.recoveredCanonicalCrashWindow).toBe(true);
  expect(recovered.canonicalReceiptNeedsRecovery).toBe(true);
  expect(JSON.parse(await readFile(journalPath, "utf8")).replacement.state).toBe("remote-verified");
  await writeFile(journalPath, JSON.stringify({ ...recovered, previousReceiptBytesBase64: Buffer.from('{"forged":true}\n').toString("base64") }));
  expect(() => prepareReceiptSupersession({ receiptPath, supersessionPath: journalPath, replacementObjectId: objectId, expectedCanonicalContext })).toThrow(/prior|receipt|journal|preserv/);
  const { previousReceiptBytesBase64: _removed, ...missingPriorBytes } = recovered;
  await writeFile(journalPath, JSON.stringify(missingPriorBytes));
  expect(() => prepareReceiptSupersession({ receiptPath, supersessionPath: journalPath, replacementObjectId: objectId, expectedCanonicalContext })).toThrow(/prior|receipt|journal|preserv/);
  await writeFile(journalPath, JSON.stringify({ ...recovered, replacement: { ...recovered.replacement, state: "remote-verified", finalReceipt: { ...receipt, bucket: "drifted" } } }));
  expect(() => prepareReceiptSupersession({ receiptPath, supersessionPath: journalPath, replacementObjectId: objectId, expectedCanonicalContext })).toThrow(/exact|drift|match|invalid/);
});

it("rejects a resumed final receipt that drifts from the fresh remote restore or full prior-object proof", () => {
  const objectId = "d".repeat(64);
  const { journal } = canonicalRecoveryFixture(objectId, "remote-verified");
  const existingFinalReceipt = journal.replacement.finalReceipt;
  const remoteRestored = { valid: true, archiveSha256: existingFinalReceipt.cleanRestore.archiveSha256, validatedFileCount: existingFinalReceipt.cleanRestore.validatedFileCount };
  const previousObjectVerification = existingFinalReceipt.supersedes.previousObjectVerification;
  expect(() => reconcileRemoteVerifiedReceipt({ candidateReceipt: journal.replacement.candidateReceipt, remoteRestored, previousObjectVerification, existingFinalReceipt: { ...existingFinalReceipt, cleanRestore: { ...existingFinalReceipt.cleanRestore, archiveSha256: "9".repeat(64) } } })).toThrow(/fresh remote|drift/);
  expect(() => reconcileRemoteVerifiedReceipt({ candidateReceipt: journal.replacement.candidateReceipt, remoteRestored, previousObjectVerification, existingFinalReceipt: { ...existingFinalReceipt, supersedes: { ...existingFinalReceipt.supersedes, previousObjectVerification: { ...previousObjectVerification, ciphertextSha256: "8".repeat(64) } } } })).toThrow(/fresh remote|drift/);
});

it("rejects operation-binding drift in resumable replacement state", () => {
  const previousReceipt = { objectId: supersedes.previousObjectId };
  const previousReceiptBytes = Buffer.from(`${JSON.stringify(previousReceipt)}\n`);
  const exactSupersedes = { ...supersedes, previousReceiptSha256: createHash("sha256").update(previousReceiptBytes).digest("hex") };
  const operationBinding = {
    bucket: "private-bucket", keyId: "key-2026", objectId: "d".repeat(64),
    supersedes: exactSupersedes, publicationOrder: "remote-verified-before-canonical-receipt", toolVersion: "4.84.1",
    trustedBindings: Object.fromEntries(["descriptorSha256", "verifierSha256", "rawInventorySha256", "priorBindingSha256", "archiveInventorySha256"].map((name) => [name, "a".repeat(64)])),
    receiptBaseSha256: "d".repeat(64), candidateReceiptSha256: "e".repeat(64),
  };
  const journal = {
    schemaVersion: 2, supersessionType: "immutable-r2-receipt-supersession",
    previousReceiptSha256: exactSupersedes.previousReceiptSha256, previousReceiptBytesBase64: previousReceiptBytes.toString("base64"), previousReceipt,
    previousObjectPreservation: { objectId: supersedes.previousObjectId, preserved: true, deletionAuthorized: false },
    replacement: { plannedObjectId: operationBinding.objectId, state: "prepared", operationBinding },
  };
  expect(validateBackupReplacementState(journal, { expectedOperationBinding: operationBinding }).valid).toBe(true);
  expect(validateBackupReplacementState({ ...journal, previousObjectPreservation: { ...journal.previousObjectPreservation, objectId: "9".repeat(64) } }, { expectedOperationBinding: operationBinding }).valid).toBe(false);
  expect(validateBackupReplacementState(journal, { expectedOperationBinding: { ...operationBinding, bucket: "other" } }).valid).toBe(false);
  expect(validateBackupReplacementState({ ...journal, replacement: { ...journal.replacement, operationBinding: { ...operationBinding, candidateReceiptSha256: "f".repeat(64) } } }, { expectedOperationBinding: operationBinding }).valid).toBe(false);
});

it("maps S3 412 to a fail-closed conditional conflict", async () => {
  const client = { async send() { throw Object.assign(new Error("precondition"), { name: "PreconditionFailed", $metadata: { httpStatusCode: 412 } }); } };
  const store = new ConditionalR2S3ObjectStore("bucket", { client });
  await expect(store.putIfAbsent("a".repeat(64), Buffer.from("ciphertext"))).rejects.toMatchObject({ code: "PRECONDITION_FAILED" });
});

it("requires the complete S3 credential contract before creating an upload adapter", () => {
  expect(() => createConditionalR2ObjectStore("bucket", {}, { client: { send() {} } })).toThrow(/explicit|selector/i);
  expect(() => createConditionalR2ObjectStore("bucket", { FLORIVA_PRIVATE_BACKUP_OBJECT_STORE: "s3" }, { client: { send() {} } })).toThrow(/R2_S3_ENDPOINT/);
  for (const endpoint of ["http://abc.r2.cloudflarestorage.com", "https://example.com", "https://abc.r2.cloudflarestorage.com.evil.test", "https://abc.r2.cloudflarestorage.com/path"]) {
    expect(() => validateR2S3Endpoint(endpoint)).toThrow(/Cloudflare R2|HTTPS|endpoint/);
  }
  expect(validateR2S3Endpoint(`https://${"a".repeat(32)}.r2.cloudflarestorage.com`)).toBe(`https://${"a".repeat(32)}.r2.cloudflarestorage.com`);
});

it("selects the authenticated local R2 bridge only through the explicit store selector", () => {
  const fetchImpl = vi.fn();
  const store = createConditionalR2ObjectStore("private-bucket", {
    FLORIVA_PRIVATE_BACKUP_OBJECT_STORE: "local-r2-bridge",
    R2_LOCAL_BRIDGE_ENDPOINT: "http://127.0.0.1:8787",
    R2_LOCAL_BRIDGE_BEARER_SECRET: "s".repeat(43),
  }, { fetchImpl });
  expect(store).toBeInstanceOf(LocalR2BridgeObjectStore);
  expect(store.capabilities).toEqual({ conditionalCreate: true });
  expect(fetchImpl).not.toHaveBeenCalled();
  expect(() => createConditionalR2ObjectStore("private-bucket", {
    FLORIVA_PRIVATE_BACKUP_OBJECT_STORE: "wrangler",
  })).toThrow(/unsupported|selector/i);
});

it("accepts only an exact literal loopback bridge endpoint", () => {
  expect(validateLocalR2BridgeEndpoint("http://127.0.0.1:8787")).toBe("http://127.0.0.1:8787");
  expect(validateLocalR2BridgeEndpoint("http://[::1]:8787")).toBe("http://[::1]:8787");
  for (const endpoint of [
    "http://localhost:8787",
    "http://127.0.0.1.evil.test:8787",
    "https://example.com",
    "http://127.0.0.1:8787/path",
    "http://user:pass@127.0.0.1:8787",
  ]) {
    expect(() => validateLocalR2BridgeEndpoint(endpoint)).toThrow(/loopback|endpoint/i);
  }
});

it("creates a fresh task-private Wrangler env file without putting the bearer secret on argv", async () => {
  const root = await mkdtemp(path.join(tmpdir(), "floriva-bridge-runtime-"));
  const runtime = createLocalR2BridgeRuntimeSecretFile(root);
  expect(runtime.bearerSecret).toMatch(/^[A-Za-z0-9_-]{43,}$/);
  expect(runtime.envFilePath.replaceAll("\\", "/")).toContain("/.floriva-private/seo-ai-seo-recovery/2026-07-22/r2-bridge-runtime/");
  expect(await readFile(runtime.envFilePath, "utf8")).toBe(`BRIDGE_BEARER_SECRET=${runtime.bearerSecret}\n`);
  expect(runtime.wranglerEnvArgs).toEqual(["--env-file", runtime.envFilePath]);
  expect(runtime.wranglerEnvArgs.join(" ")).not.toContain(runtime.bearerSecret);
  const sibling = path.join(path.dirname(runtime.envFilePath), "keep.txt");
  await writeFile(sibling, "keep");
  removeLocalR2BridgeRuntimeSecretFile(root, runtime.envFilePath);
  expect(existsSync(runtime.envFilePath)).toBe(false);
  expect(existsSync(sibling)).toBe(true);
});

it("rejects malformed bridge object IDs before any request", async () => {
  const fetchImpl = vi.fn();
  const store = new LocalR2BridgeObjectStore("private-bucket", {
    endpoint: "http://127.0.0.1:8787",
    bearerSecret: "s".repeat(43),
    fetchImpl,
  });
  await expect(store.exists("../escape")).rejects.toThrow(/64.*hex|object/i);
  await expect(store.get("A".repeat(64))).rejects.toThrow(/64.*hex|object/i);
  await expect(store.putIfAbsent("a".repeat(63), Buffer.from("x"))).rejects.toThrow(/64.*hex|object/i);
  expect(fetchImpl).not.toHaveBeenCalled();
});

it("reads exact legacy 32-hex object IDs but rejects them for replacement PUT", async () => {
  const legacyObjectId = "c".repeat(32);
  const bytes = Buffer.from("legacy-ciphertext");
  const checksum = createHash("sha256").update(bytes).digest("hex");
  const fetchImpl = vi.fn(async (_url: string, init: RequestInit) => new Response(
    init.method === "HEAD" ? null : bytes,
    {
      status: 200,
      headers: {
        "content-type": "application/octet-stream",
        "content-length": String(bytes.length),
        "x-floriva-byte-length": String(bytes.length),
        "x-floriva-r2-bucket": "private-bucket",
        "x-floriva-object-id": legacyObjectId,
        "x-floriva-sha256": checksum,
      },
    },
  ));
  const store = new LocalR2BridgeObjectStore("private-bucket", {
    endpoint: "http://127.0.0.1:8787",
    bearerSecret: "s".repeat(43),
    fetchImpl,
  });
  await expect(store.exists(legacyObjectId)).resolves.toBe(true);
  await expect(store.get(legacyObjectId)).resolves.toEqual(bytes);
  await expect(store.putIfAbsent(legacyObjectId, Buffer.from("replacement"))).rejects.toThrow(/replacement|64.*hex|put/i);
  expect(fetchImpl).toHaveBeenCalledTimes(2);
  expect(fetchImpl.mock.calls.map(([, init]) => init.method)).toEqual(["HEAD", "GET"]);
  expect(fetchImpl.mock.calls.every(([, init]) => init.headers.get("x-floriva-object-id") === legacyObjectId)).toBe(true);
});

it("accepts the current prepared size through the 128 MiB boundary and rejects boundary plus one before bodies", async () => {
  const objectId = "d".repeat(64);
  const headersFor = (length: number) => ({
    "content-type": "application/octet-stream",
    "content-length": String(length),
    "x-floriva-byte-length": String(length),
    "x-floriva-r2-bucket": "private-bucket",
    "x-floriva-object-id": objectId,
    "x-floriva-sha256": "a".repeat(64),
  });
  const acceptedLengths = [CURRENT_PREPARED_CIPHERTEXT_BYTES, MAX_BRIDGE_OBJECT_BYTES];
  const acceptedHeadFetch = vi.fn(async () => new Response(null, {
    status: 200,
    headers: headersFor(acceptedLengths.shift() ?? 0),
  }));
  const acceptedHeadStore = new LocalR2BridgeObjectStore("private-bucket", {
    endpoint: "http://127.0.0.1:8787",
    bearerSecret: "s".repeat(43),
    fetchImpl: acceptedHeadFetch,
  });
  await expect(acceptedHeadStore.exists(objectId)).resolves.toBe(true);
  await expect(acceptedHeadStore.exists(objectId)).resolves.toBe(true);
  expect(acceptedHeadFetch).toHaveBeenCalledTimes(2);

  const acceptedGetArrayBuffer = vi.fn(async () => Uint8Array.from([1]).buffer);
  const acceptedGetStore = new LocalR2BridgeObjectStore("private-bucket", {
    endpoint: "http://127.0.0.1:8787",
    bearerSecret: "s".repeat(43),
    fetchImpl: vi.fn(async () => ({
      ok: true,
      status: 200,
      headers: new Headers(headersFor(CURRENT_PREPARED_CIPHERTEXT_BYTES)),
      arrayBuffer: acceptedGetArrayBuffer,
    }) as Response),
  });
  await expect(acceptedGetStore.get(objectId)).rejects.toThrow(/length|integrity/i);
  expect(acceptedGetArrayBuffer).toHaveBeenCalledTimes(1);

  const oversizedLength = MAX_BRIDGE_OBJECT_BYTES + 1;
  const oversizedHeadFetch = vi.fn(async () => new Response(null, {
    status: 200,
    headers: headersFor(oversizedLength),
  }));
  const oversizedHeadStore = new LocalR2BridgeObjectStore("private-bucket", {
    endpoint: "http://127.0.0.1:8787",
    bearerSecret: "s".repeat(43),
    fetchImpl: oversizedHeadFetch,
  });
  await expect(oversizedHeadStore.exists(objectId)).rejects.toThrow(/128 MiB|size|length|bounded/i);

  const oversizedGetArrayBuffer = vi.fn(async () => Uint8Array.from([1]).buffer);
  const oversizedGetFetch = vi.fn(async () => ({
    ok: true,
    status: 200,
    headers: new Headers(headersFor(oversizedLength)),
    arrayBuffer: oversizedGetArrayBuffer,
  }) as Response);
  const oversizedGetStore = new LocalR2BridgeObjectStore("private-bucket", {
    endpoint: "http://127.0.0.1:8787",
    bearerSecret: "s".repeat(43),
    fetchImpl: oversizedGetFetch,
  });
  await expect(oversizedGetStore.get(objectId)).rejects.toThrow(/128 MiB|size|length|bounded/i);
  expect(oversizedGetFetch).toHaveBeenCalledTimes(1);
  expect(oversizedGetArrayBuffer).not.toHaveBeenCalled();

  const oversizedPutFetch = vi.fn();
  const oversizedPutStore = new LocalR2BridgeObjectStore("private-bucket", {
    endpoint: "http://127.0.0.1:8787",
    bearerSecret: "s".repeat(43),
    fetchImpl: oversizedPutFetch,
  });
  await expect(oversizedPutStore.putIfAbsent(
    objectId,
    { byteLength: oversizedLength } as Buffer,
  )).rejects.toThrow(/128 MiB|size|length|bounded/i);
  expect(oversizedPutFetch).not.toHaveBeenCalled();
});

it("fails closed on bridge authentication failure and conditional collision without fallback", async () => {
  const unauthorizedFetch = vi.fn(async () => new Response('{"error":"unauthorized"}', { status: 401 }));
  const unauthorizedStore = new LocalR2BridgeObjectStore("private-bucket", {
    endpoint: "http://127.0.0.1:8787",
    bearerSecret: "s".repeat(43),
    fetchImpl: unauthorizedFetch,
  });
  await expect(unauthorizedStore.verifyBucket()).rejects.toThrow(/auth|401|bridge/i);
  expect(unauthorizedFetch).toHaveBeenCalledTimes(1);

  const collisionFetch = vi.fn(async () => new Response('{"error":"precondition_failed"}', {
    status: 412,
    headers: {
      "x-floriva-r2-bucket": "private-bucket",
      "x-floriva-object-id": "a".repeat(64),
    },
  }));
  const collisionStore = new LocalR2BridgeObjectStore("private-bucket", {
    endpoint: "http://127.0.0.1:8787",
    bearerSecret: "s".repeat(43),
    fetchImpl: collisionFetch,
  });
  await expect(collisionStore.putIfAbsent("a".repeat(64), Buffer.from("ciphertext"))).rejects.toMatchObject({
    code: "PRECONDITION_FAILED",
  });
  expect(collisionFetch).toHaveBeenCalledTimes(1);
  const [, request] = collisionFetch.mock.calls[0];
  expect(request.method).toBe("PUT");
  expect(request.headers.get("if-none-match")).toBe("*");
  expect(request.headers.get("authorization")).toBe(`Bearer ${"s".repeat(43)}`);
});

it("does not trust unbound bridge absence or collision responses", async () => {
  const objectId = "a".repeat(64);
  const absent = new LocalR2BridgeObjectStore("private-bucket", {
    endpoint: "http://127.0.0.1:8787",
    bearerSecret: "s".repeat(43),
    fetchImpl: vi.fn(async () => new Response(null, { status: 404 })),
  });
  await expect(absent.exists(objectId)).rejects.toThrow(/binding/i);

  const collision = new LocalR2BridgeObjectStore("private-bucket", {
    endpoint: "http://127.0.0.1:8787",
    bearerSecret: "s".repeat(43),
    fetchImpl: vi.fn(async () => new Response(null, { status: 412 })),
  });
  await expect(collision.putIfAbsent(objectId, Buffer.from("ciphertext"))).rejects.toThrow(/binding/i);
});

it("rejects mutated or truncated bridge reads against response checksum and length", async () => {
  const objectId = "b".repeat(64);
  const bytes = Buffer.from("abc");
  const correctSha = createHash("sha256").update(bytes).digest("hex");
  const headers = {
    "content-type": "application/octet-stream",
    "x-floriva-r2-bucket": "private-bucket",
    "x-floriva-object-id": objectId,
  };
  const mutated = new LocalR2BridgeObjectStore("private-bucket", {
    endpoint: "http://127.0.0.1:8787",
    bearerSecret: "s".repeat(43),
    fetchImpl: vi.fn(async () => new Response(bytes, {
      status: 200,
      headers: { ...headers, "content-length": String(bytes.length), "x-floriva-byte-length": String(bytes.length), "x-floriva-sha256": "f".repeat(64) },
    })),
  });
  await expect(mutated.get(objectId)).rejects.toThrow(/checksum|sha-?256|integrity/i);

  const truncated = new LocalR2BridgeObjectStore("private-bucket", {
    endpoint: "http://127.0.0.1:8787",
    bearerSecret: "s".repeat(43),
    fetchImpl: vi.fn(async () => new Response(bytes, {
      status: 200,
      headers: { ...headers, "content-length": "4", "x-floriva-byte-length": "4", "x-floriva-sha256": correctSha },
    })),
  });
  await expect(truncated.get(objectId)).rejects.toThrow(/length|truncat|integrity/i);
});

it("requires remote-derived clean-restore proof immediately before publication", () => {
  const receipt = {
    schemaVersion: 2, provider: "cloudflare-r2", bucket: "private", objectId: "1".repeat(64),
    ciphertextSha256: "a".repeat(64), ciphertextByteLength: 1,
    encryption: { algorithm: "AES-256-GCM", version: 1, nonceBase64: Buffer.alloc(12).toString("base64"), tagBase64: Buffer.alloc(16).toString("base64") },
    keyId: "key", wranglerVersion: "4.84.1", preparedAt: "2026-07-22T12:00:00.000Z",
    publicationOrder: "remote-verified-before-canonical-receipt", remoteState: "verified-clean-restore", uploadedAt: "2026-07-22T12:01:00.000Z",
    trustedBindings: Object.fromEntries(["descriptorSha256", "verifierSha256", "rawInventorySha256", "priorBindingSha256", "archiveInventorySha256"].map((name) => [name, "a".repeat(64)])), supersedes: { ...supersedes, previousObjectVerification: { objectId: supersedes.previousObjectId, ciphertextSha256: "b".repeat(64), ciphertextByteLength: 1, unchanged: true } },
    cleanRestore: { valid: true, archiveSha256: "a".repeat(64), validatedAt: "2026-07-22T12:02:00.000Z" },
  };
  expect(validateBackupReceipt(receipt, { requireCleanRestore: true }).valid).toBe(false);
  receipt.cleanRestore.verificationSource = "remote-object-clean-restore";
  receipt.cleanRestore.remoteVerifiedAt = receipt.cleanRestore.validatedAt;
  expect(validateBackupReceipt(receipt, { requireCleanRestore: true }).valid).toBe(false);
  receipt.cleanRestore.validatedFileCount = 1;
  expect(validateBackupReceipt(receipt, { requireCleanRestore: true }).valid).toBe(true);
});

it("rejects nonportable archive paths and noncanonical AES-GCM receipts", () => {
  for (const invalid of ["../escape", "C:/escape", "file:stream", "CON", "CONIN$", "CONOUT$", "CLOCK$", "COM¹", "COM²", "COM³", "LPT¹", "LPT²", "LPT³", "name. "]) {
    expect(() => safeArchivePath(invalid)).toThrow();
  }
  const receipt = {
    schemaVersion: 2,
    provider: "cloudflare-r2",
    bucket: "private-bucket",
    objectId: "1".repeat(64),
    ciphertextSha256: "a".repeat(64),
    ciphertextByteLength: 1,
    encryption: { algorithm: "AES-256-GCM", version: 1, nonceBase64: "AA==", tagBase64: "AA==" },
    keyId: "key",
    wranglerVersion: "4.84.1",
    preparedAt: "2026-07-22T12:00:00.000Z",
    publicationOrder: "remote-verified-before-canonical-receipt",
    remoteState: "verified-clean-restore",
    uploadedAt: "2026-07-22T12:01:00.000Z",
    trustedBindings: {
      descriptorSha256: "a".repeat(64), verifierSha256: "a".repeat(64), rawInventorySha256: "a".repeat(64),
      priorBindingSha256: "a".repeat(64), archiveInventorySha256: "a".repeat(64),
    },
    supersedes,
  };
  expect(validateBackupReceipt(receipt).valid).toBe(false);
});

it("requires descriptor and pinned verifier before any upload", async () => {
  const root = await mkdtemp(path.join(tmpdir(), "floriva-backup-missing-verifier-"));
  const rollback = path.join(root, "rollback");
  await mkdir(rollback, { recursive: true });
  const inventory = path.join(root, "inventory.json");
  await writeFile(inventory, JSON.stringify({ records: [] }));
  const store = new MemoryObjectStore();
  await expect(backupPrivateEvidence({
    rollbackDirectory: rollback,
    rawInventoryPath: inventory,
    resolveRawObject: async () => "",
    objectStore: store,
    bucket: "private",
    key: Buffer.alloc(32),
    keyId: "key",
    objectId: "4".repeat(64),
    wranglerVersion: "4.84.1",
    restoreTestRoot: path.join(root, "restore"),
    persistReceiptBeforeUpload: async () => {},
    supersedes,
  })).rejects.toThrow(/descriptor/);
  expect(store.objects.size).toBe(0);
});
