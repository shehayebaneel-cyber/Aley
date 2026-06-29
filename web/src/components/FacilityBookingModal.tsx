import { FormEvent, useEffect, useState } from "react";
import { CalendarIcon, CheckIcon, CloseIcon } from "./icons";
import { QRCode, checkInUrl } from "./QRCode";
import { TopUpModal } from "./TopUpModal";
import { useUserAuth } from "../context/UserAuthContext";
import { api, userApi } from "../lib/api";
import { useWallet } from "../lib/useWallet";
import type { Business, Facility, FacilitySlot } from "../types";

const money = (n: number) => `$${Number.isInteger(n) ? n : n.toFixed(2)}`;
const todayStr = () => new Date().toISOString().slice(0, 10);
const addDays = (n: number) => { const d = new Date(); d.setDate(d.getDate() + n); return d.toISOString().slice(0, 10); };
const durLabel = (m: number) => (m % 60 === 0 ? `${m / 60}h` : `${Math.floor(m / 60)}h 30m`);

export function FacilityBookingModal({ business, facilities, initialFacilityId, onClose }: { business: Business; facilities: Facility[]; initialFacilityId?: number; onClose: () => void }) {
  const { user } = useUserAuth();
  const [facility, setFacility] = useState<Facility | null>(facilities.find((f) => f.id === initialFacilityId) ?? (facilities.length === 1 ? facilities[0] : null));
  const [opts, setOpts] = useState<Record<number, Facility>>({});
  const [date, setDate] = useState(todayStr());
  const [duration, setDuration] = useState<number | null>(null);
  const [slots, setSlots] = useState<FacilitySlot[] | null>(null);
  const [time, setTime] = useState("");
  const [form, setForm] = useState({ name: user?.name ?? "", phone: "", players: "", note: "" });
  const [step, setStep] = useState(0); // 0 facility, 1 when, 2 details
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");
  const [done, setDone] = useState<{ code?: string; price?: number } | null>(null);
  const { balance: walletBalance, reload: reloadWallet } = useWallet();
  const [payMethod, setPayMethod] = useState("VENUE");
  const [topUp, setTopUp] = useState(false);

  // Fetch full facility options (durations, pricing) once.
  useEffect(() => {
    api.get<{ facilities: Facility[] }>(`/api/facilities/${business.slug}`).then((d) => {
      const map: Record<number, Facility> = {};
      d.facilities.forEach((f) => (map[f.id] = f));
      setOpts(map);
    }).catch(() => {});
  }, [business.slug]);

  const fopt = facility ? opts[facility.id] : null;
  const durations = fopt?.durations ?? [60, 90, 120];
  useEffect(() => { if (duration == null && durations.length) setDuration(durations[0]); }, [durations, duration]);

  // Fetch slots when facility/date/duration change.
  useEffect(() => {
    if (!facility || !duration) return;
    setSlots(null); setTime("");
    api.get<{ slots: FacilitySlot[] }>(`/api/facilities/${business.slug}/slots?facilityId=${facility.id}&date=${date}&durationMin=${duration}`)
      .then((r) => setSlots(r.slots)).catch(() => setSlots([]));
  }, [business.slug, facility, date, duration]);

  const steps = facilities.length > 1 ? ["facility", "when", "details"] : ["when", "details"];
  const current = steps[step];
  const slotPrice = slots?.find((s) => s.time === time)?.price ?? 0;
  const walletShort = payMethod === "WALLET" && walletBalance < slotPrice;

  async function submit(e: FormEvent) {
    e.preventDefault();
    if (busy || !facility || !duration) return;
    if (!form.name.trim() || !form.phone.trim()) return setErr("Name and phone are required.");
    if (!time) return setErr("Please pick a time.");
    if (payMethod === "WALLET" && walletBalance < slotPrice) return setErr("Your wallet balance is too low. Add money or pay at the venue.");
    setBusy(true); setErr("");
    const client = user ? userApi : api;
    try {
      const r = await client.post<{ booking: { checkInCode?: string; price?: number } }>("/api/facilities/book", {
        businessId: business.id, facilityId: facility.id, date, startTime: time, durationMin: duration,
        players: Number(form.players) || 0, customerName: form.name, customerPhone: form.phone, note: form.note,
        paymentMethod: payMethod === "WALLET" ? "WALLET" : "VENUE",
      });
      setDone({ code: r.booking?.checkInCode, price: r.booking?.price });
    } catch (e2) {
      setErr(e2 instanceof Error ? e2.message : "Couldn't book. Try another slot.");
    } finally { setBusy(false); }
  }

  const next = () => setStep((s) => Math.min(steps.length - 1, s + 1));
  const back = () => setStep((s) => Math.max(0, s - 1));
  const canNext = current === "facility" ? !!facility : current === "when" ? !!time : true;

  return (
    <>
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/50 p-0 backdrop-blur-sm sm:items-center sm:p-4" onClick={onClose}>
      <div className="card pop-in max-h-[92vh] w-full max-w-lg overflow-y-auto rounded-b-none p-6 sm:rounded-3xl" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between">
          <h2 className="font-display text-xl font-extrabold text-ink">Book a court / facility</h2>
          <button onClick={onClose} aria-label="Close" className="text-muted hover:text-ink"><CloseIcon /></button>
        </div>
        <p className="mt-0.5 text-sm text-muted">{business.name}</p>

        {done ? (
          <div className="mt-6 text-center">
            <span className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-emerald-500/15 text-emerald-600"><CheckIcon className="h-7 w-7" /></span>
            <p className="mt-3 font-display text-lg font-bold text-ink">Booking confirmed! 🎉</p>
            <p className="mt-1 text-muted">{facility?.name} · {date} at {time} · {durLabel(duration ?? 0)}</p>
            {done.price != null && <p className="mt-1 font-semibold text-ink">Total: {money(done.price)}</p>}
            {done.code && (
              <div className="mt-4 flex flex-col items-center">
                <QRCode value={checkInUrl(done.code)} size={140} />
                <p className="mt-2 text-xs text-muted">Show this QR at check-in. Code: <span className="font-mono font-semibold text-ink">{done.code}</span></p>
              </div>
            )}
            <button onClick={onClose} className="btn btn-primary mt-5 px-6 py-2.5">Done</button>
          </div>
        ) : (
          <>
            <div className="mt-4 flex items-center gap-1.5">{steps.map((s, i) => <span key={s} className={`h-1.5 flex-1 rounded-full ${i <= step ? "bg-brand" : "bg-border"}`} />)}</div>
            <div className="mt-5 min-h-[200px]">
              {current === "facility" && (
                <div className="space-y-2">
                  <p className="font-semibold text-ink">Choose a court / facility</p>
                  {facilities.map((f) => (
                    <button key={f.id} onClick={() => setFacility(f)} className={`flex w-full items-center justify-between rounded-xl border p-3 text-left transition ${facility?.id === f.id ? "border-brand bg-brand-soft" : "border-border hover:border-brand/50"}`}>
                      <span className="min-w-0">
                        <span className="block font-semibold text-ink">{f.name}</span>
                        <span className="block text-xs text-muted">{[f.type, f.capacityNote].filter(Boolean).join(" · ")}</span>
                      </span>
                      <span className="shrink-0 text-sm font-semibold text-brand">{money(f.hourlyRate)}/hr</span>
                    </button>
                  ))}
                </div>
              )}
              {current === "when" && facility && (
                <div>
                  <p className="font-semibold text-ink">{facility.name} — pick date, duration & time</p>
                  <div className="mt-2 grid grid-cols-2 gap-2">
                    <label className="flex items-center gap-2 rounded-xl border border-border p-2.5">
                      <CalendarIcon className="h-5 w-5 text-brand" />
                      <input type="date" value={date} min={todayStr()} max={addDays(45)} onChange={(e) => setDate(e.target.value)} className="w-full bg-transparent text-sm text-ink outline-none" />
                    </label>
                    <select value={duration ?? ""} onChange={(e) => setDuration(Number(e.target.value))} className="input !py-2.5 text-sm">
                      {durations.map((d) => <option key={d} value={d}>{durLabel(d)}</option>)}
                    </select>
                  </div>
                  <div className="mt-3">
                    {slots === null ? (
                      <div className="grid grid-cols-3 gap-2">{Array.from({ length: 9 }).map((_, i) => <span key={i} className="h-12 animate-pulse rounded-lg surface-2" />)}</div>
                    ) : slots.length === 0 ? (
                      <p className="rounded-xl surface-2 p-4 text-center text-sm text-muted">No slots available this day. Try another date or duration.</p>
                    ) : (
                      <div className="grid grid-cols-3 gap-2">
                        {slots.map((s) => (
                          <button key={s.time} onClick={() => setTime(s.time)} className={`rounded-lg border py-2 text-center transition ${time === s.time ? "border-brand bg-brand text-white" : "border-border text-ink hover:border-brand"}`}>
                            <span className="block text-sm font-semibold">{s.time}</span>
                            <span className={`block text-[11px] ${time === s.time ? "text-white/90" : "text-muted"}`}>{money(s.price)}</span>
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              )}
              {current === "details" && facility && (
                <form onSubmit={submit} className="space-y-3">
                  <div className="rounded-xl surface-2 p-3 text-sm">
                    <p className="text-ink"><span className="text-muted">Facility: </span>{facility.name}</p>
                    <p className="text-ink"><span className="text-muted">When: </span>{date} at {time} · {durLabel(duration ?? 0)}</p>
                    {slots?.find((s) => s.time === time) && <p className="font-semibold text-ink">Total: {money(slots.find((s) => s.time === time)!.price)}</p>}
                  </div>
                  <input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required placeholder="Your name" className="input" />
                  <input value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} required placeholder="Phone number" className="input" />
                  <input type="number" min={0} max={99} value={form.players} onChange={(e) => setForm({ ...form, players: e.target.value })} placeholder="Number of players (optional)" className="input" />
                  <textarea value={form.note} onChange={(e) => setForm({ ...form, note: e.target.value })} rows={2} placeholder="Notes (optional)" className="input" />
                  <p className="text-sm font-semibold text-ink">Payment</p>
                  <div className="flex flex-wrap gap-2">
                    <button type="button" onClick={() => setPayMethod("VENUE")} className={`chip ${payMethod === "VENUE" ? "chip-active" : ""}`}>🏟️ Pay at venue</button>
                    {user && <button type="button" onClick={() => setPayMethod("WALLET")} className={`chip ${payMethod === "WALLET" ? "chip-active" : ""}`}>💰 Wallet (${walletBalance.toFixed(2)})</button>}
                  </div>
                  {payMethod === "WALLET" && walletShort && (
                    <div className="flex flex-wrap items-center justify-between gap-2 rounded-lg bg-amber-400/10 px-3 py-2 text-xs">
                      <span className="font-medium text-amber-700">Balance too low — needs {money(slotPrice)}.</span>
                      <button type="button" onClick={() => setTopUp(true)} className="btn btn-ghost px-3 py-1 text-xs">+ Add money</button>
                    </div>
                  )}
                  {err && <p className="rounded-lg bg-red-500/10 px-3 py-2 text-sm font-medium text-red-500">{err}</p>}
                  <button type="submit" disabled={busy || walletShort} className="btn btn-primary w-full py-3 disabled:opacity-60">{busy ? "Booking…" : payMethod === "WALLET" ? `Pay ${money(slotPrice)} & book` : "Confirm booking"}</button>
                </form>
              )}
            </div>
            {current !== "details" && (
              <div className="mt-2 flex items-center justify-between">
                <button onClick={back} disabled={step === 0} className="btn btn-ghost px-4 py-2.5 disabled:opacity-40">Back</button>
                <button onClick={next} disabled={!canNext} className="btn btn-primary px-6 py-2.5 disabled:opacity-40">Continue</button>
              </div>
            )}
            {current === "details" && step > 0 && <button onClick={back} className="btn btn-ghost mt-2 px-4 py-2.5">Back</button>}
          </>
        )}
      </div>
    </div>
    {topUp && <TopUpModal balance={walletBalance} onClose={() => setTopUp(false)} onDone={() => { reloadWallet(); setTopUp(false); }} />}
    </>
  );
}
