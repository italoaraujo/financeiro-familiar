# Fechamento de Fatura de Cartão de Crédito Specification

## Problem Statement

Atualmente, ao lançar uma despesa no cartão de crédito na exata data de fechamento do cartão, o sistema aloca a despesa na fatura que fecha naquele dia em vez de lançá-la na próxima fatura. Além disso, quando a data atual chega no dia de fechamento, a fatura permanece indefinidamente com status `OPEN`, permitindo que novas despesas continuem sendo inseridas em uma fatura que já deveria estar encerrada. Por fim, os status das faturas são exibidos em inglês (`OPEN`, `PAID`) na interface do usuário e não há representação visual clara para o estado `CLOSED` (Fechada).

## Goals

- [ ] Garantir que despesas realizadas no dia de fechamento (`day >= closingDay`) sejam alocadas automaticamente na próxima fatura.
- [ ] Eliminar distorções de fuso horário UTC ao interpretar datas de transações, assegurando que o dia civil selecionado pelo usuário seja respeitado com exatidão.
- [ ] Atualizar automaticamente o status da fatura de `OPEN` para `CLOSED` quando a data atual alcançar ou ultrapassar a data de fechamento (`hoje >= closingDate`).
- [ ] Impedir que novas despesas sejam inseridas em faturas com status `CLOSED` ou `PAID`, redirecionando-as para a próxima fatura aberta.
- [ ] Assegurar que pagamentos parciais em faturas fechadas mantenham o status `CLOSED`, sem reverter indevidamente para `OPEN`.
- [ ] Incluir faturas com status `CLOSED` na listagem de faturas pendentes de pagamento no dashboard.
- [ ] Traduzir e padronizar os status de fatura para o português em toda a interface do frontend ("Aberta", "Fechada", "Paga", "Vencida") com badges visuais distintas.

## Out of Scope

Explicitly excluded. Documented to prevent scope creep.

| Feature | Reason |
| ------- | ------ |
| Envio de notificações push ou e-mails de fatura fechada | O sistema opera atualmente com atualizações em tela sem provedor externo de mensageria |
| Renegociação ou parcelamento de saldo de fatura fechada | Fora do escopo do fluxo contábil atual de pagamentos parciais ou totais |
| Fechamento contábil manual com bloqueio por senha | O fechamento deve ser automatizado por ciclo de datas conforme regra bancária padrão |

---

## Assumptions & Open Questions

Every ambiguity is resolved or recorded here - nothing is left silently unclear.

| Assumption / decision | Chosen default | Rationale | Confirmed? |
| --------------------- | -------------- | --------- | ---------- |
| Compras no dia de fechamento | Alocar na fatura do mês seguinte quando `day >= closingDay` | Segue a convenção das operadoras de cartão e atende à solicitação explícita do usuário | y |
| Transição para status CLOSED | Atualizar faturas `OPEN` cuja `closingDate <= hoje` para `CLOSED` de forma transparente nas consultas e operações | Garante que o status reflita a realidade cronológica sem depender de jobs em background | y |
| Tentativa de lançamento em fatura fechada | Alocar automaticamente na próxima fatura aberta do cartão | Evita inconsistências de somar valores a uma fatura já consolidada para pagamento | y |
| Pagamento parcial em fatura fechada | Preservar status `CLOSED` caso `paidAmount < totalAmount` | A fatura permanece fechada aguardando o restante do pagamento, não voltando a ser aberta | y |
| Faturas fechadas no Dashboard | Incluir faturas com status `CLOSED` junto com `OPEN` e `OVERDUE` | Faturas fechadas aguardam pagamento antes do vencimento e são prioridade para o usuário | y |
| Nomenclatura dos status na UI | Exibir "Aberta" (OPEN), "Fechada" (CLOSED), "Paga" (PAID) e "Vencida" (OVERDUE) | Nomenclatura bancária brasileira padrão mais intuitiva para famílias | y |

**Open questions:** none - all resolved or logged above (required before the spec is confirmed).

---

## User Stories

### P1: Alocação Correta no Fechamento e Transição Automática de Status ⭐ MVP

**User Story**: As a titular do cartão de crédito ou gestor financeiro familiar, I want que as compras feitas no dia de fechamento entrem na próxima fatura e que faturas vencidas em seu ciclo fechem automaticamente so that eu tenha previsibilidade exata de quanto terei que pagar no mês atual e no próximo.

**Why P1**: Resolve o problema central de conciliação bancária relatado pelo usuário e garante a integridade dos totais de cada fatura.

**Acceptance Criteria**:

1. WHEN uma despesa no cartão de crédito for criada em data cujo dia seja maior ou igual ao dia de fechamento do cartão THEN o sistema SHALL alocar a despesa na fatura do ciclo seguinte.
2. WHEN uma data de transação for informada em formato de data THEN o sistema SHALL preservar o dia civil local sem retroceder a data por conversão UTC.
3. WHEN a data atual for maior ou igual à data de fechamento da fatura e o status da fatura for `OPEN` THEN o sistema SHALL atualizar o status da fatura para `CLOSED`.
4. IF a fatura de referência calculada estiver com status `CLOSED` ou `PAID` THEN o sistema SHALL alocar a despesa na próxima fatura em aberto do cartão.
5. IF uma fatura fechada receber um pagamento parcial THEN o sistema SHALL manter o status da fatura como `CLOSED`.
6. The system SHALL incluir faturas com status `CLOSED` na lista de faturas pendentes de pagamento no resumo do painel principal.

**Independent Test**: Criar um cartão com fechamento no dia 20. Criar despesa no dia 20 e verificar que ela foi alocada na fatura do mês seguinte. Consultar a fatura do mês atual cuja data de fechamento já passou e verificar que o status transitou para `CLOSED`.

---

### P2: Tradução e Identificação Visual dos Status das Faturas na Interface

**User Story**: As a usuário do sistema, I want visualizar os status das faturas em português ("Aberta", "Fechada", "Paga", "Vencida") com cores distintas nos cartões e no dashboard so that eu compreenda imediatamente a situação de cada fatura.

**Why P2**: Melhora a usabilidade e atende ao requisito explícito de apresentar o status "Fechada" e os demais status em português.

**Acceptance Criteria**:

1. WHEN o usuário visualizar os cartões e suas faturas na tela `/cards` THEN o sistema SHALL exibir os status traduzidos em português ("Aberta", "Fechada", "Paga", "Vencida").
2. WHEN a fatura estiver com status `CLOSED` THEN o sistema SHALL exibir badge com rótulo "Fechada" com identificação visual destacada e manter disponível a opção de pagamento.
3. WHEN o usuário visualizar os detalhes da fatura no modal de divisão por pessoa THEN o sistema SHALL exibir o status traduzido em português.
4. WHEN o usuário visualizar o bloco de faturas do mês no dashboard THEN o sistema SHALL exibir o status da fatura traduzido em português.

**Independent Test**: Acessar `/cards` e `/` e verificar visualmente que nenhuma fatura exibe termos em inglês como `OPEN` ou `PAID`, e sim "Aberta", "Fechada" ou "Paga" com suas respectivas cores.

---

## Edge Cases

- IF a compra for parcelada e a primeira parcela cair no dia de fechamento THEN o sistema SHALL alocar a primeira parcela na próxima fatura e as parcelas subsequentes nos meses seguintes sequencialmente.
- IF o dia de fechamento for 31 e o mês tiver menos dias THEN o sistema SHALL considerar o último dia do mês como limite do ciclo.
- IF uma fatura fechada receber pagamento integral THEN o sistema SHALL alterar o status para `PAID` e preencher a data `paidAt`.
- IF um pagamento de fatura for cancelado ou excluído THEN o sistema SHALL restabelecer o status para `CLOSED` caso a data de fechamento já tenha passado, ou `OPEN` caso contrário.

---

## Requirement Traceability

Each requirement gets a unique ID for tracking across design, tasks, and validation.

| Requirement ID | Story | Phase | Status |
| -------------- | ----- | ----- | ------ |
| INVOICE-01 | P1: Alocação Correta no Fechamento e Transição Automática de Status | Tasks | Verified |
| INVOICE-02 | P1: Alocação Correta no Fechamento e Transição Automática de Status | Tasks | Verified |
| INVOICE-03 | P1: Alocação Correta no Fechamento e Transição Automática de Status | Tasks | Verified |
| INVOICE-04 | P1: Alocação Correta no Fechamento e Transição Automática de Status | Tasks | Verified |
| INVOICE-05 | P1: Alocação Correta no Fechamento e Transição Automática de Status | Tasks | Verified |
| INVOICE-06 | P1: Alocação Correta no Fechamento e Transição Automática de Status | Tasks | Verified |
| INVOICE-07 | P2: Tradução e Identificação Visual dos Status das Faturas na Interface | Tasks | Verified |
| INVOICE-08 | P2: Tradução e Identificação Visual dos Status das Faturas na Interface | Tasks | Pending |

**ID format:** `INVOICE-[NUMBER]`

**Status values:** Pending → In Design → In Tasks → Implementing → Verified

**Coverage:** 8 total, 8 mapped to tasks, 0 unmapped

---

## Success Criteria

- [ ] Lançamentos feitos no exato dia de fechamento do cartão são vinculados à fatura seguinte.
- [ ] Faturas com data de fechamento igual ou anterior à data atual são marcadas como `CLOSED`.
- [ ] Faturas com status `CLOSED` não aceitam novas despesas.
- [ ] Dashboard e tela de cartões exibem faturas com status "Aberta", "Fechada", "Paga" e "Vencida" em português.
- [ ] Todos os testes unitários e de integração passam com 100% de sucesso.
