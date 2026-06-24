import type { SseEvent } from "./types/public";

export async function* parseSseResponse(response: {
  body?: string;
  bodyStream?: ReadableStream<Uint8Array> | null;
}): AsyncIterable<SseEvent> {
  if (response.body != null) {
    for (const block of response.body.split(/(?:\r?\n){2,}/u)) {
      const event = parseBlock(block);
      if (event) yield event;
    }
    return;
  }

  const stream = response.bodyStream;
  if (!stream) return;

  const reader = stream.getReader();
  const decoder = new TextDecoder();
  let buffer = "";

  try {
    while (true) {
      const { value, done } = await reader.read();
      if (done) break;
      buffer += decoder.decode(value, { stream: true });
      const parts = buffer.split(/(?:\r?\n){2,}/u);
      if (parts.length > 1) {
        for (let i = 0; i < parts.length - 1; i++) {
          const event = parseBlock(parts[i]!);
          if (event) yield event;
        }
        buffer = parts[parts.length - 1]!;
      } else {
        buffer = parts[0]!;
      }
    }

    buffer += decoder.decode();
    if (buffer) {
      for (const block of buffer.split(/(?:\r?\n){2,}/u)) {
        const event = parseBlock(block);
        if (event) yield event;
      }
    }
  } finally {
    reader.releaseLock();
  }
}

function parseBlock(block: string): SseEvent | null {
  if (!block.trim()) return null;
  let id: string | undefined;
  let event: string | undefined;
  const data: string[] = [];
  for (const rawLine of block.split("\n")) {
    const line = rawLine.endsWith("\r") ? rawLine.slice(0, -1) : rawLine;
    if (!line || line.startsWith(":")) continue;
    const separator = line.indexOf(":");
    const field = separator === -1 ? line : line.slice(0, separator);
    const value = separator === -1 ? "" : line.slice(separator + 1).replace(/^ /u, "");
    if (field === "id") id = value;
    if (field === "event") event = value;
    if (field === "data") data.push(value);
  }
  const payload = data.join("\n");
  return {
    ...(id ? { id } : {}),
    ...(event ? { event } : {}),
    data: parseData(payload),
  };
}

function parseData(value: string) {
  if (!value) return "";
  try {
    return JSON.parse(value);
  } catch {
    return value;
  }
}
