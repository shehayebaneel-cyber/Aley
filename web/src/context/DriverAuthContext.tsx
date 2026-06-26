import { createContext, ReactNode, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { driverApi, getDriverToken, setDriverToken } from "../lib/api";

export interface Driver {
  id: number;
  name: string;
  email: string | null;
  phone: string;
  vehicle: string;
  status: "PENDING" | "ACTIVE" | "SUSPENDED";
  commissionRate: number;
}
export interface DriverStats {
  active: number;
  delivered: number;
  total: number;
  commissionPct: number;
  earnings: number;
}

interface DriverAuthValue {
  driver: Driver | null;
  stats: DriverStats | null;
  loading: boolean;
  login: (login: string, password: string) => Promise<void>;
  register: (data: { name: string; phone: string; email?: string; password: string; vehicle?: string }) => Promise<void>;
  logout: () => void;
  refresh: () => Promise<void>;
}

const DriverAuthContext = createContext<DriverAuthValue | null>(null);

export function DriverAuthProvider({ children }: { children: ReactNode }) {
  const [driver, setDriver] = useState<Driver | null>(null);
  const [stats, setStats] = useState<DriverStats | null>(null);
  const [loading, setLoading] = useState(() => Boolean(getDriverToken()));

  const refresh = useCallback(async () => {
    if (!getDriverToken()) return;
    try {
      const data = await driverApi.get<{ driver: Driver; stats: DriverStats }>("/api/driver/me");
      setDriver(data.driver);
      setStats(data.stats);
    } catch {
      setDriverToken(null);
      setDriver(null);
      setStats(null);
    }
  }, []);

  useEffect(() => {
    (async () => {
      await refresh();
      setLoading(false);
    })();
  }, [refresh]);

  const value = useMemo<DriverAuthValue>(
    () => ({
      driver,
      stats,
      loading,
      login: async (login, password) => {
        const res = await driverApi.post<{ token: string; driver: Driver }>("/api/auth/driver/login", { login, password });
        setDriverToken(res.token);
        setDriver(res.driver);
        await refresh();
      },
      register: async (data) => {
        const res = await driverApi.post<{ token: string; driver: Driver }>("/api/auth/driver/register", data);
        setDriverToken(res.token);
        setDriver(res.driver);
        await refresh();
      },
      logout: () => {
        setDriverToken(null);
        setDriver(null);
        setStats(null);
      },
      refresh,
    }),
    [driver, stats, loading, refresh]
  );

  return <DriverAuthContext.Provider value={value}>{children}</DriverAuthContext.Provider>;
}

export function useDriverAuth() {
  const ctx = useContext(DriverAuthContext);
  if (!ctx) throw new Error("useDriverAuth must be used inside DriverAuthProvider");
  return ctx;
}
