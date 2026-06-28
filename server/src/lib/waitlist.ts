import { prisma } from "../db";
import { notifyAdmins } from "./notify";

// When an appointment frees up, flag the next waiting customer and alert the business.
export async function notifyNextWaitlist(businessId: number, date: string): Promise<void> {
  const next = await prisma.waitlist.findFirst({
    where: { businessId, date, status: "WAITING" },
    orderBy: { createdAt: "asc" },
  });
  if (!next) return;
  await prisma.waitlist.update({ where: { id: next.id }, data: { status: "NOTIFIED" } });
  const biz = await prisma.business.findUnique({ where: { id: businessId }, select: { name: true } });
  await notifyAdmins({
    kind: "WAITLIST",
    title: `Waitlist spot opened: ${biz?.name ?? ""}`,
    body: `${next.customerName} (${next.customerPhone}) was next in line for ${date}. Contact them to offer the slot.`,
    link: "/admin/businesses",
  });
}
