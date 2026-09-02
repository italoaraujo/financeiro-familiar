'use client';

import React, { useEffect, useState } from 'react';
import AppShell from '../../components/layout/AppShell';
import { useAuth } from '../../context/AuthContext';
import { apiRequest } from '../../lib/api';
import { formatCurrency } from '../../lib/formatters';
import { Plus, Wallet, Archive, Trash2, X, Building, CheckCircle2, AlertCircle } from 'lucide-react';

export default function AccountsPage() {
  const { user, selectedFamilyId } = useAuth();
  const [loading, setLoading] = useState(true);
  const [accounts, setAccounts] = useState<any[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);

  // Form State
  const [name, setName] = useState('');
  const [type, setType] = useState('CHECKING');
  const [initialBalance, setInitialBalance] = useState('');
  const [color, setColor] = useState('#10b981');
  const [submitting, setSubmitting] = useState(false);

  const loadAccounts = async () => {
    setLoading(true);
    try {
      const params: any = selectedFamilyId ? { familyId: selectedFamilyId } : {};
      const data = await apiRequest('/accounts', { params });
      setAccounts(data || []);
    } catch (err) {
      console.error('Error loading accounts:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (user) {
      loadAccounts();
    }
  }, [user, selectedFamilyId]);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);

    try {
      await apiRequest('/accounts', {
        method: 'POST',
        body: JSON.stringify({
          name,
          type,
          initialBalance: parseFloat(initialBalance) || 0,
          color,
          familyId: selectedFamilyId || undefined,
        }),
      });

      setIsModalOpen(false);
      setName('');
      setInitialBalance('');
      loadAccounts();
    } catch (err: any) {
      alert(err.message || 'Erro ao criar conta');
    } finally {
      setSubmitting(false);
    }
  };

  const handleArchive = async (id: string) => {
    if (!confirm('Deseja arquivar esta conta? Ela não aparecerá no painel ativo, mas o histórico será preservado.')) {
      return;
    }
    try {
      await apiRequest(`/accounts/${id}/archive`, { method: 'PATCH' });
      loadAccounts();
    } catch (err: any) {
      alert(err.message || 'Erro ao arquivar conta');
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Deseja excluir permanentemente esta conta? (Apenas permitido se não houver transações)')) {
      return;
    }
    try {
      await apiRequest(`/accounts/${id}`, { method: 'DELETE' });
      loadAccounts();
    } catch (err: any) {
      alert(err.message || 'Erro ao excluir conta');
    }
  };

  const getTypeName = (t: string) => {
    switch (t) {
      case 'CHECKING':
        return 'Conta Corrente';
      case 'SAVINGS':
        return 'Poupança';
      case 'INVESTMENT':
        return 'Investimentos';
      case 'CASH':
        return 'Dinheiro Físico / Carteira';
      default:
        return 'Outro';
    }
  };

  const totalBalance = accounts.reduce((acc, a) => acc + Number(a.currentBalance || 0), 0);

  return (
    <AppShell>
      <div className="space-y-8">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-white tracking-tight">Contas Bancárias & Carteiras</h1>
            <p className="text-sm text-slate-400">
              Gerencie suas contas correntes, investimentos e saldos disponíveis
            </p>
          </div>

          <button
            onClick={() => setIsModalOpen(true)}
            className="inline-flex items-center justify-center gap-2 bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-600 hover:to-teal-600 text-slate-950 font-semibold px-4 py-2.5 rounded-xl text-sm shadow-lg shadow-emerald-500/20 transition-all"
          >
            <Plus className="h-4 w-4" />
            <span>Nova Conta</span>
          </button>
        </div>

        {/* Total Summary Banner */}
        <div className="bg-gradient-to-r from-slate-900 to-slate-900/80 border border-slate-800 rounded-2xl p-6 flex items-center justify-between shadow-xl">
          <div className="flex items-center gap-4">
            <div className="h-12 w-12 rounded-xl bg-emerald-500/10 text-emerald-400 flex items-center justify-center">
              <Wallet className="h-6 w-6" />
            </div>
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">Saldo Total Consolidado</p>
              <h2 className="text-2xl sm:text-3xl font-bold text-white mt-0.5">{formatCurrency(totalBalance)}</h2>
            </div>
          </div>
          <span className="text-xs text-slate-400 font-medium">
            {accounts.length} {accounts.length === 1 ? 'conta ativa' : 'contas ativas'}
          </span>
        </div>

        {/* Accounts Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {loading ? (
            <div className="col-span-full py-12 text-center text-slate-500">Carregando contas...</div>
          ) : accounts.length === 0 ? (
            <div className="col-span-full py-12 text-center text-slate-500 bg-slate-900/40 border border-slate-800/80 rounded-2xl">
              Nenhuma conta cadastrada no momento.
            </div>
          ) : (
            accounts.map((acc) => (
              <div
                key={acc.id}
                className="bg-slate-900/80 border border-slate-800 rounded-2xl p-6 relative group hover:border-slate-700 transition-all flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-3">
                      <span
                        className="h-4 w-4 rounded-full shrink-0 shadow"
                        style={{ backgroundColor: acc.color || '#10b981' }}
                      ></span>
                      <div>
                        <h3 className="font-bold text-white text-lg leading-tight">{acc.name}</h3>
                        <span className="text-xs text-slate-400">{getTypeName(acc.type)}</span>
                      </div>
                    </div>

                    <div className="flex items-center gap-1 opacity-60 group-hover:opacity-100 transition-opacity">
                      <button
                        onClick={() => handleArchive(acc.id)}
                        title="Arquivar conta"
                        className="p-1.5 text-slate-400 hover:text-amber-400 hover:bg-slate-800 rounded-lg"
                      >
                        <Archive className="h-4 w-4" />
                      </button>
                      <button
                        onClick={() => handleDelete(acc.id)}
                        title="Excluir conta"
                        className="p-1.5 text-slate-400 hover:text-rose-400 hover:bg-slate-800 rounded-lg"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </div>

                  <div className="mt-6 pt-4 border-t border-slate-800/80">
                    <span className="text-xs text-slate-400 font-medium">Saldo Atual</span>
                    <p
                      className={`text-2xl font-extrabold mt-1 ${
                        Number(acc.currentBalance) >= 0 ? 'text-white' : 'text-rose-400'
                      }`}
                    >
                      {formatCurrency(acc.currentBalance)}
                    </p>
                  </div>
                </div>

                <div className="mt-4 pt-3 text-xs text-slate-500 flex justify-between items-center">
                  <span>Moeda: {acc.currency || 'BRL'}</span>
                  <span>Inicial: {formatCurrency(acc.initialBalance)}</span>
                </div>
              </div>
            ))
          )}
        </div>

        {/* Create Modal */}
        {isModalOpen && (
          <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
            <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-md p-6 shadow-2xl relative">
              <button
                onClick={() => setIsModalOpen(false)}
                className="absolute right-4 top-4 text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800"
              >
                <X className="h-5 w-5" />
              </button>

              <h2 className="text-xl font-bold text-white mb-4">Nova Conta Bancária / Carteira</h2>

              <form onSubmit={handleCreate} className="space-y-4">
                <div>
                  <label className="block text-xs font-semibold uppercase text-slate-400 mb-1">Nome da Conta *</label>
                  <input
                    type="text"
                    required
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="Ex: Nubank, Itaú, Carteira física..."
                    className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold uppercase text-slate-400 mb-1">Tipo de Conta *</label>
                  <select
                    value={type}
                    onChange={(e) => setType(e.target.value)}
                    className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  >
                    <option value="CHECKING">Conta Corrente</option>
                    <option value="SAVINGS">Poupança</option>
                    <option value="INVESTMENT">Investimento</option>
                    <option value="CASH">Dinheiro / Carteira</option>
                    <option value="OTHER">Outro</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold uppercase text-slate-400 mb-1">Saldo Inicial (R$)</label>
                  <input
                    type="number"
                    step="0.01"
                    value={initialBalance}
                    onChange={(e) => setInitialBalance(e.target.value)}
                    placeholder="0,00"
                    className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-2 text-sm text-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold uppercase text-slate-400 mb-1">Cor Identificadora</label>
                  <div className="flex items-center gap-3">
                    <input
                      type="color"
                      value={color}
                      onChange={(e) => setColor(e.target.value)}
                      className="h-10 w-16 bg-slate-800 border border-slate-700 rounded-lg cursor-pointer"
                    />
                    <span className="text-xs text-slate-400">{color}</span>
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={submitting}
                  className="w-full mt-4 bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-600 hover:to-teal-600 text-slate-950 font-bold py-3 px-4 rounded-xl shadow-lg shadow-emerald-500/20 transition-all disabled:opacity-50"
                >
                  {submitting ? 'Criando conta...' : 'Cadastrar Conta'}
                </button>
              </form>
            </div>
          </div>
        )}
      </div>
    </AppShell>
  );
}
