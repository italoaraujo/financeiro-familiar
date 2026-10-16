#!/usr/bin/env node
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { createFinancialMcpServer } from './server';

export async function main(): Promise<void> {
  const { server } = createFinancialMcpServer();
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
