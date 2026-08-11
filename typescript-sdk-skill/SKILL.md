---
name: zaby-typescript-sdk
description: Use when integrating @zaby-ai/sdk for managed agents, runtime tokens, SSE runs, MCP, or knowledge bases, or when wiring a React chat UI with @zaby-ai/aiui-core / @zaby-ai/aiui-react — not for full tenant/admin/dashboard APIs.
---

# Zaby TypeScript SDK Skill

`@zaby-ai/sdk` is an **external agent + runtime SDK**. It is **not** a complete Zaby backend client.

## Scope boundary
**Yes:** managed agents, deployments, external apps, runtime tokens, `ZabyRuntime` runs/SSE, KB, MCP, memory, intelligence, approvals, usage, and the **AIUI React frontend** (`@zaby-ai/aiui-core` + `@zaby-ai/aiui-react`).  
**No:** billing, users, roles, org, WhatsApp, meetings, GPA/BIA/workflows, admin/customer apps, API-key CRUD. Those belong to the platform UI / internal api-client.

## Two entry points
- **`Zaby`** — server-side **provisioning** with `x-zaby-api-key`. Prefer `agents` / `externalApps` / `runtimeTokens`. Optional `accessToken` + `tenantId` only for managed-agent `tenantAgents` routes.
- **`ZabyRuntime`** — Bearer disposable token: `runs.start` + `runs.stream` (`/aiui`). Headless / server only.
- **AIUI frontend** — browser chat must use `@zaby-ai/aiui-core` + `@zaby-ai/aiui-react` (see `workflows/aiui-frontend.md`).

> Never put the tenant `apiKey` in the browser.

## Client chooser
| Client | Auth | Use when |
|--------|------|----------|
| `zaby.agents` | API key | Default SDK path (`/provisioning/agentic-os/...`) |
| `zaby.externalApps` + `runtimeTokens` | API key | Mint disposable tokens for apps |
| `zaby.tenantAgents` | API key + tenant JWT | Managed-agent JWT control only — **not** other `/tenant/*` APIs |
| `ZabyRuntime` | Runtime token | Headless start/stream (scripts, backends) |
| `@zaby-ai/aiui-react` | Runtime token via `aiui-core` manager | Product React chat UI |

No `executableAgents` / `scoutAgents` in this SDK.

## API origin
- Production: `https://genapi.zaby.io`
- Local: `http://localhost:9080`

## Read next
- `getting-started/rapid-prototype.md` — 5-minute chat app (start here)
- `concepts/authentication.md`
- `getting-started/quickstart.md`
- `api/methods.md` (must match `src/`)
- `workflows/runtime-token.md`, `aiui-frontend.md`, `run-stream.md`, `mcp.md`, `error-handling.md`
