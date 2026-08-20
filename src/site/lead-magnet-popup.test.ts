import { describe, expect, it } from "vitest";
import { canShowLeadMagnetPopup, getLeadMagnetSuppression } from "@/site/lead-magnet-popup";

describe("lead magnet popup rules", () => {
  it("excludes legal, support, and free resource pages", () => {
    expect(canShowLeadMagnetPopup({ pathname: "/privacy", dismissedUntil: null, submittedUntil: null })).toBe(false);
    expect(canShowLeadMagnetPopup({ pathname: "/terms", dismissedUntil: null, submittedUntil: null })).toBe(false);
    expect(canShowLeadMagnetPopup({ pathname: "/support", dismissedUntil: null, submittedUntil: null })).toBe(false);
    expect(canShowLeadMagnetPopup({ pathname: "/free/privacy-guide", dismissedUntil: null, submittedUntil: null })).toBe(false);
  });

  it("honors dismissal and submission suppression windows", () => {
    const future = Date.now() + 10_000;

    expect(canShowLeadMagnetPopup({ pathname: "/compare", dismissedUntil: future, submittedUntil: null })).toBe(false);
    expect(canShowLeadMagnetPopup({ pathname: "/compare", dismissedUntil: null, submittedUntil: future })).toBe(false);
  });

  it("allows normal content pages when no suppression exists", () => {
    expect(canShowLeadMagnetPopup({ pathname: "/resources/guides/period-tracker-hipaa", dismissedUntil: null, submittedUntil: null })).toBe(true);
  });

  it("uses separate suppression windows for dismissals and submissions", () => {
    const now = new Date("2026-04-26T12:00:00.000Z").getTime();

    expect(getLeadMagnetSuppression("dismissed", now)).toBe(now + 14 * 24 * 60 * 60 * 1000);
    expect(getLeadMagnetSuppression("submitted", now)).toBe(now + 90 * 24 * 60 * 60 * 1000);
  });
});
