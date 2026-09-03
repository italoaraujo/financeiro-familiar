# Atribuição de Pessoa a Lançamentos e Membros Sem Login Specification

## Problem Statement

No gerenciamento financeiro familiar, é frequente que um membro titular empreste seu cartão de crédito ou realize pagamentos em nome de outras pessoas da família (ex: filhos, cônjuge ou dependentes que muitas vezes não possuem acesso ou e-mail/login próprio no aplicativo). Atualmente, o sistema só permite associar membros que possuam conta de usuário ativa cadastrada previamente via e-mail e não permite vincular um responsável específico a cada transação ou compra no cartão, impossibilitando identificar quem foi o responsável por cada despesa na fatura e quanto cada indivíduo consumiu.

## Goals

- [ ] Permitir o cadastro de pessoas/dependentes no grupo familiar sem exigência de conta ou login no sistema (apenas nome e cor/identificador).
- [ ] Possibilitar atribuir qualquer transação (despesa de cartão, conta corrente ou receita) a uma pessoa do grupo familiar (com ou sem login).
- [ ] Replicar automaticamente a atribuição de pessoa em todas as parcelas ao criar compras parceladas no cartão de crédito.
- [ ] Exibir a identificação da pessoa responsável nas listagens e detalhes de transações, incluindo filtro por pessoa.
- [ ] Apresentar no módulo de cartões de crédito e faturas o agrupamento/detalhamento de gastos por pessoa para conferência de cartões emprestados.

## Out of Scope

Explicitly excluded. Documented to prevent scope creep.

| Feature | Reason |
| ------- | ------ |
| Sistema de cobrança automática via PIX ou gateway de pagamento | O objetivo é puramente controle gerencial e identificação de autoria/responsabilidade dos gastos |
| Criação de contas correntes bancárias exclusivas para pessoas sem login | Pessoas sem login são entidades de atribuição e identificação familiar, não titulares bancários |
| Autenticação ou login para membros sem e-mail | Membros sem login são cadastrados e geridos pelos administradores do grupo familiar |

---

## Assumptions & Open Questions

Every ambiguity is resolved or recorded here - nothing is left silently unclear.

| Assumption / decision | Chosen default | Rationale | Confirmed? |
| --------------------- | -------------- | --------- | ---------- |
| Entidade Pessoa no Banco de Dados | Tabela `people` com `familyId`, `name`, `color` e `userId` opcional | Permite representar tanto usuários com login quanto pessoas sem login sob o mesmo modelo de atribuição | y |
| Sincronização de membros com login | Ao adicionar membro à família, cria/vincula automaticamente registro em `people` | Garante que membros com login e pessoas sem login apareçam de forma transparente no mesmo seletor de responsáveis | y |
| Atribuição opcional em transações | Campo `personId` opcional em `Transaction` | Não bloqueia o fluxo de criação rápida caso o usuário não queira atribuir uma pessoa específica | y |
| Despesas parceladas | Todas as parcelas geradas herdam o mesmo `personId` | Compras parceladas no cartão emprestado pertencem à mesma pessoa do início ao fim | y |
| Resumo por pessoa na fatura | Resumo agregado por pessoa exibido nos detalhes da fatura do cartão | Atende diretamente à dor de saber quem gastou quanto quando o cartão foi emprestado | y |

**Open questions:** none - all resolved or logged above (required before the spec is confirmed).

---

## User Stories

### P1: Cadastro e Gestão de Pessoas da Família (Com e Sem Login) ⭐ MVP

**User Story**: As a administrador do grupo familiar, I want cadastrar pessoas da família informando apenas nome (sem exigir e-mail ou login) so that eu possa incluir dependentes e parentes no controle familiar.

**Why P1**: É o pré-requisito fundamental para permitir atribuir despesas a quem não possui conta de acesso ao sistema.

**Acceptance Criteria**:

1. WHEN o usuário administrador enviar o formulário de cadastro de pessoa informando nome e cor opcional THEN o sistema SHALL criar o registro na família sem exigir e-mail nem credenciais de login.
2. IF o nome da pessoa for vazio ou contiver apenas espaços THEN o sistema SHALL rejeitar a criação com erro de validação HTTP 400.
3. WHEN a listagem de membros/pessoas da família for consultada THEN o sistema SHALL retornar tanto os membros com login quanto as pessoas cadastradas sem login.
4. WHEN o administrador solicitar a exclusão de uma pessoa sem login que não possua transações vinculadas THEN o sistema SHALL remover a pessoa do grupo familiar.
5. IF a pessoa possuir transações vinculadas e for solicitada sua exclusão THEN o sistema SHALL desvincular a pessoa dos lançamentos (definir `personId = null`) ou impedir a exclusão com mensagem descritiva.

**Independent Test**: Acessar o gerenciamento da família, cadastrar "Filho Pedro" sem e-mail, verificar exibição do registro na lista de pessoas da família e consultar via API `/families/:id/people`.

---

### P1: Atribuição de Pessoa a Lançamentos e Compras no Cartão ⭐ MVP

**User Story**: As a membro da família que realizou ou registrou um lançamento, I want selecionar qual pessoa da família realizou aquele gasto so that fique registrado quem foi o responsável pela despesa.

**Why P1**: Resolve o problema principal do usuário de registrar quem fez o lançamento, em especial no empréstimo do cartão.

**Acceptance Criteria**:

1. WHEN o usuário abrir o modal de nova transação (despesa ou receita) THEN o sistema SHALL exibir um campo seletor com as pessoas da família ativa.
2. WHEN o usuário salvar uma transação informando o identificador de uma pessoa THEN o sistema SHALL persistir a transação vinculada ao `personId` correspondente.
3. WHEN uma compra parcelada no cartão de crédito for cadastrada com uma pessoa atribuída THEN o sistema SHALL propagar o mesmo `personId` para todas as parcelas geradas.
4. The system SHALL permitir que o campo de pessoa seja opcional, salvando a transação com `personId = null` caso não seja selecionada nenhuma pessoa.
5. WHEN a lista de transações for exibida THEN o sistema SHALL apresentar o nome ou badge visual da pessoa atribuída a cada lançamento.

**Independent Test**: Criar uma compra de R$ 150 no cartão de crédito selecionando "Filho Pedro" como responsável; verificar que a transação exibe o badge "Filho Pedro" na tabela de transações.

---

### P2: Filtro de Transações por Pessoa e Visão de Gastos na Fatura do Cartão

**User Story**: As a titular do cartão de crédito, I want filtrar lançamentos por pessoa e ver o total gasto por cada pessoa na fatura so that eu saiba exatamente quanto cobrar de cada um quando emprestar o cartão.

**Why P2**: Fornece o valor analítico final da funcionalidade, permitindo prestação de contas rápida do cartão compartilhado.

**Acceptance Criteria**:

1. WHEN o usuário selecionar uma pessoa no filtro de transações THEN o sistema SHALL retornar apenas os lançamentos atribuídos àquela pessoa.
2. WHEN os detalhes de uma fatura de cartão de crédito forem visualizados THEN o sistema SHALL calcular e exibir o valor total agrupado por cada pessoa responsável na fatura.
3. WHERE houver gastos na fatura sem pessoa atribuída o sistema SHALL agrupar esses valores sob o rótulo "Titular / Não atribuído".

**Independent Test**: Lançar R$ 100 para "Maria" e R$ 200 para "Pedro" na mesma fatura; abrir a tela de cartões e conferir se o resumo da fatura exibe Maria: R$ 100,00 e Pedro: R$ 200,00.

---

## Edge Cases

- IF o usuário tentar vincular uma pessoa que pertença a outra família THEN o sistema SHALL rejeitar a operação com erro HTTP 403 Forbidden.
- IF um lançamento privado (`isPrivate = true`) for atribuído a uma pessoa e consultado por outro membro THEN o sistema SHALL ocultar os detalhes da transação respeitando a regra de privacidade RN06.
- WHEN uma transação existente for editada THEN o sistema SHALL permitir atualizar ou remover a pessoa atribuída.

---

## Requirement Traceability

Each requirement gets a unique ID for tracking across design, tasks, and validation.

| Requirement ID | Story | Phase | Status |
| -------------- | ----- | ----- | ------ |
| PERS-01 | P1: Cadastro e Gestão de Pessoas da Família | Design | Pending |
| PERS-02 | P1: Cadastro e Gestão de Pessoas da Família | Design | Pending |
| PERS-03 | P1: Cadastro e Gestão de Pessoas da Família | Design | Pending |
| PERS-04 | P1: Atribuição de Pessoa a Lançamentos e Compras no Cartão | Design | Pending |
| PERS-05 | P1: Atribuição de Pessoa a Lançamentos e Compras no Cartão | Design | Pending |
| PERS-06 | P1: Atribuição de Pessoa a Lançamentos e Compras no Cartão | Design | Pending |
| PERS-07 | P2: Filtro de Transações por Pessoa e Visão de Gastos na Fatura | Design | Pending |
| PERS-08 | P2: Filtro de Transações por Pessoa e Visão de Gastos na Fatura | Design | Pending |

**Coverage:** 8 total, 8 mapped to tasks, 0 unmapped

---

## Success Criteria

How we know the feature is successful:

- [ ] Administrador consegue cadastrar e visualizar membros sem login no grupo familiar em menos de 1 minuto.
- [ ] Ao cadastrar compras únicas ou parceladas no cartão, é possível atribuir a pessoa responsável e visualizá-la claramente na listagem.
- [ ] O resumo da fatura do cartão discrimina com 100% de exatidão o montante gasto por cada membro/pessoa.
