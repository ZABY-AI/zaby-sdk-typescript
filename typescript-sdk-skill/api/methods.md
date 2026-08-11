# Methods Reference

All methods return promises. Optional `RequestOptions`: `{ requestId?, signal? }`.

Bases:
- `AGENTS` = `/api/v1/provisioning/agentic-os/agents`
- `PROVISIONING` = `/api/v1/provisioning`
- `MCP` = `/api/v1/provisioning/agentic-os/mcp`
- `KBS` = `/api/v1/provisioning/agentic-os/knowledge-bases`
- `LIB` = `/api/v1/provisioning/agentic-os/knowledge-library`
- `TENANT_AGENTS` = `/api/v1/tenant/agents`
- `RUNTIME` = `/api/v1/agent-runtime`

## agents (API-key provisioning — preferred for SDKs)
- `create(input)`, `publish(agentId)`, `deploy(agentId, input)`
- `attachMcpTool(agentId, input)`, `attachKnowledgeBase(agentId, input)`, `attachSkill(agentId, input)`
- `testRun(agentId, input)`, `startRun(agentId, input)`
- `playgroundRuntimeTokens(agentId, input)` → **POST** `.../playground/runtime-tokens` (body required: e.g. `deploymentId`, `externalUserId` / `uniqueId`)
- `getRunProgress(runId)`, `listRunEvents(runId, query?)`

## tenantAgents (tenant JWT control-plane)
- `list(query?)` filters: `category`, `status`, `visibility`, `q`, `cursor`, `limit`
- `get(agentId)`, `create(input)`, `update(agentId, input)`, `delete(agentId)`
- `publish(agentId)`, `deploy(agentId, input)`, `redeploy(agentId, input?)`
- `testRun(agentId, input)`, `startRun(agentId, input)`, `listRuns(agentId, query?)`
- `getRunProgress(runId)`, `listRunEvents(runId, query?)`
- `approveRunApproval(runId, approvalId, input?)`, `rejectRunApproval(runId, approvalId, input?)`
- `getDeploymentProvisioning(deploymentId)`
- `attachMcpTool(agentId, input)`, `attachKnowledgeBase(agentId, input)`, `attachSkill(agentId, input)`
- `listExternalApps(query?)`, `mintPlaygroundRuntimeToken(agentId, input)` → POST

## externalApps
- `list(query?)`, `create(input)`, `get(externalAppId)`, `update(externalAppId, input)`
- `bindDeployment(externalAppId, input)` — `{ deploymentId, allowBrowserRuntime?, allowServerRuntime?, allowApprovals?, ... }`

## runtimeTokens
- `create(input: RuntimeTokenCreateInput)` — requires `externalAppId` + `deploymentId` + (`uniqueId` **or** `externalUserId`)
- `rotate({ previousToken })`, `rotateByUniqueId(input)`
- `revokeFamily(tokenFamilyId, { reason })`, `recordFeedback(runId, input)`

## runtimeTokenFamilies / Policies / Grants / Usage
- `runtimeTokenFamilies.list(query?)`, `.revoke(familyId)`
- `runtimeTokenPolicies.list/create/get/update`
- `runtimeTokenGrants.revoke(grantId, input?)`
- `runtimeTokenUsage.get(query?)`

## deployments
- `create(agentId, input)` (alias of `agents.deploy`)
- `getProvisioning(deploymentId)`

## mcp
- `listCatalog()`, `createServer(input)`, `getServer(serverId)`, `updateServer(serverId, input)`
- `discoverTools(serverId)` — discovers tools for a **server definition**, not an installation
- `installServer(input)` — body must include **`serverDefinitionId`**
- `listInstallations()`, `updateInstallation`, `revokeInstallation`
- `listInstallationTools(installationId)`, `updateToolPolicy(installationId, toolId, input)`
- `preflightInvocation(installationId, toolName, input)`, `invokeTool(installationId, toolName, input)`
- `createCredentialBinding(installationId, input)`, `deleteCredentialBinding(bindingId)`
- `upsertAuthPolicy(installationId, input)`, `grantAccess(installationId, input)`

## knowledgeBases
Implemented methods (no generic list/get/update/delete helpers):
- `create(input)`, `uploadTextDocument(kbId, input)`, `retrieve(kbId, input)`, `provisionalAnswer(kbId, input)`
- Library: `createLibraryTextDocument`, `listLibraryDocuments`, `listLibraryDocumentFindings`, `linkLibraryDocument` (body: **`libraryDocumentId`**), `projectLibraryDocument`
- Sources / source-groups / ingestion-policies / governance / profiles / idocs-jobs: list/create/update/reprocess as implemented in `src/clients/knowledge-bases.ts`
- Retrieve body uses platform fields such as **`topK`**, `minScore`, `query` (not a generic `limit`-only schema)

## memory / intelligence
- `memory.listItems`, `getItem`, `retrieve`, `listCandidates`, `approveCandidate`, `rejectCandidate`, `disableItem`, `deleteItem`
- `intelligence.listSignals`, `listRollups`, `listImprovements`, `approveImprovement`, `rejectImprovement`

## approvals / usage (provisioning)
- `approvals.list()`, `approve(runId, approvalId)`, `reject(runId, approvalId)`
- `usage.getAgentUsage(query?)`

## runtime (`ZabyRuntime`)
- `runs.start(input)` → POST `/api/v1/agent-runtime/runs` — `{ input, requestId?, respondAsync? }` (`input` is opaque JSON)
- `runs.events(runId, query?)`, `runs.stream(runId, query?)` → SSE `.../aiui`
- `approvals.approve/reject`, `feedback.create`

## Notes
- Most bodies are typed `unknown` and forwarded as camelCase JSON.
- Responses are untyped objects — read fields like `runId`, `token`, `id` from the JSON.
- Do **not** invent `executableAgents`, `scoutAgents`, or `attachConnectedApp` — they are not part of this SDK surface.
