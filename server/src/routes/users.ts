import bcrypt from "bcryptjs";
import { Router } from "express";
import { requireUser, signToken } from "../auth";
import { prisma } from "../db";
import { outBusiness } from "../lib/serialize";

const userToken = (id: number) => signToken({ userId: id, role: "user" });
const safe = (u: { id: number; name: string; email: string | null; avatar: string | null }) => ({ id: u.id, name: u.name, email: u.email, avatar: u.avatar });

// ---- Visitor authentication ----
export const userAuthRouter = Router();

userAuthRouter.post("/register", async (req, res) => {
  const name = String(req.body.name ?? "").trim();
  const email = String(req.body.email ?? "").trim().toLowerCase();
  const password = String(req.body.password ?? "");
  if (!name || !email || password.length < 6) return res.status(400).json({ error: "Name, email, and a password (6+ chars) are required." });
  if (await prisma.user.findUnique({ where: { email } })) return res.status(409).json({ error: "An account with this email already exists." });
  const user = await prisma.user.create({ data: { name, email, passwordHash: await bcrypt.hash(password, 10) } });
  res.status(201).json({ token: userToken(user.id), user: safe(user) });
});

userAuthRouter.post("/login", async (req, res) => {
  const email = String(req.body.email ?? "").trim().toLowerCase();
  const password = String(req.body.password ?? "");
  const user = await prisma.user.findUnique({ where: { email } });
  if (!user || !user.passwordHash || !(await bcrypt.compare(password, user.passwordHash))) {
    return res.status(401).json({ error: "Wrong email or password." });
  }
  res.json({ token: userToken(user.id), user: safe(user) });
});

// ---- Visitor account (token required) ----
export const userRouter = Router();
userRouter.use(requireUser);

// GET /api/me — profile + saved business slugs
userRouter.get("/", async (req, res) => {
  const user = await prisma.user.findUnique({ where: { id: req.userId! } });
  if (!user) return res.status(404).json({ error: "Account not found." });
  const favorites = await prisma.favorite.findMany({ where: { userId: user.id }, select: { businessId: true } });
  res.json({ user: safe(user), favoriteIds: favorites.map((f) => f.businessId) });
});

// GET /api/me/favorites — full saved businesses
userRouter.get("/favorites", async (req, res) => {
  const favorites = await prisma.favorite.findMany({
    where: { userId: req.userId! },
    orderBy: { createdAt: "desc" },
    include: { business: { include: { category: true } } },
  });
  res.json(favorites.map((f) => outBusiness(f.business)));
});

// POST /api/me/favorites/:businessId — save
userRouter.post("/favorites/:businessId", async (req, res) => {
  const businessId = Number(req.params.businessId);
  const business = await prisma.business.findUnique({ where: { id: businessId } });
  if (!business) return res.status(404).json({ error: "Business not found." });
  await prisma.favorite.upsert({
    where: { userId_businessId: { userId: req.userId!, businessId } },
    create: { userId: req.userId!, businessId },
    update: {},
  });
  res.status(201).json({ ok: true, favorited: true });
});

// DELETE /api/me/favorites/:businessId — unsave
userRouter.delete("/favorites/:businessId", async (req, res) => {
  const businessId = Number(req.params.businessId);
  await prisma.favorite.deleteMany({ where: { userId: req.userId!, businessId } });
  res.json({ ok: true, favorited: false });
});

// GET /api/me/orders — this customer's marketplace orders
userRouter.get("/orders", async (req, res) => {
  const orders = await prisma.order.findMany({
    where: { customerId: req.userId! },
    orderBy: { createdAt: "desc" },
    take: 50,
    include: { businessOrders: { include: { items: true, business: { select: { name: true, slug: true, logo: true } } } } },
  });
  res.json(orders);
});
