import { FormEvent, useEffect, useState } from "react";
import { CloseIcon, TrashIcon } from "../../components/icons";
import { adminApi, DELIVERY_REQUEST_STATUS, formatEventDate } from "../../lib/api";
import type { DeliveryRequest } from "../../types";

interface DriverRow {
  id: number; name: string; email: string | null; phone: string; vehicle: string;
  status: string; commissionRate: number; createdAt: string; deliveries: number; completed: number; earnings: number;
}
const STATUS_CLS: Record<string, string> = {
  ACTIVE: "bg-emerald-500/15 text-emerald-600",
  PENDING: "bg-amber-400/20 text-amber-600",
  SUSPENDED: "bg-rose-400/20 text-rose-500",
};

export function AdminDrivers() {
  const [drivers, setDrivers] = useState<DriverRow[]>([]);
  const [filter, setFilter] = useState("");
  const [creating, setCreating] = useState(false);
  const [detailId, setDetailId] = useState<number | null>(null);

  const load = () => adminApi.get<DriverRow[]>("/api/admin/drivers").then(setDrivers);
  useEffect(() => { load(); }, []);

  const patch = async (id: number, data: Record<string, unknown>) => { await adminApi.patch(`/api/admin/drivers/${id}`, data); load(); };
  const remove = async (id: number) => { if (confirm("Delete this driver account?")) { await adminApi.delete(`/api/admin/drivers/${id}`); load(); } };

  const shown = filter ? drivers.filter((d) => d.status === filter) : drivers;
  const counts = { PENDING: drivers.filter((d) => d.status === "PENDING").length, ACTIVE: drivers.filter((d) => d.status === "ACTIVE").length };

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="font-display text-3xl font-extrabold text-ink">Drivers</h1>
          <p className="mt-1 text-muted">Approve applicants, manage accounts, and track earnings.{counts.PENDING ? ` · ${counts.PENDING} awaiting approval` : ""}</p>
        </div>
        <button onClick={() => setCreating(true)} className="btn btn-primary px-5 py-2.5">+ Add driver</button>
      </div>

      <div className="mt-4 flex flex-wrap gap-2">
        {["", "PENDING", "ACTIVE", "SUSPENDED"].map((s) => (
          <button key={s || "all"} onClick={() => setFilter(s)} className={`chip ${filter === s ? "chip-active" : ""}`}>{s || "All"}{s === "PENDING" && counts.PENDING ? ` (${counts.PENDING})` : ""}</button>
        ))}
      </div>

      <div className="mt-5 space-y-2">
        {shown.map((d) => (
          <div key={d.id} className="card flex flex-wrap items-center gap-3 p-4">
            <button onClick={() => setDetailId(d.id)} className="min-w-0 flex-1 text-left">
              <p className="font-semibold text-ink">{d.name} <span className={`ml-1 rounded-full px-2 py-0.5 text-[10px] font-bold ${STATUS_CLS[d.status] ?? ""}`}>{d.status}</span></p>
              <p className="truncate text-xs text-muted">{d.phone}{d.email ? ` · ${d.email}` : ""}{d.vehicle ? ` · ${d.vehicle}` : ""} · {d.completed} completed · ${d.earnings} earned</p>
            </button>
            {d.status === "PENDING" && <button onClick={() => patch(d.id, { status: "ACTIVE" })} className="btn btn-primary px-3 py-1.5 text-xs">Approve</button>}
            {d.status === "ACTIVE" && <button onClick={() => patch(d.id, { status: "SUSPENDED" })} className="chip">Suspend</button>}
            {d.status === "SUSPENDED" && <button onClick={() => patch(d.id, { status: "ACTIVE" })} className="btn btn-primary px-3 py-1.5 text-xs">Reactivate</button>}
            <button onClick={() => remove(d.id)} className="btn btn-ghost h-9 w-9 !p-0 text-red-500"><TrashIcon className="h-4 w-4" /></button>
          </div>
        ))}
        {shown.length === 0 && <div className="card p-12 text-center text-muted">No drivers here.</div>}
      </div>

      {creating && <CreateModal onClose={() => setCreating(false)} onSaved={() => { setCreating(false); load(); }} />}
      {detailId != null && <DetailModal id={detailId} onClose={() => setDetailId(null)} onChanged={load} />}
    </div>
  );
}

function CreateModal({ onClose, onSaved }: { onClose: () => void; onSaved: () => void }) {
  const [form, setForm] = useState({ name: "", phone: "", email: "", vehicle: "", commissionRate: "", password: "" });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  async function submit(e: FormEvent) {
    e.preventDefault();
    if (busy) return;
    setBusy(true); setError("");
    try { await adminApi.post("/api/admin/drivers", { ...form, commissionRate: Number(form.commissionRate) || 0 }); onSaved(); }
    catch (err) { setError(err instanceof Error ? err.message : "Couldn't create driver."); setBusy(false); }
  }

  return (
    <Modal title="Add driver" onClose={onClose}>
      <form onSubmit={submit} className="mt-4 space-y-3">
        <input required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="Driver name" className="input" />
        <div className="grid grid-cols-2 gap-3">
          <input required value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} placeholder="Phone" className="input" />
          <input value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} placeholder="Email (optional)" className="input" />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <input value={form.vehicle} onChange={(e) => setForm({ ...form, vehicle: e.target.value })} placeholder="Vehicle" className="input" />
          <input value={form.commissionRate} onChange={(e) => setForm({ ...form, commissionRate: e.target.value })} inputMode="decimal" placeholder="Commission % (0 = default)" className="input" />
        </div>
        <input required type="password" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} placeholder="Password (6+ chars)" className="input" />
        {error && <p className="rounded-lg bg-red-500/10 px-3 py-2 text-sm font-medium text-red-500">{error}</p>}
        <button type="submit" disabled={busy} className="btn btn-primary w-full py-3 disabled:opacity-60">{busy ? "Creating…" : "Create driver"}</button>
      </form>
    </Modal>
  );
}

function DetailModal({ id, onClose, onChanged }: { id: number; onClose: () => void; onChanged: () => void }) {
  const [data, setData] = useState<{ driver: DriverRow; earnings: { commissionPct: number; completed: number; net: number }; deliveries: DeliveryRequest[] } | null>(null);
  const [commission, setCommission] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);

  const load = () => adminApi.get<typeof data>(`/api/admin/drivers/${id}`).then((d) => { setData(d); setCommission(String(d!.driver.commissionRate)); });
  useEffect(() => { load(); /* eslint-disable-next-line */ }, [id]);

  const save = async (extra: Record<string, unknown> = {}) => {
    setBusy(true);
    try { await adminApi.patch(`/api/admin/drivers/${id}`, { commissionRate: Number(commission) || 0, ...(password ? { password } : {}), ...extra }); setPassword(""); await load(); onChanged(); }
    finally { setBusy(false); }
  };

  return (
    <Modal title={data?.driver.name ?? "Driver"} onClose={onClose}>
      {!data ? <div className="mt-4 h-40 animate-pulse rounded-xl surface-2" /> : (
        <div className="mt-4 space-y-4">
          <div className="grid grid-cols-3 gap-2 text-center">
            <div className="card p-3"><p className="font-display text-xl font-extrabold text-ink">{data.earnings.completed}</p><p className="text-[11px] text-muted">Completed</p></div>
            <div className="card p-3"><p className="font-display text-xl font-extrabold text-ink">${data.earnings.net}</p><p className="text-[11px] text-muted">Earned</p></div>
            <div className="card p-3"><p className="font-display text-xl font-extrabold text-ink">{data.earnings.commissionPct}%</p><p className="text-[11px] text-muted">Commission</p></div>
          </div>
          <p className="text-sm text-muted">{data.driver.phone}{data.driver.email ? ` · ${data.driver.email}` : ""}{data.driver.vehicle ? ` · ${data.driver.vehicle}` : ""}</p>

          <div className="space-y-2 border-t border-border pt-3">
            <label className="block text-xs font-semibold text-muted">Commission % (0 = platform default)
              <input value={commission} onChange={(e) => setCommission(e.target.value)} inputMode="decimal" className="input !mt-1" />
            </label>
            <label className="block text-xs font-semibold text-muted">Reset password (optional)
              <input value={password} onChange={(e) => setPassword(e.target.value)} type="password" placeholder="New password" className="input !mt-1" />
            </label>
            <button disabled={busy} onClick={() => save()} className="btn btn-primary w-full py-2.5 disabled:opacity-60">{busy ? "Saving…" : "Save"}</button>
          </div>

          <div>
            <p className="text-sm font-bold text-ink">Deliveries ({data.deliveries.length})</p>
            <div className="mt-2 max-h-56 space-y-1.5 overflow-y-auto">
              {data.deliveries.map((r) => {
                const st = DELIVERY_REQUEST_STATUS[r.status] ?? DELIVERY_REQUEST_STATUS.REQUESTED;
                return (
                  <div key={r.id} className="flex items-center gap-2 rounded-lg surface-2 px-3 py-2 text-xs">
                    <span className="font-mono text-muted">{r.number}</span>
                    <span className="min-w-0 flex-1 truncate text-ink">{r.pickupLabel} → {r.dropoffLabel}</span>
                    <span className="text-muted">{formatEventDate(r.createdAt)}</span>
                    <span className={`rounded-full px-2 py-0.5 font-bold ${st.cls}`}>{st.label}</span>
                  </div>
                );
              })}
              {data.deliveries.length === 0 && <p className="text-xs text-muted">No deliveries yet.</p>}
            </div>
          </div>
        </div>
      )}
    </Modal>
  );
}

function Modal({ title, onClose, children }: { title: string; onClose: () => void; children: React.ReactNode }) {
  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/50 p-0 backdrop-blur-sm sm:items-center sm:p-4" onClick={onClose}>
      <div className="card pop-in max-h-[92vh] w-full max-w-lg overflow-y-auto rounded-b-none p-6 sm:rounded-3xl" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between">
          <h2 className="font-display text-xl font-extrabold text-ink">{title}</h2>
          <button onClick={onClose} aria-label="Close" className="text-muted hover:text-ink"><CloseIcon /></button>
        </div>
        {children}
      </div>
    </div>
  );
}
