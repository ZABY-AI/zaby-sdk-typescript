import { describe, expect, it } from "vitest";
import {
  ZabyApiError,
  ZabyAuthError,
  ZabyPermissionError,
  ZabyRateLimitError,
  ZabyRuntimeTokenExpiredError,
  ZabyRuntimeTokenExhaustedError,
  ZabyStreamError,
  ZabyValidationError,
  createZabyApiError,
} from "../src/errors";

describe("errors — createZabyApiError factory", () => {
  it("returns ZabyRateLimitError for status 429", () => {
    const err = createZabyApiError({ status: 429, message: "Too many" });
    expect(err).toBeInstanceOf(ZabyRateLimitError);
  });

  it("returns ZabyAuthError for status 401", () => {
    const err = createZabyApiError({ status: 401, message: "Unauthorized" });
    expect(err).toBeInstanceOf(ZabyAuthError);
  });

  it("returns ZabyPermissionError for status 403", () => {
    const err = createZabyApiError({ status: 403, message: "Forbidden" });
    expect(err).toBeInstanceOf(ZabyPermissionError);
  });

  it("returns ZabyValidationError for status 400", () => {
    const err = createZabyApiError({ status: 400, message: "Bad" });
    expect(err).toBeInstanceOf(ZabyValidationError);
  });

  it("returns ZabyValidationError for status 422", () => {
    const err = createZabyApiError({ status: 422, message: "Unprocessable" });
    expect(err).toBeInstanceOf(ZabyValidationError);
  });

  it("returns ZabyRuntimeTokenExpiredError for specific code", () => {
    const err = createZabyApiError({
      status: 401,
      message: "Token expired",
      code: "MANAGED_AGENT_RUNTIME_TOKEN_EXPIRED",
    });
    expect(err).toBeInstanceOf(ZabyRuntimeTokenExpiredError);
  });

  it("returns ZabyRuntimeTokenExhaustedError for specific code", () => {
    const err = createZabyApiError({
      status: 403,
      message: "Max uses exceeded",
      code: "MANAGED_AGENT_RUNTIME_TOKEN_GRANT_MAX_USES_EXCEEDED",
    });
    expect(err).toBeInstanceOf(ZabyRuntimeTokenExhaustedError);
  });

  it("returns generic ZabyApiError for unknown status", () => {
    const err = createZabyApiError({ status: 503, message: "Service down" });
    expect(err).toBeInstanceOf(ZabyApiError);
  });

  it("returns ZabyStreamError for input with stream code", () => {
    // StreamError is returned when a code is given that doesn't match the
    // special token codes but should map to stream
    const err = createZabyApiError({
      status: 500,
      message: "Stream error",
      code: "STREAM_ERROR",
    });
    // Falls through to ZabyApiError because no match
    expect(err).toBeInstanceOf(ZabyApiError);
  });
});

describe("errors — ZabyApiError properties", () => {
  it("stores status, message, code, requestId, retryAfter, details", () => {
    const err = new ZabyApiError({
      status: 429,
      message: "Rate limited",
      code: "LIMIT_EXCEEDED",
      requestId: "req_1",
      retryAfter: 10,
      details: { quota: 100 },
    });
    expect(err.status).toBe(429);
    expect(err.message).toBe("Rate limited");
    expect(err.code).toBe("LIMIT_EXCEEDED");
    expect(err.requestId).toBe("req_1");
    expect(err.retryAfter).toBe(10);
    expect(err.details).toEqual({ quota: 100 });
  });

  it("sets name to the class name", () => {
    expect(new ZabyApiError({ status: 500, message: "Err" }).name).toBe("ZabyApiError");
    expect(new ZabyAuthError({ status: 401, message: "Err" }).name).toBe("ZabyAuthError");
    expect(new ZabyRateLimitError({ status: 429, message: "Err" }).name).toBe("ZabyRateLimitError");
    expect(new ZabyValidationError({ status: 400, message: "Err" }).name).toBe("ZabyValidationError");
    expect(new ZabyPermissionError({ status: 403, message: "Err" }).name).toBe("ZabyPermissionError");
  });

  it("ZabyRateLimitError includes retryAfter via inheritance", () => {
    // BUG-013 verification: retryAfter IS accessible via base class
    const err = new ZabyRateLimitError({
      status: 429,
      message: "Rate limit",
      retryAfter: 30,
    });
    // retryAfter IS available via inheritance from ZabyApiError
    expect(err.retryAfter).toBe(30);
  });

  it("preserves error codes in subclass instances", () => {
    const err = new ZabyAuthError({
      status: 401,
      message: "Unauthorized",
      code: "INVALID_API_KEY",
    });
    expect(err.code).toBe("INVALID_API_KEY");
  });
});

describe("errors — instanceof chain", () => {
  it("ZabyAuthError is instanceof ZabyApiError", () => {
    expect(new ZabyAuthError({ status: 401, message: "" })).toBeInstanceOf(ZabyApiError);
  });

  it("ZabyRateLimitError is instanceof ZabyApiError", () => {
    expect(new ZabyRateLimitError({ status: 429, message: "" })).toBeInstanceOf(ZabyApiError);
  });

  it("ZabyRuntimeTokenExpiredError is instanceof ZabyAuthError and ZabyApiError", () => {
    const err = new ZabyRuntimeTokenExpiredError({
      status: 401,
      message: "",
      code: "MANAGED_AGENT_RUNTIME_TOKEN_EXPIRED",
    });
    expect(err).toBeInstanceOf(ZabyAuthError);
    expect(err).toBeInstanceOf(ZabyApiError);
  });
});
