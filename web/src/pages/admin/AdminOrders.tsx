import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { adminApi, currency, DELIVERY_STATUS, formatEventDate, TICKET_STATUS } from "../../lib/api";
import type { MarketOrder } from "../../types";

const DELIVERY_OPTS = ["PENDING", "COLLECTING", "OUT_FOR_DELIVERY", "DELIVERED", "CANCELLED"];

export function AdminOrders() {
  const [orders, setOrders] = useState<MarketOrder[]>([]);
  const [filter, setFilter] = useState("active");

  const load = () => adminApi.get<MarketOrder[]>(`/api/admin/orders${filter ? `?status=${filter}` : ""}`).then(setOrders);
  useEffect(() => { load(); /* eslint-disable-next-line */ }, [filter]);

  const setDelivery = async (id: number, deliveryStatus: string) => { await adminApi.patch(`/api/admin/orders/${id}`, { deliveryStatus }); load(); };
  const setDriver = async (id: number, driverName: string) => { await adminApi.patch(`/api/admin/orders/${id}`, { driverName }); load(); };
  const cancelTicket = async (ticketId: number) => { if (confirm("Cancel this business's part of the order?")) { await adminApi.patch(`/api/admin/business-orders/${ticketId}`, { status: "CANCELLED" }); load(); } };

  return (
    <div>
      <h1 className="font-display text-3xl font-extrabold text-ink">Marketplace orders</h1>
      <p className="mt-1 text-muted">Full combined view — each order can span several businesses. Manage delivery and commission here.</p>

      <div className="mt-4 flex flex-wrap gap-2">
        {[["active", "Active"], ["", "All"], ["DELIVERED", "Delivered"], ["CANCELLED", "Cancelled"]].map(([k, l]) => (
          <button key={k} onClick={() => setFilter(k)} className={`chip ${filter === k ? "chip-active" : ""}`}>{l}</button>
        ))}
      </div>

      <div className="mt-5 space-y-4">
        {orders.length === 0 && <div className="card p-10 text-center text-muted">No orders.</div>}
        {orders.map((o) => (
          <div key={o.id} className="card p-5">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <p className="font-display text-lg font-bold text-ink">{o.number}</p>
                <p className="text-sm text-muted">{formatEventDate(o.createdAt)} · {o.customerName} · <a href={`tel:${o.customerPhone}`} className="text-brand">{o.customerPhone}</a></p>
                <p className="text-sm text-muted">{o.fulfillment === "DELIVERY" ? `🛵 ${o.address}` : "🏬 Pickup"} · {o.paymentMethod === "ONLINE" ? (o.paid ? "Paid online" : "Online (unpaid)") : "Cash on delivery"}</p>
              </div>
              <div className="text-right">
                <p className="font-display text-xl font-extrabold text-ink">{currency(o.total)}</p>
                <p className="text-xs text-muted">items {currency(o.itemsSubtotal)} + delivery {currency(o.deliveryFee)}</p>
                <p className="text-xs font-semibold text-brand">commission {currency(o.commissionTotal)}</p>
              </div>
            </div>

            {/* Per-business tickets */}
            <div className="mt-3 grid gap-2 sm:grid-cols-2">
              {o.businessOrders.map((t) => (
                <div key={t.id} className="rounded-xl surface-2 p-3">
                  <div className="flex items-center justify-between">
                    <Link to={`/business/${t.business?.slug}`} className="font-semibold text-ink hover:text-brand">{t.business?.name}</Link>
                    <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${TICKET_STATUS[t.status].cls}`}>{TICKET_STATUS[t.status].label}</span>
                  </div>
                  <p className="mt-1 text-xs text-muted">{t.items.map((it) => `${it.quantity}× ${it.name}`).join(", ")}</p>
                  <div className="mt-1 flex items-center justify-between text-xs text-muted">
                    <span>{currency(t.subtotal)} · comm {currency(t.commissionAmount)}</span>
                    {t.status !== "CANCELLED" && <button onClick={() => cancelTicket(t.id)} className="font-semibold text-red-500">Cancel part</button>}
                  </div>
                </div>
              ))}
            </div>

            {/* Delivery / driver controls */}
            <div className="mt-3 flex flex-wrap items-center gap-2 border-t border-border pt-3">
              <span className="text-sm font-semibold text-ink">Delivery:</span>
              <select value={o.deliveryStatus} onChange={(e) => setDelivery(o.id, e.target.value)} className="chip cursor-pointer">
                {DELIVERY_OPTS.map((s) => <option key={s} value={s}>{DELIVERY_STATUS[s].label}</option>)}
              </select>
              <input defaultValue={o.driverName} onBlur={(e) => e.target.value !== o.driverName && setDriver(o.id, e.target.value)} placeholder="Assign driver…" className="rounded-full border border-border bg-surface px-3 py-1.5 text-sm" />
              <Link to={`/order/${o.number}`} target="_blank" className="ml-auto text-sm font-semibold text-brand">Customer view →</Link>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
