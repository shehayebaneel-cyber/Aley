import { FormEvent, useState } from "react";
import { Link } from "react-router-dom";
import { CarPicker } from "./CarPicker";
import { CheckIcon, CloseIcon } from "./icons";
import { PhotoUploader } from "./PhotoUploader";
import { useCity } from "../context/CityContext";
import { useUserAuth } from "../context/UserAuthContext";
import { api, userApi } from "../lib/api";
import { requestFields } from "../lib/requestForms";

/** Generic RFQ form for any quote-enabled category. One request → all matching shops. */
export function RequestQuoteModal({ categorySlug, categoryName, onClose }: { categorySlug: string; categoryName: string; onClose: () => void }) {
  const { user } = useUserAuth();
  const { city, cities } = useCity();
  const fields = requestFields(categorySlug);
  const [payload, setPayload] = useState<Record<string, string>>({});
  const [c, setC] = useState({ customerName: user?.name ?? "", customerPhone: "", customerWhatsapp: "", city: cities.find((x) => x.slug === city)?.name ?? "", notes: "", budget: "" });
  const [photos, setPhotos] = useState<string[]>([]);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");
  const [done, setDone] = useState<{ sentTo: number } | null>(null);
  const setP = (k: string, v: string) => setPayload({ ...payload, [k]: v });

  async function submit(e: FormEvent) {
    e.preventDefault();
    if (busy) return;
    for (const f of fields) if (f.required && !String(payload[f.key] ?? "").trim()) return setErr(`${f.label} is required.`);
    if (!c.customerName.trim() || !c.customerPhone.trim()) return setErr("Your name and phone are required.");
    setBusy(true); setErr("");
    const client = user ? userApi : api;
    try {
      const r = await client.post<{ sentTo: number }>("/api/requests", { categorySlug, payload, photos, ...c, budget: Number(c.budget) || 0 });
      setDone({ sentTo: r.sentTo });
    } catch (e2) { setErr(e2 instanceof Error ? e2.message : "Couldn't submit your request."); setBusy(false); }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/50 p-0 backdrop-blur-sm sm:items-center sm:p-4" onClick={onClose}>
      <div className="card pop-in max-h-[94vh] w-full max-w-lg overflow-y-auto rounded-b-none p-6 sm:rounded-3xl" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between">
          <h2 className="font-display text-xl font-extrabold text-ink">💬 Request a quote</h2>
          <button onClick={onClose} aria-label="Close" className="text-muted hover:text-ink"><CloseIcon /></button>
        </div>
        <p className="mt-0.5 text-sm text-muted">{categoryName} · sent to every matching business</p>

        {done ? (
          <div className="mt-5 text-center">
            <span className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-emerald-500/15 text-emerald-600"><CheckIcon className="h-7 w-7" /></span>
            <p className="mt-3 font-display text-lg font-bold text-ink">Request sent! 🎉</p>
            <p className="mt-1 text-muted">Sent to <span className="font-semibold text-ink">{done.sentTo}</span> business{done.sentTo === 1 ? "" : "es"}. They'll reply with price, availability &amp; timing.</p>
            {user ? <Link to="/my-requests" onClick={onClose} className="btn btn-ghost mt-4 px-4 py-2 text-sm">Track replies in My Requests</Link> : <p className="mt-3 text-xs text-muted">Tip: log in to track all replies in one place.</p>}
            <button onClick={onClose} className="btn btn-primary mt-2 w-full py-2.5">Done</button>
          </div>
        ) : (
          <form onSubmit={submit} className="mt-4 space-y-3">
            {fields.some((f) => f.key === "make") && (
              <CarPicker
                value={{ make: payload.make ?? "", model: payload.model ?? "", year: payload.year ?? "", engine: payload.engine ?? "", vin: payload.vin ?? "", plate: payload.plate ?? "" }}
                onSelect={(v) => setPayload({ ...payload, make: v.make, model: v.model, year: v.year, engine: v.engine, vin: v.vin, plate: v.plate })}
              />
            )}
            {fields.map((f) => {
              const v = payload[f.key] ?? "";
              if (f.type === "toggle") return <label key={f.key} className="flex items-center gap-2 text-sm text-ink"><input type="checkbox" checked={v === "Yes"} onChange={(e) => setP(f.key, e.target.checked ? "Yes" : "")} /> {f.label}</label>;
              if (f.type === "select") return <label key={f.key} className="block text-xs font-semibold text-muted">{f.label}{f.required ? " *" : ""}<select value={v} onChange={(e) => setP(f.key, e.target.value)} className="input mt-1"><option value="">Select…</option>{f.options?.map((o) => <option key={o}>{o}</option>)}</select></label>;
              if (f.type === "textarea") return <textarea key={f.key} value={v} onChange={(e) => setP(f.key, e.target.value)} rows={2} placeholder={f.label + (f.required ? " *" : "")} className="input" />;
              if (f.type === "date") return <label key={f.key} className="block text-xs font-semibold text-muted">{f.label}<input type="date" value={v} onChange={(e) => setP(f.key, e.target.value)} className="input mt-1" /></label>;
              return <input key={f.key} type={f.type === "number" ? "number" : "text"} value={v} onChange={(e) => setP(f.key, e.target.value)} placeholder={f.label + (f.required ? " *" : "")} className="input" />;
            })}

            {/* photos */}
            <div>
              <p className="text-[11px] font-semibold text-muted">Photos (optional)</p>
              <PhotoUploader photos={photos} onChange={setPhotos} uploadWith={user ? userApi : api} />
            </div>

            <p className="text-sm font-semibold text-ink">Your contact</p>
            <div className="grid grid-cols-2 gap-2">
              <input value={c.customerName} onChange={(e) => setC({ ...c, customerName: e.target.value })} required placeholder="Name *" className="input" />
              <input value={c.customerPhone} onChange={(e) => setC({ ...c, customerPhone: e.target.value })} required placeholder="Phone *" className="input" />
              <input value={c.customerWhatsapp} onChange={(e) => setC({ ...c, customerWhatsapp: e.target.value })} placeholder="WhatsApp (optional)" className="input" />
              <input value={c.city} onChange={(e) => setC({ ...c, city: e.target.value })} placeholder="Your city" className="input" />
            </div>
            <div className="grid grid-cols-2 gap-2">
              <input value={c.budget} onChange={(e) => setC({ ...c, budget: e.target.value })} type="number" min={0} placeholder="Budget $ (optional)" className="input" />
            </div>
            <textarea value={c.notes} onChange={(e) => setC({ ...c, notes: e.target.value })} rows={2} placeholder="Anything else? (optional)" className="input" />

            {err && <p className="rounded-lg bg-red-500/10 px-3 py-2 text-sm font-medium text-red-500">{err}</p>}
            <button type="submit" disabled={busy} className="btn btn-primary w-full py-3 disabled:opacity-60">{busy ? "Sending…" : "Send to all matching businesses"}</button>
            <p className="text-center text-xs text-muted">One request → businesses compete with their best offer.</p>
          </form>
        )}
      </div>
    </div>
  );
}
