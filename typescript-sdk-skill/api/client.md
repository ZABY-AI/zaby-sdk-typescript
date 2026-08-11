# Client API

This SDK exposes **agent + runtime** surfaces only — not Admin/Customer apps or general tenant modules (billing, users, WhatsApp, …).

## `Zaby` (provisioning / API-key client)
```ts
import { Zaby } from "@zaby-ai/sdk";
const zaby = new Zaby({
  apiKey: string | (() => string | Promise<string>),
  accessToken?: string | (() => string | Promise<string>),
  tenantId?: string,                 // X-Tenant-ID (also honored from configureZaby({ tenantId }))
  transport?: ZabyTransport,
  config?: ZabyGlobalConfig,
});
```

### Properties (clients)
| Client | Purpose |
|--------|---------|
| `zaby.health` | `check()` → GET `/health` |
| `zaby.agents` | **Preferred** — provisioning managed agents |
| `zaby.tenantAgents` | Managed-agent JWT routes only (`/api/v1/tenant/agents`) — not other `/tenant/*` APIs |
| `zaby.deployments` | deployments + provisioning metadata |
| `zaby.externalApps` | external apps + bind deployment |
| `zaby.runtimeTokens` | mint/rotate/revoke runtime tokens + feedback |
| `zaby.runtimeTokenFamilies` | list/revoke families |
| `zaby.runtimeTokenPolicies` | quota policies |
| `zaby.runtimeTokenGrants` | revoke grants |
| `zaby.runtimeTokenUsage` | token usage |
| `zaby.knowledgeBases` | knowledge bases + library |
| `zaby.mcp` | MCP servers/installations/tools/credentials |
| `zaby.memory` | memory |
| `zaby.intelligence` | intelligence/improvement loops |
| `zaby.approvals` | list/approve/reject (provisioning) |
| `zaby.usage` | agent usage |

## `ZabyRuntime` (runtime-token run client)
```ts
import { ZabyRuntime } from "@zaby-ai/sdk/runtime";
const runtime = new ZabyRuntime({
  token: string | (() => string | Promise<string>),
  transport?: ZabyTransport,
  config?: ZabyGlobalConfig,
});
```
### Properties
| Client | Purpose |
|--------|---------|
| `runtime.runs` | `start(input)`, `events(runId, query?)`, `stream(runId, query?)` (async iterator) |
| `runtime.approvals` | `approve(runId, approvalId)`, `reject(runId, approvalId)` |
| `runtime.feedback` | `create(runId, input)` |

`runs.stream(runId)` yields `SseEvent` and stops at `RunFinished`.

## Request options
```ts
type RequestOptions = { requestId?: string; signal?: AbortSignal };
```

## `configureZaby`
```ts
configureZaby({ environment, apiOrigin, timeoutMs, retries, fetch, userAgent, tenantId });
```
