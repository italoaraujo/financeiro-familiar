import { McpConfig } from '../config';

export type QueryParams = Record<string, string | number | boolean | undefined | null>;

export interface ApiRequestOptions {
  method?: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';
  params?: QueryParams;
  body?: unknown;
}

export interface McpToolResponse {
  [key: string]: unknown;
  content: Array<{ type: 'text'; text: string }>;
  isError?: boolean;
}

export class ApiClientError extends Error {
  constructor(
    public readonly statusCode: number,
    message: string,
  ) {
    super(message);
    this.name = 'ApiClientError';
  }
}

export class FinancialApiClient {
  private cachedToken?: string;

  constructor(
    private readonly config: McpConfig,
    private readonly fetchFn: typeof fetch = globalThis.fetch,
  ) {
    if (config.apiToken) {
      this.cachedToken = config.apiToken;
    }
  }

  public getConfig(): McpConfig {
    return this.config;
  }

  private buildUrl(endpoint: string, params?: QueryParams): string {
    const normalizedPath = endpoint.startsWith('/') ? endpoint : `/${endpoint}`;
    let url = `${this.config.apiUrl}${normalizedPath}`;

    if (params) {
      const searchParams = new URLSearchParams();
      for (const [key, value] of Object.entries(params)) {
        if (value !== undefined && value !== null && value !== '') {
          searchParams.append(key, String(value));
        }
      }
      const qs = searchParams.toString();
      if (qs) {
        url += `?${qs}`;
      }
    }

    return url;
  }

  private async ensureAuthenticated(forceRefresh = false): Promise<string> {
    if (this.config.apiToken && !forceRefresh) {
      return this.config.apiToken;
    }

    if (this.cachedToken && !forceRefresh) {
      return this.cachedToken;
    }

    if (!this.config.userEmail || !this.config.userPassword) {
      if (this.config.apiToken) {
        return this.config.apiToken;
      }
      throw new Error(
        'Credenciais MCP não configuradas. Defina MCP_API_TOKEN (gerado na tela web "/mcp") ou MCP_USER_EMAIL e MCP_USER_PASSWORD.',
      );
    }

    const loginUrl = this.buildUrl('/auth/login');
    const response = await this.executeFetch(loginUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: this.config.userEmail,
        password: this.config.userPassword,
      }),
    });

    const data = await this.parseResponse<{ accessToken?: string; message?: string | string[] }>(
      response,
    );

    if (!response.ok || !data?.accessToken) {
      const errMsg = this.extractErrorMessage(data, response.status);
      throw new ApiClientError(response.status, `Falha na autenticação MCP: ${errMsg}`);
    }

    this.cachedToken = data.accessToken;
    return this.cachedToken;
  }

  private async executeFetch(url: string, init: RequestInit): Promise<Response> {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), this.config.httpTimeoutMs);
    try {
      return await this.fetchFn(url, {
        ...init,
        signal: controller.signal,
      });
    } catch (err: any) {
      if (err?.name === 'AbortError') {
        throw new Error(
          `Timeout excedido (${this.config.httpTimeoutMs}ms) ao comunicar com a API financeira.`,
        );
      }
      throw err;
    } finally {
      clearTimeout(timer);
    }
  }

  private async parseResponse<T>(response: Response): Promise<T> {
    const contentType = response.headers?.get?.('content-type') || '';
    if (contentType.includes('text/csv') || contentType.includes('text/plain')) {
      return (await response.text()) as unknown as T;
    }
    try {
      return (await response.json()) as T;
    } catch {
      return {} as T;
    }
  }

  private extractErrorMessage(data: any, status: number): string {
    if (data && typeof data === 'object') {
      if (Array.isArray(data.message)) {
        return data.message.join(', ');
      }
      if (typeof data.message === 'string' && data.message.trim()) {
        return data.message;
      }
    }
    return `Erro na requisição HTTP ${status}`;
  }

  public async request<T = any>(endpoint: string, options: ApiRequestOptions = {}): Promise<T> {
    const { method = 'GET', params, body } = options;
    const token = await this.ensureAuthenticated(false);
    const url = this.buildUrl(endpoint, params);

    const makeCall = async (bearerToken: string) =>
      this.executeFetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${bearerToken}`,
        },
        ...(body !== undefined ? { body: JSON.stringify(body) } : {}),
      });

    let response = await makeCall(token);

    // Retry once on 401 if email/password fallback credentials are available
    if (
      response.status === 401 &&
      !this.config.apiToken &&
      this.config.userEmail &&
      this.config.userPassword
    ) {
      const freshToken = await this.ensureAuthenticated(true);
      response = await makeCall(freshToken);
    }

    const data = await this.parseResponse<T>(response);

    if (!response.ok) {
      throw new ApiClientError(response.status, this.extractErrorMessage(data, response.status));
    }

    return data;
  }

  public get<T = any>(endpoint: string, params?: QueryParams): Promise<T> {
    return this.request<T>(endpoint, { method: 'GET', params });
  }

  public post<T = any>(endpoint: string, body?: unknown, params?: QueryParams): Promise<T> {
    return this.request<T>(endpoint, { method: 'POST', body, params });
  }

  public put<T = any>(endpoint: string, body?: unknown, params?: QueryParams): Promise<T> {
    return this.request<T>(endpoint, { method: 'PUT', body, params });
  }

  public patch<T = any>(endpoint: string, body?: unknown, params?: QueryParams): Promise<T> {
    return this.request<T>(endpoint, { method: 'PATCH', body, params });
  }

  public delete<T = any>(endpoint: string, params?: QueryParams): Promise<T> {
    return this.request<T>(endpoint, { method: 'DELETE', params });
  }
}

export function formatToolResult(data: unknown): McpToolResponse {
  const text = typeof data === 'string' ? data : JSON.stringify(data, null, 2);
  return {
    content: [{ type: 'text', text }],
  };
}

export function formatToolError(error: unknown): McpToolResponse {
  if (error instanceof ApiClientError) {
    return {
      isError: true,
      content: [
        {
          type: 'text',
          text: `Erro da API (HTTP ${error.statusCode}): ${error.message}`,
        },
      ],
    };
  }

  const message = error instanceof Error ? error.message : String(error);
  return {
    isError: true,
    content: [
      {
        type: 'text',
        text: `Erro: ${message}`,
      },
    ],
  };
}
