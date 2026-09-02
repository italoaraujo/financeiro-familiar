# Inicialização e Execução da Seed do Banco de Dados Specification

## Problem Statement

Ao inicializar o projeto com Docker Compose, a seed do banco de dados não era executada porque o container de produção (`financial_api`) roda em ambiente com `NODE_ENV=production`, onde dependências de desenvolvimento como `ts-node` não são instaladas. Como a instrução do entrypoint continha `npm run prisma:seed || true`, o erro `sh: ts-node: not found` era suprimido e a aplicação iniciava com o banco de dados vazio, sem o usuário administrador de demonstração (`admin@exemplo.com` / `123456`) e sem as categorias padrão essenciais do sistema.

## Goals

- [ ] Compilar o script de seed (`prisma/seed.ts`) para JavaScript nativo (`dist/prisma/seed.js`) no estágio de build do Dockerfile.
- [ ] Atualizar o comando de inicialização do container Docker para executar a seed compilada diretamente com Node (`node dist/prisma/seed.js`).
- [ ] Atualizar os scripts do `package.json` para suportar tanto execução em desenvolvimento quanto em produção.
- [ ] Executar a seed com sucesso no banco de dados ativo, garantindo a criação das 14 categorias e do usuário de demonstração com sua família associada.

## Out of Scope

Explicitly excluded. Documented to prevent scope creep.

| Feature | Reason |
| ------- | ------ |
| Alteração no modelo relacional do Prisma (`schema.prisma`) | O schema existente já atende a todos os requisitos do sistema |
| Criação de novas rotas de autenticação ou categorias adicionais | O foco é estritamente na execução correta da seed inicial já existente |
| Modificações no Frontend | O problema é restrito ao provisionamento e execução da seed no backend e Docker |

---

## Assumptions & Open Questions

Every ambiguity is resolved or recorded here - nothing is left silently unclear.

| Assumption / decision | Chosen default | Rationale | Confirmed? |
| --------------------- | -------------- | --------- | ---------- |
| Compilação do script de seed | Compilação via `tsc` no build stage gerando `dist/prisma/seed.js` | Elimina dependência de `ts-node` no container de produção sem inflar a imagem final | y |
| Idempotência do seed | Utilização de verificações `findFirst` e `findUnique` já presentes no `seed.ts` | Permite que o seed seja executado a cada inicialização sem duplicar registros | y |
| Credenciais do usuário de demonstração | `admin@exemplo.com` / `123456` com família "Família Silva" | Mantém o padrão documentado no README do projeto | y |

**Open questions:** none - all resolved or logged above (required before the spec is confirmed).

---

## User Stories

### P1: Compilação e Execução Robusta da Seed no Docker ⭐ MVP

**User Story**: As a desenvolvedor ou avaliador do projeto, I want que o container do backend execute o script de seed automaticamente ao subir so that o usuário de demonstração e as categorias estejam imediatamente disponíveis.

**Why P1**: Sem a seed, o sistema inicializa sem usuário para login e sem categorias para lançamentos financeiros.

**Acceptance Criteria**:

1. WHEN a imagem Docker do backend for construída THEN o builder SHALL compilar `prisma/seed.ts` para `dist/prisma/seed.js`.
2. WHEN o container `financial_api` for iniciado THEN o entrypoint SHALL executar `node dist/prisma/seed.js` e logar a mensagem de sucesso.
3. IF o usuário `admin@exemplo.com` já existir no banco THEN a seed SHALL manter os dados sem disparar erros de unicidade.
4. WHEN o desenvolvedor rodar `npm run prisma:seed` localmente THEN o comando SHALL executar a seed com sucesso.

**Independent Test**: Executar a compilação, rodar a seed e verificar se o banco de dados contém as 14 categorias padrão e o usuário `admin@exemplo.com`.

---

## Edge Cases

- IF o banco de dados já possuir o usuário `admin@exemplo.com` ou categorias cadastradas THEN o script de seed SHALL ignorar a recriação sem gerar exceções.
- IF a pasta `dist/prisma` não existir em tempo de compilação THEN o `tsc` SHALL criá-la automaticamente durante o build.

---

## Requirement Traceability

| Requirement ID | Story | Phase | Status |
| -------------- | ----- | ----- | ------ |
| SEED-01 | P1: Compilação e Execução Robusta da Seed no Docker | Execute | Verified |

**Coverage:** 1 total, 1 mapped to tasks, 0 unmapped

---

## Success Criteria

- [x] `backend/Dockerfile` atualizado compilando `prisma/seed.ts` e executando `node dist/prisma/seed.js`.
- [x] `backend/package.json` atualizado com script de seed compilado.
- [x] Script de seed executado com sucesso no container / banco de dados.
- [x] Usuário `admin@exemplo.com` e 14 categorias padrão confirmados no banco de dados.
