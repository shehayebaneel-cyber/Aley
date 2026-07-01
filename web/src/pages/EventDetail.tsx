import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { BookTicketModal } from "../components/BookTicketModal";
import { EventCard } from "../components/EventCard";
import { CalendarIcon, ClockIcon, HeartIcon, MapPinIcon, ShareIcon, StarIcon, UsersIcon } from "../components/icons";
import { useUserAuth } from "../context/UserAuthContext";
import { userApi } from "../lib/api";
import { useFetch } from "../lib/useFetch";
import { countdown, eventEmoji, fmtFull, priceLabel } from "../lib/events";
import type { EventDetailT } from "../types";

const RSVPS: { key: string; label: string; emoji: string }[] = [
  { key: "GOING", label: "Going", emoji: "✅" },
  { key: "INTERESTED", label: "Interested", emoji: "★" },
  { key: "MAYBE", label: "Maybe", emoji: "🤔" },
];

function Countdown({ iso }: { iso: string }) {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => { const t = setInterval(() => setNow(Date.now()), 1000); return () => clearInterval(t); }, []);
  const c = countdown(iso, now);
  if (!c) return <span className="text-emerald-600">Happening now / started</span>;
  const box = (n: number, l: string) => <div className="rounded-xl bg-surface-2 px-3 py-2 text-center"><p className="font-display text-xl font-extrabold text-ink">{n}</p><p className="text-[10px] uppercase text-muted">{l}</p></div>;
  return <div className="flex gap-2">{box(c.d, "days")}{box(c.h, "hrs")}{box(c.m, "min")}{box(c.s, "sec")}</div>;
}

export function EventDetail() {
  const { id } = useParams();
  const { data: ev, loading } = useFetch<EventDetailT>(`/api/events/${id}`);
  const { user, openAuth } = useUserAuth();
  const [rsvp, setRsvp] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);
  const [counts, setCounts] = useState({ going: 0, interested: 0 });
  const [book, setBook] = useState(false);
  const [copied, setCopied] = useState(false);
  const [synced, setSynced] = useState(false);

  // Seed local state once the event loads.
  if (ev && !synced) { setRsvp(ev.myRsvp ?? null); setSaved(!!ev.saved); setCounts({ going: ev.attending ?? 0, interested: ev.interested ?? 0 }); setSynced(true); }

  if (loading) return <div className="mx-auto max-w-4xl px-4 py-16 text-muted">Loading…</div>;
  if (!ev) return <div className="mx-auto max-w-md px-4 py-24 text-center"><p className="text-lg font-semibold text-ink">Event not found.</p><Link to="/events" className="btn btn-primary mt-4 px-6 py-2.5">All events</Link></div>;

  async function setRsvpStatus(status: string) {
    if (!user) return openAuth();
    const next = rsvp === status ? null : status;
    setRsvp(next);
    try {
      const r = next ? await userApi.post<{ counts: { going: number; interested: number } }>(`/api/events/${ev!.id}/rsvp`, { status: next })
                     : await userApi.delete<{ counts: { going: number; interested: number } }>(`/api/events/${ev!.id}/rsvp`);
      setCounts({ going: r.counts.going, interested: r.counts.interested });
    } catch { /* ignore */ }
  }
  async function toggleSave() {
    if (!user) return openAuth();
    const next = !saved; setSaved(next);
    try { next ? await userApi.post(`/api/me/events/${ev!.id}/save`, {}) : await userApi.delete(`/api/me/events/${ev!.id}/save`); } catch { setSaved(!next); }
  }
  async function share() {
    const url = window.location.href;
    try { if (navigator.share) await navigator.share({ title: ev!.title, url }); else { await navigator.clipboard.writeText(url); setCopied(true); setTimeout(() => setCopied(false), 1800); } } catch { /* cancelled */ }
  }

  const mapHref = ev.lat && ev.lng ? `https://www.google.com/maps/search/?api=1&query=${ev.lat},${ev.lng}` : `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(ev.location + ", Aley, Lebanon")}`;
  const b = ev.business;

  return (
    <div className="mx-auto max-w-5xl px-4 py-6">
      <Link to="/events" className="text-sm font-semibold text-muted hover:text-ink">← All events</Link>

      {/* Banner */}
      <div className="mt-3 overflow-hidden rounded-3xl">
        <div className="relative h-64 bg-surface-2 sm:h-96">
          {ev.image ? <img src={ev.image} alt="" className="h-full w-full object-cover" /> : <div className="flex h-full w-full items-center justify-center text-7xl">{eventEmoji(ev)}</div>}
          <div className="absolute inset-0 bg-gradient-to-t from-black/70 to-transparent" />
          <div className="absolute bottom-0 left-0 right-0 p-6 text-white">
            <span className="rounded-full bg-black/50 px-3 py-1 text-xs font-semibold backdrop-blur">{ev.categoryEmoji} {ev.categoryLabel}</span>
            <h1 className="mt-2 font-display text-3xl font-extrabold sm:text-4xl">{ev.title}</h1>
          </div>
        </div>
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-[1.5fr_1fr]">
        {/* Main */}
        <div className="space-y-5">
          {/* Countdown */}
          <div className="card p-5">
            <p className="text-sm font-semibold text-muted">Starts in</p>
            <div className="mt-2"><Countdown iso={ev.startTime} /></div>
          </div>

          <section className="card p-5">
            <h2 className="font-display font-bold text-ink">About this event</h2>
            <p className="mt-2 whitespace-pre-line text-muted">{ev.description || "No description provided."}</p>
          </section>

          {/* Gallery */}
          {!!ev.gallery?.length && (
            <section className="card p-5">
              <h2 className="font-display font-bold text-ink">Gallery</h2>
              <div className="no-scrollbar -mx-1 mt-3 flex gap-3 overflow-x-auto px-1">
                {ev.gallery.map((g, i) => <img key={i} src={g.url} alt={g.caption ?? ""} className="h-40 w-56 shrink-0 rounded-xl object-cover" />)}
              </div>
            </section>
          )}

          {/* Location */}
          <section className="card p-5">
            <h2 className="font-display font-bold text-ink">Location</h2>
            <p className="mt-2 flex items-center gap-2 text-ink"><MapPinIcon className="h-4 w-4 text-muted" /> {ev.location}</p>
            <a href={mapHref} target="_blank" rel="noreferrer" className="btn btn-ghost mt-3 px-4 py-2 text-sm">Open in Google Maps ↗</a>
          </section>

          {/* Organizer */}
          {(ev.organizerName || b) && (
            <section className="card p-5">
              <h2 className="font-display font-bold text-ink">Organizer</h2>
              {b ? (
                <Link to={`/business/${b.slug}`} className="mt-3 flex items-center gap-3 rounded-2xl surface-2 p-3 transition hover:bg-surface">
                  {b.logo ? <img src={b.logo} alt="" className="h-11 w-11 rounded-xl object-cover" /> : <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-brand-soft">{b.category?.icon ?? "🏬"}</span>}
                  <div className="min-w-0"><p className="truncate font-display font-bold text-ink">{ev.organizerName || b.name}</p>{!!b.rating && <p className="flex items-center gap-1 text-xs text-muted"><StarIcon className="h-3 w-3 text-amber-400" /> {b.rating.toFixed(1)}</p>}</div>
                </Link>
              ) : <p className="mt-2 text-muted">{ev.organizerName}</p>}
              {(ev.organizerPhone || b?.phone) && <p className="mt-2 text-sm text-muted">📞 {ev.organizerPhone || b?.phone}</p>}
            </section>
          )}

          {/* Nearby */}
          {!!ev.nearby?.length && (
            <section className="card p-5">
              <h2 className="font-display font-bold text-ink">Nearby places</h2>
              <div className="mt-3 grid grid-cols-2 gap-3">
                {ev.nearby.map((n) => (
                  <Link key={n.slug} to={`/business/${n.slug}`} className="flex items-center gap-2 rounded-xl surface-2 p-2.5 transition hover:bg-surface">
                    {n.logo ? <img src={n.logo} alt="" className="h-9 w-9 rounded-lg object-cover" /> : <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-brand-soft">{n.category?.icon ?? "🏬"}</span>}
                    <span className="min-w-0"><span className="block truncate text-sm font-semibold text-ink">{n.name}</span><span className="text-xs text-muted">{n.category?.name}</span></span>
                  </Link>
                ))}
              </div>
            </section>
          )}
        </div>

        {/* Sticky action panel */}
        <div className="space-y-4">
          <div className="card p-5 lg:sticky lg:top-24">
            <p className="flex items-center gap-2 text-ink"><CalendarIcon className="h-4 w-4 text-muted" /> {fmtFull(ev.startTime)}</p>
            {ev.endTime && <p className="mt-1 flex items-center gap-2 text-sm text-muted"><ClockIcon className="h-4 w-4" /> until {fmtFull(ev.endTime)}</p>}
            <p className="mt-3 font-display text-2xl font-extrabold text-ink">{priceLabel(ev)}</p>
            {ev.remaining != null && <p className="text-xs font-medium text-amber-600">{ev.remaining} spots left</p>}
            <p className="mt-2 inline-flex items-center gap-1 text-sm text-muted"><UsersIcon className="h-4 w-4" /> {counts.going} going · {counts.interested} interested</p>

            <button onClick={() => setBook(true)} className="btn btn-primary mt-4 w-full py-3 text-base">{ev.isFree ? "Reserve a spot" : "Get tickets"}</button>

            {/* RSVP */}
            <div className="mt-3 grid grid-cols-3 gap-2">
              {RSVPS.map((r) => (
                <button key={r.key} onClick={() => setRsvpStatus(r.key)} className={`rounded-xl border py-2 text-xs font-semibold transition ${rsvp === r.key ? "border-brand bg-brand text-white" : "border-border text-ink hover:border-brand"}`}>{r.emoji} {r.label}</button>
              ))}
            </div>

            <div className="mt-2 flex gap-2">
              <button onClick={toggleSave} className={`btn btn-ghost flex-1 py-2.5 ${saved ? "!text-rose-500" : ""}`}><HeartIcon className="h-4 w-4" filled={saved} /> {saved ? "Saved" : "Save"}</button>
              <button onClick={share} className="btn btn-ghost flex-1 py-2.5"><ShareIcon className="h-4 w-4" /> {copied ? "Copied!" : "Share"}</button>
            </div>
          </div>
        </div>
      </div>

      {/* Similar */}
      {!!ev.similar?.length && (
        <section className="mt-10">
          <h2 className="font-display text-xl font-extrabold text-ink">Similar events</h2>
          <div className="mt-3 grid gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">{ev.similar.map((e) => <EventCard key={e.id} event={e} />)}</div>
        </section>
      )}

      {book && <BookTicketModal event={ev} onClose={() => setBook(false)} />}
    </div>
  );
}
