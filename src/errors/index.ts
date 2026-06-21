export type ZabyApiErrorInput = {
  status: number;
  message: string;
  code?: string;
  requestId?: string;
  retryAfter?: number;
  details?: unknown;
};

export class ZabyApiError extends Error {
  readonly status: number;
  readonly code?: string;
  readonly requestId?: string;
  readonly retryAfter?: number;
  readonly details?: unknown;

  constructor(input: ZabyApiErrorInput) {
    super(input.message);
    this.name = "ZabyApiError";
    this.status = input.status;
    if (input.code) this.code = input.code;
    if (input.requestId) this.requestId = input.requestId;
    if (input.retryAfter !== undefined) this.retryAfter = input.retryAfter;
    if (input.details !== undefined) this.details = input.details;
  }
}

export class ZabyAuthError extends ZabyApiError {
  constructor(input: ZabyApiErrorInput) {
    super(input);
    this.name = "ZabyAuthError";
  }
}

export class ZabyPermissionError extends ZabyApiError {
  constructor(input: ZabyApiErrorInput) {
    super(input);
    this.name = "ZabyPermissionError";
  }
}

export class ZabyValidationError extends ZabyApiError {
  constructor(input: ZabyApiErrorInput) {
    super(input);
    this.name = "ZabyValidationError";
  }
}

export class ZabyRateLimitError extends ZabyApiError {
  constructor(input: ZabyApiErrorInput) {
    super(input);
    this.name = "ZabyRateLimitError";
  }
}

export class ZabyRuntimeTokenExpiredError extends ZabyAuthError {
  constructor(input: ZabyApiErrorInput) {
    super(input);
    this.name = "ZabyRuntimeTokenExpiredError";
  }
}

export class ZabyRuntimeTokenExhaustedError extends ZabyPermissionError {
  constructor(input: ZabyApiErrorInput) {
    super(input);
    this.name = "ZabyRuntimeTokenExhaustedError";
  }
}

export class ZabyStreamError extends ZabyApiError {
  constructor(input: ZabyApiErrorInput) {
    super(input);
    this.name = "ZabyStreamError";
  }
}

export function createZabyApiError(input: ZabyApiErrorInput) {
  if (input.code === "MANAGED_AGENT_RUNTIME_TOKEN_EXPIRED") {
    return new ZabyRuntimeTokenExpiredError(input);
  }
  if (input.code === "MANAGED_AGENT_RUNTIME_TOKEN_GRANT_MAX_USES_EXCEEDED") {
    return new ZabyRuntimeTokenExhaustedError(input);
  }
  if (input.status === 429) return new ZabyRateLimitError(input);
  if (input.status === 401) return new ZabyAuthError(input);
  if (input.status === 403) return new ZabyPermissionError(input);
  if (input.status === 400 || input.status === 422) return new ZabyValidationError(input);
  return new ZabyApiError(input);
}
