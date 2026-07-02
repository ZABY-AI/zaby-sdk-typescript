import { randomUUID } from "node:crypto";
import { configureZaby, DEFAULT_ZABY_API_ORIGIN, Zaby } from "../src";

type StepStatus = "pass" | "fail" | "skip";
type StepResult = { name: string; status: StepStatus; detail?: string };

const apiOrigin = process.env.ZABY_API_ORIGIN ?? DEFAULT_ZABY_API_ORIGIN;
const apiKey = process.env.ZABY_API_KEY;

const results: StepResult[] = [];

async function step(name: string, fn: () => Promise<string | void>): Promise<void> {
  try {
    const detail = await fn();
    results.push({ name, status: "pass", detail: detail ?? undefined });
    console.log(`PASS  ${name}${detail ? ` — ${detail}` : ""}`);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    results.push({ name, status: "fail", detail: message });
    console.log(`FAIL  ${name} — ${message}`);
  }
}

function skip(name: string, reason: string) {
  results.push({ name, status: "skip", detail: reason });
  console.log(`SKIP  ${name} — ${reason}`);
}

function idOf(value: unknown, label: string): string {
  if (!value || typeof value !== "object") throw new Error(`Expected ${label} object`);
  const record = value as Record<string, unknown>;
  const id = record.id ?? record.agentId ?? record.knowledgeBaseId;
  if (typeof id !== "string" || !id) throw new Error(`${label} missing id`);
  return id;
}

if (!apiKey) {
  console.error("ZABY_API_KEY is required");
  process.exit(1);
}

configureZaby({ apiOrigin });
console.log(`Live parity test against ${apiOrigin}\n`);

const zaby = new Zaby({ apiKey });
const zabyAsync = new Zaby({ apiKey: async () => apiKey! });

await step("health.check", async () => {
  const health = await zaby.health.check() as { status?: string };
  if (health.status !== "ok") throw new Error(JSON.stringify(health));
  return `status=${health.status}`;
});

await step("async apiKey provider", async () => {
  const health = await zabyAsync.health.check() as { status?: string };
  if (health.status !== "ok") throw new Error(JSON.stringify(health));
  return "async provider resolved";
});

await step("externalApps.list", async () => {
  const apps = await zaby.externalApps.list({ status: "ACTIVE" }) as { items?: unknown[] };
  return `items=${apps.items?.length ?? 0}`;
});

let agentId: string | undefined;
const suffix = `${Date.now()}-${randomUUID().slice(0, 8)}`;

await step("agents.create", async () => {
  const agent = await zaby.agents.create({
    slug: `sdk-parity-${suffix}`,
    name: `SDK Parity Agent ${suffix}`,
    provider: "groq",
  });
  agentId = idOf(agent, "agent");
  return `agentId=${agentId}`;
});

let knowledgeBaseId: string | undefined;

await step("knowledgeBases.create", async () => {
  const kb = await zaby.knowledgeBases.create({
    name: `SDK Parity KB ${suffix}`,
    description: "Parity test KB",
    accessLevel: "PRIVATE",
    status: "ACTIVE",
  });
  knowledgeBaseId = idOf(kb, "knowledge base");
  return `knowledgeBaseId=${knowledgeBaseId}`;
});

await step("knowledgeBases.uploadTextDocument (text/name aliases)", async () => {
  if (!knowledgeBaseId) throw new Error("missing knowledgeBaseId");
  const doc = await zaby.knowledgeBases.uploadTextDocument(knowledgeBaseId, {
    name: "Legacy Alias Title",
    text: "Document uploaded via legacy text/name aliases for parity testing.",
    filename: "parity-test.md",
    fileType: "MD",
  }) as Record<string, unknown>;
  return `documentId=${String(doc.id ?? doc.documentId ?? "ok")}`;
});

await step("runtimeTokenFamilies.list", async () => {
  const families = await zaby.runtimeTokenFamilies.list() as { items?: unknown[] };
  return `items=${families.items?.length ?? 0}`;
});

await step("runtimeTokenFamilies.list(query)", async () => {
  const families = await zaby.runtimeTokenFamilies.list({ limit: 5 }) as { items?: unknown[] };
  return `items=${families.items?.length ?? 0}`;
});

await step("runtimeTokenPolicies.list", async () => {
  const policies = await zaby.runtimeTokenPolicies.list({ limit: 5 }) as { items?: unknown[] };
  return `items=${policies.items?.length ?? 0}`;
});

await step("runtimeTokenUsage.get", async () => {
  const usage = await zaby.runtimeTokenUsage.get({ limit: 5 }) as Record<string, unknown>;
  return `keys=${Object.keys(usage).join(",") || "empty"}`;
});

await step("usage.getAgentUsage", async () => {
  const usage = await zaby.usage.getAgentUsage({}) as Record<string, unknown>;
  return `keys=${Object.keys(usage).join(",") || "empty"}`;
});

await step("approvals.list", async () => {
  const approvals = await zaby.approvals.list() as { items?: unknown[] };
  return `items=${approvals.items?.length ?? 0}`;
});

await step("mcp.listCatalog", async () => {
  const catalog = await zaby.mcp.listCatalog() as { items?: unknown[] };
  return `items=${catalog.items?.length ?? 0}`;
});

await step("memory.listItems", async () => {
  const items = await zaby.memory.listItems({ limit: 5 }) as { items?: unknown[] };
  return `items=${items.items?.length ?? 0}`;
});

const apps = await zaby.externalApps.list({ status: "ACTIVE" }) as { items?: Array<Record<string, unknown>> };
const app = apps.items?.[0];
const externalAppId = typeof app?.id === "string" ? app.id : undefined;

if (externalAppId) {
  await step("externalApps.get", async () => {
    const detail = await zaby.externalApps.get(externalAppId) as Record<string, unknown>;
    return `id=${detail.id}`;
  });
}

const deploymentId = typeof app?.activeDeploymentId === "string"
  ? app.activeDeploymentId
  : typeof app?.deploymentId === "string"
    ? app.deploymentId
    : undefined;

if (externalAppId && deploymentId) {
  await step("runtimeTokens.create", async () => {
    const token = await zaby.runtimeTokens.create({
      externalAppId,
      deploymentId,
      uniqueId: `parity-${suffix}`,
      channel: "server",
    }) as Record<string, unknown>;
    const fields = ["token", "expiresAt", "grantId", "tokenFamilyId", "scopes"];
    const present = fields.filter((f) => f in token);
    return `fields=[${present.join(",")}]`;
  });
} else {
  skip("runtimeTokens.create", "no active external app with deployment");
}

console.log("\n--- Summary ---");
const pass = results.filter((r) => r.status === "pass").length;
const fail = results.filter((r) => r.status === "fail").length;
const skipped = results.filter((r) => r.status === "skip").length;
console.log(`${pass} passed, ${fail} failed, ${skipped} skipped`);

if (fail > 0) process.exit(1);
