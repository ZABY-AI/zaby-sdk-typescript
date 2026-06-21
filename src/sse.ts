import type { SseEvent } from "./types/public";

export async function* parseSseResponse(response: {
  body?: string;
  bodyStream?: ReadableStream<Uint8Array> | null;
}): AsyncIterable<SseEvent> {
  const source = response.body ?? await readStream(response.bodyStream);
  const normalized = source.replace(/\r\n/gu, "\n");
  for (const block of normalized.split(/\n\n+/u)) {
    const event = parseBlock(block);
    if (event) yield event;
  }
}

function parseBlock(block: string): SseEvent | null {
  if (!block.trim()) return null;
  let id: string | undefined;
  let event: string | undefined;
  const data: string[] = [];
  for (const line of block.split("\n")) {
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

async function readStream(stream: ReadableStream<Uint8Array> | null | undefined) {
  if (!stream) return "";
  const reader = stream.getReader();
  const decoder = new TextDecoder();
  let output = "";
  while (true) {
    const { value, done } = await reader.read();
    if (done) break;
    output += decoder.decode(value, { stream: true });
  }
  output += decoder.decode();
  return output;
}

function parseData(value: string) {
  if (!value) return null;
  try {
    return JSON.parse(value);
  } catch {
    return value;
  }
}
