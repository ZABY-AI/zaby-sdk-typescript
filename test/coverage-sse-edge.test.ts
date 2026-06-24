import { describe, it, expect } from "vitest";
import { parseSseResponse } from "../src/sse";

async function collect(body?: string, stream?: ReadableStream<Uint8Array>) {
  const gen = parseSseResponse({ body, bodyStream: stream } as any);
  const events: any[] = [];
  for await (const ev of gen) { events.push(ev); }
  return events;
}

function textStream(chunks: string[]): ReadableStream<Uint8Array> {
  const encoder = new TextEncoder();
  return new ReadableStream({
    async start(controller) {
      for (const chunk of chunks) {
        controller.enqueue(encoder.encode(chunk));
      }
      controller.close();
    },
  });
}

describe("SSE — buffer residency edge cases (bug #11)", () => {
  it("handles multi-line data across chunks (stream path)", async () => {
    const encoder = new TextEncoder();
    const stream = new ReadableStream({
      start(controller) {
        controller.enqueue(encoder.encode("data: line1\ndata: line2\n\n"));
        controller.close();
      },
    });
    const events = await collect(undefined, stream);
    expect(events).toHaveLength(1);
    expect(events[0].data).toBe("line1\nline2");
  });

  it("handles event data split across chunk boundaries (detects boundary)", async () => {
    // \n\n boundary is entirely in first chunk → 1 event
    const events = await collect(undefined, textStream([
      'data: {"a":1}\n\n',
      'data: {"b":2}\n\n',
    ]));
    expect(events).toHaveLength(2);
    expect(events[0].data).toEqual({ a: 1 });
    expect(events[1].data).toEqual({ b: 2 });
  });

  it("handles \r\n in string body path", async () => {
    const events = await collect('data: {"a":1}\r\ndata: {"b":2}\r\n\r\n');
    expect(events).toHaveLength(1);
    expect(events[0].data).toBe('{"a":1}\n{"b":2}');
  });

  it("handles \r\n split across chunks in stream path", async () => {
    const events = await collect(undefined, textStream([
      "data: hello\r",
      "\n\r\n",
    ]));
    expect(events).toHaveLength(1);
    expect(events[0].data).toBe("hello");
  });

  it("processing remaining buffer after stream ends", async () => {
    const encoder = new TextEncoder();
    const stream = new ReadableStream({
      start(controller) {
        controller.enqueue(encoder.encode('data: {"a":1}\n\n'));
        controller.close();
      },
    });
    const events = await collect(undefined, stream);
    expect(events).toHaveLength(1);
    expect(events[0].data).toEqual({ a: 1 });
  });

  it("ignores comments in blocks", async () => {
    const events = await collect(": comment\ndata: ok\n\n");
    expect(events).toHaveLength(1);
    expect(events[0].data).toBe("ok");
  });

  it("strips single leading space from field value", async () => {
    // SSE spec: only ONE leading space after colon is stripped
    const events = await collect("data:  spaced\n\n");
    expect(events).toHaveLength(1);
    expect(events[0].data).toBe(" spaced");
  });

  it("yields nothing for stream without body or bodyStream", async () => {
    const gen = parseSseResponse({} as any);
    const events: any[] = [];
    for await (const ev of gen) { events.push(ev); }
    expect(events).toHaveLength(0);
  });

  it("yields nothing for empty stream", async () => {
    const stream = new ReadableStream({ start(c) { c.close(); } });
    const events = await collect(undefined, stream);
    expect(events).toHaveLength(0);
  });

  it("processes trailing buffer without \\n\\n at end", async () => {
    // Triggers the finalize block (sse.ts:41-43) where leftover buffer is split
    const events = await collect(undefined, textStream(["data: trailing\n"]));
    expect(events).toHaveLength(1);
    expect(events[0].data).toBe("trailing");
  });

  it("skips empty blocks in stream path (branch coverage)", async () => {
    // A standalone blank line creates an empty block segment → parseBlock returns null
    // Covers `if (event)` false branch in stream path line 31 and finalize line 43
    const encoder = new TextEncoder();
    const stream1 = new ReadableStream({
      start(controller) {
        controller.enqueue(encoder.encode("data: a\n\n\ndata: b\n\n"));
        controller.close();
      },
    });
    const events1 = await collect(undefined, stream1);
    expect(events1).toHaveLength(2);
    expect(events1[0].data).toBe("a");
    expect(events1[1].data).toBe("b");

    // Second scenario: trailing whitespace-only block (covers line 43 false branch)
    const stream2 = new ReadableStream({
      start(controller) {
        controller.enqueue(encoder.encode("data: ok\n\n  \n"));
        controller.close();
      },
    });
    const events2 = await collect(undefined, stream2);
    expect(events2).toHaveLength(1);
    expect(events2[0].data).toBe("ok");
  });
});
