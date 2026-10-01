# Atualização do Next.js para versão 16.3.8 Tasks

## Execution Protocol (MANDATORY -- do not skip)

Implement these tasks with the `tlc-spec-driven` skill: **activate it by name and follow its Execute flow and Critical Rules.** Do not search for skill files by filesystem path. The skill is the source of truth for the full flow (per-task cycle, sub-agent delegation, adequacy review, Verifier, discrimination sensor).

**If the skill cannot be activated, STOP and tell the user - do not proceed without it.**

---

**Spec**: `.specs/features/upgrade-nextjs-16/spec.md`
**Status**: Ready

---

## Test Coverage Matrix

> Generated from codebase, project guidelines, and spec - confirm before Execute. Guidelines found: `frontend/package.json`, `backend/package.json`.

| Code Layer | Required Test Type | Coverage Expectation | Location Pattern | Run Command |
| ---------- | ------------------ | -------------------- | ---------------- | ----------- |
| Frontend Dependencies | none | Build e linting do Next.js 16.3.8 sem erros | `frontend/package.json` | `npm --prefix frontend run lint` |
| Frontend Build | none | Build standalone completo do Next.js 16 | `frontend/src` | `npm --prefix frontend run build` |
| Backend Services | unit | 100% de aprovação em todos os 215 testes | `backend/test/**/*.spec.ts` | `npm --prefix backend test` |

## Gate Check Commands

> Generated from codebase - confirm before Execute.

| Gate Level | When to Use | Command |
| ---------- | ----------- | ------- |
| Quick | Validação rápida de sintaxe e lint | `npm --prefix frontend run lint` |
| Full | Validação de build do frontend | `npm --prefix frontend run build` |
| System | Validação de todos os testes unitários | `npm --prefix backend test` |

---

## Execution Plan

Phases are ordered and run sequentially - each phase completes before the next begins, and tasks within a phase execute in order.

### Phase 1: Atualização e Validação do Next.js 16

```
T1 → T2 → T3
```

---

## Task Breakdown

### T1: Atualização das dependências do Next.js para 16.3.8 e ferramentas no frontend

**What**: Atualizar os pacotes `next` para `16.3.8`, `eslint-config-next` para `16.3.8` e `eslint` para `^9.0.0` no `frontend/package.json`, sincronizando o `package-lock.json` com resolução limpa de dependências.
**Where**: `frontend/package.json`
**Depends on**: None
**Reuses**: `frontend/package.json`
**Requirement**: UPG-01

**Tools**:

- Code editor
- Bash terminal

**Done when**:

- [x] Pacotes `next@16.3.8`, `eslint-config-next@16.3.8` e `eslint@^9.0.0` instalados no `frontend`.
- [x] Arquivo `frontend/package-lock.json` atualizado e consistente.
- [x] `npm --prefix frontend run lint` executa sem erros críticos.
- [x] Gate check passes: `npm --prefix frontend run lint`

**Tests**: lint
**Gate**: quick

---

### T2: Validação e compilação do build de produção com Next.js 16.3.8

**What**: Validar a compilação do Next.js 16.3.8 através de `npm run build` no frontend, assegurando geração de artefatos otimizados e suporte a output standalone sem falhas de SSR/rotas.
**Where**: `frontend/next.config.js`
**Depends on**: T1
**Reuses**: `frontend/next.config.js`
**Requirement**: UPG-02

**Tools**:

- Code editor
- Bash terminal

**Done when**:

- [x] Comando `npm --prefix frontend run build` conclui com código 0.
- [x] Todas as 14 rotas estáticas e dinâmicas são geradas com sucesso.
- [x] Diretório `.next/standalone` gerado corretamente para o container Docker.
- [x] Gate check passes: `npm --prefix frontend run build`

**Tests**: build
**Gate**: full

---

### T3: Execução e verificação da suíte de testes unitários do sistema

**What**: Executar a suíte de testes unitários e de integração do sistema (`npm test` no backend), garantindo que todas as 25 suítes e 215 testes passem com 100% de sucesso.
**Where**: `backend/package.json`
**Depends on**: T2
**Reuses**: `backend/package.json`
**Requirement**: UPG-03

**Tools**:

- Code editor
- Bash terminal

**Done when**:

- [ ] Todas as 25 suítes de testes do backend são executadas.
- [ ] Todos os 215 testes unitários e de integração passam com sucesso.
- [ ] Zero falhas ou regressões detectadas no sistema.
- [ ] Gate check passes: `npm --prefix backend test`

**Tests**: unit
**Gate**: quick
