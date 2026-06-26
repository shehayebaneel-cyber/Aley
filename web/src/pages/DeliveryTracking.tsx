import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { CheckIcon, MapPinIcon, PhoneIcon, TruckIcon } from "../components/icons";
import { DELIVERY_REQUEST_STATUS, DELIVERY_REQUEST_STEPS, DELIVERY_TYPE_LABEL, formatEventDate } from "../lib/api";
import { api } from "../lib/api";
import { mapsLinkFromCoords, mapsLinkFromText } from "../lib/maps";
import { useTitle } from "../lib/useTitle";
import type { DeliveryRequest } from "../types";

export function DeliveryTracking() {
  const { number } = useParams();
  useTitle(`Delivery ${number}`);
  const [r, setR] = useState<DeliveryRequest | null>(null);
  const [err, setErr] = useState("");

  const load = () => api.get<DeliveryRequest>(`/api/delivery/track/${number}`).then(setR).catch((e) => setErr(e.message));
  useEffect(() => {
    load();
    const t = setInterval(load, 15000);
    return () => clearInterval(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [number]);

  if (err) return <div className="mx-auto max-w-md px-4 py-24 text-center"><p className="text-lg font-semibold text-ink">Delivery not found.</p><Link to="/delivery" className="mt-3 inline-block font-semibold text-brand">← New delivery</Link></div>;
  if (!r) return <div className="mx-auto max-w-2xl px-4 py-16"><div className="card h-72 animate-pulse" /></div>;

  const dead = r.status === "CANCELLED" || r.status === "REJECTED";
  const step = DELIVERY_REQUEST_STEPS.indexOf(r.status);
  const st = DELIVERY_REQUEST_STATUS[r.status] ?? DELIVERY_REQUEST_STATUS.REQUESTED;
  const pickupLink = r.pickupLat != null && r.pickupLng != null ? mapsLinkFromCoords(r.pickupLat, r.pickupLng) : mapsLinkFromText(r.pickupLabel);
  const dropoffLink = r.dropoffLat != null && r.dropoffLng != null ? mapsLinkFromCoords(r.dropoffLat, r.dropoffLng) : mapsLinkFromText(r.dropoffLabel);

  return (
    <div className="mx-auto max-w-2xl px-4 py-8">
      <div className="text-center">
        <span className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-brand-soft text-brand-dark"><TruckIcon className="h-7 w-7" /></span>
        <h1 className="mt-3 font-display text-2xl font-extrabold text-ink">Delivery {r.number}</h1>
        <p className="text-muted">Requested {formatEventDate(r.createdAt)} · {DELIVERY_TYPE_LABEL[r.type] ?? r.type}</p>
        <span className={`mt-2 inline-block rounded-full px-3 py-1 text-sm font-bold ${st.cls}`}>{st.label}</span>
      </div>

      {/* Progress */}
      {!dead ? (
        <div className="card mt-6 overflow-x-auto p-5">
          <div className="flex min-w-[480px] items-center justify-between">
            {DELIVERY_REQUEST_STEPS.map((s, i) => (
              <div key={s} className="flex flex-1 flex-col items-center text-center">
                <span className={`flex h-8 w-8 items-center justify-center rounded-full text-xs font-bold ${i <= step ? "bg-brand text-white" : "surface-2 text-muted"}`}>{i < step ? <CheckIcon className="h-4 w-4" /> : i + 1}</span>
                <span className={`mt-1 text-[11px] ${i <= step ? "font-semibold text-ink" : "text-muted"}`}>{DELIVERY_REQUEST_STATUS[s].label}</span>
              </div>
            ))}
          </div>
        </div>
      ) : (
        <div className="card mt-6 p-4 text-center font-semibold text-rose-500">This request was {r.status === "REJECTED" ? "rejected" : "cancelled"}.</div>
      )}

      {/* Driver */}
      {r.driverName && !dead && (
        <div className="card mt-4 flex items-center gap-3 p-4">
          <span className="flex h-10 w-10 items-center justify-center rounded-full bg-brand-soft text-lg">🛵</span>
          <div className="flex-1">
            <p className="text-sm text-muted">Your driver</p>
            <p className="font-semibold text-ink">{r.driverName}</p>
          </div>
          {r.driverPhone && <a href={`tel:${r.driverPhone}`} className="btn btn-ghost px-3 py-2 text-sm"><PhoneIcon className="h-4 w-4" /> Call</a>}
        </div>
      )}

      {/* Route */}
      <div className="card mt-4 p-5">
        <div className="space-y-3">
          <div className="flex items-start gap-3">
            <span className="mt-0.5 text-lg">📍</span>
            <div className="flex-1">
              <p className="text-xs font-semibold uppercase tracking-wide text-muted">Pickup{r.pickupOutside ? " · outside Aley" : ""}</p>
              <p className="font-semibold text-ink">{r.pickupLabel}</p>
            </div>
            <a href={pickupLink} target="_blank" rel="noreferrer" className="text-sm font-semibold text-brand">Map</a>
          </div>
          <div className="ml-2 border-l-2 border-dashed border-border pl-5 text-xs text-muted">~{r.distanceKm} km</div>
          <div className="flex items-start gap-3">
            <span className="mt-0.5 text-lg">🏁</span>
            <div className="flex-1">
              <p className="text-xs font-semibold uppercase tracking-wide text-muted">Drop-off{r.dropoffOutside ? " · outside Aley" : ""}</p>
              <p className="font-semibold text-ink">{r.dropoffLabel}</p>
            </div>
            <a href={dropoffLink} target="_blank" rel="noreferrer" className="text-sm font-semibold text-brand">Map</a>
          </div>
        </div>
      </div>

      {/* Details + price */}
      <div className="card mt-4 p-5">
        <p className="flex items-center gap-2 text-sm text-ink"><MapPinIcon className="h-4 w-4 text-brand" /> {r.itemDescription}</p>
        <div className="mt-2 flex flex-wrap gap-2 text-xs">
          <span className="chip !py-0.5">{r.packageType}</span>
          <span className="chip !py-0.5">{r.packageSize}</span>
          <span className="chip !py-0.5">{r.urgency === "EXPRESS" ? "Express" : "Standard"}</span>
          {r.preferredTime && <span className="chip !py-0.5">⏰ {r.preferredTime}</span>}
        </div>
        <dl className="mt-4 space-y-1.5 border-t border-border pt-3 text-sm">
          <div className="flex justify-between"><dt className="text-muted">Estimated price</dt><dd className="font-semibold text-ink">${r.estimatedMin}–${r.estimatedMax}</dd></div>
          {r.finalPrice != null && <div className="flex justify-between"><dt className="text-muted">Final price</dt><dd className="font-extrabold text-ink">${r.finalPrice}</dd></div>}
        </dl>
        {r.finalPrice == null && <p className="mt-3 text-xs text-muted">The team will confirm the final price before pickup.</p>}
      </div>

      <p className="mt-4 text-center text-xs text-muted">This page updates automatically. <Link to="/delivery" className="font-semibold text-brand">Request another delivery</Link></p>
    </div>
  );
}
