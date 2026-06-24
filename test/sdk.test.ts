import { afterEach, describe, expect, it, vi } from "vitest";
import {
  DEFAULT_ZABY_API_ORIGIN,
  Zaby,
  ZabyRuntime,
  configureZaby,
  resetZabyConfigForTests,
} from "../src";
import { MockTransport } from "../src/testing";

afterEach(() => {
  resetZabyConfigForTests();
});

describe("configuration", () => {
  it("uses genapi.zaby.io as the default API origin", async () => {
    const transport = new MockTransport([
      { method: "GET", path: "/health", json: { status: "ok" } },
    ]);
    const zaby = new Zaby({ apiKey: "zaby_pk_test", transport });

    await zaby.health.check();

    expect(DEFAULT_ZABY_API_ORIGIN).toBe("https://genapi.zaby.io");
    expect(transport.requests[0]?.url).toBe("https://genapi.zaby.io/health");
  });

  it("lets app config override the API origin without passing a base URL to the client", async () => {
    configureZaby({ apiOrigin: "https://staging-api.example.com/" });
    const transport = new MockTransport([
      { method: "GET", path: "/health", json: { status: "ok" } },
    ]);
    const zaby = new Zaby({ apiKey: "zaby_pk_test", transport });

    await zaby.health.check();

    expect(transport.requests[0]?.url).toBe("https://staging-api.example.com/health");
  });
});

describe("server SDK", () => {
  it("sends tenant API keys and creates managed agents on the Agentic OS tenant path", async () => {
    const transport = new MockTransport([
      { method: "POST", path: "/api/v1/tenant/agents", json: { id: "agent_1" }, status: 201 },
    ]);
    const zaby = new Zaby({ apiKey: "zaby_pk_test", transport });

    const agent = await zaby.agents.create({
      slug: "support",
      name: "Support Agent",
      provider: "groq",
    });

    expect(agent).toEqual({ id: "agent_1" });
    expect(transport.requests[0]?.headers["x-zaby-api-key"]).toBe("zaby_pk_test");
    expect(transport.requests[0]?.json).toMatchObject({ slug: "support", name: "Support Agent" });
  });

  it("can send a tenant bearer access token alongside the tenant API key", async () => {
    const tokenProvider = vi.fn(async () => "tenant_access_token");
    const transport = new MockTransport([
      { method: "POST", path: "/api/v1/tenant/agents", json: { id: "agent_1" }, status: 201 },
    ]);
    const zaby = new Zaby({ apiKey: "zaby_pk_test", accessToken: tokenProvider, transport });

    await zaby.agents.create({
      slug: "support",
      name: "Support Agent",
      provider: "groq",
    });

    expect(tokenProvider).toHaveBeenCalledOnce();
    expect(transport.requests[0]?.headers["x-zaby-api-key"]).toBe("zaby_pk_test");
    expect(transport.requests[0]?.headers.authorization).toBe("Bearer tenant_access_token");
  });

  it("mints disposable runtime tokens through the provisioning API surface", async () => {
    const transport = new MockTransport([
      {
        method: "POST",
        path: "/api/v1/provisioning/managed-agents/external-apps/app_1/runtime-tokens",
        status: 201,
        json: { token: "runtime_token", tokenType: "Bearer", expiresAt: "2026-06-21T12:00:00.000Z" },
      },
      {
        method: "POST",
        path: "/api/v1/provisioning/managed-agents/runs/run_1/feedback",
        json: { accepted: true },
      },
    ]);
    const zaby = new Zaby({ apiKey: "zaby_pk_test", transport });

    const token = await zaby.runtimeTokens.create({
      externalAppId: "app_1",
      deploymentId: "dep_1",
      externalUserId: "user_1",
      ttlSeconds: 600,
      maxUses: 20,
    });

    expect(token.token).toBe("runtime_token");
    expect(transport.requests[0]?.json).toMatchObject({ deploymentId: "dep_1", externalUserId: "user_1" });
    await zaby.runtimeTokens.recordFeedback("run_1", { rating: 5, label: "helpful" });
    expect(transport.requests[1]?.json).toMatchObject({ rating: 5, label: "helpful" });
  });

  it("routes KB, MCP, memory, intelligence, approval, and usage helpers to Agentic OS APIs", async () => {
    const transport = new MockTransport([
      { method: "POST", path: "/api/v1/tenant/knowledge-bases", status: 201, json: { id: "kb_1" } },
      { method: "POST", path: "/api/v1/tenant/knowledge-library/documents/text", status: 201, json: { id: "doc_1" } },
      { method: "GET", path: "/api/v1/tenant/knowledge-library/documents?limit=10", json: { data: [] } },
      { method: "POST", path: "/api/v1/tenant/mcp/installations/inst_1/tools/search/preflight", json: { allowed: true } },
      { method: "POST", path: "/api/v1/tenant/agents/memory-retrievals", json: { items: [] } },
      { method: "GET", path: "/api/v1/tenant/agents/intelligence/signals?agentId=agent_1", json: { items: [] } },
      { method: "POST", path: "/api/v1/tenant/agents/runs/run_1/approvals/appr_1/approve", json: { status: "APPROVED" } },
      { method: "GET", path: "/api/v1/tenant/agents/usage?agentId=agent_1", json: { totalRuns: 1 } },
    ]);
    const zaby = new Zaby({ apiKey: "zaby_pk_test", transport });

    await zaby.knowledgeBases.create({ name: "Product KB" });
    await zaby.knowledgeBases.createLibraryTextDocument({ title: "Product Notes", content: "hello" });
    await zaby.knowledgeBases.listLibraryDocuments({ limit: 10 });
    await zaby.mcp.preflightInvocation("inst_1", "search", { arguments: { q: "refund" } });
    await zaby.memory.retrieve({ agentId: "agent_1", query: "What does this user prefer?" });
    await zaby.intelligence.listSignals({ agentId: "agent_1" });
    await zaby.approvals.approve("run_1", "appr_1");
    await zaby.usage.getAgentUsage({ agentId: "agent_1" });

    expect(transport.requests.map((request) => request.path)).toEqual([
      "/api/v1/tenant/knowledge-bases",
      "/api/v1/tenant/knowledge-library/documents/text",
      "/api/v1/tenant/knowledge-library/documents?limit=10",
      "/api/v1/tenant/mcp/installations/inst_1/tools/search/preflight",
      "/api/v1/tenant/agents/memory-retrievals",
      "/api/v1/tenant/agents/intelligence/signals?agentId=agent_1",
      "/api/v1/tenant/agents/runs/run_1/approvals/appr_1/approve",
      "/api/v1/tenant/agents/usage?agentId=agent_1",
    ]);
  });

  it("normalizes API errors with status, code, request id, and retry metadata", async () => {
    const transport = new MockTransport([
      {
        method: "GET",
        path: "/api/v1/tenant/agents/usage",
        status: 429,
        headers: { "x-request-id": "req_123", "retry-after": "4" },
        json: { message: "Too many requests", code: "RATE_LIMITED" },
      },
    ]);
    const zaby = new Zaby({ apiKey: "zaby_pk_test", transport });

    await expect(zaby.usage.getAgentUsage()).rejects.toMatchObject({
      name: "ZabyRateLimitError",
      status: 429,
      code: "RATE_LIMITED",
      requestId: "req_123",
      retryAfter: 4,
    });
  });
});

describe("runtime SDK", () => {
  it("uses bearer disposable tokens for runtime runs", async () => {
    const transport = new MockTransport([
      { method: "POST", path: "/api/v1/agent-runtime/runs", status: 201, json: { runId: "run_1" } },
    ]);
    const runtime = new ZabyRuntime({ token: "runtime_token", transport });

    await runtime.runs.start({ input: { message: "hello" } });

    expect(transport.requests[0]?.headers.authorization).toBe("Bearer runtime_token");
    expect(transport.requests[0]?.json).toEqual({ input: { message: "hello" } });
  });

  it("streams AIUI SSE events as an async iterable", async () => {
    const stream = [
      'id: 1\nevent: TEXT_MESSAGE_CONTENT\ndata: {"type":"TEXT_MESSAGE_CONTENT","delta":"Hel"}\n\n',
      'id: 2\nevent: TEXT_MESSAGE_CONTENT\ndata: {"type":"TEXT_MESSAGE_CONTENT","delta":"lo"}\n\n',
    ].join("");
    const transport = new MockTransport([
      { method: "GET", path: "/api/v1/agent-runtime/runs/run_1/aiui", body: stream, headers: { "content-type": "text/event-stream" } },
    ]);
    const runtime = new ZabyRuntime({ token: "runtime_token", transport });

    const events = [];
    for await (const event of runtime.runs.stream("run_1")) {
      events.push(event);
    }

    expect(events).toEqual([
      { id: "1", event: "TEXT_MESSAGE_CONTENT", data: { type: "TEXT_MESSAGE_CONTENT", delta: "Hel" } },
      { id: "2", event: "TEXT_MESSAGE_CONTENT", data: { type: "TEXT_MESSAGE_CONTENT", delta: "lo" } },
    ]);
  });

  it("maps expired and exhausted disposable token failures to runtime-specific errors", async () => {
    const transport = new MockTransport([
      {
        method: "POST",
        path: "/api/v1/agent-runtime/runs",
        status: 401,
        json: { message: "Managed agent runtime token has expired.", code: "MANAGED_AGENT_RUNTIME_TOKEN_EXPIRED" },
      },
      {
        method: "POST",
        path: "/api/v1/agent-runtime/runs",
        status: 403,
        json: {
          message: "Managed agent runtime token grant has exhausted its max uses.",
          code: "MANAGED_AGENT_RUNTIME_TOKEN_GRANT_MAX_USES_EXCEEDED",
        },
      },
    ]);
    const runtime = new ZabyRuntime({ token: "runtime_token", transport });

    await expect(runtime.runs.start({ input: {} })).rejects.toMatchObject({
      name: "ZabyRuntimeTokenExpiredError",
    });
    await expect(runtime.runs.start({ input: {} })).rejects.toMatchObject({
      name: "ZabyRuntimeTokenExhaustedError",
    });
  });

  it("allows dynamic token providers", async () => {
    const tokenProvider = vi.fn(async () => "fresh_runtime_token");
    const transport = new MockTransport([
      { method: "POST", path: "/api/v1/agent-runtime/runs/run_1/feedback", json: { ok: true } },
    ]);
    const runtime = new ZabyRuntime({ token: tokenProvider, transport });

    await runtime.feedback.create("run_1", { rating: 5 });

    expect(tokenProvider).toHaveBeenCalledOnce();
    expect(transport.requests[0]?.headers.authorization).toBe("Bearer fresh_runtime_token");
  });
});
