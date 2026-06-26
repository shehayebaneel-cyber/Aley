import { prisma } from "../db";

// Delivery pricing settings (Setting key/value table). Defaults below are the
// source of truth; admin-saved values overlay them. All money in USD.
export const DELIVERY_DEFAULTS = {
  baseFee: 2, // covers pickup + handling
  perKm: 0.5, // per km of route distance
  minPrice: 3, // floor for any delivery
  sizeMediumSurcharge: 1,
  sizeLargeSurcharge: 3,
  expressSurcharge: 3, // urgency = EXPRESS
  outsideSurcharge: 4, // per endpoint outside Aley
  nightSurcharge: 1.5, // late-night / early-morning
  bandPct: 0.2, // estimate band width (max = est + max(2, est*bandPct))
  driverCommission: 20, // platform % taken from each completed delivery (driver keeps the rest)
};
export type DeliverySettings = typeof DELIVERY_DEFAULTS;

const KEYS: Record<keyof DeliverySettings, string> = {
  baseFee: "delivery.baseFee",
  perKm: "delivery.perKm",
  minPrice: "delivery.minPrice",
  sizeMediumSurcharge: "delivery.sizeMediumSurcharge",
  sizeLargeSurcharge: "delivery.sizeLargeSurcharge",
  expressSurcharge: "delivery.expressSurcharge",
  outsideSurcharge: "delivery.outsideSurcharge",
  nightSurcharge: "delivery.nightSurcharge",
  bandPct: "delivery.bandPct",
  driverCommission: "delivery.driverCommission",
};

export async function getDeliverySettings(): Promise<DeliverySettings> {
  const rows = await prisma.setting.findMany({ where: { key: { in: Object.values(KEYS) } } });
  const map = new Map(rows.map((r) => [r.key, Number(r.value)]));
  const out = { ...DELIVERY_DEFAULTS };
  for (const k of Object.keys(KEYS) as (keyof DeliverySettings)[]) {
    const v = map.get(KEYS[k]);
    if (v != null && !Number.isNaN(v)) out[k] = v;
  }
  return out;
}

export async function saveDeliverySettings(partial: Partial<Record<keyof DeliverySettings, unknown>>): Promise<DeliverySettings> {
  const entries = (Object.keys(KEYS) as (keyof DeliverySettings)[]).filter((k) => k in partial);
  await prisma.$transaction(
    entries.map((k) => {
      const value = String(Math.max(0, Number(partial[k]) || 0));
      return prisma.setting.upsert({ where: { key: KEYS[k] }, create: { key: KEYS[k], value }, update: { value } });
    })
  );
  return getDeliverySettings();
}

// ---- Distance + zone helpers ----
const ALEY = { lat: 33.8056, lng: 35.6011 };
const round1 = (n: number) => Math.round(n * 10) / 10;
const round2 = (n: number) => Math.round(n * 100) / 100;

/** Great-circle distance in km between two coordinates. */
export function haversineKm(a: { lat: number; lng: number }, b: { lat: number; lng: number }): number {
  const R = 6371;
  const dLat = ((b.lat - a.lat) * Math.PI) / 180;
  const dLng = ((b.lng - a.lng) * Math.PI) / 180;
  const la1 = (a.lat * Math.PI) / 180;
  const la2 = (b.lat * Math.PI) / 180;
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(la1) * Math.cos(la2) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.min(1, Math.sqrt(h)));
}

// A point is "outside Aley" if it's more than ~6 km from the town centre.
const OUTSIDE_RADIUS_KM = 6;
const isOutside = (p?: { lat: number | null; lng: number | null } | null) =>
  p && p.lat != null && p.lng != null ? haversineKm(ALEY, { lat: p.lat, lng: p.lng }) > OUTSIDE_RADIUS_KM : null;

export const DELIVERY_TYPES = ["ALEY_TO_ALEY", "OUTSIDE_TO_ALEY", "ALEY_TO_OUTSIDE", "CUSTOM"] as const;
export const PACKAGE_SIZES = ["SMALL", "MEDIUM", "LARGE"] as const;
export const URGENCIES = ["STANDARD", "EXPRESS"] as const;
// Fulfilment lifecycle, in order.
export const DELIVERY_STEPS = ["REQUESTED", "ACCEPTED", "HEADING_TO_PICKUP", "PICKED_UP", "ON_THE_WAY", "DELIVERED"];
export const DELIVERY_STATUSES = [...DELIVERY_STEPS, "CANCELLED", "REJECTED"];
// Statuses a driver may set on a delivery they own (ACCEPTED is set by /accept).
export const DRIVER_SETTABLE_STATUSES = ["HEADING_TO_PICKUP", "PICKED_UP", "ON_THE_WAY", "DELIVERED", "CANCELLED"];

/** Effective platform commission % for a driver (0 on the driver = platform default). */
export const effectiveDriverCommission = (driverRate: number, s: DeliverySettings) =>
  driverRate && driverRate > 0 ? driverRate : s.driverCommission;

/** Driver earnings from a delivered job's charge, given the commission %. */
export function driverEarnings(charge: number, commissionPct: number) {
  const platformCut = round2((charge * commissionPct) / 100);
  return { charge: round2(charge), platformCut, net: round2(charge - platformCut) };
}

export interface EstimateInput {
  type?: string;
  pickupLat?: number | null; pickupLng?: number | null; pickupOutside?: boolean;
  dropoffLat?: number | null; dropoffLng?: number | null; dropoffOutside?: boolean;
  packageSize?: string;
  urgency?: string;
}

export interface EstimateResult {
  distanceKm: number;
  outsideCount: number;
  pickupOutside: boolean;
  dropoffOutside: boolean;
  min: number;
  max: number;
  breakdown: { label: string; amount: number }[];
}

// Default route distances (km) when the user hasn't pinned both points.
const DEFAULT_DISTANCE: Record<string, number> = { ALEY_TO_ALEY: 3, OUTSIDE_TO_ALEY: 16, ALEY_TO_OUTSIDE: 16, CUSTOM: 6 };

/**
 * Estimate a delivery price. Uses real pin distance when both points are pinned,
 * otherwise a sensible per-type default. Returns a band (min–max) the team can
 * confirm. Pure function of its inputs + settings — same logic the client preview
 * and the stored request both use.
 */
export function estimateDelivery(input: EstimateInput, s: DeliverySettings, now = new Date()): EstimateResult {
  const type = DELIVERY_TYPES.includes(input.type as never) ? input.type! : "ALEY_TO_ALEY";
  const pickup = { lat: input.pickupLat ?? null, lng: input.pickupLng ?? null };
  const dropoff = { lat: input.dropoffLat ?? null, lng: input.dropoffLng ?? null };
  const havePins = pickup.lat != null && pickup.lng != null && dropoff.lat != null && dropoff.lng != null;

  // Distance
  let distanceKm = havePins ? haversineKm(pickup as { lat: number; lng: number }, dropoff as { lat: number; lng: number }) : DEFAULT_DISTANCE[type] ?? 6;
  distanceKm = round1(Math.max(0.5, distanceKm));

  // Outside-Aley detection: prefer pin-based, fall back to type / explicit flags.
  const pickupOutside = isOutside(pickup) ?? (input.pickupOutside ?? type === "OUTSIDE_TO_ALEY");
  const dropoffOutside = isOutside(dropoff) ?? (input.dropoffOutside ?? type === "ALEY_TO_OUTSIDE");
  const outsideCount = (pickupOutside ? 1 : 0) + (dropoffOutside ? 1 : 0);

  const size = PACKAGE_SIZES.includes(input.packageSize as never) ? input.packageSize : "MEDIUM";
  const express = input.urgency === "EXPRESS";
  const hour = now.getHours();
  const night = hour >= 21 || hour < 7;

  const breakdown: { label: string; amount: number }[] = [];
  const add = (label: string, amount: number) => { if (amount) breakdown.push({ label, amount: round2(amount) }); };

  add("Base fee", s.baseFee);
  add(`Distance (${distanceKm} km)`, distanceKm * s.perKm);
  if (size === "MEDIUM") add("Medium package", s.sizeMediumSurcharge);
  if (size === "LARGE") add("Large package", s.sizeLargeSurcharge);
  if (express) add("Express", s.expressSurcharge);
  if (outsideCount) add(`Outside Aley ×${outsideCount}`, outsideCount * s.outsideSurcharge);
  if (night) add("Late hours", s.nightSurcharge);

  let est = breakdown.reduce((t, b) => t + b.amount, 0);
  est = Math.max(s.minPrice, est);
  const min = Math.round(est);
  const max = Math.round(est + Math.max(2, est * s.bandPct));

  return { distanceKm, outsideCount, pickupOutside, dropoffOutside, min, max, breakdown };
}
