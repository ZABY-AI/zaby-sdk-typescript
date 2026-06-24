import type { TransportRequest, TransportResponse, ZabyTransport } from "../transport";

export type MockResponse = {
  method: string;
  path: string;
  status?: number;
  json?: unknown;
  body?: string;
  headers?: Record<string, string>;
};

export type MockRequest = TransportRequest;

export class MockTransport implements ZabyTransport {
  readonly requests: MockRequest[] = [];
  private cursor = 0;

  constructor(private readonly responses: MockResponse[]) {}

  async send(request: TransportRequest): Promise<TransportResponse> {
    const reqHeaders = request.headers ?? {};
    this.requests.push({
      ...request,
      headers: normalizeHeaders(reqHeaders),
    });
    const response = this.responses[this.cursor];
    if (!response) {
      throw new Error(`No mock response configured for ${request.method} ${request.path}`);
    }
    const requestPath = request.path.split("?")[0];
    const responsePath = response.path.split("?")[0];
    if (response.method !== request.method || responsePath !== requestPath) {
      throw new Error(`Expected ${response.method} ${response.path}, received ${request.method} ${request.path}`);
    }
    this.cursor++;

    return {
      status: response.status ?? 200,
      headers: normalizeHeaders(response.headers ?? {}),
      ...(response.json !== undefined ? { json: response.json, body: JSON.stringify(response.json) } : {}),
      ...(response.body !== undefined ? { body: response.body } : {}),
    };
  }
}

function normalizeHeaders(headers: Record<string, string>) {
  const normalized: Record<string, string> = {};
  for (const [key, value] of Object.entries(headers)) {
    normalized[key.toLowerCase()] = value;
  }
  return normalized;
}
