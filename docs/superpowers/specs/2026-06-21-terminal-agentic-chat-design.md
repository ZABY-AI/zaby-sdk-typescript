# Terminal Agentic Chat Example Design

## Purpose

Add a runnable terminal chat example that demonstrates how a tenant application can use the Zaby TypeScript SDK to embed the Agentic OS runtime from a CLI/TUI environment.

## Scope

The example belongs in `examples/` and is not part of the published runtime API surface. It should show a polished terminal workflow while keeping business logic small and testable.

## User Experience

The TUI shows:

- a header with the active API origin and auth mode
- a transcript of user and assistant messages
- a status line for token minting, run creation, streaming, approval needs, and errors
- a bottom input prompt

Commands:

- `/help` shows available commands
- `/clear` clears the transcript
- `/exit` exits the process

## Auth Flow

The example supports two modes:

1. Runtime-token mode: if `ZABY_RUNTIME_TOKEN` is present, instantiate `ZabyRuntime` directly.
2. Server-mint mode: if `ZABY_API_KEY`, `ZABY_EXTERNAL_APP_ID`, and `ZABY_AGENT_DEPLOYMENT_ID` are present, use `Zaby.runtimeTokens.create()` to mint a disposable token, then instantiate `ZabyRuntime`.

Testing defaults to `http://localhost:9080` through `configureZaby({ environment: "local" })`, unless `ZABY_API_ORIGIN` is set.

## Runtime Data Flow

For each submitted message:

1. Add the user message to the local transcript.
2. Start a runtime run with `runtime.runs.start({ input: { message } })`.
3. Stream `runtime.runs.stream(runId)`.
4. Reduce AIUI/SSE events into local transcript state.
5. Append assistant text deltas live.
6. Render approval events as notices instead of attempting automatic approval.

## Implementation Boundary

Terminal rendering uses Ink and `ink-text-input`. Event reduction and run-id extraction live in `examples/terminal-chat-core.ts` so behavior can be tested without rendering a terminal.

## Error Handling

The example displays:

- missing environment variable guidance before starting the TUI
- runtime token expiration/exhaustion errors as status messages
- stream and API errors as transcript system notices

## Tests

Add tests for:

- resolving runtime-token mode
- resolving server-mint mode
- rejecting incomplete auth configuration
- extracting run IDs from common response shapes
- reducing text delta events
- reducing approval/interruption events

