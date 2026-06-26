import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";
import { DELIVERY_DEFAULTS, estimateDelivery } from "../src/lib/delivery";
import { buildBusinesses, CATEGORIES, document, GROUP_OF, photo, scenery } from "./demo";

const prisma = new PrismaClient();

// Mount-Lebanon scenery for community projects (validated Unsplash photos).
const img = (seed: string, w = 800, h = 600) => scenery(seed, w, h);

async function main() {
  console.log("Seeding Aley Platform… (this generates ~290 businesses)");

  // FK-safe reset (children first) — Postgres enforces foreign keys.
  await prisma.donation.deleteMany();
  await prisma.expense.deleteMany();
  await prisma.projectUpdate.deleteMany();
  await prisma.projectComment.deleteMany();
  await prisma.projectVote.deleteMany();
  await prisma.projectFollow.deleteMany();
  await prisma.project.deleteMany();
  await prisma.favorite.deleteMany();
  await prisma.order.deleteMany(); // cascades BusinessOrder + OrderItem
  await prisma.review.deleteMany();
  await prisma.offer.deleteMany();
  await prisma.event.deleteMany();
  await prisma.lostFoundItem.deleteMany();
  await prisma.announcement.deleteMany();
  await prisma.deliveryRequest.deleteMany();
  await prisma.driver.deleteMany();
  await prisma.analyticsEvent.deleteMany();
  await prisma.business.deleteMany();
  await prisma.category.deleteMany();
  await prisma.owner.deleteMany();
  await prisma.city.deleteMany();
  // Reset editable homepage content so the new Mount-Lebanon images show (admin can re-edit).
  await prisma.setting.deleteMany({ where: { key: "site.content" } });

  const aley = await prisma.city.create({
    data: { slug: "aley", name: "Aley", nameAr: "عاليه", tagline: "The pearl of the Lebanese mountains", lat: 33.8056, lng: 35.6011, sortOrder: 1 },
  });
  await prisma.city.createMany({
    data: [
      { slug: "beirut", name: "Beirut", nameAr: "بيروت", tagline: "The capital", lat: 33.8938, lng: 35.5018, isActive: false, sortOrder: 2 },
      { slug: "byblos", name: "Byblos", nameAr: "جبيل", tagline: "The oldest city", lat: 34.1232, lng: 35.6519, isActive: false, sortOrder: 3 },
    ],
  });

  await prisma.category.createMany({ data: CATEGORIES.map((c, i) => ({ slug: c.slug, name: c.name, group: GROUP_OF[c.slug] ?? "More", icon: c.icon, color: c.color, sortOrder: i })) });
  const cats = await prisma.category.findMany();
  const catId = new Map(cats.map((c) => [c.slug, c.id]));

  // ---- Businesses (bulk) ----
  const businesses = buildBusinesses();
  await prisma.business.createMany({
    data: businesses.map((b) => ({
      slug: b.slug, cityId: aley.id, categoryId: catId.get(b.category)!, name: b.name, tagline: b.tagline, description: b.description,
      logo: b.logo, cover: b.cover, gallery: JSON.stringify(b.gallery),
      phone: b.phone, whatsapp: b.whatsapp, instagram: b.instagram, facebook: b.facebook, website: b.website, email: b.email,
      address: b.address, lat: b.lat, lng: b.lng, hours: JSON.stringify(b.hours),
      priceRange: b.priceRange, hasDelivery: b.hasDelivery, hasReservations: b.hasReservations,
      tags: JSON.stringify(b.tags), faqs: JSON.stringify(b.faqs), products: JSON.stringify(b.products),
      productLabel: b.productLabel, ownerName: b.ownerName, isPublished: true, isFeatured: b.isFeatured, isVerified: b.isVerified,
      rating: b.rating, reviewCount: b.reviewCount, viewCount: Math.floor(Math.random() * 500),
    })),
  });
  const created = await prisma.business.findMany({ select: { id: true, slug: true } });
  const bizId = new Map(created.map((b) => [b.slug, b.id]));

  // ---- Reviews (bulk, all approved so ratings show) ----
  const reviewRows = businesses.flatMap((b) =>
    b.reviews.map((r) => ({ businessId: bizId.get(b.slug)!, authorName: r.authorName, rating: r.rating, comment: r.comment, status: "APPROVED" }))
  );
  for (let i = 0; i < reviewRows.length; i += 500) await prisma.review.createMany({ data: reviewRows.slice(i, i + 500) });

  // ---- Offers + events (bulk) ----
  const offerRows = businesses.filter((b) => b.offer).map((b) => ({ businessId: bizId.get(b.slug)!, cityId: aley.id, title: b.offer!.title, description: b.offer!.description, type: b.offer!.type, image: photo(`${b.slug}-offer`, b.category, 800, 500), isActive: true }));
  await prisma.offer.createMany({ data: offerRows });

  const eventRows = businesses.filter((b) => b.event).map((b) => ({ businessId: bizId.get(b.slug)!, cityId: aley.id, title: b.event!.title, category: b.event!.category, description: b.event!.description, location: b.name, image: photo(`${b.slug}-event`, b.category, 1000, 600), startTime: new Date(Date.now() + b.event!.days * 86400000), isPublished: true }));
  await prisma.event.createMany({ data: eventRows });

  // ---- Demo owner (owns Bean Avenue) ----
  const owner = await prisma.owner.create({ data: { name: "Aneel Shehayeb", email: "owner@aley.com", phone: "+961 70 555 100", passwordHash: await bcrypt.hash("owner", 10) } });
  if (bizId.get("bean-avenue")) await prisma.business.update({ where: { slug: "bean-avenue" }, data: { ownerId: owner.id, isClaimed: true } });

  // ---- Community Projects ----
  const tl = (rows: [string, string, boolean][]) => JSON.stringify(rows.map(([label, date, done]) => ({ label, date, done })));
  const days = (n: number) => new Date(Date.now() + n * 86400000);
  const projects = [
    { slug: "plant-1000-trees", title: "Plant 1,000 Trees Along the Main Road", type: "Trees", status: "FUNDING", featured: true, location: "Main Road, Aley", lat: 33.8059, lng: 35.6015, goal: 8000, manager: "Aley Green Committee",
      description: "A green corridor for Aley: planting 1,000 native trees along the main road to bring shade, cleaner air, and beauty to the town.",
      before: ["before-trees-1", "before-trees-2"], proposed: ["proposed-trees-1", "proposed-trees-2"], progress: [],
      timeline: tl([["Funding goal reached", "", false], ["Saplings purchased", "", false], ["Planting weekend", "", false], ["First-year care", "", false]]),
      donations: [["Rami K.", 200, false], ["Anonymous", 500, true], ["Lara H.", 150, false], ["Municipality Friends", 1000, false], ["Sami D.", 75, false]], expenses: [], updates: [["Campaign launched!", "We're thrilled to kick off the greening of Aley."]] },
    { slug: "fix-jbeil-street-lighting", title: "Install Street Lighting on the Upper Stairs", type: "Lighting", status: "IN_PROGRESS", featured: true, location: "Upper Stairs, Old Aley", lat: 33.807, lng: 35.6, goal: 5000, manager: "Aley Municipality + Volunteers",
      description: "The historic upper stairs are dark and unsafe at night. We're installing 20 solar LED lamps so residents can move safely after sunset.",
      before: ["before-light-1"], proposed: ["proposed-light-1"], progress: ["progress-light-1", "progress-light-2"],
      timeline: tl([["Funding goal reached", "", true], ["Lamps ordered", "", true], ["Installation underway", "", false], ["Completed", "", false]]),
      donations: [["Tony R.", 800, false], ["Anonymous", 1200, true], ["Carine M.", 400, false], ["Joseph N.", 600, false], ["Aley Friends Group", 1500, false], ["Hala Z.", 300, false]],
      expenses: [["20 solar LED lamps", 3200, "BrightLite Co."], ["Installation labor (week 1)", 800, "Local electricians"]], updates: [["Lamps have arrived 🚚", "Installation has started on the lower section."], ["First 8 lamps installed", "The lower stairs are now lit!"]] },
    { slug: "restore-town-square-benches", title: "Restore the Town Square Benches", type: "Benches", status: "COMPLETED", featured: false, location: "Town Square, Aley", lat: 33.8052, lng: 35.6022, goal: 2500, manager: "Aley Heritage Volunteers", finalCost: 2350,
      description: "The beloved town square benches were broken and rusty. We restored all 12 to their original charm.",
      before: ["before-bench-1"], proposed: ["proposed-bench-1"], progress: ["progress-bench-1", "progress-bench-2"],
      timeline: tl([["Funding goal reached", "", true], ["Materials purchased", "", true], ["Restoration", "", true], ["Completed", "", true]]),
      report: "All 12 benches were sanded, repaired, repainted, and re-installed — $150 under goal. Thank you to all contributors!",
      donations: [["Maya S.", 500, false], ["Anonymous", 700, true], ["George A.", 350, false], ["Nadia F.", 300, false], ["Karim T.", 600, false]],
      expenses: [["Timber & hardware", 900, "Aley Hardware"], ["Paint & sealant", 450, "ColorMix"], ["Labor", 1000, "Heritage Volunteers"]], updates: [["Done! 🎉", "All 12 benches are back in the square."]] },
  ];

  for (const p of projects) {
    const project = await prisma.project.create({
      data: {
        slug: p.slug, cityId: aley.id, title: p.title, type: p.type, status: p.status, location: p.location, lat: p.lat, lng: p.lng,
        fundingGoal: p.goal, manager: p.manager, description: p.description, isFeatured: p.featured, finalCost: p.finalCost ?? null, completedReport: p.report ?? "",
        beforePhotos: JSON.stringify(p.before.map((s) => scenery(s, 800, 500))), proposedPhotos: JSON.stringify(p.proposed.map((s) => scenery(s, 800, 500))), progressPhotos: JSON.stringify(p.progress.map((s) => scenery(s, 800, 500))), timeline: p.timeline,
      },
    });
    for (const [donorName, amount, anonymous] of p.donations) await prisma.donation.create({ data: { projectId: project.id, donorName: donorName as string, amount: amount as number, anonymous: anonymous as boolean } });
    for (const [label, amount, contractor] of p.expenses) await prisma.expense.create({ data: { projectId: project.id, label: label as string, amount: amount as number, contractor: contractor as string, receipt: document(`receipt-${project.id}-${label}`, 400, 560) } });
    let u = 0;
    for (const [title, body] of p.updates) { await prisma.projectUpdate.create({ data: { projectId: project.id, title, body, createdAt: days(-(p.updates.length - u)) } }); u++; }
    const ds = await prisma.donation.findMany({ where: { projectId: project.id } });
    await prisma.project.update({ where: { id: project.id }, data: { amountRaised: ds.reduce((s, d) => s + d.amount, 0), contributorCount: ds.length } });
  }

  // ---- Public Notices / Announcements (official) ----
  const announcements = [
    { category: "EMERGENCY", pinned: true, title: "Scheduled water cut — Saturday", body: "The Aley water authority will perform maintenance on the main line this Saturday from 8:00 AM to 4:00 PM. Affected areas: Old Aley, Souk Street, and the Upper Stairs. Please store water in advance.", expires: 6 },
    { category: "ROADS", pinned: true, title: "Road works on Bhamdoun Road", body: "Repaving works are underway on Bhamdoun Road near the municipality. Expect delays between 9:00 AM and 3:00 PM until further notice. Use the Damascus Road as an alternative.", expires: 14 },
    { category: "MUNICIPALITY", pinned: false, title: "Municipality office summer hours", body: "Starting July 1st, the Municipality of Aley will be open from 8:00 AM to 2:00 PM, Monday through Friday. Online services remain available at all times.", expires: 40 },
    { category: "UTILITY", pinned: false, title: "Electricity rationing schedule update", body: "EDL has announced an updated rationing schedule for the Aley region. Power will be available on a 6-hours-on / 6-hours-off rotation this week.", expires: 7 },
    { category: "EVENT", pinned: false, title: "Aley Summer Festival — call for vendors", body: "Local businesses and artisans are invited to register for the annual Aley Summer Festival. Booth registration is open at the municipality until July 10th.", expires: 18 },
    { category: "WEATHER", pinned: false, title: "Heat advisory for the weekend", body: "Temperatures are expected to rise above seasonal averages this weekend. Residents are advised to stay hydrated and avoid prolonged sun exposure between noon and 4:00 PM.", expires: 4 },
    { category: "HEALTH", pinned: false, title: "Free blood-pressure screening", body: "The Aley Governmental Hospital is offering free blood-pressure and diabetes screenings every Tuesday this month, 9:00 AM–12:00 PM. No appointment needed.", expires: 25 },
  ];
  for (let i = 0; i < announcements.length; i++) {
    const a = announcements[i];
    await prisma.announcement.create({
      data: { cityId: aley.id, title: a.title, body: a.body, category: a.category, isPinned: a.pinned, publishedAt: days(-i), expiresAt: days(a.expires) },
    });
  }

  // ---- Lost & Found (sample resident posts) ----
  const lostFound = [
    { type: "LOST", category: "Pet", title: "Lost grey cat near Souk Street", description: "Our grey tabby cat 'Ramo' went missing Tuesday evening around Souk Street. He's friendly, wearing a blue collar. Reward offered.", location: "Souk Street, Aley", contactName: "Lara H.", contactPhone: "+961 70 123 456" },
    { type: "FOUND", category: "Keys", title: "Found a set of car keys", description: "Found a bunch of keys with a Toyota fob and a red keychain near the town square fountain. Describe to claim.", location: "Town Square, Aley", contactName: "Georges A.", contactPhone: "+961 71 987 654" },
    { type: "LOST", category: "Phone", title: "Lost black iPhone in a taxi", description: "Left my black iPhone 13 in a service taxi going from Aley to Bhamdoun on Sunday afternoon. Please contact me, screen has a cracked corner.", location: "Aley → Bhamdoun", contactName: "Sami D.", contactPhone: "+961 76 222 333" },
    { type: "FOUND", category: "Document", title: "Found ID card on Main Road", description: "Found a Lebanese ID card on the sidewalk near the pharmacy on Main Road. Handed details to be claimed — message me to arrange pickup.", location: "Main Road, Aley", contactName: "Maya S.", contactEmail: "maya.s@example.com" },
    { type: "LOST", category: "Jewelry", title: "Lost gold bracelet", description: "Lost a thin gold bracelet with small charms, likely near the public garden. It has great sentimental value. Reward for its return.", location: "Public Garden, Aley", contactName: "Nadia F.", contactPhone: "+961 3 444 555" },
    { type: "FOUND", category: "Bag", title: "Found a child's backpack", description: "A small blue child's backpack was left at the bus stop near the school. Contains some books — waiting to be claimed.", location: "School bus stop, Aley", contactName: "Karim T.", contactPhone: "+961 70 666 777", status: "RESOLVED" },
  ];
  for (let i = 0; i < lostFound.length; i++) {
    const l = lostFound[i];
    await prisma.lostFoundItem.create({
      data: {
        cityId: aley.id, type: l.type, category: l.category, title: l.title, description: l.description, location: l.location,
        contactName: l.contactName, contactPhone: (l as { contactPhone?: string }).contactPhone ?? "", contactEmail: (l as { contactEmail?: string }).contactEmail ?? "",
        status: (l as { status?: string }).status ?? "OPEN", date: "", image: photo(`lf-${i}`, "gift-shops", 600, 450), createdAt: days(-i),
      },
    });
  }

  // ---- Drivers (delivery service) ----
  const demoDriver = await prisma.driver.create({ data: { name: "Elie Khoury", phone: "+961 71 222 333", email: "driver@aley.com", vehicle: "Motorbike", status: "ACTIVE", passwordHash: await bcrypt.hash("driver", 10) } });
  const driver2 = await prisma.driver.create({ data: { name: "Rabih Nassar", phone: "+961 3 444 555", email: "rabih@aley.com", vehicle: "Car · ABC-123", status: "ACTIVE", passwordHash: await bcrypt.hash("driver", 10) } });
  await prisma.driver.create({ data: { name: "Karim Daher", phone: "+961 76 777 888", email: "karim@aley.com", vehicle: "Motorbike", status: "PENDING", passwordHash: await bcrypt.hash("driver", 10) } });

  // ---- Delivery requests (courier service) ----
  const deliveries = [
    { type: "ALEY_TO_ALEY", status: "ON_THE_WAY", pickup: "Bean Avenue, Souk Street", pickupPhone: "+961 5 555 010", drop: "Hilltop Avenue, Aley", item: "2 boxes of pastries", size: "MEDIUM", urgency: "STANDARD", name: "Lara H.", phone: "+961 70 123 456", driver: demoDriver },
    { type: "OUTSIDE_TO_ALEY", status: "HEADING_TO_PICKUP", pickup: "Phone shop, Hamra, Beirut", pickupPhone: "+961 1 555 020", drop: "Main Road, Aley", item: "Sealed phone box (pickup + pay $120 to shop)", size: "SMALL", urgency: "EXPRESS", name: "Sami D.", phone: "+961 76 222 333", driver: driver2 },
    { type: "ALEY_TO_OUTSIDE", status: "REQUESTED", pickup: "Aley Center supermarket", pickupPhone: "+961 5 555 030", drop: "Hazmieh, near the highway", item: "Grocery bags", size: "LARGE", urgency: "STANDARD", name: "Maya S.", phone: "+961 3 444 555", driver: null },
    { type: "CUSTOM", status: "DELIVERED", pickup: "Pharmacy, Bhamdoun", pickupPhone: "", drop: "Old Aley Street", item: "Medication", size: "SMALL", urgency: "EXPRESS", name: "Georges A.", phone: "+961 71 987 654", driver: demoDriver },
  ];
  let dn = 0;
  for (const d of deliveries) {
    const est = estimateDelivery({ type: d.type, packageSize: d.size, urgency: d.urgency }, DELIVERY_DEFAULTS);
    await prisma.deliveryRequest.create({
      data: {
        number: `DLV-SEED${++dn}`, cityId: aley.id, type: d.type,
        pickupLabel: d.pickup, pickupPhone: d.pickupPhone, dropoffLabel: d.drop, pickupOutside: est.pickupOutside, dropoffOutside: est.dropoffOutside,
        itemDescription: d.item, packageType: "Parcel", packageSize: d.size, urgency: d.urgency,
        customerName: d.name, customerPhone: d.phone,
        driverId: d.driver?.id ?? null, driverName: d.driver?.name ?? "", driverPhone: d.driver?.phone ?? "",
        distanceKm: est.distanceKm, estimatedMin: est.min, estimatedMax: est.max,
        finalPrice: d.status === "DELIVERED" ? est.max : null, status: d.status, createdAt: days(-dn),
      },
    });
  }

  // ---- Analytics events (powers the provider + admin dashboards) ----
  // Seed ~45 days of realistic interactions for a subset of businesses so the
  // dashboards, charts and leaderboards are populated out of the box.
  const allBiz = await prisma.business.findMany({ select: { id: true, slug: true, isFeatured: true } });
  const featured = allBiz.filter((b) => b.isFeatured);
  const rest = allBiz.filter((b) => !b.isFeatured).slice(0, 45);
  const subset = [...new Map([...featured, ...rest].map((b) => [b.id, b])).values()];
  const DAYS = 45;
  const HOURS = [9, 10, 11, 12, 12, 13, 14, 16, 17, 17, 18, 18, 19, 19, 20, 20, 21]; // evening-weighted
  const rpois = (m: number) => Math.max(0, Math.round(m * (0.6 + Math.random() * 0.8)));
  const rbin = (n: number, p: number) => { let c = 0; for (let i = 0; i < n; i++) if (Math.random() < p) c++; return c; };
  const evRows: { businessId: number; type: string; createdAt: Date }[] = [];
  for (const b of subset) {
    const pop = b.slug === "bean-avenue" ? 2.6 : 0.4 + Math.random() * 1.5;
    for (let d = 0; d < DAYS; d++) {
      const day = days(-d);
      const dowBoost = day.getDay() === 6 ? 1.4 : day.getDay() === 5 || day.getDay() === 0 ? 1.2 : 1;
      const at = () => { const t = new Date(day); t.setHours(HOURS[Math.floor(Math.random() * HOURS.length)], Math.floor(Math.random() * 60), 0, 0); return t; };
      const appearances = rpois(pop * 11 * dowBoost);
      const views = Math.min(appearances, rpois(pop * 3.5 * dowBoost));
      for (let i = 0; i < appearances; i++) evRows.push({ businessId: b.id, type: "SEARCH_APPEARANCE", createdAt: at() });
      for (let i = 0; i < views; i++) evRows.push({ businessId: b.id, type: "PROFILE_VIEW", createdAt: at() });
      const clicks: [string, number][] = [["PHONE_VIEW", 0.18], ["CALL", 0.1], ["WHATSAPP", 0.16], ["WEBSITE", 0.05], ["DIRECTIONS", 0.12]];
      for (const [type, p] of clicks) for (let i = 0; i < rbin(views, p); i++) evRows.push({ businessId: b.id, type, createdAt: at() });
    }
  }
  for (let i = 0; i < evRows.length; i += 5000) await prisma.analyticsEvent.createMany({ data: evRows.slice(i, i + 5000) });

  const counts = { businesses: created.length, categories: cats.length, reviews: reviewRows.length, offers: offerRows.length, events: eventRows.length };
  console.log(`✅ Seed complete: ${counts.businesses} businesses across ${counts.categories} categories, ${counts.reviews} reviews, ${counts.offers} offers, ${counts.events} events, 3 community projects, ${announcements.length} notices, ${lostFound.length} lost & found posts, ${deliveries.length} delivery requests, 3 drivers, ${evRows.length} analytics events.`);
  console.log("   Demo owner login → owner@aley.com / owner");
  console.log("   Demo driver login → driver@aley.com / driver");
}

main().catch((e) => { console.error(e); process.exit(1); }).finally(() => prisma.$disconnect());
