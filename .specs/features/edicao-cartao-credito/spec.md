# Edição de Cartão de Crédito Specification

## Problem Statement

Atualmente, no módulo de cartões de crédito, o sistema permite apenas cadastrar novos cartões e visualizar os existentes, sem disponibilizar funcionalidade para edição dos dados cadastrais (como nome, bandeira, limite de crédito, cor, dia de fechamento e dia de vencimento) nem desativação/exclusão. Se o usuário cometer um erro de digitação durante o cadastro, tiver o limite alterado pelo banco ou alterar a data de vencimento da fatura, não há meio de atualizar as informações no sistema, resultando em dados inconsistentes e impossibilidade de manter o planejamento financeiro atualizado.

## Goals

- [ ] Disponibilizar endpoint no backend para atualização completa dos dados cadastrais de um cartão de crédito (`PUT /credit-cards/:id`).
- [ ] Validar integridade dos dados e regras de permissão (acesso do usuário titular ou família compartilhada).
- [ ] Recalcular e sincronizar as datas de fechamento e vencimento da fatura aberta atual quando os dias de ciclo forem modificados.
- [ ] Permitir desativação/arquivamento e exclusão segura de cartões sem lançamentos.
- [ ] Integrar a interface do frontend com botão de edição direto em cada cartão e modal de edição responsivo pré-preenchido.

## Out of Scope

Explicitly excluded. Documented to prevent scope creep.

| Feature | Reason |
| ------- | ------ |
| Migração de lançamentos entre cartões de crédito diferentes | Transações já vinculadas a faturas devem permanecer no histórico contábil original |
| Alteração retroativa de faturas fechadas ou totalmente pagas | Faturas liquidadas representam histórico fiscal e contábil fechado |
| Conexão automática com Open Finance ou bancos externos | O escopo do sistema é gestão financeira manual e assistida |

---

## Assumptions & Open Questions

Every ambiguity is resolved or recorded here - nothing is left silently unclear.

| Assumption / decision | Chosen default | Rationale | Confirmed? |
| --------------------- | -------------- | --------- | ---------- |
| Atualização da Fatura Aberta | Ajustar `closingDate` e `dueDate` da fatura aberta ao alterar dias de ciclo | Garante que compras vigentes e data de pagamento fiquem alinhadas ao novo vencimento | y |
| Redução de Limite abaixo do comprometido | Permitir a alteração sem bloqueio, exibindo limite disponível zerado e barra em 100% | O usuário pode ter tido redução de limite emergencial pelo banco emissor | y |
| Exclusão vs Inativação | Permitir exclusão apenas se não houver transações; caso contrário, permitir inativação (`isActive = false`) | Preserva integridade referencial das despesas e faturas passadas | y |
| Padrão de Acesso por Família | Validar se o usuário é proprietário do cartão ou membro da família vinculada | Mantém coerência com o modelo de segurança RBAC já adotado no sistema | y |

**Open questions:** none - all resolved or logged above (required before the spec is confirmed).

---

## User Stories

### P1: Edição Cadastral de Cartão de Crédito no Backend e Frontend ⭐ MVP

**User Story**: As a titular do cartão de crédito ou membro da família autorizada, I want editar os dados cadastrais do cartão (nome, bandeira, limite, dia de fechamento, dia de vencimento e cor) so that eu possa manter as informações financeiras sempre precisas e atualizadas.

**Why P1**: É a necessidade central do usuário de poder corrigir ou atualizar as configurações do cartão.

**Acceptance Criteria**:

1. WHEN o usuário enviar uma requisição `PUT /credit-cards/:id` com os dados atualizados válidos THEN o sistema SHALL persistir as alterações do cartão de crédito no banco de dados.
2. IF o cartão informado não existir THEN o sistema SHALL retornar erro HTTP 404 com mensagem descritiva.
3. IF o usuário não for o dono do cartão e não pertencer à família associada THEN o sistema SHALL rejeitar a atualização com erro HTTP 403 Forbidden.
4. IF os dias de fechamento ou vencimento informados não estiverem entre 1 e 31 THEN o sistema SHALL rejeitar a atualização com erro HTTP 400 BadRequestException.
5. IF o valor do limite de crédito informado for menor ou igual a zero THEN o sistema SHALL rejeitar a atualização com erro HTTP 400 BadRequestException.
6. WHEN os dias de fechamento ou vencimento forem atualizados THEN o sistema SHALL recalcular as datas de fechamento (`closingDate`) e vencimento (`dueDate`) da fatura aberta atual do cartão.
7. WHEN o usuário visualizar a listagem de cartões THEN o sistema SHALL exibir um botão de ação "Editar" em cada cartão.
8. WHEN o usuário acionar o botão "Editar" THEN o sistema SHALL abrir o modal com todos os campos preenchidos com os valores atuais do cartão selecionado.
9. WHEN o usuário confirmar a alteração no modal THEN o sistema SHALL atualizar os dados via API, fechar o modal e recarregar a visualização com feedback de sucesso.

**Independent Test**: Acessar a tela de cartões, clicar em "Editar" no cartão "Nubank", alterar o limite para R$ 8.500,00 e o nome para "Nubank Ultravioleta", salvar e conferir a atualização imediata no painel.

---

### P2: Desativação e Exclusão Segura de Cartão de Crédito

**User Story**: As a usuário, I want desativar um cartão que não utilizo mais ou excluir um cartão cadastrado por engano so that meu painel exiba apenas cartões relevantes.

**Why P2**: Fornece gestão do ciclo de vida do cartão, evitando poluição visual e garantindo integridade referencial.

**Acceptance Criteria**:

1. WHEN o usuário solicitar a desativação do cartão (`isActive = false`) THEN o sistema SHALL marcar o cartão como inativo e removê-lo da listagem ativa padrão.
2. WHEN o usuário solicitar a exclusão de um cartão que não possui nenhuma transação vinculada THEN o sistema SHALL remover o cartão e suas faturas vazias do banco de dados.
3. IF o usuário tentar excluir um cartão que já possui transações cadastradas THEN o sistema SHALL impedir a exclusão física com erro HTTP 400, sugerindo a desativação do cartão.

**Independent Test**: Cadastrar um cartão teste sem compras e excluí-lo com sucesso; em seguida, tentar excluir um cartão com faturas que contêm compras e receber a mensagem de impedimento com opção de desativar.

---

## Edge Cases

- IF o usuário definir um limite menor que os gastos atuais da fatura THEN o sistema SHALL aceitar a alteração mantendo o limite disponível em R$ 0,00 e indicando 100% de uso.
- WHEN a alteração do dia de fechamento for posterior ao dia de vencimento THEN o sistema SHALL calcular o vencimento para o mês seguinte conforme as regras de ciclo bancário vigentes.
- IF ocorrer falha de conexão ou erro no servidor durante a submissão do formulário THEN o sistema SHALL exibir notificação clara de erro sem fechar o modal nem perder os dados digitados.

---

## Requirement Traceability

Each requirement gets a unique ID for tracking across design, tasks, and validation.

| Requirement ID | Story | Phase | Status |
| -------------- | ----- | ----- | ------ |
| CARD-01 | P1: Edição Cadastral de Cartão de Crédito no Backend e Frontend | Execute | Verified |
| CARD-02 | P1: Edição Cadastral de Cartão de Crédito no Backend e Frontend | Execute | Verified |
| CARD-03 | P1: Edição Cadastral de Cartão de Crédito no Backend e Frontend | Execute | Verified |
| CARD-04 | P1: Edição Cadastral de Cartão de Crédito no Backend e Frontend | Execute | Verified |
| CARD-05 | P1: Edição Cadastral de Cartão de Crédito no Backend e Frontend | Execute | Verified |
| CARD-06 | P1: Edição Cadastral de Cartão de Crédito no Backend e Frontend | Execute | Verified |
| CARD-07 | P1: Edição Cadastral de Cartão de Crédito no Backend e Frontend | Execute | Verified |
| CARD-08 | P1: Edição Cadastral de Cartão de Crédito no Backend e Frontend | Execute | Verified |
| CARD-09 | P1: Edição Cadastral de Cartão de Crédito no Backend e Frontend | Execute | Verified |
| CARD-10 | P2: Desativação e Exclusão Segura de Cartão de Crédito | Execute | Verified |
| CARD-11 | P2: Desativação e Exclusão Segura de Cartão de Crédito | Execute | Verified |
| CARD-12 | P2: Desativação e Exclusão Segura de Cartão de Crédito | Execute | Verified |

**ID format:** `[CATEGORY]-[NUMBER]` (e.g., `AUTH-01`, `CART-03`, `NOTIF-02`)

**Status values:** Pending → In Design → In Tasks → Implementing → Verified

**Coverage:** 12 total, 12 mapped, 0 unmapped

---

## Success Criteria

How we know the feature is successful:

- [x] Usuário consegue editar nome, bandeira, limite, dias de ciclo e cor de qualquer cartão que possua acesso.
- [x] Fatura aberta vigente sincroniza suas datas de fechamento e vencimento de acordo com as alterações.
- [x] Interface visual reflete imediatamente as atualizações sem necessidade de recarregar a página manualmente.
- [x] 100% dos testes unitários do backend cobrindo os cenários de sucesso, validação e permissão passam com sucesso.
