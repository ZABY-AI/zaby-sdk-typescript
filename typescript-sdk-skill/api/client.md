# Client API

## `Zaby` (API-key management client)
```ts
import { Zaby } from "@zaby-ai/sdk";
const zaby = new Zaby({
  apiKey: string | (() => string | Promise<string>),
  accessToken?: string | (() => string | Promise<string>),
  tenantId?: string,                 // sends X-Tenant-ID header (tenant-scoped APIs)
  transport?: ZabyTransport,
  config?: ZabyGlobalConfig,
});
```

### Properties (clients)
| Client | Purpose |
|--------|---------|
| `zaby.health` | `check()` → GET `/health` |
| `zaby.agents` | provisioning agents + runs + approvals |
| `zaby.tenantAgents` | **tenant agent lifecycle** (list/get/create/update/delete, publish, deploy, test-runs, runs, approvals, attachments) |
| `zaby.executableAgents` | **executable agents** (list/create/get/activate/disable/runs/steps/usage) |
| `zaby.scoutAgents` | **scout (INTERNAL) agents** (list/create/get/activate/disable/runs/steps/usage) |
| `zaby.deployments` | deployments |
| `zaby.externalApps` | external apps |
| `zaby.runtimeTokens` | mint/rotate/revoke runtime tokens |
| `zaby.runtimeTokenFamilies` | list/revoke families |
| `zaby.runtimeTokenPolicies` | quota policies |
| `zaby.runtimeTokenGrants` | revoke grants |
| `zaby.runtimeTokenUsage` | token usage |
| `zaby.knowledgeBases` | knowledge bases |
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

`runs.stream(runId)` is an **async generator** yielding `SseEvent` and stops automatically at `RunFinished`.

## Request options
All client methods accept an optional `RequestOptions`:
```ts
type RequestOptions = { requestId?: string; signal?: AbortSignal };
```
Use `signal` to abort a request/stream.

## `configureZaby`
Global config (see `concepts/configuration.md`):
```ts
configureZaby({ environment, apiOrigin, timeoutMs, retries, fetch, userAgent, tenantId });
```
