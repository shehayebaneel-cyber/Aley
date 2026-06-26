import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { StatCard } from "../../components/Charts";
import { adminApi, currency } from "../../lib/api";

interface Row {
  id: number; name: string; slug: string; category: string; isPublished: boolean;
  rating: number; reviewCount: number; views: number; prevViews: number;
  interactions: number; bookings: number; orders: number; revenue: number; growth: number;
}
interface Metric { value: number; prev: number; delta: number }
interface Data {
  totals: { profileViews: Metric; searchAppearances: Metric; interactions: Metric; businesses: number; active: number; revenue: number };
  leaderboards: Record<string, Row[]>;
  rows: Row[];
}

const PERIODS: { key: string; label: string }[] = [
  { key: "today", label: "Today" }, { key: "yesterday", label: "Yesterday" }, { key: "7d", label: "7 days" },
  { key: "30d", label: "30 days" }, { key: "90d", label: "90 days" }, { key: "year", label: "This year" },
];
const SORTS: { key: keyof Row; label: string }[] = [
  { key: "views", label: "Profile views" }, { key: "interactions", label: "Interactions" },
  { key: "bookings", label: "Bookings" }, { key: "orders", label: "Orders" },
  { key: "revenue", label: "Revenue" }, { key: "rating", label: "Rating" }, { key: "growth", label: "Growth" },
];
const BOARDS: { key: string; label: string; metric: keyof Row; fmt?: (r: Row) => string }[] = [
  { key: "mostViewed", label: "Most viewed", metric: "views" },
  { key: "mostContacted", label: "Most contacted", metric: "interactions" },
  { key: "mostBooked", label: "Most booked", metric: "bookings" },
  { key: "mostOrdered", label: "Most ordered", metric: "orders" },
  { key: "highestRated", label: "Highest rated", metric: "rating", fmt: (r) => `${r.rating.toFixed(1)}★ (${r.reviewCount})` },
  { key: "fastestGrowing", label: "Fastest growing", metric: "growth", fmt: (r) => `+${r.growth}%` },
];

export function AdminAnalytics() {
  const [period, setPeriod] = useState("30d");
  const [data, setData] = useState<Data | null>(null);
  const [sort, setSort] = useState<keyof Row>("views");
  const [inactiveOnly, setInactiveOnly] = useState(false);
  const [q, setQ] = useState("");

  useEffect(() => { adminApi.get<Data>(`/api/admin/analytics?period=${period}`).then(setData); }, [period]);

  const rows = useMemo(() => {
    if (!data) return [];
    let r = [...data.rows];
    if (inactiveOnly) r = r.filter((x) => x.views === 0 && x.interactions === 0);
    if (q.trim()) r = r.filter((x) => x.name.toLowerCase().includes(q.toLowerCase()) || x.category.toLowerCase().includes(q.toLowerCase()));
    return r.sort((a, b) => (b[sort] as number) - (a[sort] as number));
  }, [data, sort, inactiveOnly, q]);

  function exportCsv() {
    const head = ["Business", "Category", "Published", "Views", "Interactions", "Bookings", "Orders", "Revenue", "Rating", "Reviews", "Growth%"];
    const lines = rows.map((r) => [r.name, r.category, r.isPublished ? "yes" : "no", r.views, r.interactions, r.bookings, r.orders, r.revenue, r.rating, r.reviewCount, r.growth]
      .map((v) => `"${String(v).replace(/"/g, '""')}"`).join(","));
    const csv = [head.join(","), ...lines].join("\n");
    const url = URL.createObjectURL(new Blob([csv], { type: "text/csv" }));
    const a = document.createElement("a");
    a.href = url; a.download = `aley-analytics-${period}.csv`; a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="font-display text-3xl font-extrabold text-ink">Analytics</h1>
        <button onClick={exportCsv} className="btn btn-ghost px-4 py-2 text-sm">⬇ Export CSV</button>
      </div>
      <div className="mt-4 flex flex-wrap gap-2">
        {PERIODS.map((p) => <button key={p.key} onClick={() => setPeriod(p.key)} className={`chip ${period === p.key ? "chip-active" : ""}`}>{p.label}</button>)}
      </div>

      {!data ? <div className="card mt-6 h-40 animate-pulse" /> : (
        <>
          {/* Platform totals */}
          <div className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
            <StatCard label="Profile views" value={data.totals.profileViews.value} delta={data.totals.profileViews.delta} />
            <StatCard label="Search appearances" value={data.totals.searchAppearances.value} delta={data.totals.searchAppearances.delta} />
            <StatCard label="Interactions" value={data.totals.interactions.value} delta={data.totals.interactions.delta} />
            <StatCard label="Active businesses" value={data.totals.active} hint={`of ${data.totals.businesses}`} />
            <StatCard label="Order revenue" value={currency(data.totals.revenue)} />
            <StatCard label="Listed businesses" value={data.totals.businesses} />
          </div>

          {/* Leaderboards */}
          <h2 className="mt-8 font-display text-xl font-extrabold text-ink">Leaderboards</h2>
          <div className="mt-3 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {BOARDS.map((board) => (
              <div key={board.key} className="card p-4">
                <h3 className="font-display font-bold text-ink">{board.label}</h3>
                <ol className="mt-2 space-y-1.5 text-sm">
                  {(data.leaderboards[board.key] ?? []).map((r, i) => (
                    <li key={r.id} className="flex items-center gap-2">
                      <span className="w-5 text-xs font-bold text-muted">{i + 1}.</span>
                      <Link to={`/business/${r.slug}`} target="_blank" className="min-w-0 flex-1 truncate text-ink hover:text-brand">{r.name}</Link>
                      <span className="font-semibold text-brand">{board.fmt ? board.fmt(r) : (r[board.metric] as number)}</span>
                    </li>
                  ))}
                  {!(data.leaderboards[board.key] ?? []).length && <li className="text-xs text-muted">No data yet.</li>}
                </ol>
              </div>
            ))}
          </div>

          {/* Sortable table */}
          <div className="mt-8 flex flex-wrap items-center gap-2">
            <h2 className="font-display text-xl font-extrabold text-ink">All businesses</h2>
            <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search…" className="input !w-48 !py-1.5 text-sm" />
            <select value={sort} onChange={(e) => setSort(e.target.value as keyof Row)} className="input !w-auto !py-1.5 text-sm">
              {SORTS.map((s) => <option key={s.key} value={s.key}>Sort: {s.label}</option>)}
            </select>
            <label className="flex items-center gap-1.5 text-sm text-muted"><input type="checkbox" checked={inactiveOnly} onChange={(e) => setInactiveOnly(e.target.checked)} /> Inactive only</label>
            <span className="ml-auto text-xs text-muted">{rows.length} businesses</span>
          </div>
          <div className="card mt-3 overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="surface-2 text-left text-xs uppercase text-muted">
                <tr><th className="px-3 py-2">Business</th><th className="px-3 py-2">Views</th><th className="px-3 py-2">Interactions</th><th className="px-3 py-2">Bookings</th><th className="px-3 py-2">Orders</th><th className="px-3 py-2">Revenue</th><th className="px-3 py-2">Rating</th><th className="px-3 py-2">Growth</th></tr>
              </thead>
              <tbody className="divide-y divide-border">
                {rows.slice(0, 200).map((r) => (
                  <tr key={r.id}>
                    <td className="px-3 py-2"><Link to={`/business/${r.slug}`} target="_blank" className="font-semibold text-ink hover:text-brand">{r.name}</Link><span className="block text-[11px] text-muted">{r.category}{!r.isPublished ? " · hidden" : ""}</span></td>
                    <td className="px-3 py-2 text-muted">{r.views}</td>
                    <td className="px-3 py-2 text-muted">{r.interactions}</td>
                    <td className="px-3 py-2 text-muted">{r.bookings}</td>
                    <td className="px-3 py-2 text-muted">{r.orders}</td>
                    <td className="px-3 py-2 text-muted">{currency(r.revenue)}</td>
                    <td className="px-3 py-2 text-muted">{r.rating > 0 ? r.rating.toFixed(1) : "—"}</td>
                    <td className={`px-3 py-2 font-semibold ${r.growth >= 0 ? "text-emerald-500" : "text-rose-500"}`}>{r.growth > 0 ? "+" : ""}{r.growth}%</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}
    </div>
  );
}
