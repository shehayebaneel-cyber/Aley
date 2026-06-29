import { useEffect, useState } from "react";
import type { LedgerSummary, Transaction } from "../../types";
import { adminApi } from "../../lib/api";

const money = (n: number) => `$${Number.isInteger(n) ? n : n.toFixed(2)}`;
const LABEL: Record<string, string> = { VOUCHER: "🎁 Voucher", FACILITY: "🏟️ Court", ORDER: "🛍️ Order" };
const BADGE: Record<string, string> = { PAID: "bg-emerald-500/15 text-emerald-600", PARTIALLY_REFUNDED: "bg-amber-400/15 text-amber-600", REFUNDED: "bg-red-500/15 text-red-500" };

export function AdminPayments() {
  const [data, setData] = useState<{ items: Transaction[]; summary: LedgerSummary } | null>(null);
  const [q, setQ] = useState("");
  const [source, setSource] = useState("");
  const load = () => adminApi.get<{ items: Transaction[]; summary: LedgerSummary }>(`/api/admin/transactions?q=${encodeURIComponent(q)}&source=${source}`).then(setData).catch(() => setData(null));
  useEffect(() => { load(); /* eslint-disable-next-line */ }, [source]);

  async function refund(t: Transaction) {
    const def = (t.amount - t.refundedAmount).toFixed(2);
    const v = window.prompt(`Refund amount (max $${def}):`, def);
    if (v == null) return;
    if (!window.confirm("Record this refund? It cancels the item and logs the amount.")) return;
    await adminApi.post(`/api/admin/transactions/${t.id}/refund`, { amount: Number(v) });
    load();
  }

  return (
    <div>
      <h1 className="font-display text-2xl font-extrabold text-ink">Payments</h1>
      <p className="mt-1 text-sm text-muted">Demo mode — amounts are recorded for the books; real money moves once a payment gateway is connected.</p>
      {data && (
        <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
          {[["Net", money(data.summary.net)], ["Gross", money(data.summary.gross)], ["Refunded", money(data.summary.refunded)], ["Transactions", String(data.summary.count)]].map(([l, v]) => (
            <div key={l} className="card p-3"><p className="text-xs text-muted">{l}</p><p className="font-display text-lg font-extrabold text-ink">{v}</p></div>
          ))}
        </div>
      )}
      <div className="mt-4 flex flex-wrap gap-2">
        <form onSubmit={(e) => { e.preventDefault(); load(); }} className="flex gap-2"><input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search code / customer" className="input !py-2 text-sm" /><button className="btn btn-ghost px-3 py-2 text-sm">Search</button></form>
        {["", "VOUCHER", "FACILITY", "ORDER"].map((s) => <button key={s} onClick={() => setSource(s)} className={`chip !text-xs ${source === s ? "chip-active" : ""}`}>{s ? (LABEL[s] ?? s) : "all"}</button>)}
      </div>
      <div className="mt-4 space-y-2">
        {(data?.items ?? []).map((t) => (
          <div key={t.id} className="card flex flex-wrap items-center gap-2 p-3 text-sm">
            <div className="min-w-0 flex-1">
              <p className="font-semibold text-ink">{LABEL[t.source] ?? t.source} · {money(t.amount)}{t.refundedAmount > 0 ? <span className="text-red-500"> (−{money(t.refundedAmount)})</span> : null}</p>
              <p className="text-muted">{t.business?.name} · {t.description} · {t.customerName || "—"}{t.code ? ` · ${t.code}` : ""} · {new Date(t.createdAt).toLocaleDateString()}</p>
            </div>
            <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${BADGE[t.status] ?? "bg-surface-2 text-muted"}`}>{t.status.replace("_", " ").toLowerCase()}</span>
            {t.status !== "REFUNDED" && <button onClick={() => refund(t)} className="btn btn-ghost px-3 py-1.5 text-xs text-red-500">Refund</button>}
          </div>
        ))}
        {data && data.items.length === 0 && <div className="card p-8 text-center text-muted">No transactions found.</div>}
      </div>
    </div>
  );
}
