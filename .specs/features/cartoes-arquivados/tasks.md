# Arquivamento e Desarquivamento de Cartões de Crédito Tasks

## Execution Protocol (MANDATORY -- do not skip)

Implement these tasks with the `tlc-spec-driven` skill: **activate it by name and follow its Execute flow and Critical Rules.** Do not search for skill files by filesystem path. The skill is the source of truth for the full flow (per-task cycle, sub-agent delegation, adequacy review, Verifier, discrimination sensor).

**If the skill cannot be activated, STOP and tell the user - do not proceed without it.**

---

**Design**: Inline (escopo Medium - extensão de `CreditCardsService.findAll`, novos métodos `archive`/`unarchive`, endpoints `PATCH` no controller, remoção do checkbox e adição de abas/ícones em `/cards`)
**Status**: Approved

---

## Test Coverage Matrix

> Generated from codebase, project guidelines, and spec - confirm before Execute. Guidelines found: none - strong defaults applied.

| Code Layer | Required Test Type | Coverage Expectation | Location Pattern | Run Command |
| ---------- | ------------------ | -------------------- | ---------------- | ----------- |
| Domain / Service | unit | Cobertura 1:1 dos ACs de `findAll` (`includeArchived`), `archive` e `unarchive` + edge cases e erros (400/403/404) | `backend/test/unit/credit-cards.service.spec.ts` | `export PATH=/home/italo/.nvm/versions/node/v24.18.0/bin:$PATH && cd /opt/projetos/financeiro-familiar/backend && npx jest test/unit/credit-cards.service.spec.ts` |
| Controller / Route | unit | Rota `GET /credit-cards` (`includeArchived`), `PATCH /credit-cards/:id/archive` e `PATCH /credit-cards/:id/unarchive` delegando ao `CreditCardsService` sob `JwtAuthGuard` | `backend/src/modules/credit-cards/credit-cards.controller.ts` | `export PATH=/home/italo/.nvm/versions/node/v24.18.0/bin:$PATH && cd /opt/projetos/financeiro-familiar/backend && npm run build && npx jest test/unit/credit-cards.service.spec.ts` |
| Frontend Page | none | Remoção do checkbox `"Cartão Ativo"`, abas Ativos/Arquivados com contadores, selo `Arquivado` e ícones `Archive`/`ArchiveRestore` validados via lint/build | `frontend/src/app/cards/page.tsx` | `export PATH=/home/italo/.nvm/versions/node/v24.18.0/bin:$PATH && cd /opt/projetos/financeiro-familiar/frontend && npm run lint && npm run build` |

## Gate Check Commands

> Generated from codebase - confirm before Execute.

| Gate Level | When to Use | Command |
| ---------- | ----------- | ------- |
| Quick | After tasks with unit tests only | `export PATH=/home/italo/.nvm/versions/node/v24.18.0/bin:$PATH && cd /opt/projetos/financeiro-familiar/backend && npx jest test/unit/credit-cards.service.spec.ts` |
| Full | After tasks completing controller/module wiring | `export PATH=/home/italo/.nvm/versions/node/v24.18.0/bin:$PATH && cd /opt/projetos/financeiro-familiar/backend && npm run build && npx jest test/unit/credit-cards.service.spec.ts` |
| Build | After phase completion or frontend UI tasks | `export PATH=/home/italo/.nvm/versions/node/v24.18.0/bin:$PATH && cd /opt/projetos/financeiro-familiar/backend && npm run build && npx jest test/unit/credit-cards.service.spec.ts && cd ../frontend && npm run lint && npm run build` |

---

## Execution Plan

Phases are ordered and run sequentially - each phase completes before the next begins, and tasks within a phase execute in order.

### Phase 1: Backend Service, Unit Tests & Controller

```
T1 → T2 → T3
```

### Phase 2: Frontend Tabs, Archive/Unarchive Icons & Modal Cleanup

```
T4
```

---

## Task Breakdown

### Phase 1: Backend Service, Unit Tests & Controller

#### T1: Atualizar CreditCardsService.findAll e implementar archive e unarchive

**What**: Estender `findAll(userId, familyId?, includeArchived = false)` para suportar inclusão opcional de cartões arquivados e implementar os métodos `archive(userId, id)` e `unarchive(userId, id)` no `CreditCardsService`.
**Where**: `backend/src/modules/credit-cards/credit-cards.service.ts`
**Depends on**: None
**Reuses**: `CreditCardsService.findById`, `CreditCardsService.verifyFamilyAccess`
**Requirement**: ARCHCARD-01, ARCHCARD-02, ARCHCARD-03, ARCHCARD-04

**Tools**:

- MCP: NONE
- Skill: NONE

**Done when**:

- [ ] `findAll` mantém `isActive: true, deletedAt: null` quando `includeArchived` é omitido ou `false`
- [ ] `findAll` com `includeArchived = true` filtra por `deletedAt: null` sem restringir `isActive`, tanto para escopo familiar quanto pessoal
- [ ] `archive` valida existência (`findById`), permissão de mutação na família (`verifyFamilyAccess(..., true)`), rejeita cartão já arquivado (`!card.isActive`) com `BadRequestException` e atualiza para `{ isActive: false }`
- [ ] `unarchive` valida existência (`findById`), permissão de mutação na família (`verifyFamilyAccess(..., true)`), rejeita cartão já ativo (`card.isActive`) com `BadRequestException` e atualiza para `{ isActive: true }`
- [ ] Gate `quick` passa com 100% dos testes verdes

**Tests**: unit
**Gate**: quick

---

#### T2: Adicionar testes unitários para listagem de arquivados, archive e unarchive

**What**: Escrever casos de teste unitários em `credit-cards.service.spec.ts` cobrindo 1:1 todos os critérios de aceitação de `findAll` (`includeArchived`), `archive` e `unarchive`.
**Where**: `backend/test/unit/credit-cards.service.spec.ts`
**Depends on**: T1
**Reuses**: `backend/test/unit/credit-cards.service.spec.ts`
**Requirement**: ARCHCARD-01, ARCHCARD-02, ARCHCARD-03, ARCHCARD-04

**Tools**:

- MCP: NONE
- Skill: NONE

**Done when**:

- [ ] Testes cobrem `findAll` sem `includeArchived` (pessoal e familiar) filtrando `isActive: true, deletedAt: null`
- [ ] Testes cobrem `findAll` com `includeArchived = true` (pessoal e familiar) omitindo `isActive` e mantendo `deletedAt: null`
- [ ] Testes cobrem `archive` atualizando `{ isActive: false }` (pessoal e familiar) e rejeitando cartão já arquivado (400), inexistente/deletado (404) e `VIEWER`/não-titular (403)
- [ ] Testes cobrem `unarchive` atualizando `{ isActive: true }` (pessoal e familiar) e rejeitando cartão já ativo (400), inexistente/deletado (404) e `VIEWER`/não-titular (403)
- [ ] Gate `quick` passa com todos os testes verdes (sem exclusões ou skips)

**Tests**: unit
**Gate**: quick

---

#### T3: Expor includeArchived, PATCH :id/archive e PATCH :id/unarchive no Controller

**What**: Adicionar query param `includeArchived` em `GET /credit-cards` e expor as rotas `PATCH /credit-cards/:id/archive` e `PATCH /credit-cards/:id/unarchive` no `CreditCardsController`.
**Where**: `backend/src/modules/credit-cards/credit-cards.controller.ts`
**Depends on**: T2
**Reuses**: `backend/src/modules/credit-cards/credit-cards.controller.ts`
**Requirement**: ARCHCARD-01, ARCHCARD-02, ARCHCARD-03, ARCHCARD-04

**Tools**:

- MCP: NONE
- Skill: NONE

**Done when**:

- [ ] `@Get()` recebe `@Query('includeArchived') includeArchived?: string`, documenta com `@ApiQuery` e repassa `includeArchived === 'true'` para `creditCardsService.findAll`
- [ ] `@Patch(':id/archive')` e `@Patch(':id/unarchive')` declarados com `@ApiOperation` e `@ApiResponse`, delegando para `creditCardsService.archive` e `creditCardsService.unarchive`
- [ ] Gate `full` (backend build + testes unitários) passa integralmente

**Tests**: unit
**Gate**: full

---

### Phase 2: Frontend Tabs, Archive/Unarchive Icons & Modal Cleanup

#### T4: Remover checkbox do modal, adicionar abas Ativos/Arquivados e ícones no card em /cards

**What**: Atualizar `frontend/src/app/cards/page.tsx` para buscar `includeArchived=true`, remover o checkbox `"Cartão Ativo (exibir no painel)"` do modal de edição, exibir abas "Ativos" e "Arquivados" com contadores, selo `Arquivado` e botões de ícone para arquivar/desarquivar diretamente no card.
**Where**: `frontend/src/app/cards/page.tsx`
**Depends on**: T3
**Reuses**: `apiRequest`, `Archive`, `ArchiveRestore` (`lucide-react`), `useAuth`
**Requirement**: ARCHCARD-05, ARCHCARD-06, ARCHCARD-07

**Tools**:

- MCP: NONE
- Skill: NONE

**Done when**:

- [ ] Checkbox `"Cartão Ativo (exibir no painel)"`, estado `editIsActive` e campo `isActive` removidos do modal e payload de edição em `frontend/src/app/cards/page.tsx`
- [ ] `loadData` consulta `/credit-cards` com `includeArchived: 'true'` mantendo `/accounts` com apenas contas ativas
- [ ] Abas "Ativos" e "Arquivados" exibem seus respectivos contadores (`activeCards.length` e `archivedCards.length`)
- [ ] Cards ativos exibem botão de ícone `Archive` (`title="Arquivar cartão"`) e cards arquivados exibem selo `Arquivado` e botão de ícone `ArchiveRestore` (`title="Desarquivar cartão"`) para usuários `!isViewer`, chamando os respectivos endpoints `PATCH` após confirmação
- [ ] Mensagens de estado vazio são contextuais à aba selecionada
- [ ] Gate `build` (backend build + test, frontend lint + build) passa com exit code 0

**Tests**: none
**Gate**: build

---

## Pre-Approval Validation

### Check 1: Task Granularity

| Task | Where | Single File? | Status |
| ---- | ----- | ------------ | ------ |
| T1 | `backend/src/modules/credit-cards/credit-cards.service.ts` | Yes | Passed |
| T2 | `backend/test/unit/credit-cards.service.spec.ts` | Yes | Passed |
| T3 | `backend/src/modules/credit-cards/credit-cards.controller.ts` | Yes | Passed |
| T4 | `frontend/src/app/cards/page.tsx` | Yes | Passed |

### Check 2: Diagram-Definition Cross-Check

| Task | Depends on (spec) | Diagram Edge | Parity? |
| ---- | ----------------- | ------------ | ------- |
| T1 | None | None | Passed |
| T2 | T1 | T1 → T2 | Passed |
| T3 | T2 | T2 → T3 | Passed |
| T4 | T3 (Cross-phase) | Phase 1 → Phase 2 | Passed |

### Check 3: Test Co-location Validation

| Task | Layer | Required Test Type | Tests Field | Compliant? |
| ---- | ----- | ------------------ | ----------- | ---------- |
| T1 | Domain / Service | unit | unit | Passed |
| T2 | Domain / Service | unit | unit | Passed |
| T3 | Controller / Route | unit | unit | Passed |
| T4 | Frontend Page | none | none | Passed |
