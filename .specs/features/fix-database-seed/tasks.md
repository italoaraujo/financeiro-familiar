# Inicialização e Execução da Seed do Banco de Dados Tasks

## Execution Protocol (MANDATORY -- do not skip)

Implement these tasks with the `tlc-spec-driven` skill: **activate it by name and follow its Execute flow and Critical Rules.** Do not search for skill files by filesystem path. The skill is the source of truth for the full flow (per-task cycle, sub-agent delegation, adequacy review, Verifier, discrimination sensor).

**If the skill cannot be activated, STOP and tell the user - do not proceed without it.**

---

**Spec**: `.specs/features/fix-database-seed/spec.md`
**Status**: Completed

---

## Test Coverage Matrix

| Code Layer | Required Test Type | Coverage Expectation | Location Pattern | Run Command |
| ---------- | ------------------ | -------------------- | ---------------- | ----------- |
| Backend Docker & Build | build | Compilação do NestJS e do script de seed TS para JS | `backend/dist/` | `npm --prefix backend run build` |
| Database Seed & Runtime | integration | Execução idempotente do seed e população de categorias e usuário demo | `backend/prisma/seed.ts` | `npm --prefix backend run prisma:seed` |

---

## Gate Check Commands

| Gate Level | When to Use | Command |
| ---------- | ----------- | ------- |
| Quick | After backend code changes | `npm --prefix backend run build` |
| Full | After each completed task | `npm --prefix backend run build` |
| Build | After all phases completed | `npm --prefix backend run build` |

---

## Execution Plan

Phases are ordered and run sequentially - each phase completes before the next begins, and tasks within a phase execute in order.

### Phase 1: Correção do Build e Entrypoint do Docker

Compilação do seed no estágio de builder e atualização do entrypoint no runner do Dockerfile.

```
T1 → T2
```

---

## Task Breakdown

### T1: Configurar Compilação do Seed e Ajustar Entrypoint no Dockerfile e package.json

**What**: Adicionar comando no builder do `backend/Dockerfile` e script no `backend/package.json` para compilar `prisma/seed.ts` para `dist/prisma/seed.js`. Atualizar o `CMD` do Dockerfile para executar `node dist/prisma/seed.js` diretamente com Node, garantindo que o seed rode sem depender de `ts-node` em ambiente de produção.
**Where**: `backend/Dockerfile`, `backend/package.json`
**Depends on**: None
**Requirement**: SEED-01
**Done when**:
- [x] `backend/package.json` possui script de build compilando o seed ou script dedicado
- [x] `backend/Dockerfile` compila `prisma/seed.ts` para `dist/prisma/seed.js`
- [x] `backend/Dockerfile` executa `node dist/prisma/seed.js` na inicialização do container
**Tests**: `npm --prefix backend run build`
**Gate**: `npm --prefix backend run build`

---

### T2: Executar a Seed no Banco de Dados e Validar os Dados Iniciais

**What**: Executar o script de seed compilado no banco de dados e validar que o usuário `admin@exemplo.com` (com família) e as 14 categorias padrão foram criados com sucesso.
**Where**: `backend/prisma/seed.ts`
**Depends on**: T1
**Requirement**: SEED-01
**Done when**:
- [x] Seed executada com sucesso no PostgreSQL
- [x] Usuário `admin@exemplo.com` e família cadastrados
- [x] 14 categorias de despesas e receitas cadastradas
**Tests**: `npm --prefix backend run prisma:seed`
**Gate**: `npm --prefix backend run build`

---

## Verification Plan

### Automated Tests
- `npm --prefix backend run build`: Valida compilação do TypeScript e da seed.
- Execução do seed com verificação de saída no terminal.

### Manual Verification
- Inspecionar tabela de categorias e usuários no banco de dados.
- Testar login com `admin@exemplo.com` / `123456`.
