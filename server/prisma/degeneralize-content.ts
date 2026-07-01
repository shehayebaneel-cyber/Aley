/* eslint-disable @typescript-eslint/no-explicit-any */
import { PrismaClient } from "@prisma/client";
import { saveContent } from "../src/lib/content";

// One-off: rewrite the stored site.content CMS blob so homepage titles no longer
// hardcode "Aley" — the platform reads nationwide now. Preserves custom images/items.
const prisma = new PrismaClient();

async function main() {
  const row = await prisma.setting.findUnique({ where: { key: "site.content" } });
  const c: any = row ? JSON.parse(row.value) : {};
  c.brand = { ...c.brand, tagline: "Discover Lebanon, one city at a time", footerText: "The platform to discover businesses, events, offers and more across Lebanon — starting with Aley." };
  c.hero = { ...c.hero, title: "Discover the best of Lebanon", subtitle: "Find local businesses, events, offers, gift cards and community projects across Lebanon — all in one platform." };
  c.sections = c.sections ?? {};
  c.sections.featured = { ...c.sections.featured, subtitle: "Hand-picked places" };
  c.sections.community = { ...c.sections.community, title: "Community Projects", subtitle: "Back the projects making our cities better — transparently, together." };
  c.sections.gems = { ...c.sections.gems, title: "Hidden Gems" };
  if (Array.isArray(c.sections.gems?.items)) c.sections.gems.items = c.sections.gems.items.map((it: any) => (/aley/i.test(it.sub ?? "") ? { ...it, sub: "Most-loved by locals" } : it));
  c.sections.offers = { ...c.sections.offers, title: "Exclusive Offers" };
  c.sections.events = { ...c.sections.events, title: "Featured Events", subtitle: "Discover things to do" };
  c.sections.mapCta = { ...c.sections.mapCta, title: "Explore on the map" };
  c.about = { ...c.about, body: "Every city in Lebanon deserves one digital home where residents, visitors, and businesses can connect. This platform supports local businesses, promotes community projects, and makes discovering your city easier — starting with Aley and growing across Lebanon." };
  c.loveAley = { ...c.loveAley, title: "Love Your City ❤", subtitle: "Your city, your impact. Support community projects, volunteer, vote on ideas, and help make your city better — transparently." };
  await saveContent(c);
  console.log("✅ Site content degeneralized (nationwide titles).");
}

main().catch((e) => { console.error(e); process.exit(1); }).finally(() => prisma.$disconnect());
