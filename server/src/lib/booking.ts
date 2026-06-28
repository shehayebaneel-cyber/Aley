import type { HoursRow } from "./serialize";
import { parseObj } from "./serialize";

// Appointment booking config + slot-availability engine.

export interface BookingBreak { day: number; start: string; end: string }

export interface BookingConfig {
  workingHours: HoursRow[]; // optional override; empty = fall back to the business's opening hours
  breaks: BookingBreak[];
  daysOff: string[]; // specific blocked dates, "YYYY-MM-DD"
  slotInterval: number; // minutes between candidate start times
  capacity: number; // concurrent appointments per slot when no staff is chosen
  leadTimeHours: number; // minimum notice before a slot can be booked
  horizonDays: number; // how far ahead customers may book
}

export const BOOKING_DEFAULTS: BookingConfig = {
  workingHours: [],
  breaks: [],
  daysOff: [],
  slotInterval: 30,
  capacity: 1,
  leadTimeHours: 1,
  horizonDays: 30,
};

const num = (v: unknown, d: number) => (Number.isFinite(Number(v)) ? Number(v) : d);

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
  };
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

  const weekday = date.getDay();
  const hoursSrc = config.workingHours.length ? config.workingHours : businessHours;
  const row = hoursSrc.find((h) => h.day === weekday);
  if (!row || row.closed) return [];

  const openM = toMin(row.open);
  const closeM = toMin(row.close);
  const breaks = config.breaks.filter((b) => b.day === weekday).map((b) => [toMin(b.start), toMin(b.end)] as const);
  const interval = config.slotInterval;
  const active = existing.filter((e) => ACTIVE.includes(e.status));

  const isToday = date.getFullYear() === now.getFullYear() && date.getMonth() === now.getMonth() && date.getDate() === now.getDate();
  const earliest = now.getHours() * 60 + now.getMinutes() + config.leadTimeHours * 60;

  const slots: string[] = [];
  for (let start = openM; start + durationMin <= closeM; start += interval) {
    const end = start + durationMin;
    if (breaks.some(([bs, be]) => start < be && end > bs)) continue;
    if (isToday && start < earliest) continue;

    const overlapping = active.filter((e) => {
      const es = toMin(e.time);
      const ee = es + (e.durationMin || 0);
      return start < ee && end > es;
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
