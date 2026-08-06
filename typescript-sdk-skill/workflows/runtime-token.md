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
- Mint a fresh token per user/session; never reuse across users.
- For refresh, either mint a new one, or use `rotate` / `rotateByUniqueId` (by `uniqueId` you control). `rotateAfterSeconds` hints when to rotate.
- `revokeFamily(tokenFamilyId, { reason })` kills a whole family (logout-all).

## Client-side token provider (recommended)
Hold the token in a provider function so it refreshes before expiry:
```ts
let cache: { token: string; expiresAt: number } | null = null;

async function getRuntimeToken(): Promise<string> {
  if (cache && cache.expiresAt - Date.now() > 120_000) return cache.token;
  const res = await fetch("/api/zaby/runtime-token", { method: "POST" });
  const data = await res.json();
  cache = { token: data.token, expiresAt: new Date(data.expiresAt).getTime() };
  return cache.token;
}

// Pass to ZabyRuntime or AIUI ZabyRuntimeAgent:
new ZabyRuntime({ token: getRuntimeToken });
```

## Policy
Attach a `quotaPolicyId` (from `runtimeTokenPolicies.create`/`.list`) to bound quotas. List/inspect via `runtimeTokenPolicies.*` and `runtimeTokenUsage.get`.

## Gotchas
- 422 on `create` → a required field is missing/wrong (`externalAppId`, `deploymentId` are required).
- 401 → bad API key (server) — never the runtime token (that's used by `ZabyRuntime`, not `create`).
- The browser must only ever see `token.token`, never `ZABY_API_KEY`.
