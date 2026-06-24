import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { HttpTransport, ZabyCoreClient } from "../src/transport";
import { MockTransport } from "../src/testing";
import { resolveZabyConfig, resetZabyConfigForTests } from "../src/config";

function mockTransport(responses: Array<{ method: string; path: string; status?: number; json?: unknown }>) {
  return new MockTransport(responses);
}

beforeEach(() => {
  resetZabyConfigForTests();
});

afterEach(() => {
  vi.restoreAllMocks();
});

function createCore(transport: MockTransport) {
  const config = resolveZabyConfig({ fetch: globalThis.fetch });
  return new ZabyCoreClient(config, async () => ({ authorization: "Bearer test" }), transport);
}

describe("HttpTransport stream timeout wrapper", () => {
  it("wraps bodyStream when stream=true", async () => {
    const encoder = new TextEncoder();
    const sourceStream = new ReadableStream({
      start(controller) {
        controller.enqueue(encoder.encode(JSON.stringify({ ok: true })));
        controller.close();
      },
    });
    const mockFetch = vi.fn().mockResolvedValue({
      status: 200,
      headers: new Headers({ "content-type": "application/json" }),
      body: sourceStream,
      text: () => Promise.resolve(JSON.stringify({ ok: true })),
    });
    const config = resolveZabyConfig({ fetch: mockFetch as any });
    const transport = new HttpTransport(config);
    const result = await transport.send({ method: "GET", url: "http://test/stream", path: "/stream", headers: {}, stream: true });
    expect(result.bodyStream).toBeDefined();
    const reader = result.bodyStream!.getReader();
    const { value } = await reader.read();
    expect(JSON.parse(new TextDecoder().decode(value!))).toEqual({ ok: true });
    reader.releaseLock();
  });

  it("passes body as text when stream=false", async () => {
    const mockFetch = vi.fn().mockResolvedValue({
      status: 200,
      headers: new Headers({ "content-type": "application/json" }),
      body: null,
      text: () => Promise.resolve(JSON.stringify({ hello: "world" })),
    });
    const config = resolveZabyConfig({ fetch: mockFetch as any });
    const transport = new HttpTransport(config);
    const result = await transport.send({ method: "GET", url: "http://test/foo", path: "/foo", headers: {} });
    expect(result.json).toEqual({ hello: "world" });
  });
});

describe("captureStreamErrorBody coverage", () => {
  it("reads stream body on error for stream requests", async () => {
    const encoder = new TextEncoder();
    const sourceStream = new ReadableStream({
      start(controller) {
        controller.enqueue(encoder.encode(JSON.stringify({ message: "fail", code: "ERROR" })));
        controller.close();
      },
    });
    const mockFetch = vi.fn().mockResolvedValue({
      status: 400,
      headers: new Headers({ "content-type": "application/json" }),
      body: sourceStream,
      text: () => Promise.resolve(JSON.stringify({ message: "fail", code: "ERROR" })),
    });
    const config = resolveZabyConfig({ fetch: mockFetch as any });
    const transport = new HttpTransport(config);
    const core = new ZabyCoreClient(config, async () => ({ authorization: "Bearer test" }), transport);
    try {
      await core.raw("GET", "/error", { stream: true });
      expect.unreachable("should have thrown");
    } catch (e: any) {
      expect(e.status).toBe(400);
      expect(e.code).toBe("ERROR");
    }
  });
});

describe("sendWithRetry edge cases", () => {
  it("does NOT retry on status not in retryStatuses", async () => {
    let callCount = 0;
    const failTransport = {
      send: async () => {
        callCount++;
        return { status: 400, headers: {}, json: { message: "Bad Request" } };
      },
    };
    const config = resolveZabyConfig({
      fetch: globalThis.fetch,
      retries: { attempts: 2, retryMethods: ["GET"], retryStatuses: [500] },
    });
    const core = new ZabyCoreClient(config, async () => ({ authorization: "Bearer test" }), failTransport as any);
    await expect(core.raw("GET", "/test")).rejects.toThrow();
    expect(callCount).toBe(1);
  });

  it("does NOT retry on method not in retryMethods", async () => {
    let callCount = 0;
    const failTransport = {
      send: async () => {
        callCount++;
        return { status: 500, headers: {}, json: { message: "Fail" } };
      },
    };
    const config = resolveZabyConfig({
      fetch: globalThis.fetch,
      retries: { attempts: 2, retryMethods: ["GET"], retryStatuses: [500] },
    });
    const core = new ZabyCoreClient(config, async () => ({ authorization: "Bearer test" }), failTransport as any);
    await expect(core.raw("POST", "/test")).rejects.toThrow();
    expect(callCount).toBe(1);
  });

  it("retries up to attempts times", async () => {
    let callCount = 0;
    const failTransport = {
      send: async () => {
        callCount++;
        return { status: 500, headers: {}, json: { message: "Fail" } };
      },
    };
    const config = resolveZabyConfig({
      fetch: globalThis.fetch,
      retries: { attempts: 3, retryMethods: ["GET"], retryStatuses: [500], backoffMs: () => 1 },
    });
    const core = new ZabyCoreClient(config, async () => ({ authorization: "Bearer test" }), failTransport as any);
    await expect(core.raw("GET", "/test")).rejects.toThrow();
    expect(callCount).toBe(4);
  });
});

describe("parseJsonBody edge cases", () => {
  it("returns undefined for empty body", async () => {
    const mockFetch = vi.fn().mockResolvedValue({
      status: 200,
      headers: new Headers({ "content-type": "application/json" }),
      body: null,
      text: () => Promise.resolve(""),
    });
    const config = resolveZabyConfig({ fetch: mockFetch as any });
    const transport = new HttpTransport(config);
    const result = await transport.send({ method: "GET", url: "http://test/empty", path: "/empty", headers: {} });
    expect(result.json).toBeUndefined();
  });

  it("logs warning and returns undefined for malformed JSON", async () => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
    const mockFetch = vi.fn().mockResolvedValue({
      status: 200,
      headers: new Headers({ "content-type": "application/json" }),
      body: null,
      text: () => Promise.resolve("{bad json}"),
    });
    const config = resolveZabyConfig({ fetch: mockFetch as any });
    const transport = new HttpTransport(config);
    const result = await transport.send({ method: "GET", url: "http://test/bad", path: "/bad", headers: {} });
    expect(result.json).toBeUndefined();
    expect(warn).toHaveBeenCalledOnce();
  });
});

describe("requestId and signal forwarding", () => {
  it("forwards requestId as x-request-id header", async () => {
    const tr = mockTransport([{ method: "GET", path: "/test", status: 200, json: {} }]);
    const core = createCore(tr);
    await core.request("GET", "/test", { requestId: "my-req-1" });
    expect(tr.requests[0].headers["x-request-id"]).toBe("my-req-1");
  });

  it("forwards signal to transport", async () => {
    const tr = mockTransport([{ method: "GET", path: "/test", status: 200, json: {} }]);
    const core = createCore(tr);
    const controller = new AbortController();
    await core.request("GET", "/test", { signal: controller.signal });
    expect(tr.requests[0].signal).toBe(controller.signal);
  });

  it("sets content-type when json body provided", async () => {
    const tr = mockTransport([{ method: "POST", path: "/test", status: 201, json: { id: "1" } }]);
    const core = createCore(tr);
    await core.request("POST", "/test", { json: { name: "test" } });
    expect(tr.requests[0].headers["content-type"]).toBe("application/json");
  });

  it("sets user-agent when configured", async () => {
    const config = resolveZabyConfig({ fetch: globalThis.fetch, userAgent: "my-app/1.0" });
    const tr = new MockTransport([{ method: "GET", path: "/test", status: 200, json: {} }]);
    const core = new ZabyCoreClient(config, async () => ({ authorization: "Bearer test" }), tr);
    await core.request("GET", "/test");
    expect(tr.requests[0].headers["user-agent"]).toBe("my-app/1.0");
  });
});

describe("HttpTransport user-provided signal", () => {
  it("uses user signal when provided (no internal timeout)", async () => {
    const controller = new AbortController();
    const mockFetch = vi.fn().mockResolvedValue({
      status: 200, headers: new Headers(), body: null,
      text: () => Promise.resolve("{}"),
    });
    const config = resolveZabyConfig({ fetch: mockFetch as any });
    const transport = new HttpTransport(config);
    await transport.send({ method: "GET", url: "http://test/sig", path: "/sig", headers: {}, signal: controller.signal });
    expect(mockFetch).toHaveBeenCalledOnce();
  });
});

describe("error response includes headers", () => {
  it("includes requestId from response headers in error", async () => {
    const mockFetch = vi.fn().mockResolvedValue({
      status: 500,
      headers: new Headers({ "x-request-id": "req_123", "content-type": "application/json" }),
      body: null,
      text: () => Promise.resolve(JSON.stringify({ message: "Server Error" })),
    });
    const config = resolveZabyConfig({ fetch: mockFetch as any });
    const transport = new HttpTransport(config);
    const core = new ZabyCoreClient(config, async () => ({ authorization: "Bearer test" }), transport);
    try {
      await core.raw("GET", "/error");
      expect.unreachable();
    } catch (e: any) {
      expect(e.requestId).toBe("req_123");
    }
  });

  it("parseRetryAfter handles retry-after header", async () => {
    const mockFetch = vi.fn().mockResolvedValue({
      status: 429,
      headers: new Headers({ "retry-after": "5", "content-type": "application/json" }),
      body: null,
      text: () => Promise.resolve(JSON.stringify({ message: "Rate limited" })),
    });
    const config = resolveZabyConfig({ fetch: mockFetch as any });
    const transport = new HttpTransport(config);
    const core = new ZabyCoreClient(config, async () => ({ authorization: "Bearer test" }), transport);
    try {
      await core.raw("GET", "/rate");
      expect.unreachable();
    } catch (e: any) {
      expect(e.retryAfter).toBe(5);
    }
  });

  it("handle 422 as validation error", async () => {
    const mockFetch = vi.fn().mockResolvedValue({
      status: 422, headers: new Headers({ "content-type": "application/json" }),
      body: null, text: () => Promise.resolve(JSON.stringify({ message: "Unprocessable" })),
    });
    const config = resolveZabyConfig({ fetch: mockFetch as any });
    const transport = new HttpTransport(config);
    const core = new ZabyCoreClient(config, async () => ({ authorization: "Bearer test" }), transport);
    try {
      await core.raw("GET", "/unprocessable");
      expect.unreachable();
    } catch (e: any) {
      expect(e.name).toBe("ZabyValidationError");
    }
  });
});

describe("withReadTimeout edge coverage", () => {
  it("triggers timeout on slow stream (line 197)", async () => {
    const hangingStream = new ReadableStream({ start() { /* never enqueue or close */ } });
    const mockFetch = vi.fn().mockResolvedValue({
      status: 200, headers: new Headers({ "content-type": "application/json" }),
      body: hangingStream, text: () => Promise.resolve("{}"),
    });
    const config = resolveZabyConfig({ fetch: mockFetch as any, timeoutMs: 5 });
    const transport = new HttpTransport(config);
    const core = new ZabyCoreClient(config, async () => ({ authorization: "Bearer test" }), transport);
    const result = await core.raw("GET", "/stream", { stream: true });
    const reader = result.bodyStream!.getReader();
    await expect(reader.read()).rejects.toThrow("timed out");
    reader.releaseLock();
  });

  it("cancel handler on wrapper stream (lines 212-214)", async () => {
    const encoder = new TextEncoder();
    const src = new ReadableStream({
      start(c) { c.enqueue(encoder.encode("hello")); c.close(); },
    });
    const mockFetch = vi.fn().mockResolvedValue({
      status: 200, headers: new Headers(), body: src, text: () => Promise.resolve("{}"),
    });
    const config = resolveZabyConfig({ fetch: mockFetch as any, timeoutMs: 5000 });
    const transport = new HttpTransport(config);
    const core = new ZabyCoreClient(config, async () => ({ authorization: "Bearer test" }), transport);
    const result = await core.raw("GET", "/stream", { stream: true });
    const reader = result.bodyStream!.getReader();
    await reader.cancel();
    reader.releaseLock();
  });

  it("catch block when underlying stream errors (lines 208-210)", async () => {
    const erroredStream = new ReadableStream({
      start(c) { c.error(new Error("source error")); },
    });
    const mockFetch = vi.fn().mockResolvedValue({
      status: 200, headers: new Headers(), body: erroredStream, text: () => Promise.resolve("{}"),
    });
    const config = resolveZabyConfig({ fetch: mockFetch as any, timeoutMs: 5000 });
    const transport = new HttpTransport(config);
    const core = new ZabyCoreClient(config, async () => ({ authorization: "Bearer test" }), transport);
    const result = await core.raw("GET", "/stream", { stream: true });
    const reader = result.bodyStream!.getReader();
    await expect(reader.read()).rejects.toThrow("source error");
    reader.releaseLock();
  });

  it("pre-aborted signal check in withReadTimeout (lines 193-194)", async () => {
    const ac = new AbortController();
    ac.abort();
    const src = new ReadableStream({
      start(c) { c.enqueue(new TextEncoder().encode("x")); c.close(); },
    });
    const mockFetch = vi.fn().mockResolvedValue({
      status: 200, headers: new Headers(), body: src, text: () => Promise.resolve("{}"),
    });
    const config = resolveZabyConfig({ fetch: mockFetch as any });
    const transport = new HttpTransport(config);
    const core = new ZabyCoreClient(config, async () => ({ authorization: "Bearer test" }), transport);
    const result = await core.raw("GET", "/stream", { stream: true, signal: ac.signal });
    const reader = result.bodyStream!.getReader();
    await expect(reader.read()).rejects.toThrow("aborted");
    reader.releaseLock();
  });
});

describe("captureStreamErrorBody catch path", () => {
  it("handles failing body stream read on error response (line 237)", async () => {
    const badStream = new ReadableStream({
      start(c) { c.error(new Error("read failed")); },
    });
    const mockFetch = vi.fn().mockResolvedValue({
      status: 400, headers: new Headers({ "content-type": "application/json" }),
      body: badStream, text: () => Promise.resolve("{}"),
    });
    const config = resolveZabyConfig({ fetch: mockFetch as any });
    const transport = new HttpTransport(config);
    const core = new ZabyCoreClient(config, async () => ({ authorization: "Bearer test" }), transport);
    try {
      await core.raw("GET", "/error", { stream: true });
      expect.unreachable();
    } catch (e: any) {
      expect(e.status).toBe(400);
    }
  });
});
