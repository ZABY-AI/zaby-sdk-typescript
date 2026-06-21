export const DEFAULT_ZABY_API_ORIGIN = "https://genapi.zaby.io";
export const LOCAL_ZABY_API_ORIGIN = "http://localhost:9080";

export type ZabyEnvironment = "production" | "staging" | "local" | string;

export type RetryPolicy = {
  attempts?: number;
  retryMethods?: string[];
  retryStatuses?: number[];
  backoffMs?: (attempt: number) => number;
};

export type FetchLike = typeof fetch;

export type ZabyGlobalConfig = {
  environment?: ZabyEnvironment;
  apiOrigin?: string;
  timeoutMs?: number;
  retries?: number | RetryPolicy;
  fetch?: FetchLike;
  userAgent?: string;
};

export type ResolvedZabyConfig = Required<Pick<ZabyGlobalConfig, "environment" | "apiOrigin" | "timeoutMs">> & {
  retries: RetryPolicy;
  fetch: FetchLike;
  userAgent?: string;
};

let globalConfig: ZabyGlobalConfig = {};

export function configureZaby(config: ZabyGlobalConfig) {
  globalConfig = { ...globalConfig, ...config };
}

export function resetZabyConfigForTests() {
  globalConfig = {};
}

export function resolveZabyConfig(overrides: ZabyGlobalConfig = {}): ResolvedZabyConfig {
  const merged = {
    environment: readEnv("ZABY_ENVIRONMENT"),
    apiOrigin: readEnv("ZABY_API_ORIGIN"),
    ...globalConfig,
    ...overrides,
  };
  const environment = merged.environment ?? "production";
  const apiOrigin = normalizeApiOrigin(merged.apiOrigin ?? originForEnvironment(environment));
  const fetchImpl = merged.fetch ?? globalThis.fetch;
  if (!fetchImpl) {
    throw new Error("Zaby SDK requires a fetch implementation.");
  }

  return {
    environment,
    apiOrigin,
    timeoutMs: merged.timeoutMs ?? 30_000,
    retries: normalizeRetryPolicy(merged.retries),
    fetch: fetchImpl,
    ...(merged.userAgent ? { userAgent: merged.userAgent } : {}),
  };
}

function originForEnvironment(environment: ZabyEnvironment) {
  if (environment === "local") return LOCAL_ZABY_API_ORIGIN;
  return DEFAULT_ZABY_API_ORIGIN;
}

function normalizeApiOrigin(value: string) {
  return value.replace(/\/+$/u, "");
}

function normalizeRetryPolicy(value: ZabyGlobalConfig["retries"]): RetryPolicy {
  if (value === undefined) {
    return { attempts: 0, retryMethods: [], retryStatuses: [] };
  }
  if (typeof value === "number") {
    return { attempts: Math.max(0, Math.floor(value)) };
  }
  return {
    attempts: value?.attempts ?? 2,
    retryMethods: value?.retryMethods ?? ["GET", "HEAD", "OPTIONS"],
    retryStatuses: value?.retryStatuses ?? [408, 429, 500, 502, 503, 504],
    backoffMs: value?.backoffMs ?? ((attempt) => Math.min(100 * 2 ** attempt, 1_000)),
  };
}

function readEnv(key: string) {
  const env = globalThis as typeof globalThis & { process?: { env?: Record<string, string | undefined> } };
  return env.process?.env?.[key];
}
