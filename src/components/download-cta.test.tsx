import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { MemoryRouter } from "react-router-dom";
import { afterEach, describe, expect, it, vi } from "vitest";
import { DownloadCta, type DownloadCtaVariant } from "@/components/download-cta";
import { florivaKnowledge } from "@/site/knowledge";
import { getLeadMagnetResource } from "@/site/lead-magnets";

(globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

function setupBrowserMocks() {
  window.matchMedia = vi.fn().mockReturnValue({
    addEventListener: vi.fn(),
    matches: true,
    removeEventListener: vi.fn(),
  });
}

async function renderDownloadCta(variant: DownloadCtaVariant = "default") {
  setupBrowserMocks();
  const host = document.createElement("div");
  document.body.append(host);
  const root = createRoot(host);

  await act(async () => {
    root.render(
      <MemoryRouter>
        <DownloadCta variant={variant} />
      </MemoryRouter>,
    );
  });

  await act(async () => {
    await Promise.resolve();
  });

  return root;
}

describe("DownloadCta", () => {
  const roots: Root[] = [];

  afterEach(async () => {
    vi.restoreAllMocks();
    await act(async () => {
      roots.splice(0).forEach((root) => root.unmount());
    });
    document.body.innerHTML = "";
  });

  it("renders each canonical CTA variant with a configured lead magnet link", async () => {
    for (const variant of Object.keys(florivaKnowledge.ctas.download) as DownloadCtaVariant[]) {
      const root = await renderDownloadCta(variant);
      roots.push(root);

      const copy = florivaKnowledge.ctas.download[variant];
      const link = document.querySelector<HTMLAnchorElement>(".download-cta__lead-link");

      expect(document.body.textContent, variant).toContain(copy.headline);
      expect(document.body.textContent, variant).toContain(copy.body);
      expect(link?.textContent, variant).toBe(copy.leadMagnetLabel);
      expect(link?.getAttribute("href"), variant).toBe(`/free/${copy.leadMagnetSlug}`);
      expect(getLeadMagnetResource(copy.leadMagnetSlug), variant).not.toBeNull();

      await act(async () => {
        root.unmount();
      });
      roots.pop();
      document.body.innerHTML = "";
    }
  });
});
