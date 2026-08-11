# Workflow: Error Handling

## Pattern
Wrap management and runtime calls; branch on error type. Errors are in `@zaby-ai/sdk/errors`.

```ts
import { ZabyApiError, ZabyStreamError, ZabyConfigError } from "@zaby-ai/sdk/errors";

try {
  await zaby.runtimeTokens.create({ /* ... */ });
} catch (err) {
  if (err instanceof ZabyApiError) {
    switch (err.status) {
      case 401: /* bad API key */ break;
      case 403: /* scope/origin */ break;
      case 422: /* invalid input — inspect err.body */ break;
      default: /* log err.status, err.body */ break;
    }
  } else if (err instanceof ZabyConfigError) {
    // missing fetch / bad config
  } else {
    throw err;
  }
}

try {
  for await (const ev of runtime.runs.stream(runId)) { /* ... */ }
} catch (err) {
  if (err instanceof ZabyStreamError) {
    // SSE dropped mid-run — show retry/resume in UI
  } else throw err;
}
```

## Retries (config)
The SDK retries only **GET/HEAD/OPTIONS** on `408, 429, 500, 502, 503, 504` when `retries > 0` (see `concepts/configuration.md`). POST/stream calls are **not** auto-retried — retry them in your own code (with backoff), and prefer resuming a run rather than restarting.

## 401 on the runtime stream = credential issue, not AIUI
If `runs.stream` (or the AIUI agent) emits `Streamable HTTP error ... Authentication failed: Unable to verify your user identity`, that is an **MCP credential** problem (see `workflows/mcp.md`), not a front-end problem. AIUI only transports the event.

## Timeouts
Set `timeoutMs` globally (`configureZaby`) or per-client (`config`). Pass `signal` (`RequestOptions`) to abort individual calls/streams.

## Observability
- `zaby.usage.getAgentUsage({ agentId, from, to })`
- `zaby.runtimeTokenUsage.get(query?)`
- `zaby.approvals.list()`
- `zaby.health.check()` (liveness)

## Best practices
- Never catch-and-swallow; at minimum log `err.status` + `err.body`.
- For chat UIs, surface `RunError` and `ZabyStreamError` to the user with a retry affordance.
- Mint runtime tokens with tight `ttlSeconds`/`maxUses`; rotate/`revokeFamily` on logout.
- In a React UI, let `createRuntimeTokenManager` remint on 401 expired/exhausted (`workflows/aiui-frontend.md`).
