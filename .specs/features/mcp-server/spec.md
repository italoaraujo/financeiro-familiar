# MCP Server Specification

## Problem Statement

Users of the Personal & Family Financial Management System need to connect AI assistants (Claude Desktop, Cursor, Antigravity) via the Model Context Protocol (MCP) to query balances, analyze reports, and record financial transactions without bypassing backend domain validations, credit card limit rules, RBAC permissions, or audit logging. Additionally, users need a self-service web screen to generate and revoke long-lived MCP access tokens and copy the ready-to-use JSON configuration without exposing their primary account password.

## Goals

- [ ] Provide backend endpoints (`/auth/mcp-tokens`) and a frontend web screen (`/mcp`) for generating, viewing, copying configuration JSON, and revoking personal MCP API tokens.
- [ ] Deliver a dedicated `/mcp-server` package operating over `stdio` transport that authenticates against the backend REST API via `MCP_API_TOKEN` (or email/password fallback).
- [ ] Expose 31 MCP Tools and 3 MCP Resources covering full read and write operations across all financial domains (Context/Families, Accounts, Categories/Tags, Transactions/Transfers, Credit Cards/Invoices, Budgets, Goals, and Reports) with Personal and Family context support.

## Out of Scope

Explicitly excluded. Documented to prevent scope creep.

| Feature | Reason |
| ------- | ------ |
| Direct PostgreSQL Prisma access from `/mcp-server` | Bypasses NestJS domain rules, credit limit checks, RBAC guards, and `AuditLogInterceptor` |
| Account password change or user deletion via MCP | Sensitive identity lifecycle actions remain restricted to the web interface |
| Physical deletion (Hard Delete) of financial records | Violates project architecture decision `AD-010` (mandatory Soft Delete) |

---

## Assumptions & Open Questions

Every ambiguity is resolved or recorded here - nothing is left silently unclear.

| Assumption / decision | Chosen default | Rationale | Confirmed? |
| --------------------- | -------------- | --------- | ---------- |
| User credential acquisition | Web UI screen (`/mcp`) to generate revocable tokens + copy JSON snippet, with email/password fallback | Provides 1-click setup and instant revocation without exposing user passwords | y |
| MCP token storage security | Store only SHA-256 `tokenHash` and metadata in `mcp_api_tokens`; display raw JWT once at creation | Prevents credential leakage if database records are inspected | y |
| MCP server architecture & transport | Dedicated `/mcp-server` package using `@modelcontextprotocol/sdk` over `stdio` calling the NestJS REST API | Preserves 100% of business rules, decimal precision, RBAC, and audit logs | y |
| Personal vs. Family context | Optional `familyId` parameter on all domain tools with fallback to `MCP_DEFAULT_FAMILY_ID` | Allows seamless switching between personal and household finances in the same AI session | y |
| Input validation & bounds | Zod schemas on every MCP tool validating UUIDs, dates (`YYYY-MM-DD`), months (`YYYY-MM`), positive amounts, and installments (`1..72`) | Rejects malformed tool calls before hitting the backend | y |
| Failure & error handling | HTTP and validation errors return structured MCP results with `isError: true` and clear messages | Prevents `stdio` server crashes on invalid user requests or 4xx/5xx API responses | y |
| Idempotency & token retry | Automatic 1x re-login retry on `HTTP 401` when email/password fallback is configured; no automatic retry on mutations | Avoids duplicate financial transactions on network glitches | y |
| Observability & channel safety | All internal MCP server logs written strictly to `stderr`; backend mutations logged by `AuditLogInterceptor` | Protects `stdout` JSON-RPC framing while keeping full audit trails | y |

**Open questions:** none - all resolved or logged above.

---

## User Stories

### P1: Web Management of MCP Access Tokens ⭐ MVP

**User Story**: As an authenticated user, I want to generate, copy, and revoke MCP access tokens in the web interface so that I can connect AI assistants securely without sharing my password.

**Why P1**: Essential for user onboarding and credential security when configuring MCP clients.

**Acceptance Criteria**:

1. WHEN an authenticated user sends `POST /auth/mcp-tokens` with a valid `name` and optional `expiresInDays` (1 to 365) THEN the system SHALL sign a JWT token, persist only its SHA-256 `tokenHash` and metadata in `mcp_api_tokens`, and return the raw token once.
2. WHEN an authenticated user sends `GET /auth/mcp-tokens` THEN the system SHALL return only the tokens owned by that user containing `id`, `name`, `tokenPrefix`, `expiresAt`, `revokedAt`, and `createdAt` without exposing `tokenHash` or the raw token.
3. WHEN an authenticated user sends `DELETE /auth/mcp-tokens/:id` for a token they own THEN the system SHALL set `revokedAt` and register the token in `TokenBlacklistService` so subsequent API requests with that token are rejected with `HTTP 401`.
4. IF an authenticated user attempts to revoke a token owned by another user THEN the system SHALL reject the request with `HTTP 404` or `HTTP 403`.
5. WHEN an authenticated user navigates to `/mcp` in the frontend THEN the system SHALL render the token generation form, ready-to-copy MCP JSON snippet upon creation, and the list of tokens with revocation controls.

**Independent Test**: Log into the web app, open "Integração IA (MCP)", generate a token, verify the JSON snippet is displayed, and revoke the token.

---

### P1: MCP Server Authentication, HTTP Client & Context Resolution ⭐ MVP

**User Story**: As an AI assistant connected via MCP, I want the server to authenticate with the backend API and resolve Personal or Family context so that tool calls execute securely on behalf of the user.

**Why P1**: Core infrastructure required by every MCP tool and resource.

**Acceptance Criteria**:

1. WHEN the MCP server executes an API request with `MCP_API_TOKEN` configured THEN the system SHALL attach `Authorization: Bearer <MCP_API_TOKEN>` to the HTTP request.
2. WHERE `MCP_API_TOKEN` is not set and `MCP_USER_EMAIL` and `MCP_USER_PASSWORD` are configured, WHEN the MCP server executes a request without a cached token or receives `HTTP 401` THEN the system SHALL authenticate via `POST /auth/login` and retry the request once.
3. WHEN a tool is invoked without an explicit `familyId` parameter THEN the system SHALL resolve the context to `MCP_DEFAULT_FAMILY_ID` if configured or `undefined` (Personal context).
4. The system SHALL write all diagnostic logs exclusively to `stderr` to preserve `stdout` for MCP JSON-RPC communication.

**Independent Test**: Run unit tests for `config.ts` and `api-client.ts` verifying static token auth, login fallback, 401 retry, and context resolution.

---

### P1: Core Financial Tools — Context, Accounts, Categories, Tags & Transactions ⭐ MVP

**User Story**: As a user interacting with an AI assistant, I want to inspect my context, accounts, categories, and tags, and list, create, transfer, or delete transactions via MCP tools.

**Why P1**: Delivers the primary day-to-day financial operations (checking balances, viewing statements, recording expenses/incomes/transfers).

**Acceptance Criteria**:

1. WHEN the user invokes `get_current_context`, `list_families`, or `list_family_people` THEN the system SHALL query `/auth/me` and `/families` endpoints and return the structured JSON result.
2. WHEN the user invokes `list_accounts`, `get_account`, `create_account`, or `archive_account` THEN the system SHALL call the corresponding `/accounts` endpoint and return the account data.
3. WHEN the user invokes `list_categories`, `create_category`, or `list_tags` THEN the system SHALL call `/categories` or `/tags` with the resolved `familyId` and optional `type` filter.
4. WHEN the user invokes `list_transactions`, `create_transaction`, `transfer_between_accounts`, or `delete_transaction` THEN the system SHALL validate inputs and execute the operation on `/transactions` or `/transactions/transfer`.
5. IF the backend API returns an error response for any tool call THEN the system SHALL return an MCP tool response with `isError: true` and the error message text.

**Independent Test**: Invoke account, category, and transaction tools against the MCP server and verify the exact backend REST calls and MCP responses.

---

### P2: Credit Cards, Invoices, Budgets, Goals & Analytical Reports

**User Story**: As a user interacting with an AI assistant, I want to manage credit cards, pay invoices, track budgets, operate savings goals, and read financial reports and MCP resources.

**Why P2**: Completes full-feature parity across all remaining modules of the financial platform.

**Acceptance Criteria**:

1. WHEN the user invokes `list_credit_cards`, `create_credit_card`, `get_invoice_details`, or `pay_credit_card_invoice` THEN the system SHALL execute the corresponding operation on `/credit-cards` and `/credit-cards/invoices/:invoiceId`.
2. WHEN the user invokes `list_budgets`, `create_budget`, `update_budget`, or `delete_budget` THEN the system SHALL execute the corresponding operation on `/budgets`.
3. WHEN the user invokes `list_goals`, `create_goal`, `deposit_to_goal`, or `withdraw_from_goal` THEN the system SHALL execute the corresponding operation on `/goals`, `/goals/:id/deposits`, or `/goals/:id/withdraw`.
4. WHEN the user invokes `get_dashboard_summary`, `get_expenses_by_category`, `get_expenses_by_tag`, `get_cash_flow`, or `export_transactions_csv` THEN the system SHALL fetch the analytical report from `/reports/*`.
5. WHEN an MCP client reads `financeiro://dashboard/summary`, `financeiro://accounts/list`, or `financeiro://categories/catalog` THEN the system SHALL return the JSON resource content from `/reports/dashboard`, `/accounts`, and `/categories`.

**Independent Test**: Invoke credit card, budget, goal, report tools and read the 3 MCP resources, confirming response payloads.

---

## Edge Cases

- IF neither `MCP_API_TOKEN` nor (`MCP_USER_EMAIL` and `MCP_USER_PASSWORD`) are provided when a tool is called THEN the system SHALL return an MCP error instructing the user to configure `MCP_API_TOKEN` generated from the `/mcp` web screen.
- IF a user with `VIEWER` role in a family invokes a mutation tool (`create_transaction`, `create_account`, `pay_credit_card_invoice`, etc.) THEN the system SHALL surface the backend `HTTP 403 Forbidden` message with `isError: true`.
- IF a request to the backend API exceeds `MCP_HTTP_TIMEOUT_MS` THEN the system SHALL abort the request and return a timeout error with `isError: true`.

---

## Requirement Traceability

| Requirement ID | Story | Phase | Status |
| -------------- | ----- | ----- | ------ |
| MCP-01 | P1: Web Management of MCP Access Tokens (Create & List) | Phase 1 | Verified |
| MCP-02 | P1: Web Management of MCP Access Tokens (Revoke & UI `/mcp`) | Phase 1 | Verified |
| MCP-03 | P1: MCP Server Authentication & HTTP Client | Phase 2 | Verified |
| MCP-04 | P1: Personal vs. Family Context Resolution | Phase 2 | Verified |
| MCP-05 | P1: Context, Families & Accounts Tools | Phase 2 | Verified |
| MCP-06 | P1: Categories & Tags Tools | Phase 2 | Verified |
| MCP-07 | P1: Transactions & Transfers Tools | Phase 2 | Verified |
| MCP-08 | P2: Credit Cards & Invoices Tools | Phase 2 | Verified |
| MCP-09 | P2: Budgets & Goals Tools | Phase 3 | Pending |
| MCP-10 | P2: Reports Tools, MCP Resources & Server Bootstrap | Phase 3 | Pending |

**Coverage:** 10 total, 10 mapped to tasks, 0 unmapped

---

## Success Criteria

- [ ] Authenticated users can create, copy JSON config, and revoke MCP tokens from `/mcp`.
- [ ] All 31 MCP tools and 3 MCP resources execute against the backend API and pass unit and integration test suites.
- [ ] `validate_spec.py`, `validate_tasks.py`, and `validate_state.py` pass with 0 errors.
