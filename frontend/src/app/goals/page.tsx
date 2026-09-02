'use client';

import React, { useEffect, useState } from 'react';
import AppShell from '../../components/layout/AppShell';
import { useAuth } from '../../context/AuthContext';
import { apiRequest } from '../../lib/api';
import { formatCurrency, formatDate } from '../../lib/formatters';
import {
  Plus,
  Target,
  PiggyBank,
  CheckCircle2,
  Clock,
  Trash2,
  X,
  Calendar,
  Wallet,
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
      if (aData.length > 0) setDepositAccountId(aData[0].id);
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
      <div className="space-y-8">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-white tracking-tight">Metas Financeiras & Sonhos</h1>
            <p className="text-sm text-slate-400">
              Planeje reservas de emergência, viagens e grandes conquistas com aportes recorrentes
            </p>
          </div>

          <button
            onClick={() => setIsGoalModalOpen(true)}
            className="inline-flex items-center justify-center gap-2 bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-600 hover:to-teal-600 text-slate-950 font-semibold px-4 py-2.5 rounded-xl text-sm shadow-lg shadow-emerald-500/20 transition-all"
          >
            <Plus className="h-4 w-4" />
            <span>Nova Meta</span>
          </button>
        </div>

        {/* Goals Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {loading ? (
            <div className="col-span-full py-12 text-center text-slate-500">Carregando metas...</div>
          ) : goals.length === 0 ? (
            <div className="col-span-full py-12 text-center text-slate-500 bg-slate-900/40 border border-slate-800/80 rounded-2xl">
              Nenhuma meta financeira cadastrada. Crie sua primeira meta!
            </div>
          ) : (
            goals.map((goal) => {
              const pct = goal.percentage || 0;
              const isCompleted = goal.status === 'COMPLETED' || pct >= 100;

              return (
                <div
                  key={goal.id}
                  className="bg-slate-900/80 border border-slate-800 rounded-2xl p-6 relative flex flex-col justify-between shadow-xl"
                >
                  <div>
                    <div className="flex items-start justify-between">
                      <div className="flex items-center gap-3">
                        <div
                          className="h-10 w-10 rounded-xl flex items-center justify-center shadow"
                          style={{ backgroundColor: `${goal.color || '#10b981'}25`, color: goal.color || '#10b981' }}
                        >
                          <Target className="h-5 w-5" />
                        </div>
                        <div>
                          <h3 className="font-bold text-white text-lg leading-tight">{goal.name}</h3>
                          {goal.deadline && (
                            <span className="text-xs text-slate-400 flex items-center gap-1 mt-0.5">
                              <Calendar className="h-3 w-3" />
                              Limite: {formatDate(goal.deadline)}
                            </span>
                          )}
                        </div>
                      </div>

                      <button
                        onClick={() => handleDelete(goal.id)}
                        className="p-1.5 text-slate-500 hover:text-rose-400 rounded-lg hover:bg-slate-800"
                        title="Excluir meta"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>

                    {/* Progress Bar */}
                    <div className="mt-6 space-y-2">
                      <div className="flex justify-between items-center text-xs">
                        <span className="text-slate-400">Progresso Acumulado:</span>
                        <span className="font-bold text-emerald-400">{pct}%</span>
                      </div>

                      <div className="w-full bg-slate-800 h-2.5 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-gradient-to-r from-emerald-500 to-teal-400 rounded-full transition-all duration-500"
                          style={{ width: `${Math.min(100, pct)}%` }}
                        ></div>
                      </div>

                      <div className="flex justify-between text-xs pt-1">
                        <span className="text-emerald-400 font-bold">{formatCurrency(goal.currentAmount)}</span>
                        <span className="text-slate-400">Alvo: {formatCurrency(goal.targetAmount)}</span>
                      </div>
                    </div>
                  </div>

                  {/* Actions & Status */}
                  <div className="mt-6 pt-4 border-t border-slate-800/80 flex items-center justify-between">
                    {isCompleted ? (
                      <span className="inline-flex items-center gap-1 text-xs font-bold text-emerald-400 bg-emerald-500/10 px-2.5 py-1 rounded-full border border-emerald-500/20">
                        <CheckCircle2 className="h-3.5 w-3.5" />
                        Meta Concluída!
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 text-xs font-medium text-slate-400">
                        <Clock className="h-3.5 w-3.5" />
                        Faltam: {formatCurrency(goal.remainingAmount)}
                      </span>
                    )}

                    <button
                      onClick={() => openDepositModal(goal)}
                      className="inline-flex items-center gap-1.5 bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 font-semibold px-3 py-1.5 rounded-xl text-xs border border-emerald-500/20 transition-colors"
                    >
                      <PiggyBank className="h-3.5 w-3.5" />
                      <span>Fazer Aporte</span>
                    </button>
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Create Goal Modal */}
        {isGoalModalOpen && (
          <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
            <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-md p-6 shadow-2xl relative">
              <button
                onClick={() => setIsGoalModalOpen(false)}
                className="absolute right-4 top-4 text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800"
              >
                <X className="h-5 w-5" />
              </button>

              <h2 className="text-xl font-bold text-white mb-4">Nova Meta Financeira</h2>

              <form onSubmit={handleCreateGoal} className="space-y-4">
                <div>
                  <label className="block text-xs font-semibold uppercase text-slate-400 mb-1">Nome da Meta *</label>
                  <input
                    type="text"
                    required
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="Ex: Reserva de Emergência, Carro Novo..."
                    className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold uppercase text-slate-400 mb-1">Valor Alvo (R$) *</label>
                  <input
                    type="number"
                    step="0.01"
                    required
                    min="0.01"
                    value={targetAmount}
                    onChange={(e) => setTargetAmount(e.target.value)}
                    placeholder="Ex: 15000,00"
                    className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-2.5 text-sm text-white font-bold"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold uppercase text-slate-400 mb-1">Data Limite Desejada</label>
                  <input
                    type="date"
                    value={deadline}
                    onChange={(e) => setDeadline(e.target.value)}
                    className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-2 text-sm text-white"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold uppercase text-slate-400 mb-1">Cor</label>
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
                  {submitting ? 'Salvando...' : 'Cadastrar Meta'}
                </button>
              </form>
            </div>
          </div>
        )}

        {/* Deposit Modal */}
        {isDepositModalOpen && selectedGoal && (
          <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
            <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-md p-6 shadow-2xl relative">
              <button
                onClick={() => setIsDepositModalOpen(false)}
                className="absolute right-4 top-4 text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800"
              >
                <X className="h-5 w-5" />
              </button>

              <h2 className="text-xl font-bold text-white mb-2">Novo Aporte na Meta</h2>
              <p className="text-xs text-slate-400 mb-4">
                Meta: <strong className="text-white">{selectedGoal.name}</strong> • Progresso atual:{' '}
                <strong className="text-emerald-400">{formatCurrency(selectedGoal.currentAmount)}</strong>
              </p>

              <form onSubmit={handleAddDeposit} className="space-y-4">
                <div>
                  <label className="block text-xs font-semibold uppercase text-slate-400 mb-1">
                    Valor do Aporte (R$) *
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    required
                    min="0.01"
                    value={depositAmount}
                    onChange={(e) => setDepositAmount(e.target.value)}
                    placeholder="500,00"
                    className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-2.5 text-sm text-white font-bold"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold uppercase text-slate-400 mb-1">
                    Debitar da Conta Bancária (Opcional)
                  </label>
                  <select
                    value={depositAccountId}
                    onChange={(e) => setDepositAccountId(e.target.value)}
                    className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-sm text-white"
                  >
                    <option value="">Aporte Externo (Não debitar conta)</option>
                    {accounts.map((acc) => (
                      <option key={acc.id} value={acc.id}>
                        {acc.name} (Saldo: {formatCurrency(acc.currentBalance)})
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
                    className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-2 text-sm text-white"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold uppercase text-slate-400 mb-1">Observações</label>
                  <input
                    type="text"
                    value={depositNotes}
                    onChange={(e) => setDepositNotes(e.target.value)}
                    placeholder="Ex: Aporte extraordinário décimo terceiro"
                    className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-2 text-sm text-white"
                  />
                </div>

                <button
                  type="submit"
                  disabled={submitting}
                  className="w-full mt-4 bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-600 hover:to-teal-600 text-slate-950 font-bold py-3 px-4 rounded-xl shadow-lg shadow-emerald-500/20 transition-all disabled:opacity-50"
                >
                  {submitting ? 'Registrando...' : 'Confirmar Aporte'}
                </button>
              </form>
            </div>
          </div>
        )}
      </div>
    </AppShell>
  );
}
