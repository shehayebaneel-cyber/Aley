import { FormEvent, useEffect, useMemo, useState } from "react";
import { TrashIcon } from "../../components/icons";
import { adminApi } from "../../lib/api";

interface Cat {
  id: number;
  name: string;
  slug: string;
  group: string;
  icon: string;
  color: string;
  isActive: boolean;
  count: number;
}

const GROUP_ORDER = ["Food & Drinks", "Shopping", "Health & Beauty", "Automotive", "Home & Living", "Professional Services", "Stay & Tourism", "Education", "Entertainment", "Sports & Recreation", "Community", "Essential Services", "More"];

export function AdminCategories() {
  const [cats, setCats] = useState<Cat[]>([]);
  const [form, setForm] = useState({ name: "", group: "", icon: "🏷️", color: "#0d9488" });
  const [error, setError] = useState("");

  const load = () => adminApi.get<Cat[]>("/api/admin/categories").then(setCats);
  useEffect(() => { load(); }, []);

  const groups = useMemo(() => {
    const set = new Set(cats.map((c) => c.group || "More"));
    const ordered = GROUP_ORDER.filter((g) => set.has(g));
    for (const g of set) if (!GROUP_ORDER.includes(g)) ordered.push(g);
    return ordered;
  }, [cats]);

  async function add(e: FormEvent) {
    e.preventDefault();
    setError("");
    if (!form.name.trim()) return;
    try {
      await adminApi.post("/api/admin/categories", { ...form, group: form.group.trim() || "More" });
      setForm({ name: "", group: "", icon: "🏷️", color: "#0d9488" });
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
    try { await adminApi.delete(`/api/admin/categories/${c.id}`); load(); }
    catch (err) { alert(err instanceof Error ? err.message : "Couldn't delete."); }
  }
  async function renameGroup(from: string) {
    const to = prompt(`Rename group "${from}" to:`, from);
    if (!to || to.trim() === from) return;
    await adminApi.post("/api/admin/categories/rename-group", { from, to: to.trim() });
    load();
  }

  return (
    <div className="grid gap-6 lg:grid-cols-[20rem_1fr]">
      <form onSubmit={add} className="card h-fit space-y-3 p-5">
        <h2 className="font-display text-lg font-bold text-ink">New category</h2>
        <input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="Name (e.g. Florists)" className="input" />
        <input list="cat-groups" value={form.group} onChange={(e) => setForm({ ...form, group: e.target.value })} placeholder="Group (e.g. Shopping)" className="input" />
        <div className="flex gap-2">
          <input value={form.icon} onChange={(e) => setForm({ ...form, icon: e.target.value })} placeholder="🏷️" className="input w-20 text-center text-xl" />
          <input type="color" value={form.color} onChange={(e) => setForm({ ...form, color: e.target.value })} className="h-11 w-16 rounded-xl border border-border bg-surface" />
        </div>
        {error && <p className="text-sm font-medium text-red-500">{error}</p>}
        <button className="btn btn-primary w-full py-2.5">Add category</button>
        <p className="text-xs text-muted">Pick an existing group or type a new one. Change a category's group anytime in the list.</p>
      </form>

      <div>
        <h1 className="font-display text-2xl font-extrabold text-ink">Categories ({cats.length})</h1>
        <div className="mt-4 space-y-6">
          {groups.map((g) => (
            <section key={g}>
              <div className="mb-2 flex items-center gap-2">
                <h3 className="text-xs font-bold uppercase tracking-wide text-muted">{g}</h3>
                <button onClick={() => renameGroup(g)} className="text-xs font-semibold text-brand hover:underline">rename</button>
              </div>
              <div className="space-y-2">
                {cats.filter((c) => (c.group || "More") === g).map((c) => (
                  <div key={c.id} className="card flex flex-wrap items-center gap-3 p-3.5">
                    <span className="flex h-10 w-10 items-center justify-center rounded-xl text-xl" style={{ background: `${c.color}1a` }}>{c.icon}</span>
                    <input defaultValue={c.name} onBlur={(e) => e.target.value !== c.name && patch(c.id, { name: e.target.value })} className="min-w-0 flex-1 rounded-lg bg-transparent px-2 py-1 font-semibold text-ink hover:surface-2 focus:surface-2 focus:outline-none" />
                    <input list="cat-groups" defaultValue={c.group} onBlur={(e) => e.target.value.trim() && e.target.value !== c.group && patch(c.id, { group: e.target.value.trim() })} title="Group" className="w-36 rounded-lg border border-border bg-surface px-2 py-1 text-sm text-muted" />
                    <span className="text-xs text-muted">{c.count} places</span>
                    <button onClick={() => patch(c.id, { isActive: !c.isActive })} className={`chip ${c.isActive ? "chip-active" : ""}`}>{c.isActive ? "Active" : "Hidden"}</button>
                    <button onClick={() => del(c)} className="btn btn-ghost h-9 w-9 !p-0 text-red-500" title="Delete"><TrashIcon className="h-4 w-4" /></button>
                  </div>
                ))}
              </div>
            </section>
          ))}
        </div>
      </div>

      <datalist id="cat-groups">{groups.map((g) => <option key={g} value={g} />)}</datalist>
    </div>
  );
}
