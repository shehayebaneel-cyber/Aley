import { randomBytes } from "crypto";
import { prisma } from "../db";
import { computeSlots, effectiveBookingMode, isAppointmentMode, resolveBookingConfig, resolveStaffSchedule } from "./booking";
import { notifyAdmins } from "./notify";
import { parseArr, type HoursRow } from "./serialize";

// Shared appointment-booking logic used by both the booking routes and Aley AI.
const genCode = () => randomBytes(3).toString("hex").toUpperCase();

type BizForBooking = { isPublished: boolean; hasBooking: boolean; bookingConfig: string; category: { slug: string } | null };
export function appointmentEnabled(b: BizForBooking): boolean {
  if (!b.isPublished) return false;
  return isAppointmentMode(effectiveBookingMode(b.category?.slug, resolveBookingConfig(b.bookingConfig), b.hasBooking));
}

async function staffAndAppts(businessId: number, date: string) {
  const [staffRows, appts] = await Promise.all([
    prisma.staffMember.findMany({ where: { businessId, isActive: true } }),
    prisma.appointment.findMany({ where: { businessId, date }, select: { time: true, durationMin: true, staffId: true, status: true } }),
  ]);
  const existing = appts.map((a) => ({ ...a, staffId: a.staffId ?? null }));
  const staff = staffRows.map((s) => ({ id: s.id, schedule: resolveStaffSchedule(s.schedule), appts: existing.filter((a) => a.staffId === s.id) }));
  return { staff, existing };
}

// Map natural service words to the categories that offer them, so "haircut"
// finds barbers/salons even though the category is named "Barbers".
const SERVICE_CATEGORIES: Record<string, string[]> = {
  haircut: ["barbers", "beauty-salons"], hair: ["barbers", "beauty-salons"], barber: ["barbers"],
  salon: ["beauty-salons", "barbers"], spa: ["spas"], massage: ["spas"], facial: ["spas", "skincare-clinics"],
  nail: ["nail-salons"], nails: ["nail-salons"], makeup: ["makeup-artists"], skincare: ["skincare-clinics"],
  dentist: ["dentists"], dental: ["dentists"], doctor: ["clinics", "medical-centers"], clinic: ["clinics", "medical-centers"],
  physio: ["physiotherapy"], physiotherapy: ["physiotherapy"], nutritionist: ["nutritionists"], vet: ["veterinary"],
  optician: ["opticians"], eye: ["opticians"], "oil change": ["oil-change"], mechanic: ["mechanics"],
  "car wash": ["car-washes"], wash: ["car-washes"], detailing: ["car-detailing"], tire: ["tire-shops"],
  tutor: ["tutors"], tutoring: ["tutors"], lesson: ["tutors", "music-schools", "dance-schools"],
  lawyer: ["lawyers"], legal: ["lawyers"], accountant: ["accounting"], consultant: ["consultants"],
};

/** Businesses in Aley that accept appointments, matching a query/category, with their services. */
export async function findBookableBusinesses(query?: string, category?: string) {
  const where: Record<string, unknown> = { isPublished: true, city: { is: { slug: "aley" } } };
  if (category) {
    where.category = { is: { slug: category } };
  } else if (query) {
    const lower = query.toLowerCase();
    const slugs = [...new Set(Object.entries(SERVICE_CATEGORIES).filter(([k]) => lower.includes(k)).flatMap(([, v]) => v))];
    const c = { contains: query, mode: "insensitive" as const };
    const textOr: unknown[] = [{ name: c }, { tagline: c }, { description: c }, { tags: c }, { category: { is: { name: c } } }];
    if (slugs.length) textOr.push({ category: { is: { slug: { in: slugs } } } });
    where.OR = textOr;
  }
  const rows = await prisma.business.findMany({ where, include: { category: { select: { slug: true, name: true } }, services: { where: { isActive: true }, orderBy: [{ sortOrder: "asc" }, { id: "asc" }] } }, take: 40 });
  const bookable = rows.filter(appointmentEnabled).slice(0, 8);
  return {
    count: bookable.length,
    results: bookable.map((b) => ({
      name: b.name, slug: b.slug, category: b.category?.name,
      services: b.services.map((s) => ({ id: s.id, name: s.name, durationMin: s.durationMin, price: s.price })),
    })),
  };
}

/** Available time slots for a business/date (+ optional service & staff). */
export async function availableSlots(slug: string, date: string, serviceId?: number | null, staffId?: number | null) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) return { error: "Date must be YYYY-MM-DD." };
  const business = await prisma.business.findUnique({ where: { slug }, include: { category: { select: { slug: true } } } });
  if (!business || !appointmentEnabled(business)) return { error: "This business doesn't take appointments." };
  const cfg = resolveBookingConfig(business.bookingConfig);
  let durationMin = cfg.slotInterval;
  let serviceName: string | undefined;
  if (serviceId) {
    const svc = await prisma.service.findFirst({ where: { id: serviceId, businessId: business.id } });
    if (svc) { durationMin = svc.durationMin; serviceName = svc.name; }
  }
  const { staff, existing } = await staffAndAppts(business.id, date);
  const slots = computeSlots({ config: cfg, businessHours: parseArr(business.hours) as HoursRow[], dateStr: date, durationMin, existing, staff: staff.length ? staff : undefined, staffId: staffId ?? null, now: new Date() });
  return { businessName: business.name, slug: business.slug, date, durationMin, serviceName, slots };
}

/** Create an appointment (PENDING). Re-checks availability to avoid double-booking. */
export async function bookAppointment(opts: {
  slug: string; date: string; time: string;
  serviceId?: number | null; staffId?: number | null;
  customerName: string; customerPhone: string; note?: string; userId?: number | null;
}) {
  const business = await prisma.business.findUnique({ where: { slug: opts.slug }, include: { category: { select: { slug: true } } } });
  if (!business || !appointmentEnabled(business)) return { error: "This business doesn't take appointments." };
  if (!opts.customerName?.trim() || !opts.customerPhone?.trim()) return { error: "Customer name and phone are required before booking." };
  if (!/^\d{4}-\d{2}-\d{2}$/.test(opts.date) || !/^\d{2}:\d{2}$/.test(opts.time)) return { error: "A valid date (YYYY-MM-DD) and time (HH:MM) are required." };

  const service = opts.serviceId ? await prisma.service.findFirst({ where: { id: opts.serviceId, businessId: business.id, isActive: true } }) : null;
  if (opts.serviceId && !service) return { error: "That service isn't available." };
  const staff = opts.staffId ? await prisma.staffMember.findFirst({ where: { id: opts.staffId, businessId: business.id, isActive: true } }) : null;
  const durationMin = service?.durationMin ?? resolveBookingConfig(business.bookingConfig).slotInterval;

  const { staff: staffList, existing } = await staffAndAppts(business.id, opts.date);
  const free = computeSlots({ config: resolveBookingConfig(business.bookingConfig), businessHours: parseArr(business.hours) as HoursRow[], dateStr: opts.date, durationMin, existing, staff: staffList.length ? staffList : undefined, staffId: staff?.id ?? null, now: new Date() });
  if (!free.includes(opts.time)) return { error: "That time is no longer available.", availableSlots: free };

  const appt = await prisma.appointment.create({
    data: {
      businessId: business.id, serviceId: service?.id ?? null, staffId: staff?.id ?? null, userId: opts.userId ?? null,
      customerName: opts.customerName.slice(0, 80), customerPhone: opts.customerPhone.slice(0, 40), note: (opts.note ?? "").slice(0, 500),
      date: opts.date, time: opts.time, durationMin, price: service?.price ?? 0,
      serviceName: service?.name ?? "", staffName: staff?.name ?? "", status: "PENDING", checkInCode: genCode(),
    },
  });
  await notifyAdmins({
    kind: "APPOINTMENT",
    title: `New booking (via AI): ${business.name}`,
    body: `${opts.customerName} · ${service?.name ?? "Appointment"}${staff ? ` with ${staff.name}` : ""} · ${opts.date} ${opts.time} · ${opts.customerPhone}`,
    link: "/admin/businesses",
  });
  return { ok: true, businessName: business.name, slug: business.slug, service: service?.name ?? null, staff: staff?.name ?? null, date: opts.date, time: opts.time, checkInCode: appt.checkInCode };
}
