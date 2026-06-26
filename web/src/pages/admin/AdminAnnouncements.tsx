import { FormEvent, useEffect, useState } from "react";
import { ImageField } from "../../components/ImageField";
import { CloseIcon, TrashIcon } from "../../components/icons";
import { adminApi, timeAgo } from "../../lib/api";
import { NOTICE_META } from "../Announcements";
import type { Announcement } from "../../types";

const CATEGORIES = Object.keys(NOTICE_META);
const meta = (c: string) => NOTICE_META[c] ?? NOTICE_META.GENERAL;

type Draft = {
  id?: number;
  title: string; body: string; category: string; image: string | null;
  link: string; isPinned: boolean; isPublished: boolean; expiresAt: string;
};
const EMPTY: Draft = { title: "", body: "", category: "GENERAL", image: null, link: "", isPinned: false, isPublished: true, expiresAt: "" };

export function AdminAnnouncements() {
  const [items, setItems] = useState<Announcement[]>([]);
  const [editing, setEditing] = useState<Draft | null>(null);

  const load = () => adminApi.get<Announcement[]>("/api/admin/announcements").then(setItems);
  useEffect(() => { load(); }, []);

  const remove = async (id: number) => { if (confirm("Delete this notice?")) { await adminApi.delete(`/api/admin/announcements/${id}`); load(); } };
  const togglePin = async (a: Announcement) => { await adminApi.patch(`/api/admin/announcements/${a.id}`, { isPinned: !a.isPinned }); load(); };
  const togglePublish = async (a: Announcement) => { await adminApi.patch(`/api/admin/announcements/${a.id}`, { isPublished: !a.isPublished }); load(); };

  const openEdit = (a: Announcement) => setEditing({
    id: a.id, title: a.title, body: a.body, category: a.category, image: a.image,
    link: a.link, isPinned: a.isPinned, isPublished: a.isPublished,
    expiresAt: a.expiresAt ? a.expiresAt.slice(0, 10) : "",
  });

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="font-display text-3xl font-extrabold text-ink">Public Notices</h1>
          <p className="mt-1 text-muted">Official announcements shown to residents on the Public Notices page.</p>
        </div>
        <button onClick={() => setEditing({ ...EMPTY })} className="btn btn-primary px-5 py-2.5">+ New notice</button>
      </div>

      <div className="mt-5 space-y-2">
        {items.map((a) => {
          const m = meta(a.category);
          return (
            <div key={a.id} className="card flex flex-wrap items-center gap-3 p-4">
              {a.image && <img src={a.image} alt="" className="h-14 w-14 shrink-0 rounded-lg object-cover" />}
              <div className="min-w-0 flex-1">
                <p className="font-semibold text-ink"><span className={`mr-2 rounded-full px-2 py-0.5 text-[10px] font-bold ${m.cls}`}>{m.emoji} {m.label}</span>{a.title}</p>
                <p className="truncate text-xs text-muted">{timeAgo(a.publishedAt)}{a.expiresAt ? ` · expires ${new Date(a.expiresAt).toLocaleDateString()}` : ""}</p>
              </div>
              <button onClick={() => togglePin(a)} className={`chip ${a.isPinned ? "chip-active" : ""}`}>{a.isPinned ? "📌 Pinned" : "Pin"}</button>
              <button onClick={() => togglePublish(a)} className={`chip ${a.isPublished ? "chip-active" : ""}`}>{a.isPublished ? "Published" : "Hidden"}</button>
              <button onClick={() => openEdit(a)} className="btn btn-ghost px-3 py-1.5 text-sm">Edit</button>
              <button onClick={() => remove(a.id)} className="btn btn-ghost h-9 w-9 !p-0 text-red-500"><TrashIcon className="h-4 w-4" /></button>
            </div>
          );
        })}
        {items.length === 0 && <div className="card p-12 text-center text-muted">No notices yet — create the first one.</div>}
      </div>

      {editing && <EditModal draft={editing} onClose={() => setEditing(null)} onSaved={() => { setEditing(null); load(); }} />}
    </div>
  );
}

function EditModal({ draft, onClose, onSaved }: { draft: Draft; onClose: () => void; onSaved: () => void }) {
  const [form, setForm] = useState<Draft>(draft);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  async function submit(e: FormEvent) {
    e.preventDefault();
    if (busy) return;
    setBusy(true);
    setError("");
    const body = { ...form, expiresAt: form.expiresAt || null };
    try {
      if (form.id) await adminApi.patch(`/api/admin/announcements/${form.id}`, body);
      else await adminApi.post("/api/admin/announcements", body);
      onSaved();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Couldn't save.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/50 p-0 backdrop-blur-sm sm:items-center sm:p-4" onClick={onClose}>
      <div className="card pop-in max-h-[92vh] w-full max-w-lg overflow-y-auto rounded-b-none p-6 sm:rounded-3xl" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between">
          <h2 className="font-display text-xl font-extrabold text-ink">{form.id ? "Edit notice" : "New notice"}</h2>
          <button onClick={onClose} aria-label="Close" className="text-muted hover:text-ink"><CloseIcon /></button>
        </div>
        <form onSubmit={submit} className="mt-4 space-y-3">
          <input required value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} placeholder="Title" className="input" />
          <textarea value={form.body} onChange={(e) => setForm({ ...form, body: e.target.value })} rows={4} placeholder="Notice details…" className="input" />
          <div className="grid grid-cols-2 gap-3">
            <select value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })} className="input">
              {CATEGORIES.map((c) => <option key={c} value={c}>{meta(c).emoji} {meta(c).label}</option>)}
            </select>
            <label className="flex flex-col text-xs font-semibold text-muted">
              Valid until (optional)
              <input value={form.expiresAt} onChange={(e) => setForm({ ...form, expiresAt: e.target.value })} type="date" className="input !mt-1" />
            </label>
          </div>
          <input value={form.link} onChange={(e) => setForm({ ...form, link: e.target.value })} placeholder="Link (optional)" className="input" />
          <div>
            <label className="mb-1 block text-sm font-semibold text-ink">Image (optional)</label>
            <ImageField value={form.image} onChange={(url) => setForm({ ...form, image: url })} label="an image" uploadWith={adminApi} aspect="aspect-[3/1]" />
          </div>
          <div className="flex flex-wrap gap-4 pt-1">
            <label className="flex items-center gap-2 text-sm font-semibold text-ink"><input type="checkbox" checked={form.isPinned} onChange={(e) => setForm({ ...form, isPinned: e.target.checked })} /> Pin to top</label>
            <label className="flex items-center gap-2 text-sm font-semibold text-ink"><input type="checkbox" checked={form.isPublished} onChange={(e) => setForm({ ...form, isPublished: e.target.checked })} /> Published</label>
          </div>
          {error && <p className="rounded-lg bg-red-500/10 px-3 py-2 text-sm font-medium text-red-500">{error}</p>}
          <button type="submit" disabled={busy} className="btn btn-primary w-full py-3 disabled:opacity-60">{busy ? "Saving…" : "Save notice"}</button>
        </form>
      </div>
    </div>
  );
}
