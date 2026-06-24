import { useEffect, useRef, useState } from "react";
import { hasMapsKey, loadGoogleMaps } from "../lib/maps";

const ALEY = { lat: 33.8056, lng: 35.6011 };

/**
 * Google Maps location picker for checkout. Click or drag the marker to set the
 * delivery location; "Use my location" centres on GPS. Falls back to manual
 * lat/lng entry when no API key is configured or the map fails to load.
 */
export function MapPicker({ lat, lng, onChange }: { lat: number | null; lng: number | null; onChange: (c: { lat: number; lng: number }) => void }) {
  const el = useRef<HTMLDivElement>(null);
  const mapRef = useRef<any>(null);
  const markerRef = useRef<any>(null);
  const [status, setStatus] = useState<"loading" | "ready" | "unavailable">(hasMapsKey() ? "loading" : "unavailable");
  const onChangeRef = useRef(onChange);
  onChangeRef.current = onChange;

  useEffect(() => {
    if (!hasMapsKey()) return;
    let cancelled = false;
    loadGoogleMaps()
      .then((maps) => {
        if (cancelled || !el.current) return;
        const center = lat != null && lng != null ? { lat, lng } : ALEY;
        const map = new maps.Map(el.current, { center, zoom: lat != null ? 16 : 13, disableDefaultUI: true, zoomControl: true, gestureHandling: "greedy" });
        const marker = new maps.Marker({ position: center, map, draggable: true });
        mapRef.current = map; markerRef.current = marker;
        const set = (pos: any) => { const next = { lat: pos.lat(), lng: pos.lng() }; marker.setPosition(next); onChangeRef.current(next); };
        marker.addListener("dragend", (e: any) => set(e.latLng));
        map.addListener("click", (e: any) => set(e.latLng));
        setStatus("ready");
      })
      .catch(() => !cancelled && setStatus("unavailable"));
    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (status === "ready" && markerRef.current && mapRef.current && lat != null && lng != null) {
      const pos = { lat, lng };
      markerRef.current.setPosition(pos);
      mapRef.current.panTo(pos);
    }
  }, [lat, lng, status]);

  function useMyLocation() {
    if (!navigator.geolocation) return;
    navigator.geolocation.getCurrentPosition((p) => onChangeRef.current({ lat: p.coords.latitude, lng: p.coords.longitude }), () => {}, { enableHighAccuracy: true, timeout: 8000 });
  }

  if (status === "unavailable") {
    return (
      <div className="rounded-xl border border-dashed border-border surface-2 p-3 text-sm">
        <p className="font-semibold text-ink">📍 Pin your location (optional)</p>
        <div className="mt-2 grid grid-cols-2 gap-2">
          <input inputMode="decimal" placeholder="Latitude" value={lat ?? ""} onChange={(e) => onChange({ lat: Number(e.target.value), lng: lng ?? 0 })} className="rounded-lg border border-border bg-surface px-3 py-2 text-sm" />
          <input inputMode="decimal" placeholder="Longitude" value={lng ?? ""} onChange={(e) => onChange({ lat: lat ?? 0, lng: Number(e.target.value) })} className="rounded-lg border border-border bg-surface px-3 py-2 text-sm" />
        </div>
        <button type="button" onClick={useMyLocation} className="mt-2 text-xs font-semibold text-brand">Use my current location</button>
      </div>
    );
  }

  return (
    <div>
      <div className="flex items-center justify-between">
        <span className="text-sm font-semibold text-ink">📍 Pin your exact location</span>
        <button type="button" onClick={useMyLocation} className="text-xs font-semibold text-brand">Use my location</button>
      </div>
      <div ref={el} className="mt-2 h-48 w-full overflow-hidden rounded-xl border border-border surface-2" />
      {status === "loading" && <p className="mt-1 text-xs text-muted">Loading map…</p>}
      {lat != null && lng != null && <p className="mt-1 text-xs text-muted">Pinned at {lat.toFixed(5)}, {lng.toFixed(5)} — drag to fine-tune.</p>}
    </div>
  );
}
