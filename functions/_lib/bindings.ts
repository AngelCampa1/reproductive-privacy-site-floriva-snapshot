export type StoreTarget = "ios" | "android";

export interface EdgeSentryClient {
  captureException(error: unknown): void;
  setContext(name: string, context: Record<string, unknown>): void;
  setTag(name: string, value: string): void;
}

export interface EdgeEnv {
  ASSETS?: Fetcher;
  EMAIL_WORKER?: Fetcher;
  INTERNAL_SEND_SECRET?: string;
  LEAD_MAGNET_BUCKET?: R2Bucket;
  LEAD_MAGNET_DB?: D1Database;
  LEAD_MAGNET_DOWNLOAD_SIGNING_SECRET?: string;
  SENTRY_DSN?: string;
  SENTRY_ENVIRONMENT?: string;
  SENTRY_RELEASE?: string;
  STORE_URL_IOS?: string;
  STORE_URL_ANDROID?: string;
  TURNSTILE_SECRET_KEY?: string;
}

export type EdgeData = {
  requestId?: string;
  sentry?: EdgeSentryClient;
};

export type EdgeContext<Params extends string = string> = EventContext<
  EdgeEnv,
  Params,
  EdgeData
>;

type StoreBindingKey = "STORE_URL_IOS" | "STORE_URL_ANDROID";

const storeBindingByTarget: Record<StoreTarget, StoreBindingKey> = {
  ios: "STORE_URL_IOS",
  android: "STORE_URL_ANDROID",
};

export function getStoreTargetUrl(
  env: EdgeEnv,
  target: StoreTarget,
): URL | null {
  const configured = env[storeBindingByTarget[target]]?.trim();

  if (!configured) {
    return null;
  }

  const url = new URL(configured);

  if (!/^https?:$/.test(url.protocol)) {
    throw new Error(`Store URL for "${target}" must use http or https.`);
  }

  return url;
}

export function isStoreTarget(value: string): value is StoreTarget {
  return value === "ios" || value === "android";
}

export function readSingleParam(
  value: string | string[] | undefined,
): string | null {
  if (typeof value === "string") {
    return value;
  }

  return null;
}

export function getRequestOrigin(request: Request): string {
  return new URL(request.url).origin;
}

export function isSameOriginWrite(request: Request): boolean {
  const origin = request.headers.get("origin");
  const secFetchSite = request.headers.get("sec-fetch-site");

  if (!origin) {
    return secFetchSite === "same-origin";
  }

  return origin === getRequestOrigin(request);
}

export function normalizeCatchAllPath(
  value: string | string[] | undefined,
): string | null {
  const rawSegments = Array.isArray(value) ? value : value ? [value] : [];
  const normalized = rawSegments
    .flatMap((segment) => segment.split("/"))
    .map((segment) => segment.trim())
    .filter(Boolean);

  if (normalized.length === 0) {
    return "";
  }

  if (
    normalized.some(
      (segment) =>
        segment === "." ||
        segment === ".." ||
        segment.includes("://") ||
        segment.endsWith(":"),
    )
  ) {
    return null;
  }

  return normalized.join("/");
}

export function asObjectRecord(
  value: unknown,
): Record<string, unknown> | undefined {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return undefined;
  }

  return value as Record<string, unknown>;
}
