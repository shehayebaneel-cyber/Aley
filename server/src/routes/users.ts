import bcrypt from "bcryptjs";
import { Router } from "express";
import { requireUser, signToken } from "../auth";
import { prisma } from "../db";
import { computeSlots, resolveBookingConfig } from "../lib/booking";
import { facilitySlots, priceFor, resolveFacilityPricing, resolveFacilitySchedule, _toMin } from "../lib/facility";
import { effectiveStatus } from "../lib/voucher";
import { outBusiness, parseArr, type HoursRow } from "../lib/serialize";
import { notifyNextWaitlist } from "../lib/waitlist";
import { addWalletEntry, walletSummary } from "../lib/wallet";
import { outOffer } from "../lib/offers";
import { eventCountsFor, outEvent } from "../lib/events";
import { requestStatus } from "../lib/parts";
import { outVoucherCard, voucherAvailable } from "../lib/voucher";
import { parseObj } from "../lib/serialize";

const userToken = (id: number) => signToken({ userId: id, role: "user" });
const STR = (v: unknown, max: number) => String(v ?? "").trim().slice(0, max);
const safe = (u: { id: number; name: string; email: string | null; avatar: string | null }) => ({ id: u.id, name: u.name, email: u.email, avatar: u.avatar });

// ---- Visitor authentication ----
export const userAuthRouter = Router();

userAuthRouter.post("/register", async (req, res) => {
  const name = String(req.body.name ?? "").trim();
  const email = String(req.body.email ?? "").trim().toLowerCase();
  const password = String(req.body.password ?? "");
  if (!name || !email || password.length < 6) return res.status(400).json({ error: "Name, email, and a password (6+ chars) are required." });
  if (await prisma.user.findUnique({ where: { email } })) return res.status(409).json({ error: "An account with this email already exists." });
  const user = await prisma.user.create({ data: { name, email, passwordHash: await bcrypt.hash(password, 10) } });
  res.status(201).json({ token: userToken(user.id), user: safe(user) });
});

userAuthRouter.post("/login", async (req, res) => {
  const email = String(req.body.email ?? "").trim().toLowerCase();
  const password = String(req.body.password ?? "");
  const user = await prisma.user.findUnique({ where: { email } });
  if (!user || !user.passwordHash || !(await bcrypt.compare(password, user.passwordHash))) {
    return res.status(401).json({ error: "Wrong email or password." });
  }
  res.json({ token: userToken(user.id), user: safe(user) });
});

// ---- Visitor account (token required) ----
export const userRouter = Router();
userRouter.use(requireUser);

// GET /api/me — profile + saved business slugs
userRouter.get("/", async (req, res) => {
  const user = await prisma.user.findUnique({ where: { id: req.userId! } });
  if (!user) return res.status(404).json({ error: "Account not found." });
  const [favorites, savedOffers] = await Promise.all([
    prisma.favorite.findMany({ where: { userId: user.id }, select: { businessId: true } }),
    prisma.offerSave.findMany({ where: { userId: user.id }, select: { offerId: true } }),
  ]);
  res.json({ user: safe(user), favoriteIds: favorites.map((f) => f.businessId), savedOfferIds: savedOffers.map((s) => s.offerId) });
});

// GET /api/me/favorites — full saved businesses
userRouter.get("/favorites", async (req, res) => {
  const favorites = await prisma.favorite.findMany({
    where: { userId: req.userId! },
    orderBy: { createdAt: "desc" },
    include: { business: { include: { category: true } } },
  });
  res.json(favorites.map((f) => outBusiness(f.business)));
});

// POST /api/me/favorites/:businessId — save
userRouter.post("/favorites/:businessId", async (req, res) => {
  const businessId = Number(req.params.businessId);
  const business = await prisma.business.findUnique({ where: { id: businessId } });
  if (!business) return res.status(404).json({ error: "Business not found." });
  await prisma.favorite.upsert({
    where: { userId_businessId: { userId: req.userId!, businessId } },
    create: { userId: req.userId!, businessId },
    update: {},
  });
  res.status(201).json({ ok: true, favorited: true });
});

// DELETE /api/me/favorites/:businessId — unsave
userRouter.delete("/favorites/:businessId", async (req, res) => {
  const businessId = Number(req.params.businessId);
  await prisma.favorite.deleteMany({ where: { userId: req.userId!, businessId } });
  res.json({ ok: true, favorited: false });
});

// GET /api/me/orders — this customer's marketplace orders
userRouter.get("/orders", async (req, res) => {
  const orders = await prisma.order.findMany({
    where: { customerId: req.userId! },
    orderBy: { createdAt: "desc" },
    take: 50,
    include: { businessOrders: { include: { items: true, business: { select: { name: true, slug: true, logo: true } } } } },
  });
  res.json(orders);
});

// GET /api/me/bookings — the visitor's own appointments.
userRouter.get("/bookings", async (req, res) => {
  const bookings = await prisma.appointment.findMany({
    where: { userId: req.userId! },
    orderBy: [{ date: "desc" }, { time: "desc" }],
    take: 50,
    include: { business: { select: { name: true, slug: true, logo: true } } },
  });
  res.json(bookings);
});

const hoursUntil = (date: string, time: string) => (new Date(`${date}T${time}:00`).getTime() - Date.now()) / 3_600_000;

// PATCH /api/me/bookings/:id — customer self-service cancel or reschedule (if the business allows it).
userRouter.patch("/bookings/:id", async (req, res) => {
  const appt = await prisma.appointment.findUnique({
    where: { id: Number(req.params.id) },
    include: { business: { include: { category: { select: { slug: true } } } } },
  });
  if (!appt || appt.userId !== req.userId) return res.status(404).json({ error: "Appointment not found." });
  if (["CANCELLED", "COMPLETED", "NO_SHOW"].includes(appt.status)) return res.status(400).json({ error: "This appointment can't be changed anymore." });

  const cfg = resolveBookingConfig(appt.business.bookingConfig);
  const action = String(req.body?.action ?? "");

  if (action === "cancel") {
    if (!cfg.allowCustomerCancel) return res.status(403).json({ error: "This business doesn't allow online cancellation." });
    if (hoursUntil(appt.date, appt.time) < cfg.cancellationHours) return res.status(400).json({ error: `Please cancel at least ${cfg.cancellationHours} hours before.` });
    const updated = await prisma.appointment.update({ where: { id: appt.id }, data: { status: "CANCELLED" } });
    await notifyNextWaitlist(appt.businessId, appt.date);
    return res.json(updated);
  }

  if (action === "reschedule") {
    if (!cfg.allowCustomerReschedule) return res.status(403).json({ error: "This business doesn't allow online rescheduling." });
    if (hoursUntil(appt.date, appt.time) < cfg.cancellationHours) return res.status(400).json({ error: `Please reschedule at least ${cfg.cancellationHours} hours before.` });
    const date = String(req.body?.date ?? "");
    const time = String(req.body?.time ?? "");
    if (!/^\d{4}-\d{2}-\d{2}$/.test(date) || !/^\d{2}:\d{2}$/.test(time)) return res.status(400).json({ error: "A valid new date and time are required." });

    const existing = await prisma.appointment.findMany({
      where: { businessId: appt.businessId, date, id: { not: appt.id } },
      select: { time: true, durationMin: true, staffId: true, status: true },
    });
    const free = computeSlots({
      config: cfg,
      businessHours: parseArr(appt.business.hours) as HoursRow[],
      dateStr: date,
      durationMin: appt.durationMin,
      existing: existing.map((e) => ({ ...e, staffId: e.staffId ?? null })),
      staffId: appt.staffId,
      now: new Date(),
    });
    if (!free.includes(time)) return res.status(409).json({ error: "That time isn't available. Please pick another." });
    const updated = await prisma.appointment.update({ where: { id: appt.id }, data: { date, time, status: "RESCHEDULED" } });
    return res.json(updated);
  }

  res.status(400).json({ error: "Unknown action." });
});

// GET /api/me/facility-bookings — the visitor's own court/field bookings.
userRouter.get("/facility-bookings", async (req, res) => {
  const bookings = await prisma.facilityBooking.findMany({
    where: { userId: req.userId! },
    orderBy: [{ date: "desc" }, { startTime: "desc" }],
    take: 50,
    include: { business: { select: { name: true, slug: true, logo: true } } },
  });
  res.json(bookings);
});

// GET /api/me/vouchers — gift vouchers the visitor bought or received (by email).
userRouter.get("/vouchers", async (req, res) => {
  const user = await prisma.user.findUnique({ where: { id: req.userId! } });
  const where = { OR: [{ purchaserUserId: req.userId! }, ...(user?.email ? [{ recipientEmail: user.email }] : [])] };
  const vouchers = await prisma.voucher.findMany({
    where, orderBy: { createdAt: "desc" }, take: 50,
    include: { business: { select: { name: true, slug: true, logo: true } } },
  });
  res.json(vouchers.map((v) => ({
    code: v.code, kind: v.kind, title: v.title, value: v.value, balance: v.balance,
    status: effectiveStatus(v), expiresAt: v.expiresAt, deliverAt: v.deliverAt, message: v.message,
    recipientName: v.recipientName, mine: v.purchaserUserId === req.userId, business: v.business, createdAt: v.createdAt,
  })));
});

// PATCH /api/me/facility-bookings/:id — customer cancel or reschedule.
userRouter.patch("/facility-bookings/:id", async (req, res) => {
  const fb = await prisma.facilityBooking.findUnique({
    where: { id: Number(req.params.id) },
    include: { business: { select: { hours: true } }, facility: true },
  });
  if (!fb || fb.userId !== req.userId) return res.status(404).json({ error: "Booking not found." });
  if (["CANCELLED", "COMPLETED", "NO_SHOW"].includes(fb.status)) return res.status(400).json({ error: "This booking can't be changed anymore." });
  const action = String(req.body?.action ?? "");

  if (action === "cancel") {
    if (hoursUntil(fb.date, fb.startTime) < 2) return res.status(400).json({ error: "Please cancel at least 2 hours before." });
    return res.json(await prisma.facilityBooking.update({ where: { id: fb.id }, data: { status: "CANCELLED" } }));
  }
  if (action === "reschedule") {
    if (hoursUntil(fb.date, fb.startTime) < 2) return res.status(400).json({ error: "Please reschedule at least 2 hours before." });
    const date = String(req.body?.date ?? ""); const startTime = String(req.body?.time ?? req.body?.startTime ?? "");
    if (!/^\d{4}-\d{2}-\d{2}$/.test(date) || !/^\d{2}:\d{2}$/.test(startTime)) return res.status(400).json({ error: "A valid new date and time are required." });
    const pricing = resolveFacilityPricing(fb.facility.pricing);
    const existing = await prisma.facilityBooking.findMany({ where: { facilityId: fb.facilityId, date, id: { not: fb.id } }, select: { startTime: true, durationMin: true, status: true } });
    const free = facilitySlots({ hourlyRate: fb.facility.hourlyRate, pricing, schedule: resolveFacilitySchedule(fb.facility.schedule), businessHours: parseArr(fb.business.hours) as HoursRow[], dateStr: date, durationMin: fb.durationMin, existing, now: new Date() });
    if (!free.some((s) => s.time === startTime)) return res.status(409).json({ error: "That slot isn't available." });
    const price = priceFor(fb.facility.hourlyRate, pricing, date, _toMin(startTime), fb.durationMin);
    return res.json(await prisma.facilityBooking.update({ where: { id: fb.id }, data: { date, startTime, price } }));
  }
  res.status(400).json({ error: "Unknown action." });
});

// ---- Notifications (messages from businesses the customer follows/uses) ----
userRouter.get("/notifications", async (req, res) => {
  const [items, unread] = await Promise.all([
    prisma.customerNotification.findMany({ where: { userId: req.userId! }, orderBy: { id: "desc" }, take: 50 }),
    prisma.customerNotification.count({ where: { userId: req.userId!, isRead: false } }),
  ]);
  res.json({ items, unread });
});
userRouter.post("/notifications/read-all", async (req, res) => {
  await prisma.customerNotification.updateMany({ where: { userId: req.userId!, isRead: false }, data: { isRead: true } });
  res.json({ ok: true });
});
userRouter.post("/notifications/:id/read", async (req, res) => {
  await prisma.customerNotification.updateMany({ where: { id: Number(req.params.id), userId: req.userId! }, data: { isRead: true } });
  res.json({ ok: true });
});

// ---- Chat with businesses ----
userRouter.get("/chats", async (req, res) => {
  const convos = await prisma.conversation.findMany({
    where: { userId: req.userId! }, orderBy: { lastMessageAt: "desc" }, take: 50,
    include: { business: { select: { slug: true, name: true, logo: true } } },
  });
  res.json(convos.map((c) => ({ id: c.id, businessId: c.businessId, business: c.business, lastMessage: c.lastMessage, lastSender: c.lastSender, lastMessageAt: c.lastMessageAt, unread: c.unreadCustomer })));
});
userRouter.get("/chats/unread", async (req, res) => {
  const agg = await prisma.conversation.aggregate({ where: { userId: req.userId! }, _sum: { unreadCustomer: true } });
  res.json({ unread: agg._sum.unreadCustomer ?? 0 });
});
userRouter.get("/chats/with/:businessId", async (req, res) => {
  const businessId = Number(req.params.businessId);
  const business = await prisma.business.findUnique({ where: { id: businessId }, select: { id: true, slug: true, name: true, logo: true } });
  if (!business) return res.status(404).json({ error: "Business not found." });
  const convo = await prisma.conversation.findUnique({ where: { businessId_userId: { businessId, userId: req.userId! } } });
  if (!convo) return res.json({ business, conversationId: null, messages: [] });
  if (convo.unreadCustomer > 0) await prisma.conversation.update({ where: { id: convo.id }, data: { unreadCustomer: 0 } });
  const messages = await prisma.message.findMany({ where: { conversationId: convo.id }, orderBy: { id: "asc" }, take: 200 });
  res.json({ business, conversationId: convo.id, messages });
});
userRouter.post("/chats/with/:businessId", async (req, res) => {
  const businessId = Number(req.params.businessId);
  const body = STR(req.body?.body, 2000);
  if (!body) return res.status(400).json({ error: "Message can't be empty." });
  const business = await prisma.business.findUnique({ where: { id: businessId } });
  if (!business || !business.isPublished) return res.status(404).json({ error: "Business not found." });
  const user = await prisma.user.findUnique({ where: { id: req.userId! } });
  const convo = await prisma.conversation.upsert({
    where: { businessId_userId: { businessId, userId: req.userId! } },
    create: { businessId, userId: req.userId!, customerName: user?.name ?? "", lastMessage: body, lastSender: "CUSTOMER", lastMessageAt: new Date(), unreadBusiness: 1 },
    update: { lastMessage: body, lastSender: "CUSTOMER", lastMessageAt: new Date(), unreadBusiness: { increment: 1 }, customerName: user?.name || undefined },
  });
  const message = await prisma.message.create({ data: { conversationId: convo.id, sender: "CUSTOMER", body } });
  res.status(201).json({ conversationId: convo.id, message });
});

// ---- Wallet (prepaid balance) ----
const TOPUP_METHODS = new Set(["CARD", "WHISH"]);

// GET /api/me/wallet — balance + recent activity + lifetime totals.
userRouter.get("/wallet", async (req, res) => {
  res.json(await walletSummary(req.userId!));
});

// POST /api/me/wallet/topup — load money. MOCK gateway: succeeds instantly and
// records a COMPLETED top-up. A real provider would create a PENDING entry and
// confirm it on webhook (the ledger already supports that status).
userRouter.post("/wallet/topup", async (req, res) => {
  const amount = Math.round((Number(req.body?.amount) || 0) * 100) / 100;
  const method = String(req.body?.method ?? "CARD").toUpperCase();
  if (!(amount > 0)) return res.status(400).json({ error: "Enter an amount to load." });
  if (amount < 1) return res.status(400).json({ error: "The minimum top-up is $1." });
  if (amount > 1000) return res.status(400).json({ error: "The maximum top-up is $1,000 at a time." });
  if (!TOPUP_METHODS.has(method)) return res.status(400).json({ error: "Unsupported payment method." });
  await addWalletEntry({ userId: req.userId!, type: "TOPUP", amount, method, source: "TOPUP", description: `Wallet top-up · ${method === "WHISH" ? "Whish" : "Card"}` });
  res.status(201).json(await walletSummary(req.userId!));
});

// ---- Saved & claimed offers ----
const OFFER_BIZ = { slug: true, name: true, logo: true, cover: true, address: true, rating: true, reviewCount: true, category: { select: { slug: true, name: true, group: true, icon: true, color: true } } } as const;

// GET /api/me/offers — saved deals + claimed deals (with codes).
userRouter.get("/offers", async (req, res) => {
  const [saves, claims] = await Promise.all([
    prisma.offerSave.findMany({ where: { userId: req.userId! }, orderBy: { createdAt: "desc" }, include: { offer: { include: { business: { select: OFFER_BIZ } } } } }),
    prisma.offerRedemption.findMany({ where: { userId: req.userId! }, orderBy: { createdAt: "desc" }, take: 50, include: { offer: { include: { business: { select: OFFER_BIZ } } } } }),
  ]);
  res.json({
    saved: saves.filter((s) => s.offer?.isActive).map((s) => outOffer(s.offer, { saved: true })),
    claimed: claims.map((c) => ({ code: c.code, status: c.status, createdAt: c.createdAt, redeemedAt: c.redeemedAt, offer: c.offer ? outOffer(c.offer) : null })),
  });
});

// POST /api/me/offers/:id/save — bookmark a deal.
userRouter.post("/offers/:id/save", async (req, res) => {
  const offerId = Number(req.params.id);
  const offer = await prisma.offer.findUnique({ where: { id: offerId } });
  if (!offer) return res.status(404).json({ error: "Offer not found." });
  await prisma.offerSave.upsert({ where: { userId_offerId: { userId: req.userId!, offerId } }, create: { userId: req.userId!, offerId }, update: {} });
  res.json({ ok: true, saved: true });
});

// DELETE /api/me/offers/:id/save — remove bookmark.
userRouter.delete("/offers/:id/save", async (req, res) => {
  await prisma.offerSave.deleteMany({ where: { userId: req.userId!, offerId: Number(req.params.id) } });
  res.json({ ok: true, saved: false });
});

// ---- Events: saved, going & tickets ----
const EVENT_BIZ = { slug: true, name: true, logo: true, cover: true, category: { select: { slug: true, name: true, group: true, icon: true, color: true } } } as const;

// GET /api/me/events — saved events, events I'm going to, and my ticket bookings.
userRouter.get("/events", async (req, res) => {
  const [saves, rsvps, bookings] = await Promise.all([
    prisma.eventSave.findMany({ where: { userId: req.userId! }, orderBy: { createdAt: "desc" }, include: { event: { include: { business: { select: EVENT_BIZ }, ticketTypes: true } } } }),
    prisma.eventRSVP.findMany({ where: { userId: req.userId!, status: { in: ["GOING", "MAYBE"] } }, include: { event: { include: { business: { select: EVENT_BIZ }, ticketTypes: true } } } }),
    prisma.eventBooking.findMany({ where: { userId: req.userId! }, orderBy: { createdAt: "desc" }, take: 50, include: { event: { include: { business: { select: EVENT_BIZ }, ticketTypes: true } }, ticketType: { select: { name: true, kind: true } } } }),
  ]);
  const ids = [...new Set([...saves.map((s) => s.eventId), ...rsvps.map((r) => r.eventId)])];
  const counts = await eventCountsFor(ids);
  res.json({
    saved: saves.filter((s) => s.event?.isPublished).map((s) => outEvent(s.event, { counts: counts.get(s.eventId), saved: true })),
    going: rsvps.filter((r) => r.event?.isPublished).map((r) => outEvent(r.event, { counts: counts.get(r.eventId), myRsvp: r.status })),
    bookings: bookings.map((b) => ({ code: b.code, quantity: b.quantity, amount: b.amount, method: b.method, status: b.status, ticket: b.ticketType, createdAt: b.createdAt, event: b.event ? outEvent(b.event, {}) : null })),
  });
});

// POST/DELETE /api/me/events/:id/save — bookmark an event.
userRouter.post("/events/:id/save", async (req, res) => {
  const eventId = Number(req.params.id);
  if (!(await prisma.event.findUnique({ where: { id: eventId } }))) return res.status(404).json({ error: "Event not found." });
  await prisma.eventSave.upsert({ where: { eventId_userId: { eventId, userId: req.userId! } }, create: { eventId, userId: req.userId! }, update: {} });
  res.json({ ok: true, saved: true });
});
userRouter.delete("/events/:id/save", async (req, res) => {
  await prisma.eventSave.deleteMany({ where: { userId: req.userId!, eventId: Number(req.params.id) } });
  res.json({ ok: true, saved: false });
});

// ---- Saved gift cards ----
const VCARD_BIZ = { slug: true, name: true, logo: true, cover: true, category: { select: { slug: true, name: true, group: true, icon: true, color: true } } } as const;
userRouter.get("/gift-cards", async (req, res) => {
  const saves = await prisma.voucherSave.findMany({ where: { userId: req.userId! }, orderBy: { createdAt: "desc" }, include: { voucherType: { include: { business: { select: VCARD_BIZ } } } } });
  res.json(saves.filter((s) => s.voucherType?.status === "ACTIVE" && voucherAvailable(s.voucherType)).map((s) => outVoucherCard(s.voucherType)));
});
userRouter.post("/gift-cards/:id/save", async (req, res) => {
  const voucherTypeId = Number(req.params.id);
  if (!(await prisma.voucherType.findUnique({ where: { id: voucherTypeId } }))) return res.status(404).json({ error: "Gift card not found." });
  await prisma.voucherSave.upsert({ where: { voucherTypeId_userId: { voucherTypeId, userId: req.userId! } }, create: { voucherTypeId, userId: req.userId! }, update: {} });
  res.json({ ok: true, saved: true });
});
userRouter.delete("/gift-cards/:id/save", async (req, res) => {
  await prisma.voucherSave.deleteMany({ where: { userId: req.userId!, voucherTypeId: Number(req.params.id) } });
  res.json({ ok: true, saved: false });
});

// ---- Saved vehicles (garage) ----
userRouter.get("/vehicles", async (req, res) => {
  res.json(await prisma.userVehicle.findMany({ where: { userId: req.userId! }, orderBy: { id: "asc" } }));
});
userRouter.post("/vehicles", async (req, res) => {
  const b = req.body ?? {};
  const make = STR(b.make, 40);
  if (!make) return res.status(400).json({ error: "Car make is required to save a vehicle." });
  const v = await prisma.userVehicle.create({ data: {
    userId: req.userId!, label: STR(b.label, 40), make, model: STR(b.model, 60), year: STR(b.year, 8),
    engine: STR(b.engine, 40), vin: STR(b.vin, 40), plate: STR(b.plate, 20),
  } });
  res.status(201).json(v);
});
userRouter.delete("/vehicles/:id", async (req, res) => {
  await prisma.userVehicle.deleteMany({ where: { id: Number(req.params.id), userId: req.userId! } });
  res.json({ ok: true });
});

// ---- Saved Discover collections ----
userRouter.get("/collections", async (req, res) => {
  const saves = await prisma.collectionSave.findMany({
    where: { userId: req.userId! }, orderBy: { createdAt: "desc" },
    include: { collection: { include: { items: { include: { business: { select: { cover: true } } }, take: 1 }, _count: { select: { items: true } } } } },
  });
  res.json(saves.filter((s) => s.collection?.isActive).map((s) => {
    const c = s.collection;
    return { id: c.id, slug: c.slug, title: c.title, description: c.description, emoji: c.emoji, coverImage: c.coverImage || c.items[0]?.business?.cover || null, count: c._count.items };
  }));
});
userRouter.post("/collections/:id/save", async (req, res) => {
  const collectionId = Number(req.params.id);
  if (!(await prisma.collection.findUnique({ where: { id: collectionId } }))) return res.status(404).json({ error: "Collection not found." });
  await prisma.collectionSave.upsert({ where: { collectionId_userId: { collectionId, userId: req.userId! } }, create: { collectionId, userId: req.userId! }, update: {} });
  res.json({ ok: true, saved: true });
});
userRouter.delete("/collections/:id/save", async (req, res) => {
  await prisma.collectionSave.deleteMany({ where: { userId: req.userId!, collectionId: Number(req.params.id) } });
  res.json({ ok: true, saved: false });
});

// ---- Spare-parts (RFQ) requests the customer submitted ----
const QUOTE_BIZ = { slug: true, name: true, logo: true, rating: true, reviewCount: true, phone: true, whatsapp: true } as const;

// GET /api/me/part-requests — my requests + the quotes shops sent back.
userRouter.get("/part-requests", async (req, res) => {
  const reqs = await prisma.serviceRequest.findMany({
    where: { userId: req.userId! }, orderBy: { createdAt: "desc" }, take: 50,
    include: { quotes: { orderBy: { createdAt: "asc" }, include: { business: { select: QUOTE_BIZ } } }, _count: { select: { targets: true } } },
  });
  res.json(reqs.map((r) => ({
    id: r.id, type: r.type, categorySlug: r.categorySlug, payload: parseObj(r.payload), notes: r.notes, photos: parseArr(r.photos),
    city: r.city, budget: r.budget, status: requestStatus(r), selectedQuoteId: r.selectedQuoteId,
    createdAt: r.createdAt, expiresAt: r.expiresAt, sentTo: r._count.targets,
    quotes: r.quotes.map((q) => ({ id: q.id, available: q.available, price: q.price, eta: q.eta, offersDelivery: q.offersDelivery, note: q.note, photos: parseArr(q.photos), status: q.status, createdAt: q.createdAt, business: q.business })),
  })));
});

// POST /api/me/part-requests/:id/accept { quoteId } — choose a shop's offer.
userRouter.post("/part-requests/:id/accept", async (req, res) => {
  const id = Number(req.params.id);
  const r = await prisma.serviceRequest.findFirst({ where: { id, userId: req.userId! } });
  if (!r) return res.status(404).json({ error: "Request not found." });
  const quoteId = Number(req.body?.quoteId);
  const quote = await prisma.serviceQuote.findFirst({ where: { id: quoteId, requestId: id } });
  if (!quote) return res.status(404).json({ error: "Offer not found." });
  await prisma.$transaction([
    prisma.serviceQuote.update({ where: { id: quote.id }, data: { status: "ACCEPTED" } }),
    prisma.serviceQuote.updateMany({ where: { requestId: id, id: { not: quote.id } }, data: { status: "DECLINED" } }),
    prisma.serviceRequest.update({ where: { id }, data: { status: "SELECTED", selectedQuoteId: quote.id } }),
  ]);
  res.json({ ok: true, status: "SELECTED", selectedQuoteId: quote.id });
});

// POST /api/me/part-requests/:id/:action — complete | cancel.
userRouter.post("/part-requests/:id/:action", async (req, res) => {
  const id = Number(req.params.id);
  const action = req.params.action;
  const status = action === "complete" ? "COMPLETED" : action === "cancel" ? "CANCELLED" : null;
  if (!status) return res.status(400).json({ error: "Unknown action." });
  const r = await prisma.serviceRequest.findFirst({ where: { id, userId: req.userId! } });
  if (!r) return res.status(404).json({ error: "Request not found." });
  await prisma.serviceRequest.update({ where: { id }, data: { status } });
  res.json({ ok: true, status });
});
