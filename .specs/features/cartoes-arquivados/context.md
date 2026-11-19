# Arquivamento e Desarquivamento de Cartões de Crédito Context

**Gathered:** 2026-11-18
**Spec:** `.specs/features/cartoes-arquivados/spec.md`
**Status:** Ready for tasks

---

## Feature Boundary

Permitir arquivar, visualizar arquivados e desarquivar cartões de crédito na tela `/cards` seguindo o mesmo padrão visual e operacional das Contas Bancárias (`/accounts`), removendo o checkbox `"Cartão Ativo (exibir no painel)"` do formulário de edição.

---

## Implementation Decisions

### Remoção do Checkbox no Formulário de Edição

- Remover o checkbox `"Cartão Ativo (exibir no painel)"` e o estado `editIsActive` do modal de edição de cartão em `/cards`.
- O campo opcional `isActive` no `UpdateCreditCardDto` pode permanecer na API para compatibilidade retroativa, mas o controle na interface passa a ser exclusivo pelos ícones de ação no card e abas.

### Visualização em Abas e Ações no Card

- Exibir abas **"Ativos"** e **"Arquivados"** com contadores (`activeCards.length` e `archivedCards.length`) acima da grade de cartões, no mesmo padrão visual de `/accounts`.
- Exibir ícone `Archive` ("Arquivar cartão") nos cartões ativos e `ArchiveRestore` ("Desarquivar cartão") nos cartões arquivados ao lado do botão de editar (`Pencil`) para usuários não-`VIEWER`.
- Exibir selo visual `Arquivado` nos cartões da aba "Arquivados".

### Agent's Discretion

- Utilizar o campo já existente `isActive` (`true` = ativo, `false` = arquivado) com `deletedAt: null` em `CreditCard`, evitando migrações de banco desnecessárias.
- Manter `GET /credit-cards` retornando apenas `isActive: true` por padrão e habilitar inclusão via `?includeArchived=true`.
- Criar rotas dedicadas `PATCH /credit-cards/:id/archive` e `PATCH /credit-cards/:id/unarchive` simétricas às rotas de `/accounts`.

### Declined / Undiscussed Gray Areas → Assumptions

- Rejeitar com HTTP 400 (`BadRequestException`) tentativas de arquivar cartão já arquivado ou desarquivar cartão já ativo.
- Preservar controle de acesso RBAC (`VIEWER` bloqueado com HTTP 403 e sem botões de ação na UI).

---

## Specific References

- Solicitação do usuário: "No Cartões de Crédito , quero que remova a 'Cartão Ativo (exibir no painel)' no formulario, quero que aparece um icone para arquiva, quero poder ver o arquivados e poder desaquivar (igual as contas)"
- Implementação de referência: `frontend/src/app/accounts/page.tsx`, `backend/src/modules/accounts/accounts.controller.ts` e `backend/src/modules/accounts/accounts.service.ts`.

---

## Deferred Ideas

- None - discussion stayed within feature scope.
