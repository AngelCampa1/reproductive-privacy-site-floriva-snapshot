import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

const rootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

describe("third-party widget contract", () => {
  it("does not install a third-party feedback widget in the public app shell", () => {
    const indexHtml = readFileSync(path.join(rootDir, "index.html"), "utf8");

    expect(indexHtml).not.toContain("widgets.ventoralabs.com/w/v1.js");
    expect(indexHtml).not.toContain('data-product="floriva-web"');
    expect(indexHtml).not.toContain('data-widget="feedback-button"');
  });
});
