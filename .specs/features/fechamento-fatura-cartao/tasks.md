# Fechamento de Fatura de Cartão de Crédito - Execution Tasks

## Test Coverage Matrix

| Requirement ID | Acceptance Criterion | Test Location | Test Type |
| -------------- | -------------------- | ------------- | --------- |
| INVOICE-01 | Alocação de despesa no dia de fechamento na próxima fatura | `backend/test/unit/credit-cards.service.spec.ts` | Unit |
| INVOICE-02 | Normalização de datas de transação sem regressão por fuso horário | `backend/test/unit/transactions.service.spec.ts` | Unit |
| INVOICE-03 | Redirecionamento de despesas quando a fatura já estiver CLOSED ou PAID | `backend/test/unit/credit-cards.service.spec.ts` | Unit |
| INVOICE-04 | Transição automática do status da fatura para CLOSED ao atingir closingDate | `backend/test/unit/credit-cards.service.spec.ts` | Unit |
| INVOICE-05 | Preservação do status CLOSED em pagamentos parciais | `backend/test/unit/credit-cards.service.spec.ts` | Unit |
| INVOICE-06 | Inclusão de faturas CLOSED na lista de faturas pendentes do Dashboard | `backend/test/unit/reports.service.spec.ts` | Unit |
| INVOICE-07 | Exibição e estilização dos status traduzidos em português na tela de cartões | `frontend/src/app/cards/page.tsx` | Visual / Component |
| INVOICE-08 | Exibição dos status traduzidos em português no bloco de faturas do Dashboard | `frontend/src/app/page.tsx` | Visual / Component |

---

## Gate Check Commands

- Backend Unit Tests: `npm --prefix backend test -- test/unit/credit-cards.service.spec.ts test/unit/transactions.service.spec.ts test/unit/reports.service.spec.ts`
- Backend Build: `npm --prefix backend run build`
- Frontend Build: `npm --prefix frontend run build`

---

## Execution Plan

### Phase 1: Backend API e Regras de Negócio

Implementação de normalização de datas civis, alocação de compras no ciclo correto, transição automática para fatura fechada, preservação de status e suíte de testes unitários.

```
T1 → T2 → T3 → T4 → T5
```

### Phase 2: Frontend e Telas de Usuário

Tradução dos status de fatura para português, estilização de badges para cada status (Aberta, Fechada, Paga, Vencida) no painel de cartões, modal de detalhes e dashboard.

```
T6 → T7
```

---

## Task Breakdown

### Phase 1: Backend API e Regras de Negócio

#### T1: Normalização de Data Civil nas Transações [DONE]

**What**: Tratar a interpretação de datas de transações únicas e parceladas no `TransactionsService` para fixar o meio-dia local (`12:00:00`) ao receber strings de data no formato `YYYY-MM-DD`, prevenindo regressões de dia causadas pelo fuso horário UTC-3.
**Where**: `backend/src/modules/transactions/transactions.service.ts`
**Depends on**: none
**Requirement**: INVOICE-02
**Tests**: `backend/test/unit/transactions.service.spec.ts`
**Gate**: `npm --prefix backend run build`

#### T2: Alocação no Dia de Fechamento e Faturas Fechadas [DONE]

**What**: Atualizar o método `determineInvoiceForDate` e `getOrCreateInvoice` no `CreditCardsService` para que compras realizadas no dia de fechamento (`day >= card.closingDay`) sejam alocadas na fatura do mês seguinte e para que faturas com status `CLOSED` ou `PAID` não recebam novas despesas.
**Where**: `backend/src/modules/credit-cards/credit-cards.service.ts`
**Depends on**: T1
**Requirement**: INVOICE-01, INVOICE-03
**Tests**: `backend/test/unit/credit-cards.service.spec.ts`
**Gate**: `npm --prefix backend run build`

#### T3: Transição Automática para CLOSED e Preservação de Status [DONE]

**What**: Implementar sincronização de status de faturas vencidas no ciclo (`closingDate <= hoje` transiciona `OPEN` para `CLOSED`) e garantir que pagamentos parciais no método `payInvoice` mantenham o status `CLOSED`.
**Where**: `backend/src/modules/credit-cards/credit-cards.service.ts`
**Depends on**: T2
**Requirement**: INVOICE-04, INVOICE-05
**Tests**: `backend/test/unit/credit-cards.service.spec.ts`
**Gate**: `npm --prefix backend run build`

#### T4: Inclusão de Faturas CLOSED no Resumo do Dashboard

**What**: Ajustar o método `getDashboardSummary` no `ReportsService` para incluir faturas com status `CLOSED` na busca de faturas a pagar (`openInvoices`), permitindo que faturas fechadas sejam visualizadas e pagas a partir do painel inicial.
**Where**: `backend/src/modules/reports/reports.service.ts`
**Depends on**: T3
**Requirement**: INVOICE-06
**Tests**: `backend/test/unit/reports.service.spec.ts`
**Gate**: `npm --prefix backend run build`

#### T5: Testes Unitários de Fechamento, Alocação e Status

**What**: Atualizar os testes unitários do `CreditCardsService`, `TransactionsService` e `ReportsService` validando o comportamento de compras no dia de fechamento (`day >= closingDay`), alocação fora de faturas fechadas e transição de status para `CLOSED`.
**Where**: `backend/test/unit/credit-cards.service.spec.ts`
**Depends on**: T4
**Requirement**: INVOICE-01, INVOICE-02, INVOICE-03, INVOICE-04, INVOICE-05, INVOICE-06
**Tests**: `backend/test/unit/credit-cards.service.spec.ts`
**Gate**: `npm --prefix backend test -- test/unit/credit-cards.service.spec.ts test/unit/transactions.service.spec.ts test/unit/reports.service.spec.ts`

---

### Phase 2: Frontend e Telas de Usuário

#### T6: Tradução de Status e Badges na Tela de Cartões

**What**: Traduzir os status das faturas para português ("Aberta", "Fechada", "Paga", "Vencida") com cores distintas e atualizar a visualização tanto na listagem de cartões quanto no modal de divisão por pessoa em `/cards`.
**Where**: `frontend/src/app/cards/page.tsx`
**Depends on**: T5
**Requirement**: INVOICE-07
**Tests**: `frontend/src/app/cards/page.tsx`
**Gate**: `npm --prefix frontend run build`

#### T7: Tradução dos Status de Fatura no Dashboard

**What**: Atualizar o bloco de faturas do mês no dashboard principal (`/`) para exibir os status traduzidos em português ("Aberta", "Fechada", "Paga", "Vencida") com estilização harmonizada.
**Where**: `frontend/src/app/page.tsx`
**Depends on**: T6
**Requirement**: INVOICE-08
**Tests**: `frontend/src/app/page.tsx`
**Gate**: `npm --prefix frontend run build`
