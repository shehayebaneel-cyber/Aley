import { Link } from "react-router-dom";
import type { GiftCardProduct } from "../types";

const money = (n: number) => `$${Number.isInteger(n) ? n : n.toFixed(2)}`;

/** Hero label: fixed cards → "$50 Gift Card"; product/service → their name. */
export function giftHeadline(g: GiftCardProduct): string {
  if (g.kind === "FIXED") return `${money(g.value)} Gift Card`;
  return g.name;
}

/** "Valid for 6 months" / "Valid for 30 days" / "No expiry". */
export function validityLabel(days: number): string {
  if (!days) return "No expiry";
  if (days % 365 === 0) return `Valid for ${days / 365} year${days === 365 ? "" : "s"}`;
  if (days % 30 === 0) return `Valid for ${days / 30} months`;
  return `Valid for ${days} days`;
}

export function GiftCard({ g, onBuy }: { g: GiftCardProduct; onBuy: (g: GiftCardProduct) => void }) {
  const cat = g.business?.category;
  return (
    <div className="card card-hover group flex flex-col overflow-hidden">
      {/* Gift-card banner */}
      <Link to={`/gift-card/${g.id}`} className="relative block h-36 overflow-hidden bg-gradient-to-br from-brand to-brand-dark">
        {g.image && <img src={g.image} alt="" loading="lazy" className="h-full w-full object-cover opacity-80 transition duration-500 group-hover:scale-105" />}
        <div className="absolute inset-0 bg-gradient-to-t from-black/55 to-transparent" />
        <span className="absolute right-3 top-3 rounded-full bg-white/90 px-2.5 py-1 text-[11px] font-bold text-brand-dark shadow backdrop-blur">🎁 Gift card</span>
        {g.discounted && <span className="absolute left-3 top-3 rounded-full bg-accent px-2.5 py-1 text-[11px] font-bold text-white shadow">Save {money(g.value - g.price)}</span>}
        <div className="absolute bottom-3 left-4 right-4">
          <p className="font-display text-2xl font-extrabold text-white drop-shadow">{giftHeadline(g)}</p>
        </div>
      </Link>

      <div className="flex flex-1 flex-col p-4">
        <div className="flex items-center gap-2">
          {g.business?.logo && <img src={g.business.logo} alt="" className="h-6 w-6 rounded-full object-cover" />}
          <Link to={`/gift-card/${g.id}`} className="truncate font-display font-bold text-ink hover:text-brand">{g.business?.name}</Link>
        </div>
        {cat && <p className="mt-0.5 text-xs font-medium text-muted">{cat.icon} {cat.name}</p>}
        {g.description && <p className="mt-2 line-clamp-2 text-sm text-muted">{g.description}</p>}
        <div className="mt-3 flex items-center justify-between border-t border-border pt-3">
          <span className="text-xs font-medium text-muted">{validityLabel(g.expiryDays)}</span>
          {g.discounted && <span className="text-xs font-semibold"><span className="text-muted line-through">{money(g.value)}</span> <span className="text-emerald-600">{money(g.price)}</span></span>}
        </div>
        <button onClick={() => onBuy(g)} className="btn btn-primary mt-3 w-full py-2.5">Buy Gift Card{g.price ? ` · ${money(g.price)}` : ""}</button>
      </div>
    </div>
  );
}
