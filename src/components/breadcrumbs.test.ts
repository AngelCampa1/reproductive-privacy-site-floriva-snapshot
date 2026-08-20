import { describe, expect, it } from "vitest";
import { buildCrumbs } from "@/components/breadcrumbs-utils";
import { allEntries } from "@/site/content";
import { getValidRoutePaths } from "@/site/route-inventory";

describe("buildCrumbs", () => {
  it("returns empty array for root", () => {
    expect(buildCrumbs("/")).toEqual([]);
  });

  it("prepends Home and labels each crumb from the route table", () => {
    const crumbs = buildCrumbs("/compare/alternatives");
    expect(crumbs).toEqual([
      { label: "Home", to: "/" },
      { label: "Compare period trackers", to: "/compare" },
      { label: "Private alternatives", to: "/compare/alternatives" },
    ]);
  });

  it("applies overrides on the matching path", () => {
    const crumbs = buildCrumbs("/compare/alternatives/flo-app-alternative", {
      "/compare/alternatives/flo-app-alternative": "Flo app alternative",
    });
    expect(crumbs.at(-1)).toEqual({
      label: "Flo app alternative",
      to: "/compare/alternatives/flo-app-alternative",
    });
  });

  it("skips URL segments that are not routes", () => {
    // `/tools` is not in router.tsx. The old string-splitting emitted it as a
    // link on all 13 quiz pages, where it rendered the 404 page.
    const crumbs = buildCrumbs("/tools/quiz/is-my-period-app-asking-too-much-quiz");
    expect(crumbs.map((crumb) => crumb.to)).toEqual([
      "/",
      "/tools/quiz",
      "/tools/quiz/is-my-period-app-asking-too-much-quiz",
    ]);
  });

  it("never links a crumb to a path that is not a real route", () => {
    const validPaths = getValidRoutePaths();
    const samplePaths = [
      ...new Set(allEntries.map((entry) => entry.routePath)),
      "/compare",
      "/resources",
      "/tools/quiz",
      "/period-tracker-privacy",
      "/free",
    ];

    for (const path of samplePaths) {
      for (const crumb of buildCrumbs(path)) {
        // The leaf is the current page and is not rendered as a link.
        if (crumb.to === path) continue;
        expect(validPaths.has(crumb.to), `${path} → dead crumb ${crumb.to}`).toBe(true);
      }
    }
  });
});
