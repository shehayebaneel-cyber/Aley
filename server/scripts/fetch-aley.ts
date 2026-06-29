import { writeFileSync } from "fs";
import { toCsv } from "../src/lib/csv";

// Pulls Aley businesses from OpenStreetMap (Overpass API) and writes a CSV ready
// for the admin "Import businesses" screen. OSM data is free + openly licensed
// (ODbL — attribution). Run: npm run fetch:aley
// Output columns: name, category, phone, address, lat, lng, website

const CENTER = { lat: 33.8056, lng: 35.6011 };
const RADIUS_M = 4000;

// OSM tag value -> our category slug. Only mapped rows are exported.
const SHOP: Record<string, string> = {
  supermarket: "supermarkets", convenience: "convenience-stores", kiosk: "convenience-stores", grocery: "supermarkets",
  bakery: "bakeries", pastry: "pastry-shops", confectionery: "sweets", butcher: "butcher-shops", seafood: "fish-markets",
  greengrocer: "organic-food", deli: "organic-food", alcohol: "wine-spirits", wine: "wine-spirits", beverages: "wine-spirits",
  clothes: "fashion", fashion: "fashion", boutique: "fashion", shoes: "shoe-stores", bag: "accessories", jewelry: "jewelry",
  watches: "jewelry", cosmetics: "cosmetics-perfumes", perfumery: "cosmetics-perfumes", beauty: "beauty-salons",
  hairdresser: "beauty-salons", optician: "opticians", chemist: "pharmacies",
  mobile_phone: "mobile-shops", electronics: "electronics", computer: "computer-stores", hifi: "electronics",
  furniture: "furniture", interior_decoration: "home-decor", houseware: "kitchen-supplies", kitchen: "kitchen-supplies",
  hardware: "hardware-stores", doityourself: "hardware-stores", florist: "florists", garden_centre: "garden-centers",
  books: "bookstores", stationery: "stationery", gift: "gift-shops", toys: "toy-stores", pet: "pet-shops",
  sports: "sports-stores", bicycle: "sports-stores", tobacco: "tobacco-vape", "e-cigarette": "tobacco-vape",
  car: "car-accessories", car_parts: "auto-parts", car_repair: "mechanics", tyres: "tire-shops", car_wash: "car-washes",
  travel_agency: "travel-agencies", art: "art-supplies", photo: "photography", copyshop: "printing-shops",
};
const AMENITY: Record<string, string> = {
  restaurant: "restaurants", cafe: "coffee-shops", fast_food: "fast-food", food_court: "fast-food", ice_cream: "ice-cream",
  bar: "nightlife", pub: "nightlife", pharmacy: "pharmacies", clinic: "clinics", doctors: "clinics", dentist: "dentists",
  hospital: "hospitals", veterinary: "veterinary", bank: "banks", bureau_de_change: "banks", fuel: "gas-stations",
  car_wash: "car-washes", car_rental: "car-rentals", car_repair: "mechanics", fitness_centre: "gyms", cinema: "cinemas",
  school: "schools", kindergarten: "nurseries", college: "universities", university: "universities", language_school: "language-centers",
  driving_school: "driving-schools", music_school: "music-schools", taxi: "taxi", fuel_station: "gas-stations",
};
const HEALTHCARE: Record<string, string> = { pharmacy: "pharmacies", dentist: "dentists", doctor: "clinics", physiotherapist: "physiotherapy", optometrist: "opticians", clinic: "clinics", laboratory: "medical-labs", hospital: "hospitals" };
const LEISURE: Record<string, string> = { fitness_centre: "gyms", sports_centre: "sports-clubs", pitch: "football-fields", swimming_pool: "swimming-pools", stadium: "sports-clubs" };
const TOURISM: Record<string, string> = { hotel: "hotels", guest_house: "guest-houses", hostel: "guest-houses", apartment: "apartments", motel: "hotels" };
const OFFICE: Record<string, string> = { lawyer: "lawyers", accountant: "accounting", estate_agent: "real-estate", insurance: "insurance", it: "software-development", architect: "architects", financial: "financial-advisors", company: "consultants", consulting: "consultants" };
const CRAFT: Record<string, string> = { electrician: "electricians", plumber: "plumbers", photographer: "photography", tailor: "fashion", carpenter: "contractors", caterer: "catering", car_repair: "mechanics", hvac: "contractors", painter: "contractors" };

function categoryFor(t: Record<string, string>): string | null {
  if (t.shop && SHOP[t.shop]) return SHOP[t.shop];
  if (t.amenity && AMENITY[t.amenity]) return AMENITY[t.amenity];
  if (t.healthcare && HEALTHCARE[t.healthcare]) return HEALTHCARE[t.healthcare];
  if (t.leisure && LEISURE[t.leisure]) return LEISURE[t.leisure];
  if (t.tourism && TOURISM[t.tourism]) return TOURISM[t.tourism];
  if (t.office && OFFICE[t.office]) return OFFICE[t.office];
  if (t.craft && CRAFT[t.craft]) return CRAFT[t.craft];
  if (t.shop) return "convenience-stores"; // generic shop fallback
  return null;
}

const QUERY = `[out:json][timeout:90];
(
  node["shop"](around:${RADIUS_M},${CENTER.lat},${CENTER.lng});
  way["shop"](around:${RADIUS_M},${CENTER.lat},${CENTER.lng});
  node["amenity"](around:${RADIUS_M},${CENTER.lat},${CENTER.lng});
  way["amenity"](around:${RADIUS_M},${CENTER.lat},${CENTER.lng});
  node["healthcare"](around:${RADIUS_M},${CENTER.lat},${CENTER.lng});
  node["leisure"](around:${RADIUS_M},${CENTER.lat},${CENTER.lng});
  way["leisure"](around:${RADIUS_M},${CENTER.lat},${CENTER.lng});
  node["tourism"](around:${RADIUS_M},${CENTER.lat},${CENTER.lng});
  way["tourism"](around:${RADIUS_M},${CENTER.lat},${CENTER.lng});
  node["office"](around:${RADIUS_M},${CENTER.lat},${CENTER.lng});
  node["craft"](around:${RADIUS_M},${CENTER.lat},${CENTER.lng});
);
out center tags;`;

const MIRRORS = [
  "https://overpass-api.de/api/interpreter",
  "https://overpass.kumi.systems/api/interpreter",
  "https://lz4.overpass-api.de/api/interpreter",
];

async function fetchOverpass(): Promise<string> {
  let lastErr = "";
  for (const url of MIRRORS) {
    try {
      const res = await fetch(url, {
        method: "POST",
        headers: {
          "Content-Type": "application/x-www-form-urlencoded",
          Accept: "application/json",
          "User-Agent": "AleyPlatform/1.0 (local business directory; contact owner@aley.com)",
        },
        body: "data=" + encodeURIComponent(QUERY),
      });
      if (res.ok) return res.text();
      lastErr = `${url} → HTTP ${res.status}`;
    } catch (e) {
      lastErr = `${url} → ${e instanceof Error ? e.message : "failed"}`;
    }
    console.log(`  …${lastErr}, trying next mirror`);
  }
  throw new Error(`All Overpass mirrors failed (${lastErr}). The public API is busy — wait a minute and retry.`);
}

async function main() {
  console.log("Querying OpenStreetMap (Overpass) for Aley businesses…");
  const text = await fetchOverpass();
  const data = JSON.parse(text) as { elements: { type: string; lat?: number; lon?: number; center?: { lat: number; lon: number }; tags?: Record<string, string> }[] };

  const seen = new Set<string>();
  const rows: (string | number)[][] = [];
  let skippedNoName = 0, skippedNoCat = 0, skippedDup = 0;
  for (const el of data.elements) {
    const t = el.tags ?? {};
    const name = (t.name || t["name:en"] || t["name:ar"] || "").trim();
    if (!name) { skippedNoName++; continue; }
    const category = categoryFor(t);
    if (!category) { skippedNoCat++; continue; }
    const key = name.toLowerCase();
    if (seen.has(key)) { skippedDup++; continue; }
    seen.add(key);
    const lat = el.lat ?? el.center?.lat ?? "";
    const lng = el.lon ?? el.center?.lon ?? "";
    const phone = (t.phone || t["contact:phone"] || t["contact:mobile"] || "").trim();
    const website = (t.website || t["contact:website"] || "").trim();
    const address = [t["addr:housenumber"], t["addr:street"]].filter(Boolean).join(" ").trim();
    rows.push([name, category, phone, address, lat, lng, website]);
  }

  const csv = toCsv(["name", "category", "phone", "address", "lat", "lng", "website"], rows);
  const out = "aley-businesses.csv";
  writeFileSync(out, csv, "utf8");
  console.log(`✅ Wrote ${rows.length} businesses to ${out}`);
  console.log(`   (skipped: ${skippedNoName} without a name, ${skippedNoCat} uncategorized, ${skippedDup} duplicates)`);
  console.log(`   Next: open it in Excel, tidy it up, then upload it in /admin → Import businesses.`);
}
main().catch((e) => { console.error(e); process.exit(1); });
