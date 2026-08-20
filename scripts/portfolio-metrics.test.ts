import { execFileSync } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { beforeAll, describe, expect, it } from "vitest";

/**
 * The metrics script is the source of truth for every number in the README, so
 * a misclassification here silently overstates the work. The rules that matter
 * are the ordering ones: generated code must never be counted as hand-written,
 * and a test must be counted once, as a test.
 *
 * Both fixtures are gathered in beforeAll. Spawning the script per assertion
 * meant a dozen subprocesses each re-running `git ls-files` and re-reading the
 * tree, which starved the slower suites when the whole run happens in parallel.
 */

const rootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const script = path.join(rootDir, "scripts/portfolio-metrics.mjs");

function run(args: string[]): string {
  return execFileSync(process.execPath, [script, ...args], {
    cwd: rootDir,
    encoding: "utf8",
    windowsHide: true,
    maxBuffer: 64 * 1024 * 1024,
  });
}

let buckets: Record<string, string[]>;
let report: {
  trackedFiles: number;
  rev: string;
  code: Record<string, { files: number; lines: number }>;
  coverage: { measured: boolean; reason?: string; rev?: string; lines?: { total: number } };
};

beforeAll(() => {
  buckets = JSON.parse(run(["--list-all"]));
  report = JSON.parse(run(["--json"]));
});

describe("portfolio metrics classifier", () => {
  it("keeps generated modules out of hand-written application source", () => {
    expect(buckets.appSource).not.toContain("src/site/generated/content-data.ts");
    expect(buckets.appSource).not.toContain("src/site/content-manifest.ts");
    expect(buckets.appSource.filter((file) => file.startsWith("src/site/generated/"))).toEqual([]);

    expect(buckets.generated).toContain("src/site/generated/content-data.ts");
    expect(buckets.generated).toContain("src/site/content-manifest.ts");
  });

  it("counts a test as a test rather than as source or tooling", () => {
    expect(buckets.tests).toContain("src/site/route-inventory.test.ts");
    expect(buckets.tests).toContain("scripts/claim-remediation.test.ts");
    expect(buckets.tests).toContain("scripts/verify-linkedin-posts.test.mjs");

    expect(buckets.appSource).not.toContain("src/site/route-inventory.test.ts");
    expect(buckets.tooling).not.toContain("scripts/claim-remediation.test.ts");
  });

  it("files real application source, tooling, and content into their own buckets", () => {
    expect(buckets.appSource).toContain("src/site/route-inventory.ts");
    expect(buckets.appSource).toContain("functions/_middleware.ts");
    expect(buckets.appSource).toContain("src/main.tsx");
    expect(buckets.tooling).toContain("scripts/prerender-html.mjs");
    expect(buckets.styles).toContain("src/styles/tokens.css");
    expect(buckets.contentMdx.every((file) => file.startsWith("content/"))).toBe(true);
  });

  it("assigns every tracked file to exactly one bucket", () => {
    const assigned = Object.values(report.code).reduce((sum, entry) => sum + entry.files, 0);
    expect(assigned).toBe(report.trackedFiles);

    const seen = new Set<string>();
    const duplicated: string[] = [];
    for (const files of Object.values(buckets)) {
      for (const file of files) {
        if (seen.has(file)) duplicated.push(file);
        seen.add(file);
      }
    }
    expect(duplicated).toEqual([]);
    expect(seen.size).toBe(report.trackedFiles);
  });

  it("refuses to report a coverage number it did not measure", () => {
    if (report.coverage.measured) {
      expect(report.coverage.lines!.total).toBeGreaterThan(0);
      expect(report.coverage.rev).toBe(report.rev);
    } else {
      expect(report.coverage.reason).toBeTruthy();
      expect(report.coverage).not.toHaveProperty("lines");
    }
  });
});
