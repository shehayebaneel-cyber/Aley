import { useEffect, useMemo, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { MapPinIcon, StarIcon } from "../components/icons";
import { hasMapsKey, loadGoogleMaps, mapsLinkFromCoords } from "../lib/maps";
import { useFetch } from "../lib/useFetch";
import type { MapPin } from "../types";

const CITY = "aley";
const ALEY = { lat: 33.8056, lng: 35.6011 };

const hasTag = (p: MapPin, ...terms: string[]) => (p.tags ?? []).some((t) => terms.some((term) => t.toLowerCase().includes(term)));

const FILTERS: { key: string; label: string; test: (p: MapPin) => boolean }[] = [
  { key: "open", label: "🟢 Open now", test: (p) => p.openNow },
  { key: "coffee", label: "☕ Coffee", test: (p) => /coffee/i.test(p.category.name) },
  { key: "restaurants", label: "🍽️ Restaurants", test: (p) => /restaurant/i.test(p.category.name) },
  { key: "parking", label: "🅿️ Parking", test: (p) => hasTag(p, "parking") },
  { key: "study", label: "📚 Study friendly", test: (p) => hasTag(p, "study", "wifi") },
  { key: "outdoor", label: "🌿 Outdoor seating", test: (p) => hasTag(p, "outdoor", "terrace") },
  { key: "family", label: "👨‍👩‍👧 Family friendly", test: (p) => hasTag(p, "family") },
  { key: "delivery", label: "🛵 Delivery", test: (p) => p.hasDelivery },
];

export function MapPage() {
  const { data: pins } = useFetch<MapPin[]>(`/api/businesses/data/map?city=${CITY}`);
  const mapEl = useRef<HTMLDivElement>(null);
  const mapRef = useRef<any>(null);
  const [status, setStatus] = useState<"loading" | "ready" | "unavailable">(hasMapsKey() ? "loading" : "unavailable");
  const [selected, setSelected] = useState<MapPin | null>(null);
  const [active, setActive] = useState<Set<string>>(new Set());

  const filtered = useMemo(() => {
    const list = pins ?? [];
    if (active.size === 0) return list;
    return list.filter((p) => [...active].every((k) => FILTERS.find((f) => f.key === k)!.test(p)));
  }, [pins, active]);

  useEffect(() => {
    if (!hasMapsKey()) return;
    let cancelled = false;
    loadGoogleMaps()
      .then((maps) => {
        if (cancelled || !mapEl.current) return;
        mapRef.current = new maps.Map(mapEl.current, { center: ALEY, zoom: 14, disableDefaultUI: true, zoomControl: true });
        setStatus("ready");
      })
      .catch(() => !cancelled && setStatus("unavailable"));
    return () => { cancelled = true; };
  }, []);

  // Re-draw markers whenever the filtered set changes.
  useEffect(() => {
    if (status !== "ready" || !mapRef.current || !window.google) return;
    const maps = window.google.maps;
    const markers = filtered.map((p) => {
      const marker = new maps.Marker({ position: { lat: p.lat, lng: p.lng }, map: mapRef.current, title: p.name, label: { text: p.category.icon, fontSize: "16px" } });
      marker.addListener("click", () => { setSelected(p); mapRef.current.panTo({ lat: p.lat, lng: p.lng }); });
      return marker;
    });
    return () => markers.forEach((m) => m.setMap(null));
  }, [status, filtered]);

  const toggle = (k: string) => setActive((prev) => { const n = new Set(prev); n.has(k) ? n.delete(k) : n.add(k); return n; });

  return (
    <div className="mx-auto max-w-7xl px-4 py-8">
      <h1 className="font-display text-3xl font-extrabold text-ink">Map of Aley</h1>
      <p className="mt-1 text-muted">{filtered.length} of {pins?.length ?? 0} businesses · tap a pin for details.</p>

      <div className="mt-4 flex flex-wrap gap-2">
        {FILTERS.map((f) => <button key={f.key} onClick={() => toggle(f.key)} className={`chip ${active.has(f.key) ? "chip-active" : ""}`}>{f.label}</button>)}
        {active.size > 0 && <button onClick={() => setActive(new Set())} className="chip text-muted">Clear</button>}
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-[1fr_20rem]">
        <div className="card overflow-hidden">
          {status === "unavailable" ? (
            <div className="grid gap-3 p-5 sm:grid-cols-2">
              <p className="col-span-full text-sm text-muted">Interactive map isn't available — here's the directory with map links:</p>
              {filtered.map((p) => (
                <a key={p.slug} href={mapsLinkFromCoords(p.lat, p.lng)} target="_blank" rel="noreferrer" className="flex items-center gap-3 rounded-xl surface-2 p-3">
                  <span className="text-xl">{p.category.icon}</span>
                  <span className="min-w-0"><span className="block truncate font-semibold text-ink">{p.name}</span><span className="text-xs text-muted">{p.category.name}</span></span>
                </a>
              ))}
            </div>
          ) : (
            <div ref={mapEl} className="h-[60vh] w-full bg-surface-2" />
          )}
        </div>

        <aside>
          {selected ? (
            <div className="card sticky top-24 overflow-hidden">
              {selected.cover && <img src={selected.cover} alt="" className="h-36 w-full object-cover" />}
              <div className="p-4">
                <span className="chip !py-0.5 !text-[11px]">{selected.category.icon} {selected.category.name}</span>
                <h3 className="mt-2 font-display text-lg font-bold text-ink">{selected.name}</h3>
                <div className="mt-1 flex items-center gap-2 text-sm">
                  <span className="inline-flex items-center gap-1 font-semibold text-ink"><StarIcon className="h-4 w-4 text-amber-400" /> {selected.rating > 0 ? selected.rating.toFixed(1) : "New"}</span>
                  <span className="text-muted">({selected.reviewCount})</span>
                  <span className={`rounded-full px-2 py-0.5 text-xs font-bold ${selected.openNow ? "bg-emerald-500/15 text-emerald-600" : "bg-red-500/15 text-red-500"}`}>{selected.openNow ? "Open" : "Closed"}</span>
                </div>
                <Link to={`/business/${selected.slug}`} className="btn btn-primary mt-4 w-full py-2.5">View profile</Link>
              </div>
            </div>
          ) : (
            <div className="card flex h-full min-h-48 flex-col items-center justify-center p-6 text-center text-muted">
              <MapPinIcon className="h-8 w-8 text-brand" />
              <p className="mt-2 text-sm">Select a pin on the map to preview a business.</p>
            </div>
          )}
        </aside>
      </div>
    </div>
  );
}
