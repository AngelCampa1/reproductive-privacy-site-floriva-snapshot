// Reads social/x/posts/*.json, emits:
//   social/x/posts.index.json            -- flat list of all 98 post units
//   social/x/sources.md                  -- post id -> source crosswalk
//   social/x/postiz-payloads/<id>.json   -- one Postiz CLI payload per post
//
// Run: node scripts/build-x-index-and-payloads.mjs
// Optional: --campaign-dir=social/x/hourly-2026-05-07

import { readFileSync, readdirSync, writeFileSync, mkdirSync, rmSync, existsSync } from "node:fs";
import { resolve } from "node:path";

const args = process.argv.slice(2);
const CAMPAIGN_DIR_FLAG = args.find((a) => a.startsWith("--campaign-dir="));
const CAMPAIGN_DIR = resolve(CAMPAIGN_DIR_FLAG ? CAMPAIGN_DIR_FLAG.split("=")[1] : "social/x");
const POSTS_DIR = resolve(CAMPAIGN_DIR, "posts");
const PAYLOADS_DIR = resolve(CAMPAIGN_DIR, "postiz-payloads");
const INDEX_FILE = resolve(CAMPAIGN_DIR, "posts.index.json");
const SOURCES_FILE = resolve(CAMPAIGN_DIR, "sources.md");
const publicKnowledge = JSON.parse(readFileSync(resolve("src/site/generated/public-knowledge.json"), "utf8"));
const socialKnowledge = publicKnowledge.socialCampaign;
const SOURCE_INDEX_TITLE = "Floriva X Campaign - Source Crosswalk";
const SOURCE_INDEX_DESCRIPTION =
  "Each post id maps to the citation strings used in its `sources` array. Use this to audit research-backing across the campaign.";
const POSTIZ_CHANNEL_ID = process.env.POSTIZ_CHANNEL_ID || "<POSTIZ_CHANNEL_ID>";

if (existsSync(PAYLOADS_DIR)) {
  rmSync(PAYLOADS_DIR, { recursive: true, force: true });
}
mkdirSync(PAYLOADS_DIR, { recursive: true });

const dayFiles = readdirSync(POSTS_DIR).filter((f) => f.endsWith(".json")).sort();

const index = [];
const sourcesByPost = [];

for (const file of dayFiles) {
  const parsed = JSON.parse(readFileSync(resolve(POSTS_DIR, file), "utf8"));
  for (const post of parsed.posts) {
    index.push(post);
    sourcesByPost.push({
      id: post.id,
      pillar: post.pillar,
      format: post.format,
      sources: post.sources || [],
      linked_content: post.linked_content || [],
    });

    // Build the Postiz CLI --json payload for this post.
    // The CLI accepts an array of post objects (one per reply in a thread chain).
    // Schema reference: postiz posts:create --help shows -c (content) repeated for thread.
    const payload = {
      type: "schedule",
      date: post.scheduled_at,
      shortLink: false,
      integrations: [{ id: post.channel_id || POSTIZ_CHANNEL_ID }],
    };

    if (post.format === "thread") {
      // Multi-reply chain. Postiz expects "posts" array.
      payload.posts = post.thread.map((t) => ({
        content: t.content,
        settings: { who_can_reply_post: "everyone" },
      }));
    } else {
      payload.posts = [{
        content: post.content,
        settings: { who_can_reply_post: "everyone" },
      }];
    }

    writeFileSync(
      resolve(PAYLOADS_DIR, `${post.id}.json`),
      JSON.stringify(payload, null, 2),
    );
  }
}

// Sort index by scheduled_at to make the schedule run in chronological order.
index.sort((a, b) => a.scheduled_at.localeCompare(b.scheduled_at));

writeFileSync(INDEX_FILE, JSON.stringify(index, null, 2));

// Build sources.md
let md = `# ${SOURCE_INDEX_TITLE}\n\n`;
md += `${SOURCE_INDEX_DESCRIPTION}\n\n`;

const byPillar = sourcesByPost.reduce((acc, e) => {
  acc[e.pillar] = acc[e.pillar] || [];
  acc[e.pillar].push(e);
  return acc;
}, {});

const pillarOrder = socialKnowledge.pillarOrder;
for (const pillar of pillarOrder) {
  const entries = byPillar[pillar] || [];
  md += `## ${pillar} (${entries.length} posts)\n\n`;
  for (const e of entries) {
    md += `### ${e.id} (${e.format})\n`;
    if (e.sources.length === 0) {
      md += "- (no sources listed)\n";
    } else {
      for (const s of e.sources) md += `- ${s}\n`;
    }
    if (e.linked_content.length) {
      md += `- linked: ${e.linked_content.join(", ")}\n`;
    }
    md += "\n";
  }
}

writeFileSync(SOURCES_FILE, md);

console.log(`Wrote ${INDEX_FILE} (${index.length} entries)`);
console.log(`Wrote ${SOURCES_FILE}`);
console.log(`Wrote ${PAYLOADS_DIR}/<id>.json (${index.length} payloads)`);
