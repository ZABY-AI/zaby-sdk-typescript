import { afterEach, describe, expect, it } from "vitest";
import { MockTransport } from "../src/testing";

describe("MockTransport — basic functionality", () => {
  it("returns configured response for matching request", async () => {
    const transport = new MockTransport([
      { method: "GET", path: "/health", json: { status: "ok" } },
    ]);
    const result = await transport.send({
      method: "GET",
      url: "https://example.com/health",
      path: "/health",
      headers: {},
    });
    expect(result.json).toEqual({ status: "ok" });
    expect(result.status).toBe(200);
  });

  it("throws on no mock responses left", async () => {
    const transport = new MockTransport([
      { method: "GET", path: "/health", json: { status: "ok" } },
    ]);
    await transport.send({
      method: "GET",
      url: "https://example.com/health",
      path: "/health",
      headers: {},
    });
    await expect(
      transport.send({
        method: "GET",
        url: "https://example.com/health",
        path: "/health",
        headers: {},
      })
    ).rejects.toThrow("No mock response");
  });

  it("throws on method mismatch", async () => {
    const transport = new MockTransport([
      { method: "POST", path: "/health", json: { status: "ok" } },
    ]);
    await expect(
      transport.send({
        method: "GET",
        url: "https://example.com/health",
        path: "/health",
        headers: {},
      })
    ).rejects.toThrow("Expected POST /health");
  });

  it("records request history", async () => {
    const transport = new MockTransport([
      { method: "GET", path: "/a", json: {} },
      { method: "POST", path: "/b", json: {} },
    ]);
    await transport.send({
      method: "GET",
      url: "https://example.com/a",
      path: "/a",
      headers: {},
    });
    await transport.send({
      method: "POST",
      url: "https://example.com/b",
      path: "/b",
      headers: { "content-type": "application/json" },
      json: { data: 1 },
    });
    expect(transport.requests).toHaveLength(2);
    expect(transport.requests[0].method).toBe("GET");
    expect(transport.requests[0].path).toBe("/a");
    expect(transport.requests[1].method).toBe("POST");
    expect(transport.requests[1].json).toEqual({ data: 1 });
  });

  it("returns configured status code", async () => {
    const transport = new MockTransport([
      { method: "POST", path: "/create", json: { id: "1" }, status: 201 },
    ]);
    const result = await transport.send({
      method: "POST",
      url: "https://example.com/create",
      path: "/create",
      headers: {},
      json: { name: "test" },
    });
    expect(result.status).toBe(201);
  });

  it("returns configured headers", async () => {
    const transport = new MockTransport([
      {
        method: "GET",
        path: "/test",
        json: {},
        headers: { "x-custom": "val", "x-request-id": "abc" },
      },
    ]);
    const result = await transport.send({
      method: "GET",
      url: "https://example.com/test",
      path: "/test",
      headers: {},
    });
    expect(result.headers["x-custom"]).toBe("val");
    expect(result.headers["x-request-id"]).toBe("abc");
  });

  it("returns body string when configured", async () => {
    const transport = new MockTransport([
      { method: "GET", path: "/text", body: "hello world" },
    ]);
    const result = await transport.send({
      method: "GET",
      url: "https://example.com/text",
      path: "/text",
      headers: {},
    });
    expect(result.body).toBe("hello world");
  });
});

describe("MockTransport — cursor behavior (BUG-005)", () => {
  it("BUG-005 fixed: cursor does NOT advance when validation fails", async () => {
    const transport = new MockTransport([
      { method: "GET", path: "/first", json: { data: 1 } },
      { method: "GET", path: "/second", json: { data: 2 } },
    ]);
    // First call: mismatched method, should throw (cursor stays at 0)
    await expect(
      transport.send({
        method: "POST",
        url: "https://example.com/first",
        path: "/first",
        headers: {},
      })
    ).rejects.toThrow();

    // Second call: cursor hasn't advanced, so it still matches against /first
    const result = await transport.send({
      method: "GET",
      url: "https://example.com/first",
      path: "/first",
      headers: {},
    });
    expect(result.json).toEqual({ data: 1 });
  });
});

describe("MockTransport — path matching with query parameters (BUG-NEW-001)", () => {
  it("BUG-NEW-001 fixed: query params stripped before path matching", async () => {
    const transport = new MockTransport([
      { method: "GET", path: "/items", json: { items: [] } },
    ]);

    const result = await transport.send({
      method: "GET",
      url: "https://example.com/items?limit=10",
      path: "/items?limit=10",
      headers: {},
    });
    expect(result.json).toEqual({ items: [] });
  });
});

describe("MockTransport — Edge cases", () => {
  it("handles empty headers", async () => {
    const transport = new MockTransport([
      { method: "GET", path: "/test", json: {} },
    ]);
    const result = await transport.send({
      method: "GET",
      url: "https://example.com/test",
      path: "/test",
      headers: {},
    });
    expect(result.headers).toBeDefined();
  });

  it("handles null JSON in request", async () => {
    const transport = new MockTransport([
      { method: "POST", path: "/test", json: { received: true } },
    ]);
    const result = await transport.send({
      method: "POST",
      url: "https://example.com/test",
      path: "/test",
      headers: {},
      json: null,
    });
    expect(result.json).toEqual({ received: true });
  });
});
