# Authentication

The SDK has two auth models.

## 1. API key (tenant) — `Zaby`
Used for **management** APIs. Sent as the `x-zaby-api-key` header.

```ts
import { Zaby } from "@zaby-ai/sdk";
const zaby = new Zaby({ apiKey: process.env.ZABY_API_KEY! });
```
- `apiKey` accepts a `string` or a `() => string | Promise<string>` provider (e.g. read from a secret store lazily).
- **Server-only.** Never expose to the browser.

## Tenant-scoped access — `tenantId`
Managed-agent JWT routes (`tenantAgents`) may need tenant context. Pass `tenantId` in the constructor (or `configureZaby`) — it is sent as the `X-Tenant-ID` header. This is **not** access to the full tenant control plane (billing, users, org, …).

```ts
const zaby = new Zaby({
  apiKey: process.env.ZABY_API_KEY!,
  accessToken: process.env.ZABY_TENANT_ACCESS_TOKEN!,  // optional; Bearer for tenantAgents
  tenantId: process.env.ZABY_TENANT_ID!,
});
```

## 2. Runtime token (short-lived) — `ZabyRuntime`
Used for **run/stream** operations. Sent as `Authorization: Bearer <token>`.

```ts
import { ZabyRuntime } from "@zaby-ai/sdk/runtime";
const runtime = new ZabyRuntime({ token: process.env.ZABY_RUNTIME_TOKEN! });
```
- `token` accepts a `string` or `() => string | Promise<string>` provider (e.g. a cached getter that refreshes before expiry).
- Minted server-side via `zaby.runtimeTokens.create(...)` (see `workflows/runtime-token.md`).

## Header assembly (from source)
- `Zaby` → `{ "x-zaby-api-key": <key> }`, plus `authorization: Bearer <accessToken>` if `accessToken` provided, plus `x-tenant-id: <tenantId>` if `tenantId` provided.
- `ZabyRuntime` → `{ authorization: "Bearer <token>" }`.

## Why two?
The tenant API key is powerful and long-lived — it must stay server-side. The browser only ever holds a disposable runtime token (TTL + maxUses bounded), minted per user/session. This is the same split the AIUI front-end relies on (`ZabyRuntimeAgent` consumes the runtime token).

## Providers
All three provider types (`ZabyApiKeyProvider`, `ZabyAccessTokenProvider`, `ZabyRuntimeTokenProvider`) are `string | (() => MaybePromise<string>)`. Use the function form for lazy/rotating secrets.
