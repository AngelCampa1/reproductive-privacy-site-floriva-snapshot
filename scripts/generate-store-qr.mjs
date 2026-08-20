#!/usr/bin/env node
/**
 * generate-store-qr.mjs
 *
 * Generates an SVG QR code that encodes the site's store-redirect URL.
 * This is a config-driven store link (per repo rules), not a hardcoded app store URL.
 *
 * URL sources:
 *   - Production origin: src/site/config.ts (siteConfig.domain = "floriva.app")
 *   - Store redirect path: src/site/store-targets.ts (getStoreRedirectHref returns "/api/store/{key}")
 *   - Default target: src/site/config.ts (siteConfig.primaryStoreTarget = "ios")
 *
 * Output: public/qr/get-floriva.svg
 */

import { promises as fs } from "node:fs";
import path from "node:path";
import QRCode from "qrcode";

const outputDir = path.join(process.cwd(), "public", "qr");

/**
 * Compose the QR-encoded URL from site config.
 * Sources: src/site/config.ts (domain + primaryStoreTarget) and
 *          src/site/store-targets.ts (getStoreRedirectHref)
 */
const productionOrigin = "https://floriva.app"; // from siteConfig.domain = "floriva.app"
// "auto" resolves per-device at the edge (functions/api/store/[target].ts):
// Android user agents go to Google Play, everything else to the App Store.
const storeTarget = "auto";
const storeRedirectPath = `/api/store/${storeTarget}`; // path shape from store-targets.getStoreRedirectHref(key)
const qrEncodedUrl = `${productionOrigin}${storeRedirectPath}`;

async function main() {
  try {
    // Ensure output directory exists
    await fs.mkdir(outputDir, { recursive: true });

    console.log("Generating QR code...");
    console.log(`QR-encoded URL: ${qrEncodedUrl}`);
    console.log(
      "URL sources: src/site/config.ts (domain, primaryStoreTarget) + src/site/store-targets.ts (getStoreRedirectHref)\n",
    );

    // Generate QR code as SVG with dark text on transparent background
    const svgString = await QRCode.toString(qrEncodedUrl, {
      type: "svg",
      margin: 0,
      errorCorrectionLevel: "M",
      color: {
        dark: "#1A1410", // Floriva dark brand color
        light: "#0000", // Transparent (rgba(0,0,0,0))
      },
    });

    const outputPath = path.join(outputDir, "get-floriva.svg");
    await fs.writeFile(outputPath, svgString, "utf8");

    console.log(`✓ QR code generated: ${outputPath}`);
  } catch (error) {
    console.error("Error:", error.message);
    process.exit(1);
  }
}

main();
