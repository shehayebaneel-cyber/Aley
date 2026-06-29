import { FormEvent, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { CheckIcon, CloseIcon } from "./icons";
import { QRCode, redeemUrl } from "./QRCode";
import { TopUpModal } from "./TopUpModal";
import { useUserAuth } from "../context/UserAuthContext";
import { api, userApi } from "../lib/api";
import { useWallet } from "../lib/useWallet";
import type { Business, VoucherType } from "../types";

const money = (n: number) => `$${Number.isInteger(n) ? n : n.toFixed(2)}`;
const KIND_LABEL: Record<string, string> = { FIXED: "Gift card", PRODUCT: "Product voucher", SERVICE: "Service voucher" };

export function BuyVoucherModal({ business, onClose }: { business: Business; onClose: () => void }) {
  const { user } = useUserAuth();
  const [types, setTypes] = useState<VoucherType[] | null>(null);
  const [type, setType] = useState<VoucherType | null>(null);
  const [customValue, setCustomValue] = useState(25);
  const [form, setForm] = useState({ recipientName: "", recipientEmail: "", recipientPhone: "", message: "", deliverAt: "", purchaserName: user?.name ?? "", purchaserEmail: user?.email ?? "" });
  const [step, setStep] = useState(0); // 0 choose, 1 details+pay
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");
  const [done, setDone] = useState<{ code: string } | null>(null);
  const { balance: walletBalance, reload: reloadWallet } = useWallet();
  const [payMethod, setPayMethod] = useState("CARD");
  const [topUp, setTopUp] = useState(false);

  useEffect(() => {
    api.get<{ types: VoucherType[] }>(`/api/vouchers/${business.slug}`).then((d) => { setTypes(d.types); if (d.types.length === 1) setType(d.types[0]); }).catch(() => setTypes([]));
  }, [business.slug]);

  const amount = type ? (type.value > 0 ? type.value : customValue) : 0;
  const price = type ? (type.price > 0 ? type.price : amount) : 0;
  const walletShort = payMethod === "WALLET" && walletBalance < price;

  async function submit(e: FormEvent) {
    e.preventDefault();
    if (busy || !type) return;
    if (!form.recipientName.trim()) return setErr("Recipient name is required.");
    if (!form.recipientEmail.trim() && !form.recipientPhone.trim()) return setErr("Add the recipient's email or phone.");
    if (type.value === 0 && (!amount || amount < 1)) return setErr("Enter a voucher amount.");
    if (payMethod === "WALLET" && walletBalance < price) return setErr("Your wallet balance is too low. Add money or pay by card.");
    setBusy(true); setErr("");
    const client = user ? userApi : api;
    try {
      const r = await client.post<{ voucher: { code: string } }>("/api/vouchers/buy", {
        businessId: business.id, voucherTypeId: type.id, value: amount,
        recipientName: form.recipientName, recipientEmail: form.recipientEmail, recipientPhone: form.recipientPhone,
        message: form.message, deliverAt: form.deliverAt || null,
        purchaserName: form.purchaserName, purchaserEmail: form.purchaserEmail, paymentMethod: payMethod,
      });
      setDone({ code: r.voucher.code });
    } catch (e2) {
      setErr(e2 instanceof Error ? e2.message : "Couldn't complete the purchase.");
    } finally { setBusy(false); }
  }

  return (
    <>
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/50 p-0 backdrop-blur-sm sm:items-center sm:p-4" onClick={onClose}>
      <div className="card pop-in max-h-[92vh] w-full max-w-lg overflow-y-auto rounded-b-none p-6 sm:rounded-3xl" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between">
          <h2 className="font-display text-xl font-extrabold text-ink">🎁 Gift voucher</h2>
          <button onClick={onClose} aria-label="Close" className="text-muted hover:text-ink"><CloseIcon /></button>
        </div>
        <p className="mt-0.5 text-sm text-muted">{business.name}</p>

        {done ? (
          <div className="mt-6 text-center">
            <span className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-emerald-500/15 text-emerald-600"><CheckIcon className="h-7 w-7" /></span>
            <p className="mt-3 font-display text-lg font-bold text-ink">{form.deliverAt ? "Gift scheduled! 🎉" : "Voucher purchased! 🎉"}</p>
            <p className="mt-1 text-muted">{form.deliverAt ? `It'll be delivered to ${form.recipientName} on ${form.deliverAt}.` : `Ready for ${form.recipientName}.`}</p>
            <div className="mt-4 flex flex-col items-center">
              <QRCode value={redeemUrl(done.code)} size={150} />
              <p className="mt-2 text-xs text-muted">Voucher code</p>
              <p className="font-mono text-lg font-bold text-ink">{done.code}</p>
            </div>
            <Link to="/gift-vouchers" onClick={onClose} className="btn btn-ghost mt-4 px-4 py-2 text-sm">View in My Gift Vouchers</Link>
            <button onClick={onClose} className="btn btn-primary mt-2 w-full py-2.5">Done</button>
          </div>
        ) : types === null ? (
          <div className="mt-6 h-40 animate-pulse rounded-xl surface-2" />
        ) : types.length === 0 ? (
          <p className="mt-6 text-center text-sm text-muted">No gift vouchers available right now.</p>
        ) : (
          <>
            <div className="mt-4 flex items-center gap-1.5">{["choose", "details"].map((s, i) => <span key={s} className={`h-1.5 flex-1 rounded-full ${i <= step ? "bg-brand" : "bg-border"}`} />)}</div>
            <div className="mt-5">
              {step === 0 && (
                <div className="space-y-2">
                  <p className="font-semibold text-ink">Choose a voucher</p>
                  {types.map((t) => (
                    <button key={t.id} onClick={() => setType(t)} className={`flex w-full items-center justify-between gap-3 rounded-xl border p-3 text-left transition ${type?.id === t.id ? "border-brand bg-brand-soft" : "border-border hover:border-brand/50"}`}>
                      <span className="min-w-0">
                        <span className="block font-semibold text-ink">{t.name}</span>
                        <span className="block text-xs text-muted">{KIND_LABEL[t.kind]}{t.description ? ` · ${t.description}` : ""}{t.expiryDays ? ` · valid ${t.expiryDays} days` : ""}</span>
                      </span>
                      <span className="shrink-0 font-semibold text-brand">{t.value > 0 ? money(t.price > 0 ? t.price : t.value) : "Custom"}</span>
                    </button>
                  ))}
                  {type && type.value === 0 && (
                    <label className="mt-2 block text-sm font-semibold text-ink">Amount
                      <div className="mt-1 flex gap-2">
                        {[10, 25, 50, 100].map((v) => <button key={v} type="button" onClick={() => setCustomValue(v)} className={`chip ${customValue === v ? "chip-active" : ""}`}>${v}</button>)}
                        <input type="number" min={1} value={customValue} onChange={(e) => setCustomValue(Number(e.target.value))} className="input !py-1.5 w-24 text-sm" />
                      </div>
                    </label>
                  )}
                  <button onClick={() => type && setStep(1)} disabled={!type} className="btn btn-primary mt-3 w-full py-2.5 disabled:opacity-40">Continue · {type ? money(price) : ""}</button>
                </div>
              )}
              {step === 1 && type && (
                <form onSubmit={submit} className="space-y-3">
                  <div className="rounded-xl surface-2 p-3 text-sm">
                    <p className="font-semibold text-ink">{type.name} · {money(amount)}</p>
                    {type.terms && <p className="mt-1 text-xs text-muted">{type.terms}</p>}
                  </div>
                  <p className="text-sm font-semibold text-ink">Recipient</p>
                  <input value={form.recipientName} onChange={(e) => setForm({ ...form, recipientName: e.target.value })} required placeholder="Recipient's name" className="input" />
                  <div className="grid grid-cols-2 gap-2">
                    <input value={form.recipientEmail} onChange={(e) => setForm({ ...form, recipientEmail: e.target.value })} placeholder="Email" className="input" />
                    <input value={form.recipientPhone} onChange={(e) => setForm({ ...form, recipientPhone: e.target.value })} placeholder="Phone" className="input" />
                  </div>
                  <textarea value={form.message} onChange={(e) => setForm({ ...form, message: e.target.value })} rows={2} placeholder="Personal message (optional)" className="input" />
                  <label className="block text-sm font-semibold text-ink">Schedule delivery <span className="font-normal text-muted">(optional — birthday, holiday…)</span>
                    <input type="date" value={form.deliverAt} min={new Date().toISOString().slice(0, 10)} onChange={(e) => setForm({ ...form, deliverAt: e.target.value })} className="input mt-1" />
                  </label>
                  <p className="text-sm font-semibold text-ink">Your details</p>
                  <input value={form.purchaserName} onChange={(e) => setForm({ ...form, purchaserName: e.target.value })} placeholder="Your name" className="input" />
                  <input value={form.purchaserEmail} onChange={(e) => setForm({ ...form, purchaserEmail: e.target.value })} placeholder="Your email" className="input" />
                  <p className="text-sm font-semibold text-ink">Payment</p>
                  <div className="flex flex-wrap gap-2">
                    <button type="button" onClick={() => setPayMethod("CARD")} className={`chip ${payMethod === "CARD" ? "chip-active" : ""}`}>💳 Card</button>
                    {user && <button type="button" onClick={() => setPayMethod("WALLET")} className={`chip ${payMethod === "WALLET" ? "chip-active" : ""}`}>💰 Wallet (${walletBalance.toFixed(2)})</button>}
                  </div>
                  {payMethod === "WALLET" && walletShort ? (
                    <div className="flex flex-wrap items-center justify-between gap-2 rounded-lg bg-amber-400/10 px-3 py-2 text-xs">
                      <span className="font-medium text-amber-700">Balance too low — needs {money(price)}.</span>
                      <button type="button" onClick={() => setTopUp(true)} className="btn btn-ghost px-3 py-1 text-xs">+ Add money</button>
                    </div>
                  ) : (
                    <div className="rounded-xl border border-border p-3 text-xs text-muted">💳 Demo payment — {payMethod === "WALLET" ? "paid from your wallet" : "your card is not charged"}. Total <span className="font-semibold text-ink">{money(price)}</span>.</div>
                  )}
                  {err && <p className="rounded-lg bg-red-500/10 px-3 py-2 text-sm font-medium text-red-500">{err}</p>}
                  <button type="submit" disabled={busy || walletShort} className="btn btn-primary w-full py-3 disabled:opacity-60">{busy ? "Processing…" : `Pay ${money(price)} & send`}</button>
                  <button type="button" onClick={() => setStep(0)} className="btn btn-ghost w-full py-2 text-sm">Back</button>
                </form>
              )}
            </div>
          </>
        )}
      </div>
    </div>
    {topUp && <TopUpModal balance={walletBalance} onClose={() => setTopUp(false)} onDone={() => { reloadWallet(); setTopUp(false); }} />}
    </>
  );
}
