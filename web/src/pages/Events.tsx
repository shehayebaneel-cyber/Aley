import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { EventCard } from "../components/EventCard";
import { CalendarIcon, ClockIcon, MapPinIcon, SearchIcon } from "../components/icons";
import { useCity, cityQuery } from "../context/CityContext";
import { useFetch } from "../lib/useFetch";
import { EVENT_CATEGORIES, fmtDay, fmtTime, isThisWeekend, isToday, priceLabel, withinDays } from "../lib/events";
import type { EventItem } from "../types";

function Row({ title, emoji, events }: { title: string; emoji: string; events: EventItem[] }) {
  if (!events.length) return null;
  return (
    <section className="mt-8">
      <h2 className="font-display text-xl font-extrabold text-ink">{emoji} {title}</h2>
      <div className="no-scrollbar -mx-4 mt-3 flex gap-4 overflow-x-auto px-4 pb-2">
        {events.map((e) => <div key={e.id} className="w-[18rem] shrink-0"><EventCard event={e} /></div>)}
      </div>
    </section>
  );
}

/** Simple month calendar — days with events are highlighted; pick one to see them. */
function MonthCalendar({ events }: { events: EventItem[] }) {
  const [month, setMonth] = useState(() => { const d = new Date(); return new Date(d.getFullYear(), d.getMonth(), 1); });
  const [day, setDay] = useState<string | null>(null);
  const byDay = useMemo(() => {
    const m = new Map<string, EventItem[]>();
    for (const e of events) { const k = new Date(e.startTime).toDateString(); if (!m.has(k)) m.set(k, []); m.get(k)!.push(e); }
    return m;
  }, [events]);
  const first = month.getDay();
  const days = new Date(month.getFullYear(), month.getMonth() + 1, 0).getDate();
  const cells = [...Array(first).fill(null), ...Array.from({ length: days }, (_, i) => new Date(month.getFullYear(), month.getMonth(), i + 1))];
  const selected = day ? byDay.get(day) ?? [] : [];

  return (
    <div className="mt-6 grid gap-6 lg:grid-cols-[1fr_22rem]">
      <div className="card p-4">
        <div className="mb-3 flex items-center justify-between">
          <button onClick={() => setMonth(new Date(month.getFullYear(), month.getMonth() - 1, 1))} className="btn btn-ghost px-3 py-1.5">←</button>
          <p className="font-display font-bold text-ink">{month.toLocaleDateString(undefined, { month: "long", year: "numeric" })}</p>
          <button onClick={() => setMonth(new Date(month.getFullYear(), month.getMonth() + 1, 1))} className="btn btn-ghost px-3 py-1.5">→</button>
        </div>
        <div className="grid grid-cols-7 gap-1 text-center text-xs font-semibold text-muted">{["S", "M", "T", "W", "T", "F", "S"].map((d, i) => <div key={i} className="py-1">{d}</div>)}</div>
        <div className="grid grid-cols-7 gap-1">
          {cells.map((d, i) => {
            if (!d) return <div key={i} />;
            const k = d.toDateString();
            const has = byDay.has(k);
            const isSel = day === k;
            return (
              <button key={i} onClick={() => has && setDay(isSel ? null : k)} disabled={!has}
                className={`aspect-square rounded-lg text-sm transition ${isSel ? "bg-brand text-white" : has ? "bg-brand-soft font-bold text-brand-dark hover:bg-brand hover:text-white" : "text-muted"}`}>
                {d.getDate()}
              </button>
            );
          })}
        </div>
      </div>
      <div>
        <h3 className="font-display font-bold text-ink">{day ? new Date(day).toLocaleDateString(undefined, { weekday: "long", month: "long", day: "numeric" }) : "Pick a day"}</h3>
        <div className="mt-3 space-y-3">
          {selected.length === 0 ? <p className="text-sm text-muted">{day ? "No events this day." : "Highlighted days have events."}</p> : selected.map((e) => <EventCard key={e.id} event={e} layout="list" />)}
        </div>
      </div>
    </div>
  );
}

export function Events() {
  const { city } = useCity();
  const { data, loading } = useFetch<EventItem[]>(`/api/events${cityQuery(city)}`);
  const all = data ?? [];
  const [view, setView] = useState<"grid" | "list" | "calendar">("grid");
  const [cat, setCat] = useState("");
  const [q, setQ] = useState("");

  const cats = useMemo(() => EVENT_CATEGORIES.filter((c) => all.some((e) => e.category === c.key)), [all]);
  const hasFilter = !!(cat || q);
  const filtered = useMemo(() => {
    const ql = q.trim().toLowerCase();
    return all.filter((e) => (!cat || e.category === cat) && (!ql || `${e.title} ${e.description} ${e.location} ${e.business?.name ?? ""}`.toLowerCase().includes(ql)));
  }, [all, cat, q]);

  const featured = useMemo(() => all.find((e) => e.isFeatured) ?? all[0], [all]);
  const today = useMemo(() => all.filter((e) => isToday(e)), [all]);
  const weekend = useMemo(() => all.filter((e) => isThisWeekend(e)), [all]);
  const week = useMemo(() => all.filter((e) => withinDays(e, 7) && !isToday(e)), [all]);
  const upcoming = useMemo(() => all.filter((e) => !withinDays(e, 7)), [all]);
  const popular = useMemo(() => [...all].sort((a, b) => ((b.attending ?? 0) + (b.interested ?? 0)) - ((a.attending ?? 0) + (a.interested ?? 0))).slice(0, 12), [all]);
  const recent = useMemo(() => [...all].sort((a, b) => new Date(b.createdAt ?? 0).getTime() - new Date(a.createdAt ?? 0).getTime()).slice(0, 12), [all]);

  return (
    <div className="mx-auto max-w-7xl px-4 py-6">
      {/* Featured hero */}
      {!hasFilter && view !== "calendar" && featured && (
        <Link to={`/event/${featured.id}`} className="card card-hover group relative block h-72 overflow-hidden sm:h-80">
          {featured.image ? <img src={featured.image} alt="" className="h-full w-full object-cover transition duration-700 group-hover:scale-105" /> : <div className="h-full w-full bg-gradient-to-br from-brand to-brand-dark" />}
          <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent" />
          <div className="absolute bottom-0 left-0 right-0 p-6 text-white sm:p-8">
            <span className="rounded-full bg-accent px-3 py-1 text-xs font-bold">⭐ Featured event</span>
            <h1 className="mt-3 font-display text-3xl font-extrabold sm:text-4xl">{featured.title}</h1>
            <p className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-white/90">
              <span className="inline-flex items-center gap-1"><CalendarIcon className="h-4 w-4" /> {fmtDay(featured.startTime)}</span>
              <span className="inline-flex items-center gap-1"><ClockIcon className="h-4 w-4" /> {fmtTime(featured.startTime)}</span>
              <span className="inline-flex items-center gap-1"><MapPinIcon className="h-4 w-4" /> {featured.location}</span>
              <span className="font-bold">{priceLabel(featured)}</span>
            </p>
          </div>
        </Link>
      )}

      <div className="mt-6 flex items-center justify-between gap-3">
        <div>
          <h1 className="font-display text-2xl font-extrabold text-ink sm:text-3xl">What's on</h1>
          <p className="text-muted">Discover things to do — today, this weekend and beyond.</p>
        </div>
        <div className="flex shrink-0 gap-1 rounded-full border border-border bg-surface p-1">
          {([["grid", "▦"], ["list", "≡"], ["calendar", "📅"]] as const).map(([v, icon]) => (
            <button key={v} onClick={() => setView(v)} className={`rounded-full px-3 py-1.5 text-sm font-semibold ${view === v ? "bg-brand text-white" : "text-muted hover:text-ink"}`} title={v}>{icon}</button>
          ))}
        </div>
      </div>

      <div className="relative mt-4 max-w-md">
        <SearchIcon className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted" />
        <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search events…" className="input !pl-9" />
      </div>
      <div className="no-scrollbar -mx-4 mt-3 flex gap-2 overflow-x-auto px-4 pb-1">
        <button onClick={() => setCat("")} className={`chip whitespace-nowrap ${!cat ? "chip-active" : ""}`}>All</button>
        {cats.map((c) => <button key={c.key} onClick={() => setCat((x) => (x === c.key ? "" : c.key))} className={`chip whitespace-nowrap ${cat === c.key ? "chip-active" : ""}`}>{c.emoji} {c.label}</button>)}
      </div>

      {loading ? (
        <div className="mt-8 grid gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">{Array.from({ length: 8 }).map((_, i) => <div key={i} className="card h-80 animate-pulse" />)}</div>
      ) : view === "calendar" ? (
        <MonthCalendar events={hasFilter ? filtered : all} />
      ) : hasFilter ? (
        <div className="mt-6">
          <p className="text-sm text-muted">{filtered.length} {filtered.length === 1 ? "event" : "events"}</p>
          {filtered.length === 0 ? (
            <div className="card mt-3 p-16 text-center"><p className="text-lg font-semibold text-ink">No events match.</p><p className="mt-1 text-muted">Try another category.</p></div>
          ) : view === "list" ? (
            <div className="mt-3 space-y-3">{filtered.map((e) => <EventCard key={e.id} event={e} layout="list" />)}</div>
          ) : (
            <div className="mt-3 grid gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">{filtered.map((e) => <EventCard key={e.id} event={e} />)}</div>
          )}
        </div>
      ) : all.length === 0 ? (
        <div className="card mt-8 p-16 text-center"><p className="text-lg font-semibold text-ink">No upcoming events yet.</p><p className="mt-1 text-muted">Check back soon!</p></div>
      ) : view === "list" ? (
        <div className="mt-6 space-y-3">{all.map((e) => <EventCard key={e.id} event={e} layout="list" />)}</div>
      ) : (
        <>
          <Row title="Today" emoji="📌" events={today} />
          <Row title="This weekend" emoji="🎉" events={weekend} />
          <Row title="This week" emoji="🗓️" events={week} />
          <Row title="Popular events" emoji="🔥" events={popular} />
          <Row title="Recently added" emoji="✨" events={recent} />
          <section className="mt-10">
            <h2 className="font-display text-xl font-extrabold text-ink">All upcoming events</h2>
            <div className="mt-3 grid gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">{(upcoming.length ? upcoming : all).map((e) => <EventCard key={e.id} event={e} />)}</div>
          </section>
        </>
      )}
    </div>
  );
}
