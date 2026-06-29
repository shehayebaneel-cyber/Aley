import { Router } from "express";
import { optionalUser } from "../auth";
import { prisma } from "../db";
import { recordTransaction } from "../lib/ledger";
import { effectiveCommission, getMarketplaceSettings } from "../lib/marketplace";
import { isOpenNow, parseArr, type HoursRow } from "../lib/serialize";

export const ordersRouter = Router();

const round2 = (n: number) => Math.round(n * 100) / 100;
const genNumber = () => `ALY-${Date.now().toString(36).slice(-5).toUpperCase()}${Math.floor(Math.random() * 1296).toString(36).toUpperCase().padStart(2, "0")}`;
const STR = (v: unknown, max = 300) => String(v ?? "").slice(0, max).trim();

/** Recompute an order's money totals from its non-cancelled business tickets. */
export async function recomputeOrder(orderId: number) {
  const order = await prisma.order.findUnique({ where: { id: orderId }, include: { businessOrders: true } });
  if (!order) return;
  const live = order.businessOrders.filter((bo) => bo.status !== "CANCELLED");
  const itemsSubtotal = round2(live.reduce((s, bo) => s + bo.subtotal, 0));
  const commissionTotal = round2(live.reduce((s, bo) => s + bo.commissionAmount, 0));
  const deliveryFee = order.fulfillment === "PICKUP" || itemsSubtotal === 0 ? 0 : order.deliveryFee;
  await prisma.order.update({
    where: { id: orderId },
    data: {
      itemsSubtotal, commissionTotal, total: round2(itemsSubtotal + deliveryFee), deliveryFee,
      // If every ticket is cancelled, the whole order is cancelled.
      status: live.length === 0 ? "CANCELLED" : order.status,
    },
  });
}

interface IncomingItem { name: string; price: number; quantity: number }
interface Basket { businessId: number; items: IncomingItem[] }

// POST /api/orders — place a multi-business order in one checkout.
ordersRouter.post("/", optionalUser, async (req, res) => {
  const b = req.body as {
    customerName: string; customerPhone: string; customerEmail?: string;
    fulfillment?: string; address?: string; lat?: number; lng?: number; note?: string;
    paymentMethod?: string; baskets: Basket[];
  };
  if (!b.customerName?.trim() || !b.customerPhone?.trim()) return res.status(400).json({ error: "Name and phone are required." });
  const baskets = (b.baskets ?? []).filter((bk) => bk.items?.length);
  if (!baskets.length) return res.status(400).json({ error: "Your cart is empty." });

  const fulfillment = b.fulfillment === "PICKUP" ? "PICKUP" : "DELIVERY";
  if (fulfillment === "DELIVERY" && !b.address?.trim()) return res.status(400).json({ error: "A delivery address is required." });

  const aley = await prisma.city.findUnique({ where: { slug: "aley" } });

  // Validate every business is available + open BEFORE creating anything.
  const businessesById = new Map<number, Awaited<ReturnType<typeof prisma.business.findUnique>>>();
  const closed: string[] = [];
  for (const bk of baskets) {
    const business = await prisma.business.findUnique({ where: { id: Number(bk.businessId) } });
    if (!business || !business.isPublished) return res.status(400).json({ error: "One of the businesses is no longer available." });
    if (!isOpenNow(parseArr(business.hours) as HoursRow[])) closed.push(business.name);
    businessesById.set(business.id, business);
  }
  if (closed.length) {
    return res.status(422).json({ error: `${closed.join(", ")} ${closed.length > 1 ? "are" : "is"} currently closed. Please remove ${closed.length > 1 ? "them" : "it"} or order during opening hours.`, closed: true });
  }

  const settings = await getMarketplaceSettings();

  // Build per-business tickets with commission.
  const tickets = [];
  let itemsSubtotal = 0;
  for (const bk of baskets) {
    const business = businessesById.get(Number(bk.businessId))!;
    const items = bk.items.map((it) => {
      const price = round2(Number(it.price) || 0);
      const quantity = Math.max(1, Math.round(Number(it.quantity) || 1));
      return { name: STR(it.name, 120), price, quantity, lineTotal: round2(price * quantity) };
    });
    const subtotal = round2(items.reduce((s, it) => s + it.lineTotal, 0));
    const commissionRate = effectiveCommission(business.commissionRate, settings);
    itemsSubtotal += subtotal;
    tickets.push({ businessId: business.id, status: "PENDING", subtotal, commissionRate, commissionAmount: round2((subtotal * commissionRate) / 100), items });
  }
  itemsSubtotal = round2(itemsSubtotal);
  const deliveryFee = fulfillment === "PICKUP" ? 0 : settings.freeDeliveryThreshold > 0 && itemsSubtotal >= settings.freeDeliveryThreshold ? 0 : settings.deliveryFee;
  const paymentMethod = b.paymentMethod === "ONLINE" ? "ONLINE" : "CASH";

  const order = await prisma.order.create({
    data: {
      number: genNumber(), cityId: aley!.id, customerId: req.userId ?? null,
      customerName: STR(b.customerName, 120), customerPhone: STR(b.customerPhone, 40), customerEmail: STR(b.customerEmail, 120),
      fulfillment, address: STR(b.address, 300), lat: Number.isFinite(Number(b.lat)) ? Number(b.lat) : null, lng: Number.isFinite(Number(b.lng)) ? Number(b.lng) : null, note: STR(b.note, 500),
      itemsSubtotal, deliveryFee, total: round2(itemsSubtotal + deliveryFee), commissionTotal: round2(tickets.reduce((s, t) => s + t.commissionAmount, 0)),
      paymentMethod, paid: paymentMethod === "ONLINE", // mock: online marked paid instantly
      businessOrders: { create: tickets.map((t) => ({ businessId: t.businessId, status: t.status, subtotal: t.subtotal, commissionRate: t.commissionRate, commissionAmount: t.commissionAmount, items: { create: t.items } })) },
    },
    include: { businessOrders: { include: { items: true, business: { select: { name: true, slug: true, logo: true } } } } },
  });
  // Ledger: record each business's share of the order as a paid transaction.
  for (const bo of order.businessOrders) {
    await recordTransaction({ businessId: bo.businessId, source: "ORDER", refId: bo.id, code: order.number, description: `Order · ${bo.business?.name ?? ""}`, customerName: order.customerName, customerPhone: order.customerPhone, userId: order.customerId, amount: bo.subtotal, method: paymentMethod });
  }
  res.status(201).json(order);
});

// GET /api/orders/track/:number — combined order with each business ticket.
ordersRouter.get("/track/:number", async (req, res) => {
  const order = await prisma.order.findUnique({
    where: { number: req.params.number },
    include: { businessOrders: { include: { items: true, business: { select: { name: true, slug: true, logo: true } } }, orderBy: { id: "asc" } } },
  });
  if (!order) return res.status(404).json({ error: "Order not found." });
  res.json(order);
});
