#!/usr/bin/env node
/**
 * optimize-app-screens.mjs
 *
 * Optimizes iOS app store screenshots for web display across multiple widths.
 * Generates AVIF and WebP variants at 402px, 804px, and 1206px widths.
 *
 * Usage: node scripts/optimize-app-screens.mjs --source <dir>
 *
 * Output: 42 files in public/app-screens/ (7 screenshots × 3 widths × 2 formats)
 */

import { promises as fs } from "node:fs";
import path from "node:path";
import sharp from "sharp";

const args = process.argv.slice(2);
const sourceIndex = args.indexOf("--source");
const sourceDir = sourceIndex >= 0 ? args[sourceIndex + 1] : null;
if (!sourceDir) {
  console.error(
    "Usage: node scripts/optimize-app-screens.mjs --source <dir>\n" +
      "Point --source at the app repo's store-screens directory, e.g. floriva-app/docs/qa/<sweep>/ios/store-screens/.",
  );
  process.exit(1);
}

const outputDir = path.join(process.cwd(), "public", "app-screens");

// Process exactly these 7 screenshots (skip paywall.png)
const screenshotNames = [
  "today.png",
  "calendar.png",
  "insights.png",
  "logging.png",
  "privacy-settings.png",
  "condition-aware.png",
  "ttc-birth-control.png",
];

const widths = [402, 804, 1206];
const formats = [
  { ext: "avif", opts: { quality: 50 } },
  { ext: "webp", opts: { quality: 78 } },
];

const expectedDimensions = { width: 1206, height: 2622 };

/**
 * Verify source image dimensions match expected 1206x2622
 */
async function verifySourceDimensions(imagePath) {
  const metadata = await sharp(imagePath).metadata();

  if (
    metadata.width !== expectedDimensions.width ||
    metadata.height !== expectedDimensions.height
  ) {
    throw new Error(
      `Invalid dimensions for ${path.basename(imagePath)}: expected ${expectedDimensions.width}x${expectedDimensions.height}, got ${metadata.width}x${metadata.height}`,
    );
  }
}

/**
 * Process a single screenshot across all widths and formats
 */
async function processScreenshot(screenshotPath, baseName) {
  const results = [];

  for (const width of widths) {
    const pipeline = sharp(screenshotPath).resize(width, Math.round((width / 1206) * 2622), {
      fit: "cover",
      position: "center",
    });

    for (const format of formats) {
      const outputName = `${baseName}-${width}.${format.ext}`;
      const outputPath = path.join(outputDir, outputName);

      let buffer;
      if (format.ext === "avif") {
        buffer = await pipeline.avif(format.opts).toBuffer();
      } else if (format.ext === "webp") {
        buffer = await pipeline.webp(format.opts).toBuffer();
      }

      await fs.writeFile(outputPath, buffer);

      const stats = await fs.stat(outputPath);
      results.push({
        file: outputName,
        size: stats.size,
      });
    }
  }

  return results;
}

/**
 * Main execution
 */
async function main() {
  try {
    // Ensure output directory exists
    await fs.mkdir(outputDir, { recursive: true });

    console.log(`Processing screenshots from: ${sourceDir}\n`);

    const allResults = [];
    let totalSize = 0;

    // Process each screenshot
    for (const screenshotName of screenshotNames) {
      const sourcePath = path.join(sourceDir, screenshotName);

      // Verify source exists
      try {
        await fs.access(sourcePath);
      } catch {
        throw new Error(`Source file not found: ${sourcePath}`);
      }

      // Verify dimensions
      await verifySourceDimensions(sourcePath);

      // Process and collect results
      const baseName = screenshotName.replace(/\.png$/, "");
      const results = await processScreenshot(sourcePath, baseName);

      for (const result of results) {
        allResults.push(result);
        totalSize += result.size;
      }

      console.log(`✓ ${screenshotName}`);
    }

    // Print size report table
    console.log("\n" + "=".repeat(60));
    console.log("Size Report (KB)");
    console.log("=".repeat(60));

    const byScreenshot = {};
    for (const result of allResults) {
      const match = result.file.match(/^(.+?)-(\d+)\./);
      if (match) {
        const screenshot = match[1];
        if (!byScreenshot[screenshot]) {
          byScreenshot[screenshot] = [];
        }
        byScreenshot[screenshot].push(result);
      }
    }

    let screenshotTotal = 0;
    for (const screenshot of screenshotNames.map((n) => n.replace(/\.png$/, ""))) {
      if (byScreenshot[screenshot]) {
        const size = byScreenshot[screenshot].reduce((sum, r) => sum + r.size, 0);
        console.log(`${screenshot.padEnd(25)} ${(size / 1024).toFixed(2)} KB`);
        screenshotTotal += size;
      }
    }

    console.log("-".repeat(60));
    console.log(`${"Total".padEnd(25)} ${(totalSize / 1024).toFixed(2)} KB`);
    console.log(`${"AVIF subtotal".padEnd(25)} ${(allResults.filter((r) => r.file.endsWith(".avif")).reduce((sum, r) => sum + r.size, 0) / 1024).toFixed(2)} KB`);
    console.log(`${"WebP subtotal".padEnd(25)} ${(allResults.filter((r) => r.file.endsWith(".webp")).reduce((sum, r) => sum + r.size, 0) / 1024).toFixed(2)} KB`);
    console.log("=".repeat(60));
    console.log(`Generated ${allResults.length} files in ${outputDir}`);
  } catch (error) {
    console.error("Error:", error.message);
    process.exit(1);
  }
}

main();
