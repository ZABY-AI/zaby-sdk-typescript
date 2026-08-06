# First Agent

Provision an external app + agent + deployment + runtime token. All `Zaby` calls use the API key (server-side).

```ts
import { Zaby } from "@zaby-ai/sdk";

const zaby = new Zaby({ apiKey: process.env.ZABY_API_KEY! });

// 1. External app
const app = await zaby.externalApps.create({
  name: "Acme Web",
  slug: "acme-web",
  allowedOrigins: ["https://app.acme.com"],
});

// 2. Bind a deployment (so the app can run this agent)
await zaby.externalApps.bindDeployment(String(app.id), {
  deploymentId: process.env.ZABY_AGENT_DEPLOYMENT_ID!,
  allowBrowserRuntime: true,
});

// 3. Create + deploy an agent
const agent = await zaby.agents.create({
  name: "Support Agent",
  slug: "support-agent",
  // ...agent definition
});
await zaby.agents.deploy(String(agent.id), { /* deployment config */ });

// 4. Attach MCP tools / knowledge bases
await zaby.agents.attachMcpTool(String(agent.id), { installationId: "..." });
await zaby.agents.attachKnowledgeBase(String(agent.id), { knowledgeBaseId: "..." });

// 5. Mint a runtime token for a user
const token = await zaby.runtimeTokens.create({
  externalAppId: String(app.id),
  deploymentId: process.env.ZABY_AGENT_DEPLOYMENT_ID!,
  externalUserId: "user-123",
  ttlSeconds: 600,
  maxUses: 50,
});
```

## Agent operations
- `agents.create(input)` — create (provisioning)
- `tenantAgents.create(input)` — create with `kind` (`DEPLOYABLE`/`EXECUTABLE`/`INTERNAL`) and `communicationStyle`
- `tenantAgents.list(query)` / `tenantAgents.get(agentId)` — tenant-facing inventory
- `agents.attachMcpTool(agentId, input)` — attach an MCP tool installation
- `agents.attachKnowledgeBase(agentId, input)`
- `agents.attachSkill(agentId, input)`
- `agents.publish(agentId)` / `tenantAgents.publish(agentId)`
- `agents.deploy(agentId, input)` — creates a deployment
- `agents.testRun(agentId, input)` — dry run
- `agents.startRun(agentId, input)` — start a run directly against an agent
- `tenantAgents.testRun(agentId, { deploymentId, input })` — tenant test run
- `tenantAgents.listRuns(agentId)` / `listRunEvents(runId)` — run history
- `executableAgents.activate(agentId, { versionId, limits, observabilityMode })` — activate EXECUTABLE runtime
- `scoutAgents.activate(agentId, { versionId, limits, observabilityMode })` — activate INTERNAL (Scout) runtime
- `agents.playgroundRuntimeTokens(agentId)` — playground tokens
- `agents.getRunProgress(runId)`, `agents.listRunEvents(runId, query)` — observe runs

### Communication style on create
```ts
await zaby.tenantAgents.create({
  name: "Friendly Support",
  kind: "DEPLOYABLE",
  communicationStyle: {
    warmth: "HIGH", formality: "LOW", enthusiasm: "HIGH",
    directness: "LOW", humor: "HIGH", responseLength: "BALANCED",
  },
  instructions: "You are a friendly support agent.",
});
```

## Deployments
- `deployments.create(agentId, input)` (alias of `agents.deploy`)
- `deployments.getProvisioning(deploymentId)` — fetch deployment provisioning config

> The exact shape of `agent` create/deploy input is server-defined; the SDK types these as `unknown` intentionally. See the Zaby console / API reference for the current agent schema.
