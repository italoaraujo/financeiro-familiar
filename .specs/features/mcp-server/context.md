# MCP Server Context

**Gathered:** 2026-10-16
**Spec:** `.specs/features/mcp-server/spec.md`
**Status:** Approved

---

## Feature Boundary

Deliver a complete Model Context Protocol (MCP) integration for the Personal & Family Financial Management System, comprising:
1. Self-service MCP Access Token generation, listing, revocation, and JSON config snippet generator in the web platform (`/backend` + `/frontend/src/app/mcp/page.tsx`).
2. A dedicated `/mcp-server` package (`@modelcontextprotocol/sdk` over `stdio`) exposing 31 tools and 3 resources across all financial domains, communicating through the NestJS REST API.

---

## Implementation Decisions

### Scope of Capabilities (Read + Write)

- Expose full read and write operations across all modules: Context/Families, Accounts, Categories, Tags, Transactions (income, expense, installments, transfers, soft-delete), Credit Cards & Invoices (details and payment), Budgets, Goals (create, deposit, withdraw), and Reports (dashboard, categories, tags, cash-flow, CSV export).

### Architecture & Integration Strategy

- Create a dedicated `/mcp-server` package in the monorepo that consumes the `/backend` REST API over HTTP (`stdio` transport to the AI client).
- Never bypass the NestJS API: all decimal arithmetic (`DECIMAL(15,2)`), credit card limit checks (`AD-009`), invoice closing rules (`AD-008`), soft delete (`AD-010`), RBAC (`VIEWER` read-only enforcement `AD-014`), and audit logs (`AD-011`) remain enforced by the backend.

### User Authentication & Personal vs. Family Context

- Provide a dedicated web page **"Integração IA (MCP)"** (`/mcp`) in the frontend where the logged-in user can generate a named, revocable token (`MCP_API_TOKEN`) in 1 click and copy the ready-to-use MCP JSON config snippet.
- Keep automatic login via `MCP_USER_EMAIL` and `MCP_USER_PASSWORD` as a supported fallback in `/mcp-server`.
- Support dynamic context switching by accepting an optional `familyId` parameter in all domain tools (falling back to `MCP_DEFAULT_FAMILY_ID` or Personal context).

### Agent's Discretion

- Tool naming conventions (`snake_case` standard MCP tool names), internal module split inside `mcp-server/src/tools/`, and visual layout details of `/mcp` following the existing `slate-950` / `emerald-500` Tailwind theme.

### Declined / Undiscussed Gray Areas → Assumptions

- All implicit-requirement dimensions (timeouts, 401 retry, `stderr` logging, token hashing) are logged in `spec.md` under Assumptions & Open Questions.

---

## Specific References

- Existing backend controllers in `backend/src/modules/*/*.controller.ts`
- Existing token blacklist mechanism in `backend/src/modules/auth/token-blacklist.service.ts`
- Existing frontend shell and navigation in `frontend/src/components/layout/AppShell.tsx`

---

## Deferred Ideas

- Remote SSE / Streamable HTTP multi-tenant OAuth2 server hosting (out of scope for local `stdio` assistant integration).
