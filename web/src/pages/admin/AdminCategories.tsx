import { FormEvent, useEffect, useState } from "react";
import { TrashIcon } from "../../components/icons";
import { adminApi } from "../../lib/api";

interface Cat {
  id: number;
  name: string;
  slug: string;
  icon: string;
  color: string;
  isActive: boolean;
  count: number;
}

export function AdminCategories() {
  const [cats, setCats] = useState<Cat[]>([]);
  const [form, setForm] = useState({ name: "", icon: "🏷️", color: "#0d9488" });
  const [error, setError] = useState("");

  const load = () => adminApi.get<Cat[]>("/api/admin/categories").then(setCats);
  useEffect(() => { load(); }, []);

  async function add(e: FormEvent) {
    e.preventDefault();
    setError("");
    if (!form.name.trim()) return;
    try {
      await adminApi.post("/api/admin/categories", form);
      setForm({ name: "", icon: "🏷️", color: "#0d9488" });
      load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Couldn't add.");
    }
  }
  async function patch(id: number, body: Record<string, unknown>) {
    await adminApi.patch(`/api/admin/categories/${id}`, body);
    load();
  }
  async function del(c: Cat) {
    if (!confirm(`Delete "${c.name}"?`)) return;
    try {
      await adminApi.delete(`/api/admin/categories/${c.id}`);
      load();
    } catch (err) {
      alert(err instanceof Error ? err.message : "Couldn't delete.");
    }
  }

  return (
    <div className="grid gap-6 lg:grid-cols-[20rem_1fr]">
      <form onSubmit={add} className="card h-fit space-y-3 p-5">
        <h2 className="font-display text-lg font-bold text-ink">New category</h2>
        <input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="Name (e.g. Florists)" className="input" />
        <div className="flex gap-2">
          <input value={form.icon} onChange={(e) => setForm({ ...form, icon: e.target.value })} placeholder="🏷️" className="input w-20 text-center text-xl" />
          <input type="color" value={form.color} onChange={(e) => setForm({ ...form, color: e.target.value })} className="h-11 w-16 rounded-xl border border-border bg-surface" />
        </div>
        {error && <p className="text-sm font-medium text-red-500">{error}</p>}
        <button className="btn btn-primary w-full py-2.5">Add category</button>
      </form>

      <div>
        <h1 className="font-display text-2xl font-extrabold text-ink">Categories ({cats.length})</h1>
        <div className="mt-4 space-y-2">
          {cats.map((c) => (
            <div key={c.id} className="card flex items-center gap-3 p-3.5">
              <span className="flex h-10 w-10 items-center justify-center rounded-xl text-xl" style={{ background: `${c.color}1a` }}>{c.icon}</span>
              <input
                defaultValue={c.name}
                onBlur={(e) => e.target.value !== c.name && patch(c.id, { name: e.target.value })}
                className="min-w-0 flex-1 rounded-lg bg-transparent px-2 py-1 font-semibold text-ink hover:surface-2 focus:surface-2 focus:outline-none"
              />
              <span className="text-xs text-muted">{c.count} places</span>
              <button onClick={() => patch(c.id, { isActive: !c.isActive })} className={`chip ${c.isActive ? "chip-active" : ""}`}>{c.isActive ? "Active" : "Hidden"}</button>
              <button onClick={() => del(c)} className="btn btn-ghost h-9 w-9 !p-0 text-red-500" title="Delete"><TrashIcon className="h-4 w-4" /></button>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
