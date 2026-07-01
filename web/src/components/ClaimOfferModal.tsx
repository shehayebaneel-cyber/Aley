import { FormEvent, useState } from "react";
import { Link } from "react-router-dom";
import { CheckIcon, CloseIcon } from "./icons";
import { QRCode, redeemOfferUrl } from "./QRCode";
import { offerEmoji } from "./OfferCard";
import { useUserAuth } from "../context/UserAuthContext";
import { api, userApi } from "../lib/api";
import type { Offer } from "../types";

/** Claim/redeem an offer → shows a unique code + QR the customer presents in-store. */
export function ClaimOfferModal({ offer, onClose }: { offer: Offer; onClose: () => void }) {
  const { user } = useUserAuth();
  const [form, setForm] = useState({ name: user?.name ?? "", phone: "" });
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");
  const [done, setDone] = useState<{ code: string } | null>(null);

  async function claim(e: FormEvent) {
    e.preventDefault();
    if (busy) return;
    if (!user && !form.name.trim()) return setErr("Please enter your name.");
    setBusy(true); setErr("");
    const client = user ? userApi : api;
    try {
      const r = await client.post<{ code: string }>(`/api/offers/${offer.id}/claim`, { customerName: form.name, customerPhone: form.phone });
      setDone({ code: r.code });
    } catch (e2) {
      setErr(e2 instanceof Error ? e2.message : "Couldn't claim this offer.");
      setBusy(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/50 p-0 backdrop-blur-sm sm:items-center sm:p-4" onClick={onClose}>
      <div className="card pop-in max-h-[92vh] w-full max-w-md overflow-y-auto rounded-b-none p-6 sm:rounded-3xl" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between">
          <h2 className="font-display text-xl font-extrabold text-ink">{offerEmoji(offer.type)} Claim offer</h2>
          <button onClick={onClose} aria-label="Close" className="text-muted hover:text-ink"><CloseIcon /></button>
        </div>

        {done ? (
          <div className="mt-5 text-center">
            <span className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-emerald-500/15 text-emerald-600"><CheckIcon className="h-7 w-7" /></span>
            <p className="mt-3 font-display text-lg font-bold text-ink">Offer claimed! 🎉</p>
            <p className="mt-1 text-sm text-muted">Show this code at {offer.business?.name ?? "the business"} to redeem.</p>
            <div className="mt-4 flex flex-col items-center">
              <QRCode value={redeemOfferUrl(done.code)} size={150} />
              <p className="mt-2 text-xs text-muted">Your code</p>
              <p className="font-mono text-lg font-bold tracking-wider text-ink">{done.code}</p>
            </div>
            {offer.redeemInfo && <p className="mx-auto mt-3 max-w-xs rounded-xl surface-2 p-3 text-xs text-muted">{offer.redeemInfo}</p>}
            <Link to="/my-offers" onClick={onClose} className="btn btn-ghost mt-4 px-4 py-2 text-sm">View in My Offers</Link>
            <button onClick={onClose} className="btn btn-primary mt-2 w-full py-2.5">Done</button>
          </div>
        ) : (
          <form onSubmit={claim} className="mt-4 space-y-3">
            <div className="rounded-2xl surface-2 p-4">
              <span className="inline-flex items-center gap-1 rounded-lg bg-accent px-2.5 py-1 text-sm font-extrabold text-white">{offer.badge}</span>
              <p className="mt-2 font-display text-lg font-bold text-ink">{offer.title}</p>
              {offer.business && <p className="text-sm text-muted">{offer.business.name}</p>}
            </div>
            {!user && (
              <>
                <input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required placeholder="Your name" className="input" />
                <input value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} placeholder="Phone (optional)" className="input" />
              </>
            )}
            {offer.terms && <p className="rounded-xl border border-border p-3 text-xs text-muted"><span className="font-semibold text-ink">Terms:</span> {offer.terms}</p>}
            {err && <p className="rounded-lg bg-red-500/10 px-3 py-2 text-sm font-medium text-red-500">{err}</p>}
            <button type="submit" disabled={busy} className="btn btn-primary w-full py-3 disabled:opacity-60">{busy ? "Claiming…" : "Claim this offer"}</button>
            {!user && <p className="text-center text-xs text-muted">Tip: <button type="button" onClick={() => { onClose(); }} className="font-semibold text-brand">log in</button> to keep all your claimed deals in one place.</p>}
          </form>
        )}
      </div>
    </div>
  );
}
