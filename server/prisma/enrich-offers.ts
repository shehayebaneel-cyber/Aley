/* eslint-disable @typescript-eslint/no-explicit-any */
import { PrismaClient } from "@prisma/client";

// One-off backfill so existing offers look great in the new deals marketplace:
// derives a big badge, normalises legacy types, features a stable subset, and
// gives some offers an end date (for "Ending soon"). Idempotent-ish: only fills
// blank fields; featured/endDate are derived from the id so re-runs are stable.
const prisma = new PrismaClient();

function badgeFor(title: string, type: string): string {
  const m = title.match(/(\d{1,3})\s*%/);
  if (m) return `${m[1]}% OFF`;
  if (/buy ?1|bogo|b1g1|get one/i.test(title) || type === "BOGO") return "Buy 1 Get 1";
  if (/free/i.test(title)) return "Free Gift";
  if (type === "HAPPY_HOUR") return "Happy Hour";
  if (type === "SEASONAL") return "Seasonal Deal";
  if (type === "FIRST_VISIT") return "First Visit";
  if (type === "LOYALTY") return "Loyalty Reward";
  return "Special Deal";
}
function normaliseType(title: string, type: string): string {
  if (type !== "DISCOUNT") return type;
  if (/free/i.test(title)) return "FREE_ITEM";
  if (/first|new customer/i.test(title)) return "FIRST_VISIT";
  return "PERCENT";
}

async function main() {
  const offers = await prisma.offer.findMany();
  let updated = 0, featured = 0, dated = 0;
  for (const o of offers) {
    const data: any = {};
    const newType = normaliseType(o.title, o.type);
    if (newType !== o.type) data.type = newType;
    if (!o.badge) data.badge = badgeFor(o.title, newType);
    if (!o.terms) data.terms = "Valid for dine-in and takeaway. Cannot be combined with other offers. Subject to availability.";
    if (!o.redeemInfo) data.redeemInfo = "Show your claim code at the counter to redeem this offer.";
    // Feature ~1 in 6 (stable by id).
    const shouldFeature = o.id % 6 === 0;
    if (shouldFeature && !o.isFeatured) { data.isFeatured = true; featured++; }
    // Give ~1 in 3 an upcoming end date (3–20 days out) when none set.
    if (!o.endDate && o.id % 3 === 0) { data.endDate = new Date(Date.now() + ((o.id % 18) + 3) * 86400000); dated++; }
    if (Object.keys(data).length) { await prisma.offer.update({ where: { id: o.id }, data }); updated++; }
  }
  console.log(`✅ Enriched ${updated}/${offers.length} offers — ${featured} newly featured, ${dated} given end dates.`);
}

main().catch((e) => { console.error(e); process.exit(1); }).finally(() => prisma.$disconnect());
