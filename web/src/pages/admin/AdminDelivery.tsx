import { FormEvent, useEffect, useState } from "react";
import { CloseIcon, PhoneIcon } from "../../components/icons";
import { adminApi, DELIVERY_REQUEST_STATUS, DELIVERY_TYPE_LABEL, formatEventDate } from "../../lib/api";
import { mapsLinkFromCoords, mapsLinkFromText } from "../../lib/maps";
import type { DeliveryRequest } from "../../types";

const STATUSES = ["REQUESTED", "ACCEPTED", "DRIVER_ASSIGNED", "PICKED_UP", "ON_THE_WAY", "DELIVERED", "CANCELLED", "REJECTED"];
const FILTERS: { key: string; label: string }[] = [
  { key: "active", label: "Active" },
  { key: "REQUESTED", label: "New" },
  { key: "DELIVERED", label: "Delivered" },
  { key: "", label: "All" },
];

export function AdminDelivery() {
  const [items, setItems] = useState<DeliveryRequest[]>([]);
  const [filter, setFilter] = useState("active");
  const [selected, setSelected] = useState<DeliveryRequest | null>(null);
  const [settingsOpen, setSettingsOpen] = useState(false);

  const load = () => {
    const p = new URLSearchParams();
    if (filter) p.set("status", filter);
    adminApi.get<DeliveryRequest[]>(`/api/admin/delivery?${p}`).then(setItems);
  };
  useEffect(() => { load(); /* eslint-disable-next-line */ }, [filter]);

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="font-display text-3xl font-extrabold text-ink">Delivery</h1>
          <p className="mt-1 text-muted">Courier requests — accept, assign a driver, set the final price and update status.</p>
        </div>
        <button onClick={() => setSettingsOpen(true)} className="btn btn-ghost px-4 py-2 text-sm">⚙ Pricing settings</button>
      </div>

      <div className="mt-4 flex flex-wrap gap-2">
        {FILTERS.map((f) => <button key={f.key} onClick={() => setFilter(f.key)} className={`chip ${filter === f.key ? "chip-active" : ""}`}>{f.label}</button>)}
      </div>

      <div className="mt-5 space-y-2">
        {items.map((r) => {
          const st = DELIVERY_REQUEST_STATUS[r.status] ?? DELIVERY_REQUEST_STATUS.REQUESTED;
          return (
            <button key={r.id} onClick={() => setSelected(r)} className="card card-hover flex w-full flex-wrap items-center gap-3 p-4 text-left">
              <div className="min-w-0 flex-1">
                <p className="font-semibold text-ink">
                  <span className="font-mono text-xs text-muted">{r.number}</span> · {r.pickupLabel} <span className="text-muted">→</span> {r.dropoffLabel}
                </p>
                <p className="truncate text-xs text-muted">{DELIVERY_TYPE_LABEL[r.type] ?? r.type} · {r.itemDescription} · {r.customerName} {r.customerPhone} · {formatEventDate(r.createdAt)}</p>
              </div>
              <span className="text-sm font-bold text-ink">{r.finalPrice != null ? `$${r.finalPrice}` : `$${r.estimatedMin}–$${r.estimatedMax}`}</span>
              <span className={`rounded-full px-2.5 py-1 text-xs font-bold ${st.cls}`}>{st.label}</span>
            </button>
          );
        })}
        {items.length === 0 && <div className="card p-12 text-center text-muted">No requests here.</div>}
      </div>

      {selected && <DetailModal request={selected} onClose={() => setSelected(null)} onSaved={() => { setSelected(null); load(); }} />}
      {settingsOpen && <SettingsModal onClose={() => setSettingsOpen(false)} />}
    </div>
  );
}

interface ActiveDriver { id: number; name: string; status: string }

function DetailModal({ request, onClose, onSaved }: { request: DeliveryRequest; onClose: () => void; onSaved: () => void }) {
  const [status, setStatus] = useState(request.status);
  const [driverName, setDriverName] = useState(request.driverName);
  const [driverPhone, setDriverPhone] = useState(request.driverPhone);
  const [finalPrice, setFinalPrice] = useState(request.finalPrice?.toString() ?? "");
  const [drivers, setDrivers] = useState<ActiveDriver[]>([]);
  const [busy, setBusy] = useState(false);

  useEffect(() => { adminApi.get<ActiveDriver[]>("/api/admin/drivers").then((all) => setDrivers(all.filter((d) => d.status === "ACTIVE"))).catch(() => {}); }, []);

  const save = async (patch: Record<string, unknown>) => {
    setBusy(true);
    try { await adminApi.patch(`/api/admin/delivery/${request.id}`, patch); onSaved(); }
    finally { setBusy(false); }
  };
  const saveAll = () => save({ status, driverName, driverPhone, finalPrice: finalPrice === "" ? null : Number(finalPrice) });
  const assignDriver = (driverId: string) => save({ driverId: driverId === "" ? null : Number(driverId) });

  const pickupLink = request.pickupLat != null && request.pickupLng != null ? mapsLinkFromCoords(request.pickupLat, request.pickupLng) : mapsLinkFromText(request.pickupLabel);
  const dropoffLink = request.dropoffLat != null && request.dropoffLng != null ? mapsLinkFromCoords(request.dropoffLat, request.dropoffLng) : mapsLinkFromText(request.dropoffLabel);

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/50 p-0 backdrop-blur-sm sm:items-center sm:p-4" onClick={onClose}>
      <div className="card pop-in max-h-[92vh] w-full max-w-lg overflow-y-auto rounded-b-none p-6 sm:rounded-3xl" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between">
          <h2 className="font-display text-xl font-extrabold text-ink">{request.number}</h2>
          <button onClick={onClose} aria-label="Close" className="text-muted hover:text-ink"><CloseIcon /></button>
        </div>
        <p className="mt-1 text-sm text-muted">{DELIVERY_TYPE_LABEL[request.type] ?? request.type} · {formatEventDate(request.createdAt)}</p>

        {request.status === "REQUESTED" && (
          <div className="mt-4 flex gap-2">
            <button disabled={busy} onClick={() => save({ status: "ACCEPTED" })} className="btn btn-primary flex-1 py-2.5">Accept</button>
            <button disabled={busy} onClick={() => save({ status: "REJECTED" })} className="btn btn-ghost flex-1 py-2.5 text-rose-500">Reject</button>
          </div>
        )}

        {/* Route */}
        <div className="mt-4 space-y-2 rounded-xl surface-2 p-4 text-sm">
          <div className="flex items-start justify-between gap-2">
            <div><p className="text-xs font-semibold uppercase text-muted">Pickup{request.pickupOutside ? " · outside" : ""}</p><p className="font-semibold text-ink">{request.pickupLabel}</p></div>
            <a href={pickupLink} target="_blank" rel="noreferrer" className="shrink-0 font-semibold text-brand">Map</a>
          </div>
          <div className="flex items-start justify-between gap-2">
            <div><p className="text-xs font-semibold uppercase text-muted">Drop-off{request.dropoffOutside ? " · outside" : ""}</p><p className="font-semibold text-ink">{request.dropoffLabel}</p></div>
            <a href={dropoffLink} target="_blank" rel="noreferrer" className="shrink-0 font-semibold text-brand">Map</a>
          </div>
          <p className="text-xs text-muted">~{request.distanceKm} km · estimate ${request.estimatedMin}–${request.estimatedMax}</p>
        </div>

        {/* Item + customer */}
        <div className="mt-3 space-y-1 text-sm">
          <p className="text-ink">📦 {request.itemDescription}</p>
          <div className="flex flex-wrap gap-2 text-xs"><span className="chip !py-0.5">{request.packageType}</span><span className="chip !py-0.5">{request.packageSize}</span><span className="chip !py-0.5">{request.urgency}</span>{request.preferredTime && <span className="chip !py-0.5">⏰ {request.preferredTime}</span>}</div>
          {request.notes && <p className="text-muted">📝 {request.notes}</p>}
          <div className="flex items-center justify-between pt-1">
            <p className="text-ink">👤 {request.customerName} · {request.customerPhone}</p>
            <a href={`tel:${request.customerPhone}`} className="btn btn-ghost px-3 py-1.5 text-xs"><PhoneIcon className="h-3.5 w-3.5" /> Call</a>
          </div>
        </div>

        {/* Proof + driver notes */}
        {(request.proofImage || request.driverNotes) && (
          <div className="mt-3 rounded-xl surface-2 p-3 text-sm">
            {request.proofImage && <img src={request.proofImage} alt="Proof of delivery" className="mb-2 max-h-40 rounded-lg object-cover" />}
            {request.driverNotes && <p className="text-muted">🗒️ {request.driverNotes}</p>}
          </div>
        )}

        {/* Manage */}
        <div className="mt-4 space-y-3 border-t border-border pt-4">
          <label className="block text-xs font-semibold text-muted">Assign driver
            <select value={request.driverId ?? ""} onChange={(e) => assignDriver(e.target.value)} className="input !mt-1">
              <option value="">{request.driverName ? `Current: ${request.driverName}` : "— Unassigned —"}</option>
              {drivers.map((d) => <option key={d.id} value={d.id}>{d.name}</option>)}
            </select>
          </label>
          <label className="block text-xs font-semibold text-muted">Status
            <select value={status} onChange={(e) => setStatus(e.target.value)} className="input !mt-1">
              {STATUSES.map((s) => <option key={s} value={s}>{DELIVERY_REQUEST_STATUS[s]?.label ?? s}</option>)}
            </select>
          </label>
          <div className="grid grid-cols-2 gap-3">
            <label className="block text-xs font-semibold text-muted">Driver name
              <input value={driverName} onChange={(e) => setDriverName(e.target.value)} placeholder="Assign driver" className="input !mt-1" />
            </label>
            <label className="block text-xs font-semibold text-muted">Driver phone
              <input value={driverPhone} onChange={(e) => setDriverPhone(e.target.value)} placeholder="Driver phone" className="input !mt-1" />
            </label>
          </div>
          <label className="block text-xs font-semibold text-muted">Final price ($)
            <input value={finalPrice} onChange={(e) => setFinalPrice(e.target.value)} inputMode="decimal" placeholder="Confirm final price" className="input !mt-1" />
          </label>
          <button disabled={busy} onClick={saveAll} className="btn btn-primary w-full py-3 disabled:opacity-60">{busy ? "Saving…" : "Save changes"}</button>
        </div>
      </div>
    </div>
  );
}

const SETTING_FIELDS: { key: string; label: string }[] = [
  { key: "baseFee", label: "Base fee ($)" },
  { key: "perKm", label: "Per km ($)" },
  { key: "minPrice", label: "Minimum price ($)" },
  { key: "sizeMediumSurcharge", label: "Medium package (+$)" },
  { key: "sizeLargeSurcharge", label: "Large package (+$)" },
  { key: "expressSurcharge", label: "Express (+$)" },
  { key: "outsideSurcharge", label: "Outside Aley, per stop (+$)" },
  { key: "nightSurcharge", label: "Late hours (+$)" },
  { key: "bandPct", label: "Estimate band (0–1)" },
];

function SettingsModal({ onClose }: { onClose: () => void }) {
  const [settings, setSettings] = useState<Record<string, number> | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => { adminApi.get<Record<string, number>>("/api/admin/delivery-settings").then(setSettings); }, []);

  async function save(e: FormEvent) {
    e.preventDefault();
    if (!settings || busy) return;
    setBusy(true);
    try { await adminApi.put("/api/admin/delivery-settings", settings); onClose(); }
    finally { setBusy(false); }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/50 p-0 backdrop-blur-sm sm:items-center sm:p-4" onClick={onClose}>
      <div className="card pop-in max-h-[92vh] w-full max-w-md overflow-y-auto rounded-b-none p-6 sm:rounded-3xl" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between">
          <h2 className="font-display text-xl font-extrabold text-ink">Delivery pricing</h2>
          <button onClick={onClose} aria-label="Close" className="text-muted hover:text-ink"><CloseIcon /></button>
        </div>
        {settings ? (
          <form onSubmit={save} className="mt-4 grid grid-cols-2 gap-3">
            {SETTING_FIELDS.map((f) => (
              <label key={f.key} className="block text-xs font-semibold text-muted">{f.label}
                <input value={settings[f.key] ?? 0} onChange={(e) => setSettings({ ...settings, [f.key]: Number(e.target.value) })} inputMode="decimal" className="input !mt-1" />
              </label>
            ))}
            <button type="submit" disabled={busy} className="btn btn-primary col-span-2 mt-2 py-3 disabled:opacity-60">{busy ? "Saving…" : "Save pricing"}</button>
          </form>
        ) : (
          <div className="mt-4 h-40 animate-pulse rounded-xl surface-2" />
        )}
      </div>
    </div>
  );
}
