'use client';

import React, { useEffect, useState } from 'react';
import AppShell from '../../components/layout/AppShell';
import { useAuth } from '../../context/AuthContext';
import { apiRequest } from '../../lib/api';
import { formatCurrency } from '../../lib/formatters';
import {
  Plus,
  PieChart as PieIcon,
  AlertTriangle,
  CheckCircle2,
  Trash2,
  X,
} from 'lucide-react';

export default function BudgetsPage() {
  const { user, selectedFamilyId } = useAuth();
  const [loading, setLoading] = useState(true);
  const [budgets, setBudgets] = useState<any[]>([]);
  const [categories, setCategories] = useState<any[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);

  const now = new Date();
  const currentMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  const [periodMonth, setPeriodMonth] = useState(currentMonth);

  // Form State
  const [categoryId, setCategoryId] = useState('');
  const [targetAmount, setTargetAmount] = useState('');
  const [alertPercentage, setAlertPercentage] = useState(80);
  const [submitting, setSubmitting] = useState(false);

  const loadData = async () => {
    setLoading(true);
    try {
      const params: any = { periodMonth };
      if (selectedFamilyId) params.familyId = selectedFamilyId;

      const [bData, cData] = await Promise.all([
        apiRequest('/budgets', { params }),
        apiRequest('/categories', { params: { type: 'EXPENSE', familyId: selectedFamilyId || undefined } }),
      ]);
      setBudgets(bData || []);
      setCategories(cData || []);
      if (cData && cData.length > 0) setCategoryId(cData[0].id);
    } catch (err) {
      console.error('Error loading budgets data:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (user) {
      loadData();
    }
  }, [user, selectedFamilyId, periodMonth]);

  const handleCreateBudget = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);

    try {
      await apiRequest('/budgets', {
        method: 'POST',
        body: JSON.stringify({
          categoryId,
          periodMonth,
          targetAmount: parseFloat(targetAmount),
          alertPercentage: Number(alertPercentage),
          familyId: selectedFamilyId || undefined,
        }),
      });

      setIsModalOpen(false);
      setTargetAmount('');
      loadData();
    } catch (err: any) {
      alert(err.message || 'Erro ao criar orçamento');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Deseja excluir este orçamento?')) return;
    try {
      await apiRequest(`/budgets/${id}`, { method: 'DELETE' });
      loadData();
    } catch (err: any) {
      alert(err.message || 'Erro ao excluir orçamento');
    }
  };

  return (
    <AppShell>
      <div className="space-y-6 sm:space-y-8">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-xl sm:text-2xl font-bold text-white tracking-tight">Orçamentos & Tetos de Gastos</h1>
            <p className="text-xs sm:text-sm text-slate-400">
              Defina limites mensais por categoria e receba alertas automáticos ao atingir 80% ou 100%
            </p>
          </div>

          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5 sm:gap-3">
            <input
              type="month"
              value={periodMonth}
              onChange={(e) => setPeriodMonth(e.target.value)}
              className="bg-slate-900 border border-slate-700/80 rounded-xl px-3.5 py-2 text-xs sm:text-sm text-white focus:outline-none focus:ring-2 focus:ring-emerald-500 font-medium cursor-pointer w-full sm:w-auto"
            />
            <button
              onClick={() => setIsModalOpen(true)}
              className="inline-flex items-center justify-center gap-2 bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-600 hover:to-teal-600 text-slate-950 font-semibold px-4 py-2.5 rounded-xl text-xs sm:text-sm shadow-lg shadow-emerald-500/20 transition-all w-full sm:w-auto"
            >
              <Plus className="h-4 w-4 shrink-0" />
              <span>Novo Teto de Gastos</span>
            </button>
          </div>
        </div>

        {/* Budgets Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
          {loading ? (
            <div className="col-span-full py-12 text-center text-slate-500 text-xs sm:text-sm">Carregando orçamentos...</div>
          ) : budgets.length === 0 ? (
            <div className="col-span-full py-12 text-center text-slate-500 bg-slate-900/40 border border-slate-800/80 rounded-2xl text-xs sm:text-sm">
              Nenhum orçamento configurado para o mês selecionado.
            </div>
          ) : (
            budgets.map((b) => {
              const pct = b.percentage || 0;
              const isExceeded = b.isExceeded;
              const isAlert = b.isAlert && !isExceeded;

              return (
                <div
                  key={b.id}
                  className={`bg-slate-900/80 border rounded-2xl p-4 sm:p-6 relative flex flex-col justify-between shadow-xl transition-all ${
                    isExceeded
                      ? 'border-rose-500/60 bg-rose-950/10'
                      : isAlert
                      ? 'border-amber-500/60 bg-amber-950/10'
                      : 'border-slate-800'
                  }`}
                >
                  <div>
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-center gap-2.5 sm:gap-3 min-w-0">
                        <div
                          className="h-10 w-10 rounded-xl flex items-center justify-center shadow shrink-0"
                          style={{
                            backgroundColor: `${b.category?.color || '#3b82f6'}20`,
                            color: b.category?.color || '#3b82f6',
                          }}
                        >
                          <PieIcon className="h-5 w-5" />
                        </div>
                        <div className="min-w-0">
                          <h3 className="font-bold text-white text-base sm:text-lg leading-tight truncate">{b.category?.name}</h3>
                          <span className="text-xs text-slate-400">Mês: {b.periodMonth}</span>
                        </div>
                      </div>

                      <button
                        onClick={() => handleDelete(b.id)}
                        className="p-1.5 text-slate-500 hover:text-rose-400 hover:bg-slate-800 rounded-lg transition-colors shrink-0"
                        title="Excluir orçamento"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>

                    {/* Progress Bar & Amounts */}
                    <div className="mt-4 sm:mt-6 pt-3 sm:pt-4 border-t border-slate-800/80 space-y-2">
                      <div className="flex justify-between items-center text-xs gap-2">
                        <span className="text-slate-400">Gasto: <strong className="text-white">{formatCurrency(b.spentAmount)}</strong></span>
                        <span
                          className={`font-bold shrink-0 ${
                            isExceeded ? 'text-rose-400' : isAlert ? 'text-amber-400' : 'text-emerald-400'
                          }`}
                        >
                          {pct}%
                        </span>
                      </div>

                      <div className="w-full bg-slate-800 h-2.5 rounded-full overflow-hidden">
                        <div
                          className={`h-full rounded-full transition-all duration-500 ${
                            isExceeded ? 'bg-rose-500' : isAlert ? 'bg-amber-500' : 'bg-emerald-500'
                          }`}
                          style={{ width: `${Math.min(100, pct)}%` }}
                        ></div>
                      </div>

                      <div className="flex flex-col sm:flex-row justify-between text-xs pt-1 gap-1">
                        <span className="text-slate-400">Teto: {formatCurrency(b.targetAmount)}</span>
                        <span
                          className={`font-semibold ${
                            Number(b.remainingAmount) < 0 ? 'text-rose-400' : 'text-slate-300'
                          }`}
                        >
                          {Number(b.remainingAmount) < 0 ? 'Excedido:' : 'Restante:'}{' '}
                          {formatCurrency(Math.abs(Number(b.remainingAmount)))}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Status Banner */}
                  <div className="mt-4 pt-3 border-t border-slate-800/60 flex items-center justify-between text-xs">
                    {isExceeded ? (
                      <span className="inline-flex items-center gap-1.5 text-rose-400 font-semibold truncate">
                        <AlertTriangle className="h-3.5 w-3.5 shrink-0" />
                        Teto ultrapassado!
                      </span>
                    ) : isAlert ? (
                      <span className="inline-flex items-center gap-1.5 text-amber-400 font-semibold truncate">
                        <AlertTriangle className="h-3.5 w-3.5 shrink-0" />
                        Alerta de {b.alertPercentage}% atingido
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1.5 text-emerald-400 font-semibold truncate">
                        <CheckCircle2 className="h-3.5 w-3.5 shrink-0" />
                        Dentro do planejado
                      </span>
                    )}
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Create Modal */}
        {isModalOpen && (
          <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-3 sm:p-4 overflow-y-auto">
            <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-md max-h-[90vh] overflow-y-auto p-4 sm:p-6 shadow-2xl relative my-auto">
              <button
                onClick={() => setIsModalOpen(false)}
                className="absolute right-3.5 top-3.5 text-slate-400 hover:text-white p-1.5 rounded-lg hover:bg-slate-800 transition-colors"
                aria-label="Fechar"
              >
                <X className="h-5 w-5" />
              </button>

              <h2 className="text-lg sm:text-xl font-bold text-white mb-4 pr-6">Novo Teto Orçamentário</h2>

              <form onSubmit={handleCreateBudget} className="space-y-3.5 sm:space-y-4">
                <div>
                  <label className="block text-xs font-semibold uppercase text-slate-400 mb-1">Categoria de Despesa *</label>
                  <select
                    value={categoryId}
                    onChange={(e) => setCategoryId(e.target.value)}
                    required
                    className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-xs sm:text-sm text-white focus:outline-none focus:ring-2 focus:ring-emerald-500 cursor-pointer"
                  >
                    {categories.map((cat) => (
                      <option key={cat.id} value={cat.id}>
                        {cat.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold uppercase text-slate-400 mb-1">Mês de Referência *</label>
                  <input
                    type="month"
                    required
                    value={periodMonth}
                    onChange={(e) => setPeriodMonth(e.target.value)}
                    className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3.5 py-2 text-xs sm:text-sm text-white focus:outline-none focus:ring-2 focus:ring-emerald-500 cursor-pointer"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold uppercase text-slate-400 mb-1">Teto Máximo (R$) *</label>
                  <input
                    type="number"
                    step="0.01"
                    required
                    min="1"
                    value={targetAmount}
                    onChange={(e) => setTargetAmount(e.target.value)}
                    placeholder="0,00"
                    className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3.5 py-2 text-xs sm:text-sm text-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold uppercase text-slate-400 mb-1">Percentual de Alerta (%)</label>
                  <input
                    type="number"
                    min="10"
                    max="99"
                    value={alertPercentage}
                    onChange={(e) => setAlertPercentage(parseInt(e.target.value) || 80)}
                    className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3.5 py-2 text-xs sm:text-sm text-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                </div>

                <button
                  type="submit"
                  disabled={submitting}
                  className="w-full mt-4 bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-600 hover:to-teal-600 text-slate-950 font-bold py-2.5 sm:py-3 px-4 rounded-xl shadow-lg shadow-emerald-500/20 transition-all disabled:opacity-50 text-xs sm:text-sm"
                >
                  {submitting ? 'Salvando...' : 'Salvar Teto Orçamentário'}
                </button>
              </form>
            </div>
          </div>
        )}
      </div>
    </AppShell>
  );
}
