import { useEffect, useMemo, useRef, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { BusinessCard } from "../components/BusinessCard";
import { HeartIcon, MapPinIcon, ShareIcon } from "../components/icons";
import { useUserAuth } from "../context/UserAuthContext";
import { userApi } from "../lib/api";
import { useFetch } from "../lib/useFetch";
import { hasMapsKey, loadGoogleMaps, mapsLinkFromCoords } from "../lib/maps";
import type { Business, CollectionDetailT } from "../types";

const ALEY = { lat: 33.8056, lng: 35.6011 };

function CollectionMap({ businesses }: { businesses: Business[] }) {
  const el = useRef<HTMLDivElement>(null);
  const map = useRef<any>(null);
  const [status, setStatus] = useState<"loading" | "ready" | "unavailable">(hasMapsKey() ? "loading" : "unavailable");
  const pins = businesses.filter((b) => b.lat != null && b.lng != null);

  useEffect(() => {
    if (!hasMapsKey()) return;
    let cancelled = false;
    loadGoogleMaps().then((maps) => {
      if (cancelled || !el.current) return;
      map.current = new maps.Map(el.current, { center: pins[0] ? { lat: pins[0].lat!, lng: pins[0].lng! } : ALEY, zoom: 13, disableDefaultUI: true, zoomControl: true });
      setStatus("ready");
    }).catch(() => !cancelled && setStatus("unavailable"));
    return () => { cancelled = true; };
  }, []); // eslint-disable-line

  useEffect(() => {
    if (status !== "ready" || !map.current || !window.google) return;
    const maps = window.google.maps;
    const bounds = new maps.LatLngBounds();
    const markers = pins.map((b) => {
      const pos = { lat: b.lat!, lng: b.lng! };
      bounds.extend(pos);
      return new maps.Marker({ position: pos, map: map.current, title: b.name, label: { text: b.category?.icon ?? "📍", fontSize: "16px" } });
    });
    if (pins.length === 1) { map.current.setCenter(pins[0] ? { lat: pins[0].lat!, lng: pins[0].lng! } : ALEY); map.current.setZoom(15); }
    else if (pins.length > 1) map.current.fitBounds(bounds, 60);
    return () => markers.forEach((m: any) => m.setMap(null));
  }, [status, businesses]); // eslint-disable-line

  if (status === "unavailable") {
    return (
      <div className="card grid gap-3 p-5 sm:grid-cols-2">
        <p className="col-span-full text-sm text-muted">Map isn't available — open any place in Google Maps:</p>
        {pins.map((b) => <a key={b.slug} href={mapsLinkFromCoords(b.lat!, b.lng!)} target="_blank" rel="noreferrer" className="flex items-center gap-2 rounded-xl surface-2 p-3"><span className="text-xl">{b.category?.icon}</span><span className="truncate text-sm font-semibold text-ink">{b.name}</span></a>)}
      </div>
    );
  }
  return <div ref={el} className="h-[60vh] w-full rounded-2xl bg-surface-2" />;
}

export function CollectionDetail() {
  const { slug } = useParams();
  const { data: c, loading } = useFetch<CollectionDetailT>(slug ? `/api/collections/${slug}` : null);
  const { user, openAuth } = useUserAuth();
  const [saved, setSaved] = useState(false);
  const [synced, setSynced] = useState(false);
  const [cat, setCat] = useState("");
  const [openNow, setOpenNow] = useState(false);
  const [sort, setSort] = useState("");
  const [view, setView] = useState<"grid" | "map">("grid");
  const [copied, setCopied] = useState(false);

  if (c && !synced) { setSaved(c.saved); setSynced(true); }

  const cats = useMemo(() => {
    const m = new Map<string, { slug: string; name: string; icon: string }>();
    for (const b of c?.businesses ?? []) if (b.category) m.set(b.category.slug, { slug: b.category.slug, name: b.category.name, icon: b.category.icon });
    return [...m.values()];
  }, [c]);
  const shown = useMemo(() => {
    let list = (c?.businesses ?? []).slice();
    if (cat) list = list.filter((b) => b.category?.slug === cat);
    if (openNow) list = list.filter((b) => b.openNow);
    if (sort === "rating") list.sort((a, b) => b.rating - a.rating);
    else if (sort === "name") list.sort((a, b) => a.name.localeCompare(b.name));
    return list;
  }, [c, cat, openNow, sort]);

  if (loading) return <div className="mx-auto max-w-3xl px-4 py-16 text-muted">Loading…</div>;
  if (!c) return <div className="mx-auto max-w-md px-4 py-24 text-center"><p className="text-lg font-semibold text-ink">Collection not found.</p><Link to="/collections" className="btn btn-primary mt-4 px-6 py-2.5">All collections</Link></div>;

  async function toggleSave() {
    if (!user) return openAuth();
    const next = !saved; setSaved(next);
    try { next ? await userApi.post(`/api/me/collections/${c!.id}/save`, {}) : await userApi.delete(`/api/me/collections/${c!.id}/save`); } catch { setSaved(!next); }
  }
  async function share() {
    const url = window.location.href;
    try { if (navigator.share) await navigator.share({ title: c!.title, url }); else { await navigator.clipboard.writeText(url); setCopied(true); setTimeout(() => setCopied(false), 1800); } } catch { /* cancelled */ }
  }

  return (
    <div>
      {/* Banner */}
      <div className="relative h-60 w-full overflow-hidden bg-surface-2 sm:h-80">
        {c.coverImage ? <img src={c.coverImage} alt="" className="h-full w-full object-cover" /> : <div className="h-full w-full bg-gradient-to-br from-brand to-brand-dark" />}
        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/30 to-transparent" />
        <div className="absolute bottom-0 left-0 right-0 mx-auto max-w-6xl p-6 text-white sm:p-8">
          <Link to="/collections" className="text-sm font-semibold text-white/80 hover:text-white">← Discover</Link>
          <h1 className="mt-2 font-display text-3xl font-extrabold sm:text-4xl">{c.emoji} {c.title}</h1>
          {c.description && <p className="mt-2 max-w-2xl text-white/90">{c.description}</p>}
          <div className="mt-4 flex gap-2">
            <button onClick={toggleSave} className={`btn px-5 py-2.5 ${saved ? "bg-rose-500 text-white" : "bg-white text-ink"}`}><HeartIcon className="h-4 w-4" filled={saved} /> {saved ? "Saved" : "Save collection"}</button>
            <button onClick={share} className="btn bg-white/15 px-5 py-2.5 text-white backdrop-blur"><ShareIcon className="h-4 w-4" /> {copied ? "Copied!" : "Share"}</button>
          </div>
        </div>
      </div>

      <div className="mx-auto max-w-6xl px-4 py-6">
        {/* Filters + view toggle */}
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-sm font-semibold text-ink">{shown.length} place{shown.length === 1 ? "" : "s"}</span>
          <button onClick={() => setOpenNow((o) => !o)} className={`chip ${openNow ? "chip-active" : ""}`}>Open now</button>
          <select value={sort} onChange={(e) => setSort(e.target.value)} className="chip cursor-pointer"><option value="">Recommended</option><option value="rating">Top rated</option><option value="name">A–Z</option></select>
          <div className="ml-auto flex gap-1 rounded-full border border-border bg-surface p-1">
            <button onClick={() => setView("grid")} className={`rounded-full px-3 py-1.5 text-sm font-semibold ${view === "grid" ? "bg-brand text-white" : "text-muted"}`}>▦ Grid</button>
            <button onClick={() => setView("map")} className={`rounded-full px-3 py-1.5 text-sm font-semibold ${view === "map" ? "bg-brand text-white" : "text-muted"}`}><MapPinIcon className="mr-1 inline h-4 w-4" />Map</button>
          </div>
        </div>
        {cats.length > 1 && (
          <div className="no-scrollbar -mx-4 mt-3 flex gap-2 overflow-x-auto px-4 pb-1">
            <button onClick={() => setCat("")} className={`chip whitespace-nowrap ${!cat ? "chip-active" : ""}`}>All</button>
            {cats.map((c2) => <button key={c2.slug} onClick={() => setCat((x) => (x === c2.slug ? "" : c2.slug))} className={`chip whitespace-nowrap ${cat === c2.slug ? "chip-active" : ""}`}>{c2.icon} {c2.name}</button>)}
          </div>
        )}

        <div className="mt-5">
          {view === "map" ? <CollectionMap businesses={shown} /> : (
            shown.length ? <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">{shown.map((b) => <BusinessCard key={b.id} business={b} showActions />)}</div>
                         : <div className="card p-16 text-center text-muted">No places match these filters.</div>
          )}
        </div>
      </div>
    </div>
  );
}
