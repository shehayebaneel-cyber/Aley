import { useEffect, useState } from "react";
import { CloseIcon } from "../../components/icons";
import { adminApi } from "../../lib/api";
import type { PlatformCardDesign } from "../../types";

const money = (n: number) => `$${Number.isInteger(n) ? n : n.toFixed(2)}`;
const BADGE: Record<string, string> = { ACTIVE: "bg-emerald-500/15 text-emerald-600", PENDING_DELIVERY: "bg-amber-400/15 text-amber-600", REDEEMED: "bg-surface-2 text-muted", EXPIRED: "bg-red-500/15 text-red-500", DISABLED: "bg-red-500/15 text-red-500", REFUNDED: "bg-red-500/15 text-red-500" };

const GRADIENTS = [
  "from-brand to-brand-dark", "from-pink-500 to-rose-500", "from-emerald-500 to-teal-600", "from-amber-500 to-orange-600",
  "from-fuchsia-500 to-purple-600", "from-sky-500 to-indigo-600", "from-red-500 to-rose-600", "from-cyan-500 to-blue-600",
  "from-violet-500 to-purple-700", "from-slate-600 to-slate-700",
];
const OCCASIONS = ["GENERAL", "BIRTHDAY", "HOLIDAY", "WEDDING", "GRADUATION", "ANNIVERSARY", "THANK_YOU", "CONGRATS"];

interface Card { id: number; code: string; amount: number; balance: number; status: string; occasion: string; emoji: string; recipientName: string; purchaserName: string; createdAt: string }
interface Summary { issued: number; issuedValue: number; redeemedValue: number; outstanding: number; redeemed: number; redemptionRate: number }

function DesignModal({ initial, onClose, onSaved }: { initial: PlatformCardDesign | null; onClose: () => void; onSaved: () => void }) {
  const [f, setF] = useState({
    name: initial?.name ?? "", occasion: initial?.occasion ?? "GENERAL", emoji: initial?.emoji ?? "🎁",
    gradient: initial?.gradient ?? GRADIENTS[0], minValue: initial?.minValue ?? 10, maxValue: initial?.maxValue ?? 1000,
    presets: (initial?.presets ?? [25, 50, 100, 250]).join(", "), active: initial?.active ?? true, sortOrder: initial?.sortOrder ?? 0,
  });
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");

  async function save() {
    if (busy) return;
    if (!f.name.trim()) return setErr("Name is required.");
    setBusy(true); setErr("");
    const body = { ...f, presets: f.presets.split(",").map((s) => Number(s.trim())).filter((n) => n > 0) };
    try {
      if (initial) await adminApi.post(`/api/admin/platform-card-designs/${initial.id}`, body);
      else await adminApi.post("/api/admin/platform-card-designs", body);
      onSaved();
    } catch (e) { setErr(e instanceof Error ? e.message : "Couldn't save."); setBusy(false); }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm" onClick={onClose}>
      <div className="card pop-in max-h-[90vh] w-full max-w-lg overflow-y-auto p-6" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between">
          <h2 className="font-display text-lg font-extrabold text-ink">{initial ? "Edit design" : "New design"}</h2>
          <button onClick={onClose} aria-label="Close" className="text-muted hover:text-ink"><CloseIcon /></button>
        </div>
        <div className={`mt-4 flex items-center justify-between rounded-2xl bg-gradient-to-br ${f.gradient} p-5 text-white`}>
          <span className="text-4xl">{f.emoji}</span>
          <span className="font-display text-2xl font-extrabold">{money(Number(f.maxValue) || 0)}</span>
        </div>
        <div className="mt-4 space-y-3">
          <label className="block text-sm font-semibold text-ink">Name<input value={f.name} onChange={(e) => setF({ ...f, name: e.target.value })} className="input mt-1" /></label>
          <div className="grid grid-cols-2 gap-3">
            <label className="block text-sm font-semibold text-ink">Occasion
              <select value={f.occasion} onChange={(e) => setF({ ...f, occasion: e.target.value })} className="input mt-1">{OCCASIONS.map((o) => <option key={o} value={o}>{o.replace("_", " ")}</option>)}</select>
            </label>
            <label className="block text-sm font-semibold text-ink">Emoji<input value={f.emoji} onChange={(e) => setF({ ...f, emoji: e.target.value })} maxLength={4} className="input mt-1" /></label>
          </div>
          <div>
            <p className="text-sm font-semibold text-ink">Colour</p>
            <div className="mt-1 flex flex-wrap gap-2">
              {GRADIENTS.map((g) => <button key={g} type="button" onClick={() => setF({ ...f, gradient: g })} className={`h-8 w-8 rounded-lg bg-gradient-to-br ${g} ring-2 ${f.gradient === g ? "ring-ink" : "ring-transparent"}`} />)}
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <label className="block text-sm font-semibold text-ink">Min value<input type="number" value={f.minValue} onChange={(e) => setF({ ...f, minValue: Number(e.target.value) })} className="input mt-1" /></label>
            <label className="block text-sm font-semibold text-ink">Max value<input type="number" value={f.maxValue} onChange={(e) => setF({ ...f, maxValue: Number(e.target.value) })} className="input mt-1" /></label>
          </div>
          <label className="block text-sm font-semibold text-ink">Preset amounts <span className="font-normal text-muted">(comma-separated)</span><input value={f.presets} onChange={(e) => setF({ ...f, presets: e.target.value })} className="input mt-1" /></label>
          <div className="flex items-center gap-4">
            <label className="flex items-center gap-2 text-sm font-semibold text-ink"><input type="checkbox" checked={f.active} onChange={(e) => setF({ ...f, active: e.target.checked })} /> Active</label>
            <label className="flex items-center gap-2 text-sm font-semibold text-ink">Order <input type="number" value={f.sortOrder} onChange={(e) => setF({ ...f, sortOrder: Number(e.target.value) })} className="input w-20 !py-1" /></label>
          </div>
          {err && <p className="rounded-lg bg-red-500/10 px-3 py-2 text-sm font-medium text-red-500">{err}</p>}
          <button onClick={save} disabled={busy} className="btn btn-primary w-full py-2.5 disabled:opacity-60">{busy ? "Saving…" : "Save design"}</button>
        </div>
      </div>
    </div>
  );
}

export function AdminPlatformCards() {
  const [tab, setTab] = useState<"cards" | "designs">("cards");
  const [data, setData] = useState<{ items: Card[]; summary: Summary } | null>(null);
  const [q, setQ] = useState("");
  const [status, setStatus] = useState("");
  const [designs, setDesigns] = useState<PlatformCardDesign[]>([]);
  const [editing, setEditing] = useState<PlatformCardDesign | null | undefined>(undefined); // undefined = closed, null = new

  const loadCards = () => adminApi.get<{ items: Card[]; summary: Summary }>(`/api/admin/platform-cards?q=${encodeURIComponent(q)}&status=${status}`).then(setData).catch(() => setData(null));
  const loadDesigns = () => adminApi.get<PlatformCardDesign[]>("/api/admin/platform-card-designs").then(setDesigns).catch(() => setDesigns([]));
  useEffect(() => { loadCards(); loadDesigns(); /* eslint-disable-next-line */ }, [status]);

  async function disable(c: Card) { await adminApi.post(`/api/admin/platform-cards/${c.id}/disable`, { disable: c.status !== "DISABLED" }); loadCards(); }
  async function refund(c: Card) { if (!confirm(`Refund gift card ${c.code}?`)) return; await adminApi.post(`/api/admin/platform-cards/${c.id}/refund`, {}).catch((e) => alert(e instanceof Error ? e.message : "Failed")); loadCards(); }
  async function delDesign(d: PlatformCardDesign) { if (!confirm(`Delete design "${d.name}"?`)) return; await adminApi.delete(`/api/admin/platform-card-designs/${d.id}`); loadDesigns(); }

  return (
    <div>
      <div className="flex items-center justify-between">
        <h1 className="font-display text-2xl font-extrabold text-ink">Platform gift cards</h1>
        <div className="flex gap-1 rounded-full surface-2 p-1">
          {(["cards", "designs"] as const).map((t) => <button key={t} onClick={() => setTab(t)} className={`rounded-full px-4 py-1.5 text-sm font-semibold ${tab === t ? "bg-brand text-white" : "text-muted"}`}>{t === "cards" ? "Issued" : "Designs"}</button>)}
        </div>
      </div>

      {tab === "cards" ? (
        <>
          {data && (
            <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-5">
              {[["Issued", String(data.summary.issued)], ["Issued value", money(data.summary.issuedValue)], ["Redeemed", money(data.summary.redeemedValue)], ["Redemption", `${data.summary.redemptionRate}%`], ["Outstanding", money(data.summary.outstanding)]].map(([l, v]) => (
                <div key={l} className="card p-3"><p className="text-xs text-muted">{l}</p><p className="font-display text-lg font-extrabold text-ink">{v}</p></div>
              ))}
            </div>
          )}
          <div className="mt-4 flex flex-wrap gap-2">
            <form onSubmit={(e) => { e.preventDefault(); loadCards(); }} className="flex gap-2"><input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search code / name" className="input !py-2 text-sm" /><button className="btn btn-ghost px-3 py-2 text-sm">Search</button></form>
            {["", "ACTIVE", "PENDING_DELIVERY", "REDEEMED", "EXPIRED", "DISABLED", "REFUNDED"].map((s) => <button key={s} onClick={() => setStatus(s)} className={`chip !text-xs ${status === s ? "chip-active" : ""}`}>{s ? s.replace("_", " ").toLowerCase() : "all"}</button>)}
          </div>
          <div className="mt-4 space-y-2">
            {(data?.items ?? []).map((c) => (
              <div key={c.id} className="card flex flex-wrap items-center gap-2 p-3 text-sm">
                <span className="text-lg">{c.emoji}</span>
                <span className="font-mono font-semibold text-ink">{c.code}</span>
                <span className="flex-1 text-muted">{money(c.amount)}{c.status !== "REDEEMED" ? ` · ${money(c.balance)} left` : ""} · to {c.recipientName || "—"}{c.purchaserName ? ` · from ${c.purchaserName}` : ""}</span>
                <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${BADGE[c.status] ?? "bg-surface-2 text-muted"}`}>{c.status.replace("_", " ")}</span>
                {c.status !== "REDEEMED" && c.status !== "REFUNDED" && <button onClick={() => disable(c)} className={`btn btn-ghost px-3 py-1.5 text-xs ${c.status === "DISABLED" ? "" : "text-red-500"}`}>{c.status === "DISABLED" ? "Re-enable" : "Disable"}</button>}
                {c.status !== "REDEEMED" && c.status !== "REFUNDED" && <button onClick={() => refund(c)} className="btn btn-ghost px-3 py-1.5 text-xs text-amber-600">Refund</button>}
              </div>
            ))}
            {data && data.items.length === 0 && <div className="card p-8 text-center text-muted">No gift cards found.</div>}
          </div>
        </>
      ) : (
        <>
          <div className="mt-4 flex justify-end"><button onClick={() => setEditing(null)} className="btn btn-primary px-4 py-2 text-sm">+ New design</button></div>
          <div className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {designs.map((d) => (
              <div key={d.id} className="card overflow-hidden p-0">
                <div className={`flex items-center justify-between bg-gradient-to-br ${d.gradient} p-4 text-white`}>
                  <span className="text-3xl">{d.emoji}</span>
                  <span className="text-xs font-bold uppercase">{d.occasion.replace("_", " ")}</span>
                </div>
                <div className="p-3">
                  <p className="font-semibold text-ink">{d.name} {!d.active && <span className="text-xs font-normal text-red-500">· hidden</span>}</p>
                  <p className="text-xs text-muted">{money(d.minValue)}–{money(d.maxValue)} · presets {d.presets.map((p) => `$${p}`).join(" ")}</p>
                  <div className="mt-2 flex gap-2">
                    <button onClick={() => setEditing(d)} className="btn btn-ghost px-3 py-1.5 text-xs">Edit</button>
                    <button onClick={() => delDesign(d)} className="btn btn-ghost px-3 py-1.5 text-xs text-red-500">Delete</button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </>
      )}

      {editing !== undefined && <DesignModal initial={editing} onClose={() => setEditing(undefined)} onSaved={() => { setEditing(undefined); loadDesigns(); }} />}
    </div>
  );
}
