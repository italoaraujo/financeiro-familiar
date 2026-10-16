# MCP Server Tasks

## Execution Protocol (MANDATORY -- do not skip)

Implement these tasks with the `tlc-spec-driven` skill: **activate it by name and follow its Execute flow and Critical Rules.** Do not search for skill files by filesystem path. The skill is the source of truth for the full flow (per-task cycle, sub-agent delegation, adequacy review, Verifier, discrimination sensor).

**If the skill cannot be activated, STOP and tell the user - do not proceed without it.**

---

**Design**: `.specs/features/mcp-server/design.md`
**Status**: Approved

---

## Test Coverage Matrix

> Generated from codebase, project guidelines, and spec - confirmed before Execute. Guidelines found: `backend/package.json` (Jest config), `.specs/STATE.md` (AD-001 to AD-028).

| Code Layer | Required Test Type | Coverage Expectation | Location Pattern | Run Command |
| ---------- | ------------------ | -------------------- | ---------------- | ----------- |
| Backend Auth / MCP Tokens (`AuthService` / `TokenBlacklistService`) | unit | All branches; 1:1 to spec ACs (`MCP-01`, `MCP-02`); BOLA & revocation edge cases | `backend/test/unit/*.spec.ts` | `npm --prefix backend test` |
| MCP Config & HTTP Client (`src/config.ts`, `src/http/api-client.ts`) | unit | All branches; 1:1 to spec ACs (`MCP-03`, `MCP-04`); token auth, 401 retry, timeout, CSV, HTTP errors | `mcp-server/test/unit/*.spec.ts` | `npm --prefix mcp-server test` |
| MCP Domain Tools & Resources (`src/tools/*.ts`) | unit | All 31 tools and 3 resources; 1:1 to spec ACs (`MCP-05` to `MCP-10`); error handling (`isError: true`) | `mcp-server/test/unit/*.spec.ts` | `npm --prefix mcp-server test` |
| MCP Server Bootstrap (`src/server.ts`) | integration | In-memory MCP server tool/resource registration and execution | `mcp-server/test/integration/*.spec.ts` | `npm --prefix mcp-server test` |
| Frontend UI & Docs (`frontend/src/app/mcp/page.tsx`, `README.md`) | none | Build gate only | - | `npm --prefix frontend run build` |

## Gate Check Commands

> Generated from codebase - confirmed before Execute.

| Gate Level | When to Use | Command |
| ---------- | ----------- | ------- |
| Quick | After tasks with unit tests only | `npm --prefix backend test` or `npm --prefix mcp-server test` |
| Full | After tasks with integration tests | `npm --prefix mcp-server test` |
| Build | After phase completion, frontend UI, or config/docs tasks | `npm --prefix backend test && npm --prefix frontend run build && npm --prefix mcp-server run build && npm --prefix mcp-server test` |

---

## Execution Plan

Phases are ordered and run sequentially - each phase completes before the next begins, and tasks within a phase execute in order.

### Phase 1: Spec, Backend MCP Tokens & Web UI

```
T1 -> T2 -> T3
```

### Phase 2: MCP Server Foundation & Core Domain Tools

```
T4 -> T5 -> T6 -> T7 -> T8
```

### Phase 3: Budgets, Goals, Reports, Server Integration & Docs

```
T9 -> T10 -> T11 -> T12
```

---

## Task Breakdown

### Phase 1: Spec, Backend MCP Tokens & Web UI

### T1: Author Spec, Context, Design, and Tasks Artifacts

**What**: Create `.specs/features/mcp-server/{spec.md,context.md,design.md,tasks.md}` and pass deterministic validation scripts.
**Where**: `.specs/features/mcp-server/spec.md`
**Depends on**: None
**Reuses**: `.agent/skills/tlc-spec-driven/scripts/validate_spec.py`
**Requirement**: MCP-01

**Tools**:

- MCP: NONE
- Skill: `tlc-spec-driven`

**Done when**:

- [x] `spec.md`, `context.md`, `design.md`, and `tasks.md` created
- [x] `python3 .agent/skills/tlc-spec-driven/scripts/validate_spec.py mcp-server --root .` exits 0
- [x] `python3 .agent/skills/tlc-spec-driven/scripts/validate_tasks.py mcp-server --root .` exits 0

**Tests**: none
**Gate**: build

---

### T2: Implement Backend MCP Access Tokens (`McpApiToken` + `AuthService` + `AuthController`)

**What**: Add `McpApiToken` to Prisma schema, add `addHash` to `TokenBlacklistService`, and implement `POST /auth/mcp-tokens`, `GET /auth/mcp-tokens`, and `DELETE /auth/mcp-tokens/:id` with unit tests.
**Where**: `backend/src/modules/auth/auth.service.ts`
**Depends on**: T1
**Reuses**: `backend/src/modules/auth/token-blacklist.service.ts`
**Requirement**: MCP-01, MCP-02

**Tools**:

- MCP: NONE
- Skill: `tlc-spec-driven`

**Done when**:

- [ ] `McpApiToken` model added to Prisma schema and Prisma client regenerated
- [ ] `TokenBlacklistService.addHash` persists and caches revoked token hashes
- [ ] `AuthService` & `AuthController` implement create, list, and revoke MCP tokens with BOLA protection
- [ ] Unit tests in `backend/test/unit/mcp-tokens.spec.ts` pass covering creation, listing, revocation, and unauthorized access
- [ ] Gate check passes: `npm --prefix backend test`

**Tests**: unit
**Gate**: quick

---

### T3: Create Frontend MCP Integration Page (`/mcp`) and Navigation Link

**What**: Add "Integração IA (MCP)" link in `AppShell` and create `frontend/src/app/mcp/page.tsx` to generate tokens, copy the ready-to-use MCP JSON config, and revoke tokens.
**Where**: `frontend/src/app/mcp/page.tsx`
**Depends on**: T2
**Reuses**: `frontend/src/components/layout/AppShell.tsx`
**Requirement**: MCP-02

**Tools**:

- MCP: NONE
- Skill: `tlc-spec-driven`

**Done when**:

- [ ] `AppShell.tsx` includes navigation item to `/mcp`
- [ ] `frontend/src/app/mcp/page.tsx` allows creating tokens, copying raw token + MCP JSON config snippet, and revoking tokens
- [ ] Gate check passes: `npm --prefix frontend run build`

**Tests**: none
**Gate**: build

---

### Phase 2: MCP Server Foundation & Core Domain Tools

### T4: Initialize `/mcp-server` Package and Environment Config (`src/config.ts`)

**What**: Initialize `/mcp-server` (`package.json`, `tsconfig.json`, `.env.example`) and implement `src/config.ts` with unit tests in `test/unit/config.spec.ts`.
**Where**: `mcp-server/src/config.ts`
**Depends on**: T3
**Reuses**: `backend/package.json`
**Requirement**: MCP-03, MCP-04

**Tools**:

- MCP: NONE
- Skill: `tlc-spec-driven`

**Done when**:

- [ ] `mcp-server/package.json`, `tsconfig.json`, and `.env.example` created and dependencies installed
- [ ] `loadConfig` and `resolveFamilyId` implemented in `mcp-server/src/config.ts`
- [ ] Unit tests in `mcp-server/test/unit/config.spec.ts` pass
- [ ] Gate check passes: `npm --prefix mcp-server test`

**Tests**: unit
**Gate**: quick

---

### T5: Implement `FinancialApiClient` and MCP Result Formatters (`src/http/api-client.ts`)

**What**: Implement `FinancialApiClient` supporting `MCP_API_TOKEN`, email/password auto-login, 1x retry on `HTTP 401`, query params, CSV responses, timeouts, and MCP tool result/error formatting.
**Where**: `mcp-server/src/http/api-client.ts`
**Depends on**: T4
**Reuses**: `frontend/src/lib/api.ts`
**Requirement**: MCP-03, MCP-04

**Tools**:

- MCP: NONE
- Skill: `tlc-spec-driven`

**Done when**:

- [ ] `FinancialApiClient`, `ApiClientError`, `formatToolResult`, and `formatToolError` implemented in `mcp-server/src/http/api-client.ts`
- [ ] Unit tests in `mcp-server/test/unit/api-client.spec.ts` cover bearer token, login fallback, 401 retry, query params, CSV text, timeout, and error formatting
- [ ] Gate check passes: `npm --prefix mcp-server test`

**Tests**: unit
**Gate**: quick

---

### T6: Implement Context, Families, Accounts, Categories & Tags Tools

**What**: Implement `context-tools.ts` (`get_current_context`, `list_families`, `list_family_people`) and `accounts-tools.ts` (`list_accounts`, `get_account`, `create_account`, `archive_account`, `list_categories`, `create_category`, `list_tags`) with unit tests.
**Where**: `mcp-server/src/tools/accounts-tools.ts`
**Depends on**: T5
**Reuses**: `mcp-server/src/http/api-client.ts`
**Requirement**: MCP-05, MCP-06

**Tools**:

- MCP: NONE
- Skill: `tlc-spec-driven`

**Done when**:

- [ ] 10 tools registered across `context-tools.ts` and `accounts-tools.ts`
- [ ] Unit tests in `mcp-server/test/unit/accounts-context-tools.spec.ts` verify all 10 tools and error handling
- [ ] Gate check passes: `npm --prefix mcp-server test`

**Tests**: unit
**Gate**: quick

---

### T7: Implement Transactions and Transfers Tools (`src/tools/transactions-tools.ts`)

**What**: Implement `list_transactions`, `create_transaction`, `transfer_between_accounts`, and `delete_transaction` in `src/tools/transactions-tools.ts` with unit tests.
**Where**: `mcp-server/src/tools/transactions-tools.ts`
**Depends on**: T6
**Reuses**: `backend/src/modules/transactions/dto/create-transaction.dto.ts`
**Requirement**: MCP-07

**Tools**:

- MCP: NONE
- Skill: `tlc-spec-driven`

**Done when**:

- [ ] 4 tools registered in `mcp-server/src/tools/transactions-tools.ts`
- [ ] Unit tests in `mcp-server/test/unit/transactions-tools.spec.ts` verify filters, installment payloads, transfers, deletions, and backend error propagation
- [ ] Gate check passes: `npm --prefix mcp-server test`

**Tests**: unit
**Gate**: quick

---

### T8: Implement Credit Cards and Invoices Tools (`src/tools/credit-cards-tools.ts`)

**What**: Implement `list_credit_cards`, `create_credit_card`, `get_invoice_details`, and `pay_credit_card_invoice` in `src/tools/credit-cards-tools.ts` with unit tests.
**Where**: `mcp-server/src/tools/credit-cards-tools.ts`
**Depends on**: T7
**Reuses**: `backend/src/modules/credit-cards/credit-cards.controller.ts`
**Requirement**: MCP-08

**Tools**:

- MCP: NONE
- Skill: `tlc-spec-driven`

**Done when**:

- [ ] 4 tools registered in `mcp-server/src/tools/credit-cards-tools.ts`
- [ ] Unit tests in `mcp-server/test/unit/credit-cards-tools.spec.ts` verify card listing, creation, invoice breakdown, and invoice payment
- [ ] Gate check passes: `npm --prefix mcp-server test`

**Tests**: unit
**Gate**: quick

---

### Phase 3: Budgets, Goals, Reports, Server Integration & Docs

### T9: Implement Budgets and Goals Tools (`src/tools/budgets-goals-tools.ts`)

**What**: Implement `list_budgets`, `create_budget`, `update_budget`, `delete_budget`, `list_goals`, `create_goal`, `deposit_to_goal`, and `withdraw_from_goal` in `src/tools/budgets-goals-tools.ts` with unit tests.
**Where**: `mcp-server/src/tools/budgets-goals-tools.ts`
**Depends on**: T8
**Reuses**: `backend/src/modules/goals/goals.controller.ts`
**Requirement**: MCP-09

**Tools**:

- MCP: NONE
- Skill: `tlc-spec-driven`

**Done when**:

- [ ] 8 tools registered in `mcp-server/src/tools/budgets-goals-tools.ts`
- [ ] Unit tests in `mcp-server/test/unit/budgets-goals-tools.spec.ts` verify all 8 tools and error paths
- [ ] Gate check passes: `npm --prefix mcp-server test`

**Tests**: unit
**Gate**: quick

---

### T10: Implement Reports Tools and MCP Resources (`src/tools/reports-tools.ts`)

**What**: Implement `get_dashboard_summary`, `get_expenses_by_category`, `get_expenses_by_tag`, `get_cash_flow`, `export_transactions_csv`, and the 3 MCP Resources (`financeiro://dashboard/summary`, `financeiro://accounts/list`, `financeiro://categories/catalog`) in `src/tools/reports-tools.ts` with unit tests.
**Where**: `mcp-server/src/tools/reports-tools.ts`
**Depends on**: T9
**Reuses**: `backend/src/modules/reports/reports.controller.ts`
**Requirement**: MCP-10

**Tools**:

- MCP: NONE
- Skill: `tlc-spec-driven`

**Done when**:

- [ ] 5 report tools and 3 MCP resources registered in `mcp-server/src/tools/reports-tools.ts`
- [ ] Unit tests in `mcp-server/test/unit/reports-tools.spec.ts` verify all 5 tools and 3 resources
- [ ] Gate check passes: `npm --prefix mcp-server test`

**Tests**: unit
**Gate**: quick

---

### T11: Implement `createFinancialMcpServer` (`src/server.ts`), CLI Entrypoint (`src/index.ts`) & Integration Suite

**What**: Wire all tool/resource registrars into `createFinancialMcpServer` in `src/server.ts`, create `stdio` entrypoint in `src/index.ts`, and write end-to-end integration tests in `test/integration/mcp-server.spec.ts`.
**Where**: `mcp-server/src/server.ts`
**Depends on**: T10
**Reuses**: `mcp-server/src/tools/reports-tools.ts`
**Requirement**: MCP-10

**Tools**:

- MCP: NONE
- Skill: `tlc-spec-driven`

**Done when**:

- [ ] `src/server.ts` and `src/index.ts` compile cleanly to `dist/`
- [ ] Integration test suite in `mcp-server/test/integration/mcp-server.spec.ts` connects an MCP `Client` over `InMemoryTransport` to `createFinancialMcpServer`, lists all 31 tools and 3 resources, and executes sample calls end-to-end
- [ ] Gate check passes: `npm --prefix mcp-server run build && npm --prefix mcp-server test`

**Tests**: integration
**Gate**: full

---

### T12: Document MCP Setup (`mcp-server/README.md`, Root `README.md`) and Record `AD-029` in `STATE.md`

**What**: Write comprehensive documentation in `mcp-server/README.md`, update root `README.md`, and record `AD-029` + execution state in `.specs/STATE.md`.
**Where**: `mcp-server/README.md`
**Depends on**: T11
**Reuses**: `README.md`
**Requirement**: MCP-10

**Tools**:

- MCP: NONE
- Skill: `tlc-spec-driven`

**Done when**:

- [ ] `mcp-server/README.md` documents setup, environment variables, web token generation at `/mcp`, and client configurations
- [ ] Root `README.md` and `.specs/STATE.md` (`AD-029`) updated
- [ ] Full build gate passes across backend, frontend, and mcp-server

**Tests**: none
**Gate**: build

---

## Task Granularity Check

| Task | Scope | Status |
| ---- | ----- | ------ |
| T1: Spec, Context, Design & Tasks | Spec artifacts | ✅ Granular |
| T2: Backend MCP Access Tokens | 1 module (`auth`) | ✅ Granular |
| T3: Frontend `/mcp` Page | 1 page (`mcp/page.tsx`) | ✅ Granular |
| T4: MCP Package & `config.ts` | 1 module (`config.ts`) | ✅ Granular |
| T5: `FinancialApiClient` | 1 class (`api-client.ts`) | ✅ Granular |
| T6: Context, Accounts, Categories & Tags Tools | Cohesive tool registrar | ✅ Granular |
| T7: Transactions & Transfers Tools | 1 tool module (`transactions-tools.ts`) | ✅ Granular |
| T8: Credit Cards & Invoices Tools | 1 tool module (`credit-cards-tools.ts`) | ✅ Granular |
| T9: Budgets & Goals Tools | 1 tool module (`budgets-goals-tools.ts`) | ✅ Granular |
| T10: Reports Tools & Resources | 1 tool module (`reports-tools.ts`) | ✅ Granular |
| T11: MCP Server Wiring & Integration Test | `server.ts` + `index.ts` | ✅ Granular |
| T12: Documentation & `STATE.md` | Docs & ADR | ✅ Granular |

---

## Diagram-Definition Cross-Check

| Task | Depends On (task body) | Diagram Shows | Status |
| ---- | ---------------------- | ------------- | ------ |
| T1 | None | Phase 1 start | ✅ Match |
| T2 | T1 | `T1 -> T2` | ✅ Match |
| T3 | T2 | `T2 -> T3` | ✅ Match |
| T4 | T3 | Cross-phase (`Phase 1 -> Phase 2`) | ✅ Match |
| T5 | T4 | `T4 -> T5` | ✅ Match |
| T6 | T5 | `T5 -> T6` | ✅ Match |
| T7 | T6 | `T6 -> T7` | ✅ Match |
| T8 | T7 | `T7 -> T8` | ✅ Match |
| T9 | T8 | Cross-phase (`Phase 2 -> Phase 3`) | ✅ Match |
| T10 | T9 | `T9 -> T10` | ✅ Match |
| T11 | T10 | `T10 -> T11` | ✅ Match |
| T12 | T11 | `T11 -> T12` | ✅ Match |

---

## Test Co-location Validation

| Task | Code Layer Created/Modified | Matrix Requires | Task Says | Status |
| ---- | --------------------------- | --------------- | --------- | ------ |
| T1 | Spec Markdown Artifacts | none | none | ✅ OK |
| T2 | Backend Auth / MCP Tokens | unit | unit | ✅ OK |
| T3 | Frontend UI (`/mcp`) | none | none | ✅ OK |
| T4 | MCP Config (`src/config.ts`) | unit | unit | ✅ OK |
| T5 | MCP HTTP Client (`src/http/api-client.ts`) | unit | unit | ✅ OK |
| T6 | MCP Domain Tools (`context` & `accounts`) | unit | unit | ✅ OK |
| T7 | MCP Domain Tools (`transactions`) | unit | unit | ✅ OK |
| T8 | MCP Domain Tools (`credit-cards`) | unit | unit | ✅ OK |
| T9 | MCP Domain Tools (`budgets-goals`) | unit | unit | ✅ OK |
| T10 | MCP Domain Tools (`reports` & resources) | unit | unit | ✅ OK |
| T11 | MCP Server Bootstrap (`src/server.ts`) | integration | integration | ✅ OK |
| T12 | Docs & ADR (`README.md`, `STATE.md`) | none | none | ✅ OK |
