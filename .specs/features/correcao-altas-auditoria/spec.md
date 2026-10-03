# Correção de Vulnerabilidades de Severidade Alta da Auditoria Specification

## Problem Statement

Durante a auditoria completa de segurança (AppSec/DevSecOps), foram identificadas 5 vulnerabilidades de severidade Alta (`SEC-HIGH-01` a `SEC-HIGH-05`): (1) BOLA na associação de conta bancária arbitrária a cartões de crédito (`CreditCardsService.create` e `update`), permitindo vincular contas alheias ao cartão; (2) BOLA em categorias pai de subcategorias (`CategoriesService.create` e `update`), permitindo criar subcategorias sob categorias privadas de terceiros; (3) Violação de integridade contábil por exclusão de transações em faturas já fechadas ou quitadas (`TransactionsService.remove`), permitindo estornar despesas pagas e corromper o histórico financeiro; (4) Exposição direta de portas de microsserviços (`3001:3001` e `3000:3000`) em todas as interfaces de rede (`0.0.0.0`) no Docker Compose, possibilitando acesso externo contornando proxies reversos; (5) Presença de componentes de terceiros com CVEs conhecidas no backend e frontend.

## Goals

- [ ] Bloquear associação de contas bancárias de terceiros em cartões de crédito (`CreditCardsService.create` e `update`), validando que a conta exista e pertença ao mesmo escopo pessoal ou familiar do cartão.
- [ ] Impedir associação de categorias pai não autorizadas em subcategorias (`CategoriesService.create` e `update`), garantindo que pertençam ao sistema, ao mesmo usuário ou ao mesmo grupo familiar, e impedindo auto-referência cíclica (`parentId === id`).
- [ ] Impedir a exclusão de lançamentos vinculados a faturas de cartão de crédito já fechadas (`CLOSED`) ou pagas (`PAID`) em `TransactionsService.remove`, preservando a consistência contábil de períodos encerrados.
- [ ] Restringir o mapeamento de portas dos serviços de API e frontend à interface de loopback (`127.0.0.1`) no `docker-compose.yml`, eliminando a exposição externa desprotegida.
- [ ] Remediar vulnerabilidades conhecidas em dependências do backend e frontend através de correções seguras (`npm audit fix`) e overrides de subdependências com zero regressões.
- [ ] Manter 100% de aprovação na suíte de testes automatizados e no processo de compilação da aplicação.

## Out of Scope

Explicitly excluded. Documented to prevent scope creep.

| Feature | Reason |
| ------- | ------ |
| Vulnerabilidades de severidade Média (`SEC-MED-01` a `SEC-MED-07`) e Baixa | Escopo focado estritamente nas 5 vulnerabilidades de severidade Alta catalogadas no relatório de auditoria |
| Atualizações de grande porte (major breaking changes como NestJS 12 ou Tailwind v4) | Preservação da estabilidade das bibliotecas em produção |
| Redesenho de interfaces ou fluxos visuais do frontend | Correções focadas em segurança, controle de acesso, integridade contábil e infraestrutura |

---

## Assumptions & Open Questions

Every ambiguity is resolved or recorded here - nothing is left silently unclear.

| Assumption / decision | Chosen default | Rationale | Confirmed? |
| --------------------- | -------------- | --------- | ---------- |
| Validação de conta em cartões de crédito | Exigir que a conta bancária exista, não esteja deletada e pertença ao mesmo contexto do cartão (mesmo usuário para pessoal ou mesma família para familiar) | Impede associação indevida e BOLA/IDOR entre diferentes usuários e famílias | y |
| Validação de categoria pai em subcategorias | Exigir que a categoria pai exista, não esteja deletada e seja padrão do sistema (`isSystemDefault === true`) ou pertença ao mesmo contexto (mesmo usuário/família) | Evita poluição estrutural de catálogos alheios e enumeração de IDs | y |
| Regra de exclusão de transações em faturas | Rejeitar exclusão se a fatura vinculada estiver com status `CLOSED` ou `PAID`, lançando HTTP 400 BadRequestException | Mantém a consistência de faturas quitadas ou fechadas contra alterações retroativas | y |
| Mapeamento de portas no Compose | Configurar `"127.0.0.1:3001:3001"` e `"127.0.0.1:3000:3000"` | Padroniza com a proteção já existente no PostgreSQL e exige passagem por proxy reverso | y |
| Estratégia de remediação de dependências | Aplicar correções com `npm audit fix` e overrides pontuais de subdependências sem introduzir breaking changes | Mantém a compatibilidade de runtime com NestJS e Next.js | y |

**Open questions:** none - all resolved or logged above (required before the spec is confirmed).

---

## User Stories

### P1: Prevenção de BOLA na Associação de Contas a Cartões de Crédito (SEC-HIGH-01) ⭐ MVP

**User Story**: Como correntista do sistema, quero ter a garantia de que apenas contas bancárias sob minha posse legítima ou do meu grupo familiar possam ser vinculadas aos meus cartões de crédito para que nenhum usuário malicioso possa vincular contas alheias aos seus cartões.

**Why P1**: Elimina a falha de Broken Object-Level Authorization (CWE-639) na gestão de cartões de crédito.

**Acceptance Criteria** (each line is one EARS pattern):

1. IF o `accountId` fornecido na criação ou edição de cartão de crédito não existir ou estiver marcado com soft-delete THEN the system SHALL rejeitar a requisição lançando HTTP 404 NotFoundException com a mensagem "Conta bancária informada não encontrada". <!-- unwanted-behavior -->
2. IF o `accountId` fornecido pertencer a outro usuário ou grupo familiar não correspondente ao cartão THEN the system SHALL rejeitar a operação lançando HTTP 403 ForbiddenException com mensagem de acesso negado. <!-- unwanted-behavior -->
3. WHEN o `accountId` pertencer legitimamente ao mesmo usuário ou grupo familiar do cartão THEN the system SHALL associar a conta e persistir a alteração com sucesso. <!-- event-driven -->

**Independent Test**: Executar requisições de criação e atualização de cartão de crédito informando ID de conta inexistente e ID de conta de outro usuário, validando rejeições 404 e 403, e requisição com conta autorizada validando sucesso.

---

### P2: Prevenção de BOLA em Categorias Pai e Subcategorias (SEC-HIGH-02) ⭐ MVP

**User Story**: Como usuário do sistema, quero que subcategorias só possam ser vinculadas a categorias pai legítimas do sistema, minhas ou da minha família, para evitar que terceiros anexem dados estruturais em minhas categorias particulares.

**Why P2**: Garante o isolamento estrito da árvore hierárquica de categorias e impede enumeração de IDs de categorias de outros usuários.

**Acceptance Criteria**:

1. IF o `parentId` fornecido não existir ou estiver marcado com soft-delete THEN the system SHALL rejeitar a operação lançando HTTP 404 NotFoundException com a mensagem "Categoria pai não encontrada". <!-- unwanted-behavior -->
2. IF o `parentId` fornecido for igual ao próprio identificador da categoria em atualização THEN the system SHALL rejeitar a operação lançando HTTP 400 BadRequestException com a mensagem "Uma categoria não pode ser definida como pai de si mesma". <!-- unwanted-behavior -->
3. IF o `parentId` não for categoria do sistema e não pertencer ao usuário ou família correspondente THEN the system SHALL rejeitar a requisição com HTTP 403 ForbiddenException com a mensagem "Acesso negado à categoria pai informada". <!-- unwanted-behavior -->
4. WHEN o `parentId` for uma categoria padrão do sistema ou pertencer ao mesmo proprietário/família THEN the system SHALL persistir a subcategoria com sucesso. <!-- event-driven -->

**Independent Test**: Submeter criação de categoria informando `parentId` de outro usuário e verificar rejeição HTTP 403, e submeter com categoria pai legítima confirmando sucesso.

---

### P3: Bloqueio de Exclusão de Lançamentos em Faturas Fechadas ou Pagas (SEC-HIGH-03) ⭐ MVP

**User Story**: Como administrador financeiro e gestor contábil, quero que despesas pertencentes a faturas de cartão de crédito já fechadas ou quitadas não possam ser excluídas arbitrariamente pelo extrato para preservar a consistência dos relatórios históricos e conciliações passadas.

**Why P3**: Evita discrepâncias contábeis graves onde o total faturado é reduzido retroativamente após o pagamento da fatura.

**Acceptance Criteria**:

1. IF o usuário tentar excluir uma transação vinculada a uma fatura com status `CLOSED` ou `PAID` THEN the system SHALL rejeitar a exclusão lançando HTTP 400 BadRequestException com a mensagem "Não é possível excluir lançamentos de faturas que já foram fechadas ou pagas". <!-- unwanted-behavior -->
2. WHEN a transação for associada a uma fatura aberta (`status === OPEN`) THEN the system SHALL estornar o valor do total da fatura e marcar a transação com soft-delete. <!-- event-driven -->
3. The system SHALL manter a integridade imutável de faturas liquidadas impedindo que o montante total fique menor que o valor pago. <!-- ubiquitous -->

**Independent Test**: Executar exclusão de transação vinculada a fatura fechada ou paga e validar rejeição com HTTP 400, seguido de teste com fatura aberta validando exclusão com sucesso.

---

### P4: Restrição de Exposição de Portas de Microsserviços no Docker Compose (SEC-HIGH-04)

**User Story**: Como engenheiro de infraestrutura e DevSecOps, quero que as portas dos serviços de API e frontend fiquem restritas à interface local (`127.0.0.1`) no Docker Compose para que nenhum atacante externo possa acessar a API diretamente sem passar pelo proxy reverso TLS.

**Why P4**: Impede o contorno de políticas de segurança, WAF e criptografia HTTPS em servidores expostos à internet.

**Acceptance Criteria**:

1. The system SHALL mapear a porta do serviço `api` exclusivamente na interface de loopback `127.0.0.1:3001:3001`. <!-- ubiquitous -->
2. The system SHALL mapear a porta do serviço `frontend` exclusivamente na interface de loopback `127.0.0.1:3000:3000`. <!-- ubiquitous -->
3. The system SHALL manter os serviços integrados na rede interna `financial-net` sem degradação na comunicação inter-contêineres. <!-- ubiquitous -->

**Independent Test**: Inspecionar sintaxe e definições do arquivo `docker-compose.yml` verificando os bindings explícitos em `127.0.0.1`.

---

### P5: Remediação de Dependências Vulneráveis com CVEs Conhecidas (SEC-HIGH-05)

**User Story**: Como mantenedor do sistema, quero que bibliotecas de terceiros com vulnerabilidades conhecidas sejam atualizadas ou corrigidas para eliminar vetores de negação de serviço e injeção de código.

**Why P5**: Reduz a superfície de ataque e elimina CVEs catalogadas em ferramentas de análise de dependências (`npm audit`).

**Acceptance Criteria**:

1. WHEN comandos de auditoria forem executados nos diretórios do projeto THEN the system SHALL aplicar correções de dependências vulneráveis sem introduzir breaking changes nas funcionalidades existentes. <!-- event-driven -->
2. The system SHALL manter 100% de aprovação na suíte de testes unitários e no processo de compilação de código após as atualizações de dependências. <!-- ubiquitous -->

**Independent Test**: Executar suíte de testes unitários e de integração (`npm test`) e verificação de build (`npm run build`) após a atualização de pacotes.

---

## System Requirements

- **HIGH-01**: IF `dto.accountId` is provided in `CreditCardsService.create` or `update`, the system SHALL verify that the account exists and `deletedAt` is null, otherwise throw `NotFoundException`.
- **HIGH-02**: IF `dto.accountId` does not belong to the user or to the card's family context, the system SHALL throw `ForbiddenException`.
- **HIGH-03**: IF `dto.parentId` is provided in `CategoriesService.create` or `update`, the system SHALL verify that the parent category exists and `deletedAt` is null, otherwise throw `NotFoundException`.
- **HIGH-04**: IF `dto.parentId` equals the updating category's `id`, the system SHALL throw `BadRequestException`.
- **HIGH-05**: IF `dto.parentId` is not system default AND does not belong to the category's user or family scope, the system SHALL throw `ForbiddenException`.
- **HIGH-06**: IF a transaction to be deleted belongs to an invoice whose status is `CLOSED` or `PAID`, the system SHALL throw `BadRequestException`.
- **HIGH-07**: In `docker-compose.yml`, service ports for `api` and `frontend` SHALL be bound to `127.0.0.1`.
- **HIGH-08**: Vulnerable transitive dependencies SHALL be remediated while maintaining zero regressions across all automated test suites.

---

## Non-Functional Requirements

- **NFR-SEC-01**: Todas as mensagens de erro de permissão devem retornar códigos HTTP semânticos (403 Forbidden ou 404 Not Found) sem expor detalhes internos do banco de dados.
- **NFR-SEC-02**: Nenhuma modificação pode comprometer a retrocompatibilidade com faturas e transações já registradas no banco.
- **NFR-PERF-01**: As checagens de autorização em banco devem utilizar índices existentes (`[userId, deletedAt]`, `[familyId, deletedAt]`) com overhead imperceptível (< 5ms).

---

## Edge Cases

- IF um cartão de crédito pessoal for associado a uma conta bancária familiar THEN the system SHALL lançar HTTP 403 Forbidden.
- IF uma categoria já existente tentar referenciar a si mesma como pai em um update THEN the system SHALL lançar HTTP 400 BadRequestException.
- IF uma transação de cartão não possuir fatura vinculada (`invoiceId === null`) THEN the system SHALL permitir a exclusão normal estornando apenas dados aplicáveis.

---

## Requirement Traceability

| Requirement ID | Story | Phase | Status |
| -------------- | ----- | ----- | ------ |
| HIGH-01 | P1: Prevenção de BOLA na Associação de Contas a Cartões de Crédito | Tasks | Pending |
| HIGH-02 | P1: Prevenção de BOLA na Associação de Contas a Cartões de Crédito | Tasks | Pending |
| HIGH-03 | P2: Prevenção de BOLA em Categorias Pai e Subcategorias | Tasks | Pending |
| HIGH-04 | P2: Prevenção de BOLA em Categorias Pai e Subcategorias | Tasks | Pending |
| HIGH-05 | P2: Prevenção de BOLA em Categorias Pai e Subcategorias | Tasks | Pending |
| HIGH-06 | P3: Bloqueio de Exclusão de Lançamentos em Faturas Fechadas ou Pagas | Tasks | Pending |
| HIGH-07 | P4: Restrição de Exposição de Portas de Microsserviços no Docker Compose | Tasks | Pending |
| HIGH-08 | P5: Remediação de Dependências Vulneráveis com CVEs Conhecidas | Tasks | Pending |

**Coverage:** 8 total, 8 mapped to tasks, 0 unmapped

---

## Success Criteria

- [ ] 100% das tentativas de associação de conta bancária não autorizada a cartão de crédito bloqueadas com HTTP 403/404.
- [ ] 100% das tentativas de criação de subcategoria vinculada a categoria pai alheia bloqueadas com HTTP 403.
- [ ] 100% das tentativas de exclusão de transações em faturas fechadas ou pagas bloqueadas com HTTP 400.
- [ ] Portas dos serviços de API e frontend estritamente limitadas a `127.0.0.1` no Docker Compose.
- [ ] Redução de CVEs conhecidas nas dependências sem quebras ou regressões.
- [ ] 100% de testes unitários e de integração aprovados com compilação bem-sucedida.
