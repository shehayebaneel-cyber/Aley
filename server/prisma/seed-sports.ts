/* eslint-disable @typescript-eslint/no-explicit-any */
import { PrismaClient } from "@prisma/client";
import { avatar, CATS, photo } from "./demo";

// Sports & Recreation: new categories + flagship facility-booking demos.
// Idempotent — upserts by slug. Run: npm run seed:sports
const prisma = new PrismaClient();

const hours = (open: string, close: string, closed: number[] = []) =>
  Array.from({ length: 7 }, (_, day) => ({ day, open, close, closed: closed.includes(day) }));
const gal = (slug: string, cat: string, caps: string[]) => caps.map((caption, i) => ({ url: photo(`${slug}-g${i}`, cat, 900, 650), caption }));
const rating = (revs: { rating: number }[]) => Math.round((revs.reduce((s, r) => s + r.rating, 0) / revs.length) * 10) / 10;
const A = { lat: 33.8056, lng: 35.6011 };

type FacilitySeed = { name: string; type: string; hourlyRate: number; capacityNote: string; pricing?: any; image?: string };
type SportsDemo = {
  slug: string; name: string; category: string; tagline: string; description: string; ownerName: string;
  phone: string; whatsapp: string; instagram: string; website?: string; address: string; lat: number; lng: number;
  hours: any[]; tags: string[]; galleryCaps: string[];
  facilities: FacilitySeed[];
  reviews: { authorName: string; rating: number; comment: string }[];
  offers?: { title: string; description: string; type: string }[];
};

const peakWeekend = (base: number) => ({ weekendRate: Math.round(base * 1.15), peakRate: Math.round(base * 1.3), peakStart: "17:00", peakEnd: "23:00", nightRate: 0, nightStart: "22:00", holidayRate: 0, minHours: 1, maxHours: 2, slotIncrementMin: 30 });

const DEMOS: SportsDemo[] = [
  {
    slug: "aley-padel-club", name: "Aley Padel Club", category: "padel",
    tagline: "4 pro courts · book by the hour · live availability",
    description: "Aley Padel Club is the mountains' premier padel destination — four professional glass courts under floodlights, equipment rental, coaching and a lounge café. Book your court online in seconds with instant confirmation.",
    ownerName: "Nadim Aoun", phone: "+961 5 556 010", whatsapp: "+961 70 556 010", instagram: "aleypadelclub",
    website: "https://aleypadel.demo.aley.com", address: "Hilltop Avenue, Aley", lat: A.lat + 0.004, lng: A.lng - 0.003,
    hours: hours("08:00", "23:00"),
    tags: ["padel", "floodlit courts", "equipment rental", "coaching", "café", "parking"],
    galleryCaps: ["Floodlit glass courts", "Match in play", "Pro court surface", "Equipment & rackets", "Players lounge", "Evening under lights"],
    facilities: [
      { name: "Court 1", type: "Padel court", hourlyRate: 24, capacityNote: "Up to 4 players", pricing: peakWeekend(24) },
      { name: "Court 2", type: "Padel court", hourlyRate: 24, capacityNote: "Up to 4 players", pricing: peakWeekend(24) },
      { name: "Court 3 (Panoramic)", type: "Padel court", hourlyRate: 28, capacityNote: "Up to 4 players", pricing: peakWeekend(28) },
      { name: "Court 4 (Indoor)", type: "Padel court", hourlyRate: 30, capacityNote: "Up to 4 players · indoor", pricing: peakWeekend(30) },
    ],
    reviews: [
      { authorName: "Marc K.", rating: 5, comment: "Best courts in the mountains and booking online is so easy. Played under the lights — amazing." },
      { authorName: "Rana H.", rating: 5, comment: "Instant confirmation, courts always ready. The panoramic court is stunning." },
      { authorName: "Ziad A.", rating: 4, comment: "Great surface and lighting. Gets busy at peak — book ahead!" },
      { authorName: "Lea S.", rating: 5, comment: "Love that I can see live availability and just grab a slot. Top club." },
    ],
    offers: [{ title: "Off-Peak Mornings", description: "20% off weekday court bookings before 4 PM.", type: "HAPPY_HOUR" }],
  },
  {
    slug: "aley-football-arena", name: "Aley Football Arena", category: "football-fields",
    tagline: "5-a-side & 7-a-side pitches · book by the hour",
    description: "Aley Football Arena offers floodlit artificial-turf pitches for 5-a-side and 7-a-side games, plus a training pitch. Gather your team, pick a slot, and play — online booking with instant confirmation and no double-bookings.",
    ownerName: "Tony Saliba", phone: "+961 5 556 020", whatsapp: "+961 70 556 020", instagram: "aleyfootballarena",
    address: "Damascus Road, Aley", lat: A.lat - 0.003, lng: A.lng + 0.004, hours: hours("09:00", "23:00"),
    tags: ["football", "5-a-side", "7-a-side", "floodlit", "artificial turf", "changing rooms"],
    galleryCaps: ["Floodlit main pitch", "5-a-side action", "Artificial turf close-up", "Night match", "Team huddle", "Training pitch"],
    facilities: [
      { name: "Field A (7-a-side)", type: "Football field", hourlyRate: 60, capacityNote: "Up to 14 players", pricing: peakWeekend(60) },
      { name: "Field B (5-a-side)", type: "Football field", hourlyRate: 45, capacityNote: "Up to 10 players", pricing: peakWeekend(45) },
      { name: "Training Pitch", type: "Training pitch", hourlyRate: 35, capacityNote: "Drills & small games", pricing: peakWeekend(35) },
    ],
    reviews: [
      { authorName: "Bilal H.", rating: 5, comment: "Perfect turf and lights. We book every week — never a double-booking issue." },
      { authorName: "Karim M.", rating: 5, comment: "Easy to reserve for the whole team. Field A is excellent for 7-a-side." },
      { authorName: "Elie R.", rating: 4, comment: "Great pitches, changing rooms are clean. Peak hours fill fast." },
      { authorName: "Nabil S.", rating: 5, comment: "Online booking is a game changer. Confirmed instantly." },
    ],
    offers: [{ title: "Weekday Team Deal", description: "Book Field A before 5 PM and get a free hour next visit.", type: "SEASONAL" }],
  },
];

async function main() {
  const city = await prisma.city.findUnique({ where: { slug: "aley" } });
  if (!city) throw new Error("City 'aley' not found — run the main seed first.");

  // 1) Upsert Sports & Recreation categories.
  const sportsCats = CATS.filter((c) => c.group === "Sports & Recreation");
  let sortBase = (await prisma.category.count()) + 100;
  for (const c of sportsCats) {
    await prisma.category.upsert({
      where: { slug: c.slug },
      create: { slug: c.slug, name: c.name, group: c.group, icon: c.icon, color: c.color, sortOrder: sortBase++ },
      update: { name: c.name, group: c.group, icon: c.icon, color: c.color },
    });
  }
  const cats = await prisma.category.findMany();
  const catId = new Map(cats.map((c) => [c.slug, c.id]));
  console.log(`Upserted ${sportsCats.length} Sports & Recreation categories.`);

  // 2) Flagship facility demos.
  for (const d of DEMOS) {
    const revs = d.reviews;
    const data: any = {
      cityId: city.id, categoryId: catId.get(d.category)!, name: d.name, tagline: d.tagline, description: d.description,
      logo: avatar(d.name, "16a34a"), cover: photo(`${d.slug}-cover`, d.category, 1200, 600), gallery: JSON.stringify(gal(d.slug, d.category, d.galleryCaps)),
      phone: d.phone, whatsapp: d.whatsapp, instagram: d.instagram, facebook: `https://facebook.com/${d.instagram}`,
      website: d.website ?? "", email: `info@${d.instagram}.demo.aley.com`, address: d.address, lat: d.lat, lng: d.lng,
      hours: JSON.stringify(d.hours), priceRange: 2, tags: JSON.stringify(d.tags), faqs: JSON.stringify([
        { q: "How do I book?", a: "Tap Book Now, pick a court, date, duration and time — your slot is confirmed instantly." },
        { q: "Can I cancel?", a: "Yes, up to 2 hours before your booking from your account." },
      ]),
      products: "[]", productLabel: "Facilities", ownerName: d.ownerName,
      isPublished: true, isFeatured: true, isVerified: true, rating: rating(revs), reviewCount: revs.length, viewCount: 300 + Math.floor(Math.random() * 600),
    };
    const existing = await prisma.business.findUnique({ where: { slug: d.slug } });
    const biz = existing ? await prisma.business.update({ where: { slug: d.slug }, data }) : await prisma.business.create({ data: { slug: d.slug, isClaimed: false, ...data } });

    await prisma.review.deleteMany({ where: { businessId: biz.id } });
    await prisma.facility.deleteMany({ where: { businessId: biz.id } }); // cascades facility bookings
    await prisma.offer.deleteMany({ where: { businessId: biz.id } });

    await prisma.review.createMany({ data: revs.map((r) => ({ businessId: biz.id, authorName: r.authorName, rating: r.rating, comment: r.comment, status: "APPROVED" })) });
    for (let i = 0; i < d.facilities.length; i++) {
      const f = d.facilities[i];
      await prisma.facility.create({ data: {
        businessId: biz.id, name: f.name, type: f.type, description: "", image: photo(`${d.slug}-f${i}`, d.category, 800, 600),
        hourlyRate: f.hourlyRate, capacityNote: f.capacityNote, pricing: JSON.stringify(f.pricing ?? {}), schedule: "{}", isActive: true, sortOrder: i,
      } });
    }
    if (d.offers?.length) await prisma.offer.createMany({ data: d.offers.map((o) => ({ businessId: biz.id, cityId: city.id, title: o.title, description: o.description, type: o.type, image: photo(`${d.slug}-offer`, d.category, 800, 500), isActive: true })) });
    console.log(`  ✓ ${d.name} (${d.category}) — ${d.facilities.length} facilities, ${revs.length} reviews`);
  }
  console.log("✅ Sports demos ready.");
}

main().catch((e) => { console.error(e); process.exit(1); }).finally(() => prisma.$disconnect());
