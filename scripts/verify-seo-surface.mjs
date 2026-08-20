const origin = process.env.SEO_VERIFY_ORIGIN ?? process.argv[2] ?? "https://floriva.app";
const canonicalOrigin = "https://floriva.app";

const checks = [
  {
    path: "/",
    titleIncludes: "Floriva",
    canonical: "/",
    jsonLd: true,
    status: 200,
    links: ["/compare", "/resources", "/period-tracker-privacy"],
  },
  {
    path: "/privacy",
    titleIncludes: "Floriva Privacy Policy",
    canonical: "/privacy",
    status: 200,
    robots: "index, follow",
  },
  {
    path: "/resources/guides/is-flo-safe-to-use",
    titleIncludes: "Is Flo Safe to Use",
    canonical: "/resources/guides/is-flo-safe-to-use",
    jsonLd: true,
    status: 200,
    links: ["/resources/guides/period-tracker-safe-after-roe-v-wade"],
  },
  {
    path: "/resources/best/best-free-period-tracker-no-subscription",
    titleIncludes: "Free Period Trackers",
    canonical: "/resources/best/best-free-period-tracker-no-subscription",
    jsonLd: true,
    status: 200,
  },
  {
    path: "/compare/versus/euki-vs-drip-privacy-trackers",
    titleIncludes: "Euki vs Drip",
    canonical: "/compare/versus/euki-vs-drip-privacy-trackers",
    jsonLd: true,
    status: 200,
  },
  {
    path: "/no-such-page-seo-audit",
    titleIncludes: "Page not found",
    canonical: "/no-such-page-seo-audit",
    noindex: true,
    status: 404,
  },
];

const redirects = [
  {
    from: "/sitemap-0.xml",
    to: "/sitemap.xml",
  },
  {
    from: "/compare/versus/euki-vs-drip/",
    to: "/compare/versus/euki-vs-drip-privacy-trackers",
  },
  {
    from: "/guides/is-flo-safe-to-use",
    to: "/resources/guides/is-flo-safe-to-use",
  },
];

function absoluteUrl(pathname) {
  return new URL(pathname, origin).toString();
}

function canonicalUrl(pathname) {
  return new URL(pathname, canonicalOrigin).toString();
}

function assert(condition, message) {
  if (!condition) {
    throw new Error(message);
  }
}

function matchContent(html, pattern, label, path) {
  const match = html.match(pattern);

  assert(match, `${path}: missing ${label}`);

  return match[1];
}

async function fetchDocument(path, headers = { Accept: "text/html" }) {
  return fetch(absoluteUrl(path), {
    headers,
    redirect: "manual",
  });
}

async function fetchDocumentHead(path, headers = { Accept: "text/html" }) {
  return fetch(absoluteUrl(path), {
    headers,
    method: "HEAD",
    redirect: "manual",
  });
}

async function verifyDocument(check) {
  const response = await fetchDocument(check.path);
  const html = await response.text();
  const contentType = response.headers.get("content-type") ?? "";
  const title = matchContent(html, /<title>(.*?)<\/title>/i, "title", check.path);
  const canonical = matchContent(
    html,
    /<link\s+rel=["']canonical["']\s+href=["']([^"']+)["']/i,
    "canonical",
    check.path,
  );
  const robots = html.match(/<meta\s+name=["']robots["']\s+content=["']([^"']+)["']/i)?.[1] ?? "";
  const ogImage = html.match(/<meta\s+property=["']og:image["']\s+content=["']([^"']+)["']/i)?.[1] ?? "";

  assert(response.status === check.status, `${check.path}: expected ${check.status}, got ${response.status}`);
  assert(contentType.includes("text/html"), `${check.path}: expected HTML content type, got ${contentType}`);
  assert(title.includes(check.titleIncludes), `${check.path}: title did not include "${check.titleIncludes}"`);
  assert(canonical === canonicalUrl(check.canonical), `${check.path}: canonical was ${canonical}`);
  assert(html.includes("<h1"), `${check.path}: initial HTML missing h1 body content`);
  assert((html.match(/<a\s/gi) ?? []).length > 0, `${check.path}: initial HTML missing internal links`);

  if (check.jsonLd) {
    const jsonLdCount = (html.match(/type=["']application\/ld\+json["']/g) ?? []).length;

    assert(
      jsonLdCount > 0,
      `${check.path}: missing JSON-LD`,
    );
    assert(jsonLdCount === 1, `${check.path}: expected 1 JSON-LD script, found ${jsonLdCount}`);
  }

  if (check.noindex) {
    assert(robots.includes("noindex"), `${check.path}: expected noindex robots meta`);
  }

  if (check.robots) {
    assert(robots === check.robots, `${check.path}: robots meta was ${robots}`);
  }

  if (check.links) {
    for (const href of check.links) {
      assert(html.includes(`href="${href}"`), `${check.path}: missing prerendered link ${href}`);
    }
  }

  assert(!canonical.endsWith("//"), `${check.path}: canonical has malformed trailing slashes`);

  if (ogImage) {
    const imageResponse = await fetch(ogImage, { method: "HEAD", redirect: "manual" });
    const imageType = imageResponse.headers.get("content-type") ?? "";

    assert(imageResponse.status === 200, `${check.path}: og:image returned ${imageResponse.status}`);
    assert(imageType.startsWith("image/"), `${check.path}: og:image content type was ${imageType}`);
  }
}

async function verifyGenericDocumentRequest(check) {
  const response = await fetchDocument(check.path, check.headers);
  const html = await response.text();
  const contentType = response.headers.get("content-type") ?? "";
  const title = matchContent(html, /<title>(.*?)<\/title>/i, "title", check.path);
  const canonical = matchContent(
    html,
    /<link\s+rel=["']canonical["']\s+href=["']([^"']+)["']/i,
    "canonical",
    check.path,
  );
  const robots = html.match(/<meta\s+name=["']robots["']\s+content=["']([^"']+)["']/i)?.[1] ?? "";

  assert(response.status === check.status, `${check.path}: expected ${check.status}, got ${response.status}`);
  assert(contentType.includes("text/html"), `${check.path}: expected HTML content type, got ${contentType}`);
  assert(title.includes(check.titleIncludes), `${check.path}: title did not include "${check.titleIncludes}"`);
  assert(canonical === canonicalUrl(check.canonical), `${check.path}: canonical was ${canonical}`);

  if (check.noindex) {
    assert(robots.includes("noindex"), `${check.path}: expected noindex robots meta`);
  }
}

async function verifyDocumentHead(check) {
  const response = await fetchDocumentHead(check.path, check.headers);
  const contentType = response.headers.get("content-type") ?? "";
  const location = response.headers.get("location") ?? "";

  assert(
    response.status === check.status,
    `${check.path}: HEAD expected ${check.status}, got ${response.status}${location ? ` redirecting to ${location}` : ""}`,
  );
  assert(contentType.includes("text/html"), `${check.path}: HEAD expected HTML content type, got ${contentType}`);
}

async function verifyRedirect(check) {
  const response = await fetchDocument(check.from);
  const location = response.headers.get("location");

  assert(response.status === 301, `${check.from}: expected 301, got ${response.status}`);
  assert(location === absoluteUrl(check.to), `${check.from}: redirect location was ${location}`);
}

async function verifySitemap() {
  const response = await fetch(absoluteUrl("/sitemap.xml"), { redirect: "manual" });
  const body = await response.text();
  const contentType = response.headers.get("content-type") ?? "";

  assert(response.status === 200, `/sitemap.xml: expected 200, got ${response.status}`);
  assert(contentType.includes("xml"), `/sitemap.xml: expected XML content type, got ${contentType}`);
  assert(body.startsWith("<?xml"), "/sitemap.xml: body did not start with XML declaration");
  assert(body.includes("<loc>https://floriva.app/resources/guides/is-flo-safe-to-use</loc>"), "/sitemap.xml: missing known content URL");

  return [...body.matchAll(/<loc>https:\/\/floriva\.app([^<]*)<\/loc>/g)].map((match) => match[1] || "/");
}

async function verifySitemapDocuments(paths) {
  assert(paths.length > 0, "/sitemap.xml: no URLs found");

  for (const path of paths) {
    const response = await fetchDocument(path);
    const html = await response.text();
    const contentType = response.headers.get("content-type") ?? "";
    const location = response.headers.get("location") ?? "";
    const canonical = matchContent(
      html,
      /<link\s+rel=["']canonical["']\s+href=["']([^"']+)["']/i,
      "canonical",
      path,
    );

    assert(
      response.status === 200,
      `${path}: sitemap URL expected 200, got ${response.status}${location ? ` redirecting to ${location}` : ""}`,
    );
    assert(contentType.includes("text/html"), `${path}: sitemap URL expected HTML content type, got ${contentType}`);
    assert(canonical === canonicalUrl(path), `${path}: sitemap URL canonical was ${canonical}`);
  }
}

async function verifyAssetLike404() {
  const nonce = `${Date.now()}-${Math.random().toString(36).slice(2)}`;

  for (const path of [
    `/assets/not-real-seo-audit-${nonce}.js`,
    `/og/not-real-seo-audit-${nonce}.png`,
  ]) {
    const response = await fetch(absoluteUrl(path), {
      headers: { Accept: "*/*" },
      redirect: "manual",
    });
    const contentType = response.headers.get("content-type") ?? "";

    assert(response.status === 404, `${path}: expected 404, got ${response.status}`);
    assert(!contentType.includes("text/html"), `${path}: returned HTML`);
  }
}

try {
  const sitemapPaths = await verifySitemap();
  await verifySitemapDocuments(sitemapPaths);
  await verifyAssetLike404();

  for (const check of checks) {
    await verifyDocument(check);
  }

  await verifyGenericDocumentRequest({
    path: "/resources/guides/is-flo-safe-to-use",
    titleIncludes: "Is Flo Safe to Use",
    canonical: "/resources/guides/is-flo-safe-to-use",
    headers: { Accept: "*/*" },
    status: 200,
  });
  await verifyGenericDocumentRequest({
    path: "/no-such-page-seo-audit-generic",
    titleIncludes: "Page not found",
    canonical: "/no-such-page-seo-audit-generic",
    headers: {},
    noindex: true,
    status: 404,
  });
  await verifyDocumentHead({
    path: "/resources/guides/is-flo-safe-to-use",
    headers: { Accept: "*/*" },
    status: 200,
  });
  await verifyDocumentHead({
    path: "/no-such-page-seo-audit-generic",
    headers: { Accept: "*/*" },
    status: 404,
  });

  for (const check of redirects) {
    await verifyRedirect(check);
  }

  console.log(`SEO surface verified for ${origin}`);
} catch (error) {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
}
