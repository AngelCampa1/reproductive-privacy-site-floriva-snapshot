const baseHeaders = {
  "Cache-Control": "no-store",
  "X-Content-Type-Options": "nosniff",
} satisfies Record<string, string>;

function mergeHeaders(
  initHeaders?: HeadersInit,
  overrides?: Record<string, string>,
): Headers {
  const headers = new Headers(baseHeaders);

  if (initHeaders) {
    new Headers(initHeaders).forEach((value, key) => {
      headers.set(key, value);
    });
  }

  if (overrides) {
    for (const [key, value] of Object.entries(overrides)) {
      headers.set(key, value);
    }
  }

  return headers;
}

export function json(body: unknown, init: ResponseInit = {}): Response {
  return new Response(JSON.stringify(body), {
    ...init,
    headers: mergeHeaders(init.headers, {
      "Content-Type": "application/json; charset=utf-8",
    }),
  });
}

export function empty(status = 204, init: ResponseInit = {}): Response {
  return new Response(null, {
    ...init,
    status,
    headers: mergeHeaders(init.headers),
  });
}

export function errorResponse(
  status: number,
  code: string,
  message: string,
  details?: Record<string, unknown>,
): Response {
  return json(
    {
      ok: false,
      error: {
        code,
        message,
        ...(details ? { details } : {}),
      },
    },
    { status },
  );
}

export function methodNotAllowed(allowedMethods: string[]): Response {
  const response = errorResponse(
    405,
    "METHOD_NOT_ALLOWED",
    `Method not allowed. Use ${allowedMethods.join(", ")}.`,
    { allow: allowedMethods },
  );

  response.headers.set("Allow", allowedMethods.join(", "));
  return response;
}

export function options(allowedMethods: string[]): Response {
  return empty(204, {
    headers: {
      Allow: [...allowedMethods, "OPTIONS"].join(", "),
    },
  });
}

export function sameOriginRequired(): Response {
  return errorResponse(
    403,
    "CROSS_ORIGIN_WRITE_BLOCKED",
    "Cross-origin write requests are not allowed for this endpoint.",
  );
}
