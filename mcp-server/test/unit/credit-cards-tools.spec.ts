import { registerCreditCardsTools } from '../../src/tools/credit-cards-tools';
import { ApiClientError } from '../../src/http/api-client';
import { McpConfig } from '../../src/config';

describe('Credit Cards & Invoices Tools (MCP-08)', () => {
  type ToolHandler = (args: any) => Promise<any>;
  let registeredTools: Map<string, ToolHandler>;
  let mockServer: any;
  let mockApiClient: any;
  const config: McpConfig = {
    apiUrl: 'http://localhost:3001',
    apiToken: 'token-123',
    defaultFamilyId: 'fam-uuid-1',
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
    };

    registerCreditCardsTools(mockServer, mockApiClient, config);
  });

  it('should register all 4 credit card and invoice tools', () => {
    expect(Array.from(registeredTools.keys())).toEqual([
      'list_credit_cards',
      'create_credit_card',
      'get_invoice_details',
      'pay_credit_card_invoice',
    ]);
  });

  it('AC1 (MCP-08): list_credit_cards and create_credit_card should call /credit-cards', async () => {
    mockApiClient.get.mockResolvedValueOnce([
      { id: 'card-1', name: 'Nubank Ultravioleta', availableLimit: '4200.00' },
    ]);
    mockApiClient.post.mockResolvedValueOnce({
      id: 'card-2',
      name: 'Itaú Personnalité',
      closingDay: 15,
      dueDay: 22,
    });

    const listRes = await registeredTools.get('list_credit_cards')!({});
    expect(mockApiClient.get).toHaveBeenCalledWith('/credit-cards', {
      familyId: 'fam-uuid-1',
    });
    expect(JSON.parse(listRes.content[0].text)[0].id).toBe('card-1');

    const createRes = await registeredTools.get('create_credit_card')!({
      name: 'Itaú Personnalité',
      brand: 'Visa',
      creditLimit: 10000,
      closingDay: 15,
      dueDay: 22,
      accountId: 'acc-1',
    });
    expect(mockApiClient.post).toHaveBeenCalledWith('/credit-cards', {
      name: 'Itaú Personnalité',
      brand: 'Visa',
      creditLimit: 10000,
      closingDay: 15,
      dueDay: 22,
      accountId: 'acc-1',
      familyId: 'fam-uuid-1',
    });
    expect(JSON.parse(createRes.content[0].text).id).toBe('card-2');
  });

  it('AC1 (MCP-08): get_invoice_details and pay_credit_card_invoice should call /credit-cards/invoices/:invoiceId', async () => {
    mockApiClient.get.mockResolvedValueOnce({
      id: 'inv-1',
      referenceMonth: '2026-10',
      totalAmount: '850.00',
      byPerson: [{ personName: 'Maria', total: '850.00' }],
    });
    mockApiClient.post.mockResolvedValueOnce({
      id: 'inv-1',
      status: 'PAID',
      paidAmount: '850.00',
    });

    const detailsRes = await registeredTools.get('get_invoice_details')!({
      invoiceId: 'inv-1',
    });
    expect(mockApiClient.get).toHaveBeenCalledWith('/credit-cards/invoices/inv-1');
    expect(JSON.parse(detailsRes.content[0].text).referenceMonth).toBe('2026-10');

    const payRes = await registeredTools.get('pay_credit_card_invoice')!({
      invoiceId: 'inv-1',
      accountId: 'acc-1',
      amount: 850,
    });
    expect(mockApiClient.post).toHaveBeenCalledWith('/credit-cards/invoices/inv-1/pay', {
      accountId: 'acc-1',
      amount: 850,
    });
    expect(JSON.parse(payRes.content[0].text).status).toBe('PAID');
  });

  it('should return isError: true when invoice payment fails with BOLA or insufficient balance', async () => {
    mockApiClient.post.mockRejectedValueOnce(
      new ApiClientError(403, 'Conta bancária de pagamento não pertence ao contexto autorizado'),
    );

    const res = await registeredTools.get('pay_credit_card_invoice')!({
      invoiceId: 'inv-1',
      accountId: 'foreign-acc',
    });
    expect(res.isError).toBe(true);
    expect(res.content[0].text).toContain('HTTP 403');
  });
});
