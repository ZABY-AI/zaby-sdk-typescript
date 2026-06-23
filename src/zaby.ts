import { resolveZabyConfig, type ZabyGlobalConfig } from "./config";
import { ZabyCoreClient, type ZabyTransport } from "./transport";
import type { RequestOptions, ZabyAccessTokenProvider, ZabyApiKeyProvider, ZabyRuntimeTokenProvider } from "./types/public";
import {
  AgentsClient,
  ApprovalsClient,
  DeploymentsClient,
  ExternalAppsClient,
  RuntimeTokensClient,
  UsageClient,
} from "./clients/agents";
import { IntelligenceClient } from "./clients/intelligence";
import { KnowledgeBasesClient } from "./clients/knowledge-bases";
import { McpClient } from "./clients/mcp";
import { MemoryClient } from "./clients/memory";
import { RuntimeApprovalsClient, RuntimeFeedbackClient, RuntimeRunsClient } from "./clients/runtime";

export type ZabyClientOptions = {
  apiKey: ZabyApiKeyProvider;
  accessToken?: ZabyAccessTokenProvider;
  transport?: ZabyTransport;
  config?: ZabyGlobalConfig;
};

export type ZabyRuntimeOptions = {
  token: ZabyRuntimeTokenProvider;
  transport?: ZabyTransport;
  config?: ZabyGlobalConfig;
};

export class Zaby {
  readonly health: HealthClient;
  readonly agents: AgentsClient;
  readonly deployments: DeploymentsClient;
  readonly externalApps: ExternalAppsClient;
  readonly runtimeTokens: RuntimeTokensClient;
  readonly knowledgeBases: KnowledgeBasesClient;
  readonly mcp: McpClient;
  readonly memory: MemoryClient;
  readonly intelligence: IntelligenceClient;
  readonly approvals: ApprovalsClient;
  readonly usage: UsageClient;

  constructor(options: ZabyClientOptions) {
    const config = resolveZabyConfig(options.config);
    const core = new ZabyCoreClient(config, async () => {
      const headers: Record<string, string> = {
        "x-zaby-api-key": await resolveProvider(options.apiKey),
      };
      if (options.accessToken) {
        headers.authorization = `Bearer ${await resolveProvider(options.accessToken)}`;
      }
      return headers;
    }, options.transport);

    this.health = new HealthClient(core);
    this.agents = new AgentsClient(core);
    this.deployments = new DeploymentsClient(core);
    this.externalApps = new ExternalAppsClient(core);
    this.runtimeTokens = new RuntimeTokensClient(core);
    this.knowledgeBases = new KnowledgeBasesClient(core);
    this.mcp = new McpClient(core);
    this.memory = new MemoryClient(core);
    this.intelligence = new IntelligenceClient(core);
    this.approvals = new ApprovalsClient(core);
    this.usage = new UsageClient(core);
  }
}

export class ZabyRuntime {
  readonly runs: RuntimeRunsClient;
  readonly approvals: RuntimeApprovalsClient;
  readonly feedback: RuntimeFeedbackClient;

  constructor(options: ZabyRuntimeOptions) {
    const config = resolveZabyConfig(options.config);
    const core = new ZabyCoreClient(config, async () => ({
      authorization: `Bearer ${await resolveProvider(options.token)}`,
    }), options.transport);
    this.runs = new RuntimeRunsClient(core);
    this.approvals = new RuntimeApprovalsClient(core);
    this.feedback = new RuntimeFeedbackClient(core);
  }
}

class HealthClient {
  constructor(private readonly core: ZabyCoreClient) {}

  check(options?: RequestOptions) {
    return this.core.request("GET", "/health", options);
  }
}

async function resolveProvider(provider: ZabyAccessTokenProvider | ZabyApiKeyProvider | ZabyRuntimeTokenProvider) {
  if (typeof provider === "function") return provider();
  return provider;
}
