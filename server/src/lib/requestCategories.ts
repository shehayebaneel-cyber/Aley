// Categories that support the platform-wide "Request a Quote" (RFQ) flow.
// Keep in sync with web/src/lib/requestForms.ts (which holds the smart-form fields).
// A customer posts one request → it broadcasts to every published business in the
// category. Built on the generic ServiceRequest/Quote/Target models.
export const QUOTE_CATEGORIES = new Set<string>([
  // Automotive
  "auto-parts", "mechanics", "tire-shops", "battery-shops", "oil-change",
  "car-washes", "car-detailing", "car-accessories", "towing-services",
  // Home services
  "electricians", "plumbers", "cleaning", "pest-control", "landscaping",
  "construction", "contractors", "interior-designers", "kitchens", "flooring",
  "security-systems", "pool-services", "garden-centers",
  // Professional services
  "lawyers", "accounting", "real-estate", "insurance", "architects", "consultants",
  "marketing-agencies", "web-design", "software-development", "photography",
  "videography", "event-planning", "translation-services",
  // Printing & manufacturing
  "printing-shops",
]);

export const isQuoteCategory = (slug: string | undefined): boolean => !!slug && QUOTE_CATEGORIES.has(slug);

// Broad vertical for grouping/analytics (the request `type`).
export function verticalFor(slug: string): string {
  if (["auto-parts", "mechanics", "tire-shops", "battery-shops", "oil-change", "car-washes", "car-detailing", "car-accessories", "towing-services"].includes(slug)) return "AUTOMOTIVE";
  if (["electricians", "plumbers", "cleaning", "pest-control", "landscaping", "construction", "contractors", "interior-designers", "kitchens", "flooring", "security-systems", "pool-services", "garden-centers"].includes(slug)) return "HOME";
  if (slug === "printing-shops") return "PRINTING";
  return "PROFESSIONAL";
}
