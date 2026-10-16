#!/usr/bin/env node
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { loadConfig } from './config';
import { createFinancialMcpServer } from './server';
import { startHttpMcpServer } from './http-server';

export async function main(): Promise<void> {
  const config = loadConfig();

  if (config.transport === 'http') {
    await startHttpMcpServer(config);
    return;
  }

  const { server } = createFinancialMcpServer({ config });
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error('[financeiro-familiar-mcp] Servidor MCP iniciado via stdio.');
}

if (require.main === module) {
  main().catch((error) => {
    console.error('[financeiro-familiar-mcp] Erro fatal ao iniciar servidor MCP:', error);
    process.exit(1);
  });
}
