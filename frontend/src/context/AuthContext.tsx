'use client';

import React, { createContext, useContext, useEffect, useState } from 'react';
import { apiRequest } from '../lib/api';
import { setAuthCookie, getAuthCookie, removeAuthCookie } from '../lib/cookies';

export interface User {
  id: string;
  name: string;
  email: string;
  avatarUrl?: string | null;
  memberships?: Array<{
    role: string;
    family: {
      id: string;
      name: string;
      description?: string;
    };
  }>;
}

interface AuthContextType {
  user: User | null;
  token: string | null;
  selectedFamilyId: string | null;
  setSelectedFamilyId: (id: string | null) => void;
  isLoading: boolean;
  isViewer: boolean;
  currentFamilyRole: string | null;
  login: (email: string, password: string) => Promise<void>;
  register: (name: string, email: string, password: string) => Promise<void>;
  logout: () => void | Promise<void>;
  refreshUserData: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [selectedFamilyId, setSelectedFamilyId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // Limpeza defensiva de tokens e dados legados gravados em disco
    try {
      localStorage.removeItem('financial_token');
      localStorage.removeItem('financial_user');
      localStorage.removeItem('financial_family_id');
    } catch (_) {}

    const storedToken = getAuthCookie('financial_token') || sessionStorage.getItem('financial_token');
    const storedUser = sessionStorage.getItem('financial_user');
    const storedFamily = sessionStorage.getItem('financial_family_id') || getAuthCookie('financial_family_id');

    if (storedToken && storedUser) {
      setToken(storedToken);
      setAuthCookie('financial_token', storedToken);
      try {
        const parsed = JSON.parse(storedUser);
        setUser(parsed);
        if (storedFamily) setSelectedFamilyId(storedFamily);
      } catch (e) {
        console.error('Error parsing stored user', e);
      }
      setIsLoading(false);
    } else if (storedToken) {
      // Caso exista o cookie de sessão mas não o cache local (ex: nova aba aberta)
      setToken(storedToken);
      apiRequest<User>('/auth/me')
        .then((userData) => {
          setUser(userData);
          sessionStorage.setItem('financial_user', JSON.stringify(userData));
          if (userData.memberships && userData.memberships.length > 0) {
            const initialFamily = storedFamily || userData.memberships[0].family.id;
            setSelectedFamilyId(initialFamily);
            setAuthCookie('financial_family_id', initialFamily);
          }
        })
        .catch(() => {
          removeAuthCookie('financial_token');
          removeAuthCookie('financial_family_id');
          sessionStorage.clear();
          setToken(null);
          setUser(null);
        })
        .finally(() => {
          setIsLoading(false);
        });
      return;
    } else {
      setIsLoading(false);
    }
  }, []);

  const handleFamilyChange = (id: string | null) => {
    setSelectedFamilyId(id);
    if (id) {
      sessionStorage.setItem('financial_family_id', id);
      setAuthCookie('financial_family_id', id);
    } else {
      sessionStorage.removeItem('financial_family_id');
      removeAuthCookie('financial_family_id');
    }
  };

  const login = async (email: string, password: string) => {
    const data = await apiRequest<{ user: User; accessToken: string }>('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    });

    setUser(data.user);
    setToken(data.accessToken);
    setAuthCookie('financial_token', data.accessToken);
    sessionStorage.setItem('financial_user', JSON.stringify(data.user));

    if (data.user.memberships && data.user.memberships.length > 0) {
      handleFamilyChange(data.user.memberships[0].family.id);
    }
  };

  const register = async (name: string, email: string, password: string) => {
    const data = await apiRequest<{ user: User; accessToken: string }>('/auth/register', {
      method: 'POST',
      body: JSON.stringify({ name, email, password }),
    });

    setUser(data.user);
    setToken(data.accessToken);
    setAuthCookie('financial_token', data.accessToken);
    sessionStorage.setItem('financial_user', JSON.stringify(data.user));
  };

  const refreshUserData = async () => {
    try {
      const families = await apiRequest<any[]>('/families');
      if (user) {
        const updated = {
          ...user,
          memberships: families.map((f) => ({
            role: f.role,
            family: f.family,
          })),
        };
        setUser(updated);
        sessionStorage.setItem('financial_user', JSON.stringify(updated));
      }
    } catch (e) {
      console.error('Failed to refresh user data', e);
    }
  };

  const logout = async () => {
    try {
      await apiRequest('/auth/logout', { method: 'POST' }).catch(() => {});
    } finally {
      setUser(null);
      setToken(null);
      setSelectedFamilyId(null);
      removeAuthCookie('financial_token');
      removeAuthCookie('financial_family_id');
      sessionStorage.removeItem('financial_token');
      sessionStorage.removeItem('financial_user');
      sessionStorage.removeItem('financial_family_id');
      try {
        localStorage.removeItem('financial_token');
        localStorage.removeItem('financial_user');
        localStorage.removeItem('financial_family_id');
      } catch (_) {}
      window.location.href = '/login';
    }
  };

  const currentMembership = user?.memberships?.find(
    (m) => m.family.id === selectedFamilyId
  );
  const currentFamilyRole = currentMembership?.role || null;
  const isViewer = Boolean(selectedFamilyId && currentFamilyRole === 'VIEWER');

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        selectedFamilyId,
        setSelectedFamilyId: handleFamilyChange,
        isLoading,
        isViewer,
        currentFamilyRole,
        login,
        register,
        logout,
        refreshUserData,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth deve ser utilizado dentro de um AuthProvider');
  }
  return context;
}
