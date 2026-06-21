export type JsonPrimitive = string | number | boolean | null;
export type JsonValue = JsonPrimitive | JsonObject | JsonValue[];
export type JsonObject = { [key: string]: JsonValue | undefined };

export type MaybePromise<T> = T | Promise<T>;

export type ZabyApiKeyProvider = string | (() => MaybePromise<string>);
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
  agentSessionId?: string;
  externalAppId?: string;
  deploymentId?: string;
};

export type SseEvent<T = unknown> = {
  id?: string;
  event?: string;
  data: T;
};
