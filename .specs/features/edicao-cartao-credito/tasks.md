# Edição de Cartão de Crédito - Execution Tasks

## Test Coverage Matrix

| Requirement ID | Acceptance Criterion | Test Location | Test Type |
| -------------- | -------------------- | ------------- | --------- |
| CARD-01 | Atualização de dados do cartão no banco | `backend/test/unit/credit-cards.service.spec.ts` | Unit |
| CARD-02 | Erro 404 ao editar cartão inexistente | `backend/test/unit/credit-cards.service.spec.ts` | Unit |
| CARD-03 | Erro 403 para usuário sem permissão | `backend/test/unit/credit-cards.service.spec.ts` | Unit |
| CARD-04 | Validação dos limites de dias (1 a 31) | `backend/test/unit/credit-cards.service.spec.ts` | Unit |
| CARD-05 | Rejeição de limite <= 0 | `backend/test/unit/credit-cards.service.spec.ts` | Unit |
| CARD-06 | Sincronização de datas na fatura aberta | `backend/test/unit/credit-cards.service.spec.ts` | Unit |
| CARD-07 | Exibição do botão Editar nos cartões | `frontend/src/app/cards/page.tsx` | Visual / Component |
| CARD-08 | Modal pré-preenchido com dados atuais | `frontend/src/app/cards/page.tsx` | Visual / Component |
| CARD-09 | Feedback e atualização reativa após PUT | `frontend/src/app/cards/page.tsx` | Integration / Flow |
| CARD-10 | Desativação com `isActive = false` | `backend/test/unit/credit-cards.service.spec.ts` | Unit |
| CARD-11 | Exclusão física de cartão sem transações | `backend/test/unit/credit-cards.service.spec.ts` | Unit |
| CARD-12 | Bloqueio de exclusão de cartão com transações | `backend/test/unit/credit-cards.service.spec.ts` | Unit |

---

## Gate Check Commands

- Backend Unit Tests: `npm --prefix backend test -- test/unit/credit-cards.service.spec.ts`
- Backend Build: `npm --prefix backend run build`
- Frontend Build / Lint: `npm --prefix frontend run build`

---

## Execution Plan

### Phase 1: Backend API e Regras de Negócio

Implementação de DTOs, métodos de atualização e remoção com guarda de integridade no serviço de cartões, endpoints e testes unitários.

```
T1 → T2 → T3 → T4 → T5
```

### Phase 2: Frontend e Telas de Usuário

Adaptação do painel de cartões para edição inline com modal pré-preenchido, chamada reativa ao backend e validação completa do sistema.

```
T6 → T7
```

---

## Task Breakdown

### Phase 1: Backend API e Regras de Negócio

#### T1: Criação do DTO de Atualização de Cartão [DONE]

**What**: Criar o DTO `UpdateCreditCardDto` com validações via `class-validator` para `name`, `brand`, `creditLimit`, `closingDay`, `dueDay`, `color`, `accountId` e `isActive`.
**Where**: `backend/src/modules/credit-cards/dto/update-credit-card.dto.ts`
**Depends on**: none
**Requirement**: CARD-01, CARD-04, CARD-05, CARD-10
**Tests**: `backend/test/unit/credit-cards.service.spec.ts`
**Gate**: `npm --prefix backend run build`

#### T2: Implementação do Método update no CreditCardsService [DONE]

**What**: Implementar lógica de atualização no `CreditCardsService`, validando propriedade/família e recalculando datas de fechamento e vencimento da fatura aberta atual quando `closingDay` ou `dueDay` forem alterados.
**Where**: `backend/src/modules/credit-cards/credit-cards.service.ts`
**Depends on**: T1
**Requirement**: CARD-01, CARD-02, CARD-03, CARD-06
**Tests**: `backend/test/unit/credit-cards.service.spec.ts`
**Gate**: `npm --prefix backend run build`

#### T3: Implementação do Método remove com Guarda de Integridade [DONE]

**What**: Implementar o método `remove` no `CreditCardsService` que impede a exclusão física se houver transações vinculadas e permite a exclusão caso contrário.
**Where**: `backend/src/modules/credit-cards/credit-cards.service.ts`
**Depends on**: T2
**Requirement**: CARD-11, CARD-12
**Tests**: `backend/test/unit/credit-cards.service.spec.ts`
**Gate**: `npm --prefix backend run build`

#### T4: Exposição dos Endpoints PUT e DELETE no CreditCardsController [DONE]

**What**: Adicionar as rotas `@Put(':id')` e `@Delete(':id')` no `CreditCardsController` com documentação OpenAPI/Swagger e guardas de autenticação.
**Where**: `backend/src/modules/credit-cards/credit-cards.controller.ts`
**Depends on**: T3
**Requirement**: CARD-01, CARD-11
**Tests**: `backend/test/unit/credit-cards.service.spec.ts`
**Gate**: `npm --prefix backend run build`

#### T5: Testes Unitários de Edição e Exclusão no CreditCardsService [DONE]

**What**: Adicionar suíte de testes unitários cobrindo atualização com sucesso, atualização com alteração de fatura aberta, erros 404/403, e exclusão com/sem transações.
**Where**: `backend/test/unit/credit-cards.service.spec.ts`
**Depends on**: T4
**Requirement**: CARD-01, CARD-02, CARD-03, CARD-04, CARD-05, CARD-06, CARD-10, CARD-11, CARD-12
**Tests**: `backend/test/unit/credit-cards.service.spec.ts`
**Gate**: `npm --prefix backend test -- test/unit/credit-cards.service.spec.ts`

---

### Phase 2: Frontend e Telas de Usuário

#### T6: Interface Frontend para Edição de Cartão e Modal

**What**: Adicionar botão "Editar" nos cards da página de cartões, implementar estado de edição e modal com dados pré-preenchidos e chamada a `PUT /credit-cards/:id`.
**Where**: `frontend/src/app/cards/page.tsx`
**Depends on**: T5
**Requirement**: CARD-07, CARD-08, CARD-09
**Tests**: `backend/test/unit/credit-cards.service.spec.ts`
**Gate**: `npm --prefix frontend run build`

#### T7: Verificação Integrada e Validação de Gates

**What**: Executar builds completos e verificação de integridade no backend e frontend garantindo ausência de regressões.
**Where**: `frontend/src/app/cards/page.tsx`
**Depends on**: T6
**Requirement**: CARD-01, CARD-07, CARD-09
**Tests**: `backend/test/unit/credit-cards.service.spec.ts`
**Gate**: `npm --prefix backend test && npm --prefix frontend run build`
