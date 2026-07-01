import { randomBytes } from "crypto";
import { prisma } from "../db";
import { parseArr } from "./serialize";

// Event taxonomy + helpers for the discovery / ticketing experience.

export interface EventCategoryDef { key: string; label: string; emoji: string }
export const EVENT_CATEGORIES: EventCategoryDef[] = [
  { key: "festivals", label: "Festivals", emoji: "🎪" },
  { key: "live-music", label: "Live Music", emoji: "🎤" },
  { key: "concerts", label: "Concerts", emoji: "🎸" },
  { key: "food-drinks", label: "Food & Drinks", emoji: "🍴" },
  { key: "coffee-events", label: "Coffee Events", emoji: "☕" },
  { key: "sports", label: "Sports", emoji: "🏅" },
  { key: "football", label: "Football", emoji: "⚽" },
  { key: "padel", label: "Padel", emoji: "🎾" },
  { key: "basketball", label: "Basketball", emoji: "🏀" },
  { key: "family", label: "Family", emoji: "👨‍👩‍👧" },
  { key: "kids", label: "Kids", emoji: "🧒" },
  { key: "community", label: "Community", emoji: "📢" },
  { key: "charity", label: "Charity", emoji: "🤝" },
  { key: "business", label: "Business", emoji: "💼" },
  { key: "workshops", label: "Workshops", emoji: "🛠️" },
  { key: "art-culture", label: "Art & Culture", emoji: "🎨" },
  { key: "theatre", label: "Theatre", emoji: "🎭" },
  { key: "cinema", label: "Cinema", emoji: "🎬" },
  { key: "nightlife", label: "Nightlife", emoji: "🍸" },
  { key: "car-meets", label: "Car Meets", emoji: "🚗" },
  { key: "fitness", label: "Fitness", emoji: "🏋️" },
  { key: "university", label: "University", emoji: "🎓" },
  { key: "religious", label: "Religious", emoji: "🕌" },
  { key: "seasonal", label: "Seasonal", emoji: "❄️" },
  { key: "holiday-events", label: "Holiday Events", emoji: "🎉" },
];
const CAT_MAP: Record<string, EventCategoryDef> = Object.fromEntries(EVENT_CATEGORIES.map((c) => [c.key, c]));
export const eventCategoryLabel = (key: string) => CAT_MAP[key]?.label ?? key;
export const eventCategoryEmoji = (key: string) => CAT_MAP[key]?.emoji ?? "📅";

export const TICKET_KINDS = ["GENERAL", "VIP", "EARLY_BIRD", "STUDENT", "FAMILY", "FREE"];

/** Unique attendee code, e.g. AV-EV-7K3M-92QD. */
export async function uniqueEventCode(): Promise<string> {
  const part = () => randomBytes(2).toString("hex").toUpperCase();
  for (let i = 0; i < 8; i++) {
    const code = `AV-EV-${part()}-${part()}`;
    if (!(await prisma.eventBooking.findUnique({ where: { code } }))) return code;
  }
  return `AV-EV-${Date.now().toString(36).toUpperCase()}`;
}

interface TicketTypeLite { id: number; name: string; kind: string; price: number; quantity: number; soldCount: number; description: string; isActive: boolean; sortOrder: number }
interface EventRow {
  id: number; title: string; description: string; category: string; image: string | null; gallery: string;
  location: string; lat: number | null; lng: number | null;
  organizerName: string; organizerPhone: string; organizerEmail: string;
  startTime: Date; endTime: Date | null; capacity: number; isFeatured: boolean; viewCount: number; createdAt: Date;
  business?: { slug: string; name: string; logo: string | null; cover: string | null; phone?: string; whatsapp?: string; category?: unknown } | null;
  ticketTypes?: TicketTypeLite[];
}

export interface EventCounts { interested: number; going: number; maybe: number; booked: number }

/** Shape an event for cards / detail with derived discovery + ticketing fields. */
export function outEvent(e: EventRow, opts: { counts?: EventCounts; saved?: boolean; myRsvp?: string | null; includeTickets?: boolean } = {}) {
  const counts = opts.counts ?? { interested: 0, going: 0, maybe: 0, booked: 0 };
  const active = (e.ticketTypes ?? []).filter((t) => t.isActive);
  const paid = active.filter((t) => t.price > 0);
  const priceFrom = paid.length ? Math.min(...paid.map((t) => t.price)) : 0;
  const isFree = paid.length === 0;
  const remaining = e.capacity > 0 ? Math.max(0, e.capacity - counts.booked) : null;
  return {
    id: e.id,
    title: e.title,
    description: e.description,
    category: e.category,
    categoryLabel: eventCategoryLabel(e.category),
    categoryEmoji: eventCategoryEmoji(e.category),
    image: e.image,
    gallery: parseArr(e.gallery) as { url: string; caption?: string }[],
    location: e.location,
    lat: e.lat,
    lng: e.lng,
    organizerName: e.organizerName || e.business?.name || "",
    organizerPhone: e.organizerPhone || e.business?.phone || "",
    organizerEmail: e.organizerEmail,
    startTime: e.startTime,
    endTime: e.endTime,
    capacity: e.capacity,
    remaining,
    isFeatured: e.isFeatured,
    viewCount: e.viewCount,
    createdAt: e.createdAt,
    isFree,
    priceFrom,
    interested: counts.interested,
    going: counts.going,
    maybe: counts.maybe,
    attending: counts.going + counts.booked,
    saved: opts.saved ?? false,
    myRsvp: opts.myRsvp ?? null,
    business: e.business ? { slug: e.business.slug, name: e.business.name, logo: e.business.logo, cover: e.business.cover, category: e.business.category ?? null } : null,
    ...(opts.includeTickets
      ? { ticketTypes: active.sort((a, b) => a.sortOrder - b.sortOrder).map((t) => ({ id: t.id, name: t.name, kind: t.kind, price: t.price, description: t.description, remaining: t.quantity > 0 ? Math.max(0, t.quantity - t.soldCount) : null, soldOut: t.quantity > 0 && t.soldCount >= t.quantity })) }
      : {}),
  };
}

/** Batch RSVP/booking counts for a set of event ids (one query each). */
export async function eventCountsFor(ids: number[]): Promise<Map<number, EventCounts>> {
  const out = new Map<number, EventCounts>();
  if (!ids.length) return out;
  for (const id of ids) out.set(id, { interested: 0, going: 0, maybe: 0, booked: 0 });
  const [rsvps, bookings] = await Promise.all([
    prisma.eventRSVP.groupBy({ by: ["eventId", "status"], where: { eventId: { in: ids } }, _count: { _all: true } }),
    prisma.eventBooking.groupBy({ by: ["eventId"], where: { eventId: { in: ids }, status: { not: "CANCELLED" } }, _sum: { quantity: true } }),
  ]);
  for (const r of rsvps) {
    const c = out.get(r.eventId)!;
    if (r.status === "GOING") c.going += r._count._all;
    else if (r.status === "MAYBE") c.maybe += r._count._all;
    else c.interested += r._count._all;
  }
  for (const b of bookings) out.get(b.eventId)!.booked += b._sum.quantity ?? 0;
  return out;
}
