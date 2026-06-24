import { afterEach, describe, expect, it, vi } from "vitest";
import { Zaby, ZabyRuntime, configureZaby, resetZabyConfigForTests } from "../src";
import { MockTransport } from "../src/testing";

afterEach(() => {
  resetZabyConfigForTests();
});

describe("Zaby (server SDK) — auth headers", () => {
  it("sends x-zaby-api-key from string", async () => {
    const transport = new MockTransport([
      { method: "GET", path: "/api/v1/tenant/agents/usage", json: {} },
    ]);
    const zaby = new Zaby({ apiKey: "zaby_pk_test", transport });
    await zaby.usage.getAgentUsage();
    expect(transport.requests[0]?.headers["x-zaby-api-key"]).toBe("zaby_pk_test");
  });

  it("sends x-zaby-api-key from function provider", async () => {
    const transport = new MockTransport([
      { method: "GET", path: "/api/v1/tenant/agents/usage", json: {} },
    ]);
    const zaby = new Zaby({ apiKey: () => "key_from_fn", transport });
    await zaby.usage.getAgentUsage();
    expect(transport.requests[0]?.headers["x-zaby-api-key"]).toBe("key_from_fn");
  });

  it("sends optional bearer access token", async () => {
    const transport = new MockTransport([
      { method: "GET", path: "/api/v1/tenant/agents/usage", json: {} },
    ]);
    const zaby = new Zaby({
      apiKey: "test",
      accessToken: "tenant_token",
      transport,
    });
    await zaby.usage.getAgentUsage();
    expect(transport.requests[0]?.headers.authorization).toBe("Bearer tenant_token");
  });
});

describe("ZabyRuntime (runtime SDK) — auth headers", () => {
  it("sends authorization bearer from string", async () => {
    const transport = new MockTransport([
      { method: "POST", path: "/api/v1/agent-runtime/runs", status: 201, json: { runId: "r1" } },
    ]);
    const runtime = new ZabyRuntime({ token: "my_token", transport });
    await runtime.runs.start({ input: {} });
    expect(transport.requests[0]?.headers.authorization).toBe("Bearer my_token");
  });

  it("sends authorization bearer from function provider", async () => {
    const transport = new MockTransport([
      { method: "POST", path: "/api/v1/agent-runtime/runs", status: 201, json: { runId: "r1" } },
    ]);
    const runtime = new ZabyRuntime({ token: () => "fresh_token", transport });
    await runtime.runs.start({ input: {} });
    expect(transport.requests[0]?.headers.authorization).toBe("Bearer fresh_token");
  });
});

describe("Zaby — all client URL routing", () => {
  function createTransport(responses: any[]) {
    return new MockTransport(responses);
  }

  it("routes agents.create correctly", async () => {
    const transport = createTransport([
      { method: "POST", path: "/api/v1/tenant/agents", status: 201, json: { id: "a1" } },
    ]);
    const zaby = new Zaby({ apiKey: "test", transport });
    await zaby.agents.create({ name: "test" });
    expect(transport.requests[0]?.path).toBe("/api/v1/tenant/agents");
  });

  it("routes agents.attachMcpTool correctly", async () => {
    const transport = createTransport([
      { method: "POST", path: "/api/v1/tenant/agents/agent_1/mcp-tools", json: {} },
    ]);
    const zaby = new Zaby({ apiKey: "test", transport });
    await zaby.agents.attachMcpTool("agent_1", {});
    expect(transport.requests[0]?.path).toBe("/api/v1/tenant/agents/agent_1/mcp-tools");
  });

  it("routes agents.deploy correctly", async () => {
    const transport = createTransport([
      { method: "POST", path: "/api/v1/tenant/agents/agent_1/deployments", json: {} },
    ]);
    const zaby = new Zaby({ apiKey: "test", transport });
    await zaby.agents.deploy("agent_1", {});
    expect(transport.requests[0]?.path).toBe("/api/v1/tenant/agents/agent_1/deployments");
  });

  it("routes runtimeTokens.create correctly", async () => {
    const transport = createTransport([
      {
        method: "POST",
        path: "/api/v1/provisioning/managed-agents/external-apps/app_1/runtime-tokens",
        status: 201,
        json: { token: "tok", tokenType: "Bearer", expiresAt: "2026-01-01" },
      },
    ]);
    const zaby = new Zaby({ apiKey: "test", transport });
    await zaby.runtimeTokens.create({
      externalAppId: "app_1",
      deploymentId: "dep_1",
    });
    expect(transport.requests[0]?.path).toBe(
      "/api/v1/provisioning/managed-agents/external-apps/app_1/runtime-tokens"
    );
  });

  it("strips externalAppId from runtime token body", async () => {
    const transport = createTransport([
      {
        method: "POST",
        path: "/api/v1/provisioning/managed-agents/external-apps/app_1/runtime-tokens",
        status: 201,
        json: { token: "tok", tokenType: "Bearer", expiresAt: "2026-01-01" },
      },
    ]);
    const zaby = new Zaby({ apiKey: "test", transport });
    await zaby.runtimeTokens.create({
      externalAppId: "app_1",
      deploymentId: "dep_1",
      ttlSeconds: 600,
    });
    const body = transport.requests[0]?.json;
    expect(body).not.toHaveProperty("externalAppId");
    expect(body.deploymentId).toBe("dep_1");
    expect(body.ttlSeconds).toBe(600);
  });

  it("routes mcp methods correctly", async () => {
    const transport = createTransport([
      { method: "GET", path: "/api/v1/tenant/mcp/catalog", json: [] },
      { method: "POST", path: "/api/v1/tenant/mcp/servers", json: { id: "s1" } },
      { method: "POST", path: "/api/v1/tenant/mcp/installations", json: {} },
    ]);
    const zaby = new Zaby({ apiKey: "test", transport });
    await zaby.mcp.listCatalog();
    await zaby.mcp.createServer({ name: "s1" });
    await zaby.mcp.installServer({ serverId: "s1" });
    expect(transport.requests[0]?.path).toBe("/api/v1/tenant/mcp/catalog");
    expect(transport.requests[1]?.path).toBe("/api/v1/tenant/mcp/servers");
    expect(transport.requests[2]?.path).toBe("/api/v1/tenant/mcp/installations");
  });

  it("routes knowledgeBases methods correctly", async () => {
    const transport = createTransport([
      { method: "POST", path: "/api/v1/tenant/knowledge-bases", json: { id: "kb1" } },
      { method: "POST", path: "/api/v1/tenant/knowledge-bases/kb1/documents/text", json: {} },
      { method: "POST", path: "/api/v1/tenant/knowledge-bases/kb1/retrieve", json: {} },
    ]);
    const zaby = new Zaby({ apiKey: "test", transport });
    await zaby.knowledgeBases.create({ name: "KB" });
    await zaby.knowledgeBases.uploadTextDocument("kb1", { content: "text" });
    await zaby.knowledgeBases.retrieve("kb1", { query: "q" });
    expect(transport.requests[0]?.path).toBe("/api/v1/tenant/knowledge-bases");
    expect(transport.requests[1]?.path).toBe("/api/v1/tenant/knowledge-bases/kb1/documents/text");
    expect(transport.requests[2]?.path).toBe("/api/v1/tenant/knowledge-bases/kb1/retrieve");
  });

  it("routes memory methods correctly", async () => {
    const transport = createTransport([
      { method: "POST", path: "/api/v1/tenant/agents/memory-retrievals", json: {} },
      { method: "GET", path: "/api/v1/tenant/agents/memory-items", json: [] },
    ]);
    const zaby = new Zaby({ apiKey: "test", transport });
    await zaby.memory.retrieve({ query: "q" });
    await zaby.memory.listItems({});
    expect(transport.requests[0]?.path).toBe("/api/v1/tenant/agents/memory-retrievals");
    expect(transport.requests[1]?.path).toBe("/api/v1/tenant/agents/memory-items");
  });

  it("routes intelligence methods correctly", async () => {
    const transport = createTransport([
      { method: "GET", path: "/api/v1/tenant/agents/intelligence/signals", json: [] },
    ]);
    const zaby = new Zaby({ apiKey: "test", transport });
    await zaby.intelligence.listSignals({});
    expect(transport.requests[0]?.path).toBe("/api/v1/tenant/agents/intelligence/signals");
  });

  it("routes approvals methods correctly", async () => {
    const transport = createTransport([
      { method: "POST", path: "/api/v1/tenant/agents/runs/run_1/approvals/appr_1/approve", json: {} },
    ]);
    const zaby = new Zaby({ apiKey: "test", transport });
    await zaby.approvals.approve("run_1", "appr_1");
    expect(transport.requests[0]?.path).toBe(
      "/api/v1/tenant/agents/runs/run_1/approvals/appr_1/approve"
    );
  });

  it("routes usage methods correctly", async () => {
    const transport = createTransport([
      { method: "GET", path: "/api/v1/tenant/agents/usage?agentId=a1", json: {} },
    ]);
    const zaby = new Zaby({ apiKey: "test", transport });
    await zaby.usage.getAgentUsage({ agentId: "a1" });
    expect(transport.requests[0]?.path).toBe("/api/v1/tenant/agents/usage?agentId=a1");
  });
});

describe("ZabyRuntime — routing", () => {
  it("routes runtime.runs.start correctly", async () => {
    const transport = new MockTransport([
      { method: "POST", path: "/api/v1/agent-runtime/runs", status: 201, json: { runId: "r1" } },
    ]);
    const runtime = new ZabyRuntime({ token: "test", transport });
    await runtime.runs.start({ input: {} });
    expect(transport.requests[0]?.path).toBe("/api/v1/agent-runtime/runs");
  });

  it("routes runtime.feedback.create correctly", async () => {
    const transport = new MockTransport([
      { method: "POST", path: "/api/v1/agent-runtime/runs/run_1/feedback", json: {} },
    ]);
    const runtime = new ZabyRuntime({ token: "test", transport });
    await runtime.feedback.create("run_1", { rating: 5 });
    expect(transport.requests[0]?.path).toBe("/api/v1/agent-runtime/runs/run_1/feedback");
  });

  it("routes runtime.approvals.approve correctly", async () => {
    const transport = new MockTransport([
      { method: "POST", path: "/api/v1/agent-runtime/runs/run_1/approvals/appr_1/approve", json: {} },
    ]);
    const runtime = new ZabyRuntime({ token: "test", transport });
    await runtime.approvals.approve("run_1", "appr_1");
    expect(transport.requests[0]?.path).toBe(
      "/api/v1/agent-runtime/runs/run_1/approvals/appr_1/approve"
    );
  });
});
