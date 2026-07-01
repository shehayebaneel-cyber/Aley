import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { EventCard } from "../components/EventCard";
import { QRCode } from "../components/QRCode";
import { useUserAuth } from "../context/UserAuthContext";
import { userApi } from "../lib/api";
import { eventEmoji, fmtDay, fmtTime } from "../lib/events";
import type { EventItem, MyEventBooking } from "../types";

const STATUS: Record<string, string> = {
  CONFIRMED: "bg-emerald-500/15 text-emerald-600",
  CHECKED_IN: "bg-brand-soft text-brand-dark",
  CANCELLED: "bg-red-500/15 text-red-500",
};

export function MyEvents() {
  const { user, loading, openAuth } = useUserAuth();
  const [data, setData] = useState<{ saved: EventItem[]; going: EventItem[]; bookings: MyEventBooking[] } | null>(null);
  const [tab, setTab] = useState<"tickets" | "going" | "saved">("tickets");
  const [qr, setQr] = useState<string | null>(null);

  useEffect(() => { if (user) userApi.get<{ saved: EventItem[]; going: EventItem[]; bookings: MyEventBooking[] }>("/api/me/events").then(setData).catch(() => setData({ saved: [], going: [], bookings: [] })); }, [user]);

  if (loading) return <div className="mx-auto max-w-3xl px-4 py-16 text-muted">Loading…</div>;
  if (!user)
    return (
      <div className="mx-auto max-w-md px-4 py-24 text-center">
        <h1 className="font-display text-2xl font-extrabold text-ink">My events</h1>
        <p className="mt-2 text-muted">Log in to see your tickets, RSVPs and saved events.</p>
        <button onClick={openAuth} className="btn btn-primary mt-6 px-6 py-3">Log in</button>
      </div>
    );

  const bookings = data?.bookings ?? [];
  const going = data?.going ?? [];
  const saved = data?.saved ?? [];

  return (
    <div className="mx-auto max-w-3xl px-4 py-8">
      <h1 className="font-display text-3xl font-extrabold text-ink">My Events</h1>
      <div className="mt-5 flex gap-2">
        <button onClick={() => setTab("tickets")} className={`chip ${tab === "tickets" ? "chip-active" : ""}`}>🎟️ Tickets ({bookings.length})</button>
        <button onClick={() => setTab("going")} className={`chip ${tab === "going" ? "chip-active" : ""}`}>✅ Going ({going.length})</button>
        <button onClick={() => setTab("saved")} className={`chip ${tab === "saved" ? "chip-active" : ""}`}>♥ Saved ({saved.length})</button>
      </div>

      {tab === "tickets" ? (
        bookings.length === 0 ? (
          <div className="card mt-6 p-12 text-center text-muted">No tickets yet. <Link to="/events" className="font-semibold text-brand">Find events →</Link></div>
        ) : (
          <div className="mt-6 space-y-3">
            {bookings.map((bk) => (
              <div key={bk.code} className="card p-4">
                <div className="flex items-center gap-3">
                  {bk.event?.image ? <img src={bk.event.image} alt="" className="h-14 w-14 rounded-xl object-cover" /> : <span className="flex h-14 w-14 items-center justify-center rounded-xl surface-2 text-2xl">{bk.event ? eventEmoji(bk.event) : "🎟️"}</span>}
                  <div className="min-w-0 flex-1">
                    {bk.event ? <Link to={`/event/${bk.event.id}`} className="font-display font-bold text-ink hover:text-brand">{bk.event.title}</Link> : <span className="font-display font-bold text-ink">Event</span>}
                    {bk.event && <p className="text-sm text-muted">{fmtDay(bk.event.startTime)} · {fmtTime(bk.event.startTime)}</p>}
                    <p className="mt-0.5 text-xs text-muted">{bk.quantity} × {bk.ticket?.name ?? "Spot"}{bk.amount ? ` · $${bk.amount}` : " · Free"}</p>
                  </div>
                  <span className={`shrink-0 rounded-full px-2.5 py-1 text-xs font-bold ${STATUS[bk.status]}`}>{bk.status.replace("_", " ")}</span>
                </div>
                <div className="mt-3 flex items-center gap-3 rounded-xl surface-2 p-3">
                  <button onClick={() => setQr(qr === bk.code ? null : bk.code)} className="btn btn-ghost px-3 py-1.5 text-xs">{qr === bk.code ? "Hide QR" : "Show ticket"}</button>
                  <p className="font-mono text-sm font-semibold text-ink">{bk.code}</p>
                </div>
                {qr === bk.code && <div className="mt-3 flex justify-center"><QRCode value={bk.code} size={150} /></div>}
              </div>
            ))}
          </div>
        )
      ) : tab === "going" ? (
        going.length === 0 ? (
          <div className="card mt-6 p-12 text-center text-muted">You're not going to anything yet. <Link to="/events" className="font-semibold text-brand">Explore events →</Link></div>
        ) : (
          <div className="mt-6 grid gap-5 sm:grid-cols-2">{going.map((e) => <EventCard key={e.id} event={e} />)}</div>
        )
      ) : saved.length === 0 ? (
        <div className="card mt-6 p-12 text-center text-muted">No saved events yet. <Link to="/events" className="font-semibold text-brand">Find events to save →</Link></div>
      ) : (
        <div className="mt-6 grid gap-5 sm:grid-cols-2">{saved.map((e) => <EventCard key={e.id} event={e} />)}</div>
      )}
    </div>
  );
}
