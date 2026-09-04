# Logs de Auditoria e Ações do Sistema Tasks

## Execution Protocol (MANDATORY -- do not skip)

Implement these tasks with the `tlc-spec-driven` skill: **activate it by name and follow its Execute flow and Critical Rules.** Do not search for skill files by filesystem path. The skill is the source of truth for the full flow (per-task cycle, sub-agent delegation, adequacy review, Verifier, discrimination sensor).

**If the skill cannot be activated, STOP and tell the user - do not proceed without it.**

---

**Design**: `.specs/features/logs/design.md`
**Status**: Draft

---

## Test Coverage Matrix

> Generated from codebase, project guidelines, and spec - confirm before Execute. Guidelines found: `backend/package.json` (Jest runner).

| Code Layer | Required Test Type | Coverage Expectation | Location Pattern | Run Command |
| ---------- | ------------------ | -------------------- | ---------------- | ----------- |
| Schema / Database | none | Build gate & prisma generate verification | `backend/prisma/schema.prisma` | `npm --prefix backend run prisma:generate` |
| Utility (Sanitizer) | unit | Testes unitários com objetos aninhados, arrays e tipos primitivos | `backend/test/unit/sanitizer.util.spec.ts` | `npm --prefix backend test -- test/unit/sanitizer.util.spec.ts` |
| Service (AuditLogsService) | unit | Gravação resiliente, busca com filtros, paginação e isolamento de tenant | `backend/test/unit/audit-logs.service.spec.ts` | `npm --prefix backend test -- test/unit/audit-logs.service.spec.ts` |
| Interceptor (AuditLogInterceptor) | unit | Interceptação de POST/PUT/PATCH/DELETE, sanitização e captura de erro | `backend/test/unit/audit-log.interceptor.spec.ts` | `npm --prefix backend test -- test/unit/audit-log.interceptor.spec.ts` |
| Controller (AuditLogsController) | unit | Controle de acesso RBAC (OWNER/ADMIN vs MEMBER) e rotas de consulta | `backend/test/unit/audit-logs.controller.spec.ts` | `npm --prefix backend test -- test/unit/audit-logs.controller.spec.ts` |
| Integration Flow | integration | Fluxo ponta a ponta: mutação via endpoint gravando log sanitizado e consulta restrita | `backend/test/integration/audit-flow.spec.ts` | `npm --prefix backend test -- test/integration/audit-flow.spec.ts` |

---

## Gate Check Commands

> Generated from codebase - confirm before Execute.

| Gate Level | When to Use | Command |
| ---------- | ----------- | ------- |
| Quick | Após tarefas com testes unitários específicos | `npm --prefix backend test -- [caminho_do_teste]` |
| Full | Após tarefas de integração | `npm --prefix backend test` |
| Build | Após conclusão de fases ou entidades do banco | `npm --prefix backend run build` |

---

## Execution Plan

Phases are ordered and run sequentially - each phase completes before the next begins, and tasks within a phase execute in order.

### Phase 1: Database Schema & Model

Modelagem do enum `AuditAction`, modelo `AuditLog` no Prisma Schema e geração do client.

```
T1
```

### Phase 2: Sanitização e Serviço de Auditoria

Criação do utilitário recursivo de sanitização e implementação do `AuditLogsService` resiliente com métodos de consulta.

```
T2 → T3
```

### Phase 3: Interceptor Global de Auditoria

Criação e testes unitários do interceptor global de auditoria para capturar requisições mutativas.

```
T4
```

### Phase 4: Controller e Teste de Fluxo Integrado

Implementação do controller com controle de acesso RBAC, registro no `AppModule` e testes de fluxo integrados.

```
T5 → T6
```

---

## Task Breakdown

### Phase 1: Database Schema & Model

### T1: Modelagem e Índices de AuditLog no Prisma Schema [DONE]

**What**: Adicionar enum `AuditAction`, modelo `AuditLog` com campos de metadados, payload JSONB e índices em `schema.prisma`, e gerar o Prisma Client.
**Where**: `backend/prisma/schema.prisma`
**Depends on**: none
**Requirement**: LOGS-01
**Tools**:
- MCP: `filesystem`
- Skill: NONE

**Done when**:
- [x] Enum `AuditAction` e model `AuditLog` adicionados com mapeamento para tabela `audit_logs`
- [x] Campos `userId`, `familyId`, `entityName`, `entityId`, `action`, `method`, `endpoint`, `ipAddress`, `userAgent`, `statusCode`, `durationMs`, `oldData`, `newData`, `metadata` e `createdAt` definidos
- [x] Índices compostos criados para `[userId, createdAt]`, `[familyId, createdAt]`, `[entityName, entityId]` e `[action, createdAt]`
- [x] `npx prisma generate` executado com sucesso gerando os tipos no client
- [x] Gate check passes: `npm --prefix backend run build`

**Tests**: none
**Gate**: build

---

### Phase 2: Sanitização e Serviço de Auditoria

### T2: Utilitário de Sanitização Recursiva de Payloads [DONE]

**What**: Criar a função utilitária `sanitizePayload` para mascarar recursivamente campos sensíveis (como senhas, tokens, hashes e secrets) com `[REDACTED]`, acompanhada de testes unitários.
**Where**: `backend/src/common/utils/sanitizer.util.ts`
**Depends on**: T1
**Requirement**: LOGS-03
**Tools**:
- MCP: `filesystem`
- Skill: NONE

**Done when**:
- [x] Utilitário exporta `sanitizePayload` tratando recursivamente objetos e arrays
- [x] Campos sensíveis (`password`, `token`, `refreshToken`, `passwordHash`, `secret`, etc.) são mascarados
- [x] Testes unitários em `sanitizer.util.spec.ts` cobrem objetos planos, objetos aninhados, arrays, dados primitivos e referências circulares
- [x] Gate check passes: `npm --prefix backend test -- test/unit/sanitizer.util.spec.ts`

**Tests**: unit
**Gate**: quick

---

### T3: Implementar AuditLogsService Resiliente com Queries [DONE]

**What**: Implementar `AuditLogsService` contendo gravação assíncrona não-bloqueante (try/catch seguro), consulta paginada com filtros (`findAll`) e busca individual (`findById`).
**Where**: `backend/src/modules/audit-logs/audit-logs.service.ts`
**Depends on**: T2
**Requirement**: LOGS-01, LOGS-04, LOGS-06, LOGS-07, LOGS-08
**Tools**:
- MCP: `filesystem`
- Skill: NONE

**Done when**:
- [x] `createLog` persiste no banco via Prisma sem propagar erro caso ocorra falha de I/O
- [x] `findAll` aplica paginação e filtros opcionais (`familyId`, `userId`, `entityName`, `action`, período)
- [x] `findById` busca o log por UUID e valida consistência
- [x] Testes unitários em `audit-logs.service.spec.ts` validam sucesso, resiliência na falha e filtros de busca
- [x] Gate check passes: `npm --prefix backend test -- test/unit/audit-logs.service.spec.ts`

**Tests**: unit
**Gate**: quick

---

### Phase 3: Interceptor Global de Auditoria

### T4: Implementar AuditLogInterceptor [DONE]

**What**: Criar `AuditLogInterceptor` interceptando requisições mutativas (`POST`, `PUT`, `PATCH`, `DELETE`), sanitizando o body e disparando gravação assíncrona em `AuditLogsService`.
**Where**: `backend/src/common/interceptors/audit-log.interceptor.ts`
**Depends on**: T3
**Requirement**: LOGS-02, LOGS-03, LOGS-04, LOGS-05
**Tools**:
- MCP: `filesystem`
- Skill: NONE

**Done when**:
- [x] Métodos `POST`, `PUT`, `PATCH`, `DELETE` disparam registro de auditoria com cálculo de latência e status code
- [x] Métodos de leitura (`GET`, `OPTIONS`, `HEAD`) são ignorados pelo interceptor
- [x] Payload é sanitizado antes de enviar ao `AuditLogsService`
- [x] `userId` e `familyId` são capturados do request context quando disponíveis
- [x] Testes unitários em `audit-log.interceptor.spec.ts` passam com sucesso
- [x] Gate check passes: `npm --prefix backend test -- test/unit/audit-log.interceptor.spec.ts`

**Tests**: unit
**Gate**: quick

---

### Phase 4: Controller e Teste de Fluxo Integrado

### T5: Implementar AuditLogsController com RBAC [DONE]

**What**: Criar `AuditLogsController` com rotas `GET /audit-logs` e `GET /audit-logs/:id`, decoradores Swagger e regras de autorização para `OWNER`/`ADMIN` da família e usuário comum.
**Where**: `backend/src/modules/audit-logs/audit-logs.controller.ts`
**Depends on**: T4
**Requirement**: LOGS-06, LOGS-07, LOGS-08
**Tools**:
- MCP: `filesystem`
- Skill: NONE

**Done when**:
- [x] Endpoint `GET /audit-logs` aceita query params (`page`, `limit`, `familyId`, `action`, `entityName`)
- [x] Usuário que não é `OWNER` ou `ADMIN` é impedido de consultar logs da família (`403 Forbidden`)
- [x] Consulta sem `familyId` filtra estritamente as ações do próprio usuário logado
- [x] Endpoint `GET /audit-logs/:id` retorna detalhes do log para usuário autorizado
- [x] Testes unitários em `audit-logs.controller.spec.ts` validam sucesso e cenários de permissão
- [x] Gate check passes: `npm --prefix backend test -- test/unit/audit-logs.controller.spec.ts`

**Tests**: unit
**Gate**: quick

---

### T6: Registrar Módulo e Interceptor no AppModule e Teste de Fluxo [DONE]

**What**: Registrar `AuditLogsModule` e `AuditLogInterceptor` no `AppModule` e criar teste de integração validando o ciclo ponta a ponta de mutação de API gerando log e consulta protegida.
**Where**: `backend/test/integration/audit-flow.spec.ts`
**Depends on**: T5
**Requirement**: LOGS-01, LOGS-02, LOGS-03, LOGS-04, LOGS-05, LOGS-06, LOGS-07, LOGS-08
**Tools**:
- MCP: `filesystem`
- Skill: NONE

**Done when**:
- [x] `AuditLogsModule` e `APP_INTERCEPTOR` registrados no `AppModule`
- [x] Teste de integração valida que mutação em endpoint (`POST /accounts` ou similar) grava registro em `audit_logs`
- [x] Teste confirma que payload foi sanitizado e tempo de resposta registrado
- [x] Teste valida consulta `GET /audit-logs` retornando o registro gravado
- [x] Gate check passes: `npm --prefix backend test`

**Tests**: integration
**Gate**: full

---

## Phase Execution Map

Visual representation of task ordering. Phases run in sequence, and tasks within a phase run in order:

```
Phase 1 → Phase 2 → Phase 3 → Phase 4

Phase 1:  T1
Phase 2:  T2 ------→ T3
Phase 3:  T4
Phase 4:  T5 ------→ T6
```

---

## Task Granularity Check

| Task | Scope | Status |
| ---- | ----- | ------ |
| T1: Schema e Índices | 1 arquivo de modelo Prisma | ✅ Granular |
| T2: Utilitário Sanitizer | 1 utilitário + teste unitário | ✅ Granular |
| T3: AuditLogsService | 1 service + teste unitário | ✅ Granular |
| T4: AuditLogInterceptor | 1 interceptor + teste unitário | ✅ Granular |
| T5: AuditLogsController | 1 controller + teste unitário | ✅ Granular |
| T6: Fluxo Integrado e Módulo | Registro no AppModule + teste de integração | ✅ Granular |

---

## Diagram-Definition Cross-Check

| Task | Depends On (task body) | Diagram Shows | Status |
| ---- | ---------------------- | ------------- | ------ |
| T1 | None | None | ✅ Match |
| T2 | T1 (cross-phase) | None (cross-phase) | ✅ Match |
| T3 | T2 | T2 -> T3 | ✅ Match |
| T4 | T3 (cross-phase) | None (cross-phase) | ✅ Match |
| T5 | T4 (cross-phase) | None (cross-phase) | ✅ Match |
| T6 | T5 | T5 -> T6 | ✅ Match |

---

## Test Co-location Validation

| Task | Code Layer Created/Modified | Matrix Requires | Task Says | Status |
| ---- | --------------------------- | --------------- | --------- | ------ |
| T1: Schema e Índices | Schema / Database | none | none | ✅ OK |
| T2: Utilitário Sanitizer | Utility (Sanitizer) | unit | unit | ✅ OK |
| T3: AuditLogsService | Service (AuditLogsService) | unit | unit | ✅ OK |
| T4: AuditLogInterceptor | Interceptor (AuditLogInterceptor) | unit | unit | ✅ OK |
| T5: AuditLogsController | Controller (AuditLogsController) | unit | unit | ✅ OK |
| T6: Fluxo Integrado e Módulo | Integration Flow | integration | integration | ✅ OK |
