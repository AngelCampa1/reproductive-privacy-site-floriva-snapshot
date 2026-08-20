import { existsSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import {
  getLeadMagnetResource,
  leadMagnetResources,
  selectLeadMagnetForPath,
} from "@/site/lead-magnets";
import { getEntriesByCollection } from "@/site/content";
import { getValidRoutePaths, normalizeSitePath } from "@/site/route-inventory";

const projectRoot = process.cwd();

describe("lead magnet resources", () => {
  it("maps high-intent paths to the most relevant resource", () => {
    expect(selectLeadMagnetForPath("/compare/alternatives/flo-app-alternative").slug).toBe(
      "flo-to-floriva-switcher-guide",
    );
    expect(selectLeadMagnetForPath("/resources/guides/delete-flo-account-keep-data").slug).toBe(
      "data-deletion-request-guide",
    );
    expect(selectLeadMagnetForPath("/period-tracker-privacy/reproductive-data-privacy-laws-texas").slug).toBe(
      "texas-louisiana-scorecard-bundle",
    );
    expect(selectLeadMagnetForPath("/period-tracker-privacy/reproductive-data-privacy-laws-florida").slug).toBe(
      "florida-georgia-scorecard-bundle",
    );
    expect(selectLeadMagnetForPath("/period-tracker-privacy/reproductive-data-privacy-laws-california").slug).toBe(
      "state-risk-scorecard",
    );
    expect(selectLeadMagnetForPath("/resources/condition-guides/pcos-period-irregularity-tracking").slug).toBe(
      "pcos-symptom-tracker",
    );
    expect(selectLeadMagnetForPath("/resources/condition-guides/intense-period-pain-vs-endometriosis").slug).toBe(
      "endometriosis-pain-diary",
    );
    expect(selectLeadMagnetForPath("/resources/best/best-period-tracker-for-teens").slug).toBe(
      "cycle-tracking-starter-kit-teens",
    );
    expect(selectLeadMagnetForPath("/resources/life-stage-guides/postpartum-period-return").slug).toBe(
      "postpartum-period-return-tracker",
    );
    expect(selectLeadMagnetForPath("/resources/guides/fertility-awareness-method-complete-guide").slug).toBe(
      "fertility-awareness-method-chart",
    );
  });

  it("falls back to the privacy audit checklist for general pages", () => {
    expect(selectLeadMagnetForPath("/resources/guides/period-tracker-hipaa").slug).toBe(
      "period-app-privacy-audit-checklist",
    );
  });

  it("returns null for unknown resources", () => {
    expect(getLeadMagnetResource("missing-resource")).toBeNull();
  });

  it("defines canonical R2 resources and full mini-course sequences for every promoted download", () => {
    const validRoutes = getValidRoutePaths();
    const invalidCtaPaths: string[] = [];

    for (const resource of leadMagnetResources) {
      expect(resource.r2Key, resource.slug).toBe(`lead-magnets/${resource.slug}.pdf`);
      expect(resource.downloadFileName, resource.slug).toBe(`${resource.slug}.pdf`);
      expect(resource.routePath, resource.slug).toBe(`/free/${resource.slug}`);
      expect(resource.title.trim().length, resource.slug).toBeGreaterThan(0);

      const steps = resource.sequence.map((email) => email.step);

      expect(steps, resource.slug).toEqual([2, 3, 4, 5, 6, 7, 8]);
      for (const email of resource.sequence) {
        expect(email.subject.trim().length, `${resource.slug}:${email.step}:subject`).toBeGreaterThan(10);
        expect(email.preview.trim().length, `${resource.slug}:${email.step}:preview`).toBeGreaterThan(20);
        expect(email.opening.trim().length, `${resource.slug}:${email.step}:opening`).toBeGreaterThan(40);
        const bodyChars =
          email.opening.trim().length +
          (email.body?.trim().length ?? 0) +
          (email.bullets?.reduce((acc, line) => acc + line.trim().length, 0) ?? 0);
        expect(bodyChars, `${resource.slug}:${email.step}:total-body`).toBeGreaterThan(80);
        expect(email.ctaLabel.trim().length, `${resource.slug}:${email.step}:ctaLabel`).toBeGreaterThan(3);
        expect(email.ctaPath.startsWith("/"), `${resource.slug}:${email.step}:ctaPath`).toBe(true);
        expect(email.ctaPath, `${resource.slug}:${email.step}:ctaPath`).not.toBe("/api/store/ios");
        if (!validRoutes.has(normalizeSitePath(email.ctaPath))) {
          invalidCtaPaths.push(`${resource.slug}:${email.step}:${email.ctaPath}`);
        }
      }
    }

    expect(invalidCtaPaths).toEqual([]);
  });

  it("routes every lead-magnet content page to a resolvable catalog resource", () => {
    // Mirrors the resolution the inline capture form uses in content-page.tsx. The slug the form
    // posts must be accepted by getLeadMagnetResource (what functions/api/lead-magnet/subscribe.ts
    // calls); otherwise the survivor page 400s with "Unknown resource" and no email is ever sent.
    const entries = getEntriesByCollection("lead-magnets");
    expect(entries.length).toBeGreaterThan(0);

    const unroutable: string[] = [];
    for (const entry of entries) {
      const submittedSlug =
        getLeadMagnetResource(entry.slug)?.slug ?? selectLeadMagnetForPath(entry.routePath).slug;
      const resolved = getLeadMagnetResource(submittedSlug);
      if (!resolved || resolved.r2Key !== `lead-magnets/${resolved.slug}.pdf`) {
        unroutable.push(`${entry.slug} -> ${submittedSlug}`);
      }
    }

    expect(unroutable).toEqual([]);
  });

  it("does not expose lead magnet PDFs as public static assets", () => {
    expect(existsSync(path.join(projectRoot, "public", "downloads", "lead-magnets"))).toBe(false);
  });
});
