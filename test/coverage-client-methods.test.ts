import { describe, it, expect } from "vitest";
import { MockTransport } from "../src/testing";
import { ZabyCoreClient } from "../src/transport";
import { resolveZabyConfig } from "../src/config";
import {
  AgentsClient,
  DeploymentsClient,
  ExternalAppsClient,
  RuntimeTokensClient,
  ApprovalsClient,
  UsageClient,
} from "../src/clients/agents";
import { IntelligenceClient } from "../src/clients/intelligence";
import { KnowledgeBasesClient } from "../src/clients/knowledge-bases";
import { McpClient } from "../src/clients/mcp";
import { MemoryClient } from "../src/clients/memory";
import { RuntimeRunsClient, RuntimeApprovalsClient, RuntimeFeedbackClient } from "../src/clients/runtime";

const GH = "GET /health";

function mockTransport(responses: Array<{ method: string; path: string; status?: number; json?: unknown }>) {
  return new MockTransport(responses);
}

function createCore(transport: MockTransport) {
  const config = resolveZabyConfig({ fetch: globalThis.fetch });
  return new ZabyCoreClient(config, async () => ({ authorization: "Bearer test" }), transport);
}

function R(method: string, path: string, status = 200, json: unknown = {}) {
  return { method, path, status, json };
}

describe("AgentsClient — all methods", () => {
  const t = () => mockTransport([R("POST", `/api/v1/tenant/agents`)]);
  const kb = () => mockTransport([R("POST", `/api/v1/tenant/agents/a1/knowledge-bases`)]);
  const skill = () => mockTransport([R("POST", `/api/v1/tenant/agents/a1/skills`)]);
  const pub = () => mockTransport([R("POST", `/api/v1/tenant/agents/a1/publish`)]);
  const dep = () => mockTransport([R("POST", `/api/v1/tenant/agents/a1/deployments`)]);
  const testR = () => mockTransport([R("POST", `/api/v1/tenant/agents/a1/test-runs`)]);
  const start = () => mockTransport([R("POST", `/api/v1/tenant/agents/a1/runs`)]);
  const progress = () => mockTransport([R("GET", `/api/v1/tenant/agents/runs/r1/progress`)]);
  const events = () => mockTransport([R("GET", `/api/v1/tenant/agents/runs/r1/events`)]);
  const mcp = () => mockTransport([R("POST", `/api/v1/tenant/agents/a1/mcp-tools`)]);

  it("create", async () => {
    const tr = t(); const c = new AgentsClient(createCore(tr));
    await c.create({ name: "test" }); expect(tr.requests[0].method).toBe("POST");
  });

  it("attachMcpTool", async () => {
    const tr = mcp(); const c = new AgentsClient(createCore(tr));
    await c.attachMcpTool("a1", {});
    expect(tr.requests[0].method).toBe("POST");
    expect(tr.requests[0].path).toContain("/mcp-tools");
  });

  it("attachKnowledgeBase", async () => {
    const tr = kb(); const c = new AgentsClient(createCore(tr));
    await c.attachKnowledgeBase("a1", {});
    expect(tr.requests[0].path).toContain("/knowledge-bases");
  });

  it("attachSkill", async () => {
    const tr = skill(); const c = new AgentsClient(createCore(tr));
    await c.attachSkill("a1", {}); expect(tr.requests[0].path).toContain("/skills");
  });

  it("publish", async () => {
    const tr = pub(); const c = new AgentsClient(createCore(tr));
    await c.publish("a1"); expect(tr.requests[0].path).toContain("/publish");
  });

  it("deploy", async () => {
    const tr = dep(); const c = new AgentsClient(createCore(tr));
    await c.deploy("a1", {}); expect(tr.requests[0].path).toContain("/deployments");
  });

  it("testRun", async () => {
    const tr = testR(); const c = new AgentsClient(createCore(tr));
    await c.testRun("a1", {}); expect(tr.requests[0].path).toContain("/test-runs");
  });

  it("startRun", async () => {
    const tr = start(); const c = new AgentsClient(createCore(tr));
    await c.startRun("a1", {}); expect(tr.requests[0].path).toContain("/runs");
  });

  it("getRunProgress", async () => {
    const tr = progress(); const c = new AgentsClient(createCore(tr));
    await c.getRunProgress("r1"); expect(tr.requests[0].path).toContain("/runs/r1/progress");
  });

  it("listRunEvents with query", async () => {
    const tr = events(); const c = new AgentsClient(createCore(tr));
    await c.listRunEvents("r1", { page: 1 }); expect(tr.requests[0].path).toContain("page=1");
  });
});

describe("DeploymentsClient — all methods", () => {
  it("create", async () => {
    const tr = mockTransport([R("POST", `/api/v1/tenant/agents/a1/deployments`)]);
    const c = new DeploymentsClient(createCore(tr));
    await c.create("a1", {}); expect(tr.requests[0].method).toBe("POST");
  });

  it("getProvisioning", async () => {
    const tr = mockTransport([R("GET", `/api/v1/tenant/agents/deployments/d1/provisioning`)]);
    const c = new DeploymentsClient(createCore(tr));
    await c.getProvisioning("d1"); expect(tr.requests[0].method).toBe("GET");
  });
});

describe("ExternalAppsClient — all methods", () => {
  it("list", async () => {
    const tr = mockTransport([R("GET", `/api/v1/tenant/agents/external-apps`)]);
    const c = new ExternalAppsClient(createCore(tr));
    await c.list(); expect(tr.requests[0].method).toBe("GET");
  });

  it("create", async () => {
    const tr = mockTransport([R("POST", `/api/v1/tenant/agents/external-apps`)]);
    const c = new ExternalAppsClient(createCore(tr));
    await c.create({ name: "app" }); expect(tr.requests[0].method).toBe("POST");
  });

  it("get", async () => {
    const tr = mockTransport([R("GET", `/api/v1/tenant/agents/external-apps/e1`)]);
    const c = new ExternalAppsClient(createCore(tr));
    await c.get("e1"); expect(tr.requests[0].method).toBe("GET");
  });

  it("update", async () => {
    const tr = mockTransport([R("PATCH", `/api/v1/tenant/agents/external-apps/e1`)]);
    const c = new ExternalAppsClient(createCore(tr));
    await c.update("e1", {}); expect(tr.requests[0].method).toBe("PATCH");
  });

  it("bindDeployment", async () => {
    const tr = mockTransport([R("POST", `/api/v1/tenant/agents/external-apps/e1/deployments`)]);
    const c = new ExternalAppsClient(createCore(tr));
    await c.bindDeployment("e1", {}); expect(tr.requests[0].method).toBe("POST");
  });
});

describe("RuntimeTokensClient — all methods", () => {
  it("create", async () => {
    const tr = mockTransport([R("POST", `/api/v1/provisioning/managed-agents/external-apps/e1/runtime-tokens`)]);
    const c = new RuntimeTokensClient(createCore(tr));
    await c.create({ externalAppId: "e1", ttlSeconds: 600 });
    expect(tr.requests[0].path).toContain("/runtime-tokens");
    expect(tr.requests[0].json).not.toHaveProperty("externalAppId");
  });

  it("recordFeedback", async () => {
    const tr = mockTransport([R("POST", `/api/v1/provisioning/managed-agents/runs/r1/feedback`)]);
    const c = new RuntimeTokensClient(createCore(tr));
    await c.recordFeedback("r1", { rating: 5 });
    expect(tr.requests[0].method).toBe("POST");
  });
});

describe("ApprovalsClient — all methods", () => {
  it("list", async () => {
    const tr = mockTransport([R("GET", `/api/v1/tenant/agents/approvals`)]);
    const c = new ApprovalsClient(createCore(tr));
    await c.list(); expect(tr.requests[0].method).toBe("GET");
  });

  it("approve", async () => {
    const tr = mockTransport([R("POST", `/api/v1/tenant/agents/runs/r1/approvals/a1/approve`)]);
    const c = new ApprovalsClient(createCore(tr));
    await c.approve("r1", "a1"); expect(tr.requests[0].path).toContain("/approve");
  });

  it("reject", async () => {
    const tr = mockTransport([R("POST", `/api/v1/tenant/agents/runs/r1/approvals/a1/reject`)]);
    const c = new ApprovalsClient(createCore(tr));
    await c.reject("r1", "a1"); expect(tr.requests[0].path).toContain("/reject");
  });
});

describe("UsageClient", () => {
  it("getAgentUsage", async () => {
    const tr = mockTransport([R("GET", `/api/v1/tenant/agents/usage`)]);
    const c = new UsageClient(createCore(tr));
    await c.getAgentUsage({ agentId: "a1" });
    expect(tr.requests[0].path).toContain("agentId=a1");
  });
});

describe("IntelligenceClient — all methods", () => {
  const path = "/api/v1/tenant/agents/intelligence";

  it("listSignals", async () => {
    const tr = mockTransport([R("GET", `${path}/signals`)]);
    const c = new IntelligenceClient(createCore(tr));
    await c.listSignals({ agentId: "a1" });
    expect(tr.requests[0].path).toContain("agentId=a1");
  });

  it("listRollups", async () => {
    const tr = mockTransport([R("GET", `${path}/rollups`)]);
    const c = new IntelligenceClient(createCore(tr));
    await c.listRollups(); expect(tr.requests[0].method).toBe("GET");
  });

  it("listImprovements", async () => {
    const tr = mockTransport([R("GET", `${path}/improvements`)]);
    const c = new IntelligenceClient(createCore(tr));
    await c.listImprovements(); expect(tr.requests[0].method).toBe("GET");
  });

  it("approveImprovement", async () => {
    const tr = mockTransport([R("POST", `${path}/improvements/c1/approve`)]);
    const c = new IntelligenceClient(createCore(tr));
    await c.approveImprovement("c1", { reason: "good" });
    expect(tr.requests[0].path).toContain("/approve");
  });

  it("rejectImprovement", async () => {
    const tr = mockTransport([R("POST", `${path}/improvements/c1/reject`)]);
    const c = new IntelligenceClient(createCore(tr));
    await c.rejectImprovement("c1"); expect(tr.requests[0].path).toContain("/reject");
  });
});

describe("KnowledgeBasesClient — all methods", () => {
  const K = "/api/v1/tenant/knowledge-bases";
  const KL = "/api/v1/tenant/knowledge-library";

  function each(methods: Array<[string, string, string]>): string[] {
    return methods.map(([m, p]) => {
      const tr = mockTransport([R(m, p, 200, {})]);
      const c = new KnowledgeBasesClient(createCore(tr));
      switch (m + p) {
        case `POST${K}`: return c.create({ name: "kb" }).then(() => tr.requests[0]!.method);
        case `POST${K}/kb1/documents/text`: return c.uploadTextDocument("kb1", {}).then(() => tr.requests[0]!.method);
        case `POST${KL}/documents/text`: return c.createLibraryTextDocument({}).then(() => tr.requests[0]!.method);
        case `GET${KL}/documents`: return c.listLibraryDocuments({ limit: 10 }).then(() => tr.requests[0]!.method);
        case `GET${KL}/documents/doc1/findings`: return c.listLibraryDocumentFindings("doc1").then(() => tr.requests[0]!.method);
        case `POST${K}/kb1/library-documents`: return c.linkLibraryDocument("kb1", {}).then(() => tr.requests[0]!.method);
        case `POST${K}/kb1/library-documents/sel1/project`: return c.projectLibraryDocument("kb1", "sel1", {}).then(() => tr.requests[0]!.method);
        case `POST${K}/kb1/retrieve`: return c.retrieve("kb1", {}).then(() => tr.requests[0]!.method);
        case `POST${K}/kb1/provisional-answer`: return c.provisionalAnswer("kb1", {}).then(() => tr.requests[0]!.method);
        case `GET${K}/kb1/source-groups`: return c.listSourceGroups("kb1").then(() => tr.requests[0]!.method);
        case `POST${K}/kb1/source-groups`: return c.createSourceGroup("kb1", {}).then(() => tr.requests[0]!.method);
        case `PATCH${K}/kb1/source-groups/sg1`: return c.updateSourceGroup("kb1", "sg1", {}).then(() => tr.requests[0]!.method);
        case `GET${K}/kb1/sources`: return c.listSources("kb1").then(() => tr.requests[0]!.method);
        case `POST${K}/kb1/sources`: return c.createSource("kb1", {}).then(() => tr.requests[0]!.method);
        case `PATCH${K}/kb1/sources/s1`: return c.updateSource("kb1", "s1", {}).then(() => tr.requests[0]!.method);
        case `POST${K}/kb1/sources/s1/reprocess`: return c.reprocessSource("kb1", "s1").then(() => tr.requests[0]!.method);
        case `POST${K}/kb1/sources/s1/auth`: return c.linkSourceCredential("kb1", "s1", {}).then(() => tr.requests[0]!.method);
        case `GET${K}/kb1/ingestion-policies`: return c.listIngestionPolicies("kb1").then(() => tr.requests[0]!.method);
        case `POST${K}/kb1/ingestion-policies`: return c.createIngestionPolicy("kb1", {}).then(() => tr.requests[0]!.method);
        case `PATCH${K}/kb1/ingestion-policies/p1`: return c.updateIngestionPolicy("kb1", "p1", {}).then(() => tr.requests[0]!.method);
        case `POST${K}/kb1/governance-policy`: return c.upsertGovernancePolicy("kb1", {}).then(() => tr.requests[0]!.method);
        case `GET${K}/kb1/profiles`: return c.listProfiles("kb1").then(() => tr.requests[0]!.method);
        case `POST${K}/kb1/profiles`: return c.createProfile("kb1", {}).then(() => tr.requests[0]!.method);
        case `PATCH${K}/kb1/profiles/pr1`: return c.updateProfile("kb1", "pr1", {}).then(() => tr.requests[0]!.method);
        case `GET${K}/kb1/idocs-jobs`: return c.listJobs("kb1", {}).then(() => tr.requests[0]!.method);
        case `GET${K}/kb1/idocs-jobs/j1`: return c.getJob("kb1", "j1").then(() => tr.requests[0]!.method);
        case `POST${K}/kb1/idocs-jobs/j1/cancel`: return c.cancelJob("kb1", "j1").then(() => tr.requests[0]!.method);
        default: return Promise.reject(new Error(`unhandled: ${m} ${p}`));
      }
    });
  }

  it("routes all 27 methods", async () => {
    const results = await Promise.all(each([
      ["POST", K],
      ["POST", `${K}/kb1/documents/text`],
      ["POST", `${KL}/documents/text`],
      ["GET", `${KL}/documents`],
      ["GET", `${KL}/documents/doc1/findings`],
      ["POST", `${K}/kb1/library-documents`],
      ["POST", `${K}/kb1/library-documents/sel1/project`],
      ["POST", `${K}/kb1/retrieve`],
      ["POST", `${K}/kb1/provisional-answer`],
      ["GET", `${K}/kb1/source-groups`],
      ["POST", `${K}/kb1/source-groups`],
      ["PATCH", `${K}/kb1/source-groups/sg1`],
      ["GET", `${K}/kb1/sources`],
      ["POST", `${K}/kb1/sources`],
      ["PATCH", `${K}/kb1/sources/s1`],
      ["POST", `${K}/kb1/sources/s1/reprocess`],
      ["POST", `${K}/kb1/sources/s1/auth`],
      ["GET", `${K}/kb1/ingestion-policies`],
      ["POST", `${K}/kb1/ingestion-policies`],
      ["PATCH", `${K}/kb1/ingestion-policies/p1`],
      ["POST", `${K}/kb1/governance-policy`],
      ["GET", `${K}/kb1/profiles`],
      ["POST", `${K}/kb1/profiles`],
      ["PATCH", `${K}/kb1/profiles/pr1`],
      ["GET", `${K}/kb1/idocs-jobs`],
      ["GET", `${K}/kb1/idocs-jobs/j1`],
      ["POST", `${K}/kb1/idocs-jobs/j1/cancel`],
    ]));
    results.forEach((r) => expect(["POST", "GET", "PATCH"]).toContain(r));
  });
});

describe("McpClient — all methods", () => {
  const M = "/api/v1/tenant/mcp";

  it("listCatalog", async () => {
    const tr = mockTransport([R("GET", `${M}/catalog`)]);
    const c = new McpClient(createCore(tr));
    await c.listCatalog(); expect(tr.requests[0].method).toBe("GET");
  });

  it("createServer", async () => {
    const tr = mockTransport([R("POST", `${M}/servers`)]);
    const c = new McpClient(createCore(tr));
    await c.createServer({}); expect(tr.requests[0].method).toBe("POST");
  });

  it("getServer", async () => {
    const tr = mockTransport([R("GET", `${M}/servers/s1`)]);
    const c = new McpClient(createCore(tr));
    await c.getServer("s1"); expect(tr.requests[0].method).toBe("GET");
  });

  it("updateServer", async () => {
    const tr = mockTransport([R("PATCH", `${M}/servers/s1`)]);
    const c = new McpClient(createCore(tr));
    await c.updateServer("s1", {}); expect(tr.requests[0].method).toBe("PATCH");
  });

  it("discoverTools", async () => {
    const tr = mockTransport([R("POST", `${M}/servers/s1/discover-tools`)]);
    const c = new McpClient(createCore(tr));
    await c.discoverTools("s1"); expect(tr.requests[0].method).toBe("POST");
  });

  it("installServer", async () => {
    const tr = mockTransport([R("POST", `${M}/installations`)]);
    const c = new McpClient(createCore(tr));
    await c.installServer({}); expect(tr.requests[0].method).toBe("POST");
  });

  it("listInstallations", async () => {
    const tr = mockTransport([R("GET", `${M}/installations`)]);
    const c = new McpClient(createCore(tr));
    await c.listInstallations(); expect(tr.requests[0].method).toBe("GET");
  });

  it("updateInstallation", async () => {
    const tr = mockTransport([R("PATCH", `${M}/installations/i1`)]);
    const c = new McpClient(createCore(tr));
    await c.updateInstallation("i1", {}); expect(tr.requests[0].method).toBe("PATCH");
  });

  it("revokeInstallation", async () => {
    const tr = mockTransport([R("DELETE", `${M}/installations/i1`)]);
    const c = new McpClient(createCore(tr));
    await c.revokeInstallation("i1"); expect(tr.requests[0].method).toBe("DELETE");
  });

  it("listInstallationTools", async () => {
    const tr = mockTransport([R("GET", `${M}/installations/i1/tools`)]);
    const c = new McpClient(createCore(tr));
    await c.listInstallationTools("i1"); expect(tr.requests[0].method).toBe("GET");
  });

  it("updateToolPolicy", async () => {
    const tr = mockTransport([R("PATCH", `${M}/installations/i1/tools/t1/policy`)]);
    const c = new McpClient(createCore(tr));
    await c.updateToolPolicy("i1", "t1", {}); expect(tr.requests[0].method).toBe("PATCH");
  });

  it("preflightInvocation", async () => {
    const tr = mockTransport([R("POST", `${M}/installations/i1/tools/search/preflight`)]);
    const c = new McpClient(createCore(tr));
    await c.preflightInvocation("i1", "search", {}); expect(tr.requests[0].method).toBe("POST");
  });

  it("invokeTool", async () => {
    const tr = mockTransport([R("POST", `${M}/installations/i1/tools/search/invoke`)]);
    const c = new McpClient(createCore(tr));
    await c.invokeTool("i1", "search", {}); expect(tr.requests[0].method).toBe("POST");
  });

  it("createCredentialBinding", async () => {
    const tr = mockTransport([R("POST", `${M}/installations/i1/credential-bindings`)]);
    const c = new McpClient(createCore(tr));
    await c.createCredentialBinding("i1", {}); expect(tr.requests[0].method).toBe("POST");
  });

  it("deleteCredentialBinding", async () => {
    const tr = mockTransport([R("DELETE", `${M}/credential-bindings/b1`)]);
    const c = new McpClient(createCore(tr));
    await c.deleteCredentialBinding("b1"); expect(tr.requests[0].method).toBe("DELETE");
  });

  it("upsertAuthPolicy", async () => {
    const tr = mockTransport([R("POST", `${M}/installations/i1/auth-policies`)]);
    const c = new McpClient(createCore(tr));
    await c.upsertAuthPolicy("i1", {}); expect(tr.requests[0].method).toBe("POST");
  });

  it("grantAccess", async () => {
    const tr = mockTransport([R("POST", `${M}/installations/i1/access-grants`)]);
    const c = new McpClient(createCore(tr));
    await c.grantAccess("i1", {}); expect(tr.requests[0].method).toBe("POST");
  });
});

describe("MemoryClient — all methods", () => {
  const A = "/api/v1/tenant/agents";

  it("listItems", async () => {
    const tr = mockTransport([R("GET", `${A}/memory-items`)]);
    const c = new MemoryClient(createCore(tr));
    await c.listItems(); expect(tr.requests[0].method).toBe("GET");
  });

  it("getItem", async () => {
    const tr = mockTransport([R("GET", `${A}/memory-items/m1`)]);
    const c = new MemoryClient(createCore(tr));
    await c.getItem("m1"); expect(tr.requests[0].method).toBe("GET");
  });

  it("retrieve", async () => {
    const tr = mockTransport([R("POST", `${A}/memory-retrievals`)]);
    const c = new MemoryClient(createCore(tr));
    await c.retrieve({}); expect(tr.requests[0].method).toBe("POST");
  });

  it("listCandidates", async () => {
    const tr = mockTransport([R("GET", `${A}/memory-candidates`)]);
    const c = new MemoryClient(createCore(tr));
    await c.listCandidates(); expect(tr.requests[0].method).toBe("GET");
  });

  it("approveCandidate", async () => {
    const tr = mockTransport([R("POST", `${A}/memory-candidates/c1/approve`)]);
    const c = new MemoryClient(createCore(tr));
    await c.approveCandidate("c1", { reason: "ok" });
    expect(tr.requests[0].path).toContain("/approve");
  });

  it("rejectCandidate", async () => {
    const tr = mockTransport([R("POST", `${A}/memory-candidates/c1/reject`)]);
    const c = new MemoryClient(createCore(tr));
    await c.rejectCandidate("c1"); expect(tr.requests[0].path).toContain("/reject");
  });

  it("disableItem", async () => {
    const tr = mockTransport([R("PATCH", `${A}/memory-items/m1/disable`)]);
    const c = new MemoryClient(createCore(tr));
    await c.disableItem("m1"); expect(tr.requests[0].method).toBe("PATCH");
  });

  it("deleteItem", async () => {
    const tr = mockTransport([R("DELETE", `${A}/memory-items/m1`)]);
    const c = new MemoryClient(createCore(tr));
    await c.deleteItem("m1"); expect(tr.requests[0].method).toBe("DELETE");
  });
});

describe("RuntimeRunsClient — all methods", () => {
  const RT = "/api/v1/agent-runtime";

  it("start", async () => {
    const tr = mockTransport([R("POST", `${RT}/runs`)]);
    const c = new RuntimeRunsClient(createCore(tr));
    await c.start({}); expect(tr.requests[0].method).toBe("POST");
  });

  it("events", async () => {
    const tr = mockTransport([R("GET", `${RT}/runs/r1/events`)]);
    const c = new RuntimeRunsClient(createCore(tr));
    await c.events("r1", {}); expect(tr.requests[0].method).toBe("GET");
  });

  it("stream", async () => {
    const core = createCore(new MockTransport([{ method: "GET", path: `${RT}/runs/r1/aiui`, status: 200, body: "data: {\"ok\":true}\n\n" }]));
    const c = new RuntimeRunsClient(core);
    const events: any[] = [];
    for await (const ev of c.stream("r1", {})) { events.push(ev); }
    expect(events).toHaveLength(1);
    expect(events[0].data).toEqual({ ok: true });
  });
});

describe("RuntimeApprovalsClient", () => {
  const RT = "/api/v1/agent-runtime";

  it("approve", async () => {
    const tr = mockTransport([R("POST", `${RT}/runs/r1/approvals/a1/approve`)]);
    const c = new RuntimeApprovalsClient(createCore(tr));
    await c.approve("r1", "a1"); expect(tr.requests[0].method).toBe("POST");
  });

  it("reject", async () => {
    const tr = mockTransport([R("POST", `${RT}/runs/r1/approvals/a1/reject`)]);
    const c = new RuntimeApprovalsClient(createCore(tr));
    await c.reject("r1", "a1"); expect(tr.requests[0].method).toBe("POST");
  });
});

describe("RuntimeFeedbackClient", () => {
  it("create", async () => {
    const tr = mockTransport([R("POST", `/api/v1/agent-runtime/runs/r1/feedback`)]);
    const c = new RuntimeFeedbackClient(createCore(tr));
    await c.create("r1", { rating: 5 }); expect(tr.requests[0].method).toBe("POST");
  });
});
