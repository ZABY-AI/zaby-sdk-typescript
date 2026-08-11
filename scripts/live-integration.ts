import { randomUUID } from "node:crypto";
import { configureZaby, DEFAULT_ZABY_API_ORIGIN, Zaby, ZabyRuntime } from "../src";

type Status = "pass" | "fail" | "skip";
type Result = { name: string; status: Status; detail?: string };

const apiOrigin = process.env.ZABY_API_ORIGIN ?? DEFAULT_ZABY_API_ORIGIN;
const apiKey = process.env.ZABY_API_KEY;
const results: Result[] = [];

async function step(name: string, fn: () => Promise<string | void>): Promise<boolean> {
  try {
    const detail = await fn();
    results.push({ name, status: "pass", detail: detail || undefined });
    console.log(`PASS  ${name}${detail ? ` — ${detail}` : ""}`);
    return true;
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    results.push({ name, status: "fail", detail: message });
    console.log(`FAIL  ${name} — ${message}`);
    return false;
  }
}

function skip(name: string, reason: string) {
  results.push({ name, status: "skip", detail: reason });
  console.log(`SKIP  ${name} — ${reason}`);
}

function asRecord(value: unknown): Record<string, unknown> {
  if (!value || typeof value !== "object") throw new Error(`Expected object, got ${typeof value}: ${safe(value)}`);
  return value as Record<string, unknown>;
}

function pickId(value: unknown, label: string): string {
  const record = asRecord(value);
  const id = record.id ?? record.agentId ?? record.knowledgeBaseId ?? record.deploymentId ?? record.runId;
  if (typeof id !== "string" || !id) throw new Error(`${label} missing id: ${safe(record)}`);
  return id;
}

function pickString(value: unknown, key: string): string {
  const record = asRecord(value);
  const found = record[key];
  if (typeof found !== "string" || !found) throw new Error(`missing ${key}: ${safe(record)}`);
  return found;
}

function safe(value: unknown): string {
  try {
    const text = JSON.stringify(value, (_key, item) => (typeof item === "bigint" ? item.toString() : item));
    return text.length > 800 ? `${text.slice(0, 800)}…` : text;
  } catch {
    return String(value);
  }
}

function itemsLen(value: unknown): number {
  if (Array.isArray(value)) return value.length;
  if (value && typeof value === "object") {
    const record = value as Record<string, unknown>;
    if (Array.isArray(record.items)) return record.items.length;
    if (Array.isArray(record.events)) return record.events.length;
  }
  return 0;
}

if (!apiKey) {
  console.error("ZABY_API_KEY is required");
  process.exit(1);
}

configureZaby({ apiOrigin });
console.log(`Live integration against ${apiOrigin}\n`);

const zaby = new Zaby({ apiKey });
const suffix = `${Date.now()}-${randomUUID().slice(0, 8)}`;

await step("health.check", async () => {
  const health = asRecord(await zaby.health.check());
  if (health.status !== "ok") throw new Error(safe(health));
  return `status=${health.status}`;
});

await step("async apiKey provider", async () => {
  const client = new Zaby({ apiKey: async () => apiKey });
  const health = asRecord(await client.health.check());
  if (health.status !== "ok") throw new Error(safe(health));
  return "ok";
});

let existingAppId: string | undefined;
let existingDeploymentId: string | undefined;

await step("externalApps.list", async () => {
  const apps = asRecord(await zaby.externalApps.list({ status: "ACTIVE" }));
  const items = Array.isArray(apps.items) ? apps.items : [];
  const first = items[0] && typeof items[0] === "object" ? items[0] as Record<string, unknown> : undefined;
  if (typeof first?.id === "string") existingAppId = first.id;
  const dep = first?.activeDeploymentId ?? first?.deploymentId;
  if (typeof dep === "string") existingDeploymentId = dep;
  return `items=${items.length}${existingAppId ? ` first=${existingAppId}` : ""}`;
});

await step("mcp.listCatalog", async () => `items=${itemsLen(await zaby.mcp.listCatalog())}`);
await step("mcp.listInstallations", async () => `items=${itemsLen(await zaby.mcp.listInstallations())}`);
await step("runtimeTokenFamilies.list", async () => `items=${itemsLen(await zaby.runtimeTokenFamilies.list({ limit: 5 }))}`);
await step("runtimeTokenPolicies.list", async () => `items=${itemsLen(await zaby.runtimeTokenPolicies.list({ limit: 5 }))}`);
await step("runtimeTokenUsage.get", async () => `keys=${Object.keys(asRecord(await zaby.runtimeTokenUsage.get({ limit: 5 }))).join(",") || "empty"}`);
await step("usage.getAgentUsage", async () => `keys=${Object.keys(asRecord(await zaby.usage.getAgentUsage({}))).join(",") || "empty"}`);
await step("approvals.list", async () => `items=${itemsLen(await zaby.approvals.list())}`);
await step("memory.listItems", async () => `items=${itemsLen(await zaby.memory.listItems({ limit: 5 }))}`);
await step("intelligence.listSignals", async () => `items=${itemsLen(await zaby.intelligence.listSignals({ limit: 5 }))}`);

let agentId: string | undefined;
await step("agents.create", async () => {
  const agent = await zaby.agents.create({
    slug: `sdk-live-${suffix}`,
    name: `SDK Live Agent ${suffix}`,
    instructions: "Reply in one short sentence. You are a live SDK smoke agent.",
    category: "SUPPORT",
    visibility: "PRIVATE",
    defaultModel: "zaby",
    metadata: { source: "sdk-live-integration" },
  });
  agentId = pickId(agent, "agent");
  return `agentId=${agentId} ${safe(agent)}`;
});

let knowledgeBaseId: string | undefined;
await step("knowledgeBases.create", async () => {
  const kb = await zaby.knowledgeBases.create({
    name: `SDK Live KB ${suffix}`,
    description: "Live SDK integration KB",
    accessLevel: "PRIVATE",
    status: "ACTIVE",
  });
  knowledgeBaseId = pickId(kb, "knowledge base");
  return `knowledgeBaseId=${knowledgeBaseId}`;
});

if (knowledgeBaseId) {
  await step("knowledgeBases.uploadTextDocument", async () => {
    const doc = await zaby.knowledgeBases.uploadTextDocument(knowledgeBaseId!, {
      title: "SDK Live Notes",
      filename: "sdk-live-notes.md",
      fileType: "MD",
      content: "The live SDK test validates create, publish, deploy, mint, and stream.",
    });
    return `documentId=${pickId(doc, "document")}`;
  });

  await step("knowledgeBases.retrieve", async () => {
    const retrieved = await zaby.knowledgeBases.retrieve(knowledgeBaseId!, {
      query: "What does the live SDK test validate?",
      topK: 3,
    });
    return safe(retrieved);
  });
} else {
  skip("knowledgeBases.uploadTextDocument", "no knowledgeBaseId");
  skip("knowledgeBases.retrieve", "no knowledgeBaseId");
}

if (agentId && knowledgeBaseId) {
  await step("agents.attachKnowledgeBase", async () => {
    const attached = await zaby.agents.attachKnowledgeBase(agentId!, {
      knowledgeBaseId,
      key: `sdk-live-kb-${suffix}`,
      name: "SDK Live KB",
      enabled: true,
    });
    return safe(attached);
  });
} else {
  skip("agents.attachKnowledgeBase", "missing agent or KB");
}

let agentVersionId: string | undefined;
if (agentId) {
  await step("agents.publish", async () => {
    const version = await zaby.agents.publish(agentId!);
    agentVersionId = pickId(version, "agent version");
    return `agentVersionId=${agentVersionId}`;
  });
} else {
  skip("agents.publish", "no agentId");
}

let deploymentId: string | undefined;
if (agentId && agentVersionId) {
  await step("agents.deploy", async () => {
    const deployment = await zaby.agents.deploy(agentId!, {
      agentVersionId,
      environment: "TEST",
      metadata: { source: "sdk-live-integration" },
    });
    deploymentId = pickId(deployment, "deployment");
    return `deploymentId=${deploymentId} ${safe(deployment)}`;
  });
} else {
  skip("agents.deploy", "missing agent or version");
}

let externalAppId: string | undefined;
await step("externalApps.create", async () => {
  const app = await zaby.externalApps.create({
    name: `SDK Live App ${suffix}`,
    slug: `sdk-live-app-${suffix}`,
    allowedOrigins: ["https://example.com"],
    tokenTtlSeconds: 600,
    metadata: { source: "sdk-live-integration" },
  });
  externalAppId = pickId(app, "external app");
  return `externalAppId=${externalAppId}`;
});

if (externalAppId) {
  await step("externalApps.get", async () => `id=${pickString(await zaby.externalApps.get(externalAppId!), "id")}`);
  await step("externalApps.update", async () => {
    const updated = await zaby.externalApps.update(externalAppId!, {
      metadata: { source: "sdk-live-integration", updated: true },
    });
    return safe(updated);
  });
}

if (externalAppId && deploymentId) {
  await step("externalApps.bindDeployment", async () => {
    const bound = await zaby.externalApps.bindDeployment(externalAppId!, {
      deploymentId,
      allowBrowserRuntime: true,
      allowServerRuntime: true,
      allowApprovals: true,
      metadata: { source: "sdk-live-integration" },
    });
    return safe(bound);
  });
} else {
  skip("externalApps.bindDeployment", "missing app or new deployment");
}

let quotaPolicyId: string | undefined;
if (externalAppId && deploymentId) {
  await step("runtimeTokenPolicies.create", async () => {
    const policy = asRecord(await zaby.runtimeTokenPolicies.create({
      name: `SDK Live Policy ${suffix}`,
      externalAppId,
      deploymentId,
      maxConcurrentRuns: 3,
      tokenTtlSeconds: 600,
      maxUsesPerToken: 20,
      metadata: { source: "sdk-live-integration" },
    }));
    quotaPolicyId = typeof policy.id === "string" ? policy.id : undefined;
    if (!quotaPolicyId) throw new Error(`missing policy id: ${safe(policy)}`);
    return `quotaPolicyId=${quotaPolicyId}`;
  });
} else {
  skip("runtimeTokenPolicies.create", "missing app or deployment");
}

if (deploymentId) {
  await step("deployments.getProvisioning", async () => safe(await zaby.deployments.getProvisioning(deploymentId!)));
}

const mintAppId = externalAppId ?? existingAppId;
const mintDeploymentId = deploymentId ?? existingDeploymentId;

let runtimeJwt: string | undefined;
let tokenFamilyId: string | undefined;

if (mintAppId && mintDeploymentId) {
  await step("runtimeTokens.create", async () => {
    const token = asRecord(await zaby.runtimeTokens.create({
      externalAppId: mintAppId,
      deploymentId: mintDeploymentId,
      ...(quotaPolicyId ? { quotaPolicyId } : {}),
      uniqueId: `sdk-live-${suffix}`,
      externalUserId: "sdk-live-user",
      externalSessionId: `sdk-live-session-${suffix}`,
      channel: "server",
      ttlSeconds: 300,
      maxUses: 10,
      metadata: { source: "sdk-live-integration" },
    }));
    if (typeof token.token === "string") runtimeJwt = token.token;
    if (typeof token.tokenFamilyId === "string") tokenFamilyId = token.tokenFamilyId;
    const fields = ["token", "expiresAt", "grantId", "tokenFamilyId", "scopes"].filter((key) => key in token);
    return `fields=[${fields.join(",")}]`;
  });
} else {
  skip("runtimeTokens.create", "no external app + deployment available");
}

if (runtimeJwt) {
  const runtime = new ZabyRuntime({ token: runtimeJwt });
  let runId: string | undefined;

  await step("runtime.runs.start", async () => {
    const run = asRecord(await runtime.runs.start({
      input: "Say hello in five words.",
      requestId: `sdk-live-run-${suffix}`,
    }));
    runId = typeof run.runId === "string" ? run.runId : undefined;
    if (!runId) throw new Error(`no runId: ${safe(run)}`);
    return `runId=${runId} ${safe(run)}`;
  });

  if (runId) {
    await step("runtime.runs.events", async () => {
      const events = await runtime.runs.events(runId!, { limit: 20 });
      return `events=${itemsLen(events)}`;
    });

    await step("runtime.runs.stream", async () => {
      const events: unknown[] = [];
      const started = Date.now();
      for await (const event of runtime.runs.stream(runId!)) {
        events.push(event);
        if (Date.now() - started > 45_000) break;
      }
      return `events=${events.length} sample=${safe(events.slice(0, 2))}`;
    });

    await step("runtime.feedback.create", async () => {
      const feedback = await runtime.feedback.create(runId!, {
        rating: 5,
        label: "sdk-live",
        comment: "Live SDK integration feedback",
      });
      return safe(feedback);
    });

    await step("agents.getRunProgress", async () => safe(await zaby.agents.getRunProgress(runId!)));
    await step("agents.listRunEvents", async () => `events=${itemsLen(await zaby.agents.listRunEvents(runId!, { limit: 20 }))}`);
  } else {
    skip("runtime.runs.events", "no runId");
    skip("runtime.runs.stream", "no runId");
    skip("runtime.feedback.create", "no runId");
    skip("agents.getRunProgress", "no runId");
    skip("agents.listRunEvents", "no runId");
  }
} else {
  skip("runtime.runs.start", "no runtime token");
  skip("runtime.runs.stream", "no runtime token");
}

if (runtimeJwt) {
  await step("runtimeTokens.rotate", async () => {
    const rotated = asRecord(await zaby.runtimeTokens.rotate({ previousToken: runtimeJwt! }));
    const fields = ["token", "expiresAt", "grantId"].filter((key) => key in rotated);
    return `fields=[${fields.join(",")}]`;
  });
} else {
  skip("runtimeTokens.rotate", "no runtime token");
}

if (agentId) {
  await step("agents.playgroundRuntimeTokens", async () => {
    const token = asRecord(await zaby.agents.playgroundRuntimeTokens(agentId!, {
      deploymentId: mintDeploymentId ?? deploymentId ?? "",
      uniqueId: `sdk-live-playground-${suffix}`,
      externalUserId: "sdk-live-playground-user",
      channel: "server",
      ttlSeconds: 120,
      maxUses: 3,
    }));
    const fields = ["token", "expiresAt", "grantId"].filter((key) => key in token);
    return `fields=[${fields.join(",")}]`;
  });

  await step("agents.testRun", async () => {
    const run = await zaby.agents.testRun(agentId!, {
      input: "Ping from provisioning testRun",
      requestId: `sdk-live-test-${suffix}`,
    });
    return safe(run);
  });
}

if (tokenFamilyId) {
  await step("runtimeTokens.revokeFamily", async () => {
    const revoked = await zaby.runtimeTokens.revokeFamily(tokenFamilyId!, { reason: "sdk-live-cleanup" });
    return safe(revoked);
  });
}

console.log("\n--- Summary ---");
const pass = results.filter((result) => result.status === "pass").length;
const fail = results.filter((result) => result.status === "fail").length;
const skipped = results.filter((result) => result.status === "skip").length;
console.log(`${pass} passed, ${fail} failed, ${skipped} skipped`);
for (const result of results.filter((item) => item.status !== "pass")) {
  console.log(`${result.status.toUpperCase()}  ${result.name} — ${result.detail ?? ""}`);
}

if (fail > 0) process.exit(1);
