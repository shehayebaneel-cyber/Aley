import { FormEvent, useEffect, useMemo, useState } from "react";
import { CalendarIcon, CheckIcon, CloseIcon, ClockIcon } from "./icons";
import { useUserAuth } from "../context/UserAuthContext";
import { api, userApi } from "../lib/api";
import type { Business, Service, StaffMember } from "../types";

const money = (n: number) => (n > 0 ? `$${Number.isInteger(n) ? n : n.toFixed(2)}` : "Free");
const todayStr = () => new Date().toISOString().slice(0, 10);
const addDays = (n: number) => { const d = new Date(); d.setDate(d.getDate() + n); return d.toISOString().slice(0, 10); };

interface Options {
  services: Service[];
  staff: StaffMember[];
  config: { slotInterval: number; leadTimeHours: number; horizonDays: number; cancellationHours?: number; policyNote?: string; ctaLabel?: string };
}

export function BookAppointmentModal({ business, onClose }: { business: Business; onClose: () => void }) {
  const { user } = useUserAuth();
  const [opts, setOpts] = useState<Options | null>(null);
  const [loadErr, setLoadErr] = useState("");

  const [service, setService] = useState<Service | null>(null);
  const [staff, setStaff] = useState<StaffMember | null>(null); // null = "Any available"
  const [date, setDate] = useState(todayStr());
  const [slots, setSlots] = useState<string[] | null>(null);
  const [time, setTime] = useState<string>("");
  const [form, setForm] = useState({ name: user?.name ?? "", phone: "", note: "" });

  const [step, setStep] = useState(0);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");
  const [done, setDone] = useState(false);

  useEffect(() => {
    api.get<Options>(`/api/booking/${business.slug}/options`)
      .then((o) => { setOpts(o); if (o.services.length === 1) setService(o.services[0]); })
      .catch((e) => setLoadErr(e instanceof Error ? e.message : "Couldn't load booking."));
  }, [business.slug]);

  // Which steps are active depends on whether the business has services/staff.
  const steps = useMemo(() => {
    const s: ("service" | "staff" | "when" | "details")[] = [];
    if (opts?.services.length) s.push("service");
    if (opts?.staff.length) s.push("staff");
    s.push("when", "details");
    return s;
  }, [opts]);
  const current = steps[step];

  // Fetch slots whenever date / service / staff change and we're on/at the "when" step.
  useEffect(() => {
    if (!opts) return;
    setSlots(null); setTime("");
    const params = new URLSearchParams({ date });
    if (service) params.set("serviceId", String(service.id));
    if (staff) params.set("staffId", String(staff.id));
    api.get<{ slots: string[] }>(`/api/booking/${business.slug}/slots?${params.toString()}`)
      .then((r) => setSlots(r.slots))
      .catch(() => setSlots([]));
  }, [opts, date, service, staff, business.slug]);

  const canNext =
    current === "service" ? !!service :
    current === "when" ? !!time :
    true;

  const next = () => setStep((s) => Math.min(steps.length - 1, s + 1));
  const back = () => setStep((s) => Math.max(0, s - 1));

  async function submit(e: FormEvent) {
    e.preventDefault();
    if (busy) return;
    if (!form.name.trim() || !form.phone.trim()) return setErr("Name and phone are required.");
    if (!time) return setErr("Please pick a time.");
    setBusy(true); setErr("");
    const client = user ? userApi : api;
    try {
      await client.post("/api/booking", {
        businessId: business.id,
        serviceId: service?.id ?? null,
        staffId: staff?.id ?? null,
        date, time,
        customerName: form.name, customerPhone: form.phone, note: form.note,
      });
      setDone(true);
    } catch (e2) {
      setErr(e2 instanceof Error ? e2.message : "Couldn't book. Try another time.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/50 p-0 backdrop-blur-sm sm:items-center sm:p-4" onClick={onClose}>
      <div className="card pop-in max-h-[92vh] w-full max-w-lg overflow-y-auto rounded-b-none p-6 sm:rounded-3xl" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between">
          <h2 className="font-display text-xl font-extrabold text-ink">{opts?.config.ctaLabel ?? business.bookingCta ?? "Book an appointment"}</h2>
          <button onClick={onClose} aria-label="Close" className="text-muted hover:text-ink"><CloseIcon /></button>
        </div>
        <p className="mt-0.5 text-sm text-muted">{business.name}</p>

        {done ? (
          <div className="mt-6 text-center">
            <span className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-emerald-500/15 text-emerald-600"><CheckIcon className="h-7 w-7" /></span>
            <p className="mt-3 font-display text-lg font-bold text-ink">Booking requested!</p>
            <p className="mt-1 text-muted">{business.name} will confirm your appointment on {form.phone}.</p>
            <div className="mt-4 rounded-xl surface-2 p-3 text-left text-sm">
              {service && <p><span className="text-muted">Service:</span> <span className="font-semibold text-ink">{service.name}</span></p>}
              {staff && <p><span className="text-muted">With:</span> <span className="font-semibold text-ink">{staff.name}</span></p>}
              <p><span className="text-muted">When:</span> <span className="font-semibold text-ink">{date} at {time}</span></p>
            </div>
            <button onClick={onClose} className="btn btn-primary mt-5 px-6 py-2.5">Done</button>
          </div>
        ) : loadErr ? (
          <p className="mt-6 text-center text-sm text-red-500">{loadErr}</p>
        ) : !opts ? (
          <div className="mt-6 h-40 animate-pulse rounded-xl surface-2" />
        ) : (
          <>
            {/* Step indicator */}
            <div className="mt-4 flex items-center gap-1.5">
              {steps.map((s, i) => (
                <span key={s} className={`h-1.5 flex-1 rounded-full ${i <= step ? "bg-brand" : "bg-border"}`} />
              ))}
            </div>

            <div className="mt-5 min-h-[180px]">
              {current === "service" && (
                <div className="space-y-2">
                  <p className="font-semibold text-ink">Choose a service</p>
                  {opts.services.map((s) => (
                    <button key={s.id} onClick={() => setService(s)} className={`flex w-full items-center justify-between rounded-xl border p-3 text-left transition ${service?.id === s.id ? "border-brand bg-brand-soft" : "border-border hover:border-brand/50"}`}>
                      <span className="min-w-0">
                        <span className="block font-semibold text-ink">{s.name}</span>
                        {s.description && <span className="block truncate text-xs text-muted">{s.description}</span>}
                        <span className="mt-0.5 inline-flex items-center gap-1 text-xs text-muted"><ClockIcon className="h-3.5 w-3.5" /> {s.durationMin} min</span>
                      </span>
                      <span className="shrink-0 font-semibold text-brand">{money(s.price)}</span>
                    </button>
                  ))}
                </div>
              )}

              {current === "staff" && (
                <div className="space-y-2">
                  <p className="font-semibold text-ink">Choose a staff member</p>
                  <button onClick={() => setStaff(null)} className={`flex w-full items-center gap-3 rounded-xl border p-3 text-left transition ${!staff ? "border-brand bg-brand-soft" : "border-border hover:border-brand/50"}`}>
                    <span className="flex h-10 w-10 items-center justify-center rounded-full bg-surface-2 text-lg">✨</span>
                    <span className="font-semibold text-ink">Any available</span>
                  </button>
                  {opts.staff.map((m) => (
                    <button key={m.id} onClick={() => setStaff(m)} className={`flex w-full items-start gap-3 rounded-xl border p-3 text-left transition ${staff?.id === m.id ? "border-brand bg-brand-soft" : "border-border hover:border-brand/50"}`}>
                      {m.avatar ? <img src={m.avatar} alt="" className="h-12 w-12 shrink-0 rounded-full object-cover" /> : <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-surface-2 font-bold text-muted">{m.name.charAt(0)}</span>}
                      <span className="min-w-0 flex-1">
                        <span className="flex items-center gap-2">
                          <span className="font-semibold text-ink">{m.name}</span>
                          {!!m.rating && m.rating > 0 && <span className="inline-flex items-center gap-0.5 text-xs font-semibold text-amber-500">★ {m.rating.toFixed(1)}</span>}
                        </span>
                        {(m.role || m.experience) && <span className="block text-xs text-muted">{[m.role, m.experience].filter(Boolean).join(" · ")}</span>}
                        {!!m.languages?.length && <span className="mt-0.5 block text-xs text-muted">🗣 {m.languages.join(", ")}</span>}
                        {m.bio && <span className="mt-1 block line-clamp-2 text-xs text-muted">{m.bio}</span>}
                      </span>
                    </button>
                  ))}
                </div>
              )}

              {current === "when" && (
                <div>
                  <p className="font-semibold text-ink">Pick a date & time</p>
                  <label className="mt-2 flex items-center gap-2 rounded-xl border border-border p-3">
                    <CalendarIcon className="h-5 w-5 text-brand" />
                    <input type="date" value={date} min={todayStr()} max={addDays(opts.config.horizonDays)} onChange={(e) => setDate(e.target.value)} className="w-full bg-transparent text-ink outline-none" />
                  </label>
                  <div className="mt-3">
                    {slots === null ? (
                      <div className="grid grid-cols-4 gap-2">{Array.from({ length: 8 }).map((_, i) => <span key={i} className="h-9 animate-pulse rounded-lg surface-2" />)}</div>
                    ) : slots.length === 0 ? (
                      <p className="rounded-xl surface-2 p-4 text-center text-sm text-muted">No times available on this day. Try another date.</p>
                    ) : (
                      <div className="grid grid-cols-4 gap-2">
                        {slots.map((t) => (
                          <button key={t} onClick={() => setTime(t)} className={`rounded-lg border py-2 text-sm font-semibold transition ${time === t ? "border-brand bg-brand text-white" : "border-border text-ink hover:border-brand"}`}>{t}</button>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              )}

              {current === "details" && (
                <form onSubmit={submit} className="space-y-3">
                  <p className="font-semibold text-ink">Your details</p>
                  <div className="rounded-xl surface-2 p-3 text-sm">
                    {service && <p className="text-ink"><span className="text-muted">Service: </span>{service.name} · {money(service.price)} · {service.durationMin} min</p>}
                    {staff && <p className="text-ink"><span className="text-muted">With: </span>{staff.name}</p>}
                    <p className="text-ink"><span className="text-muted">When: </span>{date} at {time}</p>
                  </div>
                  {opts.config.policyNote && <p className="text-xs text-muted">{opts.config.policyNote}</p>}
                  {!!opts.config.cancellationHours && <p className="text-xs text-muted">Free cancellation up to {opts.config.cancellationHours}h before your appointment.</p>}
                  <input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required placeholder="Your name" className="input" />
                  <input value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} required placeholder="Phone number" className="input" />
                  <textarea value={form.note} onChange={(e) => setForm({ ...form, note: e.target.value })} rows={2} placeholder="Anything we should know? (optional)" className="input" />
                  {err && <p className="rounded-lg bg-red-500/10 px-3 py-2 text-sm font-medium text-red-500">{err}</p>}
                  <button type="submit" disabled={busy} className="btn btn-primary w-full py-3 disabled:opacity-60">{busy ? "Booking…" : "Confirm booking"}</button>
                </form>
              )}
            </div>

            {/* Nav buttons (hidden on details step, which has its own submit) */}
            {current !== "details" && (
              <div className="mt-2 flex items-center justify-between">
                <button onClick={back} disabled={step === 0} className="btn btn-ghost px-4 py-2.5 disabled:opacity-40">Back</button>
                <button onClick={next} disabled={!canNext} className="btn btn-primary px-6 py-2.5 disabled:opacity-40">Continue</button>
              </div>
            )}
            {current === "details" && step > 0 && (
              <button onClick={back} className="btn btn-ghost mt-2 px-4 py-2.5">Back</button>
            )}
          </>
        )}
      </div>
    </div>
  );
}
