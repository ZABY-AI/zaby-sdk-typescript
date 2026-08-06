export type JsonPrimitive = string | number | boolean | null;
export type JsonValue = JsonPrimitive | JsonObject | JsonValue[];
export type JsonObject = { [key: string]: JsonValue | undefined };

export type MaybePromise<T> = T | Promise<T>;

export type ZabyApiKeyProvider = string | (() => MaybePromise<string>);
export type ZabyAccessTokenProvider = string | (() => MaybePromise<string>);
export type ZabyRuntimeTokenProvider = string | (() => MaybePromise<string>);

export type RequestOptions = {
  requestId?: string;
  signal?: AbortSignal;
};

export type ListResponse<T = unknown> = {
  items: T[];
  page?: number;
  limit?: number;
  total?: number;
};

export type RuntimeTokenResponse = {
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

export type RuntimeTokenCreateInput = {
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
  ttlSeconds?: number | null;
  maxUses?: number | null;
  requestId?: string | null;
};

export type RuntimeTokenRotateInput = {
  previousToken: string;
  requestId?: string | null;
};

export type RuntimeTokenRotateByUniqueIdInput = {
  externalAppId: string;
  deploymentId: string;
  uniqueId: string;
  tokenFamilyId?: string | null;
  quotaPolicyId?: string | null;
  requestId?: string | null;
};

export type RuntimeTokenRevokeFamilyInput = {
  reason: string;
};

export type RuntimeTokenRevokeFamilyResponse = {
  tokenFamilyId: string;
  revokedAt: string | Date;
};

export type SseEvent<T = unknown> = {
  id?: string;
  event?: string;
  data: T;
};

// ---- Agent kinds & communication style (current platform surface) ----

export type TenantAgentKind = "DEPLOYABLE" | "EXECUTABLE" | "INTERNAL";
export type ManagedAgentCategory =
  | "SUPPORT"
  | "SALES"
  | "OPERATIONS"
  | "AUTONOMOUS"
  | "INTERNAL"
  | "TUTOR";
export type ManagedAgentVisibility = "PUBLIC" | "PREMIUM" | "PRIVATE";
export type ManagedAgentEnvironment = "TEST" | "STAGING" | "PRODUCTION";
export type TenantAgentStatus = "DRAFT" | "ACTIVE" | "PAUSED" | "DISABLED";
export type ExecutableAgentStatus = "DRAFT" | "ACTIVE" | "DISABLED";

export type CommunicationStyleLevel = "LOW" | "BALANCED" | "HIGH";

export type CommunicationStyle = {
  warmth: CommunicationStyleLevel;
  formality: CommunicationStyleLevel;
  responseLength: CommunicationStyleLevel;
  enthusiasm: CommunicationStyleLevel;
  directness: CommunicationStyleLevel;
  humor: CommunicationStyleLevel;
};

export type TenantManagedAgentRunStatus =
  | "QUEUED"
  | "RUNNING"
  | "WAITING_FOR_APPROVAL"
  | "COMPLETED"
  | "FAILED"
  | "CANCELLED";

export type InlineRunLimits = {
  maxInputTokens?: number;
  maxOutputTokens?: number;
  timeoutMs?: number;
  maxConcurrentRuns?: number;
  maxCostMicros?: number;
};

export type InlineActivateInput = {
  versionId: string;
  limits: InlineRunLimits;
  bypassRules?: unknown[];
  observabilityMode: "METADATA_ONLY" | "REDACTED_CONTENT";
};

export type TenantAgentListFilters = {
  category?: ManagedAgentCategory;
  kind?: TenantAgentKind;
  status?: string;
  visibility?: ManagedAgentVisibility;
  q?: string;
  cursor?: string;
  limit?: number;
};

export type TenantAgentRunInput = {
  deploymentId?: string;
  input: unknown;
  sessionId?: string | null;
  respondAsync?: boolean;
  requestId?: string | null;
  mcpRuntimeBearerToken?: string | null;
};

export type TenantAgentDeploymentInput = {
  agentVersionId: string;
  environment?: ManagedAgentEnvironment;
  metadata?: unknown;
};
