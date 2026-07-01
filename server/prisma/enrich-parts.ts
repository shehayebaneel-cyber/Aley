/* eslint-disable @typescript-eslint/no-explicit-any */
import { PrismaClient } from "@prisma/client";

// Give auto-parts shops realistic parts profiles (brands/makes/categories) so the
// Spare Parts directory + filters + request matching are meaningful. Stable by id.
const prisma = new PrismaClient();

const MAKES = ["Mercedes", "BMW", "Hyundai", "Toyota", "Nissan", "Kia", "Honda", "Ford", "Chevrolet", "Volkswagen", "Peugeot", "Renault"];
const BRANDS = ["Bosch", "Denso", "NGK", "Valeo", "Mann-Filter", "Mahle", "Brembo", "Sachs", "Hella", "Febi", "Continental"];
const CATS = ["Engine", "Brakes", "Suspension", "Electrical", "Filters", "Body & Exterior", "Lights", "Cooling", "Battery", "AC & Heating"];
const pick = <T>(arr: T[], start: number, n: number) => Array.from({ length: n }, (_, i) => arr[(start + i * 3) % arr.length]);

async function main() {
  const shops = await prisma.business.findMany({ where: { category: { is: { slug: "auto-parts" } } } });
  let n = 0;
  for (const s of shops) {
    const profile = {
      brands: pick(BRANDS, s.id, 4),
      makes: pick(MAKES, s.id, 5),
      partCategories: pick(CATS, s.id, 5),
      newParts: true,
      usedParts: s.id % 2 === 0,
      oem: s.id % 3 !== 0,
      aftermarket: true,
    };
    await prisma.business.update({ where: { id: s.id }, data: { partsProfile: JSON.stringify(profile), hasDelivery: s.id % 2 === 0 ? true : s.hasDelivery } });
    n++;
  }
  console.log(`✅ Parts profiles set on ${n} auto-parts shops.`);
}

main().catch((e) => { console.error(e); process.exit(1); }).finally(() => prisma.$disconnect());
