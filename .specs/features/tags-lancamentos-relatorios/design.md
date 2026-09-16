# Tags em Lançamentos e Filtro em Relatórios - Design

**Spec**: `.specs/features/tags-lancamentos-relatorios/spec.md`
**Status**: Approved

---

## Architecture Overview

A arquitetura estende o modelo relacional atual do NestJS/Prisma com a criação da entidade `Tag` e da relação N:N `TransactionTag`. As tags são criadas dinamicamente durante a inserção de transações ou consultadas de forma independente para autocomplete. O módulo de relatórios aproveita a relação relacional para aplicar filtros analíticos unificados em fluxo de caixa, distribuição de categorias e exportação CSV, além de um novo endpoint analítico dedicado para gastos por tag.

```mermaid
graph TD
    UI_Tx[Modal de Lançamento / Extrato] -->|Tags: ['viagem', 'trabalho']| TxCtrl[TransactionsController]
    UI_Rep[Filtros de Relatório] -->|tagId| RepCtrl[ReportsController]
    UI_Tag[Input com Autocomplete] -->|GET /tags| TagCtrl[TagsController]

    TxCtrl --> TxService[TransactionsService]
    RepCtrl --> RepService[ReportsService]
    TagCtrl --> TagService[TagsService]

    TxService -->|findOrCreateTags| TagService
    TxService -->|ACID Transaction| Prisma[(PostgreSQL)]
    RepService -->|Filtro relacional tags.some| Prisma
    TagService -->|Busca por escopo familiar/pessoal| Prisma
```

---

## Code Reuse Analysis

### Existing Components to Leverage

| Component | Location | How to Use |
| --------- | -------- | ---------- |
| `verifyFamilyAccess` | `src/modules/transactions/transactions.service.ts` | Reutilizar para validação de tenancy e bloqueio de `VIEWER` (AD-014) |
| `parseTransactionDate` | `src/modules/transactions/transactions.service.ts` | Reutilizar para parsing consistente de datas sem drift de fuso |
| `Modal` | `frontend/src/components/ui/Modal.tsx` | Reutilizar no modal de criação com campo de tags integrado |
| `apiRequest` | `frontend/src/lib/api.ts` | Chamadas para `/tags`, `/transactions` e `/reports` |
| `AppShell` | `frontend/src/components/layout/AppShell.tsx` | Shell padrão de layout |

### Integration Points

| System | Integration Method |
| ------ | ------------------ |
| `Transaction` (Prisma) | Relação 1:N com `TransactionTag`, com carregamento via `include: { tags: { include: { tag: true } } }` |
| `ReportsService` | Inclusão de cláusula `tags: { some: { tagId } }` nas agregações do Prisma |
| `CreditCard` installments | Replicação das tags criadas no loop de parcelas (`installmentGroupId`) |

---

## Components

### 1. `TagsModule`, `TagsController`, `TagsService`

- **Purpose**: Gestão de tags, busca com autocomplete por escopo e criação idempotente com normalização.
- **Location**: `backend/src/modules/tags/`
- **Interfaces**:
  - `findAll(userId: string, familyId?: string): Promise<Tag[]>` - Lista tags do escopo ativo ordenadas por nome.
  - `findOrCreateMany(userId: string, familyId: string | null, names: string[], tx?: PrismaClient): Promise<Tag[]>` - Busca tags existentes e cria as novas em lote com cores de paleta consistente.
- **Dependencies**: `PrismaService`.
- **Reuses**: Padrão de injeção de dependência do NestJS e isolamento de tenancy.

### 2. `TransactionsService` (Extensão)

- **Purpose**: Atribuir tags na criação de transações e filtrar extrato por tag.
- **Location**: `backend/src/modules/transactions/`
- **Interfaces**:
  - `create(userId: string, dto: CreateTransactionDto)`: expandido para receber `tags?: string[]`, resolver IDs via `TagsService` e persistir `TransactionTag`.
  - `findAll(userId: string, filter: FilterTransactionDto)`: expandido para aceitar `tagId?: string` e retornar tags na resposta higienizada (ocultando em privadas de terceiros).
- **Dependencies**: `TagsService`, `PrismaService`, `CreditCardsService`.

### 3. `ReportsService` (Extensão)

- **Purpose**: Filtro por tag em relatórios e nova distribuição analítica por tags.
- **Location**: `backend/src/modules/reports/`
- **Interfaces**:
  - `getExpensesByTag(userId: string, familyId?: string, periodMonth?: string)`: agrupa despesas efetivadas por tag no mês.
  - `getDashboardSummary`, `getExpensesByCategory`, `getCashFlow`: expandidos para filtrar por `tagId`.
  - `exportCsv`: expandido para filtrar por `tagId` e incluir coluna `Tags`.

### 4. `TagInput` & Frontend Pages

- **Purpose**: Interface de chips para digitação/seleção dinâmica de tags e seletores nos filtros.
- **Location**: `frontend/src/components/ui/TagInput.tsx`, `frontend/src/app/transactions/page.tsx`, `frontend/src/app/reports/page.tsx`.

---

## Data Models

### Prisma Schema (`backend/prisma/schema.prisma`)

```prisma
model Tag {
  id        String           @id @default(uuid()) @db.Uuid
  userId    String           @map("user_id") @db.Uuid
  familyId  String?          @map("family_id") @db.Uuid
  name      String           @db.VarChar(50)
  color     String?          @db.VarChar(7)
  createdAt DateTime         @default(now()) @map("created_at") @db.Timestamptz
  updatedAt DateTime         @updatedAt @map("updated_at") @db.Timestamptz
  deletedAt DateTime?        @map("deleted_at") @db.Timestamptz

  user             User             @relation(fields: [userId], references: [id], onDelete: Cascade)
  family           Family?          @relation(fields: [familyId], references: [id], onDelete: Cascade)
  transactionTags  TransactionTag[]

  @@unique([name, userId, familyId])
  @@index([userId, deletedAt])
  @@index([familyId, deletedAt])
  @@map("tags")
}

model TransactionTag {
  transactionId String      @map("transaction_id") @db.Uuid
  tagId         String      @map("tag_id") @db.Uuid

  transaction   Transaction @relation(fields: [transactionId], references: [id], onDelete: Cascade)
  tag           Tag         @relation(fields: [tagId], references: [id], onDelete: Cascade)

  @@id([transactionId, tagId])
  @@map("transaction_tags")
}
```

E no model `Transaction`:
```prisma
  tags TransactionTag[]
```

---

## Error Handling Strategy

| Error Scenario | Handling | User Impact |
| -------------- | -------- | ----------- |
| Tag com nome vazio ou > 50 chars | `BadRequestException` no DTO do backend e validação no input do frontend | Mensagem amigável alertando o limite |
| Membro VIEWER tentando criar tags | `ForbiddenException` pelo `verifyFamilyAccess` | Alerta de perfil somente leitura |
| Tag duplicada no mesmo lançamento | Set / deduplicação antes de persistir | Salva sem duplicidade de forma transparente |
| Transação privada de outro usuário | Sanitização no `findAll` retornando `tags: []` | Dados e tags confidenciais permanecem ocultos |

---

## Risks & Concerns

| Concern | Location (file:line) | Impact | Mitigation |
| ------- | -------------------- | ------ | ---------- |
| N+1 na listagem de transações com tags | `backend/src/modules/transactions/transactions.service.ts:368` | Lentidão no extrato com muitas transações | Uso explícito de `include: { tags: { include: { tag: true } } }` em uma única query com JOIN do Prisma |
| Concorrência na criação da mesma tag | `backend/src/modules/tags/tags.service.ts` | Violação de unicidade `unique([name, userId, familyId])` | Tratamento com `upsert` ou `findFirst` + `try/catch` de erro P2002 do Prisma recuperando a tag existente |
| Compras parceladas sem tags | `backend/src/modules/transactions/transactions.service.ts:114` | Inconsistência entre parcelas | Criar `TransactionTag` para todas as transações criadas no loop de parcelas dentro da mesma transação ACID |

---

## Tech Decisions

| Decision | Choice | Rationale |
| -------- | ------ | --------- |
| Relação N:N explícita (`TransactionTag`) | Tabela intermediária explícita | Garante controle de integridade referencial, cascade deletes e conformidade estrita com o banco PostgreSQL |
| Paleta de cores dinâmica para tags | Hash determinístico do nome da tag mapeado para paleta hex agradável | Elimina esforço do usuário de escolher cores manualmente enquanto mantém badges visualmente distintos e consistentes |
| Sanitização de privacidade (RN06) | Limpar array de tags para transações privadas de outros usuários | Conformidade com AD-003 e regras de sigilo familiar |
