import Anthropic from "@anthropic-ai/sdk";
import { businessMetrics, platformMetrics, resolveRange } from "./analytics";
import { availableSlots, bookAppointment, findBookableBusinesses } from "./bookingService";
import { estimateDelivery, getDeliverySettings } from "./delivery";
import { prisma } from "../db";
import { isOpenNow, parseArr, type HoursRow } from "./serialize";

// ---------------------------------------------------------------------------
// Aley AI — a database-grounded assistant. Uses Claude with tool use so every
// answer is based on the platform's live data (businesses, events, offers,
// community projects, notices, analytics) rather than generic model knowledge.
// Three contexts: "public" (visitors), "owner" (a business dashboard),
// "admin" (platform co-pilot). Falls back to keyword search with no API key.
// ---------------------------------------------------------------------------

const API_KEY = process.env.ANTHROPIC_API_KEY || "";
export const aiEnabled = () => API_KEY.length > 0;
const MODEL = process.env.AI_MODEL || "claude-opus-4-8";
const EFFORT = process.env.AI_EFFORT || "medium";
const client = API_KEY ? new Anthropic({ apiKey: API_KEY }) : null;

export type AiContext = "public" | "owner" | "admin";
export interface ChatMsg { role: "user" | "assistant"; content: string }
export interface ChatCtx { businessId?: number; userId?: number; userName?: string }

const CITY = "aley";
const round2 = (n: number) => Math.round(n * 100) / 100;
const today = () => new Date().toLocaleDateString("en-US", { weekday: "long", year: "numeric", month: "long", day: "numeric" });

// ---- Tool: business search (shared by public + admin) ----
async function searchBusinesses(a: Record<string, unknown>) {
  const where: Record<string, unknown> = { isPublished: true, city: { is: { slug: CITY } } };
  if (a.category) where.category = { is: { slug: String(a.category) } };
  else if (a.group) where.category = { is: { group: String(a.group) } };
  if (a.hasDelivery) where.hasDelivery = true;
  if (a.hasReservations) where.hasReservations = true;
  if (a.minRating) where.rating = { gte: Number(a.minRating) };
  if (a.priceMax) where.priceRange = { lte: Number(a.priceMax) };
  if (a.query) {
    const c = { contains: String(a.query), mode: "insensitive" as const };
    where.OR = [{ name: c }, { tagline: c }, { description: c }, { tags: c }, { products: c }, { category: { is: { name: c } } }];
  }
  const sort = String(a.sort ?? "");
  const orderBy = sort === "reviews" ? [{ reviewCount: "desc" as const }]
    : sort === "rating" ? [{ rating: "desc" as const }]
    : sort === "newest" ? [{ createdAt: "desc" as const }]
    : [{ isFeatured: "desc" as const }, { rating: "desc" as const }, { reviewCount: "desc" as const }];
  let rows = await prisma.business.findMany({ where, orderBy, take: 40, include: { category: true } });
  let list = rows.map((b) => ({
    name: b.name, slug: b.slug, category: b.category.name, group: b.category.group,
    rating: b.rating, reviewCount: b.reviewCount, priceRange: "$".repeat(b.priceRange),
    openNow: isOpenNow(parseArr(b.hours) as HoursRow[]),
    phone: b.phone, whatsapp: b.whatsapp, website: b.website, address: b.address,
    hasDelivery: b.hasDelivery, hasReservations: b.hasReservations,
    tags: (parseArr(b.tags) as string[]).slice(0, 6),
  }));
  if (a.openNow) list = list.filter((b) => b.openNow);
  return { count: list.length, results: list.slice(0, Number(a.limit) || 8) };
}

async function getBusiness(slug: string) {
  const b = await prisma.business.findUnique({
    where: { slug },
    include: { category: true, reviews: { where: { status: "APPROVED" }, orderBy: { createdAt: "desc" }, take: 4 }, offers: { where: { isActive: true } }, events: { where: { isPublished: true, startTime: { gte: new Date() } }, orderBy: { startTime: "asc" } } },
  });
  if (!b) return { error: "Not found" };
  return {
    name: b.name, slug: b.slug, category: b.category.name, description: b.description, tagline: b.tagline,
    rating: b.rating, reviewCount: b.reviewCount, priceRange: "$".repeat(b.priceRange), openNow: isOpenNow(parseArr(b.hours) as HoursRow[]),
    phone: b.phone, whatsapp: b.whatsapp, website: b.website, instagram: b.instagram, address: b.address,
    hasDelivery: b.hasDelivery, hasReservations: b.hasReservations,
    tags: parseArr(b.tags) as string[], hours: parseArr(b.hours),
    products: (parseArr(b.products) as { title: string; items: { name: string; price?: number }[] }[]).slice(0, 6),
    offers: b.offers.map((o) => ({ title: o.title, description: o.description })),
    events: b.events.map((e) => ({ title: e.title, when: e.startTime })),
    recentReviews: b.reviews.map((r) => ({ rating: r.rating, comment: r.comment })),
  };
}

async function listEvents() {
  const events = await prisma.event.findMany({ where: { isPublished: true, startTime: { gte: new Date(Date.now() - 86400000) }, city: { is: { slug: CITY } } }, orderBy: { startTime: "asc" }, take: 15, include: { business: { select: { name: true, slug: true } } } });
  return events.map((e) => ({ title: e.title, category: e.category, when: e.startTime, location: e.location, business: e.business?.name }));
}
async function listOffers() {
  const offers = await prisma.offer.findMany({ where: { isActive: true, city: { is: { slug: CITY } } }, orderBy: { createdAt: "desc" }, take: 15, include: { business: { select: { name: true, slug: true } } } });
  return offers.map((o) => ({ title: o.title, description: o.description, type: o.type, business: o.business?.name, slug: o.business?.slug }));
}
async function listAnnouncements() {
  const items = await prisma.announcement.findMany({ where: { isPublished: true, OR: [{ expiresAt: null }, { expiresAt: { gt: new Date() } }], city: { is: { slug: CITY } } }, orderBy: [{ isPinned: "desc" }, { publishedAt: "desc" }], take: 12 });
  return items.map((a) => ({ title: a.title, category: a.category, body: a.body.slice(0, 240), pinned: a.isPinned }));
}
async function deliveryEstimate(a: Record<string, unknown>) {
  const s = await getDeliverySettings();
  const est = estimateDelivery({ type: String(a.type ?? "ALEY_TO_ALEY"), packageSize: String(a.packageSize ?? "MEDIUM"), urgency: String(a.urgency ?? "STANDARD") }, s);
  const params = new URLSearchParams();
  if (a.pickup) params.set("pickup", String(a.pickup));
  if (a.type) params.set("type", String(a.type));
  return { estimateMin: est.min, estimateMax: est.max, distanceKm: est.distanceKm, link: `/delivery?${params}`, note: "Final price confirmed by the delivery team." };
}

// ---- Tool schemas per context ----
const SEARCH_TOOL = {
  name: "search_businesses",
  description: "Search Aley businesses. Use for any request to find/recommend places, shops, services, restaurants, professionals. Returns ranked results with rating, open-now status, price, contact, delivery/reservation flags and tags.",
  input_schema: {
    type: "object" as const,
    properties: {
      query: { type: "string", description: "Free-text: what the user wants (e.g. 'quiet coffee', 'car battery', 'plumber', 'romantic restaurant'). Matches name, description, tags, menu items, category." },
      category: { type: "string", description: "Optional category slug to filter (e.g. 'coffee-shops', 'mechanics', 'pharmacies')." },
      group: { type: "string", description: "Optional top-level group (e.g. 'Food & Drinks', 'Automotive', 'Health & Beauty')." },
      openNow: { type: "boolean", description: "Only businesses open right now." },
      minRating: { type: "number", description: "Minimum rating, e.g. 4.5." },
      priceMax: { type: "integer", description: "Max price level 1-4 (1=cheapest)." },
      hasDelivery: { type: "boolean" },
      hasReservations: { type: "boolean" },
      sort: { type: "string", enum: ["recommended", "rating", "reviews", "newest"] },
      limit: { type: "integer", description: "Max results (default 8)." },
    },
  },
};
const GET_BUSINESS_TOOL = { name: "get_business", description: "Get full details for one business by its slug (hours, menu/products, offers, events, recent reviews, contact).", input_schema: { type: "object" as const, properties: { slug: { type: "string" } }, required: ["slug"] } };
const SIMPLE = (name: string, description: string) => ({ name, description, input_schema: { type: "object" as const, properties: {} } });
const DELIVERY_TOOL = {
  name: "delivery_estimate",
  description: "Estimate a courier delivery price and produce a prefilled delivery-request link. Use when the user wants something picked up/delivered.",
  input_schema: { type: "object" as const, properties: {
    type: { type: "string", enum: ["ALEY_TO_ALEY", "OUTSIDE_TO_ALEY", "ALEY_TO_OUTSIDE", "CUSTOM"] },
    packageSize: { type: "string", enum: ["SMALL", "MEDIUM", "LARGE"] },
    urgency: { type: "string", enum: ["STANDARD", "EXPRESS"] },
    pickup: { type: "string", description: "Pickup place/address text, for the prefilled link." },
  } },
};
// ---- Booking tools (public) ----
const FIND_BOOKABLE_TOOL = {
  name: "find_bookable_businesses",
  description: "Find businesses in Aley that accept appointment bookings (salons, barbers, clinics, dentists, mechanics, tutors, etc.) matching a query or category. Returns each business's slug and its bookable services (id, name, duration, price). Use this first when the user wants to book/make an appointment.",
  input_schema: { type: "object" as const, properties: {
    query: { type: "string", description: "What the user wants, e.g. 'haircut', 'dentist', 'oil change'." },
    category: { type: "string", description: "Optional category slug, e.g. 'barbers', 'dentists'." },
  } },
};
const AVAILABILITY_TOOL = {
  name: "get_appointment_availability",
  description: "List available appointment start times for a business on a specific date. Provide businessSlug and date (YYYY-MM-DD). Optionally serviceId (from find_bookable_businesses) for correct duration, and staffId. Always resolve relative dates like 'tomorrow' to an absolute YYYY-MM-DD using today's date before calling.",
  input_schema: { type: "object" as const, properties: {
    businessSlug: { type: "string" },
    date: { type: "string", description: "YYYY-MM-DD" },
    serviceId: { type: "integer" },
    staffId: { type: "integer" },
  }, required: ["businessSlug", "date"] },
};
const CREATE_APPOINTMENT_TOOL = {
  name: "create_appointment",
  description: "Book an appointment. ONLY call after you have (1) confirmed an exact date and time that appeared in get_appointment_availability, and (2) collected the customer's name and phone number. The booking is created as a pending request the business confirms. Returns a check-in code on success.",
  input_schema: { type: "object" as const, properties: {
    businessSlug: { type: "string" },
    date: { type: "string", description: "YYYY-MM-DD" },
    time: { type: "string", description: "HH:MM, must be one of the available slots" },
    serviceId: { type: "integer" },
    staffId: { type: "integer" },
    customerName: { type: "string" },
    customerPhone: { type: "string" },
    note: { type: "string" },
  }, required: ["businessSlug", "date", "time", "customerName", "customerPhone"] },
};

const PERIOD_PROP = { period: { type: "string", enum: ["today", "yesterday", "7d", "30d", "90d", "year"], description: "Time range (default 30d)." } };
const OWNER_ANALYTICS_TOOL = { name: "get_business_analytics", description: "Get this business's analytics: views, search appearances, CTR, calls/WhatsApp/directions/website clicks, favorites, bookings, orders, revenue, reviews, with period-over-period deltas and insights.", input_schema: { type: "object" as const, properties: PERIOD_PROP } };
const OWNER_PROFILE_TOOL = { name: "get_business_profile", description: "Get this business's current profile: description, tags, products, hours, rating, and recent reviews. Use before writing copy or analyzing reviews.", input_schema: { type: "object" as const, properties: {} } };
const ADMIN_ANALYTICS_TOOL = { name: "get_platform_analytics", description: "Platform-wide analytics + leaderboards (most viewed/contacted/booked/ordered, highest rated, fastest growing) and totals.", input_schema: { type: "object" as const, properties: PERIOD_PROP } };

function toolsFor(ctx: AiContext) {
  if (ctx === "owner") return [OWNER_ANALYTICS_TOOL, OWNER_PROFILE_TOOL];
  if (ctx === "admin") return [ADMIN_ANALYTICS_TOOL, SEARCH_TOOL, GET_BUSINESS_TOOL];
  return [SEARCH_TOOL, GET_BUSINESS_TOOL,
    SIMPLE("list_events", "List upcoming events in Aley."),
    SIMPLE("list_offers", "List current offers/deals in Aley."),
    SIMPLE("list_announcements", "List official public notices (municipality, utilities, road works, emergencies, weather, health)."),
    DELIVERY_TOOL, FIND_BOOKABLE_TOOL, AVAILABILITY_TOOL, CREATE_APPOINTMENT_TOOL];
}

async function executeTool(name: string, input: Record<string, unknown>, ctx: AiContext, c: ChatCtx) {
  switch (name) {
    case "search_businesses": return searchBusinesses(input);
    case "get_business": return getBusiness(String(input.slug));
    case "list_events": return listEvents();
    case "list_offers": return listOffers();
    case "list_announcements": return listAnnouncements();
    case "delivery_estimate": return deliveryEstimate(input);
    case "find_bookable_businesses": return findBookableBusinesses(input.query ? String(input.query) : undefined, input.category ? String(input.category) : undefined);
    case "get_appointment_availability": return availableSlots(String(input.businessSlug), String(input.date), input.serviceId ? Number(input.serviceId) : null, input.staffId ? Number(input.staffId) : null);
    case "create_appointment": return bookAppointment({
      slug: String(input.businessSlug), date: String(input.date), time: String(input.time),
      serviceId: input.serviceId ? Number(input.serviceId) : null, staffId: input.staffId ? Number(input.staffId) : null,
      customerName: String(input.customerName ?? c.userName ?? ""), customerPhone: String(input.customerPhone ?? ""),
      note: input.note ? String(input.note) : undefined, userId: c.userId ?? null,
    });
    case "get_business_profile": return c.businessId ? getBusinessProfileById(c.businessId) : { error: "no business" };
    case "get_business_analytics": {
      if (!c.businessId) return { error: "no business" };
      const m = await businessMetrics(c.businessId, resolveRange(String(input.period ?? "30d")));
      return m ? { business: m.business, cards: m.cards, insights: m.insights } : { error: "not found" };
    }
    case "get_platform_analytics": {
      const p = await platformMetrics(resolveRange(String(input.period ?? "30d")));
      return { totals: p.totals, leaderboards: Object.fromEntries(Object.entries(p.leaderboards).map(([k, v]) => [k, (v as { name: string }[]).slice(0, 5)])) };
    }
    default: return { error: `unknown tool ${name}` };
  }
}

async function getBusinessProfileById(id: number) {
  const b = await prisma.business.findUnique({ where: { id }, include: { category: true, reviews: { where: { status: "APPROVED" }, orderBy: { createdAt: "desc" }, take: 12 } } });
  if (!b) return { error: "not found" };
  return {
    name: b.name, category: b.category.name, description: b.description, tagline: b.tagline,
    tags: parseArr(b.tags) as string[], products: parseArr(b.products), rating: b.rating, reviewCount: b.reviewCount,
    reviews: b.reviews.map((r) => ({ rating: r.rating, comment: r.comment })),
  };
}

function systemPrompt(ctx: AiContext, c: ChatCtx & { businessName?: string }) {
  const base = `You are Aley AI, the assistant for the Aley city platform (Aley, Mount Lebanon). Today is ${today()}.
RULES:
- Ground every answer in tool results. Never invent businesses, prices, hours, events or stats. If tools return nothing, say so and suggest alternatives.
- Be warm, concise and practical. Prefer short answers with a few strong recommendations over long lists.
- Link to platform pages with markdown: businesses as [Name](/business/slug), and use /explore, /events, /offers, /projects, /notices, /delivery, /map where relevant. Use real slugs from tool results only.`;
  if (ctx === "owner") return `${base}
You are helping a business OWNER manage "${c.businessName ?? "their business"}" on Aley.
- For performance questions, call get_business_analytics and cite real numbers and deltas.
- For copy (descriptions, promotions, social posts) call get_business_profile first to match their real services, then write ready-to-use text.
- When asked "why are views down" etc., look at the analytics deltas and give concrete, actionable advice.`;
  if (ctx === "admin") return `${base}
You are the ADMIN co-pilot for the whole platform.
- Use get_platform_analytics for activity summaries, trends, leaderboards and businesses needing attention.
- Use search_businesses/get_business to inspect specific businesses.
- Be data-driven and concise; surface concrete recommendations (who to feature, what's underperforming, anomalies).`;
  return `${base}
You help VISITORS discover Aley: find and compare businesses/services, recommend places, surface offers and events, explain the town, and guide community/delivery/booking actions.
- To recommend, call search_businesses (and get_business for detail). Rank by relevance, rating, number of reviews and whether it's open now; explain your pick in one line.
- For "what's happening" use list_events; for deals list_offers; "road closures/announcements" list_announcements.
- For delivery ("deliver X from A to B", "pick up a package") gather what/where, call delivery_estimate, give the price range, and share the prefilled [Request delivery](/delivery?...) link.
- For booking an APPOINTMENT ("book me a haircut tomorrow after 5", "make a dentist appointment"):
  1. find_bookable_businesses to find the place + its services (note the serviceId).
  2. Resolve relative dates to YYYY-MM-DD (today is ${today()}), then get_appointment_availability for that business/date/service. If the user said "after 5", offer only matching slots.
  3. Propose specific options. Once the user picks a time, make sure you have their name and phone${c.userName ? ` (their name is ${c.userName} — still confirm the phone)` : ""}, then call create_appointment.
  4. Only call create_appointment with a time returned by availability. After booking, confirm the date/time and give the check-in code, and mention they can manage it under [My appointments](/bookings).
- For booking a restaurant TABLE, point to the business page (the Book a table button).`;
}

/** Run the grounded assistant. Returns the reply text. */
export async function runChat(ctx: AiContext, history: ChatMsg[], c: ChatCtx = {}): Promise<{ reply: string; grounded: boolean }> {
  if (!client) return { reply: await keywordFallback(ctx, history), grounded: false };

  let businessName: string | undefined;
  if (ctx === "owner" && c.businessId) businessName = (await prisma.business.findUnique({ where: { id: c.businessId } }))?.name;

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const messages: any[] = history.slice(-12).map((m) => ({ role: m.role, content: m.content }));
  const tools = toolsFor(ctx);
  const system = systemPrompt(ctx, { ...c, businessName });

  for (let i = 0; i < 6; i++) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const res: any = await client.messages.create({
      model: MODEL, max_tokens: 6000,
      system,
      thinking: { type: "adaptive" },
      output_config: { effort: EFFORT },
      tools,
      messages,
    } as Anthropic.MessageCreateParams);

    if (res.stop_reason !== "tool_use") {
      const text = res.content.filter((b: { type: string }) => b.type === "text").map((b: { text: string }) => b.text).join("\n").trim();
      return { reply: text || "Sorry, I couldn't find an answer for that.", grounded: true };
    }
    messages.push({ role: "assistant", content: res.content });
    const results = [];
    for (const block of res.content) {
      if (block.type === "tool_use") {
        let out;
        try { out = await executeTool(block.name, block.input ?? {}, ctx, c); }
        catch (e) { out = { error: e instanceof Error ? e.message : "tool failed" }; }
        results.push({ type: "tool_result", tool_use_id: block.id, content: JSON.stringify(out).slice(0, 12000) });
      }
    }
    messages.push({ role: "user", content: results });
  }
  return { reply: "I'm having trouble completing that — please try rephrasing.", grounded: true };
}

// ---- Keyword fallback (no API key) ----
async function keywordFallback(ctx: AiContext, history: ChatMsg[]): Promise<string> {
  const q = [...history].reverse().find((m) => m.role === "user")?.content?.trim() ?? "";
  if (ctx !== "public") return "The AI assistant isn't configured yet. Add an ANTHROPIC_API_KEY in the server's .env to enable it. Meanwhile, use the dashboard's analytics tabs for your numbers.";
  if (!q) return "Hi! I'm Aley AI. Ask me to find a business, service or place — e.g. \"a quiet coffee shop\" or \"a plumber open now\".";
  // Basic keyword matching: try the whole phrase, then the most distinctive words.
  const STOP = new Set(["the", "and", "for", "with", "near", "open", "now", "find", "show", "need", "want", "best", "good", "some", "any", "place", "places", "that", "this", "have", "where", "can", "get", "looking", "a", "an", "to", "in", "me", "my", "is", "are"]);
  const words = q.toLowerCase().replace(/[^a-z0-9 ]/g, " ").split(/\s+/).filter((w) => w.length > 2 && !STOP.has(w));
  const seen = new Map<string, { name: string; slug: string; category: string; rating: number; reviewCount: number; openNow: boolean }>();
  for (const term of [q, ...words]) {
    const { results } = await searchBusinesses({ query: term, limit: 6 });
    for (const r of results) if (!seen.has(r.slug)) seen.set(r.slug, r);
    if (seen.size >= 6) break;
  }
  const results = [...seen.values()].slice(0, 6);
  if (!results.length) return `I couldn't find anything matching "${q}". Try [browsing Explore](/explore) or rephrasing.`;
  const lines = results.map((b) => `- [${b.name}](/business/${b.slug}) — ${b.category}${b.rating ? ` · ${b.rating}★ (${b.reviewCount})` : ""}${b.openNow ? " · open now" : ""}`);
  return `Here's what I found for "${q}":\n\n${lines.join("\n")}\n\n_(Tip: add an Anthropic API key to enable full conversational AI.)_`;
}
