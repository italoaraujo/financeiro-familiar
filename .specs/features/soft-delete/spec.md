# Soft Delete com deleted_at Specification

## Problem Statement

Atualmente, quando um usuário exclui qualquer registro no sistema (transações financeiras, contas, cartões de crédito, categorias, metas, orçamentos ou pessoas), o backend executa uma exclusão física direta (`DELETE` via SQL) no PostgreSQL. Isso provoca a perda irreversível do histórico para fins de auditoria, conciliação e rastreabilidade contábil, além de arriscar integridade referencial em dados históricos. É necessário implementar o padrão de exclusão lógica (soft delete) persistindo a data e hora do descarte na coluna `deleted_at`, mantendo o registro preservado no banco de dados e ignorando registros deletados em consultas, cálculos e relatórios.

## Goals

- [ ] Adicionar a coluna `deleted_at` (`DateTime?`) nas 7 entidades principais de negócio: `Transaction`, `Account`, `CreditCard`, `Category`, `Goal`, `Budget` e `Person`.
- [ ] Substituir todas as operações de exclusão física (`DELETE`) dessas entidades por exclusão lógica (atualização de `deleted_at` com o timestamp atual).
- [ ] Garantir que exclusões lógicas de transações mantenham o estorno financeiro de saldo de conta ou fatura de cartão de crédito.
- [ ] Assegurar que todas as consultas de listagem, busca individual, relatórios, métricas de dashboard e agregações excluam registros com `deleted_at IS NOT NULL`.
- [ ] Atualizar as validações de integridade (como checagem de transações vinculadas a contas e categorias) para considerar exclusivamente transações ativas (`deleted_at IS NULL`).
- [ ] Manter 100% de compatibilidade com a interface existente sem necessidade de alterações na experiência visual do usuário.

## Out of Scope

Explicitly excluded. Documented to prevent scope creep.

| Feature | Reason |
| ------- | ------ |
| Interface de lixeira ou visualização de registros deletados na UI | O objetivo desta fase é integridade e auditoria no banco de dados; a interface oculta itens excluídos |
| Endpoint ou botão de restauração (desfazer exclusão) no frontend | Escopo reservado para versão futura de gestão de lixeira |
| Soft delete em tabelas de autenticação e infraestrutura (`User`, `Family`, `FamilyMember`) | Mantém a lógica de acesso e ciclo de vida de contas de usuário inalterada nesta fase |
| Rotinas automatizadas de expurgo físico permanente (Hard delete agendado) | O histórico deve ser preservado indefinidamente para conciliação contábil |

---

## Assumptions & Open Questions

Every ambiguity is resolved or recorded here - nothing is left silently unclear.

| Assumption / decision | Chosen default | Rationale | Confirmed? |
| --------------------- | -------------- | --------- | ---------- |
| Entidades abrangidas | `Transaction`, `Account`, `CreditCard`, `Category`, `Goal`, `Budget`, `Person` | Cobre todas as entidades de negócio sujeitas a exclusão pelo usuário | y |
| Formato e tipo do campo no banco | Coluna `deleted_at` mapeada no Prisma como `deletedAt DateTime? @map("deleted_at") @db.Timestamptz` | Padrão relacional PostgreSQL e convenção estabelecida no schema do projeto | y |
| Estorno de saldo na exclusão de transação | Manter a reversão de saldo em contas e abatimento em faturas ao efetuar soft delete | Garante a exatidão financeira do patrimônio e evita distorções contábeis | y |
| Filtro padrão em queries | Filtrar explicitamente `deletedAt: null` em leituras e agregações das entidades afetadas | Garante que registros excluídos fiquem invisíveis aos usuários | y |
| Validação de vínculos ativos | Validar dependências verificando apenas registros com `deletedAt: null` | Permite excluir categorias ou contas cujas transações associadas já foram soft-deleted | y |
| Interface de usuário (Frontend) | Manter o comportamento visual idêntico: item excluído desaparece da tela após confirmação | Evita retrabalho na interface e atende à expectativa do usuário | y |

**Open questions:** none - all resolved or logged above (required before the spec is confirmed).

---

## User Stories

### P1: Exclusão Lógica e Estorno de Transações com deleted_at ⭐ MVP

**User Story**: As a usuário do sistema financeiro, I want que minhas transações excluídas não sejam apagadas fisicamente do banco de dados e sim marcadas com `deleted_at` so that o histórico contábil seja preservado e o saldo continue sendo estornado corretamente.

**Why P1**: Transações são o coração do sistema financeiro. Garantir exclusão lógica sem quebrar os estornos de saldo é fundamental para a integridade dos dados da aplicação.

**Acceptance Criteria**:

1. WHEN o usuário solicitar a exclusão de uma transação THEN o sistema SHALL preencher o campo `deleted_at` com o timestamp corrente em vez de remover o registro da tabela.
2. WHEN uma transação for marcada com `deleted_at` THEN o sistema SHALL executar o estorno do valor na conta bancária ou fatura de cartão de crédito associada.
3. WHEN uma consulta de listagem de transações for executada THEN o sistema SHALL retornar apenas transações cujo `deleted_at` seja nulo.
4. WHEN o cálculo de saldo de contas ou totais de despesas do dashboard for executado THEN o sistema SHALL desconsiderar transações cujo `deleted_at` não seja nulo.
5. IF o usuário tentar buscar diretamente por ID uma transação com `deleted_at` preenchido THEN o sistema SHALL responder com erro de registro não encontrado (`404 Not Found`).
6. The system SHALL armazenar o campo `deleted_at` como `Timestamptz` no banco de dados PostgreSQL.

**Independent Test**: Criar uma despesa de R$ 50,00 vinculada a uma conta. Verificar saldo debitado. Excluir a transação via API/UI. Verificar que o registro permanece no banco com `deleted_at` preenchido, o saldo da conta foi estornado (+R$ 50,00) e a transação não aparece mais na listagem.

---

### P2: Exclusão Lógica das Entidades de Cadastro e Suporte

**User Story**: As a usuário do sistema financeiro, I want que contas, cartões de crédito, categorias, metas, orçamentos e pessoas também utilizem `deleted_at` na exclusão so that meus cadastros históricos não sejam perdidos e a integridade referencial do sistema seja mantida.

**Why P2**: Complementa o padrão de exclusão lógica em todo o domínio financeiro, evitando erros de chave estrangeira e possibilitando rastreabilidade completa.

**Acceptance Criteria**:

1. WHEN o usuário solicitar a exclusão de uma conta, cartão de crédito, categoria, meta, orçamento ou pessoa THEN o sistema SHALL registrar o timestamp corrente em `deleted_at` sem remover fisicamente o registro.
2. WHEN qualquer consulta de listagem ou detalhe dessas entidades for solicitada THEN o sistema SHALL retornar apenas registros cujo `deleted_at` seja nulo.
3. IF o usuário solicitar a exclusão de uma categoria ou conta que possua transações ativas (`deleted_at` nulo) THEN o sistema SHALL rejeitar a exclusão mantendo o bloqueio de segurança.
4. WHEN uma categoria ou conta possuir apenas transações que já estejam marcadas com `deleted_at` THEN o sistema SHALL permitir a exclusão lógica da entidade com sucesso.
5. IF o usuário tentar acessar por ID uma entidade com `deleted_at` preenchido THEN o sistema SHALL responder com erro de registro não encontrado (`404 Not Found`).

**Independent Test**: Criar uma categoria. Vincular uma transação a ela e depois excluir a transação. Excluir a categoria e verificar que a categoria recebe `deleted_at` preenchido e deixa de aparecer na listagem de categorias.

---

## Edge Cases

- IF uma transação for do tipo transferência entre contas e for excluída logicamente THEN o sistema SHALL estornar o saldo em ambas as contas (origem e destino) e preencher `deleted_at` na transação.
- IF uma transação de cartão de crédito for parcelada e for excluída logicamente THEN o sistema SHALL abater o valor total da fatura correspondente e preencher `deleted_at`.
- IF uma pessoa for excluída com soft delete THEN o sistema SHALL preservar o `person_id` nas transações existentes para manter a atribuição histórica inalterada.
- IF ocorrer falha no meio do processo de exclusão de transação e estorno THEN o sistema SHALL realizar rollback atômico via transação do banco de dados (`prisma.$transaction`).

---

## Requirement Traceability

Each requirement gets a unique ID for tracking across design, tasks, and validation.

| Requirement ID | Story | Phase | Status |
| -------------- | ----- | ----- | ------ |
| SOFTDEL-01 | P1: Exclusão Lógica e Estorno de Transações com deleted_at | Tasks | Implementing |
| SOFTDEL-02 | P1: Exclusão Lógica e Estorno de Transações com deleted_at | Tasks | Implementing |
| SOFTDEL-03 | P1: Exclusão Lógica e Estorno de Transações com deleted_at | Tasks | Implementing |
| SOFTDEL-04 | P1: Exclusão Lógica e Estorno de Transações com deleted_at | Tasks | Implementing |
| SOFTDEL-05 | P1: Exclusão Lógica e Estorno de Transações com deleted_at | Tasks | Implementing |
| SOFTDEL-06 | P1: Exclusão Lógica e Estorno de Transações com deleted_at | Tasks | Implementing |
| SOFTDEL-07 | P2: Exclusão Lógica das Entidades de Cadastro e Suporte | Tasks | Pending |
| SOFTDEL-08 | P2: Exclusão Lógica das Entidades de Cadastro e Suporte | Tasks | Pending |
| SOFTDEL-09 | P2: Exclusão Lógica das Entidades de Cadastro e Suporte | Tasks | Pending |
| SOFTDEL-10 | P2: Exclusão Lógica das Entidades de Cadastro e Suporte | Tasks | Pending |
| SOFTDEL-11 | P2: Exclusão Lógica das Entidades de Cadastro e Suporte | Tasks | Pending |

**ID format:** `SOFTDEL-[NUMBER]`

**Status values:** Pending → In Design → In Tasks → Implementing → Verified

**Coverage:** 11 total, 11 mapped to stories, 0 unmapped

---

## Success Criteria

- [ ] Todas as 7 entidades de negócio (`Transaction`, `Account`, `CreditCard`, `Category`, `Goal`, `Budget`, `Person`) possuem o campo `deleted_at` persistido no banco de dados.
- [ ] Exclusão de qualquer registro dessas entidades preenche `deleted_at` com a data/hora da exclusão sem deletar a linha fisicamente.
- [ ] Transações excluídas têm seus valores estornados de contas ou faturas normalmente.
- [ ] Nenhuma consulta do sistema lista ou contabiliza registros que tenham `deleted_at` preenchido.
- [ ] 100% dos testes unitários e de integração do backend passam com sucesso.
