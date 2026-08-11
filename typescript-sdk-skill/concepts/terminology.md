# Terminology

| Term | Meaning |
|------|---------|
| **Agentic OS** | Zaby's platform for configuring, deploying, running, and governing agents. |
| **Managed agent** | An agent definition you create (`agents.create`) and deploy. Has an `agentId`. |
| **Deployment** | A deployed instance of an agent, bound to an external app. Has a `deploymentId`. Runs are executed against a deployment. |
| **External app** | A first-party/third-party app registration (`externalApps.create`) that consumes agent runtimes. Has `externalAppId`, `slug`, `allowedOrigins`. |
| **Runtime token** | A short-lived, bounded (TTL + maxUses) token minted for a user/session to call the runtime. Minted via `runtimeTokens.create`. Never the tenant API key. |
| **Runtime token family** | A grouping of tokens (for rotation/revocation) via `tokenFamilyId`. |
| **Quota policy** | Limits/quotas attached to a runtime token (`runtimeTokenPolicies`). |
| **MCP server / installation** | An MCP server definition (`mcp.createServer`) and its tenant installation (`mcp.installServer({ serverDefinitionId })`). Tools are **discovered per server** (`discoverTools(serverId)`), then listed per installation. |
| **Credential binding** | Binds an MCP installation to stored credentials (`mcp.createCredentialBinding`) — required for tools that need auth (e.g. AWS MCP). |
| **Auth policy** | Per-installation auth rules (`mcp.upsertAuthPolicy`), e.g. `riskOverride`, `requiresApproval`. |
| **Knowledge base** | A retrieved-context source attached to an agent (`knowledgeBases.*`, `agents.attachKnowledgeBase`). |
| **Memory** | Conversation/session memory client (`memory.*`). |
| **Approval** | A human-in-the-loop gate on a run (`approvals.*` / `runtime.approvals.*`). |
| **Run** | One agent execution (`runs.start` → `runs.stream`). Emits AG-UI events. |
| **AG-UI / AIUI event** | A streaming event from a run (`RunStarted`, `TEXT_MESSAGE_CONTENT`, `ToolCallStart`, `RunFinished`, …). Protocol lives in `@zaby-ai/aiui-core` (`EventDecoder`). |
| **Runtime token refresh** | Remint or `runtimeTokens.rotate`. Not a separate refresh-token type. Browser: `createRuntimeTokenManager` in `@zaby-ai/aiui-core`. |
| **`@zaby-ai/aiui-react`** | React chat (`AbstractAgent`, `useAgentChat`, `Chat`). Required for a product UI. |
| **SSE** | Server-Sent Events — the transport for run streaming. |

## Clients on `Zaby`
`health`, `agents`, `tenantAgents`, `deployments`, `externalApps`, `runtimeTokens`, `runtimeTokenFamilies`, `runtimeTokenPolicies`, `runtimeTokenGrants`, `runtimeTokenUsage`, `knowledgeBases`, `mcp`, `memory`, `intelligence`, `approvals`, `usage`.

## Clients on `ZabyRuntime`
`runs`, `approvals`, `feedback`.
