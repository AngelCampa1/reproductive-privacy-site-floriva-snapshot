import { florivaKnowledge } from "./knowledge";

export type StoreTargetKey = "android" | "ios";

export type StoreTarget = {
  key: StoreTargetKey;
  label: string;
  shortLabel: string;
  platformLabel: string;
  description: string;
  href: string | null;
};

export type StoreRedirectAvailability = Record<StoreTargetKey, boolean>;

export const storeTargets: Record<StoreTargetKey, StoreTarget> = {
  ios: {
    key: "ios",
    label: florivaKnowledge.storePresentation.ios.label,
    shortLabel: "App Store",
    platformLabel: "iPad",
    description: florivaKnowledge.storePresentation.ios.description,
    href: florivaKnowledge.storePresentation.ios.url,
  },
  android: {
    key: "android",
    label: florivaKnowledge.storePresentation.android.label,
    shortLabel: "Google Play",
    platformLabel: "Android",
    description: florivaKnowledge.storePresentation.android.description,
    href: florivaKnowledge.storePresentation.android.url,
  },
};

export const defaultStoreRedirectAvailability: StoreRedirectAvailability = {
  ios: false,
  android: false,
};

let availabilityPromise: Promise<StoreRedirectAvailability> | null = null;

function isBrowserRuntime(): boolean {
  return typeof (globalThis as { window?: unknown }).window !== "undefined";
}

function isViteDevRuntime(): boolean {
  return Boolean((import.meta as ImportMeta & { env?: { DEV?: boolean } }).env?.DEV);
}

export function getStoreTarget(key: string): StoreTarget | null {
  if (key === "ios" || key === "android") {
    return storeTargets[key];
  }

  return null;
}

export function hasLiveStoreTargets(
  availability: StoreRedirectAvailability = defaultStoreRedirectAvailability,
): boolean {
  return Object.values(availability).some(Boolean);
}

export function getStoreRedirectHref(key: StoreTargetKey): string {
  return `/api/store/${key}`;
}

function asStoreRedirectAvailability(
  value: unknown,
): StoreRedirectAvailability | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return null;
  }

  const record = value as Record<string, unknown>;

  if (typeof record.ios !== "boolean" || typeof record.android !== "boolean") {
    return null;
  }

  return {
    ios: record.ios,
    android: record.android,
  };
}

export async function getStoreRedirectAvailability(
  fetcher: typeof fetch = fetch,
): Promise<StoreRedirectAvailability> {
  if (!isBrowserRuntime()) {
    return defaultStoreRedirectAvailability;
  }

  const loadAvailability = () =>
    fetcher("/api/health", {
      headers: {
        Accept: "application/json",
      },
    })
      .then(async (response) => {
        if (!response.ok) {
          return defaultStoreRedirectAvailability;
        }

        const payload = (await response.json()) as {
          integrations?: { storeRedirects?: unknown };
        };

        return (
          asStoreRedirectAvailability(payload.integrations?.storeRedirects) ??
          defaultStoreRedirectAvailability
        );
      })
      .catch(() => defaultStoreRedirectAvailability);

  if (fetcher !== fetch) {
    return loadAvailability();
  }

  if (isViteDevRuntime()) {
    return defaultStoreRedirectAvailability;
  }

  if (!availabilityPromise) {
    availabilityPromise = loadAvailability();
  }

  return availabilityPromise;
}
