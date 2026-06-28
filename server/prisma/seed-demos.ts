/* eslint-disable @typescript-eslint/no-explicit-any */
import { PrismaClient } from "@prisma/client";
import { avatar, photo } from "./demo";

// ---------------------------------------------------------------------------
// Flagship demo businesses — one polished, fully-featured showcase per major
// category. Idempotent: upserts by slug and replaces child records, so it can
// be run any time on top of the existing seed WITHOUT wiping the database.
//   npm run seed:demos
// ---------------------------------------------------------------------------

const prisma = new PrismaClient();

// ---- helpers ----
const COLORS: Record<string, string> = {
  "coffee-shops": "b45309", restaurants: "dc2626", "beauty-salons": "ec4899", barbers: "0ea5e9",
  clinics: "0d9488", dentists: "0284c7", "car-washes": "0ea5e9", mechanics: "57534e",
  "auto-parts": "57534e", hotels: "7c3aed", "real-estate": "0f766e", fashion: "db2777",
  pharmacies: "059669", gyms: "ea580c",
};
const hours = (open: string, close: string, closed: number[] = []) =>
  Array.from({ length: 7 }, (_, day) => ({ day, open, close, closed: closed.includes(day) }));
const gal = (slug: string, cat: string, caps: string[]) =>
  caps.map((caption, i) => ({ url: photo(`${slug}-g${i}`, cat, 900, 650), caption }));
const pimg = (slug: string, key: string, cat: string) => photo(`${slug}-${key}`, cat, 600, 450);
const rating = (revs: { rating: number }[]) => Math.round((revs.reduce((s, r) => s + r.rating, 0) / revs.length) * 10) / 10;

// Common drink/customization option sets reused across the cafe + restaurant.
const SIZE = { name: "Size", type: "single" as const, required: true, choices: [{ label: "Small" }, { label: "Medium", price: 1 }, { label: "Large", price: 2 }] };
const MILK = { name: "Milk", type: "single" as const, choices: [{ label: "Whole milk" }, { label: "Oat milk", price: 0.5 }, { label: "Almond milk", price: 0.5 }, { label: "Lactose-free", price: 0.5 }] };
const EXTRAS = { name: "Extras", type: "multi" as const, choices: [{ label: "Extra espresso shot", price: 1 }, { label: "Vanilla syrup", price: 0.5 }, { label: "Caramel syrup", price: 0.5 }, { label: "Whipped cream", price: 0.5 }] };

type Demo = {
  slug: string; name: string; category: string; tagline: string; description: string; priceRange: number;
  ownerName: string; phone: string; whatsapp: string; instagram: string; website?: string; address: string;
  lat: number; lng: number; hours: any[]; tags: string[];
  hasDelivery?: boolean; hasReservations?: boolean; bookingConfig?: any;
  galleryCaps: string[];
  productLabel?: string; products?: any[];
  services?: { name: string; description?: string; durationMin: number; price: number }[];
  staff?: { name: string; role: string; bio?: string; experience?: string; languages?: string[]; rating?: number }[];
  reviews: { authorName: string; rating: number; comment: string }[];
  offers?: { title: string; description: string; type: string }[];
  events?: { title: string; category: string; description: string; days: number }[];
  faqs?: { q: string; a: string }[];
};

const A = { lat: 33.8056, lng: 35.6011 };
const near = (i: number) => ({ lat: A.lat + (i % 5) * 0.002 - 0.004, lng: A.lng + ((i * 3) % 5) * 0.002 - 0.004 });

const BOOK = (extra: any = {}) => ({ slotInterval: 30, capacity: 1, leadTimeHours: 2, horizonDays: 30, bufferAfter: 10, cancellationHours: 12, allowCustomerCancel: true, allowCustomerReschedule: true, ...extra });

const DEMOS: Demo[] = [
  // 1) COFFEE SHOP ----------------------------------------------------------
  {
    slug: "bean-avenue", name: "Bean Avenue", category: "coffee-shops",
    tagline: "Specialty coffee & all-day brunch in the heart of Aley",
    description: "Bean Avenue is Aley's specialty coffee house — single-origin beans roasted weekly, a cozy mountain-view terrace, and a fresh all-day brunch menu. Whether you're here to work, meet friends, or grab your morning flat white, we've got a seat with your name on it.",
    priceRange: 2, ownerName: "Aneel Shehayeb", phone: "+961 5 555 010", whatsapp: "+961 70 555 010",
    instagram: "beanavenue", website: "https://beanavenue.demo.aley.com", address: "Souk Street, Aley", ...A, hours: hours("07:00", "23:00"),
    tags: ["specialty coffee", "brunch", "free wifi", "terrace", "vegan options", "study friendly"],
    hasDelivery: true,
    galleryCaps: ["Our mountain-view terrace", "Freshly pulled espresso", "The roastery bar", "All-day brunch plates", "Latte art by our baristas", "Cozy indoor seating"],
    productLabel: "Menu",
    products: [
      { title: "Hot Coffee", items: [
        { name: "Espresso", price: 3, description: "Double shot of our house single-origin blend.", featured: true, badge: "Best Seller", diet: ["vegan"], options: [EXTRAS] },
        { name: "Flat White", price: 5, description: "Velvety microfoam over a rich double shot.", options: [SIZE, MILK, EXTRAS] },
        { name: "Cappuccino", price: 5, description: "Equal parts espresso, steamed milk and foam.", options: [SIZE, MILK, EXTRAS] },
        { name: "Spanish Latte", price: 6, description: "Espresso with sweetened condensed milk.", badge: "Most Popular", options: [SIZE, MILK, EXTRAS] },
      ]},
      { title: "Cold Coffee", items: [
        { name: "Iced Latte", price: 6, description: "Double shot over ice with cold milk.", diet: ["vegetarian"], options: [SIZE, MILK, EXTRAS] },
        { name: "Cold Brew", price: 6, description: "Steeped 18 hours for a smooth, low-acidity cup.", diet: ["vegan"], options: [SIZE, EXTRAS] },
        { name: "Iced Caramel Macchiato", price: 7, description: "Vanilla, milk, espresso and caramel drizzle.", options: [SIZE, MILK, EXTRAS] },
      ]},
      { title: "Brunch", items: [
        { name: "Avocado Toast", price: 9, description: "Sourdough, smashed avocado, poached egg, chili flakes.", featured: true, badge: "Chef's Pick", diet: ["vegetarian"] },
        { name: "Eggs Benedict", price: 11, description: "English muffin, poached eggs, hollandaise, smoked turkey." },
        { name: "Granola Bowl", price: 8, description: "House granola, Greek yogurt, honey and seasonal fruit.", diet: ["vegetarian", "gluten-free"] },
        { name: "Croissant", price: 3.5, description: "Butter croissant baked fresh every morning.", diet: ["vegetarian"] },
      ]},
    ],
    reviews: [
      { authorName: "Carla H.", rating: 5, comment: "Best flat white in Aley and the terrace view is unbeatable. My go-to work spot." },
      { authorName: "Rami K.", rating: 5, comment: "Cold brew is exceptional and the brunch is generous. Staff remember your order." },
      { authorName: "Nour A.", rating: 4, comment: "Lovely ambiance, great coffee. Gets busy on weekends but worth it." },
      { authorName: "Joelle S.", rating: 5, comment: "Avocado toast + Spanish latte = perfect morning. Highly recommend." },
    ],
    offers: [{ title: "Happy Hour 4–6 PM", description: "20% off all cold coffee every weekday afternoon.", type: "HAPPY_HOUR" }],
    events: [{ title: "Latte Art Throwdown", category: "Community", description: "Watch our baristas compete — free tastings all evening.", days: 9 }],
    faqs: [{ q: "Do you have wifi?", a: "Yes — fast free wifi and plenty of power outlets." }, { q: "Do you deliver?", a: "Yes, across Aley through the platform's delivery service." }],
  },

  // 2) RESTAURANT -----------------------------------------------------------
  {
    slug: "olive-and-vine", name: "Olive & Vine", category: "restaurants",
    tagline: "Modern Lebanese dining with a mountain view",
    description: "Olive & Vine brings refined Lebanese cuisine to Aley — mezze made from scratch, charcoal-grilled meats, and a terrace overlooking the valley. Perfect for family lunches, romantic dinners and special occasions.",
    priceRange: 3, ownerName: "Georges Haddad", phone: "+961 5 555 220", whatsapp: "+961 70 555 220",
    instagram: "oliveandvine", website: "https://oliveandvine.demo.aley.com", address: "Hilltop Avenue, Aley", ...near(1), hours: hours("12:00", "23:30"),
    tags: ["lebanese", "mezze", "grill", "fine dining", "terrace", "family friendly"],
    hasDelivery: true, hasReservations: true,
    galleryCaps: ["Our valley-view terrace", "Mixed mezze spread", "Charcoal mixed grill", "Elegant indoor dining", "Fresh tabbouleh", "Private event setup"],
    productLabel: "Menu",
    products: [
      { title: "Cold Mezze", items: [
        { name: "Hummus", price: 6, description: "Chickpeas, tahini, lemon, olive oil.", diet: ["vegan", "gluten-free"], featured: true },
        { name: "Tabbouleh", price: 7, description: "Parsley, tomato, bulgur, lemon and mint.", diet: ["vegan"] },
        { name: "Moutabal", price: 6, description: "Smoky grilled eggplant with tahini.", diet: ["vegan", "gluten-free"] },
      ]},
      { title: "Hot Mezze", items: [
        { name: "Cheese Rolls", price: 8, description: "Crispy filo filled with akkawi cheese.", diet: ["vegetarian"] },
        { name: "Falafel", price: 7, description: "Crispy chickpea fritters with tarator.", diet: ["vegan"] },
        { name: "Soujouk", price: 9, description: "Spicy Armenian sausage flambéed in lemon." },
      ]},
      { title: "From the Grill", items: [
        { name: "Mixed Grill Platter", price: 24, description: "Lamb chops, taouk, kafta and kebab with grilled veg.", featured: true, badge: "Best Seller" },
        { name: "Chicken Taouk", price: 16, description: "Marinated charcoal-grilled chicken skewers with garlic." },
        { name: "Lamb Chops", price: 26, description: "Tender chops grilled over charcoal.", badge: "Chef's Pick" },
      ]},
      { title: "Desserts", items: [
        { name: "Knefeh", price: 8, description: "Warm semolina-cheese pastry with orange-blossom syrup.", diet: ["vegetarian"], featured: true },
        { name: "Mouhalabia", price: 6, description: "Milk pudding with pistachio and rose water.", diet: ["vegetarian", "gluten-free"] },
      ]},
    ],
    reviews: [
      { authorName: "Tony R.", rating: 5, comment: "The mixed grill is outstanding and the terrace at sunset is magical. Booked for our anniversary." },
      { authorName: "Maya S.", rating: 5, comment: "Authentic mezze, generous portions, attentive service. A real Aley gem." },
      { authorName: "Hadi Z.", rating: 4, comment: "Excellent food. Reservation recommended on weekends — it fills up fast." },
      { authorName: "Christelle B.", rating: 5, comment: "Knefeh was the best I've had. We'll be back with the whole family." },
    ],
    offers: [{ title: "Family Sunday Lunch", description: "Kids eat free with every two adult mains, Sundays only.", type: "SEASONAL" }],
    events: [{ title: "Live Oud Night", category: "Music", description: "An evening of live Lebanese music on the terrace.", days: 12 }],
    faqs: [{ q: "Do you take reservations?", a: "Yes — book a table directly from this page." }, { q: "Is there parking?", a: "Yes, free valet parking for guests." }],
  },

  // 3) BEAUTY SALON ---------------------------------------------------------
  {
    slug: "atelier-elie", name: "Atelier Elie", category: "beauty-salons",
    tagline: "Hair, color & beauty studio in Aley",
    description: "Atelier Elie is a full-service beauty studio offering expert hair styling, coloring, bridal looks, facials and nails. Our team trains internationally and uses premium products to make every client feel their best.",
    priceRange: 3, ownerName: "Elie Khoury", phone: "+961 5 555 330", whatsapp: "+961 70 555 330",
    instagram: "atelierelie", address: "Boulevard, Aley", ...near(2), hours: hours("09:00", "19:00", [0]),
    tags: ["hair", "color", "bridal", "facials", "nails", "premium products"],
    bookingConfig: BOOK(),
    galleryCaps: ["Our styling floor", "Color transformation", "Bridal styling suite", "Relaxing wash stations", "Manicure bar", "Before & after"],
    services: [
      { name: "Women's Haircut & Blow-dry", description: "Consultation, cut, wash and professional blow-dry.", durationMin: 60, price: 35 },
      { name: "Full Hair Color", description: "Root-to-tip color with premium ammonia-free dye.", durationMin: 120, price: 85 },
      { name: "Highlights / Balayage", description: "Hand-painted highlights for a natural, sun-kissed look.", durationMin: 150, price: 120 },
      { name: "Bridal Hair & Makeup", description: "Complete bridal styling with trial session.", durationMin: 120, price: 200 },
      { name: "Signature Facial", description: "Deep-cleansing facial tailored to your skin.", durationMin: 60, price: 55 },
      { name: "Manicure & Gel Polish", description: "Shaping, cuticle care and long-lasting gel color.", durationMin: 45, price: 30 },
    ],
    staff: [
      { name: "Elie Khoury", role: "Master Stylist & Owner", bio: "20+ years in hair design, trained in Paris and Milan.", experience: "20 years", languages: ["Arabic", "English", "French"], rating: 5 },
      { name: "Rita Saliba", role: "Color Specialist", bio: "Balayage and creative color expert.", experience: "9 years", languages: ["Arabic", "English"], rating: 4.9 },
      { name: "Carla Mansour", role: "Esthetician & Nail Artist", bio: "Facials, skincare and nail art.", experience: "6 years", languages: ["Arabic", "French"], rating: 4.8 },
    ],
    reviews: [
      { authorName: "Nadia F.", rating: 5, comment: "Elie completely transformed my hair. Best colorist in the mountains!" },
      { authorName: "Yara T.", rating: 5, comment: "Booked my bridal trial here — flawless. Felt like a princess." },
      { authorName: "Rana H.", rating: 4, comment: "Lovely salon, great facial. Booking through the app made it so easy." },
      { authorName: "Lea N.", rating: 5, comment: "Always professional, always on time. My monthly ritual." },
    ],
    offers: [{ title: "New Client 15% Off", description: "First visit gets 15% off any color service.", type: "DISCOUNT" }],
    faqs: [{ q: "Do I need an appointment?", a: "Yes — book your slot and stylist directly from this page." }],
  },

  // 4) BARBER ---------------------------------------------------------------
  {
    slug: "the-gentlemens-cut", name: "The Gentlemen's Cut", category: "barbers",
    tagline: "Classic cuts, hot towels & beard craft",
    description: "A modern barbershop with old-school soul. Sharp fades, classic scissor cuts, hot-towel shaves and beard sculpting — in a relaxed space with good music and great conversation.",
    priceRange: 2, ownerName: "Karim Daher", phone: "+961 5 555 440", whatsapp: "+961 70 555 440",
    instagram: "gentlemenscut", address: "Main Road, Aley", ...near(3), hours: hours("10:00", "20:00", [0]),
    tags: ["fades", "beard", "hot towel shave", "kids cuts", "walk-ins welcome"],
    bookingConfig: BOOK({ bufferAfter: 5 }),
    galleryCaps: ["The barber floor", "Precision fade", "Hot-towel shave", "Beard sculpting", "Classic chairs", "Fresh cut finish"],
    services: [
      { name: "Haircut", description: "Consultation, cut and style.", durationMin: 30, price: 15 },
      { name: "Haircut & Beard", description: "Full cut plus beard trim and line-up.", durationMin: 45, price: 22 },
      { name: "Beard Trim & Shape", description: "Trim, line-up and conditioning.", durationMin: 20, price: 10 },
      { name: "Hot Towel Shave", description: "Traditional straight-razor shave with hot towels.", durationMin: 30, price: 18 },
      { name: "Kids Cut (under 12)", description: "Patient, friendly cuts for younger clients.", durationMin: 25, price: 12 },
    ],
    staff: [
      { name: "Karim Daher", role: "Master Barber & Owner", bio: "Specialist in fades and classic cuts.", experience: "12 years", languages: ["Arabic", "English"], rating: 5 },
      { name: "Marc Aoun", role: "Barber", bio: "Beard craft and hot-towel shaves.", experience: "7 years", languages: ["Arabic", "English"], rating: 4.9 },
    ],
    reviews: [
      { authorName: "Walid M.", rating: 5, comment: "Cleanest fade I've had in years. Karim is an artist." },
      { authorName: "Ziad K.", rating: 5, comment: "Hot towel shave is a must. Felt brand new walking out." },
      { authorName: "Fadi A.", rating: 4, comment: "Great cut, no waiting because I booked ahead. Recommend." },
      { authorName: "Elie S.", rating: 5, comment: "My son loves coming here — they're great with kids." },
    ],
    offers: [{ title: "Cut + Beard Combo", description: "Save $5 when you book a haircut and beard together.", type: "DISCOUNT" }],
  },

  // 5) DOCTOR / CLINIC ------------------------------------------------------
  {
    slug: "aley-medical-clinic", name: "Aley Medical Clinic", category: "clinics",
    tagline: "Trusted family healthcare in Aley",
    description: "Aley Medical Clinic provides comprehensive outpatient care — general medicine, pediatrics, cardiology and dermatology — with experienced physicians and modern facilities. Same-week appointments and most insurances accepted.",
    priceRange: 2, ownerName: "Dr. Joseph Rizk", phone: "+961 5 555 550", whatsapp: "+961 70 555 550",
    instagram: "aleymedical", website: "https://aleymedical.demo.aley.com", address: "Government Street, Aley", ...near(4), hours: hours("08:00", "17:00", [0]),
    tags: ["family medicine", "pediatrics", "cardiology", "dermatology", "insurance accepted"],
    bookingConfig: BOOK({ leadTimeHours: 4, bufferAfter: 0 }),
    galleryCaps: ["Reception & waiting area", "Consultation room", "Modern equipment", "Pediatric corner", "Our medical team", "Clean treatment rooms"],
    services: [
      { name: "General Consultation", description: "Comprehensive check-up with a family physician.", durationMin: 30, price: 40 },
      { name: "Pediatric Visit", description: "Child wellness and vaccination consultation.", durationMin: 30, price: 45 },
      { name: "Cardiology Consultation", description: "Heart health assessment incl. ECG.", durationMin: 45, price: 70 },
      { name: "Dermatology Consultation", description: "Skin assessment and treatment plan.", durationMin: 30, price: 60 },
    ],
    staff: [
      { name: "Dr. Joseph Rizk", role: "Family Medicine", bio: "Board-certified family physician, 18 years of practice.", experience: "18 years", languages: ["Arabic", "English", "French"], rating: 5 },
      { name: "Dr. Lina Karam", role: "Pediatrician", bio: "Gentle, child-focused care from newborns to teens.", experience: "12 years", languages: ["Arabic", "English"], rating: 4.9 },
      { name: "Dr. Marwan Sfeir", role: "Cardiologist", bio: "Preventive cardiology and diagnostics.", experience: "15 years", languages: ["Arabic", "English"], rating: 4.8 },
    ],
    reviews: [
      { authorName: "Sara N.", rating: 5, comment: "Dr. Rizk is thorough and caring. Booking online saved me the phone queue." },
      { authorName: "Nabil A.", rating: 5, comment: "Took my daughter to Dr. Karam — wonderful with kids. Clean and modern." },
      { authorName: "Hala Z.", rating: 4, comment: "Short wait, professional staff. Accepted my insurance smoothly." },
      { authorName: "Tony F.", rating: 5, comment: "Cardiology visit was reassuring and efficient. Highly recommend." },
    ],
    faqs: [{ q: "Do you accept insurance?", a: "Yes, we accept most major Lebanese insurers — bring your card." }, { q: "How do I book?", a: "Choose a doctor and time slot directly on this page." }],
  },

  // 6) DENTIST --------------------------------------------------------------
  {
    slug: "brightsmile-dental", name: "BrightSmile Dental", category: "dentists",
    tagline: "Gentle, modern dentistry & cosmetic care",
    description: "BrightSmile Dental offers complete dental care — cleanings, fillings, implants, orthodontics and teeth whitening — using the latest painless techniques. A calm, welcoming clinic for the whole family.",
    priceRange: 3, ownerName: "Dr. Sandra Gemayel", phone: "+961 5 555 660", whatsapp: "+961 70 555 660",
    instagram: "brightsmiledental", address: "Boulevard, Aley", ...near(0), hours: hours("09:00", "18:00", [0]),
    tags: ["cleaning", "implants", "orthodontics", "whitening", "painless", "family"],
    bookingConfig: BOOK({ leadTimeHours: 4 }),
    galleryCaps: ["Modern treatment room", "Digital X-ray suite", "Comfortable waiting lounge", "Our dental team", "Sterilization area", "Bright, clean clinic"],
    services: [
      { name: "Check-up & Cleaning", description: "Exam, scaling and polish.", durationMin: 45, price: 50 },
      { name: "Tooth Filling", description: "Tooth-colored composite filling.", durationMin: 45, price: 60 },
      { name: "Teeth Whitening", description: "In-clinic professional whitening session.", durationMin: 60, price: 150 },
      { name: "Dental Implant Consultation", description: "Assessment and treatment planning.", durationMin: 30, price: 40 },
      { name: "Braces Consultation", description: "Orthodontic evaluation and options.", durationMin: 30, price: 40 },
    ],
    staff: [
      { name: "Dr. Sandra Gemayel", role: "Cosmetic Dentist & Owner", bio: "Cosmetic and restorative dentistry specialist.", experience: "16 years", languages: ["Arabic", "English", "French"], rating: 5 },
      { name: "Dr. Nadim Wakim", role: "Orthodontist", bio: "Braces and clear aligners for all ages.", experience: "11 years", languages: ["Arabic", "English"], rating: 4.9 },
    ],
    reviews: [
      { authorName: "Rana K.", rating: 5, comment: "Genuinely painless cleaning and a beautiful clinic. Dr. Sandra is the best." },
      { authorName: "Karim B.", rating: 5, comment: "Whitening results were amazing. Friendly, professional team." },
      { authorName: "Maya H.", rating: 4, comment: "Got my braces consultation here. Clear explanation, no pressure." },
      { authorName: "Joseph A.", rating: 5, comment: "Booked online, seen on time, zero pain. Couldn't ask for more." },
    ],
    offers: [{ title: "Free Whitening Touch-up", description: "Complimentary touch-up with any new implant treatment.", type: "SEASONAL" }],
  },

  // 7) CAR WASH -------------------------------------------------------------
  {
    slug: "aquashine-car-wash", name: "AquaShine Car Wash", category: "car-washes",
    tagline: "Spotless cars, inside and out",
    description: "AquaShine is Aley's premium hand car wash and detailing center. From a quick exterior rinse to full interior detailing and ceramic protection — book a bay and we'll make your car shine.",
    priceRange: 2, ownerName: "Walid Nassar", phone: "+961 5 555 770", whatsapp: "+961 70 555 770",
    instagram: "aquashinealey", address: "Damascus Road, Aley", ...near(1), hours: hours("08:00", "19:00"),
    tags: ["hand wash", "detailing", "ceramic coating", "interior cleaning", "memberships"],
    bookingConfig: BOOK({ capacity: 2, slotInterval: 30, bufferAfter: 0 }),
    galleryCaps: ["Our wash bays", "Foam hand wash", "Interior detailing", "Wheels & tire shine", "Ceramic coating", "Finished and gleaming"],
    services: [
      { name: "Express Exterior Wash", description: "Foam wash, rinse, hand dry.", durationMin: 30, price: 8 },
      { name: "Wash & Interior Clean", description: "Exterior wash plus vacuum and dashboard wipe-down.", durationMin: 45, price: 15 },
      { name: "Full Detail", description: "Deep interior + exterior detailing, wax finish.", durationMin: 120, price: 45 },
      { name: "Ceramic Coating", description: "Long-lasting paint protection (by appointment).", durationMin: 240, price: 180 },
    ],
    staff: [
      { name: "Bay 1 — Express", role: "Quick wash bay", bio: "For express and standard washes.", experience: "", languages: [], rating: 0 },
      { name: "Bay 2 — Detailing", role: "Detailing bay", bio: "For full details and ceramic coating.", experience: "", languages: [], rating: 0 },
    ],
    reviews: [
      { authorName: "Sami D.", rating: 5, comment: "Car looks brand new every time. Booking a slot means no waiting." },
      { authorName: "Georges A.", rating: 5, comment: "Full detail was incredible value. They didn't miss a spot." },
      { authorName: "Rabih N.", rating: 4, comment: "Fast express wash on my way to work. Great staff." },
      { authorName: "Dina S.", rating: 5, comment: "The membership pays for itself. Highly recommend AquaShine." },
    ],
    offers: [{ title: "Monthly Unlimited — $39", description: "Unlimited express washes all month. Ask at the counter to join.", type: "SEASONAL" }],
    faqs: [{ q: "Do you offer memberships?", a: "Yes — a monthly unlimited express-wash plan is available. Ask staff to enroll." }],
  },

  // 8) MECHANIC -------------------------------------------------------------
  {
    slug: "proauto-garage", name: "ProAuto Garage", category: "mechanics",
    tagline: "Honest car repair & maintenance you can trust",
    description: "ProAuto Garage handles everything from routine servicing to major repairs — engine diagnostics, brakes, suspension, AC and more. Transparent quotes, genuine parts, and a team that explains exactly what your car needs.",
    priceRange: 2, ownerName: "Tony Azar", phone: "+961 5 555 880", whatsapp: "+961 70 555 880",
    instagram: "proautogarage", address: "Bhamdoun Road, Aley", ...near(2), hours: hours("08:00", "18:00", [0]),
    tags: ["engine diagnostics", "brakes", "suspension", "AC service", "genuine parts"],
    bookingConfig: BOOK({ mode: "service", leadTimeHours: 4, bufferAfter: 0, slotInterval: 60 }),
    galleryCaps: ["Our service bays", "Engine diagnostics", "Brake service", "Clean, organized workshop", "Genuine parts", "Quality checks"],
    services: [
      { name: "Full Service", description: "Oil, filters, fluids and 30-point inspection.", durationMin: 90, price: 60 },
      { name: "Engine Diagnostics", description: "Computer scan and fault report.", durationMin: 60, price: 25 },
      { name: "Brake Service", description: "Pad/disc inspection and replacement.", durationMin: 90, price: 80 },
      { name: "AC Service & Regas", description: "AC check, clean and refrigerant top-up.", durationMin: 60, price: 45 },
    ],
    reviews: [
      { authorName: "Marc K.", rating: 5, comment: "Finally a mechanic I trust. Clear quote, fixed right the first time." },
      { authorName: "Bilal H.", rating: 5, comment: "Diagnosed an issue two other garages missed. Honest and skilled." },
      { authorName: "Nabil S.", rating: 4, comment: "Booked a service request through the app, dropped the car, done same day." },
      { authorName: "Elie R.", rating: 5, comment: "Fair prices and genuine parts. Won't take my car anywhere else." },
    ],
    faqs: [{ q: "How do I request a service?", a: "Tap Request Service, pick what your car needs and a time, and we'll confirm." }],
  },

  // 9) SPARE PARTS SHOP -----------------------------------------------------
  {
    slug: "autoparts-plus", name: "AutoParts Plus", category: "auto-parts",
    tagline: "Genuine & aftermarket parts for every car",
    description: "AutoParts Plus stocks thousands of genuine and quality aftermarket parts — filters, brakes, batteries, belts and accessories — for all major brands. Can't find it? WhatsApp us the part and we'll source it fast.",
    priceRange: 2, ownerName: "Fadi Ghanem", phone: "+961 5 555 990", whatsapp: "+961 70 555 990",
    instagram: "autopartsplus", address: "Damascus Road, Aley", ...near(3), hours: hours("08:00", "19:00", [0]),
    tags: ["genuine parts", "aftermarket", "batteries", "filters", "fast sourcing"],
    hasDelivery: true,
    galleryCaps: ["Our parts showroom", "Fully stocked shelves", "Batteries & electricals", "Filters & belts", "Brake components", "Friendly parts desk"],
    productLabel: "Parts catalog",
    products: [
      { title: "Filters", items: [
        { name: "Oil Filter", price: 8, description: "Genuine and OEM options for most models.", image: undefined },
        { name: "Air Filter", price: 10, description: "High-flow air filters." },
        { name: "Cabin Filter", price: 12, description: "Keeps your AC air clean." },
      ]},
      { title: "Brakes", items: [
        { name: "Brake Pads (set)", price: 35, description: "Front or rear, ceramic or semi-metallic.", featured: true },
        { name: "Brake Discs (pair)", price: 60, description: "Ventilated discs for most models." },
      ]},
      { title: "Electrical", items: [
        { name: "Car Battery 12V 70Ah", price: 95, description: "Maintenance-free, 2-year warranty.", featured: true, badge: "Best Seller" },
        { name: "Wiper Blades (pair)", price: 14, description: "All-season silicone wipers." },
        { name: "Spark Plugs (set of 4)", price: 24, description: "Iridium long-life plugs." },
      ]},
    ],
    reviews: [
      { authorName: "Ziad A.", rating: 5, comment: "Had my exact battery in stock and delivered it same day. Lifesaver." },
      { authorName: "Karim M.", rating: 5, comment: "WhatsApped a photo of an odd part, they sourced it in two days." },
      { authorName: "Joseph H.", rating: 4, comment: "Good prices on genuine parts. Knowledgeable staff." },
      { authorName: "Rami T.", rating: 5, comment: "Ordered online, delivered to my mechanic. Super convenient." },
    ],
    offers: [{ title: "Free Delivery over $50", description: "Free same-day delivery across Aley on orders above $50.", type: "DISCOUNT" }],
  },

  // 10) HOTEL ---------------------------------------------------------------
  {
    slug: "grand-aley-hotel", name: "Grand Aley Hotel", category: "hotels",
    tagline: "Mountain-view comfort & hospitality",
    description: "Grand Aley Hotel offers elegant rooms and suites with sweeping mountain views, a rooftop restaurant, spa and event halls. The perfect base for summer escapes, weddings and business stays in Aley.",
    priceRange: 3, ownerName: "Carmen Tannous", phone: "+961 5 555 120", whatsapp: "+961 70 555 120",
    instagram: "grandaleyhotel", website: "https://grandaley.demo.aley.com", address: "Hilltop Avenue, Aley", ...near(4), hours: hours("00:00", "23:59"),
    tags: ["mountain view", "rooftop restaurant", "spa", "free wifi", "parking", "events"],
    galleryCaps: ["Hotel exterior at dusk", "Deluxe mountain-view room", "Executive suite", "Rooftop restaurant", "Spa & wellness", "Wedding hall"],
    productLabel: "Rooms & suites",
    products: [
      { title: "Rooms", items: [
        { name: "Standard Double Room", price: 80, description: "Cozy room with queen bed and balcony.", featured: true },
        { name: "Deluxe Mountain-View Room", price: 120, description: "Spacious room with panoramic valley views.", badge: "Most Popular" },
        { name: "Executive Suite", price: 200, description: "Separate living area, premium amenities, best views.", badge: "Best Value" },
      ]},
      { title: "Amenities", items: [
        { name: "Airport Transfer", price: 60, description: "Private transfer to/from Beirut airport." },
        { name: "Spa Day Pass", price: 40, description: "Full-day access to spa, sauna and pool." },
      ]},
    ],
    reviews: [
      { authorName: "Lina F.", rating: 5, comment: "Woke up to the most beautiful mountain view. Impeccable service." },
      { authorName: "Marwan K.", rating: 5, comment: "Hosted our wedding here — the hall and rooftop were stunning." },
      { authorName: "Sara B.", rating: 4, comment: "Comfortable suite, great breakfast. Will return next summer." },
      { authorName: "Tony N.", rating: 5, comment: "Quiet, elegant and friendly staff. Best hotel in Aley." },
    ],
    faqs: [{ q: "How do I book a room?", a: "Contact us by phone or WhatsApp to reserve — instant online booking is coming soon." }],
  },

  // 11) REAL ESTATE ---------------------------------------------------------
  {
    slug: "aley-heights-realty", name: "Aley Heights Realty", category: "real-estate",
    tagline: "Your trusted partner for mountain property",
    description: "Aley Heights Realty helps you buy, sell and rent across Aley and Mount Lebanon. From cozy apartments to luxury villas with valley views, our agents know every neighborhood and guide you every step of the way.",
    priceRange: 3, ownerName: "Rana Maalouf", phone: "+961 5 555 130", whatsapp: "+961 70 555 130",
    instagram: "aleyheightsrealty", website: "https://aleyheights.demo.aley.com", address: "Main Road, Aley", ...near(0), hours: hours("09:00", "18:00", [0]),
    tags: ["apartments", "villas", "rentals", "sales", "property management"],
    galleryCaps: ["Featured villa with valley view", "Modern apartment living room", "Cozy mountain chalet", "Our agency office", "Terrace with a view", "Neighborhood streets"],
    productLabel: "Featured listings",
    products: [
      { title: "For Sale", items: [
        { name: "3-Bed Villa — Aley Hills", price: 450000, description: "350 m², garden, panoramic valley view, 2 parking spots.", featured: true, badge: "Featured" },
        { name: "2-Bed Apartment — Town Center", price: 185000, description: "140 m², modern finishing, walking distance to Souk Street." },
      ]},
      { title: "For Rent", items: [
        { name: "1-Bed Apartment — Boulevard", price: 600, description: "Furnished, monthly rent, balcony with mountain view." },
        { name: "Mountain Chalet — Seasonal", price: 1500, description: "2 bedrooms, fireplace, summer-season rental." },
      ]},
    ],
    reviews: [
      { authorName: "Hadi K.", rating: 5, comment: "Rana found us our dream villa in two weeks. Honest and professional." },
      { authorName: "Joelle A.", rating: 5, comment: "Smooth rental process, transparent fees. Highly recommend the team." },
      { authorName: "Nabil S.", rating: 4, comment: "Great knowledge of Aley neighborhoods. Found a tenant fast." },
    ],
    faqs: [{ q: "Can I schedule a viewing?", a: "Yes — call or WhatsApp the agent and we'll arrange a visit." }],
  },

  // 12) RETAIL STORE --------------------------------------------------------
  {
    slug: "urban-threads", name: "Urban Threads", category: "fashion",
    tagline: "Contemporary fashion for him & her",
    description: "Urban Threads is Aley's go-to boutique for modern, affordable fashion — curated collections of clothing, shoes and accessories for men and women. New arrivals weekly, with delivery across Aley.",
    priceRange: 2, ownerName: "Christelle Chami", phone: "+961 5 555 140", whatsapp: "+961 70 555 140",
    instagram: "urbanthreads", website: "https://urbanthreads.demo.aley.com", address: "Souk Street, Aley", ...near(1), hours: hours("10:00", "21:00"),
    tags: ["women's fashion", "men's fashion", "shoes", "accessories", "new arrivals"],
    hasDelivery: true,
    galleryCaps: ["Our boutique storefront", "Women's collection", "Men's collection", "Shoe wall", "Accessories display", "New arrivals"],
    productLabel: "Shop",
    products: [
      { title: "Women", items: [
        { name: "Linen Summer Dress", price: 45, description: "Lightweight linen, available in 4 colors.", featured: true, badge: "New" },
        { name: "Denim Jacket", price: 55, description: "Classic fit, premium denim." },
        { name: "Silk Scarf", price: 20, description: "Hand-finished print, gift-boxed." },
      ]},
      { title: "Men", items: [
        { name: "Cotton Polo Shirt", price: 30, description: "Breathable pique cotton, slim fit.", featured: true },
        { name: "Chino Trousers", price: 42, description: "Stretch cotton chinos in 5 shades." },
        { name: "Leather Belt", price: 25, description: "Genuine leather, brushed buckle." },
      ]},
      { title: "Shoes", items: [
        { name: "White Sneakers", price: 60, description: "Minimalist leather sneakers.", badge: "Best Seller" },
        { name: "Loafers", price: 70, description: "Comfort-sole suede loafers." },
      ]},
    ],
    reviews: [
      { authorName: "Tala K.", rating: 5, comment: "Love the curated pieces — got compliments all week. Fast delivery too." },
      { authorName: "Marc H.", rating: 4, comment: "Good quality polos at a fair price. Friendly staff." },
      { authorName: "Nour S.", rating: 5, comment: "Ordered online, delivered next day in Aley. Will shop again." },
      { authorName: "Carine A.", rating: 5, comment: "New arrivals every week keep me coming back. Lovely boutique." },
    ],
    offers: [{ title: "Buy 2 Get 1 Free", description: "On all accessories, this month only.", type: "BOGO" }],
  },

  // 13) PHARMACY ------------------------------------------------------------
  {
    slug: "aley-central-pharmacy", name: "Aley Central Pharmacy", category: "pharmacies",
    tagline: "Your health, our priority — with home delivery",
    description: "Aley Central Pharmacy provides prescription medicines, over-the-counter health products, skincare, baby care and wellness essentials. Friendly pharmacists, competitive prices, and fast home delivery across Aley.",
    priceRange: 2, ownerName: "Dr. Rita Sleiman", phone: "+961 5 555 150", whatsapp: "+961 70 555 150",
    instagram: "aleycentralpharmacy", address: "Main Road, Aley", ...near(2), hours: hours("08:00", "22:00"),
    tags: ["prescriptions", "skincare", "baby care", "wellness", "home delivery"],
    hasDelivery: true,
    galleryCaps: ["Pharmacy storefront", "Well-stocked aisles", "Skincare & cosmetics", "Baby care section", "Consultation counter", "Wellness products"],
    productLabel: "Products",
    products: [
      { title: "Over the Counter", items: [
        { name: "Pain Relief Tablets", price: 6, description: "Paracetamol 500mg, 20 tablets." },
        { name: "Cold & Flu Sachets", price: 9, description: "Daytime relief, 10 sachets." },
        { name: "Vitamin C 1000mg", price: 12, description: "Effervescent, 20 tablets.", featured: true },
      ]},
      { title: "Skincare", items: [
        { name: "SPF 50 Sunscreen", price: 18, description: "Broad-spectrum, non-greasy.", featured: true, badge: "Best Seller" },
        { name: "Moisturizing Cream", price: 15, description: "For dry and sensitive skin." },
      ]},
      { title: "Baby Care", items: [
        { name: "Baby Diapers (pack)", price: 14, description: "Sizes 1–5 available." },
        { name: "Baby Formula", price: 22, description: "Stage 1 & 2 in stock." },
      ]},
    ],
    reviews: [
      { authorName: "Maya D.", rating: 5, comment: "Delivered my prescription within the hour. Caring pharmacists." },
      { authorName: "Georges S.", rating: 5, comment: "Always in stock and the delivery is so convenient when I'm sick." },
      { authorName: "Hala N.", rating: 4, comment: "Good prices and helpful advice on skincare. Recommend." },
      { authorName: "Sami K.", rating: 5, comment: "Open late and quick service. A reliable neighborhood pharmacy." },
    ],
    faqs: [{ q: "Can you deliver prescriptions?", a: "Yes — send us your prescription on WhatsApp and we'll deliver across Aley." }],
  },

  // 14) GYM -----------------------------------------------------------------
  {
    slug: "powerhouse-gym", name: "PowerHouse Gym", category: "gyms",
    tagline: "Train hard. Live strong.",
    description: "PowerHouse Gym is Aley's premium fitness center — fully equipped strength and cardio zones, group classes, and certified personal trainers. Flexible memberships and class bookings to fit your schedule.",
    priceRange: 2, ownerName: "Marwan Bou Khalil", phone: "+961 5 555 160", whatsapp: "+961 70 555 160",
    instagram: "powerhousegym", website: "https://powerhouse.demo.aley.com", address: "Boulevard, Aley", ...near(3), hours: hours("06:00", "23:00"),
    tags: ["strength", "cardio", "group classes", "personal training", "showers", "parking"],
    bookingConfig: BOOK({ mode: "appointment", capacity: 12, slotInterval: 60, bufferAfter: 0, leadTimeHours: 1 }),
    galleryCaps: ["Strength training floor", "Cardio zone", "Group class studio", "Free weights area", "Functional training rig", "Locker rooms"],
    services: [
      { name: "Day Pass", description: "Full-day access to all equipment and facilities.", durationMin: 60, price: 10 },
      { name: "Group Class — HIIT", description: "45-minute high-intensity interval class.", durationMin: 60, price: 12 },
      { name: "Group Class — Yoga", description: "Vinyasa flow for all levels.", durationMin: 60, price: 12 },
      { name: "Personal Training Session", description: "1-on-1 session with a certified trainer.", durationMin: 60, price: 30 },
    ],
    staff: [
      { name: "Marwan Bou Khalil", role: "Head Coach & Owner", bio: "Strength and conditioning specialist.", experience: "14 years", languages: ["Arabic", "English"], rating: 5 },
      { name: "Yara Tannous", role: "Yoga & Pilates Instructor", bio: "Certified yoga instructor, mobility focus.", experience: "8 years", languages: ["Arabic", "English", "French"], rating: 4.9 },
      { name: "Hadi Sfeir", role: "Personal Trainer", bio: "Fat loss and hypertrophy programs.", experience: "6 years", languages: ["Arabic", "English"], rating: 4.8 },
    ],
    reviews: [
      { authorName: "Bilal A.", rating: 5, comment: "Best-equipped gym in Aley. Booking classes online is so easy." },
      { authorName: "Rita K.", rating: 5, comment: "Yara's yoga class is the highlight of my week. Amazing energy." },
      { authorName: "Ziad H.", rating: 4, comment: "Great trainers and clean facilities. Membership is good value." },
      { authorName: "Lea S.", rating: 5, comment: "Lost 8kg with Hadi's program. Supportive, professional team." },
    ],
    offers: [{ title: "First Class Free", description: "Try any group class on us — no commitment.", type: "DISCOUNT" }],
    events: [{ title: "Saturday Bootcamp", category: "Sports", description: "Outdoor group bootcamp — all fitness levels welcome.", days: 5 }],
  },
];

async function main() {
  console.log(`Seeding ${DEMOS.length} flagship demo businesses (idempotent)…`);
  const city = await prisma.city.findUnique({ where: { slug: "aley" } });
  if (!city) throw new Error("City 'aley' not found — run the main seed first (npm run seed).");
  const cats = await prisma.category.findMany();
  const catId = new Map(cats.map((c) => [c.slug, c.id]));

  for (const d of DEMOS) {
    const categoryId = catId.get(d.category);
    if (!categoryId) { console.warn(`  ! skipping ${d.slug}: category ${d.category} missing`); continue; }
    const color = COLORS[d.category] ?? "0d9488";
    const revs = d.reviews;
    const ratingVal = rating(revs);

    const data: any = {
      cityId: city.id, categoryId, name: d.name, tagline: d.tagline, description: d.description,
      logo: avatar(d.name, color), cover: photo(`${d.slug}-cover`, d.category, 1200, 600),
      gallery: JSON.stringify(gal(d.slug, d.category, d.galleryCaps)),
      phone: d.phone, whatsapp: d.whatsapp, instagram: d.instagram, facebook: `https://facebook.com/${d.instagram}`,
      website: d.website ?? "", email: `info@${d.instagram}.demo.aley.com`,
      address: d.address, lat: d.lat, lng: d.lng, hours: JSON.stringify(d.hours),
      priceRange: d.priceRange, hasDelivery: !!d.hasDelivery, hasReservations: !!d.hasReservations,
      bookingConfig: d.bookingConfig ? JSON.stringify(d.bookingConfig) : "{}",
      tags: JSON.stringify(d.tags), faqs: JSON.stringify(d.faqs ?? []),
      products: JSON.stringify((d.products ?? []).map((s: any) => ({
        title: s.title,
        items: s.items.map((it: any) => ({ ...it, image: it.image === undefined ? pimg(d.slug, it.name, d.category) : it.image, available: true })),
      }))),
      productLabel: d.productLabel ?? "Products & Services", ownerName: d.ownerName,
      isPublished: true, isFeatured: true, isVerified: true,
      rating: ratingVal, reviewCount: revs.length, viewCount: 200 + Math.floor(Math.random() * 800),
    };

    const existing = await prisma.business.findUnique({ where: { slug: d.slug } });
    const biz = existing
      ? await prisma.business.update({ where: { slug: d.slug }, data })
      : await prisma.business.create({ data: { slug: d.slug, isClaimed: false, ...data } });

    // Replace child records (idempotent).
    await prisma.review.deleteMany({ where: { businessId: biz.id } });
    await prisma.service.deleteMany({ where: { businessId: biz.id } });
    await prisma.staffMember.deleteMany({ where: { businessId: biz.id } });
    await prisma.offer.deleteMany({ where: { businessId: biz.id } });
    await prisma.event.deleteMany({ where: { businessId: biz.id } });

    await prisma.review.createMany({ data: revs.map((r) => ({ businessId: biz.id, authorName: r.authorName, rating: r.rating, comment: r.comment, status: "APPROVED" })) });
    if (d.services?.length) await prisma.service.createMany({ data: d.services.map((s, i) => ({ businessId: biz.id, name: s.name, description: s.description ?? "", durationMin: s.durationMin, price: s.price, sortOrder: i })) });
    if (d.staff?.length) await prisma.staffMember.createMany({ data: d.staff.map((s, i) => ({ businessId: biz.id, name: s.name, role: s.role, avatar: avatar(s.name, color), bio: s.bio ?? "", experience: s.experience ?? "", languages: JSON.stringify(s.languages ?? []), rating: s.rating ?? 0, sortOrder: i })) });
    if (d.offers?.length) await prisma.offer.createMany({ data: d.offers.map((o) => ({ businessId: biz.id, cityId: city.id, title: o.title, description: o.description, type: o.type, image: photo(`${d.slug}-offer`, d.category, 800, 500), isActive: true })) });
    if (d.events?.length) await prisma.event.createMany({ data: d.events.map((e) => ({ businessId: biz.id, cityId: city.id, title: e.title, category: e.category, description: e.description, location: d.name, image: photo(`${d.slug}-event`, d.category, 1000, 600), startTime: new Date(Date.now() + e.days * 86400000), isPublished: true })) });

    console.log(`  ✓ ${d.name} (${d.category}) — ${revs.length} reviews, ${d.services?.length ?? 0} services, ${d.staff?.length ?? 0} staff`);
  }

  // Keep the demo owner attached to Bean Avenue (so the owner dashboard demo works).
  const owner = await prisma.owner.findUnique({ where: { email: "owner@aley.com" } });
  if (owner) await prisma.business.update({ where: { slug: "bean-avenue" }, data: { ownerId: owner.id, isClaimed: true } }).catch(() => {});

  console.log(`✅ Done. ${DEMOS.length} flagship demos ready (featured + verified).`);
}

main().catch((e) => { console.error(e); process.exit(1); }).finally(() => prisma.$disconnect());
