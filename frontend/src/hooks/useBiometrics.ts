'use client';

import { useState, useEffect, useCallback } from 'react';
import { startRegistration, startAuthentication } from '@simplewebauthn/browser';
import { apiRequest } from '../lib/api';
import { useAuth, User } from '../context/AuthContext';

export interface BiometricCredential {
  id: string;
  credentialId: string;
  deviceName: string | null;
  deviceType: string | null;
  createdAt: string;
  lastUsedAt: string | null;
  counter: number;
}

export function useBiometrics() {
  const { setSession } = useAuth();
  const [isSupported, setIsSupported] = useState<boolean>(false);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function checkSupport() {
      try {
        if (
          typeof window !== 'undefined' &&
          window.PublicKeyCredential &&
          typeof window.PublicKeyCredential.isUserVerifyingPlatformAuthenticatorAvailable === 'function'
        ) {
          const available = await window.PublicKeyCredential.isUserVerifyingPlatformAuthenticatorAvailable();
          setIsSupported(Boolean(available));
        } else {
          setIsSupported(false);
        }
      } catch {
        setIsSupported(false);
      }
    }

    checkSupport();
  }, []);

  const registerBiometrics = useCallback(
    async (deviceName?: string): Promise<{ success: boolean; error?: string }> => {
      setIsLoading(true);
      setError(null);

      try {
        // 1. Obter opções FIDO2 do servidor
        const options = await apiRequest<any>('/auth/passkey/register-options', {
          method: 'POST',
        });

        // 2. Chamar o leitor biométrico nativo do aparelho
        const attResp = await startRegistration({ optionsJSON: options });

        // 3. Enviar a credencial gerada para validação e persistência
        await apiRequest('/auth/passkey/register-verify', {
          method: 'POST',
          body: JSON.stringify({
            ...attResp,
            deviceName: deviceName || 'Dispositivo Atual',
          }),
        });

        setIsLoading(false);
        return { success: true };
      } catch (err: any) {
        setIsLoading(false);
        let message = 'Erro ao cadastrar biometria';

        if (err.name === 'NotAllowedError') {
          message = 'Cadastro cancelado ou permissão biométrica recusada pelo usuário';
        } else if (err.message) {
          message = err.message;
        }

        setError(message);
        return { success: false, error: message };
      }
    },
    [],
  );

  const loginWithBiometrics = useCallback(async (): Promise<{
    success: boolean;
    user?: User;
    error?: string;
  }> => {
    setIsLoading(true);
    setError(null);

    try {
      // 1. Obter desafio de autenticação do servidor
      const options = await apiRequest<any>('/auth/passkey/login-options', {
        method: 'POST',
      });

      // 2. Solicitar autenticação biométrica nativa no aparelho
      const authResp = await startAuthentication({ optionsJSON: options });

      // 3. Validar assinatura e obter sessão
      const data = await apiRequest<{ user: User; accessToken: string }>(
        '/auth/passkey/login-verify',
        {
          method: 'POST',
          body: JSON.stringify(authResp),
        },
      );

      // 4. Salvar sessão no contexto e cookies
      setSession(data.user, data.accessToken);

      setIsLoading(false);
      return { success: true, user: data.user };
    } catch (err: any) {
      setIsLoading(false);
      let message = 'Falha ao autenticar com biometria';

      if (err.name === 'NotAllowedError') {
        message = 'Autenticação cancelada no aparelho';
      } else if (err.message) {
        message = err.message;
      }

      setError(message);
      return { success: false, error: message };
    }
  }, [setSession]);

  const listCredentials = useCallback(async (): Promise<BiometricCredential[]> => {
    try {
      return await apiRequest<BiometricCredential[]>('/auth/passkey/credentials');
    } catch (err: any) {
      setError(err.message || 'Erro ao carregar biometrias cadastradas');
      return [];
    }
  }, []);

  const removeCredential = useCallback(async (id: string): Promise<boolean> => {
    try {
      await apiRequest(`/auth/passkey/credentials/${id}`, {
        method: 'DELETE',
      });
      return true;
    } catch (err: any) {
      setError(err.message || 'Erro ao remover biometria');
      return false;
    }
  }, []);

  return {
    isSupported,
    isLoading,
    error,
    registerBiometrics,
    loginWithBiometrics,
    listCredentials,
    removeCredential,
  };
}
