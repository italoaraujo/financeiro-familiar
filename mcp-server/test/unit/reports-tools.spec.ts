import { FinancialApiClient, ApiClientError } from '../../src/http/api-client';
import { registerReportsTools } from '../../src/tools/reports-tools';

type RegisteredHandler = (args: any) => Promise<any>;
type RegisteredResourceHandler = (uri: URL) => Promise<any>;

function createFakeServer() {
  const tools = new Map<string, RegisteredHandler>();
  const resources = new Map<string, RegisteredResourceHandler>();
  const server = {
    tool: jest.fn((name: string, _desc: string, _schema: any, handler: RegisteredHandler) => {
      tools.set(name, handler);
    }),
    resource: jest.fn((_name: string, uri: string, handler: RegisteredResourceHandler) => {
      resources.set(uri, handler);
    }),
  };
  return { server, tools, resources };
}

describe('Reports Tools & MCP Resources', () => {
  let mockClient: jest.Mocked<FinancialApiClient>;

  beforeEach(() => {
    mockClient = {
      get: jest.fn(),
      post: jest.fn(),
      put: jest.fn(),
      patch: jest.fn(),
      delete: jest.fn(),
      getConfig: jest.fn().mockReturnValue({
        apiUrl: 'http://localhost:3001',
        apiToken: 'token-123',
        defaultFamilyId: 'fam-default',
        httpTimeoutMs: 5000,
      }),
    } as unknown as jest.Mocked<FinancialApiClient>;
  });

  it('registers all 5 report tools and 3 MCP resources', () => {
    const { server, tools, resources } = createFakeServer();
    registerReportsTools(server, mockClient);

    expect(Array.from(tools.keys())).toEqual([
      'get_dashboard_summary',
      'get_expenses_by_category',
      'get_expenses_by_tag',
      'get_cash_flow',
      'export_transactions_csv',
    ]);

    expect(Array.from(resources.keys())).toEqual([
      'financeiro://dashboard/summary',
      'financeiro://accounts/list',
      'financeiro://categories/catalog',
    ]);
  });

  it('executes get_dashboard_summary, get_expenses_by_category, get_expenses_by_tag, and get_cash_flow', async () => {
    const { server, tools } = createFakeServer();
    registerReportsTools(server, mockClient);

    mockClient.get.mockResolvedValueOnce({ totalBalance: 15000 });
    const dashRes = await tools.get('get_dashboard_summary')!({ periodMonth: '2026-10' });
    expect(mockClient.get).toHaveBeenCalledWith('/reports/dashboard', {
      periodMonth: '2026-10',
      tagId: undefined,
      familyId: 'fam-default',
    });
    expect(dashRes.content[0].text).toContain('15000');

    mockClient.get.mockResolvedValueOnce([{ categoryName: 'Moradia', total: 2200 }]);
    await tools.get('get_expenses_by_category')!({ periodMonth: '2026-10', tagId: 'tag-1' });
    expect(mockClient.get).toHaveBeenCalledWith('/reports/categories', {
      periodMonth: '2026-10',
      tagId: 'tag-1',
      familyId: 'fam-default',
    });

    mockClient.get.mockResolvedValueOnce([{ tagName: 'Fixo', total: 2200 }]);
    await tools.get('get_expenses_by_tag')!({ periodMonth: '2026-10' });
    expect(mockClient.get).toHaveBeenCalledWith('/reports/tags', {
      periodMonth: '2026-10',
      familyId: 'fam-default',
    });

    mockClient.get.mockResolvedValueOnce([{ month: '2026-10', income: 8000, expense: 3500 }]);
    await tools.get('get_cash_flow')!({ months: 6 });
    expect(mockClient.get).toHaveBeenCalledWith('/reports/cash-flow', {
      months: 6,
      tagId: undefined,
      familyId: 'fam-default',
    });
  });

  it('executes export_transactions_csv and returns raw CSV text', async () => {
    const { server, tools } = createFakeServer();
    registerReportsTools(server, mockClient);

    mockClient.get.mockResolvedValueOnce('Data;Descricao;Valor\n2026-10-15;Mercado;-250,00');
    const csvRes = await tools.get('export_transactions_csv')!({
      startDate: '2026-10-01',
      endDate: '2026-10-31',
    });

    expect(mockClient.get).toHaveBeenCalledWith('/reports/export/csv', {
      startDate: '2026-10-01',
      endDate: '2026-10-31',
      tagId: undefined,
      familyId: 'fam-default',
    });
    expect(csvRes.content[0].text).toContain('Data;Descricao;Valor');
  });

  it('reads all 3 MCP resources and returns JSON contents', async () => {
    const { server, resources } = createFakeServer();
    registerReportsTools(server, mockClient);

    mockClient.get.mockResolvedValueOnce({ netWorth: 20000 });
    const dashResource = await resources.get('financeiro://dashboard/summary')!(
      new URL('financeiro://dashboard/summary'),
    );
    expect(dashResource.contents[0].uri).toBe('financeiro://dashboard/summary');
    expect(dashResource.contents[0].mimeType).toBe('application/json');
    expect(dashResource.contents[0].text).toContain('20000');

    mockClient.get.mockResolvedValueOnce([{ id: 'acc-1', name: 'Nubank' }]);
    const accResource = await resources.get('financeiro://accounts/list')!(
      new URL('financeiro://accounts/list'),
    );
    expect(accResource.contents[0].text).toContain('Nubank');

    mockClient.get.mockResolvedValueOnce([{ id: 'cat-1', name: 'Alimentação' }]);
    const catResource = await resources.get('financeiro://categories/catalog')!(
      new URL('financeiro://categories/catalog'),
    );
    expect(catResource.contents[0].text).toContain('Alimentação');
  });

  it('returns isError=true when a report tool fails', async () => {
    const { server, tools } = createFakeServer();
    registerReportsTools(server, mockClient);

    mockClient.get.mockRejectedValueOnce(new ApiClientError(500, 'Erro interno ao gerar relatório'));
    const res = await tools.get('get_dashboard_summary')!({});
    expect(res.isError).toBe(true);
    expect(res.content[0].text).toContain('Erro interno ao gerar relatório');
  });
});
