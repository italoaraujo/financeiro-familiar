# Visualização e Desarquivamento de Contas Specification

## Problem Statement

Atualmente, o sistema permite arquivar contas bancárias e carteiras (`PATCH /accounts/:id/archive`), marcando `isArchived = true` e `isActive = false` para ocultar contas antigas que possuem lançamentos vinculados. Contudo, tanto `GET /accounts` quanto a tela de Contas & Carteiras (`/accounts`) filtram estritamente `isArchived: false`, tornando impossível visualizar contas arquivadas ou restaurá-las caso o usuário tenha arquivado por engano ou volte a movimentar a conta.

## Goals

- [ ] Permitir listar contas arquivadas via parâmetro opcional `includeArchived=true` em `GET /accounts`, preservando o comportamento padrão de retornar apenas contas ativas.
- [ ] Disponibilizar endpoint `PATCH /accounts/:id/unarchive` no backend para restaurar uma conta arquivada (`isArchived: false`, `isActive: true`) com validação de estado e RBAC.
- [ ] Exibir abas de visualização "Ativas" e "Arquivadas" com contadores na tela `/accounts`, mantendo o "Saldo Total Consolidado" restrito às contas ativas.
- [ ] Permitir desarquivar contas diretamente na aba "Arquivadas" do frontend com recarregamento imediato da listagem e dos saldos.

## Out of Scope

Explicitly excluded. Documented to prevent scope creep.

| Feature | Reason |
| ------- | ------ |
| Exibição de contas arquivadas nos selects de novos lançamentos, transferências, metas ou pagamento de faturas | Contas arquivadas devem permanecer fora do fluxo operacional diário até serem explicitamente desarquivadas |
| Inclusão do saldo de contas arquivadas no Saldo Total Consolidado ou no Dashboard | Decisão explícita do usuário: o saldo consolidado soma apenas contas ativas |
| Exclusão forçada de contas arquivadas com histórico de transações | Contas com lançamentos continuam protegidas por integridade referencial |

---

## Assumptions & Open Questions

Every ambiguity is resolved or recorded here - nothing is left silently unclear.

| Assumption / decision | Chosen default | Rationale | Confirmed? |
| --------------------- | -------------- | --------- | ---------- |
| Modelo de visualização na tela `/accounts` | Abas de filtro "Ativas" e "Arquivadas" com contadores em cada aba | Mantém o painel principal limpo enquanto dá acesso rápido às contas arquivadas (confirmado pelo usuário) | y |
| Cálculo do "Saldo Total Consolidado" | Somar exclusivamente as contas ativas (`isArchived: false`) mesmo na aba "Arquivadas" | Mantém consistência direta com o Dashboard (`ReportsService`) e evita distorção patrimonial (confirmado pelo usuário) | y |
| Comportamento padrão de `GET /accounts` | Sem `includeArchived=true`, retornar apenas `isArchived: false` | Evita que telas consumidoras (Transações, Cartões, Metas) exibam contas arquivadas nos seletores | y |
| Desarquivamento de conta já ativa | Rejeitar `PATCH /accounts/:id/unarchive` com HTTP 400 (`BadRequestException`) se `isArchived === false` | Garante integridade de transição de estado e evita mutações redundantes | y |
| Padrão de permissões e acesso | Aplicar as mesmas regras de titularidade, pertencimento à família e bloqueio de `VIEWER` (HTTP 403) | Mantém paridade com `AccountsService.archive` e o modelo RBAC do sistema | y |

**Open questions:** none - all resolved or logged above.

---

## User Stories

### P1: Listagem de Contas Arquivadas e Desarquivamento no Backend ⭐ MVP

**User Story**: As a usuário autenticado ou membro autorizado da família, I want consultar contas arquivadas via API e reativá-las via endpoint dedicado so that eu possa recuperar contas arquivadas sem quebrar os seletores de contas ativas.

**Why P1**: Fornece o contrato seguro de leitura e transição de estado no servidor antes da exposição na interface.

**Acceptance Criteria**:

1. WHEN uma requisição `GET /accounts` for enviada sem o parâmetro `includeArchived` ou com `includeArchived` diferente de `'true'` THEN the system SHALL retornar apenas as contas ativas (`isArchived: false` e `deletedAt: null`) do escopo pessoal ou familiar.
2. WHEN uma requisição `GET /accounts?includeArchived=true` for enviada THEN the system SHALL retornar todas as contas não excluídas (`deletedAt: null`, incluindo `isArchived: false` e `isArchived: true`) do escopo pessoal ou familiar.
3. WHEN uma requisição `PATCH /accounts/:id/unarchive` for enviada para uma conta arquivada (`isArchived: true`) THEN the system SHALL atualizar a conta para `isArchived: false` e `isActive: true`.
4. IF a conta alvo de `PATCH /accounts/:id/unarchive` já estiver ativa (`isArchived: false`) THEN the system SHALL rejeitar a operação com erro HTTP 400 (`BadRequestException`).
5. IF a conta informada não existir ou estiver com `deletedAt` preenchido THEN the system SHALL retornar erro HTTP 404 (`NotFoundException`).
6. IF o usuário solicitante tiver papel `VIEWER` na família ou não pertencer ao escopo da conta THEN the system SHALL rejeitar a operação de arquivar ou desarquivar com erro HTTP 403 (`ForbiddenException`).

**Independent Test**: Executar testes unitários em `AccountsService` e chamadas ao `AccountsController` validando `GET /accounts` (com e sem `includeArchived=true`) e `PATCH /accounts/:id/unarchive` para sucesso, 400, 403 e 404.

---

### P2: Abas de Contas Ativas/Arquivadas e Ação de Desarquivar no Frontend ⭐ MVP

**User Story**: As a usuário da aplicação, I want alternar entre abas de contas "Ativas" e "Arquivadas" na página `/accounts` e clicar em desarquivar em uma conta arquivada so that ela volte a aparecer como conta ativa no sistema.

**Why P2**: Entrega a experiência visual completa solicitada pelo usuário diretamente na tela de Contas & Carteiras.

**Acceptance Criteria**:

1. WHEN o usuário acessar a tela `/accounts` THEN the system SHALL exibir abas de filtro "Ativas" e "Arquivadas" com os respectivos contadores de contas.
2. WHILE o usuário alternar entre as abas "Ativas" e "Arquivadas" the system SHALL manter o card "Saldo Total Consolidado" calculado exclusivamente pela soma das contas ativas (`isArchived: false`).
3. WHEN o usuário selecionar a aba "Arquivadas" THEN the system SHALL listar apenas as contas com `isArchived: true` exibindo o selo "Arquivada" e, para usuários não-`VIEWER`, o botão de ação "Desarquivar conta" (`ArchiveRestore`) e o botão "Excluir conta".
4. WHEN o usuário confirmar o desarquivamento de uma conta arquivada THEN the system SHALL enviar `PATCH /accounts/:id/unarchive` e recarregar a listagem de contas atualizando os contadores e o saldo consolidado.

**Independent Test**: Acessar `/accounts`, arquivar uma conta, alternar para a aba "Arquivadas", verificar que o saldo consolidado não mudou, clicar em "Desarquivar conta" e confirmar o retorno da conta para a aba "Ativas".

---

## Edge Cases

- IF uma aba ("Ativas" ou "Arquivadas") não possuir nenhuma conta THEN the system SHALL exibir uma mensagem de estado vazio contextual para a aba selecionada.
- IF o usuário possuir perfil `VIEWER` na família selecionada THEN the system SHALL permitir visualizar a aba "Arquivadas" sem exibir botões de arquivar, desarquivar ou excluir.
- IF a requisição `PATCH /accounts/:id/unarchive` falhar no frontend THEN the system SHALL exibir alerta com a mensagem de erro sem corromper o estado atual da listagem.

---

## Requirement Traceability

| Requirement ID | Story | Phase | Status |
| -------------- | ----- | ----- | ------ |
| ARCHACC-01 | P1: Listagem de Contas Arquivadas e Desarquivamento no Backend | Phase 1 | Implementing |
| ARCHACC-02 | P1: Listagem de Contas Arquivadas e Desarquivamento no Backend | Phase 1 | Implementing |
| ARCHACC-03 | P1: Listagem de Contas Arquivadas e Desarquivamento no Backend | Phase 1 | Implementing |
| ARCHACC-04 | P1: Listagem de Contas Arquivadas e Desarquivamento no Backend | Phase 1 | Implementing |
| ARCHACC-05 | P2: Abas de Contas Ativas/Arquivadas e Ação de Desarquivar no Frontend | Phase 2 | Implementing |
| ARCHACC-06 | P2: Abas de Contas Ativas/Arquivadas e Ação de Desarquivar no Frontend | Phase 2 | Implementing |
| ARCHACC-07 | P2: Abas de Contas Ativas/Arquivadas e Ação de Desarquivar no Frontend | Phase 2 | Implementing |

**ID format:** `[CATEGORY]-[NUMBER]`

**Status values:** Pending → In Design → In Tasks → Implementing → Verified

**Coverage:** 7 total, 7 mapped to stories, 0 unmapped

---

## Success Criteria

- [ ] `GET /accounts` sem `includeArchived=true` continua retornando apenas contas ativas para não impactar seletores de transações, cartões e metas.
- [ ] `GET /accounts?includeArchived=true` retorna contas ativas e arquivadas não excluídas no escopo pessoal ou familiar.
- [ ] `PATCH /accounts/:id/unarchive` restaura a conta (`isArchived: false`, `isActive: true`) respeitando RBAC e validando estado prévio.
- [ ] Tela `/accounts` exibe abas "Ativas" e "Arquivadas" com contadores, mantém o saldo consolidado apenas para contas ativas e permite desarquivar com atualização imediata.
