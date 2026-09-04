'use client';

import React, { useEffect, useState } from 'react';
import AppShell from '../components/layout/AppShell';
import { useAuth } from '../context/AuthContext';
import { apiRequest } from '../lib/api';
import { formatCurrency, formatDate } from '../lib/formatters';
import {
  Wallet,
  TrendingUp,
  TrendingDown,
  Scale,
  CreditCard,
  ArrowUpRight,
  ArrowDownRight,
  ArrowLeftRight,
  AlertCircle,
  Plus,
  PiggyBank,
  Target,
} from 'lucide-react';
import {
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Tooltip,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Legend,
} from 'recharts';
import Link from 'next/link';

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

export default function DashboardPage() {
  const { user, selectedFamilyId } = useAuth();
  const [loading, setLoading] = useState(true);
  const [summary, setSummary] = useState<any>(null);
  const [categoryExpenses, setCategoryExpenses] = useState<any[]>([]);
  const [cashFlow, setCashFlow] = useState<any[]>([]);

  const now = new Date();
  const currentMonthStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  const [selectedMonth, setSelectedMonth] = useState(currentMonthStr);

  const loadDashboardData = async () => {
    setLoading(true);
    try {
      const params: any = { periodMonth: selectedMonth };
      if (selectedFamilyId) params.familyId = selectedFamilyId;

      const [dashData, catData, flowData] = await Promise.all([
        apiRequest('/reports/dashboard', { params }),
        apiRequest('/reports/categories', { params }),
        apiRequest('/reports/cash-flow', { params: { familyId: selectedFamilyId || undefined, months: 6 } }),
      ]);

      setSummary(dashData);
      setCategoryExpenses(catData);
      setCashFlow(flowData);
    } catch (err) {
      console.error('Error loading dashboard data:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (user) {
      loadDashboardData();
    }
  }, [user, selectedFamilyId, selectedMonth]);

  const COLORS = ['#10b981', '#3b82f6', '#f59e0b', '#ec4899', '#8b5cf6', '#06b6d4', '#f97316', '#64748b'];

  return (
    <AppShell>
      <div className="space-y-6 sm:space-y-8">
        {/* Page Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-xl sm:text-2xl font-bold text-white tracking-tight">Dashboard Financeiro</h1>
            <p className="text-xs sm:text-sm text-slate-400">
              Visão geral consolidada das suas finanças e fluxo de caixa
            </p>
          </div>

          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5 sm:gap-3">
            <div className="relative w-full sm:w-auto">
              <input
                type="month"
                value={selectedMonth}
                onChange={(e) => setSelectedMonth(e.target.value)}
                className="w-full sm:w-auto bg-slate-900 border border-slate-700/80 rounded-xl px-3.5 py-2 text-xs sm:text-sm text-white focus:outline-none focus:ring-2 focus:ring-emerald-500 font-medium cursor-pointer"
              />
            </div>
            <Link
              href="/transactions"
              className="inline-flex items-center justify-center gap-2 bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-600 hover:to-teal-600 text-slate-950 font-semibold px-4 py-2 rounded-xl text-xs sm:text-sm shadow-lg shadow-emerald-500/20 transition-all"
            >
              <Plus className="h-4 w-4 shrink-0" />
              <span>Novo Lançamento</span>
            </Link>
          </div>
        </div>

        {/* KPI Cards Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3.5 sm:gap-4">
          {/* Total Balance */}
          <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-4 sm:p-5 relative overflow-hidden group hover:border-slate-700 transition-all">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">Saldo Geral</span>
              <div className="h-8 w-8 sm:h-9 sm:w-9 rounded-xl bg-blue-500/10 text-blue-400 flex items-center justify-center shrink-0">
                <Wallet className="h-4 w-4 sm:h-4.5 sm:w-4.5" />
              </div>
            </div>
            <div className="mt-3">
              <h3 className="text-lg sm:text-xl font-bold text-white truncate">
                {summary ? formatCurrency(summary.totalBalance) : '...'}
              </h3>
              <p className="text-[11px] text-slate-400 mt-1">Disponível em contas</p>
            </div>
          </div>

          {/* Goals / Reserves Balance */}
          <Link
            href="/goals"
            className="bg-slate-900/80 border border-slate-800 rounded-2xl p-4 sm:p-5 relative overflow-hidden group hover:border-amber-500/40 hover:bg-slate-900 transition-all block cursor-pointer"
          >
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold uppercase tracking-wider text-slate-400 group-hover:text-amber-300 transition-colors">Guardado em Metas</span>
              <div className="h-8 w-8 sm:h-9 sm:w-9 rounded-xl bg-amber-500/10 text-amber-400 flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform">
                <PiggyBank className="h-4 w-4 sm:h-4.5 sm:w-4.5" />
              </div>
            </div>
            <div className="mt-3">
              <h3 className="text-lg sm:text-xl font-bold text-amber-400 truncate">
                {summary ? formatCurrency(summary.goalsBalance ?? 0) : '...'}
              </h3>
              <div className="flex items-center gap-1 text-[11px] text-amber-500/80 mt-1">
                <Target className="h-3 w-3 shrink-0" />
                <span>Cofrinhos e reservas</span>
              </div>
            </div>
          </Link>

          {/* Monthly Income */}
          <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-4 sm:p-5 relative overflow-hidden group hover:border-slate-700 transition-all">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">Receitas do Mês</span>
              <div className="h-8 w-8 sm:h-9 sm:w-9 rounded-xl bg-emerald-500/10 text-emerald-400 flex items-center justify-center shrink-0">
                <TrendingUp className="h-4 w-4 sm:h-4.5 sm:w-4.5" />
              </div>
            </div>
            <div className="mt-3">
              <h3 className="text-lg sm:text-xl font-bold text-emerald-400 truncate">
                {summary ? formatCurrency(summary.monthlyIncome) : '...'}
              </h3>
              <div className="flex items-center gap-1 text-[11px] text-emerald-500/80 mt-1">
                <ArrowUpRight className="h-3.5 w-3.5 shrink-0" />
                <span>Entradas efetivadas</span>
              </div>
            </div>
          </div>

          {/* Monthly Expense */}
          <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-4 sm:p-5 relative overflow-hidden group hover:border-slate-700 transition-all">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">Despesas do Mês</span>
              <div className="h-8 w-8 sm:h-9 sm:w-9 rounded-xl bg-rose-500/10 text-rose-400 flex items-center justify-center shrink-0">
                <TrendingDown className="h-4 w-4 sm:h-4.5 sm:w-4.5" />
              </div>
            </div>
            <div className="mt-3">
              <h3 className="text-lg sm:text-xl font-bold text-rose-400 truncate">
                {summary ? formatCurrency(summary.monthlyExpense) : '...'}
              </h3>
              <div className="flex items-center gap-1 text-[11px] text-rose-500/80 mt-1">
                <ArrowDownRight className="h-3.5 w-3.5 shrink-0" />
                <span>Saídas e faturas</span>
              </div>
            </div>
          </div>

          {/* Net Balance */}
          <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-4 sm:p-5 relative overflow-hidden group hover:border-slate-700 transition-all">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">Balanço Líquido</span>
              <div className="h-8 w-8 sm:h-9 sm:w-9 rounded-xl bg-purple-500/10 text-purple-400 flex items-center justify-center shrink-0">
                <Scale className="h-4 w-4 sm:h-4.5 sm:w-4.5" />
              </div>
            </div>
            <div className="mt-3">
              <h3
                className={`text-lg sm:text-xl font-bold truncate ${
                  summary && Number(summary.netBalance) >= 0 ? 'text-emerald-400' : 'text-rose-400'
                }`}
              >
                {summary ? formatCurrency(summary.netBalance) : '...'}
              </h3>
              <p className="text-[11px] text-slate-400 mt-1">Receitas vs. Despesas</p>
            </div>
          </div>
        </div>

        {/* Charts Section */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 sm:gap-8">
          {/* Monthly Cash Flow Bar Chart */}
          <div className="lg:col-span-7 bg-slate-900/80 border border-slate-800 rounded-2xl p-4 sm:p-6">
            <div className="flex items-center justify-between mb-4 sm:mb-6">
              <div>
                <h3 className="text-sm sm:text-base font-bold text-white">Evolução do Fluxo de Caixa</h3>
                <p className="text-xs text-slate-400">Comparativo dos últimos 6 meses</p>
              </div>
            </div>

            <div className="h-60 sm:h-72 w-full min-w-0">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={cashFlow} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                  <XAxis dataKey="month" stroke="#64748b" fontSize={11} tickLine={false} />
                  <YAxis stroke="#64748b" fontSize={11} tickLine={false} />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: '#0f172a',
                      borderColor: '#334155',
                      borderRadius: '12px',
                      color: '#f8fafc',
                    }}
                    formatter={(val: any) => [formatCurrency(val), '']}
                  />
                  <Legend wrapperStyle={{ fontSize: '12px' }} />
                  <Bar dataKey="income" name="Receitas" fill="#10b981" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="expense" name="Despesas" fill="#f43f5e" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Expenses by Category Pie Chart */}
          <div className="lg:col-span-5 bg-slate-900/80 border border-slate-800 rounded-2xl p-4 sm:p-6 flex flex-col justify-between">
            <div className="flex items-center justify-between mb-3 sm:mb-4">
              <div>
                <h3 className="text-sm sm:text-base font-bold text-white">Despesas por Categoria</h3>
                <p className="text-xs text-slate-400">Distribuição no mês selecionado</p>
              </div>
            </div>

            {categoryExpenses.length === 0 ? (
              <div className="h-48 sm:h-64 flex flex-col items-center justify-center text-slate-500 text-xs sm:text-sm">
                <AlertCircle className="h-8 w-8 mb-2 opacity-50" />
                <p>Nenhuma despesa registrada no mês</p>
              </div>
            ) : (
              <>
                <div className="h-48 sm:h-52 w-full min-w-0">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={categoryExpenses}
                        cx="50%"
                        cy="50%"
                        innerRadius={45}
                        outerRadius={70}
                        paddingAngle={4}
                        dataKey="percentage"
                        nameKey="name"
                      >
                        {categoryExpenses.map((entry, index) => (
                          <Cell
                            key={`cell-${index}`}
                            fill={entry.color || COLORS[index % COLORS.length]}
                          />
                        ))}
                      </Pie>
                      <Tooltip
                        contentStyle={{
                          backgroundColor: '#0f172a',
                          borderColor: '#334155',
                          borderRadius: '12px',
                          color: '#f8fafc',
                        }}
                        formatter={(val: any, name: any, item: any) => [
                          `${val}% (${formatCurrency(item.payload.amount)})`,
                          name,
                        ]}
                      />
                    </PieChart>
                  </ResponsiveContainer>
                </div>

                <div className="mt-3 sm:mt-4 space-y-2 max-h-40 overflow-y-auto pr-1">
                  {categoryExpenses.map((cat, idx) => (
                    <div key={idx} className="flex items-center justify-between text-xs gap-2">
                      <div className="flex items-center gap-2 min-w-0">
                        <span
                          className="h-2.5 w-2.5 rounded-full shrink-0"
                          style={{ backgroundColor: cat.color || COLORS[idx % COLORS.length] }}
                        ></span>
                        <span className="text-slate-300 font-medium truncate">{cat.name}</span>
                      </div>
                      <span className="text-slate-400 font-semibold shrink-0">
                        {formatCurrency(cat.amount)} ({cat.percentage}%)
                      </span>
                    </div>
                  ))}
                </div>
              </>
            )}
          </div>
        </div>

        {/* Bottom Lists Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 sm:gap-8">
          {/* Recent Transactions */}
          <div className="lg:col-span-7 bg-slate-900/80 border border-slate-800 rounded-2xl p-4 sm:p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm sm:text-base font-bold text-white">Últimos Lançamentos</h3>
              <Link href="/transactions" className="text-xs text-emerald-400 hover:underline font-semibold">
                Ver todos
              </Link>
            </div>

            {summary?.recentTransactions?.length === 0 ? (
              <p className="text-xs sm:text-sm text-slate-500 py-6 text-center">Nenhuma transação recente encontrada.</p>
            ) : (
              <div className="divide-y divide-slate-800/80">
                {summary?.recentTransactions?.map((tx: any) => (
                  <div key={tx.id} className="py-3 flex items-center justify-between gap-3">
                    <div className="flex items-center gap-3 min-w-0">
                      <div
                        className={`h-8 w-8 sm:h-9 sm:w-9 rounded-xl flex items-center justify-center shrink-0 ${
                          tx.type === 'INCOME'
                            ? 'bg-emerald-500/10 text-emerald-400'
                            : tx.type === 'EXPENSE'
                            ? 'bg-rose-500/10 text-rose-400'
                            : 'bg-blue-500/10 text-blue-400'
                        }`}
                      >
                        {tx.type === 'INCOME' ? (
                          <ArrowUpRight className="h-4 w-4" />
                        ) : tx.type === 'EXPENSE' ? (
                          <ArrowDownRight className="h-4 w-4" />
                        ) : (
                          <ArrowLeftRight className="h-4 w-4" />
                        )}
                      </div>
                      <div className="min-w-0">
                        <p className="text-xs sm:text-sm font-semibold text-white truncate">{tx.description}</p>
                        <p className="text-[11px] sm:text-xs text-slate-400 truncate">
                          {tx.category?.name || 'Geral'} • {formatDate(tx.transactionDate)}
                        </p>
                      </div>
                    </div>
                    <span
                      className={`text-xs sm:text-sm font-bold shrink-0 ${
                        tx.type === 'INCOME'
                          ? 'text-emerald-400'
                          : tx.type === 'TRANSFER'
                          ? 'text-blue-400'
                          : 'text-rose-400'
                      }`}
                    >
                      {tx.type === 'INCOME' ? '+' : tx.type === 'TRANSFER' ? '' : '-'} {formatCurrency(tx.amount)}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Upcoming Credit Invoices */}
          <div className="lg:col-span-5 bg-slate-900/80 border border-slate-800 rounded-2xl p-4 sm:p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm sm:text-base font-bold text-white">Faturas em Aberto</h3>
              <Link href="/cards" className="text-xs text-emerald-400 hover:underline font-semibold">
                Gerenciar cartões
              </Link>
            </div>

            {summary?.openInvoices?.length === 0 ? (
              <p className="text-xs sm:text-sm text-slate-500 py-6 text-center">Nenhuma fatura em aberto no momento.</p>
            ) : (
              <div className="space-y-3">
                {summary?.openInvoices?.map((inv: any) => (
                  <div
                    key={inv.id}
                    className="p-3.5 sm:p-4 bg-slate-800/50 border border-slate-700/60 rounded-xl flex items-center justify-between gap-2"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <CreditCard className="h-5 w-5 sm:h-6 sm:w-6 text-purple-400 shrink-0" />
                      <div className="min-w-0">
                        <p className="text-xs sm:text-sm font-semibold text-white truncate">{inv.creditCard?.name}</p>
                        <p className="text-[11px] sm:text-xs text-slate-400 truncate">
                          Vencimento: {formatDate(inv.dueDate)}
                        </p>
                      </div>
                    </div>
                    <div className="text-right shrink-0">
                      <p className="text-xs sm:text-sm font-bold text-white">{formatCurrency(inv.totalAmount)}</p>
                      <div className="mt-0.5">
                        <span
                          className={`text-[9px] sm:text-[10px] uppercase tracking-wider font-semibold px-2 py-0.5 rounded ${
                            (INVOICE_STATUS_MAP[inv.status] || { className: 'bg-slate-700/50 text-slate-300 border border-slate-600' }).className
                          }`}
                        >
                          {(INVOICE_STATUS_MAP[inv.status] || { label: inv.status }).label}
                        </span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </AppShell>
  );
}
