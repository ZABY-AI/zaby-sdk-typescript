# Quickstart

Two halves: **mint a runtime token** (server) and **stream a run** (browser/server).

**Fastest path:** `rapid-prototype.md` — copy-paste a full Next.js chat in 5 minutes.

## 1. Mint a runtime token (server-side)
```ts
import { Zaby } from "@zaby-ai/sdk";

const zaby = new Zaby({ apiKey: process.env.ZABY_API_KEY! });

const token = await zaby.runtimeTokens.create({
  externalAppId: process.env.ZABY_EXTERNAL_APP_ID!,
  deploymentId: process.env.ZABY_AGENT_DEPLOYMENT_ID!,
  externalUserId: "example-user",
  externalSessionId: "example-session",
  ttlSeconds: 600,
  maxUses: 20,
});
console.log(token.token, token.expiresAt);
```
Returns `RuntimeTokenResponse` (`token`, `tokenType: "Bearer"`, `expiresAt`, `scopes`, `grantId`, `tokenFamilyId`, `quotaPolicyId`, `remainingUses`, …).

## 2. Stream a run (browser/server)
```ts
import { ZabyRuntime } from "@zaby-ai/sdk/runtime";

const runtime = new ZabyRuntime({ token: process.env.ZABY_RUNTIME_TOKEN! });

const run = await runtime.runs.start({ input: { message: "Hello from the Zaby TypeScript SDK" } });
const runId = (run as { runId: string }).runId;

for await (const event of runtime.runs.stream(runId)) {
  console.log(event.event, event.data);
  // event.data.type === "RunFinished" ends the loop automatically
}
```

## Wire to a chat UI
Do **not** hand `token.token` to a raw `EventSource` or invent a `ZabyRuntimeAgent` import.

Product UI:

1. Keep `@zaby-ai/sdk` on the server (`/api/runtime-token` above).
2. In the browser, `createRuntimeTokenManager` from `@zaby-ai/aiui-core` remints before TTL / maxUses.
3. Subclass `AbstractAgent` from `@zaby-ai/aiui-react`, `POST {runtimeUrl}/run/aiui` with `Authorization: Bearer <token>`, decode with `EventDecoder`, pass the agent to `useAgentChat`.

Full copy-paste: `workflows/aiui-frontend.md`.

## Minimal Next.js token route
```ts
// app/api/zaby/runtime-token/route.ts
import { Zaby } from "@zaby-ai/sdk";
const zaby = new Zaby({ apiKey: process.env.ZABY_API_KEY! });
export async function POST() {
  const t = await zaby.runtimeTokens.create({
    externalAppId: process.env.ZABY_EXTERNAL_APP_ID!,
    deploymentId: process.env.ZABY_AGENT_DEPLOYMENT_ID!,
    quotaPolicyId: process.env.ZABY_QUOTA_POLICY_ID!,
    externalUserId: "user-123",
    ttlSeconds: 600,
    maxUses: 50,
  });
  return Response.json({ token: t.token, expiresAt: t.expiresAt });
}
```
