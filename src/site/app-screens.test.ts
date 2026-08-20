import { describe, expect, it } from "vitest";
import { promises as fs } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.join(__dirname, "../..");
const appScreensDir = path.join(rootDir, "public", "app-screens");
const qrDir = path.join(rootDir, "public", "qr");

// Expected 7 screenshots × 3 widths × 2 formats
const screenshotNames = [
  "today",
  "calendar",
  "insights",
  "logging",
  "privacy-settings",
  "condition-aware",
  "ttc-birth-control",
];
const widths = [402, 804, 1206];
const formats = ["avif", "webp"];

const expectedFiles = screenshotNames.flatMap((name) =>
  widths.flatMap((width) => formats.map((fmt) => `${name}-${width}.${fmt}`)),
);

describe("app-screens assets", () => {
  it("generates all 42 optimized screenshot files", async () => {
    for (const fileName of expectedFiles) {
      const filePath = path.join(appScreensDir, fileName);
      const stats = await fs.stat(filePath);
      expect(stats.size).toBeGreaterThan(0);
    }
  });

  it("keeps all files under 400KB", async () => {
    const maxSize = 400 * 1024; // 400KB

    for (const fileName of expectedFiles) {
      const filePath = path.join(appScreensDir, fileName);
      const stats = await fs.stat(filePath);
      expect(stats.size).toBeLessThan(maxSize);
    }
  });

  it("generates valid QR SVG from config-driven store URL", async () => {
    const qrPath = path.join(qrDir, "get-floriva.svg");
    const content = await fs.readFile(qrPath, "utf8");

    // Verify it's valid SVG
    expect(content.startsWith("<svg") || content.startsWith("<?xml")).toBe(true);
    expect(content).toContain("</svg>");

    // Verify it's NOT a hardcoded store URL
    // (the intent is config-driven, per repo rules)
    expect(content).not.toContain("apps.apple.com");
    expect(content).not.toContain("play.google.com");
  });

  it("uses config-driven store URLs in generator (not hardcoded)", async () => {
    // Read the generator script and verify it references store-targets/config
    const generatorPath = path.join(rootDir, "scripts", "generate-store-qr.mjs");
    const generatorContent = await fs.readFile(generatorPath, "utf8");

    // Assert the script references the config sources
    expect(generatorContent).toContain("src/site/config.ts");
    expect(generatorContent).toContain("src/site/store-targets.ts");

    // Assert it's not hardcoding store URLs
    expect(generatorContent).not.toContain("apps.apple.com");
    expect(generatorContent).not.toContain("play.google.com");
  });
});
