import { Link, useNavigate } from "react-router-dom";
import { CartIcon } from "../components/icons";
import { useCart } from "../context/CartContext";
import { currency } from "../lib/api";

const DELIVERY_FEE = 3;
const FREE_OVER = 30;

export function Cart() {
  const { groups, subtotal, businessCount, count, setQty, remove, clear } = useCart();
  const navigate = useNavigate();
  const fee = subtotal >= FREE_OVER || subtotal === 0 ? 0 : DELIVERY_FEE;

  if (count === 0) {
    return (
      <div className="mx-auto max-w-md px-4 py-24 text-center">
        <span className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-brand-soft text-brand-dark"><CartIcon className="h-8 w-8" /></span>
        <h1 className="mt-5 font-display text-2xl font-extrabold text-ink">Your cart is empty</h1>
        <p className="mt-2 text-muted">Add items from any business in Aley — you can order from several at once.</p>
        <Link to="/explore" className="btn btn-primary mt-6 px-6 py-3">Browse businesses</Link>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-5xl px-4 py-8">
      <div className="flex items-center justify-between">
        <h1 className="font-display text-3xl font-extrabold text-ink">Your cart</h1>
        <button onClick={clear} className="text-sm font-semibold text-muted hover:text-red-500">Clear all</button>
      </div>
      <p className="mt-1 text-muted">{count} item{count !== 1 ? "s" : ""} from {businessCount} business{businessCount !== 1 ? "es" : ""} — one checkout.</p>

      <div className="mt-6 grid gap-6 lg:grid-cols-[1fr_20rem]">
        <div className="space-y-4">
          {groups.map((g) => (
            <div key={g.businessId} className="card overflow-hidden">
              <div className="flex items-center gap-3 border-b border-border bg-surface-2 px-4 py-3">
                <img src={g.businessLogo ?? ""} alt="" className="h-9 w-9 rounded-lg object-cover" />
                <Link to={`/business/${g.businessSlug}`} className="font-display font-bold text-ink hover:text-brand">{g.businessName}</Link>
                <span className="ml-auto text-sm font-semibold text-muted">{currency(g.subtotal)}</span>
              </div>
              <ul className="divide-y divide-border">
                {g.items.map((it) => (
                  <li key={it.name} className="flex items-center gap-3 px-4 py-3">
                    <span className="flex-1">
                      <span className="font-semibold text-ink">{it.name}</span>
                      <span className="block text-xs text-muted">{currency(it.price)} each</span>
                    </span>
                    <div className="inline-flex items-center rounded-full border border-border">
                      <button onClick={() => setQty(g.businessId, it.name, it.quantity - 1)} className="px-3 py-1 font-bold text-ink">−</button>
                      <span className="w-7 text-center text-sm font-semibold">{it.quantity}</span>
                      <button onClick={() => setQty(g.businessId, it.name, it.quantity + 1)} className="px-3 py-1 font-bold text-ink">+</button>
                    </div>
                    <span className="w-16 text-right font-semibold text-ink">{currency(it.price * it.quantity)}</span>
                    <button onClick={() => remove(g.businessId, it.name)} className="text-muted hover:text-red-500" aria-label="Remove">✕</button>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        <aside className="card sticky top-24 h-fit p-5">
          <h2 className="font-display text-lg font-bold text-ink">Summary</h2>
          <dl className="mt-3 space-y-2 text-sm">
            <div className="flex justify-between"><dt className="text-muted">Items</dt><dd className="font-semibold text-ink">{currency(subtotal)}</dd></div>
            <div className="flex justify-between"><dt className="text-muted">Delivery (est.)</dt><dd className="font-semibold text-ink">{fee === 0 ? "Free" : currency(fee)}</dd></div>
            <div className="mt-2 flex justify-between border-t border-border pt-2 text-base"><dt className="font-bold text-ink">Total</dt><dd className="font-extrabold text-ink">{currency(subtotal + fee)}</dd></div>
          </dl>
          {subtotal < FREE_OVER && <p className="mt-2 text-xs text-brand">Add {currency(FREE_OVER - subtotal)} more for free delivery.</p>}
          <button onClick={() => navigate("/checkout")} className="btn btn-primary mt-4 w-full py-3">Continue to checkout</button>
          <p className="mt-2 text-center text-[11px] text-muted">Each business prepares its own part; one delivery brings it all.</p>
        </aside>
      </div>
    </div>
  );
}
