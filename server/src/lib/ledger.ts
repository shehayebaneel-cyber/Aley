import { prisma } from "../db";
import { getMarketplaceSettings, resolveCommissionRate } from "./marketplace";
import { refundToWallet, type WalletSource } from "./wallet";

// Marketplace accounting backbone: the Transaction table is the financial ledger
// (one row per money event with gross/commission/net + payment & payout status).
// Wallets and statements are COMPUTED from it (never a drifting stored balance);
// Payouts batch a business's net. Gateway-agnostic — records & reverses now.

const round2 = (n: number) => Math.round(n * 100) / 100;
const PAID_STATES = ["PAID", "PARTIALLY_REFUNDED"]; // money actually collected
const COLLECTED = (t: { status: string }) => PAID_STATES.includes(t.status);
/** Net still owed on a row, reduced proportionally by any refund. */
const owedNet = (t: { amount: number; net: number; refundedAmount: number }) =>
  t.amount > 0 ? round2(t.net * Math.max(0, (t.amount - t.refundedAmount)) / t.amount) : 0;

export interface TxInput {
  businessId: number | null;
  source: "VOUCHER" | "FACILITY" | "ORDER" | "APPOINTMENT" | "DELIVERY" | "EVENT" | "ADJUSTMENT";
  refId: number;
  code?: string;
  description?: string;
  customerName?: string;
  customerPhone?: string;
  userId?: number | null;
  amount: number; // gross
  commission?: number; // if omitted, computed from the business/category/global rate + fixed fee
  deliveryFee?: number;
  net?: number;
  status?: string; // payment status (default PAID in demo mode)
  method?: string;
  notes?: string;
}

/** Record a money event. Best-effort: never throws into the caller's flow. */
export async function recordTransaction(t: TxInput): Promise<void> {
  if (!t.amount && t.amount !== 0) return;
  if (t.amount <= 0 && t.source !== "ADJUSTMENT") return;
  try {
    let commission = t.commission;
    let net = t.net;
    if (commission == null) {
      const biz = t.businessId ? await prisma.business.findUnique({ where: { id: t.businessId }, include: { category: { select: { commissionRate: true } } } }) : null;
      const settings = await getMarketplaceSettings();
      const rate = resolveCommissionRate(biz?.commissionRate ?? 0, biz?.category?.commissionRate ?? 0, settings);
      commission = round2((t.amount * rate) / 100 + (settings.fixedFee || 0));
    }
    if (net == null) net = round2(t.amount - commission - (t.deliveryFee ?? 0));
    await prisma.transaction.create({
      data: {
        businessId: t.businessId ?? null, source: t.source, refId: t.refId, code: t.code ?? "",
        description: t.description ?? "", customerName: t.customerName ?? "", customerPhone: t.customerPhone ?? "",
        userId: t.userId ?? null, amount: round2(t.amount), commission: round2(commission), deliveryFee: round2(t.deliveryFee ?? 0),
        net: round2(net), method: t.method ?? "CARD", status: t.status ?? "PAID", payoutStatus: "UNPAID", notes: t.notes ?? "",
      },
    });
  } catch (e) {
    console.error("recordTransaction failed", e);
  }
}

/** Refund a transaction (full or partial); on full refund, reverse the underlying item. */
export async function refundTransaction(id: number, amount?: number, by?: string) {
  const tx = await prisma.transaction.findUnique({ where: { id } });
  if (!tx) return { error: "Transaction not found." };
  if (tx.status === "REFUNDED") return { error: "Already fully refunded." };
  if (tx.status === "CANCELLED") return { error: "Transaction is cancelled." };

  const remaining = round2(tx.amount - tx.refundedAmount);
  const refund = round2(Math.max(0, Math.min(remaining, amount ?? remaining)));
  if (refund <= 0) return { error: "Nothing left to refund." };

  const refundedAmount = round2(tx.refundedAmount + refund);
  const full = refundedAmount >= tx.amount - 0.0001;
  const updated = await prisma.transaction.update({
    where: { id: tx.id },
    data: { refundedAmount, status: full ? "REFUNDED" : "PARTIALLY_REFUNDED", refundedAt: new Date(), confirmedBy: by ?? tx.confirmedBy },
  });
  if (full) {
    try {
      if (tx.source === "VOUCHER") await prisma.voucher.update({ where: { id: tx.refId }, data: { status: "DISABLED" } });
      else if (tx.source === "FACILITY") await prisma.facilityBooking.update({ where: { id: tx.refId }, data: { status: "CANCELLED" } });
      else if (tx.source === "ORDER") await prisma.businessOrder.update({ where: { id: tx.refId }, data: { status: "CANCELLED" } });
    } catch { /* item may already be gone */ }
  }
  // If the customer paid from their wallet, return the refunded amount to it.
  if (tx.method === "WALLET" && tx.userId) {
    await refundToWallet({ userId: tx.userId, amount: refund, source: tx.source as WalletSource, refId: tx.refId, code: tx.code, description: `Refund · ${tx.description || tx.code || tx.source}`, createdBy: by }).catch(() => {});
  }
  return { ok: true, refunded: refund, refundedAmount: updated.refundedAmount, status: updated.status };
}

/** Manual ledger adjustment (admin) — credit (+) or debit (−) a business's balance. */
export async function addAdjustment(businessId: number, net: number, description: string, by: string) {
  await prisma.transaction.create({
    data: {
      businessId, source: "ADJUSTMENT", refId: 0, description: description || "Manual adjustment",
      amount: 0, commission: 0, deliveryFee: 0, net: round2(net), status: "PAID", method: "MANUAL",
      payoutStatus: "UNPAID", confirmedBy: by,
    },
  });
}

type TxLite = { amount: number; commission: number; net: number; refundedAmount: number; status: string; payoutStatus: string };

/** A business's wallet, computed from its transactions. */
export function walletFor(txs: TxLite[]) {
  const collected = txs.filter(COLLECTED);
  const totalSales = round2(collected.reduce((s, t) => s + t.amount, 0));
  const commission = round2(collected.reduce((s, t) => s + t.commission * (t.amount > 0 ? (t.amount - t.refundedAmount) / t.amount : 1), 0));
  const refunds = round2(txs.reduce((s, t) => s + t.refundedAmount, 0));
  const pendingBalance = round2(txs.filter((t) => ["PENDING", "UNPAID"].includes(t.status)).reduce((s, t) => s + t.net, 0));
  const available = round2(collected.filter((t) => t.payoutStatus === "UNPAID").reduce((s, t) => s + owedNet(t), 0));
  const inPayout = round2(collected.filter((t) => t.payoutStatus === "IN_PAYOUT").reduce((s, t) => s + owedNet(t), 0));
  const paidOut = round2(collected.filter((t) => t.payoutStatus === "PAID").reduce((s, t) => s + owedNet(t), 0));
  return {
    totalSales, commission, refunds,
    pendingBalance, availableBalance: available, inPayout, paidOut,
    lifetimeEarnings: round2(available + inPayout + paidOut),
    outstandingBalance: round2(available + inPayout), // owed but not yet paid out
  };
}

/** Generate a payout draft for a business over a period (batches its unpaid net). */
export async function generatePayout(businessId: number, periodStart: string, periodEnd: string, by: string) {
  const where: Record<string, unknown> = { businessId, status: { in: PAID_STATES }, payoutStatus: "UNPAID" };
  if (periodStart && periodEnd) where.createdAt = { gte: new Date(periodStart), lte: new Date(`${periodEnd}T23:59:59`) };
  const txs = await prisma.transaction.findMany({ where });
  if (!txs.length) return { error: "No unpaid transactions in that range." };
  const grossSales = round2(txs.reduce((s, t) => s + t.amount, 0));
  const commission = round2(txs.reduce((s, t) => s + t.commission, 0));
  const refunds = round2(txs.reduce((s, t) => s + t.refundedAmount, 0));
  const adjustments = round2(txs.filter((t) => t.source === "ADJUSTMENT").reduce((s, t) => s + t.net, 0));
  const net = round2(txs.reduce((s, t) => s + owedNet(t), 0));
  const payout = await prisma.payout.create({
    data: { businessId, periodStart, periodEnd, grossSales, commission, refunds, adjustments, net, status: "PENDING", createdBy: by },
  });
  await prisma.transaction.updateMany({ where: { id: { in: txs.map((t) => t.id) } }, data: { payoutId: payout.id, payoutStatus: "IN_PAYOUT" } });
  return { ok: true, payout };
}

export async function setPayoutStatus(payoutId: number, status: "PAID" | "FAILED" | "CANCELLED", by: string) {
  const payout = await prisma.payout.findUnique({ where: { id: payoutId } });
  if (!payout) return { error: "Payout not found." };
  if (status === "PAID") {
    await prisma.transaction.updateMany({ where: { payoutId }, data: { payoutStatus: "PAID" } });
    await prisma.payout.update({ where: { id: payoutId }, data: { status: "PAID", paidAt: new Date(), createdBy: by || payout.createdBy } });
  } else if (status === "CANCELLED" || status === "FAILED") {
    // Release the transactions back to available.
    await prisma.transaction.updateMany({ where: { payoutId }, data: { payoutStatus: "UNPAID", payoutId: null } });
    await prisma.payout.update({ where: { id: payoutId }, data: { status } });
  }
  return { ok: true };
}
