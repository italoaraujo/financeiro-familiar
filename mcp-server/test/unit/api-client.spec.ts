import {
  FinancialApiClient,
  ApiClientError,
  formatToolResult,
  formatToolError,
} from '../../src/http/api-client';
import { McpConfig } from '../../src/config';

describe('FinancialApiClient & MCP Formatters (MCP-03)', () => {
  const baseConfig: McpConfig = {
    apiUrl: 'http://localhost:3001',
    httpTimeoutMs: 5000,
  };

  function createJsonResponse(status: number, body: unknown, contentType = 'application/json') {
    return {
      ok: status >= 200 && status < 300,
      status,
      headers: {
        get: (name: string) => (name.toLowerCase() === 'content-type' ? contentType : null),
      },
      json: jest.fn().mockResolvedValue(body),
      text: jest.fn().mockResolvedValue(typeof body === 'string' ? body : JSON.stringify(body)),
    } as unknown as Response;
  }

  it('AC1 (MCP-03): should send Authorization Bearer header when MCP_API_TOKEN is configured', async () => {
    const mockFetch = jest.fn().mockResolvedValue(
      createJsonResponse(200, [{ id: 'acc-1', name: 'Conta Principal' }]),
    );
    const client = new FinancialApiClient(
      { ...baseConfig, apiToken: 'mcp-pat-token-xyz' },
      mockFetch as any,
    );

    const accounts = await client.get('/accounts', { familyId: 'fam-1', empty: undefined });

    expect(accounts).toEqual([{ id: 'acc-1', name: 'Conta Principal' }]);
    expect(mockFetch).toHaveBeenCalledTimes(1);
    const [calledUrl, calledInit] = mockFetch.mock.calls[0];
    expect(calledUrl).toBe('http://localhost:3001/accounts?familyId=fam-1');
    expect(calledInit.method).toBe('GET');
    expect(calledInit.headers).toEqual(
      expect.objectContaining({
        Authorization: 'Bearer mcp-pat-token-xyz',
        'Content-Type': 'application/json',
      }),
    );
  });

  it('AC2 (MCP-03): should authenticate via POST /auth/login when MCP_API_TOKEN is not set and email/password are provided', async () => {
    const mockFetch = jest
      .fn()
      .mockResolvedValueOnce(
        createJsonResponse(200, {
          user: { id: 'u1', email: 'admin@exemplo.com' },
          accessToken: 'logged-in-jwt-123',
        }),
      )
      .mockResolvedValueOnce(createJsonResponse(200, { id: 'u1', email: 'admin@exemplo.com' }));

    const client = new FinancialApiClient(
      {
        ...baseConfig,
        userEmail: 'admin@exemplo.com',
        userPassword: '123456',
      },
      mockFetch as any,
    );

    const profile = await client.get('/auth/me');

    expect(profile).toEqual({ id: 'u1', email: 'admin@exemplo.com' });
    expect(mockFetch).toHaveBeenCalledTimes(2);
    expect(mockFetch.mock.calls[0][0]).toBe('http://localhost:3001/auth/login');
    expect(mockFetch.mock.calls[1][0]).toBe('http://localhost:3001/auth/me');
    expect(mockFetch.mock.calls[1][1].headers.Authorization).toBe('Bearer logged-in-jwt-123');
  });

  it('AC2 (MCP-03): should re-authenticate once and retry original request when backend returns HTTP 401 with email/password configured', async () => {
    const mockFetch = jest
      .fn()
      // Initial login
      .mockResolvedValueOnce(createJsonResponse(200, { accessToken: 'expired-jwt' }))
      // First attempt returns 401
      .mockResolvedValueOnce(createJsonResponse(401, { message: 'Token expirado' }))
      // Re-login attempt
      .mockResolvedValueOnce(createJsonResponse(200, { accessToken: 'fresh-jwt-999' }))
      // Retried request succeeds
      .mockResolvedValueOnce(createJsonResponse(200, [{ id: 'goal-1' }]));

    const client = new FinancialApiClient(
      {
        ...baseConfig,
        userEmail: 'admin@exemplo.com',
        userPassword: '123456',
      },
      mockFetch as any,
    );

    const goals = await client.get('/goals');

    expect(goals).toEqual([{ id: 'goal-1' }]);
    expect(mockFetch).toHaveBeenCalledTimes(4);
    expect(mockFetch.mock.calls[3][1].headers.Authorization).toBe('Bearer fresh-jwt-999');
  });

  it('Edge Case: should throw descriptive error when neither MCP_API_TOKEN nor email/password are configured', async () => {
    const mockFetch = jest.fn();
    const client = new FinancialApiClient(baseConfig, mockFetch as any);

    await expect(client.get('/accounts')).rejects.toThrow(
      /Credenciais MCP não configuradas.*\/mcp/i,
    );
    expect(mockFetch).not.toHaveBeenCalled();
  });

  it('should support POST, PUT, PATCH, DELETE methods and CSV text responses', async () => {
    const mockFetch = jest
      .fn()
      .mockResolvedValueOnce(createJsonResponse(201, { id: 'tx-1' }))
      .mockResolvedValueOnce(createJsonResponse(200, { id: 'b-1' }))
      .mockResolvedValueOnce(createJsonResponse(200, { id: 'acc-1', isArchived: true }))
      .mockResolvedValueOnce(createJsonResponse(200, { deleted: true }))
      .mockResolvedValueOnce(
        createJsonResponse(200, 'Data,Descricao,Valor\n2026-10-01,Mercado,150.00', 'text/csv; charset=utf-8'),
      );

    const client = new FinancialApiClient(
      { ...baseConfig, apiToken: 'static-token' },
      mockFetch as any,
    );

    await expect(client.post('/transactions', { amount: 150 })).resolves.toEqual({ id: 'tx-1' });
    await expect(client.put('/budgets/b-1', { targetAmount: 900 })).resolves.toEqual({ id: 'b-1' });
    await expect(client.patch('/accounts/acc-1/archive')).resolves.toEqual({
      id: 'acc-1',
      isArchived: true,
    });
    await expect(client.delete('/transactions/tx-1')).resolves.toEqual({ deleted: true });
    await expect(client.get('/reports/export/csv')).resolves.toBe(
      'Data,Descricao,Valor\n2026-10-01,Mercado,150.00',
    );
  });

  it('should surface backend HTTP error messages array or string as ApiClientError', async () => {
    const mockFetch = jest
      .fn()
      .mockResolvedValueOnce(
        createJsonResponse(403, {
          statusCode: 403,
          message: ['Usuários com perfil VIEWER possuem acesso somente leitura'],
        }),
      );

    const client = new FinancialApiClient(
      { ...baseConfig, apiToken: 'static-token' },
      mockFetch as any,
    );

    await expect(client.post('/accounts', { name: 'Teste' })).rejects.toThrow(
      new ApiClientError(403, 'Usuários com perfil VIEWER possuem acesso somente leitura'),
    );
  });

  describe('formatToolResult & formatToolError', () => {
    it('should format structured data as JSON text content and strings directly', () => {
      const jsonRes = formatToolResult({ balance: 1200.5 });
      expect(jsonRes.isError).toBeUndefined();
      expect(jsonRes.content[0]).toEqual({
        type: 'text',
        text: JSON.stringify({ balance: 1200.5 }, null, 2),
      });

      const textRes = formatToolResult('col1,col2\n1,2');
      expect(textRes.content[0]).toEqual({
        type: 'text',
        text: 'col1,col2\n1,2',
      });
    });

    it('should format ApiClientError and generic errors with isError: true', () => {
      const apiErrRes = formatToolError(new ApiClientError(400, 'Limite disponível insuficiente'));
      expect(apiErrRes.isError).toBe(true);
      expect(apiErrRes.content[0]).toEqual({
        type: 'text',
        text: 'Erro da API (HTTP 400): Limite disponível insuficiente',
      });

      const genericErrRes = formatToolError(new Error('Timeout na requisição'));
      expect(genericErrRes.isError).toBe(true);
      expect(genericErrRes.content[0]).toEqual({
        type: 'text',
        text: 'Erro: Timeout na requisição',
      });
    });
  });
});
