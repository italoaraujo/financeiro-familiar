# Atualização do Next.js para versão 16.3.8 Specification

## Problem Statement

O frontend do sistema financeiro familiar está operando atualmente com Next.js `^14.2.35` (resolvido em 14.2.5). É necessário atualizar o framework para a versão `16.3.8`, atualizando as dependências correlatas (`eslint-config-next@16.3.8`, `eslint@^9.0.0`) e assegurando que todos os testes unitários do projeto continuem passando com 100% de sucesso, juntamente com o build de produção do frontend.

## Goals

- [ ] Atualizar o pacote `next` para a versão `16.3.8` no `frontend/package.json`.
- [ ] Atualizar `eslint-config-next` para `16.3.8` e `eslint` para `^9.0.0` para atender às peer dependencies do Next.js 16.
- [ ] Garantir que o build do frontend (`npm run build`) execute com sucesso gerando a saída standalone.
- [ ] Garantir que a suíte de testes unitários e de integração (`npm test` no backend) passe 100% (215 testes).
- [ ] Preservar as funcionalidades existentes do frontend (rotas, layouts, PWA, autenticação por cookies).

## Out of Scope

Explicitly excluded. Documented to prevent scope creep.

| Feature | Reason |
| ------- | ------ |
| Migração para React 19 | Next.js 16 suporta React 18 e 19; manter React 18.3 previne breaking changes em bibliotecas de terceiros como recharts |
| Refatoração de componentes de interface ou novas telas | O objetivo é puramente a atualização de versão e garantia de testes |
| Alterações na API backend | A atualização afeta exclusivamente o framework frontend e validação global |

---

## Assumptions & Open Questions

Every ambiguity is resolved or recorded here - nothing is left silently unclear.

| Assumption / decision | Chosen default | Rationale | Confirmed? |
| --------------------- | -------------- | --------- | ---------- |
| Versão de ESLint | `eslint@^9.0.0` com `eslint-config-next@16.3.8` | `eslint-config-next@16.3.8` declara peer dependency estrita de `eslint@>=9.0.0` | y |
| Manutenção do React 18 | `react@^18.3.1` e `react-dom@^18.3.1` | Next 16 suporta `^18.2.0` como peerDependency oficial e garante estabilidade das dependências de UI | y |
| Validação de testes unitários | Suíte completa de 215 testes unitários e de integração no backend | O monorepo concentra testes automatizados no backend e valida integridade via build/lint no frontend | y |
| Compatibilidade Docker | `frontend/Dockerfile` permanece funcional com build standalone | A configuração `output: 'standalone'` em `next.config.js` é suportada nativamente no Next 16 | y |

**Open questions:** none - all resolved or logged above (required before the spec is confirmed).

---

## User Stories

### P1: Atualização do Next.js para 16.3.8 com Testes Validados (UPG-01) ⭐ MVP

**User Story**: Como desenvolvedor e mantenedor do sistema, quero atualizar o Next.js para a versão 16.3.8 com todas as dependências compatíveis para que o frontend utilize a versão mais moderna com segurança e estabilidade comprovada por testes.

**Why P1**: Atualização central solicitada pelo usuário com critério de aceite estrito de aprovação em todos os testes unitários.

**Acceptance Criteria** (each line is one EARS pattern):

1. WHEN as dependências do frontend forem instaladas THEN the system SHALL configurar o pacote `next` na versão `16.3.8` e `eslint-config-next` na versão `16.3.8` no `package.json`. <!-- event-driven -->
2. WHEN o comando `npm run build` for executado no diretório frontend THEN the system SHALL compilar todas as páginas e rotas sem erros gerando os artefatos de produção. <!-- event-driven -->
3. WHEN o comando `npm test` for executado no diretório backend THEN the system SHALL executar todos os 215 testes unitários e de integração com 100% de sucesso. <!-- event-driven -->
4. IF houver incompatibilidade de tipagem TypeScript ou erro de compilação THEN the system SHALL falhar o build e reportar o erro detalhado no log de saída. <!-- unwanted-behavior -->
5. The system SHALL manter a configuração de saída standalone no arquivo `next.config.js` para suporte ao container Docker. <!-- ubiquitous -->

**Independent Test**: Executar `npm run build` no frontend para verificar compilação do Next.js 16.3.8 e em seguida executar `npm test` no backend para validar que todos os testes passam.

---

## Edge Cases

- IF houver conflito de peer dependencies no npm install THEN the system SHALL resolver as versões exatas de ESLint 9 sem recorrer a flags inseguras.
- IF o ESLint 9 exigir flat config ou formato atualizado THEN the system SHALL manter o linting funcional sem quebrar o build.
- WHEN o Next.js 16 inicializar THEN the system SHALL carregar corretamente as rotas do App Router existentes (`/`, `/login`, `/register`, `/accounts`, `/cards`, `/transactions`, `/budgets`, `/goals`, `/reports`, `/family`).

---

## Requirement Traceability

Each requirement gets a unique ID for tracking across design, tasks, and validation.

| Requirement ID | Story | Phase | Status |
| -------------- | ----- | ----- | ------ |
| UPG-01 | P1: Atualização do Next.js para 16.3.8 com Testes Validados | Execute | Verified |
| UPG-02 | P1: Compilação e Build do Frontend | Execute | Verified |
| UPG-03 | P1: Validação de Testes Unitários | Execute | Verified |

**Coverage:** 3 total, 3 mapped to tasks, 0 unmapped

---

## Success Criteria

How we know the feature is successful:

- [x] Pacote `next` atualizado para `16.3.8` no `frontend/package.json` e `package-lock.json`.
- [x] Build de produção (`npm run build` no frontend) executado com sucesso e zero erros.
- [x] 215 testes unitários e de integração do backend executados com 100% de sucesso (`npm test`).
