import bcrypt from "bcryptjs";
import { Router } from "express";
import { requireDriver, signToken } from "../auth";
import { prisma } from "../db";
import {
  driverEarnings, DRIVER_SETTABLE_STATUSES, effectiveDriverCommission, getDeliverySettings,
} from "../lib/delivery";
import { notifyAdmins } from "../lib/notify";

const driverToken = (id: number) => signToken({ driverId: id, role: "driver" });
type DriverRow = { id: number; name: string; email: string | null; phone: string; vehicle: string; status: string; commissionRate: number };
const safeDriver = (d: DriverRow) => ({ id: d.id, name: d.name, email: d.email, phone: d.phone, vehicle: d.vehicle, status: d.status, commissionRate: d.commissionRate });
const STR = (v: unknown, max = 300) => String(v ?? "").slice(0, max).trim();

// ---------------------------------------------------------------------------
// Driver authentication (phone or email + password)
// ---------------------------------------------------------------------------
export const driverAuthRouter = Router();

driverAuthRouter.post("/register", async (req, res) => {
  const name = STR(req.body.name, 80);
  const phone = STR(req.body.phone, 40);
  const email = STR(req.body.email, 120).toLowerCase() || null;
  const password = String(req.body.password ?? "");
  if (!name || !phone || password.length < 6) {
    return res.status(400).json({ error: "Name, phone, and a password (6+ chars) are required." });
  }
  if (await prisma.driver.findUnique({ where: { phone } })) return res.status(409).json({ error: "A driver account with this phone already exists." });
  if (email && (await prisma.driver.findUnique({ where: { email } }))) return res.status(409).json({ error: "A driver account with this email already exists." });

  const driver = await prisma.driver.create({
    data: { name, phone, email, vehicle: STR(req.body.vehicle, 60), passwordHash: await bcrypt.hash(password, 10), status: "PENDING" },
  });
  await notifyAdmins({
    kind: "DRIVER_SIGNUP",
    title: `New driver application: ${name}`,
    body: `${name} · ${phone}${email ? ` · ${email}` : ""}${driver.vehicle ? ` · ${driver.vehicle}` : ""} — awaiting approval.`,
    link: "/admin/drivers",
  });
  res.status(201).json({ token: driverToken(driver.id), driver: safeDriver(driver) });
});

driverAuthRouter.post("/login", async (req, res) => {
  const login = STR(req.body.login ?? req.body.email ?? req.body.phone, 120).toLowerCase();
  const password = String(req.body.password ?? "");
  // Match by email OR phone.
  const driver = await prisma.driver.findFirst({
    where: { OR: [{ email: login }, { phone: STR(req.body.login ?? req.body.phone, 120) }] },
  });
  if (!driver || !(await bcrypt.compare(password, driver.passwordHash))) {
    return res.status(401).json({ error: "Wrong login or password." });
  }
  res.json({ token: driverToken(driver.id), driver: safeDriver(driver) });
});

// ---------------------------------------------------------------------------
// Driver dashboard (token required)
// ---------------------------------------------------------------------------
export const driverRouter = Router();
driverRouter.use(requireDriver);

async function loadDriver(req: { driverId?: number }) {
  return prisma.driver.findUnique({ where: { id: req.driverId! } });
}

const COURIER_ACTIVE = ["ACCEPTED", "HEADING_TO_PICKUP", "PICKED_UP", "ON_THE_WAY"];
const ORDER_ACTIVE = ["COLLECTING", "OUT_FOR_DELIVERY"];

// Normalize a marketplace order's deliveryStatus into the shared status vocab.
const ORDER_TO_NORM: Record<string, string> = { PENDING: "REQUESTED", COLLECTING: "ACCEPTED", OUT_FOR_DELIVERY: "ON_THE_WAY", DELIVERED: "DELIVERED", CANCELLED: "CANCELLED" };
// What a driver's normalized choice means for an order's deliveryStatus.
const NORM_TO_ORDER: Record<string, string> = { ACCEPTED: "COLLECTING", ON_THE_WAY: "OUT_FOR_DELIVERY", DELIVERED: "DELIVERED", CANCELLED: "CANCELLED" };

const TYPE_LABEL: Record<string, string> = { ALEY_TO_ALEY: "Aley → Aley", OUTSIDE_TO_ALEY: "Outside → Aley", ALEY_TO_OUTSIDE: "Aley → Outside", CUSTOM: "Custom route" };

function courierNext(status: string): { status: string; label: string } | null {
  const map: Record<string, { status: string; label: string }> = {
    ACCEPTED: { status: "HEADING_TO_PICKUP", label: "Heading to pickup" },
    HEADING_TO_PICKUP: { status: "PICKED_UP", label: "Mark picked up" },
    PICKED_UP: { status: "ON_THE_WAY", label: "On the way to customer" },
    ON_THE_WAY: { status: "DELIVERED", label: "Mark delivered" },
  };
  return map[status] ?? null;
}
function orderNext(norm: string): { status: string; label: string } | null {
  const map: Record<string, { status: string; label: string }> = {
    ACCEPTED: { status: "ON_THE_WAY", label: "Out for delivery" },
    ON_THE_WAY: { status: "DELIVERED", label: "Mark delivered" },
  };
  return map[norm] ?? null;
}

/* eslint-disable @typescript-eslint/no-explicit-any */
function courierJob(d: any) {
  return {
    kind: "courier" as const, id: d.id, number: d.number, typeLabel: TYPE_LABEL[d.type] ?? d.type,
    statusKey: d.status, next: courierNext(d.status), canAccept: d.status === "REQUESTED" && !d.driverId,
    pickupLabel: d.pickupLabel, pickupPhone: d.pickupPhone, pickupLat: d.pickupLat, pickupLng: d.pickupLng, pickupOutside: d.pickupOutside,
    dropoffLabel: d.dropoffLabel, dropoffLat: d.dropoffLat, dropoffLng: d.dropoffLng, dropoffOutside: d.dropoffOutside,
    itemDescription: d.itemDescription, packageType: d.packageType, packageSize: d.packageSize, urgency: d.urgency, preferredTime: d.preferredTime,
    distanceKm: d.distanceKm, amountLabel: d.finalPrice != null ? `$${d.finalPrice}` : `Est. $${d.estimatedMin}–$${d.estimatedMax}`,
    customerName: d.customerName, customerPhone: d.customerPhone, notes: d.notes, driverNotes: d.driverNotes, proofImage: d.proofImage,
    supportsProof: true, businesses: [], items: [], createdAt: d.createdAt,
  };
}
function orderJob(o: any) {
  const norm = ORDER_TO_NORM[o.deliveryStatus] ?? "REQUESTED";
  const businesses = o.businessOrders.map((bo: any) => ({ name: bo.business.name, address: bo.business.address, phone: bo.business.phone, lat: bo.business.lat, lng: bo.business.lng }));
  const firstGeo = o.businessOrders.map((bo: any) => bo.business).find((b: any) => b.lat != null && b.lng != null);
  const items = o.businessOrders.flatMap((bo: any) => bo.items.map((it: any) => ({ name: it.name, quantity: it.quantity })));
  return {
    kind: "order" as const, id: o.id, number: o.number, typeLabel: "Marketplace order",
    statusKey: norm, next: orderNext(norm), canAccept: o.deliveryStatus === "PENDING" && !o.driverId && o.status === "PLACED",
    pickupLabel: businesses.map((b: any) => b.name).join(", ") || "Pickup", pickupPhone: "", pickupLat: firstGeo?.lat ?? null, pickupLng: firstGeo?.lng ?? null, pickupOutside: false,
    dropoffLabel: o.address || "Customer address", dropoffLat: o.lat, dropoffLng: o.lng, dropoffOutside: false,
    itemDescription: items.map((it: any) => `${it.quantity}× ${it.name}`).join(", "), packageType: "Food/Goods", packageSize: "", urgency: "STANDARD", preferredTime: "",
    distanceKm: 0, amountLabel: `$${o.total} · delivery $${o.deliveryFee}${o.paymentMethod === "ONLINE" ? " · paid online" : " · cash"}`,
    customerName: o.customerName, customerPhone: o.customerPhone, notes: o.note, driverNotes: "", proofImage: null,
    supportsProof: false, businesses, items, createdAt: o.createdAt,
  };
}
/* eslint-enable @typescript-eslint/no-explicit-any */

const orderInclude = { businessOrders: { include: { items: true, business: { select: { name: true, address: true, phone: true, lat: true, lng: true } } } } };

// GET /api/driver/me — profile + live stats + earnings (courier + marketplace).
driverRouter.get("/me", async (req, res) => {
  const driver = await loadDriver(req);
  if (!driver) return res.status(404).json({ error: "Account not found." });
  const settings = await getDeliverySettings();
  const commissionPct = effectiveDriverCommission(driver.commissionRate, settings);
  const [courier, orders] = await Promise.all([
    prisma.deliveryRequest.findMany({ where: { driverId: driver.id } }),
    prisma.order.findMany({ where: { driverId: driver.id } }),
  ]);
  const activeCount = courier.filter((d) => COURIER_ACTIVE.includes(d.status)).length + orders.filter((o) => ORDER_ACTIVE.includes(o.deliveryStatus)).length;
  const deliveredCourier = courier.filter((d) => d.status === "DELIVERED");
  const deliveredOrders = orders.filter((o) => o.deliveryStatus === "DELIVERED");
  const earnings = deliveredCourier.reduce((s, d) => s + driverEarnings(d.finalPrice ?? d.estimatedMax, commissionPct).net, 0)
    + deliveredOrders.reduce((s, o) => s + driverEarnings(o.deliveryFee, commissionPct).net, 0);
  res.json({
    driver: safeDriver(driver),
    stats: { active: activeCount, delivered: deliveredCourier.length + deliveredOrders.length, total: courier.length + orders.length, commissionPct, earnings: Math.round(earnings * 100) / 100 },
  });
});

// GET /api/driver/available — open courier requests + marketplace delivery orders.
driverRouter.get("/available", async (req, res) => {
  const driver = await loadDriver(req);
  if (!driver || driver.status !== "ACTIVE") return res.json([]);
  const [courier, orders] = await Promise.all([
    prisma.deliveryRequest.findMany({ where: { status: "REQUESTED", driverId: null }, orderBy: { createdAt: "desc" }, take: 100 }),
    prisma.order.findMany({ where: { fulfillment: "DELIVERY", deliveryStatus: "PENDING", driverId: null, status: "PLACED" }, orderBy: { createdAt: "desc" }, take: 100, include: orderInclude }),
  ]);
  res.json([...courier.map(courierJob), ...orders.map(orderJob)].sort((a, b) => +new Date(b.createdAt) - +new Date(a.createdAt)));
});

// GET /api/driver/deliveries?filter=active|history — my jobs (courier + orders).
driverRouter.get("/deliveries", async (req, res) => {
  const filter = String(req.query.filter ?? "");
  const courierWhere: Record<string, unknown> = { driverId: req.driverId! };
  const orderWhere: Record<string, unknown> = { driverId: req.driverId! };
  if (filter === "active") { courierWhere.status = { in: COURIER_ACTIVE }; orderWhere.deliveryStatus = { in: ORDER_ACTIVE }; }
  else if (filter === "history") { courierWhere.status = { in: ["DELIVERED", "CANCELLED"] }; orderWhere.deliveryStatus = { in: ["DELIVERED", "CANCELLED"] }; }
  const [courier, orders] = await Promise.all([
    prisma.deliveryRequest.findMany({ where: courierWhere, orderBy: { createdAt: "desc" }, take: 200 }),
    prisma.order.findMany({ where: orderWhere, orderBy: { createdAt: "desc" }, take: 200, include: orderInclude }),
  ]);
  res.json([...courier.map(courierJob), ...orders.map(orderJob)].sort((a, b) => +new Date(b.createdAt) - +new Date(a.createdAt)));
});

// ---- Courier request actions ----
driverRouter.post("/deliveries/:id/accept", async (req, res) => {
  const driver = await loadDriver(req);
  if (!driver || driver.status !== "ACTIVE") return res.status(403).json({ error: "Your account isn't active yet." });
  const id = Number(req.params.id);
  const d = await prisma.deliveryRequest.findUnique({ where: { id } });
  if (!d) return res.status(404).json({ error: "Request not found." });
  if (d.driverId && d.driverId !== driver.id) return res.status(409).json({ error: "Already taken by another driver." });
  if (!["REQUESTED", "ACCEPTED"].includes(d.status)) return res.status(400).json({ error: "This request can't be accepted anymore." });
  res.json(await prisma.deliveryRequest.update({ where: { id }, data: { driverId: driver.id, driverName: driver.name, driverPhone: driver.phone, status: "ACCEPTED" } }));
});

driverRouter.post("/deliveries/:id/reject", async (req, res) => {
  const id = Number(req.params.id);
  const d = await prisma.deliveryRequest.findUnique({ where: { id } });
  if (!d || d.driverId !== req.driverId) return res.status(404).json({ error: "Request not found." });
  res.json(await prisma.deliveryRequest.update({ where: { id }, data: { driverId: null, driverName: "", driverPhone: "", status: "REQUESTED" } }));
});

driverRouter.patch("/deliveries/:id", async (req, res) => {
  const id = Number(req.params.id);
  const d = await prisma.deliveryRequest.findUnique({ where: { id } });
  if (!d || d.driverId !== req.driverId) return res.status(404).json({ error: "Request not found." });
  const b = req.body as Record<string, unknown>;
  const data: Record<string, unknown> = {};
  if ("status" in b && DRIVER_SETTABLE_STATUSES.includes(String(b.status))) data.status = b.status;
  if ("driverNotes" in b) data.driverNotes = STR(b.driverNotes, 1000);
  if ("proofImage" in b) data.proofImage = b.proofImage ? STR(b.proofImage, 500) : null;
  res.json(await prisma.deliveryRequest.update({ where: { id }, data }));
});

// ---- Marketplace order actions (driver delivers the order) ----
driverRouter.post("/orders/:id/accept", async (req, res) => {
  const driver = await loadDriver(req);
  if (!driver || driver.status !== "ACTIVE") return res.status(403).json({ error: "Your account isn't active yet." });
  const id = Number(req.params.id);
  const o = await prisma.order.findUnique({ where: { id } });
  if (!o || o.fulfillment !== "DELIVERY") return res.status(404).json({ error: "Order not found." });
  if (o.driverId && o.driverId !== driver.id) return res.status(409).json({ error: "Already taken by another driver." });
  if (o.deliveryStatus !== "PENDING") return res.status(400).json({ error: "This order can't be accepted anymore." });
  res.json(await prisma.order.update({ where: { id }, data: { driverId: driver.id, driverName: driver.name, deliveryStatus: "COLLECTING" } }));
});

driverRouter.post("/orders/:id/reject", async (req, res) => {
  const id = Number(req.params.id);
  const o = await prisma.order.findUnique({ where: { id } });
  if (!o || o.driverId !== req.driverId) return res.status(404).json({ error: "Order not found." });
  res.json(await prisma.order.update({ where: { id }, data: { driverId: null, driverName: "", deliveryStatus: "PENDING", status: "PLACED" } }));
});

driverRouter.patch("/orders/:id", async (req, res) => {
  const id = Number(req.params.id);
  const o = await prisma.order.findUnique({ where: { id } });
  if (!o || o.driverId !== req.driverId) return res.status(404).json({ error: "Order not found." });
  const norm = String((req.body as Record<string, unknown>).status ?? "");
  const deliveryStatus = NORM_TO_ORDER[norm];
  if (!deliveryStatus) return res.status(400).json({ error: "Invalid status." });
  const data: Record<string, unknown> = { deliveryStatus };
  if (deliveryStatus === "DELIVERED") data.status = "COMPLETED";
  if (deliveryStatus === "CANCELLED") data.status = "CANCELLED";
  res.json(await prisma.order.update({ where: { id }, data }));
});
