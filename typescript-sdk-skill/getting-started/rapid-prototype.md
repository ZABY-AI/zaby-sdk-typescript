# Rapid Prototype (5-minute chat)

Goal: a working Next.js chat page that talks to a Zaby managed agent. Copy-paste, run, ship.

You will build:

```
app/
  api/
    zaby/agents/route.ts          # list agents (server, API key)
    zaby/external-apps/route.ts   # list external apps (server, API key)
    zaby/runtime-policies/route.ts # list quota policies (server, API key)
    runtime-token/route.ts        # mint + rotate runtime token (server, API key)
  page.tsx                        # React chat (browser, runtime token)
  direct-zaby-runtime-agent.ts   # AbstractAgent subclass (browser)
  runtime-token-manager.ts        # createRuntimeTokenManager wrapper (browser)
```

## 0. Prereqs

```bash
npm create next-app@latest my-app --ts
cd my-app
npm install @zaby-ai/sdk @zaby-ai/aiui-core @zaby-ai/aiui-react rxjs
```

`.env.local` (server only — never prefix with `NEXT_PUBLIC_`):

```env
ZABY_API_KEY=zaby_pk_...
ZABY_BASE_URL=https://genapi.zaby.io
NEXT_PUBLIC_ZABY_RUNTIME_URL=https://genapi.zaby.io
```

You need one ACTIVE agent deployment, one ACTIVE external app bound to it, and one ACTIVE quota policy for that pair. If you don't have them, the skill's `getting-started/first-agent.md` walks through creating all three with `@zaby-ai/sdk`.

## 1. Discovery routes (server, API key)

`app/api/zaby/agents/route.ts`:

```ts
import { errorJson, noStoreJson } from "@/lib/zaby/http";
import { getAvailableAgents, ZabyStarterError } from "@/lib/zaby/server";

export const runtime = "nodejs";
export async function GET() {
  try {
    return noStoreJson({ agents: await getAvailableAgents() });
  } catch (e) {
    return e instanceof ZabyStarterError
      ? errorJson(e.code, e.message, e.status)
      : errorJson("ZABY_AGENT_DISCOVERY_FAILED", "Unable to load agents.", 502);
  }
}
```

Same shape for `external-apps/route.ts` (`getAvailableExternalApps`) and `runtime-policies/route.ts` (`getAvailableRuntimePolicies`).

Put `getAvailableAgents`, `getAvailableExternalApps`, `getAvailableRuntimePolicies`, `getCompatibleRuntimePolicy`, `isAvailableDeployment`, `isAvailableExternalApp`, `getZabyServerConfig`, and `ZabyStarterError` in `lib/zaby/server.ts`. Copy them verbatim from the `zaby-aiui-nextjs-starter` repo — they are the source of truth for the `/provisioning/agentic-os/agents?status=ACTIVE`, `/provisioning/managed-agents/external-apps?status=ACTIVE`, and `/provisioning/managed-agents/runtime-token-policies?activeOnly=true` calls and for `activeDeployments[].runtimeUrl` extraction.

## 2. Mint route (server, API key)

`app/api/runtime-token/route.ts`:

```ts
import { Zaby } from "@zaby-ai/sdk";
import { errorJson, noStoreJson } from "@/lib/zaby/http";
import {
  getCompatibleRuntimePolicy,
  getZabyServerConfig,
  isAvailableDeployment,
  isAvailableExternalApp,
} from "@/lib/zaby/server";

export const runtime = "nodejs";

export async function POST(request: Request) {
  const body = await request.json();
  if (
    !(await isAvailableExternalApp(body.externalAppId)) ||
    !(await isAvailableDeployment(body.deploymentId)) ||
    !(await getCompatibleRuntimePolicy({
      quotaPolicyId: body.quotaPolicyId,
      externalAppId: body.externalAppId,
      deploymentId: body.deploymentId,
    }))
  ) {
    return errorJson("INVALID_SELECTION", "Pick a valid app, agent, and policy.", 403);
  }

  const { apiKey, apiOrigin } = getZabyServerConfig();
  const zaby = new Zaby({ apiKey, config: { apiOrigin } });
  const token = await zaby.runtimeTokens.create({
    externalAppId: body.externalAppId,
    deploymentId: body.deploymentId,
    quotaPolicyId: body.quotaPolicyId,
    uniqueId: body.externalUserId,
    externalUserId: body.externalUserId,
    externalSessionId: body.externalSessionId,
    displayName: body.displayName,
    channel: "web",
    ttlSeconds: 600,
    maxUses: 20,
  });

  return noStoreJson({
    token: token.token,
    expiresAt: token.expiresAt,
    rotateAfterSeconds: token.rotateAfterSeconds,
    remainingUses: token.remainingUses,
    tokenFamilyId: token.tokenFamilyId,
  });
}
```

## 3. Browser token manager

`app/runtime-token-manager.ts`:

```ts
import { createRuntimeTokenManager, type RuntimeTokenManagerMintResponse } from "@zaby-ai/aiui-core";

export function createStarterRuntimeTokenManager(session: {
  displayName: string;
  externalUserId: string;
  externalSessionId: string;
  externalApp: { id: string };
  agent: { deploymentId: string };
  runtimePolicy: { id: string };
}) {
  return createRuntimeTokenManager({
    refreshSkewMs: 30_000,
    minRemainingUses: 2,
    mint: async () => {
      const res = await fetch("/api/runtime-token", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        cache: "no-store",
        body: JSON.stringify({
          displayName: session.displayName,
          externalUserId: session.externalUserId,
          externalSessionId: session.externalSessionId,
          externalAppId: session.externalApp.id,
          deploymentId: session.agent.deploymentId,
          quotaPolicyId: session.runtimePolicy.id,
        }),
      });
      return (await res.json()) as RuntimeTokenManagerMintResponse;
    },
  });
}
```

## 4. Browser agent (AbstractAgent subclass)

`app/direct-zaby-runtime-agent.ts` — copy verbatim from `zaby-aiui-nextjs-starter/src/app/direct-zaby-runtime-agent.ts`. The 30-line class that `POST {runtimeUrl}/run/aiui` with the Bearer runtime token and decodes SSE with `EventDecoder`.

## 5. Chat page

`app/page.tsx`:

```tsx
"use client";
import { useEffect, useMemo, useState } from "react";
import { Chat, useAgentChat } from "@zaby-ai/aiui-react";
import { DirectZabyRuntimeAgent } from "./direct-zaby-runtime-agent";
import { createStarterRuntimeTokenManager } from "./runtime-token-manager";

type Agent = { agentId: string; deploymentId: string; name: string; runtimeUrl: string };
type App = { id: string; name: string; slug: string };
type Policy = { id: string; name: string; externalAppId: string | null; deploymentId: string | null };

export default function Page() {
  const [agents, setAgents] = useState<Agent[]>([]);
  const [apps, setApps] = useState<App[]>([]);
  const [policies, setPolicies] = useState<Policy[]>([]);
  const [agentId, setAgentId] = useState("");
  const [appId, setAppId] = useState("");
  const [policyId, setPolicyId] = useState("");
  const [name, setName] = useState("");

  useEffect(() => {
    fetch("/api/zaby/agents").then(r => r.json()).then(d => setAgents(d.agents ?? []));
    fetch("/api/zaby/external-apps").then(r => r.json()).then(d => setApps(d.externalApps ?? []));
    fetch("/api/zaby/runtime-policies").then(r => r.json()).then(d => setPolicies(d.runtimePolicies ?? []));
  }, []);

  const agent = agents.find(a => a.agentId === agentId);
  const app = apps.find(a => a.id === appId);
  const policy = policies.find(p => p.id === policyId);
  const ready = agent && app && policy && name.trim();

  const session = useMemo(() => {
    if (!ready) return null;
    return {
      displayName: name,
      externalUserId: crypto.randomUUID(),
      externalSessionId: crypto.randomUUID(),
      threadId: crypto.randomUUID(),
      externalApp: app,
      agent,
      runtimePolicy: policy,
    } as any;
  }, [ready, name, agent, app, policy]);

  if (!session) {
    return (
      <main style={{ padding: 24 }}>
        <h1>Zaby chat — pick your agent</h1>
        <input placeholder="Your name" value={name} onChange={e => setName(e.target.value)} />
        <select value={agentId} onChange={e => setAgentId(e.target.value)}>
          <option value="">Choose agent</option>
          {agents.map(a => <option key={a.agentId} value={a.agentId}>{a.name}</option>)}
        </select>
        <select value={appId} onChange={e => setAppId(e.target.value)}>
          <option value="">Choose external app</option>
          {apps.map(a => <option key={a.id} value={a.id}>{a.name}</option>)}
        </select>
        <select value={policyId} onChange={e => setPolicyId(e.target.value)}>
          <option value="">Choose quota policy</option>
          {policies.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
        </select>
      </main>
    );
  }

  return <ChatRoom session={session} />;
}

function ChatRoom({ session }: { session: any }) {
  const tokenManager = useMemo(() => createStarterRuntimeTokenManager(session), [session]);
  const agent = useMemo(
    () => new DirectZabyRuntimeAgent({
      baseUrl: session.agent.runtimeUrl,
      runtimeToken: tokenManager.provider,
      threadId: session.threadId,
    }),
    [session, tokenManager],
  );
  return <Chat agent={agent} agentName={session.agent.name} placeholder={`Message ${session.agent.name}…`} />;
}
```

That's it. `Chat` from `@zaby-ai/aiui-react` already renders message list, input, streaming, tool calls, and approval cards.

## 6. Run

```bash
npm run dev
```

Open http://localhost:3000, pick agent + app + policy, type, send. First send lazily mints a runtime token; the token manager rotates it before expiry.

## Where to go next

- `workflows/aiui-frontend.md` — full reference (refresh, approvals, tool blocks, gotchas)
- `workflows/runtime-token.md` — token lifecycle
- `workflows/mcp.md` — attach tools to the agent
- `getting-started/first-agent.md` — provision a new agent + app + policy if you don't have one
