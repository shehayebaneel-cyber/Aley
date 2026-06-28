import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { CalendarIcon } from "../components/icons";
import { useUserAuth } from "../context/UserAuthContext";
import { userApi } from "../lib/api";
import type { Appointment, AppointmentStatus } from "../types";

const BADGE: Record<AppointmentStatus, string> = {
  PENDING: "bg-amber-400/15 text-amber-600",
  CONFIRMED: "bg-emerald-500/15 text-emerald-600",
  RESCHEDULED: "bg-blue-500/15 text-blue-600",
  CANCELLED: "bg-red-500/15 text-red-500",
  COMPLETED: "bg-brand-soft text-brand-dark",
  NO_SHOW: "bg-surface-2 text-muted",
};

const ACTIVE: AppointmentStatus[] = ["PENDING", "CONFIRMED", "RESCHEDULED"];

export function MyBookings() {
  const { user, loading, openAuth } = useUserAuth();
  const [items, setItems] = useState<Appointment[] | null>(null);
  const [busyId, setBusyId] = useState<number | null>(null);

  const load = () => userApi.get<Appointment[]>("/api/me/bookings").then(setItems).catch(() => setItems([]));
  useEffect(() => { if (user) load(); }, [user]);

  async function act(a: Appointment, action: "cancel" | "reschedule") {
    let body: Record<string, unknown> = { action };
    if (action === "reschedule") {
      const date = window.prompt("New date (YYYY-MM-DD):", a.date);
      if (!date) return;
      const time = window.prompt("New time (HH:MM):", a.time);
      if (!time) return;
      body = { action, date, time };
    } else if (!window.confirm("Cancel this appointment?")) return;
    setBusyId(a.id);
    try {
      await userApi.patch(`/api/me/bookings/${a.id}`, body);
      await load();
    } catch (e) {
      window.alert(e instanceof Error ? e.message : "Couldn't update the appointment.");
    } finally {
      setBusyId(null);
    }
  }

  const upcoming = (a: Appointment) => new Date(`${a.date}T${a.time}:00`).getTime() > Date.now();

  if (loading) return <div className="mx-auto max-w-3xl px-4 py-16 text-muted">Loading…</div>;
  if (!user)
    return (
      <div className="mx-auto max-w-md px-4 py-24 text-center">
        <h1 className="font-display text-2xl font-extrabold text-ink">Your appointments</h1>
        <p className="mt-2 text-muted">Log in to see and track your booked appointments.</p>
        <button onClick={openAuth} className="btn btn-primary mt-6 px-6 py-3">Log in</button>
      </div>
    );

  return (
    <div className="mx-auto max-w-3xl px-4 py-8">
      <h1 className="font-display text-3xl font-extrabold text-ink">My appointments</h1>
      {items && items.length === 0 && <div className="card mt-6 p-12 text-center text-muted">No appointments yet. <Link to="/explore" className="font-semibold text-brand">Find a service →</Link></div>}
      <div className="mt-6 space-y-3">
        {(items ?? []).map((a) => (
          <div key={a.id} className="card flex flex-wrap items-center gap-3 p-4">
            {a.business?.logo ? <img src={a.business.logo} alt="" className="h-11 w-11 rounded-xl object-cover" /> : <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-brand-soft text-brand-dark"><CalendarIcon className="h-5 w-5" /></span>}
            <div className="min-w-0 flex-1">
              {a.business ? <Link to={`/business/${a.business.slug}`} className="font-display font-bold text-ink hover:text-brand">{a.business.name}</Link> : <span className="font-display font-bold text-ink">Appointment</span>}
              <p className="text-sm text-muted">{a.serviceName || "Appointment"}{a.staffName ? ` · ${a.staffName}` : ""}</p>
              <p className="text-sm text-ink">{a.date} · {a.time}</p>
              {ACTIVE.includes(a.status) && upcoming(a) && (
                <div className="mt-2 flex gap-2">
                  <button disabled={busyId === a.id} onClick={() => act(a, "reschedule")} className="btn btn-ghost px-3 py-1.5 text-xs disabled:opacity-50">Reschedule</button>
                  <button disabled={busyId === a.id} onClick={() => act(a, "cancel")} className="btn btn-ghost px-3 py-1.5 text-xs text-red-500 disabled:opacity-50">Cancel</button>
                </div>
              )}
            </div>
            <span className={`rounded-full px-2.5 py-1 text-xs font-bold ${BADGE[a.status]}`}>{a.status.replace("_", "-")}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
