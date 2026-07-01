/* eslint-disable @typescript-eslint/no-explicit-any */
import { PrismaClient } from "@prisma/client";

// Seeds the Discover "collections" (idempotent by slug). Picks member businesses
// by category + rating heuristics so the homepage Discover strip is populated.
// Run: npm run seed:collections
const prisma = new PrismaClient();

type Spec = { slug: string; title: string; emoji: string; description: string; featured: boolean; cats: string[]; tag?: string; order: "rating" | "reviews" | "new"; take: number };
const SPECS: Spec[] = [
  { slug: "local-favorites", title: "Local Favorites", emoji: "❤️", description: "The places people keep coming back to — most-loved across Lebanon.", featured: true, cats: ["coffee-shops", "restaurants", "lebanese", "bakeries"], order: "reviews", take: 10 },
  { slug: "worth-the-drive", title: "Worth the Drive", emoji: "🌅", description: "Special spots worth a little road trip — scenery, food and atmosphere.", featured: true, cats: ["restaurants", "hotels", "resorts", "lebanese"], order: "rating", take: 10 },
  { slug: "trending-this-week", title: "Trending This Week", emoji: "🔥", description: "What everyone's checking out right now.", featured: true, cats: ["coffee-shops", "restaurants", "fast-food", "desserts", "ice-cream"], order: "rating", take: 10 },
  { slug: "new-discoveries", title: "New Discoveries", emoji: "🆕", description: "Just added — be among the first to try them.", featured: true, cats: [], order: "new", take: 10 },
  { slug: "best-to-study", title: "Best Places to Study", emoji: "☕", description: "Quiet corners, Wi-Fi and good coffee to get things done.", featured: true, cats: ["coffee-shops"], tag: "wifi", order: "rating", take: 9 },
  { slug: "best-breakfast", title: "Best Breakfast Spots", emoji: "🍳", description: "Start your morning right.", featured: true, cats: ["breakfast-brunch", "coffee-shops", "bakeries"], order: "rating", take: 9 },
  { slug: "date-night", title: "Date Night Ideas", emoji: "💑", description: "Set the mood — restaurants and spots made for two.", featured: false, cats: ["restaurants", "lebanese", "sushi"], order: "rating", take: 9 },
  { slug: "family-picks", title: "Family Picks", emoji: "👨‍👩‍👧", description: "Fun for everyone, big and small.", featured: false, cats: ["restaurants", "fast-food", "ice-cream", "kids-play-areas"], tag: "family", order: "rating", take: 9 },
  { slug: "scenic-views", title: "Scenic Views", emoji: "🌄", description: "Golden-hour spots and panoramas across the mountains.", featured: false, cats: ["hotels", "resorts", "restaurants"], tag: "view", order: "rating", take: 9 },
  { slug: "late-night-eats", title: "Late Night Eats", emoji: "🌙", description: "Open when the cravings hit.", featured: false, cats: ["fast-food", "shawarma", "burgers", "pizza"], order: "rating", take: 9 },
];

const ORDER: Record<string, any> = { rating: [{ rating: "desc" }, { reviewCount: "desc" }], reviews: [{ reviewCount: "desc" }], new: [{ createdAt: "desc" }] };

async function main() {
  let made = 0;
  for (let i = 0; i < SPECS.length; i++) {
    const s = SPECS[i];
    const where: any = { isPublished: true };
    if (s.cats.length) where.category = { is: { slug: { in: s.cats } } };
    let rows = await prisma.business.findMany({ where, orderBy: ORDER[s.order], take: s.tag ? 60 : s.take, select: { id: true, tags: true } });
    if (s.tag) rows = rows.filter((b) => (b.tags || "").toLowerCase().includes(s.tag!)).slice(0, s.take);
    if (rows.length < 3) rows = await prisma.business.findMany({ where: { isPublished: true }, orderBy: ORDER[s.order], take: s.take, select: { id: true, tags: true } });

    const col = await prisma.collection.upsert({
      where: { slug: s.slug },
      create: { slug: s.slug, title: s.title, emoji: s.emoji, description: s.description, isFeatured: s.featured, sortOrder: i + 1 },
      update: { title: s.title, emoji: s.emoji, description: s.description, isFeatured: s.featured, sortOrder: i + 1 },
    });
    await prisma.collectionItem.deleteMany({ where: { collectionId: col.id } });
    await prisma.collectionItem.createMany({ data: rows.map((b, idx) => ({ collectionId: col.id, businessId: b.id, sortOrder: idx })), skipDuplicates: true });
    made++;
    console.log(`  ✓ ${s.emoji} ${s.title} — ${rows.length} places`);
  }
  console.log(`✅ Seeded ${made} Discover collections.`);
}
main().catch((e) => { console.error(e); process.exit(1); }).finally(() => prisma.$disconnect());
