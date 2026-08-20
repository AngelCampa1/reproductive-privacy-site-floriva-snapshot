const HASH_PATTERN = /^[a-f0-9]{64}$/;
const BUCKET_PATTERN = /^[a-z0-9][a-z0-9.-]{1,61}[a-z0-9]$/;
const SECRET_PATTERN = /^[A-Za-z0-9_-]{43,128}$/;
const MAX_OBJECT_BYTES = 128 * 1024 * 1024;
const BRIDGE_VERSION = "1";

function jsonError(status, code, headers = {}) {
  const responseHeaders = new Headers(headers);
  responseHeaders.set("content-type", "application/json; charset=utf-8");
  responseHeaders.set("cache-control", "no-store");
  return new Response(JSON.stringify({ error: code }), {
    status,
    headers: responseHeaders,
  });
}

function isLoopbackUrl(url) {
  return url.protocol === "http:" && ["127.0.0.1", "[::1]"].includes(url.hostname);
}

async function sha256Hex(bytes) {
  const digest = await crypto.subtle.digest("SHA-256", bytes);
  return [...new Uint8Array(digest)].map((value) => value.toString(16).padStart(2, "0")).join("");
}

async function secretsEqual(received, expected) {
  const [left, right] = await Promise.all([
    sha256Hex(new TextEncoder().encode(received)),
    sha256Hex(new TextEncoder().encode(expected)),
  ]);
  let difference = 0;
  for (let index = 0; index < left.length; index += 1) {
    difference |= left.charCodeAt(index) ^ right.charCodeAt(index);
  }
  return difference === 0;
}

function bindingHeaders(bucket, objectId = null, byteLength = null, checksum = null) {
  const headers = new Headers({
    "cache-control": "no-store",
    "x-content-type-options": "nosniff",
    "x-floriva-r2-bucket": bucket,
  });
  if (objectId !== null) headers.set("x-floriva-object-id", objectId);
  if (byteLength !== null) {
    headers.set("content-length", String(byteLength));
    headers.set("x-floriva-byte-length", String(byteLength));
  }
  if (checksum !== null) headers.set("x-floriva-sha256", checksum);
  return headers;
}

async function readVerifiedObject(bucketBinding, bucketName, objectId) {
  let object;
  try {
    object = await bucketBinding.get(objectId);
  } catch {
    return { error: jsonError(502, "r2_read_failed", bindingHeaders(bucketName, objectId)) };
  }
  if (object === null) return { missing: true };
  if (object.key !== objectId || !Number.isSafeInteger(object.size) || object.size < 1 || object.size > MAX_OBJECT_BYTES) {
    return { error: jsonError(502, "r2_object_binding_invalid", bindingHeaders(bucketName, objectId)) };
  }
  let bytes;
  try {
    bytes = new Uint8Array(await object.arrayBuffer());
  } catch {
    return { error: jsonError(502, "r2_body_read_failed", bindingHeaders(bucketName, objectId)) };
  }
  if (bytes.byteLength !== object.size) {
    return { error: jsonError(502, "r2_object_truncated", bindingHeaders(bucketName, objectId)) };
  }
  const checksum = await sha256Hex(bytes);
  const metadata = object.customMetadata ?? {};
  if (metadata.florivaBridgeVersion !== undefined) {
    if (
      metadata.florivaBridgeVersion !== BRIDGE_VERSION ||
      metadata.bucket !== bucketName ||
      metadata.objectId !== objectId ||
      metadata.byteLength !== String(bytes.byteLength) ||
      metadata.sha256 !== checksum
    ) {
      return { error: jsonError(502, "r2_object_metadata_mismatch", bindingHeaders(bucketName, objectId)) };
    }
  } else if (
    (metadata.bucket !== undefined && metadata.bucket !== bucketName) ||
    (metadata.objectId !== undefined && metadata.objectId !== objectId) ||
    (metadata.byteLength !== undefined && metadata.byteLength !== String(bytes.byteLength)) ||
    (metadata.sha256 !== undefined && metadata.sha256 !== checksum)
  ) {
    return { error: jsonError(502, "r2_object_metadata_mismatch", bindingHeaders(bucketName, objectId)) };
  }
  return { bytes, checksum };
}

async function fetchBridge(request, env) {
  const url = new URL(request.url);
  if (!isLoopbackUrl(url)) return jsonError(403, "loopback_required");
  if (
    !env?.PRIVATE_BACKUPS ||
    typeof env.PRIVATE_BACKUPS.list !== "function" ||
    typeof env.PRIVATE_BACKUPS.get !== "function" ||
    typeof env.PRIVATE_BACKUPS.put !== "function" ||
    !BUCKET_PATTERN.test(env.EXPECTED_BUCKET ?? "") ||
    (env.EXPECTED_BUCKET ?? "").includes("..") ||
    !SECRET_PATTERN.test(env.BRIDGE_BEARER_SECRET ?? "")
  ) {
    return jsonError(503, "bridge_runtime_invalid");
  }

  const authorization = request.headers.get("authorization") ?? "";
  const receivedSecret = authorization.startsWith("Bearer ") ? authorization.slice(7) : "";
  if (!SECRET_PATTERN.test(receivedSecret) || !(await secretsEqual(receivedSecret, env.BRIDGE_BEARER_SECRET))) {
    return jsonError(401, "unauthorized", { "www-authenticate": "Bearer" });
  }
  if (request.headers.get("x-floriva-r2-bucket") !== env.EXPECTED_BUCKET) {
    return jsonError(409, "bucket_binding_mismatch");
  }

  if (url.pathname === "/v1/bucket") {
    if (request.method !== "HEAD") return jsonError(405, "method_not_allowed", { allow: "HEAD" });
    try {
      const probe = await env.PRIVATE_BACKUPS.list({ limit: 1 });
      if (!probe || !Array.isArray(probe.objects) || probe.objects.length > 1) {
        return jsonError(502, "r2_binding_probe_invalid", bindingHeaders(env.EXPECTED_BUCKET));
      }
    } catch {
      return jsonError(502, "r2_binding_probe_failed", bindingHeaders(env.EXPECTED_BUCKET));
    }
    return new Response(null, { status: 204, headers: bindingHeaders(env.EXPECTED_BUCKET) });
  }

  const match = url.pathname.match(/^\/v1\/objects\/((?:[a-f0-9]{32}|[a-f0-9]{64}))$/);
  if (!match) return jsonError(400, "invalid_object_id");
  const objectId = match[1];
  if (request.headers.get("x-floriva-object-id") !== objectId) {
    return jsonError(409, "object_binding_mismatch", bindingHeaders(env.EXPECTED_BUCKET, objectId));
  }
  if (!["HEAD", "GET", "PUT"].includes(request.method)) {
    return jsonError(405, "method_not_allowed", { allow: "HEAD, GET, PUT" });
  }

  if (request.method === "PUT") {
    if (objectId.length !== 64) {
      return jsonError(400, "replacement_object_id_must_be_64_hex", bindingHeaders(env.EXPECTED_BUCKET, objectId));
    }
    if (request.headers.get("if-none-match") !== "*") {
      return jsonError(428, "conditional_create_required", bindingHeaders(env.EXPECTED_BUCKET, objectId));
    }
    const declaredLength = Number(request.headers.get("content-length"));
    const boundLength = Number(request.headers.get("x-floriva-byte-length"));
    const declaredChecksum = request.headers.get("x-floriva-sha256") ?? "";
    if (
      !Number.isSafeInteger(declaredLength) ||
      declaredLength < 1 ||
      declaredLength > MAX_OBJECT_BYTES ||
      boundLength !== declaredLength ||
      !HASH_PATTERN.test(declaredChecksum)
    ) {
      return jsonError(400, "invalid_object_integrity_headers", bindingHeaders(env.EXPECTED_BUCKET, objectId));
    }
    const bytes = new Uint8Array(await request.arrayBuffer());
    if (bytes.byteLength !== declaredLength) {
      return jsonError(400, "request_body_truncated", bindingHeaders(env.EXPECTED_BUCKET, objectId));
    }
    const checksum = await sha256Hex(bytes);
    if (checksum !== declaredChecksum) {
      return jsonError(400, "request_checksum_mismatch", bindingHeaders(env.EXPECTED_BUCKET, objectId));
    }
    let created;
    try {
      created = await env.PRIVATE_BACKUPS.put(objectId, bytes, {
        onlyIf: new Headers({ "If-None-Match": "*" }),
        sha256: checksum,
        customMetadata: {
          florivaBridgeVersion: BRIDGE_VERSION,
          bucket: env.EXPECTED_BUCKET,
          objectId,
          byteLength: String(bytes.byteLength),
          sha256: checksum,
        },
      });
    } catch {
      return jsonError(502, "r2_conditional_put_failed", bindingHeaders(env.EXPECTED_BUCKET, objectId));
    }
    if (created === null) {
      return jsonError(412, "precondition_failed", bindingHeaders(env.EXPECTED_BUCKET, objectId));
    }
    if (created.key !== objectId || created.size !== bytes.byteLength) {
      return jsonError(502, "r2_put_result_mismatch", bindingHeaders(env.EXPECTED_BUCKET, objectId));
    }
    const verified = await readVerifiedObject(env.PRIVATE_BACKUPS, env.EXPECTED_BUCKET, objectId);
    if (verified.error) return verified.error;
    if (verified.missing || verified.checksum !== checksum || verified.bytes.byteLength !== bytes.byteLength) {
      return jsonError(502, "r2_post_put_verification_failed", bindingHeaders(env.EXPECTED_BUCKET, objectId));
    }
    return new Response(null, {
      status: 201,
      headers: bindingHeaders(env.EXPECTED_BUCKET, objectId, bytes.byteLength, checksum),
    });
  }

  const verified = await readVerifiedObject(env.PRIVATE_BACKUPS, env.EXPECTED_BUCKET, objectId);
  if (verified.error) return verified.error;
  if (verified.missing) {
    return jsonError(404, "object_not_found", bindingHeaders(env.EXPECTED_BUCKET, objectId));
  }
  const headers = bindingHeaders(env.EXPECTED_BUCKET, objectId, verified.bytes.byteLength, verified.checksum);
  headers.set("content-type", "application/octet-stream");
  return new Response(request.method === "HEAD" ? null : verified.bytes, { status: 200, headers });
}

export default { fetch: fetchBridge };
