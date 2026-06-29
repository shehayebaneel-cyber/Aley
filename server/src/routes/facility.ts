import { randomBytes } from "crypto";
import { Router } from "express";
import { optionalUser } from "../auth";
import { prisma } from "../db";
import { durationOptions, facilitySlots, priceFor, resolveFacilityPricing, resolveFacilitySchedule, _toMin } from "../lib/facility";
import { notifyAdmins } from "../lib/notify";
import { parseArr, type HoursRow } from "../lib/serialize";

export const facilityRouter = Router();
const STR = (v: unknown, max: number) => String(v ?? "").trim().slice(0, max);
const genCode = () => randomBytes(3).toString("hex").toUpperCase();

// Public summary of a facility for the booking UI.
function outFacility(f: any) {
  const pricing = resolveFacilityPricing(f.pricing);
  return {
    id: f.id, name: f.name, type: f.type, description: f.description, image: f.image,
    hourlyRate: f.hourlyRate, capacityNote: f.capacityNote,
    pricing: { weekendRate: pricing.weekendRate, peakRate: pricing.peakRate, peakStart: pricing.peakStart, peakEnd: pricing.peakEnd, nightRate: pricing.nightRate, nightStart: pricing.nightStart, holidayRate: pricing.holidayRate },
    durations: durationOptions(pricing),
  };
}

// GET /api/facilities/:slug — business + its bookable facilities.
facilityRouter.get("/:slug", async (req, res) => {
  const business = await prisma.business.findUnique({ where: { slug: req.params.slug } });
  if (!business || !business.isPublished) return res.status(404).json({ error: "Not found." });
  const facilities = await prisma.facility.findMany({ where: { businessId: business.id, isActive: true }, orderBy: [{ sortOrder: "asc" }, { id: "asc" }] });
  res.json({ businessId: business.id, businessName: business.name, facilities: facilities.map(outFacility) });
});

// GET /api/facilities/:slug/slots?facilityId=&date=&durationMin= — available start times + price.
facilityRouter.get("/:slug/slots", async (req, res) => {
  const business = await prisma.business.findUnique({ where: { slug: req.params.slug } });
  if (!business || !business.isPublished) return res.status(404).json({ error: "Not found." });
  const facility = await prisma.facility.findFirst({ where: { id: Number(req.query.facilityId), businessId: business.id, isActive: true } });
  if (!facility) return res.status(404).json({ error: "Facility not found." });
  const date = STR(req.query.date, 10);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) return res.status(400).json({ error: "A valid date is required." });
  const pricing = resolveFacilityPricing(facility.pricing);
  const durationMin = Math.max(30, Number(req.query.durationMin) || pricing.minHours * 60);

  const existing = await prisma.facilityBooking.findMany({ where: { facilityId: facility.id, date }, select: { startTime: true, durationMin: true, status: true } });
  const slots = facilitySlots({
    hourlyRate: facility.hourlyRate, pricing, schedule: resolveFacilitySchedule(facility.schedule),
    businessHours: parseArr(business.hours) as HoursRow[], dateStr: date, durationMin, existing, now: new Date(),
  });
  res.json({ slots, durationMin });
});

// POST /api/facilities/book — instant facility booking (CONFIRMED).
facilityRouter.post("/book", optionalUser, async (req, res) => {
  const b = req.body ?? {};
  const business = await prisma.business.findUnique({ where: { id: Number(b.businessId) } });
  if (!business || !business.isPublished) return res.status(404).json({ error: "Not found." });
  const facility = await prisma.facility.findFirst({ where: { id: Number(b.facilityId), businessId: business.id, isActive: true } });
  if (!facility) return res.status(404).json({ error: "Facility not available." });

  const customerName = STR(b.customerName, 80);
  const customerPhone = STR(b.customerPhone, 40);
  const date = STR(b.date, 10);
  const startTime = STR(b.startTime, 5);
  const pricing = resolveFacilityPricing(facility.pricing);
  const durationMin = Math.max(30, Number(b.durationMin) || pricing.minHours * 60);
  if (!customerName || !customerPhone || !/^\d{4}-\d{2}-\d{2}$/.test(date) || !/^\d{2}:\d{2}$/.test(startTime)) {
    return res.status(400).json({ error: "Name, phone, date and time are required." });
  }

  // Re-check availability to prevent double-booking.
  const existing = await prisma.facilityBooking.findMany({ where: { facilityId: facility.id, date }, select: { startTime: true, durationMin: true, status: true } });
  const free = facilitySlots({
    hourlyRate: facility.hourlyRate, pricing, schedule: resolveFacilitySchedule(facility.schedule),
    businessHours: parseArr(business.hours) as HoursRow[], dateStr: date, durationMin, existing, now: new Date(),
  });
  if (!free.some((s) => s.time === startTime)) return res.status(409).json({ error: "That slot was just taken — please pick another." });

  const price = priceFor(facility.hourlyRate, pricing, date, _toMin(startTime), durationMin);
  const booking = await prisma.facilityBooking.create({
    data: {
      businessId: business.id, facilityId: facility.id, userId: req.userId ?? null,
      customerName, customerPhone, date, startTime, durationMin,
      players: Math.max(0, Math.min(99, Number(b.players) || 0)), note: STR(b.note, 400),
      price, facilityName: facility.name, status: "CONFIRMED", checkInCode: genCode(),
    },
  });
  await notifyAdmins({
    kind: "FACILITY_BOOKING",
    title: `Court booked: ${business.name}`,
    body: `${customerName} · ${facility.name} · ${date} ${startTime} (${durationMin / 60}h) · $${price} · ${customerPhone}`,
    link: "/admin/businesses",
  });
  res.status(201).json({ ok: true, booking, message: "Booked! Your slot is confirmed." });
});
