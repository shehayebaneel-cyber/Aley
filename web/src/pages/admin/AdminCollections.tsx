import { FormEvent, useEffect, useState } from "react";
import { ImageField } from "../../components/ImageField";
import { TrashIcon } from "../../components/icons";
import { adminApi } from "../../lib/api";

interface ACol { id: number; slug: string; title: string; description: string; emoji: string; coverImage: string | null; isFeatured: boolean; isActive: boolean; sortOrder: number; count: number }
interface ABiz { id: number; name: string; slug: string; logo: string | null; category?: { name: string; icon: string } | null }
interface ADetail extends ACol { businesses: ABiz[] }

export function AdminCollections() {
  const [cols, setCols] = useState<ACol[]>([]);
  const [form, setForm] = useState({ title: "", description: "", emoji: "✨", coverImage: null as string | null, isFeatured: true });
  const [edit, setEdit] = useState<ADetail | null>(null);
  const [picked, setPicked] = useState<ABiz[]>([]);
  const [q, setQ] = useState("");
  const [results, setResults] = useState<ABiz[]>([]);

  const load = () => adminApi.get<ACol[]>("/api/admin/collections").then(setCols);
  useEffect(() => { load(); }, []);

  async function create(e: FormEvent) {
    e.preventDefault();
    if (!form.title.trim()) return;
    await adminApi.post("/api/admin/collections", form);
    setForm({ title: "", description: "", emoji: "✨", coverImage: null, isFeatured: true });
    load();
  }
  async function openEdit(id: number) {
    const d = await adminApi.get<ADetail>(`/api/admin/collections/${id}`);
    setEdit(d); setPicked(d.businesses); setQ(""); setResults([]);
  }
  async function saveEdit() {
    if (!edit) return;
    await adminApi.patch(`/api/admin/collections/${edit.id}`, { title: edit.title, description: edit.description, emoji: edit.emoji, coverImage: edit.coverImage, isFeatured: edit.isFeatured });
    await adminApi.put(`/api/admin/collections/${edit.id}/items`, { businessIds: picked.map((b) => b.id) });
    setEdit(null); load();
  }
  async function search(term: string) {
    setQ(term);
    if (term.trim().length < 2) return setResults([]);
    const r = await adminApi.get<ABiz[]>(`/api/admin/businesses?search=${encodeURIComponent(term.trim())}`);
    setResults((Array.isArray(r) ? r : []).slice(0, 8));
  }
  const move = (i: number, dir: -1 | 1) => { const a = [...picked]; const j = i + dir; if (j < 0 || j >= a.length) return; [a[i], a[j]] = [a[j], a[i]]; setPicked(a); };
  const reorder = async (c: ACol, dir: -1 | 1) => { await adminApi.patch(`/api/admin/collections/${c.id}`, { sortOrder: c.sortOrder + dir * 1.5 }); load(); };

  return (
    <div>
      <h1 className="font-display text-3xl font-extrabold text-ink">Discover Collections</h1>
      <p className="mt-1 text-muted">Curate themed collections of places for the homepage Discover section.</p>

      <div className="mt-6 grid gap-6 lg:grid-cols-[20rem_1fr]">
        {/* New collection */}
        <form onSubmit={create} className="card h-fit space-y-3 p-5">
          <h3 className="font-display font-bold text-ink">New collection</h3>
          <div className="flex gap-2">
            <input value={form.emoji} onChange={(e) => setForm({ ...form, emoji: e.target.value })} className="input w-16 text-center text-xl" />
            <input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} placeholder="Title (e.g. Worth the Drive)" className="input" />
          </div>
          <textarea rows={2} value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} placeholder="Short description" className="input" />
          <ImageField value={form.coverImage} uploadWith={adminApi} onChange={(coverImage) => setForm({ ...form, coverImage })} label="cover image" />
          <label className="flex items-center gap-2 text-sm text-ink"><input type="checkbox" checked={form.isFeatured} onChange={(e) => setForm({ ...form, isFeatured: e.target.checked })} /> Feature on homepage</label>
          <button className="btn btn-primary w-full py-2.5">Create</button>
        </form>

        {/* List */}
        <div className="space-y-3">
          {cols.map((c, i) => (
            <div key={c.id} className="card flex flex-wrap items-center gap-3 p-4">
              <span className="text-2xl">{c.emoji}</span>
              <div className="min-w-0 flex-1">
                <p className="font-semibold text-ink">{c.title} <span className="text-xs text-muted">· {c.count} places</span></p>
                <p className="line-clamp-1 text-sm text-muted">{c.description}</p>
              </div>
              <div className="flex gap-1">
                <button onClick={() => reorder(c, -1)} disabled={i === 0} className="btn btn-ghost h-9 w-9 !p-0 disabled:opacity-30">↑</button>
                <button onClick={() => reorder(c, 1)} disabled={i === cols.length - 1} className="btn btn-ghost h-9 w-9 !p-0 disabled:opacity-30">↓</button>
              </div>
              <button onClick={async () => { await adminApi.patch(`/api/admin/collections/${c.id}`, { isFeatured: !c.isFeatured }); load(); }} className={`chip ${c.isFeatured ? "chip-active" : ""}`}>{c.isFeatured ? "★ Featured" : "Feature"}</button>
              <button onClick={async () => { await adminApi.patch(`/api/admin/collections/${c.id}`, { isActive: !c.isActive }); load(); }} className={`chip ${c.isActive ? "chip-active" : ""}`}>{c.isActive ? "Active" : "Hidden"}</button>
              <button onClick={() => openEdit(c.id)} className="btn btn-ghost px-3 py-2 text-sm">Edit</button>
              <button onClick={async () => { if (confirm("Delete collection?")) { await adminApi.delete(`/api/admin/collections/${c.id}`); load(); } }} className="btn btn-ghost h-9 w-9 !p-0 text-red-500"><TrashIcon className="h-4 w-4" /></button>
            </div>
          ))}
        </div>
      </div>

      {/* Editor modal */}
      {edit && (
        <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/50 p-4 backdrop-blur-sm" onClick={() => setEdit(null)}>
          <div className="card my-8 w-full max-w-2xl p-6" onClick={(e) => e.stopPropagation()}>
            <h2 className="font-display text-xl font-extrabold text-ink">Edit collection</h2>
            <div className="mt-4 grid gap-3 sm:grid-cols-[5rem_1fr]">
              <input value={edit.emoji} onChange={(e) => setEdit({ ...edit, emoji: e.target.value })} className="input text-center text-xl" />
              <input value={edit.title} onChange={(e) => setEdit({ ...edit, title: e.target.value })} className="input" />
            </div>
            <textarea rows={2} value={edit.description} onChange={(e) => setEdit({ ...edit, description: e.target.value })} className="input mt-3" />
            <div className="mt-3"><ImageField value={edit.coverImage} uploadWith={adminApi} onChange={(coverImage) => setEdit({ ...edit, coverImage })} label="cover image" /></div>
            <label className="mt-3 flex items-center gap-2 text-sm text-ink"><input type="checkbox" checked={edit.isFeatured} onChange={(e) => setEdit({ ...edit, isFeatured: e.target.checked })} /> Feature on homepage</label>

            <h3 className="mt-5 font-display font-bold text-ink">Places ({picked.length})</h3>
            <div className="mt-2 space-y-1.5">
              {picked.map((b, i) => (
                <div key={b.id} className="flex items-center gap-2 rounded-lg surface-2 px-3 py-2 text-sm">
                  <span className="text-muted">{i + 1}.</span>
                  {b.logo && <img src={b.logo} alt="" className="h-7 w-7 rounded object-cover" />}
                  <span className="flex-1 truncate text-ink">{b.name} <span className="text-xs text-muted">{b.category?.icon} {b.category?.name}</span></span>
                  <button onClick={() => move(i, -1)} className="text-muted">↑</button>
                  <button onClick={() => move(i, 1)} className="text-muted">↓</button>
                  <button onClick={() => setPicked(picked.filter((x) => x.id !== b.id))} className="text-xs font-semibold text-red-500">Remove</button>
                </div>
              ))}
            </div>

            <div className="mt-3">
              <input value={q} onChange={(e) => search(e.target.value)} placeholder="Search businesses to add…" className="input" />
              {results.length > 0 && (
                <div className="mt-2 max-h-48 space-y-1 overflow-y-auto rounded-xl border border-border p-2">
                  {results.map((b) => (
                    <button key={b.id} disabled={picked.some((p) => p.id === b.id)} onClick={() => { setPicked([...picked, b]); setResults(results.filter((r) => r.id !== b.id)); }} className="flex w-full items-center gap-2 rounded-lg px-2 py-1.5 text-left text-sm hover:surface-2 disabled:opacity-40">
                      {b.logo && <img src={b.logo} alt="" className="h-6 w-6 rounded object-cover" />}
                      <span className="flex-1 truncate text-ink">{b.name}</span>
                      <span className="text-xs text-muted">{b.category?.name}</span>
                    </button>
                  ))}
                </div>
              )}
            </div>

            <div className="mt-5 flex justify-end gap-2">
              <button onClick={() => setEdit(null)} className="btn btn-ghost px-4 py-2">Cancel</button>
              <button onClick={saveEdit} className="btn btn-primary px-5 py-2">Save collection</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
