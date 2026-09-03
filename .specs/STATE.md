# STATE

## Decisions

### AD-001
- **Decision**: Adopt a decoupled Monorepo structure containing NestJS backend (`/backend`), Next.js 14+ frontend (`/frontend`), and PostgreSQL managed via Docker Compose.
- **Reason**: Unifies TypeScript across client and server while maintaining clear architectural separation of concerns and streamlined local development.
- **Trade-off**: Requires managing two separate Node.js project setups in one repository instead of a single unified framework.
- **Scope**: Entire project repository structure, build pipelines, and Docker orchestration.
- **Date**: 2026-09-01
- **Status**: active

### AD-002
- **Decision**: Store all financial amounts strictly as `DECIMAL(15, 2)` in PostgreSQL via Prisma ORM.
- **Reason**: Prevents binary floating-point rounding anomalies and guarantees exact monetary calculations.
- **Trade-off**: Requires explicit casting and Decimal handling in JavaScript/TypeScript business logic.
- **Scope**: Database schema, DTOs, calculation services, and UI formatters.
- **Date**: 2026-09-01
- **Status**: active

### AD-003
- **Decision**: Implement dual-context tenancy (Personal vs. Family) with JWT authentication, Refresh Tokens, and RBAC (`OWNER`, `ADMIN`, `MEMBER`, `VIEWER`).
- **Reason**: Allows users to manage private personal records alongside shared household finances without data leakage.
- **Trade-off**: Requires explicit tenant/family boundary verification on all queries and mutations.
- **Scope**: Backend Auth and Access Guards, Prisma relational models, and Frontend context switcher.
- **Date**: 2026-09-01
- **Status**: active

### AD-004
- **Decision**: Execute multi-step financial mutations (transfers, invoice payments, balance updates) inside ACID transactions via `prisma.$transaction`.
- **Reason**: Ensures transactional consistency and atomic balance integrity across accounts and invoices.
- **Trade-off**: Slightly higher transaction lock overhead during concurrent writes.
- **Scope**: Backend transaction service and financial balance recalculation routines.
- **Date**: 2026-09-01
- **Status**: active

### AD-005
- **Decision**: Adopt responsive drawer pattern with backdrop-blur overlay, fluid grids, and adaptive overflow containers across all screens for full mobile, tablet, and desktop compatibility.
- **Reason**: Provides a smooth native-like experience on smaller viewports without compromising desktop navigation.
- **Trade-off**: Requires managing mobile navigation open/close state in UI shell.
- **Scope**: Frontend layout, components, pages, modals, and tables.
- **Date**: 2026-09-02
- **Status**: active

### AD-006
- **Decision**: Pre-compile database seed TypeScript script (`prisma/seed.ts`) to native JavaScript (`dist/prisma/seed.js`) during Docker build and execute directly via Node in container entrypoint.
- **Reason**: Prevents runtime failures in production containers where `devDependencies` (such as `ts-node`) are omitted by `npm ci` under `NODE_ENV=production`.
- **Trade-off**: Requires compiling the seed script during build phase.
- **Scope**: Backend build pipeline, Dockerfile entrypoint, and database seeding scripts.
- **Date**: 2026-09-02
- **Status**: active

### AD-007
- **Decision**: Model family individuals using a unified `Person` entity (`people`) linked to `Family`, allowing optional `userId` for members with login, and allowing non-login persons (name and color tag) for dependants. Link `Transaction` to `Person` via optional `personId` with automatic propagation across installment groups.
- **Reason**: Solves the shared credit card and family lending attribution without forcing all relatives/children to create email accounts and credentials.
- **Trade-off**: Requires maintaining synchronization between user family members and person profiles.
- **Scope**: Prisma schema, Families module, Transactions module, Credit Cards module, and Frontend UI.
- **Date**: 2026-09-02
- **Status**: active

## Current Execution State

- **Active Feature**: `edicao-cartao-credito`
- **Total Tasks**: 7
- **Completed Tasks**: 0 / 7 (0%)
- **Status**: **IN_PROGRESS**
- **Test Suite Results**: Pending execution
- **Build Status**: Pending execution
- **Gates Verified**: `validate_spec.py` (0 errors), `validate_tasks.py` (0 errors)

## Handoff

- **Feature**: .specs/features/edicao-cartao-credito
- **Phase / Task**: Phase 1 - T1: Criação do DTO de Atualização de Cartão
- **Completed**: Planejamento e validação de especificação e tarefas aprovados.
- **In-progress**: T1: Criação do DTO de Atualização de Cartão
- **Next step**: Implementar `UpdateCreditCardDto` em `backend/src/modules/credit-cards/dto/update-credit-card.dto.ts`.
- **Blockers**: none
- **Uncommitted files**: none
- **Branch**: main
