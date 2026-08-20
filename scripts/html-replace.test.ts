import { spawnSync } from "node:child_process";
import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

import { literal, replaceLiteral } from "./lib/html-replace.mjs";

const rootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

// Every sequence String.prototype.replace treats as special in a replacement
// string. `$&` is the whole match, `` $` `` everything before it, `$'`
// everything after it, `$$` an escaped dollar sign.
const hazards = ["$&", "$`", "$'", "$$"];

describe("literal replacement", () => {
  const titlePattern = /<title>[\s\S]*?<\/title>/i;
  const document = "<head><title>OLD</title></head>";

  it.each(hazards)("inserts %s verbatim instead of expanding it", (hazard) => {
    const value = `<title>before ${hazard} after</title>`;

    expect(replaceLiteral(document, titlePattern, value)).toBe(
      `<head><title>before ${hazard} after</title></head>`,
    );
  });

  it("demonstrates the corruption a plain replacement string causes", () => {
    // Guards the premise of this whole module: if this ever stops corrupting,
    // the helpers are no longer load-bearing and the tests above are vacuous.
    expect(document.replace(titlePattern, "<title>x$&y</title>")).toBe(
      "<head><title>x<title>OLD</title>y</title></head>",
    );
  });

  it("applies to string search patterns, not just regexes", () => {
    expect(replaceLiteral("<head></head>", "</head>", "<meta content=\"a $' b\" /></head>")).toBe(
      "<head><meta content=\"a $' b\" /></head>",
    );
  });

  it("leaves values untouched when they contain no substitution patterns", () => {
    expect(replaceLiteral(document, titlePattern, "<title>Costs $59.5M</title>")).toBe(
      "<head><title>Costs $59.5M</title></head>",
    );
  });

  it("returns a replacer function rather than a string", () => {
    expect(typeof literal("x")).toBe("function");
  });
});

/**
 * Find the second argument of every `.replace(` / `.replaceAll(` call, by
 * bracket-matching to the top-level comma.
 *
 * A regex cannot do this job. The widest hazard in the pre-fix code was
 * `html.replace(pattern, replacement)` — an identifier, with no backtick to
 * anchor on — and that one line fanned out across 11 head tags x 559 routes.
 * Anchoring on a template literal would have missed it, and would also miss
 * string concatenation. So: parse, don't pattern-match.
 */
function secondArguments(source: string): { call: string; arg: string }[] {
  const found: { call: string; arg: string }[] = [];
  const callPattern = /\.replace(All)?\(/g;

  for (const match of source.matchAll(callPattern)) {
    let depth = 1;
    let index = match.index + match[0].length;
    let commaAt = -1;

    for (; index < source.length && depth > 0; index += 1) {
      const character = source[index];
      if (character === "(" || character === "[" || character === "{") depth += 1;
      else if (character === ")" || character === "]" || character === "}") depth -= 1;
      else if (character === "," && depth === 1 && commaAt === -1) commaAt = index + 1;
    }

    if (commaAt === -1) continue;
    found.push({
      call: source.slice(match.index, Math.min(match.index + 60, source.length)).split("\n")[0],
      arg: source.slice(commaAt, index - 1).trim(),
    });
  }

  return found;
}

describe("prerender-html substitution safety", () => {
  const source = readFileSync(path.join(rootDir, "scripts", "prerender-html.mjs"), "utf8");

  it("never passes a dynamic value to .replace() as a replacement string", () => {
    // Safe: wrapped in literal(), or a fixed string/regex literal the author
    // can eyeball. Unsafe: anything computed — a template literal, an
    // identifier, a concatenation — since those can carry page content.
    const unsafe = secondArguments(source).filter(({ arg }) => {
      if (arg.startsWith("literal(")) return false;
      const isFixedString = /^(["'])(?:(?!\1)[^\\]|\\.)*\1$/.test(arg);
      return !(isFixedString && !arg.includes("$"));
    });

    expect(unsafe.map(({ call, arg }) => `${call} -> ${arg}`)).toEqual([]);
  });

  it("catches the shapes the old regex-based check was blind to", () => {
    // Guards the scanner itself. Each of these is a real hazard that a
    // `/\.replace\([^,]+,\s*`/` pattern reports as clean.
    const blindSpots = [
      "html.replace(pattern, replacement);",
      'html.replace("</head>", prefix + derived);',
      "html.replaceAll(pattern, `${derived}</head>`);",
    ];

    for (const snippet of blindSpots) {
      const args = secondArguments(snippet);
      expect(args).toHaveLength(1);
      expect(args[0]!.arg.startsWith("literal(")).toBe(false);
    }
  });
});

describe("prerender-html route selection", () => {
  it("exits non-zero when PRERENDER_ROUTES is set but empty", () => {
    // Behavioural, not a source grep: `PRERENDER_ROUTES=""` silently meaning
    // "prerender all 559 routes" is what let a test run overwrite every route
    // in dist/ with a script-less fixture.
    const result = spawnSync(process.execPath, ["scripts/prerender-html.mjs"], {
      cwd: rootDir,
      env: { ...process.env, PRERENDER_ROUTES: "" },
      encoding: "utf8",
    });

    expect(result.status).toBe(1);
    expect(result.stderr).toContain("PRERENDER_ROUTES is set but lists no routes");
  });
});
