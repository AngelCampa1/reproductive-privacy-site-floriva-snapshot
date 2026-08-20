import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, describe, expect, it, vi } from "vitest";
import { BentoCell, BentoGrid } from "@/components/bento-grid";
import { JourneySection, JourneyStep } from "@/components/journey-section";

(globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

function setupBrowserMocks() {
  window.matchMedia = vi.fn().mockReturnValue({
    addEventListener: vi.fn(),
    matches: true,
    removeEventListener: vi.fn(),
  });
}

const roots: Root[] = [];

async function renderInto(node: React.ReactElement) {
  setupBrowserMocks();
  const host = document.createElement("div");
  document.body.append(host);
  const root = createRoot(host);

  await act(async () => {
    root.render(node);
  });
  await act(async () => {
    await Promise.resolve();
  });

  roots.push(root);
  return { root, host };
}

afterEach(async () => {
  vi.restoreAllMocks();
  await act(async () => {
    roots.splice(0).forEach((root) => root.unmount());
  });
  document.body.innerHTML = "";
});

describe("BentoCell", () => {
  it("applies size and tone classes", async () => {
    const { host } = await renderInto(
      <BentoGrid>
        <BentoCell size="wide" tone="moss-soft" title="Wide moss cell" />
      </BentoGrid>,
    );

    const cell = host.querySelector(".bento-cell");
    expect(cell?.className).toContain("bento-cell--wide");
    expect(cell?.className).toContain("bento-cell--moss-soft");
    expect(host.querySelector(".bento-grid")).not.toBeNull();
  });

  it("defaults to sm size and paper tone", async () => {
    const { host } = await renderInto(
      <BentoGrid>
        <BentoCell title="Default cell" />
      </BentoGrid>,
    );

    const cell = host.querySelector(".bento-cell");
    expect(cell?.className).toContain("bento-cell--sm");
    expect(cell?.className).toContain("bento-cell--paper");
  });

  it("renders a stat's value and label", async () => {
    const { host } = await renderInto(
      <BentoGrid>
        <BentoCell
          size="tall"
          title="Multilingual"
          stat={{ value: "8", label: "languages" }}
        />
      </BentoGrid>,
    );

    const value = host.querySelector(".bento-cell__stat-value");
    const label = host.querySelector(".bento-cell__stat-label");
    expect(value?.textContent).toBe("8");
    expect(label?.textContent).toBe("languages");
  });
});

describe("JourneyStep", () => {
  it("renders a zero-padded index", async () => {
    const { host } = await renderInto(
      <JourneySection>
        <JourneyStep
          index={1}
          heading="Log what you eat"
          body="A quick, private log."
          media={<div>media</div>}
        />
      </JourneySection>,
    );

    expect(host.querySelector(".journey-step__index")?.textContent).toBe("01");
  });

  it("does not reverse odd indexes by default", async () => {
    const { host } = await renderInto(
      <JourneySection>
        <JourneyStep
          index={1}
          heading="Log what you eat"
          body="A quick, private log."
          media={<div>media</div>}
        />
      </JourneySection>,
    );

    expect(host.querySelector(".journey-step")?.className).not.toContain(
      "journey-step--reverse",
    );
  });

  it("auto-reverses even indexes", async () => {
    const { host } = await renderInto(
      <JourneySection>
        <JourneyStep
          index={2}
          heading="Predict your risk"
          body="See patterns before they surprise you."
          media={<div>media</div>}
        />
      </JourneySection>,
    );

    expect(host.querySelector(".journey-step")?.className).toContain(
      "journey-step--reverse",
    );
  });

  it("honors an explicit reverse override", async () => {
    const { host } = await renderInto(
      <JourneySection>
        <JourneyStep
          index={1}
          heading="Log what you eat"
          body="A quick, private log."
          media={<div>media</div>}
          reverse
        />
      </JourneySection>,
    );

    expect(host.querySelector(".journey-step")?.className).toContain(
      "journey-step--reverse",
    );
  });

  it("renders the media slot content", async () => {
    const { host } = await renderInto(
      <JourneySection>
        <JourneyStep
          index={3}
          heading="Understand your body"
          body="Clear, calm explanations."
          media={<div data-testid="phone-showcase">phone showcase</div>}
        />
      </JourneySection>,
    );

    expect(host.querySelector('[data-testid="phone-showcase"]')?.textContent).toBe(
      "phone showcase",
    );
  });
});
