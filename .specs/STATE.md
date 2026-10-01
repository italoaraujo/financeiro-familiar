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
### AD-013
- **Decision**: Configurar Progressive Web App (PWA) nativo no Next.js 14 App Router através de manifesto W3C (`manifest.json`), ícones adaptativos e maskable (192, 512, apple-touch), Service Worker (`sw.js`) com estratégia Network-First para páginas e bypass estrito (Network-Only) para APIs financeiras, fallback offline amigável (`offline.html`) e componente de instalação interativa com instruções didáticas para iOS.
- **Reason**: Atende à necessidade de instalação nativa do aplicativo em celulares e desktop sem quebrar o build Docker standalone ou gerar riscos de conciliação por cache de dados financeiros.
- **Trade-off**: Requer servir assets estáticos de PWA pelo diretório `public/` e gerenciar ciclo de vida do Service Worker no cliente.
- **Scope**: Frontend Next.js, manifesto, service worker, metadados de layout e componentes de interface.
- **Date**: 2026-09-04
- **Status**: active

### AD-014
- **Decision**: Bloquear operações de mutação (criação, edição, exclusão, transferências, aportes, resgates e pagamento de faturas) para membros com papel `VIEWER` no contexto familiar no backend (`HTTP 403 ForbiddenException`) em todos os serviços (`accounts`, `credit-cards`, `transactions`, `categories`, `budgets`, `goals`), disponibilizar flag `isViewer` no `AuthContext` do frontend e ocultar elementos de ação mutativa em todas as telas com exibição de badge "Somente Leitura" no `AppShell`.
- **Reason**: Garante controle de acesso baseado em papéis (RBAC) seguro e consistente, prevenindo modificações acidentais ou não autorizadas no patrimônio familiar por usuários que possuem acesso estritamente de visualização.
- **Trade-off**: Usuários com perfil `VIEWER` necessitam que um `ADMIN` ou `OWNER` altere seu papel para `MEMBER` caso precisem realizar lançamentos no contexto familiar.
- **Scope**: Backend services e testes unitários de autorização; Frontend AuthContext, AppShell e páginas financeiras.
- **Date**: 2026-09-07
- **Status**: active

### AD-015
- **Decision**: Modelar tags financeiras usando entidade relacional `Tag` vinculada ao escopo pessoal/familiar com relação N:N explícita (`TransactionTag`) com `Transaction`. Suportar atribuição de múltiplas tags com normalização dinâmica e autocomplete no modal de lançamento, propagar automaticamente as tags para todas as parcelas de compras parceladas no cartão de crédito, exibir badges no extrato e habilitar filtros analíticos por tag em relatórios (fluxo de caixa, categorias, exportação CSV e distribuição de gastos por tag).
- **Reason**: Atende à necessidade de categorização transversal e rastreamento de projetos/eventos financeiros específicos pelo usuário, preservando a integridade referencial, isolamento de tenancy e regras de privacidade familiar.
- **Trade-off**: Requer tabela intermediária no PostgreSQL e inclusão relacional em consultas de extrato e relatórios.
- **Scope**: Prisma schema, módulo `tags`, módulo `transactions`, módulo `reports`, componentes de frontend e testes de integração.
- **Date**: 2026-09-16
- **Status**: active

### AD-016
- **Decision**: Bloquear rigorosamente vulnerabilidades de BOLA/IDOR em liquidação de faturas de cartão de crédito (`CreditCardsService.payInvoice`) e aportes em metas financeiras (`GoalsService.addDeposit`), garantindo a checagem de autorização de propriedade e contexto familiar tanto sobre a fatura/meta quanto sobre a conta bancária de débito. Eliminar segredos padrão e fallbacks estáticos de autenticação JWT, exigindo obrigatoriamente `JWT_SECRET` com entropia mínima de 256 bits (32+ caracteres) e sem termos previsíveis (`supersecret`), interrompendo a inicialização do backend com erro fatal caso a chave seja insegura.
- **Reason**: Neutraliza riscos críticos de fraude financeira entre usuários (débito arbitrário de contas bancárias de terceiros) e impede a forja irrestrita de tokens JWT para tomada de contas.
- **Trade-off**: Requer configuração obrigatória de uma chave forte `JWT_SECRET` em ambientes de execução e deploy, e rejeita qualquer operação de débito ou aporte em contas sobre as quais o usuário não possua autorização expressa.
- **Scope**: Backend `CreditCardsService`, `GoalsService`, `AuthModule`, `JwtStrategy`, `docker-compose.yml`, templates de ambiente e testes unitários.
- **Date**: 2026-09-30
- **Status**: active

### AD-017
- **Decision**: Implementar conjunto defensivo contra vulnerabilidades de severidade Alta: (1) Sanitizar todos os campos de texto exportados em CSV (`ReportsService.exportCsv`) prefixando gatilhos de fórmula (`=`, `+`, `-`, `@`, `\t`, `\r`) com apóstrofo `'` contra CSV Formula Injection; (2) Limitar o número de parcelas no DTO e serviço de transações a no máximo 72x (`@Max(72)`) contra ataques de DoS por exaustão de conexões transacionais; (3) Proteger rotas críticas de login e cadastro com `@nestjs/throttler` (limite estrito de 5 requisições por minuto) contra ataques de força bruta e enumeração; (4) Restringir origens de CORS baseadas em lista explícita (`ALLOWED_ORIGINS`) sem curinga `*` associado a `credentials: true`; (5) Bloquear vinculação indevida (BOLA) de contas pessoais a metas familiares (`GoalsService.create`), exigindo estritamente `account.familyId === dto.familyId` para metas familiares e conta pessoal exclusiva do usuário para metas pessoais.
- **Reason**: Neutraliza riscos de execução de comandos remotos via planilhas, negação de serviço, força bruta de credenciais, vazamento cruzado de CORS e manipulação cruzada de contas pessoais em metas de terceiros.
- **Trade-off**: Limita compras parceladas a 72 meses e bloqueia tráfego que exceda 5 tentativas de autenticação por minuto.
- **Scope**: Backend (`reports`, `transactions`, `auth`, `goals`), utilitários comuns, bootstrap `main.ts`, infraestrutura Docker e suíte de testes.
- **Date**: 2026-09-30
- **Status**: active

### AD-018
- **Decision**: Mitigar vulnerabilidades de severidade Média (SEC-MED-01 a SEC-MED-07): (1) Uniformizar mensagens de erro na adição de membros familiares em `FamiliesService.addMember` para resposta neutra única, eliminando enumeração de e-mails; (2) Adicionar verificação de autorização de usuário em `CategoriesService.findById`, bloqueando acesso BOLA/IDOR a categorias privadas de terceiros com `HTTP 403 Forbidden`; (3) Implementar invalidação de sessão server-side no logout via `TokenBlacklistService`, endpoint `POST /auth/logout` e verificação na `JwtStrategy`; (4) Armazenar tokens no frontend com cookies seguros contendo atributos `SameSite=Lax`, `Path=/` e `Secure` em produção; (5) Integrar `helmet` globalmente no NestJS para injeção de headers defensivos HTTP; (6) Restringir exposição da porta do PostgreSQL a `127.0.0.1` no Docker Compose; (7) Desativar documentação do Swagger condicionalmente quando `APP_ENV=production` ou `NODE_ENV=production`.
- **Reason**: Neutraliza riscos de enumeração de contas, roubo e reutilização de tokens pós-logout, BOLA em categorias personalizadas, extração de credenciais, ausência de headers HTTP de proteção, exposição do banco à internet e vazamento de schemas OpenAPI em produção.
- **Trade-off**: Requer manutenção de blacklist em memória e suprime Swagger em produção.
- **Scope**: Backend (`families`, `categories`, `auth`), frontend (`cookies.ts`, `api.ts`, `AuthContext.tsx`), infraestrutura Docker e suíte de testes.
- **Date**: 2026-10-01
- **Status**: active

### AD-019
- **Decision**: Atualizar o Next.js no frontend para a versão `16.3.8` com compilação Turbopack, saída standalone (`output: 'standalone'`) e ESLint 9 Flat Config (`eslint.config.js`), mantendo compatibilidade com React 18.3 e assegurando 100% de aprovação na suíte de testes unitários e de integração do sistema.
- **Reason**: Atende à solicitação direta de atualização do framework para Next.js 16.3.8, habilitando as mais recentes otimizações de performance e mantendo compatibilidade total com os containers Docker e testes existentes.
- **Trade-off**: Requer configuração do ESLint 9 no formato Flat Config com ajustes de tolerância a regras estritas de hooks SSR (`react-hooks/set-state-in-effect` e `react-hooks/static-components`) em componentes legados de cliente.
- **Scope**: `frontend/package.json`, `frontend/eslint.config.js`, `frontend/tsconfig.json`, build Docker standalone e validação de testes unitários.
- **Date**: 2026-10-01
- **Status**: active

## Current Execution State

- **Active Feature**: `upgrade-nextjs-16`
- **Total Tasks**: 3
- **Completed Tasks**: 3 / 3 (100%)
- **Status**: **COMPLETED & VERIFIED (PASS)**
- **Build Status**: 100% Success (215 backend tests passed, clean Turbopack build frontend)
- **Gates Verified**: `validate_spec.py` (0 errors), `validate_tasks.py` (0 errors), `validate_state.py` (0 errors)

## Handoff

- **Feature**: .specs/features/upgrade-nextjs-16
- **Phase / Task**: Concluído (T1 a T3 concluídas com sucesso)
- **Completed**: T1, T2, T3
- **In-progress**: None
- **Next step**: Homologação e merge da branch feature/upgrade-nextjs-16 na develop
- **Blockers**: none
- **Uncommitted files**: none
- **Branch**: feature/upgrade-nextjs-16
