# Correção de Vulnerabilidades de Severidade Média da Auditoria Specification

## Problem Statement

Durante a auditoria completa de segurança (AppSec/DevSecOps), foram identificadas 7 vulnerabilidades de severidade Média (`SEC-MED-01` a `SEC-MED-07`):
1. **SEC-MED-01**: Contêineres Docker executando como usuário root (`UID 0`) nos ambientes de backend e frontend.
2. **SEC-MED-02**: Execução de seed em produção com criação de usuário de demonstração padrão (`admin@exemplo.com` / `123456`) e uso incondicional de comandos de desenvolvimento no startup.
3. **SEC-MED-03**: Blacklist de revogação de tokens JWT mantida exclusivamente em memória volátil, perdendo estado em reinicializações e operando sem sincronia multi-instância.
4. **SEC-MED-04**: Credenciais padrão com fallback inseguro (`POSTGRES_PASSWORD: ${DB_PASSWORD:-postgres}`) no Docker Compose.
5. **SEC-MED-05**: Escalação de privilégios familiares permitindo que administradores criem múltiplos proprietários (`OWNER`) ou removam outros administradores sem consentimento do titular.
6. **SEC-MED-06**: Ausência de validação de tamanho máximo (`@MaxLength`) em campos de texto nos DTOs de entrada do NestJS, gerando erros HTTP 500 ao exceder colunas VarChar do banco de dados.
7. **SEC-MED-07**: Política de senhas permissiva no cadastro de usuários (`RegisterDto`), aceitando senhas de apenas 6 caracteres sem complexidade e sem limite máximo de tamanho (`@MaxLength(72)`).

## Goals

- [ ] Executar os contêineres de produção do backend e frontend com o usuário não-privilegiado `node` (`USER node`).
- [ ] Garantir que o script de seed (`seed.ts`) e o comando de inicialização nunca criem o usuário de demonstração em ambientes produtivos, adotando `production` como fallback estrito.
- [ ] Persistir os tokens JWT revogados no banco de dados através da tabela `revoked_tokens` com hash criptográfico SHA-256 e expiração, mantendo cache em memória para baixa latência.
- [ ] Forçar a obrigatoriedade de fornecimento de credenciais seguras de banco de dados no `docker-compose.yml`, eliminando senhas fracas padrão em ambientes sem `.env`.
- [ ] Bloquear a concessão direta do papel `OWNER` ao cadastrar membros de família e impedir que um `ADMIN` remova outro `ADMIN`.
- [ ] Adicionar anotações `@MaxLength()` nos DTOs de entrada do backend (`RegisterDto`, `CreateTransactionDto`, `CreateAccountDto`, `CreateCreditCardDto`, `CreateCategoryDto`, `CreateFamilyDto`, `CreatePersonDto` e respectivos DTOs de atualização), prevenindo falhas de banco e HTTP 500.
- [ ] Reforçar a validação de senhas em `RegisterDto` e na interface de registro, exigindo no mínimo 8 caracteres, no máximo 72 caracteres e requisitos de complexidade.
- [ ] Assegurar 100% de aprovação na suíte de testes unitários e de integração do backend e do frontend.

## Out of Scope

Explicitly excluded. Documented to prevent scope creep.

| Feature | Reason |
| ------- | ------ |
| Vulnerabilidades Baixas e Hardening (`SEC-LOW-01` a `SEC-LOW-05`) | Tratamento isolado em ciclo posterior de melhoria contínua |
| Migração da arquitetura para microserviços externos ou Redis distribuído | Uso de tabela no PostgreSQL para persistência de tokens revogados atende a durabilidade sem dependência de infraestrutura extra |
| Alterações de fluxos de telas não relacionadas à segurança de senhas e papéis | Foco estrito em controles de segurança e integridade de dados |

---

## Assumptions & Open Questions

Every ambiguity is resolved or recorded here - nothing is left silently unclear.

| Assumption / decision | Chosen default | Rationale | Confirmed? |
| --------------------- | -------------- | --------- | ---------- |
| Usuário do contêiner Docker | Configurar `USER node` no estágio `runner` do backend e do frontend | Reduz privilégios no sistema operacional do contêiner seguindo boas práticas CIS Docker | y |
| Criação de usuário demo no seed | Permitir criação apenas quando `APP_ENV === 'development'` explícito | Previne a criação de usuário com senha fraca padrão em staging e produção | y |
| Mecanismo de blacklist de tokens | Tabela `revoked_tokens` no PostgreSQL armazenando hash SHA-256 e `expiresAt` | Mantém os tokens revogados mesmo se o contêiner reiniciar, sem precisar expor o JWT bruto no banco | y |
| Variáveis de banco no Compose | Utilizar `${DB_USER:?DB_USER obrigatório}` e `${DB_PASSWORD:?DB_PASSWORD obrigatório}` | Impede inicialização acidental com usuário/senha padrão "postgres" | y |
| Hierarquia de membros familiares | Proibir `role: OWNER` no cadastro de novos membros e proibir `ADMIN` de remover `ADMIN` | O papel `OWNER` pertence estritamente ao criador da família e administradores não podem se canibalizar | y |
| Limite de tamanho em strings DTO | Aplicar `@MaxLength` condizente com colunas PostgreSQL (`100` para nomes, `150` para emails, `255` para descrições, etc.) | Retorna HTTP 400 amigável em vez de erro de truncamento de coluna e HTTP 500 do banco | y |
| Requisitos de senha no cadastro | Mínimo 8 caracteres, máximo 72 caracteres, contendo letras e números | Alinhado com OWASP ASVS e evita sobrecarga de CPU do algoritmo Bcrypt para entradas extensas | y |

**Open questions:** none - all resolved or logged above (required before the spec is confirmed).

---

## User Stories

### P1: Execução Segura em Contêineres sem Privilégios Root (SEC-MED-01) ⭐ MVP

**User Story**: Como engenheiro de infraestrutura e segurança, quero que as aplicações em contêiner rodem sob usuário sem privilégios (`USER node`) para mitigar o raio de impacto de vulnerabilidades de escape de contêiner ou execução remota de código.

**Why P1**: Elimina a execução com UID 0 (root) recomendada pelas diretrizes CIS Benchmark para contêineres Docker.

**Acceptance Criteria**:

1. WHEN a imagem Docker de produção do backend for construída THEN the system SHALL executar os processos sob o usuário não-root `node`. <!-- event-driven -->
2. WHEN a imagem Docker de produção do frontend for construída THEN the system SHALL executar os processos sob o usuário não-root `node`. <!-- event-driven -->
3. The system SHALL manter as permissões de leitura e execução de arquivos operacionais para o usuário `node`. <!-- ubiquitous -->

**Independent Test**: Inspecionar os Dockerfiles de backend e frontend e validar a instrução `USER node` antes do comando de inicialização.

---

### P2: Blindagem do Seed em Ambientes Produtivos (SEC-MED-02) ⭐ MVP

**User Story**: Como arquiteto de segurança da informação, quero que os dados de demonstração (usuário `admin@exemplo.com` com senha padrão) nunca sejam criados quando o sistema rodar fora de ambiente estritamente de desenvolvimento para evitar acesso indevido por credencial conhecida.

**Why P2**: Elimina o risco de backdoor ou credenciais padrão pré-configuradas em instâncias públicas.

**Acceptance Criteria**:

1. IF a variável `APP_ENV` não estiver explicitamente configurada como `development` THEN the system SHALL ignorar a criação do usuário e da família de demonstração durante a execução do seed. <!-- unwanted-behavior -->
2. WHEN o seed for executado no ambiente de desenvolvimento THEN the system SHALL criar as categorias do sistema e o usuário demo apenas se não existirem previamente. <!-- event-driven -->
3. The system SHALL utilizar `production` como fallback padrão de ambiente caso `APP_ENV` e `NODE_ENV` não sejam informados. <!-- ubiquitous -->

**Independent Test**: Executar teste unitário com `APP_ENV=production` e `APP_ENV=undefined` confirmando que a rotina de criação de usuário demo não é chamada.

---

### P3: Persistência Durável da Blacklist de Tokens JWT (SEC-MED-03) ⭐ MVP

**User Story**: Como usuário do sistema, quero que, ao efetuar logout, meu token de acesso permaneça revogado de forma durável, mesmo se o servidor da API for reiniciado ou existirem múltiplas instâncias da API, para que sessões encerradas não sejam reativadas.

**Why P3**: Evita a ressurreição de tokens revogados e garante a invalidação consistente de sessão.

**Acceptance Criteria**:

1. WHEN o usuário autenticado realizar uma requisição para `POST /auth/logout` THEN the system SHALL calcular o hash SHA-256 do token e persistir o registro de revogação no banco de dados com a data de expiração correspondente. <!-- event-driven -->
2. IF um token revogado for enviado em requisições autenticadas subsequentes THEN the system SHALL rejeitar a chamada lançando HTTP 401 UnauthorizedException informando que o token foi revogado. <!-- unwanted-behavior -->
3. WHEN a aplicação verificar um token em cache local ou no banco de dados THEN the system SHALL consultar os registros de tokens revogados e ignorar entradas já expiradas. <!-- event-driven -->

**Independent Test**: Executar logout com token JWT válido, verificar a persistência do hash e expiração no serviço de revogação, e validar a rejeição imediata com 401 Unauthorized nas tentativas posteriores de uso.

---

### P4: Eliminação de Fallback Inseguro de Credenciais no Compose (SEC-MED-04)

**User Story**: Como operador do sistema, quero que o Docker Compose exija credenciais de banco de dados explícitas e seguras para evitar que o banco de dados inicialize exposto com senhas padrão caso o arquivo `.env` não esteja configurado.

**Why P4**: Impede inicialização acidental de instâncias PostgreSQL vulneráveis a ataques de força bruta ou credenciais conhecidas.

**Acceptance Criteria**:

1. IF as variáveis `DB_USER` ou `DB_PASSWORD` não forem fornecidas no ambiente THEN the system SHALL abortar a inicialização do Docker Compose emitindo mensagem de erro de variável obrigatória. <!-- unwanted-behavior -->
2. WHEN variáveis válidas forem fornecidas no arquivo `.env` THEN the system SHALL inicializar o banco de dados e os serviços normalmente. <!-- event-driven -->

**Independent Test**: Validar que as diretivas do `docker-compose.yml` utilizam expansão com verificação de obrigatoriedade (`:?`) sem valores default inseguros.

---

### P5: Prevenção de Escalação de Privilégios em Membros de Família (SEC-MED-05) ⭐ MVP

**User Story**: Como titular e proprietário (`OWNER`) de um grupo familiar, quero ter certeza de que administradores não possam conceder a titularidade (`OWNER`) a outros membros e que administradores não possam remover outros administradores, para garantir a governança estável da família.

**Why P5**: Evita que administradores usurpem o papel de proprietário ou canibalizem outros administradores do grupo.

**Acceptance Criteria**:

1. IF uma requisição para adicionar membro contiver `role: OWNER` THEN the system SHALL rejeitar a solicitação lançando HTTP 400 BadRequestException com mensagem indicando que o papel de proprietário não pode ser atribuído via convite. <!-- unwanted-behavior -->
2. IF um usuário com papel `ADMIN` tentar remover outro membro com papel `ADMIN` que não seja ele próprio THEN the system SHALL rejeitar a operação lançando HTTP 403 ForbiddenException com a mensagem "Apenas o proprietário da família pode remover outros administradores". <!-- unwanted-behavior -->
3. WHEN o proprietário da família (`OWNER`) solicitar a remoção de qualquer administrador, membro ou visualizador THEN the system SHALL remover o membro com sucesso. <!-- event-driven -->

**Independent Test**: Testar requisições em `FamiliesService` com tentativas de cadastro com papel `OWNER` e remoção cruzada entre administradores, validando as exceções 400 e 403.

---

### P6: Validação de Tamanho Máximo (`@MaxLength`) em DTOs de Entrada (SEC-MED-06)

**User Story**: Como desenvolvedor e arquiteto de software, quero que todas as propriedades de texto recebidas nas requisições da API possuam validação de tamanho máximo (`@MaxLength`) para evitar que entradas excessivamente longas cheguem ao banco de dados e gerem erros não tratados HTTP 500.

**Why P6**: Garante validação limpa de entrada (Clean Input Validation) na camada de borda da aplicação, retornando status HTTP 400 legível.

**Acceptance Criteria**:

1. IF qualquer propriedade de texto (`name`, `email`, `description`, `color`, `icon`, `notes`) exceder o comprimento máximo suportado pelo esquema do banco de dados THEN the system SHALL rejeitar a requisição com HTTP 400 BadRequestException descrevendo o limite do campo. <!-- unwanted-behavior -->
2. WHEN os dados enviados respeitarem os comprimentos máximos permitidos THEN the system SHALL aceitar a validação e processar a requisição normalmente. <!-- event-driven -->

**Independent Test**: Testar submissão de payloads contendo valores acima do limite máximo de caracteres nos DTOs e confirmar rejeição com HTTP 400 contendo as mensagens descritivas do `class-validator`.

---

### P7: Reforço da Política de Senhas e Complexidade (SEC-MED-07) ⭐ MVP

**User Story**: Como usuário e mantenedor da plataforma, quero que o sistema exija senhas com tamanho e complexidade adequados no momento do cadastro para proteger as contas contra ataques de adivinhação, dicionário e força bruta, além de limitar o tamanho máximo para evitar ataques de exaustão de CPU.

**Why P7**: Conforma o sistema aos padrões OWASP de gestão de senhas e proteção do algoritmo Bcrypt.

**Acceptance Criteria**:

1. IF a senha fornecida no cadastro possuir menos de 8 caracteres THEN the system SHALL rejeitar a requisição com HTTP 400 BadRequestException informando o requisito mínimo de 8 caracteres. <!-- unwanted-behavior -->
2. IF a senha fornecida no cadastro exceder 72 caracteres THEN the system SHALL rejeitar a requisição com HTTP 400 BadRequestException informando o limite máximo de 72 caracteres. <!-- unwanted-behavior -->
3. IF a senha não contiver ao menos uma letra e um número THEN the system SHALL rejeitar o cadastro com HTTP 400 BadRequestException exigindo que a senha contenha letras e números. <!-- unwanted-behavior -->
4. WHEN a senha fornecida atender aos requisitos de tamanho e composição THEN the system SHALL aceitar a senha e cadastrar o usuário com sucesso. <!-- event-driven -->

**Independent Test**: Testar o cadastro com senhas com menos de 8 caracteres, com mais de 72 caracteres e sem letras ou números, validando rejeições 400, e testar com senha válida confirmando sucesso.

---

## Requirement Traceability

| Requirement ID | Story | Phase | Status |
| -------------- | ----- | ----- | ------ |
| MED-01 | P1: Execução Segura em Contêineres sem Privilégios Root | Tasks | Pending |
| MED-02 | P2: Blindagem do Seed em Ambientes Produtivos | Tasks | Pending |
| MED-03 | P3: Persistência Durável da Blacklist de Tokens JWT | Tasks | Pending |
| MED-04 | P4: Eliminação de Fallback Inseguro de Credenciais no Compose | Tasks | Pending |
| MED-05 | P5: Prevenção de Escalação de Privilégios em Membros de Família | Tasks | Complete |
| MED-06 | P6: Validação de Tamanho Máximo em DTOs de Entrada | Tasks | Pending |
| MED-07 | P7: Reforço da Política de Senhas e Complexidade | Tasks | Pending |
