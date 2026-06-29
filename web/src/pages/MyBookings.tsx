import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { CalendarIcon } from "../components/icons";
import { QRCode, checkInUrl } from "../components/QRCode";
import { useUserAuth } from "../context/UserAuthContext";
import { userApi } from "../lib/api";
import type { Appointment, AppointmentStatus, FacilityBooking } from "../types";

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
  const [facItems, setFacItems] = useState<FacilityBooking[] | null>(null);
  const [busyId, setBusyId] = useState<number | null>(null);
  const [qrId, setQrId] = useState<number | null>(null);
  const [facQrId, setFacQrId] = useState<number | null>(null);

  const load = () => userApi.get<Appointment[]>("/api/me/bookings").then(setItems).catch(() => setItems([]));
  const loadFac = () => userApi.get<FacilityBooking[]>("/api/me/facility-bookings").then(setFacItems).catch(() => setFacItems([]));
  useEffect(() => { if (user) { load(); loadFac(); } }, [user]);

  async function facAct(b: FacilityBooking, action: "cancel" | "reschedule") {
    let body: Record<string, unknown> = { action };
    if (action === "reschedule") {
      const date = window.prompt("New date (YYYY-MM-DD):", b.date);
      if (!date) return;
      const time = window.prompt("New time (HH:MM):", b.startTime);
      if (!time) return;
      body = { action, date, time };
    } else if (!window.confirm("Cancel this booking?")) return;
    setBusyId(-b.id);
    try { await userApi.patch(`/api/me/facility-bookings/${b.id}`, body); await loadFac(); }
    catch (e) { window.alert(e instanceof Error ? e.message : "Couldn't update the booking."); }
    finally { setBusyId(null); }
  }
  const facUpcoming = (b: FacilityBooking) => new Date(`${b.date}T${b.startTime}:00`).getTime() > Date.now();

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
                <div className="mt-2 flex flex-wrap gap-2">
                  <button disabled={busyId === a.id} onClick={() => act(a, "reschedule")} className="btn btn-ghost px-3 py-1.5 text-xs disabled:opacity-50">Reschedule</button>
                  <button disabled={busyId === a.id} onClick={() => act(a, "cancel")} className="btn btn-ghost px-3 py-1.5 text-xs text-red-500 disabled:opacity-50">Cancel</button>
                  {a.checkInCode && <button onClick={() => setQrId(qrId === a.id ? null : a.id)} className="btn btn-ghost px-3 py-1.5 text-xs">{qrId === a.id ? "Hide QR" : "Check-in QR"}</button>}
                </div>
              )}
              {qrId === a.id && a.checkInCode && (
                <div className="mt-2 flex items-center gap-3 rounded-xl surface-2 p-3">
                  <QRCode value={checkInUrl(a.checkInCode)} size={96} />
                  <p className="text-xs text-muted">Show this when you arrive.<br />Code: <span className="font-mono font-semibold text-ink">{a.checkInCode}</span></p>
                </div>
              )}
            </div>
            <span className={`rounded-full px-2.5 py-1 text-xs font-bold ${a.arrivedAt ? "bg-emerald-500/15 text-emerald-600" : BADGE[a.status]}`}>{a.arrivedAt ? "Arrived" : a.status.replace("_", "-")}</span>
          </div>
        ))}
      </div>

      {/* Court & facility bookings */}
      {!!facItems?.length && (
        <>
          <h2 className="mt-10 font-display text-2xl font-extrabold text-ink">Court & facility bookings</h2>
          <div className="mt-4 space-y-3">
            {facItems.map((b) => (
              <div key={b.id} className="card flex flex-wrap items-center gap-3 p-4">
                {b.business?.logo ? <img src={b.business.logo} alt="" className="h-11 w-11 rounded-xl object-cover" /> : <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-brand-soft text-brand-dark">🏟️</span>}
                <div className="min-w-0 flex-1">
                  {b.business ? <Link to={`/business/${b.business.slug}`} className="font-display font-bold text-ink hover:text-brand">{b.business.name}</Link> : <span className="font-display font-bold text-ink">Booking</span>}
                  <p className="text-sm text-muted">{b.facilityName} · {b.durationMin / 60}h{b.players ? ` · ${b.players} players` : ""} · ${b.price}</p>
                  <p className="text-sm text-ink">{b.date} · {b.startTime}</p>
                  {(b.status === "CONFIRMED" || b.status === "PENDING") && facUpcoming(b) && (
                    <div className="mt-2 flex flex-wrap gap-2">
                      <button disabled={busyId === -b.id} onClick={() => facAct(b, "reschedule")} className="btn btn-ghost px-3 py-1.5 text-xs disabled:opacity-50">Reschedule</button>
                      <button disabled={busyId === -b.id} onClick={() => facAct(b, "cancel")} className="btn btn-ghost px-3 py-1.5 text-xs text-red-500 disabled:opacity-50">Cancel</button>
                      {b.checkInCode && <button onClick={() => setFacQrId(facQrId === b.id ? null : b.id)} className="btn btn-ghost px-3 py-1.5 text-xs">{facQrId === b.id ? "Hide QR" : "Check-in QR"}</button>}
                    </div>
                  )}
                  {facQrId === b.id && b.checkInCode && (
                    <div className="mt-2 flex items-center gap-3 rounded-xl surface-2 p-3">
                      <QRCode value={checkInUrl(b.checkInCode)} size={96} />
                      <p className="text-xs text-muted">Show this at check-in.<br />Code: <span className="font-mono font-semibold text-ink">{b.checkInCode}</span></p>
                    </div>
                  )}
                </div>
                <span className={`rounded-full px-2.5 py-1 text-xs font-bold ${b.arrivedAt ? "bg-emerald-500/15 text-emerald-600" : BADGE[(b.status === "CONFIRMED" ? "CONFIRMED" : b.status) as AppointmentStatus] ?? "bg-surface-2 text-muted"}`}>{b.arrivedAt ? "Arrived" : b.status.replace("_", "-")}</span>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
