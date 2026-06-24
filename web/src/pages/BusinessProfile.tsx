import { FormEvent, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { BusinessCard } from "../components/BusinessCard";
import { FavoriteButton } from "../components/FavoriteButton";
import { Stars } from "../components/Stars";
import {
  CalendarIcon, CheckIcon, ClockIcon, FacebookIcon, GlobeIcon, InstagramIcon,
  MapPinIcon, PhoneIcon, StarIcon, TagIcon, VerifiedIcon, WhatsAppIcon,
} from "../components/icons";
import { api, dayName, formatEventDate, PRICE, timeAgo } from "../lib/api";
import { mapsLinkFromCoords, mapsLinkFromText } from "../lib/maps";
import { useFetch } from "../lib/useFetch";
import type { Business } from "../types";

export function BusinessProfile() {
  const { slug } = useParams();
  const { data: b, loading, error } = useFetch<Business>(slug ? `/api/businesses/${slug}` : null);
  const { data: related } = useFetch<Business[]>(slug ? `/api/businesses/${slug}/related` : null);
  const [lightbox, setLightbox] = useState<string | null>(null);

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
        {b.cover && <img src={b.cover} alt="" className="h-full w-full object-cover" />}
        <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
      </div>

      <div className="mx-auto max-w-6xl px-4">
        {/* Header card */}
        <div className="card -mt-16 flex flex-col gap-4 p-5 sm:flex-row sm:items-end">
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
            {b.phone && <a href={`tel:${b.phone}`} className="btn btn-ghost px-4 py-2.5"><PhoneIcon className="h-4 w-4" /> Call</a>}
            {wa && <a href={`https://wa.me/${wa}`} target="_blank" rel="noreferrer" className="btn px-4 py-2.5 bg-emerald-500 text-white"><WhatsAppIcon className="h-4 w-4" /> WhatsApp</a>}
            <a href={b.lat && b.lng ? mapsLinkFromCoords(b.lat, b.lng) : mapsLinkFromText(`${b.name} ${b.address}`)} target="_blank" rel="noreferrer" className="btn btn-primary px-4 py-2.5"><MapPinIcon className="h-4 w-4" /> Directions</a>
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

            {/* Gallery */}
            {b.gallery.length > 0 && (
              <section className="card p-5">
                <h2 className="font-display text-lg font-bold text-ink">Gallery</h2>
                <div className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-3">
                  {b.gallery.map((g) => (
                    <button key={g} onClick={() => setLightbox(g)} className="aspect-square overflow-hidden rounded-xl">
                      <img src={g} alt="" loading="lazy" className="h-full w-full object-cover transition hover:scale-105" />
                    </button>
                  ))}
                </div>
              </section>
            )}

            {/* Menu / Products / Services */}
            {!!b.products?.length && (
              <section className="card p-5">
                <h2 className="font-display text-lg font-bold text-ink">{b.productLabel || "Products & Services"}</h2>
                <div className="mt-3 space-y-5">
                  {b.products.map((sec) => (
                    <div key={sec.title}>
                      <p className="text-xs font-bold uppercase tracking-wide text-brand">{sec.title}</p>
                      <ul className="mt-2 divide-y divide-border">
                        {sec.items.map((it, i) => (
                          <li key={i} className="flex items-baseline justify-between gap-3 py-2">
                            <span>
                              <span className="font-semibold text-ink">{it.name}</span>
                              {it.description && <span className="block text-xs text-muted">{it.description}</span>}
                            </span>
                            {it.price ? <span className="shrink-0 font-semibold text-ink">${it.price}</span> : null}
                          </li>
                        ))}
                      </ul>
                    </div>
                  ))}
                </div>
              </section>
            )}

            {/* Offers */}
            {!!b.offers?.length && (
              <section className="card p-5">
                <h2 className="font-display text-lg font-bold text-ink">Offers</h2>
                <div className="mt-3 space-y-3">
                  {b.offers.map((o) => (
                    <div key={o.id} className="flex items-center gap-3 rounded-xl surface-2 p-3">
                      <TagIcon className="h-5 w-5 shrink-0 text-accent" />
                      <div>
                        <p className="font-semibold text-ink">{o.title}</p>
                        <p className="text-sm text-muted">{o.description}</p>
                      </div>
                    </div>
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
                {b.phone && <li><a href={`tel:${b.phone}`} className="flex items-center gap-2 text-muted hover:text-brand"><PhoneIcon className="h-4 w-4 text-brand" /> {b.phone}</a></li>}
                {wa && <li><a href={`https://wa.me/${wa}`} target="_blank" rel="noreferrer" className="flex items-center gap-2 text-muted hover:text-brand"><WhatsAppIcon className="h-4 w-4 text-emerald-500" /> WhatsApp</a></li>}
                {b.instagram && <li><a href={`https://instagram.com/${b.instagram}`} target="_blank" rel="noreferrer" className="flex items-center gap-2 text-muted hover:text-brand"><InstagramIcon className="h-4 w-4" /> @{b.instagram}</a></li>}
                {b.facebook && <li><a href={b.facebook} target="_blank" rel="noreferrer" className="flex items-center gap-2 text-muted hover:text-brand"><FacebookIcon className="h-4 w-4" /> Facebook</a></li>}
                {b.website && <li><a href={b.website} target="_blank" rel="noreferrer" className="flex items-center gap-2 text-muted hover:text-brand"><GlobeIcon className="h-4 w-4" /> Website</a></li>}
              </ul>
              {b.lat && b.lng && (
                <a href={mapsLinkFromCoords(b.lat, b.lng)} target="_blank" rel="noreferrer" className="btn btn-ghost mt-4 w-full py-2.5"><MapPinIcon className="h-4 w-4" /> View on map</a>
              )}
            </section>
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
        {b.phone && <a href={`tel:${b.phone}`} className="btn btn-ghost flex-1 py-2.5 text-sm"><PhoneIcon className="h-4 w-4" /> Call</a>}
        {wa && <a href={`https://wa.me/${wa}`} target="_blank" rel="noreferrer" className="btn flex-1 bg-emerald-500 py-2.5 text-sm text-white"><WhatsAppIcon className="h-4 w-4" /> WhatsApp</a>}
        <a href={b.lat && b.lng ? mapsLinkFromCoords(b.lat, b.lng) : mapsLinkFromText(`${b.name} ${b.address}`)} target="_blank" rel="noreferrer" className="btn btn-primary flex-1 py-2.5 text-sm"><MapPinIcon className="h-4 w-4" /> Directions</a>
      </div>

      {/* Lightbox */}
      {lightbox && (
        <button onClick={() => setLightbox(null)} className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4">
          <img src={lightbox} alt="" className="max-h-[90vh] max-w-full rounded-2xl" />
        </button>
      )}
    </div>
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
