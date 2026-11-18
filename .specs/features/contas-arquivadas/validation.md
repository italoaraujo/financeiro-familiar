# Visualização e Desarquivamento de Contas Validation - PASS

**Date**: 2026-11-17
**Spec**: `.specs/features/contas-arquivadas/spec.md`
**Diff range**: `fe1af45..521803a`
**Verifier**: independent sub-agent (author ≠ verifier)

---

## Task Completion

| Task | Status | Notes |
| ---- | ------ | ----- |
| T1 | ✅ Done | `AccountsService.findAll` estendido com `includeArchived` e `AccountsService.unarchive` implementado (`ff840f6`) |
| T2 | ✅ Done | 11 novos testes unitários adicionados em `accounts.service.spec.ts` (`22821a8`) |
| T3 | ✅ Done | Query `includeArchived` em `GET /accounts` e rota `PATCH /accounts/:id/unarchive` expostos em `AccountsController` (`4dac5cf`) |
| T4 | ✅ Done | Abas `Ativas`/`Arquivadas` com contadores, saldo restrito às ativas e botão `Desarquivar conta` implementados em `frontend/src/app/accounts/page.tsx` (`521803a`) |

---

## Spec-Anchored Acceptance Criteria

### P1: Listagem de Contas Arquivadas e Desarquivamento no Backend

| Criterion (WHEN X THEN Y) | Spec-defined outcome | `file:line` + assertion / implementation | Result |
| ------------------------- | -------------------- | ---------------------------------------- | ------ |
| P1.1: `GET /accounts` sem `includeArchived` ou com valor diferente de `'true'` retorna apenas ativas | `includeArchived === 'true'` falso -> `where` inclui `isArchived: false` e `deletedAt: null` no escopo pessoal ou familiar | `backend/src/modules/accounts/accounts.controller.ts:34-49` (`includeArchived === 'true'`); `backend/src/modules/accounts/accounts.service.ts:38-62`; `backend/test/unit/accounts.service.spec.ts:163-202` (`expect(result).toEqual(activeAccounts)`, `expect(prisma.account.findMany).toHaveBeenCalledWith({ where: { userId: 'user-1', familyId: null, isArchived: false, deletedAt: null }, orderBy: { createdAt: 'desc' } })` em `:169-178`; `expect(prisma.account.findMany).toHaveBeenCalledWith({ where: { familyId: 'family-1', isArchived: false, deletedAt: null }, orderBy: { createdAt: 'desc' } })` em `:194-201`) | ✅ PASS |
| P1.2: `GET /accounts?includeArchived=true` retorna todas as não excluídas | `where` omite filtro `isArchived` e mantém `deletedAt: null` no escopo pessoal ou familiar | `backend/src/modules/accounts/accounts.controller.ts:43-49`; `backend/src/modules/accounts/accounts.service.ts:38-62`; `backend/test/unit/accounts.service.spec.ts:204-247` (`expect(result).toEqual(allAccounts)` e `where: { userId: 'user-1', familyId: null, deletedAt: null }` em `:213-221`; `expect(result).toEqual(allFamilyAccounts)` e `where: { familyId: 'family-1', deletedAt: null }` em `:239-246`) | ✅ PASS |
| P1.3: `PATCH /accounts/:id/unarchive` para conta arquivada atualiza para `isArchived: false` e `isActive: true` | Atualiza registro com `{ isArchived: false, isActive: true }` | `backend/src/modules/accounts/accounts.controller.ts:79-87`; `backend/src/modules/accounts/accounts.service.ts:118-133`; `backend/test/unit/accounts.service.spec.ts:297-345` (`expect(result.isArchived).toBe(false)`, `expect(result.isActive).toBe(true)`, `expect(prisma.account.update).toHaveBeenCalledWith({ where: { id: 'acc-1' }, data: { isArchived: false, isActive: true } })` em `:311-317`; escopo familiar `MEMBER` em `:340-344`) | ✅ PASS |
| P1.4: `PATCH /accounts/:id/unarchive` em conta já ativa (`isArchived: false`) retorna HTTP 400 | Lança `BadRequestException` sem chamar `prisma.account.update` | `backend/src/modules/accounts/accounts.service.ts:125-127`; `backend/test/unit/accounts.service.spec.ts:347-361` (`await expect(service.unarchive('user-1', 'acc-1')).rejects.toThrow(new BadRequestException('A conta não está arquivada'))` em `:357-359` e `expect(prisma.account.update).not.toHaveBeenCalled()` em `:360`) | ✅ PASS |
| P1.5: Conta inexistente ou com `deletedAt` preenchido retorna HTTP 404 | `findById` lança `NotFoundException` | `backend/src/modules/accounts/accounts.service.ts:69-71,119`; `backend/test/unit/accounts.service.spec.ts:363-379` (`await expect(service.unarchive('user-1', 'acc-missing')).rejects.toThrow(NotFoundException)` em `:365-367`, `await expect(service.unarchive('user-1', 'acc-deleted')).rejects.toThrow(NotFoundException)` em `:375-377`, `expect(prisma.account.update).not.toHaveBeenCalled()` em `:378`) | ✅ PASS |
| P1.6: Usuário `VIEWER` na família ou fora do escopo da conta recebe HTTP 403 ao arquivar ou desarquivar | `verifyFamilyAccess(..., true)` / `findById` lançam `ForbiddenException` sem atualizar conta | `backend/src/modules/accounts/accounts.service.ts:73-77,106-110,119-123,170-178`; `backend/test/unit/accounts.service.spec.ts:272-293,381-414` (`archive` por `VIEWER`: `:287-292`; `unarchive` por `VIEWER`: `:396-400`; `unarchive` por invasor em conta pessoal: `:410-413`, todos com `expect(prisma.account.update).not.toHaveBeenCalled()`) | ✅ PASS |

### P2: Abas de Contas Ativas/Arquivadas e Ação de Desarquivar no Frontend

> Nota de camada: `tasks.md` definiu `Tests: none` para Frontend Page (`frontend/package.json:11` possui apenas placeholder em `scripts.test`); evidências abaixo referenciam a implementação verificada estaticamente e validada via `npm run lint` + `npm run build`.

| Criterion (WHEN X THEN Y) | Spec-defined outcome | `file:line` + implementation | Result |
| ------------------------- | -------------------- | ---------------------------- | ------ |
| P2.1: Tela `/accounts` exibe abas "Ativas" e "Arquivadas" com contadores | Carrega `/accounts` com `includeArchived: 'true'` e exibe abas com `activeAccounts.length` e `archivedAccounts.length` | `frontend/src/app/accounts/page.tsx:25-39,125-127,169-208` (busca `includeArchived: 'true'` em `:28-32`, aba `Ativas` + `{activeAccounts.length}` em `:171-188`, aba `Arquivadas` + `{archivedAccounts.length}` em `:190-207`) | ✅ PASS |
| P2.2: Card "Saldo Total Consolidado" soma apenas contas ativas (`isArchived: false`) em ambas as abas | `totalBalance` calculado exclusivamente sobre `activeAccounts` | `frontend/src/app/accounts/page.tsx:125,128,154-167` (`activeAccounts.reduce((acc, a) => acc + Number(a.currentBalance || 0), 0)` em `:128` e exibição em `:160-165` independente de `activeTab`) | ✅ PASS |
| P2.3: Aba "Arquivadas" lista apenas contas com `isArchived: true`, selo "Arquivada", e para não-`VIEWER` botões "Desarquivar conta" (`ArchiveRestore`) e "Excluir conta" | `displayedAccounts` filtra `archivedAccounts` na aba `archived`; exibe badge `Arquivada` e ações condicionais a `!isViewer` | `frontend/src/app/accounts/page.tsx:126-127,221-275` (`displayedAccounts` em `:127`, selo `Arquivada` em `:238-242`, `{!isViewer && ...}` com `<ArchiveRestore />` `title="Desarquivar conta"` em `:250-257` e `<Trash2 />` `title="Excluir conta"` em `:267-273`) | ✅ PASS |
| P2.4: Confirmar desarquivamento envia `PATCH /accounts/:id/unarchive` e recarrega listagem atualizando contadores e saldo | `handleUnarchive` confirma, envia `PATCH /accounts/${id}/unarchive` e chama `loadAccounts()` | `frontend/src/app/accounts/page.tsx:86-96` (`confirm(...)` em `:87`, `apiRequest(\`/accounts/${id}/unarchive\`, { method: 'PATCH' })` em `:91`, `loadAccounts()` em `:92`) | ✅ PASS |

**Status**: ✅ All ACs covered (10/10 ACs com implementação e evidências alinhadas; 0 gaps)

---

## Discrimination Sensor

| Mutation | File:line | Description | Killed? |
| -------- | --------- | ----------- | ------- |
| 1 | `backend/src/modules/accounts/accounts.service.ts:39` | Ignorado `includeArchived` em `findAll` (`const archiveFilter = { isArchived: false };`), mantendo `isArchived: false` mesmo com `includeArchived = true` | ✅ Killed (`accounts.service.spec.ts` falhou 2/18 em `backend/test/unit/accounts.service.spec.ts:214` e `:240`) |
| 2 | `backend/src/modules/accounts/accounts.service.ts:125` | Desabilitada guarda `if (!account.isArchived)` → `if (false && !account.isArchived)` em `unarchive` | ✅ Killed (`accounts.service.spec.ts` falhou 1/18 em `backend/test/unit/accounts.service.spec.ts:357` — promise resolveu em vez de lançar `BadRequestException`) |
| 3 | `backend/src/modules/accounts/accounts.service.ts:131` | Invertido `isActive: true` → `isActive: false` no `prisma.account.update` de `unarchive` | ✅ Killed (`accounts.service.spec.ts` falhou 2/18 em `backend/test/unit/accounts.service.spec.ts:314` e `:341`) |

**Sensor depth**: lightweight
**Result**: 3/3 killed - PASS

> Isolamento verificado: backup em `/tmp/accounts.service.ts.bak` restaurado e removido; `git status --porcelain` pós-sensor idêntico ao baseline (zero modificações em arquivos de código ou teste).

---

## Code Quality

| Principle | Status |
| --------- | ------ |
| Minimum code | ✅ |
| Surgical changes | ✅ |
| No scope creep | ✅ |
| Matches patterns | ✅ |
| Spec-anchored outcome check (asserted values match spec) | ✅ |
| Per-layer Coverage Expectation met (domain 1:1 ACs; controller wiring; frontend lint/build) | ✅ |
| Every test maps to a spec requirement - no unclaimed tests | ✅ |
| Documented guidelines followed: none - strong defaults applied | ✅ |

---

## Edge Cases

- [x] Aba "Ativas" ou "Arquivadas" sem contas exibe mensagem contextual (`frontend/src/app/accounts/page.tsx:214-219`)
- [x] Usuário `VIEWER` na família visualiza aba "Arquivadas" sem botões de arquivar, desarquivar ou excluir (`backend/src/modules/accounts/accounts.service.ts:42`, `backend/test/unit/accounts.service.spec.ts:224-247`, `frontend/src/app/accounts/page.tsx:142-150,190-207,248-275`)
- [x] Falha em `PATCH /accounts/:id/unarchive` no frontend exibe `alert` com mensagem de erro sem corromper o estado da listagem (`frontend/src/app/accounts/page.tsx:90-95`)

---

## Gate Check

- **Gate command**: `export PATH=/home/italo/.nvm/versions/node/v24.18.0/bin:$PATH && cd /opt/projetos/financeiro-familiar/backend && npm run build && npx jest test/unit/accounts.service.spec.ts && cd ../frontend && npm run lint && npm run build`
- **Result**: 18 passed, 0 failed, 0 skipped (1/1 Jest suite; backend build exit 0; frontend lint 0 errors / 28 pre-existing warnings, 0 new warnings; frontend build exit 0)
- **Test count before feature**: 7 (`accounts.service.spec.ts` em `fe1af45`)
- **Test count after feature**: 18 (`accounts.service.spec.ts` em `521803a`)
- **Delta**: +11 novos testes unitários em `backend/test/unit/accounts.service.spec.ts`
- **Skipped tests**: none
- **Failures**: none

---

## Requirement Traceability Update

| Requirement | Previous Status | New Status |
| ----------- | --------------- | ---------- |
| ARCHACC-01 | Implementing | ✅ Verified |
| ARCHACC-02 | Implementing | ✅ Verified |
| ARCHACC-03 | Implementing | ✅ Verified |
| ARCHACC-04 | Implementing | ✅ Verified |
| ARCHACC-05 | Implementing | ✅ Verified |
| ARCHACC-06 | Implementing | ✅ Verified |
| ARCHACC-07 | Implementing | ✅ Verified |

---

## Summary

**Overall**: ✅ Ready

**Spec-anchored check**: 10/10 ACs matched spec outcome (P1: 6/6, P2: 4/4 com evidência estática + lint/build conforme `Tests: none` em `tasks.md`); 0 spec-precision gaps
**Sensor**: 3/3 mutations killed (Mutant 1 killed em `accounts.service.spec.ts:214,240`; Mutant 2 killed em `accounts.service.spec.ts:357`; Mutant 3 killed em `accounts.service.spec.ts:314,341`)
**Gate**: 18 passed, 0 failed, 0 skipped (backend build, Jest `accounts.service.spec.ts`, frontend lint e frontend build com exit code 0)

**What works**:
- `GET /accounts` mantém retorno exclusivo de contas ativas por padrão e inclui arquivadas apenas quando `includeArchived=true`, sem afetar seletores em Transações, Cartões e Metas.
- `PATCH /accounts/:id/unarchive` restaura conta arquivada (`isArchived: false`, `isActive: true`), rejeita conta já ativa com `BadRequestException` (400), conta inexistente/deletada com `NotFoundException` (404) e `VIEWER` ou usuário não autorizado com `ForbiddenException` (403).
- Tela `/accounts` exibe abas `Ativas` e `Arquivadas` com contadores, mantém `Saldo Total Consolidado` restrito às contas ativas, exibe selo `Arquivada` e permite desarquivar para não-`VIEWER`.

**Issues found**: none

**Next steps**: Feature aprovada para atualização de rastreabilidade (`Verified`) e conclusão.
