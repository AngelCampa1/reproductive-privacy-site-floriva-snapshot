import { describe, expect, it } from "vitest";
import { hubGuideLinks } from "@/site/marketing-links";
import { getValidRoutePaths, hubSiteRoutes, normalizeSitePath } from "@/site/route-inventory";

/**
 * The "Choose your path" cards used to fall back to a synthesized card whose
 * body was one hardcoded sentence, repeated across all three cards, on 12 of
 * the 18 hubs. The fallback is gone, so a hub missing from `hubGuideLinks` now
 * renders no cards at all. These tests are what make that loud.
 */
describe("hub guide links", () => {
  /* `hubGuideLinks` is the only source. `pillar-hubs.ts` used to carry a second
     one, but it was shadowed by this table on every hub that had both, so nine
     cards there were unreachable and drifted out of voice unnoticed. */
  const authoredFor = (path: string) => hubGuideLinks[path] ?? [];

  it("gives every hub three authored cards", () => {
    for (const route of hubSiteRoutes) {
      const links = authoredFor(route.path);
      expect(links.length, `${route.path} has no authored guide cards`).toBeGreaterThanOrEqual(3);
    }
  });

  it("never repeats a card body, within a hub or across the site", () => {
    for (const route of hubSiteRoutes) {
      const bodies = authoredFor(route.path).map((link) => link.body);
      expect(new Set(bodies).size, `${route.path} repeats a card body`).toBe(bodies.length);
    }

    // A body reused everywhere is the boilerplate failure in a new costume.
    const bodyCounts = new Map<string, number>();
    for (const route of hubSiteRoutes) {
      for (const link of authoredFor(route.path)) {
        bodyCounts.set(link.body, (bodyCounts.get(link.body) ?? 0) + 1);
      }
    }
    for (const [body, count] of bodyCounts) {
      expect(count, `"${body}" is used on ${count} hubs`).toBeLessThanOrEqual(4);
    }
  });

  it("points every card at a real route that is not the hub itself", () => {
    const validPaths = getValidRoutePaths();

    for (const route of hubSiteRoutes) {
      for (const link of authoredFor(route.path)) {
        expect(validPaths.has(normalizeSitePath(link.href)), `${route.path} → dead card link ${link.href}`).toBe(true);
        expect(normalizeSitePath(link.href), `${route.path} links a card back to itself`).not.toBe(
          normalizeSitePath(route.path),
        );
      }
    }
  });

  it("sends each card somewhere different", () => {
    for (const route of hubSiteRoutes) {
      const hrefs = authoredFor(route.path)
        .slice(0, 3)
        .map((link) => normalizeSitePath(link.href));
      expect(new Set(hrefs).size, `${route.path} shows the same destination twice`).toBe(hrefs.length);
    }
  });
});
