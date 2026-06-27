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
    image: "https://images.unsplash.com/photo-1483728642387-6c3bdd6c93e5?auto=format&fit=crop&w=1920&h=1080&q=70",
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
        { title: "Quiet cafés to study", sub: "Wi-Fi, plugs & calm corners", to: "/explore?category=coffee-shops", img: "https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?auto=format&fit=crop&w=600&h=450&q=70" },
        { title: "Best breakfast spots", sub: "Start your morning right", to: "/explore?q=breakfast", img: "https://images.unsplash.com/photo-1442512595331-e89e73853f31?auto=format&fit=crop&w=600&h=450&q=70" },
        { title: "Family-friendly places", sub: "Fun for everyone", to: "/explore?q=family", img: "https://images.unsplash.com/photo-1414235077428-338989a2e8c0?auto=format&fit=crop&w=600&h=450&q=70" },
        { title: "Sunset views", sub: "Golden hour over the mountains", to: "/explore?q=view", img: "https://images.unsplash.com/photo-1458668383970-8ddd3927deed?auto=format&fit=crop&w=600&h=450&q=70" },
        { title: "Local favorites", sub: "Most-loved by Aley", to: "/explore?sort=reviews", img: "https://images.unsplash.com/photo-1555396273-367ea4eb4db5?auto=format&fit=crop&w=600&h=450&q=70" },
        { title: "Late-night eats", sub: "Open when you need them", to: "/explore?openNow=true&category=restaurants", img: "https://images.unsplash.com/photo-1517244683847-7456b63c5969?auto=format&fit=crop&w=600&h=450&q=70" },
      ],
    },
    offers: { show: true, title: "Current offers", subtitle: "Deals happening now" },
    events: { show: true, title: "Upcoming events", subtitle: "What's happening in Aley" },
    mapCta: { show: true, title: "Explore Aley on the map", subtitle: "Filter by open now, coffee, food, parking, study-friendly and more." },
  },
  about: {
    title: "Why We Built This",
    body: "Aley deserves one digital home where residents, visitors, and businesses can connect. This platform was created to support local businesses, promote community projects, and make discovering Aley easier, faster, and more beautiful.",
    image: "https://images.unsplash.com/photo-1454496522488-7a8e488e8606?auto=format&fit=crop&w=1600&h=700&q=70",
  },
  loveAley: {
    title: "Love Aley ❤",
    subtitle: "Your town, your impact. Support community projects, volunteer, vote on ideas, and help make Aley more beautiful — transparently.",
    image: "https://images.unsplash.com/photo-1472791108553-c9405341e398?auto=format&fit=crop&w=1600&h=700&q=70",
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
