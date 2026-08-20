import { describe, expect, it } from "vitest";

import { formatDate } from "@/site/format";

describe("formatDate", () => {
  it("keeps date-only values on their stated calendar day", () => {
    expect(formatDate("2026-07-23")).toBe("July 23, 2026");
  });
});
