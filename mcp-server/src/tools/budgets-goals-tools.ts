import { z } from 'zod';
import {
  FinancialApiClient,
  McpToolRegistrar,
  formatToolResult,
  formatToolError,
} from '../http/api-client';
import { McpConfig, resolveFamilyId } from '../config';

export function registerBudgetsAndGoalsTools(
  server: McpToolRegistrar,
  apiClient: FinancialApiClient,
  config: McpConfig,
): void {
  server.tool(
    'list_budgets',
    'Lista os tetos de gastos (orçamentos) mensais com progresso de consumo e alertas (80% e 100%).',
    {
      periodMonth: z
        .string()
        .regex(/^\d{4}-\d{2}$/, 'Formato esperado: YYYY-MM')
        .optional()
        .describe('Mês de referência no formato YYYY-MM (ex: 2026-10)'),
      familyId: z
        .string()
        .optional()
        .describe('UUID da família ou "personal" para orçamentos individuais'),
    },
    async ({ periodMonth, familyId }) => {
      try {
        const resolvedFamilyId = resolveFamilyId(familyId, config);
        const budgets = await apiClient.get('/budgets', {
          periodMonth,
          familyId: resolvedFamilyId,
        });
        return formatToolResult(budgets);
      } catch (err) {
        return formatToolError(err);
      }
    },
  );

  server.tool(
    'create_budget',
    'Cria um novo teto de gastos (orçamento mensal) para uma categoria específica.',
    {
      categoryId: z.string().uuid().describe('UUID da categoria de despesa'),
      periodMonth: z
        .string()
        .regex(/^\d{4}-\d{2}$/, 'Formato esperado: YYYY-MM')
        .describe('Mês de referência no formato YYYY-MM'),
      targetAmount: z.number().min(0.01).describe('Valor limite do orçamento em reais'),
      alertPercentage: z
        .number()
        .int()
        .min(1)
        .max(100)
        .optional()
        .default(80)
        .describe('Percentual para alerta preventivo (padrão 80)'),
      familyId: z
        .string()
        .optional()
        .describe('UUID da família ou "personal" para orçamento individual'),
    },
    async (args) => {
      try {
        const resolvedFamilyId = resolveFamilyId(args.familyId, config);
        const created = await apiClient.post('/budgets', {
          categoryId: args.categoryId,
          periodMonth: args.periodMonth,
          targetAmount: args.targetAmount,
          alertPercentage: args.alertPercentage ?? 80,
          ...(resolvedFamilyId ? { familyId: resolvedFamilyId } : {}),
        });
        return formatToolResult(created);
      } catch (err) {
        return formatToolError(err);
      }
    },
  );

  server.tool(
    'update_budget',
    'Atualiza o valor limite ou o percentual de alerta de um orçamento existente.',
    {
      budgetId: z.string().uuid().describe('UUID do orçamento'),
      targetAmount: z.number().min(0.01).optional().describe('Novo valor limite em reais'),
      alertPercentage: z
        .number()
        .int()
        .min(1)
        .max(100)
        .optional()
        .describe('Novo percentual de alerta (1 a 100)'),
    },
    async ({ budgetId, targetAmount, alertPercentage }) => {
      try {
        const updated = await apiClient.put(`/budgets/${budgetId}`, {
          ...(targetAmount !== undefined ? { targetAmount } : {}),
          ...(alertPercentage !== undefined ? { alertPercentage } : {}),
        });
        return formatToolResult(updated);
      } catch (err) {
        return formatToolError(err);
      }
    },
  );

  server.tool(
    'delete_budget',
    'Exclui (soft-delete) um orçamento mensal pelo seu ID.',
    {
      budgetId: z.string().uuid().describe('UUID do orçamento a ser excluído'),
    },
    async ({ budgetId }) => {
      try {
        const removed = await apiClient.delete(`/budgets/${budgetId}`);
        return formatToolResult(removed);
      } catch (err) {
        return formatToolError(err);
      }
    },
  );

  server.tool(
    'list_goals',
    'Lista todas as metas financeiras (cofrinhos) com saldo atual, valor alvo e progresso.',
    {
      familyId: z
        .string()
        .optional()
        .describe('UUID da família ou "personal" para metas individuais'),
    },
    async ({ familyId }) => {
      try {
        const resolvedFamilyId = resolveFamilyId(familyId, config);
        const goals = await apiClient.get('/goals', {
          familyId: resolvedFamilyId,
        });
        return formatToolResult(goals);
      } catch (err) {
        return formatToolError(err);
      }
    },
  );

  server.tool(
    'create_goal',
    'Cadastra uma nova meta financeira ("Cofrinho") vinculada a uma conta bancária de custódia.',
    {
      name: z.string().min(1).max(150).describe('Nome da meta (ex: Reserva de Emergência)'),
      targetAmount: z.number().min(0.01).describe('Valor alvo da meta em reais'),
      accountId: z
        .string()
        .uuid()
        .describe('UUID da conta bancária de custódia vinculada à meta'),
      deadline: z
        .string()
        .regex(/^\d{4}-\d{2}-\d{2}$/, 'Formato esperado: YYYY-MM-DD')
        .optional()
        .describe('Data limite opcional (YYYY-MM-DD)'),
      color: z.string().max(7).optional().describe('Cor hexadecimal (ex: #10b981)'),
      icon: z.string().max(50).optional().describe('Ícone opcional'),
      familyId: z
        .string()
        .optional()
        .describe('UUID da família ou "personal" para meta individual'),
    },
    async (args) => {
      try {
        const resolvedFamilyId = resolveFamilyId(args.familyId, config);
        const created = await apiClient.post('/goals', {
          name: args.name,
          targetAmount: args.targetAmount,
          accountId: args.accountId,
          ...(args.deadline ? { deadline: args.deadline } : {}),
          ...(args.color ? { color: args.color } : {}),
          ...(args.icon ? { icon: args.icon } : {}),
          ...(resolvedFamilyId ? { familyId: resolvedFamilyId } : {}),
        });
        return formatToolResult(created);
      } catch (err) {
        return formatToolError(err);
      }
    },
  );

  server.tool(
    'deposit_to_goal',
    'Registra um aporte financeiro em uma meta (cofrinho), debitando opcionalmente da conta bancária informada.',
    {
      goalId: z.string().uuid().describe('UUID da meta financeira'),
      amount: z.number().min(0.01).describe('Valor do aporte em reais'),
      depositDate: z
        .string()
        .regex(/^\d{4}-\d{2}-\d{2}$/, 'Formato esperado: YYYY-MM-DD')
        .describe('Data do aporte (YYYY-MM-DD)'),
      accountId: z
        .string()
        .uuid()
        .optional()
        .describe('UUID da conta bancária de onde o valor será debitado'),
      notes: z.string().optional().describe('Observação opcional sobre o aporte'),
    },
    async ({ goalId, amount, depositDate, accountId, notes }) => {
      try {
        const result = await apiClient.post(`/goals/${goalId}/deposits`, {
          amount,
          depositDate,
          ...(accountId ? { accountId } : {}),
          ...(notes ? { notes } : {}),
        });
        return formatToolResult(result);
      } catch (err) {
        return formatToolError(err);
      }
    },
  );

  server.tool(
    'withdraw_from_goal',
    'Realiza o resgate de um valor acumulado na meta financeira de volta para a conta bancária de custódia vinculada.',
    {
      goalId: z.string().uuid().describe('UUID da meta financeira'),
      amount: z.number().min(0.01).describe('Valor a ser resgatado em reais'),
      withdrawalDate: z
        .string()
        .regex(/^\d{4}-\d{2}-\d{2}$/, 'Formato esperado: YYYY-MM-DD')
        .describe('Data do resgate (YYYY-MM-DD)'),
      notes: z.string().optional().describe('Observação opcional sobre o resgate'),
    },
    async ({ goalId, amount, withdrawalDate, notes }) => {
      try {
        const result = await apiClient.post(`/goals/${goalId}/withdraw`, {
          amount,
          withdrawalDate,
          ...(notes ? { notes } : {}),
        });
        return formatToolResult(result);
      } catch (err) {
        return formatToolError(err);
      }
    },
  );
}
