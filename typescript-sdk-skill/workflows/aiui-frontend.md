# Workflow: AIUI frontend (`@zaby-ai/sdk` + AIUI)

A product chat UI is **not** `ZabyRuntime` + raw `EventSource`. The browser must use the AIUI libraries. `@zaby-ai/sdk` stays on the server and only mints / rotates tokens.

For the 5-minute copy-paste build, see `getting-started/rapid-prototype.md`. This doc is the full reference.

Canonical reference app: `zaby-aiui-nextjs-starter`.

## Packages

| Package | Where | Job |
|---------|--------|-----|
| `@zaby-ai/sdk` | **Server only** | Provision + `runtimeTokens.create` / `rotate` |
| `@zaby-ai/aiui-core` | Browser + server | AG-UI protocol, `EventDecoder`, `createRuntimeTokenManager`, `resolveRuntimeToken` |
| `@zaby-ai/aiui-react` | Browser | `AbstractAgent`, `useAgentChat`, `Chat` / primitives |

There is no `ZabyRuntimeAgent` export in `@zaby-ai/aiui-react`. Subclass `AbstractAgent` (see `DirectZabyRuntimeAgent` below) and pass it to `useAgentChat` or `<Chat>`.

Install from **public npm** (no GitHub Packages / `.npmrc`):

```bash
npm install @zaby-ai/sdk @zaby-ai/aiui-core @zaby-ai/aiui-react rxjs
```

Use published versions: `@zaby-ai/sdk@0.1.1`, `@zaby-ai/aiui-core@0.2.2` (or newer), `@zaby-ai/aiui-react@0.2.11` (or newer). `aiui-core` ≥ 0.1.2 exports `createRuntimeTokenManager`.

## Required flow

```
Browser  →  GET  /api/zaby/agents         →  list ACTIVE agents (server, API key)
Browser  →  GET  /api/zaby/external-apps  →  list ACTIVE external apps
Browser  →  GET  /api/zaby/runtime-policies →  list ACTIVE quota policies
Browser  →  POST /api/runtime-token     →  zaby.runtimeTokens.create   [API key, server]
Browser  →  createRuntimeTokenManager   →  remint before TTL / maxUses [aiui-core]
Browser  →  AbstractAgent subclass      →  POST {runtimeUrl}/run/aiui  [Bearer runtime token]
         →  EventDecoder + useAgentChat →  React chat                  [aiui-react]
```

Never put `ZABY_API_KEY` in the browser. Never persist the runtime JWT in localStorage / sessionStorage / URLs.

## 1. Discovery (server, API key)

`lib/zaby/server.ts` — copy from `zaby-aiui-nextjs-starter/src/lib/zaby/server.ts`. The three calls you need:

```ts
GET /api/v1/provisioning/agentic-os/agents?status=ACTIVE&limit=100
GET /api/v1/provisioning/managed-agents/external-apps?status=ACTIVE
GET /api/v1/provisioning/managed-agents/runtime-token-policies?activeOnly=true
```

The agent object has `activeDeployments: [{ id, status: "ACTIVE", runtimeUrl }]`. `runtimeUrl` is what the browser POSTs to. Expose only `{ agentId, deploymentId, name, runtimeUrl, description? }` to the browser.

Filter runtime policies by `externalAppId` / `deploymentId` compatibility (a policy is compatible when its `externalAppId` is null or equals the chosen app, and its `deploymentId` is null or equals the chosen deployment).

## 2. Mint on the server (`@zaby-ai/sdk`)

```ts
// app/api/runtime-token/route.ts
import { Zaby } from "@zaby-ai/sdk";

export async function POST(request: Request) {
  const body = await request.json();
  // revalidate externalAppId / deploymentId / quotaPolicyId server-side
  const zaby = new Zaby({ apiKey: process.env.ZABY_API_KEY!, config: { apiOrigin: process.env.ZABY_BASE_URL! } });
  const token = await zaby.runtimeTokens.create({
    externalAppId: body.externalAppId,
    deploymentId: body.deploymentId,
    quotaPolicyId: body.quotaPolicyId, // required on live API
    uniqueId: body.externalUserId,
    externalUserId: body.externalUserId,
    externalSessionId: body.externalSessionId,
    displayName: body.displayName,
    channel: "web",
    ttlSeconds: 600,
    maxUses: 20,
  });
  return Response.json({
    token: token.token,
    expiresAt: token.expiresAt,
    rotateAfterSeconds: token.rotateAfterSeconds,
    remainingUses: token.remainingUses,
    tokenFamilyId: token.tokenFamilyId,
  });
}
```

Rotate an existing JWT instead of minting a new family member:

```ts
const rotated = await zaby.runtimeTokens.rotate({ previousToken: body.previousToken });
```

## 3. Refresh in the browser (`@zaby-ai/aiui-core`)

There is **no** separate OAuth refresh token. Refresh = remint (or `rotate`) before expiry / exhaustion.

```ts
import { createRuntimeTokenManager, type RuntimeTokenManagerMintResponse } from "@zaby-ai/aiui-core";

const tokenManager = createRuntimeTokenManager({
  refreshSkewMs: 30_000,   // remint ~30s before expiresAt
  minRemainingUses: 2,     // remint when uses are almost gone
  mint: async () => {
    const res = await fetch("/api/runtime-token", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      cache: "no-store",
      body: JSON.stringify({ externalAppId, deploymentId, quotaPolicyId, externalUserId, externalSessionId, displayName }),
    });
    return (await res.json()) as RuntimeTokenManagerMintResponse;
  },
});

// tokenManager.provider is a RuntimeTokenProvider — pass it to the agent
```

`resolveRuntimeToken(provider)` unwraps `string | () => string | Promise<string>`.

## 4. Stream into React (`@zaby-ai/aiui-react`)

### The agent subclass

```ts
import { EventDecoder, resolveRuntimeToken, type AIUIEvent, type RuntimeTokenProvider } from "@zaby-ai/aiui-core";
import { AbstractAgent, type RunAgentInput } from "@zaby-ai/aiui-react";
import { Observable } from "rxjs";

class DirectZabyRuntimeAgent extends AbstractAgent {
  constructor(
    private readonly config: { baseUrl: string; runtimeToken: RuntimeTokenProvider; threadId: string },
  ) {
    super({ threadId: config.threadId });
  }

  run(input: RunAgentInput): Observable<AIUIEvent> {
    return new Observable((subscriber) => {
      const controller = new AbortController();
      void this.stream(input, controller.signal, (event) => subscriber.next(event))
        .then(() => subscriber.complete())
        .catch((err) => (controller.signal.aborted ? subscriber.complete() : subscriber.error(err)));
      return () => controller.abort();
    });
  }

  private async stream(input: RunAgentInput, signal: AbortSignal, emit: (event: AIUIEvent) => void) {
    const token = await resolveRuntimeToken(this.config.runtimeToken);
    if (!token) throw new Error("Unable to obtain a Zaby runtime token.");
    const response = await fetch(`${this.config.baseUrl.replace(/\/$/, "")}/run/aiui`, {
      method: "POST",
      headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json", Accept: "text/event-stream" },
      body: JSON.stringify({
        threadId: input.threadId,
        input: input.messages.at(-1)?.content ?? "",
        runId: input.runId,
      }),
      signal,
    });
    if (!response.ok) throw new Error(await response.text());
    const reader = response.body!.getReader();
    const textDecoder = new TextDecoder();
    const eventDecoder = new EventDecoder();
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      for (const event of eventDecoder.decode(textDecoder.decode(value, { stream: true }))) emit(event);
    }
  }
}
```

### Option A — let `<Chat>` do everything

```tsx
import { Chat } from "@zaby-ai/aiui-react";

const agent = new DirectZabyRuntimeAgent({
  baseUrl: deployment.runtimeUrl,
  runtimeToken: tokenManager.provider,
  threadId,
});

return <Chat agent={agent} agentName={deployment.name} placeholder={`Message ${deployment.name}…`} />;
```

`<Chat>` renders the message list, input area, streaming indicator, tool-call bubbles, and approval cards. Use this for rapid prototyping.

### Option B — drive state yourself with `useAgentChat`

```tsx
import { useAgentChat } from "@zaby-ai/aiui-react";

const chat = useAgentChat({ agent });

// chat.messages      — ChatMessage[]
// chat.isLoading     — boolean
// chat.error         — Error | null
// chat.sendMessage(content, attachments?) — Promise<void>
// chat.stop()        — abort the run
// chat.clearMessages()
// chat.reload()     — re-run the last turn
// chat.threadId
// chat.pendingToolCalls
// chat.submitToolResult(toolCallId, result)
// chat.state / chat.setState
// chat.submitUIAction(action)
```

Render with `MessageList` / `InputArea` / `MessageBubble` from `@zaby-ai/aiui-react`, or your own components.

## 5. Approvals (HITL)

If the agent's deployment has approvals enabled and the agent emits an approval request, the stream surfaces it as a UI block. `<Chat>` renders an `AiuiApprovalCardBlock` automatically.

If you are driving state yourself, watch `chat.messages[].uiBlock` for `block.kind === "approval-card"` and call:

```ts
await runtime.approvals.approve(runId, approvalId);
// or
await runtime.approvals.reject(runId, approvalId);
```

`runtime` here is a `ZabyRuntime` from `@zaby-ai/sdk/runtime` constructed with the same runtime token, or you can call the management side with `zaby.approvals.approve(runId, approvalId)` (API key).

## 6. Tool calls and UI blocks

`useAgentChat` already collects tool calls into `chat.messages[].toolCalls` and emits them via `onToolCall` / `onToolResult`. Render with `ToolCallBlock` / `ToolResultBlock` from `@zaby-ai/aiui-react`, or let `<Chat>` render them inline.

For richer UI (data tables, source lists, progress trackers, markdown, code blocks, prompt forms), register `AiuiBlockRenderer` and the block components from `@zaby-ai/aiui-react`. The agent emits `UI_BLOCK` events; `useAgentChat` puts them on `message.uiBlock`; the renderer maps `block.kind` to the right component.

## 7. Server-only / headless (no React)

`ZabyRuntime` from `@zaby-ai/sdk/runtime` is valid for scripts, tests, and backends that consume SSE themselves. That path is **not** a product frontend.

```ts
import { ZabyRuntime } from "@zaby-ai/sdk/runtime";
const runtime = new ZabyRuntime({ token });
const run = await runtime.runs.start({ input: { message: "hi" } });
for await (const event of runtime.runs.stream(String(run.runId))) {
  if (event.event === "TEXT_MESSAGE_CONTENT") process.stdout.write((event.data as any).delta ?? "");
}
```

## Gotchas

- 401 on `/run/aiui` → token expired/exhausted. `createRuntimeTokenManager` should already have reminted; otherwise call `/api/runtime-token` again.
- 422 on `runtimeTokens.create` → missing `quotaPolicyId`, `externalUserId` / `uniqueId`, or unbound app/deployment.
- Empty `agents` list → no ACTIVE deployments. Check `agents.list` / publish / deploy.
- Empty `runtimePolicies` list → create one with `runtimeTokenPolicies.create` bound to the app + deployment.
- Chat UI that parses SSE by hand will miss tool cards, HITL, A2UI blocks, and token refresh.
