import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { RequestPartModal } from "./RequestPartModal";
import { MapPinIcon, PhoneIcon, SearchIcon, StarIcon, TruckIcon, WhatsAppIcon } from "./icons";
import { useCity } from "../context/CityContext";
import { useFetch } from "../lib/useFetch";
import type { PartsMeta, PartsShop } from "../types";

function ShopCard({ s }: { s: PartsShop }) {
  const wa = s.whatsapp.replace(/[^\d]/g, "");
  return (
    <div className="card card-hover flex flex-col overflow-hidden">
      <div className="relative h-28 bg-surface-2">
        {s.cover ? <img src={s.cover} alt="" className="h-full w-full object-cover" /> : <div className="flex h-full w-full items-center justify-center text-4xl">⚙️</div>}
        <div className="absolute -bottom-6 left-4">{s.logo ? <img src={s.logo} alt="" className="h-12 w-12 rounded-xl border-2 border-surface object-cover" /> : <span className="flex h-12 w-12 items-center justify-center rounded-xl border-2 border-surface bg-brand-soft">🔧</span>}</div>
      </div>
      <div className="flex flex-1 flex-col p-4 pt-7">
        <Link to={`/business/${s.slug}`} className="font-display text-lg font-bold text-ink hover:text-brand">{s.name}</Link>
        <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-muted">
          {!!s.rating && <span className="inline-flex items-center gap-1 font-semibold text-ink"><StarIcon className="h-4 w-4 text-amber-400" /> {s.rating.toFixed(1)} <span className="font-normal">({s.reviewCount})</span></span>}
          {s.city && <span className="inline-flex items-center gap-1"><MapPinIcon className="h-4 w-4" /> {s.city.name}</span>}
        </div>
        {!!s.makes.length && <p className="mt-2 text-xs text-muted"><span className="font-semibold text-ink">Specializes in:</span> {s.makes.slice(0, 6).join(", ")}</p>}
        {!!s.brands.length && <p className="mt-1 text-xs text-muted"><span className="font-semibold text-ink">Brands:</span> {s.brands.slice(0, 5).join(", ")}</p>}
        <div className="mt-2 flex flex-wrap gap-1.5">
          {s.newParts && <span className="rounded-full bg-emerald-500/15 px-2 py-0.5 text-[11px] font-semibold text-emerald-600">New</span>}
          {s.usedParts && <span className="rounded-full bg-amber-500/15 px-2 py-0.5 text-[11px] font-semibold text-amber-600">Used</span>}
          {s.oem && <span className="rounded-full bg-sky-500/15 px-2 py-0.5 text-[11px] font-semibold text-sky-600">OEM</span>}
          {s.aftermarket && <span className="rounded-full bg-violet-500/15 px-2 py-0.5 text-[11px] font-semibold text-violet-600">Aftermarket</span>}
          {s.hasDelivery && <span className="inline-flex items-center gap-1 rounded-full bg-brand-soft px-2 py-0.5 text-[11px] font-semibold text-brand-dark"><TruckIcon className="h-3 w-3" /> Delivery</span>}
        </div>
        <div className="mt-3 flex gap-2 border-t border-border pt-3">
          {s.phone && <a href={`tel:${s.phone}`} className="btn btn-ghost flex-1 py-2 text-xs"><PhoneIcon className="h-4 w-4" /> Call</a>}
          {wa && <a href={`https://wa.me/${wa}`} target="_blank" rel="noreferrer" className="btn flex-1 bg-emerald-500 py-2 text-xs text-white"><WhatsAppIcon className="h-4 w-4" /> WhatsApp</a>}
          <Link to={`/business/${s.slug}`} className="btn btn-primary flex-1 py-2 text-xs">Profile</Link>
        </div>
      </div>
    </div>
  );
}

/** The Spare Parts directory + RFQ — used standalone (/spare-parts) and inline in Explore.
 *  `gridCols` lets the inline (sidebar) layout use fewer columns. */
export function SparePartsPanel({ gridCols = "sm:grid-cols-2 lg:grid-cols-3" }: { gridCols?: string }) {
  const { city } = useCity();
  const { data: meta } = useFetch<PartsMeta>("/api/spare-parts/meta");
  const [f, setF] = useState({ make: "", partCategory: "", condition: "", sourcing: "", delivery: false, q: "" });
  const [request, setRequest] = useState(false);

  const query = useMemo(() => {
    const p = new URLSearchParams();
    if (city) p.set("city", city);
    if (f.make) p.set("make", f.make);
    if (f.partCategory) p.set("partCategory", f.partCategory);
    if (f.condition) p.set("condition", f.condition);
    if (f.sourcing) p.set("sourcing", f.sourcing);
    if (f.delivery) p.set("delivery", "true");
    if (f.q.trim()) p.set("q", f.q.trim());
    const s = p.toString();
    return s ? `?${s}` : "";
  }, [city, f]);
  const { data: shops, loading } = useFetch<PartsShop[]>(`/api/spare-parts${query}`);
  const set = (p: Partial<typeof f>) => setF({ ...f, ...p });

  return (
    <div>
      {/* Hero with the headline RFQ CTA */}
      <div className="overflow-hidden rounded-3xl bg-gradient-to-br from-brand via-brand-dark to-brand p-6 text-white shadow-lg sm:p-8">
        <p className="text-xs font-semibold uppercase tracking-wider text-white/80">⚙️ Spare parts</p>
        <h2 className="mt-1 font-display text-2xl font-extrabold sm:text-3xl">Find any car part — without calling 10 shops</h2>
        <p className="mt-2 max-w-xl text-sm text-white/85">Browse spare-parts shops, or post ONE request and let shops come to you with price &amp; availability.</p>
        <button onClick={() => setRequest(true)} className="mt-4 rounded-full bg-white px-6 py-2.5 text-sm font-bold text-brand-dark transition hover:bg-white/90">🔧 Request a part</button>
      </div>

      {/* Filters */}
      <div className="mt-4 grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
        <div className="relative sm:col-span-2 lg:col-span-1">
          <SearchIcon className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted" />
          <input value={f.q} onChange={(e) => set({ q: e.target.value })} placeholder="Search shops, brands…" className="input !pl-9" />
        </div>
        <select value={f.make} onChange={(e) => set({ make: e.target.value })} className="input"><option value="">Any car make</option>{meta?.makes.map((m) => <option key={m}>{m}</option>)}</select>
        <select value={f.partCategory} onChange={(e) => set({ partCategory: e.target.value })} className="input"><option value="">Any part category</option>{meta?.partCategories.map((c) => <option key={c}>{c}</option>)}</select>
        <select value={f.condition} onChange={(e) => set({ condition: e.target.value })} className="input"><option value="">New or used</option><option value="NEW">New parts</option><option value="USED">Used parts</option></select>
      </div>
      <div className="mt-2 flex flex-wrap gap-2">
        <button onClick={() => set({ sourcing: f.sourcing === "OEM" ? "" : "OEM" })} className={`chip ${f.sourcing === "OEM" ? "chip-active" : ""}`}>OEM</button>
        <button onClick={() => set({ sourcing: f.sourcing === "AFTERMARKET" ? "" : "AFTERMARKET" })} className={`chip ${f.sourcing === "AFTERMARKET" ? "chip-active" : ""}`}>Aftermarket</button>
        <button onClick={() => set({ delivery: !f.delivery })} className={`chip ${f.delivery ? "chip-active" : ""}`}>🛵 Delivers</button>
      </div>
      <div className="no-scrollbar -mx-4 mt-3 flex gap-2 overflow-x-auto px-4 pb-1">
        {["Mercedes", "BMW", "Hyundai", "Toyota", "Nissan", "Kia", "Honda", "Ford", "Chevrolet"].map((m) => (
          <button key={m} onClick={() => set({ make: f.make === m ? "" : m })} className={`chip whitespace-nowrap ${f.make === m ? "chip-active" : ""}`}>{m}</button>
        ))}
      </div>

      {loading ? (
        <div className={`mt-5 grid gap-5 ${gridCols}`}>{Array.from({ length: 6 }).map((_, i) => <div key={i} className="card h-64 animate-pulse" />)}</div>
      ) : shops && shops.length ? (
        <>
          <p className="mt-5 text-sm text-muted">{shops.length} spare-parts {shops.length === 1 ? "shop" : "shops"}</p>
          <div className={`mt-3 grid gap-5 ${gridCols}`}>{shops.map((s) => <ShopCard key={s.id} s={s} />)}</div>
        </>
      ) : (
        <div className="card mt-6 p-12 text-center">
          <p className="text-lg font-semibold text-ink">No shops match these filters.</p>
          <p className="mt-1 text-muted">Try clearing a filter — or just post a request and let shops reply.</p>
          <button onClick={() => setRequest(true)} className="btn btn-primary mt-4 px-6 py-2.5">Request a part</button>
        </div>
      )}

      {request && <RequestPartModal onClose={() => setRequest(false)} />}
    </div>
  );
}
