'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useAuth } from '../../context/AuthContext';
import {
  LayoutDashboard,
  ArrowLeftRight,
  Wallet,
  CreditCard,
  PieChart,
  Target,
  Users,
  FileSpreadsheet,
  LogOut,
  ChevronDown,
  Building,
  Menu,
  X,
} from 'lucide-react';

interface AppShellProps {
  children: React.ReactNode;
}

export default function AppShell({ children }: AppShellProps) {
  const { user, selectedFamilyId, setSelectedFamilyId, logout, isLoading } = useAuth();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const pathname = usePathname();
  const router = useRouter();

  useEffect(() => {
    if (!isLoading && !user) {
      router.push('/login');
    }
  }, [user, isLoading, router]);

  // Close mobile drawer whenever route changes
  useEffect(() => {
    setMobileMenuOpen(false);
  }, [pathname]);

  if (isLoading || !user) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-950 text-emerald-400">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-emerald-500"></div>
      </div>
    );
  }

  const navItems = [
    { name: 'Dashboard', href: '/', icon: LayoutDashboard },
    { name: 'Extrato & Lançamentos', href: '/transactions', icon: ArrowLeftRight },
    { name: 'Contas & Carteiras', href: '/accounts', icon: Wallet },
    { name: 'Cartões de Crédito', href: '/cards', icon: CreditCard },
    { name: 'Orçamentos', href: '/budgets', icon: PieChart },
    { name: 'Metas Financeiras', href: '/goals', icon: Target },
    { name: 'Grupo Familiar', href: '/family', icon: Users },
    { name: 'Relatórios & Exportação', href: '/reports', icon: FileSpreadsheet },
  ];

  const currentFamilyName = user.memberships?.find(
    (m) => m.family.id === selectedFamilyId
  )?.family.name;

  const NavContent = () => (
    <>
      <div className="p-5 sm:p-6 border-b border-slate-800/80 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-xl bg-gradient-to-tr from-emerald-500 to-teal-400 flex items-center justify-center shadow-lg shadow-emerald-500/20 shrink-0">
            <Building className="h-5 w-5 text-slate-950 font-bold" />
          </div>
          <div className="min-w-0">
            <h1 className="font-bold text-lg text-white leading-tight truncate">Finanças</h1>
            <span className="text-xs text-emerald-400 font-medium truncate block">Pessoal & Familiar</span>
          </div>
        </div>
        <button
          onClick={() => setMobileMenuOpen(false)}
          className="lg:hidden p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition-colors"
          aria-label="Fechar menu"
        >
          <X className="h-5 w-5" />
        </button>
      </div>

      {/* Navigation Links */}
      <nav className="flex-1 p-3 sm:p-4 space-y-1.5 overflow-y-auto">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = pathname === item.href;
          return (
            <Link
              key={item.href}
              href={item.href}
              onClick={() => setMobileMenuOpen(false)}
              className={`flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-sm font-medium transition-all duration-200 ${
                isActive
                  ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 shadow-sm'
                  : 'text-slate-400 hover:text-slate-100 hover:bg-slate-800/50'
              }`}
            >
              <Icon className={`h-4 w-4 shrink-0 ${isActive ? 'text-emerald-400' : 'text-slate-400'}`} />
              <span className="truncate">{item.name}</span>
            </Link>
          );
        })}
      </nav>

      {/* User Footer */}
      <div className="p-4 border-t border-slate-800/80 bg-slate-900/40 flex items-center justify-between">
        <div className="flex items-center gap-3 min-w-0">
          <div className="h-9 w-9 rounded-full bg-emerald-500/20 text-emerald-400 flex items-center justify-center font-bold text-sm shrink-0">
            {user?.name ? user.name.charAt(0).toUpperCase() : (user?.email ? user.email.charAt(0).toUpperCase() : 'U')}
          </div>
          <div className="min-w-0 truncate">
            <p className="text-sm font-semibold text-slate-200 truncate">{user?.name || user?.email || 'Usuário'}</p>
            <p className="text-xs text-slate-400 truncate">{user?.email || ''}</p>
          </div>
        </div>
        <button
          onClick={logout}
          title="Sair do sistema"
          className="p-2 text-slate-400 hover:text-rose-400 hover:bg-rose-500/10 rounded-lg transition-colors shrink-0"
        >
          <LogOut className="h-4 w-4" />
        </button>
      </div>
    </>
  );

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col antialiased">
      {/* Mobile Drawer Backdrop */}
      {mobileMenuOpen && (
        <div
          onClick={() => setMobileMenuOpen(false)}
          className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm z-40 lg:hidden transition-opacity duration-300"
          aria-hidden="true"
        />
      )}

      {/* Mobile Drawer */}
      <aside
        className={`fixed inset-y-0 left-0 z-50 w-72 max-w-[85vw] bg-slate-900 border-r border-slate-800 shadow-2xl flex flex-col transform transition-transform duration-300 ease-in-out lg:hidden ${
          mobileMenuOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        <NavContent />
      </aside>

      {/* Desktop Fixed Sidebar */}
      <aside className="hidden lg:flex w-64 border-r border-slate-800 bg-slate-900/60 backdrop-blur-xl flex-col fixed inset-y-0 z-30">
        <NavContent />
      </aside>

      {/* Main Content Area */}
      <div className="flex-1 lg:pl-64 flex flex-col min-h-screen w-full min-w-0">
        {/* Top Header */}
        <header className="h-16 border-b border-slate-800 bg-slate-900/40 backdrop-blur-md px-3 sm:px-6 lg:px-8 flex items-center justify-between sticky top-0 z-20 gap-2 sm:gap-4">
          <div className="flex items-center gap-2 sm:gap-4 min-w-0">
            {/* Hamburger Button on Mobile */}
            <button
              onClick={() => setMobileMenuOpen(true)}
              className="lg:hidden p-2 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800/80 transition-colors shrink-0"
              aria-label="Abrir menu de navegação"
            >
              <Menu className="h-5 w-5" />
            </button>

            <span className="text-xs font-semibold uppercase tracking-wider text-slate-500 hidden sm:inline-block shrink-0">
              Contexto:
            </span>

            {/* Context Switcher Select */}
            <div className="relative min-w-0">
              <select
                value={selectedFamilyId || ''}
                onChange={(e) => setSelectedFamilyId(e.target.value || null)}
                className="bg-slate-800/90 text-slate-200 text-xs sm:text-sm font-medium rounded-lg pl-3 pr-8 py-1.5 border border-slate-700 focus:outline-none focus:ring-2 focus:ring-emerald-500 cursor-pointer appearance-none truncate max-w-[170px] sm:max-w-[240px] md:max-w-none"
              >
                <option value="">👤 Pessoal</option>
                {user.memberships?.map((m) => (
                  <option key={m.family.id} value={m.family.id}>
                    🏠 {m.family.name} ({m.role})
                  </option>
                ))}
              </select>
              <ChevronDown className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-slate-400 absolute right-2 sm:right-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <span className="inline-flex items-center gap-1.5 px-2.5 sm:px-3 py-1 rounded-full text-[11px] sm:text-xs font-medium bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse shrink-0"></span>
              <span className="truncate max-w-[90px] sm:max-w-[140px] md:max-w-none">
                {selectedFamilyId ? `${currentFamilyName || 'Família'}` : 'Individual'}
              </span>
            </span>
          </div>
        </header>

        {/* Page Content */}
        <main className="flex-1 p-3.5 sm:p-6 lg:p-8 overflow-y-auto w-full min-w-0 max-w-full">
          {children}
        </main>
      </div>
    </div>
  );
}
