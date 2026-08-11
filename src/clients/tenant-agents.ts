import type { ZabyCoreClient } from "../transport";
import type { RequestOptions } from "../types/public";
import { encodePath } from "../util";

const TENANT_AGENTS = "/api/v1/tenant/agents";

/**
 * Tenant JWT control-plane for managed agents.
 * Prefer `zaby.agents` (API-key provisioning) for external/SDK integrations.
 */
export class TenantAgentsClient {
  constructor(private readonly core: ZabyCoreClient) {}

  list(query?: Record<string, unknown>, options?: RequestOptions) {
    return this.core.request("GET", TENANT_AGENTS, {
      query: query as Record<string, string | number | boolean | null | undefined>,
      ...options,
    });
  }

  get(agentId: string, options?: RequestOptions) {
    return this.core.request("GET", `${TENANT_AGENTS}/${encodePath(agentId)}`, options);
  }

  create(input: unknown, options?: RequestOptions) {
    return this.core.request("POST", TENANT_AGENTS, { json: input, ...options });
  }

  update(agentId: string, input: unknown, options?: RequestOptions) {
    return this.core.request("PATCH", `${TENANT_AGENTS}/${encodePath(agentId)}`, { json: input, ...options });
  }

  delete(agentId: string, options?: RequestOptions) {
    return this.core.request("DELETE", `${TENANT_AGENTS}/${encodePath(agentId)}`, options);
  }

  publish(agentId: string, options?: RequestOptions) {
    return this.core.request("POST", `${TENANT_AGENTS}/${encodePath(agentId)}/publish`, options);
  }

  deploy(agentId: string, input: unknown, options?: RequestOptions) {
    return this.core.request("POST", `${TENANT_AGENTS}/${encodePath(agentId)}/deployments`, { json: input, ...options });
  }

  redeploy(agentId: string, input: unknown = {}, options?: RequestOptions) {
    return this.core.request("POST", `${TENANT_AGENTS}/${encodePath(agentId)}/redeploy`, { json: input, ...options });
  }

  testRun(agentId: string, input: unknown, options?: RequestOptions) {
    return this.core.request("POST", `${TENANT_AGENTS}/${encodePath(agentId)}/test-runs`, { json: input, ...options });
  }

  startRun(agentId: string, input: unknown, options?: RequestOptions) {
    return this.core.request("POST", `${TENANT_AGENTS}/${encodePath(agentId)}/runs`, { json: input, ...options });
  }

  listRuns(agentId: string, query?: Record<string, unknown>, options?: RequestOptions) {
    return this.core.request("GET", `${TENANT_AGENTS}/${encodePath(agentId)}/runs`, {
      query: query as Record<string, string | number | boolean | null | undefined>,
      ...options,
    });
  }

  getRunProgress(runId: string, options?: RequestOptions) {
    return this.core.request("GET", `${TENANT_AGENTS}/runs/${encodePath(runId)}/progress`, options);
  }

  listRunEvents(runId: string, query?: Record<string, unknown>, options?: RequestOptions) {
    return this.core.request("GET", `${TENANT_AGENTS}/runs/${encodePath(runId)}/events`, {
      query: query as Record<string, string | number | boolean | null | undefined>,
      ...options,
    });
  }

  approveRunApproval(runId: string, approvalId: string, input: unknown = {}, options?: RequestOptions) {
    return this.core.request("POST", `${TENANT_AGENTS}/runs/${encodePath(runId)}/approvals/${encodePath(approvalId)}/approve`, {
      json: input,
      ...options,
    });
  }

  rejectRunApproval(runId: string, approvalId: string, input: unknown = {}, options?: RequestOptions) {
    return this.core.request("POST", `${TENANT_AGENTS}/runs/${encodePath(runId)}/approvals/${encodePath(approvalId)}/reject`, {
      json: input,
      ...options,
    });
  }

  getDeploymentProvisioning(deploymentId: string, options?: RequestOptions) {
    return this.core.request("GET", `${TENANT_AGENTS}/deployments/${encodePath(deploymentId)}/provisioning`, options);
  }

  attachMcpTool(agentId: string, input: unknown, options?: RequestOptions) {
    return this.core.request("POST", `${TENANT_AGENTS}/${encodePath(agentId)}/mcp-tools`, { json: input, ...options });
  }

  attachKnowledgeBase(agentId: string, input: unknown, options?: RequestOptions) {
    return this.core.request("POST", `${TENANT_AGENTS}/${encodePath(agentId)}/knowledge-bases`, { json: input, ...options });
  }

  attachSkill(agentId: string, input: unknown, options?: RequestOptions) {
    return this.core.request("POST", `${TENANT_AGENTS}/${encodePath(agentId)}/skills`, { json: input, ...options });
  }

  listExternalApps(query?: Record<string, unknown>, options?: RequestOptions) {
    return this.core.request("GET", `${TENANT_AGENTS}/external-apps`, {
      query: query as Record<string, string | number | boolean | null | undefined>,
      ...options,
    });
  }

  mintPlaygroundRuntimeToken(agentId: string, input: unknown, options?: RequestOptions) {
    return this.core.request("POST", `${TENANT_AGENTS}/${encodePath(agentId)}/playground/runtime-tokens`, { json: input, ...options });
  }
}
