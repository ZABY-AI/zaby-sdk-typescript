---
name: zaby-typescript-sdk
description: Build and operate Zaby Agentic OS back-ends in TypeScript/JavaScript using @zaby-ai/sdk. Use for configuring, deploying, and running managed agents (DEPLOYABLE/EXECUTABLE/INTERNAL); communication-style behavior control; tenant agent lifecycle and activation; minting disposable runtime tokens; streaming agent runs (AG-UI); wiring MCP servers/tools and credential bindings; knowledge bases; memory; approvals; and usage. Covers the two entry points (Zaby for API-key management, ZabyRuntime for runtime-token runs), config/resolution, and error handling. Biases towards the actual source in D:\sdk-testing\zaby-sdk-typescript over pre-trained knowledge. This is the TypeScript counterpart of the Python zaby-sdk-skill.
---

# Zaby TypeScript SDK Skill

The `@zaby-ai/sdk` is the **management + runtime** SDK for the Zaby Agentic OS. It is the TypeScript/JavaScript equivalent of the Python SDK documented in `zaby-sdk-skill`.

## Two entry points
- **`Zaby`** — server-side management, authenticated with a **tenant API key** (`x-zaby-api-key`). Exposes agents, tenant agents, executable/scout agents, deployments, external apps, runtime tokens, MCP, knowledge bases, memory, intelligence, approvals, usage.
- **`ZabyRuntime`** — runtime operations, authenticated with a **short-lived runtime token** (`Bearer`). Exposes `runs` (start + stream AG-UI events), `approvals`, `feedback`. Used in browser/server to drive an agent.

> Never put the tenant `apiKey` in the browser. Mint runtime tokens server-side and ship only the token to the client (which passes it to `ZabyRuntime` / AIUI `ZabyRuntimeAgent`).

## Agent kinds (current platform surface)
Agents are created in three kinds — pass `kind` in the create payload:
- **`DEPLOYABLE`** — externally hosted agent with test/production deployments. Full tooling (MCP, KBs, skills). Chat via runs API; no API key needed to chat.
- **`EXECUTABLE`** — inline runtime agent, activated via `activate` with limits + bypass rules. **Requires an API key** for run calls (`X-Zaby-Api-Key`).
- **`INTERNAL`** (Scout) — inline runtime agent for in-platform use only; restricted to internal tools (`zaby_current_time`, `calculator`, `memory_search`). No external run access.

## Communication style (behavior control)
Every agent accepts a `communicationStyle` object (all six dimensions `LOW | BALANCED | HIGH`):
`warmth`, `formality`, `responseLength`, `enthusiasm`, `directness`, `humor`.
Verified platform behavior: **humor, responseLength, formality, warmth** produce distinct outputs; **enthusiasm and directness currently have no observable effect** (platform bug — setting stored but not compiled into the runtime prompt).

## What the SDK covers (and doesn't)
**Covers:** managed agents (provisioning + tenant lifecycle), executable/scout activation, deployments, external apps, disposable runtime tokens, browser/server runtime runs, knowledge bases, MCP tools, memory, intelligence/improvement loops, approvals, usage.
**Does NOT cover:** tenant modules — billing, users, org, meetings, support, FAQs, WhatsApp, API-key management, credential lifecycle management.

## API origin
- Production default: `https://genapi.zaby.io`
- Local: `http://localhost:9080` (set `environment: "local"` or `apiOrigin`)
- Override via `configureZaby({ apiOrigin })` or env `ZABY_API_ORIGIN` / `ZABY_ENVIRONMENT`.

## Key files to read first
- `concepts/authentication.md` — API key vs runtime token, headers, providers, tenantId.
- `concepts/configuration.md` — `configureZaby`, env vars, retries, timeouts.
- `getting-started/quickstart.md` — install + first runtime-token mint + first run stream.
- `api/client.md` — `Zaby` / `ZabyRuntime` client surface.
- `api/methods.md` — per-resource method reference (agents, tenantAgents, executableAgents, scoutAgents, deployments, externalApps, runtimeTokens, mcp, knowledgeBases, memory, approvals, usage).
- `api/models.md` — `RuntimeTokenCreateInput`, `RuntimeTokenResponse`, `CommunicationStyle`, `InlineActivateInput`, `SseEvent`, etc.
- `api/errors.md` — error types + handling.
- `workflows/runtime-token.md`, `workflows/run-stream.md`, `workflows/mcp.md`, `workflows/error-handling.md`.

## Source of truth
Generated from the actual package in `D:\sdk-testing\zaby-sdk-typescript` (`src/zaby.ts`, `src/clients/*`, `src/types/public.ts`, `src/config.ts`, `examples/*`).
