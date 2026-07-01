import { useState } from "react";
import { Link, useParams } from "react-router-dom";
import { CheckIcon } from "../components/icons";
import { useUserAuth } from "../context/UserAuthContext";
import { userApi } from "../lib/api";
import { useFetch } from "../lib/useFetch";
import { useTitle } from "../lib/useTitle";
import type { PlatformCardView as CardT } from "../types";

const money = (n: number) => `$${Number.isInteger(n) ? n : n.toFixed(2)}`;
const STATUS: Record<string, string> = { ACTIVE: "bg-emerald-500/15 text-emerald-600", PENDING_DELIVERY: "bg-amber-400/15 text-amber-600", REDEEMED: "bg-surface-2 text-muted", EXPIRED: "bg-red-500/15 text-red-500", DISABLED: "bg-red-500/15 text-red-500", REFUNDED: "bg-red-500/15 text-red-500" };

export function PlatformCardView() {
  const { code } = useParams();
  const { user, openAuth } = useUserAuth();
  const { data: c, loading, error } = useFetch<CardT>(code ? `/api/platform-cards/view/${code}` : null);
  useTitle("Platform gift card");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");
  const [redeemed, setRedeemed] = useState<number | null>(null);

  async function redeem() {
    if (busy || !c) return;
    if (!user) return openAuth();
    setBusy(true); setErr("");
    try {
      const r = await userApi.post<{ amount: number }>("/api/platform-cards/redeem", { code: c.code });
      setRedeemed(r.amount);
    } catch (e2) {
      setErr(e2 instanceof Error ? e2.message : "Couldn't redeem this gift card.");
    } finally { setBusy(false); }
  }

  if (loading) return <div className="mx-auto max-w-md px-4 py-20"><div className="card h-96 animate-pulse" /></div>;
  if (error || !c) return <div className="mx-auto max-w-md px-4 py-24 text-center"><p className="text-lg font-semibold text-ink">Gift card not found.</p><Link to="/" className="mt-3 inline-block font-semibold text-brand">← Home</Link></div>;

  if (redeemed !== null) {
    return (
      <div className="mx-auto max-w-md px-4 py-16 text-center">
        <span className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-emerald-500/15 text-emerald-600"><CheckIcon className="h-8 w-8" /></span>
        <h1 className="mt-4 font-display text-2xl font-extrabold text-ink">{money(redeemed)} added to your wallet! 🎉</h1>
        <p className="mt-1 text-muted">Spend it at any participating business across Lebanon.</p>
        <div className="mt-6 flex flex-col gap-2">
          <Link to="/wallet" className="btn btn-primary py-3">Go to my wallet</Link>
          <Link to="/explore" className="btn btn-ghost py-2.5 text-sm">Start spending →</Link>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-md px-4 py-10">
      <div className={`overflow-hidden rounded-3xl bg-gradient-to-br ${c.gradient} p-7 text-center text-white shadow-lg`}>
        <span className="text-5xl">{c.emoji}</span>
        <p className="mt-3 text-sm font-medium uppercase tracking-wide text-white/80">Platform Gift Card</p>
        <p className="mt-1 font-display text-5xl font-extrabold">{money(c.amount)}</p>
        {c.recipientName && <p className="mt-1 text-white/85">For {c.recipientName}</p>}
        {c.message && <p className="mx-auto mt-4 max-w-xs rounded-xl bg-white/15 p-3 text-sm italic">“{c.message}”</p>}
      </div>

      <div className="card mt-4 p-6 text-center">
        <span className={`inline-block rounded-full px-3 py-1 text-xs font-bold ${STATUS[c.status] ?? "bg-surface-2 text-muted"}`}>{c.status.replace("_", " ")}</span>
        <p className="mt-3 font-mono text-lg font-bold text-ink">{c.code}</p>

        {c.redeemable ? (
          <>
            <button onClick={redeem} disabled={busy} className="btn btn-primary mt-4 w-full py-3 disabled:opacity-60">{busy ? "Redeeming…" : user ? `Add ${money(c.amount)} to my wallet` : "Log in to claim your gift"}</button>
            <p className="mt-2 text-xs text-muted">The credit lands in your Aley wallet — spend it at any participating business across Lebanon.</p>
          </>
        ) : c.status === "PENDING_DELIVERY" ? (
          <p className="mt-4 text-sm text-muted">This gift isn't active yet{c.deliverAt ? ` — it unlocks on ${new Date(c.deliverAt).toLocaleDateString()}` : ""}. Check back then to claim it.</p>
        ) : c.status === "REDEEMED" ? (
          <p className="mt-4 text-sm text-muted">This gift card has already been redeemed. <Link to="/wallet" className="font-semibold text-brand">View your wallet →</Link></p>
        ) : (
          <p className="mt-4 text-sm text-muted">This gift card is no longer available.</p>
        )}
        {err && <p className="mt-3 rounded-lg bg-red-500/10 px-3 py-2 text-sm font-medium text-red-500">{err}</p>}
        {c.expiresAt && c.redeemable && <p className="mt-3 text-xs text-muted">Redeem by {new Date(c.expiresAt).toLocaleDateString()}</p>}
      </div>
    </div>
  );
}
