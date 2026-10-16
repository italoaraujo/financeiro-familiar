export type McpTransportMode = 'stdio' | 'http';

export interface McpConfig {
  apiUrl: string;
  apiToken?: string;
  userEmail?: string;
  userPassword?: string;
  defaultFamilyId?: string;
  httpTimeoutMs: number;
  transport?: McpTransportMode;
  httpPort?: number;
  httpHost?: string;
  publicUrl?: string;
}

export function loadConfig(
  env: NodeJS.ProcessEnv = process.env,
  argv: string[] = process.argv,
): McpConfig {
  const rawUrl = (env.MCP_API_URL || 'http://localhost:3001').trim();
  const apiUrl = rawUrl.replace(/\/+$/, '') || 'http://localhost:3001';

  const apiToken = env.MCP_API_TOKEN?.trim() || undefined;
  const userEmail = env.MCP_USER_EMAIL?.trim() || undefined;
  const userPassword = env.MCP_USER_PASSWORD || undefined;
  const defaultFamilyId = env.MCP_DEFAULT_FAMILY_ID?.trim() || undefined;

  const parsedTimeout = Number(env.MCP_HTTP_TIMEOUT_MS);
  const httpTimeoutMs =
    Number.isFinite(parsedTimeout) && parsedTimeout > 0 ? parsedTimeout : 15000;

  let transport: McpTransportMode = 'stdio';
  const envTransport = env.MCP_TRANSPORT?.trim().toLowerCase();
  if (envTransport === 'http') {
    transport = 'http';
  }
  if (argv.includes('--http') || argv.includes('--transport=http')) {
    transport = 'http';
  } else if (argv.includes('--stdio') || argv.includes('--transport=stdio')) {
    transport = 'stdio';
  }

  const parsedPort = Number(env.MCP_HTTP_PORT || env.PORT);
  const httpPort =
    Number.isFinite(parsedPort) && parsedPort > 0 && parsedPort <= 65535
      ? parsedPort
      : 3333;

  const httpHost = env.MCP_HTTP_HOST?.trim() || '0.0.0.0';
  const publicUrl = env.MCP_PUBLIC_URL?.trim().replace(/\/+$/, '') || undefined;

  return {
    apiUrl,
    apiToken,
    userEmail,
    userPassword,
    defaultFamilyId,
    httpTimeoutMs,
    transport,
    httpPort,
    httpHost,
    publicUrl,
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
