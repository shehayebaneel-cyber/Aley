import { Router } from "express";
import { translateTexts, translationEnabled } from "../lib/translate";

export const translateRouter = Router();

// POST /api/translate  { texts: string[], target: "ar" | "en" }  ->  { translations: string[] }
translateRouter.post("/", async (req, res) => {
  const target = req.body?.target === "en" ? "en" : "ar";
  const texts = Array.isArray(req.body?.texts) ? req.body.texts : [];
  if (!texts.length) return res.json({ translations: [] });
  if (!translationEnabled) return res.json({ translations: texts, disabled: true });

  // Guardrails: cap batch size and per-string length.
  const clean = texts.slice(0, 200).map((t: unknown) => String(t ?? "").slice(0, 2000));
  try {
    const translations = await translateTexts(clean, target);
    res.json({ translations });
  } catch (e) {
    console.error("translate error", e);
    res.json({ translations: clean }); // fail safe to originals
  }
});
