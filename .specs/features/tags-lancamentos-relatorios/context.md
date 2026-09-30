# Tags em Lançamentos e Filtro em Relatórios - Context

**Gathered:** 2026-09-16
**Spec:** `.specs/features/tags-lancamentos-relatorios/spec.md`
**Status:** Ready for design

---

## Feature Boundary

Permitir a criação, atribuição e visualização de tags (uma ou múltiplas) em lançamentos financeiros (receitas, despesas, parcelamentos), e habilitar a filtragem por tag na tela de Extrato de Transações e na tela de Relatórios (incluindo fluxo de caixa, distribuição por categorias, exportação CSV e distribuição de gastos por tag).

---

## Implementation Decisions

### Atribuição de Tags nos Lançamentos
- Um lançamento financeiro pode ter **múltiplas tags** (ex: `#viagem`, `#trabalho`, `#reembolsavel`), suportando também o uso de apenas uma tag caso o usuário deseje.
- Em compras parceladas no cartão de crédito (`totalInstallments > 1`), as tags informadas no ato do cadastro são automaticamente replicadas para todas as parcelas do grupo (`installmentGroupId`), mantendo a consistência do agrupamento.

### Criação e Seleção Dinâmica de Tags
- Criação dinâmica via input de tags / chips com autocomplete diretamente no modal de novo lançamento.
- Ao digitar, se a tag já existir no escopo ativo (familiar ou pessoal), ela é sugerida para seleção rápida. Se não existir, é criada automaticamente ao pressionar `Enter` ou vírgula.
- O nome da tag é normalizado (sem espaços excedentes, limite de 50 caracteres) e possui cor gerada dinamicamente ou pré-definida para exibição consistente.

### Filtros e Análises no Módulo de Relatórios
- Adicionar seletor de tag na barra de filtros de `/reports`.
- Quando uma tag é selecionada:
  1. O gráfico de Evolução Mensal (Fluxo de Caixa) consolida apenas receitas e despesas vinculadas à tag.
  2. A Distribuição por Categorias contabiliza apenas as despesas vinculadas à tag.
  3. A exportação em CSV filtra por tag e inclui uma coluna explícita `Tags` com as tags do lançamento separadas por vírgula.
- Exibir uma seção ou gráfico de **Distribuição de Gastos por Tag** no relatório quando nenhum filtro específico de tag estiver ativo, ou destacando a proporção da tag no período.

### Exibição e Filtro no Extrato de Transações
- As tags são exibidas como badges/chips visuais ao lado de cada transação na tabela de extrato em `/transactions`.
- A barra de filtros de `/transactions` recebe um campo de seleção/filtro por tag para localizar lançamentos rapidamente.

### Agent's Discretion
- Modelagem de dados relacional no PostgreSQL com Prisma: tabela `tags` (com `id`, `name`, `color`, `userId`, `familyId`, `deletedAt`) e tabela intermediária `transaction_tags` (`transactionId`, `tagId`).
- Isolamento estrito de permissões respeitando o contexto ativo (`familyId` vs `userId`) e controle de acesso RBAC (`VIEWER` não pode criar ou vincular tags).

### Declined / Undiscussed Gray Areas → Assumptions
- Exclusão de tags: Tags que não estiverem mais associadas a nenhum lançamento ativo continuam salvas no escopo para reuso no autocomplete, sem necessidade de tela separada de CRUD de tags no MVP.
- Lançamentos privados (`isPrivate`): Se uma transação privada pertencer a outro membro da família, as tags são ocultadas para preservar a confidencialidade familiar (RN06).

---

## Specific References
- Alinhado diretamente com o usuário em 2026-09-16: adoção de múltiplas tags com criação dinâmica, filtro global em relatórios com CSV e badges no extrato.

---

## Deferred Ideas
- Gestão avançada de tags em tela dedicada de configurações (renomear tag globalmente, mesclar tags, alterar cores manualmente): postergado para versão futura caso haja demanda.
