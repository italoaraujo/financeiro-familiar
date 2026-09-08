# Performance Seed Data Tasks

## Execution Protocol (MANDATORY -- do not skip)

Implement these tasks with the `tlc-spec-driven` skill: **activate it by name and follow its Execute flow and Critical Rules.** Do not search for skill files by filesystem path. The skill is the source of truth for the full flow (per-task cycle, sub-agent delegation, adequacy review, Verifier, discrimination sensor).

**If the skill cannot be activated, STOP and tell the user - do not proceed without it.**

---

**Spec**: `.specs/features/performance-seed-data/spec.md`
**Status**: Ready

---

## Test Coverage Matrix

> Generated from codebase, project guidelines, and spec - confirm before Execute. Guidelines found: `backend/package.json`.

| Code Layer | Required Test Type | Coverage Expectation | Location Pattern | Run Command |
| ---------- | ------------------ | -------------------- | ---------------- | ----------- |
| Prisma Seed Scripts | integration | Seed execution finishes with exit code 0 and verifies >= 30,000 transactions created | `backend/prisma/seed-perf.ts` | `npm run prisma:seed:perf` |
| Services (Backend) | unit | Existing suite passes without regression | `backend/test/unit/*.spec.ts` | `npm test` |

## Gate Check Commands

> Generated from codebase - confirm before Execute.

| Gate Level | When to Use | Command |
| ---------- | ----------- | ------- |
| Quick | After seed script updates | `cd /opt/projetos/financeiro-familiar/backend && npm test` |
| Full | Verification of performance seed execution | `cd /opt/projetos/financeiro-familiar/backend && npm run prisma:seed:perf && npm test` |

---

## Execution Plan

Phases are ordered and run sequentially - each phase completes before the next begins, and tasks within a phase execute in order.

### Phase 1: Implementação da Carga de Desempenho

```
T1 → T2 → T3
```

---

## Task Breakdown

### T1: Criação da Estrutura e Entidades Base do Seed de Performance

**What**: Criar o script `backend/prisma/seed-perf.ts` implementando a criação idempotente do usuário `perf@exemplo.com`, família "Família Performance", contas bancárias, cartões de crédito, pessoas da família e faturas dos últimos 24 meses.
**Where**: `backend/prisma/seed-perf.ts`
**Depends on**: None
**Reuses**: `backend/prisma/seed.ts`
**Requirement**: SEED-01, SEED-02, SEED-03, SEED-05, SEED-06

**Tools**:

- MCP: `filesystem`
- Skill: NONE

**Done when**:

- [x] Script inicializa conexão Prisma e gerencia limpeza idempotente exclusiva da família de teste caso já exista.
- [x] Usuário `perf@exemplo.com` com senha hash bcrypt (`123456`) e família "Família Performance" são criados.
- [x] 3 contas bancárias, 2 cartões de crédito, 4 pessoas familiares e 48 faturas mensais são criados no banco.
- [x] Gate check passes: `cd /opt/projetos/financeiro-familiar/backend && npm test`

**Tests**: unit
**Gate**: quick

---

### T2: Geração de Transações Massivas em Lote (createMany)

**What**: Implementar em `backend/prisma/seed-perf.ts` a geração distribuída de 30.000 transações realistas ao longo dos últimos 24 meses, utilizando `prisma.transaction.createMany` em lotes de até 5.000 registros, além de metas, aportes e orçamentos mensais.
**Where**: `backend/prisma/seed-perf.ts`
**Depends on**: T1
**Reuses**: `backend/prisma/schema.prisma`
**Requirement**: SEED-04, SEED-05, SEED-06

**Tools**:

- MCP: `filesystem`
- Skill: NONE

**Done when**:

- [x] Função geradora produz 30.000 registros de transações com valores, categorias, contas/cartões, faturas e pessoas associadas.
- [x] Inserção utiliza chunks de `createMany` para alto desempenho (inserção em poucos segundos).
- [x] Orçamentos (budgets) e metas (goals com depósitos) são inseridos para a família de teste.
- [x] Gate check passes: `cd /opt/projetos/financeiro-familiar/backend && npm test`

**Tests**: unit
**Gate**: quick

---

### T3: Configuração de Script npm e Execução com Métricas de Performance

**What**: Adicionar comando `"prisma:seed:perf": "ts-node prisma/seed-perf.ts"` no `backend/package.json`, executar o script contra o banco PostgreSQL ativo e validar métricas de tempo e contagem total de registros persistidos.
**Where**: `backend/package.json`
**Depends on**: T2
**Reuses**: `backend/package.json`
**Requirement**: SEED-07, SEED-08

**Tools**:

- MCP: `filesystem`
- Skill: NONE

**Done when**:

- [x] Script `prisma:seed:perf` configurado no `backend/package.json`.
- [x] Execução `npm run prisma:seed:perf` conclui com sucesso (código 0).
- [x] Relatório impresso no console detalha contagem de registros por tabela e tempo total decorrido.
- [x] Contagem no banco confirma mais de 30.000 transações inseridas sem afetar dados do usuário admin demo.
- [x] Gate check passes: `cd /opt/projetos/financeiro-familiar/backend && npm run prisma:seed:perf && npm test`

**Tests**: integration
**Gate**: full
