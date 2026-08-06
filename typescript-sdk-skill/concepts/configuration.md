# Configuration

Global config is set once via `configureZaby` and/or environment variables. It can also be overridden per-client via the `config` option.

```ts
import { configureZaby } from "@zaby-ai/sdk";

configureZaby({
  environment: "production",   // "production" | "staging" | "local" | custom string
  apiOrigin: "https://genapi.zaby.io",
  timeoutMs: 30_000,
  retries: 2,                  // number | RetryPolicy
  // fetch: customFetch,       // inject a FetchLike impl (e.g. for Node <18 or edge)
  // userAgent: "my-app/1.0",
});
```

## `ZabyGlobalConfig`
| Field | Type | Default | Notes |
|-------|------|---------|-------|
| `environment` | `string` | `"production"` | `"local"` → `http://localhost:9080` |
| `apiOrigin` | `string` | origin per env | trailing slashes stripped |
| `timeoutMs` | `number` | `30_000` | per-request timeout |
| `retries` | `number \| RetryPolicy` | `0` (no retry) | see below |
| `fetch` | `FetchLike` | `globalThis.fetch` | must exist or SDK throws |
| `userAgent` | `string` | — | sent if provided |

## RetryPolicy
```ts
type RetryPolicy = {
  attempts?: number;
  retryMethods?: string[];          // default ["GET","HEAD","OPTIONS"]
  retryStatuses?: number[];         // default [408,429,500,502,503,504]
  backoffMs?: (attempt: number) => number; // default exponential cap 1000ms
};
```
Passing a `number` N expands to: `attempts: N`, retry GET/HEAD/OPTIONS on 408/429/5xx, exponential backoff capped at 1s.

## Environment variables
- `ZABY_ENVIRONMENT`
- `ZABY_API_ORIGIN`
Precedence: explicit `config` overrides `globalConfig` (from `configureZaby`) overrides env vars.

## Per-client override
```ts
new Zaby({ apiKey, config: { timeoutMs: 10_000 } });
```

## API origins
- Production: `https://genapi.zaby.io`
- Local: `http://localhost:9080`
