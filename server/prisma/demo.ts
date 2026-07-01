// Demo-data generator for the Aley platform. Produces realistic businesses
// (real Aley names first, then generated ones) with galleries, reviews, hours,
// products/menus/collections/room-types, FAQs, offers and events.
//
// Everything here is demo/placeholder content meant to make the platform feel
// fully launched; the manager edits/verifies real details later.

export interface HoursRow { day: number; open: string; close: string; closed: boolean }
export interface ReviewSeed { authorName: string; rating: number; comment: string }
export interface ProductSection { title: string; items: { name: string; price?: number; description?: string }[] }
export interface OfferSeed { title: string; description: string; type: string; badge?: string; terms?: string; featured?: boolean; endDays?: number }
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

// ---- Single source of truth for the whole taxonomy ----
// Each category carries its high-level GROUP, its "kind" (drives products /
// descriptions / amenities / photos) and a target count of generated demo
// businesses. CATEGORIES / CATEGORY_GROUPS / GROUP_OF / KIND / COUNTS are all
// derived from this so the taxonomy can never drift out of sync.
// "kind" drives products, descriptions, amenities and photo pools.
type Kind = "cafe" | "restaurant" | "roastery" | "sweets" | "bakery" | "icecream" | "juice" | "hotel" | "fashion" | "jewelry" | "shop" | "service" | "health" | "auto" | "edu";
export interface CatDef { slug: string; name: string; icon: string; color: string; group: string; kind: Kind; count: number }
export const CATS: CatDef[] = [
  // 🍴 Food & Drinks
  { slug: "coffee-shops", name: "Coffee Shops", icon: "☕", color: "#b45309", group: "Food & Drinks", kind: "cafe", count: 12 },
  { slug: "restaurants", name: "Restaurants", icon: "🍽️", color: "#dc2626", group: "Food & Drinks", kind: "restaurant", count: 16 },
  { slug: "lebanese", name: "Lebanese Restaurants", icon: "🫓", color: "#c2410c", group: "Food & Drinks", kind: "restaurant", count: 7 },
  { slug: "fast-food", name: "Fast Food", icon: "🍟", color: "#ea580c", group: "Food & Drinks", kind: "restaurant", count: 8 },
  { slug: "burgers", name: "Burgers", icon: "🍔", color: "#f97316", group: "Food & Drinks", kind: "restaurant", count: 5 },
  { slug: "pizza", name: "Pizza", icon: "🍕", color: "#e11d48", group: "Food & Drinks", kind: "restaurant", count: 5 },
  { slug: "shawarma", name: "Shawarma", icon: "🌯", color: "#b91c1c", group: "Food & Drinks", kind: "restaurant", count: 6 },
  { slug: "sushi", name: "Sushi", icon: "🍣", color: "#db2777", group: "Food & Drinks", kind: "restaurant", count: 4 },
  { slug: "breakfast-brunch", name: "Breakfast & Brunch", icon: "🍳", color: "#f59e0b", group: "Food & Drinks", kind: "cafe", count: 4 },
  { slug: "bakeries", name: "Bakeries", icon: "🥐", color: "#d97706", group: "Food & Drinks", kind: "bakery", count: 7 },
  { slug: "pastry-shops", name: "Pastry Shops", icon: "🧁", color: "#e11d48", group: "Food & Drinks", kind: "bakery", count: 4 },
  { slug: "roasteries", name: "Roasteries & Nuts", icon: "🥜", color: "#92400e", group: "Food & Drinks", kind: "roastery", count: 4 },
  { slug: "sweets", name: "Sweets & Chocolate", icon: "🍬", color: "#db2777", group: "Food & Drinks", kind: "sweets", count: 6 },
  { slug: "desserts", name: "Desserts", icon: "🍰", color: "#e11d48", group: "Food & Drinks", kind: "sweets", count: 5 },
  { slug: "ice-cream", name: "Ice Cream", icon: "🍦", color: "#f472b6", group: "Food & Drinks", kind: "icecream", count: 4 },
  { slug: "juice-bars", name: "Juice Bars", icon: "🥤", color: "#16a34a", group: "Food & Drinks", kind: "juice", count: 5 },
  { slug: "bubble-tea", name: "Bubble Tea", icon: "🧋", color: "#7c3aed", group: "Food & Drinks", kind: "juice", count: 3 },
  { slug: "catering", name: "Catering", icon: "🍱", color: "#c2410c", group: "Food & Drinks", kind: "restaurant", count: 4 },
  { slug: "butcher-shops", name: "Butcher Shops", icon: "🥩", color: "#b91c1c", group: "Food & Drinks", kind: "shop", count: 3 },
  { slug: "fish-markets", name: "Fish Markets", icon: "🐟", color: "#0891b2", group: "Food & Drinks", kind: "shop", count: 3 },
  { slug: "organic-food", name: "Organic Food", icon: "🥬", color: "#16a34a", group: "Food & Drinks", kind: "shop", count: 3 },
  { slug: "wine-spirits", name: "Wine & Spirits", icon: "🍷", color: "#7e22ce", group: "Food & Drinks", kind: "shop", count: 3 },

  // 🛍 Shopping
  { slug: "fashion", name: "Fashion", icon: "👗", color: "#db2777", group: "Shopping", kind: "fashion", count: 10 },
  { slug: "womens-fashion", name: "Women's Fashion", icon: "👚", color: "#db2777", group: "Shopping", kind: "fashion", count: 5 },
  { slug: "mens-fashion", name: "Men's Fashion", icon: "👔", color: "#1e40af", group: "Shopping", kind: "fashion", count: 5 },
  { slug: "childrens-clothing", name: "Children's Clothing", icon: "🧒", color: "#f59e0b", group: "Shopping", kind: "fashion", count: 4 },
  { slug: "shoe-stores", name: "Shoes", icon: "👟", color: "#7c3aed", group: "Shopping", kind: "fashion", count: 5 },
  { slug: "accessories", name: "Bags & Accessories", icon: "👜", color: "#a855f7", group: "Shopping", kind: "fashion", count: 4 },
  { slug: "jewelry", name: "Jewelry & Watches", icon: "💍", color: "#a855f7", group: "Shopping", kind: "jewelry", count: 6 },
  { slug: "cosmetics-perfumes", name: "Cosmetics & Perfumes", icon: "💄", color: "#ec4899", group: "Shopping", kind: "shop", count: 5 },
  { slug: "supermarkets", name: "Supermarkets", icon: "🛒", color: "#16a34a", group: "Shopping", kind: "shop", count: 7 },
  { slug: "convenience-stores", name: "Convenience Stores", icon: "🏪", color: "#16a34a", group: "Shopping", kind: "shop", count: 4 },
  { slug: "electronics", name: "Electronics", icon: "📱", color: "#2563eb", group: "Shopping", kind: "shop", count: 6 },
  { slug: "mobile-shops", name: "Mobile Shops", icon: "📲", color: "#1d4ed8", group: "Shopping", kind: "shop", count: 6 },
  { slug: "computer-stores", name: "Computer Stores", icon: "💻", color: "#2563eb", group: "Shopping", kind: "shop", count: 4 },
  { slug: "gaming-stores", name: "Gaming Stores", icon: "🎮", color: "#7c3aed", group: "Shopping", kind: "shop", count: 3 },
  { slug: "home-appliances", name: "Home Appliances", icon: "🔌", color: "#0ea5e9", group: "Shopping", kind: "shop", count: 4 },
  { slug: "furniture", name: "Furniture", icon: "🛋️", color: "#854d0e", group: "Shopping", kind: "shop", count: 5 },
  { slug: "home-decor", name: "Home Decor", icon: "🪴", color: "#15803d", group: "Shopping", kind: "shop", count: 4 },
  { slug: "kitchen-supplies", name: "Kitchen Supplies", icon: "🍴", color: "#b45309", group: "Shopping", kind: "shop", count: 3 },
  { slug: "hardware-stores", name: "Hardware", icon: "🔩", color: "#57534e", group: "Shopping", kind: "shop", count: 5 },
  { slug: "florists", name: "Florists", icon: "🌸", color: "#ec4899", group: "Shopping", kind: "shop", count: 4 },
  { slug: "gift-shops", name: "Gift Shops", icon: "🎁", color: "#db2777", group: "Shopping", kind: "shop", count: 4 },
  { slug: "bookstores", name: "Bookstores", icon: "📚", color: "#7c3aed", group: "Shopping", kind: "shop", count: 3 },
  { slug: "stationery", name: "Stationery", icon: "✏️", color: "#4f46e5", group: "Shopping", kind: "shop", count: 3 },
  { slug: "toy-stores", name: "Toy Stores", icon: "🧸", color: "#f59e0b", group: "Shopping", kind: "shop", count: 3 },
  { slug: "pet-shops", name: "Pet Shops", icon: "🐶", color: "#d97706", group: "Shopping", kind: "shop", count: 3 },
  { slug: "tobacco-vape", name: "Tobacco & Vape", icon: "🚬", color: "#57534e", group: "Shopping", kind: "shop", count: 3 },
  { slug: "art-supplies", name: "Art Supplies", icon: "🖌️", color: "#be185d", group: "Shopping", kind: "shop", count: 3 },
  { slug: "sports-stores", name: "Sports Stores", icon: "🏀", color: "#ea580c", group: "Shopping", kind: "shop", count: 4 },

  // 💄 Health & Beauty
  { slug: "beauty-salons", name: "Beauty Salons", icon: "💇", color: "#ec4899", group: "Health & Beauty", kind: "service", count: 10 },
  { slug: "barbers", name: "Barbers", icon: "💈", color: "#0ea5e9", group: "Health & Beauty", kind: "service", count: 8 },
  { slug: "spas", name: "Spas", icon: "🧖", color: "#ec4899", group: "Health & Beauty", kind: "service", count: 4 },
  { slug: "nail-salons", name: "Nail Salons", icon: "💅", color: "#db2777", group: "Health & Beauty", kind: "service", count: 4 },
  { slug: "makeup-artists", name: "Makeup Artists", icon: "💋", color: "#db2777", group: "Health & Beauty", kind: "service", count: 3 },
  { slug: "skincare-clinics", name: "Skincare Clinics", icon: "✨", color: "#14b8a6", group: "Health & Beauty", kind: "health", count: 3 },
  { slug: "pharmacies", name: "Pharmacies", icon: "💊", color: "#059669", group: "Health & Beauty", kind: "shop", count: 8 },
  { slug: "clinics", name: "Clinics", icon: "🩺", color: "#0d9488", group: "Health & Beauty", kind: "health", count: 7 },
  { slug: "dentists", name: "Dentists", icon: "🦷", color: "#0284c7", group: "Health & Beauty", kind: "health", count: 6 },
  { slug: "medical-centers", name: "Medical Centers", icon: "🏥", color: "#0d9488", group: "Health & Beauty", kind: "health", count: 4 },
  { slug: "medical-labs", name: "Medical Laboratories", icon: "🧪", color: "#0e7490", group: "Health & Beauty", kind: "health", count: 4 },
  { slug: "physiotherapy", name: "Physiotherapy", icon: "🤸", color: "#0e7490", group: "Health & Beauty", kind: "health", count: 3 },
  { slug: "nutritionists", name: "Nutritionists", icon: "🥗", color: "#16a34a", group: "Health & Beauty", kind: "health", count: 3 },
  { slug: "psychologists", name: "Psychologists", icon: "🧠", color: "#7c3aed", group: "Health & Beauty", kind: "health", count: 3 },
  { slug: "gyms", name: "Gyms", icon: "🏋️", color: "#ea580c", group: "Health & Beauty", kind: "service", count: 5 },
  { slug: "yoga-pilates", name: "Yoga & Pilates", icon: "🧘", color: "#14b8a6", group: "Health & Beauty", kind: "service", count: 3 },
  { slug: "personal-trainers", name: "Personal Trainers", icon: "💪", color: "#ea580c", group: "Health & Beauty", kind: "service", count: 3 },
  { slug: "veterinary", name: "Veterinary Clinics", icon: "🐾", color: "#16a34a", group: "Health & Beauty", kind: "health", count: 3 },
  { slug: "opticians", name: "Optical Stores", icon: "👓", color: "#0891b2", group: "Health & Beauty", kind: "shop", count: 4 },

  // 🚗 Automotive
  { slug: "mechanics", name: "Mechanics", icon: "🔧", color: "#57534e", group: "Automotive", kind: "auto", count: 6 },
  { slug: "car-washes", name: "Car Washes", icon: "🚿", color: "#0ea5e9", group: "Automotive", kind: "auto", count: 4 },
  { slug: "tire-shops", name: "Tire Shops", icon: "🛞", color: "#404040", group: "Automotive", kind: "auto", count: 4 },
  { slug: "battery-shops", name: "Battery Shops", icon: "🔋", color: "#404040", group: "Automotive", kind: "auto", count: 3 },
  { slug: "auto-parts", name: "Auto Parts", icon: "⚙️", color: "#57534e", group: "Automotive", kind: "auto", count: 4 },
  { slug: "car-accessories", name: "Car Accessories", icon: "🚗", color: "#2563eb", group: "Automotive", kind: "auto", count: 3 },
  { slug: "car-detailing", name: "Car Detailing", icon: "🧽", color: "#0ea5e9", group: "Automotive", kind: "auto", count: 3 },
  { slug: "oil-change", name: "Oil Change", icon: "🛢️", color: "#92400e", group: "Automotive", kind: "auto", count: 3 },
  { slug: "gas-stations", name: "Fuel Stations", icon: "⛽", color: "#dc2626", group: "Automotive", kind: "auto", count: 4 },
  { slug: "vehicle-inspection", name: "Vehicle Inspection", icon: "🔍", color: "#57534e", group: "Automotive", kind: "auto", count: 3 },
  { slug: "car-rentals", name: "Car Rentals", icon: "🚙", color: "#0284c7", group: "Automotive", kind: "auto", count: 3 },
  { slug: "towing-services", name: "Towing Services", icon: "🚛", color: "#dc2626", group: "Automotive", kind: "auto", count: 3 },
  { slug: "taxi", name: "Taxi Services", icon: "🚕", color: "#f59e0b", group: "Automotive", kind: "service", count: 4 },

  // 🏠 Home & Living
  { slug: "construction", name: "Construction", icon: "🏗️", color: "#a16207", group: "Home & Living", kind: "service", count: 4 },
  { slug: "contractors", name: "Contractors", icon: "👷", color: "#a16207", group: "Home & Living", kind: "service", count: 3 },
  { slug: "architects", name: "Architects", icon: "📐", color: "#1e40af", group: "Home & Living", kind: "service", count: 3 },
  { slug: "interior-designers", name: "Interior Designers", icon: "🎨", color: "#be185d", group: "Home & Living", kind: "service", count: 3 },
  { slug: "flooring", name: "Flooring", icon: "🪵", color: "#854d0e", group: "Home & Living", kind: "service", count: 3 },
  { slug: "kitchens", name: "Kitchens", icon: "🔪", color: "#b45309", group: "Home & Living", kind: "service", count: 3 },
  { slug: "curtains-blinds", name: "Curtains & Blinds", icon: "🪟", color: "#854d0e", group: "Home & Living", kind: "shop", count: 3 },
  { slug: "plumbers", name: "Plumbing", icon: "🚰", color: "#0891b2", group: "Home & Living", kind: "service", count: 4 },
  { slug: "electricians", name: "Electricians", icon: "⚡", color: "#ca8a04", group: "Home & Living", kind: "service", count: 4 },
  { slug: "cleaning", name: "Cleaning Services", icon: "🧼", color: "#0ea5e9", group: "Home & Living", kind: "service", count: 4 },
  { slug: "pest-control", name: "Pest Control", icon: "🐜", color: "#57534e", group: "Home & Living", kind: "service", count: 3 },
  { slug: "garden-centers", name: "Garden Centers", icon: "🌳", color: "#15803d", group: "Home & Living", kind: "shop", count: 3 },
  { slug: "landscaping", name: "Landscaping", icon: "🌿", color: "#16a34a", group: "Home & Living", kind: "service", count: 3 },
  { slug: "pool-services", name: "Pool Construction & Maintenance", icon: "💧", color: "#0ea5e9", group: "Home & Living", kind: "service", count: 3 },
  { slug: "security-systems", name: "Security Systems", icon: "🔒", color: "#1e40af", group: "Home & Living", kind: "service", count: 3 },

  // 💼 Professional Services
  { slug: "real-estate", name: "Real Estate", icon: "🏠", color: "#0891b2", group: "Professional Services", kind: "service", count: 6 },
  { slug: "banks", name: "Banks", icon: "🏦", color: "#1d4ed8", group: "Professional Services", kind: "service", count: 5 },
  { slug: "insurance", name: "Insurance", icon: "🛡️", color: "#0369a1", group: "Professional Services", kind: "service", count: 4 },
  { slug: "lawyers", name: "Lawyers & Notaries", icon: "⚖️", color: "#1e40af", group: "Professional Services", kind: "service", count: 5 },
  { slug: "accounting", name: "Accounting", icon: "🧾", color: "#0f766e", group: "Professional Services", kind: "service", count: 4 },
  { slug: "financial-advisors", name: "Financial Advisors", icon: "📈", color: "#0f766e", group: "Professional Services", kind: "service", count: 3 },
  { slug: "consultants", name: "Consultants", icon: "💼", color: "#1e40af", group: "Professional Services", kind: "service", count: 3 },
  { slug: "travel-agencies", name: "Travel Agencies", icon: "✈️", color: "#0284c7", group: "Professional Services", kind: "service", count: 4 },
  { slug: "printing-shops", name: "Printing & Design", icon: "🖨️", color: "#4f46e5", group: "Professional Services", kind: "service", count: 4 },
  { slug: "marketing-agencies", name: "Marketing Agencies", icon: "📣", color: "#db2777", group: "Professional Services", kind: "service", count: 3 },
  { slug: "web-design", name: "Web Design", icon: "🌐", color: "#2563eb", group: "Professional Services", kind: "service", count: 3 },
  { slug: "software-development", name: "Software Development", icon: "🖥️", color: "#4f46e5", group: "Professional Services", kind: "service", count: 3 },
  { slug: "photography", name: "Photography Studios", icon: "📷", color: "#9333ea", group: "Professional Services", kind: "service", count: 4 },
  { slug: "videography", name: "Videography", icon: "🎥", color: "#9333ea", group: "Professional Services", kind: "service", count: 3 },
  { slug: "event-planning", name: "Event Planning", icon: "🎉", color: "#db2777", group: "Professional Services", kind: "service", count: 3 },
  { slug: "translation-services", name: "Translation Services", icon: "🌍", color: "#0891b2", group: "Professional Services", kind: "service", count: 3 },

  // 🏨 Stay & Tourism
  { slug: "hotels", name: "Hotels & Resorts", icon: "🏨", color: "#0ea5e9", group: "Stay & Tourism", kind: "hotel", count: 5 },
  { slug: "guest-houses", name: "Guest Houses", icon: "🏡", color: "#0ea5e9", group: "Stay & Tourism", kind: "hotel", count: 3 },
  { slug: "apartments", name: "Apartments", icon: "🏢", color: "#0284c7", group: "Stay & Tourism", kind: "hotel", count: 3 },
  { slug: "resorts", name: "Resorts", icon: "🌴", color: "#16a34a", group: "Stay & Tourism", kind: "hotel", count: 3 },
  { slug: "airbnb-hosts", name: "Airbnb Hosts", icon: "🛏️", color: "#db2777", group: "Stay & Tourism", kind: "hotel", count: 3 },
  { slug: "tourist-attractions", name: "Tourist Attractions", icon: "📸", color: "#9333ea", group: "Stay & Tourism", kind: "service", count: 3 },
  { slug: "parks", name: "Parks", icon: "🏞️", color: "#16a34a", group: "Stay & Tourism", kind: "service", count: 2 },
  { slug: "historical-sites", name: "Historical Sites", icon: "🏛️", color: "#a16207", group: "Stay & Tourism", kind: "service", count: 3 },
  { slug: "museums", name: "Museums", icon: "🖼️", color: "#7c3aed", group: "Stay & Tourism", kind: "service", count: 2 },
  { slug: "camping", name: "Camping", icon: "⛺", color: "#16a34a", group: "Stay & Tourism", kind: "service", count: 3 },
  { slug: "tour-guides", name: "Tour Guides", icon: "🧭", color: "#0891b2", group: "Stay & Tourism", kind: "service", count: 3 },

  // 🎓 Education
  { slug: "schools", name: "Schools", icon: "🏫", color: "#7c3aed", group: "Education", kind: "edu", count: 5 },
  { slug: "universities", name: "Universities", icon: "🎓", color: "#7c3aed", group: "Education", kind: "edu", count: 3 },
  { slug: "daycare", name: "Daycare", icon: "🧸", color: "#f59e0b", group: "Education", kind: "edu", count: 4 },
  { slug: "nurseries", name: "Nurseries", icon: "🍼", color: "#f59e0b", group: "Education", kind: "edu", count: 3 },
  { slug: "tutors", name: "Tutors", icon: "📖", color: "#4f46e5", group: "Education", kind: "edu", count: 3 },
  { slug: "language-centers", name: "Language Centers", icon: "🗣️", color: "#0891b2", group: "Education", kind: "edu", count: 3 },
  { slug: "music-schools", name: "Music Schools", icon: "🎵", color: "#db2777", group: "Education", kind: "edu", count: 3 },
  { slug: "dance-schools", name: "Dance Schools", icon: "💃", color: "#ec4899", group: "Education", kind: "edu", count: 3 },
  { slug: "driving-schools", name: "Driving Schools", icon: "🚸", color: "#f59e0b", group: "Education", kind: "edu", count: 3 },
  { slug: "training-centers", name: "Training Centers", icon: "📋", color: "#0f766e", group: "Education", kind: "edu", count: 3 },

  // 🎭 Entertainment (leisure, fun & social — not playing sports)
  { slug: "cinemas", name: "Cinemas", icon: "🎬", color: "#1e40af", group: "Entertainment", kind: "service", count: 3 },
  { slug: "bowling", name: "Bowling", icon: "🎳", color: "#2563eb", group: "Entertainment", kind: "service", count: 2 },
  { slug: "escape-rooms", name: "Escape Rooms", icon: "🗝️", color: "#7c3aed", group: "Entertainment", kind: "service", count: 3 },
  { slug: "pool-billiards", name: "Pool & Billiards", icon: "🎱", color: "#404040", group: "Entertainment", kind: "service", count: 2 },
  { slug: "gaming-lounges", name: "Gaming Lounges", icon: "🕹️", color: "#7c3aed", group: "Entertainment", kind: "service", count: 3 },
  { slug: "kids-play-areas", name: "Kids Play Areas", icon: "🎠", color: "#f59e0b", group: "Entertainment", kind: "service", count: 3 },
  { slug: "trampoline-parks", name: "Trampoline Parks", icon: "🤸", color: "#16a34a", group: "Entertainment", kind: "service", count: 0 },
  { slug: "laser-tag", name: "Laser Tag", icon: "🔫", color: "#dc2626", group: "Entertainment", kind: "service", count: 0 },
  { slug: "arcades", name: "Arcades", icon: "👾", color: "#7c3aed", group: "Entertainment", kind: "service", count: 0 },
  { slug: "event-venues", name: "Event Venues", icon: "🎪", color: "#db2777", group: "Entertainment", kind: "service", count: 3 },
  { slug: "wedding-venues", name: "Wedding Venues", icon: "💒", color: "#ec4899", group: "Entertainment", kind: "service", count: 3 },
  { slug: "live-music", name: "Live Music Venues", icon: "🎤", color: "#db2777", group: "Entertainment", kind: "service", count: 3 },
  { slug: "nightlife", name: "Nightlife", icon: "🍸", color: "#7e22ce", group: "Entertainment", kind: "service", count: 3 },

  // 🏆 Sports & Recreation (places to play sports & do recreational activities)
  // Court/field/pool categories rent by the hour → facility booking with live availability.
  { slug: "football-fields", name: "Football Fields", icon: "⚽", color: "#16a34a", group: "Sports & Recreation", kind: "service", count: 0 },
  { slug: "mini-football", name: "Mini Football", icon: "🥅", color: "#15803d", group: "Sports & Recreation", kind: "service", count: 0 },
  { slug: "tennis", name: "Tennis Courts", icon: "🎾", color: "#16a34a", group: "Sports & Recreation", kind: "service", count: 0 },
  { slug: "padel", name: "Padel Courts", icon: "🏓", color: "#0ea5e9", group: "Sports & Recreation", kind: "service", count: 0 },
  { slug: "squash", name: "Squash Courts", icon: "🥎", color: "#7c3aed", group: "Sports & Recreation", kind: "service", count: 0 },
  { slug: "basketball", name: "Basketball Courts", icon: "🏀", color: "#ea580c", group: "Sports & Recreation", kind: "service", count: 0 },
  { slug: "volleyball", name: "Volleyball Courts", icon: "🏐", color: "#f59e0b", group: "Sports & Recreation", kind: "service", count: 0 },
  { slug: "swimming-pools", name: "Swimming Pools", icon: "🏊", color: "#0891b2", group: "Sports & Recreation", kind: "service", count: 0 },
  { slug: "running-tracks", name: "Running Tracks", icon: "🏃", color: "#ea580c", group: "Sports & Recreation", kind: "service", count: 0 },
  { slug: "hiking-trails", name: "Hiking Trails", icon: "🥾", color: "#15803d", group: "Sports & Recreation", kind: "service", count: 0 },
  { slug: "cycling-trails", name: "Cycling Trails", icon: "🚴", color: "#16a34a", group: "Sports & Recreation", kind: "service", count: 0 },
  { slug: "horse-riding", name: "Horse Riding", icon: "🐎", color: "#a16207", group: "Sports & Recreation", kind: "service", count: 0 },
  { slug: "paintball", name: "Paintball", icon: "🎯", color: "#dc2626", group: "Sports & Recreation", kind: "service", count: 0 },
  { slug: "go-karting", name: "Go-Karting", icon: "🏎️", color: "#1e40af", group: "Sports & Recreation", kind: "service", count: 0 },
  { slug: "sports-clubs", name: "Sports Clubs", icon: "🏅", color: "#16a34a", group: "Sports & Recreation", kind: "service", count: 0 },
  { slug: "sports-academies", name: "Sports Academies", icon: "🥇", color: "#ca8a04", group: "Sports & Recreation", kind: "service", count: 0 },

  // 📢 Community
  { slug: "charity-organizations", name: "Charity Organizations", icon: "🤝", color: "#16a34a", group: "Community", kind: "service", count: 3 },
  { slug: "volunteer", name: "Volunteer Opportunities", icon: "🙌", color: "#0d9488", group: "Community", kind: "service", count: 2 },
  { slug: "community-centers", name: "Community Centers", icon: "🏘️", color: "#0891b2", group: "Community", kind: "service", count: 2 },
  { slug: "cultural-associations", name: "Cultural Associations", icon: "🎭", color: "#7c3aed", group: "Community", kind: "service", count: 2 },

  // 🚨 Essential Services (civic — populated from real listings only)
  { slug: "hospitals", name: "Hospitals", icon: "🏥", color: "#dc2626", group: "Essential Services", kind: "health", count: 0 },
  { slug: "emergency-clinics", name: "Emergency Clinics", icon: "🩹", color: "#dc2626", group: "Essential Services", kind: "health", count: 0 },
  { slug: "ambulance", name: "Ambulance", icon: "🚑", color: "#dc2626", group: "Essential Services", kind: "service", count: 0 },
  { slug: "police", name: "Police", icon: "👮", color: "#1e40af", group: "Essential Services", kind: "service", count: 0 },
  { slug: "civil-defense", name: "Civil Defense", icon: "🚨", color: "#ea580c", group: "Essential Services", kind: "service", count: 0 },
  { slug: "fire-department", name: "Fire Department", icon: "🚒", color: "#dc2626", group: "Essential Services", kind: "service", count: 0 },
  { slug: "government-offices", name: "Government Offices", icon: "🏛️", color: "#57534e", group: "Essential Services", kind: "service", count: 0 },
  { slug: "municipality", name: "Municipality", icon: "🏢", color: "#0f766e", group: "Essential Services", kind: "service", count: 0 },
  { slug: "utilities", name: "Utilities", icon: "💡", color: "#ca8a04", group: "Essential Services", kind: "service", count: 0 },
  { slug: "postal-services", name: "Postal Services", icon: "📮", color: "#dc2626", group: "Essential Services", kind: "service", count: 0 },
];

export const CATEGORIES: { slug: string; name: string; icon: string; color: string }[] =
  CATS.map(({ slug, name, icon, color }) => ({ slug, name, icon, color }));

// Main groups (ordered, first-seen) and which categories belong to each.
export const CATEGORY_GROUPS: { group: string; slugs: string[] }[] = (() => {
  const order: string[] = [];
  const map = new Map<string, string[]>();
  for (const c of CATS) {
    if (!map.has(c.group)) { map.set(c.group, []); order.push(c.group); }
    map.get(c.group)!.push(c.slug);
  }
  return order.map((g) => ({ group: g, slugs: map.get(g)! }));
})();
export const GROUP_OF: Record<string, string> = Object.fromEntries(CATS.map((c) => [c.slug, c.group]));

// ---- small PRNG-ish helpers (Math.random is fine in a seed script) ----
const rand = <T>(a: T[]): T => a[Math.floor(Math.random() * a.length)];
const randInt = (a: number, b: number) => a + Math.floor(Math.random() * (b - a + 1));
const chance = (p: number) => Math.random() < p;
const sample = <T>(a: T[], n: number): T[] => [...a].sort(() => Math.random() - 0.5).slice(0, n);
const round2 = (n: number) => Math.round(n * 100) / 100;
const slugify = (s: string) => s.toLowerCase().trim().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");

// ---- Themed images: curated & validated Unsplash photos + UI-Avatars (logos) ----
const hashNum = (s: string) => { let h = 0; for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) >>> 0; return h >>> 0; };
export const avatar = (name: string, color = "0d9488") => `https://ui-avatars.com/api/?name=${encodeURIComponent(name)}&background=${color}&color=fff&bold=true&size=256`;

// Real Unsplash photo IDs grouped by visual theme — every ID validated to return 200.
// Stable CDN URLs → always load, varied, never the same image twice. "nature" = Mount Lebanon scenery.
const PHOTOS: Record<string, string[]> = {
  cafe: ["1517248135467-4c7edcad34c4", "1554118811-1e0d58224f24", "1453614512568-c4024d13c247", "1559925393-8be0ec4767c8", "1442512595331-e89e73853f31", "1521017432531-fbd92d768814", "1559496417-e7f25cb247f3", "1495474472287-4d71bcdd2085"],
  restaurant: ["1414235077428-338989a2e8c0", "1559339352-11d035aa65de", "1424847651672-bf20a4b0982b", "1555396273-367ea4eb4db5", "1552566626-52f8b828add9", "1466978913421-dad2ebd01d17", "1540189549336-e6e99c3679fe", "1517244683847-7456b63c5969"],
  roastery: ["1447933601403-0c6688de566e", "1495474472287-4d71bcdd2085", "1559056199-641a0ac8b55e", "1442550528053-c431ecb55509", "1611854779393-1b2da9d400fe"],
  sweets: ["1551024601-bec78aea704b", "1565958011703-44f9829ba187", "1578985545062-69928b1d9587", "1606890737304-57a1ca8a5b62", "1488477181946-6428a0291777"],
  bakery: ["1509440159596-0249088772ff", "1555507036-ab1f4038808a", "1549931319-a545dcf3bc73", "1568254183919-78a4f43a2877", "1586444248902-2f64eddc13df"],
  icecream: ["1488900128323-21503983a07e", "1497034825429-c343d7c6a68f", "1576506295286-5cda18df43e7"],
  juice: ["1622597467836-f3285f2131b8", "1600271886742-f049cd451bba", "1610970881699-44a5587cabec", "1502741224143-90386d7f8c82"],
  hotel: ["1566073771259-6a8506099945", "1542314831-068cd1dbfeeb", "1551882547-ff40c63fe5fa", "1571896349842-33c89424de2d", "1520250497591-112f2f40a3f4"],
  fashion: ["1441986300917-64674bd600d8", "1490481651871-ab68de25d43d", "1567401893414-76b7b1e5a7a5", "1483985988355-763728e1935b", "1445205170230-053b83016050"],
  jewelry: ["1515562141207-7a88fb7ce338", "1605100804763-247f67b3557e", "1573408301185-9146fe634ad0", "1611652022419-a9419f74343d"],
  shop: ["1441986300917-64674bd600d8", "1556909114-f6e7ad7d3136", "1542838132-92c53300491e", "1604719312566-8912e9227c6a", "1604335399105-a0c585fd81a1"],
  service: ["1497366216548-37526070297c", "1556761175-5973dc0f32e7", "1521791136064-7986c2920216", "1454165804606-c3d57bc86b40"],
  health: ["1519494026892-80bbd2d6fd0d", "1576091160550-2173dba999ef", "1538108149393-fbbd81895907", "1631217868264-e5b90bb7e133"],
  auto: ["1486006920555-c77dcf18193c", "1503376780353-7e6692767b70", "1492144534655-ae79c964c9d7", "1542362567-b07e54358753"],
  edu: ["1503676260728-1c00da094a0b", "1497633762265-9d179a990aa6", "1580582932707-520aed937b7b"],
  // Mount Lebanon vibe: mountains, pine forest, green hills — no lakes/ponds/sea (Aley is a hill town inland).
  nature: ["1483728642387-6c3bdd6c93e5", "1454496522488-7a8e488e8606", "1472791108553-c9405341e398", "1458668383970-8ddd3927deed", "1464822759023-fed622ff2c3b", "1500534623283-312aade485b7", "1454942901704-3c44c11b2ad1", "1605540436563-5bca919ae766"],
  document: ["1554224155-6726b3ff858f", "1450101499163-c8848c66ca85", "1517842645767-c639042777db", "1554224154-26032ffc0d07", "1456735190827-d1262f71b8a3"],
  // Sports facilities (football, padel/tennis, basketball, gym, pool) — validated IDs.
  sports: ["1551958219-acbc608c6377", "1431324155629-1a6deb1dec8d", "1459865264687-595d652de67e", "1517927033932-b3d18e61fb3a", "1522778119026-d647f0596c20", "1554068865-24cecd4e34b8", "1595435934249-5df7ed86e1c0", "1546519638-68e109498ffc", "1505666287802-931dc83948e9", "1534438327276-14e5300c3a48", "1571902943202-507ec2618e8f", "1576013551627-0cc20b96c2a7", "1519315901367-f34ff9154487", "1626224583764-f87db24ac4ea"],
};
const unsplash = (id: string, w: number, h: number) => `https://images.unsplash.com/photo-${id}?auto=format&fit=crop&w=${w}&h=${h}&q=70`;
// A few categories look better with a specific pool than their generic "kind".
const POOL_OVERRIDE: Record<string, string> = {
  "real-estate": "nature", "hiking-trails": "nature", parks: "nature", camping: "nature",
  "tourist-attractions": "nature", "historical-sites": "nature", landscaping: "nature",
  "garden-centers": "nature", resorts: "hotel", "guest-houses": "hotel", apartments: "hotel",
  // Sports & Recreation
  "football-fields": "sports", "mini-football": "sports", padel: "sports", tennis: "sports", basketball: "sports",
  volleyball: "sports", squash: "sports", "swimming-pools": "sports", "running-tracks": "sports", "sports-clubs": "sports",
  "sports-academies": "sports", "go-karting": "sports", paintball: "sports", gyms: "sports",
  "cycling-trails": "nature", "horse-riding": "nature",
};
const poolFor = (slug: string): string[] => PHOTOS[POOL_OVERRIDE[slug] ?? KIND[slug] ?? "shop"] ?? PHOTOS.shop;
// Deterministic single themed photo (business cover / offer / event).
export const photo = (seed: string, categorySlug: string, w = 800, h = 600) =>
  unsplash(poolFor(categorySlug)[hashNum(seed) % poolFor(categorySlug).length], w, h);
// Deterministic Mount-Lebanon scenery (projects, fallbacks).
export const scenery = (seed: string, w = 800, h = 600) =>
  unsplash(PHOTOS.nature[hashNum(seed) % PHOTOS.nature.length], w, h);
// Deterministic document/paper image (expense receipts).
export const document = (seed: string, w = 400, h = 560) =>
  unsplash(PHOTOS.document[hashNum(seed) % PHOTOS.document.length], w, h);

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
function gallery(slug: string, category: string) {
  // Draw distinct photos from the category pool, topped up with scenery for ambiance.
  const pool = [...poolFor(category), ...PHOTOS.nature];
  const n = Math.min(randInt(6, 10), pool.length);
  const start = hashNum(slug);
  return Array.from({ length: n }, (_, i) => unsplash(pool[(start + i) % pool.length], 900, 650));
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
const KIND: Record<string, Kind> = Object.fromEntries(CATS.map((c) => [c.slug, c.kind]));

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
    cafe: [
      { title: "Buy 1 Get 1 Coffee", description: "Every weekday, 3–5pm.", type: "HAPPY_HOUR", badge: "Buy 1 Get 1", featured: true, endDays: 14 },
      { title: "Free Dessert with Brunch", description: "Order any brunch and pick a dessert on us.", type: "FREE_ITEM", badge: "Free Dessert" },
    ],
    restaurant: [
      { title: "20% Off Family Platters", description: "Weekends, dine-in or delivery.", type: "PERCENT", badge: "20% OFF", featured: true, endDays: 10 },
      { title: "Lunch Combo Deal", description: "Main + side + drink, one great price.", type: "PACKAGE", badge: "Combo Deal" },
    ],
    fashion: [{ title: "End of Season Sale", description: "Up to 40% off selected items.", type: "SEASONAL", badge: "Up to 40% OFF", featured: true, endDays: 21 }],
    shop: [{ title: "Weekend Deals", description: "Special prices all weekend.", type: "PERCENT", badge: "Weekend Deal", endDays: 4 }],
    service: [{ title: "First Visit 15% Off", description: "New customers only.", type: "FIRST_VISIT", badge: "15% OFF" }],
    sweets: [{ title: "Free Box with Every 2", description: "Limited-time loyalty deal.", type: "BOGO", badge: "Buy 2 Get 1" }],
    health: [{ title: "Free First Consultation", description: "For new patients.", type: "FIRST_VISIT", badge: "Free Consult" }],
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
    logo: avatar(name, slugColor.get(category) ?? "0d9488"), cover: photo(`${slug}-cover`, category, 1200, 600), gallery: gallery(slug, category),
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
    event: chance(0.1) ? rand([
      { title: "Live Music Night", category: "live-music", description: "An evening of live music — everyone's welcome!", days: randInt(2, 20) },
      { title: "Weekend Food Festival", category: "food-drinks", description: "Tastings, stalls and family fun all weekend.", days: randInt(2, 9) },
      { title: "Community Day", category: "community", description: "Join your neighbours for a day of activities.", days: randInt(2, 20) },
      { title: "Hands-on Workshop", category: "workshops", description: "Learn something new with our team.", days: randInt(2, 20) },
      { title: "Art & Culture Evening", category: "art-culture", description: "Local art, music and culture under one roof.", days: randInt(2, 20) },
    ]) : undefined,
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
  // Essential / civic services (real institutions in Aley).
  ["Aley Governmental Hospital", "hospitals"], ["Aley Emergency Clinic", "emergency-clinics"],
  ["Lebanese Red Cross - Aley", "ambulance"], ["Internal Security Forces - Aley", "police"],
  ["Civil Defense - Aley", "civil-defense"], ["Fire Brigade - Aley", "fire-department"],
  ["Aley Serail - Government Offices", "government-offices"], ["Municipality of Aley", "municipality"],
  ["EDL - Aley Branch", "utilities"], ["LibanPost - Aley", "postal-services"],
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
const COUNTS: Record<string, number> = Object.fromEntries(CATS.map((c) => [c.slug, c.count]));

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
