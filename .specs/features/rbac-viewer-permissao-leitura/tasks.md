# RBAC Viewer - Permissão de Somente Leitura no Contexto Familiar Tasks

## Execution Protocol (MANDATORY -- do not skip)

Implement these tasks with the `tlc-spec-driven` skill: **activate it by name and follow its Execute flow and Critical Rules.** Do not search for skill files by filesystem path. The skill is the source of truth for the full flow (per-task cycle, sub-agent delegation, adequacy review, Verifier, discrimination sensor).

**If the skill cannot be activated, STOP and tell the user - do not proceed without it.**

---

**Spec**: `.specs/features/rbac-viewer-permissao-leitura/spec.md`
**Status**: Draft

---

## Test Coverage Matrix

> Generated from codebase, project guidelines, and spec - confirm before Execute. Guidelines found: `backend/package.json`, `jest.config`.

| Code Layer | Required Test Type | Coverage Expectation | Location Pattern | Run Command |
| ---------- | ------------------ | -------------------- | ---------------- | ----------- |
| Services (Backend) | unit | All mutation guard branches; 1:1 to spec ACs for VIEWER blocking | `backend/test/unit/*.spec.ts` | `cd backend && npm test` |
| UI Components / Pages (Frontend) | none | - (build gate only) | `frontend/src/**` | `cd frontend && npm run build` |

## Gate Check Commands

> Generated from codebase - confirm before Execute.

| Gate Level | When to Use | Command |
| ---------- | ----------- | ------- |
| Quick | After tasks with unit tests only | `cd /opt/projetos/financeiro-familiar/backend && npm test` |
| Full | After tasks with integration tests | `cd /opt/projetos/financeiro-familiar/backend && npm test` |
| Build | After phase completion or UI tasks | `cd /opt/projetos/financeiro-familiar/backend && npm test && cd /opt/projetos/financeiro-familiar/frontend && npm run build` |

---

## Execution Plan

Phases are ordered and run sequentially - each phase completes before the next begins, and tasks within a phase execute in order.

### Phase 1: Backend RBAC Guards

Enforces HTTP 403 Forbidden for VIEWER on mutation operations across all family-scoped services.

```
T1 → T2 → T3 → T4 → T5
```

### Phase 2: Frontend Read-Only Adaptation

Adapts the user interface to detect the VIEWER role, display informative banners, and hide/disable mutation triggers.

```
T6 → T7 → T8
```

---

## Task Breakdown

### T1: Restringir Mutações de Contas Bancárias para VIEWER no Backend

**What**: Atualizar `verifyFamilyAccess` em `AccountsService` para bloquear operações mutativas (`create`, `update`, `archive`, `remove`) quando o usuário for `VIEWER` no grupo familiar e adicionar testes unitários.
**Where**: `backend/src/modules/accounts/accounts.service.ts`
**Depends on**: None
**Reuses**: `backend/src/modules/accounts/accounts.service.ts`
**Requirement**: RBAC-03

**Tools**:

- MCP: `filesystem`
- Skill: NONE

**Done when**:

- [x] `AccountsService` rejeita com `ForbiddenException` tentativas de criação, edição, arquivamento ou exclusão de contas familiares por usuário com papel `VIEWER`.
- [x] Consultas `findAll` e `findById` continuam permitidas para `VIEWER`.
- [x] Testes unitários cobrindo o bloqueio de `VIEWER` passam no backend.
- [x] Gate check passes: `cd /opt/projetos/financeiro-familiar/backend && npm test -- test/unit/accounts.service.spec.ts`

**Tests**: unit
**Gate**: quick

---

### T2: Restringir Mutações de Cartões de Crédito para VIEWER no Backend

**What**: Atualizar `verifyFamilyAccess` em `CreditCardsService` para bloquear operações mutativas (`create`, `update`, `remove`) quando o usuário for `VIEWER` no grupo familiar e adicionar testes unitários.
**Where**: `backend/src/modules/credit-cards/credit-cards.service.ts`
**Depends on**: T1
**Reuses**: `backend/src/modules/credit-cards/credit-cards.service.ts`
**Requirement**: RBAC-03

**Tools**:

- MCP: `filesystem`
- Skill: NONE

**Done when**:

- [x] `CreditCardsService` rejeita com `ForbiddenException` tentativas de criação, edição ou exclusão de cartões familiares por usuário com papel `VIEWER`.
- [x] Consultas de cartões e faturas continuam permitidas para `VIEWER`.
- [x] Testes unitários cobrindo o bloqueio de `VIEWER` passam no backend.
- [x] Gate check passes: `cd /opt/projetos/financeiro-familiar/backend && npm test -- test/unit/credit-cards.service.spec.ts`

**Tests**: unit
**Gate**: quick

---

### T3: Restringir Mutações de Transações e Transferências para VIEWER no Backend

**What**: Atualizar `verifyFamilyAccess` em `TransactionsService` para bloquear operações mutativas (`create`, `update`, `remove`, `transfer`, `payCreditCardInvoice`) quando o usuário for `VIEWER` no grupo familiar e adicionar testes unitários.
**Where**: `backend/src/modules/transactions/transactions.service.ts`
**Depends on**: T2
**Reuses**: `backend/src/modules/transactions/transactions.service.ts`
**Requirement**: RBAC-01, RBAC-02

**Tools**:

- MCP: `filesystem`
- Skill: NONE

**Done when**:

- [x] `TransactionsService` rejeita com `ForbiddenException` tentativas de criação, edição, exclusão, transferências e pagamentos de fatura familiares por usuário com papel `VIEWER`.
- [x] Consultas e extratos continuam permitidos para `VIEWER`.
- [x] Testes unitários cobrindo o bloqueio de `VIEWER` passam no backend.
- [x] Gate check passes: `cd /opt/projetos/financeiro-familiar/backend && npm test -- test/unit/transactions.service.spec.ts`

**Tests**: unit
**Gate**: quick

---

### T4: Restringir Mutações de Categorias e Orçamentos para VIEWER no Backend

**What**: Atualizar `verifyFamilyAccess` em `CategoriesService` e `BudgetsService` para bloquear operações mutativas (`create`, `update`, `remove`) quando o usuário for `VIEWER` no grupo familiar e adicionar testes unitários.
**Where**: `backend/src/modules/categories/categories.service.ts`
**Depends on**: T3
**Reuses**: `backend/src/modules/categories/categories.service.ts`
**Requirement**: RBAC-04

**Tools**:

- MCP: `filesystem`
- Skill: NONE

**Done when**:

- [x] `CategoriesService` e `BudgetsService` rejeitam com `ForbiddenException` operações mutativas familiares por usuário com papel `VIEWER`.
- [x] Consultas de categorias e orçamentos continuam permitidas para `VIEWER`.
- [x] Testes unitários passam no backend.
- [x] Gate check passes: `cd /opt/projetos/financeiro-familiar/backend && npm test -- test/unit/categories.service.spec.ts test/unit/budgets.service.spec.ts`

**Tests**: unit
**Gate**: quick

---

### T5: Restringir Mutações de Metas/Cofrinhos para VIEWER no Backend

**What**: Atualizar `verifyFamilyAccess` em `GoalsService` para bloquear operações mutativas (`create`, `update`, `remove`, `deposit`, `withdraw`) quando o usuário for `VIEWER` no grupo familiar e adicionar testes unitários.
**Where**: `backend/src/modules/goals/goals.service.ts`
**Depends on**: T4
**Reuses**: `backend/src/modules/goals/goals.service.ts`
**Requirement**: RBAC-05, RBAC-06, RBAC-07

**Tools**:

- MCP: `filesystem`
- Skill: NONE

**Done when**:

- [x] `GoalsService` rejeita com `ForbiddenException` criação, edição, exclusão, aportes e resgates de metas familiares por usuário com papel `VIEWER`.
- [x] Consultas de metas continuam permitidas para `VIEWER`.
- [x] Testes unitários cobrindo o bloqueio de `VIEWER` passam no backend.
- [x] Gate check passes: `cd /opt/projetos/financeiro-familiar/backend && npm test -- test/unit/goals.service.spec.ts`

**Tests**: unit
**Gate**: quick

---

### T6: Suporte a Contexto de Permissão e Role no Frontend AuthContext e AppShell

**What**: Adicionar flag `isViewer` e `currentRole` no hook `useAuth` e exibir indicador visual informativo de modo somente leitura no `AppShell` quando o contexto selecionado for familiar com papel `VIEWER`.
**Where**: `frontend/src/contexts/AuthContext.tsx`
**Depends on**: None
**Reuses**: `frontend/src/contexts/AuthContext.tsx`, `frontend/src/components/layout/AppShell.tsx`
**Requirement**: RBAC-08, RBAC-10, RBAC-11

**Tools**:

- MCP: `filesystem`
- Skill: NONE

**Done when**:

- [x] `useAuth()` disponibiliza `isViewer: boolean` indicando se o usuário é `VIEWER` na família selecionada no momento (`selectedFamilyId`).
- [x] `AppShell` exibe badge claro indicando "Visualizador (Somente Leitura)" quando aplicável.
- [x] Gate check passes: `cd /opt/projetos/financeiro-familiar/frontend && npm run build`

**Tests**: none
**Gate**: build

---

### T7: Ocultar e Desabilitar Ações Mutativas nas Telas de Transações, Contas e Cartões

**What**: Atualizar as páginas `transactions/page.tsx`, `accounts/page.tsx` e `cards/page.tsx` para ocultar botões de criação, edição, exclusão e pagamento de fatura quando `isViewer` for verdadeiro.
**Where**: `frontend/src/app/transactions/page.tsx`
**Depends on**: T6
**Reuses**: `frontend/src/app/transactions/page.tsx`
**Requirement**: RBAC-08, RBAC-09

**Tools**:

- MCP: `filesystem`
- Skill: NONE

**Done when**:

- [ ] Em `/transactions`, botões "Nova Transação", "Nova Transferência", edição e exclusão ficam ocultos/bloqueados para `VIEWER` em contexto familiar.
- [ ] Em `/accounts`, botões "Nova Conta", editar e arquivar/excluir ficam ocultos para `VIEWER`.
- [ ] Em `/cards`, botões "Novo Cartão", editar, excluir e "Pagar Fatura" ficam ocultos para `VIEWER`.
- [ ] Gate check passes: `cd /opt/projetos/financeiro-familiar/frontend && npm run build`

**Tests**: none
**Gate**: build

---

### T8: Ocultar e Desabilitar Ações Mutativas nas Telas de Metas, Orçamentos, Família e Dashboard

**What**: Atualizar as páginas `goals/page.tsx`, `budgets/page.tsx`, `family/page.tsx` e `page.tsx` (Dashboard) para ocultar botões de ação rápida, criação de metas/orçamentos e gestão de membros quando `isViewer` for verdadeiro.
**Where**: `frontend/src/app/goals/page.tsx`
**Depends on**: T7
**Reuses**: `frontend/src/app/goals/page.tsx`
**Requirement**: RBAC-08, RBAC-09

**Tools**:

- MCP: `filesystem`
- Skill: NONE

**Done when**:

- [ ] Em `/goals`, botões "Nova Meta", "Aportar", "Resgatar", "Editar" e "Excluir" ficam ocultos para `VIEWER`.
- [ ] Em `/budgets`, botões "Novo Orçamento", editar e excluir ficam ocultos para `VIEWER`.
- [ ] Em `/family`, ações de convite e gerenciamento de pessoas ficam restritas para `ADMIN`/`OWNER`.
- [ ] No Dashboard (`/`), botões de ação rápida são ocultados quando `isViewer` estiver ativo.
- [ ] Gate check passes: `cd /opt/projetos/financeiro-familiar/backend && npm test && cd /opt/projetos/financeiro-familiar/frontend && npm run build`

**Tests**: none
**Gate**: build

---

## Phase Execution Map

```
Phase 1 → Phase 2

Phase 1:  T1 ------→ T2 ------→ T3 ------→ T4 ------→ T5
Phase 2:  T6 ------→ T7 ------→ T8
```

---

## Task Granularity Check

| Task | Scope | Status |
| ---- | ----- | ------ |
| T1: Restringir Mutações de Contas Bancárias para VIEWER | 1 service + unit test | ✅ Granular |
| T2: Restringir Mutações de Cartões de Crédito para VIEWER | 1 service + unit test | ✅ Granular |
| T3: Restringir Mutações de Transações e Transferências para VIEWER | 1 service + unit test | ✅ Granular |
| T4: Restringir Mutações de Categorias e Orçamentos para VIEWER | 1 service + unit test | ✅ Granular |
| T5: Restringir Mutações de Metas/Cofrinhos para VIEWER | 1 service + unit test | ✅ Granular |
| T6: Suporte a Contexto de Permissão e Role no Frontend | 1 context + layout shell | ✅ Granular |
| T7: Ocultar Ações Mutativas em Transações, Contas e Cartões | 3 telas financeiras | ✅ Granular |
| T8: Ocultar Ações Mutativas em Metas, Orçamentos, Família e Dashboard | 4 telas e modais | ✅ Granular |

---

## Diagram-Definition Cross-Check

| Task | Depends On (task body) | Diagram Shows | Status |
| ---- | ---------------------- | ------------- | ------ |
| T1 | None | None | ✅ Match |
| T2 | T1 | T1 → T2 | ✅ Match |
| T3 | T2 | T2 → T3 | ✅ Match |
| T4 | T3 | T3 → T4 | ✅ Match |
| T5 | T4 | T4 → T5 | ✅ Match |
| T6 | None | None | ✅ Match |
| T7 | T6 | T6 → T7 | ✅ Match |
| T8 | T7 | T7 → T8 | ✅ Match |

---

## Test Co-location Validation

| Task | Code Layer Created/Modified | Matrix Requires | Task Says | Status |
| ---- | --------------------------- | --------------- | --------- | ------ |
| T1: Restringir Mutações de Contas Bancárias | Services (Backend) | unit | unit | ✅ OK |
| T2: Restringir Mutações de Cartões de Crédito | Services (Backend) | unit | unit | ✅ OK |
| T3: Restringir Mutações de Transações | Services (Backend) | unit | unit | ✅ OK |
| T4: Restringir Mutações de Categorias e Orçamentos | Services (Backend) | unit | unit | ✅ OK |
| T5: Restringir Mutações de Metas/Cofrinhos | Services (Backend) | unit | unit | ✅ OK |
| T6: Suporte a Contexto de Permissão no Frontend | UI Components / Pages | none | none | ✅ OK |
| T7: Ocultar Ações Mutativas em Transações, Contas, Cartões | UI Components / Pages | none | none | ✅ OK |
| T8: Ocultar Ações Mutativas em Metas, Orçamentos, Família | UI Components / Pages | none | none | ✅ OK |
