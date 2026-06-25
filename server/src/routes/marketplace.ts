import { Router } from "express";
import { getMarketplaceSettings } from "../lib/marketplace";

// Public marketplace config the cart/checkout use to show fees + thresholds.
export const marketplaceRouter = Router();
marketplaceRouter.get("/config", async (_req, res) => {
  res.json(await getMarketplaceSettings());
});
