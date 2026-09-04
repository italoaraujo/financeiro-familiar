# Logs de Auditoria e Ações do Sistema Specification

## Problem Statement

Atualmente, o sistema financeiro pessoal e familiar não possui um mecanismo centralizado de auditoria para persistir o histórico das operações realizadas pelos usuários e administradores (criação, edição e exclusão de transações, contas bancárias, cartões de crédito, categorias e orçamentos). Em caso de divergências contábeis, exclusões indevidas, problemas de segurança ou necessidades de suporte técnico, não há rastreabilidade de quem executou a ação, a rota chamada, o endereço IP, o timestamp ou os dados envolvidos. É necessário criar a estrutura de banco de dados e a camada de captura automática no backend para registrar todas as ações mutativas do sistema com sanitização rigorosa de dados sensíveis e disponibilizar endpoints de consulta seguros.

## Goals

- [ ] Criar o modelo de banco de dados `AuditLog` no Prisma ORM mapeado para a tabela `audit_logs` no PostgreSQL com índices otimizados.
- [ ] Implementar interceptor global no NestJS para capturar automaticamente todas as requisições HTTP mutativas (`POST`, `PUT`, `PATCH`, `DELETE`).
- [ ] Garantir a sanitização recursiva de payloads para impedir o armazenamento de senhas, tokens de autenticação ou chaves secretas nos logs.
- [ ] Implementar o serviço `AuditLogsService` com tratamento de erro resiliente e não-bloqueante (falhas de log não abortam operações de negócio).
- [ ] Permitir a criação pontual de registros detalhados de auditoria por módulos de domínio com `entityName`, `entityId`, `oldData` e `newData`.
- [ ] Disponibilizar endpoints de consulta paginada (`GET /audit-logs` e `GET /audit-logs/:id`) restritos aos papéis de `OWNER` e `ADMIN` para dados da família ou ao próprio usuário para logs pessoais.
- [ ] Cobrir toda a funcionalidade com testes unitários e de integração automatizados.

## Out of Scope

Explicitly excluded. Documented to prevent scope creep.

| Feature | Reason |
| ------- | ------ |
| Interface visual de auditoria no frontend Next.js | Foco inicial completo na camada de infraestrutura, banco de dados e API backend; visualização na UI fica para história subsequente |
| Log de requisições idempotentes de leitura (`GET`, `HEAD`, `OPTIONS`) | Evitar sobrecarga volumétrica desnecessária no banco de dados com buscas repetitivas de tela |
| Rotinas automatizadas de expurgo físico ou particionamento de tabela | Volume inicial moderado; retenção integral preservada para auditoria histórica contábil |
| Auditoria de comandos executados diretamente no banco de dados (fora da aplicação) | Escopo restrito a ações disparadas pela API do sistema |

---

## Assumptions & Open Questions

Every ambiguity is resolved or recorded here - nothing is left silently unclear.

| Assumption / decision | Chosen default | Rationale | Confirmed? |
| --------------------- | -------------- | --------- | ---------- |
| Estratégia de captura | Interceptor global NestJS para métodos HTTP mutativos (`POST`, `PUT`, `PATCH`, `DELETE`) + serviço injetável para auditoria de domínio | Captura 100% das alterações na API de forma transparente sem exigir modificação em todos os controllers | y |
| Resiliência e falhas | Execução não-bloqueante com captura silenciosa de exceções em logger | Falhas temporárias na tabela de auditoria não devem quebrar o fluxo financeiro do usuário | y |
| Sanitização de dados sensíveis | Mascarar recursivamente campos como `password`, `token`, `refreshToken`, `passwordHash`, `secret` | Preserva a segurança da informação e conformidade com boas práticas de privacidade | y |
| Controle de acesso aos logs | Apenas `OWNER` e `ADMIN` da família consultam logs do grupo; usuários consultam apenas seus próprios logs | Garante isolamento entre usuários e evita vazamento de ações administrativas | y |
| Formato de armazenamento dos payloads | Colunas `old_data`, `new_data` e `metadata` do tipo `JsonB` no PostgreSQL | Flexibilidade para acomodar diferentes esquemas de entidades e facilidade de consulta | y |

**Open questions:** none - all resolved or logged above (required before the spec is confirmed).

---

## User Stories

### P1: Persistência e Captura Automática de Logs de Ações ⭐ MVP

**User Story**: As a administrador do sistema ou usuário da família, I want que todas as operações mutativas (criação, edição e exclusão) sejam gravadas automaticamente em uma tabela de logs com dados de contexto so that tenhamos rastreabilidade completa das ações executadas no sistema.

**Why P1**: É a base do sistema de auditoria: sem persistência no banco e captura automática, não há como recuperar o histórico de ações e identificar responsabilidades.

**Acceptance Criteria**:

1. The system SHALL armazenar os registros de auditoria na tabela `audit_logs` no PostgreSQL com campos de identificador, usuário, família, entidade, ação, rota, método, status HTTP, endereço IP, tempo de resposta, payload e timestamp.
2. WHEN uma requisição HTTP com método `POST`, `PUT`, `PATCH` ou `DELETE` for processada THEN the system SHALL registrar uma entrada na tabela `audit_logs` contendo o `userId`, `endpoint`, `method`, `statusCode` e `durationMs`.
3. The system SHALL sanitizar recursivamente os objetos de payload substituindo valores de chaves sensíveis (`password`, `token`, `refreshToken`, `passwordHash`) pela string `[REDACTED]` antes de persistir no banco.
4. IF a gravação do log de auditoria falhar por erro de banco de dados THEN the system SHALL registrar o erro no logger interno e não abortar a resposta da requisição original do usuário.
5. WHEN uma ação for disparada por usuário autenticado vinculado a uma família THEN the system SHALL vincular o `familyId` correspondente ao registro de auditoria.

**Independent Test**: Realizar uma chamada `POST /transactions` para criar uma nova despesa com usuário autenticado. Consultar o banco de dados e verificar que um registro correspondente foi inserido em `audit_logs` com os dados da transação gravados em `newData`, tempo de resposta em milissegundos e status 201.

---

### P2: Consulta e Filtragem de Logs de Auditoria

**User Story**: As a administrador de uma família (`OWNER` ou `ADMIN`), I want consultar a lista de ações e logs de auditoria com filtros por período, usuário e entidade so that eu possa auditar alterações suspeitas ou conferir quem alterou determinado registro financeiro.

**Why P2**: Permite aos gestores do grupo familiar inspecionar e extrair valor prático dos dados de auditoria armazenados.

**Acceptance Criteria**:

1. WHEN um usuário com papel `OWNER` ou `ADMIN` solicitar `GET /audit-logs?familyId=:familyId` THEN the system SHALL retornar a listagem paginada dos logs de auditoria da referida família em ordem cronológica decrescente.
2. IF um usuário que não seja membro ou não possua papel `OWNER` ou `ADMIN` na família tentar consultar os logs daquela família THEN the system SHALL recusar o acesso respondendo com código `403 Forbidden`.
3. WHEN um usuário autenticado solicitar `GET /audit-logs` sem especificar família THEN the system SHALL retornar apenas os logs de auditoria gerados pelo seu próprio `userId`.
4. WHEN filtros de busca (`startDate`, `endDate`, `entityName`, `action`) forem informados na requisição THEN the system SHALL filtrar os logs de acordo com os parâmetros válidos informados.
5. WHEN o identificador de um log for consultado via `GET /audit-logs/:id` por usuário autorizado THEN the system SHALL retornar os detalhes completos do log com os payloads sanitizados.

**Independent Test**: Criar duas ações por usuários distintos em uma família. Autenticar com o `OWNER` da família e chamar `GET /audit-logs?familyId=...`. Confirmar que ambas as ações são retornadas com paginação. Autenticar com usuário de outra família e chamar a mesma URL, confirmando resposta 403.

---

## Edge Cases

- IF a requisição for direcionada a uma rota pública de autenticação (como `/auth/login` ou `/auth/register`) THEN the system SHALL registrar a ação de login/cadastro sanitizando totalmente as senhas recebidas no body.
- IF uma requisição for cancelada pelo cliente ou retornar erro de validação (status 400 ou 422) THEN the system SHALL registrar o log com o código de erro retornado e o tempo decorrido até a falha.
- IF o payload de entrada for um FormData, arquivo binário ou array muito extenso THEN the system SHALL truncar ou resumir o conteúdo em `metadata` para não exceder limites de armazenamento.
- IF o usuário requisitar `GET /audit-logs/:id` para um identificador inexistente THEN the system SHALL responder com status `404 Not Found`.

---

## Requirement Traceability

Each requirement gets a unique ID for tracking across design, tasks, and validation.

| Requirement ID | Story | Phase | Status |
| -------------- | ----- | ----- | ------ |
| LOGS-01 | P1: Persistência e Captura Automática de Logs de Ações | Tasks | Implementing |
| LOGS-02 | P1: Persistência e Captura Automática de Logs de Ações | Design | Pending |
| LOGS-03 | P1: Persistência e Captura Automática de Logs de Ações | Design | Pending |
| LOGS-04 | P1: Persistência e Captura Automática de Logs de Ações | Design | Pending |
| LOGS-05 | P1: Persistência e Captura Automática de Logs de Ações | Design | Pending |
| LOGS-06 | P2: Consulta e Filtragem de Logs de Auditoria | Design | Pending |
| LOGS-07 | P2: Consulta e Filtragem de Logs de Auditoria | Design | Pending |
| LOGS-08 | P2: Consulta e Filtragem de Logs de Auditoria | Design | Pending |

**Coverage:** 8 total, 8 mapped to tasks, 0 unmapped

---

## Success Criteria

How we know the feature is successful:

- [ ] Modelo `AuditLog` criado no Prisma e migration aplicada com sucesso no PostgreSQL.
- [ ] 100% das mutações HTTP (`POST`, `PUT`, `PATCH`, `DELETE`) registradas automaticamente no banco.
- [ ] Zero ocorrências de senhas ou tokens gravados em texto legível nos logs (sanitização 100% eficaz).
- [ ] Endpoints de consulta protegidos contra acesso não autorizado de terceiros.
- [ ] 100% dos testes unitários e de integração passando na suíte do Jest.
