import * as http from 'node:http';
import * as crypto from 'node:crypto';
import { StreamableHTTPServerTransport } from '@modelcontextprotocol/sdk/server/streamableHttp.js';
import { SSEServerTransport } from '@modelcontextprotocol/sdk/server/sse.js';
import { McpConfig, loadConfig } from './config';
import { createFinancialMcpServer } from './server';

interface PendingAuthCode {
  clientId: string;
  redirectUri: string;
  codeChallenge?: string;
  codeChallengeMethod?: string;
  accessToken?: string;
  expiresAt: number;
}

interface ActiveStreamableSession {
  transport: StreamableHTTPServerTransport;
  closeServer: () => Promise<void>;
}

interface ActiveSseSession {
  transport: SSEServerTransport;
  closeServer: () => Promise<void>;
}

function setCorsHeaders(res: http.ServerResponse): void {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, DELETE, OPTIONS');
  res.setHeader(
    'Access-Control-Allow-Headers',
    'Content-Type, Authorization, Mcp-Session-Id, Last-Event-ID, Accept',
  );
  res.setHeader('Access-Control-Expose-Headers', 'Mcp-Session-Id');
}

function sendJson(res: http.ServerResponse, statusCode: number, payload: unknown): void {
  setCorsHeaders(res);
  res.statusCode = statusCode;
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  res.end(JSON.stringify(payload));
}

function resolveBaseUrl(req: http.IncomingMessage, config: McpConfig): string {
  if (config.publicUrl) {
    return config.publicUrl.replace(/\/+$/, '');
  }
  const protoHeader = req.headers['x-forwarded-proto'];
  const proto =
    typeof protoHeader === 'string'
      ? protoHeader.split(',')[0].trim()
      : 'http';
  const host = req.headers['x-forwarded-host'] || req.headers.host || `localhost:${config.httpPort || 3333}`;
  return `${proto}://${host}`;
}

async function readRawBody(req: http.IncomingMessage): Promise<string> {
  return new Promise((resolve, reject) => {
    const chunks: Buffer[] = [];
    req.on('data', (chunk: Buffer) => chunks.push(Buffer.from(chunk)));
    req.on('end', () => resolve(Buffer.concat(chunks).toString('utf-8')));
    req.on('error', reject);
  });
}

function parseBody(raw: string, contentType: string): Record<string, any> {
  if (!raw.trim()) {
    return {};
  }
  if (contentType.includes('application/x-www-form-urlencoded')) {
    const params = new URLSearchParams(raw);
    const out: Record<string, string> = {};
    params.forEach((value, key) => {
      out[key] = value;
    });
    return out;
  }
  try {
    return JSON.parse(raw);
  } catch {
    const params = new URLSearchParams(raw);
    const out: Record<string, string> = {};
    params.forEach((value, key) => {
      out[key] = value;
    });
    return out;
  }
}

function extractBasicAuth(req: http.IncomingMessage): { clientId?: string; clientSecret?: string } {
  const auth = req.headers.authorization;
  if (!auth || !auth.toLowerCase().startsWith('basic ')) {
    return {};
  }
  try {
    const decoded = Buffer.from(auth.slice(6).trim(), 'base64').toString('utf-8');
    const sepIndex = decoded.indexOf(':');
    if (sepIndex === -1) {
      return { clientId: decoded };
    }
    return {
      clientId: decodeURIComponent(decoded.slice(0, sepIndex)),
      clientSecret: decodeURIComponent(decoded.slice(sepIndex + 1)),
    };
  } catch {
    return {};
  }
}

function extractBearerOrQueryToken(req: http.IncomingMessage, url: URL): string | undefined {
  const auth = req.headers.authorization;
  if (auth && auth.toLowerCase().startsWith('bearer ')) {
    const token = auth.slice(7).trim();
    if (token) {
      return token;
    }
  }
  const queryToken = url.searchParams.get('token') || url.searchParams.get('apiKey');
  if (queryToken && queryToken.trim()) {
    return queryToken.trim();
  }
  return undefined;
}

function verifyPkceChallenge(
  codeVerifier: string | undefined,
  codeChallenge: string | undefined,
  method: string | undefined,
): boolean {
  if (!codeChallenge) {
    return true;
  }
  if (!codeVerifier) {
    return false;
  }
  if ((method || 'S256').toUpperCase() === 'PLAIN') {
    return codeVerifier === codeChallenge;
  }
  const hash = crypto
    .createHash('sha256')
    .update(codeVerifier)
    .digest('base64')
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '');
  return hash === codeChallenge;
}

export function createHttpMcpServer(
  baseConfig: McpConfig = loadConfig(),
  fetchFn: typeof fetch = globalThis.fetch,
): {
  httpServer: http.Server;
  close: () => Promise<void>;
} {
  const authCodes = new Map<string, PendingAuthCode>();
  const registeredSecrets = new Map<string, string>();
  const streamableSessions = new Map<string, ActiveStreamableSession>();
  const sseSessions = new Map<string, ActiveSseSession>();

  async function verifyClientCredentialsWithBackend(
    clientId: string,
    clientSecret?: string,
  ): Promise<string> {
    const candidateSecret =
      clientSecret?.trim() ||
      registeredSecrets.get(clientId) ||
      baseConfig.apiToken;

    if (!candidateSecret) {
      throw new Error('Chave secreta OAuth (client_secret) ou MCP_API_TOKEN não informada.');
    }

    const verifyUrl = `${baseConfig.apiUrl.replace(/\/+$/, '')}/auth/mcp-oauth/verify`;
    const response = await fetchFn(verifyUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        clientId: clientId || 'mcp-client',
        clientSecret: candidateSecret,
      }),
    });

    if (!response.ok) {
      let errMsg = `HTTP ${response.status}`;
      try {
        const body = (await response.json()) as any;
        if (body?.message) {
          errMsg = Array.isArray(body.message) ? body.message.join(', ') : String(body.message);
        }
      } catch {
        // ignore JSON parse failure
      }
      throw new Error(errMsg);
    }

    const data = (await response.json()) as { accessToken?: string };
    return data.accessToken || candidateSecret;
  }

  const httpServer = http.createServer(async (req, res) => {
    try {
      setCorsHeaders(res);

      if (req.method === 'OPTIONS') {
        res.statusCode = 204;
        res.end();
        return;
      }

      const baseUrl = resolveBaseUrl(req, baseConfig);
      const url = new URL(req.url || '/', baseUrl);
      const pathname = url.pathname.replace(/\/+$/, '') || '/';

      // 1. Health check
      if (req.method === 'GET' && pathname === '/health') {
        sendJson(res, 200, {
          status: 'ok',
          service: 'financeiro-familiar-mcp',
          transport: 'http',
          tools: 31,
          resources: 3,
        });
        return;
      }

      // 2. OAuth 2.0 Protected Resource Metadata (RFC 9728)
      if (
        req.method === 'GET' &&
        (pathname === '/.well-known/oauth-protected-resource' ||
          pathname === '/.well-known/oauth-protected-resource/mcp')
      ) {
        sendJson(res, 200, {
          resource: `${baseUrl}/mcp`,
          authorization_servers: [baseUrl],
          bearer_methods_supported: ['header', 'query'],
          resource_name: 'Sistema de Gestão Financeira Pessoal & Familiar (MCP)',
        });
        return;
      }

      // 3. OAuth 2.0 Authorization Server Metadata (RFC 8414)
      if (
        req.method === 'GET' &&
        (pathname === '/.well-known/oauth-authorization-server' ||
          pathname === '/.well-known/openid-configuration')
      ) {
        sendJson(res, 200, {
          issuer: baseUrl,
          authorization_endpoint: `${baseUrl}/authorize`,
          token_endpoint: `${baseUrl}/token`,
          registration_endpoint: `${baseUrl}/register`,
          response_types_supported: ['code'],
          grant_types_supported: ['authorization_code', 'client_credentials', 'refresh_token'],
          token_endpoint_auth_methods_supported: [
            'client_secret_post',
            'client_secret_basic',
            'none',
          ],
          code_challenge_methods_supported: ['S256', 'plain'],
        });
        return;
      }

      // 4. OAuth 2.0 Dynamic Client Registration (RFC 7591)
      if (req.method === 'POST' && pathname === '/register') {
        const raw = await readRawBody(req);
        const body = parseBody(raw, req.headers['content-type'] || '');
        const clientId = body.client_id || `mcp_client_${crypto.randomUUID()}`;
        const clientSecret = body.client_secret || baseConfig.apiToken || crypto.randomUUID();
        if (body.client_secret) {
          registeredSecrets.set(clientId, body.client_secret);
        }
        sendJson(res, 201, {
          client_id: clientId,
          client_secret: clientSecret,
          client_id_issued_at: Math.floor(Date.now() / 1000),
          client_secret_expires_at: 0,
          redirect_uris: body.redirect_uris || [],
          grant_types: body.grant_types || ['authorization_code', 'client_credentials'],
          response_types: body.response_types || ['code'],
          token_endpoint_auth_method: body.token_endpoint_auth_method || 'client_secret_post',
        });
        return;
      }

      // 5. OAuth 2.0 Authorization Endpoint (/authorize)
      if ((req.method === 'GET' || req.method === 'POST') && pathname === '/authorize') {
        let params: Record<string, string> = {};
        url.searchParams.forEach((v, k) => {
          params[k] = v;
        });
        if (req.method === 'POST') {
          const raw = await readRawBody(req);
          const bodyParams = parseBody(raw, req.headers['content-type'] || '');
          params = { ...params, ...bodyParams };
        }

        const redirectUri = params.redirect_uri;
        const state = params.state;
        const clientId = params.client_id || 'mcp-client';
        const codeChallenge = params.code_challenge;
        const codeChallengeMethod = params.code_challenge_method || 'S256';
        const explicitToken = params.token || params.client_secret || baseConfig.apiToken;

        if (!redirectUri) {
          sendJson(res, 400, {
            error: 'invalid_request',
            error_description: 'Parâmetro redirect_uri é obrigatório.',
          });
          return;
        }

        const code = crypto.randomBytes(24).toString('hex');
        authCodes.set(code, {
          clientId,
          redirectUri,
          codeChallenge,
          codeChallengeMethod,
          accessToken: explicitToken,
          expiresAt: Date.now() + 10 * 60 * 1000,
        });

        const redirectTarget = new URL(redirectUri);
        redirectTarget.searchParams.set('code', code);
        if (state) {
          redirectTarget.searchParams.set('state', state);
        }

        res.statusCode = 302;
        res.setHeader('Location', redirectTarget.toString());
        res.end();
        return;
      }

      // 6. OAuth 2.0 Token Endpoint (/token)
      if (req.method === 'POST' && pathname === '/token') {
        const raw = await readRawBody(req);
        const body = parseBody(raw, req.headers['content-type'] || '');
        const basic = extractBasicAuth(req);

        const grantType = body.grant_type || 'authorization_code';
        const clientId = body.client_id || basic.clientId || 'mcp-client';
        const clientSecret = body.client_secret || basic.clientSecret;

        if (grantType === 'authorization_code') {
          const code = body.code;
          const pending = code ? authCodes.get(code) : undefined;
          if (!pending || pending.expiresAt < Date.now()) {
            sendJson(res, 400, {
              error: 'invalid_grant',
              error_description: 'Código de autorização inválido ou expirado.',
            });
            return;
          }
          authCodes.delete(code);

          if (
            !verifyPkceChallenge(
              body.code_verifier,
              pending.codeChallenge,
              pending.codeChallengeMethod,
            )
          ) {
            sendJson(res, 400, {
              error: 'invalid_grant',
              error_description: 'Falha na verificação PKCE (code_verifier inválido).',
            });
            return;
          }

          try {
            const accessToken = await verifyClientCredentialsWithBackend(
              clientId || pending.clientId,
              clientSecret || pending.accessToken,
            );
            sendJson(res, 200, {
              access_token: accessToken,
              token_type: 'Bearer',
              expires_in: 7776000,
            });
          } catch (err: any) {
            sendJson(res, 401, {
              error: 'invalid_client',
              error_description: err?.message || 'Credenciais OAuth inválidas.',
            });
          }
          return;
        }

        if (grantType === 'client_credentials' || grantType === 'refresh_token') {
          try {
            const accessToken = await verifyClientCredentialsWithBackend(
              clientId,
              clientSecret || body.refresh_token,
            );
            sendJson(res, 200, {
              access_token: accessToken,
              token_type: 'Bearer',
              expires_in: 7776000,
            });
          } catch (err: any) {
            sendJson(res, 401, {
              error: 'invalid_client',
              error_description: err?.message || 'Credenciais OAuth inválidas.',
            });
          }
          return;
        }

        sendJson(res, 400, {
          error: 'unsupported_grant_type',
          error_description: `grant_type "${grantType}" não suportado.`,
        });
        return;
      }

      // 7. Streamable HTTP MCP Endpoint (/mcp)
      if (pathname === '/mcp') {
        const requestToken =
          extractBearerOrQueryToken(req, url) || baseConfig.apiToken;

        const hasFallbackCredentials = Boolean(
          baseConfig.userEmail && baseConfig.userPassword,
        );

        const sessionIdHeader = req.headers['mcp-session-id'];
        const sessionId =
          typeof sessionIdHeader === 'string' ? sessionIdHeader.trim() : undefined;

        if (sessionId && streamableSessions.has(sessionId)) {
          const existing = streamableSessions.get(sessionId)!;
          const raw = req.method === 'POST' ? await readRawBody(req) : '';
          const parsedBody = raw ? parseBody(raw, 'application/json') : undefined;
          await existing.transport.handleRequest(req, res, parsedBody);
          return;
        }

        if (!requestToken && !hasFallbackCredentials) {
          res.setHeader(
            'WWW-Authenticate',
            `Bearer resource_metadata="${baseUrl}/.well-known/oauth-protected-resource"`,
          );
          sendJson(res, 401, {
            error: 'unauthorized',
            message:
              'Autenticação necessária. Conecte via OAuth (ID do cliente + Chave secreta gerados na tela /mcp) ou envie Authorization: Bearer <MCP_API_TOKEN>.',
          });
          return;
        }

        const raw = req.method === 'POST' ? await readRawBody(req) : '';
        const parsedBody = raw ? parseBody(raw, 'application/json') : undefined;

        const sessionConfig: McpConfig = {
          ...baseConfig,
          apiToken: requestToken,
        };

        const { server } = createFinancialMcpServer({
          config: sessionConfig,
          fetchFn,
        });

        const transport = new StreamableHTTPServerTransport({
          sessionIdGenerator: () => crypto.randomUUID(),
          onsessioninitialized: (newSessionId: string) => {
            streamableSessions.set(newSessionId, {
              transport,
              closeServer: () => server.close(),
            });
          },
          onsessionclosed: (closedSessionId: string) => {
            streamableSessions.delete(closedSessionId);
          },
        });

        await server.connect(transport);
        await transport.handleRequest(req, res, parsedBody);
        return;
      }

      // 8. Legacy SSE MCP Endpoints (/sse and /messages)
      if (req.method === 'GET' && pathname === '/sse') {
        const requestToken =
          extractBearerOrQueryToken(req, url) || baseConfig.apiToken;
        const hasFallbackCredentials = Boolean(
          baseConfig.userEmail && baseConfig.userPassword,
        );

        if (!requestToken && !hasFallbackCredentials) {
          res.setHeader(
            'WWW-Authenticate',
            `Bearer resource_metadata="${baseUrl}/.well-known/oauth-protected-resource"`,
          );
          sendJson(res, 401, {
            error: 'unauthorized',
            message: 'Autenticação necessária para iniciar stream SSE.',
          });
          return;
        }

        const sessionConfig: McpConfig = {
          ...baseConfig,
          apiToken: requestToken,
        };
        const { server } = createFinancialMcpServer({
          config: sessionConfig,
          fetchFn,
        });

        const transport = new SSEServerTransport('/messages', res);
        sseSessions.set(transport.sessionId, {
          transport,
          closeServer: () => server.close(),
        });
        transport.onclose = () => {
          sseSessions.delete(transport.sessionId);
        };

        await server.connect(transport);
        return;
      }

      if (req.method === 'POST' && pathname === '/messages') {
        const sessionId = url.searchParams.get('sessionId') || '';
        const session = sseSessions.get(sessionId);
        if (!session) {
          sendJson(res, 404, { error: 'Sessão SSE não encontrada' });
          return;
        }
        const raw = await readRawBody(req);
        const parsedBody = raw ? parseBody(raw, 'application/json') : undefined;
        await session.transport.handlePostMessage(req, res, parsedBody);
        return;
      }

      sendJson(res, 404, {
        error: 'not_found',
        message: 'Rota não encontrada. Use /mcp (Streamable HTTP), /sse (SSE) ou /health.',
      });
    } catch (error: any) {
      if (!res.headersSent) {
        sendJson(res, 500, {
          error: 'internal_error',
          message: error?.message || 'Erro interno no servidor MCP HTTP',
        });
      }
    }
  });

  const close = async (): Promise<void> => {
    for (const session of streamableSessions.values()) {
      await session.transport.close().catch(() => undefined);
      await session.closeServer().catch(() => undefined);
    }
    streamableSessions.clear();

    for (const session of sseSessions.values()) {
      await session.transport.close().catch(() => undefined);
      await session.closeServer().catch(() => undefined);
    }
    sseSessions.clear();

    await new Promise<void>((resolve) => {
      httpServer.close(() => resolve());
    });
  };

  return { httpServer, close };
}

export async function startHttpMcpServer(
  config: McpConfig = loadConfig(),
): Promise<{ httpServer: http.Server; close: () => Promise<void> }> {
  const port = config.httpPort || 3333;
  const host = config.httpHost || '0.0.0.0';
  const instance = createHttpMcpServer(config);

  await new Promise<void>((resolve, reject) => {
    instance.httpServer.once('error', reject);
    instance.httpServer.listen(port, host, () => {
      console.error(
        `[financeiro-familiar-mcp] Servidor MCP HTTP/OAuth iniciado em http://${host}:${port}/mcp`,
      );
      resolve();
    });
  });

  return instance;
}
