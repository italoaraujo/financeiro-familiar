# Correção de Vulnerabilidades de Severidade Média da Auditoria Validation

**Date**: 2026-10-03  
**Spec**: `.specs/features/correcao-medias-auditoria/spec.md`  
**Diff range**: `feature/correcao-medias-auditoria`  
**Verifier**: independent verification pass (author ≠ verifier)  

---

## Task Completion

| Task | Status | Notes |
| ---- | ------ | ----- |
| T1: Prevenção de Escalação de Privilégios em Membros Familiares (SEC-MED-05) | ✅ Done | Rejeição de role OWNER em `addMember` e bloqueio de remoção entre ADMINs em `removeMember` |
| T2: Reforço da Política de Senhas e Complexidade (SEC-MED-07) | ✅ Done | Validação com MinLength(8), MaxLength(72) e Matches em `RegisterDto` e alinhamento no frontend |
| T3: Validação de Tamanho Máximo em DTOs de Entrada (SEC-MED-06) | ✅ Done | Adição sistemática de `@MaxLength()` em DTOs de transações, contas, cartões, categorias e famílias |
| T4: Persistência Durável da Blacklist de Tokens JWT (SEC-MED-03) | ✅ Done | Criação do modelo `RevokedToken` (SHA-256) no Prisma e persistência durável em `TokenBlacklistService` |
| T5: Blindagem do Seed em Ambientes Produtivos (SEC-MED-02) | ✅ Done | Fallback padrão `production` em `seed.ts` e bloqueio de execução cega de seed no Dockerfile |
| T6: Execução Segura em Contêineres sem Privilégios Root (SEC-MED-01) | ✅ Done | Inserção de `USER node` e permissões com `COPY --chown=node:node` nos Dockerfiles de backend e frontend |
| T7: Eliminação de Fallback Inseguro de Credenciais no Compose (SEC-MED-04) | ✅ Done | Remoção de `:-postgres` e exigência de variáveis `:?` para `DB_USER` e `DB_PASSWORD` no Compose |

---

## Spec-Anchored Acceptance Criteria

| Criterion (WHEN X THEN Y) | Spec-defined outcome | `file:line` + assertion | Result |
| ------------------------- | -------------------- | ----------------------- | ------ |
| WHEN Dockerfiles compilados THEN executar sob usuário node (MED-01) | Diretiva `USER node` no runner stage | `backend/Dockerfile:27` e `frontend/Dockerfile:35` | ✅ PASS |
| IF APP_ENV !== development THEN ignorar criação de demo user (MED-02) | Fallback production e skip de demo user | `backend/prisma/seed.ts:51` e `backend/test/unit/seed-hardening.spec.ts:24` | ✅ PASS |
| WHEN logout executado THEN persistir hash do token revogado no DB (MED-03) | Upsert de RevokedToken com hash SHA-256 e expiração | `backend/src/modules/auth/token-blacklist.service.ts:31` e `backend/test/unit/auth-security.spec.ts:98` | ✅ PASS |
| IF DB_USER ou DB_PASSWORD ausentes THEN Compose rejeita inicialização (MED-04) | Diretiva `:?Variavel DB_... obrigatoria` | `docker-compose.yml:8-9` e `docker-compose.yml:20` | ✅ PASS |
| IF convite com role OWNER ou ADMIN removendo ADMIN THEN rejeita (MED-05) | HTTP 400 em convite OWNER e HTTP 403 entre ADMINs | `backend/src/modules/families/families.service.ts:119` e `backend/test/unit/families.service.spec.ts:130` | ✅ PASS |
| IF payload excede limite de caracteres THEN rejeita com HTTP 400 (MED-06) | Validação via class-validator MaxLength | `backend/src/modules/transactions/dto/create-transaction.dto.ts:32` e `backend/test/unit/dto-maxlength-validation.spec.ts:18` | ✅ PASS |
| IF senha possui < 8 chars, > 72 chars ou sem letras/números THEN rejeita (MED-07) | Rejeição no RegisterDto com mensagem instrutiva | `backend/src/modules/auth/dto/register.dto.ts:18-24` e `backend/test/unit/register-dto.spec.ts:20` | ✅ PASS |

**Status**: ✅ All ACs covered

---

## Discrimination Sensor

| Mutation | File:line | Description | Killed? |
| -------- | --------- | ----------- | ------- |
| 1 | `backend/src/modules/families/families.service.ts:119` | Remover checagem `if (dto.role === FamilyMemberRole.OWNER)` | ✅ Killed (teste de adição com role OWNER falha) |
| 2 | `backend/src/modules/auth/dto/register.dto.ts:18` | Alterar `@MinLength(8)` para `@MinLength(4)` | ✅ Killed (teste de senha com menos de 8 caracteres falha) |

**Sensor depth**: lightweight  
**Result**: 2/2 mutations killed - PASS  

---

## Code Quality

| Principle | Status |
| --------- | ------ |
| Minimum code | ✅ PASS |
| Surgical changes | ✅ PASS |
| No scope creep | ✅ PASS |
| Matches patterns | ✅ PASS |
| Spec-anchored outcome check (asserted values match spec) | ✅ PASS |
| Per-layer Coverage Expectation met | ✅ PASS |
| Every test maps to a spec requirement | ✅ PASS |
| Documented guidelines followed | ✅ PASS |

---

## Gate Check

- **Gate commands**:
  - `npm --prefix backend test` (27 suítes de teste, 272 testes passando)
  - `npm --prefix backend run build` (Compilação NestJS concluída com sucesso)
  - `npm --prefix frontend run build` (Compilação Next.js Turbopack concluída com sucesso)
- **Result**: 27 test suites passed, 272 tests passed, 0 failed, 0 skipped
- **Test count before feature**: 249
- **Test count after feature**: 272
- **Delta**: +23 new tests
- **Skipped tests**: none
- **Failures**: none

---

## Summary

**Overall**: ✅ PASS

**Spec-anchored check**: 7/7 ACs matched spec outcome  
**Sensor**: 2/2 mutations killed  
**Gate**: PASS (todos os 272 testes e builds de backend e frontend concluídos com sucesso)  
