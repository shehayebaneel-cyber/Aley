import bcrypt from "bcryptjs";
import { Router } from "express";
import { requireOwner, signToken } from "../auth";
import { businessMetrics, resolveRange } from "../lib/analytics";
import { prisma } from "../db";
import { outBusiness, slugify, toJson } from "../lib/serialize";
import { notifyAdmins } from "../lib/notify";
import { recomputeOrder } from "./orders";

const ownerToken = (id: number) => signToken({ ownerId: id, role: "owner" });
const safeOwner = (o: { id: number; name: string; email: string; phone: string }) => ({ id: o.id, name: o.name, email: o.email, phone: o.phone });

// ---------------------------------------------------------------------------
// Owner authentication (email + password)
// ---------------------------------------------------------------------------
export const ownerAuthRouter = Router();

ownerAuthRouter.post("/register", async (req, res) => {
  const name = String(req.body.name ?? "").trim();
  const email = String(req.body.email ?? "").trim().toLowerCase();
  const password = String(req.body.password ?? "");
  const phone = String(req.body.phone ?? "").trim();
  if (!name || !email || password.length < 6) {
    return res.status(400).json({ error: "Name, email, and a password (6+ chars) are required." });
  }
  if (await prisma.owner.findUnique({ where: { email } })) {
    return res.status(409).json({ error: "An account with this email already exists." });
  }
  const owner = await prisma.owner.create({ data: { name, email, phone, passwordHash: await bcrypt.hash(password, 10) } });
  res.status(201).json({ token: ownerToken(owner.id), owner: safeOwner(owner) });
});

ownerAuthRouter.post("/login", async (req, res) => {
  const email = String(req.body.email ?? "").trim().toLowerCase();
  const password = String(req.body.password ?? "");
  const owner = await prisma.owner.findUnique({ where: { email } });
  if (!owner || !(await bcrypt.compare(password, owner.passwordHash))) {
    return res.status(401).json({ error: "Wrong email or password." });
  }
  res.json({ token: ownerToken(owner.id), owner: safeOwner(owner) });
});

// ---------------------------------------------------------------------------
// Owner dashboard (token required)
// ---------------------------------------------------------------------------
export const ownerRouter = Router();
ownerRouter.use(requireOwner);

/** Load a business and confirm the logged-in owner owns it. */
async function ownedBusiness(req: { ownerId?: number; params: { id: string } }) {
  const id = Number(req.params.id);
  const business = await prisma.business.findUnique({ where: { id } });
  if (!business || business.ownerId !== req.ownerId) return null;
  return business;
}

// GET /api/owner/me — owner profile + their businesses (with counts).
ownerRouter.get("/me", async (req, res) => {
  const owner = await prisma.owner.findUnique({ where: { id: req.ownerId! } });
  if (!owner) return res.status(404).json({ error: "Account not found." });
  const businesses = await prisma.business.findMany({
    where: { ownerId: owner.id },
    orderBy: { createdAt: "asc" },
    include: { category: true, _count: { select: { reviews: true, offers: true, events: true } } },
  });
  res.json({ owner: safeOwner(owner), businesses: businesses.map((b) => ({ ...outBusiness(b), _count: b._count })) });
});

// POST /api/owner/businesses — create a new listing owned by this owner.
ownerRouter.post("/businesses", async (req, res) => {
  const name = String(req.body.name ?? "").trim();
  const categoryId = Number(req.body.categoryId);
  if (!name || !categoryId) return res.status(400).json({ error: "Business name and category are required." });
  const category = await prisma.category.findUnique({ where: { id: categoryId } });
  if (!category) return res.status(400).json({ error: "Pick a valid category." });

  // Unique slug.
  let base = slugify(name) || "business";
  let slug = base;
  for (let i = 2; await prisma.business.findUnique({ where: { slug } }); i++) slug = `${base}-${i}`;

  const aley = await prisma.city.findUnique({ where: { slug: "aley" } });
  const business = await prisma.business.create({
    data: {
      slug, name, categoryId, cityId: aley!.id, ownerId: req.ownerId!,
      tagline: String(req.body.tagline ?? "").trim(),
      // New owner submissions stay hidden until an admin reviews and approves them.
      isPublished: false, isClaimed: true, reviewStatus: "PENDING",
    },
    include: { category: true },
  });
  const owner = await prisma.owner.findUnique({ where: { id: req.ownerId! } });
  await notifyAdmins({
    kind: "BUSINESS_SUBMITTED",
    title: `New business awaiting review: ${business.name}`,
    body: `${owner?.name ?? "An owner"} submitted "${business.name}" (${category.name}) for approval.`,
    link: "/admin/businesses?status=pending",
  });
  res.status(201).json(outBusiness(business));
});

// GET /api/owner/claimable?q= — existing unclaimed listings the owner can claim.
ownerRouter.get("/claimable", async (req, res) => {
  const q = String(req.query.q ?? "").trim();
  const list = await prisma.business.findMany({
    where: {
      ownerId: null,
      isClaimed: false,
      ...(q ? { OR: [{ name: { contains: q, mode: "insensitive" } }, { address: { contains: q, mode: "insensitive" } }] } : {}),
    },
    orderBy: { name: "asc" },
    take: 20,
    include: { category: true },
  });
  res.json(list.map((b) => ({ id: b.id, name: b.name, address: b.address, logo: b.logo, cover: b.cover, category: b.category })));
});

// GET /api/owner/claims — this owner's pending/decided claim requests.
ownerRouter.get("/claims", async (req, res) => {
  const claims = await prisma.businessClaim.findMany({
    where: { ownerId: req.ownerId! },
    orderBy: { createdAt: "desc" },
    include: { business: { select: { name: true, slug: true } } },
  });
  res.json(claims);
});

// POST /api/owner/businesses/:id/claim — request ownership of an unclaimed listing.
ownerRouter.post("/businesses/:id/claim", async (req, res) => {
  const id = Number(req.params.id);
  const business = await prisma.business.findUnique({ where: { id } });
  if (!business) return res.status(404).json({ error: "Business not found." });
  if (business.isClaimed || business.ownerId) return res.status(400).json({ error: "This business is already claimed." });
  const existing = await prisma.businessClaim.findFirst({ where: { businessId: id, ownerId: req.ownerId!, status: "PENDING" } });
  if (existing) return res.status(200).json({ ok: true, claim: existing, message: "You already have a pending claim for this business." });

  const claim = await prisma.businessClaim.create({
    data: { businessId: id, ownerId: req.ownerId!, message: String(req.body.message ?? "").slice(0, 1000) },
  });
  const owner = await prisma.owner.findUnique({ where: { id: req.ownerId! } });
  await notifyAdmins({
    kind: "BUSINESS_CLAIM",
    title: `Ownership claim: ${business.name}`,
    body: `${owner?.name ?? "An owner"} (${owner?.email ?? ""}) is claiming "${business.name}".${claim.message ? ` Note: ${claim.message}` : ""}`,
    link: "/admin/claims",
  });
  res.status(201).json({ ok: true, claim, message: "Claim submitted. We'll review it and assign the business to you once verified." });
});

// GET /api/owner/businesses/:id — full editable business.
ownerRouter.get("/businesses/:id", async (req, res) => {
  const business = await ownedBusiness(req);
  if (!business) return res.status(404).json({ error: "Business not found." });
  const full = await prisma.business.findUnique({ where: { id: business.id }, include: { category: true } });
  res.json(outBusiness(full!));
});

const STR = (v: unknown, max = 2000) => String(v ?? "").slice(0, max);

// PATCH /api/owner/businesses/:id — update profile, contact, hours, attributes.
ownerRouter.patch("/businesses/:id", async (req, res) => {
  const business = await ownedBusiness(req);
  if (!business) return res.status(404).json({ error: "Business not found." });
  const b = req.body as Record<string, unknown>;

  const data: Record<string, unknown> = {};
  if ("name" in b) data.name = STR(b.name, 120).trim() || business.name;
  if ("tagline" in b) data.tagline = STR(b.tagline, 160);
  if ("description" in b) data.description = STR(b.description, 4000);
  if ("logo" in b) data.logo = b.logo ? STR(b.logo, 500) : null;
  if ("cover" in b) data.cover = b.cover ? STR(b.cover, 500) : null;
  if ("gallery" in b && Array.isArray(b.gallery)) data.gallery = toJson(b.gallery.slice(0, 20));
  if ("tags" in b && Array.isArray(b.tags)) data.tags = toJson(b.tags.slice(0, 30));
  if ("faqs" in b && Array.isArray(b.faqs)) data.faqs = toJson(b.faqs.slice(0, 30));
  if ("hours" in b && Array.isArray(b.hours)) data.hours = toJson(b.hours.slice(0, 7));
  if ("phone" in b) data.phone = STR(b.phone, 40);
  if ("whatsapp" in b) data.whatsapp = STR(b.whatsapp, 40);
  if ("instagram" in b) data.instagram = STR(b.instagram, 80).replace(/^@/, "");
  if ("facebook" in b) data.facebook = STR(b.facebook, 200);
  if ("website" in b) data.website = STR(b.website, 200);
  if ("email" in b) data.email = STR(b.email, 120);
  if ("address" in b) data.address = STR(b.address, 200);
  if ("lat" in b) data.lat = b.lat === null || b.lat === "" ? null : Number(b.lat);
  if ("lng" in b) data.lng = b.lng === null || b.lng === "" ? null : Number(b.lng);
  if ("priceRange" in b) data.priceRange = Math.max(1, Math.min(4, Number(b.priceRange) || 2));
  if ("hasDelivery" in b) data.hasDelivery = !!b.hasDelivery;
  if ("hasReservations" in b) data.hasReservations = !!b.hasReservations;
  if ("categoryId" in b) {
    const cat = await prisma.category.findUnique({ where: { id: Number(b.categoryId) } });
    if (cat) data.categoryId = cat.id;
  }

  const updated = await prisma.business.update({ where: { id: business.id }, data, include: { category: true } });
  res.json(outBusiness(updated));
});

// GET /api/owner/businesses/:id/analytics
ownerRouter.get("/businesses/:id/analytics", async (req, res) => {
  const business = await ownedBusiness(req);
  if (!business) return res.status(404).json({ error: "Business not found." });
  const reviews = await prisma.review.findMany({ where: { businessId: business.id, status: "APPROVED" } });
  const breakdown = [1, 2, 3, 4, 5].map((star) => ({ star, count: reviews.filter((r) => r.rating === star).length }));
  const [offers, events, pendingReviews, pendingReservations] = await Promise.all([
    prisma.offer.count({ where: { businessId: business.id } }),
    prisma.event.count({ where: { businessId: business.id } }),
    prisma.review.count({ where: { businessId: business.id, status: "PENDING" } }),
    prisma.reservation.count({ where: { businessId: business.id, status: "PENDING" } }),
  ]);
  res.json({
    viewCount: business.viewCount,
    rating: business.rating,
    reviewCount: business.reviewCount,
    pendingReviews,
    pendingReservations,
    offers,
    events,
    breakdown,
  });
});

// GET /api/owner/businesses/:id/metrics?period=&from=&to= — full analytics dashboard data.
ownerRouter.get("/businesses/:id/metrics", async (req, res) => {
  const business = await ownedBusiness(req);
  if (!business) return res.status(404).json({ error: "Business not found." });
  const q = req.query as Record<string, string>;
  const range = resolveRange(q.period ?? "30d", q.from, q.to);
  const data = await businessMetrics(business.id, range);
  res.json({ period: q.period ?? "30d", range: { start: range.start, end: range.end }, ...data });
});

// ---- Reservations ----
ownerRouter.get("/businesses/:id/reservations", async (req, res) => {
  const business = await ownedBusiness(req);
  if (!business) return res.status(404).json({ error: "Business not found." });
  const reservations = await prisma.reservation.findMany({ where: { businessId: business.id }, orderBy: { createdAt: "desc" } });
  res.json(reservations);
});
ownerRouter.patch("/reservations/:id", async (req, res) => {
  const r = await prisma.reservation.findUnique({ where: { id: Number(req.params.id) }, include: { business: { select: { ownerId: true } } } });
  if (!r || r.business.ownerId !== req.ownerId) return res.status(404).json({ error: "Reservation not found." });
  const status = String(req.body.status ?? "").toUpperCase();
  if (!["PENDING", "CONFIRMED", "DECLINED", "CANCELLED"].includes(status)) return res.status(400).json({ error: "Invalid status." });
  const updated = await prisma.reservation.update({ where: { id: r.id }, data: { status } });
  res.json(updated);
});

// ---- Offers ----
ownerRouter.get("/businesses/:id/offers", async (req, res) => {
  const business = await ownedBusiness(req);
  if (!business) return res.status(404).json({ error: "Business not found." });
  res.json(await prisma.offer.findMany({ where: { businessId: business.id }, orderBy: { createdAt: "desc" } }));
});

ownerRouter.post("/businesses/:id/offers", async (req, res) => {
  const business = await ownedBusiness(req);
  if (!business) return res.status(404).json({ error: "Business not found." });
  const title = STR(req.body.title, 120).trim();
  if (!title) return res.status(400).json({ error: "Offer title is required." });
  const offer = await prisma.offer.create({
    data: {
      businessId: business.id, cityId: business.cityId, title,
      description: STR(req.body.description, 500), type: STR(req.body.type, 30) || "DISCOUNT",
      image: req.body.image ? STR(req.body.image, 500) : null, isActive: req.body.isActive !== false,
    },
  });
  res.status(201).json(offer);
});

async function ownedOffer(ownerId: number | undefined, id: number) {
  const offer = await prisma.offer.findUnique({ where: { id }, include: { business: true } });
  return offer && offer.business.ownerId === ownerId ? offer : null;
}

ownerRouter.patch("/offers/:id", async (req, res) => {
  if (!(await ownedOffer(req.ownerId, Number(req.params.id)))) return res.status(404).json({ error: "Offer not found." });
  const b = req.body as Record<string, unknown>;
  const data: Record<string, unknown> = {};
  if ("title" in b) data.title = STR(b.title, 120);
  if ("description" in b) data.description = STR(b.description, 500);
  if ("type" in b) data.type = STR(b.type, 30);
  if ("image" in b) data.image = b.image ? STR(b.image, 500) : null;
  if ("isActive" in b) data.isActive = !!b.isActive;
  res.json(await prisma.offer.update({ where: { id: Number(req.params.id) }, data }));
});

ownerRouter.delete("/offers/:id", async (req, res) => {
  if (!(await ownedOffer(req.ownerId, Number(req.params.id)))) return res.status(404).json({ error: "Offer not found." });
  await prisma.offer.delete({ where: { id: Number(req.params.id) } });
  res.json({ ok: true });
});

// ---- Events ----
ownerRouter.get("/businesses/:id/events", async (req, res) => {
  const business = await ownedBusiness(req);
  if (!business) return res.status(404).json({ error: "Business not found." });
  res.json(await prisma.event.findMany({ where: { businessId: business.id }, orderBy: { startTime: "desc" } }));
});

ownerRouter.post("/businesses/:id/events", async (req, res) => {
  const business = await ownedBusiness(req);
  if (!business) return res.status(404).json({ error: "Business not found." });
  const title = STR(req.body.title, 120).trim();
  const startTime = new Date(String(req.body.startTime));
  if (!title || Number.isNaN(startTime.getTime())) return res.status(400).json({ error: "Title and a valid start date/time are required." });
  const event = await prisma.event.create({
    data: {
      businessId: business.id, cityId: business.cityId, title,
      description: STR(req.body.description, 1000), category: STR(req.body.category, 40) || "Community",
      location: STR(req.body.location, 160) || business.name, image: req.body.image ? STR(req.body.image, 500) : null,
      startTime, isPublished: req.body.isPublished !== false,
    },
  });
  res.status(201).json(event);
});

async function ownedEvent(ownerId: number | undefined, id: number) {
  const event = await prisma.event.findUnique({ where: { id }, include: { business: true } });
  return event && event.business?.ownerId === ownerId ? event : null;
}

ownerRouter.patch("/events/:id", async (req, res) => {
  if (!(await ownedEvent(req.ownerId, Number(req.params.id)))) return res.status(404).json({ error: "Event not found." });
  const b = req.body as Record<string, unknown>;
  const data: Record<string, unknown> = {};
  if ("title" in b) data.title = STR(b.title, 120);
  if ("description" in b) data.description = STR(b.description, 1000);
  if ("category" in b) data.category = STR(b.category, 40);
  if ("location" in b) data.location = STR(b.location, 160);
  if ("image" in b) data.image = b.image ? STR(b.image, 500) : null;
  if ("startTime" in b) { const d = new Date(String(b.startTime)); if (!Number.isNaN(d.getTime())) data.startTime = d; }
  if ("isPublished" in b) data.isPublished = !!b.isPublished;
  res.json(await prisma.event.update({ where: { id: Number(req.params.id) }, data }));
});

ownerRouter.delete("/events/:id", async (req, res) => {
  if (!(await ownedEvent(req.ownerId, Number(req.params.id)))) return res.status(404).json({ error: "Event not found." });
  await prisma.event.delete({ where: { id: Number(req.params.id) } });
  res.json({ ok: true });
});

// ---- Reviews + reply ----
ownerRouter.get("/businesses/:id/reviews", async (req, res) => {
  const business = await ownedBusiness(req);
  if (!business) return res.status(404).json({ error: "Business not found." });
  res.json(await prisma.review.findMany({ where: { businessId: business.id }, orderBy: { createdAt: "desc" }, take: 100 }));
});

ownerRouter.post("/reviews/:id/reply", async (req, res) => {
  const review = await prisma.review.findUnique({ where: { id: Number(req.params.id) }, include: { business: true } });
  if (!review || review.business.ownerId !== req.ownerId) return res.status(404).json({ error: "Review not found." });
  const reply = STR(req.body.reply, 1000).trim();
  const updated = await prisma.review.update({ where: { id: review.id }, data: { reply: reply || null, repliedAt: reply ? new Date() : null } });
  res.json(updated);
});

// ---- Orders (this business's tickets only) ----
ownerRouter.get("/businesses/:id/orders", async (req, res) => {
  const business = await ownedBusiness(req);
  if (!business) return res.status(404).json({ error: "Business not found." });
  const tickets = await prisma.businessOrder.findMany({
    where: { businessId: business.id },
    orderBy: { createdAt: "desc" },
    take: 100,
    include: { items: true, order: { select: { number: true, customerName: true, customerPhone: true, fulfillment: true, address: true, lat: true, lng: true, note: true, deliveryStatus: true, createdAt: true } } },
  });
  res.json(tickets);
});

const TICKET_STATUSES = ["PENDING", "PREPARING", "READY", "CANCELLED"];
ownerRouter.patch("/business-orders/:id", async (req, res) => {
  const ticket = await prisma.businessOrder.findUnique({ where: { id: Number(req.params.id) }, include: { business: true } });
  if (!ticket || ticket.business.ownerId !== req.ownerId) return res.status(404).json({ error: "Order not found." });
  const data: Record<string, unknown> = {};
  if ("status" in req.body && TICKET_STATUSES.includes(String(req.body.status))) data.status = req.body.status;
  if ("prepTime" in req.body) data.prepTime = STR(req.body.prepTime, 40);
  const updated = await prisma.businessOrder.update({ where: { id: ticket.id }, data });
  if (data.status === "CANCELLED") await recomputeOrder(ticket.orderId);
  res.json(updated);
});
