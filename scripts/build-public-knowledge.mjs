import { promises as fs } from "node:fs";
import path from "node:path";
import { createServer } from "vite";

const rootDir = process.cwd();
const outputPath = path.join(rootDir, "src", "site", "generated", "public-knowledge.json");
// Also emitted into public/ so the sanitized artifact is actually reachable at
// https://floriva.app/public-knowledge.json. Build-time consumers read the
// src/site/generated copy; AI crawlers (OAI-SearchBot, PerplexityBot) read this one.
const publicOutputPath = path.join(rootDir, "public", "public-knowledge.json");

const server = await createServer({
  appType: "custom",
  configFile: path.join(rootDir, "vite.config.ts"),
  logLevel: "error",
  optimizeDeps: {
    entries: [],
    noDiscovery: true,
  },
  server: { middlewareMode: true },
});

try {
  const knowledgeModule = await server.ssrLoadModule("/src/site/knowledge/index.ts");
  const artifact = knowledgeModule.toPublicKnowledgeArtifact();

  const serialized = `${JSON.stringify(artifact, null, 2)}\n`;

  await fs.mkdir(path.dirname(outputPath), { recursive: true });
  await fs.writeFile(outputPath, serialized, "utf8");

  await fs.mkdir(path.dirname(publicOutputPath), { recursive: true });
  await fs.writeFile(publicOutputPath, serialized, "utf8");
} finally {
  await server.close();
}
