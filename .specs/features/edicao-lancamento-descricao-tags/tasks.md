# Edição de Descrição e Tags de Lançamento Tasks

## Execution Protocol (MANDATORY -- do not skip)

Implement these tasks with the `tlc-spec-driven` skill: **activate it by name and follow its Execute flow and Critical Rules.** Do not search for skill files by filesystem path. The skill is the source of truth for the full flow (per-task cycle, sub-agent delegation, adequacy review, Verifier, discrimination sensor).

**If the skill cannot be activated, STOP and tell the user - do not proceed without it.**

---

**Design**: Inline (escopo Medium - DTO restritivo, método `update` no `TransactionsService`, endpoint `PUT /transactions/:id` e modal de edição no extrato)
**Status**: In Progress

---

## Test Coverage Matrix

> Generated from codebase, project guidelines, and spec - confirm before Execute. Guidelines found: none - strong defaults applied.

| Code Layer | Required Test Type | Coverage Expectation | Location Pattern | Run Command |
| ---------- | ------------------ | -------------------- | ---------------- | ----------- |
| DTO / Validation | unit | Validação de `description`/`tags` e rejeição estrita de campos extras (`whitelist` + `forbidNonWhitelisted`) | `backend/test/unit/dto-maxlength-validation.spec.ts` | `export PATH=/home/italo/.nvm/versions/node/v24.18.0/bin:$PATH && cd backend && npx jest test/unit/dto-maxlength-validation.spec.ts` |
| Domain / Service | unit | Cobertura 1:1 dos ACs (EDITTX-01 a EDITTX-04) e edge cases | `backend/test/unit/transactions.service.spec.ts` | `export PATH=/home/italo/.nvm/versions/node/v24.18.0/bin:$PATH && cd backend && npx jest test/unit/transactions.service.spec.ts` |
| Controller / Route | unit | Rota `PUT /transactions/:id` delegando ao service com `@UseGuards(JwtAuthGuard)` | `backend/src/modules/transactions/transactions.controller.ts` | `export PATH=/home/italo/.nvm/versions/node/v24.18.0/bin:$PATH && cd backend && npm test` |
| Frontend Page | none | Renderização do botão editar, modal com campos bloqueados e integração com API | `frontend/src/app/transactions/page.tsx` | `export PATH=/home/italo/.nvm/versions/node/v24.18.0/bin:$PATH && cd frontend && npm run lint && npm run build` |

## Gate Check Commands

> Generated from codebase - confirm before Execute.

| Gate Level | When to Use | Command |
| ---------- | ----------- | ------- |
| Quick | After tasks with unit tests only | `export PATH=/home/italo/.nvm/versions/node/v24.18.0/bin:$PATH && cd backend && npx jest test/unit/dto-maxlength-validation.spec.ts test/unit/transactions.service.spec.ts` |
| Full | After tasks completing controller/module wiring | `export PATH=/home/italo/.nvm/versions/node/v24.18.0/bin:$PATH && cd backend && npm test` |
| Build | After phase completion or frontend UI tasks | `export PATH=/home/italo/.nvm/versions/node/v24.18.0/bin:$PATH && cd backend && npm run build && npm test && cd ../frontend && npm run lint && npm run build` |

---

## Execution Plan

Phases are ordered and run sequentially - each phase completes before the next begins, and tasks within a phase execute in order.

### Phase 1: Backend DTO, Service & Controller

```
T1 → T2 → T3 → T4 → T5
```

### Phase 2: Frontend Edit Modal & Table Integration

```
T6
```

---

## Task Breakdown

### Phase 1: Backend DTO, Service & Controller

#### T1: Criar UpdateTransactionDto permitindo exclusivamente description e tags

**What**: Criar o DTO `UpdateTransactionDto` contendo apenas os campos opcionais `description` e `tags` com validações de tipo e comprimento máximo.
**Where**: `backend/src/modules/transactions/dto/update-transaction.dto.ts`
**Depends on**: None
**Reuses**: `backend/src/modules/transactions/dto/create-transaction.dto.ts`
**Requirement**: EDITTX-01, EDITTX-02

**Tools**:

- MCP: NONE
- Skill: NONE

**Done when**:

- [x] `UpdateTransactionDto` declara apenas `description?: string` e `tags?: string[]`
- [x] `description` possui `@IsOptional()`, `@IsString()`, `@IsNotEmpty()` e `@MaxLength(255)`
- [x] `tags` possui `@IsOptional()`, `@IsArray()`, `@IsString({ each: true })` e `@MaxLength(50, { each: true })`
- [x] Nenhum campo contábil (`amount`, `accountId`, `creditCardId`, `categoryId`, `transactionDate`, `type`, `personId`, `isPrivate`, `status`) está presente no DTO
- [x] Documentação Swagger (`@ApiProperty`) adicionada

**Tests**: unit
**Gate**: quick

---

#### T2: Adicionar testes unitários de validação e whitelist para UpdateTransactionDto

**What**: Adicionar testes no arquivo de validação de DTOs garantindo aceitação de `description`/`tags`, rejeição de strings acima do limite ou vazias e rejeição de qualquer campo extra via `ValidationPipe` (`whitelist: true`, `forbidNonWhitelisted: true`).
**Where**: `backend/test/unit/dto-maxlength-validation.spec.ts`
**Depends on**: T1
**Reuses**: `backend/test/unit/dto-maxlength-validation.spec.ts`
**Requirement**: EDITTX-02

**Tools**:

- MCP: NONE
- Skill: NONE

**Done when**:

- [ ] Teste valida que `UpdateTransactionDto` aceita `description` e `tags` válidos
- [ ] Teste valida rejeição de `description` vazia ou maior que 255 caracteres e tag maior que 50 caracteres
- [ ] Teste valida que `ValidationPipe({ whitelist: true, forbidNonWhitelisted: true })` lança `BadRequestException` ao receber `amount`, `categoryId`, `accountId` ou `transactionDate`
- [ ] Gate `quick` passa com todos os testes verdes

**Tests**: unit
**Gate**: quick

---

#### T3: Implementar método update no TransactionsService

**What**: Implementar `update(userId, id, dto)` no `TransactionsService` com validação de existência, autorização (dono/família/VIEWER/privacidade), atualização restrita de `description` e `tags`, e propagação automática para todas as parcelas ativas do mesmo `installmentGroupId`.
**Where**: `backend/src/modules/transactions/transactions.service.ts`
**Depends on**: T2
**Reuses**: `TagsService.findOrCreateMany`, `TransactionsService.verifyFamilyAccess`
**Requirement**: EDITTX-01, EDITTX-03, EDITTX-04

**Tools**:

- MCP: NONE
- Skill: NONE

**Done when**:

- [ ] Retorna `NotFoundException` se transação não existir ou tiver `deletedAt != null`
- [ ] Retorna `ForbiddenException` se `isPrivate && userId !== tx.userId`, se usuário não for o autor pessoal ou se membro da família for `VIEWER`
- [ ] Rejeita `description` composta apenas por espaços em branco com `BadRequestException`
- [ ] Atualiza `description` e sincroniza `TransactionTag` (incluindo `tags: []` para limpar todas) sem alterar `amount`, saldos de conta ou faturas
- [ ] Quando `installmentGroupId` estiver preenchido, propaga `description` e `tags` para todas as parcelas ativas (`deletedAt: null`) do mesmo grupo
- [ ] Permite edição em transferências, movimentações de metas e faturas `CLOSED` ou `PAID`
- [ ] Gate `quick` passa sem regressões

**Tests**: unit
**Gate**: quick

---

#### T4: Adicionar testes unitários para TransactionsService.update

**What**: Escrever casos de teste unitários em `transactions.service.spec.ts` cobrindo 1:1 todos os critérios de aceitação e edge cases do método `update`.
**Where**: `backend/test/unit/transactions.service.spec.ts`
**Depends on**: T3
**Reuses**: `backend/test/unit/transactions.service.spec.ts`
**Requirement**: EDITTX-01, EDITTX-02, EDITTX-03, EDITTX-04

**Tools**:

- MCP: NONE
- Skill: NONE

**Done when**:

- [ ] Teste de atualização de `description` e `tags` em lançamento simples preservando saldos/faturas
- [ ] Teste de propagação em todas as parcelas ativas com mesmo `installmentGroupId`
- [ ] Teste de remoção completa de tags quando `tags: []`
- [ ] Teste permitindo edição em transferência, transação de meta e fatura `PAID`
- [ ] Testes de erro para 404 (inexistente/deletada), 403 (`VIEWER`, outro usuário, lançamento privado de terceiros) e 400 (descrição só com espaços)
- [ ] Gate `quick` passa com 100% dos testes aprovados

**Tests**: unit
**Gate**: quick

---

#### T5: Expor endpoint PUT /transactions/:id no TransactionsController

**What**: Adicionar a rota `@Put(':id')` no `TransactionsController` recebendo `UpdateTransactionDto` e delegando ao `TransactionsService.update`.
**Where**: `backend/src/modules/transactions/transactions.controller.ts`
**Depends on**: T4
**Reuses**: `backend/src/modules/transactions/transactions.controller.ts`
**Requirement**: EDITTX-01, EDITTX-02

**Tools**:

- MCP: NONE
- Skill: NONE

**Done when**:

- [ ] Endpoint `@Put(':id')` declarado com `@ApiOperation` e `@ApiResponse`
- [ ] Utiliza `@GetUser('id')`, `@Param('id')` e `@Body() dto: UpdateTransactionDto`
- [ ] Gate `full` (`npm test` no backend) passa integralmente

**Tests**: unit
**Gate**: full

---

### Phase 2: Frontend Edit Modal & Table Integration

#### T6: Implementar botão de edição e modal restrito na página de Transações

**What**: Adicionar botão de edição na tabela de extrato e modal de edição onde apenas Descrição e Tags são editáveis e todos os demais campos são exibidos como somente leitura/desabilitados (`Imutável`).
**Where**: `frontend/src/app/transactions/page.tsx`
**Depends on**: T5
**Reuses**: `Modal`, `AutocompleteInput`, `TagInput`, `clearDescriptionCache`
**Requirement**: EDITTX-05, EDITTX-06, EDITTX-07

**Tools**:

- MCP: NONE
- Skill: NONE

**Done when**:

- [ ] Botão de edição (`Pencil`) exibido na coluna Ações para não-`VIEWER` (desabilitado se `tx.isPrivate && tx.userId !== user?.id`)
- [ ] Modal de edição pré-preenche `editDescription` e `editTags` a partir do lançamento selecionado
- [ ] Demais campos (Tipo, Valor, Data/Horário, Categoria, Conta/Cartão, Parcelas, Pessoa, Privacidade) exibidos bloqueados/desabilitados com indicação `Imutável`
- [ ] Exibe aviso informativo quando lançamento for parcelado indicando atualização em todas as parcelas
- [ ] Submissão chama `PUT /transactions/${editingTransaction.id}` com `{ description, tags }`, limpa cache de autocomplete e recarrega transações e tags
- [ ] Gate `build` (backend build + test, frontend lint + build) passa com exit code 0

**Tests**: none
**Gate**: build

---

## Pre-Approval Validation

### Check 1: Task Granularity

| Task | Where | Single File? | Status |
| ---- | ----- | ------------ | ------ |
| T1 | `backend/src/modules/transactions/dto/update-transaction.dto.ts` | Yes | Passed |
| T2 | `backend/test/unit/dto-maxlength-validation.spec.ts` | Yes | Passed |
| T3 | `backend/src/modules/transactions/transactions.service.ts` | Yes | Passed |
| T4 | `backend/test/unit/transactions.service.spec.ts` | Yes | Passed |
| T5 | `backend/src/modules/transactions/transactions.controller.ts` | Yes | Passed |
| T6 | `frontend/src/app/transactions/page.tsx` | Yes | Passed |

### Check 2: Diagram-Definition Cross-Check

| Task | Depends on (spec) | Diagram Edge | Parity? |
| ---- | ----------------- | ------------ | ------- |
| T1 | None | None | Passed |
| T2 | T1 | T1 → T2 | Passed |
| T3 | T2 | T2 → T3 | Passed |
| T4 | T3 | T3 → T4 | Passed |
| T5 | T4 | T4 → T5 | Passed |
| T6 | T5 (Cross-phase) | Phase 1 → Phase 2 | Passed |

### Check 3: Test Co-location Validation

| Task | Layer | Required Test Type | Tests Field | Compliant? |
| ---- | ----- | ------------------ | ----------- | ---------- |
| T1 | DTO / Validation | unit | unit | Passed |
| T2 | DTO / Validation | unit | unit | Passed |
| T3 | Domain / Service | unit | unit | Passed |
| T4 | Domain / Service | unit | unit | Passed |
| T5 | Controller / Route | unit | unit | Passed |
| T6 | Frontend Page | none | none | Passed |
