import { afterEach, describe, expect, it } from "vitest";
import {
  configureZaby,
  DEFAULT_ZABY_API_ORIGIN,
  LOCAL_ZABY_API_ORIGIN,
  resetZabyConfigForTests,
  resolveZabyConfig,
} from "../src/config";

afterEach(() => {
  resetZabyConfigForTests();
});

describe("config — environment resolution", () => {
  it("defaults to production when nothing is set", () => {
    const config = resolveZabyConfig({ fetch: globalThis.fetch });
    expect(config.environment).toBe("production");
    expect(config.apiOrigin).toBe(DEFAULT_ZABY_API_ORIGIN);
  });

  it("uses local origin when environment=local", () => {
    const config = resolveZabyConfig({ environment: "local", fetch: globalThis.fetch });
    expect(config.apiOrigin).toBe(LOCAL_ZABY_API_ORIGIN);
  });

  it("uses prod origin when environment=staging (no separate staging origin)", () => {
    const config = resolveZabyConfig({ environment: "staging", fetch: globalThis.fetch });
    expect(config.apiOrigin).toBe(DEFAULT_ZABY_API_ORIGIN);
  });

  it("respects explicit apiOrigin over environment", () => {
    const config = resolveZabyConfig({
      environment: "production",
      apiOrigin: "https://custom.example.com/",
      fetch: globalThis.fetch,
    });
    expect(config.apiOrigin).toBe("https://custom.example.com");
  });

  it("strips trailing slashes from apiOrigin", () => {
    const config = resolveZabyConfig({
      apiOrigin: "https://example.com///",
      fetch: globalThis.fetch,
    });
    expect(config.apiOrigin).toBe("https://example.com");
  });

  it("uses global config via configureZaby", () => {
    configureZaby({ apiOrigin: "https://global.example.com" });
    const config = resolveZabyConfig({ fetch: globalThis.fetch });
    expect(config.apiOrigin).toBe("https://global.example.com");
  });

  it("overrides global config with instance-level config", () => {
    configureZaby({ apiOrigin: "https://global.example.com" });
    const config = resolveZabyConfig({ apiOrigin: "https://override.example.com", fetch: globalThis.fetch });
    expect(config.apiOrigin).toBe("https://override.example.com");
  });

  it("defaults timeoutMs to 30000", () => {
    const config = resolveZabyConfig({ fetch: globalThis.fetch });
    expect(config.timeoutMs).toBe(30_000);
  });

  it("accepts custom timeoutMs", () => {
    const config = resolveZabyConfig({ timeoutMs: 5000, fetch: globalThis.fetch });
    expect(config.timeoutMs).toBe(5000);
  });
});

describe("config — retry policy normalization", () => {
  it("returns zero retries when retries is undefined", () => {
    const config = resolveZabyConfig({ fetch: globalThis.fetch });
    expect(config.retries.attempts).toBe(0);
    expect(config.retries.retryMethods).toEqual([]);
    expect(config.retries.retryStatuses).toEqual([]);
  });

  it("normalizes number shorthand with default retry methods and statuses", () => {
    const config = resolveZabyConfig({ retries: 3, fetch: globalThis.fetch });
    expect(config.retries.attempts).toBe(3);
    expect(config.retries.retryMethods).toEqual(["GET", "HEAD", "OPTIONS"]);
    expect(config.retries.retryStatuses).toEqual([408, 429, 500, 502, 503, 504]);
    expect(config.retries.backoffMs).toBeTypeOf("function");
  });

  it("normalizes object RetryPolicy correctly", () => {
    const config = resolveZabyConfig({
      retries: {
        attempts: 5,
        retryMethods: ["GET"],
        retryStatuses: [500],
        backoffMs: (a: number) => a * 100,
      },
      fetch: globalThis.fetch,
    });
    expect(config.retries.attempts).toBe(5);
    expect(config.retries.retryMethods).toEqual(["GET"]);
    expect(config.retries.retryStatuses).toEqual([500]);
    expect(config.retries.backoffMs!(2)).toBe(200);
  });

  it("provides default retry policies when only some are specified", () => {
    const config = resolveZabyConfig({ retries: { attempts: 3 }, fetch: globalThis.fetch });
    expect(config.retries.attempts).toBe(3);
    expect(config.retries.retryMethods).toEqual(["GET", "HEAD", "OPTIONS"]);
    expect(config.retries.retryStatuses).toEqual([408, 429, 500, 502, 503, 504]);
  });

  it("clamps negative number retries to 0", () => {
    const config = resolveZabyConfig({ retries: -1, fetch: globalThis.fetch });
    expect(config.retries.attempts).toBe(0);
  });
});
