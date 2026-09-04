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
  Wallet,
  ArrowUpRight,
  ArrowDownLeft,
  AlertCircle,
  History,
} from 'lucide-react';

export default function GoalsPage() {
  const { user, selectedFamilyId } = useAuth();
  const [loading, setLoading] = useState(true);
  const [goals, setGoals] = useState<any[]>([]);
  const [accounts, setAccounts] = useState<any[]>([]);

  // Modals
  const [isGoalModalOpen, setIsGoalModalOpen] = useState(false);
  const [isDepositModalOpen, setIsDepositModalOpen] = useState(false);
  const [isWithdrawModalOpen, setIsWithdrawModalOpen] = useState(false);
  const [isHistoryModalOpen, setIsHistoryModalOpen] = useState(false);
  const [selectedGoal, setSelectedGoal] = useState<any>(null);

  // New Goal Form
  const [name, setName] = useState('');
  const [targetAmount, setTargetAmount] = useState('');
  const [accountId, setAccountId] = useState('');
  const [deadline, setDeadline] = useState('');
  const [color, setColor] = useState('#10b981');

  // Deposit Form
  const [depositAmount, setDepositAmount] = useState('');
  const [depositDate, setDepositDate] = useState(new Date().toISOString().split('T')[0]);
  const [depositNotes, setDepositNotes] = useState('');

  // Withdraw Form
  const [withdrawAmount, setWithdrawAmount] = useState('');
  const [withdrawDate, setWithdrawDate] = useState(new Date().toISOString().split('T')[0]);
  const [withdrawNotes, setWithdrawNotes] = useState('');

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
      if (aData && aData.length > 0 && !accountId) {
        setAccountId(aData[0].id);
      }
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
    if (!accountId) {
      alert('Selecione uma conta bancária para vincular a esta meta.');
      return;
    }

    setSubmitting(true);
    try {
      await apiRequest('/goals', {
        method: 'POST',
        body: JSON.stringify({
          name,
          targetAmount: parseFloat(targetAmount),
          accountId,
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

    const amountNum = parseFloat(depositAmount);
    const linkedAcc = accounts.find((acc) => acc.id === selectedGoal.accountId) || selectedGoal.account;
    const accBalance = Number(linkedAcc?.currentBalance || 0);

    if (amountNum > accBalance) {
      alert(
        `O valor do aporte (${formatCurrency(amountNum)}) não pode ser maior que o saldo disponível na conta vinculada (${formatCurrency(accBalance)}).`
      );
      return;
    }

    setSubmitting(true);

    try {
      await apiRequest(`/goals/${selectedGoal.id}/deposits`, {
        method: 'POST',
        body: JSON.stringify({
          amount: amountNum,
          depositDate,
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

  const handleWithdraw = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedGoal) return;

    const amountNum = parseFloat(withdrawAmount);
    const currentNum = Number(selectedGoal.currentAmount || 0);

    if (amountNum > currentNum) {
      alert(`O valor do resgate não pode ser maior que o saldo acumulado (${formatCurrency(currentNum)})`);
      return;
    }

    setSubmitting(true);
    try {
      await apiRequest(`/goals/${selectedGoal.id}/withdraw`, {
        method: 'POST',
        body: JSON.stringify({
          amount: amountNum,
          withdrawalDate: withdrawDate,
          notes: withdrawNotes || undefined,
        }),
      });

      setIsWithdrawModalOpen(false);
      setSelectedGoal(null);
      setWithdrawAmount('');
      setWithdrawNotes('');
      loadData();
    } catch (err: any) {
      alert(err.message || 'Erro ao realizar resgate');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (goal: any) => {
    const current = Number(goal.currentAmount || 0);
    if (current > 0) {
      alert(
        `Não é possível excluir esta meta porque ela possui ${formatCurrency(current)} acumulados.\n\nPara garantir a segurança financeira, realize o resgate de todo o saldo de volta para a conta vinculada (${goal.account?.name || 'sua conta'}) antes de excluí-la.`
      );
      return;
    }

    if (!confirm(`Deseja excluir a meta "${goal.name}"?`)) return;

    try {
      await apiRequest(`/goals/${goal.id}`, { method: 'DELETE' });
      loadData();
    } catch (err: any) {
      alert(err.message || 'Erro ao excluir meta');
    }
  };

  const openDepositModal = (goal: any) => {
    setSelectedGoal(goal);
    setIsDepositModalOpen(true);
  };

  const openWithdrawModal = (goal: any) => {
    setSelectedGoal(goal);
    setWithdrawAmount('');
    setIsWithdrawModalOpen(true);
  };

  const openHistoryModal = (goal: any) => {
    setSelectedGoal(goal);
    setIsHistoryModalOpen(true);
  };

  return (
    <AppShell>
      <div className="space-y-6 sm:space-y-8">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-xl sm:text-2xl font-bold text-white tracking-tight">Metas Financeiras & Cofrinhos</h1>
            <p className="text-xs sm:text-sm text-slate-400">
              Planeje reservas, sonhos e viagens com cofrinhos vinculados diretamente às suas contas bancárias
            </p>
          </div>

          <button
            onClick={() => setIsGoalModalOpen(true)}
            className="inline-flex items-center justify-center gap-2 bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-600 hover:to-teal-600 text-slate-950 font-semibold px-4 py-2.5 rounded-xl text-xs sm:text-sm shadow-lg shadow-emerald-500/20 transition-all w-full sm:w-auto"
          >
            <Plus className="h-4 w-4 shrink-0" />
            <span>Novo Cofrinho / Meta</span>
          </button>
        </div>

        {/* Goals Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
          {loading ? (
            <div className="col-span-full py-12 text-center text-slate-500 text-xs sm:text-sm">Carregando metas...</div>
          ) : goals.length === 0 ? (
            <div className="col-span-full py-12 text-center text-slate-500 bg-slate-900/40 border border-slate-800/80 rounded-2xl text-xs sm:text-sm">
              Nenhum cofrinho ou meta cadastrada no momento. Crie sua primeira reserva!
            </div>
          ) : (
            goals.map((goal) => {
              const current = Number(goal.currentAmount || 0);
              const target = Number(goal.targetAmount || 0);
              const pct = target > 0 ? Math.min(100, Math.round((current / target) * 100)) : 0;
              const isCompleted = current >= target;
              const hasBalance = current > 0;

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

                      <div className="flex items-center gap-1">
                        <button
                          onClick={() => openHistoryModal(goal)}
                          className="p-1.5 text-slate-400 hover:text-teal-400 hover:bg-slate-800 rounded-lg transition-colors shrink-0"
                          title="Ver histórico de movimentações"
                        >
                          <History className="h-4 w-4" />
                        </button>

                        <button
                          onClick={() => handleDelete(goal)}
                          className={`p-1.5 rounded-lg transition-colors shrink-0 ${
                            hasBalance
                              ? 'text-slate-600 hover:text-amber-400 hover:bg-slate-800 cursor-help'
                              : 'text-slate-500 hover:text-rose-400 hover:bg-slate-800'
                          }`}
                          title={
                            hasBalance
                              ? `Saldo acumulado de ${formatCurrency(current)}. Resgate antes de excluir.`
                              : 'Excluir meta'
                          }
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </div>

                    {/* Account Badge */}
                    <div className="mt-3 flex items-center gap-1.5">
                      <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-[11px] font-medium bg-slate-800/90 text-slate-300 border border-slate-700/60 truncate">
                        <Wallet className="h-3 w-3 text-teal-400 shrink-0" />
                        <span>Conta: <strong>{goal.account?.name || 'Conta Vinculada'}</strong></span>
                      </span>
                    </div>

                    {/* Progress Bar */}
                    <div className="mt-4 pt-3 border-t border-slate-800/80 space-y-2">
                      <div className="flex justify-between items-center text-xs gap-2">
                        <span className="text-slate-400">
                          Acumulado: <strong className="text-white">{formatCurrency(current)}</strong>
                        </span>
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
                          {isCompleted ? 'Meta atingida! 🎉' : `Falta: ${formatCurrency(Math.max(0, target - current))}`}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Actions & Status */}
                  <div className="mt-4 sm:mt-6 pt-3 sm:pt-4 border-t border-slate-800/60 flex flex-col gap-2">
                    {isCompleted && (
                      <div className="inline-flex items-center gap-1.5 text-xs text-emerald-400 font-bold">
                        <CheckCircle2 className="h-4 w-4 shrink-0" />
                        Conquistada! 🎉
                      </div>
                    )}

                    <div className="grid grid-cols-2 gap-2">
                      <button
                        onClick={() => openDepositModal(goal)}
                        className="inline-flex items-center justify-center gap-1.5 bg-emerald-950/40 hover:bg-emerald-900/50 text-emerald-400 font-semibold py-2 px-2.5 rounded-xl text-xs transition-all border border-emerald-500/30 shadow-sm"
                      >
                        <ArrowDownLeft className="h-3.5 w-3.5 shrink-0" />
                        <span>Aportar</span>
                      </button>

                      <button
                        onClick={() => openWithdrawModal(goal)}
                        disabled={!hasBalance}
                        className={`inline-flex items-center justify-center gap-1.5 font-semibold py-2 px-2.5 rounded-xl text-xs transition-all border shadow-sm ${
                          hasBalance
                            ? 'bg-teal-950/40 hover:bg-teal-900/50 text-teal-300 border-teal-500/30'
                            : 'bg-slate-800/40 text-slate-600 border-slate-800 cursor-not-allowed'
                        }`}
                        title={hasBalance ? 'Resgatar valor para a conta vinculada' : 'Sem saldo disponível para resgate'}
                      >
                        <ArrowUpRight className="h-3.5 w-3.5 shrink-0" />
                        <span>Resgatar</span>
                      </button>
                    </div>
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

              <h2 className="text-lg sm:text-xl font-bold text-white mb-4 pr-6">Novo Cofrinho / Meta</h2>

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
                  <label className="block text-xs font-semibold uppercase text-slate-400 mb-1">Conta Vinculada (Cofrinho) *</label>
                  <select
                    required
                    value={accountId}
                    onChange={(e) => setAccountId(e.target.value)}
                    className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3.5 py-2 sm:py-2.5 text-xs sm:text-sm text-white focus:outline-none focus:ring-2 focus:ring-emerald-500 cursor-pointer"
                  >
                    <option value="">Selecione a conta bancária de custódia...</option>
                    {accounts.map((acc) => (
                      <option key={acc.id} value={acc.id}>
                        {acc.name} ({formatCurrency(acc.currentBalance)})
                      </option>
                    ))}
                  </select>
                  <p className="text-[11px] text-slate-500 mt-1">
                    Todos os aportes e resgates desta meta movimentarão o saldo desta conta bancária.
                  </p>
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
                  {submitting ? 'Criando cofrinho...' : 'Cadastrar Meta'}
                </button>
              </form>
            </div>
          </div>
        )}

        {/* Deposit Modal */}
        {isDepositModalOpen && (() => {
          const linkedAccount = accounts.find((acc) => acc.id === selectedGoal?.accountId) || selectedGoal?.account;
          const currentAccountBalance = Number(linkedAccount?.currentBalance || 0);
          const hasSufficientBalance = currentAccountBalance > 0;
          const depositAmountNum = parseFloat(depositAmount || '0');
          const isOverBalance = depositAmountNum > currentAccountBalance;

          return (
            <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-3 sm:p-4 overflow-y-auto">
              <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-md max-h-[90vh] overflow-y-auto p-4 sm:p-6 shadow-2xl relative my-auto">
                <button
                  onClick={() => setIsDepositModalOpen(false)}
                  className="absolute right-3.5 top-3.5 text-slate-400 hover:text-white p-1.5 rounded-lg hover:bg-slate-800 transition-colors"
                  aria-label="Fechar"
                >
                  <X className="h-5 w-5" />
                </button>

                <h2 className="text-lg sm:text-xl font-bold text-white mb-1 pr-6">Aporte no Cofrinho</h2>
                <p className="text-xs text-slate-400 mb-4">
                  Meta: <strong className="text-white">{selectedGoal?.name}</strong> • Conta de Débito:{' '}
                  <strong className="text-emerald-400">{linkedAccount?.name || selectedGoal?.account?.name || 'Conta Vinculada'}</strong>
                </p>

                {/* Saldo disponível na conta bancária vinculada */}
                <div className="bg-emerald-950/30 border border-emerald-500/30 rounded-xl p-3.5 mb-4 flex items-center justify-between">
                  <div>
                    <span className="text-xs text-emerald-300 font-medium">
                      Saldo Disponível na Conta ({linkedAccount?.name || 'Vinculada'}):
                    </span>
                    <div className="text-lg font-bold text-white">
                      {formatCurrency(currentAccountBalance)}
                    </div>
                  </div>
                  {hasSufficientBalance && (
                    <button
                      type="button"
                      onClick={() => setDepositAmount(String(currentAccountBalance))}
                      className="px-2.5 py-1 text-xs font-semibold bg-emerald-500/20 text-emerald-300 hover:bg-emerald-500/30 rounded-lg transition-colors"
                    >
                      Aportar Tudo
                    </button>
                  )}
                </div>

                {!hasSufficientBalance && (
                  <div className="flex items-center gap-2 p-3 bg-amber-950/30 border border-amber-500/30 rounded-xl text-xs text-amber-300 mb-4">
                    <AlertCircle className="h-4 w-4 shrink-0" />
                    <span>A conta bancária vinculada não possui saldo disponível para realizar aportes.</span>
                  </div>
                )}

                <form onSubmit={handleAddDeposit} className="space-y-3.5 sm:space-y-4">
                  <div>
                    <label className="block text-xs font-semibold uppercase text-slate-400 mb-1">Valor do Aporte (R$) *</label>
                    <input
                      type="number"
                      step="0.01"
                      required
                      min="0.01"
                      max={currentAccountBalance}
                      value={depositAmount}
                      onChange={(e) => setDepositAmount(e.target.value)}
                      placeholder="0,00"
                      className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3.5 py-2 text-xs sm:text-sm text-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
                    />
                    {isOverBalance && (
                      <p className="text-xs text-rose-400 mt-1.5 flex items-center gap-1">
                        <AlertCircle className="h-3.5 w-3.5 shrink-0" />
                        <span>O valor do aporte não pode exceder o saldo disponível na conta ({formatCurrency(currentAccountBalance)}).</span>
                      </p>
                    )}
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
                      placeholder="Ex: Economia do mês, bônus..."
                      className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3.5 py-2 text-xs sm:text-sm text-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
                    />
                  </div>

                  <button
                    type="submit"
                    disabled={submitting || !hasSufficientBalance || isOverBalance}
                    className="w-full mt-4 bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-600 hover:to-teal-600 text-slate-950 font-bold py-2.5 sm:py-3 px-4 rounded-xl shadow-lg shadow-emerald-500/20 transition-all disabled:opacity-50 text-xs sm:text-sm"
                  >
                    {submitting ? 'Registrando aporte...' : 'Confirmar Aporte'}
                  </button>
                </form>
              </div>
            </div>
          );
        })()}

        {/* Withdraw Modal */}
        {isWithdrawModalOpen && (
          <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-3 sm:p-4 overflow-y-auto">
            <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-md max-h-[90vh] overflow-y-auto p-4 sm:p-6 shadow-2xl relative my-auto">
              <button
                onClick={() => setIsWithdrawModalOpen(false)}
                className="absolute right-3.5 top-3.5 text-slate-400 hover:text-white p-1.5 rounded-lg hover:bg-slate-800 transition-colors"
                aria-label="Fechar"
              >
                <X className="h-5 w-5" />
              </button>

              <h2 className="text-lg sm:text-xl font-bold text-white mb-1 pr-6">Resgatar da Meta</h2>
              <p className="text-xs text-slate-400 mb-4">
                Meta: <strong className="text-white">{selectedGoal?.name}</strong> • Crédito em:{' '}
                <strong className="text-teal-400">{selectedGoal?.account?.name || 'Conta Vinculada'}</strong>
              </p>

              {/* Saldo disponível */}
              <div className="bg-teal-950/30 border border-teal-500/30 rounded-xl p-3.5 mb-4 flex items-center justify-between">
                <div>
                  <span className="text-xs text-teal-300 font-medium">Saldo Disponível no Cofrinho:</span>
                  <div className="text-lg font-bold text-white">
                    {formatCurrency(Number(selectedGoal?.currentAmount || 0))}
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setWithdrawAmount(String(selectedGoal?.currentAmount || 0))}
                  className="px-2.5 py-1 text-xs font-semibold bg-teal-500/20 text-teal-300 hover:bg-teal-500/30 rounded-lg transition-colors"
                >
                  Resgatar Tudo
                </button>
              </div>

              <form onSubmit={handleWithdraw} className="space-y-3.5 sm:space-y-4">
                <div>
                  <label className="block text-xs font-semibold uppercase text-slate-400 mb-1">Valor do Resgate (R$) *</label>
                  <input
                    type="number"
                    step="0.01"
                    required
                    min="0.01"
                    max={Number(selectedGoal?.currentAmount || 0)}
                    value={withdrawAmount}
                    onChange={(e) => setWithdrawAmount(e.target.value)}
                    placeholder="0,00"
                    className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3.5 py-2 text-xs sm:text-sm text-white focus:outline-none focus:ring-2 focus:ring-teal-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold uppercase text-slate-400 mb-1">Data do Resgate *</label>
                  <input
                    type="date"
                    required
                    value={withdrawDate}
                    onChange={(e) => setWithdrawDate(e.target.value)}
                    className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3.5 py-2 text-xs sm:text-sm text-white focus:outline-none focus:ring-2 focus:ring-teal-500 cursor-pointer"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold uppercase text-slate-400 mb-1">Observações</label>
                  <input
                    type="text"
                    value={withdrawNotes}
                    onChange={(e) => setWithdrawNotes(e.target.value)}
                    placeholder="Ex: Pagamento de despesa, emergência..."
                    className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3.5 py-2 text-xs sm:text-sm text-white focus:outline-none focus:ring-2 focus:ring-teal-500"
                  />
                </div>

                <button
                  type="submit"
                  disabled={submitting || !Number(selectedGoal?.currentAmount || 0)}
                  className="w-full mt-4 bg-gradient-to-r from-teal-500 to-cyan-500 hover:from-teal-600 hover:to-cyan-600 text-slate-950 font-bold py-2.5 sm:py-3 px-4 rounded-xl shadow-lg shadow-teal-500/20 transition-all disabled:opacity-50 text-xs sm:text-sm"
                >
                  {submitting ? 'Processando resgate...' : 'Confirmar Resgate'}
                </button>
              </form>
            </div>
          </div>
        )}

        {/* History Modal */}
        {isHistoryModalOpen && (
          <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-3 sm:p-4 overflow-y-auto">
            <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto p-4 sm:p-6 shadow-2xl relative my-auto">
              <button
                onClick={() => setIsHistoryModalOpen(false)}
                className="absolute right-3.5 top-3.5 text-slate-400 hover:text-white p-1.5 rounded-lg hover:bg-slate-800 transition-colors"
                aria-label="Fechar"
              >
                <X className="h-5 w-5" />
              </button>

              <h2 className="text-lg sm:text-xl font-bold text-white mb-1 pr-6">Histórico de Movimentações</h2>
              <p className="text-xs text-slate-400 mb-4">
                Meta: <strong className="text-white">{selectedGoal?.name}</strong> • Saldo Atual:{' '}
                <strong className="text-emerald-400">{formatCurrency(Number(selectedGoal?.currentAmount || 0))}</strong>
              </p>

              <div className="space-y-2.5 max-h-96 overflow-y-auto pr-1">
                {!selectedGoal?.deposits || selectedGoal.deposits.length === 0 ? (
                  <div className="py-8 text-center text-slate-500 text-xs bg-slate-950/40 rounded-xl border border-slate-800/80">
                    Nenhuma movimentação registrada para esta meta ainda.
                  </div>
                ) : (
                  selectedGoal.deposits.map((mov: any) => {
                    const isWithdrawal = mov.type === 'WITHDRAWAL';
                    const amount = Number(mov.amount || 0);

                    return (
                      <div
                        key={mov.id}
                        className={`flex items-center justify-between p-3 rounded-xl border transition-all ${
                          isWithdrawal
                            ? 'bg-amber-950/10 border-amber-500/20'
                            : 'bg-emerald-950/10 border-emerald-500/20'
                        }`}
                      >
                        <div className="flex items-center gap-3 min-w-0">
                          <div
                            className={`h-8 w-8 rounded-lg flex items-center justify-center shrink-0 ${
                              isWithdrawal
                                ? 'bg-amber-500/20 text-amber-400'
                                : 'bg-emerald-500/20 text-emerald-400'
                            }`}
                          >
                            {isWithdrawal ? (
                              <ArrowUpRight className="h-4 w-4" />
                            ) : (
                              <ArrowDownLeft className="h-4 w-4" />
                            )}
                          </div>
                          <div className="min-w-0">
                            <span className="text-xs font-semibold text-white block truncate">
                              {isWithdrawal ? 'Resgate' : 'Aporte'}
                              {mov.notes && ` • ${mov.notes}`}
                            </span>
                            <span className="text-[11px] text-slate-400 block">
                              {formatDate(mov.depositDate)}
                            </span>
                          </div>
                        </div>

                        <div className="text-right shrink-0">
                          <span
                            className={`text-xs font-bold block ${
                              isWithdrawal ? 'text-amber-400' : 'text-emerald-400'
                            }`}
                          >
                            {isWithdrawal ? `- ${formatCurrency(amount)}` : `+ ${formatCurrency(amount)}`}
                          </span>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </AppShell>
  );
}
