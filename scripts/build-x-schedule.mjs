// Builds social/x/schedule-grid.json: 14 days x 7 slots = 98 timestamped slots,
// each pre-assigned a format and pillar based on the shifted campaign sequence.
//
// Run: node scripts/build-x-schedule.mjs
// Optional: --campaign-dir=social/x

import { writeFileSync, mkdirSync } from "node:fs";
import { resolve } from "node:path";

const args = process.argv.slice(2);
const CAMPAIGN_DIR_FLAG = args.find((a) => a.startsWith("--campaign-dir="));
const OUT_DIR = resolve(CAMPAIGN_DIR_FLAG ? CAMPAIGN_DIR_FLAG.split("=")[1] : "social/x");
mkdirSync(OUT_DIR, { recursive: true });

// Days: 2026-05-06 (Wed) through 2026-05-19 (Tue). Eastern time, May = -04:00 (EDT).
// The campaign was shifted forward one day after the original May 5 start was missed.
const DATES = Array.from({ length: 14 }, (_, i) => {
  const d = new Date(Date.UTC(2026, 4, 6 + i)); // month index 4 = May
  return d.toISOString().slice(0, 10);
});

const TZ_OFFSET = "-04:00";

// Seven slots/day with hour windows. Slot index 0-6.
const SLOTS = [
  { name: "morning",       hourLo: 7,  hourHi: 9 },
  { name: "late_morning",  hourLo: 10, hourHi: 11 },
  { name: "lunch",         hourLo: 12, hourHi: 13 },
  { name: "mid_afternoon", hourLo: 14, hourHi: 16 },
  { name: "late_afternoon",hourLo: 16, hourHi: 18 },
  { name: "evening",       hourLo: 19, hourHi: 20 },
  { name: "late_evening",  hourLo: 21, hourHi: 22 },
];

// Authentic-looking minute pool. Never round, varied across the dial.
const MINUTE_POOL = [3, 7, 11, 16, 19, 23, 28, 31, 37, 41, 44, 47, 52, 57];

// Tiny deterministic PRNG so re-runs produce identical schedules.
function mulberry32(seed) {
  return function () {
    let t = (seed += 0x6d2b79f5);
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function hashString(s) {
  let h = 2166136261 >>> 0;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

function shuffle(arr, rng) {
  const out = arr.slice();
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
}

// Pillar mix per day-of-week. Targets across 14 days: ~25 privacy_legal,
// ~24 cycle_literacy, ~20 conditions, ~15 comparisons, ~14 product.
// Tue + Fri are privacy days. Mon soft. Sun condition deep.
// Slots: 0 morning, 1 late_morning, 2 lunch, 3 mid_afternoon, 4 late_afternoon, 5 evening, 6 late_evening.
const DOW_RHYTHM = {
  Mon: ["cycle_literacy", "conditions",     "cycle_literacy", "comparisons",   "product",        "cycle_literacy", "conditions"],
  Tue: ["cycle_literacy", "privacy_legal",  "privacy_legal",  "privacy_legal", "privacy_legal",  "conditions",     "comparisons"],
  Wed: ["cycle_literacy", "conditions",     "privacy_legal",  "comparisons",   "cycle_literacy", "product",        "conditions"],
  Thu: ["cycle_literacy", "comparisons",    "conditions",     "comparisons",   "privacy_legal",  "product",        "comparisons"],
  Fri: ["cycle_literacy", "privacy_legal",  "privacy_legal",  "privacy_legal", "privacy_legal",  "conditions",     "comparisons"],
  Sat: ["cycle_literacy", "cycle_literacy", "conditions",     "comparisons",   "cycle_literacy", "product",        "privacy_legal"],
  Sun: ["cycle_literacy", "conditions",     "conditions",     "cycle_literacy", "conditions",    "privacy_legal",  "product"],
};

// Preserve the already-written campaign's original day sequence after the one-day
// calendar shift. The stored `dow` field still reflects the actual shifted date.
const ORIGINAL_DOW_SEQUENCE = ["Tue", "Wed", "Thu", "Fri", "Sat", "Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun", "Mon"];

// Daily format shape: 4 single, 1 thread, 1 engagement, 1 quote.
// Place thread in morning or lunch (slot 0 or 2). Engagement in evening (slot 5).
// Quote in late_evening (slot 6). Singles fill the rest.
function dailyFormatTemplate(dayIdx) {
  // Alternate thread placement between slot 0 and slot 2 across the 14 days.
  const threadSlot = dayIdx % 2 === 0 ? 0 : 2;
  const formats = ["single", "single", "single", "single", "single", "engagement", "quote"];
  formats[threadSlot] = "thread";
  return formats;
}

// Long-thread days: per plan, 4 long threads on the heaviest topics.
// Shifted day index map: 0=Wed 5/6, 1=Thu 5/7, 2=Fri 5/8, 3=Sat 5/9, 4=Sun 5/10, 5=Mon 5/11,
// 6=Tue 5/12, 7=Wed 5/13, 8=Thu 5/14, 9=Fri 5/15, 10=Sat 5/16, 11=Sun 5/17, 12=Mon 5/18, 13=Tue 5/19.
// Long threads land on Wed (1, 8) and Fri (3, 10) per the strategy doc.
const LONG_THREAD_DAY_INDEXES = new Set([1, 3, 8, 10]);

function dayOfWeek(yyyymmdd) {
  // Use UTC noon to avoid TZ flips
  const d = new Date(yyyymmdd + "T12:00:00Z");
  return ["Sun","Mon","Tue","Wed","Thu","Fri","Sat"][d.getUTCDay()];
}

function addDays(yyyymmdd, days) {
  const d = new Date(yyyymmdd + "T12:00:00Z");
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}

const grid = [];

for (let dayIdx = 0; dayIdx < DATES.length; dayIdx++) {
  const date = DATES[dayIdx];
  const dow = dayOfWeek(date);
  // Seed from the original pre-shift date so regenerating preserves the written
  // campaign's existing hours/minutes while emitting the shifted dates.
  const rng = mulberry32(hashString(addDays(date, -1)));
  const formats = dailyFormatTemplate(dayIdx);
  const pillars = DOW_RHYTHM[ORIGINAL_DOW_SEQUENCE[dayIdx]];

  // Pre-pick distinct minutes for this day (no two slots share one).
  const minutes = shuffle(MINUTE_POOL, rng).slice(0, SLOTS.length);

  for (let slotIdx = 0; slotIdx < SLOTS.length; slotIdx++) {
    const slot = SLOTS[slotIdx];
    // Pick an hour inside the slot window.
    const hour = slot.hourLo + Math.floor(rng() * (slot.hourHi - slot.hourLo + 1));
    const minute = minutes[slotIdx];
    const hh = String(hour).padStart(2, "0");
    const mm = String(minute).padStart(2, "0");
    const scheduledAt = `${date}T${hh}:${mm}:00${TZ_OFFSET}`;
    const format = formats[slotIdx];
    const pillar = dayIdx === 10 && slotIdx === 0 ? "privacy_legal" : pillars[slotIdx];

    const id = `${date}-T${hh}${mm}-${pillar.replace(/_/g, "-")}-${format}`;

    const entry = {
      id,
      date,
      dow,
      day_index: dayIdx,
      slot_index: slotIdx,
      slot_name: slot.name,
      scheduled_at: scheduledAt,
      format,
      pillar,
    };

    if (format === "thread") {
      entry.thread_depth = LONG_THREAD_DAY_INDEXES.has(dayIdx) ? 6 : 3 + (slotIdx % 2);
    }

    grid.push(entry);
  }
}

// Sanity: assert no two posts on the same day share the same minute.
const dayMinSeen = new Map();
for (const e of grid) {
  const key = e.date + " " + e.scheduled_at.slice(11, 16);
  if (dayMinSeen.has(key)) {
    throw new Error(`Duplicate timestamp ${key} for ${e.id} and ${dayMinSeen.get(key)}`);
  }
  dayMinSeen.set(key, e.id);
}

// Sanity: counts.
const counts = grid.reduce((acc, e) => {
  acc.format[e.format] = (acc.format[e.format] || 0) + 1;
  acc.pillar[e.pillar] = (acc.pillar[e.pillar] || 0) + 1;
  return acc;
}, { format: {}, pillar: {} });

const out = {
  generated_at: new Date().toISOString(),
  total_units: grid.length,
  format_counts: counts.format,
  pillar_counts: counts.pillar,
  notes:
    "May 6-19, 2026 shifted campaign. 98 unit slots = 56 single + 14 thread + 14 engagement + 14 quote. " +
    "Threads at days 1,3,8,10 are long (depth 6); others compact (3-4).",
  slots: grid,
};

writeFileSync(resolve(OUT_DIR, "schedule-grid.json"), JSON.stringify(out, null, 2));
console.log(`Wrote ${resolve(OUT_DIR, "schedule-grid.json")} (${grid.length} slots).`);
console.log("Format counts:", counts.format);
console.log("Pillar counts:", counts.pillar);
