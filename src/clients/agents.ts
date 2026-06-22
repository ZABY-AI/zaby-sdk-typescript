import type { ZabyCoreClient } from "../transport";
import type {
  RequestOptions,
  RuntimeTokenCreateInput,
  RuntimeTokenResponse,
  RuntimeTokenRevokeFamilyInput,
  RuntimeTokenRevokeFamilyResponse,
  RuntimeTokenRotateByUniqueIdInput,
  RuntimeTokenRotateInput,
} from "../types/public";
import { encodePath } from "../util";

const AGENTS = "/api/v1/tenant/agents";

export class AgentsClient {
  constructor(private readonly core: ZabyCoreClient) {}

  create(input: unknown, options?: RequestOptions) {
    return this.core.request("POST", AGENTS, { json: input, ...options });
  }

  attachMcpTool(agentId: string, input: unknown, options?: RequestOptions) {
    return this.core.request("POST", `${AGENTS}/${encodePath(agentId)}/mcp-tools`, { json: input, ...options });
  }

  attachKnowledgeBase(agentId: string, input: unknown, options?: RequestOptions) {
    return this.core.request("POST", `${AGENTS}/${encodePath(agentId)}/knowledge-bases`, { json: input, ...options });
  }

  attachSkill(agentId: string, input: unknown, options?: RequestOptions) {
    return this.core.request("POST", `${AGENTS}/${encodePath(agentId)}/skills`, { json: input, ...options });
  }

  publish(agentId: string, options?: RequestOptions) {
    return this.core.request("POST", `${AGENTS}/${encodePath(agentId)}/publish`, options);
  }

  deploy(agentId: string, input: unknown, options?: RequestOptions) {
    return this.core.request("POST", `${AGENTS}/${encodePath(agentId)}/deployments`, { json: input, ...options });
  }

  testRun(agentId: string, input: unknown, options?: RequestOptions) {
    return this.core.request("POST", `${AGENTS}/${encodePath(agentId)}/test-runs`, { json: input, ...options });
  }

  startRun(agentId: string, input: unknown, options?: RequestOptions) {
    return this.core.request("POST", `${AGENTS}/${encodePath(agentId)}/runs`, { json: input, ...options });
  }

  getRunProgress(runId: string, options?: RequestOptions) {
    return this.core.request("GET", `${AGENTS}/runs/${encodePath(runId)}/progress`, options);
  }

  listRunEvents(runId: string, query?: Record<string, unknown>, options?: RequestOptions) {
    return this.core.request("GET", `${AGENTS}/runs/${encodePath(runId)}/events`, {
      query: query as Record<string, string | number | boolean | null | undefined>,
      ...options,
    });
  }
}

export class DeploymentsClient {
  constructor(private readonly core: ZabyCoreClient) {}

  create(agentId: string, input: unknown, options?: RequestOptions) {
    return this.core.request("POST", `${AGENTS}/${encodePath(agentId)}/deployments`, { json: input, ...options });
  }

  getProvisioning(deploymentId: string, options?: RequestOptions) {
    return this.core.request("GET", `${AGENTS}/deployments/${encodePath(deploymentId)}/provisioning`, options);
  }
}

export class ExternalAppsClient {
  constructor(private readonly core: ZabyCoreClient) {}

  list(query?: Record<string, unknown>, options?: RequestOptions) {
    return this.core.request("GET", `${AGENTS}/external-apps`, {
      query: query as Record<string, string | number | boolean | null | undefined>,
      ...options,
    });
  }

  create(input: unknown, options?: RequestOptions) {
    return this.core.request("POST", `${AGENTS}/external-apps`, { json: input, ...options });
  }

  get(externalAppId: string, options?: RequestOptions) {
    return this.core.request("GET", `${AGENTS}/external-apps/${encodePath(externalAppId)}`, options);
  }

  update(externalAppId: string, input: unknown, options?: RequestOptions) {
    return this.core.request("PATCH", `${AGENTS}/external-apps/${encodePath(externalAppId)}`, { json: input, ...options });
  }

  bindDeployment(externalAppId: string, input: unknown, options?: RequestOptions) {
    return this.core.request("POST", `${AGENTS}/external-apps/${encodePath(externalAppId)}/deployments`, {
      json: input,
      ...options,
    });
  }
}

export class RuntimeTokensClient {
  constructor(private readonly core: ZabyCoreClient) {}

  create<T = RuntimeTokenResponse>(input: RuntimeTokenCreateInput, options?: RequestOptions) {
    const { externalAppId, ...body } = input;
    return this.core.request<T>("POST", `/api/v1/provisioning/managed-agents/external-apps/${encodePath(externalAppId)}/runtime-tokens`, {
      json: body,
      ...options,
    });
  }

  rotate<T = RuntimeTokenResponse>(input: RuntimeTokenRotateInput, options?: RequestOptions) {
    return this.core.request<T>("POST", "/api/v1/provisioning/managed-agents/runtime-tokens/rotate", {
      json: input,
      ...options,
    });
  }

  rotateByUniqueId<T = RuntimeTokenResponse>(input: RuntimeTokenRotateByUniqueIdInput, options?: RequestOptions) {
    const { externalAppId, ...body } = input;
    return this.core.request<T>("POST", `/api/v1/provisioning/managed-agents/external-apps/${encodePath(externalAppId)}/runtime-tokens/rotate`, {
      json: body,
      ...options,
    });
  }

  revokeFamily<T = RuntimeTokenRevokeFamilyResponse>(
    tokenFamilyId: string,
    input: RuntimeTokenRevokeFamilyInput,
    options?: RequestOptions,
  ) {
    return this.core.request<T>("POST", `/api/v1/provisioning/managed-agents/runtime-token-families/${encodePath(tokenFamilyId)}/revoke`, {
      json: input,
      ...options,
    });
  }

  recordFeedback(runId: string, input: unknown, options?: RequestOptions) {
    return this.core.request("POST", `/api/v1/provisioning/managed-agents/runs/${encodePath(runId)}/feedback`, {
      json: input,
      ...options,
    });
  }
}

export class ApprovalsClient {
  constructor(private readonly core: ZabyCoreClient) {}

  list(options?: RequestOptions) {
    return this.core.request("GET", `${AGENTS}/approvals`, options);
  }

  approve(runId: string, approvalId: string, options?: RequestOptions) {
    return this.core.request("POST", `${AGENTS}/runs/${encodePath(runId)}/approvals/${encodePath(approvalId)}/approve`, options);
  }

  reject(runId: string, approvalId: string, options?: RequestOptions) {
    return this.core.request("POST", `${AGENTS}/runs/${encodePath(runId)}/approvals/${encodePath(approvalId)}/reject`, options);
  }
}

export class UsageClient {
  constructor(private readonly core: ZabyCoreClient) {}

  getAgentUsage(query?: { agentId?: string; from?: string; to?: string }, options?: RequestOptions) {
    return this.core.request("GET", `${AGENTS}/usage`, {
      ...(query ? { query } : {}),
      ...options,
    });
  }
}
