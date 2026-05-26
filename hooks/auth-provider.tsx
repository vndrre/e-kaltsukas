import AsyncStorage from '@react-native-async-storage/async-storage';
import axios from 'axios';
import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { api } from '@/lib/api';

const STORAGE_KEY = 'auth-session';
const REFRESH_BUFFER_SECONDS = 60;

type AuthUser = {
  id?: string;
  email: string;
  name?: string;
};

type AuthContextValue = {
  user: AuthUser | null;
  token: string | null;
  isHydrated: boolean;
  isAuthenticated: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (name: string, email: string, password: string) => Promise<RegisterResult>;
  logout: () => Promise<void>;
};

const AuthContext = createContext<AuthContextValue | null>(null);

type StoredAuthSession = {
  user: AuthUser;
  token: string;
  refreshToken: string | null;
  expiresAt: number | null;
};

type AuthApiUser = {
  id?: string;
  email?: string;
  user_metadata?: {
    name?: string;
    full_name?: string;
  };
};

type AuthApiSession = {
  access_token?: string;
  refresh_token?: string;
  expires_at?: number;
};

type AuthApiResponse = {
  user?: AuthApiUser;
  token?: string | null;
  refreshToken?: string | null;
  expiresAt?: number | null;
  session?: AuthApiSession | null;
  needsEmailConfirmation?: boolean;
};

type RegisterResult = {
  email: string;
  needsEmailConfirmation: boolean;
};

function extractErrorMessage(error: unknown, fallback: string) {
  if (axios.isAxiosError(error)) {
    const apiMessage = error.response?.data?.message;
    const status = error.response?.status;

    if (status === 429 || (typeof apiMessage === 'string' && /rate limit/i.test(apiMessage))) {
      return 'Too many signup emails were requested. Please wait a few minutes and try again.';
    }

    if (typeof apiMessage === 'string' && apiMessage.trim()) {
      return apiMessage;
    }
  }

  if (error instanceof Error && error.message) {
    return error.message;
  }

  return fallback;
}

function getUserName(user?: AuthApiUser, fallback?: AuthUser | null) {
  return user?.user_metadata?.name ?? user?.user_metadata?.full_name ?? fallback?.name;
}

function setApiAuthToken(token: string | null) {
  if (token) {
    api.defaults.headers.common.Authorization = `Bearer ${token}`;
    return;
  }

  delete api.defaults.headers.common.Authorization;
}

function buildStoredSession(payload: AuthApiResponse, fallbackUser?: AuthUser | null): StoredAuthSession {
  const token = payload.token ?? payload.session?.access_token ?? null;
  const email = payload.user?.email ?? fallbackUser?.email;

  if (!token || !email) {
    throw new Error('Authentication succeeded but the server did not return a valid session.');
  }

  return {
    user: {
      id: payload.user?.id ?? fallbackUser?.id,
      email,
      name: getUserName(payload.user, fallbackUser),
    },
    token,
    refreshToken: payload.refreshToken ?? payload.session?.refresh_token ?? null,
    expiresAt: payload.expiresAt ?? payload.session?.expires_at ?? null,
  };
}

function isSessionExpiring(expiresAt: number | null) {
  if (!expiresAt) {
    return false;
  }

  return expiresAt - Math.floor(Date.now() / 1000) <= REFRESH_BUFFER_SECONDS;
}

async function requestSessionRefresh(refreshToken: string, fallbackUser?: AuthUser | null) {
  const response = await api.post('/auth/refresh', { refreshToken });
  return buildStoredSession(response.data as AuthApiResponse, fallbackUser);
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [refreshToken, setRefreshToken] = useState<string | null>(null);
  const [expiresAt, setExpiresAt] = useState<number | null>(null);
  const [isHydrated, setIsHydrated] = useState(false);

  const applySession = useCallback((session: StoredAuthSession) => {
    setUser(session.user);
    setToken(session.token);
    setRefreshToken(session.refreshToken);
    setExpiresAt(session.expiresAt);
    setApiAuthToken(session.token);
  }, []);

  const persistSession = useCallback(
    async (session: StoredAuthSession) => {
      applySession(session);
      await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(session));
    },
    [applySession]
  );

  const logout = useCallback(async () => {
    setUser(null);
    setToken(null);
    setRefreshToken(null);
    setExpiresAt(null);
    setApiAuthToken(null);
    await AsyncStorage.removeItem(STORAGE_KEY);
  }, []);

  useEffect(() => {
    let isMounted = true;

    const hydrate = async () => {
      try {
        const rawSession = await AsyncStorage.getItem(STORAGE_KEY);

        if (!isMounted || !rawSession) {
          return;
        }

        const parsed = JSON.parse(rawSession) as StoredAuthSession;

        if (!parsed?.user?.email || !parsed.token) {
          await logout();
          return;
        }

        if (isSessionExpiring(parsed.expiresAt)) {
          if (!parsed.refreshToken) {
            await logout();
            return;
          }

          const refreshedSession = await requestSessionRefresh(parsed.refreshToken, parsed.user);

          if (isMounted) {
            await persistSession(refreshedSession);
          }

          return;
        }

        applySession(parsed);
      } catch {
        await logout();
      } finally {
        if (isMounted) {
          setIsHydrated(true);
        }
      }
    };

    hydrate();

    return () => {
      isMounted = false;
    };
  }, [applySession, logout, persistSession]);

  useEffect(() => {
    if (!refreshToken || !expiresAt || !user) {
      return undefined;
    }

    const refreshDelay = Math.max(expiresAt * 1000 - Date.now() - REFRESH_BUFFER_SECONDS * 1000, 1000);
    const timeout = setTimeout(() => {
      requestSessionRefresh(refreshToken, user)
        .then(persistSession)
        .catch(() => {
          logout();
        });
    }, refreshDelay);

    return () => clearTimeout(timeout);
  }, [expiresAt, logout, persistSession, refreshToken, user]);

  const login = useCallback(async (email: string, password: string) => {
    try {
      const response = await api.post('/auth/login', { email, password });
      const nextSession = buildStoredSession(response.data as AuthApiResponse, { email });
      await persistSession(nextSession);
    } catch (error) {
      throw new Error(extractErrorMessage(error, 'Failed to log in'));
    }
  }, [persistSession]);

  const register = useCallback(async (name: string, email: string, password: string) => {
    try {
      const response = await api.post('/auth/signup', { name, email, password });
      const payload = response.data as AuthApiResponse;

      if (payload.needsEmailConfirmation || !payload.token) {
        return {
          email: payload.user?.email ?? email,
          needsEmailConfirmation: true,
        };
      }

      const nextSession = buildStoredSession(payload, { email, name });
      await persistSession(nextSession);

      return {
        email: nextSession.user.email,
        needsEmailConfirmation: false,
      };
    } catch (error) {
      throw new Error(extractErrorMessage(error, 'Failed to sign up'));
    }
  }, [persistSession]);

  const value = useMemo(
    () => ({
      user,
      token,
      isHydrated,
      isAuthenticated: Boolean(user && token),
      login,
      register,
      logout,
    }),
    [isHydrated, login, logout, register, token, user]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);

  if (!context) {
    throw new Error('useAuth must be used within AuthProvider');
  }

  return context;
}
