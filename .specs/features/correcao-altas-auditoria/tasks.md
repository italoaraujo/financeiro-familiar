# Correção de Vulnerabilidades de Severidade Alta da Auditoria Tasks

## Execution Protocol (MANDATORY -- do not skip)

Implement these tasks with the `tlc-spec-driven` skill: **activate it by name and follow its Execute flow and Critical Rules.** Do not search for skill files by filesystem path. The skill is the source of truth for the full flow (per-task cycle, sub-agent delegation, adequacy review, Verifier, discrimination sensor).

**If the skill cannot be activated, STOP and tell the user - do not proceed without it.**

---

**Spec**: `.specs/features/correcao-altas-auditoria/spec.md`  
**Status**: Ready  

---

## Test Coverage Matrix

> Generated from codebase, project guidelines, and spec - confirm before Execute. Guidelines found: `backend/package.json`, `jest.config`.

| Code Layer | Required Test Type | Coverage Expectation | Location Pattern | Run Command |
| ---------- | ------------------ | -------------------- | ---------------- | ----------- |
| Services (CreditCards) | unit | Validação de BOLA/IDOR na associação de conta bancária | `backend/test/unit/credit-cards.service.spec.ts` | `npm --prefix backend test -- test/unit/credit-cards.service.spec.ts` |
| Services (Categories) | unit | Validação de BOLA em parentId e auto-referência cíclica | `backend/test/unit/categories.service.spec.ts` | `npm --prefix backend test -- test/unit/categories.service.spec.ts` |
| Services (Transactions) | unit | Bloqueio de exclusão em faturas CLOSED/PAID | `backend/test/unit/transactions.service.spec.ts` | `npm --prefix backend test -- test/unit/transactions.service.spec.ts` |
| Infrastructure (Docker) | integration | Verificação de portas loopback no compose | `docker-compose.yml` | `npm --prefix backend test` |
| Dependencies (Backend) | integration | Remediação de CVEs no backend sem regressões | `backend/package.json` | `npm --prefix backend test` |
| Dependencies (Frontend) | integration | Remediação de CVEs no frontend sem regressões | `frontend/package.json` | `npm --prefix frontend test` |

## Gate Check Commands

> Generated from codebase - confirm before Execute.

| Gate Level | When to Use | Command |
| ---------- | ----------- | ------- |
| Quick | After tasks with unit tests only | `npm --prefix backend test` |
| Full | After all tasks | `npm --prefix backend test` |
| Build | After completion | `npm --prefix backend run build` |

---

## Execution Plan

Phases are ordered and run sequentially - each phase completes before the next begins, and tasks within a phase execute in order.

### Phase 1: Correção de BOLA, Integridade, Infraestrutura e Dependências

Implementação ordenada de verificações de autorização, integridade de faturas, restrição de portas Docker e atualização de bibliotecas.

```
T1 → T2 → T3 → T4 → T5 → T6
```

---

## Task Breakdown

### T1: Prevenção de BOLA na Associação de Contas a Cartões de Crédito (SEC-HIGH-01)

**What**: Atualizar `create` e `update` em `CreditCardsService` para validar que `dto.accountId`, quando informado, exista, não esteja marcado com soft-delete e pertença legitimamente ao mesmo usuário (para cartões pessoais) ou à mesma família (para cartões familiares), lançando `NotFoundException` ou `ForbiddenException`, e atualizar testes unitários.  
**Where**: `backend/src/modules/credit-cards/credit-cards.service.ts`  
**Depends on**: None  
**Reuses**: `backend/src/modules/credit-cards/credit-cards.service.ts`  
**Requirement**: HIGH-01, HIGH-02  

**Tools**:

- Code editor
- Bash terminal

**Done when**:

- [x] Criação e edição de cartão com `accountId` inexistente ou soft-deleted lançam `NotFoundException` ('Conta bancária informada não encontrada').
- [x] Criação e edição de cartão com `accountId` de outro usuário ou família não correspondente lançam `ForbiddenException`.
- [x] Criação e edição de cartão com `accountId` legítimo e compatível persistem com sucesso.
- [x] Testes unitários em `credit-cards.service.spec.ts` cobrem todos os cenários com 100% de sucesso.
- [x] Gate check passes: `npm --prefix backend test -- test/unit/credit-cards.service.spec.ts`

**Tests**: unit  
**Gate**: quick  

---

### T2: Prevenção de BOLA em Categorias Pai e Subcategorias (SEC-HIGH-02)

**What**: Atualizar `create` e `update` em `CategoriesService` para validar que `dto.parentId`, quando informado, exista, não esteja soft-deleted, não seja o próprio ID da categoria (`parentId === id`) e pertença ao sistema (`isSystemDefault === true`) ou ao mesmo usuário/família, lançando `NotFoundException`, `BadRequestException` ou `ForbiddenException`, e atualizar testes unitários.  
**Where**: `backend/src/modules/categories/categories.service.ts`  
**Depends on**: T1  
**Reuses**: `backend/src/modules/categories/categories.service.ts`  
**Requirement**: HIGH-03, HIGH-04, HIGH-05  

**Tools**:

- Code editor
- Bash terminal

**Done when**:

- [ ] Associação de `parentId` inexistente ou soft-deleted lança `NotFoundException` ('Categoria pai não encontrada').
- [ ] Associação de `parentId` igual ao próprio ID da categoria em atualização lança `BadRequestException` ('Uma categoria não pode ser definida como pai de si mesma').
- [ ] Associação de `parentId` privado de outro usuário ou outra família lança `ForbiddenException`.
- [ ] Associação de categoria pai padrão do sistema ou pertencente ao usuário/família persiste normalmente.
- [ ] Testes unitários em `categories.service.spec.ts` passam com 100% de sucesso.
- [ ] Gate check passes: `npm --prefix backend test -- test/unit/categories.service.spec.ts`

**Tests**: unit  
**Gate**: quick  

---

### T3: Bloqueio de Exclusão de Transações em Faturas Fechadas ou Pagas (SEC-HIGH-03)

**What**: Atualizar `remove` em `TransactionsService` para incluir os dados da fatura vinculada (`invoice: true`) e impedir a exclusão se `transaction.invoice.status` for `CLOSED` ou `PAID`, lançando `BadRequestException` ('Não é possível excluir lançamentos de faturas que já foram fechadas ou pagas'), e atualizar testes unitários.  
**Where**: `backend/src/modules/transactions/transactions.service.ts`  
**Depends on**: T2  
**Reuses**: `backend/src/modules/transactions/transactions.service.ts`  
**Requirement**: HIGH-06  

**Tools**:

- Code editor
- Bash terminal

**Done when**:

- [ ] Tentativa de excluir transação vinculada a fatura `CLOSED` lança `BadRequestException`.
- [ ] Tentativa de excluir transação vinculada a fatura `PAID` lança `BadRequestException`.
- [ ] Exclusão de transação vinculada a fatura `OPEN` ou sem fatura continua sendo estornada e marcada com soft-delete normalmente.
- [ ] Testes unitários em `transactions.service.spec.ts` passam com 100% de sucesso.
- [ ] Gate check passes: `npm --prefix backend test -- test/unit/transactions.service.spec.ts`

**Tests**: unit  
**Gate**: quick  

---

### T4: Restrição de Exposição de Portas de Microsserviços no Docker Compose (SEC-HIGH-04)

**What**: Atualizar o mapeamento de portas dos serviços `api` e `frontend` no `docker-compose.yml` para vincular estritamente à interface de loopback (`127.0.0.1:3001:3001` e `127.0.0.1:3000:3000`), impedindo a exposição desprotegida em `0.0.0.0`.  
**Where**: `docker-compose.yml`  
**Depends on**: T3  
**Reuses**: `docker-compose.yml`  
**Requirement**: HIGH-07  

**Tools**:

- Code editor
- Bash terminal

**Done when**:

- [ ] O serviço `api` possui a porta mapeada explicitamente como `"127.0.0.1:3001:3001"`.
- [ ] O serviço `frontend` possui a porta mapeada explicitamente como `"127.0.0.1:3000:3000"`.
- [ ] Validação do arquivo compose com `docker compose config` ou checagem de sintaxe YAML.

**Tests**: integration  
**Gate**: quick  

---

### T5: Remediação de Dependências Vulneráveis no Backend (SEC-HIGH-05)

**What**: Aplicar remediação de dependências vulneráveis no backend executando `npm audit fix` onde seguro e aplicando overrides de segurança no `backend/package.json` para neutralizar CVEs de criticidade alta/crítica sem introduzir regressões.  
**Where**: `backend/package.json`  
**Depends on**: T4  
**Reuses**: `backend/package.json`  
**Requirement**: HIGH-08  

**Tools**:

- Code editor
- Bash terminal

**Done when**:

- [ ] Vulnerabilidade crítica de `tar` e altas de `multer`, `lodash`, `glob` e `js-yaml` tratadas sem quebrar o build.
- [ ] `npm --prefix backend test` e `npm --prefix backend run build` passam sem regressões.
- [ ] Gate check passes: `npm --prefix backend test`

**Tests**: integration  
**Gate**: full  

---

### T6: Remediação de Dependências Vulneráveis no Frontend (SEC-HIGH-05)

**What**: Aplicar remediação de dependências vulneráveis no frontend executando `npm audit fix` no `frontend/package.json` para neutralizar CVEs de `brace-expansion` sem introduzir regressões na compilação Turbopack ou nos testes.  
**Where**: `frontend/package.json`  
**Depends on**: T5  
**Reuses**: `frontend/package.json`  
**Requirement**: HIGH-08  

**Tools**:

- Code editor
- Bash terminal

**Done when**:

- [ ] Vulnerabilidades de `brace-expansion` corrigidas no frontend via `npm audit fix`.
- [ ] Compilação do frontend e execução de testes passam sem erros.
- [ ] Gate check passes: `npm --prefix frontend run build`

**Tests**: integration  
**Gate**: full  
