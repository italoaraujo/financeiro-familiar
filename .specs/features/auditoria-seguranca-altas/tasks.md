# Correção de Vulnerabilidades Altas de Segurança Tasks

## Execution Protocol (MANDATORY -- do not skip)

Implement these tasks with the `tlc-spec-driven` skill: **activate it by name and follow its Execute flow and Critical Rules.** Do not search for skill files by filesystem path. The skill is the source of truth for the full flow (per-task cycle, sub-agent delegation, adequacy review, Verifier, discrimination sensor).

**If the skill cannot be activated, STOP and tell the user - do not proceed without it.**

---

**Spec**: `.specs/features/auditoria-seguranca-altas/spec.md`
**Status**: Ready

---

## Test Coverage Matrix

> Generated from codebase, project guidelines, and spec - confirm before Execute. Guidelines found: `backend/package.json`, `jest.config`.

| Code Layer | Required Test Type | Coverage Expectation | Location Pattern | Run Command |
| ---------- | ------------------ | -------------------- | ---------------- | ----------- |
| Common / Utils | unit | Sanitização de caracteres de fórmula em CSV | `backend/test/unit/csv-sanitizer.util.spec.ts` | `npm --prefix backend test -- test/unit/csv-sanitizer.util.spec.ts` |
| Reports | unit | Escape de campos textuais na exportação CSV | `backend/test/unit/reports.service.spec.ts` | `npm --prefix backend test -- test/unit/reports.service.spec.ts` |
| Transactions | unit | Rejeição de parcelas > 72 no DTO e no serviço | `backend/test/unit/transactions.service.spec.ts` | `npm --prefix backend test -- test/unit/transactions.service.spec.ts` |
| Security / Throttler | unit | Configuração do ThrottlerModule e guards | `backend/test/unit/throttler-security.spec.ts` | `npm --prefix backend test -- test/unit/throttler-security.spec.ts` |
| Goals | unit | Bloqueio de conta pessoal em meta familiar | `backend/test/unit/goals.service.spec.ts` | `npm --prefix backend test -- test/unit/goals.service.spec.ts` |

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

### Phase 1: Correção de Falhas de Severidade Alta

Implementação progressiva das mitigações com validação automatizada e commits atômicos.

```
T1 → T2 → T3 → T4 → T5
```

---

## Task Breakdown

### T1: Sanitização contra Injeção de Fórmulas em Exportação CSV

**What**: Criar o utilitário `sanitizeCsvField` em `backend/src/common/utils/csv-sanitizer.util.ts` e aplicá-lo em todos os campos de texto serializados em `ReportsService.exportCsv`, adicionando suíte de testes unitários para validar o desarmamento de fórmulas.
**Where**: `backend/src/common/utils/csv-sanitizer.util.ts`
**Depends on**: None
**Reuses**: `backend/src/common/utils/csv-sanitizer.util.ts`
**Requirement**: SECH-01

**Tools**:

- Code editor
- Bash terminal

**Done when**:

- [x] Utilitário `sanitizeCsvField` prefixa com apóstrofo `'` qualquer valor iniciado por `=`, `+`, `-`, `@`, `\t` ou `\r`.
- [x] Todos os campos textuais de exportação em `ReportsService.exportCsv` são sanitizados.
- [x] Testes unitários do sanitizador e do serviço passam com sucesso.
- [x] Gate check passes: `npm --prefix backend test -- test/unit/csv-sanitizer.util.spec.ts test/unit/reports.service.spec.ts`

**Tests**: unit
**Gate**: quick

---

### T2: Limite Máximo de Parcelas contra Exaustão de Recursos

**What**: Adicionar validação `@Max(72)` no campo `totalInstallments` em `CreateTransactionDto` e validação defensiva em `TransactionsService.create`, impedindo loops de parcelamento descontrolados que gerem negação de serviço e exaustão de conexões transacionais.
**Where**: `backend/src/modules/transactions/dto/create-transaction.dto.ts`
**Depends on**: T1
**Reuses**: `backend/src/modules/transactions/dto/create-transaction.dto.ts`
**Requirement**: SECH-02

**Tools**:

- Code editor
- Bash terminal

**Done when**:

- [x] `CreateTransactionDto` restringe `totalInstallments` a no máximo 72 com mensagem explicativa.
- [x] `TransactionsService.create` valida defensivamente o limite superior de parcelas.
- [x] Testes unitários validam a rejeição de solicitações com mais de 72 parcelas.
- [x] Gate check passes: `npm --prefix backend test -- test/unit/transactions.service.spec.ts`

**Tests**: unit
**Gate**: quick

---

### T3: Implementação de Rate Limiting com Throttler

**What**: Configurar `ThrottlerModule` e `ThrottlerGuard` globalmente em `AppModule` e aplicar restrição específica de 5 requisições por minuto nos endpoints sensíveis `/auth/login` e `/auth/register` em `AuthController`.
**Where**: `backend/src/app.module.ts`
**Depends on**: T2
**Reuses**: `backend/src/app.module.ts`
**Requirement**: SECH-03

**Tools**:

- Code editor
- Bash terminal

**Done when**:

- [x] `ThrottlerModule` está configurado globalmente no NestJS com guard ativo.
- [x] Endpoints de login e cadastro possuem decorator de limitação específica (5 req/min).
- [x] Testes automatizados validam a proteção contra requisições excessivas.
- [x] Gate check passes: `npm --prefix backend test -- test/unit/throttler-security.spec.ts`

**Tests**: unit
**Gate**: quick

---

### T4: Restrição Segura de Origens CORS

**What**: Atualizar a configuração de CORS em `backend/src/main.ts` para restringir as origens permitidas baseadas na variável de ambiente `ALLOWED_ORIGINS` (com fallback seguro para localhost), eliminando o uso inseguro do curinga `origin: '*'` associado a `credentials: true`.
**Where**: `backend/src/main.ts`
**Depends on**: T3
**Reuses**: `backend/src/main.ts`
**Requirement**: SECH-04

**Tools**:

- Code editor
- Bash terminal

**Done when**:

- [x] `main.ts` utiliza lista explícita de origens permitidas via `ALLOWED_ORIGINS`.
- [x] `origin: '*'` com `credentials: true` é completamente removido.
- [x] Arquivos de configuração de ambiente (`.env`, `.env.example`, `docker-compose.yml`) incluem a variável `ALLOWED_ORIGINS`.
- [x] Gate check passes: `npm --prefix backend test` e `npm --prefix backend run build`

**Tests**: unit
**Gate**: quick

---

### T5: Bloqueio BOLA de Contas Pessoais em Metas Familiares

**What**: Corrigir a validação condicional em `GoalsService.create` para exigir estritamente que metas familiares usem contas bancárias da própria família (`account.familyId === dto.familyId`) e metas pessoais usem contas pessoais do usuário (`account.userId === userId && account.familyId === null`), impedindo associação de contas de terceiros.
**Where**: `backend/src/modules/goals/goals.service.ts`
**Depends on**: T4
**Reuses**: `backend/src/modules/goals/goals.service.ts`
**Requirement**: SECH-05

**Tools**:

- Code editor
- Bash terminal

**Done when**:

- [ ] Tentativas de associar contas pessoais a metas familiares são rejeitadas com `ForbiddenException`.
- [ ] Tentativas de associar contas de terceiros a metas pessoais são rejeitadas com `ForbiddenException`.
- [ ] Criação de metas com contas legítimas do mesmo escopo continua funcionando perfeitamente.
- [ ] Testes unitários cobrindo as novas regras de autorização passam com 100% de sucesso.
- [ ] Gate check passes: `npm --prefix backend test -- test/unit/goals.service.spec.ts`

**Tests**: unit
**Gate**: quick
