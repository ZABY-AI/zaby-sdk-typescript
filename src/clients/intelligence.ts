import type { ZabyCoreClient } from "../transport";
import type { RequestOptions } from "../types/public";
import { encodePath } from "../util";

const INTELLIGENCE = "/api/v1/provisioning/agentic-os/agents/intelligence";

export class IntelligenceClient {
  constructor(private readonly core: ZabyCoreClient) {}

  listSignals(query?: Record<string, unknown>, options?: RequestOptions) {
    return this.core.request("GET", `${INTELLIGENCE}/signals`, { query: query as any, ...options });
  }

  listRollups(query?: Record<string, unknown>, options?: RequestOptions) {
    return this.core.request("GET", `${INTELLIGENCE}/rollups`, { query: query as any, ...options });
  }

  listImprovements(query?: Record<string, unknown>, options?: RequestOptions) {
    return this.core.request("GET", `${INTELLIGENCE}/improvements`, { query: query as any, ...options });
  }

  approveImprovement(candidateId: string, input: unknown = {}, options?: RequestOptions) {
    return this.core.request("POST", `${INTELLIGENCE}/improvements/${encodePath(candidateId)}/approve`, { json: input, ...options });
  }

  rejectImprovement(candidateId: string, input: unknown = {}, options?: RequestOptions) {
    return this.core.request("POST", `${INTELLIGENCE}/improvements/${encodePath(candidateId)}/reject`, { json: input, ...options });
  }
}
