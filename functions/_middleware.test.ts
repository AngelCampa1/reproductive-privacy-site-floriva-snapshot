import { describe, expect, it } from "vitest";
import {
  handleSeoRequest,
  htmlDocumentHeaders,
  onRequest,
  resolveDocumentResponse,
  resolveRequestRedirect,
  shouldTransformDocumentResponse,
  shouldServeSpaShell,
} from "./_middleware";

describe("edge SEO middleware", () => {
  it("leaves Function-owned API HTML responses untouched", () => {
    const request = new Request("https://floriva.app/api/lead-magnet/unsubscribe", {
      headers: { Accept: "text/html" },
    });
    const response = new Response("<!doctype html><title>Unsubscribe</title>", {
      headers: { "Content-Type": "text/html; charset=utf-8" },
      status: 200,
    });

    expect(shouldTransformDocumentResponse(request, response)).toBe(false);
  });

  it("transforms extensionless prerendered HTML served as octet-stream", () => {
    const request = new Request("https://floriva.app/resources/guides/is-flo-safe-to-use", {
      headers: { Accept: "text/html" },
    });
    const response = new Response("<!doctype html><title>Floriva</title>", {
      headers: { "Content-Type": "application/octet-stream" },
      status: 200,
    });

    expect(shouldTransformDocumentResponse(request, response)).toBe(true);
  });

  it("treats generic-accept extensionless routes as document requests", () => {
    const request = new Request("https://floriva.app/resources/guides/is-flo-safe-to-use", {
      headers: { Accept: "*/*" },
    });
    const response = new Response("<!doctype html><title>Floriva</title>", {
      headers: { "Content-Type": "application/octet-stream" },
      status: 200,
    });

    expect(shouldTransformDocumentResponse(request, response)).toBe(true);
  });

  it("treats missing-accept extensionless routes as document requests", () => {
    const request = new Request("https://floriva.app/resources/guides/is-flo-safe-to-use");
    request.headers.delete("accept");
    const response = new Response("<!doctype html><title>Floriva</title>", {
      headers: { "Content-Type": "application/octet-stream" },
      status: 200,
    });

    expect(shouldTransformDocumentResponse(request, response)).toBe(true);
  });

  it("serves prerendered hub index HTML instead of the generic shell for Pages directory redirects", async () => {
    const fetchedUrls: string[] = [];
    const response = await resolveDocumentResponse(
      new Response(null, {
        headers: { Location: "/period-tracker-privacy/" },
        status: 308,
      }),
      {
        request: new Request("https://floriva.app/period-tracker-privacy", {
          headers: { Accept: "text/html" },
        }),
        env: {
          ASSETS: {
            fetch: (request: Request) => {
              fetchedUrls.push(request.url);
              return (
              Promise.resolve(
                new Response(
                  '<!doctype html><html><head><title>Floriva</title><meta name="description" content=""><meta name="robots" content=""><meta property="og:title" content=""><meta property="og:description" content=""><meta property="og:site_name" content=""><meta property="og:type" content=""><meta property="og:url" content=""><meta property="og:image" content=""><meta name="twitter:card" content=""><meta name="twitter:title" content=""><meta name="twitter:description" content=""><meta name="twitter:image" content=""><link rel="canonical" href=""></head><body><div id="root"><h1>Period tracker privacy by state</h1><a href="/period-tracker-privacy/reproductive-data-privacy-laws-texas">Texas</a></div></body></html>',
                  {
                    headers: { "Content-Type": "text/html; charset=utf-8" },
                    status: 200,
                  },
                ),
              ));
            },
          },
        },
      } as unknown as EventContext<never, string, never>,
    );

    const html = await response.text();

    expect(response.status).toBe(200);
    expect(response.headers.get("Location")).toBeNull();
    expect(response.headers.get("Content-Type")).toContain("text/html");
    expect(fetchedUrls).toEqual(["https://floriva.app/period-tracker-privacy/index.html"]);
    expect(html).toContain("<h1>Period tracker privacy by state</h1>");
  });

  it("returns transformed extensionless documents as HTML", async () => {
    const headers = htmlDocumentHeaders(new Headers({ "Content-Type": "application/octet-stream" }));

    expect(headers.get("Content-Type")).toBe("text/html; charset=utf-8");
  });

  it("does not transform octet-stream asset responses as documents", () => {
    const request = new Request("https://floriva.app/assets/file.bin", {
      headers: { Accept: "*/*" },
    });
    const response = new Response("binary", {
      headers: { "Content-Type": "application/octet-stream" },
      status: 200,
    });

    expect(shouldTransformDocumentResponse(request, response)).toBe(false);
  });

  it("redirects trailing-slash document routes to slashless canonical paths", () => {
    const request = new Request("https://floriva.app/resources/guides/is-flo-safe-to-use/", {
      headers: { Accept: "text/html" },
    });

    const redirect = resolveRequestRedirect(request);

    expect(redirect?.status).toBe(301);
    expect(redirect?.headers.get("Location")).toBe(
      "https://floriva.app/resources/guides/is-flo-safe-to-use",
    );
  });

  it("redirects www host requests to the apex canonical host", () => {
    const request = new Request("https://www.floriva.app/resources/guides/is-flo-safe-to-use?utm_source=gsc", {
      headers: { Accept: "text/html" },
    });

    const redirect = resolveRequestRedirect(request);

    expect(redirect?.status).toBe(301);
    expect(redirect?.headers.get("Location")).toBe(
      "https://floriva.app/resources/guides/is-flo-safe-to-use?utm_source=gsc",
    );
  });

  it("redirects www static SEO files to the apex canonical host", () => {
    for (const pathname of ["/", "/sitemap.xml", "/robots.txt", "/llms.txt"]) {
      const redirect = resolveRequestRedirect(new Request(`https://www.floriva.app${pathname}`));

      expect(redirect?.status).toBe(301);
      expect(redirect?.headers.get("Location")).toBe(`https://floriva.app${pathname}`);
    }
  });

  it("combines www host redirects with path canonicalization in one hop", () => {
    const sitemapRedirect = resolveRequestRedirect(new Request("https://www.floriva.app/sitemap-0.xml"));
    const trailingSlashRedirect = resolveRequestRedirect(
      new Request("https://www.floriva.app/resources/guides/is-flo-safe-to-use/"),
    );
    const legacyRedirect = resolveRequestRedirect(new Request("https://www.floriva.app/guides/is-flo-safe-to-use"));

    expect(sitemapRedirect?.status).toBe(301);
    expect(sitemapRedirect?.headers.get("Location")).toBe("https://floriva.app/sitemap.xml");
    expect(trailingSlashRedirect?.status).toBe(301);
    expect(trailingSlashRedirect?.headers.get("Location")).toBe(
      "https://floriva.app/resources/guides/is-flo-safe-to-use",
    );
    expect(legacyRedirect?.status).toBe(301);
    expect(legacyRedirect?.headers.get("Location")).toBe(
      "https://floriva.app/resources/guides/is-flo-safe-to-use",
    );
  });

  it("redirects function-owned GET requests on www but does not redirect POST requests", () => {
    const getRedirect = resolveRequestRedirect(new Request("https://www.floriva.app/api/health"));
    const postRedirect = resolveRequestRedirect(
      new Request("https://www.floriva.app/api/lead-magnet/subscribe", { method: "POST" }),
    );

    expect(getRedirect?.status).toBe(301);
    expect(getRedirect?.headers.get("Location")).toBe("https://floriva.app/api/health");
    expect(postRedirect).toBeNull();
  });

  it("redirects known legacy comparison slugs to current canonical paths", () => {
    const request = new Request("https://floriva.app/compare/versus/euki-vs-drip/", {
      headers: { Accept: "text/html" },
    });

    const redirect = resolveRequestRedirect(request);

    expect(redirect?.status).toBe(301);
    expect(redirect?.headers.get("Location")).toBe(
      "https://floriva.app/compare/versus/euki-vs-drip-privacy-trackers",
    );
  });

  it("redirects retired period-away-from-home lead magnet slugs to the survivor page", () => {
    const request = new Request("https://floriva.app/free/period-at-beach-checklist", {
      headers: { Accept: "text/html" },
    });

    const redirect = resolveRequestRedirect(request);

    expect(redirect?.status).toBe(301);
    expect(redirect?.headers.get("Location")).toBe(
      "https://floriva.app/free/period-away-from-home-kit",
    );
  });

  it("redirects more retired period-away-from-home lead magnet slugs to the survivor page", () => {
    const slugs = [
      "period-on-a-plane-notes",
      "period-on-vacation-notes",
      "period-travel-checklist",
      "swimming-on-period-plan",
      "hotel-period-cleanup-checklist",
    ];

    for (const slug of slugs) {
      const redirect = resolveRequestRedirect(
        new Request(`https://floriva.app/free/${slug}`, { headers: { Accept: "text/html" } }),
      );

      expect(redirect?.status).toBe(301);
      expect(redirect?.headers.get("Location")).toBe(
        "https://floriva.app/free/period-away-from-home-kit",
      );
    }
  });

  it("redirects retired dorm and college lead magnet slugs to the survivor page", () => {
    const request = new Request("https://floriva.app/free/dorm-period-kit-checklist", {
      headers: { Accept: "text/html" },
    });

    const redirect = resolveRequestRedirect(request);

    expect(redirect?.status).toBe(301);
    expect(redirect?.headers.get("Location")).toBe(
      "https://floriva.app/free/period-at-college-dorm-kit",
    );
  });

  it("redirects more retired dorm and college lead magnet slugs to the survivor page", () => {
    const slugs = [
      "college-period-packing-list",
      "campus-period-product-refill-plan",
      "roommate-period-boundary-script",
      "shared-bathroom-period-plan",
    ];

    for (const slug of slugs) {
      const redirect = resolveRequestRedirect(
        new Request(`https://floriva.app/free/${slug}`, { headers: { Accept: "text/html" } }),
      );

      expect(redirect?.status).toBe(301);
      expect(redirect?.headers.get("Location")).toBe(
        "https://floriva.app/free/period-at-college-dorm-kit",
      );
    }
  });

  it("redirects retired lead magnets to their consolidated survivor pages", () => {
    const pairs: Array<[string, string]> = [
      ["/free/adenomyosis-pain-flare-log", "/free/adenomyosis-tracking-kit"],
      ["/free/pcos-symptom-tracker", "/free/pcos-tracking-kit"],
      ["/free/birth-control-side-effect-tracker", "/free/birth-control-tracking-kit"],
      ["/free/period-pain-diary-template", "/free/period-pain-cramp-diary"],
      ["/free/pmdd-drsp-daily-log", "/free/pmdd-tracking-kit"],
      ["/free/pap-smear-result-terms-card", "/free/biopsy-result-visit-notes"],
      ["/free/first-period-signs-notes", "/free/first-period-starter-kit"],
      ["/free/period-app-privacy-audit-checklist", "/free/period-app-privacy-audit-kit"],
      ["/free/data-deletion-request-guide", "/free/delete-period-data-guide"],
      ["/free/bbt-disruption-log", "/free/ovulation-fertility-awareness-kit"],
    ];

    for (const [from, to] of pairs) {
      const redirect = resolveRequestRedirect(
        new Request(`https://floriva.app${from}`, { headers: { Accept: "text/html" } }),
      );

      expect(redirect?.status).toBe(301);
      expect(redirect?.headers.get("Location")).toBe(`https://floriva.app${to}`);
    }
  });

  it("redirects legacy collection roots to current route bases", () => {
    const request = new Request("https://floriva.app/guides/is-flo-safe-to-use", {
      headers: { Accept: "text/html" },
    });

    const redirect = resolveRequestRedirect(request);

    expect(redirect?.status).toBe(301);
    expect(redirect?.headers.get("Location")).toBe(
      "https://floriva.app/resources/guides/is-flo-safe-to-use",
    );
  });

  it("redirects the stale GSC sitemap URL to the current sitemap", () => {
    const redirect = resolveRequestRedirect(new Request("https://floriva.app/sitemap-0.xml"));

    expect(redirect?.status).toBe(301);
    expect(redirect?.headers.get("Location")).toBe("https://floriva.app/sitemap.xml");
  });

  it("serves the SPA shell for known client routes and true 404 routes", () => {
    expect(shouldServeSpaShell("/resources/guides/is-flo-safe-to-use")).toBe(true);
    expect(shouldServeSpaShell("/no-such-page-seo-audit")).toBe(true);
  });

  it("does not serve the SPA shell for asset-like paths", () => {
    expect(shouldServeSpaShell("/assets/index.js")).toBe(false);
    expect(shouldServeSpaShell("/assets/missing.js")).toBe(false);
    expect(shouldServeSpaShell("/og/missing.png")).toBe(false);
    expect(shouldServeSpaShell("/favicon.ico")).toBe(false);
    expect(shouldServeSpaShell("/sitemap.xml")).toBe(false);
  });

  it("turns Pages asset fallback HTML into a real 404", async () => {
    const response = await handleSeoRequest({
      request: new Request("https://floriva.app/assets/not-real-seo-audit.js", {
        headers: { Accept: "*/*" },
      }),
      data: {},
      env: {},
      next: () =>
        Promise.resolve(
          new Response("<!doctype html><div id=\"root\"></div>", {
            headers: { "Content-Type": "text/html; charset=utf-8" },
            status: 200,
          }),
        ),
    } as unknown as EventContext<never, string, never>);

    expect(response.status).toBe(404);
    expect(response.headers.get("Content-Type")).toContain("text/plain");
  });

  it("does not redirect Function-owned routes with trailing slashes", () => {
    expect(resolveRequestRedirect(new Request("https://floriva.app/api/health/"))).toBeNull();
    expect(resolveRequestRedirect(new Request("https://floriva.app/downloads/lead-magnets/file/"))).toBeNull();
    expect(resolveRequestRedirect(new Request("https://floriva.app/ph/capture/"))).toBeNull();
  });

  it("keeps root middleware as a pass-through when no redirect is needed", async () => {
    const response = new Response("ok", { status: 200 });
    const context = {
      next: async () => response,
      request: new Request("https://floriva.app/resources/guides/is-flo-safe-to-use"),
    } as Parameters<typeof onRequest>[0];

    await expect(onRequest(context)).resolves.toBe(response);
  });

  it("redirects canonical host mismatches from root middleware before static assets are served", async () => {
    const response = await onRequest({
      next: async () => new Response("should not reach static asset"),
      request: new Request("https://www.floriva.app/sitemap.xml"),
    } as Parameters<typeof onRequest>[0]);

    expect(response.status).toBe(301);
    expect(response.headers.get("Location")).toBe("https://floriva.app/sitemap.xml");
  });

  it("passes apex static SEO assets through root middleware", async () => {
    const response = new Response("<urlset></urlset>", {
      headers: { "Content-Type": "application/xml" },
      status: 200,
    });

    await expect(onRequest({
      next: async () => response,
      request: new Request("https://floriva.app/sitemap.xml"),
    } as Parameters<typeof onRequest>[0])).resolves.toBe(response);
  });
});
