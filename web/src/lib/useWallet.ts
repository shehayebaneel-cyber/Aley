import { useCallback, useEffect, useState } from "react";
import { useUserAuth } from "../context/UserAuthContext";
import { userApi } from "./api";
import type { WalletSummary } from "../types";

/** Loads the signed-in customer's wallet (balance + history). Returns null when logged out. */
export function useWallet() {
  const { user } = useUserAuth();
  const [wallet, setWallet] = useState<WalletSummary | null>(null);
  const [loading, setLoading] = useState(false);

  const reload = useCallback(() => {
    if (!user) { setWallet(null); return Promise.resolve(); }
    setLoading(true);
    return userApi.get<WalletSummary>("/api/me/wallet").then(setWallet).catch(() => {}).finally(() => setLoading(false));
  }, [user]);

  useEffect(() => { reload(); }, [reload]);

  return { wallet, balance: wallet?.balance ?? 0, loading, reload, setWallet };
}
