# Arquivamento e Desarquivamento de Cartões de Crédito Specification

## Problem Statement

Atualmente, no módulo de cartões de crédito (`/cards`), a inativação de um cartão ocorre apenas por meio do checkbox `"Cartão Ativo (exibir no painel)"` dentro do modal de edição, e `GET /credit-cards` filtra estritamente `isActive: true`. Ao desmarcar essa opção, o cartão desaparece completamente da listagem e o usuário não consegue mais visualizar cartões arquivados nem restaurá-los, divergindo do fluxo intuitivo adotado nas Contas Bancárias (`/accounts`).

## Goals

- [ ] Permitir listar cartões arquivados via parâmetro opcional `includeArchived=true` em `GET /credit-cards`, preservando o comportamento padrão de retornar apenas cartões ativos (`isActive: true`).
- [ ] Disponibilizar endpoints dedicados `PATCH /credit-cards/:id/archive` e `PATCH /credit-cards/:id/unarchive` no backend com validação de estado e RBAC.
- [ ] Remover o checkbox `"Cartão Ativo (exibir no painel)"` do formulário de edição de cartão em `/cards`.
- [ ] Exibir abas de filtro "Ativos" e "Arquivados" com contadores em `/cards`, selo visual `Arquivado` e ícones de ação direta para arquivar (`Archive`) e desarquivar (`ArchiveRestore`) em cada card.

## Out of Scope

Explicitly excluded. Documented to prevent scope creep.

| Feature | Reason |
| ------- | ------ |
| Exibição de cartões arquivados nos selects de criação de novos lançamentos ou recorrências | Cartões arquivados devem permanecer fora do fluxo operacional diário até serem explicitamente desarquivados |
| Alteração do schema Prisma (`CreditCard`) para criar coluna `isArchived` separada | O campo booleano `isActive` combinado com `deletedAt: null` já representa o estado ativo vs arquivado sem necessidade de migração |
| Bloqueio de pagamento de faturas abertas já existentes ao acessar detalhes de um cartão arquivado | O histórico e eventual liquidação de faturas remanescentes continuam acessíveis na aba Arquivados |

---

## Assumptions & Open Questions

Every ambiguity is resolved or recorded here - nothing is left silently unclear.

| Assumption / decision | Chosen default | Rationale | Confirmed? |
| --------------------- | -------------- | --------- | ---------- |
| Persistência de estado arquivado no `CreditCard` | Utilizar `isActive: false` com `deletedAt: null` como estado arquivado (`isActive: true` = ativo) | Evita migração de banco e reaproveita o filtro `isActive: true` já usado pelo restante do sistema | y |
| Comportamento padrão de `GET /credit-cards` | Sem `includeArchived=true`, retornar apenas `isActive: true` e `deletedAt: null` | Mantém `/transactions` e demais telas consumidoras exibindo apenas cartões ativos nos seletores | y |
| Remoção do checkbox no modal de edição | Remover `"Cartão Ativo (exibir no painel)"` do modal e do estado do formulário em `/cards` | Atende à solicitação explícita do usuário de mover o controle para ícones no card e abas | y |
| Validação de transição em archive/unarchive | Rejeitar `archive` se `!card.isActive` e `unarchive` se `card.isActive` com HTTP 400 (`BadRequestException`) | Garante integridade de transição de estado e evita mutações redundantes | y |
| Padrão de permissões e acesso | Aplicar as mesmas regras de titularidade, pertencimento à família e bloqueio de `VIEWER` (HTTP 403) | Mantém paridade com `AccountsService` e demais endpoints de `CreditCardsService` | y |

**Open questions:** none - all resolved or logged above.

---

## User Stories

### P1: Listagem de Cartões Arquivados, Arquivamento e Desarquivamento no Backend ⭐ MVP

**User Story**: As a usuário autenticado ou membro autorizado da família, I want consultar cartões arquivados via API e alternar seu estado via endpoints de arquivamento e desarquivamento so that eu possa gerenciar o ciclo de vida dos cartões mantendo os seletores operacionais limpos.

**Why P1**: Estabelece o contrato seguro de leitura e transição de estado no servidor antes da atualização da interface.

**Acceptance Criteria**:

1. WHEN uma requisição `GET /credit-cards` for enviada sem o parâmetro `includeArchived` ou com `includeArchived` diferente de `'true'` THEN the system SHALL retornar apenas os cartões ativos (`isActive: true` e `deletedAt: null`) do escopo pessoal ou familiar.
2. WHEN uma requisição `GET /credit-cards?includeArchived=true` for enviada THEN the system SHALL retornar todos os cartões não excluídos (`deletedAt: null`, incluindo `isActive: true` e `isActive: false`) do escopo pessoal ou familiar.
3. WHEN uma requisição `PATCH /credit-cards/:id/archive` for enviada para um cartão ativo (`isActive: true`) THEN the system SHALL atualizar o cartão para `isActive: false`.
4. IF o cartão alvo de `PATCH /credit-cards/:id/archive` já estiver arquivado (`isActive: false`) THEN the system SHALL rejeitar a operação com erro HTTP 400 (`BadRequestException`).
5. WHEN uma requisição `PATCH /credit-cards/:id/unarchive` for enviada para um cartão arquivado (`isActive: false`) THEN the system SHALL atualizar o cartão para `isActive: true`.
6. IF o cartão alvo de `PATCH /credit-cards/:id/unarchive` já estiver ativo (`isActive: true`) THEN the system SHALL rejeitar a operação com erro HTTP 400 (`BadRequestException`).
7. IF o cartão informada não existir ou estiver com `deletedAt` preenchido THEN the system SHALL retornar erro HTTP 404 (`NotFoundException`).
8. IF o usuário solicitante tiver papel `VIEWER` na família ou não pertencer ao escopo do cartão THEN the system SHALL rejeitar a operação de arquivar ou desarquivar com erro HTTP 403 (`ForbiddenException`).

**Independent Test**: Executar testes unitários em `CreditCardsService` validando `findAll` (com e sem `includeArchived=true`), `archive` e `unarchive` para sucesso, HTTP 400, 403 e 404.

---

### P2: Abas Ativos/Arquivados, Ícones de Arquivar/Desarquivar e Remoção do Checkbox no Modal em `/cards` ⭐ MVP

**User Story**: As a usuário da plataforma, I want arquivar e desarquivar cartões por ícones nos próprios cards e alternar entre as abas "Ativos" e "Arquivados" sem o checkbox no formulário de edição so that a experiência seja idêntica à tela de Contas.

**Why P2**: Entrega diretamente o fluxo visual e interativo solicitado pelo usuário na página `/cards`.

**Acceptance Criteria**:

1. WHEN o usuário abrir o modal de edição de cartão em `/cards` THEN the system SHALL exibir o formulário sem o checkbox `"Cartão Ativo (exibir no painel)"`.
2. WHEN o usuário acessar a tela `/cards` THEN the system SHALL exibir abas de filtro "Ativos" e "Arquivados" com os respectivos contadores de cartões.
3. WHEN o usuário visualizar um cartão ativo na aba "Ativos" com perfil diferente de `VIEWER` THEN the system SHALL exibir o botão de ícone "Arquivar cartão" (`Archive`) ao lado do botão de editar.
4. WHEN o usuário selecionar a aba "Arquivados" THEN the system SHALL listar apenas os cartões com `isActive: false` exibindo o selo "Arquivada/Arquivado" (`Arquivado`) e, para usuários não-`VIEWER`, o botão de ícone "Desarquivar cartão" (`ArchiveRestore`) e o botão de editar.
5. WHEN o usuário confirmar o arquivamento ou desarquivamento de um cartão THEN the system SHALL enviar `PATCH /credit-cards/:id/archive` ou `PATCH /credit-cards/:id/unarchive` e recarregar os dados atualizando a listagem e os contadores.

**Independent Test**: Acessar `/cards`, abrir "Editar Cartão" e confirmar ausência do checkbox "Cartão Ativo", clicar no ícone de arquivar em um cartão, alternar para a aba "Arquivados", confirmar o selo `Arquivado` e clicar em "Desarquivar cartão" para retorná-lo à aba "Ativos".

---

## Edge Cases

- IF uma aba ("Ativos" ou "Arquivados") não possuir nenhum cartão THEN the system SHALL exibir uma mensagem de estado vazio contextual para a aba selecionada.
- IF o usuário possuir perfil `VIEWER` na família selecionada THEN the system SHALL permitir alternar entre as abas "Ativos" e "Arquivadas/Arquivados" sem exibir botões de editar, arquivar ou desarquivar.
- IF a requisição `PATCH /credit-cards/:id/archive` ou `PATCH /credit-cards/:id/unarchive` falhar no frontend THEN the system SHALL exibir alerta com a mensagem de erro sem corromper a listagem atual.

---

## Requirement Traceability

| Requirement ID | Story | Phase | Status |
| -------------- | ----- | ----- | ------ |
| ARCHCARD-01 | P1: Listagem de Cartões Arquivados, Arquivamento e Desarquivamento no Backend | Phase 1 | Implementing |
| ARCHCARD-02 | P1: Listagem de Cartões Arquivados, Arquivamento e Desarquivamento no Backend | Phase 1 | Implementing |
| ARCHCARD-03 | P1: Listagem de Cartões Arquivados, Arquivamento e Desarquivamento no Backend | Phase 1 | Implementing |
| ARCHCARD-04 | P1: Listagem de Cartões Arquivados, Arquivamento e Desarquivamento no Backend | Phase 1 | Implementing |
| ARCHCARD-05 | P2: Abas Ativos/Arquivados, Ícones de Arquivar/Desarquivar e Remoção do Checkbox no Modal em `/cards` | Phase 2 | Implementing |
| ARCHCARD-06 | P2: Abas Ativos/Arquivados, Ícones de Arquivar/Desarquivados e Remoção do Checkbox no Modal em `/cards` | Phase 2 | Implementing |
| ARCHCARD-07 | P2: Abas Ativos/Arquivados, Ícones de Arquivar/Desarquivamento e Remoção do Checkbox no Modal em `/cards` | Phase 2 | Implementing |

**ID format:** `[CATEGORY]-[NUMBER]`

**Status values:** Pending → In Design → In Tasks → Implementing → Verified

**Coverage:** 7 total, 7 mapped to stories, 0 unmapped

---

## Success Criteria

- [ ] `GET /credit-cards` sem `includeArchived=true` continua retornando apenas cartões ativos (`isActive: true`) para não impactar seletores de transações.
- [ ] `GET /credit-cards?includeArchived=true` retorna cartões ativos e arquivados não excluídos no escopo pessoal ou familiar.
- [ ] `PATCH /credit-cards/:id/archive` e `PATCH /credit-cards/:id/unarchive` alternam `isActive` respeitando RBAC e validando o estado prévio.
- [ ] Modal de edição em `/cards` não possui mais o checkbox `"Cartão Ativo (exibir no painel)"`.
- [ ] Tela `/cards` exibe abas "Ativos" e "Arquivados" com contadores, selo `Arquivado` e ícones funcionais de arquivar/desarquivar.
