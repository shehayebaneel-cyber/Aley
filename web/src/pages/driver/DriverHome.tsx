import { useCallback, useEffect, useState } from "react";
import { ImageField } from "../../components/ImageField";
import { MapPinIcon, PhoneIcon, TruckIcon, WhatsAppIcon } from "../../components/icons";
import { useDriverAuth } from "../../context/DriverAuthContext";
import { DELIVERY_REQUEST_STATUS, driverApi, formatEventDate } from "../../lib/api";
import { mapsLinkFromCoords, mapsLinkFromText } from "../../lib/maps";
import { useTitle } from "../../lib/useTitle";
import type { DriverJob } from "../../types";

const digits = (p: string) => p.replace(/[^\d]/g, "");
const point = (label: string, lat: number | null, lng: number | null) => (lat != null && lng != null ? `${lat},${lng}` : label);
const routeLink = (j: DriverJob) =>
  `https://www.google.com/maps/dir/?api=1&origin=${encodeURIComponent(point(j.pickupLabel, j.pickupLat, j.pickupLng))}&destination=${encodeURIComponent(point(j.dropoffLabel, j.dropoffLat, j.dropoffLng))}`;
const mapLink = (label: string, lat: number | null, lng: number | null) => (lat != null && lng != null ? mapsLinkFromCoords(lat, lng) : mapsLinkFromText(label));
const base = (j: DriverJob) => (j.kind === "order" ? `/api/driver/orders/${j.id}` : `/api/driver/deliveries/${j.id}`);

export function DriverHome() {
  useTitle("Driver dashboard");
  const { driver, stats, refresh } = useDriverAuth();
  const [tab, setTab] = useState<"available" | "active" | "history">("available");
  const [available, setAvailable] = useState<DriverJob[]>([]);
  const [active, setActive] = useState<DriverJob[]>([]);
  const [history, setHistory] = useState<DriverJob[]>([]);

  const load = useCallback(() => {
    driverApi.get<DriverJob[]>("/api/driver/available").then(setAvailable).catch(() => {});
    driverApi.get<DriverJob[]>("/api/driver/deliveries?filter=active").then(setActive).catch(() => {});
    driverApi.get<DriverJob[]>("/api/driver/deliveries?filter=history").then(setHistory).catch(() => {});
    refresh();
  }, [refresh]);
  useEffect(() => {
    load();
    const t = setInterval(load, 15000); // keep the pool fresh
    return () => clearInterval(t);
  }, [load]);

  const pending = driver?.status === "PENDING";
  const suspended = driver?.status === "SUSPENDED";
  const list = tab === "available" ? available : tab === "active" ? active : history;

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="font-display text-2xl font-extrabold text-ink">Hi {driver?.name?.split(" ")[0]} 👋</h1>
          <p className="text-sm text-muted">{driver?.vehicle || "Driver"} · {driver?.phone}</p>
        </div>
        {stats && (
          <div className="flex gap-3">
            {[{ v: stats.active, l: "Active" }, { v: stats.delivered, l: "Delivered" }, { v: `$${stats.earnings}`, l: `Earnings (${100 - stats.commissionPct}%)` }].map((s) => (
              <div key={s.l} className="card px-4 py-2 text-center"><p className="font-display text-xl font-extrabold text-ink">{s.v}</p><p className="text-[11px] text-muted">{s.l}</p></div>
            ))}
          </div>
        )}
      </div>

      {pending && <div className="card mt-5 border-l-4 border-amber-400 p-4 text-sm font-semibold text-amber-600">Your account is awaiting admin approval. You'll be able to accept deliveries once approved.</div>}
      {suspended && <div className="card mt-5 border-l-4 border-rose-500 p-4 text-sm font-semibold text-rose-500">Your account is suspended. Please contact the admin.</div>}

      <div className="mt-5 flex gap-2">
        <button onClick={() => setTab("available")} className={`chip ${tab === "available" ? "chip-active" : ""}`}>Available ({available.length})</button>
        <button onClick={() => setTab("active")} className={`chip ${tab === "active" ? "chip-active" : ""}`}>My deliveries ({active.length})</button>
        <button onClick={() => setTab("history")} className={`chip ${tab === "history" ? "chip-active" : ""}`}>History ({history.length})</button>
      </div>

      <div className="mt-5 space-y-4">
        {list.map((j) => <JobCard key={`${j.kind}-${j.id}`} j={j} tab={tab} canAct={driver?.status === "ACTIVE"} onChange={load} />)}
        {list.length === 0 && (
          <div className="card p-12 text-center text-muted">
            {tab === "available" ? "No open jobs right now. New restaurant orders and courier requests appear here." : tab === "active" ? "No active deliveries — accept one from Available." : "No completed deliveries yet."}
          </div>
        )}
      </div>
    </div>
  );
}

function JobCard({ j, tab, canAct, onChange }: { j: DriverJob; tab: string; canAct: boolean; onChange: () => void }) {
  const [notes, setNotes] = useState(j.driverNotes);
  const [proof, setProof] = useState<string | null>(j.proofImage);
  const [busy, setBusy] = useState(false);
  const st = DELIVERY_REQUEST_STATUS[j.statusKey] ?? DELIVERY_REQUEST_STATUS.REQUESTED;

  const act = async (fn: () => Promise<unknown>) => { setBusy(true); try { await fn(); onChange(); } finally { setBusy(false); } };
  const accept = () => act(() => driverApi.post(`${base(j)}/accept`, {}));
  const release = () => { if (confirm("Release this delivery back to the pool?")) act(() => driverApi.post(`${base(j)}/reject`, {})); };
  const setStatus = (status: string) => act(() => driverApi.patch(base(j), { status }));
  const cancel = () => { if (confirm("Report an issue / cancel this delivery?")) setStatus("CANCELLED"); };
  const saveNotes = () => act(() => driverApi.patch(base(j), { driverNotes: notes }));
  const saveProof = (url: string | null) => { setProof(url); act(() => driverApi.patch(base(j), { proofImage: url })); };

  return (
    <div className="card p-5">
      <div className="flex flex-wrap items-center gap-2">
        <span className="font-mono text-xs text-muted">{j.number}</span>
        <span className="chip !py-0.5 !text-[11px]">{j.typeLabel}</span>
        {j.urgency === "EXPRESS" && <span className="rounded-full bg-amber-400/20 px-2 py-0.5 text-[11px] font-bold text-amber-600">Express</span>}
        <span className={`ml-auto rounded-full px-2.5 py-1 text-xs font-bold ${st.cls}`}>{st.label}</span>
      </div>

      {/* Route */}
      <div className="mt-3 space-y-2 text-sm">
        <div className="flex items-start gap-2">
          <span>📍</span>
          <div className="flex-1"><p className="text-xs uppercase text-muted">Pickup{j.pickupOutside ? " · outside" : ""}</p><p className="font-semibold text-ink">{j.pickupLabel}</p></div>
          <a href={mapLink(j.pickupLabel, j.pickupLat, j.pickupLng)} target="_blank" rel="noreferrer" className="text-xs font-semibold text-brand">Map</a>
        </div>
        <div className="flex items-start gap-2">
          <span>🏁</span>
          <div className="flex-1"><p className="text-xs uppercase text-muted">Drop-off{j.dropoffOutside ? " · outside" : ""}</p><p className="font-semibold text-ink">{j.dropoffLabel}</p></div>
          <a href={mapLink(j.dropoffLabel, j.dropoffLat, j.dropoffLng)} target="_blank" rel="noreferrer" className="text-xs font-semibold text-brand">Map</a>
        </div>
      </div>

      <p className="mt-3 text-sm text-ink">📦 {j.itemDescription}</p>
      <div className="mt-1 flex flex-wrap gap-2 text-[11px]">
        <span className="chip !py-0.5">{j.packageType}</span>
        {j.packageSize && <span className="chip !py-0.5">{j.packageSize}</span>}
        {j.preferredTime && <span className="chip !py-0.5">⏰ {j.preferredTime}</span>}
        {j.distanceKm > 0 && <span className="chip !py-0.5">~{j.distanceKm} km</span>}
      </div>
      {j.notes && <p className="mt-2 text-sm text-muted">📝 {j.notes}</p>}
      <p className="mt-2 text-sm font-bold text-ink">{j.amountLabel}</p>

      {/* Contacts + route (for accepted/active) */}
      {tab !== "available" && (
        <div className="mt-3 flex flex-wrap gap-2 border-t border-border pt-3">
          <a href={routeLink(j)} target="_blank" rel="noreferrer" className="btn btn-primary px-3 py-1.5 text-xs"><MapPinIcon className="h-3.5 w-3.5" /> Open route</a>
          <a href={`tel:${j.customerPhone}`} className="btn btn-ghost px-3 py-1.5 text-xs"><PhoneIcon className="h-3.5 w-3.5" /> Customer</a>
          {j.customerPhone && <a href={`https://wa.me/${digits(j.customerPhone)}`} target="_blank" rel="noreferrer" className="btn px-3 py-1.5 text-xs bg-emerald-500 text-white"><WhatsAppIcon className="h-3.5 w-3.5" /> Customer</a>}
          {j.pickupPhone && <a href={`tel:${j.pickupPhone}`} className="btn btn-ghost px-3 py-1.5 text-xs"><PhoneIcon className="h-3.5 w-3.5" /> Pickup</a>}
          {j.pickupPhone && <a href={`https://wa.me/${digits(j.pickupPhone)}`} target="_blank" rel="noreferrer" className="btn px-3 py-1.5 text-xs bg-emerald-500 text-white"><WhatsAppIcon className="h-3.5 w-3.5" /> Pickup</a>}
        </div>
      )}

      {/* Per-business pickups (marketplace orders) */}
      {tab !== "available" && j.businesses.length > 0 && (
        <div className="mt-2 space-y-1">
          {j.businesses.map((b, i) => (
            <div key={i} className="flex items-center gap-2 rounded-lg surface-2 px-3 py-1.5 text-xs">
              <span className="min-w-0 flex-1 truncate text-ink">🏪 {b.name}</span>
              <a href={mapLink(`${b.name} ${b.address}`, b.lat, b.lng)} target="_blank" rel="noreferrer" className="font-semibold text-brand">Map</a>
              {b.phone && <a href={`tel:${b.phone}`} className="font-semibold text-brand">Call</a>}
            </div>
          ))}
        </div>
      )}

      {/* Actions */}
      {tab === "available" && (
        <button disabled={!canAct || busy || !j.canAccept} onClick={accept} className="btn btn-primary mt-3 w-full py-2.5 disabled:opacity-60"><TruckIcon className="h-4 w-4" /> Accept delivery</button>
      )}

      {tab === "active" && (
        <div className="mt-3 space-y-3 border-t border-border pt-3">
          <div className="flex flex-wrap gap-2">
            {j.next && <button disabled={busy} onClick={() => setStatus(j.next!.status)} className="btn btn-primary px-4 py-2 text-sm disabled:opacity-60">{j.next.label}</button>}
            <button disabled={busy} onClick={release} className="btn btn-ghost px-3 py-2 text-sm">Release</button>
            <button disabled={busy} onClick={cancel} className="btn btn-ghost px-3 py-2 text-sm text-rose-500">Report issue</button>
          </div>
          {j.supportsProof && (
            <>
              <div>
                <label className="text-xs font-semibold text-muted">Proof of delivery (optional)</label>
                <ImageField value={proof} onChange={saveProof} label="proof photo" uploadWith={driverApi} aspect="aspect-[4/3]" />
              </div>
              <div>
                <label className="text-xs font-semibold text-muted">Delivery notes</label>
                <textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={2} placeholder="e.g. left with neighbour, paid shop $120…" className="input !mt-1" />
                <button disabled={busy} onClick={saveNotes} className="btn btn-ghost mt-1 px-3 py-1.5 text-xs">Save notes</button>
              </div>
            </>
          )}
        </div>
      )}

      {tab === "history" && (
        <p className="mt-3 border-t border-border pt-3 text-xs text-muted">{formatEventDate(j.createdAt)}{j.proofImage ? " · proof attached" : ""}{j.driverNotes ? ` · “${j.driverNotes}”` : ""}</p>
      )}
    </div>
  );
}
