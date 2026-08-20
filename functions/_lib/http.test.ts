import { describe, expect, it } from "vitest";
import { methodNotAllowed } from "./http";

describe("edge http helpers", () => {
  it("sets the Allow header on method-not-allowed responses", async () => {
    const response = methodNotAllowed(["GET", "HEAD"]);
    const payload = await response.json();

    expect(response.status).toBe(405);
    expect(response.headers.get("Allow")).toBe("GET, HEAD");
    expect(payload).toMatchObject({
      error: {
        code: "METHOD_NOT_ALLOWED",
        details: { allow: ["GET", "HEAD"] },
      },
    });
  });
});
