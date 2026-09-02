---
type: documentation
created: 2026-09-01 22:25
tags:
  - srs
  - requisitos
  - visao-produto
  - mvp
  - financas
  - postgres
  - nextjs
  - nestjs
project: "[[Sistema Financeiro Pessoal e Familiar]]"
status: approved
version: "1.0.0"
related:
  - "[[Sistema Financeiro Pessoal e Familiar]]"
  - "[[Arquitetura e Stack Tecnológica - Sistema Financeiro]]"
  - "[[Modelagem do Banco de Dados Relacional - Sistema Financeiro]]"
summary: Documento de Visão e Requisitos de Software (SRS) para o MVP do Sistema Financeiro Pessoal e Familiar, definindo escopo, personas, requisitos funcionais (RF), requisitos não-funcionais (RNF) e regras de negócio essenciais.
---

# Documento de Visão e Requisitos de Software (SRS - MVP) - Sistema Financeiro

## 1. Visão Geral do Produto

### 1.1. Propósito e Breve Descrição
O **Sistema Financeiro Pessoal e Familiar** é uma plataforma web moderna e responsiva voltada para a gestão e controle financeiro integrado de indivíduos e núcleos familiares. O sistema soluciona o problema comum da fragmentação das finanças domésticas, oferecendo um ambiente unificado onde é possível gerenciar finanças estritamente pessoais e finanças compartilhadas da casa de maneira clara, segura e colaborativa.

Com foco em simplicidade e usabilidade, o sistema proporciona visibilidade em tempo real sobre fluxo de caixa, faturas de cartão de crédito, orçamentos mensais (tetos de gastos) e progresso de metas de economia.

### 1.2. Escopo do MVP
O Produto Mínimo Viável (MVP) contempla 8 módulos essenciais:

1. **Autenticação, Identidade & Família**: Cadastro, autenticação JWT, gestão de grupo familiar e níveis de acesso.
2. **Gestão de Contas Bancárias & Carteiras**: Controle de saldos de contas correntes, poupanças, investimentos e dinheiro físico.
3. **Gestão de Cartões de Crédito & Faturas**: Controle de limites, datas de fechamento/vencimento e fechamento automático de faturas.
4. **Categorias & Subcategorias**: Classificação hierárquica e visual (cores e ícones) de receitas e despesas.
5. **Lançamentos & Transações**: Registro de receitas, despesas, transferências, despesas recorrentes e compras parceladas.
6. **Orçamentos Mensais (Budgets)**: Planejamento de tetos de gastos por categoria com alertas de consumo.
7. **Metas Financeiras (Goals)**: Definição de reservas financeiras e acompanhamento de aportes.
8. **Dashboard Analítico & Relatórios**: Painéis consolidados, gráficos de despesas por categoria, extrato detalhado e exportação de dados.

---

## 2. Perfis de Usuário e Personas

| Perfil | Descrição | Interação Principal |
| :--- | :--- | :--- |
| **Administrador Familiar (Owner/Admin)** | Responsável pela criação do grupo familiar, convite de membros, configuração de contas conjuntas e orçamentos gerais da casa. | Painel da Família, Orçamentos, Contas Compartilhadas e Relatórios Consolidados. |
| **Membro Familiar (Member)** | Membro da família que registra transações diárias (pessoais ou da casa), acompanha limites de orçamento e metas conjuntas. | Lançamentos diários, Dashboard Familiar/Pessoal e Metas. |
| **Membro Observador (Viewer)** | Visualiza o extrato e relatórios da família sem permissão para adicionar ou editar lançamentos (ex: dependentes em educação financeira). | Dashboards e Relatórios em modo leitura. |
| **Usuário Individual (Solo)** | Utiliza o sistema exclusivamente para suas contas pessoais sem vínculo com grupo familiar. | Dashboard Pessoal, Contas, Cartões, Orçamentos e Metas. |

---

## 3. Requisitos Funcionais (RF)

### 3.1. Módulo 1: Identidade, Autenticação & Grupos Familiares
- **RF01 - Cadastro de Usuário**: O sistema deve permitir o cadastro de novos usuários com nome, e-mail e senha.
- **RF02 - Autenticação e Sessão**: O sistema deve autenticar usuários via e-mail/senha emitindo tokens JWT (Access Token e Refresh Token).
- **RF03 - Criação de Grupo Familiar**: Um usuário autenticado pode criar um grupo familiar tornando-se o `OWNER`.
- **RF04 - Gestão de Membros da Família**: O administrador pode convidar novos membros para o grupo por e-mail e atribuir papéis (`ADMIN`, `MEMBER`, `VIEWER`).
- **RF05 - Alternância de Contexto**: O usuário deve poder alternar facilmente a visualização entre "Minhas Finanças Pessoais" e "Finanças da Família".

### 3.2. Módulo 2: Contas Bancárias & Carteiras
- **RF06 - Cadastro de Contas**: O sistema deve permitir o cadastro de contas bancárias e carteiras especificando nome, tipo (`CHECKING`, `SAVINGS`, `INVESTMENT`, `CASH`, `OTHER`), moeda, saldo inicial, cor e ícone.
- **RF07 - Vínculo de Propriedade**: A conta pode ser definida como estritamente pessoal (pertence apenas ao usuário) ou compartilhada com o grupo familiar.
- **RF08 - Atualização Automática de Saldo**: O saldo atual (`current_balance`) da conta deve ser recalculado automaticamente a cada lançamento de receita, despesa ou transferência.
- **RF09 - Arquivamento de Contas**: O usuário pode arquivar uma conta desativada sem perder o histórico de transações passadas.

### 3.3. Módulo 3: Cartões de Crédito & Faturas
- **RF10 - Cadastro de Cartão de Crédito**: O sistema deve permitir cadastrar cartões com nome, bandeira, limite total, dia de fechamento e dia de vencimento.
- **RF11 - Gestão Automática de Faturas**: O sistema deve agrupar os lançamentos efetuados no cartão na fatura correspondente ao ciclo de faturamento (`YYYY-MM`).
- **RF12 - Pagamento de Fatura**: O sistema deve permitir registrar o pagamento total ou parcial de uma fatura, gerando uma transação de despesa na conta bancária de origem escolhida.
- **RF13 - Monitoramento de Limite Disponível**: O sistema deve exibir o limite total, o limite comprometido na fatura atual e faturas futuras (parcelamentos), e o saldo de limite disponível.

### 3.4. Módulo 4: Categorias & Subcategorias
- **RF14 - Categorias Pré-definidas**: O sistema deve disponibilizar um catálogo padrão de categorias (ex: Alimentação, Moradia, Transporte, Saúde, Lazer, Salário, Investimentos).
- **RF15 - Categorias Customizadas**: O usuário ou o grupo familiar deve poder criar novas categorias e subcategorias personalizadas vinculadas ao tipo (`INCOME` ou `EXPENSE`).
- **RF16 - Identidade Visual**: Cada categoria deve possuir cor representativa e ícone para fácil identificação nos gráficos e extratos.

### 3.5. Módulo 5: Lançamentos & Transações
- **RF17 - Registro de Receitas e Despesas**: O sistema deve permitir registrar transações informando valor, data, descrição, categoria, conta de débito/crédito, observações e status (`PENDING` ou `COMPLETED`).
- **RF18 - Transferência entre Contas**: O sistema deve permitir transferir valores entre duas contas cadastradas, debitando da conta de origem e creditando na de destino.
- **RF19 - Compras Parceladas**: O sistema deve permitir lançar compras parceladas no cartão de crédito (ex: 10x de R$ 100), distribuindo automaticamente as parcelas nas faturas dos meses subsequentes.
- **RF20 - Lançamentos Recorrentes / Fixos**: O sistema deve permitir configurar despesas ou receitas recorrentes (mensal, semanal, anual), gerando os lançamentos de forma automática ou sob confirmação.
- **RF21 - Privacidade em Transações Familiares**: O usuário deve poder marcar uma transação pessoal como privada (`is_private: true`), garantindo que outros membros da família não vejam os detalhes desse lançamento.
- **RF22 - Filtro e Edição de Lançamentos**: O usuário pode editar, cancelar ou excluir transações, com recálculo automático e consistente dos saldos afetados.

### 3.6. Módulo 6: Orçamentos Mensais (Budgets)
- **RF23 - Definição de Teto de Gastos**: O sistema deve permitir definir limites máximos de gastos por categoria para um determinado mês (`YYYY-MM`).
- **RF24 - Acompanhamento Visual de Consumo**: O sistema deve calcular o percentual consumido do orçamento em tempo real conforme as despesas são lançadas.
- **RF25 - Alertas de Estouro**: Exibir avisos visuais no painel quando o consumo ultrapassar o percentual de alerta (padrão: 80%) ou atingir 100% do limite.

### 3.7. Módulo 7: Metas Financeiras (Goals)
- **RF26 - Criação de Metas**: O sistema deve permitir cadastrar metas de economia (ex: "Reserva de Emergência", "Férias"), com valor alvo, data limite e cor/ícone.
- **RF27 - Aportes e Resgates**: O usuário deve poder registrar aportes direcionados para a meta a partir de uma conta bancária.
- **RF28 - Barra de Progresso e Projeção**: O sistema deve exibir a porcentagem concluída e o valor restante para alcançar a meta.

### 3.8. Módulo 8: Dashboards & Relatórios
- **RF29 - Dashboard Principal**: Exibir cards com: Saldo Geral Consolidado, Total de Receitas do Mês, Total de Despesas do Mês, Balanço Mensal e Próximos Vencimentos.
- **RF30 - Gráficos Analíticos**:
  - Gráfico de pizza/rosca de despesas agrupadas por categoria.
  - Gráfico de barras de evolução de receitas vs. despesas ao longo dos meses.
- **RF31 - Extrato Geral**: Listagem detalhada e paginada de lançamentos com filtros por período, conta, categoria, tipo, membro da família e status.
- **RF32 - Exportação de Dados**: Permitir exportar o relatório do extrato filtrado nos formatos CSV e Excel (XLSX).

---

## 4. Requisitos Não Funcionais (RNF)

| Identificador | Categoria | Descrição |
| :--- | :--- | :--- |
| **RNF01** | **Precisão Numérica** | Todos os valores monetários devem ser armazenados como `DECIMAL(15, 2)` no banco de dados, evitando qualquer imprecisão de arredondamento de ponto flutuante. |
| **RNF02** | **Desempenho** | Consultas agregadas de extratos e dashboard devem responder em menos de **200ms** para períodos mensais sob condições normais de uso. |
| **RNF03** | **Segurança** | Senhas criptografadas com `Argon2` ou `Bcrypt` (custo mínimo de 10). Comunicação cliente-servidor criptografada via HTTPS/TLS e proteção contra ataques comuns (CORS, XSS, CSRF e Rate Limiting). |
| **RNF04** | **Privacidade e Isolamento** | Garantir que dados de uma família ou transações privadas de um usuário nunca vazem para outros usuários não autorizados através de Guards e Policies no backend. |
| **RNF05** | **Responsividade & UX** | A interface web desenvolvida em Next.js e Tailwind CSS deve ser totalmente responsiva, funcionando perfeitamente em telas móveis (smartphones), tablets e desktops. |
| **RNF06** | **Disponibilidade & Containerização** | A aplicação deve ser totalmente conteinerizada via Docker e orquestrada por Docker Compose, permitindo fácil deploy, testes e recuperação rápida em caso de falha. |
| **RNF07** | **Integridade Transacional** | Alterações financeiras críticas (como transferências entre contas e geração de parcelas) devem ser executadas dentro de transações ACID do banco de dados PostgreSQL. |

---

## 5. Regras de Negócio (RN)

- **RN01 - Saldo Positivo / Negativo**: Contas bancárias podem assumir saldo negativo (cheque especial), porém um aviso visual deve ser exibido ao usuário.
- **RN02 - Ciclo de Cartão de Crédito**: Transações realizadas até o dia de fechamento entram na fatura do mês atual; transações após o fechamento entram automaticamente na fatura do mês seguinte.
- **RN03 - Cancelamento de Transação Efetivada**: Ao cancelar ou excluir uma transação já efetivada (`COMPLETED`), o saldo da conta de origem ou a fatura do cartão deve ser estornado automaticamente.
- **RN04 - Exclusão de Categorias em Uso**: Não é permitido excluir categorias que possuam transações vinculadas. O usuário deve ser orientado a reclassificar os lançamentos ou arquivar a categoria.
- **RN05 - Integridade de Transferências**: Uma transferência consiste em uma operação atômica. O débito na conta de origem e o crédito na conta de destino devem ocorrer juntos; caso um falhe, toda a operação é abortada (Rollback).
- **RN06 - Visualização de Transações Privadas**: Mesmo dentro de um grupo familiar compartilhado, lançamentos marcados com `is_private = true` só podem ter seus detalhes (descrição, categoria e notas) lidos pelo usuário que os criou. No consolidado familiar, seu valor entra apenas no total financeiro anônimo.

---

## 6. Matriz de Rastreabilidade (Módulos vs. Requisitos)

| Módulo | Requisitos Funcionais | Entidades do Banco de Dados |
| :--- | :--- | :--- |
| **Identidade & Família** | RF01, RF02, RF03, RF04, RF05 | `users`, `families`, `family_members` |
| **Contas & Carteiras** | RF06, RF07, RF08, RF09 | `accounts` |
| **Cartões de Crédito** | RF10, RF11, RF12, RF13 | `credit_cards`, `credit_card_invoices` |
| **Categorias** | RF14, RF15, RF16 | `categories` |
| **Transações** | RF17, RF18, RF19, RF20, RF21, RF22 | `transactions`, `recurrences` |
| **Orçamentos** | RF23, RF24, RF25 | `budgets` |
| **Metas Financeiras** | RF26, RF27, RF28 | `goals`, `goal_deposits` |
| **Dashboards & Relatórios**| RF29, RF30, RF31, RF32 | Agregações de `transactions`, `accounts`, `budgets` |

---

## 7. Critérios de Aceite para o MVP

1. Usuário consegue se cadastrar, criar um grupo familiar e convidar seu cônjuge/membro.
2. É possível cadastrar contas (ex: Nubank, Itaú, Carteira) e cartões de crédito.
3. É possível registrar despesas e receitas diárias, parceladas e recorrentes.
4. O extrato reflete fielmente as movimentações e atualiza o saldo das contas sem divergências de centavos.
5. Os orçamentos mensais alertam visualmente quando os limites são atingidos.
6. O dashboard exibe claramente a visão financeira individual e a visão familiar combinada.
