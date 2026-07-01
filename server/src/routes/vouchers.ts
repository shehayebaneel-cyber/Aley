import { Router } from "express";
import { optionalUser } from "../auth";
import { prisma } from "../db";
import { recordTransaction } from "../lib/ledger";
import { chargeWallet, walletBalance } from "../lib/wallet";
import { notifyAdmins } from "../lib/notify";
import { effectiveStatus, outVoucherCard, uniqueVoucherCode, voucherAvailable } from "../lib/voucher";

export const vouchersRouter = Router();
const STR = (v: unknown, max: number) => String(v ?? "").trim().slice(0, max);

const VOUCHER_BIZ = { slug: true, name: true, logo: true, cover: true, category: { select: { slug: true, name: true, group: true, icon: true, color: true } } } as const;

// GET /api/vouchers — the gift-card marketplace (all buyable voucher products).
// Query: city, category(slug), group, q.
vouchersRouter.get("/", async (req, res) => {
  const q = req.query as Record<string, string>;
  const cat = q.category ? { is: { slug: q.category } } : q.group ? { is: { group: q.group } } : undefined;
  const rows = await prisma.voucherType.findMany({
    where: {
      status: "ACTIVE",
      business: { is: { isPublished: true, ...(q.city ? { city: { is: { slug: q.city } } } : {}), ...(cat ? { category: cat } : {}) } },
    },
    orderBy: [{ soldCount: "desc" }, { id: "desc" }],
    include: { business: { select: VOUCHER_BIZ } },
  });
  let cards = rows.filter(voucherAvailable).map(outVoucherCard);
  const ql = (q.q ?? "").trim().toLowerCase();
  if (ql) cards = cards.filter((c) => `${c.name} ${c.description} ${c.business?.name ?? ""}`.toLowerCase().includes(ql));
  res.json(cards);
});

// GET /api/vouchers/card/:id — a single gift-card product detail + similar cards.
vouchersRouter.get("/card/:id", optionalUser, async (req, res) => {
  const id = Number(req.params.id);
  const t = await prisma.voucherType.findUnique({
    where: { id },
    include: { business: { include: { category: true, city: { select: { slug: true, name: true } } } } },
  });
  if (!t || t.status !== "ACTIVE" || !t.business?.isPublished) return res.status(404).json({ error: "Gift card not found." });
  const saved = req.userId ? !!(await prisma.voucherSave.findUnique({ where: { voucherTypeId_userId: { voucherTypeId: id, userId: req.userId } } })) : false;
  const similarRows = await prisma.voucherType.findMany({
    where: { status: "ACTIVE", id: { not: id }, business: { is: { isPublished: true, categoryId: t.business.categoryId } } },
    orderBy: [{ soldCount: "desc" }, { id: "desc" }], take: 6, include: { business: { select: VOUCHER_BIZ } },
  });
  res.json({
    ...outVoucherCard(t),
    saved,
    business: {
      slug: t.business.slug, name: t.business.name, logo: t.business.logo, cover: t.business.cover,
      address: t.business.address, rating: t.business.rating, reviewCount: t.business.reviewCount,
      phone: t.business.phone, whatsapp: t.business.whatsapp, category: t.business.category,
    },
    similar: similarRows.filter(voucherAvailable).map(outVoucherCard),
  });
});

// GET /api/vouchers/:slug — a business's active voucher products (for the buy modal).
vouchersRouter.get("/:slug", async (req, res) => {
  const business = await prisma.business.findUnique({ where: { slug: req.params.slug } });
  if (!business || !business.isPublished) return res.status(404).json({ error: "Not found." });
  const types = await prisma.voucherType.findMany({ where: { businessId: business.id, status: "ACTIVE" }, orderBy: [{ sortOrder: "asc" }, { id: "asc" }] });
  res.json({
    businessId: business.id, businessName: business.name, businessLogo: business.logo,
    types: types
      .filter((t) => t.maxQuantity === 0 || t.soldCount < t.maxQuantity)
      .map((t) => ({ id: t.id, kind: t.kind, name: t.name, description: t.description, image: t.image, value: t.value, price: t.price, expiryDays: t.expiryDays, terms: t.terms })),
  });
});

// GET /api/vouchers/view/:code — public read-only voucher (for the recipient).
vouchersRouter.get("/view/:code", async (req, res) => {
  const v = await prisma.voucher.findUnique({
    where: { code: String(req.params.code).toUpperCase() },
    include: { business: { select: { name: true, slug: true, logo: true } }, voucherType: { select: { terms: true, description: true } } },
  });
  if (!v) return res.status(404).json({ error: "Voucher not found." });
  res.json({
    code: v.code, kind: v.kind, title: v.title, value: v.value, balance: v.balance,
    status: effectiveStatus(v), expiresAt: v.expiresAt, recipientName: v.recipientName, message: v.message,
    business: v.business, terms: v.voucherType?.terms ?? "",
  });
});

// POST /api/vouchers/buy — purchase a gift voucher (mock payment) + optional gift scheduling.
vouchersRouter.post("/buy", optionalUser, async (req, res) => {
  const b = req.body ?? {};
  const business = await prisma.business.findUnique({ where: { id: Number(b.businessId) } });
  if (!business || !business.isPublished) return res.status(404).json({ error: "Not found." });
  const type = await prisma.voucherType.findFirst({ where: { id: Number(b.voucherTypeId), businessId: business.id, status: "ACTIVE" } });
  if (!type) return res.status(404).json({ error: "Voucher not available." });
  if (type.maxQuantity > 0 && type.soldCount >= type.maxQuantity) return res.status(409).json({ error: "This voucher is sold out." });

  const recipientName = STR(b.recipientName, 80);
  const purchaserName = STR(b.purchaserName, 80) || (req.userId ? "" : "");
  if (!recipientName) return res.status(400).json({ error: "Recipient name is required." });
  if (!b.recipientEmail && !b.recipientPhone) return res.status(400).json({ error: "Recipient email or phone is required." });

  // Amount: preset types use their value; custom (value 0) take the buyer's amount.
  const amount = type.value > 0 ? type.value : Math.max(1, Math.min(100000, Number(b.value) || 0));
  if (!amount) return res.status(400).json({ error: "A voucher amount is required." });
  const price = type.price > 0 ? type.price : amount;

  // Buy multiple, capped by remaining stock.
  const stockLeft = type.maxQuantity > 0 ? type.maxQuantity - type.soldCount : 20;
  const qty = Math.max(1, Math.min(20, Math.min(stockLeft, Math.round(Number(b.quantity) || 1))));
  const total = Math.round(price * qty * 100) / 100;

  // Payment method (mock). Wallet requires sign-in + sufficient balance.
  const payMethod = (STR(b.paymentMethod, 20) || "CARD").toUpperCase();
  if (payMethod === "WALLET") {
    if (!req.userId) return res.status(401).json({ error: "Please sign in to pay with your wallet." });
    const balance = await walletBalance(req.userId);
    if (balance < total) return res.status(402).json({ error: "Your wallet balance is too low for these gift cards.", code: "INSUFFICIENT_FUNDS", balance, total });
  }

  // Scheduling: a future deliverAt holds the voucher until that date.
  const deliverAt = b.deliverAt ? new Date(String(b.deliverAt)) : null;
  const scheduled = deliverAt && !isNaN(deliverAt.getTime()) && deliverAt.getTime() > Date.now();
  const startFrom = scheduled ? deliverAt! : new Date();
  const expiresAt = type.expiryDays > 0 ? new Date(startFrom.getTime() + type.expiryDays * 86400000) : null;

  const created = [];
  for (let i = 0; i < qty; i++) {
    const code = await uniqueVoucherCode();
    created.push(await prisma.voucher.create({
      data: {
        code, businessId: business.id, voucherTypeId: type.id, kind: type.kind, title: type.name,
        value: amount, balance: type.kind === "FIXED" ? amount : 0, price,
        purchaserUserId: req.userId ?? null, purchaserName, purchaserEmail: STR(b.purchaserEmail, 120),
        recipientName, recipientEmail: STR(b.recipientEmail, 120), recipientPhone: STR(b.recipientPhone, 40),
        message: STR(b.message, 500), deliverAt: scheduled ? deliverAt : null,
        status: scheduled ? "PENDING_DELIVERY" : "ACTIVE", expiresAt, paymentMethod: payMethod,
      },
    }));
  }
  const voucher = created[0];
  await prisma.voucherType.update({ where: { id: type.id }, data: { soldCount: { increment: qty } } });
  if (payMethod === "WALLET" && req.userId) {
    await chargeWallet({ userId: req.userId, amount: total, source: "VOUCHER", refId: voucher.id, code: voucher.code, description: `Gift card${qty > 1 ? ` ×${qty}` : ""} · ${type.name}` });
  }
  await recordTransaction({ businessId: business.id, source: "VOUCHER", refId: voucher.id, code: voucher.code, description: `Gift card${qty > 1 ? ` ×${qty}` : ""} · ${type.name}`, customerName: purchaserName || recipientName, customerPhone: STR(b.recipientPhone, 40), userId: req.userId ?? null, amount: total, method: voucher.paymentMethod });
  await notifyAdmins({
    kind: "VOUCHER_SOLD",
    title: `Gift card sold: ${business.name}`,
    body: `${qty > 1 ? `${qty}× ` : ""}${type.name} ($${amount}) for ${recipientName}${scheduled ? ` — scheduled ${deliverAt!.toISOString().slice(0, 10)}` : ""}.`,
    link: "/admin/vouchers",
  });
  res.status(201).json({ ok: true, voucher, codes: created.map((v) => v.code), count: qty, message: scheduled ? "Gift scheduled! It'll be delivered on the chosen date." : qty > 1 ? `${qty} gift cards purchased!` : "Voucher purchased! It's ready to use." });
});
