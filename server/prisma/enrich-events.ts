/* eslint-disable @typescript-eslint/no-explicit-any */
import { PrismaClient } from "@prisma/client";

// One-off backfill so existing events shine in the redesigned platform:
// maps legacy free-text categories → the new taxonomy keys, gives each event
// coordinates near Aley, features a stable subset, and adds ticket tiers to some
// so ticketing is demonstrable. Idempotent-ish (derives from id; skips if tickets exist).
const prisma = new PrismaClient();
const A = { lat: 33.8056, lng: 35.6011 };

const MAP: Record<string, string> = {
  "live music": "live-music", music: "live-music", concert: "concerts", concerts: "concerts",
  promotion: "seasonal", community: "community", sports: "sports", football: "football",
  food: "food-drinks", "food & drinks": "food-drinks", workshop: "workshops", workshops: "workshops",
  "art & culture": "art-culture", family: "family", kids: "kids", nightlife: "nightlife", fitness: "fitness",
};
const KEYS = ["festivals", "live-music", "concerts", "food-drinks", "coffee-events", "sports", "football", "padel", "basketball", "family", "kids", "community", "charity", "business", "workshops", "art-culture", "theatre", "cinema", "nightlife", "car-meets", "fitness", "university", "religious", "seasonal", "holiday-events"];
const mapCat = (c: string) => { const k = c.toLowerCase().trim(); return KEYS.includes(k) ? k : MAP[k] ?? "community"; };

async function main() {
  const events = await prisma.event.findMany({ include: { ticketTypes: true } });
  let updated = 0, featured = 0, ticketed = 0;
  for (const e of events) {
    const data: any = {};
    const cat = mapCat(e.category);
    if (cat !== e.category) data.category = cat;
    if (e.lat == null || e.lng == null) { data.lat = A.lat + ((e.id % 20) - 10) * 0.0012; data.lng = A.lng + ((e.id % 14) - 7) * 0.0012; }
    const feature = e.id % 5 === 0;
    if (feature && !e.isFeatured) { data.isFeatured = true; featured++; }
    if (e.capacity === 0 && e.id % 2 === 0) data.capacity = 50 + (e.id % 6) * 50;
    if (Object.keys(data).length) { await prisma.event.update({ where: { id: e.id }, data }); updated++; }

    // Add ticket tiers to ~1 in 3 events that have none (the rest stay free RSVP).
    if (e.ticketTypes.length === 0 && e.id % 3 === 0) {
      const base = 8 + (e.id % 5) * 4;
      await prisma.eventTicketType.createMany({ data: [
        { eventId: e.id, name: "General Admission", kind: "GENERAL", price: base, quantity: 100, sortOrder: 0 },
        { eventId: e.id, name: "Early Bird", kind: "EARLY_BIRD", price: Math.round(base * 0.7), quantity: 30, sortOrder: 1 },
        { eventId: e.id, name: "VIP", kind: "VIP", price: base * 3, quantity: 20, description: "Front row + welcome drink", sortOrder: 2 },
      ] });
      ticketed++;
    }
  }
  console.log(`✅ Enriched ${updated}/${events.length} events — ${featured} featured, ${ticketed} given ticket tiers.`);
}

main().catch((e) => { console.error(e); process.exit(1); }).finally(() => prisma.$disconnect());
