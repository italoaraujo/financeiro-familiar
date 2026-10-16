import { registerBudgetsAndGoalsTools } from '../../src/tools/budgets-goals-tools';
import { ApiClientError } from '../../src/http/api-client';
import { McpConfig } from '../../src/config';

describe('Budgets & Goals Tools (MCP-09)', () => {
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
      put: jest.fn(),
      delete: jest.fn(),
    };

    registerBudgetsAndGoalsTools(mockServer, mockApiClient, config);
  });

  it('should register all 8 budget and goal tools', () => {
    expect(Array.from(registeredTools.keys())).toEqual([
      'list_budgets',
      'create_budget',
      'update_budget',
      'delete_budget',
      'list_goals',
      'create_goal',
      'deposit_to_goal',
      'withdraw_from_goal',
    ]);
  });

  it('AC2 (MCP-09): list_budgets, create_budget, update_budget, and delete_budget should invoke /budgets', async () => {
    mockApiClient.get.mockResolvedValueOnce([{ id: 'b-1', targetAmount: '1000.00' }]);
    mockApiClient.post.mockResolvedValueOnce({ id: 'b-2', targetAmount: '800.00' });
    mockApiClient.put.mockResolvedValueOnce({ id: 'b-2', targetAmount: '950.00' });
    mockApiClient.delete.mockResolvedValueOnce({ message: 'Orçamento removido' });

    const listRes = await registeredTools.get('list_budgets')!({ periodMonth: '2026-10' });
    expect(mockApiClient.get).toHaveBeenCalledWith('/budgets', {
      periodMonth: '2026-10',
      familyId: 'fam-uuid-1',
    });
    expect(JSON.parse(listRes.content[0].text)[0].id).toBe('b-1');

    const createRes = await registeredTools.get('create_budget')!({
      categoryId: 'cat-1',
      periodMonth: '2026-10',
      targetAmount: 800,
    });
    expect(mockApiClient.post).toHaveBeenCalledWith('/budgets', {
      categoryId: 'cat-1',
      periodMonth: '2026-10',
      targetAmount: 800,
      alertPercentage: 80,
      familyId: 'fam-uuid-1',
    });
    expect(JSON.parse(createRes.content[0].text).id).toBe('b-2');

    const updateRes = await registeredTools.get('update_budget')!({
      budgetId: 'b-2',
      targetAmount: 950,
      alertPercentage: 85,
    });
    expect(mockApiClient.put).toHaveBeenCalledWith('/budgets/b-2', {
      targetAmount: 950,
      alertPercentage: 85,
    });
    expect(JSON.parse(updateRes.content[0].text).targetAmount).toBe('950.00');

    const delRes = await registeredTools.get('delete_budget')!({ budgetId: 'b-2' });
    expect(mockApiClient.delete).toHaveBeenCalledWith('/budgets/b-2');
    expect(JSON.parse(delRes.content[0].text).message).toBe('Orçamento removido');
  });

  it('AC3 (MCP-09): list_goals, create_goal, deposit_to_goal, and withdraw_from_goal should invoke /goals', async () => {
    mockApiClient.get.mockResolvedValueOnce([{ id: 'g-1', name: 'Viagem', currentAmount: '500.00' }]);
    mockApiClient.post
      .mockResolvedValueOnce({ id: 'g-2', name: 'Reserva', targetAmount: '10000.00' })
      .mockResolvedValueOnce({ id: 'dep-1', amount: '300.00', type: 'DEPOSIT' })
      .mockResolvedValueOnce({ id: 'wit-1', amount: '100.00', type: 'WITHDRAWAL' });

    const listRes = await registeredTools.get('list_goals')!({ familyId: 'personal' });
    expect(mockApiClient.get).toHaveBeenCalledWith('/goals', { familyId: undefined });
    expect(JSON.parse(listRes.content[0].text)[0].id).toBe('g-1');

    const createRes = await registeredTools.get('create_goal')!({
      name: 'Reserva',
      targetAmount: 10000,
      accountId: 'acc-1',
      deadline: '2027-12-31',
    });
    expect(mockApiClient.post).toHaveBeenCalledWith('/goals', {
      name: 'Reserva',
      targetAmount: 10000,
      accountId: 'acc-1',
      deadline: '2027-12-31',
      familyId: 'fam-uuid-1',
    });
    expect(JSON.parse(createRes.content[0].text).id).toBe('g-2');

    const depRes = await registeredTools.get('deposit_to_goal')!({
      goalId: 'g-2',
      amount: 300,
      depositDate: '2026-10-16',
      accountId: 'acc-1',
      notes: 'Aporte mensal',
    });
    expect(mockApiClient.post).toHaveBeenCalledWith('/goals/g-2/deposits', {
      amount: 300,
      depositDate: '2026-10-16',
      accountId: 'acc-1',
      notes: 'Aporte mensal',
    });
    expect(JSON.parse(depRes.content[0].text).type).toBe('DEPOSIT');

    const witRes = await registeredTools.get('withdraw_from_goal')!({
      goalId: 'g-2',
      amount: 100,
      withdrawalDate: '2026-10-16',
      notes: 'Resgate parcial',
    });
    expect(mockApiClient.post).toHaveBeenCalledWith('/goals/g-2/withdraw', {
      amount: 100,
      withdrawalDate: '2026-10-16',
      notes: 'Resgate parcial',
    });
    expect(JSON.parse(witRes.content[0].text).type).toBe('WITHDRAWAL');
  });

  it('should return isError: true when goal withdrawal exceeds accumulated goal balance', async () => {
    mockApiClient.post.mockRejectedValueOnce(
      new ApiClientError(400, 'Valor do resgate excede o saldo acumulado na meta'),
    );

    const res = await registeredTools.get('withdraw_from_goal')!({
      goalId: 'g-2',
      amount: 50000,
      withdrawalDate: '2026-10-16',
    });
    expect(res.isError).toBe(true);
    expect(res.content[0].text).toContain('HTTP 400');
  });
});
