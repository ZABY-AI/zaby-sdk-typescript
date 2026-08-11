# Zaby TypeScript SDK

External **agent + runtime** SDK for Zaby (`@zaby-ai/sdk`).

This package is **not** a full backend or dashboard client. It wraps the managed-agent / Agentic OS surfaces needed to configure agents, mint disposable runtime tokens, and run/stream agents from your app.

## Scope

**In scope**
- Managed agents (provisioning API key path + optional tenant JWT agent routes)
- Deployments, external apps, disposable runtime tokens
- Runtime runs + AG-UI SSE streaming
- Knowledge bases, MCP tools, memory, intelligence, approvals, usage (agent-facing)

**Out of scope** (use the platform dashboard / internal `@zaby/api-client`, not this SDK)
- Admin / Customer apps
- Tenant control plane: billing, users, roles, org, branding, WhatsApp, meetings, support, FAQs
- GPA chat, BIA sessions, workflows, app-studio, file library
- API-key CRUD, credential vault lifecycle, public marketing APIs

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

## Provisioning client (`Zaby`)

Use a tenant API key only from trusted server code.

```ts
import { Zaby } from "@zaby-ai/sdk";

const zaby = new Zaby({
  apiKey: process.env.ZABY_API_KEY!,
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

Prefer `zaby.agents` / `externalApps` / `runtimeTokens` for integrations.  
`zaby.tenantAgents` is only the **managed-agent** JWT surface under `/api/v1/tenant/agents` — not the rest of tenant APIs.

## Runtime client (`ZabyRuntime`)

Use disposable runtime tokens in browser or untrusted contexts.

```ts
import { ZabyRuntime } from "@zaby-ai/sdk/runtime";

const runtime = new ZabyRuntime({ token: disposableRuntimeToken });

const run = await runtime.runs.start({
  input: "Help me onboard",
});

for await (const event of runtime.runs.stream(String(run.runId))) {
  console.log(event);
}
```

## Surfaces (agent SDK only)

```ts
zaby.agents.* / zaby.tenantAgents.*   // managed agents
zaby.externalApps.* / zaby.runtimeTokens.*
zaby.knowledgeBases.* / zaby.mcp.*
zaby.memory.* / zaby.intelligence.* / zaby.approvals.* / zaby.usage.*
runtime.runs.* / runtime.approvals.* / runtime.feedback.*
```

## E2E Smoke

```sh
ZABY_API_KEY=zaby_pk_... npm run test:e2e
```

## Development

```sh
npm install
npm test
npm run typecheck
npm run build
```

## Security

- `Zaby` → `X-Zaby-Api-Key` (server only)
- `ZabyRuntime` → `Authorization: Bearer <runtime-token>` (safe for clients)
