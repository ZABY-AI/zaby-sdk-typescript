export type Query = Record<string, string | number | boolean | null | undefined | Array<string | number | boolean>>;

export function joinPath(...parts: string[]) {
  return parts
    .filter(Boolean)
    .map((part, index) => index === 0 ? part.replace(/\/+$/u, "") : part.replace(/^\/+|\/+$/gu, ""))
    .join("/");
}

export function encodePath(value: string) {
  return encodeURIComponent(value);
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
