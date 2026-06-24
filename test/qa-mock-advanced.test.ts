import { describe, it, expect } from "vitest";
import { MockTransport } from "../src/testing";
import type { MockResponse } from "../src/testing";

describe("MockTransport advanced scenarios (BUG-005, BUG-NEW-001)", () => {
  it("BUG-005 fixed: cursor advances only after successful match", async () => {
    const responses: MockResponse[] = [
      { method: "GET", path: "/items", status: 200, json: { items: ["first"] } },
      { method: "GET", path: "/items", status: 200, json: { items: ["second"] } },
      { method: "GET", path: "/items", status: 200, json: { items: ["third"] } },
    ];
    const transport = new MockTransport(responses);

    // First call: returns first response
    const r1 = await transport.send({ method: "GET", path: "/items", headers: {} });
    expect(r1.json).toEqual({ items: ["first"] });

    // Second call: returns second response (cursor already advanced past first)
    const r2 = await transport.send({ method: "GET", path: "/items", headers: {} });
    expect(r2.json).toEqual({ items: ["second"] });

    // Third call: returns third response (cursor continues advancing)
    const r3 = await transport.send({ method: "GET", path: "/items", headers: {} });
    expect(r3.json).toEqual({ items: ["third"] });
  });

  it("BUG-NEW-001 fixed: query params no longer break path matching", async () => {
    const responses: MockResponse[] = [
      { method: "GET", path: "/items", status: 200, json: { items: [] } },
    ];
    const transport = new MockTransport(responses);

    const result = await transport.send({ method: "GET", path: "/items?limit=10", headers: {} });
    expect(result.json).toEqual({ items: [] });
    expect(result.status).toBe(200);
  });

  it("exhausts all responses then throws", async () => {
    const responses: MockResponse[] = [
      { method: "GET", path: "/a", status: 200, json: { step: 1 } },
      { method: "GET", path: "/b", status: 200, json: { step: 2 } },
    ];
    const transport = new MockTransport(responses);

    const r1 = await transport.send({ method: "GET", path: "/a", headers: {} });
    expect(r1.json).toEqual({ step: 1 });

    const r2 = await transport.send({ method: "GET", path: "/b", headers: {} });
    expect(r2.json).toEqual({ step: 2 });

    // Exhausted — throws error
    await expect(
      transport.send({ method: "GET", path: "/c", headers: {} }),
    ).rejects.toThrow("No mock response configured");
  });

  it("preserves request history order", async () => {
    const responses: MockResponse[] = [
      { method: "GET", path: "/first", status: 200 },
      { method: "GET", path: "/second", status: 200 },
      { method: "GET", path: "/third", status: 200 },
    ];
    const transport = new MockTransport(responses);

    await transport.send({ method: "GET", path: "/first", headers: {} });
    await transport.send({ method: "GET", path: "/second", headers: {} });
    await transport.send({ method: "GET", path: "/third", headers: {} });

    expect(transport.requests).toHaveLength(3);
    expect(transport.requests[0].path).toBe("/first");
    expect(transport.requests[1].path).toBe("/second");
    expect(transport.requests[2].path).toBe("/third");
  });

  it("supports custom response headers", async () => {
    const responses: MockResponse[] = [
      { method: "GET", path: "/headers", status: 200, json: "ok", headers: { "x-custom": "value123" } },
    ];
    const transport = new MockTransport(responses);

    const r = await transport.send({ method: "GET", path: "/headers", headers: {} });
    expect(r.headers["x-custom"]).toBe("value123");
  });
});
