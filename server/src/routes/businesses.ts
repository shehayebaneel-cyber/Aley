import { Router } from "express";
import { prisma } from "../db";
import { isOpenNow, outBusiness, parseArr, type HoursRow } from "../lib/serialize";

export const businessesRouter = Router();

// GET /api/businesses — directory listing with search + filters.
// Query: city, category(slug), q, openNow, minRating, priceMax, delivery,
//        reservations, featured, sort(rating|reviews|newest|name)
businessesRouter.get("/", async (req, res) => {
  const q = req.query as Record<string, string>;
  const where: Record<string, unknown> = { isPublished: true };

  if (q.city) where.city = { is: { slug: q.city } };
  if (q.category) where.category = { is: { slug: q.category } };
  if (q.featured === "true") where.isFeatured = true;
  if (q.delivery === "true") where.hasDelivery = true;
  if (q.reservations === "true") where.hasReservations = true;
  if (q.priceMax) where.priceRange = { lte: Number(q.priceMax) };
  if (q.minRating) where.rating = { gte: Number(q.minRating) };
  if (q.q) {
    where.OR = [
      { name: { contains: q.q } },
      { tagline: { contains: q.q } },
      { description: { contains: q.q } },
      { tags: { contains: q.q } },
      { category: { is: { name: { contains: q.q } } } },
    ];
  }

  const orderBy =
    q.sort === "reviews"
      ? [{ reviewCount: "desc" as const }]
      : q.sort === "newest"
        ? [{ createdAt: "desc" as const }]
        : q.sort === "name"
          ? [{ name: "asc" as const }]
          : [{ isFeatured: "desc" as const }, { rating: "desc" as const }, { reviewCount: "desc" as const }];

  let rows = await prisma.business.findMany({
    where,
    orderBy,
    include: { category: true, city: { select: { slug: true, name: true } } },
  });

  // "Open now" is computed from the JSON hours, so filter after fetching.
  let list = rows.map(outBusiness);
  if (q.openNow === "true") list = list.filter((b) => b.openNow);

  res.json(list);
});

// GET /api/businesses/:slug — full public profile.
businessesRouter.get("/:slug", async (req, res) => {
  const business = await prisma.business.findUnique({
    where: { slug: req.params.slug },
    include: {
      category: true,
      city: { select: { slug: true, name: true, lat: true, lng: true } },
      reviews: { where: { status: "APPROVED" }, orderBy: { createdAt: "desc" }, take: 50 },
      offers: { where: { isActive: true }, orderBy: { createdAt: "desc" } },
      events: { where: { isPublished: true, startTime: { gte: new Date(Date.now() - 86400000) } }, orderBy: { startTime: "asc" } },
    },
  });
  if (!business || !business.isPublished) return res.status(404).json({ error: "Business not found." });

  // Fire-and-forget view count bump.
  prisma.business.update({ where: { id: business.id }, data: { viewCount: { increment: 1 } } }).catch(() => {});

  res.json(outBusiness(business));
});

// GET /api/businesses/:slug/related — same category, same city.
businessesRouter.get("/:slug/related", async (req, res) => {
  const base = await prisma.business.findUnique({ where: { slug: req.params.slug } });
  if (!base) return res.json([]);
  const rows = await prisma.business.findMany({
    where: { isPublished: true, categoryId: base.categoryId, cityId: base.cityId, id: { not: base.id } },
    orderBy: [{ rating: "desc" }],
    take: 6,
    include: { category: true },
  });
  res.json(rows.map(outBusiness));
});

// GET /api/map — lightweight pins for the interactive map.
businessesRouter.get("/data/map", async (req, res) => {
  const city = String(req.query.city ?? "");
  const rows = await prisma.business.findMany({
    where: { isPublished: true, lat: { not: null }, lng: { not: null }, ...(city ? { city: { is: { slug: city } } } : {}) },
    include: { category: { select: { name: true, icon: true, color: true } } },
  });
  res.json(
    rows.map((b) => ({
      slug: b.slug,
      name: b.name,
      logo: b.logo,
      cover: b.cover,
      rating: b.rating,
      reviewCount: b.reviewCount,
      lat: b.lat,
      lng: b.lng,
      category: b.category,
      tags: parseArr(b.tags) as string[],
      hasDelivery: b.hasDelivery,
      hasReservations: b.hasReservations,
      priceRange: b.priceRange,
      openNow: isOpenNow(parseArr(b.hours) as HoursRow[]),
    }))
  );
});
