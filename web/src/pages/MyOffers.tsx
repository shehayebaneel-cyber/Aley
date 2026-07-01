import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { OfferCard, offerEmoji } from "../components/OfferCard";
import { QRCode, redeemOfferUrl } from "../components/QRCode";
import { useUserAuth } from "../context/UserAuthContext";
import { userApi } from "../lib/api";
import type { ClaimedOffer, Offer } from "../types";

const STATUS_BADGE: Record<string, string> = {
  CLAIMED: "bg-emerald-500/15 text-emerald-600",
  REDEEMED: "bg-brand-soft text-brand-dark",
  EXPIRED: "bg-surface-2 text-muted",
  CANCELLED: "bg-red-500/15 text-red-500",
};

export function MyOffers() {
  const { user, loading, openAuth } = useUserAuth();
  const [data, setData] = useState<{ saved: Offer[]; claimed: ClaimedOffer[] } | null>(null);
  const [tab, setTab] = useState<"claimed" | "saved">("claimed");
  const [qr, setQr] = useState<string | null>(null);

  useEffect(() => {
    if (user) userApi.get<{ saved: Offer[]; claimed: ClaimedOffer[] }>("/api/me/offers").then(setData).catch(() => setData({ saved: [], claimed: [] }));
  }, [user]);

  if (loading) return <div className="mx-auto max-w-3xl px-4 py-16 text-muted">Loading…</div>;
  if (!user)
    return (
      <div className="mx-auto max-w-md px-4 py-24 text-center">
        <h1 className="font-display text-2xl font-extrabold text-ink">My offers</h1>
        <p className="mt-2 text-muted">Log in to see your claimed deals and saved offers.</p>
        <button onClick={openAuth} className="btn btn-primary mt-6 px-6 py-3">Log in</button>
      </div>
    );

  const claimed = data?.claimed ?? [];
  const saved = data?.saved ?? [];

  return (
    <div className="mx-auto max-w-3xl px-4 py-8">
      <h1 className="font-display text-3xl font-extrabold text-ink">My Offers</h1>

      <div className="mt-5 flex gap-2">
        <button onClick={() => setTab("claimed")} className={`chip ${tab === "claimed" ? "chip-active" : ""}`}>Claimed ({claimed.length})</button>
        <button onClick={() => setTab("saved")} className={`chip ${tab === "saved" ? "chip-active" : ""}`}>Saved ({saved.length})</button>
      </div>

      {tab === "claimed" ? (
        claimed.length === 0 ? (
          <div className="card mt-6 p-12 text-center text-muted">No claimed offers yet. <Link to="/offers" className="font-semibold text-brand">Browse deals →</Link></div>
        ) : (
          <div className="mt-6 space-y-3">
            {claimed.map((c) => (
              <div key={c.code} className="card p-4">
                <div className="flex items-center gap-3">
                  {c.offer?.image ? <img src={c.offer.image} alt="" className="h-14 w-14 rounded-xl object-cover" /> : <span className="flex h-14 w-14 items-center justify-center rounded-xl surface-2 text-2xl">{offerEmoji(c.offer?.type ?? "")}</span>}
                  <div className="min-w-0 flex-1">
                    {c.offer ? <Link to={`/offer/${c.offer.id}`} className="font-display font-bold text-ink hover:text-brand">{c.offer.title}</Link> : <span className="font-display font-bold text-ink">Offer</span>}
                    <p className="text-sm text-muted">{c.offer?.business?.name}</p>
                    <p className="mt-0.5 font-mono text-sm font-semibold text-ink">{c.code}</p>
                  </div>
                  <span className={`shrink-0 rounded-full px-2.5 py-1 text-xs font-bold ${STATUS_BADGE[c.status]}`}>{c.status}</span>
                </div>
                {c.status === "CLAIMED" && (
                  <div className="mt-3 flex items-center gap-3 rounded-xl surface-2 p-3">
                    <button onClick={() => setQr(qr === c.code ? null : c.code)} className="btn btn-ghost px-3 py-1.5 text-xs">{qr === c.code ? "Hide QR" : "Show QR"}</button>
                    <p className="text-xs text-muted">Show this code at {c.offer?.business?.name ?? "the business"} to redeem.</p>
                  </div>
                )}
                {qr === c.code && (
                  <div className="mt-3 flex justify-center"><QRCode value={redeemOfferUrl(c.code)} size={150} /></div>
                )}
              </div>
            ))}
          </div>
        )
      ) : saved.length === 0 ? (
        <div className="card mt-6 p-12 text-center text-muted">No saved offers yet. <Link to="/offers" className="font-semibold text-brand">Find deals to save →</Link></div>
      ) : (
        <div className="mt-6 grid gap-5 sm:grid-cols-2">{saved.map((o) => <OfferCard key={o.id} offer={o} />)}</div>
      )}
    </div>
  );
}
