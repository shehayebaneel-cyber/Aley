/* eslint-disable @typescript-eslint/no-explicit-any */
import { PrismaClient } from "@prisma/client";
import { generatePayout, setPayoutStatus } from "../src/lib/ledger";

// Idempotent demo finance data so the Earnings/Finance dashboards are populated.
// Tags rows with notes "demo-seed" and clears them first. Run: npm run seed:finance
const prisma = new PrismaClient();
const round2 = (n: number) => Math.round(n * 100) / 100;
const daysAgo = (n: number) => { const d = new Date(); d.setDate(d.getDate() - n); return d; };

// [description, gross, source, daysAgo]
const SALES: Record<string, [string, number, string, number][]> = {
  "bean-avenue": [
    ["Order · Bean Avenue", 42, "ORDER", 24], ["Order · Bean Avenue", 18.5, "ORDER", 22], ["Gift voucher · $50 Gift Card", 50, "VOUCHER", 20],
    ["Order · Bean Avenue", 27, "ORDER", 12], ["Order · Bean Avenue", 33.5, "ORDER", 6], ["Gift voucher · $25 Gift Card", 25, "VOUCHER", 3], ["Order · Bean Avenue", 21, "ORDER", 1],
  ],
  "atelier-elie": [["Gift voucher · Signature Facial", 55, "VOUCHER", 18], ["Gift voucher · $50 Beauty Gift Card", 50, "VOUCHER", 5]],
  "aley-padel-club": [["Court 1 · padel", 24, "FACILITY", 10], ["Court 3 (Panoramic) · padel", 56, "FACILITY", 4], ["Court 2 · padel", 31, "FACILITY", 1]],
  "urban-threads": [["Order · Urban Threads", 90, "ORDER", 15], ["Order · Urban Threads", 45, "ORDER", 2]],
};

async function main() {
  for (const [slug, sales] of Object.entries(SALES)) {
    const biz = await prisma.business.findUnique({ where: { slug }, include: { category: { select: { commissionRate: true } } } });
    if (!biz) { console.warn(`  ! ${slug} not found`); continue; }
    await prisma.transaction.deleteMany({ where: { businessId: biz.id, notes: "demo-seed" } });
    await prisma.payout.deleteMany({ where: { businessId: biz.id, notes: "demo-seed" } });
    const rate = biz.commissionRate > 0 ? biz.commissionRate : (biz.category?.commissionRate ?? 0) > 0 ? biz.category!.commissionRate : 10;
    for (const [description, gross, source, ago] of sales) {
      const commission = round2((gross * rate) / 100);
      await prisma.transaction.create({ data: {
        businessId: biz.id, source, refId: 0, code: `DEMO-${Math.floor(Math.random() * 9000 + 1000)}`, description,
        customerName: ["Lara H.", "Rami K.", "Maya S.", "Tony R.", "Nour A."][Math.floor(Math.random() * 5)], amount: gross,
        commission, deliveryFee: 0, net: round2(gross - commission), status: "PAID", method: "CARD", payoutStatus: "UNPAID",
        notes: "demo-seed", createdAt: daysAgo(ago),
      } });
    }
    console.log(`  ✓ ${biz.name} — ${sales.length} transactions`);
  }

  // One settled payout for Bean Avenue (older sales), leaving recent ones available.
  const bean = await prisma.business.findUnique({ where: { slug: "bean-avenue" } });
  if (bean) {
    const start = daysAgo(30).toISOString().slice(0, 10);
    const end = daysAgo(14).toISOString().slice(0, 10);
    const r = await generatePayout(bean.id, start, end, "seed");
    if ("ok" in r && r.payout) {
      await prisma.payout.update({ where: { id: r.payout.id }, data: { notes: "demo-seed" } });
      await setPayoutStatus(r.payout.id, "PAID", "seed");
      console.log(`  ✓ Bean Avenue — 1 settled payout ($${r.payout.net})`);
    }
  }
  console.log("✅ Demo finance data ready.");
}
main().catch((e) => { console.error(e); process.exit(1); }).finally(() => prisma.$disconnect());
