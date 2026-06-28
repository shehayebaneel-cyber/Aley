import { Router } from "express";
import { optionalUser } from "../auth";
import { prisma } from "../db";
import { computeSlots, effectiveBookingMode, isAppointmentMode, resolveBookingConfig, resolveStaffSchedule } from "../lib/booking";
import { notifyAdmins } from "../lib/notify";
import { parseArr, type HoursRow } from "../lib/serialize";

export const bookingRouter = Router();

const STR = (v: unknown, max: number) => String(v ?? "").trim().slice(0, max);

// Build the active-staff list (with schedules + their appts) and the full appt list for a date.
async function staffAndAppts(businessId: number, date: string) {
  const [staffRows, appts] = await Promise.all([
    prisma.staffMember.findMany({ where: { businessId, isActive: true } }),
    prisma.appointment.findMany({ where: { businessId, date }, select: { time: true, durationMin: true, staffId: true, status: true } }),
  ]);
  const existing = appts.map((a) => ({ ...a, staffId: a.staffId ?? null }));
  const staff = staffRows.map((s) => ({
    id: s.id,
    schedule: resolveStaffSchedule(s.schedule),
    appts: existing.filter((a) => a.staffId === s.id),
  }));
  return { staff, existing };
}

type BizWithCategory = NonNullable<Awaited<ReturnType<typeof loadBiz>>>;
function loadBiz(where: { slug: string } | { id: number }) {
  return prisma.business.findUnique({ where: where as { slug: string }, include: { category: { select: { slug: true } } } });
}
/** A business is bookable when its effective (category-driven) mode uses the appointment flow. */
function appointmentEnabled(business: { isPublished: boolean; hasBooking: boolean; bookingConfig: string; category: { slug: string } | null }) {
  if (!business.isPublished) return false;
  const mode = effectiveBookingMode(business.category?.slug, resolveBookingConfig(business.bookingConfig), business.hasBooking);
  return isAppointmentMode(mode);
}
async function findBookable(slug: string): Promise<BizWithCategory | null> {
  const business = await loadBiz({ slug });
  if (!business || !appointmentEnabled(business)) return null;
  return business;
}

// GET /api/booking/:slug/options — services, staff and config for the booking flow.
bookingRouter.get("/:slug/options", async (req, res) => {
  const business = await findBookable(req.params.slug);
  if (!business) return res.status(404).json({ error: "Booking isn't available for this business." });
  const [services, staffRows] = await Promise.all([
    prisma.service.findMany({ where: { businessId: business.id, isActive: true }, orderBy: [{ sortOrder: "asc" }, { id: "asc" }] }),
    prisma.staffMember.findMany({ where: { businessId: business.id, isActive: true }, orderBy: [{ sortOrder: "asc" }, { id: "asc" }] }),
  ]);
  // Public staff profile (omit internal schedule; parse languages JSON).
  const staff = staffRows.map((s) => ({
    id: s.id, name: s.name, role: s.role, avatar: s.avatar, bio: s.bio,
    experience: s.experience, rating: s.rating,
    languages: parseArr(s.languages) as string[],
  }));
  const cfg = resolveBookingConfig(business.bookingConfig);
  const mode = effectiveBookingMode(business.category?.slug, cfg, business.hasBooking);
  res.json({
    businessId: business.id,
    businessName: business.name,
    services,
    staff,
    config: {
      slotInterval: cfg.slotInterval, leadTimeHours: cfg.leadTimeHours, horizonDays: cfg.horizonDays,
      cancellationHours: cfg.cancellationHours, allowCustomerCancel: cfg.allowCustomerCancel,
      allowCustomerReschedule: cfg.allowCustomerReschedule, policyNote: cfg.policyNote, mode,
      ctaLabel: mode === "service" ? "Request Service" : "Book Appointment",
    },
  });
});

// GET /api/booking/:slug/slots?date=YYYY-MM-DD&serviceId=&staffId= — available times.
bookingRouter.get("/:slug/slots", async (req, res) => {
  const business = await findBookable(req.params.slug);
  if (!business) return res.status(404).json({ error: "Booking isn't available." });
  const date = STR(req.query.date, 10);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) return res.status(400).json({ error: "A valid date is required." });

  const serviceId = req.query.serviceId ? Number(req.query.serviceId) : null;
  const staffId = req.query.staffId ? Number(req.query.staffId) : null;

  let durationMin = resolveBookingConfig(business.bookingConfig).slotInterval;
  if (serviceId) {
    const svc = await prisma.service.findFirst({ where: { id: serviceId, businessId: business.id } });
    if (svc) durationMin = svc.durationMin;
  }

  const { staff, existing } = await staffAndAppts(business.id, date);
  const slots = computeSlots({
    config: resolveBookingConfig(business.bookingConfig),
    businessHours: parseArr(business.hours) as HoursRow[],
    dateStr: date,
    durationMin,
    existing,
    staff: staff.length ? staff : undefined,
    staffId,
    now: new Date(),
  });
  res.json({ slots, durationMin });
});

// POST /api/booking — create an appointment request.
bookingRouter.post("/", optionalUser, async (req, res) => {
  const b = req.body ?? {};
  const business = await loadBiz({ id: Number(b.businessId) });
  if (!business || !appointmentEnabled(business)) return res.status(404).json({ error: "Booking isn't available." });

  const customerName = STR(b.customerName, 80);
  const customerPhone = STR(b.customerPhone, 40);
  const note = STR(b.note, 500);
  const date = STR(b.date, 10);
  const time = STR(b.time, 5);
  if (!customerName || !customerPhone || !/^\d{4}-\d{2}-\d{2}$/.test(date) || !/^\d{2}:\d{2}$/.test(time)) {
    return res.status(400).json({ error: "Name, phone, date and time are required." });
  }

  // Resolve service + staff (must belong to this business).
  const service = b.serviceId ? await prisma.service.findFirst({ where: { id: Number(b.serviceId), businessId: business.id, isActive: true } }) : null;
  if (b.serviceId && !service) return res.status(400).json({ error: "That service isn't available." });
  const staff = b.staffId ? await prisma.staffMember.findFirst({ where: { id: Number(b.staffId), businessId: business.id, isActive: true } }) : null;
  const durationMin = service?.durationMin ?? resolveBookingConfig(business.bookingConfig).slotInterval;

  // Re-check the slot is still free (avoid double-booking on race).
  const { staff: staffList, existing } = await staffAndAppts(business.id, date);
  const free = computeSlots({
    config: resolveBookingConfig(business.bookingConfig),
    businessHours: parseArr(business.hours) as HoursRow[],
    dateStr: date,
    durationMin,
    existing,
    staff: staffList.length ? staffList : undefined,
    staffId: staff?.id ?? null,
    now: new Date(),
  });
  if (!free.includes(time)) return res.status(409).json({ error: "Sorry, that time was just taken. Please pick another slot." });

  const appointment = await prisma.appointment.create({
    data: {
      businessId: business.id,
      serviceId: service?.id ?? null,
      staffId: staff?.id ?? null,
      userId: req.userId ?? null,
      customerName, customerPhone, note, date, time, durationMin,
      price: service?.price ?? 0,
      serviceName: service?.name ?? "",
      staffName: staff?.name ?? "",
      status: "PENDING",
    },
    include: { business: { select: { name: true, slug: true } } },
  });

  await notifyAdmins({
    kind: "APPOINTMENT",
    title: `New booking: ${business.name}`,
    body: `${customerName} · ${service?.name ?? "Appointment"}${staff ? ` with ${staff.name}` : ""} · ${date} ${time} · ${customerPhone}`,
    link: "/admin/businesses",
  });

  res.status(201).json({ ok: true, appointment, message: "Booking requested! The business will confirm shortly." });
});
