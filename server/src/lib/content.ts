import { prisma } from "../db";

// The editable site content (CMS). Stored as a single JSON blob in the Setting
// table under "site.content". Defaults below are merged with saved overrides so
// new fields appear automatically even on older saved content.
export const DEFAULT_CONTENT = {
  brand: {
    name: "Aley",
    tagline: "The pearl of the Lebanese mountains",
    footerText: "The official digital platform for Aley — discover businesses, events, and offers across the city.",
  },
  contact: {
    address: "Aley, Mount Lebanon",
    phone: "+961 5 000 000",
    email: "hello@aley.com",
    instagram: "aley",
    whatsapp: "",
  },
  hero: {
    badge: "",
    title: "Discover, Support & Experience Aley",
    subtitle: "Find local businesses, events, offers, places, and community projects — all in one platform built for Aley.",
    image: "https://loremflickr.com/1920/1080/lebanon,mountain,village?lock=4010",
    searchPlaceholder: "Search cafés, restaurants, services…",
  },
  sections: {
    stats: { show: true },
    categories: { show: true, title: "Popular categories", subtitle: "Browse by what you need" },
    featured: { show: true, title: "Featured businesses", subtitle: "Hand-picked places in Aley" },
    community: { show: true, title: "Help Build Aley", subtitle: "Fund the projects making Aley better — transparently, together." },
    gems: {
      show: true,
      title: "Hidden Gems in Aley",
      subtitle: "Curated picks worth discovering",
      items: [
        { title: "Quiet cafés to study", sub: "Wi-Fi, plugs & calm corners", to: "/explore?category=coffee-shops", img: "https://loremflickr.com/600/450/cafe,coffee,study?lock=51" },
        { title: "Best breakfast spots", sub: "Start your morning right", to: "/explore?q=breakfast", img: "https://loremflickr.com/600/450/breakfast,food?lock=52" },
        { title: "Family-friendly places", sub: "Fun for everyone", to: "/explore?q=family", img: "https://loremflickr.com/600/450/family,restaurant?lock=53" },
        { title: "Sunset views", sub: "Golden hour over the mountains", to: "/explore?q=view", img: "https://loremflickr.com/600/450/sunset,mountain,lebanon?lock=54" },
        { title: "Local favorites", sub: "Most-loved by Aley", to: "/explore?sort=reviews", img: "https://loremflickr.com/600/450/lebanese,food?lock=55" },
        { title: "Late-night eats", sub: "Open when you need them", to: "/explore?openNow=true&category=restaurants", img: "https://loremflickr.com/600/450/nightlife,restaurant?lock=56" },
      ],
    },
    offers: { show: true, title: "Current offers", subtitle: "Deals happening now" },
    events: { show: true, title: "Upcoming events", subtitle: "What's happening in Aley" },
    mapCta: { show: true, title: "Explore Aley on the map", subtitle: "Filter by open now, coffee, food, parking, study-friendly and more." },
  },
  about: {
    title: "Why We Built This",
    body: "Aley deserves one digital home where residents, visitors, and businesses can connect. This platform was created to support local businesses, promote community projects, and make discovering Aley easier, faster, and more beautiful.",
    image: "https://loremflickr.com/1600/700/lebanon,mountain,town?lock=4011",
  },
  loveAley: {
    title: "Love Aley ❤",
    subtitle: "Your town, your impact. Support community projects, volunteer, vote on ideas, and help make Aley more beautiful — transparently.",
    image: "https://loremflickr.com/1600/700/lebanon,mountain,nature?lock=4012",
  },
};

export type SiteContent = typeof DEFAULT_CONTENT;

// Deep-merge saved values onto defaults (objects merged; arrays/scalars replaced).
function isObj(v: unknown): v is Record<string, unknown> {
  return !!v && typeof v === "object" && !Array.isArray(v);
}
function deepMerge<T>(base: T, override: unknown): T {
  if (!isObj(base) || !isObj(override)) return (override === undefined ? base : (override as T));
  const out: Record<string, unknown> = { ...base };
  for (const key of Object.keys(override)) {
    out[key] = key in base ? deepMerge((base as Record<string, unknown>)[key], override[key]) : override[key];
  }
  return out as T;
}

export async function getContent(): Promise<SiteContent> {
  const row = await prisma.setting.findUnique({ where: { key: "site.content" } });
  if (!row) return DEFAULT_CONTENT;
  try {
    return deepMerge(DEFAULT_CONTENT, JSON.parse(row.value));
  } catch {
    return DEFAULT_CONTENT;
  }
}

export async function saveContent(content: unknown): Promise<SiteContent> {
  // Merge onto defaults so the stored blob is always complete/valid.
  const merged = deepMerge(DEFAULT_CONTENT, content);
  await prisma.setting.upsert({
    where: { key: "site.content" },
    create: { key: "site.content", value: JSON.stringify(merged) },
    update: { value: JSON.stringify(merged) },
  });
  return merged;
}
