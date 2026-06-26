import { useEffect, useState } from "react";
import { TrashIcon } from "../../components/icons";
import { adminApi, timeAgo } from "../../lib/api";
import type { LostFoundItem } from "../../types";

const FILTERS: { key: string; label: string }[] = [
  { key: "", label: "All" },
  { key: "LOST", label: "Lost" },
  { key: "FOUND", label: "Found" },
];

export function AdminLostFound() {
  const [items, setItems] = useState<LostFoundItem[]>([]);
  const [type, setType] = useState("");

  const load = () => {
    const p = new URLSearchParams();
    if (type) p.set("type", type);
    adminApi.get<LostFoundItem[]>(`/api/admin/lost-found?${p}`).then(setItems);
  };
  useEffect(() => { load(); /* eslint-disable-next-line */ }, [type]);

  const patch = async (id: number, data: Partial<LostFoundItem>) => { await adminApi.patch(`/api/admin/lost-found/${id}`, data); load(); };
  const remove = async (id: number) => { if (confirm("Delete this listing?")) { await adminApi.delete(`/api/admin/lost-found/${id}`); load(); } };

  return (
    <div>
      <h1 className="font-display text-3xl font-extrabold text-ink">Lost &amp; Found</h1>
      <p className="mt-1 text-muted">Resident posts. They go live automatically — hide abuse, or mark a post resolved once reunited.</p>

      <div className="mt-4 flex flex-wrap gap-2">
        {FILTERS.map((f) => <button key={f.key} onClick={() => setType(f.key)} className={`chip ${type === f.key ? "chip-active" : ""}`}>{f.label}</button>)}
      </div>

      <div className="mt-5 space-y-2">
        {items.map((it) => (
          <div key={it.id} className="card flex flex-wrap items-center gap-3 p-4">
            {it.image && <img src={it.image} alt="" className="h-14 w-14 shrink-0 rounded-lg object-cover" />}
            <div className="min-w-0 flex-1">
              <p className="font-semibold text-ink">
                <span className={`mr-2 rounded-full px-2 py-0.5 text-[10px] font-bold ${it.type === "LOST" ? "bg-rose-500/15 text-rose-500" : "bg-emerald-500/15 text-emerald-600"}`}>{it.type}</span>
                {it.title} <span className="chip !py-0 !text-[10px]">{it.category}</span>
              </p>
              <p className="truncate text-xs text-muted">
                {it.location && `${it.location} · `}{it.contactName} {it.contactPhone || it.contactEmail} · {timeAgo(it.createdAt)}
              </p>
            </div>
            <button onClick={() => patch(it.id, { status: it.status === "RESOLVED" ? "OPEN" : "RESOLVED" })} className={`chip ${it.status === "RESOLVED" ? "chip-active" : ""}`}>{it.status === "RESOLVED" ? "Resolved" : "Mark resolved"}</button>
            <button onClick={() => patch(it.id, { isPublished: !it.isPublished })} className={`chip ${it.isPublished ? "chip-active" : ""}`}>{it.isPublished ? "Visible" : "Hidden"}</button>
            <button onClick={() => remove(it.id)} className="btn btn-ghost h-9 w-9 !p-0 text-red-500"><TrashIcon className="h-4 w-4" /></button>
          </div>
        ))}
        {items.length === 0 && <div className="card p-12 text-center text-muted">No listings.</div>}
      </div>
    </div>
  );
}
