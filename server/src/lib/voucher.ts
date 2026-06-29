import { randomBytes } from "crypto";
import { prisma } from "../db";

// Gift vouchers: secure code generation + status helpers.

// Unambiguous alphabet (no 0/O/1/I) for human-readable, hard-to-guess codes.
const ALPHABET = "ABCDEFGHJKMNPQRSTUVWXYZ23456789";
function randomCode(): string {
  const bytes = randomBytes(12);
  let out = "";
  for (let i = 0; i < 12; i++) out += ALPHABET[bytes[i] % ALPHABET.length];
  return `AV-${out.slice(0, 4)}-${out.slice(4, 8)}-${out.slice(8, 12)}`;
}

/** A unique voucher code (retries on the rare collision). */
export async function uniqueVoucherCode(): Promise<string> {
  for (let i = 0; i < 6; i++) {
    const code = randomCode();
    const exists = await prisma.voucher.findUnique({ where: { code } });
    if (!exists) return code;
  }
  return `AV-${randomBytes(8).toString("hex").toUpperCase()}`;
}

/** Effective status accounting for expiry (does not mutate the row). */
export function effectiveStatus(v: { status: string; expiresAt: Date | null }): string {
  if (v.status === "ACTIVE" && v.expiresAt && v.expiresAt.getTime() < Date.now()) return "EXPIRED";
  return v.status;
}

export const isRedeemable = (v: { status: string; expiresAt: Date | null }) => effectiveStatus(v) === "ACTIVE";
