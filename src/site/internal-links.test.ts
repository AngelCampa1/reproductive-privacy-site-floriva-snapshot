import { describe, expect, it } from "vitest";
import { allEntries, getEntryByCollectionSlug } from "@/site/content";
import {
  buildResourcesMegamenuGroups,
  buildHubNextStepLinks,
  buildContentNextStepLinks,
  resolveFunnelAwareRelatedEntries,
} from "@/site/internal-links";
import { pillarHubDefinitions } from "@/site/pillar-hubs";
import { getValidRoutePaths, normalizeSitePath } from "@/site/route-inventory";

describe("funnel-aware internal links", () => {
  it("supplements sparse related pages with valid entries", () => {
    const entry = getEntryByCollectionSlug("comparisons", "stardust-vs-clue");

    expect(entry).not.toBeNull();

    const related = resolveFunnelAwareRelatedEntries(entry!);

    expect(related.length).toBeGreaterThanOrEqual(3);
    expect(related.every((relatedEntry) => relatedEntry.routePath !== entry!.routePath)).toBe(true);
  });

  it("keeps supplemental related links resolvable for every content page", () => {
    const broken = allEntries.flatMap((entry) =>
      resolveFunnelAwareRelatedEntries(entry).map((relatedEntry) => ({
        from: entry.routePath,
        to: relatedEntry.routePath,
      })),
    ).filter((link) => !allEntries.some((entry) => entry.routePath === link.to));

    expect(broken).toEqual([]);
  });

  it("keeps authored related pages complete, resolvable, and non-self-referential", () => {
    const validRoutes = getValidRoutePaths();
    const errors: string[] = [];

    for (const entry of allEntries) {
      if (entry.relatedPages.length < 3) {
        errors.push(`${entry.routePath}: expected at least 3 relatedPages, found ${entry.relatedPages.length}`);
      }

      for (const href of entry.relatedPages) {
        const normalizedHref = normalizeSitePath(href);
        if (normalizedHref === normalizeSitePath(entry.routePath)) {
          errors.push(`${entry.routePath}: relatedPages must not self-link ${href}`);
        }
        if (!validRoutes.has(normalizedHref)) {
          errors.push(`${entry.routePath}: relatedPages target is not a valid route ${href}`);
        }
      }
    }

    expect(errors).toEqual([]);
  });

  it("keeps every content and hub next-step link resolvable and non-self-referential", () => {
    const validRoutes = getValidRoutePaths();
    const errors: string[] = [];

    for (const entry of allEntries) {
      const nextSteps = buildContentNextStepLinks(entry);
      if (nextSteps.length < 3) {
        errors.push(`${entry.routePath}: expected at least 3 content next steps, found ${nextSteps.length}`);
      }

      for (const link of nextSteps) {
        const normalizedHref = normalizeSitePath(link.href);
        if (normalizedHref === normalizeSitePath(entry.routePath)) {
          errors.push(`${entry.routePath}: content next step self-links to ${link.href}`);
        }
        if (!validRoutes.has(normalizedHref)) {
          errors.push(`${entry.routePath}: content next step target is not a valid route ${link.href}`);
        }
      }
    }

    for (const hub of pillarHubDefinitions) {
      const nextSteps = buildHubNextStepLinks(hub.collections, hub.path);
      if (nextSteps.length < 3) {
        errors.push(`${hub.path}: expected at least 3 hub next steps, found ${nextSteps.length}`);
      }
      for (const link of nextSteps) {
        const normalizedHref = normalizeSitePath(link.href);
        if (normalizedHref === normalizeSitePath(hub.path)) {
          errors.push(`${hub.path}: hub next step self-links to ${link.href}`);
        }
        if (!validRoutes.has(normalizedHref)) {
          errors.push(`${hub.path}: hub next step target is not a valid route ${link.href}`);
        }
      }
    }

    expect(errors).toEqual([]);
  });

  it("routes privacy-in-practice pages to practical privacy next steps", () => {
    const entry = getEntryByCollectionSlug("privacy-in-practice", "reset-ad-id-after-period-apps");

    expect(entry).not.toBeNull();
    expect(buildContentNextStepLinks(entry!)).toEqual([
      { label: "Audit your current app", href: "/free/period-app-privacy-audit-kit" },
      { label: "Reduce the data you save", href: "/resources/guides/period-tracker-data-minimization-guide" },
      { label: "Lock down your phone", href: "/resources/privacy-in-practice/lock-down-period-data-on-your-phone" },
    ]);
  });

  it("routes health collections to pattern-tracking next steps", () => {
    const entry = getEntryByCollectionSlug("symptom-guides", "cramps-but-no-period");

    expect(entry).not.toBeNull();
    expect(buildContentNextStepLinks(entry!)).toEqual([
      { label: "Prepare for a visit with Floriva", href: "/app-guides/floriva-for-gynecologist-prep" },
      { label: "Browse health tracking guides", href: "/resources/health" },
      { label: "Keep notes private", href: "/resources/guides/period-tracker-data-minimization-guide" },
    ]);
  });

  it("routes app guides to setup and conversion next steps", () => {
    const entry = getEntryByCollectionSlug("app-guides", "floriva-for-teens");

    expect(entry).not.toBeNull();
    expect(buildContentNextStepLinks(entry!)).toEqual([
      { label: "See Floriva privacy features", href: "/privacy-features" },
      { label: "Compare pricing", href: "/compare/pricing" },
      { label: "Browse free tools", href: "/free" },
    ]);
  });
});

describe("resources megamenu", () => {
  it("links only to pillar hubs and collection hubs", () => {
    const groups = buildResourcesMegamenuGroups();
    const menuLinks = new Set(groups.flatMap((group) => group.links.map((link) => link.href)));
    const allowedHubLinks = new Set([
      ...pillarHubDefinitions.map((hub) => hub.path),
      "/resources",
      "/compare/alternatives",
      "/compare/versus",
      "/compare/pricing",
      "/resources/best",
      "/resources/symptom-guides",
      "/resources/condition-guides",
      "/resources/hormone-guides",
      "/resources/life-stage-guides",
      "/resources/privacy-in-practice",
      "/resources/wellness-guides",
    ]);

    expect(menuLinks.size).toBeGreaterThan(0);
    for (const href of menuLinks) {
      expect(allowedHubLinks.has(href)).toBe(true);
    }
  });

  it("does not expose generated content pages directly", () => {
    const groups = buildResourcesMegamenuGroups();
    const menuLinks = new Set(groups.flatMap((group) => group.links.map((link) => link.href)));

    for (const entry of allEntries) {
      expect(menuLinks.has(entry.routePath)).toBe(false);
    }
  });

  it("attaches every generated content page to at least one pillar or collection hub", () => {
    const attachedCollections = new Set(pillarHubDefinitions.flatMap((hub) => hub.collections));

    for (const entry of allEntries) {
      expect(attachedCollections.has(entry.collection)).toBe(true);
    }
  });
});
