import { prisma } from "../db";

// Unified money ledger across all sales channels. Every paid sale records a
// Transaction; refunds reverse the underlying item and log the amount.
// (Records & reverses now; real money movement plugs in via the payment gateway.)

export interface TxInput {
  businessId: number | null;
  source: "VOUCHER" | "FACILITY" | "ORDER";
  refId: number;
  code?: string;
  description?: string;
  customerName?: string;
  customerPhone?: string;
  userId?: number | null;
  amount: number;
  method?: string;
}

/** Record a paid sale. Best-effort: never throws into the caller's flow. */
export async function recordTransaction(t: TxInput): Promise<void> {
  if (!t.amount || t.amount <= 0) return;
  try {
    await prisma.transaction.create({
      data: {
        businessId: t.businessId ?? null, source: t.source, refId: t.refId,
        code: t.code ?? "", description: t.description ?? "", customerName: t.customerName ?? "",
        customerPhone: t.customerPhone ?? "", userId: t.userId ?? null,
        amount: Math.round(t.amount * 100) / 100, method: t.method ?? "CARD", status: "PAID",
      },
    });
  } catch (e) {
    console.error("recordTransaction failed", e);
  }
}

/** Refund a transaction (full or partial); on full refund, reverse the underlying item. */
export async function refundTransaction(id: number, amount?: number) {
  const tx = await prisma.transaction.findUnique({ where: { id } });
  if (!tx) return { error: "Transaction not found." };
  if (tx.status === "REFUNDED") return { error: "Already fully refunded." };

  const remaining = Math.round((tx.amount - tx.refundedAmount) * 100) / 100;
  const refund = Math.round(Math.max(0, Math.min(remaining, amount ?? remaining)) * 100) / 100;
  if (refund <= 0) return { error: "Nothing left to refund." };

  const refundedAmount = Math.round((tx.refundedAmount + refund) * 100) / 100;
  const full = refundedAmount >= tx.amount - 0.0001;
  const updated = await prisma.transaction.update({
    where: { id: tx.id },
    data: { refundedAmount, status: full ? "REFUNDED" : "PARTIALLY_REFUNDED", refundedAt: new Date() },
  });

  if (full) {
    try {
      if (tx.source === "VOUCHER") await prisma.voucher.update({ where: { id: tx.refId }, data: { status: "DISABLED" } });
      else if (tx.source === "FACILITY") await prisma.facilityBooking.update({ where: { id: tx.refId }, data: { status: "CANCELLED" } });
      else if (tx.source === "ORDER") await prisma.businessOrder.update({ where: { id: tx.refId }, data: { status: "CANCELLED" } });
    } catch { /* underlying item may already be gone */ }
  }
  return { ok: true, refunded: refund, refundedAmount: updated.refundedAmount, status: updated.status };
}

/** Totals for a set of transactions. */
export function summarize(txs: { amount: number; refundedAmount: number; source: string }[]) {
  const gross = txs.reduce((s, t) => s + t.amount, 0);
  const refunded = txs.reduce((s, t) => s + t.refundedAmount, 0);
  const bySource: Record<string, number> = {};
  for (const t of txs) bySource[t.source] = Math.round(((bySource[t.source] ?? 0) + (t.amount - t.refundedAmount)) * 100) / 100;
  return {
    count: txs.length,
    gross: Math.round(gross * 100) / 100,
    refunded: Math.round(refunded * 100) / 100,
    net: Math.round((gross - refunded) * 100) / 100,
    bySource,
  };
}
