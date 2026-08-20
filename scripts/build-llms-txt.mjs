import { promises as fs } from "node:fs";
import path from "node:path";

const rootDir = process.cwd();
const publicDir = path.join(rootDir, "public");
const generatedPath = path.join(rootDir, "src", "site", "generated", "content-data.ts");
const publicKnowledgePath = path.join(rootDir, "src", "site", "generated", "public-knowledge.json");
const baseUrl = "https://floriva.app";

async function loadContentEntries() {
  const source = await fs.readFile(generatedPath, "utf8");
  const arrayStart = source.indexOf("[");
  const arrayEnd = source.lastIndexOf("]");
  if (arrayStart === -1 || arrayEnd === -1) {
    throw new Error("Could not locate content entries array in generated file.");
  }
  return JSON.parse(source.slice(arrayStart, arrayEnd + 1));
}

async function loadPublicKnowledge() {
  return JSON.parse(await fs.readFile(publicKnowledgePath, "utf8"));
}

function formatEntryLine(entry) {
  return `- [${entry.title}](${baseUrl}${entry.routePath}): ${entry.description}`;
}

function section(title, entries) {
  if (entries.length === 0) return "";
  return `## ${title}\n\n${entries.map(formatEntryLine).join("\n")}\n`;
}

const [contentEntries, publicKnowledge] = await Promise.all([
  loadContentEntries(),
  loadPublicKnowledge(),
]);
const llmsKnowledge = publicKnowledge.marketing.llms;
const collectionLabels = llmsKnowledge.collectionLabels;

// Don't advertise routes we've withdrawn from the index. Selection here is
// "top 3 by title", so without this filter *which* noindexed pages leak into the
// LLM-facing discovery file changes silently whenever a title changes.
const noindexRoutePaths = new Set(
  JSON.parse(await fs.readFile(path.join(rootDir, "src", "site", "index-policy.json"), "utf8"))
    .noindexRoutePaths,
);

const byCollection = (name) =>
  contentEntries
    .filter((entry) => entry.collection === name)
    .filter((entry) => !noindexRoutePaths.has(entry.routePath))
    .sort((a, b) => a.title.localeCompare(b.title))
    .slice(0, 3);

const header = `# ${publicKnowledge.brand.name}

> ${publicKnowledge.marketing.llmsHeader} ${llmsKnowledge.userIntentSummary}

Site: ${baseUrl}
Sitemap: ${baseUrl}/sitemap.xml
Structured knowledge (JSON): ${baseUrl}/public-knowledge.json

${llmsKnowledge.corePositioningHeading}:
${llmsKnowledge.corePositioningBullets.map((detail) => `- ${detail}`).join("\n")}

## ${llmsKnowledge.hubsHeading}

${llmsKnowledge.hubLinks.map((link) => `- [${link.label}](${baseUrl}${link.href}): ${link.description}`).join("\n")}
`;

const body = Object.entries(collectionLabels)
  .map(([collection, label]) => section(label, byCollection(collection)))
  .filter(Boolean)
  .join("\n");

const output = `${header}\n${body}`;

await fs.mkdir(publicDir, { recursive: true });
await fs.writeFile(path.join(publicDir, "llms.txt"), output, "utf8");
