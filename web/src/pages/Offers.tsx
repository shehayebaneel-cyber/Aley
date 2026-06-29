import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { TagIcon } from "../components/icons";
import { useFetch } from "../lib/useFetch";
import type { Offer } from "../types";

const CITY = "aley";
const GROUP_ORDER = ["Food & Drinks", "Shopping", "Health & Beauty", "Automotive", "Home & Living", "Professional Services", "Stay & Tourism", "Education", "Entertainment", "Sports & Recreation", "Community", "Essential Services", "More"];

export function Offers() {
  const { data: offers, loading } = useFetch<Offer[]>(`/api/offers?city=${CITY}`);
  const all = offers ?? [];

  // Which category is the customer filtering by? "" = all.
  const [activeCat, setActiveCat] = useState("");
  const [activeGroup, setActiveGroup] = useState("");

  // Build the list of categories that actually have offers, grouped.
  const grouped = useMemo(() => {
    type CatStat = { slug: string; name: string; group: string; icon: string; count: number };
    const cats = new Map<string, CatStat>();
    for (const o of all) {
      const c = o.business?.category;
      if (!c) continue;
      const ex = cats.get(c.slug);
      if (ex) ex.count++;
      else cats.set(c.slug, { slug: c.slug, name: c.name, group: c.group || "More", icon: c.icon, count: 1 });
    }
    const byGroup = new Map<string, CatStat[]>();
    for (const c of cats.values()) {
      if (!byGroup.has(c.group)) byGroup.set(c.group, []);
      byGroup.get(c.group)!.push(c);
    }
    for (const list of byGroup.values()) list.sort((a, b) => b.count - a.count);
    const ordered = GROUP_ORDER.filter((g) => byGroup.has(g)).map((g) => ({ group: g, items: byGroup.get(g)! }));
    for (const [g, items] of byGroup) if (!GROUP_ORDER.includes(g)) ordered.push({ group: g, items });
    return ordered;
  }, [all]);

  const shown = useMemo(() => {
    if (activeCat) return all.filter((o) => o.business?.category?.slug === activeCat);
    if (activeGroup) return all.filter((o) => o.business?.category?.group === activeGroup);
    return all;
  }, [all, activeCat, activeGroup]);

  const subCats = activeGroup ? grouped.find((g) => g.group === activeGroup)?.items ?? [] : [];

  const chooseGroup = (g: string) => {
    setActiveGroup((cur) => (cur === g ? "" : g));
    setActiveCat("");
  };

  return (
    <div className="mx-auto max-w-7xl px-4 py-8">
      <h1 className="font-display text-3xl font-extrabold text-ink">Offers & deals</h1>
      <p className="mt-1 text-muted">Pick a category to see the promotions happening across Aley right now.</p>

      {/* Group picker */}
      <div className="mt-6 flex flex-wrap gap-2">
        <button
          onClick={() => { setActiveGroup(""); setActiveCat(""); }}
          className={`chip ${!activeGroup && !activeCat ? "chip-active" : ""}`}
        >
          All offers <span className="opacity-70">({all.length})</span>
        </button>
        {grouped.map(({ group, items }) => (
          <button
            key={group}
            onClick={() => chooseGroup(group)}
            className={`chip ${activeGroup === group ? "chip-active" : ""}`}
          >
            {group} <span className="opacity-70">({items.reduce((n, c) => n + c.count, 0)})</span>
          </button>
        ))}
      </div>

      {/* Sub-category picker for the active group */}
      {subCats.length > 0 && (
        <div className="mt-3 flex flex-wrap gap-2 border-t border-border pt-3">
          <button onClick={() => setActiveCat("")} className={`chip ${!activeCat ? "chip-active" : ""}`}>
            All in {activeGroup}
          </button>
          {subCats.map((c) => (
            <button
              key={c.slug}
              onClick={() => setActiveCat((cur) => (cur === c.slug ? "" : c.slug))}
              className={`chip ${activeCat === c.slug ? "chip-active" : ""}`}
            >
              {c.icon} {c.name} <span className="opacity-70">({c.count})</span>
            </button>
          ))}
        </div>
      )}

      <p className="mt-5 text-sm text-muted">{loading ? "Loading…" : `${shown.length} ${shown.length === 1 ? "offer" : "offers"}`}</p>

      <div className="mt-3 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
        {loading && Array.from({ length: 6 }).map((_, i) => <div key={i} className="card h-64 animate-pulse" />)}
        {shown.map((o) => (
          <Link key={o.id} to={o.business ? `/business/${o.business.slug}` : "/offers"} className="card card-hover group overflow-hidden">
            <div className="relative h-40 overflow-hidden bg-surface-2">
              {o.image && <img src={o.image} alt="" loading="lazy" className="h-full w-full object-cover transition group-hover:scale-105" />}
              <span className="absolute left-3 top-3 inline-flex items-center gap-1 rounded-full bg-accent px-2.5 py-1 text-xs font-bold text-white">
                <TagIcon className="h-3.5 w-3.5" /> {o.type.replace("_", " ")}
              </span>
              {o.business?.category && (
                <span className="absolute right-3 top-3 inline-flex items-center gap-1 rounded-full bg-black/55 px-2.5 py-1 text-xs font-semibold text-white backdrop-blur">
                  {o.business.category.icon} {o.business.category.name}
                </span>
              )}
            </div>
            <div className="p-5">
              <h3 className="font-display text-lg font-bold text-ink">{o.title}</h3>
              <p className="mt-1 text-sm text-muted">{o.description}</p>
              {o.business && <p className="mt-3 text-sm font-semibold text-brand">{o.business.name} →</p>}
            </div>
          </Link>
        ))}
      </div>

      {!loading && shown.length === 0 && (
        <div className="card mt-6 p-16 text-center">
          <p className="text-lg font-semibold text-ink">No active offers{activeCat || activeGroup ? " in this category" : ""}.</p>
          <p className="mt-1 text-muted">{activeCat || activeGroup ? "Try another category." : "Check back soon for deals!"}</p>
        </div>
      )}
    </div>
  );
}
