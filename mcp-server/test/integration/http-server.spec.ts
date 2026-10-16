import * as crypto from 'node:crypto';
import { AddressInfo } from 'node:net';
import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { StreamableHTTPClientTransport } from '@modelcontextprotocol/sdk/client/streamableHttp.js';
import { createHttpMcpServer } from '../../src/http-server';
import { McpConfig } from '../../src/config';

describe('Financial MCP HTTP + OAuth Server Integration (MCP-11)', () => {
  let mockBackendFetch: jest.Mock;
  let serverUrl: string;
  let closeHttpServer: () => Promise<void>;

  beforeEach(async () => {
    mockBackendFetch = jest.fn();

    const baseConfig: McpConfig = {
      apiUrl: 'http://localhost:3001',
      transport: 'http',
      httpHost: '127.0.0.1',
      httpPort: 0,
      httpTimeoutMs: 5000,
      defaultFamilyId: 'fam-http-01',
    };

    const instance = createHttpMcpServer(
      baseConfig,
      mockBackendFetch as unknown as typeof fetch,
    );
    closeHttpServer = instance.close;

    await new Promise<void>((resolve) => {
      instance.httpServer.listen(0, '127.0.0.1', () => resolve());
    });

    const address = instance.httpServer.address() as AddressInfo;
    serverUrl = `http://127.0.0.1:${address.port}`;
  });

  afterEach(async () => {
    if (closeHttpServer) {
      await closeHttpServer();
    }
  });

  it('serves GET /health and OAuth discovery metadata (/.well-known/*)', async () => {
    const healthRes = await fetch(`${serverUrl}/health`);
    expect(healthRes.status).toBe(200);
    const healthBody = await healthRes.json();
    expect(healthBody).toEqual({
      status: 'ok',
      service: 'financeiro-familiar-mcp',
      transport: 'http',
      tools: 31,
      resources: 3,
    });

    const prmRes = await fetch(`${serverUrl}/.well-known/oauth-protected-resource`);
    expect(prmRes.status).toBe(200);
    const prmBody = (await prmRes.json()) as any;
    expect(prmBody.resource).toBe(`${serverUrl}/mcp`);
    expect(prmBody.authorization_servers).toEqual([serverUrl]);

    const asmRes = await fetch(`${serverUrl}/.well-known/oauth-authorization-server`);
    expect(asmRes.status).toBe(200);
    const asmBody = (await asmRes.json()) as any;
    expect(asmBody.authorization_endpoint).toBe(`${serverUrl}/authorize`);
    expect(asmBody.token_endpoint).toBe(`${serverUrl}/token`);
  });

  it('completes OAuth 2.1 Authorization Code + PKCE flow using Client ID and Client Secret', async () => {
    const codeVerifier = 'my-super-secure-pkce-code-verifier-string-123456';
    const codeChallenge = crypto
      .createHash('sha256')
      .update(codeVerifier)
      .digest('base64')
      .replace(/\+/g, '-')
      .replace(/\//g, '_')
      .replace(/=+$/, '');

    const authorizeUrl = new URL(`${serverUrl}/authorize`);
    authorizeUrl.searchParams.set('response_type', 'code');
    authorizeUrl.searchParams.set('client_id', 'token-uuid-1');
    authorizeUrl.searchParams.set('redirect_uri', 'https://gemini.google.com/oauth/callback');
    authorizeUrl.searchParams.set('state', 'xyz-state-99');
    authorizeUrl.searchParams.set('code_challenge', codeChallenge);
    authorizeUrl.searchParams.set('code_challenge_method', 'S256');

    const authRes = await fetch(authorizeUrl.toString(), { redirect: 'manual' });
    expect(authRes.status).toBe(302);
    const location = authRes.headers.get('location')!;
    expect(location).toContain('https://gemini.google.com/oauth/callback');

    const redirectParsed = new URL(location);
    const code = redirectParsed.searchParams.get('code')!;
    expect(code).toBeTruthy();
    expect(redirectParsed.searchParams.get('state')).toBe('xyz-state-99');

    mockBackendFetch.mockResolvedValueOnce({
      ok: true,
      status: 200,
      json: async () => ({
        valid: true,
        clientId: 'token-uuid-1',
        accessToken: 'eyJ.verified.mcp.jwt',
      }),
    });

    const tokenRes = await fetch(`${serverUrl}/token`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        grant_type: 'authorization_code',
        code,
        client_id: 'token-uuid-1',
        client_secret: 'eyJ.verified.mcp.jwt',
        code_verifier: codeVerifier,
      }).toString(),
    });

    expect(tokenRes.status).toBe(200);
    const tokenData = (await tokenRes.json()) as any;
    expect(tokenData.access_token).toBe('eyJ.verified.mcp.jwt');
    expect(tokenData.token_type).toBe('Bearer');
    expect(mockBackendFetch).toHaveBeenCalledWith(
      'http://localhost:3001/auth/mcp-oauth/verify',
      expect.objectContaining({
        method: 'POST',
      }),
    );
  });

  it('returns 401 with WWW-Authenticate header when accessing /mcp without credentials', async () => {
    const res = await fetch(`${serverUrl}/mcp`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ jsonrpc: '2.0', id: 1, method: 'initialize' }),
    });

    expect(res.status).toBe(401);
    expect(res.headers.get('www-authenticate')).toContain('/.well-known/oauth-protected-resource');
  });

  it('connects an MCP Client over StreamableHTTPClientTransport, lists 31 tools, and calls a tool', async () => {
    mockBackendFetch.mockResolvedValueOnce({
      ok: true,
      status: 200,
      headers: { get: () => 'application/json' },
      json: async () => [{ id: 'acc-http-1', name: 'Conta HTTP Gemini', currentBalance: '9800.00' }],
    });

    const transport = new StreamableHTTPClientTransport(new URL(`${serverUrl}/mcp`), {
      requestInit: {
        headers: {
          Authorization: 'Bearer mcp-http-jwt-token',
        },
      },
    });

    const client = new Client({
      name: 'gemini-remote-mcp-client',
      version: '1.0.0',
    });

    await client.connect(transport);

    const toolsList = await client.listTools();
    expect(toolsList.tools).toHaveLength(31);

    const toolRes = await client.callTool({
      name: 'list_accounts',
      arguments: {},
    });

    const content = toolRes.content as Array<{ type: string; text: string }>;
    expect(content[0].text).toContain('Conta HTTP Gemini');
    expect(mockBackendFetch).toHaveBeenCalledWith(
      'http://localhost:3001/accounts?familyId=fam-http-01',
      expect.objectContaining({
        headers: expect.objectContaining({
          Authorization: 'Bearer mcp-http-jwt-token',
        }),
      }),
    );

    await client.close();
  });
});
