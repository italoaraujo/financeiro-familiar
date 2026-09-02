'use client';

import React, { useEffect, useState } from 'react';
import AppShell from '../../components/layout/AppShell';
import { useAuth } from '../../context/AuthContext';
import { apiRequest } from '../../lib/api';
import { formatCurrency, formatDate } from '../../lib/formatters';
import {
  Plus,
  Search,
  Filter,
  ArrowUpRight,
  ArrowDownRight,
  ArrowLeftRight,
  Trash2,
  Calendar,
  Wallet,
  CreditCard,
  Tag,
  Lock,
  X,
} from 'lucide-react';

export default function TransactionsPage() {
  const { user, selectedFamilyId } = useAuth();
  const [loading, setLoading] = useState(true);
  const [transactions, setTransactions] = useState<any[]>([]);
  const [meta, setMeta] = useState<any>({ total: 0, page: 1, limit: 15, totalPages: 1 });

  // Filters state
  const [search, setSearch] = useState('');
  const [type, setType] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [page, setPage] = useState(1);

  // Aux data for modals & filters
  const [accounts, setAccounts] = useState<any[]>([]);
  const [cards, setCards] = useState<any[]>([]);
  const [categories, setCategories] = useState<any[]>([]);

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalType, setModalType] = useState<'EXPENSE' | 'INCOME' | 'TRANSFER'>('EXPENSE');
  const [paymentMode, setPaymentMode] = useState<'ACCOUNT' | 'CARD'>('ACCOUNT');

  // Form State
  const [amount, setAmount] = useState('');
  const [description, setDescription] = useState('');
  const [transactionDate, setTransactionDate] = useState(new Date().toISOString().split('T')[0]);
  const [categoryId, setCategoryId] = useState('');
  const [accountId, setAccountId] = useState('');
  const [destinationAccountId, setDestinationAccountId] = useState('');
  const [creditCardId, setCreditCardId] = useState('');
  const [totalInstallments, setTotalInstallments] = useState(1);
  const [isPrivate, setIsPrivate] = useState(false);
  const [notes, setNotes] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const loadAuxData = async () => {
    try {
      const params: any = selectedFamilyId ? { familyId: selectedFamilyId } : {};
      const [accs, cds, cats] = await Promise.all([
        apiRequest('/accounts', { params }),
        apiRequest('/credit-cards', { params }),
        apiRequest('/categories', { params }),
      ]);
      setAccounts(accs);
      setCards(cds);
      setCategories(cats);

      if (accs.length > 0) setAccountId(accs[0].id);
      if (cds.length > 0) setCreditCardId(cds[0].id);
      if (cats.length > 0) setCategoryId(cats[0].id);
    } catch (err) {
      console.error('Error loading auxiliary data:', err);
    }
  };

  const loadTransactions = async () => {
    setLoading(true);
    try {
      const params: any = {
        page,
        limit: 15,
        search: search || undefined,
        type: type || undefined,
        startDate: startDate || undefined,
        endDate: endDate || undefined,
        familyId: selectedFamilyId || undefined,
      };

      const result = await apiRequest('/transactions', { params });
      setTransactions(result.data || []);
      setMeta(result.meta || { total: 0, page: 1, limit: 15, totalPages: 1 });
    } catch (err) {
      console.error('Error loading transactions:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (user) {
      loadAuxData();
    }
  }, [user, selectedFamilyId]);

  useEffect(() => {
    if (user) {
      loadTransactions();
    }
  }, [user, selectedFamilyId, page, type, startDate, endDate]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setPage(1);
    loadTransactions();
  };

  const handleCreateTransaction = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);

    try {
      if (modalType === 'TRANSFER') {
        await apiRequest('/transactions/transfer', {
          method: 'POST',
          body: JSON.stringify({
            sourceAccountId: accountId,
            destinationAccountId,
            amount: parseFloat(amount),
            description,
            transactionDate,
            familyId: selectedFamilyId || undefined,
          }),
        });
      } else {
        await apiRequest('/transactions', {
          method: 'POST',
          body: JSON.stringify({
            type: modalType,
            amount: parseFloat(amount),
            description,
            transactionDate,
            categoryId,
            accountId: modalType === 'EXPENSE' && paymentMode === 'CARD' ? undefined : accountId,
            creditCardId: modalType === 'EXPENSE' && paymentMode === 'CARD' ? creditCardId : undefined,
            totalInstallments: modalType === 'EXPENSE' && paymentMode === 'CARD' ? totalInstallments : 1,
            isPrivate,
            notes: notes || undefined,
            familyId: selectedFamilyId || undefined,
          }),
        });
      }

      setIsModalOpen(false);
      // Reset form
      setAmount('');
      setDescription('');
      setNotes('');
      setTotalInstallments(1);
      setIsPrivate(false);
      loadTransactions();
    } catch (err: any) {
      alert(err.message || 'Erro ao criar transação');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Deseja realmente excluir este lançamento? O saldo associado será estornado.')) {
      return;
    }

    try {
      await apiRequest(`/transactions/${id}`, { method: 'DELETE' });
      loadTransactions();
    } catch (err: any) {
      alert(err.message || 'Erro ao excluir transação');
    }
  };

  return (
    <AppShell>
      <div className="space-y-6">
        {/* Top Header & Actions */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-white tracking-tight">Extrato & Lançamentos</h1>
            <p className="text-sm text-slate-400">
              Histórico completo de receitas, despesas, transferências e parcelamentos
            </p>
          </div>

          <button
            onClick={() => setIsModalOpen(true)}
            className="inline-flex items-center justify-center gap-2 bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-600 hover:to-teal-600 text-slate-950 font-semibold px-4 py-2.5 rounded-xl text-sm shadow-lg shadow-emerald-500/20 transition-all"
          >
            <Plus className="h-4 w-4" />
            <span>Novo Lançamento</span>
          </button>
        </div>

        {/* Search & Filters Bar */}
        <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-4 space-y-4">
          <form onSubmit={handleSearchSubmit} className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
            {/* Search query */}
            <div className="relative lg:col-span-2">
              <Search className="h-4 w-4 text-slate-500 absolute left-3.5 top-3" />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Buscar por descrição..."
                className="w-full bg-slate-800/80 border border-slate-700/80 rounded-xl pl-10 pr-4 py-2 text-sm text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-emerald-500"
              />
            </div>

            {/* Type selector */}
            <div>
              <select
                value={type}
                onChange={(e) => {
                  setType(e.target.value);
                  setPage(1);
                }}
                className="w-full bg-slate-800/80 border border-slate-700/80 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
              >
                <option value="">Todos os Tipos</option>
                <option value="EXPENSE">Despesas</option>
                <option value="INCOME">Receitas</option>
                <option value="TRANSFER">Transferências</option>
              </select>
            </div>

            {/* Start Date */}
            <div>
              <input
                type="date"
                value={startDate}
                onChange={(e) => {
                  setStartDate(e.target.value);
                  setPage(1);
                }}
                className="w-full bg-slate-800/80 border border-slate-700/80 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
              />
            </div>

            {/* End Date */}
            <div>
              <input
                type="date"
                value={endDate}
                onChange={(e) => {
                  setEndDate(e.target.value);
                  setPage(1);
                }}
                className="w-full bg-slate-800/80 border border-slate-700/80 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
              />
            </div>
          </form>
        </div>

        {/* Transactions Table */}
        <div className="bg-slate-900/80 border border-slate-800 rounded-2xl overflow-hidden shadow-xl">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm text-slate-300">
              <thead className="bg-slate-800/50 text-xs uppercase font-semibold text-slate-400 border-b border-slate-800">
                <tr>
                  <th className="px-6 py-4">Data</th>
                  <th className="px-6 py-4">Descrição</th>
                  <th className="px-6 py-4">Categoria</th>
                  <th className="px-6 py-4">Conta / Cartão</th>
                  <th className="px-6 py-4">Valor</th>
                  <th className="px-6 py-4">Status</th>
                  <th className="px-6 py-4 text-right">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60">
                {loading ? (
                  <tr>
                    <td colSpan={7} className="px-6 py-12 text-center text-slate-500">
                      Carregando lançamentos...
                    </td>
                  </tr>
                ) : transactions.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="px-6 py-12 text-center text-slate-500">
                      Nenhum lançamento encontrado para os filtros aplicados.
                    </td>
                  </tr>
                ) : (
                  transactions.map((tx) => (
                    <tr key={tx.id} className="hover:bg-slate-800/30 transition-colors">
                      <td className="px-6 py-4 whitespace-nowrap text-xs text-slate-400">
                        {formatDate(tx.transactionDate)}
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-2 font-medium text-white">
                          {tx.isPrivate && (
                            <span title="Lançamento Privado">
                              <Lock className="h-3.5 w-3.5 text-amber-400 shrink-0" />
                            </span>
                          )}
                          <span>{tx.description}</span>
                          {tx.totalInstallments && tx.totalInstallments > 1 && (
                            <span className="text-[10px] bg-slate-800 text-slate-400 px-1.5 py-0.5 rounded border border-slate-700">
                              {tx.installmentNumber}/{tx.totalInstallments}
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span
                          className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium"
                          style={{
                            backgroundColor: `${tx.category?.color || '#64748b'}20`,
                            color: tx.category?.color || '#94a3b8',
                          }}
                        >
                          <span
                            className="h-1.5 w-1.5 rounded-full"
                            style={{ backgroundColor: tx.category?.color || '#64748b' }}
                          ></span>
                          {tx.category?.name || 'Geral'}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-xs text-slate-300">
                        {tx.type === 'TRANSFER' ? (
                          <div className="flex items-center gap-1">
                            <span>{tx.account?.name}</span>
                            <ArrowLeftRight className="h-3 w-3 text-slate-500" />
                            <span>{tx.destinationAccount?.name}</span>
                          </div>
                        ) : tx.account ? (
                          <div className="flex items-center gap-1.5">
                            <Wallet className="h-3.5 w-3.5 text-slate-400" />
                            <span>{tx.account.name}</span>
                          </div>
                        ) : tx.creditCard ? (
                          <div className="flex items-center gap-1.5">
                            <CreditCard className="h-3.5 w-3.5 text-purple-400" />
                            <span>{tx.creditCard.name}</span>
                          </div>
                        ) : (
                          '-'
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap font-bold">
                        <span
                          className={
                            tx.type === 'INCOME'
                              ? 'text-emerald-400'
                              : tx.type === 'EXPENSE'
                              ? 'text-rose-400'
                              : 'text-blue-400'
                          }
                        >
                          {tx.type === 'INCOME' ? '+' : tx.type === 'EXPENSE' ? '-' : ''}{' '}
                          {formatCurrency(tx.amount)}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span
                          className={`text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded ${
                            tx.status === 'COMPLETED'
                              ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                              : 'bg-amber-500/10 text-amber-400 border border-amber-500/20'
                          }`}
                        >
                          {tx.status}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right">
                        <button
                          onClick={() => handleDelete(tx.id)}
                          className="p-1.5 text-slate-500 hover:text-rose-400 hover:bg-rose-500/10 rounded-lg transition-colors"
                          title="Excluir lançamento"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {/* Pagination Footer */}
          {meta.totalPages > 1 && (
            <div className="p-4 border-t border-slate-800 flex items-center justify-between text-xs text-slate-400">
              <span>
                Mostrando página <strong className="text-white">{meta.page}</strong> de{' '}
                <strong className="text-white">{meta.totalPages}</strong> ({meta.total} registros)
              </span>

              <div className="flex items-center gap-2">
                <button
                  disabled={page <= 1}
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-white rounded-lg disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  Anterior
                </button>
                <button
                  disabled={page >= meta.totalPages}
                  onClick={() => setPage((p) => p + 1)}
                  className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-white rounded-lg disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  Próxima
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Create Transaction Modal */}
        {isModalOpen && (
          <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
            <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-lg p-6 shadow-2xl relative my-8">
              <button
                onClick={() => setIsModalOpen(false)}
                className="absolute right-4 top-4 text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800"
              >
                <X className="h-5 w-5" />
              </button>

              <h2 className="text-xl font-bold text-white mb-4">Novo Lançamento Financeiro</h2>

              {/* Type Switcher Tabs */}
              <div className="grid grid-cols-3 gap-2 p-1 bg-slate-800/80 rounded-xl mb-6">
                <button
                  type="button"
                  onClick={() => setModalType('EXPENSE')}
                  className={`py-2 text-xs font-bold rounded-lg transition-all ${
                    modalType === 'EXPENSE'
                      ? 'bg-rose-500 text-white shadow'
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  Despesa
                </button>
                <button
                  type="button"
                  onClick={() => setModalType('INCOME')}
                  className={`py-2 text-xs font-bold rounded-lg transition-all ${
                    modalType === 'INCOME'
                      ? 'bg-emerald-500 text-slate-950 shadow'
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  Receita
                </button>
                <button
                  type="button"
                  onClick={() => setModalType('TRANSFER')}
                  className={`py-2 text-xs font-bold rounded-lg transition-all ${
                    modalType === 'TRANSFER'
                      ? 'bg-blue-500 text-white shadow'
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  Transferência
                </button>
              </div>

              <form onSubmit={handleCreateTransaction} className="space-y-4">
                {/* Amount */}
                <div>
                  <label className="block text-xs font-semibold uppercase text-slate-400 mb-1">
                    Valor (R$) *
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    required
                    min="0.01"
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                    placeholder="0,00"
                    className="w-full text-lg font-bold bg-slate-800 border border-slate-700 rounded-xl px-4 py-2.5 text-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                </div>

                {/* Description */}
                <div>
                  <label className="block text-xs font-semibold uppercase text-slate-400 mb-1">
                    Descrição *
                  </label>
                  <input
                    type="text"
                    required
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    placeholder="Ex: Aluguel, Supermercado, Salário..."
                    className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                </div>

                {/* Date */}
                <div>
                  <label className="block text-xs font-semibold uppercase text-slate-400 mb-1">
                    Data do Lançamento *
                  </label>
                  <input
                    type="date"
                    required
                    value={transactionDate}
                    onChange={(e) => setTransactionDate(e.target.value)}
                    className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-2 text-sm text-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                </div>

                {/* Conditional Fields for TRANSFER */}
                {modalType === 'TRANSFER' ? (
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-semibold uppercase text-slate-400 mb-1">
                        Conta Origem *
                      </label>
                      <select
                        value={accountId}
                        onChange={(e) => setAccountId(e.target.value)}
                        required
                        className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
                      >
                        {accounts.map((acc) => (
                          <option key={acc.id} value={acc.id}>
                            {acc.name} ({formatCurrency(acc.currentBalance)})
                          </option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="block text-xs font-semibold uppercase text-slate-400 mb-1">
                        Conta Destino *
                      </label>
                      <select
                        value={destinationAccountId}
                        onChange={(e) => setDestinationAccountId(e.target.value)}
                        required
                        className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
                      >
                        <option value="">Selecione...</option>
                        {accounts
                          .filter((a) => a.id !== accountId)
                          .map((acc) => (
                            <option key={acc.id} value={acc.id}>
                              {acc.name} ({formatCurrency(acc.currentBalance)})
                            </option>
                          ))}
                      </select>
                    </div>
                  </div>
                ) : (
                  <>
                    {/* Category */}
                    <div>
                      <label className="block text-xs font-semibold uppercase text-slate-400 mb-1">
                        Categoria *
                      </label>
                      <select
                        value={categoryId}
                        onChange={(e) => setCategoryId(e.target.value)}
                        required
                        className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
                      >
                        {categories
                          .filter((c) => !c.type || c.type === modalType)
                          .map((cat) => (
                            <option key={cat.id} value={cat.id}>
                              {cat.name}
                            </option>
                          ))}
                      </select>
                    </div>

                    {/* Payment Mode (Account vs Card) for Expense */}
                    {modalType === 'EXPENSE' && (
                      <div className="space-y-3 pt-1">
                        <label className="block text-xs font-semibold uppercase text-slate-400">
                          Forma de Pagamento
                        </label>
                        <div className="flex gap-4">
                          <label className="flex items-center gap-2 text-sm text-slate-300 cursor-pointer">
                            <input
                              type="radio"
                              name="paymentMode"
                              checked={paymentMode === 'ACCOUNT'}
                              onChange={() => setPaymentMode('ACCOUNT')}
                              className="accent-emerald-500"
                            />
                            <span>Conta Bancária / Dinheiro</span>
                          </label>
                          <label className="flex items-center gap-2 text-sm text-slate-300 cursor-pointer">
                            <input
                              type="radio"
                              name="paymentMode"
                              checked={paymentMode === 'CARD'}
                              onChange={() => setPaymentMode('CARD')}
                              className="accent-purple-500"
                            />
                            <span>Cartão de Crédito</span>
                          </label>
                        </div>

                        {paymentMode === 'ACCOUNT' ? (
                          <div>
                            <select
                              value={accountId}
                              onChange={(e) => setAccountId(e.target.value)}
                              className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-sm text-white"
                            >
                              {accounts.map((acc) => (
                                <option key={acc.id} value={acc.id}>
                                  {acc.name} ({formatCurrency(acc.currentBalance)})
                                </option>
                              ))}
                            </select>
                          </div>
                        ) : (
                          <div className="grid grid-cols-2 gap-3">
                            <div>
                              <select
                                value={creditCardId}
                                onChange={(e) => setCreditCardId(e.target.value)}
                                className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-sm text-white"
                              >
                                {cards.map((c) => (
                                  <option key={c.id} value={c.id}>
                                    {c.name} (Disp: {formatCurrency(c.availableLimit)})
                                  </option>
                                ))}
                              </select>
                            </div>
                            <div>
                              <input
                                type="number"
                                min="1"
                                max="48"
                                value={totalInstallments}
                                onChange={(e) => setTotalInstallments(parseInt(e.target.value) || 1)}
                                placeholder="Parcelas (ex: 1)"
                                className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-sm text-white"
                              />
                            </div>
                          </div>
                        )}
                      </div>
                    )}

                    {modalType === 'INCOME' && (
                      <div>
                        <label className="block text-xs font-semibold uppercase text-slate-400 mb-1">
                          Conta de Destino *
                        </label>
                        <select
                          value={accountId}
                          onChange={(e) => setAccountId(e.target.value)}
                          className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-sm text-white"
                        >
                          {accounts.map((acc) => (
                            <option key={acc.id} value={acc.id}>
                              {acc.name} ({formatCurrency(acc.currentBalance)})
                            </option>
                          ))}
                        </select>
                      </div>
                    )}
                  </>
                )}

                {/* Privacy toggle */}
                <div className="pt-2">
                  <label className="flex items-center gap-2 text-xs text-slate-400 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={isPrivate}
                      onChange={(e) => setIsPrivate(e.target.checked)}
                      className="accent-emerald-500 rounded"
                    />
                    <span>Marcar como lançamento privado (ocultar detalhes de outros membros da família)</span>
                  </label>
                </div>

                {/* Submit button */}
                <button
                  type="submit"
                  disabled={submitting}
                  className="w-full mt-4 bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-600 hover:to-teal-600 text-slate-950 font-bold py-3 px-4 rounded-xl shadow-lg shadow-emerald-500/20 transition-all disabled:opacity-50"
                >
                  {submitting ? 'Salvando lançamento...' : 'Confirmar Lançamento'}
                </button>
              </form>
            </div>
          </div>
        )}
      </div>
    </AppShell>
  );
}
