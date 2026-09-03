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
} from 'lucide-react';

export default function CreditCardsPage() {
  const { user, selectedFamilyId } = useAuth();
  const [loading, setLoading] = useState(true);
  const [cards, setCards] = useState<any[]>([]);
  const [accounts, setAccounts] = useState<any[]>([]);

  // Modals
  const [isCardModalOpen, setIsCardModalOpen] = useState(false);
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

  // Pay Invoice Form
  const [paymentAccountId, setPaymentAccountId] = useState('');
  const [paymentAmount, setPaymentAmount] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const loadData = async () => {
    setLoading(true);
    try {
      const params: any = selectedFamilyId ? { familyId: selectedFamilyId } : {};
      const [cardsData, accsData] = await Promise.all([
        apiRequest('/credit-cards', { params }),
        apiRequest('/accounts', { params }),
      ]);
      setCards(cardsData || []);
      setAccounts(accsData || []);
      if (accsData && accsData.length > 0) setPaymentAccountId(accsData[0].id);
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

          <button
            onClick={() => setIsCardModalOpen(true)}
            className="inline-flex items-center justify-center gap-2 bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-600 hover:to-teal-600 text-slate-950 font-semibold px-4 py-2.5 rounded-xl text-xs sm:text-sm shadow-lg shadow-emerald-500/20 transition-all w-full sm:w-auto"
          >
            <Plus className="h-4 w-4 shrink-0" />
            <span>Novo Cartão</span>
          </button>
        </div>

        {/* Cards Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-5 sm:gap-8">
          {loading ? (
            <div className="col-span-full py-12 text-center text-slate-500 text-xs sm:text-sm">Carregando cartões...</div>
          ) : cards.length === 0 ? (
            <div className="col-span-full py-12 text-center text-slate-500 bg-slate-900/40 border border-slate-800/80 rounded-2xl text-xs sm:text-sm">
              Nenhum cartão de crédito cadastrado.
            </div>
          ) : (
            cards.map((card) => {
              const limit = Number(card.creditLimit || 0);
              const committed = Number(card.committedAmount || 0);
              const available = Number(card.availableLimit || 0);
              const pct = limit > 0 ? Math.min(100, Math.round((committed / limit) * 100)) : 0;

              return (
                <div
                  key={card.id}
                  className="bg-slate-900/80 border border-slate-800 rounded-2xl p-4 sm:p-6 relative flex flex-col justify-between shadow-xl"
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
                          <h3 className="font-bold text-white text-base sm:text-lg leading-tight truncate">{card.name}</h3>
                          <span className="text-xs text-slate-400">{card.brand || 'Cartão'}</span>
                        </div>
                      </div>

                      <div className="text-left sm:text-right text-xs text-slate-400 space-y-0.5 border-t sm:border-t-0 pt-2 sm:pt-0 border-slate-800">
                        <p>Fechamento: dia <strong className="text-white">{card.closingDay}</strong></p>
                        <p>Vencimento: dia <strong className="text-white">{card.dueDay}</strong></p>
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
                                    <span
                                      className={`text-[9px] uppercase font-bold px-1.5 py-0.5 rounded ${
                                        inv.status === 'PAID'
                                          ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                                          : 'bg-amber-500/10 text-amber-400 border border-amber-500/20'
                                      }`}
                                    >
                                      {inv.status}
                                    </span>
                                  </div>

                                  <button
                                    onClick={() => openInvoiceDetails(inv.id)}
                                    className="bg-slate-700 hover:bg-slate-600 text-slate-200 font-semibold px-2.5 py-1.5 rounded-lg text-xs transition-colors shrink-0 flex items-center gap-1.5"
                                    title="Ver divisão de gastos por pessoa"
                                  >
                                    <Users className="h-3.5 w-3.5 text-purple-400" />
                                    <span>Divisão por Pessoa</span>
                                  </button>

                                  {inv.status !== 'PAID' && Number(inv.totalAmount) > 0 && (
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
        {isCardModalOpen && (
          <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-3 sm:p-4 overflow-y-auto">
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
          </div>
        )}

        {/* Pay Invoice Modal */}
        {isPayModalOpen && (
          <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-3 sm:p-4 overflow-y-auto">
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
                        {acc.name} ({formatCurrency(acc.currentBalance)})
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
          </div>
        )}

        {/* Invoice Details & Person Breakdown Modal */}
        {isDetailsModalOpen && (
          <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-3 sm:p-4 overflow-y-auto">
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
                  <span
                    className={`text-[10px] uppercase font-bold px-2 py-0.5 rounded ${
                      selectedInvoiceDetails?.status === 'PAID'
                        ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                        : 'bg-amber-500/10 text-amber-400 border border-amber-500/20'
                    }`}
                  >
                    {selectedInvoiceDetails?.status}
                  </span>
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
                      <p className="text-xs text-slate-400">Total Consolidado da Fatura</p>
                      <p className="text-xl sm:text-2xl font-bold text-white">
                        {formatCurrency(selectedInvoiceDetails?.totalAmount || 0)}
                      </p>
                    </div>
                    {Number(selectedInvoiceDetails?.paidAmount) > 0 && (
                      <div className="text-left sm:text-right">
                        <p className="text-xs text-slate-400">Valor Pago</p>
                        <p className="text-sm font-semibold text-emerald-400">
                          {formatCurrency(selectedInvoiceDetails.paidAmount)}
                        </p>
                      </div>
                    )}
                  </div>

                  {/* Person Breakdown Section */}
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <h3 className="text-xs font-bold uppercase tracking-wider text-slate-300 flex items-center gap-1.5">
                        <Users className="h-4 w-4 text-purple-400" />
                        <span>Divisão de Gastos por Pessoa</span>
                      </h3>
                      <span className="text-xs text-slate-400">
                        {selectedInvoiceDetails?.personBreakdown?.length || 0} pessoas com gastos
                      </span>
                    </div>

                    {/* Breakdown Progress Stack Bar */}
                    {selectedInvoiceDetails?.personBreakdown?.length > 0 && Number(selectedInvoiceDetails.totalAmount) > 0 && (
                      <div className="w-full bg-slate-800 h-3 rounded-full overflow-hidden flex">
                        {selectedInvoiceDetails.personBreakdown.map((item: any, idx: number) => {
                          const itemPct = Math.max(
                            2,
                            Math.round((item.totalAmount / Number(selectedInvoiceDetails.totalAmount)) * 100),
                          );
                          return (
                            <div
                              key={idx}
                              style={{ width: `${itemPct}%`, backgroundColor: item.color || '#8b5cf6' }}
                              className="h-full transition-all"
                              title={`${item.name}: ${formatCurrency(item.totalAmount)} (${itemPct}%)`}
                            />
                          );
                        })}
                      </div>
                    )}

                    {/* Breakdown Cards */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 sm:gap-3">
                      {selectedInvoiceDetails?.personBreakdown?.map((item: any, idx: number) => {
                        const totalInv = Number(selectedInvoiceDetails?.totalAmount) || 1;
                        const pct = Math.round((item.totalAmount / totalInv) * 100);
                        return (
                          <div
                            key={idx}
                            className="bg-slate-800/40 border border-slate-700/60 rounded-xl p-3 flex items-center justify-between gap-3"
                          >
                            <div className="flex items-center gap-2.5 min-w-0">
                              <div
                                className="h-8 w-8 rounded-lg flex items-center justify-center text-white font-bold text-xs shrink-0"
                                style={{ backgroundColor: item.color || '#8b5cf6' }}
                              >
                                {item.name ? item.name.charAt(0).toUpperCase() : 'P'}
                              </div>
                              <div className="min-w-0">
                                <p className="font-semibold text-white text-xs sm:text-sm truncate">{item.name}</p>
                                <p className="text-[11px] text-slate-400">{item.count} compra(s)</p>
                              </div>
                            </div>

                            <div className="text-right shrink-0">
                              <p className="font-bold text-white text-xs sm:text-sm">
                                {formatCurrency(item.totalAmount)}
                              </p>
                              <p className="text-[10px] text-slate-400 font-medium">{pct}% da fatura</p>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  {/* Invoice Transactions List */}
                  <div className="space-y-3 pt-2">
                    <h3 className="text-xs font-bold uppercase tracking-wider text-slate-300 flex items-center gap-1.5">
                      <ShoppingBag className="h-4 w-4 text-slate-400" />
                      <span>Compras Desta Fatura ({selectedInvoiceDetails?.transactions?.length || 0})</span>
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
          </div>
        )}
      </div>
    </AppShell>
  );
}
