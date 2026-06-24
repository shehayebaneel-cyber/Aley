import { Link } from "react-router-dom";
import { TagIcon } from "../components/icons";
import { useFetch } from "../lib/useFetch";
import type { Offer } from "../types";

const CITY = "aley";

export function Offers() {
  const { data: offers, loading } = useFetch<Offer[]>(`/api/offers?city=${CITY}`);

  return (
    <div className="mx-auto max-w-7xl px-4 py-8">
      <h1 className="font-display text-3xl font-extrabold text-ink">Offers & deals</h1>
      <p className="mt-1 text-muted">Promotions happening across Aley right now.</p>

      <div className="mt-6 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
        {loading && Array.from({ length: 6 }).map((_, i) => <div key={i} className="card h-64 animate-pulse" />)}
        {(offers ?? []).map((o) => (
          <Link key={o.id} to={o.business ? `/business/${o.business.slug}` : "/offers"} className="card card-hover group overflow-hidden">
            <div className="relative h-40 overflow-hidden bg-surface-2">
              {o.image && <img src={o.image} alt="" loading="lazy" className="h-full w-full object-cover transition group-hover:scale-105" />}
              <span className="absolute left-3 top-3 inline-flex items-center gap-1 rounded-full bg-accent px-2.5 py-1 text-xs font-bold text-white">
                <TagIcon className="h-3.5 w-3.5" /> {o.type.replace("_", " ")}
              </span>
            </div>
            <div className="p-5">
              <h3 className="font-display text-lg font-bold text-ink">{o.title}</h3>
              <p className="mt-1 text-sm text-muted">{o.description}</p>
              {o.business && <p className="mt-3 text-sm font-semibold text-brand">{o.business.name} →</p>}
            </div>
          </Link>
        ))}
      </div>

      {!loading && (offers ?? []).length === 0 && (
        <div className="card mt-6 p-16 text-center"><p className="text-lg font-semibold text-ink">No active offers.</p><p className="mt-1 text-muted">Check back soon for deals!</p></div>
      )}
    </div>
  );
}
