'use client';

import React, { useState, useEffect, useCallback } from 'react';
import {
  Fingerprint,
  Smartphone,
  Trash2,
  X,
  Plus,
  AlertCircle,
  CheckCircle2,
  ShieldCheck,
} from 'lucide-react';
import { useBiometrics, BiometricCredential } from '../../hooks/useBiometrics';

interface BiometricsSettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function BiometricsSettingsModal({ isOpen, onClose }: BiometricsSettingsModalProps) {
  const {
    isSupported,
    isLoading,
    registerBiometrics,
    listCredentials,
    removeCredential,
  } = useBiometrics();

  const [credentials, setCredentials] = useState<BiometricCredential[]>([]);
  const [deviceName, setDeviceName] = useState('');
  const [loadingList, setLoadingList] = useState(false);
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(
    null,
  );

  const loadList = useCallback(async () => {
    setLoadingList(true);
    const list = await listCredentials();
    setCredentials(list);
    setLoadingList(false);
  }, [listCredentials]);

  useEffect(() => {
    if (isOpen) {
      setFeedback(null);
      setDeviceName('');
      loadList();
    }
  }, [isOpen, loadList]);

  if (!isOpen) return null;

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setFeedback(null);

    const nameToRegister = deviceName.trim() || 'Meu Celular / Dispositivo';
    const res = await registerBiometrics(nameToRegister);

    if (res.success) {
      setFeedback({
        type: 'success',
        message: 'Biometria cadastrada com sucesso neste dispositivo!',
      });
      setDeviceName('');
      await loadList();
    } else if (res.error) {
      setFeedback({
        type: 'error',
        message: res.error,
      });
    }
  };

  const handleDelete = async (id: string, name: string | null) => {
    const confirmDelete = window.confirm(
      `Deseja realmente remover o acesso biométrico de "${name || 'Dispositivo'}"?`,
    );
    if (!confirmDelete) return;

    setFeedback(null);
    const ok = await removeCredential(id);
    if (ok) {
      setFeedback({
        type: 'success',
        message: 'Acesso biométrico revogado com sucesso.',
      });
      await loadList();
    } else {
      setFeedback({
        type: 'error',
        message: 'Falha ao revogar biometria. Tente novamente.',
      });
    }
  };

  const formatDate = (dateString?: string | null) => {
    if (!dateString) return 'Nunca utilizado';
    try {
      const d = new Date(dateString);
      return d.toLocaleDateString('pt-BR', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      });
    } catch {
      return dateString;
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-lg shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="flex items-center justify-between p-5 sm:p-6 border-b border-slate-800">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-emerald-500/10 border border-emerald-500/20 rounded-xl text-emerald-400">
              <Fingerprint className="h-6 w-6" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-white">Biometria & Passkeys</h2>
              <p className="text-xs text-slate-400">
                Acesse o app instantaneamente com a digital ou Face ID do celular
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-white p-2 rounded-lg hover:bg-slate-800 transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-5 sm:p-6 space-y-6 overflow-y-auto">
          {/* Status de Compatibilidade */}
          {isSupported ? (
            <div className="p-3.5 bg-emerald-500/10 border border-emerald-500/20 rounded-xl flex items-center gap-3 text-emerald-300 text-xs">
              <ShieldCheck className="h-5 w-5 shrink-0 text-emerald-400" />
              <span>
                Este dispositivo possui leitor biométrico compatível (Face ID / Impressão Digital).
              </span>
            </div>
          ) : (
            <div className="p-3.5 bg-amber-500/10 border border-amber-500/20 rounded-xl flex items-center gap-3 text-amber-300 text-xs">
              <AlertCircle className="h-5 w-5 shrink-0 text-amber-400" />
              <span>
                O leitor de biometria de plataforma não foi detectado neste navegador. Caso esteja no celular, certifique-se de que o bloqueio de tela biométrico está configurado.
              </span>
            </div>
          )}

          {/* Feedback */}
          {feedback && (
            <div
              className={`p-3.5 rounded-xl border flex items-center gap-3 text-xs ${
                feedback.type === 'success'
                  ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-300'
                  : 'bg-rose-500/10 border-rose-500/20 text-rose-300'
              }`}
            >
              {feedback.type === 'success' ? (
                <CheckCircle2 className="h-5 w-5 shrink-0 text-emerald-400" />
              ) : (
                <AlertCircle className="h-5 w-5 shrink-0 text-rose-400" />
              )}
              <span>{feedback.message}</span>
            </div>
          )}

          {/* Cadastrar novo dispositivo */}
          {isSupported && (
            <form onSubmit={handleRegister} className="bg-slate-850 p-4 rounded-xl border border-slate-800 space-y-3">
              <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-300 flex items-center gap-2">
                <Plus className="h-4 w-4 text-emerald-400" />
                Cadastrar biometria deste aparelho
              </h3>
              <div className="flex flex-col sm:flex-row gap-2">
                <input
                  type="text"
                  value={deviceName}
                  onChange={(e) => setDeviceName(e.target.value)}
                  placeholder="Nome do aparelho (ex: Galaxy S23, iPhone)"
                  className="flex-1 bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
                <button
                  type="submit"
                  disabled={isLoading}
                  className="bg-emerald-500 hover:bg-emerald-600 text-slate-950 font-semibold px-4 py-2 rounded-lg text-xs flex items-center justify-center gap-2 transition-colors disabled:opacity-50 shrink-0"
                >
                  {isLoading ? (
                    <div className="h-4 w-4 border-2 border-slate-950 border-t-transparent rounded-full animate-spin" />
                  ) : (
                    <>
                      <Fingerprint className="h-4 w-4" />
                      <span>Cadastrar Biometria</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          )}

          {/* Lista de Dispositivos Cadastrados */}
          <div className="space-y-3">
            <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-400">
              Dispositivos com Acesso Cadastrado
            </h3>

            {loadingList ? (
              <div className="py-8 flex justify-center">
                <div className="h-6 w-6 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin" />
              </div>
            ) : credentials.length === 0 ? (
              <div className="p-6 text-center border border-dashed border-slate-800 rounded-xl">
                <Smartphone className="h-8 w-8 text-slate-600 mx-auto mb-2" />
                <p className="text-xs text-slate-400">Nenhum dispositivo biométrico cadastrado ainda.</p>
                <p className="text-[11px] text-slate-500 mt-1">
                  Cadastre o leitor do seu celular para fazer login instantâneo.
                </p>
              </div>
            ) : (
              <div className="space-y-2">
                {credentials.map((cred) => (
                  <div
                    key={cred.id}
                    className="p-3.5 bg-slate-800/60 border border-slate-800 rounded-xl flex items-center justify-between gap-3 hover:border-slate-700 transition-colors"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="p-2 bg-slate-700/50 rounded-lg text-emerald-400 shrink-0">
                        <Smartphone className="h-4 w-4" />
                      </div>
                      <div className="min-w-0">
                        <p className="text-xs font-medium text-white truncate">
                          {cred.deviceName || 'Dispositivo Móvel'}
                        </p>
                        <p className="text-[11px] text-slate-400">
                          Cadastrado em: {formatDate(cred.createdAt)}
                        </p>
                        {cred.lastUsedAt && (
                          <p className="text-[10px] text-emerald-400/80">
                            Último uso: {formatDate(cred.lastUsedAt)}
                          </p>
                        )}
                      </div>
                    </div>
                    <button
                      onClick={() => handleDelete(cred.id, cred.deviceName)}
                      className="p-2 text-slate-400 hover:text-rose-400 hover:bg-rose-500/10 rounded-lg transition-colors shrink-0"
                      title="Revogar acesso deste dispositivo"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-slate-800 bg-slate-900/50 flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-medium rounded-lg transition-colors"
          >
            Fechar
          </button>
        </div>
      </div>
    </div>
  );
}
