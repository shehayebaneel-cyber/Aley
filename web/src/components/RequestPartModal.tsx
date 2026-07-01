import { FormEvent, useState } from "react";
import { Link } from "react-router-dom";
import { CarPicker } from "./CarPicker";
import { CheckIcon, CloseIcon } from "./icons";
import { PhotoUploader } from "./PhotoUploader";
import { useCity } from "../context/CityContext";
import { useUserAuth } from "../context/UserAuthContext";
import { api, userApi } from "../lib/api";
import { useFetch } from "../lib/useFetch";
import type { PartsMeta } from "../types";

const COND = [["ANY", "Any"], ["NEW", "New only"], ["USED", "Used OK"]];
const SRC = [["ANY", "Any"], ["OEM", "OEM (genuine)"], ["AFTERMARKET", "Aftermarket"]];

/** One request → broadcast to all matching spare-parts shops. */
export function RequestPartModal({ onClose }: { onClose: () => void }) {
  const { user } = useUserAuth();
  const { city, cities } = useCity();
  const { data: meta } = useFetch<PartsMeta>("/api/spare-parts/meta");
  const [f, setF] = useState({
    make: "", model: "", year: "", engine: "", vin: "", plate: "",
    partNeeded: "", partCategory: "", condition: "ANY", sourcing: "ANY", budget: "",
    customerName: user?.name ?? "", customerPhone: "", customerWhatsapp: "",
    city: cities.find((c) => c.slug === city)?.name ?? "", notes: "",
  });
  const [photos, setPhotos] = useState<string[]>([]);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");
  const [done, setDone] = useState<{ sentTo: number } | null>(null);
  const set = (p: Partial<typeof f>) => setF({ ...f, ...p });

  async function submit(e: FormEvent) {
    e.preventDefault();
    if (busy) return;
    if (!f.make || !f.partNeeded.trim()) return setErr("Car make and the part you need are required.");
    if (!f.customerName.trim() || !f.customerPhone.trim()) return setErr("Your name and phone are required.");
    setBusy(true); setErr("");
    const client = user ? userApi : api;
    try {
      const r = await client.post<{ sentTo: number }>("/api/spare-parts/requests", { ...f, budget: Number(f.budget) || 0, photos });
      setDone({ sentTo: r.sentTo });
    } catch (e2) { setErr(e2 instanceof Error ? e2.message : "Couldn't submit your request."); setBusy(false); }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/50 p-0 backdrop-blur-sm sm:items-center sm:p-4" onClick={onClose}>
      <div className="card pop-in max-h-[94vh] w-full max-w-lg overflow-y-auto rounded-b-none p-6 sm:rounded-3xl" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between">
          <h2 className="font-display text-xl font-extrabold text-ink">🔧 Request a spare part</h2>
          <button onClick={onClose} aria-label="Close" className="text-muted hover:text-ink"><CloseIcon /></button>
        </div>

        {done ? (
          <div className="mt-5 text-center">
            <span className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-emerald-500/15 text-emerald-600"><CheckIcon className="h-7 w-7" /></span>
            <p className="mt-3 font-display text-lg font-bold text-ink">Request sent! 🎉</p>
            <p className="mt-1 text-muted">We sent it to <span className="font-semibold text-ink">{done.sentTo}</span> spare-parts shop{done.sentTo === 1 ? "" : "s"}. They'll reply with price &amp; availability.</p>
            {user ? <Link to="/my-requests" onClick={onClose} className="btn btn-ghost mt-4 px-4 py-2 text-sm">Track replies in My Requests</Link>
                  : <p className="mt-3 text-xs text-muted">Tip: log in next time to track all replies in one place.</p>}
            <button onClick={onClose} className="btn btn-primary mt-2 w-full py-2.5">Done</button>
          </div>
        ) : (
          <form onSubmit={submit} className="mt-4 space-y-4">
            <section className="space-y-2">
              <p className="text-xs font-bold uppercase tracking-wide text-muted">Your car</p>
              <CarPicker value={{ make: f.make, model: f.model, year: f.year, engine: f.engine, vin: f.vin, plate: f.plate }} onSelect={(v) => set({ make: v.make, model: v.model, year: v.year, engine: v.engine, vin: v.vin, plate: v.plate })} />
              <div className="grid grid-cols-2 gap-2">
                <select value={f.make} onChange={(e) => set({ make: e.target.value })} className={`input ${f.make ? "" : "text-muted"}`}><option value="">Make *</option>{meta?.makes.map((m) => <option key={m}>{m}</option>)}</select>
                <input value={f.model} onChange={(e) => set({ model: e.target.value })} placeholder="Model (e.g. Grand i10)" className="input" />
                <input value={f.year} onChange={(e) => set({ year: e.target.value })} placeholder="Year" className="input" />
                <input value={f.engine} onChange={(e) => set({ engine: e.target.value })} placeholder="Engine (e.g. 1.2L)" className="input" />
                <input value={f.vin} onChange={(e) => set({ vin: e.target.value })} placeholder="VIN / chassis (optional)" className="input" />
                <input value={f.plate} onChange={(e) => set({ plate: e.target.value })} placeholder="Plate (optional)" className="input" />
              </div>
            </section>

            <section className="space-y-2">
              <p className="text-xs font-bold uppercase tracking-wide text-muted">What you need</p>
              <input value={f.partNeeded} onChange={(e) => set({ partNeeded: e.target.value })} placeholder="Part needed * (e.g. right side mirror cover)" className="input" />
              <div className="grid grid-cols-3 gap-2">
                <label className="block text-[11px] font-semibold text-muted">Category
                  <select value={f.partCategory} onChange={(e) => set({ partCategory: e.target.value })} className="input mt-1 !py-2 text-sm"><option value="">Any</option>{meta?.partCategories.map((c) => <option key={c}>{c}</option>)}</select>
                </label>
                <label className="block text-[11px] font-semibold text-muted">Condition
                  <select value={f.condition} onChange={(e) => set({ condition: e.target.value })} className="input mt-1 !py-2 text-sm">{COND.map(([v, l]) => <option key={v} value={v}>{l}</option>)}</select>
                </label>
                <label className="block text-[11px] font-semibold text-muted">Source
                  <select value={f.sourcing} onChange={(e) => set({ sourcing: e.target.value })} className="input mt-1 !py-2 text-sm">{SRC.map(([v, l]) => <option key={v} value={v}>{l}</option>)}</select>
                </label>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <input value={f.budget} onChange={(e) => set({ budget: e.target.value })} type="number" min={0} placeholder="Budget $ (optional)" className="input" />
                <input value={f.city} onChange={(e) => set({ city: e.target.value })} placeholder="Your city" className="input" />
              </div>
              <textarea value={f.notes} onChange={(e) => set({ notes: e.target.value })} rows={2} placeholder="Notes (optional)" className="input" />
              <div>
                <p className="text-[11px] font-semibold text-muted">Photos <span className="font-normal">(optional — helps shops identify the exact part)</span></p>
                <PhotoUploader photos={photos} onChange={setPhotos} uploadWith={user ? userApi : api} />
              </div>
            </section>

            <section className="space-y-2">
              <p className="text-xs font-bold uppercase tracking-wide text-muted">Your contact</p>
              <div className="grid grid-cols-2 gap-2">
                <input value={f.customerName} onChange={(e) => set({ customerName: e.target.value })} required placeholder="Name *" className="input" />
                <input value={f.customerPhone} onChange={(e) => set({ customerPhone: e.target.value })} required placeholder="Phone *" className="input" />
              </div>
              <input value={f.customerWhatsapp} onChange={(e) => set({ customerWhatsapp: e.target.value })} placeholder="WhatsApp (optional)" className="input" />
            </section>

            {err && <p className="rounded-lg bg-red-500/10 px-3 py-2 text-sm font-medium text-red-500">{err}</p>}
            <button type="submit" disabled={busy} className="btn btn-primary w-full py-3 disabled:opacity-60">{busy ? "Sending…" : "Send request to all shops"}</button>
            <p className="text-center text-xs text-muted">One request → every matching shop replies with price &amp; availability.</p>
          </form>
        )}
      </div>
    </div>
  );
}
