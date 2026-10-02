# Correção de Vulnerabilidades Críticas de Segurança Tasks

## Execution Protocol (MANDATORY -- do not skip)

Implement these tasks with the `tlc-spec-driven` skill: **activate it by name and follow its Execute flow and Critical Rules.** Do not search for skill files by filesystem path. The skill is the source of truth for the full flow (per-task cycle, sub-agent delegation, adequacy review, Verifier, discrimination sensor).

**If the skill cannot be activated, STOP and tell the user - do not proceed without it.**

---

**Spec**: `.specs/features/correcao-criticas-auditoria/spec.md`  
**Status**: Ready  

---

## Test Coverage Matrix

> Generated from codebase, project guidelines, and spec - confirm before Execute. Guidelines found: `backend/package.json`, `jest.config`.

| Code Layer | Required Test Type | Coverage Expectation | Location Pattern | Run Command |
| ---------- | ------------------ | -------------------- | ---------------- | ----------- |
| Services (Goals) | unit | Validação atômica e proteção contra race condition no resgate | `backend/test/unit/goals.service.spec.ts` | `npm --prefix backend test -- test/unit/goals.service.spec.ts` |
| Services (Transactions) | unit | Validação de saldo em transferências e validação de categoria | `backend/test/unit/transactions.service.spec.ts` | `npm --prefix backend test -- test/unit/transactions.service.spec.ts` |
| Services (Budgets) | unit | Validação de BOLA/IDOR em categoria de orçamento | `backend/test/unit/budgets.service.spec.ts` | `npm --prefix backend test -- test/unit/budgets.service.spec.ts` |

## Gate Check Commands

> Generated from codebase - confirm before Execute.

| Gate Level | When to Use | Command |
| ---------- | ----------- | ------- |
| Quick | After tasks with unit tests only | `npm --prefix backend test` |
| Full | After all tasks | `npm --prefix backend test` |
| Build | After completion | `npm --prefix backend run build` |

---

## Execution Plan

Phases are ordered and run sequentially - each phase completes before the next begins, and tasks within a phase execute in order.

### Phase 1: Correção das Vulnerabilidades Críticas

Implementação de verificações de autorização, integridade de saldo e tratamento de concorrência.

```
T1 → T2 → T3 → T4
```

---

## Task Breakdown

### T1: Correção de Race Condition no Resgate de Metas (SEC-CRIT-01)

**What**: Mover a consulta da meta e a validação de saldo para dentro da transação de banco em `GoalsService.withdraw`, aplicando decremento atômico `{ currentAmount: { decrement: withdrawAmount } }`, e atualizar a suíte de testes unitários para validar a rejeição de saldo insuficiente e o fluxo atômico.  
**Where**: `backend/src/modules/goals/goals.service.ts`  
**Depends on**: None  
**Reuses**: `backend/src/modules/goals/goals.service.ts`  
**Requirement**: CRIT-01, CRIT-02, CRIT-03  

**Tools**:

- Code editor
- Bash terminal

**Done when**:

- [x] A consulta da meta e a checagem de saldo ocorrem dentro do callback de `$transaction`.
- [x] O saldo da meta é atualizado utilizando decremento atômico `{ decrement: withdrawAmount }`.
- [x] Tentativas de resgate com saldo insuficiente lançam `BadRequestException` ('Saldo insuficiente na meta para realizar o resgate').
- [x] Testes unitários em `goals.service.spec.ts` cobrindo resgate atômico e saldo insuficiente passam com 100% de sucesso.
- [x] Gate check passes: `npm --prefix backend test -- test/unit/goals.service.spec.ts`

**Tests**: unit  
**Gate**: quick  

---

### T2: Bloqueio de Transferência Financeira sem Saldo Disponível (SEC-CRIT-02)

**What**: Atualizar `transfer` em `TransactionsService` para validar se a conta bancária de origem possui saldo disponível (`source.currentBalance.gte(amount)`), lançando `BadRequestException` com mensagem explicativa se o saldo for insuficiente, e atualizar a suíte de testes unitários.  
**Where**: `backend/src/modules/transactions/transactions.service.ts`  
**Depends on**: T1  
**Reuses**: `backend/src/modules/transactions/transactions.service.ts`  
**Requirement**: CRIT-04, CRIT-05  

**Tools**:

- Code editor
- Bash terminal

**Done when**:

- [x] Transferência com montante maior que o saldo da conta de origem lança `BadRequestException`.
- [x] Transferência com saldo suficiente continua debitando a origem e creditando o destino atomicamente.
- [x] Testes unitários em `transactions.service.spec.ts` cobrindo validação de saldo insuficiente e transferência legítima passam.
- [x] Gate check passes: `npm --prefix backend test -- test/unit/transactions.service.spec.ts`

**Tests**: unit  
**Gate**: quick  

---

### T3: Prevenção de BOLA/IDOR em Categorias em Lançamentos (SEC-CRIT-03 parte 1)

**What**: Atualizar `create` em `TransactionsService` para validar que `dto.categoryId` existe, não está marcado com soft-delete, e pertence ao escopo autorizado (categoria padrão do sistema `isSystemDefault`, conta pessoal do próprio usuário ou grupo familiar informado), lançando `ForbiddenException` ou `NotFoundException`, e atualizar os testes unitários.  
**Where**: `backend/src/modules/transactions/transactions.service.ts`  
**Depends on**: T2  
**Reuses**: `backend/src/modules/transactions/transactions.service.ts`  
**Requirement**: CRIT-06, CRIT-08  

**Tools**:

- Code editor
- Bash terminal

**Done when**:

- [ ] Lançamento com categoria inexistente ou soft-deleted lança `NotFoundException` ('Categoria informada não encontrada').
- [ ] Lançamento associado a categoria de outro usuário/família lança `ForbiddenException` ('Acesso negado à categoria informada').
- [ ] Lançamento com categoria padrão ou autorizada é persistido normalmente.
- [ ] Testes unitários em `transactions.service.spec.ts` cobrindo proteção BOLA em categorias passam.
- [ ] Gate check passes: `npm --prefix backend test -- test/unit/transactions.service.spec.ts`

**Tests**: unit  
**Gate**: quick  

---

### T4: Prevenção de BOLA/IDOR em Categorias em Orçamentos (SEC-CRIT-03 parte 2)

**What**: Atualizar `create` em `BudgetsService` para validar que `dto.categoryId` existe, não está soft-deleted, e pertence ao escopo autorizado (categoria padrão do sistema `isSystemDefault`, categoria pessoal do usuário ou grupo familiar informado), lançando `ForbiddenException` ou `NotFoundException`, e atualizar a suíte de testes unitários.  
**Where**: `backend/src/modules/budgets/budgets.service.ts`  
**Depends on**: T3  
**Reuses**: `backend/src/modules/budgets/budgets.service.ts`  
**Requirement**: CRIT-07, CRIT-08  

**Tools**:

- Code editor
- Bash terminal

**Done when**:

- [ ] Criação de orçamento com categoria inexistente ou soft-deleted lança `NotFoundException` ('Categoria informada não encontrada').
- [ ] Criação de orçamento associado a categoria de outro usuário/família lança `ForbiddenException` ('Acesso negado à categoria informada').
- [ ] Criação de orçamento com categoria autorizada ou padrão funciona com sucesso.
- [ ] Testes unitários em `budgets.service.spec.ts` cobrindo proteção BOLA em categorias passam.
- [ ] Gate check passes: `npm --prefix backend test -- test/unit/budgets.service.spec.ts`

**Tests**: unit  
**Gate**: quick  
