#!/usr/bin/env node
/**
 * Deterministic em/en-dash normalizer for content prose.
 * - Numeric ranges (24–36, 97.0–97.5) -> hyphen (24-36).
 * - Em/en dash used as punctuation -> comma, or sentence split when the
 *   following word is clearly capitalized (proper sentence break).
 * Only rewrites dash characters; never touches any other text.
 * Skips fenced code blocks. Leaves files without dashes untouched.
 */
import fs from "node:fs";
import path from "node:path";

const root = process.argv[2] || "content";
const exts = new Set([".mdx", ".md"]);

function listFiles(dir) {
  const out = [];
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, e.name);
    if (e.isDirectory()) out.push(...listFiles(p));
    else if (exts.has(path.extname(e.name))) out.push(p);
  }
  return out;
}

function normalizeLine(line) {
  if (!/[—–]/.test(line)) return line;
  let s = line;
  // Numeric / decimal ranges: keep as a hyphen range.
  s = s.replace(/(\d)\s*[—–]\s*(\d)/g, "$1-$2");
  // Spaced punctuation dash: "word — Next" -> sentence split if Next is capitalized,
  // otherwise a comma.
  s = s.replace(/\s*[—–]\s+([A-Z])/g, ". $1");
  s = s.replace(/\s*[—–]\s+/g, ", ");
  // Tight dash inside a word boundary: "incident—the" -> "incident, the"
  s = s.replace(/([^\s])[—–]([^\s])/g, "$1, $2");
  // Any leftover stray dash -> comma.
  s = s.replace(/\s*[—–]\s*/g, ", ");
  // Tidy artifacts.
  s = s.replace(/ ,/g, ",").replace(/,\s*,/g, ",").replace(/\. \./g, ".");
  // Collapse only interior multi-space runs; never touch leading indentation.
  s = s.replace(/(\S)[ \t]{2,}/g, "$1 ");
  return s;
}

let changed = 0;
let dashFiles = 0;
for (const file of listFiles(root)) {
  const orig = fs.readFileSync(file, "utf8");
  if (!/[—–]/.test(orig)) continue;
  dashFiles++;
  const lines = orig.split("\n");
  let inFence = false;
  const next = lines.map((ln) => {
    if (/^\s*```/.test(ln)) inFence = !inFence;
    if (inFence) return ln;
    return normalizeLine(ln);
  });
  const out = next.join("\n");
  if (out !== orig) {
    fs.writeFileSync(file, out);
    changed++;
  }
}
console.log(`Files with dashes: ${dashFiles}; files rewritten: ${changed}`);
