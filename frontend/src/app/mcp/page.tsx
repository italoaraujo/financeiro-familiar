'use client';

import React, { useEffect, useState } from 'react';
import AppShell from '../../components/layout/AppShell';
import { useAuth } from '../../context/AuthContext';
import { apiRequest } from '../../lib/api';
import { formatDate } from '../../lib/formatters';
import {
  Bot,
  KeyRound,
  Plus,
  Copy,
  Check,
  Trash2,
  ShieldCheck,
  Terminal,
  AlertTriangle,
} from 'lucide-react';

interface McpTokenItem {
  id: string;
  name: string;
  tokenPrefix: string;
  expiresAt: string;
  lastUsedAt?: string | null;
  revokedAt?: string | null;
  createdAt: string;
}

interface CreatedMcpTokenResponse {
  id: string;
  name: string;
  token: string;
  tokenPrefix: string;
  expiresAt: string;
  createdAt: string;
}

export default function McpIntegrationPage() {
  const { user, selectedFamilyId } = useAuth();
  const [tokens, setTokens] = useState<McpTokenItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  // Form state
  const [tokenName, setTokenName] = useState('');
  const [expiresInDays, setExpiresInDays] = useState<number>(90);

  // Newly created token (shown once)
  const [newlyCreatedToken, setNewlyCreatedToken] = useState<CreatedMcpTokenResponse | null>(null);
  const [copiedToken, setCopiedToken] = useState(false);
  const [copiedConfig, setCopiedConfig] = useState(false);

  const apiBaseUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

  const loadTokens = async () => {
    setLoading(true);
    try {
      const data = await apiRequest<McpTokenItem[]>('/auth/mcp-tokens');
      setTokens(Array.isArray(data) ? data : []);
    } catch (err: any) {
      setError(err.message || 'Erro ao carregar tokens MCP');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (user) {
      loadTokens();
    }
  }, [user]);

  const handleCreateToken = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!tokenName.trim()) return;

    setSubmitting(true);
    setError('');
    try {
      const created = await apiRequest<CreatedMcpTokenResponse>('/auth/mcp-tokens', {
        method: 'POST',
        body: JSON.stringify({
          name: tokenName.trim(),
          expiresInDays: Number(expiresInDays),
        }),
      });
      setNewlyCreatedToken(created);
      setTokenName('');
      await loadTokens();
    } catch (err: any) {
      setError(err.message || 'Erro ao gerar token MCP');
    } finally {
      setSubmitting(false);
    }
  };

  const handleRevokeToken = async (id: string, name: string) => {
    if (!window.confirm(`Deseja realmente revogar o token "${name}"? Clientes de IA que utilizam este token perderão o acesso imediatamente.`)) {
      return;
    }

    try {
      await apiRequest(`/auth/mcp-tokens/${id}`, {
        method: 'DELETE',
      });
      if (newlyCreatedToken?.id === id) {
        setNewlyCreatedToken(null);
      }
      await loadTokens();
    } catch (err: any) {
      setError(err.message || 'Erro ao revogar token MCP');
    }
  };

  const buildMcpJsonSnippet = (rawToken: string) => {
    const envBlock: Record<string, string> = {
      MCP_API_URL: apiBaseUrl,
      MCP_API_TOKEN: rawToken,
    };

    if (selectedFamilyId) {
      envBlock.MCP_DEFAULT_FAMILY_ID = selectedFamilyId;
    }

    return JSON.stringify(
      {
        mcpServers: {
          'financeiro-familiar': {
            command: 'node',
            args: ['/var/www/financeiro-familiar/mcp-server/dist/index.js'],
            env: envBlock,
          },
        },
      },
      null,
      2,
    );
  };

  const copyToClipboard = async (text: string, type: 'token' | 'config') => {
    try {
      await navigator.clipboard.writeText(text);
      if (type === 'token') {
        setCopiedToken(true);
        setTimeout(() => setCopiedToken(false), 2500);
      } else {
        setCopiedConfig(true);
        setTimeout(() => setCopiedConfig(false), 2500);
      }
    } catch {
      // Fallback silencioso
    }
  };

  const getTokenStatus = (item: McpTokenItem) => {
    if (item.revokedAt) {
      return {
        label: 'Revogado',
        className: 'bg-rose-500/10 text-rose-400 border-rose-500/20',
      };
    }
    if (new Date(item.expiresAt).getTime() <= Date.now()) {
      return {
        label: 'Expirado',
        className: 'bg-amber-500/10 text-amber-400 border-amber-500/20',
      };
    }
    return {
      label: 'Ativo',
      className: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20',
    };
  };

  return (
    <AppShell>
      <div className="space-y-6 max-w-5xl mx-auto">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold text-white flex items-center gap-3">
              <Bot className="h-7 w-7 text-emerald-400" />
              Integração IA & Servidor MCP
            </h1>
            <p className="text-slate-400 text-sm mt-1">
              Gere tokens de acesso seguros para conectar assistentes de IA (Antigravity, Claude Desktop, Cursor) às suas finanças pessoais e familiares.
            </p>
          </div>
        </div>

        {error && (
          <div className="p-4 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-sm flex items-center gap-2.5">
            <AlertTriangle className="h-4 w-4 shrink-0 text-rose-400" />
            <span>{error}</span>
          </div>
        )}

        {/* Card de Geração de Token */}
        <div className="bg-slate-900/70 border border-slate-800 rounded-2xl p-5 sm:p-6 shadow-xl">
          <div className="flex items-center gap-2.5 mb-4">
            <KeyRound className="h-5 w-5 text-emerald-400" />
            <h2 className="text-lg font-semibold text-white">Gerar Novo Token do MCP</h2>
          </div>

          <form onSubmit={handleCreateToken} className="grid grid-cols-1 sm:grid-cols-12 gap-4 items-end">
            <div className="sm:col-span-6">
              <label className="block text-xs font-medium text-slate-400 mb-1.5">
                Nome do Cliente / Assistente de IA
              </label>
              <input
                type="text"
                required
                maxLength={100}
                value={tokenName}
                onChange={(e) => setTokenName(e.target.value)}
                placeholder="Ex: Antigravity IDE, Claude Desktop, Cursor..."
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-sm text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-emerald-500"
              />
            </div>

            <div className="sm:col-span-3">
              <label className="block text-xs font-medium text-slate-400 mb-1.5">
                Validade do Token
              </label>
              <select
                value={expiresInDays}
                onChange={(e) => setExpiresInDays(Number(e.target.value))}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-sm text-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
              >
                <option value={30}>30 dias</option>
                <option value={90}>90 dias (Recomendado)</option>
                <option value={180}>180 dias</option>
                <option value={365}>365 dias (1 ano)</option>
              </select>
            </div>

            <div className="sm:col-span-3">
              <button
                type="submit"
                disabled={submitting || !tokenName.trim()}
                className="w-full inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 disabled:opacity-50 text-slate-950 font-semibold text-sm transition-colors shadow-lg shadow-emerald-500/20"
              >
                <Plus className="h-4 w-4" />
                {submitting ? 'Gerando...' : 'Gerar Token MCP'}
              </button>
            </div>
          </form>
        </div>

        {/* Banner de Exibição Única do Token Recém-Criado */}
        {newlyCreatedToken && (
          <div className="bg-emerald-950/30 border border-emerald-500/40 rounded-2xl p-5 sm:p-6 space-y-4 shadow-xl">
            <div className="flex items-start justify-between gap-4">
              <div className="flex items-center gap-2.5">
                <ShieldCheck className="h-5 w-5 text-emerald-400 shrink-0" />
                <div>
                  <h3 className="text-base font-semibold text-emerald-300">
                    Token &ldquo;{newlyCreatedToken.name}&rdquo; gerado com sucesso!
                  </h3>
                  <p className="text-xs text-emerald-200/80 mt-0.5">
                    Copie seu token agora. Por motivos de segurança, o token completo não será exibido novamente.
                  </p>
                </div>
              </div>
              <button
                onClick={() => setNewlyCreatedToken(null)}
                className="text-xs text-slate-400 hover:text-white underline"
              >
                Ocultar
              </button>
            </div>

            {/* Token Bruto */}
            <div className="space-y-1.5">
              <label className="block text-xs font-medium text-emerald-300">
                1. Seu Token de Acesso (`MCP_API_TOKEN`):
              </label>
              <div className="flex items-center gap-2">
                <code className="flex-1 bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-xs font-mono text-emerald-300 break-all">
                  {newlyCreatedToken.token}
                </code>
                <button
                  type="button"
                  onClick={() => copyToClipboard(newlyCreatedToken.token, 'token')}
                  className="inline-flex items-center gap-1.5 px-3.5 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-medium shrink-0 transition-colors"
                >
                  {copiedToken ? <Check className="h-4 w-4 text-emerald-400" /> : <Copy className="h-4 w-4" />}
                  {copiedToken ? 'Copiado!' : 'Copiar Token'}
                </button>
              </div>
            </div>

            {/* Snippet JSON Pronto */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <label className="text-xs font-medium text-emerald-300 flex items-center gap-1.5">
                  <Terminal className="h-3.5 w-3.5" />
                  2. Configuração JSON pronta para colar no seu Assistente de IA (`mcp_config.json`):
                </label>
                <button
                  type="button"
                  onClick={() => copyToClipboard(buildMcpJsonSnippet(newlyCreatedToken.token), 'config')}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-300 text-xs font-medium transition-colors"
                >
                  {copiedConfig ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
                  {copiedConfig ? 'JSON Copiado!' : 'Copiar JSON'}
                </button>
              </div>
              <pre className="bg-slate-950 border border-slate-800 rounded-xl p-4 text-xs font-mono text-slate-200 overflow-x-auto">
                {buildMcpJsonSnippet(newlyCreatedToken.token)}
              </pre>
            </div>
          </div>
        )}

        {/* Lista de Tokens Emitidos */}
        <div className="bg-slate-900/70 border border-slate-800 rounded-2xl overflow-hidden shadow-xl">
          <div className="p-5 sm:p-6 border-b border-slate-800 flex items-center justify-between">
            <div>
              <h2 className="text-lg font-semibold text-white">Tokens MCP Emitidos</h2>
              <p className="text-xs text-slate-400 mt-0.5">
                Gerencie ou revogue o acesso de integrações conectadas à sua conta.
              </p>
            </div>
          </div>

          {loading ? (
            <div className="p-8 text-center text-slate-400 text-sm">Carregando tokens...</div>
          ) : tokens.length === 0 ? (
            <div className="p-8 text-center text-slate-400 text-sm">
              Nenhum token MCP gerado ainda. Utilize o formulário acima para criar seu primeiro token.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-slate-800 text-[11px] font-semibold uppercase tracking-wider text-slate-400 bg-slate-950/40">
                    <th className="py-3.5 px-4 sm:px-6">Integração</th>
                    <th className="py-3.5 px-4">Prefixo</th>
                    <th className="py-3.5 px-4">Criado em</th>
                    <th className="py-3.5 px-4">Expira em</th>
                    <th className="py-3.5 px-4">Status</th>
                    <th className="py-3.5 px-4 sm:px-6 text-right">Ações</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60 text-sm">
                  {tokens.map((item) => {
                    const status = getTokenStatus(item);
                    const isRevoked = Boolean(item.revokedAt);
                    return (
                      <tr key={item.id} className="hover:bg-slate-800/30 transition-colors">
                        <td className="py-3.5 px-4 sm:px-6 font-medium text-white">{item.name}</td>
                        <td className="py-3.5 px-4 font-mono text-xs text-slate-400">{item.tokenPrefix}</td>
                        <td className="py-3.5 px-4 text-slate-300">{formatDate(item.createdAt)}</td>
                        <td className="py-3.5 px-4 text-slate-300">{formatDate(item.expiresAt)}</td>
                        <td className="py-3.5 px-4">
                          <span
                            className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${status.className}`}
                          >
                            {status.label}
                          </span>
                        </td>
                        <td className="py-3.5 px-4 sm:px-6 text-right">
                          {!isRevoked && (
                            <button
                              type="button"
                              onClick={() => handleRevokeToken(item.id, item.name)}
                              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium text-rose-400 hover:bg-rose-500/10 border border-transparent hover:border-rose-500/20 transition-colors"
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                              Revogar
                            </button>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </AppShell>
  );
}
