// SQLite has no JSON column type, so list/object fields are JSON strings.
// These helpers parse them on the way out so the frontend gets real arrays.

export function parseArr(value: unknown): unknown[] {
  if (Array.isArray(value)) return value;
  if (typeof value === "string") {
    try {
      const parsed = JSON.parse(value);
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  }
  return [];
}

export function parseObj(value: unknown): Record<string, unknown> {
  if (value && typeof value === "object" && !Array.isArray(value)) return value as Record<string, unknown>;
  if (typeof value === "string") {
    try {
      const parsed = JSON.parse(value);
      return parsed && typeof parsed === "object" && !Array.isArray(parsed) ? parsed : {};
    } catch {
      return {};
    }
  }
  return {};
}

export const toJson = (value: unknown): string => JSON.stringify(value ?? []);

export interface HoursRow {
  day: number; // 0 = Sunday
  open: string; // "09:00"
  close: string; // "22:00"
  closed: boolean;
}

/** Full business (detail pages) — decode all JSON fields incl. products. */
export function outBusiness<T extends Record<string, unknown>>(b: T) {
  return {
    ...b,
    // Normalize gallery to {url, caption?} objects (legacy entries were bare URL strings).
    gallery: (parseArr(b.gallery) as (string | { url: string; caption?: string })[])
      .map((g) => (typeof g === "string" ? { url: g } : { url: g.url, caption: g.caption }))
      .filter((g) => g.url),
    tags: parseArr(b.tags) as string[],
    faqs: parseArr(b.faqs) as { q: string; a: string }[],
    products: parseArr(b.products),
    hours: parseArr(b.hours) as HoursRow[],
    openNow: isOpenNow(parseArr(b.hours) as HoursRow[]),
    bookingConfig: parseObj(b.bookingConfig),
  };
}

/** Lean business for directory cards/lists — omits heavy gallery/products/faqs. */
export function outCard<T extends Record<string, unknown>>(b: T) {
  return {
    id: b.id,
    slug: b.slug,
    name: b.name,
    tagline: b.tagline,
    logo: b.logo,
    cover: b.cover,
    category: b.category,
    rating: b.rating,
    reviewCount: b.reviewCount,
    priceRange: b.priceRange,
    hasDelivery: b.hasDelivery,
    hasReservations: b.hasReservations,
    isFeatured: b.isFeatured,
    isVerified: b.isVerified,
    address: b.address,
    phone: b.phone,
    whatsapp: b.whatsapp,
    city: b.city,
    openNow: isOpenNow(parseArr(b.hours) as HoursRow[]),
  };
}

/** Whether a business is open right now, from its hours (server-local time). */
export function isOpenNow(hours: HoursRow[], now = new Date()): boolean {
  const today = hours.find((h) => h.day === now.getDay());
  if (!today || today.closed || !today.open || !today.close) return false;
  const mins = now.getHours() * 60 + now.getMinutes();
  const [oh, om] = today.open.split(":").map(Number);
  const [ch, cm] = today.close.split(":").map(Number);
  const start = oh * 60 + om;
  const end = ch * 60 + cm;
  // Support overnight close (e.g. 18:00 -> 02:00).
  return start <= end ? mins >= start && mins < end : mins >= start || mins < end;
}

/** Decode a project row's JSON photo/timeline fields into real arrays. */
export function outProject<T extends Record<string, unknown>>(p: T) {
  return {
    ...p,
    beforePhotos: parseArr(p.beforePhotos) as string[],
    proposedPhotos: parseArr(p.proposedPhotos) as string[],
    progressPhotos: parseArr(p.progressPhotos) as string[],
    timeline: parseArr(p.timeline) as { label: string; date: string; done: boolean }[],
  };
}

export const slugify = (s: string) =>
  s
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
