# Encerramento de Sessão ao Fechar Navegador - Execution Tasks

## Test Coverage Matrix

| Requirement ID | Acceptance Criterion | Test Location | Test Type |
| -------------- | -------------------- | ------------- | --------- |
| SESS-01 | Armazenar financial_token como Session Cookie sem Expires e sem Max-Age | `frontend/src/lib/cookies.ts` | Unit / Static Analysis |
| SESS-02 | Não gravar financial_token nem credenciais no localStorage | `frontend/src/context/AuthContext.tsx` | Unit / Static Analysis |
| SESS-03 | Limpar chave residual financial_token do localStorage no bootstrap | `frontend/src/context/AuthContext.tsx` | Component / Integration |
| SESS-04 | Deslogar e redirecionar para login após fechar e reabrir navegador | `frontend/src/context/AuthContext.tsx` | E2E / Manual Verification |
| SESS-05 | Limpar cookies e storage no logout ou HTTP 401 | `frontend/src/lib/api.ts` | Unit / Integration |
| SESS-06 | Reconhecer Session Cookie ativo ao abrir novas abas no mesmo navegador | `frontend/src/context/AuthContext.tsx` | Integration / Manual |
| SESS-07 | Hidratar perfil via GET /auth/me quando cookie presente sem cache local | `frontend/src/context/AuthContext.tsx` | Integration / API |
| SESS-08 | Manter contexto familiar ativo durante a navegação da sessão | `frontend/src/context/AuthContext.tsx` | Component / Integration |

---

## Gate Check Commands

- Frontend Lint: `npm --prefix frontend run lint`
- Frontend Build: `npm --prefix frontend run build`
- Backend Regression Tests: `npm --prefix backend test`

---

## Execution Plan

### Phase 1: Utilitários de Cookies e Camada de Rede

Configuração de Session Cookies sem cabeçalho de expiração persistente e atualização do cliente de requisições HTTP.

```
T1 -> T2
```

### Phase 2: Contexto de Autenticação e Hidratação de Sessão

Eliminação de tokens no localStorage, limpeza defensiva de chaves legadas e hidratação automática multi-abas.

```
T3 -> T4
```

---

## Task Breakdown

### Phase 1: Utilitários de Cookies e Camada de Rede

#### T1: Atualização de Cookies para Session Cookies sem Expiração Fixa [DONE]

**What**: Modificar a função `setAuthCookie` em `frontend/src/lib/cookies.ts` para que, por padrão, não adicione atributos `expires` ou `max-age`, gerando cookies do tipo Session Cookie (que são descartados pelo navegador quando este é fechado). Manter atributos de segurança `SameSite=Strict`, `path=/` e `Secure` (em HTTPS).
**Where**: `frontend/src/lib/cookies.ts`
**Depends on**: none
**Requirement**: SESS-01
**Tests**: `npm --prefix frontend run build`
**Gate**: `npm --prefix frontend run build`

#### T2: Adequação do Cliente HTTP apiRequest [DONE]

**What**: Atualizar `frontend/src/lib/api.ts` para que o token seja lido do cookie de sessão `financial_token` sem recorrer ao `localStorage`. Na interceptação de status HTTP 401, garantir a limpeza completa de cookies e chaves de sessão residuais antes de redirecionar para `/login`.
**Where**: `frontend/src/lib/api.ts`
**Depends on**: T1
**Requirement**: SESS-05
**Tests**: `npm --prefix frontend run build`
**Gate**: `npm --prefix frontend run build`

---

### Phase 2: Contexto de Autenticação e Hidratação de Sessão

#### T3: Remoção de Persistência em LocalStorage e Limpeza Defensiva [DONE]

**What**: No `AuthContext.tsx`, remover qualquer gravação de `financial_token` em `localStorage`. No hook de inicialização (`useEffect`), adicionar limpeza defensiva de chaves legadas (`financial_token`, `financial_user`) em `localStorage` e mover o armazenamento temporário de dados do usuário e família para `sessionStorage`.
**Where**: `frontend/src/context/AuthContext.tsx`
**Depends on**: T2
**Requirement**: SESS-02, SESS-03
**Tests**: `npm --prefix frontend run build`
**Gate**: `npm --prefix frontend run build`

#### T4: Hidratação Automática Multi-Abas e Validação Final [DONE]

**What**: No `AuthContext.tsx`, implementar a lógica de hidratação resiliente: caso o cookie de sessão `financial_token` esteja presente mas o usuário não esteja no `sessionStorage` (ex: nova aba aberta pelo usuário), consultar `GET /auth/me` para restaurar o estado da sessão e papéis familiares. Validar build e suíte de testes.
**Where**: `frontend/src/context/AuthContext.tsx`
**Depends on**: T3
**Requirement**: SESS-04, SESS-06, SESS-07, SESS-08
**Tests**: `npm --prefix frontend run build && npm --prefix backend test`
**Gate**: `npm --prefix frontend run build && npm --prefix backend test`
