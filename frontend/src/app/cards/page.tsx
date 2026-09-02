'use client';

import React, { useEffect, useState } from 'react';
import AppShell from '../../components/layout/AppShell';
import { useAuth } from '../../context/AuthContext';
import { apiRequest } from '../../lib/api';
import { formatCurrency, formatDate } from '../../lib/formatters';
import {
  Plus,
  CreditCard as CardIcon,
  CheckCircle2,
  Calendar,
  AlertCircle,
  X,
  ArrowRight,
  Receipt,
  Wallet,
} from 'lucide-react';

export default function CreditCardsPage() {
  const { user, selectedFamilyId } = useAuth();
  const [loading, setLoading] = useState(true);
  const [cards, setCards] = useState<any[]>([]);
  const [accounts, setAccounts] = useState<any[]>([]);

  // Modals
  const [isCardModalOpen, setIsCardModalOpen] = useState(false);
  const [isPayModalOpen, setIsPayModalOpen] = useState(false);
  const [selectedInvoice, setSelectedInvoice] = useState<any>(null);

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
      if (accsData.length > 0) setPaymentAccountId(accsData[0].id);
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

  return (
    <AppShell>
      <div className="space-y-8">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-white tracking-tight">Cartões de Crédito & Faturas</h1>
            <p className="text-sm text-slate-400">
              Acompanhe limites, ciclos de fechamento e liquidação de faturas
            </p>
          </div>

          <button
            onClick={() => setIsCardModalOpen(true)}
            className="inline-flex items-center justify-center gap-2 bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-600 hover:to-teal-600 text-slate-950 font-semibold px-4 py-2.5 rounded-xl text-sm shadow-lg shadow-emerald-500/20 transition-all"
          >
            <Plus className="h-4 w-4" />
            <span>Novo Cartão</span>
          </button>
        </div>

        {/* Cards Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {loading ? (
            <div className="col-span-full py-12 text-center text-slate-500">Carregando cartões...</div>
          ) : cards.length === 0 ? (
            <div className="col-span-full py-12 text-center text-slate-500 bg-slate-900/40 border border-slate-800/80 rounded-2xl">
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
                  className="bg-slate-900/80 border border-slate-800 rounded-2xl p-6 relative flex flex-col justify-between shadow-xl"
                >
                  {/* Card Visual Header */}
                  <div>
                    <div className="flex items-start justify-between">
                      <div className="flex items-center gap-3">
                        <div
                          className="h-10 w-10 rounded-xl flex items-center justify-center shadow"
                          style={{ backgroundColor: `${card.color || '#8b5cf6'}25`, color: card.color || '#8b5cf6' }}
                        >
                          <CardIcon className="h-5 w-5" />
                        </div>
                        <div>
                          <h3 className="font-bold text-white text-lg leading-tight">{card.name}</h3>
                          <span className="text-xs text-slate-400">{card.brand || 'Cartão'}</span>
                        </div>
                      </div>

                      <div className="text-right text-xs text-slate-400 space-y-0.5">
                        <p>Fechamento: dia <strong className="text-white">{card.closingDay}</strong></p>
                        <p>Vencimento: dia <strong className="text-white">{card.dueDay}</strong></p>
                      </div>
                    </div>

                    {/* Limit Progress Bar */}
                    <div className="mt-6 pt-4 border-t border-slate-800/80 space-y-2">
                      <div className="flex justify-between items-center text-xs">
                        <span className="text-slate-400">Limite Comprometido: <strong className="text-rose-400">{formatCurrency(committed)}</strong></span>
                        <span className="text-slate-400 font-semibold">{pct}%</span>
                      </div>

                      <div className="w-full bg-slate-800 h-2.5 rounded-full overflow-hidden">
                        <div
                          className={`h-full rounded-full transition-all duration-500 ${
                            pct >= 90 ? 'bg-rose-500' : pct >= 70 ? 'bg-amber-500' : 'bg-purple-500'
                          }`}
                          style={{ width: `${pct}%` }}
                        ></div>
                      </div>

                      <div className="flex justify-between text-xs pt-1">
                        <span className="text-slate-400">Total: {formatCurrency(limit)}</span>
                        <span className="text-emerald-400 font-bold">Disponível: {formatCurrency(available)}</span>
                      </div>
                    </div>

                    {/* Invoices List */}
                    <div className="mt-6 space-y-2.5">
                      <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400">Faturas Recentes</h4>
                      {card.invoices?.length === 0 ? (
                        <p className="text-xs text-slate-500">Nenhuma fatura registrada.</p>
                      ) : (
                        card.invoices?.map((inv: any) => (
                          <div
                            key={inv.id}
                            className="bg-slate-800/40 border border-slate-700/50 rounded-xl p-3 flex items-center justify-between text-xs"
                          >
                            <div className="flex items-center gap-2">
                              <Calendar className="h-4 w-4 text-slate-400" />
                              <div>
                                <p className="font-semibold text-white">Mês: {inv.referenceMonth}</p>
                                <p className="text-slate-400 text-[11px]">Vencimento: {formatDate(inv.dueDate)}</p>
                              </div>
                            </div>

                            <div className="flex items-center gap-3">
                              <div className="text-right">
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

                              {inv.status !== 'PAID' && Number(inv.totalAmount) > 0 && (
                                <button
                                  onClick={() => openPayModal(inv)}
                                  className="bg-purple-600 hover:bg-purple-500 text-white font-semibold px-2.5 py-1.5 rounded-lg text-xs transition-colors"
                                >
                                  Pagar
                                </button>
                              )}
                            </div>
                          </div>
                        ))
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
          <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
            <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-md p-6 shadow-2xl relative">
              <button
                onClick={() => setIsCardModalOpen(false)}
                className="absolute right-4 top-4 text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800"
              >
                <X className="h-5 w-5" />
              </button>

              <h2 className="text-xl font-bold text-white mb-4">Novo Cartão de Crédito</h2>

              <form onSubmit={handleCreateCard} className="space-y-4">
                <div>
                  <label className="block text-xs font-semibold uppercase text-slate-400 mb-1">Nome do Cartão *</label>
                  <input
                    type="text"
                    required
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="Ex: Nubank Ultravioleta, C6 Black..."
                    className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-semibold uppercase text-slate-400 mb-1">Bandeira</label>
                    <input
                      type="text"
                      value={brand}
                      onChange={(e) => setBrand(e.target.value)}
                      placeholder="Mastercard, Visa..."
                      className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-sm text-white"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold uppercase text-slate-400 mb-1">Limite Total (R$) *</label>
                    <input
                      type="number"
                      step="0.01"
                      required
                      min="0.01"
                      value={creditLimit}
                      onChange={(e) => setCreditLimit(e.target.value)}
                      placeholder="5000,00"
                      className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-semibold uppercase text-slate-400 mb-1">Dia de Fechamento *</label>
                    <input
                      type="number"
                      min="1"
                      max="31"
                      required
                      value={closingDay}
                      onChange={(e) => setClosingDay(parseInt(e.target.value) || 1)}
                      className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-sm text-white"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold uppercase text-slate-400 mb-1">Dia de Vencimento *</label>
                    <input
                      type="number"
                      min="1"
                      max="31"
                      required
                      value={dueDay}
                      onChange={(e) => setDueDay(parseInt(e.target.value) || 1)}
                      className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-sm text-white"
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
                  {submitting ? 'Cadastrando cartão...' : 'Cadastrar Cartão'}
                </button>
              </form>
            </div>
          </div>
        )}

        {/* Pay Invoice Modal */}
        {isPayModalOpen && selectedInvoice && (
          <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
            <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-md p-6 shadow-2xl relative">
              <button
                onClick={() => setIsPayModalOpen(false)}
                className="absolute right-4 top-4 text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800"
              >
                <X className="h-5 w-5" />
              </button>

              <h2 className="text-xl font-bold text-white mb-2">Liquidação de Fatura</h2>
              <p className="text-xs text-slate-400 mb-4">
                Mês de referência: <strong>{selectedInvoice.referenceMonth}</strong> • Total da Fatura:{' '}
                <strong className="text-emerald-400">{formatCurrency(selectedInvoice.totalAmount)}</strong>
              </p>

              <form onSubmit={handlePayInvoice} className="space-y-4">
                <div>
                  <label className="block text-xs font-semibold uppercase text-slate-400 mb-1">
                    Debitar da Conta Bancária *
                  </label>
                  <select
                    value={paymentAccountId}
                    onChange={(e) => setPaymentAccountId(e.target.value)}
                    required
                    className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2.5 text-sm text-white focus:outline-none focus:ring-2 focus:ring-purple-500"
                  >
                    {accounts.map((acc) => (
                      <option key={acc.id} value={acc.id}>
                        {acc.name} (Saldo: {formatCurrency(acc.currentBalance)})
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold uppercase text-slate-400 mb-1">
                    Valor a Pagar (R$) *
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    required
                    min="0.01"
                    value={paymentAmount}
                    onChange={(e) => setPaymentAmount(e.target.value)}
                    className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-2.5 text-sm text-white font-bold"
                  />
                </div>

                <button
                  type="submit"
                  disabled={submitting}
                  className="w-full mt-4 bg-gradient-to-r from-purple-500 to-indigo-500 hover:from-purple-600 hover:to-indigo-600 text-white font-bold py-3 px-4 rounded-xl shadow-lg shadow-purple-500/20 transition-all disabled:opacity-50"
                >
                  {submitting ? 'Processando pagamento...' : 'Confirmar Pagamento da Fatura'}
                </button>
              </form>
            </div>
          </div>
        )}
      </div>
    </AppShell>
  );
}
