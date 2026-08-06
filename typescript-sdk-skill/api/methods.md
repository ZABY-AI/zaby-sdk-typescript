# Methods Reference

All methods return promises. Management methods accept an optional `RequestOptions` (`{ requestId?, signal? }`). Bases: `PROVISIONING = /api/v1/provisioning`, `AGENTS = /api/v1/provisioning/agentic-os/agents`, `MCP = /api/v1/provisioning/agentic-os/mcp`, `RUNTIME = /api/v1/agent-runtime`, `TENANT_AGENTS = /api/v1/tenant/agents`.

## tenantAgents (tenant-facing agent lifecycle — `zaby.tenantAgents`)
- `list(query?)` → GET `/api/v1/tenant/agents` (filters: `category`, `kind` (DEPLOYABLE/EXECUTABLE/INTERNAL), `status`, `visibility`, `q`, `cursor`, `limit`)
- `get(agentId)`, `create(input)` (include `kind` + `communicationStyle`), `update(agentId, input)`, `delete(agentId)`
- `publish(agentId)` → POST `.../{id}/publish`
- `deploy(agentId, input)` → POST `.../{id}/deployments` (`{ agentVersionId, environment?, metadata? }`)
- `redeploy(agentId, input?)`, `testRun(agentId, input)`, `startRun(agentId, input)`
- `listRuns(agentId, query?)`, `getRunProgress(runId)`, `listRunEvents(runId, query?)`
- `approveRunApproval(runId, approvalId, input?)`, `rejectRunApproval(runId, approvalId, input?)`
- `getDeploymentProvisioning(deploymentId)`
- `attachMcpTool(agentId, input)`, `attachKnowledgeBase(agentId, input)`, `attachSkill(agentId, input)`, `attachConnectedApp(agentId, input)`
- `listExternalApps(query?)`, `mintPlaygroundRuntimeToken(agentId, input)`

## executableAgents (inline EXECUTABLE — `zaby.executableAgents`)
- `list(query?)`, `get(agentId)`, `create(input)` → POST `/api/v1/tenant/executable-agents`
- `activate(agentId, input)` → POST `.../{id}/activate` (`{ versionId, limits, bypassRules?, observabilityMode }`)
- `disable(agentId)`, `listRuns(agentId, query?)`, `listSteps(agentId, runId)`, `usage(agentId)`

## scoutAgents (inline INTERNAL — `zaby.scoutAgents`)
Same shape as `executableAgents` but rooted at `/api/v1/tenant/scout-agents`. Scout agents only expose internal tools (`zaby_current_time`, `calculator`, `memory_search`) and are not externally callable.

## externalApps
- `list(query?)` → GET `.../managed-agents/external-apps`
- `create(input)` → POST `.../managed-agents/external-apps`
- `get(externalAppId)` → GET `.../managed-agents/external-apps/{id}`
- `update(externalAppId, input)` → PATCH
- `bindDeployment(externalAppId, input)` → POST `.../{id}/deployments`

## runtimeTokens (mint/rotate/revoke)
- `create(input: RuntimeTokenCreateInput)` → POST `.../external-apps/{externalAppId}/runtime-tokens` (returns `RuntimeTokenResponse`)
- `rotate(input)` → POST `.../runtime-tokens/rotate`
- `rotateByUniqueId(input)` → POST `.../external-apps/{externalAppId}/runtime-tokens/rotate`
- `revokeFamily(tokenFamilyId, input)` → POST `.../runtime-token-families/{id}/revoke`
- `recordFeedback(runId, input)` → POST `.../managed-agents/runs/{runId}/feedback`

## runtimeTokenFamilies / Policies / Grants / Usage
- `runtimeTokenFamilies.list(query?)`, `.revoke(familyId)`
- `runtimeTokenPolicies.list(query?)`, `.create(input)`, `.get(policyId)`, `.update(policyId, input)`
- `runtimeTokenGrants.revoke(grantId, input?)`
- `runtimeTokenUsage.get(query?)`

## agents
- `create(input)`, `publish(agentId)`, `deploy(agentId, input)`
- `attachMcpTool(agentId, input)`, `attachKnowledgeBase(agentId, input)`, `attachSkill(agentId, input)`
- `testRun(agentId, input)`, `startRun(agentId, input)`
- `playgroundRuntimeTokens(agentId)`
- `getRunProgress(runId)`, `listRunEvents(runId, query?)`

## deployments
- `create(agentId, input)` (alias of `agents.deploy`)
- `getProvisioning(deploymentId)` → GET `.../managed-agents/deployments/{id}/provisioning`

## mcp (servers / installations / tools / credentials)
- `listCatalog()` → GET `.../mcp/catalog`
- `createServer(input)`, `getServer(serverId)`, `updateServer(serverId, input)`, `discoverTools(serverId)`
- `installServer(input)`, `listInstallations()`, `updateInstallation(installationId, input)`, `revokeInstallation(installationId)`
- `listInstallationTools(installationId)`
- `updateToolPolicy(installationId, toolId, input)` → PATCH `.../installations/{id}/tools/{toolId}/policy`
- `preflightInvocation(installationId, toolName, input)`, `invokeTool(installationId, toolName, input)`
- `createCredentialBinding(installationId, input)` → POST `.../installations/{id}/credential-bindings`
- `deleteCredentialBinding(bindingId)`
- `upsertAuthPolicy(installationId, input)` → POST `.../installations/{id}/auth-policies`
- `grantAccess(installationId, input)`

## knowledgeBases / memory / intelligence
- `knowledgeBases.*` — list/create/get/update/delete + attach (see `agents.attachKnowledgeBase`)
- `memory.*` — conversation/session memory operations
- `intelligence.*` — improvement loops

## approvals (provisioning)
- `approvals.list()`, `approvals.approve(runId, approvalId)`, `approvals.reject(runId, approvalId)`

## usage
- `usage.getAgentUsage(query?: { agentId?, from?, to? })` → GET `.../agents/usage`

## runtime (ZabyRuntime)
- `runs.start(input)` → POST `.../agent-runtime/runs` (returns `{ runId, ... }`)
- `runs.events(runId, query?)` → GET `.../runs/{runId}/events`
- `runs.stream(runId, query?)` → async iterator over `.../runs/{runId}/aiui` (SSE), stops at `RunFinished`
- `runtime.approvals.approve(runId, approvalId)`, `.reject(runId, approvalId)`
- `runtime.feedback.create(runId, input)`

## Notes
- Most `input` payloads are typed `unknown` — the SDK forwards your object as JSON. Use the Zaby API reference / console for the exact schema.
- `list*` methods typically return a `ListResponse<T>` (`{ items, page?, limit?, total? }`).
