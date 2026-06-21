import { describe, expect, it } from "vitest";
import {
  applyRuntimeEvent,
  extractRunId,
  resolveTerminalChatConfig,
  type ChatMessage,
} from "../examples/terminal-chat-core";

describe("terminal chat config", () => {
  it("uses runtime-token mode when ZABY_RUNTIME_TOKEN is present", () => {
    const config = resolveTerminalChatConfig({
      ZABY_RUNTIME_TOKEN: "runtime-token",
      ZABY_API_KEY: "zaby_pk_ignored",
      ZABY_EXTERNAL_APP_ID: "app_ignored",
      ZABY_AGENT_DEPLOYMENT_ID: "dep_ignored",
    });

    expect(config).toEqual({
      mode: "runtime-token",
      apiOrigin: "http://localhost:9080",
      runtimeToken: "runtime-token",
    });
  });

  it("uses server-mint mode when API key, external app, and deployment are present", () => {
    const config = resolveTerminalChatConfig({
      ZABY_API_ORIGIN: "https://genapi.zaby.io",
      ZABY_API_KEY: "zaby_pk_test",
      ZABY_EXTERNAL_APP_ID: "app_1",
      ZABY_AGENT_DEPLOYMENT_ID: "dep_1",
      ZABY_EXTERNAL_USER_ID: "user_1",
      ZABY_EXTERNAL_SESSION_ID: "session_1",
    });

    expect(config).toEqual({
      mode: "server-mint",
      apiOrigin: "https://genapi.zaby.io",
      apiKey: "zaby_pk_test",
      externalAppId: "app_1",
      deploymentId: "dep_1",
      externalUserId: "user_1",
      externalSessionId: "session_1",
    });
  });

  it("returns missing environment guidance for incomplete auth", () => {
    const config = resolveTerminalChatConfig({
      ZABY_API_KEY: "zaby_pk_test",
    });

    expect(config.mode).toBe("missing");
    if (config.mode !== "missing") throw new Error("Expected missing config");
    expect(config.message).toContain("ZABY_RUNTIME_TOKEN");
    expect(config.message).toContain("ZABY_EXTERNAL_APP_ID");
  });
});

describe("terminal chat runtime helpers", () => {
  it("extracts run IDs from common response shapes", () => {
    expect(extractRunId({ runId: "run_1" })).toBe("run_1");
    expect(extractRunId({ id: "run_2" })).toBe("run_2");
    expect(extractRunId({ run: { id: "run_3" } })).toBe("run_3");
  });

  it("rejects run responses that do not contain a run ID", () => {
    expect(() => extractRunId({ ok: true })).toThrow("run id");
  });

  it("reduces streamed text deltas into one assistant message", () => {
    const messages: ChatMessage[] = [
      { id: "u1", role: "user", content: "hello" },
    ];

    const afterFirst = applyRuntimeEvent(messages, {
      id: "1",
      event: "TEXT_MESSAGE_CONTENT",
      data: { type: "TEXT_MESSAGE_CONTENT", delta: "Hel" },
    });
    const afterSecond = applyRuntimeEvent(afterFirst.messages, {
      id: "2",
      event: "TEXT_MESSAGE_CONTENT",
      data: { type: "TEXT_MESSAGE_CONTENT", delta: "lo" },
    });

    expect(afterSecond.messages).toEqual([
      { id: "u1", role: "user", content: "hello" },
      { id: "assistant-current", role: "assistant", content: "Hello" },
    ]);
  });

  it("renders approval interruptions as system notices", () => {
    const result = applyRuntimeEvent([], {
      id: "4",
      event: "UI_BLOCK",
      data: {
        type: "UI_BLOCK",
        block: {
          type: "approval-card",
          title: "Approval required",
          description: "Search tool needs approval",
        },
      },
    });

    expect(result.messages).toEqual([
      {
        id: "system-4",
        role: "system",
        content: "Approval required: Search tool needs approval",
      },
    ]);
    expect(result.status).toBe("approval required");
  });
});
