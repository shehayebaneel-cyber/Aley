import { Router } from "express";
import { optionalUser } from "../auth";
import { prisma } from "../db";
import { outBusiness, outCard } from "../lib/serialize";

// Cities, categories, events, offers, reviews, and the homepage aggregate.

export const citiesRouter = Router();
citiesRouter.get("/", async (_req, res) => {
  const cities = await prisma.city.findMany({ where: { isActive: true }, orderBy: { sortOrder: "asc" } });
  res.json(cities);
});

export const categoriesRouter = Router();
categoriesRouter.get("/", async (req, res) => {
  const city = String(req.query.city ?? "");
  const categories = await prisma.category.findMany({ where: { isActive: true }, orderBy: { sortOrder: "asc" } });
  // Attach a per-city business count so the UI can show "12 places".
  const counts = await prisma.business.groupBy({
    by: ["categoryId"],
    where: { isPublished: true, ...(city ? { city: { is: { slug: city } } } : {}) },
    _count: { _all: true },
  });
  const map = new Map(counts.map((c) => [c.categoryId, c._count._all]));
  res.json(categories.map((c) => ({ ...c, count: map.get(c.id) ?? 0 })));
});

export const eventsRouter = Router();
eventsRouter.get("/", async (req, res) => {
  const q = req.query as Record<string, string>;
  const where: Record<string, unknown> = { isPublished: true };
  if (q.city) where.city = { is: { slug: q.city } };
  if (q.category) where.category = q.category;
  if (q.upcoming !== "false") where.startTime = { gte: new Date(Date.now() - 86400000) };
  const events = await prisma.event.findMany({
    where,
    orderBy: { startTime: "asc" },
    include: { business: { select: { slug: true, name: true, logo: true } } },
  });
  res.json(events);
});

export const offersRouter = Router();
offersRouter.get("/", async (req, res) => {
  const q = req.query as Record<string, string>;
  const where: Record<string, unknown> = { isActive: true };
  if (q.city) where.city = { is: { slug: q.city } };
  const offers = await prisma.offer.findMany({
    where,
    orderBy: { createdAt: "desc" },
    include: {
      business: {
        select: {
          slug: true,
          name: true,
          logo: true,
          cover: true,
          category: { select: { slug: true, name: true, group: true, icon: true, color: true } },
        },
      },
    },
  });
  res.json(offers);
});

export const reviewsRouter = Router();
// POST /api/reviews — public submission; held for moderation (status PENDING).
reviewsRouter.post("/", optionalUser, async (req, res) => {
  const businessId = Number(req.body.businessId);
  const rating = Math.max(1, Math.min(5, Math.round(Number(req.body.rating) || 0)));
  const comment = String(req.body.comment ?? "").trim().slice(0, 1000);
  let authorName = String(req.body.authorName ?? "").trim().slice(0, 80);
  // Logged-in visitors don't need to type a name.
  if (!authorName && req.userId) {
    const u = await prisma.user.findUnique({ where: { id: req.userId } });
    authorName = u?.name ?? "";
  }
  if (!businessId || !rating || !authorName) {
    return res.status(400).json({ error: "Name and a star rating are required." });
  }
  const business = await prisma.business.findUnique({ where: { id: businessId } });
  if (!business) return res.status(404).json({ error: "Business not found." });
  await prisma.review.create({ data: { businessId, rating, authorName, comment, status: "PENDING", userId: req.userId ?? null } });
  res.status(201).json({ ok: true, message: "Thanks! Your review will appear once approved." });
});

// GET /api/home?city=aley — everything the homepage needs in one call.
export const homeRouter = Router();
homeRouter.get("/", async (req, res) => {
  const city = String(req.query.city ?? "aley");
  const cityWhere = { city: { is: { slug: city } } };
  const base = { isPublished: true, ...cityWhere };

  const [featured, newest, popular, offers, events, categories, cityRow, totalBusinesses] = await Promise.all([
    prisma.business.findMany({ where: { ...base, isFeatured: true }, take: 8, orderBy: { rating: "desc" }, include: { category: true } }),
    prisma.business.findMany({ where: base, take: 8, orderBy: { createdAt: "desc" }, include: { category: true } }),
    prisma.business.findMany({ where: base, take: 8, orderBy: [{ reviewCount: "desc" }, { rating: "desc" }], include: { category: true } }),
    prisma.offer.findMany({ where: { isActive: true, ...cityWhere }, take: 6, orderBy: { createdAt: "desc" }, include: { business: { select: { slug: true, name: true, logo: true, cover: true } } } }),
    prisma.event.findMany({ where: { isPublished: true, startTime: { gte: new Date(Date.now() - 86400000) }, ...cityWhere }, take: 6, orderBy: { startTime: "asc" }, include: { business: { select: { slug: true, name: true } } } }),
    prisma.category.findMany({ where: { isActive: true }, orderBy: { sortOrder: "asc" } }),
    prisma.city.findUnique({ where: { slug: city } }),
    prisma.business.count({ where: base }),
  ]);

  const counts = await prisma.business.groupBy({ by: ["categoryId"], where: base, _count: { _all: true } });
  const countMap = new Map(counts.map((c) => [c.categoryId, c._count._all]));

  const [eventsCount, offersCount, activeCategories] = await Promise.all([
    prisma.event.count({ where: { isPublished: true, ...cityWhere } }),
    prisma.offer.count({ where: { isActive: true, ...cityWhere } }),
    categories.filter((c) => (countMap.get(c.id) ?? 0) > 0).length,
  ]);

  res.json({
    city: cityRow,
    totalBusinesses,
    stats: { businesses: totalBusinesses, categories: activeCategories, events: eventsCount, offers: offersCount },
    featured: featured.map(outCard),
    newest: newest.map(outCard),
    popular: popular.map(outCard),
    offers,
    events,
    categories: categories.map((c) => ({ ...c, count: countMap.get(c.id) ?? 0 })).filter((c) => c.count > 0).slice(0, 12),
  });
});
