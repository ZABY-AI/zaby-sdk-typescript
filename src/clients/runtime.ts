import type { ZabyCoreClient } from "../transport";
import type { RequestOptions } from "../types/public";
import { parseSseResponse } from "../sse";
import { encodePath } from "../util";

const RUNTIME = "/api/v1/agent-runtime";

export class RuntimeRunsClient {
  constructor(private readonly core: ZabyCoreClient) {}

  start(input: unknown, options?: RequestOptions) {
    return this.core.request("POST", `${RUNTIME}/runs`, { json: input, ...options });
  }

  events(runId: string, query?: Record<string, unknown>, options?: RequestOptions) {
    return this.core.request("GET", `${RUNTIME}/runs/${encodePath(runId)}/events`, { query: query as any, ...options });
  }

  async *stream(runId: string, query?: Record<string, unknown>, options?: RequestOptions) {
    const response = await this.core.raw("GET", `${RUNTIME}/runs/${encodePath(runId)}/aiui`, {
      query: query as any,
      stream: true,
      ...options,
    });
    yield* parseSseResponse(response);
  }
}

export class RuntimeApprovalsClient {
  constructor(private readonly core: ZabyCoreClient) {}

  approve(runId: string, approvalId: string, options?: RequestOptions) {
    return this.core.request("POST", `${RUNTIME}/runs/${encodePath(runId)}/approvals/${encodePath(approvalId)}/approve`, options);
  }

  reject(runId: string, approvalId: string, options?: RequestOptions) {
    return this.core.request("POST", `${RUNTIME}/runs/${encodePath(runId)}/approvals/${encodePath(approvalId)}/reject`, options);
  }
}

export class RuntimeFeedbackClient {
  constructor(private readonly core: ZabyCoreClient) {}

  create(runId: string, input: unknown, options?: RequestOptions) {
    return this.core.request("POST", `${RUNTIME}/runs/${encodePath(runId)}/feedback`, { json: input, ...options });
  }
}
