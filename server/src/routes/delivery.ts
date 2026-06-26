import { Router } from "express";
import { optionalUser } from "../auth";
import { prisma } from "../db";
import {
  DELIVERY_TYPES, estimateDelivery, getDeliverySettings,
  PACKAGE_SIZES, URGENCIES,
} from "../lib/delivery";
import { notifyAdmins } from "../lib/notify";

export const deliveryRouter = Router();

const STR = (v: unknown, max = 300) => String(v ?? "").slice(0, max).trim();
const NUM = (v: unknown): number | null => {
  if (v === null || v === undefined || v === "") return null;
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
};
const genNumber = () => `DLV-${Date.now().toString(36).slice(-5).toUpperCase()}${Math.floor(Math.random() * 1296).toString(36).toUpperCase().padStart(2, "0")}`;

// Pull the pricing-relevant fields out of a request body.
function estimateInput(b: Record<string, unknown>) {
  return {
    type: STR(b.type, 30),
    pickupLat: NUM(b.pickupLat), pickupLng: NUM(b.pickupLng), pickupOutside: !!b.pickupOutside,
    dropoffLat: NUM(b.dropoffLat), dropoffLng: NUM(b.dropoffLng), dropoffOutside: !!b.dropoffOutside,
    packageSize: STR(b.packageSize, 20), urgency: STR(b.urgency, 20),
  };
}

// GET /api/delivery/config — pricing knobs (for transparency / future use).
deliveryRouter.get("/config", async (_req, res) => {
  res.json(await getDeliverySettings());
});

// POST /api/delivery/estimate — live price preview as the user fills the form.
deliveryRouter.post("/estimate", async (req, res) => {
  const settings = await getDeliverySettings();
  res.json(estimateDelivery(estimateInput(req.body ?? {}), settings));
});

// POST /api/delivery — create a delivery request. Stores a fresh server-side
// estimate (never trusts the client's price) and alerts the team.
deliveryRouter.post("/", optionalUser, async (req, res) => {
  const b = (req.body ?? {}) as Record<string, unknown>;
  const type = DELIVERY_TYPES.includes(STR(b.type, 30) as never) ? STR(b.type, 30) : "ALEY_TO_ALEY";
  const pickupLabel = STR(b.pickupLabel, 200);
  const dropoffLabel = STR(b.dropoffLabel, 200);
  const itemDescription = STR(b.itemDescription, 1000);
  const customerName = STR(b.customerName, 80);
  const customerPhone = STR(b.customerPhone, 40);

  if (!pickupLabel || !dropoffLabel || !itemDescription || !customerName || !customerPhone) {
    return res.status(400).json({ error: "Pickup, drop-off, what to deliver, your name and phone are all required." });
  }

  const citySlug = STR(b.city, 40) || "aley";
  const city = await prisma.city.findUnique({ where: { slug: citySlug } });
  if (!city) return res.status(400).json({ error: "Unknown city." });

  const settings = await getDeliverySettings();
  const est = estimateDelivery(estimateInput(b), settings);

  const packageSize = PACKAGE_SIZES.includes(STR(b.packageSize, 20) as never) ? STR(b.packageSize, 20) : "MEDIUM";
  const urgency = URGENCIES.includes(STR(b.urgency, 20) as never) ? STR(b.urgency, 20) : "STANDARD";

  const request = await prisma.deliveryRequest.create({
    data: {
      number: genNumber(),
      cityId: city.id,
      customerId: req.userId ?? null,
      type,
      pickupLabel, pickupPhone: STR(b.pickupPhone, 40), pickupLat: NUM(b.pickupLat), pickupLng: NUM(b.pickupLng), pickupOutside: est.pickupOutside,
      dropoffLabel, dropoffLat: NUM(b.dropoffLat), dropoffLng: NUM(b.dropoffLng), dropoffOutside: est.dropoffOutside,
      itemDescription,
      packageType: STR(b.packageType, 40) || "Parcel",
      packageSize, urgency,
      preferredTime: STR(b.preferredTime, 60),
      notes: STR(b.notes, 1000),
      customerName, customerPhone,
      businessId: NUM(b.businessId) ?? null,
      distanceKm: est.distanceKm, estimatedMin: est.min, estimatedMax: est.max,
    },
  });

  await notifyAdmins({
    kind: "DELIVERY",
    title: `New delivery request: ${request.number}`,
    body: `${pickupLabel} → ${dropoffLabel} · ${itemDescription.slice(0, 80)} · est. $${est.min}–$${est.max} · ${customerName} ${customerPhone}`,
    link: "/admin/delivery",
  });

  res.status(201).json({ ok: true, number: request.number, estimate: { min: est.min, max: est.max }, message: "Request received! The delivery team will confirm shortly." });
});

// GET /api/delivery/track/:number — public status lookup.
deliveryRouter.get("/track/:number", async (req, res) => {
  const r = await prisma.deliveryRequest.findUnique({ where: { number: req.params.number } });
  if (!r) return res.status(404).json({ error: "Delivery request not found." });
  res.json(r);
});
