import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { VerifiedIcon } from "../../components/icons";
import { adminApi } from "../../lib/api";
import type { Business, Category } from "../../types";

type Row = Business & { owner?: { name: string; email: string } | null };

export function AdminBusinesses() {
  const [rows, setRows] = useState<Row[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("");

  const load = () => {
    const p = new URLSearchParams();
    if (search) p.set("search", search);
    if (status) p.set("status", status);
    adminApi.get<Row[]>(`/api/admin/businesses?${p}`).then(setRows);
  };
  useEffect(() => {
    adminApi.get<Category[]>("/api/admin/categories").then(setCategories);
  }, []);
  useEffect(() => {
    const t = setTimeout(load, 250);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [search, status]);

  const patch = async (id: number, body: Record<string, unknown>) => {
    await adminApi.patch(`/api/admin/businesses/${id}`, body);
    load();
  };
  const del = async (b: Row) => {
    if (!confirm(`Delete "${b.name}"? This removes its reviews, offers and events too.`)) return;
    await adminApi.delete(`/api/admin/businesses/${b.id}`);
    load();
  };

  const FILTERS = [
    { key: "", label: "All" },
    { key: "published", label: "Published" },
    { key: "unpublished", label: "Hidden" },
    { key: "featured", label: "Featured" },
  ];

  return (
    <div>
      <h1 className="font-display text-3xl font-extrabold text-ink">Businesses</h1>
      <div className="mt-4 flex flex-wrap items-center gap-2">
        {FILTERS.map((f) => (
          <button key={f.key} onClick={() => setStatus(f.key)} className={`chip ${status === f.key ? "chip-active" : ""}`}>{f.label}</button>
        ))}
        <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search…" className="input ml-auto max-w-xs" />
      </div>

      <div className="mt-5 space-y-3">
        {rows.map((b) => (
          <div key={b.id} className="card flex flex-wrap items-center gap-4 p-4">
            <img src={b.logo ?? b.cover ?? ""} alt="" className="h-12 w-12 shrink-0 rounded-xl object-cover surface-2" />
            <div className="min-w-0 flex-1">
              <p className="flex items-center gap-1 font-semibold text-ink">
                <Link to={`/business/${b.slug}`} className="hover:text-brand">{b.name}</Link>
                {b.isVerified && <VerifiedIcon className="h-4 w-4 text-brand" />}
              </p>
              <p className="text-xs text-muted">{b.category.icon} {b.category.name} · {b.owner ? `owner: ${b.owner.name}` : "unclaimed"} · {b.reviewCount} reviews</p>
            </div>
            <select
              value={b.category.id}
              onChange={(e) => patch(b.id, { categoryId: Number(e.target.value) })}
              className="chip cursor-pointer"
              title="Category"
            >
              {categories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
            <div className="flex flex-wrap gap-2">
              <Toggle on={!!b.isPublished} label="Published" onClick={() => patch(b.id, { isPublished: !b.isPublished })} />
              <Toggle on={b.isFeatured} label="Featured" onClick={() => patch(b.id, { isFeatured: !b.isFeatured })} />
              <Toggle on={b.isVerified} label="Verified" onClick={() => patch(b.id, { isVerified: !b.isVerified })} />
              <button onClick={() => del(b)} className="chip !border-red-300 text-red-500 hover:!bg-red-500 hover:text-white">Delete</button>
            </div>
          </div>
        ))}
        {rows.length === 0 && <div className="card p-10 text-center text-muted">No businesses match.</div>}
      </div>
    </div>
  );
}

function Toggle({ on, label, onClick }: { on: boolean; label: string; onClick: () => void }) {
  return <button onClick={onClick} className={`chip ${on ? "chip-active" : ""}`}>{label}</button>;
}
