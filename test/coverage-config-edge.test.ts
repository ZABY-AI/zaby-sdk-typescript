import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import {
  configureZaby,
  resolveZabyConfig,
  resetZabyConfigForTests,
  DEFAULT_ZABY_API_ORIGIN,
  LOCAL_ZABY_API_ORIGIN,
} from "../src/config";

beforeEach(() => resetZabyConfigForTests());
afterEach(() => vi.restoreAllMocks());

describe("resolveZabyConfig edge cases", () => {
  it("throws when no fetch implementation available", () => {
    const origFetch = globalThis.fetch;
    (globalThis as any).fetch = undefined;
    expect(() => resolveZabyConfig({})).toThrow("requires a fetch implementation");
    (globalThis as any).fetch = origFetch;
  });

  it("reads environment from ZABY_ENVIRONMENT env var", () => {
    vi.stubEnv("ZABY_ENVIRONMENT", "staging");
    vi.stubEnv("ZABY_API_ORIGIN", "");
    const config = resolveZabyConfig({ fetch: globalThis.fetch });
    expect(config.environment).toBe("staging");
    vi.unstubAllEnvs();
  });

  it("reads apiOrigin from ZABY_API_ORIGIN env var", () => {
    vi.stubEnv("ZABY_API_ORIGIN", "https://custom.api.com");
    const config = resolveZabyConfig({ fetch: globalThis.fetch });
    expect(config.apiOrigin).toBe("https://custom.api.com");
    vi.unstubAllEnvs();
  });

  it("overrides env with global config", () => {
    vi.stubEnv("ZABY_ENVIRONMENT", "production");
    configureZaby({ environment: "staging" });
    const config = resolveZabyConfig({ fetch: globalThis.fetch });
    expect(config.environment).toBe("staging");
    vi.unstubAllEnvs();
  });

  it("overrides global config with instance config", () => {
    configureZaby({ environment: "production" });
    const config = resolveZabyConfig({ environment: "local", fetch: globalThis.fetch });
    expect(config.apiOrigin).toBe(LOCAL_ZABY_API_ORIGIN);
  });

  it("defaults environment to production when unset", () => {
    const config = resolveZabyConfig({ fetch: globalThis.fetch });
    expect(config.environment).toBe("production");
    expect(config.apiOrigin).toBe(DEFAULT_ZABY_API_ORIGIN);
  });

  it("strips trailing slashes from apiOrigin", () => {
    const config = resolveZabyConfig({ apiOrigin: "https://example.com///", fetch: globalThis.fetch });
    expect(config.apiOrigin).toBe("https://example.com");
  });

  it("defaults retries to disabled when retries is undefined", () => {
    const config = resolveZabyConfig({ fetch: globalThis.fetch });
    expect(config.retries.attempts).toBe(0);
    expect(config.retries.retryMethods).toEqual([]);
  });

  it("calls backoffMs default function (config.ts:89 coverage)", () => {
    const config = resolveZabyConfig({ retries: {}, fetch: globalThis.fetch });
    expect(config.retries.attempts).toBe(2);
    expect(config.retries.backoffMs).toBeTypeOf("function");
    const result = config.retries.backoffMs!(0);
    expect(result).toBe(100);
    const result2 = config.retries.backoffMs!(4);
    expect(result2).toBe(1000); // capped
  });

  it("normalizes retries:0 to attempts:0", () => {
    const config = resolveZabyConfig({ retries: 0, fetch: globalThis.fetch });
    expect(config.retries.attempts).toBe(0);
  });

  it("normalizes negative retries to 0", () => {
    const config = resolveZabyConfig({ retries: -5, fetch: globalThis.fetch });
    expect(config.retries.attempts).toBe(0);
  });

  it("sets userAgent when provided", () => {
    const config = resolveZabyConfig({ fetch: globalThis.fetch, userAgent: "my-app/1.0" });
    expect(config.userAgent).toBe("my-app/1.0");
  });

  it("does not set userAgent when not provided", () => {
    const config = resolveZabyConfig({ fetch: globalThis.fetch });
    expect(config.userAgent).toBeUndefined();
  });

  it("defaults timeoutMs to 30000", () => {
    const config = resolveZabyConfig({ fetch: globalThis.fetch });
    expect(config.timeoutMs).toBe(30_000);
  });

  it("accepts custom timeoutMs", () => {
    const config = resolveZabyConfig({ fetch: globalThis.fetch, timeoutMs: 5000 });
    expect(config.timeoutMs).toBe(5000);
  });
});
