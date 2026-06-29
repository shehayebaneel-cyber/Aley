import { useState } from "react";
import { Link } from "react-router-dom";
import { TopUpModal } from "../components/TopUpModal";
import { useUserAuth } from "../context/UserAuthContext";
import { useWallet } from "../lib/useWallet";
import { timeAgo } from "../lib/api";
import type { WalletEntry } from "../types";

const money = (n: number) => `${n < 0 ? "−" : ""}$${Math.abs(n).toFixed(2)}`;

const META: Record<string, { icon: string; label: string }> = {
  TOPUP: { icon: "⬆️", label: "Top-up" },
  REFUND: { icon: "↩️", label: "Refund" },
  BONUS: { icon: "🎁", label: "Bonus" },
  SPEND: { icon: "🛍️", label: "Payment" },
  ADJUSTMENT: { icon: "⚙️", label: "Adjustment" },
};

function Row({ e }: { e: WalletEntry }) {
  const m = META[e.type] ?? { icon: "•", label: e.type };
  const credit = e.amount >= 0;
  return (
    <div className="flex items-center gap-3 px-1 py-3">
      <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl surface-2 text-lg">{m.icon}</span>
      <div className="min-w-0 flex-1">
        <p className="truncate font-semibold text-ink">{e.description || m.label}</p>
        <p className="text-xs text-muted">{m.label}{e.status !== "COMPLETED" ? ` · ${e.status.toLowerCase()}` : ""} · {timeAgo(e.createdAt)}</p>
      </div>
      <span className={`shrink-0 font-bold ${credit ? "text-emerald-600" : "text-ink"}`}>{credit ? "+" : ""}{money(e.amount)}</span>
    </div>
  );
}

export function Wallet() {
  const { user, loading, openAuth } = useUserAuth();
  const { wallet, balance, reload, setWallet } = useWallet();
  const [topUp, setTopUp] = useState(false);

  if (loading) return <div className="mx-auto max-w-2xl px-4 py-16 text-muted">Loading…</div>;
  if (!user)
    return (
      <div className="mx-auto max-w-md px-4 py-24 text-center">
        <h1 className="font-display text-2xl font-extrabold text-ink">Your wallet</h1>
        <p className="mt-2 text-muted">Log in to load money and pay faster across Aley.</p>
        <button onClick={openAuth} className="btn btn-primary mt-6 px-6 py-3">Log in</button>
      </div>
    );

  const entries = wallet?.entries ?? [];

  return (
    <div className="mx-auto max-w-2xl px-4 py-8">
      <h1 className="font-display text-3xl font-extrabold text-ink">My Wallet</h1>
      <p className="mt-1 text-muted">Load money once, then pay for orders, bookings and vouchers in a tap.</p>

      {/* Balance card */}
      <div className="mt-6 overflow-hidden rounded-3xl bg-gradient-to-br from-brand to-brand-dark p-6 text-white shadow-lg">
        <p className="text-sm font-medium text-white/80">Wallet balance</p>
        <p className="mt-1 font-display text-4xl font-extrabold">${balance.toFixed(2)}</p>
        <div className="mt-5 flex items-center gap-2">
          <button onClick={() => setTopUp(true)} className="rounded-full bg-white px-5 py-2.5 text-sm font-bold text-brand-dark transition hover:bg-white/90">+ Add money</button>
          <Link to="/explore" className="rounded-full bg-white/15 px-5 py-2.5 text-sm font-bold text-white transition hover:bg-white/25">Spend it</Link>
        </div>
      </div>

      {/* Lifetime stats */}
      {wallet && (
        <div className="mt-4 grid grid-cols-2 gap-3">
          <div className="card p-4"><p className="text-xs text-muted">Loaded all-time</p><p className="mt-0.5 font-display text-xl font-extrabold text-ink">${wallet.toppedUp.toFixed(2)}</p></div>
          <div className="card p-4"><p className="text-xs text-muted">Spent all-time</p><p className="mt-0.5 font-display text-xl font-extrabold text-ink">${wallet.spent.toFixed(2)}</p></div>
        </div>
      )}

      {/* History */}
      <h2 className="mt-8 font-display text-lg font-extrabold text-ink">Activity</h2>
      <div className="card mt-3 divide-y divide-border px-4">
        {entries.length === 0 ? (
          <p className="py-10 text-center text-sm text-muted">No activity yet. Add money to get started.</p>
        ) : (
          entries.map((e) => <Row key={e.id} e={e} />)
        )}
      </div>

      <p className="mt-4 text-center text-xs text-muted">💳 Demo mode — no real money is charged. A real payment gateway can be connected later.</p>

      {topUp && (
        <TopUpModal
          balance={balance}
          onClose={() => setTopUp(false)}
          onDone={(w) => { setWallet(w); setTopUp(false); reload(); }}
        />
      )}
    </div>
  );
}
