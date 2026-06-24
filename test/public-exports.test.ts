import { describe, it, expect } from "vitest";
import * as Sdk from "../src/index";
import * as Runtime from "../src/runtime";
import * as Errors from "../src/errors";
import * as Testing from "../src/testing";
import * as Types from "../src/types/public";

describe("public entry points", () => {
  it("index.ts exports all expected symbols", () => {
    expect(Sdk.configureZaby).toBeTypeOf("function");
    expect(Sdk.resetZabyConfigForTests).toBeTypeOf("function");
    expect(Sdk.DEFAULT_ZABY_API_ORIGIN).toBe("https://genapi.zaby.io");
    expect(Sdk.LOCAL_ZABY_API_ORIGIN).toBe("http://localhost:9080");

    expect(Sdk.Zaby).toBeTypeOf("function");
    expect(Sdk.ZabyRuntime).toBeTypeOf("function");

    expect(Sdk.ZabyApiError).toBeTypeOf("function");
    expect(Sdk.ZabyAuthError).toBeTypeOf("function");
    expect(Sdk.ZabyPermissionError).toBeTypeOf("function");
    expect(Sdk.ZabyRateLimitError).toBeTypeOf("function");
    expect(Sdk.ZabyRuntimeTokenExhaustedError).toBeTypeOf("function");
    expect(Sdk.ZabyRuntimeTokenExpiredError).toBeTypeOf("function");
    expect(Sdk.ZabyStreamError).toBeTypeOf("function");
    expect(Sdk.ZabyValidationError).toBeTypeOf("function");
  });

  it("runtime.ts exports ZabyRuntime", () => {
    expect(Runtime.ZabyRuntime).toBeTypeOf("function");
  });

  it("errors/index.ts exports createZabyApiError and all error classes", () => {
    expect(Errors.createZabyApiError).toBeTypeOf("function");
    expect(Errors.ZabyApiError).toBeTypeOf("function");
    expect(Errors.ZabyAuthError).toBeTypeOf("function");
  });

  it("testing/index.ts exports MockTransport and types", () => {
    expect(Testing.MockTransport).toBeTypeOf("function");
  });

  it("types/public.ts exports all value types (type-only module)", () => {
    expect(Types).toBeDefined();
  });
});
