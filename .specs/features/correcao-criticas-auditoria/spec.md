# Correção de Vulnerabilidades Críticas de Segurança Specification

## Problem Statement

A auditoria completa de segurança identificou 3 vulnerabilidades críticas ativas na camada de lógica financeira e controle de acesso do sistema: (1) Condição de corrida com risco de double-spend no resgate de metas financeiras (`GoalsService.withdraw`), onde leituras e checagens fora de transação permitem duplicar créditos bancários; (2) Transferência financeira arbitrária sem validação de saldo na conta de origem (`TransactionsService.transfer`), possibilitando débitos negativos ilimitados e inflação de saldo destino sem lastro; (3) BOLA/IDOR universal na associação de categorias em transações e orçamentos (`TransactionsService.create` e `BudgetsService.create`), permitindo que usuários associem lançamentos e tetos orçamentários a categorias privadas de terceiros sem validação de posse ou contexto familiar.

## Goals

- [ ] Garantir que o resgate de valores de metas financeiras (`GoalsService.withdraw`) seja estritamente atômico dentro da transação de banco com validação de saldo concorrente, eliminando qualquer risco de double-spending ou duplicação de crédito em conta bancária.
- [ ] Bloquear tentativas de transferência bancária (`TransactionsService.transfer`) cujo valor solicitado seja superior ao saldo disponível na conta de origem, retornando HTTP 400 BadRequestException e impedindo saldos negativos ilimitados.
- [ ] Validar a posse e o contexto de tenancy de `categoryId` tanto em lançamentos (`TransactionsService.create`) quanto em orçamentos (`BudgetsService.create`), rejeitando referências a categorias de terceiros com HTTP 403 Forbidden ou HTTP 404 NotFoundException.
- [ ] Atualizar e expandir a suíte de testes unitários do backend para cobrir todos os novos cenários de segurança e validação atômica.

## Out of Scope

Explicitly excluded. Documented to prevent scope creep.

| Feature | Reason |
| ------- | ------ |
| Correção de vulnerabilidades de severidade Alta ou Média (ex: portas Docker, pacotes npm) | Foco estrito nas 3 vulnerabilidades críticas (SEC-CRIT-01, SEC-CRIT-02, SEC-CRIT-03) |
| Alterações estruturais no layout e componentes visuais do frontend | As vulnerabilidades são estritamente de controle de acesso, integridade de saldo e concorrência no backend |
| Mudança do mecanismo de ORM ou migração de banco de dados | As correções utilizam os recursos nativos de transação e validação do Prisma com PostgreSQL |

---

## Assumptions & Open Questions

Every ambiguity is resolved or recorded here - nothing is left silently unclear.

| Assumption / decision | Chosen default | Rationale | Confirmed? |
| --------------------- | -------------- | --------- | ---------- |
| Nível de validação atômica no resgate de metas | Executar leitura da meta e checagem de saldo estritamente dentro de `tx` e aplicar decremento atômico `{ decrement: withdrawAmount }` | Impede leituras com dados defasados e elimina duplicação de crédito bancário concorrente | y |
| Regra de validação de saldo em transferências | Exigir `source.currentBalance >= amount` e lançar HTTP 400 BadRequestException se insuficiente | Mantém integridade contábil estrita e impede geração de saldo sem fundos | y |
| Escopo autorizado para categorias em transações e orçamentos | Permitir apenas se `isSystemDefault === true` ou se pertencer ao mesmo `userId` (pessoal) ou ao mesmo `familyId` (familiar) | Assegura isolamento multitenant estrito entre famílias e contas individuais | y |
| Resposta para categoria de terceiro não autorizada | Lançar HTTP 403 ForbiddenException ('Acesso negado à categoria informada') | Informa claramente a negação de acesso por violação de propriedade/autorização | y |

**Open questions:** none - all resolved or logged above (required before the spec is confirmed).

---

## User Stories

### P1: Correção de Race Condition e Double-Spend no Resgate de Metas (SEC-CRIT-01) ⭐ MVP

**User Story**: Como correntista do sistema, quero ter a garantia de que resgates de metas financeiras sejam processados de forma atômica e estritamente controlada para que falhas de concorrência não gerem inconsistências ou saldos duplicados em contas bancárias.

**Why P1**: Elimina risco crítico de fraude financeira por requisições paralelas que duplicam crédito bancário.

**Acceptance Criteria** (each line is one EARS pattern):

1. WHEN uma solicitação válida de resgate for recebida THEN the system SHALL executar a leitura da meta, a verificação de saldo disponível e o débito dentro do bloco transacional de banco de dados. <!-- event-driven -->
2. IF o valor do resgate for maior que o saldo acumulado atual da meta no momento da execução transacional THEN the system SHALL rejeitar a operação lançando HTTP 400 BadRequestException com a mensagem "Saldo insuficiente na meta para realizar o resgate". <!-- unwanted-behavior -->
3. WHEN o resgate for autorizado e processado com sucesso THEN the system SHALL decrementar o saldo da meta atomicamente e creditar o montante na conta bancária vinculada. <!-- event-driven -->
4. The system SHALL impedir que requisições de resgate simultâneas retirem valores que superem o saldo total acumulado na meta. <!-- ubiquitous -->

**Independent Test**: Executar teste unitário simulando resgate com saldo insuficiente e resgate bem-sucedido com decremento atômico garantido no `GoalsService`.

---

### P2: Bloqueio de Transferência Financeira sem Saldo Disponível (SEC-CRIT-02) ⭐ MVP

**User Story**: Como usuário e administrador de finanças familiares, quero que transferências entre contas bancárias exijam saldo suficiente na conta de origem para que nenhuma transferência arbitrária sem fundos seja efetivada.

**Why P2**: Impede a criação de crédito sem lastro e o desvio ilimitado de valores de contas familiares para contas pessoais.

**Acceptance Criteria**:

1. IF o saldo disponível na conta de origem for inferior ao montante a ser transferido THEN the system SHALL rejeitar a operação lançando HTTP 400 BadRequestException com mensagem indicando saldo insuficiente. <!-- unwanted-behavior -->
2. WHEN a conta de origem possuir saldo igual ou superior ao montante da transferência THEN the system SHALL debitar a conta de origem e creditar a conta de destino atomicamente com status HTTP 201 Created. <!-- event-driven -->
3. The system SHALL manter a consistência contábil impedindo que contas bancárias fiquem com saldo negativo após operações de transferência simples. <!-- ubiquitous -->

**Independent Test**: Executar requisição de transferência informando montante maior que o saldo da conta de origem e validar rejeição com HTTP 400, seguido de transferência com saldo suficiente verificando sucesso.

---

### P3: Prevenção de BOLA/IDOR na Associação de Categorias (SEC-CRIT-03) ⭐ MVP

**User Story**: Como usuário do sistema, quero que minhas categorias personalizadas não possam ser utilizadas ou associadas a transações e orçamentos de outros usuários ou famílias sem autorização.

**Why P3**: Garante o isolamento completo de tenancy e integridade de categorização entre diferentes usuários e famílias.

**Acceptance Criteria**:

1. IF o `categoryId` informado em `TransactionsService.create` pertencer a outro usuário ou grupo familiar não autorizado THEN the system SHALL rejeitar o lançamento com HTTP 403 Forbidden com a mensagem "Acesso negado à categoria informada". <!-- unwanted-behavior -->
2. IF o `categoryId` informado em `BudgetsService.create` pertencer a outro usuário ou grupo familiar não autorizado THEN the system SHALL rejeitar a criação do orçamento com HTTP 403 Forbidden com a mensagem "Acesso negado à categoria informada". <!-- unwanted-behavior -->
3. IF o `categoryId` fornecido não existir ou estiver marcado como excluído (`deletedAt !== null`) THEN the system SHALL rejeitar a requisição com HTTP 404 NotFoundException com a mensagem "Categoria informada não encontrada". <!-- unwanted-behavior -->
4. WHEN o `categoryId` corresponder a uma categoria padrão do sistema (`isSystemDefault === true`) ou pertencer legitimamente ao usuário/família autenticado THEN the system SHALL associar a categoria e persistir o registro com sucesso. <!-- event-driven -->

**Independent Test**: Submeter criação de transação e de orçamento com ID de categoria de outro usuário e verificar HTTP 403 Forbidden, e depois submeter com categoria autorizada confirmando sucesso.

---

## Edge Cases

- IF um lançamento pessoal (`familyId === null`) for submetido com uma categoria pertencente a uma família do usuário THEN the system SHALL lançar HTTP 403 Forbidden para manter a estrita separação entre escopo pessoal e familiar.
- IF duas requisições concorrentes de resgate de meta forem submetidas somando valor superior ao disponível THEN the system SHALL permitir apenas o resgate suportado pelo saldo real e rejeitar a excedente com HTTP 400.
- IF uma conta de origem de transferência possuir exatamente o saldo do valor a transferir THEN the system SHALL efetivar a transferência deixando o saldo da conta zerado com sucesso.

---

## Requirement Traceability

| Requirement ID | Story | Phase | Status |
| -------------- | ----- | ----- | ------ |
| CRIT-01 | P1: Correção de Race Condition no Resgate de Metas | Tasks | Pending |
| CRIT-02 | P1: Correção de Race Condition no Resgate de Metas | Tasks | Pending |
| CRIT-03 | P1: Correção de Race Condition no Resgate de Metas | Tasks | Pending |
| CRIT-04 | P2: Bloqueio de Transferência sem Saldo Suficiente | Tasks | Pending |
| CRIT-05 | P2: Bloqueio de Transferência sem Saldo Suficiente | Tasks | Pending |
| CRIT-06 | P3: Prevenção de BOLA na Associação de Categorias | Tasks | Pending |
| CRIT-07 | P3: Prevenção de BOLA na Associação de Categorias | Tasks | Pending |
| CRIT-08 | P3: Prevenção de BOLA na Associação de Categorias | Tasks | Pending |

**Coverage:** 8 total, 8 mapped to tasks, 0 unmapped

---

## Success Criteria

- [ ] Zero ocorrências de double-spending ou créditos duplicados em resgate de metas financeiras.
- [ ] 100% das tentativas de transferência com saldo insuficiente bloqueadas com HTTP 400.
- [ ] 100% das tentativas de associação de categorias de terceiros bloqueadas com HTTP 403/404.
- [ ] 100% de aprovação na suíte completa de testes automatizados do backend.
