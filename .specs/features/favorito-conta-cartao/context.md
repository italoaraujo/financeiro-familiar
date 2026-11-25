# Favoritar Contas e Cartões Context

**Gathered:** 2026-11-19
**Spec:** `.specs/features/favorito-conta-cartao/spec.md`
**Status:** Ready for design

---

## Feature Boundary

Permitir que cada usuário favorite e desfavorite múltiplas contas bancárias e múltiplos cartões de crédito ativos, de forma individual por usuário (inclusive em grupos familiares), exibindo seus favoritos primeiro nos combos de cadastro de lançamento e nas listagens e combos que consomem contas e cartões.

---

## Implementation Decisions

### Quantidade de favoritos

- O sistema permite favoritar múltiplas contas e múltiplos cartões simultaneamente no mesmo contexto (pessoal ou familiar).
- Todos os favoritos aparecem no topo da lista, desempatados pela ordem atual (`createdAt DESC`).

### Escopo em grupos familiares

- O favorito é individual por usuário.
- Cada membro de um grupo familiar mantém sua própria lista de contas e cartões favoritos, sem alterar o estado `isFavorite` nem a ordenação exibida para os demais membros.

### Interação em `/accounts` e `/cards`

- Cada card ativo exibe um botão de estrela (`★`) para alternar o favorito imediatamente, sem modal de confirmação.
- Contas e cartões arquivados não exibem ação de favoritar.

### Combos de Lançamento (`/transactions`) e demais telas

- Os combos de Conta (Despesa, Receita, Conta Origem e Conta Destino em Transferência) e Cartão (Despesa no Cartão) no modal de Novo Lançamento exibem favoritos primeiro com prefixo visual `"★ "`, preservando a pré-seleção automática do primeiro item da lista.
- A mesma ordenação e o prefixo `"★ "` aplicam-se aos combos de conta em Liquidação de Fatura (`/cards`) e Nova Meta (`/goals`).
- As abas ativas de `/accounts` e `/cards` exibem os favoritos primeiro na grade.

### Ciclo de vida (Arquivar / Excluir)

- Contas e cartões arquivados não podem ser favoritados.
- Ao arquivar ou excluir (soft delete) uma conta ou cartão, todos os vínculos de favorito daquele item são removidos automaticamente para todos os usuários.

### Agent's Discretion

- Detalhes visuais do botão estrela (paleta Tailwind `amber-400`/`slate-400` e estado desabilitado enquanto a requisição está em andamento).
- Modelagem das tabelas relacionais e contratos exatos de rota REST no Design.

### Declined / Undiscussed Gray Areas → Assumptions

- Papel `VIEWER` em grupos familiares: bloqueado no backend (`HTTP 403`) e botão oculto no frontend, em conformidade com `AD-014` (registrado na tabela de premissas do `spec.md`).
- Desempate entre múltiplos favoritos: `createdAt DESC`, sem ordenação manual.

---

## Specific References

- Seguir o agrupamento de botões de ação existente nos cards de `/accounts` e `/cards`, posicionando a estrela ao lado de Arquivar e Excluir.

---

## Deferred Ideas

- Ordenação manual (drag-and-drop ou prioridade numérica) entre múltiplos favoritos.
- Favoritar categorias ou pessoas.
