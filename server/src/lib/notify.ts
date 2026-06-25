// Raise an admin alert: stored in the Notification table (always visible in the
// admin panel) and emailed to the admin (best-effort — see mailer.ts).
import { prisma } from "../db";
import { sendMail } from "./mailer";

export async function notifyAdmins(n: { kind: string; title: string; body?: string; link?: string }) {
  await prisma.notification.create({
    data: { kind: n.kind, title: n.title, body: n.body ?? "", link: n.link ?? "" },
  });
  const base = process.env.PUBLIC_BASE_URL || "http://localhost:5174";
  await sendMail({
    subject: `[Aley admin] ${n.title}`,
    html: `<h2 style="font-family:sans-serif">${n.title}</h2><p style="font-family:sans-serif">${n.body ?? ""}</p>${
      n.link ? `<p><a href="${base}${n.link}">Open in admin →</a></p>` : ""
    }`,
    text: `${n.title}\n\n${n.body ?? ""}\n\n${n.link ? base + n.link : ""}`,
  });
}
