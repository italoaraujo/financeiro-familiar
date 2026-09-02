# Sistema Financeiro Pessoal e Familiar - MVP Tasks

## Execution Protocol (MANDATORY -- do not skip)

Implement these tasks with the `tlc-spec-driven` skill: **activate it by name and follow its Execute flow and Critical Rules.** Do not search for skill files by filesystem path. The skill is the source of truth for the full flow (per-task cycle, sub-agent delegation, adequacy review, Verifier, discrimination sensor).

**If the skill cannot be activated, STOP and tell the user - do not proceed without it.**

---

**Design**: `.specs/features/sistema-financeiro-mvp/design.md`
**Status**: Draft

---

## Test Coverage Matrix

> Generated from codebase, project guidelines, and spec - confirm before Execute. Guidelines found: `docs/Arquitetura e Stack Tecnológica.md`, `docs/Documento de Visão e Requisitos de Software (SRS - MVP).md`.

| Code Layer | Required Test Type | Coverage Expectation | Location Pattern | Run Command |
| ---------- | ------------------ | -------------------- | ---------------- | ----------- |
| Services & Domain (Backend) | unit | 1:1 mapping to spec ACs, all business calculation rules (balances, invoices, budgets, goals) | `backend/test/unit/*.spec.ts` | `npm --prefix backend test` |
| Controllers & Modules (Backend) | integration | All HTTP endpoints: status codes, validation pipes, JWT guard protection | `backend/test/integration/*.spec.ts` | `npm --prefix backend test` |
| Frontend Components & Pages | unit | Render checks, calculations, formatters, and form submissions | `frontend/src/**/*.spec.tsx` | `npm --prefix frontend test` |
| Infrastructure & Docker | none | Container healthcheck & build gate only | `docker-compose.yml` | `npm run build` |

---

## Gate Check Commands

> Generated from codebase - confirm before Execute.

| Gate Level | When to Use | Command |
| ---------- | ----------- | ------- |
| Quick | After tasks with unit tests only | `npm --prefix backend test` |
| Full | After tasks with integration/e2e tests | `npm --prefix backend test && npm --prefix frontend test` |
| Build | After phase completion or config/entity-only tasks | `npm --prefix backend run build && npm --prefix frontend run build` |

---

## Execution Plan

Phases are ordered and run sequentially - each phase completes before the next begins, and tasks within a phase execute in order.

### Phase 1: Project Setup & Docker Infrastructure

Tasks initializing docker-compose, backend NestJS app, and frontend Next.js app.

```
T1 → T2 → T3 → T4
```

### Phase 2: Core Domain, Database & Identity

Tasks establishing Prisma schema, seeds, User, Auth, and Family management.

```
T5 → T6 → T7 → T8
```

### Phase 3: Financial Accounts, Cards & Categories

Tasks implementing accounts, credit cards with invoice cycle, and category catalog.

```
T9 → T10 → T11
```

### Phase 4: Transactions, Budgets, Goals & Reports

Tasks implementing transactions (with atomic balances, installments, recurrences), budgets, goals, and analytics/export.

```
T12 → T13 → T14 → T15
```

### Phase 5: Frontend Interface & Dashboards

Tasks implementing Next.js frontend pages, shell, auth context, dashboard, transactions extrato, and management screens.

```
T16 → T17 → T18 → T19 → T20 → T21
```

### Phase 6: End-to-End Verification & Documentation

Validation of full Docker Compose environment, end-to-end user flows, and final health checks.

```
T22 → T23
```

---

## Task Breakdown

### T1: Create Docker Compose and Environment Configuration

**What**: Create root `docker-compose.yml` defining `postgres`, `api` (NestJS), and `frontend` (Next.js) with health checks, volumes, networks, and root `.env.example`.
**Where**: `docker-compose.yml`
**Depends on**: None
**Requirement**: AUTH-01
**Done when**:
- [x] `docker-compose.yml` specifies `postgres:16-alpine`, `api`, `frontend` on `financial-net`
- [x] PostgreSQL health check configured
- [x] Environment file `.env.example` created
**Tests**: none
**Gate**: build

---

### T2: Scaffold Backend NestJS Application

**What**: Initialize NestJS backend directory structure, `package.json`, `tsconfig.json`, and core dependencies (`@nestjs/core`, `@nestjs/jwt`, `passport`, `prisma`, `class-validator`, `bcrypt`).
**Where**: `backend/package.json`
**Depends on**: T1
**Requirement**: AUTH-01
**Done when**:
- [x] NestJS package.json with scripts `build`, `start:dev`, `test` configured
- [x] TypeScript config and NestJS bootstrap in place
- [x] Backend compiles without errors
**Tests**: none
**Gate**: build

---

### T3: Scaffold Frontend Next.js Application

**What**: Initialize Next.js 14+ App Router frontend with Tailwind CSS, Lucide icons, Recharts, and TypeScript configuration.
**Where**: `frontend/package.json`
**Depends on**: T2
**Requirement**: AUTH-01
**Done when**:
- [x] Next.js App Router scaffolded with Tailwind CSS and base styles
- [x] Frontend compiles without errors
**Tests**: none
**Gate**: build

---

### T4: Create Dockerfiles for Backend and Frontend

**What**: Create production/development multi-stage `Dockerfile` for backend and `Dockerfile` for frontend.
**Where**: `backend/Dockerfile`
**Depends on**: T3
**Requirement**: AUTH-01
**Done when**:
- [x] `backend/Dockerfile` and `frontend/Dockerfile` created and syntax-checked
**Tests**: none
**Gate**: build

---

### T5: Configure Prisma Schema with Relational Financial Model

**What**: Create complete Prisma schema file with all 11 models (`User`, `Family`, `FamilyMember`, `Account`, `CreditCard`, `CreditCardInvoice`, `Category`, `Transaction`, `Recurrence`, `Budget`, `Goal`, `GoalDeposit`) with exact `Decimal(15,2)` precision.
**Where**: `backend/prisma/schema.prisma`
**Depends on**: None
**Requirement**: ACCT-01
**Done when**:
- [x] Schema declares all models, enums, relations, indexes, and decimal fields
- [x] `npx prisma validate` passes
**Tests**: none
**Gate**: build

---

### T6: Implement Prisma Service and Database Seed

**What**: Create `PrismaService` lifecycle management in NestJS and a database seed script creating default categories, demo user, and demo family.
**Where**: `backend/src/prisma/prisma.service.ts`
**Depends on**: T5
**Requirement**: CAT-01
**Done when**:
- [x] `PrismaService` connects cleanly to PostgreSQL
- [x] Seed populates default system categories (Alimentação, Moradia, Transporte, etc.)
**Tests**: unit
**Gate**: quick

---

### T7: Implement Auth and Users Module

**What**: Implement user registration with bcrypt hash, JWT authentication, passport strategies (`jwt`, `local`), and `JwtAuthGuard`.
**Where**: `backend/src/modules/auth/auth.service.ts`
**Depends on**: T6
**Requirement**: AUTH-01
**Done when**:
- [x] `POST /auth/register` creates user and returns JWT
- [x] `POST /auth/login` verifies credentials and returns JWT
- [x] Unit tests cover registration, login success, and invalid credential rejections (401)
**Tests**: unit
**Gate**: quick

---

### T8: Implement Families Module and Multi-User RBAC

**What**: Implement family creation (`OWNER`), member invitation with roles (`ADMIN`, `MEMBER`, `VIEWER`), and family context guards.
**Where**: `backend/src/modules/families/families.service.ts`
**Depends on**: T7
**Requirement**: AUTH-02
**Done when**:
- [x] `POST /families` creates family group
- [x] `POST /families/:id/members` adds member with role
- [x] Unit tests verify role assignment and member listings
**Tests**: unit
**Gate**: quick

---

### T9: Implement Accounts Module and Balance Recalculation

**What**: Implement CRUD for bank accounts and cash wallets, with current balance updates and archiving logic.
**Where**: `backend/src/modules/accounts/accounts.service.ts`
**Depends on**: None
**Requirement**: ACCT-01
**Done when**:
- [x] Account CRUD with types `CHECKING`, `SAVINGS`, `INVESTMENT`, `CASH`, `OTHER`
- [x] Archiving prevents deletion if transactions exist
- [x] Unit tests verify account balance defaults and updates
**Tests**: unit
**Gate**: quick

---

### T10: Implement Credit Cards and Invoices Module

**What**: Implement credit cards management, automatic monthly invoice generation based on closing/due days, and invoice payment logic.
**Where**: `backend/src/modules/credit-cards/credit-cards.service.ts`
**Depends on**: T9
**Requirement**: CARD-01
**Done when**:
- [x] Credit card creation with closing and due day cycle
- [x] Invoice retrieval and payment status transition to `PAID`
- [x] Unit tests verify invoice reference month calculation and limit subtraction
**Tests**: unit
**Gate**: quick

---

### T11: Implement Categories and Subcategories Module

**What**: Implement category catalog, custom category/subcategory creation, and cascade integrity protection.
**Where**: `backend/src/modules/categories/categories.service.ts`
**Depends on**: T10
**Requirement**: CAT-01
**Done when**:
- [x] Category hierarchy listing and custom creation
- [x] Prevent deletion of categories associated with active transactions
- [x] Unit tests verify hierarchy and deletion guards
**Tests**: unit
**Gate**: quick

---

### T12: Implement Transactions Module with Atomic Balance Updates

**What**: Implement income, expense, transfers between accounts (atomic `prisma.$transaction`), credit card purchase allocation, installments (`installmentGroupId`), and recurrences.
**Where**: `backend/src/modules/transactions/transactions.service.ts`
**Depends on**: None
**Requirement**: TX-01
**Done when**:
- [x] Creates income/expense with immediate balance recalculation
- [x] Creates atomic transfers debiting origin and crediting destination
- [x] Generates installment series across consecutive invoice cycles
- [x] Respects `is_private` visibility flag
- [x] Unit tests verify decimal accuracy, rollback on failure, and private filters
**Tests**: unit
**Gate**: quick

---

### T13: Implement Budgets Module with Consumption Alerts

**What**: Implement monthly category budget caps and real-time consumption percentage calculation with alert threshold triggers (e.g. 80%).
**Where**: `backend/src/modules/budgets/budgets.service.ts`
**Depends on**: T12
**Requirement**: BUD-01
**Done when**:
- [x] Budget creation per category and month (`YYYY-MM`)
- [x] Calculation of spent vs target amount and alert trigger flag
- [x] Unit tests verify consumption math and alert threshold logic
**Tests**: unit
**Gate**: quick

---

### T14: Implement Goals and Deposits Module

**What**: Implement savings goals tracking, deposit recording, and progress percentage computation.
**Where**: `backend/src/modules/goals/goals.service.ts`
**Depends on**: T13
**Requirement**: GOAL-01
**Done when**:
- [x] Goals creation with target amounts and deadlines
- [x] Deposit creation updating `current_amount`
- [x] Unit tests verify percentage completion calculations
**Tests**: unit
**Gate**: quick

---

### T15: Implement Reports and Export Module

**What**: Implement summary analytics for dashboard (total balance, monthly revenues, monthly expenses, cash flow series) and CSV/XLSX export.
**Where**: `backend/src/modules/reports/reports.service.ts`
**Depends on**: T14
**Requirement**: REP-01
**Done when**:
- [x] Aggregated metrics endpoint for dashboard
- [x] Category spending distribution endpoint
- [x] CSV data generator for transactions export
- [x] Unit tests verify aggregation math and export generator
**Tests**: unit
**Gate**: quick

---

### T16: Implement Frontend API Client and Auth State Management

**What**: Implement frontend HTTP API client (`src/lib/api.ts`), JWT session storage, auth context provider, and route protection hooks.
**Where**: `frontend/src/lib/api.ts`
**Depends on**: None
**Requirement**: AUTH-01
**Done when**:
- [x] API client attaches Bearer token to requests
- [x] AuthProvider handles login, register, logout, and family context switcher
- [x] Unit tests verify token storage and request formatting
**Tests**: unit
**Gate**: quick

---

### T17: Implement Auth Pages and Main App Shell

**What**: Create login and register pages with elegant UI, plus responsive app sidebar, navigation header, and family context dropdown.
**Where**: `frontend/src/components/layout/AppShell.tsx`
**Depends on**: T16
**Requirement**: AUTH-04
**Done when**:
- [x] Login and Register forms with validation and error toasts
- [x] Sidebar navigation with active route highlights and context switcher
**Tests**: unit
**Gate**: quick

---

### T18: Implement Interactive Financial Dashboard

**What**: Create main dashboard page (`/`) with KPI summary cards (Saldo Total, Receitas, Despesas, Balanço), Recharts expense breakdown pie chart, and monthly cashflow bar chart.
**Where**: `frontend/src/app/page.tsx`
**Depends on**: T17
**Requirement**: REP-01
**Done when**:
- [ ] Dashboard cards render live financial indicators
- [ ] Interactive charts display expense by category and monthly comparisons
- [ ] Responsive grid layout adapts to desktop and mobile
**Tests**: unit
**Gate**: quick

---

### T19: Implement Transactions Management and Extrato

**What**: Create transactions page (`/transactions`) with paginated data table, search/filter bar (dates, category, account, type), and multi-type transaction modal (Income, Expense, Transfer, Installments).
**Where**: `frontend/src/app/transactions/page.tsx`
**Depends on**: T18
**Requirement**: TX-01
**Done when**:
- [ ] Filterable and paginated transactions table
- [ ] Modal supporting single, transfer, and installment creations
- [ ] Action buttons for edit and delete with automatic balance refresh
**Tests**: unit
**Gate**: quick

---

### T20: Implement Accounts and Credit Cards UI

**What**: Create accounts and cards pages (`/accounts`, `/cards`) displaying account balances, card limit meters, open invoices, and invoice settlement modal.
**Where**: `frontend/src/app/accounts/page.tsx`
**Depends on**: T19
**Requirement**: ACCT-01
**Done when**:
- [ ] Account listing with balance cards and new account dialog
- [ ] Credit card listing with visual limit progress bar and invoice details
**Tests**: unit
**Gate**: quick

---

### T21: Implement Budgets, Goals, Family and Reports UI

**What**: Create budgets page (`/budgets`), goals page (`/goals`), family management (`/family`), and reports export page (`/reports`).
**Where**: `frontend/src/app/budgets/page.tsx`
**Depends on**: T20
**Requirement**: BUD-01
**Done when**:
- [ ] Budget progress bars with warning colors on >80% consumption
- [ ] Goals cards with target progress and deposit modal
- [ ] Family members table with invitation form
- [ ] Reports page with instant CSV export download
**Tests**: unit
**Gate**: quick

---

### T22: End-to-End Test Suite and Verification

**What**: Create integration test suite exercising the complete lifecycle: user registration -> family creation -> account creation -> card purchase -> transfer -> budget alert -> dashboard aggregation.
**Where**: `backend/test/integration/financial-flow.spec.ts`
**Depends on**: None
**Requirement**: AUTH-01
**Done when**:
- [ ] E2E integration test runs and passes all scenarios
- [ ] Full gate check passes
**Tests**: integration
**Gate**: full

---

### T23: Environment Verification and Container Build Gate

**What**: Verify that `docker-compose.yml`, backend build, and frontend build compile cleanly without type errors or lint failures.
**Where**: `README.md`
**Depends on**: T22
**Requirement**: AUTH-01
**Done when**:
- [ ] Backend build passes (`npm run build`)
- [ ] Frontend build passes (`npm run build`)
- [ ] Comprehensive README with setup instructions and API docs created
**Tests**: none
**Gate**: build

---

## Phase Execution Map

```
Phase 1 → Phase 2 → Phase 3 → Phase 4 → Phase 5 → Phase 6

Phase 1:  T1 -> T2 -> T3 -> T4
Phase 2:  T5 -> T6 -> T7 -> T8
Phase 3:  T9 -> T10 -> T11
Phase 4:  T12 -> T13 -> T14 -> T15
Phase 5:  T16 -> T17 -> T18 -> T19 -> T20 -> T21
Phase 6:  T22 -> T23
```

---

## Task Granularity Check

| Task | Scope | Status |
| ---- | ----- | ------ |
| T1: Create Docker Compose | 1 config file | ✅ Granular |
| T2: Scaffold Backend | 1 project setup | ✅ Granular |
| T3: Scaffold Frontend | 1 project setup | ✅ Granular |
| T4: Create Dockerfiles | Dockerfiles | ✅ Granular |
| T5: Configure Prisma Schema | 1 schema file | ✅ Granular |
| T6: Implement Prisma Service & Seed | 1 service & seed | ✅ Granular |
| T7: Implement Auth & Users Module | 1 auth module | ✅ Granular |
| T8: Implement Families Module | 1 family module | ✅ Granular |
| T9: Implement Accounts Module | 1 accounts module | ✅ Granular |
| T10: Implement Credit Cards Module | 1 credit cards module | ✅ Granular |
| T11: Implement Categories Module | 1 categories module | ✅ Granular |
| T12: Implement Transactions Module | 1 transactions module | ✅ Granular |
| T13: Implement Budgets Module | 1 budgets module | ✅ Granular |
| T14: Implement Goals Module | 1 goals module | ✅ Granular |
| T15: Implement Reports Module | 1 reports module | ✅ Granular |
| T16: Implement Frontend API Client | 1 client utility | ✅ Granular |
| T17: Implement Auth & Shell UI | 1 layout & auth UI | ✅ Granular |
| T18: Implement Dashboard UI | 1 dashboard view | ✅ Granular |
| T19: Implement Transactions UI | 1 transactions view | ✅ Granular |
| T20: Implement Accounts & Cards UI | 1 accounts & cards view | ✅ Granular |
| T21: Implement Budgets, Goals & Reports UI | 1 views suite | ✅ Granular |
| T22: End-to-End Test Suite | 1 test suite | ✅ Granular |
| T23: Environment Verification | 1 documentation & build | ✅ Granular |

---

## Diagram-Definition Cross-Check

| Task | Depends On (task body) | Diagram Shows | Status |
| ---- | ---------------------- | ------------- | ------ |
| T1 | None | None | ✅ Match |
| T2 | T1 | T1 -> T2 | ✅ Match |
| T3 | T2 | T2 -> T3 | ✅ Match |
| T4 | T3 | T3 -> T4 | ✅ Match |
| T5 | None | None | ✅ Match |
| T6 | T5 | T5 -> T6 | ✅ Match |
| T7 | T6 | T6 -> T7 | ✅ Match |
| T8 | T7 | T7 -> T8 | ✅ Match |
| T9 | None | None | ✅ Match |
| T10 | T9 | T9 -> T10 | ✅ Match |
| T11 | T10 | T10 -> T11 | ✅ Match |
| T12 | None | None | ✅ Match |
| T13 | T12 | T12 -> T13 | ✅ Match |
| T14 | T13 | T13 -> T14 | ✅ Match |
| T15 | T14 | T14 -> T15 | ✅ Match |
| T16 | None | None | ✅ Match |
| T17 | T16 | T16 -> T17 | ✅ Match |
| T18 | T17 | T17 -> T18 | ✅ Match |
| T19 | T18 | T18 -> T19 | ✅ Match |
| T20 | T19 | T19 -> T20 | ✅ Match |
| T21 | T20 | T20 -> T21 | ✅ Match |
| T22 | None | None | ✅ Match |
| T23 | T22 | T22 -> T23 | ✅ Match |

---

## Test Co-location Validation

| Task | Code Layer Created/Modified | Matrix Requires | Task Says | Status |
| ---- | --------------------------- | --------------- | --------- | ------ |
| T1: Create Docker Compose | Infrastructure / Config | none | none | ✅ OK |
| T2: Scaffold Backend | Infrastructure / Config | none | none | ✅ OK |
| T3: Scaffold Frontend | Infrastructure / Config | none | none | ✅ OK |
| T4: Create Dockerfiles | Infrastructure / Config | none | none | ✅ OK |
| T5: Configure Prisma Schema | Database Schema | none | none | ✅ OK |
| T6: Implement Prisma Service & Seed | Database Service | unit | unit | ✅ OK |
| T7: Implement Auth & Users Module | Service & Domain | unit | unit | ✅ OK |
| T8: Implement Families Module | Service & Domain | unit | unit | ✅ OK |
| T9: Implement Accounts Module | Service & Domain | unit | unit | ✅ OK |
| T10: Implement Credit Cards Module | Service & Domain | unit | unit | ✅ OK |
| T11: Implement Categories Module | Service & Domain | unit | unit | ✅ OK |
| T12: Implement Transactions Module | Service & Domain | unit | unit | ✅ OK |
| T13: Implement Budgets Module | Service & Domain | unit | unit | ✅ OK |
| T14: Implement Goals Module | Service & Domain | unit | unit | ✅ OK |
| T15: Implement Reports Module | Service & Domain | unit | unit | ✅ OK |
| T16: Implement Frontend API Client | Frontend Utility | unit | unit | ✅ OK |
| T17: Implement Auth & Shell UI | Frontend Component | unit | unit | ✅ OK |
| T18: Implement Dashboard UI | Frontend Component | unit | unit | ✅ OK |
| T19: Implement Transactions UI | Frontend Component | unit | unit | ✅ OK |
| T20: Implement Accounts & Cards UI | Frontend Component | unit | unit | ✅ OK |
| T21: Implement Budgets, Goals & Reports UI | Frontend Component | unit | unit | ✅ OK |
| T22: End-to-End Test Suite | Integration Test | integration | integration | ✅ OK |
| T23: Environment Verification | Documentation & Build | none | none | ✅ OK |
