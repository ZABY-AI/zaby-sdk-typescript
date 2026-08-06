# Quickstart

Two halves: **mint a runtime token** (server) and **stream a run** (browser/server).

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
Pass `token.token` to the AIUI `ZabyRuntimeAgent` (`@zaby-ai/aiui-react`) as its `runtimeToken` getter. The SSE stream above is the same AG-UI event stream AIUI renders. See the `aiui-skill` for the front-end.

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
