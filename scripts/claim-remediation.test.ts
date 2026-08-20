import { createHash } from "node:crypto";
import { execFile, execFileSync } from "node:child_process";
import { promises as fs } from "node:fs";
import os from "node:os";
import path from "node:path";
import { promisify } from "node:util";
import matter from "gray-matter";
import remarkGfm from "remark-gfm";
import remarkParse from "remark-parse";
import { unified } from "unified";
import { describe, expect, it } from "vitest";
import {
  assertBaselineTotals,
  createBaselineRows,
  freezeClaimsBaseline,
  publishImmutableFiles,
} from "./freeze-claims-baseline.mjs";
import { createBaselineId, normalizeClaimText } from "./lib/claim-identity.mjs";
import {
  validateChangedPaths,
  verifyManifestEntries,
  writeContentBatchManifest,
} from "./write-content-batch-manifest.mjs";

const sha256 = (value: string) => createHash("sha256").update(value).digest("hex");
const execFileAsync = promisify(execFile);

async function git(rootDir: string, args: string[]) {
  const { stdout } = await execFileAsync("git", args, { cwd: rootDir, encoding: "utf8" });
  return stdout.trim();
}

async function createGitRepository(prefix = "floriva-git-") {
  const rootDir = await fs.mkdtemp(path.join(os.tmpdir(), prefix));
  await git(rootDir, ["init", "--quiet"]);
  await git(rootDir, ["config", "user.email", "claims-test@floriva.invalid"]);
  await git(rootDir, ["config", "user.name", "Claims Test"]);
  await fs.writeFile(path.join(rootDir, "seed.txt"), "seed\n");
  await git(rootDir, ["add", "seed.txt"]);
  await git(rootDir, ["commit", "--quiet", "-m", "seed"]);
  return rootDir;
}

function injectSecondTemporaryFileFailure(phase: "write" | "sync" | "close" | "lstat") {
  let openCount = 0;
  let tempLstatCount = 0;
  let injected = false;
  const failOnce = async (name: string, operation: () => Promise<unknown>) => {
    if (!injected && phase === name) {
      injected = true;
      throw new Error(`injected temporary ${name} failure`);
    }
    return operation();
  };

  return {
    open: async (...args: Parameters<typeof fs.open>) => {
      const handle = await fs.open(...args);
      openCount += 1;
      if (openCount !== 2) return handle;
      return {
        writeFile: (...writeArgs: Parameters<typeof handle.writeFile>) => failOnce("write", () => handle.writeFile(...writeArgs)),
        sync: () => failOnce("sync", () => handle.sync()),
        close: () => failOnce("close", () => handle.close()),
      };
    },
    lstat: async (...args: Parameters<typeof fs.lstat>) => {
      const candidate = String(args[0]);
      if (path.basename(candidate).startsWith(".") && candidate.endsWith(".tmp")) {
        tempLstatCount += 1;
        if (tempLstatCount === 2) return failOnce("lstat", () => fs.lstat(...args));
      }
      return fs.lstat(...args);
    },
    link: (...args: Parameters<typeof fs.link>) => fs.link(...args),
    unlink: (...args: Parameters<typeof fs.unlink>) => fs.unlink(...args),
  };
}

function csvRecordCount(value: string) {
  let records = 0;
  let quoted = false;
  for (let index = 0; index < value.length; index += 1) {
    if (value[index] === '"') {
      if (quoted && value[index + 1] === '"') index += 1;
      else quoted = !quoted;
    } else if (value[index] === "\n" && !quoted) {
      records += 1;
    }
  }
  expect(quoted).toBe(false);
  return records;
}

describe("claim identity", () => {
  it("uses the full frozen claim, AST/field locator, and original source hash for baseline identity", () => {
    expect(normalizeClaimText("  FTC   Action ")).toBe("ftc action");
    const sourceFileHash = "a".repeat(64);
    const first = createBaselineId({ file: "content/guides/a.mdx", baselineLocator: "body:root.children[0].sentence[0]", patternId: "ftc", sourceFileHash, claimText: "The FTC acted in 2021." });
    const repeated = createBaselineId({ file: "content/guides/a.mdx", baselineLocator: "body:root.children[0].sentence[0]", patternId: "ftc", sourceFileHash, claimText: "the  ftc acted in 2021." });
    const otherSentence = createBaselineId({ file: "content/guides/a.mdx", baselineLocator: "body:root.children[1].sentence[0]", patternId: "ftc", sourceFileHash, claimText: "The FTC acted in 2021." });
    const otherFrozenFile = createBaselineId({ file: "content/guides/a.mdx", baselineLocator: "body:root.children[0].sentence[0]", patternId: "ftc", sourceFileHash: "b".repeat(64), claimText: "The FTC acted in 2021." });
    expect(first).toBe(repeated);
    expect(first).not.toBe(otherSentence);
    expect(first).not.toBe(otherFrozenFile);
  });

  it("keeps patternId in identity so all 1,010 frozen rule findings remain distinct", () => {
    const identity = { file: "content/guides/a.mdx", baselineLocator: "body:root.children[0].sentence[0]", sourceFileHash: "a".repeat(64), claimText: "The FTC acted in 2021." };
    expect(createBaselineId({ ...identity, patternId: "ftc" })).not.toBe(createBaselineId({ ...identity, patternId: "year" }));
  });

  it("rejects NTFS alternate data stream syntax in identity file paths", () => {
    expect(() => createBaselineId({
      file: "content/guides/safe.mdx:stream",
      baselineLocator: "body:root.children[0].sentence[0]",
      patternId: "ftc",
      sourceFileHash: "a".repeat(64),
      claimText: "The FTC acted.",
    })).toThrow(/invalid repository path/i);
  });
});

describe("claim baseline freezer", () => {
  it("expands a scanner token to its complete frozen sentence and stable AST sentence locator", async () => {
    const rootDir = await fs.mkdtemp(path.join(os.tmpdir(), "floriva-claims-"));
    const relativeFile = "content/guides/a.mdx";
    const rawSource = `---\ntitle: Example\n---\n# Evidence\n\nThe FTC acted in 2021. A second sentence names 3 states.\n`;
    await fs.mkdir(path.join(rootDir, "content/guides"), { recursive: true });
    await fs.writeFile(path.join(rootDir, relativeFile), rawSource);

    const rows = await createBaselineRows({
      rootDir,
      scannerSource: "const CLAIM_PATTERNS = ['ftc'];",
      findings: [{
        file: relativeFile,
        line: 3,
        column: 5,
        pattern: "ftc",
        claimText: "FTC",
        riskTier: "HIGH",
      }],
    });

    expect(rows).toHaveLength(1);
    expect(rows[0]).toMatchObject({
      file: relativeFile,
      patternId: "ftc",
      riskTier: "HIGH",
      originalText: "The FTC acted in 2021.",
      baselineLocator: "body:root.children[1].sentence[0]",
      sourceFileHash: sha256(rawSource),
    });
    expect(rows[0].normalizedTextHash).toBe(sha256("the ftc acted in 2021."));
    expect(rows[0].baselineContextHash).toMatch(/^[a-f0-9]{64}$/);
    expect(rows[0].scannerConfigHash).toBe(sha256("const CLAIM_PATTERNS = ['ftc'];"));
  });

  it("rejects a row when sentence expansion leaves only the scanner token", async () => {
    const rootDir = await fs.mkdtemp(path.join(os.tmpdir(), "floriva-claims-token-"));
    const relativeFile = "content/guides/token.mdx";
    await fs.mkdir(path.join(rootDir, "content/guides"), { recursive: true });
    await fs.writeFile(path.join(rootDir, relativeFile), "---\ntitle: Token\n---\nFTC\n");

    await expect(createBaselineRows({
      rootDir,
      scannerSource: "scanner",
      findings: [{ file: relativeFile, line: 1, column: 1, pattern: "ftc", claimText: "FTC", riskTier: "HIGH" }],
    })).rejects.toThrow(/only the matched token/i);
  });

  it("uses the complete table row when a structured cell is only the scanner token", async () => {
    const rootDir = await fs.mkdtemp(path.join(os.tmpdir(), "floriva-claims-table-"));
    const relativeFile = "content/pricing-breakdowns/table.mdx";
    const rawSource = `---\ntitle: Table\n---\n| Cost | Price |\n| --- | --- |\n| Monthly subscription | $0 |\n`;
    await fs.mkdir(path.join(rootDir, "content/pricing-breakdowns"), { recursive: true });
    await fs.writeFile(path.join(rootDir, relativeFile), rawSource);

    const rows = await createBaselineRows({
      rootDir,
      scannerSource: "scanner",
      findings: [{ file: relativeFile, line: 3, column: 26, pattern: "dollar", claimText: "$0 ", riskTier: "LOW" }],
    });

    expect(rows[0]).toMatchObject({
      originalText: "| Monthly subscription | $0 |",
      baselineLocator: "body:root.children[0].children[1]",
    });
  });

  it("uses real GFM AST descent for nested blockquotes and lists", async () => {
    const rootDir = await fs.mkdtemp(path.join(os.tmpdir(), "floriva-claims-ast-"));
    const relativeFile = "content/guides/nested.mdx";
    const body = "# Evidence\n\n> - First item.\n>   - The FTC acted in 2021.\n";
    await fs.mkdir(path.join(rootDir, "content/guides"), { recursive: true });
    await fs.writeFile(path.join(rootDir, relativeFile), `---\ntitle: Nested\n---\n${body}`);

    const rows = await createBaselineRows({
      rootDir,
      scannerSource: "const CLAIM_PATTERNS = [{ name: \"ftc\" }];",
      findings: [{ file: relativeFile, line: 4, column: 11, pattern: "ftc", claimText: "FTC", riskTier: "HIGH" }],
    });

    expect(rows[0]).toMatchObject({
      originalText: "The FTC acted in 2021.",
      baselineLocator: "body:root.children[1].children[0].children[0].children[1].children[0].children[0].sentence[0]",
    });
  });

  it("separates claims when the next sentence starts with a number, percent, currency, or emphasis", async () => {
    const rootDir = await fs.mkdtemp(path.join(os.tmpdir(), "floriva-claims-boundaries-"));
    const relativeFile = "content/guides/boundaries.mdx";
    const body = "The first claim ended. 87% started here. 61% followed. $10 came next. **FTC action starts here.**\n";
    await fs.mkdir(path.join(rootDir, "content/guides"), { recursive: true });
    await fs.writeFile(path.join(rootDir, relativeFile), `---\ntitle: Boundaries\n---\n${body}`);
    const finding = (claimText: string, pattern: string, riskTier: string) => ({
      file: relativeFile,
      line: 1,
      column: body.indexOf(claimText) + 1,
      pattern,
      claimText,
      riskTier,
    });

    const rows = await createBaselineRows({
      rootDir,
      scannerSource: "const CLAIM_PATTERNS = [{ name: \"percent\" }, { name: \"dollar\" }, { name: \"ftc\" }];",
      findings: [finding("87%", "percent", "HIGH"), finding("61%", "percent", "HIGH"), finding("$10", "dollar", "HIGH"), finding("FTC", "ftc", "HIGH")],
    });

    expect(rows.map((row) => row.originalText)).toEqual([
      "87% started here.",
      "61% followed.",
      "$10 came next.",
      "**FTC action starts here.**",
    ]);
  });

  it("keeps a list-marker claim in its own AST sentence", async () => {
    const rootDir = await fs.mkdtemp(path.join(os.tmpdir(), "floriva-claims-list-boundary-"));
    const relativeFile = "content/guides/list-boundary.mdx";
    await fs.mkdir(path.join(rootDir, "content/guides"), { recursive: true });
    await fs.writeFile(path.join(rootDir, relativeFile), "---\ntitle: List\n---\nPrior proposition ended.\n- 87% starts a list proposition.\n");

    const rows = await createBaselineRows({
      rootDir,
      scannerSource: "const CLAIM_PATTERNS = [{ name: \"percent\" }];",
      findings: [{ file: relativeFile, line: 2, column: 3, pattern: "percent", claimText: "87%", riskTier: "HIGH" }],
    });

    expect(rows[0].originalText).toBe("87% starts a list proposition.");
    expect(rows[0].baselineLocator).toBe("body:root.children[1].children[0].children[0].sentence[0]");
  });

  it("qualifies repeated hits from one rule within a frozen sentence without collapsing rows", async () => {
    const rootDir = await fs.mkdtemp(path.join(os.tmpdir(), "floriva-claims-repeated-"));
    const relativeFile = "content/guides/repeated.mdx";
    await fs.mkdir(path.join(rootDir, "content/guides"), { recursive: true });
    await fs.writeFile(path.join(rootDir, relativeFile), "---\ntitle: Repeated\n---\nThe FTC cited the FTC.\n");

    const rows = await createBaselineRows({
      rootDir,
      scannerSource: "scanner",
      findings: [
        { file: relativeFile, line: 1, column: 5, pattern: "ftc", claimText: "FTC", riskTier: "HIGH" },
        { file: relativeFile, line: 1, column: 19, pattern: "ftc", claimText: "FTC", riskTier: "HIGH" },
      ],
    });

    expect(rows.map((row) => row.baselineLocator)).toEqual([
      "body:root.children[0].sentence[0].occurrence[0]",
      "body:root.children[0].sentence[0].occurrence[1]",
    ]);
    expect(new Set(rows.map((row) => row.baselineId)).size).toBe(2);
  });

  it("keeps legal case abbreviations inside the complete containing sentence", async () => {
    const rootDir = await fs.mkdtemp(path.join(os.tmpdir(), "floriva-claims-case-"));
    const relativeFile = "content/guides/legal-case.mdx";
    await fs.mkdir(path.join(rootDir, "content/guides"), { recursive: true });
    await fs.writeFile(path.join(rootDir, relativeFile), "---\ntitle: Legal case\n---\nWhen Roe v. Wade changed the rule. Next sentence.\n");

    const rows = await createBaselineRows({
      rootDir,
      scannerSource: "scanner",
      findings: [{ file: relativeFile, line: 1, column: 6, pattern: "case-citation", claimText: "Roe v. Wade", riskTier: "HIGH" }],
    });

    expect(rows[0]).toMatchObject({
      originalText: "When Roe v. Wade changed the rule.",
      baselineLocator: "body:root.children[0].sentence[0]",
    });
  });

  it("keeps bill-number initialisms inside the complete containing sentence", async () => {
    const rootDir = await fs.mkdtemp(path.join(os.tmpdir(), "floriva-claims-bill-"));
    const relativeFile = "content/guides/bill.mdx";
    await fs.mkdir(path.join(rootDir, "content/guides"), { recursive: true });
    await fs.writeFile(path.join(rootDir, relativeFile), "---\ntitle: Bill\n---\n**My Body My Data Act (H.R. 3916 / S. 2029, 119th Congress):** The proposal protects records. Next sentence.\n");

    const rows = await createBaselineRows({
      rootDir,
      scannerSource: "scanner",
      findings: [{ file: relativeFile, line: 1, column: 24, pattern: "bill-number", claimText: "H.R. 3916", riskTier: "HIGH" }],
    });

    expect(rows[0]).toMatchObject({
      originalText: "**My Body My Data Act (H.R. 3916 / S. 2029, 119th Congress):** The proposal protects records.",
      baselineLocator: "body:root.children[0].sentence[0]",
    });
  });

  it("enforces the exact immutable July 22 totals", () => {
    const findings = [
      ...Array.from({ length: 641 }, () => ({ pattern: "ftc", riskTier: "HIGH" })),
      ...Array.from({ length: 98 }, () => ({ pattern: "ftc", riskTier: "MED" })),
      ...Array.from({ length: 271 }, () => ({ pattern: "ftc", riskTier: "LOW" })),
    ];
    expect(() => assertBaselineTotals({
      totalFindings: 1010,
      byRisk: { HIGH: 641, MED: 98, LOW: 271 },
      totalFiles: 535,
      findings,
    }, new Set(["ftc"]))).not.toThrow();
    expect(() => assertBaselineTotals({
      totalFindings: 1009,
      byRisk: { HIGH: 640, MED: 98, LOW: 271 },
      totalFiles: 535,
      findings,
    }, new Set(["ftc"]))).toThrow(/metadata totalFindings/i);
  });

  it("rejects invalid reports, derived-count mismatches, unknown tiers, and unknown patterns", () => {
    expect(() => assertBaselineTotals(null, new Set(["ftc"]))).toThrow(/report must be an object/i);
    expect(() => assertBaselineTotals({ totalFindings: 1010, byRisk: {}, totalFiles: 535, findings: {} }, new Set(["ftc"]))).toThrow(/findings must be an array/i);
    const valid = [
      ...Array.from({ length: 641 }, () => ({ pattern: "ftc", riskTier: "HIGH" })),
      ...Array.from({ length: 98 }, () => ({ pattern: "ftc", riskTier: "MED" })),
      ...Array.from({ length: 271 }, () => ({ pattern: "ftc", riskTier: "LOW" })),
    ];
    expect(() => assertBaselineTotals({ totalFindings: 1010, byRisk: { HIGH: 640, MED: 99, LOW: 271 }, totalFiles: 535, findings: valid }, new Set(["ftc"]))).toThrow(/metadata byRisk/i);
    expect(() => assertBaselineTotals({ totalFindings: 1010, byRisk: { HIGH: 641, MED: 98, LOW: 271, CRITICAL: 0 }, totalFiles: 535, findings: valid }, new Set(["ftc"]))).toThrow(/unknown risk tier/i);
    expect(() => assertBaselineTotals({ totalFindings: 1010, byRisk: { HIGH: 641, MED: 98, LOW: 271 }, totalFiles: 535, findings: [...valid.slice(0, -1), { pattern: "ftc", riskTier: "UNKNOWN" }] }, new Set(["ftc"]))).toThrow(/unknown risk tier/i);
    expect(() => assertBaselineTotals({ totalFindings: 1010, byRisk: { HIGH: 641, MED: 98, LOW: 271 }, totalFiles: 535, findings: [...valid.slice(0, -1), { pattern: "invented", riskTier: "LOW" }] }, new Set(["ftc"]))).toThrow(/unknown claim pattern/i);
  });

  it("refuses to overwrite any existing immutable output", async () => {
    const rootDir = await fs.mkdtemp(path.join(os.tmpdir(), "floriva-claims-write-once-"));
    const jsonPath = path.join(rootDir, "baseline.json");
    await fs.writeFile(jsonPath, "already frozen");

    await expect(freezeClaimsBaseline({
      rootDir,
      inputPath: "missing-input.json",
      jsonPath: "baseline.json",
      csvPath: "baseline.csv",
      copyBase: "a".repeat(40),
      copyManifestPath: "manifest.json",
      scannerPath: "audit-claims.mjs",
    })).rejects.toThrow(/refusing to overwrite/i);
  });

  it("rejects drive-qualified, UNC, rooted, traversal, and junction escapes", async () => {
    const rootDir = await fs.mkdtemp(path.join(os.tmpdir(), "floriva-claims-paths-"));
    const outsideDir = await fs.mkdtemp(path.join(os.tmpdir(), "floriva-claims-outside-"));
    await fs.writeFile(path.join(outsideDir, "escape.mdx"), "FTC outside.\n");
    const linkPath = path.join(rootDir, "linked");
    await fs.symlink(outsideDir, linkPath, process.platform === "win32" ? "junction" : "dir");
    const finding = (file: string) => [{ file, line: 1, column: 1, pattern: "ftc", claimText: "FTC", riskTier: "HIGH" }];

    for (const unsafe of ["C:\\outside\\a.mdx", "\\\\server\\share\\a.mdx", "/rooted/a.mdx", "../escape.mdx", "linked/escape.mdx"]) {
      await expect(createBaselineRows({ rootDir, scannerSource: "scanner", findings: finding(unsafe) })).rejects.toThrow(/invalid repository path|symbolic link|junction/i);
    }
    await expect(publishImmutableFiles({ rootDir, files: [{ path: "../escape.json", data: "bad" }] })).rejects.toThrow(/invalid repository path/i);
    await expect(freezeClaimsBaseline({
      rootDir,
      inputPath: "C:\\outside\\report.json",
      jsonPath: "baseline.json",
      csvPath: "baseline.csv",
      copyBase: "a".repeat(40),
      copyManifestPath: "manifest.json",
      scannerPath: "scanner.mjs",
    })).rejects.toThrow(/invalid repository path/i);
    await expect(freezeClaimsBaseline({
      rootDir,
      inputPath: "report.json",
      jsonPath: "../baseline.json",
      csvPath: "baseline.csv",
      copyBase: "a".repeat(40),
      copyManifestPath: "manifest.json",
      scannerPath: "scanner.mjs",
    })).rejects.toThrow(/invalid repository path/i);
  });

  it("rejects NTFS alternate data stream syntax in freezer inputs and outputs without leftovers", async () => {
    const rootDir = await fs.mkdtemp(path.join(os.tmpdir(), "floriva-claims-ads-"));
    const defaults = {
      rootDir,
      inputPath: "report.json",
      jsonPath: "baseline.json",
      csvPath: "baseline.csv",
      copyBase: "a".repeat(40),
      copyManifestPath: "manifest.json",
      scannerPath: "scanner.mjs",
    };

    await expect(createBaselineRows({
      rootDir,
      scannerSource: "scanner",
      findings: [{ file: "content/safe.mdx:stream", line: 1, column: 1, pattern: "ftc", claimText: "FTC", riskTier: "HIGH" }],
    })).rejects.toThrow(/invalid repository path/i);
    await expect(publishImmutableFiles({ rootDir, files: [{ path: "safe.txt:stream", data: "bad" }] })).rejects.toThrow(/invalid repository path/i);

    for (const field of ["inputPath", "scannerPath", "jsonPath", "csvPath", "copyManifestPath"] as const) {
      await expect(freezeClaimsBaseline({ ...defaults, [field]: `safe-${field}.txt:stream` })).rejects.toThrow(/invalid repository path/i);
    }

    expect(await fs.readdir(rootDir)).toEqual([]);
  });

  it.each(["write", "sync", "close", "lstat"] as const)("removes every temporary and destination file when the second temporary %s fails", async (phase) => {
    const rootDir = await fs.mkdtemp(path.join(os.tmpdir(), `floriva-claims-${phase}-`));
    await expect(publishImmutableFiles({
      rootDir,
      files: [
        { path: "one.json", data: "one" },
        { path: "two.json", data: "two" },
        { path: "three.json", data: "three" },
      ],
      fileSystem: injectSecondTemporaryFileFailure(phase),
    })).rejects.toThrow(`injected temporary ${phase} failure`);
    expect(await fs.readdir(rootDir)).toEqual([]);
  });

  it.each([2, 3])("removes outputs created by the invocation when publish %i fails", async (failureIndex) => {
    const rootDir = await fs.mkdtemp(path.join(os.tmpdir(), "floriva-claims-atomic-"));
    const paths = ["one.json", "two.csv", "three.json"];
    await expect(publishImmutableFiles({
      rootDir,
      files: paths.map((filePath) => ({ path: filePath, data: filePath })),
      beforePublish: async ({ index }: { index: number }) => {
        if (index === failureIndex - 1) throw new Error(`injected publish ${failureIndex}`);
      },
    })).rejects.toThrow(`injected publish ${failureIndex}`);
    await Promise.all(paths.map(async (filePath) => expect(fs.access(path.join(rootDir, filePath))).rejects.toThrow()));
  });

  it("does not overwrite a destination created concurrently", async () => {
    const rootDir = await fs.mkdtemp(path.join(os.tmpdir(), "floriva-claims-concurrent-"));
    await expect(publishImmutableFiles({
      rootDir,
      files: [{ path: "one.json", data: "ours one" }, { path: "two.json", data: "ours two" }],
      beforePublish: async ({ index, absolutePath }: { index: number; absolutePath: string }) => {
        if (index === 1) await fs.writeFile(absolutePath, "concurrent bytes", { flag: "wx" });
      },
    })).rejects.toThrow(/refusing to overwrite/i);
    await expect(fs.access(path.join(rootDir, "one.json"))).rejects.toThrow();
    await expect(fs.readFile(path.join(rootDir, "two.json"), "utf8")).resolves.toBe("concurrent bytes");
  });

  it("requires copyBase to equal the current repository HEAD", async () => {
    const rootDir = await createGitRepository("floriva-claims-head-");
    await expect(freezeClaimsBaseline({
      rootDir,
      inputPath: "missing-report.json",
      jsonPath: "baseline.json",
      csvPath: "baseline.csv",
      copyBase: "a".repeat(40),
      copyManifestPath: "manifest.json",
      scannerPath: "missing-scanner.mjs",
    })).rejects.toThrow(/current repository HEAD/i);
  });

  // This validates every frozen corpus row and reparses its source, so it can exceed Vitest's default on slower CI hosts.
  it("regenerates 1,010 immutable rows whose complete AST locators resolve", async (ctx) => {
    const rootDir = path.resolve(".");
    const jsonPath = path.join(rootDir, "docs/seo-400/recovery-2026-07-22/claims-baseline.json");
    const csvPath = path.join(rootDir, "docs/seo-400/recovery-2026-07-22/claims-baseline.csv");
    const manifestPath = path.join(rootDir, "docs/seo-400/recovery-2026-07-22/copy-review-ledger/manifest.json");
    const [jsonBytes, csvBytes, manifestText, head] = await Promise.all([
      fs.readFile(jsonPath),
      fs.readFile(csvPath),
      fs.readFile(manifestPath, "utf8"),
      git(rootDir, ["rev-parse", "HEAD"]),
    ]);
    const rows = JSON.parse(jsonBytes.toString("utf8"));
    const manifest = JSON.parse(manifestText);

    expect(rows).toHaveLength(1010);
    expect(rows.reduce((counts: Record<string, number>, row: { riskTier: string }) => ({ ...counts, [row.riskTier]: (counts[row.riskTier] ?? 0) + 1 }), {})).toEqual({ HIGH: 641, LOW: 271, MED: 98 });
    expect(new Set(rows.map((row: { baselineId: string }) => row.baselineId)).size).toBe(1010);
    expect(csvRecordCount(csvBytes.toString("utf8"))).toBe(1011);
    expect(manifest).toMatchObject({
      frozenBaseSha: "f204145a4859897407278af1876bbdf1992edcb3",
      baseline: { rows: 1010, byRisk: { HIGH: 641, MED: 98, LOW: 271 }, scannedFiles: 535 },
    });
    /* The frozen base is a commit, so the ancestry check only means something in
       a repository that has history. This one is published as a squashed
       snapshot, where the frozen commit is absent by construction and asking git
       about it is an error rather than a failure. Assert ancestry when the commit
       is present, and let the per-row locator resolution below carry the check
       otherwise - that is the part that actually proves the baseline still
       describes the working tree. */
    const frozenBaseIsPresent = await git(rootDir, ["cat-file", "-e", `${manifest.frozenBaseSha}^{commit}`])
      .then(() => true)
      .catch(() => false);
    if (frozenBaseIsPresent) {
      expect(await git(rootDir, ["merge-base", head, manifest.frozenBaseSha])).toBe(
        manifest.frozenBaseSha,
      );
    }
    expect(manifest.baseline.json.sha256).toBe(sha256(jsonBytes));
    expect(manifest.baseline.csv.sha256).toBe(sha256(csvBytes));

    /* Everything above is history-free and has just run. The row walk below is
       not: a row whose source file has legitimately been edited since the freeze
       is audited by reading the frozen bytes back out of the frozen commit, and
       that commit is absent from a squashed snapshot by construction. Skip
       loudly rather than pass quietly - a guard reporting green while checking
       nothing is the failure mode this suite exists to prevent. */
    if (!frozenBaseIsPresent) {
      ctx.skip(
        `frozen base ${manifest.frozenBaseSha} is not present in this repository, ` +
          "so the per-row locator walk cannot read frozen sources. Run this in the " +
          "full-history repository to exercise it.",
      );
    }

    const parser = unified().use(remarkParse).use(remarkGfm);
    const sources = new Map<string, { raw: Buffer; content: string; tree: any }>();
    for (const row of rows) {
      let source = sources.get(row.file);
      if (!source) {
        // A consolidated-away file is absent from the working tree. That is the
        // same situation as an edited one - the frozen claim is still auditable
        // against the frozen commit - so fall through to the same recovery path
        // instead of throwing ENOENT. Using an empty buffer guarantees the hash
        // mismatch below, which is what triggers that recovery.
        const workingRaw = await fs
          .readFile(path.join(rootDir, row.file))
          .catch((error: NodeJS.ErrnoException) => {
            if (error.code !== "ENOENT") {
              throw error;
            }
            return Buffer.alloc(0);
          });
        let raw = workingRaw;
        if (sha256(raw) !== row.sourceFileHash) {
          const frozenBlob = execFileSync(
            "git",
            ["show", `${manifest.frozenBaseSha}:${row.file}`],
            { cwd: rootDir },
          );
          const frozenFiltered = execFileSync(
            "git",
            [
              "cat-file",
              "--filters",
              `--path=${row.file}`,
              `${manifest.frozenBaseSha}:${row.file}`,
            ],
            { cwd: rootDir },
          );
          raw = [frozenBlob, frozenFiltered].find(
            (candidate) => sha256(candidate) === row.sourceFileHash,
          ) ?? workingRaw;
        }
        const content = matter(raw.toString("utf8")).content;
        source = { raw, content, tree: parser.parse(content) };
        sources.set(row.file, source);
      }
      expect(row.sourceFileHash).toBe(sha256(source.raw));
      expect(row.normalizedTextHash).toBe(sha256(normalizeClaimText(row.originalText)));
      expect(createBaselineId({
        file: row.file,
        baselineLocator: row.baselineLocator,
        patternId: row.patternId,
        sourceFileHash: row.sourceFileHash,
        claimText: row.originalText,
      })).toBe(row.baselineId);
      const indices = [...row.baselineLocator.matchAll(/\.children\[(\d+)\]/g)].map((match) => Number(match[1]));
      expect(indices.length).toBeGreaterThan(0);
      let node = source.tree;
      for (const index of indices) {
        expect(Array.isArray(node.children)).toBe(true);
        expect(node.children[index]).toBeTruthy();
        node = node.children[index];
      }
      expect(node.position?.start?.offset).toEqual(expect.any(Number));
      expect(node.position?.end?.offset).toEqual(expect.any(Number));
      expect(normalizeClaimText(source.content.slice(node.position.start.offset, node.position.end.offset))).toContain(normalizeClaimText(row.originalText));
    }

    const known = rows.filter((row: { file: string; line: number; column: number }) => row.file === "content/guides/femtech-data-monetization.mdx" && row.line === 34 && [107, 175].includes(row.column));
    expect(known.map((row: { originalText: string }) => row.originalText)).toEqual([
      "A 2022 JMIR study (Alfawzan et al., n=23 apps) found 87% of popular women's mHealth apps shared data with third parties.",
      "61% allowed location tracking.",
    ]);
    expect(known.map((row: { baselineLocator: string }) => row.baselineLocator)).toEqual([
      "body:root.children[14].sentence[1]",
      "body:root.children[14].sentence[2]",
    ]);
    /* No per-test timeout: this inherits the 180s configured in
       vitest.config.ts. The 20s override that used to sit here predated that
       setting and became a cap rather than an extension, which failed the case
       under coverage instrumentation while it passed in a plain run. */
  });
});

describe("content batch manifest safety", () => {
  it("rejects changed paths outside the allowlist and paths inside the denylist", async () => {
    const rootDir = await fs.mkdtemp(path.join(os.tmpdir(), "floriva-manifest-scope-"));
    await fs.mkdir(path.join(rootDir, "content/guides"), { recursive: true });
    await fs.writeFile(path.join(rootDir, "content/guides/allowed.mdx"), "allowed");
    await fs.writeFile(path.join(rootDir, "content/guides/denied.mdx"), "denied");
    await fs.writeFile(path.join(rootDir, "package.json"), "{}");

    await expect(validateChangedPaths({
      rootDir,
      changedPaths: ["content/guides/allowed.mdx", "package.json"],
      allow: ["content/guides"],
      deny: [],
    })).rejects.toThrow(/outside the allowlist/i);

    await expect(validateChangedPaths({
      rootDir,
      changedPaths: ["content/guides/allowed.mdx", "content/guides/denied.mdx"],
      allow: ["content/guides"],
      deny: ["content/guides/denied.mdx"],
    })).rejects.toThrow(/denylist/i);
  });

  it("rejects missing files and manifest entries whose bytes no longer match", async () => {
    const rootDir = await fs.mkdtemp(path.join(os.tmpdir(), "floriva-manifest-hash-"));
    await fs.writeFile(path.join(rootDir, "tracked.txt"), "current bytes");

    await expect(validateChangedPaths({
      rootDir,
      changedPaths: ["missing.txt"],
      allow: ["missing.txt"],
      deny: [],
    })).rejects.toThrow(/missing/i);

    await expect(verifyManifestEntries({
      rootDir,
      entries: [{ path: "tracked.txt", sha256: sha256("old bytes") }],
    })).rejects.toThrow(/hash mismatch/i);
  });

  it("rejects Windows, rooted, traversal, and junction escapes in rules, changes, and entries", async () => {
    const rootDir = await fs.mkdtemp(path.join(os.tmpdir(), "floriva-manifest-escape-"));
    const outsideDir = await fs.mkdtemp(path.join(os.tmpdir(), "floriva-manifest-outside-"));
    await fs.writeFile(path.join(outsideDir, "secret.txt"), "secret");
    await fs.symlink(outsideDir, path.join(rootDir, "linked"), process.platform === "win32" ? "junction" : "dir");

    for (const unsafe of ["C:\\outside\\a.txt", "\\\\server\\share\\a.txt", "/rooted/a.txt", "../a.txt", "linked/secret.txt"]) {
      await expect(validateChangedPaths({ rootDir, changedPaths: [unsafe], allow: [unsafe] })).rejects.toThrow(/invalid repository path|symbolic link|junction/i);
    }
    for (const unsafe of ["C:\\outside\\a.txt", "\\\\server\\share\\a.txt", "/rooted/a.txt", "../secret.txt", "linked/secret.txt"]) {
      await expect(verifyManifestEntries({ rootDir, entries: [{ path: unsafe, sha256: sha256("secret") }] })).rejects.toThrow(/invalid repository path|symbolic link|junction/i);
    }
    await fs.writeFile(path.join(rootDir, "safe.txt"), "safe");
    await expect(validateChangedPaths({ rootDir, changedPaths: ["safe.txt"], allow: ["safe.txt"], deny: ["../outside"] })).rejects.toThrow(/invalid repository path/i);
  });

  it("rejects NTFS alternate data stream syntax in rules, changes, entries, and output without base or temp leftovers", async () => {
    const rootDir = await fs.mkdtemp(path.join(os.tmpdir(), "floriva-manifest-ads-"));
    await expect(validateChangedPaths({ rootDir, changedPaths: ["safe.txt"], allow: ["safe.txt:stream"] })).rejects.toThrow(/invalid repository path/i);
    await expect(validateChangedPaths({ rootDir, changedPaths: ["safe.txt"], allow: ["safe.txt"], deny: ["safe.txt:stream"] })).rejects.toThrow(/invalid repository path/i);
    await expect(validateChangedPaths({ rootDir, changedPaths: ["safe.txt:stream"], allow: ["safe.txt"] })).rejects.toThrow(/invalid repository path/i);
    await expect(verifyManifestEntries({
      rootDir,
      entries: [{ path: "safe.txt:stream", sha256: sha256("bad") }],
    })).rejects.toThrow(/invalid repository path/i);
    expect(await fs.readdir(rootDir)).toEqual([]);

    const gitRoot = await createGitRepository("floriva-manifest-ads-output-");
    await expect(writeContentBatchManifest({
      rootDir: gitRoot,
      task: 1,
      allow: ["seed.txt"],
      outPath: "safe.txt:stream",
    })).rejects.toThrow(/invalid repository path/i);
    expect((await fs.readdir(gitRoot)).filter((name) => name === "safe.txt" || name.startsWith(".safe.txt."))).toEqual([]);
  });

  it("integrates with real porcelain for untracked names, deterministic hashes, HEAD, and prefix boundaries", async () => {
    const rootDir = await createGitRepository("floriva-manifest-git-");
    await fs.mkdir(path.join(rootDir, "content/guides"), { recursive: true });
    await fs.writeFile(path.join(rootDir, "content/guides/with space.mdx"), "claim bytes\n");
    const head = await git(rootDir, ["rev-parse", "HEAD"]);
    const manifest = await writeContentBatchManifest({
      rootDir,
      task: 1,
      allow: ["content/guides"],
      outPath: "task-1.json",
    });

    expect(manifest).toEqual({
      task: 1,
      head,
      paths: [{ path: "content/guides/with space.mdx", sha256: sha256("claim bytes\n") }],
    });
    await expect(verifyManifestEntries({ rootDir, entries: manifest.paths })).resolves.toBeUndefined();
    const firstBytes = await fs.readFile(path.join(rootDir, "task-1.json"), "utf8");
    await fs.rm(path.join(rootDir, "task-1.json"));
    await writeContentBatchManifest({ rootDir, task: 1, allow: ["content/guides"], outPath: "task-1.json" });
    await expect(fs.readFile(path.join(rootDir, "task-1.json"), "utf8")).resolves.toBe(firstBytes);
    await fs.rm(path.join(rootDir, "task-1.json"));
    await expect(writeContentBatchManifest({ rootDir, task: 1, allow: ["content/guide"], outPath: "task-1.json" })).rejects.toThrow(/outside the allowlist/i);
  });

  it("rejects real Git renames/copies and empty diffs", async () => {
    const renameRoot = await createGitRepository("floriva-manifest-rename-");
    await git(renameRoot, ["mv", "seed.txt", "renamed.txt"]);
    await expect(writeContentBatchManifest({ rootDir: renameRoot, task: 1, allow: ["seed.txt", "renamed.txt"], outPath: "task.json" })).rejects.toThrow(/renamed\/copied paths/i);

    const copyRoot = await createGitRepository("floriva-manifest-copy-");
    await git(copyRoot, ["config", "status.renames", "copies"]);
    await fs.copyFile(path.join(copyRoot, "seed.txt"), path.join(copyRoot, "copied.txt"));
    await fs.writeFile(path.join(copyRoot, "seed.txt"), "seed changed enough to remain a separate file\n");
    await git(copyRoot, ["add", "seed.txt", "copied.txt"]);
    await expect(writeContentBatchManifest({ rootDir: copyRoot, task: 1, allow: ["seed.txt", "copied.txt"], outPath: "task.json" })).rejects.toThrow(/renamed\/copied paths/i);

    const cleanRoot = await createGitRepository("floriva-manifest-empty-");
    await expect(writeContentBatchManifest({ rootDir: cleanRoot, task: 1, allow: ["seed.txt"], outPath: "task.json" })).rejects.toThrow(/empty diff/i);
  });

  it("never truncates an existing manifest output", async () => {
    const rootDir = await createGitRepository("floriva-manifest-output-");
    await fs.writeFile(path.join(rootDir, "changed.txt"), "changed\n");
    await fs.writeFile(path.join(rootDir, "task.json"), "keep me");
    await expect(writeContentBatchManifest({ rootDir, task: 1, allow: ["changed.txt", "task.json"], outPath: "task.json" })).rejects.toThrow(/refusing to overwrite/i);
    await expect(fs.readFile(path.join(rootDir, "task.json"), "utf8")).resolves.toBe("keep me");

    const concurrentRoot = await createGitRepository("floriva-manifest-concurrent-");
    await fs.writeFile(path.join(concurrentRoot, "changed.txt"), "changed\n");
    await expect(writeContentBatchManifest({
      rootDir: concurrentRoot,
      task: 1,
      allow: ["changed.txt"],
      outPath: "task.json",
      beforePublish: async ({ absolutePath }: { absolutePath: string }) => {
        await fs.writeFile(absolutePath, "concurrent manifest", { flag: "wx" });
      },
    })).rejects.toThrow(/refusing to overwrite/i);
    await expect(fs.readFile(path.join(concurrentRoot, "task.json"), "utf8")).resolves.toBe("concurrent manifest");
    await expect(writeContentBatchManifest({ rootDir: concurrentRoot, task: 1, allow: ["changed.txt"], outPath: "../task.json" })).rejects.toThrow(/invalid repository path/i);
  });
});

describe("claim remediation commands", () => {
  it("exposes the focused freezer, manifest, and test commands", async () => {
    const packageJson = JSON.parse(await fs.readFile(path.resolve("package.json"), "utf8"));
    expect(packageJson.scripts).toMatchObject({
      "freeze:claims-baseline": "node scripts/freeze-claims-baseline.mjs",
      "manifest:content-batch": "node scripts/write-content-batch-manifest.mjs",
      "test:claims": "vitest run scripts/claim-remediation.test.ts",
    });
  });
});
