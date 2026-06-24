import { describe, it, expect } from "vitest";
import { parseSseResponse } from "../src/sse";

describe("SSE streaming stress test (BUG-002)", () => {
  it("yields events incrementally as stream chunks arrive", async () => {
    const encoder = new TextEncoder();
    const stream = new ReadableStream({
      start(controller) {
        for (let i = 0; i < 200; i++) {
          controller.enqueue(encoder.encode(`data: {"chunk": ${i}}\n\n`));
        }
        controller.close();
      },
    });

    const events: any[] = [];
    for await (const event of parseSseResponse({ bodyStream: stream })) {
      events.push(event);
    }
    expect(events).toHaveLength(200);
    expect(events[0].data).toEqual({ chunk: 0 });
    expect(events[199].data).toEqual({ chunk: 199 });
  });

  it("yields nothing for null bodyStream", async () => {
    const events: any[] = [];
    for await (const e of parseSseResponse({ bodyStream: null })) {
      events.push(e);
    }
    expect(events).toHaveLength(0);
  });

  it("yields nothing for missing bodyStream", async () => {
    const events: any[] = [];
    for await (const e of parseSseResponse({})) {
      events.push(e);
    }
    expect(events).toHaveLength(0);
  });

  it("uses body string directly when provided", async () => {
    const events: any[] = [];
    for await (const e of parseSseResponse({
      body: 'data: {"x":1}\n\n',
    })) {
      events.push(e);
    }
    expect(events).toHaveLength(1);
    expect(events[0].data).toEqual({ x: 1 });
  });

  it("handles large payload without crashing", async () => {
    const encoder = new TextEncoder();
    const largePayload = "x".repeat(100_000);
    const stream = new ReadableStream({
      start(controller) {
        controller.enqueue(encoder.encode(`data: ${largePayload}\n\n`));
        controller.close();
      },
    });

    const events: any[] = [];
    for await (const event of parseSseResponse({ bodyStream: stream })) {
      events.push(event);
    }
    expect(events).toHaveLength(1);
    expect(events[0].data).toBe(largePayload);
  });
});
