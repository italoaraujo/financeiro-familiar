# Edição de Metas Financeiras e Cofrinhos Specification

## Problem Statement

Atualmente, os usuários não possuem uma funcionalidade para editar os dados de uma Meta Financeira / Cofrinho criada (como título, valor alvo, prazo, cor e ícone) através da interface web. Além disso, para preservar a rastreabilidade patrimonial e a consistência dos fluxos de aportes e resgates já realizados, a conta bancária vinculada à meta (custódia) não deve ser alterada durante a edição. Esta especificação define a funcionalidade completa de edição de metas financeiras tanto no backend quanto no frontend, assegurando a imutabilidade da conta vinculada.

## Goals

- [ ] Disponibilizar modal e fluxo de edição de metas no frontend (`GoalsPage`).
- [ ] Garantir que a Conta Vinculada permaneça imutável durante a edição, sendo exibida como somente leitura / informativa.
- [ ] Permitir a alteração de título, valor alvo, data limite (prazo) e cor da meta.
- [ ] Recalcular e ajustar automaticamente o status da meta (`COMPLETED` vs `IN_PROGRESS`) caso o novo valor alvo seja atingido ou passe a ser maior que o saldo acumulado.
- [ ] Cobrir os fluxos de edição com testes automatizados no backend e validação na interface.

## Out of Scope

Explicitly excluded. Documented to prevent scope creep.

| Feature | Reason |
| ------- | ------ |
| Alteração da Conta Vinculada de custódia | A alteração de conta quebraria o histórico contábil de depósitos e resgates do cofrinho |
| Edição manual direta do saldo acumulado (`currentAmount`) | O saldo acumulado só pode ser alterado via aportes e resgates auditáveis |
| Exclusão em lote de metas | Operação separada fora do escopo de edição individual |

---

## Assumptions & Open Questions

Every ambiguity is resolved or recorded here - nothing is left silently unclear.

| Assumption / decision | Chosen default | Rationale | Confirmed? |
| --------------------- | -------------- | --------- | ---------- |
| Imutabilidade da Conta Vinculada | Campo desabilitado/somente leitura na interface e ignorado no DTO de atualização | Garante a integridade financeira entre os aportes e resgates na conta bancária de custódia | y |
| Ajuste de status ao alterar valor alvo | Se o novo `targetAmount <= currentAmount`, status vai para `COMPLETED`; se `targetAmount > currentAmount` e era `COMPLETED`, reverte para `IN_PROGRESS` | Mantém a consistência visual e lógica do percentual de conclusão da meta | y |
| Acesso no grupo familiar | Permissão de edição para membros da família autorizados ou dono da meta | Mantém a mesma regra de autorização dos demais endpoints de metas | y |
| Validação de valor alvo mínimo | `targetAmount` deve ser maior que zero (> 0) | Evita metas com valor alvo nulo ou negativo | y |

**Open questions:** none - all resolved or logged above (required before the spec is confirmed).

---

## User Stories

### P1: Edição de Metas Financeiras no Frontend ⭐ MVP

**User Story**: Como usuário da plataforma, quero clicar no botão de editar em um card de meta para alterar seu nome, valor alvo, prazo e cor sem perder os aportes já realizados.

**Why P1**: Permite que os usuários ajustem seus objetivos conforme seu planejamento evolui sem precisar excluir e recriar a meta.

**Acceptance Criteria** (each line is one EARS pattern):

1. WHEN o usuário clica no botão de edição de uma meta THEN the system SHALL abrir o modal de edição preenchido com os dados atuais da meta selecionada. <!-- event-driven -->
2. WHILE o modal de edição estiver aberto the system SHALL exibir o campo de Conta Vinculada como desabilitado e somente leitura com aviso informativo. <!-- state-driven -->
3. WHEN o usuário submeter o formulário de edição com dados válidos THEN the system SHALL enviar a requisição de atualização para a API e atualizar a listagem de metas em tela. <!-- event-driven -->
4. IF o usuário informar um valor alvo menor ou igual a zero THEN the system SHALL impedir o envio e exibir alerta de validação. <!-- unwanted-behavior -->
5. The system SHALL disponibilizar o botão de edição em todos os cards de metas ativas. <!-- ubiquitous -->

**Independent Test**: Clicar no botão de edição de uma meta, alterar o nome de "Reserva" para "Reserva 2026", salvar e verificar a atualização do nome no card correspondente.

---

### P2: Atualização Segura e Recálculo no Backend ⭐ MVP

**User Story**: Como API do sistema, quero receber os campos editáveis da meta, impedir a alteração da conta bancária vinculada e atualizar o status de conclusão conforme o novo valor alvo.

**Why P2**: Garante a consistência dos dados, segurança contra adulteração de conta vinculada e precisão do status da meta.

**Acceptance Criteria**:

1. WHEN a API recebe uma requisição válida de atualização de meta THEN the system SHALL persistir as alterações de nome, valor alvo, prazo, cor e ícone mantendo o `accountId` original inalterado. <!-- event-driven -->
2. IF o novo valor alvo for menor ou igual ao saldo atual acumulado (`currentAmount`) THEN the system SHALL atualizar o status da meta para `COMPLETED`. <!-- unwanted-behavior -->
3. WHILE o status atual for `COMPLETED`, WHEN o novo valor alvo for maior que o saldo acumulado the system SHALL atualizar o status da meta para `IN_PROGRESS`. <!-- complex -->
4. IF a meta informada não existir ou estiver com `deletedAt` preenchido THEN the system SHALL retornar erro HTTP 404 (NotFound). <!-- unwanted-behavior -->
5. IF o usuário solicitante não pertencer à família nem for o criador da meta THEN the system SHALL retornar erro HTTP 403 (Forbidden). <!-- unwanted-behavior -->
6. The system SHALL validar que o campo `accountId` não possa ser sobrescrito pelo payload de atualização. <!-- ubiquitous -->

**Independent Test**: Executar requisição PUT com novo `targetAmount` e verificar persistência dos campos atualizados com `accountId` intacto.

---

## Edge Cases

- IF o usuário tentar enviar `accountId` no payload de atualização THEN the system SHALL ignorar a alteração e preservar a conta original.
- IF a meta possuir prazo definido e o usuário limpar a data limite THEN the system SHALL definir `deadline` como nulo.
- IF o usuário alterar a cor da meta THEN the system SHALL refletir a nova cor imediatamente no card e ícone da meta.

---

## Requirement Traceability

| Requirement ID | Story | Phase | Status |
| -------------- | ----- | ----- | ------ |
| EDIT-01 | P1: Edição de Metas Financeiras no Frontend | Execute | Verified |
| EDIT-02 | P1: Edição de Metas Financeiras no Frontend | Execute | Verified |
| EDIT-03 | P1: Edição de Metas Financeiras no Frontend | Execute | Verified |
| EDIT-04 | P2: Atualização Segura e Recálculo no Backend | Execute | Verified |
| EDIT-05 | P2: Atualização Segura e Recálculo no Backend | Execute | Verified |
| EDIT-06 | P2: Atualização Segura e Recálculo no Backend | Execute | Verified |

**ID format:** `[CATEGORY]-[NUMBER]`

**Status values:** Pending → In Design → In Tasks → Implementing → Verified

**Coverage:** 6 total, 6 mapped to stories, 0 unmapped

---

## Success Criteria

- [ ] Usuário consegue editar nome, valor alvo, prazo e cor de qualquer meta pela interface.
- [ ] Campo de Conta Vinculada permanece bloqueado na edição tanto no frontend quanto no backend.
- [ ] O status da meta é recalculado automaticamente ao alterar o valor alvo.
- [ ] Todos os testes unitários do backend e testes da aplicação passam com sucesso.
