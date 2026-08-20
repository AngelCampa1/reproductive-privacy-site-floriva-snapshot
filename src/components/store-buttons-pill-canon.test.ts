import { readdirSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

// Source-guard: the store CTAs are buttons / link-styled-as-buttons, so the
// repo's pill-button canon (fully rounded, 999px) governs their geometry.
// jsdom does not apply the stylesheet, so we assert the radius at the source.
//
// The stylesheet is split across `src/index.css` (an @import manifest) and
// the per-surface files under `src/styles/`, so concatenate all of them —
// the rule we're looking for can live in any one of them.
const cssRoot = process.cwd();
const stylesDir = resolve(cssRoot, "src/styles");
const cssFiles = [
  resolve(cssRoot, "src/index.css"),
  ...readdirSync(stylesDir)
    .filter((file) => file.endsWith(".css"))
    .map((file) => resolve(stylesDir, file)),
];
const css = cssFiles.map((file) => readFileSync(file, "utf8")).join("\n");

function ruleBody(selector: string): string {
  const escaped = selector.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  // Anchor at line start so a base rule (e.g. `.store-button {`) is not
  // shadowed by compound/variant selectors that contain it as a substring
  // (e.g. `.store-buttons--compact .store-button {`).
  const match = css.match(new RegExp(`^${escaped}\\s*\\{([^}]*)\\}`, "m"));
  if (!match) {
    throw new Error(`CSS rule not found: ${selector}`);
  }
  return match[1];
}

// A full pill may be written as the literal or as the token that holds it.
// `--radius-pill` is 999px and is what the canon comment in buttons-ctas.css
// tells authors to reach for, so both spellings satisfy this guard.
const FULL_PILL = /border-radius:\s*(999px|var\(--radius-pill\))/;

describe("store CTA pill canon", () => {
  it("renders the live store download links (.store-pill) as full pills", () => {
    expect(ruleBody(".store-pill")).toMatch(FULL_PILL);
  });

  it("renders the coming-soon store buttons (.store-button) as full pills", () => {
    expect(ruleBody(".store-button")).toMatch(FULL_PILL);
  });

  it("gives the live store pill an ink background with canvas text (own artwork, not an official badge)", () => {
    const base = ruleBody(".store-pill");
    expect(base).toMatch(/background:\s*var\(--ink\)/);
    expect(base).toMatch(/color:\s*var\(--canvas\)/);
  });

  it("keeps both store pill variants (ios/android) on the same ink style — no per-store color split", () => {
    expect(css).not.toMatch(/^\.store-pill--ios\s*\{/m);
    expect(css).not.toMatch(/^\.store-pill--android\s*\{/m);
  });

  it("has no leftover official badge artwork rules or asset references", () => {
    expect(css).not.toMatch(/\.store-badge/);
    expect(css).not.toMatch(/\/badges\//);
  });
});
