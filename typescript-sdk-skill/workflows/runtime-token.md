# Workflow: Runtime Token Minting

Runtime tokens are the **only** credential you send to the browser. Mint them server-side with the tenant API key.

## Mint (server)
```ts
import { Zaby } from "@zaby-ai/sdk";

const zaby = new Zaby({ apiKey: process.env.ZABY_API_KEY! });

const token = await zaby.runtimeTokens.create({
  externalAppId: process.env.ZABY_EXTERNAL_APP_ID!,   // from externalApps.create
  deploymentId: process.env.ZABY_AGENT_DEPLOYMENT_ID!,
  quotaPolicyId: process.env.ZABY_QUOTA_POLICY_ID!,   // optional but recommended
  externalUserId: "user-123",                          // stable per end user
  externalSessionId: "sess-456",
  ttlSeconds: 600,                                     // absolute expiry
  maxUses: 50,                                         // call cap
  channel: "web",
});
// token.token, token.expiresAt, token.remainingUses, token.tokenFamilyId
```

## Token lifecycle rules
- `ttlSeconds` = absolute lifetime. `maxUses` = total calls allowed.
- There is **no** separate OAuth refresh token. Refresh = remint or `rotate` / `rotateByUniqueId`.
- Mint a fresh token per user/session; never reuse across users.
- `rotateAfterSeconds` hints when to rotate. `revokeFamily(tokenFamilyId, { reason })` kills a whole family (logout-all).

## Client-side refresh (AIUI — required for a product UI)
Use `createRuntimeTokenManager` from `@zaby-ai/aiui-core`. It remints when `expiresAt` is within `refreshSkewMs` or `remainingUses` drops below `minRemainingUses`. Pass `tokenManager.provider` into your `AbstractAgent` subclass (`workflows/aiui-frontend.md`).

```ts
import { createRuntimeTokenManager } from "@zaby-ai/aiui-core";

const tokenManager = createRuntimeTokenManager({
  refreshSkewMs: 30_000,
  minRemainingUses: 2,
  mint: async () => {
    const res = await fetch("/api/runtime-token", { method: "POST", cache: "no-store" });
    return res.json(); // { token, expiresAt, remainingUses, rotateAfterSeconds }
  },
});
```

Server rotate (optional, instead of a new mint):

```ts
const rotated = await zaby.runtimeTokens.rotate({ previousToken });
```

## Headless / server token provider
`ZabyRuntime` also accepts `token: string | () => Promise<string>` for scripts and backends. That is **not** a React chat UI.

## Policy
Attach a `quotaPolicyId` (from `runtimeTokenPolicies.create`/`.list`) to bound quotas. List/inspect via `runtimeTokenPolicies.*` and `runtimeTokenUsage.get`.

## Gotchas
- 422 on `create` → a required field is missing/wrong (`externalAppId`, `deploymentId` are required).
- 401 → bad API key (server) — never the runtime token (that's used by `ZabyRuntime`, not `create`).
- The browser must only ever see `token.token`, never `ZABY_API_KEY`.
