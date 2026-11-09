# Autocomplete de Descrição de Lançamentos Specification

## Problem Statement

Atualmente, ao cadastrar um novo lançamento financeiro (nas abas de Despesa, Receita ou Transferência), o usuário precisa digitar manualmente toda a descrição do zero, sem auxílio de preenchimento automático baseado no histórico existente. Essa ausência aumenta o atrito no cadastro, induz inconsistências na nomenclatura e retarda o fluxo de uso diário. É necessário disponibilizar um autocomplete rápido, isolado estritamente por tipo de transação (Despesa, Receita e Transferência) e projetado para manter altíssimo desempenho mesmo quando o banco de dados contiver dezenas ou centenas de milhares de registros.

## Goals

- [x] Disponibilizar endpoint backend seguro e otimizado (`GET /transactions/descriptions`) para consulta de descrições anteriores distintas com ordenação por frequência/recência e estrito isolamento por tipo (`EXPENSE`, `INCOME`, `TRANSFER`).
- [x] Implementar componente de autocomplete no frontend (`AutocompleteInput`) integrado ao modal de novo lançamento nas 3 abas (Despesa, Receita, Transferência) com navegação via teclado, debounce e cache client-side.
- [x] Garantir isolamento total entre as abas: a aba de Despesa nunca deve sugerir descrições de Receita ou Transferência, e vice-versa.
- [x] Garantir performance consistente em cenários de alta volumetria de dados no banco através de índices compostos, agrupamento eficiente (`groupBy`), paginação rígida (`limit` máximo) e debounce/cache em memória no frontend.
- [x] Assegurar privacidade e multi-tenancy: nunca vazar descrições de lançamentos privados (`isPrivate: true`) de outros membros nem descrições de transações excluídas (`deletedAt`).

## Out of Scope

Explicitly excluded. Documented to prevent scope creep.

| Feature | Reason |
| ------- | ------ |
| Autocomplete de campos de observações/notas | O requisito do usuário é específico para o campo de descrição nas 3 abas. |
| Alteração retroativa de descrições antigas | O recurso é exclusivamente de sugestão/preenchimento para novos lançamentos. |
| Criação de tabela dedicada de histórico de termos | Utiliza-se a própria tabela `transactions` com agregação e índices otimizados, sem overhead de sincronização de tabela secundária. |

---

## Assumptions & Open Questions

Every ambiguity is resolved or recorded here - nothing is left silently unclear.

| Assumption / decision | Chosen default | Rationale | Confirmed? |
| --------------------- | -------------- | --------- | ---------- |
| Ordenação das sugestões | Mais recentes primeiro (`_max: { transactionDate: 'desc' }`) | Sugere descrições utilizadas mais recentemente pelo usuário, que possuem maior probabilidade de repetição | y |
| Quantidade máxima de sugestões | 10 itens no dropdown | Evita poluição visual no modal e limita o consumo de rede/memória | y |
| Comportamento ao focar campo vazio | Exibe as 10 descrições mais recentes do tipo ativo | Permite preenchimento com 1 clique para despesas e receitas habituais | y |
| Tempo de debounce no frontend | 250ms | Equilibra responsividade imediata com redução drástica de requisições ao backend durante digitação | y |
| Cache client-side | Cache em memória por chave `[família/pessoal]:[tipo]:[busca]` com expiração/invalidação ao salvar | Elimina chamadas de rede redundantes ao apagar/digitar os mesmos caracteres | y |
| Transações privadas | Ocultar descrições de lançamentos com `isPrivate: true` se o autor for outro usuário | Preserva a integridade e privacidade definidas pelas regras de segurança do sistema | y |

**Open questions:** none - all resolved or logged above (required before the spec is confirmed).

---

## User Stories

### P1: Autocomplete Isolado por Aba nos Lançamentos ⭐ MVP

**User Story**: Como usuário do sistema financeiro, quero que ao digitar ou focar o campo de descrição nas abas de Despesa, Receita e Transferência sejam sugeridas descrições cadastradas anteriormente para aquele mesmo tipo, para que eu cadastre novos lançamentos rapidamente e sem inconsistências.

**Why P1**: É a funcionalidade central requisitada pelo usuário, agregando valor imediato ao fluxo de entrada de dados diário.

**Acceptance Criteria** (each line is one EARS pattern):

1. WHEN o usuário foca ou digita no campo de descrição da aba Despesa THEN o sistema SHALL retornar exclusivamente sugestões de descrições anteriores de transações do tipo `EXPENSE`.
2. WHEN o usuário foca ou digita no campo de descrição da aba Receita THEN o sistema SHALL retornar exclusivamente sugestões de descrições anteriores de transações do tipo `INCOME`.
3. WHEN o usuário foca ou digita no campo de descrição da aba Transferência THEN o sistema SHALL retornar exclusivamente sugestões de descrições anteriores de transações do tipo `TRANSFER`.
4. O sistema SHALL nunca retornar sugestões de um tipo de transação na aba de outro tipo de transação.
5. O sistema SHALL excluir transações excluídas logicamente (`deletedAt IS NOT NULL`) e transações privadas (`isPrivate = true`) de outros membros familiares das sugestões de autocomplete.
6. WHEN a consulta de descrições for executada THEN o sistema SHALL limitar o resultado ao limite máximo estipulado (padrão 10, máximo 20) ordenadas pela data mais recente da transação.
7. WHEN o usuário clica ou pressiona Enter sobre uma sugestão da lista THEN o sistema SHALL preencher o campo de descrição com o valor selecionado e fechar a lista suspensa.
8. IF o usuário alternar entre as abas Despesa, Receita ou Transferência THEN o sistema SHALL imediatamente resetar e atualizar a lista de sugestões para corresponder ao novo tipo selecionado.

**Independent Test**: Abrir o modal de Lançamento na aba Despesa, verificar que aparecem apenas descrições de despesas anteriores; alternar para Receita e verificar que aparecem apenas receitas; alternar para Transferência e verificar que aparecem apenas transferências.

---

### P2: Otimização de Performance para Grandes Volumes de Dados

**User Story**: Como usuário com banco de dados contendo dezenas ou centenas de milhares de lançamentos, quero que o autocomplete responda instantaneamente (< 100ms) sem travar ou sobrecarregar a aplicação e o banco.

**Why P2**: Requisito explícito de engenharia solicitado pelo usuário para garantir escalabilidade e ausência de lentidão sob carga massiva.

**Acceptance Criteria**:

1. The sistema SHALL utilizar índices compostos cobrindo `[familyId, type, deletedAt, description]` e `[userId, type, deletedAt, description]` para viabilizar index scans rápidos no PostgreSQL.
2. WHILE o usuário estiver digitando no campo de descrição the frontend SHALL aplicar debounce de 250ms antes de disparar requisição ao backend.
3. WHERE o resultado para uma combinação de família, tipo e termo de busca já tiver sido obtido na sessão the frontend SHALL retornar as sugestões instantaneamente a partir do cache em memória sem realizar nova requisição HTTP.
4. IF a busca no backend retornar mais de 10 descrições distintas THEN o sistema SHALL truncar e retornar apenas as 10 descrições mais recentes para manter o payload leve e ágil.

**Independent Test**: Simular digitação rápida e verificar que apenas uma requisição é disparada após o debounce, verificar que reconsultas idênticas usam cache local instantâneo, e verificar no explain plan do banco que os índices de tipo e contexto são acionados.

---

## Edge Cases

- IF o usuário digitar termos com espaços adicionais no início ou fim THEN o sistema SHALL sanitizar o termo com trim antes de realizar a consulta.
- IF não houver nenhuma transação prévia cadastrada para aquele tipo THEN o sistema SHALL exibir o campo normalmente sem lista suspensa e permitir a digitação livre.
- IF o usuário selecionar a tecla Escape com a lista suspensa aberta THEN o sistema SHALL fechar a lista mantendo o texto digitado até o momento.
- IF o usuário clicar fora do campo ou da lista suspensa THEN o sistema SHALL fechar a lista de sugestões.
- IF a requisição de busca falhar por instabilidade de rede THEN o sistema SHALL manter o valor digitado sem travar o formulário ou impedir a submissão manual.

---

## Requirement Traceability

Each requirement gets a unique ID for tracking across design, tasks, and validation.

| Requirement ID | Story | Phase | Status |
| -------------- | ----- | ----- | ------ |
| AUTO-01 | P1: Autocomplete Isolado por Aba nos Lançamentos | Execute | Implemented |
| AUTO-02 | P1: Autocomplete Isolado por Aba nos Lançamentos | Execute | Implemented |
| AUTO-03 | P1: Autocomplete Isolado por Aba nos Lançamentos | Execute | Implemented |
| AUTO-04 | P1: Autocomplete Isolado por Aba nos Lançamentos | Execute | Implemented |
| AUTO-05 | P1: Autocomplete Isolado por Aba nos Lançamentos | Execute | Implemented |
| AUTO-06 | P1: Autocomplete Isolado por Aba nos Lançamentos | Execute | Implemented |
| AUTO-07 | P1: Autocomplete Isolado por Aba nos Lançamentos | Execute | Implemented |
| AUTO-08 | P1: Autocomplete Isolado por Aba nos Lançamentos | Execute | Implemented |
| AUTO-09 | P2: Otimização de Performance para Grandes Volumes de Dados | Execute | Implemented |
| AUTO-10 | P2: Otimização de Performance para Grandes Volumes de Dados | Execute | Implemented |
| AUTO-11 | P2: Otimização de Performance para Grandes Volumes de Dados | Execute | Implemented |
| AUTO-12 | P2: Otimização de Performance para Grandes Volumes de Dados | Execute | Implemented |

**Coverage:** 12 total, 12 mapped to tasks, 0 unmapped

---

## Success Criteria

How we know the feature is successful:

- [x] Campo de descrição exibe sugestões anteriores isoladas estritamente por tipo (Despesa, Receita, Transferência).
- [x] 0 vazamentos de descrições entre abas diferentes e 0 vazamentos de lançamentos privados de outros usuários.
- [x] Resposta do autocomplete no frontend perceptivelmente instantânea com debounce e cache local ativo.
- [x] 100% de aprovação na suíte de testes unitários e de integração no backend e compilação limpa do frontend.
