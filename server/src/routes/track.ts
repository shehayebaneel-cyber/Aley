import { Router } from "express";
import { CLICK_TYPES, recordEvent, type EventType } from "../lib/analytics";

// Public, unauthenticated interaction tracking. The business profile page calls
// this when a visitor clicks Call / WhatsApp / Website / Directions or reveals
// the phone number. Views & search appearances are recorded server-side.
export const trackRouter = Router();

trackRouter.post("/", async (req, res) => {
  const businessId = Number(req.body?.businessId);
  const type = String(req.body?.type ?? "") as EventType;
  if (!businessId || !CLICK_TYPES.includes(type)) return res.status(400).json({ error: "Invalid tracking event." });
  await recordEvent(businessId, type);
  res.status(204).end();
});
