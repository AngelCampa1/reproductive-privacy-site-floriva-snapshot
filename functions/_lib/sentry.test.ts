import { describe, expect, it, vi } from "vitest";
import type { EdgeContext, EdgeSentryClient } from "./bindings";
import { annotateSentry, captureHandledException, scrubSentryEvent } from "./sentry";

function createContext(url: string): EdgeContext {
  const sentry: EdgeSentryClient = {
    captureException: vi.fn(),
    setContext: vi.fn(),
    setTag: vi.fn(),
  };

  return {
    data: {
      requestId: "request-123",
      sentry,
    },
    request: new Request(url, { method: "GET" }),
  } as EdgeContext;
}

describe("edge sentry helpers", () => {
  it("scrubs request URLs and query strings from outgoing Sentry events", () => {
    const event = scrubSentryEvent({
      request: {
        query_string: "slug=guide&sig=secret-signature",
        url: "https://floriva.app/api/lead-magnet/download?slug=guide&sig=secret-signature",
      },
    });

    expect(event.request).toEqual({
      url: "https://floriva.app/api/lead-magnet/download",
    });
  });

  it("redacts query-string credentials from edge request context", () => {
    const context = createContext(
      "https://floriva.app/api/lead-magnet/download?slug=guide&exp=9999999999999&lead=lead-1&sig=secret-signature",
    );

    annotateSentry(context, "lead-magnet.download");

    expect(context.data.sentry?.setContext).toHaveBeenCalledWith("edge_request", {
      method: "GET",
      origin: "https://floriva.app",
      pathname: "/api/lead-magnet/download",
      requestId: "request-123",
    });
    expect(context.data.sentry?.setContext).not.toHaveBeenCalledWith(
      "edge_request",
      expect.objectContaining({
        url: expect.stringContaining("sig=secret-signature"),
      }),
    );
  });

  it("redacts unsubscribe tokens before capturing handled exceptions", () => {
    const context = createContext(
      "https://floriva.app/api/lead-magnet/unsubscribe?t=unsubscribe-token",
    );

    captureHandledException(context, "lead-magnet.unsubscribe", new Error("canary"));

    expect(context.data.sentry?.setContext).toHaveBeenCalledWith("edge_request", {
      method: "GET",
      origin: "https://floriva.app",
      pathname: "/api/lead-magnet/unsubscribe",
      requestId: "request-123",
    });
    expect(context.data.sentry?.setContext).not.toHaveBeenCalledWith(
      "edge_request",
      expect.objectContaining({
        url: expect.stringContaining("unsubscribe-token"),
      }),
    );
    expect(context.data.sentry?.captureException).toHaveBeenCalledOnce();
  });
});
