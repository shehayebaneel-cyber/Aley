import type { HoursRow } from "./serialize";
import { parseObj } from "./serialize";

// Hourly facility/court/field rental: tiered pricing + per-facility availability.

export interface FacilityPricing {
  weekendRate: number; // 0 = same as base
  peakRate: number; peakStart: string; peakEnd: string; // e.g. 17:00–22:00
  nightRate: number; nightStart: string; // e.g. after 22:00
  holidayRate: number; holidays: string[]; // specific dates "YYYY-MM-DD"
  minHours: number; maxHours: number; slotIncrementMin: number;
}
export const PRICING_DEFAULTS: FacilityPricing = {
  weekendRate: 0, peakRate: 0, peakStart: "17:00", peakEnd: "22:00",
  nightRate: 0, nightStart: "22:00", holidayRate: 0, holidays: [],
  minHours: 1, maxHours: 3, slotIncrementMin: 30,
};

export interface FacilitySchedule {
  workingHours: HoursRow[]; // empty = inherit business hours
  blockedDates: string[]; // closed dates
  maintenance: { from: string; to: string; reason?: string }[]; // closed ranges
}

const num = (v: unknown, d: number) => (Number.isFinite(Number(v)) ? Number(v) : d);

export function resolveFacilityPricing(raw: unknown): FacilityPricing {
  const o = parseObj(raw);
  return {
    weekendRate: Math.max(0, num(o.weekendRate, 0)),
    peakRate: Math.max(0, num(o.peakRate, 0)),
    peakStart: typeof o.peakStart === "string" ? o.peakStart : "17:00",
    peakEnd: typeof o.peakEnd === "string" ? o.peakEnd : "22:00",
    nightRate: Math.max(0, num(o.nightRate, 0)),
    nightStart: typeof o.nightStart === "string" ? o.nightStart : "22:00",
    holidayRate: Math.max(0, num(o.holidayRate, 0)),
    holidays: Array.isArray(o.holidays) ? (o.holidays as string[]).map(String) : [],
    minHours: Math.max(0.5, num(o.minHours, 1)),
    maxHours: Math.max(0.5, num(o.maxHours, 3)),
    slotIncrementMin: Math.max(15, num(o.slotIncrementMin, 30)),
  };
}
export function resolveFacilitySchedule(raw: unknown): FacilitySchedule {
  const o = parseObj(raw);
  return {
    workingHours: Array.isArray(o.workingHours) ? (o.workingHours as HoursRow[]) : [],
    blockedDates: Array.isArray(o.blockedDates) ? (o.blockedDates as string[]).map(String) : [],
    maintenance: Array.isArray(o.maintenance) ? (o.maintenance as { from: string; to: string; reason?: string }[]).filter((m) => m && m.from && m.to) : [],
  };
}

const toMin = (t: string): number => { const [h, m] = String(t).split(":").map(Number); return (h || 0) * 60 + (m || 0); };
const toHHMM = (m: number): string => `${String(Math.floor(m / 60)).padStart(2, "0")}:${String(m % 60).padStart(2, "0")}`;
const ACTIVE = ["CONFIRMED", "PENDING", "COMPLETED"];

/** Hourly rate that applies to a given minute-of-day on a given date. */
function rateAt(base: number, p: FacilityPricing, dateStr: string, weekday: number, minute: number): number {
  if (p.holidayRate > 0 && p.holidays.includes(dateStr)) return p.holidayRate;
  if (p.nightRate > 0 && minute >= toMin(p.nightStart)) return p.nightRate;
  if (p.peakRate > 0 && minute >= toMin(p.peakStart) && minute < toMin(p.peakEnd)) return p.peakRate;
  if (p.weekendRate > 0 && (weekday === 5 || weekday === 6)) return p.weekendRate; // Fri/Sat weekend in Lebanon
  return base;
}

/** Total price for a booking, summed across 30-min blocks with tiered rates. */
export function priceFor(hourlyRate: number, pricing: FacilityPricing, dateStr: string, startMin: number, durationMin: number): number {
  const date = new Date(`${dateStr}T00:00:00`);
  const weekday = isNaN(date.getTime()) ? 0 : date.getDay();
  let total = 0;
  for (let m = startMin; m < startMin + durationMin; m += 30) {
    total += rateAt(hourlyRate, pricing, dateStr, weekday, m) * 0.5; // half-hour block
  }
  return Math.round(total * 100) / 100;
}

export interface FacilityBookingLite { startTime: string; durationMin: number; status: string }

/** Available start times (with price) for a facility on a date and chosen duration. */
export function facilitySlots(opts: {
  hourlyRate: number;
  pricing: FacilityPricing;
  schedule: FacilitySchedule;
  businessHours: HoursRow[];
  dateStr: string;
  durationMin: number;
  existing: FacilityBookingLite[];
  now: Date;
}): { time: string; price: number }[] {
  const { hourlyRate, pricing, schedule, businessHours, dateStr, durationMin, existing, now } = opts;
  const date = new Date(`${dateStr}T00:00:00`);
  if (isNaN(date.getTime()) || durationMin <= 0) return [];
  if (schedule.blockedDates.includes(dateStr)) return [];
  if (schedule.maintenance.some((mt) => dateStr >= mt.from && dateStr <= mt.to)) return [];

  const weekday = date.getDay();
  const hoursSrc = schedule.workingHours.length ? schedule.workingHours : businessHours;
  const row = hoursSrc.find((h) => h.day === weekday && !h.closed);
  if (!row) return [];
  const openM = toMin(row.open);
  const closeM = toMin(row.close === "00:00" ? "24:00" : row.close);
  const inc = pricing.slotIncrementMin;

  const active = existing.filter((e) => ACTIVE.includes(e.status));
  const isToday = date.getFullYear() === now.getFullYear() && date.getMonth() === now.getMonth() && date.getDate() === now.getDate();
  const nowMin = now.getHours() * 60 + now.getMinutes();

  const out: { time: string; price: number }[] = [];
  for (let start = openM; start + durationMin <= closeM; start += inc) {
    const end = start + durationMin;
    if (isToday && start < nowMin + 30) continue; // small lead time
    const clash = active.some((e) => { const es = toMin(e.startTime); const ee = es + (e.durationMin || 0); return start < ee && end > es; });
    if (clash) continue;
    out.push({ time: toHHMM(start), price: priceFor(hourlyRate, pricing, dateStr, start, durationMin) });
  }
  return out;
}

/** Duration options (in minutes) a facility allows, from min/max hours. */
export function durationOptions(pricing: FacilityPricing): number[] {
  const out: number[] = [];
  for (let h = pricing.minHours; h <= pricing.maxHours + 1e-9; h += 0.5) out.push(Math.round(h * 60));
  return out;
}

export { toMin as _toMin };
