# Favoritar Contas e Cartões Tasks

## Execution Protocol (MANDATORY -- do not skip)

Implement these tasks with the `tlc-spec-driven` skill: **activate it by name and follow its Execute flow and Critical Rules.** Do not search for skill files by filesystem path. The skill is the source of truth for the full flow (per-task cycle, sub-agent delegation, adequacy review, Verifier, discrimination sensor).

**If the skill cannot be activated, STOP and tell the user - do not proceed without it.**

---

**Design**: `.specs/features/favorito-conta-cartao/design.md`
**Status**: In Progress

---

## Test Coverage Matrix

> Generated from codebase and spec - confirm before Execute. Guidelines found: none - strong defaults applied (sampled `backend/package.json`, `frontend/package.json`, `backend/test/unit/accounts.service.spec.ts`, `backend/test/unit/credit-cards.service.spec.ts`, and `backend/test/unit/audit-logs.controller.spec.ts`).

| Code Layer | Required Test Type | Coverage Expectation | Location Pattern | Run Command |
| --- | --- | --- | --- | --- |
| Backend Schema (Prisma) | none | - (Prisma validate + generate + TypeScript build gate) | `backend/prisma/schema.prisma` | `cd backend && npx prisma validate && npx prisma generate && npm run build` |
| Backend Service | unit | All branches; 1:1 to spec ACs; every listed edge case has a test | `backend/test/unit/*.service.spec.ts` | `cd backend && npm test -- test/unit/accounts.service.spec.ts test/unit/credit-cards.service.spec.ts` |
| Backend Controller | unit | All added routes: happy path + edge + error paths (400, 403, 404) | `backend/test/unit/*.controller.spec.ts` | `cd backend && npm test -- test/unit/accounts.controller.spec.ts test/unit/credit-cards.controller.spec.ts` |
| Frontend Pages (Next.js) | none | - (ESLint + Next.js production build gate; no frontend test runner configured in `frontend/package.json`) | `frontend/src/app/**/page.tsx` | `cd frontend && npm run lint && npm run build` |

## Gate Check Commands

> Generated from codebase - confirm before Execute.

| Gate Level | When to Use | Command |
| --- | --- | --- |
| Quick | After tasks with unit tests only | `cd backend && npm test -- test/unit/accounts.service.spec.ts test/unit/accounts.controller.spec.ts test/unit/credit-cards.service.spec.ts test/unit/credit-cards.controller.spec.ts` |
| Full | After full backend regression check | `cd backend && npm test` |
| Build | After phase completion or schema/frontend-only tasks | `cd backend && npx prisma validate && npx prisma generate && npm run build && npm test && cd ../frontend && npm run lint && npm run build` |

---

## Execution Plan

Phases are ordered and run sequentially - each phase completes before the next begins, and tasks within a phase execute in order.

### Phase 1: Schema & Persistence Foundation

Cria os modelos relacionais de favoritos no Prisma Schema antes da camada de serviços.

```
T1
```

### Phase 2: Backend — Contas e Cartões Favoritos

Implementa serviços, limpeza de ciclo de vida, endpoints REST e testes unitários co-localizados.

```
T2 → T3
T4 → T5
```

### Phase 3: Frontend — Gestão de Favoritos e Combos

Exibe o botão estrela em cards ativos e destaca favoritos no topo dos combos de lançamento e telas auxiliares.

```
T6  (depends on Phase 2: T3)
T7  (depends on Phase 2: T3, T5)
T8  (depends on Phase 2: T3, T5)
T9  (depends on Phase 2: T3)
```

---

## Task Breakdown

### Phase 1: Schema & Persistence Foundation

#### T1: Adicionar modelos UserFavoriteAccount e UserFavoriteCreditCard no Prisma schema

**What**: Adicionar os modelos `UserFavoriteAccount` e `UserFavoriteCreditCard` (e relações inversas em `User`, `Account` e `CreditCard`) em `backend/prisma/schema.prisma`.
**Where**: `backend/prisma/schema.prisma`
**Depends on**: None
**Reuses**: Convenção de tabela de junção com PK composta de `TransactionTag` em `backend/prisma/schema.prisma`
**Requirement**: FAV-01, FAV-04, FAV-10

**Tools**:

- MCP: NONE
- Skill: NONE

**Done when**:

- [x] Modelos `UserFavoriteAccount` (`user_favorite_accounts`) e `UserFavoriteCreditCard` (`user_favorite_credit_cards`) definidos com PK composta `@@id`, índices de entidade e `onDelete: Cascade`
- [x] Relações inversas adicionadas em `User`, `Account` e `CreditCard`
- [x] `npx prisma validate` e `npx prisma generate` executam sem erros
- [x] Gate check passes: `cd backend && npx prisma validate && npx prisma generate && npm run build`

**Tests**: none
**Gate**: build
**Commit**: `feat(db): add user favorite account and credit card models`

---

### Phase 2: Backend — Contas e Cartões Favoritos

#### T2: Implementar favoritos individuais, ordenação e limpeza em AccountsService

**What**: Implementar `favorite`, `unfavorite`, injeção de `isFavorite` e ordenação `isFavorite DESC, createdAt DESC` em `findAll`/`findById`, e limpeza transacional em `archive`/`remove` em `AccountsService`, com testes unitários co-localizados em `backend/test/unit/accounts.service.spec.ts`.
**Where**: `backend/src/modules/accounts/accounts.service.ts`
**Depends on**: T1
**Reuses**: `AccountsService.findById` e `AccountsService.verifyFamilyAccess` em `backend/src/modules/accounts/accounts.service.ts`
**Requirement**: FAV-01, FAV-02, FAV-03, FAV-10

**Tools**:

- MCP: NONE
- Skill: NONE

**Done when**:

- [ ] `findAll` retorna `isFavorite` por `userId` ordenado por `isFavorite DESC, createdAt DESC` mantendo `prisma.account.findMany` intacto
- [ ] `findById` retorna `isFavorite` específico do `userId`
- [ ] `favorite` e `unfavorite` são idempotentes (`upsert`/`deleteMany`), validam acesso e bloqueiam `VIEWER` (403), retornam 404 para conta inexistente/excluída e 400 `"Não é possível favoritar uma conta arquivada"` para conta arquivada
- [ ] `archive` e `remove` removem todos os vínculos `UserFavoriteAccount` da conta em `$transaction`, e `unarchive` retorna `isFavorite: false`
- [ ] Testes unitários escritos em `backend/test/unit/accounts.service.spec.ts` cobrindo 1:1 os ACs `FAV-01`, `FAV-02`, `FAV-03`, `FAV-10` e edge cases (mínimo 12 novos casos + todos existentes passando)
- [ ] Gate check passes: `cd backend && npm test -- test/unit/accounts.service.spec.ts`

**Tests**: unit
**Gate**: quick
**Commit**: `feat(accounts): add per-user favorites, ordering, and archive cleanup`

---

#### T3: Expor endpoints PATCH favorite e unfavorite em AccountsController

**What**: Adicionar rotas `@Patch(':id/favorite')` e `@Patch(':id/unfavorite')` em `AccountsController` com anotações Swagger e testes unitários do controller em `backend/test/unit/accounts.controller.spec.ts`.
**Where**: `backend/src/modules/accounts/accounts.controller.ts`
**Depends on**: T2
**Reuses**: Decorators `JwtAuthGuard`, `GetUser('id')` e padrão de `@Patch(':id/archive')` em `backend/src/modules/accounts/accounts.controller.ts`
**Requirement**: FAV-01, FAV-02

**Tools**:

- MCP: NONE
- Skill: NONE

**Done when**:

- [ ] Endpoints `PATCH /accounts/:id/favorite` e `PATCH /accounts/:id/unfavorite` delegam para `accountsService.favorite` e `accountsService.unfavorite` com `userId` e `id`
- [ ] Testes unitários em `backend/test/unit/accounts.controller.spec.ts` cobrem happy paths e propagação de `BadRequestException` (400), `ForbiddenException` (403) e `NotFoundException` (404) (mínimo 6 testes)
- [ ] Gate check passes: `cd backend && npm test -- test/unit/accounts.service.spec.ts test/unit/accounts.controller.spec.ts`

**Tests**: unit
**Gate**: quick
**Commit**: `feat(accounts): expose favorite and unfavorite endpoints`

---

#### T4: Implementar favoritos individuais, ordenação e limpeza em CreditCardsService

**What**: Implementar `favorite`, `unfavorite`, injeção de `isFavorite` e ordenação `isFavorite DESC, createdAt DESC` em `findAll`/`findById`, e limpeza transacional em `archive`/`remove` em `CreditCardsService`, com testes unitários co-localizados em `backend/test/unit/credit-cards.service.spec.ts`.
**Where**: `backend/src/modules/credit-cards/credit-cards.service.ts`
**Depends on**: T1
**Reuses**: `CreditCardsService.findById` e `CreditCardsService.verifyFamilyAccess` em `backend/src/modules/credit-cards/credit-cards.service.ts`
**Requirement**: FAV-04, FAV-05, FAV-06, FAV-10

**Tools**:

- MCP: NONE
- Skill: NONE

**Done when**:

- [ ] `findAll` preserva `committedAmount`/`availableLimit`, injeta `isFavorite` por `userId` e ordena por `isFavorite DESC, createdAt DESC` mantendo `prisma.creditCard.findMany` intacto
- [ ] `findById` retorna `isFavorite` específico do `userId`
- [ ] `favorite` e `unfavorite` são idempotentes, validam acesso e bloqueiam `VIEWER` (403), retornam 404 para cartão inexistente/excluído e 400 `"Não é possível favoritar um cartão arquivado"` para cartão arquivado
- [ ] `archive` e `remove` removem todos os vínculos `UserFavoriteCreditCard` do cartão em `$transaction`, e `unarchive` retorna `isFavorite: false`
- [ ] Testes unitários escritos em `backend/test/unit/credit-cards.service.spec.ts` cobrindo 1:1 os ACs `FAV-04`, `FAV-05`, `FAV-06`, `FAV-10` e edge cases (mínimo 12 novos casos + todos existentes passando)
- [ ] Gate check passes: `cd backend && npm test -- test/unit/credit-cards.service.spec.ts`

**Tests**: unit
**Gate**: quick
**Commit**: `feat(credit-cards): add per-user favorites and archive cleanup`

---

#### T5: Expor endpoints PATCH favorite e unfavorite em CreditCardsController

**What**: Adicionar rotas `@Patch(':id/favorite')` e `@Patch(':id/unfavorite')` em `CreditCardsController` com anotações Swagger e testes unitários do controller em `backend/test/unit/credit-cards.controller.spec.ts`.
**Where**: `backend/src/modules/credit-cards/credit-cards.controller.ts`
**Depends on**: T4
**Reuses**: Decorators `JwtAuthGuard`, `GetUser('id')` e padrão de `@Patch(':id/archive')` em `backend/src/modules/credit-cards/credit-cards.controller.ts`
**Requirement**: FAV-04, FAV-05

**Tools**:

- MCP: NONE
- Skill: NONE

**Done when**:

- [ ] Endpoints `PATCH /credit-cards/:id/favorite` e `PATCH /credit-cards/:id/unfavorite` delegam para `creditCardsService.favorite` e `creditCardsService.unfavorite` com `userId` e `id`
- [ ] Testes unitários em `backend/test/unit/credit-cards.controller.spec.ts` cobrem happy paths e propagação de `BadRequestException` (400), `ForbiddenException` (403) e `NotFoundException` (404) (mínimo 6 testes)
- [ ] Gate check passes: `cd backend && npm run build && npm test`

**Tests**: unit
**Gate**: build
**Commit**: `feat(credit-cards): expose favorite and unfavorite endpoints`

---

### Phase 3: Frontend — Gestão de Favoritos e Combos

#### T6: Adicionar botão estrela de favorito nos cards ativos de Contas

**What**: Adicionar botão estrela (`Star`) com alternância imediata (`PATCH /accounts/:id/favorite|unfavorite`), bloqueio concorrente via `togglingFavoriteId` e tratamento de erro nos cards ativos de `frontend/src/app/accounts/page.tsx`.
**Where**: `frontend/src/app/accounts/page.tsx`
**Depends on**: T3
**Reuses**: `apiRequest`, `useAuth().isViewer` e grupo de ações dos cards em `frontend/src/app/accounts/page.tsx`
**Requirement**: FAV-07

**Tools**:

- MCP: NONE
- Skill: NONE

**Done when**:

- [ ] Cards ativos exibem botão estrela apenas quando `!isViewer && !acc.isArchived`
- [ ] Clique alterna favorito sem confirmação, desabilita o botão durante a requisição e recarrega a lista mantendo favoritos primeiro
- [ ] Falha na API mantém estado anterior e exibe alerta de erro
- [ ] Gate check passes: `cd frontend && npm run lint && npm run build`

**Tests**: none
**Gate**: build
**Commit**: `feat(frontend): add favorite star toggle on active accounts`

---

#### T7: Adicionar botão estrela nos cartões ativos e marcador de favorito no pagamento de fatura

**What**: Adicionar botão estrela (`Star`) nos cards ativos de cartão (`card.isActive !== false`) quando `!isViewer` e exibir prefixo `"★ "` nas contas favoritas do combo "Conta de Débito" em `frontend/src/app/cards/page.tsx`.
**Where**: `frontend/src/app/cards/page.tsx`
**Depends on**: T3, T5
**Reuses**: `apiRequest`, `useAuth().isViewer` e padrão de ações/modal em `frontend/src/app/cards/page.tsx`
**Requirement**: FAV-07, FAV-09

**Tools**:

- MCP: NONE
- Skill: NONE

**Done when**:

- [ ] Cartões ativos exibem botão estrela apenas quando `!isViewer && card.isActive !== false`, com `togglingFavoriteId` e tratamento de erro sem estado inconsistente
- [ ] Combo "Conta de Débito" no modal de Liquidação de Fatura exibe prefixo `"★ "` para contas favoritas, já ordenadas no topo pela API
- [ ] Gate check passes: `cd frontend && npm run lint && npm run build`

**Tests**: none
**Gate**: build
**Commit**: `feat(frontend): add favorite toggle on cards and invoice pay combo`

---

#### T8: Exibir favoritos primeiro com marcador visual nos combos de Novo Lançamento

**What**: Atualizar os 5 combos de Conta e Cartão no modal "Novo Lançamento Financeiro" em `frontend/src/app/transactions/page.tsx` para destacar favoritos com prefixo `"★ "` no topo da lista e manter a pré-seleção do primeiro item (limpando seleção se a lista do contexto ficar vazia).
**Where**: `frontend/src/app/transactions/page.tsx`
**Depends on**: T3, T5
**Reuses**: `loadAuxData()` e selects existentes de Despesa, Receita e Transferência em `frontend/src/app/transactions/page.tsx`
**Requirement**: FAV-08

**Tools**:

- MCP: NONE
- Skill: NONE

**Done when**:

- [ ] Combos Conta Origem, Conta Destino, Conta (Despesa), Cartão de Crédito (Despesa) e Conta de Destino (Receita) exibem `"★ "` para itens com `isFavorite === true` no topo da lista
- [ ] Pré-seleção inicial em `loadAuxData()` seleciona o primeiro item retornado (favorito prioritário) ou `''` quando não houver itens
- [ ] Gate check passes: `cd frontend && npm run lint && npm run build`

**Tests**: none
**Gate**: build
**Commit**: `feat(frontend): highlight favorite accounts and cards in transactions`

---

#### T9: Exibir marcador visual de conta favorita no combo de Nova Meta

**What**: Atualizar o combo "Conta Vinculada (Cofrinho)" e a sincronização de pré-seleção por contexto em `frontend/src/app/goals/page.tsx` para exibir contas favoritas primeiro com prefixo `"★ "`.
**Where**: `frontend/src/app/goals/page.tsx`
**Depends on**: T3
**Reuses**: `loadData()` e combo de conta custódia em `frontend/src/app/goals/page.tsx`
**Requirement**: FAV-09

**Tools**:

- MCP: NONE
- Skill: NONE

**Done when**:

- [ ] Combo "Conta Vinculada (Cofrinho)" exibe `"★ "` nas opções com `isFavorite === true` ordenadas no topo pela API
- [ ] Pré-seleção acompanha o primeiro item ao abrir ou trocar de contexto (ou limpa se a lista vier vazia)
- [ ] Gate check passes: `cd backend && npx prisma validate && npx prisma generate && npm run build && npm test && cd ../frontend && npm run lint && npm run build`

**Tests**: none
**Gate**: build
**Commit**: `feat(frontend): highlight favorite accounts in goal creation combo`

---

## Phase Execution Map

Phases run sequentially (`Phase 1` → `Phase 2` → `Phase 3`). Within each phase, tasks execute sequentially; arrows below reflect `Depends on` relationships within the same phase.

```
Phase 1:  T1
Phase 2:  T2 → T3
          T4 → T5
Phase 3:  T6 (after T3)
          T7 (after T3, T5)
          T8 (after T3, T5)
          T9 (after T3)
```

---

## Diagram-Definition Cross-Check

| Task | Depends On (task body) | Diagram Shows | Status |
| --- | --- | --- | --- |
| T1 | None | T1 (Phase 1 root) | ✅ Match |
| T2 | T1 (Phase 1) | T2 (Phase 2 start after Phase 1) | ✅ Match |
| T3 | T2 | T2 → T3 | ✅ Match |
| T4 | T1 (Phase 1) | T4 (Phase 2 start after Phase 1) | ✅ Match |
| T5 | T4 | T4 → T5 | ✅ Match |
| T6 | T3 (Phase 2) | T6 (Phase 3 after Phase 2) | ✅ Match |
| T7 | T3, T5 (Phase 2) | T7 (Phase 3 after Phase 2) | ✅ Match |
| T8 | T3, T5 (Phase 2) | T8 (Phase 3 after Phase 2) | ✅ Match |
| T9 | T3 (Phase 2) | T9 (Phase 3 after Phase 2) | ✅ Match |

---

## Test Co-location Validation

| Task | Code Layer Created/Modified | Matrix Requires | Task Says | Status |
| --- | --- | --- | --- | --- |
| T1: Prisma schema models | Backend Schema (Prisma) | none | none | ✅ OK |
| T2: AccountsService | Backend Service | unit | unit | ✅ OK |
| T3: AccountsController | Backend Controller | unit | unit | ✅ OK |
| T4: CreditCardsService | Backend Service | unit | unit | ✅ OK |
| T5: CreditCardsController | Backend Controller | unit | unit | ✅ OK |
| T6: AccountsPage | Frontend Pages (Next.js) | none | none | ✅ OK |
| T7: CardsPage | Frontend Pages (Next.js) | none | none | ✅ OK |
| T8: TransactionsPage | Frontend Pages (Next.js) | none | none | ✅ OK |
| T9: GoalsPage | Frontend Pages (Next.js) | none | none | ✅ OK |
