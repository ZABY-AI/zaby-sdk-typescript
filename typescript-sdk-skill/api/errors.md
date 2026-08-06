# Errors

The SDK throws typed errors (from `@zaby-ai/sdk/errors`). The transport wraps non-2xx responses into a Zaby API error; streams throw `ZabyStreamError`.

## Error classes
- `ZabyApiError` — API/HTTP error. Carries `status`, `message`, and parsed `body` (often `{ code, message, errors }`).
- `ZabyStreamError` — thrown while consuming `runs.stream` (e.g. SSE connection dropped). Carries `status` + `message`.
- `ZabyConfigError` — config/setup error (e.g. missing `fetch`).

## Handling
```ts
import { ZabyApiError, ZabyStreamError } from "@zaby-ai/sdk/errors";

try {
  const token = await zaby.runtimeTokens.create({ /* ... */ });
} catch (err) {
  if (err instanceof ZabyApiError) {
    console.error(err.status, err.message, err.body);
    // 401 → bad API key; 422 → invalid input (check RuntimeTokenCreateInput fields)
  } else {
    throw err;
  }
}

try {
  for await (const ev of runtime.runs.stream(runId)) { /* ... */ }
} catch (err) {
  if (err instanceof ZabyStreamError) {
    // SSE interrupted mid-run; surface to UI, allow retry/resume
  }
}
```

## Common status codes
| Status | Meaning | Action |
|--------|---------|--------|
| 401 | Missing/invalid API key or runtime token | check `x-zaby-api-key` / `Bearer` token |
| 403 | Forbidden (scope/origin) | check `allowedOrigins`, token scopes |
| 422 | Invalid input | validate `RuntimeTokenCreateInput` / method input shape |
| 408 / 429 / 5xx | Transient | SDK retries GET/HEAD/OPTIONS if `retries > 0` (see `concepts/configuration.md`) |

## Stream safety
`runs.stream` catches underlying transport errors and re-throws as `ZabyStreamError`; a non-`ZabyStreamError` is wrapped. Always `break`/stop on `RunFinished` (the generator does this for you).

## Aborting
Pass `signal` via `RequestOptions` to cancel an in-flight request or stream:
```ts
const ctrl = new AbortController();
runtime.runs.stream(runId, undefined, { signal: ctrl.signal });
// later: ctrl.abort();
```
