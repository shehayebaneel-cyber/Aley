import { FormEvent, useEffect, useState } from "react";
import { ImageField } from "../components/ImageField";
import { CheckIcon, CloseIcon, MapPinIcon, PhoneIcon, SearchIcon } from "../components/icons";
import { useUserAuth } from "../context/UserAuthContext";
import { api, timeAgo, userApi } from "../lib/api";
import { useTitle } from "../lib/useTitle";
import type { LostFoundItem } from "../types";

const CITY = "aley";
const CATEGORIES = ["Phone", "Keys", "Wallet", "Pet", "Document", "Jewelry", "Bag", "Other"];
const TYPES: { key: string; label: string }[] = [
  { key: "", label: "All" },
  { key: "LOST", label: "Lost" },
  { key: "FOUND", label: "Found" },
];

export function LostFound() {
  useTitle("Lost & Found");
  const { user } = useUserAuth();
  const [items, setItems] = useState<LostFoundItem[]>([]);
  const [type, setType] = useState("");
  const [category, setCategory] = useState("");
  const [q, setQ] = useState("");
  const [postOpen, setPostOpen] = useState(false);

  const load = () => {
    const p = new URLSearchParams({ city: CITY, status: "ALL" });
    if (type) p.set("type", type);
    if (category) p.set("category", category);
    if (q.trim()) p.set("q", q.trim());
    api.get<LostFoundItem[]>(`/api/lost-found?${p}`).then(setItems);
  };
  useEffect(() => { load(); /* eslint-disable-next-line */ }, [type, category]);
  useEffect(() => {
    const t = setTimeout(load, 300);
    return () => clearTimeout(t);
    /* eslint-disable-next-line */
  }, [q]);

  return (
    <div>
      {/* ---- Hero ---- */}
      <section className="relative isolate overflow-hidden border-b border-border bg-gradient-to-br from-brand/15 via-surface to-amber-400/10">
        <div className="mx-auto max-w-3xl px-4 py-16 text-center">
          <span className="chip"><MapPinIcon className="h-4 w-4 text-brand" /> Community board · Aley</span>
          <h1 className="mt-4 font-display text-4xl font-extrabold text-ink sm:text-5xl">Lost &amp; Found</h1>
          <p className="mx-auto mt-3 max-w-xl text-lg text-muted">
            Lost something in Aley? Found something that isn't yours? Post it here and help reunite it with its owner.
          </p>
          <button onClick={() => setPostOpen(true)} className="btn btn-primary mt-6 px-6 py-3">+ Post a listing</button>
        </div>
      </section>

      <div className="mx-auto max-w-7xl px-4 py-10">
        {/* ---- Filters ---- */}
        <div className="flex flex-wrap items-center gap-2">
          {TYPES.map((t) => (
            <button key={t.key} onClick={() => setType(t.key)} className={`chip ${type === t.key ? "chip-active" : ""}`}>{t.label}</button>
          ))}
          <span className="mx-1 h-5 w-px bg-border" />
          <button onClick={() => setCategory("")} className={`chip ${!category ? "chip-active" : ""}`}>All types</button>
          {CATEGORIES.map((c) => (
            <button key={c} onClick={() => setCategory(category === c ? "" : c)} className={`chip ${category === c ? "chip-active" : ""}`}>{c}</button>
          ))}
          <div className="relative ml-auto w-full sm:w-64">
            <SearchIcon className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted" />
            <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search listings…" className="input !pl-9" />
          </div>
        </div>

        {/* ---- Grid ---- */}
        <div className="mt-6 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {items.map((it) => <LostFoundCard key={it.id} item={it} />)}
        </div>
        {items.length === 0 && <div className="card mt-6 p-16 text-center text-muted">No listings here yet — be the first to post.</div>}
      </div>

      {postOpen && <PostModal user={user} onClose={() => setPostOpen(false)} onPosted={() => { setPostOpen(false); load(); }} />}
    </div>
  );
}

function LostFoundCard({ item }: { item: LostFoundItem }) {
  const lost = item.type === "LOST";
  return (
    <div className="card card-hover overflow-hidden">
      {item.image && (
        <div className="relative">
          <img src={item.image} alt="" className="aspect-[4/3] w-full object-cover" />
          {item.status === "RESOLVED" && (
            <span className="absolute right-2 top-2 rounded-full bg-emerald-500/90 px-2.5 py-1 text-xs font-bold text-white">Resolved</span>
          )}
        </div>
      )}
      <div className="p-5">
        <div className="flex items-center gap-2">
          <span className={`rounded-full px-2.5 py-0.5 text-xs font-bold ${lost ? "bg-rose-500/15 text-rose-500" : "bg-emerald-500/15 text-emerald-600"}`}>
            {lost ? "LOST" : "FOUND"}
          </span>
          <span className="chip !py-0.5 !text-[11px]">{item.category}</span>
          {!item.image && item.status === "RESOLVED" && <span className="rounded-full bg-emerald-500/15 px-2 py-0.5 text-xs font-bold text-emerald-600">Resolved</span>}
          <span className="ml-auto text-xs text-muted">{timeAgo(item.createdAt)}</span>
        </div>
        <h3 className="mt-2 font-display text-lg font-bold text-ink">{item.title}</h3>
        {item.description && <p className="mt-1 line-clamp-3 text-sm text-muted">{item.description}</p>}
        <div className="mt-3 space-y-1 text-sm text-muted">
          {item.location && <p className="flex items-center gap-1.5"><MapPinIcon className="h-4 w-4 text-brand" /> {item.location}</p>}
        </div>
        <div className="mt-3 border-t border-border pt-3 text-sm">
          <p className="font-semibold text-ink">{item.contactName}</p>
          <div className="mt-1 flex flex-wrap gap-2">
            {item.contactPhone && (
              <a href={`tel:${item.contactPhone}`} className="btn btn-ghost px-3 py-1.5 text-xs"><PhoneIcon className="h-3.5 w-3.5" /> {item.contactPhone}</a>
            )}
            {item.contactEmail && (
              <a href={`mailto:${item.contactEmail}`} className="btn btn-ghost px-3 py-1.5 text-xs">✉ {item.contactEmail}</a>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function PostModal({ user, onClose, onPosted }: { user: { name: string; email?: string | null } | null; onClose: () => void; onPosted: () => void }) {
  const [form, setForm] = useState({
    type: "LOST", title: "", category: "Other", location: "", date: "", description: "",
    contactName: user?.name ?? "", contactPhone: "", contactEmail: user?.email ?? "",
  });
  const [image, setImage] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState("");

  async function submit(e: FormEvent) {
    e.preventDefault();
    if (busy) return;
    setBusy(true);
    setError("");
    try {
      await userApi.post("/api/lost-found", { ...form, image });
      setDone(true);
      setTimeout(onPosted, 1200);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Couldn't post your listing.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/50 p-0 backdrop-blur-sm sm:items-center sm:p-4" onClick={onClose}>
      <div className="card pop-in max-h-[92vh] w-full max-w-lg overflow-y-auto rounded-b-none p-6 sm:rounded-3xl" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between">
          <h2 className="font-display text-xl font-extrabold text-ink">Post a listing</h2>
          <button onClick={onClose} aria-label="Close" className="text-muted hover:text-ink"><CloseIcon /></button>
        </div>
        {done ? (
          <div className="mt-5 text-center">
            <span className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-emerald-500/15 text-emerald-600"><CheckIcon className="h-7 w-7" /></span>
            <p className="mt-3 font-display text-lg font-bold text-ink">Posted!</p>
            <p className="mt-1 text-muted">Your listing is now live on the community board.</p>
          </div>
        ) : (
          <form onSubmit={submit} className="mt-4 space-y-3">
            <div className="flex gap-2">
              {(["LOST", "FOUND"] as const).map((t) => (
                <button type="button" key={t} onClick={() => setForm({ ...form, type: t })}
                  className={`flex-1 rounded-xl border px-3 py-2.5 text-sm font-bold transition ${form.type === t ? (t === "LOST" ? "border-rose-500 bg-rose-500/10 text-rose-500" : "border-emerald-500 bg-emerald-500/10 text-emerald-600") : "border-border text-muted hover:text-ink"}`}>
                  {t === "LOST" ? "I lost something" : "I found something"}
                </button>
              ))}
            </div>
            <input required value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} placeholder="Title (e.g. Lost grey cat near Souk Street)" className="input" />
            <div className="grid grid-cols-2 gap-3">
              <select value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })} className="input">
                {CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
              </select>
              <input value={form.date} onChange={(e) => setForm({ ...form, date: e.target.value })} type="date" className="input" />
            </div>
            <input value={form.location} onChange={(e) => setForm({ ...form, location: e.target.value })} placeholder="Where? (e.g. Main Road, near the pharmacy)" className="input" />
            <textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} rows={3} placeholder="Describe it — colour, brand, distinguishing details…" className="input" />

            {user ? (
              <div>
                <label className="mb-1 block text-sm font-semibold text-ink">Photo (optional)</label>
                <ImageField value={image} onChange={setImage} label="a photo" uploadWith={userApi} aspect="aspect-[4/3]" />
              </div>
            ) : (
              <input value={image ?? ""} onChange={(e) => setImage(e.target.value || null)} placeholder="Photo URL (optional) — log in to upload a photo" className="input" />
            )}

            <div className="rounded-xl surface-2 p-3">
              <p className="text-sm font-semibold text-ink">How can people reach you?</p>
              <div className="mt-2 space-y-2">
                <input required value={form.contactName} onChange={(e) => setForm({ ...form, contactName: e.target.value })} placeholder="Your name" className="input" />
                <div className="grid grid-cols-2 gap-2">
                  <input value={form.contactPhone} onChange={(e) => setForm({ ...form, contactPhone: e.target.value })} placeholder="Phone" className="input" />
                  <input value={form.contactEmail} onChange={(e) => setForm({ ...form, contactEmail: e.target.value })} placeholder="Email" className="input" />
                </div>
                <p className="text-xs text-muted">Provide at least a phone or an email so people can contact you.</p>
              </div>
            </div>

            {error && <p className="rounded-lg bg-red-500/10 px-3 py-2 text-sm font-medium text-red-500">{error}</p>}
            <button type="submit" disabled={busy} className="btn btn-primary w-full py-3 disabled:opacity-60">{busy ? "Posting…" : "Post listing"}</button>
          </form>
        )}
      </div>
    </div>
  );
}
