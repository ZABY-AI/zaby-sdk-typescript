# Workflow: Run & Stream (AG-UI)

Drive an agent run with `ZabyRuntime` and consume the AG-UI event stream.

## Start + stream
```ts
import { ZabyRuntime } from "@zaby-ai/sdk/runtime";

const runtime = new ZabyRuntime({ token: process.env.ZABY_RUNTIME_TOKEN! });

const run = await runtime.runs.start({ input: { message: "What is my AWS bill this month?" } });
const runId = (run as { runId: string }).runId;

for await (const event of runtime.runs.stream(runId)) {
  const data = event.data as { type?: string; delta?: string; result?: string; message?: string };
  switch (data.type) {
    case "TextMessageContent":
      process.stdout.write(data.delta ?? "");
      break;
    case "ToolCallStart":
      console.log("calling", (data as any).toolCallName);
      break;
    case "RunFinished":
      console.log("\nDONE:", data.result);
      break;
    case "RunError":
      console.error("ERROR:", data.message);
      break;
  }
}
```
`runs.stream` yields `SseEvent { id?, event?, data }` and **auto-stops at `RunFinished`**.

## Without streaming (events API)
```ts
const events = await runtime.runs.events(runId, { limit: 100 });
// or provisioning-side:
const progress = await zaby.agents.getRunProgress(runId);
const evt = await zaby.agents.listRunEvents(runId, { limit: 50 });
```

## Approvals (HITL) mid-run
If a run needs approval, the stream emits an interruption/approval event. Resolve it:
```ts
await runtime.approvals.approve(runId, approvalId);
// or zaby.approvals.approve(runId, approvalId) on the management side
```

## Feedback
```ts
await runtime.feedback.create(runId, { rating: "positive", comment: "..." });
```

## Connecting to AIUI
`runs.stream` is the **headless** AG-UI SSE path (`ZabyRuntime`, scripts, tests).

A product React UI must **not** consume this iterator directly. Use `@zaby-ai/aiui-core` (`EventDecoder`, `createRuntimeTokenManager`) + `@zaby-ai/aiui-react` (`AbstractAgent` subclass → `useAgentChat`). The browser POSTs `{runtimeUrl}/run/aiui` with the runtime Bearer token.

There is no `ZabyRuntimeAgent` export. Full wiring: `workflows/aiui-frontend.md`.

## Aborting
```ts
const ctrl = new AbortController();
for await (const ev of runtime.runs.stream(runId, undefined, { signal: ctrl.signal })) { /* ... */ }
// ctrl.abort() to cancel
```
Errors during streaming throw `ZabyStreamError` (see `api/errors.md`).
