# Workflow: MCP Servers, Tools & Credentials

Wire MCP tools into an agent and bind credentials for auth-requiring tools. All via `zaby.mcp` (API key, server-side).

## Catalog & install
```ts
const catalog = await zaby.mcp.listCatalog();
const server = await zaby.mcp.createServer({
  name: "my-mcp",
  transport: "STREAMABLE_HTTP",
  endpointUrl: "https://example.com/mcp",
  authMode: "NONE",
});
const serverId = String(server.id);
await zaby.mcp.discoverTools(serverId); // discover on the **server definition**
const installation = await zaby.mcp.installServer({
  serverDefinitionId: serverId,
  requireToolApproval: false,
});
const tools = await zaby.mcp.listInstallationTools(String(installation.id));
```

## Attach to an agent
```ts
await zaby.agents.attachMcpTool(agentId, {
  tenantInstallationId: String(installation.id),
  toolDefinitionId: String(tools.items?.[0]?.id ?? tools[0]?.id),
});
```

## Tool policy (risk / approval)
```ts
await zaby.mcp.updateToolPolicy(installationId, toolId, {
  riskOverride: "LOW",
  requiresApproval: false,
});
```

## Credential binding (auth-requiring tools)
```ts
await zaby.mcp.createCredentialBinding(installationId, {
  credentialId: "d4cdf8b4-...",
});
```
- Binding alone is not enough — the credential must hold valid secrets (console).
- Delete: `zaby.mcp.deleteCredentialBinding(bindingId)`.

## Auth policy & access
```ts
await zaby.mcp.upsertAuthPolicy(installationId, { /* ... */ });
await zaby.mcp.grantAccess(installationId, { /* ... */ });
```

## Invoke / preflight
```ts
await zaby.mcp.preflightInvocation(installationId, "tool_name", { arguments: {} });
await zaby.mcp.invokeTool(installationId, "tool_name", { arguments: {} });
```

## Troubleshooting
- Discover tools on the **server**, then install with **`serverDefinitionId`**.
- Revoke/clean up: `revokeInstallation(installationId)`.
