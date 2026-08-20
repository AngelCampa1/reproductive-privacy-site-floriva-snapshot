import { promises as fs } from "node:fs";
import path from "node:path";

const distAssetsDir = path.join(process.cwd(), "dist", "assets");

async function main() {
  let entries = [];

  try {
    entries = await fs.readdir(distAssetsDir, { withFileTypes: true });
  } catch (error) {
    if ((error && typeof error === "object" && "code" in error && error.code === "ENOENT")) {
      return;
    }

    throw error;
  }

  await Promise.all(
    entries
      .filter((entry) => entry.isFile() && entry.name.endsWith(".map"))
      .map((entry) => fs.rm(path.join(distAssetsDir, entry.name), { force: true })),
  );
}

await main();
