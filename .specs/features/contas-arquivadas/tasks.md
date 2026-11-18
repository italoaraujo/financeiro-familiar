# Visualização e Desarquivamento de Contas Tasks

## Execution Protocol (MANDATORY -- do not skip)

Implement these tasks with the `tlc-spec-driven` skill: **activate it by name and follow its Execute flow and Critical Rules.** Do not search for skill files by filesystem path. The skill is the source of truth for the full flow (per-task cycle, sub-agent delegation, adequacy review, Verifier, discrimination sensor).

**If the skill cannot be activated, STOP and tell the user - do not proceed without it.**

---

**Design**: Inline (escopo Medium - extensão de `AccountsService.findAll`, novo método `unarchive`, query param e rota `PATCH /accounts/:id/unarchive` no controller, e abas Ativas/Arquivadas em `/accounts`)
**Status**: Approved

---

## Test Coverage Matrix

> Generated from codebase, project guidelines, and spec - confirm before Execute. Guidelines found: none - strong defaults applied.

| Code Layer | Required Test Type | Coverage Expectation | Location Pattern | Run Command |
| ---------- | ------------------ | -------------------- | ---------------- | ----------- |
| Domain / Service | unit | Cobertura 1:1 dos ACs de `findAll` (`includeArchived`), `archive` e `unarchive` + edge cases e erros (400/403/404) | `backend/test/unit/accounts.service.spec.ts` | `export PATH=/home/italo/.nvm/versions/node/v24.18.0/bin:$PATH && cd /opt/projetos/financeiro-familiar/backend && npx jest test/unit/accounts.service.spec.ts` |
| Controller / Route | unit | Rota `GET /accounts` (`includeArchived`) e `PATCH /accounts/:id/unarchive` delegando ao `AccountsService` sob `JwtAuthGuard` | `backend/src/modules/accounts/accounts.controller.ts` | `export PATH=/home/italo/.nvm/versions/node/v24.18.0/bin:$PATH && cd /opt/projetos/financeiro-familiar/backend && npm run build && npx jest test/unit/accounts.service.spec.ts` |
| Frontend Page | none | Abas Ativas/Arquivadas, contadores, saldo consolidado só ativo, badge e botão desarquivar validados via lint/build | `frontend/src/app/accounts/page.tsx` | `export PATH=/home/italo/.nvm/versions/node/v24.18.0/bin:$PATH && cd /opt/projetos/financeiro-familiar/frontend && npm run lint && npm run build` |

## Gate Check Commands

> Generated from codebase - confirm before Execute.

| Gate Level | When to Use | Command |
| ---------- | ----------- | ------- |
| Quick | After tasks with unit tests only | `export PATH=/home/italo/.nvm/versions/node/v24.18.0/bin:$PATH && cd /opt/projetos/financeiro-familiar/backend && npx jest test/unit/accounts.service.spec.ts` |
| Full | After tasks completing controller/module wiring | `export PATH=/home/italo/.nvm/versions/node/v24.18.0/bin:$PATH && cd /opt/projetos/financeiro-familiar/backend && npm run build && npx jest test/unit/accounts.service.spec.ts` |
| Build | After phase completion or frontend UI tasks | `export PATH=/home/italo/.nvm/versions/node/v24.18.0/bin:$PATH && cd /opt/projetos/financeiro-familiar/backend && npm run build && npx jest test/unit/accounts.service.spec.ts && cd ../frontend && npm run lint && npm run build` |

---

## Execution Plan

Phases are ordered and run sequentially - each phase completes before the next begins, and tasks within a phase execute in order.

### Phase 1: Backend Service, Unit Tests & Controller

```
T1 → T2 → T3
```

### Phase 2: Frontend Tabs & Unarchive Action

```
T4
```

---

## Task Breakdown

### Phase 1: Backend Service, Unit Tests & Controller

#### T1: Atualizar AccountsService.findAll e implementar AccountsService.unarchive

**What**: Estender `findAll(userId, familyId?, includeArchived = false)` para suportar inclusão opcional de contas arquivadas e implementar o método `unarchive(userId, id)` no `AccountsService`.
**Where**: `backend/src/modules/accounts/accounts.service.ts`
**Depends on**: None
**Reuses**: `AccountsService.findById`, `AccountsService.verifyFamilyAccess`
**Requirement**: ARCHACC-01, ARCHACC-02, ARCHACC-03, ARCHACC-04

**Tools**:

- MCP: NONE
- Skill: NONE

**Done when**:

- [ ] `findAll` mantém `isArchived: false, deletedAt: null` quando `includeArchived` é omitido ou `false`
- [ ] `findAll` com `includeArchived = true` filtra por `deletedAt: null` sem restringir `isArchived`, tanto para escopo familiar quanto pessoal
- [ ] `unarchive` valida existência (`findById`), permissão de mutação na família (`verifyFamilyAccess(..., true)`), rejeita conta não arquivada com `BadRequestException('A conta não está arquivada')` e atualiza para `{ isArchived: false, isActive: true }`
- [ ] Gate `quick` passa com 100% dos testes verdes

**Tests**: unit
**Gate**: quick

---

#### T2: Adicionar testes unitários para listagem de arquivadas, archive e unarchive

**What**: Escrever casos de teste unitários em `accounts.service.spec.ts` cobrindo 1:1 todos os critérios de aceitação de `findAll` (`includeArchived`), `archive` e `unarchive`.
**Where**: `backend/test/unit/accounts.service.spec.ts`
**Depends on**: T1
**Reuses**: `backend/test/unit/accounts.service.spec.ts`
**Requirement**: ARCHACC-01, ARCHACC-02, ARCHACC-03, ARCHACC-04

**Tools**:

- MCP: NONE
- Skill: NONE

**Done when**:

- [ ] Testes cobrem `findAll` sem `includeArchived` (pessoal e familiar) filtrando `isArchived: false, deletedAt: null`
- [ ] Testes cobrem `findAll` com `includeArchived = true` (pessoal e familiar) omitindo `isArchived` e mantendo `deletedAt: null`
- [ ] Testes cobrem `archive` atualizando `{ isArchived: true, isActive: false }` e rejeitando `VIEWER` com `ForbiddenException`
- [ ] Testes cobrem `unarchive` restaurando conta arquivada para `{ isArchived: false, isActive: true }`
- [ ] Testes cobrem erros de `unarchive`: 400 para conta ativa (`!isArchived`), 404 para conta inexistente/deletada e 403 para `VIEWER` ou usuário de outra conta pessoal
- [ ] Gate `quick` passa com todos os testes verdes (sem exclusões ou skips)

**Tests**: unit
**Gate**: quick

---

#### T3: Expor includeArchived em GET /accounts e endpoint PATCH /accounts/:id/unarchive

**What**: Adicionar parâmetro de query `includeArchived` na rota `GET /accounts` e expor a rota `PATCH /accounts/:id/unarchive` no `AccountsController`.
**Where**: `backend/src/modules/accounts/accounts.controller.ts`
**Depends on**: T2
**Reuses**: `backend/src/modules/accounts/accounts.controller.ts`
**Requirement**: ARCHACC-01, ARCHACC-02, ARCHACC-03, ARCHACC-04

**Tools**:

- MCP: NONE
- Skill: NONE

**Done when**:

- [ ] `@Get()` recebe `@Query('includeArchived') includeArchived?: string`, documenta com `@ApiQuery` e repassa `includeArchived === 'true'` para `accountsService.findAll`
- [ ] `@Patch(':id/unarchive')` declarado com `@ApiOperation` e `@ApiResponse`, delegando para `accountsService.unarchive(userId, id)`
- [ ] Gate `full` (backend build + testes unitários) passa integralmente

**Tests**: unit
**Gate**: full

---

### Phase 2: Frontend Tabs & Unarchive Action

#### T4: Implementar abas Ativas/Arquivadas e botão de desarquivar na página /accounts

**What**: Atualizar a página `/accounts` para buscar `includeArchived=true`, exibir abas "Ativas" e "Arquivadas" com contadores, manter o "Saldo Total Consolidado" restrito às contas ativas e permitir desarquivar contas arquivadas.
**Where**: `frontend/src/app/accounts/page.tsx`
**Depends on**: T3
**Reuses**: `apiRequest`, `ArchiveRestore` (`lucide-react`), `useAuth`
**Requirement**: ARCHACC-05, ARCHACC-06, ARCHACC-07

**Tools**:

- MCP: NONE
- Skill: NONE

**Done when**:

- [ ] `loadAccounts` consulta `/accounts` com `includeArchived: 'true'` (além de `familyId` quando selecionado)
- [ ] Abas "Ativas" e "Arquivadas" exibem seus respectivos contadores (`activeAccounts.length` e `archivedAccounts.length`)
- [ ] Card "Saldo Total Consolidado" soma exclusivamente `activeAccounts` (`!a.isArchived`) em ambas as abas
- [ ] Aba "Arquivadas" exibe somente contas arquivadas com selo `Arquivada` e, para `!isViewer`, botão "Desarquivar conta" (`ArchiveRestore`) chamando `PATCH /accounts/${id}/unarchive` após confirmação, além de `Trash2`
- [ ] Mensagens de estado vazio são contextuais à aba selecionada
- [ ] Gate `build` (backend build + test, frontend lint + build) passa com exit code 0

**Tests**: none
**Gate**: build

---

## Pre-Approval Validation

### Check 1: Task Granularity

| Task | Where | Single File? | Status |
| ---- | ----- | ------------ | ------ |
| T1 | `backend/src/modules/accounts/accounts.service.ts` | Yes | Passed |
| T2 | `backend/test/unit/accounts.service.spec.ts` | Yes | Passed |
| T3 | `backend/src/modules/accounts/accounts.controller.ts` | Yes | Passed |
| T4 | `frontend/src/app/accounts/page.tsx` | Yes | Passed |

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
