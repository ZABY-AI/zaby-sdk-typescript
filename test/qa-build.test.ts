import { describe, expect, it } from "vitest";
import { appendQuery } from "../src/util";

describe("utility — query parameter type safety (BUG-009)", () => {
  it("appendQuery accepts the correct Query type", () => {
    const result = appendQuery("/path", {
      str: "hello",
      num: 42,
      bool: true,
      nil: null,
      undef: undefined,
      arr: ["a", "b"],
    });
    expect(result).toContain("str=hello");
    expect(result).toContain("num=42");
    expect(result).toContain("bool=true");
    expect(result).not.toContain("nil=");
    expect(result).not.toContain("undef=");
    expect(result).toContain("arr=a");
    expect(result).toContain("arr=b");
  });

  it("does NOT coerce nested objects properly - object passed as query value", () => {
    // This simulates what happens when `as any` is used and a caller
    // passes an object instead of a primitive
    const params = new URLSearchParams();
    params.set("key", String({ foo: "bar" }));
    const serialized = params.toString();
    expect(serialized).toBe("key=%5Bobject+Object%5D");
    // The value "[object Object]" is useless - this is the runtime
    // consequence of the `as any` casts in the client methods
  });
});

describe("build — module exports", () => {
  it("exports all expected symbols from index", async () => {
    const mod = await import("../src/index");
    expect(mod.Zaby).toBeDefined();
    expect(mod.ZabyRuntime).toBeDefined();
    expect(mod.configureZaby).toBeDefined();
    expect(mod.resetZabyConfigForTests).toBeDefined();
    expect(mod.DEFAULT_ZABY_API_ORIGIN).toBeDefined();
    expect(mod.LOCAL_ZABY_API_ORIGIN).toBeDefined();
    expect(mod.ZabyApiError).toBeDefined();
    expect(mod.ZabyAuthError).toBeDefined();
    expect(mod.ZabyPermissionError).toBeDefined();
    expect(mod.ZabyRateLimitError).toBeDefined();
    expect(mod.ZabyRuntimeTokenExpiredError).toBeDefined();
    expect(mod.ZabyRuntimeTokenExhaustedError).toBeDefined();
    expect(mod.ZabyStreamError).toBeDefined();
    expect(mod.ZabyValidationError).toBeDefined();
    expect(mod.ZabyClientOptions).not.toBeDefined(); // type only
    expect(mod.ZabyRuntimeOptions).not.toBeDefined(); // type only
  });
});
