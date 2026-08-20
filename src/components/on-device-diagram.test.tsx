import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, describe, expect, it } from "vitest";
import { OnDeviceDiagram } from "@/components/on-device-diagram";

(globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

async function renderDiagram(props: Parameters<typeof OnDeviceDiagram>[0] = {}) {
  const host = document.createElement("div");
  document.body.append(host);
  const root = createRoot(host);

  await act(async () => {
    root.render(<OnDeviceDiagram {...props} />);
  });

  return { host, root };
}

describe("OnDeviceDiagram", () => {
  const roots: Root[] = [];

  afterEach(async () => {
    await act(async () => {
      roots.splice(0).forEach((root) => root.unmount());
    });
    document.body.innerHTML = "";
  });

  it("renders an svg with an accessible name describing the local-only architecture", async () => {
    const { host, root } = await renderDiagram();
    roots.push(root);

    const svg = host.querySelector("svg");
    expect(svg).not.toBeNull();
    expect(svg?.getAttribute("role")).toBe("img");

    const label = svg?.getAttribute("aria-label") ?? "";
    expect(label.length).toBeGreaterThan(0);
    expect(label.toLowerCase()).toContain("phone");
    expect(label.toLowerCase()).toContain("cloud");
  });

  it("renders the on-phone and no-cloud-account labels", async () => {
    const { host, root } = await renderDiagram();
    roots.push(root);

    expect(host.textContent).toContain("Stays on your phone");
    expect(host.textContent).toContain("No cloud account");
  });

  it("omits a figcaption when no caption is provided", async () => {
    const { host, root } = await renderDiagram();
    roots.push(root);

    expect(host.querySelector(".on-device-diagram__caption")).toBeNull();
  });

  it("renders the caption when provided", async () => {
    const { host, root } = await renderDiagram({ caption: "Local-first by design" });
    roots.push(root);

    const caption = host.querySelector(".on-device-diagram__caption");
    expect(caption).not.toBeNull();
    expect(caption?.textContent).toBe("Local-first by design");
  });

  it("passes through a custom className on the figure element", async () => {
    const { host, root } = await renderDiagram({ className: "hero-diagram" });
    roots.push(root);

    const figure = host.querySelector("figure");
    expect(figure?.classList.contains("on-device-diagram")).toBe(true);
    expect(figure?.classList.contains("hero-diagram")).toBe(true);
  });
});
