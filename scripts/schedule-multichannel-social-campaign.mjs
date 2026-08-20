#!/usr/bin/env node
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";
import { spawn } from "node:child_process";

const args = process.argv.slice(2);
const campaignDirFlag = args.find((arg) => arg.startsWith("--campaign-dir="));
const campaignDir = resolve(
  campaignDirFlag
    ? campaignDirFlag.split("=").slice(1).join("=")
    : "social/multichannel/2026-06-15-to-2026-07-12",
);
const dryRun = args.includes("--dry-run");
const reviewed = args.includes("--reviewed");
const liveExport = args.includes("--live-export");
const syncExisting = args.includes("--sync-existing");
const limitFlag = args.find((arg) => arg.startsWith("--limit="));
const limit = limitFlag ? Number.parseInt(limitFlag.split("=").slice(1).join("="), 10) : null;
const onlyFlag = args.find((arg) => arg.startsWith("--only="));
const only = onlyFlag ? onlyFlag.split("=").slice(1).join("=") : null;
const delayFlag = args.find((arg) => arg.startsWith("--delay-ms="));
const delayMs = delayFlag ? Number.parseInt(delayFlag.split("=").slice(1).join("="), 10) : 125000;

const indexFile = resolve(campaignDir, "posts.index.json");
const payloadsDir = resolve(campaignDir, "postiz-payloads");
const resultsFile = resolve(campaignDir, "schedule-results.json");
const receiptsDir = resolve(campaignDir, "schedule-receipts");
const liveExportFile = resolve(campaignDir, "live-postiz-export.json");
const reconciliationFile = resolve(campaignDir, "reconciliation-report.json");

function sleep(ms) {
  return new Promise((done) => setTimeout(done, ms));
}

function readResults() {
  if (!existsSync(resultsFile)) return [];
  try {
    return JSON.parse(readFileSync(resultsFile, "utf8"));
  } catch {
    return [];
  }
}

function writeResults(results) {
  writeFileSync(resultsFile, JSON.stringify(results, null, 2));
}

function postizCreateArgs(post) {
  const payload = JSON.parse(readFileSync(resolve(payloadsDir, `${post.id}.json`), "utf8"));
  const settings = payload.posts?.[0]?.settings || {};
  return [
    "posts:create",
    "-c",
    post.content,
    "-s",
    post.scheduled_at,
    "-i",
    post.integration_id,
    "-t",
    "schedule",
    "--no-shortLink",
    "--settings",
    JSON.stringify(settings),
  ];
}

function runPostiz(post) {
  return new Promise((resolveRun) => {
    const child = spawn("postiz", postizCreateArgs(post));
    let stdout = "";
    let stderr = "";
    child.stdout.on("data", (chunk) => {
      stdout += chunk.toString();
    });
    child.stderr.on("data", (chunk) => {
      stderr += chunk.toString();
    });
    child.on("error", (error) => resolveRun({ code: -1, stdout, stderr: `${stderr}\n${error.message}` }));
    child.on("close", (code) => resolveRun({ code, stdout, stderr }));
  });
}

function runPostizList(startDate, endDate) {
  return new Promise((resolveRun) => {
    const child = spawn("postiz", ["posts:list", "--startDate", startDate, "--endDate", endDate]);
    let stdout = "";
    let stderr = "";
    child.stdout.on("data", (chunk) => {
      stdout += chunk.toString();
    });
    child.stderr.on("data", (chunk) => {
      stderr += chunk.toString();
    });
    child.on("error", (error) => resolveRun({ code: -1, stdout, stderr: `${stderr}\n${error.message}` }));
    child.on("close", (code) => resolveRun({ code, stdout, stderr }));
  });
}

function parsePostizList(stdout) {
  const start = stdout.indexOf("{");
  const end = stdout.lastIndexOf("}");
  if (start === -1 || end === -1 || end <= start) return { posts: [] };
  return JSON.parse(stdout.slice(start, end + 1));
}

function normalizeHtmlContent(value) {
  return String(value || "")
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<\/p>\s*<p>/gi, "\n\n")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/\s+/g, " ")
    .trim()
    .toLowerCase();
}

function normalizeContent(value) {
  return String(value || "").replace(/\s+/g, " ").trim().toLowerCase();
}

function dateKey(value) {
  return new Date(value).toISOString();
}

function extractCreatedPostId(output) {
  const idMatch =
    output.match(/"id"\s*:\s*"([^"]+)"/) ||
    output.match(/\bid[:=]\s*([a-z0-9_-]{12,})/i) ||
    output.match(/\b(c[a-z0-9]{18,})\b/i);
  return idMatch ? idMatch[1] : null;
}

function resultFor(post, status, extra = {}) {
  return {
    id: post.id,
    channel: post.channel,
    scheduled_at: post.scheduled_at,
    integration_id: post.integration_id,
    status,
    ...extra,
  };
}

async function main() {
  if (!dryRun) {
    if (!reviewed || !liveExport || !syncExisting || !Number.isFinite(limit)) {
      throw new Error("Live scheduling requires --reviewed --live-export --sync-existing and a finite --limit=<n>.");
    }
    if (delayMs < 30000) throw new Error("Live scheduling delay must be at least 30000 ms.");
  }

  const posts = JSON.parse(readFileSync(indexFile, "utf8"));
  const startDate = `${posts[0].date}T00:00:00-05:00`;
  const endDate = "2026-07-13T00:00:00-05:00";
  let results = readResults();
  const completed = new Set(results.filter((row) => row.status === "scheduled").map((row) => row.id));
  mkdirSync(receiptsDir, { recursive: true });

  let livePosts = [];
  if (liveExport || syncExisting) {
    const live = await runPostizList(startDate, endDate);
    writeFileSync(
      liveExportFile,
      JSON.stringify(
        {
          captured_at: new Date().toISOString(),
          command: `postiz posts:list --startDate ${startDate} --endDate ${endDate}`,
          exit_code: live.code,
          stdout: live.stdout,
          stderr: live.stderr,
        },
        null,
        2,
      ),
    );
    if (live.code !== 0) throw new Error("Could not fetch live Postiz export.");
    livePosts = parsePostizList(live.stdout).posts || [];
  }

  const liveByIntegrationAndDate = new Map();
  for (const livePost of livePosts) {
    const key = `${livePost.integration?.id || ""}|${dateKey(livePost.publishDate)}`;
    if (!liveByIntegrationAndDate.has(key)) liveByIntegrationAndDate.set(key, []);
    liveByIntegrationAndDate.get(key).push(livePost);
  }

  if (syncExisting) {
    const resultIds = new Set(results.map((row) => row.id));
    for (const post of posts) {
      const key = `${post.integration_id}|${dateKey(post.scheduled_at)}`;
      const liveMatches = liveByIntegrationAndDate.get(key) || [];
      if (liveMatches.length === 0 || resultIds.has(post.id)) continue;
      const exact = liveMatches.find((livePost) => normalizeHtmlContent(livePost.content) === normalizeContent(post.content));
      if (exact) {
        results.push(
          resultFor(post, "scheduled", {
            source: "live-sync",
            postiz_post_id: exact.id,
            live_state: exact.state,
          }),
        );
      } else {
        results.push(
          resultFor(post, "blocked", {
            error_kind: "live_slot_occupied",
            live_post_ids: liveMatches.map((livePost) => livePost.id),
          }),
        );
      }
    }
    writeResults(results);
  }

  const blocked = results.filter((row) => row.status === "blocked");
  if (blocked.length) {
    throw new Error(`Live sync found ${blocked.length} occupied target slot(s). Inspect schedule-results.json before scheduling.`);
  }

  let queue = posts.filter((post) => !completed.has(post.id));
  const completedAfterSync = new Set(results.filter((row) => row.status === "scheduled").map((row) => row.id));
  queue = posts.filter((post) => !completedAfterSync.has(post.id));
  if (only) queue = queue.filter((post) => post.id === only);
  if (Number.isFinite(limit)) queue = queue.slice(0, limit);

  console.log(`Campaign dir: ${campaignDir}`);
  console.log(`Total posts: ${posts.length}`);
  console.log(`Already scheduled in state: ${completed.size}`);
  console.log(`This run: ${queue.length}`);
  console.log(`Dry run: ${dryRun ? "yes" : "no"}`);

  let ok = 0;
  let failed = 0;

  for (let index = 0; index < queue.length; index += 1) {
    const post = queue[index];
    const payloadPath = resolve(payloadsDir, `${post.id}.json`);

    if (!existsSync(payloadPath)) {
      const row = resultFor(post, "failed", { error_kind: "missing_payload" });
      results = results.filter((entry) => entry.id !== post.id).concat(row);
      writeResults(results);
      failed += 1;
      continue;
    }

    if (dryRun) {
      console.log(`[dry-run] postiz ${postizCreateArgs(post).map((value) => (value.includes(" ") ? JSON.stringify(value) : value)).join(" ")}`);
      continue;
    }

    const run = await runPostiz(post);
    const receipt = {
      id: post.id,
      channel: post.channel,
      scheduled_at: post.scheduled_at,
      integration_id: post.integration_id,
      captured_at: new Date().toISOString(),
      exit_code: run.code,
      stdout: run.stdout,
      stderr: run.stderr,
    };
    writeFileSync(resolve(receiptsDir, `${post.id}.json`), JSON.stringify(receipt, null, 2));
    if (run.code === 0) {
      const row = resultFor(post, "scheduled", {
        attempt: 1,
        postiz_post_id: extractCreatedPostId(`${run.stdout}\n${run.stderr}`),
        receipt: `schedule-receipts/${post.id}.json`,
      });
      results = results.filter((entry) => entry.id !== post.id).concat(row);
      writeResults(results);
      ok += 1;
      console.log(`OK ${post.id}`);
    } else {
      const output = `${run.stdout}\n${run.stderr}`;
      const row = resultFor(post, "failed", {
        exit_code: run.code,
        error_kind: output.includes("429") ? "rate_limited" : "error",
      });
      results = results.filter((entry) => entry.id !== post.id).concat(row);
      writeResults(results);
      failed += 1;
      console.log(`FAIL ${post.id} ${row.error_kind}`);
      if (row.error_kind === "rate_limited") break;
    }

    if (index < queue.length - 1) await sleep(delayMs);
  }

  console.log(`Done. OK: ${ok} FAIL: ${failed}`);

  if (!dryRun) {
    const after = await runPostizList(startDate, endDate);
    const afterPosts = after.code === 0 ? parsePostizList(after.stdout).posts || [] : [];
    const scheduledRows = readResults().filter((row) => row.status === "scheduled");
    const matched = scheduledRows.filter((row) => {
      const key = `${row.integration_id}|${dateKey(row.scheduled_at)}`;
      return afterPosts.some((livePost) => `${livePost.integration?.id || ""}|${dateKey(livePost.publishDate)}` === key);
    });
    writeFileSync(
      reconciliationFile,
      JSON.stringify(
        {
          captured_at: new Date().toISOString(),
          postiz_list_exit_code: after.code,
          expected_total: posts.length,
          scheduled_state_rows: scheduledRows.length,
          matched_live_slots: matched.length,
          unmatched_state_rows: scheduledRows.length - matched.length,
        },
        null,
        2,
      ),
    );
  }
  if (failed > 0) process.exit(1);
}

main().catch((error) => {
  console.error(error.message);
  process.exit(1);
});
