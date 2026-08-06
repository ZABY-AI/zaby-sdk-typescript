# Workflow: MCP Servers, Tools & Credentials

Wire MCP tools into an agent and bind credentials for auth-requiring tools (e.g. AWS MCP). All via `zaby.mcp` (API key, server-side).

## Catalog & install
```ts
const catalog = await zaby.mcp.listCatalog();           // available server templates
const server = await zaby.mcp.createServer({ /* server def: name, transport, endpointUrl, authMode */ });
const installation = await zaby.mcp.installServer({ serverDefinitionId: server.id /* or serverId */ });
await zaby.mcp.discoverTools(installation.id);           // populate tool catalog
const tools = await zaby.mcp.listInstallationTools(installation.id);
```

## Attach to an agent
```ts
await zaby.agents.attachMcpTool(agentId, { installationId: installation.id });
```

## Tool policy (risk / approval)
```ts
await zaby.mcp.updateToolPolicy(installationId, toolId, {
  riskOverride: "LOW",
  requiresApproval: false,
});
```
- `riskOverride`: risk level applied to the tool.
- `requiresApproval`: if `true`, the run emits an interruption/approval event (HITL) before the tool runs.

## Credential binding (auth-requiring tools)
Tools like `call_aws`/`run_script` need credentials bound to the installation:
```ts
await zaby.mcp.createCredentialBinding(installationId, {
  credentialId: "d4cdf8b4-...",   // the credential (e.g. "AWS MCP Headers")
  scope: "USER",
  purpose: "runtime",
  credentialOwnerType: "TENANT_USER",
  isDefault: true,
});
```
- If a credential-requiring tool fails with `Authentication failed: Unable to verify your user identity`, the installation either has **no credential binding** or the bound credential has **empty/revoked values**. Binding alone isn't enough — the credential must hold valid secrets (set in the Zaby console; the SDK cannot set credential *values*).
- Delete a binding: `zaby.mcp.deleteCredentialBinding(bindingId)`.

## Auth policy & access
```ts
await zaby.mcp.upsertAuthPolicy(installationId, { /* riskOverride, requiresApproval, ... */ });
await zaby.mcp.grantAccess(installationId, { /* grantee */ });
```

## Invoke / preflight (testing a tool)
```ts
const preflight = await zaby.mcp.preflightInvocation(installationId, "aws___list_regions", {});
const result = await zaby.mcp.invokeTool(installationId, "aws___list_regions", {});
```
Use `invokeTool` to test a tool server-side (e.g. confirm `list_regions` works while `call_aws` fails due to missing credentials).

## Troubleshooting
- Read-only tools (docs, `list_regions`) often work without credentials; execution tools (`call_aws`, `run_script`) enforce auth.
- The MCP `authMode: "SHARED"` means one credential is shared across calls; bind it via `createCredentialBinding`.
- Revoke/clean up: `revokeInstallation(installationId)`, `updateInstallation(installationId, input)`.
