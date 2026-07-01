import { prisma } from "../db";

// ---------------------------------------------------------------------------
// Analytics — event recording + aggregation for the provider dashboard and the
// admin platform analytics. Everything derives from the AnalyticsEvent log plus
// existing tables (Reservation, BusinessOrder, Favorite, Review, DeliveryRequest).
// ---------------------------------------------------------------------------

export const EVENT_TYPES = ["PROFILE_VIEW", "SEARCH_APPEARANCE", "PHONE_VIEW", "CALL", "WHATSAPP", "WEBSITE", "DIRECTIONS"] as const;
export type EventType = (typeof EVENT_TYPES)[number];
// Click events a visitor's browser reports (vs. server-recorded views/appearances).
export const CLICK_TYPES: EventType[] = ["PHONE_VIEW", "CALL", "WHATSAPP", "WEBSITE", "DIRECTIONS"];
// "Contact" interactions used for totals + leaderboards.
export const INTERACTION_TYPES: EventType[] = ["PHONE_VIEW", "CALL", "WHATSAPP", "WEBSITE", "DIRECTIONS"];

export async function recordEvent(businessId: number, type: EventType, meta = "") {
  try { await prisma.analyticsEvent.create({ data: { businessId, type, meta } }); } catch { /* never block the request */ }
}
export async function recordMany(businessIds: number[], type: EventType) {
  if (!businessIds.length) return;
  try { await prisma.analyticsEvent.createMany({ data: businessIds.map((businessId) => ({ businessId, type })) }); } catch { /* ignore */ }
}

// ---- Date ranges ----
export const PERIODS = ["today", "yesterday", "7d", "30d", "90d", "year", "custom"] as const;
export type Period = (typeof PERIODS)[number];
export interface Range { start: Date; end: Date; prevStart: Date; prevEnd: Date; days: number }

const startOfDay = (d: Date) => new Date(d.getFullYear(), d.getMonth(), d.getDate());
const addDays = (d: Date, n: number) => new Date(d.getTime() + n * 86400000);

export function resolveRange(period: string, fromISO?: string, toISO?: string, now = new Date()): Range {
  let start: Date, end: Date;
  const sod = startOfDay(now);
  switch (period) {
    case "today": start = sod; end = now; break;
    case "yesterday": start = addDays(sod, -1); end = sod; break;
    case "7d": start = addDays(sod, -6); end = now; break;
    case "90d": start = addDays(sod, -89); end = now; break;
    case "year": start = new Date(now.getFullYear(), 0, 1); end = now; break;
    case "custom": {
      start = fromISO ? startOfDay(new Date(fromISO)) : addDays(sod, -29);
      end = toISO ? addDays(startOfDay(new Date(toISO)), 1) : now; // inclusive end day
      break;
    }
    case "30d":
    default: start = addDays(sod, -29); end = now; break;
  }
  const span = Math.max(1, end.getTime() - start.getTime());
  const prevEnd = start;
  const prevStart = new Date(start.getTime() - span);
  const days = Math.max(1, Math.ceil(span / 86400000));
  return { start, end, prevStart, prevEnd, days };
}

const pct = (curr: number, prev: number) => (prev <= 0 ? (curr > 0 ? 100 : 0) : Math.round(((curr - prev) / prev) * 1000) / 10);
const metric = (value: number, prev: number) => ({ value, prev, delta: pct(value, prev) });
const round2 = (n: number) => Math.round(n * 100) / 100;
const ymd = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;

// ---- Per-business metrics ----
export async function businessMetrics(businessId: number, range: Range) {
  const { start, end, prevStart, prevEnd } = range;
  const business = await prisma.business.findUnique({ where: { id: businessId }, include: { category: true } });
  if (!business) return null;

  const [events, prevGrouped, reservations, prevReservationCount, tickets, favorites, prevFavorites, reviewsInRange, courierDeliveries] = await Promise.all([
    prisma.analyticsEvent.findMany({ where: { businessId, createdAt: { gte: start, lt: end } }, select: { type: true, createdAt: true } }),
    prisma.analyticsEvent.groupBy({ by: ["type"], where: { businessId, createdAt: { gte: prevStart, lt: prevEnd } }, _count: { _all: true } }),
    prisma.reservation.findMany({ where: { businessId, createdAt: { gte: start, lt: end } }, select: { status: true } }),
    prisma.reservation.count({ where: { businessId, createdAt: { gte: prevStart, lt: prevEnd } } }),
    prisma.businessOrder.findMany({ where: { businessId, createdAt: { gte: start, lt: end } }, select: { status: true, subtotal: true, order: { select: { fulfillment: true } } } }),
    prisma.favorite.count({ where: { businessId, createdAt: { gte: start, lt: end } } }),
    prisma.favorite.count({ where: { businessId, createdAt: { gte: prevStart, lt: prevEnd } } }),
    prisma.review.findMany({ where: { businessId, status: "APPROVED", createdAt: { gte: start, lt: end } }, select: { rating: true } }),
    prisma.deliveryRequest.count({ where: { businessId, createdAt: { gte: start, lt: end } } }),
  ]);

  // Current counts by type.
  const cur: Record<string, number> = {};
  for (const t of EVENT_TYPES) cur[t] = 0;
  for (const e of events) cur[e.type] = (cur[e.type] ?? 0) + 1;
  const prev: Record<string, number> = {};
  for (const g of prevGrouped) prev[g.type] = g._count._all;

  const interactions = INTERACTION_TYPES.reduce((s, t) => s + (cur[t] ?? 0), 0);
  const prevInteractions = INTERACTION_TYPES.reduce((s, t) => s + (prev[t] ?? 0), 0);
  const ctr = cur.SEARCH_APPEARANCE > 0 ? Math.round((cur.PROFILE_VIEW / cur.SEARCH_APPEARANCE) * 1000) / 10 : 0;

  // Daily series across the range.
  const days: string[] = [];
  for (let d = startOfDay(start); d < end; d = addDays(d, 1)) days.push(ymd(d));
  const blank = () => Object.fromEntries(days.map((d) => [d, 0])) as Record<string, number>;
  const sViews = blank(), sInteractions = blank(), sAppearances = blank();
  for (const e of events) {
    const key = ymd(e.createdAt);
    if (e.type === "PROFILE_VIEW" && key in sViews) sViews[key]++;
    if (e.type === "SEARCH_APPEARANCE" && key in sAppearances) sAppearances[key]++;
    if (INTERACTION_TYPES.includes(e.type as EventType) && key in sInteractions) sInteractions[key]++;
  }
  const series = (m: Record<string, number>) => days.map((date) => ({ date, value: m[date] }));

  // Bookings / orders / reviews.
  const bookings = { requests: reservations.length, confirmed: reservations.filter((r) => r.status === "CONFIRMED").length, cancelled: reservations.filter((r) => ["CANCELLED", "DECLINED"].includes(r.status)).length };
  const liveTickets = tickets.filter((t) => t.status !== "CANCELLED");
  const orders = {
    received: tickets.length,
    completed: tickets.filter((t) => t.status === "READY").length,
    cancelled: tickets.filter((t) => t.status === "CANCELLED").length,
    revenue: round2(liveTickets.reduce((s, t) => s + t.subtotal, 0)),
  };
  const deliveries = courierDeliveries + tickets.filter((t) => t.order.fulfillment === "DELIVERY").length;
  const newRating = reviewsInRange.length ? round2(reviewsInRange.reduce((s, r) => s + r.rating, 0) / reviewsInRange.length) : 0;

  // Insights.
  const dow = [0, 0, 0, 0, 0, 0, 0];
  const hours = new Array(24).fill(0);
  for (const e of events) if (e.type === "PROFILE_VIEW") { dow[e.createdAt.getDay()]++; hours[e.createdAt.getHours()]++; }
  const DOW = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
  const insights: string[] = [];
  const viewsDelta = pct(cur.PROFILE_VIEW, prev.PROFILE_VIEW ?? 0);
  if (cur.PROFILE_VIEW > 0 && (prev.PROFILE_VIEW ?? 0) > 0) insights.push(`Your profile views ${viewsDelta >= 0 ? "increased" : "decreased"} by ${Math.abs(viewsDelta)}% vs the previous period.`);
  if (interactions > 0) insights.push(`You received ${interactions} customer interaction${interactions === 1 ? "" : "s"} (calls, WhatsApp, directions, website).`);
  const peakDow = dow.indexOf(Math.max(...dow));
  if (Math.max(...dow) > 0) insights.push(`${DOW[peakDow]}s are your busiest day.`);
  const peakHour = hours.indexOf(Math.max(...hours));
  if (Math.max(...hours) > 0) insights.push(`Most profile visits happen around ${peakHour}:00–${(peakHour + 2) % 24}:00.`);
  insights.push(`Most visitors find you under the "${business.category.name}" category.`);
  // vs category average (this period).
  const catAvg = await categoryAverageViews(business.categoryId, range);
  if (catAvg > 0) {
    const ratio = Math.round((cur.PROFILE_VIEW / catAvg) * 100);
    insights.push(`Your listing performs ${ratio >= 100 ? `${ratio - 100}% above` : `${100 - ratio}% below`} the average ${business.category.name} business.`);
  }

  const advanced = await advancedInsights(businessId, range, cur.PROFILE_VIEW);

  return {
    business: { id: business.id, name: business.name, slug: business.slug, category: business.category.name, rating: business.rating, reviewCount: business.reviewCount, hasReservations: business.hasReservations, hasDelivery: business.hasDelivery },
    advanced,
    cards: {
      profileViews: metric(cur.PROFILE_VIEW, prev.PROFILE_VIEW ?? 0),
      searchAppearances: metric(cur.SEARCH_APPEARANCE, prev.SEARCH_APPEARANCE ?? 0),
      ctr,
      phoneViews: metric(cur.PHONE_VIEW, prev.PHONE_VIEW ?? 0),
      calls: metric(cur.CALL, prev.CALL ?? 0),
      whatsapp: metric(cur.WHATSAPP, prev.WHATSAPP ?? 0),
      website: metric(cur.WEBSITE, prev.WEBSITE ?? 0),
      directions: metric(cur.DIRECTIONS, prev.DIRECTIONS ?? 0),
      interactions: metric(interactions, prevInteractions),
      favorites: metric(favorites, prevFavorites),
      bookings,
      orders,
      deliveries,
      reviews: { total: business.reviewCount, newCount: reviewsInRange.length, avg: business.rating, periodAvg: newRating },
    },
    series: { profileViews: series(sViews), interactions: series(sInteractions), searchAppearances: series(sAppearances) },
    insights,
  };
}

async function categoryAverageViews(categoryId: number, range: Range): Promise<number> {
  const businesses = await prisma.business.findMany({ where: { categoryId, isPublished: true }, select: { id: true } });
  if (businesses.length <= 1) return 0;
  const ids = businesses.map((b) => b.id);
  const grouped = await prisma.analyticsEvent.groupBy({ by: ["businessId"], where: { businessId: { in: ids }, type: "PROFILE_VIEW", createdAt: { gte: range.start, lt: range.end } }, _count: { _all: true } });
  const total = grouped.reduce((s, g) => s + g._count._all, 0);
  return total / businesses.length;
}

const hourOf = (hhmm: string) => { const h = parseInt(String(hhmm).slice(0, 2), 10); return isNaN(h) ? -1 : h; };
const topN = (map: Map<string, number>, n: number) => [...map.entries()].sort((a, b) => b[1] - a[1]).slice(0, n).map(([name, count]) => ({ name, count }));

// Repeat / retention: lifetime customer activity keyed by phone across every channel.
async function customerStats(businessId: number, range: Range) {
  const [a, f, o, r] = await Promise.all([
    prisma.appointment.findMany({ where: { businessId }, select: { customerPhone: true, createdAt: true } }),
    prisma.facilityBooking.findMany({ where: { businessId }, select: { customerPhone: true, createdAt: true } }),
    prisma.businessOrder.findMany({ where: { businessId }, select: { createdAt: true, order: { select: { customerPhone: true } } } }),
    prisma.reservation.findMany({ where: { businessId }, select: { phone: true, createdAt: true } }),
  ]);
  const map = new Map<string, { count: number; first: number; inRange: boolean }>();
  const add = (rawPhone: string | undefined, when: Date) => {
    const p = (rawPhone || "").trim(); if (!p) return;
    const t = when.getTime();
    let e = map.get(p); if (!e) { e = { count: 0, first: t, inRange: false }; map.set(p, e); }
    e.count++; if (t < e.first) e.first = t;
    if (when >= range.start && when < range.end) e.inRange = true;
  };
  a.forEach((x) => add(x.customerPhone, x.createdAt));
  f.forEach((x) => add(x.customerPhone, x.createdAt));
  o.forEach((x) => add(x.order?.customerPhone, x.createdAt));
  r.forEach((x) => add(x.phone, x.createdAt));
  const all = [...map.values()];
  const total = all.length;
  const repeat = all.filter((e) => e.count > 1).length;
  const active = all.filter((e) => e.inRange);
  const isNew = active.filter((e) => e.first >= range.start.getTime()).length;
  const returning = active.length - isNew;
  return {
    total, repeat, repeatRate: total ? Math.round((repeat / total) * 100) : 0,
    active: active.length, new: isNew, returning,
    retentionRate: active.length ? Math.round((returning / active.length) * 100) : 0,
  };
}

// Deeper business insights: gift cards, redemptions, AOV, conversions, peak hours, popular items.
async function advancedInsights(businessId: number, range: Range, profileViews: number) {
  const inRange = { gte: range.start, lt: range.end };
  const [vSales, vRedeems, offerRedeems, bOrders, appts, facs, quoteTargets, customers] = await Promise.all([
    prisma.voucher.findMany({ where: { businessId, createdAt: inRange }, select: { price: true } }),
    prisma.voucher.count({ where: { businessId, status: "REDEEMED", redeemedAt: inRange } }),
    prisma.offerRedemption.count({ where: { businessId, status: "REDEEMED", redeemedAt: inRange } }),
    prisma.businessOrder.findMany({ where: { businessId, createdAt: inRange, status: { not: "CANCELLED" } }, select: { subtotal: true, createdAt: true, items: { select: { name: true, quantity: true } } } }),
    prisma.appointment.findMany({ where: { businessId, createdAt: inRange }, select: { time: true, serviceName: true, status: true } }),
    prisma.facilityBooking.findMany({ where: { businessId, createdAt: inRange }, select: { startTime: true } }),
    prisma.serviceRequestTarget.findMany({ where: { businessId, createdAt: inRange }, select: { status: true } }),
    customerStats(businessId, range),
  ]);

  const giftCardSales = { count: vSales.length, revenue: round2(vSales.reduce((s, v) => s + v.price, 0)) };
  const aov = bOrders.length ? round2(bOrders.reduce((s, o) => s + o.subtotal, 0) / bOrders.length) : 0;

  // Peak hours: real demand from orders + appointments + field bookings.
  const peakHours = new Array(24).fill(0) as number[];
  for (const o of bOrders) peakHours[o.createdAt.getHours()]++;
  for (const a of appts) { const h = hourOf(a.time); if (h >= 0) peakHours[h]++; }
  for (const f of facs) { const h = hourOf(f.startTime); if (h >= 0) peakHours[h]++; }

  // Popular products (order items) + services (appointments).
  const itemMap = new Map<string, number>();
  for (const o of bOrders) for (const it of o.items) itemMap.set(it.name, (itemMap.get(it.name) ?? 0) + it.quantity);
  const svcMap = new Map<string, number>();
  for (const a of appts) if (a.serviceName) svcMap.set(a.serviceName, (svcMap.get(a.serviceName) ?? 0) + 1);

  // Conversions.
  const keptAppts = appts.filter((a) => ["CONFIRMED", "COMPLETED", "RESCHEDULED"].includes(a.status)).length;
  const repliedQuotes = quoteTargets.filter((q) => q.status === "REPLIED").length;
  const actions = bOrders.length + appts.length + facs.length;
  const conversion = {
    rate: profileViews > 0 ? Math.round((actions / profileViews) * 1000) / 10 : 0, // actions per 100 views
    booking: appts.length ? Math.round((keptAppts / appts.length) * 100) : 0,
    quote: quoteTargets.length ? Math.round((repliedQuotes / quoteTargets.length) * 100) : 0,
  };

  return {
    giftCards: { sales: giftCardSales, redemptions: vRedeems },
    offerRedemptions: offerRedeems,
    aov,
    customers,
    conversion,
    quotes: { received: quoteTargets.length, replied: repliedQuotes },
    peakHours,
    popularItems: topN(itemMap, 5),
    popularServices: topN(svcMap, 5),
  };
}

// ---- Platform-wide analytics + leaderboards (admin) ----
export async function platformMetrics(range: Range) {
  const { start, end, prevStart, prevEnd } = range;
  const [byTypeCur, byTypePrev, viewsByBiz, prevViewsByBiz, interByBiz, bookingsByBiz, ordersByBiz, businesses] = await Promise.all([
    prisma.analyticsEvent.groupBy({ by: ["type"], where: { createdAt: { gte: start, lt: end } }, _count: { _all: true } }),
    prisma.analyticsEvent.groupBy({ by: ["type"], where: { createdAt: { gte: prevStart, lt: prevEnd } }, _count: { _all: true } }),
    prisma.analyticsEvent.groupBy({ by: ["businessId"], where: { type: "PROFILE_VIEW", createdAt: { gte: start, lt: end } }, _count: { _all: true } }),
    prisma.analyticsEvent.groupBy({ by: ["businessId"], where: { type: "PROFILE_VIEW", createdAt: { gte: prevStart, lt: prevEnd } }, _count: { _all: true } }),
    prisma.analyticsEvent.groupBy({ by: ["businessId"], where: { type: { in: INTERACTION_TYPES }, createdAt: { gte: start, lt: end } }, _count: { _all: true } }),
    prisma.reservation.groupBy({ by: ["businessId"], where: { createdAt: { gte: start, lt: end } }, _count: { _all: true } }),
    prisma.businessOrder.groupBy({ by: ["businessId"], where: { createdAt: { gte: start, lt: end } }, _count: { _all: true }, _sum: { subtotal: true } }),
    prisma.business.findMany({ select: { id: true, name: true, slug: true, rating: true, reviewCount: true, isPublished: true, category: { select: { name: true } } } }),
  ]);

  const mapCount = (rows: { businessId: number; _count: { _all: number } }[]) => new Map(rows.map((r) => [r.businessId, r._count._all]));
  const views = mapCount(viewsByBiz), prevViews = mapCount(prevViewsByBiz), inter = mapCount(interByBiz), books = mapCount(bookingsByBiz);
  const orders = new Map(ordersByBiz.map((r) => [r.businessId, { count: r._count._all, revenue: round2(r._sum.subtotal ?? 0) }]));

  const rows = businesses.map((b) => ({
    id: b.id, name: b.name, slug: b.slug, category: b.category.name, isPublished: b.isPublished,
    rating: b.rating, reviewCount: b.reviewCount,
    views: views.get(b.id) ?? 0, prevViews: prevViews.get(b.id) ?? 0,
    interactions: inter.get(b.id) ?? 0, bookings: books.get(b.id) ?? 0,
    orders: orders.get(b.id)?.count ?? 0, revenue: orders.get(b.id)?.revenue ?? 0,
    growth: pct(views.get(b.id) ?? 0, prevViews.get(b.id) ?? 0),
  }));

  const cur: Record<string, number> = {}; for (const g of byTypeCur) cur[g.type] = g._count._all;
  const prev: Record<string, number> = {}; for (const g of byTypePrev) prev[g.type] = g._count._all;
  const interTotalCur = INTERACTION_TYPES.reduce((s, t) => s + (cur[t] ?? 0), 0);
  const interTotalPrev = INTERACTION_TYPES.reduce((s, t) => s + (prev[t] ?? 0), 0);

  const top = (key: (r: typeof rows[number]) => number, n = 8, minViews = 0) =>
    [...rows].filter((r) => key(r) > 0 && r.views >= minViews).sort((a, b) => key(b) - key(a)).slice(0, n);

  return {
    totals: {
      profileViews: metric(cur.PROFILE_VIEW ?? 0, prev.PROFILE_VIEW ?? 0),
      searchAppearances: metric(cur.SEARCH_APPEARANCE ?? 0, prev.SEARCH_APPEARANCE ?? 0),
      interactions: metric(interTotalCur, interTotalPrev),
      businesses: businesses.length,
      active: rows.filter((r) => r.views > 0 || r.interactions > 0).length,
      revenue: round2(rows.reduce((s, r) => s + r.revenue, 0)),
    },
    leaderboards: {
      mostViewed: top((r) => r.views),
      mostContacted: top((r) => r.interactions),
      mostBooked: top((r) => r.bookings),
      mostOrdered: top((r) => r.orders),
      highestRated: [...rows].filter((r) => r.reviewCount >= 2).sort((a, b) => b.rating - a.rating || b.reviewCount - a.reviewCount).slice(0, 8),
      fastestGrowing: [...rows].filter((r) => r.views >= 5 && r.growth > 0).sort((a, b) => b.growth - a.growth).slice(0, 8),
    },
    rows,
  };
}
