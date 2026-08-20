// Schedules every entry in social/x/posts.index.json to Postiz via the
// `postiz posts:create` CLI. Idempotent: re-running skips posts that already
// have status "scheduled" in social/x/schedule-results.json.
//
// Run: node scripts/schedule-x-posts.mjs
// Optional flags:
//   --campaign-dir=<dir>  Read posts.index.json and schedule-results.json there.
//   --dry-run         Print the commands that would execute without running them.
//   --only=<id>       Schedule only the post with this id (for the test schedule).
//   --limit=<n>       Schedule only the first n unscheduled posts.

import { readFileSync, writeFileSync, existsSync } from "node:fs";
import { resolve } from "node:path";
import { spawn } from "node:child_process";

const args = process.argv.slice(2);
const CAMPAIGN_DIR_FLAG = args.find((a) => a.startsWith("--campaign-dir="));
const CAMPAIGN_DIR = resolve(CAMPAIGN_DIR_FLAG ? CAMPAIGN_DIR_FLAG.split("=")[1] : "social/x");
const INDEX_FILE = resolve(CAMPAIGN_DIR, "posts.index.json");
const RESULTS_FILE = resolve(CAMPAIGN_DIR, "schedule-results.json");
const DRY_RUN = args.includes("--dry-run");
const ONLY_FLAG = args.find((a) => a.startsWith("--only="));
const ONLY_ID = ONLY_FLAG ? ONLY_FLAG.split("=")[1] : null;
const LIMIT_FLAG = args.find((a) => a.startsWith("--limit="));
const LIMIT = LIMIT_FLAG ? parseInt(LIMIT_FLAG.split("=")[1], 10) : null;
const X_REPLY_SETTINGS = JSON.stringify({ who_can_reply_post: "everyone" });
const POSTIZ_CHANNEL_ID = process.env.POSTIZ_CHANNEL_ID || "";

function loadResults() {
  if (!existsSync(RESULTS_FILE)) return [];
  try {
    return JSON.parse(readFileSync(RESULTS_FILE, "utf8"));
  } catch {
    return [];
  }
}

function saveResults(results) {
  writeFileSync(RESULTS_FILE, JSON.stringify(results, null, 2));
}

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

function runPostiz(cmdArgs) {
  return new Promise((res) => {
    const child = spawn("postiz", cmdArgs);
    let stdout = "";
    let stderr = "";
    child.stdout.on("data", (d) => { stdout += d.toString(); });
    child.stderr.on("data", (d) => { stderr += d.toString(); });
    child.on("close", (code) => res({ code, stdout, stderr }));
    child.on("error", (err) => res({ code: -1, stdout, stderr: stderr + err.message }));
  });
}

function buildArgs(post) {
  const channelId = POSTIZ_CHANNEL_ID || post.channel_id || (DRY_RUN ? "<POSTIZ_CHANNEL_ID>" : "");
  if (!channelId) {
    throw new Error("Set POSTIZ_CHANNEL_ID before scheduling posts.");
  }

  // Common flags.
  const a = [
    "posts:create",
    "-s", post.scheduled_at,
    "-i", channelId,
    "-t", "schedule",
    "--no-shortLink",
    "--settings", X_REPLY_SETTINGS,
  ];

  if (post.format === "thread") {
    for (const t of post.thread) a.push("-c", t.content);
    a.push("-d", "0"); // chain replies immediately, no inter-reply delay
  } else {
    a.push("-c", post.content);
  }

  return a;
}

async function scheduleOne(post, results) {
  const cmdArgs = buildArgs(post);

  if (DRY_RUN) {
    console.log(`[dry-run] postiz ${cmdArgs.map((a) => (a.includes(" ") ? JSON.stringify(a) : a)).join(" ")}`);
    return { id: post.id, status: "dry-run", scheduled_at: post.scheduled_at };
  }

  let attempt = 0;
  let last = null;
  while (attempt < 2) {
    attempt++;
    last = await runPostiz(cmdArgs);
    if (last.code === 0) {
      const result = {
        id: post.id,
        status: "scheduled",
        scheduled_at: post.scheduled_at,
        attempt,
      };
      console.log(`OK   ${post.id}  attempt ${attempt}`);
      return result;
    }
    const is429 = (last.stdout + last.stderr).includes("429");
    console.log(`FAIL ${post.id}  attempt ${attempt}  exit ${last.code}${is429 ? " (429)" : ""}`);
    if (attempt < 2) await sleep(is429 ? 30000 : 4000);
  }

  return {
    id: post.id,
    status: "failed",
    scheduled_at: post.scheduled_at,
    attempt,
    exit_code: last.code,
    error_kind: (last.stdout + last.stderr).includes("429") ? "rate_limited" : "error",
  };
}

async function main() {
  const index = JSON.parse(readFileSync(INDEX_FILE, "utf8"));
  let results = loadResults();
  const scheduledIds = new Set(results.filter((r) => r.status === "scheduled").map((r) => r.id));

  let queue = index.filter((p) => !scheduledIds.has(p.id));
  if (ONLY_ID) queue = queue.filter((p) => p.id === ONLY_ID);
  if (LIMIT) queue = queue.slice(0, LIMIT);

  console.log(`Total posts: ${index.length}`);
  console.log(`Campaign dir: ${CAMPAIGN_DIR}`);
  console.log(`Already scheduled: ${scheduledIds.size}`);
  console.log(`To schedule this run: ${queue.length}`);
  if (DRY_RUN) console.log("DRY RUN — no API calls will be made.");
  console.log("");

  let okCount = 0;
  let failCount = 0;

  for (let i = 0; i < queue.length; i++) {
    const post = queue[i];
    const result = await scheduleOne(post, results);
    // Replace any prior failed result for this id, otherwise append.
    const existingIdx = results.findIndex((r) => r.id === post.id);
    if (existingIdx >= 0) results[existingIdx] = result;
    else results.push(result);
    if (!DRY_RUN) saveResults(results);

    if (result.status === "scheduled") okCount++;
    else if (result.status === "failed") {
      failCount++;
      if (result.error_kind === "rate_limited") {
        console.log("\nStopping early because Postiz returned 429. Re-run after the write throttle resets.");
        break;
      }
    }

    // Throttle 30s between posts — Postiz has a low sustained write rate limit.
    if (!DRY_RUN && i < queue.length - 1) await sleep(30000);
  }

  console.log("");
  console.log(`Done. OK: ${okCount}  FAIL: ${failCount}`);

  const failures = results.filter((r) => r.status === "failed");
  if (failures.length) {
    console.log(`\nFailed posts (${failures.length}):`);
    for (const f of failures) {
      console.log(`  - ${f.id}  exit=${f.exit_code}`);
    }
    process.exit(1);
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
