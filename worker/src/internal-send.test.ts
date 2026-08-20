import { describe, expect, it } from "vitest";
import { parseInternalSend } from "./internal-send";

const valid = {
  headers: { "List-Unsubscribe": "<https://floriva.app/u>" },
  html: "<p>hi</p>",
  subject: "Your download",
  text: "hi",
  to: "user@example.com",
};

describe("parseInternalSend", () => {
  it("accepts a well-formed payload", () => {
    expect(parseInternalSend(valid)).toEqual(valid);
  });

  it("accepts a payload without optional headers", () => {
    const { headers: _headers, ...rest } = valid;
    expect(parseInternalSend(rest)).toEqual({ ...rest, headers: undefined });
  });

  it("rejects non-objects", () => {
    expect(parseInternalSend(null)).toBeNull();
    expect(parseInternalSend("nope")).toBeNull();
  });

  it("rejects missing or empty required fields", () => {
    expect(parseInternalSend({ ...valid, to: "" })).toBeNull();
    expect(parseInternalSend({ ...valid, subject: "   " })).toBeNull();
    expect(parseInternalSend({ ...valid, html: 123 })).toBeNull();
  });

  it("rejects non-string headers", () => {
    expect(parseInternalSend({ ...valid, headers: { "X-Bad": 5 } })).toBeNull();
  });

  it("rejects a recipient carrying a line break (header injection)", () => {
    expect(parseInternalSend({ ...valid, to: "user@example.com\r\nBcc: evil@example.com" })).toBeNull();
    expect(parseInternalSend({ ...valid, to: "user@example.com\nBcc: evil@example.com" })).toBeNull();
  });
});
