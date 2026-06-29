import { FormEvent, useEffect, useState } from "react";
import type { AdminFinance, Payout, Transaction } from "../../types";
import { adminApi } from "../../lib/api";
import { downloadCsv } from "../../lib/csv";

const money = (n: number) => `$${(Math.round(n * 100) / 100).toLocaleString(undefined, { minimumFractionDigits: 2 })}`;
const SRC: Record<string, string> = { VOUCHER: "🎁 Voucher", FACILITY: "🏟️ Court", ORDER: "🛍️ Order", APPOINTMENT: "📅 Appt", ADJUSTMENT: "⚙️ Adj" };
const PAY_BADGE: Record<string, string> = { PAID: "bg-emerald-500/15 text-emerald-600", PENDING: "bg-amber-400/15 text-amber-600", PARTIALLY_REFUNDED: "bg-amber-400/15 text-amber-600", REFUNDED: "bg-red-500/15 text-red-500", FAILED: "bg-red-500/15 text-red-500", CANCELLED: "bg-surface-2 text-muted" };
const PO_BADGE: Record<string, string> = { PENDING: "bg-amber-400/15 text-amber-600", PAID: "bg-emerald-500/15 text-emerald-600", FAILED: "bg-red-500/15 text-red-500", CANCELLED: "bg-surface-2 text-muted" };

interface Biz { id: number; name: string }
interface Cat { id: number; slug: string; name: string; commissionRate?: number }

export function AdminPayments() {
  const [fin, setFin] = useState<AdminFinance | null>(null);
  const [txs, setTxs] = useState<Transaction[]>([]);
  const [payouts, setPayouts] = useState<Payout[]>([]);
  const [comm, setComm] = useState<{ global: number; fixedFee: number; categories: Cat[] } | null>(null);
  const [cats, setCats] = useState<Cat[]>([]);
  const [bizes, setBizes] = useState<Biz[]>([]);
  const [source, setSource] = useState("");
  const [q, setQ] = useState("");

  const loadFin = () => adminApi.get<AdminFinance>("/api/admin/finance").then(setFin).catch(() => {});
  const loadTxs = () => adminApi.get<{ items: Transaction[] }>(`/api/admin/transactions?q=${encodeURIComponent(q)}&source=${source}`).then((d) => setTxs(d.items)).catch(() => setTxs([]));
  const loadPayouts = () => adminApi.get<Payout[]>("/api/admin/payouts").then(setPayouts).catch(() => setPayouts([]));
  const loadComm = () => adminApi.get<{ global: number; fixedFee: number; categories: Cat[] }>("/api/admin/commission").then(setComm).catch(() => {});
  useEffect(() => { loadFin(); loadPayouts(); loadComm(); adminApi.get<Cat[]>("/api/categories?city=aley").then(setCats).catch(() => {}); adminApi.get<Biz[]>("/api/admin/businesses").then((b: any) => setBizes(Array.isArray(b) ? b : b.items ?? [])).catch(() => {}); /* eslint-disable-next-line */ }, []);
  useEffect(() => { loadTxs(); /* eslint-disable-next-line */ }, [source]);

  async function refund(t: Transaction) {
    const v = window.prompt(`Refund amount (max $${(t.amount - t.refundedAmount).toFixed(2)}):`, (t.amount - t.refundedAmount).toFixed(2));
    if (v == null) return;
    await adminApi.post(`/api/admin/transactions/${t.id}/refund`, { amount: Number(v) }); loadTxs(); loadFin();
  }
  const refresh = () => { loadFin(); loadTxs(); loadPayouts(); };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-2xl font-extrabold text-ink">Finance</h1>
        <p className="text-sm text-muted">Demo mode — money is recorded & payouts tracked; a payment gateway moves real funds later.</p>
      </div>

      {/* Platform totals */}
      {fin && (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 lg:grid-cols-4">
          {[["Total sales", money(fin.totalSales)], ["Platform revenue", money(fin.platformRevenue)], ["Commissions", money(fin.commissions)], ["Delivery fees", money(fin.deliveryFees)], ["Owed to businesses", money(fin.owedToBusinesses)], ["Paid out", money(fin.paidOut)], ["Pending payouts", money(fin.pendingPayouts)], ["Refunds", money(fin.refunds)]].map(([l, v]) => (
            <div key={l} className="card p-3"><p className="text-xs text-muted">{l}</p><p className="font-display text-lg font-extrabold text-ink">{v}</p></div>
          ))}
        </div>
      )}

      {/* Commission settings */}
      {comm && (
        <section className="card p-5">
          <h2 className="font-display font-bold text-ink">Commission</h2>
          <CommissionForm comm={comm} cats={cats} onSaved={loadComm} />
        </section>
      )}

      {/* Payouts */}
      <section className="card p-5">
        <h2 className="font-display font-bold text-ink">Payouts</h2>
        <GeneratePayout bizes={bizes} onDone={refresh} />
        <div className="mt-3 space-y-2">
          {payouts.length === 0 && <p className="text-sm text-muted">No payouts yet.</p>}
          {payouts.map((p) => (
            <div key={p.id} className="flex flex-wrap items-center gap-2 rounded-xl border border-border p-2.5 text-sm">
              <span className="flex-1 text-ink"><span className="font-semibold">{p.business?.name}</span> · <span className="font-semibold">{money(p.net)}</span> <span className="text-muted">· {p.periodStart || "—"}{p.periodEnd ? `→${p.periodEnd}` : ""} · gross {money(p.grossSales)} − comm {money(p.commission)}</span></span>
              <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${PO_BADGE[p.status]}`}>{p.status.toLowerCase()}</span>
              {p.status === "PENDING" && <>
                <button onClick={async () => { await adminApi.post(`/api/admin/payouts/${p.id}/status`, { status: "PAID" }); refresh(); }} className="btn btn-primary px-3 py-1.5 text-xs">Mark paid</button>
                <button onClick={async () => { await adminApi.post(`/api/admin/payouts/${p.id}/status`, { status: "CANCELLED" }); refresh(); }} className="btn btn-ghost px-3 py-1.5 text-xs text-red-500">Cancel</button>
              </>}
            </div>
          ))}
        </div>
      </section>

      {/* Manual adjustment */}
      <section className="card p-5">
        <h2 className="font-display font-bold text-ink">Manual adjustment</h2>
        <p className="text-sm text-muted">Credit (+) or debit (−) a business's balance. Use for corrections, bonuses or deductions.</p>
        <AdjustForm bizes={bizes} onDone={refresh} />
      </section>

      {/* Ledger */}
      <section className="card p-5">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h2 className="font-display font-bold text-ink">Transactions ledger</h2>
          <button onClick={() => downloadCsv("aley-transactions.csv", ["ID", "Date", "Business", "Source", "Reference", "Customer", "Gross", "Commission", "Net", "Payment", "Payout", "Refunded"], txs.map((t) => [t.id, new Date(t.createdAt).toISOString().slice(0, 10), t.business?.name ?? "", t.source, t.code, t.customerName, t.amount, t.commission, t.net, t.status, t.payoutStatus, t.refundedAmount]))} className="btn btn-ghost px-3 py-1.5 text-xs">⬇ Export CSV</button>
        </div>
        <div className="mt-2 flex flex-wrap gap-2">
          <form onSubmit={(e: FormEvent) => { e.preventDefault(); loadTxs(); }} className="flex gap-2"><input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search" className="input !py-2 text-sm" /><button className="btn btn-ghost px-3 py-2 text-sm">Search</button></form>
          {["", "VOUCHER", "FACILITY", "ORDER", "ADJUSTMENT"].map((s) => <button key={s} onClick={() => setSource(s)} className={`chip !text-xs ${source === s ? "chip-active" : ""}`}>{s ? (SRC[s] ?? s) : "all"}</button>)}
        </div>
        <div className="mt-3 space-y-2">
          {txs.map((t) => (
            <div key={t.id} className="flex flex-wrap items-center gap-2 rounded-xl border border-border p-2.5 text-sm">
              <div className="min-w-0 flex-1">
                <p className="font-semibold text-ink">{SRC[t.source] ?? t.source} · gross {money(t.amount)} · net {money(t.net)}{t.refundedAmount > 0 ? <span className="text-red-500"> −{money(t.refundedAmount)}</span> : null}</p>
                <p className="text-muted">{t.business?.name} · {t.description} · {t.customerName || "—"}{t.code ? ` · ${t.code}` : ""} · {new Date(t.createdAt).toLocaleDateString()}</p>
              </div>
              <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${PAY_BADGE[t.status] ?? "bg-surface-2 text-muted"}`}>{t.status.replace("_", " ").toLowerCase()}</span>
              {t.status !== "REFUNDED" && t.status !== "CANCELLED" && t.amount > 0 && <button onClick={() => refund(t)} className="btn btn-ghost px-3 py-1.5 text-xs text-red-500">Refund</button>}
            </div>
          ))}
          {txs.length === 0 && <div className="p-6 text-center text-sm text-muted">No transactions.</div>}
        </div>
      </section>
    </div>
  );
}

function CommissionForm({ comm, cats, onSaved }: { comm: { global: number; fixedFee: number }; cats: Cat[]; onSaved: () => void }) {
  const [global, setGlobal] = useState(comm.global);
  const [fixedFee, setFixedFee] = useState(comm.fixedFee);
  const [catId, setCatId] = useState("");
  const [catRate, setCatRate] = useState(0);
  return (
    <div className="mt-2 space-y-3">
      <div className="flex flex-wrap items-end gap-2">
        <label className="text-sm font-semibold text-ink">Global commission %<input type="number" min={0} value={global} onChange={(e) => setGlobal(Number(e.target.value))} className="input mt-1 !py-2 text-sm w-28" /></label>
        <label className="text-sm font-semibold text-ink">Fixed fee per transaction $<input type="number" min={0} step={0.5} value={fixedFee} onChange={(e) => setFixedFee(Number(e.target.value))} className="input mt-1 !py-2 text-sm w-32" /></label>
        <button onClick={async () => { await adminApi.post("/api/admin/commission", { global, fixedFee }); onSaved(); }} className="btn btn-primary px-4 py-2 text-sm">Save</button>
      </div>
      <div className="flex flex-wrap items-end gap-2">
        <label className="text-sm font-semibold text-ink">Per category<select value={catId} onChange={(e) => setCatId(e.target.value)} className="input mt-1 !py-2 text-sm w-48"><option value="">Choose category…</option>{cats.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}</select></label>
        <label className="text-sm font-semibold text-ink">Rate % <span className="font-normal text-muted">(0 = use global)</span><input type="number" min={0} value={catRate} onChange={(e) => setCatRate(Number(e.target.value))} className="input mt-1 !py-2 text-sm w-24" /></label>
        <button disabled={!catId} onClick={async () => { await adminApi.post("/api/admin/commission", { category: { id: Number(catId), rate: catRate } }); onSaved(); }} className="btn btn-ghost px-4 py-2 text-sm disabled:opacity-40">Set category</button>
      </div>
      <p className="text-xs text-muted">Resolution order: per-business override → per-category → global. Categories with a custom rate are applied automatically.</p>
    </div>
  );
}

function GeneratePayout({ bizes, onDone }: { bizes: Biz[]; onDone: () => void }) {
  const [bizId, setBizId] = useState("");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [err, setErr] = useState("");
  async function gen(e: FormEvent) {
    e.preventDefault(); if (!bizId) return;
    setErr("");
    try { await adminApi.post("/api/admin/payouts/generate", { businessId: Number(bizId), periodStart: from, periodEnd: to }); setBizId(""); onDone(); }
    catch (e2) { setErr(e2 instanceof Error ? e2.message : "Couldn't generate."); }
  }
  return (
    <form onSubmit={gen} className="mt-2 flex flex-wrap items-end gap-2">
      <label className="text-sm font-semibold text-ink">Business<select value={bizId} onChange={(e) => setBizId(e.target.value)} className="input mt-1 !py-2 text-sm w-52"><option value="">Choose…</option>{bizes.map((b) => <option key={b.id} value={b.id}>{b.name}</option>)}</select></label>
      <label className="text-sm font-semibold text-ink">From<input type="date" value={from} onChange={(e) => setFrom(e.target.value)} className="input mt-1 !py-2 text-sm" /></label>
      <label className="text-sm font-semibold text-ink">To<input type="date" value={to} onChange={(e) => setTo(e.target.value)} className="input mt-1 !py-2 text-sm" /></label>
      <button className="btn btn-primary px-4 py-2 text-sm">Generate payout</button>
      {err && <span className="text-sm text-red-500">{err}</span>}
    </form>
  );
}

function AdjustForm({ bizes, onDone }: { bizes: Biz[]; onDone: () => void }) {
  const [bizId, setBizId] = useState("");
  const [amount, setAmount] = useState(0);
  const [desc, setDesc] = useState("");
  async function add(e: FormEvent) {
    e.preventDefault(); if (!bizId || !amount) return;
    await adminApi.post("/api/admin/adjustments", { businessId: Number(bizId), amount, description: desc });
    setAmount(0); setDesc(""); onDone();
  }
  return (
    <form onSubmit={add} className="mt-2 flex flex-wrap items-end gap-2">
      <label className="text-sm font-semibold text-ink">Business<select value={bizId} onChange={(e) => setBizId(e.target.value)} className="input mt-1 !py-2 text-sm w-52"><option value="">Choose…</option>{bizes.map((b) => <option key={b.id} value={b.id}>{b.name}</option>)}</select></label>
      <label className="text-sm font-semibold text-ink">Amount $ <span className="font-normal text-muted">(− to debit)</span><input type="number" step={0.5} value={amount} onChange={(e) => setAmount(Number(e.target.value))} className="input mt-1 !py-2 text-sm w-28" /></label>
      <input value={desc} onChange={(e) => setDesc(e.target.value)} placeholder="Reason" className="input !py-2 text-sm flex-1 min-w-[10rem]" />
      <button className="btn btn-primary px-4 py-2 text-sm">Add adjustment</button>
    </form>
  );
}
