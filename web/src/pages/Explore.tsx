import { useMemo } from "react";
import { useSearchParams } from "react-router-dom";
import { BusinessCard } from "../components/BusinessCard";
import { SearchIcon } from "../components/icons";
import { useFetch } from "../lib/useFetch";
import type { Business, Category } from "../types";

const CITY = "aley";

const SORTS = [
  { key: "", label: "Recommended" },
  { key: "rating", label: "Top rated" },
  { key: "reviews", label: "Most reviewed" },
  { key: "newest", label: "Newest" },
  { key: "name", label: "A–Z" },
];

export function Explore() {
  const [params, setParams] = useSearchParams();
  const { data: categories } = useFetch<Category[]>(`/api/categories?city=${CITY}`);

  const set = (key: string, value: string) => {
    const next = new URLSearchParams(params);
    if (value) next.set(key, value);
    else next.delete(key);
    setParams(next, { replace: true });
  };
  const toggle = (key: string) => set(key, params.get(key) === "true" ? "" : "true");

  const query = useMemo(() => {
    const p = new URLSearchParams(params);
    p.set("city", CITY);
    return p.toString();
  }, [params]);

  const { data: businesses, loading } = useFetch<Business[]>(`/api/businesses?${query}`);
  const activeCategory = params.get("category") ?? "";
  const cats = categories ?? [];

  return (
    <div className="mx-auto max-w-7xl px-4 py-8">
      <h1 className="font-display text-3xl font-extrabold text-ink">Explore Aley</h1>
      <p className="mt-1 text-muted">{loading ? "Loading…" : `${businesses?.length ?? 0} places found`}</p>

      <div className="mt-6 grid gap-6 lg:grid-cols-[15rem_1fr]">
        {/* ---- Category sidebar (desktop) ---- */}
        <aside className="hidden lg:block">
          <div className="sticky top-24">
            <p className="mb-2 px-2 text-xs font-bold uppercase tracking-wide text-muted">Categories</p>
            <div className="max-h-[72vh] space-y-0.5 overflow-y-auto pr-1">
              <CatRow active={!activeCategory} icon="🗂️" name="All categories" onClick={() => set("category", "")} />
              {cats.map((c) => (
                <CatRow key={c.id} active={activeCategory === c.slug} icon={c.icon} name={c.name} count={c.count} onClick={() => set("category", c.slug)} />
              ))}
            </div>
          </div>
        </aside>

        {/* ---- Main column ---- */}
        <div>
          {/* Search */}
          <div className="relative">
            <SearchIcon className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted" />
            <input defaultValue={params.get("q") ?? ""} onChange={(e) => set("q", e.target.value)} placeholder="Search businesses, food, services…" className="input !pl-9" />
          </div>

          {/* Category strip (mobile only) */}
          <div className="mt-3 flex gap-2 overflow-x-auto pb-1 lg:hidden">
            <button onClick={() => set("category", "")} className={`chip whitespace-nowrap ${!activeCategory ? "chip-active" : ""}`}>All</button>
            {cats.map((c) => (
              <button key={c.id} onClick={() => set("category", c.slug)} className={`chip whitespace-nowrap ${activeCategory === c.slug ? "chip-active" : ""}`}>{c.icon} {c.name}</button>
            ))}
          </div>

          {/* Filters + sort */}
          <div className="mt-4 flex flex-wrap items-center gap-2">
            <button onClick={() => toggle("openNow")} className={`chip ${params.get("openNow") === "true" ? "chip-active" : ""}`}>Open now</button>
            <button onClick={() => toggle("delivery")} className={`chip ${params.get("delivery") === "true" ? "chip-active" : ""}`}>Delivery</button>
            <button onClick={() => toggle("reservations")} className={`chip ${params.get("reservations") === "true" ? "chip-active" : ""}`}>Reservations</button>
            <button onClick={() => set("minRating", params.get("minRating") === "4" ? "" : "4")} className={`chip ${params.get("minRating") === "4" ? "chip-active" : ""}`}>4★ & up</button>
            <select value={params.get("priceMax") ?? ""} onChange={(e) => set("priceMax", e.target.value)} className="chip cursor-pointer">
              <option value="">Any price</option>
              <option value="1">$</option>
              <option value="2">$$ & under</option>
              <option value="3">$$$ & under</option>
            </select>
            <select value={params.get("sort") ?? ""} onChange={(e) => set("sort", e.target.value)} className="chip ml-auto cursor-pointer">
              {SORTS.map((s) => <option key={s.key} value={s.key}>{s.label}</option>)}
            </select>
          </div>

          {/* Results */}
          <div className="mt-6">
            {loading ? (
              <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-3">
                {Array.from({ length: 9 }).map((_, i) => <div key={i} className="card h-72 animate-pulse" />)}
              </div>
            ) : businesses && businesses.length > 0 ? (
              <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-3">
                {businesses.map((b) => <BusinessCard key={b.id} business={b} showActions />)}
              </div>
            ) : (
              <div className="card p-16 text-center">
                <p className="text-lg font-semibold text-ink">No places match your filters.</p>
                <p className="mt-1 text-muted">Try clearing a filter or searching something else.</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function CatRow({ active, icon, name, count, onClick }: { active: boolean; icon: string; name: string; count?: number; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className={`flex w-full items-center gap-2.5 rounded-xl px-3 py-2 text-left text-sm transition ${active ? "bg-brand-soft font-semibold text-brand-dark" : "text-ink hover:bg-surface-2"}`}
    >
      <span className="text-base leading-none">{icon}</span>
      <span className="flex-1 truncate">{name}</span>
      {count != null && <span className={`text-xs ${active ? "text-brand-dark" : "text-muted"}`}>{count}</span>}
    </button>
  );
}
