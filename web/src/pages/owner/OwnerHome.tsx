import { FormEvent, useState } from "react";
import { Link } from "react-router-dom";
import { ChevronRight, StarIcon } from "../../components/icons";
import { useOwnerAuth } from "../../context/OwnerAuthContext";
import { ownerApi } from "../../lib/api";
import { useFetch } from "../../lib/useFetch";
import type { Category } from "../../types";

export function OwnerHome() {
  const { owner, businesses, refresh } = useOwnerAuth();
  const { data: categories } = useFetch<Category[]>("/api/categories?city=aley");
  const [creating, setCreating] = useState(false);
  const [form, setForm] = useState({ name: "", tagline: "", categoryId: 0 });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [submitted, setSubmitted] = useState(false);

  async function create(e: FormEvent) {
    e.preventDefault();
    if (busy) return;
    if (!form.name.trim() || !form.categoryId) return setError("Name and category are required.");
    setBusy(true);
    setError("");
    try {
      await ownerApi.post("/api/owner/businesses", form);
      await refresh();
      setCreating(false);
      setForm({ name: "", tagline: "", categoryId: 0 });
      setSubmitted(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Couldn't create.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div>
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="font-display text-3xl font-extrabold text-ink">Hi, {owner?.name?.split(" ")[0]} 👋</h1>
          <p className="mt-1 text-muted">Manage your {businesses.length === 1 ? "business" : "businesses"} on Aley.</p>
        </div>
        <button onClick={() => setCreating((c) => !c)} className="btn btn-primary px-5 py-2.5">+ Add a business</button>
      </div>

      {submitted && (
        <div className="mt-5 flex items-start gap-3 rounded-2xl border border-amber-400/40 bg-amber-400/10 p-4">
          <span className="text-xl">🕓</span>
          <div>
            <p className="font-semibold text-ink">Submitted for review</p>
            <p className="text-sm text-muted">Thanks! Our team will check your business and approve it before it goes public. You can keep editing it in the meantime.</p>
          </div>
          <button onClick={() => setSubmitted(false)} className="ml-auto text-sm font-semibold text-muted hover:text-ink">Dismiss</button>
        </div>
      )}

      {creating && (
        <form onSubmit={create} className="card mt-5 space-y-3 p-5">
          <h2 className="font-display text-lg font-bold text-ink">New business</h2>
          <input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="Business name" className="input" />
          <input value={form.tagline} onChange={(e) => setForm({ ...form, tagline: e.target.value })} placeholder="Short tagline (optional)" className="input" />
          <select value={form.categoryId} onChange={(e) => setForm({ ...form, categoryId: Number(e.target.value) })} className="input">
            <option value={0}>Choose a category…</option>
            {(categories ?? []).map((c) => <option key={c.id} value={c.id}>{c.icon} {c.name}</option>)}
          </select>
          {error && <p className="text-sm font-medium text-red-500">{error}</p>}
          <div className="flex gap-2">
            <button type="submit" disabled={busy} className="btn btn-primary px-5 py-2.5 disabled:opacity-60">{busy ? "Creating…" : "Create"}</button>
            <button type="button" onClick={() => setCreating(false)} className="btn btn-ghost px-5 py-2.5">Cancel</button>
          </div>
        </form>
      )}

      <div className="mt-6 grid gap-4 sm:grid-cols-2">
        {businesses.length === 0 && !creating && (
          <div className="card col-span-full p-12 text-center">
            <p className="text-lg font-semibold text-ink">No businesses yet.</p>
            <p className="mt-1 text-muted">Add your first business to get started.</p>
            <button onClick={() => setCreating(true)} className="btn btn-primary mt-4 px-5 py-2.5">+ Add a business</button>
          </div>
        )}
        {businesses.map((b) => (
          <Link key={b.id} to={`/owner/b/${b.id}`} className="card card-hover flex items-center gap-4 p-4">
            <img src={b.logo ?? b.cover ?? ""} alt="" className="h-16 w-16 shrink-0 rounded-xl object-cover surface-2" />
            <div className="min-w-0 flex-1">
              <p className="flex items-center gap-1.5 truncate font-display font-bold text-ink">
                {b.name}
                {b.reviewStatus === "PENDING" && <span className="rounded-full bg-amber-400/20 px-2 py-0.5 text-xs font-bold text-amber-600">Pending review</span>}
                {b.reviewStatus === "REJECTED" && <span className="rounded-full bg-red-500/15 px-2 py-0.5 text-xs font-bold text-red-500">Not approved</span>}
              </p>
              <p className="text-sm text-muted">{b.category?.icon} {b.category?.name}</p>
              <div className="mt-1 flex items-center gap-3 text-xs text-muted">
                <span className="inline-flex items-center gap-1"><StarIcon className="h-3.5 w-3.5 text-amber-400" /> {b.rating > 0 ? b.rating.toFixed(1) : "New"}</span>
                <span>{b._count?.reviews ?? 0} reviews</span>
                <span>{b._count?.offers ?? 0} offers</span>
                <span>{b.viewCount} views</span>
              </div>
            </div>
            <ChevronRight className="h-5 w-5 shrink-0 text-muted" />
          </Link>
        ))}
      </div>
    </div>
  );
}
