import { createContext, ReactNode, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { getOwnerToken, ownerApi, setOwnerToken } from "../lib/api";
import type { Business } from "../types";

export interface Owner {
  id: number;
  name: string;
  email: string;
  phone: string;
}

interface OwnerBusiness extends Business {
  _count?: { reviews: number; offers: number; events: number };
}

interface OwnerAuthValue {
  owner: Owner | null;
  businesses: OwnerBusiness[];
  loading: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (data: { name: string; email: string; password: string; phone?: string }) => Promise<void>;
  logout: () => void;
  refresh: () => Promise<void>;
}

const OwnerAuthContext = createContext<OwnerAuthValue | null>(null);

export function OwnerAuthProvider({ children }: { children: ReactNode }) {
  const [owner, setOwner] = useState<Owner | null>(null);
  const [businesses, setBusinesses] = useState<OwnerBusiness[]>([]);
  const [loading, setLoading] = useState(() => Boolean(getOwnerToken()));

  const refresh = useCallback(async () => {
    if (!getOwnerToken()) return;
    try {
      const data = await ownerApi.get<{ owner: Owner; businesses: OwnerBusiness[] }>("/api/owner/me");
      setOwner(data.owner);
      setBusinesses(data.businesses);
    } catch {
      setOwnerToken(null);
      setOwner(null);
      setBusinesses([]);
    }
  }, []);

  useEffect(() => {
    (async () => {
      await refresh();
      setLoading(false);
    })();
  }, [refresh]);

  const value = useMemo<OwnerAuthValue>(
    () => ({
      owner,
      businesses,
      loading,
      login: async (email, password) => {
        const res = await ownerApi.post<{ token: string; owner: Owner }>("/api/auth/owner/login", { email, password });
        setOwnerToken(res.token);
        setOwner(res.owner);
        await refresh();
      },
      register: async (data) => {
        const res = await ownerApi.post<{ token: string; owner: Owner }>("/api/auth/owner/register", data);
        setOwnerToken(res.token);
        setOwner(res.owner);
        await refresh();
      },
      logout: () => {
        setOwnerToken(null);
        setOwner(null);
        setBusinesses([]);
      },
      refresh,
    }),
    [owner, businesses, loading, refresh]
  );

  return <OwnerAuthContext.Provider value={value}>{children}</OwnerAuthContext.Provider>;
}

export function useOwnerAuth() {
  const ctx = useContext(OwnerAuthContext);
  if (!ctx) throw new Error("useOwnerAuth must be used inside OwnerAuthProvider");
  return ctx;
}
