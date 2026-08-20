#!/usr/bin/env node
import { promises as fs } from "node:fs";
import path from "node:path";
import matter from "gray-matter";

const rootDir = process.cwd();
const scanRoots = ["content", path.join("src", "components"), path.join("src", "pages"), path.join("src", "site")];
const allowedExtensions = new Set([".mdx", ".ts", ".tsx"]);

const conflictPatterns = [
  {
    name: "floriva-no-server-component-with-sync",
    regex:
      /\bFloriva\b[\s\S]{0,320}\b(?:no server component|no cloud storage|no cloud sync|no server-side storage|no server copy|no cloud uploads?|no servers?, no accounts?|no account\. no server|stores? (?:everything|all data) (?:only )?on your device(?: only)?|stores? (?:data|cycle data) only on your device|data (?:lives|stays) on your device only|data never (?:leaves|reaches)|nothing (?:is )?transmitted to (?:any|our) servers?|never transmitted to .* anyone else|nothing is transmitted|no data is transmitted anywhere|no uploads?|without storing it on a server|does not sync data to (?:our|company|Floriva) servers?|holds nothing on (?:its|our) servers?|data does not exist on any Floriva system|no server data to (?:share or )?subpoena|no data to (?:share|produce|subpoena)|stored entirely on your phone|stored exclusively on your phone|not on (?:Floriva's|our) servers|off vendor servers entirely|out of vendor systems entirely|never accidentally shares a pipeline|nowhere else)/i,
    guidance:
      "Use local-first copy: core records stay on device; optional end-to-end encrypted sync may transmit unreadable ciphertext.",
  },
  {
    name: "floriva-no-account-absolute",
    regex:
      /\bFloriva\b[\s\S]{0,260}\b(?:no account system|no accounts? to delete|no credentials to change|no account to connect|there are no accounts?|account-free in all cases|no account\. no server|no servers?, no accounts?)/i,
    guidance:
      "Say core tracking does not require an account. Optional sync, billing, or support flows may still create account-like access points.",
  },
  {
    name: "floriva-absolute-subpoena-claim",
    regex:
      /\b(?:Floriva\b[\s\S]{0,320}\b(?:cannot be subpoenaed|no subpoenas possible|nothing to hand over|no (?:server|centralized data store) to subpoena|no data to (?:produce|give|subpoena)|could not comply|law enforcement cannot subpoena|cannot comply with a subpoena|cannot produce any health data)|\bNeither can be subpoenaed\b|\bcannot comply with a subpoena\b|\bcould not comply\b)/i,
    guidance:
      "Avoid legal absolutes. Say Floriva has no readable central cycle database to produce, and device access is a separate legal path.",
  },
  {
    name: "generic-absolute-legal-privacy-claim",
    regex:
      /\b(?:cannot be subpoenaed|cannot be shared, sold, or subpoenaed|guarantees? that .* cannot|company cannot produce what it does not hold|apps? that store data only on your device cannot|there is nothing to produce|nothing to produce, nothing to sell, and nothing to breach|nothing to share or subpoena|data simply does not exist on (?:a|any) centralized server|law enforcement cannot access|cannot produce records in response to a subpoena|cannot produce any health data|cannot have a server-side security breach|makes (?:that|this|equivalent|data-sharing|data-selling|unwanted remote access) .* impossible|structurally impossible)\b/i,
    guidance:
      "Avoid absolute legal/privacy claims. Explain reduced company-side exposure and note device access, backups, exports, and legal process are separate risks.",
  },
  {
    name: "generic-local-only-overclaim",
    regex:
      /\b(?:all (?:personal |cycle |reproductive-health |health )?data (?:is )?(?:stored|kept) (?:exclusively|only|entirely) on (?:the )?(?:user )?(?:device|phone)|stores? (?:all|everything) (?:locally|on[- ]device)|store no data on servers|stores? data exclusively on your device|your data never leaves your phone|data never leaves your phone|never leave your phone|never transmitted to .* anyone else|held by any third party|zero reproductive health data leaving|no server (?:stores?|holds?|receives?|to contact|for anyone to subpoena)|no server-side copy|no server-side record|no server-side data|no server data transmission|no data is transmitted to .* servers|does not sync to cloud services|everything stays on your device|nowhere else)\b/i,
    guidance:
      "Use scoped local-first language. Core records stay on device; optional encrypted sync, backups, exports, billing, support, and anti-abuse records are separate.",
  },
  {
    name: "floriva-sync-without-encryption-qualifier",
    regex: /\bFloriva\b[^.\n]{0,180}\bcross-device sync\b/i,
    guidance:
      "When promoting sync, qualify it as optional encrypted sync unless the context is explicitly a competitor's cloud sync.",
  },
  {
    name: "floriva-import-overclaim",
    regex:
      /\bFloriva\b[\s\S]{0,260}\b(?:accepts (?:cycle data )?imports?|accepts CSV|import tool|Import Data|same date format|select your export file)/i,
    guidance:
      "Do not hardcode import support. Tell users to check Floriva onboarding for current import options, then manually enter key records if needed.",
  },
  {
    name: "floriva-detailed-field-overclaim",
    regex:
      /\bFloriva\b[\s\S]{0,320}\b(?:calculates your current phase|phase display|phase-aware logging|BBT shift|LH strip results|OPK result logging|cervical mucus changes|supports all three as loggable fields|supports the three pillars|supports temperature tracking|temperature tracking|ovulation prediction|biphasic BBT pattern|advanced cycle analytics|pattern visualization|detailed export|exportable history|doctor export|handles non-period bleeding|custom symptom categories|standard formats|chart displays the biphasic pattern|adds an ovulation log entry)/i,
    guidance:
      "Avoid unsupported detailed feature promises. Say Floriva supports daily logging and pattern review, and tell users to check current app onboarding for exact fields, charts, imports, and exports.",
  },
  {
    name: "floriva-hardcoded-store-availability",
    regex:
      /\bFloriva\b[\s\S]{0,180}\b(?:distributed through the Apple App Store and Google Play|download Floriva from (?:the )?(?:App Store|app stores|Google Play)|available on iOS and Android)\b/i,
    guidance:
      "Use config-aware store/download copy, or say to use current Floriva download options.",
  },
];

async function listFiles(dir) {
  const entries = await fs.readdir(dir, { withFileTypes: true });
  const files = await Promise.all(
    entries.map(async (entry) => {
      const fullPath = path.join(dir, entry.name);
      if (entry.isDirectory()) {
        if (fullPath.split(path.sep).includes("generated")) return [];
        return listFiles(fullPath);
      }
      if (entry.name === "content-manifest.ts") return [];
      return allowedExtensions.has(path.extname(entry.name)) ? [fullPath] : [];
    }),
  );
  return files.flat();
}

function lineForOffset(source, offset) {
  return source.slice(0, Math.max(0, offset)).split("\n").length;
}

function paragraphWindows(source, bodySource = source, bodyOffset = 0) {
  const normalized = bodySource.replace(/\r\n/g, "\n");
  const windows = [];
  const paragraphRegex = /[^\n](?:[\s\S]*?)(?=\n\s*\n|$)/g;
  for (const match of normalized.matchAll(paragraphRegex)) {
    const text = match[0].trim();
    if (!text) continue;
    windows.push({
      line: lineForOffset(source, bodyOffset + (match.index ?? 0)),
      source: "body",
      text,
    });
  }
  return windows;
}

function codeLineWindows(source) {
  return source
    .replace(/\r\n/g, "\n")
    .split("\n")
    .map((line, index) => ({
      line: index + 1,
      source: "body",
      text: line.trim(),
    }))
    .filter((window) => window.text);
}

function parseMatter(source) {
  try {
    return matter(source);
  } catch {
    return null;
  }
}

function frontmatterWindows(source, parsed) {
  const windows = [];
  if (!parsed) return windows;

  function visit(value, trail) {
    if (typeof value === "string") {
      const normalized = value.replace(/\s+/g, " ").trim();
      if (!normalized) return;
      const needle = normalized.slice(0, 80);
      const offset = needle ? source.indexOf(needle) : -1;
      windows.push({
        line: offset >= 0 ? lineForOffset(source, offset) : 1,
        source: `frontmatter.${trail}`,
        text: normalized,
      });
      return;
    }

    if (Array.isArray(value)) {
      value.forEach((item, index) => visit(item, `${trail}[${index}]`));
      return;
    }

    if (value && typeof value === "object") {
      for (const [key, nested] of Object.entries(value)) {
        visit(nested, trail ? `${trail}.${key}` : key);
      }
    }
  }

  visit(parsed.data, "");
  return windows;
}

function scanWindows(source, file) {
  if (path.extname(file) !== ".mdx") {
    return codeLineWindows(source);
  }

  const parsed = parseMatter(source);
  const body = parsed?.content ?? source;
  const bodyOffset = parsed ? source.indexOf(body) : 0;
  return [
    ...frontmatterWindows(source, parsed),
    ...paragraphWindows(source, body, bodyOffset >= 0 ? bodyOffset : 0),
  ];
}

function hasEncryptedSyncContext(source) {
  return /\b(?:optional|opt-in)?\s*(?:end-to-end\s+)?encrypted cross-device sync\b/i.test(source);
}

const files = (
  await Promise.all(
    scanRoots.map(async (scanRoot) => {
      try {
        return listFiles(path.join(rootDir, scanRoot));
      } catch (error) {
        if (error.code === "ENOENT") return [];
        throw error;
      }
    }),
  )
).flat();

const findings = [];

for (const file of files) {
  const source = await fs.readFile(file, "utf8");
  const relativeFile = path.relative(rootDir, file).replace(/\\/g, "/");
  const syncContext = hasEncryptedSyncContext(source);

  for (const window of scanWindows(source, file)) {
    for (const pattern of conflictPatterns) {
      if (pattern.hasSync && !syncContext) continue;
      if (!pattern.regex.test(window.text)) continue;
      if (
        pattern.name === "floriva-sync-without-encryption-qualifier" &&
        (/\b(?:encrypted|end-to-end encrypted|opt-in|optional)\b[^.\n]{0,80}\bcross-device sync\b/i.test(window.text) ||
          /\bno cross-device sync\b/i.test(window.text))
      ) {
        continue;
      }
      if (
        pattern.name === "floriva-import-overclaim" &&
        /\bcheck (?:current )?Floriva onboarding\b/i.test(window.text)
      ) {
        continue;
      }
      if (
        pattern.name === "floriva-no-server-component-with-sync" &&
        /\bFor basic tracking\b[\s\S]{0,140}\boptional (?:sync|account)\b/i.test(window.text)
      ) {
        continue;
      }
      if (
        pattern.name === "generic-absolute-legal-privacy-claim" &&
        /\bdoes not mean your phone cannot be subpoenaed directly\b/i.test(window.text)
      ) {
        continue;
      }
      if (
        pattern.name === "generic-local-only-overclaim" &&
        /\bpaper (?:chart|sheet|log|tracker|tracking|notebook)\b/i.test(window.text)
      ) {
        continue;
      }

      findings.push({
        file: relativeFile,
        line: window.line,
        rule: pattern.name,
        source: window.source,
        guidance: pattern.guidance,
        text: window.text.replace(/\s+/g, " ").slice(0, 260),
      });
    }
  }
}

if (findings.length > 0) {
  console.error(`verify-product-marketing-alignment: ${findings.length} finding(s)`);
  for (const finding of findings.slice(0, 80)) {
    console.error(`- ${finding.file}:${finding.line} [${finding.rule}; ${finding.source}] ${finding.text}`);
    console.error(`  ${finding.guidance}`);
  }
  if (findings.length > 80) {
    console.error(`- ...${findings.length - 80} more`);
  }
  process.exit(1);
}

console.log(`verify-product-marketing-alignment: ${files.length} files checked`);
