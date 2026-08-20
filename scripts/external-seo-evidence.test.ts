import { mkdtemp, mkdir, readFile, realpath, symlink, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { describe, expect, it } from "vitest";

import {
  validateAggregateDisposition,
  parseRound3GoogleDomSnapshot,
  validateAnswerRows,
  validateExternalEvidence,
  validateFindingDisposition,
  validateGsc,
  validatePublishedGscReconciliation,
  validateAnswerLimitationReconciliation,
  validatePrivateRawInventory,
  validatePortableEvidencePath,
  validateRawToRedactedClosure,
  assertExactStagingManifest,
} from "./verify-external-seo-evidence.mjs";

const hash = "a".repeat(64);

/* The manifest used to be read out of artifacts/, which is no longer committed.
   It is a fixture, not evidence: the test exercises assertExactStagingManifest
   against a known-good list, so the list now lives beside the test and the case
   no longer depends on a generated tree. */
it("pins the exact 59-path Task 1 staging manifest with the owned bridge files", async () => {
  const stagingPaths = (await readFile(
    path.resolve(import.meta.dirname, "__fixtures__", "task-1-staging-paths.txt"),
    "utf8",
  )).trim().split(/\r?\n/);
  expect(stagingPaths).toHaveLength(59);
  expect(stagingPaths).toEqual([...new Set(stagingPaths)].sort());
  expect(stagingPaths).toEqual(expect.arrayContaining([
    "worker/src/private-backup-r2-bridge.mjs",
    "worker/src/private-backup-r2-bridge.d.mts",
    "worker/test/private-backup-r2-bridge.test.ts",
    "worker/wrangler.r2-private-backup-bridge.toml",
  ]));
  expect(stagingPaths).not.toContain("pnpm-lock.yaml");
  expect(stagingPaths.some((entry) => entry.includes("rendering-proof") || entry.includes("rendering-verifiers"))).toBe(false);
  expect(() => assertExactStagingManifest(stagingPaths, stagingPaths)).not.toThrow();
  expect(() => assertExactStagingManifest(stagingPaths.slice(1), stagingPaths)).toThrow(/missing/i);
  expect(() => assertExactStagingManifest([...stagingPaths, "scripts/run-rendering-proof.mjs"], stagingPaths)).toThrow(/extra/i);
});

describe("external evidence schemas", () => {
  it("parses only the bounded round-3 drawer and rejects tampered URLs or bounds", () => {
    const query = "private period tracker";
    const expected = ["https://example.com/one", "https://example.com/two"];
    const snapshot = [
      `- combobox "Search" [ref=q]: ${query} ${query}`,
      `- link "Sign in" [ref=s]:`,
      `  - /url: https://accounts.google.com/ServiceLogin?continue=x%3Fhl%3Den%26gl%3Dus%26pws%3D0`,
      `- generic [ref=aio]:`,
      `  - heading "AI Overview" [level=2]`,
      `  - dialog [ref=d]:`,
      `    - button "Close"`,
      `    - list [ref=sources]:`,
      `      - listitem [ref=one]:`,
      `        - link "one":`,
      `          - /url: ${expected[0]}`,
      `      - listitem [ref=two]:`,
      `        - link "two":`,
      `          - /url: ${expected[1]}`,
      `- button "Show more AI Overview"`,
      `- link "unrelated":`,
      `  - /url: https://unrelated.example/`,
      `- button "Unknown - Can't determine location"`,
    ].join("\n");
    expect(parseRound3GoogleDomSnapshot(snapshot, { query, mode: "drawer-dialog", expectedCitedUrls: expected })).toMatchObject({ valid: true, citedUrls: expected });
    expect(parseRound3GoogleDomSnapshot(snapshot.replace(expected[1], "https://forged.example/"), { query, mode: "drawer-dialog", expectedCitedUrls: expected }).errors.join(" ")).toMatch(/do not match/);
    expect(parseRound3GoogleDomSnapshot(snapshot.replace("  - dialog [ref=d]:", "  - generic [ref=d]:"), { query, mode: "drawer-dialog", expectedCitedUrls: expected }).errors.join(" ")).toMatch(/dialog bound/);
    expect(parseRound3GoogleDomSnapshot(snapshot.replace(`          - /url: ${expected[1]}`, `          - /url: ${expected[1]}\n        - /url: http://insecure.example/`), { query, mode: "drawer-dialog", expectedCitedUrls: expected }).errors.join(" ")).toMatch(/non-HTTPS/);
    expect(parseRound3GoogleDomSnapshot(snapshot.replace(`          - /url: ${expected[1]}`, `          - /url: ${expected[1]}\n        - /url: https://extra.example/`), { query, mode: "drawer-dialog", expectedCitedUrls: expected }).errors.join(" ")).toMatch(/multiple URLs/);
  });

  it("selects the unique maximum-coverage list inside AIO bounds and rejects missing terminal bounds", () => {
    const query = "period tracker that doesn't sell data";
    const expected = ["https://example.com/one", "https://example.com/two"];
    const snapshot = [
      `- combobox "Search" [ref=q]: ${query} ${query}`,
      `- link "Sign in" [ref=s]:`,
      `  - /url: https://accounts.google.com/ServiceLogin?continue=x%3Fhl%3Den%26gl%3Dus%26pws%3D0`,
      `- heading "AI Overview" [level=2]`,
      `  - button "View 1 corroboration links"`,
      `  - list [ref=small]:`,
      `    - listitem [ref=summary]:`,
      `      - /url: https://summary.example/`,
      `  - list [ref=sources]:`,
      `    - listitem [ref=one]:`,
      `      - /url: ${expected[0]}`,
      `    - listitem [ref=two]:`,
      `      - /url: ${expected[1]}`,
      `  - textbox "Ask anything"`,
      `- button "Unknown - Can't determine location"`,
    ].join("\n");
    expect(parseRound3GoogleDomSnapshot(snapshot, { query, mode: "aio-carousel", expectedCitedUrls: expected })).toMatchObject({ valid: true, citedUrls: expected });
    expect(parseRound3GoogleDomSnapshot(snapshot.replace(`  - textbox "Ask anything"`, `  - generic "Ask anything"`), { query, mode: "aio-carousel", expectedCitedUrls: expected }).errors.join(" ")).toMatch(/terminal bound/);
    const duplicatedMaximum = snapshot.replace(`  - textbox "Ask anything"`, `  - list [ref=duplicate]:\n    - listitem [ref=duplicate-one]:\n      - /url: ${expected[0]}\n    - listitem [ref=duplicate-two]:\n      - /url: ${expected[1]}\n  - textbox "Ask anything"`);
    expect(parseRound3GoogleDomSnapshot(duplicatedMaximum, { query, mode: "aio-carousel", expectedCitedUrls: expected }).errors.join(" ")).toMatch(/unique corroboration-bound/);
  });

  it("rejects forged published GSC aggregates in every metric", () => {
    const request = { property: "sc-domain:floriva.app", searchType: "WEB", startDate: "2026-06-24", endDate: "2026-07-21", timezone: "America/Chicago", countryFilter: "all", deviceFilter: "all", dimensions: ["date", "query", "page", "country", "device"], partialDayPolicy: "exclude-current-partial-day", dataState: "final", sort: "impressions-desc" };
    const aggregate = { rowCount: 50, clicks: 0, impressions: 50, ctrPercent: 0, weightedAveragePosition: 62.96 };
    const document = { export: { rows: [aggregate] }, records: [{ requestParameters: { ...request, startRow: 0, rowLimit: 50 } }, { requestParameters: { ...request, startRow: 50, rowLimit: 50 } }] };
    const page = { request: document.records[0].requestParameters, redactedSummary: aggregate };
    const sentinel = { request: document.records[1].requestParameters, redactedSummary: { startRow: 50, returnedRowCount: 0, noMoreRows: true } };
    expect(validatePublishedGscReconciliation(document, page, sentinel, aggregate).valid).toBe(true);
    for (const key of Object.keys(aggregate)) {
      const forged = structuredClone(document);
      forged.export.rows[0][key] = 999;
      expect(validatePublishedGscReconciliation(forged, page, sentinel, aggregate).errors.join(" ")).toContain(key);
    }
  });

  it("rejects forged answer-engine authentication and request state", () => {
    const queries = ["private period tracker", "best private period tracker", "period tracker that doesn't sell data", "safe period tracker after Roe v. Wade", "school device period tracking privacy"];
    const raw = { locale: "en-US", country: "US", authenticationState: "logged-out", providers: ["ChatGPT Search", "Perplexity"].map((provider) => ({ provider, status: "not-observed", reasonCode: `${provider}-reason`, queries })) };
    const rows = raw.providers.flatMap((provider) => queries.map((query) => ({ provider: provider.provider, query, observationStatus: provider.status, limitationReason: provider.reasonCode, locale: raw.locale, country: raw.country, authenticationState: raw.authenticationState })));
    const sidecars = Object.fromEntries(raw.providers.map((provider) => [provider.provider, { locale: raw.locale, country: raw.country, authenticationState: raw.authenticationState, redactedSummary: { provider: provider.provider, status: provider.status, reasonCode: provider.reasonCode, queryCount: 5 } }]));
    expect(validateAnswerLimitationReconciliation(raw, rows, sidecars).valid).toBe(true);
    for (const key of ["locale", "country", "authenticationState"]) {
      const forged = structuredClone(rows);
      forged[0][key] = "forged";
      expect(validateAnswerLimitationReconciliation(raw, forged, sidecars).valid).toBe(false);
    }
  });

  it("requires one Google context child and an independent source-set disposition", () => {
    const row = { provider: "Google AI Overviews", providerVersion: "1", query: "private period tracker", locale: "en-US", country: "US", authenticationState: "logged-out", observationStatus: "observed", retrievalMethod: "manual", capturedAt: "2026-07-22T12:00:00.000Z", rawEvidenceId: "raw-aio-001", sidecars: [], aiOverviewPresent: true, florivaCited: false, citedUrls: ["https://example.com"], citationCoverage: "complete-expanded-source-controls", hiddenCitationsReviewed: true, visualReview: { reviewerId: "reviewer", reviewerRole: "independent-non-implementing-visual-adversary", approved: true }, redactedVisualChildren: [], sourceVisualReview: { reviewerId: "reviewer", reviewerRole: "independent-non-implementing-visual-adversary", status: "complete", approved: true, continuousCoverage: true } };
    expect(validateAnswerRows([row]).errors.join(" ")).toMatch(/exactly one tracked query\/session context/);
    row.redactedVisualChildren = [{ role: "query-session-context", path: "context.png", sha256: hash, mediaType: "image/png" }];
    row.sourceVisualReview = { reviewerId: "reviewer", reviewerRole: "independent-non-implementing-visual-adversary", status: "unsupported", approved: true, continuousCoverage: true };
    expect(validateAnswerRows([row]).errors.join(" ")).toMatch(/complete or recapture-required source-set disposition/);
  });
  it("requires the exact GSC export dimensions", () => {
    expect(validateGsc({ property: "sc-domain:floriva.app" }).errors).toContain("startDate is required");
    const exact = {
      property: "sc-domain:floriva.app", searchType: "web", startDate: "2026-06-24", endDate: "2026-07-21",
      timezone: "America/Chicago", countryFilter: "all", deviceFilter: "all",
      dimensions: ["date", "query", "page", "country", "device"], partialDayPolicy: "exclude-current-partial-day",
      dataState: "final", sort: "impressions-desc", rows: [],
    };
    expect(validateGsc(exact)).toEqual({ valid: true, errors: [] });
    expect(validateGsc({ ...exact, sort: "clicks-desc" }).errors.join(" ")).toMatch(/sort/);
  });

  it("accepts fully specified fixed answer-engine observations", () => {
    const rows = [
      {
        provider: "ChatGPT Search",
        providerVersion: "2026-07-22",
        query: "private period tracker",
        locale: "en-US",
        country: "US",
        authenticationState: "signed-out",
        retrievalMethod: "manual-observation",
        capturedAt: "2026-07-22T12:00:00.000Z",
        florivaCited: false,
        rawEvidenceId: "raw-answer-001",
        sidecars: [{ path: "sidecars/chatgpt/answer-001.json", sha256: hash, mediaType: "application/json" }],
      },
    ];
    expect(validateAnswerRows(rows)).toEqual({ valid: true, errors: [] });
  });

  it("preserves unavailable answer-engine sessions without inventing a citation result", () => {
    const rows = [
      {
        provider: "Perplexity",
        providerVersion: "unavailable",
        query: "private period tracker",
        locale: "en-US",
        country: "US",
        authenticationState: "unavailable",
        observationStatus: "not-observed",
        limitationReason: "authenticated-session-unavailable",
        retrievalMethod: "access-limitation-record",
        capturedAt: "2026-07-22T12:00:00.000Z",
        florivaCited: null,
        rawEvidenceId: "raw-answer-002",
        sidecars: [{ path: "sidecars/perplexity/access.json", sha256: hash, mediaType: "application/json" }],
      },
    ];
    expect(validateAnswerRows(rows)).toEqual({ valid: true, errors: [] });
  });

  it("rejects an incomplete fixed provider/query observation matrix", () => {
    const row = {
      provider: "Perplexity",
      providerVersion: "unavailable",
      query: "private period tracker",
      locale: "en-US",
      country: "US",
      authenticationState: "logged-out",
      observationStatus: "not-observed",
      limitationReason: "modal",
      retrievalMethod: "access-limitation-record",
      capturedAt: "2026-07-22T12:00:00.000Z",
      florivaCited: null,
      rawEvidenceId: "raw-answer-002",
      sidecars: [{ path: "sidecars/perplexity/access.json", sha256: hash, mediaType: "application/json" }],
    };
    expect(validateAnswerRows([row], { requireFixedSet: true }).errors.join(" ")).toMatch(/exact 3-provider by 5-query/);
  });

  it("rejects unsupported aggregate and finding dispositions", () => {
    expect(validateAggregateDisposition({ status: "unreproducible", rerunArtifact: null }).valid).toBe(false);
    expect(
      validateFindingDisposition({ status: "false-positive", evidence: [], adversarialReview: null }).valid,
    ).toBe(false);
  });

  it("requires redaction metadata on the complete external bundle", () => {
    expect(validateExternalEvidence({ records: [] }).valid).toBe(false);
  });

  it("requires adversarial approval for a top-level agentic aggregate", () => {
    const result = validateExternalEvidence({
      records: [],
      redaction: {},
      aggregates: [{ status: "insufficiently-specified" }],
    });
    expect(result.errors.join(" ")).toMatch(/non-implementing adversarial approval/);
  });

  it("rejects traversal, ADS, device names, and aliases in evidence paths", () => {
    for (const invalid of ["../escape", "C:/escape", "file:stream", "CON", "CONIN$", "CONOUT$", "CLOCK$", "COM¹", "COM²", "COM³", "LPT¹", "LPT²", "LPT³", "name. "]) {
      expect(() => validatePortableEvidencePath(invalid)).toThrow();
    }
  });
});

it("requires hash-bound raw-to-redacted semantic closure", async () => {
  // Canonicalize: macOS tmpdir() sits under /var -> /private/var (symlink), which
  // the validator's reparse-point guard correctly rejects. This test expects success.
  const root = await realpath(await mkdtemp(path.join(tmpdir(), "floriva-closure-")));
  const sidecar = path.join(root, "sidecar.json");
  const summary = { rows: 50, dataState: "final" };
  const crypto = await import("node:crypto");
  const canonical = '{"dataState":"final","rows":50}';
  const rawSha = "b".repeat(64);
  await writeFile(sidecar, JSON.stringify({ provenance: { rawEvidenceId: "raw-gsc-001", rawSha256: rawSha }, redactedSummary: summary }));
  const result = await validateRawToRedactedClosure([{
    rawEvidenceId: "raw-gsc-001",
    rawEvidenceSha256: rawSha,
    redactedSummarySha256: crypto.createHash("sha256").update(canonical).digest("hex"),
    sidecars: [{ path: "sidecar.json", mediaType: "application/json" }],
  }], { records: [{ rawEvidenceId: "raw-gsc-001", sha256: rawSha }] }, { phaseRoot: root });
  expect(result).toEqual({ valid: true, errors: [] });
});

it("recomputes private raw inventory hashes through opaque resolution", async () => {
  const root = await mkdtemp(path.join(tmpdir(), "floriva-raw-"));
  const rawPath = path.join(root, "raw.json");
  await writeFile(rawPath, "private bytes");
  expect(
    (
      await validatePrivateRawInventory(
        {
          records: [
            {
              rawEvidenceId: "raw-gsc-001",
              opaqueLocator: "vault:7f3a",
              sha256: undefined,
              byteLength: 13,
              verifiedAt: "2026-07-22T12:00:00.000Z",
            },
          ],
        },
        { resolveOpaqueLocator: async () => rawPath },
      )
    ).valid,
  ).toBe(false);
});

it("requires existing hashed sidecars and rejects self hashes", async () => {
  const root = await mkdtemp(path.join(tmpdir(), "floriva-sidecar-"));
  const sidecar = path.join(root, "sidecars", "crawl", "capture.json");
  await mkdir(path.dirname(sidecar), { recursive: true });
  await writeFile(sidecar, "{}");
  const result = validateExternalEvidence(
    {
      phase: "prechange",
      records: [
        {
          provider: "crawl-provider",
          providerVersion: "1",
          retrievalMethod: "authenticated-export",
          requestParameters: {},
          capturedAt: "2026-07-22T12:00:00.000Z",
          rawEvidenceId: "raw-crawl-001",
          sha256: hash,
          sidecars: [{ path: path.relative(root, sidecar), sha256: hash, mediaType: "application/json" }],
        },
      ],
      redaction: { logPath: "redaction-log.json", logSha256: hash },
    },
    { root },
  );
  expect(result.valid).toBe(false);
  expect(result.errors.join(" ")).toMatch(/must not store its own hash|sidecar hash mismatch/);
});

it("rejects a parent junction even when the final evidence file is regular", async () => {
  const root = await mkdtemp(path.join(tmpdir(), "floriva-junction-root-"));
  const outside = await mkdtemp(path.join(tmpdir(), "floriva-junction-outside-"));
  await writeFile(path.join(outside, "redaction-log.json"), "{}");
  await symlink(outside, path.join(root, "linked"), "junction");
  const result = validateExternalEvidence({ records: [], redaction: { logPath: "linked/redaction-log.json", logSha256: "44136fa355b3678a1146ad16f7e8649e94fb4fc21fe77e8310c060f61caaff8a" } }, { root });
  expect(result.errors.join(" ")).toMatch(/symlink\/junction\/reparse|reparse traversal/);
});
