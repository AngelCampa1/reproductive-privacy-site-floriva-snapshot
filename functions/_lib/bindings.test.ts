import { describe, expect, it } from "vitest";
import { isStoreTarget } from "./bindings";

describe("edge bindings", () => {
  it("only exposes native app store redirect targets", () => {
    expect(isStoreTarget("ios")).toBe(true);
    expect(isStoreTarget("android")).toBe(true);
    expect(isStoreTarget("web")).toBe(false);
  });
});
