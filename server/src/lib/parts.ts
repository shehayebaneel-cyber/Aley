import { parseArr, parseObj } from "./serialize";

// Spare-parts marketplace + RFQ helpers. The RFQ models are generic (ServiceRequest/
// Quote/Target) so the same flow later powers mechanics/plumbers/etc.

export const CAR_MAKES = [
  "Mercedes", "BMW", "Hyundai", "Toyota", "Nissan", "Kia", "Honda", "Ford", "Chevrolet",
  "Volkswagen", "Audi", "Peugeot", "Renault", "Mazda", "Mitsubishi", "Jeep", "Land Rover",
  "Lexus", "Suzuki", "Dodge", "GMC", "Volvo", "Citroën", "Fiat", "Opel", "Other",
];

export const PART_CATEGORIES = [
  "Engine", "Transmission", "Brakes", "Suspension", "Steering", "Electrical", "Battery",
  "Cooling", "Exhaust", "Filters", "Body & Exterior", "Lights", "Mirrors", "Glass",
  "Interior", "Tires & Wheels", "AC & Heating", "Accessories", "Other",
];

export const CONDITIONS = ["NEW", "USED", "ANY"];
export const SOURCING = ["OEM", "AFTERMARKET", "ANY"];

export interface PartsProfile {
  brands: string[];
  makes: string[];
  partCategories: string[];
  newParts: boolean;
  usedParts: boolean;
  oem: boolean;
  aftermarket: boolean;
}
export function parsePartsProfile(raw: unknown): PartsProfile {
  const o = parseObj(raw);
  return {
    brands: Array.isArray(o.brands) ? (o.brands as string[]).map(String) : [],
    makes: Array.isArray(o.makes) ? (o.makes as string[]).map(String) : [],
    partCategories: Array.isArray(o.partCategories) ? (o.partCategories as string[]).map(String) : [],
    newParts: o.newParts !== false,
    usedParts: !!o.usedParts,
    oem: !!o.oem,
    aftermarket: o.aftermarket !== false,
  };
}

type ShopRow = {
  id: number; slug: string; name: string; logo: string | null; cover: string | null; phone: string;
  whatsapp: string; address: string; rating: number; reviewCount: number; hasDelivery: boolean;
  partsProfile: string; city?: { slug: string; name: string } | null;
};
/** Shape an auto-parts business for the directory card. */
export function outPartsShop(b: ShopRow) {
  const p = parsePartsProfile(b.partsProfile);
  return {
    id: b.id, slug: b.slug, name: b.name, logo: b.logo, cover: b.cover,
    phone: b.phone, whatsapp: b.whatsapp, address: b.address,
    rating: b.rating, reviewCount: b.reviewCount, hasDelivery: b.hasDelivery,
    city: b.city ?? null,
    brands: p.brands, makes: p.makes, partCategories: p.partCategories,
    newParts: p.newParts, usedParts: p.usedParts, oem: p.oem, aftermarket: p.aftermarket,
  };
}

/** Does a shop profile match a requested car make? (empty makes = serves all.) */
export function shopMatchesMake(profile: PartsProfile, make: string): boolean {
  if (!make || !profile.makes.length) return true;
  return profile.makes.some((m) => m.toLowerCase() === make.toLowerCase());
}

const ACTIVE_REQ = new Set(["SUBMITTED", "SENT", "REPLIES", "SELECTED"]);
/** Effective request status accounting for expiry (does not mutate the row). */
export function requestStatus(r: { status: string; expiresAt: Date | null }): string {
  if (ACTIVE_REQ.has(r.status) && r.expiresAt && new Date(r.expiresAt).getTime() < Date.now()) return "EXPIRED";
  return r.status;
}

export const PART_REQUEST_DEFAULT_DAYS = 14;

export { parseArr };
