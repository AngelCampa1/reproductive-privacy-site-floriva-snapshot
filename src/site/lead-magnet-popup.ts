import { florivaKnowledge } from "@/site/knowledge";

const DAY_MS = 24 * 60 * 60 * 1000;
const excludedPathPrefixes = florivaKnowledge.leadMagnetUi.popupExcludedPathPrefixes;

export const leadMagnetPopupStorageKeys = florivaKnowledge.leadMagnetUi.popupStorageKeys;

export function getLeadMagnetSuppression(kind: "dismissed" | "submitted", now = Date.now()): number {
  return now + (kind === "dismissed" ? 14 : 90) * DAY_MS;
}

export function canShowLeadMagnetPopup({
  dismissedUntil,
  pathname,
  submittedUntil,
}: {
  dismissedUntil: number | null;
  pathname: string;
  submittedUntil: number | null;
}): boolean {
  const normalizedPathname = pathname.replace(/\/+$/, "").toLowerCase() || "/";

  if (excludedPathPrefixes.some((prefix) => normalizedPathname === prefix || normalizedPathname.startsWith(`${prefix}/`))) {
    return false;
  }

  const now = Date.now();

  if (dismissedUntil && dismissedUntil > now) {
    return false;
  }

  if (submittedUntil && submittedUntil > now) {
    return false;
  }

  return true;
}

export function readSuppressionValue(storage: Storage, key: string): number | null {
  const value = Number(storage.getItem(key));
  return Number.isFinite(value) && value > 0 ? value : null;
}
