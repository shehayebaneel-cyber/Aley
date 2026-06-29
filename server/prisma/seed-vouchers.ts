/* eslint-disable @typescript-eslint/no-explicit-any */
import { PrismaClient } from "@prisma/client";
const prisma = new PrismaClient();

// Idempotent: attaches gift-voucher products to flagship demo businesses.
// Run: npm run seed:vouchers
const VOUCHERS: Record<string, { kind: string; name: string; description?: string; value: number; price?: number; expiryDays?: number; terms?: string }[]> = {
  "bean-avenue": [
    { kind: "FIXED", name: "$25 Gift Card", value: 25, expiryDays: 365, terms: "Redeemable on any item. Non-refundable." },
    { kind: "FIXED", name: "$50 Gift Card", value: 50, expiryDays: 365 },
    { kind: "FIXED", name: "Custom Amount Gift Card", value: 0, expiryDays: 365, terms: "Choose any amount." },
    { kind: "PRODUCT", name: "Coffee & Croissant for Two", description: "Two specialty coffees + two croissants.", value: 14, expiryDays: 180 },
  ],
  "olive-and-vine": [
    { kind: "FIXED", name: "$50 Gift Card", value: 50, expiryDays: 365 },
    { kind: "FIXED", name: "$100 Gift Card", value: 100, expiryDays: 365 },
    { kind: "PRODUCT", name: "Dinner for Two", description: "3-course dinner for two (excl. drinks).", value: 70, expiryDays: 180 },
  ],
  "atelier-elie": [
    { kind: "SERVICE", name: "Signature Facial", value: 55, expiryDays: 180 },
    { kind: "SERVICE", name: "Cut & Full Color", value: 120, expiryDays: 180 },
    { kind: "FIXED", name: "$50 Beauty Gift Card", value: 50, expiryDays: 365 },
  ],
  "aquashine-car-wash": [
    { kind: "PRODUCT", name: "Full Detail Package", description: "Complete interior + exterior detail.", value: 45, expiryDays: 180 },
    { kind: "FIXED", name: "$25 Wash Gift Card", value: 25, expiryDays: 365 },
  ],
  "powerhouse-gym": [
    { kind: "SERVICE", name: "1-Month Membership", value: 60, expiryDays: 120 },
    { kind: "FIXED", name: "$50 Gift Card", value: 50, expiryDays: 365 },
  ],
  "the-gentlemens-cut": [
    { kind: "SERVICE", name: "Haircut & Beard Voucher", value: 22, expiryDays: 180 },
    { kind: "FIXED", name: "$30 Gift Card", value: 30, expiryDays: 365 },
  ],
};

async function main() {
  let total = 0;
  for (const [slug, types] of Object.entries(VOUCHERS)) {
    const biz = await prisma.business.findUnique({ where: { slug } });
    if (!biz) { console.warn(`  ! ${slug} not found, skipping`); continue; }
    await prisma.voucherType.deleteMany({ where: { businessId: biz.id } });
    for (let i = 0; i < types.length; i++) {
      const t = types[i];
      await prisma.voucherType.create({ data: {
        businessId: biz.id, kind: t.kind, name: t.name, description: t.description ?? "",
        value: t.value, price: t.price ?? 0, expiryDays: t.expiryDays ?? 0, terms: t.terms ?? "", status: "ACTIVE", sortOrder: i,
      } });
    }
    total += types.length;
    console.log(`  ✓ ${biz.name} — ${types.length} voucher products`);
  }
  console.log(`✅ Done. ${total} voucher products across ${Object.keys(VOUCHERS).length} businesses.`);
}
main().catch((e) => { console.error(e); process.exit(1); }).finally(() => prisma.$disconnect());
