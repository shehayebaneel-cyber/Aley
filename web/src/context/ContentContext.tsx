import { createContext, ReactNode, useContext, useEffect, useState } from "react";
import { api } from "../lib/api";

export interface GemItem { title: string; sub: string; to: string; img: string }
export interface SectionMeta { show: boolean; title?: string; subtitle?: string }

export interface SiteContent {
  brand: { name: string; tagline: string; footerText: string };
  contact: { address: string; phone: string; email: string; instagram: string; whatsapp: string };
  hero: { badge: string; title: string; subtitle: string; image: string; searchPlaceholder: string };
  sections: {
    stats: { show: boolean };
    categories: SectionMeta;
    featured: SectionMeta;
    community: SectionMeta;
    gems: SectionMeta & { items: GemItem[] };
    offers: SectionMeta;
    events: SectionMeta;
    mapCta: SectionMeta;
  };
  about: { title: string; body: string; image: string };
  loveAley: { title: string; subtitle: string; image: string };
}

// Client-side mirror of the server defaults — renders instantly before fetch.
export const DEFAULT_CONTENT: SiteContent = {
  brand: { name: "Aley", tagline: "Discover Lebanon, one city at a time", footerText: "The platform to discover businesses, events, offers and more across Lebanon — starting with Aley." },
  contact: { address: "Aley, Mount Lebanon", phone: "+961 5 000 000", email: "hello@aley.com", instagram: "aley", whatsapp: "" },
  hero: {
    badge: "",
    title: "Discover the best of Lebanon",
    subtitle: "Find local businesses, events, offers, gift cards and community projects across Lebanon — all in one platform.",
    image: "https://images.unsplash.com/photo-1483728642387-6c3bdd6c93e5?auto=format&fit=crop&w=1920&h=1080&q=70",
    searchPlaceholder: "Search cafés, restaurants, services…",
  },
  sections: {
    stats: { show: true },
    categories: { show: true, title: "Popular categories", subtitle: "Browse by what you need" },
    featured: { show: true, title: "Featured businesses", subtitle: "Hand-picked places" },
    community: { show: true, title: "Community Projects", subtitle: "Back the projects making our cities better — transparently, together." },
    gems: {
      show: true, title: "Hidden Gems", subtitle: "Curated picks worth discovering",
      items: [
        { title: "Quiet cafés to study", sub: "Wi-Fi, plugs & calm corners", to: "/explore?category=coffee-shops", img: "https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?auto=format&fit=crop&w=600&h=450&q=70" },
        { title: "Best breakfast spots", sub: "Start your morning right", to: "/explore?q=breakfast", img: "https://images.unsplash.com/photo-1442512595331-e89e73853f31?auto=format&fit=crop&w=600&h=450&q=70" },
        { title: "Family-friendly places", sub: "Fun for everyone", to: "/explore?q=family", img: "https://images.unsplash.com/photo-1414235077428-338989a2e8c0?auto=format&fit=crop&w=600&h=450&q=70" },
        { title: "Sunset views", sub: "Golden hour over the mountains", to: "/explore?q=view", img: "https://images.unsplash.com/photo-1458668383970-8ddd3927deed?auto=format&fit=crop&w=600&h=450&q=70" },
        { title: "Local favorites", sub: "Most-loved by locals", to: "/explore?sort=reviews", img: "https://images.unsplash.com/photo-1555396273-367ea4eb4db5?auto=format&fit=crop&w=600&h=450&q=70" },
        { title: "Late-night eats", sub: "Open when you need them", to: "/explore?openNow=true&category=restaurants", img: "https://images.unsplash.com/photo-1517244683847-7456b63c5969?auto=format&fit=crop&w=600&h=450&q=70" },
      ],
    },
    offers: { show: true, title: "Exclusive Offers", subtitle: "Deals happening now" },
    events: { show: true, title: "Featured Events", subtitle: "Discover things to do" },
    mapCta: { show: true, title: "Explore on the map", subtitle: "Filter by open now, coffee, food, parking, study-friendly and more." },
  },
  about: {
    title: "Why We Built This",
    body: "Every city in Lebanon deserves one digital home where residents, visitors, and businesses can connect. This platform was created to support local businesses, promote community projects, and make discovering your city easier, faster, and more beautiful — starting with Aley and growing across Lebanon.",
    image: "https://images.unsplash.com/photo-1454496522488-7a8e488e8606?auto=format&fit=crop&w=1600&h=700&q=70",
  },
  loveAley: {
    title: "Love Your City ❤",
    subtitle: "Your city, your impact. Support community projects, volunteer, vote on ideas, and help make your city better — transparently.",
    image: "https://images.unsplash.com/photo-1472791108553-c9405341e398?auto=format&fit=crop&w=1600&h=700&q=70",
  },
};

const ContentContext = createContext<SiteContent>(DEFAULT_CONTENT);

export function ContentProvider({ children }: { children: ReactNode }) {
  const [content, setContent] = useState<SiteContent>(DEFAULT_CONTENT);
  useEffect(() => {
    api.get<SiteContent>("/api/content").then(setContent).catch(() => {});
  }, []);
  return <ContentContext.Provider value={content}>{children}</ContentContext.Provider>;
}

export const useContent = () => useContext(ContentContext);
