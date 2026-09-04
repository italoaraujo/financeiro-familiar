# STATE

## Decisions

### AD-001
- **Decision**: Adopt a decoupled Monorepo structure containing NestJS backend (`/backend`), Next.js 14+ frontend (`/frontend`), and PostgreSQL managed via Docker Compose.
- **Reason**: Unifies TypeScript across client and server while maintaining clear architectural separation of concerns and streamlined local development.
- **Trade-off**: Requires managing two separate Node.js project setups in one repository instead of a single unified framework.
- **Scope**: Entire project repository structure, build pipelines, and Docker orchestration.
- **Date**: 2026-09-01
- **Status**: active

### AD-002
- **Decision**: Store all financial amounts strictly as `DECIMAL(15, 2)` in PostgreSQL via Prisma ORM.
- **Reason**: Prevents binary floating-point rounding anomalies and guarantees exact monetary calculations.
- **Trade-off**: Requires explicit casting and Decimal handling in JavaScript/TypeScript business logic.
- **Scope**: Database schema, DTOs, calculation services, and UI formatters.
- **Date**: 2026-09-01
- **Status**: active

### AD-003
- **Decision**: Implement dual-context tenancy (Personal vs. Family) with JWT authentication, Refresh Tokens, and RBAC (`OWNER`, `ADMIN`, `MEMBER`, `VIEWER`).
- **Reason**: Allows users to manage private personal records alongside shared household finances without data leakage.
- **Trade-off**: Requires explicit tenant/family boundary verification on all queries and mutations.
- **Scope**: Backend Auth and Access Guards, Prisma relational models, and Frontend context switcher.
- **Date**: 2026-09-01
- **Status**: active

### AD-004
- **Decision**: Execute multi-step financial mutations (transfers, invoice payments, balance updates) inside ACID transactions via `prisma.$transaction`.
- **Reason**: Ensures transactional consistency and atomic balance integrity across accounts and invoices.
- **Trade-off**: Slightly higher transaction lock overhead during concurrent writes.
- **Scope**: Backend transaction service and financial balance recalculation routines.
- **Date**: 2026-09-01
- **Status**: active

### AD-005
- **Decision**: Adopt responsive drawer pattern with backdrop-blur overlay, fluid grids, and adaptive overflow containers across all screens for full mobile, tablet, and desktop compatibility.
- **Reason**: Provides a smooth native-like experience on smaller viewports without compromising desktop navigation.
- **Trade-off**: Requires managing mobile navigation open/close state in UI shell.
- **Scope**: Frontend layout, components, pages, modals, and tables.
- **Date**: 2026-09-02
- **Status**: active

### AD-006
- **Decision**: Pre-compile database seed TypeScript script (`prisma/seed.ts`) to native JavaScript (`dist/prisma/seed.js`) during Docker build and execute directly via Node in container entrypoint.
- **Reason**: Prevents runtime failures in production containers where `devDependencies` (such as `ts-node`) are omitted by `npm ci` under `NODE_ENV=production`.
- **Trade-off**: Requires compiling the seed script during build phase.
- **Scope**: Backend build pipeline, Dockerfile entrypoint, and database seeding scripts.
- **Date**: 2026-09-02
- **Status**: active

### AD-007
- **Decision**: Model family individuals using a unified `Person` entity (`people`) linked to `Family`, allowing optional `userId` for members with login, and allowing non-login persons (name and color tag) for dependants. Link `Transaction` to `Person` via optional `personId` with automatic propagation across installment groups.
- **Reason**: Solves the shared credit card and family lending attribution without forcing all relatives/children to create email accounts and credentials.
- **Trade-off**: Requires maintaining synchronization between user family members and person profiles.
- **Scope**: Prisma schema, Families module, Transactions module, Credit Cards module, and Frontend UI.
- **Date**: 2026-09-02
- **Status**: active

### AD-008
- **Decision**: Alocar despesas realizadas na data de fechamento do cartão (`day >= closingDay`) diretamente na fatura do ciclo seguinte, efetuar transição automática de faturas abertas com `closingDate <= hoje` para status `CLOSED`, impedir novas despesas em faturas fechadas ou pagas e exibir todos os status em português no frontend ("Aberta", "Fechada", "Paga", "Vencida").
- **Reason**: Alinha o sistema à regra de negócio bancária brasileira de corte de fatura e resolve inconsistências de conciliação relatadas pelo usuário.
- **Trade-off**: Requer verificação ativa do status da fatura no backend e parsing seguro de datas locais para evitar desvios UTC.
### AD-009
- **Decision**: Bloquear cadastro de despesas (à vista ou parceladas) cujo valor total exceda o limite disponível do cartão de crédito selecionado (`availableLimit = creditLimit - committedAmount`), tanto no backend (lançando `BadRequestException`) quanto no frontend (desabilitando o botão de confirmação e exibindo alerta em tempo real).
- **Reason**: Evita compras acima do limite de crédito disponível e garante consistência financeira no fluxo de caixa e gestão do cartão.
- **Trade-off**: Nenhuma transação pode ultrapassar o limite concedido ao cartão de crédito.
- **Scope**: `TransactionsService` e testes unitários no backend; tela de extrato e modal de lançamentos (`/transactions`) no frontend.
- **Date**: 2026-09-03
### AD-010
- **Decision**: Adotar padrão de Soft Delete utilizando a coluna `deleted_at` (`deletedAt DateTime? @map("deleted_at") @db.Timestamptz`) nas 7 entidades de negócio (`Transaction`, `Account`, `CreditCard`, `Category`, `Goal`, `Budget`, `Person`). Todas as exclusões atualizam `deletedAt = now()`, consultas e agregações filtram explicitamente `deletedAt: null`, e o estorno de saldo em contas e faturas na exclusão de transações é preservado.
- **Reason**: Atende à solicitação explícita do usuário de não apagar registros fisicamente do banco de dados, preservando histórico para conciliação contábil e auditoria.
- **Trade-off**: Requer manutenção de cláusulas `deletedAt: null` nas consultas do backend e índices dedicados para performance.
- **Scope**: Prisma schema, migrations, backend services (`transactions`, `accounts`, `credit-cards`, `categories`, `goals`, `budgets`, `families`, `reports`), e testes.
- **Date**: 2026-09-03
- **Status**: active

### AD-011
- **Decision**: Implementar arquitetura de logs de auditoria e ações do sistema utilizando a tabela `audit_logs` no PostgreSQL via Prisma ORM, acompanhada de interceptor global assíncrono no NestJS (`AuditLogInterceptor`) para capturar requisições mutativas (`POST`, `PUT`, `PATCH`, `DELETE`) com sanitização obrigatória de dados sensíveis (`password`, `token`, etc.), serviço resiliente (`AuditLogsService`) e controle de acesso RBAC restrito a administradores de família (`OWNER`, `ADMIN`) e logs próprios.
- **Reason**: Atende à necessidade de auditoria e conformidade contábil das ações dos usuários e administradores sem prejudicar o tempo de resposta ou disponibilidade das transações financeiras.
- **Trade-off**: A gravação assíncrona não bloqueante prioriza performance e disponibilidade, capturando eventuais falhas de I/O em log sem abortar a operação de negócio principal.
- **Scope**: Prisma schema, módulo `audit-logs`, interceptor global, utilitário de sanitização e testes automatizados.
- **Date**: 2026-09-04
- **Status**: active

### AD-012
- **Decision**: Modelar Metas Financeiras como "Cofrinhos" com vínculo obrigatório a uma conta bancária de custódia (`accountId` em `Goal`), permitir aportes e resgates bidirecionais atômicos integrados ao saldo da conta bancária e bloquear estritamente a exclusão de qualquer meta que possua saldo acumulado maior que zero (`currentAmount > 0`).
- **Reason**: Garante consistência contábil real (o dinheiro está sempre custodiado em uma conta bancária conhecida), viabiliza a recuperação e uso dos recursos aportados via resgate, e elimina o risco de perda ou orfandade de saldo por exclusão indevida.
- **Trade-off**: Requer que toda meta aponte para uma conta bancária existente e exige que o usuário resgate todo o saldo antes de poder excluir a meta.
- **Scope**: Prisma schema, módulo `goals`, testes unitários e de integração no backend, e telas/modais de metas no frontend.
- **Date**: 2026-09-04
- **Status**: active

## Current Execution State

- **Active Feature**: `metas-vinculo-conta-e-resgate`
- **Total Tasks**: 8
- **Completed Tasks**: 0 / 8 (0%)
- **Status**: **READY FOR EXECUTION**
- **Gates Verified**: `validate_spec.py` (0 errors), `validate_tasks.py` (0 errors)

## Handoff

- **Feature**: .specs/features/metas-vinculo-conta-e-resgate
- **Phase / Task**: Ready to start Phase 1 (T1)
- **Completed**: None
- **In-progress**: None
- **Next step**: Criar branch `feature/metas-cofrinho-resgate` e iniciar execução de T1
- **Blockers**: none
- **Uncommitted files**: none
- **Branch**: develop

