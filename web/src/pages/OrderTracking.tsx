import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { CheckIcon } from "../components/icons";
import { api, currency, DELIVERY_STATUS, DELIVERY_STEPS, formatEventDate, TICKET_STATUS } from "../lib/api";
import type { MarketOrder } from "../types";

export function OrderTracking() {
  const { number } = useParams();
  const [order, setOrder] = useState<MarketOrder | null>(null);
  const [err, setErr] = useState("");

  const load = () => api.get<MarketOrder>(`/api/orders/track/${number}`).then(setOrder).catch((e) => setErr(e.message));
  useEffect(() => {
    load();
    const t = setInterval(load, 15000);
    return () => clearInterval(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [number]);

  if (err) return <div className="mx-auto max-w-md px-4 py-24 text-center"><p className="text-lg font-semibold text-ink">Order not found.</p><Link to="/explore" className="mt-3 inline-block font-semibold text-brand">← Browse</Link></div>;
  if (!order) return <div className="mx-auto max-w-3xl px-4 py-16"><div className="card h-72 animate-pulse" /></div>;

  const step = DELIVERY_STEPS.indexOf(order.deliveryStatus);
  const cancelled = order.deliveryStatus === "CANCELLED";

  return (
    <div className="mx-auto max-w-3xl px-4 py-8">
      <div className="text-center">
        <span className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-emerald-500/15 text-emerald-600"><CheckIcon className="h-7 w-7" /></span>
        <h1 className="mt-3 font-display text-2xl font-extrabold text-ink">Order {order.number}</h1>
        <p className="text-muted">Placed {formatEventDate(order.createdAt)} · {order.fulfillment === "DELIVERY" ? "Delivery" : "Pickup"}</p>
      </div>

      {/* Delivery progress */}
      {order.fulfillment === "DELIVERY" && !cancelled && (
        <div className="card mt-6 p-5">
          <div className="flex items-center justify-between">
            {DELIVERY_STEPS.map((s, i) => (
              <div key={s} className="flex flex-1 flex-col items-center text-center">
                <span className={`flex h-8 w-8 items-center justify-center rounded-full text-xs font-bold ${i <= step ? "bg-brand text-white" : "surface-2 text-muted"}`}>{i < step ? <CheckIcon className="h-4 w-4" /> : i + 1}</span>
                <span className={`mt-1 text-[11px] ${i <= step ? "font-semibold text-ink" : "text-muted"}`}>{DELIVERY_STATUS[s].label}</span>
              </div>
            ))}
          </div>
          {order.driverName && <p className="mt-3 text-center text-sm text-muted">🛵 Driver: <span className="font-semibold text-ink">{order.driverName}</span></p>}
        </div>
      )}
      {cancelled && <div className="card mt-6 p-4 text-center font-semibold text-rose-500">This order was cancelled.</div>}

      {/* Per-business tickets */}
      <h2 className="mt-8 font-display text-lg font-bold text-ink">Your items by business</h2>
      <div className="mt-3 space-y-3">
        {order.businessOrders.map((t) => {
          const st = TICKET_STATUS[t.status];
          return (
            <div key={t.id} className="card overflow-hidden">
              <div className="flex items-center gap-3 border-b border-border bg-surface-2 px-4 py-3">
                <img src={t.business?.logo ?? ""} alt="" className="h-9 w-9 rounded-lg object-cover" />
                <Link to={`/business/${t.business?.slug}`} className="font-display font-bold text-ink hover:text-brand">{t.business?.name}</Link>
                <span className={`ml-auto rounded-full px-2.5 py-1 text-xs font-bold ${st.cls}`}>{st.label}{t.prepTime && t.status === "PREPARING" ? ` · ${t.prepTime}` : ""}</span>
              </div>
              <ul className="divide-y divide-border">
                {t.items.map((it) => (
                  <li key={it.id} className="flex justify-between px-4 py-2 text-sm"><span className="text-ink">{it.quantity}× {it.name}</span><span className="text-muted">{currency(it.lineTotal)}</span></li>
                ))}
              </ul>
            </div>
          );
        })}
      </div>

      {/* Totals */}
      <div className="card mt-6 p-5">
        <dl className="space-y-2 text-sm">
          <div className="flex justify-between"><dt className="text-muted">Items</dt><dd className="font-semibold text-ink">{currency(order.itemsSubtotal)}</dd></div>
          <div className="flex justify-between"><dt className="text-muted">Delivery</dt><dd className="font-semibold text-ink">{order.deliveryFee === 0 ? "Free" : currency(order.deliveryFee)}</dd></div>
          <div className="mt-2 flex justify-between border-t border-border pt-2 text-base"><dt className="font-bold text-ink">Total</dt><dd className="font-extrabold text-ink">{currency(order.total)}</dd></div>
          <div className="flex justify-between text-xs text-muted"><dt>Payment</dt><dd>{order.paymentMethod === "ONLINE" ? "Paid online" : "Cash on delivery"}</dd></div>
        </dl>
      </div>
      <p className="mt-4 text-center text-xs text-muted">This page updates automatically. Each business prepares its part at its own pace.</p>
    </div>
  );
}
