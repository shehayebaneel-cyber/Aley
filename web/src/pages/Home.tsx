import { FormEvent, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { BusinessCard } from "../components/BusinessCard";
import { BuyVoucherModal } from "../components/BuyVoucherModal";
import { CollectionCard } from "../components/CollectionCard";
import { EventCard } from "../components/EventCard";
import { GiftCard } from "../components/GiftCard";
import { CalendarIcon, ChevronRight, MapPinIcon, SearchIcon, TagIcon } from "../components/icons";
import { useCity, cityQuery } from "../context/CityContext";
import { useContent } from "../context/ContentContext";
import { formatEventDate } from "../lib/api";
import { useFetch } from "../lib/useFetch";
import type { Business, CollectionCard as CollectionCardT, GiftCardProduct, HomeData } from "../types";

// "Everything you can do" — surfaces the platform's capabilities, each linking
// to the right filtered Explore view or page.
const CAPABILITIES = [
  { icon: "🍽️", title: "Order & Delivery", sub: "Cafés, restaurants & shops", to: "/explore?delivery=true", color: "#f97316" },
  { icon: "📅", title: "Book Appointments", sub: "Salons, clinics, barbers", to: "/explore?group=Health%20%26%20Beauty", color: "#ec4899" },
  { icon: "🏟️", title: "Rent Sports Courts", sub: "Padel, football, by the hour", to: "/explore?group=Sports%20%26%20Recreation", color: "#16a34a" },
  { icon: "🍷", title: "Book a Table", sub: "Reserve at top restaurants", to: "/explore?reservations=true", color: "#dc2626" },
  { icon: "🎁", title: "Gift Cards", sub: "Buy digital gift cards & experiences", to: "/gift-cards", color: "#a855f7" },
  { icon: "🚚", title: "Send a Delivery", sub: "Fast local courier", to: "/delivery", color: "#0ea5e9" },
];

// The high-level "main categories" (groups) + display order and icons.
const GROUP_ORDER = ["Food & Drinks", "Shopping", "Health & Beauty", "Automotive", "Home & Living", "Professional Services", "Stay & Tourism", "Education", "Entertainment", "Sports & Recreation", "Community", "Essential Services", "More"];
const GROUP_META: Record<string, { icon: string; color: string }> = {
  "Food & Drinks": { icon: "🍴", color: "#f97316" },
  "Shopping": { icon: "🛍️", color: "#a855f7" },
  "Health & Beauty": { icon: "💄", color: "#ec4899" },
  "Automotive": { icon: "🚗", color: "#2563eb" },
  "Home & Living": { icon: "🏠", color: "#0ea5e9" },
  "Professional Services": { icon: "💼", color: "#14b8a6" },
  "Stay & Tourism": { icon: "🏨", color: "#6366f1" },
  "Education": { icon: "🎓", color: "#7c3aed" },
  "Entertainment": { icon: "🎭", color: "#db2777" },
  "Sports & Recreation": { icon: "🏆", color: "#16a34a" },
  "Community": { icon: "📢", color: "#0d9488" },
  "Essential Services": { icon: "🚨", color: "#dc2626" },
  "More": { icon: "🏷️", color: "#64748b" },
};

export function Home() {
  const { city } = useCity();
  const { data } = useFetch<HomeData>(`/api/home${cityQuery(city)}`);
  const { data: collections } = useFetch<CollectionCardT[]>(`/api/collections${cityQuery(city, { featured: "true" })}`);
  const c = useContent();
  const [buyGift, setBuyGift] = useState<GiftCardProduct | null>(null);
  const S = c.sections;
  const navigate = useNavigate();
  const [q, setQ] = useState("");

  const search = (e: FormEvent) => {
    e.preventDefault();
    navigate(`/explore?q=${encodeURIComponent(q.trim())}`);
  };

  return (
    <div>
      {/* ---- Emotional hero ---- */}
      <section className="relative isolate flex min-h-[78vh] items-center overflow-hidden">
        <div className="absolute inset-0 -z-20">
          <img src={c.hero.image} alt="Aley" className="kenburns h-full w-full object-cover" />
        </div>
        <div className="absolute inset-0 -z-10 bg-gradient-to-b from-black/55 via-black/45 to-black/80" />
        <div className="mx-auto w-full max-w-7xl px-4 py-20 text-center text-white">
          <span className="fade-up inline-flex items-center gap-1.5 rounded-full bg-white/15 px-4 py-1.5 text-sm font-semibold backdrop-blur">
            <MapPinIcon className="h-4 w-4" /> {c.hero.badge || `${data?.city?.name ?? c.brand.name} · ${data?.city?.nameAr ?? "عاليه"}`}
          </span>
          <h1 className="fade-up mx-auto mt-5 max-w-4xl font-display text-4xl font-extrabold leading-tight drop-shadow-lg sm:text-6xl">
            {c.hero.title}
          </h1>
          <p className="fade-up mx-auto mt-4 max-w-2xl text-lg text-white/90 drop-shadow">
            {c.hero.subtitle}
          </p>

          <form onSubmit={search} className="fade-up mx-auto mt-8 flex max-w-xl items-center gap-2 rounded-full bg-white/95 p-2 shadow-2xl">
            <SearchIcon className="ml-3 h-5 w-5 shrink-0 text-muted" />
            <input value={q} onChange={(e) => setQ(e.target.value)} placeholder={c.hero.searchPlaceholder} className="min-w-0 flex-1 bg-transparent px-1 py-2 text-ink outline-none placeholder:text-muted" />
            <button type="submit" className="btn btn-primary px-6 py-2.5">Search</button>
          </form>
        </div>
      </section>

      {/* ---- Trust stats ---- */}
      {S.stats.show && (
      <section className="border-b border-border bg-surface">
        <div className="mx-auto grid max-w-7xl grid-cols-2 gap-4 px-4 py-8 sm:grid-cols-4">
          <Stat value={data?.stats?.businesses} label="Businesses" />
          <Stat value={data?.stats?.categories} label="Categories" />
          <Stat value={data?.stats?.events} label="Events" />
          <Stat value={data?.stats?.offers} label="Offers" />
        </div>
      </section>
      )}

      <div className="mx-auto max-w-7xl space-y-16 px-4 py-12">
        {/* What you can do */}
        <Section title="Everything you can do" subtitle="One app for all of Lebanon">
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
            {CAPABILITIES.map((c) => (
              <Link key={c.title} to={c.to} className="card card-hover group flex flex-col items-center gap-2 p-5 text-center">
                <span className="flex h-12 w-12 items-center justify-center rounded-2xl text-2xl transition group-hover:scale-110" style={{ background: `${c.color}1a` }}>{c.icon}</span>
                <span className="font-display font-bold text-ink">{c.title}</span>
                <span className="text-xs text-muted">{c.sub}</span>
              </Link>
            ))}
          </div>
        </Section>

        {/* Main categories (high-level groups) */}
        <Section show={S.categories.show} title={S.categories.title!} subtitle={S.categories.subtitle} to="/explore">
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
            {[...(data?.groups ?? [])]
              .sort((a, b) => {
                const ia = GROUP_ORDER.indexOf(a.group), ib = GROUP_ORDER.indexOf(b.group);
                return (ia === -1 ? 99 : ia) - (ib === -1 ? 99 : ib);
              })
              .map((g) => {
                const meta = GROUP_META[g.group];
                const icon = meta?.icon ?? g.icon;
                const color = meta?.color ?? g.color;
                return (
                  <Link key={g.group} to={`/explore?group=${encodeURIComponent(g.group)}`} className="card card-hover flex flex-col items-center gap-2 p-5 text-center">
                    <span className="flex h-12 w-12 items-center justify-center rounded-2xl text-2xl" style={{ background: `${color}1a` }}>{icon}</span>
                    <span className="text-sm font-semibold text-ink">{g.group}</span>
                    <span className="text-xs text-muted">{g.count} places</span>
                  </Link>
                );
              })}
          </div>
        </Section>

        {/* Gift cards & experiences — premium voucher marketplace */}
        {!!data?.gift?.length && (
          <section>
            <div className="mb-5 flex items-end justify-between gap-4">
              <div>
                <h2 className="font-display text-2xl font-extrabold text-ink sm:text-3xl">Gift Cards & Experiences 🎁</h2>
                <p className="mt-0.5 max-w-2xl text-muted">Buy digital vouchers from local businesses — perfect for birthdays, dinners, salons, cafés, and more.</p>
              </div>
              <Link to="/gift-cards" className="shrink-0 text-sm font-semibold text-brand hover:text-brand-dark">See all gift cards →</Link>
            </div>
            <div className="no-scrollbar -mx-4 flex gap-5 overflow-x-auto px-4 pb-2">
              {data.gift.map((g) => <div key={g.id} className="w-[18rem] shrink-0"><GiftCard g={g} onBuy={setBuyGift} /></div>)}
            </div>
          </section>
        )}

        {/* Discover — dynamic curated collections */}
        {!!collections?.length && (
          <section>
            <div className="mb-5 flex items-end justify-between gap-4">
              <div>
                <h2 className="font-display text-2xl font-extrabold text-ink sm:text-3xl">Discover ✨</h2>
                <p className="mt-0.5 text-muted">Curated collections to explore Lebanon — save places for your next trip.</p>
              </div>
              <Link to="/collections" className="shrink-0 text-sm font-semibold text-brand hover:text-brand-dark">See all →</Link>
            </div>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {collections.slice(0, 6).map((c) => <CollectionCard key={c.id} c={c} />)}
            </div>
          </section>
        )}

        {/* Offers */}
        {!!data?.offers?.length && (
          <Section show={S.offers.show} title={S.offers.title!} subtitle={S.offers.subtitle} to="/offers">
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {data.offers.map((o) => (
                <Link key={o.id} to={o.business ? `/business/${o.business.slug}` : "/offers"} className="card card-hover group flex overflow-hidden">
                  {o.image && <img src={o.image} alt="" loading="lazy" className="h-28 w-28 shrink-0 object-cover" />}
                  <div className="flex flex-col justify-center p-4">
                    <span className="chip !py-0.5 !text-[11px] self-start"><TagIcon className="h-3.5 w-3.5 text-accent" /> {o.type.replace("_", " ")}</span>
                    <p className="mt-1 font-display font-bold text-ink">{o.title}</p>
                    <p className="line-clamp-1 text-sm text-muted">{o.business?.name}</p>
                  </div>
                </Link>
              ))}
            </div>
          </Section>
        )}

        {/* Featured Events — premium discovery carousel */}
        {!!data?.events?.length && (
          <section>
            <div className="mb-5 flex items-end justify-between gap-4">
              <div>
                <h2 className="font-display text-2xl font-extrabold text-ink sm:text-3xl">Featured Events 🎉</h2>
                <p className="mt-0.5 text-muted">Discover what's happening around you — and grab your spot.</p>
              </div>
              <Link to="/events" className="shrink-0 text-sm font-semibold text-brand hover:text-brand-dark">See all events →</Link>
            </div>
            <div className="no-scrollbar -mx-4 flex gap-5 overflow-x-auto px-4 pb-2">
              {data.events.slice(0, 6).map((e) => <div key={e.id} className="w-[18rem] shrink-0"><EventCard event={e} /></div>)}
            </div>
          </section>
        )}

        {/* Featured businesses */}
        {!!data?.featured?.length && (
          <Section show={S.featured.show} title={S.featured.title!} subtitle={S.featured.subtitle} to="/explore?featured=true">
            <Grid>{data.featured.map((b) => <BusinessCard key={b.id} business={b} showActions />)}</Grid>
          </Section>
        )}

        {/* Map CTA */}
        {S.mapCta.show && (
        <Link to="/map" className="card card-hover relative flex items-center justify-between gap-4 overflow-hidden bg-gradient-to-r from-brand to-brand-dark p-8 text-white">
          <div>
            <h3 className="font-display text-2xl font-extrabold">{S.mapCta.title}</h3>
            <p className="mt-1 text-white/85">{S.mapCta.subtitle}</p>
          </div>
          <span className="btn bg-white/15 px-5 py-2.5 backdrop-blur">Open map <ChevronRight className="h-5 w-5" /></span>
        </Link>
        )}
      </div>
      {buyGift && buyGift.business && (
        <BuyVoucherModal
          business={{ id: buyGift.businessId, slug: buyGift.business.slug, name: buyGift.business.name } as Business}
          initialTypeId={buyGift.id}
          onClose={() => setBuyGift(null)}
        />
      )}
    </div>
  );
}

function Stat({ value, label }: { value: string | number | undefined; label: string }) {
  return (
    <div className="text-center">
      <p className="font-display text-2xl font-extrabold text-ink sm:text-3xl">{value ?? "—"}</p>
      <p className="text-xs font-semibold uppercase tracking-wide text-muted">{label}</p>
    </div>
  );
}

function Section({ title, subtitle, to, show = true, children }: { title: string; subtitle?: string; to?: string; show?: boolean; children: React.ReactNode }) {
  if (!show) return null;
  return (
    <section>
      <div className="mb-5 flex items-end justify-between gap-4">
        <div>
          <h2 className="font-display text-2xl font-extrabold text-ink sm:text-3xl">{title}</h2>
          {subtitle && <p className="mt-0.5 text-muted">{subtitle}</p>}
        </div>
        {to && <Link to={to} className="shrink-0 text-sm font-semibold text-brand hover:text-brand-dark">See all →</Link>}
      </div>
      {children}
    </section>
  );
}

function Grid({ children }: { children: React.ReactNode }) {
  return <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">{children}</div>;
}
