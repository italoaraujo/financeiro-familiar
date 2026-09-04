# Soft Delete com deleted_at Tasks

## Execution Protocol (MANDATORY -- do not skip)

Implement these tasks with the `tlc-spec-driven` skill: **activate it by name and follow its Execute flow and Critical Rules.** Do not search for skill files by filesystem path. The skill is the source of truth for the full flow (per-task cycle, sub-agent delegation, adequacy review, Verifier, discrimination sensor).

**If the skill cannot be activated, STOP and tell the user - do not proceed without it.**

---

**Design**: `.specs/features/soft-delete/design.md`
**Status**: Draft

---

## Test Coverage Matrix

> Generated from codebase, project guidelines, and spec - confirm before Execute. Guidelines found: `backend/package.json` (Jest runner).

| Code Layer | Required Test Type | Coverage Expectation | Location Pattern | Run Command |
| ---------- | ------------------ | -------------------- | ---------------- | ----------- |
| Schema / Database | none | Build gate & prisma generate verification | `backend/prisma/schema.prisma` | `npm --prefix backend run prisma:generate` |
| Service (Transactions) | unit | 1:1 AC mapping: soft delete, balance reversal, query filtering | `backend/test/unit/transactions.service.spec.ts` | `npm --prefix backend test -- test/unit/transactions.service.spec.ts` |
| Service (Reports) | unit | Dashboard summary e agregação ignorando transações deletadas | `backend/test/unit/reports.service.spec.ts` | `npm --prefix backend test -- test/unit/reports.service.spec.ts` |
| Service (Accounts) | unit | Soft delete, verificação de transações ativas, filtro de ativas | `backend/test/unit/accounts.service.spec.ts` | `npm --prefix backend test -- test/unit/accounts.service.spec.ts` |
| Service (CreditCards) | unit | Soft delete de cartão, faturas e filtro de despesas ativas | `backend/test/unit/credit-cards.service.spec.ts` | `npm --prefix backend test -- test/unit/credit-cards.service.spec.ts` |
| Service (Categories) | unit | Soft delete, checagem de transações ativas, filtro de ativas | `backend/test/unit/categories.service.spec.ts` | `npm --prefix backend test -- test/unit/categories.service.spec.ts` |
| Service (Goals/Budgets/People) | unit | Soft delete e consultas de metas, orçamentos e membros | `backend/test/unit/goals.service.spec.ts` | `npm --prefix backend test -- test/unit/goals.service.spec.ts` |
| Integration Flow | integration | Fluxo contábil ponta a ponta: criação, estorno e soft delete | `backend/test/integration/financial-flow.spec.ts` | `npm --prefix backend test -- test/integration/financial-flow.spec.ts` |

---

## Gate Check Commands

> Generated from codebase - confirm before Execute.

| Gate Level | When to Use | Command |
| ---------- | ----------- | ------- |
| Quick | Após tarefas com testes unitários específicos | `npm --prefix backend test -- [caminho_do_teste]` |
| Full | Após tarefas de integração | `npm --prefix backend test` |
| Build | Após conclusão de fases ou entidades do banco | `npm --prefix backend run build` |

---

## Execution Plan

Phases are ordered and run sequentially - each phase completes before the next begins, and tasks within a phase execute in order.

### Phase 1: Database Schema & Migration

Modelagem do campo `deleted_at` e índices nas 7 tabelas de negócio do PostgreSQL.

```
T1
```

### Phase 2: Transações e Relatórios

Implementação da exclusão lógica de transações, estorno de saldo em conta/fatura e adaptação dos relatórios agregados.

```
T2 → T3
```

### Phase 3: Contas, Cartões e Categorias

Implementação de soft delete e validação de dependências ativas em Contas, Cartões de Crédito e Categorias.

```
T4 → T5 → T6
```

### Phase 4: Metas, Orçamentos, Pessoas e Integração

Implementação de soft delete para Metas, Orçamentos, Pessoas e validação do fluxo financeiro integrado.

```
T7 → T8
```

---

## Task Breakdown

### Phase 1: Database Schema & Migration

### T1: Adicionar deletedAt e índices no Prisma Schema [DONE]

**What**: Incluir o campo `deletedAt DateTime? @map("deleted_at") @db.Timestamptz` e índices em `Transaction`, `Account`, `CreditCard`, `Category`, `Goal`, `Budget` e `Person` em `schema.prisma` e gerar o cliente Prisma.
**Where**: `backend/prisma/schema.prisma`
**Depends on**: none
**Requirement**: SOFTDEL-06
**Tools**:
- MCP: `filesystem`
- Skill: NONE

**Done when**:
- [x] Modelos `Transaction`, `Account`, `CreditCard`, `Category`, `Goal`, `Budget` e `Person` contêm `deletedAt DateTime? @map("deleted_at") @db.Timestamptz`
- [x] Índices adicionados para otimizar buscas por registros ativos
- [x] `prisma generate` executado com sucesso e tipos gerados no `@prisma/client`
- [x] Gate check passes: `npm --prefix backend run build`

**Tests**: none
**Gate**: build

---

### Phase 2: Transações e Relatórios

### T2: Exclusão Lógica e Estorno em TransactionsService [DONE]

**What**: Atualizar o método `remove` do `TransactionsService` para preencher `deletedAt: new Date()` mantendo o estorno atômico de saldo, filtrar `deletedAt: null` em `findAll` e `findOne`, e atualizar a suíte de testes unitários.
**Where**: `backend/src/modules/transactions/transactions.service.ts`
**Depends on**: T1
**Requirement**: SOFTDEL-01, SOFTDEL-02, SOFTDEL-03, SOFTDEL-05
**Tools**:
- MCP: `filesystem`
- Skill: NONE

**Done when**:
- [x] `remove` substitui `tx.transaction.delete` por `tx.transaction.update` com `deletedAt: new Date()`
- [x] `remove` preserva integralmente o estorno de conta bancária e fatura de cartão
- [x] `findAll` e `findOne` filtram `deletedAt: null`
- [x] Testes unitários em `transactions.service.spec.ts` cobrem o cenário de soft delete e estorno
- [x] Gate check passes: `npm --prefix backend test -- test/unit/transactions.service.spec.ts`

**Tests**: unit
**Gate**: quick

---

### T3: Filtro de Soft Delete em ReportsService [DONE]

**What**: Atualizar os métodos agregadores de `ReportsService` (`getDashboardSummary`, `getCategoryExpenses`, `getIncomeVsExpense`) para ignorar transações marcadas com `deletedAt != null` e atualizar os testes unitários.
**Where**: `backend/src/modules/reports/reports.service.ts`
**Depends on**: T2
**Requirement**: SOFTDEL-04
**Tools**:
- MCP: `filesystem`
- Skill: NONE

**Done when**:
- [x] Consultas de totais de receitas, despesas e faturas do dashboard incluem `{ deletedAt: null }`
- [x] Gráficos de categorias e receitas vs despesas desconsideram transações deletadas
- [x] Testes unitários em `reports.service.spec.ts` passam com sucesso
- [x] Gate check passes: `npm --prefix backend test -- test/unit/reports.service.spec.ts`

**Tests**: unit
**Gate**: quick

---

### Phase 3: Contas, Cartões e Categorias

### T4: Soft Delete em AccountsService [DONE]

**What**: Atualizar `AccountsService` para efetuar exclusão lógica preenchendo `deletedAt`, checar transações vinculadas ativas (`deletedAt: null`) antes de excluir, filtrar `deletedAt: null` nas buscas e atualizar testes unitários.
**Where**: `backend/src/modules/accounts/accounts.service.ts`
**Depends on**: T2
**Requirement**: SOFTDEL-07, SOFTDEL-08, SOFTDEL-09, SOFTDEL-10, SOFTDEL-11
**Tools**:
- MCP: `filesystem`
- Skill: NONE

**Done when**:
- [x] `remove` atualiza conta com `deletedAt: new Date()` e `isActive: false`
- [x] Validação de integridade bloqueia exclusão apenas se houver transações com `deletedAt: null`
- [x] `findAll` e `findOne` filtram contas com `deletedAt: null`
- [x] Testes unitários em `accounts.service.spec.ts` cobrem exclusão lógica e bloqueio
- [x] Gate check passes: `npm --prefix backend test -- test/unit/accounts.service.spec.ts`

**Tests**: unit
**Gate**: quick

---

### T5: Soft Delete em CreditCardsService [DONE]

**What**: Atualizar `CreditCardsService` para efetuar exclusão lógica de cartões preenchendo `deletedAt`, filtrar `deletedAt: null` em buscas de cartões e faturas, e atualizar testes unitários.
**Where**: `backend/src/modules/credit-cards/credit-cards.service.ts`
**Depends on**: T4
**Requirement**: SOFTDEL-07, SOFTDEL-08, SOFTDEL-11
**Tools**:
- MCP: `filesystem`
- Skill: NONE

**Done when**:
- [x] `remove` atualiza cartão com `deletedAt: new Date()` e `isActive: false`
- [x] Buscas de cartões e faturas ignoram registros com `deletedAt != null`
- [x] Testes unitários em `credit-cards.service.spec.ts` cobrem exclusão lógica de cartão
- [x] Gate check passes: `npm --prefix backend test -- test/unit/credit-cards.service.spec.ts`

**Tests**: unit
**Gate**: quick

---

### T6: Soft Delete em CategoriesService

**What**: Atualizar `CategoriesService` para efetuar exclusão lógica com `deletedAt`, validar transações vinculadas ativas (`deletedAt: null`), filtrar `deletedAt: null` nas buscas e atualizar testes unitários.
**Where**: `backend/src/modules/categories/categories.service.ts`
**Depends on**: T5
**Requirement**: SOFTDEL-07, SOFTDEL-08, SOFTDEL-09, SOFTDEL-10, SOFTDEL-11
**Tools**:
- MCP: `filesystem`
- Skill: NONE

**Done when**:
- [ ] `remove` atualiza categoria com `deletedAt: new Date()`
- [ ] Bloqueio de exclusão considera apenas transações com `deletedAt: null`
- [ ] `findAll` e `findOne` filtram categorias ativas
- [ ] Testes unitários em `categories.service.spec.ts` cobrem exclusão lógica
- [ ] Gate check passes: `npm --prefix backend test -- test/unit/categories.service.spec.ts`

**Tests**: unit
**Gate**: quick

---

### Phase 4: Metas, Orçamentos, Pessoas e Integração

### T7: Soft Delete em Goals, Budgets e People (Families)

**What**: Atualizar `GoalsService`, `BudgetsService` e `FamiliesService` (Person) para atualizar `deletedAt: new Date()` na remoção e filtrar `deletedAt: null` em listagens, com testes unitários atualizados.
**Where**: `backend/src/modules/goals/goals.service.ts`
**Depends on**: T6
**Requirement**: SOFTDEL-07, SOFTDEL-08, SOFTDEL-11
**Tools**:
- MCP: `filesystem`
- Skill: NONE

**Done when**:
- [ ] `remove` em Goals, Budgets e `removePerson` em Families utilizam exclusão lógica com `deletedAt`
- [ ] Buscas e agregações de metas, orçamentos e pessoas filtram `deletedAt: null`
- [ ] Testes unitários em `goals.service.spec.ts`, `budgets.service.spec.ts` e `families.service.spec.ts` passam com sucesso
- [ ] Gate check passes: `npm --prefix backend test -- test/unit/goals.service.spec.ts test/unit/budgets.service.spec.ts test/unit/families.service.spec.ts`

**Tests**: unit
**Gate**: quick

---

### T8: Teste de Integração do Fluxo Financeiro com Soft Delete

**What**: Atualizar o teste de integração de fluxo financeiro para validar ponta a ponta o ciclo de criação de transação, impacto no saldo, exclusão lógica, permanência do registro no banco com `deleted_at` e estorno exato do saldo.
**Where**: `backend/test/integration/financial-flow.spec.ts`
**Depends on**: T7
**Requirement**: SOFTDEL-01, SOFTDEL-02, SOFTDEL-03, SOFTDEL-04, SOFTDEL-05, SOFTDEL-06
**Tools**:
- MCP: `filesystem`
- Skill: NONE

**Done when**:
- [ ] Teste de integração valida que transação excluída mantém linha com `deletedAt` preenchido
- [ ] Saldo bancário é estornado com exatidão após a exclusão lógica
- [ ] Listagem de transações e resumo financeiro não retornam a transação deletada
- [ ] Gate check passes: `npm --prefix backend test`

**Tests**: integration
**Gate**: full

---

## Phase Execution Map

Visual representation of task ordering. Phases run in sequence, and tasks within a phase run in order:

```
Phase 1 → Phase 2 → Phase 3 → Phase 4

Phase 1:  T1
Phase 2:  T2 ------→ T3
Phase 3:  T4 ------→ T5 ------→ T6
Phase 4:  T7 ------→ T8
```

---

## Task Granularity Check

| Task | Scope | Status |
| ---- | ----- | ------ |
| T1: Schema e Migration | 1 arquivo de modelo + tipos | ✅ Granular |
| T2: Transações Service | 1 service + teste unitário | ✅ Granular |
| T3: Relatórios Service | 1 service + teste unitário | ✅ Granular |
| T4: Contas Service | 1 service + teste unitário | ✅ Granular |
| T5: Cartões Service | 1 service + teste unitário | ✅ Granular |
| T6: Categorias Service | 1 service + teste unitário | ✅ Granular |
| T7: Metas, Orçamentos e Pessoas | 3 services correlatos + testes | ✅ Granular |
| T8: Fluxo Integrado | 1 suíte de integração | ✅ Granular |

---

## Diagram-Definition Cross-Check

| Task | Depends On (task body) | Diagram Shows | Status |
| ---- | ---------------------- | ------------- | ------ |
| T1 | None | None | ✅ Match |
| T2 | T1 (cross-phase) | None (cross-phase) | ✅ Match |
| T3 | T2 | T2 -> T3 | ✅ Match |
| T4 | T2 (cross-phase) | None (cross-phase) | ✅ Match |
| T5 | T4 | T4 -> T5 | ✅ Match |
| T6 | T5 | T5 -> T6 | ✅ Match |
| T7 | T6 (cross-phase) | None (cross-phase) | ✅ Match |
| T8 | T7 | T7 -> T8 | ✅ Match |

---

## Test Co-location Validation

| Task | Code Layer Created/Modified | Matrix Requires | Task Says | Status |
| ---- | --------------------------- | --------------- | --------- | ------ |
| T1: Schema e Migration | Schema / Database | none | none | ✅ OK |
| T2: Transações Service | Service (Transactions) | unit | unit | ✅ OK |
| T3: Relatórios Service | Service (Reports) | unit | unit | ✅ OK |
| T4: Contas Service | Service (Accounts) | unit | unit | ✅ OK |
| T5: Cartões Service | Service (CreditCards) | unit | unit | ✅ OK |
| T6: Categorias Service | Service (Categories) | unit | unit | ✅ OK |
| T7: Metas, Orçamentos e Pessoas | Service (Goals/Budgets/People) | unit | unit | ✅ OK |
| T8: Fluxo Integrado | Integration Flow | integration | integration | ✅ OK |
