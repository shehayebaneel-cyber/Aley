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
  contractors: "service", landscaping: "service", "pool-services": "service",
  // Professional / education → appointment
  lawyers: "appointment", accounting: "appointment", "financial-advisors": "appointment", consultants: "appointment",
  architects: "appointment", "interior-designers": "appointment", photography: "appointment", videography: "appointment",
  "translation-services": "appointment", tutors: "appointment", "language-centers": "appointment",
  "music-schools": "appointment", "dance-schools": "appointment", "driving-schools": "appointment",
};

// Sports & Recreation categories that rent by the hour. Businesses in these
// categories use the facility-booking flow (courts/fields/lanes with live
// availability) rather than the appointment flow — see lib/facility.ts.
export const FACILITY_RENTAL_CATEGORIES = new Set<string>([
  "football-fields", "mini-football", "tennis", "padel", "squash",
  "basketball", "volleyball", "swimming-pools",
]);

/** Whether a category is an hourly facility rental (auto-supports court/field booking). */
export function isFacilityRentalCategory(categorySlug: string | undefined): boolean {
  return !!categorySlug && FACILITY_RENTAL_CATEGORIES.has(categorySlug);
}

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

// ---- Per-staff schedules (Phase 2) ----
export interface TimeOff { from: string; to: string } // inclusive "YYYY-MM-DD" range (vacation)
export interface StaffSchedule {
  workingHours: HoursRow[]; // empty = inherit business/booking hours
  breaks: BookingBreak[];
  daysOff: string[]; // individual blocked dates
  timeOff: TimeOff[]; // vacation ranges
}
export function resolveStaffSchedule(raw: unknown): StaffSchedule {
  const o = parseObj(raw);
  return {
    workingHours: Array.isArray(o.workingHours) ? (o.workingHours as HoursRow[]) : [],
    breaks: Array.isArray(o.breaks) ? (o.breaks as BookingBreak[]) : [],
    daysOff: Array.isArray(o.daysOff) ? (o.daysOff as string[]).map(String) : [],
    timeOff: Array.isArray(o.timeOff) ? (o.timeOff as TimeOff[]).filter((t) => t && t.from && t.to) : [],
  };
}
/** Is the staff member off (day off or on vacation) on this date? */
export function staffOffOn(schedule: StaffSchedule, dateStr: string): boolean {
  if (schedule.daysOff.includes(dateStr)) return true;
  return schedule.timeOff.some((t) => dateStr >= t.from && dateStr <= t.to);
}

export interface StaffForSlots { id: number; schedule: StaffSchedule; appts: ExistingAppt[] }

const breakOverlap = (breaks: BookingBreak[], weekday: number, start: number, end: number) =>
  breaks.filter((b) => b.day === weekday).some((b) => start < toMin(b.end) && end > toMin(b.start));

const hoursOpen = (hours: HoursRow[], weekday: number) => hours.find((h) => h.day === weekday && !h.closed);

const apptOverlap = (appts: ExistingAppt[], start: number, end: number, padS: number, padE: number) => {
  const candS = start - padS;
  const candE = end + padE;
  return appts.filter((e) => ACTIVE.includes(e.status)).some((e) => {
    const es = toMin(e.time) - padS;
    const ee = toMin(e.time) + (e.durationMin || 0) + padE;
    return candS < ee && candE > es;
  });
};

/** Whether a specific staff member can take an appointment at [start,end] on a date. */
function staffFree(s: StaffForSlots, weekday: number, dateStr: string, start: number, end: number, cfg: BookingConfig, businessHours: HoursRow[]): boolean {
  if (staffOffOn(s.schedule, dateStr)) return false;
  const hours = s.schedule.workingHours.length ? s.schedule.workingHours : cfg.workingHours.length ? cfg.workingHours : businessHours;
  const row = hoursOpen(hours, weekday);
  if (!row || start < toMin(row.open) || end > toMin(row.close)) return false;
  if (breakOverlap(s.schedule.breaks, weekday, start, end)) return false;
  if (apptOverlap(s.appts, start, end, cfg.bufferBefore, cfg.bufferAfter)) return false;
  return true;
}

/** Available start times ("HH:MM") for a date, service duration, optional staff member, and per-staff schedules. */
export function computeSlots(opts: {
  config: BookingConfig;
  businessHours: HoursRow[];
  dateStr: string;
  durationMin: number;
  now: Date;
  existing?: ExistingAppt[]; // business-wide appts (used when no staff)
  staffId?: number | null; // selected staff (null/undefined = any)
  staff?: StaffForSlots[]; // active staff with their schedules + appts (enables per-staff availability)
}): string[] {
  const { config, businessHours, dateStr, durationMin, now } = opts;
  const staff = opts.staff ?? [];
  const selectedStaffId = opts.staffId ?? null;
  const date = new Date(`${dateStr}T00:00:00`);
  if (isNaN(date.getTime()) || durationMin <= 0) return [];
  if (config.daysOff.includes(dateStr)) return [];

  const allActive = (staff.length ? staff.flatMap((s) => s.appts) : opts.existing ?? []).filter((e) => ACTIVE.includes(e.status));
  if (config.maxPerDay > 0 && allActive.length >= config.maxPerDay) return [];

  const weekday = date.getDay();
  const hoursSrc = config.workingHours.length ? config.workingHours : businessHours;
  const row = hoursOpen(hoursSrc, weekday);
  if (!row) return [];

  const openM = toMin(row.open);
  const closeM = toMin(row.close);
  const interval = config.slotInterval;
  const padS = config.bufferBefore;
  const padE = config.bufferAfter;
  const isToday = date.getFullYear() === now.getFullYear() && date.getMonth() === now.getMonth() && date.getDate() === now.getDate();
  const earliest = now.getHours() * 60 + now.getMinutes() + config.leadTimeHours * 60;

  const slots: string[] = [];
  for (let start = openM; start + durationMin <= closeM; start += interval) {
    const end = start + durationMin;
    if (breakOverlap(config.breaks, weekday, start, end)) continue; // business-wide break
    if (isToday && start < earliest) continue;

    if (staff.length) {
      if (selectedStaffId != null) {
        const s = staff.find((x) => x.id === selectedStaffId);
        if (!s || !staffFree(s, weekday, dateStr, start, end, config, businessHours)) continue;
      } else if (!staff.some((s) => staffFree(s, weekday, dateStr, start, end, config, businessHours))) {
        continue; // "any" → need at least one free staff
      }
    } else {
      // No staff defined → business-wide concurrency limited by capacity.
      const candS = start - padS, candE = end + padE;
      const overlapping = allActive.filter((e) => {
        const es = toMin(e.time) - padS, ee = toMin(e.time) + (e.durationMin || 0) + padE;
        return candS < ee && candE > es;
      });
      if (overlapping.length >= config.capacity) continue;
    }
    slots.push(toHHMM(start));
  }
  return slots;
}
