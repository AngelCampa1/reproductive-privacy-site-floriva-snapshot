import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import { hubSiteRoutes } from "@/site/site-routes";

/**
 * `scripts/prerender-html.mjs` keeps its own copy tables because it runs as a
 * plain Node script over the built output. Before this guard existed, every hub
 * fell back to one shared string — "Floriva resources and comparison pages." —
 * for both its visible intro and its `<meta name="description">`, so ~19 routes
 * shipped an identical meta description.
 */
const source = readFileSync(resolve(process.cwd(), "scripts/prerender-html.mjs"), "utf8");

function tableKeys(tableName: string): Set<string> {
  const match = source.match(new RegExp(`const ${tableName} = \\{([\\s\\S]*?)\\n\\};`));
  if (!match) {
    throw new Error(`Could not find ${tableName} in prerender-html.mjs`);
  }
  return new Set([...match[1].matchAll(/"([^"]+)":/g)].map((entry) => entry[1]));
}

describe("prerender hub copy", () => {
  it("gives every hub route its own description", () => {
    const described = tableKeys("hubDescriptions");
    for (const route of hubSiteRoutes) {
      expect(described.has(route.path), `${route.path} has no prerender description`).toBe(true);
    }
  });

  it("no longer falls back to the shared boilerplate line", () => {
    expect(source).not.toContain("Floriva resources and comparison pages.");
  });

  it("uses a distinct description per hub", () => {
    const match = source.match(/const hubDescriptions = \{([\s\S]*?)\n\};/);
    const values = [...match![1].matchAll(/:\s*\n?\s*"([^"]+)"/g)].map((entry) => entry[1]);
    expect(values.length).toBeGreaterThan(0);
    expect(new Set(values).size, "two hubs share a prerender description").toBe(values.length);
  });
});
