import { createContext, ReactNode, useContext, useEffect, useMemo, useState } from "react";

/** A chosen customization, e.g. { group: "Size", choice: "Large", price: 1 }. */
export interface CartItemOption {
  group: string;
  choice: string;
  price: number;
}

export interface CartItem {
  /** Stable line id — same product + same options merge; different options don't. */
  uid: string;
  businessId: number;
  businessSlug: string;
  businessName: string;
  businessLogo: string | null;
  name: string;
  /** Unit price INCLUDING any selected option surcharges. */
  price: number;
  quantity: number;
  image?: string | null;
  options?: CartItemOption[];
}

export interface CartGroup {
  businessId: number;
  businessSlug: string;
  businessName: string;
  businessLogo: string | null;
  items: CartItem[];
  subtotal: number;
}

interface CartValue {
  items: CartItem[];
  groups: CartGroup[];
  count: number;
  subtotal: number;
  businessCount: number;
  add: (item: Omit<CartItem, "quantity" | "uid">, qty?: number) => void;
  setQty: (uid: string, qty: number) => void;
  remove: (uid: string) => void;
  clear: () => void;
}

const CartContext = createContext<CartValue | null>(null);
const KEY = "aley-cart";

/** Build a stable line id from the business, product name, and chosen options. */
function lineUid(item: { businessId: number; name: string; options?: CartItemOption[] }) {
  const opts = (item.options ?? []).map((o) => `${o.group}:${o.choice}`).sort().join("|");
  return `${item.businessId}::${item.name}::${opts}`;
}

export function CartProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<CartItem[]>(() => {
    try {
      const raw: CartItem[] = JSON.parse(localStorage.getItem(KEY) || "[]");
      // Backfill uid for carts saved before options existed.
      return raw.map((i) => ({ ...i, uid: i.uid ?? lineUid(i) }));
    } catch {
      return [];
    }
  });

  useEffect(() => {
    try {
      localStorage.setItem(KEY, JSON.stringify(items));
    } catch {
      /* ignore */
    }
  }, [items]);

  const value = useMemo<CartValue>(() => {
    const groupsMap = new Map<number, CartGroup>();
    for (const it of items) {
      let g = groupsMap.get(it.businessId);
      if (!g) {
        g = { businessId: it.businessId, businessSlug: it.businessSlug, businessName: it.businessName, businessLogo: it.businessLogo, items: [], subtotal: 0 };
        groupsMap.set(it.businessId, g);
      }
      g.items.push(it);
      g.subtotal = Math.round((g.subtotal + it.price * it.quantity) * 100) / 100;
    }
    const groups = [...groupsMap.values()];
    return {
      items,
      groups,
      count: items.reduce((s, i) => s + i.quantity, 0),
      subtotal: Math.round(items.reduce((s, i) => s + i.price * i.quantity, 0) * 100) / 100,
      businessCount: groups.length,
      add: (item, qty = 1) =>
        setItems((prev) => {
          const uid = lineUid(item);
          const existing = prev.find((i) => i.uid === uid);
          if (existing) return prev.map((i) => (i.uid === uid ? { ...i, quantity: i.quantity + qty } : i));
          return [...prev, { ...item, uid, quantity: qty }];
        }),
      setQty: (uid, qty) =>
        setItems((prev) => (qty <= 0 ? prev.filter((i) => i.uid !== uid) : prev.map((i) => (i.uid === uid ? { ...i, quantity: qty } : i)))),
      remove: (uid) => setItems((prev) => prev.filter((i) => i.uid !== uid)),
      clear: () => setItems([]),
    };
  }, [items]);

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
}

export function useCart() {
  const ctx = useContext(CartContext);
  if (!ctx) throw new Error("useCart must be used inside CartProvider");
  return ctx;
}
