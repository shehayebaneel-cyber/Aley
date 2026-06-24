import { Link } from "react-router-dom";
import { useFetch } from "../lib/useFetch";
import type { Category } from "../types";

const CITY = "aley";

export function Categories() {
  const { data: categories, loading } = useFetch<Category[]>(`/api/categories?city=${CITY}`);

  return (
    <div className="mx-auto max-w-7xl px-4 py-8">
      <h1 className="font-display text-3xl font-extrabold text-ink">Categories</h1>
      <p className="mt-1 text-muted">Everything in Aley, organised by type.</p>

      <div className="mt-8 grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
        {loading
          ? Array.from({ length: 12 }).map((_, i) => <div key={i} className="card h-24 animate-pulse" />)
          : (categories ?? []).map((c) => (
              <Link key={c.id} to={`/explore?category=${c.slug}`} className="card card-hover group flex items-center gap-4 p-5">
                <span className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl text-3xl transition group-hover:scale-110" style={{ background: `${c.color}1a` }}>
                  {c.icon}
                </span>
                <div>
                  <p className="font-display font-bold text-ink">{c.name}</p>
                  <p className="text-sm text-muted">{c.count} {c.count === 1 ? "place" : "places"}</p>
                </div>
              </Link>
            ))}
      </div>
    </div>
  );
}
