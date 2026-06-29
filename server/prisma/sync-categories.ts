/* eslint-disable @typescript-eslint/no-explicit-any */
import { PrismaClient } from "@prisma/client";
import { CATS } from "./demo";

// Reconciles the live category taxonomy with CATS (the single source of truth).
// Idempotent — safe to re-run. Run: npm run sync:categories
//   • Upserts every category by slug (creates new, refreshes name/icon/color/group/sortOrder).
//   • Migrates the 3 legacy "Swimming Pools" service businesses (formerly in
//     Home & Living) onto the new `pool-services` category, freeing the
//     `swimming-pools` slug to be a Sports & Recreation hourly-rental facility.
const prisma = new PrismaClient();

async function main() {
  // 1) Upsert the full taxonomy. sortOrder = position in CATS so within-group
  //    ordering matches the source list exactly.
  let created = 0, updated = 0;
  for (let i = 0; i < CATS.length; i++) {
    const c = CATS[i];
    const existing = await prisma.category.findUnique({ where: { slug: c.slug } });
    if (existing) {
      await prisma.category.update({ where: { slug: c.slug }, data: { name: c.name, group: c.group, icon: c.icon, color: c.color, sortOrder: i } });
      updated++;
    } else {
      await prisma.category.create({ data: { slug: c.slug, name: c.name, group: c.group, icon: c.icon, color: c.color, sortOrder: i } });
      created++;
    }
  }
  console.log(`Categories: ${created} created, ${updated} updated.`);

  // 2) One-time migration: move legacy pool-service businesses off swimming-pools.
  const swim = await prisma.category.findUnique({ where: { slug: "swimming-pools" } });
  const poolSvc = await prisma.category.findUnique({ where: { slug: "pool-services" } });
  if (swim && poolSvc) {
    const svcCount = await prisma.business.count({ where: { categoryId: poolSvc.id } });
    if (svcCount === 0) {
      const moved = await prisma.business.updateMany({ where: { categoryId: swim.id }, data: { categoryId: poolSvc.id } });
      if (moved.count) console.log(`Moved ${moved.count} pool-service business(es) → "Pool Construction & Maintenance".`);
    } else {
      console.log("pool-services already populated — skipping legacy migration.");
    }
  }

  const total = await prisma.category.count();
  console.log(`✅ Taxonomy in sync. ${total} categories total.`);
}

main().catch((e) => { console.error(e); process.exit(1); }).finally(() => prisma.$disconnect());
