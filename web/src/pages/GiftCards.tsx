import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { BuyVoucherModal } from "../components/BuyVoucherModal";
import { GiftCard } from "../components/GiftCard";
import { CloseIcon, SearchIcon } from "../components/icons";
import { useCity, cityQuery } from "../context/CityContext";
import { useFetch } from "../lib/useFetch";
import { useTitle } from "../lib/useTitle";
import type { Business, GiftCardProduct } from "../types";

const catOf = (g: GiftCardProduct) => g.business?.category?.slug ?? "";

interface GiftCat { key: string; label: string; slugs: string[]; exp?: boolean }
interface GiftGroup { group: string; emoji: string; cats: GiftCat[] }

// Grouped gift-card categories (mapped to real business category slugs).
const GIFT_GROUPS: GiftGroup[] = [
  { group: "Food & Drinks", emoji: "🍽️", cats: [
    { key: "restaurants", label: "🍽️ Restaurants", slugs: ["restaurants"] },
    { key: "coffee", label: "☕ Coffee Shops", slugs: ["coffee-shops"] },
    { key: "breakfast", label: "🍳 Breakfast & Brunch", slugs: ["breakfast-brunch"] },
    { key: "bakeries", label: "🥐 Bakeries", slugs: ["bakeries", "pastry-shops"] },
    { key: "desserts", label: "🍰 Desserts", slugs: ["desserts", "sweets"] },
    { key: "icecream", label: "🍦 Ice Cream", slugs: ["ice-cream"] },
    { key: "fastfood", label: "🍔 Fast Food", slugs: ["fast-food"] },
    { key: "pizza", label: "🍕 Pizza", slugs: ["pizza"] },
    { key: "burgers", label: "🍔 Burgers", slugs: ["burgers"] },
    { key: "lebanese", label: "🫓 Lebanese", slugs: ["lebanese"] },
    { key: "sushi", label: "🍣 Sushi", slugs: ["sushi"] },
  ] },
  { group: "Health & Beauty", emoji: "💇", cats: [
    { key: "beauty", label: "💄 Beauty Salons", slugs: ["beauty-salons"] },
    { key: "barbers", label: "💈 Barbers", slugs: ["barbers"] },
    { key: "nails", label: "💅 Nail Salons", slugs: ["nail-salons"] },
    { key: "spas", label: "🧖 Spas & Massage", slugs: ["spas"] },
    { key: "makeup", label: "💋 Makeup Artists", slugs: ["makeup-artists"] },
    { key: "skincare", label: "✨ Skincare Clinics", slugs: ["skincare-clinics"] },
    { key: "gyms", label: "🏋️ Gyms", slugs: ["gyms"] },
    { key: "trainers", label: "💪 Personal Trainers", slugs: ["personal-trainers"] },
    { key: "yoga", label: "🧘 Yoga & Pilates", slugs: ["yoga-pilates"] },
    { key: "nutrition", label: "🥗 Nutritionists", slugs: ["nutritionists"] },
  ] },
  { group: "Sports & Recreation", emoji: "⚽", cats: [
    { key: "football", label: "⚽ Football Fields", slugs: ["football-fields", "mini-football"] },
    { key: "padel", label: "🎾 Padel", slugs: ["padel"] },
    { key: "tennis", label: "🎾 Tennis", slugs: ["tennis"] },
    { key: "basketball", label: "🏀 Basketball", slugs: ["basketball"] },
    { key: "volleyball", label: "🏐 Volleyball", slugs: ["volleyball"] },
    { key: "swimming", label: "🏊 Swimming Pools", slugs: ["swimming-pools"] },
    { key: "squash", label: "🥎 Squash", slugs: ["squash"] },
  ] },
  { group: "Entertainment", emoji: "🎭", cats: [
    { key: "cinemas", label: "🎬 Cinemas", slugs: ["cinemas"] },
    { key: "bowling", label: "🎳 Bowling", slugs: ["bowling"] },
    { key: "escape", label: "🗝️ Escape Rooms", slugs: ["escape-rooms"] },
    { key: "gaming", label: "🕹️ Gaming Lounges", slugs: ["gaming-lounges"] },
    { key: "venues", label: "🎪 Event Venues", slugs: ["event-venues", "wedding-venues"] },
    { key: "livemusic", label: "🎤 Live Music", slugs: ["live-music"] },
    { key: "kids", label: "🎠 Kids Play Areas", slugs: ["kids-play-areas"] },
    { key: "billiards", label: "🎱 Pool & Billiards", slugs: ["pool-billiards"] },
  ] },
  { group: "Automotive", emoji: "🚗", cats: [
    { key: "carwash", label: "🚿 Car Wash", slugs: ["car-washes"] },
    { key: "detailing", label: "🧽 Car Detailing", slugs: ["car-detailing"] },
    { key: "oil", label: "🛢️ Oil Change", slugs: ["oil-change"] },
    { key: "tires", label: "🛞 Tire Shops", slugs: ["tire-shops"] },
    { key: "battery", label: "🔋 Battery Shops", slugs: ["battery-shops"] },
    { key: "accessories", label: "🚗 Car Accessories", slugs: ["car-accessories"] },
  ] },
  { group: "Shopping", emoji: "🛍️", cats: [
    { key: "fashion", label: "👗 Fashion", slugs: ["fashion", "womens-fashion", "mens-fashion"] },
    { key: "shoes", label: "👟 Shoes", slugs: ["shoe-stores"] },
    { key: "jewelry", label: "💍 Jewelry", slugs: ["jewelry"] },
    { key: "flowers", label: "🌸 Flowers", slugs: ["florists"] },
    { key: "perfumes", label: "🧴 Perfumes", slugs: ["cosmetics-perfumes"] },
    { key: "electronics", label: "📱 Electronics", slugs: ["electronics", "mobile-shops"] },
    { key: "books", label: "📚 Bookstores", slugs: ["bookstores"] },
    { key: "giftshops", label: "🎁 Gift Shops", slugs: ["gift-shops"] },
    { key: "decor", label: "🪴 Home Decor", slugs: ["home-decor", "furniture"] },
    { key: "toys", label: "🧸 Toys", slugs: ["toy-stores"] },
  ] },
  { group: "Travel", emoji: "🏨", cats: [
    { key: "hotels", label: "🏨 Hotels", slugs: ["hotels"] },
    { key: "resorts", label: "🌴 Resorts", slugs: ["resorts"] },
    { key: "chalets", label: "🏡 Chalets", slugs: ["apartments", "airbnb-hosts"] },
    { key: "guesthouses", label: "🏡 Guest Houses", slugs: ["guest-houses"] },
  ] },
  { group: "Pets", emoji: "🐶", cats: [
    { key: "pets", label: "🐶 Pet Shops", slugs: ["pet-shops"] },
    { key: "vets", label: "🐾 Veterinary", slugs: ["veterinary"] },
  ] },
  { group: "Experiences", emoji: "🎁", cats: [
    { key: "experiences", label: "✨ Experiences", slugs: [], exp: true },
  ] },
];
const ALL_CATS = GIFT_GROUPS.flatMap((g) => g.cats);
const matchCat = (g: GiftCardProduct, c: GiftCat) => (c.exp ? g.kind !== "FIXED" : c.slugs.includes(catOf(g)));

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
  const [catModal, setCatModal] = useState(false);
  const [catSearch, setCatSearch] = useState("");

  // Only categories that actually have gift cards are shown (keeps it relevant).
  const has = (c: GiftCat) => all.some((g) => matchCat(g, c));
  const presentCats = useMemo(() => ALL_CATS.filter(has), [all]);
  const quickCats = useMemo(() => {
    const exp = presentCats.find((c) => c.exp);
    const rest = presentCats.filter((c) => !c.exp).slice(0, 7);
    return [...(exp ? [exp] : []), ...rest];
  }, [presentCats]);
  const activeCat = filter === "all" ? null : ALL_CATS.find((c) => c.key === filter) ?? null;
  const activeLabel = activeCat?.label;
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
    const list = all.filter((g) => (!activeCat || matchCat(g, activeCat))
      && (!discounted || g.discounted)
      && (!priceMax || g.price <= priceMax)
      && (!ql || `${g.name} ${g.description} ${g.business?.name ?? ""} ${g.business?.category?.name ?? ""}`.toLowerCase().includes(ql)));
    return sorted(list);
  }, [all, activeCat, discounted, priceMax, q, sort]);

  const featured = useMemo(() => all.filter((g) => g.isFeatured).slice(0, 12), [all]);
  const best = useMemo(() => [...all].sort((a, b) => (b.soldCount ?? 0) - (a.soldCount ?? 0)).slice(0, 12), [all]);
  const experiences = useMemo(() => all.filter((g) => g.kind !== "FIXED").slice(0, 12), [all]);
  const fresh = useMemo(() => [...all].sort((a, b) => new Date(b.createdAt ?? 0).getTime() - new Date(a.createdAt ?? 0).getTime()).slice(0, 12), [all]);

  const pick = (key: string) => { setFilter(key); setCatModal(false); setCatSearch(""); };

  return (
    <div className="mx-auto max-w-7xl px-4 py-6">
      {/* Hero */}
      <div className="overflow-hidden rounded-3xl bg-gradient-to-br from-brand via-brand-dark to-brand p-7 text-white shadow-lg sm:p-10">
        <p className="text-sm font-semibold uppercase tracking-wider text-white/80">🎁 Gift cards & experiences</p>
        <h1 className="mt-1 font-display text-3xl font-extrabold sm:text-4xl">Give a gift they'll love</h1>
        <p className="mt-2 max-w-xl text-white/85">Buy digital gift cards & experiences from businesses across Lebanon — perfect for birthdays, dinners, salons, cafés and more. Delivered instantly.</p>
        <div className="relative mt-5 max-w-md">
          <SearchIcon className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted" />
          <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search gift cards, businesses…" className="input !bg-white !pl-9 text-ink" />
        </div>
      </div>

      {/* Platform Gift Card — the "any business" default gift option */}
      <Link to="/platform-gift-card" className="group mt-4 flex items-center gap-4 overflow-hidden rounded-3xl border border-border bg-gradient-to-r from-brand-soft to-surface p-5 transition hover:shadow-md">
        <span className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-brand to-brand-dark text-3xl shadow-sm">🎁</span>
        <div className="min-w-0 flex-1">
          <p className="font-display text-lg font-extrabold text-ink">Aley Platform Gift Card <span className="ml-1 rounded-full bg-brand px-2 py-0.5 align-middle text-[10px] font-bold uppercase text-white">any business</span></p>
          <p className="text-sm text-muted">Not sure where they'd want to go? One gift card, redeemable anywhere across Lebanon — spent from their wallet.</p>
        </div>
        <span className="hidden shrink-0 font-bold text-brand-dark transition group-hover:translate-x-0.5 sm:block">Buy →</span>
      </Link>

      {/* Category quick chips + All categories */}
      <div className="no-scrollbar -mx-4 mt-5 flex items-center gap-2 overflow-x-auto px-4 pb-1">
        <button onClick={() => setFilter("all")} className={`chip whitespace-nowrap ${filter === "all" ? "chip-active" : ""}`}>All gift cards</button>
        {quickCats.map((c) => <button key={c.key} onClick={() => setFilter(c.key)} className={`chip whitespace-nowrap ${filter === c.key ? "chip-active" : ""}`}>{c.label}</button>)}
        {activeCat && !quickCats.includes(activeCat) && <button className="chip chip-active whitespace-nowrap">{activeCat.label}</button>}
        <button onClick={() => setCatModal(true)} className="chip whitespace-nowrap font-bold text-brand-dark">☰ All categories</button>
      </div>
      {/* Sort + filters */}
      <div className="mt-3 flex flex-wrap items-center gap-2">
        {activeLabel && <button onClick={() => setFilter("all")} className="chip chip-active">{activeLabel} ✕</button>}
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
          <Row title="Experiences" emoji="✨" cards={experiences} onBuy={setBuy} />
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

      {/* All categories modal */}
      {catModal && (
        <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/50 p-4 backdrop-blur-sm" onClick={() => setCatModal(false)}>
          <div className="card pop-in my-8 w-full max-w-2xl p-6" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between">
              <h2 className="font-display text-xl font-extrabold text-ink">Browse all categories</h2>
              <button onClick={() => setCatModal(false)} aria-label="Close" className="text-muted hover:text-ink"><CloseIcon /></button>
            </div>
            <div className="relative mt-4">
              <SearchIcon className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted" />
              <input value={catSearch} onChange={(e) => setCatSearch(e.target.value)} placeholder="Search categories…" className="input !pl-9" autoFocus />
            </div>
            <div className="mt-4 max-h-[60vh] space-y-5 overflow-y-auto pr-1">
              <button onClick={() => pick("all")} className={`chip ${filter === "all" ? "chip-active" : ""}`}>All gift cards</button>
              {GIFT_GROUPS.map((grp) => {
                const cats = grp.cats.filter((c) => has(c) && (!catSearch.trim() || `${grp.group} ${c.label}`.toLowerCase().includes(catSearch.trim().toLowerCase())));
                if (!cats.length) return null;
                return (
                  <div key={grp.group}>
                    <p className="text-xs font-bold uppercase tracking-wide text-muted">{grp.emoji} {grp.group}</p>
                    <div className="mt-2 flex flex-wrap gap-2">
                      {cats.map((c) => <button key={c.key} onClick={() => pick(c.key)} className={`chip ${filter === c.key ? "chip-active" : ""}`}>{c.label}</button>)}
                    </div>
                  </div>
                );
              })}
              {presentCats.length === 0 && <p className="text-sm text-muted">No gift-card categories available yet.</p>}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
