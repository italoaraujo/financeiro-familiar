export interface McpConfig {
  apiUrl: string;
  apiToken?: string;
  userEmail?: string;
  userPassword?: string;
  defaultFamilyId?: string;
  httpTimeoutMs: number;
}

export function loadConfig(env: NodeJS.ProcessEnv = process.env): McpConfig {
  const rawUrl = (env.MCP_API_URL || 'http://localhost:3001').trim();
  const apiUrl = rawUrl.replace(/\/+$/, '') || 'http://localhost:3001';

  const apiToken = env.MCP_API_TOKEN?.trim() || undefined;
  const userEmail = env.MCP_USER_EMAIL?.trim() || undefined;
  const userPassword = env.MCP_USER_PASSWORD || undefined;
  const defaultFamilyId = env.MCP_DEFAULT_FAMILY_ID?.trim() || undefined;

  const parsedTimeout = Number(env.MCP_HTTP_TIMEOUT_MS);
  const httpTimeoutMs =
    Number.isFinite(parsedTimeout) && parsedTimeout > 0 ? parsedTimeout : 15000;

  return {
    apiUrl,
    apiToken,
    userEmail,
    userPassword,
    defaultFamilyId,
    httpTimeoutMs,
  };
}

export function resolveFamilyId(
  explicitFamilyId: string | undefined,
  config: McpConfig,
): string | undefined {
  if (explicitFamilyId !== undefined) {
    const trimmed = explicitFamilyId.trim();
    if (!trimmed || trimmed.toLowerCase() === 'personal' || trimmed.toLowerCase() === 'none') {
      return undefined;
    }
    return trimmed;
  }
  return config.defaultFamilyId;
}

export function logError(message: string): void {
  process.stderr.write(`[financial-mcp-server] ${message}\n`);
}
