import { Router } from "express";
import { optionalUser } from "../auth";
import { prisma } from "../db";
import { notifyAdmins } from "../lib/notify";
import { isQuoteCategory, verticalFor } from "../lib/requestCategories";
import { shopMatchesMake, parsePartsProfile, PART_REQUEST_DEFAULT_DAYS } from "../lib/parts";

// Generic "Request a Quote" — works for ANY quote-enabled category. One request
// broadcasts to every published business in that category (spare-parts also
// narrows by car make). Reuses the ServiceRequest/Target/Quote models.
export const requestsRouter = Router();
const STR = (v: unknown, max: number) => String(v ?? "").trim().slice(0, max);

// POST /api/requests — submit a quote request for a category.
requestsRouter.post("/", optionalUser, async (req, res) => {
  const b = req.body ?? {};
  const categorySlug = STR(b.categorySlug, 60);
  if (!isQuoteCategory(categorySlug)) return res.status(400).json({ error: "This category doesn't support quote requests." });

  const customerName = STR(b.customerName, 80);
  const customerPhone = STR(b.customerPhone, 40);
  if (!customerName || !customerPhone) return res.status(400).json({ error: "Your name and phone are required." });

  // payload = the category's smart-form fields (free-form object, validated client-side).
  const rawPayload = (b.payload && typeof b.payload === "object" && !Array.isArray(b.payload)) ? b.payload as Record<string, unknown> : {};
  const payload: Record<string, string> = {};
  for (const [k, v] of Object.entries(rawPayload)) payload[STR(k, 40)] = STR(v, 500);
  const photos = Array.isArray(b.photos) ? b.photos.slice(0, 6).map((p: unknown) => STR(p, 500)) : [];

  // Match: published businesses in the category (spare-parts narrows by make).
  const shops = await prisma.business.findMany({ where: { isPublished: true, category: { is: { slug: categorySlug } } }, select: { id: true, partsProfile: true } });
  const matched = categorySlug === "auto-parts" && payload.make
    ? shops.filter((s) => shopMatchesMake(parsePartsProfile(s.partsProfile), payload.make))
    : shops;
  if (matched.length === 0) return res.status(409).json({ error: "No businesses in this category yet — try again soon." });

  const request = await prisma.serviceRequest.create({
    data: {
      type: verticalFor(categorySlug), categorySlug, userId: req.userId ?? null,
      customerName, customerPhone, customerWhatsapp: STR(b.customerWhatsapp, 40), city: STR(b.city, 60),
      payload: JSON.stringify(payload), notes: STR(b.notes, 1000), photos: JSON.stringify(photos),
      budget: Math.max(0, Number(b.budget) || 0),
      status: "SENT", expiresAt: new Date(Date.now() + PART_REQUEST_DEFAULT_DAYS * 86400000),
      targets: { create: matched.map((s) => ({ businessId: s.id })) },
    },
  });
  await notifyAdmins({ kind: "QUOTE_REQUEST", title: "New quote request", body: `${customerName} requested a quote in "${categorySlug}" — sent to ${matched.length} business(es).`, link: "/admin/businesses" });
  res.status(201).json({ ok: true, requestId: request.id, sentTo: matched.length });
});
