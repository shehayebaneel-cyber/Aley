import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";
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

  const counts = { businesses: created.length, categories: cats.length, reviews: reviewRows.length, offers: offerRows.length, events: eventRows.length };
  console.log(`✅ Seed complete: ${counts.businesses} businesses across ${counts.categories} categories, ${counts.reviews} reviews, ${counts.offers} offers, ${counts.events} events, 3 community projects.`);
  console.log("   Demo owner login → owner@aley.com / owner");
}

main().catch((e) => { console.error(e); process.exit(1); }).finally(() => prisma.$disconnect());
