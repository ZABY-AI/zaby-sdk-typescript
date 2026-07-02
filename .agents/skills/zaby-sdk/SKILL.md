# Zaby TypeScript SDK

TypeScript SDK for the [Zaby Agentic OS](https://github.com/ZABY-AI/zaby-sdk-typescript). Provides both a **Server SDK** (`Zaby`) for managing agents, deployments, knowledge bases, MCP servers, and runtime tokens, and a **Runtime SDK** (`ZabyRuntime`) for starting and streaming agent runs.

---

## Install & Configure

```sh
npm install @zaby-ai/sdk
```

```ts
import { configureZaby } from "@zaby-ai/sdk";

configureZaby({ environment: "production" });
```

## Entry Points

### `Zaby` — Server SDK

| Property | Client | Key Methods |
|----------|--------|-------------|
| `zaby.agents` | `AgentsClient` | `create`, `publish`, `deploy`, `startRun`, `testRun`, `attachMcpTool`, `attachKnowledgeBase`, `attachSkill`, `getRunProgress`, `listRunEvents`, `playgroundRuntimeTokens` |
| `zaby.deployments` | `DeploymentsClient` | `create`, `getProvisioning` |
| `zaby.externalApps` | `ExternalAppsClient` | `list`, `create`, `get`, `update`, `bindDeployment` |
| `zaby.runtimeTokens` | `RuntimeTokensClient` | `create`, `rotate`, `rotateByUniqueId`, `revokeFamily`, `recordFeedback` |
| `zaby.runtimeTokenFamilies` | `RuntimeTokenFamiliesClient` | `list`, `revoke` |
| `zaby.runtimeTokenPolicies` | `RuntimeTokenPoliciesClient` | `list`, `create`, `get`, `update` |
| `zaby.runtimeTokenGrants` | `RuntimeTokenGrantsClient` | `revoke` |
| `zaby.runtimeTokenUsage` | `RuntimeTokenUsageClient` | `get` |
| `zaby.knowledgeBases` | `KnowledgeBasesClient` | `create`, `retrieve`, `provisionalAnswer`, upload text/library documents, manage sources/source-groups/profiles/ingestion-policies/jobs |
| `zaby.mcp` | `McpClient` | `listCatalog`, `createServer`, `getServer`, `updateServer`, `discoverTools`, `installServer`, `listInstallations`, `invokeTool`, `preflightInvocation`, `grantAccess` |
| `zaby.memory` | `MemoryClient` | `listItems`, `getItem`, `retrieve`, `listCandidates`, `approveCandidate`, `rejectCandidate`, `disableItem`, `deleteItem` |
| `zaby.intelligence` | `IntelligenceClient` | `listSignals`, `listRollups`, `listImprovements`, `approveImprovement`, `rejectImprovement` |
| `zaby.approvals` | `ApprovalsClient` | `list`, `approve`, `reject` |
| `zaby.usage` | `UsageClient` | `getAgentUsage` |
| `zaby.health` | `HealthClient` | `check` |

```ts
import { Zaby } from "@zaby-ai/sdk";

const zaby = new Zaby({ apiKey: process.env.ZABY_API_KEY! });

const app = await zaby.externalApps.create({ name: "Acme Web", slug: "acme-web" });
const deployment = await zaby.deployments.create(agentId, { externalAppId: app.id });
const tool = await zaby.mcp.invokeTool(installationId, "get_weather", { city: "SF" });
```

### `ZabyRuntime` — Runtime SDK

```ts
import { ZabyRuntime } from "@zaby-ai/sdk/runtime";

const runtime = new ZabyRuntime({ token: "disposable_token" });
const run = await runtime.runs.start({ input: { message: "Hello" } });
for await (const event of runtime.runs.stream(String(run.runId))) {
  console.log(event);
}
```

| Property | Client | Key Methods |
|----------|--------|-------------|
| `runtime.runs` | `RuntimeRunsClient` | `start`, `events`, `stream` (SSE via `parseSseResponse`) |
| `runtime.approvals` | `RuntimeApprovalsClient` | `approve`, `reject` |
| `runtime.feedback` | `RuntimeFeedbackClient` | `create` |

---

## Key Types

- **`SseEvent`** — `id`, `event`, `data`; returned by `runtime.runs.stream()`
- **`RequestOptions`** — `requestId`, `signal` (for cancellation)
- **`RetryPolicy`** — `attempts`, `retryMethods`, `retryStatuses`, `backoffMs`
- **`RuntimeTokenResponse`** — `token`, `tokenType`, `expiresAt`, `scopes`, `grantId`, `tokenFamilyId`, `quotaPolicyId`, `uniqueIdHash`, `rotateAfterSeconds`, `remainingUses`, `agentSessionId`
- **`ListResponse`** — `items`, `page`, `limit`, `total`
- **`MockResponse`** / **`MockTransport`** — test utilities (`@zaby-ai/sdk/testing`)

---

## Error Hierarchy

```
ZabyApiError
├── ZabyAuthError              (401)
│   └── ZabyRuntimeTokenExpiredError
├── ZabyPermissionError        (403)
│   └── ZabyRuntimeTokenExhaustedError
├── ZabyValidationError        (400, 422)
├── ZabyRateLimitError         (429)
├── ZabyStreamError
```

Error fields: `.status`, `.message`, `.code`, `.requestId`, `.retryAfter`, `.details`

---

## Configuration

```ts
import { configureZaby } from "@zaby-ai/sdk";

configureZaby({
  environment: "local",           // "production" | "local"
  apiOrigin: "http://localhost:9080",
  timeoutMs: 30_000,
  retries: 3,                     // number or RetryPolicy
  userAgent: "my-app/1.0",
});
```

Or via env vars: `ZABY_ENVIRONMENT`, `ZABY_API_ORIGIN`.

---

## Knowledge Base Text Documents

`uploadTextDocument` and `createLibraryTextDocument` accept legacy field aliases:

- `text` → mapped to `content`
- `name` → mapped to `title`
- If `title` is missing, first 50 chars of `content` are used (or `"Untitled"`)

---

## Testing

```ts
import { MockTransport } from "@zaby-ai/sdk/testing";
import { Zaby } from "@zaby-ai/sdk";

const transport = new MockTransport([
  { method: "GET", path: "/health", json: { status: "ok" } },
]);
const zaby = new Zaby({ apiKey: "test", transport });
```

---

## Client Method Convention

- Optional `RequestOptions` on most methods (`requestId`, `signal`)
- Server methods return parsed JSON (`Promise<unknown>`)
- Runtime `stream()` stops at `RunFinished` and wraps parse failures in `ZabyStreamError`
- Path segments are URL-encoded via `encodePath()`
