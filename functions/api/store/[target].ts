import type { EdgeData, EdgeEnv } from "../../_lib/bindings";
import { buildStoreRedirectUrl, detectStoreTarget } from "../../_lib/store";
import { isStoreTarget, readSingleParam } from "../../_lib/bindings";
import { errorResponse, methodNotAllowed } from "../../_lib/http";
import {
  annotateSentry,
  captureHandledException,
} from "../../_lib/sentry";

export const onRequest: PagesFunction<EdgeEnv, "target", EdgeData> = async (
  context,
) => {
  if (!["GET", "HEAD"].includes(context.request.method)) {
    return methodNotAllowed(["GET", "HEAD"]);
  }

  const requested = readSingleParam(context.params.target);
  const target =
    requested === "auto"
      ? detectStoreTarget(context.request.headers.get("user-agent"))
      : requested;

  if (!target || !isStoreTarget(target)) {
    return errorResponse(404, "STORE_TARGET_NOT_FOUND", "Unknown store target.");
  }

  annotateSentry(context, "api.store.redirect", { target });

  try {
    const destination = buildStoreRedirectUrl(context, target);

    if (!destination) {
      return errorResponse(
        503,
        "STORE_TARGET_UNCONFIGURED",
        `No destination is configured for "${target}".`,
      );
    }

    return new Response(null, {
      status: 302,
      headers: {
        "Cache-Control": "no-store",
        Location: destination.toString(),
      },
    });
  } catch (error) {
    captureHandledException(context, "api.store.redirect", error, { target });

    return errorResponse(
      500,
      "STORE_REDIRECT_FAILED",
      "Unable to build the requested store redirect.",
    );
  }
};
