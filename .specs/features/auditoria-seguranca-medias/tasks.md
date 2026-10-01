# Correção de Vulnerabilidades Médias de Segurança Tasks

## Execution Protocol (MANDATORY -- do not skip)

Implement these tasks with the `tlc-spec-driven` skill: **activate it by name and follow its Execute flow and Critical Rules.** Do not search for skill files by filesystem path. The skill is the source of truth for the full flow (per-task cycle, sub-agent delegation, adequacy review, Verifier, discrimination sensor).

**If the skill cannot be activated, STOP and tell the user - do not proceed without it.**

---

**Spec**: `.specs/features/auditoria-seguranca-medias/spec.md`
**Status**: Ready

---

## Test Coverage Matrix

> Generated from codebase, project guidelines, and spec - confirm before Execute. Guidelines found: `backend/package.json`, `jest.config`.

| Code Layer | Required Test Type | Coverage Expectation | Location Pattern | Run Command |
| ---------- | ------------------ | -------------------- | ---------------- | ----------- |
| Families | unit | Mensagem neutra uniforme em falha de convite | `backend/test/unit/families.service.spec.ts` | `npm --prefix backend test -- test/unit/families.service.spec.ts` |
| Categories | unit | Bloqueio de IDOR/BOLA em categorias privadas | `backend/test/unit/categories.service.spec.ts` | `npm --prefix backend test -- test/unit/categories.service.spec.ts` |
| Auth / Security | unit | Revogação de token no logout e bloqueio na JwtStrategy | `backend/test/unit/auth-security.spec.ts` | `npm --prefix backend test -- test/unit/auth-security.spec.ts` |
| Security / Helmet | unit | Verificação de aplicação do middleware Helmet | `backend/test/unit/helmet-security.spec.ts` | `npm --prefix backend test -- test/unit/helmet-security.spec.ts` |
| Security / Swagger | unit | Supressão de documentação Swagger em produção | `backend/test/unit/swagger-security.spec.ts` | `npm --prefix backend test -- test/unit/swagger-security.spec.ts` |

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

### Phase 1: Correção de Falhas de Severidade Média

Implementação progressiva das mitigações com validação automatizada e commits atômicos.

```
T1 → T2 → T3 → T4 → T5 → T6 → T7
```

---

## Task Breakdown

### T1: Prevenção de Enumeração de E-mails em Famílias

**What**: Modificar `FamiliesService.addMember` para retornar mensagem neutra e uniforme tanto para usuários inexistentes quanto para usuários que já pertencem à família, eliminando o vetor de enumeração de contas.
**Where**: `backend/src/modules/families/families.service.ts`
**Depends on**: None
**Reuses**: `backend/src/modules/families/families.service.ts`
**Requirement**: SECM-01

**Tools**:

- Code editor
- Bash terminal

**Done when**:

- [x] `FamiliesService.addMember` lança `BadRequestException` com mensagem uniforme neutra se o e-mail não existir ou já for membro.
- [x] Mensagens distintas de 404 e 400 são substituídas por resposta consistente.
- [x] Testes unitários cobrem o comportamento uniforme sem vazamento de informação.
- [x] Gate check passes: `npm --prefix backend test -- test/unit/families.service.spec.ts`

**Tests**: unit
**Gate**: quick

---

### T2: Proteção BOLA em Categorias Privadas

**What**: Ajustar `CategoriesService.findById` e `CategoriesController.findOne` para receber o `userId` autenticado e verificar se a categoria pertence ao usuário, à sua família ou se é padrão do sistema (`isSystemDefault`), rejeitando acessos não autorizados com HTTP 403 Forbidden.
**Where**: `backend/src/modules/categories/categories.service.ts`
**Depends on**: T1
**Reuses**: `backend/src/modules/categories/categories.service.ts`
**Requirement**: SECM-02

**Tools**:

- Code editor
- Bash terminal

**Done when**:

- [x] `CategoriesService.findById` valida posse do recurso ou padrão do sistema contra o `userId` requisitante.
- [x] `CategoriesController.findOne` repassa o usuário autenticado para o serviço.
- [x] Requisições para categorias privadas de terceiros retornam `ForbiddenException`.
- [x] Testes unitários cobrem acessos autorizados e bloqueios com 403.
- [x] Gate check passes: `npm --prefix backend test -- test/unit/categories.service.spec.ts`

**Tests**: unit
**Gate**: quick

---

### T3: Invalidação Server-side no Logout com Token Blacklist

**What**: Implementar `TokenBlacklistService` em `backend/src/modules/auth/token-blacklist.service.ts`, integrar no `AuthModule`, expor endpoint `POST /auth/logout` em `AuthController` e validar se o token está revogado na `JwtStrategy`, rejeitando requisições subsequentes com HTTP 401 Unauthorized.
**Where**: `backend/src/modules/auth/token-blacklist.service.ts`
**Depends on**: T2
**Reuses**: `backend/src/modules/auth/auth.module.ts`
**Requirement**: SECM-03

**Tools**:

- Code editor
- Bash terminal

**Done when**:

- [ ] `TokenBlacklistService` gerencia tokens revogados com limpeza periódica baseada na expiração.
- [ ] Endpoint `POST /auth/logout` adiciona o token atual à blacklist.
- [ ] `JwtStrategy.validate` verifica se o token está na blacklist e lança `UnauthorizedException`.
- [ ] Testes unitários cobrem logout e bloqueio de chamadas com token revogado.
- [ ] Gate check passes: `npm --prefix backend test -- test/unit/auth-security.spec.ts`

**Tests**: unit
**Gate**: quick

---

### T4: Armazenamento Seguro de Tokens no Cliente

**What**: Atualizar o frontend (`frontend/src/context/AuthContext.tsx` e `frontend/src/lib/api.ts`) para sincronizar e persistir o token em cookies seguros com flags defensivas (`SameSite=Lax`, `Path=/`, e `Secure` em produção), garantindo também a limpeza completa no logout.
**Where**: `frontend/src/context/AuthContext.tsx`
**Depends on**: T3
**Reuses**: `frontend/src/lib/api.ts`
**Requirement**: SECM-04

**Tools**:

- Code editor
- Bash terminal

**Done when**:

- [ ] `AuthContext` e `api.ts` gravam e leem o token preferencialmente em cookies seguros.
- [ ] O logout no frontend limpa os cookies e aciona `POST /auth/logout` no backend.
- [ ] Gate check passes: `npm --prefix backend run build`

**Tests**: manual
**Gate**: quick

---

### T5: Injeção de Cabeçalhos HTTP Defensivos com Helmet

**What**: Configurar `helmet` no bootstrap de `backend/src/main.ts` para injetar automaticamente cabeçalhos defensivos como `X-Content-Type-Options: nosniff`, `X-Frame-Options` e CSP.
**Where**: `backend/src/main.ts`
**Depends on**: T4
**Reuses**: `backend/src/main.ts`
**Requirement**: SECM-05

**Tools**:

- Code editor
- Bash terminal

**Done when**:

- [ ] `helmet` é registrado globalmente no aplicativo NestJS.
- [ ] Cabeçalhos de segurança padrão são adicionados às respostas HTTP.
- [ ] Testes automatizados validam a presença dos cabeçalhos do Helmet.
- [ ] Gate check passes: `npm --prefix backend test -- test/unit/helmet-security.spec.ts`

**Tests**: unit
**Gate**: quick

---

### T6: Restrição de Exposição da Porta do PostgreSQL

**What**: Atualizar o arquivo `docker-compose.yml` para vincular o mapeamento de portas do banco de dados exclusivamente a `127.0.0.1:${DB_PORT:-5432}:5432`, impedindo binding público em `0.0.0.0`.
**Where**: `docker-compose.yml`
**Depends on**: T5
**Reuses**: `docker-compose.yml`
**Requirement**: SECM-06

**Tools**:

- Code editor
- Bash terminal

**Done when**:

- [ ] Porta do serviço postgres vinculada a `127.0.0.1`.
- [ ] Gate check passes: `git diff docker-compose.yml`

**Tests**: manual
**Gate**: quick

---

### T7: Desativação do Swagger em Produção

**What**: Modificar o bootstrap de `backend/src/main.ts` para condicionar o registro do Swagger (`SwaggerModule.setup('/api/docs', ...)`) apenas se `process.env.APP_ENV !== 'production' && process.env.NODE_ENV !== 'production'`.
**Where**: `backend/src/main.ts`
**Depends on**: T6
**Reuses**: `backend/src/main.ts`
**Requirement**: SECM-07

**Tools**:

- Code editor
- Bash terminal

**Done when**:

- [ ] Swagger só é montado se nenhum dos envs for `production`.
- [ ] Testes unitários validam a regra condicional de montagem do Swagger.
- [ ] Gate check passes: `npm --prefix backend test -- test/unit/swagger-security.spec.ts`

**Tests**: unit
**Gate**: quick

---

## Status Summary

- Total tasks: 7
- Completed: 2
- In Progress: 0
- Pending: 5
