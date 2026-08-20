import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, describe, expect, it } from "vitest";
import { DeviceFrame } from "@/components/device-frame";

(globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

const roots: Root[] = [];

async function renderInto(node: React.ReactElement) {
  const host = document.createElement("div");
  document.body.append(host);
  const root = createRoot(host);

  await act(async () => {
    root.render(node);
  });

  roots.push(root);
  return host;
}

describe("DeviceFrame", () => {
  afterEach(async () => {
    await act(async () => {
      roots.splice(0).forEach((root) => root.unmount());
    });
    document.body.innerHTML = "";
  });

  it("renders the alt text on the fallback img", async () => {
    const host = await renderInto(<DeviceFrame screen="today" alt="Today screen showing cycle phase" />);

    const img = host.querySelector("img");
    expect(img?.getAttribute("alt")).toBe("Today screen showing cycle phase");
  });

  it("includes avif and webp sources at all three responsive widths", async () => {
    const host = await renderInto(<DeviceFrame screen="calendar" alt="Calendar screen" />);

    const sources = Array.from(host.querySelectorAll("picture source"));
    expect(sources).toHaveLength(2);

    const avifSource = sources.find((source) => source.getAttribute("type") === "image/avif");
    const webpSource = sources.find((source) => source.getAttribute("type") === "image/webp");

    expect(avifSource).toBeDefined();
    expect(webpSource).toBeDefined();

    for (const width of [402, 804, 1206]) {
      expect(avifSource?.getAttribute("srcset")).toContain(`/app-screens/calendar-${width}.avif ${width}w`);
      expect(webpSource?.getAttribute("srcset")).toContain(`/app-screens/calendar-${width}.webp ${width}w`);
    }
  });

  it("falls back to the 804 webp asset on the img element", async () => {
    const host = await renderInto(<DeviceFrame screen="insights" alt="Insights screen" />);

    const img = host.querySelector("img");
    expect(img?.getAttribute("src")).toBe("/app-screens/insights-804.webp");
  });

  it("defaults to lazy loading without a fetch priority", async () => {
    const host = await renderInto(<DeviceFrame screen="logging" alt="Logging screen" />);

    const img = host.querySelector("img");
    expect(img?.getAttribute("loading")).toBe("lazy");
    expect(img?.getAttribute("decoding")).toBe("async");
    expect(img?.hasAttribute("fetchpriority")).toBe(false);
  });

  it("switches to eager and high fetch priority when priority is true", async () => {
    const host = await renderInto(
      <DeviceFrame screen="privacy-settings" alt="Privacy settings screen" priority />,
    );

    const img = host.querySelector("img");
    expect(img?.getAttribute("loading")).toBe("eager");
    expect(img?.getAttribute("fetchpriority")).toBe("high");
  });

  it("sets explicit width and height for CLS stability", async () => {
    const host = await renderInto(<DeviceFrame screen="condition-aware" alt="Condition-aware screen" />);

    const img = host.querySelector("img");
    expect(img?.getAttribute("width")).toBe("1206");
    expect(img?.getAttribute("height")).toBe("2622");
  });
});
