import type { ZabyCoreClient } from "../transport";
import type { RequestOptions } from "../types/public";
import { encodePath } from "../util";

const AGENTS = "/api/v1/provisioning/agentic-os/agents";

export class MemoryClient {
  constructor(private readonly core: ZabyCoreClient) {}

  listItems(query?: Record<string, unknown>, options?: RequestOptions) {
    return this.core.request("GET", `${AGENTS}/memory-items`, { query: query as any, ...options });
  }

  getItem(memoryItemId: string, options?: RequestOptions) {
    return this.core.request("GET", `${AGENTS}/memory-items/${encodePath(memoryItemId)}`, options);
  }

  retrieve(input: unknown, options?: RequestOptions) {
    return this.core.request("POST", `${AGENTS}/memory-retrievals`, { json: input, ...options });
  }

  listCandidates(query?: Record<string, unknown>, options?: RequestOptions) {
    return this.core.request("GET", `${AGENTS}/memory-candidates`, { query: query as any, ...options });
  }

  approveCandidate(candidateId: string, input: unknown = {}, options?: RequestOptions) {
    return this.core.request("POST", `${AGENTS}/memory-candidates/${encodePath(candidateId)}/approve`, { json: input, ...options });
  }

  rejectCandidate(candidateId: string, input: unknown = {}, options?: RequestOptions) {
    return this.core.request("POST", `${AGENTS}/memory-candidates/${encodePath(candidateId)}/reject`, { json: input, ...options });
  }

  disableItem(memoryItemId: string, input: unknown = {}, options?: RequestOptions) {
    return this.core.request("PATCH", `${AGENTS}/memory-items/${encodePath(memoryItemId)}/disable`, { json: input, ...options });
  }

  deleteItem(memoryItemId: string, input: unknown = {}, options?: RequestOptions) {
    return this.core.request("DELETE", `${AGENTS}/memory-items/${encodePath(memoryItemId)}`, { json: input, ...options });
  }
}
