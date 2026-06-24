import { prisma } from "../db";

/** Recompute a project's cached amountRaised + contributorCount from donations. */
export async function recomputeProject(projectId: number) {
  const donations = await prisma.donation.findMany({ where: { projectId } });
  const amountRaised = Math.round(donations.reduce((s, d) => s + d.amount, 0) * 100) / 100;
  const votes = await prisma.projectVote.count({ where: { projectId } });
  await prisma.project.update({ where: { id: projectId }, data: { amountRaised, contributorCount: donations.length, voteCount: votes } });
}

/** Recompute a business's cached rating + reviewCount from its APPROVED reviews. */
export async function recomputeRating(businessId: number) {
  const reviews = await prisma.review.findMany({ where: { businessId, status: "APPROVED" } });
  const count = reviews.length;
  const avg = count ? reviews.reduce((s, r) => s + r.rating, 0) / count : 0;
  await prisma.business.update({
    where: { id: businessId },
    data: { rating: Math.round(avg * 10) / 10, reviewCount: count },
  });
}
