import type { ZabyCoreClient } from "../transport";
import type { RequestOptions } from "../types/public";
import { encodePath } from "../util";

const MCP = "/api/v1/tenant/mcp";

export class McpClient {
  constructor(private readonly core: ZabyCoreClient) {}

  listCatalog(options?: RequestOptions) {
    return this.core.request("GET", `${MCP}/catalog`, options);
  }

  createServer(input: unknown, options?: RequestOptions) {
    return this.core.request("POST", `${MCP}/servers`, { json: input, ...options });
  }

  getServer(serverId: string, options?: RequestOptions) {
    return this.core.request("GET", `${MCP}/servers/${encodePath(serverId)}`, options);
  }

  updateServer(serverId: string, input: unknown, options?: RequestOptions) {
    return this.core.request("PATCH", `${MCP}/servers/${encodePath(serverId)}`, { json: input, ...options });
  }

  discoverTools(serverId: string, options?: RequestOptions) {
    return this.core.request("POST", `${MCP}/servers/${encodePath(serverId)}/discover-tools`, options);
  }

  installServer(input: unknown, options?: RequestOptions) {
    return this.core.request("POST", `${MCP}/installations`, { json: input, ...options });
  }

  listInstallations(options?: RequestOptions) {
    return this.core.request("GET", `${MCP}/installations`, options);
  }

  updateInstallation(installationId: string, input: unknown, options?: RequestOptions) {
    return this.core.request("PATCH", `${MCP}/installations/${encodePath(installationId)}`, { json: input, ...options });
  }

  revokeInstallation(installationId: string, options?: RequestOptions) {
    return this.core.request("DELETE", `${MCP}/installations/${encodePath(installationId)}`, options);
  }

  listInstallationTools(installationId: string, options?: RequestOptions) {
    return this.core.request("GET", `${MCP}/installations/${encodePath(installationId)}/tools`, options);
  }

  updateToolPolicy(installationId: string, toolId: string, input: unknown, options?: RequestOptions) {
    return this.core.request("PATCH", `${MCP}/installations/${encodePath(installationId)}/tools/${encodePath(toolId)}/policy`, {
      json: input,
      ...options,
    });
  }

  preflightInvocation(installationId: string, toolName: string, input: unknown, options?: RequestOptions) {
    return this.core.request("POST", `${MCP}/installations/${encodePath(installationId)}/tools/${encodePath(toolName)}/preflight`, {
      json: input,
      ...options,
    });
  }

  invokeTool(installationId: string, toolName: string, input: unknown, options?: RequestOptions) {
    return this.core.request("POST", `${MCP}/installations/${encodePath(installationId)}/tools/${encodePath(toolName)}/invoke`, {
      json: input,
      ...options,
    });
  }

  createCredentialBinding(installationId: string, input: unknown, options?: RequestOptions) {
    return this.core.request("POST", `${MCP}/installations/${encodePath(installationId)}/credential-bindings`, {
      json: input,
      ...options,
    });
  }

  deleteCredentialBinding(bindingId: string, options?: RequestOptions) {
    return this.core.request("DELETE", `${MCP}/credential-bindings/${encodePath(bindingId)}`, options);
  }

  upsertAuthPolicy(installationId: string, input: unknown, options?: RequestOptions) {
    return this.core.request("POST", `${MCP}/installations/${encodePath(installationId)}/auth-policies`, {
      json: input,
      ...options,
    });
  }

  grantAccess(installationId: string, input: unknown, options?: RequestOptions) {
    return this.core.request("POST", `${MCP}/installations/${encodePath(installationId)}/access-grants`, { json: input, ...options });
  }
}
