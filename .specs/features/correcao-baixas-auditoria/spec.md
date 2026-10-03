# Correção de Vulnerabilidades Baixas e Hardening da Auditoria Specification

## Problem Statement

Durante a auditoria completa de segurança (AppSec/DevSecOps), foram identificadas 5 oportunidades de hardening e vulnerabilidades de severidade Baixa (`SEC-LOW-01` a `SEC-LOW-05`):
1. **SEC-LOW-01**: Ausência de cabeçalhos HTTP defensivos e CSP no frontend Next.js (`frontend/next.config.js`).
2. **SEC-LOW-02**: Armazenamento de token com cookies permissivos (`SameSite=Lax`) e ausência de padronização estrita de segurança no cliente.
3. **SEC-LOW-03**: Potencial spoofing de endereço IP no interceptor de logs de auditoria (`AuditLogInterceptor`) por leitura ingênua do cabeçalho `x-forwarded-for` sem `trust proxy` configurado no Express.
4. **SEC-LOW-04**: Ausência de limites de recursos de CPU e memória (`deploy.resources.limits`) para os contêineres no `docker-compose.yml`, permitindo esgotamento de recursos do host em caso de sobrecarga.
5. **SEC-LOW-05**: Presença de credenciais/chaves fracas de exemplo em histórico e documentação, necessitando reforço em políticas documentadas de rotação de segredos e higienização de `.env.example`.

## Goals

- [ ] Configurar cabeçalhos de segurança defensivos (`X-Frame-Options: DENY`, `X-Content-Type-Options: nosniff`, `Referrer-Policy: strict-origin-when-cross-origin`, `Permissions-Policy`, e `Content-Security-Policy`) no `frontend/next.config.js`.
- [ ] Reforçar a segurança dos cookies de autenticação no frontend utilizando atributo `SameSite=Strict` e flag `Secure` condicional em conexões HTTPS.
- [ ] Habilitar `trust proxy` no NestJS/Express e sanitizar a extração de endereço IP no `AuditLogInterceptor`, prevenindo spoofing de log e truncando para 45 caracteres.
- [ ] Definir limites estritos de recursos de memória e CPU para todos os serviços no `docker-compose.yml`.
- [ ] Documentar o guia oficial de rotação e gerenciamento de segredos criptográficos no repositório.
- [ ] Garantir 100% de aprovação na suíte de testes e processo de compilação do backend e frontend.

## Out of Scope

Explicitly excluded. Documented to prevent scope creep.

| Feature | Reason |
| ------- | ------ |
| Refatoração de autenticação para cookies HTTP-Only exclusivos de backend | Requereria reestruturação completa da arquitetura Next.js standalone SPA/SSR desacoplada |
| Alteração de rotas de negócio ou layouts visuais do usuário | Escopo estritamente voltado a cabeçalhos de segurança, infraestrutura e hardening |
| Reescrita de histórico git com ferramentas destrutivas (git filter-repo/BFG) | Risco de quebra de hashes e perda de rastreabilidade para colaboradores externos |

---

## Assumptions & Open Questions

Every ambiguity is resolved or recorded here - nothing is left silently unclear.

| Assumption / decision | Chosen default | Rationale | Confirmed? |
| --------------------- | -------------- | --------- | ---------- |
| Headers de segurança no Next.js | Injetar via `async headers()` no `next.config.js` em todas as rotas `/(.*)` | Aplica defesa em profundidade em todas as páginas e assets estáticos | y |
| Política de cookies no cliente | Utilizar `SameSite=Strict` com `path=/` e flag `Secure` em HTTPS | Previne ataques CSRF mantendo o funcionamento do token entre requisições | y |
| Resolução de IP no interceptor | Habilitar `app.set('trust proxy', 1)` no NestJS e priorizar `request.ip` | Previne manipulação de IP por cabeçalhos forjados por atacantes externos | y |
| Limites de recursos no Compose | Definir limite de 1024MB de memória e 1 CPU por serviço | Previne que um contêiner monopolize a memória RAM ou CPU do host | y |
| Documentação de rotação de segredos | Registrar manual de rotação de chaves e variáveis sensíveis | Garante conformidade com DevSecOps e orienta deploys seguros | y |

**Open questions:** none - all resolved or logged above (required before the spec is confirmed).

---

## User Stories

### P1: Configuração de Cabeçalhos HTTP Defensivos no Next.js (SEC-LOW-01) ⭐ MVP

**User Story**: Como usuário da aplicação web, quero que todas as respostas HTTP do frontend incluam cabeçalhos de proteção (como CSP, X-Frame-Options e X-Content-Type-Options) para que meu navegador bloqueie ativamente ataques de clickjacking, injeção de scripts e MIME confusion.

**Why P1**: Aplica defesa em profundidade recomendada pelo OWASP Secure Headers Project.

**Acceptance Criteria**:

1. WHEN o frontend Next.js responder a qualquer requisição HTTP THEN the system SHALL incluir os cabeçalhos `X-Frame-Options: DENY`, `X-Content-Type-Options: nosniff`, `Referrer-Policy: strict-origin-when-cross-origin` e `Permissions-Policy`. <!-- event-driven -->
2. WHEN o frontend renderizar páginas HTML THEN the system SHALL aplicar a diretiva `Content-Security-Policy` restringindo as origens de scripts, estilos, conexões e fontes autorizadas. <!-- event-driven -->
3. The system SHALL manter a compatibilidade com Next.js Turbopack e React DOM em ambiente de produção. <!-- ubiquitous -->

**Independent Test**: Inspecionar `frontend/next.config.js` e validar que a função `headers()` retorna os cabeçalhos defensivos para a rota coringa `/(.*)`.

---

### P2: Reforço de Atributos de Segurança nos Cookies de Sessão (SEC-LOW-02) ⭐ MVP

**User Story**: Como desenvolvedor frontend, quero que os cookies de autenticação emitidos no cliente utilizem o atributo `SameSite=Strict` e flag `Secure` condicional em conexões HTTPS para mitigar riscos de vazamento em requisições cross-site.

**Why P2**: Protege as credenciais e tokens transitados contra ataques de Cross-Site Request Forgery (CSRF).

**Acceptance Criteria**:

1. WHEN um cookie de autenticação for registrado via `setAuthCookie` THEN the system SHALL configurar o atributo `SameSite=Strict`. <!-- event-driven -->
2. IF a conexão atual utilizar o protocolo HTTPS THEN the system SHALL incluir a flag `Secure` no cookie gravado. <!-- event-driven -->
3. WHEN o usuário efetuar logout THEN the system SHALL remover o cookie com os mesmos atributos de proteção. <!-- event-driven -->

**Independent Test**: Testar funções utilitárias em `frontend/src/lib/cookies.ts` validando a inclusão de `SameSite=Strict` e a flag `Secure` correspondente.

---

### P3: Proteção contra Spoofing de IP no Interceptor de Auditoria (SEC-LOW-03) ⭐ MVP

**User Story**: Como oficial de conformidade e segurança, quero que o endereço IP registrado na trilha de auditoria seja extraído de forma confiável (utilizando `trust proxy` configurado no servidor e sanitização de múltiplos IPs) para garantir que a rastreabilidade forense não seja fraudada por cabeçalhos falsificados.

**Why P3**: Assegura a integridade do log de auditoria em conformidade com PCI-DSS e LGPD.

**Acceptance Criteria**:

1. WHEN a aplicação NestJS for inicializada THEN the system SHALL habilitar `trust proxy` na instância Express subjacente. <!-- event-driven -->
2. WHEN uma requisição for interceptada por `AuditLogInterceptor` THEN the system SHALL priorizar `request.ip` ou extrair o primeiro endereço IP sanitizado da cadeia de proxy reverso. <!-- event-driven -->
3. IF o endereço IP detectado exceder 45 caracteres THEN the system SHALL truncar o valor para no máximo 45 caracteres respeitando o limite do banco de dados. <!-- unwanted-behavior -->

**Independent Test**: Executar requisições no interceptor simulando diferentes formatos de cabeçalhos e verificar que o IP registrado corresponde ao endereço confiável sanitizado.

---

### P4: Definição de Limites de Recursos no Docker Compose (SEC-LOW-04)

**User Story**: Como administrador de sistemas, quero que os serviços de banco de dados, API e frontend possuam limites de consumo de memória e CPU configurados no Compose para evitar que falhas ou sobrecargas derrubem o servidor hospedeiro.

**Why P4**: Impede ataques de negação de serviço por exaustão de recursos computacionais (CWE-770).

**Acceptance Criteria**:

1. WHEN os serviços forem declarados no `docker-compose.yml` THEN the system SHALL definir limites de memória (`memory: 1024M`) e CPU (`cpus: '1.0'`) para cada contêiner. <!-- event-driven -->
2. The system SHALL manter a inicialização estável dos contêineres sem ultrapassar os limites computacionais configurados. <!-- ubiquitous -->

**Independent Test**: Validar que as diretivas `deploy.resources.limits` estão presentes para todos os serviços no `docker-compose.yml`.

---

### P5: Guia de Rotação de Segredos e Hardening de Credenciais (SEC-LOW-05)

**User Story**: Como arquiteto DevSecOps, quero um guia documentado no repositório com instruções para rotação de chaves JWT, segredos de banco de dados e higienização de ambientes de produção para mitigar o risco de uso de credenciais históricas.

**Why P5**: Conforma o projeto com as melhores práticas de gerenciamento do ciclo de vida de segredos criptográficos.

**Acceptance Criteria**:

1. The system SHALL disponibilizar documentação de segurança com passo a passo para rotação segura de segredos em produção. <!-- ubiquitous -->
2. The system SHALL assegurar que segredos de exemplo em arquivos `.env.example` sejam puramente ilustrativos e inválidos para uso real. <!-- ubiquitous -->

**Independent Test**: Inspecionar o documento de orientações de segurança e validar os passos de rotação de segredos.

---

## Requirement Traceability

| Requirement ID | Story | Phase | Status |
| -------------- | ----- | ----- | ------ |
| LOW-01 | P1: Configuração de Cabeçalhos HTTP Defensivos no Next.js | Tasks | Complete |
| LOW-02 | P2: Reforço de Atributos de Segurança nos Cookies de Sessão | Tasks | Complete |
| LOW-03 | P3: Proteção contra Spoofing de IP no Interceptor de Auditoria | Tasks | Pending |
| LOW-04 | P4: Definição de Limites de Recursos no Docker Compose | Tasks | Pending |
| LOW-05 | P5: Guia de Rotação de Segredos e Hardening de Credenciais | Tasks | Pending |
