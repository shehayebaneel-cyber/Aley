import { useState } from "react";
import { Link } from "react-router-dom";
import { CalendarIcon, ClockIcon, HeartIcon, MapPinIcon, UsersIcon } from "./icons";
import { useUserAuth } from "../context/UserAuthContext";
import { userApi } from "../lib/api";
import { eventEmoji, fmtDay, fmtTime, priceLabel } from "../lib/events";
import type { EventItem } from "../types";

function useEventActions(e: EventItem) {
  const { user, openAuth } = useUserAuth();
  const [saved, setSaved] = useState(!!e.saved);
  const [rsvp, setRsvp] = useState<string | null>(e.myRsvp ?? null);
  const [interested, setInterested] = useState(e.interested ?? 0);

  const toggleSave = async () => {
    if (!user) return openAuth();
    const next = !saved; setSaved(next);
    try { next ? await userApi.post(`/api/me/events/${e.id}/save`, {}) : await userApi.delete(`/api/me/events/${e.id}/save`); } catch { setSaved(!next); }
  };
  const toggleInterested = async () => {
    if (!user) return openAuth();
    const on = rsvp === "INTERESTED";
    try {
      if (on) { await userApi.delete(`/api/events/${e.id}/rsvp`); setRsvp(null); setInterested((n) => Math.max(0, n - 1)); }
      else { await userApi.post(`/api/events/${e.id}/rsvp`, { status: "INTERESTED" }); if (!rsvp) setInterested((n) => n + 1); setRsvp("INTERESTED"); }
    } catch { /* ignore */ }
  };
  return { saved, toggleSave, rsvp, toggleInterested, interested };
}

export function EventCard({ event: e, layout = "card" }: { event: EventItem; layout?: "card" | "list" }) {
  const { saved, toggleSave, rsvp, toggleInterested, interested } = useEventActions(e);
  const free = e.isFree;

  if (layout === "list") {
    return (
      <Link to={`/event/${e.id}`} className="card card-hover flex items-stretch gap-4 overflow-hidden p-0">
        <div className="relative w-28 shrink-0 bg-surface-2 sm:w-40">
          {e.image ? <img src={e.image} alt="" className="h-full w-full object-cover" /> : <div className="flex h-full w-full items-center justify-center text-3xl">{eventEmoji(e)}</div>}
        </div>
        <div className="min-w-0 flex-1 py-3 pr-4">
          <p className="text-xs font-semibold text-brand">{e.categoryEmoji} {e.categoryLabel}</p>
          <h3 className="mt-0.5 truncate font-display text-lg font-bold text-ink">{e.title}</h3>
          <p className="mt-1 text-sm text-muted">{fmtDay(e.startTime)} · {fmtTime(e.startTime)}</p>
          <p className="truncate text-sm text-muted">📍 {e.location}</p>
          <div className="mt-1 flex items-center gap-3 text-xs text-muted">
            <span className={`font-bold ${free ? "text-emerald-600" : "text-ink"}`}>{priceLabel(e)}</span>
            {!!e.attending && <span>· {e.attending} going</span>}
          </div>
        </div>
      </Link>
    );
  }

  return (
    <div className="card card-hover group relative flex flex-col overflow-hidden">
      <Link to={`/event/${e.id}`} className="relative block h-44 overflow-hidden bg-surface-2">
        {e.image ? <img src={e.image} alt="" loading="lazy" className="h-full w-full object-cover transition duration-500 group-hover:scale-105" /> : <div className="flex h-full w-full items-center justify-center text-5xl">{eventEmoji(e)}</div>}
        <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/0 to-black/10" />
        {/* date chip */}
        <div className="absolute left-3 top-3 rounded-xl bg-white/95 px-2.5 py-1 text-center shadow">
          <p className="text-[10px] font-bold uppercase leading-none text-rose-500">{new Date(e.startTime).toLocaleDateString(undefined, { month: "short" })}</p>
          <p className="font-display text-lg font-extrabold leading-none text-ink">{new Date(e.startTime).getDate()}</p>
        </div>
        <span className={`absolute right-12 top-3 rounded-full px-2.5 py-1 text-[11px] font-bold text-white shadow ${free ? "bg-emerald-500" : "bg-accent"}`}>{priceLabel(e)}</span>
        <span className="absolute bottom-2 left-3 rounded-full bg-black/55 px-2.5 py-1 text-[11px] font-semibold text-white backdrop-blur">{e.categoryEmoji} {e.categoryLabel}</span>
      </Link>
      <button onClick={toggleSave} aria-label="Save event" className="absolute right-3 top-3 flex h-8 w-8 items-center justify-center rounded-full bg-white/90 text-rose-500 shadow backdrop-blur transition hover:bg-white">
        <HeartIcon className="h-4 w-4" filled={saved} />
      </button>

      <div className="flex flex-1 flex-col p-4">
        <Link to={`/event/${e.id}`}><h3 className="font-display text-lg font-extrabold leading-snug text-ink line-clamp-2 hover:text-brand">{e.title}</h3></Link>
        <div className="mt-2 space-y-1 text-sm text-muted">
          <p className="flex items-center gap-1.5"><CalendarIcon className="h-4 w-4" /> {fmtDay(e.startTime)} <ClockIcon className="ml-1 h-4 w-4" /> {fmtTime(e.startTime)}</p>
          <p className="flex items-center gap-1.5 truncate"><MapPinIcon className="h-4 w-4 shrink-0" /> <span className="truncate">{e.location}</span></p>
          {e.business && <p className="truncate text-xs">by {e.organizerName || e.business.name}</p>}
        </div>
        <div className="mt-3 flex items-center justify-between">
          <span className="inline-flex items-center gap-1 text-xs font-medium text-muted"><UsersIcon className="h-3.5 w-3.5" /> {e.attending ?? 0} going · {interested} interested</span>
        </div>
        <div className="mt-3 flex gap-2">
          <button onClick={toggleInterested} className={`btn flex-1 py-2 text-sm ${rsvp === "INTERESTED" ? "btn-primary" : "btn-ghost"}`}>★ Interested</button>
          <Link to={`/event/${e.id}`} className="btn btn-primary flex-1 py-2 text-sm">{free ? "Reserve" : "Book"}</Link>
        </div>
      </div>
    </div>
  );
}
