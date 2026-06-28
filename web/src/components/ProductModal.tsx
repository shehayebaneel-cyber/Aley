import { useMemo, useState } from "react";
import { CheckIcon, CloseIcon } from "./icons";
import { ProductPlaceholder } from "./ProductPlaceholder";
import { useCart, type CartItemOption } from "../context/CartContext";
import type { Business, ProductItem } from "../types";

const money = (n: number) => `$${Number.isInteger(n) ? n : n.toFixed(2)}`;
const plus = (n: number) => (n > 0 ? `+${money(n)}` : "Free");

export const DIET_META: Record<string, { label: string; icon: string }> = {
  vegetarian: { label: "Vegetarian", icon: "🥗" },
  vegan: { label: "Vegan", icon: "🌱" },
  "gluten-free": { label: "Gluten-free", icon: "🌾" },
};

export function ProductModal({ business, item, canOrder, onClose }: { business: Business; item: ProductItem; canOrder: boolean; onClose: () => void }) {
  const cart = useCart();
  const groups = item.options ?? [];
  const [qty, setQty] = useState(1);
  const [added, setAdded] = useState(false);
  // Single-choice groups default to their first option; multi start empty.
  const [single, setSingle] = useState<Record<string, number>>(() => {
    const init: Record<string, number> = {};
    groups.forEach((g, gi) => { if (g.type === "single" && g.choices.length) init[gi] = 0; });
    return init;
  });
  const [multi, setMulti] = useState<Record<string, Set<number>>>({});

  const isMultiOn = (gi: number, ci: number) => multi[gi]?.has(ci) ?? false;
  const toggleMulti = (gi: number, ci: number) =>
    setMulti((prev) => {
      const next = new Set(prev[gi] ?? []);
      next.has(ci) ? next.delete(ci) : next.add(ci);
      return { ...prev, [gi]: next };
    });

  const { unitPrice, chosen } = useMemo(() => {
    const base = item.price ?? 0;
    const chosen: CartItemOption[] = [];
    groups.forEach((g, gi) => {
      if (g.type === "single") {
        const ci = single[gi];
        const ch = ci != null ? g.choices[ci] : undefined;
        if (ch) chosen.push({ group: g.name, choice: ch.label, price: ch.price ?? 0 });
      } else {
        for (const ci of multi[gi] ?? []) {
          const ch = g.choices[ci];
          if (ch) chosen.push({ group: g.name, choice: ch.label, price: ch.price ?? 0 });
        }
      }
    });
    const unitPrice = Math.round((base + chosen.reduce((s, c) => s + c.price, 0)) * 100) / 100;
    return { unitPrice, chosen };
  }, [groups, single, multi, item.price]);

  const missingRequired = groups.some((g, gi) => g.required && (g.type === "single" ? single[gi] == null : !(multi[gi]?.size)));

  function addToCart() {
    if (!canOrder || missingRequired) return;
    cart.add({
      businessId: business.id, businessSlug: business.slug, businessName: business.name, businessLogo: business.logo,
      name: item.name, price: unitPrice, image: item.image ?? null, options: chosen,
    }, qty);
    setAdded(true);
    setTimeout(onClose, 550);
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/60 p-0 backdrop-blur-sm sm:items-center sm:p-4" onClick={onClose}>
      <div className="card pop-in max-h-[92vh] w-full max-w-lg overflow-y-auto rounded-b-none p-0 sm:rounded-3xl" onClick={(e) => e.stopPropagation()}>
        {/* Image header */}
        <div className="relative h-52 w-full overflow-hidden sm:h-60">
          {item.image ? <img src={item.image} alt={item.name} className="h-full w-full object-cover" /> : <ProductPlaceholder className="h-full w-full" />}
          {item.badge && <span className="absolute left-3 top-3 rounded-full bg-amber-400 px-2.5 py-1 text-xs font-bold text-amber-950">{item.badge}</span>}
          <button onClick={onClose} aria-label="Close" className="absolute right-3 top-3 flex h-9 w-9 items-center justify-center rounded-full bg-black/40 text-white backdrop-blur hover:bg-black/60"><CloseIcon className="h-5 w-5" /></button>
        </div>

        <div className="p-5">
          <div className="flex items-start justify-between gap-3">
            <h2 className="font-display text-2xl font-extrabold text-ink">{item.name}</h2>
            {item.price != null && <span className="shrink-0 font-display text-xl font-bold text-brand">{money(item.price)}</span>}
          </div>
          {item.description && <p className="mt-1.5 leading-relaxed text-muted">{item.description}</p>}

          {!!item.diet?.length && (
            <div className="mt-3 flex flex-wrap gap-2">
              {item.diet.map((d) => (
                <span key={d} className="inline-flex items-center gap-1 rounded-full bg-emerald-500/15 px-2.5 py-1 text-xs font-semibold text-emerald-600">
                  {DIET_META[d]?.icon} {DIET_META[d]?.label ?? d}
                </span>
              ))}
            </div>
          )}

          {(item.ingredients || item.allergens) && (
            <div className="mt-4 space-y-1.5 rounded-xl surface-2 p-3 text-sm">
              {item.ingredients && <p className="text-muted"><span className="font-semibold text-ink">Ingredients: </span>{item.ingredients}</p>}
              {item.allergens && <p className="text-muted"><span className="font-semibold text-ink">Allergens: </span>{item.allergens}</p>}
            </div>
          )}

          {/* Customization groups */}
          {groups.map((g, gi) => (
            <div key={gi} className="mt-5">
              <div className="flex items-center justify-between">
                <p className="font-bold text-ink">{g.name}</p>
                <span className="text-xs font-semibold text-muted">{g.required ? "Required" : g.type === "multi" ? "Optional · pick any" : "Optional"}</span>
              </div>
              <div className="mt-2 space-y-1.5">
                {g.choices.map((ch, ci) => {
                  const selected = g.type === "single" ? single[gi] === ci : isMultiOn(gi, ci);
                  return (
                    <button
                      key={ci}
                      type="button"
                      onClick={() => (g.type === "single" ? setSingle((p) => ({ ...p, [gi]: ci })) : toggleMulti(gi, ci))}
                      className={`flex w-full items-center justify-between rounded-xl border px-3 py-2.5 text-left text-sm transition ${selected ? "border-brand bg-brand-soft" : "border-border hover:border-brand/50"}`}
                    >
                      <span className="flex items-center gap-2.5">
                        <span className={`flex h-5 w-5 items-center justify-center border ${g.type === "single" ? "rounded-full" : "rounded-md"} ${selected ? "border-brand bg-brand text-white" : "border-border"}`}>
                          {selected && <CheckIcon className="h-3.5 w-3.5" />}
                        </span>
                        <span className="font-medium text-ink">{ch.label}</span>
                      </span>
                      <span className={`text-xs font-semibold ${ch.price ? "text-ink" : "text-muted"}`}>{plus(ch.price ?? 0)}</span>
                    </button>
                  );
                })}
              </div>
            </div>
          ))}

          {/* Quantity + add */}
          <div className="mt-6 flex items-center gap-3">
            <div className="inline-flex items-center rounded-full border border-border">
              <button onClick={() => setQty((q) => Math.max(1, q - 1))} className="px-4 py-2.5 text-lg font-bold text-ink">−</button>
              <span className="w-8 text-center font-semibold">{qty}</span>
              <button onClick={() => setQty((q) => q + 1)} className="px-4 py-2.5 text-lg font-bold text-ink">+</button>
            </div>
            <button
              onClick={addToCart}
              disabled={!canOrder || missingRequired || added}
              className="btn btn-primary flex-1 py-3 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {added ? <><CheckIcon className="h-5 w-5" /> Added</> : !canOrder ? "Closed — ordering unavailable" : missingRequired ? "Select required options" : <>Add {qty > 1 ? `${qty} ` : ""}· {money(unitPrice * qty)}</>}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
