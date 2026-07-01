import { Router } from "express";
import { optionalUser } from "../auth";
import { prisma } from "../db";
import { notifyAdmins } from "../lib/notify";
import { CAR_MAKES, CONDITIONS, PART_CATEGORIES, PART_REQUEST_DEFAULT_DAYS, SOURCING, outPartsShop, parsePartsProfile, shopMatchesMake } from "../lib/parts";

export const partsRouter = Router();
const STR = (v: unknown, max: number) => String(v ?? "").trim().slice(0, max);
const SHOP_SELECT = { id: true, slug: true, name: true, logo: true, cover: true, phone: true, whatsapp: true, address: true, rating: true, reviewCount: true, hasDelivery: true, partsProfile: true, city: { select: { slug: true, name: true } } } as const;

// GET /api/spare-parts/meta — car makes + part categories for filters & the form.
partsRouter.get("/meta", (_req, res) => {
  res.json({ makes: CAR_MAKES, partCategories: PART_CATEGORIES, conditions: CONDITIONS, sourcing: SOURCING });
});

// GET /api/spare-parts — spare-parts shops directory with filters.
// Query: make, partCategory, condition(NEW|USED), sourcing(OEM|AFTERMARKET), city, delivery, q
partsRouter.get("/", async (req, res) => {
  const q = req.query as Record<string, string>;
  const rows = await prisma.business.findMany({
    where: { isPublished: true, category: { is: { slug: "auto-parts" } }, ...(q.city ? { city: { is: { slug: q.city } } } : {}) },
    orderBy: [{ isFeatured: "desc" }, { rating: "desc" }],
    select: SHOP_SELECT,
  });
  let shops = rows.map(outPartsShop);
  const has = (arr: string[], v: string) => arr.some((x) => x.toLowerCase() === v.toLowerCase());
  if (q.make) shops = shops.filter((s) => !s.makes.length || has(s.makes, q.make));
  if (q.partCategory) shops = shops.filter((s) => !s.partCategories.length || has(s.partCategories, q.partCategory));
  if (q.condition === "NEW") shops = shops.filter((s) => s.newParts);
  if (q.condition === "USED") shops = shops.filter((s) => s.usedParts);
  if (q.sourcing === "OEM") shops = shops.filter((s) => s.oem);
  if (q.sourcing === "AFTERMARKET") shops = shops.filter((s) => s.aftermarket);
  if (q.delivery === "true") shops = shops.filter((s) => s.hasDelivery);
  const ql = (q.q ?? "").trim().toLowerCase();
  if (ql) shops = shops.filter((s) => `${s.name} ${s.brands.join(" ")} ${s.makes.join(" ")}`.toLowerCase().includes(ql));
  res.json(shops);
});

// POST /api/spare-parts/requests — submit ONE request → broadcast to matching shops.
partsRouter.post("/requests", optionalUser, async (req, res) => {
  const b = req.body ?? {};
  const customerName = STR(b.customerName, 80);
  const customerPhone = STR(b.customerPhone, 40);
  const make = STR(b.make, 40);
  const partNeeded = STR(b.partNeeded, 200);
  if (!customerName || !customerPhone) return res.status(400).json({ error: "Your name and phone are required." });
  if (!make || !partNeeded) return res.status(400).json({ error: "Car make and the part you need are required." });

  const payload = {
    make,
    model: STR(b.model, 60),
    year: STR(b.year, 8),
    engine: STR(b.engine, 40),
    vin: STR(b.vin, 40),
    plate: STR(b.plate, 20),
    partNeeded,
    partCategory: STR(b.partCategory, 40),
    condition: ["NEW", "USED", "ANY"].includes(String(b.condition)) ? String(b.condition) : "ANY",
    sourcing: ["OEM", "AFTERMARKET", "ANY"].includes(String(b.sourcing)) ? String(b.sourcing) : "ANY",
  };
  const city = STR(b.city, 60);
  const photos = Array.isArray(b.photos) ? b.photos.slice(0, 6).map((p: unknown) => STR(p, 500)) : [];

  // Match: published auto-parts shops that serve this make (or list no makes).
  const shops = await prisma.business.findMany({ where: { isPublished: true, category: { is: { slug: "auto-parts" } } }, select: { id: true, partsProfile: true } });
  const matched = shops.filter((s) => shopMatchesMake(parsePartsProfile(s.partsProfile), make));

  const request = await prisma.serviceRequest.create({
    data: {
      type: "SPARE_PARTS", categorySlug: "auto-parts", userId: req.userId ?? null,
      customerName, customerPhone, customerWhatsapp: STR(b.customerWhatsapp, 40), city,
      payload: JSON.stringify(payload), notes: STR(b.notes, 1000), photos: JSON.stringify(photos),
      budget: Math.max(0, Number(b.budget) || 0),
      status: "SENT", expiresAt: new Date(Date.now() + PART_REQUEST_DEFAULT_DAYS * 86400000),
      targets: { create: matched.map((s) => ({ businessId: s.id })) },
    },
  });
  await notifyAdmins({ kind: "PART_REQUEST", title: "New spare-parts request", body: `${customerName} needs: ${partNeeded} (${make}${payload.model ? " " + payload.model : ""}${payload.year ? " " + payload.year : ""}) — sent to ${matched.length} shop(s).`, link: "/admin/businesses" });

  res.status(201).json({ ok: true, requestId: request.id, sentTo: matched.length });
});
