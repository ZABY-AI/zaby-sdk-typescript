import { createZabyApiError } from "./errors";
import type { ResolvedZabyConfig } from "./config";
import type { Query } from "./util";
import { appendQuery } from "./util";

export type HttpMethod = "GET" | "POST" | "PUT" | "PATCH" | "DELETE";

export type TransportRequest = {
  method: HttpMethod;
  url: string;
  path: string;
  headers: Record<string, string>;
  json?: unknown;
  signal?: AbortSignal;
  stream?: boolean;
};

export type TransportResponse = {
  status: number;
  headers: Record<string, string>;
  json?: unknown;
  body?: string;
  bodyStream?: ReadableStream<Uint8Array> | null;
};

export interface ZabyTransport {
  send(request: TransportRequest): Promise<TransportResponse>;
}

export type AuthHeaderProvider = () => Promise<Record<string, string>>;

export class HttpTransport implements ZabyTransport {
  constructor(private readonly config: ResolvedZabyConfig) {}

  async send(request: TransportRequest): Promise<TransportResponse> {
    const controller = request.signal ? null : new AbortController();
    const timeout = controller
      ? setTimeout(() => controller.abort(), this.config.timeoutMs)
      : null;
    try {
      const init: RequestInit = {
        method: request.method,
        headers: request.headers,
      };
      if (request.json !== undefined) init.body = JSON.stringify(request.json);
      const signal = request.signal ?? controller?.signal;
      if (signal) init.signal = signal;
      const response = await this.config.fetch(request.url, init);
      const headers = headersToRecord(response.headers);
      if (request.stream) {
        return { status: response.status, headers, bodyStream: response.body };
      }
      const body = await response.text();
      return {
        status: response.status,
        headers,
        body,
        json: parseJsonBody(body),
      };
    } finally {
      if (timeout) clearTimeout(timeout);
    }
  }
}

export type CoreRequestOptions = {
  query?: Query;
  json?: unknown;
  requestId?: string;
  signal?: AbortSignal;
  stream?: boolean;
};

export class ZabyCoreClient {
  constructor(
    private readonly config: ResolvedZabyConfig,
    private readonly authHeaders: AuthHeaderProvider,
    private readonly transport: ZabyTransport = new HttpTransport(config),
  ) {}

  async request<T = unknown>(method: HttpMethod, path: string, options: CoreRequestOptions = {}): Promise<T> {
    const response = await this.raw(method, path, options);
    if (response.status >= 400) throw createErrorFromResponse(response);
    return response.json as T;
  }

  async raw(method: HttpMethod, path: string, options: CoreRequestOptions = {}) {
    const pathWithQuery = appendQuery(path, options.query);
    const headers: Record<string, string> = {
      accept: "application/json",
      ...await this.authHeaders(),
    };
    if (options.json !== undefined) headers["content-type"] = "application/json";
    if (options.requestId) headers["x-request-id"] = options.requestId;
    if (this.config.userAgent) headers["user-agent"] = this.config.userAgent;

    const request: TransportRequest = {
      method,
      path: pathWithQuery,
      url: `${this.config.apiOrigin}${pathWithQuery}`,
      headers,
      ...(options.json !== undefined ? { json: options.json } : {}),
      ...(options.signal ? { signal: options.signal } : {}),
      ...(options.stream ? { stream: true } : {}),
    };

    const response = await this.sendWithRetry(request);
    if (response.status >= 400) {
      throw createErrorFromResponse(response);
    }
    return response;
  }

  private async sendWithRetry(request: TransportRequest) {
    const policy = this.config.retries;
    const attempts = policy.attempts ?? 0;
    const retryMethods = policy.retryMethods ?? [];
    const retryStatuses = policy.retryStatuses ?? [];
    let lastResponse: TransportResponse | null = null;

    for (let attempt = 0; attempt <= attempts; attempt += 1) {
      const response = await this.transport.send(request);
      lastResponse = response;
      const shouldRetry = attempt < attempts
        && retryMethods.includes(request.method)
        && retryStatuses.includes(response.status);
      if (!shouldRetry) return response;
      await sleep(policy.backoffMs?.(attempt) ?? 0);
    }

    return lastResponse!;
  }
}

function createErrorFromResponse(response: TransportResponse) {
  const body = typeof response.json === "object" && response.json !== null
    ? response.json as Record<string, unknown>
    : {};
  const errorInput = {
    status: response.status,
    message: stringField(body.message) ?? `Zaby API request failed with status ${response.status}.`,
    details: body,
  };
  const code = stringField(body.code) ?? stringField(body.errorCode);
  const requestId = response.headers["x-request-id"];
  const retryAfter = parseRetryAfter(response.headers["retry-after"]);
  return createZabyApiError({
    ...errorInput,
    ...(code ? { code } : {}),
    ...(requestId ? { requestId } : {}),
    ...(retryAfter !== undefined ? { retryAfter } : {}),
  });
}

function headersToRecord(headers: Headers) {
  const record: Record<string, string> = {};
  headers.forEach((value, key) => {
    record[key.toLowerCase()] = value;
  });
  return record;
}

function parseJsonBody(body: string) {
  if (!body) return undefined;
  try {
    return JSON.parse(body);
  } catch {
    return undefined;
  }
}

function stringField(value: unknown) {
  return typeof value === "string" ? value : undefined;
}

function parseRetryAfter(value: string | undefined) {
  if (!value) return undefined;
  const seconds = Number(value);
  return Number.isFinite(seconds) ? seconds : undefined;
}

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
