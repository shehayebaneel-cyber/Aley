import { prisma } from "../db";

// The owner "control center" home: a Today summary + a unified activity Inbox
// that aggregates everything needing the owner's attention across every channel.

const round2 = (n: number) => Math.round(n * 100) / 100;
const startOfToday = () => { const d = new Date(); d.setHours(0, 0, 0, 0); return d; };
const todayStr = () => new Date().toLocaleDateString("en-CA"); // "YYYY-MM-DD" (matches booking date strings)

/** Today-at-a-glance numbers + what needs action right now. */
export async function todaySummary(businessId: number) {
  const dayStart = startOfToday();
  const day = todayStr();
  const created = { businessId, createdAt: { gte: dayStart } } as const;

  const [
    orders, appts, reservations, facilityBookings, vouchers, offerRedemptions, txs,
    upcomingAppts, upcomingFacility,
    pendingOrders, pendingReservations, pendingAppts, quotesWaiting, unrepliedReviews,
  ] = await Promise.all([
    prisma.businessOrder.count({ where: created }),
    prisma.appointment.count({ where: created }),
    prisma.reservation.count({ where: created }),
    prisma.facilityBooking.count({ where: created }),
    prisma.voucher.findMany({ where: { businessId, createdAt: { gte: dayStart } }, select: { price: true } }),
    prisma.offerRedemption.count({ where: { businessId, redeemedAt: { gte: dayStart } } }),
    prisma.transaction.findMany({ where: { businessId, createdAt: { gte: dayStart }, status: { in: ["PAID", "PARTIALLY_REFUNDED"] } }, select: { amount: true } }),
    prisma.appointment.findMany({ where: { businessId, date: day, status: { in: ["PENDING", "CONFIRMED", "RESCHEDULED"] } }, orderBy: { time: "asc" }, take: 8, select: { time: true, customerName: true, serviceName: true, staffName: true, status: true } }),
    prisma.facilityBooking.findMany({ where: { businessId, date: day, status: { in: ["PENDING", "CONFIRMED"] } }, orderBy: { startTime: "asc" }, take: 8, select: { startTime: true, customerName: true, facilityName: true, status: true } }),
    prisma.businessOrder.count({ where: { businessId, status: "PENDING" } }),
    prisma.reservation.count({ where: { businessId, status: "PENDING" } }),
    prisma.appointment.count({ where: { businessId, status: "PENDING" } }),
    prisma.serviceRequestTarget.count({ where: { businessId, status: { in: ["NEW", "VIEWED"] } } }),
    prisma.review.count({ where: { businessId, status: "APPROVED", reply: "" } }),
  ]);

  // New customers today: phones seen today that never appeared before today.
  const newCustomers = await countNewCustomers(businessId, dayStart);

  const upcoming = [
    ...upcomingAppts.map((a) => ({ time: a.time, name: a.customerName, detail: a.serviceName || a.staffName || "Appointment", status: a.status })),
    ...upcomingFacility.map((f) => ({ time: f.startTime, name: f.customerName, detail: f.facilityName || "Field booking", status: f.status })),
  ].sort((a, b) => a.time.localeCompare(b.time));

  return {
    today: {
      orders,
      bookings: appts + reservations + facilityBookings,
      newCustomers,
      revenue: round2(txs.reduce((s, t) => s + t.amount, 0)),
      giftCardSales: { count: vouchers.length, value: round2(vouchers.reduce((s, v) => s + v.price, 0)) },
      offerRedemptions,
    },
    upcoming: { count: upcoming.length, list: upcoming.slice(0, 8) },
    actions: { pendingOrders, pendingReservations, pendingAppointments: pendingAppts, quotesWaiting, unrepliedReviews },
  };
}

// Count distinct customer phones active today whose earliest activity is today.
async function countNewCustomers(businessId: number, dayStart: Date): Promise<number> {
  const phoneSel = { customerPhone: true } as const;
  const [a, f, o, r] = await Promise.all([
    prisma.appointment.findMany({ where: { businessId, createdAt: { gte: dayStart } }, select: phoneSel }),
    prisma.facilityBooking.findMany({ where: { businessId, createdAt: { gte: dayStart } }, select: phoneSel }),
    prisma.businessOrder.findMany({ where: { businessId, createdAt: { gte: dayStart } }, select: { order: { select: { customerPhone: true } } } }),
    prisma.reservation.findMany({ where: { businessId, createdAt: { gte: dayStart } }, select: { phone: true } }),
  ]);
  const todayPhones = new Set<string>([
    ...a.map((x) => x.customerPhone), ...f.map((x) => x.customerPhone),
    ...o.map((x) => x.order?.customerPhone ?? ""), ...r.map((x) => x.phone),
  ].filter(Boolean));
  if (todayPhones.size === 0) return 0;
  const phones = [...todayPhones];
  const before = { businessId, createdAt: { lt: dayStart } } as const;
  const [pa, pf, po, pr] = await Promise.all([
    prisma.appointment.findMany({ where: { ...before, customerPhone: { in: phones } }, select: phoneSel }),
    prisma.facilityBooking.findMany({ where: { ...before, customerPhone: { in: phones } }, select: phoneSel }),
    prisma.businessOrder.findMany({ where: { ...before, order: { customerPhone: { in: phones } } }, select: { order: { select: { customerPhone: true } } } }),
    prisma.reservation.findMany({ where: { ...before, phone: { in: phones } }, select: { phone: true } }),
  ]);
  const returning = new Set<string>([
    ...pa.map((x) => x.customerPhone), ...pf.map((x) => x.customerPhone),
    ...po.map((x) => x.order?.customerPhone ?? ""), ...pr.map((x) => x.phone),
  ].filter(Boolean));
  return phones.filter((p) => !returning.has(p)).length;
}

export interface InboxItem {
  id: string; kind: string; icon: string; title: string; subtitle: string;
  time: string; status: string; needsAction: boolean; tab: string;
}

const TAKE = 25;
const excerpt = (s: string, n = 60) => (s.length > n ? s.slice(0, n) + "…" : s);

/** One unified feed of recent activity across every channel, newest first. */
export async function inboxItems(businessId: number): Promise<InboxItem[]> {
  const [orders, appts, reservations, facility, quotes, vouchers, events, reviews] = await Promise.all([
    prisma.businessOrder.findMany({ where: { businessId }, orderBy: { createdAt: "desc" }, take: TAKE, include: { order: { select: { customerName: true } }, items: { select: { id: true } } } }),
    prisma.appointment.findMany({ where: { businessId }, orderBy: { createdAt: "desc" }, take: TAKE }),
    prisma.reservation.findMany({ where: { businessId }, orderBy: { createdAt: "desc" }, take: TAKE }),
    prisma.facilityBooking.findMany({ where: { businessId }, orderBy: { createdAt: "desc" }, take: TAKE }),
    prisma.serviceRequestTarget.findMany({ where: { businessId }, orderBy: { createdAt: "desc" }, take: TAKE, include: { request: { select: { customerName: true, categorySlug: true, notes: true, type: true } } } }),
    prisma.voucher.findMany({ where: { businessId }, orderBy: { createdAt: "desc" }, take: TAKE }),
    prisma.eventBooking.findMany({ where: { businessId }, orderBy: { createdAt: "desc" }, take: TAKE, include: { event: { select: { title: true } } } }),
    prisma.review.findMany({ where: { businessId, status: "APPROVED" }, orderBy: { createdAt: "desc" }, take: TAKE }),
  ]);

  const items: InboxItem[] = [];
  for (const o of orders) items.push({ id: `order-${o.id}`, kind: "ORDER", icon: "🛍️", title: `New order · $${round2(o.subtotal)}`, subtitle: `${o.order?.customerName || "Customer"} · ${o.items.length} item${o.items.length === 1 ? "" : "s"}`, time: o.createdAt.toISOString(), status: o.status, needsAction: o.status === "PENDING", tab: "Orders" });
  for (const a of appts) items.push({ id: `appt-${a.id}`, kind: "APPOINTMENT", icon: "📅", title: `Appointment · ${a.serviceName || "Booking"}`, subtitle: `${a.customerName} · ${a.date} ${a.time}`, time: a.createdAt.toISOString(), status: a.status, needsAction: a.status === "PENDING", tab: "Bookings" });
  for (const r of reservations) items.push({ id: `resv-${r.id}`, kind: "RESERVATION", icon: "🍽️", title: `Table reservation · ${r.partySize} ppl`, subtitle: `${r.name} · ${r.date} ${r.time}`, time: r.createdAt.toISOString(), status: r.status, needsAction: r.status === "PENDING", tab: "Reservations" });
  for (const f of facility) items.push({ id: `fac-${f.id}`, kind: "FACILITY", icon: "🎯", title: `Field booking · ${f.facilityName || "Court"}`, subtitle: `${f.customerName} · ${f.date} ${f.startTime}`, time: f.createdAt.toISOString(), status: f.status, needsAction: f.status === "PENDING", tab: "Field Bookings" });
  for (const q of quotes) items.push({ id: `quote-${q.id}`, kind: "QUOTE", icon: "🔧", title: "Quote request", subtitle: `${q.request?.customerName || "Customer"}${q.request?.notes ? ` · ${excerpt(q.request.notes)}` : q.request?.categorySlug ? ` · ${q.request.categorySlug}` : ""}`, time: q.createdAt.toISOString(), status: q.status, needsAction: q.status === "NEW" || q.status === "VIEWED", tab: "Requests" });
  for (const v of vouchers) items.push({ id: `gc-${v.id}`, kind: "GIFTCARD", icon: "🎁", title: `Gift card sold · $${round2(v.price)}`, subtitle: `${v.purchaserName || v.recipientName || "Customer"}`, time: v.createdAt.toISOString(), status: v.status, needsAction: false, tab: "Gift Vouchers" });
  for (const e of events) items.push({ id: `evt-${e.id}`, kind: "EVENT", icon: "🎟️", title: `Event registration ×${e.quantity}`, subtitle: `${e.customerName || "Guest"}${e.event?.title ? ` · ${excerpt(e.event.title, 40)}` : ""}`, time: e.createdAt.toISOString(), status: e.status, needsAction: false, tab: "Events" });
  for (const rv of reviews) items.push({ id: `rev-${rv.id}`, kind: "REVIEW", icon: "⭐", title: `New review · ${rv.rating}★`, subtitle: rv.comment ? excerpt(rv.comment) : rv.authorName, time: rv.createdAt.toISOString(), status: rv.reply ? "REPLIED" : "NEW", needsAction: !rv.reply, tab: "Reviews" });

  items.sort((a, b) => b.time.localeCompare(a.time));
  return items;
}
