# Correção de Vulnerabilidades Críticas de Segurança Tasks

## Execution Protocol (MANDATORY -- do not skip)

Implement these tasks with the `tlc-spec-driven` skill: **activate it by name and follow its Execute flow and Critical Rules.** Do not search for skill files by filesystem path. The skill is the source of truth for the full flow (per-task cycle, sub-agent delegation, adequacy review, Verifier, discrimination sensor).

**If the skill cannot be activated, STOP and tell the user - do not proceed without it.**

---

**Spec**: `.specs/features/auditoria-seguranca/spec.md`
**Status**: Ready

---

## Test Coverage Matrix

> Generated from codebase, project guidelines, and spec - confirm before Execute. Guidelines found: `backend/package.json`, `jest.config`.

| Code Layer | Required Test Type | Coverage Expectation | Location Pattern | Run Command |
| ---------- | ------------------ | -------------------- | ---------------- | ----------- |
| Services (CreditCards) | unit | Validação de BOLA/IDOR em fatura e conta de pagamento | `backend/test/unit/credit-cards.service.spec.ts` | `npm --prefix backend test -- test/unit/credit-cards.service.spec.ts` |
| Services (Goals) | unit | Validação de BOLA/IDOR em conta de aporte de meta | `backend/test/unit/goals.service.spec.ts` | `npm --prefix backend test -- test/unit/goals.service.spec.ts` |
| Auth & Security | unit | Validação de obrigatoriedade e entropia de JWT_SECRET | `backend/test/unit/auth-security.spec.ts` | `npm --prefix backend test -- test/unit/auth-security.spec.ts` |

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

### Phase 1: Correção de Falhas Críticas de Segurança

Implementação de verificações de autorização rigorosas e remoção de segredos inseguros.

```
T1 → T2 → T3
```

---

## Task Breakdown

### T1: Correção de BOLA/IDOR em Pagamento de Faturas de Cartão

**What**: Atualizar `payInvoice` em `CreditCardsService` para verificar rigorosamente a propriedade do cartão da fatura (bloqueando cartões pessoais de terceiros com `ForbiddenException`) e a propriedade da conta bancária de débito (bloqueando contas não autorizadas com `ForbiddenException` ou inexistentes/soft-deleted com `NotFoundException`), atualizando a suíte de testes unitários.
**Where**: `backend/src/modules/credit-cards/credit-cards.service.ts`
**Depends on**: None
**Reuses**: `backend/src/modules/credit-cards/credit-cards.service.ts`
**Requirement**: SEC-01, SEC-02, SEC-03, SEC-04

**Tools**:

- Code editor
- Bash terminal

**Done when**:

- [x] Tentativas de pagamento de fatura pessoal de outro usuário lançam `ForbiddenException` ('Acesso negado à fatura informada').
- [x] Tentativas de débito em conta de terceiros não autorizada lançam `ForbiddenException` ('Você não tem permissão para debitar desta conta bancária').
- [x] Contas bancárias com soft-delete ou inexistentes lançam `NotFoundException`.
- [x] Testes unitários cobrindo todos os cenários de autorização e sucesso passam.
- [x] Gate check passes: `npm --prefix backend test -- test/unit/credit-cards.service.spec.ts`

**Tests**: unit
**Gate**: quick

---

### T2: Correção de BOLA/IDOR em Aporte de Metas Financeiras

**What**: Atualizar `addDeposit` em `GoalsService` para verificar a propriedade e contexto familiar da conta bancária de débito (`targetAccountId`), bloqueando contas de terceiros não autorizadas com `ForbiddenException` e contas soft-deleted/inexistentes com `NotFoundException`, atualizando a suíte de testes unitários.
**Where**: `backend/src/modules/goals/goals.service.ts`
**Depends on**: T1
**Reuses**: `backend/src/modules/goals/goals.service.ts`
**Requirement**: SEC-05, SEC-06, SEC-07

**Tools**:

- Code editor
- Bash terminal

**Done when**:

- [ ] Aporte em meta usando conta de outro usuário sem acesso familiar lança `ForbiddenException` ('Acesso negado à conta bancária de débito selecionada').
- [ ] Aporte com conta inexistente ou soft-deleted lança `NotFoundException` ('Conta bancária de débito não encontrada').
- [ ] Aportes legítimos com contas próprias ou autorizadas na família continuam funcionando normalmente.
- [ ] Testes unitários cobrindo autorização e fluxos de aporte passam.
- [ ] Gate check passes: `npm --prefix backend test -- test/unit/goals.service.spec.ts`

**Tests**: unit
**Gate**: quick

---

### T3: Proteção Estrita e Eliminação de Fallbacks Hardcoded de JWT

**What**: Implementar validação estrita de `JWT_SECRET` (mínimo 32 caracteres seguros, rejeitando chaves vazias ou com padrão 'supersecret') em `AuthModule` e `JwtStrategy`, remover referências e fallbacks padrão no `docker-compose.yml`, `.env` e `.env.example`, criando testes dedicados de segurança.
**Where**: `backend/src/modules/auth/auth.module.ts`
**Depends on**: T2
**Reuses**: `backend/src/modules/auth/auth.module.ts`
**Requirement**: SEC-08, SEC-09, SEC-10

**Tools**:

- Code editor
- Bash terminal

**Done when**:

- [ ] `AuthModule` e `JwtStrategy` recusam iniciar se `JWT_SECRET` for indefinido, menor que 32 caracteres ou contiver 'supersecret'.
- [ ] Fallback hardcoded `supersecretjwtkey1234567890` é totalmente eliminado de código e configurações.
- [ ] Testes automatizados validam a recusa fatal para chaves fracas e a aceitação de chaves com entropia suficiente.
- [ ] Gate check passes: `npm --prefix backend test` e `npm --prefix backend run build`

**Tests**: unit
**Gate**: quick
