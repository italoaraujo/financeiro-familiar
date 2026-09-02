'use client';

import React, { useEffect, useState } from 'react';
import AppShell from '../../components/layout/AppShell';
import { useAuth } from '../../context/AuthContext';
import { apiRequest } from '../../lib/api';
import { formatDate } from '../../lib/formatters';
import {
  Users,
  Plus,
  UserPlus,
  Crown,
  Shield,
  User,
  Eye,
  Trash2,
  X,
  CheckCircle2,
  Mail,
} from 'lucide-react';

export default function FamilyPage() {
  const { user, selectedFamilyId, setSelectedFamilyId, refreshUserData } = useAuth();
  const [loading, setLoading] = useState(true);
  const [families, setFamilies] = useState<any[]>([]);
  const [currentFamily, setCurrentFamily] = useState<any>(null);

  // Modals
  const [isFamilyModalOpen, setIsFamilyModalOpen] = useState(false);
  const [isMemberModalOpen, setIsMemberModalOpen] = useState(false);

  // New Family Form
  const [familyName, setFamilyName] = useState('');
  const [familyDesc, setFamilyDesc] = useState('');

  // Add Member Form
  const [memberEmail, setMemberEmail] = useState('');
  const [memberRole, setMemberRole] = useState('MEMBER');
  const [submitting, setSubmitting] = useState(false);

  const loadData = async () => {
    setLoading(true);
    try {
      const fams = await apiRequest('/families');
      setFamilies(fams || []);

      if (fams && fams.length > 0) {
        const activeFamId = selectedFamilyId || fams[0].family?.id || fams[0].id;
        const details = await apiRequest(`/families/${activeFamId}`);
        const familyData = details?.family ? { ...details.family, role: details.role } : details;
        setCurrentFamily(familyData);
      } else {
        setCurrentFamily(null);
      }
    } catch (err) {
      console.error('Error loading family data:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (user) {
      loadData();
    }
  }, [user, selectedFamilyId]);

  const handleCreateFamily = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);

    try {
      const created = await apiRequest('/families', {
        method: 'POST',
        body: JSON.stringify({
          name: familyName,
          description: familyDesc || undefined,
        }),
      });

      setIsFamilyModalOpen(false);
      setFamilyName('');
      setFamilyDesc('');
      await refreshUserData();
      setSelectedFamilyId(created.id);
      loadData();
    } catch (err: any) {
      alert(err.message || 'Erro ao criar grupo familiar');
    } finally {
      setSubmitting(false);
    }
  };

  const handleAddMember = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentFamily) return;
    setSubmitting(true);

    try {
      await apiRequest(`/families/${currentFamily.id}/members`, {
        method: 'POST',
        body: JSON.stringify({
          email: memberEmail,
          role: memberRole,
        }),
      });

      setIsMemberModalOpen(false);
      setMemberEmail('');
      loadData();
    } catch (err: any) {
      alert(err.message || 'Erro ao adicionar membro');
    } finally {
      setSubmitting(false);
    }
  };

  const handleRemoveMember = async (userId: string) => {
    if (!currentFamily || !confirm('Deseja remover este membro do grupo familiar?')) return;
    try {
      await apiRequest(`/families/${currentFamily.id}/members/${userId}`, { method: 'DELETE' });
      loadData();
    } catch (err: any) {
      alert(err.message || 'Erro ao remover membro');
    }
  };

  const getRoleIcon = (role: string) => {
    switch (role) {
      case 'OWNER':
        return <Crown className="h-4 w-4 text-amber-400" />;
      case 'ADMIN':
        return <Shield className="h-4 w-4 text-purple-400" />;
      case 'VIEWER':
        return <Eye className="h-4 w-4 text-slate-400" />;
      default:
        return <User className="h-4 w-4 text-emerald-400" />;
    }
  };

  return (
    <AppShell>
      <div className="space-y-8">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-white tracking-tight">Grupo Familiar & Integrantes</h1>
            <p className="text-sm text-slate-400">
              Compartilhe orçamentos e contas familiares com controle de permissões por membro
            </p>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={() => setIsFamilyModalOpen(true)}
              className="inline-flex items-center justify-center gap-2 bg-slate-800 hover:bg-slate-700 text-white font-semibold px-4 py-2.5 rounded-xl text-sm border border-slate-700 transition-all"
            >
              <Plus className="h-4 w-4" />
              <span>Criar Novo Grupo</span>
            </button>

            {currentFamily && (
              <button
                onClick={() => setIsMemberModalOpen(true)}
                className="inline-flex items-center justify-center gap-2 bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-600 hover:to-teal-600 text-slate-950 font-semibold px-4 py-2.5 rounded-xl text-sm shadow-lg shadow-emerald-500/20 transition-all"
              >
                <UserPlus className="h-4 w-4" />
                <span>Convidar Membro</span>
              </button>
            )}
          </div>
        </div>

        {/* Family Details Card */}
        {loading ? (
          <div className="py-12 text-center text-slate-500">Carregando grupo familiar...</div>
        ) : !currentFamily ? (
          <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-12 text-center space-y-4">
            <div className="h-16 w-16 bg-emerald-500/10 text-emerald-400 rounded-2xl flex items-center justify-center mx-auto">
              <Users className="h-8 w-8" />
            </div>
            <h3 className="text-lg font-bold text-white">Nenhum Grupo Familiar Vinculado</h3>
            <p className="text-sm text-slate-400 max-w-md mx-auto">
              Crie um grupo familiar para compartilhar o controle financeiro de contas, despesas e metas da sua casa.
            </p>
            <button
              onClick={() => setIsFamilyModalOpen(true)}
              className="bg-emerald-500 hover:bg-emerald-600 text-slate-950 font-bold px-6 py-2.5 rounded-xl text-sm shadow-lg shadow-emerald-500/20"
            >
              Criar Meu Grupo Familiar
            </button>
          </div>
        ) : (
          <div className="space-y-6">
            {/* Info Banner */}
            <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-6 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
              <div className="flex items-center gap-4">
                <div className="h-14 w-14 rounded-2xl bg-gradient-to-tr from-purple-500 to-indigo-500 flex items-center justify-center shadow-lg shadow-purple-500/20 text-white font-bold text-xl">
                  {currentFamily?.name ? currentFamily.name.charAt(0).toUpperCase() : 'F'}
                </div>
                <div>
                  <h2 className="text-xl font-bold text-white">{currentFamily?.name || 'Grupo Familiar'}</h2>
                  <p className="text-xs text-slate-400 mt-0.5">
                    {currentFamily?.description || 'Gestão financeira compartilhada'} • Criado em{' '}
                    {currentFamily?.createdAt ? formatDate(currentFamily.createdAt) : '-'}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <span className="text-xs text-slate-400 font-medium">
                  {currentFamily?.members?.length || 0} integrantes ativos
                </span>
              </div>
            </div>

            {/* Members List */}
            <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-6 shadow-xl">
              <h3 className="text-base font-bold text-white mb-4">Integrantes do Grupo</h3>

              <div className="divide-y divide-slate-800/80">
                {currentFamily?.members?.map((m: any) => (
                  <div key={m.id} className="py-4 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="h-10 w-10 rounded-full bg-slate-800 flex items-center justify-center text-slate-200 font-bold text-sm">
                        {m.user?.name ? m.user.name.charAt(0).toUpperCase() : (m.user?.email ? m.user.email.charAt(0).toUpperCase() : 'U')}
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <p className="font-semibold text-white text-sm">{m.user?.name || m.user?.email || 'Membro'}</p>
                          {m.user?.id === user?.id && (
                            <span className="text-[10px] bg-emerald-500/10 text-emerald-400 px-2 py-0.5 rounded-full border border-emerald-500/20 font-bold">
                              Você
                            </span>
                          )}
                        </div>
                        <p className="text-xs text-slate-400">{m.user?.email || '-'}</p>
                      </div>
                    </div>

                    <div className="flex items-center gap-4">
                      <div className="flex items-center gap-1.5 px-3 py-1 bg-slate-800 rounded-lg text-xs font-semibold text-slate-300">
                        {getRoleIcon(m.role)}
                        <span>{m.role}</span>
                      </div>

                      {m.role !== 'OWNER' && (
                        <button
                          onClick={() => handleRemoveMember(m.user?.id)}
                          className="p-1.5 text-slate-500 hover:text-rose-400 rounded-lg hover:bg-slate-800"
                          title="Remover membro"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Create Family Modal */}
        {isFamilyModalOpen && (
          <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
            <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-md p-6 shadow-2xl relative">
              <button
                onClick={() => setIsFamilyModalOpen(false)}
                className="absolute right-4 top-4 text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800"
              >
                <X className="h-5 w-5" />
              </button>

              <h2 className="text-xl font-bold text-white mb-4">Novo Grupo Familiar</h2>

              <form onSubmit={handleCreateFamily} className="space-y-4">
                <div>
                  <label className="block text-xs font-semibold uppercase text-slate-400 mb-1">Nome da Família *</label>
                  <input
                    type="text"
                    required
                    value={familyName}
                    onChange={(e) => setFamilyName(e.target.value)}
                    placeholder="Ex: Família Silva"
                    className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold uppercase text-slate-400 mb-1">Descrição</label>
                  <input
                    type="text"
                    value={familyDesc}
                    onChange={(e) => setFamilyDesc(e.target.value)}
                    placeholder="Ex: Orçamento residencial e despesas conjuntas"
                    className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-2 text-sm text-white"
                  />
                </div>

                <button
                  type="submit"
                  disabled={submitting}
                  className="w-full mt-4 bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-600 hover:to-teal-600 text-slate-950 font-bold py-3 px-4 rounded-xl shadow-lg shadow-emerald-500/20 transition-all disabled:opacity-50"
                >
                  {submitting ? 'Criando...' : 'Criar Grupo Familiar'}
                </button>
              </form>
            </div>
          </div>
        )}

        {/* Add Member Modal */}
        {isMemberModalOpen && (
          <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
            <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-md p-6 shadow-2xl relative">
              <button
                onClick={() => setIsMemberModalOpen(false)}
                className="absolute right-4 top-4 text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800"
              >
                <X className="h-5 w-5" />
              </button>

              <h2 className="text-xl font-bold text-white mb-2">Convidar Integrante</h2>
              <p className="text-xs text-slate-400 mb-4">
                Adicione um novo usuário pelo e-mail cadastrado para ter acesso ao grupo familiar.
              </p>

              <form onSubmit={handleAddMember} className="space-y-4">
                <div>
                  <label className="block text-xs font-semibold uppercase text-slate-400 mb-1">E-mail do Membro *</label>
                  <input
                    type="email"
                    required
                    value={memberEmail}
                    onChange={(e) => setMemberEmail(e.target.value)}
                    placeholder="exemplo@email.com"
                    className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold uppercase text-slate-400 mb-1">Papel / Permissão *</label>
                  <select
                    value={memberRole}
                    onChange={(e) => setMemberRole(e.target.value)}
                    className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-sm text-white"
                  >
                    <option value="MEMBER">MEMBER (Lança receitas e despesas)</option>
                    <option value="ADMIN">ADMIN (Gerencia membros e contas)</option>
                    <option value="VIEWER">VIEWER (Apenas visualização)</option>
                  </select>
                </div>

                <button
                  type="submit"
                  disabled={submitting}
                  className="w-full mt-4 bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-600 hover:to-teal-600 text-slate-950 font-bold py-3 px-4 rounded-xl shadow-lg shadow-emerald-500/20 transition-all disabled:opacity-50"
                >
                  {submitting ? 'Adicionando...' : 'Adicionar ao Grupo'}
                </button>
              </form>
            </div>
          </div>
        )}
      </div>
    </AppShell>
  );
}
