import { FormEvent, useEffect, useRef, useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { MapPicker } from "../components/MapPicker";
import { CheckIcon, TruckIcon } from "../components/icons";
import { useUserAuth } from "../context/UserAuthContext";
import { api, userApi } from "../lib/api";
import { useTitle } from "../lib/useTitle";
import type { DeliveryEstimate } from "../types";

const CITY = "aley";

const TYPES = [
  { key: "ALEY_TO_ALEY", icon: "🏘️", title: "Aley → Aley", desc: "Pick up and drop off, both inside Aley." },
  { key: "OUTSIDE_TO_ALEY", icon: "📥", title: "Outside → Aley", desc: "Bring something from Beirut, Hazmieh, Baabda… to Aley." },
  { key: "ALEY_TO_OUTSIDE", icon: "📤", title: "Aley → Outside", desc: "Send something from Aley to another area." },
  { key: "CUSTOM", icon: "🗺️", title: "Custom route", desc: "Set any pickup and drop-off yourself." },
];
const PACKAGE_TYPES = ["Document", "Food", "Parcel", "Fragile", "Groceries", "Clothing", "Electronics", "Other"];
const SIZES = [
  { key: "SMALL", label: "Small", hint: "Fits in a bag" },
  { key: "MEDIUM", label: "Medium", hint: "Box-sized" },
  { key: "LARGE", label: "Large", hint: "Bulky / heavy" },
];

type Coord = { lat: number; lng: number } | null;

export function Delivery() {
  useTitle("Delivery Service");
  const { user } = useUserAuth();
  const navigate = useNavigate();
  const [params] = useSearchParams();

  const [type, setType] = useState(params.get("type") || "ALEY_TO_ALEY");
  const [form, setForm] = useState({
    pickupLabel: params.get("pickup") || "",
    pickupPhone: "",
    dropoffLabel: "",
    itemDescription: "",
    packageType: "Parcel",
    packageSize: "MEDIUM",
    urgency: "STANDARD",
    preferredTime: "",
    notes: "",
    customerName: user?.name ?? "",
    customerPhone: "",
  });
  const plat = params.get("plat"), plng = params.get("plng");
  const [pickup, setPickup] = useState<Coord>(plat && plng ? { lat: Number(plat), lng: Number(plng) } : null);
  const [dropoff, setDropoff] = useState<Coord>(null);
  const businessId = params.get("businessId");

  const [estimate, setEstimate] = useState<DeliveryEstimate | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const set = (k: keyof typeof form, v: string) => setForm((f) => ({ ...f, [k]: v }));

  // Live estimate — debounced whenever a price-relevant field changes.
  const estRef = useRef<ReturnType<typeof setTimeout>>();
  useEffect(() => {
    clearTimeout(estRef.current);
    estRef.current = setTimeout(() => {
      api.post<DeliveryEstimate>("/api/delivery/estimate", {
        type,
        pickupLat: pickup?.lat, pickupLng: pickup?.lng,
        dropoffLat: dropoff?.lat, dropoffLng: dropoff?.lng,
        packageSize: form.packageSize, urgency: form.urgency,
      }).then(setEstimate).catch(() => setEstimate(null));
    }, 350);
    return () => clearTimeout(estRef.current);
  }, [type, pickup, dropoff, form.packageSize, form.urgency]);

  async function submit(e: FormEvent) {
    e.preventDefault();
    if (busy) return;
    setError("");
    if (!form.pickupLabel.trim() || !form.dropoffLabel.trim() || !form.itemDescription.trim() || !form.customerName.trim() || !form.customerPhone.trim()) {
      setError("Please fill pickup, drop-off, what to deliver, your name and phone.");
      return;
    }
    setBusy(true);
    try {
      const { number } = await userApi.post<{ number: string }>("/api/delivery", {
        ...form, type, city: CITY,
        pickupLat: pickup?.lat, pickupLng: pickup?.lng,
        dropoffLat: dropoff?.lat, dropoffLng: dropoff?.lng,
        businessId: businessId ? Number(businessId) : undefined,
      });
      navigate(`/delivery/track/${number}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Couldn't submit your request.");
      setBusy(false);
    }
  }

  return (
    <div>
      {/* ---- Hero ---- */}
      <section className="relative isolate overflow-hidden border-b border-border bg-gradient-to-br from-brand/15 via-surface to-sky-400/10">
        <div className="mx-auto max-w-3xl px-4 py-14 text-center">
          <span className="chip"><TruckIcon className="h-4 w-4 text-brand" /> Delivery service · Aley</span>
          <h1 className="mt-4 font-display text-4xl font-extrabold text-ink sm:text-5xl">Get anything delivered</h1>
          <p className="mx-auto mt-3 max-w-xl text-lg text-muted">
            Inside Aley or to/from another area — even from a shop that isn't on the platform. Tell us what to pick up and where, and we'll handle the rest.
          </p>
        </div>
      </section>

      <form onSubmit={submit} className="mx-auto max-w-6xl px-4 py-10">
        {/* ---- Type selector ---- */}
        <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
          {TYPES.map((t) => (
            <button type="button" key={t.key} onClick={() => setType(t.key)}
              className={`card p-4 text-left transition ${type === t.key ? "ring-2 ring-brand" : "card-hover"}`}>
              <span className="text-2xl">{t.icon}</span>
              <p className="mt-1 font-display font-bold text-ink">{t.title}</p>
              <p className="mt-0.5 text-xs text-muted">{t.desc}</p>
            </button>
          ))}
        </div>

        <div className="mt-6 grid gap-6 lg:grid-cols-[1fr_360px]">
          {/* ---- Form ---- */}
          <div className="space-y-6">
            {/* Pickup */}
            <section className="card p-5">
              <h2 className="font-display text-lg font-bold text-ink">📍 Pickup — Point A</h2>
              <input required value={form.pickupLabel} onChange={(e) => set("pickupLabel", e.target.value)} placeholder="Where to pick up (e.g. ABC Shop, Hamra St, Beirut)" className="input mt-3" />
              <input value={form.pickupPhone} onChange={(e) => set("pickupPhone", e.target.value)} placeholder="Pickup place phone (optional — helps the driver call the shop)" className="input mt-2" />
              <div className="mt-3"><MapPicker lat={pickup?.lat ?? null} lng={pickup?.lng ?? null} onChange={setPickup} /></div>
            </section>

            {/* Drop-off */}
            <section className="card p-5">
              <h2 className="font-display text-lg font-bold text-ink">🏁 Drop-off — Point B</h2>
              <input required value={form.dropoffLabel} onChange={(e) => set("dropoffLabel", e.target.value)} placeholder="Where to deliver (e.g. my house, Hilltop Ave, Aley)" className="input mt-3" />
              <div className="mt-3"><MapPicker lat={dropoff?.lat ?? null} lng={dropoff?.lng ?? null} onChange={setDropoff} /></div>
            </section>

            {/* What */}
            <section className="card space-y-3 p-5">
              <h2 className="font-display text-lg font-bold text-ink">📦 What needs delivering</h2>
              <textarea required value={form.itemDescription} onChange={(e) => set("itemDescription", e.target.value)} rows={2} placeholder="Describe the item(s) — e.g. 2 boxes of pastries, a sealed phone, documents…" className="input" />
              <div className="grid gap-3 sm:grid-cols-2">
                <label className="text-xs font-semibold text-muted">Package type
                  <select value={form.packageType} onChange={(e) => set("packageType", e.target.value)} className="input !mt-1">
                    {PACKAGE_TYPES.map((p) => <option key={p}>{p}</option>)}
                  </select>
                </label>
                <label className="text-xs font-semibold text-muted">Preferred time
                  <input value={form.preferredTime} onChange={(e) => set("preferredTime", e.target.value)} placeholder="e.g. Today 5–7pm / ASAP" className="input !mt-1" />
                </label>
              </div>
              <div>
                <p className="text-xs font-semibold text-muted">Package size</p>
                <div className="mt-1 grid grid-cols-3 gap-2">
                  {SIZES.map((s) => (
                    <button type="button" key={s.key} onClick={() => set("packageSize", s.key)}
                      className={`rounded-xl border px-3 py-2 text-center transition ${form.packageSize === s.key ? "border-brand bg-brand-soft text-brand-dark" : "border-border text-muted hover:text-ink"}`}>
                      <span className="block text-sm font-bold">{s.label}</span>
                      <span className="block text-[10px]">{s.hint}</span>
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <p className="text-xs font-semibold text-muted">Urgency</p>
                <div className="mt-1 flex gap-2">
                  {[{ k: "STANDARD", l: "Standard" }, { k: "EXPRESS", l: "Express (faster, costs more)" }].map((u) => (
                    <button type="button" key={u.k} onClick={() => set("urgency", u.k)}
                      className={`flex-1 rounded-xl border px-3 py-2 text-sm font-semibold transition ${form.urgency === u.k ? "border-brand bg-brand-soft text-brand-dark" : "border-border text-muted hover:text-ink"}`}>{u.l}</button>
                  ))}
                </div>
              </div>
              <textarea value={form.notes} onChange={(e) => set("notes", e.target.value)} rows={2} placeholder="Optional notes (gate code, who to ask for, payment to shop…)" className="input" />
            </section>

            {/* Contact */}
            <section className="card space-y-3 p-5">
              <h2 className="font-display text-lg font-bold text-ink">📞 Your contact</h2>
              <div className="grid gap-3 sm:grid-cols-2">
                <input required value={form.customerName} onChange={(e) => set("customerName", e.target.value)} placeholder="Your name" className="input" />
                <input required value={form.customerPhone} onChange={(e) => set("customerPhone", e.target.value)} placeholder="Phone number" className="input" />
              </div>
            </section>
          </div>

          {/* ---- Estimate (sticky) ---- */}
          <div className="lg:sticky lg:top-24 lg:self-start">
            <div className="card p-5">
              <h2 className="font-display text-lg font-bold text-ink">Estimated price</h2>
              {estimate ? (
                <>
                  <p className="mt-2 font-display text-4xl font-extrabold text-brand">${estimate.min}–${estimate.max}</p>
                  <p className="mt-1 text-xs text-muted">~{estimate.distanceKm} km{estimate.outsideCount ? ` · ${estimate.outsideCount} stop(s) outside Aley` : ""}</p>
                  <dl className="mt-4 space-y-1.5 border-t border-border pt-3 text-sm">
                    {estimate.breakdown.map((b) => (
                      <div key={b.label} className="flex justify-between"><dt className="text-muted">{b.label}</dt><dd className="font-semibold text-ink">${b.amount}</dd></div>
                    ))}
                  </dl>
                  <p className="mt-3 rounded-lg bg-amber-400/10 px-3 py-2 text-xs text-amber-600">
                    This is an estimate. The delivery team confirms the final price before pickup.
                  </p>
                </>
              ) : (
                <p className="mt-2 text-sm text-muted">Fill in the details to see your estimate.</p>
              )}

              <p className="mt-4 text-xs text-muted">💡 Tip: pin both locations on the maps for the most accurate price.</p>

              {error && <p className="mt-3 rounded-lg bg-red-500/10 px-3 py-2 text-sm font-medium text-red-500">{error}</p>}
              <button type="submit" disabled={busy} className="btn btn-primary mt-4 w-full py-3 disabled:opacity-60">{busy ? "Sending…" : "Request delivery"}</button>
              <p className="mt-2 text-center text-xs text-muted">No payment now — pay the driver on delivery.</p>
            </div>
          </div>
        </div>
      </form>
    </div>
  );
}
