import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { QRCode, redeemUrl } from "../components/QRCode";
import { useUserAuth } from "../context/UserAuthContext";
import { userApi } from "../lib/api";
import type { Voucher } from "../types";

const money = (n: number) => `$${Number.isInteger(n) ? n : n.toFixed(2)}`;
const STATUS: Record<string, string> = { ACTIVE: "bg-emerald-500/15 text-emerald-600", PENDING_DELIVERY: "bg-amber-400/15 text-amber-600", REDEEMED: "bg-surface-2 text-muted", EXPIRED: "bg-red-500/15 text-red-500", DISABLED: "bg-red-500/15 text-red-500" };

export function GiftVouchers() {
  const { user, loading, openAuth } = useUserAuth();
  const [items, setItems] = useState<Voucher[] | null>(null);
  const [qr, setQr] = useState<string | null>(null);

  useEffect(() => { if (user) userApi.get<Voucher[]>("/api/me/vouchers").then(setItems).catch(() => setItems([])); }, [user]);

  if (loading) return <div className="mx-auto max-w-3xl px-4 py-16 text-muted">Loading…</div>;
  if (!user)
    return (
      <div className="mx-auto max-w-md px-4 py-24 text-center">
        <h1 className="font-display text-2xl font-extrabold text-ink">Your gift vouchers</h1>
        <p className="mt-2 text-muted">Log in to see vouchers you've bought or received.</p>
        <button onClick={openAuth} className="btn btn-primary mt-6 px-6 py-3">Log in</button>
      </div>
    );

  return (
    <div className="mx-auto max-w-3xl px-4 py-8">
      <h1 className="font-display text-3xl font-extrabold text-ink">My gift vouchers</h1>
      {items && items.length === 0 && <div className="card mt-6 p-12 text-center text-muted">No vouchers yet. <Link to="/explore" className="font-semibold text-brand">Browse businesses →</Link></div>}
      <div className="mt-6 space-y-3">
        {(items ?? []).map((v) => (
          <div key={v.code} className="card p-4">
            <div className="flex items-center gap-3">
              {v.business?.logo ? <img src={v.business.logo} alt="" className="h-11 w-11 rounded-xl object-cover" /> : <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-brand-soft">🎁</span>}
              <div className="min-w-0 flex-1">
                {v.business ? <Link to={`/business/${v.business.slug}`} className="font-display font-bold text-ink hover:text-brand">{v.business.name}</Link> : <span className="font-display font-bold text-ink">Gift voucher</span>}
                <p className="text-sm text-muted">{v.title}{v.mine ? "" : " · received"}</p>
                <p className="text-sm font-semibold text-ink">{v.kind === "FIXED" ? `${money(v.balance)} left of ${money(v.value)}` : v.title}</p>
              </div>
              <span className={`rounded-full px-2.5 py-1 text-xs font-bold ${STATUS[v.status] ?? "bg-surface-2 text-muted"}`}>{v.status.replace("_", " ")}</span>
            </div>
            <div className="mt-2 flex flex-wrap items-center gap-2">
              <span className="font-mono text-sm font-semibold text-ink">{v.code}</span>
              <Link to={`/voucher/${v.code}`} className="btn btn-ghost px-3 py-1.5 text-xs">Open voucher</Link>
              {v.status === "ACTIVE" && <button onClick={() => setQr(qr === v.code ? null : v.code)} className="btn btn-ghost px-3 py-1.5 text-xs">{qr === v.code ? "Hide QR" : "Show QR"}</button>}
              {v.expiresAt && <span className="text-xs text-muted">expires {new Date(v.expiresAt).toLocaleDateString()}</span>}
            </div>
            {qr === v.code && <div className="mt-2 flex items-center gap-3 rounded-xl surface-2 p-3"><QRCode value={redeemUrl(v.code)} size={110} /><p className="text-xs text-muted">Show this at the business to redeem.</p></div>}
          </div>
        ))}
      </div>
    </div>
  );
}
