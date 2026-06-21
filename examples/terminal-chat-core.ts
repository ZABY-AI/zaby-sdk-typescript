import { LOCAL_ZABY_API_ORIGIN, type SseEvent } from "../src";

export type TerminalChatEnv = Partial<Record<
  | "ZABY_API_ORIGIN"
  | "ZABY_RUNTIME_TOKEN"
  | "ZABY_API_KEY"
  | "ZABY_EXTERNAL_APP_ID"
  | "ZABY_AGENT_DEPLOYMENT_ID"
  | "ZABY_EXTERNAL_USER_ID"
  | "ZABY_EXTERNAL_SESSION_ID",
  string
>>;

export type TerminalChatConfig =
  | {
      mode: "runtime-token";
      apiOrigin: string;
      runtimeToken: string;
    }
  | {
      mode: "server-mint";
      apiOrigin: string;
      apiKey: string;
      externalAppId: string;
      deploymentId: string;
      externalUserId: string;
      externalSessionId?: string;
    }
  | {
      mode: "missing";
      apiOrigin: string;
      message: string;
    };

export type ChatRole = "user" | "assistant" | "system";

export type ChatMessage = {
  id: string;
  role: ChatRole;
  content: string;
};

export type RuntimeEventReduction = {
  messages: ChatMessage[];
  status?: string;
};

export function resolveTerminalChatConfig(env: TerminalChatEnv): TerminalChatConfig {
  const apiOrigin = trim(env.ZABY_API_ORIGIN) ?? LOCAL_ZABY_API_ORIGIN;
  const runtimeToken = trim(env.ZABY_RUNTIME_TOKEN);
  if (runtimeToken) {
    return { mode: "runtime-token", apiOrigin, runtimeToken };
  }

  const apiKey = trim(env.ZABY_API_KEY);
  const externalAppId = trim(env.ZABY_EXTERNAL_APP_ID);
  const deploymentId = trim(env.ZABY_AGENT_DEPLOYMENT_ID);
  if (apiKey && externalAppId && deploymentId) {
    const externalSessionId = trim(env.ZABY_EXTERNAL_SESSION_ID);
    return {
      mode: "server-mint",
      apiOrigin,
      apiKey,
      externalAppId,
      deploymentId,
      externalUserId: trim(env.ZABY_EXTERNAL_USER_ID) ?? "terminal-user",
      ...(externalSessionId ? { externalSessionId } : {}),
    };
  }

  return {
    mode: "missing",
    apiOrigin,
    message: [
      "Set ZABY_RUNTIME_TOKEN to chat directly.",
      "Or set ZABY_API_KEY, ZABY_EXTERNAL_APP_ID, and ZABY_AGENT_DEPLOYMENT_ID to mint disposable runtime tokens.",
    ].join(" "),
  };
}

export function extractRunId(response: unknown): string {
  const object = asRecord(response);
  const runId = stringValue(object["runId"])
    ?? stringValue(object["id"])
    ?? stringValue(asRecord(object["run"])["id"]);
  if (!runId) {
    throw new Error("Runtime start response did not include a run id.");
  }
  return runId;
}

export function applyRuntimeEvent(messages: ChatMessage[], event: SseEvent): RuntimeEventReduction {
  const eventName = event.event ?? stringValue(asRecord(event.data)["type"]) ?? "";
  if (eventName === "TEXT_MESSAGE_CONTENT") {
    return appendAssistantDelta(messages, extractDelta(event.data));
  }
  if (eventName === "TEXT_MESSAGE_END") {
    return { messages, status: "ready" };
  }
  if (eventName === "RUN_ERROR") {
    return {
      messages: appendSystem(messages, event.id, `Run error: ${extractErrorMessage(event.data)}`),
      status: "error",
    };
  }
  if (eventName === "INTERRUPTION") {
    return {
      messages: appendSystem(messages, event.id, `Interrupted: ${stringValue(asRecord(event.data)["reason"]) ?? "approval required"}`),
      status: "approval required",
    };
  }
  if (eventName === "UI_BLOCK") {
    const block = asRecord(asRecord(event.data)["block"]);
    if (block["type"] === "approval-card") {
      return {
        messages: appendSystem(
          messages,
          event.id,
          `${stringValue(block["title"]) ?? "Approval required"}: ${stringValue(block["description"]) ?? "A tool call needs approval."}`,
        ),
        status: "approval required",
      };
    }
  }
  return { messages };
}

function appendAssistantDelta(messages: ChatMessage[], delta: string): RuntimeEventReduction {
  if (!delta) return { messages, status: "streaming" };
  const next = messages.slice();
  const last = next.at(-1);
  if (last?.role === "assistant" && last.id === "assistant-current") {
    next[next.length - 1] = { ...last, content: `${last.content}${delta}` };
  } else {
    next.push({ id: "assistant-current", role: "assistant", content: delta });
  }
  return { messages: next, status: "streaming" };
}

export function finalizeAssistantMessage(messages: ChatMessage[]) {
  return messages.map((message) => message.id === "assistant-current"
    ? { ...message, id: `assistant-${Date.now()}` }
    : message);
}

function appendSystem(messages: ChatMessage[], eventId: string | undefined, content: string) {
  return [
    ...messages,
    {
      id: `system-${eventId ?? Date.now()}`,
      role: "system" as const,
      content,
    },
  ];
}

function extractDelta(data: unknown) {
  const object = asRecord(data);
  return stringValue(object["delta"])
    ?? stringValue(object["content"])
    ?? stringValue(object["text"])
    ?? "";
}

function extractErrorMessage(data: unknown) {
  const object = asRecord(data);
  const error = asRecord(object["error"]);
  return stringValue(error["message"])
    ?? stringValue(object["message"])
    ?? "The run failed.";
}

function asRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" && !Array.isArray(value) ? value as Record<string, unknown> : {};
}

function stringValue(value: unknown) {
  return typeof value === "string" && value.length > 0 ? value : undefined;
}

function trim(value: string | undefined) {
  const normalized = value?.trim();
  return normalized || undefined;
}
