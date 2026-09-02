'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAuth } from '../../context/AuthContext';
import { Building, Lock, Mail, ArrowRight, AlertCircle } from 'lucide-react';

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { login } = useAuth();
  const router = useRouter();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      await login(email, password);
      router.push('/');
    } catch (err: any) {
      setError(err.message || 'Erro ao efetuar login. Verifique suas credenciais.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-3.5 sm:p-6 bg-slate-950 py-8">
      <div className="w-full max-w-md my-auto">
        {/* Logo Header */}
        <div className="text-center mb-6 sm:mb-8">
          <div className="inline-flex h-12 w-12 sm:h-14 sm:w-14 rounded-2xl bg-gradient-to-tr from-emerald-500 to-teal-400 items-center justify-center shadow-xl shadow-emerald-500/20 mb-3.5 sm:mb-4">
            <Building className="h-6 w-6 sm:h-7 sm:w-7 text-slate-950 font-bold" />
          </div>
          <h1 className="text-xl sm:text-2xl font-bold text-white tracking-tight">Finanças Familiar</h1>
          <p className="text-xs sm:text-sm text-slate-400 mt-1">Acesse sua conta para gerenciar suas finanças</p>
        </div>

        {/* Card */}
        <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-5 sm:p-8 shadow-2xl backdrop-blur-xl">
          {error && (
            <div className="mb-5 sm:mb-6 p-3.5 sm:p-4 bg-rose-500/10 border border-rose-500/20 rounded-xl flex items-center gap-3 text-rose-400 text-xs sm:text-sm">
              <AlertCircle className="h-4 w-4 sm:h-5 sm:w-5 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-3.5 sm:space-y-4">
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-1.5">
                E-mail
              </label>
              <div className="relative">
                <Mail className="h-4 w-4 sm:h-5 sm:w-5 text-slate-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="exemplo@email.com"
                  className="w-full bg-slate-800/80 border border-slate-700/80 rounded-xl pl-10 sm:pl-11 pr-4 py-2 sm:py-2.5 text-xs sm:text-sm text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent transition-all"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-1.5">
                Senha
              </label>
              <div className="relative">
                <Lock className="h-4 w-4 sm:h-5 sm:w-5 text-slate-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full bg-slate-800/80 border border-slate-700/80 rounded-xl pl-10 sm:pl-11 pr-4 py-2 sm:py-2.5 text-xs sm:text-sm text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent transition-all"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full mt-2 bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-600 hover:to-teal-600 text-slate-950 font-semibold py-2.5 sm:py-3 px-4 rounded-xl shadow-lg shadow-emerald-500/20 flex items-center justify-center gap-2 transition-all duration-200 disabled:opacity-50 text-xs sm:text-sm"
            >
              {loading ? (
                <div className="h-5 w-5 border-2 border-slate-950 border-t-transparent rounded-full animate-spin"></div>
              ) : (
                <>
                  <span>Entrar no Sistema</span>
                  <ArrowRight className="h-4 w-4 shrink-0" />
                </>
              )}
            </button>
          </form>

          {/* Quick Demo Credentials Help */}
          <div className="mt-5 sm:mt-6 pt-5 sm:pt-6 border-t border-slate-800/80 text-center">
            <p className="text-xs text-slate-400">
              Não possui uma conta?{' '}
              <Link href="/register" className="text-emerald-400 font-semibold hover:underline">
                Cadastre-se gratuitamente
              </Link>
            </p>
            {((process.env.NEXT_PUBLIC_APP_ENV || 'development').toLowerCase() === 'development') && (
              <p className="text-[11px] sm:text-xs text-slate-500 mt-2">
                Conta de demonstração: <span className="text-slate-400">admin@exemplo.com</span> / <span className="text-slate-400">123456</span>
              </p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
