# Soft Delete com deleted_at Context

**Gathered:** 2026-09-03
**Spec:** `.specs/features/soft-delete/spec.md`
**Status:** Ready for design

---

## Feature Boundary

Substituir a exclusão física (hard delete via SQL `DELETE`) por exclusão lógica (soft delete) utilizando a coluna `deleted_at` (no Prisma: `deletedAt DateTime? @map("deleted_at") @db.Timestamptz`) nas 7 entidades principais de negócio do sistema: `Transaction`, `Account`, `CreditCard`, `Category`, `Goal`, `Budget` e `Person`. Garantir que todas as consultas ativas e cálculos ignorem registros com `deleted_at IS NOT NULL`, preservando o histórico no banco de dados e mantendo os estornos financeiros de transações inalterados.

---

## Implementation Decisions

### 1. Modelos com Suporte a Soft Delete
- Adicionar o campo `deletedAt DateTime? @map("deleted_at") @db.Timestamptz` nos modelos do Prisma:
  - `Transaction`
  - `Account`
  - `CreditCard`
  - `Category`
  - `Goal`
  - `Budget`
  - `Person`
- Criar índices apropriados em `[deleted_at]` ou compostos onde necessário para otimizar as buscas por registros ativos.

### 2. Comportamento das Consultas e Filtros
- Filtrar `deletedAt: null` de forma consistente nas consultas ativas de listagem, busca individual, relatórios, cálculos de saldo e dashboards.
- Registros que possuem `deletedAt != null` não devem ser retornados aos usuários finais em nenhuma rota de consulta comum.

### 3. Preservação da Lógica de Negócio Financeira no Expurgo de Transação
- Ao realizar a exclusão lógica de uma transação (`Transaction`), a rotina de negócio mantém integralmente o estorno de saldo na conta corrente ou o abatimento na fatura de cartão de crédito.
- O registro é marcado com `deletedAt = new Date()` em vez de ser removido da tabela com `prisma.transaction.delete`.

### 4. Validação de Integridade e Vínculos
- Validações de exclusão (ex: impedir exclusão de Conta ou Categoria com transações vinculadas) devem considerar apenas transações ativas (`deletedAt: null`).
- Se todas as transações vinculadas a uma Conta/Categoria estiverem com `deletedAt != null`, a Conta/Categoria pode ser excluída logicamente com sucesso.

### Agent's Discretion
- Arquitetura técnica no backend para aplicação do filtro de soft delete: implementar via métodos utilitários / queries padronizadas nos Services ou Prisma Extensions / Middlewares garantindo performance e previsibilidade.
- Formato da migration do Prisma para adicionar as colunas `deleted_at` e índices sem downtime nem perda de dados existentes.

### Declined / Undiscussed Gray Areas → Assumptions
- **Interface de Lixeira / Restauração de Registros**: Fora do escopo do MVP. Registros excluídos deixam de ser exibidos na UI e permanecem guardados no banco de dados para conformidade e integridade contábil.
- **Exclusão de Usuários ou Famílias**: Fora do escopo deste incremento. `User` e `Family` mantêm seus fluxos atuais.

---

## Specific References

- O usuário solicitou explicitamente: "Quando um registro for apgado , eu não quero que registro seja apagado do banco , quero usar a coluna deleted_at , para deifinir se foi apagado".
- Git-flow inicializado na branch de desenvolvimento `feature/soft_delete`.

---

## Deferred Ideas

- Funcionalidade de visualização de lixeira e botão "Restaurar registro" na interface web.
- Job automatizado ou política de retenção para expurgo permanente (hard delete físico) após N anos (se exigido por LGPD/compliance no futuro).
