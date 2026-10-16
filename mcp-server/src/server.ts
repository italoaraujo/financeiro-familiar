import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { McpConfig, loadConfig } from './config';
import { FinancialApiClient, McpToolRegistrar } from './http/api-client';
import { registerContextTools } from './tools/context-tools';
import { registerAccountsAndCategoriesTools } from './tools/accounts-tools';
import { registerTransactionsTools } from './tools/transactions-tools';
import { registerCreditCardsTools } from './tools/credit-cards-tools';
import { registerBudgetsAndGoalsTools } from './tools/budgets-goals-tools';
import { registerReportsTools } from './tools/reports-tools';

export interface CreateFinancialMcpServerOptions {
  config?: McpConfig;
  apiClient?: FinancialApiClient;
  fetchFn?: typeof fetch;
}

export function createFinancialMcpServer(
  options: CreateFinancialMcpServerOptions = {},
): {
  server: McpServer;
  apiClient: FinancialApiClient;
  config: McpConfig;
} {
  const config = options.config ?? loadConfig();
  const apiClient = options.apiClient ?? new FinancialApiClient(config, options.fetchFn);

  const server = new McpServer(
    {
      name: 'financeiro-familiar-mcp',
      version: '1.0.0',
    },
    {
      capabilities: {
        tools: {},
        resources: {},
      },
    },
  );

  const registrar = server as unknown as McpToolRegistrar;

  registerContextTools(registrar, apiClient, config);
  registerAccountsAndCategoriesTools(registrar, apiClient, config);
  registerTransactionsTools(registrar, apiClient, config);
  registerCreditCardsTools(registrar, apiClient, config);
  registerBudgetsAndGoalsTools(registrar, apiClient, config);
  registerReportsTools(registrar, apiClient, config);

  return { server, apiClient, config };
}
