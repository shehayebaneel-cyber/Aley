import bcrypt from "bcryptjs";
import { Router } from "express";
import { requireAdmin } from "../auth";
import { platformMetrics, resolveRange } from "../lib/analytics";
import { getContent, saveContent } from "../lib/content";
import { DELIVERY_STATUSES as COURIER_STATUSES, driverEarnings, effectiveDriverCommission, getDeliverySettings, saveDeliverySettings } from "../lib/delivery";
import { getMarketplaceSettings, saveMarketplaceSettings } from "../lib/marketplace";
import { prisma } from "../db";
import { recomputeProject, recomputeRating } from "../lib/ratings";
import { addAdjustment, generatePayout, refundTransaction, setPayoutStatus } from "../lib/ledger";
import { toCsv } from "../lib/csv";
import { outBusiness, outProject, slugify, toJson } from "../lib/serialize";
import { recomputeOrder } from "./orders";

export const adminRouter = Router();
adminRouter.use(requireAdmin);

const STR = (v: unknown, max = 200) => String(v ?? "").slice(0, max).trim();

// GET /api/admin/dashboard — platform overview
adminRouter.get("/dashboard", async (_req, res) => {
  const [businesses, published, pendingBusinesses, pendingClaims, categories, pendingReviews, totalReviews, events, offers, users, owners, cities, lostFoundOpen, announcements, pendingDeliveries, pendingDrivers] = await Promise.all([
    prisma.business.count(),
    prisma.business.count({ where: { isPublished: true } }),
    prisma.business.count({ where: { reviewStatus: "PENDING" } }),
    prisma.businessClaim.count({ where: { status: "PENDING" } }),
    prisma.category.count(),
    prisma.review.count({ where: { status: "PENDING" } }),
    prisma.review.count(),
    prisma.event.count(),
    prisma.offer.count(),
    prisma.user.count(),
    prisma.owner.count(),
    prisma.city.count({ where: { isActive: true } }),
    prisma.lostFoundItem.count({ where: { status: "OPEN", isPublished: true } }),
    prisma.announcement.count({ where: { isPublished: true } }),
    prisma.deliveryRequest.count({ where: { status: "REQUESTED" } }),
    prisma.driver.count({ where: { status: "PENDING" } }),
  ]);
  const recent = await prisma.business.findMany({ orderBy: { createdAt: "desc" }, take: 6, include: { category: true } });
  const topViewed = await prisma.business.findMany({ orderBy: { viewCount: "desc" }, take: 6, include: { category: true } });
  res.json({
    stats: { businesses, published, unpublished: businesses - published, pendingBusinesses, pendingClaims, categories, pendingReviews, totalReviews, events, offers, users, owners, cities, lostFoundOpen, announcements, pendingDeliveries, pendingDrivers },
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
  if (q.status === "pending") where.reviewStatus = "PENDING";
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
  if ("hasBooking" in b) data.hasBooking = !!b.hasBooking;
  if ("bookingConfig" in b && b.bookingConfig && typeof b.bookingConfig === "object") data.bookingConfig = JSON.stringify(b.bookingConfig);
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

// Approve an owner-submitted business → goes public.
adminRouter.post("/businesses/:id/approve", async (req, res) => {
  const updated = await prisma.business.update({
    where: { id: Number(req.params.id) },
    data: { reviewStatus: "APPROVED", isPublished: true },
    include: { category: true },
  });
  res.json(outBusiness(updated));
});

// Reject an owner-submitted business → stays hidden.
adminRouter.post("/businesses/:id/reject", async (req, res) => {
  const updated = await prisma.business.update({
    where: { id: Number(req.params.id) },
    data: { reviewStatus: "REJECTED", isPublished: false },
    include: { category: true },
  });
  res.json(outBusiness(updated));
});

// ---- Bulk import businesses (CSV from OSM fetcher) ----
const normPhone = (p: unknown): string => {
  const s = String(p ?? "").replace(/[^\d+]/g, "");
  if (!s) return "";
  if (s.startsWith("+")) return s;
  if (s.startsWith("00")) return "+" + s.slice(2);
  if (s.startsWith("0")) return "+961" + s.slice(1);
  return s.length >= 7 ? "+961" + s : s;
};
adminRouter.post("/businesses/import", async (req, res) => {
  const rows = Array.isArray(req.body?.rows) ? (req.body.rows as Record<string, unknown>[]) : [];
  const dryRun = !!req.body?.dryRun;
  if (!rows.length) return res.status(400).json({ error: "No rows to import." });
  const city = await prisma.city.findUnique({ where: { slug: "aley" } });
  if (!city) return res.status(400).json({ error: "City 'aley' not found." });

  const cats = await prisma.category.findMany({ select: { id: true, slug: true, color: true } });
  const catMap = new Map(cats.map((c) => [c.slug, c]));
  const existing = await prisma.business.findMany({ select: { slug: true, name: true } });
  const slugSet = new Set(existing.map((b) => b.slug));
  const nameSet = new Set(existing.map((b) => b.name.toLowerCase().trim()));
  const batchNames = new Set<string>();
  const uniqueSlug = (base: string) => { let s = base || "business"; let i = 2; while (slugSet.has(s)) s = `${base}-${i++}`; slugSet.add(s); return s; };

  let created = 0, duplicates = 0, unknownCategories = 0;
  const byCategory: Record<string, number> = {};
  const toCreate: Record<string, unknown>[] = [];
  for (const r of rows) {
    const name = String(r.name ?? "").trim();
    const catSlug = String(r.category ?? "").trim();
    if (!name) continue;
    const cat = catMap.get(catSlug);
    if (!cat) { unknownCategories++; continue; }
    const key = name.toLowerCase();
    if (nameSet.has(key) || batchNames.has(key)) { duplicates++; continue; }
    batchNames.add(key);
    byCategory[catSlug] = (byCategory[catSlug] ?? 0) + 1;
    created++;
    if (!dryRun) {
      const phone = normPhone(r.phone);
      toCreate.push({
        slug: uniqueSlug(slugify(name)), cityId: city.id, categoryId: cat.id, name, phone, whatsapp: phone,
        address: String(r.address ?? "").slice(0, 200), website: String(r.website ?? "").slice(0, 200),
        lat: Number.isFinite(Number(r.lat)) && r.lat !== "" ? Number(r.lat) : null,
        lng: Number.isFinite(Number(r.lng)) && r.lng !== "" ? Number(r.lng) : null,
        logo: `https://ui-avatars.com/api/?name=${encodeURIComponent(name)}&background=${String(cat.color ?? "#0d9488").replace("#", "")}&color=fff&bold=true&size=256`,
        isPublished: true, isVerified: false, isClaimed: false, reviewStatus: "APPROVED",
      });
    }
  }
  if (!dryRun) for (let i = 0; i < toCreate.length; i += 200) await prisma.business.createMany({ data: toCreate.slice(i, i + 200) as never });
  res.json({ created, duplicates, unknownCategories, byCategory, total: rows.length, dryRun });
});

// ---- Notifications (admin alerts) ----
adminRouter.get("/notifications", async (_req, res) => {
  const [items, unread] = await Promise.all([
    prisma.notification.findMany({ orderBy: { createdAt: "desc" }, take: 50 }),
    prisma.notification.count({ where: { isRead: false } }),
  ]);
  res.json({ items, unread });
});
adminRouter.post("/notifications/read-all", async (_req, res) => {
  await prisma.notification.updateMany({ where: { isRead: false }, data: { isRead: true } });
  res.json({ ok: true });
});
adminRouter.post("/notifications/:id/read", async (req, res) => {
  await prisma.notification.update({ where: { id: Number(req.params.id) }, data: { isRead: true } });
  res.json({ ok: true });
});

// ---- Gift vouchers (oversight) ----
adminRouter.get("/vouchers", async (req, res) => {
  const q = req.query as Record<string, string>;
  const where: Record<string, unknown> = {};
  if (q.status) where.status = q.status;
  if (q.q) where.OR = [{ code: { contains: q.q, mode: "insensitive" } }, { recipientName: { contains: q.q, mode: "insensitive" } }, { title: { contains: q.q, mode: "insensitive" } }];
  const [items, all] = await Promise.all([
    prisma.voucher.findMany({ where, orderBy: { createdAt: "desc" }, take: 100, include: { business: { select: { name: true, slug: true } } } }),
    prisma.voucher.findMany({ select: { price: true, balance: true, value: true, kind: true, status: true } }),
  ]);
  const sold = all.length;
  const revenue = Math.round(all.reduce((s, v) => s + (v.price || 0), 0) * 100) / 100;
  const outstanding = Math.round(all.filter((v) => v.status === "ACTIVE").reduce((s, v) => s + (v.kind === "FIXED" ? v.balance : v.value), 0) * 100) / 100;
  const redeemed = all.filter((v) => v.status === "REDEEMED").length;
  res.json({ items, summary: { sold, revenue, outstanding, redeemed, redemptionRate: sold ? Math.round((redeemed / sold) * 100) : 0 } });
});
adminRouter.post("/vouchers/:id/disable", async (req, res) => {
  const v = await prisma.voucher.findUnique({ where: { id: Number(req.params.id) } });
  if (!v) return res.status(404).json({ error: "Voucher not found." });
  const disable = req.body?.disable !== false;
  res.json(await prisma.voucher.update({ where: { id: v.id }, data: { status: disable ? "DISABLED" : "ACTIVE" } }));
});

// ---- Finance: platform ledger, payouts, adjustments, commission settings ----
const round2 = (n: number) => Math.round(n * 100) / 100;

// Platform finance dashboard totals.
adminRouter.get("/finance", async (_req, res) => {
  const [txs, payouts, orders] = await Promise.all([
    prisma.transaction.findMany({ select: { amount: true, commission: true, net: true, refundedAmount: true, status: true, payoutStatus: true } }),
    prisma.payout.findMany({ select: { net: true, status: true } }),
    prisma.order.aggregate({ _sum: { deliveryFee: true } }),
  ]);
  const collected = txs.filter((t) => ["PAID", "PARTIALLY_REFUNDED"].includes(t.status));
  const sales = round2(collected.reduce((s, t) => s + t.amount, 0));
  const commission = round2(collected.reduce((s, t) => s + t.commission, 0));
  const refunds = round2(txs.reduce((s, t) => s + t.refundedAmount, 0));
  const deliveryFees = round2(orders._sum.deliveryFee ?? 0);
  const owed = round2(collected.filter((t) => t.payoutStatus !== "PAID").reduce((s, t) => s + (t.amount > 0 ? t.net * (t.amount - t.refundedAmount) / t.amount : t.net), 0));
  const paidOut = round2(payouts.filter((p) => p.status === "PAID").reduce((s, p) => s + p.net, 0));
  const pendingPayouts = round2(payouts.filter((p) => p.status === "PENDING").reduce((s, p) => s + p.net, 0));
  res.json({
    totalSales: sales, platformRevenue: round2(commission + deliveryFees), commissions: commission, deliveryFees,
    owedToBusinesses: owed, paidOut, pendingPayouts, refunds,
    failed: txs.filter((t) => t.status === "FAILED").length, transactions: txs.length,
  });
});

adminRouter.get("/transactions", async (req, res) => {
  const q = req.query as Record<string, string>;
  const where: Record<string, unknown> = {};
  if (q.source) where.source = q.source;
  if (q.status) where.status = q.status;
  if (q.q) where.OR = [{ code: { contains: q.q, mode: "insensitive" } }, { customerName: { contains: q.q, mode: "insensitive" } }, { description: { contains: q.q, mode: "insensitive" } }];
  const items = await prisma.transaction.findMany({ where, orderBy: { createdAt: "desc" }, take: 200, include: { business: { select: { name: true, slug: true } } } });
  res.json({ items });
});
adminRouter.get("/transactions.csv", async (_req, res) => {
  const txs = await prisma.transaction.findMany({ orderBy: { createdAt: "desc" }, include: { business: { select: { name: true } } } });
  res.setHeader("Content-Type", "text/csv");
  res.setHeader("Content-Disposition", `attachment; filename="aley-transactions.csv"`);
  res.send(toCsv(["ID", "Date", "Business", "Source", "Reference", "Customer", "Gross", "Commission", "DeliveryFee", "Net", "Payment", "Payout", "Refunded", "Notes"],
    txs.map((t) => [t.id, t.createdAt.toISOString().slice(0, 10), t.business?.name ?? "", t.source, t.code, t.customerName, t.amount, t.commission, t.deliveryFee, t.net, t.status, t.payoutStatus, t.refundedAmount, t.notes])));
});
adminRouter.post("/transactions/:id/refund", async (req, res) => {
  const r = await refundTransaction(Number(req.params.id), req.body?.amount != null ? Number(req.body.amount) : undefined, "admin");
  if ("error" in r) return res.status(400).json(r);
  res.json(r);
});
adminRouter.post("/adjustments", async (req, res) => {
  const businessId = Number(req.body.businessId);
  const net = Number(req.body.amount);
  if (!businessId || !Number.isFinite(net) || net === 0) return res.status(400).json({ error: "Business and a non-zero amount are required." });
  await addAdjustment(businessId, net, String(req.body.description ?? ""), "admin");
  res.json({ ok: true });
});

// ---- Payouts ----
adminRouter.get("/payouts", async (req, res) => {
  const where: Record<string, unknown> = {};
  if (req.query.status) where.status = String(req.query.status);
  const payouts = await prisma.payout.findMany({ where, orderBy: { createdAt: "desc" }, take: 200, include: { business: { select: { name: true, slug: true } } } });
  res.json(payouts);
});
adminRouter.post("/payouts/generate", async (req, res) => {
  const businessId = Number(req.body.businessId);
  if (!businessId) return res.status(400).json({ error: "Select a business." });
  const r = await generatePayout(businessId, String(req.body.periodStart ?? ""), String(req.body.periodEnd ?? ""), "admin");
  if ("error" in r) return res.status(400).json(r);
  res.json(r);
});
adminRouter.post("/payouts/:id/status", async (req, res) => {
  const status = String(req.body.status ?? "").toUpperCase();
  if (!["PAID", "FAILED", "CANCELLED"].includes(status)) return res.status(400).json({ error: "Invalid status." });
  const r = await setPayoutStatus(Number(req.params.id), status as "PAID" | "FAILED" | "CANCELLED", "admin");
  if ("error" in r) return res.status(400).json(r);
  res.json(r);
});

// ---- Commission settings (global + fixed fee + per-category) ----
adminRouter.get("/commission", async (_req, res) => {
  const [settings, cats] = await Promise.all([getMarketplaceSettings(), prisma.category.findMany({ where: { commissionRate: { gt: 0 } }, select: { id: true, slug: true, name: true, commissionRate: true }, orderBy: { name: "asc" } })]);
  res.json({ global: settings.commissionRate, fixedFee: settings.fixedFee, categories: cats });
});
adminRouter.post("/commission", async (req, res) => {
  const b = req.body as { global?: number; fixedFee?: number; category?: { id: number; rate: number } };
  if (b.global != null || b.fixedFee != null) await saveMarketplaceSettings({ ...(b.global != null ? { commissionRate: b.global } : {}), ...(b.fixedFee != null ? { fixedFee: b.fixedFee } : {}) });
  if (b.category?.id != null) await prisma.category.update({ where: { id: Number(b.category.id) }, data: { commissionRate: Math.max(0, Number(b.category.rate) || 0) } });
  res.json({ ok: true });
});

// ---- Business ownership claims ----

// ---- Business ownership claims ----
adminRouter.get("/claims", async (req, res) => {
  const status = String(req.query.status ?? "PENDING").toUpperCase();
  const claims = await prisma.businessClaim.findMany({
    where: status === "ALL" ? {} : { status },
    orderBy: { createdAt: "desc" },
    include: {
      business: { select: { id: true, name: true, slug: true, logo: true, cover: true, isClaimed: true } },
      owner: { select: { id: true, name: true, email: true, phone: true } },
    },
  });
  res.json(claims);
});

// Approve a claim → assign the business to that owner; reject any sibling claims.
adminRouter.post("/claims/:id/approve", async (req, res) => {
  const claim = await prisma.businessClaim.findUnique({ where: { id: Number(req.params.id) } });
  if (!claim) return res.status(404).json({ error: "Claim not found." });
  await prisma.business.update({ where: { id: claim.businessId }, data: { ownerId: claim.ownerId, isClaimed: true } });
  await prisma.businessClaim.update({ where: { id: claim.id }, data: { status: "APPROVED" } });
  // Any other pending claims for the same business are now moot.
  await prisma.businessClaim.updateMany({
    where: { businessId: claim.businessId, status: "PENDING", id: { not: claim.id } },
    data: { status: "REJECTED" },
  });
  res.json({ ok: true });
});
adminRouter.post("/claims/:id/reject", async (req, res) => {
  await prisma.businessClaim.update({ where: { id: Number(req.params.id) }, data: { status: "REJECTED" } });
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
    data: { name, slug, group: STR(req.body.group, 40) || "More", icon: STR(req.body.icon, 8) || "🏷️", color: STR(req.body.color, 16) || "#0d9488", sortOrder: (max._max.sortOrder ?? 0) + 1 },
  });
  res.status(201).json(cat);
});

// Rename a whole group (moves every category in it).
adminRouter.post("/categories/rename-group", async (req, res) => {
  const from = STR(req.body.from, 40);
  const to = STR(req.body.to, 40);
  if (!from || !to) return res.status(400).json({ error: "from and to are required." });
  const r = await prisma.category.updateMany({ where: { group: from }, data: { group: to } });
  res.json({ ok: true, moved: r.count });
});

adminRouter.patch("/categories/:id", async (req, res) => {
  const b = req.body as Record<string, unknown>;
  const data: Record<string, unknown> = {};
  if ("name" in b) data.name = STR(b.name, 60);
  if ("group" in b) data.group = STR(b.group, 40) || "More";
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

// ---- Platform analytics + leaderboards ----
adminRouter.get("/analytics", async (req, res) => {
  const q = req.query as Record<string, string>;
  const range = resolveRange(q.period ?? "30d", q.from, q.to);
  const data = await platformMetrics(range);
  res.json({ period: q.period ?? "30d", range: { start: range.start, end: range.end }, ...data });
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

// ---- Lost & Found (moderation) ----
adminRouter.get("/lost-found", async (req, res) => {
  const q = req.query as Record<string, string>;
  const where: Record<string, unknown> = {};
  if (q.type === "LOST" || q.type === "FOUND") where.type = q.type;
  if (q.status === "OPEN" || q.status === "RESOLVED") where.status = q.status;
  if (q.published === "false") where.isPublished = false;
  res.json(await prisma.lostFoundItem.findMany({ where, orderBy: { createdAt: "desc" }, take: 300 }));
});
adminRouter.patch("/lost-found/:id", async (req, res) => {
  const b = req.body as Record<string, unknown>;
  const data: Record<string, unknown> = {};
  if ("status" in b && ["OPEN", "RESOLVED"].includes(String(b.status))) data.status = b.status;
  if ("isPublished" in b) data.isPublished = !!b.isPublished;
  res.json(await prisma.lostFoundItem.update({ where: { id: Number(req.params.id) }, data }));
});
adminRouter.delete("/lost-found/:id", async (req, res) => {
  await prisma.lostFoundItem.delete({ where: { id: Number(req.params.id) } });
  res.json({ ok: true });
});

// ---- Public Notices / Announcements (full CRUD — official, admin-authored) ----
const ANNOUNCEMENT_CATEGORIES = ["GENERAL", "MUNICIPALITY", "UTILITY", "EMERGENCY", "EVENT", "ROADS", "WEATHER", "HEALTH"];
adminRouter.get("/announcements", async (_req, res) => {
  res.json(await prisma.announcement.findMany({ orderBy: [{ isPinned: "desc" }, { publishedAt: "desc" }], take: 300 }));
});
adminRouter.post("/announcements", async (req, res) => {
  const title = STR(req.body.title, 160);
  if (!title) return res.status(400).json({ error: "Title is required." });
  const category = ANNOUNCEMENT_CATEGORIES.includes(String(req.body.category)) ? String(req.body.category) : "GENERAL";
  const aley = await prisma.city.findUnique({ where: { slug: "aley" } });
  const item = await prisma.announcement.create({
    data: {
      cityId: aley!.id,
      title,
      body: STR(req.body.body, 5000),
      category,
      image: req.body.image ? STR(req.body.image, 500) : null,
      link: STR(req.body.link, 500),
      isPinned: !!req.body.isPinned,
      isPublished: req.body.isPublished !== false,
      expiresAt: req.body.expiresAt ? new Date(String(req.body.expiresAt)) : null,
    },
  });
  res.status(201).json(item);
});
adminRouter.patch("/announcements/:id", async (req, res) => {
  const b = req.body as Record<string, unknown>;
  const data: Record<string, unknown> = {};
  if ("title" in b) data.title = STR(b.title, 160);
  if ("body" in b) data.body = STR(b.body, 5000);
  if ("category" in b && ANNOUNCEMENT_CATEGORIES.includes(String(b.category))) data.category = b.category;
  if ("image" in b) data.image = b.image ? STR(b.image, 500) : null;
  if ("link" in b) data.link = STR(b.link, 500);
  if ("isPinned" in b) data.isPinned = !!b.isPinned;
  if ("isPublished" in b) data.isPublished = !!b.isPublished;
  if ("expiresAt" in b) data.expiresAt = b.expiresAt ? new Date(String(b.expiresAt)) : null;
  res.json(await prisma.announcement.update({ where: { id: Number(req.params.id) }, data }));
});
adminRouter.delete("/announcements/:id", async (req, res) => {
  await prisma.announcement.delete({ where: { id: Number(req.params.id) } });
  res.json({ ok: true });
});

// ---- Delivery service (courier requests) ----
adminRouter.get("/delivery", async (req, res) => {
  const q = req.query as Record<string, string>;
  const where: Record<string, unknown> = {};
  if (q.status === "active") where.status = { in: ["REQUESTED", "ACCEPTED", "DRIVER_ASSIGNED", "PICKED_UP", "ON_THE_WAY"] };
  else if (q.status) where.status = q.status;
  if (q.type) where.type = q.type;
  res.json(await prisma.deliveryRequest.findMany({ where, orderBy: { createdAt: "desc" }, take: 300 }));
});

adminRouter.get("/delivery/:id", async (req, res) => {
  const r = await prisma.deliveryRequest.findUnique({ where: { id: Number(req.params.id) } });
  if (!r) return res.status(404).json({ error: "Request not found." });
  res.json(r);
});

adminRouter.patch("/delivery/:id", async (req, res) => {
  const b = req.body as Record<string, unknown>;
  const data: Record<string, unknown> = {};
  if ("status" in b && COURIER_STATUSES.includes(String(b.status))) data.status = b.status;
  if ("driverName" in b) data.driverName = STR(b.driverName, 80);
  if ("driverPhone" in b) data.driverPhone = STR(b.driverPhone, 40);
  if ("finalPrice" in b) data.finalPrice = b.finalPrice === null || b.finalPrice === "" ? null : Math.max(0, Number(b.finalPrice) || 0);
  // Manually assign / unassign a driver (snapshots the driver's name+phone).
  if ("driverId" in b) {
    if (b.driverId === null || b.driverId === "") {
      data.driverId = null; data.driverName = ""; data.driverPhone = "";
    } else {
      const driver = await prisma.driver.findUnique({ where: { id: Number(b.driverId) } });
      if (!driver) return res.status(400).json({ error: "Driver not found." });
      data.driverId = driver.id; data.driverName = driver.name; data.driverPhone = driver.phone;
      const current = await prisma.deliveryRequest.findUnique({ where: { id: Number(req.params.id) } });
      if (current?.status === "REQUESTED" && !("status" in b)) data.status = "ACCEPTED";
    }
  }
  res.json(await prisma.deliveryRequest.update({ where: { id: Number(req.params.id) }, data }));
});

// ---- Drivers (accounts + approval + earnings) ----
adminRouter.get("/drivers", async (_req, res) => {
  const [drivers, settings] = await Promise.all([
    prisma.driver.findMany({ orderBy: { createdAt: "desc" }, include: { _count: { select: { deliveries: true } } } }),
    getDeliverySettings(),
  ]);
  const [delivered, deliveredOrders] = await Promise.all([
    prisma.deliveryRequest.findMany({ where: { status: "DELIVERED", driverId: { not: null } }, select: { driverId: true, finalPrice: true, estimatedMax: true } }),
    prisma.order.findMany({ where: { deliveryStatus: "DELIVERED", driverId: { not: null } }, select: { driverId: true, deliveryFee: true } }),
  ]);
  const earn = new Map<number, { jobs: number; net: number }>();
  for (const d of drivers) earn.set(d.id, { jobs: 0, net: 0 });
  for (const job of delivered) {
    const drv = drivers.find((x) => x.id === job.driverId);
    if (!drv) continue;
    const e = earn.get(drv.id)!;
    e.jobs += 1;
    e.net += driverEarnings(job.finalPrice ?? job.estimatedMax, effectiveDriverCommission(drv.commissionRate, settings)).net;
  }
  for (const job of deliveredOrders) {
    const drv = drivers.find((x) => x.id === job.driverId);
    if (!drv) continue;
    const e = earn.get(drv.id)!;
    e.jobs += 1;
    e.net += driverEarnings(job.deliveryFee, effectiveDriverCommission(drv.commissionRate, settings)).net;
  }
  res.json(drivers.map((d) => ({
    id: d.id, name: d.name, email: d.email, phone: d.phone, vehicle: d.vehicle, status: d.status,
    commissionRate: d.commissionRate, createdAt: d.createdAt, deliveries: d._count.deliveries,
    completed: earn.get(d.id)!.jobs, earnings: Math.round(earn.get(d.id)!.net * 100) / 100,
  })));
});

adminRouter.post("/drivers", async (req, res) => {
  const name = STR(req.body.name, 80);
  const phone = STR(req.body.phone, 40);
  const email = STR(req.body.email, 120).toLowerCase() || null;
  const password = String(req.body.password ?? "");
  if (!name || !phone || password.length < 6) return res.status(400).json({ error: "Name, phone, and a password (6+ chars) are required." });
  if (await prisma.driver.findUnique({ where: { phone } })) return res.status(409).json({ error: "A driver with this phone already exists." });
  if (email && (await prisma.driver.findUnique({ where: { email } }))) return res.status(409).json({ error: "A driver with this email already exists." });
  const driver = await prisma.driver.create({
    data: { name, phone, email, vehicle: STR(req.body.vehicle, 60), commissionRate: Math.max(0, Number(req.body.commissionRate) || 0), passwordHash: await bcrypt.hash(password, 10), status: "ACTIVE" },
  });
  res.status(201).json({ id: driver.id });
});

adminRouter.get("/drivers/:id", async (req, res) => {
  const driver = await prisma.driver.findUnique({ where: { id: Number(req.params.id) } });
  if (!driver) return res.status(404).json({ error: "Driver not found." });
  const settings = await getDeliverySettings();
  const [deliveries, orders] = await Promise.all([
    prisma.deliveryRequest.findMany({ where: { driverId: driver.id }, orderBy: { createdAt: "desc" }, take: 200 }),
    prisma.order.findMany({ where: { driverId: driver.id, deliveryStatus: "DELIVERED" }, select: { deliveryFee: true } }),
  ]);
  const commissionPct = effectiveDriverCommission(driver.commissionRate, settings);
  const completed = deliveries.filter((d) => d.status === "DELIVERED");
  const net = completed.reduce((s, d) => s + driverEarnings(d.finalPrice ?? d.estimatedMax, commissionPct).net, 0)
    + orders.reduce((s, o) => s + driverEarnings(o.deliveryFee, commissionPct).net, 0);
  res.json({
    driver: { id: driver.id, name: driver.name, email: driver.email, phone: driver.phone, vehicle: driver.vehicle, status: driver.status, commissionRate: driver.commissionRate, createdAt: driver.createdAt },
    earnings: { commissionPct, completed: completed.length + orders.length, net: Math.round(net * 100) / 100 },
    deliveries,
  });
});

adminRouter.patch("/drivers/:id", async (req, res) => {
  const b = req.body as Record<string, unknown>;
  const data: Record<string, unknown> = {};
  if ("status" in b && ["PENDING", "ACTIVE", "SUSPENDED"].includes(String(b.status))) data.status = b.status;
  if ("name" in b) data.name = STR(b.name, 80);
  if ("phone" in b) data.phone = STR(b.phone, 40);
  if ("email" in b) data.email = STR(b.email, 120).toLowerCase() || null;
  if ("vehicle" in b) data.vehicle = STR(b.vehicle, 60);
  if ("commissionRate" in b) data.commissionRate = Math.max(0, Number(b.commissionRate) || 0);
  if ("password" in b && String(b.password).length >= 6) data.passwordHash = await bcrypt.hash(String(b.password), 10);
  const driver = await prisma.driver.update({ where: { id: Number(req.params.id) }, data });
  res.json({ id: driver.id, status: driver.status });
});

adminRouter.delete("/drivers/:id", async (req, res) => {
  await prisma.driver.delete({ where: { id: Number(req.params.id) } });
  res.json({ ok: true });
});

// Delivery pricing settings
adminRouter.get("/delivery-settings", async (_req, res) => res.json(await getDeliverySettings()));
adminRouter.put("/delivery-settings", async (req, res) => res.json(await saveDeliverySettings(req.body)));
