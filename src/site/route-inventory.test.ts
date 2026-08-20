import { describe, expect, it } from "vitest";
import { allEntries } from "@/site/content";
import { collectionDefinitions } from "@/site/config";
import {
  buildInternalLinkGraph,
  getAllSiteRoutes,
  getValidRoutePaths,
} from "@/site/route-inventory";

describe("site route inventory", () => {
  it("includes every generated content page plus static routes", () => {
    const routes = getAllSiteRoutes();
    const routePaths = new Set(routes.map((route) => route.path));

    expect(routes.length).toBeGreaterThan(allEntries.length);
    expect(routePaths.size).toBe(routes.length);

    for (const entry of allEntries) {
      expect(routePaths.has(entry.routePath)).toBe(true);
    }

    expect(routePaths.has("/resources")).toBe(true);
    expect(routePaths.has("/resources/health")).toBe(true);
    expect(routePaths.has("/compare/alternatives")).toBe(true);
    expect(routePaths.has("/free")).toBe(true);
  });

  it("includes a hub route for every collection route base", () => {
    const validRoutes = getValidRoutePaths();

    for (const definition of Object.values(collectionDefinitions)) {
      expect(validRoutes.has(definition.routeBase)).toBe(true);
    }
  });

  it("exposes normalized valid route paths for link audits", () => {
    const validRoutes = getValidRoutePaths();

    expect(validRoutes.has("/resources/guides/")).toBe(false);
    expect(validRoutes.has("/resources/guides")).toBe(true);
    expect(validRoutes.has("/resources/guides/period-tracking-legal-safety-guide")).toBe(true);
  });

  it("keeps every canonical route reachable from another internal page", () => {
    const graph = buildInternalLinkGraph();

    expect(graph.brokenLinks).toEqual([]);
    expect(graph.orphans).toEqual([]);
  });
});
