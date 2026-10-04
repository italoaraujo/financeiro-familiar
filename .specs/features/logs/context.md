# Logs de Auditoria do Sistema Context

**Gathered:** 2026-09-04
**Spec:** `.specs/features/logs/spec.md`
**Status:** Ready for design

---

## Feature Boundary

Este recurso entrega um sistema completo de auditoria e persistência de logs para ações do sistema financeiro. Ele provê a tabela `audit_logs` no PostgreSQL gerenciada via Prisma ORM, um interceptor global no NestJS para capturar todas as requisições HTTP mutativas (`POST`, `PUT`, `PATCH`, `DELETE`), um serviço de auditoria para persistência resiliente (não-bloqueante), sanitização automática e obrigatória de campos sensíveis (senhas, hashes e tokens), e endpoints REST de consulta com paginação e filtros acessíveis exclusivamente por administradores (`OWNER` e `ADMIN`) da família ou para o próprio usuário sobre suas ações.

---

## Implementation Decisions

### Abrangência da Captura
- Interceptor global no NestJS para todas as operações mutativas (`POST`, `PUT`, `PATCH`, `DELETE`).
- Captura de metadados: `userId`, `familyId`, `endpoint`, `method`, `statusCode`, `durationMs`, `ipAddress`, `userAgent`, `newData` (payload sanitizado) e timestamp de criação.
- Disponibilização de `AuditLogsService` para possibilitar registros pontuais adicionais de entidades de negócio (`entityName`, `entityId`, `action`, `oldData`, `newData`).

### Segurança e Sanitização
- Sanitização recursiva em payloads: nunca persistir campos como `password`, `token`, `refreshToken`, `passwordHash`, `secret` e números completos de cartão/CVV.
- Falhas na persistência do log são capturadas de forma resiliente em try/catch com registro em logger do NestJS, impedindo que uma oscilação na tabela de auditoria aborte a transação de negócio principal do usuário.

### Escopo da Entrega
- Foco inicial completo no Backend e Banco de Dados: modelo Prisma, migração, interceptor global, `AuditLogsModule`, endpoints de listagem e detalhes protegidos por autenticação e testes automatizados unitários e de integração. Visualização no frontend fica para história subsequente.

### Permissão e Acesso
- O endpoint `GET /audit-logs` permite visualização de logs filtrados por família para membros com papel `OWNER` ou `ADMIN`, ou logs pessoais do usuário autenticado. Membros comuns não podem visualizar logs de outros usuários.

### Agent's Discretion
- Definição exata dos índices no banco (`[userId, createdAt]`, `[familyId, createdAt]`, `[entityName, entityId]`).
- Estrutura dos tipos e enums do Prisma (`AuditAction`).

### Declined / Undiscussed Gray Areas → Assumptions
- Interface de logs no frontend: acordado manter como P2/fora do escopo desta fase MVP backend.
- Rotina de expurgo automático de logs: logs serão mantidos indefinidamente sem deleção programada no MVP para preservar histórico completo.

---

## Specific References

- Padrão arquitetural já consolidado no projeto: NestJS com guards (`JwtAuthGuard`), decoradores (`@GetUser`), Prisma ORM com `schema.prisma`.
- AD-003: Tenancy dual (Pessoal vs Família) com controle de acesso por roles (`OWNER`, `ADMIN`, `MEMBER`, `VIEWER`).

---

## Deferred Ideas

- Interface visual dedicada no frontend Next.js com filtros avançados, visualização de diff de payloads e timeline de eventos.
- Política de retenção de logs com particionamento de tabelas ou expurgo automático após 12 meses.
