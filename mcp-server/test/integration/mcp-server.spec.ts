import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { InMemoryTransport } from '@modelcontextprotocol/sdk/inMemory.js';
import { createFinancialMcpServer } from '../../src/server';
import { McpConfig } from '../../src/config';

describe('Financial MCP Server E2E Integration (InMemoryTransport)', () => {
  const testConfig: McpConfig = {
    apiUrl: 'http://localhost:3001',
    apiToken: 'mcp-jwt-integration-token',
    defaultFamilyId: 'fam-int-001',
    httpTimeoutMs: 5000,
  };

  let mockFetch: jest.Mock;
  let client: Client;
  let cleanup: () => Promise<void>;

  beforeEach(async () => {
    mockFetch = jest.fn();

    const { server } = createFinancialMcpServer({
      config: testConfig,
      fetchFn: mockFetch as unknown as typeof fetch,
    });

    const [clientTransport, serverTransport] = InMemoryTransport.createLinkedPair();
    client = new Client({
      name: 'integration-test-client',
      version: '1.0.0',
    });

    await Promise.all([server.connect(serverTransport), client.connect(clientTransport)]);

    cleanup = async () => {
      await client.close();
      await server.close();
    };
  });

  afterEach(async () => {
    if (cleanup) {
      await cleanup();
    }
  });

  it('registers and lists all 31 MCP tools across all financial domains', async () => {
    const result = await client.listTools();
    const toolNames = result.tools.map((t) => t.name).sort();

    const expectedTools = [
      // Context & Families (3)
      'get_current_context',
      'list_families',
      'list_family_people',
      // Accounts, Categories & Tags (7)
      'list_accounts',
      'get_account',
      'create_account',
      'archive_account',
      'list_categories',
      'create_category',
      'list_tags',
      // Transactions & Transfers (4)
      'list_transactions',
      'create_transaction',
      'transfer_between_accounts',
      'delete_transaction',
      // Credit Cards & Invoices (4)
      'list_credit_cards',
      'create_credit_card',
      'get_invoice_details',
      'pay_credit_card_invoice',
      // Budgets & Goals (8)
      'list_budgets',
      'create_budget',
      'update_budget',
      'delete_budget',
      'list_goals',
      'create_goal',
      'deposit_to_goal',
      'withdraw_from_goal',
      // Reports & CSV (5)
      'get_dashboard_summary',
      'get_expenses_by_category',
      'get_expenses_by_tag',
      'get_cash_flow',
      'export_transactions_csv',
    ].sort();

    expect(result.tools).toHaveLength(31);
    expect(toolNames).toEqual(expectedTools);
  });

  it('registers and lists all 3 MCP resources', async () => {
    const result = await client.listResources();
    const uris = result.resources.map((r) => r.uri).sort();

    expect(uris).toEqual([
      'financeiro://accounts/list',
      'financeiro://categories/catalog',
      'financeiro://dashboard/summary',
    ]);
  });

  it('executes tool calls end-to-end via MCP protocol and forwards Bearer token to backend', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      status: 200,
      headers: { get: () => 'application/json' },
      json: async () => [
        { id: 'acc-1', name: 'Conta Principal', currentBalance: '4250.75' },
      ],
    });

    const response = await client.callTool({
      name: 'list_accounts',
      arguments: {},
    });

    expect(mockFetch).toHaveBeenCalledWith(
      'http://localhost:3001/accounts?familyId=fam-int-001',
      expect.objectContaining({
        method: 'GET',
        headers: expect.objectContaining({
          Authorization: 'Bearer mcp-jwt-integration-token',
        }),
      }),
    );

    const content = response.content as Array<{ type: string; text: string }>;
    expect(content[0].text).toContain('Conta Principal');
    expect(content[0].text).toContain('4250.75');
  });

  it('reads MCP resources end-to-end and returns JSON contents', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      status: 200,
      headers: { get: () => 'application/json' },
      json: async () => ({
        totalBalance: 18500.5,
        monthlyIncome: 9500,
        monthlyExpense: 4200,
      }),
    });

    const resourceResult = await client.readResource({
      uri: 'financeiro://dashboard/summary',
    });

    expect(resourceResult.contents).toHaveLength(1);
    expect(resourceResult.contents[0].uri).toBe('financeiro://dashboard/summary');
    expect((resourceResult.contents[0] as { text: string }).text).toContain('18500.5');
  });
});
