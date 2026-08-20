import type { EdgeData, EdgeEnv } from "./_lib/bindings";
import { handleSeoRequest } from "./_middleware";

export const onRequest: PagesFunction<EdgeEnv, "path", EdgeData> = async (context) =>
  handleSeoRequest(context);
