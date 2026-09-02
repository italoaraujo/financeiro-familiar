'use client';

import React, { useEffect, useState } from 'react';
import AppShell from '../../components/layout/AppShell';
import { useAuth } from '../../context/AuthContext';
import { apiRequest } from '../../lib/api';
import { formatCurrency } from '../../lib/formatters';
import {
  FileSpreadsheet,
  Download,
  Calendar,
  Filter,
  TrendingUp,
  TrendingDown,
  PieChart as PieIcon,
  BarChart2,
} from 'lucide-react';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  PieChart,
  Pie,
  Cell,
} from 'recharts';

export default function ReportsPage() {
  const { user, selectedFamilyId } = useAuth();
  const [loading, setLoading] = useState(true);
  const [downloading, setDownloading] = useState(false);

  // Filters
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [monthsCount, setMonthsCount] = useState(6);

  // Data
  const [cashFlow, setCashFlow] = useState<any[]>([]);
  const [categories, setCategories] = useState<any[]>([]);

  const loadReportData = async () => {
    setLoading(true);
    try {
      const params: any = {
        familyId: selectedFamilyId || undefined,
        months: monthsCount,
      };

      const [flow, cats] = await Promise.all([
        apiRequest('/reports/cash-flow', { params }),
        apiRequest('/reports/categories', { params: { familyId: selectedFamilyId || undefined } }),
      ]);

      setCashFlow(flow || []);
      setCategories(cats || []);
    } catch (err) {
      console.error('Error loading reports data:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (user) {
      loadReportData();
    }
  }, [user, selectedFamilyId, monthsCount]);

  const handleExportCsv = async () => {
    setDownloading(true);
    try {
      const params: any = {
        familyId: selectedFamilyId || undefined,
        startDate: startDate || undefined,
        endDate: endDate || undefined,
      };

      const blob = await apiRequest<Blob>('/reports/export/csv', { params });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `relatorio-financeiro-${new Date().toISOString().split('T')[0]}.csv`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (err: any) {
      alert(err.message || 'Erro ao exportar dados em CSV');
    } finally {
      setDownloading(false);
    }
  };

  const COLORS = ['#10b981', '#3b82f6', '#f59e0b', '#ec4899', '#8b5cf6', '#06b6d4', '#f97316', '#64748b'];

  return (
    <AppShell>
      <div className="space-y-8">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-white tracking-tight">Relatórios & Exportação de Dados</h1>
            <p className="text-sm text-slate-400">
              Análise aprofundada da evolução financeira e download de extrato em planilha CSV
            </p>
          </div>

          <button
            onClick={handleExportCsv}
            disabled={downloading}
            className="inline-flex items-center justify-center gap-2 bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-600 hover:to-teal-600 text-slate-950 font-semibold px-4 py-2.5 rounded-xl text-sm shadow-lg shadow-emerald-500/20 transition-all disabled:opacity-50"
          >
            <Download className="h-4 w-4" />
            <span>{downloading ? 'Gerando CSV...' : 'Exportar Extrato (CSV)'}</span>
          </button>
        </div>

        {/* Filters and Export Options Banner */}
        <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-6 shadow-xl space-y-4">
          <div className="flex items-center gap-2 text-sm font-bold text-white">
            <Filter className="h-4 w-4 text-emerald-400" />
            <span>Filtros do Relatório & Exportação</span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label className="block text-xs font-semibold uppercase text-slate-400 mb-1">Data Inicial</label>
              <input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-sm text-white"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold uppercase text-slate-400 mb-1">Data Final</label>
              <input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-sm text-white"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold uppercase text-slate-400 mb-1">Janela de Meses no Gráfico</label>
              <select
                value={monthsCount}
                onChange={(e) => setMonthsCount(Number(e.target.value))}
                className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-sm text-white"
              >
                <option value={3}>Últimos 3 meses</option>
                <option value={6}>Últimos 6 meses</option>
                <option value={12}>Últimos 12 meses</option>
              </select>
            </div>
          </div>
        </div>

        {/* Charts Section */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          {/* Cash Flow */}
          <div className="lg:col-span-7 bg-slate-900/80 border border-slate-800 rounded-2xl p-6 shadow-xl">
            <div className="flex items-center gap-2 mb-6">
              <BarChart2 className="h-5 w-5 text-emerald-400" />
              <h3 className="font-bold text-white text-base">Evolução Mensal (Receitas x Despesas)</h3>
            </div>

            <div className="h-80 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={cashFlow} margin={{ top: 10, right: 10, left: -15, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                  <XAxis dataKey="month" stroke="#64748b" fontSize={12} tickLine={false} />
                  <YAxis stroke="#64748b" fontSize={12} tickLine={false} />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: '#0f172a',
                      borderColor: '#334155',
                      borderRadius: '12px',
                      color: '#f8fafc',
                    }}
                    formatter={(val: any) => [formatCurrency(val), '']}
                  />
                  <Legend />
                  <Bar dataKey="income" name="Receitas" fill="#10b981" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="expense" name="Despesas" fill="#f43f5e" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Category Share */}
          <div className="lg:col-span-5 bg-slate-900/80 border border-slate-800 rounded-2xl p-6 shadow-xl flex flex-col justify-between">
            <div className="flex items-center gap-2 mb-4">
              <PieIcon className="h-5 w-5 text-purple-400" />
              <h3 className="font-bold text-white text-base">Distribuição por Categoria</h3>
            </div>

            {categories.length === 0 ? (
              <div className="h-64 flex items-center justify-center text-slate-500 text-sm">
                Nenhum dado no período
              </div>
            ) : (
              <>
                <div className="h-56 w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={categories}
                        cx="50%"
                        cy="50%"
                        innerRadius={50}
                        outerRadius={80}
                        paddingAngle={4}
                        dataKey="percentage"
                        nameKey="name"
                      >
                        {categories.map((entry, index) => (
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

                <div className="mt-4 space-y-2 max-h-48 overflow-y-auto pr-1">
                  {categories.map((cat, idx) => (
                    <div key={idx} className="flex items-center justify-between text-xs py-1">
                      <div className="flex items-center gap-2">
                        <span
                          className="h-2.5 w-2.5 rounded-full"
                          style={{ backgroundColor: cat.color || COLORS[idx % COLORS.length] }}
                        ></span>
                        <span className="text-slate-300 font-medium">{cat.name}</span>
                      </div>
                      <span className="text-slate-400 font-bold">{formatCurrency(cat.amount)} ({cat.percentage}%)</span>
                    </div>
                  ))}
                </div>
              </>
            )}
          </div>
        </div>
      </div>
    </AppShell>
  );
}
