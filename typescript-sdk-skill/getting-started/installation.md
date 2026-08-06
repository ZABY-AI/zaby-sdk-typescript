# Installation

```bash
npm install @zaby-ai/sdk
# or
bun add @zaby-ai/sdk
```

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
