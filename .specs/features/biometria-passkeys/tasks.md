# Biometria e Passkeys no PWA Tasks

## Execution Protocol (MANDATORY -- do not skip)

Implement these tasks with the `tlc-spec-driven` skill: **activate it by name and follow its Execute flow and Critical Rules.** Do not search for skill files by filesystem path. The skill is the source of truth for the full flow (per-task cycle, sub-agent delegation, adequacy review, Verifier, discrimination sensor).

**If the skill cannot be activated, STOP and tell the user - do not proceed without it.**

---

**Design**: `.specs/features/biometria-passkeys/design.md`  
**Status**: Draft

---

## Test Coverage Matrix

> Generated from codebase, project guidelines, and spec - confirm before Execute. Guidelines found: none - strong defaults applied.

| Code Layer | Required Test Type | Coverage Expectation | Location Pattern | Run Command |
| --- | --- | --- | --- | --- |
| PasskeyService (Domain/Auth) | unit | All branches; 1:1 to spec ACs (BIO-02, BIO-03, BIO-05, BIO-06, BIO-07) | `backend/test/unit/passkey.service.spec.ts` | `npm --prefix backend test` |
| PasskeyController (API Routes) | unit | All routes in scope: register-options, register-verify, login-options, login-verify, credentials | `backend/test/unit/passkey.controller.spec.ts` | `npm --prefix backend test` |
| AuthModule Wiring | unit | Injeção e compilação de módulo com guards e dependências | `backend/test/unit/auth.service.spec.ts` | `npm --prefix backend test` |
| Frontend Components & Hook | none | Build gate only (Next.js Turbopack typecheck + eslint) | `frontend/src/**/*.tsx` | `npm --prefix frontend run build` |
| Entity / Schema | none | Prisma generate e compilação de tipos | `backend/prisma/schema.prisma` | `npm --prefix backend run build` |

---

## Gate Check Commands

> Generated from codebase - confirm before Execute.

| Gate Level | When to Use | Command |
| --- | --- | --- |
| Quick | After tasks with unit tests only | `npm --prefix backend test -- -t "Passkey"` |
| Full | After tasks with e2e/integration tests | `npm --prefix backend test` |
| Build | After phase completion or config/entity-only tasks | `npm --prefix backend run build && npm --prefix frontend run build` |

---

## Execution Plan

Phases are ordered and run sequentially - each phase completes before the next begins, and tasks within a phase execute in order.

### Phase 1: Foundation (Dados & Dependências Backend)

```
T1 -> T2 -> T3
```

### Phase 2: Core Implementation (Serviços, Rotas & Testes)

```
T4 -> T5 -> T6
```

### Phase 3: Integration (Frontend PWA & Interface de Biometria)

```
T7 -> T8 -> T9 -> T10 -> T11
```

---

## Task Breakdown

### Phase 1: Foundation (Dados & Dependências Backend)

### T1: Instalar @simplewebauthn/server no backend

**What**: Adicionar a dependência `@simplewebauthn/server` no backend NestJS  
**Where**: `backend/package.json`  
**Depends on**: None  
**Reuses**: Arquitetura monorepo npm  
**Requirement**: BIO-02  
**Tests**: none  
**Gate**: Build  

**Done when**:
- [x] `@simplewebauthn/server` presente nas dependencies de `backend/package.json`

### T2: Adicionar modelos UserPasskey e AuthChallenge no Prisma schema

**What**: Criar modelos relacionais `UserPasskey` e `AuthChallenge` no arquivo de schema do Prisma  
**Where**: `backend/prisma/schema.prisma`  
**Depends on**: T1  
**Reuses**: Modelo `User` existente  
**Requirement**: BIO-03  
**Tests**: none  
**Gate**: Build  

**Done when**:
- [x] Modelos `UserPasskey` e `AuthChallenge` adicionados com campos de credencial, chave pública e counter

### T3: Aplicar migration e gerar client Prisma

**What**: Criar migration SQL para as novas tabelas e executar prisma generate  
**Where**: `backend/prisma/migrations/20261005_add_user_passkeys/migration.sql`  
**Depends on**: T2  
**Reuses**: Prisma ORM migrations  
**Requirement**: BIO-03  
**Tests**: none  
**Gate**: Build  

**Done when**:
- [x] Tabelas `user_passkeys` e `auth_challenges` criadas no banco e Prisma Client atualizado

---

### Phase 2: Core Implementation (Serviços, Rotas & Testes)

### T4: Implementar PasskeyService com lógica FIDO2 e testes unitários

**What**: Criar serviço para geração e validação de desafios de registro e autenticação WebAuthn  
**Where**: `backend/src/modules/auth/passkey.service.ts`  
**Depends on**: T3  
**Reuses**: `PrismaService`, `JwtService`  
**Requirement**: BIO-02, BIO-03, BIO-05, BIO-06, BIO-07  
**Tests**: `backend/test/unit/passkey.service.spec.ts`  
**Gate**: Quick  

**Done when**:
- [x] Lógica de geração de opções e verificação criptográfica implementada com prevenção a replay attack
- [x] Testes unitários cobrindo cenários de sucesso, erro de assinatura e desafio expirado

### T5: Implementar PasskeyController com endpoints REST e testes

**What**: Criar controller com rotas para registro, login e gerenciamento de biometrias  
**Where**: `backend/src/modules/auth/passkey.controller.ts`  
**Depends on**: T4  
**Reuses**: `JwtAuthGuard`, `GetUser`, `@Throttle`  
**Requirement**: BIO-01, BIO-04, BIO-09, BIO-10, BIO-11  
**Tests**: `backend/test/unit/passkey.controller.spec.ts`  
**Gate**: Quick  

**Done when**:
- [x] Endpoints `/auth/passkey/register-options`, `/auth/passkey/register-verify`, `/auth/passkey/login-options`, `/auth/passkey/login-verify` e `/auth/passkey/credentials` implementados
- [x] Testes unitários validando chamadas e respostas do controller

### T6: Conectar PasskeyService e PasskeyController no AuthModule

**What**: Registrar o novo serviço e controller no módulo de autenticação do NestJS  
**Where**: `backend/src/modules/auth/auth.module.ts`  
**Depends on**: T5  
**Reuses**: `AuthModule`  
**Requirement**: BIO-01, BIO-04  
**Tests**: `backend/test/unit/auth.service.spec.ts`  
**Gate**: Quick  

**Done when**:
- [x] `PasskeyService` e `PasskeyController` exportados e registrados em `AuthModule`

---

### Phase 3: Integration (Frontend PWA & Interface de Biometria)

### T7: Instalar @simplewebauthn/browser no frontend

**What**: Adicionar a dependência `@simplewebauthn/browser` no Next.js  
**Where**: `frontend/package.json`  
**Depends on**: T6  
**Reuses**: Ecossistema npm do frontend  
**Requirement**: BIO-01  
**Tests**: none  
**Gate**: Build  

**Done when**:
- [x] Pacote `@simplewebauthn/browser` presente em `frontend/package.json`

### T8: Implementar hook useBiometrics para WebAuthn no frontend

**What**: Criar hook para detecção de autenticador de plataforma, registro e login biométrico  
**Where**: `frontend/src/hooks/useBiometrics.ts`  
**Depends on**: T7  
**Reuses**: `apiRequest`, `AuthContext`  
**Requirement**: BIO-01, BIO-04, BIO-05, BIO-09, BIO-10  
**Tests**: none  
**Gate**: Build  

**Done when**:
- [x] Hook encapsulando `startRegistration` e `startAuthentication` com tratamento seguro de erros

### T9: Integrar botão de login biométrico na página de login

**What**: Adicionar botão "Entrar com Biometria" com leitor de plataforma na tela de login  
**Where**: `frontend/src/app/login/page.tsx`  
**Depends on**: T8  
**Reuses**: Formulário de login e layout Tailwind existentes  
**Requirement**: BIO-04, BIO-08  
**Tests**: none  
**Gate**: Build  

**Done when**:
- [x] Botão de biometria renderizado condicionalmente quando suportado e autenticação funcional

### T10: Criar modal de gerenciamento de biometria nas configurações do usuário

**What**: Criar componente para listar e revogar dispositivos biométricos cadastrados  
**Where**: `frontend/src/components/profile/BiometricsSettingsModal.tsx`  
**Depends on**: T9  
**Reuses**: Componentes modais e botões do sistema  
**Requirement**: BIO-01, BIO-09, BIO-10, BIO-11  
**Tests**: none  
**Gate**: Build  

**Done when**:
- [x] Modal permitindo cadastrar o aparelho atual e excluir credenciais antigas

### T11: Integrar gatilho de configurações de biometria no cabeçalho/AppShell

**What**: Adicionar opção de acesso às configurações de biometria no menu de perfil do usuário  
**Where**: `frontend/src/components/layout/AppShell.tsx`  
**Depends on**: T10  
**Reuses**: Header e menu de usuário existentes  
**Requirement**: BIO-01  
**Tests**: none  
**Gate**: Build  

**Done when**:
- [x] Item "Biometria e Dispositivos" visível no menu do usuário e abrindo o modal de gerenciamento
