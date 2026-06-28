import type { HoursRow } from "./serialize";
import { parseObj } from "./serialize";

// Appointment booking config + slot-availability engine.

export interface BookingBreak { day: number; start: string; end: string }

export type BookingMode = "none" | "appointment" | "service" | "table" | "choice";

export interface BookingConfig {
  workingHours: HoursRow[]; // optional override; empty = fall back to the business's opening hours
  breaks: BookingBreak[];
  daysOff: string[]; // specific blocked dates, "YYYY-MM-DD"
  slotInterval: number; // minutes between candidate start times
  capacity: number; // concurrent appointments per slot when no staff is chosen
  leadTimeHours: number; // minimum notice before a slot can be booked
  horizonDays: number; // how far ahead customers may book
  bufferBefore: number; // minutes blocked before each appointment
  bufferAfter: number; // minutes blocked after each appointment
  maxPerDay: number; // 0 = unlimited
  cancellationHours: number; // min notice for customer cancel/reschedule
  allowCustomerCancel: boolean;
  allowCustomerReschedule: boolean;
  mode: "" | BookingMode; // owner/admin override; "" = inherit from category
  policyNote: string; // free-text shown to customers
}

export const BOOKING_DEFAULTS: BookingConfig = {
  workingHours: [],
  breaks: [],
  daysOff: [],
  slotInterval: 30,
  capacity: 1,
  leadTimeHours: 1,
  horizonDays: 30,
  bufferBefore: 0,
  bufferAfter: 0,
  maxPerDay: 0,
  cancellationHours: 12,
  allowCustomerCancel: true,
  allowCustomerReschedule: true,
  mode: "",
  policyNote: "",
};

const num = (v: unknown, d: number) => (Number.isFinite(Number(v)) ? Number(v) : d);
const bool = (v: unknown, d: boolean) => (typeof v === "boolean" ? v : d);

/** Merge stored config (object or JSON string) over the defaults. */
export function resolveBookingConfig(raw: unknown): BookingConfig {
  const o = parseObj(raw);
  return {
    workingHours: Array.isArray(o.workingHours) ? (o.workingHours as HoursRow[]) : [],
    breaks: Array.isArray(o.breaks) ? (o.breaks as BookingBreak[]) : [],
    daysOff: Array.isArray(o.daysOff) ? (o.daysOff as string[]).map(String) : [],
    slotInterval: Math.max(5, num(o.slotInterval, BOOKING_DEFAULTS.slotInterval)),
    capacity: Math.max(1, num(o.capacity, BOOKING_DEFAULTS.capacity)),
    leadTimeHours: Math.max(0, num(o.leadTimeHours, BOOKING_DEFAULTS.leadTimeHours)),
    horizonDays: Math.max(1, num(o.horizonDays, BOOKING_DEFAULTS.horizonDays)),
    bufferBefore: Math.max(0, num(o.bufferBefore, 0)),
    bufferAfter: Math.max(0, num(o.bufferAfter, 0)),
    maxPerDay: Math.max(0, num(o.maxPerDay, 0)),
    cancellationHours: Math.max(0, num(o.cancellationHours, BOOKING_DEFAULTS.cancellationHours)),
    allowCustomerCancel: bool(o.allowCustomerCancel, true),
    allowCustomerReschedule: bool(o.allowCustomerReschedule, true),
    mode: (typeof o.mode === "string" ? o.mode : "") as "" | BookingMode,
    policyNote: typeof o.policyNote === "string" ? o.policyNote : "",
  };
}

// ---- Category-driven booking mode ----
// Default booking behaviour by category slug, so booking is tailored to the
// business type rather than manually flipped on everywhere.
export const CATEGORY_BOOKING_MODE: Record<string, BookingMode> = {
  // Sit-down food → table
  restaurants: "table", "coffee-shops": "table", lebanese: "table", "breakfast-brunch": "table",
  sushi: "table", pizza: "table", burgers: "table",
  // Health & beauty → appointment
  "beauty-salons": "appointment", barbers: "appointment", spas: "appointment", "nail-salons": "appointment",
  "makeup-artists": "appointment", "skincare-clinics": "appointment", clinics: "appointment", dentists: "appointment",
  "medical-centers": "appointment", physiotherapy: "appointment", nutritionists: "appointment", psychologists: "appointment",
  "personal-trainers": "appointment", veterinary: "appointment", opticians: "appointment", "yoga-pilates": "appointment",
  // Automotive
  mechanics: "choice", "car-washes": "appointment", "car-detailing": "appointment", "oil-change": "appointment",
  "tire-shops": "service", "vehicle-inspection": "appointment",
  // Home services → request a service
  plumbers: "service", electricians: "service", cleaning: "service", "pest-control": "service",
  contractors: "service", landscaping: "service", "swimming-pools": "service",
  // Professional / education → appointment
  lawyers: "appointment", accounting: "appointment", "financial-advisors": "appointment", consultants: "appointment",
  architects: "appointment", "interior-designers": "appointment", photography: "appointment", videography: "appointment",
  "translation-services": "appointment", tutors: "appointment", "language-centers": "appointment",
  "music-schools": "appointment", "dance-schools": "appointment", "driving-schools": "appointment",
};

/** Resolve the effective booking mode from the owner override, category, and legacy flag. */
export function effectiveBookingMode(categorySlug: string | undefined, config: BookingConfig, hasBooking: boolean): BookingMode {
  if (config.mode) return config.mode === "choice" ? "appointment" : config.mode;
  const base = (categorySlug && CATEGORY_BOOKING_MODE[categorySlug]) || "none";
  if (base !== "none") return base;
  return hasBooking ? "appointment" : "none";
}

/** Modes that use the appointment flow (vs restaurant table reservations). */
export function isAppointmentMode(mode: BookingMode): boolean {
  return mode === "appointment" || mode === "service" || mode === "choice";
}

export function ctaLabelFor(mode: BookingMode): string {
  return mode === "service" ? "Request Service" : "Book Appointment";
}

const toMin = (t: string): number => {
  const [h, m] = String(t).split(":").map(Number);
  return (h || 0) * 60 + (m || 0);
};
const toHHMM = (m: number): string => `${String(Math.floor(m / 60)).padStart(2, "0")}:${String(m % 60).padStart(2, "0")}`;

const ACTIVE = ["PENDING", "CONFIRMED", "RESCHEDULED"];

export interface ExistingAppt { time: string; durationMin: number; staffId: number | null; status: string }

/** Available start times ("HH:MM") for a date, service duration, and optional staff member. */
export function computeSlots(opts: {
  config: BookingConfig;
  businessHours: HoursRow[];
  dateStr: string;
  durationMin: number;
  existing: ExistingAppt[];
  staffId: number | null;
  now: Date;
}): string[] {
  const { config, businessHours, dateStr, durationMin, existing, staffId, now } = opts;
  const date = new Date(`${dateStr}T00:00:00`);
  if (isNaN(date.getTime()) || durationMin <= 0) return [];
  if (config.daysOff.includes(dateStr)) return [];

  const active = existing.filter((e) => ACTIVE.includes(e.status));
  // Daily cap (business-wide) reached → no slots.
  if (config.maxPerDay > 0 && active.length >= config.maxPerDay) return [];

  const weekday = date.getDay();
  const hoursSrc = config.workingHours.length ? config.workingHours : businessHours;
  const row = hoursSrc.find((h) => h.day === weekday);
  if (!row || row.closed) return [];

  const openM = toMin(row.open);
  const closeM = toMin(row.close);
  const breaks = config.breaks.filter((b) => b.day === weekday).map((b) => [toMin(b.start), toMin(b.end)] as const);
  const interval = config.slotInterval;
  const padS = config.bufferBefore;
  const padE = config.bufferAfter;

  const isToday = date.getFullYear() === now.getFullYear() && date.getMonth() === now.getMonth() && date.getDate() === now.getDate();
  const earliest = now.getHours() * 60 + now.getMinutes() + config.leadTimeHours * 60;

  const slots: string[] = [];
  for (let start = openM; start + durationMin <= closeM; start += interval) {
    const end = start + durationMin;
    if (breaks.some(([bs, be]) => start < be && end > bs)) continue;
    if (isToday && start < earliest) continue;

    // Buffer-aware overlap: each block reserves padBefore..padAfter around its service time.
    const candS = start - padS;
    const candE = end + padE;
    const overlapping = active.filter((e) => {
      const es = toMin(e.time) - padS;
      const ee = toMin(e.time) + (e.durationMin || 0) + padE;
      return candS < ee && candE > es;
    });
    if (staffId != null) {
      if (overlapping.some((e) => e.staffId === staffId)) continue;
    } else if (overlapping.length >= config.capacity) {
      continue;
    }
    slots.push(toHHMM(start));
  }
  return slots;
}
