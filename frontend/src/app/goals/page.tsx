'use client';

import React, { useEffect, useState } from 'react';
import AppShell from '../../components/layout/AppShell';
import { useAuth } from '../../context/AuthContext';
import { apiRequest } from '../../lib/api';
import { formatCurrency, formatDate } from '../../lib/formatters';
import {
  Plus,
  PiggyBank,
  CheckCircle2,
  Trash2,
  X,
  Calendar,
} from 'lucide-react';

export default function GoalsPage() {
  const { user, selectedFamilyId } = useAuth();
  const [loading, setLoading] = useState(true);
  const [goals, setGoals] = useState<any[]>([]);
  const [accounts, setAccounts] = useState<any[]>([]);

  // Modals
  const [isGoalModalOpen, setIsGoalModalOpen] = useState(false);
  const [isDepositModalOpen, setIsDepositModalOpen] = useState(false);
  const [selectedGoal, setSelectedGoal] = useState<any>(null);

  // New Goal Form
  const [name, setName] = useState('');
  const [targetAmount, setTargetAmount] = useState('');
  const [deadline, setDeadline] = useState('');
  const [color, setColor] = useState('#10b981');

  // Deposit Form
  const [depositAmount, setDepositAmount] = useState('');
  const [depositAccountId, setDepositAccountId] = useState('');
  const [depositDate, setDepositDate] = useState(new Date().toISOString().split('T')[0]);
  const [depositNotes, setDepositNotes] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const loadData = async () => {
    setLoading(true);
    try {
      const params: any = selectedFamilyId ? { familyId: selectedFamilyId } : {};
      const [gData, aData] = await Promise.all([
        apiRequest('/goals', { params }),
        apiRequest('/accounts', { params }),
      ]);
      setGoals(gData || []);
      setAccounts(aData || []);
      if (aData && aData.length > 0) setDepositAccountId(aData[0].id);
    } catch (err) {
      console.error('Error loading goals data:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (user) {
      loadData();
    }
  }, [user, selectedFamilyId]);

  const handleCreateGoal = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);

    try {
      await apiRequest('/goals', {
        method: 'POST',
        body: JSON.stringify({
          name,
          targetAmount: parseFloat(targetAmount),
          deadline: deadline || undefined,
          color,
          familyId: selectedFamilyId || undefined,
        }),
      });

      setIsGoalModalOpen(false);
      setName('');
      setTargetAmount('');
      setDeadline('');
      loadData();
    } catch (err: any) {
      alert(err.message || 'Erro ao criar meta');
    } finally {
      setSubmitting(false);
    }
  };

  const handleAddDeposit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedGoal) return;
    setSubmitting(true);

    try {
      await apiRequest(`/goals/${selectedGoal.id}/deposits`, {
        method: 'POST',
        body: JSON.stringify({
          amount: parseFloat(depositAmount),
          depositDate,
          accountId: depositAccountId || undefined,
          notes: depositNotes || undefined,
        }),
      });

      setIsDepositModalOpen(false);
      setSelectedGoal(null);
      setDepositAmount('');
      setDepositNotes('');
      loadData();
    } catch (err: any) {
      alert(err.message || 'Erro ao realizar aporte');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Deseja excluir esta meta?')) return;
    try {
      await apiRequest(`/goals/${id}`, { method: 'DELETE' });
      loadData();
    } catch (err: any) {
      alert(err.message || 'Erro ao excluir meta');
    }
  };

  const openDepositModal = (goal: any) => {
    setSelectedGoal(goal);
    setIsDepositModalOpen(true);
  };

  return (
    <AppShell>
      <div className="space-y-6 sm:space-y-8">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-xl sm:text-2xl font-bold text-white tracking-tight">Metas Financeiras & Sonhos</h1>
            <p className="text-xs sm:text-sm text-slate-400">
              Planeje reservas de emergência, viagens e grandes conquistas com aportes recorrentes
            </p>
          </div>

          <button
            onClick={() => setIsGoalModalOpen(true)}
            className="inline-flex items-center justify-center gap-2 bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-600 hover:to-teal-600 text-slate-950 font-semibold px-4 py-2.5 rounded-xl text-xs sm:text-sm shadow-lg shadow-emerald-500/20 transition-all w-full sm:w-auto"
          >
            <Plus className="h-4 w-4 shrink-0" />
            <span>Nova Meta</span>
          </button>
        </div>

        {/* Goals Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
          {loading ? (
            <div className="col-span-full py-12 text-center text-slate-500 text-xs sm:text-sm">Carregando metas...</div>
          ) : goals.length === 0 ? (
            <div className="col-span-full py-12 text-center text-slate-500 bg-slate-900/40 border border-slate-800/80 rounded-2xl text-xs sm:text-sm">
              Nenhuma meta cadastrada no momento. Crie sua primeira reserva ou sonho!
            </div>
          ) : (
            goals.map((goal) => {
              const current = Number(goal.currentAmount || 0);
              const target = Number(goal.targetAmount || 0);
              const pct = target > 0 ? Math.min(100, Math.round((current / target) * 100)) : 0;
              const isCompleted = current >= target;

              return (
                <div
                  key={goal.id}
                  className={`bg-slate-900/80 border rounded-2xl p-4 sm:p-6 relative flex flex-col justify-between shadow-xl transition-all ${
                    isCompleted ? 'border-emerald-500/60 bg-emerald-950/10' : 'border-slate-800'
                  }`}
                >
                  <div>
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-center gap-2.5 sm:gap-3 min-w-0">
                        <div
                          className="h-10 w-10 rounded-xl flex items-center justify-center shadow shrink-0"
                          style={{
                            backgroundColor: `${goal.color || '#10b981'}25`,
                            color: goal.color || '#10b981',
                          }}
                        >
                          <PiggyBank className="h-5 w-5" />
                        </div>
                        <div className="min-w-0">
                          <h3 className="font-bold text-white text-base sm:text-lg leading-tight truncate">{goal.name}</h3>
                          {goal.deadline && (
                            <span className="text-xs text-slate-400 flex items-center gap-1 mt-0.5 truncate">
                              <Calendar className="h-3 w-3 shrink-0" />
                              Prazo: {formatDate(goal.deadline)}
                            </span>
                          )}
                        </div>
                      </div>

                      <button
                        onClick={() => handleDelete(goal.id)}
                        className="p-1.5 text-slate-500 hover:text-rose-400 hover:bg-slate-800 rounded-lg transition-colors shrink-0"
                        title="Excluir meta"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>

                    {/* Progress Bar */}
                    <div className="mt-4 sm:mt-6 pt-3 sm:pt-4 border-t border-slate-800/80 space-y-2">
                      <div className="flex justify-between items-center text-xs gap-2">
                        <span className="text-slate-400">Acumulado: <strong className="text-white">{formatCurrency(current)}</strong></span>
                        <span className="font-bold text-emerald-400 shrink-0">{pct}%</span>
                      </div>

                      <div className="w-full bg-slate-800 h-2.5 rounded-full overflow-hidden">
                        <div
                          className={`h-full rounded-full transition-all duration-500 ${
                            isCompleted ? 'bg-emerald-400' : 'bg-gradient-to-r from-emerald-500 to-teal-400'
                          }`}
                          style={{ width: `${pct}%` }}
                        ></div>
                      </div>

                      <div className="flex flex-col sm:flex-row justify-between text-xs pt-1 gap-1">
                        <span className="text-slate-400">Alvo: {formatCurrency(target)}</span>
                        <span className="text-slate-300">
                          {isCompleted ? 'Meta atingida!' : `Falta: ${formatCurrency(target - current)}`}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Actions & Status */}
                  <div className="mt-4 sm:mt-6 pt-3 sm:pt-4 border-t border-slate-800/60 flex items-center justify-between gap-2">
                    {isCompleted ? (
                      <span className="inline-flex items-center gap-1.5 text-xs text-emerald-400 font-bold truncate">
                        <CheckCircle2 className="h-4 w-4 shrink-0" />
                        Conquistada! 🎉
                      </span>
                    ) : (
                      <button
                        onClick={() => openDepositModal(goal)}
                        className="w-full inline-flex items-center justify-center gap-2 bg-slate-800 hover:bg-slate-700 text-emerald-400 font-semibold py-2 px-3 rounded-xl text-xs transition-all border border-slate-700/80"
                      >
                        <Plus className="h-3.5 w-3.5 shrink-0" />
                        <span>Fazer Aporte</span>
                      </button>
                    )}
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Create Goal Modal */}
        {isGoalModalOpen && (
          <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-3 sm:p-4 overflow-y-auto">
            <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-md max-h-[90vh] overflow-y-auto p-4 sm:p-6 shadow-2xl relative my-auto">
              <button
                onClick={() => setIsGoalModalOpen(false)}
                className="absolute right-3.5 top-3.5 text-slate-400 hover:text-white p-1.5 rounded-lg hover:bg-slate-800 transition-colors"
                aria-label="Fechar"
              >
                <X className="h-5 w-5" />
              </button>

              <h2 className="text-lg sm:text-xl font-bold text-white mb-4 pr-6">Nova Meta Financeira</h2>

              <form onSubmit={handleCreateGoal} className="space-y-3.5 sm:space-y-4">
                <div>
                  <label className="block text-xs font-semibold uppercase text-slate-400 mb-1">Título da Meta *</label>
                  <input
                    type="text"
                    required
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="Ex: Reserva de Emergência, Viagem Europa..."
                    className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3.5 py-2 sm:py-2.5 text-xs sm:text-sm text-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold uppercase text-slate-400 mb-1">Valor Alvo (R$) *</label>
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
                  <label className="block text-xs font-semibold uppercase text-slate-400 mb-1">Data Limite Estimada</label>
                  <input
                    type="date"
                    value={deadline}
                    onChange={(e) => setDeadline(e.target.value)}
                    className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3.5 py-2 text-xs sm:text-sm text-white focus:outline-none focus:ring-2 focus:ring-emerald-500 cursor-pointer"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold uppercase text-slate-400 mb-1">Cor Identificadora</label>
                  <div className="flex items-center gap-3">
                    <input
                      type="color"
                      value={color}
                      onChange={(e) => setColor(e.target.value)}
                      className="h-9 w-14 sm:h-10 sm:w-16 bg-slate-800 border border-slate-700 rounded-lg cursor-pointer"
                    />
                    <span className="text-xs text-slate-400">{color}</span>
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={submitting}
                  className="w-full mt-4 bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-600 hover:to-teal-600 text-slate-950 font-bold py-2.5 sm:py-3 px-4 rounded-xl shadow-lg shadow-emerald-500/20 transition-all disabled:opacity-50 text-xs sm:text-sm"
                >
                  {submitting ? 'Criando meta...' : 'Cadastrar Meta'}
                </button>
              </form>
            </div>
          </div>
        )}

        {/* Deposit Modal */}
        {isDepositModalOpen && (
          <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-3 sm:p-4 overflow-y-auto">
            <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-md max-h-[90vh] overflow-y-auto p-4 sm:p-6 shadow-2xl relative my-auto">
              <button
                onClick={() => setIsDepositModalOpen(false)}
                className="absolute right-3.5 top-3.5 text-slate-400 hover:text-white p-1.5 rounded-lg hover:bg-slate-800 transition-colors"
                aria-label="Fechar"
              >
                <X className="h-5 w-5" />
              </button>

              <h2 className="text-lg sm:text-xl font-bold text-white mb-2 pr-6">Aporte em Meta</h2>
              <p className="text-xs text-slate-400 mb-4">
                Meta: <strong>{selectedGoal?.name}</strong>
              </p>

              <form onSubmit={handleAddDeposit} className="space-y-3.5 sm:space-y-4">
                <div>
                  <label className="block text-xs font-semibold uppercase text-slate-400 mb-1">Valor do Aporte (R$) *</label>
                  <input
                    type="number"
                    step="0.01"
                    required
                    min="0.01"
                    value={depositAmount}
                    onChange={(e) => setDepositAmount(e.target.value)}
                    placeholder="0,00"
                    className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3.5 py-2 text-xs sm:text-sm text-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold uppercase text-slate-400 mb-1">Debitar da Conta</label>
                  <select
                    value={depositAccountId}
                    onChange={(e) => setDepositAccountId(e.target.value)}
                    className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-xs sm:text-sm text-white focus:outline-none focus:ring-2 focus:ring-emerald-500 cursor-pointer"
                  >
                    <option value="">Apenas registrar (sem debitar saldo)</option>
                    {accounts.map((acc) => (
                      <option key={acc.id} value={acc.id}>
                        {acc.name} ({formatCurrency(acc.currentBalance)})
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold uppercase text-slate-400 mb-1">Data do Aporte *</label>
                  <input
                    type="date"
                    required
                    value={depositDate}
                    onChange={(e) => setDepositDate(e.target.value)}
                    className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3.5 py-2 text-xs sm:text-sm text-white focus:outline-none focus:ring-2 focus:ring-emerald-500 cursor-pointer"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold uppercase text-slate-400 mb-1">Observações</label>
                  <input
                    type="text"
                    value={depositNotes}
                    onChange={(e) => setDepositNotes(e.target.value)}
                    placeholder="Ex: Rendimento do mês, bônus..."
                    className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3.5 py-2 text-xs sm:text-sm text-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                </div>

                <button
                  type="submit"
                  disabled={submitting}
                  className="w-full mt-4 bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-600 hover:to-teal-600 text-slate-950 font-bold py-2.5 sm:py-3 px-4 rounded-xl shadow-lg shadow-emerald-500/20 transition-all disabled:opacity-50 text-xs sm:text-sm"
                >
                  {submitting ? 'Registrando aporte...' : 'Confirmar Aporte'}
                </button>
              </form>
            </div>
          </div>
        )}
      </div>
    </AppShell>
  );
}
