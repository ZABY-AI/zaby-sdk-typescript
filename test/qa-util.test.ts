import { describe, expect, it } from "vitest";
import { joinPath, encodePath, appendQuery } from "../src/util";

describe("util — encodePath", () => {
  it("encodes special characters", () => {
    expect(encodePath("hello world")).toBe("hello%20world");
    expect(encodePath("a/b?c=d")).toBe("a%2Fb%3Fc%3Dd");
    expect(encodePath("user@example.com")).toBe("user%40example.com");
  });

  it("passes through simple strings", () => {
    expect(encodePath("abc123")).toBe("abc123");
    expect(encodePath("run_123")).toBe("run_123");
    expect(encodePath("")).toBe("");
  });

  it("encodes unicode characters", () => {
    expect(encodePath("héllo")).toBe("h%C3%A9llo");
  });
});

describe("util — appendQuery", () => {
  it("appends single query param", () => {
    expect(appendQuery("/path", { key: "val" })).toBe("/path?key=val");
  });

  it("returns path unchanged when query is undefined", () => {
    expect(appendQuery("/path", undefined)).toBe("/path");
  });

  it("returns path unchanged when query is empty object", () => {
    expect(appendQuery("/path", {})).toBe("/path");
  });

  it("handles multiple query params", () => {
    const result = appendQuery("/path", { a: "1", b: "2" });
    expect(result).toContain("a=1");
    expect(result).toContain("b=2");
    expect(result).toContain("?");
  });

  it("skips null and undefined values", () => {
    const result = appendQuery("/path", { a: "1", b: null, c: undefined });
    expect(result).toBe("/path?a=1");
  });

  it("handles array values by repeating the key", () => {
    const result = appendQuery("/path", { id: ["a", "b", "c"] });
    expect(result).toBe("/path?id=a&id=b&id=c");
  });

  it("converts number and boolean values to strings", () => {
    const result = appendQuery("/path", {
      num: 42,
      flag: true,
      flag2: false,
    });
    expect(result).toContain("num=42");
    expect(result).toContain("flag=true");
    expect(result).toContain("flag2=false");
  });
});

describe("util — joinPath", () => {
  it("joins path segments", () => {
    expect(joinPath("/api", "v1", "users")).toBe("/api/v1/users");
  });

  it("handles trailing slashes", () => {
    expect(joinPath("/api/", "v1/", "/users")).toBe("/api/v1/users");
  });

  it("handles empty segments", () => {
    expect(joinPath("/api", "", "v1")).toBe("/api/v1");
  });

  it("returns empty string for no args", () => {
    expect(joinPath()).toBe("");
  });
});
