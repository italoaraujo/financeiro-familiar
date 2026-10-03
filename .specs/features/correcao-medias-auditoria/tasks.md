# Correção de Vulnerabilidades de Severidade Média da Auditoria Tasks

## Execution Protocol (MANDATORY -- do not skip)

Implement these tasks with the `tlc-spec-driven` skill: **activate it by name and follow its Execute flow and Critical Rules.** Do not search for skill files by filesystem path. The skill is the source of truth for the full flow (per-task cycle, sub-agent delegation, adequacy review, Verifier, discrimination sensor).

**If the skill cannot be activated, STOP and tell the user - do not proceed without it.**

---

**Spec**: `.specs/features/correcao-medias-auditoria/spec.md`  
**Status**: Ready  

---

## Test Coverage Matrix

> Generated from codebase, project guidelines, and spec - confirm before Execute. Guidelines found: `backend/package.json`, `jest.config`.

| Code Layer | Required Test Type | Coverage Expectation | Location Pattern | Run Command |
| ---------- | ------------------ | -------------------- | ---------------- | ----------- |
| Services (Families) | unit | Prevenção de escalação de privilégios e papel OWNER | `backend/test/unit/families.service.spec.ts` | `npm --prefix backend test -- test/unit/families.service.spec.ts` |
| Auth & DTOs (Register) | unit | Validação de tamanho e complexidade de senha | `backend/test/unit/auth.service.spec.ts` | `npm --prefix backend test -- test/unit/auth.service.spec.ts` |
| Common & DTOs (Input Validation) | unit | Validação de MaxLength em DTOs | `backend/test/unit/` | `npm --prefix backend test` |
| Services (TokenBlacklist) | unit | Persistência durável e verificação de revogação de tokens | `backend/test/unit/token-blacklist.service.spec.ts` | `npm --prefix backend test -- test/unit/token-blacklist.service.spec.ts` |
| Database & Seed | unit | Proteção contra criação de usuário demo fora de dev | `backend/prisma/seed.ts` | `npm --prefix backend test` |
| Infrastructure (Docker) | integration | Execução com usuário node não-root | `backend/Dockerfile`, `frontend/Dockerfile` | `npm --prefix backend test` |
| Compose & Env | integration | Validação de variáveis obrigatórias | `docker-compose.yml` | `npm --prefix backend test` |

## Gate Check Commands

> Generated from codebase - confirm before Execute.

| Gate Level | When to Use | Command |
| ---------- | ----------- | ------- |
| Quick | After tasks with unit tests only | `npm --prefix backend test` |
| Full | After all tasks | `npm --prefix backend test && npm --prefix frontend test` |
| Build | After completion | `npm --prefix backend run build && npm --prefix frontend run build` |

---

## Execution Plan

Phases are ordered and run sequentially - each phase completes before the next begins, and tasks within a phase execute in order.

### Phase 1: Correção de Lógica de Negócio, Autenticação, Persistência e Infraestrutura

Implementação ordenada da segurança de membros familiares, políticas de senha, validação de DTOs, durabilidade de tokens, proteção de seed e hardening Docker.

```
T1 → T2 → T3 → T4 → T5 → T6 → T7
```

---

## Task Breakdown

### T1: Prevenção de Escalação de Privilégios em Membros Familiares (SEC-MED-05)

**What**: Bloquear a atribuição do papel `OWNER` no cadastro de novos membros em `addMember` (rejeitando com `BadRequestException`) e impedir que um `ADMIN` remova outro `ADMIN` em `removeMember` (apenas `OWNER` pode remover administradores), atualizando `FamiliesService` e testes unitários em `families.service.spec.ts`.  
**Where**: `backend/src/modules/families/families.service.ts`  
**Depends on**: None  
**Reuses**: `backend/src/modules/families/families.service.ts`  
**Requirement**: MED-05  

**Tools**:

- Code editor
- Bash terminal

**Done when**:

- [x] Tentativa de adicionar membro com `role: OWNER` lança `BadRequestException`.
- [x] Tentativa de remoção de administrador por outro administrador lança `ForbiddenException`.
- [x] Remoção de administradores por parte do proprietário (`OWNER`) executa com sucesso.
- [x] Testes unitários em `families.service.spec.ts` cobrem todos os novos comportamentos.
- [x] Gate check passes: `npm --prefix backend test -- test/unit/families.service.spec.ts`

**Tests**: unit  
**Gate**: quick  

---

### T2: Reforço da Política de Senhas e Complexidade (SEC-MED-07)

**What**: Atualizar `RegisterDto` no backend para exigir comprimento mínimo de 8 caracteres (`@MinLength(8)`), máximo de 72 caracteres (`@MaxLength(72)`) e composição com letras e números (`@Matches(/^(?=.*[a-zA-Z])(?=.*\d).+$/)`), e alinhar as validações da tela de cadastro no frontend (`frontend/src/app/register/page.tsx`).  
**Where**: `backend/src/modules/auth/dto/register.dto.ts`  
**Depends on**: T1  
**Reuses**: `backend/src/modules/auth/dto/register.dto.ts`  
**Requirement**: MED-07  

**Tools**:

- Code editor
- Bash terminal

**Done when**:

- [x] `RegisterDto` rejeita senhas com menos de 8 caracteres com mensagem clara.
- [x] `RegisterDto` rejeita senhas com mais de 72 caracteres.
- [x] `RegisterDto` rejeita senhas puramente numéricas ou puramente alfabéticas.
- [x] Página de registro do frontend valida localmente o mínimo de 8 caracteres e a presença de letras e números.
- [x] Testes unitários passam: `npm --prefix backend test -- test/unit/auth.service.spec.ts`

**Tests**: unit  
**Gate**: quick  

---

### T3: Validação de Tamanho Máximo em DTOs de Entrada (SEC-MED-06)

**What**: Incluir anotações `@MaxLength()` nos campos de texto de entrada em todos os DTOs do backend (`RegisterDto`, `CreateTransactionDto`, `CreateAccountDto`, `UpdateAccountDto`, `CreateCreditCardDto`, `UpdateCreditCardDto`, `CreateCategoryDto`, `UpdateCategoryDto`, `CreateFamilyDto`, `CreatePersonDto`), prevenindo estouro de tamanho de colunas VarChar do banco de dados e erros HTTP 500.  
**Where**: `backend/src/modules/transactions/dto/create-transaction.dto.ts`  
**Depends on**: T2  
**Reuses**: DTOs existentes  
**Requirement**: MED-06  

**Tools**:

- Code editor
- Bash terminal

**Done when**:

- [x] Todas as propriedades de string possuem `@MaxLength()` coerente com o esquema do PostgreSQL.
- [x] Payloads com textos acima dos limites são rejeitados pelo `ValidationPipe` com HTTP 400.
- [x] Gate check passes: `npm --prefix backend test`

**Tests**: unit  
**Gate**: quick  

---

### T4: Persistência Durável da Blacklist de Tokens JWT (SEC-MED-03)

**What**: Adicionar modelo `RevokedToken` ao schema Prisma com `tokenHash` (SHA-256) e `expiresAt`, gerar client Prisma, atualizar `TokenBlacklistService` para gravar e verificar a revogação no banco de dados mantendo cache em memória, e atualizar `JwtStrategy` e `AuthController` para uso assíncrono.  
**Where**: `backend/src/modules/auth/token-blacklist.service.ts`  
**Depends on**: T3  
**Reuses**: `backend/src/modules/auth/token-blacklist.service.ts`  
**Requirement**: MED-03  

**Tools**:

- Code editor
- Bash terminal

**Done when**:

- [x] Schema do Prisma contém modelo `RevokedToken` com índice em `expiresAt` e `tokenHash` único.
- [x] `TokenBlacklistService.add` armazena hash SHA-256 no banco e no cache de memória.
- [x] `TokenBlacklistService.isBlacklisted` consulta cache e banco assincronamente.
- [x] `JwtStrategy` e `AuthController.logout` operam de forma assíncrona e revogam tokens com sucesso.
- [x] Testes unitários para `TokenBlacklistService` cobrem inclusão, consulta, expiração e persistência.
- [x] Gate check passes: `npm --prefix backend test`

**Tests**: unit  
**Gate**: quick  

---

### T5: Blindagem do Seed em Ambientes Produtivos (SEC-MED-02)

**What**: Atualizar `backend/prisma/seed.ts` para que o fallback de ambiente seja `production`, condicionando a criação do usuário `admin@exemplo.com` / `123456` estritamente a `APP_ENV === 'development'`. Ajustar o comando de execução no `backend/Dockerfile` para não executar seed forçado em instâncias produtivas.  
**Where**: `backend/prisma/seed.ts`  
**Depends on**: T4  
**Reuses**: `backend/prisma/seed.ts`  
**Requirement**: MED-02  

**Tools**:

- Code editor
- Bash terminal

**Done when**:

- [ ] `seed.ts` utiliza `production` como fallback e não cria usuário demo fora de `development`.
- [ ] Inicialização no Dockerfile condiciona execução de seed ao ambiente de desenvolvimento.
- [ ] Gate check passes: `npm --prefix backend test`

**Tests**: unit  
**Gate**: quick  

---

### T6: Execução Segura em Contêineres sem Privilégios Root (SEC-MED-01)

**What**: Adicionar a instrução `USER node` no estágio final (`runner`) de `backend/Dockerfile` e `frontend/Dockerfile`, ajustando a propriedade de arquivos via `COPY --chown=node:node` para garantir que as aplicações executem sob o usuário não-root `node`.  
**Where**: `backend/Dockerfile`  
**Depends on**: T5  
**Reuses**: Dockerfiles existentes  
**Requirement**: MED-01  

**Tools**:

- Code editor
- Bash terminal

**Done when**:

- [ ] `backend/Dockerfile` possui `USER node` e permissões adequadas no estágio de execução.
- [ ] `frontend/Dockerfile` possui `USER node` e permissões adequadas no estágio de execução.
- [ ] Gate check passes: `npm --prefix backend test && npm --prefix frontend test`

**Tests**: integration  
**Gate**: quick  

---

### T7: Eliminação de Fallback Inseguro de Credenciais no Compose (SEC-MED-04)

**What**: Atualizar `docker-compose.yml` para exigir variáveis explícitas de banco de dados (`${DB_USER:?DB_USER obrigatório}` e `${DB_PASSWORD:?DB_PASSWORD obrigatório}`) eliminando os fallbacks inseguros `:-postgres`, e atualizar `.env.example` com orientação de segurança para senhas fortes.  
**Where**: `docker-compose.yml`  
**Depends on**: T6  
**Reuses**: Arquivos de configuração existentes  
**Requirement**: MED-04  

**Tools**:

- Code editor
- Bash terminal

**Done when**:

- [ ] `docker-compose.yml` falha se `DB_USER` ou `DB_PASSWORD` não estiverem definidas no ambiente.
- [ ] `.env.example` orienta a definição obrigatória de credenciais fortes de banco de dados.
- [ ] Build e testes de backend e frontend passam sem erros.
- [ ] Gate check passes: `npm --prefix backend test && npm --prefix frontend test`

**Tests**: integration  
**Gate**: full  
