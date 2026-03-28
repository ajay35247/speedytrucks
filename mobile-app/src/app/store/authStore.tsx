import React, { createContext, useContext, useEffect, useMemo, useState } from 'react';
import type { AuthUser, UserRole } from '../../constants/types';
import { Api } from '../../services/api';
import { clearStoredAuth, getStoredAuth, setStoredAuth } from '../../services/storage';
import { connectSocket, disconnectSocket } from '../../services/socket';

type AuthContextValue = {
  user: AuthUser | null;
  isBootstrapping: boolean;
  signIn: (user: AuthUser) => Promise<void>;
  signOut: () => Promise<void>;
  switchRole: (role: UserRole) => Promise<void>;
  refreshProfile: () => Promise<void>;
  updateTokens: (tokens: { token: string; refreshToken: string }) => Promise<void>;
};

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function AuthBootstrap({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [isBootstrapping, setBootstrapping] = useState(true);

  useEffect(() => {
    getStoredAuth()
      .then((stored) => { setUser(stored); if (stored?.token) connectSocket(stored.token); })
      .finally(() => setBootstrapping(false));
  }, []);

  const value = useMemo<AuthContextValue>(
    () => ({
      user,
      isBootstrapping,
      signIn: async (nextUser) => {
        setUser(nextUser);
        connectSocket(nextUser.token);
        await setStoredAuth(nextUser);
      },
      signOut: async () => {
        try {
          if (user?.token) await Api.logout(user.token, user.refreshToken);
        } catch {
          try {
            if (user?.token) await Api.logoutAll(user.token);
          } catch {
            // ignore logout transport errors and clear device session anyway
          }
        }
        disconnectSocket();
        setUser(null);
        await clearStoredAuth();
      },
      switchRole: async (role) => {
        if (!user) return;
        const updated = { ...user, role };
        setUser(updated);
        connectSocket(updated.token);
        await setStoredAuth(updated);
      },
      refreshProfile: async () => {
        if (!user?.token) return;
        const { user: latest } = await Api.profile(user.token);
        const merged = { ...user, ...latest };
        setUser(merged);
        await setStoredAuth(merged);
      },
      updateTokens: async (tokens) => {
        if (!user) return;
        const updated = { ...user, ...tokens };
        setUser(updated);
        connectSocket(updated.token);
        await setStoredAuth(updated);
      },
    }),
    [user, isBootstrapping]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuthStore() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuthStore must be used within AuthBootstrap');
  return ctx;
}
