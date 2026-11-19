# Arquivamento e Desarquivamento de Cartões de Crédito Validation - PASS

**Date**: 2026-11-18
**Spec**: `.specs/features/cartoes-arquivados/spec.md`
**Diff range**: `b8f1a91..5e00926`
**Verifier**: independent sub-agent (author ≠ verifier)

---

## Task Completion

| Task | Status | Notes |
| ---- | ------ | ----- |
| T1 | ✅ Done | `CreditCardsService.findAll` estendido com `includeArchived` e métodos `archive`/`unarchive` implementados (`e2606ed`) |
| T2 | ✅ Done | 18 novos testes unitários adicionados em `credit-cards.service.spec.ts` (`d9ae411`) |
| T3 | ✅ Done | Query `includeArchived` em `GET /credit-cards` e rotas `PATCH /credit-cards/:id/archive` e `PATCH /credit-cards/:id/unarchive` expostos em `CreditCardsController` (`96aec58`) |
| T4 | ✅ Done | Checkbox `"Cartão Ativo (exibir no painel)"` e `editIsActive` removidos; abas `Ativos`/`Arquivados` com contadores, selo `Arquivado` e botões `Archive`/`ArchiveRestore` implementados em `frontend/src/app/cards/page.tsx` (`5e00926`) |

---

## Spec-Anchored Acceptance Criteria

### P1: Listagem de Cartões Arquivados, Arquivamento e Desarquivamento no Backend

| Criterion (WHEN X THEN Y) | Spec-defined outcome | `file:line` + assertion / implementation | Result |
| ------------------------- | -------------------- | ---------------------------------------- | ------ |
| P1.1: `GET /credit-cards` sem `includeArchived` ou com valor diferente de `'true'` retorna apenas cartões ativos | `includeArchived === 'true'` falso -> `where` inclui `isActive: true` e `deletedAt: null` no escopo pessoal ou familiar | `backend/src/modules/credit-cards/credit-cards.controller.ts:35-50` (`includeArchived === 'true'`); `backend/src/modules/credit-cards/credit-cards.service.ts:49-69`; `backend/test/unit/credit-cards.service.spec.ts:575-585,983-1050` (`where: { userId: 'user-1', familyId: null, isActive: true, deletedAt: null }` em `:999-1012`; `where: { familyId: 'family-1', isActive: true, deletedAt: null }` em `:1037-1049`) | ✅ PASS |
| P1.2: `GET /credit-cards?includeArchived=true` retorna todos os cartões não excluídos | `where` omite `isActive` e mantém `deletedAt: null` no escopo pessoal ou familiar | `backend/src/modules/credit-cards/credit-cards.controller.ts:44-50`; `backend/src/modules/credit-cards/credit-cards.service.ts:49-69`; `backend/test/unit/credit-cards.service.spec.ts:1052-1131` (`expect(result).toHaveLength(2)`, `expect(result.map((c) => c.id)).toEqual(['card-1', 'card-2'])`, `where: { userId: 'user-1', familyId: null, deletedAt: null }` em `:1073-1087`; escopo familiar `VIEWER` com `where: { familyId: 'family-1', deletedAt: null }` em `:1117-1130`) | ✅ PASS |
| P1.3: `PATCH /credit-cards/:id/archive` em cartão ativo (`isActive: true`) atualiza para `isActive: false` | Atualiza registro com `{ isActive: false }` | `backend/src/modules/credit-cards/credit-cards.controller.ts:91-99`; `backend/src/modules/credit-cards/credit-cards.service.ts:200-215`; `backend/test/unit/credit-cards.service.spec.ts:1135-1184` (`expect(result.isActive).toBe(false)` e `expect(prisma.creditCard.update).toHaveBeenCalledWith({ where: { id: 'card-1' }, data: { isActive: false } })` em `:1150-1155`; escopo familiar `MEMBER` em `:1179-1183`) | ✅ PASS |
| P1.4: `PATCH /credit-cards/:id/archive` em cartão já arquivado (`isActive: false`) retorna HTTP 400 | Lança `BadRequestException` sem chamar `prisma.creditCard.update` | `backend/src/modules/credit-cards/credit-cards.service.ts:207-209`; `backend/test/unit/credit-cards.service.spec.ts:1186-1201` (`await expect(service.archive('user-1', 'card-1')).rejects.toThrow(new BadRequestException('O cartão de crédito já está arquivado'))` em `:1197-1199` e `expect(prisma.creditCard.update).not.toHaveBeenCalled()` em `:1200`) | ✅ PASS |
| P1.5: `PATCH /credit-cards/:id/unarchive` em cartão arquivado (`isActive: false`) atualiza para `isActive: true` | Atualiza registro com `{ isActive: true }` | `backend/src/modules/credit-cards/credit-cards.controller.ts:101-109`; `backend/src/modules/credit-cards/credit-cards.service.ts:217-232`; `backend/test/unit/credit-cards.service.spec.ts:1268-1317` (`expect(result.isActive).toBe(true)` e `expect(prisma.creditCard.update).toHaveBeenCalledWith({ where: { id: 'card-1' }, data: { isActive: true } })` em `:1283-1288`; escopo familiar `MEMBER` em `:1312-1316`) | ✅ PASS |
| P1.6: `PATCH /credit-cards/:id/unarchive` em cartão já ativo (`isActive: true`) retorna HTTP 400 | Lança `BadRequestException` sem chamar `prisma.creditCard.update` | `backend/src/modules/credit-cards/credit-cards.service.ts:224-226`; `backend/test/unit/credit-cards.service.spec.ts:1319-1334` (`await expect(service.unarchive('user-1', 'card-1')).rejects.toThrow(new BadRequestException('O cartão de crédito não está arquivado'))` em `:1330-1332` e `expect(prisma.creditCard.update).not.toHaveBeenCalled()` em `:1333`) | ✅ PASS |
| P1.7: Cartão inexistente ou com `deletedAt` preenchido retorna HTTP 404 | `findById` lança `NotFoundException` sem atualizar | `backend/src/modules/credit-cards/credit-cards.service.ts:100-102,201,218`; `backend/test/unit/credit-cards.service.spec.ts:1203-1222,1336-1355` (`archive` inexistente/deletado em `:1206-1207,1220-1221`; `unarchive` inexistente/deletado em `:1339-1340,1353-1354`, todos com `expect(prisma.creditCard.update).not.toHaveBeenCalled()`) | ✅ PASS |
| P1.8: Usuário `VIEWER` na família ou fora do escopo do cartão recebe HTTP 403 ao arquivar ou desarquivar | `findById` / `verifyFamilyAccess(..., true)` lançam `ForbiddenException` sem atualizar cartão | `backend/src/modules/credit-cards/credit-cards.service.ts:104-108,201-205,218-222,542-560`; `backend/test/unit/credit-cards.service.spec.ts:1224-1264,1357-1397` (`archive` por `VIEWER` em `:1241-1246` e invasor pessoal em `:1260-1263`; `unarchive` por `VIEWER` em `:1374-1379` e invasor pessoal em `:1393-1396`, todos com `expect(prisma.creditCard.update).not.toHaveBeenCalled()`) | ✅ PASS |

### P2: Abas Ativos/Arquivados, Ícones de Arquivar/Desarquivar e Remoção do Checkbox no Modal em `/cards`

> Nota de camada: `tasks.md` definiu `Tests: none` para Frontend Page (`frontend/package.json:11` possui apenas placeholder em `scripts.test`); evidências abaixo referenciam a implementação verificada estaticamente e validada via `npm run lint` + `npm run build`.

| Criterion (WHEN X THEN Y) | Spec-defined outcome | `file:line` + implementation | Result |
| ------------------------- | -------------------- | ---------------------------- | ------ |
| P2.1: Modal de edição em `/cards` exibido sem o checkbox `"Cartão Ativo (exibir no painel)"` | Sem checkbox, sem estado `editIsActive` e sem `isActive` no payload de atualização | `frontend/src/app/cards/page.tsx:80-87,151-178,656-757` (nenhuma ocorrência de `"Cartão Ativo"` ou `editIsActive`; `PUT /credit-cards/${editingCard.id}` envia apenas `name`, `brand`, `creditLimit`, `closingDay`, `dueDay` e `color` em `:168-178`) | ✅ PASS |
| P2.2: Tela `/cards` exibe abas "Ativos" e "Arquivados" com contadores | Busca `/credit-cards` com `includeArchived: 'true'` e exibe abas com `activeCards.length` e `archivedCards.length` | `frontend/src/app/cards/page.tsx:60,98-103,277-279,305-343` (`includeArchived: 'true'` em `:101`, aba `Ativos` + `{activeCards.length}` em `:315-322`, aba `Arquivados` + `{archivedCards.length}` em `:334-341`) | ✅ PASS |
| P2.3: Cartão ativo na aba "Ativos" para usuário não-`VIEWER` exibe ícone "Arquivar cartão" (`Archive`) ao lado do botão de editar | Renderiza `<Archive />` com `title="Arquivar cartão"` ao lado de `<Pencil />` sob `{!isViewer && ...}` | `frontend/src/app/cards/page.tsx:397-427` (`{!isViewer && ...}`, botão `<Archive />` `title="Arquivar cartão"` / `aria-label="Arquivar cartão"` em `:408-417` seguido de `<Pencil />` `title="Editar Cartão"` em `:418-425`) | ✅ PASS |
| P2.4: Aba "Arquivados" lista apenas `isActive: false` com selo `Arquivado` e, para não-`VIEWER`, botões "Desarquivar cartão" (`ArchiveRestore`) e editar | `displayedCards` usa `archivedCards`; exibe selo `Arquivado` e ações `<ArchiveRestore />` + `<Pencil />` sob `!isViewer` | `frontend/src/app/cards/page.tsx:277-279,382-386,397-427` (`archivedCards` em `:278`, selo `Arquivado` em `:382-386`, `<ArchiveRestore />` `title="Desarquivar cartão"` em `:399-407` e `<Pencil />` em `:418-425`) | ✅ PASS |
| P2.5: Confirmar arquivamento ou desarquivamento envia `PATCH /credit-cards/:id/archive` ou `/unarchive` e recarrega listagem e contadores | `handleArchiveCard` e `handleUnarchiveCard` confirmam, enviam `PATCH` e chamam `loadData()` | `frontend/src/app/cards/page.tsx:207-229` (`confirm(...)` em `:208`, `apiRequest(\`/credit-cards/${cardId}/archive\`, { method: 'PATCH' })` em `:212`, `loadData()` em `:213`; `confirm(...)` em `:220`, `apiRequest(\`/credit-cards/${cardId}/unarchive\`, { method: 'PATCH' })` em `:224`, `loadData()` em `:225`) | ✅ PASS |

**Status**: ✅ All ACs covered (13/13 ACs com implementação e evidências alinhadas; 0 gaps)

---

## Discrimination Sensor

| Mutation | File:line | Description | Killed? |
| -------- | --------- | ----------- | ------- |
| 1 | `backend/src/modules/credit-cards/credit-cards.service.ts:57` | Ignorado `includeArchived` em `findAll` (`const activeFilter = { isActive: true };`), mantendo `isActive: true` mesmo com `includeArchived = true` | ✅ Killed (`credit-cards.service.spec.ts` falhou 2/56 em `backend/test/unit/credit-cards.service.spec.ts:1075` e `:1119`) |
| 2 | `backend/src/modules/credit-cards/credit-cards.service.ts:207` | Desabilitada guarda `if (!card.isActive)` → `if (false && !card.isActive)` em `archive` | ✅ Killed (`credit-cards.service.spec.ts` falhou 1/56 em `backend/test/unit/credit-cards.service.spec.ts:1197` — promise resolveu em vez de lançar `BadRequestException`) |
| 3 | `backend/src/modules/credit-cards/credit-cards.service.ts:230` | Invertido `isActive: true` → `isActive: false` no `prisma.creditCard.update` de `unarchive` | ✅ Killed (`credit-cards.service.spec.ts` falhou 2/56 em `backend/test/unit/credit-cards.service.spec.ts:1285` e `:1313`) |

**Sensor depth**: lightweight
**Result**: 3/3 killed - PASS

> Isolamento verificado: backup em `/tmp/credit-cards.service.ts.bak` restaurado e removido; `git status --porcelain` pós-sensor idêntico ao baseline (zero modificações em arquivos de código ou teste).

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

- [x] Aba "Ativos" ou "Arquivados" sem cartões exibe mensagem contextual (`frontend/src/app/cards/page.tsx:349-354`)
- [x] Usuário `VIEWER` na família alterna entre as abas "Ativos" e "Arquivados" sem exibir botões de criar, editar, arquivar, desarquivar ou pagar (`backend/src/modules/credit-cards/credit-cards.service.ts:50-52`, `backend/test/unit/credit-cards.service.spec.ts:1090-1131`, `frontend/src/app/cards/page.tsx:293-301,305-343,397-427,494-501`)
- [x] Falha em `PATCH /credit-cards/:id/archive` ou `PATCH /credit-cards/:id/unarchive` no frontend exibe `alert` com mensagem de erro sem corromper a listagem atual (`frontend/src/app/cards/page.tsx:211-216,223-228`)

---

## Gate Check

- **Gate command**: `export PATH=/home/italo/.nvm/versions/node/v24.18.0/bin:$PATH && cd /opt/projetos/financeiro-familiar/backend && npm run build && npx jest test/unit/credit-cards.service.spec.ts && cd ../frontend && npm run lint && npm run build`
- **Result**: 56 passed, 0 failed, 0 skipped (1/1 Jest suite; backend build exit 0; frontend lint 0 errors / 28 pre-existing warnings, 0 new warnings; frontend build exit 0)
- **Test count before feature**: 38 (`credit-cards.service.spec.ts` em `b8f1a91`)
- **Test count after feature**: 56 (`credit-cards.service.spec.ts` em `5e00926`)
- **Delta**: +18 novos testes unitários em `backend/test/unit/credit-cards.service.spec.ts`
- **Skipped tests**: none
- **Failures**: none

---

## Requirement Traceability Update

| Requirement | Previous Status | New Status |
| ----------- | --------------- | ---------- |
| ARCHCARD-01 | Implementing | ✅ Verified |
| ARCHCARD-02 | Implementing | ✅ Verified |
| ARCHCARD-03 | Implementing | ✅ Verified |
| ARCHCARD-04 | Implementing | ✅ Verified |
| ARCHCARD-05 | Implementing | ✅ Verified |
| ARCHCARD-06 | Implementing | ✅ Verified |
| ARCHCARD-07 | Implementing | ✅ Verified |

---

## Summary

**Overall**: ✅ Ready

**Spec-anchored check**: 13/13 ACs matched spec outcome (P1: 8/8, P2: 5/5 com evidência estática + lint/build conforme `Tests: none` em `tasks.md`); 0 spec-precision gaps
**Sensor**: 3/3 mutations killed (Mutant 1 killed em `credit-cards.service.spec.ts:1075,1119`; Mutant 2 killed em `credit-cards.service.spec.ts:1197`; Mutant 3 killed em `credit-cards.service.spec.ts:1285,1313`)
**Gate**: 56 passed, 0 failed, 0 skipped (backend build, Jest `credit-cards.service.spec.ts`, frontend lint e frontend build com exit code 0)

**What works**:
- `GET /credit-cards` retorna apenas cartões ativos (`isActive: true`, `deletedAt: null`) por padrão e inclui arquivados apenas com `includeArchived=true`, mantendo `/transactions` isolado.
- `PATCH /credit-cards/:id/archive` e `PATCH /credit-cards/:id/unarchive` alternam `isActive`, rejeitam transições redundantes com `BadRequestException` (400), cartões inexistentes/deletados com `NotFoundException` (404) e acessos `VIEWER`/não-autorizados com `ForbiddenException` (403).
- Tela `/cards` remove o checkbox `"Cartão Ativo (exibir no painel)"` e `editIsActive` do modal de edição, exibe abas `Ativos` e `Arquivados` com contadores, selo `Arquivado` e botões `Archive`/`ArchiveRestore` ao lado de editar para não-`VIEWER`.

**Issues found**: none

**Next steps**: Feature aprovada para atualização de rastreabilidade (`Verified`) e conclusão.
