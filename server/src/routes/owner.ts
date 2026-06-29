import bcrypt from "bcryptjs";
import { Router } from "express";
import { requireOwner, signToken } from "../auth";
import { businessMetrics, resolveRange } from "../lib/analytics";
import { prisma } from "../db";
import { outBusiness, parseArr, parseObj, slugify, toJson, type HoursRow } from "../lib/serialize";
import { facilitySlots, priceFor, resolveFacilityPricing, resolveFacilitySchedule, _toMin } from "../lib/facility";
import { effectiveStatus } from "../lib/voucher";
import { notifyNextWaitlist } from "../lib/waitlist";
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
  if ("hasBooking" in b) data.hasBooking = !!b.hasBooking;
  if ("bookingConfig" in b && b.bookingConfig && typeof b.bookingConfig === "object") data.bookingConfig = JSON.stringify(b.bookingConfig);
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

// ---- Booking: services ----
ownerRouter.get("/businesses/:id/services", async (req, res) => {
  const business = await ownedBusiness(req);
  if (!business) return res.status(404).json({ error: "Business not found." });
  res.json(await prisma.service.findMany({ where: { businessId: business.id }, orderBy: [{ sortOrder: "asc" }, { id: "asc" }] }));
});
ownerRouter.post("/businesses/:id/services", async (req, res) => {
  const business = await ownedBusiness(req);
  if (!business) return res.status(404).json({ error: "Business not found." });
  const name = STR(req.body.name, 120).trim();
  if (!name) return res.status(400).json({ error: "Service name is required." });
  const count = await prisma.service.count({ where: { businessId: business.id } });
  const service = await prisma.service.create({
    data: {
      businessId: business.id, name,
      description: STR(req.body.description, 500),
      durationMin: Math.max(5, Math.min(600, Number(req.body.durationMin) || 30)),
      price: Math.max(0, Number(req.body.price) || 0),
      isActive: req.body.isActive !== false,
      sortOrder: count,
    },
  });
  res.status(201).json(service);
});
async function ownedService(ownerId: number | undefined, id: number) {
  const s = await prisma.service.findUnique({ where: { id }, include: { business: { select: { ownerId: true } } } });
  return s && s.business.ownerId === ownerId ? s : null;
}
ownerRouter.patch("/services/:id", async (req, res) => {
  const s = await ownedService(req.ownerId, Number(req.params.id));
  if (!s) return res.status(404).json({ error: "Service not found." });
  const b = req.body as Record<string, unknown>;
  const data: Record<string, unknown> = {};
  if ("name" in b) data.name = STR(b.name, 120).trim() || s.name;
  if ("description" in b) data.description = STR(b.description, 500);
  if ("durationMin" in b) data.durationMin = Math.max(5, Math.min(600, Number(b.durationMin) || 30));
  if ("price" in b) data.price = Math.max(0, Number(b.price) || 0);
  if ("isActive" in b) data.isActive = !!b.isActive;
  if ("sortOrder" in b) data.sortOrder = Number(b.sortOrder) || 0;
  res.json(await prisma.service.update({ where: { id: s.id }, data }));
});
ownerRouter.delete("/services/:id", async (req, res) => {
  const s = await ownedService(req.ownerId, Number(req.params.id));
  if (!s) return res.status(404).json({ error: "Service not found." });
  await prisma.service.delete({ where: { id: s.id } });
  res.json({ ok: true });
});

// ---- Booking: staff ----
// Parse JSON fields so the owner UI gets real arrays/objects.
const outStaff = (s: { languages: string; schedule: string } & Record<string, unknown>) => ({
  ...s, languages: parseArr(s.languages), schedule: parseObj(s.schedule),
});
ownerRouter.get("/businesses/:id/staff", async (req, res) => {
  const business = await ownedBusiness(req);
  if (!business) return res.status(404).json({ error: "Business not found." });
  const staff = await prisma.staffMember.findMany({ where: { businessId: business.id }, orderBy: [{ sortOrder: "asc" }, { id: "asc" }] });
  res.json(staff.map(outStaff));
});
ownerRouter.post("/businesses/:id/staff", async (req, res) => {
  const business = await ownedBusiness(req);
  if (!business) return res.status(404).json({ error: "Business not found." });
  const name = STR(req.body.name, 80).trim();
  if (!name) return res.status(400).json({ error: "Staff name is required." });
  const count = await prisma.staffMember.count({ where: { businessId: business.id } });
  const member = await prisma.staffMember.create({
    data: {
      businessId: business.id, name,
      role: STR(req.body.role, 80),
      avatar: req.body.avatar ? STR(req.body.avatar, 500) : null,
      bio: STR(req.body.bio, 1000),
      experience: STR(req.body.experience, 80),
      languages: toJson(Array.isArray(req.body.languages) ? req.body.languages.slice(0, 20) : []),
      isActive: req.body.isActive !== false,
      sortOrder: count,
    },
  });
  res.status(201).json(outStaff(member));
});
async function ownedStaff(ownerId: number | undefined, id: number) {
  const s = await prisma.staffMember.findUnique({ where: { id }, include: { business: { select: { ownerId: true } } } });
  return s && s.business.ownerId === ownerId ? s : null;
}
ownerRouter.patch("/staff/:id", async (req, res) => {
  const s = await ownedStaff(req.ownerId, Number(req.params.id));
  if (!s) return res.status(404).json({ error: "Staff not found." });
  const b = req.body as Record<string, unknown>;
  const data: Record<string, unknown> = {};
  if ("name" in b) data.name = STR(b.name, 80).trim() || s.name;
  if ("role" in b) data.role = STR(b.role, 80);
  if ("avatar" in b) data.avatar = b.avatar ? STR(b.avatar, 500) : null;
  if ("bio" in b) data.bio = STR(b.bio, 1000);
  if ("experience" in b) data.experience = STR(b.experience, 80);
  if ("languages" in b && Array.isArray(b.languages)) data.languages = toJson(b.languages.slice(0, 20));
  if ("schedule" in b && b.schedule && typeof b.schedule === "object") data.schedule = JSON.stringify(b.schedule);
  if ("isActive" in b) data.isActive = !!b.isActive;
  if ("sortOrder" in b) data.sortOrder = Number(b.sortOrder) || 0;
  res.json(outStaff(await prisma.staffMember.update({ where: { id: s.id }, data })));
});
ownerRouter.delete("/staff/:id", async (req, res) => {
  const s = await ownedStaff(req.ownerId, Number(req.params.id));
  if (!s) return res.status(404).json({ error: "Staff not found." });
  await prisma.staffMember.delete({ where: { id: s.id } });
  res.json({ ok: true });
});

// ---- Booking: appointments ----
ownerRouter.get("/businesses/:id/appointments", async (req, res) => {
  const business = await ownedBusiness(req);
  if (!business) return res.status(404).json({ error: "Business not found." });
  const appointments = await prisma.appointment.findMany({
    where: { businessId: business.id },
    orderBy: [{ date: "desc" }, { time: "desc" }],
    take: 300,
  });
  res.json(appointments);
});
const APPT_STATUSES = ["PENDING", "CONFIRMED", "RESCHEDULED", "CANCELLED", "COMPLETED", "NO_SHOW"];
ownerRouter.patch("/appointments/:id", async (req, res) => {
  const a = await prisma.appointment.findUnique({ where: { id: Number(req.params.id) }, include: { business: { select: { ownerId: true } } } });
  if (!a || a.business.ownerId !== req.ownerId) return res.status(404).json({ error: "Appointment not found." });
  const b = req.body as Record<string, unknown>;
  const data: Record<string, unknown> = {};
  if ("status" in b) {
    const status = String(b.status ?? "").toUpperCase();
    if (!APPT_STATUSES.includes(status)) return res.status(400).json({ error: "Invalid status." });
    data.status = status;
  }
  // Reschedule: owner can move date/time (marks as RESCHEDULED unless a status was sent).
  if ("date" in b && /^\d{4}-\d{2}-\d{2}$/.test(String(b.date))) data.date = String(b.date);
  if ("time" in b && /^\d{2}:\d{2}$/.test(String(b.time))) data.time = String(b.time);
  if (("date" in data || "time" in data) && !("status" in data)) data.status = "RESCHEDULED";
  const updated = await prisma.appointment.update({ where: { id: a.id }, data });
  // Freeing the slot? Notify the next person waiting for that day.
  if (data.status === "CANCELLED") await notifyNextWaitlist(updated.businessId, updated.date);
  res.json(updated);
});

// POST /api/owner/checkin { code } — mark a customer arrived by scanning their QR code.
ownerRouter.post("/checkin", async (req, res) => {
  const code = String(req.body.code ?? "").trim().toUpperCase();
  if (!code) return res.status(400).json({ error: "A check-in code is required." });
  const appt = await prisma.appointment.findFirst({
    where: { checkInCode: code, business: { ownerId: req.ownerId } },
    include: { business: { select: { name: true } } },
  });
  if (!appt) return res.status(404).json({ error: "No appointment matches that code." });
  const updated = await prisma.appointment.update({ where: { id: appt.id }, data: { arrivedAt: new Date() } });
  res.json({ ok: true, appointment: updated, businessName: appt.business.name, customerName: appt.customerName, time: appt.time, date: appt.date });
});

// ---- Waitlist ----
ownerRouter.get("/businesses/:id/waitlist", async (req, res) => {
  const business = await ownedBusiness(req);
  if (!business) return res.status(404).json({ error: "Business not found." });
  const items = await prisma.waitlist.findMany({
    where: { businessId: business.id, status: { in: ["WAITING", "NOTIFIED"] } },
    orderBy: { createdAt: "asc" },
  });
  res.json(items);
});
ownerRouter.patch("/waitlist/:id", async (req, res) => {
  const w = await prisma.waitlist.findUnique({ where: { id: Number(req.params.id) }, include: { business: { select: { ownerId: true } } } });
  if (!w || w.business.ownerId !== req.ownerId) return res.status(404).json({ error: "Waitlist entry not found." });
  const status = String(req.body.status ?? "").toUpperCase();
  if (!["WAITING", "NOTIFIED", "CONVERTED", "CLOSED"].includes(status)) return res.status(400).json({ error: "Invalid status." });
  res.json(await prisma.waitlist.update({ where: { id: w.id }, data: { status } }));
});

// ---- Booking analytics ----
function bookingRange(period: string): { start?: string; end?: string } {
  const now = new Date();
  const ymd = (d: Date) => d.toISOString().slice(0, 10);
  if (period === "all") return {};
  if (period === "month") {
    const start = new Date(now.getFullYear(), now.getMonth(), 1);
    const end = new Date(now.getFullYear(), now.getMonth() + 1, 1);
    return { start: ymd(start), end: ymd(end) };
  }
  // default: rolling 30 days
  const start = new Date(now); start.setDate(start.getDate() - 30);
  const end = new Date(now); end.setDate(end.getDate() + 1);
  return { start: ymd(start), end: ymd(end) };
}
ownerRouter.get("/businesses/:id/booking-analytics", async (req, res) => {
  const business = await ownedBusiness(req);
  if (!business) return res.status(404).json({ error: "Business not found." });
  const period = String(req.query.period ?? "month");
  const { start, end } = bookingRange(period);
  const where: Record<string, unknown> = { businessId: business.id };
  if (start && end) where.date = { gte: start, lt: end };
  const appts = await prisma.appointment.findMany({ where });

  const by = (s: string) => appts.filter((a) => a.status === s).length;
  const completed = appts.filter((a) => a.status === "COMPLETED");
  const revenue = Math.round(completed.reduce((s, a) => s + (a.price || 0), 0) * 100) / 100;

  const tally = (key: "serviceName" | "staffName") => {
    const m = new Map<string, number>();
    for (const a of appts) { const v = (a[key] || "").trim(); if (v) m.set(v, (m.get(v) ?? 0) + 1); }
    const top = [...m.entries()].sort((x, y) => y[1] - x[1])[0];
    return top ? { name: top[0], count: top[1] } : null;
  };
  const peak = new Map<string, number>();
  for (const a of appts) { const h = a.time.slice(0, 2) + ":00"; peak.set(h, (peak.get(h) ?? 0) + 1); }
  const peakHours = [...peak.entries()].map(([hour, count]) => ({ hour, count })).sort((x, y) => y.count - x.count).slice(0, 5);

  res.json({
    period,
    total: appts.length,
    pending: by("PENDING"), confirmed: by("CONFIRMED"), rescheduled: by("RESCHEDULED"),
    completed: completed.length, cancelled: by("CANCELLED"), noShow: by("NO_SHOW"),
    revenue,
    avgValue: completed.length ? Math.round((revenue / completed.length) * 100) / 100 : 0,
    topService: tally("serviceName"),
    topStaff: tally("staffName"),
    peakHours,
  });
});

// ---- Customer CRM (keyed by phone within a business) ----
const TAGS = ["", "VIP", "REGULAR", "FIRST_VISIT"];
ownerRouter.get("/businesses/:id/customers/:phone", async (req, res) => {
  const business = await ownedBusiness(req);
  if (!business) return res.status(404).json({ error: "Business not found." });
  const phone = decodeURIComponent(req.params.phone);
  const [appts, profile] = await Promise.all([
    prisma.appointment.findMany({ where: { businessId: business.id, customerPhone: phone }, orderBy: [{ date: "desc" }, { time: "desc" }] }),
    prisma.customerProfile.findUnique({ where: { businessId_phone: { businessId: business.id, phone } } }),
  ]);
  const completed = appts.filter((a) => a.status === "COMPLETED");
  const spent = Math.round(completed.reduce((s, a) => s + (a.price || 0), 0) * 100) / 100;
  const suggested = completed.length === 0 ? "FIRST_VISIT" : completed.length >= 5 ? "VIP" : completed.length >= 2 ? "REGULAR" : "";
  res.json({
    phone,
    name: profile?.name || appts[0]?.customerName || "",
    tag: profile?.tag || suggested,
    storedTag: profile?.tag || "",
    suggestedTag: suggested,
    notes: profile?.notes || "",
    visits: appts.length,
    completed: completed.length,
    noShows: appts.filter((a) => a.status === "NO_SHOW").length,
    spent,
    lastVisit: appts[0]?.date ?? null,
    appointments: appts.slice(0, 20),
  });
});
ownerRouter.patch("/businesses/:id/customers/:phone", async (req, res) => {
  const business = await ownedBusiness(req);
  if (!business) return res.status(404).json({ error: "Business not found." });
  const phone = decodeURIComponent(req.params.phone);
  const tag = TAGS.includes(String(req.body.tag)) ? String(req.body.tag) : "";
  const notes = STR(req.body.notes, 2000);
  const name = STR(req.body.name, 80);
  const profile = await prisma.customerProfile.upsert({
    where: { businessId_phone: { businessId: business.id, phone } },
    create: { businessId: business.id, phone, tag, notes, name },
    update: { tag, notes, name },
  });
  res.json(profile);
});

// ---- Facilities (hourly rentals: courts, fields, halls) ----
const outFacility = (f: any) => ({ ...f, pricing: parseObj(f.pricing), schedule: parseObj(f.schedule) });
ownerRouter.get("/businesses/:id/facilities", async (req, res) => {
  const business = await ownedBusiness(req);
  if (!business) return res.status(404).json({ error: "Business not found." });
  const list = await prisma.facility.findMany({ where: { businessId: business.id }, orderBy: [{ sortOrder: "asc" }, { id: "asc" }] });
  res.json(list.map(outFacility));
});
ownerRouter.post("/businesses/:id/facilities", async (req, res) => {
  const business = await ownedBusiness(req);
  if (!business) return res.status(404).json({ error: "Business not found." });
  const name = STR(req.body.name, 80).trim();
  if (!name) return res.status(400).json({ error: "Facility name is required." });
  const count = await prisma.facility.count({ where: { businessId: business.id } });
  const f = await prisma.facility.create({
    data: {
      businessId: business.id, name, type: STR(req.body.type, 60), description: STR(req.body.description, 500),
      image: req.body.image ? STR(req.body.image, 500) : null, hourlyRate: Math.max(0, Number(req.body.hourlyRate) || 0),
      capacityNote: STR(req.body.capacityNote, 80),
      pricing: req.body.pricing && typeof req.body.pricing === "object" ? JSON.stringify(req.body.pricing) : "{}",
      schedule: req.body.schedule && typeof req.body.schedule === "object" ? JSON.stringify(req.body.schedule) : "{}",
      isActive: req.body.isActive !== false, sortOrder: count,
    },
  });
  res.status(201).json(outFacility(f));
});
async function ownedFacility(ownerId: number | undefined, id: number) {
  const f = await prisma.facility.findUnique({ where: { id }, include: { business: { select: { ownerId: true } } } });
  return f && f.business.ownerId === ownerId ? f : null;
}
ownerRouter.patch("/facilities/:id", async (req, res) => {
  const f = await ownedFacility(req.ownerId, Number(req.params.id));
  if (!f) return res.status(404).json({ error: "Facility not found." });
  const b = req.body as Record<string, unknown>;
  const data: Record<string, unknown> = {};
  if ("name" in b) data.name = STR(b.name, 80).trim() || f.name;
  if ("type" in b) data.type = STR(b.type, 60);
  if ("description" in b) data.description = STR(b.description, 500);
  if ("image" in b) data.image = b.image ? STR(b.image, 500) : null;
  if ("hourlyRate" in b) data.hourlyRate = Math.max(0, Number(b.hourlyRate) || 0);
  if ("capacityNote" in b) data.capacityNote = STR(b.capacityNote, 80);
  if ("pricing" in b && b.pricing && typeof b.pricing === "object") data.pricing = JSON.stringify(b.pricing);
  if ("schedule" in b && b.schedule && typeof b.schedule === "object") data.schedule = JSON.stringify(b.schedule);
  if ("isActive" in b) data.isActive = !!b.isActive;
  if ("sortOrder" in b) data.sortOrder = Number(b.sortOrder) || 0;
  res.json(outFacility(await prisma.facility.update({ where: { id: f.id }, data })));
});
ownerRouter.delete("/facilities/:id", async (req, res) => {
  const f = await ownedFacility(req.ownerId, Number(req.params.id));
  if (!f) return res.status(404).json({ error: "Facility not found." });
  await prisma.facility.delete({ where: { id: f.id } });
  res.json({ ok: true });
});

// ---- Facility bookings (list / calendar / status / reschedule) ----
ownerRouter.get("/businesses/:id/facility-bookings", async (req, res) => {
  const business = await ownedBusiness(req);
  if (!business) return res.status(404).json({ error: "Business not found." });
  const q = req.query as Record<string, string>;
  const where: Record<string, unknown> = { businessId: business.id };
  if (q.from && q.to) where.date = { gte: q.from, lte: q.to };
  const list = await prisma.facilityBooking.findMany({ where, orderBy: [{ date: "desc" }, { startTime: "asc" }], take: 500 });
  res.json(list);
});
const FB_STATUS = ["CONFIRMED", "PENDING", "CANCELLED", "COMPLETED", "NO_SHOW"];
ownerRouter.patch("/facility-bookings/:id", async (req, res) => {
  const fb = await prisma.facilityBooking.findUnique({ where: { id: Number(req.params.id) }, include: { business: { select: { ownerId: true, hours: true } }, facility: true } });
  if (!fb || fb.business.ownerId !== req.ownerId) return res.status(404).json({ error: "Booking not found." });
  const b = req.body as Record<string, unknown>;
  const data: Record<string, unknown> = {};
  if ("status" in b) {
    const status = String(b.status ?? "").toUpperCase();
    if (!FB_STATUS.includes(status)) return res.status(400).json({ error: "Invalid status." });
    data.status = status;
  }
  // Reschedule (drag-drop): move date/time and/or facility, re-checking availability.
  const newDate = "date" in b && /^\d{4}-\d{2}-\d{2}$/.test(String(b.date)) ? String(b.date) : fb.date;
  const newStart = "startTime" in b && /^\d{2}:\d{2}$/.test(String(b.startTime)) ? String(b.startTime) : fb.startTime;
  const newFacilityId = "facilityId" in b ? Number(b.facilityId) : fb.facilityId;
  const moving = newDate !== fb.date || newStart !== fb.startTime || newFacilityId !== fb.facilityId;
  if (moving) {
    const facility = newFacilityId === fb.facilityId ? fb.facility : await prisma.facility.findFirst({ where: { id: newFacilityId, businessId: fb.businessId } });
    if (!facility) return res.status(400).json({ error: "Facility not found." });
    const existing = await prisma.facilityBooking.findMany({ where: { facilityId: facility.id, date: newDate, id: { not: fb.id } }, select: { startTime: true, durationMin: true, status: true } });
    const free = facilitySlots({
      hourlyRate: facility.hourlyRate, pricing: resolveFacilityPricing(facility.pricing), schedule: resolveFacilitySchedule(facility.schedule),
      businessHours: parseArr(fb.business.hours) as HoursRow[], dateStr: newDate, durationMin: fb.durationMin, existing, now: new Date(),
    });
    if (!free.some((s) => s.time === newStart)) return res.status(409).json({ error: "That slot isn't free." });
    data.date = newDate; data.startTime = newStart; data.facilityId = facility.id; data.facilityName = facility.name;
    data.price = priceFor(facility.hourlyRate, resolveFacilityPricing(facility.pricing), newDate, _toMin(newStart), fb.durationMin);
  }
  res.json(await prisma.facilityBooking.update({ where: { id: fb.id }, data }));
});

// ---- Facility occupancy stats ----
ownerRouter.get("/businesses/:id/facility-stats", async (req, res) => {
  const business = await ownedBusiness(req);
  if (!business) return res.status(404).json({ error: "Business not found." });
  const period = String(req.query.period ?? "month");
  const now = new Date(); const ymd = (d: Date) => d.toISOString().slice(0, 10);
  let start: string, end: string, days: number;
  if (period === "all") { start = "0000-01-01"; end = "9999-12-31"; days = 30; }
  else if (period === "month") { start = ymd(new Date(now.getFullYear(), now.getMonth(), 1)); end = ymd(new Date(now.getFullYear(), now.getMonth() + 1, 0)); days = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate(); }
  else { const s = new Date(now); s.setDate(s.getDate() - 30); start = ymd(s); end = ymd(now); days = 30; }

  const [facilities, bookings] = await Promise.all([
    prisma.facility.count({ where: { businessId: business.id, isActive: true } }),
    prisma.facilityBooking.findMany({ where: { businessId: business.id, date: { gte: start, lte: end } } }),
  ]);
  const active = bookings.filter((b) => ["CONFIRMED", "COMPLETED", "PENDING"].includes(b.status));
  const bookedHours = Math.round((active.reduce((s, b) => s + b.durationMin, 0) / 60) * 10) / 10;
  const revenue = Math.round(active.reduce((s, b) => s + (b.price || 0), 0) * 100) / 100;
  // Approx available hours = facilities × avg open hours/day × days.
  const hrs = parseArr(business.hours) as HoursRow[];
  const open = hrs.filter((h) => !h.closed);
  const avgOpen = open.length ? open.reduce((s, h) => s + (_toMin(h.close === "00:00" ? "24:00" : h.close) - _toMin(h.open)) / 60, 0) / open.length * (open.length / 7) : 12;
  const availableHours = Math.max(1, facilities * avgOpen * days);
  const byFacility = new Map<string, number>(); const byHour = new Map<string, number>();
  for (const b of active) { byFacility.set(b.facilityName, (byFacility.get(b.facilityName) ?? 0) + 1); byHour.set(b.startTime.slice(0, 2) + ":00", (byHour.get(b.startTime.slice(0, 2) + ":00") ?? 0) + 1); }
  const top = (m: Map<string, number>) => [...m.entries()].sort((a, c) => c[1] - a[1])[0];
  const busiest = top(byFacility); const peak = [...byHour.entries()].map(([hour, count]) => ({ hour, count })).sort((a, c) => c.count - a.count).slice(0, 5);
  res.json({
    period, totalBookings: active.length, bookedHours, revenue,
    occupancyPct: Math.min(100, Math.round((bookedHours / availableHours) * 100)),
    cancelled: bookings.filter((b) => b.status === "CANCELLED").length,
    busiestFacility: busiest ? { name: busiest[0], count: busiest[1] } : null, peakHours: peak,
  });
});

// ---- Gift vouchers ----
ownerRouter.get("/businesses/:id/voucher-types", async (req, res) => {
  const business = await ownedBusiness(req);
  if (!business) return res.status(404).json({ error: "Business not found." });
  res.json(await prisma.voucherType.findMany({ where: { businessId: business.id }, orderBy: [{ sortOrder: "asc" }, { id: "asc" }] }));
});
ownerRouter.post("/businesses/:id/voucher-types", async (req, res) => {
  const business = await ownedBusiness(req);
  if (!business) return res.status(404).json({ error: "Business not found." });
  const name = STR(req.body.name, 100).trim();
  if (!name) return res.status(400).json({ error: "Voucher name is required." });
  const kind = ["FIXED", "PRODUCT", "SERVICE"].includes(String(req.body.kind)) ? String(req.body.kind) : "FIXED";
  const count = await prisma.voucherType.count({ where: { businessId: business.id } });
  const t = await prisma.voucherType.create({
    data: {
      businessId: business.id, kind, name, description: STR(req.body.description, 500),
      image: req.body.image ? STR(req.body.image, 500) : null,
      value: Math.max(0, Number(req.body.value) || 0), price: Math.max(0, Number(req.body.price) || 0),
      expiryDays: Math.max(0, Number(req.body.expiryDays) || 0), maxQuantity: Math.max(0, Number(req.body.maxQuantity) || 0),
      terms: STR(req.body.terms, 1000), status: "ACTIVE", sortOrder: count,
    },
  });
  res.status(201).json(t);
});
async function ownedVoucherType(ownerId: number | undefined, id: number) {
  const t = await prisma.voucherType.findUnique({ where: { id }, include: { business: { select: { ownerId: true } } } });
  return t && t.business.ownerId === ownerId ? t : null;
}
ownerRouter.patch("/voucher-types/:id", async (req, res) => {
  const t = await ownedVoucherType(req.ownerId, Number(req.params.id));
  if (!t) return res.status(404).json({ error: "Voucher not found." });
  const b = req.body as Record<string, unknown>;
  const data: Record<string, unknown> = {};
  if ("name" in b) data.name = STR(b.name, 100).trim() || t.name;
  if ("kind" in b && ["FIXED", "PRODUCT", "SERVICE"].includes(String(b.kind))) data.kind = String(b.kind);
  if ("description" in b) data.description = STR(b.description, 500);
  if ("image" in b) data.image = b.image ? STR(b.image, 500) : null;
  if ("value" in b) data.value = Math.max(0, Number(b.value) || 0);
  if ("price" in b) data.price = Math.max(0, Number(b.price) || 0);
  if ("expiryDays" in b) data.expiryDays = Math.max(0, Number(b.expiryDays) || 0);
  if ("maxQuantity" in b) data.maxQuantity = Math.max(0, Number(b.maxQuantity) || 0);
  if ("terms" in b) data.terms = STR(b.terms, 1000);
  if ("status" in b && ["ACTIVE", "PAUSED"].includes(String(b.status))) data.status = String(b.status);
  res.json(await prisma.voucherType.update({ where: { id: t.id }, data }));
});
ownerRouter.delete("/voucher-types/:id", async (req, res) => {
  const t = await ownedVoucherType(req.ownerId, Number(req.params.id));
  if (!t) return res.status(404).json({ error: "Voucher not found." });
  await prisma.voucherType.delete({ where: { id: t.id } });
  res.json({ ok: true });
});

// Sold vouchers list
ownerRouter.get("/businesses/:id/vouchers", async (req, res) => {
  const business = await ownedBusiness(req);
  if (!business) return res.status(404).json({ error: "Business not found." });
  const list = await prisma.voucher.findMany({ where: { businessId: business.id }, orderBy: { createdAt: "desc" }, take: 300 });
  res.json(list.map((v) => ({ ...v, status: effectiveStatus(v) })));
});

// Voucher analytics
ownerRouter.get("/businesses/:id/voucher-stats", async (req, res) => {
  const business = await ownedBusiness(req);
  if (!business) return res.status(404).json({ error: "Business not found." });
  const [vouchers, types] = await Promise.all([
    prisma.voucher.findMany({ where: { businessId: business.id } }),
    prisma.voucherType.findMany({ where: { businessId: business.id } }),
  ]);
  const sold = vouchers.length;
  const revenue = Math.round(vouchers.reduce((s, v) => s + (v.price || 0), 0) * 100) / 100;
  const redeemed = vouchers.filter((v) => v.status === "REDEEMED").length;
  const outstanding = Math.round(vouchers.filter((v) => effectiveStatus(v) === "ACTIVE").reduce((s, v) => s + (v.kind === "FIXED" ? v.balance : v.value), 0) * 100) / 100;
  const byType = new Map<string, number>();
  for (const v of vouchers) byType.set(v.title, (byType.get(v.title) ?? 0) + 1);
  const top = [...byType.entries()].sort((a, b) => b[1] - a[1])[0];
  res.json({
    sold, revenue, redeemed, types: types.length,
    redemptionRate: sold ? Math.round((redeemed / sold) * 100) : 0,
    avgValue: sold ? Math.round((vouchers.reduce((s, v) => s + v.value, 0) / sold) * 100) / 100 : 0,
    mostPopular: top ? { name: top[0], count: top[1] } : null,
    outstandingLiability: outstanding,
  });
});

// Redeem by code (scan or manual) — finds the voucher across the owner's businesses.
ownerRouter.get("/voucher-lookup", async (req, res) => {
  const code = String(req.query.code ?? "").trim().toUpperCase();
  if (!code) return res.status(400).json({ error: "A code is required." });
  const v = await prisma.voucher.findFirst({ where: { code, business: { ownerId: req.ownerId } }, include: { business: { select: { name: true } } } });
  if (!v) return res.status(404).json({ error: "No voucher matches that code." });
  res.json({ ...v, status: effectiveStatus(v) });
});
ownerRouter.post("/voucher-redeem", async (req, res) => {
  const code = String(req.body.code ?? "").trim().toUpperCase();
  const v = await prisma.voucher.findFirst({ where: { code, business: { ownerId: req.ownerId } } });
  if (!v) return res.status(404).json({ error: "No voucher matches that code." });
  const status = effectiveStatus(v);
  if (status !== "ACTIVE") return res.status(400).json({ error: `This voucher is ${status.toLowerCase().replace("_", " ")} and can't be redeemed.` });

  let amount: number;
  if (v.kind === "FIXED") {
    amount = Math.round(Math.max(0, Math.min(v.balance, Number(req.body.amount) || v.balance)) * 100) / 100;
    if (amount <= 0) return res.status(400).json({ error: "Enter an amount to redeem." });
  } else {
    amount = v.value;
  }
  const newBalance = v.kind === "FIXED" ? Math.round((v.balance - amount) * 100) / 100 : 0;
  const fullyUsed = v.kind !== "FIXED" || newBalance <= 0.0001;
  const updated = await prisma.voucher.update({
    where: { id: v.id },
    data: { balance: newBalance, status: fullyUsed ? "REDEEMED" : "ACTIVE", redeemedAt: fullyUsed ? new Date() : v.redeemedAt },
  });
  await prisma.voucherRedemption.create({ data: { voucherId: v.id, amount, note: STR(req.body.note, 200) } });
  res.json({ ok: true, redeemed: amount, remainingBalance: updated.balance, status: updated.status, title: v.title });
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
