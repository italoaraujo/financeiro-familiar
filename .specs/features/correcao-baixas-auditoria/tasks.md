# Correção de Vulnerabilidades Baixas e Hardening da Auditoria Tasks

## Execution Protocol (MANDATORY -- do not skip)

Implement these tasks with the `tlc-spec-driven` skill: **activate it by name and follow its Execute flow and Critical Rules.** Do not search for skill files by filesystem path. The skill is the source of truth for the full flow (per-task cycle, sub-agent delegation, adequacy review, Verifier, discrimination sensor).

**If the skill cannot be activated, STOP and tell the user - do not proceed without it.**

---

**Spec**: `.specs/features/correcao-baixas-auditoria/spec.md`  
**Status**: Ready  

---

## Test Coverage Matrix

> Generated from codebase, project guidelines, and spec - confirm before Execute. Guidelines found: `backend/package.json`, `jest.config`.

| Code Layer | Required Test Type | Coverage Expectation | Location Pattern | Run Command |
| ---------- | ------------------ | -------------------- | ---------------- | ----------- |
| Frontend Security Headers | integration | Verificação de headers defensivos no next.config | `frontend/next.config.js` | `npm --prefix frontend run build` |
| Frontend Cookies | unit | Validação de atributo SameSite=Strict e flag Secure | `frontend/src/lib/cookies.ts` | `npm --prefix frontend run build` |
| Interceptors (AuditLog) | unit | Extração segura de IP com proteção contra spoofing | `backend/test/unit/audit-log.interceptor.spec.ts` | `npm --prefix backend test -- test/unit/audit-log.interceptor.spec.ts` |
| Infrastructure (Docker) | integration | Limites de memória e CPU por contêiner | `docker-compose.yml` | `npm --prefix backend test` |
| Documentation & Secrets | unit | Rotação e higienização de segredos | `docs/SECURITY_SECRETS_GUIDE.md` | `npm --prefix backend test` |

## Gate Check Commands

> Generated from codebase - confirm before Execute.

| Gate Level | When to Use | Command |
| ---------- | ----------- | ------- |
| Quick | After tasks with unit tests only | `npm --prefix backend test` |
| Full | After all tasks | `npm --prefix backend test && npm --prefix frontend run build` |
| Build | After completion | `npm --prefix backend run build && npm --prefix frontend run build` |

---

## Execution Plan

Phases are ordered and run sequentially - each phase completes before the next begins, and tasks within a phase execute in order.

### Phase 1: Hardening de Frontend, Interceptores, Infraestrutura e Governança

Implementação ordenada de cabeçalhos HTTP, atributos de cookies, proteção de IP, limites no Compose e guia de segredos.

```
T1 → T2 → T3 → T4 → T5
```

---

## Task Breakdown

### T1: Configuração de Cabeçalhos HTTP Defensivos no Next.js (SEC-LOW-01)

**What**: Configurar a função `async headers()` no `frontend/next.config.js` injetando cabeçalhos de segurança (`X-Frame-Options: DENY`, `X-Content-Type-Options: nosniff`, `Referrer-Policy: strict-origin-when-cross-origin`, `Permissions-Policy`, e `Content-Security-Policy`) para todas as rotas da aplicação web.  
**Where**: `frontend/next.config.js`  
**Depends on**: None  
**Reuses**: `frontend/next.config.js`  
**Requirement**: LOW-01  

**Tools**:

- Code editor
- Bash terminal

**Done when**:

- [x] `frontend/next.config.js` exporta a função assíncrona `headers()` com todos os cabeçalhos de segurança configurados.
- [x] O build do Next.js Turbopack compila com sucesso sem quebras.
- [x] Gate check passes: `npm --prefix frontend run build`

**Tests**: integration  
**Gate**: quick  

---

### T2: Reforço de Atributos de Segurança nos Cookies de Sessão (SEC-LOW-02)

**What**: Atualizar o utilitário `frontend/src/lib/cookies.ts` para aplicar o atributo `SameSite=Strict` e flag `Secure` condicional na gravação e exclusão dos cookies de autenticação do cliente.  
**Where**: `frontend/src/lib/cookies.ts`  
**Depends on**: T1  
**Reuses**: `frontend/src/lib/cookies.ts`  
**Requirement**: LOW-02  

**Tools**:

- Code editor
- Bash terminal

**Done when**:

- [x] `setAuthCookie` e `removeAuthCookie` aplicam `SameSite=Strict`.
- [x] Flag `Secure` é incluída dinamicamente quando a conexão utiliza protocolo HTTPS.
- [x] Gate check passes: `npm --prefix frontend run build`

**Tests**: unit  
**Gate**: quick  

---

### T3: Proteção contra Spoofing de IP no Interceptor de Auditoria (SEC-LOW-03)

**What**: Habilitar `trust proxy` no Express em `backend/src/main.ts` e aprimorar a extração de IP em `AuditLogInterceptor` para priorizar `request.ip`, sanitizar múltiplos IPs em cabeçalhos de proxy e limitar a string a 45 caracteres, atualizando os testes unitários correspondentes.  
**Where**: `backend/src/common/interceptors/audit-log.interceptor.ts`  
**Depends on**: T2  
**Reuses**: `backend/src/common/interceptors/audit-log.interceptor.ts`  
**Requirement**: LOW-03  

**Tools**:

- Code editor
- Bash terminal

**Done when**:

- [x] `main.ts` habilita `trust proxy` na instância NestExpressApplication.
- [x] `AuditLogInterceptor` prioriza `request.ip` e extrai com segurança o primeiro IP em caso de cabeçalhos de proxy.
- [x] Strings de IP com comprimento superior a 45 caracteres são truncadas preventivamente.
- [x] Testes unitários em `audit-log.interceptor.spec.ts` cobrem os novos cenários de sanitização.
- [x] Gate check passes: `npm --prefix backend test -- test/unit/audit-log.interceptor.spec.ts`

**Tests**: unit  
**Gate**: quick  

---

### T4: Definição de Limites de Recursos no Docker Compose (SEC-LOW-04)

**What**: Adicionar diretivas `deploy.resources.limits` com cotas de CPU (`1.0`) e memória RAM (`1024M`) para os serviços `postgres`, `api` e `frontend` no arquivo `docker-compose.yml`, prevenindo ataques de DoS por exaustão de recursos.  
**Where**: `docker-compose.yml`  
**Depends on**: T3  
**Reuses**: `docker-compose.yml`  
**Requirement**: LOW-04  

**Tools**:

- Code editor
- Bash terminal

**Done when**:

- [x] Todos os serviços do `docker-compose.yml` possuem limites de recursos de memória e CPU configurados.
- [x] Gate check passes: `npm --prefix backend test`

**Tests**: integration  
**Gate**: quick  

---

### T5: Guia de Rotação de Segredos e Hardening de Credenciais (SEC-LOW-05)

**What**: Criar o documento `docs/SECURITY_SECRETS_GUIDE.md` contendo procedimentos operacionais de rotação periódica de segredos (`JWT_SECRET`, credenciais de banco de dados, variáveis de ambiente) e regras para evitar commit de credenciais reais.  
**Where**: `docs/SECURITY_SECRETS_GUIDE.md`  
**Depends on**: T4  
**Reuses**: Documentação existente  
**Requirement**: LOW-05  

**Tools**:

- Code editor
- Bash terminal

**Done when**:

- [ ] Documento `docs/SECURITY_SECRETS_GUIDE.md` detalha processos de geração de entropia, rotação e boas práticas DevSecOps.
- [ ] Todos os testes e compilações passam com sucesso.
- [ ] Gate check passes: `npm --prefix backend test && npm --prefix frontend run build`

**Tests**: integration  
**Gate**: full  
