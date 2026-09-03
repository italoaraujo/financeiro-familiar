# Atribuição de Pessoa a Lançamentos e Membros Sem Login Tasks

## Execution Protocol (MANDATORY -- do not skip)

Implement these tasks with the `tlc-spec-driven` skill: **activate it by name and follow its Execute flow and Critical Rules.** Do not search for skill files by filesystem path. The skill is the source of truth for the full flow (per-task cycle, sub-agent delegation, adequacy review, Verifier, discrimination sensor).

---

**Spec**: `.specs/features/atribuicao-pessoa-lancamento/spec.md`
**Status**: Ready for execution

---

## Test Coverage Matrix

| Code Layer | Required Test Type | Coverage Expectation | Location Pattern | Run Command |
| ---------- | ------------------ | -------------------- | ---------------- | ----------- |
| Database Schema / Prisma | none | - (build gate only) | `backend/prisma/schema.prisma` | build gate only |
| DTOs & Contracts | none | - (build gate only) | `backend/src/**/dto/*.ts` | build gate only |
| Backend Services (Families, Transactions, Cards) | unit | 1:1 com requisitos de criação de pessoa, atribuição a transação, parcelamento e agregação | `backend/test/unit/*.spec.ts` | `npm --prefix backend test` |
| Frontend Components & UI | none | - (build gate only) | `frontend/src/**/*.tsx` | build gate only |

---

## Gate Check Commands

| Gate Level | When to Use | Command |
| ---------- | ----------- | ------- |
| Quick | Após alterações em DTOs ou schema | `npm --prefix backend run prisma:generate` |
| Unit | Após alterações de regras de negócio em serviços | `npm --prefix backend test` |
| Build | Após conclusão de cada fase | `npm --prefix backend run build && npm --prefix frontend run build` |

---

## Execution Plan

Phases are ordered and run sequentially - each phase completes before the next begins, and tasks within a phase execute in order.

### Phase 1: Banco de Dados e Modelo Prisma

Criação da tabela `people`, relacionamento com `Family` e `User`, e chave estrangeira `personId` em `Transaction`.

```
T1
```

### Phase 2: Backend Services e Controllers

Implementação do gerenciamento de pessoas da família (com e sem login), atribuição de pessoa em lançamentos simples e parcelados, filtros e agregação por pessoa na fatura.

```
T2 → T3 → T4 → T5 → T6
```

### Phase 3: Frontend e Telas de Usuário

Adaptação da tela de Família para gestão de membros sem login, tela de Lançamentos com seletor e badges de pessoa, e tela de Cartões com detalhamento de gastos por pessoa na fatura.

```
T7 → T8 → T9
```

---

## Task Breakdown

### Phase 1: Banco de Dados e Modelo Prisma

#### T1: Modelo Person e Campo personId em Transaction no Prisma

**What**: Adicionar o modelo `Person` no `schema.prisma` com campos `id`, `familyId`, `userId` (opcional), `name`, `color` e `avatarUrl`. Adicionar a relação `people Person[]` em `Family` e `personId` opcional em `Transaction` com relação `person Person?` e índice por data. Executar `prisma generate`.
**Where**: `backend/prisma/schema.prisma`
**Depends on**: None
**Requirement**: PERS-01, PERS-04
**Done when**:
- [x] Modelo `Person` declarado no schema
- [x] Relação entre `Family` e `Person` declarada
- [x] Campo `personId` e índice declarados em `Transaction`
- [x] `npx prisma generate` executado com sucesso
**Tests**: none
**Gate**: quick

---

### Phase 2: Backend Services e Controllers

#### T2: DTOs para Criação de Pessoa e Filtros

**What**: Criar o DTO `CreatePersonDto` para validação de criação de membros/pessoas sem login (com nome obrigatório e cor opcional), e atualizar `CreateTransactionDto` e `FilterTransactionDto` com `personId` opcional UUID.
**Where**: `backend/src/modules/families/dto/create-person.dto.ts`
**Depends on**: None
**Requirement**: PERS-01, PERS-04, PERS-07
**Done when**:
- [x] `CreatePersonDto` criado com validações `@IsNotEmpty()`, `@IsString()` e `@IsOptional()`
- [x] `CreateTransactionDto` e `FilterTransactionDto` atualizados com `personId`
**Tests**: none
**Gate**: quick

---

#### T3: Métodos de Gestão de Pessoas em FamiliesService

**What**: Implementar em `FamiliesService` os métodos `createPerson` (adiciona pessoa sem login à família), `getFamilyPeople` (retorna pessoas da família com e sem login), `updatePerson` e `removePerson` (desvinculando com segurança de transações). Adicionar sincronização para que ao criar família ou adicionar membro com login, seja gerado um registro em `Person`.
**Where**: `backend/src/modules/families/families.service.ts`
**Depends on**: T2
**Requirement**: PERS-01, PERS-02, PERS-03
**Done when**:
- [x] `createPerson` valida permissão e persiste pessoa sem login vinculada à família
- [x] `getFamilyPeople` lista membros e pessoas da família com seus identificadores
- [x] `removePerson` remove pessoa com segurança desvinculando lançamentos existentes
- [x] Testes unitários cobrem criação e listagem de pessoas
**Tests**: `backend/test/unit/families.service.spec.ts`
**Gate**: unit

---

#### T4: Endpoints de Pessoas em FamiliesController

**What**: Adicionar rotas HTTP REST em `FamiliesController`: `GET /families/:id/people`, `POST /families/:id/people`, `PATCH /families/:id/people/:personId` e `DELETE /families/:id/people/:personId`, com guardas de autenticação e validação de permissão.
**Where**: `backend/src/modules/families/families.controller.ts`
**Depends on**: T3
**Requirement**: PERS-01, PERS-03
**Done when**:
- [x] Rotas declaradas com decoradores Swagger e Auth Guards
- [x] Parâmetros e payloads repassados corretamente ao `FamiliesService`
**Tests**: `backend/test/unit/families.service.spec.ts`
**Gate**: unit

---

#### T5: Atribuição de Pessoa e Filtro em TransactionsService

**What**: Atualizar `create` em `TransactionsService` para persistir `personId` (validando que a pessoa pertence à família da transação). Em compras parceladas no cartão de crédito, propagar o mesmo `personId` para todas as parcelas geradas. No método `findAll`, permitir filtrar por `personId` e incluir o objeto `person: { select: { id: true, name: true, color: true } }` no retorno.
**Where**: `backend/src/modules/transactions/transactions.service.ts`
**Depends on**: T4
**Requirement**: PERS-04, PERS-05, PERS-06, PERS-07
**Done when**:
- [x] Transações simples e no cartão persistem `personId`
- [x] Todas as parcelas de compra parcelada herdam o `personId`
- [x] Filtro por `personId` funciona em `findAll`
- [x] Retorno inclui dados da pessoa atribuída
- [x] Testes unitários cobrem persistência e propagação de parcelas
**Tests**: `backend/test/unit/transactions.service.spec.ts`
**Gate**: unit

---

#### T6: Agregação de Gastos por Pessoa na Fatura em CreditCardsService

**What**: Atualizar `CreditCardsService` para carregar dados da pessoa atribuída nas transações das faturas e calcular o total agregado de gastos consumidos por cada pessoa na fatura (`personBreakdown: { personId, name, color, totalAmount }[]`).
**Where**: `backend/src/modules/credit-cards/credit-cards.service.ts`
**Depends on**: T5
**Requirement**: PERS-08
**Done when**:
- [x] Transações de faturas incluem dados da pessoa
- [x] Fatura retorna cálculo consolidado do total gasto por pessoa
- [x] Gastos sem pessoa atribuída são classificados como não atribuídos
- [x] Testes unitários validam a agregação correta de valores
**Tests**: `backend/test/unit/credit-cards.service.spec.ts`
**Gate**: unit

---

### Phase 3: Frontend e Telas de Usuário

#### T7: Interface de Gestão de Pessoas sem Login na Página de Família

**What**: Atualizar `frontend/src/app/family/page.tsx` com seção dedicada "Pessoas e Membros da Família", exibição de badges diferenciando membros com conta e pessoas sem login, botão "Nova Pessoa (sem login)", modal com formulário de Nome e Seletor de Cor, e opção de remoção de pessoa sem login.
**Where**: `frontend/src/app/family/page.tsx`
**Depends on**: None
**Requirement**: PERS-01, PERS-02, PERS-03
**Done when**:
- [ ] Seção de pessoas exibida com lista unificada
- [ ] Modal de cadastro de pessoa sem login funcional (envio para API e recarregamento)
- [ ] Indicador visual e badge diferenciado para membros sem login
- [ ] Ação de exclusão funcional
**Tests**: none
**Gate**: build

---

#### T8: Seletor de Pessoa, Badges e Filtro na Página de Lançamentos

**What**: Atualizar `frontend/src/app/transactions/page.tsx` para carregar a lista de pessoas da família selecionada. No modal de criação de transação (Despesa, Receita e Cartão), incluir o campo dropdown "Quem realizou? (Pessoa)". Na tabela de transações, renderizar o badge com nome e cor da pessoa. Na barra superior de filtros, incluir o seletor "Todas as Pessoas" para filtrar a listagem.
**Where**: `frontend/src/app/transactions/page.tsx`
**Depends on**: T7
**Requirement**: PERS-04, PERS-05, PERS-06, PERS-07
**Done when**:
- [ ] Dropdown de pessoas disponível no modal de nova transação
- [ ] Badge colorido da pessoa renderizado na linha da transação na tabela
- [ ] Filtro por pessoa filtra dinamicamente a tabela
- [ ] Funciona tanto para despesas em conta quanto compras no cartão
**Tests**: none
**Gate**: build

---

#### T9: Resumo de Gastos por Pessoa na Fatura na Página de Cartões

**What**: Atualizar `frontend/src/app/cards/page.tsx` para exibir na visualização das faturas do cartão de crédito o resumo com a divisão de gastos por pessoa (ex: barra ou cartões com total gasto por cada familiar na fatura correspondente) e a pessoa responsável em cada lançamento da fatura.
**Where**: `frontend/src/app/cards/page.tsx`
**Depends on**: T8
**Requirement**: PERS-08
**Done when**:
- [ ] Fatura exibe barra/cards com o total gasto por cada pessoa
- [ ] Transações da fatura mostram o badge de quem fez a compra
- [ ] Valores batem exatamente com a soma dos lançamentos atribuídos
**Tests**: none
**Gate**: build
