import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { CalendarIcon, MapPinIcon } from "../components/icons";
import { formatEventDate } from "../lib/api";
import { useFetch } from "../lib/useFetch";
import type { EventItem } from "../types";

const CITY = "aley";

export function Events() {
  const { data: events, loading } = useFetch<EventItem[]>(`/api/events?city=${CITY}`);
  const [cat, setCat] = useState("");

  const categories = useMemo(() => Array.from(new Set((events ?? []).map((e) => e.category).filter(Boolean))), [events]);
  const filtered = (events ?? []).filter((e) => !cat || e.category === cat);

  return (
    <div className="mx-auto max-w-7xl px-4 py-8">
      <h1 className="font-display text-3xl font-extrabold text-ink">Events in Aley</h1>
      <p className="mt-1 text-muted">Live music, sports screenings, community gatherings, and more.</p>

      <div className="mt-5 flex flex-wrap gap-2">
        <button onClick={() => setCat("")} className={`chip ${!cat ? "chip-active" : ""}`}>All</button>
        {categories.map((c) => (
          <button key={c} onClick={() => setCat(c)} className={`chip ${cat === c ? "chip-active" : ""}`}>{c}</button>
        ))}
      </div>

      <div className="mt-6 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
        {loading && Array.from({ length: 6 }).map((_, i) => <div key={i} className="card h-72 animate-pulse" />)}
        {filtered.map((e) => (
          <div key={e.id} className="card card-hover overflow-hidden">
            {e.image && <img src={e.image} alt="" loading="lazy" className="h-44 w-full object-cover" />}
            <div className="p-5">
              <span className="chip !py-0.5 !text-[11px]"><CalendarIcon className="h-3.5 w-3.5 text-brand" /> {e.category}</span>
              <h3 className="mt-2 font-display text-lg font-bold text-ink">{e.title}</h3>
              <p className="mt-1 text-sm text-muted">{e.description}</p>
              <div className="mt-3 space-y-1 text-sm text-muted">
                <p className="flex items-center gap-1.5"><CalendarIcon className="h-4 w-4 text-brand" /> {formatEventDate(e.startTime)}</p>
                <p className="flex items-center gap-1.5"><MapPinIcon className="h-4 w-4 text-brand" /> {e.location || e.business?.name}</p>
              </div>
              {e.business && <Link to={`/business/${e.business.slug}`} className="mt-3 inline-block text-sm font-semibold text-brand">View {e.business.name} →</Link>}
            </div>
          </div>
        ))}
      </div>

      {!loading && filtered.length === 0 && (
        <div className="card mt-6 p-16 text-center"><p className="text-lg font-semibold text-ink">No events scheduled.</p><p className="mt-1 text-muted">Check back soon!</p></div>
      )}
    </div>
  );
}
