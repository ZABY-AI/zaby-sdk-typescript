# Models

Key public types (from `src/types/public.ts`, exported via `@zaby-ai/sdk/types`).

## RuntimeTokenCreateInput
```ts
type RuntimeTokenCreateInput = {
  externalAppId: string;
  deploymentId: string;
  uniqueId?: string;
  externalUserId?: string;
  externalConversationId?: string | null;
  externalSessionId?: string | null;
  displayName?: string | null;
  emailHash?: string | null;
  locale?: string | null;
  timezone?: string | null;
  channel?: "web" | "mobile" | "server" | "support" | "embedded";
  quotaPolicyId?: string | null;
  tokenFamilyId?: string | null;
  dpopJkt?: string | null;
  metadata?: JsonObject;
  scopes?: string[];
  ttlSeconds?: number | null;     // absolute TTL
  maxUses?: number | null;        // call cap
  requestId?: string | null;
};
```

## RuntimeTokenResponse
```ts
type RuntimeTokenResponse = {
  token: string;
  tokenType: "Bearer";
  expiresAt: string | Date;
  scopes?: string[];
  grantId?: string;
  tokenFamilyId?: string;
  quotaPolicyId?: string | null;
  uniqueIdHash?: string;
  rotateAfterSeconds?: number;
  remainingUses?: number;
  agentSessionId?: string;
  externalAppId?: string;
  deploymentId?: string;
};
```

## RuntimeTokenRotateInput / RotateByUniqueIdInput
```ts
type RuntimeTokenRotateInput = { previousToken: string; requestId?: string | null };
type RuntimeTokenRotateByUniqueIdInput = {
  externalAppId: string; deploymentId: string; uniqueId: string;
  tokenFamilyId?: string | null; quotaPolicyId?: string | null; requestId?: string | null;
};
```

## SseEvent
```ts
type SseEvent<T = unknown> = { id?: string; event?: string; data: T };
```
Yielded by `runs.stream(runId)`. `event` is the AG-UI event name (e.g. `"TextMessageContent"`, `"RunFinished"`); `data` is the event payload (`data.type` mirrors `event`).

## Run start input
```ts
runtime.runs.start({ input: { message: string; /* + attachments, threadId, context, ... */ } });
// returns { runId: string, ... }
```

## Agent kinds & communication style
```ts
type TenantAgentKind = "DEPLOYABLE" | "EXECUTABLE" | "INTERNAL";
type CommunicationStyleLevel = "LOW" | "BALANCED" | "HIGH";
type CommunicationStyle = {
  warmth: CommunicationStyleLevel;
  formality: CommunicationStyleLevel;
  responseLength: CommunicationStyleLevel;
  enthusiasm: CommunicationStyleLevel;
  directness: CommunicationStyleLevel;
  humor: CommunicationStyleLevel;
};
```
Set on agent create/update:
```ts
zaby.tenantAgents.create({
  name: "Support Bot",
  kind: "DEPLOYABLE",
  communicationStyle: { warmth: "HIGH", humor: "HIGH", directness: "LOW" },
  instructions: "…",
});
```
Verified behavior: warmth/formality/responseLength/humor change output; enthusiasm/directness currently do not (platform bug).

## Inline activation (EXECUTABLE / INTERNAL)
```ts
type InlineActivateInput = {
  versionId: string;
  limits: InlineRunLimits;            // see below
  bypassRules?: unknown[];            // AUTO_APPROVE rules per capability
  observabilityMode: "METADATA_ONLY" | "REDACTED_CONTENT";
};
type InlineRunLimits = {
  maxInputTokens?: number;            // default 32_768
  maxOutputTokens?: number;           // default 4_096
  timeoutMs?: number;                 // default 60_000
  maxConcurrentRuns?: number;         // default 10
  maxCostMicros?: number;             // default 1_000_000
};
```
Used by `zaby.executableAgents.activate(agentId, input)` and `zaby.scoutAgents.activate(agentId, input)`.

## Provider types
```ts
type ZabyApiKeyProvider = string | (() => MaybePromise<string>);
type ZabyAccessTokenProvider = string | (() => MaybePromise<string>);
type ZabyRuntimeTokenProvider = string | (() => MaybePromise<string>);
type RequestOptions = { requestId?: string; signal?: AbortSignal };
type ListResponse<T> = { items: T[]; page?: number; limit?: number; total?: number };
```

## Json types
```ts
type JsonObject = { [key: string]: JsonValue | undefined };
type JsonValue = JsonPrimitive | JsonObject | JsonValue[];
type JsonPrimitive = string | number | boolean | null;
```
