import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

const img = (seed: string, w = 800, h = 600) => `https://picsum.photos/seed/${seed}/${w}/${h}`;

// Standard week: open daily with given hours, optional closed day.
const week = (open: string, close: string, closedDay?: number) =>
  Array.from({ length: 7 }, (_, day) => ({ day, open, close, closed: day === closedDay }));

const CATEGORIES = [
  ["coffee-shops", "Coffee Shops", "☕", "#b45309"],
  ["restaurants", "Restaurants", "🍽️", "#dc2626"],
  ["bakeries", "Bakeries", "🥐", "#d97706"],
  ["hotels", "Hotels", "🏨", "#0ea5e9"],
  ["fashion", "Fashion", "👗", "#db2777"],
  ["jewelry", "Jewelry", "💍", "#a855f7"],
  ["beauty", "Beauty", "💅", "#ec4899"],
  ["supermarkets", "Supermarkets", "🛒", "#16a34a"],
  ["electronics", "Electronics", "📱", "#2563eb"],
  ["car-services", "Car Services", "🚗", "#475569"],
  ["mechanics", "Mechanics", "🔧", "#57534e"],
  ["pharmacies", "Pharmacies", "💊", "#059669"],
  ["clinics", "Clinics", "🩺", "#0d9488"],
  ["gyms", "Gyms", "🏋️", "#ea580c"],
  ["schools", "Schools", "🎓", "#7c3aed"],
  ["banks", "Banks", "🏦", "#1d4ed8"],
  ["real-estate", "Real Estate", "🏠", "#0891b2"],
  ["home-services", "Home Services", "🛠️", "#854d0e"],
  ["tourism", "Tourism", "🧭", "#0284c7"],
  ["entertainment", "Entertainment", "🎬", "#9333ea"],
];

async function main() {
  console.log("Seeding Aley Platform…");

  // Reset (dev only) — child tables first so Postgres FK constraints are satisfied.
  await prisma.donation.deleteMany();
  await prisma.expense.deleteMany();
  await prisma.projectUpdate.deleteMany();
  await prisma.projectComment.deleteMany();
  await prisma.projectVote.deleteMany();
  await prisma.projectFollow.deleteMany();
  await prisma.project.deleteMany();
  await prisma.favorite.deleteMany();
  await prisma.review.deleteMany();
  await prisma.offer.deleteMany();
  await prisma.event.deleteMany();
  await prisma.business.deleteMany();
  await prisma.category.deleteMany();
  await prisma.owner.deleteMany();
  await prisma.city.deleteMany();

  const aley = await prisma.city.create({
    data: { slug: "aley", name: "Aley", nameAr: "عاليه", tagline: "The pearl of the Lebanese mountains", lat: 33.8056, lng: 35.6011, sortOrder: 1 },
  });
  // Seed a couple of inactive cities to prove multi-city scalability.
  await prisma.city.createMany({
    data: [
      { slug: "beirut", name: "Beirut", nameAr: "بيروت", tagline: "The capital", lat: 33.8938, lng: 35.5018, isActive: false, sortOrder: 2 },
      { slug: "byblos", name: "Byblos", nameAr: "جبيل", tagline: "The oldest city", lat: 34.1232, lng: 35.6519, isActive: false, sortOrder: 3 },
    ],
  });

  const cat: Record<string, number> = {};
  for (let i = 0; i < CATEGORIES.length; i++) {
    const [slug, name, icon, color] = CATEGORIES[i];
    const c = await prisma.category.create({ data: { slug, name, icon, color, sortOrder: i } });
    cat[slug] = c.id;
  }

  type Seed = {
    slug: string; name: string; category: string; tagline: string; description: string;
    price: number; delivery?: boolean; reservations?: boolean; featured?: boolean; verified?: boolean;
    lat: number; lng: number; address: string; phone: string; whatsapp: string; instagram?: string;
    tags: string[]; hours: ReturnType<typeof week>; faqs?: { q: string; a: string }[];
    reviews: { name: string; rating: number; comment: string }[];
  };

  const businesses: Seed[] = [
    {
      slug: "bean-avenue", name: "Bean Avenue", category: "coffee-shops", featured: true, verified: true,
      tagline: "Specialty coffee & cozy corners", price: 2, delivery: true, reservations: true,
      description: "A specialty coffee house in the heart of Aley serving single-origin espresso, fresh pastries, and brunch all day. Study rooms and a warm community vibe.",
      lat: 33.8061, lng: 35.6019, address: "Main Street, Aley", phone: "+961 5 555 100", whatsapp: "+961 70 555 100", instagram: "beanavenue",
      tags: ["espresso", "brunch", "study rooms", "pastries", "wifi"], hours: week("07:30", "23:00"),
      faqs: [{ q: "Do you have wifi?", a: "Yes — free fast wifi and plenty of plugs." }, { q: "Can I book a study room?", a: "Absolutely, book online or call us." }],
      reviews: [
        { name: "Rami K.", rating: 5, comment: "Best flat white in the mountains. Lovely staff." },
        { name: "Lara H.", rating: 5, comment: "Perfect spot to work. Great pastries too." },
        { name: "Sami D.", rating: 4, comment: "Cozy and quiet. Coffee is excellent." },
      ],
    },
    {
      slug: "cedar-bites", name: "Cedar Bites", category: "restaurants", featured: true, verified: true,
      tagline: "Authentic Lebanese mezze & grills", price: 3, delivery: true, reservations: true,
      description: "Family-run restaurant serving authentic Lebanese mezze, charcoal grills, and mountain views from the terrace.",
      lat: 33.8049, lng: 35.5998, address: "Bhamdoun Road, Aley", phone: "+961 5 555 200", whatsapp: "+961 70 555 200", instagram: "cedarbites",
      tags: ["mezze", "grill", "terrace", "family", "arak"], hours: week("12:00", "23:30"),
      reviews: [
        { name: "Nadia F.", rating: 5, comment: "The tabbouleh and mixed grill were outstanding." },
        { name: "George A.", rating: 4, comment: "Great view, generous portions." },
      ],
    },
    {
      slug: "golden-crust", name: "Golden Crust Bakery", category: "bakeries", verified: true,
      tagline: "Fresh manakish & pastries daily", price: 1, delivery: true,
      description: "Wood-oven manakish, kaak, and French pastries baked fresh every morning.",
      lat: 33.8072, lng: 35.6033, address: "Souk Street, Aley", phone: "+961 5 555 300", whatsapp: "+961 70 555 300",
      tags: ["manakish", "zaatar", "croissant", "kaak"], hours: week("06:00", "20:00"),
      reviews: [{ name: "Maya S.", rating: 5, comment: "Best zaatar manakish in Aley, hands down." }],
    },
    {
      slug: "aley-grand-hotel", name: "Aley Grand Hotel", category: "hotels", featured: true, verified: true,
      tagline: "Mountain luxury & panoramic views", price: 4, reservations: true,
      description: "A 4-star retreat with panoramic mountain views, spa, rooftop pool, and fine dining.",
      lat: 33.8088, lng: 35.5975, address: "Hilltop Avenue, Aley", phone: "+961 5 555 400", whatsapp: "+961 70 555 400", instagram: "aleygrand",
      tags: ["spa", "pool", "events", "fine dining", "parking"], hours: week("00:00", "23:59"),
      reviews: [
        { name: "Tony R.", rating: 5, comment: "Stunning views and impeccable service." },
        { name: "Carine M.", rating: 4, comment: "Beautiful pool, lovely staff." },
      ],
    },
    {
      slug: "maison-aley", name: "Maison Aley", category: "fashion", verified: true,
      tagline: "Curated fashion & local designers", price: 3, reservations: false,
      description: "Boutique featuring Lebanese designers, seasonal collections, and personal styling.",
      lat: 33.8055, lng: 35.6042, address: "Boulevard, Aley", phone: "+961 5 555 500", whatsapp: "+961 70 555 500", instagram: "maisonaley",
      tags: ["boutique", "designers", "styling", "accessories"], hours: week("10:00", "20:00", 0),
      reviews: [{ name: "Yara B.", rating: 5, comment: "Unique pieces and amazing styling advice." }],
    },
    {
      slug: "sparkle-jewelry", name: "Sparkle Jewelry", category: "jewelry", verified: true,
      tagline: "Fine gold & custom designs", price: 4,
      description: "Family jeweler since 1980 — fine gold, diamonds, and custom design service.",
      lat: 33.8067, lng: 35.6008, address: "Gold Souk, Aley", phone: "+961 5 555 600", whatsapp: "+961 70 555 600",
      tags: ["gold", "diamonds", "custom", "watches"], hours: week("10:00", "19:00", 0),
      reviews: [{ name: "Joseph N.", rating: 5, comment: "Beautiful custom ring, exactly what we wanted." }],
    },
    {
      slug: "aley-pharmacy", name: "Aley Central Pharmacy", category: "pharmacies", verified: true,
      tagline: "Open late · delivery available", price: 2, delivery: true,
      description: "Full-service pharmacy with prescription delivery, health consultations, and cosmetics.",
      lat: 33.8043, lng: 35.6027, address: "Main Street, Aley", phone: "+961 5 555 700", whatsapp: "+961 70 555 700",
      tags: ["prescriptions", "delivery", "cosmetics", "consultation"], hours: week("08:00", "00:00"),
      reviews: [{ name: "Hala Z.", rating: 4, comment: "Fast delivery and helpful pharmacists." }],
    },
    {
      slug: "fitzone-gym", name: "FitZone Gym", category: "gyms", featured: true,
      tagline: "Train hard · classes & coaching", price: 2, reservations: true,
      description: "Modern gym with free weights, classes, personal training, and a recovery zone.",
      lat: 33.8079, lng: 35.6051, address: "Sports Complex, Aley", phone: "+961 5 555 800", whatsapp: "+961 70 555 800", instagram: "fitzoneAley",
      tags: ["weights", "classes", "personal training", "crossfit"], hours: week("06:00", "23:00"),
      reviews: [
        { name: "Karim T.", rating: 5, comment: "Great equipment and motivating coaches." },
        { name: "Dina P.", rating: 4, comment: "Clean, spacious, good classes." },
      ],
    },
  ];

  for (const b of businesses) {
    const created = await prisma.business.create({
      data: {
        slug: b.slug, cityId: aley.id, categoryId: cat[b.category], name: b.name, tagline: b.tagline, description: b.description,
        logo: img(`${b.slug}-logo`, 200, 200), cover: img(`${b.slug}-cover`, 1200, 600),
        gallery: JSON.stringify([img(`${b.slug}-1`), img(`${b.slug}-2`), img(`${b.slug}-3`), img(`${b.slug}-4`)]),
        phone: b.phone, whatsapp: b.whatsapp, instagram: b.instagram ?? "", facebook: "", website: "",
        address: b.address, lat: b.lat, lng: b.lng, hours: JSON.stringify(b.hours),
        priceRange: b.price, hasDelivery: !!b.delivery, hasReservations: !!b.reservations,
        tags: JSON.stringify(b.tags), faqs: JSON.stringify(b.faqs ?? []),
        isFeatured: !!b.featured, isVerified: !!b.verified, isPublished: true,
      },
    });
    for (const r of b.reviews) {
      await prisma.review.create({ data: { businessId: created.id, authorName: r.name, rating: r.rating, comment: r.comment, status: "APPROVED" } });
    }
    const avg = b.reviews.reduce((s, r) => s + r.rating, 0) / b.reviews.length;
    await prisma.business.update({ where: { id: created.id }, data: { rating: Math.round(avg * 10) / 10, reviewCount: b.reviews.length } });
  }

  const byId = async (slug: string) => (await prisma.business.findUnique({ where: { slug } }))!;
  const bean = await byId("bean-avenue");
  const cedar = await byId("cedar-bites");
  const hotel = await byId("aley-grand-hotel");
  const gym = await byId("fitzone-gym");
  const day = (d: number, h = 19) => new Date(Date.now() + d * 86400000 + h * 3600000);

  await prisma.event.createMany({
    data: [
      { cityId: aley.id, businessId: bean.id, title: "Live Acoustic Night", category: "Live Music", description: "An evening of acoustic Lebanese & international covers.", image: img("event-music", 1000, 600), location: "Bean Avenue", startTime: day(3) },
      { cityId: aley.id, businessId: cedar.id, title: "Champions League Screening", category: "Sports", description: "Watch the big match on the terrace with mezze platters.", image: img("event-sports", 1000, 600), location: "Cedar Bites", startTime: day(5) },
      { cityId: aley.id, businessId: hotel.id, title: "Summer Rooftop Gala", category: "Community", description: "A night of music, food, and mountain views.", image: img("event-gala", 1000, 600), location: "Aley Grand Hotel", startTime: day(10) },
      { cityId: aley.id, businessId: gym.id, title: "Free Open Workout", category: "Community", description: "Free group workout for all levels. Bring a friend!", image: img("event-workout", 1000, 600), location: "FitZone Gym", startTime: day(7, 8) },
    ],
  });

  await prisma.offer.createMany({
    data: [
      { cityId: aley.id, businessId: bean.id, title: "Buy 1 Get 1 Coffee", description: "Every weekday 3–5pm. Any espresso drink.", type: "HAPPY_HOUR", image: img("offer-coffee", 800, 500) },
      { cityId: aley.id, businessId: cedar.id, title: "20% Off Family Platters", description: "Weekends only. Dine-in or delivery.", type: "DISCOUNT", image: img("offer-food", 800, 500) },
      { cityId: aley.id, businessId: (await byId("golden-crust")).id, title: "Free Manakish with every 5", description: "Loyalty deal — your 6th manakish is on us.", type: "BOGO", image: img("offer-bakery", 800, 500) },
      { cityId: aley.id, businessId: gym.id, title: "First Month 50% Off", description: "New members get half off their first month.", type: "SEASONAL", image: img("offer-gym", 800, 500) },
      { cityId: aley.id, businessId: (await byId("maison-aley")).id, title: "End of Season Sale", description: "Up to 40% off selected collections.", type: "SEASONAL", image: img("offer-fashion", 800, 500) },
    ],
  });

  // Demo business owner — owns Bean Avenue (login: owner@aley.com / owner).
  const owner = await prisma.owner.create({
    data: { name: "Aneel Shehayeb", email: "owner@aley.com", phone: "+961 70 555 100", passwordHash: await bcrypt.hash("owner", 10) },
  });
  await prisma.business.update({ where: { slug: "bean-avenue" }, data: { ownerId: owner.id, isClaimed: true } });

  // ---- Community Projects ----
  const tl = (rows: [string, string, boolean][]) => JSON.stringify(rows.map(([label, date, done]) => ({ label, date, done })));
  const days = (n: number) => new Date(Date.now() + n * 86400000);

  const projects = [
    {
      slug: "plant-1000-trees", title: "Plant 1,000 Trees Along the Main Road", type: "Trees", status: "FUNDING", featured: true,
      location: "Main Road, Aley", lat: 33.8059, lng: 35.6015, goal: 8000, manager: "Aley Green Committee",
      description: "A green corridor for Aley: planting 1,000 native trees along the main road to bring shade, cleaner air, and beauty to the town. Funds cover saplings, planting, and one year of care.",
      before: ["before-trees-1", "before-trees-2"], proposed: ["proposed-trees-1", "proposed-trees-2"], progress: [],
      timeline: tl([["Funding goal reached", "", false], ["Saplings purchased", "", false], ["Planting weekend", "", false], ["First-year care", "", false]]),
      donations: [["Rami K.", 200, false], ["Anonymous", 500, true], ["Lara H.", 150, false], ["Municipality Friends", 1000, false], ["Sami D.", 75, false]],
      expenses: [], updates: [["Campaign launched!", "We're thrilled to kick off the greening of Aley. Share with friends!"]],
    },
    {
      slug: "fix-jbeil-street-lighting", title: "Install Street Lighting on the Upper Stairs", type: "Lighting", status: "IN_PROGRESS", featured: true,
      location: "Upper Stairs, Old Aley", lat: 33.807, lng: 35.6, goal: 5000, manager: "Aley Municipality + Volunteers",
      description: "The historic upper stairs are dark and unsafe at night. We're installing 20 solar LED lamps so residents can move safely after sunset.",
      before: ["before-light-1"], proposed: ["proposed-light-1"], progress: ["progress-light-1", "progress-light-2"],
      timeline: tl([["Funding goal reached", "", true], ["Lamps ordered", "", true], ["Installation underway", "", false], ["Completed", "", false]]),
      donations: [["Tony R.", 800, false], ["Anonymous", 1200, true], ["Carine M.", 400, false], ["Joseph N.", 600, false], ["Aley Friends Group", 1500, false], ["Hala Z.", 300, false]],
      expenses: [["20 solar LED lamps", 3200, "BrightLite Co."], ["Installation labor (week 1)", 800, "Local electricians"]],
      updates: [["Lamps have arrived 🚚", "All 20 solar lamps are here and installation has started on the lower section."], ["First 8 lamps installed", "The lower stairs are now lit! Eight more to go."]],
    },
    {
      slug: "restore-town-square-benches", title: "Restore the Town Square Benches", type: "Benches", status: "COMPLETED", featured: false,
      location: "Town Square, Aley", lat: 33.8052, lng: 35.6022, goal: 2500, manager: "Aley Heritage Volunteers", finalCost: 2350,
      description: "The beloved town square benches were broken and rusty. We restored all 12 to their original charm so everyone has a place to sit and gather.",
      before: ["before-bench-1"], proposed: ["proposed-bench-1"], progress: ["progress-bench-1", "progress-bench-2"],
      timeline: tl([["Funding goal reached", "", true], ["Materials purchased", "", true], ["Restoration", "", true], ["Completed", "", true]]),
      report: "All 12 benches were sanded, repaired, repainted, and re-installed. Total cost came in $150 under goal — the remainder was donated to the tree campaign. Thank you to all 9 contributors!",
      donations: [["Maya S.", 500, false], ["Anonymous", 700, true], ["George A.", 350, false], ["Nadia F.", 300, false], ["Karim T.", 600, false]],
      expenses: [["Timber & hardware", 900, "Aley Hardware"], ["Paint & sealant", 450, "ColorMix"], ["Labor", 1000, "Heritage Volunteers"]],
      updates: [["Done! 🎉", "All 12 benches are back in the square. Come enjoy them!"]],
    },
  ];

  for (const p of projects) {
    const project = await prisma.project.create({
      data: {
        slug: p.slug, cityId: aley.id, title: p.title, type: p.type, status: p.status, location: p.location,
        lat: p.lat, lng: p.lng, fundingGoal: p.goal, manager: p.manager, description: p.description,
        isFeatured: p.featured, finalCost: p.finalCost ?? null, completedReport: p.report ?? "",
        beforePhotos: JSON.stringify(p.before.map((s) => img(s, 800, 500))),
        proposedPhotos: JSON.stringify(p.proposed.map((s) => img(s, 800, 500))),
        progressPhotos: JSON.stringify(p.progress.map((s) => img(s, 800, 500))),
        timeline: p.timeline,
      },
    });
    for (const [donorName, amount, anonymous] of p.donations) {
      await prisma.donation.create({ data: { projectId: project.id, donorName: donorName as string, amount: amount as number, anonymous: anonymous as boolean } });
    }
    for (const [label, amount, contractor] of p.expenses) {
      await prisma.expense.create({ data: { projectId: project.id, label: label as string, amount: amount as number, contractor: contractor as string, receipt: img("receipt-" + project.id + "-" + label, 400, 560) } });
    }
    let u = 0;
    for (const [title, body] of p.updates) {
      await prisma.projectUpdate.create({ data: { projectId: project.id, title, body, createdAt: days(-(p.updates.length - u)) } });
      u++;
    }
    // Refresh cached totals.
    const ds = await prisma.donation.findMany({ where: { projectId: project.id } });
    await prisma.project.update({ where: { id: project.id }, data: { amountRaised: ds.reduce((s, d) => s + d.amount, 0), contributorCount: ds.length } });
  }

  console.log("✅ Seed complete: 1 active city, 20 categories, 8 businesses, events & offers, 3 community projects.");
  console.log("   Demo owner login → owner@aley.com / owner (owns Bean Avenue)");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
