# Correção de Vulnerabilidades Críticas de Segurança Validation

**Date**: 2026-10-02  
**Spec**: `.specs/features/correcao-criticas-auditoria/spec.md`  
**Diff range**: `feature/correcao-criticas-auditoria`  
**Verifier**: independent verification pass (author ≠ verifier)  

---

## Task Completion

| Task | Status | Notes |
| ---- | ------ | ----- |
| T1: Correção de Race Condition no Resgate de Metas (SEC-CRIT-01) | ✅ Done | Validação de saldo movida para transação e decremento atômico `{ decrement: withdrawAmount }` |
| T2: Bloqueio de Transferência sem Saldo Disponível (SEC-CRIT-02) | ✅ Done | Rejeição com HTTP 400 `BadRequestException` se `source.currentBalance < amount` |
| T3: Prevenção de BOLA em Categorias em Lançamentos (SEC-CRIT-03) | ✅ Done | Validação de existência e autorização (`isSystemDefault`, `userId` ou `familyId`) no `TransactionsService.create` |
| T4: Prevenção de BOLA em Categorias em Orçamentos (SEC-CRIT-03) | ✅ Done | Validação de existência e autorização de `categoryId` no `BudgetsService.create` |

---

## Spec-Anchored Acceptance Criteria

| Criterion (WHEN X THEN Y) | Spec-defined outcome | `file:line` + assertion | Result |
| ------------------------- | -------------------- | ----------------------- | ------ |
| WHEN resgate solicitado THEN consulta e validação dentro de `$transaction` (CRIT-01) | Leitura e validação atômica no banco | `backend/src/modules/goals/goals.service.ts:262-281` | ✅ PASS |
| IF resgate > saldo da meta THEN lança BadRequestException (CRIT-02) | HTTP 400 com mensagem de saldo insuficiente | `backend/test/unit/goals.service.spec.ts:489` - `expect(...).rejects.toThrow(BadRequestException)` | ✅ PASS |
| WHEN resgate processado THEN decremento atômico `{ currentAmount: { decrement } }` (CRIT-03) | Decremento atômico sem race condition | `backend/test/unit/goals.service.spec.ts:420` - `expect(prisma.goal.update).toHaveBeenCalledWith(..., { currentAmount: { decrement: ... } })` | ✅ PASS |
| IF conta de origem não possui saldo suficiente THEN rejeita transferência (CRIT-04, CRIT-05) | HTTP 400 BadRequestException e saldos intocados | `backend/test/unit/transactions.service.spec.ts:161` - `expect(...).rejects.toThrow(BadRequestException)` | ✅ PASS |
| IF `categoryId` inexistente ou soft-deleted THEN lança NotFoundException (CRIT-06) | HTTP 404 Categoria informada não encontrada | `backend/test/unit/transactions.service.spec.ts:1008` e `backend/test/unit/budgets.service.spec.ts:89` | ✅ PASS |
| IF `categoryId` não autorizado THEN lança ForbiddenException (CRIT-07) | HTTP 403 Acesso negado à categoria informada | `backend/test/unit/transactions.service.spec.ts:1048` e `backend/test/unit/budgets.service.spec.ts:125` | ✅ PASS |
| WHEN `categoryId` válido THEN associa categoria com sucesso (CRIT-08) | Criação de transação e orçamento persistidos | `backend/test/unit/transactions.service.spec.ts:1099` e `backend/test/unit/budgets.service.spec.ts:173` | ✅ PASS |

**Status**: ✅ All ACs covered

---

## Discrimination Sensor

| Mutation | File:line | Description | Killed? |
| -------- | --------- | ----------- | ------- |
| 1 | `backend/src/modules/transactions/transactions.service.ts:336` | Inverter verificação de saldo para `gt` em vez de `lt` | ✅ Killed (teste de transferência legítima falha) |
| 2 | `backend/src/modules/budgets/budgets.service.ts:28` | Comentar verificação `if (!category \|\| category.deletedAt)` | ✅ Killed (teste de categoria inexistente/deletada falha) |

**Sensor depth**: lightweight  
**Result**: 2/2 mutations killed - PASS  

---

## Code Quality

| Principle | Status |
| --------- | ------ |
| Minimum code | ✅ PASS |
| Surgical changes | ✅ PASS |
| No scope creep | ✅ PASS |
| Matches patterns | ✅ PASS |
| Spec-anchored outcome check (asserted values match spec) | ✅ PASS |
| Per-layer Coverage Expectation met | ✅ PASS |
| Every test maps to a spec requirement | ✅ PASS |
| Documented guidelines followed | ✅ PASS |

---

## Gate Check

- **Gate commands**:
  - `npm --prefix backend test` (Suíte completa de testes unitários e de integração)
  - `npm --prefix backend run build` (Compilação limpa do NestJS e script seed)
- **Result**: 25 test suites passed, 233 tests passed, 0 failed, 0 skipped
- **Test count before feature**: 220
- **Test count after feature**: 233
- **Delta**: +13 new tests
- **Skipped tests**: none
- **Failures**: none

---

## Summary

**Overall**: ✅ PASS

**Spec-anchored check**: 8/8 ACs matched spec outcome  
**Sensor**: 2/2 mutations killed  
**Gate**: PASS (todos os 233 testes e build concluídos com sucesso)  
