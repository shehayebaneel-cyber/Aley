// Smart "Request a Quote" forms per category. Field schemas are data-driven so
// RequestQuoteModal renders any category, and the dashboards can label payloads.
// Keep the supported slugs in sync with server/src/lib/requestCategories.ts.

export interface RFField {
  key: string;
  label: string;
  type: "text" | "number" | "select" | "textarea" | "toggle" | "date";
  options?: string[];
  placeholder?: string;
  required?: boolean;
}

export const CAR_MAKES = ["Mercedes", "BMW", "Hyundai", "Toyota", "Nissan", "Kia", "Honda", "Ford", "Chevrolet", "Volkswagen", "Audi", "Peugeot", "Renault", "Mazda", "Mitsubishi", "Jeep", "Lexus", "Suzuki", "Dodge", "GMC", "Volvo", "Other"];

// ---- Reusable vehicle block ----
const VEHICLE: RFField[] = [
  { key: "make", label: "Car make", type: "select", options: CAR_MAKES, required: true },
  { key: "model", label: "Model", type: "text", placeholder: "e.g. Corolla" },
  { key: "year", label: "Year", type: "text", placeholder: "e.g. 2018" },
];

// ---- Templates by vertical (fallback for categories without a bespoke form) ----
const HOME_TEMPLATE: RFField[] = [
  { key: "serviceNeeded", label: "What do you need?", type: "text", placeholder: "e.g. fix a leaking sink", required: true },
  { key: "details", label: "Describe the job", type: "textarea", placeholder: "More detail helps businesses quote accurately" },
  { key: "urgency", label: "Urgency", type: "select", options: ["Flexible", "This week", "Urgent (ASAP)"] },
  { key: "onsite", label: "On-site visit needed", type: "toggle" },
  { key: "preferredTime", label: "Preferred date", type: "date" },
];
const PRO_TEMPLATE: RFField[] = [
  { key: "serviceNeeded", label: "Service needed", type: "text", placeholder: "e.g. company registration", required: true },
  { key: "details", label: "Details", type: "textarea", placeholder: "Describe your situation / what you need" },
  { key: "preferredContact", label: "Preferred contact", type: "select", options: ["Phone", "WhatsApp", "Email"] },
];
const VEHICLE_SERVICE: RFField[] = [
  ...VEHICLE,
  { key: "serviceNeeded", label: "Service needed", type: "text", placeholder: "e.g. full detailing", required: true },
  { key: "onsite", label: "Mobile / at-home service", type: "toggle" },
  { key: "preferredTime", label: "Preferred date", type: "date" },
];

// ---- Bespoke forms (the examples) ----
const FORMS: Record<string, RFField[]> = {
  "auto-parts": [
    ...VEHICLE,
    { key: "engine", label: "Engine size", type: "text", placeholder: "e.g. 1.6L" },
    { key: "vin", label: "VIN / chassis (optional)", type: "text" },
    { key: "partNeeded", label: "Part needed", type: "text", placeholder: "e.g. right side mirror cover", required: true },
    { key: "condition", label: "New or used", type: "select", options: ["Any", "New", "Used"] },
    { key: "sourcing", label: "OEM or aftermarket", type: "select", options: ["Any", "OEM", "Aftermarket"] },
  ],
  "battery-shops": [
    ...VEHICLE,
    { key: "batteryType", label: "Battery type (optional)", type: "text", placeholder: "e.g. 70Ah" },
    { key: "installation", label: "Need installation?", type: "toggle" },
  ],
  "tire-shops": [
    { key: "tireSize", label: "Tire size", type: "text", placeholder: "e.g. 205/55 R16", required: true },
    ...VEHICLE,
    { key: "brand", label: "Brand preference (optional)", type: "text" },
    { key: "quantity", label: "Quantity", type: "number", placeholder: "e.g. 4" },
    { key: "condition", label: "New or used", type: "select", options: ["Any", "New", "Used"] },
    { key: "installation", label: "Installation required?", type: "toggle" },
  ],
  "mechanics": [
    ...VEHICLE,
    { key: "problem", label: "Problem description", type: "textarea", placeholder: "What's wrong / what you hear", required: true },
    { key: "warningLights", label: "Warning lights on?", type: "text", placeholder: "e.g. check engine" },
    { key: "drivable", label: "Is the car drivable?", type: "toggle" },
    { key: "preferredTime", label: "Preferred appointment", type: "date" },
  ],
  "printing-shops": [
    { key: "item", label: "What to print", type: "text", placeholder: "e.g. business cards", required: true },
    { key: "quantity", label: "Quantity", type: "number" },
    { key: "size", label: "Size", type: "text", placeholder: "e.g. A4, 9x5cm" },
    { key: "material", label: "Material / finish", type: "text" },
    { key: "details", label: "Details", type: "textarea" },
  ],
};

const AUTOMOTIVE = ["mechanics", "tire-shops", "battery-shops", "oil-change", "car-washes", "car-detailing", "car-accessories", "towing-services"];
const HOME = ["electricians", "plumbers", "cleaning", "pest-control", "landscaping", "construction", "contractors", "interior-designers", "kitchens", "flooring", "security-systems", "pool-services", "garden-centers"];

export function requestFields(slug: string): RFField[] {
  if (FORMS[slug]) return FORMS[slug];
  if (slug === "auto-parts") return FORMS["auto-parts"];
  if (AUTOMOTIVE.includes(slug)) return VEHICLE_SERVICE;
  if (HOME.includes(slug)) return HOME_TEMPLATE;
  return PRO_TEMPLATE;
}

export const QUOTE_CATEGORIES = new Set<string>([
  "auto-parts", ...AUTOMOTIVE, ...HOME,
  "lawyers", "accounting", "real-estate", "insurance", "architects", "consultants",
  "marketing-agencies", "web-design", "software-development", "photography", "videography",
  "event-planning", "translation-services", "printing-shops",
]);
export const supportsQuote = (slug: string | undefined): boolean => !!slug && QUOTE_CATEGORIES.has(slug);

/** Human label for a payload key (for dashboards) — falls back to prettified key. */
export function fieldLabel(slug: string, key: string): string {
  const f = requestFields(slug).find((x) => x.key === key);
  return f?.label ?? key.replace(/([A-Z])/g, " $1").replace(/^./, (c) => c.toUpperCase());
}
