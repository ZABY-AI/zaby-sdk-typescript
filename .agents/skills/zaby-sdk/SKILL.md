---
name: zaby-typescript-sdk
description: Use when integrating @zaby-ai/sdk for managed agents, runtime tokens, SSE runs, MCP, or knowledge bases in TypeScript/JavaScript — not for full tenant/admin/dashboard APIs.
---

# Zaby TypeScript SDK

Canonical pack: **`typescript-sdk-skill/`**.

This SDK is **agent + runtime only** — not the full Zaby backend.

**In:** provisioning agents, tokens, runtime SSE, KB, MCP, memory, approvals.  
**Out:** billing, users, org, WhatsApp, GPA/BIA/workflows, admin/customer apps.

Prefer `zaby.agents` + `runtimeTokens` + `ZabyRuntime`. See `typescript-sdk-skill/SKILL.md`.
