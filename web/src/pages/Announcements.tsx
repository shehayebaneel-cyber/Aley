import { useEffect, useState } from "react";
import { BellIcon } from "../components/icons";
import { useCity } from "../context/CityContext";
import { api, timeAgo } from "../lib/api";
import { useTitle } from "../lib/useTitle";
import type { Announcement } from "../types";

// Display metadata per notice category.
export const NOTICE_META: Record<string, { label: string; emoji: string; cls: string }> = {
  GENERAL: { label: "General", emoji: "📣", cls: "bg-slate-400/15 text-slate-500" },
  MUNICIPALITY: { label: "Municipality", emoji: "🏛️", cls: "bg-sky-500/15 text-sky-600" },
  UTILITY: { label: "Utilities", emoji: "💡", cls: "bg-amber-500/15 text-amber-600" },
  EMERGENCY: { label: "Emergency", emoji: "🚨", cls: "bg-rose-500/15 text-rose-500" },
  EVENT: { label: "Event", emoji: "🎉", cls: "bg-fuchsia-500/15 text-fuchsia-600" },
  ROADS: { label: "Roads", emoji: "🚧", cls: "bg-orange-500/15 text-orange-600" },
  WEATHER: { label: "Weather", emoji: "🌦️", cls: "bg-cyan-500/15 text-cyan-600" },
  HEALTH: { label: "Health", emoji: "🏥", cls: "bg-emerald-500/15 text-emerald-600" },
};
const meta = (c: string) => NOTICE_META[c] ?? NOTICE_META.GENERAL;
const CATEGORIES = Object.keys(NOTICE_META);

export function Announcements() {
  useTitle("Public Notices");
  const { city } = useCity();
  const [items, setItems] = useState<Announcement[]>([]);
  const [category, setCategory] = useState("");

  useEffect(() => {
    const p = new URLSearchParams();
    if (city) p.set("city", city);
    if (category) p.set("category", category);
    api.get<Announcement[]>(`/api/announcements?${p}`).then(setItems);
  }, [category, city]);

  return (
    <div>
      {/* ---- Hero ---- */}
      <section className="relative isolate overflow-hidden border-b border-border bg-gradient-to-br from-brand/15 via-surface to-sky-400/10">
        <div className="mx-auto max-w-3xl px-4 py-16 text-center">
          <span className="chip"><BellIcon className="h-4 w-4 text-brand" /> Official · Aley</span>
          <h1 className="mt-4 font-display text-4xl font-extrabold text-ink sm:text-5xl">Public Notices</h1>
          <p className="mx-auto mt-3 max-w-xl text-lg text-muted">
            Official announcements from the municipality and city services — water &amp; electricity, road works, emergencies, events and more.
          </p>
        </div>
      </section>

      <div className="mx-auto max-w-4xl px-4 py-10">
        {/* ---- Category filter ---- */}
        <div className="flex flex-wrap gap-2">
          <button onClick={() => setCategory("")} className={`chip ${!category ? "chip-active" : ""}`}>All</button>
          {CATEGORIES.map((c) => (
            <button key={c} onClick={() => setCategory(category === c ? "" : c)} className={`chip ${category === c ? "chip-active" : ""}`}>
              {meta(c).emoji} {meta(c).label}
            </button>
          ))}
        </div>

        {/* ---- Notices ---- */}
        <div className="mt-6 space-y-4">
          {items.map((a) => {
            const m = meta(a.category);
            return (
              <article key={a.id} className={`card overflow-hidden ${a.isPinned ? "ring-2 ring-brand/40" : ""}`}>
                <div className="flex flex-col gap-0 sm:flex-row">
                  {a.image && <img src={a.image} alt="" className="h-40 w-full object-cover sm:h-auto sm:w-48" />}
                  <div className="flex-1 p-5">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className={`rounded-full px-2.5 py-0.5 text-xs font-bold ${m.cls}`}>{m.emoji} {m.label}</span>
                      {a.isPinned && <span className="rounded-full bg-brand/15 px-2.5 py-0.5 text-xs font-bold text-brand-dark">📌 Pinned</span>}
                      <span className="ml-auto text-xs text-muted">{timeAgo(a.publishedAt)}</span>
                    </div>
                    <h3 className="mt-2 font-display text-lg font-bold text-ink">{a.title}</h3>
                    {a.body && <p className="mt-1 whitespace-pre-line text-sm text-muted">{a.body}</p>}
                    {a.link && (
                      <a href={a.link} target="_blank" rel="noreferrer" className="mt-3 inline-block text-sm font-semibold text-brand hover:text-brand-dark">
                        Learn more →
                      </a>
                    )}
                    {a.expiresAt && <p className="mt-3 text-xs text-muted">Valid until {new Date(a.expiresAt).toLocaleDateString()}</p>}
                  </div>
                </div>
              </article>
            );
          })}
        </div>
        {items.length === 0 && <div className="card mt-6 p-16 text-center text-muted">No notices right now.</div>}
      </div>
    </div>
  );
}
