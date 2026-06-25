// Demo-data generator for the Aley platform. Produces realistic businesses
// (real Aley names first, then generated ones) with galleries, reviews, hours,
// products/menus/collections/room-types, FAQs, offers and events.
//
// Everything here is demo/placeholder content meant to make the platform feel
// fully launched; the manager edits/verifies real details later.

export interface HoursRow { day: number; open: string; close: string; closed: boolean }
export interface ReviewSeed { authorName: string; rating: number; comment: string }
export interface ProductSection { title: string; items: { name: string; price?: number; description?: string }[] }
export interface OfferSeed { title: string; description: string; type: string }
export interface EventSeed { title: string; category: string; description: string; days: number }

export interface BizSeed {
  slug: string; name: string; category: string; tagline: string; description: string;
  logo: string; cover: string; gallery: string[];
  phone: string; whatsapp: string; instagram: string; facebook: string; website: string; email: string;
  address: string; lat: number; lng: number; hours: HoursRow[];
  priceRange: number; hasDelivery: boolean; hasReservations: boolean;
  tags: string[]; faqs: { q: string; a: string }[];
  products: ProductSection[]; productLabel: string; ownerName: string;
  isFeatured: boolean; isVerified: boolean; rating: number; reviewCount: number;
  reviews: ReviewSeed[]; offer?: OfferSeed; event?: EventSeed;
}

export const CATEGORIES: { slug: string; name: string; icon: string; color: string }[] = [
  { slug: "coffee-shops", name: "Coffee Shops", icon: "☕", color: "#b45309" },
  { slug: "restaurants", name: "Restaurants", icon: "🍽️", color: "#dc2626" },
  { slug: "fast-food", name: "Fast Food", icon: "🍔", color: "#ea580c" },
  { slug: "pizza", name: "Pizza", icon: "🍕", color: "#e11d48" },
  { slug: "shawarma", name: "Shawarma", icon: "🌯", color: "#b91c1c" },
  { slug: "sushi", name: "Sushi", icon: "🍣", color: "#db2777" },
  { slug: "lebanese", name: "Lebanese Restaurants", icon: "🫓", color: "#c2410c" },
  { slug: "bakeries", name: "Bakeries", icon: "🥐", color: "#d97706" },
  { slug: "roasteries", name: "Roasteries & Nuts", icon: "🥜", color: "#92400e" },
  { slug: "sweets", name: "Sweets & Candy", icon: "🍬", color: "#db2777" },
  { slug: "desserts", name: "Desserts", icon: "🍰", color: "#e11d48" },
  { slug: "ice-cream", name: "Ice Cream", icon: "🍦", color: "#f472b6" },
  { slug: "juice-bars", name: "Juice Bars", icon: "🥤", color: "#16a34a" },
  { slug: "hotels", name: "Hotels & Resorts", icon: "🏨", color: "#0ea5e9" },
  { slug: "fashion", name: "Fashion", icon: "👗", color: "#db2777" },
  { slug: "shoe-stores", name: "Shoe Stores", icon: "👟", color: "#7c3aed" },
  { slug: "accessories", name: "Accessories", icon: "👜", color: "#a855f7" },
  { slug: "sports-stores", name: "Sports Stores", icon: "🏀", color: "#ea580c" },
  { slug: "jewelry", name: "Jewelry", icon: "💍", color: "#a855f7" },
  { slug: "beauty-salons", name: "Beauty Salons", icon: "💅", color: "#ec4899" },
  { slug: "barbers", name: "Barbers", icon: "💈", color: "#0ea5e9" },
  { slug: "opticians", name: "Opticians", icon: "👓", color: "#0891b2" },
  { slug: "pharmacies", name: "Pharmacies", icon: "💊", color: "#059669" },
  { slug: "clinics", name: "Clinics", icon: "🩺", color: "#0d9488" },
  { slug: "dentists", name: "Dentists", icon: "🦷", color: "#0284c7" },
  { slug: "medical-labs", name: "Medical Labs", icon: "🧪", color: "#0e7490" },
  { slug: "veterinary", name: "Veterinary Clinics", icon: "🐾", color: "#16a34a" },
  { slug: "gyms", name: "Gyms", icon: "🏋️", color: "#ea580c" },
  { slug: "supermarkets", name: "Supermarkets", icon: "🛒", color: "#16a34a" },
  { slug: "electronics", name: "Electronics", icon: "📱", color: "#2563eb" },
  { slug: "mobile-shops", name: "Mobile Shops", icon: "📲", color: "#1d4ed8" },
  { slug: "furniture", name: "Furniture", icon: "🛋️", color: "#854d0e" },
  { slug: "home-decor", name: "Home Decor", icon: "🪴", color: "#15803d" },
  { slug: "hardware-stores", name: "Hardware Stores", icon: "🔩", color: "#57534e" },
  { slug: "florists", name: "Florists", icon: "🌸", color: "#ec4899" },
  { slug: "bookstores", name: "Bookstores", icon: "📚", color: "#7c3aed" },
  { slug: "gift-shops", name: "Gift Shops", icon: "🎁", color: "#db2777" },
  { slug: "pet-shops", name: "Pet Shops", icon: "🐶", color: "#d97706" },
  { slug: "car-washes", name: "Car Washes", icon: "🚿", color: "#0ea5e9" },
  { slug: "mechanics", name: "Mechanics", icon: "🔧", color: "#57534e" },
  { slug: "tire-shops", name: "Tire Shops", icon: "🛞", color: "#404040" },
  { slug: "gas-stations", name: "Gas Stations", icon: "⛽", color: "#dc2626" },
  { slug: "real-estate", name: "Real Estate", icon: "🏠", color: "#0891b2" },
  { slug: "banks", name: "Banks", icon: "🏦", color: "#1d4ed8" },
  { slug: "insurance", name: "Insurance", icon: "🛡️", color: "#0369a1" },
  { slug: "schools", name: "Schools", icon: "🎓", color: "#7c3aed" },
  { slug: "daycare", name: "Daycare", icon: "🧸", color: "#f59e0b" },
  { slug: "travel-agencies", name: "Travel Agencies", icon: "✈️", color: "#0284c7" },
  { slug: "photography", name: "Photography Studios", icon: "📷", color: "#9333ea" },
  { slug: "printing-shops", name: "Printing & Design", icon: "🖨️", color: "#4f46e5" },
  { slug: "interior-designers", name: "Interior Designers", icon: "🎨", color: "#be185d" },
  { slug: "construction", name: "Construction", icon: "🏗️", color: "#a16207" },
  { slug: "lawyers", name: "Lawyers & Notaries", icon: "⚖️", color: "#1e40af" },
  { slug: "accounting", name: "Accounting", icon: "🧾", color: "#0f766e" },
  { slug: "cleaning", name: "Cleaning Services", icon: "🧼", color: "#0ea5e9" },
  { slug: "electricians", name: "Electricians", icon: "⚡", color: "#ca8a04" },
  { slug: "plumbers", name: "Plumbers", icon: "🚰", color: "#0891b2" },
  { slug: "taxi", name: "Taxi Services", icon: "🚕", color: "#f59e0b" },
];

// Main groups (ordered) and which categories belong to each.
export const CATEGORY_GROUPS: { group: string; slugs: string[] }[] = [
  { group: "Food & Drinks", slugs: ["restaurants", "lebanese", "fast-food", "pizza", "shawarma", "sushi", "coffee-shops", "bakeries", "roasteries", "sweets", "desserts", "ice-cream", "juice-bars"] },
  { group: "Shopping", slugs: ["fashion", "shoe-stores", "accessories", "jewelry", "sports-stores", "electronics", "mobile-shops", "furniture", "home-decor", "hardware-stores", "florists", "bookstores", "gift-shops", "pet-shops", "supermarkets", "opticians"] },
  { group: "Health & Beauty", slugs: ["beauty-salons", "barbers", "gyms", "pharmacies", "clinics", "dentists", "medical-labs", "veterinary"] },
  { group: "Home & Auto", slugs: ["car-washes", "mechanics", "tire-shops", "gas-stations", "cleaning", "electricians", "plumbers", "construction", "interior-designers"] },
  { group: "Services", slugs: ["real-estate", "banks", "insurance", "lawyers", "accounting", "printing-shops", "photography", "travel-agencies", "taxi"] },
  { group: "Stay & Learn", slugs: ["hotels", "schools", "daycare"] },
];
export const GROUP_OF: Record<string, string> = Object.fromEntries(
  CATEGORY_GROUPS.flatMap((g) => g.slugs.map((s) => [s, g.group]))
);

// ---- small PRNG-ish helpers (Math.random is fine in a seed script) ----
const rand = <T>(a: T[]): T => a[Math.floor(Math.random() * a.length)];
const randInt = (a: number, b: number) => a + Math.floor(Math.random() * (b - a + 1));
const chance = (p: number) => Math.random() < p;
const sample = <T>(a: T[], n: number): T[] => [...a].sort(() => Math.random() - 0.5).slice(0, n);
const round2 = (n: number) => Math.round(n * 100) / 100;
const slugify = (s: string) => s.toLowerCase().trim().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");

// ---- Themed images: LoremFlickr (tag-matched photos) + UI-Avatars (logos) ----
const hashNum = (s: string) => { let h = 0; for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) >>> 0; return h % 100000; };
export const flickr = (seed: string, tags: string, w = 800, h = 600) => `https://loremflickr.com/${w}/${h}/${encodeURIComponent(tags)}?lock=${hashNum(seed)}`;
export const avatar = (name: string, color = "0d9488") => `https://ui-avatars.com/api/?name=${encodeURIComponent(name)}&background=${color}&color=fff&bold=true&size=256`;

const slugColor = new Map(CATEGORIES.map((c) => [c.slug, c.color.replace("#", "")]));
// Photo search tags per category, biased toward Aley / Mount Lebanon where it fits.
const TAGS: Record<string, string> = {
  "coffee-shops": "cafe,coffee,lebanon", restaurants: "restaurant,lebanese,food", "fast-food": "burger,fastfood", pizza: "pizza", shawarma: "shawarma,streetfood", sushi: "sushi,japanese", lebanese: "lebanese,mezze,food",
  bakeries: "bakery,bread,pastry", roasteries: "coffee,nuts,roastery", sweets: "baklava,sweets,dessert", desserts: "dessert,cake", "ice-cream": "icecream,gelato", "juice-bars": "juice,smoothie,fruit",
  hotels: "hotel,resort,mountain,lebanon", fashion: "fashion,boutique,clothing", "shoe-stores": "shoes,sneakers", accessories: "accessories,bags", "sports-stores": "sportswear,fitness", jewelry: "jewelry,gold,diamond",
  "beauty-salons": "salon,beauty,spa", barbers: "barbershop,haircut", opticians: "eyewear,glasses", pharmacies: "pharmacy,medicine", clinics: "clinic,medical", dentists: "dentist,dental", "medical-labs": "laboratory,medical", veterinary: "veterinary,pet",
  gyms: "gym,fitness", supermarkets: "supermarket,grocery", electronics: "electronics,gadgets", "mobile-shops": "smartphone,phone", furniture: "furniture,interior", "home-decor": "homedecor,interior", "hardware-stores": "hardware,tools",
  florists: "flowers,florist,bouquet", bookstores: "books,bookstore,library", "gift-shops": "gift,giftshop", "pet-shops": "petshop,dog,cat", "car-washes": "carwash,car", mechanics: "garage,mechanic,car", "tire-shops": "tires,car", "gas-stations": "gasstation,fuel",
  "real-estate": "house,realestate,mountain", banks: "bank,finance", insurance: "office,insurance", schools: "school,classroom", daycare: "kindergarten,kids", "travel-agencies": "travel,airplane,beach", photography: "camera,photography,studio",
  "printing-shops": "printing,design", "interior-designers": "interior,design,architecture", construction: "construction,building", lawyers: "law,office", accounting: "accounting,office", cleaning: "cleaning,service", electricians: "electrician,tools", plumbers: "plumbing,tools", taxi: "taxi,car",
};
export const tagsFor = (slug: string) => TAGS[slug] ?? "shop,store,lebanon";

const ALEY = { lat: 33.8056, lng: 35.6011 };
const FIRST = ["Rami", "Lara", "Sami", "Nadia", "Georges", "Maya", "Tony", "Carine", "Joseph", "Hala", "Karim", "Dina", "Elie", "Rana", "Marc", "Yara", "Walid", "Nour", "Fadi", "Maya", "Ziad", "Christelle", "Bilal", "Joelle", "Hadi", "Tala", "Rabih", "Sara", "Nabil", "Lea"];
const LAST = ["K.", "H.", "A.", "S.", "Md.", "Gh.", "Kh.", "B.", "N.", "Z.", "F.", "Y.", "T.", "R."];
const OWNER_FIRST = ["Élie", "Rami", "Georges", "Nadim", "Carla", "Joseph", "Walid", "Rita", "Tony", "Maya", "Khalil", "Sandra", "Marwan", "Lina", "Fadi", "Rana", "Ziad", "Carmen", "Nabil", "Joelle"];
const OWNER_LAST = ["Khoury", "Haddad", "Aoun", "Saliba", "Mansour", "Gemayel", "Nassar", "Abou Jaoude", "Rizk", "Sleiman", "Karam", "Bou Khalil", "Maalouf", "Chami", "Daher", "Ghanem", "Wakim", "Tannous", "Sfeir", "Azar"];

const STREETS = ["Main Road", "Bhamdoun Road", "Souk Street", "Boulevard", "Hilltop Avenue", "Old Aley Street", "Government Street", "Iglesia Street", "Mosque Square", "Sahet Aley", "Damascus Road", "Corniche Aley"];

function jitter() {
  return { lat: round2(ALEY.lat + (Math.random() - 0.5) * 0.02) + Math.random() * 0.001, lng: round2(ALEY.lng + (Math.random() - 0.5) * 0.02) + Math.random() * 0.001 };
}
function gallery(slug: string, tags: string) {
  const n = randInt(8, 15);
  return Array.from({ length: n }, (_, i) => flickr(`${slug}-g${i}`, tags, 900, 650));
}
function hours(open = "09:00", close = "22:00", closedDay = -1): HoursRow[] {
  return Array.from({ length: 7 }, (_, day) => ({ day, open, close, closed: day === closedDay }));
}
function makeReviews(category: string): { reviews: ReviewSeed[]; rating: number } {
  const n = randInt(2, 9);
  const pos = ["Amazing experience, highly recommend!", "Great service and friendly staff.", "Best in Aley, hands down.", "Loved it — will come back.", "Quality and prices are excellent.", "Clean, welcoming, and professional.", "Exceeded my expectations.", "A local gem.", "Fast, reliable, and great value."];
  const mid = ["Good overall, a few things could improve.", "Decent experience, nothing to complain about.", "Solid choice in the area.", "Pretty good, would visit again."];
  const reviews: ReviewSeed[] = Array.from({ length: n }, () => {
    const r = chance(0.72) ? 5 : chance(0.6) ? 4 : 3;
    return { authorName: `${rand(FIRST)} ${rand(LAST)}`, rating: r, comment: r >= 4 ? rand(pos) : rand(mid) };
  });
  const rating = round2(reviews.reduce((s, r) => s + r.rating, 0) / reviews.length);
  return { reviews, rating: Math.round(rating * 10) / 10 };
}

// ---- category → "kind" for products + descriptions ----
type Kind = "cafe" | "restaurant" | "roastery" | "sweets" | "bakery" | "icecream" | "juice" | "hotel" | "fashion" | "jewelry" | "shop" | "service" | "health" | "auto" | "edu";
const KIND: Record<string, Kind> = {
  "coffee-shops": "cafe", restaurants: "restaurant", "fast-food": "restaurant", pizza: "restaurant", shawarma: "restaurant", sushi: "restaurant", lebanese: "restaurant",
  bakeries: "bakery", roasteries: "roastery", sweets: "sweets", desserts: "sweets", "ice-cream": "icecream", "juice-bars": "juice",
  hotels: "hotel", fashion: "fashion", "shoe-stores": "fashion", accessories: "fashion", "sports-stores": "shop", jewelry: "jewelry",
  "beauty-salons": "service", barbers: "service", opticians: "shop", pharmacies: "shop", clinics: "health", dentists: "health", "medical-labs": "health", veterinary: "health",
  gyms: "service", supermarkets: "shop", electronics: "shop", "mobile-shops": "shop", furniture: "shop", "home-decor": "shop", "hardware-stores": "shop",
  florists: "shop", bookstores: "shop", "gift-shops": "shop", "pet-shops": "shop", "car-washes": "auto", mechanics: "auto", "tire-shops": "auto", "gas-stations": "auto",
  "real-estate": "service", banks: "service", insurance: "service", schools: "edu", daycare: "edu", "travel-agencies": "service", photography: "service",
  "printing-shops": "service", "interior-designers": "service", construction: "service", lawyers: "service", accounting: "service", cleaning: "service", electricians: "service", plumbers: "service", taxi: "service",
};

const AMENITIES: Record<Kind, string[]> = {
  cafe: ["wifi", "outdoor seating", "study friendly", "specialty coffee", "breakfast", "desserts", "family friendly", "parking", "card payment", "delivery"],
  restaurant: ["dine-in", "delivery", "takeaway", "outdoor seating", "family friendly", "reservations", "parking", "live music", "view", "card payment"],
  roastery: ["fresh roast", "nuts", "gift boxes", "wholesale", "delivery", "card payment", "parking"],
  sweets: ["arabic sweets", "gift boxes", "custom orders", "delivery", "card payment"],
  bakery: ["fresh daily", "manakish", "pastries", "delivery", "takeaway"],
  icecream: ["gelato", "takeaway", "family friendly", "delivery"],
  juice: ["fresh juice", "smoothies", "healthy", "delivery"],
  hotel: ["pool", "spa", "free wifi", "parking", "restaurant", "events", "mountain view", "room service"],
  fashion: ["new collections", "fitting rooms", "card payment", "personal styling", "gift cards"],
  jewelry: ["gold", "diamonds", "custom design", "repairs", "certificates"],
  shop: ["card payment", "delivery", "warranty", "wide selection", "parking"],
  service: ["by appointment", "card payment", "experienced staff", "free consultation", "home service"],
  health: ["by appointment", "insurance accepted", "modern equipment", "experienced doctors", "lab on-site"],
  auto: ["card payment", "quick service", "genuine parts", "warranty", "pickup"],
  edu: ["qualified staff", "safe environment", "modern facilities", "transport", "after-school"],
};

function productsFor(slug: string, kind: Kind): { products: ProductSection[]; label: string } {
  const money = (a: number, b: number) => round2(randInt(a, b));
  if (kind === "cafe")
    return { label: "Menu", products: [
      { title: "Hot Drinks", items: [["Espresso", 2, 3], ["Cappuccino", 3, 4], ["Café Latte", 3, 5], ["Turkish Coffee", 2, 3], ["Hot Chocolate", 3, 5]].map(([n, a, b]) => ({ name: n as string, price: money(a as number, b as number) })) },
      { title: "Cold Drinks", items: [["Iced Latte", 4, 6], ["Frappuccino", 5, 7], ["Fresh Lemonade", 3, 5], ["Iced Tea", 3, 4]].map(([n, a, b]) => ({ name: n as string, price: money(a as number, b as number) })) },
      { title: "Food", items: [["Croissant", 2, 4], ["Club Sandwich", 6, 9], ["Cheesecake", 5, 7], ["Pancakes", 6, 9]].map(([n, a, b]) => ({ name: n as string, price: money(a as number, b as number) })) },
    ] };
  if (kind === "restaurant")
    return { label: "Menu", products: [
      { title: "Starters", items: [["Hummus", 4, 6], ["Tabbouleh", 4, 6], ["Fattoush", 4, 6], ["Cheese Rolls", 5, 7]].map(([n, a, b]) => ({ name: n as string, price: money(a as number, b as number) })) },
      { title: "Mains", items: [["Mixed Grill", 14, 22], ["Shish Taouk", 10, 16], ["Grilled Fish", 16, 26], ["Pasta", 9, 14], ["Burger", 7, 12]].map(([n, a, b]) => ({ name: n as string, price: money(a as number, b as number) })) },
      { title: "Desserts", items: [["Knefe", 5, 8], ["Tiramisu", 5, 8], ["Fruit Plate", 6, 9]].map(([n, a, b]) => ({ name: n as string, price: money(a as number, b as number) })) },
    ] };
  if (kind === "roastery")
    return { label: "Products", products: [
      { title: "Coffee", items: [["Arabic Rakwe Blend (kg)", 14, 22], ["Espresso Beans (kg)", 16, 26], ["Turkish Ground (kg)", 13, 20]].map(([n, a, b]) => ({ name: n as string, price: money(a as number, b as number) })) },
      { title: "Nuts", items: [["Mixed Nuts (kg)", 12, 20], ["Cashews (kg)", 18, 28], ["Pistachios (kg)", 20, 32], ["Almonds (kg)", 12, 18]].map(([n, a, b]) => ({ name: n as string, price: money(a as number, b as number) })) },
      { title: "Chocolate & Gifts", items: [["Assorted Chocolate Box", 10, 20], ["Gift Hamper", 25, 60], ["Date Maamoul Box", 12, 22]].map(([n, a, b]) => ({ name: n as string, price: money(a as number, b as number) })) },
    ] };
  if (kind === "sweets")
    return { label: "Products", products: [{ title: "Sweets", items: [["Baklava (kg)", 14, 22], ["Maamoul (kg)", 12, 20], ["Mafroukeh", 10, 16], ["Assorted Box", 15, 30], ["Chocolate Selection", 10, 25]].map(([n, a, b]) => ({ name: n as string, price: money(a as number, b as number) })) }] };
  if (kind === "bakery")
    return { label: "Products", products: [{ title: "Fresh from the oven", items: [["Zaatar Manakish", 1, 3], ["Cheese Manakish", 2, 4], ["Kaak", 1, 2], ["Croissant", 2, 4], ["Spinach Fatayer", 1, 3]].map(([n, a, b]) => ({ name: n as string, price: money(a as number, b as number) })) }] };
  if (kind === "icecream")
    return { label: "Flavors", products: [{ title: "Scoops & treats", items: [["Single Scoop", 2, 4], ["Double Scoop", 4, 6], ["Sundae", 6, 9], ["Milkshake", 5, 8], ["Ashta & Honey", 5, 8]].map(([n, a, b]) => ({ name: n as string, price: money(a as number, b as number) })) }] };
  if (kind === "juice")
    return { label: "Menu", products: [{ title: "Fresh & healthy", items: [["Orange Juice", 3, 5], ["Cocktail", 5, 8], ["Avocado Smoothie", 5, 8], ["Detox Green", 5, 8], ["Protein Shake", 6, 9]].map(([n, a, b]) => ({ name: n as string, price: money(a as number, b as number) })) }] };
  if (kind === "hotel")
    return { label: "Rooms & Suites", products: [{ title: "Room types", items: [
      { name: "Standard Room", price: money(70, 110), description: "Cozy room with mountain view" },
      { name: "Deluxe Room", price: money(110, 170), description: "Spacious with balcony" },
      { name: "Junior Suite", price: money(160, 240), description: "Separate lounge area" },
      { name: "Family Suite", price: money(220, 340), description: "Two bedrooms, ideal for families" },
    ] }] };
  if (kind === "fashion")
    return { label: "Collections", products: [{ title: "Latest collection", items: [["Summer Collection", 0, 0], ["Casual Wear", 0, 0], ["Formal & Evening", 0, 0], ["Accessories", 0, 0], ["Footwear", 0, 0]].map(([n]) => ({ name: n as string, description: "New arrivals in store" })) }] };
  if (kind === "jewelry")
    return { label: "Collections", products: [{ title: "Our collections", items: [["Gold Collection", 0, 0], ["Diamond Rings", 0, 0], ["Wedding Bands", 0, 0], ["Watches", 0, 0], ["Custom Design", 0, 0]].map(([n]) => ({ name: n as string, description: "Visit us in store" })) }] };
  if (kind === "health")
    return { label: "Services", products: [{ title: "Services", items: [["Consultation", 20, 50], ["Check-up", 30, 80], ["Follow-up", 15, 40], ["Diagnostics", 25, 120]].map(([n, a, b]) => ({ name: n as string, price: money(a as number, b as number) })) }] };
  if (kind === "auto")
    return { label: "Services", products: [{ title: "Services", items: [["Oil Change", 20, 45], ["Full Wash", 8, 20], ["Tire Change", 5, 15], ["Diagnostics", 15, 40], ["Brake Service", 30, 90]].map(([n, a, b]) => ({ name: n as string, price: money(a as number, b as number) })) }] };
  if (kind === "edu")
    return { label: "Programs", products: [{ title: "Programs", items: [["Early Years", 0, 0], ["Primary", 0, 0], ["After-school", 0, 0], ["Summer Camp", 0, 0]].map(([n]) => ({ name: n as string, description: "Enrollment open" })) }] };
  if (kind === "shop") {
    const items = (SHOP_ITEMS[slug] ?? ["Featured Products", "New Arrivals", "Best Sellers"]).map((n) => ({ name: n }));
    return { label: "Departments", products: [{ title: "What we offer", items }] };
  }
  // service
  return { label: "Services", products: [{ title: "Services", items: (SERVICE_ITEMS[slug] ?? ["Consultation", "Standard Service", "Premium Service"]).map((n) => ({ name: n, price: round2(randInt(10, 80)) })) }] };
}

const SHOP_ITEMS: Record<string, string[]> = {
  supermarkets: ["Fresh Produce", "Bakery", "Dairy & Eggs", "Household", "Beverages", "Frozen"],
  electronics: ["TVs & Audio", "Laptops", "Home Appliances", "Accessories", "Smart Home"],
  "mobile-shops": ["Smartphones", "Cases & Covers", "Chargers", "Repairs", "Accessories"],
  furniture: ["Living Room", "Bedroom", "Dining", "Office", "Outdoor"],
  "home-decor": ["Lighting", "Rugs", "Wall Art", "Vases & Plants", "Candles"],
  "hardware-stores": ["Tools", "Paint", "Plumbing", "Electrical", "Fasteners"],
  florists: ["Bouquets", "Arrangements", "Wedding Flowers", "Plants", "Gift Baskets"],
  bookstores: ["Fiction", "Children", "Stationery", "Arabic Books", "Gifts"],
  "gift-shops": ["Gift Boxes", "Cards", "Toys", "Decor", "Custom Gifts"],
  "pet-shops": ["Dog Food", "Cat Food", "Toys", "Grooming", "Aquarium"],
  "sports-stores": ["Footwear", "Activewear", "Equipment", "Supplements", "Accessories"],
  opticians: ["Eyeglasses", "Sunglasses", "Contact Lenses", "Eye Exams", "Frames"],
  pharmacies: ["Medicines", "Cosmetics", "Baby Care", "Vitamins", "Medical Supplies"],
};
const SERVICE_ITEMS: Record<string, string[]> = {
  "beauty-salons": ["Haircut & Styling", "Coloring", "Manicure & Pedicure", "Facial", "Makeup", "Bridal Package"],
  barbers: ["Haircut", "Beard Trim", "Shave", "Hair Wash", "Kids Cut"],
  gyms: ["Monthly Membership", "Personal Training", "Group Classes", "CrossFit", "Day Pass"],
  "real-estate": ["Buy", "Sell", "Rent", "Property Management", "Valuation"],
  banks: ["Accounts", "Loans", "Cards", "Transfers", "ATM"],
  insurance: ["Car Insurance", "Health Insurance", "Home Insurance", "Life Insurance", "Travel"],
  "travel-agencies": ["Flight Booking", "Hotel Booking", "Tour Packages", "Visa Assistance", "Honeymoon"],
  photography: ["Weddings", "Portraits", "Events", "Products", "Studio Sessions"],
  "printing-shops": ["Business Cards", "Banners", "Graphic Design", "Flyers", "Large Format"],
  "interior-designers": ["Consultation", "Full Design", "3D Renders", "Renovation", "Decor"],
  construction: ["Building", "Renovation", "Concrete Works", "Finishing", "Project Management"],
  lawyers: ["Consultation", "Notary", "Contracts", "Real Estate Law", "Family Law"],
  accounting: ["Bookkeeping", "Tax Filing", "Payroll", "Audit", "Advisory"],
  cleaning: ["Home Cleaning", "Office Cleaning", "Deep Clean", "Windows", "Move-out"],
  electricians: ["Wiring", "Repairs", "Installations", "Generators", "Emergency"],
  plumbers: ["Repairs", "Installations", "Drain Cleaning", "Water Heaters", "Emergency"],
  taxi: ["City Rides", "Airport Transfer", "Hourly Hire", "Intercity", "Delivery"],
};

const TAGLINES: Partial<Record<Kind, string[]>> = {
  cafe: ["Coffee & cozy corners", "Your daily caffeine stop", "Brewed with love in Aley"],
  restaurant: ["A taste worth the trip", "Where Aley dines", "Fresh, local, delicious"],
  roastery: ["Freshly roasted, locally loved", "Nuts, coffee & gifts", "From bean to rakwe"],
  hotel: ["Mountain comfort & hospitality", "Your getaway in Aley", "Rest above the city"],
  fashion: ["Style that speaks", "Dress the part", "Curated for you"],
  jewelry: ["Timeless pieces", "Crafted to shine", "For your special moments"],
  service: ["Trusted local service", "We've got you covered", "Quality you can rely on"],
  health: ["Caring for Aley", "Your health, our priority", "Modern care, close to home"],
  shop: ["Everything you need", "Quality & value", "Shop local in Aley"],
  auto: ["Your car in good hands", "Fast, fair, reliable", "Drive worry-free"],
  edu: ["Where learning begins", "Nurturing young minds", "A brighter future"],
  bakery: ["Fresh from the oven", "Baked daily in Aley"],
  sweets: ["Sweeten your day", "Handmade with love"],
  icecream: ["Scoops of happiness", "Cool treats for everyone"],
  juice: ["Fresh & healthy", "Squeezed daily"],
};

function descriptionFor(name: string, kind: Kind, catName: string): string {
  const base: Record<Kind, string> = {
    cafe: `${name} is a beloved café in Aley serving freshly brewed specialty coffee, fresh juices, and a tasty all-day menu in a warm, welcoming space.`,
    restaurant: `${name} brings authentic flavors to Aley with a generous menu, fresh ingredients, and a comfortable atmosphere perfect for family meals and gatherings.`,
    roastery: `${name} roasts coffee fresh and offers premium nuts, chocolate, and beautiful gift boxes — a go-to in Aley for quality and aroma.`,
    sweets: `${name} is known across Aley for handmade Arabic sweets, chocolate, and custom gift boxes made fresh with the finest ingredients.`,
    bakery: `${name} bakes fresh manakish, pastries, and bread every morning — a neighborhood favorite in Aley.`,
    icecream: `${name} serves creamy ice cream, gelato, and refreshing treats the whole family will love.`,
    juice: `${name} blends fresh fruit into juices, smoothies, and healthy shakes daily in Aley.`,
    hotel: `${name} offers comfortable rooms, warm hospitality, and stunning mountain views — your perfect stay in Aley.`,
    fashion: `${name} brings the latest collections and timeless styles to Aley, with friendly service and a great selection.`,
    jewelry: `${name} offers fine jewelry, gold, and custom designs crafted with care — trusted in Aley for special moments.`,
    shop: `${name} is a trusted ${catName.toLowerCase()} in Aley offering a wide selection, fair prices, and helpful service.`,
    service: `${name} provides professional ${catName.toLowerCase()} in Aley with experienced staff and a commitment to quality.`,
    health: `${name} delivers modern, caring ${catName.toLowerCase()} services in Aley with experienced professionals and up-to-date equipment.`,
    auto: `${name} keeps you on the road with reliable ${catName.toLowerCase()} services, quick turnaround, and fair pricing in Aley.`,
    edu: `${name} provides a safe, nurturing learning environment in Aley with qualified staff and modern facilities.`,
  };
  return base[kind];
}

function faqsFor(kind: Kind): { q: string; a: string }[] {
  const common = [{ q: "What are your opening hours?", a: "Our hours are listed above; we're open most days of the week." }, { q: "Where are you located?", a: "We're in Aley — see the map on this page for directions." }, { q: "Do you accept card payments?", a: "Yes, we accept cash and cards." }];
  const extra: Partial<Record<Kind, { q: string; a: string }>> = {
    cafe: { q: "Do you have wifi?", a: "Yes — free wifi and plenty of seating to work or relax." },
    restaurant: { q: "Do you take reservations?", a: "Yes, call us or message on WhatsApp to book a table." },
    hotel: { q: "Is parking available?", a: "Yes, free on-site parking for guests." },
    health: { q: "Do you accept insurance?", a: "We work with most major insurers — contact us to confirm yours." },
    service: { q: "Do you offer home service?", a: "Yes, we can come to you — contact us for details." },
  };
  return extra[kind] ? [extra[kind]!, ...common] : common;
}

function offerFor(kind: Kind): OfferSeed | undefined {
  const map: Partial<Record<Kind, OfferSeed[]>> = {
    cafe: [{ title: "Buy 1 Get 1 Coffee", description: "Weekdays 3–5pm.", type: "HAPPY_HOUR" }],
    restaurant: [{ title: "20% Off Family Platters", description: "Weekends, dine-in or delivery.", type: "DISCOUNT" }],
    fashion: [{ title: "End of Season Sale", description: "Up to 40% off selected items.", type: "SEASONAL" }],
    shop: [{ title: "Weekend Deals", description: "Special prices all weekend.", type: "DISCOUNT" }],
    service: [{ title: "First Visit 15% Off", description: "New customers only.", type: "DISCOUNT" }],
    sweets: [{ title: "Free Box with every 2", description: "Limited-time loyalty deal.", type: "BOGO" }],
    health: [{ title: "Free First Consultation", description: "For new patients.", type: "DISCOUNT" }],
  };
  const arr = map[kind];
  return arr ? rand(arr) : undefined;
}

function phone() { return `+961 ${rand(["3", "70", "71", "76", "78", "81"])} ${randInt(100, 999)} ${randInt(100, 999)}`; }

function buildOne(name: string, category: string, opts: { real?: boolean } = {}): BizSeed {
  const kind = KIND[category] ?? "shop";
  const catName = CATEGORIES.find((c) => c.slug === category)?.name ?? category;
  const slug = slugify(name);
  const { reviews, rating } = makeReviews(category);
  const { lat, lng } = jitter();
  const ig = slugify(name).replace(/-/g, "");
  const open = kind === "cafe" || kind === "bakery" ? "07:00" : kind === "restaurant" ? "11:00" : "09:00";
  const close = kind === "restaurant" || kind === "cafe" ? "23:30" : kind === "hotel" ? "23:59" : "20:00";
  const { products, label } = productsFor(category, kind);
  return {
    slug, name, category, tagline: rand(TAGLINES[kind] ?? ["Proudly serving Aley"]),
    description: descriptionFor(name, kind, catName),
    logo: avatar(name, slugColor.get(category) ?? "0d9488"), cover: flickr(`${slug}-cover`, tagsFor(category), 1200, 600), gallery: gallery(slug, tagsFor(category)),
    phone: phone(), whatsapp: phone(), instagram: ig, facebook: `https://facebook.com/${ig}`,
    website: chance(0.4) ? `https://${ig}.demo.aley.com` : "", email: `info@${ig}.demo.aley.com`,
    address: `${rand(STREETS)}, Aley`, lat, lng, hours: hours(open, close, kind === "service" && chance(0.5) ? 0 : -1),
    priceRange: kind === "hotel" || kind === "jewelry" ? randInt(3, 4) : kind === "bakery" || kind === "juice" || kind === "icecream" ? randInt(1, 2) : randInt(1, 3),
    hasDelivery: ["cafe", "restaurant", "bakery", "sweets", "roastery", "juice", "icecream", "shop"].includes(kind) && chance(0.7),
    hasReservations: ["restaurant", "hotel", "service", "health"].includes(kind) && chance(0.7),
    tags: sample(AMENITIES[kind], randInt(3, 6)), faqs: faqsFor(kind), products, productLabel: label,
    ownerName: `${rand(OWNER_FIRST)} ${rand(OWNER_LAST)}`,
    isFeatured: opts.real ? chance(0.5) : chance(0.12), isVerified: opts.real ? true : chance(0.55),
    rating, reviewCount: reviews.length, reviews,
    offer: chance(0.3) ? offerFor(kind) : undefined,
    event: chance(0.1) ? { title: rand(["Live Music Night", "Weekend Special", "Community Day", "Grand Opening", "Tasting Event"]), category: rand(["Live Music", "Community", "Promotion"]), description: "Join us — everyone's welcome!", days: randInt(2, 20) } : undefined,
  };
}

// Real Aley businesses (names real; other details are demo placeholders).
const REALS: [string, string][] = [
  ["Bean Avenue", "coffee-shops"], ["Kahwet Aley", "coffee-shops"], ["Caves Caves", "coffee-shops"], ["Slices Resto Caffe", "coffee-shops"],
  ["Cafe Nowel", "roasteries"], ["Cafe Nowel Factory", "roasteries"], ["Roastery Hawasli Aley", "roasteries"], ["Ittihad Sweets", "sweets"], ["CandyHolic", "sweets"],
  ["Karam Jdoudna", "lebanese"], ["Da Vinci Restaurant", "restaurants"], ["Al Fanous", "restaurants"], ["Al Innab Restaurant", "restaurants"], ["Al Andaleeb", "restaurants"],
  ["Oishii", "sushi"], ["The Host", "restaurants"], ["Blue Resto Lounge", "restaurants"], ["Jay's Diner Burgers", "fast-food"], ["Taki Maki Sushi Aley", "sushi"],
  ["Pizzaiolo Wood Fired Pizza", "pizza"], ["Rakroka", "fast-food"], ["Dyarna El Khadra", "lebanese"], ["Al Sakhra Cliff House Restaurant", "restaurants"], ["Papaya Restaurant", "restaurants"],
  ["Raj Hotel Aley", "hotels"], ["Aley Suites", "hotels"], ["Golden Lili Resort & Spa", "hotels"], ["Cherry Blossom Resort", "hotels"],
  ["Aley Center", "supermarkets"], ["Merhi Trading Company", "electronics"], ["Computer Mania Aley", "electronics"],
  ["Vacancy Finders", "real-estate"], ["Maysan Graphic Design", "printing-shops"], ["Notary Public Nizar Bou Nassar", "lawyers"], ["Sidaco Gas Aley", "gas-stations"],
];

// Name pools for generated businesses (Lebanese-flavored, varied per category).
const PREFIX: Record<string, string[]> = {
  food: ["Beit", "Em", "Abou", "Tawlet", "Mounit", "Layali", "Saj", "Dar", "Sofra", "Zaman"],
  cafe: ["Cafe", "Kahwet", "Café", "Brew", "Roast", "Maison du Café", "Qahwa"],
  shop: ["Aley", "Cedar", "Mountain", "Royal", "Star", "Prime", "Golden", "City"],
  person: ["Maison", "Studio", "Salon", "Atelier"],
};
const PEOPLE = ["Rania", "Carla", "Joelle", "Nadine", "Christelle", "Maya", "Rita", "Carmen", "Tony", "Georges", "Elie", "Marc", "Walid", "Karim"];
const SHOP_WORDS: Record<string, string[]> = {
  default: ["Center", "House", "Shop", "Store", "Gallery", "Market", "Point", "Plaza", "Mart"],
};

function genName(category: string, used: Set<string>): string {
  const kind = KIND[category];
  const catWord = CATEGORIES.find((c) => c.slug === category)!.name.replace(/s$/, "").replace(" Restaurants", "").replace(" Shops", "").replace(" Stores", "").replace(" Clinics", "");
  for (let attempt = 0; attempt < 40; attempt++) {
    let n: string;
    if (kind === "cafe") n = `${rand(PREFIX.cafe)} ${rand(["Aley", "Cedars", "el Balad", "Manara", ...PEOPLE])}`;
    else if (kind === "restaurant" || kind === "bakery" || kind === "sweets") n = `${rand(PREFIX.food)} ${rand(["Aley", "Jeddo", "Loubnan", "el Dayaa", "Zmen", ...PEOPLE])}`;
    else if (["service", "health"].includes(kind ?? "") && chance(0.5)) n = `${rand(PREFIX.person)} ${rand(PEOPLE)}`;
    else n = `${rand(PREFIX.shop)} ${catWord} ${chance(0.5) ? rand(SHOP_WORDS.default) : ""}`.trim();
    n = n.replace(/\s+/g, " ").trim();
    if (!used.has(n.toLowerCase())) { used.add(n.toLowerCase()); return n; }
  }
  const fb = `${rand(PREFIX.shop)} ${catWord} ${used.size}`;
  used.add(fb.toLowerCase());
  return fb;
}

// Per-category target counts for generated businesses (real ones add on top).
const COUNTS: Record<string, number> = {
  restaurants: 16, "coffee-shops": 12, "fast-food": 8, pizza: 5, shawarma: 6, sushi: 4, lebanese: 7,
  bakeries: 7, roasteries: 4, sweets: 6, desserts: 5, "ice-cream": 4, "juice-bars": 5,
  hotels: 5, fashion: 12, "shoe-stores": 5, accessories: 5, "sports-stores": 4, jewelry: 6,
  "beauty-salons": 10, barbers: 8, opticians: 4, pharmacies: 8, clinics: 7, dentists: 6, "medical-labs": 4, veterinary: 3,
  gyms: 5, supermarkets: 7, electronics: 6, "mobile-shops": 6, furniture: 5, "home-decor": 4, "hardware-stores": 5,
  florists: 4, bookstores: 3, "gift-shops": 4, "pet-shops": 3, "car-washes": 4, mechanics: 6, "tire-shops": 4, "gas-stations": 4,
  "real-estate": 6, banks: 5, insurance: 4, schools: 5, daycare: 4, "travel-agencies": 4, photography: 4,
  "printing-shops": 4, "interior-designers": 3, construction: 4, lawyers: 5, accounting: 4, cleaning: 4, electricians: 4, plumbers: 4, taxi: 4,
};

export function buildBusinesses(): BizSeed[] {
  const out: BizSeed[] = [];
  const usedSlugs = new Set<string>();
  const usedNames = new Set<string>();

  for (const [name, cat] of REALS) {
    const b = buildOne(name, cat, { real: true });
    if (usedSlugs.has(b.slug)) continue;
    usedSlugs.add(b.slug); usedNames.add(name.toLowerCase());
    out.push(b);
  }

  for (const cat of Object.keys(COUNTS)) {
    for (let i = 0; i < COUNTS[cat]; i++) {
      const name = genName(cat, usedNames);
      const b = buildOne(name, cat);
      if (usedSlugs.has(b.slug)) { b.slug = `${b.slug}-${i}`; }
      usedSlugs.add(b.slug);
      out.push(b);
    }
  }
  return out;
}
