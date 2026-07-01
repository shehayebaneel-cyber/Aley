import { useMemo, useState } from "react";
import { BuyVoucherModal } from "../components/BuyVoucherModal";
import { GiftCard } from "../components/GiftCard";
import { SearchIcon } from "../components/icons";
import { useCity, cityQuery } from "../context/CityContext";
import { useFetch } from "../lib/useFetch";
import { useTitle } from "../lib/useTitle";
import type { Business, GiftCardProduct } from "../types";

const catOf = (g: GiftCardProduct) => g.business?.category?.slug ?? "";
const inCat = (g: GiftCardProduct, ...s: string[]) => s.includes(catOf(g));

const FILTERS: { key: string; label: string; test: (g: GiftCardProduct) => boolean }[] = [
  { key: "all", label: "All gift cards", test: () => true },
  { key: "restaurants", label: "🍽️ Restaurants", test: (g) => inCat(g, "restaurants", "lebanese") },
  { key: "coffee", label: "☕ Coffee", test: (g) => inCat(g, "coffee-shops") },
  { key: "bakeries", label: "🥐 Bakeries", test: (g) => inCat(g, "bakeries") },
  { key: "desserts", label: "🍰 Desserts", test: (g) => inCat(g, "desserts", "sweets") },
  { key: "icecream", label: "🍦 Ice Cream", test: (g) => inCat(g, "ice-cream") },
  { key: "fastfood", label: "🍔 Fast Food", test: (g) => inCat(g, "fast-food", "burgers", "pizza", "shawarma") },
  { key: "breakfast", label: "🍳 Breakfast", test: (g) => inCat(g, "breakfast-brunch") },
  { key: "barbers", label: "💈 Barbers", test: (g) => inCat(g, "barbers") },
  { key: "beauty", label: "💄 Beauty", test: (g) => inCat(g, "beauty-salons", "makeup-artists") },
  { key: "spas", label: "🧖 Spas", test: (g) => inCat(g, "spas") },
  { key: "nails", label: "💅 Nails", test: (g) => inCat(g, "nail-salons") },
  { key: "skincare", label: "✨ Skincare", test: (g) => inCat(g, "skincare-clinics") },
  { key: "gyms", label: "🏋️ Gyms", test: (g) => inCat(g, "gyms", "personal-trainers", "yoga-pilates") },
  { key: "padel", label: "🎾 Padel", test: (g) => inCat(g, "padel") },
  { key: "football", label: "⚽ Football", test: (g) => inCat(g, "football-fields", "mini-football") },
  { key: "tennis", label: "🎾 Tennis", test: (g) => inCat(g, "tennis") },
  { key: "swimming", label: "🏊 Swimming", test: (g) => inCat(g, "swimming-pools") },
  { key: "escape", label: "🗝️ Escape Rooms", test: (g) => inCat(g, "escape-rooms") },
  { key: "cinemas", label: "🎬 Cinemas", test: (g) => inCat(g, "cinemas") },
  { key: "gaming", label: "🕹️ Gaming", test: (g) => inCat(g, "gaming-lounges") },
  { key: "hotels", label: "🏨 Hotels", test: (g) => inCat(g, "hotels") },
  { key: "resorts", label: "🌴 Resorts", test: (g) => inCat(g, "resorts") },
  { key: "carwash", label: "🚿 Car Wash", test: (g) => inCat(g, "car-washes") },
  { key: "detailing", label: "🧽 Car Detailing", test: (g) => inCat(g, "car-detailing") },
  { key: "electronics", label: "📱 Electronics", test: (g) => inCat(g, "electronics", "mobile-shops") },
  { key: "flowers", label: "🌸 Flowers", test: (g) => inCat(g, "florists") },
  { key: "jewelry", label: "💍 Jewelry", test: (g) => inCat(g, "jewelry") },
  { key: "fashion", label: "👗 Fashion", test: (g) => inCat(g, "fashion", "womens-fashion", "mens-fashion") },
  { key: "shoes", label: "👟 Shoes", test: (g) => inCat(g, "shoe-stores") },
  { key: "books", label: "📚 Books", test: (g) => inCat(g, "bookstores") },
  { key: "kids", label: "🧒 Kids", test: (g) => inCat(g, "childrens-clothing", "toy-stores", "kids-play-areas") },
  { key: "pets", label: "🐶 Pet Shops", test: (g) => inCat(g, "pet-shops") },
  { key: "experiences", label: "✨ Experiences", test: (g) => g.kind !== "FIXED" },
];

const SORTS = [["", "Featured"], ["popular", "Most popular"], ["value", "Highest value"], ["price", "Lowest price"], ["newest", "Newest"]];

function Row({ title, emoji, cards, onBuy }: { title: string; emoji: string; cards: GiftCardProduct[]; onBuy: (g: GiftCardProduct) => void }) {
  if (!cards.length) return null;
  return (
    <section className="mt-8">
      <h2 className="font-display text-xl font-extrabold text-ink">{emoji} {title}</h2>
      <div className="no-scrollbar -mx-4 mt-3 flex gap-5 overflow-x-auto px-4 pb-2">
        {cards.map((g) => <div key={g.id} className="w-[18rem] shrink-0"><GiftCard g={g} onBuy={onBuy} /></div>)}
      </div>
    </section>
  );
}

export function GiftCards() {
  useTitle("Gift Cards");
  const { city } = useCity();
  const { data, loading } = useFetch<GiftCardProduct[]>(`/api/vouchers${cityQuery(city)}`);
  const all = data ?? [];
  const [filter, setFilter] = useState("all");
  const [q, setQ] = useState("");
  const [sort, setSort] = useState("");
  const [discounted, setDiscounted] = useState(false);
  const [priceMax, setPriceMax] = useState(0);
  const [buy, setBuy] = useState<GiftCardProduct | null>(null);

  const available = useMemo(() => FILTERS.filter((f) => f.key === "all" || all.some(f.test)), [all]);
  const active = FILTERS.find((f) => f.key === filter) ?? FILTERS[0];
  const isFiltering = !!(q || filter !== "all" || discounted || priceMax);

  const sorted = (list: GiftCardProduct[]) => {
    const a = list.slice();
    if (sort === "popular") a.sort((x, y) => (y.soldCount ?? 0) - (x.soldCount ?? 0));
    else if (sort === "value") a.sort((x, y) => y.value - x.value);
    else if (sort === "price") a.sort((x, y) => x.price - y.price);
    else if (sort === "newest") a.sort((x, y) => new Date(y.createdAt ?? 0).getTime() - new Date(x.createdAt ?? 0).getTime());
    else a.sort((x, y) => Number(y.isFeatured) - Number(x.isFeatured) || (y.soldCount ?? 0) - (x.soldCount ?? 0));
    return a;
  };
  const shown = useMemo(() => {
    const ql = q.trim().toLowerCase();
    let list = all.filter((g) => active.test(g)
      && (!discounted || g.discounted)
      && (!priceMax || g.price <= priceMax)
      && (!ql || `${g.name} ${g.description} ${g.business?.name ?? ""} ${g.business?.category?.name ?? ""}`.toLowerCase().includes(ql)));
    return sorted(list);
  }, [all, active, discounted, priceMax, q, sort]);

  const featured = useMemo(() => all.filter((g) => g.isFeatured).slice(0, 12), [all]);
  const best = useMemo(() => [...all].sort((a, b) => (b.soldCount ?? 0) - (a.soldCount ?? 0)).slice(0, 12), [all]);
  const fresh = useMemo(() => [...all].sort((a, b) => new Date(b.createdAt ?? 0).getTime() - new Date(a.createdAt ?? 0).getTime()).slice(0, 12), [all]);

  return (
    <div className="mx-auto max-w-7xl px-4 py-6">
      {/* Hero */}
      <div className="overflow-hidden rounded-3xl bg-gradient-to-br from-brand via-brand-dark to-brand p-7 text-white shadow-lg sm:p-10">
        <p className="text-sm font-semibold uppercase tracking-wider text-white/80">🎁 Gift cards & experiences</p>
        <h1 className="mt-1 font-display text-3xl font-extrabold sm:text-4xl">Give a gift they'll love</h1>
        <p className="mt-2 max-w-xl text-white/85">Buy digital gift cards from businesses across Lebanon — perfect for birthdays, dinners, salons, cafés and more. Delivered instantly.</p>
        <div className="relative mt-5 max-w-md">
          <SearchIcon className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted" />
          <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search gift cards, businesses…" className="input !bg-white !pl-9 text-ink" />
        </div>
      </div>

      {/* Category chips */}
      <div className="no-scrollbar -mx-4 mt-5 flex gap-2 overflow-x-auto px-4 pb-1">
        {available.map((f) => <button key={f.key} onClick={() => setFilter(f.key)} className={`chip whitespace-nowrap ${filter === f.key ? "chip-active" : ""}`}>{f.label}</button>)}
      </div>
      {/* Sort + filters */}
      <div className="mt-3 flex flex-wrap items-center gap-2">
        <button onClick={() => setDiscounted((d) => !d)} className={`chip ${discounted ? "chip-active" : ""}`}>💸 Discounted</button>
        <select value={priceMax || ""} onChange={(e) => setPriceMax(Number(e.target.value) || 0)} className="chip cursor-pointer"><option value="">Any price</option><option value="25">Under $25</option><option value="50">Under $50</option><option value="100">Under $100</option></select>
        <select value={sort} onChange={(e) => setSort(e.target.value)} className="chip ml-auto cursor-pointer">{SORTS.map(([v, l]) => <option key={v} value={v}>{l}</option>)}</select>
      </div>

      {loading ? (
        <div className="mt-6 grid gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">{Array.from({ length: 8 }).map((_, i) => <div key={i} className="card h-80 animate-pulse" />)}</div>
      ) : all.length === 0 ? (
        <div className="card mt-6 p-16 text-center text-muted">No gift cards yet — check back soon.</div>
      ) : isFiltering ? (
        <>
          <p className="mt-5 text-sm text-muted">{shown.length} gift card{shown.length === 1 ? "" : "s"}</p>
          {shown.length ? <div className="mt-3 grid gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">{shown.map((g) => <GiftCard key={g.id} g={g} onBuy={setBuy} />)}</div>
                        : <div className="card mt-3 p-12 text-center text-muted">No gift cards match. Try another category.</div>}
        </>
      ) : (
        <>
          {featured.length > 0 && <Row title="Featured gift cards" emoji="⭐" cards={featured} onBuy={setBuy} />}
          <Row title="Best sellers" emoji="🔥" cards={best} onBuy={setBuy} />
          <Row title="New arrivals" emoji="🆕" cards={fresh} onBuy={setBuy} />
          <section className="mt-10">
            <h2 className="font-display text-xl font-extrabold text-ink">All gift cards</h2>
            <div className="mt-3 grid gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">{sorted(all).map((g) => <GiftCard key={g.id} g={g} onBuy={setBuy} />)}</div>
          </section>
        </>
      )}

      {buy && buy.business && (
        <BuyVoucherModal business={{ id: buy.businessId, slug: buy.business.slug, name: buy.business.name } as Business} initialTypeId={buy.id} onClose={() => setBuy(null)} />
      )}
    </div>
  );
}
