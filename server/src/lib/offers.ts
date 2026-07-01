import { randomBytes } from "crypto";
import { prisma } from "../db";

// Offer taxonomy + helpers for the deals-marketplace experience.

export interface OfferTypeDef { key: string; label: string; defaultBadge: string; emoji: string }
export const OFFER_TYPES: OfferTypeDef[] = [
  { key: "PERCENT", label: "Percentage discount", defaultBadge: "% OFF", emoji: "🏷️" },
  { key: "BOGO", label: "Buy One Get One", defaultBadge: "Buy 1 Get 1", emoji: "🎯" },
  { key: "FREE_ITEM", label: "Free item", defaultBadge: "Free Gift", emoji: "🎁" },
  { key: "HAPPY_HOUR", label: "Happy hour", defaultBadge: "Happy Hour", emoji: "🍹" },
  { key: "PACKAGE", label: "Package deal", defaultBadge: "Bundle Deal", emoji: "📦" },
  { key: "STUDENT", label: "Student discount", defaultBadge: "Student Deal", emoji: "🎓" },
  { key: "BIRTHDAY", label: "Birthday offer", defaultBadge: "Birthday Treat", emoji: "🎂" },
  { key: "SEASONAL", label: "Seasonal offer", defaultBadge: "Seasonal", emoji: "❄️" },
  { key: "FIRST_VISIT", label: "First visit offer", defaultBadge: "First Visit", emoji: "👋" },
  { key: "LOYALTY", label: "Loyalty offer", defaultBadge: "Loyalty Reward", emoji: "⭐" },
  { key: "DISCOUNT", label: "Discount", defaultBadge: "Deal", emoji: "🏷️" }, // legacy
];
const TYPE_MAP: Record<string, OfferTypeDef> = Object.fromEntries(OFFER_TYPES.map((t) => [t.key, t]));

export const offerTypeLabel = (type: string) => TYPE_MAP[type]?.label ?? "Deal";
export const offerTypeEmoji = (type: string) => TYPE_MAP[type]?.emoji ?? "🏷️";
/** Big promo label for a card: explicit badge wins, else a sensible default per type. */
export const offerBadge = (o: { badge?: string | null; type: string }) =>
  (o.badge && o.badge.trim()) || TYPE_MAP[o.type]?.defaultBadge || "Deal";

const DAY = 86400000;

/** Unique customer-facing claim code, e.g. AV-OF-7K3M-92QD. */
export async function uniqueOfferCode(): Promise<string> {
  const part = () => randomBytes(2).toString("hex").toUpperCase();
  for (let i = 0; i < 8; i++) {
    const code = `AV-OF-${part()}-${part()}`;
    if (!(await prisma.offerRedemption.findUnique({ where: { code } }))) return code;
  }
  return `AV-OF-${Date.now().toString(36).toUpperCase()}`;
}

type OfferRow = {
  id: number; title: string; description: string; type: string; badge: string; terms: string;
  redeemInfo: string; image: string | null; startDate: Date | null; endDate: Date | null;
  isActive: boolean; isFeatured: boolean; maxRedemptions: number; redeemedCount: number;
  viewCount: number; createdAt: Date;
  business?: { slug: string; name: string; logo: string | null; cover: string | null; address?: string | null; rating?: number; reviewCount?: number; category?: unknown } | null;
};

/** Shape an offer for the cards / detail with derived marketplace fields. */
export function outOffer(o: OfferRow, opts: { saved?: boolean; now?: number } = {}) {
  const now = opts.now ?? Date.now();
  const end = o.endDate ? new Date(o.endDate).getTime() : null;
  const daysLeft = end != null ? Math.ceil((end - now) / DAY) : null;
  const soldOut = o.maxRedemptions > 0 && o.redeemedCount >= o.maxRedemptions;
  return {
    id: o.id,
    title: o.title,
    description: o.description,
    type: o.type,
    typeLabel: offerTypeLabel(o.type),
    badge: offerBadge(o),
    terms: o.terms,
    redeemInfo: o.redeemInfo,
    image: o.image,
    startDate: o.startDate,
    endDate: o.endDate,
    isFeatured: o.isFeatured,
    isNew: now - new Date(o.createdAt).getTime() < 14 * DAY,
    isExpiringSoon: daysLeft != null && daysLeft >= 0 && daysLeft <= 7,
    daysLeft,
    redeemedCount: o.redeemedCount,
    remaining: o.maxRedemptions > 0 ? Math.max(0, o.maxRedemptions - o.redeemedCount) : null,
    soldOut,
    viewCount: o.viewCount,
    createdAt: o.createdAt,
    saved: opts.saved ?? false,
    business: o.business
      ? { slug: o.business.slug, name: o.business.name, logo: o.business.logo, cover: o.business.cover, address: o.business.address ?? null, rating: o.business.rating ?? 0, reviewCount: o.business.reviewCount ?? 0, category: o.business.category ?? null }
      : null,
  };
}
