import { z } from 'zod';
import {
  FinancialApiClient,
  formatToolError,
  formatToolResult,
  McpToolRegistrar,
} from '../http/api-client';
import { McpConfig, resolveFamilyId } from '../config';

export function registerReportsTools(
  server: McpToolRegistrar,
  client: FinancialApiClient,
  config: McpConfig = client.getConfig(),
): void {
  server.tool(
    'get_dashboard_summary',
    'Obtém o resumo executivo consolidado do Dashboard (saldo total líquido, receitas do mês, despesas do mês, balanço líquido e últimas transações).',
    {
      periodMonth: z
        .string()
        .optional()
        .describe('Mês de referência no formato YYYY-MM (opcional, padrão: mês atual).'),
      tagId: z.string().optional().describe('Filtrar por ID de tag (opcional).'),
      familyId: z
        .string()
        .optional()
        .describe('ID da família para contexto compartilhado (opcional).'),
    },
    async (args) => {
      try {
        const familyId = resolveFamilyId(args.familyId, config);
        const summary = await client.get('/reports/dashboard', {
          periodMonth: args.periodMonth,
          tagId: args.tagId,
          familyId,
        });
        return formatToolResult(summary);
      } catch (error) {
        return formatToolError(error);
      }
    },
  );

  server.tool(
    'get_expenses_by_category',
    'Obtém o relatório de distribuição de despesas agrupadas por categoria e percentual sobre o total no mês.',
    {
      periodMonth: z
        .string()
        .optional()
        .describe('Mês de referência no formato YYYY-MM (opcional, padrão: mês atual).'),
      tagId: z.string().optional().describe('Filtrar por ID de tag (opcional).'),
      familyId: z
        .string()
        .optional()
        .describe('ID da família para contexto compartilhado (opcional).'),
    },
    async (args) => {
      try {
        const familyId = resolveFamilyId(args.familyId, config);
        const report = await client.get('/reports/categories', {
          periodMonth: args.periodMonth,
          tagId: args.tagId,
          familyId,
        });
        return formatToolResult(report);
      } catch (error) {
        return formatToolError(error);
      }
    },
  );

  server.tool(
    'get_expenses_by_tag',
    'Obtém o relatório de distribuição de despesas agrupadas por tag no mês.',
    {
      periodMonth: z
        .string()
        .optional()
        .describe('Mês de referência no formato YYYY-MM (opcional, padrão: mês atual).'),
      familyId: z
        .string()
        .optional()
        .describe('ID da família para contexto compartilhado (opcional).'),
    },
    async (args) => {
      try {
        const familyId = resolveFamilyId(args.familyId, config);
        const report = await client.get('/reports/tags', {
          periodMonth: args.periodMonth,
          familyId,
        });
        return formatToolResult(report);
      } catch (error) {
        return formatToolError(error);
      }
    },
  );

  server.tool(
    'get_cash_flow',
    'Obtém a evolução histórica mensal do fluxo de caixa (receitas vs despesas vs saldo líquido).',
    {
      months: z
        .number()
        .int()
        .min(1)
        .max(24)
        .optional()
        .describe('Quantidade de meses retroativos (padrão: 6).'),
      tagId: z.string().optional().describe('Filtrar por ID de tag (opcional).'),
      familyId: z
        .string()
        .optional()
        .describe('ID da família para contexto compartilhado (opcional).'),
    },
    async (args) => {
      try {
        const familyId = resolveFamilyId(args.familyId, config);
        const report = await client.get('/reports/cash-flow', {
          months: args.months,
          tagId: args.tagId,
          familyId,
        });
        return formatToolResult(report);
      } catch (error) {
        return formatToolError(error);
      }
    },
  );

  server.tool(
    'export_transactions_csv',
    'Exporta o extrato de transações filtrado em formato CSV (texto compatível com Excel com separador ";" e UTF-8 BOM).',
    {
      startDate: z.string().optional().describe('Data inicial YYYY-MM-DD (opcional).'),
      endDate: z.string().optional().describe('Data final YYYY-MM-DD (opcional).'),
      tagId: z.string().optional().describe('Filtrar por ID de tag (opcional).'),
      familyId: z
        .string()
        .optional()
        .describe('ID da família para contexto compartilhado (opcional).'),
    },
    async (args) => {
      try {
        const familyId = resolveFamilyId(args.familyId, config);
        const csvData = await client.get<string>('/reports/export/csv', {
          startDate: args.startDate,
          endDate: args.endDate,
          tagId: args.tagId,
          familyId,
        });
        return formatToolResult(csvData);
      } catch (error) {
        return formatToolError(error);
      }
    },
  );

  if (server.resource) {
    server.resource(
      'dashboard-summary',
      'financeiro://dashboard/summary',
      async (uri: URL) => {
        const familyId = client.getConfig().defaultFamilyId;
        const data = await client.get('/reports/dashboard', { familyId });
        return {
          contents: [
            {
              uri: uri.href,
              mimeType: 'application/json',
              text: JSON.stringify(data, null, 2),
            },
          ],
        };
      },
    );

    server.resource(
      'accounts-list',
      'financeiro://accounts/list',
      async (uri: URL) => {
        const familyId = client.getConfig().defaultFamilyId;
        const data = await client.get('/accounts', { familyId });
        return {
          contents: [
            {
              uri: uri.href,
              mimeType: 'application/json',
              text: JSON.stringify(data, null, 2),
            },
          ],
        };
      },
    );

    server.resource(
      'categories-catalog',
      'financeiro://categories/catalog',
      async (uri: URL) => {
        const familyId = client.getConfig().defaultFamilyId;
        const data = await client.get('/categories', { familyId });
        return {
          contents: [
            {
              uri: uri.href,
              mimeType: 'application/json',
              text: JSON.stringify(data, null, 2),
            },
          ],
        };
      },
    );
  }
}
