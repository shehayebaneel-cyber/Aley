import { api } from "./api";

// Client-side translation cache + batching. Each unique string is fetched once,
// then remembered in localStorage across sessions.
type Target = "ar" | "en";

const STORE_KEY = "aley-translations";
const mem: Record<Target, Map<string, string>> = { ar: new Map(), en: new Map() };

// Hand-curated overrides for short, ambiguous strings machine translation gets
// wrong out of context (e.g. weekday abbreviations: "Sun" -> sun, "Wed" -> wed).
const SEED: Record<Target, Record<string, string>> = {
  ar: {
    Sun: "الأحد", Mon: "الإثنين", Tue: "الثلاثاء", Wed: "الأربعاء", Thu: "الخميس", Fri: "الجمعة", Sat: "السبت",
    New: "جديد", Open: "مفتوح", Closed: "مغلق",
  },
  en: {},
};

function load() {
  try {
    const raw = JSON.parse(localStorage.getItem(STORE_KEY) || "{}");
    for (const t of ["ar", "en"] as Target[]) {
      mem[t] = new Map(Object.entries(raw[t] ?? {}));
      for (const [k, v] of Object.entries(SEED[t])) mem[t].set(k, v);
    }
  } catch {
    /* ignore */
  }
}
load();

let saveTimer: ReturnType<typeof setTimeout> | null = null;
function persist() {
  if (saveTimer) return;
  saveTimer = setTimeout(() => {
    saveTimer = null;
    try {
      localStorage.setItem(STORE_KEY, JSON.stringify({ ar: Object.fromEntries(mem.ar), en: Object.fromEntries(mem.en) }));
    } catch {
      /* ignore quota */
    }
  }, 500);
}

/** Look up an already-cached translation (no network). */
export function cachedTranslation(text: string, target: Target): string | undefined {
  return mem[target].get(text);
}

/**
 * Translate a list of strings. Returns a map of original -> translation.
 * Only uncached strings hit the network; results are cached for next time.
 */
export async function translateBatch(texts: string[], target: Target): Promise<Map<string, string>> {
  const result = new Map<string, string>();
  const need: string[] = [];
  for (const t of texts) {
    const hit = mem[target].get(t);
    if (hit !== undefined) result.set(t, hit);
    else if (!need.includes(t)) need.push(t);
  }
  if (need.length) {
    try {
      const { translations } = await api.post<{ translations: string[] }>("/api/translate", { texts: need, target });
      need.forEach((src, i) => {
        const tr = translations[i] ?? src;
        mem[target].set(src, tr);
        result.set(src, tr);
      });
      persist();
    } catch {
      need.forEach((src) => result.set(src, src)); // fail safe to original
    }
  }
  return result;
}
