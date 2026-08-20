import type { EdgeData, EdgeEnv } from "../../_lib/bindings";
import { errorResponse, methodNotAllowed } from "../../_lib/http";

export const onRequest: PagesFunction<EdgeEnv, string, EdgeData> = async (context) => {
  if (context.request.method !== "GET" && context.request.method !== "HEAD") {
    return methodNotAllowed(["GET", "HEAD"]);
  }

  return errorResponse(
    410,
    "LEAD_MAGNET_STATIC_DOWNLOAD_REMOVED",
    "Lead magnet downloads are delivered through signed email links.",
  );
};
