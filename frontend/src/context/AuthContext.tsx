'use client';

import React, { createContext, useContext, useEffect, useState } from 'react';
import { apiRequest } from '../lib/api';

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
  login: (email: string, password: string) => Promise<void>;
  register: (name: string, email: string, password: string) => Promise<void>;
  logout: () => void;
  refreshUserData: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [selectedFamilyId, setSelectedFamilyId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const storedToken = localStorage.getItem('financial_token');
    const storedUser = localStorage.getItem('financial_user');
    const storedFamily = localStorage.getItem('financial_family_id');

    if (storedToken && storedUser) {
      setToken(storedToken);
      try {
        const parsed = JSON.parse(storedUser);
        setUser(parsed);
        if (storedFamily) setSelectedFamilyId(storedFamily);
      } catch (e) {
        console.error('Error parsing stored user', e);
      }
    }
    setIsLoading(false);
  }, []);

  const handleFamilyChange = (id: string | null) => {
    setSelectedFamilyId(id);
    if (id) {
      localStorage.setItem('financial_family_id', id);
    } else {
      localStorage.removeItem('financial_family_id');
    }
  };

  const login = async (email: string, password: string) => {
    const data = await apiRequest<{ user: User; accessToken: string }>('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    });

    setUser(data.user);
    setToken(data.accessToken);
    localStorage.setItem('financial_token', data.accessToken);
    localStorage.setItem('financial_user', JSON.stringify(data.user));

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
    localStorage.setItem('financial_token', data.accessToken);
    localStorage.setItem('financial_user', JSON.stringify(data.user));
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
        localStorage.setItem('financial_user', JSON.stringify(updated));
      }
    } catch (e) {
      console.error('Failed to refresh user data', e);
    }
  };

  const logout = () => {
    setUser(null);
    setToken(null);
    setSelectedFamilyId(null);
    localStorage.removeItem('financial_token');
    localStorage.removeItem('financial_user');
    localStorage.removeItem('financial_family_id');
    window.location.href = '/login';
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        selectedFamilyId,
        setSelectedFamilyId: handleFamilyChange,
        isLoading,
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
