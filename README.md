# Zaby TypeScript SDK

TypeScript SDK for the Zaby Agentic OS.

The SDK focuses on the APIs needed to configure, deploy, run, observe, and govern agentic systems:

- managed agents
- deployments
- external apps
- disposable runtime tokens
- browser/server runtime runs
- knowledge bases
- MCP tools
- memory
- intelligence and improvement loops
- approvals
- usage

It intentionally does not expose general tenant modules such as billing, users, organization, meetings, support, FAQs, WhatsApp, API-key management, or credential lifecycle management.

## Install

```sh
npm install @zaby-ai/sdk
```

## Configure

Production defaults to `https://genapi.zaby.io`.

```ts
import { configureZaby } from "@zaby-ai/sdk";

configureZaby({
  environment: "production",
});
```

For private staging or dedicated tenant gateways, pass an explicit API origin through your application config.

## Server SDK

Use tenant API keys only from trusted backend code.

```ts
import { Zaby } from "@zaby-ai/sdk";

const zaby = new Zaby({
  apiKey: process.env.ZABY_API_KEY!,
  // Optional: required for tenant Agentic OS management APIs.
  accessToken: process.env.ZABY_TENANT_ACCESS_TOKEN,
});

const app = await zaby.externalApps.create({
  name: "Acme Web",
  slug: "acme-web",
  allowedOrigins: ["https://app.acme.com"],
});

await zaby.externalApps.bindDeployment(String(app.id), {
  deploymentId: process.env.ZABY_AGENT_DEPLOYMENT_ID!,
  allowBrowserRuntime: true,
  allowApprovals: true,
});

const token = await zaby.runtimeTokens.create({
  externalAppId: String(app.id),
  deploymentId: process.env.ZABY_AGENT_DEPLOYMENT_ID!,
  externalUserId: "user_123",
  externalSessionId: "session_456",
  ttlSeconds: 600,
  maxUses: 20,
});
```

## Runtime SDK

Use disposable runtime tokens in browser or untrusted runtime contexts.

```ts
import { ZabyRuntime } from "@zaby-ai/sdk/runtime";

const runtime = new ZabyRuntime({ token: disposableRuntimeToken });

const run = await runtime.runs.start({
  input: { message: "Help me onboard" },
});

for await (const event of runtime.runs.stream(String(run.runId))) {
  console.log(event);
}
```

## Agentic OS Surfaces

```ts
zaby.agents.create(...)
zaby.agents.attachKnowledgeBase(...)
zaby.agents.attachMcpTool(...)
zaby.agents.publish(...)
zaby.agents.deploy(...)

zaby.externalApps.create(...)
zaby.externalApps.bindDeployment(...)
zaby.runtimeTokens.create(...)
zaby.runtimeTokens.recordFeedback(...)

zaby.knowledgeBases.create(...)
zaby.knowledgeBases.uploadTextDocument(...)
zaby.knowledgeBases.createLibraryTextDocument(...)
zaby.knowledgeBases.listLibraryDocuments(...)
zaby.knowledgeBases.linkLibraryDocument(...)
zaby.knowledgeBases.createSource(...)
zaby.knowledgeBases.createIngestionPolicy(...)
zaby.knowledgeBases.listJobs(...)

zaby.mcp.createServer(...)
zaby.mcp.discoverTools(...)
zaby.mcp.installServer(...)
zaby.mcp.preflightInvocation(...)
zaby.mcp.invokeTool(...)

zaby.memory.retrieve(...)
zaby.memory.approveCandidate(...)
zaby.intelligence.listSignals(...)
zaby.intelligence.approveImprovement(...)
zaby.approvals.approve(...)
zaby.usage.getAgentUsage(...)
```

## E2E Smoke

Authenticated smoke tests require tenant credentials:

```sh
ZABY_API_KEY=zaby_pk_... npm run test:e2e
```

Optional overrides:

```sh
ZABY_API_ORIGIN=https://genapi.zaby.io npm run test:e2e
```

## Terminal Agentic Chat

Run a full terminal chat UI powered by the SDK:

```sh
npm run example:chat
```

Use one of these auth modes:

```sh
ZABY_RUNTIME_TOKEN=<disposable-runtime-token> npm run example:chat
```

or mint disposable runtime tokens from the server-side SDK:

```sh
ZABY_API_KEY=zaby_pk_... \
ZABY_EXTERNAL_APP_ID=<external-app-id> \
ZABY_AGENT_DEPLOYMENT_ID=<deployment-id> \
npm run example:chat
```

Optional:

```sh
ZABY_API_ORIGIN=https://genapi.zaby.io npm run example:chat
```

Inside the TUI:

- `/help` shows commands
- `/clear` clears the transcript
- `/exit` quits
- `Esc` quits

## Development

```sh
npm install
npm test
npm run typecheck
npm run build
```

## Security Boundary

`Zaby` is server-side and sends `X-Zaby-Api-Key`.

`ZabyRuntime` is browser-safe and sends only short-lived `Authorization: Bearer <runtime-token>` credentials.
