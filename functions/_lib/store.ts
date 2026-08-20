import { getStoreTargetUrl, type EdgeContext, type StoreTarget } from "./bindings";

const forwardedQueryKeys = new Set([
  "campaign",
  "ref",
  "utm_campaign",
  "utm_content",
  "utm_medium",
  "utm_source",
  "utm_term",
]);

export function detectStoreTarget(userAgent: string | null): StoreTarget {
  return /android/i.test(userAgent ?? "") ? "android" : "ios";
}

export function buildStoreRedirectUrl(
  context: EdgeContext,
  target: StoreTarget,
): URL | null {
  const destination = getStoreTargetUrl(context.env, target);

  if (!destination) {
    return null;
  }

  const redirectUrl = new URL(destination.toString());
  const requestUrl = new URL(context.request.url);

  for (const [key, value] of requestUrl.searchParams.entries()) {
    if (forwardedQueryKeys.has(key)) {
      redirectUrl.searchParams.append(key, value);
    }
  }

  return redirectUrl;
}
