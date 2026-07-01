import { Router } from "express";
import { optionalUser } from "../auth";
import { prisma } from "../db";
import { outCard } from "../lib/serialize";

// Discover: curated collections of places (public read).
export const collectionsRouter = Router();

const cover = (c: { coverImage: string | null; items?: { business: { cover: string | null } }[] }) =>
  c.coverImage || c.items?.find((i) => i.business?.cover)?.business.cover || null;

// GET /api/collections[?featured=true&city=slug] — list active collections.
collectionsRouter.get("/", async (req, res) => {
  const q = req.query as Record<string, string>;
  const where: Record<string, unknown> = { isActive: true };
  if (q.featured === "true") where.isFeatured = true;
  if (q.city) where.OR = [{ cityId: null }, { city: { is: { slug: q.city } } }];
  const cols = await prisma.collection.findMany({
    where, orderBy: [{ sortOrder: "asc" }, { id: "asc" }],
    include: { items: { include: { business: { select: { cover: true } } }, take: 1 }, _count: { select: { items: true } } },
  });
  res.json(cols.map((c) => ({ id: c.id, slug: c.slug, title: c.title, description: c.description, emoji: c.emoji, coverImage: cover(c), isFeatured: c.isFeatured, count: c._count.items })));
});

// GET /api/collections/:slug — collection + its places (for the curated page).
collectionsRouter.get("/:slug", optionalUser, async (req, res) => {
  const c = await prisma.collection.findUnique({
    where: { slug: req.params.slug },
    include: { items: { orderBy: [{ sortOrder: "asc" }, { id: "asc" }], include: { business: { include: { category: true, city: { select: { slug: true, name: true } } } } } } },
  });
  if (!c || !c.isActive) return res.status(404).json({ error: "Collection not found." });
  const saved = req.userId ? !!(await prisma.collectionSave.findUnique({ where: { collectionId_userId: { collectionId: c.id, userId: req.userId } } })) : false;
  res.json({
    id: c.id, slug: c.slug, title: c.title, description: c.description, emoji: c.emoji,
    coverImage: cover(c), saved,
    businesses: c.items.filter((i) => i.business?.isPublished).map((i) => outCard(i.business)),
  });
});
