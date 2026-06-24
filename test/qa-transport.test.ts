import { afterEach, describe, expect, it, vi } from "vitest";
import { MockTransport } from "../src/testing";
import { ZabyCoreClient } from "../src/transport";
import { resolveZabyConfig, resetZabyConfigForTests } from "../src/config";

afterEach(() => {
  resetZabyConfigForTests();
  vi.restoreAllMocks();
});

describe("transport — request method", () => {
  function createCore(mock: MockTransport) {
    const config = resolveZabyConfig({ fetch: globalThis.fetch });
    return new ZabyCoreClient(
      config,
      async () => ({ authorization: "Bearer test" }),
      mock
    );
  }

  it("sends GET request and returns parsed JSON", async () => {
    const transport = new MockTransport([
      { method: "GET", path: "/test", json: { ok: true } },
    ]);
    const core = createCore(transport);
    const result = await core.request("GET", "/test");
    expect(result).toEqual({ ok: true });
  });

  it("includes query parameters in the URL", async () => {
    const transport = new MockTransport([
      { method: "GET", path: "/test?foo=bar&num=42", json: { ok: true } },
    ]);
    const core = createCore(transport);
    await core.request("GET", "/test", { query: { foo: "bar", num: 42 } });
    expect(transport.requests[0].path).toContain("foo=bar");
    expect(transport.requests[0].path).toContain("num=42");
  });

  it("sends JSON body on POST", async () => {
    const transport = new MockTransport([
      { method: "POST", path: "/test", json: { id: "1" }, status: 201 },
    ]);
    const core = createCore(transport);
    await core.request("POST", "/test", { json: { name: "test" } });
    expect(transport.requests[0].json).toEqual({ name: "test" });
  });

  it("sets content-type header for JSON requests", async () => {
    const transport = new MockTransport([
      { method: "POST", path: "/test", json: {}, status: 201 },
    ]);
    const core = createCore(transport);
    await core.request("POST", "/test", { json: {} });
    expect(transport.requests[0].headers["content-type"]).toBe("application/json");
  });

  it("sets x-request-id header when provided", async () => {
    const transport = new MockTransport([
      { method: "GET", path: "/test", json: {} },
    ]);
    const core = createCore(transport);
    await core.request("GET", "/test", { requestId: "req_123" });
    expect(transport.requests[0].headers["x-request-id"]).toBe("req_123");
  });

  it("passes abort signal through", async () => {
    const transport = new MockTransport([
      { method: "GET", path: "/test", json: {} },
    ]);
    const core = createCore(transport);
    const controller = new AbortController();
    const signal = controller.signal;
    await core.request("GET", "/test", { signal });
    expect(transport.requests[0].signal).toBe(signal);
  });
});

describe("transport — error handling", () => {
  it("throws ZabyAuthError on 401", async () => {
    const transport = new MockTransport([
      { method: "GET", path: "/test", status: 401, json: { message: "Unauthorized" } },
    ]);
    const config = resolveZabyConfig({ fetch: globalThis.fetch });
    const core = new ZabyCoreClient(
      config,
      async () => ({ authorization: "Bearer bad" }),
      transport
    );
    await expect(core.request("GET", "/test")).rejects.toThrow("Unauthorized");
  });

  it("throws ZabyRateLimitError on 429 with retry-after", async () => {
    const transport = new MockTransport([
      {
        method: "GET", path: "/test", status: 429,
        headers: { "retry-after": "5", "x-request-id": "req_abc" },
        json: { message: "Rate limited", code: "TOO_MANY" },
      },
    ]);
    const config = resolveZabyConfig({ fetch: globalThis.fetch });
    const core = new ZabyCoreClient(
      config,
      async () => ({ authorization: "Bearer test" }),
      transport
    );
    try {
      await core.request("GET", "/test");
      expect.unreachable("should have thrown");
    } catch (e: any) {
      expect(e.status).toBe(429);
      expect(e.code).toBe("TOO_MANY");
      expect(e.requestId).toBe("req_abc");
      expect(e.retryAfter).toBe(5);
    }
  });

  it("throws ZabyValidationError on 400", async () => {
    const transport = new MockTransport([
      { method: "POST", path: "/test", status: 400, json: { message: "Bad request" } },
    ]);
    const config = resolveZabyConfig({ fetch: globalThis.fetch });
    const core = new ZabyCoreClient(
      config,
      async () => ({ authorization: "Bearer test" }),
      transport
    );
    await expect(core.request("POST", "/test", { json: {} })).rejects.toMatchObject({
      name: "ZabyValidationError",
      status: 400,
    });
  });

  it("throws ZabyPermissionError on 403", async () => {
    const transport = new MockTransport([
      { method: "GET", path: "/test", status: 403, json: { message: "Forbidden" } },
    ]);
    const config = resolveZabyConfig({ fetch: globalThis.fetch });
    const core = new ZabyCoreClient(
      config,
      async () => ({ authorization: "Bearer test" }),
      transport
    );
    await expect(core.request("GET", "/test")).rejects.toMatchObject({
      name: "ZabyPermissionError",
      status: 403,
    });
  });

  it("throws generic ZabyApiError on unknown status", async () => {
    const transport = new MockTransport([
      { method: "GET", path: "/test", status: 500, json: { message: "Server error" } },
    ]);
    const config = resolveZabyConfig({ fetch: globalThis.fetch });
    const core = new ZabyCoreClient(
      config,
      async () => ({ authorization: "Bearer test" }),
      transport
    );
    await expect(core.request("GET", "/test")).rejects.toMatchObject({
      name: "ZabyApiError",
      status: 500,
    });
  });

  it("handles non-JSON error responses gracefully", async () => {
    const transport = new MockTransport([
      { method: "GET", path: "/test", status: 500, body: "Internal Server Error" },
    ]);
    const config = resolveZabyConfig({ fetch: globalThis.fetch });
    const core = new ZabyCoreClient(
      config,
      async () => ({ authorization: "Bearer test" }),
      transport
    );
    await expect(core.request("GET", "/test")).rejects.toMatchObject({
      name: "ZabyApiError",
      status: 500,
    });
  });
});

describe("transport — streaming", () => {
  it("raw() with stream:true returns response with body data", async () => {
    const transport = new MockTransport([
      { method: "GET", path: "/stream", body: "event: test\ndata: {}\n\n" },
    ]);
    const config = resolveZabyConfig({ fetch: globalThis.fetch });
    const core = new ZabyCoreClient(
      config,
      async () => ({ authorization: "Bearer test" }),
      transport
    );
    const response = await core.raw("GET", "/stream", { stream: true });
    // MockTransport returns body string even for stream requests
    expect(response.status).toBe(200);
  });
});

describe("transport — retry behavior", () => {
  it("BUG-001: retries when configured as number shorthand", async () => {
    const config = resolveZabyConfig({
      fetch: globalThis.fetch,
      retries: 3,
    });
    let callCount = 0;
    const failTransport = {
      send: async () => {
        callCount++;
        return { status: 500, headers: {}, json: { message: "Fail" } };
      },
    };
    const core = new ZabyCoreClient(
      config as any,
      async () => ({ authorization: "Bearer test" }),
      failTransport as any
    );
    await expect(core.raw("GET", "/test")).rejects.toThrow();
    // retries: 3 with GET + 500 matches default retryMethods/retryStatuses
    expect(callCount).toBe(4); // 1 initial + 3 retries
  });

  it("retries when retry policy object matches method and status", async () => {
    const config = resolveZabyConfig({
      fetch: globalThis.fetch,
      retries: {
        attempts: 2,
        retryMethods: ["GET"],
        retryStatuses: [500],
        backoffMs: () => 1,
      },
    });
    let callCount = 0;
    const failOnceTransport = {
      send: async () => {
        callCount++;
        if (callCount === 1) {
          return { status: 500, headers: {}, json: { message: "Retry" } };
        }
        return { status: 200, headers: {}, json: { ok: true } };
      },
    };
    const core = new ZabyCoreClient(
      config as any,
      async () => ({ authorization: "Bearer test" }),
      failOnceTransport as any
    );
    const result = await core.raw("GET", "/test");
    expect(callCount).toBe(2);
    expect(result.json).toEqual({ ok: true });
  });
});
