import { Router } from "express";
import { optionalUser } from "../auth";
import { prisma } from "../db";
import { recordTransaction } from "../lib/ledger";
import { notifyAdmins } from "../lib/notify";
import { effectiveStatus, uniqueVoucherCode } from "../lib/voucher";

export const vouchersRouter = Router();
const STR = (v: unknown, max: number) => String(v ?? "").trim().slice(0, max);

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

  // Scheduling: a future deliverAt holds the voucher until that date.
  const deliverAt = b.deliverAt ? new Date(String(b.deliverAt)) : null;
  const scheduled = deliverAt && !isNaN(deliverAt.getTime()) && deliverAt.getTime() > Date.now();
  const startFrom = scheduled ? deliverAt! : new Date();
  const expiresAt = type.expiryDays > 0 ? new Date(startFrom.getTime() + type.expiryDays * 86400000) : null;

  const code = await uniqueVoucherCode();
  const voucher = await prisma.voucher.create({
    data: {
      code, businessId: business.id, voucherTypeId: type.id, kind: type.kind, title: type.name,
      value: amount, balance: type.kind === "FIXED" ? amount : 0, price,
      purchaserUserId: req.userId ?? null, purchaserName, purchaserEmail: STR(b.purchaserEmail, 120),
      recipientName, recipientEmail: STR(b.recipientEmail, 120), recipientPhone: STR(b.recipientPhone, 40),
      message: STR(b.message, 500), deliverAt: scheduled ? deliverAt : null,
      status: scheduled ? "PENDING_DELIVERY" : "ACTIVE", expiresAt, paymentMethod: STR(b.paymentMethod, 20) || "CARD",
    },
  });
  await prisma.voucherType.update({ where: { id: type.id }, data: { soldCount: { increment: 1 } } });
  await recordTransaction({ businessId: business.id, source: "VOUCHER", refId: voucher.id, code: voucher.code, description: `Gift voucher · ${type.name}`, customerName: purchaserName || recipientName, customerPhone: STR(b.recipientPhone, 40), userId: req.userId ?? null, amount: price, method: voucher.paymentMethod });
  await notifyAdmins({
    kind: "VOUCHER_SOLD",
    title: `Gift voucher sold: ${business.name}`,
    body: `${type.name} ($${amount}) for ${recipientName}${scheduled ? ` — scheduled ${deliverAt!.toISOString().slice(0, 10)}` : ""}.`,
    link: "/admin/vouchers",
  });
  res.status(201).json({ ok: true, voucher, message: scheduled ? "Gift scheduled! It'll be delivered on the chosen date." : "Voucher purchased! It's ready to use." });
});
