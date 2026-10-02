# Hora e Minuto no Lançamento Specification

## Problem Statement

Atualmente, ao cadastrar um lançamento financeiro (despesa, receita ou transferência), o sistema permite registrar somente a data (dia, mês e ano). Isso impede que os usuários registrem com precisão o momento exato em que a transação ocorreu ao longo do dia e impede a ordenação cronológica precisa dentro do mesmo dia no extrato.

## Goals

- [ ] Permitir a definição opcional de hora e minuto (HH:mm) ao abrir o modal de novo lançamento.
- [ ] Persistir o horário da transação no banco de dados junto da data do lançamento.
- [ ] Exibir o horário de forma legível na coluna de data do extrato financeiro.
- [ ] Ordenar lançamentos do mesmo dia respeitando a hora e minuto informados de forma decrescente.

## Out of Scope

Explicitly excluded. Documented to prevent scope creep.

| Feature | Reason |
| ------- | ------ |
| Conversão automática de fuso horário multi-país complexa | Sistema focado em contexto de finanças familiares com fuso local |
| Alarme ou notificação de agendamento por minuto | Fora do escopo de registro de lançamento |
| Edição em lote de horários de transações legadas | Lançamentos legados mantêm horário padrão sem necessidade de migração manual |

---

## Assumptions & Open Questions

Every ambiguity is resolved or recorded here - nothing is left silently unclear.

| Assumption / decision | Chosen default | Rationale | Confirmed? |
| --------------------- | -------------- | --------- | ---------- |
| Preenchimento inicial do horário no modal | Campo opcional iniciando vazio (ou 00:00) | Usuário solicitou que o preenchimento seja sob demanda e opcional | y |
| Formato de entrada de horário | Seletor e campo no formato HH:mm (24 horas) | Padrão brasileiro de preenchimento horário em navegadores web | y |
| Lançamentos sem horário informado | Sistema aplica horário padrão 12:00:00 | Preserva compatibilidade e ordenação neutra no meio do dia | y |
| Horário em compras parceladas | Horário informado aplicado apenas na 1ª parcela | Parcelas futuras recebem horário padrão 00:00:00 conforme definido pelo usuário | y |
| Exibição na tabela do extrato | Data e hora combinadas na mesma coluna | Apresentação compacta e elegante sem ocupar novas colunas na tabela | y |
| Filtros de data (startDate e endDate) | Abrangem o dia completo de 00:00:00 a 23:59:59.999 | Evita exclusão de lançamentos cadastrados em qualquer horário do dia | y |

**Open questions:** none - all resolved or logged above.

---

## User Stories

### P1: Registro e Exibição de Horário no Lançamento ⭐ MVP

**User Story**: Como usuário do sistema financeiro familiar, eu quero poder informar a hora e o minuto ao abrir e criar um lançamento para que meu extrato reflita a ordem cronológica real dos meus gastos e receitas.

**Why P1**: Núcleo da funcionalidade solicitada pelo usuário para permitir definir o horário do lançamento.

**Acceptance Criteria**:

1. WHEN o usuário abrir o modal de novo lançamento THEN the system SHALL exibir campos ou controle para seleção de data e horário opcional (HH:mm).
2. WHEN o usuário submeter um lançamento com horário preenchido THEN the system SHALL persistir a data e o horário no registro da transação.
3. IF o usuário submeter o lançamento sem preencher o horário THEN the system SHALL salvar a transação com horário padrão neutro de meio-dia (12:00:00).
4. The system SHALL exibir a hora e minuto formatados (HH:mm) junto à data na listagem de transações do extrato quando presentes.
5. The system SHALL ordenar as transações por data e hora de forma decrescente no extrato.

**Independent Test**: Abrir modal de novo lançamento, preencher uma despesa com horário 15:45, salvar e verificar se a transação aparece no extrato com data e 15:45, devidamente ordenada antes de uma transação do mesmo dia às 10:00.

---

### P2: Horário em Transferências e Compras Parceladas

**User Story**: Como usuário, eu quero que transferências entre contas e compras parceladas no cartão respeitem as regras de horário definidas para manter a consistência financeira.

**Why P2**: Garante que os fluxos de transferência e cartão de crédito não percam a informação temporal nem quebrem a lógica das parcelas.

**Acceptance Criteria**:

1. WHEN o usuário criar uma transferência entre contas informando hora e minuto THEN the system SHALL salvar o mesmo horário nas duas pontas (saída e entrada).
2. WHEN o usuário criar uma compra parcelada no cartão de crédito com horário THEN the system SHALL aplicar o horário informado na primeira parcela.
3. WHILE gerando as parcelas subsequentes (parcela 2 em diante) the system SHALL atribuir o horário padrão de início de dia (00:00:00) a essas parcelas futuras.

**Independent Test**: Criar compra parcelada em 2x às 16:20 e verificar que a parcela 1 possui 16:20 e a parcela 2 possui o horário padrão 00:00:00.

---

## Edge Cases

- IF o usuário informar um horário com formato inválido THEN the system SHALL rejeitar a submissão e exibir mensagem de validação no formulário.
- IF houver registros legados anteriores à feature sem horário específico THEN the system SHALL exibi-los no extrato de forma limpa e compatível sem erros de renderização.
- WHEN o usuário aplicar filtro de data inicial e final no extrato THEN the system SHALL incluir transações que ocorram em qualquer horário do dia final selecionado até 23:59:59.

---

## Requirement Traceability

Each requirement gets a unique ID for tracking across design, tasks, and validation.

| Requirement ID | Story | Phase | Status |
| -------------- | ----- | ----- | ------ |
| TIME-01 | P1: Registro e Exibição de Horário no Lançamento | Design | Pending |
| TIME-02 | P1: Registro e Exibição de Horário no Lançamento | Design | Pending |
| TIME-03 | P1: Registro e Exibição de Horário no Lançamento | Design | Pending |
| TIME-04 | P1: Registro e Exibição de Horário no Lançamento | Design | Pending |
| TIME-05 | P1: Registro e Exibição de Horário no Lançamento | Design | Pending |
| TIME-06 | P2: Horário em Transferências e Compras Parceladas | Design | Pending |
| TIME-07 | P2: Horário em Transferências e Compras Parceladas | Design | Pending |
| TIME-08 | P2: Horário em Transferências e Compras Parceladas | Design | Pending |

**Coverage:** 8 total, 8 mapped to requirements, 0 unmapped.

---

## Success Criteria

How we know the feature is successful:

- [ ] Usuário consegue informar hora e minuto no modal de novo lançamento e salvar com sucesso.
- [ ] O extrato exibe a data acompanhada do horário na listagem.
- [ ] Lançamentos no mesmo dia são exibidos em ordem cronológica precisa.
- [ ] Testes automatizados unitários e de integração validam a persistência e ordenação de hora e minuto.
