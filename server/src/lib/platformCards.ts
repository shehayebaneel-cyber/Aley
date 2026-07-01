import { randomBytes } from "crypto";
import { prisma } from "../db";

// Platform Gift Cards: redeemable anywhere on the platform (credited to the
// recipient's wallet). Code generation, default designs, and display helpers.

const ALPHABET = "ABCDEFGHJKMNPQRSTUVWXYZ23456789"; // no 0/O/1/I
function randomCode(): string {
  const bytes = randomBytes(12);
  let out = "";
  for (let i = 0; i < 12; i++) out += ALPHABET[bytes[i] % ALPHABET.length];
  return `GC-${out.slice(0, 4)}-${out.slice(4, 8)}-${out.slice(8, 12)}`;
}

/** A unique platform gift-card code (retries on the rare collision). */
export async function uniquePlatformCode(): Promise<string> {
  for (let i = 0; i < 6; i++) {
    const code = randomCode();
    if (!(await prisma.platformGiftCard.findUnique({ where: { code } }))) return code;
  }
  return `GC-${randomBytes(8).toString("hex").toUpperCase()}`;
}

/** Effective status accounting for expiry (does not mutate the row). */
export function cardStatus(c: { status: string; expiresAt: Date | null }): string {
  if (c.status === "ACTIVE" && c.expiresAt && c.expiresAt.getTime() < Date.now()) return "EXPIRED";
  return c.status;
}

// Seed a handful of tasteful default designs the first time the feature is used,
// so the buy page and admin manager are never empty. Idempotent.
const DEFAULT_DESIGNS = [
  { name: "Classic", occasion: "GENERAL", emoji: "🎁", gradient: "from-brand to-brand-dark", sortOrder: 0 },
  { name: "Happy Birthday", occasion: "BIRTHDAY", emoji: "🎂", gradient: "from-pink-500 to-rose-500", sortOrder: 1 },
  { name: "Season's Greetings", occasion: "HOLIDAY", emoji: "🎄", gradient: "from-emerald-500 to-teal-600", sortOrder: 2 },
  { name: "Congratulations", occasion: "CONGRATS", emoji: "🎉", gradient: "from-amber-500 to-orange-600", sortOrder: 3 },
  { name: "Just Married", occasion: "WEDDING", emoji: "💍", gradient: "from-fuchsia-500 to-purple-600", sortOrder: 4 },
  { name: "Graduation", occasion: "GRADUATION", emoji: "🎓", gradient: "from-sky-500 to-indigo-600", sortOrder: 5 },
  { name: "Anniversary", occasion: "ANNIVERSARY", emoji: "❤️", gradient: "from-red-500 to-rose-600", sortOrder: 6 },
  { name: "Thank You", occasion: "THANK_YOU", emoji: "🙏", gradient: "from-cyan-500 to-blue-600", sortOrder: 7 },
];

let ensured = false;
export async function ensureDefaultDesigns() {
  if (ensured) return;
  const count = await prisma.platformCardDesign.count();
  if (count === 0) {
    await prisma.platformCardDesign.createMany({ data: DEFAULT_DESIGNS });
  }
  ensured = true;
}

type DesignRow = { id: number; name: string; occasion: string; emoji: string; gradient: string; image: string | null; minValue: number; maxValue: number; presets: string; active: boolean; sortOrder: number };

/** Shape a design for the public buy page (parses presets JSON). */
export function outDesign(d: DesignRow) {
  let presets: number[] = [25, 50, 100, 250];
  try { const p = JSON.parse(d.presets); if (Array.isArray(p)) presets = p.map(Number).filter((n) => n > 0); } catch { /* keep default */ }
  return { id: d.id, name: d.name, occasion: d.occasion, emoji: d.emoji, gradient: d.gradient, image: d.image, minValue: d.minValue, maxValue: d.maxValue, presets, active: d.active, sortOrder: d.sortOrder };
}
