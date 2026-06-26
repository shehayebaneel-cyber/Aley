import { Router } from "express";
import { optionalUser } from "../auth";
import { prisma } from "../db";
import { notifyAdmins } from "../lib/notify";

// Public community board: Lost & Found posts + official Public Notices.

const STR = (v: unknown, max = 200) => String(v ?? "").slice(0, max).trim();

// ---- Lost & Found ----
export const lostFoundRouter = Router();

// GET /api/lost-found — browse posts. Filters: city, type (LOST|FOUND),
// category, status (default OPEN), q (search).
lostFoundRouter.get("/", async (req, res) => {
  const q = req.query as Record<string, string>;
  const where: Record<string, unknown> = { isPublished: true };
  if (q.city) where.city = { is: { slug: q.city } };
  if (q.type === "LOST" || q.type === "FOUND") where.type = q.type;
  if (q.category) where.category = q.category;
  where.status = q.status === "RESOLVED" ? "RESOLVED" : q.status === "ALL" ? undefined : "OPEN";
  if (where.status === undefined) delete where.status;
  if (q.q) {
    const term = q.q.trim();
    where.OR = [
      { title: { contains: term, mode: "insensitive" } },
      { description: { contains: term, mode: "insensitive" } },
      { location: { contains: term, mode: "insensitive" } },
    ];
  }
  const items = await prisma.lostFoundItem.findMany({ where, orderBy: { createdAt: "desc" }, take: 200 });
  res.json(items);
});

// POST /api/lost-found — anyone can post (logged-in optional). Goes live as OPEN.
lostFoundRouter.post("/", optionalUser, async (req, res) => {
  const type = req.body.type === "FOUND" ? "FOUND" : "LOST";
  const title = STR(req.body.title, 120);
  const description = STR(req.body.description, 2000);
  const category = STR(req.body.category, 40) || "Other";
  const location = STR(req.body.location, 160);
  const date = STR(req.body.date, 20);
  const image = STR(req.body.image, 500) || null;
  const contactName = STR(req.body.contactName, 80);
  const contactPhone = STR(req.body.contactPhone, 40);
  const contactEmail = STR(req.body.contactEmail, 120);

  if (!title || !contactName || (!contactPhone && !contactEmail)) {
    return res.status(400).json({ error: "A title, your name, and a phone or email are required." });
  }

  const citySlug = STR(req.body.city, 40) || "aley";
  const city = await prisma.city.findUnique({ where: { slug: citySlug } });
  if (!city) return res.status(400).json({ error: "Unknown city." });

  const item = await prisma.lostFoundItem.create({
    data: { cityId: city.id, type, title, description, category, location, date, image, contactName, contactPhone, contactEmail, userId: req.userId ?? null },
  });
  await notifyAdmins({
    kind: "LOST_FOUND",
    title: `New ${type === "LOST" ? "Lost" : "Found"} post: ${title}`,
    body: `${category}${location ? ` · ${location}` : ""} · ${contactName} ${contactPhone || contactEmail}`,
    link: "/admin/lost-found",
  });
  res.status(201).json({ ok: true, item, message: "Posted! Your listing is now live on the community board." });
});

// ---- Public Notices / Announcements ----
export const announcementsRouter = Router();

// GET /api/announcements — official notices. Filters: city, category.
// Only published, non-expired notices; pinned first, then most recent.
announcementsRouter.get("/", async (req, res) => {
  const q = req.query as Record<string, string>;
  const where: Record<string, unknown> = {
    isPublished: true,
    OR: [{ expiresAt: null }, { expiresAt: { gt: new Date() } }],
  };
  if (q.city) where.city = { is: { slug: q.city } };
  if (q.category) where.category = q.category;
  const items = await prisma.announcement.findMany({
    where,
    orderBy: [{ isPinned: "desc" }, { publishedAt: "desc" }],
    take: 200,
  });
  res.json(items);
});

// GET /api/announcements/:id — a single notice.
announcementsRouter.get("/:id", async (req, res) => {
  const item = await prisma.announcement.findUnique({ where: { id: Number(req.params.id) } });
  if (!item || !item.isPublished) return res.status(404).json({ error: "Notice not found." });
  res.json(item);
});
