# Exibição da Versão do Sistema Specification

## Problem Statement

Atualmente, os usuários e administradores do sistema não possuem uma indicação visual da versão da aplicação em execução nas telas. Isso dificulta a identificação rápida da versão deployed, a verificação de atualizações recentes e o reporte preciso de problemas em suporte ou homologação. É necessário exibir a versão da aplicação de forma discreta, elegante e padronizada no rodapé do menu lateral (Sidebar do AppShell para usuários autenticados) e nas páginas de autenticação (Login e Registro para usuários não autenticados), sincronizada automaticamente com o `package.json` do frontend.

## Goals

- [ ] Injetar dinamicamente a versão da aplicação a partir do `package.json` do frontend através da configuração do Next.js (`next.config.js`).
- [ ] Centralizar o acesso e fallback da versão em constante reutilizável (`APP_VERSION`).
- [ ] Exibir a versão no rodapé da Sidebar do `AppShell`, visível tanto no desktop quanto no drawer mobile.
- [ ] Exibir a versão no rodapé das telas públicas de Login e Cadastro de usuários.
- [ ] Manter fidelidade visual com o design system existente (dark mode, tipografia mono discreta e espaçamentos harmônicos).

## Out of Scope

Explicitly excluded. Documented to prevent scope creep.

| Feature | Reason |
| ------- | ------ |
| Sistema dinâmico de changelog / notas de atualização via popup | O escopo restringe-se à indicação visual estática da versão atual do sistema |
| Endpoint dedicado na API backend exclusivamente para versão | A versão do frontend é estática no build standalone do Next.js via package.json |
| Integração com release tags do GitHub em runtime | A resolução em build time garante isolamento sem chamadas externas ou overhead de rede |

---

## Assumptions & Open Questions

Every ambiguity is resolved or recorded here - nothing is left silently unclear.

| Assumption / decision | Chosen default | Rationale | Confirmed? |
| --------------------- | -------------- | --------- | ---------- |
| Localização da exibição | Rodapé da Sidebar (AppShell) e rodapé das telas de Login e Cadastro | Escolha explícita do usuário em alinhamento de requisitos, garantindo visibilidade para usuários autenticados e deslogados | y |
| Fonte de verdade da versão | `package.json` do frontend via `env: { NEXT_PUBLIC_APP_VERSION: pkg.version }` no `next.config.js` | Atualizações de versão no `package.json` refletem imediatamente no build sem manutenção manual de strings duplicadas | y |
| Formato de exibição visual | Rótulo discreto com prefixo `v` (ex: `v1.0.0`) com tipografia mono | Padrão da indústria de software, limpo e não intrusivo para a experiência do usuário | y |

**Open questions:** none - all resolved or logged above (required before the spec is confirmed).

---

## User Stories

### P1: Injeção da Versão e Exibição no Menu Lateral (AppShell) ⭐ MVP

**User Story**: As a usuário autenticado do sistema financeiro, I want visualizar a versão atual do sistema no menu lateral so that eu saiba exatamente qual release da aplicação estou utilizando.

**Why P1**: Atende diretamente à demanda do usuário, cobrindo todas as telas principais do sistema (Dashboard, Extrato, Contas, Cartões, Metas, Orçamentos, Relatórios e Família) em desktop e mobile.

**Acceptance Criteria**:

1. The build system SHALL carregar o atributo `version` do arquivo `package.json` do frontend e disponibilizá-lo via variável de ambiente pública `NEXT_PUBLIC_APP_VERSION`.
2. The frontend SHALL disponibilizar a constante `APP_VERSION` com fallback resiliente para `'1.0.0'`.
3. WHILE o usuário estiver autenticado em qualquer tela que utilize o `AppShell`, the `AppShell` SHALL exibir a versão do sistema com formato `vX.Y.Z` na seção de rodapé da barra lateral de navegação.

**Independent Test**: Iniciar a aplicação autenticada, navegar entre rotas e verificar a exibição legível de `v1.0.0` no rodapé da Sidebar no desktop e no drawer mobile.

---

### P2: Exibição da Versão nas Telas de Autenticação (Login e Cadastro)

**User Story**: As a usuário não autenticado ou administrador acessando a aplicação, I want ver a versão do sistema na tela de login e de cadastro so that eu consiga identificar a versão antes mesmo de efetuar autenticação.

**Why P2**: Complementa a visibilidade da versão em cenários pré-login e em dispositivos móveis ou novos acessos.

**Acceptance Criteria**:

1. WHILE a página de login (`/login`) for renderizada, the frontend SHALL exibir a versão do sistema no rodapé da área de autenticação.
2. WHILE a página de cadastro (`/register`) for renderizada, the frontend SHALL exibir a versão do sistema no rodapé da área de autenticação.

**Independent Test**: Acessar `/login` e `/register` sem autenticação e verificar a presença de `v1.0.0` centralizada no rodapé dos cards de formulário.

---

## Edge Cases

- IF a variável de ambiente `NEXT_PUBLIC_APP_VERSION` não estiver definida em tempo de execução THEN the frontend SHALL utilizar `'1.0.0'` como fallback seguro.
- IF a tela for visualizada em viewport mobile reduzido THEN the frontend SHALL manter o texto da versão legível sem quebra de layout ou rolagem horizontal.

---

## Requirement Traceability

Each requirement gets a unique ID for tracking across design, tasks, and validation.

| Requirement ID | Story | Phase | Status |
| -------------- | ----- | ----- | ------ |
| VER-01 | P1: Injeção da Versão e Exibição no Menu Lateral (AppShell) | Phase 1 | Implemented |
| VER-02 | P1: Injeção da Versão e Exibição no Menu Lateral (AppShell) | Phase 1 | Implemented |
| VER-03 | P1: Injeção da Versão e Exibição no Menu Lateral (AppShell) | Phase 1 | Pending |
| VER-04 | P2: Exibição da Versão nas Telas de Autenticação (Login e Cadastro) | Phase 2 | Pending |
| VER-05 | P2: Exibição da Versão nas Telas de Autenticação (Login e Cadastro) | Phase 2 | Pending |
