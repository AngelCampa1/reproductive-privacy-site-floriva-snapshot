import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { createRequire } from "node:module";
import path from "node:path";
import { describe, expect, it, vi } from "vitest";
import bridgeWorker from "../src/private-backup-r2-bridge.mjs";

const secret = "s".repeat(43);
const bucketName = "private-bucket";
const objectId = "a".repeat(64);
const CURRENT_PREPARED_CIPHERTEXT_BYTES = 88_919_517;
const MAX_OBJECT_BYTES = 128 * 1024 * 1024;

function parseTomlScalar(source: string): string | boolean {
  if (source === "true") return true;
  if (source === "false") return false;
  if (/^"(?:[^"\\]|\\.)*"$/.test(source)) return JSON.parse(source);
  throw new Error(`unsupported TOML scalar in bridge test: ${source}`);
}

function parseBridgeToml(source: string): Record<string, unknown> {
  const root: Record<string, unknown> = {};
  let target = root;
  for (const rawLine of source.split(/\r?\n/)) {
    const line = rawLine.trim();
    if (!line || line.startsWith("#")) continue;
    const arrayTable = line.match(/^\[\[([a-z0-9_]+)\]\]$/);
    if (arrayTable) {
      const table: Record<string, unknown> = {};
      const existing = root[arrayTable[1]];
      if (existing === undefined) root[arrayTable[1]] = [table];
      else if (Array.isArray(existing)) existing.push(table);
      else throw new Error(`TOML table shape drifted: ${arrayTable[1]}`);
      target = table;
      continue;
    }
    const table = line.match(/^\[([a-z0-9_]+)\]$/);
    if (table) {
      const next: Record<string, unknown> = {};
      if (root[table[1]] !== undefined) throw new Error(`duplicate TOML table: ${table[1]}`);
      root[table[1]] = next;
      target = next;
      continue;
    }
    const assignment = line.match(/^([A-Za-z0-9_]+)\s*=\s*(.+)$/);
    if (!assignment) throw new Error(`unsupported TOML line in bridge test: ${line}`);
    target[assignment[1]] = parseTomlScalar(assignment[2]);
  }
  return root;
}

function request(method: string, id = objectId, init: RequestInit = {}) {
  return new Request(`http://127.0.0.1:8787/v1/objects/${id}`, {
    ...init,
    method,
    headers: {
      authorization: `Bearer ${secret}`,
      "x-floriva-r2-bucket": bucketName,
      "x-floriva-object-id": id,
      ...(init.headers ?? {}),
    },
  });
}

function env(bucket: Record<string, unknown>) {
  return {
    BRIDGE_BEARER_SECRET: secret,
    EXPECTED_BUCKET: bucketName,
    PRIVATE_BACKUPS: { list: vi.fn(async () => ({ objects: [], truncated: false })), ...bucket },
  };
}

describe("private backup R2 bridge Worker", () => {
  it("pins the complete reviewed local-only Wrangler and remote R2 contract", () => {
    const config = parseBridgeToml(readFileSync(
      path.resolve(process.cwd(), "worker", "wrangler.r2-private-backup-bridge.toml"),
      "utf8",
    ));
    expect(config).toEqual({
      name: "floriva-private-backup-r2-local-bridge",
      main: "src/private-backup-r2-bridge.mjs",
      compatibility_date: "2026-04-21",
      workers_dev: false,
      send_metrics: false,
      vars: {
        EXPECTED_BUCKET: "floriva-seo-private-backups",
      },
      r2_buckets: [{
        binding: "PRIVATE_BACKUPS",
        bucket_name: "floriva-seo-private-backups",
        remote: true,
      }],
    });
  });

  it("does not configure a compatibility date newer than Wrangler's installed workerd runtime", () => {
    const config = parseBridgeToml(readFileSync(
      path.resolve(process.cwd(), "worker", "wrangler.r2-private-backup-bridge.toml"),
      "utf8",
    ));
    const configuredCompatibilityDate = config.compatibility_date;
    if (typeof configuredCompatibilityDate !== "string") {
      throw new Error("bridge compatibility_date must be a TOML string");
    }
    const projectRequire = createRequire(path.resolve(process.cwd(), "package.json"));
    const wranglerEntrypoint = projectRequire.resolve("wrangler");
    const wranglerRequire = createRequire(wranglerEntrypoint);
    const workerdEntrypoint = wranglerRequire.resolve("workerd/lib/main.js");
    const installedWorkerd = wranglerRequire(workerdEntrypoint) as {
      compatibilityDate: string;
      version: string;
    };
    expect(installedWorkerd.version).toMatch(/^1\.\d{8}\.\d+$/);
    expect(installedWorkerd.compatibilityDate).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    expect(configuredCompatibilityDate <= installedWorkerd.compatibilityDate).toBe(true);
  });

  it("verifies the remote binding with one bounded list probe and exposes no list/delete method", async () => {
    const bucket = { list: vi.fn(async () => ({ objects: [], truncated: false })), get: vi.fn(), put: vi.fn() };
    const response = await bridgeWorker.fetch(new Request("http://127.0.0.1:8787/v1/bucket", {
      method: "HEAD",
      headers: {
        authorization: `Bearer ${secret}`,
        "x-floriva-r2-bucket": bucketName,
      },
    }), env(bucket));
    expect(response.status).toBe(204);
    expect(bucket.list).toHaveBeenCalledTimes(1);
    expect(bucket.list).toHaveBeenCalledWith({ limit: 1 });
    expect("delete" in bucket).toBe(false);
    expect(bucket.get).not.toHaveBeenCalled();
    expect(bucket.put).not.toHaveBeenCalled();
    const publicList = await bridgeWorker.fetch(new Request("http://127.0.0.1:8787/v1/objects", {
      method: "GET",
      headers: {
        authorization: `Bearer ${secret}`,
        "x-floriva-r2-bucket": bucketName,
      },
    }), env(bucket));
    expect(publicList.status).toBe(400);
  });

  it("fails bucket verification closed when the bounded remote probe fails", async () => {
    const bucket = { list: vi.fn(async () => { throw new Error("remote unavailable"); }), get: vi.fn(), put: vi.fn() };
    const response = await bridgeWorker.fetch(new Request("http://127.0.0.1:8787/v1/bucket", {
      method: "HEAD",
      headers: {
        authorization: `Bearer ${secret}`,
        "x-floriva-r2-bucket": bucketName,
      },
    }), env(bucket));
    expect(response.status).toBe(502);
    expect(await response.json()).toEqual({ error: "r2_binding_probe_failed" });
  });

  it("rejects missing authentication before touching R2", async () => {
    const bucket = { get: vi.fn(), put: vi.fn() };
    const response = await bridgeWorker.fetch(new Request(
      `http://127.0.0.1:8787/v1/objects/${objectId}`,
      { method: "GET", headers: { "x-floriva-r2-bucket": bucketName, "x-floriva-object-id": objectId } },
    ), env(bucket));
    expect(response.status).toBe(401);
    expect(bucket.get).not.toHaveBeenCalled();
    expect(bucket.put).not.toHaveBeenCalled();
  });

  it("rejects malformed keys and unbounded methods before touching R2", async () => {
    const bucket = { get: vi.fn(), put: vi.fn() };
    expect((await bridgeWorker.fetch(request("GET", "../escape"), env(bucket))).status).toBe(400);
    expect((await bridgeWorker.fetch(request("DELETE"), env(bucket))).status).toBe(405);
    expect((await bridgeWorker.fetch(request("POST"), env(bucket))).status).toBe(405);
    expect(bucket.get).not.toHaveBeenCalled();
    expect(bucket.put).not.toHaveBeenCalled();
  });

  it("uses exactly one provider-conditional create and maps null to collision", async () => {
    const put = vi.fn(async (
      _key: string,
      _value: Uint8Array,
      _options: { onlyIf: Headers },
    ) => null);
    const bucket = { get: vi.fn(), put };
    const bytes = Buffer.from("ciphertext");
    const sha256 = createHash("sha256").update(bytes).digest("hex");
    const response = await bridgeWorker.fetch(request("PUT", objectId, {
      body: bytes,
      headers: {
        "content-length": String(bytes.length),
        "x-floriva-byte-length": String(bytes.length),
        "x-floriva-sha256": sha256,
        "if-none-match": "*",
      },
    }), env(bucket));
    expect(response.status).toBe(412);
    expect(response.headers.get("x-floriva-r2-bucket")).toBe(bucketName);
    expect(response.headers.get("x-floriva-object-id")).toBe(objectId);
    expect(bucket.put).toHaveBeenCalledTimes(1);
    const [key, value, options] = bucket.put.mock.calls[0];
    expect(key).toBe(objectId);
    expect(Buffer.from(value)).toEqual(bytes);
    expect(options.onlyIf).toBeInstanceOf(Headers);
    expect(options.onlyIf.get("if-none-match")).toBe("*");
    expect(bucket.get).not.toHaveBeenCalled();
  });

  it("binds a missing-object response to the exact bucket and object ID", async () => {
    const bucket = { get: vi.fn(async () => null), put: vi.fn() };
    const response = await bridgeWorker.fetch(request("HEAD"), env(bucket));
    expect(response.status).toBe(404);
    expect(response.headers.get("x-floriva-r2-bucket")).toBe(bucketName);
    expect(response.headers.get("x-floriva-object-id")).toBe(objectId);
  });

  it("supports exact legacy 32-hex HEAD/GET reads but rejects legacy PUT before R2", async () => {
    const legacyObjectId = "c".repeat(32);
    const bytes = Buffer.from("legacy-ciphertext");
    const bucket = {
      get: vi.fn(async (key: string) => ({
        key,
        size: bytes.length,
        customMetadata: {},
        arrayBuffer: async () => bytes,
      })),
      put: vi.fn(),
    };
    const head = await bridgeWorker.fetch(request("HEAD", legacyObjectId), env(bucket));
    expect(head.status).toBe(200);
    expect(head.headers.get("x-floriva-object-id")).toBe(legacyObjectId);
    const get = await bridgeWorker.fetch(request("GET", legacyObjectId), env(bucket));
    expect(get.status).toBe(200);
    expect(get.headers.get("x-floriva-object-id")).toBe(legacyObjectId);
    expect(Buffer.from(await get.arrayBuffer())).toEqual(bytes);
    expect(bucket.get).toHaveBeenCalledTimes(2);
    expect(bucket.get).toHaveBeenNthCalledWith(1, legacyObjectId);
    expect(bucket.get).toHaveBeenNthCalledWith(2, legacyObjectId);

    const checksum = createHash("sha256").update(bytes).digest("hex");
    const put = await bridgeWorker.fetch(request("PUT", legacyObjectId, {
      body: bytes,
      headers: {
        "content-length": String(bytes.length),
        "x-floriva-byte-length": String(bytes.length),
        "x-floriva-sha256": checksum,
        "if-none-match": "*",
      },
    }), env(bucket));
    expect(put.status).toBe(400);
    expect(put.headers.get("x-floriva-object-id")).toBe(legacyObjectId);
    expect(bucket.put).not.toHaveBeenCalled();
  });

  it("rejects truncated writes before conditional create", async () => {
    const bucket = { get: vi.fn(), put: vi.fn() };
    const bytes = Buffer.from("abc");
    const response = await bridgeWorker.fetch(request("PUT", objectId, {
      body: bytes,
      headers: {
        "content-length": "4",
        "x-floriva-byte-length": "4",
        "x-floriva-sha256": createHash("sha256").update(bytes).digest("hex"),
        "if-none-match": "*",
      },
    }), env(bucket));
    expect(response.status).toBe(400);
    expect(bucket.put).not.toHaveBeenCalled();
  });

  it("accepts declared writes through 128 MiB and rejects boundary plus one before body or R2", async () => {
    const bucket = { get: vi.fn(), put: vi.fn() };
    const requestWithDeclaredLength = (length: number, arrayBuffer: ReturnType<typeof vi.fn>) => ({
      url: `http://127.0.0.1:8787/v1/objects/${objectId}`,
      method: "PUT",
      headers: new Headers({
        authorization: `Bearer ${secret}`,
        "x-floriva-r2-bucket": bucketName,
        "x-floriva-object-id": objectId,
        "content-length": String(length),
        "x-floriva-byte-length": String(length),
        "x-floriva-sha256": "a".repeat(64),
        "if-none-match": "*",
      }),
      arrayBuffer,
    }) as unknown as Request;

    for (const acceptedLength of [CURRENT_PREPARED_CIPHERTEXT_BYTES, MAX_OBJECT_BYTES]) {
      const arrayBuffer = vi.fn(async () => Uint8Array.from([1]).buffer);
      const response = await bridgeWorker.fetch(
        requestWithDeclaredLength(acceptedLength, arrayBuffer),
        env(bucket),
      );
      expect(response.status).toBe(400);
      await expect(response.json()).resolves.toEqual({ error: "request_body_truncated" });
      expect(arrayBuffer).toHaveBeenCalledTimes(1);
    }

    const oversizedArrayBuffer = vi.fn(async () => Uint8Array.from([1]).buffer);
    const oversized = await bridgeWorker.fetch(
      requestWithDeclaredLength(MAX_OBJECT_BYTES + 1, oversizedArrayBuffer),
      env(bucket),
    );
    expect(oversized.status).toBe(400);
    await expect(oversized.json()).resolves.toEqual({ error: "invalid_object_integrity_headers" });
    expect(oversizedArrayBuffer).not.toHaveBeenCalled();
    expect(bucket.put).not.toHaveBeenCalled();
  });

  it("fails closed when a remote read is truncated or mutated", async () => {
    const bytes = Buffer.from("abc");
    const truncatedBucket = {
      put: vi.fn(),
      get: vi.fn(async () => ({
        key: objectId,
        size: 4,
        customMetadata: { sha256: createHash("sha256").update(bytes).digest("hex"), byteLength: "4", bucket: bucketName, objectId },
        arrayBuffer: async () => bytes,
      })),
    };
    expect((await bridgeWorker.fetch(request("GET"), env(truncatedBucket))).status).toBe(502);

    const mutatedBucket = {
      put: vi.fn(),
      get: vi.fn(async () => ({
        key: objectId,
        size: bytes.length,
        customMetadata: { sha256: "f".repeat(64), byteLength: String(bytes.length), bucket: bucketName, objectId },
        arrayBuffer: async () => bytes,
      })),
    };
    expect((await bridgeWorker.fetch(request("GET"), env(mutatedBucket))).status).toBe(502);
  });
});
