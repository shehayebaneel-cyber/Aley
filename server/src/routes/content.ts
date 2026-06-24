import { Router } from "express";
import { getContent } from "../lib/content";

// Public, cache-free read of the editable site content.
export const contentRouter = Router();
contentRouter.get("/", async (_req, res) => {
  res.json(await getContent());
});
