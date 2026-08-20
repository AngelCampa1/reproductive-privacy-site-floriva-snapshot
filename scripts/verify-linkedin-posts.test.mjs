import assert from "node:assert/strict";
import { mkdtempSync, mkdirSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import test from "node:test";

const verifierPath = fileURLToPath(new URL("./verify-linkedin-posts.mjs", import.meta.url));
const temporaryCampaigns = [];

function buildCampaign({ declaredDays = 2, schema = "historical" } = {}) {
  const campaignDir = mkdtempSync(join(tmpdir(), "floriva-linkedin-verifier-"));
  temporaryCampaigns.push(campaignDir);
  const postsDir = join(campaignDir, "posts");
  mkdirSync(postsDir);

  const dates = ["2026-08-02", "2026-08-03"];
  const slots = dates.flatMap((date, dayIndex) =>
    ["0830", "1230"].map((time, slotIndex) => {
      const common = {
        id: `${date}-T${time}-fixture-${slotIndex + 1}`,
        pillar: dayIndex === 0 ? "privacy_architecture" : "cycle_literacy",
      };
      if (schema === "v2") {
        const utcTime = time === "0830" ? "13:30" : "17:30";
        return {
          ...common,
          localDate: date,
          date: `${date}T${utcTime}:00.000Z`,
          assetKind: slotIndex === 0 ? "document-carousel" : "none",
          topic: `Fixture topic ${dayIndex + 1}-${slotIndex + 1}`,
          sourceKeys: ["product-optional-sync", "product-core-storage"],
        };
      }
      return {
        ...common,
        date,
        scheduled_at: `${date}T${time.slice(0, 2)}:${time.slice(2)}:00-05:00`,
        format: slotIndex === 0 ? "visual" : "text_post",
        angle: `Fixture angle ${dayIndex + 1}-${slotIndex + 1}`,
        source_family: "product_source",
      };
    }),
  );

  writeFileSync(
    join(campaignDir, "schedule-grid.json"),
    `${JSON.stringify(
      {
        campaign: "Verifier fixture",
        days: declaredDays,
        posts_per_day: 2,
        total_slots: 4,
        slots,
      },
      null,
      2,
    )}\n`,
  );

  for (const date of dates) {
    const dateSlots = slots.filter((slot) => (slot.localDate || slot.date) === date);
    writeFileSync(
      join(postsDir, `${date}.json`),
      `${JSON.stringify(
        {
          ...(schema === "v2" ? { localDate: date } : { date }),
          posts: dateSlots.map((slot) => ({
            ...slot,
            ...(schema === "v2" ? { sourceKeys: [...slot.sourceKeys].reverse() } : {}),
            platform: "linkedin",
            content: `Check ${slot.id}.\n\nWould you choose private notes on your phone?`,
            sources: ["https://example.com/source"],
            linked_content: [],
            hashtags: [],
            manually_written: true,
            draft_pass: true,
            fact_review_pass: true,
            humanizer_pass: true,
            final_review_pass: true,
            claim_review: { reviewed: true },
            review_status: "approved",
          })),
        },
        null,
        2,
      )}\n`,
    );
  }

  return campaignDir;
}

test.afterEach(() => {
  while (temporaryCampaigns.length > 0) {
    rmSync(temporaryCampaigns.pop(), { recursive: true, force: true });
  }
});

test("derives campaign shape and posts directory from --schedule-grid", () => {
  const campaignDir = buildCampaign();
  const result = spawnSync(
    process.execPath,
    [verifierPath, `--schedule-grid=${join(campaignDir, "schedule-grid.json")}`],
    { encoding: "utf8" },
  );

  assert.equal(result.status, 0, result.stdout + result.stderr);
  assert.match(result.stdout, /Day files:\s+2/);
  assert.match(result.stdout, /Total posts:\s+4/);
  assert.match(result.stdout, /Errors:\s+0/);
});

test("rejects schedule metadata that disagrees with its slots", () => {
  const campaignDir = buildCampaign({ declaredDays: 26 });
  const result = spawnSync(
    process.execPath,
    [verifierPath, `--campaign-dir=${campaignDir}`],
    { encoding: "utf8" },
  );

  assert.equal(result.status, 1, result.stdout + result.stderr);
  assert.match(
    result.stdout,
    /schedule-grid\.json: declares 26 days, but slots contain 2 dates/,
  );
});

test("accepts v2 localDate, UTC date, assetKind, topic, and sourceKeys fields", () => {
  const campaignDir = buildCampaign({ schema: "v2" });
  const result = spawnSync(
    process.execPath,
    [verifierPath, `--schedule-grid=${join(campaignDir, "schedule-grid.json")}`],
    { encoding: "utf8" },
  );

  assert.equal(result.status, 0, result.stdout + result.stderr);
  assert.match(result.stdout, /Day files:\s+2/);
  assert.match(result.stdout, /Total posts:\s+4/);
  assert.match(result.stdout, /document-carousel': 2/);
  assert.match(result.stdout, /sourceKeys:product-core-storage\|product-optional-sync/);
  assert.match(result.stdout, /Errors:\s+0/);
});
