import { FormEvent, useState } from "react";
import { CloseIcon } from "./icons";
import { userApi } from "../lib/api";
import type { WalletSummary } from "../types";

const money = (n: number) => `$${Number.isInteger(n) ? n : n.toFixed(2)}`;
const PRESETS = [10, 25, 50, 100];
const METHODS: { key: string; label: string }[] = [
  { key: "CARD", label: "💳 Card" },
  { key: "WHISH", label: "📱 Whish" },
];

/** Load money into the customer wallet (mock gateway). Calls onDone with the fresh summary. */
export function TopUpModal({ balance, onClose, onDone }: { balance: number; onClose: () => void; onDone: (w: WalletSummary) => void }) {
  const [amount, setAmount] = useState(25);
  const [method, setMethod] = useState("CARD");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");

  async function submit(e: FormEvent) {
    e.preventDefault();
    if (busy) return;
    if (!amount || amount < 1) return setErr("Enter an amount of at least $1.");
    setBusy(true); setErr("");
    try {
      const w = await userApi.post<WalletSummary>("/api/me/wallet/topup", { amount, method });
      onDone(w);
    } catch (e2) {
      setErr(e2 instanceof Error ? e2.message : "Couldn't load your wallet.");
      setBusy(false);
    }
  }

  return (
    <div className="fixed inset-0 z-[60] flex items-end justify-center bg-black/50 p-0 backdrop-blur-sm sm:items-center sm:p-4" onClick={onClose}>
      <div className="card pop-in w-full max-w-md rounded-b-none p-6 sm:rounded-3xl" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between">
          <h2 className="font-display text-xl font-extrabold text-ink">💰 Add money</h2>
          <button onClick={onClose} aria-label="Close" className="text-muted hover:text-ink"><CloseIcon /></button>
        </div>
        <p className="mt-0.5 text-sm text-muted">Current balance <span className="font-semibold text-ink">{money(balance)}</span></p>

        <form onSubmit={submit} className="mt-5 space-y-4">
          <div>
            <p className="text-sm font-semibold text-ink">Amount</p>
            <div className="mt-2 flex flex-wrap gap-2">
              {PRESETS.map((v) => (
                <button key={v} type="button" onClick={() => setAmount(v)} className={`chip ${amount === v ? "chip-active" : ""}`}>${v}</button>
              ))}
              <input type="number" min={1} max={1000} value={amount} onChange={(e) => setAmount(Number(e.target.value))} className="input w-28 !py-1.5 text-sm" />
            </div>
          </div>

          <div>
            <p className="text-sm font-semibold text-ink">Pay with</p>
            <div className="mt-2 flex gap-2">
              {METHODS.map((m) => (
                <button key={m.key} type="button" onClick={() => setMethod(m.key)} className={`chip ${method === m.key ? "chip-active" : ""}`}>{m.label}</button>
              ))}
            </div>
          </div>

          <div className="rounded-xl border border-border p-3 text-xs text-muted">
            💳 Demo payment — no real charge. <span className="font-semibold text-ink">{money(amount || 0)}</span> will be added to your wallet instantly.
          </div>
          {err && <p className="rounded-lg bg-red-500/10 px-3 py-2 text-sm font-medium text-red-500">{err}</p>}
          <button type="submit" disabled={busy} className="btn btn-primary w-full py-3 disabled:opacity-60">{busy ? "Loading…" : `Add ${money(amount || 0)}`}</button>
        </form>
      </div>
    </div>
  );
}
