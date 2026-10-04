# Metas Financeiras: Vínculo Obrigatório a Contas (Cofrinhos) e Resgate Specification

## Problem Statement

No modelo atual de Metas Financeiras, uma meta pode ser excluída mesmo possuindo saldo acumulado, resultando na perda irreversível da rastreabilidade contábil desse dinheiro. Além disso, o sistema oferece apenas a operação de aporte sem mecanismo de resgate para a conta bancária de origem. Esta especificação estrutura as metas no formato "Cofrinhos / Caixinhas", vinculando cada meta obrigatoriamente a uma conta bancária de custódia, viabilizando retiradas controladas e impedindo a exclusão de qualquer meta que contenha saldo superior a zero.

## Goals

- [x] Vincular obrigatoriamente cada meta financeira a uma conta bancária de custódia ativa.
- [x] Implementar fluxo transacional atômico de resgate de valores da meta para a conta bancária vinculada.
- [x] Bloquear estritamente a exclusão (soft-delete) de metas com saldo acumulado maior que zero no backend e frontend.
- [x] Fornecer interface no frontend para gestão completa de aportes, resgates, histórico e sinalização de conta vinculada.

## Out of Scope

Explicitly excluded. Documented to prevent scope creep.

| Feature | Reason |
| ------- | ------ |
| Transferência direta entre metas distintas | Complexidade adicional; o fluxo natural é resgatar para a conta vinculada e aportar na outra meta |
| Cálculo de rendimentos automáticos de CDI/Selic | Pertence a um módulo futuro dedicado a investimentos e renda fixa |
| Resgate para contas de terceiros não vinculadas | Rompe a consistência contábil de custódia do cofrinho da conta |

---

## Assumptions & Open Questions

Every ambiguity is resolved or recorded here - nothing is left silently unclear.

| Assumption / decision | Chosen default | Rationale | Confirmed? |
| --------------------- | -------------- | --------- | ---------- |
| Exclusão de meta com saldo acumulado | Bloqueio total até que o saldo seja zerado via resgate manual | Evita resgates e encerramentos acidentais de reservas financeiras | y |
| Vínculo de conta bancária na criação | Campo obrigatório accountId no cadastro da meta | Garante que todo cofrinho possui uma conta bancária de custódia conhecida | y |
| Troca de conta vinculada de meta com saldo | Bloqueada enquanto a meta tiver currentAmount maior que zero | Evita inconsistência de saldo entre a conta de origem dos aportes e de resgate | y |
| Classificação contábil de aporte e resgate | Transação de transferência patrimonial interna (TRANSFER) | Evita distorções de receitas, despesas e balanço líquido no dashboard financeiro | y |
| Reversão de status após resgate | Retornar de COMPLETED para IN_PROGRESS se saldo cair abaixo da meta | Mantém o indicador visual de atingimento condizente com o saldo real | y |

**Open questions:** none - all resolved or logged above (required before the spec is confirmed).

---

## User Stories

### P1: Vínculo de Conta Bancária na Meta (Cofrinho) ⭐ MVP

**User Story**: Como usuário do sistema, quero associar uma conta bancária à minha meta no momento da criação para que ela funcione como um cofrinho daquela conta.

**Why P1**: É a base do modelo de cofrinho, garantindo integridade de onde os recursos saem e para onde voltam.

**Acceptance Criteria**:

1. WHEN o usuário cria uma meta com dados válidos e conta bancária informada THEN the system SHALL persistir a meta vinculada à conta bancária especificada. <!-- event-driven -->
2. IF o usuário tentar criar uma meta sem informar o identificador da conta bancária THEN the system SHALL rejeitar a requisição com erro de validação HTTP 400. <!-- unwanted-behavior -->
3. IF a conta bancária informada não pertencer ao usuário ou ao grupo familiar autorizado THEN the system SHALL negar a operação com erro de autorização ou não encontrado. <!-- unwanted-behavior -->
4. The system SHALL exigir a referência da conta bancária de custódia em todas as operações de criação de meta. <!-- ubiquitous -->

**Independent Test**: Criar uma meta via API e verificar se o registro contém `accountId` persistido e vinculado à conta correta.

---

### P2: Resgate de Recursos da Meta para a Conta Vinculada ⭐ MVP

**User Story**: Como usuário do sistema, quero resgatar valores da meta de volta para a conta bancária vinculada para utilizar o dinheiro acumulado quando necessário.

**Why P2**: Sem o resgate, o dinheiro aportado na meta fica permanentemente retido no sistema.

**Acceptance Criteria**:

1. WHEN o usuário solicitar o resgate de um valor válido menor ou igual ao saldo da meta THEN the system SHALL debitar o saldo da meta e creditar o saldo da conta vinculada em transação atômica. <!-- event-driven -->
2. WHEN o resgate for concluído com sucesso THEN the system SHALL registrar a transação financeira de crédito na conta vinculada e a movimentação no histórico da meta. <!-- event-driven -->
3. IF o valor do resgate solicitado for superior ao saldo atual acumulado na meta THEN the system SHALL rejeitar a operação com erro HTTP 400 informando saldo insuficiente na meta. <!-- unwanted-behavior -->
4. IF o valor do resgate solicitado for menor ou igual a zero THEN the system SHALL rejeitar a operação com erro HTTP 400 de validação de valor. <!-- unwanted-behavior -->
5. WHILE a meta estiver com status COMPLETED, WHEN um resgate fizer o saldo atual ficar menor que o valor alvo the system SHALL atualizar o status da meta para IN_PROGRESS. <!-- complex -->

**Independent Test**: Realizar um aporte de R$ 200, solicitar o resgate de R$ 50, e verificar se o saldo da meta torna-se R$ 150 e a conta bancária teve R$ 50 creditados.

---

### P3: Proteção Estrita contra Exclusão de Meta com Saldo ⭐ MVP

**User Story**: Como usuário e gestor financeiro, quero que o sistema me impeça de excluir uma meta enquanto ela contiver saldo para que eu não perca o controle do dinheiro guardado.

**Why P3**: Elimina o risco crítico de abandono de saldo e inconsistência contábil no sistema familiar.

**Acceptance Criteria**:

1. IF o usuário tentar excluir uma meta com saldo acumulado maior que zero THEN the system SHALL rejeitar a exclusão com erro HTTP 400 informando a necessidade de resgate prévio. <!-- unwanted-behavior -->
2. WHEN o usuário solicitar a exclusão de uma meta cujo saldo acumulado seja exatamente zero THEN the system SHALL aplicar o soft delete na meta com sucesso. <!-- event-driven -->
3. WHILE a meta possuir saldo acumulado maior que zero the system SHALL manter o botão de exclusão bloqueado ou protegido na interface do usuário. <!-- state-driven -->

**Independent Test**: Tentar enviar requisição DELETE para meta com saldo positivo e confirmar HTTP 400; zerar o saldo via resgate e confirmar DELETE com HTTP 200.

---

### P4: Interface do Usuário para Cofrinhos, Resgate e Histórico

**User Story**: Como usuário da aplicação web, quero visualizar a conta associada à meta, poder acionar o resgate com facilidade e ver o histórico de depósitos e retiradas.

**Why P4**: Proporciona transparência e usabilidade fluida na gestão de reservas e sonhos.

**Acceptance Criteria**:

1. WHEN o usuário abrir o modal de nova meta THEN the system SHALL exibir o campo obrigatório de seleção de conta bancária de custódia. <!-- event-driven -->
2. WHEN o card da meta for renderizado THEN the system SHALL exibir a identificação da conta bancária vinculada e o botão para realizar resgate. <!-- event-driven -->
3. WHEN o usuário abrir o modal de resgate THEN the system SHALL limitar o valor máximo ao saldo atual acumulado na meta. <!-- event-driven -->
4. WHEN o histórico da meta for visualizado THEN the system SHALL diferenciar claramente as operações de aporte e de resgate com suas respectivas datas e valores. <!-- event-driven -->
5. WHEN o usuário abrir o modal de aporte THEN the system SHALL exibir o saldo disponível na conta bancária vinculada e limitar o valor do aporte a esse saldo. <!-- event-driven -->

**Independent Test**: Acessar a tela `/goals`, abrir o modal de aporte, conferir o saldo exibido da conta vinculada e verificar se aportes com valor superior ao saldo da conta são bloqueados.

---

## Edge Cases

- IF ocorrer falha de infraestrutura durante o resgate THEN the system SHALL reverter todas as alterações de saldo via transação ACID no banco.
- IF a conta bancária vinculada for inativada ou arquivada THEN the system SHALL ainda permitir o resgate do saldo para a conta antes de qualquer exclusão da meta.
- WHEN múltiplos resgates concorrentes forem submetidos para a mesma meta THEN the system SHALL garantir consistência e impedir que o saldo fique negativo.
- IF o usuário tentar realizar um aporte com valor superior ao saldo disponível na conta vinculada THEN the system SHALL rejeitar a operação com erro HTTP 400.

---

## Requirement Traceability

Each requirement gets a unique ID for tracking across design, tasks, and validation.

| Requirement ID | Story | Phase | Status |
| -------------- | ----- | ----- | ------ |
| GOAL-01 | P1: Vínculo de Conta Bancária na Meta | Phase 1 | Verified |
| GOAL-02 | P1: Validações de Conta Obrigatória | Phase 2 | Verified |
| GOAL-03 | P2: Operação Atômica de Resgate | Phase 2 | Verified |
| GOAL-04 | P2: Registro Contábil e Histórico de Resgate | Phase 3 | Verified |
| GOAL-05 | P2: Reversão de Status após Resgate | Phase 2 | Verified |
| GOAL-06 | P3: Bloqueio de Exclusão com Saldo | Phase 2 | Verified |
| GOAL-07 | P3: Exclusão com Saldo Zerado | Phase 3 | Verified |
| GOAL-08 | P4: Seleção de Conta e Ações no Frontend | Phase 4 | Verified |
| GOAL-09 | P4: Modal de Resgate e Histórico de Movimentações | Phase 4 | Verified |
| GOAL-10 | P4: Exibição de Saldo e Limite de Aporte por Saldo da Conta | Phase 4 | Verified |

**Coverage:** 10 total, 10 mapped to tasks, 0 unmapped

---

## Success Criteria

- [x] Zero metas criadas sem conta bancária vinculada no sistema.
- [x] 100% de sucesso na validação que impede exclusão de metas com saldo positivo.
- [x] Fluxo bidirecional de Aporte e Resgate com reflexo exato no saldo da conta bancária e no saldo da meta.
- [x] Bloqueio estrito de aporte com valor superior ao saldo disponível na conta vinculada com exibição de saldo no modal.
- [x] Todos os testes automatizados de unidade, integração e fechamento de especificação aprovados com sucesso.

