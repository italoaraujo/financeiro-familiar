# Desabilitar Cadastro de Usuários via Configuração (.env) Specification

## Problem Statement

Atualmente, qualquer pessoa que acessar a aplicação pode criar uma nova conta através da rota `/register` ou via requisição direta para `POST /auth/register`. Em ambientes corporativos, de uso estritamente familiar fechado ou em instâncias self-hosted privadas, o administrador necessita restringir o sistema para impedir que novos usuários se cadastrem sem autorização, mantendo o acesso apenas para usuários já existentes ou previamente criados.

## Goals

- [ ] Permitir habilitar/desabilitar o cadastro público de novos usuários via variável de ambiente (`DISABLE_REGISTRATION=true` ou `false`).
- [ ] Bloquear tentativas de cadastro via API no backend retornando HTTP 403 Forbidden com mensagem amigável quando a funcionalidade estiver desativada.
- [ ] Fornecer endpoint público de status de autenticação/configuração para que o frontend consulte se novos registros são permitidos em tempo de execução sem requerer novo build.
- [ ] Ocultar o link de cadastro na tela de login quando o registro estiver desabilitado.
- [ ] Apresentar alerta informativo e desabilitar formulário na página `/register` caso seja acessada diretamente com o cadastro desativado.

## Out of Scope

Explicitly excluded. Documented to prevent scope creep.

| Feature | Reason |
| ------- | ------ |
| Sistema de convites por e-mail com token temporário | Requer infraestrutura de mensageria/SMTP não presente no escopo atual desta flag simples |
| Painel administrativo de gerenciamento de flags via banco de dados | A configuração solicitada é declarativa em nível de infraestrutura/deploy (.env) |
| Bloqueio ou desativação de login de usuários já existentes | O login de usuários cadastrados continua funcionando normalmente |

---

## Assumptions & Open Questions

Every ambiguity is resolved or recorded here - nothing is left silently unclear.

| Assumption / decision | Chosen default | Rationale | Confirmed? |
| --------------------- | -------------- | --------- | ---------- |
| Nome e valor padrão da variável de ambiente | `DISABLE_REGISTRATION=false` (padrão) | Mantém compatibilidade total com instalações existentes onde o cadastro é livre por padrão | y |
| Resposta da API ao tentar registrar com flag ativa | HTTP 403 Forbidden com mensagem "O cadastro de novos usuários está desativado pelo administrador" | Código semântico correto para operação proibida por política do sistema | y |
| Consulta de status pelo Frontend | Endpoint `GET /auth/status` retornando `{ registrationEnabled: boolean }` | Permite ao frontend reagir dinamicamente à variável do backend sem rebuild de container Docker | y |
| Acesso direto à rota `/register` com flag desativada | Exibir card com aviso visual e botão para voltar ao Login | Evita confusão do usuário ao tentar preencher um formulário que falhará no envio | y |
| Exibição do link na tela `/login` | Ocultar o bloco "Não possui uma conta? Cadastre-se" quando desabilitado | Interface limpa e sem indução ao erro | y |

**Open questions:** none - all resolved or logged above (required before the spec is confirmed).

---

## User Stories

### P1: Bloqueio no Backend e Endpoint de Consulta ⭐ MVP

**User Story**: As an administrador do sistema, I want configurar a variável `DISABLE_REGISTRATION=true` no `.env` so that requisições de cadastro sejam bloqueadas e clientes autorizados possam consultar o status do recurso.

**Why P1**: Garante a segurança e a integridade da política de acesso do sistema diretamente na camada de autoridade (API).

**Acceptance Criteria**:

1. WHERE a variável `DISABLE_REGISTRATION` estiver configurada como `true` THEN the backend SHALL rejeitar requisições em `POST /auth/register` com status 403 Forbidden e mensagem "O cadastro de novos usuários está desativado pelo administrador".
2. WHERE a variável `DISABLE_REGISTRATION` for omitida ou configurada como `false` THEN the backend SHALL processar o registro normalmente com status 201 Created.
3. WHEN uma requisição `GET /auth/status` for recebida THEN the backend SHALL responder com status 200 OK contendo `{ registrationEnabled: boolean }` refletindo o estado da configuração.
4. The backend SHALL documentar a variável `DISABLE_REGISTRATION` no arquivo `.env.example` e repassá-la no `docker-compose.yml`.

**Independent Test**: Definir `DISABLE_REGISTRATION=true`, disparar `POST /auth/register` e confirmar retorno 403. Disparar `GET /auth/status` e confirmar `{ registrationEnabled: false }`.

---

### P2: Experiência Visual no Frontend (Login e Registro)

**User Story**: As a visitante ou usuário do sistema, I want que as telas de login e cadastro reflitam se o sistema aceita novos registros so that eu não perca tempo tentando me cadastrar quando a criação de contas estiver fechada.

**Why P2**: Melhora a usabilidade, transparência e experiência do usuário final.

**Acceptance Criteria**:

1. WHEN a tela `/login` for carregada E `registrationEnabled` for `false` THEN the frontend SHALL ocultar a opção "Não possui uma conta? Cadastre-se gratuitamente".
2. WHEN a tela `/register` for acessada diretamente E `registrationEnabled` for `false` THEN the frontend SHALL exibir um alerta de indisponibilidade de cadastro com link de retorno ao login e manter o formulário desabilitado.
3. WHILE `registrationEnabled` for `true` the frontend SHALL manter o fluxo normal de exibição de links e permitir submissão do formulário de registro.

**Independent Test**: Acessar `/login` e `/register` com a flag ativada no backend e validar que o link some em `/login` e um aviso impeditivo amigável é exibido em `/register`.

---

## Edge Cases

- IF `DISABLE_REGISTRATION` contiver valores com espaços ou letras maiúsculas como `"True "` ou `"1"` THEN the backend SHALL interpretar como verdadeiro para desabilitar o cadastro.
- IF a chamada `GET /auth/status` falhar no frontend por instabilidade de rede THEN the frontend SHALL adotar fallback seguro sem quebrar a tela de login.

---

## Requirement Traceability

Each requirement gets a unique ID for tracking across design, tasks, and validation.

| Requirement ID | Story | Phase | Status |
| -------------- | ----- | ----- | ------ |
| REG-01 | P1: Bloqueio no Backend e Endpoint de Consulta | Tasks | Verified |
| REG-02 | P1: Bloqueio no Backend e Endpoint de Consulta | Tasks | Verified |
| REG-03 | P1: Bloqueio no Backend e Endpoint de Consulta | Tasks | Verified |
| REG-04 | P1: Bloqueio no Backend e Endpoint de Consulta | Tasks | Verified |
| REG-05 | P2: Experiência Visual no Frontend (Login e Registro) | Tasks | Verified |
| REG-06 | P2: Experiência Visual no Frontend (Login e Registro) | Specify | Pending |
| REG-07 | P2: Experiência Visual no Frontend (Login e Registro) | Specify | Pending |

**ID format:** `REG-[NUMBER]`

**Status values:** Pending → In Design → In Tasks → Implementing → Verified

**Coverage:** 7 total, 0 mapped to tasks, 7 unmapped

---

## Success Criteria

- [ ] Definir `DISABLE_REGISTRATION=true` impede qualquer cadastro via API com HTTP 403 Forbidden.
- [ ] Definir `DISABLE_REGISTRATION=false` (ou omitir) permite cadastro normalmente.
- [ ] Endpoint `GET /auth/status` retorna o estado do registro.
- [ ] Frontend oculta link de registro no Login e avisa na rota `/register`.
- [ ] Todos os testes unitários do backend passam com 100% de sucesso.
