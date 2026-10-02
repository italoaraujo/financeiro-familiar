# Hora e Minuto no Lançamento Tasks

## Execution Protocol (MANDATORY -- do not skip)

Implement these tasks with the `tlc-spec-driven` skill: **activate it by name and follow its Execute flow and Critical Rules.** Do not search for skill files by filesystem path. The skill is the source of truth for the full flow (per-task cycle, sub-agent delegation, adequacy review, Verifier, discrimination sensor).

**If the skill cannot be activated, STOP and tell the user - do not proceed without it.**

---

**Design**: Inline (escopo Medium - arquitetura direta nos DTOs, Service e UI existentes)
**Status**: In Progress

---

## Test Coverage Matrix

> Generated from codebase, project guidelines, and spec - confirm before Execute. Guidelines found: none - strong defaults applied.

| Code Layer | Required Test Type | Coverage Expectation | Location Pattern | Run Command |
| ---------- | ------------------ | -------------------- | ---------------- | ----------- |
| Schema / Database | none | Schema válido e sincronizado | `backend/prisma/schema.prisma` | build gate only |
| DTO / Validation | unit | Validação de formatos de data e hora opcional | `backend/src/modules/transactions/dto/*.ts` | `npm test --prefix /var/www/financeiro-familiar/backend test/unit/transactions.service.spec.ts` |
| Domain / Service | unit | Cobertura 1:1 dos ACs (TIME-01 a TIME-08) e edge cases | `backend/src/modules/transactions/transactions.service.ts` | `npm test --prefix /var/www/financeiro-familiar/backend test/unit/transactions.service.spec.ts` |
| UI Component / Page | none | Renderização dos campos e envio de payload correto | `frontend/src/app/transactions/page.tsx` | `npm run build --prefix /var/www/financeiro-familiar/frontend` |

## Gate Check Commands

> Generated from codebase - confirm before Execute.

| Gate Level | When to Use | Command |
| ---------- | ----------- | ------- |
| Quick | After tasks with unit tests only | `npm test --prefix /var/www/financeiro-familiar/backend test/unit/transactions.service.spec.ts` |
| Full | After tasks with integration tests | `npm test --prefix /var/www/financeiro-familiar/backend` |
| Build | After phase completion or config/entity-only tasks | `npm run build --prefix /var/www/financeiro-familiar/backend && npm run build --prefix /var/www/financeiro-familiar/frontend` |

---

## Execution Plan

Phases are ordered and run sequentially - each phase completes before the next begins, and tasks within a phase execute in order.

### Phase 1: Database and Backend Contracts

```
T1 → T2 → T3
```

### Phase 2: Business Logic and Service Implementation

```
T4 → T5
```

### Phase 3: Frontend Integration and UI

```
T6 → T7
```

---

## Task Breakdown

### Phase 1: Database and Backend Contracts

#### T1: Atualizar schema Prisma para persistência de timestamptz

**What**: Alterar o campo `transactionDate` de `Transaction` para persistir timezone e timestamp completo (`@db.Timestamptz`).
**Where**: `backend/prisma/schema.prisma`
**Depends on**: None
**Requirement**: TIME-02

**Tools**:

- MCP: NONE
- Skill: NONE

**Done when**:

- [x] Campo `transactionDate` na model `Transaction` utiliza `@db.Timestamptz`
- [x] Prisma client é regenerado com sucesso
- [x] Schema do banco de dados PostgreSQL é sincronizado

**Tests**: none
**Gate**: build

---

#### T2: Atualizar CreateTransactionDto para suportar horário opcional

**What**: Adicionar validação para campo opcional de horário `transactionTime` no DTO de criação de transações.
**Where**: `backend/src/modules/transactions/dto/create-transaction.dto.ts`
**Depends on**: T1
**Requirement**: TIME-01

**Tools**:

- MCP: NONE
- Skill: NONE

**Done when**:

- [x] Campo `transactionTime?: string` adicionado com validação de formato `HH:mm` (opcional)
- [x] Validação do `transactionDate` permanece compatível com formato `YYYY-MM-DD` ou ISO completo
- [x] Documentação Swagger atualizada

**Tests**: unit
**Gate**: quick

---

#### T3: Atualizar TransferDto para suportar horário opcional

**What**: Adicionar campo opcional de horário `transactionTime` no DTO de transferências.
**Where**: `backend/src/modules/transactions/dto/transfer.dto.ts`
**Depends on**: T2
**Requirement**: TIME-06

**Tools**:

- MCP: NONE
- Skill: NONE

**Done when**:

- [x] Campo `transactionTime?: string` adicionado ao `TransferDto`
- [x] Validação aceita horários no formato `HH:mm`
- [x] Documentação Swagger atualizada

**Tests**: unit
**Gate**: quick

---

### Phase 2: Business Logic and Service Implementation

#### T4: Implementar parsing e persistência de horário no TransactionsService

**What**: Atualizar o método `parseTransactionDate` e fluxos de criação de transação, transferência e parcelas para persistir horários e aplicar `00:00:00` nas parcelas futuras.
**Where**: `backend/src/modules/transactions/transactions.service.ts`
**Depends on**: T3
**Requirement**: TIME-02, TIME-03, TIME-05, TIME-06, TIME-07, TIME-08

**Tools**:

- MCP: NONE
- Skill: NONE

**Done when**:

- [x] `parseTransactionDate` aceita `dateInput` e `timeInput` opcional, definindo a hora e minuto fornecidos
- [x] Caso não haja horário fornecido, define horário neutro padrão (12:00:00)
- [x] Compras parceladas atribuem o horário informado à primeira parcela e `00:00:00` às parcelas subsequentes
- [x] Transferências atribuem o mesmo horário a ambas as pontas
- [x] Filtros de data (`startDate`/`endDate`) consideram o dia completo (00:00:00 até 23:59:59.999)
- [x] Ordenação de transações aplica `orderBy: [{ transactionDate: 'desc' }, { createdAt: 'desc' }]`

**Tests**: unit
**Gate**: quick

---

#### T5: Adicionar testes unitários para regras de horário no TransactionsService

**What**: Implementar testes unitários cobrindo todos os cenários de horário em transação simples, transferência, parcelamento e ordenação.
**Where**: `backend/test/unit/transactions.service.spec.ts`
**Depends on**: T4
**Requirement**: TIME-01, TIME-02, TIME-03, TIME-04, TIME-05, TIME-06, TIME-07, TIME-08

**Tools**:

- MCP: NONE
- Skill: NONE

**Done when**:

- [x] Teste unitário para criação com horário explícito
- [x] Teste unitário para criação sem horário (fallback 12:00:00)
- [x] Teste unitário para transferência com horário consistente
- [x] Teste unitário para parcelamento (1ª parcela com horário informado, parcelas 2+ com 00:00:00)
- [x] Todos os testes unitários do serviço passam no Jest

**Tests**: unit
**Gate**: quick

---

### Phase 3: Frontend Integration and UI

#### T6: Adicionar formatador de data e hora para exibição no extrato

**What**: Criar função de formatação para data com horário discreto e legível em formatters.
**Where**: `frontend/src/lib/formatters.ts`
**Depends on**: T5
**Requirement**: TIME-04

**Tools**:

- MCP: NONE
- Skill: NONE

**Done when**:

- [x] Função `formatTransactionDateTime` exportada
- [x] Exibe a data (DD/MM/YYYY) e o horário (HH:mm) quando presente e relevante
- [x] Retorna traço ou formato limpo para valores nulos/inválidos

**Tests**: none
**Gate**: build

---

#### T7: Integrar campo de horário no modal e exibição no extrato

**What**: Adicionar campo de horário no modal de Novo Lançamento (iniciando vazio) e exibir o horário na coluna de data da tabela de transações.
**Where**: `frontend/src/app/transactions/page.tsx`
**Depends on**: T6
**Requirement**: TIME-01, TIME-04

**Tools**:

- MCP: NONE
- Skill: NONE

**Done when**:

- [ ] Campo de entrada de horário (`input type="time"`) adicionado no modal de novo lançamento ao lado da data
- [ ] Horário inicia vazio/opcional conforme decisão de produto
- [ ] Payload enviado para API inclui `transactionTime` ou `transactionDate` com hora e minuto
- [ ] Tabela de extrato exibe a data e a hora do lançamento de forma limpa e responsiva
- [ ] Build do frontend passa sem erros

**Tests**: none
**Gate**: build

---

## Pre-Approval Validation

### Check 1: Task Granularity

| Task | Where | Single File? | Status |
| ---- | ----- | ------------ | ------ |
| T1 | `backend/prisma/schema.prisma` | Yes | Passed |
| T2 | `backend/src/modules/transactions/dto/create-transaction.dto.ts` | Yes | Passed |
| T3 | `backend/src/modules/transactions/dto/transfer.dto.ts` | Yes | Passed |
| T4 | `backend/src/modules/transactions/transactions.service.ts` | Yes | Passed |
| T5 | `backend/test/unit/transactions.service.spec.ts` | Yes | Passed |
| T6 | `frontend/src/lib/formatters.ts` | Yes | Passed |
| T7 | `frontend/src/app/transactions/page.tsx` | Yes | Passed |

### Check 2: Diagram-Definition Cross-Check

| Task | Depends on (spec) | Diagram Edge | Parity? |
| ---- | ----------------- | ------------ | ------- |
| T1 | None | None | Passed |
| T2 | T1 | T1 → T2 | Passed |
| T3 | T2 | T2 → T3 | Passed |
| T4 | T3 (Cross-phase) | Phase 1 → Phase 2 | Passed |
| T5 | T4 | T4 → T5 | Passed |
| T6 | T5 (Cross-phase) | Phase 2 → Phase 3 | Passed |
| T7 | T6 | T6 → T7 | Passed |

### Check 3: Test Co-location Validation

| Task | Layer | Required Test Type | Tests Field | Compliant? |
| ---- | ----- | ------------------ | ----------- | ---------- |
| T1 | Schema / Database | none | none | Passed |
| T2 | DTO / Validation | unit | unit | Passed |
| T3 | DTO / Validation | unit | unit | Passed |
| T4 | Domain / Service | unit | unit | Passed |
| T5 | Test Layer | unit | unit | Passed |
| T6 | Frontend Helper | none | none | Passed |
| T7 | UI Component / Page | none | none | Passed |
