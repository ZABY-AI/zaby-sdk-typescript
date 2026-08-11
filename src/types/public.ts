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

// ---- Managed agent types (aligned with /api/v1 tenant + provisioning agents) ----

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

export type CommunicationStyleLevel = "LOW" | "BALANCED" | "HIGH";

/** Optional behavior hint; pass via agent `config` / metadata when the platform accepts it. */
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

export type TenantAgentListFilters = {
  category?: ManagedAgentCategory;
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

/** Alias used by provisioning `agents.deploy` / `deployments.create`. */
export type DeployManagedAgentInput = TenantAgentDeploymentInput;

export type CreateManagedAgentInput = {
  slug: string;
  name: string;
  description?: string | null;
  /** Preferred platform models; other strings may be accepted by some environments. */
  defaultModel?: "zaby" | "zaby-max" | (string & {});
  instructions?: string | null;
  category?: ManagedAgentCategory;
  visibility?: ManagedAgentVisibility;
  config?: JsonObject;
  metadata?: JsonObject;
  tags?: string[];
  /** Legacy/e2e field — prefer `defaultModel`. */
  provider?: string;
};

export type AttachMcpToolInput = {
  tenantInstallationId: string;
  toolDefinitionId: string;
  key?: string;
  name?: string;
  description?: string | null;
  approvalMode?: "AUTO" | "MANUAL" | "TENANT_POLICY";
  enabled?: boolean;
  config?: JsonObject;
  metadata?: JsonObject;
};

export type AttachKnowledgeBaseInput = {
  knowledgeBaseId: string;
  knowledgeBaseVersionId?: string | null;
  knowledgeProfileId?: string | null;
  key?: string;
  name?: string;
  description?: string | null;
  enabled?: boolean;
  retrievalPolicy?: JsonObject;
  citationPolicy?: JsonObject;
  coveragePolicy?: JsonObject;
  personalizationPolicy?: JsonObject;
  knowledgePolicy?: JsonObject;
  metadata?: JsonObject;
};

export type ExternalAppCreateInput = {
  name: string;
  slug: string;
  agentId?: string | null;
  allowedOrigins?: string[];
  tokenTtlSeconds?: number;
  metadata?: JsonObject;
};

export type ExternalAppBindDeploymentInput = {
  deploymentId: string;
  allowBrowserRuntime?: boolean;
  allowServerRuntime?: boolean;
  allowApprovals?: boolean;
  rateLimitPerMinute?: number | null;
  metadata?: JsonObject;
};

/** Playground mint body (no quotaPolicyId). Live API currently requires `externalUserId`. */
export type PlaygroundRuntimeTokenInput = {
  deploymentId: string;
  uniqueId?: string;
  externalUserId?: string;
  externalSessionId?: string | null;
  externalConversationId?: string | null;
  displayName?: string | null;
  emailHash?: string | null;
  locale?: string | null;
  timezone?: string | null;
  channel?: "web" | "mobile" | "server" | "support" | "embedded";
  metadata?: JsonObject;
  scopes?: string[];
  ttlSeconds?: number | null;
  maxUses?: number | null;
  tokenFamilyId?: string | null;
  dpopJkt?: string | null;
  requestId?: string | null;
};

export type McpInstallServerInput = {
  serverDefinitionId: string;
  rateLimitPerMinute?: number | null;
  requireToolApproval?: boolean;
  metadata?: JsonObject;
};

export type KnowledgeRetrieveInput = {
  query: string;
  topK?: number;
  /** Prefer topK; limit kept for callers that still send it. */
  limit?: number;
  minScore?: number;
  sourceIds?: string[];
  mode?: string;
};

export type LinkLibraryDocumentInput = {
  libraryDocumentId: string;
  libraryDocumentVersionId?: string | null;
  isIncluded?: boolean;
  metadata?: JsonObject;
};

export type RuntimeRunStartInput = {
  input: JsonValue;
  requestId?: string | null;
  respondAsync?: boolean;
};

export type RuntimeRunStartResponse = {
  runId: string;
  agentSessionId?: string;
  externalAppId?: string;
  deploymentId?: string;
};

export type RuntimeFeedbackInput = {
  rating?: number | null;
  label?: string | null;
  comment?: string | null;
  domainKey?: string | null;
  topicKey?: string | null;
  metadata?: JsonObject | null;
  requestId?: string | null;
};
