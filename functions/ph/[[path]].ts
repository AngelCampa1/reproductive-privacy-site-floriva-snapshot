import type { EdgeData, EdgeEnv } from "../_lib/bindings";
import { json } from "../_lib/http";

export const onRequest: PagesFunction<EdgeEnv, "path", EdgeData> = async () =>
  json(
    {
      error: {
        code: "POSTHOG_ENDPOINT_RETIRED",
        message: "This analytics endpoint has been retired.",
      },
      ok: false,
    },
    { status: 404 },
  );
