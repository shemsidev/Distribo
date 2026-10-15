import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import { useQueryClient } from '@tanstack/react-query';

import { lastRefreshedUser, onSessionExpired, refreshSession, storeSession } from '@/services/api/client';
import { authApi } from '@/services/api/endpoints';
import { tokenStorage } from '@/services/auth/tokenStorage';
import { unregisterPushToken } from '@/services/notifications/push';
import type { Me, RegisterRequest, RegisterResponse } from '@/types/api';

type Status = 'loading' | 'signedOut' | 'signedIn';

interface SessionContextValue {
  status: Status;
  user: Me | null;
  signIn: (identifier: string, password: string) => Promise<void>;
  register: (data: RegisterRequest) => Promise<RegisterResponse>;
  signOut: () => Promise<void>;
  setUser: (user: Me) => void;
}

const SessionContext = createContext<SessionContextValue | null>(null);

export function SessionProvider({ children }: { children: ReactNode }) {
  const [status, setStatus] = useState<Status>('loading');
  const [user, setUserState] = useState<Me | null>(null);
  const queryClient = useQueryClient();

  const clearLocal = useCallback(async () => {
    await tokenStorage.clear();
    queryClient.clear();
    setUserState(null);
    setStatus('signedOut');
  }, [queryClient]);

  // Rikthe sesionin në nisje: refresh token-i (SecureStore ose cookie në web) jep access token të ri.
  useEffect(() => {
    let cancelled = false;
    refreshSession().then((ok) => {
      if (cancelled) return;
      if (ok && lastRefreshedUser) {
        setUserState(lastRefreshedUser);
        setStatus('signedIn');
      } else {
        setStatus('signedOut');
      }
    });
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => onSessionExpired(() => void clearLocal()), [clearLocal]);

  const signIn = useCallback(async (identifier: string, password: string) => {
    const session = await authApi.login(identifier, password);
    await storeSession(session);
    setUserState(session.user);
    setStatus('signedIn');
    // Çmimet ndryshojnë pas identifikimit (çmimet e klientit në vend të atyre bazë).
    void queryClient.resetQueries();
  }, [queryClient]);

  const register = useCallback(async (data: RegisterRequest) => {
    const result = await authApi.register(data);
    if (result.session) {
      await storeSession(result.session);
      setUserState(result.session.user);
      setStatus('signedIn');
      void queryClient.resetQueries();
    }
    return result;
  }, [queryClient]);

  const signOut = useCallback(async () => {
    try {
      await unregisterPushToken();
      await authApi.logout(await tokenStorage.getRefreshToken());
    } catch {
      // Dalja lokale vazhdon edhe pa internet; token-i skadon vetë në server.
    }
    await clearLocal();
  }, [clearLocal]);

  const value = useMemo(
    () => ({ status, user, signIn, register, signOut, setUser: setUserState }),
    [status, user, signIn, register, signOut],
  );

  return <SessionContext.Provider value={value}>{children}</SessionContext.Provider>;
}

export function useSession(): SessionContextValue {
  const ctx = useContext(SessionContext);
  if (!ctx) throw new Error('useSession duhet të përdoret brenda <SessionProvider>.');
  return ctx;
}
