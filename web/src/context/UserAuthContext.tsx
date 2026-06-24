import { createContext, ReactNode, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { AuthModal } from "../components/AuthModal";
import { getUserToken, setUserToken, userApi } from "../lib/api";

export interface User {
  id: number;
  name: string;
  email: string | null;
  avatar: string | null;
}

interface UserAuthValue {
  user: User | null;
  favoriteIds: Set<number>;
  loading: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (data: { name: string; email: string; password: string }) => Promise<void>;
  logout: () => void;
  isFavorite: (businessId: number) => boolean;
  toggleFavorite: (businessId: number) => Promise<void>;
  openAuth: () => void;
}

const UserAuthContext = createContext<UserAuthValue | null>(null);

export function UserAuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [favoriteIds, setFavoriteIds] = useState<Set<number>>(new Set());
  const [loading, setLoading] = useState(() => Boolean(getUserToken()));
  const [authOpen, setAuthOpen] = useState(false);

  const refresh = useCallback(async () => {
    if (!getUserToken()) return;
    try {
      const data = await userApi.get<{ user: User; favoriteIds: number[] }>("/api/me");
      setUser(data.user);
      setFavoriteIds(new Set(data.favoriteIds));
    } catch {
      setUserToken(null);
      setUser(null);
      setFavoriteIds(new Set());
    }
  }, []);

  useEffect(() => {
    (async () => {
      await refresh();
      setLoading(false);
    })();
  }, [refresh]);

  const value = useMemo<UserAuthValue>(
    () => ({
      user,
      favoriteIds,
      loading,
      login: async (email, password) => {
        const res = await userApi.post<{ token: string; user: User }>("/api/auth/user/login", { email, password });
        setUserToken(res.token);
        setUser(res.user);
        await refresh();
      },
      register: async (data) => {
        const res = await userApi.post<{ token: string; user: User }>("/api/auth/user/register", data);
        setUserToken(res.token);
        setUser(res.user);
        await refresh();
      },
      logout: () => {
        setUserToken(null);
        setUser(null);
        setFavoriteIds(new Set());
      },
      isFavorite: (id) => favoriteIds.has(id),
      toggleFavorite: async (id) => {
        if (!getUserToken()) {
          setAuthOpen(true);
          return;
        }
        const has = favoriteIds.has(id);
        // Optimistic update.
        setFavoriteIds((prev) => {
          const next = new Set(prev);
          has ? next.delete(id) : next.add(id);
          return next;
        });
        try {
          if (has) await userApi.delete(`/api/me/favorites/${id}`);
          else await userApi.post(`/api/me/favorites/${id}`, {});
        } catch {
          refresh();
        }
      },
      openAuth: () => setAuthOpen(true),
    }),
    [user, favoriteIds, loading, refresh]
  );

  return (
    <UserAuthContext.Provider value={value}>
      {children}
      <AuthModal open={authOpen} onClose={() => setAuthOpen(false)} onLogin={value.login} onRegister={value.register} />
    </UserAuthContext.Provider>
  );
}

export function useUserAuth() {
  const ctx = useContext(UserAuthContext);
  if (!ctx) throw new Error("useUserAuth must be used inside UserAuthProvider");
  return ctx;
}
