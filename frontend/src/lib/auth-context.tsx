'use client';

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import type { User } from '@/shared';
import { api } from './api';
import {
  clearSession,
  getRefreshToken,
  getStoredUser,
  setStoredUser,
  setTokens,
} from './auth-storage';

interface AuthResult {
  user: User;
  accessToken: string;
  refreshToken: string;
}

interface AuthContextValue {
  user: User | null;
  /** Идёт первичная гидрация из localStorage */
  loading: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (name: string, email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  updateUser: (user: User) => void;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setUser(getStoredUser());
    setLoading(false);
  }, []);

  const persist = useCallback((result: AuthResult) => {
    setTokens(result.accessToken, result.refreshToken);
    setStoredUser(result.user);
    setUser(result.user);
  }, []);

  const login = useCallback(
    async (email: string, password: string) => {
      const result = await api.post<AuthResult>('/auth/login', { email, password }, false);
      persist(result);
    },
    [persist],
  );

  const register = useCallback(
    async (name: string, email: string, password: string) => {
      const result = await api.post<AuthResult>('/auth/register', { name, email, password }, false);
      persist(result);
    },
    [persist],
  );

  const logout = useCallback(async () => {
    const refreshToken = getRefreshToken();
    if (refreshToken) {
      try {
        await api.post('/auth/logout', { refreshToken }, false);
      } catch {
        // logout best-effort
      }
    }
    clearSession();
    setUser(null);
  }, []);

  const updateUser = useCallback((next: User) => {
    setStoredUser(next);
    setUser(next);
  }, []);

  const value = useMemo<AuthContextValue>(
    () => ({ user, loading, login, register, logout, updateUser }),
    [user, loading, login, register, logout, updateUser],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error('useAuth должен использоваться внутри <AuthProvider>');
  }
  return ctx;
}
