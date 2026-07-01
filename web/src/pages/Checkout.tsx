import { FormEvent, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { MapPicker } from "../components/MapPicker";
import { TopUpModal } from "../components/TopUpModal";
import { useCart } from "../context/CartContext";
import { useUserAuth } from "../context/UserAuthContext";
import { api, currency, userApi } from "../lib/api";
import { useFetch } from "../lib/useFetch";
import { useWallet } from "../lib/useWallet";

export function Checkout() {
  const { groups, subtotal, count, clear } = useCart();
  const { user } = useUserAuth();
  const navigate = useNavigate();
  const { data: cfg } = useFetch<{ deliveryFee: number; freeDeliveryThreshold: number }>("/api/marketplace/config");
  const [f, setF] = useState({
    customerName: user?.name ?? "", customerPhone: "", customerEmail: user?.email ?? "",
    fulfillment: "DELIVERY", address: "", note: "", paymentMethod: "CASH",
    lat: null as number | null, lng: null as number | null,
  });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [topUp, setTopUp] = useState(false);
  const { balance: walletBalance, reload: reloadWallet } = useWallet();
  const set = (p: Partial<typeof f>) => setF({ ...f, ...p });
  const freeOver = cfg?.freeDeliveryThreshold ?? 30;
  const fee = f.fulfillment === "PICKUP" || (freeOver > 0 && subtotal >= freeOver) || subtotal === 0 ? 0 : (cfg?.deliveryFee ?? 3);
  const total = subtotal + fee;
  const walletShort = f.paymentMethod === "WALLET" && walletBalance < total;

  if (count === 0) return <div className="mx-auto max-w-md px-4 py-24 text-center"><p className="text-muted">Your cart is empty.</p><Link to="/explore" className="btn btn-primary mt-4 px-6 py-2.5">Browse</Link></div>;

  async function placeOrder(e: FormEvent) {
    e.preventDefault();
    if (busy) return;
    if (!f.customerName.trim() || !f.customerPhone.trim()) return setError("Name and phone are required.");
    if (f.fulfillment === "DELIVERY" && !f.address.trim()) return setError("A delivery address is required.");
    if (f.paymentMethod === "WALLET" && walletBalance < total) return setError("Your wallet balance is too low. Add money or choose another payment method.");
    setBusy(true); setError("");
    const client = user ? userApi : api;
    try {
      const order = await client.post<{ number: string }>("/api/orders", {
        ...f,
        baskets: groups.map((g) => ({
          businessId: g.businessId,
          items: g.items.map((it) => ({
            // Fold chosen options into the name so the kitchen sees them (price already includes surcharges).
            name: (it.options?.length ? `${it.name} (${it.options.map((o) => o.choice).join(", ")})` : it.name).slice(0, 120),
            price: it.price,
            quantity: it.quantity,
          })),
        })),
      });
      clear();
      navigate(`/order/${order.number}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Couldn't place the order.");
      setBusy(false);
    }
  }

  return (
    <div className="mx-auto max-w-4xl px-4 py-8">
      <h1 className="font-display text-3xl font-extrabold text-ink">Checkout</h1>
      <form onSubmit={placeOrder} className="mt-6 grid gap-6 lg:grid-cols-[1fr_20rem]">
        <div className="space-y-5">
          <section className="card p-5">
            <h2 className="font-display font-bold text-ink">Your details</h2>
            <div className="mt-3 grid gap-3 sm:grid-cols-2">
              <input value={f.customerName} onChange={(e) => set({ customerName: e.target.value })} placeholder="Full name" className="input" />
              <input value={f.customerPhone} onChange={(e) => set({ customerPhone: e.target.value })} placeholder="Phone" className="input" />
              <input value={f.customerEmail} onChange={(e) => set({ customerEmail: e.target.value })} placeholder="Email (optional)" className="input sm:col-span-2" />
            </div>
          </section>

          <section className="card p-5">
            <h2 className="font-display font-bold text-ink">Delivery</h2>
            <div className="mt-3 flex gap-2">
              {["DELIVERY", "PICKUP"].map((opt) => (
                <button key={opt} type="button" onClick={() => set({ fulfillment: opt })} className={`chip ${f.fulfillment === opt ? "chip-active" : ""}`}>{opt === "DELIVERY" ? "🛵 Delivery" : "🏬 Pickup from each"}</button>
              ))}
            </div>
            {f.fulfillment === "DELIVERY" && (
              <>
                <textarea value={f.address} onChange={(e) => set({ address: e.target.value })} rows={2} placeholder="Delivery address" className="input mt-3" />
                <div className="mt-3"><MapPicker lat={f.lat} lng={f.lng} onChange={({ lat, lng }) => set({ lat, lng })} /></div>
              </>
            )}
            <textarea value={f.note} onChange={(e) => set({ note: e.target.value })} rows={2} placeholder="Note for the driver / businesses (optional)" className="input mt-3" />
          </section>

          <section className="card p-5">
            <h2 className="font-display font-bold text-ink">Payment</h2>
            <div className="mt-3 flex flex-wrap gap-2">
              <button type="button" onClick={() => set({ paymentMethod: "CASH" })} className={`chip ${f.paymentMethod === "CASH" ? "chip-active" : ""}`}>💵 Cash on delivery</button>
              <button type="button" onClick={() => set({ paymentMethod: "ONLINE" })} className={`chip ${f.paymentMethod === "ONLINE" ? "chip-active" : ""}`}>💳 Pay online</button>
              {user && <button type="button" onClick={() => set({ paymentMethod: "WALLET" })} className={`chip ${f.paymentMethod === "WALLET" ? "chip-active" : ""}`}>💰 Wallet (${walletBalance.toFixed(2)})</button>}
            </div>
            {f.paymentMethod === "ONLINE" && <p className="mt-2 text-xs text-muted">Online payment is in demo mode — no real charge yet.</p>}
            {f.paymentMethod === "WALLET" && (walletShort ? (
              <div className="mt-2 flex flex-wrap items-center justify-between gap-2 rounded-lg bg-amber-400/10 px-3 py-2 text-xs">
                <span className="font-medium text-amber-700">Balance too low — this order is {currency(total)}.</span>
                <button type="button" onClick={() => setTopUp(true)} className="btn btn-ghost px-3 py-1 text-xs">+ Add money</button>
              </div>
            ) : (
              <p className="mt-2 text-xs text-muted">Paid instantly from your wallet — balance after: ${(walletBalance - total).toFixed(2)}.</p>
            ))}
          </section>
        </div>

        <aside className="card sticky top-24 h-fit p-5">
          <h2 className="font-display text-lg font-bold text-ink">Order ({groups.length})</h2>
          <ul className="mt-3 space-y-2 text-sm">
            {groups.map((g) => (
              <li key={g.businessId} className="flex justify-between"><span className="text-muted">{g.businessName} ({g.items.length})</span><span className="font-semibold text-ink">{currency(g.subtotal)}</span></li>
            ))}
          </ul>
          <dl className="mt-3 space-y-2 border-t border-border pt-3 text-sm">
            <div className="flex justify-between"><dt className="text-muted">Items</dt><dd className="font-semibold text-ink">{currency(subtotal)}</dd></div>
            <div className="flex justify-between"><dt className="text-muted">Delivery</dt><dd className="font-semibold text-ink">{fee === 0 ? "Free" : currency(fee)}</dd></div>
            <div className="mt-2 flex justify-between border-t border-border pt-2 text-base"><dt className="font-bold text-ink">Total</dt><dd className="font-extrabold text-ink">{currency(subtotal + fee)}</dd></div>
          </dl>
          {error && <p className="mt-3 rounded-lg bg-red-500/10 px-3 py-2 text-sm font-medium text-red-500">{error}</p>}
          <button type="submit" disabled={busy || walletShort} className="btn btn-primary mt-4 w-full py-3 disabled:opacity-60">{busy ? "Placing…" : f.paymentMethod === "WALLET" ? `Pay ${currency(total)} with wallet` : "Place order"}</button>
        </aside>
      </form>
      {topUp && <TopUpModal balance={walletBalance} onClose={() => setTopUp(false)} onDone={() => { reloadWallet(); setTopUp(false); }} />}
    </div>
  );
}
