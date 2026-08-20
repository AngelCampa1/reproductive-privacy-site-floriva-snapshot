import type { EdgeData, EdgeEnv } from "../_lib/bindings";
import { getStoreTargetUrl } from "../_lib/bindings";
import { json, methodNotAllowed } from "../_lib/http";
import { annotateSentry } from "../_lib/sentry";

type StoreRedirectStatus = {
  availability: Record<"ios" | "android", boolean>;
  errors: Partial<Record<"ios" | "android", string>>;
};

function getStoreRedirectStatus(env: EdgeEnv): StoreRedirectStatus {
  const availability: StoreRedirectStatus["availability"] = {
    ios: false,
    android: false,
  };
  const errors: StoreRedirectStatus["errors"] = {};

  for (const target of ["ios", "android"] as const) {
    try {
      availability[target] = Boolean(getStoreTargetUrl(env, target));
    } catch (error) {
      errors[target] = error instanceof Error ? error.message : "Invalid store URL.";
    }
  }

  return { availability, errors };
}

export const onRequest: PagesFunction<EdgeEnv, string, EdgeData> = async (
  context,
) => {
  if (context.request.method !== "GET") {
    return methodNotAllowed(["GET"]);
  }

  annotateSentry(context, "api.health");
  const storeRedirects = getStoreRedirectStatus(context.env);

  return json({
    ok: true,
    requestId: context.data.requestId ?? null,
    service: "floriva-edge",
    timestamp: new Date().toISOString(),
    integrations: {
      sentry: {
        enabled: Boolean(context.env.SENTRY_DSN?.trim()),
        environment: context.env.SENTRY_ENVIRONMENT?.trim() || null,
        release: context.env.SENTRY_RELEASE?.trim() || null,
      },
      storeRedirects: storeRedirects.availability,
      storeRedirectErrors: storeRedirects.errors,
    },
  });
};
