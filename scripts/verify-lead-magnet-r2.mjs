import { execFileSync } from "node:child_process";
import { mkdtempSync, readFileSync, rmSync, statSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import ts from "typescript";
import { S3Client, GetObjectCommand } from "@aws-sdk/client-s3";

const root = path.resolve(import.meta.dirname, "..");
const sourcePath = path.join(root, "src", "site", "knowledge", "lead-magnet-email-data.ts");
const bucket = process.env.LEAD_MAGNET_R2_BUCKET ?? "floriva-lead-magnets";
const minBytes = 50_000;
const pnpmCommand = process.env.npm_execpath
  ? { command: process.execPath, prefixArgs: [process.env.npm_execpath] }
  : { command: process.platform === "win32" ? "pnpm.cmd" : "pnpm", prefixArgs: [] };

const s3Endpoint = process.env.R2_S3_ENDPOINT;
const s3AccessKey = process.env.R2_ACCESS_KEY_ID;
const s3Secret = process.env.R2_SECRET_ACCESS_KEY;
const useS3 = Boolean(s3Endpoint && s3AccessKey && s3Secret);
const s3 = useS3
  ? new S3Client({
      region: "auto",
      endpoint: s3Endpoint,
      credentials: { accessKeyId: s3AccessKey, secretAccessKey: s3Secret },
    })
  : null;

function getConfiguredSlugs() {
  const source = readFileSync(sourcePath, "utf8");
  const file = ts.createSourceFile(sourcePath, source, ts.ScriptTarget.Latest, true);
  const slugs = new Set();

  function visit(node) {
    if (
      ts.isPropertyAssignment(node) &&
      ts.isIdentifier(node.name) &&
      node.name.text === "slug" &&
      ts.isStringLiteral(node.initializer)
    ) {
      slugs.add(node.initializer.text);
    }

    ts.forEachChild(node, visit);
  }

  visit(file);
  return [...slugs].sort();
}

const tempDir = mkdtempSync(path.join(tmpdir(), "floriva-lead-magnets-"));
const slugs = getConfiguredSlugs();

try {
  if (slugs.length === 0) {
    throw new Error("No lead magnet resources found in src/site/knowledge/lead-magnet-email-data.ts.");
  }

  for (const slug of slugs) {
    const key = `lead-magnets/${slug}.pdf`;
    const outputPath = path.join(tempDir, `${slug}.pdf`);

    if (useS3) {
      const res = await s3.send(new GetObjectCommand({ Bucket: bucket, Key: key }));
      const bytes = Buffer.from(await res.Body.transformToByteArray());
      writeFileSync(outputPath, bytes);
    } else {
      execFileSync(
        pnpmCommand.command,
        [
          ...pnpmCommand.prefixArgs,
          "exec",
          "wrangler",
          "r2",
          "object",
          "get",
          `${bucket}/${key}`,
          "--remote",
          "--file",
          outputPath,
        ],
        { cwd: root, stdio: "pipe" },
      );
    }

    const header = readFileSync(outputPath).subarray(0, 5).toString("utf8");
    const size = statSync(outputPath).size;

    if (header !== "%PDF-") {
      throw new Error(`${key} is not a PDF.`);
    }

    if (size < minBytes) {
      throw new Error(`${key} is too small to be treated as a production resource (${size} bytes).`);
    }

    console.log(`verified ${key} (${size} bytes)`);
  }
} finally {
  rmSync(tempDir, { force: true, recursive: true });
}
