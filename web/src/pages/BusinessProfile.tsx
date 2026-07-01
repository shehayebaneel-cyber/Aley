import { FormEvent, useMemo, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { BookAppointmentModal } from "../components/BookAppointmentModal";
import { BuyVoucherModal } from "../components/BuyVoucherModal";
import { FacilityBookingModal } from "../components/FacilityBookingModal";
import { BusinessCard } from "../components/BusinessCard";
import { FavoriteButton } from "../components/FavoriteButton";
import { Gallery } from "../components/Gallery";
import { ProductModal, DIET_META } from "../components/ProductModal";
import { ProductPlaceholder } from "../components/ProductPlaceholder";
import { Stars } from "../components/Stars";
import {
  CalendarIcon, CheckIcon, ClockIcon, CloseIcon, FacebookIcon, GlobeIcon, InstagramIcon,
  MapPinIcon, PhoneIcon, SearchIcon, ShareIcon, StarIcon, TagIcon, TruckIcon, VerifiedIcon, WhatsAppIcon,
} from "../components/icons";
import { useUserAuth } from "../context/UserAuthContext";
import { track } from "../lib/track";
import { api, dayName, formatEventDate, PRICE, timeAgo } from "../lib/api";
import { mapsLinkFromCoords, mapsLinkFromText } from "../lib/maps";
import { useFetch } from "../lib/useFetch";
import { useTitle } from "../lib/useTitle";
import type { Business, ProductItem } from "../types";

const money = (n: number) => `$${Number.isInteger(n) ? n : n.toFixed(2)}`;
const DIET_FILTERS = ["vegetarian", "vegan", "gluten-free"] as const;

// Native share sheet (mobile) with a copy-link fallback (desktop).
function ShareButton({ name, tagline }: { name: string; tagline: string }) {
  const [copied, setCopied] = useState(false);
  async function share() {
    const url = window.location.href;
    if (navigator.share) {
      try { await navigator.share({ title: `${name} · Aley`, text: tagline || `Check out ${name}`, url }); } catch { /* cancelled */ }
      return;
    }
    try { await navigator.clipboard.writeText(url); setCopied(true); setTimeout(() => setCopied(false), 1800); } catch { /* ignore */ }
  }
  return (
    <button onClick={share} aria-label="Share" className="btn btn-ghost px-4 py-2.5"><ShareIcon className="h-4 w-4" /> {copied ? "Copied!" : "Share"}</button>
  );
}

export function BusinessProfile() {
  const { slug } = useParams();
  const { data: b, loading, error } = useFetch<Business>(slug ? `/api/businesses/${slug}` : null);
  const { data: related } = useFetch<Business[]>(slug ? `/api/businesses/${slug}/related` : null);
  const [booking, setBooking] = useState(false);
  const [appt, setAppt] = useState(false);
  const [facBook, setFacBook] = useState<{ open: boolean; facilityId?: number }>({ open: false });
  const [voucher, setVoucher] = useState(false);
  useTitle(b?.name);

  if (loading) return <div className="mx-auto max-w-5xl px-4 py-16"><div className="card h-96 animate-pulse" /></div>;
  if (error || !b)
    return (
      <div className="mx-auto max-w-3xl px-4 py-24 text-center">
        <p className="text-lg font-semibold text-ink">Business not found.</p>
        <Link to="/explore" className="mt-3 inline-block font-semibold text-brand">← Back to explore</Link>
      </div>
    );

  const wa = b.whatsapp.replace(/[^\d]/g, "");
  const todayHours = b.hours.find((h) => h.day === new Date().getDay());

  return (
    <div>
      {/* Cover */}
      <div className="relative h-56 w-full overflow-hidden bg-surface-2 sm:h-72">
        {b.cover ? (
          <img src={b.cover} alt="" className="h-full w-full object-cover" />
        ) : (
          <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-brand/30 via-brand-soft to-surface-2">
            <span className="text-5xl opacity-60">{b.category.icon}</span>
          </div>
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
      </div>

      <div className="mx-auto max-w-6xl px-4">
        {/* Header card */}
        <div className="card relative z-10 -mt-16 flex flex-col gap-4 p-5 sm:flex-row sm:items-end">
          <div className="flex items-end gap-4">
            <img src={b.logo ?? b.cover ?? ""} alt={b.name} className="h-24 w-24 shrink-0 rounded-2xl border-4 border-surface object-cover shadow-lg" />
            <div>
              <div className="flex items-center gap-2">
                <h1 className="font-display text-2xl font-extrabold text-ink sm:text-3xl">{b.name}</h1>
                {b.isVerified && <VerifiedIcon className="h-5 w-5 text-brand" />}
              </div>
              <p className="text-muted">{b.tagline}</p>
              <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-sm">
                <Link to={`/explore?category=${b.category.slug}`} className="font-semibold text-brand">{b.category.icon} {b.category.name}</Link>
                <span className="inline-flex items-center gap-1 font-semibold text-ink"><StarIcon className="h-4 w-4 text-amber-400" /> {b.rating > 0 ? b.rating.toFixed(1) : "New"} <span className="font-normal text-muted">({b.reviewCount})</span></span>
                <span className="text-muted">{PRICE(b.priceRange)}</span>
                <span className={`rounded-full px-2 py-0.5 text-xs font-bold ${b.openNow ? "bg-emerald-500/15 text-emerald-600" : "bg-red-500/15 text-red-500"}`}>{b.openNow ? "Open now" : "Closed"}</span>
              </div>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-2 sm:ml-auto">
            <FavoriteButton businessId={b.id} className="!h-11 !w-11 border border-border !bg-surface" />
            <ShareButton name={b.name} tagline={b.tagline} />
            {b.phone && <a href={`tel:${b.phone}`} onClick={() => track(b.id, "CALL")} className="btn btn-ghost px-4 py-2.5"><PhoneIcon className="h-4 w-4" /> Call</a>}
            {wa && <a href={`https://wa.me/${wa}`} onClick={() => track(b.id, "WHATSAPP")} target="_blank" rel="noreferrer" className="btn px-4 py-2.5 bg-emerald-500 text-white"><WhatsAppIcon className="h-4 w-4" /> WhatsApp</a>}
            {b.hasFacilities && <button onClick={() => setFacBook({ open: true })} className="btn btn-primary px-4 py-2.5"><CalendarIcon className="h-4 w-4" /> Book Now</button>}
            {b.appointmentBookable && <button onClick={() => setAppt(true)} className="btn btn-primary px-4 py-2.5"><CalendarIcon className="h-4 w-4" /> {b.bookingCta ?? "Book appointment"}</button>}
            {b.bookingMode === "table" && b.hasReservations && <button onClick={() => setBooking(true)} className="btn px-4 py-2.5 bg-accent text-white"><CalendarIcon className="h-4 w-4" /> Book a table</button>}
            {b.hasDelivery && <Link to={`/delivery?pickup=${encodeURIComponent(`${b.name}, ${b.address}`)}${b.lat && b.lng ? `&plat=${b.lat}&plng=${b.lng}` : ""}&businessId=${b.id}`} className="btn btn-ghost px-4 py-2.5"><TruckIcon className="h-4 w-4" /> Request delivery</Link>}
            {b.hasVouchers && <button onClick={() => setVoucher(true)} className="btn btn-ghost px-4 py-2.5">🎁 Gift Voucher</button>}
            <a href={b.lat && b.lng ? mapsLinkFromCoords(b.lat, b.lng) : mapsLinkFromText(`${b.name} ${b.address}`)} onClick={() => track(b.id, "DIRECTIONS")} target="_blank" rel="noreferrer" className="btn btn-primary px-4 py-2.5"><MapPinIcon className="h-4 w-4" /> Directions</a>
          </div>
        </div>

        <div className="mt-6 grid gap-6 lg:grid-cols-3">
          {/* Main column */}
          <div className="space-y-6 lg:col-span-2">
            {b.description && (
              <section className="card p-5">
                <h2 className="font-display text-lg font-bold text-ink">About</h2>
                <p className="mt-2 leading-relaxed text-muted">{b.description}</p>
                {b.tags.length > 0 && (
                  <div className="mt-4 flex flex-wrap gap-2">
                    {b.tags.map((t) => <span key={t} className="chip !py-1 !text-xs capitalize">{t}</span>)}
                  </div>
                )}
              </section>
            )}

            {/* Facilities (hourly rentals) */}
            {!!b.facilities?.length && (
              <section className="card p-5">
                <h2 className="font-display text-lg font-bold text-ink">Facilities & courts</h2>
                <p className="mt-1 text-sm text-muted">Book by the hour — live availability, instant confirmation.</p>
                <div className="mt-3 grid gap-2 sm:grid-cols-2">
                  {b.facilities.map((f) => (
                    <button key={f.id} onClick={() => setFacBook({ open: true, facilityId: f.id })} className="group flex items-stretch gap-3 rounded-2xl border border-border p-2.5 text-left transition hover:border-brand/60 hover:bg-surface-2">
                      <div className="h-20 w-20 shrink-0 overflow-hidden rounded-xl">
                        {f.image ? <img src={f.image} alt={f.name} className="h-full w-full object-cover" /> : <div className="flex h-full w-full items-center justify-center bg-brand-soft text-2xl">🏟️</div>}
                      </div>
                      <div className="flex min-w-0 flex-1 flex-col">
                        <span className="font-semibold text-ink">{f.name}</span>
                        {(f.type || f.capacityNote) && <span className="text-xs text-muted">{[f.type, f.capacityNote].filter(Boolean).join(" · ")}</span>}
                        <div className="mt-auto flex items-center justify-between pt-1.5">
                          <span className="font-semibold text-ink">${f.hourlyRate}<span className="text-xs font-normal text-muted">/hr</span></span>
                          <span className="rounded-full bg-brand px-3 py-1 text-xs font-bold text-white transition group-hover:bg-brand-dark">Book</span>
                        </div>
                      </div>
                    </button>
                  ))}
                </div>
              </section>
            )}

            {/* Gallery */}
            <Gallery images={b.gallery} />

            {/* Menu / Products / Services */}
            {!!b.products?.length && <MenuSection business={b} />}

            {/* Offers */}
            {!!b.offers?.length && (
              <section className="card p-5">
                <h2 className="font-display text-lg font-bold text-ink">Offers & deals</h2>
                <div className="mt-3 space-y-3">
                  {b.offers.map((o) => (
                    <Link key={o.id} to={`/offer/${o.id}`} className="group flex items-center gap-3 rounded-xl surface-2 p-3 transition hover:bg-surface">
                      <span className="inline-flex shrink-0 items-center gap-1 rounded-lg bg-accent px-2.5 py-1 text-xs font-extrabold text-white">{o.badge || o.type?.replace(/_/g, " ")}</span>
                      <div className="min-w-0 flex-1">
                        <p className="font-semibold text-ink">{o.title}</p>
                        <p className="line-clamp-1 text-sm text-muted">{o.description}</p>
                      </div>
                      <span className="shrink-0 text-sm font-semibold text-brand opacity-0 transition group-hover:opacity-100">View →</span>
                    </Link>
                  ))}
                </div>
              </section>
            )}

            {/* Events */}
            {!!b.events?.length && (
              <section className="card p-5">
                <h2 className="font-display text-lg font-bold text-ink">Upcoming events</h2>
                <div className="mt-3 space-y-3">
                  {b.events.map((e) => (
                    <div key={e.id} className="flex items-center gap-3 rounded-xl surface-2 p-3">
                      <CalendarIcon className="h-5 w-5 shrink-0 text-brand" />
                      <div>
                        <p className="font-semibold text-ink">{e.title}</p>
                        <p className="text-sm text-muted">{formatEventDate(e.startTime)}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </section>
            )}

            {/* FAQs */}
            {!!b.faqs?.length && (
              <section className="card p-5">
                <h2 className="font-display text-lg font-bold text-ink">FAQ</h2>
                <div className="mt-3 divide-y divide-border">
                  {b.faqs.map((f, i) => (
                    <details key={i} className="group py-3">
                      <summary className="cursor-pointer list-none font-semibold text-ink">{f.q}</summary>
                      <p className="mt-1 text-sm text-muted">{f.a}</p>
                    </details>
                  ))}
                </div>
              </section>
            )}

            {/* Reviews */}
            <Reviews business={b} />
          </div>

          {/* Sidebar */}
          <aside className="space-y-6">
            <section className="card p-5">
              <h2 className="font-display text-lg font-bold text-ink">Hours</h2>
              {todayHours && (
                <p className={`mt-2 inline-flex items-center gap-1.5 text-sm font-semibold ${b.openNow ? "text-emerald-600" : "text-red-500"}`}>
                  <ClockIcon className="h-4 w-4" /> {b.openNow ? "Open now" : "Closed"} {todayHours.closed ? "" : `· ${todayHours.open}–${todayHours.close}`}
                </p>
              )}
              <ul className="mt-3 space-y-1 text-sm">
                {b.hours.map((h) => (
                  <li key={h.day} className={`flex justify-between ${h.day === new Date().getDay() ? "font-semibold text-ink" : "text-muted"}`}>
                    <span>{dayName(h.day)}</span>
                    <span>{h.closed ? "Closed" : `${h.open} – ${h.close}`}</span>
                  </li>
                ))}
              </ul>
            </section>

            <section className="card p-5">
              <h2 className="font-display text-lg font-bold text-ink">Contact</h2>
              <ul className="mt-3 space-y-2.5 text-sm">
                {b.ownerName && <li className="text-muted">👤 Owner: <span className="font-semibold text-ink">{b.ownerName}</span></li>}
                {b.address && <li className="flex items-start gap-2 text-muted"><MapPinIcon className="mt-0.5 h-4 w-4 shrink-0 text-brand" /> {b.address}</li>}
                {b.phone && <li><a href={`tel:${b.phone}`} onClick={() => track(b.id, "PHONE_VIEW")} className="flex items-center gap-2 text-muted hover:text-brand"><PhoneIcon className="h-4 w-4 text-brand" /> {b.phone}</a></li>}
                {wa && <li><a href={`https://wa.me/${wa}`} onClick={() => track(b.id, "WHATSAPP")} target="_blank" rel="noreferrer" className="flex items-center gap-2 text-muted hover:text-brand"><WhatsAppIcon className="h-4 w-4 text-emerald-500" /> WhatsApp</a></li>}
                {b.instagram && <li><a href={`https://instagram.com/${b.instagram}`} target="_blank" rel="noreferrer" className="flex items-center gap-2 text-muted hover:text-brand"><InstagramIcon className="h-4 w-4" /> @{b.instagram}</a></li>}
                {b.facebook && <li><a href={b.facebook} target="_blank" rel="noreferrer" className="flex items-center gap-2 text-muted hover:text-brand"><FacebookIcon className="h-4 w-4" /> Facebook</a></li>}
                {b.website && <li><a href={b.website} onClick={() => track(b.id, "WEBSITE")} target="_blank" rel="noreferrer" className="flex items-center gap-2 text-muted hover:text-brand"><GlobeIcon className="h-4 w-4" /> Website</a></li>}
              </ul>
              {b.lat && b.lng && (
                <a href={mapsLinkFromCoords(b.lat, b.lng)} onClick={() => track(b.id, "DIRECTIONS")} target="_blank" rel="noreferrer" className="btn btn-ghost mt-4 w-full py-2.5"><MapPinIcon className="h-4 w-4" /> View on map</a>
              )}
            </section>

            {!b.isClaimed && (
              <section className="card border-dashed p-5 text-center">
                <p className="font-display font-bold text-ink">Is this your business?</p>
                <p className="mt-1 text-sm text-muted">Claim this page to manage your info, photos, offers and orders.</p>
                <Link to={`/owner/login?claim=${b.id}&claimName=${encodeURIComponent(b.name)}`} className="btn btn-primary mt-3 w-full py-2.5">Claim this business</Link>
              </section>
            )}
          </aside>
        </div>

        {/* Related */}
        {!!related?.length && (
          <section className="mt-12">
            <h2 className="mb-5 font-display text-2xl font-extrabold text-ink">Similar in {b.city?.name ?? "Aley"}</h2>
            <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
              {related.map((r) => <BusinessCard key={r.id} business={r} />)}
            </div>
          </section>
        )}
      </div>

      {/* Sticky mobile action bar (mini-website feel) */}
      <div className="h-20 sm:hidden" />
      <div className="fixed inset-x-0 bottom-0 z-30 flex gap-2 border-t border-border bg-surface/95 p-3 backdrop-blur sm:hidden">
        {b.phone && <a href={`tel:${b.phone}`} onClick={() => track(b.id, "CALL")} className="btn btn-ghost flex-1 py-2.5 text-sm"><PhoneIcon className="h-4 w-4" /> Call</a>}
        {b.hasFacilities ? (
          <button onClick={() => setFacBook({ open: true })} className="btn btn-primary flex-1 py-2.5 text-sm"><CalendarIcon className="h-4 w-4" /> Book</button>
        ) : b.appointmentBookable ? (
          <button onClick={() => setAppt(true)} className="btn btn-primary flex-1 py-2.5 text-sm"><CalendarIcon className="h-4 w-4" /> Book</button>
        ) : b.bookingMode === "table" && b.hasReservations ? (
          <button onClick={() => setBooking(true)} className="btn flex-1 bg-accent py-2.5 text-sm text-white"><CalendarIcon className="h-4 w-4" /> Book</button>
        ) : wa ? (
          <a href={`https://wa.me/${wa}`} onClick={() => track(b.id, "WHATSAPP")} target="_blank" rel="noreferrer" className="btn flex-1 bg-emerald-500 py-2.5 text-sm text-white"><WhatsAppIcon className="h-4 w-4" /> WhatsApp</a>
        ) : null}
        <a href={b.lat && b.lng ? mapsLinkFromCoords(b.lat, b.lng) : mapsLinkFromText(`${b.name} ${b.address}`)} onClick={() => track(b.id, "DIRECTIONS")} target="_blank" rel="noreferrer" className="btn btn-primary flex-1 py-2.5 text-sm"><MapPinIcon className="h-4 w-4" /> Directions</a>
      </div>

      {booking && <BookingModal businessId={b.id} businessName={b.name} onClose={() => setBooking(false)} />}
      {appt && <BookAppointmentModal business={b} onClose={() => setAppt(false)} />}
      {facBook.open && !!b.facilities?.length && <FacilityBookingModal business={b} facilities={b.facilities} initialFacilityId={facBook.facilityId} onClose={() => setFacBook({ open: false })} />}
      {voucher && <BuyVoucherModal business={b} onClose={() => setVoucher(false)} />}
    </div>
  );
}

// ---- Menu / Products (visual ordering experience) ----
function MenuSection({ business }: { business: Business }) {
  const sections = business.products ?? [];
  const canOrder = business.openNow;
  const [modal, setModal] = useState<ProductItem | null>(null);
  const [q, setQ] = useState("");
  const [filter, setFilter] = useState<string>("all"); // "all" | "featured" | "diet:<x>" | section title

  const dietsPresent = useMemo(() => {
    const present = new Set<string>();
    sections.forEach((sec) => sec.items.forEach((it) => it.diet?.forEach((d) => present.add(d))));
    return DIET_FILTERS.filter((d) => present.has(d));
  }, [sections]);

  const featured = useMemo(() => sections.flatMap((sec) => sec.items.filter((it) => it.featured)), [sections]);

  const query = q.trim().toLowerCase();
  const matches = (it: ProductItem) => {
    if (query && !`${it.name} ${it.description ?? ""}`.toLowerCase().includes(query)) return false;
    if (filter.startsWith("diet:") && !(it.diet ?? []).includes(filter.slice(5))) return false;
    return true;
  };

  const sectionFilterActive = filter !== "all" && filter !== "featured" && !filter.startsWith("diet:");
  const visibleSections = sections
    .filter((sec) => !sectionFilterActive || sec.title === filter)
    .map((sec) => ({ title: sec.title, items: sec.items.filter((it) => (filter === "featured" ? it.featured : true)).filter(matches) }))
    .filter((sec) => sec.items.length > 0);

  const showFeaturedStrip = filter === "all" && !query && featured.length > 0;
  const totalShown = visibleSections.reduce((s, sec) => s + sec.items.length, 0);

  const chipCls = (active: boolean) => `chip ${active ? "chip-active" : ""}`;

  return (
    <section className="card p-5">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 className="font-display text-lg font-bold text-ink">{business.productLabel || "Menu"}</h2>
        {!canOrder && <span className="rounded-full bg-red-500/15 px-2.5 py-1 text-xs font-bold text-red-500">Closed — ordering unavailable</span>}
      </div>

      {/* Search */}
      <div className="relative mt-3">
        <SearchIcon className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted" />
        <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search the menu…" className="input !py-2.5 !pl-9" />
      </div>

      {/* Filters */}
      <div className="mt-3 flex flex-wrap gap-2">
        <button onClick={() => setFilter("all")} className={chipCls(filter === "all")}>All</button>
        {featured.length > 0 && <button onClick={() => setFilter("featured")} className={chipCls(filter === "featured")}>⭐ Featured</button>}
        {dietsPresent.map((d) => (
          <button key={d} onClick={() => setFilter(`diet:${d}`)} className={chipCls(filter === `diet:${d}`)}>{DIET_META[d]?.icon} {DIET_META[d]?.label ?? d}</button>
        ))}
        {sections.length > 1 && sections.map((sec) => (
          <button key={sec.title} onClick={() => setFilter(sec.title)} className={chipCls(filter === sec.title)}>{sec.title}</button>
        ))}
      </div>

      {/* Featured strip */}
      {showFeaturedStrip && (
        <div className="mt-5">
          <p className="text-xs font-bold uppercase tracking-wide text-amber-500">⭐ Featured</p>
          <div className="mt-2 grid gap-2 sm:grid-cols-2">
            {featured.map((it, i) => <ProductRow key={`f${i}`} item={it} canOrder={canOrder} onOpen={() => setModal(it)} />)}
          </div>
        </div>
      )}

      {/* Sections */}
      <div className="mt-5 space-y-6">
        {totalShown === 0 && <p className="py-6 text-center text-sm text-muted">No items match your search.</p>}
        {visibleSections.map((sec) => (
          <div key={sec.title}>
            <p className="text-xs font-bold uppercase tracking-wide text-brand">{sec.title}</p>
            <div className="mt-2 grid gap-2 sm:grid-cols-2">
              {sec.items.map((it, i) => <ProductRow key={`${sec.title}-${i}`} item={it} canOrder={canOrder} onOpen={() => setModal(it)} />)}
            </div>
          </div>
        ))}
      </div>

      {modal && <ProductModal business={business} item={modal} canOrder={canOrder} onClose={() => setModal(null)} />}
    </section>
  );
}

function ProductRow({ item, canOrder, onOpen }: { item: ProductItem; canOrder: boolean; onOpen: () => void }) {
  const unavailable = item.available === false;
  const hasOptions = !!item.options?.length;
  return (
    <button
      type="button"
      disabled={unavailable}
      onClick={onOpen}
      className="group flex w-full items-stretch gap-3 rounded-2xl border border-border p-2.5 text-left transition hover:border-brand/60 hover:bg-surface-2 disabled:cursor-not-allowed disabled:opacity-50"
    >
      <div className="relative h-20 w-20 shrink-0 overflow-hidden rounded-xl">
        {item.image ? <img src={item.image} alt={item.name} loading="lazy" className="h-full w-full object-cover transition group-hover:scale-105" /> : <ProductPlaceholder className="h-full w-full" />}
        {item.badge && <span className="absolute left-1 top-1 rounded-full bg-amber-400 px-1.5 py-0.5 text-[10px] font-bold text-amber-950">{item.badge}</span>}
      </div>
      <div className="flex min-w-0 flex-1 flex-col">
        <div className="flex items-center gap-1.5">
          <span className="truncate font-semibold text-ink">{item.name}</span>
          {item.featured && <StarIcon className="h-3.5 w-3.5 shrink-0 text-amber-400" />}
        </div>
        {item.description && <p className="mt-0.5 line-clamp-2 text-xs leading-snug text-muted">{item.description}</p>}
        {!!item.diet?.length && (
          <div className="mt-1 flex flex-wrap gap-1">
            {item.diet.map((d) => <span key={d} className="text-xs" title={DIET_META[d]?.label}>{DIET_META[d]?.icon}</span>)}
          </div>
        )}
        <div className="mt-auto flex items-center justify-between pt-1.5">
          <span className="font-semibold text-ink">{item.price != null ? `${hasOptions ? "from " : ""}${money(item.price)}` : ""}</span>
          {unavailable ? (
            <span className="rounded-full bg-surface-2 px-2 py-0.5 text-[11px] font-bold text-muted">Unavailable</span>
          ) : (
            <span className="rounded-full bg-brand px-3 py-1 text-xs font-bold text-white transition group-hover:bg-brand-dark">{canOrder ? (hasOptions ? "Customize" : "Add") : "View"}</span>
          )}
        </div>
      </div>
    </button>
  );
}

function Reviews({ business }: { business: Business }) {
  const [reviews, setReviews] = useState(business.reviews ?? []);
  const [name, setName] = useState("");
  const [rating, setRating] = useState(5);
  const [comment, setComment] = useState("");
  const [done, setDone] = useState(false);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");

  async function submit(e: FormEvent) {
    e.preventDefault();
    if (busy) return;
    setBusy(true);
    setErr("");
    try {
      await api.post("/api/reviews", { businessId: business.id, authorName: name, rating, comment });
      setDone(true);
      setName(""); setComment(""); setRating(5);
    } catch (e2) {
      setErr(e2 instanceof Error ? e2.message : "Couldn't submit.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="card p-5">
      <div className="flex items-center justify-between">
        <h2 className="font-display text-lg font-bold text-ink">Reviews ({reviews.length})</h2>
        <span className="inline-flex items-center gap-1.5"><Stars rating={business.rating} /> <span className="font-semibold text-ink">{business.rating > 0 ? business.rating.toFixed(1) : "New"}</span></span>
      </div>

      <div className="mt-4 space-y-4">
        {reviews.length === 0 && <p className="text-sm text-muted">No reviews yet — be the first!</p>}
        {reviews.map((r) => (
          <div key={r.id} className="border-b border-border pb-4 last:border-0">
            <div className="flex items-center justify-between">
              <span className="font-semibold text-ink">{r.authorName}</span>
              <span className="text-xs text-muted">{timeAgo(r.createdAt)}</span>
            </div>
            <Stars rating={r.rating} className="mt-0.5 h-3.5 w-3.5" />
            {r.comment && <p className="mt-1 text-sm text-muted">{r.comment}</p>}
            {r.reply && (
              <div className="mt-2 rounded-xl surface-2 p-3 text-sm">
                <p className="font-semibold text-ink">Response from {business.name}</p>
                <p className="text-muted">{r.reply}</p>
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Write a review */}
      <div className="mt-5 border-t border-border pt-5">
        {done ? (
          <div className="flex items-center gap-2 rounded-xl bg-emerald-500/10 p-4 text-sm font-semibold text-emerald-600">
            <CheckIcon className="h-5 w-5" /> Thanks! Your review will appear once approved.
          </div>
        ) : (
          <form onSubmit={submit} className="space-y-3">
            <p className="font-semibold text-ink">Write a review</p>
            <div className="flex items-center gap-1">
              {[1, 2, 3, 4, 5].map((i) => (
                <button key={i} type="button" onClick={() => setRating(i)} aria-label={`${i} stars`}>
                  <StarIcon className={`h-7 w-7 ${i <= rating ? "text-amber-400" : "text-border"}`} />
                </button>
              ))}
            </div>
            <input value={name} onChange={(e) => setName(e.target.value)} required placeholder="Your name" className="input" />
            <textarea value={comment} onChange={(e) => setComment(e.target.value)} rows={3} placeholder="Share your experience…" className="input" />
            {err && <p className="text-sm font-medium text-red-500">{err}</p>}
            <button type="submit" disabled={busy} className="btn btn-primary px-6 py-2.5 disabled:opacity-60">{busy ? "Submitting…" : "Submit review"}</button>
          </form>
        )}
      </div>
    </section>
  );
}

function BookingModal({ businessId, businessName, onClose }: { businessId: number; businessName: string; onClose: () => void }) {
  const { user } = useUserAuth();
  const today = new Date().toISOString().slice(0, 10);
  const [form, setForm] = useState({
    name: user?.name ?? "",
    phone: "",
    email: user?.email ?? "",
    partySize: 2,
    date: today,
    time: "20:00",
    note: "",
  });
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(false);
  const [err, setErr] = useState("");
  const set = (patch: Partial<typeof form>) => setForm((f) => ({ ...f, ...patch }));

  async function submit(e: FormEvent) {
    e.preventDefault();
    if (busy) return;
    setBusy(true);
    setErr("");
    try {
      await api.post("/api/reservations", { businessId, ...form });
      setDone(true);
    } catch (e2) {
      setErr(e2 instanceof Error ? e2.message : "Couldn't send the request.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/50 p-0 backdrop-blur-sm sm:items-center sm:p-4" onClick={onClose}>
      <div className="card pop-in max-h-[92vh] w-full max-w-lg overflow-y-auto rounded-b-none p-6 sm:rounded-3xl" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between">
          <h2 className="font-display text-xl font-extrabold text-ink">Book a table</h2>
          <button onClick={onClose} aria-label="Close" className="text-muted hover:text-ink"><CloseIcon /></button>
        </div>

        {done ? (
          <div className="mt-5 text-center">
            <span className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-emerald-500/15 text-emerald-600"><CheckIcon className="h-7 w-7" /></span>
            <p className="mt-3 font-display text-lg font-bold text-ink">Request sent!</p>
            <p className="mt-1 text-muted">{businessName} will confirm your booking shortly{form.phone ? ` on ${form.phone}` : ""}.</p>
            <button onClick={onClose} className="btn btn-primary mt-5 px-6 py-2.5">Done</button>
          </div>
        ) : (
          <form onSubmit={submit} className="mt-4 space-y-3">
            <p className="text-sm text-muted">Request a table at <span className="font-semibold text-ink">{businessName}</span>. They'll confirm by phone.</p>
            <div className="grid grid-cols-2 gap-3">
              <label className="text-sm font-semibold text-ink">Date
                <input type="date" required min={today} value={form.date} onChange={(e) => set({ date: e.target.value })} className="input mt-1" />
              </label>
              <label className="text-sm font-semibold text-ink">Time
                <input type="time" required value={form.time} onChange={(e) => set({ time: e.target.value })} className="input mt-1" />
              </label>
            </div>
            <label className="text-sm font-semibold text-ink">Party size
              <input type="number" required min={1} max={30} value={form.partySize} onChange={(e) => set({ partySize: Number(e.target.value) })} className="input mt-1" />
            </label>
            <input required value={form.name} onChange={(e) => set({ name: e.target.value })} placeholder="Your name" className="input" />
            <input required value={form.phone} onChange={(e) => set({ phone: e.target.value })} placeholder="Phone number" className="input" />
            <input value={form.email} onChange={(e) => set({ email: e.target.value })} placeholder="Email (optional)" className="input" />
            <textarea value={form.note} onChange={(e) => set({ note: e.target.value })} rows={2} placeholder="Any requests? (high chair, window seat…)" className="input" />
            {err && <p className="rounded-lg bg-red-500/10 px-3 py-2 text-sm font-medium text-red-500">{err}</p>}
            <button type="submit" disabled={busy} className="btn btn-primary w-full py-3 disabled:opacity-60">{busy ? "Sending…" : "Request booking"}</button>
          </form>
        )}
      </div>
    </div>
  );
}
