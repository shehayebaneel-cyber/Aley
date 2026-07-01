import { prisma } from "../db";

// Customer engagement: resolve a business's audience segments to user ids so the
// owner can send in-app notifications (loyalty pushes, promos, event reminders).

export const SEGMENTS = [
  { key: "all", label: "Everyone reached" },
  { key: "followers", label: "Followers" },
  { key: "customers", label: "Past customers" },
  { key: "giftcards", label: "Gift card holders" },
  { key: "events", label: "Event attendees" },
] as const;
export type SegmentKey = (typeof SEGMENTS)[number]["key"];
const KEYS = new Set(SEGMENTS.map((s) => s.key));

async function followerIds(businessId: number): Promise<number[]> {
  const rows = await prisma.favorite.findMany({ where: { businessId }, select: { userId: true } });
  return rows.map((r) => r.userId);
}
async function customerIds(businessId: number): Promise<number[]> {
  const [orders, appts, facs] = await Promise.all([
    prisma.order.findMany({ where: { businessOrders: { some: { businessId } }, customerId: { not: null } }, select: { customerId: true } }),
    prisma.appointment.findMany({ where: { businessId, userId: { not: null } }, select: { userId: true } }),
    prisma.facilityBooking.findMany({ where: { businessId, userId: { not: null } }, select: { userId: true } }),
  ]);
  return [...orders.map((o) => o.customerId!), ...appts.map((a) => a.userId!), ...facs.map((f) => f.userId!)];
}
async function giftcardIds(businessId: number): Promise<number[]> {
  const rows = await prisma.voucher.findMany({ where: { businessId, purchaserUserId: { not: null } }, select: { purchaserUserId: true } });
  return rows.map((r) => r.purchaserUserId!);
}
async function eventIds(businessId: number): Promise<number[]> {
  const rows = await prisma.eventBooking.findMany({ where: { businessId, userId: { not: null } }, select: { userId: true } });
  return rows.map((r) => r.userId!);
}

/** Distinct user ids in a segment (deduped). Unknown segment → []. */
export async function resolveSegment(businessId: number, key: string): Promise<number[]> {
  let ids: number[] = [];
  if (key === "followers") ids = await followerIds(businessId);
  else if (key === "customers") ids = await customerIds(businessId);
  else if (key === "giftcards") ids = await giftcardIds(businessId);
  else if (key === "events") ids = await eventIds(businessId);
  else if (key === "all") {
    const [a, b, c, d] = await Promise.all([followerIds(businessId), customerIds(businessId), giftcardIds(businessId), eventIds(businessId)]);
    ids = [...a, ...b, ...c, ...d];
  }
  return [...new Set(ids)];
}

/** Audience size per segment, for the compose screen. */
export async function segmentCounts(businessId: number) {
  const [followers, customers, giftcards, events] = await Promise.all([followerIds(businessId), customerIds(businessId), giftcardIds(businessId), eventIds(businessId)]);
  return {
    all: new Set([...followers, ...customers, ...giftcards, ...events]).size,
    followers: new Set(followers).size,
    customers: new Set(customers).size,
    giftcards: new Set(giftcards).size,
    events: new Set(events).size,
  };
}

export const isSegment = (k: string): k is SegmentKey => KEYS.has(k as SegmentKey);
