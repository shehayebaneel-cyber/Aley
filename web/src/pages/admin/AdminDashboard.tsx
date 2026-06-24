import { Link } from "react-router-dom";
import { useFetch } from "../../lib/useFetch";
import type { Business } from "../../types";

interface Dash {
  stats: Record<string, number>;
  recent: Business[];
  topViewed: Business[];
}

const CARDS: { key: string; label: string; to?: string; highlight?: boolean }[] = [
  { key: "businesses", label: "Businesses", to: "/admin/businesses" },
  { key: "published", label: "Published" },
  { key: "pendingReviews", label: "Pending reviews", to: "/admin/reviews", highlight: true },
  { key: "categories", label: "Categories", to: "/admin/categories" },
  { key: "offers", label: "Offers", to: "/admin/events-offers" },
  { key: "events", label: "Events", to: "/admin/events-offers" },
  { key: "users", label: "Users", to: "/admin/users" },
  { key: "owners", label: "Owners", to: "/admin/users" },
];

export function AdminDashboard() {
  const { data } = useFetch<Dash>("/api/admin/dashboard");

  return (
    <div>
      <h1 className="font-display text-3xl font-extrabold text-ink">Dashboard</h1>
      <p className="mt-1 text-muted">Platform overview for Aley.</p>

      <div className="mt-6 grid grid-cols-2 gap-4 sm:grid-cols-4">
        {CARDS.map((c) => {
          const card = (
            <div className={`card p-4 ${c.highlight && (data?.stats[c.key] ?? 0) > 0 ? "ring-2 ring-amber-400" : ""}`}>
              <p className="text-xs text-muted">{c.label}</p>
              <p className="mt-1 font-display text-3xl font-extrabold text-ink">{data?.stats[c.key] ?? "—"}</p>
            </div>
          );
          return c.to ? <Link key={c.key} to={c.to} className="card-hover">{card}</Link> : <div key={c.key}>{card}</div>;
        })}
      </div>

      <div className="mt-8 grid gap-6 lg:grid-cols-2">
        <section className="card p-5">
          <h2 className="font-display text-lg font-bold text-ink">Recently added</h2>
          <ul className="mt-3 divide-y divide-border">
            {(data?.recent ?? []).map((b) => (
              <li key={b.id} className="flex items-center gap-3 py-2.5">
                <img src={b.logo ?? b.cover ?? ""} alt="" className="h-9 w-9 rounded-lg object-cover surface-2" />
                <Link to={`/business/${b.slug}`} className="flex-1 font-semibold text-ink hover:text-brand">{b.name}</Link>
                <span className="text-xs text-muted">{b.category.name}</span>
              </li>
            ))}
          </ul>
        </section>
        <section className="card p-5">
          <h2 className="font-display text-lg font-bold text-ink">Most viewed</h2>
          <ul className="mt-3 divide-y divide-border">
            {(data?.topViewed ?? []).map((b) => (
              <li key={b.id} className="flex items-center gap-3 py-2.5">
                <img src={b.logo ?? b.cover ?? ""} alt="" className="h-9 w-9 rounded-lg object-cover surface-2" />
                <Link to={`/business/${b.slug}`} className="flex-1 font-semibold text-ink hover:text-brand">{b.name}</Link>
                <span className="text-xs text-muted">{b.viewCount} views</span>
              </li>
            ))}
          </ul>
        </section>
      </div>
    </div>
  );
}
