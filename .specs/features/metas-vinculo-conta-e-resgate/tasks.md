# Metas Financeiras: Vínculo Obrigatório a Contas (Cofrinhos) e Resgate Tasks

## Execution Protocol (MANDATORY -- do not skip)

Implement these tasks with the `tlc-spec-driven` skill: **activate it by name and follow its Execute flow and Critical Rules.** Do not search for skill files by filesystem path. The skill is the source of truth for the full flow (per-task cycle, sub-agent delegation, adequacy review, Verifier, discrimination sensor).

**If the skill cannot be activated, STOP and tell the user - do not proceed without it.**

---

**Design**: `.specs/features/metas-vinculo-conta-e-resgate/design.md`
**Status**: Draft

---

## Test Coverage Matrix

> Generated from codebase, project guidelines, and spec - confirm before Execute. Guidelines found: `backend/package.json` (Jest runner).

| Code Layer | Required Test Type | Coverage Expectation | Location Pattern | Run Command |
| ---------- | ------------------ | -------------------- | ---------------- | ----------- |
| Schema / Database | none | Build gate & prisma generate verification | `backend/prisma/schema.prisma` | `npm --prefix backend run prisma:generate` |
| DTOs | none | Build gate & validation pipe types | `backend/src/modules/goals/dto/*.dto.ts` | `npm --prefix backend run build` |
| Service (GoalsService) | unit | Criação com conta, aporte automático, resgate atômico, reversão de status e guard de exclusão | `backend/test/unit/goals.service.spec.ts` | `npm --prefix backend test -- test/unit/goals.service.spec.ts` |
| Controller (GoalsController) | unit | Rota de resgate POST /:id/withdraw, validação de payload e guards | `backend/test/unit/goals.service.spec.ts` | `npm --prefix backend test -- test/unit/goals.service.spec.ts` |
| Integration Flow | integration | Fluxo completo do cofrinho: aporte, resgate, reflexo contábil em conta e bloqueio de delete | `backend/test/integration/goals-cofrinho-flow.spec.ts` | `npm --prefix backend test -- test/integration/goals-cofrinho-flow.spec.ts` |
| Frontend UI | none | Next.js build verification | `frontend/src/app/goals/page.tsx` | `npm --prefix frontend run build` |

---

## Gate Check Commands

> Generated from codebase - confirm before Execute.

| Gate Level | When to Use | Command |
| ---------- | ----------- | ------- |
| Quick | Após tarefas com testes unitários específicos | `npm --prefix backend test -- [caminho_do_teste]` |
| Full | Após tarefas de integração | `npm --prefix backend test` |
| Build | Após conclusão de fases ou entidades do banco e frontend | `npm --prefix backend run build` |

---

## Execution Plan

Phases are ordered and run sequentially - each phase completes before the next begins, and tasks within a phase execute in order.

### Phase 1: Database & Modelagem Prisma

Modelagem da relação obrigatória com `Account`, enum `GoalMovementType` e campo `type` em `GoalDeposit`.

```
T1
```

### Phase 2: DTOs e Lógica de Negócio do Backend

Criação dos DTOs de resgate e evolução do `GoalsService` com operações atômicas e testes unitários.

```
T2 → T3 → T4
```

### Phase 3: Controller e Integração de API

Exposição do endpoint de resgate no `GoalsController` e validação com teste de integração ponta a ponta.

```
T5 → T6
```

### Phase 4: Frontend (Interface Web de Cofrinhos)

Interface de criação de cofrinho vinculado, modal de resgate, histórico e bloqueio visual de exclusão com saldo.

```
T7 → T8
```

---

## Task Breakdown

### Phase 1: Database & Modelagem Prisma

### T1: Atualização do Prisma Schema para Metas Vinculadas e Tipo de Movimentação [DONE]

**What**: Adicionar `accountId` obrigatório em `Goal` com relação para `Account`, enum `GoalMovementType` (`DEPOSIT`, `WITHDRAWAL`) e campo `type` em `GoalDeposit`.
**Where**: `backend/prisma/schema.prisma`
**Depends on**: none
**Requirement**: GOAL-01
**Tools**:
- MCP: `filesystem`
- Skill: NONE

**Done when**:
- [x] Coluna `accountId` adicionada a `Goal` com índice e relação para `Account`
- [x] Enum `GoalMovementType` criado com valores `DEPOSIT` e `WITHDRAWAL`
- [x] Campo `type` com default `DEPOSIT` adicionado ao model `GoalDeposit`
- [x] Relação `goals Goal[]` adicionada ao model `Account`
- [x] `npm --prefix backend run prisma:generate` executado com sucesso
- [x] Gate check passes: `npm --prefix backend run build`

**Tests**: none
**Gate**: build

---

### Phase 2: DTOs e Lógica de Negócio do Backend

### T2: Criação e Atualização de DTOs para Metas e Resgate [DONE]

**What**: Criar `CreateWithdrawalDto` com validações de valor, data e observações, e atualizar `CreateGoalDto` para exigir `accountId`.
**Where**: `backend/src/modules/goals/dto/create-withdrawal.dto.ts`
**Depends on**: T1
**Requirement**: GOAL-02
**Tools**:
- MCP: `filesystem`
- Skill: NONE

**Done when**:
- [x] `CreateWithdrawalDto` criado com decoradores de validação (`@IsNumber`, `@Min(0.01)`, `@IsDateString`, `@IsOptional`)
- [x] `CreateGoalDto` atualizado com `@IsUUID()` obrigatório para `accountId`
- [x] Gate check passes: `npm --prefix backend run build`

**Tests**: none
**Gate**: build

---

### T3: Implementação das Regras de Cofrinho e Bloqueio de Exclusão no GoalsService

**What**: Adaptar `create()`, `addDeposit()`, `remove()` e implementar `withdraw()` com transação atômica no `GoalsService`.
**Where**: `backend/src/modules/goals/goals.service.ts`
**Depends on**: T2
**Requirement**: GOAL-06
**Tools**:
- MCP: `filesystem`
- Skill: NONE

**Done when**:
- [ ] `create()` valida existência da conta bancária e persiste vinculação
- [ ] `addDeposit()` debita automaticamente da conta vinculada da meta e grava `type: DEPOSIT`
- [ ] `withdraw()` valida saldo suficiente, credita conta vinculada, debita meta, grava transação e histórico `type: WITHDRAWAL`
- [ ] `withdraw()` rebaixa status para `IN_PROGRESS` se saldo cair abaixo de `targetAmount`
- [ ] `remove()` lança `BadRequestException` se `currentAmount > 0`
- [ ] Gate check passes: `npm --prefix backend run build`

**Tests**: `backend/test/unit/goals.service.spec.ts`
**Gate**: quick

---

### T4: Testes Unitários de Regras de Negócio do GoalsService

**What**: Implementar suíte de testes unitários cobrindo aporte, resgate, reversão de status e proteção de exclusão de meta com saldo.
**Where**: `backend/test/unit/goals.service.spec.ts`
**Depends on**: T3
**Requirement**: GOAL-03
**Tools**:
- MCP: `filesystem`
- Skill: NONE

**Done when**:
- [ ] Teste unitário para bloqueio de exclusão com saldo positivo aprovado
- [ ] Teste unitário para exclusão permitida com saldo zerado aprovado
- [ ] Teste unitário para resgate com saldo insuficiente lançando erro aprovado
- [ ] Teste unitário para resgate bem-sucedido com atualização atômica e transação contábil aprovado
- [ ] Gate check passes: `npm --prefix backend test -- test/unit/goals.service.spec.ts`

**Tests**: `backend/test/unit/goals.service.spec.ts`
**Gate**: quick

---

### Phase 3: Controller e Integração de API

### T5: Exposição do Endpoint de Resgate no GoalsController

**What**: Adicionar endpoint `POST :id/withdraw` no `GoalsController` com tipagem e Swagger.
**Where**: `backend/src/modules/goals/goals.controller.ts`
**Depends on**: T4
**Requirement**: GOAL-04
**Tools**:
- MCP: `filesystem`
- Skill: NONE

**Done when**:
- [ ] Método `@Post(':id/withdraw')` mapeado e conectado a `goalsService.withdraw()`
- [ ] Parâmetros `@CurrentUser('id')`, `@Param('id')` e `@Body()` validados
- [ ] Gate check passes: `npm --prefix backend test -- test/unit/goals.service.spec.ts`

**Tests**: `backend/test/unit/goals.service.spec.ts`
**Gate**: quick

---

### T6: Teste de Integração Ponta a Ponta do Fluxo de Cofrinho e Resgate

**What**: Criar teste de integração cobrindo criação da meta vinculada à conta, aporte, resgate, reflexo contábil e exclusão.
**Where**: `backend/test/integration/goals-cofrinho-flow.spec.ts`
**Depends on**: T5
**Requirement**: GOAL-07
**Tools**:
- MCP: `filesystem`
- Skill: NONE

**Done when**:
- [ ] Teste de integração executa o ciclo completo de cofrinho
- [ ] Verifica saldo da conta bancária após aporte e após resgate
- [ ] Valida rejeição de exclusão de meta com saldo positivo
- [ ] Valida sucesso de exclusão após zeramento do saldo via resgate
- [ ] Gate check passes: `npm --prefix backend test -- test/integration/goals-cofrinho-flow.spec.ts`

**Tests**: `backend/test/integration/goals-cofrinho-flow.spec.ts`
**Gate**: full

---

### Phase 4: Frontend (Interface Web de Cofrinhos)

### T7: Seleção Obrigatória de Conta e Exibição de Cofrinho no Frontend

**What**: Adicionar seletor obrigatório de conta bancária no modal de nova meta e exibir a conta vinculada no card de cada meta.
**Where**: `frontend/src/app/goals/page.tsx`
**Depends on**: T6
**Requirement**: GOAL-08
**Tools**:
- MCP: `filesystem`
- Skill: NONE

**Done when**:
- [ ] Select de conta bancária obrigatório no formulário de criação de meta
- [ ] Card da meta exibe badge/identificação da conta bancária de custódia
- [ ] Modal de aporte simplificado utilizando diretamente a conta vinculada da meta
- [ ] Gate check passes: `npm --prefix frontend run build`

**Tests**: none
**Gate**: build

---

### T8: Modal de Resgate, Histórico de Movimentações e Bloqueio Visual de Exclusão

**What**: Implementar modal de resgate com limite de saldo, histórico unificado de aportes/resgates e proteção no botão de exclusão.
**Where**: `frontend/src/app/goals/page.tsx`
**Depends on**: T7
**Requirement**: GOAL-09
**Tools**:
- MCP: `filesystem`
- Skill: NONE

**Done when**:
- [ ] Botão e modal "Resgatar" implementados para retirar saldo de volta para a conta vinculada
- [ ] Validação do modal impedindo resgate acima do saldo acumulado
- [ ] Botão de excluir desabilitado com aviso explicativo se `currentAmount > 0`
- [ ] Histórico da meta diferenciando visualmente Aportes (+) e Resgates (-)
- [ ] Gate check passes: `npm --prefix frontend run build`

**Tests**: none
**Gate**: build
