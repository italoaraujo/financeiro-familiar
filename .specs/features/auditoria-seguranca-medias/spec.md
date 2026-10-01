# Correção de Vulnerabilidades Médias de Segurança Specification

## Problem Statement

A auditoria de segurança identificou sete vulnerabilidades de severidade Média no sistema:
1. Enumeração de e-mails em convites de membros familiares (`FamiliesService.addMember`), onde mensagens de erro distintas (404 vs 400) revelam a existência de contas cadastradas.
2. BOLA em categorias privadas (`CategoriesController.findById` / `CategoriesService.findById`), permitindo consulta de categorias pessoais de terceiros sem verificação de autorização.
3. Ausência de revogação de sessão server-side no logout, mantendo tokens JWT válidos no backend após o logout no cliente.
4. Armazenamento de JWT em `localStorage` no frontend, aumentando a superfície de risco de extração por scripts maliciosos.
5. Ausência de headers defensivos HTTP (Helmet / CSP / HSTS) no backend.
6. Exposição pública da porta do PostgreSQL (`0.0.0.0:5432`) no host via Docker Compose.
7. Documentação interativa do Swagger montada indiscriminadamente em produção sem autenticação.

## Goals

- [x] Padronizar a resposta de erro na adição de membros em famílias para mensagem uniforme neutra, impedindo a enumeração de e-mails.
- [x] Exigir validação de autorização de usuário em `CategoriesService.findById`, bloqueando acesso a categorias privadas de terceiros com `HTTP 403 Forbidden`.
- [x] Implementar endpoint `POST /auth/logout` com lista de revogação de tokens (blacklist) no backend para invalidar sessões server-side.
- [x] Utilizar cookies seguros com `SameSite=Lax` e `Secure` para armazenamento de tokens no frontend.
- [x] Integrar `helmet` no bootstrap do NestJS para injetar headers defensivos de segurança em todas as respostas HTTP.
- [x] Vincular a porta do PostgreSQL exclusivamente à interface de loopback (`127.0.0.1`) no Docker Compose.
- [x] Condicionar a disponibilização do Swagger em `/api/docs` apenas para ambientes de não-produção.
- [x] Garantir cobertura de testes automatizados para todas as alterações.

## Out of Scope

Explicitly excluded. Documented to prevent scope creep.

| Feature | Reason |
| ------- | ------ |
| Sistema completo de e-mails transacionais com SMTP externo | A neutralização da enumeração e mensagens uniformes resolvem o risco imediato sem exigir provedor SMTP |
| Migração completa da arquitetura stateless JWT para sessões stateful em banco | O mecanismo de blacklist em memória com expiração preserva a escalabilidade do JWT |
| Customização avançada de diretivas CSP por rota | As políticas padrão seguras do Helmet atendem integralmente ao hardening HTTP |

---

## Assumptions & Open Questions

Every ambiguity is resolved or recorded here - nothing is left silently unclear.

| Assumption / decision | Chosen default | Rationale | Confirmed? |
| --------------------- | -------------- | --------- | ---------- |
| Mensagem uniforme de membro | "Não foi possível adicionar o membro com o e-mail informado. Verifique os dados fornecidos." | Impede que atacantes saibam se o e-mail existe no sistema ou já pertence à família | y |
| Acesso a categorias do sistema | `category.isSystemDefault === true` continua acessível por qualquer usuário autenticado | Categorias padrão são compartilhadas globalmente na aplicação | y |
| Mecanismo de blacklist de tokens | `TokenBlacklistService` em memória gerenciado no ciclo de vida do NestJS | Invalida sessões revogadas imediatamente sem adicionar latência ou dependências externas | y |
| Armazenamento de token no frontend | Cookie seguro com atributos `SameSite=Lax`, `Secure` (em prod) e `Path=/` | Protege as credenciais contra vetores comuns de extração via scripts | y |
| Ambiente de exibição do Swagger | Ativo somente se `APP_ENV !== 'production' && NODE_ENV !== 'production'` | Evita vazamento de endpoints e schemas em produção sem afetar desenvolvimento | y |
| Binding da porta do banco | `127.0.0.1:${DB_PORT:-5432}:5432` no Docker Compose | Impede que a porta seja exposta em interfaces públicas de rede (0.0.0.0) | y |

**Open questions:** none - all resolved or logged above (required before the spec is confirmed).

---

## User Stories

### P1: Prevenção de Enumeração de E-mails em Famílias (SECM-01) ⭐ MVP

**User Story**: Como usuário cadastrado, quero que terceiros não consigam descobrir se meu e-mail está cadastrado no sistema através de mensagens de erro na inclusão de membros.

**Why P1**: Impede a coleta e enumeração de dados de usuários por agentes mal-intencionados.

**Acceptance Criteria** (each line is one EARS pattern):

1. IF o e-mail informado em `addMember` não existir no sistema ou já for membro da família THEN the system SHALL retornar uma mensagem neutra uniforme com status HTTP 400 BadRequestException. <!-- unwanted-behavior -->
2. WHEN um e-mail válido for associado por um administrador THEN the system SHALL incluir o membro na família e retornar status HTTP 201 Created. <!-- event-driven -->

**Independent Test**: Tentar adicionar membro com e-mail não existente e com membro existente e validar que ambos retornam a mesma mensagem neutra sem vazar o status cadastral da conta.

---

### P2: Proteção BOLA em Categorias Privadas (SECM-02) ⭐ MVP

**User Story**: Como usuário, quero que minhas categorias personalizadas não possam ser visualizadas por outros usuários fora da minha família através de IDOR.

**Why P2**: Garante a privacidade de hábitos de consumo e estruturas orçamentárias pessoais.

**Acceptance Criteria**:

1. IF uma categoria privada de outro usuário for consultada via `GET /categories/:id` THEN the system SHALL lançar HTTP 403 Forbidden com a mensagem "Acesso negado à categoria especificada". <!-- unwanted-behavior -->
2. WHEN uma categoria padrão do sistema ou uma categoria pertencente ao usuário ou sua família for consultada THEN the system SHALL retornar os dados da categoria com status HTTP 200 OK. <!-- event-driven -->

**Independent Test**: Executar requisição `GET /categories/:id` utilizando o ID de uma categoria pertencente a outro usuário e validar o retorno de HTTP 403 Forbidden.

---

### P3: Invalidação Server-side no Logout (SECM-03) ⭐ MVP

**User Story**: Como usuário, quero que ao clicar em sair, meu token de acesso seja imediatamente invalidado no servidor para que ninguém possa reutilizá-lo.

**Why P3**: Evita sequestro de sessões pós-logout por tokens interceptados.

**Acceptance Criteria**:

1. WHEN o usuário autenticado solicitar `POST /auth/logout` THEN the system SHALL revogar o token atual adicionando-o à lista de revogação e retornar HTTP 200 OK. <!-- event-driven -->
2. IF uma requisição for enviada utilizando um token previamente revogado THEN the system SHALL rejeitar o acesso com HTTP 401 Unauthorized. <!-- unwanted-behavior -->

**Independent Test**: Executar logout com token válido e em seguida tentar acessar `/auth/me` com o mesmo token, confirmando o bloqueio com HTTP 401.

---

### P4: Armazenamento Seguro de Tokens no Cliente (SECM-04) ⭐ MVP

**User Story**: Como usuário da interface web, quero que minhas credenciais sejam manipuladas de forma segura contra scripts maliciosos.

**Why P4**: Reduz a exposição do token contra vetores comuns de XSS.

**Acceptance Criteria**:

1. WHEN o usuário realizar login ou cadastro no frontend THEN the system SHALL salvar o token de autenticação em cookies configurados com `SameSite=Lax`, `Path=/` e `Secure` em ambiente de produção. <!-- event-driven -->
2. WHEN o usuário efetuar logout THEN the system SHALL limpar os cookies de sessão de forma segura. <!-- event-driven -->

**Independent Test**: Verificar se os cookies de autenticação são gravados com as flags de proteção e limpos no logout.

---

### P5: Cabeçalhos HTTP de Segurança com Helmet (SECM-05) ⭐ MVP

**User Story**: Como gestor da infraestrutura, quero que as respostas da API incluam cabeçalhos HTTP defensivos para proteger clientes contra ataques comuns da web.

**Why P5**: Ativa defesas de navegador contra MIME sniffing, clickjacking e cross-site leaks.

**Acceptance Criteria**:

1. The system SHALL aplicar os middlewares do Helmet em todas as respostas HTTP da aplicação. <!-- ubiquitous -->
2. WHEN uma resposta HTTP for retornada pela API THEN the system SHALL conter cabeçalhos como `X-Content-Type-Options: nosniff` e `X-Frame-Options: SAMEORIGIN` ou `DENY`. <!-- event-driven -->

**Independent Test**: Executar requisição na API e verificar presença dos cabeçalhos do Helmet nos headers de resposta.

---

### P6: Restrição de Exposição da Porta do PostgreSQL (SECM-06) ⭐ MVP

**User Story**: Como administrador de infraestrutura, quero que a porta do banco de dados não seja exposta publicamente na interface de rede da máquina para evitar ataques externos diretos.

**Why P6**: Impede conexões não autorizadas ao PostgreSQL vindas de fora do host.

**Acceptance Criteria**:

1. The system SHALL vincular a porta exposta do PostgreSQL no docker-compose estritamente a `127.0.0.1` ou à rede interna dos containers. <!-- ubiquitous -->

**Independent Test**: Inspecionar o `docker-compose.yml` e verificar que a porta do serviço `postgres` está configurada como `"127.0.0.1:${DB_PORT:-5432}:5432"`.

---

### P7: Desativação do Swagger em Produção (SECM-07) ⭐ MVP

**User Story**: Como responsável pela segurança, quero que o Swagger UI seja desativado em produção para não expor a documentação interativa e contratos de dados para usuários anônimos.

**Why P7**: Elimina exposição de metadados da API em ambientes produtivos.

**Acceptance Criteria**:

1. WHILE o sistema estiver operando sob `APP_ENV=production` ou `NODE_ENV=production` the system SHALL não inicializar o SwaggerModule na rota `/api/docs`. <!-- state-driven -->
2. WHEN o sistema operar em ambiente de desenvolvimento THEN the system SHALL disponibilizar o Swagger normalmente em `/api/docs`. <!-- event-driven -->

**Independent Test**: Executar a verificação condicional em `main.ts` garantindo que a montagem do Swagger é suprimida em produção.

---

## Edge Cases

- IF um token JWT for enviado sem prefixo "Bearer " no logout THEN the system SHALL extrair a cadeia de caracteres corretamente sem lançar erro de parse.
- IF a categoria consultada for nula ou possuir `deletedAt !== null` THEN the system SHALL retornar HTTP 404 NotFoundException antes de checagens de autorização.
- IF o usuário requisitante for `VIEWER` no grupo familiar e consultar uma categoria da família THEN the system SHALL permitir a leitura normalmente com HTTP 200.

---

## Requirement Traceability

Each requirement gets a unique ID for tracking across design, tasks, and validation.

| Requirement ID | Story | Phase | Status |
| -------------- | ----- | ----- | ------ |
| SECM-01 | P1: Prevenção de Enumeração de E-mails em Famílias (SECM-01) | Tasks | Pending |
| SECM-02 | P2: Proteção BOLA em Categorias Privadas (SECM-02) | Tasks | Pending |
| SECM-03 | P3: Invalidação Server-side no Logout (SECM-03) | Tasks | Pending |
| SECM-04 | P4: Armazenamento Seguro de Tokens no Cliente (SECM-04) | Tasks | Pending |
| SECM-05 | P5: Cabeçalhos HTTP de Segurança com Helmet (SECM-05) | Tasks | Pending |
| SECM-06 | P6: Restrição de Exposição da Porta do PostgreSQL (SECM-06) | Tasks | Pending |
| SECM-07 | P7: Desativação do Swagger em Produção (SECM-07) | Tasks | Pending |

**Coverage:** 7 total, 7 mapped to tasks, 0 unmapped

---

## Success Criteria

How we know the feature is successful:

- [ ] Todas as 7 vulnerabilidades médias são neutralizadas.
- [ ] Mensagens de adição de membros são uniformes impedindo enumeração.
- [ ] `CategoriesService.findById` bloqueia IDOR em categorias privadas.
- [ ] Endpoint `/auth/logout` invalida o token e barra requisições subsequentes com HTTP 401.
- [ ] Frontend armazena tokens em cookies com flags de segurança.
- [ ] Helmet ativo e porta do PostgreSQL restrita a 127.0.0.1.
- [ ] Swagger desativado em produção.
- [ ] 100% dos testes passam.
