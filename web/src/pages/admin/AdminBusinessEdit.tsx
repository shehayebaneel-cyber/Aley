import { FormEvent, useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { ImageField } from "../../components/ImageField";
import { CheckIcon, GlobeIcon, TrashIcon } from "../../components/icons";
import { adminApi, formatEventDate } from "../../lib/api";
import { useFetch } from "../../lib/useFetch";
import type { Business, Category, EventItem, HoursRow, Offer, ProductSection } from "../../types";

type Biz = Business & { owner?: { id: number; name: string; email: string; phone: string } | null; offers?: Offer[]; events?: EventItem[] };
const TABS = ["Profile", "Photos", "Hours", "Menu / Products", "Offers", "Events", "Owner"] as const;
type Tab = (typeof TABS)[number];
const DAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

export function AdminBusinessEdit() {
  const { id } = useParams();
  const [biz, setBiz] = useState<Biz | null>(null);
  const [tab, setTab] = useState<Tab>("Profile");
  const [err, setErr] = useState("");

  const load = () => adminApi.get<Biz>(`/api/admin/businesses/${id}`).then(setBiz).catch((e) => setErr(e.message));
  useEffect(() => { load(); /* eslint-disable-next-line */ }, [id]);

  async function save(patch: Partial<Business>) {
    const updated = await adminApi.patch<Biz>(`/api/admin/businesses/${id}`, patch);
    setBiz((prev) => ({ ...(prev as Biz), ...updated }));
  }

  if (err) return <div className="card p-10 text-center text-muted">{err} <Link to="/admin/businesses" className="font-semibold text-brand">← Back</Link></div>;
  if (!biz) return <div className="card h-72 animate-pulse" />;

  return (
    <div className="pb-10">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <Link to="/admin/businesses" className="text-sm font-semibold text-muted hover:text-ink">← All businesses</Link>
        <Link to={`/business/${biz.slug}`} target="_blank" className="btn btn-ghost px-4 py-2 text-sm"><GlobeIcon className="h-4 w-4" /> View public page</Link>
      </div>
      <h1 className="mt-2 font-display text-3xl font-extrabold text-ink">{biz.name}</h1>
      <p className="text-muted">{biz.category.icon} {biz.category.name} · {biz.owner ? `owner: ${biz.owner.email}` : "unclaimed"}</p>

      <div className="mt-5 flex gap-1 overflow-x-auto border-b border-border">
        {TABS.map((t) => (
          <button key={t} onClick={() => setTab(t)} className={`whitespace-nowrap border-b-2 px-4 py-2.5 text-sm font-semibold transition ${tab === t ? "border-brand text-brand" : "border-transparent text-muted hover:text-ink"}`}>{t}</button>
        ))}
      </div>

      <div className="mt-6 max-w-3xl">
        {tab === "Profile" && <ProfileTab biz={biz} save={save} />}
        {tab === "Photos" && <PhotosTab biz={biz} save={save} />}
        {tab === "Hours" && <HoursTab biz={biz} save={save} />}
        {tab === "Menu / Products" && <ProductsTab biz={biz} save={save} />}
        {tab === "Offers" && <OffersTab biz={biz} reload={load} />}
        {tab === "Events" && <EventsTab biz={biz} reload={load} />}
        {tab === "Owner" && <OwnerTab biz={biz} reload={load} />}
      </div>
    </div>
  );
}

function SaveBar({ onSave }: { onSave: () => Promise<void> }) {
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(false);
  return (
    <div className="mt-5 flex items-center gap-3">
      <button onClick={async () => { setBusy(true); setDone(false); try { await onSave(); setDone(true); } finally { setBusy(false); } }} disabled={busy} className="btn btn-primary px-6 py-2.5 disabled:opacity-60">{busy ? "Saving…" : "Save changes"}</button>
      {done && <span className="inline-flex items-center gap-1 text-sm font-semibold text-emerald-600"><CheckIcon className="h-4 w-4" /> Saved</span>}
    </div>
  );
}
const inp = "mt-1 w-full rounded-xl border border-border bg-surface px-3.5 py-2.5 text-sm";
function L({ label, children }: { label: string; children: React.ReactNode }) {
  return <label className="block text-sm font-semibold text-ink">{label}{children}</label>;
}

function ProfileTab({ biz, save }: { biz: Biz; save: (p: Partial<Business>) => Promise<void> }) {
  const { data: cats } = useFetch<Category[]>("/api/admin/categories");
  const [f, setF] = useState({
    name: biz.name, tagline: biz.tagline, categoryId: biz.category.id, description: biz.description,
    phone: biz.phone, whatsapp: biz.whatsapp, instagram: biz.instagram, facebook: biz.facebook, website: biz.website, email: biz.email,
    address: biz.address, lat: biz.lat?.toString() ?? "", lng: biz.lng?.toString() ?? "",
    priceRange: biz.priceRange, hasDelivery: biz.hasDelivery, hasReservations: biz.hasReservations,
    tags: biz.tags.join(", "), ownerName: biz.ownerName ?? "", commissionRate: biz.commissionRate ?? 10,
  });
  const set = (p: Partial<typeof f>) => setF({ ...f, ...p });
  return (
    <div className="space-y-3">
      <div className="grid gap-3 sm:grid-cols-2">
        <L label="Name"><input value={f.name} onChange={(e) => set({ name: e.target.value })} className={inp} /></L>
        <L label="Category"><select value={f.categoryId} onChange={(e) => set({ categoryId: Number(e.target.value) })} className={inp}>{(cats ?? []).map((c) => <option key={c.id} value={c.id}>{c.icon} {c.name}</option>)}</select></L>
      </div>
      <L label="Tagline"><input value={f.tagline} onChange={(e) => set({ tagline: e.target.value })} className={inp} /></L>
      <L label="Description"><textarea rows={4} value={f.description} onChange={(e) => set({ description: e.target.value })} className={inp} /></L>
      <L label="Amenities (comma separated)"><input value={f.tags} onChange={(e) => set({ tags: e.target.value })} className={inp} /></L>
      <div className="grid gap-3 sm:grid-cols-2">
        <L label="Phone"><input value={f.phone} onChange={(e) => set({ phone: e.target.value })} className={inp} /></L>
        <L label="WhatsApp"><input value={f.whatsapp} onChange={(e) => set({ whatsapp: e.target.value })} className={inp} /></L>
        <L label="Instagram (handle)"><input value={f.instagram} onChange={(e) => set({ instagram: e.target.value })} className={inp} /></L>
        <L label="Facebook URL"><input value={f.facebook} onChange={(e) => set({ facebook: e.target.value })} className={inp} /></L>
        <L label="Website"><input value={f.website} onChange={(e) => set({ website: e.target.value })} className={inp} /></L>
        <L label="Email"><input value={f.email} onChange={(e) => set({ email: e.target.value })} className={inp} /></L>
      </div>
      <L label="Address"><input value={f.address} onChange={(e) => set({ address: e.target.value })} className={inp} /></L>
      <div className="grid gap-3 sm:grid-cols-3">
        <L label="Latitude"><input value={f.lat} onChange={(e) => set({ lat: e.target.value })} className={inp} /></L>
        <L label="Longitude"><input value={f.lng} onChange={(e) => set({ lng: e.target.value })} className={inp} /></L>
        <L label="Owner name (display)"><input value={f.ownerName} onChange={(e) => set({ ownerName: e.target.value })} className={inp} /></L>
      </div>
      <L label="Commission % (0 = use marketplace default)"><input type="number" min={0} max={100} step="0.5" value={f.commissionRate} onChange={(e) => set({ commissionRate: Number(e.target.value) })} className={inp} /></L>
      <div className="flex flex-wrap items-center gap-2">
        <span className="text-sm font-semibold text-ink">Price</span>
        {[1, 2, 3, 4].map((p) => <button key={p} type="button" onClick={() => set({ priceRange: p })} className={`chip ${f.priceRange === p ? "chip-active" : ""}`}>{"$".repeat(p)}</button>)}
        <button type="button" onClick={() => set({ hasDelivery: !f.hasDelivery })} className={`chip ${f.hasDelivery ? "chip-active" : ""}`}>Delivery</button>
        <button type="button" onClick={() => set({ hasReservations: !f.hasReservations })} className={`chip ${f.hasReservations ? "chip-active" : ""}`}>Reservations</button>
      </div>
      <SaveBar onSave={() => save({ ...f, tags: f.tags.split(",").map((t) => t.trim()).filter(Boolean), lat: f.lat ? Number(f.lat) : null, lng: f.lng ? Number(f.lng) : null } as unknown as Partial<Business>)} />
    </div>
  );
}

function PhotosTab({ biz, save }: { biz: Biz; save: (p: Partial<Business>) => Promise<void> }) {
  const [logo, setLogo] = useState(biz.logo);
  const [cover, setCover] = useState(biz.cover);
  const [gallery, setGallery] = useState<string[]>(biz.gallery ?? []);
  return (
    <div className="space-y-6">
      <div className="grid gap-6 sm:grid-cols-2">
        <section className="card p-5"><h3 className="font-display font-bold text-ink">Logo</h3><div className="mt-3 max-w-[12rem]"><ImageField value={logo} uploadWith={adminApi} onChange={setLogo} aspect="aspect-square" label="logo" /></div></section>
        <section className="card p-5"><h3 className="font-display font-bold text-ink">Cover</h3><div className="mt-3"><ImageField value={cover} uploadWith={adminApi} onChange={setCover} label="cover" /></div></section>
      </div>
      <section className="card p-5">
        <h3 className="font-display font-bold text-ink">Gallery</h3>
        <div className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-4">
          {gallery.map((g, i) => (
            <div key={i} className="relative"><img src={g} alt="" className="aspect-square w-full rounded-xl object-cover" /><button onClick={() => setGallery(gallery.filter((_, j) => j !== i))} className="absolute right-1.5 top-1.5 rounded-full bg-black/60 px-2 py-0.5 text-xs text-white">×</button></div>
          ))}
          <div className="aspect-square"><ImageField value={null} uploadWith={adminApi} onChange={(u) => u && setGallery([...gallery, u])} aspect="aspect-square" label="photo" /></div>
        </div>
      </section>
      <SaveBar onSave={() => save({ logo, cover, gallery })} />
    </div>
  );
}

function HoursTab({ biz, save }: { biz: Biz; save: (p: Partial<Business>) => Promise<void> }) {
  const initial: HoursRow[] = [0, 1, 2, 3, 4, 5, 6].map((day) => biz.hours?.find((h) => h.day === day) ?? { day, open: "09:00", close: "22:00", closed: false });
  const [hours, setHours] = useState<HoursRow[]>(initial);
  const setRow = (day: number, p: Partial<HoursRow>) => setHours(hours.map((h) => (h.day === day ? { ...h, ...p } : h)));
  return (
    <section className="card max-w-lg p-5">
      <h3 className="font-display font-bold text-ink">Opening hours</h3>
      <div className="mt-3 space-y-2">
        {hours.map((h) => (
          <div key={h.day} className="flex items-center gap-3">
            <span className="w-12 text-sm font-semibold text-ink">{DAYS[h.day]}</span>
            {h.closed ? <span className="flex-1 text-sm text-muted">Closed</span> : (
              <div className="flex flex-1 items-center gap-2"><input type="time" value={h.open} onChange={(e) => setRow(h.day, { open: e.target.value })} className="rounded-lg border border-border bg-surface px-2 py-1.5 text-sm" /><span className="text-muted">–</span><input type="time" value={h.close} onChange={(e) => setRow(h.day, { close: e.target.value })} className="rounded-lg border border-border bg-surface px-2 py-1.5 text-sm" /></div>
            )}
            <button onClick={() => setRow(h.day, { closed: !h.closed })} className={`chip ${h.closed ? "chip-active" : ""}`}>{h.closed ? "Closed" : "Open"}</button>
          </div>
        ))}
      </div>
      <SaveBar onSave={() => save({ hours })} />
    </section>
  );
}

function ProductsTab({ biz, save }: { biz: Biz; save: (p: Partial<Business>) => Promise<void> }) {
  const [label, setLabel] = useState(biz.productLabel ?? "Products & Services");
  const [sections, setSections] = useState<ProductSection[]>(biz.products ?? []);
  const setSec = (i: number, p: Partial<ProductSection>) => setSections(sections.map((s, j) => (j === i ? { ...s, ...p } : s)));
  const setItem = (si: number, ii: number, p: Partial<ProductSection["items"][0]>) => setSec(si, { items: sections[si].items.map((it, j) => (j === ii ? { ...it, ...p } : it)) });
  return (
    <div className="space-y-4">
      <L label="Section heading (e.g. Menu, Rooms, Collections)"><input value={label} onChange={(e) => setLabel(e.target.value)} className={inp} /></L>
      {sections.map((sec, si) => (
        <div key={si} className="card p-4">
          <div className="flex items-center gap-2">
            <input value={sec.title} onChange={(e) => setSec(si, { title: e.target.value })} placeholder="Section title" className={`${inp} !mt-0 font-semibold`} />
            <button onClick={() => setSections(sections.filter((_, j) => j !== si))} className="btn btn-ghost h-9 w-9 !p-0 text-red-500"><TrashIcon className="h-4 w-4" /></button>
          </div>
          <div className="mt-2 space-y-2">
            {sec.items.map((it, ii) => (
              <div key={ii} className="flex items-center gap-2">
                <input value={it.name} onChange={(e) => setItem(si, ii, { name: e.target.value })} placeholder="Item" className="flex-1 rounded-lg border border-border bg-surface px-3 py-2 text-sm" />
                <input value={it.price ?? ""} onChange={(e) => setItem(si, ii, { price: e.target.value === "" ? undefined : Number(e.target.value) })} placeholder="$" className="w-20 rounded-lg border border-border bg-surface px-3 py-2 text-sm" />
                <button onClick={() => setSec(si, { items: sec.items.filter((_, j) => j !== ii) })} className="text-red-500"><TrashIcon className="h-4 w-4" /></button>
              </div>
            ))}
            <button onClick={() => setSec(si, { items: [...sec.items, { name: "" }] })} className="chip">+ Add item</button>
          </div>
        </div>
      ))}
      <button onClick={() => setSections([...sections, { title: "New section", items: [] }])} className="chip">+ Add section</button>
      <SaveBar onSave={() => save({ products: sections.filter((s) => s.title.trim()), productLabel: label } as Partial<Business>)} />
    </div>
  );
}

function OffersTab({ biz, reload }: { biz: Biz; reload: () => void }) {
  const [form, setForm] = useState({ title: "", description: "", type: "DISCOUNT", image: null as string | null });
  return (
    <div className="grid gap-6 lg:grid-cols-[20rem_1fr]">
      <form onSubmit={async (e: FormEvent) => { e.preventDefault(); if (!form.title.trim()) return; await adminApi.post(`/api/admin/businesses/${biz.id}/offers`, form); setForm({ title: "", description: "", type: "DISCOUNT", image: null }); reload(); }} className="card h-fit space-y-3 p-5">
        <h3 className="font-display font-bold text-ink">New offer</h3>
        <input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} placeholder="Title" className={inp} />
        <textarea rows={2} value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} placeholder="Details" className={inp} />
        <select value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value })} className={inp}>{["DISCOUNT", "BOGO", "HAPPY_HOUR", "SEASONAL"].map((t) => <option key={t}>{t}</option>)}</select>
        <ImageField value={form.image} uploadWith={adminApi} onChange={(image) => setForm({ ...form, image })} label="offer image" />
        <button className="btn btn-primary w-full py-2.5">Add offer</button>
      </form>
      <div className="space-y-2">
        {(biz.offers ?? []).length === 0 && <div className="card p-8 text-center text-muted">No offers yet.</div>}
        {(biz.offers ?? []).map((o) => (
          <div key={o.id} className="card flex items-center gap-3 p-4"><span className="flex-1 font-semibold text-ink">{o.title} <span className="chip !py-0 !text-[10px]">{o.type.replace("_", " ")}</span></span><button onClick={async () => { await adminApi.delete(`/api/admin/offers/${o.id}`); reload(); }} className="text-red-500"><TrashIcon className="h-4 w-4" /></button></div>
        ))}
      </div>
    </div>
  );
}

function EventsTab({ biz, reload }: { biz: Biz; reload: () => void }) {
  const [form, setForm] = useState({ title: "", category: "Community", description: "", location: "", startTime: "", image: null as string | null });
  return (
    <div className="grid gap-6 lg:grid-cols-[20rem_1fr]">
      <form onSubmit={async (e: FormEvent) => { e.preventDefault(); if (!form.title.trim() || !form.startTime) return; await adminApi.post(`/api/admin/businesses/${biz.id}/events`, form); setForm({ title: "", category: "Community", description: "", location: "", startTime: "", image: null }); reload(); }} className="card h-fit space-y-3 p-5">
        <h3 className="font-display font-bold text-ink">New event</h3>
        <input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} placeholder="Title" className={inp} />
        <input value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })} placeholder="Category" className={inp} />
        <input value={form.location} onChange={(e) => setForm({ ...form, location: e.target.value })} placeholder="Location" className={inp} />
        <input type="datetime-local" value={form.startTime} onChange={(e) => setForm({ ...form, startTime: e.target.value })} className={inp} />
        <ImageField value={form.image} uploadWith={adminApi} onChange={(image) => setForm({ ...form, image })} label="event image" />
        <button className="btn btn-primary w-full py-2.5">Add event</button>
      </form>
      <div className="space-y-2">
        {(biz.events ?? []).length === 0 && <div className="card p-8 text-center text-muted">No events yet.</div>}
        {(biz.events ?? []).map((ev) => (
          <div key={ev.id} className="card flex items-center gap-3 p-4"><span className="flex-1 font-semibold text-ink">{ev.title} <span className="text-xs text-muted">· {formatEventDate(ev.startTime)}</span></span><button onClick={async () => { await adminApi.delete(`/api/admin/events/${ev.id}`); reload(); }} className="text-red-500"><TrashIcon className="h-4 w-4" /></button></div>
        ))}
      </div>
    </div>
  );
}

function OwnerTab({ biz, reload }: { biz: Biz; reload: () => void }) {
  const [form, setForm] = useState({ name: biz.ownerName ?? "", email: "", phone: "", password: "" });
  const [created, setCreated] = useState<{ email: string; password?: string } | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  async function assign(e: FormEvent) {
    e.preventDefault();
    if (busy) return;
    setBusy(true); setError("");
    try {
      const res = await adminApi.post<{ owner: { email: string }; createdPassword?: string }>(`/api/admin/businesses/${biz.id}/owner`, form);
      setCreated({ email: res.owner.email, password: res.createdPassword });
      reload();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Couldn't assign owner.");
    } finally { setBusy(false); }
  }

  return (
    <div className="max-w-lg space-y-4">
      <section className="card p-5">
        <h3 className="font-display font-bold text-ink">Business owner account</h3>
        {biz.owner ? (
          <div className="mt-3">
            <p className="text-sm text-ink">Currently managed by <span className="font-semibold">{biz.owner.name}</span></p>
            <p className="text-sm text-muted">{biz.owner.email}{biz.owner.phone ? ` · ${biz.owner.phone}` : ""}</p>
            <button onClick={async () => { if (confirm("Remove this owner from the business?")) { await adminApi.delete(`/api/admin/businesses/${biz.id}/owner`); reload(); } }} className="btn btn-ghost mt-3 px-4 py-2 text-sm text-red-500">Remove owner</button>
          </div>
        ) : (
          <p className="mt-2 text-sm text-muted">No owner yet — this business is unclaimed. Assign an owner so they can manage it from their own login at <b>/owner/login</b>.</p>
        )}
      </section>

      {created ? (
        <section className="card border-emerald-500/40 bg-emerald-500/5 p-5">
          <h3 className="flex items-center gap-2 font-display font-bold text-emerald-600"><CheckIcon className="h-5 w-5" /> Owner ready — share these credentials</h3>
          <p className="mt-2 text-sm text-ink">Login page: <b>/owner/login</b></p>
          <p className="text-sm text-ink">Email: <b>{created.email}</b></p>
          {created.password ? <p className="text-sm text-ink">Password: <b>{created.password}</b> <span className="text-xs text-muted">(shown once — copy it now)</span></p> : <p className="text-sm text-muted">This email already had an account — they use their existing password.</p>}
          <button onClick={() => setCreated(null)} className="btn btn-ghost mt-3 px-4 py-2 text-sm">Done</button>
        </section>
      ) : (
        <form onSubmit={assign} className="card space-y-3 p-5">
          <h3 className="font-display font-bold text-ink">{biz.owner ? "Reassign to another owner" : "Assign an owner"}</h3>
          <p className="text-xs text-muted">Enter the owner's details. If they don't have an account yet, one is created and a password is generated for you to share.</p>
          <input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="Owner name" className={inp} />
          <input required type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} placeholder="Owner email" className={inp} />
          <input value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} placeholder="Phone (optional)" className={inp} />
          <input value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} placeholder="Set a password (optional — auto-generated if blank)" className={inp} />
          {error && <p className="text-sm font-medium text-red-500">{error}</p>}
          <button disabled={busy} className="btn btn-primary px-6 py-2.5 disabled:opacity-60">{busy ? "Assigning…" : "Assign owner"}</button>
        </form>
      )}
    </div>
  );
}
