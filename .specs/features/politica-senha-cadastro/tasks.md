# Tasks: Política de Senhas Seguras no Cadastro

## Test Coverage Matrix

> Generated from codebase, project guidelines, and spec - confirm before Execute. Guidelines found: none - strong defaults applied.

| Code Layer | Required Test Type | Coverage Expectation | Location Pattern | Run Command |
| ---------- | ------------------ | -------------------- | ---------------- | ----------- |
| Backend DTO & Utility | unit | All 8 password rules tested + edge cases; 1:1 to spec ACs | `backend/test/unit/register-dto.spec.ts` | `npm --prefix backend test -- test/unit/register-dto.spec.ts` |
| Full Backend Suite | unit & integration | All 28 test suites passing without regressions | `backend/test/**/*.spec.ts` | `npm --prefix backend test` |
| Frontend Registration | manual / build | Type-check and build without errors | `frontend/src/app/register/page.tsx` | `npm --prefix frontend run build` |

---

## Gate Check Commands

- **Backend Unit Gate**: `npm --prefix backend test -- test/unit/register-dto.spec.ts`
- **Backend Full Gate**: `npm --prefix backend test`
- **Frontend Build Gate**: `npm --prefix frontend run build`

---

## Execution Plan

```mermaid
graph TD
    subgraph Phase1 [Phase 1: Backend Security & Validation]
        T1 -> T2
        T2 -> T3
    end
    subgraph Phase2 [Phase 2: Frontend Experience & UI Feedback]
        T4 -> T5
    end
```

---

## Task Breakdown

### Phase 1: Backend Security & Validation

#### T1: Utilitário de Regras de Senha Backend [DONE]
Where: backend/src/common/utils/password-rules.util.ts
Depends on: none
Tests: backend/test/unit/register-dto.spec.ts
Gate: npm --prefix backend test -- test/unit/register-dto.spec.ts

Implementar módulo utilitário contendo verificador de caracteres, regras de complexidade, lista de senhas comuns e funções puras de validação.

#### T2: Validação no RegisterDto Backend
Where: backend/src/modules/auth/dto/register.dto.ts
Depends on: T1
Tests: backend/test/unit/register-dto.spec.ts
Gate: npm --prefix backend test -- test/unit/register-dto.spec.ts

Atualizar `RegisterDto` com anotações e decorador de validação customizado para garantir comprimento (10-128), maiúscula, minúscula, número, caractere especial, ausência de espaços, diferença em relação a usuário/login (e-mail/nome) e bloqueio de senhas comuns.

#### T3: Testes Unitários de Senha RegisterDto
Where: backend/test/unit/register-dto.spec.ts
Depends on: T2
Tests: backend/test/unit/register-dto.spec.ts
Gate: npm --prefix backend test

Expandir a suíte de testes unitários para cobrir exaustivamente cada um dos 8 critérios de senha, casos válidos e edge cases (espaços, maiúsculas/minúsculas, login, senhas comuns).

### Phase 2: Frontend Experience & UI Feedback

#### T4: Utilitário de Regras de Senha Frontend
Where: frontend/src/lib/password-rules.ts
Depends on: T3
Tests: manual verification via build
Gate: npm --prefix frontend run build

Criar módulo utilitário no frontend espelhando os critérios de validação e lista de senhas comuns para avaliação síncrona dos requisitos no cliente.

#### T5: Checklist Visual e Validação na Tela Register
Where: frontend/src/app/register/page.tsx
Depends on: T4
Tests: manual verification via build
Gate: npm --prefix frontend run build

Integrar à tela `/register` um componente de checklist em tempo real com ícones dinâmicos de status para cada regra de senha e bloqueio de submissão com mensagens de erro claras.
