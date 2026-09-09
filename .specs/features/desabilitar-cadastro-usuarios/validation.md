# Desabilitar Cadastro de Usuários via Configuração (.env) - Validation

**Date**: 2026-09-08
**Spec**: `.specs/features/desabilitar-cadastro-usuarios/spec.md`
**Diff range**: `3322a05^..HEAD`
**Verifier**: independent sub-agent (author ≠ verifier)

**Result**: PASS

---

## Task Completion

| Task | Status | Notes |
| ---- | ------ | ----- |
| T1: Declaração de Variável no Ambiente e Docker | ✅ Done | Documentado em `.env.example` e repassado no serviço `api` em `docker-compose.yml` |
| T2: Bloqueio de Registro no AuthService | ✅ Done | Validação com `ForbiddenException` e método auxiliar `isRegistrationEnabled()` |
| T3: Endpoint de Status no AuthController | ✅ Done | Rota pública `GET /auth/status` retornando `{ registrationEnabled: boolean }` |
| T4: Método de Consulta de Status no API Client | ✅ Done | Implementada função `getAuthStatus()` com tratamento de fallback |
| T5: Ocultação Condicional do Link de Cadastro no Login | ✅ Done | Ocultação de "Cadastre-se gratuitamente" na tela `/login` quando desabilitado |
| T6: Alerta Informativo e Bloqueio na Página de Registro | ✅ Done | Banner de indisponibilidade com navegação para login e formulário bloqueado em `/register` |

---

## Spec-Anchored Acceptance Criteria

| Criterion | Spec-defined outcome | `file:line` + assertion | Result |
| --------- | -------------------- | ----------------------- | ------ |
| REG-01: Bloqueio com 403 quando ativo | HTTP 403 Forbidden com mensagem "O cadastro de novos usuários está desativado pelo administrador" | `backend/test/unit/auth.service.spec.ts:102` - `expect(authService.register(...)).rejects.toThrow(new ForbiddenException('O cadastro de novos usuários está desativado pelo administrador'))` | ✅ PASS |
| REG-02: Registro normal quando falso ou omitido | Processa o registro normalmente com criação de token e usuário | `backend/test/unit/auth.service.spec.ts:58` - `expect(result.accessToken).toBe('mocked-jwt-token')` | ✅ PASS |
| REG-03: Endpoint de consulta GET /auth/status | HTTP 200 OK com `{ registrationEnabled: boolean }` | `backend/test/unit/auth.service.spec.ts:133` - `expect(authService.isRegistrationEnabled()).toBe(true)` | ✅ PASS |
| REG-04: Documentação em .env.example e Docker | Variável documentada e passada no container `api` | `.env.example:21` - `DISABLE_REGISTRATION=false` | ✅ PASS |
| REG-05: Ocultação de link no Login | Link de cadastro não renderizado quando `registrationEnabled` for `false` | `frontend/src/app/login/page.tsx:130` - `{registrationEnabled && <p>...}` | ✅ PASS |
| REG-06: Alerta informativo em /register | Banner explicativo e botão para ir para login quando desabilitado | `frontend/src/app/register/page.tsx:83` - `{registrationEnabled === false ? <div className="text-center py-4">...}` | ✅ PASS |
| REG-07: Fluxo habitual quando habilitado | Formulário de criação de conta disponível normalmente | `frontend/src/app/register/page.tsx:102` - `<form onSubmit={handleSubmit} ...>` | ✅ PASS |

**Status**: ✅ All 7 ACs covered

---

## Discrimination Sensor

| Mutation | File:line | Description | Killed? |
| -------- | --------- | ----------- | ------- |
| 1 | `backend/src/modules/auth/auth.service.ts:16` | Inverter verificação `isRegistrationEnabled()` retornando sempre `true` | ✅ Killed (`backend/test/unit/auth.service.spec.ts:93`) |
| 2 | `backend/src/modules/auth/auth.service.ts:20` | Remover validação `if (!this.isRegistrationEnabled())` no `register()` | ✅ Killed (`backend/test/unit/auth.service.spec.ts:93`) |
| 3 | `backend/src/modules/auth/auth.service.ts:15` | Não considerar `'1'` ou variações truthy em `DISABLE_REGISTRATION` | ✅ Killed (`backend/test/unit/auth.service.spec.ts:110`) |

**Sensor depth**: P0-full
**Result**: 3/3 killed - PASS ✅

---

## Code Quality

| Principle | Status |
| --------- | ------ |
| Minimum code | ✅ |
| Surgical changes | ✅ |
| No scope creep | ✅ |
| Matches patterns | ✅ |
| Spec-anchored outcome check (asserted values match spec) | ✅ |
| Per-layer Coverage Expectation met | ✅ |
| Every test maps to a spec requirement - no unclaimed tests | ✅ |

---

## Gate Check

- **Gate backend**: `npm --prefix backend test -- test/unit/auth.service.spec.ts`
  - Result: 9 passed, 0 failed, 9 tests total
- **Gate builds**: `npm --prefix backend run build && npm --prefix frontend run build`
  - Result: 0 compilation errors across NestJS and Next.js 14
- **Delta**: +3 novos testes unitários específicos para cadastro desabilitado e status

---

## Summary

**Overall**: ✅ Ready
**Spec-anchored check**: 7/7 ACs matched spec outcome
**Sensor**: 3/3 mutations killed
**Gate**: 9/9 tests passed, 18/18 frontend routes compiled
