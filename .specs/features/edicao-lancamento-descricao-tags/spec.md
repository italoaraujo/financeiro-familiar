# Edição de Descrição e Tags de Lançamento Specification

## Problem Statement

Atualmente, os lançamentos financeiros registrados no extrato (despesas, receitas, transferências e compras parceladas) não possuem opção de edição na interface nem endpoint de atualização na API, obrigando o usuário a excluir e recriar o lançamento quando precisa corrigir apenas a descrição ou ajustar as tags. Para preservar a integridade contábil de saldos bancários, limites de cartão, faturas e metas, apenas os campos **Descrição** (`description`) e **Tags** (`tags`) devem ser editáveis, mantendo todos os demais campos estritamente imutáveis.

## Goals

- [ ] Disponibilizar endpoint `PUT /transactions/:id` no backend que permita atualizar exclusivamente `description` e `tags` de um lançamento.
- [ ] Rejeitar qualquer tentativa de alteração de outros campos contábeis (`amount`, `type`, `accountId`, `destinationAccountId`, `creditCardId`, `categoryId`, `transactionDate`, `personId`, `status`, `isPrivate`, `totalInstallments`) via validação de DTO (`whitelist` + `forbidNonWhitelisted`).
- [ ] Propagar automaticamente a edição de descrição e tags para todas as parcelas ativas da mesma compra parcelada (`installmentGroupId`) no cartão de crédito.
- [ ] Permitir a edição de descrição e tags em todos os tipos e status de lançamentos do usuário/família (Despesas, Receitas, Transferências, movimentações de Metas e lançamentos em Faturas abertas, fechadas ou pagas), respeitando o bloqueio de perfil `VIEWER` e a privacidade de lançamentos (`isPrivate`).
- [ ] Disponibilizar botão de edição e modal no extrato (`/transactions`) exibindo apenas Descrição e Tags habilitados e os demais campos visíveis em modo somente leitura/desabilitado (Imutável).

## Out of Scope

Explicitly excluded. Documented to prevent scope creep.

| Feature | Reason |
| ------- | ------ |
| Edição de valor (`amount`), data/hora (`transactionDate`), categoria (`categoryId`), conta (`accountId`), cartão (`creditCardId`), tipo (`type`), pessoa (`personId`) ou privacidade (`isPrivate`) | Solicitação explícita do usuário: apenas Descrição e Tags podem ser editadas; demais campos são imutáveis para preservar conciliação contábil |
| Alteração do número de parcelas (`totalInstallments`) pós-criação | Impactaria faturas e saldos comprometidos do cartão de crédito |
| Edição em lote de lançamentos distintos não vinculados por `installmentGroupId` | Escopo restrito à edição a partir de um lançamento (e suas parcelas irmãs quando parcelado) |

---

## Assumptions & Open Questions

Every ambiguity is resolved or recorded here - nothing is left silently unclear.

| Assumption / decision | Chosen default | Rationale | Confirmed? |
| --------------------- | -------------- | --------- | ---------- |
| Comportamento em compras parceladas | Atualizar automaticamente todas as parcelas ativas do mesmo `installmentGroupId` | Mantém consistência de descrição e tags em toda a compra parcelada conforme confirmado pelo usuário | y |
| Exibição dos campos não editáveis no modal | Exibir os demais campos visíveis como somente leitura/desabilitados (com indicação de bloqueio "Imutável") e apenas Descrição e Tags editáveis | Transparência visual do lançamento que está sendo editado conforme escolha do usuário | y |
| Tipos e status de lançamentos elegíveis para edição | Todos os lançamentos (Despesas, Receitas, Transferências, Metas e Faturas pagas/fechadas) permitem editar Descrição e Tags | Como valor, conta e fatura não mudam, não há impacto contábil nos saldos ou faturas | y |
| Autorização e lançamentos privados | Membros `VIEWER` são bloqueados (403); lançamentos privados (`isPrivate = true`) só podem ser editados pelo próprio autor (`userId`) | Preserva as regras de RBAC (AD-014) e privacidade familiar (RN06) do sistema | y |
| Remoção de todas as tags na edição | Enviar `tags: []` remove todas as associações `TransactionTag` do lançamento (e de suas parcelas irmãs) | Permite limpar tags adicionadas por engano | y |
| Envio sem alteração de um dos campos | Quando apenas `description` ou apenas `tags` é enviado no DTO (`@IsOptional()`), somente o campo informado é atualizado | Flexibilidade para chamadas parciais via API preservando o valor atual do outro campo | y |

**Open questions:** none - all resolved or logged above.

---

## User Stories

### P1: Edição Segura de Descrição e Tags no Backend ⭐ MVP

**User Story**: Como usuário autenticado, quero atualizar a descrição e as tags de um lançamento via API com garantia de que nenhum outro dado financeiro seja modificado.

**Why P1**: Garante a regra de negócio central e a segurança contábil no servidor antes da exposição na interface.

**Acceptance Criteria**:

1. WHEN uma requisição válida `PUT /transactions/:id` for enviada com `description` e/ou `tags` THEN the system SHALL atualizar apenas a descrição e as associações de tags do lançamento mantendo todos os demais campos e saldos inalterados.
2. WHEN o lançamento editado possuir `installmentGroupId` preenchido THEN the system SHALL propagar a nova descrição e o novo conjunto de tags para todas as parcelas ativas (`deletedAt: null`) do mesmo `installmentGroupId`.
3. IF o payload de atualização contiver qualquer campo não permitido (como `amount`, `accountId`, `creditCardId`, `categoryId`, `transactionDate`, `type`, `personId`, `isPrivate` ou `status`) THEN the system SHALL rejeitar a requisição com erro HTTP 400 (Bad Request).
4. IF o lançamento não existir ou estiver com `deletedAt` preenchido THEN the system SHALL retornar erro HTTP 404 (Not Found).
5. IF o usuário solicitante tiver papel `VIEWER` na família, não pertencer ao escopo do lançamento ou tentar editar um lançamento privado (`isPrivate: true`) de outro autor THEN the system SHALL retornar erro HTTP 403 (Forbidden).
6. The system SHALL permitir a edição de descrição e tags inclusive em lançamentos de transferências, metas financeiras e faturas de cartão de crédito com status `CLOSED` ou `PAID`.

**Independent Test**: Enviar `PUT /transactions/:id` alterando `description` e `tags` de uma compra parcelada e de um lançamento em fatura paga, verificando a atualização em todas as parcelas e o bloqueio HTTP 400 ao tentar enviar `amount`.

---

### P2: Modal de Edição com Campos Imutáveis no Frontend ⭐ MVP

**User Story**: Como usuário da plataforma, quero clicar no botão de editar de um lançamento na tabela de extrato para alterar sua Descrição e suas Tags visualizando os demais campos bloqueados como somente leitura.

**Why P2**: Entrega a experiência completa solicitada pelo usuário na tela de Extrato & Lançamentos (`/transactions`).

**Acceptance Criteria**:

1. WHEN o usuário visualizar a tabela de lançamentos em `/transactions` com perfil diferente de `VIEWER` THEN the system SHALL exibir o botão de edição (`Pencil`) na coluna de ações para os lançamentos editáveis.
2. WHEN o usuário clicar no botão de edição de um lançamento THEN the system SHALL abrir o modal de edição preenchido com a Descrição e as Tags atuais em controles editáveis.
3. WHILE o modal de edição estiver aberto the system SHALL exibir os demais campos do lançamento (Tipo, Valor, Data/Horário, Categoria, Conta/Cartão, Parcelamento, Pessoa e Privacidade) desabilitados em modo somente leitura com indicação visual de bloqueio (`Imutável`).
4. WHEN o usuário salvar a edição no modal THEN the system SHALL enviar `PUT /transactions/:id` com `{ description, tags }`, limpar o cache de autocomplete de descrições e recarregar a listagem do extrato e de tags disponíveis.
5. IF o lançamento for privado (`isPrivate: true`) e pertencer a outro membro da família THEN the system SHALL desabilitar a ação de edição na listagem.

**Independent Test**: Na tela `/transactions`, clicar no ícone de lápis de um lançamento, verificar que Valor, Data, Categoria e Conta/Cartão estão bloqueados, alterar a Descrição e as Tags, salvar e conferir a atualização imediata na tabela.

---

## Edge Cases

- IF o usuário enviar uma descrição vazia ou composta apenas por espaços em branco THEN the system SHALL rejeitar a atualização com erro HTTP 400 (Bad Request).
- IF o usuário remover todas as tags no modal de edição (`tags: []`) THEN the system SHALL remover todos os vínculos `TransactionTag` da transação (e de todas as parcelas do mesmo `installmentGroupId`, se parcelada).
- IF o usuário adicionar uma tag inédita durante a edição THEN the system SHALL criar a tag automaticamente via `TagsService.findOrCreateMany` no escopo pessoal ou familiar do lançamento.

---

## Requirement Traceability

| Requirement ID | Story | Phase | Status |
| -------------- | ----- | ----- | ------ |
| EDITTX-01 | P1: Edição Segura de Descrição e Tags no Backend | Execute | Implementing |
| EDITTX-02 | P1: Edição Segura de Descrição e Tags no Backend | Execute | Implementing |
| EDITTX-03 | P1: Edição Segura de Descrição e Tags no Backend | Execute | Implementing |
| EDITTX-04 | P1: Edição Segura de Descrição e Tags no Backend | Execute | Implementing |
| EDITTX-05 | P2: Modal de Edição com Campos Imutáveis no Frontend | Pending | Pending |
| EDITTX-06 | P2: Modal de Edição com Campos Imutáveis no Frontend | Pending | Pending |
| EDITTX-07 | P2: Modal de Edição com Campos Imutáveis no Frontend | Pending | Pending |

**ID format:** `[CATEGORY]-[NUMBER]`

**Status values:** Pending → In Design → In Tasks → Implementing → Verified

**Coverage:** 7 total, 7 mapped to stories, 0 unmapped

---

## Success Criteria

- [ ] Usuário consegue editar exclusivamente a Descrição e as Tags de qualquer lançamento pelo modal na tela `/transactions`.
- [ ] Demais campos permanecem visíveis porém bloqueados/somente leitura no frontend e estritamente rejeitados no backend (`forbidNonWhitelisted`).
- [ ] Edição em compra parcelada atualiza Descrição e Tags em todas as parcelas ativas da mesma compra.
- [ ] Todos os testes unitários e de validação de DTO do backend e o build do frontend passam com zero erros.
