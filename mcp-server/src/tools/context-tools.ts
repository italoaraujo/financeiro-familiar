import { z } from 'zod';
import {
  FinancialApiClient,
  McpToolRegistrar,
  formatToolResult,
  formatToolError,
} from '../http/api-client';
import { McpConfig, resolveFamilyId } from '../config';

export function registerContextTools(
  server: McpToolRegistrar,
  apiClient: FinancialApiClient,
  config: McpConfig,
): void {
  server.tool(
    'get_current_context',
    'Obtém os dados do usuário autenticado, suas famílias vinculadas (com papéis RBAC) e o contexto familiar padrão configurado no MCP.',
    {},
    async () => {
      try {
        const [profile, families] = await Promise.all([
          apiClient.get('/auth/me'),
          apiClient.get('/families'),
        ]);
        return formatToolResult({
          user: profile,
          families,
          defaultFamilyId: config.defaultFamilyId || null,
          activeMode: config.defaultFamilyId ? 'FAMILY' : 'PERSONAL',
        });
      } catch (err) {
        return formatToolError(err);
      }
    },
  );

  server.tool(
    'list_families',
    'Lista todos os grupos familiares dos quais o usuário autenticado faz parte, incluindo seu papel (OWNER, ADMIN, MEMBER, VIEWER).',
    {},
    async () => {
      try {
        const families = await apiClient.get('/families');
        return formatToolResult(families);
      } catch (err) {
        return formatToolError(err);
      }
    },
  );

  server.tool(
    'list_family_people',
    'Lista todas as pessoas (membros com login e dependentes sem login) cadastradas em um grupo familiar para atribuição de lançamentos.',
    {
      familyId: z
        .string()
        .uuid()
        .optional()
        .describe('UUID da família (se omitido, usa MCP_DEFAULT_FAMILY_ID)'),
    },
    async ({ familyId }) => {
      try {
        const resolvedId = resolveFamilyId(familyId, config);
        if (!resolvedId) {
          return formatToolError(
            new Error(
              'Um familyId válido é obrigatório para listar as pessoas do grupo familiar.',
            ),
          );
        }
        const people = await apiClient.get(`/families/${resolvedId}/people`);
        return formatToolResult(people);
      } catch (err) {
        return formatToolError(err);
      }
    },
  );
}
