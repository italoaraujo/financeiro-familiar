# Tags em Lançamentos e Filtro em Relatórios Tasks

## Execution Protocol (MANDATORY -- do not skip)

Implement these tasks with the `tlc-spec-driven` skill: **activate it by name and follow its Execute flow and Critical Rules.** Do not search for skill files by filesystem path. The skill is the source of truth for the full flow (per-task cycle, sub-agent delegation, adequacy review, Verifier, discrimination sensor).

**If the skill cannot be activated, STOP and tell the user - do not proceed without it.**

---

**Design**: `.specs/features/tags-lancamentos-relatorios/design.md`
**Status**: In Progress

---

## Test Coverage Matrix

> Generated from codebase, project guidelines, and spec - confirm before Execute. Guidelines found: `backend/package.json`, `jest.config`.

| Code Layer | Required Test Type | Coverage Expectation | Location Pattern | Run Command |
| ---------- | ------------------ | -------------------- | ---------------- | ----------- |
| Entity / Schema (Database) | none | - (build gate only) | `backend/prisma/schema.prisma` | `npm --prefix backend run build` |
| Services / Controllers (Backend) | unit | All branches; 1:1 to spec ACs; error cases covered | `backend/test/unit/*.spec.ts` | `npm --prefix backend test` |
| Analytics / Reports (Backend) | unit | Aggregations, tag filter, and CSV formatting | `backend/test/unit/*.spec.ts` | `npm --prefix backend test` |
| UI Components / Pages (Frontend) | none | - (build gate only) | `frontend/src/**` | `npm --prefix frontend run build` |
| Integration Flow (E2E) | integration | Complete lifecycle: creation, parcelamento, extrato, reports, CSV | `backend/test/integration/*.spec.ts` | `npm --prefix backend test` |

## Gate Check Commands

> Generated from codebase - confirm before Execute.

| Gate Level | When to Use | Command |
| ---------- | ----------- | ------- |
| Quick | After tasks with unit tests only | `npm --prefix backend test` |
| Full | After tasks with integration tests | `npm --prefix backend test` |
| Build | After phase completion or UI tasks | `npm --prefix backend test && npm --prefix frontend run build` |

---

## Execution Plan

Phases are ordered and run sequentially - each phase completes before the next begins, and tasks within a phase execute in order.

### Phase 1: Backend Foundation, Tags & Transactions

Data modeling with Prisma, Tags module, transaction creation with tag association, installment propagation, and report filtering.

```
T1 → T2 → T3 → T4
```

### Phase 2: Frontend UI & Integration

UI TagInput component, transaction modal and list adaptation, reports page filters, tag chart, and integration verification.

```
T5 → T6 → T7 → T8
```

---

## Task Breakdown

### Phase 1: Backend Foundation, Tags & Transactions

### T1: Modelagem Prisma de Tags e Migração do Banco de Dados

**What**: Criar modelos `Tag` e `TransactionTag` no `schema.prisma`, estabelecer relação com `Transaction`, `User` e `Family`, gerar e aplicar migração PostgreSQL e compilar o Prisma Client.
**Where**: `backend/prisma/schema.prisma`
**Depends on**: None
**Reuses**: `backend/prisma/schema.prisma`
**Requirement**: TAG-01, TAG-02

**Tools**:

- MCP: `filesystem`
- Skill: NONE

**Done when**:

- [x] Modelos `Tag` e `TransactionTag` definidos com índices, chaves estrangeiras e integridade referencial.
- [x] Relação `tags TransactionTag[]` adicionada ao model `Transaction`.
- [x] Migração aplicada com sucesso no PostgreSQL via `npx prisma db push`.
- [x] Prisma Client compilado com sucesso via `npx prisma generate`.
- [x] Gate check passes: `npm --prefix backend run build`

**Tests**: none
**Gate**: build

**Commit**: `feat(db): add Tag and TransactionTag models and migration`

---

### T2: Módulo, Serviço e Controller de Tags no Backend

**What**: Implementar `TagsModule`, `TagsService` e `TagsController` com endpoint `GET /tags` para autocomplete por escopo e método auxiliar `findOrCreateMany` com deduplicação, normalização e atribuição de cores.
**Where**: `backend/src/modules/tags/tags.service.ts`
**Depends on**: T1
**Reuses**: `backend/src/prisma/prisma.service.ts`
**Requirement**: TAG-02, TAG-04, TAG-05, TAG-06

**Tools**:

- MCP: `filesystem`
- Skill: NONE

**Done when**:

- [ ] `GET /tags` retorna tags ativas filtradas por `familyId` ou `userId` pessoal.
- [ ] `findOrCreateMany` busca tags existentes e cria dinamicamente novas tags dentro do mesmo escopo.
- [ ] Nomes de tags vazios ou com mais de 50 caracteres são validados.
- [ ] Membros `VIEWER` são bloqueados de criar tags no escopo familiar.
- [ ] Testes unitários para `TagsService` criados e passando.
- [ ] Gate check passes: `npm --prefix backend test -- test/unit/tags.service.spec.ts`

**Tests**: unit
**Gate**: quick

**Commit**: `feat(tags): implement TagsModule with autocomplete and findOrCreateMany`

---

### T3: Atribuição de Tags e Filtro em TransactionsService

**What**: Atualizar `CreateTransactionDto`, `FilterTransactionDto` e `TransactionsService` para receber tags, persistir `TransactionTag` em transações avulsas e compras parceladas no cartão, filtrar por `tagId` e incluir tags na listagem com sanitização de privacidade.
**Where**: `backend/src/modules/transactions/transactions.service.ts`
**Depends on**: T2
**Reuses**: `backend/src/modules/transactions/transactions.service.ts`
**Requirement**: TAG-01, TAG-03, TAG-07, TAG-08, TAG-09, TAG-10

**Tools**:

- MCP: `filesystem`
- Skill: NONE

**Done when**:

- [ ] `create` associa tags à transação dentro da transação ACID do Prisma.
- [ ] Compras parceladas replicam as tags para todas as parcelas do grupo.
- [ ] `findAll` filtra transações por `tagId` e retorna array de tags associadas.
- [ ] Transações privadas de outros membros retornam tags vazias (`tags: []`).
- [ ] Testes unitários em `transactions.service.spec.ts` cobrem associação de tags e filtros.
- [ ] Gate check passes: `npm --prefix backend test -- test/unit/transactions.service.spec.ts`

**Tests**: unit
**Gate**: quick

**Commit**: `feat(transactions): integrate tags in transaction creation, installments and listing`

---

### T4: Filtro por Tag, Exportação CSV e Distribuição em ReportsService

**What**: Atualizar `ReportsService` e `ReportsController` para aceitar parâmetro `tagId` nas consultas de fluxo de caixa, categorias e exportação CSV, além de implementar novo método `getExpensesByTag` (`GET /reports/tags`).
**Where**: `backend/src/modules/reports/reports.service.ts`
**Depends on**: T3
**Reuses**: `backend/src/modules/reports/reports.service.ts`
**Requirement**: TAG-12, TAG-13, TAG-14, TAG-15

**Tools**:

- MCP: `filesystem`
- Skill: NONE

**Done when**:

- [ ] `getCashFlow` e `getExpensesByCategory` aplicam filtro condicional por `tagId`.
- [ ] `exportCsv` inclui coluna `Tags` e filtra por `tagId` quando fornecido.
- [ ] `getExpensesByTag` retorna distribuição percentual e total de despesas por tag no mês.
- [ ] Testes unitários em `reports.service.spec.ts` cobrem filtro por tag e novo endpoint.
- [ ] Gate check passes: `npm --prefix backend test -- test/unit/reports.service.spec.ts`

**Tests**: unit
**Gate**: quick

**Commit**: `feat(reports): add tag filter, csv column and expenses by tag endpoint`

---

### Phase 2: Frontend UI & Integration

### T5: Componente TagInput no Frontend

**What**: Criar o componente reutilizável `TagInput` com suporte a tags/chips visuais, criação inline por `Enter`/vírgula, remoção por clique e menu de sugestões com autocomplete conectado a `GET /tags`.
**Where**: `frontend/src/components/ui/TagInput.tsx`
**Depends on**: T4
**Reuses**: `frontend/src/lib/api.ts`
**Requirement**: TAG-02, TAG-05

**Tools**:

- MCP: `filesystem`
- Skill: NONE

**Done when**:

- [ ] Componente renderiza chips com cores das tags e botão de remoção.
- [ ] Digitação permite adicionar novas tags via Enter ou vírgula.
- [ ] Sugestões do autocomplete carregam tags do backend conforme o usuário digita.
- [ ] Gate check passes: `npm --prefix frontend run build`

**Tests**: none
**Gate**: build

**Commit**: `feat(ui): create TagInput component with chips and autocomplete`

---

### T6: Integração de Tags na Tela de Transações

**What**: Integrar `TagInput` no modal de novo lançamento em `/transactions`, exibir chips de tags na coluna de cada lançamento no extrato e adicionar filtro por tag na barra de busca.
**Where**: `frontend/src/app/transactions/page.tsx`
**Depends on**: T5
**Reuses**: `frontend/src/app/transactions/page.tsx`
**Requirement**: TAG-01, TAG-07, TAG-08, TAG-11

**Tools**:

- MCP: `filesystem`
- Skill: NONE

**Done when**:

- [ ] Modal de lançamento permite informar tags usando `TagInput`.
- [ ] Tabela de transações renderiza badges visuais para as tags do lançamento.
- [ ] Barra de filtros inclui seletor de tag recarregando o extrato com o filtro aplicado.
- [ ] Gate check passes: `npm --prefix frontend run build`

**Tests**: none
**Gate**: build

**Commit**: `feat(transactions-ui): add tag input in modal, badges in list and filter by tag`

---

### T7: Filtro por Tag e Gráfico de Gastos na Tela de Relatórios

**What**: Adicionar seletor de tag na barra de filtros de `/reports`, sincronizar chamadas de fluxo de caixa, categorias e exportação CSV com a tag selecionada, e adicionar seção de Distribuição de Gastos por Tag.
**Where**: `frontend/src/app/reports/page.tsx`
**Depends on**: T6
**Reuses**: `frontend/src/app/reports/page.tsx`
**Requirement**: TAG-12, TAG-13, TAG-14, TAG-15, TAG-16

**Tools**:

- MCP: `filesystem`
- Skill: NONE

**Done when**:

- [ ] Seletor de tag adicionado na barra de filtros da tela de relatórios.
- [ ] Gráficos de evolução mensal e categorias são atualizados com a tag filtrada.
- [ ] Seção/gráfico de distribuição de gastos por tag exibe totais e percentuais.
- [ ] Botão de exportação CSV envia o parâmetro `tagId` e gera arquivo com a coluna Tags.
- [ ] Gate check passes: `npm --prefix frontend run build`

**Tests**: none
**Gate**: build

**Commit**: `feat(reports-ui): add tag filter, expenses by tag visualization and csv support`

---

### T8: Teste de Integração do Fluxo Completo de Tags

**What**: Criar suite de teste de integração end-to-end cobrindo todo o ciclo: criação de lançamento com tags, replicação em parcelamento, listagem e filtro no extrato, filtro nos relatórios e exportação CSV.
**Where**: `backend/test/integration/tags-flow.spec.ts`
**Depends on**: T7
**Reuses**: `backend/test/integration/financial-flow.spec.ts`
**Requirement**: TAG-01, TAG-02, TAG-03, TAG-08, TAG-12, TAG-14

**Tools**:

- MCP: `filesystem`
- Skill: NONE

**Done when**:

- [ ] Teste automatizado cria transação avulsa e compra parcelada com tags.
- [ ] Verifica que todas as parcelas receberam as tags no banco.
- [ ] Verifica que filtro por tag retorna apenas as transações corretas.
- [ ] Verifica que relatório e CSV refletem o filtro de tag.
- [ ] Suite completa de testes passa sem falhas.
- [ ] Gate check passes: `npm --prefix backend test && npm --prefix frontend run build`

**Tests**: integration
**Gate**: full

**Commit**: `test(tags): add comprehensive integration flow for tags, transactions and reports`

---

## Phase Execution Map

Visual representation of task ordering. Phases run in sequence, and tasks within a phase run in order:

```
Phase 1 → Phase 2

Phase 1:  T1 ------→ T2 ------→ T3 ------→ T4
Phase 2:  T5 ------→ T6 ------→ T7 ------→ T8
```

---

## Task Granularity Check

Before approving tasks, verify they are granular enough:

| Task | Scope | Status |
| ---- | ----- | ------ |
| T1: Modelagem Prisma de Tags e Migração | 1 schema + migration | ✅ Granular |
| T2: Módulo, Serviço e Controller de Tags | 1 module/service | ✅ Granular |
| T3: Atribuição de Tags em TransactionsService | 1 service update | ✅ Granular |
| T4: Filtro por Tag e Análise em ReportsService | 1 service update | ✅ Granular |
| T5: Componente TagInput no Frontend | 1 UI component | ✅ Granular |
| T6: Integração de Tags na Tela de Transações | 1 page update | ✅ Granular |
| T7: Filtro por Tag e Gráfico na Tela de Relatórios | 1 page update | ✅ Granular |
| T8: Teste de Integração do Fluxo de Tags | 1 integration suite | ✅ Granular |

---

## Diagram-Definition Cross-Check

| Task | Depends On (task body) | Diagram Shows | Status |
| ---- | ---------------------- | ------------- | ------ |
| T1 | None | None | ✅ Match |
| T2 | T1 | T1 -> T2 | ✅ Match |
| T3 | T2 | T2 -> T3 | ✅ Match |
| T4 | T3 | T3 -> T4 | ✅ Match |
| T5 | T4 (cross-phase) | None (intra-phase start) | ✅ Match |
| T6 | T5 | T5 -> T6 | ✅ Match |
| T7 | T6 | T6 -> T7 | ✅ Match |
| T8 | T7 | T7 -> T8 | ✅ Match |

---

## Test Co-location Validation

| Task | Code Layer Created/Modified | Matrix Requires | Task Says | Status |
| ---- | --------------------------- | --------------- | --------- | ------ |
| T1: Modelagem Prisma de Tags | Entity / Schema | none | none | ✅ OK |
| T2: Módulo e Serviço de Tags | Services / Controllers | unit | unit | ✅ OK |
| T3: Atribuição em TransactionsService | Services / Controllers | unit | unit | ✅ OK |
| T4: Filtro e Análise em ReportsService | Analytics / Reports | unit | unit | ✅ OK |
| T5: Componente TagInput | UI Components | none | none | ✅ OK |
| T6: Integração em Transações | UI Components | none | none | ✅ OK |
| T7: Filtro em Relatórios | UI Components | none | none | ✅ OK |
| T8: Teste de Integração de Tags | Integration Flow | integration | integration | ✅ OK |
