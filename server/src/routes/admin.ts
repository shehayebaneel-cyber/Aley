import bcrypt from "bcryptjs";
import { Router } from "express";
import { requireAdmin } from "../auth";
import { getContent, saveContent } from "../lib/content";
import { getMarketplaceSettings, saveMarketplaceSettings } from "../lib/marketplace";
import { prisma } from "../db";
import { recomputeProject, recomputeRating } from "../lib/ratings";
import { outBusiness, outProject, slugify, toJson } from "../lib/serialize";
import { recomputeOrder } from "./orders";

export const adminRouter = Router();
adminRouter.use(requireAdmin);

const STR = (v: unknown, max = 200) => String(v ?? "").slice(0, max).trim();

// GET /api/admin/dashboard — platform overview
adminRouter.get("/dashboard", async (_req, res) => {
  const [businesses, published, categories, pendingReviews, totalReviews, events, offers, users, owners, cities] = await Promise.all([
    prisma.business.count(),
    prisma.business.count({ where: { isPublished: true } }),
    prisma.category.count(),
    prisma.review.count({ where: { status: "PENDING" } }),
    prisma.review.count(),
    prisma.event.count(),
    prisma.offer.count(),
    prisma.user.count(),
    prisma.owner.count(),
    prisma.city.count({ where: { isActive: true } }),
  ]);
  const recent = await prisma.business.findMany({ orderBy: { createdAt: "desc" }, take: 6, include: { category: true } });
  const topViewed = await prisma.business.findMany({ orderBy: { viewCount: "desc" }, take: 6, include: { category: true } });
  res.json({
    stats: { businesses, published, unpublished: businesses - published, categories, pendingReviews, totalReviews, events, offers, users, owners, cities },
    recent: recent.map(outBusiness),
    topViewed: topViewed.map(outBusiness),
  });
});

// ---- Businesses ----
adminRouter.get("/businesses", async (req, res) => {
  const q = req.query as Record<string, string>;
  const where: Record<string, unknown> = {};
  if (q.search) where.OR = [{ name: { contains: q.search } }, { slug: { contains: q.search } }];
  if (q.status === "published") where.isPublished = true;
  if (q.status === "unpublished") where.isPublished = false;
  if (q.status === "featured") where.isFeatured = true;
  const list = await prisma.business.findMany({ where, orderBy: { createdAt: "desc" }, include: { category: true, owner: { select: { name: true, email: true } } } });
  res.json(list.map((b) => ({ ...outBusiness(b), owner: b.owner })));
});

// GET one business (full) for the admin editor, incl. owner + offers + events.
adminRouter.get("/businesses/:id", async (req, res) => {
  const business = await prisma.business.findUnique({
    where: { id: Number(req.params.id) },
    include: { category: true, owner: { select: { id: true, name: true, email: true, phone: true } }, offers: { orderBy: { createdAt: "desc" } }, events: { orderBy: { startTime: "desc" } } },
  });
  if (!business) return res.status(404).json({ error: "Business not found." });
  res.json({ ...outBusiness(business), owner: business.owner, offers: business.offers, events: business.events });
});

// Full edit — admin can change every field of any business.
adminRouter.patch("/businesses/:id", async (req, res) => {
  const id = Number(req.params.id);
  const b = req.body as Record<string, unknown>;
  const data: Record<string, unknown> = {};
  for (const key of ["isPublished", "isFeatured", "isVerified", "isClaimed"]) if (key in b) data[key] = !!b[key];
  if ("hasDelivery" in b) data.hasDelivery = !!b.hasDelivery;
  if ("hasReservations" in b) data.hasReservations = !!b.hasReservations;
  if ("name" in b) data.name = STR(b.name, 120) || undefined;
  if ("tagline" in b) data.tagline = STR(b.tagline, 160);
  if ("description" in b) data.description = STR(b.description, 4000);
  if ("logo" in b) data.logo = b.logo ? STR(b.logo, 500) : null;
  if ("cover" in b) data.cover = b.cover ? STR(b.cover, 500) : null;
  if ("phone" in b) data.phone = STR(b.phone, 40);
  if ("whatsapp" in b) data.whatsapp = STR(b.whatsapp, 40);
  if ("instagram" in b) data.instagram = STR(b.instagram, 80).replace(/^@/, "");
  if ("facebook" in b) data.facebook = STR(b.facebook, 200);
  if ("website" in b) data.website = STR(b.website, 200);
  if ("email" in b) data.email = STR(b.email, 120);
  if ("address" in b) data.address = STR(b.address, 200);
  if ("ownerName" in b) data.ownerName = STR(b.ownerName, 120);
  if ("productLabel" in b) data.productLabel = STR(b.productLabel, 60);
  if ("lat" in b) data.lat = b.lat === null || b.lat === "" ? null : Number(b.lat);
  if ("lng" in b) data.lng = b.lng === null || b.lng === "" ? null : Number(b.lng);
  if ("priceRange" in b) data.priceRange = Math.max(1, Math.min(4, Number(b.priceRange) || 2));
  if ("commissionRate" in b) data.commissionRate = Math.max(0, Math.min(100, Number(b.commissionRate) || 0));
  if ("categoryId" in b) data.categoryId = Number(b.categoryId);
  for (const key of ["gallery", "tags", "faqs", "products", "hours"]) if (key in b && Array.isArray(b[key])) data[key] = toJson(b[key] as unknown[]);
  const updated = await prisma.business.update({ where: { id }, data, include: { category: true } });
  res.json(outBusiness(updated));
});

adminRouter.delete("/businesses/:id", async (req, res) => {
  await prisma.business.delete({ where: { id: Number(req.params.id) } });
  res.json({ ok: true });
});

// Create an offer/event for a specific business (admin).
adminRouter.post("/businesses/:id/offers", async (req, res) => {
  const business = await prisma.business.findUnique({ where: { id: Number(req.params.id) } });
  if (!business) return res.status(404).json({ error: "Business not found." });
  const title = STR(req.body.title, 120);
  if (!title) return res.status(400).json({ error: "Offer title is required." });
  const offer = await prisma.offer.create({ data: { businessId: business.id, cityId: business.cityId, title, description: STR(req.body.description, 500), type: STR(req.body.type, 30) || "DISCOUNT", image: req.body.image ? STR(req.body.image, 500) : null, isActive: req.body.isActive !== false } });
  res.status(201).json(offer);
});
adminRouter.post("/businesses/:id/events", async (req, res) => {
  const business = await prisma.business.findUnique({ where: { id: Number(req.params.id) } });
  if (!business) return res.status(404).json({ error: "Business not found." });
  const title = STR(req.body.title, 120);
  const startTime = new Date(String(req.body.startTime));
  if (!title || Number.isNaN(startTime.getTime())) return res.status(400).json({ error: "Title and a valid date are required." });
  const event = await prisma.event.create({ data: { businessId: business.id, cityId: business.cityId, title, description: STR(req.body.description, 1000), category: STR(req.body.category, 40) || "Community", location: STR(req.body.location, 160) || business.name, image: req.body.image ? STR(req.body.image, 500) : null, startTime, isPublished: req.body.isPublished !== false } });
  res.status(201).json(event);
});

// Assign / unassign a business owner. Creates the owner login if new and returns
// the generated password so the admin can hand it to the owner.
adminRouter.post("/businesses/:id/owner", async (req, res) => {
  const id = Number(req.params.id);
  const business = await prisma.business.findUnique({ where: { id } });
  if (!business) return res.status(404).json({ error: "Business not found." });
  const email = STR(req.body.email, 120).toLowerCase();
  const name = STR(req.body.name, 120) || email;
  if (!email) return res.status(400).json({ error: "Owner email is required." });

  let owner = await prisma.owner.findUnique({ where: { email } });
  let createdPassword: string | undefined;
  if (!owner) {
    createdPassword = STR(req.body.password) || Math.random().toString(36).slice(2, 10);
    owner = await prisma.owner.create({ data: { name, email, phone: STR(req.body.phone, 40), passwordHash: await bcrypt.hash(createdPassword, 10) } });
  }
  await prisma.business.update({ where: { id }, data: { ownerId: owner.id, isClaimed: true } });
  res.json({ owner: { id: owner.id, name: owner.name, email: owner.email }, createdPassword });
});
adminRouter.delete("/businesses/:id/owner", async (req, res) => {
  await prisma.business.update({ where: { id: Number(req.params.id) }, data: { ownerId: null, isClaimed: false } });
  res.json({ ok: true });
});

// ---- Categories ----
adminRouter.get("/categories", async (_req, res) => {
  const cats = await prisma.category.findMany({ orderBy: { sortOrder: "asc" }, include: { _count: { select: { businesses: true } } } });
  res.json(cats.map((c) => ({ ...c, count: c._count.businesses })));
});

adminRouter.post("/categories", async (req, res) => {
  const name = STR(req.body.name, 60);
  if (!name) return res.status(400).json({ error: "Category name is required." });
  let base = slugify(name) || "category";
  let slug = base;
  for (let i = 2; await prisma.category.findUnique({ where: { slug } }); i++) slug = `${base}-${i}`;
  const max = await prisma.category.aggregate({ _max: { sortOrder: true } });
  const cat = await prisma.category.create({
    data: { name, slug, icon: STR(req.body.icon, 8) || "🏷️", color: STR(req.body.color, 16) || "#0d9488", sortOrder: (max._max.sortOrder ?? 0) + 1 },
  });
  res.status(201).json(cat);
});

adminRouter.patch("/categories/:id", async (req, res) => {
  const b = req.body as Record<string, unknown>;
  const data: Record<string, unknown> = {};
  if ("name" in b) data.name = STR(b.name, 60);
  if ("icon" in b) data.icon = STR(b.icon, 8);
  if ("color" in b) data.color = STR(b.color, 16);
  if ("isActive" in b) data.isActive = !!b.isActive;
  if ("sortOrder" in b) data.sortOrder = Number(b.sortOrder);
  res.json(await prisma.category.update({ where: { id: Number(req.params.id) }, data }));
});

adminRouter.delete("/categories/:id", async (req, res) => {
  const count = await prisma.business.count({ where: { categoryId: Number(req.params.id) } });
  if (count > 0) return res.status(400).json({ error: `Can't delete — ${count} business(es) use this category. Reassign them first.` });
  await prisma.category.delete({ where: { id: Number(req.params.id) } });
  res.json({ ok: true });
});

// ---- Reviews (moderation) ----
adminRouter.get("/reviews", async (req, res) => {
  const status = String(req.query.status ?? "");
  const reviews = await prisma.review.findMany({
    where: status ? { status } : undefined,
    orderBy: { createdAt: "desc" },
    take: 200,
    include: { business: { select: { name: true, slug: true } } },
  });
  res.json(reviews);
});

adminRouter.patch("/reviews/:id", async (req, res) => {
  const status = String(req.body.status ?? "");
  if (!["PENDING", "APPROVED", "REJECTED"].includes(status)) return res.status(400).json({ error: "Invalid status." });
  const review = await prisma.review.update({ where: { id: Number(req.params.id) }, data: { status } });
  await recomputeRating(review.businessId);
  res.json(review);
});

adminRouter.delete("/reviews/:id", async (req, res) => {
  const review = await prisma.review.delete({ where: { id: Number(req.params.id) } });
  await recomputeRating(review.businessId);
  res.json({ ok: true });
});

// ---- Events & Offers (oversight) ----
adminRouter.get("/events", async (_req, res) => {
  res.json(await prisma.event.findMany({ orderBy: { startTime: "desc" }, include: { business: { select: { name: true, slug: true } } } }));
});
adminRouter.patch("/events/:id", async (req, res) => {
  res.json(await prisma.event.update({ where: { id: Number(req.params.id) }, data: { isPublished: !!req.body.isPublished } }));
});
adminRouter.delete("/events/:id", async (req, res) => {
  await prisma.event.delete({ where: { id: Number(req.params.id) } });
  res.json({ ok: true });
});

adminRouter.get("/offers", async (_req, res) => {
  res.json(await prisma.offer.findMany({ orderBy: { createdAt: "desc" }, include: { business: { select: { name: true, slug: true } } } }));
});
adminRouter.patch("/offers/:id", async (req, res) => {
  res.json(await prisma.offer.update({ where: { id: Number(req.params.id) }, data: { isActive: !!req.body.isActive } }));
});
adminRouter.delete("/offers/:id", async (req, res) => {
  await prisma.offer.delete({ where: { id: Number(req.params.id) } });
  res.json({ ok: true });
});

// ---- Cities (multi-city control) ----
adminRouter.get("/cities", async (_req, res) => {
  const cities = await prisma.city.findMany({ orderBy: { sortOrder: "asc" }, include: { _count: { select: { businesses: true } } } });
  res.json(cities.map((c) => ({ ...c, count: c._count.businesses })));
});
adminRouter.post("/cities", async (req, res) => {
  const name = STR(req.body.name, 60);
  if (!name) return res.status(400).json({ error: "City name is required." });
  let base = slugify(name) || "city";
  let slug = base;
  for (let i = 2; await prisma.city.findUnique({ where: { slug } }); i++) slug = `${base}-${i}`;
  const max = await prisma.city.aggregate({ _max: { sortOrder: true } });
  const city = await prisma.city.create({
    data: { name, slug, nameAr: STR(req.body.nameAr, 60), tagline: STR(req.body.tagline, 160), isActive: req.body.isActive !== false, sortOrder: (max._max.sortOrder ?? 0) + 1 },
  });
  res.status(201).json(city);
});
adminRouter.patch("/cities/:id", async (req, res) => {
  const b = req.body as Record<string, unknown>;
  const data: Record<string, unknown> = {};
  if ("name" in b) data.name = STR(b.name, 60);
  if ("nameAr" in b) data.nameAr = STR(b.nameAr, 60);
  if ("tagline" in b) data.tagline = STR(b.tagline, 160);
  if ("isActive" in b) data.isActive = !!b.isActive;
  res.json(await prisma.city.update({ where: { id: Number(req.params.id) }, data }));
});

// ---- Site content (CMS) ----
adminRouter.get("/content", async (_req, res) => res.json(await getContent()));
adminRouter.put("/content", async (req, res) => res.json(await saveContent(req.body)));

// ---- Marketplace settings (delivery fee, free threshold, default commission) ----
adminRouter.get("/marketplace", async (_req, res) => res.json(await getMarketplaceSettings()));
adminRouter.put("/marketplace", async (req, res) => res.json(await saveMarketplaceSettings(req.body)));

// ---- Community Projects ----
adminRouter.get("/projects", async (_req, res) => {
  const projects = await prisma.project.findMany({ orderBy: { createdAt: "desc" }, include: { _count: { select: { donations: true, comments: true } } } });
  res.json(projects.map((p) => ({ ...outProject(p), _count: p._count })));
});

adminRouter.post("/projects", async (req, res) => {
  const title = STR(req.body.title, 140);
  if (!title) return res.status(400).json({ error: "Title is required." });
  let base = slugify(title) || "project";
  let slug = base;
  for (let i = 2; await prisma.project.findUnique({ where: { slug } }); i++) slug = `${base}-${i}`;
  const aley = await prisma.city.findUnique({ where: { slug: "aley" } });
  const project = await prisma.project.create({
    data: { slug, cityId: aley!.id, title, type: STR(req.body.type, 40), description: STR(req.body.description, 3000), location: STR(req.body.location, 160), fundingGoal: Math.max(0, Number(req.body.fundingGoal) || 0), status: STR(req.body.status, 20) || "FUNDING", manager: STR(req.body.manager, 120) },
  });
  res.status(201).json(outProject(project));
});

const PROJECT_STATUSES = ["PROPOSED", "FUNDING", "APPROVED", "IN_PROGRESS", "COMPLETED", "PAUSED"];
adminRouter.patch("/projects/:id", async (req, res) => {
  const b = req.body as Record<string, unknown>;
  const data: Record<string, unknown> = {};
  if ("title" in b) data.title = STR(b.title, 140);
  if ("description" in b) data.description = STR(b.description, 3000);
  if ("type" in b) data.type = STR(b.type, 40);
  if ("location" in b) data.location = STR(b.location, 160);
  if ("manager" in b) data.manager = STR(b.manager, 120);
  if ("status" in b && PROJECT_STATUSES.includes(String(b.status))) data.status = b.status;
  if ("fundingGoal" in b) data.fundingGoal = Math.max(0, Number(b.fundingGoal) || 0);
  if ("isFeatured" in b) data.isFeatured = !!b.isFeatured;
  if ("isPublished" in b) data.isPublished = !!b.isPublished;
  if ("finalCost" in b) data.finalCost = b.finalCost === null || b.finalCost === "" ? null : Number(b.finalCost);
  if ("completedReport" in b) data.completedReport = STR(b.completedReport, 4000);
  for (const k of ["beforePhotos", "proposedPhotos", "progressPhotos"]) if (k in b && Array.isArray(b[k])) data[k] = toJson((b[k] as unknown[]).slice(0, 20));
  if ("timeline" in b && Array.isArray(b.timeline)) data.timeline = toJson((b.timeline as unknown[]).slice(0, 20));
  const project = await prisma.project.update({ where: { id: Number(req.params.id) }, data });
  res.json(outProject(project));
});

adminRouter.delete("/projects/:id", async (req, res) => {
  await prisma.project.delete({ where: { id: Number(req.params.id) } });
  res.json({ ok: true });
});

// Expenses (transparency)
adminRouter.post("/projects/:id/expenses", async (req, res) => {
  const projectId = Number(req.params.id);
  const label = STR(req.body.label, 160);
  if (!label) return res.status(400).json({ error: "Expense label is required." });
  const expense = await prisma.expense.create({ data: { projectId, label, amount: Math.max(0, Number(req.body.amount) || 0), contractor: STR(req.body.contractor, 160), receipt: req.body.receipt ? STR(req.body.receipt, 500) : null } });
  res.status(201).json(expense);
});
adminRouter.delete("/expenses/:id", async (req, res) => {
  await prisma.expense.delete({ where: { id: Number(req.params.id) } });
  res.json({ ok: true });
});

// Updates
adminRouter.post("/projects/:id/updates", async (req, res) => {
  const projectId = Number(req.params.id);
  const title = STR(req.body.title, 140);
  if (!title) return res.status(400).json({ error: "Update title is required." });
  const update = await prisma.projectUpdate.create({ data: { projectId, title, body: STR(req.body.body, 3000), images: toJson(Array.isArray(req.body.images) ? req.body.images : []) } });
  res.status(201).json(update);
});
adminRouter.delete("/updates/:id", async (req, res) => {
  await prisma.projectUpdate.delete({ where: { id: Number(req.params.id) } });
  res.json({ ok: true });
});

// Donations (manage)
adminRouter.get("/projects/:id/donations", async (req, res) => {
  res.json(await prisma.donation.findMany({ where: { projectId: Number(req.params.id) }, orderBy: { createdAt: "desc" } }));
});
adminRouter.delete("/donations/:id", async (req, res) => {
  const donation = await prisma.donation.delete({ where: { id: Number(req.params.id) } });
  await recomputeProject(donation.projectId);
  res.json({ ok: true });
});

// ---- Marketplace orders (full combined view) ----
adminRouter.get("/orders", async (req, res) => {
  const status = String(req.query.status ?? "");
  const where: Record<string, unknown> = {};
  if (status === "active") where.deliveryStatus = { in: ["PENDING", "COLLECTING", "OUT_FOR_DELIVERY"] };
  else if (status) where.deliveryStatus = status;
  const orders = await prisma.order.findMany({
    where,
    orderBy: { createdAt: "desc" },
    take: 200,
    include: { businessOrders: { include: { items: true, business: { select: { name: true, slug: true } } } } },
  });
  res.json(orders);
});

adminRouter.get("/orders/:id", async (req, res) => {
  const order = await prisma.order.findUnique({ where: { id: Number(req.params.id) }, include: { businessOrders: { include: { items: true, business: { select: { name: true, slug: true, address: true, phone: true } } } } } });
  if (!order) return res.status(404).json({ error: "Order not found." });
  res.json(order);
});

const DELIVERY_STATUSES = ["PENDING", "COLLECTING", "OUT_FOR_DELIVERY", "DELIVERED", "CANCELLED"];
adminRouter.patch("/orders/:id", async (req, res) => {
  const id = Number(req.params.id);
  const b = req.body as Record<string, unknown>;
  const data: Record<string, unknown> = {};
  if ("deliveryStatus" in b && DELIVERY_STATUSES.includes(String(b.deliveryStatus))) {
    data.deliveryStatus = b.deliveryStatus;
    if (b.deliveryStatus === "DELIVERED") data.status = "COMPLETED";
  }
  if ("driverName" in b) data.driverName = STR(b.driverName, 120);
  if ("paid" in b) data.paid = !!b.paid;
  const order = await prisma.order.update({ where: { id }, data, include: { businessOrders: { include: { items: true, business: { select: { name: true, slug: true } } } } } });
  res.json(order);
});

// Cancel a single business ticket (admin) without cancelling the whole order.
adminRouter.patch("/business-orders/:id", async (req, res) => {
  const id = Number(req.params.id);
  const status = String(req.body.status ?? "");
  if (!["PENDING", "PREPARING", "READY", "CANCELLED"].includes(status)) return res.status(400).json({ error: "Invalid status." });
  const ticket = await prisma.businessOrder.update({ where: { id }, data: { status } });
  await recomputeOrder(ticket.orderId);
  res.json(ticket);
});

// ---- Users & owners (directory) ----
adminRouter.get("/users", async (_req, res) => {
  const users = await prisma.user.findMany({ orderBy: { createdAt: "desc" }, take: 300, include: { _count: { select: { reviews: true, favorites: true } } } });
  res.json(users.map((u) => ({ id: u.id, name: u.name, email: u.email, createdAt: u.createdAt, reviews: u._count.reviews, favorites: u._count.favorites })));
});
adminRouter.get("/owners", async (_req, res) => {
  const owners = await prisma.owner.findMany({ orderBy: { createdAt: "desc" }, take: 300, include: { _count: { select: { businesses: true } } } });
  res.json(owners.map((o) => ({ id: o.id, name: o.name, email: o.email, phone: o.phone, createdAt: o.createdAt, businesses: o._count.businesses })));
});
