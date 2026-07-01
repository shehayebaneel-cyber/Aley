import { FormEvent, useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { CheckIcon } from "../components/icons";
import { QRCode } from "../components/QRCode";
import { TopUpModal } from "../components/TopUpModal";
import { useUserAuth } from "../context/UserAuthContext";
import { api, userApi } from "../lib/api";
import { useTitle } from "../lib/useTitle";
import { useWallet } from "../lib/useWallet";
import type { PlatformCardDesign } from "../types";

const money = (n: number) => `$${Number.isInteger(n) ? n : n.toFixed(2)}`;
const cardUrl = (code: string) => `${window.location.origin}/platform-card/${code}`;

const PERKS = [
  { icon: "🌍", title: "Spend anywhere", body: "Restaurants, cafés, salons, hotels, padel, car washes, shopping & experiences." },
  { icon: "💳", title: "Lands in their wallet", body: "The recipient redeems the code and the credit is theirs to spend across Lebanon." },
  { icon: "🎨", title: "For any occasion", body: "Birthdays, weddings, graduations, holidays — pick a design and add a message." },
];

/** Live preview of the gift card art. */
function CardArt({ design, amount, recipient }: { design: PlatformCardDesign | null; amount: number; recipient: string }) {
  const gradient = design?.gradient ?? "from-brand to-brand-dark";
  return (
    <div className={`relative overflow-hidden rounded-3xl bg-gradient-to-br ${gradient} p-6 text-white shadow-lg`}>
      <div className="flex items-start justify-between">
        <span className="text-4xl">{design?.emoji ?? "🎁"}</span>
        <span className="rounded-full bg-white/20 px-3 py-1 text-xs font-bold uppercase tracking-wide">Platform Gift Card</span>
      </div>
      <p className="mt-8 font-display text-5xl font-extrabold drop-shadow-sm">{money(amount || 0)}</p>
      <p className="mt-1 text-sm font-medium text-white/85">{recipient ? `For ${recipient}` : "Redeemable at any business in Lebanon"}</p>
      <p className="mt-6 text-xs text-white/70">Aley · one gift, endless choices</p>
    </div>
  );
}

export function PlatformGiftCard() {
  useTitle("Platform Gift Card");
  const { user } = useUserAuth();
  const { balance: walletBalance, reload: reloadWallet } = useWallet();
  const [designs, setDesigns] = useState<PlatformCardDesign[] | null>(null);
  const [design, setDesign] = useState<PlatformCardDesign | null>(null);
  const [amount, setAmount] = useState(50);
  const [qty, setQty] = useState(1);
  const [form, setForm] = useState({ recipientName: "", recipientEmail: "", recipientPhone: "", message: "", deliverAt: "", purchaserName: user?.name ?? "", purchaserEmail: user?.email ?? "" });
  const [payMethod, setPayMethod] = useState("CARD");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");
  const [done, setDone] = useState<{ code: string; count: number; amount: number; scheduled: boolean } | null>(null);
  const [topUp, setTopUp] = useState(false);

  useEffect(() => {
    api.get<PlatformCardDesign[]>("/api/platform-cards/designs").then((d) => {
      setDesigns(d);
      if (d.length) { setDesign(d[0]); setAmount(d[0].presets[1] ?? d[0].presets[0] ?? 50); }
    }).catch(() => setDesigns([]));
  }, []);

  const total = useMemo(() => Math.round(amount * qty * 100) / 100, [amount, qty]);
  const walletShort = payMethod === "WALLET" && walletBalance < total;
  const min = design?.minValue ?? 10;
  const max = design?.maxValue ?? 1000;

  function pickDesign(d: PlatformCardDesign) {
    setDesign(d);
    if (amount < d.minValue || amount > d.maxValue) setAmount(d.presets[1] ?? d.presets[0] ?? d.minValue);
  }

  async function submit(e: FormEvent) {
    e.preventDefault();
    if (busy || !design) return;
    if (!form.recipientName.trim()) return setErr("Recipient name is required.");
    if (!form.recipientEmail.trim() && !form.recipientPhone.trim()) return setErr("Add the recipient's email or phone.");
    if (!amount || amount < min || amount > max) return setErr(`Amount must be between ${money(min)} and ${money(max)}.`);
    if (payMethod === "WALLET" && walletBalance < total) return setErr("Your wallet balance is too low. Add money or pay by card.");
    setBusy(true); setErr("");
    const client = user ? userApi : api;
    try {
      const r = await client.post<{ code: string; count: number; amount: number; scheduled: boolean }>("/api/platform-cards/buy", {
        designId: design.id, amount, quantity: qty,
        recipientName: form.recipientName, recipientEmail: form.recipientEmail, recipientPhone: form.recipientPhone,
        message: form.message, deliverAt: form.deliverAt || null,
        purchaserName: form.purchaserName, purchaserEmail: form.purchaserEmail, paymentMethod: payMethod,
      });
      setDone({ code: r.code, count: r.count, amount: r.amount, scheduled: r.scheduled });
      if (payMethod === "WALLET") reloadWallet();
    } catch (e2) {
      setErr(e2 instanceof Error ? e2.message : "Couldn't complete the purchase.");
    } finally { setBusy(false); }
  }

  if (done) {
    return (
      <div className="mx-auto max-w-md px-4 py-12 text-center">
        <span className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-emerald-500/15 text-emerald-600"><CheckIcon className="h-8 w-8" /></span>
        <h1 className="mt-4 font-display text-2xl font-extrabold text-ink">{done.scheduled ? "Gift scheduled! 🎉" : done.count > 1 ? `${done.count} gift cards ready! 🎉` : "Gift card ready! 🎉"}</h1>
        <p className="mt-1 text-muted">{done.scheduled ? `It'll be delivered to ${form.recipientName} on ${form.deliverAt}.` : `A ${money(done.amount)} platform gift card for ${form.recipientName}.`}</p>
        <div className="card mt-6 flex flex-col items-center p-6">
          <QRCode value={cardUrl(done.code)} size={170} />
          <p className="mt-3 text-xs text-muted">{done.count > 1 ? "First code" : "Gift card code"}</p>
          <p className="font-mono text-lg font-bold text-ink">{done.code}</p>
          <p className="mt-2 max-w-xs text-xs text-muted">Share this code or link with {form.recipientName}. They redeem it into their Aley wallet and spend it anywhere.</p>
        </div>
        <div className="mt-5 flex flex-col gap-2">
          <Link to={`/platform-card/${done.code}`} className="btn btn-primary py-3">Open the gift ↗</Link>
          <button onClick={() => { setDone(null); setForm({ ...form, recipientName: "", recipientEmail: "", recipientPhone: "", message: "" }); }} className="btn btn-ghost py-2.5 text-sm">Buy another</button>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-6xl px-4 py-8">
      {/* Hero */}
      <div className="text-center">
        <p className="text-sm font-semibold uppercase tracking-wider text-brand">🎁 The gift of choice</p>
        <h1 className="mt-1 font-display text-3xl font-extrabold text-ink sm:text-4xl">Aley Platform Gift Card</h1>
        <p className="mx-auto mt-2 max-w-2xl text-muted">Not sure where they'd want to go? One gift card, redeemable at <span className="font-semibold text-ink">any participating business</span> across Lebanon — from dinner and coffee to salons, hotels, padel and experiences.</p>
      </div>

      <div className="mt-8 grid gap-8 lg:grid-cols-2">
        {/* Left: live preview + perks */}
        <div>
          <div className="lg:sticky lg:top-6">
            <CardArt design={design} amount={amount} recipient={form.recipientName} />
            <div className="mt-5 space-y-3">
              {PERKS.map((p) => (
                <div key={p.title} className="flex gap-3">
                  <span className="text-xl">{p.icon}</span>
                  <div><p className="font-semibold text-ink">{p.title}</p><p className="text-sm text-muted">{p.body}</p></div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Right: buy form */}
        <form onSubmit={submit} className="card space-y-5 p-6">
          {/* Design */}
          <div>
            <p className="text-sm font-semibold text-ink">Choose a design</p>
            {designs === null ? (
              <div className="mt-2 flex gap-2">{Array.from({ length: 4 }).map((_, i) => <div key={i} className="h-16 w-20 animate-pulse rounded-xl surface-2" />)}</div>
            ) : (
              <div className="no-scrollbar mt-2 flex gap-2 overflow-x-auto pb-1">
                {designs.map((d) => (
                  <button key={d.id} type="button" onClick={() => pickDesign(d)} className={`flex h-16 w-20 shrink-0 flex-col items-center justify-center rounded-xl bg-gradient-to-br ${d.gradient} text-white ring-2 transition ${design?.id === d.id ? "ring-brand" : "ring-transparent opacity-80 hover:opacity-100"}`}>
                    <span className="text-2xl">{d.emoji}</span>
                    <span className="mt-0.5 text-[9px] font-bold uppercase">{d.occasion.replace("_", " ")}</span>
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Amount */}
          <div>
            <p className="text-sm font-semibold text-ink">Amount <span className="font-normal text-muted">({money(min)}–{money(max)})</span></p>
            <div className="mt-2 flex flex-wrap gap-2">
              {(design?.presets ?? [25, 50, 100, 250]).map((v) => (
                <button key={v} type="button" onClick={() => setAmount(v)} className={`chip ${amount === v ? "chip-active" : ""}`}>${v}</button>
              ))}
              <input type="number" min={min} max={max} value={amount} onChange={(e) => setAmount(Number(e.target.value))} className="input w-28 !py-1.5 text-sm" />
            </div>
          </div>

          {/* Recipient */}
          <div className="space-y-2">
            <p className="text-sm font-semibold text-ink">Send to</p>
            <input value={form.recipientName} onChange={(e) => setForm({ ...form, recipientName: e.target.value })} required placeholder="Recipient's name" className="input" />
            <div className="grid grid-cols-2 gap-2">
              <input value={form.recipientEmail} onChange={(e) => setForm({ ...form, recipientEmail: e.target.value })} placeholder="Email" className="input" />
              <input value={form.recipientPhone} onChange={(e) => setForm({ ...form, recipientPhone: e.target.value })} placeholder="Phone" className="input" />
            </div>
            <textarea value={form.message} onChange={(e) => setForm({ ...form, message: e.target.value })} rows={2} placeholder="Personal message (optional)" className="input" />
          </div>

          {/* Quantity + schedule */}
          <div className="grid grid-cols-2 gap-3">
            <label className="text-sm font-semibold text-ink">Quantity
              <span className="mt-1 flex items-center gap-2">
                <button type="button" onClick={() => setQty((n) => Math.max(1, n - 1))} className="btn btn-ghost h-9 w-9 !p-0">−</button>
                <span className="w-6 text-center">{qty}</span>
                <button type="button" onClick={() => setQty((n) => Math.min(20, n + 1))} className="btn btn-ghost h-9 w-9 !p-0">+</button>
              </span>
            </label>
            <label className="text-sm font-semibold text-ink">Schedule <span className="font-normal text-muted">(optional)</span>
              <input type="date" value={form.deliverAt} min={new Date().toISOString().slice(0, 10)} onChange={(e) => setForm({ ...form, deliverAt: e.target.value })} className="input mt-1" />
            </label>
          </div>

          {/* Purchaser */}
          <div className="space-y-2">
            <p className="text-sm font-semibold text-ink">Your details</p>
            <div className="grid grid-cols-2 gap-2">
              <input value={form.purchaserName} onChange={(e) => setForm({ ...form, purchaserName: e.target.value })} placeholder="Your name" className="input" />
              <input value={form.purchaserEmail} onChange={(e) => setForm({ ...form, purchaserEmail: e.target.value })} placeholder="Your email" className="input" />
            </div>
          </div>

          {/* Payment */}
          <div>
            <p className="text-sm font-semibold text-ink">Payment</p>
            <div className="mt-2 flex flex-wrap gap-2">
              <button type="button" onClick={() => setPayMethod("CARD")} className={`chip ${payMethod === "CARD" ? "chip-active" : ""}`}>💳 Card</button>
              {user && <button type="button" onClick={() => setPayMethod("WALLET")} className={`chip ${payMethod === "WALLET" ? "chip-active" : ""}`}>💰 Wallet (${walletBalance.toFixed(2)})</button>}
            </div>
            {payMethod === "WALLET" && walletShort ? (
              <div className="mt-2 flex flex-wrap items-center justify-between gap-2 rounded-lg bg-amber-400/10 px-3 py-2 text-xs">
                <span className="font-medium text-amber-700">Balance too low — needs {money(total)}.</span>
                <button type="button" onClick={() => setTopUp(true)} className="btn btn-ghost px-3 py-1 text-xs">+ Add money</button>
              </div>
            ) : (
              <div className="mt-2 rounded-xl border border-border p-3 text-xs text-muted">💳 Demo payment — {payMethod === "WALLET" ? "paid from your wallet" : "your card is not charged"}. Total{qty > 1 ? ` (${qty}×)` : ""} <span className="font-semibold text-ink">{money(total)}</span>.</div>
            )}
          </div>

          {err && <p className="rounded-lg bg-red-500/10 px-3 py-2 text-sm font-medium text-red-500">{err}</p>}
          <button type="submit" disabled={busy || walletShort || !design} className="btn btn-primary w-full py-3 disabled:opacity-60">{busy ? "Processing…" : `Pay ${money(total)} & send`}</button>
          <p className="text-center text-xs text-muted">The recipient redeems the code into their Aley wallet, then spends it at any participating business.</p>
        </form>
      </div>

      {topUp && <TopUpModal balance={walletBalance} onClose={() => setTopUp(false)} onDone={() => { reloadWallet(); setTopUp(false); }} />}
    </div>
  );
}
