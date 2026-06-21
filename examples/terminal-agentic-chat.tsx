import React, { useCallback, useEffect, useMemo, useState } from "react";
import { Box, render, Text, useApp, useInput } from "ink";
import TextInput from "ink-text-input";
import { configureZaby, Zaby, ZabyRuntime } from "../src";
import {
  applyRuntimeEvent,
  extractRunId,
  finalizeAssistantMessage,
  resolveTerminalChatConfig,
  type ChatMessage,
  type TerminalChatConfig,
} from "./terminal-chat-core";

type ChatStatus = "booting" | "ready" | "minting token" | "starting run" | "streaming" | "approval required" | "error";

function TerminalAgenticChat() {
  const app = useApp();
  const config = useMemo(() => resolveTerminalChatConfig(process.env), []);
  const [runtime, setRuntime] = useState<ZabyRuntime | null>(null);
  const [input, setInput] = useState("");
  const [messages, setMessages] = useState<ChatMessage[]>([
    { id: "system-welcome", role: "system", content: "Welcome to Zaby Agentic Chat. Type /help for commands." },
  ]);
  const [status, setStatus] = useState<ChatStatus>("booting");
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    async function boot() {
      configureZaby({ apiOrigin: config.apiOrigin });
      if (config.mode === "missing") {
        setError(config.message);
        setStatus("error");
        return;
      }
      try {
        const token = config.mode === "runtime-token"
          ? config.runtimeToken
          : await mintRuntimeToken(config, setStatus);
        if (cancelled) return;
        setRuntime(new ZabyRuntime({ token }));
        setStatus("ready");
      } catch (caught) {
        if (cancelled) return;
        setError(errorMessage(caught));
        setStatus("error");
      }
    }
    void boot();
    return () => {
      cancelled = true;
    };
  }, [config]);

  useInput((_input, key) => {
    if (key.escape) app.exit();
  });

  const submit = useCallback(async (value: string) => {
    const message = value.trim();
    if (!message) return;
    setInput("");

    if (message === "/exit") {
      app.exit();
      return;
    }
    if (message === "/clear") {
      setMessages([]);
      setStatus("ready");
      return;
    }
    if (message === "/help") {
      setMessages((current) => [
        ...current,
        {
          id: `system-help-${Date.now()}`,
          role: "system",
          content: "Commands: /help, /clear, /exit. Submit any other text to start a Zaby runtime run.",
        },
      ]);
      return;
    }
    if (!runtime) {
      setError("Runtime is not ready yet.");
      setStatus("error");
      return;
    }

    setError(null);
    setStatus("starting run");
    setMessages((current) => [
      ...finalizeAssistantMessage(current),
      { id: `user-${Date.now()}`, role: "user", content: message },
    ]);

    try {
      const run = await runtime.runs.start({ input: { message } });
      const runId = extractRunId(run);
      setStatus("streaming");
      for await (const event of runtime.runs.stream(runId)) {
        setMessages((current) => {
          const reduction = applyRuntimeEvent(current, event);
          if (reduction.status) setStatus(reduction.status as ChatStatus);
          return reduction.messages;
        });
      }
      setMessages((current) => finalizeAssistantMessage(current));
      setStatus("ready");
    } catch (caught) {
      const messageText = errorMessage(caught);
      setError(messageText);
      setStatus("error");
      setMessages((current) => [
        ...current,
        { id: `system-error-${Date.now()}`, role: "system", content: `Error: ${messageText}` },
      ]);
    }
  }, [app, runtime]);

  return (
    <Box flexDirection="column" paddingX={1}>
      <Header config={config} status={status} />
      <Box flexDirection="column" minHeight={12} marginY={1}>
        {messages.slice(-14).map((message) => (
          <MessageLine key={message.id} message={message} />
        ))}
      </Box>
      {error ? (
        <Text color="red">Error: {error}</Text>
      ) : (
        <Text color="gray">Press Esc or type /exit to quit.</Text>
      )}
      <Box marginTop={1}>
        <Text color="cyan">you </Text>
        <TextInput
          value={input}
          onChange={setInput}
          onSubmit={submit}
          placeholder={runtime ? "Ask your agent..." : "Waiting for runtime..."}
        />
      </Box>
    </Box>
  );
}

function Header({ config, status }: { config: TerminalChatConfig; status: ChatStatus }) {
  const mode = config.mode === "missing" ? "not configured" : config.mode;
  return (
    <Box flexDirection="column" borderStyle="round" borderColor={status === "error" ? "red" : "cyan"} paddingX={1}>
      <Text bold>Zaby Agentic Chat</Text>
      <Text color="gray">origin: {config.apiOrigin} | auth: {mode} | status: {status}</Text>
    </Box>
  );
}

function MessageLine({ message }: { message: ChatMessage }) {
  if (message.role === "user") {
    return <Text><Text color="green">you</Text> {message.content}</Text>;
  }
  if (message.role === "assistant") {
    return <Text><Text color="cyan">agent</Text> {message.content}</Text>;
  }
  return <Text color="yellow">system {message.content}</Text>;
}

async function mintRuntimeToken(config: Extract<TerminalChatConfig, { mode: "server-mint" }>, setStatus: (status: ChatStatus) => void) {
  setStatus("minting token");
  const zaby = new Zaby({ apiKey: config.apiKey });
  const token = await zaby.runtimeTokens.create({
    externalAppId: config.externalAppId,
    deploymentId: config.deploymentId,
    externalUserId: config.externalUserId,
    externalSessionId: config.externalSessionId,
    channel: "server",
    ttlSeconds: 600,
    maxUses: 100,
  });
  return token.token;
}

function errorMessage(error: unknown) {
  return error instanceof Error ? error.message : String(error);
}

if (!process.stdin.isTTY) {
  console.log("Zaby Agentic Chat requires an interactive terminal. Run `npm run example:chat` from a TTY.");
} else {
  render(<TerminalAgenticChat />);
}
