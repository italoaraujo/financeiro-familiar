import { z } from 'zod';
import {
  FinancialApiClient,
  McpToolRegistrar,
  formatToolResult,
  formatToolError,
} from '../http/api-client';
import { McpConfig, resolveFamilyId } from '../config';

export function registerAccountsAndCategoriesTools(
  server: McpToolRegistrar,
  apiClient: FinancialApiClient,
  config: McpConfig,
): void {
  server.tool(
    'list_accounts',
    'Lista todas as contas bancárias e carteiras ativas (corrente, poupança, investimento, dinheiro) com saldos atuais no contexto pessoal ou familiar.',
    {
      familyId: z
        .string()
        .optional()
        .describe('UUID da família ou "personal" para forçar visão pessoal'),
    },
    async ({ familyId }) => {
      try {
        const resolvedFamilyId = resolveFamilyId(familyId, config);
        const accounts = await apiClient.get('/accounts', {
          familyId: resolvedFamilyId,
        });
        return formatToolResult(accounts);
      } catch (err) {
        return formatToolError(err);
      }
    },
  );

  server.tool(
    'get_account',
    'Obtém os detalhes e saldo atual de uma conta bancária específica pelo seu ID.',
    {
      accountId: z.string().uuid().describe('UUID da conta bancária'),
    },
    async ({ accountId }) => {
      try {
        const account = await apiClient.get(`/accounts/${accountId}`);
        return formatToolResult(account);
      } catch (err) {
        return formatToolError(err);
      }
    },
  );

  server.tool(
    'create_account',
    'Cadastra uma nova conta bancária ou carteira (CHECKING, SAVINGS, INVESTMENT, CASH, OTHER).',
    {
      name: z.string().min(1).max(100).describe('Nome da conta (ex: Nubank Conta Corrente)'),
      type: z
        .enum(['CHECKING', 'SAVINGS', 'INVESTMENT', 'CASH', 'OTHER'])
        .default('CHECKING')
        .describe('Tipo da conta'),
      initialBalance: z.number().optional().default(0).describe('Saldo inicial em reais (BRL)'),
      currency: z.string().max(3).optional().default('BRL').describe('Código da moeda (padrão BRL)'),
      color: z.string().max(7).optional().describe('Cor hexadecimal (ex: #8b5cf6)'),
      icon: z.string().max(50).optional().describe('Nome do ícone opcional'),
      familyId: z
        .string()
        .optional()
        .describe('UUID da família ou "personal" para conta individual'),
    },
    async ({ name, type, initialBalance, currency, color, icon, familyId }) => {
      try {
        const resolvedFamilyId = resolveFamilyId(familyId, config);
        const created = await apiClient.post('/accounts', {
          name,
          type,
          initialBalance,
          currency,
          ...(color ? { color } : {}),
          ...(icon ? { icon } : {}),
          ...(resolvedFamilyId ? { familyId: resolvedFamilyId } : {}),
        });
        return formatToolResult(created);
      } catch (err) {
        return formatToolError(err);
      }
    },
  );

  server.tool(
    'archive_account',
    'Arquiva uma conta bancária para ocultá-la das listagens ativas preservando o histórico de transações.',
    {
      accountId: z.string().uuid().describe('UUID da conta a ser arquivada'),
    },
    async ({ accountId }) => {
      try {
        const archived = await apiClient.patch(`/accounts/${accountId}/archive`);
        return formatToolResult(archived);
      } catch (err) {
        return formatToolError(err);
      }
    },
  );

  server.tool(
    'list_categories',
    'Lista o catálogo de categorias e subcategorias financeiras disponíveis (receitas e despesas).',
    {
      type: z
        .enum(['INCOME', 'EXPENSE', 'TRANSFER'])
        .optional()
        .describe('Filtrar por tipo de transação (INCOME ou EXPENSE)'),
      familyId: z
        .string()
        .optional()
        .describe('UUID da família ou "personal" para visão pessoal'),
    },
    async ({ type, familyId }) => {
      try {
        const resolvedFamilyId = resolveFamilyId(familyId, config);
        const categories = await apiClient.get('/categories', {
          familyId: resolvedFamilyId,
          type,
        });
        return formatToolResult(categories);
      } catch (err) {
        return formatToolError(err);
      }
    },
  );

  server.tool(
    'create_category',
    'Cadastra uma nova categoria ou subcategoria financeira personalizada.',
    {
      name: z.string().min(1).max(100).describe('Nome da categoria'),
      type: z.enum(['INCOME', 'EXPENSE']).describe('Tipo da categoria (INCOME ou EXPENSE)'),
      parentId: z.string().uuid().optional().describe('UUID da categoria pai caso seja subcategoria'),
      color: z.string().max(7).optional().describe('Cor hexadecimal (ex: #10b981)'),
      icon: z.string().max(50).optional().describe('Ícone opcional'),
      familyId: z
        .string()
        .optional()
        .describe('UUID da família ou "personal" para categoria individual'),
    },
    async ({ name, type, parentId, color, icon, familyId }) => {
      try {
        const resolvedFamilyId = resolveFamilyId(familyId, config);
        const created = await apiClient.post('/categories', {
          name,
          type,
          ...(parentId ? { parentId } : {}),
          ...(color ? { color } : {}),
          ...(icon ? { icon } : {}),
          ...(resolvedFamilyId ? { familyId: resolvedFamilyId } : {}),
        });
        return formatToolResult(created);
      } catch (err) {
        return formatToolError(err);
      }
    },
  );

  server.tool(
    'list_tags',
    'Lista todas as tags personalizadas disponíveis no escopo pessoal ou familiar.',
    {
      familyId: z
        .string()
        .optional()
        .describe('UUID da família ou "personal" para visão pessoal'),
    },
    async ({ familyId }) => {
      try {
        const resolvedFamilyId = resolveFamilyId(familyId, config);
        const tags = await apiClient.get('/tags', {
          familyId: resolvedFamilyId,
        });
        return formatToolResult(tags);
      } catch (err) {
        return formatToolError(err);
      }
    },
  );
}
