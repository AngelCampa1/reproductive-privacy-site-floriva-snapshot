// Reads LinkedIn campaign posts/*.json, emits:
//   posts.index.json
//   sources.md
//   postiz-payloads/<id>.json
//
// Run: node scripts/build-linkedin-index-and-payloads.mjs
// Optional:
//   --campaign-dir=social/linkedin/2026-05-20-to-2026-06-14

import { existsSync, mkdirSync, readFileSync, readdirSync, rmSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";

const args = process.argv.slice(2);
const CAMPAIGN_DIR_FLAG = args.find((a) => a.startsWith("--campaign-dir="));
const CAMPAIGN_DIR = resolve(
  CAMPAIGN_DIR_FLAG
    ? CAMPAIGN_DIR_FLAG.split("=").slice(1).join("=")
    : "social/linkedin/2026-05-20-to-2026-06-14",
);
const POSTS_DIR = resolve(CAMPAIGN_DIR, "posts");
const GRID_FILE = resolve(CAMPAIGN_DIR, "schedule-grid.json");
const PAYLOADS_DIR = resolve(CAMPAIGN_DIR, "postiz-payloads");
const INDEX_FILE = resolve(CAMPAIGN_DIR, "posts.index.json");
const SOURCES_FILE = resolve(CAMPAIGN_DIR, "sources.md");
const POSTIZ_LINKEDIN_PAGE_ID = process.env.POSTIZ_LINKEDIN_PAGE_ID || "<POSTIZ_LINKEDIN_PAGE_ID>";

const REQUIRED_TRUE_FLAGS = [
  "manually_written",
  "draft_pass",
  "fact_review_pass",
  "humanizer_pass",
  "final_review_pass",
];

const errors = [];

function readJson(path, label) {
  try {
    return JSON.parse(readFileSync(path, "utf8"));
  } catch (error) {
    errors.push(`${label}: invalid JSON (${error.message})`);
    return null;
  }
}

function contentWithHashtags(post) {
  const hashtags = Array.isArray(post.hashtags) ? post.hashtags.filter(Boolean) : [];
  if (hashtags.length === 0) return post.content;

  const missingHashtags = hashtags.filter((tag) => !post.content.includes(tag));
  if (missingHashtags.length === 0) return post.content;

  return `${post.content.trim()}\n\n${missingHashtags.join(" ")}`;
}

function isApproved(post) {
  for (const flag of REQUIRED_TRUE_FLAGS) {
    if (post[flag] !== true) return false;
  }

  return post.claim_review?.reviewed === true && post.review_status === "approved";
}

const grid = readJson(GRID_FILE, "schedule-grid.json");
if (!grid) process.exit(1);

const slots = Array.isArray(grid.slots) ? grid.slots : [];
const slotsById = new Map(slots.map((slot) => [slot.id, slot]));
const expectedDates = new Set(slots.map((slot) => slot.date));
const dayFiles = existsSync(POSTS_DIR)
  ? readdirSync(POSTS_DIR).filter((file) => file.endsWith(".json")).sort()
  : [];
const actualDates = new Set(dayFiles.map((file) => file.replace(/\.json$/, "")));

if (!existsSync(POSTS_DIR)) {
  errors.push(`posts directory missing: ${POSTS_DIR}`);
}
for (const date of expectedDates) {
  if (!actualDates.has(date)) {
    errors.push(`${date}.json: missing day file`);
  }
}

const index = [];
const sourcesByPost = [];
const seenIds = new Set();

for (const file of dayFiles) {
  const parsed = readJson(resolve(POSTS_DIR, file), file);
  if (!parsed || !Array.isArray(parsed.posts)) {
    errors.push(`${file}: missing posts array`);
    continue;
  }

  for (const post of parsed.posts) {
    if (!post.id || typeof post.id !== "string") {
      errors.push(`${file}: post missing id`);
      continue;
    }
    if (seenIds.has(post.id)) {
      errors.push(`${post.id}: duplicate id`);
    }
    seenIds.add(post.id);

    const slot = slotsById.get(post.id);
    if (!slot) {
      errors.push(`${post.id}: not in schedule-grid.json`);
    } else {
      for (const field of ["scheduled_at", "format", "pillar", "angle", "source_family"]) {
        if (post[field] !== slot[field]) {
          errors.push(`${post.id}: ${field} mismatch (${post[field]} vs ${slot[field]})`);
        }
      }
    }

    if (!isApproved(post)) {
      errors.push(`${post.id}: not approved or final flags incomplete`);
    }
    if (typeof post.content !== "string" || post.content.trim().length === 0) {
      errors.push(`${post.id}: content empty or not a string`);
    }

    index.push(post);
    sourcesByPost.push({
      id: post.id,
      pillar: post.pillar,
      format: post.format,
      sources: post.sources || [],
      linked_content: post.linked_content || [],
    });
  }
}

for (const slot of slots) {
  if (!seenIds.has(slot.id)) {
    errors.push(`${slot.id}: missing post for schedule-grid slot`);
  }
}

if (index.length !== grid.total_slots) {
  errors.push(`expected ${grid.total_slots} posts, got ${index.length}`);
}

if (errors.length) {
  console.error(`LinkedIn payload build failed with ${errors.length} error(s):`);
  for (const error of errors) console.error(`  - ${error}`);
  process.exit(1);
}

if (existsSync(PAYLOADS_DIR)) {
  rmSync(PAYLOADS_DIR, { recursive: true, force: true });
}
mkdirSync(PAYLOADS_DIR, { recursive: true });

index.sort((a, b) => a.scheduled_at.localeCompare(b.scheduled_at));
sourcesByPost.sort((a, b) => a.id.localeCompare(b.id));

for (const post of index) {
  const payload = {
    type: "schedule",
    date: post.scheduled_at,
    shortLink: false,
    integrations: [{ id: post.linkedin_page_id || POSTIZ_LINKEDIN_PAGE_ID }],
    posts: [
      {
        content: contentWithHashtags(post),
        settings: {
          __type: "linkedin-page",
          post_as_images_carousel: false,
        },
      },
    ],
  };

  writeFileSync(resolve(PAYLOADS_DIR, `${post.id}.json`), JSON.stringify(payload, null, 2));
}

writeFileSync(INDEX_FILE, JSON.stringify(index, null, 2));

let md = `# Floriva LinkedIn Campaign - Source Crosswalk\n\n`;
md += "Each post id maps to the citation strings used in its `sources` array. Use this to audit research-backing across the campaign.\n\n";

const byPillar = sourcesByPost.reduce((acc, entry) => {
  acc[entry.pillar] = acc[entry.pillar] || [];
  acc[entry.pillar].push(entry);
  return acc;
}, {});

for (const pillar of Object.keys(byPillar).sort()) {
  const entries = byPillar[pillar];
  md += `## ${pillar} (${entries.length} posts)\n\n`;
  for (const entry of entries) {
    md += `### ${entry.id} (${entry.format})\n`;
    if (entry.sources.length === 0) {
      md += "- (no sources listed)\n";
    } else {
      for (const source of entry.sources) md += `- ${source}\n`;
    }
    if (entry.linked_content.length) {
      md += `- linked: ${entry.linked_content.join(", ")}\n`;
    }
    md += "\n";
  }
}

writeFileSync(SOURCES_FILE, `${md.trimEnd()}\n`);

console.log(`Wrote ${INDEX_FILE} (${index.length} entries)`);
console.log(`Wrote ${SOURCES_FILE}`);
console.log(`Wrote ${PAYLOADS_DIR}/<id>.json (${index.length} payloads)`);
