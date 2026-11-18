# Visualização e Desarquivamento de Contas Context

**Gathered:** 2026-11-17
**Spec:** `.specs/features/contas-arquivadas/spec.md`
**Status:** Ready for tasks

---

## Feature Boundary

Permitir visualizar contas bancárias e carteiras arquivadas e desarquivá-las de forma segura via `GET /accounts?includeArchived=true`, `PATCH /accounts/:id/unarchive` e abas "Ativas" / "Arquivadas" na página `/accounts`.

---

## Implementation Decisions

### Visualização na Tela de Contas (`/accounts`)

- Exibir abas/filtro de visualização **"Ativas"** e **"Arquivadas"** na tela `/accounts`, mostrando a contagem de contas em cada aba (`Ativas (X)` e `Arquivadas (Y)`).
- Na aba "Arquivadas", cada card exibe o selo visual `Arquivada` e oferece a ação de desarquivar (`ArchiveRestore`) além da opção de exclusão permanente (`Trash2`, bloqueada no backend se houver transações).

### Saldo Total Consolidado

- O card **"Saldo Total Consolidado"** no topo da tela `/accounts` soma **apenas as contas ativas** (`isArchived: false`), mantendo consistência com o Dashboard (`ReportsService`), mesmo quando o usuário estiver visualizando a aba "Arquivadas".

### Agent's Discretion

- Manter `GET /accounts` filtrando `isArchived: false` por padrão e habilitar a inclusão de arquivadas apenas via query param `includeArchived=true`, evitando impactos colaterais nas telas de Transações, Cartões e Metas.
- Seguir o padrão existente de `PATCH /accounts/:id/archive` criando o endpoint simétrico `PATCH /accounts/:id/unarchive`.

### Declined / Undiscussed Gray Areas → Assumptions

- Rejeitar com HTTP 400 (`BadRequestException`) tentativas de desarquivar uma conta que já está ativa (`isArchived: false`).
- Preservar integralmente o controle de acesso RBAC (`VIEWER` não pode arquivar/desarquivar/excluir) na API e na UI.

---

## Specific References

- Solicitação do usuário: "Quero pode ver as contas arquivadas , é poder desaquivar"
- Endpoint existente de arquivamento: `backend/src/modules/accounts/accounts.controller.ts` (`@Patch(':id/archive')`) e `backend/src/modules/accounts/accounts.service.ts` (`archive`).

---

## Deferred Ideas

- None - discussion stayed within feature scope.
