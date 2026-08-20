import { promises as fs } from "node:fs";
import path from "node:path";
import remarkGfm from "remark-gfm";
import remarkParse from "remark-parse";
import { unified } from "unified";

import { literal } from "./lib/html-replace.mjs";

const rootDir = process.cwd();
const distDir = path.join(rootDir, "dist");
const indexPath = path.join(distDir, "index.html");
const contentDataPath = path.join(rootDir, "src", "site", "generated", "content-data.ts");
const sitemapPath = path.join(rootDir, "public", "sitemap.xml");
const publicKnowledgePath = path.join(rootDir, "src", "site", "generated", "public-knowledge.json");
const baseUrl = "https://floriva.app";
const siteName = "Floriva";
const defaultOgImage = "/og/default.png";
const indexPolicyPath = path.join(rootDir, "src", "site", "index-policy.json");
const noindexRoutePaths = new Set(
  JSON.parse(await fs.readFile(indexPolicyPath, "utf8")).noindexRoutePaths,
);
const publicKnowledge = JSON.parse(await fs.readFile(publicKnowledgePath, "utf8"));
const siteSeo = publicKnowledge.seo;
const homeTagline = publicKnowledge.marketing.homepage.tagline;

const hubMeta = {
  "/compare": "Compare period trackers",
  "/compare/alternatives": "Private alternatives to mainstream period trackers",
  "/compare/versus": "Period tracker privacy comparisons",
  "/compare/pricing": "Period tracker pricing breakdowns",
  "/resources": "Floriva privacy resources",
  "/resources/best": "Best private period tracker lists",
  "/resources/guides": "Floriva privacy guides",
  "/resources/health": "Health tracking resources",
  "/resources/symptom-guides": "Symptom Guides",
  "/resources/condition-guides": "Condition Guides",
  "/resources/hormone-guides": "Hormone Guides",
  "/resources/life-stage-guides": "Life Stage Guides",
  "/resources/privacy-in-practice": "Privacy in Practice",
  "/resources/wellness-guides": "Wellness Guides",
  "/app-guides": "App Guides",
  "/free": "Free Floriva privacy resources",
  "/period-tracker-privacy": "Period tracker privacy by state",
  "/get": "Get Floriva",
  "/privacy": "Floriva Privacy Policy",
  "/privacy-features": "Floriva Privacy Features",
  "/support": "Floriva Support",
  "/terms": "Floriva Terms of Service",
};

/* Every hub used to fall back to the one string "Floriva resources and
   comparison pages." — for its visible intro AND its <meta name="description">.
   That shipped an identical meta description on ~19 routes.

   These mirror the descriptions passed to `hubElement(...)` in src/router.tsx.
   Keep the two in step; `prerender-hub-copy.test.ts` fails if a hub is missing
   here. */
const hubDescriptions = {
  "/compare":
    "Switch pages, side-by-side comparisons, prices, and ranked lists. For people leaving a big-name tracker.",
  "/compare/alternatives": "Switching pages for people leaving Flo, Clue, Premom, and the rest.",
  "/compare/versus": "Two trackers, side by side. We check privacy and price.",
  "/compare/pricing": "What each tracker charges. What the free tier asks for instead.",
  "/resources": "Every guide, list, and download. Grouped by what you came to find.",
  "/resources/best": "Trackers ranked by where they keep your data, for a specific need.",
  "/resources/guides": "Research on privacy and the law. Plus steps you can take yourself.",
  "/resources/health":
    "Health tracking guides for symptoms, conditions, hormones, wellness, and life-stage changes.",
  "/resources/symptom-guides": "What to log when a symptom is the reason you are tracking.",
  "/resources/condition-guides": "Cycle tracking guidance for PCOS, endometriosis, PMDD, thyroid, and fibroids.",
  "/resources/hormone-guides": "How estrogen, progesterone, and cortisol move across the cycle.",
  "/resources/life-stage-guides": "How your cycle changes from your first period to perimenopause.",
  "/resources/privacy-in-practice":
    "Practical privacy steps for school devices, insurance, backups, and shared phones.",
  "/resources/wellness-guides": "What the evidence says about food, sleep, and exercise across the cycle.",
  "/app-guides": "Setup guides and feature walkthroughs for Floriva.",
  "/free": "Free worksheets, checklists, scripts, and templates you can download and keep.",
  "/period-tracker-privacy":
    "What your state's law means for your cycle data. One page per state.",
  "/tools/quiz": "Short self-checks that turn into a concrete next step.",
};

const hubCollections = {
  "/compare": ["alternatives", "comparisons", "pricing-breakdowns", "listicles"],
  "/compare/alternatives": ["alternatives"],
  "/compare/versus": ["comparisons"],
  "/compare/pricing": ["pricing-breakdowns"],
  "/resources": [
    "guides",
    "listicles",
    "lead-magnets",
    "symptom-guides",
    "condition-guides",
    "hormone-guides",
    "life-stage-guides",
    "privacy-in-practice",
    "wellness-guides",
  ],
  "/resources/best": ["listicles"],
  "/resources/guides": ["guides", "privacy-in-practice"],
  "/resources/health": ["symptom-guides", "condition-guides", "hormone-guides", "wellness-guides", "life-stage-guides"],
  "/resources/symptom-guides": ["symptom-guides"],
  "/resources/condition-guides": ["condition-guides"],
  "/resources/hormone-guides": ["hormone-guides"],
  "/resources/life-stage-guides": ["life-stage-guides"],
  "/resources/privacy-in-practice": ["privacy-in-practice"],
  "/resources/wellness-guides": ["wellness-guides"],
  "/app-guides": ["app-guides"],
  "/free": ["lead-magnets"],
  "/period-tracker-privacy": ["reproductive-privacy-state-pages"],
  "/tools/quiz": ["questionnaires"],
};

function escapeHtml(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

function escapeJsonForHtml(value) {
  return JSON.stringify(value).replace(/</g, "\\u003c");
}

function absoluteUrl(pathname) {
  return new URL(pathname, baseUrl).toString();
}

function buildOgImageUrl(pathOrUrl) {
  const resolved = pathOrUrl || defaultOgImage;
  return /^https?:\/\//i.test(resolved) ? resolved : absoluteUrl(resolved);
}

function replaceHeadTag(html, pattern, replacement) {
  return pattern.test(html)
    ? html.replace(pattern, literal(replacement))
    : html.replace("</head>", literal(`  ${replacement}\n</head>`));
}

function buildBreadcrumbJsonLd(pathname, title) {
  const segments = pathname.split("/").filter(Boolean);
  if (segments.length === 0) return null;

  return {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      {
        "@type": "ListItem",
        position: 1,
        name: "Home",
        item: `${baseUrl}/`,
      },
      ...segments.map((segment, index) => {
        const itemPath = `/${segments.slice(0, index + 1).join("/")}`;
        return {
          "@type": "ListItem",
          position: index + 2,
          name: index === segments.length - 1 ? title : segment.replaceAll("-", " "),
          item: absoluteUrl(itemPath),
        };
      }),
    ],
  };
}

// Mirrors buildOrganizationJsonLd / buildMobileApplicationJsonLd in
// src/site/structured-data.ts. Both builders must stay in step: production goes
// through the edge middleware, but vite preview and the verify-* scripts read
// these static files. See structured-data.ts for why offers/ratings are omitted.
function buildOrganizationJsonLd() {
  return {
    "@context": "https://schema.org",
    "@type": "Organization",
    "@id": `${baseUrl}/#organization`,
    name: siteSeo.organization.legalName,
    url: `${baseUrl}/`,
    logo: `${baseUrl}/logo-mark.png`,
    sameAs: [...siteSeo.organization.sameAs],
  };
}

function buildMobileApplicationJsonLd() {
  const storeUrls = [publicKnowledge.storePresentation.ios.url, publicKnowledge.storePresentation.android.url]
    .filter(Boolean);

  return {
    "@context": "https://schema.org",
    "@type": "MobileApplication",
    "@id": `${baseUrl}/#app`,
    name: siteSeo.name,
    description: siteSeo.metaDescription,
    url: `${baseUrl}/get`,
    applicationCategory: "HealthApplication",
    operatingSystem: ["iOS", "Android"],
    image: `${baseUrl}/logo-mark.png`,
    inLanguage: "en",
    isAccessibleForFree: false,
    sameAs: storeUrls,
    publisher: { "@id": `${baseUrl}/#organization` },
  };
}

function buildJsonLd(pathname, meta, entry) {
  const blocks = [];

  if (pathname === "/") {
    blocks.push(
      {
        "@context": "https://schema.org",
        "@type": "WebSite",
        "@id": `${baseUrl}/#website`,
        name: siteSeo.name,
        url: `${baseUrl}/`,
        description: siteSeo.metaDescription,
        inLanguage: "en",
        publisher: { "@id": `${baseUrl}/#organization` },
      },
      buildOrganizationJsonLd(),
      buildMobileApplicationJsonLd(),
    );
  } else if (pathname === "/get") {
    blocks.push(buildOrganizationJsonLd(), buildMobileApplicationJsonLd());
  }

  const breadcrumb = buildBreadcrumbJsonLd(pathname, meta.title);
  if (breadcrumb) blocks.push(breadcrumb);

  if (entry) {
    // Must mirror buildPageJsonLd in src/site/structured-data.ts: same
    // Organization node, same @id-reference publisher. The edge middleware
    // replaces this markup with that builder's output in production, so any
    // divergence means preview and the verify-* scripts validate a document
    // Google never receives.
    blocks.push(buildOrganizationJsonLd(), {
      "@context": "https://schema.org",
      "@type": "Article",
      mainEntityOfPage: { "@type": "WebPage", "@id": meta.canonical },
      headline: entry.title,
      description: entry.description,
      image: meta.ogImage,
      datePublished: entry.publishedAt,
      dateModified: entry.updatedAt,
      inLanguage: "en",
      author: { "@type": "Organization", name: siteName, url: `${baseUrl}/` },
      publisher: { "@id": `${baseUrl}/#organization` },
      publishingPrinciples: `${baseUrl}/support#editorial-method`,
    });

    // Derived from the same pairs renderStructuredPayloads emits as visible
    // HTML. Never mark up content that is not on the page.
    const faqPairs = resolveFaqPairs(entry);
    if (faqPairs.length > 0) {
      blocks.push({
        "@context": "https://schema.org",
        "@type": "FAQPage",
        mainEntity: faqPairs.map((faq) => ({
          "@type": "Question",
          name: faq.question,
          acceptedAnswer: { "@type": "Answer", text: faq.answer },
        })),
      });
    }
  }

  return blocks;
}

function resolveMeta(pathname, entry) {
  const title = entry?.seoTitle ?? (pathname === "/" ? siteSeo.homeTitle : hubMeta[pathname]) ?? "Floriva";
  const description =
    entry?.metaDescription
    ?? (pathname === "/" ? siteSeo.metaDescription : undefined)
    ?? hubDescriptions[pathname]
    ?? publicKnowledge.staticPages?.[pathname.slice(1)]?.description
    ?? siteSeo.metaDescription;
  const ogImage = buildOgImageUrl(entry?.ogImage);
  return {
    canonical: absoluteUrl(pathname),
    description,
    ogImage,
    title,
    type: entry ? "article" : "website",
  };
}

function injectHead(indexHtml, pathname, entry) {
  const meta = resolveMeta(pathname, entry);
  let html = indexHtml;

  html = html.replace(/<title>[\s\S]*?<\/title>/i, literal(`<title>${escapeHtml(meta.title)}</title>`));
  html = replaceHeadTag(html, /<meta\s+name=["']description["']\s+content=["'][^"']*["']\s*\/?>/i, `<meta name="description" content="${escapeHtml(meta.description)}" />`);
  // Mirrors robotsDirective() in src/site/index-policy.ts. "follow", not
  // "nofollow": these pages stay live and linked, so their outbound links
  // still count. Only 404s (which are never prerendered) get nofollow.
  const robots = noindexRoutePaths.has(pathname) ? "noindex, follow" : "index, follow";
  html = replaceHeadTag(html, /<meta\s+name=["']robots["']\s+content=["'][^"']*["']\s*\/?>/i, `<meta name="robots" content="${robots}" />`);
  html = replaceHeadTag(html, /<meta\s+property=["']og:title["']\s+content=["'][^"']*["']\s*\/?>/i, `<meta property="og:title" content="${escapeHtml(meta.title)}" />`);
  html = replaceHeadTag(html, /<meta\s+property=["']og:description["']\s+content=["'][^"']*["']\s*\/?>/i, `<meta property="og:description" content="${escapeHtml(meta.description)}" />`);
  html = replaceHeadTag(html, /<meta\s+property=["']og:type["']\s+content=["'][^"']*["']\s*\/?>/i, `<meta property="og:type" content="${meta.type}" />`);
  html = replaceHeadTag(html, /<meta\s+property=["']og:url["']\s+content=["'][^"']*["']\s*\/?>/i, `<meta property="og:url" content="${escapeHtml(meta.canonical)}" />`);
  html = replaceHeadTag(html, /<meta\s+property=["']og:image["']\s+content=["'][^"']*["']\s*\/?>/i, `<meta property="og:image" content="${escapeHtml(meta.ogImage)}" />`);
  html = replaceHeadTag(html, /<meta\s+name=["']twitter:title["']\s+content=["'][^"']*["']\s*\/?>/i, `<meta name="twitter:title" content="${escapeHtml(meta.title)}" />`);
  html = replaceHeadTag(html, /<meta\s+name=["']twitter:description["']\s+content=["'][^"']*["']\s*\/?>/i, `<meta name="twitter:description" content="${escapeHtml(meta.description)}" />`);
  html = replaceHeadTag(html, /<meta\s+name=["']twitter:image["']\s+content=["'][^"']*["']\s*\/?>/i, `<meta name="twitter:image" content="${escapeHtml(meta.ogImage)}" />`);
  html = replaceHeadTag(html, /<link\s+rel=["']canonical["']\s+href=["'][^"']*["']\s*\/?>/i, `<link rel="canonical" href="${escapeHtml(meta.canonical)}" />`);

  const jsonLd = buildJsonLd(pathname, meta, entry);
  if (jsonLd.length > 0) {
    html = html.replace(
      "</head>",
      literal(`  <script type="application/ld+json" data-seo-jsonld-edge>${escapeJsonForHtml(jsonLd)}</script>\n</head>`),
    );
  }

  return html;
}

const markdownParser = unified().use(remarkParse).use(remarkGfm);

function normalizeInternalHref(href) {
  if (!/^\/(?!\/)/.test(href)) {
    return href;
  }
  const [pathnamePart, ...rest] = href.split(/(?=[#?])/);
  const normalized = pathnamePart.replace(/\/+$/, "") || "/";
  return [normalized, ...rest].join("");
}

function safeLinkHref(value) {
  const href = String(value ?? "").trim();
  if (
    /^\/(?!\/)/.test(href)
    || /^#[a-z0-9_-]+$/i.test(href)
    || /^https?:\/\//i.test(href)
    || /^mailto:/i.test(href)
  ) {
    return normalizeInternalHref(href);
  }
  return null;
}

function markdownNodeText(node) {
  if (!node || typeof node !== "object") {
    return "";
  }
  if (node.type === "text" || node.type === "inlineCode" || node.type === "code") {
    return String(node.value ?? "");
  }
  if (node.type === "image") {
    return String(node.alt ?? "");
  }
  return (node.children ?? []).map(markdownNodeText).join("");
}

function slugifyHeading(value) {
  return String(value ?? "")
    .toLowerCase()
    .replace(/[^a-z0-9\s-]+/g, "")
    .trim()
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-");
}

function renderTableRow(node, cellTag, context) {
  const cells = (node.children ?? [])
    .map((cell) => `<${cellTag}>${(cell.children ?? []).map((child) => renderMarkdownNode(child, context)).join("")}</${cellTag}>`)
    .join("");
  return `<tr>${cells}</tr>`;
}

function renderMarkdownNode(node, context) {
  if (!node || typeof node !== "object") {
    return "";
  }

  const renderChildren = () => (node.children ?? [])
    .map((child) => renderMarkdownNode(child, context))
    .join("");

  switch (node.type) {
    case "root":
      return (node.children ?? [])
        .map((child) => renderMarkdownNode(child, context))
        .filter(Boolean)
        .join("\n");
    case "text":
      return escapeHtml(node.value);
    case "paragraph":
      return `<p>${renderChildren()}</p>`;
    case "heading": {
      const depth = node.depth === 1 ? 2 : Math.min(Math.max(node.depth ?? 2, 2), 6);
      if (depth !== 2) {
        return `<h${depth}>${renderChildren()}</h${depth}>`;
      }
      const base = slugifyHeading(markdownNodeText(node));
      const count = context.headingCounts.get(base) ?? 0;
      context.headingCounts.set(base, count + 1);
      const id = count === 0 ? base : `${base}-${count}`;
      return `<h2 id="${escapeHtml(id)}">${renderChildren()}</h2>`;
    }
    case "emphasis":
      return `<em>${renderChildren()}</em>`;
    case "strong":
      return `<strong>${renderChildren()}</strong>`;
    case "delete":
      return `<del>${renderChildren()}</del>`;
    case "inlineCode":
      return `<code>${escapeHtml(node.value)}</code>`;
    case "code": {
      const language = /^[a-z0-9_-]+$/i.test(node.lang ?? "") ? ` class="language-${escapeHtml(node.lang)}"` : "";
      return `<pre><code${language}>${escapeHtml(node.value)}</code></pre>`;
    }
    case "break":
      return "<br />";
    case "thematicBreak":
      return "<hr />";
    case "blockquote":
      return `<blockquote>${renderChildren()}</blockquote>`;
    case "link": {
      const href = safeLinkHref(node.url);
      return href ? `<a href="${escapeHtml(href)}">${renderChildren()}</a>` : renderChildren();
    }
    case "image":
      return escapeHtml(node.alt ?? "");
    case "list": {
      const tag = node.ordered ? "ol" : "ul";
      const start = node.ordered && Number.isInteger(node.start) && node.start !== 1
        ? ` start="${node.start}"`
        : "";
      return `<${tag}${start}>${renderChildren()}</${tag}>`;
    }
    case "listItem":
      return `<li>${renderChildren()}</li>`;
    case "table": {
      const [heading, ...rows] = node.children ?? [];
      const head = heading ? `<thead>${renderTableRow(heading, "th", context)}</thead>` : "";
      const body = rows.length > 0
        ? `<tbody>${rows.map((row) => renderTableRow(row, "td", context)).join("")}</tbody>`
        : "";
      return `<table>${head}${body}</table>`;
    }
    case "tableRow":
      return `<tr>${renderChildren()}</tr>`;
    case "tableCell":
      return `<td>${renderChildren()}</td>`;
    case "html":
      return escapeHtml(node.value);
    default:
      return renderChildren();
  }
}

function renderPrerenderedText(markdown) {
  const tree = markdownParser.parse(String(markdown ?? ""));
  return renderMarkdownNode(tree, { headingCounts: new Map() })
    .split("\n")
    .map((line) => `    ${line}`)
    .join("\n");
}

function extractInternalMarkdownLinks(markdown) {
  const links = [];
  const seen = new Set();

  for (const match of String(markdown ?? "").matchAll(/\[([^\]]+)]\((\/[^)\s#?]+)[^)]*\)/g)) {
    const href = match[2].replace(/\/+$/, "") || "/";
    if (seen.has(href)) {
      continue;
    }
    seen.add(href);
    links.push({
      href,
      label: match[1].replace(/\s+/g, " ").trim() || href.split("/").at(-1)?.replaceAll("-", " ") || href,
    });
  }

  return links;
}

// --- Structured payload rendering -------------------------------------------
// Mirrors the section order in src/pages/content-page.tsx so the HTML served to
// crawlers matches the DOM React renders. Anything emitted into JSON-LD must
// also be emitted here as visible content.

function textList(values) {
  return (values ?? []).map((value) => String(value ?? "").trim()).filter(Boolean);
}

function section(id, heading, inner, headingLevel = 2) {
  if (!inner) {
    return "";
  }
  return `    <section id="${escapeHtml(id)}">
      <h${headingLevel}>${escapeHtml(heading)}</h${headingLevel}>
${inner}
    </section>`;
}

function renderBullets(values) {
  const items = textList(values);
  if (items.length === 0) {
    return "";
  }
  return `      <ul>${items.map((item) => `<li>${escapeHtml(item)}</li>`).join("")}</ul>`;
}

function renderStateFacts(entry) {
  const rows = [
    ["State", entry.state],
    ["Abortion law", entry.abortionLawStatus],
    ["Data protection", entry.dataProtectionLevel],
    ["Subpoena risk", entry.subpoenaRisk],
  ].filter(([, value]) => Boolean(value));
  const facts = textList(entry.keyFacts);
  if (rows.length === 0 && facts.length === 0) {
    return "";
  }
  const definitionList = rows.length > 0
    ? `      <dl>${rows.map(([term, value]) => `<dt>${escapeHtml(term)}</dt><dd>${escapeHtml(value)}</dd>`).join("")}</dl>`
    : "";
  return section("key-facts", "Key facts", [definitionList, renderBullets(facts)].filter(Boolean).join("\n"));
}

function renderDefinitions(entry) {
  const items = (entry.definitions ?? []).filter((item) => item?.term && item?.definition);
  if (items.length === 0) {
    return "";
  }
  const inner = `      <dl>${items
    .map((item) => `<dt>${escapeHtml(item.term)}</dt><dd>${escapeHtml(item.definition)}</dd>`)
    .join("")}</dl>`;
  return section("definitions", "Definitions", inner);
}

function renderPricingStats(entry) {
  const items = (entry.pricingStats ?? []).filter((item) => item?.stat);
  if (items.length === 0) {
    return "";
  }
  const inner = `      <ul>${items
    .map((item) => {
      const source = item.sourceUrl
        ? ` <a href="${escapeHtml(item.sourceUrl)}" rel="nofollow noreferrer">${escapeHtml(item.source ?? "Source")}</a>`
        : item.source
          ? ` <span>${escapeHtml(item.source)}</span>`
          : "";
      return `<li><strong>${escapeHtml(item.stat)}</strong>${source}</li>`;
    })
    .join("")}</ul>`;
  return section("cited-signals", "Cited signals", inner);
}

function renderTiers(entry) {
  const items = (entry.tiers ?? []).filter((tier) => tier?.name);
  if (items.length === 0) {
    return "";
  }
  const inner = `      <table>
        <thead><tr><th scope="col">Plan</th><th scope="col">Price</th><th scope="col">What you get</th></tr></thead>
        <tbody>${items
    .map((tier) => {
      const features = textList(tier.features);
      const detail = [tier.description, features.join("; ")].filter(Boolean).join(" ");
      return `<tr><th scope="row">${escapeHtml(tier.name)}</th><td>${escapeHtml(tier.price ?? "Varies")}</td><td>${escapeHtml(detail || "Pricing details vary — check the app listing.")}</td></tr>`;
    })
    .join("")}</tbody>
      </table>`;
  return section("plans-and-tiers", "Plans or tiers", inner);
}

function renderRelevantLaws(entry) {
  const items = (entry.relevantLaws ?? []).filter((law) => law?.name);
  if (items.length === 0) {
    return "";
  }
  const inner = items
    .map((law) => {
      const link = law.url
        ? `<p><a href="${escapeHtml(law.url)}" rel="nofollow noreferrer">Read statute</a></p>`
        : "";
      return `      <article>
        <h3>${escapeHtml(law.name)}</h3>
        <p>${escapeHtml(law.summary ?? "")}</p>
        ${link}
      </article>`;
    })
    .join("\n");
  return section("relevant-laws", "Relevant laws", inner);
}

function renderTableData(entry) {
  const table = entry.tableData;
  const columns = textList(table?.columns);
  const rows = (table?.rows ?? []).filter((row) => Array.isArray(row) && row.length > 0);
  if (columns.length === 0 || rows.length === 0) {
    return "";
  }
  const inner = `      <table>
        <thead><tr>${columns.map((column) => `<th scope="col">${escapeHtml(column)}</th>`).join("")}</tr></thead>
        <tbody>${rows
    .map((row) => `<tr>${row.map((cell) => `<td>${escapeHtml(cell)}</td>`).join("")}</tr>`)
    .join("")}</tbody>
      </table>`;
  return section("comparison-table", table.name || "Side-by-side comparison", inner);
}

function renderTools(entry) {
  const items = (entry.tools ?? []).filter((tool) => tool?.name);
  if (items.length === 0) {
    return "";
  }
  const inner = `      <ol>${items
    .map((tool) => {
      const pros = renderBullets(tool.pros);
      const cons = renderBullets(tool.cons);
      return `<li>
        <h3>${escapeHtml(tool.name)}</h3>
        <p>${escapeHtml(tool.pricing ?? "Pricing varies")}</p>
        <p>${escapeHtml(tool.summary ?? "")}</p>
        ${tool.verdict ? `<p>${escapeHtml(tool.verdict)}</p>` : ""}
        ${pros ? `<h4>Pros</h4>\n${pros}` : ""}
        ${cons ? `<h4>Cons</h4>\n${cons}` : ""}
      </li>`;
    })
    .join("")}</ol>`;
  return section("ranked-picks", "How the options compare, at a glance.", inner);
}

function renderProsCons(entry) {
  const items = (entry.proscons ?? []).filter((item) => item?.subject);
  if (items.length === 0) {
    return "";
  }
  const inner = items
    .map((item) => {
      const pros = renderBullets(item.pros);
      const cons = renderBullets(item.cons);
      return `      <article>
        <h3>${escapeHtml(item.subject)}</h3>
        ${pros ? `<h4>Pros</h4>\n${pros}` : ""}
        ${cons ? `<h4>Cons</h4>\n${cons}` : ""}
      </article>`;
    })
    .join("\n");
  return section("pros-and-cons", "Strengths and trade-offs", inner);
}

function renderHiddenCosts(entry) {
  const items = (entry.hiddenCosts ?? []).filter((cost) => cost?.label);
  if (items.length === 0) {
    return "";
  }
  const inner = `      <dl>${items
    .map((cost) => `<dt>${escapeHtml(cost.label)}</dt><dd>${escapeHtml(cost.detail ?? "")}</dd>`)
    .join("")}</dl>`;
  return section("hidden-costs", "What you actually pay over time.", inner);
}

function renderExpertQuotes(entry) {
  const items = (entry.expertQuotes ?? []).filter((quote) => quote?.quote);
  if (items.length === 0) {
    return "";
  }
  const inner = items
    .map((quote) => {
      const attribution = [quote.personName, quote.jobTitle, quote.organization].filter(Boolean).join(", ");
      const source = quote.sourceUrl
        ? ` <a href="${escapeHtml(quote.sourceUrl)}" rel="nofollow noreferrer">${escapeHtml(quote.sourceLabel ?? "Source")}</a>`
        : "";
      return `      <blockquote>
        <p>${escapeHtml(quote.quote)}</p>
        <footer>${escapeHtml(attribution)}${source}</footer>
      </blockquote>`;
    })
    .join("\n");
  return section("expert-commentary", "What the experts say", inner);
}

// `answers` is mixed-shape across the source corpus (CLAUDE.md). Normalize here
// rather than hand-editing content files.
function normalizeQuestionAnswer(item) {
  if (typeof item === "string") {
    return { answer: item, question: "" };
  }
  if (!item || typeof item !== "object") {
    return null;
  }
  const question = String(item.question ?? item.q ?? "").trim();
  const answer = String(item.answer ?? item.a ?? "").trim();
  return question || answer ? { answer, question } : null;
}

function renderQuestionAnswerSection(id, heading, items) {
  const pairs = (items ?? []).map(normalizeQuestionAnswer).filter((pair) => pair && pair.question && pair.answer);
  if (pairs.length === 0) {
    return "";
  }
  const inner = pairs
    .map((pair) => `      <article>
        <h3>${escapeHtml(pair.question)}</h3>
        <p>${escapeHtml(pair.answer)}</p>
      </article>`)
    .join("\n");
  return section(id, heading, inner);
}

function renderSources(entry) {
  const items = (entry.sources ?? []).filter((source) => source?.url || source?.claim);
  if (items.length === 0) {
    return "";
  }
  const inner = `      <ol>${items
    .map((source) => {
      const label = source.publisher || source.url || "Source";
      const link = source.url
        ? `<a href="${escapeHtml(source.url)}" rel="nofollow noreferrer">${escapeHtml(label)}</a>`
        : escapeHtml(label);
      const published = source.publishedAt ? ` <span>${escapeHtml(source.publishedAt)}</span>` : "";
      return `<li>${link}${published}${source.claim ? ` <span>${escapeHtml(source.claim)}</span>` : ""}</li>`;
    })
    .join("")}</ol>`;
  return section("sources", "Sources", inner);
}

// Rendered FAQ list is the single source for both visible HTML and FAQPage
// JSON-LD, so the two cannot drift apart. See buildJsonLd.
function resolveFaqPairs(entry) {
  return (entry?.faqs ?? [])
    .map(normalizeQuestionAnswer)
    .filter((pair) => pair && pair.question && pair.answer);
}

function renderStructuredPayloads(entry) {
  return [
    renderStateFacts(entry),
    renderDefinitions(entry),
    renderPricingStats(entry),
    renderTiers(entry),
    renderRelevantLaws(entry),
    renderTableData(entry),
    renderTools(entry),
    renderProsCons(entry),
    renderHiddenCosts(entry),
    renderExpertQuotes(entry),
    renderQuestionAnswerSection("straight-answers", "Quick answers to the obvious questions.", entry.answers),
    renderQuestionAnswerSection("faq", "Questions people ask before they switch.", resolveFaqPairs(entry)),
    renderSources(entry),
  ]
    .filter(Boolean)
    .join("\n");
}

async function loadEntries() {
  const source = await fs.readFile(contentDataPath, "utf8");
  const start = source.indexOf("[");
  const end = source.lastIndexOf("]");
  return JSON.parse(source.slice(start, end + 1));
}

// Noindexed routes are dropped from the sitemap but must still be prerendered —
// they stay live and linked for users. Prerendering from the sitemap alone would
// silently leave stale or missing files in dist/ for exactly those routes.
async function loadPrerenderRoutes() {
  const sitemap = await fs.readFile(sitemapPath, "utf8");
  const sitemapRoutes = [...sitemap.matchAll(/<loc>https:\/\/floriva\.app([^<]*)<\/loc>/g)].map(
    (match) => match[1] || "/",
  );

  return [...new Set([...sitemapRoutes, ...noindexRoutePaths])];
}

// The primary nav only existed in the React tree, so a crawled content page saw
// ~9 internal links against ~38 in the rendered DOM. Emit it statically too.
const siteNavGroups = [
  ["Compare", ["/compare", "/compare/alternatives", "/compare/versus", "/compare/pricing"]],
  ["Learn", [
    "/resources",
    "/resources/best",
    "/resources/guides",
    "/resources/health",
    "/resources/privacy-in-practice",
    "/resources/symptom-guides",
    "/resources/condition-guides",
    "/resources/hormone-guides",
    "/resources/life-stage-guides",
    "/resources/wellness-guides",
  ]],
  ["By state", ["/period-tracker-privacy"]],
  ["Free", ["/free", "/tools/quiz"]],
  ["App guides", ["/app-guides"]],
  ["Floriva", ["/", "/get", "/privacy-features", "/support", "/privacy", "/terms"]],
];

function renderSiteNav(currentPathname) {
  const groups = siteNavGroups
    .map(([label, routes]) => {
      const links = routes
        .filter((route) => route !== currentPathname)
        .map((route) => {
          const title = route === "/" ? "Home" : hubMeta[route] ?? route.split("/").at(-1)?.replaceAll("-", " ") ?? route;
          return `<a href="${escapeHtml(route)}">${escapeHtml(title)}</a>`;
        });
      return links.length > 0
        ? `      <div><h2>${escapeHtml(label)}</h2>${links.join("")}</div>`
        : "";
    })
    .filter(Boolean)
    .join("\n");

  return `  <nav aria-label="Site">
${groups}
  </nav>`;
}

// /get, /privacy, /terms and /privacy-features have no hubCollections entry, so
// the generic branch rendered ~272 bytes of root content. Pull their real copy
// from the generated public-knowledge payload instead.
function renderStaticPageSections(pathname) {
  const key = pathname.slice(1);
  const page = publicKnowledge.staticPages?.[key];
  const sections = page?.sections ?? [];
  if (sections.length === 0) {
    return "";
  }
  return sections
    .map((item) => {
      const body = Array.isArray(item.body)
        ? item.body.map((paragraph) => `<p>${escapeHtml(paragraph)}</p>`).join("")
        : `<p>${escapeHtml(item.body ?? "")}</p>`;
      const heading = item.heading ? `      <h2>${escapeHtml(item.heading)}</h2>\n` : "";
      const bullets = renderBullets(item.items ?? item.bullets);
      return `    <section${item.id ? ` id="${escapeHtml(item.id)}"` : ""}>
${heading}      ${body}
${bullets}
    </section>`;
    })
    .join("\n");
}

function renderRoute(pathname, entriesByPath) {
  const entry = entriesByPath.get(pathname);

  if (entry) {
    const bodyHtml = renderPrerenderedText(entry.body);
    const related = (entry.relatedPages ?? []).map((href) => ({
      href,
      label: href.split("/").at(-1)?.replaceAll("-", " ") ?? href,
    }));
    const linksByHref = new Map(
      [...extractInternalMarkdownLinks(entry.body), ...related]
        .filter((link) => link.href !== pathname)
        .map((link) => [link.href, link]),
    );
    const crawlLinks = [...linksByHref.values()].slice(0, 16);
    const payloadsHtml = renderStructuredPayloads(entry);
    const blufHtml = entry.bluf ? `    <p>${escapeHtml(entry.bluf)}</p>\n` : "";

    return `<main class="prerendered-page">
  <article>
    <p>${escapeHtml(entry.collection)}</p>
    <p>Published by Floriva · Updated ${escapeHtml(entry.updatedAt ?? entry.publishedAt ?? "")} · <a href="/support#editorial-method">How Floriva checks its guides</a></p>
    <h1>${escapeHtml(entry.title)}</h1>
    <p>${escapeHtml(entry.description)}</p>
${blufHtml}${bodyHtml}
${payloadsHtml}
    <nav aria-label="Related pages">
      ${crawlLinks.map((link) => `<a href="${escapeHtml(link.href)}">${escapeHtml(link.label)}</a>`).join("\n      ")}
      <a href="/">Home</a>
    </nav>
  </article>
${renderSiteNav(pathname)}
</main>`;
  }

  if (pathname === "/") {
    const homepageRoutes = [...new Set([...Object.keys(hubMeta), ...Object.keys(hubCollections)])];
    const links = homepageRoutes.map((route) => {
      const linkedEntry = entriesByPath.get(route);
      return {
        href: route,
        label: linkedEntry?.title ?? hubMeta[route] ?? route.split("/").at(-1)?.replaceAll("-", " ") ?? route,
      };
    });

    return `<main class="prerendered-page">
  <section>
    <h1>${escapeHtml(homeTagline)}</h1>
    <p>${escapeHtml(siteSeo.metaDescription)}</p>
    <nav aria-label="Start here">
      ${links.map((link) => `<a href="${escapeHtml(link.href)}">${escapeHtml(link.label)}</a>`).join("\n      ")}
    </nav>
  </section>
${renderSiteNav(pathname)}
</main>`;
  }

  const title = hubMeta[pathname] ?? "Floriva";
  const collections = hubCollections[pathname] ?? [];
  const children = [...entriesByPath.values()]
    .filter((candidate) => candidate.routePath.startsWith(`${pathname}/`) || collections.includes(candidate.collection));
  const staticPage = publicKnowledge.staticPages?.[pathname.slice(1)];
  const staticSectionsHtml = renderStaticPageSections(pathname);
  const intro = staticPage?.description ?? hubDescriptions[pathname] ?? siteSeo.metaDescription;

  return `<main class="prerendered-page">
  <section>
    <h1>${escapeHtml(title)}</h1>
    <p>${escapeHtml(intro)}</p>
${staticSectionsHtml}
    <nav aria-label="Pages">
      ${children.map((child) => `<a href="${escapeHtml(child.routePath)}">${escapeHtml(child.title)}</a>`).join("\n      ")}
      <a href="/">Home</a>
    </nav>
  </section>
${renderSiteNav(pathname)}
</main>`;
}

function injectRoot(indexHtml, bodyHtml) {
  return indexHtml.replace(
    /<div id="root">[\s\S]*?<\/div>\s*(?=<\/body>)/,
    literal(`<div id="root">${bodyHtml}</div>\n`),
  );
}

async function writeRoute(pathname, html, entriesByPath) {
  const isContentRoute = entriesByPath.has(pathname);
  const relative =
    pathname === "/"
      ? "index.html"
      : isContentRoute
        ? path.join(...pathname.slice(1).split("/"))
        : path.join(...pathname.slice(1).split("/"), "index.html");
  const outputPath = path.join(distDir, relative);
  await fs.mkdir(path.dirname(outputPath), { recursive: true });
  if (isContentRoute) {
    await fs.rm(outputPath, { force: true, recursive: true });
  }
  await fs.writeFile(outputPath, html, "utf8");
}

const [indexHtml, entries, routes] = await Promise.all([
  fs.readFile(indexPath, "utf8"),
  loadEntries(),
  loadPrerenderRoutes(),
]);
const entriesByPath = new Map(entries.map((entry) => [entry.routePath, entry]));
/**
 * Unset means "every sitemap route". Set-but-empty must NOT mean that: the old
 * truthiness check turned `PRERENDER_ROUTES=""` into a full 559-route rewrite,
 * which is how a test run that intended to prerender nothing silently
 * overwrote every route in dist/ with a fixture template. Explicit and empty is
 * an error, because no caller can sensibly mean "prerender nothing".
 */
const routesEnv = process.env.PRERENDER_ROUTES;
let selectedRoutes;
if (routesEnv === undefined) {
  selectedRoutes = routes;
} else {
  selectedRoutes = routesEnv.split(",").map((route) => route.trim()).filter(Boolean);
  if (selectedRoutes.length === 0) {
    console.error(
      "prerender-html: PRERENDER_ROUTES is set but lists no routes. " +
        "Unset it to prerender every sitemap route; it will not be treated as a request for all of them.",
    );
    process.exit(1);
  }
}

for (const route of selectedRoutes) {
  const entry = entriesByPath.get(route);
  const html = injectRoot(injectHead(indexHtml, route, entry), renderRoute(route, entriesByPath));
  await writeRoute(route, html, entriesByPath);
}

console.log(`Prerendered ${selectedRoutes.length} HTML routes`);
