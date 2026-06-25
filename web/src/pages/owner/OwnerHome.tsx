import { FormEvent, useEffect, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { ChevronRight, CloseIcon, SearchIcon, StarIcon } from "../../components/icons";
import { useOwnerAuth } from "../../context/OwnerAuthContext";
import { ownerApi } from "../../lib/api";
import { useFetch } from "../../lib/useFetch";
import type { Category, ClaimableBusiness } from "../../types";

export function OwnerHome() {
  const { owner, businesses, refresh } = useOwnerAuth();
  const { data: categories } = useFetch<Category[]>("/api/categories?city=aley");
  const [creating, setCreating] = useState(false);
  const [form, setForm] = useState({ name: "", tagline: "", categoryId: 0 });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [submitted, setSubmitted] = useState(false);
  const [claiming, setClaiming] = useState(false);
  const [params, setParams] = useSearchParams();

  // Deep-linked from a public business page: open the claim dialog straight away.
  useEffect(() => {
    if (params.get("claim")) setClaiming(true);
  }, [params]);

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
        <div className="flex flex-wrap gap-2">
          <button onClick={() => setClaiming(true)} className="btn btn-ghost px-5 py-2.5">Claim an existing business</button>
          <button onClick={() => setCreating((c) => !c)} className="btn btn-primary px-5 py-2.5">+ Add a business</button>
        </div>
      </div>

      {claiming && (
        <ClaimModal
          initialId={params.get("claim")}
          initialName={params.get("claimName") ?? ""}
          onClose={() => { setClaiming(false); if (params.get("claim")) { params.delete("claim"); params.delete("claimName"); setParams(params, { replace: true }); } }}
        />
      )}

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

function ClaimModal({ initialId, initialName, onClose }: { initialId: string | null; initialName: string; onClose: () => void }) {
  const { refresh } = useOwnerAuth();
  const [q, setQ] = useState(initialName);
  const [results, setResults] = useState<ClaimableBusiness[]>([]);
  const [selected, setSelected] = useState<ClaimableBusiness | null>(null);
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState("");

  // Search unclaimed listings as the owner types.
  useEffect(() => {
    let alive = true;
    const t = setTimeout(() => {
      ownerApi.get<ClaimableBusiness[]>(`/api/owner/claimable?q=${encodeURIComponent(q.trim())}`)
        .then((r) => { if (alive) { setResults(r); if (initialId) { const m = r.find((b) => String(b.id) === initialId); if (m) setSelected(m); } } })
        .catch(() => {});
    }, 250);
    return () => { alive = false; clearTimeout(t); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [q]);

  async function submit() {
    if (!selected || busy) return;
    setBusy(true);
    setError("");
    try {
      await ownerApi.post(`/api/owner/businesses/${selected.id}/claim`, { message });
      await refresh();
      setDone(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Couldn't submit the claim.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/50 p-0 backdrop-blur-sm sm:items-center sm:p-4" onClick={onClose}>
      <div className="card pop-in max-h-[92vh] w-full max-w-lg overflow-y-auto rounded-b-none p-6 sm:rounded-3xl" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between">
          <h2 className="font-display text-xl font-extrabold text-ink">Claim your business</h2>
          <button onClick={onClose} aria-label="Close" className="text-muted hover:text-ink"><CloseIcon /></button>
        </div>

        {done ? (
          <div className="mt-5 text-center">
            <span className="text-4xl">🤝</span>
            <p className="mt-3 font-display text-lg font-bold text-ink">Claim submitted</p>
            <p className="mt-1 text-muted">We'll verify it and assign <span className="font-semibold text-ink">{selected?.name}</span> to your account. You'll see it here once approved.</p>
            <button onClick={onClose} className="btn btn-primary mt-5 px-6 py-2.5">Done</button>
          </div>
        ) : (
          <>
            <p className="mt-1 text-sm text-muted">Find your existing listing on Aley and request ownership. An admin verifies claims before handing over the page.</p>
            <div className="relative mt-4">
              <SearchIcon className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted" />
              <input autoFocus value={q} onChange={(e) => { setQ(e.target.value); setSelected(null); }} placeholder="Search your business name…" className="input !pl-9" />
            </div>

            {!selected && (
              <div className="mt-3 max-h-60 space-y-1.5 overflow-y-auto">
                {results.map((b) => (
                  <button key={b.id} onClick={() => setSelected(b)} className="flex w-full items-center gap-3 rounded-xl p-2 text-left hover:surface-2">
                    <img src={b.logo ?? b.cover ?? ""} alt="" className="h-10 w-10 shrink-0 rounded-lg object-cover surface-2" />
                    <div className="min-w-0">
                      <p className="truncate font-semibold text-ink">{b.name}</p>
                      <p className="truncate text-xs text-muted">{b.category?.name}{b.address ? ` · ${b.address}` : ""}</p>
                    </div>
                  </button>
                ))}
                {q.trim() && results.length === 0 && <p className="px-2 py-3 text-sm text-muted">No unclaimed business matches. It may already be claimed — or add it as a new business instead.</p>}
              </div>
            )}

            {selected && (
              <div className="mt-4">
                <div className="flex items-center gap-3 rounded-xl border border-border p-3">
                  <img src={selected.logo ?? selected.cover ?? ""} alt="" className="h-10 w-10 shrink-0 rounded-lg object-cover surface-2" />
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-semibold text-ink">{selected.name}</p>
                    <p className="truncate text-xs text-muted">{selected.category?.name}</p>
                  </div>
                  <button onClick={() => setSelected(null)} className="text-sm font-semibold text-brand">Change</button>
                </div>
                <textarea value={message} onChange={(e) => setMessage(e.target.value)} rows={3} placeholder="Anything to help us verify you own this business? (optional)" className="input mt-3" />
                {error && <p className="mt-2 rounded-lg bg-red-500/10 px-3 py-2 text-sm font-medium text-red-500">{error}</p>}
                <button onClick={submit} disabled={busy} className="btn btn-primary mt-3 w-full py-3 disabled:opacity-60">{busy ? "Submitting…" : "Submit claim"}</button>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
