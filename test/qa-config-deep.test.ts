import { describe, it, expect, beforeEach } from "vitest";
import { configureZaby, resetZabyConfigForTests, resolveZabyConfig, DEFAULT_ZABY_API_ORIGIN } from "../src/config";

describe("BUG-001: number shorthand retries never trigger", () => {
  beforeEach(() => resetZabyConfigForTests());

  it("resolveZabyConfig normalizes retries:3 to { attempts:3 }", () => {
    const config = resolveZabyConfig({ retries: 3, fetch: globalThis.fetch });
    expect(config.retries.attempts).toBe(3);
  });

  it("BUG-001 fixed: number shorthand includes default retryMethods and retryStatuses", () => {
    const config = resolveZabyConfig({ retries: 3, fetch: globalThis.fetch });
    expect(config.retries.retryMethods).toEqual(["GET", "HEAD", "OPTIONS"]);
    expect(config.retries.retryStatuses).toEqual([408, 429, 500, 502, 503, 504]);
  });

  it("object form retries include default retryMethods and retryStatuses", () => {
    // Object form provides defaults for retryMethods/retryStatuses:
    const config = resolveZabyConfig({ retries: { attempts: 3 }, fetch: globalThis.fetch });
    expect(config.retries.attempts).toBe(3);
    expect(config.retries.retryMethods).toEqual(["GET", "HEAD", "OPTIONS"]);
    expect(config.retries.retryStatuses).toEqual([408, 429, 500, 502, 503, 504]);
  });
});

describe("Transport configuration", () => {
  beforeEach(() => resetZabyConfigForTests());

  it("uses default origin when none configured", () => {
    const config = resolveZabyConfig({ fetch: globalThis.fetch });
    expect(config.apiOrigin).toBe(DEFAULT_ZABY_API_ORIGIN);
  });

  it("uses local origin for environment=local", () => {
    const config = resolveZabyConfig({ environment: "local", fetch: globalThis.fetch });
    expect(config.apiOrigin).toMatch(/localhost/);
  });

  it("custom apiOrigin overrides environment", () => {
    const config = resolveZabyConfig({
      environment: "local",
      apiOrigin: "https://custom.example.com",
      fetch: globalThis.fetch,
    });
    expect(config.apiOrigin).toBe("https://custom.example.com");
  });
});

describe("Multiple configureZaby calls", () => {
  beforeEach(() => resetZabyConfigForTests());

  it("merges with previous config", () => {
    configureZaby({ apiOrigin: "https://first.example.com" });
    const config = resolveZabyConfig({ fetch: globalThis.fetch });
    expect(config.apiOrigin).toBe("https://first.example.com");
  });

  it("resets between tests", () => {
    const config = resolveZabyConfig({ fetch: globalThis.fetch });
    expect(config.apiOrigin).toBe(DEFAULT_ZABY_API_ORIGIN);
  });
});
