# Autocomplete de Descrições de Lançamentos Tasks

## Execution Protocol (MANDATORY -- do not skip)

Implement these tasks with the `tlc-spec-driven` skill: **activate it by name and follow its Execute flow and Critical Rules.** Do not search for skill files by filesystem path. The skill is the source of truth for the full flow (per-task cycle, sub-agent delegation, adequacy review, Verifier, discrimination sensor).

---

**Design**: Inline (escopo Medium - índices no Prisma, endpoint no módulo Transactions e componente AutocompleteInput no Frontend)
**Status**: Ready

---

## Test Coverage Matrix

> Generated from codebase, project guidelines, and spec - confirm before Execute. Guidelines found: none - strong defaults applied.

| Code Layer | Required Test Type | Coverage Expectation | Location Pattern | Run Command |
| ---------- | ------------------ | -------------------- | ---------------- | ----------- |
| Database / Schema | none | Índices válidos e Prisma Client gerado | `backend/prisma/schema.prisma` | build gate only |
| DTO / Validation | unit | Validação de enums, strings opcionais e limites | `backend/src/modules/transactions/dto/get-descriptions.dto.ts` | `npm test test/unit/transactions.service.spec.ts` |
| Domain / Service | unit | Cobertura 1:1 dos ACs (AUTO-01 a AUTO-06, AUTO-12) | `backend/src/modules/transactions/transactions.service.ts` | `npm test test/unit/transactions.service.spec.ts` |
| Controller / Route | unit | Rota GET exposta com guard e query binding | `backend/src/modules/transactions/transactions.controller.ts` | `npm test test/unit/transactions.service.spec.ts` |
| Frontend Component | none | Debounce, cache, eventos de teclado e renderização | `frontend/src/components/ui/AutocompleteInput.tsx` | `npm run build` |
| Frontend Page | none | Integração no modal de transação e isolamento por aba | `frontend/src/app/transactions/page.tsx` | `npm run build` |

## Gate Check Commands

> Generated from codebase - confirm before Execute.

| Gate Level | When to Use | Command |
| ---------- | ----------- | ------- |
| Quick | After tasks with unit tests only | `export PATH=/home/italo/.nvm/versions/node/v24.18.0/bin:$PATH && cd backend && npx jest test/unit/transactions.service.spec.ts` |
| Full | After tasks with integration tests | `export PATH=/home/italo/.nvm/versions/node/v24.18.0/bin:$PATH && cd backend && npx jest test/unit/transactions.service.spec.ts` |
| Build | After phase completion or config/entity-only tasks | `export PATH=/home/italo/.nvm/versions/node/v24.18.0/bin:$PATH && cd backend && npm run build && cd ../frontend && npm run build` |

---

## Execution Plan

Phases are ordered and run sequentially - each phase completes before the next begins, and tasks within a phase execute in order.

### Phase 1: Database and Backend Contracts

```
T1 → T2
```

### Phase 2: Business Logic & Backend Service

```
T3 → T4 → T5
```

### Phase 3: Frontend Component & Integration

```
T6 → T7
```

---

## Task Breakdown

### Phase 1: Database and Backend Contracts

#### T1: Adicionar índices compostos no schema Prisma

**What**: Adicionar índices compostos para busca de descrições por tenant, tipo e deletedAt no modelo `Transaction`.
**Where**: `backend/prisma/schema.prisma`
**Depends on**: None
**Requirement**: AUTO-09

**Tools**:

- MCP: NONE
- Skill: NONE

**Done when**:

- [x] Índices `[familyId, type, deletedAt, description]` e `[userId, type, deletedAt, description]` adicionados ao `Transaction`
- [x] Prisma client é regenerado com sucesso
- [x] Nenhum erro de compilação no backend

**Tests**: none
**Gate**: build

---

#### T2: Criar GetDescriptionsDto para validação do endpoint

**What**: Criar DTO de validação para query parameters do endpoint de descrições anteriores.
**Where**: `backend/src/modules/transactions/dto/get-descriptions.dto.ts`
**Depends on**: T1
**Requirement**: AUTO-01, AUTO-02, AUTO-03, AUTO-06

**Tools**:

- MCP: NONE
- Skill: NONE

**Done when**:

- [x] Campo `type` validado com enum `TransactionType`
- [x] Campo opcional `search` do tipo string sanitizável
- [x] Campo opcional `familyId` com validação de UUID
- [x] Campo opcional `limit` validado com mínimo 1 e máximo 20 (padrão 10)
- [x] Swagger devidamente anotado

**Tests**: unit
**Gate**: quick

---

### Phase 2: Business Logic & Backend Service

#### T3: Implementar getDistinctDescriptions no TransactionsService

**What**: Implementar consulta agrupada de descrições no `TransactionsService` com isolamento de tipo e recência.
**Where**: `backend/src/modules/transactions/transactions.service.ts`
**Depends on**: T2
**Requirement**: AUTO-01, AUTO-02, AUTO-03, AUTO-04, AUTO-05, AUTO-06, AUTO-12

**Tools**:

- MCP: NONE
- Skill: NONE

**Done when**:

- [x] Método `getDistinctDescriptions` implementado com `groupBy` em `description`
- [x] Filtro estrito por `type` (`EXPENSE`, `INCOME`, `TRANSFER`)
- [x] Ignora transações deletadas (`deletedAt != null`) e privadas de outros usuários
- [x] Ordenado por recência (`_max: { transactionDate: 'desc' }`) e limitado pelo `limit`

**Tests**: unit
**Gate**: quick

---

#### T4: Expor rota GET /transactions/descriptions no TransactionsController

**What**: Registrar rota `GET /transactions/descriptions` com autenticação JWT e documentação OpenAPI.
**Where**: `backend/src/modules/transactions/transactions.controller.ts`
**Depends on**: T3
**Requirement**: AUTO-01, AUTO-02, AUTO-03, AUTO-06

**Tools**:

- MCP: NONE
- Skill: NONE

**Done when**:

- [x] Rota `GET /transactions/descriptions` declarada antes das rotas genéricas
- [x] Endpoint decorado com `@ApiOperation` e `@ApiResponse`
- [x] Delegação correta para `transactionsService.getDistinctDescriptions`

**Tests**: unit
**Gate**: quick

---

#### T5: Implementar testes unitários para getDistinctDescriptions

**What**: Escrever suíte de testes unitários para validar isolamento por aba, busca, privacidade e limites.
**Where**: `backend/test/unit/transactions.service.spec.ts`
**Depends on**: T4
**Requirement**: AUTO-01, AUTO-02, AUTO-03, AUTO-04, AUTO-05, AUTO-06

**Tools**:

- MCP: NONE
- Skill: NONE

**Done when**:

- [x] Teste unitário verifica que tipo `EXPENSE` não retorna descrições de `INCOME` ou `TRANSFER`
- [x] Teste unitário verifica busca case-insensitive por substring
- [x] Teste unitário verifica exclusão de transações privadas de outros membros
- [x] Teste unitário verifica exclusão de transações com `deletedAt`
- [x] Gate check `quick` passa com 100% de sucesso

**Tests**: unit
**Gate**: quick

---

### Phase 3: Frontend Component & Integration

#### T6: Criar componente AutocompleteInput com debounce e cache

**What**: Criar componente reutilizável de input com dropdown de autocomplete, debounce de 250ms e cache em memória.
**Where**: `frontend/src/components/ui/AutocompleteInput.tsx`
**Depends on**: T4
**Requirement**: AUTO-07, AUTO-10, AUTO-11

**Tools**:

- MCP: NONE
- Skill: NONE

**Done when**:

- [ ] Componente implementa debounce de 250ms antes de disparar requisição ao backend
- [ ] Cache em memória particionado por `familyId:type:search` com resposta imediata
- [ ] Suporte a navegação por teclado (setas para cima/baixo, Enter para selecionar, Escape para fechar)
- [ ] Fecha a lista ao clicar fora
- [ ] Exibe as 10 sugestões mais recentes ao focar campo vazio

**Tests**: none
**Gate**: build

---

#### T7: Integrar AutocompleteInput no modal de novo lançamento

**What**: Substituir o campo de descrição padrão pelo `AutocompleteInput` no modal das 3 abas de transações.
**Where**: `frontend/src/app/transactions/page.tsx`
**Depends on**: T6
**Requirement**: AUTO-01, AUTO-02, AUTO-03, AUTO-04, AUTO-08

**Tools**:

- MCP: NONE
- Skill: NONE

**Done when**:

- [ ] Campo de descrição utiliza `AutocompleteInput` passando `modalType` dinâmico (`EXPENSE`, `INCOME`, `TRANSFER`)
- [ ] Troca de aba entre Despesa, Receita e Transferência reseta e atualiza imediatamente as sugestões
- [ ] Nenhuma descrição de Despesa aparece nas abas de Receita ou Transferência
- [ ] Submissão do formulário mantém o comportamento original sem regressão
- [ ] Lint e build de produção do frontend passam com código 0

**Tests**: none
**Gate**: build
