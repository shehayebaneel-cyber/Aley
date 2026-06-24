import { Router } from "express";
import { optionalUser, requireUser } from "../auth";
import { prisma } from "../db";
import { recomputeProject } from "../lib/ratings";
import { outProject, slugify } from "../lib/serialize";

export const projectsRouter = Router();

const STR = (v: unknown, max = 2000) => String(v ?? "").slice(0, max).trim();

// Hide donor identity on public output when the donation is anonymous.
const publicDonation = (d: { donorName: string; amount: number; message: string; anonymous: boolean; createdAt: Date }) => ({
  donorName: d.anonymous ? "Anonymous" : d.donorName,
  amount: d.amount,
  message: d.message,
  anonymous: d.anonymous,
  createdAt: d.createdAt,
});

// GET /api/projects — list (filters: city, status, type, sort)
projectsRouter.get("/", async (req, res) => {
  const q = req.query as Record<string, string>;
  const where: Record<string, unknown> = { isPublished: true };
  if (q.city) where.city = { is: { slug: q.city } };
  if (q.status) where.status = q.status;
  if (q.type) where.type = q.type;
  const orderBy =
    q.sort === "raised" ? [{ amountRaised: "desc" as const }]
    : q.sort === "votes" ? [{ voteCount: "desc" as const }]
    : q.sort === "newest" ? [{ createdAt: "desc" as const }]
    : [{ isFeatured: "desc" as const }, { createdAt: "desc" as const }];
  const projects = await prisma.project.findMany({ where, orderBy });
  res.json(projects.map(outProject));
});

// GET /api/projects/summary — homepage stats
projectsRouter.get("/summary", async (req, res) => {
  const city = String(req.query.city ?? "aley");
  const where = { isPublished: true, city: { is: { slug: city } } };
  const [active, completed, all, featured] = await Promise.all([
    prisma.project.count({ where: { ...where, status: { in: ["FUNDING", "APPROVED", "IN_PROGRESS"] } } }),
    prisma.project.count({ where: { ...where, status: "COMPLETED" } }),
    prisma.project.findMany({ where }),
    prisma.project.findMany({ where: { ...where, status: { not: "PROPOSED" } }, orderBy: [{ isFeatured: "desc" }, { amountRaised: "desc" }], take: 3 }),
  ]);
  const totalRaised = Math.round(all.reduce((s, p) => s + p.amountRaised, 0) * 100) / 100;
  res.json({ active, completed, totalRaised, contributors: all.reduce((s, p) => s + p.contributorCount, 0), featured: featured.map(outProject) });
});

// GET /api/projects/:slug — full project (optional user → voted/following flags)
projectsRouter.get("/:slug", optionalUser, async (req, res) => {
  const project = await prisma.project.findUnique({
    where: { slug: req.params.slug },
    include: {
      donations: { orderBy: { createdAt: "desc" } },
      expenses: { orderBy: { createdAt: "asc" } },
      updates: { orderBy: { createdAt: "desc" } },
      comments: { orderBy: { createdAt: "desc" }, take: 100 },
      _count: { select: { follows: true, votes: true } },
    },
  });
  if (!project || !project.isPublished) return res.status(404).json({ error: "Project not found." });

  const updates = project.updates.map((u) => ({ ...u, images: JSON.parse(u.images || "[]") }));
  let hasVoted = false, isFollowing = false;
  if (req.userId) {
    hasVoted = !!(await prisma.projectVote.findUnique({ where: { projectId_userId: { projectId: project.id, userId: req.userId } } }));
    isFollowing = !!(await prisma.projectFollow.findUnique({ where: { projectId_userId: { projectId: project.id, userId: req.userId } } }));
  }
  res.json({
    ...outProject(project),
    donations: project.donations.map(publicDonation),
    expenses: project.expenses,
    updates,
    comments: project.comments,
    followerCount: project._count.follows,
    hasVoted,
    isFollowing,
  });
});

// POST /api/projects/suggest — a resident proposes a project (held as PROPOSED)
projectsRouter.post("/suggest", optionalUser, async (req, res) => {
  const title = STR(req.body.title, 140);
  if (!title) return res.status(400).json({ error: "A project title is required." });
  const submittedBy = STR(req.body.submittedBy, 80) || "A resident";
  let base = slugify(title) || "project";
  let slug = base;
  for (let i = 2; await prisma.project.findUnique({ where: { slug } }); i++) slug = `${base}-${i}`;
  const aley = await prisma.city.findUnique({ where: { slug: "aley" } });
  const project = await prisma.project.create({
    data: {
      slug, cityId: aley!.id, title, type: STR(req.body.type, 40),
      description: STR(req.body.description, 3000), location: STR(req.body.location, 160),
      fundingGoal: Math.max(0, Number(req.body.fundingGoal) || 0),
      status: "PROPOSED", submittedBy, submittedByUserId: req.userId ?? null,
    },
  });
  res.status(201).json(outProject(project));
});

// POST /api/projects/:id/donate — record a donation (payment simulated for now)
projectsRouter.post("/:id/donate", optionalUser, async (req, res) => {
  const id = Number(req.params.id);
  const project = await prisma.project.findUnique({ where: { id } });
  if (!project || !project.isPublished) return res.status(404).json({ error: "Project not found." });
  const amount = Math.round(Number(req.body.amount) * 100) / 100;
  if (!(amount > 0)) return res.status(400).json({ error: "Enter a donation amount." });
  const anonymous = !!req.body.anonymous;
  const donorName = anonymous ? "Anonymous" : STR(req.body.donorName, 80) || "A supporter";
  await prisma.donation.create({ data: { projectId: id, userId: req.userId ?? null, donorName, amount, anonymous, message: STR(req.body.message, 300) } });
  await recomputeProject(id);
  const updated = await prisma.project.findUnique({ where: { id } });
  res.status(201).json({ ok: true, message: "Thank you for supporting Aley! 💚", project: outProject(updated!) });
});

// POST /api/projects/:id/comment
projectsRouter.post("/:id/comment", optionalUser, async (req, res) => {
  const id = Number(req.params.id);
  const project = await prisma.project.findUnique({ where: { id } });
  if (!project) return res.status(404).json({ error: "Project not found." });
  const body = STR(req.body.body, 1000);
  let authorName = STR(req.body.authorName, 80);
  if (!authorName && req.userId) authorName = (await prisma.user.findUnique({ where: { id: req.userId } }))?.name ?? "";
  if (!body || !authorName) return res.status(400).json({ error: "Name and a message are required." });
  const comment = await prisma.projectComment.create({ data: { projectId: id, userId: req.userId ?? null, authorName, body } });
  res.status(201).json(comment);
});

// POST /api/projects/:id/vote — toggle (requires account)
projectsRouter.post("/:id/vote", requireUser, async (req, res) => {
  const projectId = Number(req.params.id);
  const existing = await prisma.projectVote.findUnique({ where: { projectId_userId: { projectId, userId: req.userId! } } });
  if (existing) await prisma.projectVote.delete({ where: { id: existing.id } });
  else await prisma.projectVote.create({ data: { projectId, userId: req.userId! } });
  await recomputeProject(projectId);
  const count = await prisma.projectVote.count({ where: { projectId } });
  res.json({ voted: !existing, voteCount: count });
});

// POST /api/projects/:id/follow — toggle (requires account)
projectsRouter.post("/:id/follow", requireUser, async (req, res) => {
  const projectId = Number(req.params.id);
  const existing = await prisma.projectFollow.findUnique({ where: { projectId_userId: { projectId, userId: req.userId! } } });
  if (existing) await prisma.projectFollow.delete({ where: { id: existing.id } });
  else await prisma.projectFollow.create({ data: { projectId, userId: req.userId! } });
  const count = await prisma.projectFollow.count({ where: { projectId } });
  res.json({ following: !existing, followerCount: count });
});
