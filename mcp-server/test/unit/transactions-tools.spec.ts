import { registerTransactionsTools } from '../../src/tools/transactions-tools';
import { ApiClientError } from '../../src/http/api-client';
import { McpConfig } from '../../src/config';

describe('Transactions & Transfers Tools (MCP-07)', () => {
  type ToolHandler = (args: any) => Promise<any>;
  let registeredTools: Map<string, ToolHandler>;
  let mockServer: any;
  let mockApiClient: any;
  const config: McpConfig = {
    apiUrl: 'http://localhost:3001',
    apiToken: 'token-123',
    defaultFamilyId: 'fam-default-1',
    httpTimeoutMs: 5000,
  };

  beforeEach(() => {
    registeredTools = new Map();
    mockServer = {
      tool: jest.fn((name: string, _desc: string, _schema: any, handler: ToolHandler) => {
        registeredTools.set(name, handler);
      }),
    };
    mockApiClient = {
      get: jest.fn(),
      post: jest.fn(),
      delete: jest.fn(),
    };

    registerTransactionsTools(mockServer, mockApiClient, config);
  });

  it('should register all 4 transaction tools', () => {
    expect(Array.from(registeredTools.keys())).toEqual([
      'list_transactions',
      'create_transaction',
      'transfer_between_accounts',
      'delete_transaction',
    ]);
  });

  it('AC4 (MCP-07): list_transactions should pass filters and pagination to GET /transactions', async () => {
    mockApiClient.get.mockResolvedValueOnce({
      data: [{ id: 'tx-1', description: 'Supermercado', amount: '250.00' }],
      meta: { total: 1, page: 1, limit: 10 },
    });

    const res = await registeredTools.get('list_transactions')!({
      startDate: '2026-10-01',
      endDate: '2026-10-31',
      type: 'EXPENSE',
      search: 'Supermercado',
      page: 1,
      limit: 10,
    });

    expect(mockApiClient.get).toHaveBeenCalledWith('/transactions', {
      startDate: '2026-10-01',
      endDate: '2026-10-31',
      accountId: undefined,
      creditCardId: undefined,
      categoryId: undefined,
      type: 'EXPENSE',
      status: undefined,
      personId: undefined,
      tagId: undefined,
      search: 'Supermercado',
      familyId: 'fam-default-1',
      page: 1,
      limit: 10,
    });
    expect(JSON.parse(res.content[0].text).data[0].id).toBe('tx-1');
  });

  it('AC4 (MCP-07): create_transaction should submit credit card installment and tags payload to POST /transactions', async () => {
    mockApiClient.post.mockResolvedValueOnce({
      id: 'tx-inst-1',
      totalInstallments: 3,
      amount: '100.00',
    });

    const res = await registeredTools.get('create_transaction')!({
      type: 'EXPENSE',
      amount: 300,
      description: 'Notebook',
      transactionDate: '2026-10-16',
      transactionTime: '15:45',
      categoryId: 'cat-uuid-1',
      creditCardId: 'card-uuid-1',
      totalInstallments: 3,
      tags: ['eletronicos', 'trabalho'],
      personId: 'person-uuid-1',
    });

    expect(mockApiClient.post).toHaveBeenCalledWith('/transactions', {
      type: 'EXPENSE',
      amount: 300,
      description: 'Notebook',
      transactionDate: '2026-10-16',
      transactionTime: '15:45',
      categoryId: 'cat-uuid-1',
      creditCardId: 'card-uuid-1',
      totalInstallments: 3,
      isPrivate: false,
      status: 'COMPLETED',
      tags: ['eletronicos', 'trabalho'],
      personId: 'person-uuid-1',
      familyId: 'fam-default-1',
    });
    expect(JSON.parse(res.content[0].text).id).toBe('tx-inst-1');
  });

  it('AC4 (MCP-07): transfer_between_accounts and delete_transaction should call /transactions/transfer and DELETE /transactions/:id', async () => {
    mockApiClient.post.mockResolvedValueOnce({ id: 'tr-1', status: 'COMPLETED' });
    mockApiClient.delete.mockResolvedValueOnce({ message: 'Transação removida com sucesso' });

    const transferRes = await registeredTools.get('transfer_between_accounts')!({
      sourceAccountId: 'acc-1',
      destinationAccountId: 'acc-2',
      amount: 500,
      description: 'Reserva mensal',
      transactionDate: '2026-10-16',
      familyId: 'personal',
    });

    expect(mockApiClient.post).toHaveBeenCalledWith('/transactions/transfer', {
      sourceAccountId: 'acc-1',
      destinationAccountId: 'acc-2',
      amount: 500,
      description: 'Reserva mensal',
      transactionDate: '2026-10-16',
    });
    expect(JSON.parse(transferRes.content[0].text).id).toBe('tr-1');

    const delRes = await registeredTools.get('delete_transaction')!({
      transactionId: 'tx-99',
    });
    expect(mockApiClient.delete).toHaveBeenCalledWith('/transactions/tx-99');
    expect(JSON.parse(delRes.content[0].text).message).toBe('Transação removida com sucesso');
  });

  it('AC5 (MCP-07): should return isError: true when credit card limit is exceeded or invoice is closed', async () => {
    mockApiClient.post.mockRejectedValueOnce(
      new ApiClientError(400, 'O valor da compra excede o limite disponível do cartão'),
    );

    const res = await registeredTools.get('create_transaction')!({
      type: 'EXPENSE',
      amount: 99999,
      description: 'Compra acima do limite',
      transactionDate: '2026-10-16',
      categoryId: 'cat-1',
      creditCardId: 'card-1',
    });

    expect(res.isError).toBe(true);
    expect(res.content[0].text).toContain('HTTP 400');
    expect(res.content[0].text).toContain('excede o limite disponível');
  });
});
