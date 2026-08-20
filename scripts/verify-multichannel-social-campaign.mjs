#!/usr/bin/env node
import { existsSync, readFileSync, readdirSync } from "node:fs";
import { resolve } from "node:path";
import { reviewLinkedInPost } from "./linkedin-post-review-gate.mjs";

const args = process.argv.slice(2);
const campaignDirFlag = args.find((arg) => arg.startsWith("--campaign-dir="));
const campaignDir = resolve(
  campaignDirFlag
    ? campaignDirFlag.split("=").slice(1).join("=")
    : "social/multichannel/2026-06-15-to-2026-07-12",
);
const postsDir = resolve(campaignDir, "posts");
const gridFile = resolve(campaignDir, "schedule-grid.json");

const errors = [];
const warnings = [];
const maxByChannel = { linkedin: 3000, x: 280, threads: 500 };
const expectedChannels = ["linkedin", "x", "threads"];
const forbiddenDashes = /—|–|--/;
const aiTells =
  /\b(in today's|seamless|robust|game-changing|cutting-edge|leverage|delve|landscape|empower|holistic|not just|furthermore|moreover|ultimately|crucial|transformative|industry-leading|did you know)\b/i;
const absoluteClaims = /\b(guaranteed|always|never|risk-free|no risk|impossible to subpoena|cannot be accessed)\b/i;
const banCount = /\b\d+\s+(abortion-ban|states?\s+ban)/i;
const placeholder = /\b(TODO|TBD|FIXME)\b|\[[^\]]*(insert|source|citation|image|visual|placeholder)[^\]]*\]|\{\{[^}]+\}\}/i;
const sourcePath = /^([^()]+?)(?:\s+\([^)]*\))?$/;

function readJson(path, label) {
  try {
    return JSON.parse(readFileSync(path, "utf8"));
  } catch (error) {
    errors.push(`${label}: invalid JSON (${error.message})`);
    return null;
  }
}

function normalizeContent(content) {
  return String(content).trim().toLowerCase().replace(/\s+/g, " ");
}

function localSourcePath(raw) {
  const match = String(raw || "").match(sourcePath);
  return match ? match[1].trim() : String(raw || "").trim();
}

function checkPath(postId, field, raw) {
  const value = localSourcePath(raw);
  if (/^(docs|content|social|src|scripts)\//.test(value) && !existsSync(resolve(value))) {
    errors.push(`${postId}: ${field} path does not exist: ${value}`);
  }
}

function sentenceWords(sentence) {
  return sentence.trim().split(/\s+/).filter(Boolean).length;
}

function checkThirdGrade(post) {
  const sentences = post.content
    .replace(/\n+/g, " ")
    .split(/[.!?]+/)
    .map((sentence) => sentence.trim())
    .filter(Boolean);
  const longSentences = sentences.filter((sentence) => sentenceWords(sentence) > 24);
  if (longSentences.length) {
    errors.push(`${post.id}: third-grade pass is marked true but has long sentence(s)`);
  }
}

function checkContent(post, seenByChannel) {
  if (typeof post.content !== "string" || post.content.trim().length === 0) {
    errors.push(`${post.id}: content empty or not a string`);
    return;
  }
  if (post.content.length > maxByChannel[post.channel]) {
    errors.push(`${post.id}: ${post.channel} content length ${post.content.length} > ${maxByChannel[post.channel]}`);
  }
  if (forbiddenDashes.test(post.content)) errors.push(`${post.id}: content contains forbidden dash`);
  if (aiTells.test(post.content)) errors.push(`${post.id}: content contains generic or AI-style phrasing`);
  if (absoluteClaims.test(post.content)) errors.push(`${post.id}: content contains risky absolute claim`);
  if (banCount.test(post.content)) errors.push(`${post.id}: content contains abortion-ban-state count phrase`);
  if (placeholder.test(post.content)) errors.push(`${post.id}: content contains placeholder text`);
  if (post.channel === "linkedin") {
    const result = reviewLinkedInPost({ id: post.id, content: post.content, attachments: [] });
    for (const error of result.errors) errors.push(`${post.id}: ${error}`);
  }
  checkThirdGrade(post);

  const normalized = normalizeContent(post.content);
  const duplicate = seenByChannel[post.channel].get(normalized);
  if (duplicate) {
    errors.push(`${post.id}: duplicate ${post.channel} content also used by ${duplicate}`);
  } else {
    seenByChannel[post.channel].set(normalized, post.id);
  }
}

const grid = readJson(gridFile, "schedule-grid.json");
if (!grid) process.exit(1);

const slots = Array.isArray(grid.slots) ? grid.slots : [];
const slotsById = new Map(slots.map((slot) => [slot.id, slot]));
const expectedByDate = slots.reduce((acc, slot) => {
  acc[slot.date] = (acc[slot.date] || 0) + 1;
  return acc;
}, {});

if (grid.days !== 28) errors.push(`schedule-grid.json: expected 28 days, got ${grid.days}`);
if (grid.posts_per_day_per_channel !== 3) {
  errors.push(`schedule-grid.json: expected 3 posts_per_day_per_channel, got ${grid.posts_per_day_per_channel}`);
}
if (grid.total_units !== 252) errors.push(`schedule-grid.json: expected 252 total_units, got ${grid.total_units}`);

const dayFiles = existsSync(postsDir) ? readdirSync(postsDir).filter((file) => file.endsWith(".json")).sort() : [];
if (dayFiles.length !== 28) errors.push(`expected 28 day files, got ${dayFiles.length}`);

const expectedDates = new Set(Object.keys(expectedByDate));
const actualDates = new Set(dayFiles.map((file) => file.replace(/\.json$/, "")));
for (const date of expectedDates) if (!actualDates.has(date)) errors.push(`${date}.json: missing day file`);
for (const date of actualDates) if (!expectedDates.has(date)) errors.push(`${date}.json: unexpected day file`);

const seenIds = new Set();
const seenByChannel = Object.fromEntries(expectedChannels.map((channel) => [channel, new Map()]));
const channelCounts = Object.fromEntries(expectedChannels.map((channel) => [channel, 0]));
const pillarCounts = {};
let totalPosts = 0;

for (const file of dayFiles) {
  const parsed = readJson(resolve(postsDir, file), file);
  if (!parsed || !Array.isArray(parsed.posts)) continue;

  if (parsed.posts.length !== expectedByDate[parsed.date]) {
    errors.push(`${file}: expected ${expectedByDate[parsed.date]} posts, got ${parsed.posts.length}`);
  }

  for (const post of parsed.posts) {
    totalPosts += 1;
    if (!post.id || typeof post.id !== "string") errors.push(`${file}: missing post id`);
    else if (seenIds.has(post.id)) errors.push(`${post.id}: duplicate id`);
    else seenIds.add(post.id);

    const slot = slotsById.get(post.id);
    if (!slot) {
      errors.push(`${post.id}: missing from schedule-grid.json`);
    } else {
      for (const field of ["date", "channel", "integration_id", "scheduled_at", "format", "pillar", "angle", "source_family"]) {
        if (post[field] !== slot[field]) errors.push(`${post.id}: ${field} mismatch (${post[field]} vs ${slot[field]})`);
      }
    }

    if (!expectedChannels.includes(post.channel)) errors.push(`${post.id}: unknown channel ${post.channel}`);
    else channelCounts[post.channel] += 1;
    pillarCounts[post.pillar] = (pillarCounts[post.pillar] || 0) + 1;

    if (!Array.isArray(post.sources) || post.sources.length === 0) errors.push(`${post.id}: missing sources`);
    else for (const source of post.sources) checkPath(post.id, "source", source);
    if (!Array.isArray(post.linked_content) || post.linked_content.length === 0) errors.push(`${post.id}: missing linked_content`);
    else for (const linked of post.linked_content) checkPath(post.id, "linked_content", linked);

    for (const flag of [
      "manually_written",
      "draft_pass",
      "fact_review_pass",
      "humanizer_pass",
      "third_grade_pass",
      "no_em_dash_pass",
      "final_review_pass",
    ]) {
      if (post[flag] !== true) errors.push(`${post.id}: ${flag} not true`);
    }
    if (post.claim_review?.reviewed !== true) errors.push(`${post.id}: claim_review.reviewed not true`);
    if (post.review_status !== "approved") errors.push(`${post.id}: review_status not approved`);

    checkContent(post, seenByChannel);
  }
}

if (totalPosts !== 252) errors.push(`expected 252 total posts, got ${totalPosts}`);
for (const channel of expectedChannels) {
  if (channelCounts[channel] !== 84) errors.push(`expected 84 ${channel} posts, got ${channelCounts[channel]}`);
}
for (const slot of slots) {
  if (!seenIds.has(slot.id)) errors.push(`${slot.id}: missing post for schedule-grid slot`);
}

console.log("\nMultichannel social verification report");
console.log("---------------------------------------");
console.log(`Campaign dir: ${campaignDir}`);
console.log(`Day files:    ${dayFiles.length}`);
console.log(`Total posts:  ${totalPosts}`);
console.log("Channels:", channelCounts);
console.log("Pillars:", pillarCounts);
console.log(`Errors:       ${errors.length}`);
console.log(`Warnings:     ${warnings.length}`);

if (errors.length) {
  console.log("\nErrors:");
  for (const error of errors) console.log(`  - ${error}`);
}
if (warnings.length) {
  console.log("\nWarnings:");
  for (const warning of warnings) console.log(`  - ${warning}`);
}

process.exit(errors.length ? 1 : 0);
