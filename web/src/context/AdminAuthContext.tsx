import { createContext, ReactNode, useContext, useMemo, useState } from "react";
import { adminApi, getAdminToken, setAdminToken } from "../lib/api";

interface AdminAuthValue {
  isAuthed: boolean;
  name: string;
  login: (email: string, password: string) => Promise<void>;
  logout: () => void;
}

const AdminAuthContext = createContext<AdminAuthValue | null>(null);

export function AdminAuthProvider({ children }: { children: ReactNode }) {
  const [token, setToken] = useState<string | null>(getAdminToken());
  const [name, setName] = useState("Admin");

  const value = useMemo<AdminAuthValue>(
    () => ({
      isAuthed: Boolean(token),
      name,
      login: async (email, password) => {
        const res = await adminApi.post<{ token: string; name: string }>("/api/auth/admin/login", { email, password });
        setAdminToken(res.token);
        setToken(res.token);
        setName(res.name);
      },
      logout: () => {
        setAdminToken(null);
        setToken(null);
      },
    }),
    [token, name]
  );

  return <AdminAuthContext.Provider value={value}>{children}</AdminAuthContext.Provider>;
}

export function useAdminAuth() {
  const ctx = useContext(AdminAuthContext);
  if (!ctx) throw new Error("useAdminAuth must be used inside AdminAuthProvider");
  return ctx;
}
