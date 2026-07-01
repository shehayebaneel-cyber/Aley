import { FormEvent, useState } from "react";
import { Link } from "react-router-dom";
import { CheckIcon, CloseIcon } from "./icons";
import { QRCode } from "./QRCode";
import { TopUpModal } from "./TopUpModal";
import { useUserAuth } from "../context/UserAuthContext";
import { api, userApi } from "../lib/api";
import { useWallet } from "../lib/useWallet";
import type { EventDetailT, EventTicketOption } from "../types";

const money = (n: number) => `$${Number.isInteger(n) ? n : n.toFixed(2)}`;
const KIND_BADGE: Record<string, string> = { VIP: "👑 VIP", EARLY_BIRD: "🐤 Early bird", STUDENT: "🎓 Student", FAMILY: "👨‍👩‍👧 Family", GENERAL: "🎟️ General", FREE: "Free" };

export function BookTicketModal({ event, onClose }: { event: EventDetailT; onClose: () => void }) {
  const { user } = useUserAuth();
  const { balance: walletBalance, reload: reloadWallet } = useWallet();
  const tickets = (event.ticketTypes ?? []).filter((t) => !t.soldOut);
  const paidEvent = tickets.some((t) => t.price > 0);
  const [tt, setTt] = useState<EventTicketOption | null>(tickets[0] ?? null);
  const [qty, setQty] = useState(1);
  const [method, setMethod] = useState("CARD");
  const [form, setForm] = useState({ name: user?.name ?? "", phone: "", email: user?.email ?? "" });
  const [topUp, setTopUp] = useState(false);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");
  const [done, setDone] = useState<{ code: string } | null>(null);

  const unit = tt?.price ?? 0;
  const total = unit * qty;
  const paid = total > 0;
  const walletShort = paid && method === "WALLET" && walletBalance < total;

  async function submit(e: FormEvent) {
    e.preventDefault();
    if (busy) return;
    if (!user && !form.name.trim()) return setErr("Please enter your name.");
    if (walletShort) return setErr("Your wallet balance is too low. Add money or pick another method.");
    setBusy(true); setErr("");
    const client = user ? userApi : api;
    try {
      const r = await client.post<{ code: string }>(`/api/events/${event.id}/book`, {
        ticketTypeId: tt?.id ?? null, quantity: qty,
        customerName: form.name, customerPhone: form.phone, customerEmail: form.email,
        paymentMethod: paid ? method : undefined,
      });
      setDone({ code: r.code });
    } catch (e2) {
      setErr(e2 instanceof Error ? e2.message : "Couldn't complete the booking.");
      setBusy(false);
    }
  }

  return (
    <>
      <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/50 p-0 backdrop-blur-sm sm:items-center sm:p-4" onClick={onClose}>
        <div className="card pop-in max-h-[92vh] w-full max-w-md overflow-y-auto rounded-b-none p-6 sm:rounded-3xl" onClick={(e) => e.stopPropagation()}>
          <div className="flex items-center justify-between">
            <h2 className="font-display text-xl font-extrabold text-ink">{paidEvent ? "🎟️ Get tickets" : "✅ Reserve a spot"}</h2>
            <button onClick={onClose} aria-label="Close" className="text-muted hover:text-ink"><CloseIcon /></button>
          </div>
          <p className="mt-0.5 text-sm text-muted">{event.title}</p>

          {done ? (
            <div className="mt-5 text-center">
              <span className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-emerald-500/15 text-emerald-600"><CheckIcon className="h-7 w-7" /></span>
              <p className="mt-3 font-display text-lg font-bold text-ink">{paid ? "Tickets booked! 🎉" : "You're going! 🎉"}</p>
              <p className="mt-1 text-sm text-muted">Show this code at the entrance.</p>
              <div className="mt-4 flex flex-col items-center">
                <QRCode value={done.code} size={150} />
                <p className="mt-2 font-mono text-lg font-bold tracking-wider text-ink">{done.code}</p>
              </div>
              <Link to="/my-events" onClick={onClose} className="btn btn-ghost mt-4 px-4 py-2 text-sm">View in My Events</Link>
              <button onClick={onClose} className="btn btn-primary mt-2 w-full py-2.5">Done</button>
            </div>
          ) : (
            <form onSubmit={submit} className="mt-4 space-y-3">
              {tickets.length > 0 && (
                <div className="space-y-2">
                  {tickets.map((t) => (
                    <button key={t.id} type="button" onClick={() => setTt(t)} className={`flex w-full items-center justify-between gap-3 rounded-xl border p-3 text-left transition ${tt?.id === t.id ? "border-brand bg-brand-soft" : "border-border hover:border-brand/50"}`}>
                      <span className="min-w-0">
                        <span className="block font-semibold text-ink">{KIND_BADGE[t.kind] ?? t.name} <span className="text-muted">· {t.name}</span></span>
                        {t.description && <span className="block text-xs text-muted">{t.description}</span>}
                        {t.remaining != null && <span className="block text-xs text-amber-600">{t.remaining} left</span>}
                      </span>
                      <span className="shrink-0 font-bold text-brand">{t.price > 0 ? money(t.price) : "Free"}</span>
                    </button>
                  ))}
                </div>
              )}

              <label className="flex items-center justify-between text-sm font-semibold text-ink">Quantity
                <span className="flex items-center gap-2">
                  <button type="button" onClick={() => setQty((q) => Math.max(1, q - 1))} className="btn btn-ghost h-8 w-8 !p-0">−</button>
                  <span className="w-6 text-center">{qty}</span>
                  <button type="button" onClick={() => setQty((q) => Math.min(20, q + 1))} className="btn btn-ghost h-8 w-8 !p-0">+</button>
                </span>
              </label>

              {!user && (
                <>
                  <input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required placeholder="Your name" className="input" />
                  <div className="grid grid-cols-2 gap-2">
                    <input value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} placeholder="Phone" className="input" />
                    <input value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} placeholder="Email" className="input" />
                  </div>
                </>
              )}

              {paid && (
                <div>
                  <p className="text-sm font-semibold text-ink">Payment</p>
                  <div className="mt-2 flex flex-wrap gap-2">
                    <button type="button" onClick={() => setMethod("CARD")} className={`chip ${method === "CARD" ? "chip-active" : ""}`}>💳 Card</button>
                    {user && <button type="button" onClick={() => setMethod("WALLET")} className={`chip ${method === "WALLET" ? "chip-active" : ""}`}>💰 Wallet (${walletBalance.toFixed(2)})</button>}
                    <button type="button" onClick={() => setMethod("PAY_AT_VENUE")} className={`chip ${method === "PAY_AT_VENUE" ? "chip-active" : ""}`}>🏛️ At venue</button>
                  </div>
                  {walletShort && (
                    <div className="mt-2 flex flex-wrap items-center justify-between gap-2 rounded-lg bg-amber-400/10 px-3 py-2 text-xs">
                      <span className="font-medium text-amber-700">Balance too low — total {money(total)}.</span>
                      <button type="button" onClick={() => setTopUp(true)} className="btn btn-ghost px-3 py-1 text-xs">+ Add money</button>
                    </div>
                  )}
                </div>
              )}

              {err && <p className="rounded-lg bg-red-500/10 px-3 py-2 text-sm font-medium text-red-500">{err}</p>}
              <button type="submit" disabled={busy || walletShort} className="btn btn-primary w-full py-3 disabled:opacity-60">
                {busy ? "Processing…" : paid ? `Pay ${money(total)} · ${qty} ticket${qty > 1 ? "s" : ""}` : `Reserve ${qty > 1 ? `${qty} spots` : "my spot"}`}
              </button>
              {paid && <p className="text-center text-xs text-muted">💳 Demo payment — no real charge.</p>}
            </form>
          )}
        </div>
      </div>
      {topUp && <TopUpModal balance={walletBalance} onClose={() => setTopUp(false)} onDone={() => { reloadWallet(); setTopUp(false); }} />}
    </>
  );
}
