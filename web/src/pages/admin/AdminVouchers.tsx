import { useEffect, useState } from "react";
import { adminApi } from "../../lib/api";

const money = (n: number) => `$${Number.isInteger(n) ? n : n.toFixed(2)}`;
const BADGE: Record<string, string> = { ACTIVE: "bg-emerald-500/15 text-emerald-600", PENDING_DELIVERY: "bg-amber-400/15 text-amber-600", REDEEMED: "bg-surface-2 text-muted", EXPIRED: "bg-red-500/15 text-red-500", DISABLED: "bg-red-500/15 text-red-500" };

interface Row { id: number; code: string; title: string; kind: string; value: number; balance: number; price: number; status: string; recipientName: string; createdAt: string; business: { name: string; slug: string } }
interface Resp { items: Row[]; summary: { sold: number; revenue: number; outstanding: number; redeemed: number; redemptionRate: number } }

export function AdminVouchers() {
  const [data, setData] = useState<Resp | null>(null);
  const [q, setQ] = useState("");
  const [status, setStatus] = useState("");
  const load = () => adminApi.get<Resp>(`/api/admin/vouchers?q=${encodeURIComponent(q)}&status=${status}`).then(setData).catch(() => setData(null));
  useEffect(() => { load(); /* eslint-disable-next-line */ }, [status]);

  async function disable(r: Row) {
    await adminApi.post(`/api/admin/vouchers/${r.id}/disable`, { disable: r.status !== "DISABLED" });
    load();
  }

  return (
    <div>
      <h1 className="font-display text-2xl font-extrabold text-ink">Gift vouchers</h1>
      {data && (
        <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-5">
          {[["Sold", String(data.summary.sold)], ["Revenue", money(data.summary.revenue)], ["Redeemed", String(data.summary.redeemed)], ["Redemption", `${data.summary.redemptionRate}%`], ["Outstanding", money(data.summary.outstanding)]].map(([l, v]) => (
            <div key={l} className="card p-3"><p className="text-xs text-muted">{l}</p><p className="font-display text-lg font-extrabold text-ink">{v}</p></div>
          ))}
        </div>
      )}
      <div className="mt-4 flex flex-wrap gap-2">
        <form onSubmit={(e) => { e.preventDefault(); load(); }} className="flex gap-2"><input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search code / recipient" className="input !py-2 text-sm" /><button className="btn btn-ghost px-3 py-2 text-sm">Search</button></form>
        {["", "ACTIVE", "PENDING_DELIVERY", "REDEEMED", "EXPIRED", "DISABLED"].map((s) => <button key={s} onClick={() => setStatus(s)} className={`chip !text-xs ${status === s ? "chip-active" : ""}`}>{s ? s.replace("_", " ").toLowerCase() : "all"}</button>)}
      </div>
      <div className="mt-4 space-y-2">
        {(data?.items ?? []).map((r) => (
          <div key={r.id} className="card flex flex-wrap items-center gap-2 p-3 text-sm">
            <span className="font-mono font-semibold text-ink">{r.code}</span>
            <span className="flex-1 text-muted">{r.business?.name} · {r.title}{r.kind === "FIXED" ? ` · ${money(r.balance)}/${money(r.value)}` : ""} · paid {money(r.price)}</span>
            <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${BADGE[r.status] ?? "bg-surface-2 text-muted"}`}>{r.status.replace("_", " ")}</span>
            <button onClick={() => disable(r)} className={`btn btn-ghost px-3 py-1.5 text-xs ${r.status === "DISABLED" ? "" : "text-red-500"}`}>{r.status === "DISABLED" ? "Re-enable" : "Disable"}</button>
          </div>
        ))}
        {data && data.items.length === 0 && <div className="card p-8 text-center text-muted">No vouchers found.</div>}
      </div>
    </div>
  );
}
