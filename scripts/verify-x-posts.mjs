// Validates X campaign post JSON files against the campaign rules.
// Run: node scripts/verify-x-posts.mjs
// Optional:
//   --campaign-dir=social/x/hourly-2026-05-07

import { readFileSync, readdirSync } from "node:fs";
import { resolve } from "node:path";

const args = process.argv.slice(2);
const CAMPAIGN_DIR_FLAG = args.find((a) => a.startsWith("--campaign-dir="));
const CAMPAIGN_DIR = resolve(CAMPAIGN_DIR_FLAG ? CAMPAIGN_DIR_FLAG.split("=")[1] : "social/x");
const POSTS_DIR = resolve(CAMPAIGN_DIR, "posts");
const GRID_FILE = resolve(CAMPAIGN_DIR, "schedule-grid.json");

const grid = JSON.parse(readFileSync(GRID_FILE, "utf8"));
const slotsById = new Map(grid.slots.map((s) => [s.id, s]));
const expectedByDate = grid.slots.reduce((acc, slot) => {
  acc[slot.date] = (acc[slot.date] || 0) + 1;
  return acc;
}, {});

const dayFiles = readdirSync(POSTS_DIR).filter((f) => f.endsWith(".json")).sort();

const errors = [];
const warnings = [];
const expectedDates = new Set(Object.keys(expectedByDate));
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

let totalPosts = 0;
let totalThreadChildren = 0;
const seenIds = new Set();
const formatCounts = {};
const pillarCounts = {};
const minutesByDate = {};

const FORBIDDEN_DASHES = /—|--/;
const URL_RE = /https?:\/\/\S+/;
const AI_TELLS_RE = /\b(moreover|furthermore|in essence|ultimately|in today's world|at the end of the day|needless to say|beacon|stands as a testament|dawn of|ushered in|seamless|intuitive|robust|cutting-edge|industry-leading|did you know that|when it comes to)\b/i;
const ENGAGEMENT_BAIT_RE = /\b(agree\?|thoughts\?\?|what do you think\?\?|drop a)\b/i;

function checkContent(label, content, postId) {
  if (typeof content !== "string") {
    errors.push(`${postId}: ${label} not a string`);
    return;
  }
  if (FORBIDDEN_DASHES.test(content)) {
    errors.push(`${postId}: ${label} contains em dash or double dash`);
  }
  if (content.length > 280) {
    errors.push(`${postId}: ${label} length ${content.length} > 280`);
  }
  if (content.length < 1) {
    errors.push(`${postId}: ${label} empty`);
  }
  if (URL_RE.test(content)) {
    warnings.push(`${postId}: ${label} contains a URL (bio handles links)`);
  }
  if (AI_TELLS_RE.test(content)) {
    errors.push(`${postId}: ${label} contains generic/AI-style phrasing`);
  }
  if (ENGAGEMENT_BAIT_RE.test(content)) {
    errors.push(`${postId}: ${label} contains engagement-bait phrasing`);
  }
}

for (const file of dayFiles) {
  const path = resolve(POSTS_DIR, file);
  let parsed;
  try {
    parsed = JSON.parse(readFileSync(path, "utf8"));
  } catch (e) {
    errors.push(`${file}: invalid JSON (${e.message})`);
    continue;
  }

  if (!parsed.date || !parsed.posts || !Array.isArray(parsed.posts)) {
    errors.push(`${file}: missing date/posts`);
    continue;
  }

  const expectedPosts = expectedByDate[parsed.date];
  if (expectedPosts !== undefined && parsed.posts.length !== expectedPosts) {
    errors.push(`${file}: expected ${expectedPosts} posts, got ${parsed.posts.length}`);
  }

  for (const post of parsed.posts) {
    totalPosts++;

    if (!post.id || seenIds.has(post.id)) {
      errors.push(`${file}: missing or duplicate id "${post.id}"`);
    } else {
      seenIds.add(post.id);
    }

    const gridSlot = slotsById.get(post.id);
    if (!gridSlot) {
      errors.push(`${post.id}: not in schedule-grid.json`);
    } else {
      if (post.scheduled_at !== gridSlot.scheduled_at) {
        errors.push(`${post.id}: scheduled_at drift`);
      }
      if (post.format !== gridSlot.format) {
        errors.push(`${post.id}: format mismatch (${post.format} vs ${gridSlot.format})`);
      }
      if (post.pillar !== gridSlot.pillar) {
        errors.push(`${post.id}: pillar mismatch (${post.pillar} vs ${gridSlot.pillar})`);
      }
    }

    formatCounts[post.format] = (formatCounts[post.format] || 0) + 1;
    pillarCounts[post.pillar] = (pillarCounts[post.pillar] || 0) + 1;

    if (!post.sources || !Array.isArray(post.sources) || post.sources.length === 0) {
      errors.push(`${post.id}: missing sources`);
    }

    if (post.humanizer_pass !== true) {
      warnings.push(`${post.id}: humanizer_pass not true`);
    }
    if (grid.total_units === 504) {
      for (const flag of ["draft_pass", "fact_review_pass", "humanizer_pass", "final_review_pass"]) {
        if (post[flag] !== true) {
          errors.push(`${post.id}: ${flag} not true`);
        }
      }
    }

    if (post.format === "thread") {
      if (!Array.isArray(post.thread) || post.thread.length < 2) {
        errors.push(`${post.id}: thread must have at least 2 posts`);
      } else {
        for (let i = 0; i < post.thread.length; i++) {
          checkContent(`thread[${i}]`, post.thread[i].content, post.id);
          totalThreadChildren++;
        }
      }
      if (post.content) {
        warnings.push(`${post.id}: thread should not have top-level content`);
      }
    } else {
      checkContent("content", post.content, post.id);
    }

    // Track minute uniqueness per day.
    const minute = post.scheduled_at?.slice(11, 16);
    if (minute) {
      minutesByDate[parsed.date] = minutesByDate[parsed.date] || new Set();
      if (minutesByDate[parsed.date].has(minute)) {
        errors.push(`${parsed.date}: duplicate minute ${minute}`);
      }
      minutesByDate[parsed.date].add(minute);
    }
  }
}

if (totalPosts !== grid.total_units) {
  errors.push(`expected ${grid.total_units} total post units, got ${totalPosts}`);
}

for (const slot of grid.slots) {
  if (!seenIds.has(slot.id)) {
    errors.push(`${slot.id}: missing post for schedule-grid slot`);
  }
}

console.log(`\nVerification report`);
console.log(`-------------------`);
console.log(`Campaign dir:        ${CAMPAIGN_DIR}`);
console.log(`Day files:           ${dayFiles.length}`);
console.log(`Total post units:    ${totalPosts}`);
console.log(`Total thread tweets: ${totalThreadChildren}`);
console.log(`Total tweets ship:   ${totalPosts - (formatCounts.thread || 0) + totalThreadChildren}`);
console.log(`Format counts:`, formatCounts);
console.log(`Pillar counts:`, pillarCounts);
console.log(`Errors:              ${errors.length}`);
console.log(`Warnings:            ${warnings.length}`);

if (errors.length) {
  console.log(`\nErrors:`);
  for (const e of errors) console.log(`  - ${e}`);
}
if (warnings.length) {
  console.log(`\nWarnings:`);
  for (const w of warnings) console.log(`  - ${w}`);
}

process.exit(errors.length ? 1 : 0);
