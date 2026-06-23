/**
 * Full integration test from built dist — tests the REAL API surface
 * as a consumer would use it. Every method, every path, every option.
 */
import { describe, it, expect, afterEach } from "vitest";
import { configureZaby, resetZabyConfigForTests, Zaby, ZabyRuntime } from "../dist/index.js";
import { MockTransport } from "../dist/testing/index.js";
import {
  ZabyApiError, ZabyAuthError, ZabyValidationError,
  ZabyPermissionError, ZabyRateLimitError, ZabyStreamError,
  createZabyApiError,
} from "../dist/errors/index.js";

afterEach(() => resetZabyConfigForTests());

function transport(responses: any[] = []) {
  return new MockTransport(responses);
}

const R = (method: string, path: string, status = 200, json?: unknown, opts?: Record<string, any>) => ({
  method, path, status, ...(json !== undefined ? { json } : {}), ...opts,
});

// ===== DIST IMPORTS =====
describe("dist imports resolve", () => {
  it("all public API items", () => {
    expect(configureZaby).toBeTypeOf("function");
    expect(Zaby).toBeTypeOf("function");
    expect(ZabyRuntime).toBeTypeOf("function");
  });
  it("all error classes", () => {
    [ZabyApiError, ZabyAuthError, ZabyValidationError, ZabyPermissionError,
     ZabyRateLimitError, ZabyStreamError, createZabyApiError].forEach(c =>
      expect(c).toBeTypeOf("function"));
  });
  it("MockTransport", () => {
    const t = new MockTransport([]);
    expect(t.send).toBeTypeOf("function");
    expect(t.requests).toEqual([]);
  });
});

// ===== INSTANCE CONSTRUCTION =====
describe("instance construction", () => {
  it("Zaby with apiKey string", () => {
    const z = new Zaby({ apiKey: "pk_test", transport: transport() });
    expect(z).toBeInstanceOf(Zaby);
    ["health", "agents", "deployments", "externalApps", "runtimeTokens",
     "knowledgeBases", "mcp", "memory", "intelligence", "approvals", "usage"].forEach(k =>
      expect((z as any)[k]).toBeDefined());
  });
  it("Zaby with async apiKey provider", () => {
    const z = new Zaby({ apiKey: async () => "pk_dynamic", transport: transport() });
    expect(z).toBeInstanceOf(Zaby);
  });
  it("ZabyRuntime with token string", () => {
    const r = new ZabyRuntime({ token: "rt_test", transport: transport() });
    expect(r).toBeInstanceOf(ZabyRuntime);
    expect(r.runs).toBeDefined();
    expect(r.feedback).toBeDefined();
    expect(r.approvals).toBeDefined();
  });
  it("ZabyRuntime with async token provider", () => {
    const r = new ZabyRuntime({ token: async () => "rt_dynamic", transport: transport() });
    expect(r).toBeInstanceOf(ZabyRuntime);
  });
});

// ===== CONFIG → TRANSPORT PIPELINE =====
describe("config→transport pipeline", () => {
  it("apiKey sent as x-zaby-api-key header", async () => {
    const t = transport([R("GET", "/health", 200, { status: "ok" })]);
    await new Zaby({ apiKey: "pk_secret", transport: t }).health.check();
    expect(t.requests[0].headers["x-zaby-api-key"]).toBe("pk_secret");
  });
  it("accessToken sent as Authorization Bearer", async () => {
    const t = transport([R("GET", "/health", 200, { status: "ok" })]);
    await new Zaby({ apiKey: "pk", accessToken: "at_jwt", transport: t }).health.check();
    expect(t.requests[0].headers.authorization).toBe("Bearer at_jwt");
  });
  it("runtime token sent as Authorization Bearer", async () => {
    const t = transport([R("POST", "/api/v1/agent-runtime/runs", 200, { runId: "r1" })]);
    await new ZabyRuntime({ token: "rt_jwt", transport: t }).runs.start({ input: {} });
    expect(t.requests[0].headers.authorization).toBe("Bearer rt_jwt");
  });
  it("global configureZaby sets apiOrigin", async () => {
    configureZaby({ apiOrigin: "https://custom.io" });
    const t = transport([R("GET", "/health", 200, { status: "ok" })]);
    await new Zaby({ apiKey: "pk", transport: t }).health.check();
    expect(t.requests[0].url).toMatch(/^https:\/\/custom\.io\/health/);
  });
  it("instance config overrides global", async () => {
    configureZaby({ apiOrigin: "https://global.io" });
    const t = transport([R("GET", "/health", 200, { status: "ok" })]);
    await new Zaby({ apiKey: "pk", transport: t, config: { apiOrigin: "https://local.io" } }).health.check();
    expect(t.requests[0].url).toMatch(/^https:\/\/local\.io\/health/);
  });
  it("user-agent header sent when configured", async () => {
    configureZaby({ userAgent: "test/1.0" });
    const t = transport([R("GET", "/health", 200, { status: "ok" })]);
    await new Zaby({ apiKey: "pk", transport: t }).health.check();
    expect(t.requests[0].headers["user-agent"]).toBe("test/1.0");
  });
});

// ===== ALL CLIENT METHODS WITH REAL PATHS =====
describe("all client methods use correct paths", () => {
  // ZABY (API key) clients
  it("health.check() → GET /health", async () => {
    const t = transport([R("GET", "/health", 200, { status: "ok" })]);
    await new Zaby({ apiKey: "pk", transport: t }).health.check();
    expect(t.requests[0].method).toBe("GET");
    expect(t.requests[0].path).toBe("/health");
  });

  it("agents.create() → POST /api/v1/tenant/agents", async () => {
    const t = transport([R("POST", "/api/v1/tenant/agents", 200, { id: "a1" })]);
    await new Zaby({ apiKey: "pk", transport: t }).agents.create({ name: "a" });
    expect(t.requests[0].json).toEqual({ name: "a" });
  });

  it("agents.attachMcpTool() → POST /api/v1/tenant/agents/{id}/mcp-tools", async () => {
    const t = transport([R("POST", "/api/v1/tenant/agents/a1/mcp-tools", 200, {})]);
    await new Zaby({ apiKey: "pk", transport: t }).agents.attachMcpTool("a1", { toolId: "t1" });
    expect(t.requests[0].json).toEqual({ toolId: "t1" });
  });

  it("agents.attachKnowledgeBase() → POST /api/v1/tenant/agents/{id}/knowledge-bases", async () => {
    const t = transport([R("POST", "/api/v1/tenant/agents/a1/knowledge-bases", 200, {})]);
    await new Zaby({ apiKey: "pk", transport: t }).agents.attachKnowledgeBase("a1", { kbId: "kb1" });
  });

  it("agents.attachSkill() → POST /api/v1/tenant/agents/{id}/skills", async () => {
    const t = transport([R("POST", "/api/v1/tenant/agents/a1/skills", 200, {})]);
    await new Zaby({ apiKey: "pk", transport: t }).agents.attachSkill("a1", { skillId: "s1" });
  });

  it("agents.publish() → POST /api/v1/tenant/agents/{id}/publish", async () => {
    const t = transport([R("POST", "/api/v1/tenant/agents/a1/publish", 200, {})]);
    await new Zaby({ apiKey: "pk", transport: t }).agents.publish("a1");
  });

  it("agents.deploy() → POST /api/v1/tenant/agents/{id}/deployments", async () => {
    const t = transport([R("POST", "/api/v1/tenant/agents/a1/deployments", 200, {})]);
    await new Zaby({ apiKey: "pk", transport: t }).agents.deploy("a1", { config: {} });
  });

  it("agents.startRun() → POST /api/v1/tenant/agents/{id}/runs", async () => {
    const t = transport([R("POST", "/api/v1/tenant/agents/a1/runs", 200, { runId: "r1" })]);
    await new Zaby({ apiKey: "pk", transport: t }).agents.startRun("a1", { input: {} });
  });

  it("agents.getRunProgress() → GET /api/v1/tenant/agents/runs/{runId}/progress", async () => {
    const t = transport([R("GET", "/api/v1/tenant/agents/runs/r1/progress", 200, {})]);
    await new Zaby({ apiKey: "pk", transport: t }).agents.getRunProgress("r1");
  });

  it("agents.listRunEvents() → GET /api/v1/tenant/agents/runs/{runId}/events", async () => {
    const t = transport([R("GET", "/api/v1/tenant/agents/runs/r1/events", 200, {})]);
    await new Zaby({ apiKey: "pk", transport: t }).agents.listRunEvents("r1");
  });

  it("externalApps.list() → GET /api/v1/tenant/agents/external-apps", async () => {
    const t = transport([R("GET", "/api/v1/tenant/agents/external-apps", 200, { apps: [] })]);
    const result = await new Zaby({ apiKey: "pk", transport: t }).externalApps.list();
    expect(result).toEqual({ apps: [] });
  });

  it("externalApps.create() → POST /api/v1/tenant/agents/external-apps", async () => {
    const t = transport([R("POST", "/api/v1/tenant/agents/external-apps", 201, {})]);
    await new Zaby({ apiKey: "pk", transport: t }).externalApps.create({ name: "app1" });
  });

  it("externalApps.get() → GET /api/v1/tenant/agents/external-apps/{id}", async () => {
    const t = transport([R("GET", "/api/v1/tenant/agents/external-apps/e1", 200, {})]);
    await new Zaby({ apiKey: "pk", transport: t }).externalApps.get("e1");
  });

  it("externalApps.update() → PATCH /api/v1/tenant/agents/external-apps/{id}", async () => {
    const t = transport([R("PATCH", "/api/v1/tenant/agents/external-apps/e1", 200, {})]);
    await new Zaby({ apiKey: "pk", transport: t }).externalApps.update("e1", { name: "u" });
  });

  it("deployments.create() → POST /api/v1/tenant/agents/{id}/deployments", async () => {
    const t = transport([R("POST", "/api/v1/tenant/agents/a1/deployments", 200, {})]);
    await new Zaby({ apiKey: "pk", transport: t }).deployments.create("a1", {});
  });

  it("runtimeTokens.create() → POST /api/v1/provisioning/managed-agents/external-apps/{id}/runtime-tokens", async () => {
    const t = transport([R("POST", "/api/v1/provisioning/managed-agents/external-apps/e1/runtime-tokens", 200, {})]);
    await new Zaby({ apiKey: "pk", transport: t }).runtimeTokens.create({ externalAppId: "e1" });
  });

  it("approvals.list() → GET /api/v1/tenant/agents/approvals", async () => {
    const t = transport([R("GET", "/api/v1/tenant/agents/approvals", 200, { approvals: [] })]);
    await new Zaby({ apiKey: "pk", transport: t }).approvals.list();
  });

  it("usage.getAgentUsage() → GET /api/v1/tenant/agents/usage", async () => {
    const t = transport([R("GET", "/api/v1/tenant/agents/usage", 200, { usage: [] })]);
    await new Zaby({ apiKey: "pk", transport: t }).usage.getAgentUsage();
  });

  it("knowledgeBases.create() → POST /api/v1/tenant/knowledge-bases", async () => {
    const t = transport([R("POST", "/api/v1/tenant/knowledge-bases", 200, {})]);
    await new Zaby({ apiKey: "pk", transport: t }).knowledgeBases.create({ name: "kb1" });
  });

  it("knowledgeBases.retrieve() → POST /api/v1/tenant/knowledge-bases/{id}/retrieve", async () => {
    const t = transport([R("POST", "/api/v1/tenant/knowledge-bases/kb1/retrieve", 200, {})]);
    await new Zaby({ apiKey: "pk", transport: t }).knowledgeBases.retrieve("kb1", { query: "q" });
  });

  it("mcp.listCatalog() → GET /api/v1/tenant/mcp/catalog", async () => {
    const t = transport([R("GET", "/api/v1/tenant/mcp/catalog", 200, { tools: [] })]);
    await new Zaby({ apiKey: "pk", transport: t }).mcp.listCatalog();
  });

  it("mcp.createServer() → POST /api/v1/tenant/mcp/servers", async () => {
    const t = transport([R("POST", "/api/v1/tenant/mcp/servers", 200, {})]);
    await new Zaby({ apiKey: "pk", transport: t }).mcp.createServer({});
  });

  it("memory.listItems() → GET /api/v1/tenant/agents/memory-items", async () => {
    const t = transport([R("GET", "/api/v1/tenant/agents/memory-items", 200, { items: [] })]);
    await new Zaby({ apiKey: "pk", transport: t }).memory.listItems();
  });

  it("memory.retrieve() → POST /api/v1/tenant/agents/memory-retrievals", async () => {
    const t = transport([R("POST", "/api/v1/tenant/agents/memory-retrievals", 200, { results: [] })]);
    await new Zaby({ apiKey: "pk", transport: t }).memory.retrieve({ text: "hello" });
  });

  it("intelligence.listSignals() → GET /api/v1/tenant/agents/intelligence/signals", async () => {
    const t = transport([R("GET", "/api/v1/tenant/agents/intelligence/signals", 200, {})]);
    await new Zaby({ apiKey: "pk", transport: t }).intelligence.listSignals();
  });

  // RUNTIME clients
  it("runtime.runs.start() → POST /api/v1/agent-runtime/runs", async () => {
    const t = transport([R("POST", "/api/v1/agent-runtime/runs", 200, { runId: "r1" })]);
    await new ZabyRuntime({ token: "rt", transport: t }).runs.start({ input: { msg: "hi" } });
    expect(t.requests[0].json).toEqual({ input: { msg: "hi" } });
  });

  it("runtime.runs.events() → GET /api/v1/agent-runtime/runs/{runId}/events", async () => {
    const t = transport([R("GET", "/api/v1/agent-runtime/runs/r1/events", 200, { events: [] })]);
    await new ZabyRuntime({ token: "rt", transport: t }).runs.events("r1");
  });

  it("runtime.runs.stream() → GET /api/v1/agent-runtime/runs/{runId}/aiui", async () => {
    const t = transport([R("GET", "/api/v1/agent-runtime/runs/r1/aiui", 200, {}, {
      body: 'data: {"event":"thinking","content":"..."}\n\ndata: {"event":"result","content":"done"}\n\n',
    })]);
    const events: any[] = [];
    for await (const e of new ZabyRuntime({ token: "rt", transport: t }).runs.stream("r1")) {
      events.push(e);
    }
    expect(events).toHaveLength(2);
    expect(events[0].data).toEqual({ event: "thinking", content: "..." });
  });

  it("runtime.feedback.create() → POST /api/v1/agent-runtime/runs/{runId}/feedback", async () => {
    const t = transport([R("POST", "/api/v1/agent-runtime/runs/r1/feedback", 200, {})]);
    await new ZabyRuntime({ token: "rt", transport: t }).feedback.create("r1", { rating: 5 });
  });

  it("runtime.approvals.approve() → POST /api/v1/agent-runtime/runs/{runId}/approvals/{approvalId}/approve", async () => {
    const t = transport([R("POST", "/api/v1/agent-runtime/runs/r1/approvals/app1/approve", 200, {})]);
    await new ZabyRuntime({ token: "rt", transport: t }).approvals.approve("r1", "app1");
  });

  it("runtime.approvals.reject() → POST /api/v1/agent-runtime/runs/{runId}/approvals/{approvalId}/reject", async () => {
    const t = transport([R("POST", "/api/v1/agent-runtime/runs/r1/approvals/app1/reject", 200, {})]);
    await new ZabyRuntime({ token: "rt", transport: t }).approvals.reject("r1", "app1");
  });
});

// ===== ERROR HANDLING =====
describe("error handling integration", () => {
  function mkErrTransport(status: number, code?: string) {
    return transport([R("GET", "/health", status, { error: { message: "fail", code } })]);
  }
  it("401 → ZabyAuthError", async () => {
    await expect(new Zaby({ apiKey: "pk", transport: mkErrTransport(401, "INVALID_API_KEY") }).health.check())
      .rejects.toThrow(ZabyAuthError);
  });
  it("403 → ZabyPermissionError", async () => {
    await expect(new Zaby({ apiKey: "pk", transport: mkErrTransport(403, "FORBIDDEN") }).health.check())
      .rejects.toThrow(ZabyPermissionError);
  });
  it("400 → ZabyValidationError", async () => {
    await expect(new Zaby({ apiKey: "pk", transport: mkErrTransport(400, "BAD") }).health.check())
      .rejects.toThrow(ZabyValidationError);
  });
  it("429 → ZabyRateLimitError", async () => {
    await expect(new Zaby({ apiKey: "pk", transport: mkErrTransport(429, "RATE_LIMITED") }).health.check())
      .rejects.toThrow(ZabyRateLimitError);
  });
  it("500 → ZabyApiError (generic)", async () => {
    await expect(new Zaby({ apiKey: "pk", transport: mkErrTransport(500, "ERR") }).health.check())
      .rejects.toThrow(ZabyApiError);
  });
  it("error includes headers from response", async () => {
    const t = transport([{
      method: "GET", path: "/health", status: 400,
      headers: { "x-request-id": "req-abc" },
      json: { error: { message: "bad", code: "BAD" } },
    }]);
    try { await new Zaby({ apiKey: "pk", transport: t }).health.check(); }
    catch (e: unknown) {
      expect((e as ZabyApiError).requestId).toBe("req-abc");
    }
  });
  it("error includes retryAfter from header", async () => {
    const t = transport([{
      method: "GET", path: "/health", status: 429,
      headers: { "retry-after": "5" },
      json: { error: { message: "too fast", code: "RATE_LIMITED" } },
    }]);
    try { await new Zaby({ apiKey: "pk", transport: t }).health.check(); }
    catch (e: unknown) {
      expect((e as ZabyRateLimitError).retryAfter).toBe(5);
    }
  });
});

// ===== BUG-NEW-INTEGRATION: Found bugs =====
describe("BUGS FOUND via integration test", () => {
  it("BUG-INT-001 fixed: HealthClient.check() forwards requestId and signal options", async () => {
    const t = transport([R("GET", "/health", 200, { status: "ok" })]);
    const zaby = new Zaby({ apiKey: "pk", transport: t });
    await zaby.health.check({ requestId: "req_abc" });
    expect(t.requests[0].headers["x-request-id"]).toBe("req_abc");
  });

  it("BUG-INT-002: createZabyApiError with status 0 gives generic ZabyApiError, not ZabyStreamError", async () => {
    const err = createZabyApiError({ status: 0, message: "network" });
    expect(err).toBeInstanceOf(ZabyApiError);
    expect(err).not.toBeInstanceOf(ZabyStreamError);
  });

  it("BUG-INT-003: RunEvents uses unsafe cast query as any", async () => {
    const t = transport([R("GET", "/api/v1/tenant/agents/runs/r1/events?key=value", 200, {})]);
    await new Zaby({ apiKey: "pk", transport: t }).agents.listRunEvents("r1", { key: "value" } as any);
    // The cast (query as Record<string, string | number | boolean | null | undefined>)
    // is used at agents.ts:48 — same pattern as BUG-009
    expect(t.requests[0].path).toBe("/api/v1/tenant/agents/runs/r1/events?key=value");
  });

  it("BUG-INT-004: RuntimeRunsClient.events uses query as any cast", async () => {
    const t = transport([R("GET", "/api/v1/agent-runtime/runs/r1/events?key=value", 200, {})]);
    await new ZabyRuntime({ token: "rt", transport: t }).runs.events("r1", { key: "value" } as any);
    expect(t.requests[0].path).toContain("key=value");
  });

  it("BUG-INT-005: DeploymentsClient and RuntimeTokensClient have no list() method", () => {
    const z = new Zaby({ apiKey: "pk", transport: transport() });
    expect((z.deployments as any).list).toBeUndefined();
    expect((z.runtimeTokens as any).list).toBeUndefined();
  });

  it("BUG-INT-006: memory.query() does not exist - use memory.retrieve() instead", () => {
    const z = new Zaby({ apiKey: "pk", transport: transport() });
    expect((z.memory as any).query).toBeUndefined();
    expect(z.memory.retrieve).toBeTypeOf("function");
  });

  it("BUG-INT-007: intelligence.query() does not exist", () => {
    const z = new Zaby({ apiKey: "pk", transport: transport() });
    expect((z.intelligence as any).query).toBeUndefined();
  });

  it("BUG-INT-008: runtime.approvals has no list() - only approve() and reject()", () => {
    const r = new ZabyRuntime({ token: "rt", transport: transport() });
    expect((r.approvals as any).list).toBeUndefined();
    expect(r.approvals.approve).toBeTypeOf("function");
    expect(r.approvals.reject).toBeTypeOf("function");
  });

  it("BUG-INT-009: runtime.feedback uses create(runId, input) not submit(input)", () => {
    const r = new ZabyRuntime({ token: "rt", transport: transport() });
    expect((r.feedback as any).submit).toBeUndefined();
    expect(r.feedback.create).toBeTypeOf("function");
  });
});
