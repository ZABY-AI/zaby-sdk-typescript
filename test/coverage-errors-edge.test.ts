import { describe, it, expect } from "vitest";
import {
  ZabyApiError,
  ZabyAuthError,
  ZabyPermissionError,
  ZabyValidationError,
  ZabyRateLimitError,
  ZabyRuntimeTokenExpiredError,
  ZabyRuntimeTokenExhaustedError,
  ZabyStreamError,
  createZabyApiError,
} from "../src/errors";

describe("createZabyApiError — all branches", () => {
  it("returns ZabyRuntimeTokenExpiredError for expired code", () => {
    const err = createZabyApiError({ status: 401, message: "expired", code: "MANAGED_AGENT_RUNTIME_TOKEN_EXPIRED" });
    expect(err).toBeInstanceOf(ZabyRuntimeTokenExpiredError);
  });

  it("returns ZabyRuntimeTokenExhaustedError for exhausted code", () => {
    const err = createZabyApiError({ status: 403, message: "exhausted", code: "MANAGED_AGENT_RUNTIME_TOKEN_GRANT_MAX_USES_EXCEEDED" });
    expect(err).toBeInstanceOf(ZabyRuntimeTokenExhaustedError);
  });

  it("returns ZabyRateLimitError for status 429", () => {
    const err = createZabyApiError({ status: 429, message: "rate limit" });
    expect(err).toBeInstanceOf(ZabyRateLimitError);
  });

  it("returns ZabyAuthError for status 401", () => {
    const err = createZabyApiError({ status: 401, message: "unauthorized" });
    expect(err).toBeInstanceOf(ZabyAuthError);
  });

  it("returns ZabyPermissionError for status 403", () => {
    const err = createZabyApiError({ status: 403, message: "forbidden" });
    expect(err).toBeInstanceOf(ZabyPermissionError);
  });

  it("returns ZabyValidationError for status 400", () => {
    const err = createZabyApiError({ status: 400, message: "bad request" });
    expect(err).toBeInstanceOf(ZabyValidationError);
  });

  it("returns ZabyValidationError for status 422", () => {
    const err = createZabyApiError({ status: 422, message: "unprocessable" });
    expect(err).toBeInstanceOf(ZabyValidationError);
  });

  it("returns base ZabyApiError for unknown status", () => {
    const err = createZabyApiError({ status: 500, message: "server error" });
    expect(err).toBeInstanceOf(ZabyApiError);
    expect(err).not.toBeInstanceOf(ZabyAuthError);
  });

  it("returns ZabyStreamError for stream-related error", () => {
    const err = createZabyApiError({ status: 0, message: "stream error" });
    expect(err).toBeInstanceOf(ZabyApiError);
  });
});

describe("ZabyStreamError instantiation", () => {
  it("creates ZabyStreamError with correct name", () => {
    const err = new ZabyStreamError({ status: 0, message: "stream disconnected" });
    expect(err.name).toBe("ZabyStreamError");
    expect(err.status).toBe(0);
    expect(err.message).toBe("stream disconnected");
  });
});

describe("error instance properties", () => {
  it("sets requestId, retryAfter, details when provided", () => {
    const err = new ZabyApiError({
      status: 429,
      message: "slow down",
      code: "RATE_LIMIT",
      requestId: "req_1",
      retryAfter: 30,
      details: { limit: 100 },
    });
    expect(err.code).toBe("RATE_LIMIT");
    expect(err.requestId).toBe("req_1");
    expect(err.retryAfter).toBe(30);
    expect(err.details).toEqual({ limit: 100 });
  });

  it("omits optional fields when not provided", () => {
    const err = new ZabyApiError({ status: 500, message: "fail" });
    expect(err.code).toBeUndefined();
    expect(err.requestId).toBeUndefined();
    expect(err.retryAfter).toBeUndefined();
    expect(err.details).toBeUndefined();
  });
});

describe("error subclasses have correct names", () => {
  it("ZabyAuthError", () => expect(new ZabyAuthError({ status: 401, message: "" }).name).toBe("ZabyAuthError"));
  it("ZabyPermissionError", () => expect(new ZabyPermissionError({ status: 403, message: "" }).name).toBe("ZabyPermissionError"));
  it("ZabyValidationError", () => expect(new ZabyValidationError({ status: 400, message: "" }).name).toBe("ZabyValidationError"));
  it("ZabyRateLimitError", () => expect(new ZabyRateLimitError({ status: 429, message: "" }).name).toBe("ZabyRateLimitError"));
  it("ZabyRuntimeTokenExpiredError", () => expect(new ZabyRuntimeTokenExpiredError({ status: 401, message: "" }).name).toBe("ZabyRuntimeTokenExpiredError"));
  it("ZabyRuntimeTokenExhaustedError", () => expect(new ZabyRuntimeTokenExhaustedError({ status: 403, message: "" }).name).toBe("ZabyRuntimeTokenExhaustedError"));
  it("ZabyStreamError", () => expect(new ZabyStreamError({ status: 0, message: "" }).name).toBe("ZabyStreamError"));
});
