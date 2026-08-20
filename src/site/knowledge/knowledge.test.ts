import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { getAllSiteRoutes, normalizeSitePath } from "@/site/route-inventory";
import { storeTargets } from "@/site/store-targets";
import {
  florivaKnowledge,
  knowledgeEntries,
  toPublicKnowledgeArtifact,
  type StaticKnowledgeSection,
} from "@/site/knowledge";

const rootDir = process.cwd();

type SensitiveFinding = {
  path: string;
  pattern: string;
  value: string;
};

const forbiddenPublicKnowledgePatterns = [
  /PostHog/i,
  /Sentry/i,
  /FLORIVA_/i,
  /VITE_/i,
  /process\.env/i,
  /import\.meta\.env/i,
  /\.env/i,
  /\bDSN\b/i,
  /API[_-]?KEY/i,
  /\bTOKEN\b/i,
  /\bPASSWORD\b/i,
  /\bSECRET\b/i,
  /PRIVATE[_-]?KEY/i,
  /QA credential/i,
  /prod test/i,
  /internal strategy/i,
  /unpublished roadmap/i,
  /private ops/i,
  /operational note/i,
  /popupStorageKeys/i,
  /floriva-lead-magnet/i,
  /docs\/research/i,
  /content\//i,
  /\.mdx/i,
  /campaignName/i,
  /crosswalk/i,
  /X hourly/i,
] as const;

function collectSensitiveFindings(value: unknown, currentPath = "$"): SensitiveFinding[] {
  const findings: SensitiveFinding[] = [];

  if (typeof value === "string") {
    for (const pattern of forbiddenPublicKnowledgePatterns) {
      if (pattern.test(value)) {
        findings.push({
          path: currentPath,
          pattern: pattern.source,
          value,
        });
      }
    }
    return findings;
  }

  if (Array.isArray(value)) {
    return value.flatMap((item, index) => collectSensitiveFindings(item, `${currentPath}[${index}]`));
  }

  if (value && typeof value === "object") {
    for (const [key, child] of Object.entries(value)) {
      for (const pattern of forbiddenPublicKnowledgePatterns) {
        if (pattern.test(key)) {
          findings.push({
            path: `${currentPath}.${key}`,
            pattern: pattern.source,
            value: key,
          });
        }
      }
      findings.push(...collectSensitiveFindings(child, `${currentPath}.${key}`));
    }
  }

  return findings;
}

function expectPublicRoute(value: string, context: string) {
  expect(value, context).toMatch(/^\//);
  expect(value, context).not.toMatch(/^(docs|scripts|functions|workers|src|social)\//i);
}

describe("Floriva public knowledge", () => {
  it("defines a public-safe canonical knowledge graph with unique, complete entries", () => {
    const ids = new Set<string>();

    for (const entry of knowledgeEntries) {
      expect(entry.publicSafe, entry.id).toBe(true);
      expect(ids.has(entry.id), entry.id).toBe(false);
      ids.add(entry.id);
      expect(entry.domain.trim(), entry.id).toBeTruthy();
      expect(entry.title.trim(), entry.id).toBeTruthy();
      expect(entry.summary.trim(), entry.id).toBeTruthy();
      expect(entry.details.length, entry.id).toBeGreaterThan(0);
      expect(entry.topics.length, entry.id).toBeGreaterThan(0);
      expect(entry.audience.length, entry.id).toBeGreaterThan(0);
      expect(entry.sourceRoutes.length, entry.id).toBeGreaterThan(0);
      expect(["sales", "help", "both"], entry.id).toContain(entry.botUse);
    }
  });

  it("serializes to generated JSON without internal markers", () => {
    const artifact = toPublicKnowledgeArtifact();
    const serialized = JSON.stringify(artifact);

    expect(() => JSON.parse(serialized)).not.toThrow();
    expect(serialized).toContain("Track your cycle without the cloud.");

    const findings = collectSensitiveFindings(artifact);
    expect(findings).toEqual([]);
  });

  it("exposes the required public canon sections", () => {
    const artifact = toPublicKnowledgeArtifact();

    for (const key of [
      "brand",
      "seo",
      "hubs",
      "navigation",
      "ctas",
      "leadMagnetUi",
      "emails",
      "pdfBoilerplate",
      "stateRiskTiers",
      "socialCampaign",
      "storePresentation",
      "rules",
    ] as const) {
      expect(artifact[key], key).toBeTruthy();
    }

    for (const bank of Object.values(artifact.socialCampaign.atomBanks)) {
      for (const atom of bank) {
        expect(atom.id).toMatch(/^social-/);
        expect(atom.publicSafe).toBe(true);
        expect(atom.sourceRoutes.length).toBeGreaterThan(0);
        expect(atom.freshness.length).toBeGreaterThan(0);
        expect("source" in atom).toBe(false);
      }
    }
  });

  it("exports only public route references", () => {
    const artifact = toPublicKnowledgeArtifact();

    for (const entry of artifact.entries) {
      for (const route of entry.sourceRoutes) {
        expectPublicRoute(route, `${entry.id}:source:${route}`);
      }

      for (const action of entry.suggestedActions) {
        if (action.kind === "route") {
          expectPublicRoute(action.target, `${entry.id}:action:${action.target}`);
        }
      }
    }

    for (const bank of Object.values(artifact.socialCampaign.atomBanks)) {
      for (const atom of bank) {
        for (const route of atom.sourceRoutes) {
          expectPublicRoute(route, `${atom.id}:source:${route}`);
        }
      }
    }
  });

  it("references only configured site routes or store targets", () => {
    const validRoutes = new Set(getAllSiteRoutes().map((route) => route.path));
    const validStoreTargets = new Set(Object.keys(storeTargets));
    const brokenReferences: string[] = [];

    for (const entry of knowledgeEntries) {
      for (const route of entry.sourceRoutes) {
        if (!validRoutes.has(normalizeSitePath(route))) {
          brokenReferences.push(`${entry.id}:source:${route}`);
        }
      }

      for (const action of entry.suggestedActions) {
        if (action.kind === "route" && !validRoutes.has(normalizeSitePath(action.target))) {
          brokenReferences.push(`${entry.id}:action:${action.target}`);
        }
        if (action.kind === "store" && !validStoreTargets.has(action.target)) {
          brokenReferences.push(`${entry.id}:store:${action.target}`);
        }
      }
    }

    expect(brokenReferences).toEqual([]);
  });

  it("keeps page and email consumers pointed at the canonical knowledge source", () => {
    expect(florivaKnowledge.marketing.homepage.tagline).toBe(
      "Track your cycle without the cloud.",
    );
    expect(florivaKnowledge.app.capabilities.coreStorage.publicLine).toBe(
      "Core cycle records stay on the user's device. Floriva has no readable central cycle database.",
    );
    expect(florivaKnowledge.app.capabilities.sync.publicLine).toContain(
      "Encrypted cross-device sync is optional.",
    );
    expect(florivaKnowledge.app.capabilities.imports.publicLine).toContain(
      "check Floriva onboarding",
    );
    expect(florivaKnowledge.staticPages.get.sections[0].body).toContain(
      "Floriva is a paid app",
    );
    expect(florivaKnowledge.emails.leadMagnets[0].sequence[0].subject).toBe(
      "Audit your tracker in 90 seconds",
    );
  });

  it("has unique lead-magnet slugs", () => {
    const slugs = florivaKnowledge.emails.leadMagnets.map((r) => r.slug);
    expect(new Set(slugs).size).toBe(slugs.length);
  });

  it("keeps the committed JSON artifact in sync with the public knowledge export", () => {
    const artifactPath = path.join(rootDir, "src", "site", "generated", "public-knowledge.json");
    const artifact = JSON.parse(readFileSync(artifactPath, "utf8"));
    expect(artifact).toEqual(toPublicKnowledgeArtifact());
  });

  it("publishes a plain editorial method on the support page", () => {
    const sections: readonly StaticKnowledgeSection[] =
      florivaKnowledge.staticPages.support.sections;
    const method = sections.find(
      (section) => section.id === "editorial-method",
    );

    expect(method?.heading).toBe("How we check our guides");
    expect(method?.body).toContain("We check facts before we publish");
  });
});
