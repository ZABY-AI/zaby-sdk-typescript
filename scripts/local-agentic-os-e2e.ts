import { createHmac, randomUUID } from "node:crypto";
import { existsSync, readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { configureZaby, LOCAL_ZABY_API_ORIGIN, Zaby, ZabyRuntime } from "../src";

type JsonRecord = Record<string, unknown>;

type StepStatus = "ok" | "failed" | "skipped";

type StepResult = {
  name: string;
  status: StepStatus;
  detail?: string;
};

const scriptDir = dirname(fileURLToPath(import.meta.url));
const sdkRoot = resolve(scriptDir, "..");
const backendRoot = resolve(process.env.ZABY_BACKEND_ROOT ?? resolve(sdkRoot, "../zaby-mono-backend"));
const backendDbEnvPath = resolve(backendRoot, "packages/db/.env");
const apiOrigin = process.env.ZABY_API_ORIGIN ?? LOCAL_ZABY_API_ORIGIN;
const tenantDomain = process.env.ZABY_E2E_TENANT_DOMAIN ?? "sdk-e2e.zaby.local";
const tenantEmail = process.env.ZABY_E2E_TENANT_EMAIL ?? "sdk-e2e-owner@zaby.local";
const agentProvider = process.env.ZABY_E2E_AGENT_PROVIDER ?? "test";
const agentModel = process.env.ZABY_E2E_AGENT_MODEL ?? "test-model";
const e2eNamePrefix = "SDK Local E2E";
const results: StepResult[] = [];

loadEnvFile(backendDbEnvPath);
configureZaby({ apiOrigin });

const { db } = await importModule<{ db: any }>(resolve(backendRoot, "packages/db/src/index.ts"));
const { createTenantApiKey } = await importModule<{
  createTenantApiKey(input: {
    tenantId: string;
    tenantUserId: string;
    name: string;
    scopes: string[];
    expiresAt?: Date | null;
  }): Promise<{ apiKey: { id: string; keyPrefix: string }; secret: string }>;
}>(resolve(backendRoot, "packages/api-keys/src/index.ts"));
const { ensureTenantOwnerRoleAssignment } = await importModule<{
  ensureTenantOwnerRoleAssignment(user: any, tenant: any): Promise<unknown>;
}>(resolve(backendRoot, "apps/tenant/src/lib/tenant/auth.ts"));

let fatalError: unknown = null;

try {
  await db.$connect();

  console.log(`Zaby SDK local Agentic OS E2E`);
  console.log(`API origin: ${apiOrigin}`);
  console.log(`Backend root: ${backendRoot}`);
  console.log(`DB env: ${backendDbEnvPath}`);
  console.log(`Agent provider: ${agentProvider}`);
  console.log(`Agent model: ${agentModel}`);

  const fixture = await runStep("seed tenant, owner, session, API key", async () => {
    return seedTenantFixture();
  }, (fixture) => `tenant=${fixture.tenant.id}, user=${fixture.owner.id}, key=${fixture.apiKeyPrefix}`);

  if (!fixture) {
    throw new Error("Tenant fixture was not created.");
  }

  const zaby = new Zaby({
    apiKey: fixture.apiKeySecret,
    accessToken: fixture.accessToken,
  });

  await runStep("health.check", async () => {
    const health = await zaby.health.check() as JsonRecord;
    assertField(health, "status");
    return health;
  }, (health) => `status=${String(health.status)}`);

  const suffix = `${Date.now()}-${randomUUID().slice(0, 8)}`;
  const agent = await runStep("agents.create", async () => zaby.agents.create({
    slug: `sdk-e2e-agent-${suffix}`,
    name: `SDK E2E Agent ${suffix}`,
    provider: agentProvider,
    defaultModel: agentModel,
    instructions: "Answer in one concise sentence.",
    category: "SUPPORT",
    visibility: "PRIVATE",
    metadata: { source: "zaby-sdk-local-e2e" },
  }), idDetail);
  const agentId = idOf(agent, "agent");

  const kb = await runStep("knowledgeBases.create", async () => zaby.knowledgeBases.create({
    name: `SDK E2E KB ${suffix}`,
    description: "Local SDK E2E knowledge base.",
    accessLevel: "PRIVATE",
    status: "ACTIVE",
    tags: ["sdk-e2e"],
  }), idDetail);
  const knowledgeBaseId = idOf(kb, "knowledge base");

  await runStep("knowledgeBases.uploadTextDocument", async () => zaby.knowledgeBases.uploadTextDocument(knowledgeBaseId, {
    title: "SDK E2E Product Notes",
    filename: "sdk-e2e-product-notes.md",
    fileType: "MD",
    content: "Zaby SDK E2E validates tenant auth, API keys, disposable runtime tokens, MCP, KB, memory, and intelligence APIs.",
    metadata: { source: "zaby-sdk-local-e2e" },
  }), idDetail);
  const libraryDocument = await runStep("knowledgeBases.createLibraryTextDocument", async () => zaby.knowledgeBases.createLibraryTextDocument({
    title: `SDK E2E Library Notes ${suffix}`,
    filename: "sdk-e2e-library-notes.md",
    fileType: "MD",
    content: "Reusable knowledge library document created by the Zaby TypeScript SDK local E2E.",
    metadata: { source: "zaby-sdk-local-e2e" },
  }), idDetail);
  const libraryDocumentId = idOf(libraryDocument, "library document");
  await runStep("knowledgeBases.listLibraryDocuments", async () => zaby.knowledgeBases.listLibraryDocuments({ limit: 10 }), itemsDetail);
  await runStep("knowledgeBases.listLibraryDocumentFindings", async () => zaby.knowledgeBases.listLibraryDocumentFindings(libraryDocumentId), itemsDetail);
  await runStep("knowledgeBases.linkLibraryDocument", async () => zaby.knowledgeBases.linkLibraryDocument(knowledgeBaseId, {
    libraryDocumentId,
    libraryDocumentVersionId: nullableStringField(libraryDocument, "currentVersionId"),
    isIncluded: true,
    metadata: { source: "zaby-sdk-local-e2e" },
  }), idDetail);
  await runStep("knowledgeBases.listJobs", async () => zaby.knowledgeBases.listJobs(knowledgeBaseId, { limit: 10 }), itemsDetail);
  await runStep("knowledgeBases.createSourceGroup", async () => zaby.knowledgeBases.createSourceGroup(knowledgeBaseId, {
    name: `SDK E2E Sources ${suffix}`,
    sourceType: "MANUAL_UPLOAD",
    syncMode: "MANUAL",
    status: "ACTIVE",
  }), idDetail);
  await runStep("knowledgeBases.listSourceGroups", async () => zaby.knowledgeBases.listSourceGroups(knowledgeBaseId), itemsDetail);
  await runStep("knowledgeBases.retrieve", async () => zaby.knowledgeBases.retrieve(knowledgeBaseId, {
    query: "What does the SDK E2E validate?",
    limit: 3,
  }), undefined, { optional: true });

  await runStep("agents.attachKnowledgeBase", async () => zaby.agents.attachKnowledgeBase(agentId, {
    knowledgeBaseId,
    key: `sdk-e2e-kb-${suffix}`,
    name: "SDK E2E KB",
    enabled: true,
  }), idDetail);

  const version = await runStep("agents.publish", async () => zaby.agents.publish(agentId), idDetail);
  const agentVersionId = idOf(version, "agent version");

  const deployment = await runStep("deployments.create", async () => zaby.deployments.create(agentId, {
    agentVersionId,
    environment: "TEST",
    metadata: { source: "zaby-sdk-local-e2e" },
  }), idDetail);
  const deploymentId = idOf(deployment, "deployment");

  const externalApp = await runStep("externalApps.create", async () => zaby.externalApps.create({
    name: `SDK E2E Embedded App ${suffix}`,
    slug: `sdk-e2e-app-${suffix}`,
    allowedOrigins: ["http://localhost:9080"],
    tokenTtlSeconds: 600,
    metadata: { source: "zaby-sdk-local-e2e" },
  }), idDetail);
  const externalAppId = idOf(externalApp, "external app");

  await runStep("externalApps.update", async () => zaby.externalApps.update(externalAppId, {
    metadata: { source: "zaby-sdk-local-e2e", updated: true },
  }), idDetail);
  await runStep("externalApps.get", async () => zaby.externalApps.get(externalAppId), idDetail);
  await runStep("externalApps.list", async () => zaby.externalApps.list({ status: "ACTIVE" }), itemsDetail);
  await runStep("externalApps.bindDeployment", async () => zaby.externalApps.bindDeployment(externalAppId, {
    deploymentId,
    allowBrowserRuntime: true,
    allowServerRuntime: true,
    allowApprovals: true,
    metadata: { source: "zaby-sdk-local-e2e" },
  }), idDetail);
  await runStep("deployments.getProvisioning", async () => zaby.deployments.getProvisioning(deploymentId), (value) => {
    const record = asRecord(value);
    return `externalApps=${Array.isArray(record.externalApps) ? record.externalApps.length : 0}`;
  });

  await runStep("mcp.listCatalog", async () => zaby.mcp.listCatalog(), itemsDetail);
  const mcpServer = await runStep("mcp.createServer", async () => zaby.mcp.createServer({
    name: `sdk-e2e-mcp-${suffix}`,
    displayName: "SDK E2E MCP",
    description: "Local SDK E2E MCP server definition.",
    transport: "STREAMABLE_HTTP",
    endpointUrl: "https://example.com/mcp",
    authMode: "NONE",
    status: "ACTIVE",
    discoverTools: false,
    metadata: { source: "zaby-sdk-local-e2e" },
  }), idDetail);
  const mcpServerId = idOf(mcpServer, "MCP server");
  await runStep("mcp.getServer", async () => zaby.mcp.getServer(mcpServerId), idDetail);
  await runStep("mcp.updateServer", async () => zaby.mcp.updateServer(mcpServerId, {
    metadata: { source: "zaby-sdk-local-e2e", updated: true },
  }), idDetail);
  const mcpInstallation = await runStep("mcp.installServer", async () => zaby.mcp.installServer({
    serverDefinitionId: mcpServerId,
    requireToolApproval: false,
    metadata: { source: "zaby-sdk-local-e2e" },
  }), idDetail);
  const mcpInstallationId = idOf(mcpInstallation, "MCP installation");
  await runStep("mcp.listInstallations", async () => zaby.mcp.listInstallations(), itemsDetail);
  await runStep("mcp.listInstallationTools", async () => zaby.mcp.listInstallationTools(mcpInstallationId), itemsDetail);

  await runStep("memory.listItems", async () => zaby.memory.listItems({ agentId, limit: 10 }), itemsDetail);
  await runStep("memory.listCandidates", async () => zaby.memory.listCandidates({ agentId, limit: 10 }), itemsDetail);
  await runStep("memory.retrieve", async () => zaby.memory.retrieve({
    agentId,
    query: "What does this local E2E remember?",
    limit: 3,
  }), undefined, { optional: true });

  await runStep("intelligence.listSignals", async () => zaby.intelligence.listSignals({ agentId, limit: 10 }), itemsDetail);
  await runStep("intelligence.listRollups", async () => zaby.intelligence.listRollups({ agentId, limit: 10 }), itemsDetail);
  await runStep("intelligence.listImprovements", async () => zaby.intelligence.listImprovements({ agentId, limit: 10 }), itemsDetail);
  await runStep("approvals.list", async () => zaby.approvals.list(), itemsDetail);
  await runStep("usage.getAgentUsage", async () => zaby.usage.getAgentUsage({ agentId }), (value) => {
    const record = asRecord(value);
    return `keys=${Object.keys(record).length}`;
  });

  const runtimeToken = await runStep("runtimeTokens.create", async () => zaby.runtimeTokens.create({
    externalAppId,
    deploymentId,
    externalUserId: "sdk-e2e-user",
    externalSessionId: `sdk-session-${suffix}`,
    externalConversationId: `sdk-conversation-${suffix}`,
    displayName: "SDK E2E User",
    channel: "server",
    metadata: { source: "zaby-sdk-local-e2e" },
    ttlSeconds: 300,
    maxUses: 20,
    scopes: [
      "managed-agents:runtime:run",
      "managed-agents:runtime:stream",
      "managed-agents:runtime:feedback",
      "managed-agents:runtime:approve",
    ],
  }), (value) => {
    const record = asRecord(value);
    return `grant=${String(record.grantId ?? "unknown")}`;
  });
  const disposableToken = stringField(runtimeToken, "token");
  const runtime = new ZabyRuntime({ token: disposableToken });

  const runtimeRun = await runStep("runtime.runs.start", async () => runtime.runs.start({
    input: "Hello from the Zaby TypeScript SDK local E2E.",
    requestId: `sdk-e2e-runtime-${suffix}`,
  }), (value) => {
    const record = asRecord(value);
    return `run=${String(record.runId ?? "unknown")}, status=${String(record.status ?? "unknown")}`;
  });
  const runId = stringField(runtimeRun, "runId");

  await runStep("runtime.runs.events", async () => runtime.runs.events(runId, { limit: 20 }), (value) => {
    const record = asRecord(value);
    const events = Array.isArray(record.events) ? record.events : [];
    return `events=${events.length}`;
  });
  await runStep("runtime.runs.stream", async () => {
    const events: unknown[] = [];
    for await (const event of runtime.runs.stream(runId, { limit: 20 })) {
      events.push(event);
    }
    return { items: events };
  }, itemsDetail);
  await runStep("runtime.feedback.create", async () => runtime.feedback.create(runId, {
    rating: 5,
    label: "sdk-e2e-runtime",
    comment: "Runtime feedback from the TypeScript SDK local E2E.",
    domainKey: "sdk",
    topicKey: "typescript-sdk",
    metadata: { source: "zaby-sdk-local-e2e" },
  }), (value) => `accepted=${String(asRecord(value).accepted ?? "unknown")}`);
  await runStep("runtimeTokens.recordFeedback", async () => zaby.runtimeTokens.recordFeedback(runId, {
    rating: 5,
    label: "sdk-e2e-provisioning",
    comment: "Provisioning API-key feedback from the TypeScript SDK local E2E.",
    domainKey: "sdk",
    topicKey: "typescript-sdk",
    metadata: { source: "zaby-sdk-local-e2e" },
  }), (value) => `accepted=${String(asRecord(value).accepted ?? "unknown")}`);

  await runStep("agents.getRunProgress", async () => zaby.agents.getRunProgress(runId), (value) => {
    const record = asRecord(value);
    return `status=${String(record.status ?? "unknown")}`;
  });
  await runStep("agents.listRunEvents", async () => zaby.agents.listRunEvents(runId, { limit: 20 }), (value) => {
    const record = asRecord(value);
    const events = Array.isArray(record.events) ? record.events : Array.isArray(record.items) ? record.items : [];
    return `events=${events.length}`;
  });
} catch (error) {
  fatalError = error;
} finally {
  printSummary();
  await db.$disconnect().catch(() => undefined);
}

if (fatalError || results.some((result) => result.status === "failed")) {
  process.exit(1);
}

async function seedTenantFixture() {
  const tenant = await db.tenants.upsert({
    where: { domain: tenantDomain },
    create: {
      name: "Zaby SDK Local E2E",
      domain: tenantDomain,
      status: "ACTIVE",
      timezone: "Asia/Kolkata",
      locale: "en",
      isOnboardingComplete: true,
      metadata: { source: "zaby-sdk-local-e2e" },
    },
    update: {
      name: "Zaby SDK Local E2E",
      status: "ACTIVE",
      deleted: false,
      deletedAt: null,
      timezone: "Asia/Kolkata",
      locale: "en",
      isOnboardingComplete: true,
      metadata: { source: "zaby-sdk-local-e2e" },
    },
  });

  const existingOwner = await db.tenantUser.findUnique({
    where: { tenantId_email: { tenantId: tenant.id, email: tenantEmail } },
  });
  const ownerId = existingOwner?.id ?? randomUUID();
  const owner = existingOwner
    ? await db.tenantUser.update({
      where: { id: existingOwner.id },
      data: {
        name: "SDK E2E Owner",
        status: "ACTIVE",
        emailVerified: true,
        isOwner: true,
        metadata: { source: "zaby-sdk-local-e2e" },
      },
    })
    : await db.tenantUser.create({
      data: {
        id: ownerId,
        tenantId: tenant.id,
        email: tenantEmail,
        name: "SDK E2E Owner",
        status: "ACTIVE",
        emailVerified: true,
        isOwner: true,
        createdBy: ownerId,
        metadata: { source: "zaby-sdk-local-e2e" },
      },
    });

  const freshTenant = await db.tenants.findUniqueOrThrow({ where: { id: tenant.id } });
  await ensureTenantOwnerRoleAssignment(owner, freshTenant);

  await db.tenantSession.updateMany({
    where: {
      tenantId: tenant.id,
      tenantUserId: owner.id,
      userAgent: "zaby-sdk-local-e2e",
      status: "ACTIVE",
    },
    data: {
      status: "REVOKED",
      endedAt: new Date(),
    },
  });

  await db.tenantApiKey.updateMany({
    where: {
      tenantId: tenant.id,
      userId: owner.id,
      name: { startsWith: e2eNamePrefix },
      status: "ACTIVE",
    },
    data: { status: "INACTIVE" },
  });

  const sessionJti = randomUUID();
  const sessionExpiresAt = new Date(Date.now() + 2 * 60 * 60 * 1000);
  await db.tenantSession.create({
    data: {
      jti: sessionJti,
      tenantId: tenant.id,
      tenantUserId: owner.id,
      status: "ACTIVE",
      ipAddress: "127.0.0.1",
      device: "local-sdk-e2e",
      browser: "SDK",
      os: process.platform,
      userAgent: "zaby-sdk-local-e2e",
      expiresAt: sessionExpiresAt,
    },
  });

  const apiKey = await createTenantApiKey({
    tenantId: tenant.id,
    tenantUserId: owner.id,
    name: `${e2eNamePrefix} ${new Date().toISOString()}`,
    scopes: ["managed-agents:*", "provisioning:*", "mcp:invoke"],
    expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
  });

  const accessToken = signHs256Jwt({
    sub: owner.id,
    tenantId: tenant.id,
    jti: sessionJti,
    roles: ["Owner"],
    isOwner: true,
    exp: Math.floor(Date.now() / 1000) + 15 * 60,
  }, process.env.JWT_SECRET?.trim() || "development-jwt-secret");

  return {
    tenant,
    owner,
    apiKeySecret: apiKey.secret,
    apiKeyPrefix: apiKey.apiKey.keyPrefix,
    accessToken,
  };
}

async function runStep<T>(
  name: string,
  action: () => Promise<T>,
  detail?: (value: T) => string,
  options: { optional?: boolean } = {},
): Promise<T | undefined> {
  process.stdout.write(`- ${name} ... `);
  try {
    const value = await action();
    const detailText = detail?.(value);
    results.push({ name, status: "ok", ...(detailText ? { detail: detailText } : {}) });
    console.log(`ok${detailText ? ` (${detailText})` : ""}`);
    return value;
  } catch (error) {
    const detailText = formatError(error);
    if (options.optional) {
      results.push({ name, status: "skipped", detail: detailText });
      console.log(`skipped (${detailText})`);
      return undefined;
    }

    results.push({ name, status: "failed", detail: detailText });
    console.log(`failed (${detailText})`);
    throw error;
  }
}

function loadEnvFile(filePath: string) {
  if (!existsSync(filePath)) {
    throw new Error(`DB env file not found: ${filePath}`);
  }

  const content = readFileSync(filePath, "utf8");
  for (const rawLine of content.split(/\r?\n/u)) {
    const line = rawLine.trim();
    if (!line || line.startsWith("#")) continue;
    const separator = line.indexOf("=");
    if (separator <= 0) continue;
    const key = line.slice(0, separator).trim();
    let value = line.slice(separator + 1).trim();
    if ((value.startsWith("\"") && value.endsWith("\"")) || (value.startsWith("'") && value.endsWith("'"))) {
      value = value.slice(1, -1);
    }
    if (process.env[key] === undefined) {
      process.env[key] = value.replace(/\\n/g, "\n");
    }
  }
}

async function importModule<T>(path: string): Promise<T> {
  return await import(pathToFileURL(path).href) as T;
}

function signHs256Jwt(payload: JsonRecord, secret: string) {
  const header = base64Url(JSON.stringify({ alg: "HS256", typ: "JWT" }));
  const body = base64Url(JSON.stringify(payload));
  const signature = createHmac("sha256", secret).update(`${header}.${body}`).digest("base64url");
  return `${header}.${body}.${signature}`;
}

function base64Url(value: string) {
  return Buffer.from(value).toString("base64url");
}

function asRecord(value: unknown): JsonRecord {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    throw new Error(`Expected object response, received ${JSON.stringify(value)}`);
  }
  return value as JsonRecord;
}

function idOf(value: unknown, label: string) {
  return stringField(value, "id", label);
}

function stringField(value: unknown, field: string, label = "response") {
  const record = asRecord(value);
  const fieldValue = record[field];
  if (typeof fieldValue !== "string" || !fieldValue) {
    throw new Error(`Expected ${label}.${field} to be a string.`);
  }
  return fieldValue;
}

function nullableStringField(value: unknown, field: string) {
  const record = asRecord(value);
  const fieldValue = record[field];
  return typeof fieldValue === "string" ? fieldValue : null;
}

function assertField(value: unknown, field: string) {
  const record = asRecord(value);
  if (record[field] === undefined) {
    throw new Error(`Expected response.${field} to be present.`);
  }
}

function idDetail(value: unknown) {
  return `id=${idOf(value, "response")}`;
}

function itemsDetail(value: unknown) {
  if (Array.isArray(value)) {
    return `items=${value.length}`;
  }
  const record = asRecord(value);
  const items = Array.isArray(record.items) ? record.items : Array.isArray(record.data) ? record.data : [];
  return `items=${items.length}`;
}

function formatError(error: unknown) {
  if (error instanceof Error) {
    const maybeApi = error as Error & { status?: unknown; code?: unknown };
    const status = typeof maybeApi.status === "number" ? `HTTP ${maybeApi.status}` : null;
    const code = typeof maybeApi.code === "string" ? maybeApi.code : null;
    return [status, code, error.message].filter(Boolean).join(" ");
  }
  return String(error);
}

function printSummary() {
  console.log("\nSummary");
  for (const result of results) {
    const marker = result.status === "ok" ? "ok" : result.status === "skipped" ? "skip" : "fail";
    console.log(`${marker.padEnd(4)} ${result.name}${result.detail ? ` - ${result.detail}` : ""}`);
  }
}
