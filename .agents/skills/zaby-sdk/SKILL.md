---
name: zaby-typescript-sdk
description: Use when integrating @zaby-ai/sdk for managed agents, runtime tokens, SSE runs, MCP, knowledge bases, or a React chat UI with @zaby-ai/aiui-core / @zaby-ai/aiui-react — not for full tenant/admin/dashboard APIs.
---

# Zaby TypeScript SDK

Canonical pack: **`typescript-sdk-skill/`**.

This SDK is **agent + runtime only** — not the full Zaby backend.

**In:** provisioning agents, tokens, runtime SSE, KB, MCP, memory, approvals, AIUI React frontend.  
**Out:** billing, users, org, WhatsApp, GPA/BIA/workflows, admin/customer apps.

Prefer `zaby.agents` + `runtimeTokens` + `ZabyRuntime` (headless). Product UI: `typescript-sdk-skill/workflows/aiui-frontend.md`. See `typescript-sdk-skill/SKILL.md`.
