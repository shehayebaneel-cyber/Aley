import { Router } from "express";
import { optionalUser } from "../auth";
import { prisma } from "../db";
import { notifyAdmins } from "../lib/notify";
import { outOffer, uniqueOfferCode } from "../lib/offers";

export const offersRouter = Router();
const STR = (v: unknown, max: number) => String(v ?? "").trim().slice(0, max);

const BUSINESS_SELECT = {
  slug: true, name: true, logo: true, cover: true, address: true, rating: true, reviewCount: true,
  category: { select: { slug: true, name: true, group: true, icon: true, color: true } },
} as const;

/** Active, non-expired offers. */
const liveWhere = (city?: string) => ({
  isActive: true,
  ...(city ? { city: { is: { slug: city } } } : {}),
  OR: [{ endDate: null }, { endDate: { gte: new Date() } }],
});

// GET /api/offers — the deals marketplace feed (enriched; client builds the sections).
offersRouter.get("/", optionalUser, async (req, res) => {
  const q = req.query as Record<string, string>;
  const offers = await prisma.offer.findMany({
    where: liveWhere(q.city),
    orderBy: [{ isFeatured: "desc" }, { createdAt: "desc" }],
    include: { business: { select: BUSINESS_SELECT } },
  });
  let savedSet = new Set<number>();
  if (req.userId) {
    const saves = await prisma.offerSave.findMany({ where: { userId: req.userId }, select: { offerId: true } });
    savedSet = new Set(saves.map((s) => s.offerId));
  }
  res.json(offers.map((o) => outOffer(o, { saved: savedSet.has(o.id) })));
});

// GET /api/offers/:id — full offer detail + similar offers.
offersRouter.get("/:id", optionalUser, async (req, res) => {
  const id = Number(req.params.id);
  const offer = await prisma.offer.findUnique({ where: { id }, include: { business: { select: { ...BUSINESS_SELECT, id: true, phone: true, whatsapp: true, categoryId: true } } } });
  if (!offer || !offer.isActive) return res.status(404).json({ error: "Offer not found." });

  prisma.offer.update({ where: { id }, data: { viewCount: { increment: 1 } } }).catch(() => {});

  const saved = req.userId ? !!(await prisma.offerSave.findUnique({ where: { userId_offerId: { userId: req.userId, offerId: id } } })) : false;

  // Similar = same category (or same business), other live offers.
  const similarRows = await prisma.offer.findMany({
    where: { ...liveWhere(), id: { not: id }, business: { is: { categoryId: offer.business.categoryId } } },
    orderBy: [{ isFeatured: "desc" }, { createdAt: "desc" }],
    take: 6,
    include: { business: { select: BUSINESS_SELECT } },
  });

  res.json({
    ...outOffer(offer, { saved }),
    business: {
      slug: offer.business.slug, name: offer.business.name, logo: offer.business.logo, cover: offer.business.cover,
      address: offer.business.address, rating: offer.business.rating, reviewCount: offer.business.reviewCount,
      phone: offer.business.phone, whatsapp: offer.business.whatsapp, category: offer.business.category,
    },
    similar: similarRows.map((o) => outOffer(o)),
  });
});

// POST /api/offers/:id/claim — claim/redeem an offer → unique code + QR shown to staff.
offersRouter.post("/:id/claim", optionalUser, async (req, res) => {
  const id = Number(req.params.id);
  const offer = await prisma.offer.findUnique({ where: { id }, include: { business: { select: { id: true, name: true } } } });
  if (!offer || !offer.isActive) return res.status(404).json({ error: "Offer not found or no longer active." });
  if (offer.endDate && new Date(offer.endDate).getTime() < Date.now()) return res.status(410).json({ error: "This offer has expired." });
  if (offer.maxRedemptions > 0 && offer.redeemedCount >= offer.maxRedemptions) return res.status(409).json({ error: "This offer is fully claimed." });

  let customerName = STR(req.body?.customerName, 80);
  const customerPhone = STR(req.body?.customerPhone, 40);
  if (req.userId && !customerName) {
    const u = await prisma.user.findUnique({ where: { id: req.userId } });
    customerName = u?.name ?? "";
  }
  if (!customerName) return res.status(400).json({ error: "Your name is required to claim this offer." });

  // One active claim per logged-in user per offer (re-use the existing code).
  if (req.userId) {
    const existing = await prisma.offerRedemption.findFirst({ where: { offerId: id, userId: req.userId, status: "CLAIMED" } });
    if (existing) return res.status(200).json({ ok: true, code: existing.code, redemption: existing, reused: true });
  }

  const code = await uniqueOfferCode();
  const redemption = await prisma.offerRedemption.create({
    data: { offerId: id, businessId: offer.business.id, userId: req.userId ?? null, code, customerName, customerPhone },
  });
  await prisma.offer.update({ where: { id }, data: { redeemedCount: { increment: 1 } } });
  await notifyAdmins({ kind: "OFFER_CLAIMED", title: `Offer claimed: ${offer.business.name}`, body: `${customerName} claimed "${offer.title}". Code ${code}.`, link: "/admin/events-offers" });

  res.status(201).json({ ok: true, code, redemption });
});
