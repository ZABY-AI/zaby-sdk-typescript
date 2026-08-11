# Lifecycle

A typical Zaby integration flows through these stages. All management calls use `Zaby` (API key); all run/stream calls use `ZabyRuntime` (runtime token).

```
1. PROVISION (Zaby, API key)
   externalApps.create → bindDeployment
   agents.create → deploy (deploymentId)
   mcp.installServer / installServer → createCredentialBinding (if creds needed)

2. MINT RUNTIME TOKEN (Zaby, API key)   [server-side, per user/session]
   runtimeTokens.create({ externalAppId, deploymentId, externalUserId, ttlSeconds, maxUses, quotaPolicyId })

3. RUN
   Headless: ZabyRuntime.runs.start → runs.stream(runId)
   Product UI: aiui-core token manager → AbstractAgent → POST {runtimeUrl}/run/aiui
              → EventDecoder → useAgentChat (@zaby-ai/aiui-react)

4. OBSERVE / GOVERN (Zaby, API key)
   usage.getAgentUsage, approvals.list, runtimeTokenUsage.get, runtimeTokenPolicies.*
```

## Run event stream
`runs.stream(runId)` yields SSE `SseEvent` objects (`{ id?, event?, data }`) and **auto-stops on `RunFinished`**. Backed by `/agent-runtime/runs/{runId}/aiui`. Product UIs do not call this — they POST `{runtimeUrl}/run/aiui` and decode with `EventDecoder` (`workflows/aiui-frontend.md`).

## Token lifetime
A runtime token is disposable: bounded by `ttlSeconds` and `maxUses`. There is no separate refresh token. In the browser use `createRuntimeTokenManager` from `@zaby-ai/aiui-core`; on the server remint or `runtimeTokens.rotate({ previousToken })`.

## Key IDs you need
- `externalAppId` — from `externalApps.create`/`.get`/`.list`
- `deploymentId` — from `agents.deploy` (a deployment of an agent)
- `quotaPolicyId` — from `runtimeTokenPolicies.create`/`.list` (optional but recommended)
- `agentId` / `runId` — from agent and run operations
