import AsyncStorage from '@react-native-async-storage/async-storage';
import axios from 'axios';
import React, { createContext, useContext, useEffect, useMemo, useState } from 'react';
import { api } from '@/lib/api';

const STORAGE_KEY = 'auth-session';

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
  register: (name: string, email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
};

const AuthContext = createContext<AuthContextValue | null>(null);

type StoredAuthSession = {
  user: AuthUser;
  token: string | null;
};

function extractErrorMessage(error: unknown, fallback: string) {
  if (axios.isAxiosError(error)) {
    const apiMessage = error.response?.data?.message;
    if (typeof apiMessage === 'string' && apiMessage.trim()) {
      return apiMessage;
    }
  }

  if (error instanceof Error && error.message) {
    return error.message;
  }

  return fallback;
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [isHydrated, setIsHydrated] = useState(false);

  useEffect(() => {
    let isMounted = true;

    AsyncStorage.getItem(STORAGE_KEY)
      .then((rawSession) => {
        if (!isMounted) {
          return;
        }

        if (!rawSession) {
          return;
        }

        const parsed = JSON.parse(rawSession) as StoredAuthSession;

        if (parsed?.user?.email) {
          setUser(parsed.user);
          setToken(parsed.token ?? null);
        }
      })
      .catch(() => {
        setUser(null);
        setToken(null);
      })
      .finally(() => {
        if (isMounted) {
          setIsHydrated(true);
        }
      });

    return () => {
      isMounted = false;
    };
  }, []);

  const persistSession = async (nextUser: AuthUser, nextToken: string | null) => {
    const session: StoredAuthSession = { user: nextUser, token: nextToken };
    setUser(nextUser);
    setToken(nextToken);
    await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(session));
  };

  const login = async (email: string, password: string) => {
    try {
      const response = await api.post('/auth/login', { email, password });
      const payload = response.data as {
        user?: { id?: string; email?: string; user_metadata?: { name?: string } };
        token?: string;
      };

      const nextUser: AuthUser = {
        id: payload.user?.id,
        email: payload.user?.email ?? email,
        name: payload.user?.user_metadata?.name,
      };

      await persistSession(nextUser, payload.token ?? null);
    } catch (error) {
      console.log('Login error details:', error);
      if (axios.isAxiosError(error)) {
        console.log('Response status:', error.response?.status);
        console.log('Response data:', error.response?.data);
      }
      throw new Error(extractErrorMessage(error, 'Failed to log in'));
    }
  };

  const register = async (name: string, email: string, password: string) => {
    try {
      const response = await api.post('/auth/signup', { email, password });
      const payload = response.data as {
        user?: { id?: string; email?: string; user_metadata?: { name?: string } };
        session?: { access_token?: string } | null;
      };

      const nextUser: AuthUser = {
        id: payload.user?.id,
        email: payload.user?.email ?? email,
        name: payload.user?.user_metadata?.name ?? name,
      };

      const nextToken = payload.session?.access_token ?? null;

      if (!nextToken) {
        throw new Error('Account created. Please verify your email and then log in.');
      }

      await persistSession(nextUser, nextToken);
    } catch (error) {
      console.log('Register error details:', error);
      if (axios.isAxiosError(error)) {
        console.log('Response status:', error.response?.status);
        console.log('Response data:', error.response?.data);
      }
      throw new Error(extractErrorMessage(error, 'Failed to sign up'));
    }
  };

  const logout = async () => {
    setUser(null);
    setToken(null);
    await AsyncStorage.removeItem(STORAGE_KEY);
  };

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
    [isHydrated, token, user]
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
