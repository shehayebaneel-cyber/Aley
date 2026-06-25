import { prisma } from "../db";

// Marketplace settings live in the Setting key/value table. Defaults below are
// the source of truth for the keys; admin-saved values overlay them.
export const MARKETPLACE_DEFAULTS = {
  deliveryFee: 3,
  freeDeliveryThreshold: 30, // 0 = no free delivery
  commissionRate: 10, // platform % applied to a business unless it has its own rate
};
export type MarketplaceSettings = typeof MARKETPLACE_DEFAULTS;

const KEYS: Record<keyof MarketplaceSettings, string> = {
  deliveryFee: "marketplace.deliveryFee",
  freeDeliveryThreshold: "marketplace.freeDeliveryThreshold",
  commissionRate: "marketplace.commissionRate",
};

export async function getMarketplaceSettings(): Promise<MarketplaceSettings> {
  const rows = await prisma.setting.findMany({ where: { key: { in: Object.values(KEYS) } } });
  const map = new Map(rows.map((r) => [r.key, Number(r.value)]));
  return {
    deliveryFee: map.get(KEYS.deliveryFee) ?? MARKETPLACE_DEFAULTS.deliveryFee,
    freeDeliveryThreshold: map.get(KEYS.freeDeliveryThreshold) ?? MARKETPLACE_DEFAULTS.freeDeliveryThreshold,
    commissionRate: map.get(KEYS.commissionRate) ?? MARKETPLACE_DEFAULTS.commissionRate,
  };
}

export async function saveMarketplaceSettings(partial: Partial<Record<keyof MarketplaceSettings, unknown>>): Promise<MarketplaceSettings> {
  const entries = (Object.keys(KEYS) as (keyof MarketplaceSettings)[]).filter((k) => k in partial);
  await prisma.$transaction(
    entries.map((k) => {
      const value = String(Math.max(0, Number(partial[k]) || 0));
      return prisma.setting.upsert({ where: { key: KEYS[k] }, create: { key: KEYS[k], value }, update: { value } });
    })
  );
  return getMarketplaceSettings();
}

/** Effective commission rate for a business (0 on the business = use the platform default). */
export const effectiveCommission = (businessRate: number, settings: MarketplaceSettings) =>
  businessRate && businessRate > 0 ? businessRate : settings.commissionRate;
