// Best-effort email. When SMTP_* env vars are set it sends for real (nodemailer);
// otherwise it logs the message to the console so nothing breaks before creds exist.
import nodemailer from "nodemailer";

const { SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS, MAIL_FROM, ADMIN_EMAIL } = process.env;

const configured = !!(SMTP_HOST && SMTP_PORT && SMTP_USER && SMTP_PASS);
const transport = configured
  ? nodemailer.createTransport({
      host: SMTP_HOST,
      port: Number(SMTP_PORT),
      secure: Number(SMTP_PORT) === 465,
      auth: { user: SMTP_USER, pass: SMTP_PASS },
    })
  : null;

export const adminEmail = () => ADMIN_EMAIL || "";

export async function sendMail(opts: { to?: string; subject: string; html: string; text?: string }) {
  const to = opts.to || ADMIN_EMAIL;
  if (!to) return;
  if (!transport) {
    console.log(`📧 [email stub — set SMTP_* to send] To: ${to}\n   ${opts.subject}`);
    return;
  }
  try {
    await transport.sendMail({
      from: MAIL_FROM || `Aley Platform <${SMTP_USER}>`,
      to,
      subject: opts.subject,
      html: opts.html,
      text: opts.text,
    });
  } catch (e) {
    console.error("✉️  email send failed:", e instanceof Error ? e.message : e);
  }
}
