export type Query = Record<string, string | number | boolean | null | undefined | Array<string | number | boolean>>;

export function joinPath(...parts: string[]) {
  return parts
    .filter(Boolean)
    .map((part, index) => index === 0 ? part.replace(/\/+$/u, "") : part.replace(/^\/+|\/+$/gu, ""))
    .join("/");
}

const ENCODE_PATH_ALWAYS_SAFE = /[A-Za-z0-9\-_.]/;
const ENCODE_PATH_EXTRA_SAFE = "!'()*";

/** Match Python urllib.parse.quote(value, safe="!'()*"). */
export function encodePath(value: string) {
  const encoder = new TextEncoder();
  let result = "";
  for (const char of value) {
    if (ENCODE_PATH_ALWAYS_SAFE.test(char) || ENCODE_PATH_EXTRA_SAFE.includes(char)) {
      result += char;
      continue;
    }
    for (const byte of encoder.encode(char)) {
      result += `%${byte.toString(16).toUpperCase().padStart(2, "0")}`;
    }
  }
  return result;
}

export function appendQuery(path: string, query?: Query) {
  if (!query) return path;
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(query)) {
    if (value === undefined || value === null) continue;
    if (Array.isArray(value)) {
      for (const item of value) params.append(key, String(item));
    } else {
      params.set(key, String(value));
    }
  }
  const serialized = params.toString();
  return serialized ? `${path}?${serialized}` : path;
}

/** Normalize legacy `text`/`name` fields to API-expected `content`/`title`. */
export function normalizeTextDocumentBody(input: unknown): Record<string, unknown> {
  if (!input || typeof input !== "object" || Array.isArray(input)) return {};
  const body = { ...(input as Record<string, unknown>) };
  if ("text" in body && !("content" in body)) {
    body.content = body.text;
    delete body.text;
  }
  if ("name" in body && !("title" in body)) {
    body.title = body.name;
    delete body.name;
  }
  if (!("title" in body) && typeof body.content === "string") {
    body.title = body.content.slice(0, 50) || "Untitled";
  }
  return body;
}
