# Desabilitar Cadastro de Usuários via Configuração (.env) - Execution Tasks

## Test Coverage Matrix

| Requirement ID | Acceptance Criterion | Test Location | Test Type |
| -------------- | -------------------- | ------------- | --------- |
| REG-01 | Rejeitar POST /auth/register com 403 quando DISABLE_REGISTRATION=true | `backend/test/unit/auth.service.spec.ts` | Unit |
| REG-02 | Permitir POST /auth/register normalmente quando flag for false ou omitida | `backend/test/unit/auth.service.spec.ts` | Unit |
| REG-03 | Responder GET /auth/status com { registrationEnabled: boolean } | `backend/test/unit/auth.service.spec.ts` | Unit |
| REG-04 | Documentação da variável DISABLE_REGISTRATION em .env.example e compose | `.env.example` | Inspection |
| REG-05 | Ocultar link de cadastro na tela /login quando registrationEnabled for false | `frontend/src/app/login/page.tsx` | Component / Visual |
| REG-06 | Exibir alerta de indisponibilidade e bloquear formulário em /register | `frontend/src/app/register/page.tsx` | Component / Visual |
| REG-07 | Preservar fluxo habitual quando registrationEnabled for true | `frontend/src/app/register/page.tsx` | Component / Visual |

---

## Gate Check Commands

- Backend Unit Tests: `npm --prefix backend test -- test/unit/auth.service.spec.ts`
- Backend Build: `npm --prefix backend run build`
- Frontend Build: `npm --prefix frontend run build`

---

## Execution Plan

### Phase 1: Backend API e Configuração

Declaração das configurações de ambiente, bloqueio de registros desativados e disponibilização do endpoint de consulta de status.

```
T1 -> T2 -> T3
```

### Phase 2: Frontend UI e Experiência do Usuário

Integração com endpoint de status no cliente de API e adaptação das telas de Login e Registro.

```
T4 -> T5 -> T6
```

---

## Task Breakdown

### Phase 1: Backend API e Configuração

#### T1: Declaração de Variável no Ambiente e Docker [DONE]

**What**: Adicionar a variável `DISABLE_REGISTRATION=false` no arquivo `.env.example`, `.env` e mapeá-la no serviço `api` em `docker-compose.yml`.
**Where**: `.env.example`
**Depends on**: none
**Requirement**: REG-04
**Tests**: `npm --prefix backend run build`
**Gate**: `npm --prefix backend run build`

#### T2: Bloqueio de Registro no AuthService [DONE]

**What**: Implementar verificação da variável de ambiente `DISABLE_REGISTRATION` no método `register` do `AuthService`. Se configurada como verdadeira (`true`, `1`), lançar `ForbiddenException` com mensagem explicativa. Adicionar método para consulta de status.
**Where**: `backend/src/modules/auth/auth.service.ts`
**Depends on**: T1
**Requirement**: REG-01, REG-02
**Tests**: `backend/test/unit/auth.service.spec.ts`
**Gate**: `npm --prefix backend test -- test/unit/auth.service.spec.ts && npm --prefix backend run build`

#### T3: Endpoint de Status no AuthController [DONE]

**What**: Criar a rota `GET /auth/status` pública no `AuthController` retornando objeto com `{ registrationEnabled: boolean }` a partir do serviço de autenticação.
**Where**: `backend/src/modules/auth/auth.controller.ts`
**Depends on**: T2
**Requirement**: REG-03
**Tests**: `backend/test/unit/auth.service.spec.ts`
**Gate**: `npm --prefix backend test -- test/unit/auth.service.spec.ts && npm --prefix backend run build`

---

### Phase 2: Frontend UI e Experiência do Usuário

#### T4: Método de Consulta de Status no API Client [DONE]

**What**: Implementar função de consulta `getAuthStatus` no cliente de API do frontend para obter o estado de liberação de novos cadastros.
**Where**: `frontend/src/lib/api.ts`
**Depends on**: T3
**Requirement**: REG-03
**Tests**: `npm --prefix frontend run build`
**Gate**: `npm --prefix frontend run build`

#### T5: Ocultação Condicional do Link de Cadastro no Login [PENDING]

**What**: Atualizar a página de login para consultar o status de registro e ocultar a seção "Não possui uma conta? Cadastre-se gratuitamente" quando `registrationEnabled` for falso.
**Where**: `frontend/src/app/login/page.tsx`
**Depends on**: T4
**Requirement**: REG-05
**Tests**: `npm --prefix frontend run build`
**Gate**: `npm --prefix frontend run build`

#### T6: Alerta Informativo e Bloqueio na Página de Registro [PENDING]

**What**: Na página `/register`, verificar o status do cadastro. Caso esteja desabilitado, renderizar um alerta amigável informando que novos cadastros estão suspensos no momento, acompanhado de botão de retorno ao login e bloqueio do formulário.
**Where**: `frontend/src/app/register/page.tsx`
**Depends on**: T5
**Requirement**: REG-06, REG-07
**Tests**: `npm --prefix frontend run build`
**Gate**: `npm --prefix frontend run build`
