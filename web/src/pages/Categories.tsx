import { useMemo } from "react";
import { Link } from "react-router-dom";
import { useFetch } from "../lib/useFetch";
import type { Category } from "../types";

const CITY = "aley";
const GROUP_ORDER = ["Food & Drinks", "Shopping", "Health & Beauty", "Home & Auto", "Services", "Stay & Learn", "More"];

export function Categories() {
  const { data: categories, loading } = useFetch<Category[]>(`/api/categories?city=${CITY}`);

  const grouped = useMemo(() => {
    const byGroup = new Map<string, Category[]>();
    for (const c of categories ?? []) {
      const g = c.group || "More";
      if (!byGroup.has(g)) byGroup.set(g, []);
      byGroup.get(g)!.push(c);
    }
    const ordered = GROUP_ORDER.filter((g) => byGroup.has(g)).map((g) => ({ group: g, items: byGroup.get(g)! }));
    for (const [g, items] of byGroup) if (!GROUP_ORDER.includes(g)) ordered.push({ group: g, items });
    return ordered;
  }, [categories]);

  return (
    <div className="mx-auto max-w-7xl px-4 py-8">
      <h1 className="font-display text-3xl font-extrabold text-ink">Categories</h1>
      <p className="mt-1 text-muted">Everything in Aley, organised by type.</p>

      {loading ? (
        <div className="mt-8 grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
          {Array.from({ length: 12 }).map((_, i) => <div key={i} className="card h-24 animate-pulse" />)}
        </div>
      ) : (
        <div className="mt-8 space-y-10">
          {grouped.map(({ group, items }) => (
            <section key={group}>
              <div className="mb-4 flex items-center justify-between">
                <h2 className="font-display text-xl font-extrabold text-ink">{group}</h2>
                <Link to={`/explore?group=${encodeURIComponent(group)}`} className="text-sm font-semibold text-brand hover:text-brand-dark">See all →</Link>
              </div>
              <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
                {items.map((c) => (
                  <Link key={c.id} to={`/explore?category=${c.slug}`} className="card card-hover group flex items-center gap-4 p-5">
                    <span className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl text-3xl transition group-hover:scale-110" style={{ background: `${c.color}1a` }}>{c.icon}</span>
                    <div>
                      <p className="font-display font-bold text-ink">{c.name}</p>
                      <p className="text-sm text-muted">{c.count} {c.count === 1 ? "place" : "places"}</p>
                    </div>
                  </Link>
                ))}
              </div>
            </section>
          ))}
        </div>
      )}
    </div>
  );
}
