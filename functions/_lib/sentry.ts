import sentryPlugin from "@cloudflare/pages-plugin-sentry";
import type { EdgeContext } from "./bindings";

type ResponseTransformer = (response: Response) => Promise<Response> | Response;
type SentryEventWithRequest = {
  request?: {
    query_string?: string;
    url?: string;
  };
};

function stripUrlSearch(value: string): string {
  try {
    const url = new URL(value);
    url.search = "";
    return url.toString();
  } catch {
    return value.split("?")[0] ?? value;
  }
}

export function scrubSentryEvent(event: SentryEventWithRequest): SentryEventWithRequest {
  if (event.request) {
    if (typeof event.request.url === "string") {
      event.request.url = stripUrlSearch(event.request.url);
    }
    delete event.request.query_string;
  }

  return event;
}

export async function runWithEdgeSentry(
  context: EdgeContext,
  responseTransformer?: ResponseTransformer,
): Promise<Response> {
  context.data = {
    ...context.data,
    requestId: context.data.requestId ?? crypto.randomUUID(),
  };

  if (responseTransformer) {
    const next = context.next.bind(context);

    context.next = (async (...args: Parameters<typeof next>) => {
      const response = await next(...args);
      return responseTransformer(response);
    }) as typeof context.next;
  }

  const dsn = context.env.SENTRY_DSN?.trim();

  if (!dsn) {
    return context.next();
  }

  const handler = sentryPlugin({
    beforeSend: scrubSentryEvent,
    dsn,
    environment: context.env.SENTRY_ENVIRONMENT?.trim() || undefined,
    release: context.env.SENTRY_RELEASE?.trim() || undefined,
  });

  return handler(context);
}

export function annotateSentry(
  context: EdgeContext,
  route: string,
  tags: Record<string, string | number | boolean | undefined> = {},
): void {
  const sentry = context.data.sentry;

  if (!sentry) {
    return;
  }

  sentry.setTag("edge.route", route);
  sentry.setTag("edge.request_id", context.data.requestId ?? "unknown");
  const requestUrl = new URL(context.request.url);
  sentry.setContext("edge_request", {
    method: context.request.method,
    origin: requestUrl.origin,
    pathname: requestUrl.pathname,
    requestId: context.data.requestId ?? null,
  });

  for (const [key, value] of Object.entries(tags)) {
    if (value !== undefined) {
      sentry.setTag(key, String(value));
    }
  }
}

export function captureHandledException(
  context: EdgeContext,
  route: string,
  error: unknown,
  tags: Record<string, string | number | boolean | undefined> = {},
): void {
  annotateSentry(context, route, tags);
  context.data.sentry?.captureException(error);
}
