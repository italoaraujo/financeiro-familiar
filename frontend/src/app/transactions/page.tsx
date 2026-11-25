'use client';

import React, { useEffect, useState } from 'react';
import AppShell from '../../components/layout/AppShell';
import { useAuth } from '../../context/AuthContext';
import { apiRequest } from '../../lib/api';
import { formatCurrency, formatDate, formatTransactionDateTime } from '../../lib/formatters';
import {
  Plus,
  Search,
  ArrowUpRight,
  ArrowDownRight,
  ArrowLeftRight,
  Trash2,
  Pencil,
  AlertCircle,
  Wallet,
  CreditCard,
  Lock,
  User,
  X,
} from 'lucide-react';
import { Modal } from '../../components/ui/Modal';
import { TagInput } from '../../components/ui/TagInput';
import { AutocompleteInput, clearDescriptionCache } from '../../components/ui/AutocompleteInput';

export default function TransactionsPage() {
  const { user, selectedFamilyId, isViewer } = useAuth();
  const [loading, setLoading] = useState(true);
  const [transactions, setTransactions] = useState<any[]>([]);
  const [meta, setMeta] = useState<any>({ total: 0, page: 1, limit: 15, totalPages: 1 });

  // Filters state
  const [search, setSearch] = useState('');
  const [type, setType] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [filterPersonId, setFilterPersonId] = useState('');
  const [filterTagId, setFilterTagId] = useState('');
  const [page, setPage] = useState(1);

  // Aux data for modals & filters
  const [accounts, setAccounts] = useState<any[]>([]);
  const [cards, setCards] = useState<any[]>([]);
  const [categories, setCategories] = useState<any[]>([]);
  const [people, setPeople] = useState<any[]>([]);
  const [availableTags, setAvailableTags] = useState<any[]>([]);

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalType, setModalType] = useState<'EXPENSE' | 'INCOME' | 'TRANSFER'>('EXPENSE');
  const [paymentMode, setPaymentMode] = useState<'ACCOUNT' | 'CARD'>('ACCOUNT');

  // Form State
  const [amount, setAmount] = useState('');
  const [description, setDescription] = useState('');
  const [transactionDate, setTransactionDate] = useState(new Date().toISOString().split('T')[0]);
  const [transactionTime, setTransactionTime] = useState('');
  const [categoryId, setCategoryId] = useState('');
  const [accountId, setAccountId] = useState('');
  const [destinationAccountId, setDestinationAccountId] = useState('');
  const [creditCardId, setCreditCardId] = useState('');
  const [totalInstallments, setTotalInstallments] = useState(1);
  const [personId, setPersonId] = useState('');
  const [tags, setTags] = useState<string[]>([]);
  const [isPrivate, setIsPrivate] = useState(false);
  const [notes, setNotes] = useState('');
  const [submitting, setSubmitting] = useState(false);

  // Edit Modal State
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editingTransaction, setEditingTransaction] = useState<any>(null);
  const [editDescription, setEditDescription] = useState('');
  const [editTags, setEditTags] = useState<string[]>([]);
  const [editSubmitting, setEditSubmitting] = useState(false);

  const selectedCard = cards.find((c) => c.id === creditCardId);
  const parsedAmount = parseFloat(amount) || 0;
  const isCardOverLimit =
    modalType === 'EXPENSE' &&
    paymentMode === 'CARD' &&
    Boolean(selectedCard && parsedAmount > Number(selectedCard.availableLimit));

  const loadAuxData = async () => {
    try {
      const params: any = selectedFamilyId ? { familyId: selectedFamilyId } : {};
      const [accs, cds, cats, ppl, tgs] = await Promise.all([
        apiRequest('/accounts', { params }),
        apiRequest('/credit-cards', { params }),
        apiRequest('/categories', { params }),
        selectedFamilyId
          ? apiRequest(`/families/${selectedFamilyId}/people`).catch(() => [])
          : Promise.resolve([]),
        apiRequest('/tags', { params }).catch(() => []),
      ]);
      setAccounts(accs || []);
      setCards(cds || []);
      setCategories(cats || []);
      setPeople(ppl || []);
      setAvailableTags(Array.isArray(tgs) ? tgs : []);

      setAccountId(accs && accs.length > 0 ? accs[0].id : '');
      setCreditCardId(cds && cds.length > 0 ? cds[0].id : '');
      if (cats && cats.length > 0) setCategoryId(cats[0].id);
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
        personId: filterPersonId || undefined,
        tagId: filterTagId || undefined,
        familyId: selectedFamilyId || undefined,
      };

      const result = await apiRequest('/transactions', { params });
      setTransactions(result?.data || []);
      setMeta(result?.meta || { total: 0, page: 1, limit: 15, totalPages: 1 });
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
  }, [user, selectedFamilyId, page, type, startDate, endDate, filterPersonId, filterTagId]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setPage(1);
    loadTransactions();
  };

  const handleCreateTransaction = async (e: React.FormEvent) => {
    e.preventDefault();

    if (isCardOverLimit) {
      alert(
        `O valor da despesa (${formatCurrency(parsedAmount)}) excede o limite disponível do cartão (${formatCurrency(selectedCard?.availableLimit || 0)}).`,
      );
      return;
    }

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
            transactionTime: transactionTime || undefined,
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
            transactionTime: transactionTime || undefined,
            categoryId,
            accountId: modalType === 'EXPENSE' && paymentMode === 'CARD' ? undefined : accountId,
            creditCardId: modalType === 'EXPENSE' && paymentMode === 'CARD' ? creditCardId : undefined,
            totalInstallments: modalType === 'EXPENSE' && paymentMode === 'CARD' ? totalInstallments : 1,
            personId: personId || undefined,
            tags: tags.length > 0 ? tags : undefined,
            isPrivate,
            notes: notes || undefined,
            familyId: selectedFamilyId || undefined,
          }),
        });
      }

      clearDescriptionCache();
      setIsModalOpen(false);
      // Reset form
      setAmount('');
      setDescription('');
      setTransactionTime('');
      setNotes('');
      setPersonId('');
      setTags([]);
      setTotalInstallments(1);
      setIsPrivate(false);
      loadTransactions();
      loadAuxData();
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
      clearDescriptionCache();
      loadTransactions();
    } catch (err: any) {
      alert(err.message || 'Erro ao excluir transação');
    }
  };

  const openEditModal = (tx: any) => {
    setEditingTransaction(tx);
    setEditDescription(tx.description || '');
    const initialTags = Array.isArray(tx.tags)
      ? tx.tags
          .map((tItem: any) => {
            const tagObj = tItem?.tag || tItem;
            return typeof tagObj === 'string' ? tagObj : tagObj?.name;
          })
          .filter((name: unknown): name is string => typeof name === 'string' && name.length > 0)
      : [];
    setEditTags(initialTags);
    setIsEditModalOpen(true);
  };

  const closeEditModal = () => {
    setIsEditModalOpen(false);
    setEditingTransaction(null);
    setEditDescription('');
    setEditTags([]);
  };

  const handleUpdateTransaction = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingTransaction) return;

    const trimmedDescription = editDescription.trim();
    if (!trimmedDescription) {
      alert('A descrição não pode ser vazia.');
      return;
    }

    setEditSubmitting(true);
    try {
      await apiRequest(`/transactions/${editingTransaction.id}`, {
        method: 'PUT',
        body: JSON.stringify({
          description: trimmedDescription,
          tags: editTags,
        }),
      });

      clearDescriptionCache();
      closeEditModal();
      loadTransactions();
      loadAuxData();
    } catch (err: any) {
      alert(err.message || 'Erro ao atualizar lançamento');
    } finally {
      setEditSubmitting(false);
    }
  };

  return (
    <AppShell>
      <div className="space-y-6 sm:space-y-8">
        {/* Top Header & Actions */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-xl sm:text-2xl font-bold text-white tracking-tight">Extrato & Lançamentos</h1>
            <p className="text-xs sm:text-sm text-slate-400">
              Histórico completo de receitas, despesas, transferências e parcelamentos
            </p>
          </div>

          {!isViewer && (
            <button
              onClick={() => setIsModalOpen(true)}
              className="inline-flex items-center justify-center gap-2 bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-600 hover:to-teal-600 text-slate-950 font-semibold px-4 py-2.5 rounded-xl text-xs sm:text-sm shadow-lg shadow-emerald-500/20 transition-all w-full sm:w-auto"
            >
              <Plus className="h-4 w-4 shrink-0" />
              <span>Novo Lançamento</span>
            </button>
          )}
        </div>

        {/* Search & Filters Bar */}
        <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-3.5 sm:p-4">
          <form onSubmit={handleSearchSubmit} className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-6 gap-2.5 sm:gap-3">
            {/* Search query */}
            <div className="relative sm:col-span-2 lg:col-span-2">
              <Search className="h-4 w-4 text-slate-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Buscar por descrição..."
                className="w-full bg-slate-800/80 border border-slate-700/80 rounded-xl pl-9 pr-3.5 py-2 text-xs sm:text-sm text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-emerald-500"
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
                className="w-full bg-slate-800/80 border border-slate-700/80 rounded-xl px-3 py-2 text-xs sm:text-sm text-white focus:outline-none focus:ring-2 focus:ring-emerald-500 cursor-pointer"
              >
                <option value="">Todos os Tipos</option>
                <option value="EXPENSE">Despesas</option>
                <option value="INCOME">Receitas</option>
                <option value="TRANSFER">Transferências</option>
              </select>
            </div>

            {/* Start Date */}
            <div className="min-w-0">
              <input
                type="date"
                value={startDate}
                onChange={(e) => {
                  setStartDate(e.target.value);
                  setPage(1);
                }}
                className="w-full max-w-full bg-slate-800/80 border border-slate-700/80 rounded-xl px-3 py-2 text-xs sm:text-sm text-white focus:outline-none focus:ring-2 focus:ring-emerald-500 cursor-pointer"
              />
            </div>

            {/* End Date */}
            <div className="min-w-0">
              <input
                type="date"
                value={endDate}
                onChange={(e) => {
                  setEndDate(e.target.value);
                  setPage(1);
                }}
                className="w-full max-w-full bg-slate-800/80 border border-slate-700/80 rounded-xl px-3 py-2 text-xs sm:text-sm text-white focus:outline-none focus:ring-2 focus:ring-emerald-500 cursor-pointer"
              />
            </div>

            {/* Person Filter */}
            {people.length > 0 && (
              <div>
                <select
                  value={filterPersonId}
                  onChange={(e) => {
                    setFilterPersonId(e.target.value);
                    setPage(1);
                  }}
                  className="w-full bg-slate-800/80 border border-slate-700/80 rounded-xl px-3 py-2 text-xs sm:text-sm text-white focus:outline-none focus:ring-2 focus:ring-emerald-500 cursor-pointer"
                >
                  <option value="">Todas as Pessoas</option>
                  {people.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name}
                    </option>
                  ))}
                </select>
              </div>
            )}

            {/* Tag Filter */}
            {availableTags.length > 0 && (
              <div>
                <select
                  value={filterTagId}
                  onChange={(e) => {
                    setFilterTagId(e.target.value);
                    setPage(1);
                  }}
                  className="w-full bg-slate-800/80 border border-slate-700/80 rounded-xl px-3 py-2 text-xs sm:text-sm text-white focus:outline-none focus:ring-2 focus:ring-emerald-500 cursor-pointer"
                >
                  <option value="">Todas as Tags</option>
                  {availableTags.map((tag) => (
                    <option key={tag.id} value={tag.id}>
                      #{tag.name}
                    </option>
                  ))}
                </select>
              </div>
            )}
          </form>
        </div>

        {/* Transactions Table */}
        <div className="bg-slate-900/80 border border-slate-800 rounded-2xl overflow-hidden shadow-xl">
          <div className="overflow-x-auto w-full">
            <table className="w-full text-left text-xs sm:text-sm text-slate-300 min-w-[640px]">
              <thead className="bg-slate-800/50 text-[11px] sm:text-xs uppercase font-semibold text-slate-400 border-b border-slate-800">
                <tr>
                  <th className="px-4 sm:px-6 py-3.5">Data</th>
                  <th className="px-4 sm:px-6 py-3.5">Descrição</th>
                  <th className="px-4 sm:px-6 py-3.5">Categoria</th>
                  <th className="px-4 sm:px-6 py-3.5">Conta / Cartão</th>
                  <th className="px-4 sm:px-6 py-3.5">Valor</th>
                  <th className="px-4 sm:px-6 py-3.5">Status</th>
                  <th className="px-4 sm:px-6 py-3.5 text-right">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60">
                {loading ? (
                  <tr>
                    <td colSpan={7} className="px-4 sm:px-6 py-12 text-center text-slate-500 text-xs sm:text-sm">
                      Carregando lançamentos...
                    </td>
                  </tr>
                ) : transactions.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="px-4 sm:px-6 py-12 text-center text-slate-500 text-xs sm:text-sm">
                      Nenhum lançamento encontrado para os filtros aplicados.
                    </td>
                  </tr>
                ) : (
                  transactions.map((tx) => {
                    const formatted = formatTransactionDateTime(tx.transactionDate);
                    return (
                    <tr key={tx.id} className="hover:bg-slate-800/30 transition-colors">
                      <td className="px-4 sm:px-6 py-3.5 whitespace-nowrap">
                        <div className="flex flex-col">
                          <span className="text-xs text-slate-300 font-medium">{formatted.date}</span>
                          {formatted.time && (
                            <span className="text-[11px] text-slate-500 font-mono">
                              {formatted.time}
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="px-4 sm:px-6 py-3.5">
                        <div className="flex items-center gap-2 font-medium text-white max-w-xs flex-wrap">
                          {tx.isPrivate && (
                            <span title="Lançamento Privado">
                              <Lock className="h-3.5 w-3.5 text-amber-400 shrink-0" />
                            </span>
                          )}
                          <span className="truncate">{tx.description}</span>
                          {tx.person && (
                            <span
                              className="inline-flex items-center gap-1 text-[10px] px-1.5 py-0.5 rounded font-medium border shrink-0"
                              style={{
                                backgroundColor: `${tx.person.color || '#8b5cf6'}20`,
                                color: tx.person.color || '#a78bfa',
                                borderColor: `${tx.person.color || '#8b5cf6'}40`,
                              }}
                              title={`Responsável: ${tx.person.name}`}
                            >
                              <User className="h-2.5 w-2.5" />
                              <span>{tx.person.name}</span>
                            </span>
                          )}
                          {tx.totalInstallments && tx.totalInstallments > 1 && (
                            <span className="text-[10px] bg-slate-800 text-slate-400 px-1.5 py-0.5 rounded border border-slate-700 shrink-0">
                              {tx.installmentNumber}/{tx.totalInstallments}
                            </span>
                          )}
                        </div>
                        {tx.tags && tx.tags.length > 0 && (
                          <div className="flex flex-wrap items-center gap-1 mt-1">
                            {tx.tags.map((tItem: any, idx: number) => {
                              const tagObj = tItem?.tag || tItem;
                              const tagName = typeof tagObj === 'string' ? tagObj : tagObj?.name;
                              const tagColor = tagObj?.color || '#10b981';
                              const tagKey = tagObj?.id || `${tagName}-${idx}`;

                              if (!tagName) return null;

                              return (
                                <span
                                  key={tagKey}
                                  className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-medium bg-slate-800 text-slate-300 border border-slate-700 shadow-sm"
                                >
                                  <span
                                    className="h-1.5 w-1.5 rounded-full shrink-0"
                                    style={{ backgroundColor: tagColor }}
                                  />
                                  #{tagName}
                                </span>
                              );
                            })}
                          </div>
                        )}
                      </td>
                      <td className="px-4 sm:px-6 py-3.5 whitespace-nowrap">
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
                      <td className="px-4 sm:px-6 py-3.5 whitespace-nowrap text-xs text-slate-300">
                        {tx.type === 'TRANSFER' ? (
                          <div className="flex items-center gap-1">
                            <span>{tx.account?.name}</span>
                            {tx.destinationAccount && (
                              <>
                                <ArrowLeftRight className="h-3 w-3 text-slate-500 shrink-0" />
                                <span>{tx.destinationAccount.name}</span>
                              </>
                            )}
                          </div>
                        ) : tx.account ? (
                          <div className="flex items-center gap-1.5">
                            <Wallet className="h-3.5 w-3.5 text-slate-400 shrink-0" />
                            <span>{tx.account.name}</span>
                          </div>
                        ) : tx.creditCard ? (
                          <div className="flex items-center gap-1.5">
                            <CreditCard className="h-3.5 w-3.5 text-purple-400 shrink-0" />
                            <span>{tx.creditCard.name}</span>
                          </div>
                        ) : (
                          '-'
                        )}
                      </td>
                      <td className="px-4 sm:px-6 py-3.5 whitespace-nowrap font-bold">
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
                      <td className="px-4 sm:px-6 py-3.5 whitespace-nowrap">
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
                      <td className="px-4 sm:px-6 py-3.5 whitespace-nowrap text-right">
                        {isViewer ? (
                          <div className="inline-flex items-center justify-end gap-1">
                            <span
                              className="p-1.5 text-slate-600 cursor-not-allowed inline-block"
                              title="Modo somente leitura"
                            >
                              <Pencil className="h-4 w-4 opacity-20" />
                            </span>
                            <span
                              className="p-1.5 text-slate-600 cursor-not-allowed inline-block"
                              title="Modo somente leitura"
                            >
                              <Trash2 className="h-4 w-4 opacity-20" />
                            </span>
                          </div>
                        ) : (
                          <div className="inline-flex items-center justify-end gap-1">
                            {tx.isPrivate && tx.userId !== user?.id ? (
                              <button
                                type="button"
                                disabled
                                className="p-1.5 text-slate-600 cursor-not-allowed rounded-lg"
                                title="Lançamento privado de outro membro"
                                aria-label="Editar lançamento indisponível"
                              >
                                <Pencil className="h-4 w-4 opacity-30" />
                              </button>
                            ) : (
                              <button
                                type="button"
                                onClick={() => openEditModal(tx)}
                                className="p-1.5 text-slate-500 hover:text-emerald-400 hover:bg-emerald-500/10 rounded-lg transition-colors"
                                title="Editar descrição e tags"
                                aria-label="Editar lançamento"
                              >
                                <Pencil className="h-4 w-4" />
                              </button>
                            )}

                            {tx.goalDeposits?.length > 0 ||
                            tx.category?.name === 'Aporte em Meta' ||
                            tx.category?.name === 'Resgate de Meta' ? (
                              <span
                                className="p-1.5 text-slate-600 cursor-not-allowed inline-block"
                                title="Lançamento de Cofrinho: gerencie através de aportes e resgates na tela de Metas"
                              >
                                <Trash2 className="h-4 w-4 opacity-30" />
                              </span>
                            ) : (
                              <button
                                type="button"
                                onClick={() => handleDelete(tx.id)}
                                className="p-1.5 text-slate-500 hover:text-rose-400 hover:bg-rose-500/10 rounded-lg transition-colors"
                                title="Excluir lançamento"
                                aria-label="Excluir lançamento"
                              >
                                <Trash2 className="h-4 w-4" />
                              </button>
                            )}
                          </div>
                        )}
                      </td>
                    </tr>
                  );
                })
                )}
              </tbody>
            </table>
          </div>

          {/* Pagination Footer */}
          {meta.totalPages > 1 && (
            <div className="p-3.5 sm:p-4 border-t border-slate-800 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-slate-400">
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
        <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)}>
          <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto p-4 sm:p-6 shadow-2xl relative my-auto">
              <button
                onClick={() => setIsModalOpen(false)}
                className="absolute right-3.5 top-3.5 text-slate-400 hover:text-white p-1.5 rounded-lg hover:bg-slate-800 transition-colors"
                aria-label="Fechar"
              >
                <X className="h-5 w-5" />
              </button>

              <h2 className="text-lg sm:text-xl font-bold text-white mb-4 pr-6">Novo Lançamento Financeiro</h2>

              {/* Type Switcher Tabs */}
              <div className="grid grid-cols-3 gap-1.5 sm:gap-2 p-1 bg-slate-800/80 rounded-xl mb-5">
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

              <form onSubmit={handleCreateTransaction} className="space-y-3.5 sm:space-y-4">
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
                    className="w-full text-base sm:text-lg font-bold bg-slate-800 border border-slate-700 rounded-xl px-3.5 py-2 sm:py-2.5 text-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                </div>

                {/* Description */}
                <div>
                  <label className="block text-xs font-semibold uppercase text-slate-400 mb-1">
                    Descrição *
                  </label>
                  <AutocompleteInput
                    type={modalType}
                    familyId={selectedFamilyId}
                    value={description}
                    onChange={setDescription}
                    placeholder={
                      modalType === 'EXPENSE'
                        ? 'Ex: Aluguel, Supermercado, Combustível...'
                        : modalType === 'INCOME'
                        ? 'Ex: Salário, Rendimentos, Dividendos...'
                        : 'Ex: Reserva de emergência, Poupança...'
                    }
                    required
                    className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3.5 py-2 sm:py-2.5 text-xs sm:text-sm text-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                </div>

                {/* Date and Time */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                  <div className="min-w-0">
                    <label className="block text-xs font-semibold uppercase text-slate-400 mb-1">
                      Data do Lançamento *
                    </label>
                    <input
                      type="date"
                      required
                      value={transactionDate}
                      onChange={(e) => setTransactionDate(e.target.value)}
                      className="w-full max-w-full bg-slate-800 border border-slate-700 rounded-xl px-3.5 py-2 text-xs sm:text-sm text-white focus:outline-none focus:ring-2 focus:ring-emerald-500 cursor-pointer"
                    />
                  </div>
                  <div className="min-w-0">
                    <label className="block text-xs font-semibold uppercase text-slate-400 mb-1">
                      Horário (Opcional)
                    </label>
                    <input
                      type="time"
                      value={transactionTime}
                      onChange={(e) => setTransactionTime(e.target.value)}
                      className="w-full max-w-full bg-slate-800 border border-slate-700 rounded-xl px-3.5 py-2 text-xs sm:text-sm text-white focus:outline-none focus:ring-2 focus:ring-emerald-500 cursor-pointer"
                    />
                  </div>
                </div>

                {/* Conditional Fields for TRANSFER */}
                {modalType === 'TRANSFER' ? (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                    <div>
                      <label className="block text-xs font-semibold uppercase text-slate-400 mb-1">
                        Conta Origem *
                      </label>
                      <select
                        value={accountId}
                        onChange={(e) => setAccountId(e.target.value)}
                        required
                        className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-xs sm:text-sm text-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
                      >
                        {accounts.map((acc) => (
                          <option key={acc.id} value={acc.id}>
                            {acc.isFavorite ? '★ ' : ''}{acc.name} ({formatCurrency(acc.currentBalance)})
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
                        className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-xs sm:text-sm text-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
                      >
                        <option value="">Selecione...</option>
                        {accounts
                          .filter((a) => a.id !== accountId)
                          .map((acc) => (
                            <option key={acc.id} value={acc.id}>
                              {acc.isFavorite ? '★ ' : ''}{acc.name} ({formatCurrency(acc.currentBalance)})
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
                        className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-xs sm:text-sm text-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
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
                      <div className="space-y-2.5 pt-1">
                        <label className="block text-xs font-semibold uppercase text-slate-400">
                          Forma de Pagamento
                        </label>
                        <div className="flex flex-col sm:flex-row gap-2 sm:gap-4">
                          <label className="flex items-center gap-2 text-xs sm:text-sm text-slate-300 cursor-pointer">
                            <input
                              type="radio"
                              name="paymentMode"
                              checked={paymentMode === 'ACCOUNT'}
                              onChange={() => setPaymentMode('ACCOUNT')}
                              className="accent-emerald-500"
                            />
                            <span>Conta Bancária / Dinheiro</span>
                          </label>
                          <label className="flex items-center gap-2 text-xs sm:text-sm text-slate-300 cursor-pointer">
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
                              className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-xs sm:text-sm text-white"
                            >
                              {accounts.map((acc) => (
                                <option key={acc.id} value={acc.id}>
                                  {acc.isFavorite ? '★ ' : ''}{acc.name} ({formatCurrency(acc.currentBalance)})
                                </option>
                              ))}
                            </select>
                          </div>
                        ) : (
                          <div className="space-y-2">
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 sm:gap-3">
                              <div>
                                <select
                                  value={creditCardId}
                                  onChange={(e) => setCreditCardId(e.target.value)}
                                  className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-xs sm:text-sm text-white"
                                >
                                  {cards.map((c) => (
                                    <option key={c.id} value={c.id}>
                                      {c.isFavorite ? '★ ' : ''}{c.name} (Disp: {formatCurrency(c.availableLimit)})
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
                                  className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-xs sm:text-sm text-white"
                                />
                              </div>
                            </div>
                            {isCardOverLimit && (
                              <p className="text-[11px] sm:text-xs text-rose-400 font-medium bg-rose-500/10 border border-rose-500/20 px-2.5 py-1.5 rounded-lg flex items-center gap-1.5">
                                <span>⚠️ O valor da despesa ({formatCurrency(parsedAmount)}) excede o limite disponível de {formatCurrency(selectedCard?.availableLimit || 0)}.</span>
                              </p>
                            )}
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
                          className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-xs sm:text-sm text-white"
                        >
                          {accounts.map((acc) => (
                            <option key={acc.id} value={acc.id}>
                              {acc.isFavorite ? '★ ' : ''}{acc.name} ({formatCurrency(acc.currentBalance)})
                            </option>
                          ))}
                        </select>
                      </div>
                    )}
                  </>
                )}

                {/* Tags */}
                {modalType !== 'TRANSFER' && (
                  <div className="pt-1">
                    <label className="block text-xs font-semibold uppercase text-slate-400 mb-1">
                      Tags (opcional)
                    </label>
                    <TagInput
                      value={tags}
                      onChange={setTags}
                      familyId={selectedFamilyId}
                      placeholder="Adicionar tags (ex: #viagem, #festa)..."
                    />
                  </div>
                )}

                {/* Person Attribution */}
                {people.length > 0 && modalType !== 'TRANSFER' && (
                  <div className="pt-1">
                    <label className="block text-xs font-semibold uppercase text-slate-400 mb-1">
                      Quem realizou? (Pessoa da Família)
                    </label>
                    <select
                      value={personId}
                      onChange={(e) => setPersonId(e.target.value)}
                      className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3.5 py-2 text-xs sm:text-sm text-white focus:outline-none focus:ring-2 focus:ring-purple-500 cursor-pointer"
                    >
                      <option value="">Nenhum / Não atribuído (Titular)</option>
                      {people.map((p) => (
                        <option key={p.id} value={p.id}>
                          {p.name} {p.userId ? '(Membro)' : '(Sem login)'}
                        </option>
                      ))}
                    </select>
                    <p className="text-[11px] text-slate-500 mt-1">
                      Identifique quem usou o cartão emprestado ou realizou esta despesa/receita.
                    </p>
                  </div>
                )}

                {/* Privacy toggle */}
                <div className="pt-2">
                  <label className="flex items-center gap-2 text-xs text-slate-400 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={isPrivate}
                      onChange={(e) => setIsPrivate(e.target.checked)}
                      className="accent-emerald-500 rounded shrink-0"
                    />
                    <span>Marcar como lançamento privado (ocultar de outros membros)</span>
                  </label>
                </div>

                {/* Submit button */}
                <button
                  type="submit"
                  disabled={submitting || isCardOverLimit}
                  className="w-full mt-4 bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-600 hover:to-teal-600 text-slate-950 font-bold py-2.5 sm:py-3 px-4 rounded-xl shadow-lg shadow-emerald-500/20 transition-all disabled:opacity-50 disabled:cursor-not-allowed text-xs sm:text-sm"
                >
                  {isCardOverLimit
                    ? 'Limite do cartão insuficiente'
                    : submitting
                    ? 'Salvando lançamento...'
                    : 'Confirmar Lançamento'}
                </button>
              </form>
            </div>
        </Modal>

        {/* Edit Transaction Modal (Only Description and Tags Editable) */}
        <Modal
          isOpen={isEditModalOpen && !!editingTransaction}
          onClose={closeEditModal}
        >
          {editingTransaction && (() => {
            const editFormatted = formatTransactionDateTime(editingTransaction.transactionDate);
            const typeLabel =
              editingTransaction.type === 'INCOME'
                ? 'Receita'
                : editingTransaction.type === 'TRANSFER'
                ? 'Transferência'
                : 'Despesa';
            const accountOrCardLabel =
              editingTransaction.type === 'TRANSFER'
                ? `${editingTransaction.account?.name || '-'}${
                    editingTransaction.destinationAccount
                      ? ` → ${editingTransaction.destinationAccount.name}`
                      : ''
                  }`
                : editingTransaction.creditCard
                ? `${editingTransaction.creditCard.name}${
                    editingTransaction.totalInstallments && editingTransaction.totalInstallments > 1
                      ? ` (${editingTransaction.installmentNumber}/${editingTransaction.totalInstallments})`
                      : ''
                  }`
                : editingTransaction.account?.name || '-';
            const hasInstallments =
              Boolean(editingTransaction.installmentGroupId) ||
              (editingTransaction.totalInstallments && editingTransaction.totalInstallments > 1);

            return (
              <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto p-4 sm:p-6 shadow-2xl relative my-auto">
                <button
                  type="button"
                  onClick={closeEditModal}
                  className="absolute right-3.5 top-3.5 text-slate-400 hover:text-white p-1.5 rounded-lg hover:bg-slate-800 transition-colors"
                  aria-label="Fechar"
                >
                  <X className="h-5 w-5" />
                </button>

                <h2 className="text-lg sm:text-xl font-bold text-white mb-3 pr-6">Editar Lançamento</h2>

                <div className="mb-4 rounded-xl bg-slate-800/70 border border-slate-700/80 p-3 space-y-1.5">
                  <p className="text-[11px] sm:text-xs text-amber-400/90 flex items-start gap-1.5">
                    <AlertCircle className="h-3.5 w-3.5 shrink-0 mt-0.5" />
                    <span>
                      Apenas <strong>Descrição</strong> e <strong>Tags</strong> podem ser editadas. Os demais campos são imutáveis para preservar os saldos e faturas.
                    </span>
                  </p>
                  {hasInstallments && (
                    <p className="text-[11px] text-emerald-400/90 pl-5">
                      Compra parcelada ({editingTransaction.installmentNumber}/{editingTransaction.totalInstallments}): as alterações serão aplicadas automaticamente a todas as parcelas desta compra.
                    </p>
                  )}
                </div>

                <form onSubmit={handleUpdateTransaction} className="space-y-3.5 sm:space-y-4">
                  {/* Editable: Description */}
                  <div>
                    <label className="block text-xs font-semibold uppercase text-emerald-400 mb-1">
                      Descrição *
                    </label>
                    <AutocompleteInput
                      type={editingTransaction.type || 'EXPENSE'}
                      familyId={editingTransaction.familyId ?? selectedFamilyId}
                      value={editDescription}
                      onChange={setEditDescription}
                      placeholder="Informe a descrição do lançamento..."
                      required
                      autoFocus
                      className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3.5 py-2 sm:py-2.5 text-xs sm:text-sm text-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
                    />
                  </div>

                  {/* Editable: Tags */}
                  <div>
                    <label className="block text-xs font-semibold uppercase text-emerald-400 mb-1">
                      Tags (opcional)
                    </label>
                    <TagInput
                      value={editTags}
                      onChange={setEditTags}
                      familyId={editingTransaction.familyId ?? selectedFamilyId}
                      placeholder="Adicionar ou remover tags (ex: #viagem, #festa)..."
                    />
                  </div>

                  {/* Immutable fields */}
                  <div className="pt-2 border-t border-slate-800 space-y-3">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div>
                        <div className="flex items-center justify-between mb-1">
                          <label className="text-xs font-semibold uppercase text-slate-400">Tipo</label>
                          <span className="text-[10px] font-semibold uppercase tracking-wider bg-slate-700/80 text-slate-400 px-1.5 py-0.5 rounded">
                            Imutável
                          </span>
                        </div>
                        <input
                          type="text"
                          value={typeLabel}
                          disabled
                          readOnly
                          className="w-full bg-slate-800/60 border border-slate-700/80 rounded-xl px-3.5 py-2 text-xs sm:text-sm text-slate-400 cursor-not-allowed"
                        />
                      </div>

                      <div>
                        <div className="flex items-center justify-between mb-1">
                          <label className="text-xs font-semibold uppercase text-slate-400">Valor (R$)</label>
                          <span className="text-[10px] font-semibold uppercase tracking-wider bg-slate-700/80 text-slate-400 px-1.5 py-0.5 rounded">
                            Imutável
                          </span>
                        </div>
                        <input
                          type="text"
                          value={formatCurrency(editingTransaction.amount)}
                          disabled
                          readOnly
                          className="w-full bg-slate-800/60 border border-slate-700/80 rounded-xl px-3.5 py-2 text-xs sm:text-sm font-bold text-slate-400 cursor-not-allowed"
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div>
                        <div className="flex items-center justify-between mb-1">
                          <label className="text-xs font-semibold uppercase text-slate-400">Data</label>
                          <span className="text-[10px] font-semibold uppercase tracking-wider bg-slate-700/80 text-slate-400 px-1.5 py-0.5 rounded">
                            Imutável
                          </span>
                        </div>
                        <input
                          type="text"
                          value={editFormatted.date}
                          disabled
                          readOnly
                          className="w-full bg-slate-800/60 border border-slate-700/80 rounded-xl px-3.5 py-2 text-xs sm:text-sm text-slate-400 cursor-not-allowed"
                        />
                      </div>

                      <div>
                        <div className="flex items-center justify-between mb-1">
                          <label className="text-xs font-semibold uppercase text-slate-400">Horário</label>
                          <span className="text-[10px] font-semibold uppercase tracking-wider bg-slate-700/80 text-slate-400 px-1.5 py-0.5 rounded">
                            Imutável
                          </span>
                        </div>
                        <input
                          type="text"
                          value={editFormatted.time || '--:--'}
                          disabled
                          readOnly
                          className="w-full bg-slate-800/60 border border-slate-700/80 rounded-xl px-3.5 py-2 text-xs sm:text-sm text-slate-400 cursor-not-allowed"
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div>
                        <div className="flex items-center justify-between mb-1">
                          <label className="text-xs font-semibold uppercase text-slate-400">Categoria</label>
                          <span className="text-[10px] font-semibold uppercase tracking-wider bg-slate-700/80 text-slate-400 px-1.5 py-0.5 rounded">
                            Imutável
                          </span>
                        </div>
                        <input
                          type="text"
                          value={editingTransaction.category?.name || 'Geral'}
                          disabled
                          readOnly
                          className="w-full bg-slate-800/60 border border-slate-700/80 rounded-xl px-3.5 py-2 text-xs sm:text-sm text-slate-400 cursor-not-allowed"
                        />
                      </div>

                      <div>
                        <div className="flex items-center justify-between mb-1">
                          <label className="text-xs font-semibold uppercase text-slate-400">Conta / Cartão</label>
                          <span className="text-[10px] font-semibold uppercase tracking-wider bg-slate-700/80 text-slate-400 px-1.5 py-0.5 rounded">
                            Imutável
                          </span>
                        </div>
                        <input
                          type="text"
                          value={accountOrCardLabel}
                          disabled
                          readOnly
                          className="w-full bg-slate-800/60 border border-slate-700/80 rounded-xl px-3.5 py-2 text-xs sm:text-sm text-slate-400 cursor-not-allowed"
                        />
                      </div>
                    </div>

                    {(people.length > 0 || editingTransaction.person) && (
                      <div>
                        <div className="flex items-center justify-between mb-1">
                          <label className="text-xs font-semibold uppercase text-slate-400">
                            Pessoa Responsável
                          </label>
                          <span className="text-[10px] font-semibold uppercase tracking-wider bg-slate-700/80 text-slate-400 px-1.5 py-0.5 rounded">
                            Imutável
                          </span>
                        </div>
                        <input
                          type="text"
                          value={editingTransaction.person?.name || 'Nenhum / Não atribuído (Titular)'}
                          disabled
                          readOnly
                          className="w-full bg-slate-800/60 border border-slate-700/80 rounded-xl px-3.5 py-2 text-xs sm:text-sm text-slate-400 cursor-not-allowed"
                        />
                      </div>
                    )}

                    <div className="flex items-center justify-between pt-1">
                      <label className="flex items-center gap-2 text-xs text-slate-500 cursor-not-allowed">
                        <input
                          type="checkbox"
                          checked={Boolean(editingTransaction.isPrivate)}
                          disabled
                          className="accent-emerald-500 rounded shrink-0 cursor-not-allowed opacity-60"
                        />
                        <span>Lançamento privado (ocultar de outros membros)</span>
                      </label>
                      <span className="text-[10px] font-semibold uppercase tracking-wider bg-slate-700/80 text-slate-400 px-1.5 py-0.5 rounded shrink-0 ml-2">
                        Imutável
                      </span>
                    </div>
                  </div>

                  <div className="flex gap-2 pt-2">
                    <button
                      type="button"
                      onClick={closeEditModal}
                      className="w-1/3 bg-slate-800 hover:bg-slate-700 text-slate-300 font-semibold py-2.5 sm:py-3 px-3 rounded-xl transition-all text-xs sm:text-sm"
                    >
                      Cancelar
                    </button>
                    <button
                      type="submit"
                      disabled={editSubmitting}
                      className="w-2/3 bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-600 hover:to-teal-600 text-slate-950 font-bold py-2.5 sm:py-3 px-4 rounded-xl shadow-lg shadow-emerald-500/20 transition-all disabled:opacity-50 disabled:cursor-not-allowed text-xs sm:text-sm"
                    >
                      {editSubmitting ? 'Salvando...' : 'Salvar Alterações'}
                    </button>
                  </div>
                </form>
              </div>
            );
          })()}
        </Modal>
      </div>
    </AppShell>
  );
}
