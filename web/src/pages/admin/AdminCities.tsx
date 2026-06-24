import { FormEvent, useEffect, useState } from "react";
import { adminApi } from "../../lib/api";

interface ACity { id: number; name: string; nameAr: string; slug: string; tagline: string; isActive: boolean; count: number }

export function AdminCities() {
  const [cities, setCities] = useState<ACity[]>([]);
  const [form, setForm] = useState({ name: "", nameAr: "", tagline: "" });

  const load = () => adminApi.get<ACity[]>("/api/admin/cities").then(setCities);
  useEffect(() => { load(); }, []);

  async function add(e: FormEvent) {
    e.preventDefault();
    if (!form.name.trim()) return;
    await adminApi.post("/api/admin/cities", { ...form, isActive: false });
    setForm({ name: "", nameAr: "", tagline: "" });
    load();
  }

  return (
    <div>
      <h1 className="font-display text-3xl font-extrabold text-ink">Cities</h1>
      <p className="mt-1 text-muted">The platform is multi-city. Activate a city to make it public; add new ones as you expand across Lebanon.</p>

      <div className="mt-5 grid gap-6 lg:grid-cols-[1fr_20rem]">
        <div className="space-y-2">
          {cities.map((c) => (
            <div key={c.id} className="card flex flex-wrap items-center gap-3 p-4">
              <div className="flex-1">
                <p className="font-semibold text-ink">{c.name} {c.nameAr && <span className="text-muted">· {c.nameAr}</span>}</p>
                <p className="text-xs text-muted">/{c.slug} · {c.count} businesses · {c.tagline}</p>
              </div>
              <button onClick={async () => { await adminApi.patch(`/api/admin/cities/${c.id}`, { isActive: !c.isActive }); load(); }} className={`chip ${c.isActive ? "chip-active" : ""}`}>
                {c.isActive ? "Active" : "Inactive"}
              </button>
            </div>
          ))}
        </div>
        <form onSubmit={add} className="card h-fit space-y-3 p-5">
          <h2 className="font-display text-lg font-bold text-ink">Add a city</h2>
          <input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="Name (e.g. Batroun)" className="input" />
          <input value={form.nameAr} onChange={(e) => setForm({ ...form, nameAr: e.target.value })} placeholder="Arabic name (optional)" className="input" />
          <input value={form.tagline} onChange={(e) => setForm({ ...form, tagline: e.target.value })} placeholder="Tagline (optional)" className="input" />
          <button className="btn btn-primary w-full py-2.5">Add city</button>
          <p className="text-xs text-muted">New cities start inactive until you're ready to launch them.</p>
        </form>
      </div>
    </div>
  );
}
