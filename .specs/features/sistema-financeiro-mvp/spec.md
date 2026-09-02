# Sistema Financeiro Pessoal e Familiar - MVP Specification

## Problem Statement

A fragmentação das finanças domésticas e a falta de visão integrada entre gastos pessoais e despesas compartilhadas dificultam o planejamento orçamentário e o controle de fluxo de caixa familiar. O Sistema Financeiro Pessoal e Familiar resolve esse problema unificando em uma única plataforma web moderna a gestão de contas bancárias, cartões de crédito, despesas parceladas, orçamentos mensais, metas de economia e relatórios analíticos, com isolamento seguro entre registros individuais e despesas familiares compartilhadas.

## Goals

- [ ] Implementar autenticação segura JWT e suporte a grupos familiares com perfis de acesso (`OWNER`, `ADMIN`, `MEMBER`, `VIEWER`).
- [ ] Permitir controle preciso de saldos de contas bancárias e faturas de cartão de crédito com precisão decimal exata (`DECIMAL(15, 2)`).
- [ ] Fornecer registro e acompanhamento de transações (receitas, despesas, transferências, parcelamentos e recorrências).
- [ ] Disponibilizar orçamentos mensais por categoria com alertas visuais e gestão de metas financeiras com aportes.
- [ ] Entregar dashboard analítico responsivo com visualizações gráficas de fluxo de caixa e exportação de extratos (CSV e XLSX).

## Out of Scope

Explicitly excluded. Documented to prevent scope creep.

| Feature | Reason |
| ------- | ------ |
| Integração bancária direta via Open Finance / Open Banking | Complexidade regulatória e de certificados fora do escopo do MVP |
| Aplicativo mobile nativo (iOS / Android) | O MVP prioriza Progressive Web / Web Responsiva moderna |
| Módulo de investimentos avançados com cotações em tempo real | O MVP foca em controle de saldo de contas de investimento e fluxo de caixa |
| Emissão de boletos ou cobranças bancárias reais | Sistema estritamente para gestão e controle financeiro interno |

---

## Assumptions & Open Questions

Every ambiguity is resolved or recorded here - nothing is left silently unclear.

| Assumption / decision | Chosen default | Rationale | Confirmed? |
| --------------------- | -------------- | --------- | ---------- |
| Banco de Dados Relacional | PostgreSQL 16 com Prisma ORM | Garante total integridade transacional ACID e suporte nativo a Decimal | y |
| Moeda padrão do sistema | BRL (R$) com suporte a código ISO de 3 letras | Atende prioritariamente ao mercado brasileiro no MVP com flexibilidade | y |
| Alerta padrão de orçamento | 80% do teto definido na categoria | Valor comumente adotado na literatura de finanças para prevenção de estouro | y |
| Ciclo de faturamento de cartão | Fechamento no dia X e vencimento no dia Y | Permite alocação automática de compras em faturas do mês corrente ou seguinte | y |

**Open questions:** none - all resolved or logged above (required before the spec is confirmed).

---

## User Stories

### P1: Autenticação, Identidade e Grupos Familiares ⭐ MVP

**User Story**: As a usuário, I want me cadastrar, autenticar e gerenciar meu grupo familiar so that eu possa controlar minhas finanças e convidar membros da família com papéis específicos.

**Why P1**: Requisito fundamental para identificação, segurança e segregação multiusuário.

**Acceptance Criteria**:

1. WHEN o usuário enviar nome, e-mail válido e senha no registro THEN o sistema SHALL criar a conta com senha criptografada via Argon2/Bcrypt e emitir os tokens JWT.
2. WHEN o usuário autenticado solicitar a criação de um grupo familiar THEN o sistema SHALL registrar a nova família e associar o usuário com o papel `OWNER`.
3. WHEN o administrador da família convidar um novo membro por e-mail informando o papel THEN o sistema SHALL registrar a vinculação do membro ao grupo familiar.
4. WHILE o usuário estiver autenticado o sistema SHALL permitir alternar o contexto de visualização entre Finanças Pessoais e Finanças da Família.
5. IF as credenciais de login forem inválidas THEN o sistema SHALL rejeitar a requisição com código HTTP 401 Unauthorized e mensagem explicativa.
6. The system SHALL validar a presença de token JWT válido em todas as rotas protegidas da API.

**Independent Test**: Registrar um novo usuário, efetuar login, criar grupo familiar, convidar outro usuário e alternar o contexto de navegação.

---

### P1: Gestão de Contas Bancárias e Carteiras ⭐ MVP

**User Story**: As a usuário, I want cadastrar minhas contas bancárias e carteiras so that eu possa manter o saldo atualizado e histórico de movimentações.

**Why P1**: Contas são o alicerce para saldo disponível e registro de receitas/despesas.

**Acceptance Criteria**:

1. WHEN o usuário cadastrar uma conta informando nome, tipo (`CHECKING`, `SAVINGS`, `INVESTMENT`, `CASH`, `OTHER`), saldo inicial e cor THEN o sistema SHALL persistir a conta e definir o saldo atual igual ao saldo inicial.
2. WHEN uma transação do tipo `INCOME` ou `EXPENSE` com status `COMPLETED` for registrada para a conta THEN o sistema SHALL recalcular e atualizar o `current_balance` atomicamente.
3. WHEN o usuário arquivar uma conta desativada THEN o sistema SHALL marcar `is_archived = true` preservando todas as transações passadas.
4. IF o usuário tentar excluir uma conta com transações associadas THEN o sistema SHALL rejeitar a operação e instruir o arquivamento.

**Independent Test**: Cadastrar conta com saldo inicial de R$ 1.000,00, lançar despesa de R$ 150,00 e verificar se o saldo é atualizado para R$ 850,00.

---

### P1: Cartões de Crédito e Faturas ⭐ MVP

**User Story**: As a usuário, I want cadastrar cartões de crédito e acompanhar as faturas mensais so that eu tenha controle do limite disponível e datas de vencimento.

**Why P1**: Cartões de crédito representam uma das principais fontes de despesas familiares.

**Acceptance Criteria**:

1. WHEN o usuário cadastrar um cartão com nome, bandeira, limite total, dia de fechamento e dia de vencimento THEN o sistema SHALL salvar o cartão e inicializar a fatura do ciclo atual (`reference_month`).
2. WHEN uma compra no cartão for lançada antes ou no dia de fechamento THEN o sistema SHALL vincular o lançamento à fatura do mês atual.
3. WHEN uma compra no cartão for lançada após o dia de fechamento THEN o sistema SHALL vincular o lançamento à fatura do mês subsequente.
4. WHEN o usuário registrar o pagamento de uma fatura informando a conta de débito THEN o sistema SHALL marcar a fatura como `PAID` e gerar uma transação de despesa correspondente na conta selecionada.
5. The system SHALL calcular e exibir o limite disponível subtraindo o total das faturas abertas e parcelas futuras do limite total.

**Independent Test**: Cadastrar cartão com limite R$ 2.000,00 fechamento dia 20, lançar compra no dia 15 (entra no mês) e compra no dia 22 (entra no próximo mês), liquidar fatura e validar saldo da conta bancária.

---

### P1: Categorias e Subcategorias ⭐ MVP

**User Story**: As a usuário, I want classificar minhas transações em categorias e subcategorias visuais so that eu possa entender para onde vai o meu dinheiro.

**Why P1**: Base para orçamentos, relatórios analíticos e agrupamento de despesas.

**Acceptance Criteria**:

1. The system SHALL inicializar um catálogo de categorias padrão do sistema (Alimentação, Moradia, Transporte, Saúde, Lazer, Salário, etc.) com cores e ícones representativos.
2. WHEN o usuário criar uma categoria ou subcategoria personalizada vinculada ao tipo (`INCOME` ou `EXPENSE`) THEN o sistema SHALL persistir a categoria associada ao usuário ou família.
3. IF o usuário tentar excluir uma categoria que possua transações vinculadas THEN o sistema SHALL bloquear a exclusão retornando status HTTP 400 Bad Request.

**Independent Test**: Listar categorias padrão, cadastrar nova subcategoria "Supermercado" dentro de "Alimentação", associar a um lançamento e verificar integridade referencial.

---

### P1: Lançamentos, Transferências, Recorrências e Parcelamentos ⭐ MVP

**User Story**: As a usuário, I want registrar receitas, despesas, transferências, parcelamentos e transações recorrentes so that eu tenha controle em tempo real do fluxo financeiro.

**Why P1**: Core transacional do sistema financeiro.

**Acceptance Criteria**:

1. WHEN o usuário criar uma despesa ou receita informando valor, data, descrição, categoria e conta THEN o sistema SHALL persistir a transação e atualizar o saldo da conta de origem.
2. WHEN o usuário registrar uma transferência entre duas contas cadastradas THEN o sistema SHALL executar o débito na conta de origem e crédito na conta de destino dentro de uma única transação atômica.
3. WHEN o usuário registrar uma compra parcelada no cartão (ex: Nx parcelas) THEN o sistema SHALL gerar N transações indexadas (`installment_number/total_installments`) distribuídas nas faturas dos meses subsequentes.
4. WHEN o usuário configurar uma recorrência (mensal/semanal) THEN o sistema SHALL manter o registro de recorrência para geração periódica de lançamentos.
5. WHILE a transação for marcada com `is_private = true` o sistema SHALL omitir seus detalhes de outros membros da família, incluindo apenas o valor no consolidado financeiro.
6. WHEN o usuário cancelar ou excluir uma transação efetivada THEN o sistema SHALL estornar o valor no saldo da conta ou na fatura do cartão correspondente.

**Independent Test**: Realizar transferência entre Conta A e Conta B, verificar débitos e créditos simultâneos; lançar compra parcelada em 3x e checar faturas dos 3 meses.

---

### P1: Orçamentos Mensais (Budgets) ⭐ MVP

**User Story**: As a usuário, I want definir limites de gastos por categoria para o mês so that eu receba alertas quando estiver próximo de estourar o orçamento.

**Why P1**: Essencial para disciplina financeira familiar e controle preventivo de despesas.

**Acceptance Criteria**:

1. WHEN o usuário definir um teto orçamentário para uma categoria em um determinado mês (`YYYY-MM`) THEN o sistema SHALL persistir o orçamento com o percentual de alerta configurado.
2. The system SHALL calcular em tempo real o percentual consumido do orçamento somando as despesas efetivadas da categoria no período correspondente.
3. WHEN o consumo atingir ou ultrapassar o percentual de alerta (ex: 80%) THEN o sistema SHALL sinalizar o alerta visual no painel e no relatório orçamentário.

**Independent Test**: Definir teto de R$ 500,00 para Alimentação no mês, lançar despesa de R$ 420,00 (84%) e validar sinalização de alerta de consumo.

---

### P1: Metas Financeiras (Goals) ⭐ MVP

**User Story**: As a usuário, I want definir metas de economia e registrar aportes so that eu acompanhe a evolução para atingir objetivos financeiros (ex: reserva de emergência).

**Why P1**: Incentiva o planejamento de longo prazo e reserva familiar.

**Acceptance Criteria**:

1. WHEN o usuário cadastrar uma meta informando nome, valor alvo, data limite opcional, cor e ícone THEN o sistema SHALL persistir a meta com `current_amount = 0.00` e status `IN_PROGRESS`.
2. WHEN o usuário registrar um aporte financeiro na meta THEN o sistema SHALL incrementar o `current_amount` da meta e registrar o histórico do aporte.
3. The system SHALL calcular a porcentagem de conclusão e o montante restante para atingir o objetivo da meta.

**Independent Test**: Criar meta "Reserva de Emergência" de R$ 10.000,00, aportar R$ 2.500,00 e validar que o progresso reflete 25%.

---

### P1: Dashboard Analítico e Relatórios ⭐ MVP

**User Story**: As a usuário, I want visualizar painéis consolidados, gráficos de despesas e exportar meu extrato so that eu tenha clareza da minha saúde financeira.

**Why P1**: Entrega o valor analítico consolidado e facilidade de auditoria.

**Acceptance Criteria**:

1. The system SHALL exibir cards consolidados no dashboard com: Saldo Total, Total de Receitas do Mês, Total de Despesas do Mês, Balanço Líquido e Próximos Vencimentos.
2. The system SHALL renderizar gráficos de despesas por categoria e evolução mensal de receitas vs despesas.
3. WHEN o usuário acessar a listagem de extrato THEN o sistema SHALL permitir filtrar lançamentos por período, conta, categoria, tipo e status com paginação.
4. WHEN o usuário solicitar a exportação do extrato filtrado nos formatos CSV ou XLSX THEN o sistema SHALL gerar e disponibilizar o arquivo para download com todos os campos da consulta.

**Independent Test**: Abrir dashboard, verificar métricas de receitas/despesas, aplicar filtro no extrato e baixar arquivo CSV validando o conteúdo exportado.

---

## Edge Cases

- IF o usuário tentar autenticar com e-mail já cadastrado THEN o sistema SHALL retornar erro 409 Conflict.
- IF o saldo de uma conta bancária ficar negativo THEN o sistema SHALL permitir o lançamento exibindo indicador visual de saldo devedor.
- IF uma compra com cartão for estornada THEN o sistema SHALL abater o valor correspondente da fatura aberta ou ajustar o saldo da fatura.
- IF ocorrer falha no banco de dados durante uma transferência bancária THEN o sistema SHALL efetuar rollback integral sem alterar o saldo de nenhuma das contas.

---

## Requirement Traceability

| Requirement ID | Story | Phase | Status |
| -------------- | ----- | ----- | ------ |
| AUTH-01 | P1: Autenticação, Identidade e Grupos Familiares | Design | Pending |
| AUTH-02 | P1: Autenticação, Identidade e Grupos Familiares | Design | Pending |
| AUTH-03 | P1: Autenticação, Identidade e Grupos Familiares | Design | Pending |
| AUTH-04 | P1: Autenticação, Identidade e Grupos Familiares | Design | Pending |
| AUTH-05 | P1: Autenticação, Identidade e Grupos Familiares | Design | Pending |
| ACCT-01 | P1: Gestão de Contas Bancárias e Carteiras | Design | Pending |
| ACCT-02 | P1: Gestão de Contas Bancárias e Carteiras | Design | Pending |
| ACCT-03 | P1: Gestão de Contas Bancárias e Carteiras | Design | Pending |
| ACCT-04 | P1: Gestão de Contas Bancárias e Carteiras | Design | Pending |
| CARD-01 | P1: Cartões de Crédito e Faturas | Design | Pending |
| CARD-02 | P1: Cartões de Crédito e Faturas | Design | Pending |
| CARD-03 | P1: Cartões de Crédito e Faturas | Design | Pending |
| CARD-04 | P1: Cartões de Crédito e Faturas | Design | Pending |
| CARD-05 | P1: Cartões de Crédito e Faturas | Design | Pending |
| CAT-01 | P1: Categorias e Subcategorias | Design | Pending |
| CAT-02 | P1: Categorias e Subcategorias | Design | Pending |
| CAT-03 | P1: Categorias e Subcategorias | Design | Pending |
| TX-01 | P1: Lançamentos, Transferências, Recorrências e Parcelamentos | Design | Pending |
| TX-02 | P1: Lançamentos, Transferências, Recorrências e Parcelamentos | Design | Pending |
| TX-03 | P1: Lançamentos, Transferências, Recorrências e Parcelamentos | Design | Pending |
| TX-04 | P1: Lançamentos, Transferências, Recorrências e Parcelamentos | Design | Pending |
| TX-05 | P1: Lançamentos, Transferências, Recorrências e Parcelamentos | Design | Pending |
| TX-06 | P1: Lançamentos, Transferências, Recorrências e Parcelamentos | Design | Pending |
| BUD-01 | P1: Orçamentos Mensais (Budgets) | Design | Pending |
| BUD-02 | P1: Orçamentos Mensais (Budgets) | Design | Pending |
| BUD-03 | P1: Orçamentos Mensais (Budgets) | Design | Pending |
| GOAL-01 | P1: Metas Financeiras (Goals) | Design | Pending |
| GOAL-02 | P1: Metas Financeiras (Goals) | Design | Pending |
| GOAL-03 | P1: Metas Financeiras (Goals) | Design | Pending |
| REP-01 | P1: Dashboard Analítico e Relatórios | Design | Pending |
| REP-02 | P1: Dashboard Analítico e Relatórios | Design | Pending |
| REP-03 | P1: Dashboard Analítico e Relatórios | Design | Pending |
| REP-04 | P1: Dashboard Analítico e Relatórios | Design | Pending |

---

## Success Criteria

- [ ] Todas as operações financeiras são calculadas sem divergência de centavos utilizando precisão decimal exata.
- [ ] O usuário consegue gerenciar contas, cartões, despesas, receitas, orçamentos e metas no contexto pessoal e familiar.
- [ ] O dashboard apresenta visão clara e em tempo real dos indicadores financeiros e gráficos analíticos.
- [ ] Exportação de extrato em CSV/XLSX funcionando com filtros aplicados.
- [ ] Todos os testes unitários e de integração passam com 100% de sucesso.
