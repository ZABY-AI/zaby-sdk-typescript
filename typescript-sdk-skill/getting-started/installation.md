# Installation

All frontend + SDK packages below are on the **public npm registry**. No GitHub Packages token or `.npmrc` is required.

```bash
# Server / headless SDK
npm install @zaby-ai/sdk
# or
bun add @zaby-ai/sdk

# Product React UI (install with the SDK)
npm install @zaby-ai/sdk @zaby-ai/aiui-core @zaby-ai/aiui-react
```

Public latest (registry.npmjs.org):

| Package | Latest | Role |
|---------|--------|------|
| `@zaby-ai/sdk` | `0.1.1` | Provision + mint/rotate tokens |
| `@zaby-ai/aiui-core` | `0.2.2` | Protocol, `EventDecoder`, `createRuntimeTokenManager` |
| `@zaby-ai/aiui-react` | `0.2.11` | `AbstractAgent`, `useAgentChat`, Chat UI |

The package ships ESM (`"type": "module"`). Subpath exports:
- `@zaby-ai/sdk` — `Zaby`, `configureZaby`, types
- `@zaby-ai/sdk/runtime` — `ZabyRuntime`
- `@zaby-ai/sdk/types` — public types
- `@zaby-ai/sdk/errors` — error classes

## Peer requirements
- A global `fetch` (Node 18+ has it; for older Node or edge, inject `fetch` via `configureZaby({ fetch })`).
- TypeScript users get bundled `.d.ts`.

## Environment
```ts
import { configureZaby } from "@zaby-ai/sdk";
configureZaby({ environment: "production" }); // or "local" → http://localhost:9080
```
See `concepts/configuration.md`.

## Import
```ts
import { Zaby, configureZaby } from "@zaby-ai/sdk";
import { ZabyRuntime } from "@zaby-ai/sdk/runtime";
```
