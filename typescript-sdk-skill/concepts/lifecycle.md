# Lifecycle

A typical Zaby integration flows through these stages. All management calls use `Zaby` (API key); all run/stream calls use `ZabyRuntime` (runtime token).

```
1. PROVISION (Zaby, API key)
   externalApps.create → bindDeployment
   agents.create → deploy (deploymentId)
   mcp.installServer / installServer → createCredentialBinding (if creds needed)

2. MINT RUNTIME TOKEN (Zaby, API key)   [server-side, per user/session]
   runtimeTokens.create({ externalAppId, deploymentId, externalUserId, ttlSeconds, maxUses, quotaPolicyId })

3. RUN (ZabyRuntime, runtime token)     [browser/server]
   runs.start({ input }) → runs.stream(runId)  → AG-UI events
   (optional) approvals.approve / reject, feedback.create

4. OBSERVE / GOVERN (Zaby, API key)
   usage.getAgentUsage, approvals.list, runtimeTokenUsage.get, runtimeTokenPolicies.*
```

## Run event stream
`runs.stream(runId)` yields SSE `SseEvent` objects (`{ id?, event?, data }`) and **auto-stops on `RunFinished`**. Backed by the `/agent-runtime/runs/{runId}/aiui` SSE endpoint. This stream feeds AIUI (`aiui-core`/`aiui-react`) on the client.

## Token lifetime
A runtime token is disposable: bounded by `ttlSeconds` (absolute expiry) and `maxUses` (call count). Mint fresh ones server-side; the client may hold a `token` provider function that refreshes before expiry.

## Key IDs you need
- `externalAppId` — from `externalApps.create`/`.get`/`.list`
- `deploymentId` — from `agents.deploy` (a deployment of an agent)
- `quotaPolicyId` — from `runtimeTokenPolicies.create`/`.list` (optional but recommended)
- `agentId` / `runId` — from agent and run operations
