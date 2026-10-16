import { z } from 'zod';
import {
  FinancialApiClient,
  McpToolRegistrar,
  formatToolResult,
  formatToolError,
} from '../http/api-client';
import { McpConfig, resolveFamilyId } from '../config';

export function registerTransactionsTools(
  server: McpToolRegistrar,
  apiClient: FinancialApiClient,
  config: McpConfig,
): void {
  server.tool(
    'list_transactions',
    'Lista o extrato de transações financeiras com paginação e filtros por período, conta, cartão de crédito, categoria, tipo, status, pessoa, tag ou busca textual.',
    {
      startDate: z.string().optional().describe('Data inicial no formato YYYY-MM-DD'),
      endDate: z.string().optional().describe('Data final no formato YYYY-MM-DD'),
      accountId: z.string().uuid().optional().describe('UUID da conta bancária'),
      creditCardId: z.string().uuid().optional().describe('UUID do cartão de crédito'),
      categoryId: z.string().uuid().optional().describe('UUID da categoria'),
      type: z
        .enum(['INCOME', 'EXPENSE', 'TRANSFER'])
        .optional()
        .describe('Filtrar por tipo de lançamento'),
      status: z
        .enum(['PENDING', 'COMPLETED', 'CANCELLED'])
        .optional()
        .describe('Filtrar por status'),
      personId: z.string().uuid().optional().describe('UUID da pessoa responsável'),
      tagId: z.string().optional().describe('ID ou nome da tag'),
      search: z.string().optional().describe('Busca textual por descrição'),
      familyId: z
        .string()
        .optional()
        .describe('UUID da família ou "personal" para visão individual'),
      page: z.number().int().min(1).optional().default(1).describe('Página da listagem'),
      limit: z.number().int().min(1).max(100).optional().default(20).describe('Itens por página'),
    },
    async (args) => {
      try {
        const resolvedFamilyId = resolveFamilyId(args.familyId, config);
        const transactions = await apiClient.get('/transactions', {
          startDate: args.startDate,
          endDate: args.endDate,
          accountId: args.accountId,
          creditCardId: args.creditCardId,
          categoryId: args.categoryId,
          type: args.type,
          status: args.status,
          personId: args.personId,
          tagId: args.tagId,
          search: args.search,
          familyId: resolvedFamilyId,
          page: args.page ?? 1,
          limit: args.limit ?? 20,
        });
        return formatToolResult(transactions);
      } catch (err) {
        return formatToolError(err);
      }
    },
  );

  server.tool(
    'create_transaction',
    'Registra uma nova receita (INCOME), despesa em conta bancária (EXPENSE) ou compra à vista/parcelada no cartão de crédito (até 72x).',
    {
      type: z.enum(['INCOME', 'EXPENSE']).describe('Tipo da transação (INCOME ou EXPENSE)'),
      amount: z.number().min(0.01).describe('Valor total da transação em reais (maior que zero)'),
      description: z.string().min(1).max(255).describe('Descrição do lançamento'),
      transactionDate: z
        .string()
        .regex(/^\d{4}-\d{2}-\d{2}$/, 'Formato esperado: YYYY-MM-DD')
        .describe('Data do lançamento (YYYY-MM-DD)'),
      transactionTime: z
        .string()
        .regex(/^([01]\d|2[0-3]):[0-5]\d$/, 'Formato esperado: HH:mm')
        .optional()
        .describe('Horário opcional no formato HH:mm (ex: 14:30)'),
      categoryId: z.string().uuid().describe('UUID da categoria'),
      accountId: z
        .string()
        .uuid()
        .optional()
        .describe('UUID da conta bancária (obrigatório quando não for compra em cartão)'),
      creditCardId: z
        .string()
        .uuid()
        .optional()
        .describe('UUID do cartão de crédito (para compras no crédito)'),
      totalInstallments: z
        .number()
        .int()
        .min(1)
        .max(72)
        .optional()
        .default(1)
        .describe('Número de parcelas para compras no cartão (1 a 72)'),
      isPrivate: z
        .boolean()
        .optional()
        .default(false)
        .describe('Ocultar detalhes de outros membros da família'),
      status: z
        .enum(['PENDING', 'COMPLETED', 'CANCELLED'])
        .optional()
        .default('COMPLETED')
        .describe('Status da transação'),
      notes: z.string().max(1000).optional().describe('Observações adicionais'),
      personId: z.string().uuid().optional().describe('UUID da pessoa da família responsável'),
      tags: z.array(z.string().max(50)).optional().describe('Lista de tags (ex: ["viagem", "ferias"])'),
      familyId: z
        .string()
        .optional()
        .describe('UUID da família ou "personal" para lançamento individual'),
    },
    async (args) => {
      try {
        const resolvedFamilyId = resolveFamilyId(args.familyId, config);
        const payload: Record<string, unknown> = {
          type: args.type,
          amount: args.amount,
          description: args.description,
          transactionDate: args.transactionDate,
          categoryId: args.categoryId,
          totalInstallments: args.totalInstallments ?? 1,
          isPrivate: args.isPrivate ?? false,
          status: args.status ?? 'COMPLETED',
        };

        if (args.transactionTime) payload.transactionTime = args.transactionTime;
        if (args.accountId) payload.accountId = args.accountId;
        if (args.creditCardId) payload.creditCardId = args.creditCardId;
        if (args.notes) payload.notes = args.notes;
        if (args.personId) payload.personId = args.personId;
        if (args.tags && args.tags.length > 0) payload.tags = args.tags;
        if (resolvedFamilyId) payload.familyId = resolvedFamilyId;

        const created = await apiClient.post('/transactions', payload);
        return formatToolResult(created);
      } catch (err) {
        return formatToolError(err);
      }
    },
  );

  server.tool(
    'transfer_between_accounts',
    'Realiza uma transferência bancária atômica debitando da conta de origem e creditando na conta de destino.',
    {
      sourceAccountId: z.string().uuid().describe('UUID da conta bancária de origem'),
      destinationAccountId: z.string().uuid().describe('UUID da conta bancária de destino'),
      amount: z.number().min(0.01).describe('Valor a ser transferido (maior que zero)'),
      description: z.string().min(1).max(255).describe('Descrição da transferência'),
      transactionDate: z
        .string()
        .regex(/^\d{4}-\d{2}-\d{2}$/, 'Formato esperado: YYYY-MM-DD')
        .describe('Data da transferência (YYYY-MM-DD)'),
      transactionTime: z
        .string()
        .regex(/^([01]\d|2[0-3]):[0-5]\d$/, 'Formato esperado: HH:mm')
        .optional()
        .describe('Horário opcional no formato HH:mm'),
      familyId: z
        .string()
        .optional()
        .describe('UUID da família ou "personal" para transferência individual'),
    },
    async (args) => {
      try {
        const resolvedFamilyId = resolveFamilyId(args.familyId, config);
        const result = await apiClient.post('/transactions/transfer', {
          sourceAccountId: args.sourceAccountId,
          destinationAccountId: args.destinationAccountId,
          amount: args.amount,
          description: args.description,
          transactionDate: args.transactionDate,
          ...(args.transactionTime ? { transactionTime: args.transactionTime } : {}),
          ...(resolvedFamilyId ? { familyId: resolvedFamilyId } : {}),
        });
        return formatToolResult(result);
      } catch (err) {
        return formatToolError(err);
      }
    },
  );

  server.tool(
    'delete_transaction',
    'Exclui (soft-delete) uma transação financeira pelo ID, realizando estorno automático do saldo na conta ou fatura.',
    {
      transactionId: z.string().uuid().describe('UUID da transação a ser excluída'),
    },
    async ({ transactionId }) => {
      try {
        const deleted = await apiClient.delete(`/transactions/${transactionId}`);
        return formatToolResult(deleted);
      } catch (err) {
        return formatToolError(err);
      }
    },
  );
}
