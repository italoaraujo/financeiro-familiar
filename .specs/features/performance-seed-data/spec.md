# Performance Seed Data Specification

## Problem Statement

Para avaliar o desempenho do sistema financeiro sob carga real (consultas, relatórios analíticos, paginação de transações, filtros por pessoa/categoria/período e dashboard), é necessário dispor de um volume substancial e realista de dados no banco de dados sem poluir ou sobrescrever os dados de demonstração padrão.

## Goals

- [ ] Disponibilizar script de seed de alta performance (`backend/prisma/seed-perf.ts` ou script npm) capaz de inserir entre 20.000 e 50.000 transações em lotes (`createMany`).
- [ ] Criar um usuário (`perf@exemplo.com`) e família dedicados ("Família Performance") com múltiplas contas, cartões de crédito, faturas mensais, pessoas, metas, orçamentos e transações coerentes distribuídas nos últimos 24 meses.
- [ ] Garantir idempotência ou capacidade de execução segura sem apagar ou corromper dados de outros usuários/famílias já existentes.

## Out of Scope

Explicitly excluded. Documented to prevent scope creep.

| Feature | Reason |
| ------- | ------ |
| Alteração de schema do banco ou migrações DDL | O schema atual já atende todos os relacionamentos necessários. |
| Teste de estresse com ferramentas externas (K6, JMeter) nesta etapa | O foco deste comando/tarefa é a geração e inserção da massa de dados no banco PostgreSQL. |
| Remoção ou alteração de dados do usuário admin demo | O usuário `admin@exemplo.com` e seus dados devem ser mantidos intactos. |

---

## Assumptions & Open Questions

Every ambiguity is resolved or recorded here - nothing is left silently unclear.

| Assumption / decision | Chosen default | Rationale | Confirmed? |
| --------------------- | -------------- | --------- | ---------- |
| Volume alvo de transações | 30.000 transações | Faixa acordada de 20.000 a 50.000, oferecendo teste de carga significativo em queries analíticas sem consumo excessivo de disco local | y |
| Usuário e família dedicados | `perf@exemplo.com` / "Família Performance" | Isolamento completo para testes de desempenho sem afetar a conta demo admin | y |
| Estratégia de inserção | Chunks de até 5.000 registros com `prisma.transaction.createMany` | Evita limite de 65.535 parâmetros bind do PostgreSQL e otimiza tempo de execução para poucos segundos | y |
| Distribuição temporal | Últimos 24 meses (datas entre 2 anos atrás e a data corrente) | Permite testar agregações mensais, relatórios anuais e tendências históricas do dashboard | y |
| Tratamento de dados existentes | Preservação total de dados pré-existentes; limpeza apenas de dados de `perf@exemplo.com` se reexecutado | Permite reexecutar o seed de performance limpando apenas a família de teste se o usuário desejar resetar | y |

**Open questions:** none - all resolved or logged above (required before the spec is confirmed).

---

## User Stories

### P1: Geração de Carga de Dados em Lote ⭐ MVP

**User Story**: Como desenvolvedor/testador, quero executar um comando de seed de performance para que o banco seja populado com dezenas de milhares de registros inter-relacionados de forma rápida.

**Why P1**: É a capacidade central solicitada pelo usuário para permitir testes de carga e desempenho na base de dados.

**Acceptance Criteria** (each line is one EARS pattern):

1. WHEN o comando de seed de performance for executado THEN the system SHALL criar ou reutilizar o usuário `perf@exemplo.com` com senha criptografada válida (`123456`) e sua respectiva família "Família Performance".
2. WHEN a família de performance for provisionada THEN the system SHALL criar múltiplas contas bancárias, cartões de crédito e membros/pessoas vinculadas à família.
3. WHEN as entidades base estiverem criadas THEN the system SHALL gerar faturas mensais para os últimos 24 meses para os cartões de crédito criados.
4. WHEN o gerador de transações for executado THEN the system SHALL inserir pelo menos 30.000 transações válidas distribuídas nos últimos 24 meses utilizando inserção em lotes (`createMany`).
5. IF houver falha de validação ou restrição de chave estrangeira durante a inserção THEN the system SHALL abortar a operação com log claro do erro sem corromper dados de outras famílias.
6. The system SHALL manter inalterados quaisquer registros pertencentes a outros usuários e famílias pré-existentes no banco de dados.

**Independent Test**: Executar o script de seed de performance via terminal (`npm run prisma:seed:perf`), verificar a contagem de transações (`>= 30000`) para a família de teste e comprovar que o usuário admin demo permanece com seus dados íntegros.

---

### P2: Automação e Facilidade de Execução

**User Story**: Como desenvolvedor, quero disparar o seed por um comando simples no `package.json` e ter métricas de tempo e contagem exibidas no terminal para que eu acompanhe o progresso.

**Why P2**: Melhora a usabilidade para repetição dos testes de performance e validação de índices futuros.

**Acceptance Criteria**:

1. WHEN o script for iniciado THEN the system SHALL exibir logs informativos detalhando cada etapa da carga (usuário, contas, faturas, lotes de transações e tempo decorrido).
2. WHEN o script finalizar THEN the system SHALL exibir o resumo total de registros criados por tabela e o tempo total de execução em segundos.

**Independent Test**: Rodar o script e observar a saída com os tempos e totais de cada entidade criada.

---

## Edge Cases

- IF o usuário `perf@exemplo.com` já existir THEN the system SHALL permitir limpar apenas os registros vinculados à família de performance antes de reinserir, evitando violação de chave única.
- IF o volume de transações for grande THEN the system SHALL particionar as inserções em lotes (ex: 5.000 registros por batch) para prevenir estouro de memória no Node.js ou limite de parâmetros do Postgres.

---

## Requirement Traceability

| Requirement ID | Story | Phase | Status |
| -------------- | ----- | ----- | ------ |
| SEED-01 | P1: Geração de Carga de Dados em Lote | Tasks | Pending |
| SEED-02 | P1: Geração de Carga de Dados em Lote | Tasks | Pending |
| SEED-03 | P1: Geração de Carga de Dados em Lote | Tasks | Pending |
| SEED-04 | P1: Geração de Carga de Dados em Lote | Tasks | Pending |
| SEED-05 | P1: Geração de Carga de Dados em Lote | Tasks | Pending |
| SEED-06 | P1: Geração de Carga de Dados em Lote | Tasks | Pending |
| SEED-07 | P2: Automação e Facilidade de Execução | Tasks | Pending |
| SEED-08 | P2: Automação e Facilidade de Execução | Tasks | Pending |

**ID format:** `[CATEGORY]-[NUMBER]`

**Status values:** Pending → In Design → In Tasks → Implementing → Verified

**Coverage:** 8 total, 8 mapped to tasks, 0 unmapped ⚠️

---

## Success Criteria

- [ ] Pelo menos 30.000 transações criadas e persistidas no PostgreSQL para a família de teste.
- [ ] Tempo total de inserção inferior a 30 segundos usando inserção em batch.
- [ ] Login do usuário `perf@exemplo.com` funcional no sistema com todos os dashboards e relatórios renderizando dados históricos.
