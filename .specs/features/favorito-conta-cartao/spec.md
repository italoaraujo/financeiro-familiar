# Favoritar Contas e Cartões Specification

## Problem Statement

Usuários com múltiplas contas bancárias e cartões de crédito precisam percorrer a lista inteira nos combos do cadastro de lançamento para selecionar a conta ou o cartão usado no dia a dia. Sem marcação de favoritos por usuário, a ordenação fixa por data de criação obriga seleções repetitivas a cada registro financeiro.

## Goals

- [x] Permitir que cada usuário favorite e desfavorite múltiplas contas bancárias e múltiplos cartões de crédito ativos de forma independente.
- [x] Exibir os itens favoritos do usuário autenticado primeiro (`isFavorite DESC, createdAt DESC`) nas listagens da API, nos cards ativos e nos combos de cadastro de lançamento e demais telas dependentes.
- [x] Preservar a integridade de ciclo de vida ao impedir favoritar itens arquivados ou excluídos e ao limpar os vínculos de favorito ao arquivar ou excluir um item.

## Out of Scope

| Feature | Reason |
| --- | --- |
| Ordenação manual ou drag-and-drop entre favoritos | Múltiplos favoritos usam desempate determinístico por `createdAt DESC`, mantendo o escopo simples. |
| Favoritar categorias, pessoas ou metas | A solicitação cobre apenas contas bancárias e cartões de crédito. |
| Favoritar contas ou cartões arquivados | Itens arquivados ficam ocultos dos combos de lançamento e não recebem novos lançamentos. |
| Sincronização de favoritos entre membros da família | O usuário decidiu que favoritos são individuais por membro da família. |

---

## Assumptions & Open Questions

| Assumption / decision | Chosen default | Rationale | Confirmed? |
| --- | --- | --- | --- |
| Quantidade de favoritos por contexto | Múltiplas contas e múltiplos cartões simultâneos | Permite priorizar os principais meios de pagamento do usuário. | y |
| Escopo em grupos familiares | Individual por usuário autenticado | Cada membro vê apenas os seus próprios favoritos sem afetar outros membros. | y |
| Permissão de membro `VIEWER` | Bloquear mutações com HTTP 403 no backend e ocultar botão estrela no frontend | Mantém conformidade com a decisão arquitetural ativa `AD-014`. | y |
| Ação de favoritar nos cards | Botão estrela direto nos cards ativos com alternância imediata sem modal de confirmação | Reduz atrito em ação reversível, mantendo confirmação apenas para arquivar/excluir. | y |
| Desempate entre múltiplos favoritos | `isFavorite DESC, createdAt DESC` | Preserva a ordenação padrão atual da API dentro de cada grupo. | y |
| Indicador e pré-seleção nos combos | Favoritos no topo com prefixo `"★ "` e seleção inicial no primeiro item | Destaca visualmente os favoritos no `<select>` nativo sem quebrar a pré-seleção atual. | y |
| Ciclo de vida ao arquivar ou excluir | Remover automaticamente todos os vínculos de favorito do item arquivado ou excluído | Evita que itens desarquivados voltem marcados como favoritos sem ação explícita. | y |

**Open questions:** none - all resolved or logged above.

---

## Implicit-Requirement Dimensions

| Dimension | Coverage / Rationale |
| --- | --- |
| Input validation & bounds | IDs de conta e cartão validados como existentes e ativos (`deletedAt: null`, não arquivados). |
| Failure / partial-failure states | Falhas de rede ou HTTP na alternância do favorito mantêm o estado anterior na UI e exibem feedback de erro. |
| Idempotency / retry / duplicate handling | Favoritar um item já marcado ou desfavoritar um item não marcado retorna `HTTP 200` com estado final idempotente sem duplicar registros. |
| Auth boundaries & rate limits | Autenticação JWT obrigatória; validação de titularidade pessoal ou pertinência à família; bloqueio de `VIEWER` (`HTTP 403`) conforme `AD-014`; isolamento estrito por `userId`. |
| Concurrency / ordering | Chaves únicas por `(userId, accountId)` e `(userId, creditCardId)` impedem duplicidade concorrente; ordenação determinística `isFavorite DESC, createdAt DESC`. |
| Data lifecycle / expiry | Arquivamento e soft delete (`deletedAt`) removem automaticamente os vínculos de favorito daquela conta ou cartão. |
| Observability | Mutações passam pelo `AuditLogInterceptor` global existente sem logs adicionais customizados. |
| External-dependency failure | N/A because the feature operates strictly on the internal PostgreSQL database and REST API without external services. |
| State-transition integrity | Somente itens com `deletedAt: null` e ativos (`isArchived: false` em conta; `isActive: true` em cartão) podem ser favoritados; desarquivamento retorna o item com `isFavorite: false`. |

---

## User Stories

### P1: Favoritar e Desfavoritar Contas Bancárias por Usuário ⭐ MVP

**User Story**: As an authenticated user, I want to favorite and unfavorite multiple active bank accounts individually so that my primary accounts stay prioritized without affecting other family members.

**Why P1**: Core requirement for identifying and ordering favorite accounts per user.

**Acceptance Criteria**:
1. WHEN an authenticated user with write access requests to favorite an active account THEN the system SHALL persist the favorite link for that user and return HTTP 200 with `isFavorite: true`.
2. WHEN the same user requests to favorite an already favorited account THEN the system SHALL remain idempotent without creating duplicate records and return HTTP 200 with `isFavorite: true`.
3. WHEN an authenticated user with write access requests to unfavorite an account THEN the system SHALL remove only that user's favorite link and return HTTP 200 with `isFavorite: false`, returning HTTP 200 with `isFavorite: false` even if the account was not favorited.
4. IF an account does not exist or has `deletedAt` set THEN the system SHALL return HTTP 404 when a user attempts to favorite or unfavorite it.
5. IF an account is archived (`isArchived: true`) THEN the system SHALL reject favoriting with HTTP 400 and message `"Não é possível favoritar uma conta arquivada"`.
6. IF the authenticated user has no access to the account or holds role `VIEWER` in the account's family THEN the system SHALL return HTTP 403 without modifying favorites.
7. WHILE querying `GET /accounts` for an authenticated user the system SHALL include `isFavorite` for that user on each returned item and sort results by `isFavorite DESC, createdAt DESC`, without leaking or altering other family members' favorites.
8. WHEN querying `GET /accounts/:id` for an authenticated user THEN the system SHALL include `isFavorite` reflecting only that user's favorite state.

**Independent Test**: Marcar uma conta ativa como favorita para o usuário A, consultar `GET /accounts` como usuário A (retorna `isFavorite: true` no topo) e como usuário B na mesma família (retorna `isFavorite: false` na ordem padrão).

---

### P1: Favoritar e Desfavoritar Cartões de Crédito por Usuário ⭐ MVP

**User Story**: As an authenticated user, I want to favorite and unfavorite multiple active credit cards individually so that my preferred cards appear first without changing other members' lists.

**Why P1**: Core requirement for identifying and ordering favorite credit cards per user.

**Acceptance Criteria**:
1. WHEN an authenticated user with write access requests to favorite an active credit card THEN the system SHALL persist the favorite link for that user and return HTTP 200 with `isFavorite: true`.
2. WHEN the same user requests to favorite an already favorited credit card THEN the system SHALL remain idempotent without creating duplicate records and return HTTP 200 with `isFavorite: true`.
3. WHEN an authenticated user with write access requests to unfavorite a credit card THEN the system SHALL remove only that user's favorite link and return HTTP 200 with `isFavorite: false`, returning HTTP 200 with `isFavorite: false` even if the card was not favorited.
4. IF a credit card does not exist or has `deletedAt` set THEN the system SHALL return HTTP 404 when a user attempts to favorite or unfavorite it.
5. IF a credit card is archived (`isActive: false`) THEN the system SHALL reject favoriting with HTTP 400 and message `"Não é possível favoritar um cartão arquivado"`.
6. IF the authenticated user has no access to the credit card or holds role `VIEWER` in the card's family THEN the system SHALL return HTTP 403 without modifying favorites.
7. WHILE querying `GET /credit-cards` for an authenticated user the system SHALL include `isFavorite` for that user on each returned item and sort results by `isFavorite DESC, createdAt DESC`, without leaking or altering other family members' favorites.
8. WHEN querying `GET /credit-cards/:id` for an authenticated user THEN the system SHALL include `isFavorite` reflecting only that user's favorite state.

**Independent Test**: Marcar um cartão ativo como favorito para o usuário A, consultar `GET /credit-cards` como usuário A (retorna `isFavorite: true` no topo) e como usuário B na mesma família (retorna `isFavorite: false` na ordem padrão).

---

### P1: Priorização de Favoritos nos Combos de Lançamento e Telas de Gestão ⭐ MVP

**User Story**: As a user creating transactions or managing accounts and cards, I want to toggle favorites directly on active cards and see favorites first in transaction and management dropdowns so that I select my preferred account or card immediately.

**Why P1**: Delivers the user-facing workflow requested in `/transactions`, `/accounts`, `/cards`, and secondary account selectors.

**Acceptance Criteria**:
1. WHILE viewing active accounts in `/accounts` or active cards in `/cards` as a non-`VIEWER` user, the system SHALL render a direct star toggle button on each active card and apply immediate toggle without a confirmation dialog, while hiding the button on archived items and for `VIEWER` users.
2. WHEN a user opens the Novo Lançamento modal in `/transactions` THEN the system SHALL display favorite accounts first with `"★ "` prefix in Expense, Income, Source Transfer, and Destination Transfer combos, and pre-select the first available account.
3. WHEN a user selects payment mode Cartão de Crédito in the Novo Lançamento modal in `/transactions` THEN the system SHALL display favorite cards first with `"★ "` prefix in the Credit Card combo, and pre-select the first available card.
4. WHILE viewing secondary account combos in Liquidação de Fatura (`/cards`) and Nova Meta (`/goals`) the system SHALL display favorite accounts first with `"★ "` prefix.
5. IF a favorite toggle request fails on the frontend THEN the system SHALL keep the previous favorite state in the UI and display an error alert to the user.

**Independent Test**: Favoritar uma conta e um cartão em `/accounts` e `/cards`, abrir "Novo Lançamento" em `/transactions` e confirmar que os favoritos aparecem no topo com prefixo `"★ "` em todos os combos aplicáveis e vêm pré-selecionados.

---

### P2: Integridade de Ciclo de Vida ao Arquivar ou Excluir

**User Story**: As a user archiving or deleting accounts and credit cards, I want obsolete favorite links to be cleared automatically so that unarchived items never return as unexpected favorites.

**Why P2**: Prevents stale favorite records across archive/unarchive and soft-delete lifecycles.

**Acceptance Criteria**:
1. WHEN an account is archived or soft-deleted THEN the system SHALL remove all favorite links associated with that account for all users.
2. WHEN a credit card is archived or soft-deleted THEN the system SHALL remove all favorite links associated with that credit card for all users.
3. WHEN a previously favorited account or credit card is later unarchived THEN the system SHALL return it with `isFavorite: false` for every user until favorited again.

**Independent Test**: Favoritar uma conta e um cartão, arquivá-los, desarquivá-los e verificar que ambos retornam com `isFavorite: false`.

---

## Edge Cases

- IF a user switches between personal context and family context THEN the system SHALL apply favorites only to the accounts and cards visible in the active context (`familyId` vs personal).
- IF a user unfavorites a non-favorited account or credit card THEN the system SHALL handle the request idempotently and return HTTP 200 with `isFavorite: false`.
- IF a favorite toggle button is clicked rapidly before the previous request completes THEN the frontend SHALL disable the button during the in-flight request to prevent out-of-order state flips.
- IF an account or card has no favorites for the current user THEN all combos SHALL preserve the existing `createdAt DESC` order without `"★ "` prefix.

---

## Requirement Traceability

| Requirement ID | Story | Phase | Status |
| --- | --- | --- | --- |
| FAV-01 | P1: Favoritar e Desfavoritar Contas Bancárias por Usuário | Tasks | Verified |
| FAV-02 | P1: Favoritar e Desfavoritar Contas Bancárias por Usuário | Tasks | Verified |
| FAV-03 | P1: Favoritar e Desfavoritar Contas Bancárias por Usuário | Tasks | Verified |
| FAV-04 | P1: Favoritar e Desfavoritar Cartões de Crédito por Usuário | Tasks | Verified |
| FAV-05 | P1: Favoritar e Desfavoritar Cartões de Crédito por Usuário | Tasks | Verified |
| FAV-06 | P1: Favoritar e Desfavoritar Cartões de Crédito por Usuário | Tasks | Verified |
| FAV-07 | P1: Priorização de Favoritos nos Combos de Lançamento e Telas de Gestão | Tasks | Verified |
| FAV-08 | P1: Priorização de Favoritos nos Combos de Lançamento e Telas de Gestão | Tasks | Verified |
| FAV-09 | P1: Priorização de Favoritos nos Combos de Lançamento e Telas de Gestão | Tasks | Verified |
| FAV-10 | P2: Integridade de Ciclo de Vida ao Arquivar ou Excluir | Tasks | Verified |

**Coverage:** 10 total, 10 mapped to tasks, 0 unmapped ✅

---

## Success Criteria

- [x] Usuário consegue favoritar e desfavoritar múltiplas contas e cartões ativos diretamente pelos cards sem afetar outros membros da família.
- [x] Combos do cadastro de lançamento (`/transactions`) e combos secundários (`/cards`, `/goals`) exibem favoritos do usuário autenticado primeiro com prefixo `"★ "`.
- [x] Arquivar ou excluir uma conta ou cartão limpa seus vínculos de favorito e impede favoritar itens arquivados.
