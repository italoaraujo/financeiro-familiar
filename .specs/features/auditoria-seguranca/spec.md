# Correção de Vulnerabilidades Críticas de Segurança Specification

## Problem Statement

Uma auditoria de segurança identificou três vulnerabilidades críticas no sistema:
1. IDOR/BOLA no pagamento de faturas de cartão de crédito (`CreditCardsService.payInvoice`), permitindo que um usuário pague faturas de terceiros ou debite valores de contas bancárias de outras famílias/usuários sem autorização.
2. IDOR/BOLA no aporte de metas financeiras (`GoalsService.addDeposit`), permitindo que um usuário debite saldo de contas bancárias arbitrárias pertencentes a outros usuários ou famílias para aumentar o saldo de sua meta pessoal.
3. Segredo JWT com fallback hardcoded previsível (`supersecretjwtkey1234567890`) em código e arquivos de configuração, permitindo a forja de tokens de autenticação válidos e o comprometimento irrestrito de qualquer conta de usuário.

## Goals

- [x] Bloquear tentativas de pagamento de faturas de terceiros ou débito de contas bancárias não autorizadas em `CreditCardsService.payInvoice`, retornando HTTP 403 Forbidden ou HTTP 404 Not Found conforme a regra de propriedade e pertencimento.
- [x] Bloquear tentativas de aporte em metas que tentem debitar saldo de contas bancárias sobre as quais o usuário não possua autorização de propriedade ou contexto familiar em `GoalsService.addDeposit`.
- [x] Exigir obrigatoriamente uma chave criptográfica forte para `JWT_SECRET` (mínimo de 32 caracteres seguros e sem termos previsíveis como `supersecret`), interrompendo a inicialização do NestJS com erro fatal caso a variável não seja fornecida ou seja vulnerável.
- [x] Remover valores hardcoded e fallbacks permissivos em arquivos de infraestrutura e ambiente (`auth.module.ts`, `jwt.strategy.ts`, `docker-compose.yml`, `.env`, `.env.example`).
- [x] Cobrir todos os novos controles de autorização e restrições com testes automatizados no backend.

## Out of Scope

Explicitly excluded. Documented to prevent scope creep.

| Feature | Reason |
| ------- | ------ |
| Refatoração de endpoints de autenticação por e-mail e senha | O escopo abrange estritamente a segurança e assinatura do token JWT |
| Mudança do algoritmo de assinatura de JWT (HMAC-SHA256 para RSA/ECDSA) | HMAC-SHA256 atende aos requisitos de segurança com chaves simétricas de 256+ bits |
| Alterações na interface visual do frontend | As vulnerabilidades são estritamente de controle de acesso e segredos no backend e infraestrutura |

---

## Assumptions & Open Questions

Every ambiguity is resolved or recorded here - nothing is left silently unclear.

| Assumption / decision | Chosen default | Rationale | Confirmed? |
| --------------------- | -------------- | --------- | ---------- |
| Comportamento para cartão pessoal de outro usuário em fatura | Lançar HTTP 403 Forbidden ('Acesso negado à fatura informada') se o cartão for pessoal (`familyId === null`) e pertencer a outro usuário | Mantém a consistência com o modelo de segurança pessoal e familiar | y |
| Comportamento para conta bancária de débito não pertencente ao usuário | Lançar HTTP 403 Forbidden ('Você não tem permissão para debitar desta conta bancária') se a conta não pertencer ao usuário e não for da família com acesso | Impede transferências e quitações financeiras cruzadas não autorizadas | y |
| Validação de conta em aporte de metas | Lançar HTTP 403 Forbidden ('Acesso negado à conta bancária de débito selecionada') se `targetAccountId` não pertencer ao usuário nem à família autorizada | Garante que aportes sejam debitados exclusivamente de contas legítimas | y |
| Regra de validação de `JWT_SECRET` | Recusar chave ausente, menor que 32 caracteres ou que contenha a substring 'supersecret' | Garante entropia mínima de 256 bits e previne o uso das chaves padrão vulneráveis | y |
| Fallback de `JWT_SECRET` no docker-compose | Tornar obrigatório via `${JWT_SECRET}` sem valor default inseguro | Força a configuração explícita de segredo antes de subir o ambiente | y |

**Open questions:** none - all resolved or logged above (required before the spec is confirmed).

---

## User Stories

### P1: Correção de BOLA/IDOR em Pagamento de Faturas de Cartão (SEC-CRIT-01) ⭐ MVP

**User Story**: Como usuário do sistema, quero ter certeza de que ninguém pode pagar faturas debitando dinheiro da minha conta bancária, nem liquidar faturas de cartões pessoais de terceiros sem permissão.

**Why P1**: Elimina risco crítico de fraude financeira direta entre usuários e famílias.

**Acceptance Criteria** (each line is one EARS pattern):

1. IF um usuário tentar pagar uma fatura de cartão de crédito pessoal (`familyId === null`) pertencente a outro usuário THEN the system SHALL lançar HTTP 403 Forbidden com a mensagem "Acesso negado à fatura informada". <!-- unwanted-behavior -->
2. IF um usuário tentar pagar uma fatura informando uma conta bancária (`accountId`) que não pertença a ele nem à sua família THEN the system SHALL lançar HTTP 403 Forbidden com a mensagem "Você não tem permissão para debitar desta conta bancária". <!-- unwanted-behavior -->
3. IF um usuário com papel `VIEWER` na família tentar pagar uma fatura familiar ou utilizar uma conta bancária familiar THEN the system SHALL lançar HTTP 403 Forbidden. <!-- unwanted-behavior -->
4. WHEN o proprietário legítimo ou membro autorizado da família pagar uma fatura com sua própria conta bancária ou conta da família THEN the system SHALL processar a liquidação da fatura e debitar o saldo com sucesso. <!-- event-driven -->

**Independent Test**: Executar requisição de pagamento de fatura com `accountId` de outro usuário e verificar lançamento de HTTP 403 Forbidden, seguido de teste com conta legítima verificando sucesso HTTP 200/201.

---

### P2: Correção de BOLA/IDOR em Aportes de Metas Financeiras (SEC-CRIT-02) ⭐ MVP

**User Story**: Como correntista, quero que nenhum outro usuário do sistema consiga debitar valores da minha conta bancária para fazer aportes em metas financeiras próprias.

**Why P2**: Impede a apropriação indevida de fundos bancários através do módulo de metas ("cofrinhos").

**Acceptance Criteria**:

1. IF o usuário tentar realizar um aporte em uma meta informando uma conta bancária (`accountId`) que não pertença a ele nem ao grupo familiar autorizado THEN the system SHALL lançar HTTP 403 Forbidden com a mensagem "Acesso negado à conta bancária de débito selecionada". <!-- unwanted-behavior -->
2. IF a conta bancária de débito indicada não existir ou possuir `deletedAt` preenchido THEN the system SHALL lançar HTTP 404 NotFoundException com a mensagem "Conta bancária de débito não encontrada". <!-- unwanted-behavior -->
3. WHEN o usuário proprietário da conta ou membro familiar autorizado realizar um aporte com saldo suficiente THEN the system SHALL transferir o montante debitando da conta e creditando na meta com sucesso. <!-- event-driven -->

**Independent Test**: Testar requisição de aporte em meta utilizando UUID de conta bancária de terceiros e confirmar HTTP 403 Forbidden, e depois testar com conta própria confirmando débito correto.

---

### P3: Proteção Estrita e Eliminação de Fallbacks Hardcoded de JWT (SEC-CRIT-03) ⭐ MVP

**User Story**: Como responsável pela segurança da aplicação, quero que o sistema recuse a inicialização se a chave `JWT_SECRET` não for fornecida ou for fraca/conhecida, garantindo que nenhum token forjado seja aceito.

**Why P3**: Evita falsificação universal de credenciais e impersonation de contas sem necessidade de senha.

**Acceptance Criteria**:

1. IF a variável de ambiente `JWT_SECRET` for nula, possuir comprimento inferior a 32 caracteres ou contiver a substring 'supersecret' THEN the system SHALL interromper a inicialização com uma exceção fatal imediata. <!-- unwanted-behavior -->
2. WHEN `JWT_SECRET` for configurado com uma sequência de 32 ou mais caracteres seguros THEN the system SHALL inicializar o módulo de autenticação e assinar/validar tokens JWT com sucesso. <!-- event-driven -->
3. The system SHALL não conter nenhuma chave secreta JWT estática hardcoded no código fonte ou valores padrão inseguros no arquivo de orquestração docker-compose. <!-- ubiquitous -->

**Independent Test**: Executar teste de inicialização do `AuthModule` e `JwtStrategy` com chave vazia, curta (<32 chars) e com 'supersecret' confirmando lançamento de erro fatal, e com chave válida de 32+ caracteres confirmando inicialização normal.

---

## Edge Cases

- IF o usuário tentar pagar uma fatura de cartão familiar onde a conta bancária é pessoal do usuário THEN the system SHALL permitir a operação desde que o usuário seja o dono da conta pessoal e membro autorizado da família do cartão.
- IF a conta bancária informada estiver marcada com soft-delete (`deletedAt !== null`) THEN the system SHALL retornar HTTP 404 NotFound em vez de prosseguir com a operação.
- IF o valor do `JWT_SECRET` possuir espaços em branco nas extremidades THEN the system SHALL validar a chave após o trim adequado sem permitir bypass.

---

## Requirement Traceability

Each requirement gets a unique ID for tracking across design, tasks, and validation.

| Requirement ID | Story | Phase | Status |
| -------------- | ----- | ----- | ------ |
| SEC-01 | P1: Correção de BOLA/IDOR em Pagamento de Faturas de Cartão (SEC-CRIT-01) | Tasks | Verified |
| SEC-02 | P1: Correção de BOLA/IDOR em Pagamento de Faturas de Cartão (SEC-CRIT-01) | Tasks | Verified |
| SEC-03 | P1: Correção de BOLA/IDOR em Pagamento de Faturas de Cartão (SEC-CRIT-01) | Tasks | Verified |
| SEC-04 | P1: Correção de BOLA/IDOR em Pagamento de Faturas de Cartão (SEC-CRIT-01) | Tasks | Verified |
| SEC-05 | P2: Correção de BOLA/IDOR em Aportes de Metas Financeiras (SEC-CRIT-02) | Tasks | Verified |
| SEC-06 | P2: Correção de BOLA/IDOR em Aportes de Metas Financeiras (SEC-CRIT-02) | Tasks | Verified |
| SEC-07 | P2: Correção de BOLA/IDOR em Aportes de Metas Financeiras (SEC-CRIT-02) | Tasks | Verified |
| SEC-08 | P3: Proteção Estrita e Eliminação de Fallbacks Hardcoded de JWT (SEC-CRIT-03) | Tasks | Pending |
| SEC-09 | P3: Proteção Estrita e Eliminação de Fallbacks Hardcoded de JWT (SEC-CRIT-03) | Tasks | Pending |
| SEC-10 | P3: Proteção Estrita e Eliminação de Fallbacks Hardcoded de JWT (SEC-CRIT-03) | Tasks | Pending |

**Coverage:** 10 total, 10 mapped to tasks, 0 unmapped

---

## Success Criteria

How we know the feature is successful:

- [ ] Todas as tentativas de exploração de BOLA/IDOR em `payInvoice` e `addDeposit` são bloqueadas com HTTP 403 Forbidden.
- [ ] Todas as credenciais hardcoded de JWT são removidas do repositório e fallbacks inseguros eliminados.
- [ ] A aplicação recusa iniciar se `JWT_SECRET` for inseguro ou ausente.
- [ ] 100% dos testes unitários e de integração passam no backend.
