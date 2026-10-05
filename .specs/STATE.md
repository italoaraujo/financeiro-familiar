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

### AD-020
- **Decision**: Persistir data e horário de transações financeiras utilizando `@db.Timestamptz` no Prisma e PostgreSQL, permitindo campo opcional `transactionTime` (formato `HH:mm`) nos DTOs e modal de lançamento, com fallback padrão de 12:00:00 para lançamentos sem horário e data igual ao dia de fechamento do cartão de crédito (com horário 00:00:00) para parcelas futuras subsequentes.
- **Reason**: Permite aos usuários registrar a hora exata dos lançamentos e garante ordenação cronológica precisa dentro do mesmo dia no extrato, atribuindo parcelas futuras ao dia de fechamento da respectiva fatura do cartão.
- **Trade-off**: Requer manipulação cuidadosa de horas e minutos em DTOs, cálculo de dias válidos no mês de fechamento, parsing e formatação no frontend.
- **Scope**: `backend/prisma/schema.prisma`, DTOs de transação e transferência, `TransactionsService`, formatters e modal/tabela do frontend.
- **Date**: 2026-10-02
- **Status**: active

### AD-021
- **Decision**: Mitigar as 3 vulnerabilidades críticas identificadas na auditoria de segurança de software: (1) Eliminar race condition no resgate de metas (`GoalsService.withdraw`) movendo a verificação de saldo para dentro da transação Prisma e aplicando decremento atômico `{ currentAmount: { decrement: withdrawAmount } }`; (2) Bloquear transferências bancárias (`TransactionsService.transfer`) cujo montante exceda o saldo disponível da conta de origem (`source.currentBalance >= amount`), retornando `BadRequestException`; (3) Bloquear BOLA/IDOR universal em categorias (`TransactionsService.create` e `BudgetsService.create`), validando que a categoria informada exista e pertença legitimamente ao escopo pessoal do usuário, familiar ou seja padrão do sistema (`isSystemDefault`).
- **Reason**: Neutraliza riscos de duplicação de crédito bancário por requisições concorrentes (double-spend), impede geração de crédito sem lastro via saldo negativo e assegura a estrita segregação multitenant entre contas individuais e familiares.
- **Trade-off**: Requer validação relacional síncrona de categorias e restringe transferências exclusivamente a contas com fundos disponíveis.
- **Scope**: `backend/src/modules/goals/goals.service.ts`, `backend/src/modules/transactions/transactions.service.ts`, `backend/src/modules/budgets/budgets.service.ts` e suíte de testes unitários.
- **Date**: 2026-10-02
- **Status**: active

### AD-022
- **Decision**: Mitigar as 5 vulnerabilidades de severidade Alta (`SEC-HIGH-01` a `SEC-HIGH-05`) catalogadas na auditoria de segurança: (1) Validar `accountId` em cartões de crédito (`CreditCardsService.create` e `update`) garantindo pertinência ao titular ou à mesma família; (2) Validar `parentId` em subcategorias (`CategoriesService.create` e `update`) impedindo vinculação a categorias privadas de terceiros e rejeitando auto-referência cíclica; (3) Bloquear exclusão de transações em faturas fechadas (`CLOSED`) ou pagas (`PAID`) em `TransactionsService.remove`; (4) Vincular mapeamento de portas de serviços no `docker-compose.yml` estritamente a `127.0.0.1`; (5) Aplicar remediação de dependências com CVEs no backend e frontend via `npm audit fix` e overrides seguros.
- **Reason**: Elimina vetores de BOLA/IDOR em cartões e categorias, protege a integridade contábil de períodos encerrados, previne bypass de proxy reverso e reduz a superfície de ataque em bibliotecas de terceiros.
- **Trade-off**: Requer verificações relacionais adicionais em banco e impede edições retroativas em períodos já consolidados.
- **Scope**: `CreditCardsService`, `CategoriesService`, `TransactionsService`, `docker-compose.yml`, `backend/package.json`, `frontend/package.json` e testes unitários.
- **Date**: 2026-10-02
### AD-023
- **Decision**: Mitigar as 7 vulnerabilidades de severidade Média (`SEC-MED-01` a `SEC-MED-07`) catalogadas na auditoria de segurança de software:
  1. Configurar usuário sem privilégios `USER node` com `COPY --chown=node:node` nos Dockerfiles de produção do backend e frontend (`SEC-MED-01`).
  2. Adotar fallback estrito para ambiente `production` em `seed.ts` e condicionar a criação de usuário de demonstração exclusivamente a `APP_ENV === 'development'`, evitando execução cega de seed no contêiner (`SEC-MED-02`).
  3. Criar o modelo `RevokedToken` no schema Prisma e atualizar `TokenBlacklistService` para persistir hashes SHA-256 de tokens revogados de forma durável no PostgreSQL, mantendo cache em memória para baixa latência e compatibilidade multi-instância (`SEC-MED-03`).
  4. Eliminar fallbacks com credenciais fracas padrão (`:-postgres`) no `docker-compose.yml`, exigindo variáveis obrigatórias via `${DB_USER:?...}` e `${DB_PASSWORD:?...}` (`SEC-MED-04`).
  5. Bloquear a atribuição de papel `OWNER` a novos membros de famílias e impedir que um `ADMIN` remova outro `ADMIN`, preservando a soberania do proprietário (`SEC-MED-05`).
  6. Adicionar anotações `@MaxLength()` nos campos de texto de entrada em todos os DTOs do NestJS condizentes com as restrições VarChar do PostgreSQL, eliminando erros não tratados HTTP 500 (`SEC-MED-06`).
  7. Reforçar os requisitos de senha em `RegisterDto` e na tela de registro do frontend, exigindo tamanho mínimo de 8 caracteres, máximo de 72 caracteres e composição com letras e números (`SEC-MED-07`).
- **Reason**: Neutraliza vetores de escalação de privilégios, impede ressuscitação de tokens revogados após restart de contêineres, elimina senhas fracas padrão, fecha brechas de negação de serviço por exceções HTTP 500 e melhora a postura de conformidade com OWASP ASVS e CIS Docker.
- **Trade-off**: Requer persistência adicional de tokens revogados no banco e impõe regras mais estritas de tamanho e caracteres na entrada de dados.
- **Scope**: Dockerfiles, `seed.ts`, `schema.prisma`, `TokenBlacklistService`, `docker-compose.yml`, `FamiliesService`, DTOs de entrada e página de registro do frontend.
- **Date**: 2026-10-03
- **Status**: active

### AD-024
- **Decision**: Mitigar as 5 vulnerabilidades de severidade Baixa e Hardening (`SEC-LOW-01` a `SEC-LOW-05`) catalogadas na auditoria de segurança de software:
  1. Configurar cabeçalhos HTTP defensivos e `Content-Security-Policy` no Next.js Turbopack via `headers()` em `frontend/next.config.js` (`SEC-LOW-01`).
  2. Reforçar cookies de autenticação do cliente com o atributo `SameSite=Strict` e flag `Secure` condicional em conexões HTTPS no utilitário `frontend/src/lib/cookies.ts` (`SEC-LOW-02`).
  3. Proteger o log de auditoria contra spoofing de IP, habilitando `trust proxy` no Express (`backend/src/main.ts`), sanitizando múltiplos endereços de proxy reverso e truncando a string em 45 caracteres em `AuditLogInterceptor` (`SEC-LOW-03`).
  4. Configurar cotas defensivas de recursos (`deploy.resources.limits`) com `cpus: '1.0'` e `memory: 1024M` para todos os serviços (`postgres`, `api`, `frontend`) no `docker-compose.yml`, prevenindo ataques de DoS por exaustão de hardware (`SEC-LOW-04`).
  5. Elaborar o guia operacional de segurança `docs/SECURITY_SECRETS_GUIDE.md` com instruções detalhadas para geração de entropia, procedimentos de rotação periódica de `JWT_SECRET` e senhas do PostgreSQL, boas práticas de prevenção contra vazamentos no Git e higienização de ambientes (`SEC-LOW-05`).
- **Reason**: Reduz a superfície de ataque no navegador, neutraliza falsificações de endereço IP em trilhas de auditoria para conformidade com LGPD/PCI-DSS, previne exaustão de recursos computacionais por DoS no host e estabelece governança formal do ciclo de vida de credenciais de produção.
- **Trade-off**: Restringe compartilhamento de cookies estritamente à mesma origem (`SameSite=Strict`) e impõe limites rígidos de memória por contêiner.
- **Scope**: `frontend/next.config.js`, `frontend/src/lib/cookies.ts`, `backend/src/main.ts`, `backend/src/common/interceptors/audit-log.interceptor.ts`, `docker-compose.yml`, `docs/SECURITY_SECRETS_GUIDE.md` e suíte de testes.
- **Date**: 2026-10-03
- **Status**: active

### AD-025
- **Decision**: Fortalecer a política de senhas no cadastro de novos usuários aplicando 8 regras determinísticas de validação em camadas (Backend via DTO e Frontend em tempo real): (1) Comprimento mínimo de 8 caracteres (máximo de 128); (2) Pelo menos 1 letra maiúscula; (3) Pelo menos 1 letra minúscula; (4) Pelo menos 1 número; (5) Pelo menos 1 caractere especial; (6) Proibição estrita de espaços; (7) Proibição de igualdade com usuário/e-mail (e-mail completo, username do e-mail e nome cadastrado, case-insensitive); (8) Bloqueio de senhas conhecidas em lista estática de senhas fracas e recorrentes.
- **Reason**: Atende aos requisitos explícitos do usuário e aos padrões de segurança recomendados por OWASP e NIST para prevenção contra ataques de dicionário, força bruta e credential stuffing.
- **Trade-off**: Requer maior esforço de criação de senha por novos usuários, mitigado por um checklist visual dinâmico com feedback em tempo real na tela de registro.
- **Scope**: `backend/src/common/utils/password-rules.util.ts`, `backend/src/modules/auth/dto/register.dto.ts`, `backend/test/unit/register-dto.spec.ts`, `frontend/src/lib/password-rules.ts` e `frontend/src/app/register/page.tsx`.
- **Date**: 2026-10-03
### AD-026
- **Decision**: Prevenir zoom automático indevido ("Focus Zoom") no iOS Safari (iPhone) e navegadores baseados em WebKit configurando via CSS global (`frontend/src/app/globals.css`) que todos os campos de texto (`input:not([type="checkbox"]):not([type="radio"]):not([type="range"]):not([type="color"])`), `select` e `textarea` possuam `font-size: 16px !important` em viewports com largura até 768px (`@media screen and (max-width: 768px)`), e aplicando `touch-action: manipulation` para elementos interativos. Preservar `maximumScale: 5` no viewport de `frontend/src/app/layout.tsx` para garantir conformidade estrita com acessibilidade WCAG.
- **Reason**: No iOS WebKit, qualquer campo de formulário com tamanho de fonte inferior a 16px dispara zoom in involuntário ao focar, quebrando a renderização responsiva, cortando o viewport e prejudicando o uso em smartphones. A regra global protege todo o sistema e futuros componentes sem depender de estilização manual pontual e sem desativar a escala de acessibilidade para usuários com baixa visão.
- **Trade-off**: Aumenta sutilmente o tamanho de fonte dos campos no mobile para 16px, em total harmonia com as diretrizes da Apple (Human Interface Guidelines).
- **Scope**: `frontend/src/app/globals.css`, `frontend/src/app/layout.tsx`, formulários e componentes interativos.
- **Date**: 2026-10-04
- **Status**: active

### AD-027
- **Decision**: Implementar autenticação biométrica nativa no PWA (Android e iOS) através do padrão internacional WebAuthn / Passkeys (FIDO2) utilizando `@simplewebauthn/server` no NestJS e `@simplewebauthn/browser` no Next.js 14, armazenando credenciais públicas na tabela `user_passkeys` e desafios temporários na tabela `auth_challenges` com TTL de 5 minutos, garantindo prevenção a ataques de replay via monotonic counter e fallback contínuo para login por senha.
- **Reason**: Atende à solicitação direta do usuário para login biométrico quando o app estiver instalado no celular, garantindo experiência de usuário idêntica a apps nativos e preservando estritamente a privacidade (a biometria física nunca sai do chip seguro do dispositivo).
- **Trade-off**: Requer persistência de credenciais públicas e verificação de hardware de plataforma no cliente via `isUserVerifyingPlatformAuthenticatorAvailable()`.
- **Scope**: Backend (`schema.prisma`, `PasskeyService`, `PasskeyController`, `AuthModule`), Frontend (`useBiometrics`, `/login`, `BiometricsSettingsModal`, `AppShell`), migrations e testes unitários.
- **Date**: 2026-10-05
- **Status**: active

## Current Execution State

- **Active Feature**: `biometria-passkeys`
- **Total Tasks**: 11
- **Completed Tasks**: 2 / 11 (18%)
- **Status**: **IN_PROGRESS**
- **Build Status**: Schema Prisma validado com modelos UserPasskey e AuthChallenge
- **Gates Verified**: `validate_spec.py` (0 errors), `validate_tasks.py` (0 errors)

## Handoff

- **Feature**: .specs/features/biometria-passkeys
- **Phase / Task**: Phase 1 / T3
- **Completed**: T1 (Instalar @simplewebauthn/server no backend), T2 (Adicionar modelos UserPasskey e AuthChallenge no Prisma schema)
- **In-progress**: T3 (Aplicar migration e gerar client Prisma)
- **Next step**: Executar T3 (migration e prisma generate)
- **Blockers**: none
- **Uncommitted files**: backend/prisma/schema.prisma, .specs/*
- **Branch**: feature/biometria-passkeys
