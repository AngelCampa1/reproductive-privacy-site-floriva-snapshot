import { describe, expect, it } from "vitest";
import {
  allEntries,
  getEntriesByCollection,
  getEntryByCollectionSlug,
  getEntryByPath,
  resolveRelatedEntries,
  searchEntries,
} from "@/site/content";
import { contentEntries as fullContentEntries } from "@/site/generated/content-data";

const fullBodyById = new Map(
  (fullContentEntries as unknown as Array<{ id: string; body: string }>).map((e) => [e.id, e.body]),
);

describe("content loader", () => {
  it("imports the full source corpus", () => {
    expect(allEntries.length).toBeGreaterThan(140);
  });

  it("normalizes mixed answer shapes into question and answer fields", () => {
    const guide = getEntryByCollectionSlug("guides", "period-tracking-legal-safety-guide");

    expect(guide).not.toBeNull();
    expect(guide?.answers.length).toBeGreaterThan(0);
    expect(guide?.answers.every((answer) => answer.question.length > 0 && answer.answer.length > 0)).toBe(true);
  });

  it("keeps state-page metadata available for specialized rendering", () => {
    const california = getEntryByCollectionSlug(
      "reproductive-privacy-state-pages",
      "reproductive-data-privacy-laws-california",
    );

    expect(california?.state).toBe("California");
    expect(california?.relevantLaws.length).toBeGreaterThan(0);
  });

  it("keeps every state page structured legal payload intact", () => {
    const incompleteStatePages = getEntriesByCollection("reproductive-privacy-state-pages")
      .filter((entry) => entry.relevantLaws.length === 0 || entry.keyFacts.length === 0)
      .map((entry) => entry.routePath);

    expect(incompleteStatePages).toEqual([]);
  });

  it("keeps every ranked list tools payload intact", () => {
    const listiclesWithoutTools = getEntriesByCollection("listicles")
      .filter((entry) => entry.tools.length === 0)
      .map((entry) => entry.routePath);

    expect(listiclesWithoutTools).toEqual([]);
  });

  it("keeps every pricing page structured pricing payload intact", () => {
    const incompletePricingPages = getEntriesByCollection("pricing-breakdowns")
      .filter((entry) => entry.slug !== "floriva-pricing-and-value")
      .filter((entry) => !entry.slug.startsWith("what-does-free-period-tracker-cost"))
      .filter((entry) => entry.tiers.length === 0 || entry.hiddenCosts.length === 0 || !entry.tableData)
      .map((entry) => entry.routePath);

    expect(incompletePricingPages).toEqual([]);
  });

  it("keeps claim-heavy pricing pages backed by pricing stats", () => {
    const claimHeavyPricingPagesWithoutStats = getEntriesByCollection("pricing-breakdowns")
      .filter((entry) => !["floriva-pricing-and-value", "natural-cycles-pricing-review", "stardust-period-app-pricing"].includes(entry.slug))
      .filter((entry) => !entry.slug.startsWith("what-does-free-period-tracker-cost"))
      .filter((entry) => /\b(FTC|settlement|lawsuit|CIPA|Meta|Facebook|Google|subpoena|HIPAA)\b/i.test([
        entry.title,
        entry.description,
        fullBodyById.get(entry.id) ?? "",
      ].join(" ")))
      .filter((entry) => entry.pricingStats.length === 0)
      .map((entry) => entry.routePath);

    expect(claimHeavyPricingPagesWithoutStats).toEqual([]);
  });

  it("does not conflate the Flo FTC order with the 2025 class action settlement", () => {
    const privacyGuide = getEntryByCollectionSlug("lead-magnets", "privacy-guide");
    const text = [
      privacyGuide ? (fullBodyById.get(privacyGuide.id) ?? "") : "",
      ...(privacyGuide?.answers.map((answer) => answer.answer) ?? []),
    ].join(" ");

    expect(text).not.toMatch(/FTC (?:settled with Flo|enforcement action against Flo \(settled for \$59\.5M in 2025\))/i);
    expect(text).not.toContain("What the settlement requires");
    expect(text).toContain("FTC's 2021 enforcement action");
    expect(text).toContain("What the consent order requires");
    expect(text).toContain("combined class action settlement against Flo, Google, and Flurry reached $59.5 million in September 2025");
  });

  it("resolves related page links into actual entries", () => {
    const alternative = getEntryByCollectionSlug("alternatives", "flo-app-alternative");

    expect(alternative).not.toBeNull();
    expect(resolveRelatedEntries(alternative!).length).toBeGreaterThan(0);
  });

  it("normalizes trailing slashes when resolving related page links", () => {
    expect(getEntryByPath("/compare/alternatives/flo-app-alternative/")?.slug).toBe(
      "flo-app-alternative",
    );
  });

  it("resolves every imported related page after normalization", () => {
    const unresolvedRelatedPages = allEntries.flatMap((entry) =>
      entry.relatedPages
        .filter((relatedPath) => getEntryByPath(relatedPath) === null)
        .map((relatedPath) => ({ from: entry.routePath, relatedPath })),
    );

    expect(unresolvedRelatedPages).toEqual([]);
  });

  it("supports hub search over imported entries", () => {
    const results = searchEntries(getEntriesByCollection("guides"), "zero knowledge");

    expect(results.some((entry) => entry.slug === "what-is-zero-knowledge-period-tracker")).toBe(true);
  });
});
