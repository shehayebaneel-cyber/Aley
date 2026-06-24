import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { useUserAuth } from "../context/UserAuthContext";
import { currency, DELIVERY_STATUS, formatEventDate, userApi } from "../lib/api";
import type { MarketOrder } from "../types";

export function MyOrders() {
  const { user, loading, openAuth } = useUserAuth();
  const [orders, setOrders] = useState<MarketOrder[] | null>(null);

  useEffect(() => {
    if (user) userApi.get<MarketOrder[]>("/api/me/orders").then(setOrders).catch(() => setOrders([]));
  }, [user]);

  if (loading) return <div className="mx-auto max-w-3xl px-4 py-16 text-muted">Loading…</div>;
  if (!user)
    return (
      <div className="mx-auto max-w-md px-4 py-24 text-center">
        <h1 className="font-display text-2xl font-extrabold text-ink">Your orders</h1>
        <p className="mt-2 text-muted">Log in to see your order history and track deliveries.</p>
        <button onClick={openAuth} className="btn btn-primary mt-6 px-6 py-3">Log in</button>
      </div>
    );

  return (
    <div className="mx-auto max-w-3xl px-4 py-8">
      <h1 className="font-display text-3xl font-extrabold text-ink">My orders</h1>
      {orders && orders.length === 0 && <div className="card mt-6 p-12 text-center text-muted">No orders yet. <Link to="/explore" className="font-semibold text-brand">Browse businesses →</Link></div>}
      <div className="mt-6 space-y-3">
        {(orders ?? []).map((o) => (
          <Link key={o.id} to={`/order/${o.number}`} className="card card-hover flex flex-wrap items-center gap-3 p-4">
            <div className="min-w-0 flex-1">
              <p className="font-display font-bold text-ink">{o.number}</p>
              <p className="text-sm text-muted">{formatEventDate(o.createdAt)} · {o.businessOrders.length} business{o.businessOrders.length !== 1 ? "es" : ""} · {currency(o.total)}</p>
            </div>
            <span className={`rounded-full px-2.5 py-1 text-xs font-bold ${DELIVERY_STATUS[o.deliveryStatus].cls}`}>{DELIVERY_STATUS[o.deliveryStatus].label}</span>
          </Link>
        ))}
      </div>
    </div>
  );
}
