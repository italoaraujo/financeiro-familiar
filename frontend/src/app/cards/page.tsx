'use client';

import React, { useEffect, useState } from 'react';
import AppShell from '../../components/layout/AppShell';
import { useAuth } from '../../context/AuthContext';
import { apiRequest } from '../../lib/api';
import { formatCurrency, formatDate } from '../../lib/formatters';
import {
  Plus,
  CreditCard as CardIcon,
  Calendar,
  Users,
  User,
  ShoppingBag,
  X,
  Pencil,
  Trash2,
  FileText,
  Archive,
  ArchiveRestore,
  Star,
} from 'lucide-react';
import { Modal } from '../../components/ui/Modal';

const INVOICE_STATUS_MAP: Record<string, { label: string; className: string }> = {
  OPEN: {
    label: 'Aberta',
    className: 'bg-amber-500/10 text-amber-400 border border-amber-500/20',
  },
  CLOSED: {
    label: 'Fechada',
    className: 'bg-blue-500/10 text-blue-400 border border-blue-500/20',
  },
  PAID: {
    label: 'Paga',
    className: 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20',
  },
  OVERDUE: {
    label: 'Vencida',
    className: 'bg-rose-500/10 text-rose-400 border border-rose-500/20',
  },
};

function renderInvoiceStatusBadge(status: string) {
  const config = INVOICE_STATUS_MAP[status] || {
    label: status,
    className: 'bg-slate-700/50 text-slate-300 border border-slate-600',
  };
  return (
    <span className={`text-[9px] sm:text-[10px] uppercase tracking-wider font-bold px-1.5 sm:px-2 py-0.5 rounded ${config.className}`}>
      {config.label}
    </span>
  );
}

export default function CreditCardsPage() {
  const { user, selectedFamilyId, isViewer } = useAuth();
  const [loading, setLoading] = useState(true);
  const [cards, setCards] = useState<any[]>([]);
  const [accounts, setAccounts] = useState<any[]>([]);
  const [activeTab, setActiveTab] = useState<'active' | 'archived'>('active');
  const [togglingFavoriteId, setTogglingFavoriteId] = useState<string | null>(null);

  // Modals
  const [isCardModalOpen, setIsCardModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editingCard, setEditingCard] = useState<any>(null);
  const [isPayModalOpen, setIsPayModalOpen] = useState(false);
  const [isDetailsModalOpen, setIsDetailsModalOpen] = useState(false);
  const [selectedInvoice, setSelectedInvoice] = useState<any>(null);
  const [selectedInvoiceDetails, setSelectedInvoiceDetails] = useState<any>(null);
  const [loadingDetails, setLoadingDetails] = useState(false);

  // New Card Form
  const [name, setName] = useState('');
  const [brand, setBrand] = useState('Mastercard');
  const [creditLimit, setCreditLimit] = useState('');
  const [closingDay, setClosingDay] = useState(20);
  const [dueDay, setDueDay] = useState(27);
  const [color, setColor] = useState('#8b5cf6');

  // Edit Card Form
  const [editName, setEditName] = useState('');
  const [editBrand, setEditBrand] = useState('Mastercard');
  const [editCreditLimit, setEditCreditLimit] = useState('');
  const [editClosingDay, setEditClosingDay] = useState(20);
  const [editDueDay, setEditDueDay] = useState(27);
  const [editColor, setEditColor] = useState('#8b5cf6');

  // Pay Invoice Form
  const [paymentAccountId, setPaymentAccountId] = useState('');
  const [paymentAmount, setPaymentAmount] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const loadData = async () => {
    setLoading(true);
    try {
      const baseParams: any = selectedFamilyId ? { familyId: selectedFamilyId } : {};
      const [cardsData, accsData] = await Promise.all([
        apiRequest('/credit-cards', {
          params: {
            ...baseParams,
            includeArchived: 'true',
          },
        }),
        apiRequest('/accounts', { params: baseParams }),
      ]);
      setCards(cardsData || []);
      setAccounts(accsData || []);
      setPaymentAccountId(accsData && accsData.length > 0 ? accsData[0].id : '');
    } catch (err) {
      console.error('Error loading cards data:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (user) {
      loadData();
    }
  }, [user, selectedFamilyId]);

  const handleCreateCard = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);

    try {
      await apiRequest('/credit-cards', {
        method: 'POST',
        body: JSON.stringify({
          name,
          brand,
          creditLimit: parseFloat(creditLimit) || 0,
          closingDay: Number(closingDay),
          dueDay: Number(dueDay),
          color,
          familyId: selectedFamilyId || undefined,
        }),
      });

      setIsCardModalOpen(false);
      setName('');
      setCreditLimit('');
      loadData();
    } catch (err: any) {
      alert(err.message || 'Erro ao criar cartão');
    } finally {
      setSubmitting(false);
    }
  };

  const openEditModal = (card: any) => {
    setEditingCard(card);
    setEditName(card.name || '');
    setEditBrand(card.brand || 'Mastercard');
    setEditCreditLimit(card.creditLimit ? String(card.creditLimit) : '');
    setEditClosingDay(card.closingDay || 20);
    setEditDueDay(card.dueDay || 27);
    setEditColor(card.color || '#8b5cf6');
    setIsEditModalOpen(true);
  };

  const handleUpdateCard = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingCard) return;
    setSubmitting(true);

    try {
      await apiRequest(`/credit-cards/${editingCard.id}`, {
        method: 'PUT',
        body: JSON.stringify({
          name: editName,
          brand: editBrand,
          creditLimit: parseFloat(editCreditLimit) || 0,
          closingDay: Number(editClosingDay),
          dueDay: Number(editDueDay),
          color: editColor,
        }),
      });

      setIsEditModalOpen(false);
      setEditingCard(null);
      loadData();
    } catch (err: any) {
      alert(err.message || 'Erro ao atualizar cartão');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteCard = async (cardId: string) => {
    if (!confirm('Deseja excluir este cartão de crédito? (Apenas permitido se não houver lançamentos vinculados)')) {
      return;
    }
    try {
      await apiRequest(`/credit-cards/${cardId}`, { method: 'DELETE' });
      loadData();
    } catch (err: any) {
      alert(err.message || 'Erro ao excluir cartão');
    }
  };

  const handleToggleFavorite = async (card: any) => {
    setTogglingFavoriteId(card.id);
    try {
      await apiRequest(`/credit-cards/${card.id}/${card.isFavorite ? 'unfavorite' : 'favorite'}`, {
        method: 'PATCH',
      });
      await loadData();
    } catch (err: any) {
      alert(err.message || 'Erro ao atualizar favorito do cartão');
    } finally {
      setTogglingFavoriteId(null);
    }
  };

  const handleArchiveCard = async (cardId: string) => {
    if (!confirm('Deseja arquivar este cartão de crédito? Ele não aparecerá na listagem ativa, mas o histórico e faturas serão preservados.')) {
      return;
    }
    try {
      await apiRequest(`/credit-cards/${cardId}/archive`, { method: 'PATCH' });
      loadData();
    } catch (err: any) {
      alert(err.message || 'Erro ao arquivar cartão');
    }
  };

  const handleUnarchiveCard = async (cardId: string) => {
    if (!confirm('Deseja desarquivar este cartão de crédito? Ele voltará a aparecer na listagem ativa.')) {
      return;
    }
    try {
      await apiRequest(`/credit-cards/${cardId}/unarchive`, { method: 'PATCH' });
      loadData();
    } catch (err: any) {
      alert(err.message || 'Erro ao desarquivar cartão');
    }
  };

  const handlePayInvoice = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedInvoice) return;
    setSubmitting(true);

    try {
      await apiRequest(`/credit-cards/invoices/${selectedInvoice.id}/pay`, {
        method: 'POST',
        body: JSON.stringify({
          accountId: paymentAccountId,
          amount: paymentAmount ? parseFloat(paymentAmount) : undefined,
        }),
      });

      setIsPayModalOpen(false);
      setSelectedInvoice(null);
      setPaymentAmount('');
      loadData();
    } catch (err: any) {
      alert(err.message || 'Erro ao pagar fatura');
    } finally {
      setSubmitting(false);
    }
  };

  const openPayModal = (inv: any) => {
    setSelectedInvoice(inv);
    const remaining = Number(inv.totalAmount) - Number(inv.paidAmount);
    setPaymentAmount(remaining.toFixed(2));
    setIsPayModalOpen(true);
  };

  const openInvoiceDetails = async (invoiceId: string) => {
    setIsDetailsModalOpen(true);
    setLoadingDetails(true);
    try {
      const details = await apiRequest(`/credit-cards/invoices/${invoiceId}`);
      setSelectedInvoiceDetails(details);
    } catch (err: any) {
      alert(err.message || 'Erro ao carregar detalhes da fatura');
      setIsDetailsModalOpen(false);
    } finally {
      setLoadingDetails(false);
    }
  };

  const activeCards = cards.filter((c) => c.isActive !== false);
  const archivedCards = cards.filter((c) => c.isActive === false);
  const displayedCards = activeTab === 'active' ? activeCards : archivedCards;

  return (
    <AppShell>
      <div className="space-y-6 sm:space-y-8">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-xl sm:text-2xl font-bold text-white tracking-tight">Cartões de Crédito & Faturas</h1>
            <p className="text-xs sm:text-sm text-slate-400">
              Acompanhe limites, ciclos de fechamento e liquidação de faturas
            </p>
          </div>

          {!isViewer && (
            <button
              onClick={() => setIsCardModalOpen(true)}
              className="inline-flex items-center justify-center gap-2 bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-600 hover:to-teal-600 text-slate-950 font-semibold px-4 py-2.5 rounded-xl text-xs sm:text-sm shadow-lg shadow-emerald-500/20 transition-all w-full sm:w-auto"
            >
              <Plus className="h-4 w-4 shrink-0" />
              <span>Novo Cartão</span>
            </button>
          )}
        </div>

        {/* Tabs Ativos / Arquivados */}
        <div className="flex items-center gap-2 border-b border-slate-800 pb-3">
          <button
            type="button"
            onClick={() => setActiveTab('active')}
            className={`inline-flex items-center gap-2 px-4 py-2 rounded-xl text-xs sm:text-sm font-semibold transition-all ${
              activeTab === 'active'
                ? 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/30'
                : 'text-slate-400 hover:text-white hover:bg-slate-900 border border-transparent'
            }`}
          >
            <span>Ativos</span>
            <span
              className={`px-2 py-0.5 rounded-full text-[11px] font-bold ${
                activeTab === 'active' ? 'bg-emerald-500/20 text-emerald-300' : 'bg-slate-800 text-slate-400'
              }`}
            >
              {activeCards.length}
            </span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('archived')}
            className={`inline-flex items-center gap-2 px-4 py-2 rounded-xl text-xs sm:text-sm font-semibold transition-all ${
              activeTab === 'archived'
                ? 'bg-amber-500/15 text-amber-400 border border-amber-500/30'
                : 'text-slate-400 hover:text-white hover:bg-slate-900 border border-transparent'
            }`}
          >
            <span>Arquivados</span>
            <span
              className={`px-2 py-0.5 rounded-full text-[11px] font-bold ${
                activeTab === 'archived' ? 'bg-amber-500/20 text-amber-300' : 'bg-slate-800 text-slate-400'
              }`}
            >
              {archivedCards.length}
            </span>
          </button>
        </div>

        {/* Cards Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-5 sm:gap-8">
          {loading ? (
            <div className="col-span-full py-12 text-center text-slate-500 text-xs sm:text-sm">Carregando cartões...</div>
          ) : displayedCards.length === 0 ? (
            <div className="col-span-full py-12 text-center text-slate-500 bg-slate-900/40 border border-slate-800/80 rounded-2xl text-xs sm:text-sm">
              {activeTab === 'active'
                ? 'Nenhum cartão de crédito ativo cadastrado.'
                : 'Nenhum cartão de crédito arquivado no momento.'}
            </div>
          ) : (
            displayedCards.map((card) => {
              const limit = Number(card.creditLimit || 0);
              const committed = Number(card.committedAmount || 0);
              const available = Number(card.availableLimit || 0);
              const pct = limit > 0 ? Math.min(100, Math.round((committed / limit) * 100)) : 0;

              return (
                <div
                  key={card.id}
                  className={`bg-slate-900/80 border rounded-2xl p-4 sm:p-6 relative flex flex-col justify-between shadow-xl ${
                    card.isActive === false ? 'border-amber-500/20 opacity-90' : 'border-slate-800'
                  }`}
                >
                  {/* Card Visual Header */}
                  <div>
                    <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
                      <div className="flex items-center gap-3 min-w-0">
                        <div
                          className="h-10 w-10 rounded-xl flex items-center justify-center shadow shrink-0"
                          style={{ backgroundColor: `${card.color || '#8b5cf6'}25`, color: card.color || '#8b5cf6' }}
                        >
                          <CardIcon className="h-5 w-5" />
                        </div>
                        <div className="min-w-0">
                          <div className="flex items-center gap-2">
                            <h3 className="font-bold text-white text-base sm:text-lg leading-tight truncate">{card.name}</h3>
                            {card.isActive === false && (
                              <span className="shrink-0 px-2 py-0.5 rounded-full text-[10px] font-semibold uppercase tracking-wide bg-amber-500/15 text-amber-400 border border-amber-500/30">
                                Arquivado
                              </span>
                            )}
                          </div>
                          <span className="text-xs text-slate-400">{card.brand || 'Cartão'}</span>
                        </div>
                      </div>

                      <div className="flex items-center justify-between sm:justify-end gap-3 border-t sm:border-t-0 pt-2 sm:pt-0 border-slate-800">
                        <div className="text-left sm:text-right text-xs text-slate-400 space-y-0.5">
                          <p>Fechamento: dia <strong className="text-white">{card.closingDay}</strong></p>
                          <p>Vencimento: dia <strong className="text-white">{card.dueDay}</strong></p>
                        </div>
                        {!isViewer && (
                          <div className="flex items-center gap-1.5 shrink-0">
                            {card.isActive !== false && (
                              <button
                                type="button"
                                disabled={togglingFavoriteId === card.id}
                                onClick={() => handleToggleFavorite(card)}
                                className={`p-1.5 sm:p-2 rounded-xl bg-slate-800/80 hover:bg-slate-700 border border-slate-700/60 transition-all shrink-0 disabled:opacity-50 ${
                                  card.isFavorite ? 'text-amber-400' : 'text-slate-400 hover:text-amber-400'
                                }`}
                                title={card.isFavorite ? 'Remover dos favoritos' : 'Favoritar cartão'}
                                aria-label={card.isFavorite ? 'Remover dos favoritos' : 'Favoritar cartão'}
                              >
                                <Star className={`h-4 w-4 ${card.isFavorite ? 'fill-amber-400' : ''}`} />
                              </button>
                            )}
                            {card.isActive === false ? (
                              <button
                                onClick={() => handleUnarchiveCard(card.id)}
                                className="p-1.5 sm:p-2 rounded-xl text-slate-400 hover:text-emerald-400 bg-slate-800/80 hover:bg-slate-700 border border-slate-700/60 transition-all shrink-0"
                                title="Desarquivar cartão"
                                aria-label="Desarquivar cartão"
                              >
                                <ArchiveRestore className="h-4 w-4" />
                              </button>
                            ) : (
                              <button
                                onClick={() => handleArchiveCard(card.id)}
                                className="p-1.5 sm:p-2 rounded-xl text-slate-400 hover:text-amber-400 bg-slate-800/80 hover:bg-slate-700 border border-slate-700/60 transition-all shrink-0"
                                title="Arquivar cartão"
                                aria-label="Arquivar cartão"
                              >
                                <Archive className="h-4 w-4" />
                              </button>
                            )}
                            <button
                              onClick={() => openEditModal(card)}
                              className="p-1.5 sm:p-2 rounded-xl text-slate-400 hover:text-white bg-slate-800/80 hover:bg-slate-700 border border-slate-700/60 transition-all shrink-0"
                              title="Editar Cartão"
                              aria-label="Editar Cartão"
                            >
                              <Pencil className="h-4 w-4" />
                            </button>
                            <button
                              onClick={() => handleDeleteCard(card.id)}
                              className="p-1.5 sm:p-2 rounded-xl text-slate-400 hover:text-rose-400 bg-slate-800/80 hover:bg-slate-700 border border-slate-700/60 transition-all shrink-0"
                              title="Excluir cartão"
                              aria-label="Excluir cartão"
                            >
                              <Trash2 className="h-4 w-4" />
                            </button>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Limit Progress Bar */}
                    <div className="mt-4 sm:mt-6 pt-3 sm:pt-4 border-t border-slate-800/80 space-y-2">
                      <div className="flex justify-between items-center text-xs gap-2">
                        <span className="text-slate-400 truncate">Comprometido: <strong className="text-rose-400">{formatCurrency(committed)}</strong></span>
                        <span className="text-slate-400 font-semibold shrink-0">{pct}%</span>
                      </div>

                      <div className="w-full bg-slate-800 h-2.5 rounded-full overflow-hidden">
                        <div
                          className={`h-full rounded-full transition-all duration-500 ${
                            pct >= 90 ? 'bg-rose-500' : pct >= 70 ? 'bg-amber-500' : 'bg-purple-500'
                          }`}
                          style={{ width: `${pct}%` }}
                        ></div>
                      </div>

                      <div className="flex flex-col sm:flex-row justify-between text-xs pt-1 gap-1">
                        <span className="text-slate-400">Total: {formatCurrency(limit)}</span>
                        <span className="text-emerald-400 font-bold">Disponível: {formatCurrency(available)}</span>
                      </div>
                    </div>

                    {/* Invoices List */}
                    <div className="mt-5 sm:mt-6 space-y-2.5">
                      <div className="flex items-center justify-between">
                        <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400">
                          Faturas ({card.invoices?.length || 0})
                        </h4>
                      </div>
                      {card.invoices?.length === 0 ? (
                        <p className="text-xs text-slate-500">Nenhuma fatura registrada.</p>
                      ) : (
                        <div className="space-y-2.5 max-h-80 overflow-y-auto pr-1">
                          {card.invoices?.map((inv: any) => (
                            <div
                              key={inv.id}
                              className="bg-slate-800/40 border border-slate-700/50 rounded-xl p-3 flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 text-xs"
                            >
                              <div className="flex items-center gap-2.5 min-w-0">
                                <Calendar className="h-4 w-4 text-slate-400 shrink-0" />
                                <div className="min-w-0">
                                  <p className="font-semibold text-white truncate">Mês: {inv.referenceMonth}</p>
                                  <p className="text-slate-400 text-[11px] truncate">Vencimento: {formatDate(inv.dueDate)}</p>
                                </div>
                              </div>

                                <div className="flex items-center justify-between sm:justify-end gap-2 pt-2 sm:pt-0 border-t sm:border-t-0 border-slate-700/40 flex-wrap">
                                  <div className="text-left sm:text-right">
                                    <p className="font-bold text-white">{formatCurrency(inv.totalAmount)}</p>
                                    <div className="mt-0.5">
                                      {renderInvoiceStatusBadge(inv.status)}
                                    </div>
                                  </div>

                                  <button
                                    onClick={() => openInvoiceDetails(inv.id)}
                                    className="bg-slate-700 hover:bg-slate-600 text-slate-200 font-semibold px-2.5 py-1.5 rounded-lg text-xs transition-colors shrink-0 flex items-center gap-1.5"
                                    title="Ver detalhes da fatura"
                                  >
                                    <FileText className="h-3.5 w-3.5 text-purple-400" />
                                    <span>Ver fatura</span>
                                  </button>

                                  {!isViewer && inv.status !== 'PAID' && Number(inv.totalAmount) > 0 && (
                                    <button
                                      onClick={() => openPayModal(inv)}
                                      className="bg-purple-600 hover:bg-purple-500 text-white font-semibold px-2.5 py-1.5 rounded-lg text-xs transition-colors shrink-0"
                                    >
                                      Pagar Fatura
                                    </button>
                                  )}
                                </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Create Card Modal */}
        <Modal isOpen={isCardModalOpen} onClose={() => setIsCardModalOpen(false)}>
          <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-md max-h-[90vh] overflow-y-auto p-4 sm:p-6 shadow-2xl relative my-auto">
            <button
              onClick={() => setIsCardModalOpen(false)}
              className="absolute right-3.5 top-3.5 text-slate-400 hover:text-white p-1.5 rounded-lg hover:bg-slate-800 transition-colors"
              aria-label="Fechar"
            >
              <X className="h-5 w-5" />
            </button>

            <h2 className="text-lg sm:text-xl font-bold text-white mb-4 pr-6">Novo Cartão de Crédito</h2>

            <form onSubmit={handleCreateCard} className="space-y-3.5 sm:space-y-4">
              <div>
                <label className="block text-xs font-semibold uppercase text-slate-400 mb-1">Nome do Cartão *</label>
                <input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Ex: Nubank Ultravioleta, Itaú Black..."
                  className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3.5 py-2 sm:py-2.5 text-xs sm:text-sm text-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase text-slate-400 mb-1">Bandeira</label>
                <select
                  value={brand}
                  onChange={(e) => setBrand(e.target.value)}
                  className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-xs sm:text-sm text-white focus:outline-none focus:ring-2 focus:ring-emerald-500 cursor-pointer"
                >
                  <option value="Mastercard">Mastercard</option>
                  <option value="Visa">Visa</option>
                  <option value="Elo">Elo</option>
                  <option value="American Express">American Express</option>
                  <option value="Hipercard">Hipercard</option>
                  <option value="Outro">Outro</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase text-slate-400 mb-1">Limite Total (R$) *</label>
                <input
                  type="number"
                  step="0.01"
                  required
                  min="1"
                  value={creditLimit}
                  onChange={(e) => setCreditLimit(e.target.value)}
                  placeholder="Ex: 5000,00"
                  className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3.5 py-2 text-xs sm:text-sm text-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                <div>
                  <label className="block text-xs font-semibold uppercase text-slate-400 mb-1">Dia Fechamento *</label>
                  <input
                    type="number"
                    min="1"
                    max="31"
                    required
                    value={closingDay}
                    onChange={(e) => setClosingDay(parseInt(e.target.value) || 1)}
                    className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-xs sm:text-sm text-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold uppercase text-slate-400 mb-1">Dia Vencimento *</label>
                  <input
                    type="number"
                    min="1"
                    max="31"
                    required
                    value={dueDay}
                    onChange={(e) => setDueDay(parseInt(e.target.value) || 1)}
                    className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-xs sm:text-sm text-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase text-slate-400 mb-1">Cor do Cartão</label>
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
                {submitting ? 'Cadastrando cartão...' : 'Cadastrar Cartão'}
              </button>
            </form>
          </div>
        </Modal>

        {/* Edit Card Modal */}
        <Modal
          isOpen={isEditModalOpen && !!editingCard}
          onClose={() => {
            setIsEditModalOpen(false);
            setEditingCard(null);
          }}
        >
          {editingCard && (
            <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-md max-h-[90vh] overflow-y-auto p-4 sm:p-6 shadow-2xl relative my-auto">
              <button
                onClick={() => {
                  setIsEditModalOpen(false);
                  setEditingCard(null);
                }}
                className="absolute right-3.5 top-3.5 text-slate-400 hover:text-white p-1.5 rounded-lg hover:bg-slate-800 transition-colors"
                aria-label="Fechar"
              >
                <X className="h-5 w-5" />
              </button>

              <div className="flex items-center gap-3 mb-4 pr-6">
                <div
                  className="h-10 w-10 rounded-xl flex items-center justify-center shadow shrink-0"
                  style={{ backgroundColor: `${editColor}25`, color: editColor }}
                >
                  <Pencil className="h-5 w-5" />
                </div>
                <div>
                  <h2 className="text-lg sm:text-xl font-bold text-white leading-tight">Editar Cartão</h2>
                  <p className="text-xs text-slate-400">Atualize dados cadastrais e ciclo de faturas</p>
                </div>
              </div>

              <form onSubmit={handleUpdateCard} className="space-y-3.5 sm:space-y-4">
                <div>
                  <label className="block text-xs font-semibold uppercase text-slate-400 mb-1">Nome do Cartão *</label>
                  <input
                    type="text"
                    required
                    value={editName}
                    onChange={(e) => setEditName(e.target.value)}
                    placeholder="Ex: Nubank Ultravioleta, Itaú Black..."
                    className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3.5 py-2 sm:py-2.5 text-xs sm:text-sm text-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold uppercase text-slate-400 mb-1">Bandeira</label>
                  <select
                    value={editBrand}
                    onChange={(e) => setEditBrand(e.target.value)}
                    className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-xs sm:text-sm text-white focus:outline-none focus:ring-2 focus:ring-emerald-500 cursor-pointer"
                  >
                    <option value="Mastercard">Mastercard</option>
                    <option value="Visa">Visa</option>
                    <option value="Elo">Elo</option>
                    <option value="American Express">American Express</option>
                    <option value="Hipercard">Hipercard</option>
                    <option value="Outro">Outro</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold uppercase text-slate-400 mb-1">Limite Total (R$) *</label>
                  <input
                    type="number"
                    step="0.01"
                    required
                    min="0.01"
                    value={editCreditLimit}
                    onChange={(e) => setEditCreditLimit(e.target.value)}
                    placeholder="Ex: 5000,00"
                    className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3.5 py-2 text-xs sm:text-sm text-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                  <div>
                    <label className="block text-xs font-semibold uppercase text-slate-400 mb-1">Dia Fechamento *</label>
                    <input
                      type="number"
                      min="1"
                      max="31"
                      required
                      value={editClosingDay}
                      onChange={(e) => setEditClosingDay(parseInt(e.target.value) || 1)}
                      className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-xs sm:text-sm text-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold uppercase text-slate-400 mb-1">Dia Vencimento *</label>
                    <input
                      type="number"
                      min="1"
                      max="31"
                      required
                      value={editDueDay}
                      onChange={(e) => setEditDueDay(parseInt(e.target.value) || 1)}
                      className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-xs sm:text-sm text-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold uppercase text-slate-400 mb-1">Cor do Cartão</label>
                  <div className="flex items-center gap-3">
                    <input
                      type="color"
                      value={editColor}
                      onChange={(e) => setEditColor(e.target.value)}
                      className="h-9 w-14 sm:h-10 sm:w-16 bg-slate-800 border border-slate-700 rounded-lg cursor-pointer"
                    />
                    <span className="text-xs text-slate-400">{editColor}</span>
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={submitting}
                  className="w-full mt-4 bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-600 hover:to-teal-600 text-slate-950 font-bold py-2.5 sm:py-3 px-4 rounded-xl shadow-lg shadow-emerald-500/20 transition-all disabled:opacity-50 text-xs sm:text-sm"
                >
                  {submitting ? 'Salvando...' : 'Salvar Alterações'}
                </button>
              </form>
            </div>
          )}
        </Modal>

        {/* Pay Invoice Modal */}
        <Modal isOpen={isPayModalOpen} onClose={() => setIsPayModalOpen(false)}>
          <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-md max-h-[90vh] overflow-y-auto p-4 sm:p-6 shadow-2xl relative my-auto">
            <button
              onClick={() => setIsPayModalOpen(false)}
              className="absolute right-3.5 top-3.5 text-slate-400 hover:text-white p-1.5 rounded-lg hover:bg-slate-800 transition-colors"
              aria-label="Fechar"
            >
              <X className="h-5 w-5" />
            </button>

            <h2 className="text-lg sm:text-xl font-bold text-white mb-2 pr-6">Liquidação de Fatura</h2>
            <p className="text-xs text-slate-400 mb-4">
              Fatura de {selectedInvoice?.referenceMonth} ({formatCurrency(selectedInvoice?.totalAmount)})
            </p>

            <form onSubmit={handlePayInvoice} className="space-y-3.5 sm:space-y-4">
              <div>
                <label className="block text-xs font-semibold uppercase text-slate-400 mb-1">Conta de Débito *</label>
                <select
                  value={paymentAccountId}
                  onChange={(e) => setPaymentAccountId(e.target.value)}
                  required
                  className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-xs sm:text-sm text-white focus:outline-none focus:ring-2 focus:ring-emerald-500 cursor-pointer"
                >
                  {accounts.map((acc) => (
                    <option key={acc.id} value={acc.id}>
                      {acc.isFavorite ? '★ ' : ''}{acc.name} ({formatCurrency(acc.currentBalance)})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase text-slate-400 mb-1">Valor do Pagamento (R$) *</label>
                <input
                  type="number"
                  step="0.01"
                  required
                  min="0.01"
                  value={paymentAmount}
                  onChange={(e) => setPaymentAmount(e.target.value)}
                  className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3.5 py-2 text-xs sm:text-sm text-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>

              <button
                type="submit"
                disabled={submitting}
                className="w-full mt-4 bg-gradient-to-r from-purple-500 to-indigo-500 hover:from-purple-600 hover:to-indigo-600 text-white font-bold py-2.5 sm:py-3 px-4 rounded-xl shadow-lg shadow-purple-500/20 transition-all disabled:opacity-50 text-xs sm:text-sm"
              >
                {submitting ? 'Confirmando pagamento...' : 'Efetivar Pagamento da Fatura'}
              </button>
            </form>
          </div>
        </Modal>

        {/* Invoice Details & Person Breakdown Modal */}
        <Modal isOpen={isDetailsModalOpen} onClose={() => setIsDetailsModalOpen(false)}>
          <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto p-4 sm:p-6 shadow-2xl relative my-auto">
            <button
              onClick={() => setIsDetailsModalOpen(false)}
              className="absolute right-3.5 top-3.5 text-slate-400 hover:text-white p-1.5 rounded-lg hover:bg-slate-800 transition-colors"
              aria-label="Fechar"
            >
              <X className="h-5 w-5" />
            </button>

            <div className="pr-6 mb-4">
              <div className="flex items-center gap-2">
                <h2 className="text-lg sm:text-xl font-bold text-white">
                  Fatura • {selectedInvoiceDetails?.referenceMonth || '...'}
                </h2>
                {selectedInvoiceDetails?.status && renderInvoiceStatusBadge(selectedInvoiceDetails.status)}
              </div>
              <p className="text-xs text-slate-400 mt-0.5">
                Cartão: <strong>{selectedInvoiceDetails?.creditCard?.name}</strong> • Vencimento:{' '}
                {selectedInvoiceDetails?.dueDate ? formatDate(selectedInvoiceDetails.dueDate) : '-'}
              </p>
            </div>

            {loadingDetails ? (
              <div className="py-12 text-center text-slate-500 text-xs sm:text-sm">
                Carregando detalhes e lançamentos da fatura...
              </div>
            ) : (
              <div className="space-y-5">
                {/* Total Card */}
                <div className="bg-slate-800/60 border border-slate-700/60 rounded-xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div>
                    <span className="text-xs text-slate-400 font-medium">Valor Total da Fatura</span>
                    <div className="text-2xl font-bold text-white">
                      {formatCurrency(selectedInvoiceDetails?.totalAmount || 0)}
                    </div>
                  </div>
                  <div className="text-left sm:text-right">
                    <span className="text-xs text-slate-400 font-medium">Limite do Cartão</span>
                    <div className="text-sm font-semibold text-slate-300">
                      {formatCurrency(selectedInvoiceDetails?.creditCard?.creditLimit || 0)}
                    </div>
                  </div>
                </div>

                {/* Breakdown by Person */}
                {selectedInvoiceDetails?.personTotals && selectedInvoiceDetails.personTotals.length > 0 && (
                  <div>
                    <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-400 mb-2.5 flex items-center gap-1.5">
                      <Users className="h-3.5 w-3.5 text-purple-400" />
                      <span>Divisão de Gastos por Pessoa</span>
                    </h3>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                      {selectedInvoiceDetails.personTotals.map((pt: any) => {
                        const total = Number(selectedInvoiceDetails.totalAmount) || 0;
                        const pct = total > 0 ? Math.round((Number(pt.total) / total) * 100) : 0;
                        return (
                          <div
                            key={pt.personId || 'unassigned'}
                            className="bg-slate-800/40 border border-slate-800 rounded-xl p-3 flex items-center justify-between gap-3"
                          >
                            <div className="flex items-center gap-2 min-w-0">
                              <div
                                className="h-7 w-7 rounded-full flex items-center justify-center font-bold text-xs shrink-0 shadow"
                                style={{
                                  backgroundColor: `${pt.personColor || '#8b5cf6'}30`,
                                  color: pt.personColor || '#a78bfa',
                                }}
                              >
                                {pt.personName.charAt(0).toUpperCase()}
                              </div>
                              <div className="min-w-0 truncate">
                                <p className="text-xs font-semibold text-white truncate">{pt.personName}</p>
                                <p className="text-[10px] text-slate-400">{pct}% do total</p>
                              </div>
                            </div>
                            <div className="font-bold text-slate-200 text-xs whitespace-nowrap">
                              {formatCurrency(pt.total)}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* Transactions List */}
                <div>
                  <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-400 mb-2.5 flex items-center gap-1.5">
                    <ShoppingBag className="h-3.5 w-3.5 text-teal-400" />
                    <span>Lançamentos da Fatura ({selectedInvoiceDetails?.transactions?.length || 0})</span>
                  </h3>

                  {selectedInvoiceDetails?.transactions?.length === 0 ? (
                    <p className="text-xs text-slate-500 py-4 text-center">Nenhum lançamento nesta fatura.</p>
                  ) : (
                    <div className="divide-y divide-slate-800/80 border border-slate-800 rounded-xl overflow-hidden max-h-64 overflow-y-auto">
                      {selectedInvoiceDetails?.transactions?.map((tx: any) => (
                        <div key={tx.id} className="p-3 bg-slate-800/30 flex items-center justify-between gap-3 text-xs">
                          <div className="min-w-0 space-y-0.5">
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className="font-medium text-white truncate">{tx.description}</span>
                              {tx.person && (
                                <span
                                  className="inline-flex items-center gap-1 text-[10px] px-1.5 py-0.5 rounded font-medium border shrink-0"
                                  style={{
                                    backgroundColor: `${tx.person.color || '#8b5cf6'}20`,
                                    color: tx.person.color || '#a78bfa',
                                    borderColor: `${tx.person.color || '#8b5cf6'}40`,
                                  }}
                                >
                                  <User className="h-2.5 w-2.5" />
                                  <span>{tx.person.name}</span>
                                </span>
                              )}
                              {tx.totalInstallments && tx.totalInstallments > 1 && (
                                <span className="text-[9px] bg-slate-800 text-slate-400 px-1 py-0.5 rounded border border-slate-700 shrink-0">
                                  {tx.installmentNumber}/{tx.totalInstallments}
                                </span>
                              )}
                            </div>
                            <p className="text-[11px] text-slate-400">
                              {formatDate(tx.transactionDate)} • {tx.category?.name || 'Geral'}
                            </p>
                          </div>

                          <div className="font-bold text-rose-400 whitespace-nowrap text-right">
                            - {formatCurrency(tx.amount)}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        </Modal>
      </div>
    </AppShell>
  );
}
