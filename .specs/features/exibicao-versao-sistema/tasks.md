# Exibição da Versão do Sistema - Execution Tasks

## Test Coverage Matrix

| Requirement ID | Acceptance Criterion | Test Location | Test Type |
| -------------- | -------------------- | ------------- | --------- |
| VER-01 | Build system disponibiliza version do package.json em NEXT_PUBLIC_APP_VERSION | `frontend/next.config.js` | Build / Configuration |
| VER-02 | Frontend disponibiliza constante APP_VERSION com fallback '1.0.0' | `frontend/src/lib/version.ts` | Unit / Type Check |
| VER-03 | AppShell exibe versão formatada no rodapé da Sidebar (desktop e mobile) | `frontend/src/components/layout/AppShell.tsx` | Component / Static Analysis |
| VER-04 | Página /login exibe versão centralizada no rodapé do card | `frontend/src/app/login/page.tsx` | Component / Static Analysis |
| VER-05 | Página /register exibe versão centralizada no rodapé do card | `frontend/src/app/register/page.tsx` | Component / Static Analysis |

---

## Gate Check Commands

- Frontend Lint: `npm --prefix frontend run lint`
- Frontend Build: `npm --prefix frontend run build`
- Backend Regression: `npm --prefix backend test`

---

## Execution Plan

### Phase 1: Configuração e Camada de Domínio da Versão

Injeção da variável pública de ambiente e criação do utilitário centralizado da versão.

```
T1 -> T2
```

### Phase 2: Interface do Usuário e Telas

Exibição da versão no rodapé da barra lateral de navegação e nas telas de autenticação pública.

```
T3 -> T4 -> T5
```

---

## Task Breakdown

### Phase 1: Configuração e Camada de Domínio da Versão

#### T1: Injeção de NEXT_PUBLIC_APP_VERSION no Next.js [DONE]

**What**: Modificar `frontend/next.config.js` para importar o `package.json` e repassar o atributo `version` para o bloco `env` como `NEXT_PUBLIC_APP_VERSION`.
**Where**: `frontend/next.config.js`
**Depends on**: none
**Requirement**: VER-01
**Tests**: `npm --prefix frontend run build`
**Gate**: `npm --prefix frontend run build`

#### T2: Criação da Constante Centralizada APP_VERSION [DONE]

**What**: Criar o arquivo `frontend/src/lib/version.ts` exportando a constante `APP_VERSION` com valor derivado de `process.env.NEXT_PUBLIC_APP_VERSION` e fallback para `'1.0.0'`.
**Where**: `frontend/src/lib/version.ts`
**Depends on**: T1
**Requirement**: VER-02
**Tests**: `npm --prefix frontend run build`
**Gate**: `npm --prefix frontend run build`

---

### Phase 2: Interface do Usuário e Telas

#### T3: Exibição da Versão no Rodapé da Sidebar do AppShell [DONE]

**What**: No componente `frontend/src/components/layout/AppShell.tsx`, importar `APP_VERSION` e adicionar um divisor elegante com texto `Versão` e badge mono `v{APP_VERSION}` no rodapé da área de navegação lateral (`NavContent`), visível tanto no desktop quanto no drawer mobile.
**Where**: `frontend/src/components/layout/AppShell.tsx`
**Depends on**: T2
**Requirement**: VER-03
**Tests**: `npm --prefix frontend run build`
**Gate**: `npm --prefix frontend run build`

#### T4: Exibição da Versão no Rodapé da Tela de Login

**What**: No arquivo `frontend/src/app/login/page.tsx`, importar `APP_VERSION` e adicionar rodapé sutil centralizado no card de formulário exibindo `Finanças Familiar • v{APP_VERSION}`.
**Where**: `frontend/src/app/login/page.tsx`
**Depends on**: T3
**Requirement**: VER-04
**Tests**: `npm --prefix frontend run build`
**Gate**: `npm --prefix frontend run build`

#### T5: Exibição da Versão no Rodapé da Tela de Cadastro

**What**: No arquivo `frontend/src/app/register/page.tsx`, importar `APP_VERSION` e adicionar rodapé sutil harmonizado no card de cadastro exibindo `Finanças Familiar • v{APP_VERSION}`.
**Where**: `frontend/src/app/register/page.tsx`
**Depends on**: T4
**Requirement**: VER-05
**Tests**: `npm --prefix frontend run build`
**Gate**: `npm --prefix frontend run build`
