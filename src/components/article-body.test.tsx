import { act } from "react";
import { createRoot } from "react-dom/client";
import { MemoryRouter } from "react-router-dom";
import { afterEach, describe, expect, it } from "vitest";
import { ArticleBody } from "@/components/article-body";

(globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

describe("ArticleBody", () => {
  afterEach(() => {
    document.body.innerHTML = "";
  });

  it("renders internal link as react-router Link (no target)", async () => {
    const host = document.createElement("div");
    document.body.append(host);
    const root = createRoot(host);
    await act(async () => {
      root.render(
        <MemoryRouter>
          <ArticleBody markdown={"[internal](/foo)"} />
        </MemoryRouter>,
      );
    });
    const anchor = document.querySelector<HTMLAnchorElement>("a");
    expect(anchor).not.toBeNull();
    expect(anchor!.getAttribute("href")).toBe("/foo");
    expect(anchor!.getAttribute("target")).toBeNull();
  });

  it("renders external link with target=_blank and rel=noreferrer", async () => {
    const host = document.createElement("div");
    document.body.append(host);
    const root = createRoot(host);
    await act(async () => {
      root.render(
        <MemoryRouter>
          <ArticleBody markdown={"[external](https://example.com)"} />
        </MemoryRouter>,
      );
    });
    const anchor = document.querySelector<HTMLAnchorElement>("a");
    expect(anchor).not.toBeNull();
    expect(anchor!.getAttribute("href")).toBe("https://example.com");
    expect(anchor!.getAttribute("target")).toBe("_blank");
    expect(anchor!.getAttribute("rel")).toBe("noreferrer");
  });

  it("generates unique ids for duplicate h2 headings", async () => {
    const host = document.createElement("div");
    document.body.append(host);
    const root = createRoot(host);
    await act(async () => {
      root.render(
        <MemoryRouter>
          <ArticleBody markdown={"## Heading\n\n## Heading"} />
        </MemoryRouter>,
      );
    });
    const headings = document.querySelectorAll<HTMLHeadingElement>("h2");
    expect(headings.length).toBe(2);
    expect(headings[0]!.getAttribute("id")).toBe("heading");
    expect(headings[1]!.getAttribute("id")).toBe("heading-1");
  });

  it("extracts text from nested element children in h2 (bold text)", async () => {
    const host = document.createElement("div");
    document.body.append(host);
    const root = createRoot(host);
    await act(async () => {
      root.render(
        <MemoryRouter>
          <ArticleBody markdown={"## **bold** text\n\n## **bold** text"} />
        </MemoryRouter>,
      );
    });
    const headings = document.querySelectorAll<HTMLHeadingElement>("h2");
    expect(headings.length).toBe(2);
    // First occurrence gets base slug, second gets base-1
    expect(headings[0]!.getAttribute("id")).toBe("bold-text");
    expect(headings[1]!.getAttribute("id")).toBe("bold-text-1");
  });
});
