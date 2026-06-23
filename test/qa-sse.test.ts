import { describe, expect, it } from "vitest";
import { parseSseResponse } from "../src/sse";

describe("SSE parser — parseSseResponse", () => {
  async function collectEvents(body: string): Promise<any[]> {
    const gen = parseSseResponse({
      body: body,
      bodyStream: undefined,
    } as any);
    const events: any[] = [];
    for await (const event of gen) {
      events.push(event);
    }
    return events;
  }

  it("parses a single SSE event", async () => {
    const events = await collectEvents('data: {"hello":"world"}\n\n');
    expect(events).toHaveLength(1);
    expect(events[0].data).toEqual({ hello: "world" });
  });

  it("parses multiple SSE events", async () => {
    const events = await collectEvents(
      'data: {"a":1}\n\ndata: {"b":2}\n\n'
    );
    expect(events).toHaveLength(2);
    expect(events[0].data).toEqual({ a: 1 });
    expect(events[1].data).toEqual({ b: 2 });
  });

  it("parses event with id, event type, and data", async () => {
    const events = await collectEvents(
      'id: 42\nevent: UPDATE\ndata: {"x":1}\n\n'
    );
    expect(events[0].id).toBe("42");
    expect(events[0].event).toBe("UPDATE");
    expect(events[0].data).toEqual({ x: 1 });
  });

  it("BUG-006 fixed: parseData returns empty string for blank data per SSE spec", async () => {
    const events = await collectEvents("data:\n\n");
    expect(events).toHaveLength(1);
    expect(events[0].data).toBe("");
  });

  it("handles data: with just newline", async () => {
    const events = await collectEvents("data:\n\n");
    expect(events).toHaveLength(1);
  });

  it("handles missing data field — event emitted with empty string data", async () => {
    const events = await collectEvents("event: ping\n\n");
    expect(events).toHaveLength(1);
    expect(events[0].event).toBe("ping");
    expect(events[0].data).toBe("");
  });

  it("handles multi-line data (raw string when JSON parse fails)", async () => {
    const events = await collectEvents(
      'data: {"type":"text","delta":"Hel\ndata: lo"}\n\n'
    );
    expect(events).toHaveLength(1);
    // Multi-line data joined with \n produces malformed JSON
    // So the parser returns raw string
    expect(typeof events[0].data).toBe("string");
  });

  it("handles comment lines (starting with :)", async () => {
    const events = await collectEvents(
      ': comment\n: another comment\ndata: {"ok":true}\n\n'
    );
    expect(events).toHaveLength(1);
    expect(events[0].data).toEqual({ ok: true });
  });

  it("handles empty input", async () => {
    const events = await collectEvents("");
    expect(events).toHaveLength(0);
  });

  it("handles CRLF line endings", async () => {
    const events = await collectEvents(
      'id: 1\r\nevent: MSG\r\ndata: {"x":1}\r\n\r\n'
    );
    expect(events).toHaveLength(1);
    expect(events[0].id).toBe("1");
    expect(events[0].event).toBe("MSG");
    expect(events[0].data).toEqual({ x: 1 });
  });

  it("handles field with colon in value", async () => {
    const events = await collectEvents(
      'data: {"url":"http://example.com"}\n\n'
    );
    expect(events).toHaveLength(1);
    expect(events[0].data).toEqual({ url: "http://example.com" });
  });

  it("BUG: field without colon — value set to empty string but event field not populated", async () => {
    const events = await collectEvents(
      'event\ndata: {"ok":true}\n\n'
    );
    expect(events).toHaveLength(1);
    // 'event' without colon = field name "event", value ""
    // Bug: event.event is undefined instead of "" (falsy value skipped)
    expect(events[0].event).toBeUndefined();
    expect(events[0].data).toEqual({ ok: true });
  });

  it("BUG-002: string body is not streamed (partial content still parsed)", async () => {
    // String body without trailing \n\n is still parsed as one event
    const partial = 'data: {"partial":true}';
    const gen = parseSseResponse({
      body: partial,
      bodyStream: undefined,
    } as any);
    const events: any[] = [];
    for await (const event of gen) {
      events.push(event);
    }
    expect(events).toHaveLength(1);
  });

  it("skips unknown fields", async () => {
    const events = await collectEvents(
      'random: garbage\ndata: {"ok":true}\n\n'
    );
    expect(events).toHaveLength(1);
    expect(events[0].data).toEqual({ ok: true });
  });
});
