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
  brand: { name: "Aley", tagline: "The pearl of the Lebanese mountains", footerText: "The official digital platform for Aley — discover businesses, events, and offers across the city." },
  contact: { address: "Aley, Mount Lebanon", phone: "+961 5 000 000", email: "hello@aley.com", instagram: "aley", whatsapp: "" },
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
      show: true, title: "Hidden Gems in Aley", subtitle: "Curated picks worth discovering",
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

const ContentContext = createContext<SiteContent>(DEFAULT_CONTENT);

export function ContentProvider({ children }: { children: ReactNode }) {
  const [content, setContent] = useState<SiteContent>(DEFAULT_CONTENT);
  useEffect(() => {
    api.get<SiteContent>("/api/content").then(setContent).catch(() => {});
  }, []);
  return <ContentContext.Provider value={content}>{children}</ContentContext.Provider>;
}

export const useContent = () => useContext(ContentContext);
