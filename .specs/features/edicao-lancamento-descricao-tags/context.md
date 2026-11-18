# Edição de Descrição e Tags de Lançamento Context

**Gathered:** 2026-11-17
**Spec:** `.specs/features/edicao-lancamento-descricao-tags/spec.md`
**Status:** Ready for tasks

---

## Feature Boundary

Permitir a edição exclusiva dos campos **Descrição** (`description`) e **Tags** (`tags`) de um lançamento financeiro via `PUT /transactions/:id` e modal dedicado na tela `/transactions`, mantendo todos os demais campos imutáveis tanto na interface (somente leitura/desabilitados) quanto na API (`whitelist` + `forbidNonWhitelisted`).

---

## Implementation Decisions

### Comportamento em Compras Parceladas

- Ao editar um lançamento parcelado no cartão de crédito (com `installmentGroupId` preenchido), a atualização da Descrição e das Tags deve ser propagada automaticamente para todas as parcelas ativas (`deletedAt: null`) da mesma compra.

### Experiência Visual no Modal de Edição

- O modal de edição exibe todos os demais campos do lançamento (Tipo, Valor, Data/Horário, Categoria, Conta/Cartão, Parcelamento, Pessoa Responsável e Privacidade) visíveis em modo somente leitura/desabilitado com indicação clara de bloqueio (`Imutável`), deixando apenas **Descrição** e **Tags** habilitados para edição.

### Lançamentos Elegíveis e Segurança

- Todos os lançamentos do contexto pessoal ou familiar (Despesas, Receitas, Transferências, movimentações de Metas/Cofrinhos e lançamentos de Faturas abertas, fechadas ou pagas) podem ter Descrição e Tags editados, pois valores, contas, categorias e faturas não sofrem alteração.
- Mantêm-se estritas as regras de RBAC (membros `VIEWER` não podem editar — HTTP 403) e privacidade familiar (lançamentos `isPrivate = true` só podem ser editados pelo próprio autor).

### Agent's Discretion

- Utilizar `PUT /transactions/:id` seguindo o padrão REST já adotado nos demais módulos da API (`GoalsController`, `AccountsController`, `CreditCardsController`, `CategoriesController`, `BudgetsController`).
- Reutilizar `AutocompleteInput` para o campo Descrição (quando o tipo for compatível) e `TagInput` para as Tags no modal de edição, garantindo UX consistente com o modal de criação.
- Exibir aviso informativo quando o lançamento for parcelado indicando que as alterações de Descrição e Tags serão aplicadas a todas as parcelas da compra.

### Declined / Undiscussed Gray Areas → Assumptions

- Envio parcial no DTO (`description` opcional ou `tags` opcional) atualiza apenas o campo presente; envio de `tags: []` limpa todas as tags vinculadas ao lançamento (e suas parcelas irmãs).

---

## Specific References

- "queria pode editar o seguinte campos de uma lançamento... Descrição e a tags / Tag / Os outro campos não pode ser editado"
- Padrão visual de campo bloqueado com badge `Imutável` adotado em `frontend/src/app/goals/page.tsx` (`EditGoalModal`).

---

## Deferred Ideas

- None - discussion stayed within feature scope.
