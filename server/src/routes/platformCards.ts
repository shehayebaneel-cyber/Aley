import { Router } from "express";
import { optionalUser, requireUser } from "../auth";
import { prisma } from "../db";
import { notifyAdmins } from "../lib/notify";
import { addWalletEntry, chargeWallet, walletBalance, walletSummary } from "../lib/wallet";
import { cardStatus, ensureDefaultDesigns, outDesign, uniquePlatformCode } from "../lib/platformCards";

export const platformCardsRouter = Router();
const STR = (v: unknown, max: number) => String(v ?? "").trim().slice(0, max);
const round2 = (n: number) => Math.round(n * 100) / 100;
const YEAR_MS = 365 * 86400000;

// GET /api/platform-cards/designs — active designs for the buy page.
platformCardsRouter.get("/designs", async (_req, res) => {
  await ensureDefaultDesigns();
  const rows = await prisma.platformCardDesign.findMany({ where: { active: true }, orderBy: [{ sortOrder: "asc" }, { id: "asc" }] });
  res.json(rows.map(outDesign));
});

// POST /api/platform-cards/buy — purchase a Platform Gift Card (mock payment) +
// optional gift scheduling. Money is a platform liability until the recipient
// redeems it to their wallet and spends it at a business (recorded there).
platformCardsRouter.post("/buy", optionalUser, async (req, res) => {
  const b = req.body ?? {};
  await ensureDefaultDesigns();
  const design = await prisma.platformCardDesign.findFirst({ where: { id: Number(b.designId), active: true } });
  if (!design) return res.status(404).json({ error: "Pick a gift card design." });

  const recipientName = STR(b.recipientName, 80);
  if (!recipientName) return res.status(400).json({ error: "Recipient name is required." });
  if (!b.recipientEmail && !b.recipientPhone) return res.status(400).json({ error: "Recipient email or phone is required." });

  const amount = round2(Number(b.amount) || 0);
  if (!(amount >= design.minValue) || amount > design.maxValue) {
    return res.status(400).json({ error: `Amount must be between $${design.minValue} and $${design.maxValue}.` });
  }
  const qty = Math.max(1, Math.min(20, Math.round(Number(b.quantity) || 1)));
  const total = round2(amount * qty);

  // Payment (mock). Wallet requires sign-in + sufficient balance.
  const payMethod = (STR(b.paymentMethod, 20) || "CARD").toUpperCase();
  if (payMethod === "WALLET") {
    if (!req.userId) return res.status(401).json({ error: "Please sign in to pay with your wallet." });
    const balance = await walletBalance(req.userId);
    if (balance < total) return res.status(402).json({ error: "Your wallet balance is too low for these gift cards.", code: "INSUFFICIENT_FUNDS", balance, total });
  }

  // Scheduling: a future deliverAt holds the card as PENDING_DELIVERY until then.
  const deliverAt = b.deliverAt ? new Date(String(b.deliverAt)) : null;
  const scheduled = deliverAt && !isNaN(deliverAt.getTime()) && deliverAt.getTime() > Date.now();
  const startFrom = scheduled ? deliverAt! : new Date();
  const expiresAt = new Date(startFrom.getTime() + YEAR_MS);

  const created = [];
  for (let i = 0; i < qty; i++) {
    const code = await uniquePlatformCode();
    created.push(await prisma.platformGiftCard.create({
      data: {
        code, designId: design.id, occasion: design.occasion, emoji: design.emoji, gradient: design.gradient,
        amount, balance: amount, status: scheduled ? "PENDING_DELIVERY" : "ACTIVE",
        purchaserUserId: req.userId ?? null, purchaserName: STR(b.purchaserName, 80), purchaserEmail: STR(b.purchaserEmail, 120),
        recipientName, recipientEmail: STR(b.recipientEmail, 120), recipientPhone: STR(b.recipientPhone, 40),
        message: STR(b.message, 500), deliverAt: scheduled ? deliverAt : null, paymentMethod: payMethod, expiresAt,
      },
    }));
  }
  const first = created[0];
  if (payMethod === "WALLET" && req.userId) {
    await chargeWallet({ userId: req.userId, amount: total, source: "PLATFORM_GIFTCARD", refId: first.id, code: first.code, description: `Platform gift card${qty > 1 ? ` ×${qty}` : ""} · $${amount}` });
  }
  await notifyAdmins({
    kind: "PLATFORM_CARD_SOLD",
    title: "Platform gift card sold",
    body: `${qty > 1 ? `${qty}× ` : ""}$${amount} platform gift card for ${recipientName}${scheduled ? ` — scheduled ${deliverAt!.toISOString().slice(0, 10)}` : ""}.`,
    link: "/admin/platform-cards",
  }).catch(() => {});
  res.status(201).json({ ok: true, code: first.code, codes: created.map((c) => c.code), count: qty, amount, total, scheduled: !!scheduled });
});

// GET /api/platform-cards/view/:code — public read-only card (for the recipient).
platformCardsRouter.get("/view/:code", async (req, res) => {
  const c = await prisma.platformGiftCard.findUnique({ where: { code: String(req.params.code).toUpperCase() } });
  if (!c) return res.status(404).json({ error: "Gift card not found." });
  res.json({
    code: c.code, amount: c.amount, balance: c.balance, status: cardStatus(c), occasion: c.occasion, emoji: c.emoji,
    gradient: c.gradient, recipientName: c.recipientName, message: c.message, deliverAt: c.deliverAt, expiresAt: c.expiresAt,
    redeemable: cardStatus(c) === "ACTIVE",
  });
});

// POST /api/platform-cards/redeem { code } — claim a card into the wallet.
platformCardsRouter.post("/redeem", requireUser, async (req, res) => {
  const code = STR(req.body?.code, 40).toUpperCase();
  if (!code) return res.status(400).json({ error: "Enter a gift card code." });
  const c = await prisma.platformGiftCard.findUnique({ where: { code } });
  if (!c) return res.status(404).json({ error: "That gift card code wasn't found." });
  const status = cardStatus(c);
  if (status === "REDEEMED") return res.status(409).json({ error: "This gift card has already been redeemed." });
  if (status === "PENDING_DELIVERY") return res.status(409).json({ error: "This gift card isn't active yet — check back on its delivery date." });
  if (status === "EXPIRED") return res.status(409).json({ error: "This gift card has expired." });
  if (status !== "ACTIVE") return res.status(409).json({ error: "This gift card can't be redeemed." });

  await prisma.platformGiftCard.update({ where: { id: c.id }, data: { status: "REDEEMED", balance: 0, redeemedByUserId: req.userId!, redeemedAt: new Date() } });
  await addWalletEntry({ userId: req.userId!, type: "GIFT", amount: c.amount, source: "PLATFORM_GIFTCARD", refId: c.id, code: c.code, method: "MANUAL", description: `Platform gift card redeemed${c.recipientName ? ` · for ${c.recipientName}` : ""}` });
  await notifyAdmins({ kind: "PLATFORM_CARD_REDEEMED", title: "Platform gift card redeemed", body: `$${c.amount} added to a wallet (${c.code}).`, link: "/admin/platform-cards" }).catch(() => {});
  res.json({ ok: true, amount: c.amount, wallet: await walletSummary(req.userId!) });
});
