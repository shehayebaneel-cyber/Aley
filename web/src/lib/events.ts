import type { EventItem } from "../types";

// Event category taxonomy (mirrors server lib/events.ts) for chips/pickers.
export const EVENT_CATEGORIES: { key: string; label: string; emoji: string }[] = [
  { key: "festivals", label: "Festivals", emoji: "🎪" },
  { key: "live-music", label: "Live Music", emoji: "🎤" },
  { key: "concerts", label: "Concerts", emoji: "🎸" },
  { key: "food-drinks", label: "Food & Drinks", emoji: "🍴" },
  { key: "coffee-events", label: "Coffee Events", emoji: "☕" },
  { key: "sports", label: "Sports", emoji: "🏅" },
  { key: "football", label: "Football", emoji: "⚽" },
  { key: "padel", label: "Padel", emoji: "🎾" },
  { key: "basketball", label: "Basketball", emoji: "🏀" },
  { key: "family", label: "Family", emoji: "👨‍👩‍👧" },
  { key: "kids", label: "Kids", emoji: "🧒" },
  { key: "community", label: "Community", emoji: "📢" },
  { key: "charity", label: "Charity", emoji: "🤝" },
  { key: "business", label: "Business", emoji: "💼" },
  { key: "workshops", label: "Workshops", emoji: "🛠️" },
  { key: "art-culture", label: "Art & Culture", emoji: "🎨" },
  { key: "theatre", label: "Theatre", emoji: "🎭" },
  { key: "cinema", label: "Cinema", emoji: "🎬" },
  { key: "nightlife", label: "Nightlife", emoji: "🍸" },
  { key: "car-meets", label: "Car Meets", emoji: "🚗" },
  { key: "fitness", label: "Fitness", emoji: "🏋️" },
  { key: "university", label: "University", emoji: "🎓" },
  { key: "religious", label: "Religious", emoji: "🕌" },
  { key: "seasonal", label: "Seasonal", emoji: "❄️" },
  { key: "holiday-events", label: "Holiday Events", emoji: "🎉" },
];
export const eventEmoji = (e: EventItem) => e.categoryEmoji ?? "📅";

const D = (e: EventItem) => new Date(e.startTime);
export const fmtDay = (iso: string) => new Date(iso).toLocaleDateString(undefined, { weekday: "short", month: "short", day: "numeric" });
export const fmtTime = (iso: string) => new Date(iso).toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" });
export const fmtFull = (iso: string) => new Date(iso).toLocaleString(undefined, { weekday: "long", month: "long", day: "numeric", hour: "numeric", minute: "2-digit" });
export const priceLabel = (e: EventItem) => (e.isFree ? "Free" : e.priceFrom ? `From $${e.priceFrom}` : "Paid");

// ---- Time bucketing (all from the single fetched dataset) ----
const startOfDay = (d: Date) => new Date(d.getFullYear(), d.getMonth(), d.getDate());
export function isToday(e: EventItem, now = new Date()) {
  const d = D(e); return d.toDateString() === now.toDateString();
}
export function isThisWeekend(e: EventItem, now = new Date()) {
  const d = D(e); const day = d.getDay();
  if (day !== 5 && day !== 6 && day !== 0) return false; // Fri/Sat/Sun
  const diff = (startOfDay(d).getTime() - startOfDay(now).getTime()) / 86400000;
  return diff >= 0 && diff <= 7;
}
export function withinDays(e: EventItem, days: number, now = new Date()) {
  const diff = (startOfDay(D(e)).getTime() - startOfDay(now).getTime()) / 86400000;
  return diff >= 0 && diff <= days;
}

/** Countdown parts to the event start (null once started). */
export function countdown(iso: string, nowMs: number): { d: number; h: number; m: number; s: number } | null {
  const diff = new Date(iso).getTime() - nowMs;
  if (diff <= 0) return null;
  const s = Math.floor(diff / 1000);
  return { d: Math.floor(s / 86400), h: Math.floor((s % 86400) / 3600), m: Math.floor((s % 3600) / 60), s: s % 60 };
}
