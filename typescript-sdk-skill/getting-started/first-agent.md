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

// 3. Create + publish + deploy an agent (or reuse an existing deployment id)
const agent = await zaby.agents.create({
  name: "Support Agent",
  slug: "support-agent",
  instructions: "You are a helpful support agent.",
  category: "SUPPORT",
  visibility: "PRIVATE",
});
const published = await zaby.agents.publish(String(agent.id));
const deployment = await zaby.agents.deploy(String(agent.id), {
  agentVersionId: String(published.id ?? published.agentVersionId),
  environment: "TEST",
});

// 4. Attach MCP tools / knowledge bases (optional)
await zaby.agents.attachMcpTool(String(agent.id), {
  tenantInstallationId: "...",
  toolDefinitionId: "...",
});
await zaby.agents.attachKnowledgeBase(String(agent.id), {
  knowledgeBaseId: "...",
});

// 5. Mint a runtime token for a user (uniqueId or externalUserId required)
const token = await zaby.runtimeTokens.create({
  externalAppId: String(app.id),
  deploymentId: String(deployment.id ?? process.env.ZABY_AGENT_DEPLOYMENT_ID!),
  externalUserId: "user-123",
  ttlSeconds: 600,
  maxUses: 50,
});
```

## Agent operations
- `agents.create(input)` — provisioning create (`slug`, `name`, `instructions?`, `category?`, …)
- `tenantAgents.*` — same lifecycle under `/api/v1/tenant/agents` (needs tenant JWT)
- `agents.attachMcpTool` / `attachKnowledgeBase` / `attachSkill`
- `agents.publish` / `agents.deploy` / `deployments.getProvisioning`
- `agents.testRun` / `agents.startRun`
- `agents.playgroundRuntimeTokens(agentId, input)` — **POST** with mint body
- `agents.getRunProgress` / `listRunEvents`

## Deployments
- `deployments.create(agentId, input)` (alias of `agents.deploy`)
- `deployments.getProvisioning(deploymentId)`

## Next: product UI
Minting the token is not enough for a chat page. Wire `@zaby-ai/aiui-core` + `@zaby-ai/aiui-react` (`workflows/aiui-frontend.md`).

> Most create/deploy bodies are typed `unknown` and forwarded as camelCase JSON. Prefer the OpenAPI docs at the gateway when unsure.
