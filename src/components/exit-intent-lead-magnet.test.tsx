import { act } from "react";
import { createRoot } from "react-dom/client";
import { MemoryRouter } from "react-router-dom";
import { afterEach, describe, expect, it, vi } from "vitest";
import { ExitIntentLeadMagnet } from "./exit-intent-lead-magnet";

(globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

describe("ExitIntentLeadMagnet", () => {
  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
    document.body.innerHTML = "";
    window.localStorage.clear();
    window.sessionStorage.clear();
  });

  it("keeps the successful email-only signup copy limited to delivery", async () => {
    vi.useFakeTimers();
    vi.spyOn(globalThis, "fetch").mockResolvedValue(new Response(JSON.stringify({ ok: true }), { status: 202 }));
    const host = document.createElement("div");
    document.body.append(host);
    const root = createRoot(host);

    await act(async () => {
      root.render(
        <MemoryRouter initialEntries={["/resources/guides/period-tracker-hipaa"]}>
          <ExitIntentLeadMagnet />
        </MemoryRouter>,
      );
    });

    await act(async () => {
      vi.advanceTimersByTime(10_000);
      document.dispatchEvent(new MouseEvent("mouseout", { clientY: 0, relatedTarget: null }));
    });

    const input = document.querySelector<HTMLInputElement>("#lead-magnet-email");
    const form = document.querySelector<HTMLFormElement>(".lead-magnet-modal__form");
    expect(input).not.toBeNull();
    expect(form).not.toBeNull();

    await act(async () => {
      input!.value = "reader@example.com";
      input!.dispatchEvent(new Event("input", { bubbles: true }));
      form!.dispatchEvent(new SubmitEvent("submit", { bubbles: true, cancelable: true }));
    });

    expect(document.body.textContent).toContain("We sent the PDF to your inbox");
    expect(document.body.textContent).not.toMatch(/lead magnet/i);
    expect(document.body.textContent).not.toMatch(new RegExp(`${"follow"}[- ]?${"up"}|sequence|unsubscribe|anytime`, "i"));
  });
});
