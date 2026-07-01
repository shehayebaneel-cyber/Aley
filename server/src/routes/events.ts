import { Router } from "express";
import { optionalUser } from "../auth";
import { prisma } from "../db";
import { recordTransaction } from "../lib/ledger";
import { notifyAdmins } from "../lib/notify";
import { chargeWallet, walletBalance } from "../lib/wallet";
import { eventCountsFor, outEvent, uniqueEventCode } from "../lib/events";

export const eventsRouter = Router();
const STR = (v: unknown, max: number) => String(v ?? "").trim().slice(0, max);

const BIZ = { slug: true, name: true, logo: true, cover: true, phone: true, whatsapp: true, category: { select: { slug: true, name: true, group: true, icon: true, color: true } } } as const;
const upcomingWhere = (city?: string, category?: string) => ({
  isPublished: true,
  startTime: { gte: new Date(Date.now() - 6 * 3600_000) }, // keep events that started in the last 6h
  ...(city ? { city: { is: { slug: city } } } : {}),
  ...(category ? { category } : {}),
});

// GET /api/events — discovery feed (enriched; client buckets into time sections).
eventsRouter.get("/", optionalUser, async (req, res) => {
  const q = req.query as Record<string, string>;
  const events = await prisma.event.findMany({
    where: upcomingWhere(q.city, q.category),
    orderBy: { startTime: "asc" },
    include: { business: { select: BIZ }, ticketTypes: true },
  });
  const counts = await eventCountsFor(events.map((e) => e.id));
  let saved = new Set<number>(), rsvp = new Map<number, string>();
  if (req.userId) {
    const [s, r] = await Promise.all([
      prisma.eventSave.findMany({ where: { userId: req.userId }, select: { eventId: true } }),
      prisma.eventRSVP.findMany({ where: { userId: req.userId }, select: { eventId: true, status: true } }),
    ]);
    saved = new Set(s.map((x) => x.eventId));
    rsvp = new Map(r.map((x) => [x.eventId, x.status]));
  }
  res.json(events.map((e) => outEvent(e, { counts: counts.get(e.id), saved: saved.has(e.id), myRsvp: rsvp.get(e.id) ?? null })));
});

// GET /api/events/:id — full detail + tickets + similar + nearby businesses.
eventsRouter.get("/:id", optionalUser, async (req, res) => {
  const id = Number(req.params.id);
  const event = await prisma.event.findUnique({ where: { id }, include: { business: { select: { ...BIZ, id: true, categoryId: true, address: true, rating: true, reviewCount: true } }, ticketTypes: true } });
  if (!event || !event.isPublished) return res.status(404).json({ error: "Event not found." });
  prisma.event.update({ where: { id }, data: { viewCount: { increment: 1 } } }).catch(() => {});

  const counts = (await eventCountsFor([id])).get(id);
  const saved = req.userId ? !!(await prisma.eventSave.findUnique({ where: { eventId_userId: { eventId: id, userId: req.userId } } })) : false;
  const myRsvp = req.userId ? (await prisma.eventRSVP.findUnique({ where: { eventId_userId: { eventId: id, userId: req.userId } } }))?.status ?? null : null;

  const similarRows = await prisma.event.findMany({
    where: { ...upcomingWhere(undefined, event.category), id: { not: id } },
    orderBy: { startTime: "asc" }, take: 6, include: { business: { select: BIZ }, ticketTypes: true },
  });
  const sc = await eventCountsFor(similarRows.map((e) => e.id));

  // Nearby = other businesses in the same category & city (handy "while you're there").
  const nearby = event.business ? await prisma.business.findMany({
    where: { isPublished: true, cityId: event.cityId, categoryId: event.business.categoryId, id: { not: event.business.id } },
    orderBy: { rating: "desc" }, take: 4, include: { category: { select: { name: true, icon: true } } },
  }) : [];

  res.json({
    ...outEvent(event, { counts, saved, myRsvp, includeTickets: true }),
    organizerEmail: event.organizerEmail,
    business: event.business ? { slug: event.business.slug, name: event.business.name, logo: event.business.logo, cover: event.business.cover, address: event.business.address, rating: event.business.rating, reviewCount: event.business.reviewCount, phone: event.business.phone, whatsapp: event.business.whatsapp, category: event.business.category } : null,
    similar: similarRows.map((e) => outEvent(e, { counts: sc.get(e.id) })),
    nearby: nearby.map((b) => ({ slug: b.slug, name: b.name, logo: b.logo, rating: b.rating, category: b.category })),
  });
});

// POST /api/events/:id/rsvp { status: INTERESTED|GOING|MAYBE } — requires sign-in.
eventsRouter.post("/:id/rsvp", optionalUser, async (req, res) => {
  if (!req.userId) return res.status(401).json({ error: "Please sign in to RSVP." });
  const id = Number(req.params.id);
  const status = String(req.body?.status ?? "").toUpperCase();
  if (!["INTERESTED", "GOING", "MAYBE"].includes(status)) return res.status(400).json({ error: "Invalid RSVP." });
  const event = await prisma.event.findUnique({ where: { id } });
  if (!event) return res.status(404).json({ error: "Event not found." });
  await prisma.eventRSVP.upsert({ where: { eventId_userId: { eventId: id, userId: req.userId } }, create: { eventId: id, userId: req.userId, status }, update: { status } });
  res.json({ ok: true, status, counts: (await eventCountsFor([id])).get(id) });
});
eventsRouter.delete("/:id/rsvp", optionalUser, async (req, res) => {
  if (!req.userId) return res.status(401).json({ error: "Please sign in." });
  const id = Number(req.params.id);
  await prisma.eventRSVP.deleteMany({ where: { eventId: id, userId: req.userId } });
  res.json({ ok: true, status: null, counts: (await eventCountsFor([id])).get(id) });
});

// POST /api/events/:id/book — reserve (free) or buy tickets. Paid → wallet / card (mock) / pay at venue.
eventsRouter.post("/:id/book", optionalUser, async (req, res) => {
  const id = Number(req.params.id);
  const event = await prisma.event.findUnique({ where: { id }, include: { ticketTypes: true } });
  if (!event || !event.isPublished) return res.status(404).json({ error: "Event not found." });

  const quantity = Math.max(1, Math.min(20, Math.round(Number(req.body?.quantity) || 1)));
  const ticketTypeId = req.body?.ticketTypeId ? Number(req.body.ticketTypeId) : null;
  const tt = ticketTypeId ? event.ticketTypes.find((t) => t.id === ticketTypeId && t.isActive) : null;
  if (ticketTypeId && !tt) return res.status(404).json({ error: "Ticket type not available." });

  // Capacity checks.
  const counts = (await eventCountsFor([id])).get(id)!;
  if (event.capacity > 0 && counts.booked + quantity > event.capacity) return res.status(409).json({ error: "Not enough capacity left for this event." });
  if (tt && tt.quantity > 0 && tt.soldCount + quantity > tt.quantity) return res.status(409).json({ error: "Not enough tickets left in this tier." });

  let customerName = STR(req.body?.customerName, 80);
  const customerPhone = STR(req.body?.customerPhone, 40);
  const customerEmail = STR(req.body?.customerEmail, 120);
  if (req.userId && !customerName) customerName = (await prisma.user.findUnique({ where: { id: req.userId } }))?.name ?? "";
  if (!customerName) return res.status(400).json({ error: "Your name is required to book." });

  const unit = tt?.price ?? 0;
  const amount = Math.round(unit * quantity * 100) / 100;
  const free = amount <= 0;
  let method = "FREE";
  if (!free) {
    const pm = String(req.body?.paymentMethod ?? "CARD").toUpperCase();
    method = ["WALLET", "CARD", "PAY_AT_VENUE"].includes(pm) ? pm : "CARD";
    if (method === "WALLET") {
      if (!req.userId) return res.status(401).json({ error: "Please sign in to pay with your wallet." });
      const bal = await walletBalance(req.userId);
      if (bal < amount) return res.status(402).json({ error: "Your wallet balance is too low for these tickets.", code: "INSUFFICIENT_FUNDS", balance: bal, total: amount });
    }
  }

  const code = await uniqueEventCode();
  const booking = await prisma.eventBooking.create({
    data: { eventId: id, ticketTypeId: tt?.id ?? null, businessId: event.businessId ?? null, userId: req.userId ?? null, customerName, customerPhone, customerEmail, quantity, amount, method, status: "CONFIRMED", code },
  });
  if (tt) await prisma.eventTicketType.update({ where: { id: tt.id }, data: { soldCount: { increment: quantity } } });

  // Paid tickets: charge wallet + record business revenue in the ledger (source EVENT).
  if (!free && req.userId && method === "WALLET") {
    await chargeWallet({ userId: req.userId, amount, source: "ORDER", refId: booking.id, code, description: `Tickets · ${event.title}` });
  }
  if (!free && event.businessId) {
    await recordTransaction({
      businessId: event.businessId, source: "EVENT", refId: booking.id, code, description: `Tickets · ${event.title} (${quantity})`,
      customerName, customerPhone, userId: req.userId ?? null, amount,
      status: method === "PAY_AT_VENUE" ? "PENDING" : "PAID",
      method: method === "WALLET" ? "WALLET" : method === "PAY_AT_VENUE" ? "CASH" : "CARD",
    });
  }
  await notifyAdmins({ kind: "EVENT_BOOKING", title: `Event booking: ${event.title}`, body: `${customerName} booked ${quantity} ${free ? "spot(s)" : "ticket(s)"}${free ? "" : ` ($${amount})`}. Code ${code}.`, link: "/admin/events-offers" });

  res.status(201).json({ ok: true, code, booking });
});
