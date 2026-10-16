import { z } from 'zod';
import {
  FinancialApiClient,
  McpToolRegistrar,
  formatToolResult,
  formatToolError,
} from '../http/api-client';
import { McpConfig, resolveFamilyId } from '../config';

export function registerCreditCardsTools(
  server: McpToolRegistrar,
  apiClient: FinancialApiClient,
  config: McpConfig,
): void {
  server.tool(
    'list_credit_cards',
    'Lista todos os cartões de crédito ativos com limite total, limite disponível, valor comprometido e faturas mensais.',
    {
      familyId: z
        .string()
        .optional()
        .describe('UUID da família ou "personal" para cartões individuais'),
    },
    async ({ familyId }) => {
      try {
        const resolvedFamilyId = resolveFamilyId(familyId, config);
        const cards = await apiClient.get('/credit-cards', {
          familyId: resolvedFamilyId,
        });
        return formatToolResult(cards);
      } catch (err) {
        return formatToolError(err);
      }
    },
  );

  server.tool(
    'create_credit_card',
    'Cadastra um novo cartão de crédito com limite, dia de fechamento e dia de vencimento da fatura.',
    {
      name: z.string().min(1).max(100).describe('Nome do cartão (ex: Nubank Ultravioleta)'),
      brand: z.string().max(50).optional().describe('Bandeira (ex: Mastercard, Visa)'),
      creditLimit: z.number().min(0).describe('Limite total de crédito em reais'),
      closingDay: z.number().int().min(1).max(31).describe('Dia de fechamento da fatura (1 a 31)'),
      dueDay: z.number().int().min(1).max(31).describe('Dia de vencimento da fatura (1 a 31)'),
      color: z.string().max(7).optional().describe('Cor hexadecimal (ex: #8b5cf6)'),
      accountId: z
        .string()
        .uuid()
        .optional()
        .describe('UUID da conta bancária associada ao cartão'),
      familyId: z
        .string()
        .optional()
        .describe('UUID da família ou "personal" para cartão individual'),
    },
    async (args) => {
      try {
        const resolvedFamilyId = resolveFamilyId(args.familyId, config);
        const created = await apiClient.post('/credit-cards', {
          name: args.name,
          creditLimit: args.creditLimit,
          closingDay: args.closingDay,
          dueDay: args.dueDay,
          ...(args.brand ? { brand: args.brand } : {}),
          ...(args.color ? { color: args.color } : {}),
          ...(args.accountId ? { accountId: args.accountId } : {}),
          ...(resolvedFamilyId ? { familyId: resolvedFamilyId } : {}),
        });
        return formatToolResult(created);
      } catch (err) {
        return formatToolError(err);
      }
    },
  );

  server.tool(
    'get_invoice_details',
    'Obtém os detalhes completos de uma fatura de cartão de crédito específica, incluindo lançamentos e divisão de gastos por pessoa.',
    {
      invoiceId: z.string().uuid().describe('UUID da fatura do cartão de crédito'),
    },
    async ({ invoiceId }) => {
      try {
        const details = await apiClient.get(`/credit-cards/invoices/${invoiceId}`);
        return formatToolResult(details);
      } catch (err) {
        return formatToolError(err);
      }
    },
  );

  server.tool(
    'pay_credit_card_invoice',
    'Registra o pagamento de uma fatura de cartão de crédito debitando o valor diretamente do saldo de uma conta bancária.',
    {
      invoiceId: z.string().uuid().describe('UUID da fatura a ser paga'),
      accountId: z
        .string()
        .uuid()
        .describe('UUID da conta bancária de onde o pagamento será debitado'),
      amount: z
        .number()
        .min(0.01)
        .optional()
        .describe('Valor a pagar (se omitido, liquida o valor total da fatura)'),
    },
    async ({ invoiceId, accountId, amount }) => {
      try {
        const result = await apiClient.post(`/credit-cards/invoices/${invoiceId}/pay`, {
          accountId,
          ...(amount !== undefined ? { amount } : {}),
        });
        return formatToolResult(result);
      } catch (err) {
        return formatToolError(err);
      }
    },
  );
}
