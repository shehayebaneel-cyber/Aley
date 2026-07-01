import type { Business, Category } from "../types";

// A "kit" tailors the owner dashboard to an industry: which of the existing tools
// to surface first (`primary`), a friendly label, and an onboarding checklist.
// Nothing is hidden — the full tab nav still shows every tool. The kit just
// highlights what matters for this category and guides setup.

export interface KitStep { key: string; tab: string; label: string }
export interface CategoryKit {
  label: string;      // "Restaurant", "Salon", "Clinic"…
  emoji: string;
  blurb: string;      // one-line pitch shown in the toolkit strip
  primary: string[];  // ordered tab ids to surface (must match dashboard TABS)
  steps: KitStep[];   // setup checklist
  catalogLabel?: string; // relabel the "Menu" tool for this industry
}

// Reusable steps.
const ST = {
  photos: { key: "photos", tab: "Photos", label: "Add your logo, cover & photos" },
  hours: { key: "hours", tab: "Hours", label: "Set your opening hours" },
  contact: { key: "contact", tab: "Profile", label: "Add phone & WhatsApp" },
  menu: { key: "menu", tab: "Menu", label: "Build your menu" },
  catalog: { key: "menu", tab: "Menu", label: "Add your product catalog" },
  reservations: { key: "reservations", tab: "Reservations", label: "Turn on table reservations" },
  delivery: { key: "delivery", tab: "Profile", label: "Enable delivery & ordering" },
  booking: { key: "booking", tab: "Booking Setup", label: "Enable appointment booking" },
  services: { key: "booking", tab: "Booking Setup", label: "Add your services & staff" },
  facilities: { key: "facilities", tab: "Facilities", label: "Add your fields / courts" },
  voucher: { key: "voucher", tab: "Gift Vouchers", label: "Sell gift cards" },
  offer: { key: "offer", tab: "Offers", label: "Create your first deal" },
  event: { key: "event", tab: "Events", label: "Host an event" },
  requests: { key: "contact", tab: "Requests", label: "Respond to quote requests" },
  insurance: { key: "profile", tab: "Profile", label: "List services & insurance accepted" },
  share: { key: "share", tab: "Share", label: "Print your QR & share your page" },
} satisfies Record<string, KitStep>;

// Per-group defaults.
const GROUP_KITS: Record<string, CategoryKit> = {
  "Food & Drinks": {
    label: "Restaurant", emoji: "🍽️", blurb: "Menu, orders, reservations & loyalty — everything to fill more tables.",
    primary: ["Menu", "Orders", "Reservations", "Gift Vouchers", "Offers", "Events", "Reviews"],
    steps: [ST.photos, ST.menu, ST.hours, ST.reservations, ST.delivery, ST.offer, ST.share],
  },
  "Health & Beauty": {
    label: "Salon & Spa", emoji: "💇", blurb: "Appointments, staff, packages & gift vouchers — booked out, effortlessly.",
    primary: ["Bookings", "Booking Setup", "Gift Vouchers", "Offers", "Photos", "Reviews"],
    steps: [ST.photos, ST.booking, ST.services, ST.voucher, ST.offer, ST.share],
  },
  "Automotive": {
    label: "Auto shop", emoji: "🚗", blurb: "Quote requests, appointments & pickup — win more jobs.",
    primary: ["Requests", "Bookings", "Booking Setup", "Offers", "Reviews"],
    steps: [ST.photos, ST.requests, ST.booking, ST.delivery, ST.offer, ST.share],
  },
  "Shopping": {
    label: "Store", emoji: "🛍️", blurb: "Catalog, online orders, delivery & gift cards — sell beyond your walls.",
    primary: ["Menu", "Orders", "Offers", "Gift Vouchers", "Reviews"], catalogLabel: "Catalog",
    steps: [ST.photos, ST.catalog, ST.delivery, ST.voucher, ST.offer, ST.share],
  },
  "Entertainment & Recreation": {
    label: "Venue", emoji: "🎯", blurb: "Field booking, memberships & tournaments — keep every slot full.",
    primary: ["Facilities", "Field Bookings", "Offers", "Events", "Gift Vouchers", "Reviews"],
    steps: [ST.photos, ST.facilities, ST.offer, ST.event, ST.share],
  },
  "Home & Living": {
    label: "Service pro", emoji: "🛠️", blurb: "Quote requests, appointments & offers — turn enquiries into jobs.",
    primary: ["Requests", "Bookings", "Booking Setup", "Offers", "Reviews"],
    steps: [ST.photos, ST.booking, ST.offer, ST.contact, ST.share],
  },
  "Professional Services": {
    label: "Practice", emoji: "💼", blurb: "Appointments, services & reviews — look the part, win the client.",
    primary: ["Bookings", "Booking Setup", "Offers", "Reviews"],
    steps: [ST.photos, ST.booking, ST.services, ST.offer, ST.share],
  },
  "Education & Training": {
    label: "Academy", emoji: "🎓", blurb: "Class bookings, events & offers — fill every course.",
    primary: ["Bookings", "Booking Setup", "Events", "Offers", "Reviews"],
    steps: [ST.photos, ST.booking, ST.event, ST.offer, ST.share],
  },
  "Stay & Tourism": {
    label: "Stay", emoji: "🏨", blurb: "Room requests, packages & gift stays — book direct, skip the OTAs.",
    primary: ["Reservations", "Offers", "Events", "Gift Vouchers", "Photos", "Reviews"],
    steps: [ST.photos, ST.reservations, ST.offer, ST.voucher, ST.share],
  },
};

// Finer per-slug overrides where a category needs a different toolkit than its group.
const kitEntries = (slugs: string[], kit: CategoryKit): [string, CategoryKit][] => slugs.map((s) => [s, kit]);
const SLUG_KITS: Record<string, CategoryKit> = {
  ...Object.fromEntries(kitEntries(["clinics", "dentists", "medical-centers", "medical-labs", "physiotherapy", "psychologists", "veterinary", "opticians"], {
    label: "Clinic", emoji: "🩺", blurb: "Appointments, services, insurance & reminders — care that runs on time.",
    primary: ["Bookings", "Booking Setup", "Offers", "Reviews", "Profile"],
    steps: [ST.booking, ST.services, ST.insurance, ST.photos, ST.share],
  })),
  ...Object.fromEntries(kitEntries(["gyms", "yoga-pilates", "personal-trainers"], {
    label: "Fitness", emoji: "🏋️", blurb: "Class bookings, memberships & challenges — keep members coming back.",
    primary: ["Bookings", "Booking Setup", "Gift Vouchers", "Offers", "Events", "Reviews"],
    steps: [ST.photos, ST.booking, ST.voucher, ST.event, ST.offer, ST.share],
  })),
  ...Object.fromEntries(kitEntries(["pharmacies"], {
    label: "Pharmacy", emoji: "💊", blurb: "Catalog, delivery & offers — refills at their fingertips.",
    primary: ["Menu", "Orders", "Offers", "Reviews"], catalogLabel: "Catalog",
    steps: [ST.photos, ST.catalog, ST.delivery, ST.offer, ST.share],
  })),
};

const FALLBACK: CategoryKit = {
  label: "Business", emoji: "🏪", blurb: "Your page, your offers, your reviews — all in one place.",
  primary: ["Offers", "Gift Vouchers", "Photos", "Reviews"],
  steps: [ST.photos, ST.contact, ST.hours, ST.offer, ST.share],
};

/** Resolve the toolkit for a business's category (slug override → group → fallback). */
export function kitFor(category: Category | undefined): CategoryKit {
  if (!category) return FALLBACK;
  return SLUG_KITS[category.slug] ?? GROUP_KITS[category.group ?? ""] ?? FALLBACK;
}

/** Is an onboarding step already done, from the business data we already have? */
export function stepDone(key: string, b: Business, counts: { offers?: number; events?: number }): boolean {
  switch (key) {
    case "photos": return !!(b.logo && b.cover);
    case "menu": return (b.products?.length ?? 0) > 0;
    case "hours": return (b.hours?.length ?? 0) > 0;
    case "booking": return !!(b.appointmentBookable || b.hasBooking);
    case "reservations": return !!b.hasReservations;
    case "delivery": return !!b.hasDelivery;
    case "facilities": return !!(b.hasFacilities || (b.facilities?.length ?? 0) > 0);
    case "voucher": return !!b.hasVouchers;
    case "offer": return (counts.offers ?? 0) > 0;
    case "event": return (counts.events ?? 0) > 0;
    case "profile": return !!(b.description && b.phone && b.address);
    case "contact": return !!(b.phone || b.whatsapp);
    case "share": return false; // always actionable — encourage printing the QR
    default: return false;
  }
}
