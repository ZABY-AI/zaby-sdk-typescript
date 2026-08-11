# Zaby TypeScript SDK Skill

Documents `@zaby-ai/sdk` — the external **agent + runtime** SDK (not a full backend/dashboard client).

## Scope
- Configure/deploy managed agents, mint runtime tokens, run/stream via AG-UI SSE
- Product chat UI via `@zaby-ai/aiui-core` + `@zaby-ai/aiui-react` (SDK stays server-side)
- Agent-facing KB, MCP, memory, intelligence, approvals, usage
- **Not** Admin/Customer apps, billing/users/org, GPA/BIA/workflows, or other tenant control-plane APIs

## Contents
- `SKILL.md` — entry point
- `getting-started/` — `installation.md`, `quickstart.md`, **`rapid-prototype.md`** (5-min chat), `first-agent.md`
- `concepts/` — `authentication.md`, `configuration.md`, `lifecycle.md`, `terminology.md`
- `api/` — `client.md`, `methods.md`, `models.md`, `errors.md`
- `workflows/` — `runtime-token.md`, **`aiui-frontend.md`** (React chat), `run-stream.md`, `mcp.md`, `error-handling.md`

## Packages / entry points
- `Zaby` — provisioning / API-key client (agents, apps, tokens, …)
- `ZabyRuntime` (from `@zaby-ai/sdk/runtime`) — disposable-token run client

## Source of truth
`D:\sdk-testing\zaby-sdk-typescript`
