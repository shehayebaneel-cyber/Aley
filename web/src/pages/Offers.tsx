import { useMemo, useState } from "react";
import { OfferCard, offerEmoji } from "../components/OfferCard";
import { SearchIcon } from "../components/icons";
import { useCity, cityQuery } from "../context/CityContext";
import { useFetch } from "../lib/useFetch";
import type { Offer } from "../types";
const GROUP_ORDER = ["Food & Drinks", "Shopping", "Health & Beauty", "Automotive", "Home & Living", "Professional Services", "Stay & Tourism", "Education", "Entertainment", "Sports & Recreation", "Community", "Essential Services", "More"];

const OFFER_TYPES = [
  { key: "PERCENT", label: "Discounts" }, { key: "BOGO", label: "Buy 1 Get 1" }, { key: "FREE_ITEM", label: "Free item" },
  { key: "HAPPY_HOUR", label: "Happy hour" }, { key: "PACKAGE", label: "Packages" }, { key: "STUDENT", label: "Student" },
  { key: "BIRTHDAY", label: "Birthday" }, { key: "SEASONAL", label: "Seasonal" }, { key: "FIRST_VISIT", label: "First visit" }, { key: "LOYALTY", label: "Loyalty" },
];

/** A horizontal, swipeable carousel row of offer cards. */
function Row({ title, emoji, offers }: { title: string; emoji: string; offers: Offer[] }) {
  if (!offers.length) return null;
  return (
    <section className="mt-8">
      <h2 className="font-display text-xl font-extrabold text-ink">{emoji} {title}</h2>
      <div className="no-scrollbar -mx-4 mt-3 flex gap-4 overflow-x-auto px-4 pb-2">
        {offers.map((o) => (
          <div key={o.id} className="w-[17rem] shrink-0"><OfferCard offer={o} /></div>
        ))}
      </div>
    </section>
  );
}

export function Offers() {
  const { city } = useCity();
  const { data, loading } = useFetch<Offer[]>(`/api/offers${cityQuery(city)}`);
  const all = data ?? [];
  const [q, setQ] = useState("");
  const [group, setGroup] = useState("");
  const [cat, setCat] = useState("");
  const [type, setType] = useState("");

  // Categories that actually have offers, grouped.
  const grouped = useMemo(() => {
    type CatStat = { slug: string; name: string; group: string; icon: string; count: number };
    const cats = new Map<string, CatStat>();
    for (const o of all) {
      const c = o.business?.category; if (!c) continue;
      const ex = cats.get(c.slug);
      if (ex) ex.count++; else cats.set(c.slug, { slug: c.slug, name: c.name, group: c.group || "More", icon: c.icon, count: 1 });
    }
    const byGroup = new Map<string, CatStat[]>();
    for (const c of cats.values()) { if (!byGroup.has(c.group)) byGroup.set(c.group, []); byGroup.get(c.group)!.push(c); }
    for (const list of byGroup.values()) list.sort((a, b) => b.count - a.count);
    const ordered = GROUP_ORDER.filter((g) => byGroup.has(g)).map((g) => ({ group: g, items: byGroup.get(g)! }));
    for (const [g, items] of byGroup) if (!GROUP_ORDER.includes(g)) ordered.push({ group: g, items });
    return ordered;
  }, [all]);

  const subCats = group ? grouped.find((g) => g.group === group)?.items ?? [] : [];
  const hasFilter = !!(q || group || cat || type);

  const filtered = useMemo(() => {
    const ql = q.trim().toLowerCase();
    return all.filter((o) => {
      if (cat && o.business?.category?.slug !== cat) return false;
      if (group && o.business?.category?.group !== group) return false;
      if (type && o.type !== type) return false;
      if (ql && !(`${o.title} ${o.description} ${o.business?.name ?? ""}`.toLowerCase().includes(ql))) return false;
      return true;
    });
  }, [all, q, group, cat, type]);

  // Curated sections (from the full set).
  const featured = useMemo(() => all.filter((o) => o.isFeatured).slice(0, 12), [all]);
  const trending = useMemo(() => [...all].sort((a, b) => (b.redeemedCount ?? 0) + (b.viewCount ?? 0) / 5 - ((a.redeemedCount ?? 0) + (a.viewCount ?? 0) / 5)).slice(0, 12), [all]);
  const endingSoon = useMemo(() => all.filter((o) => o.isExpiringSoon).sort((a, b) => (a.daysLeft ?? 99) - (b.daysLeft ?? 99)).slice(0, 12), [all]);
  const newest = useMemo(() => [...all].sort((a, b) => new Date(b.createdAt ?? 0).getTime() - new Date(a.createdAt ?? 0).getTime()).slice(0, 12), [all]);

  return (
    <div className="mx-auto max-w-7xl px-4 py-6">
      {/* Hero */}
      <div className="overflow-hidden rounded-3xl bg-gradient-to-br from-brand via-brand-dark to-brand p-7 text-white shadow-lg sm:p-10">
        <p className="text-sm font-semibold uppercase tracking-wider text-white/80">Deals across Lebanon</p>
        <h1 className="mt-1 font-display text-3xl font-extrabold sm:text-4xl">Exclusive offers, all in one place</h1>
        <p className="mt-2 max-w-xl text-white/85">Discounts, Buy 1 Get 1, free treats and happy hours from the best spots in town — claim and save in seconds.</p>
        <div className="relative mt-5 max-w-md">
          <SearchIcon className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted" />
          <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search deals, food, brands…" className="input !bg-white !pl-9 text-ink" />
        </div>
      </div>

      {/* Type chips */}
      <div className="no-scrollbar -mx-4 mt-5 flex gap-2 overflow-x-auto px-4 pb-1">
        <button onClick={() => setType("")} className={`chip whitespace-nowrap ${!type ? "chip-active" : ""}`}>All deals</button>
        {OFFER_TYPES.map((t) => (
          <button key={t.key} onClick={() => setType((c) => (c === t.key ? "" : t.key))} className={`chip whitespace-nowrap ${type === t.key ? "chip-active" : ""}`}>{offerEmoji(t.key)} {t.label}</button>
        ))}
      </div>

      {/* Category (group) chips */}
      <div className="no-scrollbar -mx-4 mt-2 flex gap-2 overflow-x-auto px-4 pb-1">
        <button onClick={() => { setGroup(""); setCat(""); }} className={`chip whitespace-nowrap ${!group ? "chip-active" : ""}`}>All categories</button>
        {grouped.map(({ group: g, items }) => (
          <button key={g} onClick={() => { setGroup((c) => (c === g ? "" : g)); setCat(""); }} className={`chip whitespace-nowrap ${group === g ? "chip-active" : ""}`}>{g} <span className="opacity-70">({items.reduce((n, c) => n + c.count, 0)})</span></button>
        ))}
      </div>
      {subCats.length > 0 && (
        <div className="no-scrollbar -mx-4 mt-2 flex gap-2 overflow-x-auto px-4 pb-1">
          <button onClick={() => setCat("")} className={`chip whitespace-nowrap ${!cat ? "chip-active" : ""}`}>All in {group}</button>
          {subCats.map((c) => (
            <button key={c.slug} onClick={() => setCat((cur) => (cur === c.slug ? "" : c.slug))} className={`chip whitespace-nowrap ${cat === c.slug ? "chip-active" : ""}`}>{c.icon} {c.name} ({c.count})</button>
          ))}
        </div>
      )}

      {loading ? (
        <div className="mt-8 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">{Array.from({ length: 6 }).map((_, i) => <div key={i} className="card h-80 animate-pulse" />)}</div>
      ) : hasFilter ? (
        /* Filtered results grid */
        <div className="mt-6">
          <p className="text-sm text-muted">{filtered.length} {filtered.length === 1 ? "deal" : "deals"}</p>
          {filtered.length ? (
            <div className="mt-3 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">{filtered.map((o) => <OfferCard key={o.id} offer={o} />)}</div>
          ) : (
            <div className="card mt-3 p-16 text-center">
              <p className="text-lg font-semibold text-ink">No deals match.</p>
              <p className="mt-1 text-muted">Try another category or clear the filters.</p>
            </div>
          )}
        </div>
      ) : all.length === 0 ? (
        <div className="card mt-8 p-16 text-center"><p className="text-lg font-semibold text-ink">No active offers yet.</p><p className="mt-1 text-muted">Check back soon for deals!</p></div>
      ) : (
        /* Curated marketplace home */
        <>
          {featured.length > 0 && (
            <section className="mt-8">
              <h2 className="font-display text-xl font-extrabold text-ink">⭐ Featured deals</h2>
              <div className="no-scrollbar -mx-4 mt-3 flex gap-4 overflow-x-auto px-4 pb-2">
                {featured.map((o) => <div key={o.id} className="w-[20rem] shrink-0"><OfferCard offer={o} size="lg" /></div>)}
              </div>
            </section>
          )}
          <Row title="Ending soon" emoji="⏳" offers={endingSoon} />
          <Row title="Trending now" emoji="🔥" offers={trending} />
          <Row title="Newly added" emoji="✨" offers={newest} />

          {/* All deals grid */}
          <section className="mt-10">
            <h2 className="font-display text-xl font-extrabold text-ink">All deals</h2>
            <div className="mt-3 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">{all.map((o) => <OfferCard key={o.id} offer={o} />)}</div>
          </section>
        </>
      )}
    </div>
  );
}
