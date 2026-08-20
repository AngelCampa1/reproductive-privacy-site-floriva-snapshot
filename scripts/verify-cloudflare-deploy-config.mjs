import { execFileSync } from "node:child_process";
import fs from "node:fs";

const pagesProject = "floriva-web";
const emailWorker = "floriva-email";
const requiredPagesSecretNames = [
  "INTERNAL_SEND_SECRET",
  "LEAD_MAGNET_DOWNLOAD_SIGNING_SECRET",
  "TURNSTILE_SECRET_KEY",
];
// The floriva-email Worker owns the Cloudflare Email Service send binding; the Pages
// project reaches it over the EMAIL_WORKER service binding using this shared secret.
const requiredWorkerSecretNames = ["INTERNAL_SEND_SECRET"];
const requiredBuildEnv = ["VITE_TURNSTILE_SITE_KEY"];
const sequenceStoreCta = "/api/store/ios";
const deploymentOrigin = process.env.DEPLOY_READINESS_ORIGIN || "https://floriva.app";
const requireLiveStoreRedirects = process.env.REQUIRE_LIVE_STORE_REDIRECTS === "true";
const liveStoreTargets = ["ios", "android"];
const pnpmCommand = process.env.npm_execpath
  ? { command: process.execPath, prefixArgs: [process.env.npm_execpath] }
  : { command: process.platform === "win32" ? "cmd.exe" : "pnpm", prefixArgs: process.platform === "win32" ? ["/c", "pnpm"] : [] };

function run(command, args) {
  return execFileSync(command, args, {
    encoding: "utf8",
    stdio: ["ignore", "pipe", "pipe"],
  });
}

function requireWranglerListContains(output, names, label) {
  const missing = names.filter((name) => !output.includes(name));

  if (missing.length > 0) {
    throw new Error(`${label} is missing required secret(s): ${missing.join(", ")}`);
  }
}

function readLocalEnv(path) {
  if (!fs.existsSync(path)) {
    return {};
  }

  const env = {};
  const source = fs.readFileSync(path, "utf8");

  for (const line of source.split(/\r?\n/)) {
    const match = line.match(/^\s*([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*)\s*$/);

    if (match) {
      env[match[1]] = match[2].trim().replace(/^["']|["']$/g, "");
    }
  }

  return env;
}

function requireBuildEnv(names) {
  const localEnv = readLocalEnv(".env.local");
  const missing = names.filter((name) => !(process.env[name]?.trim() || localEnv[name]?.trim()));

  if (missing.length > 0) {
    throw new Error(`Build environment is missing required value(s): ${missing.join(", ")}`);
  }
}

function requireNoStoreEndpointSequenceCtas() {
  const source = fs.readFileSync("src/site/knowledge/lead-magnet-email-data.ts", "utf8");

  if (source.includes(`ctaPath: "${sequenceStoreCta}"`)) {
    throw new Error(`Lead magnet sequence CTAs must not point at unconfigured store endpoint ${sequenceStoreCta}.`);
  }
}

function requireHttpUrl(value, label) {
  let url;

  try {
    url = new URL(value);
  } catch {
    throw new Error(`${label} must be a valid URL.`);
  }

  if (!/^https?:$/.test(url.protocol)) {
    throw new Error(`${label} must use http or https.`);
  }

  return url;
}

async function requireLiveStoreRedirectConfig() {
  const origin = requireHttpUrl(deploymentOrigin, "DEPLOY_READINESS_ORIGIN");
  const healthUrl = new URL("/api/health", origin);
  const healthResponse = await fetch(healthUrl, {
    headers: { Accept: "application/json" },
  });

  if (!healthResponse.ok) {
    throw new Error(`Live health check failed: ${healthResponse.status} ${healthResponse.statusText}`);
  }

  const health = await healthResponse.json();
  const storeRedirects = health?.integrations?.storeRedirects;
  const storeRedirectErrors = health?.integrations?.storeRedirectErrors ?? {};

  for (const target of liveStoreTargets) {
    if (storeRedirectErrors[target]) {
      throw new Error(`Live ${target} store redirect has config error: ${storeRedirectErrors[target]}`);
    }

    if (storeRedirects?.[target] !== true) {
      throw new Error(`Live ${target} store redirect is not configured.`);
    }

    const redirectUrl = new URL(`/api/store/${target}`, origin);
    const redirectResponse = await fetch(redirectUrl, {
      redirect: "manual",
    });
    const location = redirectResponse.headers.get("location");

    if (![301, 302, 303, 307, 308].includes(redirectResponse.status) || !location) {
      throw new Error(
        `Live ${target} store redirect did not return a redirect with Location.`,
      );
    }

    requireHttpUrl(location, `Live ${target} store redirect Location`);
  }
}

const pagesSecrets = run(pnpmCommand.command, [
  ...pnpmCommand.prefixArgs,
  "exec",
  "wrangler",
  "pages",
  "secret",
  "list",
  "--project-name",
  pagesProject,
]);
requireWranglerListContains(pagesSecrets, requiredPagesSecretNames, "Cloudflare Pages production");

const workerSecrets = run(pnpmCommand.command, [
  ...pnpmCommand.prefixArgs,
  "exec",
  "wrangler",
  "secret",
  "list",
  "--config",
  "worker/wrangler.toml",
]);
requireWranglerListContains(workerSecrets, requiredWorkerSecretNames, `Cloudflare Worker ${emailWorker}`);

requireBuildEnv(requiredBuildEnv);

requireNoStoreEndpointSequenceCtas();

if (requireLiveStoreRedirects) {
  await requireLiveStoreRedirectConfig();
} else {
  console.warn("skipped live store redirect verification; set REQUIRE_LIVE_STORE_REDIRECTS=true to enforce it");
}

console.log("verified Cloudflare Pages secrets, vars, and lead magnet CTA destinations");
