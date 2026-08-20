// Validates LinkedIn campaign post JSON files against the campaign rules.
// Run: node scripts/verify-linkedin-posts.mjs
// Optional:
//   --campaign-dir=social/linkedin/2026-05-20-to-2026-06-14
//   --schedule-grid=social/linkedin/2026-05-20-to-2026-06-14/schedule-grid.json

import { existsSync, readFileSync, readdirSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { reviewLinkedInPost } from "./linkedin-post-review-gate.mjs";

const args = process.argv.slice(2);
const CAMPAIGN_DIR_FLAG = args.find((a) => a.startsWith("--campaign-dir="));
const SCHEDULE_GRID_FLAG = args.find((a) => a.startsWith("--schedule-grid="));
const CAMPAIGN_DIR_VALUE = CAMPAIGN_DIR_FLAG?.split("=").slice(1).join("=");
const SCHEDULE_GRID_VALUE = SCHEDULE_GRID_FLAG?.split("=").slice(1).join("=");
const GRID_FILE = resolve(
  SCHEDULE_GRID_VALUE ||
    resolve(
      CAMPAIGN_DIR_VALUE || "social/linkedin/2026-05-20-to-2026-06-14",
      "schedule-grid.json",
    ),
);
const CAMPAIGN_DIR = SCHEDULE_GRID_VALUE
  ? dirname(GRID_FILE)
  : resolve(CAMPAIGN_DIR_VALUE || dirname(GRID_FILE));
const POSTS_DIR = resolve(CAMPAIGN_DIR, "posts");
const MAX_LINKEDIN_CONTENT_LENGTH = 3000;

const errors = [];
const warnings = [];

const FORBIDDEN_DASHES_RE = /—|--/;
const AI_TELLS_RE =
  /\b(in today's|seamless|robust|empower|holistic|landscape|not just|furthermore|moreover|ultimately|crucial|transformative|cutting-edge|industry-leading)\b/i;
const ABORTION_BAN_COUNT_RE = /\b\d+\s+(abortion-ban|states?\s+ban)/i;
const HASHTAG_RE = /(^|\s)#[\p{L}\p{N}_]+/gu;
const LOCAL_DATE_RE = /^\d{4}-\d{2}-\d{2}$/;
const LOCAL_PATH_PREFIX_RE = /^(?:\.{0,2}\/)?(?:AGENTS\.md|README\.md|docs\/|content\/|src\/|social\/|public\/|functions\/|scripts\/)/;
const SOURCE_PATH_RE = /^([^()]+?)(?:\s+\([^)]*\))?$/;

function readJson(path, label) {
  try {
    return JSON.parse(readFileSync(path, "utf8"));
  } catch (error) {
    errors.push(`${label}: invalid JSON (${error.message})`);
    return null;
  }
}

function normalizeContent(content) {
  return content.trim().toLowerCase().replace(/\s+/g, " ");
}

function localDateOf(row) {
  if (row?.localDate !== undefined) return row.localDate;
  return typeof row?.date === "string" && LOCAL_DATE_RE.test(row.date) ? row.date : undefined;
}

function scheduledAtOf(row) {
  if (row?.scheduled_at !== undefined) return row.scheduled_at;
  return typeof row?.date === "string" && !LOCAL_DATE_RE.test(row.date) ? row.date : undefined;
}

function formatOf(row) {
  return row?.format ?? row?.assetKind;
}

function angleOf(row) {
  return row?.angle ?? row?.topic;
}

function sourceFamilyOf(row) {
  if (typeof row?.source_family === "string" && row.source_family.trim()) {
    return row.source_family.trim();
  }
  if (
    !Array.isArray(row?.sourceKeys) ||
    row.sourceKeys.length === 0 ||
    row.sourceKeys.some((sourceKey) => typeof sourceKey !== "string" || !sourceKey.trim())
  ) {
    return undefined;
  }

  return `sourceKeys:${row.sourceKeys.map((sourceKey) => sourceKey.trim()).sort().join("|")}`;
}

const GRID_FIELD_ADAPTERS = [
  ["scheduled timestamp", scheduledAtOf],
  ["format", formatOf],
  ["pillar", (row) => row?.pillar],
  ["angle", angleOf],
  ["source family", sourceFamilyOf],
];

function sourcePathAndNote(source) {
  const match = source.match(SOURCE_PATH_RE);
  if (!match) return { path: source.trim(), hasNote: false };

  return {
    path: match[1].trim(),
    hasNote: /\([^)]*\)\s*$/.test(source),
  };
}

function isLocalPath(value) {
  return LOCAL_PATH_PREFIX_RE.test(value);
}

function checkLocalPathExists(postId, field, rawPath) {
  const path = rawPath.trim();
  if (!isLocalPath(path)) return;

  if (!existsSync(resolve(path))) {
    errors.push(`${postId}: ${field} local path does not exist: ${path}`);
  }
}

function checkSources(post) {
  if (!Array.isArray(post.sources) || post.sources.length === 0) {
    errors.push(`${post.id}: missing sources`);
    return;
  }

  for (const source of post.sources) {
    if (typeof source !== "string" || source.trim().length === 0) {
      errors.push(`${post.id}: source entry is empty or not a string`);
      continue;
    }

    const { path, hasNote } = sourcePathAndNote(source);
    if (path === "docs/research/04-sources.md" && !hasNote) {
      errors.push(`${post.id}: docs/research/04-sources.md source needs a parenthetical note`);
    }
    checkLocalPathExists(post.id, "source", path);
  }
}

function checkLinkedContent(post) {
  if (post.linked_content === undefined) return;

  if (!Array.isArray(post.linked_content)) {
    errors.push(`${post.id}: linked_content must be an array when provided`);
    return;
  }

  for (const entry of post.linked_content) {
    if (typeof entry !== "string" || entry.trim().length === 0) {
      errors.push(`${post.id}: linked_content entry is empty or not a string`);
      continue;
    }

    checkLocalPathExists(post.id, "linked_content", entry);
  }
}

function checkApproval(post) {
  for (const flag of [
    "manually_written",
    "draft_pass",
    "fact_review_pass",
    "humanizer_pass",
    "final_review_pass",
  ]) {
    if (post[flag] !== true) {
      errors.push(`${post.id}: ${flag} not true`);
    }
  }

  if (post.claim_review?.reviewed !== true) {
    errors.push(`${post.id}: claim_review.reviewed not true`);
  }
  if (post.review_status !== "approved") {
    errors.push(`${post.id}: review_status not approved`);
  }
}

function checkContent(post, normalizedContentSeen) {
  if (typeof post.content !== "string") {
    errors.push(`${post.id}: content not a string`);
    return;
  }

  const content = post.content.trim();
  if (!content) {
    errors.push(`${post.id}: content empty`);
    return;
  }

  if (post.content.length > MAX_LINKEDIN_CONTENT_LENGTH) {
    errors.push(`${post.id}: content length ${post.content.length} > ${MAX_LINKEDIN_CONTENT_LENGTH}`);
  }
  if (FORBIDDEN_DASHES_RE.test(post.content)) {
    errors.push(`${post.id}: content contains em dash or double hyphen dash`);
  }
  if (AI_TELLS_RE.test(post.content)) {
    errors.push(`${post.id}: content contains generic/AI-style phrasing`);
  }
  if (ABORTION_BAN_COUNT_RE.test(post.content)) {
    errors.push(`${post.id}: content contains abortion-ban-state count phrase`);
  }
  const review = reviewLinkedInPost({
    id: post.id,
    content: post.content,
    attachments: post.attachments || [],
  });
  for (const error of review.errors) {
    errors.push(`${post.id}: ${error}`);
  }

  const normalized = normalizeContent(post.content);
  const duplicate = normalizedContentSeen.get(normalized);
  if (duplicate) {
    errors.push(`${post.id}: duplicate normalized content also used by ${duplicate}`);
  } else {
    normalizedContentSeen.set(normalized, post.id);
  }

  const inlineHashtags = [...post.content.matchAll(HASHTAG_RE)].map((match) => match[0].trim());
  const metadataHashtags = Array.isArray(post.hashtags) ? post.hashtags : [];
  if (post.hashtags !== undefined && !Array.isArray(post.hashtags)) {
    errors.push(`${post.id}: hashtags must be an array when provided`);
  }
  if (inlineHashtags.length + metadataHashtags.length > 3) {
    errors.push(`${post.id}: more than 3 hashtags`);
  }
}

const grid = readJson(GRID_FILE, "schedule-grid.json");
if (!grid) process.exit(1);

const slots = Array.isArray(grid.slots) ? grid.slots : [];
const slotsById = new Map(slots.map((slot) => [slot.id, slot]));
const expectedByDate = slots.reduce((acc, slot) => {
  const localDate = localDateOf(slot);
  if (typeof localDate !== "string" || !LOCAL_DATE_RE.test(localDate)) {
    errors.push(`${slot.id || "(missing slot id)"}: missing or invalid local campaign date`);
    return acc;
  }
  acc[localDate] = (acc[localDate] || 0) + 1;
  return acc;
}, {});
const expectedDates = new Set(Object.keys(expectedByDate));
const expectedDays = expectedDates.size;
const expectedTotalPosts = slots.length;
const dailySlotCounts = [...new Set(Object.values(expectedByDate))];
const expectedPostsPerDay = dailySlotCounts.length === 1 ? dailySlotCounts[0] : null;

if (expectedDays === 0) {
  errors.push("schedule-grid.json: slots must include at least one dated slot");
}
if (grid.days !== undefined && grid.days !== expectedDays) {
  errors.push(`schedule-grid.json: declares ${grid.days} days, but slots contain ${expectedDays} dates`);
}
if (grid.posts_per_day !== undefined) {
  if (expectedPostsPerDay === null) {
    errors.push(
      `schedule-grid.json: declares ${grid.posts_per_day} posts_per_day, but slot counts vary by date (${dailySlotCounts.join(", ")})`,
    );
  } else if (grid.posts_per_day !== expectedPostsPerDay) {
    errors.push(
      `schedule-grid.json: declares ${grid.posts_per_day} posts_per_day, but slots contain ${expectedPostsPerDay} per date`,
    );
  }
}
if (grid.total_slots !== undefined && grid.total_slots !== expectedTotalPosts) {
  errors.push(
    `schedule-grid.json: declares ${grid.total_slots} total_slots, but slots contain ${expectedTotalPosts}`,
  );
}

const dayFiles = existsSync(POSTS_DIR)
  ? readdirSync(POSTS_DIR).filter((file) => file.endsWith(".json")).sort()
  : [];

if (!existsSync(POSTS_DIR)) {
  errors.push(`posts directory missing: ${POSTS_DIR}`);
}

const actualDates = new Set(dayFiles.map((file) => file.replace(/\.json$/, "")));
for (const date of expectedDates) {
  if (!actualDates.has(date)) {
    errors.push(`${date}.json: missing day file`);
  }
}
for (const date of actualDates) {
  if (!expectedDates.has(date)) {
    errors.push(`${date}.json: unexpected day file`);
  }
}
if (dayFiles.length !== expectedDays) {
  errors.push(`expected ${expectedDays} day files from schedule-grid.json, got ${dayFiles.length}`);
}

let totalPosts = 0;
const seenIds = new Set();
const formatCounts = {};
const pillarCounts = {};
const sourceFamilyCounts = {};
const normalizedContentSeen = new Map();

for (const file of dayFiles) {
  const path = resolve(POSTS_DIR, file);
  const parsed = readJson(path, file);
  if (!parsed) continue;

  const parsedLocalDate = localDateOf(parsed);
  if (!parsedLocalDate || !Array.isArray(parsed.posts)) {
    errors.push(`${file}: missing date/posts`);
    continue;
  }
  if (!LOCAL_DATE_RE.test(parsedLocalDate)) {
    errors.push(`${file}: invalid local campaign date ${parsedLocalDate}`);
    continue;
  }
  const fileDate = file.replace(/\.json$/, "");
  if (parsedLocalDate !== fileDate) {
    errors.push(`${file}: day file date mismatch (${parsedLocalDate} vs ${fileDate})`);
  }

  const expectedPosts = expectedByDate[parsedLocalDate];
  if (expectedPosts !== undefined && parsed.posts.length !== expectedPosts) {
    errors.push(`${file}: expected ${expectedPosts} posts, got ${parsed.posts.length}`);
  }

  for (const post of parsed.posts) {
    totalPosts++;

    if (!post.id || typeof post.id !== "string") {
      errors.push(`${file}: missing id`);
      continue;
    }
    if (seenIds.has(post.id)) {
      errors.push(`${post.id}: duplicate id`);
    } else {
      seenIds.add(post.id);
    }

    const gridSlot = slotsById.get(post.id);
    if (!gridSlot) {
      errors.push(`${post.id}: not in schedule-grid.json`);
    } else {
      for (const [field, adapter] of GRID_FIELD_ADAPTERS) {
        const postValue = adapter(post);
        const gridValue = adapter(gridSlot);
        if (gridValue === undefined) {
          errors.push(`${post.id}: schedule-grid slot missing ${field}`);
        } else if (postValue === undefined) {
          errors.push(`${post.id}: post missing ${field}`);
        } else if (postValue !== gridValue) {
          errors.push(`${post.id}: ${field} mismatch (${postValue} vs ${gridValue})`);
        }
      }
      const gridLocalDate = localDateOf(gridSlot);
      if (parsedLocalDate !== gridLocalDate) {
        errors.push(`${post.id}: day file date mismatch (${parsedLocalDate} vs ${gridLocalDate})`);
      }
      const postLocalDate = localDateOf(post);
      if (postLocalDate !== undefined && postLocalDate !== gridLocalDate) {
        errors.push(`${post.id}: post local date mismatch (${postLocalDate} vs ${gridLocalDate})`);
      }
    }

    const postFormat = formatOf(post);
    const postSourceFamily = sourceFamilyOf(post);
    formatCounts[postFormat] = (formatCounts[postFormat] || 0) + 1;
    pillarCounts[post.pillar] = (pillarCounts[post.pillar] || 0) + 1;
    sourceFamilyCounts[postSourceFamily] = (sourceFamilyCounts[postSourceFamily] || 0) + 1;

    checkContent(post, normalizedContentSeen);
    checkSources(post);
    checkLinkedContent(post);
    checkApproval(post);
  }
}

if (totalPosts !== expectedTotalPosts) {
  errors.push(`expected ${expectedTotalPosts} total posts from schedule-grid.json, got ${totalPosts}`);
}

for (const slot of slots) {
  if (!seenIds.has(slot.id)) {
    errors.push(`${slot.id}: missing post for schedule-grid slot`);
  }
}

console.log(`\nLinkedIn verification report`);
console.log(`----------------------------`);
console.log(`Campaign dir:         ${CAMPAIGN_DIR}`);
console.log(`Day files:            ${dayFiles.length}`);
console.log(`Total posts:          ${totalPosts}`);
console.log(`Format counts:`, formatCounts);
console.log(`Pillar counts:`, pillarCounts);
console.log(`Source family counts:`, sourceFamilyCounts);
console.log(`Errors:               ${errors.length}`);
console.log(`Warnings:             ${warnings.length}`);

if (errors.length) {
  console.log(`\nErrors:`);
  for (const error of errors) console.log(`  - ${error}`);
}
if (warnings.length) {
  console.log(`\nWarnings:`);
  for (const warning of warnings) console.log(`  - ${warning}`);
}

process.exit(errors.length ? 1 : 0);
