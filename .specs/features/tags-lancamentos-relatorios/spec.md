# Tags em Lançamentos e Filtro em Relatórios Specification

## Problem Statement

Atualmente, os lançamentos financeiros no sistema são categorizados apenas por categorias fixas e vinculados a contas ou cartões. Os usuários não conseguem marcar transações com rótulos transversais personalizados (ex: `#viagem-praia`, `#reforma`, `#trabalho`, `#reembolsavel`) para acompanhar projetos ou eventos específicos, nem analisar esses agrupamentos nos relatórios financeiros e exportações.

## Goals

- [ ] Permitir a criação dinâmica e atribuição de uma ou múltiplas tags a qualquer lançamento financeiro (receita, despesa ou compra em cartão).
- [ ] Replicar automaticamente as tags atribuídas para todas as parcelas em compras parceladas no cartão de crédito.
- [ ] Exibir tags como badges visuais no extrato de transações e permitir filtrar o extrato por tag.
- [ ] Habilitar filtro por tag na tela de relatórios, recalculando fluxo de caixa mensal e distribuição por categoria com base na tag selecionada.
- [ ] Adicionar seção de distribuição de gastos por tag e incluir as tags na exportação do extrato em CSV.

## Out of Scope

Explicitly excluded. Documented to prevent scope creep.

| Feature | Reason |
| ------- | ------ |
| Tela dedicada de CRUD/gestão de tags | No MVP, as tags são criadas dinamicamente inline no modal de lançamento via chips/autocomplete, simplificando a interface |
| Cores customizáveis manualmente pelo usuário | As cores das tags são geradas ou selecionadas automaticamente a partir de paleta consistente para evitar complexidade de UI |
| Orçamento (Budget) por tag | Orçamentos continuam atrelados a categorias financeiras neste ciclo |

---

## Assumptions & Open Questions

Every ambiguity is resolved or recorded here - nothing is left silently unclear.

| Assumption / decision | Chosen default | Rationale | Confirmed? |
| --------------------- | -------------- | --------- | ---------- |
| Quantidade de tags por transação | Múltiplas tags permitidas por lançamento | Dá flexibilidade para cruzar temas (ex: viagem + trabalho) sem impedir quem quiser apenas uma | Sim |
| Modo de criação e seleção | Autocomplete dinâmico com criação inline por Enter/Vírgula | Evita telas extras de configuração e proporciona fluxo rápido de digitação | Sim |
| Propagação em parcelamentos | Replicar tags para todas as parcelas do grupo de parcelamento | Mantém coerência contábil e histórica entre todas as parcelas da compra | Sim |
| Escopo de visibilidade da tag | Associada ao `familyId` quando no contexto familiar, ou `userId` quando pessoal | Garante isolamento estrito de dados entre contexto pessoal e compartilhado | Sim |
| Lançamentos privados (RN06) | Ocultar tags de transações privadas de outros membros da família | Preserva a privacidade estrita definida na regra de negócio de transações privadas | Sim |
| Permissão de criação por papel (RBAC) | Membros com papel VIEWER não podem criar tags ou transações | Mantém integridade das permissões definidas no AD-014 | Sim |

**Open questions:** none - all resolved or logged above.

---

## User Stories

### P1: Atribuição e Criação de Tags no Lançamento Financeiro ⭐ MVP

**User Story**: Como usuário do sistema, quero poder informar uma ou mais tags ao criar um lançamento financeiro para categorizar meus gastos e receitas de forma transversal.

**Why P1**: É a capacidade fundacional de etiquetar lançamentos, viabilizando todo o agrupamento posterior.

**Acceptance Criteria**:

1. WHEN o usuário informar tags ao criar uma transação THEN o sistema SHALL associar as tags à transação persistindo a relação no banco de dados.
2. WHEN o usuário digitar uma tag inédita no escopo ativo THEN o sistema SHALL criar dinamicamente o registro da tag vinculado ao contexto pessoal ou familiar.
3. WHEN o usuário criar uma compra parcelada no cartão de crédito com tags THEN o sistema SHALL associar as mesmas tags a todas as parcelas geradas no grupo de parcelamento.
4. IF o usuário tentar criar uma tag com nome em branco ou superior a 50 caracteres THEN o sistema SHALL rejeitar a criação retornando erro de validação HTTP 400.
5. WHILE o usuário estiver autenticado no contexto familiar ou pessoal, WHEN consultar o endpoint de tags THEN o sistema SHALL listar as tags existentes no respectivo escopo para autocomplete.
6. The system SHALL impedir que membros com papel VIEWER no grupo familiar criem tags ou transações associadas.

**Independent Test**: Criar um lançamento com as tags `viagem` e `ferias` e verificar que ambas foram persistidas e retornadas nos detalhes do lançamento.

---

### P2: Visualização e Filtro por Tags no Extrato de Transações

**User Story**: Como usuário, quero visualizar as tags em cada linha do extrato e filtrar a lista por tag para auditar rapidamente despesas específicas.

**Why P2**: Permite conferência imediata das marcações realizadas e busca ágil de despesas de um mesmo projeto.

**Acceptance Criteria**:

1. WHEN a listagem de transações for consultada THEN o sistema SHALL retornar a lista de tags associadas a cada transação.
2. WHEN o usuário filtrar o extrato por uma tag específica (`tagId` ou nome da tag) THEN o sistema SHALL retornar apenas as transações vinculadas àquela tag.
3. IF uma transação for marcada como privada por outro membro da família THEN o sistema SHALL ocultar as tags para os demais membros.
4. WHEN o usuário excluir uma transação THEN o sistema SHALL remover o vínculo da transação com as tags sem excluir as tags do sistema.
5. The system SHALL exibir chips visuais com as tags na linha de cada transação na tabela do frontend.

**Independent Test**: Filtrar o extrato de transações pela tag `viagem` e confirmar que apenas registros contendo essa tag são exibidos.

---

### P3: Filtro por Tag, Análise e Exportação nos Relatórios

**User Story**: Como usuário, quero filtrar os relatórios por tag e exportar o extrato em CSV contendo as tags para analisar o impacto financeiro consolidado de projetos e eventos.

**Why P3**: Fecha o ciclo de inteligência financeira ao permitir correlacionar fluxo de caixa, categorias e relatórios analíticos por tag.

**Acceptance Criteria**:

1. WHEN o usuário selecionar uma tag no filtro da tela de Relatórios THEN o sistema SHALL filtrar os dados de fluxo de caixa mensal e distribuição de categorias considerando apenas transações com a tag selecionada.
2. WHEN a rota de distribuição por tags for consultada (`/reports/tags`) THEN o sistema SHALL retornar o somatório e percentual de gastos agrupados por tag no período.
3. WHEN o usuário solicitar a exportação do extrato em CSV THEN o sistema SHALL incluir a coluna `Tags` preenchida com as tags de cada lançamento separadas por vírgula.
4. WHERE um filtro de tag estiver ativo na exportação CSV THEN o sistema SHALL incluir no arquivo gerado apenas os lançamentos que contenham a tag informada.
5. The system SHALL disponibilizar o componente seletor de tag na barra de filtros da tela de Relatórios no frontend.

**Independent Test**: Acessar a tela de relatórios, selecionar a tag `viagem`, verificar a atualização dos gráficos de fluxo/categorias e exportar o CSV contendo a coluna `Tags`.

---

## Edge Cases

- IF o usuário tentar associar tags duplicadas no mesmo lançamento (ex: `['viagem', 'viagem']`) THEN o sistema SHALL normalizar e vincular a tag apenas uma vez.
- IF nenhuma transação possuir a tag selecionada no relatório THEN o sistema SHALL retornar coleções vazias e totalizadores zerados sem erros de divisão por zero.
- IF uma tag for criada com espaços no início ou fim THEN o sistema SHALL aplicar trim no nome antes de salvar.
- WHEN uma transação pertencer a uma família THEN o sistema SHALL garantir que as tags vinculadas pertençam à mesma família, impedindo vazamento de tags entre famílias distintas.

---

## Requirement Traceability

Each requirement gets a unique ID for tracking across design, tasks, and validation.

| Requirement ID | Story | Phase | Status |
| -------------- | ----- | ----- | ------ |
| TAG-01 | P1: Atribuição e Criação de Tags no Lançamento | Tasks (T1, T3) | In Tasks |
| TAG-02 | P1: Atribuição e Criação de Tags no Lançamento | Tasks (T1, T2) | In Tasks |
| TAG-03 | P1: Atribuição e Criação de Tags no Lançamento | Tasks (T3, T8) | In Tasks |
| TAG-04 | P1: Atribuição e Criação de Tags no Lançamento | Tasks (T2) | In Tasks |
| TAG-05 | P1: Atribuição e Criação de Tags no Lançamento | Tasks (T2, T5) | In Tasks |
| TAG-06 | P1: Atribuição e Criação de Tags no Lançamento | Tasks (T2) | In Tasks |
| TAG-07 | P2: Visualização e Filtro por Tags no Extrato | Tasks (T3, T6) | In Tasks |
| TAG-08 | P2: Visualização e Filtro por Tags no Extrato | Tasks (T3, T6) | In Tasks |
| TAG-09 | P2: Visualização e Filtro por Tags no Extrato | Tasks (T3) | In Tasks |
| TAG-10 | P2: Visualização e Filtro por Tags no Extrato | Tasks (T3) | In Tasks |
| TAG-11 | P2: Visualização e Filtro por Tags no Extrato | Tasks (T6) | In Tasks |
| TAG-12 | P3: Filtro por Tag, Análise e Exportação nos Relatórios | Tasks (T4, T7) | In Tasks |
| TAG-13 | P3: Filtro por Tag, Análise e Exportação nos Relatórios | Tasks (T4, T7) | In Tasks |
| TAG-14 | P3: Filtro por Tag, Análise e Exportação nos Relatórios | Tasks (T4, T7) | In Tasks |
| TAG-15 | P3: Filtro por Tag, Análise e Exportação nos Relatórios | Tasks (T4, T7) | In Tasks |
| TAG-16 | P3: Filtro por Tag, Análise e Exportação nos Relatórios | Tasks (T7) | In Tasks |

Coverage: 16 total, 16 mapped to tasks, 0 unmapped ✅

---

## Success Criteria

How we know the feature is successful:

- [ ] Lançamentos podem receber 1 ou N tags no momento da criação, com propagação automática em parcelas de cartão.
- [ ] Endpoint `/tags` fornece autocomplete de tags por escopo (pessoal/familiar) em menos de 100ms.
- [ ] Tela de extrato exibe chips de tags e permite filtrar por tag.
- [ ] Tela de relatórios permite filtrar por tag atualizando fluxo de caixa, categorias e distribuição por tags.
- [ ] Exportação CSV inclui a coluna `Tags` com as tags correspondentes.
- [ ] 100% dos testes unitários e de integração do backend passam sem regressões.
