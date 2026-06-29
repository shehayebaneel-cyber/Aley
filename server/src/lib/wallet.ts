import { prisma } from "../db";

// Customer prepaid wallet: balance is COMPUTED from the WalletEntry ledger
// (sum of COMPLETED entries) — never a stored, drifting number. Credits are
// positive amounts (top-ups, refunds, bonuses); spends are negative.

const round2 = (n: number) => Math.round(n * 100) / 100;

export type WalletSource = "ORDER" | "VOUCHER" | "FACILITY" | "APPOINTMENT" | "TOPUP" | "REFUND" | "ADJUSTMENT";

export interface WalletEntryInput {
  userId: number;
  type: "TOPUP" | "SPEND" | "REFUND" | "ADJUSTMENT" | "BONUS";
  amount: number; // always pass a positive magnitude; direction comes from `type`
  status?: string;
  method?: string;
  source?: WalletSource;
  refId?: number;
  code?: string;
  description?: string;
  createdBy?: string;
}

const CREDIT_TYPES = new Set(["TOPUP", "REFUND", "BONUS"]);

/** Current spendable balance (sum of COMPLETED entries). */
export async function walletBalance(userId: number): Promise<number> {
  const agg = await prisma.walletEntry.aggregate({ where: { userId, status: "COMPLETED" }, _sum: { amount: true } });
  return round2(agg._sum.amount ?? 0);
}

/** Balance + recent history + lifetime totals for the account screen. */
export async function walletSummary(userId: number) {
  const entries = await prisma.walletEntry.findMany({ where: { userId }, orderBy: { id: "desc" }, take: 100 });
  const completed = entries.filter((e) => e.status === "COMPLETED");
  const balance = round2(completed.reduce((s, e) => s + e.amount, 0));
  const toppedUp = round2(completed.filter((e) => CREDIT_TYPES.has(e.type)).reduce((s, e) => s + e.amount, 0));
  const spent = round2(-completed.filter((e) => e.amount < 0).reduce((s, e) => s + e.amount, 0));
  return { balance, toppedUp, spent, entries };
}

/** Add a wallet entry, normalising the sign from the entry type. */
export async function addWalletEntry(input: WalletEntryInput) {
  const magnitude = Math.abs(round2(input.amount));
  const amount = CREDIT_TYPES.has(input.type) ? magnitude : -magnitude;
  return prisma.walletEntry.create({
    data: {
      userId: input.userId, type: input.type, amount, status: input.status ?? "COMPLETED",
      method: input.method ?? "CARD", source: input.source ?? "", refId: input.refId ?? 0,
      code: input.code ?? "", description: input.description ?? "", createdBy: input.createdBy ?? "",
    },
  });
}

/**
 * Charge the wallet for a purchase. Guards against overdraw (best-effort: a tiny
 * race window is acceptable for a mock gateway). Returns the created entry or an error.
 */
export async function chargeWallet(opts: { userId: number; amount: number; source: WalletSource; refId: number; code?: string; description?: string }):
  Promise<{ ok: true; entryId: number; balance: number } | { ok: false; error: string }> {
  const amount = round2(opts.amount);
  if (!(amount > 0)) return { ok: false, error: "Invalid amount." };
  const balance = await walletBalance(opts.userId);
  if (balance < amount) return { ok: false, error: "INSUFFICIENT_FUNDS" };
  const entry = await addWalletEntry({
    userId: opts.userId, type: "SPEND", amount, source: opts.source, refId: opts.refId,
    code: opts.code, description: opts.description, method: "MANUAL",
  });
  return { ok: true, entryId: entry.id, balance: round2(balance - amount) };
}

/** Refund money back to a customer's wallet (e.g. when a wallet-paid item is cancelled). */
export async function refundToWallet(opts: { userId: number; amount: number; source: WalletSource; refId: number; code?: string; description?: string; createdBy?: string }) {
  const amount = round2(opts.amount);
  if (!(amount > 0)) return null;
  return addWalletEntry({ userId: opts.userId, type: "REFUND", amount, source: opts.source, refId: opts.refId, code: opts.code, description: opts.description ?? "Refund to wallet", createdBy: opts.createdBy });
}
