import { createContext, ReactNode, useContext, useEffect, useMemo, useState } from "react";

export interface CartItem {
  businessId: number;
  businessSlug: string;
  businessName: string;
  businessLogo: string | null;
  name: string;
  price: number;
  quantity: number;
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
  add: (item: Omit<CartItem, "quantity">, qty?: number) => void;
  setQty: (businessId: number, name: string, qty: number) => void;
  remove: (businessId: number, name: string) => void;
  clear: () => void;
}

const CartContext = createContext<CartValue | null>(null);
const KEY = "aley-cart";
const itemKey = (businessId: number, name: string) => `${businessId}::${name}`;

export function CartProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<CartItem[]>(() => {
    try {
      return JSON.parse(localStorage.getItem(KEY) || "[]");
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
          const k = itemKey(item.businessId, item.name);
          const existing = prev.find((i) => itemKey(i.businessId, i.name) === k);
          if (existing) return prev.map((i) => (itemKey(i.businessId, i.name) === k ? { ...i, quantity: i.quantity + qty } : i));
          return [...prev, { ...item, quantity: qty }];
        }),
      setQty: (businessId, name, qty) =>
        setItems((prev) => (qty <= 0 ? prev.filter((i) => itemKey(i.businessId, i.name) !== itemKey(businessId, name)) : prev.map((i) => (itemKey(i.businessId, i.name) === itemKey(businessId, name) ? { ...i, quantity: qty } : i)))),
      remove: (businessId, name) => setItems((prev) => prev.filter((i) => itemKey(i.businessId, i.name) !== itemKey(businessId, name))),
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
