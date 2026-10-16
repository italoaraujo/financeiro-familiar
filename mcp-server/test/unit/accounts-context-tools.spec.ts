import { registerContextTools } from '../../src/tools/context-tools';
import { registerAccountsAndCategoriesTools } from '../../src/tools/accounts-tools';
import { ApiClientError } from '../../src/http/api-client';
import { McpConfig } from '../../src/config';

describe('Context, Families, Accounts, Categories & Tags Tools (MCP-05 & MCP-06)', () => {
  type ToolHandler = (args: any) => Promise<any>;
  let registeredTools: Map<string, ToolHandler>;
  let mockServer: any;
  let mockApiClient: any;
  const config: McpConfig = {
    apiUrl: 'http://localhost:3001',
    apiToken: 'token-123',
    defaultFamilyId: '11111111-1111-4111-8111-111111111111',
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
      patch: jest.fn(),
    };

    registerContextTools(mockServer, mockApiClient, config);
    registerAccountsAndCategoriesTools(mockServer, mockApiClient, config);
  });

  it('should register all 10 tools across context and accounts/categories modules', () => {
    expect(Array.from(registeredTools.keys())).toEqual([
      'get_current_context',
      'list_families',
      'list_family_people',
      'list_accounts',
      'get_account',
      'create_account',
      'archive_account',
      'list_categories',
      'create_category',
      'list_tags',
    ]);
  });

  it('AC1 (MCP-05): get_current_context should aggregate /auth/me, /families, and defaultFamilyId', async () => {
    mockApiClient.get
      .mockResolvedValueOnce({ id: 'u-1', name: 'Admin' })
      .mockResolvedValueOnce([{ id: 'fam-1', name: 'Família Silva' }]);

    const res = await registeredTools.get('get_current_context')!({});
    const parsed = JSON.parse(res.content[0].text);

    expect(mockApiClient.get).toHaveBeenCalledWith('/auth/me');
    expect(mockApiClient.get).toHaveBeenCalledWith('/families');
    expect(parsed).toEqual({
      user: { id: 'u-1', name: 'Admin' },
      families: [{ id: 'fam-1', name: 'Família Silva' }],
      defaultFamilyId: '11111111-1111-4111-8111-111111111111',
      activeMode: 'FAMILY',
    });
  });

  it('AC1 (MCP-05): list_families and list_family_people should query /families endpoints', async () => {
    mockApiClient.get
      .mockResolvedValueOnce([{ id: 'fam-1' }])
      .mockResolvedValueOnce([{ id: 'person-1', name: 'João' }]);

    const famRes = await registeredTools.get('list_families')!({});
    expect(JSON.parse(famRes.content[0].text)).toEqual([{ id: 'fam-1' }]);

    const peopleRes = await registeredTools.get('list_family_people')!({});
    expect(mockApiClient.get).toHaveBeenCalledWith(
      '/families/11111111-1111-4111-8111-111111111111/people',
    );
    expect(JSON.parse(peopleRes.content[0].text)).toEqual([{ id: 'person-1', name: 'João' }]);
  });

  it('list_family_people should return isError: true when no familyId can be resolved', async () => {
    const personalServerTools = new Map<string, ToolHandler>();
    registerContextTools(
      {
        tool: (name: string, _d: string, _s: any, h: ToolHandler) =>
          personalServerTools.set(name, h),
      } as any,
      mockApiClient,
      { ...config, defaultFamilyId: undefined },
    );

    const res = await personalServerTools.get('list_family_people')!({});
    expect(res.isError).toBe(true);
    expect(res.content[0].text).toContain('familyId válido é obrigatório');
  });

  it('AC2 (MCP-05): list_accounts, get_account, create_account, and archive_account should invoke /accounts', async () => {
    mockApiClient.get
      .mockResolvedValueOnce([{ id: 'acc-1', currentBalance: '1500.00' }])
      .mockResolvedValueOnce({ id: 'acc-1', name: 'Nubank' });
    mockApiClient.post.mockResolvedValueOnce({ id: 'acc-2', name: 'Reserva' });
    mockApiClient.patch.mockResolvedValueOnce({ id: 'acc-1', isArchived: true });

    const listRes = await registeredTools.get('list_accounts')!({ familyId: 'personal' });
    expect(mockApiClient.get).toHaveBeenCalledWith('/accounts', { familyId: undefined });
    expect(JSON.parse(listRes.content[0].text)).toEqual([
      { id: 'acc-1', currentBalance: '1500.00' },
    ]);

    const getRes = await registeredTools.get('get_account')!({ accountId: 'acc-1' });
    expect(mockApiClient.get).toHaveBeenCalledWith('/accounts/acc-1');
    expect(JSON.parse(getRes.content[0].text).name).toBe('Nubank');

    const createRes = await registeredTools.get('create_account')!({
      name: 'Reserva',
      type: 'SAVINGS',
      initialBalance: 500,
      currency: 'BRL',
    });
    expect(mockApiClient.post).toHaveBeenCalledWith('/accounts', {
      name: 'Reserva',
      type: 'SAVINGS',
      initialBalance: 500,
      currency: 'BRL',
      familyId: '11111111-1111-4111-8111-111111111111',
    });
    expect(JSON.parse(createRes.content[0].text).id).toBe('acc-2');

    const archiveRes = await registeredTools.get('archive_account')!({ accountId: 'acc-1' });
    expect(mockApiClient.patch).toHaveBeenCalledWith('/accounts/acc-1/archive');
    expect(JSON.parse(archiveRes.content[0].text).isArchived).toBe(true);
  });

  it('AC3 (MCP-06): list_categories, create_category, and list_tags should invoke /categories and /tags', async () => {
    mockApiClient.get
      .mockResolvedValueOnce([{ id: 'cat-1', name: 'Mercado', type: 'EXPENSE' }])
      .mockResolvedValueOnce([{ id: 'tag-1', name: 'viagem' }]);
    mockApiClient.post.mockResolvedValueOnce({ id: 'cat-2', name: 'Padaria', type: 'EXPENSE' });

    const catList = await registeredTools.get('list_categories')!({ type: 'EXPENSE' });
    expect(mockApiClient.get).toHaveBeenCalledWith('/categories', {
      familyId: '11111111-1111-4111-8111-111111111111',
      type: 'EXPENSE',
    });
    expect(JSON.parse(catList.content[0].text)).toHaveLength(1);

    const catCreate = await registeredTools.get('create_category')!({
      name: 'Padaria',
      type: 'EXPENSE',
      parentId: 'cat-1',
    });
    expect(mockApiClient.post).toHaveBeenCalledWith('/categories', {
      name: 'Padaria',
      type: 'EXPENSE',
      parentId: 'cat-1',
      familyId: '11111111-1111-4111-8111-111111111111',
    });
    expect(JSON.parse(catCreate.content[0].text).id).toBe('cat-2');

    const tagList = await registeredTools.get('list_tags')!({});
    expect(mockApiClient.get).toHaveBeenCalledWith('/tags', {
      familyId: '11111111-1111-4111-8111-111111111111',
    });
    expect(JSON.parse(tagList.content[0].text)[0].name).toBe('viagem');
  });

  it('AC5 (MCP-05): should return isError: true when API throws an error', async () => {
    mockApiClient.post.mockRejectedValueOnce(new ApiClientError(403, 'Acesso negado para VIEWER'));
    const res = await registeredTools.get('create_account')!({
      name: 'Conta Bloqueada',
      type: 'CHECKING',
    });
    expect(res.isError).toBe(true);
    expect(res.content[0].text).toContain('HTTP 403');
    expect(res.content[0].text).toContain('Acesso negado para VIEWER');
  });
});
