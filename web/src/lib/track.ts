// Fire-and-forget interaction tracking for the provider analytics dashboard.
// Never blocks the UI and never throws.
export type ClickEvent = "PHONE_VIEW" | "CALL" | "WHATSAPP" | "WEBSITE" | "DIRECTIONS";

export function track(businessId: number, type: ClickEvent) {
  try {
    const body = JSON.stringify({ businessId, type });
    // sendBeacon survives navigation (tel:/maps links); fall back to fetch.
    if (navigator.sendBeacon) navigator.sendBeacon("/api/track", new Blob([body], { type: "application/json" }));
    else fetch("/api/track", { method: "POST", headers: { "Content-Type": "application/json" }, body, keepalive: true }).catch(() => {});
  } catch {
    /* ignore */
  }
}
